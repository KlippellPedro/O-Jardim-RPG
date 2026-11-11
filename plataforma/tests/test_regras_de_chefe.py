"""Regras de chefe na Sessão: Ímpeto, Determinação, Guarda e fases escritas pelo Mestre.

A parte pura (core/chefe.py, core/fases.py) roda sempre. O caminho inteiro pelas rotas
(adicionar, editar, virar turno, clicar no cartão) só roda com TEST_DATABASE_URL.
"""

from __future__ import annotations

import os
import unittest
import uuid

import psycopg
from fastapi import HTTPException
from psycopg import sql
from psycopg.conninfo import make_conninfo
from psycopg.types.json import Jsonb

from core import chefe as regras
from core.fases import fases_do_participante


def _linha(tipo, vida=10, visibilidade="total", chefe=None, maxima=10):
    return {"tipo": tipo, "vida_atual": vida, "vida_maxima": maxima, "visibilidade": visibilidade, "chefe": chefe}


class ChefeLimpoTest(unittest.TestCase):
    def test_lixo_vira_nada_e_vazio_vira_padrao(self):
        self.assertIsNone(regras.chefe_limpo(None))
        self.assertIsNone(regras.chefe_limpo("chefe"))
        padrao = regras.chefe_limpo({})
        self.assertTrue(padrao["impeto"])
        self.assertEqual(padrao["determinacao"], 1)
        self.assertEqual(padrao["guarda_partes"], 0)

    def test_guarda_so_aceita_quatro_a_seis(self):
        self.assertEqual(regras.chefe_limpo({"guarda_partes": 3})["guarda_partes"], 0)
        self.assertEqual(regras.chefe_limpo({"guarda_partes": 5, "guarda": 9})["guarda"], 4)
        self.assertEqual(regras.chefe_limpo({"guarda_partes": True})["guarda_partes"], 0)

    def test_quem_nasce_chefe(self):
        self.assertIsNotNone(regras.chefe_novo_para({"papel": "chefe"}))
        self.assertIsNotNone(regras.chefe_novo_para({"unico": True}))
        self.assertIsNotNone(regras.chefe_novo_para({"fases": [{"nome": "x"}]}))
        self.assertIsNone(regras.chefe_novo_para({"papel": "solo"}))
        self.assertIsNone(regras.chefe_novo_para(None))


class ImpetoTest(unittest.TestCase):
    def test_quatro_jogadores_contra_um_chefe_dao_tres(self):
        cena = [_linha("jogador")] * 4 + [_linha("inimigo", chefe={})]
        self.assertEqual(regras.impeto_da_cena(cena)["maximo"], 3)

    def test_capanga_ao_lado_tira_um_e_covil_tira_outro(self):
        cena = [_linha("jogador")] * 4 + [_linha("inimigo", chefe={}), _linha("inimigo")]
        self.assertEqual(regras.impeto_da_cena(cena)["maximo"], 2)
        cena = [_linha("jogador")] * 4 + [_linha("inimigo", chefe={"covil": True})]
        self.assertEqual(regras.impeto_da_cena(cena)["maximo"], 2)

    def test_caido_e_oculto_nao_contam(self):
        cena = [_linha("jogador"), _linha("jogador", vida=0), _linha("jogador"),
                _linha("inimigo", chefe={}), _linha("inimigo", visibilidade="oculto"), _linha("inimigo", vida=0)]
        self.assertEqual(regras.impeto_da_cena(cena)["maximo"], 1)

    def test_dois_chefes_dividem_um_bolso(self):
        cena = [_linha("jogador")] * 4 + [
            _linha("inimigo", chefe={"impeto_gasto": 1, "impeto_turno": "1:0"}),
            _linha("inimigo", chefe={"impeto_gasto": 0}),
        ]
        bolso = regras.impeto_da_cena(cena)
        self.assertEqual((bolso["maximo"], bolso["restante"]), (2, 1))
        self.assertEqual(bolso["turnos_usados"], {"1:0"})

    def test_sem_chefe_com_impeto_nao_ha_bolso(self):
        cena = [_linha("jogador")] * 4 + [_linha("inimigo", chefe={"impeto": False})]
        self.assertEqual(regras.impeto_da_cena(cena)["maximo"], 0)

    def test_um_ponto_por_turno_e_acaba(self):
        chefe = regras.chefe_limpo({})
        bolso = {"maximo": 2, "restante": 2, "turnos_usados": set()}
        chefe = regras.gastar_impeto(chefe, bolso, "1:0")
        with self.assertRaises(ValueError):
            regras.gastar_impeto(chefe, {"maximo": 2, "restante": 1, "turnos_usados": {"1:0"}}, "1:0")
        with self.assertRaises(ValueError):
            regras.gastar_impeto(chefe, {"maximo": 2, "restante": 0, "turnos_usados": set()}, "1:2")
        self.assertEqual(regras.encher_impeto(chefe)["impeto_gasto"], 0)


