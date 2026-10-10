"""O 20 e o 1 natural na sessão ao vivo viram um evento para a mesa toda, contra Postgres real.

Só roda com TEST_DATABASE_URL (Docker Postgres de teste), nunca contra o banco de produção."""

from __future__ import annotations

import os
import unittest
import uuid
from unittest import mock

import psycopg
from psycopg import sql
from psycopg.conninfo import make_conninfo

from core.database import Database
from core.dependencies import AuthenticatedUser
from routers import rolls
from routers.rolls import _destaque_da_mesa, rolar
from routers.sessions import abrir_sessao, publicar_sessao
from schemas import RollInput, SessionOpenInput


TEST_DSN = (os.getenv("TEST_DATABASE_URL") or "").strip()


class DestaquePuroTests(unittest.TestCase):
    """A decisão em si, sem banco."""

    aberta = {"id": "s", "status": "aberta"}

    def test_vinte_natural_e_um_natural_na_mesa_ao_vivo(self):
        self.assertEqual(_destaque_da_mesa("rolagem", {"critico_natural": True}, self.aberta), "critico")
        self.assertEqual(_destaque_da_mesa("rolagem", {"falha_natural": True}, self.aberta), "falha")

    def test_numero_comum_nao_destaca(self):
        self.assertIsNone(_destaque_da_mesa("rolagem", {"critico_natural": False, "falha_natural": False}, self.aberta))

    def test_dano_nunca_destaca(self):
        self.assertIsNone(_destaque_da_mesa("dano", {"critico_natural": True}, self.aberta))

    def test_sem_sessao_ou_em_preparacao_a_mesa_nao_ve_nada(self):
        self.assertIsNone(_destaque_da_mesa("rolagem", {"critico_natural": True}, None))
        self.assertIsNone(_destaque_da_mesa("rolagem", {"critico_natural": True}, {"id": "s", "status": "preparacao"}))


@unittest.skipUnless(TEST_DSN, "TEST_DATABASE_URL nao configurada")
class DestaqueDaMesaTests(unittest.TestCase):
    def setUp(self):
        if TEST_DSN == (os.getenv("DATABASE_URL") or "").strip():
            self.fail("TEST_DATABASE_URL nao pode ser o banco de producao")
        self.schema = f"jardim_test_{uuid.uuid4().hex}"
        with psycopg.connect(TEST_DSN, autocommit=True) as connection:
            connection.execute(sql.SQL("CREATE SCHEMA {}").format(sql.Identifier(self.schema)))
        self.database = Database(make_conninfo(TEST_DSN, options=f"-c search_path={self.schema}"))
        self.database.open()
        self.campanha_id = uuid.uuid4()
        self.mestre_id, self.jogador_id = uuid.uuid4(), uuid.uuid4()
        self.personagem_id = uuid.uuid4()
        with self.database.connection() as connection:
            for usuario_id, email in ((self.mestre_id, "destaque-mestre@example.com"), (self.jogador_id, "destaque-jogador@example.com")):
                connection.execute(
                    "INSERT INTO usuarios (id, email, nome_exibicao, senha_hash, papel_plataforma) VALUES (%s, %s, 'Pessoa', 'hash', 'player')",
                    (usuario_id, email),
                )
            connection.execute("INSERT INTO campanhas (id, dono_id, nome) VALUES (%s, %s, 'Mesa')", (self.campanha_id, self.mestre_id))
            connection.execute(
                "INSERT INTO membros_campanha (campanha_id, usuario_id, papel) VALUES (%s, %s, 'mestre'), (%s, %s, 'jogador')",
                (self.campanha_id, self.mestre_id, self.campanha_id, self.jogador_id),
            )
            connection.execute(
                "INSERT INTO personagens (id, campanha_id, dono_usuario_id, nome, ficha, criado_por) VALUES (%s, %s, %s, 'Kael', '{}'::jsonb, %s)",
                (self.personagem_id, self.campanha_id, self.jogador_id, self.jogador_id),
            )
        self.mestre = self._ator(self.mestre_id, "destaque-mestre@example.com")
        self.jogador = self._ator(self.jogador_id, "destaque-jogador@example.com")

    def tearDown(self):
        self.database.close()
        with psycopg.connect(TEST_DSN, autocommit=True) as connection:
            connection.execute(sql.SQL("DROP SCHEMA IF EXISTS {} CASCADE").format(sql.Identifier(self.schema)))

    @staticmethod
    def _ator(usuario_id, email):
        return AuthenticatedUser(
            id=usuario_id, email=email, nome_exibicao="Pessoa", admin_plataforma=False,
            papel_plataforma="player", session_id=uuid.uuid4(), csrf_hash="hash",
        )

    def _abrir_a_mesa(self):
        estado = abrir_sessao(SessionOpenInput(campanha_id=self.campanha_id, titulo="Noite"), user=self.mestre, database=self.database)
        publicar_sessao(uuid.UUID(str(estado["sessao"]["id"])), user=self.mestre, database=self.database)

    def _rolar_com(self, natural, titulo="Ataque: Espada"):
        dados = {
            "dados": [natural], "natural": natural, "modo": "normal", "bonus": 0, "total": natural,
            "critico_natural": natural == 20, "falha_natural": natural == 1,
        }
        with mock.patch.object(rolls, "rolar_teste", return_value=dados), mock.patch.object(rolls.live_session, "publicar") as publicar:
            rolar(
                RollInput(campanha_id=self.campanha_id, personagem_id=self.personagem_id, titulo=titulo),
                user=self.jogador, database=self.database,
            )
        return [chamada.args for chamada in publicar.call_args_list]

    def test_vinte_natural_publica_o_destaque_para_a_mesa(self):
        self._abrir_a_mesa()
        eventos = self._rolar_com(20)
        destaques = [args for args in eventos if args[1] == "destaque_mesa"]
        self.assertEqual(len(destaques), 1)
        _, _, _, detalhes = destaques[0]
        self.assertEqual(detalhes["destaque"], "critico")
        self.assertEqual(detalhes["autor"], "Kael")
        self.assertEqual(detalhes["titulo"], "Ataque: Espada")
        self.assertEqual(detalhes["usuario_id"], str(self.jogador_id))

    def test_um_natural_tambem_aparece_para_a_mesa(self):
        self._abrir_a_mesa()
        destaques = [args for args in self._rolar_com(1) if args[1] == "destaque_mesa"]
        self.assertEqual(destaques[0][3]["destaque"], "falha")

    def test_numero_comum_so_publica_o_registro(self):
        self._abrir_a_mesa()
        self.assertEqual([args[1] for args in self._rolar_com(13)], ["registro"])

    def test_sem_sessao_ao_vivo_nao_ha_destaque(self):
        self.assertEqual([args[1] for args in self._rolar_com(20)], ["registro"])

    def test_o_evento_nao_leva_o_resultado_nem_o_bonus(self):
        self._abrir_a_mesa()
        detalhes = next(args[3] for args in self._rolar_com(20) if args[1] == "destaque_mesa")
        self.assertEqual(set(detalhes), {"destaque", "autor", "titulo", "usuario_id"})


if __name__ == "__main__":
    unittest.main()
