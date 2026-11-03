"""Hora do mundo no calendário, luz do dia da cena e portais do mapa
(core/calendario.py, core/mapa.py, core/tempo_real.py, routers/mapa.py)."""

from __future__ import annotations

import asyncio
import json
import os
import unittest
import uuid

import psycopg
import pytest
from psycopg import sql
from psycopg.conninfo import make_conninfo
from psycopg.types.json import Jsonb

from core import calendario as cal
from core import mapa, tempo_real
from core.calendario import ErroCalendario
from core.mapa import ErroMapa

TEST_DSN = (os.getenv("TEST_DATABASE_URL") or "").strip()


# ------------------------------------------------------------- hora do mundo

def test_calendario_novo_ou_antigo_comeca_as_oito():
    assert cal.estado_inicial()["minuto"] == 8 * 60
    assert cal.completar({"hoje": {"ano": 2, "mes": 3, "dia": 5}})["minuto"] == 8 * 60
    assert cal.completar({"minuto": 99999})["minuto"] == 8 * 60
    assert cal.completar({"minuto": True})["minuto"] == 8 * 60
    assert cal.completar({"minuto": 0})["minuto"] == 0


def test_avancar_a_hora_passa_da_meia_noite_e_muda_o_dia():
    estado = cal.estado_inicial()
    cal.definir_hoje(estado, {"ano": 1, "mes": 0, "dia": 28, "minuto": 22 * 60 + 30})
    cal.avancar_tempo(estado, 3 * 60)
    assert estado["minuto"] == 1 * 60 + 30
    assert estado["hoje"] == {"ano": 1, "mes": 1, "dia": 1}
    cal.avancar_tempo(estado, -2 * 60)
    assert (estado["hoje"], estado["minuto"]) == ({"ano": 1, "mes": 0, "dia": 28}, 23 * 60 + 30)
    cal.avancar_tempo(estado, 8 * 60 + 10)
    assert estado["historico"][-1]["texto"] == "Avançou 8 h e 10 min"
    with pytest.raises(ErroCalendario):
        cal.avancar_tempo(estado, cal.MAX_MINUTOS_PULO + 1)
    with pytest.raises(ErroCalendario):
        cal.avancar_tempo(estado, 1.5)


def test_desfazer_volta_a_hora_e_o_dia_juntos():
    estado = cal.estado_inicial()
    cal.definir_hoje(estado, {"ano": 1, "mes": 0, "dia": 3, "minuto": 23 * 60})
    cal.avancar_tempo(estado, 2 * 60)
    assert (estado["hoje"]["dia"], estado["minuto"]) == (4, 60)
    cal.desfazer(estado)
    assert (estado["hoje"]["dia"], estado["minuto"]) == (3, 23 * 60)


def test_definir_hoje_sem_minuto_guarda_a_hora_de_antes():
    estado = cal.estado_inicial()
    cal.avancar_tempo(estado, 6 * 60)
    cal.definir_hoje(estado, {"ano": 4, "mes": 2, "dia": 9})
    assert estado["minuto"] == 14 * 60
    with pytest.raises(ErroCalendario):
        cal.definir_hoje(estado, {"ano": 4, "mes": 2, "dia": 9, "minuto": 1440})


def test_duracao_por_extenso_para_o_historico():
    assert cal.duracao_extenso(10) == "10 min"
    assert cal.duracao_extenso(60) == "1 h"
    assert cal.duracao_extenso(-90) == "1 h e 30 min"
    assert cal.duracao_extenso(2 * 1440 + 3 * 60) == "2 dias e 3 h"
    assert cal.duracao_extenso(1440 + 61) == "1 dia, 1 h e 1 min"
    assert cal.duracao_extenso(0) == "0 min"


