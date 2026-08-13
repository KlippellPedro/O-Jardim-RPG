from __future__ import annotations

import os
import unittest
import uuid
from concurrent.futures import ThreadPoolExecutor

import psycopg
from fastapi import HTTPException
from psycopg import sql
from psycopg.conninfo import make_conninfo
from psycopg.types.json import Jsonb
from pydantic import ValidationError

from core.database import Database
from core.dependencies import AuthenticatedUser
from core.economy_commands import (
    CatalogPrice,
    command_fingerprint,
    get_economy_command_replay,
    normalize_catalog_filter,
    resale_value,
    resolve_catalog_price,
)
from routers.bounties import (
    listar_reivindicacoes_pendentes,
    reivindicar_recompensa,
    resolver_recompensa,
)
from routers.shop import (
    _catalog_shop_level,
    _inventory_category,
    get_shop_catalog,
    purchase_batch,
    sell_batch,
)
from schemas import (
    BountyClaimCommandInput,
    BountyResolveCommandInput,
    ShopBatchCommandInput,
)


class _StaticCursor:
    def __init__(self, row):
        self.row = row

    def fetchone(self):
        return self.row


class _ReplayConnection:
    def __init__(self, row):
        self.row = row

    def execute(self, _statement, _params=None):
        return _StaticCursor(self.row)


