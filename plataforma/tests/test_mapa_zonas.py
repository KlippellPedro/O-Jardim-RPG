"""Zonas de terreno contra Postgres real (routers/mapa_zonas.py): quem recebe o quê."""

from __future__ import annotations

import os
import unittest
import uuid

import psycopg
from fastapi import HTTPException
from psycopg import sql
from psycopg.conninfo import make_conninfo

from core import tempo_real

TEST_DSN = (os.getenv("TEST_DATABASE_URL") or "").strip()


@unittest.skipUnless(TEST_DSN, "TEST_DATABASE_URL nao configurada")
class ZonasBancoTests(unittest.TestCase):
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
                connection.execute(
                    "INSERT INTO usuarios (id, email, nome_exibicao, senha_hash, papel_plataforma) VALUES (%s, %s, %s, 'hash', %s)",
                    (pessoa.id, email, nome, plataforma),
                )
                if papel == "mestre":
                    connection.execute("INSERT INTO campanhas (id, dono_id, nome) VALUES (%s, %s, 'Mesa')", (self.campanha_id, pessoa.id))
                connection.execute("INSERT INTO membros_campanha (campanha_id, usuario_id, papel) VALUES (%s, %s, %s)", (self.campanha_id, pessoa.id, papel))
            return pessoa

        self.mestre = usuario("zona-mestre@example.com", "Mestre", "mestre", plataforma="mestre")
        self.ana = usuario("zona-ana@example.com", "Ana", "jogador")
        with self.database.connection() as connection:
            connection.execute("INSERT INTO sessoes_mesa (id, campanha_id, status, titulo, aberta_por) VALUES (%s, %s, 'aberta', 'x', %s)", (uuid.uuid4(), self.campanha_id, self.mestre.id))
            connection.execute("INSERT INTO mapa_cenas (id, campanha_id, nome, largura, altura, ativa) VALUES (%s, %s, 'Cripta', 2000, 1500, TRUE)", (self.cena, self.campanha_id))

    def tearDown(self):
        tempo_real._limpar_para_testes()
        self.database.close()
        with psycopg.connect(TEST_DSN, autocommit=True) as connection:
            connection.execute(sql.SQL("DROP SCHEMA IF EXISTS {} CASCADE").format(sql.Identifier(self.schema)))

    def _zonas(self, quem):
        from routers import mapa as rotas

        return rotas.obter_mapa(self.campanha_id, None, user=quem, database=self.database)["cena"]["zonas"]

    def test_o_mestre_ve_tudo_e_o_jogador_so_o_terreno_a_vista(self):
        from routers import mapa_zonas as rotas

        rotas.mudar_zonas(self.campanha_id, self.cena, rotas.ZonasInput(zonas=[
            {"id": "a", "nome": "Muro baixo", "x": 100, "y": 100, "w": 300, "h": 40, "cobertura": "superior"},
            {"id": "b", "nome": "Laje oca", "x": 500, "y": 500, "w": 100, "h": 100, "gatilho": {"texto_pisador": "Cede!", "armadilha": 1}},
            {"id": "c", "nome": "Poça de óleo", "x": 800, "y": 800, "w": 200, "h": 100, "terreno": {"rotulo": "molhado"}},
            {"id": "d", "nome": "Veneno escondido", "x": 900, "y": 100, "w": 100, "h": 100, "terreno": {"rotulo": "veneno", "visivel": False}},
        ]), user=self.mestre, database=self.database)
        do_mestre = self._zonas(self.mestre)
        self.assertEqual([z["id"] for z in do_mestre], ["a", "b", "c", "d"])
        self.assertEqual(do_mestre[0]["cobertura"], "superior")
        da_ana = self._zonas(self.ana)
        self.assertEqual([z["id"] for z in da_ana], ["c"], "a jogadora só recebe o terreno à vista")
        self.assertEqual(da_ana[0]["terreno"]["rotulo"], "molhado")
        self.assertIsNone(da_ana[0]["cobertura"])
        self.assertIsNone(da_ana[0]["gatilho"])

    def test_so_o_mestre_muda_e_a_lista_errada_e_recusada(self):
        from routers import mapa_zonas as rotas

        with self.assertRaises(HTTPException) as erro:
            rotas.mudar_zonas(self.campanha_id, self.cena, rotas.ZonasInput(zonas=[]), user=self.ana, database=self.database)
        self.assertEqual(erro.exception.status_code, 403)
        for ruim in ({"nome": "x", "x": 1, "y": 1, "w": 10, "h": 10, "cobertura": "total"}, {"nome": "x", "x": "a", "y": 1, "w": 10, "h": 10}):
            with self.assertRaises(HTTPException) as erro:
                rotas.mudar_zonas(self.campanha_id, self.cena, rotas.ZonasInput(zonas=[ruim]), user=self.mestre, database=self.database)
            self.assertEqual(erro.exception.status_code, 422)
        self.assertEqual(self._zonas(self.mestre), [])

    def test_apagar_tudo_e_rearmar_funcionam(self):
        from routers import mapa_zonas as rotas

        rotas.mudar_zonas(self.campanha_id, self.cena, rotas.ZonasInput(zonas=[{"id": "a", "x": 1, "y": 1, "w": 50, "h": 50, "terreno": {"rotulo": "lama"}}]), user=self.mestre, database=self.database)
        self.assertEqual(len(self._zonas(self.mestre)), 1)
        self.assertEqual(rotas.rearmar_zonas(self.campanha_id, self.cena, rotas.RearmarInput(), user=self.mestre, database=self.database), {"ok": True})
        with self.assertRaises(HTTPException):
            rotas.rearmar_zonas(self.campanha_id, self.cena, rotas.RearmarInput(), user=self.ana, database=self.database)
        rotas.mudar_zonas(self.campanha_id, self.cena, rotas.ZonasInput(zonas=[]), user=self.mestre, database=self.database)
        self.assertEqual(self._zonas(self.mestre), [])
