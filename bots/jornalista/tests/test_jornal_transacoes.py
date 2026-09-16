from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone

import pytest
import psycopg

from tests.db_utils import novo_db


def test_furos_concorrentes_pagamento_unico_e_intervalo_persistido():
    db = novo_db()
    agora = datetime.now(timezone.utc)
    with ThreadPoolExecutor(max_workers=2) as pool:
        respostas = list(pool.map(lambda _: db.tentar_vender_furo("g", "7", "8", 100, agora), range(2)))
    assert sorted(r["status"] for r in respostas) == ["comprado", "cooldown"]
    assert db.creditar("g", "7", "Solares", 0) == 100
    with db._conn() as con:
        assert con.execute("SELECT COUNT(*) AS n FROM fofocas").fetchone()["n"] == 1
    db._init_schema()
    assert db.tentar_vender_furo("g", "7", "8", 100, agora)["status"] == "cooldown"
    assert db.tentar_vender_furo("g", "7", "8", 0, agora + timedelta(hours=1))["status"] == "recusado"
    assert db.tentar_vender_furo("g", "7", "8", 100, agora + timedelta(hours=1))["status"] == "cooldown"


def test_suborno_concorrente_so_cobra_uma_vez_e_bloqueia_publicacao():
    db = novo_db()
    agora = datetime.now(timezone.utc)
    db.creditar("g", "7", "Lunaris", 500)
    inicial = db.creditar("g", "7", "Lunaris", 0)
    db.adicionar_fofoca("g", "7", "furo", 100, agora + timedelta(minutes=1))
    fid = db.get_fofoca_pendente_usuario("g", "7")["id"]
    with ThreadPoolExecutor(max_workers=2) as pool:
        resultados = list(pool.map(lambda _: db.subornar_fofoca("g", "7", agora), range(2)))
    assert sorted(r["status"] for r in resultados) == ["ausente", "subornada"]
    assert db.creditar("g", "7", "Lunaris", 0) == inicial - 100
    assert db.enfileirar_fofoca(fid, {}, agora + timedelta(minutes=2)) is None


def test_fofoca_vencida_enfileira_uma_vez_e_nao_aceita_suborno():
    db = novo_db()
    agora = datetime.now(timezone.utc)
    db.adicionar_fofoca("g", "7", "furo", 100, agora - timedelta(minutes=1))
    fid = db.get_fofoca_pendente_usuario("g", "7")["id"]
    assert db.subornar_fofoca("g", "7", agora)["status"] == "ausente"
    primeira = db.enfileirar_fofoca(fid, {}, agora)
    assert primeira["status"] == "pendente"
    assert db.enfileirar_fofoca(fid, {}, agora) is None
    assert db.listar_fofocas_pendentes(agora) == []


def test_suborno_sem_saldo_nao_altera_fofoca():
    db = novo_db()
    agora = datetime.now(timezone.utc)
    db.adicionar_fofoca("g", "7", "furo", 100, agora + timedelta(minutes=1))
    assert db.subornar_fofoca("g", "7", agora)["status"] == "saldo_insuficiente"
    assert db.get_fofoca_pendente_usuario("g", "7") is not None


def test_classificado_concorrente_cobra_uma_vez_com_fila_duravel():
    db = novo_db()
    db.creditar("g", "7", "Solares", 500)
    with ThreadPoolExecutor(max_workers=2) as pool:
        pubs = list(pool.map(lambda _: db.comprar_classificado("g", "7", 50, "classificado:1", {}), range(2)))
    assert pubs[0]["id"] == pubs[1]["id"]
    assert db.creditar("g", "7", "Solares", 0) == 450


def test_falha_na_fila_reverte_cobranca_e_status():
    db = novo_db()
    db.creditar("g", "7", "Solares", 500)
    with pytest.raises(TypeError):
        db.comprar_classificado("g", "7", 50, "classificado:1", {"invalido": {object()}})
    assert db.creditar("g", "7", "Solares", 0) == 500
    agora = datetime.now(timezone.utc)
    db.adicionar_fofoca("g", "7", "furo", 100, agora - timedelta(minutes=1))
    fid = db.get_fofoca_pendente_usuario("g", "7")["id"]
    with pytest.raises(TypeError):
        db.enfileirar_fofoca(fid, {"invalido": {object()}}, agora)
    assert db.get_fofoca_pendente_usuario("g", "7") is not None


def test_clima_funciona_em_servidor_novo_e_preserva_cambio_existente():
    db = novo_db()
    db.set_modificador_clima("g", "chuva")
    assert db.get_modificador_clima("g") == "chuva"
    with db._conn() as con:
        con.execute("UPDATE config SET cambio_rate=300, cambio_taxa=0.1 WHERE guild_id='g'")
    db.set_modificador_clima("g", None)
    with db._conn() as con:
        cfg = con.execute("SELECT * FROM config WHERE guild_id='g'").fetchone()
    assert cfg["modificador_clima"] is None
    assert cfg["cambio_rate"] == 300
    assert cfg["cambio_taxa"] == 0.1


def test_falha_ao_criar_fofoca_reverte_recompensa_e_intervalo():
    db = novo_db()
    agora = datetime.now(timezone.utc)
    db.garantir_jogador("g", "7")
    with db._conn() as con:
        con.execute("""CREATE FUNCTION falhar_fofoca() RETURNS trigger LANGUAGE plpgsql AS $$
                       BEGIN RAISE EXCEPTION 'falha simulada'; END; $$""")
        con.execute("CREATE TRIGGER falhar_fofoca BEFORE INSERT ON fofocas FOR EACH ROW EXECUTE FUNCTION falhar_fofoca()")
    with pytest.raises(psycopg.errors.RaiseException):
        db.tentar_vender_furo("g", "7", "8", 100, agora)
    assert db.creditar("g", "7", "Solares", 0) == 0
    with db._conn() as con:
        assert con.execute("SELECT COUNT(*) AS n FROM jornal_furos_cooldown").fetchone()["n"] == 0
        assert con.execute("SELECT COUNT(*) AS n FROM extrato").fetchone()["n"] == 0