class EconomyCommandUnitTests(unittest.TestCase):
    def test_numeric_catalog_price_is_always_solares(self):
        self.assertEqual(
            resolve_catalog_price({"preco": 280}),
            CatalogPrice(moeda="Solares", valor=280),
        )

    def test_single_currency_catalog_price_is_preserved(self):
        self.assertEqual(
            resolve_catalog_price({"preco": {"Fragmentos de Estrela": 50}}),
            CatalogPrice(moeda="Fragmentos de Estrela", valor=50),
        )

    def test_invalid_or_ambiguous_catalog_prices_are_rejected(self):
        invalid = (
            [],
            {"preco": True},
            {"preco": 1.5},
            {"preco": 0},
            {"preco": -1},
            {"preco": {}},
            {"preco": {"Solares": 2, "Lunaris": 20}},
            {"preco": {"": 2}},
            {"preco": {"Solares": "2"}},
        )
        for content in invalid:
            with self.subTest(content=content):
                self.assertIsNone(resolve_catalog_price(content))

    def test_resale_is_half_rounded_down_with_minimum_one(self):
        self.assertEqual(resale_value(CatalogPrice("Solares", 5)).valor, 2)
        self.assertEqual(resale_value(CatalogPrice("Solares", 1)).valor, 1)

    def test_catalog_filter_normalizes_case_accents_and_whitespace(self):
        self.assertEqual(normalize_catalog_filter("  Relíquia   da CRIAÇÃO "), "reliquia da criacao")

    def test_shop_schema_rejects_client_controlled_economy_fields(self):
        base = {
            "campanha_id": uuid.uuid4(),
            "personagem_id": uuid.uuid4(),
            "economia_versao_esperada": 1,
            "idempotencia": "checkout-12345678",
            "itens": [{"item_id": "adaga", "quantidade": 1}],
        }
        for field, value in (
            ("preco", 1),
            ("moeda", "Lunaris"),
            ("carteira", []),
            ("inventario", []),
        ):
            with self.subTest(field=field), self.assertRaises(ValidationError):
                ShopBatchCommandInput(**base, **{field: value})
        with self.assertRaises(ValidationError):
            ShopBatchCommandInput(
                **{
                    **base,
                    "itens": [
                        {"item_id": "adaga", "quantidade": 1, "preco": 1}
                    ],
                }
            )
        for invalid_location in (True, 0, 5, "2"):
            with self.subTest(location=invalid_location), self.assertRaises(ValidationError):
                ShopBatchCommandInput(**base, localizacao_loja=invalid_location)

    def test_shop_level_and_vehicle_inventory_category_are_server_authoritative(self):
        self.assertEqual(_inventory_category("veiculo"), "modulo-veicular")
        self.assertEqual(_inventory_category("veiculo-completo"), "veiculo")
        self.assertEqual(
            _catalog_shop_level({"tipo": "arma", "conteudo": {"raridade": "comum", "preco": 1}}),
            1,
        )
        self.assertEqual(
            _catalog_shop_level({"tipo": "veiculo", "conteudo": {"raridade": "incomum", "preco": 1}}),
            2,
        )
        self.assertEqual(
            _catalog_shop_level({"tipo": "arma", "conteudo": {"raridade": "comum", "subtipo": "marcial", "preco": 1}}),
            2,
        )
        self.assertEqual(
            _catalog_shop_level({"tipo": "artefato", "conteudo": {"raridade": "epico", "preco": 1}}),
            3,
        )
        self.assertEqual(
            _catalog_shop_level({"tipo": "arma", "conteudo": {"raridade": "lendario", "preco": 1}}),
            4,
        )
        self.assertEqual(
            _catalog_shop_level({"tipo": "arma", "conteudo": {"raridade": "comum", "preco": 1, "nivelMinimoLoja": 3}}),
            3,
        )
        self.assertEqual(
            _catalog_shop_level({"tipo": "arma", "conteudo": {"raridade": "inválida", "preco": 1}}),
            4,
        )

    def test_bounty_schema_rejects_client_reward_value(self):
        with self.assertRaises(ValidationError):
            BountyClaimCommandInput(
                cacador_personagem_id=uuid.uuid4(),
                alvo_personagem_id=uuid.uuid4(),
                idempotencia="claim-12345678",
                valor_total=999_999_999,
            )

    def test_batch_rejects_duplicate_items_and_excessive_total(self):
        base = {
            "campanha_id": uuid.uuid4(),
            "personagem_id": uuid.uuid4(),
            "economia_versao_esperada": 1,
            "idempotencia": "checkout-12345678",
        }
        with self.assertRaises(ValidationError):
            ShopBatchCommandInput(
                **base,
                itens=[
                    {"item_id": "adaga", "quantidade": 1},
                    {"item_id": "adaga", "quantidade": 2},
                ],
            )
        with self.assertRaises(ValidationError):
            ShopBatchCommandInput(
                **base,
                itens=[
                    {"item_id": "adaga", "quantidade": 300},
                    {"item_id": "espada", "quantidade": 201},
                ],
            )

    def test_command_numbers_and_decisions_do_not_accept_coercion(self):
        base = {
            "campanha_id": uuid.uuid4(),
            "personagem_id": uuid.uuid4(),
            "economia_versao_esperada": 1,
            "idempotencia": "checkout-strict1",
            "itens": [{"item_id": "adaga", "quantidade": 1}],
        }
        for invalid_version in ("1", True):
            with self.subTest(version=invalid_version), self.assertRaises(ValidationError):
                ShopBatchCommandInput(
                    **{**base, "economia_versao_esperada": invalid_version}
                )
        for invalid_quantity in ("1", True):
            with self.subTest(quantity=invalid_quantity), self.assertRaises(ValidationError):
                ShopBatchCommandInput(
                    **{
                        **base,
                        "itens": [{"item_id": "adaga", "quantidade": invalid_quantity}],
                    }
                )
        for invalid_decision in ("true", "false", 0, 1):
            with self.subTest(decision=invalid_decision), self.assertRaises(ValidationError):
                BountyResolveCommandInput(
                    claim_id=uuid.uuid4(),
                    aprovado=invalid_decision,
                    idempotencia="resolve-strict1",
                )
    def test_fingerprint_ignores_idempotency_but_detects_command_change(self):
        campaign_id = uuid.uuid4()
        character_id = uuid.uuid4()
        first = ShopBatchCommandInput(
            campanha_id=campaign_id,
            personagem_id=character_id,
            economia_versao_esperada=1,
            idempotencia="checkout-first1",
            itens=[{"item_id": "adaga", "quantidade": 1}],
        )
        replay = first.model_copy(update={"idempotencia": "checkout-second"})
        changed = first.model_copy(
            update={"itens": [first.itens[0].model_copy(update={"quantidade": 2})]}
        )
        self.assertEqual(command_fingerprint(first), command_fingerprint(replay))
        self.assertNotEqual(command_fingerprint(first), command_fingerprint(changed))

    def test_persisted_replay_is_returned_and_fingerprint_mismatch_is_blocked(self):
        campaign_id = uuid.uuid4()
        user_id = uuid.uuid4()
        operation_id = uuid.uuid4()
        connection = _ReplayConnection(
            {
                "id": operation_id,
                "requisicao_hash": "a" * 64,
                "resultado": {"operacao_id": str(operation_id), "repetida": False},
            }
        )
        replay = get_economy_command_replay(
            connection,
            campaign_id=campaign_id,
            user_id=user_id,
            command_type="loja.compra",
            idempotency_key="checkout-12345678",
            fingerprint="a" * 64,
        )
        self.assertEqual(replay.id, operation_id)
        self.assertTrue(replay.replay_result["repetida"])
        with self.assertRaises(HTTPException) as raised:
            get_economy_command_replay(
                connection,
                campaign_id=campaign_id,
                user_id=user_id,
                command_type="loja.compra",
                idempotency_key="checkout-12345678",
                fingerprint="b" * 64,
            )
        self.assertEqual(raised.exception.status_code, 409)


