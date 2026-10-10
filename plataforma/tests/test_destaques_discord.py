"""Destaques da mesa no Discord: subida de nível e selo conquistado.

Os avisos entram na fila `avisos_pendentes` (quem publica é o Jornalista) e cada tipo
tem interruptor em `campanha_agenda.avisos`. Selo secreto nunca sai. Os testes de
banco rodam só com TEST_DATABASE_URL (Postgres descartável)."""

from __future__ import annotations

import os
import unittest
import uuid
from pathlib import Path

import psycopg
from psycopg import sql
from psycopg.conninfo import make_conninfo
from psycopg.types.json import Jsonb

from core import conquistas
from core.character_summary import carregar_catalogos
from core.database import Database
from core.dependencies import AuthenticatedUser
from core.discord_avisos import (
    AVISOS_PADRAO, CATEGORIA_DISCORD, ROTULOS_AVISO, avisos_da_campanha, texto_nivel, texto_selo,
)
from routers.characters import create_character, update_character
from schemas import CharacterCreateInput, CharacterUpdateInput

TEST_DSN = (os.getenv("TEST_DATABASE_URL") or "").strip()


class TextosETogglesTests(unittest.TestCase):
    def test_tipos_novos_tem_padrao_rotulo_e_categoria(self):
        for tipo in ("nivel", "selo"):
            self.assertIs(AVISOS_PADRAO[tipo], True)
            self.assertTrue(ROTULOS_AVISO[tipo])
            self.assertEqual(CATEGORIA_DISCORD[tipo], "noticia")
        self.assertEqual(set(AVISOS_PADRAO), set(ROTULOS_AVISO))
        self.assertEqual(set(AVISOS_PADRAO), set(CATEGORIA_DISCORD))

    def test_mestre_pode_desligar_cada_destaque(self):
        avisos = avisos_da_campanha({"nivel": False, "selo": True, "inventado": True})
        self.assertFalse(avisos["nivel"])
        self.assertTrue(avisos["selo"])
        self.assertNotIn("inventado", avisos)

    def test_textos_curtos_e_sem_marcar_ninguem(self):
        self.assertEqual(texto_nivel("Lina", 7), "⬆️ **Lina** subiu para o nível **7**!")
        texto = texto_selo("Lina", "Mão Calejada", "Faça 50 rolagens.")
        self.assertEqual(texto, "🏅 **Lina** conquistou o selo **Mão Calejada**: Faça 50 rolagens.")
        self.assertNotIn("<@", texto_nivel("x", 1) + texto)
        self.assertLessEqual(len(texto_nivel("n" * 500, 1)), 100)
        for proibido in ("—", "–"):
            self.assertNotIn(proibido, texto_nivel("Lina", 7) + texto)


