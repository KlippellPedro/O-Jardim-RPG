"""Migra itens da tabela local dos bots (`inventario`) pro cofre da conta na
plataforma (`cofre_itens_usuario`), pra quem já vinculou a conta Discord.

Fase 2 do cofre unificado: os bots já leem/escrevem o cofre da plataforma
como fonte única de posse de item (ver bots/banqueiro/core/inventario.py).
Só falta isso: quem tinha item ANTES de vincular a conta (ou antes desse
código existir) continua com ele preso na tabela local até rodar este script.

Uso:

    python tools/migrar-inventario-cofre.py --dry-run   # só mostra o que faria
    python tools/migrar-inventario-cofre.py --aplicar --confirmar MIGRAR-INVENTARIO

Sequência recomendada em produção:
  1. Suba a plataforma e os bots com o cofre unificado (já feito).
  2. Pare os bots por ~2 minutos — evita qualquer escrita em `inventario`
     durante a migração (comprar/vender enquanto o bot está fora do ar já
     não funcionaria de qualquer forma).
  3. Rode com --dry-run e confira o relatório.
  4. Rode com --aplicar --confirmar MIGRAR-INVENTARIO.
  5. Suba os bots de novo.

Idempotente: cada conta migra numa transação própria que também apaga as
linhas de origem — rodar de novo não conta em dobro (não sobra nada pra
migrar na segunda vez). Quem não vinculou a conta é pulado e continua no
modo legado; rodar este script de novo mais tarde pega quem vinculou depois
— é seguro rodar quantas vezes quiser, a qualquer momento.

Requer DATABASE_URL (mesmo Postgres que a plataforma e os bots usam — é uma
migração de dados dentro do mesmo banco, não entre bancos diferentes).
"""

from __future__ import annotations

import argparse
import os
from pathlib import Path
from uuid import uuid4


RAIZ = Path(__file__).resolve().parent.parent
CONFIRMACAO_PRODUCAO = "MIGRAR-INVENTARIO"
TABELAS_OBRIGATORIAS = (
    "inventario",
    "campanhas_discord",
    "contas_discord",
    "membros_campanha",
    "catalogo_itens",
    "cofre_itens_usuario",
    "movimentos_cofre",
)


def _carregar_env() -> None:
    """Lê .env da raiz e de plataforma/ sem exigir python-dotenv."""
    for caminho in (RAIZ / ".env", RAIZ / "plataforma" / ".env"):
        if not caminho.exists():
            continue
        for linha in caminho.read_text(encoding="utf-8").splitlines():
            linha = linha.strip()
            if not linha or linha.startswith("#") or "=" not in linha:
                continue
            chave, _, valor = linha.partition("=")
            os.environ.setdefault(chave.strip(), valor.strip())


def resolver_pares(connection) -> list[dict]:
    """Contas com item pendente no inventário local E conta Discord
    vinculada a uma campanha ativa através do servidor onde o item está."""
    rows = connection.execute(
        """
        SELECT DISTINCT
            i.guild_id,
            d.discord_user_id,
            d.usuario_id,
            cd.campanha_id
        FROM inventario i
        JOIN campanhas_discord cd ON cd.discord_guild_id = i.guild_id
        JOIN contas_discord d ON d.discord_user_id = i.user_id
        JOIN membros_campanha m
          ON m.campanha_id = cd.campanha_id
         AND m.usuario_id = d.usuario_id
         AND m.status = 'ativo'
        WHERE i.quantidade > 0
        ORDER BY i.guild_id, d.discord_user_id
        """
    ).fetchall()
    return [dict(row) for row in rows]


def verificar_estrutura(connection) -> None:
    """Interrompe antes da migração quando origem ou destino não existem."""
    ausentes = []
    for tabela in TABELAS_OBRIGATORIAS:
        row = connection.execute("SELECT to_regclass(%s) AS tabela", (tabela,)).fetchone()
        if not row or row["tabela"] is None:
            ausentes.append(tabela)
    if ausentes:
        raise SystemExit(
            "Banco incompatível com esta migração. Tabela(s) ausente(s): "
            + ", ".join(ausentes)
        )


def migrar_par(connection, par: dict, *, dry_run: bool) -> dict:
    """Move os itens desse par (guild, discord_user) de `inventario` pra
    `cofre_itens_usuario`, numa transação só — inclui o DELETE da origem,
    o que torna o script re-executável sem contar em dobro."""
    from psycopg.types.json import Jsonb  # noqa: PLC0415 — só existe no venv de plataforma/

    itens = connection.execute(
        """
        SELECT i.item_id, i.titulo, i.tipo, i.quantidade, c.conteudo
        FROM inventario i
        LEFT JOIN catalogo_itens c ON c.id = i.item_id
        WHERE i.guild_id=%s AND i.user_id=%s AND i.quantidade > 0
        """,
        (par["guild_id"], par["discord_user_id"]),
    ).fetchall()
    total_quantidade = sum(int(item["quantidade"]) for item in itens)
    resumo = {
        "guild_id": par["guild_id"],
        "discord_user_id": par["discord_user_id"],
        "itens": len(itens),
        "quantidade": total_quantidade,
    }
    if not itens or dry_run:
        return resumo

    for item in itens:
        dados = dict(item["conteudo"] or {})
        dados.setdefault("tipo", item["tipo"])
        dados["origem"] = "migracao-inventario"
        connection.execute(
            """
            INSERT INTO cofre_itens_usuario
                (usuario_id, campanha_id, item_id, titulo, quantidade, dados, origem)
            VALUES (%s, %s, %s, %s, %s, %s, 'migracao')
            ON CONFLICT (usuario_id, campanha_id, item_id) DO UPDATE SET
                quantidade = cofre_itens_usuario.quantidade + EXCLUDED.quantidade,
                atualizado_em = CURRENT_TIMESTAMP
            """,
            (par["usuario_id"], par["campanha_id"], item["item_id"], item["titulo"], item["quantidade"], Jsonb(dados)),
        )
    connection.execute(
        "DELETE FROM inventario WHERE guild_id=%s AND user_id=%s",
        (par["guild_id"], par["discord_user_id"]),
    )
    # Registro no extrato do site (origem 'migracao', não 'banqueiro') —
    # ON CONFLICT DO NOTHING porque a chave usa o par (guild, user), então
    # rodar o script de novo pra essa conta (sem itens novos) não duplica.
    connection.execute(
        """
        INSERT INTO movimentos_cofre (id, usuario_id, campanha_id, origem, idempotencia, detalhes)
        VALUES (%s, %s, %s, 'migracao', %s, %s)
        ON CONFLICT (campanha_id, origem, idempotencia) DO NOTHING
        """,
        (
            uuid4(),
            par["usuario_id"],
            par["campanha_id"],
            f"migracao-inventario:{par['guild_id']}:{par['discord_user_id']}",
            Jsonb({"itens": [dict(item) for item in itens]}),
        ),
    )
    return resumo