def test_resumo_do_tempo_traz_hora_estacao_lua_e_data():
    estado = cal.estado_inicial()
    cal.definir_hoje(estado, {"ano": 3, "mes": 0, "dia": 15, "minuto": 18 * 60 + 40})
    resumo = cal.resumo_do_tempo(estado)
    assert resumo["minuto"] == 18 * 60 + 40 and resumo["hora_extenso"] == "18:40"
    assert resumo["lua"] == 0.5 and resumo["lua_carmesim"] is False
    assert resumo["estacao"] == cal.estacao_atual(estado)
    assert resumo["data"]["dia"] == 15 and resumo["data"]["mes_nome"] == "Gênese"
    # O dia 29 do Limiar é o da Lua Carmesim.
    cal.definir_hoje(estado, {"ano": 3, "mes": 8, "dia": 29})
    assert cal.resumo_do_tempo(estado)["lua_carmesim"] is True
    assert cal.visao(estado, gestor=False)["hora_extenso"] == "18:40"


# ----------------------------------------------------------- luz da cena

def test_luz_da_cena_comeca_sem_mudar_e_confere_o_modo():
    assert mapa.normalizar_clima({}, 1000, 1000)["ceu"] == {"modo": "nenhum", "minuto": 720}
    assert mapa.normalizar_clima({"ceu": {"modo": "fixo", "minuto": 300}}, 1000, 1000)["ceu"] == {"modo": "fixo", "minuto": 300}
    assert mapa.ler_clima({"ceu": "noite"}, 1000, 1000)["ceu"]["modo"] == "nenhum"
    for ruim in ({"modo": "lua"}, {"modo": "fixo", "minuto": 1440}, {"modo": "fixo", "minuto": 12.5}, "dia"):
        with pytest.raises(ErroMapa):
            mapa.normalizar_ceu(ruim)


# -------------------------------------------------------------- portais

def _portal(**extra):
    base = {"a": {"x": 100, "y": 100}, "b": {"x": 900, "y": 500}}
    base.update(extra)
    return mapa.normalizar_portais([base], 1000, 1000)[0]


def test_portal_novo_ganha_id_e_padroes_e_recusa_o_que_nao_conhece():
    portal = _portal()
    assert portal["id"].startswith("p") and portal["nome"] == "Portal"
    assert (portal["mao"], portal["usa"], portal["fluxo"], portal["raio"]) == ("dupla", "todos", "espaco", 0.6)
    assert portal["visivel"] and portal["ligado"] and not portal["confirmar"]
    # Ponta fora do mapa fica presa na borda.
    assert _portal(b={"x": 5000, "y": -20})["b"] == {"x": 1000.0, "y": 0.0}
    dois = mapa.normalizar_portais([{**portal}, {**portal}], 1000, 1000)
    assert dois[0]["id"] == portal["id"] and dois[1]["id"] != portal["id"]
    for ruim in ([{"a": {"x": 1, "y": 1}}], [{**portal, "mao": "tripla"}], [{**portal, "fluxo": "fogo"}],
                 [{**portal, "usa": "ninguem"}], [{**portal, "raio": 9}], [portal] * (mapa.MAX_PORTAIS + 1), "x"):
        with pytest.raises(ErroMapa):
            mapa.normalizar_portais(ruim, 1000, 1000)
    assert mapa.ler_estrutura({"portais": "estragado"}, 1000, 1000) == {"portais": []}


def test_soltar_na_boca_leva_ao_outro_lado():
    portal = _portal()
    achado = mapa.portal_atingido([portal], 120, 110, 100, gestor=False)
    assert achado and achado[1] == (900.0, 500.0)
    # Ida e volta: a saída leva de volta à entrada.
    assert mapa.portal_atingido([portal], 900, 520, 100, gestor=False)[1] == (100.0, 100.0)
    # Longe da boca (fora do raio de 0,6 casa), nada acontece.
    assert mapa.portal_atingido([portal], 200, 100, 100, gestor=False) is None
    so_ida = _portal(mao="unica")
    assert mapa.portal_atingido([so_ida], 900, 500, 100, gestor=False) is None
    assert mapa.portal_atingido([_portal(ligado=False)], 100, 100, 100, gestor=True) is None


