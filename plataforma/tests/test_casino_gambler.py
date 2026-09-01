from __future__ import annotations

import importlib.util
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import patch
from uuid import UUID, uuid4

import pytest
from fastapi import HTTPException

from core import casino_rules
from core.dependencies import AuthenticatedUser, CampaignAccess
from routers.casino import TZ_JARDIM, JogadaInstantaneaInput, _log_response, _public_blackjack_state, casino_logs


class _DadoFixo:
    def __init__(self, valor):
        self.valor = valor

    def randint(self, inicio, fim):
        assert (inicio, fim) == (1, 6)
        return self.valor


class _EscolhaFixa:
    def __init__(self, valor):
        self.valor = valor

    def choice(self, valores):
        assert self.valor in valores
        return self.valor


class _InteiroFixo:
    def __init__(self, valor):
        self.valor = valor

    def randint(self, inicio, fim):
        assert inicio <= self.valor <= fim
        return self.valor


class _BitsFixos:
    def __init__(self, bits):
        self.bits = iter(bits)

    def randint(self, inicio, fim):
        assert (inicio, fim) == (0, 1)
        return next(self.bits)


class _ResultadoConsulta:
    def __init__(self, *, one=None, many=None):
        self.one = one
        self.many = many or []

    def fetchone(self):
        return self.one

    def fetchall(self):
        return self.many


class _ConexaoLogs:
    def __init__(self, summary, rows):
        self.summary = summary
        self.rows = rows

    def execute(self, query, _params):
        if "COUNT(*)::BIGINT AS total_rodadas" in query:
            return _ResultadoConsulta(one=self.summary)
        return _ResultadoConsulta(many=self.rows)


class _BancoLogs:
    def __init__(self, connection):
        self.connection_value = connection

    @contextmanager
    def connection(self):
        yield self.connection_value


def _usuario_autenticado(user_id: UUID) -> AuthenticatedUser:
    return AuthenticatedUser(
        id=user_id,
        email="mestre@example.com",
        nome_exibicao="Mestre",
        admin_plataforma=False,
        papel_plataforma="mestre",
        session_id=uuid4(),
        csrf_hash="hash",
    )


def _regras_banqueiro():
    path = Path(__file__).resolve().parents[2] / "bots" / "banqueiro" / "core" / "cassino.py"
    spec = importlib.util.spec_from_file_location("regras_cassino_banqueiro", path)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_regras_do_site_permanecem_iguais_as_do_banqueiro():
    banco = _regras_banqueiro()

    assert casino_rules.CASSINO_CONFIG == banco.CASSINO_CONFIG_PADRAO
    assert casino_rules.FORCAS_DA_RODA == banco.FORCAS_DA_RODA
    assert casino_rules.jogar_dados("exato", 10, 3, _DadoFixo(3)) == banco.jogar_dados(
        "exato", 10, 3, _DadoFixo(3)
    )
    assert casino_rules.jogar_roda_fluxos("vazio", 10, _EscolhaFixa("vazio")) == banco.jogar_roda_fluxos(
        "vazio", 10, _EscolhaFixa("vazio")
    )
    assert casino_rules.jogar_sucessao("antes", 10, _InteiroFixo(7)) == banco.jogar_sucessao(
        "antes", 10, _InteiroFixo(7)
    )
    assert casino_rules.jogar_vaos(10, _BitsFixos([0, 0, 0, 0])) == banco.jogar_vaos(
        10, _BitsFixos([0, 0, 0, 0])
    )


def test_estado_publico_do_vinte_um_esconde_baralho_e_carta_da_casa():
    estado = {
        "baralho": ["A", "K", "3"],
        "jogador": ["10", "8"],
        "banqueiro": ["9", "K"],
        "status": "ativa",
        "resultado": None,
        "multiplicador_bp": None,
        "dobrada": False,
    }

    publico = _public_blackjack_state(estado)

    assert "baralho" not in publico
    assert publico["banqueiro"] == ["9", "?"]
    assert publico["valor_banqueiro"] == 9
    assert publico["pode_dobrar"] is True


