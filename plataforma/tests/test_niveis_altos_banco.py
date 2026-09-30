"""Níveis além do 60 contra um PostgreSQL de verdade: migração 46 (VD igual ao
nível do grupo), XP por VD na rota da sessão e o aviso de patamar ao Mestre.

Rodam só com TEST_DATABASE_URL (Postgres descartável; ver docs/GUIA_MANUTENCAO.md).
"""

from __future__ import annotations

import os
import unittest
import uuid
from pathlib import Path

import psycopg
from psycopg import sql
from psycopg.conninfo import make_conninfo
from psycopg.types.json import Jsonb

from core.character_summary import carregar_catalogos
from core.database import Database
from core.dependencies import AuthenticatedUser
from core.schema import MIGRATIONS
from routers.characters import create_character, update_character
from routers.sessions import abrir_sessao, distribuir_xp
from schemas import (
    CharacterCreateInput,
    CharacterUpdateInput,
    DistributeXpInput,
    SessionOpenInput,
)

TEST_DSN = (os.getenv("TEST_DATABASE_URL") or "").strip()


def _usuario(usuario_id: uuid.UUID, email: str, nome: str, papel: str) -> AuthenticatedUser:
    return AuthenticatedUser(
        id=usuario_id, email=email, nome_exibicao=nome, admin_plataforma=False,
        papel_plataforma=papel, session_id=uuid.uuid4(), csrf_hash="hash",
    )


