"""
Testes de core/db.py contra um PostgreSQL real (schema isolado por teste).
Precisam de TEST_DATABASE_URL — não rodam sem isso (ver tests/db_utils.py).

Uso: TEST_DATABASE_URL=... python -m pytest tests/test_db.py
(a partir da pasta bots/barista)
"""

import sys
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE))

import pytest

from core.db import PlaylistJaExiste, PlaylistNaoEncontrada, SaldoInsuficiente, MAX_FAIXAS_POR_PLAYLIST
from tests.db_utils import novo_db


def _definir_saldo(db, guild_id, user_id, moeda, saldo):
    """Helper só de teste: o Barista de verdade nunca credita carteira
    (quem faz isso é o Banqueiro) — aqui semeamos direto pra testar débito."""
    with db._conn() as con:
        con.execute(
            """
            INSERT INTO carteira (guild_id, user_id, moeda, saldo)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (guild_id, user_id, moeda) DO UPDATE SET saldo = EXCLUDED.saldo
            """,
            (guild_id, user_id, moeda, saldo),
        )


def test_db_debitar_carteira_sucesso():
    db = novo_db()
    g, u = "guild1", "user1"
    _definir_saldo(db, g, u, "Lunaris", 20)
    novo_saldo = db.debitar_carteira(g, u, 10, moeda="Lunaris")
    assert novo_saldo == 10


def test_db_debitar_carteira_insuficiente_nao_debita():
    db = novo_db()
    g, u = "guild2", "user2"
    _definir_saldo(db, g, u, "Lunaris", 5)
    with pytest.raises(SaldoInsuficiente):
        db.debitar_carteira(g, u, 10, moeda="Lunaris")
    with db._conn() as con:
        row = con.execute(
            "SELECT saldo FROM carteira WHERE guild_id=%s AND user_id=%s AND moeda=%s",
            (g, u, "Lunaris"),
        ).fetchone()
    assert row["saldo"] == 5  # nao debitou nada


def test_db_debitar_carteira_sem_linha_previa_conta_como_zero():
    db = novo_db()
    g, u = "guild3", "user3"
    with pytest.raises(SaldoInsuficiente):
        db.debitar_carteira(g, u, 10, moeda="Lunaris")


def test_db_registrar_extrato_grava_linha():
    db = novo_db()
    g, u = "guild4", "user4"
    db.registrar_extrato(g, u, -10, "Lunaris", "Menu do Barista: Café Forte")
    with db._conn() as con:
        rows = con.execute(
            "SELECT delta, moeda, descricao FROM extrato WHERE guild_id=%s AND user_id=%s",
            (g, u),
        ).fetchall()
    assert len(rows) == 1
    assert rows[0]["delta"] == -10
    assert rows[0]["descricao"] == "Menu do Barista: Café Forte"


def test_db_registrar_extrato_delta_zero_nao_grava():
    db = novo_db()
    g, u = "guild5", "user5"
    db.registrar_extrato(g, u, 0, "Lunaris", "nao deveria gravar")
    with db._conn() as con:
        rows = con.execute(
            "SELECT id FROM extrato WHERE guild_id=%s AND user_id=%s", (g, u)
        ).fetchall()
    assert rows == []


def test_db_comprar_item_menu_debita_e_registra_na_mesma_operacao():
    db = novo_db()
    g, u = "guild-menu", "user-menu"
    _definir_saldo(db, g, u, "Lunaris", 20)

    novo_saldo = db.comprar_item_menu(
        g, u, 8, "Menu do Barista: Chá", moeda="Lunaris"
    )

    assert novo_saldo == 12
    with db._conn() as con:
        saldo = con.execute(
            "SELECT saldo FROM carteira WHERE guild_id=%s AND user_id=%s AND moeda=%s",
            (g, u, "Lunaris"),
        ).fetchone()["saldo"]
        extrato = con.execute(
            "SELECT delta, descricao FROM extrato WHERE guild_id=%s AND user_id=%s",
            (g, u),
        ).fetchall()
    assert saldo == 12
    assert extrato == [{"delta": -8, "descricao": "Menu do Barista: Chá"}]


