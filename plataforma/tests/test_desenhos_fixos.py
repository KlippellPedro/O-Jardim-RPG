"""Desenhos fixos do Mestre: as contas (core/desenhos_fixos.py) e quem recebe o quê (routers/mapa_desenhos.py).

As contas rodam sempre; a parte com Postgres só roda com TEST_DATABASE_URL (descartável), nunca contra o banco de produção."""

from __future__ import annotations

import os
import unittest
import uuid

import psycopg
import pytest
from fastapi import HTTPException
from psycopg import sql
from psycopg.conninfo import make_conninfo

from core import desenhos_fixos as d
from core import tempo_real

TEST_DSN = (os.getenv("TEST_DATABASE_URL") or "").strip()
L, A = 2000, 1500


def test_o_desenho_novo_e_conferido_e_ganha_um_id_proprio():
    desenho = d.novo({"forma": "seta", "pontos": [[10, 20], [300.55, 400]], "cor": "#aabbcc"}, L, A)
    assert desenho["forma"] == "seta" and desenho["cor"] == "#aabbcc" and desenho["publico"] is True
    assert desenho["pontos"] == [[10.0, 20.0], [300.6, 400.0]] and len(desenho["id"]) == 12
    assert d.novo({"forma": "linha", "pontos": [[1, 1], [2, 2]], "cor": "vermelho"}, L, A)["cor"] == d.COR_PADRAO
    assert d.novo({"forma": "linha", "pontos": [[1, 1], [2, 2]], "publico": False}, L, A)["publico"] is False
    for ruim in (None, "x", {"forma": "estrela", "pontos": [[1, 1], [2, 2]]}, {"forma": "seta", "pontos": [[1, 1]]}, {"forma": "seta", "pontos": [[1, "a"], [2, 2]]}):
        with pytest.raises(d.ErroDesenho):
            d.novo(ruim, L, A)


def test_o_jogador_so_recebe_o_que_o_mestre_deixou_a_mostra_e_sem_o_campo_publico():
    lista = [
        {**d.novo({"forma": "linha", "pontos": [[1, 1], [9, 9]]}, L, A), "id": "a"},
        {**d.novo({"forma": "circulo", "pontos": [[5, 5], [50, 50]], "publico": False}, L, A), "id": "b"},
    ]
    assert [x["id"] for x in d.desenhos_de(lista, gestor=True)] == ["a", "b"]
    visto = d.desenhos_de(lista, gestor=False)
    assert [x["id"] for x in visto] == ["a"] and "publico" not in visto[0]


def test_desenho_quebrado_no_banco_e_descartado_e_o_resto_fica():
    lido = d.ler_desenhos({"desenhos": [
        {"id": "ok", "forma": "linha", "pontos": [[1, 2], [3, 4]], "cor": "#112233", "publico": True},
        {"id": "ok", "forma": "linha", "pontos": [[1, 2], [3, 4]]}, {"id": "sem-forma", "pontos": [[1, 2], [3, 4]]},
        {"id": "um-ponto", "forma": "linha", "pontos": [[1, 2]]}, {"id": "texto", "forma": "linha", "pontos": [["a", 2], [3, 4]]}, 7,
    ]})
    assert [x["id"] for x in lido] == ["ok"]
    assert d.ler_desenhos(None) == [] and d.ler_desenhos({"desenhos": "lixo"}) == []


def test_o_limite_de_desenhos_e_apagar_um_que_nao_existe_e_recusado():
    lista = []
    for i in range(d.MAX_DESENHOS):
        lista = d.acrescentar(lista, {**d.novo({"forma": "linha", "pontos": [[1, 1], [2, 2]]}, L, A), "id": f"d{i}"})
    with pytest.raises(d.ErroDesenho):
        d.acrescentar(lista, d.novo({"forma": "linha", "pontos": [[1, 1], [2, 2]]}, L, A))
    assert len(d.apagar(lista, "d3")) == d.MAX_DESENHOS - 1
    with pytest.raises(d.ErroDesenho) as erro:
        d.apagar(lista, "nao-existe")
    assert erro.value.codigo == 404


