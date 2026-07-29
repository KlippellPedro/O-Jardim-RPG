from __future__ import annotations

import contextlib
import unittest
from types import SimpleNamespace
from unittest import mock
from uuid import UUID

from fastapi import HTTPException
from pydantic import ValidationError

from core.economy_models import EconomyOperationsInput
from routers import characters, internal, vault
from schemas import (
    EconomyReplaceInput,
    InventoryTransactionInput,
    VaultTransferCurrencyInput,
    VaultTransferItemInput,
    WalletTransactionInput,
)


CAMPAIGN_ID = UUID("11111111-1111-1111-1111-111111111111")
CHARACTER_ID = UUID("22222222-2222-2222-2222-222222222222")
USER_ID = UUID("33333333-3333-3333-3333-333333333333")


def _sql(statement: str) -> str:
    return " ".join(statement.split())


class _Result:
    def __init__(self, row=None, rows=None):
        self._row = row
        self._rows = rows or []

    def fetchone(self):
        return self._row

    def fetchall(self):
        return self._rows


class _RecordingConnection:
    def __init__(self, responder):
        self.responder = responder
        self.statements: list[tuple[str, object]] = []

    def execute(self, statement, params=None):
        normalized = _sql(str(statement))
        self.statements.append((normalized, params))
        response = self.responder(normalized, params)
        if isinstance(response, _Result):
            return response
        return _Result(row=response)


class _Database:
    def __init__(self, connection):
        self._connection = connection

    @contextlib.contextmanager
    def connection(self):
        yield self._connection


def _index(statements, fragment: str) -> int:
    return next(index for index, (sql, _) in enumerate(statements) if fragment in sql)


class EconomyReplacementSchemaTests(unittest.TestCase):
    def test_full_replacement_requires_both_aggregates(self):
        for partial in (
            {"versao_esperada": 1, "carteira": []},
            {"versao_esperada": 1, "inventario": []},
        ):
            with self.subTest(partial=partial), self.assertRaises(ValidationError):
                EconomyReplaceInput(**partial)

        complete = EconomyReplaceInput(
            versao_esperada=1,
            carteira=[],
            inventario=[],
        )
        self.assertEqual(complete.carteira, [])
        self.assertEqual(complete.inventario, [])

    def test_full_replacement_rejects_whitespace_identifiers(self):
        with self.assertRaises(ValidationError):
            EconomyReplaceInput(
                versao_esperada=1,
                carteira=[{"moeda": "   ", "saldo": 1}],
                inventario=[],
            )
        with self.assertRaises(ValidationError):
            EconomyReplaceInput(
                versao_esperada=1,
                carteira=[],
                inventario=[
                    {"item_id": "   ", "titulo": "Item", "quantidade": 1}
                ],
            )

    def test_full_replacement_rejects_coercion_extra_fields_and_non_finite_json(self):
        invalid_wallets = (
            {"moeda": "Lunaris", "saldo": True},
            {"moeda": "Lunaris", "saldo": 1, "campo_ignorado": "perigoso"},
        )
        for wallet in invalid_wallets:
            with self.subTest(wallet=wallet), self.assertRaises(ValidationError):
                EconomyReplaceInput(
                    versao_esperada=1,
                    carteira=[wallet],
                    inventario=[],
                )
        with self.assertRaises(ValidationError):
            EconomyReplaceInput(
                versao_esperada=1,
                carteira=[],
                inventario=[
                    {
                        "item_id": "item",
                        "titulo": "Item",
                        "quantidade": 1,
                        "dados": {"peso": float("nan")},
                    }
                ],
            )


class EconomyOperationSchemaTests(unittest.TestCase):
    def test_operation_discriminators_are_strict(self):
        payload = EconomyOperationsInput(
            versao_esperada=3,
            operacoes=[
                {
                    "tipo": "editar_item",
                    "item_id": "espada",
                    "titulo": "Espada longa",
                    "dados": {"equipado": True},
                },
                {
                    "tipo": "descartar_item",
                    "item_id": "pocao",
                },
            ],
        )
        self.assertEqual(len(payload.operacoes), 2)
        with self.assertRaises(ValidationError):
            EconomyOperationsInput(
                versao_esperada=3,
                operacoes=[{"tipo": "editar", "item_id": "espada", "dados": {}}],
            )

    def test_manual_item_requires_canonical_namespaced_uuid(self):
        with self.assertRaises(ValidationError):
            EconomyOperationsInput(
                versao_esperada=3,
                operacoes=[
                    {
                        "tipo": "criar_manual",
                        "item_id": "item-inventado-pelo-cliente",
                        "titulo": "Item",
                        "quantidade": 1,
                        "dados": {},
                    }
                ],
            )

    def test_boolean_is_not_accepted_as_economic_delta(self):
        with self.assertRaises(ValidationError):
            EconomyOperationsInput(
                versao_esperada=3,
                operacoes=[
                    {
                        "tipo": "ajustar_saldo",
                        "moeda": "Lunaris",
                        "delta": True,
                        "motivo": "ajuste",
                    }
                ],
            )


