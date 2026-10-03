"""Convites de plataforma na tela do Criador: gerar com nota, listar os ativos,
ver usados/revogados quando pedido e revogar. Só roda com TEST_DATABASE_URL."""

from __future__ import annotations

import os
import unittest
import uuid

import psycopg
from fastapi import HTTPException
from psycopg import sql
from psycopg.conninfo import make_conninfo

from core.database import Database
from core.dependencies import AuthenticatedUser
from routers.admin import create_platform_invite, list_platform_invites, revoke_platform_invite
from schemas import PlatformInviteCreateInput

TEST_DSN = (os.getenv("TEST_DATABASE_URL") or "").strip()


@unittest.skipUnless(TEST_DSN, "TEST_DATABASE_URL nao configurada")
class ConvitesPlataformaTests(unittest.TestCase):
    def setUp(self):
        if TEST_DSN == (os.getenv("DATABASE_URL") or "").strip():
            self.fail("TEST_DATABASE_URL nao pode ser o banco de producao")
        self.schema = f"jardim_test_{uuid.uuid4().hex}"
        with psycopg.connect(TEST_DSN, autocommit=True) as connection:
            connection.execute(sql.SQL("CREATE SCHEMA {}").format(sql.Identifier(self.schema)))
        self.database = Database(make_conninfo(TEST_DSN, options=f"-c search_path={self.schema}"))
        self.database.open()
        criador_id = uuid.uuid4()
        with self.database.connection() as connection:
            connection.execute(
                "INSERT INTO usuarios (id, email, nome_exibicao, senha_hash, papel_plataforma) VALUES (%s, 'criador@example.com', 'Criador', 'hash', 'criador')",
                (criador_id,),
            )
        self.criador = AuthenticatedUser(
            id=criador_id, email="criador@example.com", nome_exibicao="Criador", admin_plataforma=False,
            papel_plataforma="criador", session_id=uuid.uuid4(), csrf_hash="hash",
        )

    def tearDown(self):
        self.database.close()
        with psycopg.connect(TEST_DSN, autocommit=True) as connection:
            connection.execute(sql.SQL("DROP SCHEMA IF EXISTS {} CASCADE").format(sql.Identifier(self.schema)))

    def _gerar(self, nota="", usos=1):
        return create_platform_invite(
            PlatformInviteCreateInput(expira_em_dias=7, max_usos=usos, nota=nota),
            actor=self.criador, database=self.database,
        )

    def test_gera_com_nota_e_lista_so_os_ativos_por_padrao(self):
        novo = self._gerar(nota="  Marina,   mesa de sexta ", usos=2)
        self.assertGreaterEqual(len(novo["codigo"]), 16)
        self.assertEqual(novo["nota"], "Marina, mesa de sexta")
        usado = self._gerar(nota="Tiago")
        with self.database.connection() as connection:
            connection.execute("UPDATE convites_plataforma SET usos=1 WHERE id=%s", (usado["id"],))

        ativos = list_platform_invites(todos=False, user=self.criador, database=self.database)["convites"]
        self.assertEqual([(c["nota"], c["situacao"]) for c in ativos], [("Marina, mesa de sexta", "ativo")])
        self.assertNotIn("codigo_hash", ativos[0])

        todos = list_platform_invites(todos=True, user=self.criador, database=self.database)["convites"]
        self.assertEqual({c["nota"]: c["situacao"] for c in todos}, {"Marina, mesa de sexta": "ativo", "Tiago": "usado"})

    def test_revogar_tira_da_lista_de_ativos_e_marca_como_revogado(self):
        novo = self._gerar(nota="Duda")
        revoke_platform_invite(novo["id"], actor=self.criador, database=self.database)
        self.assertEqual(list_platform_invites(todos=False, user=self.criador, database=self.database)["convites"], [])
        todos = list_platform_invites(todos=True, user=self.criador, database=self.database)["convites"]
        self.assertEqual(todos[0]["situacao"], "revogado")
        with self.assertRaises(HTTPException):
            revoke_platform_invite(novo["id"], actor=self.criador, database=self.database)


if __name__ == "__main__":
    unittest.main()
