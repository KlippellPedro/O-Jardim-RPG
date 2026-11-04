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
import zipfile
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
    "convites_plataforma",
    "campanhas",
    "personagens",
    "membros_campanha",
    "convites_campanha",
    "contas_discord",
    "campanhas_discord",
    "informacoes_campanha",
    "revisoes_conteudo",
    "conteudo_global_editorial",
    "revisoes_conteudo_global",
    "catalogo_itens_campanha",
    "revisoes_catalogo_campanha",
    "liberacoes_informacao",
    "saldos_personagem",
    "inventario_personagem",
    "lancamentos_economia",
    "catalogo_itens",
    "biblioteca_conteudo",
    "cofre_itens_usuario",
    "cofre_saldos_usuario",
    "movimentos_cofre",
    "reservas_cofre",
    "comandos_economia",
    "notificacoes",
    "pedidos_senha",
    "sessoes_mesa",
    "sessao_participantes",
    "registros_mesa",
    "campanha_mesa",
    "eventos_mesa",
    "campanha_agenda",
    "mural_itens",
    "mural_votos",
    "mvp_votos",
    "visitas_campanha",
    "descobertas",
    "campanha_calendario",
    "campanha_registros_universais",
    "campanha_documentos",
    "personagem_conquistas",
    "personagem_nivel_anunciado",
    "cronica_campanha",
    "eventos_auditoria",
    "campanha_veiculos",
    "campanha_veiculo_permissoes",
    "campanha_veiculo_ocupantes",
    "campanha_veiculo_modulos",
    "campanha_veiculo_inventario",
    "campanha_propriedades",
    "campanha_propriedade_permissoes",
    "campanha_propriedade_instalacoes",
    "infracoes_loja",
    "propostas_troca",
    "loot_campanha",
    # Mapa ao vivo e acervo do Mestre (migração 59). Os ladrilhos das imagens
    # (`acervo_arquivos`) ficam de fora: ver TABELAS_IGNORADAS.
    "acervo_pastas",
    "acervo_itens",
    "mapa_cenas",
    "mapa_exploracao",
    "mapa_tokens",
    "personagem_token",
    "mapa_campanha",
    # Construtor de mapas (migração 64).
    "mapa_projetos",

    # Cassino do Gambler (site) — ver plataforma/routers/casino.py.
    "cassino_gambler_rodadas",
    "cassino_gambler_fichas",
    "cassino_gambler_fichas_lancamentos",
    "cassino_gambler_cambios",
    "cassino_gambler_resgates",
    "cassino_gambler_conquistas",

    # Tabelas dos bots (Banqueiro/Jornalista/Barista) — mesmo Postgres central,
    # schema próprio deles (ver bots/*/core/db.py). Sem FK pra usuarios/campanhas
    # (chaveadas por guild_id/user_id do Discord), mas registro_opcoes depende de
    # registro_paineis e playlist_faixa depende de playlist.
    "carteira",
    "inventario",
    "cofre",
    "cofre_saldo",
    "config",
    "cartao",
    "reputacao_mensagens",
    "divida_cartao",
    "faturas_cartao",
    "extrato",
    "recompensa",
    "roubo_cooldown",
    "roubo_cofre_cooldown",
    "roubo_protecao_vitima",
    "roubo_alvo_reserva",
    "avisos_pendentes",
    "baus_estoque",
    "protecoes_ativas",
    "cacador_recompensa",
    "cambio_fluxo",
    "leiloes",
    "investimentos",
    "emprestimos",
    "loteria_bilhetes",
    "estacao",
    "baus_config",
    "baus_canais",
    "baus_canais_tema",
    "baus_entregas",
    "baus_historico",
    "baus_sorte",
    "baus_tentativas",
    "baus_mural",
    "jardim_eventos",
    "jardim_chaves",
    "jardim_fragmentos",
    "jardim_metas",
    "jardim_doacoes",
    "registro_config",
    "registro_paineis",
    "registro_opcoes",
    "registro_cargos",
    "jornal_conquistas",
    "jornal_conquistas_cargos",
    "jornal_furos_cooldown",
    "fofocas",
    "jornal_publicacoes",
    "jornal_automacoes",
    "jornal_pautas",
    "ciclos_guild",
    "classificados",
    "classificado_respostas",
    "mural_procurados",
    "mensagens_jornal",
    "canais_jornal",
    "horoscopo_atual",
    "entrevistas",
    "playlist",
    "playlist_faixa",
)

