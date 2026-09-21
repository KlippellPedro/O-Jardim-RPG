"""Página da campanha contra Postgres real: identidade, painel, duplicar e epílogo."""

from __future__ import annotations

import base64
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
from routers.campanha_painel import IdentidadeInput, capa, definir_identidade, duplicar, epilogo, painel

TEST_DSN = (os.getenv("TEST_DATABASE_URL") or "").strip()
PIXEL = "data:image/png;base64," + base64.b64encode(b"\x89PNG\r\n\x1a\nfake").decode()


@unittest.skipUnless(TEST_DSN, "TEST_DATABASE_URL nao configurada")
class CampanhaPainelTests(unittest.TestCase):
    def setUp(self):
        if TEST_DSN == (os.getenv("DATABASE_URL") or "").strip():
            self.fail("TEST_DATABASE_URL nao pode ser o banco de producao")
        self.schema = f"jardim_test_{uuid.uuid4().hex}"
        with psycopg.connect(TEST_DSN, autocommit=True) as connection:
            connection.execute(sql.SQL("CREATE SCHEMA {}").format(sql.Identifier(self.schema)))
        self.database = Database(make_conninfo(TEST_DSN, options=f"-c search_path={self.schema}"))
        self.database.open()
        self.campanha_id = uuid.uuid4()
        self.mestre = self._usuario("pn-mestre@example.com", "Mestre", "mestre", "mestre")
        self.ana = self._usuario("pn-ana@example.com", "Ana", "jogador", "player")

    def tearDown(self):
        self.database.close()
        with psycopg.connect(TEST_DSN, autocommit=True) as connection:
            connection.execute(sql.SQL("DROP SCHEMA IF EXISTS {} CASCADE").format(sql.Identifier(self.schema)))

    def _usuario(self, email, nome, papel, papel_plataforma):
        usuario = AuthenticatedUser(
            id=uuid.uuid4(), email=email, nome_exibicao=nome, admin_plataforma=False,
            papel_plataforma=papel_plataforma, session_id=uuid.uuid4(), csrf_hash="hash",
        )
        with self.database.connection() as connection:
            connection.execute(
                "INSERT INTO usuarios (id, email, nome_exibicao, senha_hash, papel_plataforma) VALUES (%s, %s, %s, 'hash', %s)",
                (usuario.id, email, nome, papel_plataforma),
            )
            if papel == "mestre":
                connection.execute(
                    "INSERT INTO campanhas (id, dono_id, nome, descricao, configuracoes) VALUES (%s, %s, 'Keryx', 'Uma queda', %s)",
                    (self.campanha_id, usuario.id, Jsonb({"lore_revelado": ["x"], "racas_liberadas_membros": {"u": ["elfo"]}})),
                )
            connection.execute(
                "INSERT INTO membros_campanha (campanha_id, usuario_id, papel) VALUES (%s, %s, %s)",
                (self.campanha_id, usuario.id, papel),
            )
        return usuario

    def test_identidade_so_o_mestre_muda_e_a_capa_sai_como_imagem(self):
        with self.assertRaises(HTTPException) as erro:
            definir_identidade(self.campanha_id, IdentidadeInput(cor="#112233"), user=self.ana, database=self.database)
        self.assertEqual(erro.exception.status_code, 403)
        with self.assertRaises(HTTPException):
            definir_identidade(self.campanha_id, IdentidadeInput(cor="#zzzzzz"), user=self.mestre, database=self.database)
        with self.assertRaises(HTTPException):
            definir_identidade(self.campanha_id, IdentidadeInput(capa="http://x/y.png"), user=self.mestre, database=self.database)
        resposta = definir_identidade(
            self.campanha_id, IdentidadeInput(cor="#AABBCC", frase="  A   noite\ncai ", capa=PIXEL), user=self.mestre, database=self.database
        )
        self.assertEqual(resposta["identidade"]["cor"], "#aabbcc")
        self.assertEqual(resposta["identidade"]["frase"], "A noite cai")
        self.assertTrue(resposta["identidade"]["tem_capa"])
        imagem = capa(self.campanha_id, user=self.ana, database=self.database)
        self.assertEqual(imagem.media_type, "image/png")
        self.assertTrue(imagem.body.startswith(b"\x89PNG"))
        # Campo que não vem fica como está; null apaga.
        definir_identidade(self.campanha_id, IdentidadeInput(frase="Outra"), user=self.mestre, database=self.database)
        visto = painel(self.campanha_id, user=self.ana, database=self.database)
        self.assertEqual(visto["campanha"]["identidade"]["cor"], "#aabbcc")
        self.assertEqual(visto["campanha"]["identidade"]["frase"], "Outra")
        definir_identidade(self.campanha_id, IdentidadeInput(capa=None), user=self.mestre, database=self.database)
        with self.assertRaises(HTTPException):
            capa(self.campanha_id, user=self.ana, database=self.database)

    def test_painel_lista_a_mesa_e_o_anteriormente(self):
        with self.database.connection() as connection:
            sessao = uuid.uuid4()
            connection.execute(
                "INSERT INTO sessoes_mesa (id, campanha_id, status, titulo, aberta_por, iniciada_em, encerrada_em, rodada) "
                "VALUES (%s, %s, 'encerrada', 'A ponte', %s, now() - interval '3 hours', now() - interval '1 hour', 4)",
                (sessao, self.campanha_id, self.mestre.id),
            )
            connection.execute(
                "INSERT INTO registros_mesa (id, campanha_id, sessao_id, usuario_id, autor_nome, tipo, titulo, resultado, detalhes) "
                "VALUES (%s, %s, %s, %s, 'Ana', 'rolagem', 'x', 20, %s)",
                (uuid.uuid4(), self.campanha_id, sessao, self.ana.id, Jsonb({"critico_natural": True})),
            )
            personagem = uuid.uuid4()
            connection.execute(
                "INSERT INTO personagens (id, campanha_id, dono_usuario_id, nome, ficha, criado_por) VALUES (%s, %s, %s, 'Mira', %s, %s)",
                (personagem, self.campanha_id, self.ana.id, Jsonb({"classes": [{"classeId": "x", "nivel": 3}, {"classeId": "y", "nivel": 2}]}), self.ana.id),
            )
            connection.execute(
                "UPDATE membros_campanha SET personagem_ativo_id=%s WHERE campanha_id=%s AND usuario_id=%s",
                (personagem, self.campanha_id, self.ana.id),
            )
        visto = painel(self.campanha_id, user=self.ana, database=self.database)
        self.assertEqual([m["nome"] for m in visto["membros"]], ["Mestre", "Ana"])
        ana = visto["membros"][1]
        self.assertEqual((ana["personagem"]["nome"], ana["personagem"]["nivel"]), ("Mira", 5))
        self.assertEqual(visto["gestor"], False)
        ontem = visto["anteriormente"][0]
        self.assertEqual((ontem["titulo"], ontem["duracao_min"], ontem["rolagens"], ontem["criticos"]), ("A ponte", 120, 1, 1))

    def test_duplicar_leva_o_conteudo_e_deixa_as_pessoas(self):
        with self.assertRaises(HTTPException) as erro:
            duplicar(self.campanha_id, user=self.ana, database=self.database)
        self.assertEqual(erro.exception.status_code, 403)
        with self.database.connection() as connection:
            connection.execute(
                "INSERT INTO informacoes_campanha (id, campanha_id, tipo, chave_recurso, titulo, criado_por) VALUES (%s, %s, 'npc', 'rei', 'O Rei', %s)",
                (uuid.uuid4(), self.campanha_id, self.mestre.id),
            )
        nova = duplicar(self.campanha_id, user=self.mestre, database=self.database)
        self.assertEqual(nova["nome"], "Keryx (cópia)")
        with self.database.connection() as connection:
            campanha = connection.execute("SELECT configuracoes, dono_id FROM campanhas WHERE id=%s", (nova["id"],)).fetchone()
            membros = connection.execute("SELECT usuario_id FROM membros_campanha WHERE campanha_id=%s", (nova["id"],)).fetchall()
            infos = connection.execute("SELECT titulo FROM informacoes_campanha WHERE campanha_id=%s", (nova["id"],)).fetchall()
        self.assertEqual(campanha["configuracoes"].get("lore_revelado"), ["x"])
        self.assertNotIn("racas_liberadas_membros", campanha["configuracoes"])
        self.assertEqual([m["usuario_id"] for m in membros], [self.mestre.id])
        self.assertEqual([i["titulo"] for i in infos], ["O Rei"])

    def test_epilogo_soma_a_campanha(self):
        resposta = epilogo(self.campanha_id, user=self.mestre, database=self.database)
        self.assertEqual((resposta["sessoes"], resposta["rolagens"], resposta["jogadores"]), (0, 0, 1))
        self.assertIsNone(resposta["mvp"])


if __name__ == "__main__":
    unittest.main()
