"""Regressões da revisão dos comandos do Banqueiro em 10/09/2026."""
import asyncio
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock

import psycopg
import pytest

from cogs.economia import Economia
from core.db import SaldoInsuficiente
from tests.db_utils import novo_db
from tests.test_bau_entrega_fallback import _DB, _Interacao, _bau_fixo, _cog, _premio_fixo


def interacao():
    return SimpleNamespace(guild_id=1, user=SimpleNamespace(id=7),
                           response=SimpleNamespace(send_message=AsyncMock(), defer=AsyncMock()),
                           followup=SimpleNamespace(send=AsyncMock()))


def test_lavar_todo_o_saldo_registra_lavagem():
    db = novo_db()
    db.creditar("1", "7", "Créditos Sombrios", 100)
    cog = _cog(db, None)
    asyncio.run(Economia.lavar_dinheiro.callback(cog, interacao(), 100))
    assert db.get_saldo("1", "7", "Créditos Sombrios") == 0
    assert db.get_lavagem("1", "7")["quantia"] == 100


def test_falha_ao_gravar_lavagem_preserva_saldo():
    db = novo_db()
    db.creditar("1", "7", "Créditos Sombrios", 200)
    with db._conn() as con:
        con.execute("""CREATE FUNCTION falhar() RETURNS trigger LANGUAGE plpgsql AS $$
                       BEGIN RAISE EXCEPTION 'falha simulada'; END; $$""")
        con.execute("CREATE TRIGGER falhar BEFORE INSERT ON lavagem_dinheiro FOR EACH ROW EXECUTE FUNCTION falhar()")
    with pytest.raises(psycopg.errors.RaiseException):
        asyncio.run(Economia.lavar_dinheiro.callback(_cog(db, None), interacao(), 100))
    assert db.get_saldo("1", "7", "Créditos Sombrios") == 200


@pytest.mark.parametrize("vinculado", [True, False])
def test_bau_sombrio_paga_creditos_sombrios(monkeypatch, vinculado):
    _premio_fixo(monkeypatch)
    db = _DB(vinculado=vinculado)
    b = {**_bau_fixo(), "id": "sombrio-comum"}
    ganhos, destino, ok, quantia = asyncio.run(_cog(db, None)._abrir_um_bau(_Interacao(), "100", "42", b))
    assert ok and quantia == 40
    assert db.creditos == [("Créditos Sombrios", 40)]
    assert "Créditos Sombrios" in ganhos[0]
    if vinculado:
        assert "Créditos Sombrios na carteira" in destino


def test_confirmacao_de_compra_mostra_o_preco_real_cobrado():
    i = interacao()
    cog = _cog(object(), None)
    asyncio.run(cog._finalizar_compra_bau(
        i, {"id": "geral-comum", "nome": "Baú Geral", "preco": 50},
        {"carteira_usada": 60, "financiado": 0}, estoque_ja_creditado=True,
    ))
    assert "☾ 60" in i.response.send_message.call_args.kwargs["embed"].description


def test_migracao_de_ids_soma_estoque_antigo_e_novo_sem_impedir_boot():
    db = novo_db()
    db.add_item("1", "7", "contrato_guarda_costas", "Contrato antigo", "consumivel", 2)
    db.add_item("1", "7", "contrato-guarda-costas", "Contrato", "consumivel", 3)
    db._init_schema()
    db._init_schema()
    itens = db.listar_inventario("1", "7")
    assert len(itens) == 1
    assert itens[0]["item_id"] == "contrato-guarda-costas"
    assert itens[0]["quantidade"] == 5


def test_falha_na_ativacao_do_guarda_devolve_contrato():
    db = novo_db()
    db.add_item("1", "7", "contrato-guarda-costas", "Contrato", "consumivel", 1)
    with db._conn() as con:
        con.execute("""CREATE FUNCTION falhar() RETURNS trigger LANGUAGE plpgsql AS $$
                       BEGIN RAISE EXCEPTION 'falha simulada'; END; $$""")
        con.execute("CREATE TRIGGER falhar BEFORE INSERT ON protecoes_ativas FOR EACH ROW EXECUTE FUNCTION falhar()")
    with pytest.raises(psycopg.errors.RaiseException):
        asyncio.run(Economia.contratar_guarda.callback(_cog(db, None), interacao()))
    assert db.listar_inventario("1", "7")[0]["quantidade"] == 1


def test_resgates_concorrentes_nao_duplicam_solares():
    db = novo_db()
    agora = datetime.now(timezone.utc)
    db.adicionar_lavagem("1", "7", 100, agora - timedelta(hours=1))
    with ThreadPoolExecutor(max_workers=2) as pool:
        resultados = list(pool.map(lambda _: db.resgatar_lavagem("1", "7", agora), range(2)))
    assert sorted(r["status"] for r in resultados) == ["ausente", "resgatada"]
    assert db.get_saldo("1", "7", "Solares") == 166


