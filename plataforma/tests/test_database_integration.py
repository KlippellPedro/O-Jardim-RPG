from __future__ import annotations

import os
import unittest
import uuid

import psycopg
from psycopg import sql
from psycopg.conninfo import make_conninfo
from psycopg.types.json import Jsonb

from core.backup import TABELAS, TABELAS_IGNORADAS, gerar_backup, restaurar_backup
from core.database import Database


TEST_DSN = (os.getenv("TEST_DATABASE_URL") or "").strip()


@unittest.skipUnless(TEST_DSN, "TEST_DATABASE_URL nao configurada")
class DatabaseMigrationTests(unittest.TestCase):
    def setUp(self):
        production_dsn = (os.getenv("DATABASE_URL") or "").strip()
        if TEST_DSN == production_dsn:
            self.fail("TEST_DATABASE_URL nao pode ser o banco de producao")
        self.schema = f"jardim_test_{uuid.uuid4().hex}"
        with psycopg.connect(TEST_DSN, autocommit=True) as connection:
            connection.execute(
                sql.SQL("CREATE SCHEMA {}").format(sql.Identifier(self.schema))
            )
        isolated_dsn = make_conninfo(
            TEST_DSN,
            options=f"-c search_path={self.schema}",
        )
        self.database = Database(isolated_dsn)
        self.database.open()

    def tearDown(self):
        self.database.close()
        with psycopg.connect(TEST_DSN, autocommit=True) as connection:
            connection.execute(
                sql.SQL("DROP SCHEMA IF EXISTS {} CASCADE").format(
                    sql.Identifier(self.schema)
                )
            )

    def test_all_foundation_tables_exist(self):
        expected = {
            "usuarios",
            "sessoes_auth",
            "campanhas",
            "membros_campanha",
            "personagens",
            "contas_discord",
            "campanhas_discord",
            "informacoes_campanha",
            "liberacoes_informacao",
            "saldos_personagem",
            "inventario_personagem",
            "lancamentos_economia",
            "eventos_auditoria",
            "catalogo_itens",
            "cofre_itens_usuario",
            "cofre_saldos_usuario",
            "movimentos_cofre",
            "biblioteca_conteudo",
        }
        with self.database.connection() as connection:
            rows = connection.execute(
                """
                SELECT tablename FROM pg_tables
                WHERE schemaname=current_schema()
                """
            ).fetchall()
        actual = {row["tablename"] for row in rows}
        self.assertTrue(expected.issubset(actual), expected - actual)

    def test_backup_cobre_todas_as_tabelas_do_schema(self):
        """Tabela nova sem lugar na ordem de backup ficaria fora do arquivo."""
        with self.database.connection() as connection:
            rows = connection.execute(
                """
                SELECT tablename FROM pg_tables WHERE schemaname=current_schema()
                """
            ).fetchall()
        existentes = {row["tablename"] for row in rows}
        cobertas = set(TABELAS) | TABELAS_IGNORADAS
        self.assertEqual(existentes - cobertas, set(), "adicione em core/backup.py")

    def test_backup_e_restauracao_preservam_os_dados(self):
        """Ciclo completo: grava, faz backup, apaga tudo e restaura."""
        usuario_id = uuid.uuid4()
        campanha_id = uuid.uuid4()
        personagem_id = uuid.uuid4()
        ficha = {"nivel": 7, "racaId": "humano", "notas": "acentuação e emoji ✦"}

        with self.database.connection() as connection:
            connection.execute(
                """
                INSERT INTO usuarios (id, email, nome_exibicao, senha_hash, papel_plataforma)
                VALUES (%s, 'dono@example.com', 'Dono', 'hash-falso', 'mestre')
                """,
                (usuario_id,),
            )
            connection.execute(
                "INSERT INTO campanhas (id, dono_id, nome) VALUES (%s, %s, 'Mesa')",
                (campanha_id, usuario_id),
            )
            connection.execute(
                """
                INSERT INTO personagens (id, campanha_id, dono_usuario_id, nome, ficha, criado_por)
                VALUES (%s, %s, %s, 'Lys', %s, %s)
                """,
                (personagem_id, campanha_id, usuario_id, Jsonb(ficha), usuario_id),
            )
            connection.execute(
                """
                INSERT INTO membros_campanha (campanha_id, usuario_id, papel, personagem_ativo_id)
                VALUES (%s, %s, 'mestre', %s)
                """,
                (campanha_id, usuario_id, personagem_id),
            )

        conteudo, resumo = gerar_backup(self.database)
        self.assertGreaterEqual(resumo["tabelas"]["personagens"], 1)
        # Sessões e limites de login não podem vazar para o arquivo.
        self.assertNotIn("sessoes_auth", resumo["tabelas"])

        resultado = restaurar_backup(self.database, conteudo, limpar=True)
        self.assertGreaterEqual(resultado["linhas"], 4)

        with self.database.connection() as connection:
            restaurado = connection.execute(
                "SELECT nome, ficha, campanha_id FROM personagens WHERE id=%s",
                (personagem_id,),
            ).fetchone()
            vinculo = connection.execute(
                """
                SELECT papel, personagem_ativo_id FROM membros_campanha
                WHERE campanha_id=%s AND usuario_id=%s
                """,
                (campanha_id, usuario_id),
            ).fetchone()
        self.assertEqual(restaurado["nome"], "Lys")
        self.assertEqual(restaurado["ficha"], ficha)
        self.assertEqual(restaurado["campanha_id"], campanha_id)
        self.assertEqual(vinculo["personagem_ativo_id"], personagem_id)

    def test_restaurar_recusa_arquivo_estranho(self):
        import gzip as _gzip

        lixo = _gzip.compress(b'{"formato":"outra-coisa"}\n')
        with self.assertRaises(ValueError):
            restaurar_backup(self.database, lixo)


if __name__ == "__main__":
    unittest.main()
