"""O Criador da plataforma entra em qualquer campanha sem ser membro: ele aparece na lista de
jogadores do mapa e escolhe o próprio nome e a própria cor (routers/campaigns.py, migração 71)."""

from __future__ import annotations

import os
import unittest
import uuid

import psycopg
from fastapi import HTTPException
from psycopg import sql
from psycopg.conninfo import make_conninfo

from core import tempo_real

TEST_DSN = (os.getenv("TEST_DATABASE_URL") or "").strip()


@unittest.skipUnless(TEST_DSN, "TEST_DATABASE_URL nao configurada")
class IdentidadeDoCriadorTests(unittest.TestCase):
    def setUp(self):
        from core.database import Database
        from core.dependencies import AuthenticatedUser

        if TEST_DSN == (os.getenv("DATABASE_URL") or "").strip():
            self.fail("TEST_DATABASE_URL nao pode ser o banco de producao")
        self.schema = f"jardim_test_{uuid.uuid4().hex}"
        with psycopg.connect(TEST_DSN, autocommit=True) as connection:
            connection.execute(sql.SQL("CREATE SCHEMA {}").format(sql.Identifier(self.schema)))
        self.database = Database(make_conninfo(TEST_DSN, options=f"-c search_path={self.schema}"))
        self.database.open()
        self.campanha = uuid.uuid4()

        def usuario(email, nome, plataforma, papel=None):
            pessoa = AuthenticatedUser(
                id=uuid.uuid4(), email=email, nome_exibicao=nome, admin_plataforma=False,
                papel_plataforma=plataforma, session_id=uuid.uuid4(), csrf_hash="hash",
            )
            with self.database.connection() as connection:
                connection.execute(
                    "INSERT INTO usuarios (id, email, nome_exibicao, senha_hash, papel_plataforma) VALUES (%s, %s, %s, 'hash', %s)",
                    (pessoa.id, email, nome, plataforma),
                )
                if papel == "mestre":
                    connection.execute("INSERT INTO campanhas (id, dono_id, nome) VALUES (%s, %s, 'Mesa')", (self.campanha, pessoa.id))
                if papel:
                    connection.execute(
                        "INSERT INTO membros_campanha (campanha_id, usuario_id, papel) VALUES (%s, %s, %s)", (self.campanha, pessoa.id, papel),
                    )
            return pessoa

        self.mestre = usuario("criador-mestre@example.com", "Mestre", "mestre", "mestre")
        self.ana = usuario("criador-ana@example.com", "Ana", "player", "jogador")
        self.criador = usuario("criador-pedro@example.com", "Pedro Criador", "criador")  # sem vínculo com a campanha
        self.intruso = usuario("criador-intruso@example.com", "Intruso", "player")

    def tearDown(self):
        tempo_real._limpar_para_testes()
        self.database.close()
        with psycopg.connect(TEST_DSN, autocommit=True) as connection:
            connection.execute(sql.SQL("DROP SCHEMA IF EXISTS {} CASCADE").format(sql.Identifier(self.schema)))

    def _detalhe(self, quem):
        from routers import campaigns as rotas

        return rotas.get_campaign(self.campanha, user=quem, database=self.database)

    def _salvar(self, quem, alvo, **campos):
        from routers import campaigns as rotas
        from schemas import MemberTableIdentityInput

        return rotas.update_member_table_identity(
            self.campanha, alvo.id, MemberTableIdentityInput(**campos), user=quem, database=self.database,
        )

    def _linha_do_criador(self):
        return next(m for m in self._detalhe(self.criador)["membros"] if str(m["id"]) == str(self.criador.id))

    def test_o_criador_aparece_na_lista_mesmo_sem_ser_membro_e_so_para_ele(self):
        membros = self._detalhe(self.criador)["membros"]
        eu = [m for m in membros if str(m["id"]) == str(self.criador.id)]
        self.assertEqual(len(eu), 1)
        self.assertEqual((eu[0]["papel_plataforma"], eu[0]["externo"]), ("criador", True))
        self.assertEqual({str(m["id"]) for m in membros} - {str(self.criador.id)}, {str(self.mestre.id), str(self.ana.id)})
        # O Mestre vê só os membros de verdade: o Criador de fora não vira membro por existir.
        self.assertNotIn(str(self.criador.id), {str(m["id"]) for m in self._detalhe(self.mestre)["membros"]})
        with self.assertRaises(HTTPException) as erro:
            self._detalhe(self.intruso)
        self.assertEqual(erro.exception.status_code, 404)

    def test_o_criador_escolhe_nome_e_cor_e_a_lista_e_a_conexao_mostram(self):
        from routers import mapa as rotas_mapa

        resposta = self._salvar(self.criador, self.criador, nome_mesa="  Narrador   Pedro ", cor_mesa="#AABBCC")
        self.assertEqual(resposta, {"nome_mesa": "Narrador Pedro", "cor_mesa": "#aabbcc"})
        eu = self._linha_do_criador()
        self.assertEqual((eu["nome_mesa"], eu["cor_mesa"]), ("Narrador Pedro", "#aabbcc"))

        # O mapa ao vivo usa o nome e a cor escolhidos na hora de conectar.
        original = rotas_mapa.get_current_user
        rotas_mapa.get_current_user = lambda _conexao, _banco: self.criador
        try:
            _, _, nome, cor, papel = rotas_mapa._entrada_sync(self.database, object(), self.campanha)
        finally:
            rotas_mapa.get_current_user = original
        self.assertEqual((nome, cor, papel), ("Narrador Pedro", "#aabbcc", "mestre"))

        # Mudar só a cor não apaga o nome, e restaurar volta ao nome da conta.
        self._salvar(self.criador, self.criador, cor_mesa="#112233")
        eu = self._linha_do_criador()
        self.assertEqual((eu["nome_mesa"], eu["cor_mesa"]), ("Narrador Pedro", "#112233"))
        self._salvar(self.criador, self.criador, nome_mesa=None, cor_mesa=None)
        eu = self._linha_do_criador()
        self.assertEqual((eu["nome_mesa"], eu["cor_mesa"]), (None, None))

    def test_ninguem_mais_mexe_na_identidade_de_quem_nao_e_membro(self):
        for quem in (self.mestre, self.ana):
            with self.assertRaises(HTTPException) as erro:
                self._salvar(quem, self.criador, nome_mesa="Qualquer")
            self.assertIn(erro.exception.status_code, (403, 404), quem.email)
        with self.assertRaises(HTTPException) as erro:
            self._salvar(self.intruso, self.intruso, nome_mesa="Eu")
        self.assertEqual(erro.exception.status_code, 404)
        # O Criador continua mexendo no nome de um membro de verdade, como o Mestre.
        self.assertEqual(self._salvar(self.criador, self.ana, nome_mesa="Ana da Mesa")["nome_mesa"], "Ana da Mesa")

    def test_quem_vira_membro_depois_usa_a_linha_de_membro(self):
        self._salvar(self.criador, self.criador, nome_mesa="De fora")
        with self.database.connection() as connection:
            connection.execute(
                "INSERT INTO membros_campanha (campanha_id, usuario_id, papel) VALUES (%s, %s, 'assistente')",
                (self.campanha, self.criador.id),
            )
        membros = self._detalhe(self.criador)["membros"]
        eu = [m for m in membros if str(m["id"]) == str(self.criador.id)]
        self.assertEqual(len(eu), 1, "membro de verdade não aparece duas vezes")
        self.assertFalse(eu[0].get("externo"))
        self._salvar(self.criador, self.criador, nome_mesa="De dentro")
        with self.database.connection() as connection:
            guardado = connection.execute(
                "SELECT nome_mesa FROM membros_campanha WHERE campanha_id=%s AND usuario_id=%s", (self.campanha, self.criador.id),
            ).fetchone()
        self.assertEqual(guardado["nome_mesa"], "De dentro")
