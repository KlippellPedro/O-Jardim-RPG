"""Combate intenso: a regra pura (sempre roda) e o fluxo completo contra Postgres
real (só com TEST_DATABASE_URL): iniciar combate -> gastar recurso / levar
dano -> encerrar -> +1 de Cansaço, uma vez por cena."""

from __future__ import annotations

import os
import unittest
import uuid

import psycopg
from psycopg import sql
from psycopg.conninfo import make_conninfo
from psycopg.types.json import Jsonb

from core.combate_intenso import combate_foi_intenso
from core.database import Database
from core.dependencies import AuthenticatedUser
from routers.rolls import registrar_uso
from routers.sessions import abrir_sessao, atualizar_participante, controlar_turno
from schemas import ParticipantUpdateInput, SessionOpenInput, SessionTurnInput, UsageInput

TEST_DSN = (os.getenv("TEST_DATABASE_URL") or "").strip()


def marcas(**valores):
    base = {
        "vida_base": 100, "vida_min": 100,
        "mana_base": 40, "mana_min": 40,
        "estamina_base": 60, "estamina_min": 60,
    }
    base.update(valores)
    return base


class RegraCombateIntensoTests(unittest.TestCase):
    def test_combate_sem_desgaste_nao_e_intenso(self):
        self.assertFalse(combate_foi_intenso(marcas(vida_min=90, mana_min=35, estamina_min=50), 100, 40, 60))

    def test_descer_a_metade_da_vida_conta(self):
        self.assertTrue(combate_foi_intenso(marcas(vida_min=50), 100, 40, 60))

    def test_um_pouco_acima_da_metade_da_vida_nao_conta(self):
        self.assertFalse(combate_foi_intenso(marcas(vida_min=51), 100, 40, 60))

    def test_quem_ja_comecou_abaixo_da_metade_nao_desceu_de_novo(self):
        self.assertFalse(combate_foi_intenso(marcas(vida_base=40, vida_min=40), 100, 40, 60))

    def test_entrar_em_morrendo_conta_mesmo_que_tenha_sido_curado_depois(self):
        self.assertTrue(combate_foi_intenso(marcas(vida_base=30, vida_min=0), 100, 40, 60))

    def test_gastar_metade_da_mana_conta(self):
        self.assertTrue(combate_foi_intenso(marcas(mana_min=20), 100, 40, 60))
        self.assertFalse(combate_foi_intenso(marcas(mana_min=21), 100, 40, 60))

    def test_gastar_metade_da_estamina_conta(self):
        self.assertTrue(combate_foi_intenso(marcas(estamina_min=30), 100, 40, 60))
        self.assertFalse(combate_foi_intenso(marcas(estamina_min=31), 100, 40, 60))

    def test_recurso_sem_maximo_nao_dispara(self):
        self.assertFalse(combate_foi_intenso(marcas(mana_min=0, estamina_min=0), 100, 0, None))

    def test_sem_marca_nao_e_intenso(self):
        self.assertFalse(combate_foi_intenso(None, 100, 40, 60))


