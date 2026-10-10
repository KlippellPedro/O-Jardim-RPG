"""A situação da mesa (menu e Home): ao vivo, em preparação ou nenhuma, contra Postgres real.

Só roda com TEST_DATABASE_URL (Docker Postgres de teste), nunca contra o banco de produção."""

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
from routers.sessions import abrir_sessao, encerrar_sessao, publicar_sessao, situacao_da_mesa
from schemas import SessionOpenInput


TEST_DSN = (os.getenv("TEST_DATABASE_URL") or "").strip()


def _ator(usuario_id, email, nome):
    return AuthenticatedUser(
        id=usuario_id, email=email, nome_exibicao=nome, admin_plataforma=False,
        papel_plataforma="player", session_id=uuid.uuid4(), csrf_hash="hash",
    )


@unittest.skipUnless(TEST_DSN, "TEST_DATABASE_URL nao configurada")
class SituacaoDaMesaTests(unittest.TestCase):
    def setUp(self):
        if TEST_DSN == (os.getenv("DATABASE_URL") or "").strip():
            self.fail("TEST_DATABASE_URL nao pode ser o banco de producao")
        self.schema = f"jardim_test_{uuid.uuid4().hex}"
        with psycopg.connect(TEST_DSN, autocommit=True) as connection:
            connection.execute(sql.SQL("CREATE SCHEMA {}").format(sql.Identifier(self.schema)))
        self.database = Database(make_conninfo(TEST_DSN, options=f"-c search_path={self.schema}"))
        self.database.open()
        self.campanha_id = uuid.uuid4()
        mestre_id, jogador_id, estranho_id = uuid.uuid4(), uuid.uuid4(), uuid.uuid4()
        with self.database.connection() as connection:
            for usuario_id, email, nome in (
                (mestre_id, "situacao-mestre@example.com", "Mestre"),
                (jogador_id, "situacao-jogador@example.com", "Jogador"),
                (estranho_id, "situacao-estranho@example.com", "Estranho"),
            ):
                connection.execute(
                    "INSERT INTO usuarios (id, email, nome_exibicao, senha_hash, papel_plataforma) VALUES (%s, %s, %s, 'hash', 'player')",
                    (usuario_id, email, nome),
                )
            connection.execute("INSERT INTO campanhas (id, dono_id, nome) VALUES (%s, %s, 'Mesa')", (self.campanha_id, mestre_id))
            connection.execute(
                "INSERT INTO membros_campanha (campanha_id, usuario_id, papel) VALUES (%s, %s, 'mestre'), (%s, %s, 'jogador')",
                (self.campanha_id, mestre_id, self.campanha_id, jogador_id),
            )
        self.mestre = _ator(mestre_id, "situacao-mestre@example.com", "Mestre")
        self.jogador = _ator(jogador_id, "situacao-jogador@example.com", "Jogador")
        self.estranho = _ator(estranho_id, "situacao-estranho@example.com", "Estranho")

    def tearDown(self):
        self.database.close()
        with psycopg.connect(TEST_DSN, autocommit=True) as connection:
            connection.execute(sql.SQL("DROP SCHEMA IF EXISTS {} CASCADE").format(sql.Identifier(self.schema)))

    def _situacao(self, ator):
        return situacao_da_mesa(self.campanha_id, user=ator, database=self.database)

    def _preparar(self, titulo="Noite no Jardim"):
        estado = abrir_sessao(
            SessionOpenInput(campanha_id=self.campanha_id, titulo=titulo),
            user=self.mestre, database=self.database,
        )
        return estado["sessao"]["id"]

    def test_sem_sessao_ninguem_ve_mesa_nenhuma(self):
        for ator in (self.mestre, self.jogador):
            resposta = self._situacao(ator)
            self.assertEqual(resposta["situacao"], "nenhuma")
            self.assertIsNone(resposta["titulo"])

    def test_preparacao_aparece_so_para_quem_comanda(self):
        self._preparar("Segredo do Mestre")

        mestre = self._situacao(self.mestre)
        self.assertEqual(mestre["situacao"], "preparacao")
        self.assertEqual(mestre["titulo"], "Segredo do Mestre")
        self.assertIsNone(mestre["iniciada_em"])

        jogador = self._situacao(self.jogador)
        self.assertEqual(jogador, {"situacao": "nenhuma", "titulo": None, "iniciada_em": None})
        self.assertNotIn("Segredo do Mestre", str(jogador))

    def test_ao_vivo_aparece_para_todos_os_membros(self):
        sessao_id = self._preparar("Mesa aberta")
        publicar_sessao(uuid.UUID(str(sessao_id)), user=self.mestre, database=self.database)

        for ator in (self.mestre, self.jogador):
            resposta = self._situacao(ator)
            self.assertEqual(resposta["situacao"], "aberta")
            self.assertEqual(resposta["titulo"], "Mesa aberta")
            self.assertIsNotNone(resposta["iniciada_em"])

    def test_encerrar_volta_para_nenhuma(self):
        sessao_id = self._preparar()
        publicar_sessao(uuid.UUID(str(sessao_id)), user=self.mestre, database=self.database)
        encerrar_sessao(uuid.UUID(str(sessao_id)), user=self.mestre, database=self.database)

        self.assertEqual(self._situacao(self.jogador)["situacao"], "nenhuma")
        self.assertEqual(self._situacao(self.mestre)["situacao"], "nenhuma")

    def test_quem_nao_e_da_campanha_nao_ve_nada(self):
        sessao_id = self._preparar()
        publicar_sessao(uuid.UUID(str(sessao_id)), user=self.mestre, database=self.database)

        with self.assertRaises(HTTPException) as erro:
            self._situacao(self.estranho)
        self.assertIn(erro.exception.status_code, (403, 404))


if __name__ == "__main__":
    unittest.main()