def test_quem_usa_o_portal():
    so_jogadores = _portal(usa="jogadores")
    assert mapa.portal_atingido([so_jogadores], 100, 100, 100, gestor=True) is None
    assert mapa.portal_atingido([so_jogadores], 100, 100, 100, gestor=False) is not None
    so_mestre = _portal(usa="mestre")
    assert mapa.portal_atingido([so_mestre], 100, 100, 100, gestor=False) is None
    assert mapa.portal_atingido([so_mestre], 100, 100, 100, gestor=True) is not None


def test_portal_que_pergunta_so_leva_com_o_aceite_e_o_escondido_nao_pergunta():
    pergunta = _portal(confirmar=True)
    assert mapa.portal_atingido([pergunta], 100, 100, 100, gestor=False) is None
    assert mapa.portal_atingido([pergunta], 100, 100, 100, gestor=False, aceito="outro") is None
    assert mapa.portal_atingido([pergunta], 100, 100, 100, gestor=False, aceito=pergunta["id"]) is not None
    armadilha = _portal(confirmar=True, visivel=False)
    assert mapa.portal_atingido([armadilha], 100, 100, 100, gestor=False) is not None
    # O Mestre vê o portal escondido: para ele a pergunta vale.
    assert mapa.portal_atingido([armadilha], 100, 100, 100, gestor=True) is None


def test_jogador_ve_so_portal_ligado_visivel_e_a_boca_fora_da_nevoa():
    aberto, escondido, desligado = _portal(nome="Arco"), _portal(visivel=False), _portal(ligado=False)
    todos = [aberto, escondido, desligado]
    assert len(mapa.portais_de(todos, gestor=True, revelado=lambda x, y: False)) == 3
    vistos = mapa.portais_de(todos, gestor=False, revelado=lambda x, y: True)
    assert [p["nome"] for p in vistos] == ["Arco"]
    so_a = mapa.portais_de([aberto], gestor=False, revelado=lambda x, y: x < 500)
    assert so_a[0]["a"] == {"x": 100.0, "y": 100.0} and so_a[0]["b"] is None
    assert mapa.portais_de([aberto], gestor=False, revelado=lambda x, y: False) == []


# ----------------------------------------------------------- tempo real

def _conexao(usuario, gestor=False):
    return tempo_real.Conexao(usuario_id=usuario, nome=usuario.title(), gestor=gestor)


def _mensagens(conexao):
    return [m for m in (json.loads(t) for t in conexao.tirar_agora()) if m["t"] != "presenca"]


def test_soltar_no_portal_leva_o_token_e_avisa_a_mesa():
    async def cenario():
        tempo_real._limpar_para_testes()
        mestre, ana = _conexao("m", gestor=True), _conexao("ana")
        for c in (mestre, ana):
            tempo_real.entrar("camp", c)
        for c in (mestre, ana):
            _mensagens(c)
        regra = tempo_real.RegraToken(quem_ve="todos", donos=frozenset({"ana"}), movivel_livre=False)
        regras = tempo_real.Regras(
            cena_id="c1", livre=False, largura=1000, altura=1000, tokens={"t1": regra},
            portais=[_portal(fluxo="tempo")], casa=100.0,
        )
        gravadas = []

        async def carregar():
            return regras

        async def gravar(token_id, x, y):
            gravadas.append((token_id, x, y))
            return True

        resposta = await tempo_real.processar("camp", ana, {"t": "soltar", "token": "t1", "x": 110, "y": 95}, carregar, gravar)
        assert resposta["t"] == "portal" and (resposta["x"], resposta["y"]) == (900.0, 500.0)
        assert resposta["de"] == [110.0, 95.0] and resposta["fluxo"] == "tempo"
        assert gravadas == [("t1", 900.0, 500.0)]
        recebidas = _mensagens(mestre)
        assert [m["t"] for m in recebidas] == ["portal"] and recebidas[0]["x"] == 900.0

        # Fora da boca: soltar comum, sem travessia.
        gravadas.clear()
        assert await tempo_real.processar("camp", ana, {"t": "soltar", "token": "t1", "x": 400, "y": 400}, carregar, gravar) is None
        assert gravadas == [("t1", 400.0, 400.0)]
        assert [m["t"] for m in _mensagens(mestre)] == ["token"]

        # Arrastar por cima do portal não leva: só soltar.
        await tempo_real.processar("camp", ana, {"t": "arrastar", "token": "t1", "x": 100, "y": 100}, carregar, gravar)
        assert [m["t"] for m in _mensagens(mestre)] == ["arrastando"]

    asyncio.run(cenario())