class InternalEconomyWriterTests(unittest.TestCase):
    def _character(self):
        return {
            "id": CHARACTER_ID,
            "campanha_id": CAMPAIGN_ID,
            "dono_usuario_id": USER_ID,
            "nome": "Lys",
            "economia_versao": 7,
        }

    def test_wallet_locks_character_first_and_increments_version(self):
        def responder(sql, _params):
            if "FROM personagens" in sql:
                return self._character()
            if "FROM lancamentos_economia" in sql:
                return None
            if sql.startswith("SELECT saldo FROM saldos_personagem"):
                return {"saldo": 10}
            if "UPDATE personagens" in sql:
                return {"economia_versao": 8}
            return None

        connection = _RecordingConnection(responder)
        payload = WalletTransactionInput(
            campanha_id=CAMPAIGN_ID,
            personagem_id=CHARACTER_ID,
            moeda="Lunaris",
            delta=5,
            motivo="Recompensa",
            idempotencia="recompensa-001",
        )
        with mock.patch.object(internal, "record_audit"):
            result = internal.apply_wallet_transaction(
                payload,
                service="banqueiro",
                database=_Database(connection),
            )

        character_lock = _index(connection.statements, "FROM personagens")
        wallet_write = _index(connection.statements, "INSERT INTO saldos_personagem")
        version_write = _index(connection.statements, "SET economia_versao=economia_versao+1")
        self.assertIn("FOR UPDATE", connection.statements[character_lock][0])
        self.assertLess(character_lock, wallet_write)
        self.assertLess(wallet_write, version_write)
        self.assertEqual(result["economia_versao"], 8)

    def test_inventory_locks_character_first_and_increments_version(self):
        def responder(sql, _params):
            if "FROM personagens" in sql:
                return self._character()
            if "FROM lancamentos_economia" in sql:
                return None
            if sql.startswith("SELECT quantidade FROM inventario_personagem"):
                return {"quantidade": 2}
            if "UPDATE personagens" in sql:
                return {"economia_versao": 8}
            return None

        connection = _RecordingConnection(responder)
        payload = InventoryTransactionInput(
            campanha_id=CAMPAIGN_ID,
            personagem_id=CHARACTER_ID,
            item_id="pocao",
            titulo="Pocao",
            delta=1,
            motivo="Recompensa",
            idempotencia="recompensa-002",
        )
        with mock.patch.object(internal, "record_audit"):
            result = internal.apply_inventory_transaction(
                payload,
                service="banqueiro",
                database=_Database(connection),
            )

        character_lock = _index(connection.statements, "FROM personagens")
        inventory_write = _index(connection.statements, "INSERT INTO inventario_personagem")
        version_write = _index(connection.statements, "SET economia_versao=economia_versao+1")
        self.assertIn("FOR UPDATE", connection.statements[character_lock][0])
        self.assertLess(character_lock, inventory_write)
        self.assertLess(inventory_write, version_write)
        self.assertEqual(result["economia_versao"], 8)

    def test_replay_does_not_increment_version_and_reuse_is_rejected(self):
        def responder(sql, _params):
            if "FROM personagens" in sql:
                return self._character()
            if "FROM lancamentos_economia" in sql:
                return {
                    "id": UUID("44444444-4444-4444-4444-444444444444"),
                    "personagem_id": CHARACTER_ID,
                    "moeda": "Lunaris",
                    "delta": 5,
                    "saldo_apos": 15,
                }
            return None

        payload = WalletTransactionInput(
            campanha_id=CAMPAIGN_ID,
            personagem_id=CHARACTER_ID,
            moeda="Lunaris",
            delta=5,
            motivo="Recompensa",
            idempotencia="recompensa-003",
        )
        connection = _RecordingConnection(responder)
        result = internal.apply_wallet_transaction(
            payload,
            service="banqueiro",
            database=_Database(connection),
        )
        self.assertTrue(result["repetido"])
        self.assertEqual(result["economia_versao"], 7)
        self.assertFalse(
            any("SET economia_versao" in sql for sql, _ in connection.statements)
        )

        collision = payload.model_copy(update={"delta": 6})
        with self.assertRaises(HTTPException) as captured:
            internal.apply_wallet_transaction(
                collision,
                service="banqueiro",
                database=_Database(_RecordingConnection(responder)),
            )
        self.assertEqual(captured.exception.status_code, 409)

    def test_internal_writers_reject_aggregate_limits(self):
        def responder(sql, _params):
            if "FROM personagens" in sql:
                return self._character()
            if "FROM lancamentos_economia" in sql:
                return None
            if sql.startswith("SELECT saldo FROM saldos_personagem"):
                return {"saldo": 9_000_000_000}
            if sql.startswith("SELECT quantidade FROM inventario_personagem"):
                return {"quantidade": 1_000_000}
            return None

        wallet_payload = WalletTransactionInput(
            campanha_id=CAMPAIGN_ID,
            personagem_id=CHARACTER_ID,
            moeda="Lunaris",
            delta=1,
            motivo="Recompensa",
            idempotencia="limite-wallet-001",
        )
        inventory_payload = InventoryTransactionInput(
            campanha_id=CAMPAIGN_ID,
            personagem_id=CHARACTER_ID,
            item_id="pocao",
            titulo="Pocao",
            delta=1,
            motivo="Recompensa",
            idempotencia="limite-inventory-001",
        )
        for operation, payload in (
            (internal.apply_wallet_transaction, wallet_payload),
            (internal.apply_inventory_transaction, inventory_payload),
        ):
            connection = _RecordingConnection(responder)
            with self.subTest(operation=operation.__name__), self.assertRaises(HTTPException) as captured:
                operation(payload, service="banqueiro", database=_Database(connection))
            self.assertEqual(captured.exception.status_code, 422)
            self.assertFalse(
                any("SET economia_versao" in sql for sql, _ in connection.statements)
            )


