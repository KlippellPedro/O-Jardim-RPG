"""Diário automático do personagem, contra Postgres real.

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
from routers.characters import obter_diario


TEST_DSN = (os.getenv("TEST_DATABASE_URL") or "").strip()


@unittest.skipUnless(TEST_DSN, "TEST_DATABASE_URL nao configurada")
class DiarioTests(unittest.TestCase):
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

    def _usuario(self, connection, email, nome):
        usuario_id = uuid.uuid4()
        connection.execute(
            "INSERT INTO usuarios (id, email, nome_exibicao, senha_hash, papel_plataforma) VALUES (%s, %s, %s, 'hash', 'player')",
            (usuario_id, email, nome),
        )
        return AuthenticatedUser(
            id=usuario_id, email=email, nome_exibicao=nome, admin_plataforma=False,
            papel_plataforma="player", session_id=uuid.uuid4(), csrf_hash="hash",
        )

    def _mesa(self):
        campanha_id, personagem_id = uuid.uuid4(), uuid.uuid4()
        with self.database.connection() as connection:
            dono = self._usuario(connection, "diario-dono@example.com", "Dona")
            outro = self._usuario(connection, "diario-outro@example.com", "Outro")
            connection.execute("INSERT INTO campanhas (id, dono_id, nome) VALUES (%s, %s, 'Mesa')", (campanha_id, dono.id))
            for usuario, papel in ((dono, "jogador"), (outro, "jogador")):
                connection.execute(
                    "INSERT INTO membros_campanha (campanha_id, usuario_id, papel) VALUES (%s, %s, %s)",
                    (campanha_id, usuario.id, papel),
                )
            connection.execute(
                "INSERT INTO personagens (id, campanha_id, dono_usuario_id, nome, ficha, criado_por) VALUES (%s, %s, %s, 'Heroina', %s, %s)",
                (personagem_id, campanha_id, dono.id, Jsonb({"nivel": 1}), dono.id),
            )
        return campanha_id, personagem_id, dono, outro

    def _registro(self, campanha_id, personagem_id, usuario_id, *, tipo, titulo, resultado=None, detalhes=None):
        with self.database.connection() as connection:
            connection.execute(
                """
                INSERT INTO registros_mesa
                    (id, campanha_id, usuario_id, personagem_id, autor_nome, tipo, titulo, resultado, detalhes)
                VALUES (%s, %s, %s, %s, 'Heroina', %s, %s, %s, %s)
                """,
                (uuid.uuid4(), campanha_id, usuario_id, personagem_id, tipo, titulo, resultado, Jsonb(detalhes or {})),
            )

    def test_diario_vazio_devolve_lista_vazia(self):
        _, personagem_id, dono, _ = self._mesa()

        resposta = obter_diario(personagem_id, user=dono, database=self.database)

        self.assertEqual(resposta, {"eventos": [], "total": 0})

    def test_momentos_marcantes_viram_frases_e_rolagem_comum_fica_de_fora(self):
        campanha_id, personagem_id, dono, _ = self._mesa()
        self._registro(campanha_id, personagem_id, dono.id, tipo="rolagem", titulo="Furtividade", resultado=26, detalhes={"critico_natural": True})
        self._registro(campanha_id, personagem_id, dono.id, tipo="rolagem", titulo="Atletismo", resultado=1, detalhes={"falha_natural": True})
        self._registro(campanha_id, personagem_id, dono.id, tipo="rolagem", titulo="Percepcao", resultado=12, detalhes={"natural": 9})
        self._registro(campanha_id, personagem_id, dono.id, tipo="dano", titulo="Machado", resultado=34)
        self._registro(campanha_id, personagem_id, dono.id, tipo="dano", titulo="Adaga", resultado=4)
        self._registro(campanha_id, personagem_id, dono.id, tipo="magia", titulo="Bola de Fogo")
        self._registro(campanha_id, personagem_id, dono.id, tipo="magia", titulo="bola de fogo")

        resposta = obter_diario(personagem_id, user=dono, database=self.database)

        tipos = sorted(evento["tipo"] for evento in resposta["eventos"])
        self.assertEqual(tipos, ["critico", "dano", "falha", "uso"])
        textos = " ".join(evento["texto"] for evento in resposta["eventos"])
        self.assertIn("20 natural em Furtividade", textos)
        self.assertIn("34 de dano", textos)
        self.assertIn("Conjurei Bola de Fogo pela primeira vez", textos)
        self.assertNotIn("Percepcao", textos)
        self.assertNotIn("Adaga", textos)

    def test_lunaris_so_entra_quando_o_valor_e_relevante(self):
        campanha_id, personagem_id, dono, _ = self._mesa()
        with self.database.connection() as connection:
            for delta, motivo in ((2500, "Recompensa da missao"), (-40, "Pao"), (-1200, "Compra na loja")):
                connection.execute(
                    """
                    INSERT INTO lancamentos_economia
                        (id, campanha_id, personagem_id, moeda, delta, saldo_apos, motivo, origem)
                    VALUES (%s, %s, %s, 'Lunaris', %s, 0, %s, 'teste')
                    """,
                    (uuid.uuid4(), campanha_id, personagem_id, delta, motivo),
                )

        resposta = obter_diario(personagem_id, user=dono, database=self.database)

        textos = sorted(evento["texto"] for evento in resposta["eventos"])
        self.assertEqual(len(textos), 2)
        self.assertIn("Gastei 1.200 Lunaris (compra na loja).", textos)
        self.assertIn("Recebi 2.500 Lunaris (recompensa da missao).", textos)

    def test_conquista_desbloqueada_aparece_com_a_raridade(self):
        _, personagem_id, dono, _ = self._mesa()
        with self.database.connection() as connection:
            connection.execute(
                "INSERT INTO personagem_conquistas (personagem_id, chave) VALUES (%s, 'nivel_10')",
                (personagem_id,),
            )

        resposta = obter_diario(personagem_id, user=dono, database=self.database)

        self.assertEqual(len(resposta["eventos"]), 1)
        evento = resposta["eventos"][0]
        self.assertEqual((evento["tipo"], evento["raridade"], evento["chave"]), ("conquista", "rara", "conquista:nivel_10"))
        self.assertIn("Meio Caminho", evento["texto"])

    def test_outro_jogador_sem_vinculo_nao_ve_o_diario(self):
        _, personagem_id, _, outro = self._mesa()

        with self.assertRaises(HTTPException) as erro:
            obter_diario(personagem_id, user=outro, database=self.database)

        self.assertEqual(erro.exception.status_code, 404)


if __name__ == "__main__":
    unittest.main()