def test_lavagem_respeita_taxa_configurada_e_separa_servidores():
    db = novo_db()
    agora = datetime.now(timezone.utc)
    db.set_cambio("1", 100, 0.05)
    db.adicionar_lavagem("1", "7", 100, agora - timedelta(hours=1))
    assert db.resgatar_lavagem("2", "7", agora)["status"] == "ausente"
    assert db.resgatar_lavagem("1", "7", agora)["recebido"] == 161


def test_falha_no_resgate_preserva_reserva_e_saldo():
    db = novo_db()
    agora = datetime.now(timezone.utc)
    db.adicionar_lavagem("1", "7", 100, agora - timedelta(hours=1))
    with db._conn() as con:
        con.execute("""CREATE FUNCTION falhar() RETURNS trigger LANGUAGE plpgsql AS $$
                       BEGIN RAISE EXCEPTION 'falha simulada'; END; $$""")
        con.execute("CREATE TRIGGER falhar BEFORE DELETE ON lavagem_dinheiro FOR EACH ROW EXECUTE FUNCTION falhar()")
    with pytest.raises(psycopg.errors.RaiseException):
        db.resgatar_lavagem("1", "7", agora)
    assert db.get_lavagem("1", "7")["quantia"] == 100
    assert db.get_saldo("1", "7", "Solares") == 0


def test_um_contrato_so_ativa_um_guarda_em_chamadas_concorrentes():
    db = novo_db()
    db.add_item("1", "7", "contrato-guarda-costas", "Contrato", "consumivel", 1)
    with ThreadPoolExecutor(max_workers=2) as pool:
        resultados = list(pool.map(lambda _: db.contratar_guarda("1", "7"), range(2)))
    assert sorted(resultados) == [False, True]
    assert db.listar_protecoes("1", "7") == {"guarda_costas": 1}


def test_mercado_negro_compra_lote_com_debito_e_extrato():
    db = novo_db()
    db.creditar("1", "7", "Créditos Sombrios", 100)
    db.comprar_item_mercado_negro("1", "7", "item", "Item", "consumivel", "Créditos Sombrios", 50, 2)
    assert db.get_saldo("1", "7", "Créditos Sombrios") == 0
    assert db.listar_inventario("1", "7")[0]["quantidade"] == 2
    with db._conn() as con:
        assert con.execute("SELECT delta FROM extrato WHERE guild_id='1' AND user_id='7'").fetchone()["delta"] == -100
    with pytest.raises(SaldoInsuficiente):
        db.comprar_item_mercado_negro("1", "7", "item", "Item", "consumivel", "Créditos Sombrios", 50, 1)
    assert db.listar_inventario("1", "7")[0]["quantidade"] == 2


def test_falha_na_entrega_do_mercado_negro_reverte_cobranca():
    db = novo_db()
    db.creditar("1", "7", "Créditos Sombrios", 100)
    with db._conn() as con:
        con.execute("""CREATE FUNCTION falhar() RETURNS trigger LANGUAGE plpgsql AS $$
                       BEGIN RAISE EXCEPTION 'falha simulada'; END; $$""")
        con.execute("CREATE TRIGGER falhar BEFORE INSERT ON inventario FOR EACH ROW EXECUTE FUNCTION falhar()")
    with pytest.raises(psycopg.errors.RaiseException):
        db.comprar_item_mercado_negro("1", "7", "item", "Item", "consumivel", "Créditos Sombrios", 50, 1)
    assert db.get_saldo("1", "7", "Créditos Sombrios") == 100


def test_abrir_todos_separa_moedas_e_nao_exibe_moeda_como_item(monkeypatch):
    from tests.test_abrir_todos_interrupcao import _DB as Estoque, _Interacao as Interacao, _Platform
    import cogs.economia as modulo
    db = Estoque(chamadas_remover_bau_ate_falhar=2)
    db.listar_baus_estoque = lambda *_: [
        {"bau_id": "geral-comum", "quantidade": 1},
        {"bau_id": "sombrio-comum", "quantidade": 1},
    ]
    monkeypatch.setattr(modulo.loot_mod, "sortear_bau", lambda *a, **k: {"lunaris": 10, "itens": []})
    i = Interacao()
    asyncio.run(Economia.abrir_todos.callback(_cog(db, _Platform()), i))
    texto = i.followup.mensagens[0][1]["embed"].description
    assert "10 Lunaris" in texto and "10 Créditos Sombrios" in texto
    assert "20 Lunaris" not in texto and "Itens:" not in texto
