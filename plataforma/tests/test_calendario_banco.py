"""Calendário do mundo contra Postgres real: papéis, recorte e a estação que o bot respeita."""

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
from routers.calendario import ConfigInput, EventoInput, HojeInput, criar_evento, definir_config, definir_hoje, obter

TEST_DSN = (os.getenv("TEST_DATABASE_URL") or "").strip()


@unittest.skipUnless(TEST_DSN, "TEST_DATABASE_URL nao configurada")
class CalendarioBancoTests(unittest.TestCase):
    def setUp(self):
        if TEST_DSN == (os.getenv("DATABASE_URL") or "").strip():
            self.fail("TEST_DATABASE_URL nao pode ser o banco de producao")
        self.schema = f"jardim_test_{uuid.uuid4().hex}"
        with psycopg.connect(TEST_DSN, autocommit=True) as connection:
            connection.execute(sql.SQL("CREATE SCHEMA {}").format(sql.Identifier(self.schema)))
        self.database = Database(make_conninfo(TEST_DSN, options=f"-c search_path={self.schema}"))
        self.database.open()
        self.campanha_id = uuid.uuid4()
        self.mestre = self._usuario("cal-mestre@example.com", "Mestre", "mestre")
        self.ana = self._usuario("cal-ana@example.com", "Ana", "jogador")
        with self.database.connection() as connection:
            connection.execute(
                "INSERT INTO campanhas_discord (campanha_id, discord_guild_id, vinculado_por) VALUES (%s, 'guild-1', %s)",
                (self.campanha_id, self.mestre.id),
            )
            # No servidor real a tabela é criada pelo bot Jornalista.
            connection.execute("CREATE TABLE estacao (guild_id TEXT PRIMARY KEY, nome TEXT NOT NULL)")

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

    def _estacao_no_bot(self):
        with self.database.connection() as connection:
            return connection.execute("SELECT nome, gerida_pelo_site FROM estacao WHERE guild_id='guild-1'").fetchone()

    def test_jogador_le_mas_nao_escreve(self):
        self.assertEqual(obter(self.campanha_id, ano=None, mes=None, user=self.ana, database=self.database)["gestor"], False)
        with self.assertRaises(HTTPException) as erro:
            definir_hoje(self.campanha_id, HojeInput(ano=1, mes=4, dia=1), user=self.ana, database=self.database)
        self.assertEqual(erro.exception.status_code, 403)

    def test_estacao_vai_para_o_bot_marcada_como_do_site_e_solta_quando_desligado(self):
        definir_hoje(self.campanha_id, HojeInput(ano=3, mes=4, dia=10), user=self.mestre, database=self.database)
        linha = self._estacao_no_bot()
        self.assertEqual((linha["nome"], linha["gerida_pelo_site"]), ("verao", True))
        definir_config(self.campanha_id, ConfigInput(sincronizar_discord=False), user=self.mestre, database=self.database)
        self.assertFalse(self._estacao_no_bot()["gerida_pelo_site"])

    def test_calendario_escondido_pelo_criador_da_403_ao_jogador_e_segue_para_o_mestre(self):
        from psycopg.types.json import Jsonb
        with self.database.connection() as connection:
            connection.execute("UPDATE campanhas SET configuracoes=%s WHERE id=%s", (Jsonb({"calendario_oculto": True}), self.campanha_id))
        with self.assertRaises(HTTPException) as erro:
            obter(self.campanha_id, ano=None, mes=None, user=self.ana, database=self.database)
        self.assertEqual(erro.exception.status_code, 403)
        self.assertTrue(obter(self.campanha_id, ano=None, mes=None, user=self.mestre, database=self.database)["gestor"])

    def test_evento_rasurado_chega_ao_jogador_sem_texto(self):
        definir_hoje(self.campanha_id, HojeInput(ano=3, mes=4, dia=10), user=self.mestre, database=self.database)
        criar_evento(
            self.campanha_id,
            EventoInput(titulo="A traicao", nota="Segredo", mes=4, dia=12, ano=3, revelacao="rasurado"),
            user=self.mestre, database=self.database,
        )
        visao = obter(self.campanha_id, ano=None, mes=None, user=self.ana, database=self.database)
        dia = next(d for d in visao["mes"]["dias"] if d["dia"] == 12)
        self.assertTrue(dia["eventos"][0]["rasurado"])
        self.assertNotIn("Segredo", str(visao))
        self.assertNotIn("A traicao", str(visao))


if __name__ == "__main__":
    unittest.main()
