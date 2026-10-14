from __future__ import annotations

import os
import unittest
import uuid

import psycopg
from psycopg import sql
from psycopg.conninfo import make_conninfo
from psycopg.types.json import Jsonb

from core.database import Database
from core.dependencies import AuthenticatedUser
from routers import campaigns
from schemas import CampaignVisibilityUpdateInput


TEST_DSN = (os.getenv("TEST_DATABASE_URL") or "").strip()


@unittest.skipUnless(TEST_DSN, "TEST_DATABASE_URL nao configurada")
class VisibilidadeMesclarTests(unittest.TestCase):
    """O botão de visibilidade de um registro manda só a lista dele: o resto da configuração não pode sumir."""

    def setUp(self):
        production_dsn = (os.getenv("DATABASE_URL") or "").strip()
        if TEST_DSN == production_dsn:
            self.fail("TEST_DATABASE_URL nao pode ser o banco de producao")
        self.schema = f"jardim_test_{uuid.uuid4().hex}"
        with psycopg.connect(TEST_DSN, autocommit=True) as connection:
            connection.execute(sql.SQL("CREATE SCHEMA {}").format(sql.Identifier(self.schema)))
        self.database = Database(make_conninfo(TEST_DSN, options=f"-c search_path={self.schema}"))
        self.database.open()

        self.campanha_id = uuid.uuid4()
        usuario_id = uuid.uuid4()
        self.config_inicial = {
            "lore_oculto": ["a"],
            "lore_revelado": [],
            "personagens_pastas": [{"id": "p1", "nome": "Pasta"}],
            "itens_ocultos": ["espada"],
        }
        with self.database.connection() as connection:
            connection.execute(
                "INSERT INTO usuarios (id, email, nome_exibicao, senha_hash, papel_plataforma) VALUES (%s, 'c@example.com', 'Criador', 'h', 'criador')",
                (usuario_id,),
            )
            connection.execute(
                "INSERT INTO campanhas (id, dono_id, nome, configuracoes) VALUES (%s, %s, 'Mesa', %s)",
                (self.campanha_id, usuario_id, Jsonb(self.config_inicial)),
            )
        self.criador = AuthenticatedUser(
            id=usuario_id, email="c@example.com", nome_exibicao="Criador", admin_plataforma=True,
            papel_plataforma="criador", session_id=uuid.uuid4(), csrf_hash="h",
        )

    def tearDown(self):
        self.database.close()
        with psycopg.connect(TEST_DSN, autocommit=True) as connection:
            connection.execute(sql.SQL("DROP SCHEMA IF EXISTS {} CASCADE").format(sql.Identifier(self.schema)))

    def _config(self):
        with self.database.connection() as connection:
            return connection.execute("SELECT configuracoes FROM campanhas WHERE id=%s", (self.campanha_id,)).fetchone()["configuracoes"]

    def test_sem_mesclar_o_documento_enviado_substitui_o_antigo(self):
        campaigns.update_campaign_visibility(
            self.campanha_id, CampaignVisibilityUpdateInput(configuracoes={"lore_oculto": ["b"]}),
            user=self.criador, database=self.database,
        )
        self.assertEqual(self._config(), {"lore_oculto": ["b"]})

    def test_mesclar_troca_so_as_chaves_enviadas(self):
        resposta = campaigns.update_campaign_visibility(
            self.campanha_id, CampaignVisibilityUpdateInput(configuracoes={"lore_oculto": ["a", "b"]}, mesclar=True),
            user=self.criador, database=self.database,
        )
        esperado = {**self.config_inicial, "lore_oculto": ["a", "b"]}
        self.assertEqual(self._config(), esperado)
        self.assertEqual(resposta["campanha"]["configuracoes"], esperado)

    def test_mesclar_em_campanha_sem_configuracao_grava_o_que_veio(self):
        with self.database.connection() as connection:
            connection.execute("UPDATE campanhas SET configuracoes='{}'::jsonb WHERE id=%s", (self.campanha_id,))
        campaigns.update_campaign_visibility(
            self.campanha_id, CampaignVisibilityUpdateInput(configuracoes={"lore_revelado": ["x"]}, mesclar=True),
            user=self.criador, database=self.database,
        )
        self.assertEqual(self._config(), {"lore_revelado": ["x"]})

    def test_revelar_pelo_modo_mesclar_avisa_a_mesa_como_sempre(self):
        # O membro mestre da mesa recebe o aviso "liberou conhecimento novo" (o ator não recebe o próprio).
        outro = uuid.uuid4()
        with self.database.connection() as connection:
            connection.execute(
                "INSERT INTO usuarios (id, email, nome_exibicao, senha_hash) VALUES (%s, 'j@example.com', 'Jogador', 'h')", (outro,),
            )
            connection.execute("INSERT INTO membros_campanha (campanha_id, usuario_id, papel) VALUES (%s, %s, 'jogador')", (self.campanha_id, outro))
        campaigns.update_campaign_visibility(
            self.campanha_id, CampaignVisibilityUpdateInput(configuracoes={"lore_oculto": []}, mesclar=True),
            user=self.criador, database=self.database,
        )
        with self.database.connection() as connection:
            avisos = connection.execute("SELECT usuario_id, titulo FROM notificacoes WHERE campanha_id=%s", (self.campanha_id,)).fetchall()
        self.assertEqual([(a["usuario_id"], a["titulo"]) for a in avisos], [(outro, "O Mestre liberou conhecimento novo")])


if __name__ == "__main__":
    unittest.main()