def test_db_comprar_item_menu_sem_saldo_nao_grava_extrato():
    db = novo_db()
    g, u = "guild-menu-sem-saldo", "user-menu-sem-saldo"
    _definir_saldo(db, g, u, "Lunaris", 3)

    with pytest.raises(SaldoInsuficiente):
        db.comprar_item_menu(g, u, 8, "Menu do Barista: Chá", moeda="Lunaris")

    with db._conn() as con:
        saldo = con.execute(
            "SELECT saldo FROM carteira WHERE guild_id=%s AND user_id=%s AND moeda=%s",
            (g, u, "Lunaris"),
        ).fetchone()["saldo"]
        extrato = con.execute(
            "SELECT id FROM extrato WHERE guild_id=%s AND user_id=%s", (g, u)
        ).fetchall()
    assert saldo == 3
    assert extrato == []


def test_db_criar_playlist_duplicada_ignora_maiuscula():
    db = novo_db()
    g = "guild6"
    db.criar_playlist(g, "Combate", "user6")
    with pytest.raises(PlaylistJaExiste):
        db.criar_playlist(g, "combate", "user6")


def test_db_adicionar_faixa_e_obter_playlist_preserva_ordem():
    db = novo_db()
    g = "guild7"
    db.criar_playlist(g, "Exploração", "user7")
    db.adicionar_faixa(g, "Exploração", "Faixa 1", "https://youtu.be/1", "user7")
    db.adicionar_faixa(g, "exploração", "Faixa 2", "https://youtu.be/2", "user7")

    playlist = db.obter_playlist(g, "EXPLORAÇÃO")
    assert playlist is not None
    assert playlist["nome"] == "Exploração"
    assert [f["titulo"] for f in playlist["faixas"]] == ["Faixa 1", "Faixa 2"]


def test_db_adicionar_faixa_playlist_inexistente():
    db = novo_db()
    with pytest.raises(PlaylistNaoEncontrada):
        db.adicionar_faixa("guild8", "não existe", "Faixa", "https://youtu.be/x", "user8")


def test_db_adicionar_faixa_respeita_limite_maximo():
    db = novo_db()
    g = "guild9"
    db.criar_playlist(g, "Cheia", "user9")
    for i in range(MAX_FAIXAS_POR_PLAYLIST):
        db.adicionar_faixa(g, "Cheia", f"Faixa {i}", f"https://youtu.be/{i}", "user9")
    with pytest.raises(ValueError):
        db.adicionar_faixa(g, "Cheia", "Uma a mais", "https://youtu.be/demais", "user9")


def test_db_listar_playlists_conta_faixas():
    db = novo_db()
    g = "guild10"
    db.criar_playlist(g, "Vazia", "user10")
    db.criar_playlist(g, "Com Faixas", "user10")
    db.adicionar_faixa(g, "Com Faixas", "F1", "https://youtu.be/1", "user10")
    db.adicionar_faixa(g, "Com Faixas", "F2", "https://youtu.be/2", "user10")

    playlists = {p["nome"]: p["n_faixas"] for p in db.listar_playlists(g)}
    assert playlists == {"Vazia": 0, "Com Faixas": 2}


def test_db_apagar_playlist_remove_faixas_em_cascata():
    db = novo_db()
    g = "guild11"
    db.criar_playlist(g, "Temporária", "user11")
    db.adicionar_faixa(g, "Temporária", "F1", "https://youtu.be/1", "user11")

    assert db.apagar_playlist(g, "temporária") is True
    assert db.obter_playlist(g, "Temporária") is None
    assert db.apagar_playlist(g, "Temporária") is False  # já foi apagada

    with db._conn() as con:
        orfaos = con.execute("SELECT id FROM playlist_faixa").fetchall()
    assert orfaos == []
