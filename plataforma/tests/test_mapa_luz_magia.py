"""Luz dos tokens e efeitos de magia do mapa (core/mapa.py, core/tempo_real.py, routers/mapa.py)."""

from __future__ import annotations

import asyncio
import json
import os
import unittest
import uuid

import pytest

from core import mapa, tempo_real
from core.mapa import Espectador, ErroMapa

ANA = Espectador(usuario_id="ana", gestor=False, personagens=frozenset({"p-ana"}))


# ------------------------------------------------------------------- luz

def test_luz_confere_raio_e_cor_e_none_tira_a_luz():
    assert mapa.normalizar_luz(None) is None
    assert mapa.normalizar_luz({}) == {"raio": 4.0, "cor": "#ffb35c", "tremula": False, "estilo": "fixa"}
    assert mapa.normalizar_luz({"raio": 2.26, "cor": "#AABBCC", "tremula": 1}) == {"raio": 2.3, "cor": "#aabbcc", "tremula": True, "estilo": "chama"}
    for ruim in ({"raio": 0}, {"raio": mapa.LUZ_MAXIMA_CASAS + 1}, {"cor": "laranja"}, {"raio": float("nan")}, "tocha", {"estilo": "disco"}, {"estilo": 3}):
        with pytest.raises(ErroMapa):
            mapa.normalizar_luz(ruim)


def test_luz_tem_estilo_e_o_campo_antigo_continua_valendo():
    for estilo in ("fixa", "chama", "pulsa", "cintila"):
        luz = mapa.normalizar_luz({"raio": 3, "cor": "#9ecbff", "estilo": estilo})
        assert luz["estilo"] == estilo
        assert luz["tremula"] is (estilo != "fixa"), "tremula acompanha o estilo para quem ainda lê só ele"
    # O estilo manda sobre o campo antigo.
    assert mapa.normalizar_luz({"tremula": True, "estilo": "fixa"})["tremula"] is False
    assert mapa.normalizar_luz({"tremula": False, "estilo": "pulsa"})["tremula"] is True
    assert mapa.ESTILOS_DE_LUZ == ("fixa", "chama", "pulsa", "cintila")


def test_quem_ve_o_token_ve_a_luz_dele_mesmo_sem_saber_quem_e():
    token = {"id": "t1", "x": 10.0, "y": 10.0, "porte": 1, "lado": "inimigo", "oculto": False, "barras": {},
             "personagem_id": None, "participante_id": None, "imagem_id": None, "nome": "Lobo",
             "luz": {"raio": 4.0, "cor": "#ff9a3c", "tremula": True}}
    participante = {"id": "pa1", "personagem_id": None, "nome": "Lobo", "tipo": "inimigo", "visibilidade": "desconhecido"}
    visto = mapa.visao_token(token, participante, ANA, livre=False)
    assert visto["desconhecido"] and visto["luz"] == {"raio": 4.0, "cor": "#ff9a3c", "tremula": True}
    assert mapa.visao_token({**token, "luz": None}, None, ANA, livre=False)["luz"] is None


# ----------------------------------------------------------------- magia

def test_magia_confere_forma_fluxo_e_lugar():
    magia = mapa.normalizar_magia({"forma": "cone", "fluxo": "fim", "x": 100.04, "y": 200, "ax": 400, "ay": -50, "lixo": 1}, 1000, 800)
    assert magia == {"forma": "cone", "fluxo": "fim", "x": 100.0, "y": 200.0, "ax": 400.0, "ay": -50.0}
    base = {"forma": "circulo", "fluxo": "vazio", "x": 1, "y": 1, "ax": 2, "ay": 2}
    for ruim in ({**base, "forma": "meteoro"}, {**base, "fluxo": "fogo"}, {**base, "x": float("inf")},
                 {**base, "ax": 1000 + mapa.FOLGA_MAGIA + 1}, {**base, "y": None}, []):
        with pytest.raises(ErroMapa):
            mapa.normalizar_magia(ruim, 1000, 800)


def _conexao(usuario, gestor=False):
    return tempo_real.Conexao(usuario_id=usuario, nome=usuario.title(), gestor=gestor)


def _mensagens(conexao):
    return [m for m in (json.loads(t) for t in conexao.tirar_agora()) if m["t"] != "presenca"]


def test_magia_chega_a_mesa_inteira_com_o_nome_de_quem_lancou_e_tem_freio():
    async def cenario():
        tempo_real._limpar_para_testes()
        mestre, ana, bruno = _conexao("m", gestor=True), _conexao("ana"), _conexao("bruno")
        for c in (mestre, ana, bruno):
            tempo_real.entrar("camp", c)
            _mensagens(c)
        regras = tempo_real.Regras(cena_id="c1", livre=False, largura=1000, altura=1000, tokens={})

        async def carregar():
            return regras

        magia = {"t": "magia", "forma": "circulo", "fluxo": "espaco", "x": 100, "y": 100, "ax": 300, "ay": 100}
        assert await tempo_real.processar("camp", ana, magia, carregar, None) is None
        for outro in (mestre, bruno):
            recebida = _mensagens(outro)
            assert len(recebida) == 1
            assert recebida[0]["t"] == "magia" and recebida[0]["nome"] == "Ana" and recebida[0]["fluxo"] == "espaco"
        assert _mensagens(ana) == []

        erro = await tempo_real.processar("camp", ana, {**magia, "forma": "meteoro"}, carregar, None)
        assert erro["t"] == "erro"

        # No máximo três por janela: a quarta não chega a ninguém.
        tempo_real._limpar_para_testes()
        for c in (mestre, ana):
            tempo_real.entrar("camp", c)
        lancadora = _conexao("lia")
        tempo_real.entrar("camp", lancadora)
        _mensagens(mestre)
        for _ in range(tempo_real.MAGIAS_POR_JANELA + 1):
            await tempo_real.processar("camp", lancadora, magia, carregar, None)
        assert len([m for m in _mensagens(mestre) if m["t"] == "magia"]) == tempo_real.MAGIAS_POR_JANELA

    asyncio.run(cenario())


