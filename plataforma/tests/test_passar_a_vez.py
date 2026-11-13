"""O jogador encerra o próprio turno (POST /sessao/{id}/turno/passar): só no combate e só na vez dele.

Roda contra Postgres real (TEST_DATABASE_URL), nunca contra o banco de produção."""

from __future__ import annotations

import os
import unittest
import uuid
from unittest import mock

import psycopg
from fastapi import HTTPException
from psycopg import sql
from psycopg.conninfo import make_conninfo
from psycopg.types.json import Jsonb

from core.database import Database
from core.dependencies import AuthenticatedUser
from routers.sessions import abrir_sessao, controlar_turno, passar_a_propria_vez, publicar_sessao
from schemas import SessionOpenInput, SessionTurnInput


TEST_DSN = (os.getenv("TEST_DATABASE_URL") or "").strip()


def _ator(usuario_id, email, nome):
    return AuthenticatedUser(
        id=usuario_id, email=email, nome_exibicao=nome, admin_plataforma=False,
        papel_plataforma="player", session_id=uuid.uuid4(), csrf_hash="hash",
    )


@unittest.skipUnless(TEST_DSN, "TEST_DATABASE_URL nao configurada")
class PassarAVezTests(unittest.TestCase):
    def setUp(self):
        if TEST_DSN == (os.getenv("DATABASE_URL") or "").strip():
            self.fail("TEST_DATABASE_URL nao pode ser o banco de producao")
        self.schema = f"jardim_test_{uuid.uuid4().hex}"
        with psycopg.connect(TEST_DSN, autocommit=True) as connection:
            connection.execute(sql.SQL("CREATE SCHEMA {}").format(sql.Identifier(self.schema)))
        self.database = Database(make_conninfo(TEST_DSN, options=f"-c search_path={self.schema}"))
        self.database.open()

        # Mesa: o Mestre, a Ana (dona da Aurelia, iniciativa 20) e o Bruno (dono do Brutus, iniciativa 15).
        self.campanha_id = uuid.uuid4()
        self.mestre = _ator(uuid.uuid4(), "mestre-vez@example.com", "Mestre")
        self.ana = _ator(uuid.uuid4(), "ana-vez@example.com", "Ana")
        self.bruno = _ator(uuid.uuid4(), "bruno-vez@example.com", "Bruno")
        self.de_fora = _ator(uuid.uuid4(), "fora-vez@example.com", "Visita")
        self.aurelia, self.brutus = uuid.uuid4(), uuid.uuid4()
        with self.database.connection() as connection:
            for ator in (self.mestre, self.ana, self.bruno, self.de_fora):
                connection.execute(
                    "INSERT INTO usuarios (id, email, nome_exibicao, senha_hash, papel_plataforma) VALUES (%s, %s, %s, 'hash', 'player')",
                    (ator.id, ator.email, ator.nome_exibicao),
                )
            connection.execute("INSERT INTO campanhas (id, dono_id, nome) VALUES (%s, %s, 'Mesa')", (self.campanha_id, self.mestre.id))
            for ator, papel in ((self.mestre, "mestre"), (self.ana, "jogador"), (self.bruno, "jogador")):
                connection.execute(
                    "INSERT INTO membros_campanha (campanha_id, usuario_id, papel) VALUES (%s, %s, %s)",
                    (self.campanha_id, ator.id, papel),
                )
            for personagem_id, dono, nome, iniciativa in (
                (self.aurelia, self.ana, "Aurelia", 20), (self.brutus, self.bruno, "Brutus", 15),
            ):
                connection.execute(
                    "INSERT INTO personagens (id, campanha_id, dono_usuario_id, nome, ficha, criado_por) VALUES (%s, %s, %s, %s, %s, %s)",
                    (personagem_id, self.campanha_id, dono.id, nome,
                     Jsonb({"nivel": 1, "derivados": {"iniciativa": iniciativa, "vida": 10, "mana": 0}}), self.mestre.id),
                )
        with mock.patch("routers.sessions.live_session.publicar"):
            estado = abrir_sessao(
                SessionOpenInput(campanha_id=self.campanha_id, titulo="Luta", incluir_personagens=True),
                user=self.mestre, database=self.database,
            )
            self.sessao_id = estado["sessao"]["id"]
            publicar_sessao(self.sessao_id, user=self.mestre, database=self.database)
            controlar_turno(self.sessao_id, SessionTurnInput(acao="ordenar"), user=self.mestre, database=self.database)

    def tearDown(self):
        self.database.close()
        with psycopg.connect(TEST_DSN, autocommit=True) as connection:
            connection.execute(sql.SQL("DROP SCHEMA IF EXISTS {} CASCADE").format(sql.Identifier(self.schema)))

    def _mestre(self, acao):
        with mock.patch("routers.sessions.live_session.publicar"):
            controlar_turno(self.sessao_id, SessionTurnInput(acao=acao), user=self.mestre, database=self.database)

    def _passar(self, ator):
        with mock.patch("routers.sessions.live_session.publicar") as publicar:
            estado = passar_a_propria_vez(self.sessao_id, user=ator, database=self.database)
        chamadas = [c for c in publicar.call_args_list if c.args[1] == "turno"]
        self.assertEqual(len(chamadas), 1)
        return estado, chamadas[0].args[3]

    def _indice(self):
        with self.database.connection() as connection:
            linha = connection.execute("SELECT turno_indice, rodada FROM sessoes_mesa WHERE id=%s", (self.sessao_id,)).fetchone()
        return linha["turno_indice"], linha["rodada"]

    def test_quem_esta_na_vez_passa_e_a_mesa_fica_sabendo(self):
        self._mestre("iniciar")
        estado, aviso = self._passar(self.ana)

        self.assertEqual(self._indice(), (1, 1))
        self.assertEqual(aviso["acao"], "proximo")
        self.assertEqual(aviso["personagem_id"], str(self.brutus))
        # A resposta é a visão de jogadora, não a de quem comanda.
        self.assertFalse(estado["comando"])

    def test_passar_a_ultima_vez_vira_a_rodada(self):
        self._mestre("iniciar")
        self._passar(self.ana)
        _, aviso = self._passar(self.bruno)

        self.assertEqual(self._indice(), (0, 2))
        self.assertEqual(aviso["rodada"], 2)
        self.assertEqual(aviso["personagem_id"], str(self.aurelia))

    def test_fora_da_vez_ninguem_passa(self):
        self._mestre("iniciar")
        with self.assertRaises(HTTPException) as erro:
            passar_a_propria_vez(self.sessao_id, user=self.bruno, database=self.database)
        self.assertEqual(erro.exception.status_code, 403)
        # Nem o Mestre por esta rota: a vez não é de um personagem dele (ele usa a rota de comando).
        with self.assertRaises(HTTPException) as erro:
            passar_a_propria_vez(self.sessao_id, user=self.mestre, database=self.database)
        self.assertEqual(erro.exception.status_code, 403)
        self.assertEqual(self._indice(), (0, 1))

    def test_sem_combate_nao_ha_vez_para_passar(self):
        with self.assertRaises(HTTPException) as erro:
            passar_a_propria_vez(self.sessao_id, user=self.ana, database=self.database)
        self.assertEqual(erro.exception.status_code, 409)

    def test_quem_nao_e_da_mesa_nem_enxerga_a_sessao(self):
        self._mestre("iniciar")
        with self.assertRaises(HTTPException) as erro:
            passar_a_propria_vez(self.sessao_id, user=self.de_fora, database=self.database)
        self.assertEqual(erro.exception.status_code, 404)

    def test_sessao_em_preparo_nao_aceita(self):
        # Outra mesa, ainda em preparo (privada do Mestre): a rota do jogador não a enxerga.
        with self.database.connection() as connection:
            connection.execute("UPDATE sessoes_mesa SET status='preparacao', em_combate=TRUE WHERE id=%s", (self.sessao_id,))
        with self.assertRaises(HTTPException) as erro:
            passar_a_propria_vez(self.sessao_id, user=self.ana, database=self.database)
        self.assertEqual(erro.exception.status_code, 404)


if __name__ == "__main__":
    unittest.main()
