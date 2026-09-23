"""E2E de Estamina contra Postgres real: ficha -> sessao_participantes -> HUD,
uso de poder (registrar_uso) debitando a Estamina, e o espelho de volta na
ficha quando o Mestre ajusta o HUD. Mesmo desenho de test_mana_sessao_e2e.py.
So roda com TEST_DATABASE_URL configurada, nunca contra o banco de producao."""

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
from routers.characters import update_character
from routers.rolls import registrar_uso
from routers.sessions import abrir_sessao, adicionar_participante, atualizar_participante
from schemas import (
    CharacterUpdateInput,
    ParticipantCreateInput,
    ParticipantUpdateInput,
    SessionOpenInput,
    UsageInput,
)

TEST_DSN = (os.getenv("TEST_DATABASE_URL") or "").strip()


@unittest.skipUnless(TEST_DSN, "TEST_DATABASE_URL nao configurada")
class EstaminaSessaoE2ETests(unittest.TestCase):
    def setUp(self):
        production_dsn = (os.getenv("DATABASE_URL") or "").strip()
        if TEST_DSN == production_dsn:
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

    def _campanha(self, *, email: str, estamina: int | None = 30, estamina_atual: int | None = None):
        usuario_id, campanha_id, personagem_id = uuid.uuid4(), uuid.uuid4(), uuid.uuid4()
        derivados = {"iniciativa": 10, "vida": 10, "mana": 20}
        status = {"vidaAtual": 10, "manaAtual": 20}
        if estamina is not None:
            derivados["estamina"] = estamina
        if estamina_atual is not None:
            status["estaminaAtual"] = estamina_atual
        ficha = {"derivados": derivados, "recursos": {"vidaAtual": 10}, "status": status}
        with self.database.connection() as connection:
            connection.execute(
                "INSERT INTO usuarios (id, email, nome_exibicao, senha_hash, papel_plataforma) VALUES (%s, %s, 'Jogador', 'hash', 'player')",
                (usuario_id, email),
            )
            connection.execute("INSERT INTO campanhas (id, dono_id, nome) VALUES (%s, %s, 'Mesa Estamina')", (campanha_id, usuario_id))
            connection.execute(
                "INSERT INTO membros_campanha (campanha_id, usuario_id, papel) VALUES (%s, %s, 'mestre')",
                (campanha_id, usuario_id),
            )
            connection.execute(
                "INSERT INTO personagens (id, campanha_id, dono_usuario_id, nome, ficha, criado_por) VALUES (%s, %s, %s, 'Guerreira', %s, %s)",
                (personagem_id, campanha_id, usuario_id, Jsonb(ficha), usuario_id),
            )
        actor = AuthenticatedUser(
            id=usuario_id, email=email, nome_exibicao="Jogador", admin_plataforma=False,
            papel_plataforma="mestre", session_id=uuid.uuid4(), csrf_hash="hash",
        )
        return campanha_id, personagem_id, actor

    def _abrir(self, campanha_id, actor):
        return abrir_sessao(
            SessionOpenInput(campanha_id=campanha_id, titulo="Sessao Estamina", incluir_personagens=True),
            user=actor, database=self.database,
        )

    def _linha(self, participante_id):
        with self.database.connection() as connection:
            return connection.execute(
                "SELECT estamina_atual, estamina_maxima, estamina_temporaria, mana_atual FROM sessao_participantes WHERE id=%s",
                (participante_id,),
            ).fetchone()

    def _usar(self, *, campanha_id, personagem_id, actor, recurso, custo):
        return registrar_uso(
            UsageInput(
                campanha_id=campanha_id, personagem_id=personagem_id, tipo="poder",
                titulo="Correndo", detalhes={"recurso": recurso, "custo": custo},
            ),
            user=actor, database=self.database,
        )

    def test_abrir_sessao_traz_a_estamina_da_ficha(self):
        campanha_id, _, actor = self._campanha(email="est-abertura@example.com", estamina=30, estamina_atual=12)
        participante = self._abrir(campanha_id, actor)["participantes"][0]
        self.assertEqual(participante["estamina_maxima"], 30)
        self.assertEqual(participante["estamina_atual"], 12)
        self.assertEqual(participante["estamina_temporaria"], 0)

    def test_ficha_sem_estamina_calculada_abre_sem_barra(self):
        campanha_id, _, actor = self._campanha(email="est-antiga@example.com", estamina=None)
        participante = self._abrir(campanha_id, actor)["participantes"][0]
        self.assertIsNone(participante["estamina_maxima"])
        self.assertIsNone(participante["estamina_atual"])

    def test_estamina_cheia_quando_a_ficha_nao_gravou_o_atual(self):
        campanha_id, _, actor = self._campanha(email="est-cheia@example.com", estamina=25)
        participante = self._abrir(campanha_id, actor)["participantes"][0]
        self.assertEqual(participante["estamina_atual"], 25)

    def test_uso_de_poder_de_estamina_desconta_da_estamina_e_nao_da_mana(self):
        campanha_id, personagem_id, actor = self._campanha(email="est-uso@example.com", estamina=30)
        participante_id = self._abrir(campanha_id, actor)["participantes"][0]["id"]
        self._usar(campanha_id=campanha_id, personagem_id=personagem_id, actor=actor, recurso="estamina", custo=8)
        linha = self._linha(participante_id)
        self.assertEqual(linha["estamina_atual"], 22)
        self.assertEqual(linha["mana_atual"], 20)

    def test_estamina_insuficiente_zera_em_vez_de_ficar_negativa(self):
        campanha_id, personagem_id, actor = self._campanha(email="est-zero@example.com", estamina=30, estamina_atual=3)
        participante_id = self._abrir(campanha_id, actor)["participantes"][0]["id"]
        self._usar(campanha_id=campanha_id, personagem_id=personagem_id, actor=actor, recurso="estamina", custo=10)
        self.assertEqual(self._linha(participante_id)["estamina_atual"], 0)

    def test_extra_temporario_de_estamina_paga_primeiro(self):
        campanha_id, personagem_id, actor = self._campanha(email="est-extra@example.com", estamina=30)
        participante_id = self._abrir(campanha_id, actor)["participantes"][0]["id"]
        with self.database.connection() as connection:
            connection.execute("UPDATE sessao_participantes SET estamina_temporaria=5 WHERE id=%s", (participante_id,))
        self._usar(campanha_id=campanha_id, personagem_id=personagem_id, actor=actor, recurso="estamina", custo=8)
        linha = self._linha(participante_id)
        self.assertEqual(linha["estamina_temporaria"], 0)
        self.assertEqual(linha["estamina_atual"], 27)

    def test_mestre_ajusta_estamina_no_hud_e_a_ficha_acompanha(self):
        campanha_id, personagem_id, actor = self._campanha(email="est-manual@example.com", estamina=30)
        sessao = self._abrir(campanha_id, actor)
        participante_id = sessao["participantes"][0]["id"]
        atualizar_participante(
            sessao["sessao"]["id"], participante_id,
            ParticipantUpdateInput(estamina_atual=9, estamina_temporaria=4),
            user=actor, database=self.database,
        )
        with self.database.connection() as connection:
            ficha = connection.execute("SELECT ficha FROM personagens WHERE id=%s", (personagem_id,)).fetchone()["ficha"]
        self.assertEqual(ficha["status"]["estaminaAtual"], 9)
        self.assertEqual(ficha["status"]["estaminaTemporaria"], 4)

    def test_salvar_a_ficha_sincroniza_a_estamina_do_participante(self):
        campanha_id, personagem_id, actor = self._campanha(email="est-ficha@example.com", estamina=30)
        participante_id = self._abrir(campanha_id, actor)["participantes"][0]["id"]
        update_character(
            personagem_id,
            CharacterUpdateInput(
                versao_esperada=1, nome="Guerreira",
                ficha={
                    "derivados": {"vida": 10, "mana": 20, "estamina": 30},
                    "status": {"vidaAtual": 10, "manaAtual": 20, "estaminaAtual": 11},
                    "recursos": {"vidaAtual": 10},
                },
            ),
            user=actor, database=self.database,
        )
        self.assertEqual(self._linha(participante_id)["estamina_atual"], 11)

    def test_monstro_avulso_pode_ter_estamina_ou_nenhuma(self):
        campanha_id, _, actor = self._campanha(email="est-monstro@example.com", estamina=30)
        sessao = self._abrir(campanha_id, actor)
        com = adicionar_participante(
            sessao["sessao"]["id"], ParticipantCreateInput(nome="Ogro", vida_maxima=40, estamina_maxima=15),
            user=actor, database=self.database,
        )
        sem = adicionar_participante(
            sessao["sessao"]["id"], ParticipantCreateInput(nome="Sombra", vida_maxima=10),
            user=actor, database=self.database,
        )
        self.assertEqual((self._linha(com["id"])["estamina_atual"], self._linha(com["id"])["estamina_maxima"]), (15, 15))
        self.assertIsNone(self._linha(sem["id"])["estamina_maxima"])


if __name__ == "__main__":
    unittest.main()
