from datetime import date, datetime, timedelta, timezone

import pytest

from core.db import (
    CassinoIndisponivel,
    CassinoLimite,
    RodadaCassinoConflito,
    SaldoInsuficiente,
)
from tests.db_utils import novo_db


HOJE = date(2026, 8, 27)


def _saldo(db, usuario="u"):
    db.garantir_jogador("g", usuario)
    return db.get_saldo("g", usuario, "Lunaris")


def test_rodada_debita_e_liquida_uma_unica_vez():
    db = novo_db()
    db.garantir_jogador("g", "u")
    inicial = _saldo(db)
    rodada = db.iniciar_rodada_cassino("r1", "g", "u", "dados", 10, 60, {"dado": 3}, HOJE)
    repetida = db.iniciar_rodada_cassino("r1", "g", "u", "dados", 10, 60, {"dado": 3}, HOJE)
    assert rodada["nova"] is True
    assert repetida["nova"] is False
    assert _saldo(db) == inicial - 10

    primeira = db.liquidar_rodada_cassino("r1", "u", 20, {"venceu": True}, {"dado": 3})
    segunda = db.liquidar_rodada_cassino("r1", "u", 20, {"venceu": True}, {"dado": 3})
    assert primeira["nova"] is True
    assert segunda["nova"] is False
    assert _saldo(db) == inicial + 10
    assert db.diagnostico_cassino("g")["resultado_casa"] == -10


def test_pagamento_nao_pode_ultrapassar_maximo_registrado():
    db = novo_db()
    db.iniciar_rodada_cassino("r2", "g", "u", "dados", 5, 28, {}, HOJE)
    with pytest.raises(ValueError):
        db.liquidar_rodada_cassino("r2", "u", 29, {}, {})
    assert db.get_rodada_cassino("r2")["status"] == "ativa"


def test_saldo_e_limites_sao_validados_antes_do_debito():
    db = novo_db()
    db.configurar_cassino(
        "g", ativo=True, aposta_minima=5, aposta_maxima=20,
        limite_apostado_dia=15, limite_perda_dia=12,
    )
    inicial = _saldo(db)
    with pytest.raises(CassinoLimite):
        db.iniciar_rodada_cassino("grande", "g", "u", "dados", 21, 100, {}, HOJE)
    db.iniciar_rodada_cassino("ok", "g", "u", "dados", 10, 57, {}, HOJE)
    db.liquidar_rodada_cassino("ok", "u", 0, {"venceu": False}, {})
    with pytest.raises(CassinoLimite):
        db.iniciar_rodada_cassino("limite", "g", "u", "dados", 5, 28, {}, HOJE)
    assert _saldo(db) == inicial - 10


def test_saldo_insuficiente_nao_cria_rodada():
    db = novo_db()
    db.configurar_cassino(
        "g", ativo=True, aposta_minima=5, aposta_maxima=200,
        limite_apostado_dia=500, limite_perda_dia=200,
    )
    with pytest.raises(SaldoInsuficiente):
        db.iniciar_rodada_cassino("sem-saldo", "g", "u", "dados", 100, 570, {}, HOJE)
    assert db.get_rodada_cassino("sem-saldo") is None


def test_pausa_bloqueia_novas_rodadas():
    db = novo_db()
    longa = datetime.now(timezone.utc) + timedelta(days=30)
    db.pausar_cassino("g", "u", longa)
    curta = db.pausar_cassino("g", "u", datetime.now(timezone.utc) + timedelta(days=1))
    assert curta["pausado_ate"] == longa
    with pytest.raises(CassinoIndisponivel):
        db.iniciar_rodada_cassino("pausa", "g", "u", "dados", 5, 28, {}, HOJE)


def test_atualizacao_otimista_e_dobro_sao_atomicos():
    db = novo_db()
    db.creditar("g", "u", "Lunaris", 100)
    inicial = _saldo(db)
    rodada = db.iniciar_rodada_cassino("21", "g", "u", "vinte_um", 10, 25, {"passo": 1}, HOJE)
    atualizada = db.atualizar_rodada_cassino(
        "21", "u", rodada["versao"], {"passo": 2},
        aposta_extra=10, pagamento_maximo=50,
    )
    assert atualizada["aposta"] == 20
    assert _saldo(db) == inicial - 20
    with pytest.raises(RodadaCassinoConflito):
        db.atualizar_rodada_cassino("21", "u", rodada["versao"], {"passo": 3})


def test_reembolso_e_idempotente():
    db = novo_db()
    inicial = _saldo(db)
    db.iniciar_rodada_cassino("refund", "g", "u", "vinte_um", 5, 13, {}, HOJE)
    primeiro = db.reembolsar_rodada_cassino("refund", "timeout")
    segundo = db.reembolsar_rodada_cassino("refund", "timeout")
    assert primeiro["nova"] is True
    assert segundo["nova"] is False
    assert _saldo(db) == inicial