class DeterminacaoEGuardaTest(unittest.TestCase):
    def test_guarda_quebra_cheia_e_volta_a_zero(self):
        chefe = regras.chefe_limpo({"guarda_partes": 4, "guarda": 2})
        chefe, quebrou = regras.encher_guarda(chefe)
        self.assertEqual((chefe["guarda"], quebrou), (3, False))
        chefe, quebrou = regras.encher_guarda(chefe)
        self.assertEqual((chefe["guarda"], quebrou), (0, True))

    def test_determinacao_enche_a_guarda_e_nao_passa_de_fase(self):
        chefe = regras.chefe_limpo({"guarda_partes": 4})
        chefe, quebrou = regras.gastar_determinacao(chefe)
        self.assertEqual((chefe["determinacao"], chefe["guarda"], quebrou), (0, 1, False))
        with self.assertRaises(ValueError):
            regras.gastar_determinacao(chefe)
        self.assertEqual(regras.ao_subir_fase({**chefe, "determinacao": 0})["determinacao"], 1)
        self.assertEqual(regras.ao_subir_fase({**chefe, "determinacao": 1})["determinacao"], 1, "o que sobra não passa")

    def test_condicao_renova_o_prazo_sem_duplicar(self):
        condicoes = [{"nome": "exposto", "turnos": 3}, {"nome": "Caído", "turnos": None}]
        novas = regras.com_condicoes(condicoes, regras.EXPOSTO, regras.GUARDA_QUEBRADA)
        self.assertEqual([item["nome"] for item in novas], ["Caído", "Exposto", "Guarda quebrada"])
        self.assertEqual(novas[1]["turnos"], 1)


class FasesDoParticipanteTest(unittest.TestCase):
    catalogo = {"ogro": [{"nome": "Fúria", "quando": 0.5, "rodada": None, "anuncio": "", "mudancas": []}]}

    def test_as_do_mestre_mandam_e_vazio_quer_dizer_nenhuma(self):
        proprias = [{"nome": "Choro", "quando": 0.3}]
        self.assertEqual(fases_do_participante(proprias, "ogro", self.catalogo)[0]["nome"], "Choro")
        self.assertEqual(fases_do_participante([], "ogro", self.catalogo), [])
        self.assertEqual(fases_do_participante(None, "ogro", self.catalogo)[0]["nome"], "Fúria")
        self.assertEqual(fases_do_participante(None, None, self.catalogo), [])


TEST_DSN = (os.getenv("TEST_DATABASE_URL") or "").strip()