@unittest.skipUnless(TEST_DSN, "TEST_DATABASE_URL nao configurada")
class DestaquesBancoTests(unittest.TestCase):
    def setUp(self):
        if TEST_DSN == (os.getenv("DATABASE_URL") or "").strip():
            self.fail("TEST_DATABASE_URL nao pode ser o banco de producao")
        self.schema = f"jardim_test_{uuid.uuid4().hex}"
        with psycopg.connect(TEST_DSN, autocommit=True) as connection:
            connection.execute(sql.SQL("CREATE SCHEMA {}").format(sql.Identifier(self.schema)))
        self.database = Database(make_conninfo(TEST_DSN, options=f"-c search_path={self.schema}"))
        self.database.open()
        carregar_catalogos(Path("..") / "data")
        self.mestre_id, self.jogador_id, self.campanha = uuid.uuid4(), uuid.uuid4(), uuid.uuid4()
        with self.database.connection() as connection:
            connection.execute(
                """
                INSERT INTO usuarios (id, email, nome_exibicao, senha_hash, papel_plataforma)
                VALUES (%s, %s, 'Mestre', 'hash', 'mestre'), (%s, %s, 'Jogador', 'hash', 'player')
                """,
                (self.mestre_id, f"m-{self.mestre_id}@example.com", self.jogador_id, f"j-{self.jogador_id}@example.com"),
            )
            connection.execute("INSERT INTO campanhas (id, dono_id, nome) VALUES (%s, %s, 'Mesa')", (self.campanha, self.mestre_id))
            connection.execute(
                "INSERT INTO membros_campanha (campanha_id, usuario_id, papel) VALUES (%s, %s, 'mestre'), (%s, %s, 'jogador')",
                (self.campanha, self.mestre_id, self.campanha, self.jogador_id),
            )
            connection.execute(
                """
                CREATE TABLE avisos_pendentes (
                    id SERIAL PRIMARY KEY, guild_id TEXT NOT NULL, mensagem TEXT NOT NULL,
                    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, publicado BOOLEAN NOT NULL DEFAULT FALSE, categoria TEXT
                )
                """
            )
            connection.execute(
                "INSERT INTO campanhas_discord (campanha_id, discord_guild_id, vinculado_por) VALUES (%s, '999', %s)",
                (self.campanha, self.mestre_id),
            )
        self.jogador = self._usuario(self.jogador_id, "player")
        self.mestre = self._usuario(self.mestre_id, "mestre")

    def tearDown(self):
        self.database.close()
        with psycopg.connect(TEST_DSN, autocommit=True) as connection:
            connection.execute(sql.SQL("DROP SCHEMA IF EXISTS {} CASCADE").format(sql.Identifier(self.schema)))

    def _usuario(self, usuario_id, papel):
        return AuthenticatedUser(
            id=usuario_id, email=f"{usuario_id}@example.com", nome_exibicao=papel, admin_plataforma=False,
            papel_plataforma=papel, session_id=uuid.uuid4(), csrf_hash="hash",
        )

    def _avisos(self):
        with self.database.connection() as connection:
            return [
                (linha["mensagem"], linha["categoria"])
                for linha in connection.execute("SELECT mensagem, categoria FROM avisos_pendentes ORDER BY id").fetchall()
            ]

    def _desligar(self, tipo):
        with self.database.connection() as connection:
            connection.execute(
                "INSERT INTO campanha_agenda (campanha_id, avisos) VALUES (%s, %s)", (self.campanha, Jsonb({tipo: False}))
            )

    def _personagem(self, dono_id, nome="Lina", ficha=None):
        personagem_id = uuid.uuid4()
        with self.database.connection() as connection:
            connection.execute(
                "INSERT INTO personagens (id, campanha_id, dono_usuario_id, nome, ficha, criado_por) VALUES (%s, %s, %s, %s, %s, %s)",
                (personagem_id, self.campanha, dono_id, nome, Jsonb(ficha or {"nivel": 1}), dono_id),
            )
        return personagem_id

    def _registro(self, personagem_id, usuario_id, tipo="rolagem", n=1):
        with self.database.connection() as connection:
            for _ in range(n):
                connection.execute(
                    """
                    INSERT INTO registros_mesa (id, campanha_id, usuario_id, personagem_id, autor_nome, tipo, titulo, resultado, detalhes)
                    VALUES (%s, %s, %s, %s, 'Lina', %s, 'x', 10, %s)
                    """,
                    (uuid.uuid4(), self.campanha, usuario_id, personagem_id, tipo, Jsonb({})),
                )

    # ── selos ───────────────────────────────────────────────────────────────
    def test_selo_raro_de_jogador_vira_destaque_na_categoria_de_noticias(self):
        personagem_id = self._personagem(self.jogador_id)
        self._registro(personagem_id, self.jogador_id, n=200)  # 200 rolagens: Sorte Lançada (rara)
        with self.database.connection() as connection:
            resultado = conquistas.avaliar(connection, personagem_id)
        self.assertIn("sorte_lancada", resultado["novas"])
        avisos = self._avisos()
        self.assertEqual(len(avisos), 1)
        self.assertEqual(avisos[0][1], "noticia")
        self.assertIn("**Lina** conquistou o selo **Sorte Lançada**", avisos[0][0])
        # reavaliar não repete o destaque
        with self.database.connection() as connection:
            conquistas.avaliar(connection, personagem_id)
        self.assertEqual(len(self._avisos()), 1)

    def test_selo_comum_nao_enche_o_canal(self):
        personagem_id = self._personagem(self.jogador_id)
        self._registro(personagem_id, self.jogador_id)  # Primeira Rolagem (comum)
        with self.database.connection() as connection:
            resultado = conquistas.avaliar(connection, personagem_id)
        self.assertIn("primeira_rolagem", resultado["novas"])
        self.assertEqual(self._avisos(), [])

    def test_selo_da_deidade_nunca_sai_porque_entrega_lore(self):
        selo = conquistas.SELO_DA_DEIDADE
        self.assertFalse(selo.secreta)  # não é secreto na ficha, mas o canal não pode saber
        personagem_id = self._personagem(self.jogador_id)
        with self.database.connection() as connection:
            conquistas._anunciar_selos(connection, personagem_id, [selo])
        self.assertEqual(self._avisos(), [])

    def test_selo_de_nivel_nao_duplica_o_destaque_de_nivel(self):
        personagem_id = self._personagem(self.jogador_id, ficha={"nivel": 10})
        with self.database.connection() as connection:
            resultado = conquistas.avaliar(connection, personagem_id)
        self.assertTrue(any(chave.startswith("nivel_") for chave in resultado["novas"]))
        self.assertEqual(self._avisos(), [])

    def test_personagem_do_mestre_nao_gera_destaque(self):
        personagem_id = self._personagem(self.mestre_id, nome="Chefe")
        self._registro(personagem_id, self.mestre_id, n=200)
        with self.database.connection() as connection:
            conquistas.avaliar(connection, personagem_id)
        self.assertEqual(self._avisos(), [])

    def test_mestre_desliga_o_destaque_de_selo_no_site(self):
        self._desligar("selo")
        personagem_id = self._personagem(self.jogador_id)
        self._registro(personagem_id, self.jogador_id, n=200)
        with self.database.connection() as connection:
            conquistas.avaliar(connection, personagem_id)
        self.assertEqual(self._avisos(), [])

    def test_selo_secreto_nunca_sai(self):
        secretos = [c for c in conquistas.CATALOGO if c.secreta]
        self.assertTrue(secretos, "o catálogo precisa ter selos secretos para este teste")
        personagem_id = self._personagem(self.jogador_id)
        with self.database.connection() as connection:
            conquistas._anunciar_selos(connection, personagem_id, secretos)
        self.assertEqual(self._avisos(), [])

    # ── nível ───────────────────────────────────────────────────────────────
    def _ficha(self, nivel):
        from tests.test_character_rules import _ficha_criacao

        ficha = _ficha_criacao()
        ficha["classes"] = [{"classeId": "guerreiro", "nivel": nivel}]
        ficha["nivel"] = nivel
        return ficha

    def test_jogador_que_sobe_de_nivel_vira_destaque_e_descer_ou_criar_nao(self):
        criado = create_character(
            payload=CharacterCreateInput(campanha_id=self.campanha, nome="Veterana", ficha=self._ficha(3)),
            user=self.jogador, database=self.database,
        )
        self.assertEqual(self._avisos(), [])  # criar a ficha não é subir de nível
        versao = criado["versao"]
        resposta = update_character(
            criado["id"], CharacterUpdateInput(versao_esperada=versao, ficha=self._ficha(4)),
            user=self.jogador, database=self.database,
        )
        versao = resposta["personagem"]["versao"] if "personagem" in resposta else resposta["versao"]
        avisos = self._avisos()
        self.assertEqual([a for a in avisos if "subiu" in a[0]], [("⬆️ **Veterana** subiu para o nível **4**!", "noticia")])
        update_character(
            criado["id"], CharacterUpdateInput(versao_esperada=versao, ficha=self._ficha(2)),
            user=self.jogador, database=self.database,
        )
        self.assertEqual(len([a for a in self._avisos() if "subiu" in a[0]]), 1)

    def test_cada_nivel_e_anunciado_uma_vez_so_mesmo_descendo_e_subindo_de_novo(self):
        criado = create_character(
            payload=CharacterCreateInput(campanha_id=self.campanha, nome="Veterana", ficha=self._ficha(3)),
            user=self.jogador, database=self.database,
        )
        versao = criado["versao"]
        for nivel in (4, 3, 4, 5, 4, 5):
            resposta = update_character(
                criado["id"], CharacterUpdateInput(versao_esperada=versao, ficha=self._ficha(nivel)),
                user=self.jogador, database=self.database,
            )
            versao = resposta["personagem"]["versao"] if "personagem" in resposta else resposta["versao"]
        subidas = [a[0] for a in self._avisos() if "subiu" in a[0]]
        self.assertEqual(subidas, ["⬆️ **Veterana** subiu para o nível **4**!", "⬆️ **Veterana** subiu para o nível **5**!"])

    def test_nivel_acima_do_padrao_nao_vai_para_o_canal(self):
        from core.progressao_niveis import NIVEL_TOTAL_PADRAO

        criado = create_character(
            payload=CharacterCreateInput(campanha_id=self.campanha, nome="Veterana", ficha=self._ficha(NIVEL_TOTAL_PADRAO - 1)),
            user=self.jogador, database=self.database,
        )
        update_character(
            criado["id"], CharacterUpdateInput(versao_esperada=criado["versao"], ficha=self._ficha(NIVEL_TOTAL_PADRAO + 5)),
            user=self.jogador, database=self.database,
        )
        self.assertEqual([a for a in self._avisos() if "subiu" in a[0]], [])

    def test_destaque_de_nivel_respeita_o_interruptor(self):
        self._desligar("nivel")
        criado = create_character(
            payload=CharacterCreateInput(campanha_id=self.campanha, nome="Veterana", ficha=self._ficha(3)),
            user=self.jogador, database=self.database,
        )
        update_character(
            criado["id"], CharacterUpdateInput(versao_esperada=criado["versao"], ficha=self._ficha(4)),
            user=self.jogador, database=self.database,
        )
        self.assertEqual([a for a in self._avisos() if "subiu" in a[0]], [])


if __name__ == "__main__":
    unittest.main()
