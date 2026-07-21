"""Confere o ambiente local de ponta a ponta.

Sobe nada por conta própria: assume que `docker compose up -d` já rodou. O que
faz é provar, na ordem, que o essencial funciona — e o item mais importante da
lista é a restauração do backup, que até aqui nunca tinha sido exercitada
contra um Postgres de verdade.

    python tools/verificar-local.py

Rode com o python do venv de plataforma/, que tem psycopg:

    cd plataforma
    .venv-test\\Scripts\\python.exe ..\\tools\\verificar-local.py
"""

from __future__ import annotations

import os
import subprocess
import sys
import uuid
from pathlib import Path


RAIZ = Path(__file__).resolve().parent.parent
DEV = "postgresql://jardim:jardim-local@127.0.0.1:5433/jardim"
TESTE = "postgresql://jardim:jardim-local@127.0.0.1:5434/jardim_teste"

_falhas: list[str] = []


def passo(titulo: str) -> None:
    print(f"\n=== {titulo}")


def ok(mensagem: str) -> None:
    print(f"  [ok]    {mensagem}")


def falhou(mensagem: str) -> None:
    _falhas.append(mensagem)
    print(f"  [FALHA] {mensagem}")


def conectar(dsn: str):
    sys.path.insert(0, str(RAIZ / "plataforma"))
    import psycopg  # noqa: PLC0415
    from psycopg.rows import dict_row  # noqa: PLC0415

    return psycopg.connect(dsn, autocommit=True, row_factory=dict_row, connect_timeout=5)


def verificar_bancos() -> bool:
    passo("Bancos do docker compose")
    tudo_certo = True
    for nome, dsn in (("desenvolvimento (5433)", DEV), ("teste (5434)", TESTE)):
        try:
            with conectar(dsn) as conexao:
                versao = conexao.execute("SELECT version()").fetchone()["version"]
            ok(f"{nome}: {versao.split(',')[0]}")
        except Exception as erro:  # noqa: BLE001
            falhou(f"{nome} nao respondeu: {str(erro).splitlines()[0]}")
            tudo_certo = False
    return tudo_certo


def verificar_migracoes() -> None:
    passo("Migracoes no banco de desenvolvimento")
    sys.path.insert(0, str(RAIZ / "plataforma"))
    from core.database import Database  # noqa: PLC0415
    from core.schema import MIGRATIONS  # noqa: PLC0415

    banco = Database(DEV)
    banco.open()
    try:
        with banco.connection() as conexao:
            aplicadas = {
                linha["versao"]
                for linha in conexao.execute("SELECT versao FROM schema_migrations").fetchall()
            }
            tabelas = {
                linha["table_name"]
                for linha in conexao.execute(
                    """
                    SELECT table_name FROM information_schema.tables
                    WHERE table_schema='public' AND table_type='BASE TABLE'
                    """
                ).fetchall()
            }
    finally:
        banco.close()

    esperadas = {versao for versao, _, _ in MIGRATIONS}
    faltando = esperadas - aplicadas
    if faltando:
        falhou(f"migracoes nao aplicadas: {sorted(faltando)}")
    else:
        ok(f"{len(aplicadas)} migracoes aplicadas (ate a {max(aplicadas)})")

    for nova in ("sessoes_mesa", "sessao_participantes", "registros_mesa",
                 "notificacoes", "pedidos_senha"):
        if nova in tabelas:
            ok(f"tabela {nova}")
        else:
            falhou(f"tabela {nova} ausente")


