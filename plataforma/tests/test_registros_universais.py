"""Registros Universais: regras puras e banco real (papéis, recorte e ajuste de fábrica)."""

from __future__ import annotations

import os
import unittest
import uuid

import psycopg
from fastapi import HTTPException
from psycopg import sql
from psycopg.conninfo import make_conninfo

from core import registros_universais as regras
from core.database import Database
from core.dependencies import AuthenticatedUser
from core.registros_universais import ErroRegistro
from routers.registros_universais import RegistroInput, apagar, editar, obter, salvar


class RegrasTests(unittest.TestCase):
    def test_normaliza_e_limita(self):
        limpo = regras.normalizar_dados({
            "titulo": "  Lobo   Sombrio ",
            "descricao": "Um.\r\n\r\n\r\n\r\nDois.",
            "campos": [["Nível", "5"], ["", "x"], ["so-rotulo", ""], "lixo"],
            "blocos": [{"titulo": "Ataques", "itens": ["Mordida", "  "]}, {"titulo": "", "itens": ["x"]}],
            "etiquetas": ["a", "", "b"],
            "campo_desconhecido": "some",
        })
        self.assertEqual(limpo["titulo"], "Lobo Sombrio")
        self.assertEqual(limpo["descricao"], "Um.\n\nDois.")
        self.assertEqual(limpo["campos"], [["Nível", "5"]])
        self.assertEqual(limpo["blocos"], [{"titulo": "Ataques", "itens": ["Mordida"]}])
        self.assertEqual(limpo["etiquetas"], ["a", "b"])
        self.assertNotIn("campo_desconhecido", limpo)

    def test_campo_ausente_nao_entra_e_titulo_vazio_e_recusado(self):
        self.assertEqual(regras.normalizar_dados({"descricao": "x"}), {"descricao": "x"})
        with self.assertRaises(ErroRegistro):
            regras.normalizar_dados({"titulo": "   "})
        with self.assertRaises(ErroRegistro):
            regras.validar_secao("nada")
        with self.assertRaises(ErroRegistro):
            regras.validar_revelacao("talvez")

    def test_jogador_nao_recebe_texto_de_registro_fechado(self):
        base = {"id": uuid.uuid4(), "secao": "rumores", "origem_id": None, "dados": {"titulo": "Segredo", "descricao": "x"}}
        self.assertIsNone(regras.visao({**base, "revelacao": "oculto"}, gestor=False))
        self.assertEqual(regras.visao({**base, "revelacao": "rasurado"}, gestor=False)["dados"], {})
        self.assertEqual(regras.visao({**base, "revelacao": "aberto"}, gestor=False)["dados"]["titulo"], "Segredo")
        self.assertEqual(regras.visao({**base, "revelacao": "oculto"}, gestor=True)["dados"]["titulo"], "Segredo")

    def test_secoes_ocultas_pela_configuracao(self):
        self.assertEqual(regras.secoes_ocultas({}), set())
        self.assertEqual(regras.secoes_ocultas({"registros_universais_secoes_ocultas": ["bestiario", "lixo"]}), {"bestiario"})
        self.assertEqual(regras.secoes_ocultas({"registros_universais_ocultos": True}), set(regras.SECOES))
        self.assertEqual(regras.secoes_ocultas({"registros_universais_secoes_ocultas": "bestiario"}), set())


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
        self.mestre = self._usuario("ru-mestre@example.com", "Mestre", "mestre")
        self.ana = self._usuario("ru-ana@example.com", "Ana", "jogador")

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

    def _salvar(self, usuario, **dados):
        return salvar(self.campanha_id, RegistroInput(**dados), user=usuario, database=self.database)

    def test_jogador_le_o_recorte_mas_nao_escreve(self):
        self._salvar(self.mestre, secao="rumores", revelacao="aberto", dados={"titulo": "A ponte caiu", "descricao": "Dizem que sim."})
        self._salvar(self.mestre, secao="rumores", revelacao="rasurado", dados={"titulo": "Segredo do rei", "descricao": "Muito secreto"})
        self._salvar(self.mestre, secao="rumores", revelacao="oculto", dados={"titulo": "Traicao", "descricao": "Ninguem sabe"})
        with self.assertRaises(HTTPException) as erro:
            self._salvar(self.ana, secao="rumores", dados={"titulo": "Invasao"})
        self.assertEqual(erro.exception.status_code, 403)
        visto = obter(self.campanha_id, user=self.ana, database=self.database)
        self.assertFalse(visto["gestor"])
        self.assertEqual(len(visto["registros"]), 2)
        texto = str(visto)
        self.assertIn("A ponte caiu", texto)
        self.assertNotIn("Segredo do rei", texto)
        self.assertNotIn("Traicao", texto)
        self.assertEqual(len(obter(self.campanha_id, user=self.mestre, database=self.database)["registros"]), 3)

    def test_ajuste_de_fabrica_faz_upsert_e_apagar_volta_ao_original(self):
        primeiro = self._salvar(self.mestre, secao="bestiario", origem_id="lobo-cinzento", dados={"descricao": "Versao da mesa"})
        segundo = self._salvar(self.mestre, secao="bestiario", origem_id="lobo-cinzento", revelacao="rasurado", dados={"descricao": "Outra"})
        self.assertEqual(primeiro["id"], segundo["id"])
        self.assertEqual(len(segundo["registros"]), 1)
        self.assertEqual(segundo["registros"][0]["revelacao"], "rasurado")
        # Sem origem, o registro precisa de titulo.
        with self.assertRaises(HTTPException):
            self._salvar(self.mestre, secao="rumores", dados={"descricao": "sem titulo"})
        restante = apagar(self.campanha_id, uuid.UUID(primeiro["id"]), user=self.mestre, database=self.database)
        self.assertEqual(restante["registros"], [])
        with self.assertRaises(HTTPException) as erro:
            apagar(self.campanha_id, uuid.UUID(primeiro["id"]), user=self.mestre, database=self.database)
        self.assertEqual(erro.exception.status_code, 404)

    def test_secao_escondida_pelo_criador_some_para_o_jogador_mas_nao_para_o_mestre(self):
        from psycopg.types.json import Jsonb
        self._salvar(self.mestre, secao="rumores", dados={"titulo": "Rumor"})
        self._salvar(self.mestre, secao="glossario", dados={"titulo": "Termo"})
        with self.database.connection() as connection:
            connection.execute(
                "UPDATE campanhas SET configuracoes=%s WHERE id=%s",
                (Jsonb({"registros_universais_secoes_ocultas": ["rumores"]}), self.campanha_id),
            )
        secoes = {r["secao"] for r in obter(self.campanha_id, user=self.ana, database=self.database)["registros"]}
        self.assertEqual(secoes, {"glossario"})
        self.assertEqual(len(obter(self.campanha_id, user=self.mestre, database=self.database)["registros"]), 2)
        with self.database.connection() as connection:
            connection.execute("UPDATE campanhas SET configuracoes=%s WHERE id=%s", (Jsonb({"registros_universais_ocultos": True}), self.campanha_id))
        self.assertEqual(obter(self.campanha_id, user=self.ana, database=self.database)["registros"], [])

    def test_editar_pelo_id_troca_revelacao_e_dados(self):
        criado = self._salvar(self.mestre, secao="glossario", dados={"titulo": "Lunaris", "descricao": "A moeda."})
        depois = editar(
            self.campanha_id, uuid.UUID(criado["id"]),
            RegistroInput(secao="glossario", revelacao="aberto", dados={"titulo": "Lunaris", "descricao": "A moeda comum do Jardim."}),
            user=self.mestre, database=self.database,
        )
        self.assertEqual(depois["registros"][0]["dados"]["descricao"], "A moeda comum do Jardim.")


if __name__ == "__main__":
    unittest.main()