@unittest.skipUnless(TEST_DSN, "TEST_DATABASE_URL nao configurada")
class NiveisAltosBancoTests(unittest.TestCase):
    def setUp(self):
        if TEST_DSN == (os.getenv("DATABASE_URL") or "").strip():
            self.fail("TEST_DATABASE_URL nao pode ser o banco de producao")
        self.schema = f"jardim_test_{uuid.uuid4().hex}"
        with psycopg.connect(TEST_DSN, autocommit=True) as connection:
            connection.execute(sql.SQL("CREATE SCHEMA {}").format(sql.Identifier(self.schema)))
        self.database = Database(make_conninfo(TEST_DSN, options=f"-c search_path={self.schema}"))
        self.database.open()
        carregar_catalogos(Path("..") / "data")

    def tearDown(self):
        self.database.close()
        with psycopg.connect(TEST_DSN, autocommit=True) as connection:
            connection.execute(sql.SQL("DROP SCHEMA IF EXISTS {} CASCADE").format(sql.Identifier(self.schema)))

    def _mesa(self):
        mestre_id, jogador_id, campanha_id = uuid.uuid4(), uuid.uuid4(), uuid.uuid4()
        with self.database.connection() as connection:
            connection.execute(
                """
                INSERT INTO usuarios (id, email, nome_exibicao, senha_hash, papel_plataforma)
                VALUES (%s, %s, 'Mestre', 'hash', 'mestre'), (%s, %s, 'Jogador', 'hash', 'player')
                """,
                (mestre_id, f"m-{mestre_id}@example.com", jogador_id, f"j-{jogador_id}@example.com"),
            )
            connection.execute(
                "INSERT INTO campanhas (id, dono_id, nome) VALUES (%s, %s, 'Mesa alta')",
                (campanha_id, mestre_id),
            )
            connection.execute(
                """
                INSERT INTO membros_campanha (campanha_id, usuario_id, papel)
                VALUES (%s, %s, 'mestre'), (%s, %s, 'jogador')
                """,
                (campanha_id, mestre_id, campanha_id, jogador_id),
            )
        return (
            campanha_id,
            _usuario(mestre_id, f"m-{mestre_id}@example.com", "Mestre", "mestre"),
            _usuario(jogador_id, f"j-{jogador_id}@example.com", "Jogador", "player"),
        )

    # ------------------------------------------------------------------ migração 46
    def test_migracao_46_converte_o_vd_antigo_e_deixa_o_novo_em_paz(self):
        versao, nome, comandos = MIGRATIONS[-1]
        self.assertEqual((versao, nome), (46, "vd_igual_ao_nivel_do_grupo"))
        campanha_id, mestre, _ = self._mesa()
        sessao_id = uuid.uuid4()
        with self.database.connection() as connection:
            connection.execute(
                "INSERT INTO sessoes_mesa (id, campanha_id, titulo, aberta_por) VALUES (%s, %s, 'Antiga', %s)",
                (sessao_id, campanha_id, mestre.id),
            )
            for ordem, vd in enumerate((1, 2, 5, 10, 11, 48, 250, None), start=1):
                connection.execute(
                    """
                    INSERT INTO sessao_participantes
                        (id, sessao_id, nome, tipo, iniciativa, vida_atual, vida_maxima, ordem, vd)
                    VALUES (%s, %s, %s, 'inimigo', 10, 10, 10, %s, %s)
                    """,
                    (uuid.uuid4(), sessao_id, f"vd-{vd}", ordem, vd),
                )
            for comando in comandos:
                connection.execute(comando)
            linhas = connection.execute(
                "SELECT nome, vd FROM sessao_participantes WHERE sessao_id=%s ORDER BY ordem", (sessao_id,)
            ).fetchall()
        self.assertEqual(
            [(linha["nome"], linha["vd"]) for linha in linhas],
            [("vd-1", 3), ("vd-2", 8), ("vd-5", 23), ("vd-10", 48), ("vd-11", 11), ("vd-48", 48), ("vd-250", 250), ("vd-None", None)],
        )

    def test_migracao_46_esta_registrada_e_nao_roda_duas_vezes(self):
        with self.database.connection() as connection:
            registrada = connection.execute("SELECT nome FROM schema_migrations WHERE versao=46").fetchone()
        self.assertEqual(registrada["nome"], "vd_igual_ao_nivel_do_grupo")
        # Abrir de novo aplica só o que falta: nenhuma migração repete.
        self.database.apply_migrations()
        with self.database.connection() as connection:
            total = connection.execute("SELECT COUNT(*) AS n FROM schema_migrations WHERE versao=46").fetchone()["n"]
        self.assertEqual(total, 1)

    # ------------------------------------------------------------------ XP por VD
    def test_xp_por_vd_soma_e_reparte_pela_rota_real(self):
        campanha_id, mestre, jogador = self._mesa()
        personagem_ids = [uuid.uuid4(), uuid.uuid4()]
        with self.database.connection() as connection:
            for indice, personagem_id in enumerate(personagem_ids):
                connection.execute(
                    """
                    INSERT INTO personagens (id, campanha_id, dono_usuario_id, nome, ficha, criado_por)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    """,
                    (personagem_id, campanha_id, jogador.id, f"Heroi {indice}", Jsonb({"xp": 100, "status": {}, "recursos": {}}), mestre.id),
                )
        estado = abrir_sessao(
            SessionOpenInput(campanha_id=campanha_id, titulo="Luta alta", incluir_personagens=True),
            user=mestre, database=self.database,
        )
        sessao_id = estado["sessao"]["id"]
        inimigos = []
        with self.database.connection() as connection:
            for ordem, (nome, vd) in enumerate((("Ogro", 9), ("Dragao", 60), ("Sem VD", None)), start=10):
                identificador = uuid.uuid4()
                inimigos.append(identificador)
                connection.execute(
                    """
                    INSERT INTO sessao_participantes
                        (id, sessao_id, nome, tipo, iniciativa, vida_atual, vida_maxima, ordem, vd)
                    VALUES (%s, %s, %s, 'inimigo', 10, 10, 10, %s, %s)
                    """,
                    (identificador, sessao_id, nome, ordem, vd),
                )
        # VD 9 vale 1.800 e o VD 60 vale 12.000: 13.800, 6.900 para cada um dos dois.
        resposta = distribuir_xp(sessao_id, DistributeXpInput(participante_ids=inimigos), user=mestre, database=self.database)
        self.assertEqual(resposta["total_xp"], 13_800)
        self.assertEqual(resposta["xp_por_personagem"], 6_900)
        with self.database.connection() as connection:
            xps = [linha["xp"] for linha in connection.execute(
                "SELECT (ficha->>'xp')::int AS xp FROM personagens WHERE id = ANY(%s) ORDER BY nome", (personagem_ids,)
            ).fetchall()]
        self.assertEqual(xps, [7_000, 7_000])

    # ------------------------------------------------------------------ aviso de patamar
    def _ficha_no_nivel(self, nivel: int) -> dict:
        from tests.test_character_rules import _ficha_criacao

        ficha = _ficha_criacao()
        ficha["classes"] = [{"classeId": "guerreiro", "nivel": nivel}]
        ficha["nivel"] = nivel
        return ficha

    def _titulos_dos_avisos(self, campanha_id, destinatario_id):
        with self.database.connection() as connection:
            linhas = connection.execute(
                "SELECT titulo, mensagem FROM notificacoes WHERE campanha_id=%s AND usuario_id=%s ORDER BY criado_em, id",
                (campanha_id, destinatario_id),
            ).fetchall()
        return [(linha["titulo"], linha["mensagem"]) for linha in linhas]

    def test_mestre_e_avisado_ao_jogador_passar_do_nivel_60_e_ao_entrar_em_cada_patamar(self):
        campanha_id, mestre, jogador = self._mesa()
        criado = create_character(
            payload=CharacterCreateInput(campanha_id=campanha_id, nome="Veterana", ficha=self._ficha_no_nivel(59)),
            user=jogador, database=self.database,
        )
        personagem_id = criado["id"]
        versao = criado["versao"]

        def subir(nivel: int):
            nonlocal versao
            resposta = update_character(
                personagem_id,
                CharacterUpdateInput(versao_esperada=versao, ficha=self._ficha_no_nivel(nivel)),
                user=jogador, database=self.database,
            )
            versao = resposta["personagem"]["versao"] if "personagem" in resposta else resposta["versao"]

        antes = len(self._titulos_dos_avisos(campanha_id, mestre.id))
        subir(60)
        avisos = self._titulos_dos_avisos(campanha_id, mestre.id)[antes:]
        titulos = [titulo for titulo, _ in avisos]
        self.assertIn("Personagem passou do nível padrão", titulos)
        mensagem = next(texto for titulo, texto in avisos if titulo == "Personagem passou do nível padrão")
        self.assertIn("nível total 60", mensagem)
        self.assertIn("Patamar I", mensagem)

        # Subir dentro do mesmo patamar só gera o aviso comum de classe/XP.
        antes = len(self._titulos_dos_avisos(campanha_id, mestre.id))
        subir(61)
        titulos = [titulo for titulo, _ in self._titulos_dos_avisos(campanha_id, mestre.id)[antes:]]
        self.assertNotIn("Personagem passou do nível padrão", titulos)
        self.assertNotIn("Personagem entrou num patamar novo", titulos)

        # Patamar II no 100.
        antes = len(self._titulos_dos_avisos(campanha_id, mestre.id))
        subir(100)
        avisos = self._titulos_dos_avisos(campanha_id, mestre.id)[antes:]
        self.assertIn("Personagem entrou num patamar novo", [titulo for titulo, _ in avisos])
        self.assertIn("Patamar II", next(texto for titulo, texto in avisos if titulo == "Personagem entrou num patamar novo"))

        # Descer de nível nunca avisa patamar.
        antes = len(self._titulos_dos_avisos(campanha_id, mestre.id))
        subir(59)
        titulos = [titulo for titulo, _ in self._titulos_dos_avisos(campanha_id, mestre.id)[antes:]]
        self.assertNotIn("Personagem entrou num patamar novo", titulos)
        self.assertNotIn("Personagem passou do nível padrão", titulos)