class VaultEconomyWriterTests(unittest.TestCase):
    user = SimpleNamespace(id=USER_ID)

    def _character(self):
        return {"id": CHARACTER_ID, "nome": "Lys", "economia_versao": 7}

    def test_item_transfer_locks_character_before_vault_and_increments_version(self):
        def responder(sql, _params):
            if "FROM personagens" in sql:
                return self._character()
            if "FROM cofre_itens_usuario" in sql:
                return {"titulo": "Pocao", "quantidade": 3, "dados": {}}
            if "UPDATE personagens" in sql:
                return {"economia_versao": 8}
            return None

        connection = _RecordingConnection(responder)
        payload = VaultTransferItemInput(
            campanha_id=CAMPAIGN_ID,
            personagem_id=CHARACTER_ID,
            item_id="pocao",
            quantidade=1,
        )
        with (
            mock.patch.object(vault, "campaign_access"),
            mock.patch.object(vault, "record_audit"),
        ):
            result = vault.transfer_item(
                payload,
                user=self.user,
                database=_Database(connection),
            )

        character_lock = _index(connection.statements, "FROM personagens")
        vault_lock = _index(connection.statements, "FROM cofre_itens_usuario")
        inventory_write = _index(connection.statements, "INSERT INTO inventario_personagem")
        self.assertIn("FOR UPDATE", connection.statements[character_lock][0])
        self.assertLess(character_lock, vault_lock)
        self.assertLess(vault_lock, inventory_write)
        self.assertEqual(result["economia_versao"], 8)

    def test_currency_transfer_locks_character_before_vault_and_increments_version(self):
        def responder(sql, _params):
            if "FROM personagens" in sql:
                return self._character()
            if "FROM cofre_saldos_usuario" in sql:
                return {"saldo": 20}
            if "INSERT INTO saldos_personagem" in sql:
                return {"saldo": 15}
            if "UPDATE personagens" in sql:
                return {"economia_versao": 8}
            return None

        connection = _RecordingConnection(responder)
        payload = VaultTransferCurrencyInput(
            campanha_id=CAMPAIGN_ID,
            personagem_id=CHARACTER_ID,
            moeda="Lunaris",
            quantidade=5,
        )
        with (
            mock.patch.object(vault, "campaign_access"),
            mock.patch.object(vault, "record_audit"),
        ):
            result = vault.transfer_currency(
                payload,
                user=self.user,
                database=_Database(connection),
            )

        character_lock = _index(connection.statements, "FROM personagens")
        vault_lock = _index(connection.statements, "FROM cofre_saldos_usuario")
        wallet_write = _index(connection.statements, "INSERT INTO saldos_personagem")
        self.assertIn("FOR UPDATE", connection.statements[character_lock][0])
        self.assertLess(character_lock, vault_lock)
        self.assertLess(vault_lock, wallet_write)
        self.assertEqual(result["economia_versao"], 8)

    def test_vault_transfers_reject_destination_aggregate_limits(self):
        def responder(sql, _params):
            if "FROM personagens" in sql:
                return self._character()
            if "FROM cofre_itens_usuario" in sql:
                return {"titulo": "Pocao", "quantidade": 10, "dados": {}}
            if "FROM cofre_saldos_usuario" in sql:
                return {"saldo": 10}
            if sql.startswith("SELECT quantidade FROM inventario_personagem"):
                return {"quantidade": 1_000_000}
            if sql.startswith("SELECT saldo FROM saldos_personagem"):
                return {"saldo": 9_000_000_000}
            return None

        cases = (
            (
                vault.transfer_item,
                VaultTransferItemInput(
                    campanha_id=CAMPAIGN_ID,
                    personagem_id=CHARACTER_ID,
                    item_id="pocao",
                    quantidade=1,
                ),
            ),
            (
                vault.transfer_currency,
                VaultTransferCurrencyInput(
                    campanha_id=CAMPAIGN_ID,
                    personagem_id=CHARACTER_ID,
                    moeda="Lunaris",
                    quantidade=1,
                ),
            ),
        )
        for operation, payload in cases:
            connection = _RecordingConnection(responder)
            with (
                self.subTest(operation=operation.__name__),
                mock.patch.object(vault, "campaign_access"),
                self.assertRaises(HTTPException) as captured,
            ):
                operation(payload, user=self.user, database=_Database(connection))
            self.assertEqual(captured.exception.status_code, 422)
            self.assertFalse(
                any("SET economia_versao" in sql for sql, _ in connection.statements)
            )


