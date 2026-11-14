"""O quadro de investigação contra Postgres real (routers/mapa_quadro.py): quem recebe o quê, e a mesa guardada.

Só roda com TEST_DATABASE_URL (Postgres descartável), nunca contra o banco de produção."""

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
class QuadroBancoTests(unittest.TestCase):
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
        self.campanha_id, self.cena = uuid.uuid4(), uuid.uuid4()

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
                connection.execute("INSERT INTO membros_campanha (campanha_id, usuario_id, papel) VALUES (%s, %s, %s)", (self.campanha_id, pessoa.id, papel))
            return pessoa

        self.mestre = usuario("quadro-mestre@example.com", "Mestre", "mestre", plataforma="mestre")
        self.ana = usuario("quadro-ana@example.com", "Ana", "jogador")
        self.bia = usuario("quadro-bia@example.com", "Bia", "jogador")
        with self.database.connection() as connection:
            connection.execute("INSERT INTO sessoes_mesa (id, campanha_id, status, titulo, aberta_por) VALUES (%s, %s, 'aberta', 'x', %s)", (uuid.uuid4(), self.campanha_id, self.mestre.id))
            connection.execute("INSERT INTO mapa_cenas (id, campanha_id, nome, largura, altura, ativa) VALUES (%s, %s, 'Casa', 1200, 900, TRUE)", (self.cena, self.campanha_id))

    def tearDown(self):
        tempo_real._limpar_para_testes()
        self.database.close()
        with psycopg.connect(TEST_DSN, autocommit=True) as connection:
            connection.execute(sql.SQL("DROP SCHEMA IF EXISTS {} CASCADE").format(sql.Identifier(self.schema)))

    def _fazer(self, quem, **campos):
        from routers import mapa_quadro as rotas

        return rotas.mexer_no_quadro(self.campanha_id, rotas.QuadroInput(**campos), user=quem, database=self.database)

    def _quadro_do_mapa(self, quem):
        from routers import mapa as rotas

        return rotas.obter_mapa(self.campanha_id, None, user=quem, database=self.database)["mesa"]["quadro"]

    def test_a_mesa_monta_o_quadro_e_a_carta_escondida_so_chega_ao_mestre(self):
        self._fazer(self.ana, acao="carta", titulo="A faca", texto="Sangue seco", cor="vermelho", x=100, y=100)
        self._fazer(self.bia, acao="carta", titulo="O mordomo")
        segredo = self._fazer(self.mestre, acao="carta", titulo="Cofre do porão", visivel=False)["quadro"]["cartas"][-1]["id"]
        faca, mordomo = (c["id"] for c in self._quadro_do_mapa(self.ana)["cartas"])
        self._fazer(self.mestre, acao="ligar", de=faca, para=segredo)
        self._fazer(self.ana, acao="ligar", de=faca, para=mordomo)
        do_mestre = self._quadro_do_mapa(self.mestre)
        self.assertEqual([c["titulo"] for c in do_mestre["cartas"]], ["A faca", "O mordomo", "Cofre do porão"])
        self.assertEqual(len(do_mestre["ligacoes"]), 2)
        da_ana = self._quadro_do_mapa(self.ana)
        self.assertEqual([c["titulo"] for c in da_ana["cartas"]], ["A faca", "O mordomo"])
        self.assertEqual(len(da_ana["ligacoes"]), 1)
        self.assertNotIn(segredo, str(da_ana))
        # Revelada, a carta chega à jogadora.
        self._fazer(self.mestre, acao="revelar", id=segredo, visivel=True)
        self.assertEqual(len(self._quadro_do_mapa(self.ana)["cartas"]), 3)

    def test_quem_nao_fez_a_carta_nao_a_muda_nem_apaga_e_o_erro_vira_http(self):
        faca = self._fazer(self.ana, acao="carta", titulo="A faca")["quadro"]["cartas"][0]["id"]
        for campos in ({"acao": "carta", "id": faca, "titulo": "outra"}, {"acao": "apagar", "id": faca}, {"acao": "limpar"}):
            with self.assertRaises(HTTPException) as erro:
                self._fazer(self.bia, **campos)
            self.assertEqual(erro.exception.status_code, 403)
        # Mover vale para qualquer um; o Mestre apaga tudo.
        self._fazer(self.bia, acao="mover", id=faca, x=900, y=500)
        self.assertEqual(self._quadro_do_mapa(self.ana)["cartas"][0]["x"], 900.0)
        self._fazer(self.mestre, acao="limpar")
        self.assertEqual(self._quadro_do_mapa(self.ana), {"cartas": [], "ligacoes": []})

    def test_a_rota_generica_da_mesa_nao_sobrescreve_o_quadro(self):
        from routers import mapa_extras as rotas

        self._fazer(self.ana, acao="carta", titulo="A faca")
        rotas.mudar_mesa(self.campanha_id, {"quadro": {"cartas": [], "ligacoes": []}, "pausa": {"ligada": True, "texto": "intervalo"}}, user=self.mestre, database=self.database)
        self.assertEqual(len(self._quadro_do_mapa(self.mestre)["cartas"]), 1, "o quadro só muda pela rota dele")
