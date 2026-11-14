"""Cópias de token e encontros salvos contra Postgres real (routers/mapa_encontros.py).

Só roda com TEST_DATABASE_URL (Postgres descartável), nunca contra o banco de produção."""

from __future__ import annotations

import os
import unittest
import uuid

import psycopg
from fastapi import HTTPException
from psycopg import sql
from psycopg.conninfo import make_conninfo
from psycopg.types.json import Jsonb

from core import tempo_real

TEST_DSN = (os.getenv("TEST_DATABASE_URL") or "").strip()


@unittest.skipUnless(TEST_DSN, "TEST_DATABASE_URL nao configurada")
class EncontrosBancoTests(unittest.TestCase):
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
        self.campanha_id = uuid.uuid4()

        def usuario(email, nome, papel, plataforma="player"):
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
                    connection.execute("INSERT INTO campanhas (id, dono_id, nome) VALUES (%s, %s, 'Mesa')", (self.campanha_id, pessoa.id))
                connection.execute(
                    "INSERT INTO membros_campanha (campanha_id, usuario_id, papel) VALUES (%s, %s, %s)",
                    (self.campanha_id, pessoa.id, papel),
                )
            return pessoa

        self.mestre = usuario("enc-mestre@example.com", "Mestre", "mestre", plataforma="mestre")
        self.ana = usuario("enc-ana@example.com", "Ana", "jogador")
        self.cena, self.sessao = uuid.uuid4(), uuid.uuid4()
        self.personagem, self.token_ana = uuid.uuid4(), uuid.uuid4()
        self.participante, self.token_lobo = uuid.uuid4(), uuid.uuid4()
        with self.database.connection() as connection:
            connection.execute(
                "INSERT INTO sessoes_mesa (id, campanha_id, status, titulo, aberta_por) VALUES (%s, %s, 'aberta', 'Noite 1', %s)",
                (self.sessao, self.campanha_id, self.mestre.id),
            )
            connection.execute(
                "INSERT INTO mapa_cenas (id, campanha_id, nome, largura, altura, ativa) VALUES (%s, %s, 'Clareira', 1200, 900, TRUE)",
                (self.cena, self.campanha_id),
            )
            connection.execute(
                "INSERT INTO personagens (id, campanha_id, dono_usuario_id, criado_por, nome) VALUES (%s, %s, %s, %s, 'Mira')",
                (self.personagem, self.campanha_id, self.ana.id, self.ana.id),
            )
            connection.execute(
                "INSERT INTO mapa_tokens (id, cena_id, personagem_id, x, y, lado) VALUES (%s, %s, %s, 150, 150, 'jogador')",
                (self.token_ana, self.cena, self.personagem),
            )
            connection.execute(
                """
                INSERT INTO sessao_participantes (id, sessao_id, nome, tipo, iniciativa, vida_atual, vida_maxima, visibilidade, ordem, defesa, ataques)
                VALUES (%s, %s, 'Lobo', 'inimigo', 12, 17, 30, 'parcial', 0, 14, %s)
                """,
                (self.participante, self.sessao, Jsonb([{"nome": "Mordida"}])),
            )
            connection.execute(
                "INSERT INTO mapa_tokens (id, cena_id, participante_id, x, y, lado, aura) VALUES (%s, %s, %s, 450, 450, 'inimigo', %s)",
                (self.token_lobo, self.cena, self.participante, Jsonb({"raio": 2, "cor": "#ef4444", "visivel": True})),
            )

    def tearDown(self):
        tempo_real._limpar_para_testes()
        self.database.close()
        with psycopg.connect(TEST_DSN, autocommit=True) as connection:
            connection.execute(sql.SQL("DROP SCHEMA IF EXISTS {} CASCADE").format(sql.Identifier(self.schema)))

    def _consulta(self, texto, *args):
        with self.database.connection() as connection:
            return [dict(l) for l in connection.execute(texto, args).fetchall()]

    def _criaturas(self):
        return self._consulta("SELECT id, nome, vida_atual, vida_maxima, iniciativa, ataques, defesa FROM sessao_participantes WHERE sessao_id=%s ORDER BY ordem", self.sessao)

    def _tokens(self):
        return self._consulta("SELECT id, nome, x, y, lado, oculto, participante_id, personagem_id, aura FROM mapa_tokens WHERE cena_id=%s", self.cena)

    def test_duplicar_cria_copias_numeradas_com_a_criatura_na_iniciativa(self):
        from routers import mapa_encontros as rotas

        resposta = rotas.duplicar_token(self.campanha_id, self.token_lobo, rotas.DuplicarInput(quantidade=3), user=self.mestre, database=self.database)
        self.assertEqual(resposta["copias"], 3)
        criaturas = self._criaturas()
        self.assertEqual([c["nome"] for c in criaturas], ["Lobo", "Lobo 2", "Lobo 3", "Lobo 4"])
        # A cópia nasce com a Vida cheia, mesmo que o original esteja ferido, e leva Defesa e ataques.
        copia = criaturas[1]
        self.assertEqual((copia["vida_atual"], copia["vida_maxima"], copia["defesa"], copia["iniciativa"]), (30, 30, 14, 12))
        self.assertEqual(copia["ataques"], [{"nome": "Mordida"}])
        lobos = [t for t in self._tokens() if t["lado"] == "inimigo"]
        self.assertEqual(len(lobos), 4)
        self.assertEqual(len({(t["x"], t["y"]) for t in lobos}), 4, "cada cópia numa casa diferente")
        self.assertTrue(all(t["aura"]["raio"] == 2 for t in lobos), "a aura vai junto")
        self.assertEqual(len([t for t in lobos if t["participante_id"]]), 4)

    def test_personagem_de_jogador_nao_se_copia_e_so_o_mestre_copia(self):
        from routers import mapa_encontros as rotas

        with self.assertRaises(HTTPException) as erro:
            rotas.duplicar_token(self.campanha_id, self.token_ana, rotas.DuplicarInput(), user=self.mestre, database=self.database)
        self.assertEqual(erro.exception.status_code, 422)
        with self.assertRaises(HTTPException) as erro:
            rotas.duplicar_token(self.campanha_id, self.token_lobo, rotas.DuplicarInput(), user=self.ana, database=self.database)
        self.assertEqual(erro.exception.status_code, 403)
        self.assertEqual(len(self._tokens()), 2)

    def test_duplicar_sem_sessao_copia_so_o_token_e_o_nome_vai_no_token(self):
        from routers import mapa_encontros as rotas

        with self.database.connection() as connection:
            connection.execute("UPDATE sessoes_mesa SET status='encerrada' WHERE id=%s", (self.sessao,))
        rotas.duplicar_token(self.campanha_id, self.token_lobo, rotas.DuplicarInput(quantidade=2), user=self.mestre, database=self.database)
        novos = [t for t in self._tokens() if t["lado"] == "inimigo" and t["id"] != self.token_lobo]
        self.assertEqual(sorted(t["nome"] for t in novos), ["Lobo 2", "Lobo 3"])
        self.assertTrue(all(t["participante_id"] is None for t in novos))
        self.assertEqual(len(self._criaturas()), 1)

    def test_encontro_salvo_solta_escondido_revela_e_limpa(self):
        from routers import mapa as rotas_mapa
        from routers import mapa_encontros as rotas

        rotas.duplicar_token(self.campanha_id, self.token_lobo, rotas.DuplicarInput(quantidade=1), user=self.mestre, database=self.database)
        salvo = rotas.salvar_encontro(self.campanha_id, self.cena, rotas.SalvarEncontroInput(nome="Bando de lobos"), user=self.mestre, database=self.database)
        self.assertEqual(salvo["encontros"][0]["nome"], "Bando de lobos")
        self.assertEqual((salvo["encontros"][0]["total"], salvo["encontros"][0]["criaturas"]), (2, 2))
        encontro_id = salvo["salvo"]

        # Limpar tira os inimigos do mapa (e não o personagem da Ana), e a iniciativa só sai se o Mestre pedir.
        limpo = rotas.limpar_cena(self.campanha_id, self.cena, rotas.LadosInput(), user=self.mestre, database=self.database)
        self.assertEqual(limpo["removidos"], 2)
        self.assertEqual([t["personagem_id"] for t in self._tokens()], [self.personagem])

        # Soltar de novo, escondido: a Ana não vê, o Mestre vê.
        soltou = rotas.soltar_encontro(self.campanha_id, self.cena, encontro_id, rotas.SoltarEncontroInput(x=800, y=600, escondidos=True), user=self.mestre, database=self.database)
        self.assertEqual(soltou["soltos"], 2)
        self.assertEqual(sum(1 for t in soltou["tokens"]), 3)
        da_ana = rotas_mapa.obter_mapa(self.campanha_id, None, user=self.ana, database=self.database)
        self.assertEqual([t["id"] for t in da_ana["tokens"]], [str(self.token_ana)])
        self.assertTrue(all(t["oculto"] for t in self._tokens() if t["lado"] == "inimigo"))
        # Os nomes não colidem com as criaturas que já estavam na iniciativa.
        nomes = [c["nome"] for c in self._criaturas()]
        self.assertEqual(len(nomes), len(set(nomes)))

        revelado = rotas.revelar_escondidos(self.campanha_id, self.cena, rotas.LadosInput(lados=["inimigo", "neutro", "aliado"]), user=self.mestre, database=self.database)
        self.assertEqual(revelado["revelados"], 2)
        da_ana = rotas_mapa.obter_mapa(self.campanha_id, None, user=self.ana, database=self.database)
        self.assertEqual(len(da_ana["tokens"]), 3)

        antes = len(self._criaturas())
        rotas.limpar_cena(self.campanha_id, self.cena, rotas.LadosInput(tirar_da_iniciativa=True), user=self.mestre, database=self.database)
        self.assertEqual(len(self._criaturas()), antes - 2)

    def test_so_o_mestre_mexe_nos_encontros_e_a_lista_nunca_vai_ao_jogador(self):
        from routers import mapa_encontros as rotas

        for chamada in (
            lambda: rotas.listar_encontros(self.campanha_id, user=self.ana, database=self.database),
            lambda: rotas.salvar_encontro(self.campanha_id, self.cena, rotas.SalvarEncontroInput(nome="x"), user=self.ana, database=self.database),
            lambda: rotas.limpar_cena(self.campanha_id, self.cena, rotas.LadosInput(), user=self.ana, database=self.database),
            lambda: rotas.revelar_escondidos(self.campanha_id, self.cena, rotas.LadosInput(), user=self.ana, database=self.database),
        ):
            with self.assertRaises(HTTPException) as erro:
                chamada()
            self.assertEqual(erro.exception.status_code, 403)

    def test_encontro_sem_inimigos_ou_so_com_jogadores_e_recusado_e_apagar_funciona(self):
        from routers import mapa_encontros as rotas

        with self.assertRaises(HTTPException) as erro:
            rotas.salvar_encontro(self.campanha_id, self.cena, rotas.SalvarEncontroInput(nome="Aliados", lados=["aliado"]), user=self.mestre, database=self.database)
        self.assertEqual(erro.exception.status_code, 422)
        with self.assertRaises(HTTPException) as erro:
            rotas.salvar_encontro(self.campanha_id, self.cena, rotas.SalvarEncontroInput(nome="So Ana", tokens=[self.token_ana]), user=self.mestre, database=self.database)
        self.assertEqual(erro.exception.status_code, 422)
        with self.assertRaises(HTTPException) as erro:
            rotas.salvar_encontro(self.campanha_id, self.cena, rotas.SalvarEncontroInput(nome="Jogadores", lados=["jogador"]), user=self.mestre, database=self.database)
        self.assertEqual(erro.exception.status_code, 422)
        salvo = rotas.salvar_encontro(self.campanha_id, self.cena, rotas.SalvarEncontroInput(nome="Um lobo"), user=self.mestre, database=self.database)
        restante = rotas.apagar_encontro(self.campanha_id, salvo["salvo"], user=self.mestre, database=self.database)
        self.assertEqual(restante["encontros"], [])
        with self.assertRaises(HTTPException) as erro:
            rotas.apagar_encontro(self.campanha_id, "naoexiste", user=self.mestre, database=self.database)
        self.assertEqual(erro.exception.status_code, 404)

    def test_soltar_com_a_cena_cheia_de_tokens_respeita_o_limite(self):
        from routers import mapa as rotas_mapa
        from routers import mapa_encontros as rotas

        salvo = rotas.salvar_encontro(self.campanha_id, self.cena, rotas.SalvarEncontroInput(nome="Um lobo"), user=self.mestre, database=self.database)
        original = rotas_mapa.MAX_TOKENS_POR_CENA
        rotas_mapa.MAX_TOKENS_POR_CENA = 2
        try:
            with self.assertRaises(HTTPException) as erro:
                rotas.soltar_encontro(self.campanha_id, self.cena, salvo["salvo"], rotas.SoltarEncontroInput(x=600, y=600), user=self.mestre, database=self.database)
            self.assertEqual(erro.exception.status_code, 409)
        finally:
            rotas_mapa.MAX_TOKENS_POR_CENA = original
        self.assertEqual(len(self._tokens()), 2)
