from __future__ import annotations

import concurrent.futures
import os
import threading
import time
import unittest
import uuid
from pathlib import Path

import psycopg
from psycopg import sql
from psycopg.conninfo import make_conninfo
from psycopg.types.json import Jsonb

from fastapi import HTTPException

from core.backup import TABELAS, TABELAS_IGNORADAS, gerar_backup, restaurar_backup
from core.character_summary import carregar_catalogos
from core.database import Database
from core.dependencies import AuthenticatedUser
from routers.admin import list_users
from routers.characters import create_character
from routers.context import bootstrap_context
from routers.internal import _lock_resource, deposit_discord_reward
from routers.sessions import abrir_sessao, sincronizar_iniciativa
from routers.shop import get_shop_catalog
from routers.vault import get_vault_bank_tier
from schemas import CharacterCreateInput, DiscordVaultDepositInput, SessionOpenInput


TEST_DSN = (os.getenv("TEST_DATABASE_URL") or "").strip()


@unittest.skipUnless(TEST_DSN, "TEST_DATABASE_URL nao configurada")
class DatabaseMigrationTests(unittest.TestCase):
    def setUp(self):
        production_dsn = (os.getenv("DATABASE_URL") or "").strip()
        if TEST_DSN == production_dsn:
            self.fail("TEST_DATABASE_URL nao pode ser o banco de producao")
        self.schema = f"jardim_test_{uuid.uuid4().hex}"
        with psycopg.connect(TEST_DSN, autocommit=True) as connection:
            connection.execute(
                sql.SQL("CREATE SCHEMA {}").format(sql.Identifier(self.schema))
            )
        isolated_dsn = make_conninfo(
            TEST_DSN,
            options=f"-c search_path={self.schema}",
        )
        self.database = Database(isolated_dsn)
        self.database.open()

    def tearDown(self):
        self.database.close()
        with psycopg.connect(TEST_DSN, autocommit=True) as connection:
            connection.execute(
                sql.SQL("DROP SCHEMA IF EXISTS {} CASCADE").format(
                    sql.Identifier(self.schema)
                )
            )

    def test_all_foundation_tables_exist(self):
        expected = {
            "usuarios",
            "sessoes_auth",
            "campanhas",
            "membros_campanha",
            "personagens",
            "contas_discord",
            "campanhas_discord",
            "informacoes_campanha",
            "liberacoes_informacao",
            "saldos_personagem",
            "inventario_personagem",
            "lancamentos_economia",
            "eventos_auditoria",
            "catalogo_itens",
            "cofre_itens_usuario",
            "cofre_saldos_usuario",
            "movimentos_cofre",
            "comandos_economia",
            "biblioteca_conteudo",
        }
        with self.database.connection() as connection:
            rows = connection.execute(
                """
                SELECT tablename FROM pg_tables
                WHERE schemaname=current_schema()
                """
            ).fetchall()
        actual = {row["tablename"] for row in rows}
        self.assertTrue(expected.issubset(actual), expected - actual)

    def test_backup_cobre_todas_as_tabelas_do_schema(self):
        """Tabela nova sem lugar na ordem de backup ficaria fora do arquivo."""
        with self.database.connection() as connection:
            rows = connection.execute(
                """
                SELECT tablename FROM pg_tables WHERE schemaname=current_schema()
                """
            ).fetchall()
        existentes = {row["tablename"] for row in rows}
        cobertas = set(TABELAS) | TABELAS_IGNORADAS
        self.assertEqual(existentes - cobertas, set(), "adicione em core/backup.py")

    def test_admin_lista_usuarios_sem_filtros_opcionais(self):
        """Regressão: parâmetros None precisam de tipo explícito no PostgreSQL."""
        with self.database.connection() as connection:
            connection.execute(
                """
                INSERT INTO usuarios (id, email, nome_exibicao, senha_hash)
                VALUES (%s, 'admin-lista@example.com', 'Conta teste', 'hash-falso')
                """,
                (uuid.uuid4(),),
            )

        resultado = list_users(
            busca="",
            papel=None,
            ativo=None,
            pagina=1,
            por_pagina=25,
            user=object(),
            database=self.database,
        )
        self.assertEqual(resultado["paginacao"]["total"], 1)
        self.assertEqual(resultado["usuarios"][0]["email"], "admin-lista@example.com")

    def test_sessao_usa_iniciativa_fixa_da_ficha_sem_d20(self):
        usuario_id = uuid.uuid4()
        campanha_id = uuid.uuid4()
        personagem_id = uuid.uuid4()
        ficha = {
            "derivados": {"iniciativa": 14, "vida": 20},
            "recursos": {"bonusIniciativa": 2, "vidaAtual": 20},
        }
        with self.database.connection() as connection:
            connection.execute(
                """
                INSERT INTO usuarios (id, email, nome_exibicao, senha_hash, papel_plataforma)
                VALUES (%s, 'mestre-sessao@example.com', 'Mestre', 'hash', 'mestre')
                """,
                (usuario_id,),
            )
            connection.execute(
                "INSERT INTO campanhas (id, dono_id, nome) VALUES (%s, %s, 'Mesa fixa')",
                (campanha_id, usuario_id),
            )
            connection.execute(
                """
                INSERT INTO personagens (id, campanha_id, dono_usuario_id, nome, ficha, criado_por)
                VALUES (%s, %s, %s, 'Heroína', %s, %s)
                """,
                (personagem_id, campanha_id, usuario_id, Jsonb(ficha), usuario_id),
            )
            connection.execute(
                """
                INSERT INTO membros_campanha (campanha_id, usuario_id, papel)
                VALUES (%s, %s, 'mestre')
                """,
                (campanha_id, usuario_id),
            )

        actor = AuthenticatedUser(
            id=usuario_id,
            email="mestre-sessao@example.com",
            nome_exibicao="Mestre",
            admin_plataforma=False,
            papel_plataforma="mestre",
            session_id=uuid.uuid4(),
            csrf_hash="hash",
        )
        estado = abrir_sessao(
            SessionOpenInput(campanha_id=campanha_id, titulo="Teste", incluir_personagens=True),
            user=actor,
            database=self.database,
        )
        sessao_id = estado["sessao"]["id"]
        self.assertEqual(estado["participantes"][0]["iniciativa"], 16)

        with self.database.connection() as connection:
            connection.execute(
                """
                INSERT INTO sessao_participantes
                    (id, sessao_id, nome, tipo, iniciativa, vida_atual, vida_maxima, ordem)
                VALUES (%s, %s, 'NPC', 'inimigo', 19, 10, 10, 1)
                """,
                (uuid.uuid4(), sessao_id),
            )

        sincronizado = sincronizar_iniciativa(
            sessao_id,
            user=actor,
            database=self.database,
        )
        self.assertEqual(
            [(item["nome"], item["iniciativa"]) for item in sincronizado["participantes"]],
            [("NPC", 19), ("Heroína", 16)],
        )

    def test_backup_e_restauracao_preservam_os_dados(self):
        """Ciclo completo: grava, faz backup, apaga tudo e restaura."""
        usuario_id = uuid.uuid4()
        campanha_id = uuid.uuid4()
        personagem_id = uuid.uuid4()
        ficha = {"nivel": 7, "racaId": "humano", "notas": "acentuação e emoji ✦"}

        with self.database.connection() as connection:
            connection.execute(
                """
                INSERT INTO usuarios (id, email, nome_exibicao, senha_hash, papel_plataforma)
                VALUES (%s, 'dono@example.com', 'Dono', 'hash-falso', 'mestre')
                """,
                (usuario_id,),
            )
            connection.execute(
                "INSERT INTO campanhas (id, dono_id, nome) VALUES (%s, %s, 'Mesa')",
                (campanha_id, usuario_id),
            )
            connection.execute(
                """
                INSERT INTO personagens (id, campanha_id, dono_usuario_id, nome, ficha, criado_por)
                VALUES (%s, %s, %s, 'Lys', %s, %s)
                """,
                (personagem_id, campanha_id, usuario_id, Jsonb(ficha), usuario_id),
            )
            connection.execute(
                """
                INSERT INTO membros_campanha (campanha_id, usuario_id, papel, personagem_ativo_id)
                VALUES (%s, %s, 'mestre', %s)
                """,
                (campanha_id, usuario_id, personagem_id),
            )

        conteudo, resumo = gerar_backup(self.database)
        self.assertGreaterEqual(resumo["tabelas"]["personagens"], 1)
        # Sessões e limites de login não podem vazar para o arquivo.
        self.assertNotIn("sessoes_auth", resumo["tabelas"])

        resultado = restaurar_backup(self.database, conteudo, limpar=True)
        self.assertGreaterEqual(resultado["linhas"], 4)

        with self.database.connection() as connection:
            restaurado = connection.execute(
                "SELECT nome, ficha, campanha_id FROM personagens WHERE id=%s",
                (personagem_id,),
            ).fetchone()
            vinculo = connection.execute(
                """
                SELECT papel, personagem_ativo_id FROM membros_campanha
                WHERE campanha_id=%s AND usuario_id=%s
                """,
                (campanha_id, usuario_id),
            ).fetchone()
        self.assertEqual(restaurado["nome"], "Lys")
        self.assertEqual(restaurado["ficha"], ficha)
        self.assertEqual(restaurado["campanha_id"], campanha_id)
        self.assertEqual(vinculo["personagem_ativo_id"], personagem_id)

    def test_bootstrap_context_devolve_configuracoes_da_campanha(self):
        """Regressão: o SELECT de /contexto esquecia c.configuracoes. Sem essa
        coluna, campanhaAtiva.configuracoes chegava sempre undefined no front —
        o toggle de lore/local oculto virava um no-op pra todo mundo, mestre
        incluso, e parecia "resetar" ao dar F5 mesmo com o PUT funcionando."""
        usuario_id = uuid.uuid4()
        campanha_id = uuid.uuid4()
        config = {"lore_oculto": ["erebus"], "locais_ocultos": [3, 4]}
        with self.database.connection() as connection:
            connection.execute(
                """
                INSERT INTO usuarios (id, email, nome_exibicao, senha_hash, papel_plataforma)
                VALUES (%s, 'mestre-ctx@example.com', 'Mestre', 'hash', 'mestre')
                """,
                (usuario_id,),
            )
            connection.execute(
                "INSERT INTO campanhas (id, dono_id, nome, configuracoes) VALUES (%s, %s, 'Mesa', %s)",
                (campanha_id, usuario_id, Jsonb(config)),
            )
            connection.execute(
                "INSERT INTO membros_campanha (campanha_id, usuario_id, papel) VALUES (%s, %s, 'mestre')",
                (campanha_id, usuario_id),
            )

        actor = AuthenticatedUser(
            id=usuario_id,
            email="mestre-ctx@example.com",
            nome_exibicao="Mestre",
            admin_plataforma=False,
            papel_plataforma="mestre",
            session_id=uuid.uuid4(),
            csrf_hash="hash",
        )
        resultado = bootstrap_context(campanha_id=campanha_id, user=actor, database=self.database)
        self.assertEqual(resultado["campanha"]["configuracoes"], config)

    def test_get_shop_catalog_lista_itens_ativos(self):
        """Regressão: _visible_catalog_rows filtrava WHERE tipo LIKE 'loja_%%',
        mas a coluna catalogo_itens.tipo nunca tem esse prefixo (valores reais
        são 'arma', 'armadura' etc.) — a loja voltava sempre vazia, pra todo
        mundo, sem erro nenhum (200 com {"itens": []})."""
        usuario_id = uuid.uuid4()
        campanha_id = uuid.uuid4()
        with self.database.connection() as connection:
            connection.execute(
                """
                INSERT INTO usuarios (id, email, nome_exibicao, senha_hash, papel_plataforma)
                VALUES (%s, 'jogador-loja@example.com', 'Jogador', 'hash', 'player')
                """,
                (usuario_id,),
            )
            connection.execute(
                "INSERT INTO campanhas (id, dono_id, nome) VALUES (%s, %s, 'Mesa')",
                (campanha_id, usuario_id),
            )
            connection.execute(
                "INSERT INTO membros_campanha (campanha_id, usuario_id, papel) VALUES (%s, %s, 'jogador')",
                (campanha_id, usuario_id),
            )
            connection.execute(
                """
                INSERT INTO catalogo_itens (id, tipo, titulo, conteudo, ativo)
                VALUES ('adaga-teste', 'arma', 'Adaga de Teste', %s, TRUE)
                """,
                (Jsonb({"preco": 10, "raridade": "comum"}),),
            )

        actor = AuthenticatedUser(
            id=usuario_id,
            email="jogador-loja@example.com",
            nome_exibicao="Jogador",
            admin_plataforma=False,
            papel_plataforma="player",
            session_id=uuid.uuid4(),
            csrf_hash="hash",
        )
        resultado = get_shop_catalog(campanha_id=campanha_id, user=actor, database=self.database)
        ids = {item["id"] for item in resultado["itens"]}
        self.assertIn("adaga-teste", ids)

    def test_get_vault_bank_tier_sem_vinculo_discord(self):
        """Sem conta/campanha vinculada ao Discord, devolve vinculado=False em
        vez de erro — a maior parte das contas nunca terá o bot linkado."""
        usuario_id = uuid.uuid4()
        campanha_id = uuid.uuid4()
        with self.database.connection() as connection:
            connection.execute(
                """
                INSERT INTO usuarios (id, email, nome_exibicao, senha_hash, papel_plataforma)
                VALUES (%s, 'sem-discord@example.com', 'Jogador', 'hash', 'player')
                """,
                (usuario_id,),
            )
            connection.execute(
                "INSERT INTO campanhas (id, dono_id, nome) VALUES (%s, %s, 'Mesa')",
                (campanha_id, usuario_id),
            )
            connection.execute(
                "INSERT INTO membros_campanha (campanha_id, usuario_id, papel) VALUES (%s, %s, 'jogador')",
                (campanha_id, usuario_id),
            )

        actor = AuthenticatedUser(
            id=usuario_id,
            email="sem-discord@example.com",
            nome_exibicao="Jogador",
            admin_plataforma=False,
            papel_plataforma="player",
            session_id=uuid.uuid4(),
            csrf_hash="hash",
        )
        resultado = get_vault_bank_tier(campanha_id=campanha_id, user=actor, database=self.database)
        self.assertEqual(resultado, {"vinculado": False})

    def test_get_vault_bank_tier_le_tier_do_banqueiro_via_discord(self):
        """Com conta e campanha vinculadas ao Discord, lê o tier real das
        tabelas do bot Banqueiro (schema à parte, sem FK — join manual por
        guild_id/user_id do Discord, não por UUID interno)."""
        usuario_id = uuid.uuid4()
        campanha_id = uuid.uuid4()
        discord_user_id = "111222333"
        discord_guild_id = "444555666"
        with self.database.connection() as connection:
            # As tabelas do bot não existem no schema da plataforma (ZIPs
            # separados) — recriadas aqui só pra este teste.
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS cofre (
                    guild_id TEXT NOT NULL, user_id TEXT NOT NULL, tier TEXT NOT NULL,
                    seguranca_tier TEXT NOT NULL DEFAULT 'basica',
                    PRIMARY KEY (guild_id, user_id)
                )
                """
            )
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS cofre_saldo (
                    guild_id TEXT NOT NULL, user_id TEXT NOT NULL, moeda TEXT NOT NULL,
                    saldo INTEGER NOT NULL DEFAULT 0,
                    PRIMARY KEY (guild_id, user_id, moeda)
                )
                """
            )
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS inventario (
                    guild_id TEXT NOT NULL, user_id TEXT NOT NULL, item_id TEXT NOT NULL,
                    quantidade INTEGER NOT NULL DEFAULT 0,
                    PRIMARY KEY (guild_id, user_id, item_id)
                )
                """
            )
            connection.execute(
                """
                INSERT INTO usuarios (id, email, nome_exibicao, senha_hash, papel_plataforma)
                VALUES (%s, 'com-discord@example.com', 'Jogador', 'hash', 'player')
                """,
                (usuario_id,),
            )
            connection.execute(
                "INSERT INTO campanhas (id, dono_id, nome) VALUES (%s, %s, 'Mesa')",
                (campanha_id, usuario_id),
            )
            connection.execute(
                "INSERT INTO membros_campanha (campanha_id, usuario_id, papel) VALUES (%s, %s, 'jogador')",
                (campanha_id, usuario_id),
            )
            connection.execute(
                "INSERT INTO contas_discord (usuario_id, discord_user_id) VALUES (%s, %s)",
                (usuario_id, discord_user_id),
            )
            connection.execute(
                "INSERT INTO campanhas_discord (campanha_id, discord_guild_id, vinculado_por) VALUES (%s, %s, %s)",
                (campanha_id, discord_guild_id, usuario_id),
            )
            connection.execute(
                "INSERT INTO cofre (guild_id, user_id, tier, seguranca_tier) VALUES (%s, %s, 'prata', 'fechadura')",
                (discord_guild_id, discord_user_id),
            )
            connection.execute(
                "INSERT INTO cofre_saldo (guild_id, user_id, moeda, saldo) VALUES (%s, %s, 'Lunaris', 450)",
                (discord_guild_id, discord_user_id),
            )
            connection.execute(
                "INSERT INTO inventario (guild_id, user_id, item_id, quantidade) VALUES (%s, %s, 'adaga', 3)",
                (discord_guild_id, discord_user_id),
            )
            connection.execute(
                """
                INSERT INTO cofre_itens_usuario
                    (usuario_id, campanha_id, item_id, titulo, quantidade)
                VALUES (%s, %s, 'orbe', 'Orbe Lunar', 2)
                """,
                (usuario_id, campanha_id),
            )

        actor = AuthenticatedUser(
            id=usuario_id,
            email="com-discord@example.com",
            nome_exibicao="Jogador",
            admin_plataforma=False,
            papel_plataforma="player",
            session_id=uuid.uuid4(),
            csrf_hash="hash",
        )
        resultado = get_vault_bank_tier(campanha_id=campanha_id, user=actor, database=self.database)
        self.assertTrue(resultado["vinculado"])
        self.assertEqual(resultado["tier"]["id"], "prata")
        self.assertEqual(resultado["proximo_tier"]["id"], "dourado")
        self.assertEqual(resultado["seguranca"]["id"], "fechadura")
        self.assertEqual(resultado["saldos_guardados"], [{"moeda": "Lunaris", "saldo": 450}])
        # A linha legada tem 3, mas o cofre unificado (fonte usada pelo bot
        # para contas vinculadas) tem 2. A página precisa mostrar os mesmos 2.
        self.assertEqual(resultado["itens_no_inventario"], 2)

    def test_create_character_bloqueia_raca_fora_da_arvore(self):
        """Regressão: nada validava raça/classe contra a Árvore escolhida nem
        contra liberação do mestre — um jogador podia criar qualquer
        combinação via API direta, ignorando a regra por completo."""
        carregar_catalogos(Path("..") / "data")
        usuario_id = uuid.uuid4()
        campanha_id = uuid.uuid4()
        with self.database.connection() as connection:
            connection.execute(
                """
                INSERT INTO usuarios (id, email, nome_exibicao, senha_hash, papel_plataforma)
                VALUES (%s, 'jogador-arvore@example.com', 'Jogador', 'hash', 'player')
                """,
                (usuario_id,),
            )
            connection.execute(
                "INSERT INTO campanhas (id, dono_id, nome) VALUES (%s, %s, 'Mesa')",
                (campanha_id, usuario_id),
            )
            connection.execute(
                "INSERT INTO membros_campanha (campanha_id, usuario_id, papel) VALUES (%s, %s, 'jogador')",
                (campanha_id, usuario_id),
            )

        actor = AuthenticatedUser(
            id=usuario_id,
            email="jogador-arvore@example.com",
            nome_exibicao="Jogador",
            admin_plataforma=False,
            papel_plataforma="player",
            session_id=uuid.uuid4(),
            csrf_hash="hash",
        )
        # Elfo só cabe na Árvore "aethel" — aqui o jogador tenta "erebus".
        payload = CharacterCreateInput(
            campanha_id=campanha_id,
            nome="Herói Errado",
            ficha={"arvoreId": "erebus", "racaId": "elfo", "classeId": "guerreiro"},
        )
        with self.assertRaises(HTTPException) as ctx:
            create_character(payload=payload, user=actor, database=self.database)
        self.assertEqual(ctx.exception.status_code, 422)

    def test_create_character_permite_combinacao_valida(self):
        """Raça/classe gerais cabem em qualquer Árvore — não deve bloquear."""
        carregar_catalogos(Path("..") / "data")
        usuario_id = uuid.uuid4()
        campanha_id = uuid.uuid4()
        with self.database.connection() as connection:
            connection.execute(
                """
                INSERT INTO usuarios (id, email, nome_exibicao, senha_hash, papel_plataforma)
                VALUES (%s, 'jogador-arvore-ok@example.com', 'Jogador', 'hash', 'player')
                """,
                (usuario_id,),
            )
            connection.execute(
                "INSERT INTO campanhas (id, dono_id, nome) VALUES (%s, %s, 'Mesa')",
                (campanha_id, usuario_id),
            )
            connection.execute(
                "INSERT INTO membros_campanha (campanha_id, usuario_id, papel) VALUES (%s, %s, 'jogador')",
                (campanha_id, usuario_id),
            )

        actor = AuthenticatedUser(
            id=usuario_id,
            email="jogador-arvore-ok@example.com",
            nome_exibicao="Jogador",
            admin_plataforma=False,
            papel_plataforma="player",
            session_id=uuid.uuid4(),
            csrf_hash="hash",
        )
        payload = CharacterCreateInput(
            campanha_id=campanha_id,
            nome="Herói Certo",
            ficha={"arvoreId": "aethel", "racaId": "humano", "classeId": "guerreiro"},
        )
        resultado = create_character(payload=payload, user=actor, database=self.database)
        self.assertEqual(resultado["nome"], "Herói Certo")

    def test_restaurar_recusa_arquivo_estranho(self):
        import gzip as _gzip

        lixo = _gzip.compress(b'{"formato":"outra-coisa"}\n')
        with self.assertRaises(ValueError):
            restaurar_backup(self.database, lixo)

    def _preparar_conta_vinculada_para_deposito(self):
        usuario_id = uuid.uuid4()
        campanha_id = uuid.uuid4()
        discord_user_id = "777888999"
        discord_guild_id = "111222333444"
        with self.database.connection() as connection:
            connection.execute(
                """
                INSERT INTO usuarios (id, email, nome_exibicao, senha_hash, papel_plataforma)
                VALUES (%s, 'deposito-discord@example.com', 'Jogador', 'hash', 'player')
                """,
                (usuario_id,),
            )
            connection.execute(
                "INSERT INTO campanhas (id, dono_id, nome) VALUES (%s, %s, 'Mesa')",
                (campanha_id, usuario_id),
            )
            connection.execute(
                "INSERT INTO membros_campanha (campanha_id, usuario_id, papel) VALUES (%s, %s, 'jogador')",
                (campanha_id, usuario_id),
            )
            connection.execute(
                "INSERT INTO contas_discord (usuario_id, discord_user_id) VALUES (%s, %s)",
                (usuario_id, discord_user_id),
            )
            connection.execute(
                "INSERT INTO campanhas_discord (campanha_id, discord_guild_id, vinculado_por) VALUES (%s, %s, %s)",
                (campanha_id, discord_guild_id, usuario_id),
            )
        return discord_user_id, discord_guild_id, campanha_id

    def test_deposit_discord_reward_repete_com_seguranca_em_chamadas_sequenciais(self):
        discord_user_id, discord_guild_id, campanha_id = self._preparar_conta_vinculada_para_deposito()
        payload = DiscordVaultDepositInput(
            discord_user_id=discord_user_id,
            discord_guild_id=discord_guild_id,
            idempotencia="bau-drop:sequencial",
            motivo="Baú automático do Jornalista",
            moedas=[{"moeda": "Lunaris", "quantidade": 20}],
        )
        primeira = deposit_discord_reward(payload=payload, service="jornalista", database=self.database)
        segunda = deposit_discord_reward(payload=payload, service="jornalista", database=self.database)

        self.assertFalse(primeira["repetido"])
        self.assertTrue(segunda["repetido"])
        self.assertEqual(primeira["movimento_id"], segunda["movimento_id"])
        with self.database.connection() as connection:
            total = connection.execute(
                "SELECT COUNT(*) AS n FROM movimentos_cofre WHERE campanha_id=%s AND idempotencia=%s",
                (campanha_id, "bau-drop:sequencial"),
            ).fetchone()["n"]
        self.assertEqual(total, 1)

    def test_deposit_discord_reward_nao_duplica_com_chamadas_concorrentes(self):
        """Duas chamadas de verdade contra o Postgres com a mesma chave,
        soltas quase ao mesmo tempo, não podem lançar exceção nem gerar duas
        linhas em `movimentos_cofre`. Local/mesma máquina o SELECT-então-
        INSERT antigo às vezes não corre a tempo de colidir de forma
        confiável — quem prova a trava de verdade é o teste seguinte, que
        controla a interleaving na mão em vez de torcer pra sorte do
        scheduler."""
        discord_user_id, discord_guild_id, campanha_id = self._preparar_conta_vinculada_para_deposito()

        def montar_payload():
            return DiscordVaultDepositInput(
                discord_user_id=discord_user_id,
                discord_guild_id=discord_guild_id,
                idempotencia="bau-drop:concorrente",
                motivo="Baú automático do Jornalista",
                moedas=[{"moeda": "Lunaris", "quantidade": 15}],
            )

        barreira = threading.Barrier(2)
        erros = []
        resultados = []

        def chamar():
            barreira.wait(timeout=5)
            try:
                resultados.append(
                    deposit_discord_reward(payload=montar_payload(), service="jornalista", database=self.database)
                )
            except Exception as exc:  # qualquer exceção aqui é a regressão
                erros.append(exc)

        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
            futures = [pool.submit(chamar), pool.submit(chamar)]
            for future in futures:
                future.result(timeout=10)

        self.assertEqual(erros, [], f"chamada concorrente nao deveria lancar: {erros!r}")
        self.assertEqual(len(resultados), 2)
        repetidos = [r["repetido"] for r in resultados]
        self.assertEqual(sorted(repetidos), [False, True])
        with self.database.connection() as connection:
            total = connection.execute(
                "SELECT COUNT(*) AS n FROM movimentos_cofre WHERE campanha_id=%s AND idempotencia=%s",
                (campanha_id, "bau-drop:concorrente"),
            ).fetchone()["n"]
        self.assertEqual(total, 1)

    def test_lock_resource_bloqueia_conexao_concorrente_na_mesma_chave(self):
        """Prova direta e determinística do que corrige a regressão: enquanto
        uma conexão segura `_lock_resource` numa chave, uma segunda conexão
        tentando a MESMA chave fica bloqueada — não passa reto pra fazer o
        próprio SELECT como acontecia antes da trava existir. Controlar a
        liberação na mão (em vez de torcer pra duas chamadas reais colidirem
        a tempo) é o que torna este teste confiável a cada execução."""
        chave = f"teste-lock:{uuid.uuid4()}"
        eventos = []
        a_adquiriu = threading.Event()
        pode_liberar_a = threading.Event()

        def segurar_a_trava():
            with self.database.connection() as connection:
                _lock_resource(connection, chave)
                eventos.append("A-adquiriu")
                a_adquiriu.set()
                pode_liberar_a.wait(timeout=5)
            # `with` sai daqui -> commit -> pg_advisory_xact_lock libera.

        def tentar_a_mesma_trava():
            a_adquiriu.wait(timeout=5)
            with self.database.connection() as connection:
                _lock_resource(connection, chave)
                eventos.append("B-adquiriu")

        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
            futuro_a = pool.submit(segurar_a_trava)
            futuro_b = pool.submit(tentar_a_mesma_trava)

            a_adquiriu.wait(timeout=5)
            time.sleep(0.3)  # tempo de sobra pra B ter tentado e ficado bloqueado
            self.assertNotIn(
                "B-adquiriu", eventos,
                "B conseguiu a trava enquanto A ainda a segurava — _lock_resource nao esta serializando",
            )

            pode_liberar_a.set()
            futuro_a.result(timeout=5)
            futuro_b.result(timeout=5)

        self.assertEqual(eventos, ["A-adquiriu", "B-adquiriu"])


if __name__ == "__main__":
    unittest.main()