class CharacterReplacementWriterTests(unittest.TestCase):
    def test_replacement_locks_character_before_deleting_aggregates(self):
        current = {
            "id": CHARACTER_ID,
            "campanha_id": CAMPAIGN_ID,
            "dono_usuario_id": USER_ID,
            "nome": "Lys",
            "economia_versao": 7,
            "papel": "mestre",
        }

        def responder(sql, _params):
            if "JOIN membros_campanha" in sql:
                return current
            if "SELECT economia_versao FROM personagens" in sql:
                return {"economia_versao": 7}
            if "UPDATE personagens" in sql:
                return {"economia_versao": 8}
            return None

        connection = _RecordingConnection(responder)
        payload = EconomyReplaceInput(
            versao_esperada=7,
            carteira=[{"moeda": "Lunaris", "saldo": 10}],
            inventario=[
                {"item_id": "pocao", "titulo": "Pocao", "quantidade": 1}
            ],
        )
        with mock.patch.object(characters, "record_audit"):
            result = characters.replace_character_economy(
                CHARACTER_ID,
                payload,
                user=SimpleNamespace(id=USER_ID),
                database=_Database(connection),
            )

        character_lock = _index(
            connection.statements, "SELECT economia_versao FROM personagens"
        )
        balance_delete = _index(connection.statements, "DELETE FROM saldos_personagem")
        inventory_delete = _index(
            connection.statements, "DELETE FROM inventario_personagem"
        )
        self.assertIn("FOR UPDATE", connection.statements[character_lock][0])
        self.assertLess(character_lock, balance_delete)
        self.assertLess(character_lock, inventory_delete)
        self.assertEqual(result["economia_versao"], 8)

    def test_owner_cannot_replace_economy(self):
        current = {
            "id": CHARACTER_ID,
            "campanha_id": CAMPAIGN_ID,
            "dono_usuario_id": USER_ID,
            "nome": "Lys",
            "economia_versao": 7,
            "papel": "jogador",
        }

        def responder(sql, _params):
            if "JOIN membros_campanha" in sql:
                return current
            return None

        connection = _RecordingConnection(responder)
        payload = EconomyReplaceInput(
            versao_esperada=7,
            carteira=[],
            inventario=[],
        )
        with self.assertRaises(HTTPException) as captured:
            characters.replace_character_economy(
                CHARACTER_ID,
                payload,
                user=SimpleNamespace(id=USER_ID),
                database=_Database(connection),
            )
        self.assertEqual(captured.exception.status_code, 403)
        self.assertFalse(
            any("DELETE FROM saldos_personagem" in sql for sql, _ in connection.statements)
        )


