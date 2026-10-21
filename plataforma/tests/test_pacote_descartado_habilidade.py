from __future__ import annotations

import json
import os
import unittest
import uuid
from pathlib import Path

import psycopg
from psycopg import sql
from psycopg.conninfo import make_conninfo
from psycopg.types.json import Jsonb

from core.database import Database
from core.schema import MIGRATIONS, PACOTE_DESCARTADO_VIRA_HABILIDADE_SQL


TEST_DSN = (os.getenv("TEST_DATABASE_URL") or "").strip()
RAIZ = Path(__file__).resolve().parents[2]


class CatalogoTests(unittest.TestCase):
    def test_pacote_descartado_e_habilidade_do_nivel_1_e_nao_poder(self):
        dados = json.loads((RAIZ / "data" / "ficha" / "classes.json").read_text(encoding="utf-8"))
        classes = dados["classes"] if isinstance(dados, dict) else dados
        interceptador = next(item for item in classes if item["id"] == "interceptador")
        self.assertNotIn("pacote-descartado", {item["id"] for item in interceptador["poderes"]})
        pacote = next(item for item in interceptador["habilidades"] if item["id"] == "pacote-descartado")
        self.assertEqual(pacote["niveis"], [1])

    def test_migracao_57_esta_registrada(self):
        self.assertIn((57, "pacote_descartado_vira_habilidade"), {(numero, nome) for numero, nome, _ in MIGRATIONS})


@unittest.skipUnless(TEST_DSN, "TEST_DATABASE_URL nao configurada")
class PacoteDescartadoViraHabilidadeTests(unittest.TestCase):
    """Migração 57 contra um Postgres de verdade (schema isolado)."""

    def setUp(self):
        production_dsn = (os.getenv("DATABASE_URL") or "").strip()
        if TEST_DSN == production_dsn:
            self.fail("TEST_DATABASE_URL nao pode ser o banco de producao")
        self.schema = f"jardim_test_{uuid.uuid4().hex}"
        with psycopg.connect(TEST_DSN, autocommit=True) as connection:
            connection.execute(sql.SQL("CREATE SCHEMA {}").format(sql.Identifier(self.schema)))
        self.database = Database(make_conninfo(TEST_DSN, options=f"-c search_path={self.schema}"))
        self.database.open()

        self.usuario_id = uuid.uuid4()
        self.campanha_id = uuid.uuid4()
        with self.database.connection() as connection:
            connection.execute(
                """
                INSERT INTO usuarios (id, email, nome_exibicao, senha_hash, papel_plataforma)
                VALUES (%s, 'mestre@example.com', 'Mestre', 'hash', 'player')
                """,
                (self.usuario_id,),
            )
            connection.execute(
                "INSERT INTO campanhas (id, dono_id, nome) VALUES (%s, %s, 'Mesa')",
                (self.campanha_id, self.usuario_id),
            )

    def tearDown(self):
        self.database.close()
        with psycopg.connect(TEST_DSN, autocommit=True) as connection:
            connection.execute(
                sql.SQL("DROP SCHEMA IF EXISTS {} CASCADE").format(sql.Identifier(self.schema))
            )

    def _personagem(self, ficha: dict) -> uuid.UUID:
        personagem_id = uuid.uuid4()
        with self.database.connection() as connection:
            connection.execute(
                """
                INSERT INTO personagens (id, campanha_id, dono_usuario_id, nome, ficha, criado_por)
                VALUES (%s, %s, %s, 'Ficha', %s, %s)
                """,
                (personagem_id, self.campanha_id, self.usuario_id, Jsonb(ficha), self.usuario_id),
            )
        return personagem_id

    def _ler(self, personagem_id: uuid.UUID) -> tuple[dict, int]:
        with self.database.connection() as connection:
            linha = connection.execute(
                "SELECT ficha, versao FROM personagens WHERE id=%s", (personagem_id,)
            ).fetchone()
        return linha["ficha"], linha["versao"]

    def _migrar(self) -> None:
        with self.database.connection() as connection:
            connection.execute(PACOTE_DESCARTADO_VIRA_HABILIDADE_SQL)

    def test_so_a_escolha_do_pacote_sai_e_o_resto_fica_na_mesma_ordem(self):
        pacote = {"classeId": "interceptador", "poderId": "pacote-descartado"}
        latencia = {"classeId": "interceptador", "poderId": "latencia"}
        firewall = {"classeId": "interceptador", "poderId": "firewall-de-fluxo"}
        com_pacote = self._personagem({"poderesClasseSelecionados": [latencia, pacote, firewall]})
        so_pacote = self._personagem({"poderesClasseSelecionados": [pacote]})
        sem_pacote = self._personagem({"poderesClasseSelecionados": [latencia]})
        outra_classe = self._personagem({"poderesClasseSelecionados": [{"classeId": "canalizador", "poderId": "pacote-descartado"}]})
        sem_campo = self._personagem({"nome": "Sem poderes"})
        campo_quebrado = self._personagem({"poderesClasseSelecionados": "pacote-descartado"})

        self._migrar()

        ficha, versao = self._ler(com_pacote)
        self.assertEqual(ficha["poderesClasseSelecionados"], [latencia, firewall])
        self.assertEqual(versao, 2)
        self.assertEqual(self._ler(so_pacote)[0]["poderesClasseSelecionados"], [])
        for intocada in (sem_pacote, outra_classe, sem_campo, campo_quebrado):
            self.assertEqual(self._ler(intocada)[1], 1)
        self.assertNotIn("poderesClasseSelecionados", self._ler(sem_campo)[0])

        # Rodar de novo não mexe em nada.
        self._migrar()
        self.assertEqual(self._ler(com_pacote)[1], 2)


if __name__ == "__main__":
    unittest.main()