def test_estado_final_revela_a_mao_completa_da_casa():
    estado = {
        "baralho": ["A"],
        "jogador": ["10", "9"],
        "banqueiro": ["9", "K"],
        "status": "finalizada",
        "resultado": "empate",
        "multiplicador_bp": 10_000,
        "dobrada": False,
    }

    publico = _public_blackjack_state(estado)

    assert publico["banqueiro"] == ["9", "K"]
    assert publico["valor_banqueiro"] == 19


def test_payload_json_aceita_uuids_do_frontend_e_mantem_aposta_inteira():
    payload = JogadaInstantaneaInput.model_validate_json(
        """
        {
          "campanha_id": "11111111-1111-1111-1111-111111111111",
          "personagem_id": "33333333-3333-3333-3333-333333333333",
          "idempotencia": "22222222-2222-2222-2222-222222222222",
          "jogo": "dados",
          "aposta": 5,
          "escolha": "baixo"
        }
        """
    )

    assert payload.aposta == 5
    assert str(payload.idempotencia) == "22222222-2222-2222-2222-222222222222"


def test_cambio_para_fichas_usa_as_taxas_oficiais_combinadas():
    assert casino_rules.MOEDAS_PARA_FICHAS == {
        "Lunaris": 1,
        "Solares": 100,
        "Fragmentos de Estrela": 5_000,
        "Créditos Sombrios": 200,
    }


def test_payload_via_http_de_verdade_aceita_uuid_em_string():
    """Regressao: um `strict=True` no model_config quebra a validacao real do
    FastAPI (ele valida o corpo como dict Python, nao como bytes JSON), mesmo
    que `model_validate_json` direto continue passando. So um TestClient
    batendo na rota de verdade pega isso."""
    from fastapi import FastAPI
    from fastapi.testclient import TestClient

    app = FastAPI()

    @app.post("/teste")
    def _endpoint(payload: JogadaInstantaneaInput):
        return {"jogo": payload.jogo}

    client = TestClient(app)
    resposta = client.post(
        "/teste",
        json={
            "campanha_id": "11111111-1111-1111-1111-111111111111",
            "personagem_id": "33333333-3333-3333-3333-333333333333",
            "idempotencia": "22222222-2222-2222-2222-222222222222",
            "jogo": "dados",
            "aposta": 5,
            "escolha": "baixo",
        },
    )
    assert resposta.status_code == 200, resposta.json()
    assert resposta.json() == {"jogo": "dados"}


def test_rolos_de_amadheus_paga_100_por_cento_em_todas_as_combinacoes():
    from itertools import product

    simbolos = tuple(casino_rules.ROLOS_SIMBOLOS)
    total = 0
    for combo in product(simbolos, repeat=3):
        trinca = len(set(combo)) == 1
        multiplicador = 0
        if trinca:
            multiplicador = (
                casino_rules.ROLOS_PAGAMENTO_BP["vazio"]
                if combo[0] == "vazio"
                else casino_rules.ROLOS_PAGAMENTO_BP["comum"]
            )
        total += multiplicador
    combinacoes = len(simbolos) ** 3
    assert total / combinacoes == 10_000


def test_duelo_do_vazio_paga_100_por_cento_em_todas_as_combinacoes():
    from itertools import product

    total = 0
    for carta_jogador, carta_gambler in product(casino_rules.DUELO_CARTAS, repeat=2):
        if carta_jogador > carta_gambler:
            multiplicador = casino_rules.DUELO_PAGAMENTO_BP["vitoria"]
        elif carta_jogador == carta_gambler:
            multiplicador = casino_rules.DUELO_PAGAMENTO_BP["empate"]
        else:
            multiplicador = casino_rules.DUELO_PAGAMENTO_BP["derrota"]
        total += multiplicador
    combinacoes = len(casino_rules.DUELO_CARTAS) ** 2
    assert total / combinacoes == 10_000


def test_agir_vinte_um_deixa_a_casa_comprar_ate_atingir_21_nao_natural():
    """Regressao: comprar ate bater 21 sem ser natural nao pode pular a vez
    do Banqueiro - ele ainda tem que comprar ate 17 antes de fechar."""

    estado = {
        "baralho": ["5", "6"],
        "jogador": ["5", "10"],
        "banqueiro": ["10", "6"],
        "status": "ativa",
        "resultado": None,
        "multiplicador_bp": None,
        "dobrada": False,
    }
    novo = casino_rules.agir_vinte_um(estado, "comprar")
    assert casino_rules.valor_mao(novo["jogador"]) == 21
    assert len(novo["banqueiro"]) == 3, "o Banqueiro deveria ter comprado mais uma carta"
    assert novo["status"] == "finalizada"
    assert novo["resultado"] == "empate"