# Ficam de fora de propósito: são estado efêmero e material sensível que não
# faz sentido guardar nem restaurar. Sessões antigas devem morrer no incidente
# que motivou a restauração.
# `acervo_arquivos` é outro caso: são os ladrilhos WebP das imagens do acervo.
# Dentro do JSONL viram texto em hexadecimal, dobram de tamanho e não comprimem,
# e um acervo sem limite de quantidade engoliria o backup diário. Quem cobre os
# ladrilhos é o backup do banco gerenciado da Discloud; restaurar só o JSONL
# deixa os itens do acervo sem imagem.
# `mapa_trilhas` é o mesmo caso: cada faixa de áudio (até 20 MB) é um arquivo que o Mestre
# enviou do computador dele, não comprime e viraria hexadecimal no JSONL; o backup inteiro
# é montado em memória, e 30 faixas dele estourariam a RAM da hospedagem. O estado da trilha
# (`mapa_trilha_estado`) aponta para a faixa por chave estrangeira, então sai junto: sem as
# faixas, restaurar só ele daria erro. Depois de um desastre o Mestre reenvia o áudio.
TABELAS_IGNORADAS: frozenset[str] = frozenset({
    "sessoes_auth",
    "limites_acesso",
    "codigos_vinculo_discord",
    "acervo_arquivos",
    "mapa_trilhas",
    "mapa_trilha_estado",
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


# ---------------------------------------------------------------- acervo (imagens)
#
# Os ladrilhos do acervo (`acervo_arquivos`) ficam fora do JSONL (ver TABELAS_IGNORADAS) e têm
# backup próprio, em ZIP e por partes: cada chamada devolve até LIMITE_ACERVO_BYTES e um cursor
# para a próxima. Quem baixa (tools/backup-acervo.py) guarda o cursor e, da vez seguinte, só
# recebe o que entrou depois, então um acervo grande nunca precisa caber de uma vez na memória.

FORMATO_ACERVO = "jardim-acervo"
LIMITE_ACERVO_BYTES = 64 * 1024 * 1024
_LOTE_ACERVO = 16


def _cursor_acervo(criado_em, item_id, chave: str) -> str:
    return f"{criado_em.isoformat()}|{item_id}|{chave}"


def _ler_cursor_acervo(cursor: str | None):
    if not cursor:
        return None
    partes = cursor.split("|", 2)
    if len(partes) != 3:
        raise ValueError("cursor do acervo invalido")
    try:
        return datetime.fromisoformat(partes[0]), partes[1], partes[2]
    except ValueError:
        raise ValueError("cursor do acervo invalido") from None


def gerar_backup_acervo(database, apos: str | None = None, limite_bytes: int = LIMITE_ACERVO_BYTES) -> tuple[bytes, dict]:
    """ZIP com os ladrilhos de `acervo_arquivos` que vêm depois do cursor `apos`.

    Devolve (zip, resumo). O resumo traz `cursor` (onde esta parte terminou) e `mais` (há partes
    seguintes). O ZIP leva `manifesto.json` com a chave de cada arquivo e `dados/N.bin` com os
    bytes, sem nome de arquivo vindo do banco no caminho.
    """
    ponto = _ler_cursor_acervo(apos)
    buffer = io.BytesIO()
    manifesto: list[dict] = []
    total = 0
    ultimo = ponto
    mais = False
    with database.connection() as connection, zipfile.ZipFile(buffer, "w", zipfile.ZIP_STORED) as pacote:
        while True:
            if ultimo is None:
                linhas = connection.execute(
                    """
                    SELECT item_id, chave, mime, tamanho, dados, criado_em FROM acervo_arquivos
                    ORDER BY criado_em, item_id, chave LIMIT %s
                    """,
                    (_LOTE_ACERVO,),
                ).fetchall()
            else:
                linhas = connection.execute(
                    """
                    SELECT item_id, chave, mime, tamanho, dados, criado_em FROM acervo_arquivos
                    WHERE (criado_em, item_id, chave) > (%s, %s::uuid, %s)
                    ORDER BY criado_em, item_id, chave LIMIT %s
                    """,
                    (ultimo[0], ultimo[1], ultimo[2], _LOTE_ACERVO),
                ).fetchall()
            if not linhas:
                break
            for linha in linhas:
                dados = bytes(linha["dados"])
                if manifesto and total + len(dados) > limite_bytes:
                    mais = True
                    break
                nome = f"dados/{len(manifesto)}.bin"
                pacote.writestr(nome, dados)
                manifesto.append({
                    "arquivo": nome, "item_id": str(linha["item_id"]), "chave": linha["chave"],
                    "mime": linha["mime"], "tamanho": int(linha["tamanho"]),
                    "criado_em": linha["criado_em"].isoformat(),
                })
                total += len(dados)
                ultimo = (linha["criado_em"], str(linha["item_id"]), linha["chave"])
            if mais:
                break
        pacote.writestr("manifesto.json", json.dumps({
            "formato": FORMATO_ACERVO, "versao": 1,
            "gerado_em": datetime.now(timezone.utc).isoformat(), "arquivos": manifesto,
        }, ensure_ascii=False))
    cursor = _cursor_acervo(*ultimo) if ultimo is not None and manifesto else apos
    return buffer.getvalue(), {"arquivos": len(manifesto), "bytes": total, "cursor": cursor, "mais": mais}


def restaurar_backup_acervo(database, conteudo: bytes) -> dict:
    """Devolve os ladrilhos de um ZIP do acervo ao banco. Só entra ladrilho cujo item existe
    (os itens vêm do backup em JSONL) e o que já está lá fica como está."""
    inseridos = pulados = 0
    with zipfile.ZipFile(io.BytesIO(conteudo)) as pacote:
        manifesto = json.loads(pacote.read("manifesto.json"))
        if manifesto.get("formato") != FORMATO_ACERVO:
            raise ValueError("arquivo nao e um backup do acervo do Jardim")
        with database.connection() as connection:
            for entrada in manifesto.get("arquivos", []):
                dados = pacote.read(entrada["arquivo"])
                if len(dados) != int(entrada["tamanho"]):
                    raise ValueError(f"arquivo corrompido no backup: {entrada['arquivo']}")
                existe = connection.execute("SELECT 1 FROM acervo_itens WHERE id=%s::uuid", (entrada["item_id"],)).fetchone()
                if not existe:
                    pulados += 1
                    continue
                resultado = connection.execute(
                    """
                    INSERT INTO acervo_arquivos (item_id, chave, mime, tamanho, dados, criado_em)
                    VALUES (%s::uuid, %s, %s, %s, %s, %s)
                    ON CONFLICT DO NOTHING
                    """,
                    (entrada["item_id"], entrada["chave"], entrada["mime"], int(entrada["tamanho"]), dados, entrada["criado_em"]),
                )
                inseridos += resultado.rowcount
    return {"inseridos": inseridos, "pulados_sem_item": pulados}