@unittest.skipUnless(TEST_DSN, "TEST_DATABASE_URL nao configurada")
class RegrasDeChefeNaSessaoE2E(unittest.TestCase):
    def setUp(self):
        from core.database import Database

        if TEST_DSN == (os.getenv("DATABASE_URL") or "").strip():
            self.fail("TEST_DATABASE_URL nao pode ser o banco de producao")
        self.schema = f"jardim_test_{uuid.uuid4().hex}"
        with psycopg.connect(TEST_DSN, autocommit=True) as connection:
            connection.execute(sql.SQL("CREATE SCHEMA {}").format(sql.Identifier(self.schema)))
        self.database = Database(make_conninfo(TEST_DSN, options=f"-c search_path={self.schema}"))
        self.database.open()

    def tearDown(self):
        self.database.close()
        with psycopg.connect(TEST_DSN, autocommit=True) as connection:
            connection.execute(sql.SQL("DROP SCHEMA IF EXISTS {} CASCADE").format(sql.Identifier(self.schema)))

    def _mesa(self):
        from core.dependencies import AuthenticatedUser
        from routers.sessions import abrir_sessao
        from schemas import SessionOpenInput

        mestre, campanha = uuid.uuid4(), uuid.uuid4()
        with self.database.connection() as connection:
            connection.execute(
                "INSERT INTO usuarios (id, email, nome_exibicao, senha_hash, papel_plataforma) "
                "VALUES (%s, 'mestre.chefe@jardim-teste.dev', 'Mestre', 'hash', 'player')",
                (mestre,),
            )
            connection.execute("INSERT INTO campanhas (id, dono_id, nome) VALUES (%s, %s, 'Mesa do Chefe')", (campanha, mestre))
            connection.execute(
                "INSERT INTO membros_campanha (campanha_id, usuario_id, papel) VALUES (%s, %s, 'mestre')",
                (campanha, mestre),
            )
            connection.execute(
                "INSERT INTO catalogo_itens (id, tipo, titulo, conteudo) VALUES ('rei-teste', 'monstro', 'Rei de Teste', %s)",
                (Jsonb({"papel": "chefe", "pv": 100}),),
            )
        actor = AuthenticatedUser(
            id=mestre, email="mestre.chefe@jardim-teste.dev", nome_exibicao="Mestre",
            admin_plataforma=False, papel_plataforma="mestre", session_id=uuid.uuid4(), csrf_hash="hash",
        )
        estado = abrir_sessao(SessionOpenInput(campanha_id=campanha, titulo="Chefe"), user=actor, database=self.database)
        return actor, estado["sessao"]["id"], campanha

    def _adicionar(self, sessao_id, actor, **campos):
        from routers.sessions import adicionar_participante
        from schemas import ParticipantCreateInput

        return adicionar_participante(sessao_id, ParticipantCreateInput(**campos), user=actor, database=self.database)["id"]

    def _estado(self, campanha, actor):
        from routers.sessions import obter_sessao

        return obter_sessao(campanha, user=actor, database=self.database)

    def test_caminho_inteiro(self):
        from routers.sessions import acao_de_chefe, atualizar_participante, controlar_turno
        from schemas import ChefeAcaoInput, ParticipantUpdateInput, SessionTurnInput

        actor, sessao_id, campanha = self._mesa()
        for nome, iniciativa in (("Ana", 30), ("Bia", 25), ("Caio", 20)):
            self._adicionar(sessao_id, actor, nome=nome, tipo="jogador", iniciativa=iniciativa, vida_maxima=20)
        rei = self._adicionar(sessao_id, actor, nome="Rei", tipo="inimigo", iniciativa=10, vida_maxima=100,
                              monstro_id="rei-teste", visibilidade="total")
        capanga = self._adicionar(sessao_id, actor, nome="Ninguém", tipo="inimigo", iniciativa=5, vida_maxima=10)

        # O chefe do Bestiário entra com as regras ligadas; a criatura feita à mão, não.
        with self.assertRaises(HTTPException) as erro:
            acao_de_chefe(sessao_id, capanga, ChefeAcaoInput(acao="encher_guarda"), user=actor, database=self.database)
        self.assertEqual(erro.exception.status_code, 409)

        # Fases escritas pelo Mestre numa criatura sem fases no Bestiário, e Guarda de 4.
        atualizar_participante(sessao_id, capanga, ParticipantUpdateInput(
            fases_proprias=[{"nome": "Desespero", "quando": 0.5, "anuncio": "Ele grita.", "mudancas": ["+2 no dano"]}],
            regras_chefe={"ativo": True, "impeto": False, "guarda_partes": 4},
        ), user=actor, database=self.database)

        controlar_turno(sessao_id, SessionTurnInput(acao="ordenar"), user=actor, database=self.database)
        controlar_turno(sessao_id, SessionTurnInput(acao="iniciar"), user=actor, database=self.database)
        estado = self._estado(campanha, actor)
        do_rei = next(item for item in estado["participantes"] if str(item["id"]) == str(rei))
        # 3 jogadores contra 2 inimigos em cena: 1 ponto.
        self.assertEqual((do_rei["chefe"]["impeto_maximo"], do_rei["chefe"]["impeto_restante"]), (1, 1))
        self.assertEqual(do_rei["chefe"]["determinacao"], 1)

        # Turno da Ana: um ponto sai; o segundo no mesmo turno não.
        acao_de_chefe(sessao_id, rei, ChefeAcaoInput(acao="gastar_impeto"), user=actor, database=self.database)
        with self.assertRaises(HTTPException):
            acao_de_chefe(sessao_id, rei, ChefeAcaoInput(acao="gastar_impeto"), user=actor, database=self.database)

        # Dano até metade sobe a fase escrita pelo Mestre e devolve a Determinação.
        acao_de_chefe(sessao_id, capanga, ChefeAcaoInput(acao="gastar_determinacao"), user=actor, database=self.database)
        atualizar_participante(sessao_id, capanga, ParticipantUpdateInput(dano=6), user=actor, database=self.database)
        estado = self._estado(campanha, actor)
        do_capanga = next(item for item in estado["participantes"] if str(item["id"]) == str(capanga))
        self.assertEqual(do_capanga["fase"], 2)
        self.assertEqual(do_capanga["fase_mudancas"], ["+2 no dano"])
        self.assertTrue(do_capanga["fases_proprias"])
        self.assertEqual(do_capanga["chefe"]["determinacao"], 1)
        self.assertEqual(do_capanga["chefe"]["guarda"], 1, "a Determinação gasta encheu uma parte")
        self.assertIn("Exposto", [item["nome"] for item in do_capanga["condicoes"]])

        # Mais três partes quebram a Guarda.
        for _ in range(3):
            resposta = acao_de_chefe(sessao_id, capanga, ChefeAcaoInput(acao="encher_guarda", motivo="critico"),
                                     user=actor, database=self.database)
        self.assertTrue(resposta["quebrou"])
        self.assertEqual(resposta["chefe"]["guarda"], 0)

        # Andar até o turno do Rei devolve o Ímpeto.
        for _ in range(3):
            controlar_turno(sessao_id, SessionTurnInput(acao="proximo"), user=actor, database=self.database)
        estado = self._estado(campanha, actor)
        do_rei = next(item for item in estado["participantes"] if str(item["id"]) == str(rei))
        self.assertEqual(do_rei["chefe"]["impeto_restante"], 1)

        # Voltar às fases do Bestiário (nenhuma, aqui) leva a criatura de volta à fase 1.
        atualizar_participante(sessao_id, capanga, ParticipantUpdateInput(restaurar_fases=True), user=actor, database=self.database)
        estado = self._estado(campanha, actor)
        do_capanga = next(item for item in estado["participantes"] if str(item["id"]) == str(capanga))
        self.assertNotIn("fase", do_capanga)
        self.assertFalse(do_capanga["fases_proprias"])


if __name__ == "__main__":
    unittest.main()
