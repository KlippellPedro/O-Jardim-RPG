"""Elevação e nota do jogador no token: as contas (core/mapa.py) e quem lê e quem muda (routers/mapa.py).

As contas rodam sempre; a parte com Postgres só roda com TEST_DATABASE_URL (descartável), nunca contra o banco de produção."""

from __future__ import annotations

import os
import unittest
import uuid

import psycopg
from fastapi import HTTPException
from psycopg import sql
from psycopg.conninfo import make_conninfo

from core import mapa, tempo_real

TEST_DSN = (os.getenv("TEST_DATABASE_URL") or "").strip()


class ContasDoTokenTests(unittest.TestCase):
    def test_a_elevacao_vai_de_menos_50_a_300_metros_inteiros(self):
        self.assertEqual(mapa.normalizar_elevacao(6), 6)
        self.assertEqual(mapa.normalizar_elevacao(-12.4), -12)
        self.assertEqual(mapa.normalizar_elevacao(0), 0)
        for ruim in (301, -51, "6", None, True):
            with self.assertRaises(mapa.ErroMapa):
                mapa.normalizar_elevacao(ruim)

    def test_a_elevacao_que_chega_do_banco_nunca_quebra_o_token(self):
        self.assertEqual(mapa.elevacao_valida(None), 0)
        self.assertEqual(mapa.elevacao_valida("alto"), 0)
        self.assertEqual(mapa.elevacao_valida(9999), mapa.ELEVACAO_MAXIMA)
        self.assertEqual(mapa.elevacao_valida(-9999), mapa.ELEVACAO_MINIMA)

    def test_a_nota_do_jogador_e_texto_curto_sem_espacos_sobrando(self):
        self.assertEqual(mapa.normalizar_nota_do_jogador("  Lembrar do cofre  "), "Lembrar do cofre")
        self.assertEqual(len(mapa.normalizar_nota_do_jogador("x" * 999)), mapa.NOTA_DO_JOGADOR_MAXIMA)
        self.assertEqual(mapa.normalizar_nota_do_jogador("   "), "")
        with self.assertRaises(mapa.ErroMapa):
            mapa.normalizar_nota_do_jogador(7)


@unittest.skipUnless(TEST_DSN, "TEST_DATABASE_URL nao configurada")
class ExtrasDoTokenBancoTests(unittest.TestCase):
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
                connection.execute(
                    "INSERT INTO membros_campanha (campanha_id, usuario_id, papel) VALUES (%s, %s, %s)",
                    (self.campanha_id, pessoa.id, papel),
                )
            return pessoa

        self.mestre = usuario("extra-mestre@example.com", "Mestre", "mestre", plataforma="mestre")
        self.ana = usuario("extra-ana@example.com", "Ana", "jogador")
        self.bia = usuario("extra-bia@example.com", "Bia", "jogador")
        self.cena, self.personagem_ana, self.personagem_bia = uuid.uuid4(), uuid.uuid4(), uuid.uuid4()
        self.token_ana, self.token_bia = uuid.uuid4(), uuid.uuid4()
        with self.database.connection() as connection:
            connection.execute("INSERT INTO sessoes_mesa (id, campanha_id, status, titulo, aberta_por) VALUES (%s, %s, 'aberta', 'x', %s)", (uuid.uuid4(), self.campanha_id, self.mestre.id))
            connection.execute("INSERT INTO mapa_cenas (id, campanha_id, nome, largura, altura, ativa) VALUES (%s, %s, 'Torre', 1200, 900, TRUE)", (self.cena, self.campanha_id))
            for personagem, dono, nome in ((self.personagem_ana, self.ana, "Mira"), (self.personagem_bia, self.bia, "Teo")):
                connection.execute(
                    "INSERT INTO personagens (id, campanha_id, dono_usuario_id, criado_por, nome) VALUES (%s, %s, %s, %s, %s)",
                    (personagem, self.campanha_id, dono.id, dono.id, nome),
                )
            connection.execute("INSERT INTO mapa_tokens (id, cena_id, personagem_id, x, y, lado) VALUES (%s, %s, %s, 150, 150, 'jogador')", (self.token_ana, self.cena, self.personagem_ana))
            connection.execute("INSERT INTO mapa_tokens (id, cena_id, personagem_id, x, y, lado) VALUES (%s, %s, %s, 350, 150, 'jogador')", (self.token_bia, self.cena, self.personagem_bia))

    def tearDown(self):
        tempo_real._limpar_para_testes()
        self.database.close()
        with psycopg.connect(TEST_DSN, autocommit=True) as connection:
            connection.execute(sql.SQL("DROP SCHEMA IF EXISTS {} CASCADE").format(sql.Identifier(self.schema)))

    def _token(self, quem, token_id):
        from routers import mapa as rotas

        resposta = rotas.obter_mapa(self.campanha_id, None, user=quem, database=self.database)
        return next(token for token in resposta["tokens"] if token["id"] == str(token_id))

    def _editar(self, quem, token_id, **campos):
        from routers import mapa as rotas

        return rotas.editar_token(self.campanha_id, token_id, rotas.TokenEdicao(**campos), user=quem, database=self.database)

    def test_so_o_mestre_muda_a_elevacao_e_todos_veem(self):
        self._editar(self.mestre, self.token_ana, elevacao=6)
        self.assertEqual(self._token(self.mestre, self.token_ana)["elevacao"], 6)
        self.assertEqual(self._token(self.bia, self.token_ana)["elevacao"], 6, "outro jogador que enxerga o token vê a altura")
        for quem in (self.ana, self.bia):
            with self.assertRaises(HTTPException) as erro:
                self._editar(quem, self.token_ana, elevacao=20)
            self.assertEqual(erro.exception.status_code, 403)
        self.assertEqual(self._token(self.mestre, self.token_ana)["elevacao"], 6)
        from pydantic import ValidationError

        with self.assertRaises(ValidationError):
            self._editar(self.mestre, self.token_ana, elevacao=301)

    def test_a_nota_do_jogador_e_do_dono_e_do_mestre(self):
        self._editar(self.ana, self.token_ana, nota_jogador="  Procurar a chave do porão  ")
        self.assertEqual(self._token(self.ana, self.token_ana)["nota_jogador"], "Procurar a chave do porão")
        self.assertEqual(self._token(self.mestre, self.token_ana)["nota_jogador"], "Procurar a chave do porão")
        self.assertNotIn("nota_jogador", self._token(self.bia, self.token_ana), "a nota nunca chega a quem não é o dono nem o Mestre")
        with self.assertRaises(HTTPException) as erro:
            self._editar(self.bia, self.token_ana, nota_jogador="invasão")
        self.assertEqual(erro.exception.status_code, 403)
        self._editar(self.ana, self.token_ana, nota_jogador="")
        self.assertEqual(self._token(self.ana, self.token_ana)["nota_jogador"], "")