TEST_DSN = (os.getenv("TEST_DATABASE_URL") or "").strip()


@unittest.skipUnless(TEST_DSN, "TEST_DATABASE_URL nao configurada")
class EconomyCommandIntegrationTests(unittest.TestCase):
    def setUp(self):
        production_dsn = (os.getenv("DATABASE_URL") or "").strip()
        if TEST_DSN == production_dsn:
            self.fail("TEST_DATABASE_URL nao pode ser o banco de producao")
        self.schema = f"jardim_economy_{uuid.uuid4().hex}"
        with psycopg.connect(TEST_DSN, autocommit=True) as connection:
            connection.execute(sql.SQL("CREATE SCHEMA {}").format(sql.Identifier(self.schema)))
        isolated_dsn = make_conninfo(TEST_DSN, options=f"-c search_path={self.schema}")
        self.database = Database(isolated_dsn)
        self.database.open()

        self.master_id = uuid.uuid4()
        self.player_id = uuid.uuid4()
        self.target_user_id = uuid.uuid4()
        self.campaign_id = uuid.uuid4()
        self.hunter_id = uuid.uuid4()
        self.target_id = uuid.uuid4()
        self.catalog_publication_id = uuid.uuid4()
        with self.database.connection() as connection:
            connection.execute(
                """
                CREATE TABLE recompensa (
                    guild_id TEXT NOT NULL,
                    alvo_user_id TEXT NOT NULL,
                    valor_jogadores INTEGER NOT NULL DEFAULT 0,
                    valor_sistema INTEGER NOT NULL DEFAULT 0,
                    atualizada_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (guild_id, alvo_user_id)
                )
                """
            )
            for user_id, email, name, role in (
                (self.master_id, "master@example.com", "Master", "mestre"),
                (self.player_id, "player@example.com", "Player", "player"),
                (self.target_user_id, "target@example.com", "Target", "player"),
            ):
                connection.execute(
                    """
                    INSERT INTO usuarios
                        (id, email, nome_exibicao, senha_hash, papel_plataforma)
                    VALUES (%s, %s, %s, 'hash', %s)
                    """,
                    (user_id, email, name, role),
                )
            connection.execute(
                "INSERT INTO campanhas (id, dono_id, nome) VALUES (%s, %s, 'Campanha')",
                (self.campaign_id, self.master_id),
            )
            for user_id, role in (
                (self.master_id, "mestre"),
                (self.player_id, "jogador"),
                (self.target_user_id, "jogador"),
            ):
                connection.execute(
                    """
                    INSERT INTO membros_campanha (campanha_id, usuario_id, papel)
                    VALUES (%s, %s, %s)
                    """,
                    (self.campaign_id, user_id, role),
                )
            connection.execute(
                """
                INSERT INTO personagens
                    (id, campanha_id, dono_usuario_id, nome, ficha, criado_por)
                VALUES
                    (%s, %s, %s, 'Cacador', '{}'::jsonb, %s),
                    (%s, %s, %s, 'Alvo', '{}'::jsonb, %s)
                """,
                (
                    self.hunter_id,
                    self.campaign_id,
                    self.player_id,
                    self.player_id,
                    self.target_id,
                    self.campaign_id,
                    self.target_user_id,
                    self.target_user_id,
                ),
            )
            connection.execute(
                """
                INSERT INTO catalogo_itens (id, tipo, titulo, conteudo)
                VALUES ('adaga', 'arma', 'Adaga', %s)
                """,
                (Jsonb({"preco": 5, "raridade": "comum", "dano": "1d4"}),),
            )
            connection.execute(
                """
                INSERT INTO informacoes_campanha
                    (id, campanha_id, tipo, chave_recurso, titulo,
                     dados_completos, acesso_padrao, criado_por)
                VALUES (%s, %s, 'loja', 'arma:adaga', 'Adaga', %s, 'completo', %s)
                """,
                (
                    self.catalog_publication_id,
                    self.campaign_id,
                    Jsonb({"id": "adaga"}),
                    self.master_id,
                ),
            )
            connection.execute(
                """
                INSERT INTO saldos_personagem (campanha_id, personagem_id, moeda, saldo)
                VALUES (%s, %s, 'Solares', 100)
                """,
                (self.campaign_id, self.hunter_id),
            )
            connection.execute(
                "INSERT INTO contas_discord (usuario_id, discord_user_id) VALUES (%s, '222222222222')",
                (self.target_user_id,),
            )
            connection.execute(
                """
                INSERT INTO campanhas_discord (campanha_id, discord_guild_id, vinculado_por)
                VALUES (%s, '111111111111', %s)
                """,
                (self.campaign_id, self.master_id),
            )

        self.player = self._user(self.player_id, "player@example.com", "Player", "player")
        self.master = self._user(self.master_id, "master@example.com", "Master", "mestre")

    def tearDown(self):
        self.database.close()
        with psycopg.connect(TEST_DSN, autocommit=True) as connection:
            connection.execute(
                sql.SQL("DROP SCHEMA IF EXISTS {} CASCADE").format(sql.Identifier(self.schema))
            )

    @staticmethod
    def _user(user_id, email, name, role):
        return AuthenticatedUser(
            id=user_id,
            email=email,
            nome_exibicao=name,
            admin_plataforma=False,
            papel_plataforma=role,
            session_id=uuid.uuid4(),
            csrf_hash="hash",
        )

    def _purchase_payload(self, *, key="checkout-12345678", version=1, quantity=1, location=1):
        return ShopBatchCommandInput(
            campanha_id=self.campaign_id,
            personagem_id=self.hunter_id,
            economia_versao_esperada=version,
            localizacao_loja=location,
            idempotencia=key,
            itens=[{"item_id": "adaga", "quantidade": quantity}],
        )

    def test_catalog_and_purchase_are_server_authoritative_and_replayable(self):
        catalog = get_shop_catalog(self.campaign_id, user=self.player, database=self.database)
        self.assertEqual(catalog["itens"][0]["preco"], {"moeda": "Solares", "valor": 5})

        payload = self._purchase_payload(quantity=2)
        result = purchase_batch(payload, user=self.player, database=self.database)
        replay = purchase_batch(payload, user=self.player, database=self.database)
        self.assertFalse(result["repetida"])
        self.assertTrue(replay["repetida"])
        self.assertEqual(result["operacao_id"], replay["operacao_id"])
        self.assertEqual(result["debitos"], [{"moeda": "Solares", "valor": 10, "saldo": 90}])
        with self.database.connection() as connection:
            balance = connection.execute(
                "SELECT saldo FROM saldos_personagem WHERE personagem_id=%s AND moeda='Solares'",
                (self.hunter_id,),
            ).fetchone()["saldo"]
            item = connection.execute(
                "SELECT quantidade, dados FROM inventario_personagem WHERE personagem_id=%s",
                (self.hunter_id,),
            ).fetchone()
        self.assertEqual(balance, 90)
        self.assertEqual(item["quantidade"], 2)
        self.assertEqual(item["dados"]["origem"], "loja")
        self.assertEqual(item["dados"]["catalogo_item_id"], "adaga")
        self.assertEqual(item["dados"]["categoria"], "arma")

    def test_purchase_replay_survives_character_archival_without_second_debit(self):
        payload = self._purchase_payload()
        original = purchase_batch(payload, user=self.player, database=self.database)
        with self.database.connection() as connection:
            connection.execute(
                "UPDATE personagens SET status='arquivado' WHERE id=%s",
                (self.hunter_id,),
            )
        replay = purchase_batch(payload, user=self.player, database=self.database)
        self.assertTrue(replay["repetida"])
        self.assertEqual(replay["operacao_id"], original["operacao_id"])
        with self.database.connection() as connection:
            balance = connection.execute(
                "SELECT saldo FROM saldos_personagem WHERE personagem_id=%s AND moeda='Solares'",
                (self.hunter_id,),
            ).fetchone()["saldo"]
        self.assertEqual(balance, 95)

    def test_idempotency_key_cannot_be_reused_with_changed_payload(self):
        purchase_batch(self._purchase_payload(), user=self.player, database=self.database)
        with self.assertRaises(HTTPException) as raised:
            purchase_batch(
                self._purchase_payload(quantity=2),
                user=self.player,
                database=self.database,
            )
        self.assertEqual(raised.exception.status_code, 409)

    def test_two_concurrent_commands_with_same_version_only_debit_once(self):
        payloads = (
            self._purchase_payload(key="checkout-concur-a"),
            self._purchase_payload(key="checkout-concur-b"),
        )

        def execute(payload):
            try:
                return purchase_batch(payload, user=self.player, database=self.database)
            except HTTPException as exc:
                return exc

        with ThreadPoolExecutor(max_workers=2) as executor:
            results = list(executor.map(execute, payloads))
        self.assertEqual(sum(isinstance(item, HTTPException) for item in results), 1)
        self.assertEqual(next(item for item in results if isinstance(item, HTTPException)).status_code, 409)
        with self.database.connection() as connection:
            balance = connection.execute(
                "SELECT saldo FROM saldos_personagem WHERE personagem_id=%s AND moeda='Solares'",
                (self.hunter_id,),
            ).fetchone()["saldo"]
        self.assertEqual(balance, 95)

    def test_concurrent_replay_with_same_key_returns_one_persisted_result(self):
        payload = self._purchase_payload(key="checkout-same-key")
        with ThreadPoolExecutor(max_workers=2) as executor:
            results = list(
                executor.map(
                    lambda _: purchase_batch(payload, user=self.player, database=self.database),
                    range(2),
                )
            )
        self.assertEqual({item["operacao_id"] for item in results}, {results[0]["operacao_id"]})
        self.assertEqual(sorted(item["repetida"] for item in results), [False, True])
        with self.database.connection() as connection:
            balance = connection.execute(
                "SELECT saldo FROM saldos_personagem WHERE personagem_id=%s AND moeda='Solares'",
                (self.hunter_id,),
            ).fetchone()["saldo"]
        self.assertEqual(balance, 95)

    def test_hidden_rarity_is_not_listed_or_purchasable(self):
        with self.database.connection() as connection:
            connection.execute(
                "UPDATE campanhas SET configuracoes=%s WHERE id=%s",
                (Jsonb({"raridades_ocultas": ["Comum"]}), self.campaign_id),
            )
        self.assertEqual(
            get_shop_catalog(self.campaign_id, user=self.player, database=self.database)["itens"],
            [],
        )
        with self.assertRaises(HTTPException) as raised:
            purchase_batch(self._purchase_payload(), user=self.player, database=self.database)
        self.assertEqual(raised.exception.status_code, 403)

    def test_hidden_item_id_is_not_listed_or_purchasable(self):
        with self.database.connection() as connection:
            connection.execute(
                "UPDATE campanhas SET configuracoes=%s WHERE id=%s",
                (Jsonb({"itens_ocultos": ["  ADAGA  "]}), self.campaign_id),
            )
        self.assertEqual(
            get_shop_catalog(self.campaign_id, user=self.player, database=self.database)["itens"],
            [],
        )
        with self.assertRaises(HTTPException) as raised:
            purchase_batch(self._purchase_payload(), user=self.player, database=self.database)
        self.assertEqual(raised.exception.status_code, 403)

    def test_purchase_enforces_catalog_level_and_hidden_location_on_server(self):
        with self.database.connection() as connection:
            connection.execute(
                "UPDATE catalogo_itens SET conteudo=conteudo || %s WHERE id='adaga'",
                (Jsonb({"nivelMinimoLoja": 2}),),
            )
        with self.assertRaises(HTTPException) as raised:
            purchase_batch(
                self._purchase_payload(key="checkout-low-location", location=1),
                user=self.player,
                database=self.database,
            )
        self.assertEqual(raised.exception.status_code, 403)
        purchase_batch(
            self._purchase_payload(key="checkout-valid-location", location=2),
            user=self.player,
            database=self.database,
        )

        with self.database.connection() as connection:
            connection.execute(
                "UPDATE campanhas SET configuracoes=%s WHERE id=%s",
                (Jsonb({"locais_ocultos": [2]}), self.campaign_id),
            )
        with self.assertRaises(HTTPException) as hidden:
            purchase_batch(
                self._purchase_payload(key="checkout-hidden-location", version=2, location=2),
                user=self.player,
                database=self.database,
            )
        self.assertEqual(hidden.exception.status_code, 403)

    def test_purchase_enforces_master_authorization_flag(self):
        with self.database.connection() as connection:
            connection.execute(
                "UPDATE catalogo_itens SET conteudo=conteudo || %s WHERE id='adaga'",
                (Jsonb({"requer_autorizacao_mestre": True}),),
            )
        with self.assertRaises(HTTPException) as raised:
            purchase_batch(
                self._purchase_payload(key="checkout-master-only"),
                user=self.player,
                database=self.database,
            )
        self.assertEqual(raised.exception.status_code, 403)
        self.assertIn("Mestre", str(raised.exception.detail))

    def test_insufficient_balance_rolls_back_every_economic_change(self):
        with self.assertRaises(HTTPException) as raised:
            purchase_batch(
                self._purchase_payload(quantity=21),
                user=self.player,
                database=self.database,
            )
        self.assertEqual(raised.exception.status_code, 409)
        with self.database.connection() as connection:
            balance = connection.execute(
                "SELECT saldo FROM saldos_personagem WHERE personagem_id=%s AND moeda='Solares'",
                (self.hunter_id,),
            ).fetchone()["saldo"]
            inventory = connection.execute(
                "SELECT 1 FROM inventario_personagem WHERE personagem_id=%s",
                (self.hunter_id,),
            ).fetchone()
            version = connection.execute(
                "SELECT economia_versao FROM personagens WHERE id=%s",
                (self.hunter_id,),
            ).fetchone()["economia_versao"]
        self.assertEqual(balance, 100)
        self.assertIsNone(inventory)
        self.assertEqual(version, 1)

    def test_player_cannot_purchase_for_another_users_character(self):
        payload = ShopBatchCommandInput(
            campanha_id=self.campaign_id,
            personagem_id=self.target_id,
            economia_versao_esperada=1,
            idempotencia="checkout-target1",
            itens=[{"item_id": "adaga", "quantidade": 1}],
        )
        with self.assertRaises(HTTPException) as raised:
            purchase_batch(payload, user=self.player, database=self.database)
        self.assertEqual(raised.exception.status_code, 422)

    def test_sale_requires_verified_origin_and_uses_half_catalog_price(self):
        purchase_batch(self._purchase_payload(), user=self.player, database=self.database)
        sale = ShopBatchCommandInput(
            campanha_id=self.campaign_id,
            personagem_id=self.hunter_id,
            economia_versao_esperada=2,
            idempotencia="sell-123456789",
            itens=[{"item_id": "adaga", "quantidade": 1}],
        )
        result = sell_batch(sale, user=self.player, database=self.database)
        self.assertEqual(result["creditos"], [{"moeda": "Solares", "valor": 2, "saldo": 97}])
        self.assertEqual(result["economia_versao"], 3)

    def test_repurchase_preserves_instance_state_but_restores_catalog_fields(self):
        purchase_batch(self._purchase_payload(), user=self.player, database=self.database)
        with self.database.connection() as connection:
            connection.execute(
                """
                UPDATE inventario_personagem
                SET dados=dados || %s
                WHERE personagem_id=%s AND item_id='adaga'
                """,
                (Jsonb({"equipado": True, "favorito": True, "preco": 1}), self.hunter_id),
            )
        purchase_batch(
            self._purchase_payload(key="checkout-rebuy12", version=2),
            user=self.player,
            database=self.database,
        )
        with self.database.connection() as connection:
            item = connection.execute(
                "SELECT quantidade, dados FROM inventario_personagem WHERE personagem_id=%s",
                (self.hunter_id,),
            ).fetchone()
        self.assertEqual(item["quantidade"], 2)
        self.assertTrue(item["dados"]["equipado"])
        self.assertTrue(item["dados"]["favorito"])
        self.assertEqual(item["dados"]["preco"], 5)

    def test_forged_inventory_item_cannot_be_sold(self):
        with self.database.connection() as connection:
            connection.execute(
                """
                INSERT INTO inventario_personagem
                    (campanha_id, personagem_id, item_id, titulo, quantidade, dados)
                VALUES (%s, %s, 'adaga', 'Adaga forjada', 500, %s)
                """,
                (self.campaign_id, self.hunter_id, Jsonb({"origem": "cliente"})),
            )
        payload = ShopBatchCommandInput(
            campanha_id=self.campaign_id,
            personagem_id=self.hunter_id,
            economia_versao_esperada=1,
            idempotencia="sell-forged-123",
            itens=[{"item_id": "adaga", "quantidade": 1}],
        )
        with self.assertRaises(HTTPException) as raised:
            sell_batch(payload, user=self.player, database=self.database)
        self.assertEqual(raised.exception.status_code, 422)

    def _seed_bounty(self, players=40, system=10):
        with self.database.connection() as connection:
            connection.execute(
                """
                INSERT INTO recompensa
                    (guild_id, alvo_user_id, valor_jogadores, valor_sistema)
                VALUES ('111111111111', '222222222222', %s, %s)
                ON CONFLICT (guild_id, alvo_user_id) DO UPDATE SET
                    valor_jogadores=EXCLUDED.valor_jogadores,
                    valor_sistema=EXCLUDED.valor_sistema
                """,
                (players, system),
            )

    def _claim(self, key="claim-12345678"):
        return reivindicar_recompensa(
            self.campaign_id,
            BountyClaimCommandInput(
                cacador_personagem_id=self.hunter_id,
                alvo_personagem_id=self.target_id,
                idempotencia=key,
            ),
            user=self.player,
            database=self.database,
        )

    def test_reward_is_derived_and_duplicate_pending_claim_is_blocked(self):
        self._seed_bounty(40, 10)
        claim = self._claim()
        self.assertEqual(claim["valor_total"], 50)
        with self.database.connection() as connection:
            connection.execute(
                "UPDATE notificacoes SET lida_em=CURRENT_TIMESTAMP WHERE id=%s",
                (claim["claim_id"],),
            )
        with self.assertRaises(HTTPException) as raised:
            self._claim("claim-another1")
        self.assertEqual(raised.exception.status_code, 409)

        pending = listar_reivindicacoes_pendentes(
            self.campaign_id,
            user=self.master,
            database=self.database,
        )
        self.assertEqual([str(item["id"]) for item in pending["reivindicacoes"]], [claim["claim_id"]])
        with self.assertRaises(HTTPException) as forbidden:
            listar_reivindicacoes_pendentes(
                self.campaign_id,
                user=self.player,
                database=self.database,
            )
        self.assertEqual(forbidden.exception.status_code, 403)

    def test_self_claim_is_rejected(self):
        self._seed_bounty()
        with self.assertRaises(HTTPException) as raised:
            reivindicar_recompensa(
                self.campaign_id,
                BountyClaimCommandInput(
                    cacador_personagem_id=self.hunter_id,
                    alvo_personagem_id=self.hunter_id,
                    idempotencia="claim-self-1234",
                ),
                user=self.player,
                database=self.database,
            )
        self.assertEqual(raised.exception.status_code, 422)

    def test_player_cannot_resolve_reward(self):
        self._seed_bounty()
        claim = self._claim()
        with self.assertRaises(HTTPException) as raised:
            resolver_recompensa(
                self.campaign_id,
                BountyResolveCommandInput(
                    claim_id=claim["claim_id"],
                    aprovado=True,
                    idempotencia="resolve-player1",
                ),
                user=self.player,
                database=self.database,
            )
        self.assertEqual(raised.exception.status_code, 403)

    def test_approval_uses_current_reward_pays_once_and_increments_version(self):
        self._seed_bounty(40, 10)
        claim = self._claim()
        self._seed_bounty(70, 10)
        payload = BountyResolveCommandInput(
            claim_id=claim["claim_id"],
            aprovado=True,
            idempotencia="resolve-12345678",
        )
        result = resolver_recompensa(
            self.campaign_id,
            payload,
            user=self.master,
            database=self.database,
        )
        replay = resolver_recompensa(
            self.campaign_id,
            payload,
            user=self.master,
            database=self.database,
        )
        self.assertEqual(result["valor_pago"], 80)
        self.assertEqual(result["economia_versao"], 2)
        self.assertTrue(replay["repetida"])
        with self.database.connection() as connection:
            balance = connection.execute(
                "SELECT saldo FROM saldos_personagem WHERE personagem_id=%s AND moeda='Lunaris'",
                (self.hunter_id,),
            ).fetchone()["saldo"]
            bounty = connection.execute("SELECT 1 FROM recompensa").fetchone()
            ledgers = connection.execute(
                "SELECT COUNT(*) AS total FROM lancamentos_economia WHERE origem='recompensa.aprovada'"
            ).fetchone()["total"]
        self.assertEqual(balance, 80)
        self.assertIsNone(bounty)
        self.assertEqual(ledgers, 1)

    def test_rejection_does_not_delete_bounty(self):
        self._seed_bounty()
        claim = self._claim()
        result = resolver_recompensa(
            self.campaign_id,
            BountyResolveCommandInput(
                claim_id=claim["claim_id"],
                aprovado=False,
                idempotencia="reject-12345678",
            ),
            user=self.master,
            database=self.database,
        )
        self.assertEqual(result["status"], "rejeitada")
        self.assertEqual(result["valor_pago"], 0)
        with self.database.connection() as connection:
            bounty = connection.execute("SELECT valor_jogadores FROM recompensa").fetchone()
        self.assertEqual(bounty["valor_jogadores"], 40)

    def test_rejection_can_close_claim_after_characters_are_archived(self):
        self._seed_bounty()
        claim = self._claim()
        with self.database.connection() as connection:
            connection.execute(
                "UPDATE personagens SET status='arquivado' WHERE id = ANY(%s)",
                ([self.hunter_id, self.target_id],),
            )
        result = resolver_recompensa(
            self.campaign_id,
            BountyResolveCommandInput(
                claim_id=claim["claim_id"],
                aprovado=False,
                idempotencia="reject-archived1",
            ),
            user=self.master,
            database=self.database,
        )
        self.assertEqual(result["status"], "rejeitada")


if __name__ == "__main__":
    unittest.main()