def main() -> int:
    _carregar_env()
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    modo = parser.add_mutually_exclusive_group(required=True)
    modo.add_argument("--dry-run", action="store_true", help="só mostra o que seria migrado, não escreve nada")
    modo.add_argument("--aplicar", action="store_true", help="aplica a migração no banco informado")
    parser.add_argument(
        "--confirmar",
        default="",
        metavar=CONFIRMACAO_PRODUCAO,
        help="confirmação obrigatória para usar --aplicar",
    )
    argumentos = parser.parse_args()

    if argumentos.aplicar and argumentos.confirmar != CONFIRMACAO_PRODUCAO:
        raise SystemExit(
            f"Para aplicar, informe --confirmar {CONFIRMACAO_PRODUCAO}. "
            "Sem essa confirmação, nada foi alterado."
        )

    dsn = os.getenv("DATABASE_URL", "").strip()
    if not dsn:
        raise SystemExit("DATABASE_URL nao definida (defina no ambiente ou em plataforma/.env).")

    try:
        import psycopg  # noqa: PLC0415
        from psycopg.rows import dict_row  # noqa: PLC0415
    except ImportError as erro:
        raise SystemExit(
            f"Dependencias da plataforma indisponiveis ({erro}). "
            "Rode dentro do venv de plataforma/ (plataforma/.venv/Scripts/python.exe)."
        ) from None

    opcoes_conexao = {"row_factory": dict_row, "connect_timeout": 10}
    if argumentos.dry_run:
        # Passar `options` como kwarg SUBSTITUI o que veio na DATABASE_URL, em
        # vez de somar. Numa URL que carrega `-c search_path=...` isso jogava a
        # conexão pro schema errado e o --dry-run acusava "tabela ausente" pra
        # tudo — logo no passo que existe pra dar confiança antes de aplicar.
        # Concatenar preserva o que a URL já pedia.
        opcoes_conexao["options"] = " ".join(
            filter(None, [
                psycopg.conninfo.conninfo_to_dict(dsn).get("options", ""),
                "-c default_transaction_read_only=on",
            ])
        )

    connection = psycopg.connect(dsn, autocommit=True, **opcoes_conexao)
    try:
        print(f"Destino: host={connection.info.host} banco={connection.info.dbname} usuário={connection.info.user}")
        print("Modo: somente leitura" if argumentos.dry_run else "Modo: APLICAÇÃO CONFIRMADA")
        verificar_estrutura(connection)
        pares = resolver_pares(connection)

        if not pares:
            print("Nenhuma conta vinculada com item pendente no inventário local. Nada a fazer.")
            return 0

        rotulo = "[DRY RUN] " if argumentos.dry_run else ""
        print(f"{rotulo}{len(pares)} conta(s) vinculada(s) com item(ns) no inventário local:\n")

        total_contas = total_itens = total_quantidade = 0
        for par in pares:
            if argumentos.dry_run:
                resultado = migrar_par(connection, par, dry_run=argumentos.dry_run)
            else:
                with connection.transaction():
                    resultado = migrar_par(connection, par, dry_run=False)
            if resultado["itens"] == 0:
                continue
            total_contas += 1
            total_itens += resultado["itens"]
            total_quantidade += resultado["quantidade"]
            print(
                f"  guild={resultado['guild_id']} discord_user={resultado['discord_user_id']}: "
                f"{resultado['itens']} tipo(s) de item, {resultado['quantidade']} unidade(s)"
            )

        verbo = "seriam migrados" if argumentos.dry_run else "migrados"
        print(f"\nTotal: {total_contas} conta(s), {total_itens} tipo(s) de item, {total_quantidade} unidade(s) {verbo}.")
        if argumentos.dry_run:
            print(
                "Nada foi escrito. Para aplicar, rode com "
                f"--aplicar --confirmar {CONFIRMACAO_PRODUCAO}."
            )
        elif resolver_pares(connection):
            raise SystemExit("A verificação final ainda encontrou itens migráveis. Não religue os bots antes de revisar.")
        else:
            print("Verificação final concluída: nenhum item migrável permaneceu na origem.")
        return 0
    finally:
        connection.close()


if __name__ == "__main__":
    raise SystemExit(main())
