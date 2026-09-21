"""Descobertas escondidas: catálogo, o que a tela pode mostrar e o registro no banco."""

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
from core.descobertas import CATALOGO, POR_CHAVE, montar_lista, ranking
from routers import descobertas as rota

TEST_DSN = (os.getenv("TEST_DATABASE_URL") or "").strip()


class CatalogoTests(unittest.TestCase):
    def test_chaves_unicas_e_todo_item_tem_nome_dica_e_raridade(self):
        chaves = [item.chave for item in CATALOGO]
        self.assertEqual(len(chaves), len(set(chaves)))
        self.assertGreaterEqual(len(CATALOGO), 8)
        for item in CATALOGO:
            self.assertTrue(item.nome and item.dica and item.raridade in {"comum", "rara"}, item.chave)
            self.assertIs(POR_CHAVE[item.chave], item)

    def test_a_dica_nunca_entrega_o_lugar_exato(self):
        proibidas = ("clique", "tecle", "digite", "xyzzy", "konami", "três horas", "3h")
        for item in CATALOGO:
            self.assertFalse(any(palavra in item.dica.lower() for palavra in proibidas), item.chave)

    def test_ninguem_achou_nada_mostra_interrogacao_com_dica(self):
        lista = montar_lista({}, {})
        self.assertTrue(all(item["nome"] == "???" and item["dica"] and not item["achei"] for item in lista))
        self.assertTrue(all(item["descobridores"] == [] for item in lista))

    def test_o_que_outro_achou_revela_o_nome_e_quem_achou_mas_ainda_convida_a_procurar(self):
        lista = {item["chave"]: item for item in montar_lista({}, {"coruja": ["Ana", "Bruno"]})}
        coruja = lista["coruja"]
        self.assertEqual(coruja["nome"], POR_CHAVE["coruja"].nome)
        self.assertEqual(coruja["descobridores"], ["Ana", "Bruno"])
        self.assertFalse(coruja["achei"])
        self.assertTrue(coruja["dica"])

    def test_o_que_eu_achei_perde_a_dica_e_ganha_data(self):
        lista = {item["chave"]: item for item in montar_lista({"vaidoso": "2026-09-21T20:00:00+00:00"}, {"vaidoso": ["Eu"]})}
        item = lista["vaidoso"]
        self.assertTrue(item["achei"])
        self.assertIsNone(item["dica"])
        self.assertEqual(item["achei_em"], "2026-09-21T20:00:00+00:00")

    def test_ranking_por_quantidade_e_depois_por_nome(self):
        rank = ranking({"a": ["Zed", "Ana"], "b": ["Ana", "Bia"], "c": ["Ana"]})
        self.assertEqual(rank, [{"nome": "Ana", "total": 3}, {"nome": "Bia", "total": 1}, {"nome": "Zed", "total": 1}])
        self.assertEqual(ranking({}), [])


@unittest.skipUnless(TEST_DSN, "TEST_DATABASE_URL nao configurada")
class DescobertasBancoTests(unittest.TestCase):
    def setUp(self):
        self.schema = f"jardim_test_{uuid.uuid4().hex}"
        with psycopg.connect(TEST_DSN, autocommit=True) as connection:
            connection.execute(sql.SQL("CREATE SCHEMA {}").format(sql.Identifier(self.schema)))
        self.database = Database(make_conninfo(TEST_DSN, options=f"-c search_path={self.schema}"))
        self.database.open()
        self.campanha = uuid.uuid4()
        self.mestre = self._usuario("d-mestre@example.com", "Mestre", "mestre")
        self.ana = self._usuario("d-ana@example.com", "Ana", "jogador")
        self.bruno = self._usuario("d-bruno@example.com", "Bruno", "jogador")
        self.de_fora = self._usuario("d-fora@example.com", "Fora", None)

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
                connection.execute("INSERT INTO campanhas (id, dono_id, nome) VALUES (%s, %s, 'Mesa')", (self.campanha, usuario.id))
            if papel:
                connection.execute(
                    "INSERT INTO membros_campanha (campanha_id, usuario_id, papel) VALUES (%s, %s, %s)",
                    (self.campanha, usuario.id, papel),
                )
        return usuario

    def registrar(self, usuario, chave):
        return rota.registrar(chave, user=usuario, database=self.database)

    def campanha_de(self, usuario):
        return rota.da_campanha(self.campanha, user=usuario, database=self.database)

    def test_registrar_e_novo_so_na_primeira_vez(self):
        primeira = self.registrar(self.ana, "coruja")
        self.assertTrue(primeira["nova"])
        self.assertEqual(primeira["nome"], POR_CHAVE["coruja"].nome)
        self.assertFalse(self.registrar(self.ana, "coruja")["nova"])
        self.assertEqual(rota.minhas(user=self.ana, database=self.database), {"achadas": ["coruja"]})
        self.assertEqual(rota.minhas(user=self.bruno, database=self.database), {"achadas": []})

    def test_chave_inventada_e_recusada(self):
        with self.assertRaises(HTTPException) as erro:
            self.registrar(self.ana, "nao-existe")
        self.assertEqual(erro.exception.status_code, 404)

    def test_mural_mostra_quem_achou_sem_dizer_onde_e_esconde_o_que_ninguem_achou(self):
        self.registrar(self.ana, "coruja")
        self.registrar(self.bruno, "coruja")
        self.registrar(self.bruno, "velho_truque")
        dados = self.campanha_de(self.ana)
        itens = {item["chave"]: item for item in dados["itens"]}
        self.assertEqual(itens["coruja"]["descobridores"], ["Ana", "Bruno"])
        self.assertTrue(itens["coruja"]["achei"])
        self.assertIsNone(itens["coruja"]["dica"])
        self.assertFalse(itens["velho_truque"]["achei"])
        self.assertEqual(itens["velho_truque"]["descobridores"], ["Bruno"])
        self.assertTrue(itens["velho_truque"]["dica"])
        self.assertEqual(itens["vaidoso"]["nome"], "???")
        self.assertEqual((dados["total"], dados["achadas_por_mim"]), (len(CATALOGO), 1))
        self.assertEqual(dados["ranking"][0], {"nome": "Bruno", "total": 2})

    def test_quem_nao_e_da_campanha_nao_aparece_nem_consulta(self):
        self.registrar(self.de_fora, "coruja")
        itens = {item["chave"]: item for item in self.campanha_de(self.ana)["itens"]}
        self.assertEqual(itens["coruja"]["descobridores"], [])
        with self.assertRaises(HTTPException) as erro:
            self.campanha_de(self.de_fora)
        self.assertEqual(erro.exception.status_code, 404)


if __name__ == "__main__":
    unittest.main()
