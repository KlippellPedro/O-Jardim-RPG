"""O evento de turno diz de quem é a vez, para a ficha avisar "É a sua vez!".

Roda contra Postgres real (TEST_DATABASE_URL), nunca contra o banco de produção."""

from __future__ import annotations

import os
import unittest
import uuid
from unittest import mock

import psycopg
from psycopg import sql
from psycopg.conninfo import make_conninfo
from psycopg.types.json import Jsonb

from core.database import Database
from core.dependencies import AuthenticatedUser
from routers.sessions import abrir_sessao, controlar_turno
from schemas import SessionOpenInput, SessionTurnInput


TEST_DSN = (os.getenv("TEST_DATABASE_URL") or "").strip()


@unittest.skipUnless(TEST_DSN, "TEST_DATABASE_URL nao configurada")
class AvisoDeTurnoTests(unittest.TestCase):
    def setUp(self):
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

    def _mesa(self, email, nomes):
        usuario_id, campanha_id = uuid.uuid4(), uuid.uuid4()
        ids = []
        with self.database.connection() as connection:
            connection.execute(
                "INSERT INTO usuarios (id, email, nome_exibicao, senha_hash, papel_plataforma) VALUES (%s, %s, 'Mestre', 'hash', 'player')",
                (usuario_id, email),
            )
            connection.execute("INSERT INTO campanhas (id, dono_id, nome) VALUES (%s, %s, 'Mesa')", (campanha_id, usuario_id))
            connection.execute(
                "INSERT INTO membros_campanha (campanha_id, usuario_id, papel) VALUES (%s, %s, 'mestre')",
                (campanha_id, usuario_id),
            )
            for ordem, nome in enumerate(nomes):
                personagem_id = uuid.uuid4()
                ids.append(personagem_id)
                connection.execute(
                    "INSERT INTO personagens (id, campanha_id, dono_usuario_id, nome, ficha, criado_por) VALUES (%s, %s, %s, %s, %s, %s)",
                    (personagem_id, campanha_id, usuario_id, nome,
                     Jsonb({"nivel": 1, "derivados": {"iniciativa": 20 - ordem * 5, "vida": 10, "mana": 0}}), usuario_id),
                )
        ator = AuthenticatedUser(
            id=usuario_id, email=email, nome_exibicao="Mestre", admin_plataforma=False,
            papel_plataforma="mestre", session_id=uuid.uuid4(), csrf_hash="hash",
        )
        return campanha_id, ids, ator

    def _turno(self, sessao_id, acao, ator):
        with mock.patch("routers.sessions.live_session.publicar") as publicar:
            controlar_turno(sessao_id, SessionTurnInput(acao=acao), user=ator, database=self.database)
        chamadas = [c for c in publicar.call_args_list if c.args[1] == "turno"]
        self.assertEqual(len(chamadas), 1)
        return chamadas[0].args[3]

    def test_iniciar_e_avancar_dizem_de_quem_e_a_vez(self):
        campanha_id, ids, ator = self._mesa("turno@example.com", ["Aurelia", "Brutus"])
        estado = abrir_sessao(
            SessionOpenInput(campanha_id=campanha_id, titulo="Luta", incluir_personagens=True),
            user=ator, database=self.database,
        )
        sessao_id = estado["sessao"]["id"]
        self._turno(sessao_id, "ordenar", ator)

        primeiro = self._turno(sessao_id, "iniciar", ator)
        self.assertTrue(primeiro["em_combate"])
        self.assertEqual(primeiro["acao"], "iniciar")
        self.assertEqual(primeiro["rodada"], 1)
        self.assertEqual(primeiro["personagem_id"], str(ids[0]))

        segundo = self._turno(sessao_id, "proximo", ator)
        self.assertEqual(segundo["personagem_id"], str(ids[1]))

        volta = self._turno(sessao_id, "proximo", ator)
        self.assertEqual(volta["personagem_id"], str(ids[0]))
        self.assertEqual(volta["rodada"], 2)

    def test_encerrar_combate_avisa_que_nao_ha_mais_combate(self):
        campanha_id, _, ator = self._mesa("turno-fim@example.com", ["Aurelia"])
        estado = abrir_sessao(
            SessionOpenInput(campanha_id=campanha_id, titulo="Luta", incluir_personagens=True),
            user=ator, database=self.database,
        )
        sessao_id = estado["sessao"]["id"]
        self._turno(sessao_id, "iniciar", ator)

        fim = self._turno(sessao_id, "encerrar", ator)

        self.assertFalse(fim["em_combate"])


if __name__ == "__main__":
    unittest.main()