@unittest.skipUnless(TEST_DSN, "TEST_DATABASE_URL nao configurada")
class CombateIntensoE2ETests(unittest.TestCase):
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

    def _mesa(self, email: str, cansaco: int = 0):
        usuario_id, campanha_id, personagem_id = uuid.uuid4(), uuid.uuid4(), uuid.uuid4()
        ficha = {
            "derivados": {"iniciativa": 10, "vida": 100, "mana": 40, "estamina": 60},
            "recursos": {"vidaAtual": 100},
            "status": {"vidaAtual": 100, "manaAtual": 40, "estaminaAtual": 60, "cansacoAtual": cansaco},
        }
        with self.database.connection() as connection:
            connection.execute(
                "INSERT INTO usuarios (id, email, nome_exibicao, senha_hash, papel_plataforma) VALUES (%s, %s, 'Jogador', 'hash', 'player')",
                (usuario_id, email),
            )
            connection.execute("INSERT INTO campanhas (id, dono_id, nome) VALUES (%s, %s, 'Mesa')", (campanha_id, usuario_id))
            connection.execute(
                "INSERT INTO membros_campanha (campanha_id, usuario_id, papel) VALUES (%s, %s, 'mestre')",
                (campanha_id, usuario_id),
            )
            connection.execute(
                "INSERT INTO personagens (id, campanha_id, dono_usuario_id, nome, ficha, criado_por) VALUES (%s, %s, %s, 'Heroi', %s, %s)",
                (personagem_id, campanha_id, usuario_id, Jsonb(ficha), usuario_id),
            )
        actor = AuthenticatedUser(
            id=usuario_id, email=email, nome_exibicao="Jogador", admin_plataforma=False,
            papel_plataforma="mestre", session_id=uuid.uuid4(), csrf_hash="hash",
        )
        estado = abrir_sessao(
            SessionOpenInput(campanha_id=campanha_id, titulo="Mesa", incluir_personagens=True),
            user=actor, database=self.database,
        )
        return campanha_id, personagem_id, actor, estado["sessao"]["id"], estado["participantes"][0]["id"]

    def _turno(self, sessao_id, actor, acao):
        return controlar_turno(sessao_id, SessionTurnInput(acao=acao), user=actor, database=self.database)

    def _cansaco(self, personagem_id) -> int:
        with self.database.connection() as connection:
            ficha = connection.execute("SELECT ficha FROM personagens WHERE id=%s", (personagem_id,)).fetchone()["ficha"]
        return int(ficha["status"].get("cansacoAtual", 0))

    def _dano(self, sessao_id, participante_id, actor, dano):
        atualizar_participante(
            sessao_id, participante_id, ParticipantUpdateInput(dano=dano), user=actor, database=self.database,
        )

    def test_combate_tranquilo_nao_gera_cansaco(self):
        _, personagem_id, actor, sessao_id, participante_id = self._mesa("ci-calmo@example.com")
        self._turno(sessao_id, actor, "iniciar")
        self._dano(sessao_id, participante_id, actor, 10)
        self._turno(sessao_id, actor, "encerrar")
        self.assertEqual(self._cansaco(personagem_id), 0)

    def test_descer_a_metade_da_vida_gera_um_cansaco_no_fim(self):
        _, personagem_id, actor, sessao_id, participante_id = self._mesa("ci-vida@example.com")
        self._turno(sessao_id, actor, "iniciar")
        self._dano(sessao_id, participante_id, actor, 60)
        self.assertEqual(self._cansaco(personagem_id), 0, "o Cansaço só entra quando o combate termina")
        self._turno(sessao_id, actor, "encerrar")
        self.assertEqual(self._cansaco(personagem_id), 1)

    def test_curar_depois_nao_apaga_o_que_ja_aconteceu(self):
        _, personagem_id, actor, sessao_id, participante_id = self._mesa("ci-cura@example.com")
        self._turno(sessao_id, actor, "iniciar")
        self._dano(sessao_id, participante_id, actor, 70)
        atualizar_participante(
            sessao_id, participante_id, ParticipantUpdateInput(cura=70), user=actor, database=self.database,
        )
        self._turno(sessao_id, actor, "encerrar")
        self.assertEqual(self._cansaco(personagem_id), 1)

    def test_gastar_metade_da_estamina_por_poder_gera_cansaco(self):
        campanha_id, personagem_id, actor, sessao_id, _ = self._mesa("ci-estamina@example.com")
        self._turno(sessao_id, actor, "iniciar")
        for _ in range(2):
            registrar_uso(
                UsageInput(
                    campanha_id=campanha_id, personagem_id=personagem_id, tipo="poder",
                    titulo="Golpe", detalhes={"recurso": "estamina", "custo": 15},
                ),
                user=actor, database=self.database,
            )
        self._turno(sessao_id, actor, "encerrar")
        self.assertEqual(self._cansaco(personagem_id), 1)

    def test_varios_gatilhos_na_mesma_cena_geram_so_um_cansaco(self):
        campanha_id, personagem_id, actor, sessao_id, participante_id = self._mesa("ci-varios@example.com")
        self._turno(sessao_id, actor, "iniciar")
        self._dano(sessao_id, participante_id, actor, 100)
        registrar_uso(
            UsageInput(
                campanha_id=campanha_id, personagem_id=personagem_id, tipo="magia",
                titulo="Fogo", detalhes={"recurso": "mana", "custo": 30},
            ),
            user=actor, database=self.database,
        )
        self._turno(sessao_id, actor, "encerrar")
        self.assertEqual(self._cansaco(personagem_id), 1)

    def test_segundo_combate_comeca_do_zero(self):
        _, personagem_id, actor, sessao_id, participante_id = self._mesa("ci-dois@example.com")
        self._turno(sessao_id, actor, "iniciar")
        self._dano(sessao_id, participante_id, actor, 60)
        self._turno(sessao_id, actor, "encerrar")
        self.assertEqual(self._cansaco(personagem_id), 1)
        self._turno(sessao_id, actor, "iniciar")
        self._turno(sessao_id, actor, "encerrar")
        self.assertEqual(self._cansaco(personagem_id), 1)

    def test_cansaco_nao_passa_de_seis(self):
        _, personagem_id, actor, sessao_id, participante_id = self._mesa("ci-teto@example.com", cansaco=6)
        self._turno(sessao_id, actor, "iniciar")
        self._dano(sessao_id, participante_id, actor, 60)
        self._turno(sessao_id, actor, "encerrar")
        self.assertEqual(self._cansaco(personagem_id), 6)


if __name__ == "__main__":
    unittest.main()
