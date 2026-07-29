"""resetar_economia_guild: reset da economia de um servidor INTEIRO, não só
de um jogador. Cobre a lacuna que /resetjogador deixa de propósito: ele se
recusa a mexer em quem tem conta vinculada à plataforma (ver docstring dele
em cogs/admin.py), então rodá-lo pessoa por pessoa nunca limparia quem já
vinculou. Aqui o cofre da plataforma (itens, saldo e reservas) de quem
estiver vinculado a este servidor também é apagado — direto por SQL, é a
única escrita deste arquivo que mexe nas tabelas da plataforma fora da API,
porque é um apagão em massa, não uma operação com as garantias de
concorrência que a API existe pra dar.

Só roda com TEST_DATABASE_URL (Postgres descartável): a lógica mexe em SQL
cru demais pra confiar numa fake."""

from __future__ import annotations

import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE))

from tests.db_utils import novo_db


def _preparar_tabelas_plataforma(db):
    """Subconjunto mínimo das tabelas da plataforma, criado no mesmo schema
    isolado do teste — não é a migração real de plataforma/core/schema.py,
    só o bastante pras queries de resetar_economia_guild."""
    with db._conn() as con:
        con.execute(
            "CREATE TABLE campanhas_discord (campanha_id TEXT PRIMARY KEY, discord_guild_id TEXT UNIQUE NOT NULL)"
        )
        con.execute(
            "CREATE TABLE cofre_itens_usuario (usuario_id TEXT, campanha_id TEXT, item_id TEXT, quantidade INTEGER)"
        )
        con.execute(
            "CREATE TABLE cofre_saldos_usuario (usuario_id TEXT, campanha_id TEXT, moeda TEXT, saldo INTEGER)"
        )
        con.execute("CREATE TABLE reservas_cofre (id TEXT, usuario_id TEXT, campanha_id TEXT, status TEXT)")


def test_reseta_toda_a_economia_local_do_servidor_sem_tocar_em_outro():
    db = novo_db()
    _preparar_tabelas_plataforma(db)
    g1, g2 = "555000111", "999000222"
    u1, u2 = "1", "2"
    agora = datetime.now(timezone.utc)

    db.creditar(g1, u1, "Lunaris", 100)
    db.creditar(g2, u2, "Lunaris", 50)  # outro servidor: não pode ser tocado
    db.add_item(g1, u1, "espada", "Espada", "arma", 1)
    db.add_item(g2, u2, "adaga", "Adaga", "arma", 1)
    db.creditar_cofre(g1, u1, "Lunaris", 30)
    db.set_cofre_tier(g1, u1, "avancado")
    leilao = db.criar_leilao(g1, u1, "item", "espada", "Espada", "Lunaris", 10, "111", agora + timedelta(hours=1))
    db.criar_investimento(g1, u1, "Lunaris", 50, agora + timedelta(days=1))
    saldo_g2_antes = db.get_saldo(g2, u2, "Lunaris")
    with db._conn() as con:
        con.execute(
            "INSERT INTO divida_cartao (guild_id, user_id, valor) VALUES (%s, %s, %s)",
            (g1, u1, 20),
        )
        con.execute(
            "INSERT INTO baus_estoque (guild_id, user_id, bau_id, quantidade) VALUES (%s, %s, %s, %s)",
            (g1, u1, "geral-comum", 2),
        )
        con.execute(
            "INSERT INTO loteria_bilhetes (guild_id, user_id, quantidade) VALUES (%s, %s, %s)",
            (g1, u1, 3),
        )
        con.execute(
            "INSERT INTO emprestimos (guild_id, credor_id, devedor_id, moeda, valor_original, valor_devido, juros_diarios) "
            "VALUES (%s, %s, %s, 'Lunaris', 10, 10, 0.0)",
            (g1, u1, u2),
        )

    resultado = db.resetar_economia_guild(g1)

    # carteira/cofre_saldo têm uma linha por moeda (garantir_jogador cria as
    # 4 de uma vez), não uma por conta: uma pessoa credita 1 moeda, mas as
    # linhas das outras 3 (saldo 0) também existem e são apagadas.
    assert resultado["carteira"] >= 1
    assert resultado["inventario"] == 1
    assert resultado["cofre_saldo"] >= 1
    assert resultado["baus_estoque"] == 1
    assert resultado["divida_cartao"] == 1
    assert resultado["loteria_bilhetes"] == 1
    assert resultado["investimentos"] == 1
    assert resultado["emprestimos"] == 1
    assert resultado["leiloes_cancelados"] == 1

    assert db.get_saldo(g1, u1, "Lunaris") == 0
    assert db.listar_inventario(g1, u1) == []
    assert db.get_saldo_cofre(g1, u1, "Lunaris") == 0
    assert db.listar_baus_estoque(g1, u1) == []
    assert db.get_cofre_tier(g1, u1) == "comum"
    assert db.get_leilao(leilao["id"])["status"] == "cancelado"

    # Outro servidor não foi tocado.
    assert db.get_saldo(g2, u2, "Lunaris") == saldo_g2_antes
    assert any(i["item_id"] == "adaga" for i in db.listar_inventario(g2, u2))


