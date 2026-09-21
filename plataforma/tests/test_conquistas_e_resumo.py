"""Conquistas dos personagens e resumo da sessão, contra Postgres real.

Só roda com TEST_DATABASE_URL (Docker Postgres de teste), nunca contra o banco
de produção."""

from __future__ import annotations

import os
import unittest
import uuid

import psycopg
from psycopg import sql
from psycopg.conninfo import make_conninfo
from psycopg.types.json import Jsonb

from core.conquistas import CATALOGO, POR_CHAVE, avaliar, avaliar_sem_quebrar
from core.database import Database
from core.dependencies import AuthenticatedUser
from routers.characters import listar_conquistas
from routers.rolls import rolar
from routers.sessions import abrir_sessao, resumo_da_sessao, ultima_sessao_encerrada, encerrar_sessao
from schemas import RollInput, SessionOpenInput


TEST_DSN = (os.getenv("TEST_DATABASE_URL") or "").strip()


@unittest.skipUnless(TEST_DSN, "TEST_DATABASE_URL nao configurada")
class ConquistasEResumoTests(unittest.TestCase):
    def setUp(self):
        if TEST_DSN == (os.getenv("DATABASE_URL") or "").strip():
            self.fail("TEST_DATABASE_URL nao pode ser o banco de producao")
        self.schema = f"jardim_test_{uuid.uuid4().hex}"
        with psycopg.connect(TEST_DSN, autocommit=True) as connection:
            connection.execute(sql.SQL("CREATE SCHEMA {}").format(sql.Identifier(self.schema)))
        self.database = Database(make_conninfo(TEST_DSN, options=f"-c search_path={self.schema}"))
        self.database.open()

    def tearDown(self):
        self.database.close()
        with psycopg.connect(TEST_DSN, autocommit=True) as connection:
            connection.execute(sql.SQL("DROP SCHEMA IF EXISTS {} CASCADE").format(sql.Identifier(self.schema)))

    def _mesa(self, email, *, nivel=1, fama=0):
        usuario_id, campanha_id, personagem_id = uuid.uuid4(), uuid.uuid4(), uuid.uuid4()
        ficha = {"nivel": nivel, "fama": fama, "derivados": {"iniciativa": 10, "vida": 20, "mana": 5}}
        with self.database.connection() as connection:
            connection.execute(
                "INSERT INTO usuarios (id, email, nome_exibicao, senha_hash, papel_plataforma) VALUES (%s, %s, 'Mestre', 'hash', 'player')",
                (usuario_id, email),
            )
            connection.execute("INSERT INTO campanhas (id, dono_id, nome) VALUES (%s, %s, 'Mesa')", (campanha_id, usuario_id))
            connection.execute(
                "INSERT INTO membros_campanha (campanha_id, usuario_id, papel) VALUES (%s, %s, 'mestre')",
                (campanha_id, usuario_id),
            )
            connection.execute(
                "INSERT INTO personagens (id, campanha_id, dono_usuario_id, nome, ficha, criado_por) VALUES (%s, %s, %s, 'Heroina', %s, %s)",
                (personagem_id, campanha_id, usuario_id, Jsonb(ficha), usuario_id),
            )
        ator = AuthenticatedUser(
            id=usuario_id, email=email, nome_exibicao="Mestre", admin_plataforma=False,
            papel_plataforma="mestre", session_id=uuid.uuid4(), csrf_hash="hash",
        )
        return campanha_id, personagem_id, ator

    def _registro(self, campanha_id, personagem_id, usuario_id, *, tipo, titulo, resultado=None, detalhes=None, sessao_id=None, nome="Heroina"):
        with self.database.connection() as connection:
            connection.execute(
                """
                INSERT INTO registros_mesa
                    (id, campanha_id, sessao_id, usuario_id, personagem_id, autor_nome, tipo, titulo, resultado, detalhes)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (uuid.uuid4(), campanha_id, sessao_id, usuario_id, personagem_id, nome, tipo, titulo, resultado, Jsonb(detalhes or {})),
            )

    def test_catalogo_tem_chaves_unicas_e_metricas_conhecidas(self):
        chaves = [conquista.chave for conquista in CATALOGO]
        self.assertEqual(len(chaves), len(set(chaves)))
        conhecidas = {"rolagens", "criticos", "falhas", "dano_maximo", "usos", "sessoes", "nivel", "fama", "lunaris"}
        self.assertTrue(all(conquista.metrica in conhecidas for conquista in CATALOGO))
        self.assertTrue(all(conquista.raridade in {"comum", "rara", "lendaria"} for conquista in CATALOGO))

    def test_ficha_sem_historico_so_desbloqueia_o_que_o_nivel_da(self):
        _, personagem_id, ator = self._mesa("conq-vazia@example.com", nivel=5, fama=3)

        resposta = listar_conquistas(personagem_id, user=ator, database=self.database)

        self.assertEqual(set(resposta["novas"]), {"nivel_5", "nome_conhecido"})
        desbloqueadas = {item["chave"] for item in resposta["catalogo"] if item["desbloqueada"]}
        self.assertEqual(desbloqueadas, {"nivel_5", "nome_conhecido"})
        self.assertEqual(resposta["total"], len(CATALOGO))

    def test_conquista_nova_so_e_anunciada_uma_vez(self):
        _, personagem_id, ator = self._mesa("conq-uma-vez@example.com", nivel=10)

        primeira = listar_conquistas(personagem_id, user=ator, database=self.database)
        segunda = listar_conquistas(personagem_id, user=ator, database=self.database)

        self.assertIn("nivel_10", primeira["novas"])
        self.assertEqual(segunda["novas"], [])
        item = next(x for x in segunda["catalogo"] if x["chave"] == "nivel_10")
        self.assertTrue(item["desbloqueada"])
        self.assertIsNotNone(item["desbloqueada_em"])

    def test_progresso_mostra_quanto_falta(self):
        campanha_id, personagem_id, ator = self._mesa("conq-progresso@example.com")
        for _ in range(3):
            self._registro(campanha_id, personagem_id, ator.id, tipo="rolagem", titulo="Teste", resultado=12, detalhes={"natural": 9})

        resposta = listar_conquistas(personagem_id, user=ator, database=self.database)

        mao = next(x for x in resposta["catalogo"] if x["chave"] == "mao_calejada")
        self.assertFalse(mao["desbloqueada"])
        self.assertEqual(mao["progresso"], {"atual": 3, "minimo": 50})
        self.assertIn("primeira_rolagem", resposta["novas"])

    def test_rolagem_pelo_servidor_devolve_conquistas_novas(self):
        campanha_id, personagem_id, ator = self._mesa("conq-rolagem@example.com")

        resposta = rolar(
            RollInput(campanha_id=campanha_id, personagem_id=personagem_id, titulo="Teste de Atletismo", bonus=2),
            user=ator,
            database=self.database,
        )

        chaves = [item["chave"] for item in resposta["conquistas_novas"]]
        self.assertIn("primeira_rolagem", chaves)
        item = resposta["conquistas_novas"][0]
        self.assertEqual(set(item), {"chave", "nome", "descricao", "raridade", "icone"})

    def test_criticos_e_falhas_naturais_contam(self):
        campanha_id, personagem_id, ator = self._mesa("conq-crit@example.com")
        self._registro(campanha_id, personagem_id, ator.id, tipo="rolagem", titulo="A", resultado=26, detalhes={"natural": 20, "critico_natural": True})
        self._registro(campanha_id, personagem_id, ator.id, tipo="rolagem", titulo="B", resultado=1, detalhes={"natural": 1, "falha_natural": True})
        self._registro(campanha_id, personagem_id, ator.id, tipo="dano", titulo="Machado", resultado=34, detalhes={})

        resposta = listar_conquistas(personagem_id, user=ator, database=self.database)

        self.assertTrue({"toque_de_sorte", "tropeco_epico", "golpe_pesado"} <= set(resposta["novas"]))
        self.assertNotIn("golpe_devastador", resposta["novas"])

    def test_falha_ao_avaliar_nao_derruba_a_operacao(self):
        with self.database.connection() as connection:
            novas = avaliar_sem_quebrar(connection, uuid.uuid4())  # personagem inexistente
            # A conexão continua utilizável depois do erro contido pelo savepoint.
            connection.execute("SELECT 1")
        self.assertEqual(novas, [])

    def test_resumo_da_sessao_reune_destaques_sem_entregar_cena(self):
        campanha_id, personagem_id, ator = self._mesa("resumo@example.com")
        segundo_id = uuid.uuid4()
        with self.database.connection() as connection:
            connection.execute(
                "INSERT INTO personagens (id, campanha_id, dono_usuario_id, nome, ficha, criado_por) VALUES (%s, %s, %s, 'Bardo', %s, %s)",
                (segundo_id, campanha_id, ator.id, Jsonb({"nivel": 1, "derivados": {"iniciativa": 5, "vida": 10, "mana": 0}}), ator.id),
            )
        estado = abrir_sessao(
            SessionOpenInput(campanha_id=campanha_id, titulo="Noite das Cinzas", incluir_personagens=True),
            user=ator,
            database=self.database,
        )
        sessao_id = estado["sessao"]["id"]
        for natural, extra in ((20, {"critico_natural": True}), (15, {}), (12, {}), (9, {})):
            self._registro(campanha_id, personagem_id, ator.id, tipo="rolagem", titulo="Furtividade secreta", resultado=natural + 3, detalhes={"natural": natural, **extra}, sessao_id=sessao_id)
        for natural in (1, 3, 4, 6):
            self._registro(campanha_id, segundo_id, ator.id, tipo="rolagem", titulo="Persuasão", resultado=natural, detalhes={"natural": natural, **({"falha_natural": True} if natural == 1 else {})}, sessao_id=sessao_id, nome="Bardo")
        self._registro(campanha_id, personagem_id, ator.id, tipo="dano", titulo="Golpe de Machado", resultado=41, sessao_id=sessao_id)
        self._registro(campanha_id, personagem_id, ator.id, tipo="magia", titulo="Bola de Fogo", sessao_id=sessao_id)
        self._registro(campanha_id, personagem_id, ator.id, tipo="magia", titulo="Bola de Fogo", sessao_id=sessao_id)

        resumo = resumo_da_sessao(sessao_id, user=ator, database=self.database)

        self.assertEqual(resumo["sessao"]["titulo"], "Noite das Cinzas")
        self.assertEqual(resumo["mesa"]["rolagens"], 8)
        self.assertEqual(resumo["mesa"]["criticos"], 1)
        self.assertEqual(resumo["mesa"]["dano_total"], 41)
        self.assertEqual(resumo["mesa"]["jogadores"], 2)
        por_id = {item["id"]: item for item in resumo["destaques"]}
        self.assertEqual(por_id["criticos"]["personagem"], "Heroina")
        self.assertEqual(por_id["falhas"]["personagem"], "Bardo")
        self.assertEqual(por_id["maior_dano"]["valor"], 41)
        self.assertEqual(por_id["maior_dano"]["detalhe"], "Golpe de Machado")
        self.assertEqual(por_id["sorte"]["personagem"], "Heroina")
        self.assertEqual(por_id["azar"]["personagem"], "Bardo")
        self.assertEqual(por_id["poder"]["personagem"], "Bola de Fogo")
        self.assertEqual(por_id["poder"]["valor"], 2)
        # Nunca vaza o título de rolagens de perícia.
        self.assertNotIn("Furtividade secreta", str(resumo))
        self.assertNotIn("Persuasão", str(resumo))

    def test_resumo_de_sessao_sem_rolagens_nao_inventa_destaques(self):
        campanha_id, _, ator = self._mesa("resumo-vazio@example.com")
        estado = abrir_sessao(
            SessionOpenInput(campanha_id=campanha_id, titulo="Silêncio", incluir_personagens=True),
            user=ator,
            database=self.database,
        )

        resumo = resumo_da_sessao(estado["sessao"]["id"], user=ator, database=self.database)

        self.assertEqual(resumo["destaques"], [])
        self.assertEqual(resumo["mesa"]["rolagens"], 0)

    def test_ultima_sessao_encerrada_aponta_para_a_sessao_certa(self):
        campanha_id, _, ator = self._mesa("resumo-ultima@example.com")
        self.assertIsNone(ultima_sessao_encerrada(campanha_id, user=ator, database=self.database)["sessao_id"])
        estado = abrir_sessao(
            SessionOpenInput(campanha_id=campanha_id, titulo="Uma noite", incluir_personagens=True),
            user=ator,
            database=self.database,
        )
        sessao_id = estado["sessao"]["id"]
        encerrar_sessao(sessao_id, user=ator, database=self.database)

        self.assertEqual(
            ultima_sessao_encerrada(campanha_id, user=ator, database=self.database)["sessao_id"], sessao_id
        )

    def test_conquistas_referenciadas_existem_no_catalogo(self):
        self.assertIn("toque_de_sorte", POR_CHAVE)


if __name__ == "__main__":
    unittest.main()
