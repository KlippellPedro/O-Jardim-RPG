"""Backup lógico do banco central, sem depender de `pg_dump`.

O container da Discloud roda Python puro: não há `postgresql-client` para
chamar `pg_dump`. Aqui o próprio Postgres serializa cada linha com
`row_to_json`, o que resolve UUID, timestamp e JSONB sem conversão manual, e a
restauração usa `json_populate_record`, que casa as colunas pelo nome — um
backup antigo continua restaurável depois de uma migração que só adiciona
colunas.

Formato: JSON Lines comprimido com gzip. A primeira linha é o cabeçalho; as
demais são `{"t": tabela, "d": {linha}}`, gravadas na ordem em que podem ser
reinseridas sem violar chave estrangeira.
"""

from __future__ import annotations

import gzip
import io
import json
import logging
from datetime import datetime, timezone

from psycopg import sql


log = logging.getLogger("jardim-plataforma")

FORMATO = "jardim-backup"
VERSAO_FORMATO = 1

# Ordem de inserção: cada tabela só aparece depois daquelas de que depende.
# `personagens` vem antes de `membros_campanha` por causa de personagem_ativo_id.
TABELAS: tuple[str, ...] = (
    "schema_migrations",
    "usuarios",
    "campanhas",
    "personagens",
    "membros_campanha",
    "convites_campanha",
    "contas_discord",
    "campanhas_discord",
    "informacoes_campanha",
    "liberacoes_informacao",
    "saldos_personagem",
    "inventario_personagem",
    "lancamentos_economia",
    "catalogo_itens",
    "biblioteca_conteudo",
    "cofre_itens_usuario",
    "cofre_saldos_usuario",
    "movimentos_cofre",
    "notificacoes",
    "pedidos_senha",
    "sessoes_mesa",
    "sessao_participantes",
    "registros_mesa",
    "eventos_auditoria",
)

# Ficam de fora de propósito: são estado efêmero e material sensível que não
# faz sentido guardar nem restaurar. Sessões antigas devem morrer no incidente
# que motivou a restauração.
TABELAS_IGNORADAS: frozenset[str] = frozenset({
    "sessoes_auth",
    "limites_acesso",
    "codigos_vinculo_discord",
})


def _tabelas_do_banco(connection) -> set[str]:
    """Tabelas do schema em uso — `current_schema()`, não `public` fixo.

    Com `public` no lugar, um banco que use outro schema (o `search_path` dos
    testes de integração, por exemplo) não devolveria tabela alguma e o backup
    sairia vazio **sem erro nenhum** — o pior tipo de falha para um backup.
    """
    linhas = connection.execute(
        """
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = current_schema() AND table_type = 'BASE TABLE'
        """
    ).fetchall()
    return {linha["table_name"] for linha in linhas}


def gerar_backup(database) -> tuple[bytes, dict]:
    """Devolve (arquivo .jsonl.gz em bytes, resumo com a contagem por tabela)."""
    contagem: dict[str, int] = {}
    buffer = io.BytesIO()

    with database.connection() as connection:
        existentes = _tabelas_do_banco(connection)
        conhecidas = set(TABELAS) | TABELAS_IGNORADAS
        esquecidas = sorted(existentes - conhecidas)
        if esquecidas:
            # Tabela nova sem lugar na ordem: melhor gritar do que gerar um
            # backup silenciosamente incompleto.
            log.warning(
                "Tabelas fora do backup (adicione em core/backup.py): %s",
                ", ".join(esquecidas),
            )

        with gzip.GzipFile(fileobj=buffer, mode="wb", mtime=0) as arquivo:
            def escrever(objeto: dict) -> None:
                arquivo.write(json.dumps(objeto, ensure_ascii=False).encode("utf-8"))
                arquivo.write(b"\n")

            escrever({
                "formato": FORMATO,
                "versao": VERSAO_FORMATO,
                "gerado_em": datetime.now(timezone.utc).isoformat(),
                "tabelas": [t for t in TABELAS if t in existentes],
                "ignoradas": sorted(TABELAS_IGNORADAS),
                "fora_do_backup": esquecidas,
            })

            for tabela in TABELAS:
                if tabela not in existentes:
                    continue
                total = 0
                consulta = sql.SQL("SELECT row_to_json(t) AS linha FROM {} t").format(
                    sql.Identifier(tabela)
                )
                with connection.cursor() as cursor:
                    cursor.execute(consulta)
                    for linha in cursor:
                        escrever({"t": tabela, "d": linha["linha"]})
                        total += 1
                contagem[tabela] = total

    return buffer.getvalue(), {
        "tabelas": contagem,
        "linhas": sum(contagem.values()),
        "bytes": buffer.tell(),
        "fora_do_backup": esquecidas,
    }


def ler_cabecalho(conteudo: bytes) -> dict:
    """Lê e valida só a primeira linha, sem carregar o arquivo inteiro."""
    with gzip.GzipFile(fileobj=io.BytesIO(conteudo), mode="rb") as arquivo:
        primeira = arquivo.readline()
    if not primeira:
        raise ValueError("arquivo de backup vazio")
    cabecalho = json.loads(primeira)
    if cabecalho.get("formato") != FORMATO:
        raise ValueError("arquivo nao e um backup do Jardim")
    if int(cabecalho.get("versao", 0)) > VERSAO_FORMATO:
        raise ValueError(
            "backup gerado por uma versao mais nova da plataforma; atualize antes de restaurar"
        )
    return cabecalho


def restaurar_backup(database, conteudo: bytes, *, limpar: bool = False) -> dict:
    """Reinsere as linhas do backup.

    Com `limpar=True` as tabelas são esvaziadas antes — é o modo para um banco
    novo depois de um desastre. Sem ele, linhas já existentes são mantidas
    (`ON CONFLICT DO NOTHING`), o que serve para completar um banco parcial.
    """
    cabecalho = ler_cabecalho(conteudo)
    inseridas: dict[str, int] = {}

    with database.connection() as connection:
        existentes = _tabelas_do_banco(connection)
        if limpar:
            alvos = [t for t in reversed(TABELAS) if t in existentes and t != "schema_migrations"]
            connection.execute(
                sql.SQL("TRUNCATE {} RESTART IDENTITY CASCADE").format(
                    sql.SQL(", ").join(sql.Identifier(t) for t in alvos)
                )
            )

        with gzip.GzipFile(fileobj=io.BytesIO(conteudo), mode="rb") as arquivo:
            arquivo.readline()  # cabeçalho, já validado
            for linha in arquivo:
                if not linha.strip():
                    continue
                registro = json.loads(linha)
                tabela = registro.get("t")
                if tabela not in existentes or tabela in TABELAS_IGNORADAS:
                    continue
                connection.execute(
                    sql.SQL(
                        "INSERT INTO {tabela} SELECT * FROM json_populate_record(NULL::{tabela}, %s) "
                        "ON CONFLICT DO NOTHING"
                    ).format(tabela=sql.Identifier(tabela)),
                    (json.dumps(registro.get("d") or {}),),
                )
                inseridas[tabela] = inseridas.get(tabela, 0) + 1

    return {
        "gerado_em": cabecalho.get("gerado_em"),
        "tabelas": inseridas,
        "linhas": sum(inseridas.values()),
    }


def nome_do_arquivo(momento: datetime | None = None) -> str:
    agora = momento or datetime.now(timezone.utc)
    return f"jardim-backup-{agora:%Y%m%d-%H%M}.jsonl.gz"