class CharacterEconomyOperationTests(unittest.TestCase):
    def _connection(
        self,
        *,
        role="jogador",
        inventory=None,
        balances=None,
        catalog_item=False,
    ):
        inventory = inventory or []
        balances = balances or []

        def responder(sql, _params):
            if "JOIN membros_campanha" in sql:
                return {
                    "id": CHARACTER_ID,
                    "campanha_id": CAMPAIGN_ID,
                    "dono_usuario_id": USER_ID,
                    "nome": "Lys",
                    "papel": role,
                }
            if "SELECT economia_versao FROM personagens" in sql:
                return {"economia_versao": 7}
            if sql.startswith("SELECT item_id, titulo, quantidade, dados FROM"):
                return _Result(rows=inventory)
            if sql.startswith("SELECT moeda, saldo FROM") and "ORDER BY" not in sql:
                return _Result(rows=balances)
            if sql.startswith("SELECT 1 FROM catalogo_itens"):
                return {"?column?": 1} if catalog_item else None
            if "UPDATE personagens" in sql:
                return {"economia_versao": 8}
            if sql.startswith("SELECT moeda, saldo FROM") and "ORDER BY" in sql:
                return _Result(rows=balances)
            if sql.startswith(
                "SELECT item_id, titulo, quantidade, dados, atualizado_em"
            ):
                return _Result(rows=inventory)
            return None

        return _RecordingConnection(responder)

    def _apply(self, connection, payload):
        with mock.patch.object(characters, "record_audit"):
            return characters.apply_character_economy_operations(
                CHARACTER_ID,
                payload,
                user=SimpleNamespace(id=USER_ID),
                database=_Database(connection),
            )

    def test_owner_edits_and_consumes_but_cannot_forge_provenance(self):
        connection = self._connection(
            inventory=[
                {
                    "item_id": "catalogo:espada",
                    "titulo": "Espada",
                    "quantidade": 2,
                    "dados": {
                        "origem": "loja",
                        "catalogo_item_id": "espada",
                        "preco": 50,
                        "equipado": False,
                    },
                }
            ],
            balances=[{"moeda": "Lunaris", "saldo": 10}],
        )
        payload = EconomyOperationsInput(
            versao_esperada=7,
            operacoes=[
                {
                    "tipo": "editar_item",
                    "item_id": "catalogo:espada",
                    "titulo": "Minha espada",
                    "dados": {
                        "origem": "manual",
                        "catalogo_item_id": "forjado",
                        "preco": 0,
                        "equipado": True,
                    },
                },
                {
                    "tipo": "ajustar_quantidade",
                    "item_id": "catalogo:espada",
                    "delta": -1,
                },
            ],
        )
        result = self._apply(connection, payload)

        inventory_insert = next(
            params
            for sql, params in connection.statements
            if "INSERT INTO inventario_personagem" in sql
        )
        saved_data = inventory_insert[5].obj
        self.assertEqual(inventory_insert[4], 1)
        self.assertEqual(saved_data["origem"], "loja")
        self.assertEqual(saved_data["catalogo_item_id"], "espada")
        self.assertEqual(saved_data["preco"], 50)
        self.assertTrue(saved_data["equipado"])
        self.assertEqual(result["economia_versao"], 8)
        self.assertEqual(
            sum("SET economia_versao=economia_versao+1" in sql for sql, _ in connection.statements),
            1,
        )

    def test_owner_cannot_increase_server_owned_item(self):
        connection = self._connection(
            inventory=[
                {
                    "item_id": "pocao-loja",
                    "titulo": "Pocao",
                    "quantidade": 1,
                    "dados": {"origem": "loja"},
                }
            ]
        )
        payload = EconomyOperationsInput(
            versao_esperada=7,
            operacoes=[
                {
                    "tipo": "ajustar_quantidade",
                    "item_id": "pocao-loja",
                    "delta": 1,
                }
            ],
        )
        with self.assertRaises(HTTPException) as captured:
            self._apply(connection, payload)
        self.assertEqual(captured.exception.status_code, 403)
        self.assertFalse(
            any("SET economia_versao" in sql for sql, _ in connection.statements)
        )

    def test_owner_cannot_adjust_wallet(self):
        connection = self._connection()
        payload = EconomyOperationsInput(
            versao_esperada=7,
            operacoes=[
                {
                    "tipo": "ajustar_saldo",
                    "moeda": "Lunaris",
                    "delta": 10,
                    "motivo": "ajuste",
                }
            ],
        )
        with self.assertRaises(HTTPException) as captured:
            self._apply(connection, payload)
        self.assertEqual(captured.exception.status_code, 403)
        self.assertFalse(
            any("SET economia_versao" in sql for sql, _ in connection.statements)
        )

    def test_manager_adjusts_wallet_with_ledger_and_single_version_increment(self):
        connection = self._connection(
            role="mestre",
            balances=[{"moeda": "Lunaris", "saldo": 10}],
        )
        payload = EconomyOperationsInput(
            versao_esperada=7,
            operacoes=[
                {
                    "tipo": "ajustar_saldo",
                    "moeda": "Lunaris",
                    "delta": 5,
                    "motivo": "Premio da sessao",
                }
            ],
        )
        result = self._apply(connection, payload)

        wallet_update = next(
            params
            for sql, params in connection.statements
            if sql.startswith("UPDATE saldos_personagem")
        )
        self.assertEqual(wallet_update[0], 15)
        self.assertTrue(
            any("INSERT INTO lancamentos_economia" in sql for sql, _ in connection.statements)
        )
        self.assertEqual(result["economia_versao"], 8)
        self.assertEqual(
            sum("SET economia_versao=economia_versao+1" in sql for sql, _ in connection.statements),
            1,
        )

    def test_manager_cannot_exceed_wallet_limit_with_delta(self):
        connection = self._connection(
            role="mestre",
            balances=[{"moeda": "Lunaris", "saldo": 9_000_000_000}],
        )
        payload = EconomyOperationsInput(
            versao_esperada=7,
            operacoes=[
                {
                    "tipo": "ajustar_saldo",
                    "moeda": "Lunaris",
                    "delta": 1,
                    "motivo": "ajuste",
                }
            ],
        )
        with self.assertRaises(HTTPException) as captured:
            self._apply(connection, payload)
        self.assertEqual(captured.exception.status_code, 422)
        self.assertFalse(
            any("SET economia_versao" in sql for sql, _ in connection.statements)
        )

    def test_manager_cannot_exceed_inventory_quantity_limit_with_delta(self):
        connection = self._connection(
            role="mestre",
            inventory=[
                {
                    "item_id": "pocao-loja",
                    "titulo": "Pocao",
                    "quantidade": 1_000_000,
                    "dados": {"origem": "loja", "catalogo_item_id": "pocao-loja"},
                }
            ],
        )
        payload = EconomyOperationsInput(
            versao_esperada=7,
            operacoes=[
                {
                    "tipo": "ajustar_quantidade",
                    "item_id": "pocao-loja",
                    "delta": 1,
                }
            ],
        )
        with self.assertRaises(HTTPException) as captured:
            self._apply(connection, payload)
        self.assertEqual(captured.exception.status_code, 422)
        self.assertFalse(
            any("SET economia_versao" in sql for sql, _ in connection.statements)
        )

    def test_manual_creation_is_server_stamped(self):
        connection = self._connection()
        item_id = "manual:44444444-4444-4444-8444-444444444444"
        payload = EconomyOperationsInput(
            versao_esperada=7,
            operacoes=[
                {
                    "tipo": "criar_manual",
                    "item_id": item_id,
                    "titulo": "Lembranca",
                    "quantidade": 2,
                    "dados": {"origem": "loja", "preco": 999, "favorito": True},
                }
            ],
        )
        self._apply(connection, payload)

        inventory_insert = next(
            params
            for sql, params in connection.statements
            if "INSERT INTO inventario_personagem" in sql
        )
        self.assertEqual(inventory_insert[2], item_id)
        self.assertEqual(inventory_insert[5].obj["origem"], "manual")
        self.assertNotIn("preco", inventory_insert[5].obj)
        self.assertTrue(inventory_insert[5].obj["favorito"])


if __name__ == "__main__":
    unittest.main()
