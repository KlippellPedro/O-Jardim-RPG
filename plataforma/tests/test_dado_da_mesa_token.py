"""O dado público leva o token do personagem para o resultado subir flutuando sobre ele (routers/rolls.py).

Só roda com TEST_DATABASE_URL (Postgres descartável), nunca contra o banco de produção."""

from __future__ import annotations

import os
import unittest
import uuid
from unittest import mock

import psycopg
from psycopg import sql
from psycopg.conninfo import make_conninfo

TEST_DSN = (os.getenv("TEST_DATABASE_URL") or "").strip()


@unittest.skipUnless(TEST_DSN, "TEST_DATABASE_URL nao configurada")
class DadoDaMesaTokenTests(unittest.TestCase):
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
        self.ana = AuthenticatedUser(
            id=uuid.uuid4(), email="dado-ana@example.com", nome_exibicao="Ana", admin_plataforma=False,
            papel_plataforma="player", session_id=uuid.uuid4(), csrf_hash="hash",
        )
        mestre_id = uuid.uuid4()
        self.personagem, self.token, self.cena = uuid.uuid4(), uuid.uuid4(), uuid.uuid4()
        with self.database.connection() as connection:
            for pessoa_id, email, nome in ((mestre_id, "dado-mestre@example.com", "Mestre"), (self.ana.id, "dado-ana@example.com", "Ana")):
                connection.execute("INSERT INTO usuarios (id, email, nome_exibicao, senha_hash, papel_plataforma) VALUES (%s, %s, %s, 'hash', 'player')", (pessoa_id, email, nome))
            connection.execute("INSERT INTO campanhas (id, dono_id, nome) VALUES (%s, %s, 'Mesa')", (self.campanha_id, mestre_id))
            connection.execute("INSERT INTO membros_campanha (campanha_id, usuario_id, papel) VALUES (%s, %s, 'mestre')", (self.campanha_id, mestre_id))
            connection.execute("INSERT INTO membros_campanha (campanha_id, usuario_id, papel) VALUES (%s, %s, 'jogador')", (self.campanha_id, self.ana.id))
            connection.execute("INSERT INTO sessoes_mesa (id, campanha_id, status, titulo, aberta_por) VALUES (%s, %s, 'aberta', 'x', %s)", (uuid.uuid4(), self.campanha_id, mestre_id))
            connection.execute("INSERT INTO mapa_cenas (id, campanha_id, nome, largura, altura, ativa) VALUES (%s, %s, 'Sala', 1000, 800, TRUE)", (self.cena, self.campanha_id))
            connection.execute("INSERT INTO personagens (id, campanha_id, dono_usuario_id, criado_por, nome) VALUES (%s, %s, %s, %s, 'Mira')", (self.personagem, self.campanha_id, self.ana.id, self.ana.id))
            connection.execute("INSERT INTO mapa_tokens (id, cena_id, personagem_id, x, y, lado) VALUES (%s, %s, %s, 100, 100, 'jogador')", (self.token, self.cena, self.personagem))

    def tearDown(self):
        self.database.close()
        with psycopg.connect(TEST_DSN, autocommit=True) as connection:
            connection.execute(sql.SQL("DROP SCHEMA IF EXISTS {} CASCADE").format(sql.Identifier(self.schema)))

    def _rolar(self, **extra):
        from routers import rolls
        from schemas import RollInput

        with mock.patch.object(rolls.live_session, "publicar") as publicar:
            rolls.rolar(
                RollInput(campanha_id=self.campanha_id, personagem_id=self.personagem, titulo="Ataque", bonus=3, **extra),
                user=self.ana, database=self.database,
            )
        return {chamada.args[1]: chamada.args[3] for chamada in publicar.call_args_list if len(chamada.args) >= 4}

    def test_o_dado_publico_leva_o_token_do_personagem_na_cena_da_mesa(self):
        eventos = self._rolar(publica=True)
        self.assertEqual(eventos["dado_mesa"]["token_id"], str(self.token))
        self.assertEqual(eventos["dado_mesa"]["usuario_id"], str(self.ana.id))

    def test_sem_token_na_cena_da_mesa_o_dado_vai_sem_token(self):
        with self.database.connection() as connection:
            connection.execute("UPDATE mapa_cenas SET ativa=FALSE WHERE id=%s", (self.cena,))
        self.assertIsNone(self._rolar(publica=True)["dado_mesa"]["token_id"])

    def test_dado_nao_publico_nao_avisa_a_mesa(self):
        self.assertNotIn("dado_mesa", self._rolar(publica=False))
