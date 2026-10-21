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
from core.schema import FLUXO_INSTALADO_DA_AXIS_SQL, IDS_DE_TECNOLOGIA_DA_MIGRACAO_56


TEST_DSN = (os.getenv("TEST_DATABASE_URL") or "").strip()
RAIZ = Path(__file__).resolve().parents[2]


class IdsCongeladosTests(unittest.TestCase):
    def test_lista_congelada_cobre_toda_a_tecnologia_do_catalogo(self):
        # A lista da migração 56 é a foto do catálogo daquele dia: tudo nela é de Tecnologia e nada de
        # Tecnologia ficou de fora. Se um id de Tecnologia for criado depois, ele já nasce na regra nova e
        # este teste precisa apenas que a lista antiga continue existindo no catálogo.
        catalogo = json.loads((RAIZ / "data" / "ficha" / "magias.json").read_text(encoding="utf-8"))
        tecnologia = {
            item["id"]
            for chave in ("magias", "rituais", "selos", "encantamentos")
            for item in catalogo[chave]
            if item.get("fluxo") == "tecnologia"
        }
        self.assertEqual(len(IDS_DE_TECNOLOGIA_DA_MIGRACAO_56), len(set(IDS_DE_TECNOLOGIA_DA_MIGRACAO_56)))
        self.assertTrue(set(IDS_DE_TECNOLOGIA_DA_MIGRACAO_56) <= tecnologia)


@unittest.skipUnless(TEST_DSN, "TEST_DATABASE_URL nao configurada")
class FluxoInstaladoDaAxisTests(unittest.TestCase):
    """Migração 56 contra um Postgres de verdade (schema isolado)."""

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
            connection.execute(FLUXO_INSTALADO_DA_AXIS_SQL)

    def test_so_quem_nasceu_na_axis_e_ja_usava_tecnologia_ganha_o_fluxo_instalado(self):
        humano = self._personagem({"arvoreId": "keryx", "racaId": "humano", "magiasConhecidasIds": ["firewall"]})
        automato = self._personagem({"arvoreId": "keryx", "racaId": "automato", "magiasConhecidasIds": ["firewall"]})
        sem_tecnologia = self._personagem({"arvoreId": "keryx", "racaId": "humano", "magiasConhecidasIds": []})
        outra_arvore = self._personagem({"arvoreId": "aethel", "racaId": "humano", "magiasConhecidasIds": ["firewall"]})
        com_outro_fluxo = self._personagem({
            "arvoreId": "keryx", "racaId": "humano", "fluxosInstaladosIds": ["tempo"], "selosConhecidosIds": ["diagnostico"],
        })
        ja_instalado = self._personagem({
            "arvoreId": "keryx", "racaId": "humano", "fluxosInstaladosIds": ["tecnologia"], "magiasConhecidasIds": ["firewall"],
        })
        campo_quebrado = self._personagem({
            "arvoreId": "keryx", "racaId": "humano", "magiasConhecidasIds": "firewall",
            "rituaisConhecidosIds": ["montagem-de-automato"],
        })

        self._migrar()

        ficha, versao = self._ler(humano)
        self.assertEqual(ficha["fluxosInstaladosIds"], ["tecnologia"])
        self.assertEqual(versao, 2)
        for intocada in (automato, sem_tecnologia, outra_arvore, ja_instalado):
            ficha, versao = self._ler(intocada)
            self.assertEqual(versao, 1)
        self.assertNotIn("fluxosInstaladosIds", self._ler(automato)[0])
        self.assertEqual(self._ler(ja_instalado)[0]["fluxosInstaladosIds"], ["tecnologia"])
        self.assertEqual(self._ler(com_outro_fluxo)[0]["fluxosInstaladosIds"], ["tempo", "tecnologia"])
        self.assertEqual(self._ler(campo_quebrado)[0]["fluxosInstaladosIds"], ["tecnologia"])

        # Rodar de novo não mexe em nada: quem já tem a Tecnologia instalada fica de fora.
        self._migrar()
        self.assertEqual(self._ler(humano)[1], 2)
        self.assertEqual(self._ler(com_outro_fluxo)[0]["fluxosInstaladosIds"], ["tempo", "tecnologia"])


if __name__ == "__main__":
    unittest.main()
