"""Documentos do Mestre: regras puras e banco real (papéis, limites, lista sem campos, duplicar campanha)."""

from __future__ import annotations

import base64
import os
import unittest
import uuid

import psycopg
from fastapi import HTTPException
from psycopg import sql
from psycopg.conninfo import make_conninfo

from core import documentos as regras
from core.database import Database
from core.dependencies import AuthenticatedUser
from core.documentos import ErroDocumento
from routers.documentos import DocumentoInput, apagar, criar, editar, listar, obter

PNG_MINIMO = "data:image/png;base64," + base64.b64encode(b"\x89PNG\r\n\x1a\n" + b"0" * 32).decode()


class RegrasTests(unittest.TestCase):
    def test_modelo_e_titulo(self):
        self.assertEqual(regras.validar_modelo(" procurado "), "procurado")
        self.assertEqual(regras.validar_modelo("cartao-visita"), "cartao-visita")
        for ruim in ("", "Procurado", "../x", "a" * 60, None, 3):
            with self.assertRaises(ErroDocumento):
                regras.validar_modelo(ruim)
        self.assertEqual(regras.normalizar_titulo("  Procurado:   Corvo  "), "Procurado: Corvo")
        self.assertEqual(len(regras.normalizar_titulo("x" * 500)), regras.MAX_TITULO)
        with self.assertRaises(ErroDocumento):
            regras.normalizar_titulo("   ")

    def test_campos_viram_texto_limpo(self):
        limpos = regras.normalizar_campos({
            "nome": "Corvo",
            "corpo": "Um.\r\n\r\n\r\n\r\n\r\nDois.   \n",
            "vazio": "",
            "ausente": None,
            "retrato": PNG_MINIMO,
        })
        self.assertEqual(limpos["nome"], "Corvo")
        self.assertEqual(limpos["corpo"], "Um.\n\n\nDois.")
        self.assertEqual(limpos["vazio"], "", "campo apagado de propósito continua vazio")
        self.assertNotIn("ausente", limpos)
        self.assertEqual(limpos["retrato"], PNG_MINIMO)
        self.assertEqual(len(regras.normalizar_campos({"corpo": "a" * 10_000})["corpo"]), regras.MAX_TEXTO)

    def test_campos_recusados(self):
        casos = [
            {"1nome": "x"},
            {"nome com espaço": "x"},
            {"nome": 3},
            {"nome": ["x"]},
            {"retrato": "data:image/gif;base64,R0lGOD"},
            {"retrato": "data:image/png;base64,isto nao e base64!"},
            {f"c{i}": "x" for i in range(regras.MAX_CAMPOS + 1)},
        ]
        for campos in casos:
            with self.subTest(campos=str(campos)[:60]), self.assertRaises(ErroDocumento):
                regras.normalizar_campos(campos)
        with self.assertRaises(ErroDocumento):
            regras.normalizar_campos(["lista"])
        grande = "data:image/png;base64," + "A" * regras.MAX_IMAGEM
        with self.assertRaises(ErroDocumento) as erro:
            regras.normalizar_campos({"retrato": grande})
        self.assertEqual(erro.exception.codigo, 413)

    def test_soma_das_imagens_tem_teto(self):
        imagem = "data:image/png;base64," + "A" * (regras.MAX_IMAGEM - 100)
        with self.assertRaises(ErroDocumento) as erro:
            regras.normalizar_campos({"a": imagem, "b": imagem, "c": imagem})
        self.assertEqual(erro.exception.codigo, 413)


TEST_DSN = (os.getenv("TEST_DATABASE_URL") or "").strip()