def test_corrida_registra_uma_aposta_por_jogador_e_entra_no_bolo():
    db = novo_db()
    db.creditar("g", "u", "Lunaris", 100)
    inicial = _saldo(db)
    fecha = datetime.now(timezone.utc) + timedelta(hours=1)
    corrida = db.obter_ou_criar_corrida("g", "2026-08-27T18", fecha)
    mesma = db.obter_ou_criar_corrida("g", "2026-08-27T18", fecha)
    assert mesma["id"] == corrida["id"]

    aposta = db.apostar_corrida(
        "corrida:1", corrida["id"], "g", "u", "raposa", 10, HOJE
    )
    assert aposta["nova"] is True
    assert _saldo(db) == inicial - 10
    with pytest.raises(CassinoLimite):
        db.apostar_corrida(
            "corrida:2", corrida["id"], "g", "u", "cervo", 5, HOJE
        )
    resumo = db.resumo_corrida(corrida["id"], "g", "u")
    assert resumo["por_corredor"]["raposa"] == {"total": 10, "apostadores": 1}
    assert resumo["minha"]["rodada_id"] == "corrida:1"


def test_recuperacao_generica_nao_reembolsa_corrida_antes_do_resultado():
    db = novo_db()
    fecha = datetime.now(timezone.utc) + timedelta(hours=1)
    corrida = db.obter_ou_criar_corrida("g", "2026-08-27T12", fecha)
    db.apostar_corrida("corrida:ativa", corrida["id"], "g", "u", "golem", 5, HOJE)
    with db._conn() as con:
        con.execute(
            "UPDATE cassino_rodadas SET atualizado_em=CURRENT_TIMESTAMP - INTERVAL '1 day' WHERE id='corrida:ativa'"
        )
    assert db.listar_rodadas_cassino_expiradas(datetime.now(timezone.utc)) == []


def test_contrato_semanal_exige_variedade_e_resgata_uma_vez():
    db = novo_db()
    semana = date(2026, 8, 24)
    inicial = _saldo(db)
    credito_inicial = db.get_cartao("g", "u")["credito"]
    for objetivo in ("mercado", "financas", "cassino"):
        assert db.registrar_atividade_contrato("g", "u", semana, objetivo) is True
        assert db.registrar_atividade_contrato("g", "u", semana, objetivo) is False
    resumo = db.resumo_contrato("g", "u", semana)
    assert resumo["quantidade"] == 3

    primeiro = db.resgatar_contrato("g", "u", semana)
    segundo = db.resgatar_contrato("g", "u", semana)
    assert primeiro["novo"] is True
    assert segundo["novo"] is False
    assert _saldo(db) == inicial + 15
    assert db.get_cartao("g", "u")["credito"] == credito_inicial + 5


def test_contrato_incompleto_nao_paga():
    db = novo_db()
    semana = date(2026, 8, 24)
    db.registrar_atividade_contrato("g", "u", semana, "mercado")
    with pytest.raises(CassinoLimite):
        db.resgatar_contrato("g", "u", semana)


def test_conquistas_sao_derivadas_de_resultados_liquidados():
    db = novo_db()
    db.creditar("g", "u", "Lunaris", 100)
    db.iniciar_rodada_cassino("conquista", "g", "u", "vinte_um", 5, 100, {}, HOJE)
    db.liquidar_rodada_cassino(
        "conquista", "u", 60,
        {"resultado": "vinte_um_natural"},
        {"status": "finalizada", "resultado": "vinte_um_natural"},
    )
    primeira_avaliacao = db.avaliar_conquistas_cassino("g", "u")
    chaves = {item["chave"] for item in primeira_avaliacao}
    assert {"primeira_rodada", "vinte_um_natural", "grande_vitoria"} <= chaves
    assert any(item["nova"] for item in primeira_avaliacao)
    assert not any(item["nova"] for item in db.avaliar_conquistas_cassino("g", "u"))