def test_reseta_tambem_o_cofre_da_plataforma_de_quem_esta_vinculado_a_este_servidor():
    """O ponto central: /resetjogador se recusa a fazer isso; este método
    precisa fazer, senão o problema que motivou o comando (item preso pra
    quem já vinculou) simplesmente sobrevive ao reset."""
    db = novo_db()
    _preparar_tabelas_plataforma(db)
    g1, g2 = "555000111", "999000222"

    with db._conn() as con:
        con.execute(
            "INSERT INTO campanhas_discord (campanha_id, discord_guild_id) VALUES (%s, %s)",
            ("campanha-1", g1),
        )
        con.execute(
            "INSERT INTO campanhas_discord (campanha_id, discord_guild_id) VALUES (%s, %s)",
            ("campanha-2", g2),
        )
        con.execute(
            "INSERT INTO cofre_itens_usuario (usuario_id, campanha_id, item_id, quantidade) VALUES (%s, %s, %s, %s)",
            ("usuario-a", "campanha-1", "orbe", 1),
        )
        con.execute(
            "INSERT INTO cofre_itens_usuario (usuario_id, campanha_id, item_id, quantidade) VALUES (%s, %s, %s, %s)",
            ("usuario-b", "campanha-2", "adaga", 1),
        )
        con.execute(
            "INSERT INTO cofre_saldos_usuario (usuario_id, campanha_id, moeda, saldo) VALUES (%s, %s, %s, %s)",
            ("usuario-a", "campanha-1", "Lunaris", 40),
        )
        con.execute(
            "INSERT INTO reservas_cofre (id, usuario_id, campanha_id, status) VALUES (%s, %s, %s, %s)",
            ("res-1", "usuario-a", "campanha-1", "reservada"),
        )

    resultado = db.resetar_economia_guild(g1)

    assert resultado["cofre_plataforma_itens"] == 1
    assert resultado["cofre_plataforma_saldos"] == 1
    assert resultado["cofre_plataforma_reservas"] == 1

    with db._conn() as con:
        restante_campanha1 = con.execute(
            "SELECT COUNT(*) AS n FROM cofre_itens_usuario WHERE campanha_id='campanha-1'"
        ).fetchone()["n"]
        restante_campanha2 = con.execute(
            "SELECT COUNT(*) AS n FROM cofre_itens_usuario WHERE campanha_id='campanha-2'"
        ).fetchone()["n"]
    assert restante_campanha1 == 0
    assert restante_campanha2 == 1  # outra campanha (outro servidor) intacta


def test_reseta_servidor_sem_campanha_vinculada_nao_quebra():
    db = novo_db()
    _preparar_tabelas_plataforma(db)
    db.creditar("555000111", "1", "Lunaris", 100)

    resultado = db.resetar_economia_guild("555000111")

    assert resultado["carteira"] >= 1
    assert resultado["cofre_plataforma_itens"] == 0
    assert resultado["cofre_plataforma_saldos"] == 0
    assert resultado["cofre_plataforma_reservas"] == 0


if __name__ == "__main__":
    import pytest

    raise SystemExit(pytest.main([__file__, "-v"]))
