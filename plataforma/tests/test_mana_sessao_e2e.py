"""E2E de Mana contra Postgres real: HTTP (registrar_uso) -> validacao ->
desconto -> SQL -> sessao_participantes -> nova versao -> evento SSE -> HUD.

`test_mana_sessao.py` ja cobre `_descontar_mana_na_sessao` isolada via
FakeConnection; este arquivo prova que a cadeia inteira funciona com banco de
verdade, exigido pela parte 5(a) da tarefa de correcao de compatibilidade +
E2E (2026-08). Só roda com TEST_DATABASE_URL configurada (Docker Postgres de
teste) — nunca contra o banco de producao (checado em setUp, mesmo padrao de
test_database_integration.py)."""

from __future__ import annotations

import concurrent.futures
import os
import unittest
import uuid
from pathlib import Path

import psycopg
from psycopg import sql
from psycopg.conninfo import make_conninfo
from psycopg.types.json import Jsonb

from core import live_session
from core.database import Database
from core.dependencies import AuthenticatedUser
from routers.rolls import registrar_uso
from routers.characters import update_character
from routers.sessions import abrir_sessao, atualizar_participante
from schemas import CharacterUpdateInput, ParticipantUpdateInput, SessionOpenInput, UsageInput


TEST_DSN = (os.getenv("TEST_DATABASE_URL") or "").strip()


