from __future__ import annotations

import os
import unittest
import uuid

import psycopg
from psycopg import sql
from psycopg.conninfo import make_conninfo
from psycopg.types.json import Jsonb

from core.database import Database
from core.dependencies import AuthenticatedUser
from core.notifications import contar_avisos, notify
from core.schema import AVISOS_ANTIGOS_DA_ADMINISTRACAO_SQL, AVISOS_ANTIGOS_DO_MESTRE_SQL
from routers import notifications as rotas
from routers.context import bootstrap_context
from schemas import NotificationReadInput


TEST_DSN = (os.getenv("TEST_DATABASE_URL") or "").strip()


@unittest.skipUnless(TEST_DSN, "TEST_DATABASE_URL nao configurada")
class AvisosPorPainelTests(unittest.TestCase):
    """Caixa de avisos dividida por painel, contra um Postgres de verdade (schema isolado)."""

    def setUp(self):
        production_dsn = (os.getenv("DATABASE_URL") or "").strip()
        if TEST_DSN == production_dsn:
            self.fail("TEST_DATABASE_URL nao pode ser o banco de producao")
        self.schema = f"jardim_test_{uuid.uuid4().hex}"
        with psycopg.connect(TEST_DSN, autocommit=True) as connection:
            connection.execute(sql.SQL("CREATE SCHEMA {}").format(sql.Identifier(self.schema)))
        self.database = Database(make_conninfo(TEST_DSN, options=f"-c search_path={self.schema}"))
        self.database.open()

        self.campanha_id = uuid.uuid4()
        self.outra_campanha_id = uuid.uuid4()
        self.mestre = self._conta("mestre@example.com", "Mestre", "mestre")
        self.admin = self._conta("admin@example.com", "Admin", "admin")
        self.jogador = self._conta("jogador@example.com", "Jogador", "player")
        with self.database.connection() as connection:
            for campanha in (self.campanha_id, self.outra_campanha_id):
                connection.execute(
                    "INSERT INTO campanhas (id, dono_id, nome) VALUES (%s, %s, 'Mesa')",
                    (campanha, self.mestre.id),
                )
                connection.execute(
                    "INSERT INTO membros_campanha (campanha_id, usuario_id, papel) VALUES (%s, %s, 'mestre')",
                    (campanha, self.mestre.id),
                )
            connection.execute(
                "INSERT INTO membros_campanha (campanha_id, usuario_id, papel) VALUES (%s, %s, 'jogador')",
                (self.campanha_id, self.jogador.id),
            )

    def tearDown(self):
        self.database.close()
        with psycopg.connect(TEST_DSN, autocommit=True) as connection:
            connection.execute(
                sql.SQL("DROP SCHEMA IF EXISTS {} CASCADE").format(sql.Identifier(self.schema))
            )

    def _conta(self, email: str, nome: str, papel: str) -> AuthenticatedUser:
        usuario_id = uuid.uuid4()
        with self.database.connection() as connection:
            connection.execute(
                """
                INSERT INTO usuarios (id, email, nome_exibicao, senha_hash, papel_plataforma)
                VALUES (%s, %s, %s, 'hash', %s)
                """,
                (usuario_id, email, nome, papel),
            )
        return AuthenticatedUser(
            id=usuario_id,
            email=email,
            nome_exibicao=nome,
            admin_plataforma=papel == "admin",
            papel_plataforma=papel,
            session_id=uuid.uuid4(),
            csrf_hash="hash",
        )

    def _aviso(self, usuario, titulo, *, painel="geral", campanha=None, dados=None, lido=False, categoria="campanha"):
        aviso_id = uuid.uuid4()
        with self.database.connection() as connection:
            connection.execute(
                """
                INSERT INTO notificacoes
                    (id, usuario_id, campanha_id, categoria, titulo, mensagem, dados, painel, lida_em)
                VALUES (%s, %s, %s, %s, %s, '', %s, %s, CASE WHEN %s THEN CURRENT_TIMESTAMP END)
                """,
                (aviso_id, usuario.id, campanha, categoria, titulo, Jsonb(dados or {}), painel, lido),
            )
        return aviso_id

    def _listar(self, usuario, **filtros):
        # Chamada direta da rota, sem o FastAPI: os padrões de `Query(...)` não são resolvidos, então vão explícitos.
        filtros.setdefault('apenas_nao_lidos', False)
        filtros.setdefault('limite', 40)
        return rotas.list_notifications(user=usuario, database=self.database, **filtros)

    def _lidos(self) -> dict[str, bool]:
        with self.database.connection() as connection:
            linhas = connection.execute("SELECT titulo, lida_em FROM notificacoes").fetchall()
        return {linha["titulo"]: linha["lida_em"] is not None for linha in linhas}

    # ── migração 55 ─────────────────────────────────────────────────────────

    def test_avisos_antigos_vao_para_o_painel_certo(self):
        """Títulos que a produção já gravou, sem painel, passam a morar onde o Mestre/Admin olha."""
        antigos_do_mestre = [
            "Vinizada entrou na campanha",
            "Alerta de Regras na Criação",
            "Alerta de Regras na Ficha",
            "Jogador alterou classe/XP na ficha",
            "Personagem passou do nível padrão",
            "Personagem entrou num patamar novo",
            "Infração na loja: Heroína",
            "Reivindicacao de Recompensa",
        ]
        for titulo in antigos_do_mestre:
            self._aviso(self.mestre, titulo)
        self._aviso(self.mestre, "Titulo qualquer de fila", dados={"tipo": "claim_recompensa", "status": "pendente"})
        self._aviso(self.admin, "Pedido de senha nova", categoria="conta")
        # O que é da pessoa fica na caixa geral, mesmo parecido com os acima.
        gerais = [
            "Recompensa nova no seu cofre",
            "A sessão começou",
            "Você saiu de Mesa Antiga",
            "O Mestre concedeu itens a Heroína",
            "Seu papel em Mesa mudou",
        ]
        for titulo in gerais:
            self._aviso(self.jogador, titulo)

        with self.database.connection() as connection:
            connection.execute(AVISOS_ANTIGOS_DO_MESTRE_SQL)
            connection.execute(AVISOS_ANTIGOS_DA_ADMINISTRACAO_SQL)
            linhas = connection.execute("SELECT titulo, painel FROM notificacoes").fetchall()

        painel_por_titulo = {linha["titulo"]: linha["painel"] for linha in linhas}
        for titulo in antigos_do_mestre + ["Titulo qualquer de fila"]:
            self.assertEqual(painel_por_titulo[titulo], "mestre", titulo)
        self.assertEqual(painel_por_titulo["Pedido de senha nova"], "admin")
        for titulo in gerais:
            self.assertEqual(painel_por_titulo[titulo], "geral", titulo)

    def test_painel_invalido_nao_entra_no_banco(self):
        with self.assertRaises(psycopg.errors.CheckViolation):
            self._aviso(self.jogador, "x", painel="criador")

    # ── notify e contagem ───────────────────────────────────────────────────

    def test_notify_grava_o_painel_e_a_contagem_separa(self):
        with self.database.connection() as connection:
            notify(connection, user_ids=[self.jogador.id], category="campanha", title="Aviso pessoal")
            notify(
                connection, user_ids=[self.mestre.id], category="campanha", title="X entrou na campanha",
                campaign_id=self.campanha_id, panel="mestre",
            )
            notify(
                connection, user_ids=[self.mestre.id], category="campanha", title="Y entrou na campanha",
                campaign_id=self.outra_campanha_id, panel="mestre",
            )
            notify(connection, user_ids=[self.admin.id], category="conta", title="Pedido de senha nova", panel="admin")

            do_mestre = contar_avisos(connection, self.mestre.id, campaign_id=self.campanha_id)
            do_jogador = contar_avisos(connection, self.jogador.id, campaign_id=self.campanha_id)
            do_admin = contar_avisos(connection, self.admin.id, is_platform_admin=True)
            admin_rebaixado = contar_avisos(connection, self.admin.id, is_platform_admin=False)

        self.assertEqual(do_mestre["mestre"], 1)
        self.assertEqual(do_mestre["mestre_por_campanha"], {str(self.campanha_id): 1, str(self.outra_campanha_id): 1})
        self.assertEqual(do_mestre["total"], 2)
        self.assertEqual(do_mestre["geral"], 0)
        self.assertEqual(do_jogador["geral"], 1)
        self.assertEqual(do_jogador["mestre"], 0)
        self.assertEqual(do_admin["admin"], 1)
        # Quem deixou de ser admin não fica com um número que nenhuma tela abre.
        self.assertEqual(admin_rebaixado["admin"], 0)
        self.assertEqual(admin_rebaixado["total"], 0)

    def test_aviso_do_mestre_nao_conta_para_quem_deixou_de_comandar_a_mesa(self):
        self._aviso(self.jogador, "Z entrou na campanha", painel="mestre", campanha=self.campanha_id)
        with self.database.connection() as connection:
            # O jogador nunca foi Mestre ali: o aviso fica órfão e não pode pesar no número vermelho.
            antes = contar_avisos(connection, self.jogador.id, campaign_id=self.campanha_id)
            connection.execute(
                "UPDATE membros_campanha SET papel='assistente' WHERE campanha_id=%s AND usuario_id=%s",
                (self.campanha_id, self.jogador.id),
            )
            depois = contar_avisos(connection, self.jogador.id, campaign_id=self.campanha_id)
        self.assertEqual(antes["total"], 0)
        self.assertEqual(depois["mestre"], 1)
        self.assertEqual(depois["total"], 1)

    def test_contexto_devolve_o_total_de_sempre_e_a_divisao_por_painel(self):
        self._aviso(self.mestre, "A", painel="geral")
        self._aviso(self.mestre, "B entrou na campanha", painel="mestre", campanha=self.campanha_id)
        self._aviso(self.mestre, "C entrou na campanha", painel="mestre", campanha=self.outra_campanha_id)
        contexto = bootstrap_context(campanha_id=self.campanha_id, user=self.mestre, database=self.database)
        self.assertEqual(contexto["avisos_nao_lidos"], 3)
        self.assertEqual(contexto["avisos"]["geral"], 1)
        self.assertEqual(contexto["avisos"]["mestre"], 1)
        self.assertEqual(contexto["avisos"]["mestre_por_campanha"][str(self.outra_campanha_id)], 1)

    # ── rotas ───────────────────────────────────────────────────────────────

    def test_lista_filtra_por_painel_e_por_campanha(self):
        self._aviso(self.mestre, "Pessoal", painel="geral")
        self._aviso(self.mestre, "Da mesa A", painel="mestre", campanha=self.campanha_id)
        self._aviso(self.mestre, "Da mesa B", painel="mestre", campanha=self.outra_campanha_id)

        tudo = self._listar(self.mestre)
        so_mestre_a = self._listar(self.mestre, painel="mestre", campanha_id=self.campanha_id)
        so_geral = self._listar(self.mestre, painel="geral")

        self.assertEqual({a["titulo"] for a in tudo["avisos"]}, {"Pessoal", "Da mesa A", "Da mesa B"})
        self.assertEqual([a["titulo"] for a in so_mestre_a["avisos"]], ["Da mesa A"])
        self.assertEqual([a["titulo"] for a in so_geral["avisos"]], ["Pessoal"])
        self.assertEqual(so_geral["avisos"][0]["painel"], "geral")
        self.assertEqual(so_geral["contagens"]["mestre_por_campanha"][str(self.outra_campanha_id)], 1)

    def test_marcar_tudo_como_lido_fica_dentro_do_painel(self):
        self._aviso(self.mestre, "Pessoal", painel="geral")
        self._aviso(self.mestre, "Da mesa A", painel="mestre", campanha=self.campanha_id)
        self._aviso(self.mestre, "Da mesa B", painel="mestre", campanha=self.outra_campanha_id)

        resposta = rotas.mark_as_read(
            NotificationReadInput(painel="geral"), user=self.mestre, database=self.database
        )
        self.assertEqual(self._lidos(), {"Pessoal": True, "Da mesa A": False, "Da mesa B": False})
        self.assertEqual(resposta["contagens"]["geral"], 0)
        self.assertEqual(resposta["nao_lidos"], 2)

        rotas.mark_as_read(
            NotificationReadInput(painel="mestre", campanha_id=self.campanha_id),
            user=self.mestre,
            database=self.database,
        )
        self.assertEqual(self._lidos(), {"Pessoal": True, "Da mesa A": True, "Da mesa B": False})

    def test_sem_painel_marca_a_caixa_inteira_como_o_site_antigo_pede(self):
        self._aviso(self.mestre, "Pessoal", painel="geral")
        self._aviso(self.mestre, "Da mesa A", painel="mestre", campanha=self.campanha_id)
        rotas.mark_as_read(NotificationReadInput(), user=self.mestre, database=self.database)
        self.assertEqual(self._lidos(), {"Pessoal": True, "Da mesa A": True})

    def test_marcar_por_ids_so_mexe_nos_avisos_da_propria_pessoa(self):
        meu = self._aviso(self.mestre, "Meu", painel="geral")
        alheio = self._aviso(self.jogador, "Do jogador", painel="geral")
        rotas.mark_as_read(NotificationReadInput(ids=[meu, alheio]), user=self.mestre, database=self.database)
        self.assertEqual(self._lidos(), {"Meu": True, "Do jogador": False})

    def test_reivindicacao_pendente_nao_sai_da_fila_nem_com_marcar_nem_com_limpar(self):
        pendente = {"tipo": "claim_recompensa", "status": "pendente"}
        resolvida = {"tipo": "claim_recompensa", "status": "aprovada"}
        self._aviso(self.mestre, "Reivindicacao de Recompensa", painel="mestre", campanha=self.campanha_id, dados=pendente)
        self._aviso(
            self.mestre, "Reivindicacao antiga", painel="mestre", campanha=self.campanha_id, dados=resolvida, lido=True
        )
        self._aviso(self.mestre, "Comum", painel="mestre", campanha=self.campanha_id)

        rotas.mark_as_read(
            NotificationReadInput(painel="mestre", campanha_id=self.campanha_id),
            user=self.mestre,
            database=self.database,
        )
        lidos = self._lidos()
        self.assertFalse(lidos["Reivindicacao de Recompensa"])
        self.assertTrue(lidos["Comum"])

        # Mesmo se alguém a marcar como lida por fora (o Mestre responde na Loja, não aqui), "limpar lidos" não apaga.
        with self.database.connection() as connection:
            connection.execute(
                "UPDATE notificacoes SET lida_em=CURRENT_TIMESTAMP WHERE titulo='Reivindicacao de Recompensa'"
            )
        rotas.clear_read(
            painel="mestre", campanha_id=self.campanha_id, user=self.mestre, database=self.database
        )
        restantes = set(self._lidos())
        self.assertEqual(restantes, {"Reivindicacao de Recompensa"})

    def test_limpar_lidos_respeita_o_painel(self):
        self._aviso(self.mestre, "Pessoal lido", painel="geral", lido=True)
        self._aviso(self.mestre, "Da mesa lido", painel="mestre", campanha=self.campanha_id, lido=True)
        self._aviso(self.mestre, "Pessoal novo", painel="geral")
        rotas.clear_read(painel="geral", user=self.mestre, database=self.database)
        self.assertEqual(set(self._lidos()), {"Da mesa lido", "Pessoal novo"})

    def test_painel_desconhecido_e_recusado(self):
        from fastapi import HTTPException

        with self.assertRaises(HTTPException) as erro:
            self._listar(self.mestre, painel="criador")
        self.assertEqual(erro.exception.status_code, 422)


if __name__ == "__main__":
    unittest.main()
