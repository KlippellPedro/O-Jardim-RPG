"""Saque do Cofre bancário do Banqueiro direto pra uma ficha.

O saldo de "Guardado no banco" mora em `cofre_saldo`, tabela do bot. A página
do Cofre sempre soube exibi-lo, mas não havia rota nenhuma — nem no site nem
no Discord — que o levasse até um personagem: o dinheiro ficava visível e
preso. `POST /cofre/sacar-banco` fecha esse caminho.

Roda contra um Postgres real (schema isolado por teste) porque a operação
cruza duas tabelas com `FOR UPDATE` numa transação só, e o ponto do teste é
justamente que ela é atômica — mesmo padrão de test_vault_unificado.py.
"""

from __future__ import annotations

import os
import unittest
import uuid

import psycopg
from psycopg import sql
from psycopg.conninfo import make_conninfo

from fastapi import HTTPException

from core.database import Database
from routers.vault import withdraw_bank_vault_to_character
from schemas import VaultTransferCurrencyInput


TEST_DSN = (os.getenv("TEST_DATABASE_URL") or "").strip()


class _Usuario:
    def __init__(self, user_id):
        self.id = user_id


@unittest.skipUnless(TEST_DSN, "TEST_DATABASE_URL nao configurada")
class SaqueCofreBancarioTests(unittest.TestCase):
    GUILD = "555000111222"
    DISCORD_USER = "100200300"

    def setUp(self):
        if TEST_DSN == (os.getenv("DATABASE_URL") or "").strip():
            self.fail("TEST_DATABASE_URL nao pode ser o banco de producao")
        self.schema = f"jardim_test_{uuid.uuid4().hex}"
        with psycopg.connect(TEST_DSN, autocommit=True) as connection:
            connection.execute(
                sql.SQL("CREATE SCHEMA {}").format(sql.Identifier(self.schema))
            )
        self.database = Database(
            make_conninfo(TEST_DSN, options=f"-c search_path={self.schema}")
        )
        self.database.open()
        # Tabelas do bot Banqueiro: ZIPs separados na Discloud, mesmo banco.
        with self.database.connection() as connection:
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS cofre_saldo (
                    guild_id TEXT NOT NULL, user_id TEXT NOT NULL, moeda TEXT NOT NULL,
                    saldo INTEGER NOT NULL DEFAULT 0,
                    PRIMARY KEY (guild_id, user_id, moeda)
                )
                """
            )
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS extrato (
                    id SERIAL PRIMARY KEY, guild_id TEXT NOT NULL, user_id TEXT NOT NULL,
                    delta INTEGER NOT NULL, moeda TEXT NOT NULL, descricao TEXT NOT NULL,
                    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
        self.usuario_id, self.campanha_id, self.personagem_id = self._conta(vincular=True)

    def tearDown(self):
        self.database.close()
        with psycopg.connect(TEST_DSN, autocommit=True) as connection:
            connection.execute(
                sql.SQL("DROP SCHEMA {} CASCADE").format(sql.Identifier(self.schema))
            )

    def _conta(self, *, vincular: bool, saldo: int = 500):
        usuario_id, campanha_id, personagem_id = uuid.uuid4(), uuid.uuid4(), uuid.uuid4()
        with self.database.connection() as connection:
            connection.execute(
                """
                INSERT INTO usuarios (id, email, nome_exibicao, senha_hash, papel_plataforma)
                VALUES (%s, %s, 'Jogador', 'hash', 'player')
                """,
                (usuario_id, f"{usuario_id}@example.com"),
            )
            connection.execute(
                "INSERT INTO campanhas (id, dono_id, nome) VALUES (%s, %s, 'Mesa')",
                (campanha_id, usuario_id),
            )
            connection.execute(
                "INSERT INTO membros_campanha (campanha_id, usuario_id, papel) VALUES (%s, %s, 'jogador')",
                (campanha_id, usuario_id),
            )
            connection.execute(
                """
                INSERT INTO personagens (id, campanha_id, dono_usuario_id, criado_por, nome)
                VALUES (%s, %s, %s, %s, 'Guaxi')
                """,
                (personagem_id, campanha_id, usuario_id, usuario_id),
            )
            if vincular:
                connection.execute(
                    "INSERT INTO contas_discord (usuario_id, discord_user_id) VALUES (%s, %s)",
                    (usuario_id, self.DISCORD_USER),
                )
                connection.execute(
                    """
                    INSERT INTO campanhas_discord (campanha_id, discord_guild_id, vinculado_por)
                    VALUES (%s, %s, %s)
                    """,
                    (campanha_id, self.GUILD, usuario_id),
                )
                connection.execute(
                    "INSERT INTO cofre_saldo (guild_id, user_id, moeda, saldo) VALUES (%s, %s, 'Lunaris', %s)",
                    (self.GUILD, self.DISCORD_USER, saldo),
                )
        return usuario_id, campanha_id, personagem_id

    def _sacar(self, quantidade: int, *, moeda: str = "Lunaris", personagem_id=None):
        return withdraw_bank_vault_to_character(
            payload=VaultTransferCurrencyInput(
                campanha_id=self.campanha_id,
                personagem_id=personagem_id or self.personagem_id,
                moeda=moeda,
                quantidade=quantidade,
            ),
            user=_Usuario(self.usuario_id),
            database=self.database,
        )

    def _saldos(self):
        with self.database.connection() as connection:
            cofre = connection.execute(
                "SELECT saldo FROM cofre_saldo WHERE guild_id=%s AND user_id=%s AND moeda='Lunaris'",
                (self.GUILD, self.DISCORD_USER),
            ).fetchone()
            ficha = connection.execute(
                """
                SELECT saldo FROM saldos_personagem
                WHERE campanha_id=%s AND personagem_id=%s AND moeda='Lunaris'
                """,
                (self.campanha_id, self.personagem_id),
            ).fetchone()
        return (
            int(cofre["saldo"]) if cofre else 0,
            int(ficha["saldo"]) if ficha else 0,
        )

    def test_saque_move_do_cofre_bancario_para_a_ficha(self):
        resultado = self._sacar(200)

        self.assertEqual(resultado["restante"], 300)
        self.assertEqual(int(resultado["saldo_personagem"]), 200)
        self.assertEqual(self._saldos(), (300, 200))

    def test_saques_sucessivos_somam_na_ficha(self):
        self._sacar(200)
        self._sacar(300)

        self.assertEqual(self._saldos(), (0, 500))

    def test_saque_registra_extrato_no_discord(self):
        """O jogador tem que ver a saída em /extrato, não só na ficha."""
        self._sacar(120)

        with self.database.connection() as connection:
            linha = connection.execute(
                "SELECT delta, moeda, descricao FROM extrato WHERE guild_id=%s AND user_id=%s",
                (self.GUILD, self.DISCORD_USER),
            ).fetchone()
        self.assertEqual(int(linha["delta"]), -120)
        self.assertEqual(linha["moeda"], "Lunaris")
        self.assertIn("Guaxi", linha["descricao"])

    def test_saque_bump_economia_versao_para_a_ficha_recarregar(self):
        antes = self._sacar(10)["economia_versao"]
        depois = self._sacar(10)["economia_versao"]

        self.assertEqual(depois, antes + 1)

    def test_saldo_insuficiente_nao_move_nada(self):
        with self.assertRaises(HTTPException) as erro:
            self._sacar(501)

        self.assertEqual(erro.exception.status_code, 409)
        self.assertEqual(self._saldos(), (500, 0))

    def test_moeda_sem_saldo_guardado_recusa(self):
        with self.assertRaises(HTTPException) as erro:
            self._sacar(1, moeda="Solares")

        self.assertEqual(erro.exception.status_code, 409)

    def test_personagem_de_outra_pessoa_recusa(self):
        _outro_usuario, _outra_campanha, personagem_alheio = self._conta(vincular=False)

        with self.assertRaises(HTTPException) as erro:
            self._sacar(10, personagem_id=personagem_alheio)

        self.assertEqual(erro.exception.status_code, 422)
        self.assertEqual(self._saldos(), (500, 0))

    def test_conta_sem_discord_vinculado_recusa(self):
        self.usuario_id, self.campanha_id, self.personagem_id = self._conta(vincular=False)

        with self.assertRaises(HTTPException) as erro:
            self._sacar(10)

        self.assertEqual(erro.exception.status_code, 409)


if __name__ == "__main__":
    unittest.main()