def test_portal_que_pergunta_espera_o_aceite_no_tempo_real():
    async def cenario():
        tempo_real._limpar_para_testes()
        ana = _conexao("ana")
        tempo_real.entrar("camp", ana)
        regra = tempo_real.RegraToken(quem_ve="todos", donos=frozenset({"ana"}), movivel_livre=False)
        portal = _portal(confirmar=True)
        regras = tempo_real.Regras(cena_id="c1", livre=False, largura=1000, altura=1000, tokens={"t1": regra}, portais=[portal])

        async def carregar():
            return regras

        async def gravar(token_id, x, y):
            return True

        assert await tempo_real.processar("camp", ana, {"t": "soltar", "token": "t1", "x": 100, "y": 100}, carregar, gravar) is None
        aceito = await tempo_real.processar(
            "camp", ana, {"t": "soltar", "token": "t1", "x": 100, "y": 100, "atravessar": portal["id"]}, carregar, gravar,
        )
        assert aceito["t"] == "portal" and aceito["x"] == 900.0

    asyncio.run(cenario())


def test_mudar_o_calendario_mexe_no_mapa():
    assert "calendario" not in tempo_real.EVENTOS_SEM_EFEITO_NO_MAPA
    assert "tempo" in tempo_real.CAMPOS_DO_ESTADO


# ------------------------------------------------------------- com banco