# ------------------------------------------------------------ com banco

TEST_DSN = (os.getenv("TEST_DATABASE_URL") or "").strip()


@unittest.skipUnless(TEST_DSN, "TEST_DATABASE_URL nao configurada")
class LuzNoBancoTests(unittest.TestCase):
    """O dono acende a luz do próprio token; o Mestre, a de qualquer um; ela chega a quem vê o token."""

    def setUp(self):
        from tests.test_mapa_banco import MapaBancoTests

        self.base = MapaBancoTests(methodName="setUp")
        self.base.setUp()

    def tearDown(self):
        self.base.tearDown()

    def test_dono_e_mestre_acendem_a_luz_e_a_mesa_ve(self):
        from fastapi import HTTPException

        from routers import mapa as rotas

        b = self.base
        b._sessao("aberta")
        cena_id = uuid.UUID(b.criar_cena()["cena"]["id"])
        rotas.criar_token(b.campanha_id, cena_id, rotas.TokenInput(personagem_id=b.mira, x=150, y=150), user=b.mestre, database=b.database)
        rotas.criar_token(b.campanha_id, cena_id, rotas.TokenInput(nome="Brasa", x=450, y=150), user=b.mestre, database=b.database)
        por_nome = {t["nome"]: t["id"] for t in b.ver(b.mestre)["tokens"]}
        mira, brasa = uuid.UUID(por_nome["Mira"]), uuid.UUID(por_nome["Brasa"])

        rotas.editar_token(b.campanha_id, mira, rotas.TokenEdicao(luz={"raio": 4, "cor": "#ff9a3c", "tremula": True}), user=b.ana, database=b.database)
        visto = {t["nome"]: t for t in b.ver(b.bruno)["tokens"]}
        self.assertEqual(visto["Mira"]["luz"], {"raio": 4.0, "cor": "#ff9a3c", "tremula": True, "estilo": "chama"})

        with self.assertRaises(HTTPException) as erro:
            rotas.editar_token(b.campanha_id, brasa, rotas.TokenEdicao(luz={"raio": 2}), user=b.ana, database=b.database)
        self.assertEqual(erro.exception.status_code, 403)
        with self.assertRaises(HTTPException) as erro:
            rotas.editar_token(b.campanha_id, brasa, rotas.TokenEdicao(luz={"cor": "vermelho"}), user=b.mestre, database=b.database)
        self.assertEqual(erro.exception.status_code, 422)

        rotas.editar_token(b.campanha_id, brasa, rotas.TokenEdicao(luz={"raio": 1.5, "cor": "#ff5e2b"}), user=b.mestre, database=b.database)
        rotas.editar_token(b.campanha_id, mira, rotas.TokenEdicao(sem_luz=True), user=b.ana, database=b.database)
        visto = {t["nome"]: t for t in b.ver(b.ana)["tokens"]}
        self.assertIsNone(visto["Mira"]["luz"])
        self.assertEqual(visto["Brasa"]["luz"]["raio"], 1.5)


def test_magia_do_mestre_toda_na_nevoa_fica_entre_quem_comanda():
    import asyncio

    from core import nevoa, tempo_real

    async def cenario():
        tempo_real._limpar_para_testes()
        mestre, assistente, ana = (tempo_real.Conexao(usuario_id=u, nome=u, gestor=g) for u, g in (("m", True), ("a", True), ("ana", False)))
        for c in (mestre, assistente, ana):
            tempo_real.entrar("camp", c)
        for c in (mestre, assistente, ana):
            c.tirar_agora()
        cobertura = nevoa.Nevoa([nevoa.normalizar_forma({"op": "revelar", "tipo": "retangulo", "x": 0, "y": 0, "w": 500, "h": 500}, 2000, 2000)])
        regras = tempo_real.Regras(cena_id="c1", livre=False, largura=2000, altura=2000, tokens={}, nevoa=cobertura)

        async def carregar():
            return regras

        na_nevoa = {"t": "magia", "forma": "circulo", "fluxo": "fim", "x": 1500, "y": 1500, "ax": 1600, "ay": 1500}
        await tempo_real.processar("camp", mestre, na_nevoa, carregar, None)
        assert [m for m in ana.tirar_agora()] == []
        assert len(assistente.tirar_agora()) == 1
        # Com a ponta numa área revelada, a mesa inteira vê; a magia da jogadora vai sempre para todos.
        await tempo_real.processar("camp", mestre, {**na_nevoa, "ax": 300, "ay": 300}, carregar, None)
        assert len(ana.tirar_agora()) == 1
        await tempo_real.processar("camp", ana, na_nevoa, carregar, None)
        assert len(mestre.tirar_agora()) == 1

    asyncio.run(cenario())