@unittest.skipUnless(TEST_DSN, "TEST_DATABASE_URL nao configurada")
class ManaSessaoE2ETests(unittest.TestCase):
    def setUp(self):
        production_dsn = (os.getenv("DATABASE_URL") or "").strip()
        if TEST_DSN == production_dsn:
            self.fail("TEST_DATABASE_URL nao pode ser o banco de producao")
        self.schema = f"jardim_test_{uuid.uuid4().hex}"
        with psycopg.connect(TEST_DSN, autocommit=True) as connection:
            connection.execute(sql.SQL("CREATE SCHEMA {}").format(sql.Identifier(self.schema)))
        isolated_dsn = make_conninfo(TEST_DSN, options=f"-c search_path={self.schema}")
        self.database = Database(isolated_dsn)
        self.database.open()

    def tearDown(self):
        self.database.close()
        with psycopg.connect(TEST_DSN, autocommit=True) as connection:
            connection.execute(sql.SQL("DROP SCHEMA IF EXISTS {} CASCADE").format(sql.Identifier(self.schema)))

    # -- helpers ----------------------------------------------------------

    def _campanha_com_personagem(self, *, email: str, vida=10, mana_ficha=20):
        usuario_id = uuid.uuid4()
        campanha_id = uuid.uuid4()
        personagem_id = uuid.uuid4()
        ficha = {
            "derivados": {"iniciativa": 10, "vida": vida, "mana": mana_ficha},
            "recursos": {"vidaAtual": vida},
            "status": {"vidaAtual": vida, "manaAtual": mana_ficha},
        }
        with self.database.connection() as connection:
            connection.execute(
                """
                INSERT INTO usuarios (id, email, nome_exibicao, senha_hash, papel_plataforma)
                VALUES (%s, %s, 'Jogador', 'hash', 'player')
                """,
                (usuario_id, email),
            )
            connection.execute(
                "INSERT INTO campanhas (id, dono_id, nome) VALUES (%s, %s, 'Mesa Mana')",
                (campanha_id, usuario_id),
            )
            connection.execute(
                "INSERT INTO membros_campanha (campanha_id, usuario_id, papel) VALUES (%s, %s, 'mestre')",
                (campanha_id, usuario_id),
            )
            connection.execute(
                """
                INSERT INTO personagens (id, campanha_id, dono_usuario_id, nome, ficha, criado_por)
                VALUES (%s, %s, %s, 'Heroina', %s, %s)
                """,
                (personagem_id, campanha_id, usuario_id, Jsonb(ficha), usuario_id),
            )
        actor = AuthenticatedUser(
            id=usuario_id,
            email=email,
            nome_exibicao="Jogador",
            admin_plataforma=False,
            papel_plataforma="mestre",
            session_id=uuid.uuid4(),
            csrf_hash="hash",
        )
        return usuario_id, campanha_id, personagem_id, actor

    def _abrir_sessao_com_mana(self, campanha_id, actor, *, mana_atual: int, mana_maxima: int):
        """abrir_sessao nao popula mana_atual/mana_maxima (so Vida) — o HUD
        de Mana em cena e' preenchido a parte, entao os testes ajustam direto."""
        estado = abrir_sessao(
            SessionOpenInput(campanha_id=campanha_id, titulo="Sessao Mana", incluir_personagens=True),
            user=actor,
            database=self.database,
        )
        sessao_id = estado["sessao"]["id"]
        participante_id = estado["participantes"][0]["id"]
        with self.database.connection() as connection:
            connection.execute(
                "UPDATE sessao_participantes SET mana_atual=%s, mana_maxima=%s WHERE id=%s",
                (mana_atual, mana_maxima, participante_id),
            )
        return sessao_id, participante_id

    def _mana_atual_no_banco(self, participante_id) -> int:
        with self.database.connection() as connection:
            linha = connection.execute(
                "SELECT mana_atual FROM sessao_participantes WHERE id=%s", (participante_id,)
            ).fetchone()
        return int(linha["mana_atual"])

    def _versao_sessao_no_banco(self, sessao_id) -> int:
        with self.database.connection() as connection:
            linha = connection.execute(
                "SELECT versao FROM sessoes_mesa WHERE id=%s", (sessao_id,)
            ).fetchone()
        return int(linha["versao"])

    def _usar_poder(self, *, campanha_id, personagem_id, actor, custo, titulo="Bola de Fogo"):
        return registrar_uso(
            UsageInput(
                campanha_id=campanha_id,
                personagem_id=personagem_id,
                tipo="magia",
                titulo=titulo,
                detalhes={"recurso": "mana", "custo": custo},
            ),
            user=actor,
            database=self.database,
        )

    def test_abrir_sessao_inicializa_mana_com_os_valores_da_ficha(self):
        _, campanha_id, _, actor = self._campanha_com_personagem(
            email="mana-abertura@example.com", mana_ficha=17
        )

        estado = abrir_sessao(
            SessionOpenInput(campanha_id=campanha_id, titulo="Sessao Mana", incluir_personagens=True),
            user=actor,
            database=self.database,
        )

        participante = estado["participantes"][0]
        self.assertEqual(participante["mana_atual"], 17)
        self.assertEqual(participante["mana_maxima"], 17)
        self.assertEqual(self._mana_atual_no_banco(participante["id"]), 17)

    def test_salvar_ficha_sincroniza_mana_do_participante_ativo(self):
        _, campanha_id, personagem_id, actor = self._campanha_com_personagem(
            email="mana-ficha-sessao@example.com", mana_ficha=20
        )
        estado = abrir_sessao(
            SessionOpenInput(campanha_id=campanha_id, titulo="Sessao Mana", incluir_personagens=True),
            user=actor,
            database=self.database,
        )
        participante_id = estado["participantes"][0]["id"]

        update_character(
            personagem_id,
            CharacterUpdateInput(
                versao_esperada=1,
                nome="Heroina",
                ficha={
                    "derivados": {"vida": 10, "mana": 20},
                    "status": {"vidaAtual": 10, "manaAtual": 7},
                    "recursos": {"vidaAtual": 10},
                },
            ),
            user=actor,
            database=self.database,
        )

        self.assertEqual(self._mana_atual_no_banco(participante_id), 7)

    # -- 1. uso normal ------------------------------------------------------

    def test_uso_normal_desconta_mana_e_publica_participante_atualizado_com_versao_correta(self):
        _, campanha_id, personagem_id, actor = self._campanha_com_personagem(email="mana-normal@example.com")
        sessao_id, participante_id = self._abrir_sessao_com_mana(campanha_id, actor, mana_atual=20, mana_maxima=20)

        fila = live_session.assinar(campanha_id)
        try:
            resultado = self._usar_poder(campanha_id=campanha_id, personagem_id=personagem_id, actor=actor, custo=6)
            self.assertEqual(resultado["registro"]["titulo"], "Bola de Fogo")
            self.assertEqual(self._mana_atual_no_banco(participante_id), 14)

            mensagens = []
            while not fila.empty():
                mensagens.append(fila.get_nowait())
            import json
            eventos = [json.loads(m) for m in mensagens]
            evento_participante = next(e for e in eventos if e["tipo"] == "participante_atualizado")
            self.assertEqual(evento_participante["versao"], self._versao_sessao_no_banco(sessao_id))
            # "registro" tambem precisa continuar saindo — o log de usos depende dele.
            self.assertTrue(any(e["tipo"] == "registro" for e in eventos))
        finally:
            live_session.cancelar(campanha_id, fila)

    # -- 2. mana insuficiente: nunca bloqueia, so zera ----------------------

    def test_mana_insuficiente_nao_bloqueia_e_zera_em_vez_de_negativo(self):
        _, campanha_id, personagem_id, actor = self._campanha_com_personagem(email="mana-insuf@example.com")
        sessao_id, participante_id = self._abrir_sessao_com_mana(campanha_id, actor, mana_atual=3, mana_maxima=20)

        resultado = self._usar_poder(campanha_id=campanha_id, personagem_id=personagem_id, actor=actor, custo=10)
        self.assertIsNotNone(resultado["registro"])
        self.assertEqual(self._mana_atual_no_banco(participante_id), 0)

    # -- 3. custo zero: nao mexe na mana nem publica participante_atualizado

    def test_custo_zero_nao_desconta_mana_nem_toca_a_sessao(self):
        _, campanha_id, personagem_id, actor = self._campanha_com_personagem(email="mana-zero@example.com")
        sessao_id, participante_id = self._abrir_sessao_com_mana(campanha_id, actor, mana_atual=20, mana_maxima=20)
        versao_antes = self._versao_sessao_no_banco(sessao_id)

        fila = live_session.assinar(campanha_id)
        try:
            self._usar_poder(campanha_id=campanha_id, personagem_id=personagem_id, actor=actor, custo=0, titulo="Anotacao livre")
            self.assertEqual(self._mana_atual_no_banco(participante_id), 20)
            self.assertEqual(self._versao_sessao_no_banco(sessao_id), versao_antes)

            import json
            mensagens = []
            while not fila.empty():
                mensagens.append(fila.get_nowait())
            eventos = [json.loads(m) for m in mensagens]
            self.assertFalse(any(e["tipo"] == "participante_atualizado" for e in eventos))
        finally:
            live_session.cancelar(campanha_id, fila)

    # -- 4. usos multiplos: descontos acumulam ------------------------------

    def test_multiplos_usos_acumulam_o_desconto_em_sequencia(self):
        _, campanha_id, personagem_id, actor = self._campanha_com_personagem(email="mana-multi@example.com")
        sessao_id, participante_id = self._abrir_sessao_com_mana(campanha_id, actor, mana_atual=20, mana_maxima=20)

        self._usar_poder(campanha_id=campanha_id, personagem_id=personagem_id, actor=actor, custo=5)
        self.assertEqual(self._mana_atual_no_banco(participante_id), 15)
        self._usar_poder(campanha_id=campanha_id, personagem_id=personagem_id, actor=actor, custo=4)
        self.assertEqual(self._mana_atual_no_banco(participante_id), 11)
        self._usar_poder(campanha_id=campanha_id, personagem_id=personagem_id, actor=actor, custo=11)
        self.assertEqual(self._mana_atual_no_banco(participante_id), 0)

    # -- 5. edicao manual do mestre no HUD sincroniza a ficha ---------------

    def test_edicao_manual_do_mestre_sincroniza_mana_atual_na_ficha(self):
        usuario_id, campanha_id, personagem_id, actor = self._campanha_com_personagem(
            email="mana-manual@example.com", mana_ficha=20
        )
        sessao_id, participante_id = self._abrir_sessao_com_mana(campanha_id, actor, mana_atual=20, mana_maxima=20)

        atualizar_participante(
            sessao_id,
            participante_id,
            ParticipantUpdateInput(mana_atual=7),
            user=actor,
            database=self.database,
        )
        self.assertEqual(self._mana_atual_no_banco(participante_id), 7)
        with self.database.connection() as connection:
            ficha = connection.execute(
                "SELECT ficha FROM personagens WHERE id=%s", (personagem_id,)
            ).fetchone()["ficha"]
        self.assertEqual(ficha["status"]["manaAtual"], 7)

    # -- 6. recuperacao de mana (edicao do mestre pra cima) ------------------

    def test_recuperacao_de_mana_pelo_mestre_soma_e_sincroniza(self):
        usuario_id, campanha_id, personagem_id, actor = self._campanha_com_personagem(
            email="mana-recover@example.com", mana_ficha=20
        )
        sessao_id, participante_id = self._abrir_sessao_com_mana(campanha_id, actor, mana_atual=2, mana_maxima=20)

        atualizar_participante(
            sessao_id,
            participante_id,
            ParticipantUpdateInput(mana_atual=20),
            user=actor,
            database=self.database,
        )
        self.assertEqual(self._mana_atual_no_banco(participante_id), 20)
        with self.database.connection() as connection:
            ficha = connection.execute(
                "SELECT ficha FROM personagens WHERE id=%s", (personagem_id,)
            ).fetchone()["ficha"]
        self.assertEqual(ficha["status"]["manaAtual"], 20)

    # -- 7. personagem sem participante na sessao (nao entrou em cena) ------

    def test_personagem_fora_da_cena_nao_quebra_e_nao_desconta_nada(self):
        _, campanha_id, personagem_id, actor = self._campanha_com_personagem(email="mana-fora-cena@example.com")
        # Sessao aberta SEM incluir personagens - ninguem entra em sessao_participantes.
        estado = abrir_sessao(
            SessionOpenInput(campanha_id=campanha_id, titulo="Sessao vazia", incluir_personagens=False),
            user=actor,
            database=self.database,
        )
        self.assertEqual(estado["participantes"], [])

        resultado = self._usar_poder(campanha_id=campanha_id, personagem_id=personagem_id, actor=actor, custo=5)
        self.assertIsNotNone(resultado["registro"])
        with self.database.connection() as connection:
            total = connection.execute(
                "SELECT COUNT(*) AS total FROM sessao_participantes WHERE sessao_id=%s",
                (estado["sessao"]["id"],),
            ).fetchone()["total"]
        self.assertEqual(total, 0)

    # -- 8. sem sessao ativa nenhuma ------------------------------------------

    def test_sem_sessao_ativa_registra_o_uso_sem_sessao_id_e_sem_erro(self):
        _, campanha_id, personagem_id, actor = self._campanha_com_personagem(email="mana-sem-sessao@example.com")
        resultado = self._usar_poder(campanha_id=campanha_id, personagem_id=personagem_id, actor=actor, custo=5)
        with self.database.connection() as connection:
            registro = connection.execute(
                "SELECT sessao_id FROM registros_mesa WHERE id=%s",
                (resultado["registro"]["id"],),
            ).fetchone()
        self.assertIsNone(registro["sessao_id"])

    # -- 9. concorrencia: FOR UPDATE evita desconto perdido -------------------

    def test_usos_concorrentes_nao_perdem_desconto_gracas_ao_lock_de_linha(self):
        _, campanha_id, personagem_id, actor = self._campanha_com_personagem(email="mana-concorrente@example.com")
        sessao_id, participante_id = self._abrir_sessao_com_mana(campanha_id, actor, mana_atual=100, mana_maxima=100)

        def usar():
            # Cada thread precisa da sua propria conexao — Database.connection()
            # não é seguro para uso concorrente entre threads (ver core/database.py).
            self._usar_poder(campanha_id=campanha_id, personagem_id=personagem_id, actor=actor, custo=1)

        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            futuros = [executor.submit(usar) for _ in range(10)]
            for futuro in concurrent.futures.as_completed(futuros):
                futuro.result()

        self.assertEqual(self._mana_atual_no_banco(participante_id), 90)


if __name__ == "__main__":
    unittest.main()