@unittest.skipUnless(TEST_DSN, "TEST_DATABASE_URL nao configurada")
class DesenhosFixosBancoTests(unittest.TestCase):
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
        self.campanha_id, self.cena = uuid.uuid4(), uuid.uuid4()

        def usuario(email, nome, papel, plataforma="player"):
            pessoa = AuthenticatedUser(
                id=uuid.uuid4(), email=email, nome_exibicao=nome, admin_plataforma=False,
                papel_plataforma=plataforma, session_id=uuid.uuid4(), csrf_hash="hash",
            )
            with self.database.connection() as connection:
                connection.execute("INSERT INTO usuarios (id, email, nome_exibicao, senha_hash, papel_plataforma) VALUES (%s, %s, %s, 'hash', %s)", (pessoa.id, email, nome, plataforma))
                if papel == "mestre":
                    connection.execute("INSERT INTO campanhas (id, dono_id, nome) VALUES (%s, %s, 'Mesa')", (self.campanha_id, pessoa.id))
                connection.execute("INSERT INTO membros_campanha (campanha_id, usuario_id, papel) VALUES (%s, %s, %s)", (self.campanha_id, pessoa.id, papel))
            return pessoa

        self.mestre = usuario("desenho-mestre@example.com", "Mestre", "mestre", plataforma="mestre")
        self.ana = usuario("desenho-ana@example.com", "Ana", "jogador")
        with self.database.connection() as connection:
            connection.execute("INSERT INTO sessoes_mesa (id, campanha_id, status, titulo, aberta_por) VALUES (%s, %s, 'aberta', 'x', %s)", (uuid.uuid4(), self.campanha_id, self.mestre.id))
            connection.execute("INSERT INTO mapa_cenas (id, campanha_id, nome, largura, altura, ativa) VALUES (%s, %s, 'Mapa', 2000, 1500, TRUE)", (self.cena, self.campanha_id))

    def tearDown(self):
        tempo_real._limpar_para_testes()
        self.database.close()
        with psycopg.connect(TEST_DSN, autocommit=True) as connection:
            connection.execute(sql.SQL("DROP SCHEMA IF EXISTS {} CASCADE").format(sql.Identifier(self.schema)))

    def _desenhos(self, quem):
        from routers import mapa as rotas

        return rotas.obter_mapa(self.campanha_id, None, user=quem, database=self.database)["cena"]["desenhos"]

    def test_o_mestre_prende_e_apaga_e_o_jogador_so_ve_o_publico(self):
        from routers import mapa_desenhos as rotas

        publico = rotas.prender_desenho(self.campanha_id, self.cena, rotas.DesenhoFixoInput(forma="seta", pontos=[[100, 100], [400, 300]], cor="#ef4444"), user=self.mestre, database=self.database)
        rotas.prender_desenho(self.campanha_id, self.cena, rotas.DesenhoFixoInput(forma="circulo", pontos=[[800, 800], [900, 900]], publico=False), user=self.mestre, database=self.database)
        do_mestre = self._desenhos(self.mestre)
        self.assertEqual([x["forma"] for x in do_mestre], ["seta", "circulo"])
        self.assertEqual(self._desenhos(self.ana), [{"id": publico["cena"]["desenhos"][0]["id"], "forma": "seta", "pontos": [[100.0, 100.0], [400.0, 300.0]], "cor": "#ef4444"}])
        rotas.apagar_desenho(self.campanha_id, self.cena, do_mestre[0]["id"], user=self.mestre, database=self.database)
        self.assertEqual([x["forma"] for x in self._desenhos(self.mestre)], ["circulo"])
        rotas.limpar_desenhos(self.campanha_id, self.cena, user=self.mestre, database=self.database)
        self.assertEqual(self._desenhos(self.mestre), [])

    def test_jogador_nao_desenha_fixo_e_o_traco_ruim_vira_erro(self):
        from routers import mapa_desenhos as rotas

        with self.assertRaises(HTTPException) as erro:
            rotas.prender_desenho(self.campanha_id, self.cena, rotas.DesenhoFixoInput(forma="linha", pontos=[[1, 1], [2, 2]]), user=self.ana, database=self.database)
        self.assertEqual(erro.exception.status_code, 403)
        with self.assertRaises(HTTPException) as erro:
            rotas.prender_desenho(self.campanha_id, self.cena, rotas.DesenhoFixoInput(forma="estrela", pontos=[[1, 1], [2, 2]]), user=self.mestre, database=self.database)
        self.assertEqual(erro.exception.status_code, 422)
        with self.assertRaises(HTTPException) as erro:
            rotas.apagar_desenho(self.campanha_id, self.cena, "nao-existe", user=self.mestre, database=self.database)
        self.assertEqual(erro.exception.status_code, 404)
        with self.assertRaises(HTTPException) as erro:
            rotas.limpar_desenhos(self.campanha_id, self.cena, user=self.ana, database=self.database)
        self.assertEqual(erro.exception.status_code, 403)