def verificar_backup() -> None:
    """O teste que faltava: gravar, salvar, apagar tudo e restaurar.

    Roda no banco de TESTE, nunca no de desenvolvimento: a restauração usa
    `limpar=True`, que trunca tudo. Como sessões de login ficam de fora do
    backup de propósito, fazer isso no banco de trabalho desconectaria quem
    estivesse usando o site — inclusive você, no meio dos testes.
    """
    passo("Backup e restauracao (o teste que importa)")
    sys.path.insert(0, str(RAIZ / "plataforma"))
    from core.backup import gerar_backup, restaurar_backup  # noqa: PLC0415
    from core.database import Database  # noqa: PLC0415
    from psycopg.types.json import Jsonb  # noqa: PLC0415

    banco = Database(TESTE)
    banco.open()  # aplica as migrações no banco de teste, se ainda não estiverem
    try:
        marca = uuid.uuid4()
        usuario, campanha, personagem = uuid.uuid4(), uuid.uuid4(), uuid.uuid4()
        ficha = {"nivel": 7, "racaId": "humano", "notas": f"acento çãé e emoji ✦ {marca}"}

        with banco.connection() as conexao:
            conexao.execute(
                """
                INSERT INTO usuarios (id, email, nome_exibicao, senha_hash, papel_plataforma)
                VALUES (%s, %s, 'Teste Backup', 'hash-falso', 'mestre')
                """,
                (usuario, f"backup-{marca}@teste.local"),
            )
            conexao.execute(
                "INSERT INTO campanhas (id, dono_id, nome) VALUES (%s, %s, 'Mesa de verificacao')",
                (campanha, usuario),
            )
            conexao.execute(
                """
                INSERT INTO personagens (id, campanha_id, dono_usuario_id, nome, ficha, criado_por)
                VALUES (%s, %s, %s, 'Lys Corvo-de-Prata', %s, %s)
                """,
                (personagem, campanha, usuario, Jsonb(ficha), usuario),
            )
            conexao.execute(
                """
                INSERT INTO membros_campanha (campanha_id, usuario_id, papel, personagem_ativo_id)
                VALUES (%s, %s, 'mestre', %s)
                """,
                (campanha, usuario, personagem),
            )
        ok("dados de teste gravados")

        conteudo, resumo = gerar_backup(banco)
        ok(f"backup gerado: {len(conteudo) / 1024:.0f} KB, {resumo['linhas']} registros")
        if resumo.get("fora_do_backup"):
            falhou(f"tabelas fora do backup: {resumo['fora_do_backup']}")
        if "sessoes_mesa" not in resumo["tabelas"]:
            falhou("sessoes_mesa nao entrou no backup")
        for proibida in ("sessoes_auth", "limites_login"):
            if proibida in resumo["tabelas"]:
                falhou(f"{proibida} vazou para o backup")
        ok("sessoes e limites de login ficaram de fora, como esperado")

        resultado = restaurar_backup(banco, conteudo, limpar=True)
        ok(f"restauracao: {resultado['linhas']} registros reinseridos")

        with banco.connection() as conexao:
            volta = conexao.execute(
                "SELECT nome, ficha FROM personagens WHERE id=%s", (personagem,)
            ).fetchone()
            vinculo = conexao.execute(
                """
                SELECT papel, personagem_ativo_id FROM membros_campanha
                WHERE campanha_id=%s AND usuario_id=%s
                """,
                (campanha, usuario),
            ).fetchone()

        if not volta:
            falhou("o personagem nao voltou depois da restauracao")
        elif volta["ficha"] != ficha:
            falhou(f"a ficha voltou diferente: {volta['ficha']}")
        else:
            ok("ficha JSONB voltou identica, com acento e emoji")

        if not vinculo or vinculo["personagem_ativo_id"] != personagem:
            falhou("o vinculo de membro/personagem ativo nao voltou")
        else:
            ok("chaves estrangeiras reconstruidas na ordem certa")
    finally:
        banco.close()


def verificar_testes() -> None:
    passo("Suites automatizadas")
    ambiente = {**os.environ, "TEST_DATABASE_URL": TESTE, "DATABASE_URL": DEV}
    for suite in ("tests.test_unit", "tests.test_database_integration"):
        processo = subprocess.run(
            [sys.executable, "-m", "unittest", suite],
            cwd=RAIZ / "plataforma",
            env=ambiente,
            capture_output=True,
            text=True,
        )
        saida = (processo.stderr or "").strip().splitlines()
        resumo = saida[-1] if saida else "sem saida"
        if processo.returncode == 0:
            total = next((l for l in saida if l.startswith("Ran ")), "")
            ok(f"{suite}: {total} {resumo}")
        else:
            falhou(f"{suite}: {resumo}")


def main() -> int:
    print("Verificacao do ambiente local do Jardim")
    if not verificar_bancos():
        print("\nSuba os bancos antes:  docker compose up -d")
        return 1
    verificar_migracoes()
    verificar_backup()
    verificar_testes()

    print("\n" + "=" * 60)
    if _falhas:
        print(f"{len(_falhas)} problema(s):")
        for item in _falhas:
            print(f"  - {item}")
        return 1
    print("Tudo certo. O backup restaura, as migracoes aplicam e as suites passam.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
