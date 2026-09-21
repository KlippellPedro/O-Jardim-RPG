"""Extra temporário (Vida e Mana acima do máximo) na sessão, contra Postgres real.

A ficha guarda o extra em `status.vidaTemporaria` / `status.manaTemporaria`; o
participante da sessão espelha nas colunas `vida_temporaria` / `mana_temporaria`
para o Mestre ver no HUD. Só roda com TEST_DATABASE_URL (Docker Postgres de
teste), nunca contra o banco de produção."""

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
from routers.sessions import abrir_sessao, atualizar_participante
from schemas import CharacterUpdateInput, ParticipantUpdateInput, SessionOpenInput, UsageInput


TEST_DSN = (os.getenv("TEST_DATABASE_URL") or "").strip()


@unittest.skipUnless(TEST_DSN, "TEST_DATABASE_URL nao configurada")
class ExtraTemporarioSessaoTests(unittest.TestCase):
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

    def _mesa(self, email, *, vida=40, mana=20, vida_extra=0, mana_extra=0):
        usuario_id, campanha_id, personagem_id = uuid.uuid4(), uuid.uuid4(), uuid.uuid4()
        ficha = {
            "derivados": {"iniciativa": 10, "vida": vida, "mana": mana},
            "recursos": {"vidaAtual": vida},
            "status": {
                "vidaAtual": vida,
                "manaAtual": mana,
                "vidaTemporaria": vida_extra,
                "manaTemporaria": mana_extra,
            },
        }
        with self.database.connection() as connection:
            connection.execute(
                "INSERT INTO usuarios (id, email, nome_exibicao, senha_hash, papel_plataforma) VALUES (%s, %s, 'Mestre', 'hash', 'player')",
                (usuario_id, email),
            )
            connection.execute(
                "INSERT INTO campanhas (id, dono_id, nome) VALUES (%s, %s, 'Mesa Extra')",
                (campanha_id, usuario_id),
            )
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

    def _abrir(self, campanha_id, ator):
        estado = abrir_sessao(
            SessionOpenInput(campanha_id=campanha_id, titulo="Sessao Extra", incluir_personagens=True),
            user=ator,
            database=self.database,
        )
        return estado["sessao"]["id"], estado["participantes"][0]

    def _participante(self, participante_id):
        with self.database.connection() as connection:
            return connection.execute(
                "SELECT vida_atual, vida_temporaria, mana_atual, mana_temporaria FROM sessao_participantes WHERE id=%s",
                (participante_id,),
            ).fetchone()

    def _status_da_ficha(self, personagem_id):
        with self.database.connection() as connection:
            return connection.execute(
                "SELECT ficha FROM personagens WHERE id=%s", (personagem_id,)
            ).fetchone()["ficha"]["status"]

    def test_abrir_sessao_traz_o_extra_da_ficha_e_o_mestre_ve(self):
        campanha_id, _, ator = self._mesa("extra-abrir@example.com", vida_extra=6, mana_extra=3)
        _, participante = self._abrir(campanha_id, ator)

        self.assertEqual(participante["vida_temporaria"], 6)
        self.assertEqual(participante["mana_temporaria"], 3)
        self.assertEqual(self._participante(participante["id"])["vida_temporaria"], 6)

    def test_salvar_ficha_sincroniza_o_extra_do_participante(self):
        campanha_id, personagem_id, ator = self._mesa("extra-ficha@example.com")
        _, participante = self._abrir(campanha_id, ator)

        update_character(
            personagem_id,
            CharacterUpdateInput(
                versao_esperada=1,
                nome="Heroina",
                ficha={
                    "derivados": {"vida": 40, "mana": 20},
                    "status": {"vidaAtual": 40, "manaAtual": 20, "vidaTemporaria": 9, "manaTemporaria": 4},
                    "recursos": {"vidaAtual": 40},
                },
            ),
            user=ator,
            database=self.database,
        )

        linha = self._participante(participante["id"])
        self.assertEqual(linha["vida_temporaria"], 9)
        self.assertEqual(linha["mana_temporaria"], 4)

    def test_dano_do_mestre_gasta_o_extra_primeiro_e_volta_para_a_ficha(self):
        campanha_id, personagem_id, ator = self._mesa("extra-dano@example.com", vida_extra=10)
        sessao_id, participante = self._abrir(campanha_id, ator)

        atualizar_participante(
            sessao_id, participante["id"], ParticipantUpdateInput(dano=4), user=ator, database=self.database
        )
        linha = self._participante(participante["id"])
        self.assertEqual((linha["vida_atual"], linha["vida_temporaria"]), (40, 6))
        self.assertEqual(self._status_da_ficha(personagem_id)["vidaTemporaria"], 6)

        atualizar_participante(
            sessao_id, participante["id"], ParticipantUpdateInput(dano=15), user=ator, database=self.database
        )
        linha = self._participante(participante["id"])
        self.assertEqual((linha["vida_atual"], linha["vida_temporaria"]), (31, 0))
        status = self._status_da_ficha(personagem_id)
        self.assertEqual((status["vidaAtual"], status["vidaTemporaria"]), (31, 0))

    def test_cura_do_mestre_acima_do_maximo_vira_extra(self):
        campanha_id, personagem_id, ator = self._mesa("extra-cura@example.com")
        sessao_id, participante = self._abrir(campanha_id, ator)
        atualizar_participante(
            sessao_id, participante["id"], ParticipantUpdateInput(vida_atual=35), user=ator, database=self.database
        )

        atualizar_participante(
            sessao_id, participante["id"], ParticipantUpdateInput(cura=12), user=ator, database=self.database
        )

        linha = self._participante(participante["id"])
        self.assertEqual((linha["vida_atual"], linha["vida_temporaria"]), (40, 7))
        self.assertEqual(self._status_da_ficha(personagem_id)["vidaTemporaria"], 7)

    def test_mestre_pode_definir_o_extra_direto(self):
        campanha_id, personagem_id, ator = self._mesa("extra-definir@example.com")
        sessao_id, participante = self._abrir(campanha_id, ator)

        atualizar_participante(
            sessao_id, participante["id"],
            ParticipantUpdateInput(vida_temporaria=8, mana_temporaria=5),
            user=ator, database=self.database,
        )

        linha = self._participante(participante["id"])
        self.assertEqual((linha["vida_temporaria"], linha["mana_temporaria"]), (8, 5))
        self.assertEqual(self._status_da_ficha(personagem_id)["vidaTemporaria"], 8)

    def test_custo_de_mana_no_hud_paga_o_extra_primeiro(self):
        campanha_id, personagem_id, ator = self._mesa("extra-mana@example.com", mana_extra=4)
        _, participante = self._abrir(campanha_id, ator)

        registrar_uso(
            UsageInput(
                campanha_id=campanha_id,
                personagem_id=personagem_id,
                tipo="magia",
                titulo="Bola de Fogo",
                detalhes={"recurso": "mana", "custo": 7},
            ),
            user=ator,
            database=self.database,
        )

        linha = self._participante(participante["id"])
        self.assertEqual((linha["mana_atual"], linha["mana_temporaria"]), (17, 0))


if __name__ == "__main__":
    unittest.main()
