"""Documentos universais: o arquivo do repositório, a leitura tolerante e quem pode ler pela rota."""

from __future__ import annotations

import json
import os
import tempfile
import unittest
import uuid
from pathlib import Path
from unittest import mock

import psycopg
from fastapi import HTTPException
from psycopg import sql
from psycopg.conninfo import make_conninfo

from core import documentos_universais as universais
from core.database import Database
from core.dependencies import AuthenticatedUser
from routers.documentos import listar_universais

TEST_DSN = (os.getenv("TEST_DATABASE_URL") or "").strip()
RAIZ = Path(__file__).resolve().parents[2]


def _doc(**mudancas):
    base = {
        "id": "carta-teste",
        "tema": "Fluxos",
        "titulo": "Carta de teste",
        "ensina": "Nada.",
        "entregar": "Nunca.",
        "fontes": ["fluxo:fluxo-do-tempo"],
        "inventado": [],
        "modelo": "carta",
        "campos": {"corpo": "Texto.", "papel": "envelhecido"},
    }
    base.update(mudancas)
    return base


class ArquivoTests(unittest.TestCase):
    def tearDown(self):
        universais._arquivo.cache_clear()

    def _ler(self, dados):
        with tempfile.TemporaryDirectory() as pasta:
            (Path(pasta) / "documentos").mkdir()
            (Path(pasta) / "documentos" / "universais.json").write_text(json.dumps(dados), encoding="utf-8")
            universais._arquivo.cache_clear()
            with mock.patch.object(universais, "_localizar_data_root", return_value=Path(pasta)):
                return universais.listar()

    def test_o_arquivo_do_repositorio_carrega_inteiro(self):
        bruto = json.loads((RAIZ / "data" / "documentos" / "universais.json").read_text(encoding="utf-8"))
        lista = universais.listar()
        self.assertGreaterEqual(len(lista), 17)
        self.assertEqual(len(lista), len(bruto["documentos"]), "algum documento do arquivo foi descartado como malformado")
        self.assertEqual(len({doc["id"] for doc in lista}), len(lista))
        for doc in lista:
            self.assertTrue(all(isinstance(valor, str) for valor in doc["campos"].values()), doc["id"])

    def test_documento_malformado_ou_repetido_fica_de_fora(self):
        lista = self._ler({
            "formato": universais.FORMATO,
            "documentos": [
                _doc(),
                _doc(),
                _doc(id="Sem Forma"),
                _doc(id="sem-modelo", modelo="../carta"),
                _doc(id="campo-numero", campos={"corpo": 3}),
                _doc(id="sem-titulo", titulo="  "),
                _doc(id="fontes-erradas", fontes="fluxo"),
                "nem objeto",
            ],
        })
        self.assertEqual([doc["id"] for doc in lista], ["carta-teste"])

    def test_formato_desconhecido_ou_arquivo_ausente_vira_lista_vazia(self):
        self.assertEqual(self._ler({"formato": "outro", "documentos": [_doc()]}), [])
        with tempfile.TemporaryDirectory() as pasta:
            universais._arquivo.cache_clear()
            with mock.patch.object(universais, "_localizar_data_root", return_value=Path(pasta)):
                self.assertEqual(universais.listar(), [])


@unittest.skipUnless(TEST_DSN, "TEST_DATABASE_URL nao configurada")
class RotaTests(unittest.TestCase):
    def setUp(self):
        if TEST_DSN == (os.getenv("DATABASE_URL") or "").strip():
            self.fail("TEST_DATABASE_URL nao pode ser o banco de producao")
        self.schema = f"jardim_test_{uuid.uuid4().hex}"
        with psycopg.connect(TEST_DSN, autocommit=True) as connection:
            connection.execute(sql.SQL("CREATE SCHEMA {}").format(sql.Identifier(self.schema)))
        self.database = Database(make_conninfo(TEST_DSN, options=f"-c search_path={self.schema}"))
        self.database.open()
        self.campanha_id = uuid.uuid4()
        self.mestre = self._usuario("uni-mestre@example.com", "mestre")
        self.assistente = self._usuario("uni-assistente@example.com", "assistente")
        self.ana = self._usuario("uni-ana@example.com", "jogador")
        self.estranho = self._usuario("uni-estranho@example.com", None)

    def tearDown(self):
        self.database.close()
        with psycopg.connect(TEST_DSN, autocommit=True) as connection:
            connection.execute(sql.SQL("DROP SCHEMA IF EXISTS {} CASCADE").format(sql.Identifier(self.schema)))

    def _usuario(self, email, papel):
        usuario = AuthenticatedUser(
            id=uuid.uuid4(), email=email, nome_exibicao=email.split("@")[0], admin_plataforma=False,
            papel_plataforma="player", session_id=uuid.uuid4(), csrf_hash="hash",
        )
        with self.database.connection() as connection:
            connection.execute(
                "INSERT INTO usuarios (id, email, nome_exibicao, senha_hash, papel_plataforma) VALUES (%s, %s, %s, 'hash', 'player')",
                (usuario.id, email, usuario.nome_exibicao),
            )
            if papel == "mestre":
                connection.execute("INSERT INTO campanhas (id, dono_id, nome) VALUES (%s, %s, 'Mesa')", (self.campanha_id, usuario.id))
            if papel:
                connection.execute(
                    "INSERT INTO membros_campanha (campanha_id, usuario_id, papel) VALUES (%s, %s, %s)",
                    (self.campanha_id, usuario.id, papel),
                )
        return usuario

    def test_so_quem_comanda_a_mesa_le(self):
        for usuario in (self.mestre, self.assistente):
            documentos = listar_universais(self.campanha_id, user=usuario, database=self.database)["documentos"]
            self.assertGreaterEqual(len(documentos), 17)
            self.assertIn("campos", documentos[0])
        # Jogador da mesa é barrado; quem nem é da mesa não descobre que a campanha existe.
        for usuario, codigo in ((self.ana, 403), (self.estranho, 404)):
            with self.assertRaises(HTTPException) as erro:
                listar_universais(self.campanha_id, user=usuario, database=self.database)
            self.assertEqual(erro.exception.status_code, codigo)


if __name__ == "__main__":
    unittest.main()