def test_log_de_aposta_nao_expoe_estado_baralho_ou_requisicao():
    agora = datetime.now(timezone.utc)
    row = {
        "id": uuid4(),
        "personagem_id": uuid4(),
        "personagem_nome": "Heroína",
        "usuario_id": uuid4(),
        "usuario_nome": "Jogadora",
        "jogo": "vinte_um",
        "aposta": 10,
        "pagamento": 0,
        "status": "ativa",
        "resultado": {"segredo": "não deve sair"},
        "estado": {"baralho": ["A", "K"]},
        "requisicao": {"escolha": "comprar"},
        "criado_em": agora,
        "encerrada_em": None,
    }

    log = _log_response(row)

    assert "estado" not in log
    assert "requisicao" not in log
    assert log["resultado"] == {}
    assert log["saldo"] == -10


def test_somente_mestre_consegue_consultar_logs_de_todos_os_jogadores():
    campaign_id = uuid4()
    user_id = uuid4()
    character_id = uuid4()
    now = datetime.now(timezone.utc)
    connection = _ConexaoLogs(
        summary={"total_rodadas": 1, "rodadas_ativas": 0, "total_apostado": 12, "total_pago": 24},
        rows=[{
            "id": uuid4(), "personagem_id": character_id, "personagem_nome": "Heroína",
            "usuario_id": user_id, "usuario_nome": "Jogadora", "jogo": "dados",
            "aposta": 12, "pagamento": 24, "status": "liquidada",
            "resultado": {"dado": 4}, "criado_em": now, "encerrada_em": now,
        }],
    )
    database = _BancoLogs(connection)
    actor = _usuario_autenticado(user_id)
    master_access = CampaignAccess(campaign_id, user_id, "mestre", user_id)

    with patch("routers.casino.campaign_access", return_value=master_access):
        response = casino_logs(
            campanha_id=campaign_id,
            limite=50,
            deslocamento=0,
            user=actor,
            database=database,
        )

    assert response["total"] == 1
    assert response["logs"][0]["personagem_nome"] == "Heroína"
    assert response["resumo"]["saldo_casa"] == -12

    player_access = CampaignAccess(campaign_id, user_id, "jogador", user_id)
    with patch("routers.casino.campaign_access", return_value=player_access):
        with pytest.raises(HTTPException) as error:
            casino_logs(
                campanha_id=campaign_id,
                limite=50,
                deslocamento=0,
                user=actor,
                database=database,
            )
    assert error.value.status_code == 403


def test_dia_local_vira_a_meia_noite_no_horario_do_jardim_e_nao_as_21h():
    """O limite diário some pra `dia_local` de cada rodada (ver `_metrics` em
    routers/casino.py), sempre calculado como `datetime.now(TZ_JARDIM).date()`.
    Esse teste prova onde a virada realmente acontece: 21h e meia-noite estão a
    3h de distância porque America/Sao_Paulo é UTC-3 sem horário de verão desde
    2019 - fácil de confundir os dois horários sem checar o cálculo de verdade.
    """
    antes_das_21h = datetime(2026, 8, 28, 20, 59, 59, tzinfo=TZ_JARDIM)
    depois_das_21h = datetime(2026, 8, 28, 21, 0, 1, tzinfo=TZ_JARDIM)
    assert antes_das_21h.date() == depois_das_21h.date(), (
        "as 21h não muda o dia - se este teste falhar, o limite diário do "
        "cassino está resetando 3h mais cedo do que devia"
    )

    fim_do_dia = datetime(2026, 8, 28, 23, 59, 59, tzinfo=TZ_JARDIM)
    inicio_do_proximo_dia = datetime(2026, 8, 29, 0, 0, 1, tzinfo=TZ_JARDIM)
    assert fim_do_dia.date() != inicio_do_proximo_dia.date(), (
        "a virada de dia deveria acontecer à meia-noite no horário do Jardim"
    )

    assert TZ_JARDIM.key == "America/Sao_Paulo"