@unittest.skipUnless(TEST_DSN, "TEST_DATABASE_URL nao configurada")
class TempoEPortaisBancoTests(unittest.TestCase):
    def setUp(self):
        from core.database import Database
        from core.dependencies import AuthenticatedUser

        if TEST_DSN == (os.getenv("DATABASE_URL") or "").strip():
            self.fail("TEST_DATABASE_URL nao pode ser o banco de producao")
        self.schema = f"jardim_test_{uuid.uuid4().hex}"
        with psycopg.connect(TEST_DSN, autocommit=True) as connection:
            connection.execute(sql.SQL("CREATE SCHEMA {}").format(sql.Identifier(self.schema)))
        self.database = Database(make_conninfo(TEST_DSN, options=f"-c search_path={self.schema}"))
        self.database.open()
        self.campanha_id = uuid.uuid4()

        def usuario(email, nome, papel, plataforma="player"):
            pessoa = AuthenticatedUser(
                id=uuid.uuid4(), email=email, nome_exibicao=nome, admin_plataforma=False,
                papel_plataforma=plataforma, session_id=uuid.uuid4(), csrf_hash="hash",
            )
            with self.database.connection() as connection:
                connection.execute(
                    "INSERT INTO usuarios (id, email, nome_exibicao, senha_hash, papel_plataforma) VALUES (%s, %s, %s, 'hash', %s)",
                    (pessoa.id, email, nome, plataforma),
                )
                if papel == "mestre":
                    connection.execute("INSERT INTO campanhas (id, dono_id, nome) VALUES (%s, %s, 'Mesa')", (self.campanha_id, pessoa.id))
                connection.execute(
                    "INSERT INTO membros_campanha (campanha_id, usuario_id, papel) VALUES (%s, %s, %s)",
                    (self.campanha_id, pessoa.id, papel),
                )
            return pessoa

        self.mestre = usuario("tempo-mestre@example.com", "Mestre", "mestre", plataforma="mestre")
        self.ana = usuario("tempo-ana@example.com", "Ana", "jogador")
        with self.database.connection() as connection:
            connection.execute(
                "INSERT INTO sessoes_mesa (id, campanha_id, status, titulo, aberta_por) VALUES (%s, %s, 'aberta', 'Noite 1', %s)",
                (uuid.uuid4(), self.campanha_id, self.mestre.id),
            )

    def tearDown(self):
        self.database.close()
        with psycopg.connect(TEST_DSN, autocommit=True) as connection:
            connection.execute(sql.SQL("DROP SCHEMA IF EXISTS {} CASCADE").format(sql.Identifier(self.schema)))

    def test_mapa_traz_a_hora_e_esconde_a_data_com_o_calendario_oculto(self):
        from routers import calendario as rotas_calendario
        from routers import mapa as rotas

        rotas.criar_cena(self.campanha_id, rotas.CenaInput(nome="Estrada"), user=self.mestre, database=self.database)
        visto = rotas.obter_mapa(self.campanha_id, None, user=self.ana, database=self.database)
        self.assertEqual(visto["tempo"]["minuto"], 8 * 60)
        self.assertFalse(visto["tempo"]["em_uso"])
        rotas_calendario.avancar_tempo(
            self.campanha_id, rotas_calendario.AvancarTempoInput(minutos=10 * 60 + 15), user=self.mestre, database=self.database,
        )
        visto = rotas.obter_mapa(self.campanha_id, None, user=self.ana, database=self.database)
        self.assertEqual((visto["tempo"]["hora_extenso"], visto["tempo"]["em_uso"]), ("18:15", True))
        self.assertIsNotNone(visto["tempo"]["data"])
        with self.database.connection() as connection:
            connection.execute("UPDATE campanhas SET configuracoes=%s WHERE id=%s", (Jsonb({"calendario_oculto": True}), self.campanha_id))
        visto = rotas.obter_mapa(self.campanha_id, None, user=self.ana, database=self.database)
        self.assertIsNone(visto["tempo"]["data"])
        self.assertEqual(visto["tempo"]["minuto"], 18 * 60 + 15)
        mestre = rotas.obter_mapa(self.campanha_id, None, user=self.mestre, database=self.database)
        self.assertIsNotNone(mestre["tempo"]["data"])

    def test_portais_gravados_recortados_para_o_jogador_e_travessia_pela_rota(self):
        from routers import mapa as rotas

        cena_id = uuid.UUID(rotas.criar_cena(self.campanha_id, rotas.CenaInput(nome="Torre"), user=self.mestre, database=self.database)["cena"]["id"])
        portais = [
            {"nome": "Arco", "a": {"x": 150, "y": 150}, "b": {"x": 850, "y": 650}},
            {"nome": "Alçapão", "a": {"x": 450, "y": 450}, "b": {"x": 50, "y": 50}, "visivel": False},
        ]
        resposta = rotas.mudar_portais(self.campanha_id, cena_id, rotas.PortaisInput(portais=portais), user=self.mestre, database=self.database)
        self.assertEqual([p["nome"] for p in resposta["cena"]["portais"]], ["Arco", "Alçapão"])
        visto = rotas.obter_mapa(self.campanha_id, None, user=self.ana, database=self.database)
        self.assertEqual([p["nome"] for p in visto["cena"]["portais"]], ["Arco"])
        with self.assertRaises(Exception):
            rotas.mudar_portais(self.campanha_id, cena_id, rotas.PortaisInput(portais=portais), user=self.ana, database=self.database)

        token = rotas.criar_token(self.campanha_id, cena_id, rotas.TokenInput(nome="Lobo", x=300, y=300), user=self.mestre, database=self.database)
        token_id = uuid.UUID(next(t["id"] for t in token["tokens"] if t["nome"] == "Lobo"))
        # O Mestre solta o lobo na armadilha escondida: ele cai do outro lado.
        movido = rotas.mover_token(self.campanha_id, token_id, rotas.PontoInput(x=450, y=450), user=self.mestre, database=self.database)
        self.assertEqual((movido["x"], movido["y"]), (50.0, 50.0))
        self.assertEqual(movido["travessia"]["de"], [450.0, 450.0])
        parado = rotas.mover_token(self.campanha_id, token_id, rotas.PontoInput(x=500, y=300), user=self.mestre, database=self.database)
        self.assertIsNone(parado["travessia"])
