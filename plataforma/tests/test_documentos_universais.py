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
from routers.documentos import EdicaoUniversalInput, editar_universal, listar_universais, restaurar_universal

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
                return universais.listar()["documentos"]

    def test_o_arquivo_do_repositorio_carrega_inteiro(self):
        bruto = json.loads((RAIZ / "data" / "documentos" / "universais.json").read_text(encoding="utf-8"))
        resultado = universais.listar()
        lista = resultado["documentos"]
        self.assertGreaterEqual(len(lista), 24)
        self.assertEqual(len(lista), len(bruto["documentos"]), "algum documento do arquivo foi descartado como malformado")
        self.assertEqual(len(resultado["missoes"]), len(bruto["missoes"]), "alguma missão do arquivo foi descartada")
        ids_de_missao = {missao["id"] for missao in resultado["missoes"]}
        for missao in resultado["missoes"]:
            self.assertTrue([doc for doc in lista if doc["missao"] == missao["id"]], f"missão sem papel: {missao['id']}")
        self.assertTrue(all(doc["missao"] in ids_de_missao for doc in lista if doc["missao"]))
        self.assertFalse(any(doc["editado"] for doc in lista))
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
                _doc(id="missao-que-nao-existe", missao="sumiu"),
                "nem objeto",
            ],
        })
        self.assertEqual([doc["id"] for doc in lista], ["carta-teste"])

    def test_formato_desconhecido_ou_arquivo_ausente_vira_lista_vazia(self):
        self.assertEqual(self._ler({"formato": "outro", "documentos": [_doc()]}), [])
        with tempfile.TemporaryDirectory() as pasta:
            universais._arquivo.cache_clear()
            with mock.patch.object(universais, "_localizar_data_root", return_value=Path(pasta)):
                self.assertEqual(universais.listar(), {"missoes": [], "documentos": []})

    def test_edicao_vai_por_cima_do_arquivo_e_o_modelo_continua(self):
        oficial = universais.listar()["documentos"][0]
        edicao = {"titulo": "Outro", "ensina": "a", "entregar": "b", "campos": {"texto": "novo"}, "atualizado_em": None}
        editado = next(doc for doc in universais.listar({oficial["id"]: edicao})["documentos"] if doc["id"] == oficial["id"])
        self.assertEqual((editado["titulo"], editado["campos"], editado["modelo"]), ("Outro", {"texto": "novo"}, oficial["modelo"]))
        self.assertTrue(editado["editado"])
        self.assertEqual(universais.normalizar_edicao("  Novo   nome ", " a ", "b", {"x": "y"})["titulo"], "Novo nome")
        with self.assertRaises(universais.ErroDocumento):
            universais.normalizar_edicao("ok", "x" * (universais.MAX_NOTA + 1), "", {})


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
        self.criador = self._usuario("uni-criador@example.com", "mestre-criador")

    def tearDown(self):
        self.database.close()
        with psycopg.connect(TEST_DSN, autocommit=True) as connection:
            connection.execute(sql.SQL("DROP SCHEMA IF EXISTS {} CASCADE").format(sql.Identifier(self.schema)))

    def _usuario(self, email, papel):
        usuario = AuthenticatedUser(
            id=uuid.uuid4(), email=email, nome_exibicao=email.split("@")[0], admin_plataforma=False,
            papel_plataforma="criador" if papel == "mestre-criador" else "player", session_id=uuid.uuid4(), csrf_hash="hash",
        )
        with self.database.connection() as connection:
            connection.execute(
                "INSERT INTO usuarios (id, email, nome_exibicao, senha_hash, papel_plataforma) VALUES (%s, %s, %s, 'hash', %s)",
                (usuario.id, email, usuario.nome_exibicao, usuario.papel_plataforma),
            )
            if papel == "mestre-criador":
                return usuario
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
            resposta = listar_universais(self.campanha_id, user=usuario, database=self.database)
            self.assertGreaterEqual(len(resposta["documentos"]), 24)
            self.assertIn("campos", resposta["documentos"][0])
            self.assertFalse(resposta["pode_editar"], "Mestre de campanha não edita o que vale para todas")
        # Jogador da mesa é barrado; quem nem é da mesa não descobre que a campanha existe.
        for usuario, codigo in ((self.ana, 403), (self.estranho, 404)):
            with self.assertRaises(HTTPException) as erro:
                listar_universais(self.campanha_id, user=usuario, database=self.database)
            self.assertEqual(erro.exception.status_code, codigo)

    def _editar(self, usuario, documento_id, **dados):
        dados.setdefault("titulo", "Lição corrigida")
        dados.setdefault("ensina", "Nota nova.")
        dados.setdefault("entregar", "Quando quiser.")
        dados.setdefault("campos", {"texto": "Texto novo.", "assinatura": "Tito"})
        return editar_universal(documento_id, EdicaoUniversalInput(**dados), user=usuario, database=self.database)

    def test_so_o_criador_edita_e_a_edicao_vale_para_todas_as_campanhas(self):
        alvo = "licao-o-que-tem-dentro-do-jardim"
        for usuario in (self.mestre, self.assistente, self.ana):
            with self.assertRaises(HTTPException) as erro:
                self._editar(usuario, alvo)
            self.assertEqual(erro.exception.status_code, 403)
        editado = self._editar(self.criador, alvo)
        self.assertEqual((editado["titulo"], editado["modelo"], editado["editado"]), ("Lição corrigida", "diario", True))
        self.assertEqual(editado["campos"], {"texto": "Texto novo.", "assinatura": "Tito"})
        visto_pelo_mestre = next(
            doc for doc in listar_universais(self.campanha_id, user=self.mestre, database=self.database)["documentos"] if doc["id"] == alvo
        )
        self.assertEqual(visto_pelo_mestre["titulo"], "Lição corrigida")
        self.assertTrue(listar_universais(self.campanha_id, user=self.criador, database=self.database)["pode_editar"])
        with self.assertRaises(HTTPException) as erro:
            restaurar_universal(alvo, user=self.mestre, database=self.database)
        self.assertEqual(erro.exception.status_code, 403)
        original = restaurar_universal(alvo, user=self.criador, database=self.database)
        self.assertFalse(original["editado"])
        self.assertEqual(original["titulo"], "Lição de casa: o que tem dentro do Jardim")

    def test_documento_desconhecido_e_campo_invalido_sao_recusados(self):
        with self.assertRaises(HTTPException) as erro:
            self._editar(self.criador, "nao-existe")
        self.assertEqual(erro.exception.status_code, 404)
        with self.assertRaises(HTTPException) as erro:
            self._editar(self.criador, "licao-o-que-tem-dentro-do-jardim", campos={"nome com espaco": "x"})
        self.assertEqual(erro.exception.status_code, 422)


if __name__ == "__main__":
    unittest.main()