def test_novos_jogos_e_conquistas_tem_estado_persistido():
    db = novo_db()
    db.creditar("g", "u", "Lunaris", 500)
    casos = [
        ("dados", 30, {"escolha": "exato", "venceu": True}),
        ("vinte_um", 13, {"resultado": "vinte_um_natural"}),
        ("roda_fluxos", 50, {"escolha": "vazio", "sorteada": "vazio", "venceu": True}),
        ("sucessao", 5, {"lado": "passo", "empate": True}),
        ("vaos", 20, {"indice": 0, "destino": "Borda esquerda"}),
    ]
    for indice, (jogo, pagamento, resultado) in enumerate(casos):
        rodada_id = f"novo-{indice}"
        db.iniciar_rodada_cassino(rodada_id, "g", "u", jogo, 5, 100, resultado, HOJE)
        db.liquidar_rodada_cassino(rodada_id, "u", pagamento, resultado, resultado)
    db.pausar_cassino("g", "u", datetime.now(timezone.utc) + timedelta(days=1))

    chaves = {item["chave"] for item in db.avaliar_conquistas_cassino("g", "u")}
    assert {
        "todos_jogos", "dado_exato", "vinte_um_natural", "roda_exata",
        "roda_vazio", "passo_chronus", "vaos_borda", "pausa_consciente",
    } <= chaves
    auditoria = db.auditoria_sorteios_cassino("g")
    assert auditoria["roda_fluxos"] == {"vazio": 1}
    assert auditoria["sucessao"] == {}
    # O estado liquidado e o resultado podem ser diferentes; a auditoria usa
    # somente o resultado persistido e ignora campos ausentes com segurança.
    assert auditoria["vaos"] == {"0": 1}


def test_conquistas_de_sequencia_e_retorno_usam_ordem_das_rodadas():
    db = novo_db()
    pagamentos = [0, 0, 0, 10, 10, 10, 10, 10]
    for indice, valor in enumerate(pagamentos):
        rodada_id = f"sequencia-{indice}"
        estado = {"dado": 1, "venceu": valor > 0}
        db.iniciar_rodada_cassino(rodada_id, "g", "u", "dados", 5, 10, estado, HOJE)
        db.liquidar_rodada_cassino(rodada_id, "u", valor, estado, estado)
    chaves = {item["chave"] for item in db.avaliar_conquistas_cassino("g", "u")}
    assert {"retorno_arkarin", "sequencia_tres", "sequencia_cinco"} <= chaves


def test_torneio_legado_reserva_duplicata_e_entrega_pote_atomicamente():
    class _Segundo:
        @staticmethod
        def choice(valores):
            return valores[1]

    db = novo_db()
    db.add_item("g", "u", "pocao", "Poção", "equipamento", 2)
    db.add_item("g", "v", "incenso", "Incenso", "equipamento", 2)
    fecha = datetime.now(timezone.utc) + timedelta(hours=1)
    torneio = db.obter_ou_criar_torneio("g", date(2026, 8, 24), fecha)
    entrada_u = db.criar_entrada_torneio_pendente(
        torneio["id"], "g", "u", "pocao", "Poção", "equipamento", "comum", "legado"
    )
    entrada_v = db.criar_entrada_torneio_pendente(
        torneio["id"], "g", "v", "incenso", "Incenso", "equipamento", "comum", "legado"
    )
    db.confirmar_entrada_torneio_legado(entrada_u["id"])
    db.confirmar_entrada_torneio_legado(entrada_v["id"])
    assert {i["item_id"]: i["quantidade"] for i in db.listar_inventario("g", "u")}["pocao"] == 1
    assert {i["item_id"]: i["quantidade"] for i in db.listar_inventario("g", "v")}["incenso"] == 1

    with db._conn() as con:
        con.execute(
            "UPDATE cassino_torneios SET fecha_em=CURRENT_TIMESTAMP - INTERVAL '1 minute' WHERE id=%s",
            (torneio["id"],),
        )
    sorteado = db.sortear_torneio(torneio["id"], rng=_Segundo())
    assert sorteado["vencedor_user_id"] == "v"
    for entrada in sorteado["entradas"]:
        db.entregar_entrada_torneio_legado(entrada["id"], "v")
        db.entregar_entrada_torneio_legado(entrada["id"], "v")
    assert db.concluir_torneio(torneio["id"])["status"] == "concluido"
    inventario_v = {i["item_id"]: i["quantidade"] for i in db.listar_inventario("g", "v")}
    assert inventario_v["pocao"] == 1
    assert inventario_v["incenso"] == 2
    assert "oferenda_torneio" in {
        item["chave"] for item in db.avaliar_conquistas_cassino("g", "u")
    }
    assert {"oferenda_torneio", "campeao_torneio"} <= {
        item["chave"] for item in db.avaliar_conquistas_cassino("g", "v")
    }


def test_torneio_nao_aceita_unica_unidade():
    db = novo_db()
    db.add_item("g", "u", "unico", "Único", "equipamento", 1)
    torneio = db.obter_ou_criar_torneio(
        "g", date(2026, 8, 24), datetime.now(timezone.utc) + timedelta(hours=1)
    )
    entrada = db.criar_entrada_torneio_pendente(
        torneio["id"], "g", "u", "unico", "Único", "equipamento", "comum", "legado"
    )
    with pytest.raises(CassinoLimite):
        db.confirmar_entrada_torneio_legado(entrada["id"])
    assert db.listar_inventario("g", "u")[0]["quantidade"] == 1