@unittest.skipUnless(TEST_DSN, "TEST_DATABASE_URL nao configurada")
class BancoTests(unittest.TestCase):
    def setUp(self):
        if TEST_DSN == (os.getenv("DATABASE_URL") or "").strip():
            self.fail("TEST_DATABASE_URL nao pode ser o banco de producao")
        self.schema = f"jardim_test_{uuid.uuid4().hex}"
        with psycopg.connect(TEST_DSN, autocommit=True) as connection:
            connection.execute(sql.SQL("CREATE SCHEMA {}").format(sql.Identifier(self.schema)))
        self.database = Database(make_conninfo(TEST_DSN, options=f"-c search_path={self.schema}"))
        self.database.open()
        self.campanha_id = uuid.uuid4()
        self.mestre = self._usuario("doc-mestre@example.com", "Mestre", "mestre")
        self.assistente = self._usuario("doc-assistente@example.com", "Assistente", "assistente")
        self.ana = self._usuario("doc-ana@example.com", "Ana", "jogador")

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

    def _criar(self, usuario, **dados):
        dados.setdefault("modelo", "procurado")
        dados.setdefault("titulo", "Procurado: Corvo")
        dados.setdefault("campos", {"nome": "Corvo", "retrato": PNG_MINIMO})
        return criar(self.campanha_id, DocumentoInput(**dados), user=usuario, database=self.database)

    def test_mestre_e_assistente_escrevem_e_jogador_nao_le_nem_escreve(self):
        doc = self._criar(self.mestre)
        self.assertEqual(doc["campos"]["nome"], "Corvo")
        self._criar(self.assistente, titulo="Carta", modelo="carta", campos={})
        for chamada in (
            lambda: listar(self.campanha_id, user=self.ana, database=self.database),
            lambda: obter(self.campanha_id, uuid.UUID(doc["id"]), user=self.ana, database=self.database),
            lambda: self._criar(self.ana),
            lambda: apagar(self.campanha_id, uuid.UUID(doc["id"]), user=self.ana, database=self.database),
        ):
            with self.assertRaises(HTTPException) as erro:
                chamada()
            self.assertEqual(erro.exception.status_code, 403)

    def test_lista_vem_sem_campos_e_o_documento_inteiro_pela_rota_do_id(self):
        doc = self._criar(self.mestre)
        lista = listar(self.campanha_id, user=self.mestre, database=self.database)["documentos"]
        self.assertEqual([item["id"] for item in lista], [doc["id"]])
        self.assertNotIn("campos", lista[0])
        self.assertNotIn("base64", str(lista))
        inteiro = obter(self.campanha_id, uuid.UUID(doc["id"]), user=self.mestre, database=self.database)
        self.assertEqual(inteiro["campos"]["retrato"], PNG_MINIMO)

    def test_editar_troca_tudo_e_documento_de_outra_campanha_nao_aparece(self):
        doc = self._criar(self.mestre)
        editado = editar(
            self.campanha_id, uuid.UUID(doc["id"]),
            DocumentoInput(modelo="procurado", titulo="  Procurado:  Corvo de Três Dedos ", campos={"nome": "Corvo de Três Dedos"}),
            user=self.mestre, database=self.database,
        )
        self.assertEqual(editado["titulo"], "Procurado: Corvo de Três Dedos")
        self.assertEqual(editado["campos"], {"nome": "Corvo de Três Dedos"}, "o retrato tirado sai do documento")
        with self.assertRaises(HTTPException) as erro:
            obter(uuid.uuid4(), uuid.UUID(doc["id"]), user=self.mestre, database=self.database)
        self.assertEqual(erro.exception.status_code, 404)
        with self.assertRaises(HTTPException) as erro:
            editar(self.campanha_id, uuid.uuid4(), DocumentoInput(modelo="carta", titulo="x"), user=self.mestre, database=self.database)
        self.assertEqual(erro.exception.status_code, 404)

    def test_entrada_invalida_e_recusada_antes_do_banco(self):
        with self.assertRaises(HTTPException) as erro:
            self._criar(self.mestre, modelo="Nada Disso")
        self.assertEqual(erro.exception.status_code, 422)
        with self.assertRaises(HTTPException) as erro:
            self._criar(self.mestre, campos={"retrato": "data:image/png;base64," + "A" * regras.MAX_IMAGEM})
        self.assertEqual(erro.exception.status_code, 413)

    def test_apagar_e_limite_por_campanha(self):
        doc = self._criar(self.mestre)
        self.assertEqual(apagar(self.campanha_id, uuid.UUID(doc["id"]), user=self.mestre, database=self.database), {"ok": True})
        with self.assertRaises(HTTPException) as erro:
            apagar(self.campanha_id, uuid.UUID(doc["id"]), user=self.mestre, database=self.database)
        self.assertEqual(erro.exception.status_code, 404)
        with self.database.connection() as connection:
            for indice in range(regras.MAX_DOCUMENTOS_POR_CAMPANHA):
                connection.execute(
                    "INSERT INTO campanha_documentos (id, campanha_id, modelo, titulo) VALUES (%s, %s, 'carta', %s)",
                    (uuid.uuid4(), self.campanha_id, f"Carta {indice}"),
                )
        with self.assertRaises(HTTPException) as erro:
            self._criar(self.mestre)
        self.assertEqual(erro.exception.status_code, 409)

    def test_duplicar_campanha_leva_os_documentos(self):
        from routers.campanha_painel import duplicar

        self._criar(self.mestre)
        with self.database.connection() as connection:
            connection.execute("UPDATE usuarios SET papel_plataforma='mestre' WHERE id=%s", (self.mestre.id,))
        mestre = AuthenticatedUser(
            id=self.mestre.id, email=self.mestre.email, nome_exibicao="Mestre", admin_plataforma=False,
            papel_plataforma="mestre", session_id=uuid.uuid4(), csrf_hash="hash",
        )
        nova = duplicar(self.campanha_id, user=mestre, database=self.database)
        copiados = listar(uuid.UUID(nova["id"]), user=mestre, database=self.database)["documentos"]
        self.assertEqual([item["titulo"] for item in copiados], ["Procurado: Corvo"])


if __name__ == "__main__":
    unittest.main()
