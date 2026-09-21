"""Mesa ao vivo contra Postgres real: persistência, papéis, versão e replay.

Só roda com TEST_DATABASE_URL (Docker Postgres de teste), nunca contra o banco
de produção."""

from __future__ import annotations

import os
import unittest
import uuid

import psycopg
from fastapi import HTTPException
from psycopg import sql
from psycopg.conninfo import make_conninfo
from psycopg.types.json import Jsonb

from core.database import Database
from core.dependencies import AuthenticatedUser
from routers.mesa import AcaoMesaInput, agir, listar_sessoes, obter_mesa, replay

TEST_DSN = (os.getenv("TEST_DATABASE_URL") or "").strip()


@unittest.skipUnless(TEST_DSN, "TEST_DATABASE_URL nao configurada")
class MesaBancoTests(unittest.TestCase):
    def setUp(self):
        if TEST_DSN == (os.getenv("DATABASE_URL") or "").strip():
            self.fail("TEST_DATABASE_URL nao pode ser o banco de producao")
        self.schema = f"jardim_test_{uuid.uuid4().hex}"
        with psycopg.connect(TEST_DSN, autocommit=True) as connection:
            connection.execute(sql.SQL("CREATE SCHEMA {}").format(sql.Identifier(self.schema)))
        self.database = Database(make_conninfo(TEST_DSN, options=f"-c search_path={self.schema}"))
        self.database.open()
        self.campanha_id = uuid.uuid4()
        self.mestre = self._usuario("mesa-mestre@example.com", "Mestre", "mestre")
        self.ana = self._usuario("mesa-ana@example.com", "Ana", "jogador")
        self.bruno = self._usuario("mesa-bruno@example.com", "Bruno", "jogador")
        self.personagem_ana = uuid.uuid4()
        with self.database.connection() as connection:
            connection.execute(
                "INSERT INTO personagens (id, campanha_id, dono_usuario_id, nome, ficha, criado_por) VALUES (%s, %s, %s, 'Mira', %s, %s)",
                (self.personagem_ana, self.campanha_id, self.ana.id, Jsonb({}), self.ana.id),
            )

    def tearDown(self):
        self.database.close()
        with psycopg.connect(TEST_DSN, autocommit=True) as connection:
            connection.execute(sql.SQL("DROP SCHEMA IF EXISTS {} CASCADE").format(sql.Identifier(self.schema)))

    def _usuario(self, email, nome, papel):
        usuario = AuthenticatedUser(
            id=uuid.uuid4(), email=email, nome_exibicao=nome, admin_plataforma=False,
            papel_plataforma="player", session_id=uuid.uuid4(), csrf_hash="hash",
        )
        with self.database.connection() as connection:
            connection.execute(
                "INSERT INTO usuarios (id, email, nome_exibicao, senha_hash, papel_plataforma) VALUES (%s, %s, %s, 'hash', 'player')",
                (usuario.id, email, nome),
            )
            if papel == "mestre":
                connection.execute("INSERT INTO campanhas (id, dono_id, nome) VALUES (%s, %s, 'Mesa')", (self.campanha_id, usuario.id))
            connection.execute(
                "INSERT INTO membros_campanha (campanha_id, usuario_id, papel) VALUES (%s, %s, %s)",
                (self.campanha_id, usuario.id, papel),
            )
        return usuario

    def _sessao(self, status="aberta"):
        sessao_id = uuid.uuid4()
        with self.database.connection() as connection:
            connection.execute(
                "INSERT INTO sessoes_mesa (id, campanha_id, status, titulo, aberta_por) VALUES (%s, %s, %s, 'Noite 1', %s)",
                (sessao_id, self.campanha_id, status, self.mestre.id),
            )
        return sessao_id

    def acao(self, usuario, acao, **dados):
        return agir(self.campanha_id, AcaoMesaInput(acao=acao, dados=dados), user=usuario, database=self.database)

    def ver(self, usuario):
        return obter_mesa(self.campanha_id, user=usuario, database=self.database)

    def test_jogador_fica_bloqueado_ate_a_sessao_abrir(self):
        self._sessao("preparacao")
        self.acao(self.mestre, "relogio_criar", titulo="Ritual")
        bloqueado = self.ver(self.ana)
        self.assertTrue(bloqueado["bloqueada"])
        self.assertIsNone(bloqueado["estado"])
        with self.assertRaises(HTTPException) as erro:
            self.acao(self.ana, "votar", opcao_id="x")
        self.assertEqual(erro.exception.status_code, 403)
        # O Mestre prepara e enxerga.
        self.assertEqual(self.ver(self.mestre)["estado"]["relogios"][0]["titulo"], "Ritual")

    def test_sessao_aberta_libera_a_mesa_e_cada_acao_sobe_a_versao(self):
        self._sessao("aberta")
        v0 = self.ver(self.mestre)["versao"]
        r = self.acao(self.mestre, "relogio_criar", titulo="Ritual", fatias=6)
        self.assertEqual(r["versao"], v0 + 1)
        do_jogador = self.ver(self.ana)
        self.assertFalse(do_jogador["bloqueada"])
        self.assertEqual([c["titulo"] for c in do_jogador["estado"]["relogios"]], ["Ritual"])
        self.assertEqual(do_jogador["jogadores"], [])

    def test_gestor_recebe_a_lista_de_jogadores_para_montar_a_cena(self):
        self._sessao("aberta")
        visao = self.ver(self.mestre)
        self.assertEqual(sorted(j["nome"] for j in visao["jogadores"]), ["Ana", "Bruno"])

    def test_erro_de_regra_vira_http_com_o_codigo_certo(self):
        self._sessao("aberta")
        with self.assertRaises(HTTPException) as erro:
            self.acao(self.ana, "relogio_criar", titulo="X")
        self.assertEqual(erro.exception.status_code, 403)
        with self.assertRaises(HTTPException) as erro:
            self.acao(self.mestre, "relogio_criar", titulo="X", fatias=5)
        self.assertEqual(erro.exception.status_code, 422)
        with self.assertRaises(HTTPException) as erro:
            self.acao(self.mestre, "nada_disso")
        self.assertEqual(erro.exception.status_code, 404)

    def test_fluxo_de_votacao_com_dois_jogadores(self):
        self._sessao("aberta")
        r = self.acao(self.mestre, "votacao_abrir", pergunta="Entrar?", opcoes=["Sim", "Não"])
        sim = r["estado"]["votacao"]["opcoes"][0]["id"]
        self.acao(self.ana, "votar", opcao_id=sim)
        meio = self.ver(self.bruno)["estado"]["votacao"]
        self.assertEqual((meio["total_votos"], meio["total_elegiveis"], meio["meu_voto"]), (1, 2, None))
        fim = self.acao(self.bruno, "votar", opcao_id=sim)
        self.assertIsNone(fim["estado"]["votacao"])
        self.assertEqual(fim["estado"]["ultima_votacao"]["total_votos"], 2)

    def test_bilhete_so_chega_ao_destinatario(self):
        self._sessao("aberta")
        self.acao(self.mestre, "bilhete_enviar", para_usuario_id=str(self.ana.id), titulo="Psiu", texto="Cuidado com a porta.")
        self.assertEqual(len(self.ver(self.ana)["estado"]["bilhetes"]), 1)
        self.assertEqual(self.ver(self.bruno)["estado"]["bilhetes"], [])
        bilhete = self.ver(self.ana)["estado"]["bilhetes"][0]["id"]
        with self.assertRaises(HTTPException):
            self.acao(self.bruno, "bilhete_abrir", bilhete_id=bilhete)
        self.acao(self.ana, "bilhete_abrir", bilhete_id=bilhete)
        self.assertIsNotNone(self.ver(self.mestre)["estado"]["bilhetes"][0]["aberto_em"])

    def test_replay_junta_eventos_e_rolagens_e_esconde_segredos_do_jogador(self):
        sessao_id = self._sessao("aberta")
        self.acao(self.mestre, "relogio_criar", titulo="Ritual")
        self.acao(self.mestre, "bilhete_enviar", para_usuario_id=str(self.ana.id), titulo="Segredo", texto="x")
        with self.database.connection() as connection:
            for usuario, tipo, titulo, resultado, detalhes in (
                (self.ana, "rolagem", "Furtividade", 14, {"total": 14, "natural": 9}),
                (self.bruno, "rolagem", "Furtividade", 12, {"total": 12, "natural": 7}),
                (self.bruno, "rolagem", "Ataque", 25, {"total": 25, "natural": 20, "critico_natural": True}),
            ):
                connection.execute(
                    """
                    INSERT INTO registros_mesa (id, campanha_id, sessao_id, usuario_id, autor_nome, tipo, titulo, resultado, detalhes)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (uuid.uuid4(), self.campanha_id, sessao_id, usuario.id, usuario.nome_exibicao, tipo, titulo, resultado, Jsonb(detalhes)),
                )
        do_mestre = replay(self.campanha_id, sessao_id, user=self.mestre, database=self.database)
        textos_mestre = [e["texto"] for e in do_mestre["eventos"]]
        self.assertIn("Ana rolou Furtividade: 14.", textos_mestre)
        self.assertIn("Bruno rolou Furtividade: 12.", textos_mestre)
        self.assertTrue(any("bilhete" in t.lower() for t in textos_mestre))
        self.assertEqual(textos_mestre[0], "A sessão começou.")

        da_ana = replay(self.campanha_id, sessao_id, user=self.ana, database=self.database)
        textos_ana = [e["texto"] for e in da_ana["eventos"]]
        self.assertIn("Ana rolou Furtividade: 14.", textos_ana)
        self.assertNotIn("Bruno rolou Furtividade: 12.", textos_ana)
        self.assertIn("Bruno tirou 20 natural em Ataque!", textos_ana)
        self.assertIn("Novo relógio: Ritual (0/6).", textos_ana)
        self.assertFalse(any("bilhete" in t.lower() for t in textos_ana))
        tempos = [e["s"] for e in da_ana["eventos"]]
        self.assertEqual(tempos, sorted(tempos))

    def test_replay_de_sessao_em_preparacao_e_so_do_mestre(self):
        sessao_id = self._sessao("preparacao")
        with self.assertRaises(HTTPException) as erro:
            replay(self.campanha_id, sessao_id, user=self.ana, database=self.database)
        self.assertEqual(erro.exception.status_code, 404)
        self.assertEqual(replay(self.campanha_id, sessao_id, user=self.mestre, database=self.database)["sessao"]["status"], "preparacao")
        self.assertEqual(len(listar_sessoes(self.campanha_id, user=self.ana, database=self.database)["sessoes"]), 0)
        self.assertEqual(len(listar_sessoes(self.campanha_id, user=self.mestre, database=self.database)["sessoes"]), 1)


if __name__ == "__main__":
    unittest.main()
