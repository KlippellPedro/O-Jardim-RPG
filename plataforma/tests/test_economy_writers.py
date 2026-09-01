from __future__ import annotations

import contextlib
import unittest
from types import SimpleNamespace
from unittest import mock
from uuid import UUID, uuid4

from fastapi import HTTPException
from psycopg.types.json import Jsonb
from pydantic import ValidationError

from core.economy_models import EconomyOperationsInput
from routers import characters, internal, vault
from schemas import (
    CharacterOwnerUpdateInput,
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
    def __init__(self, row=None, rows=None, rowcount=1):
        self._row = row
        self._rows = rows or []
        self.rowcount = rowcount

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
            if "INSERT INTO comandos_economia" in sql:
                return {"id": uuid4()}
            if "FROM comandos_economia" in sql:
                return None
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
            idempotencia="teste-item-transfer-001",
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
            if "INSERT INTO comandos_economia" in sql:
                return {"id": uuid4()}
            if "FROM comandos_economia" in sql:
                return None
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
            idempotencia="teste-currency-transfer-001",
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
            if "INSERT INTO comandos_economia" in sql:
                return {"id": uuid4()}
            if "FROM comandos_economia" in sql:
                return None
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
                    idempotencia="teste-limite-item-001",
                ),
            ),
            (
                vault.transfer_currency,
                VaultTransferCurrencyInput(
                    campanha_id=CAMPAIGN_ID,
                    personagem_id=CHARACTER_ID,
                    moeda="Lunaris",
                    quantidade=1,
                    idempotencia="teste-limite-moeda-001",
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

    def test_currency_transfer_replays_second_call_with_same_idempotency_key(self):
        """P2-1: reenviar a mesma chave (retry de rede, duplo clique) tem
        que devolver o resultado já concluído em vez de debitar/creditar de
        novo — a rota nunca chamava begin_economy_command/get_economy_command_replay
        antes desta correção."""

        comandos: dict[tuple, dict] = {}
        vault_touches = []

        def responder(sql, params):
            if "INSERT INTO comandos_economia" in sql:
                command_id, campanha_id, usuario_id, tipo, idempotencia, fingerprint = params
                key = (campanha_id, usuario_id, tipo, idempotencia)
                if key in comandos:
                    return None  # ON CONFLICT DO NOTHING: nenhuma linha inserida
                comandos[key] = {"id": command_id, "requisicao_hash": fingerprint, "resultado": None}
                return {"id": command_id}
            if sql.startswith("SELECT id, requisicao_hash, resultado"):
                campanha_id, usuario_id, tipo, idempotencia = params
                entry = comandos.get((campanha_id, usuario_id, tipo, idempotencia))
                return dict(entry) if entry else None
            if sql.startswith("UPDATE comandos_economia"):
                resultado, command_id = params
                for entry in comandos.values():
                    if entry["id"] == command_id:
                        entry["resultado"] = resultado.obj if isinstance(resultado, Jsonb) else resultado
                return None
            if "FROM personagens" in sql:
                return self._character()
            if "FROM cofre_saldos_usuario" in sql:
                vault_touches.append(sql)
                return {"saldo": 20}
            if "INSERT INTO saldos_personagem" in sql:
                vault_touches.append(sql)
                return {"saldo": 15}
            if "UPDATE personagens" in sql:
                return {"economia_versao": 8}
            return None

        payload = VaultTransferCurrencyInput(
            campanha_id=CAMPAIGN_ID,
            personagem_id=CHARACTER_ID,
            moeda="Lunaris",
            quantidade=5,
            idempotencia="teste-replay-moeda-001",
        )

        with (
            mock.patch.object(vault, "campaign_access"),
            mock.patch.object(vault, "record_audit"),
        ):
            primeira = vault.transfer_currency(
                payload, user=self.user, database=_Database(_RecordingConnection(responder))
            )
            segunda = vault.transfer_currency(
                payload, user=self.user, database=_Database(_RecordingConnection(responder))
            )

        self.assertFalse(primeira["repetida"])
        self.assertTrue(segunda["repetida"])
        self.assertEqual(primeira["economia_versao"], segunda["economia_versao"])
        self.assertEqual(primeira["saldo_personagem"], segunda["saldo_personagem"])
        # A carteira só pode ter sido tocada pela primeira chamada.
        self.assertEqual(len(vault_touches), 2)


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


class CharacterOwnerTransferTests(unittest.TestCase):
    NEW_OWNER_ID = UUID("44444444-4444-4444-4444-444444444444")

    def _responder(self, *, actor_role="mestre", membro_ativo=True):
        def responder(sql, params):
            if sql.startswith("SELECT id, campanha_id, dono_usuario_id, nome FROM personagens"):
                return {
                    "id": CHARACTER_ID,
                    "campanha_id": CAMPAIGN_ID,
                    "dono_usuario_id": USER_ID,
                    "nome": "Lys",
                }
            if "FROM campanhas c" in sql:
                return {
                    "campanha_id": CAMPAIGN_ID,
                    "dono_id": USER_ID,
                    "status": "ativa",
                    "papel_plataforma": "jogador",
                    "usuario_id": USER_ID,
                    "papel": actor_role,
                    "membro_status": "ativo",
                }
            if "JOIN usuarios u ON u.id=m.usuario_id" in sql:
                if not membro_ativo:
                    return None
                return {"id": self.NEW_OWNER_ID, "nome_exibicao": "Novo Jogador"}
            return None

        return responder

    def test_manager_transfers_owner_and_notifies_new_owner(self):
        connection = _RecordingConnection(self._responder())
        payload = CharacterOwnerUpdateInput(novo_dono_usuario_id=self.NEW_OWNER_ID)
        with mock.patch.object(characters, "record_audit") as record_audit, \
                mock.patch("core.notifications.notify") as notify:
            result = characters.transfer_character_owner(
                CHARACTER_ID,
                payload,
                user=SimpleNamespace(id=USER_ID),
                database=_Database(connection),
            )

        self.assertEqual(result["dono_usuario_id"], self.NEW_OWNER_ID)
        self.assertEqual(result["dono_nome"], "Novo Jogador")
        self.assertTrue(
            any("UPDATE personagens" in sql and "dono_usuario_id" in sql for sql, _ in connection.statements)
        )
        record_audit.assert_called_once()
        notify.assert_called_once()
        self.assertEqual(notify.call_args.kwargs["user_ids"], [self.NEW_OWNER_ID])

    def test_player_cannot_transfer_owner(self):
        connection = _RecordingConnection(self._responder(actor_role="jogador"))
        payload = CharacterOwnerUpdateInput(novo_dono_usuario_id=self.NEW_OWNER_ID)
        with self.assertRaises(HTTPException) as captured:
            characters.transfer_character_owner(
                CHARACTER_ID,
                payload,
                user=SimpleNamespace(id=USER_ID),
                database=_Database(connection),
            )
        self.assertEqual(captured.exception.status_code, 403)
        self.assertFalse(
            any("UPDATE personagens" in sql for sql, _ in connection.statements)
        )

    def test_rejects_owner_who_is_not_active_campaign_member(self):
        connection = _RecordingConnection(self._responder(membro_ativo=False))
        payload = CharacterOwnerUpdateInput(novo_dono_usuario_id=self.NEW_OWNER_ID)
        with self.assertRaises(HTTPException) as captured:
            characters.transfer_character_owner(
                CHARACTER_ID,
                payload,
                user=SimpleNamespace(id=USER_ID),
                database=_Database(connection),
            )
        self.assertEqual(captured.exception.status_code, 422)


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

    def test_owner_cannot_equip_special_item_above_shared_limit(self):
        connection = self._connection(
            inventory=[
                {
                    "item_id": "catalogo:acessorio",
                    "titulo": "Acessorio",
                    "quantidade": 1,
                    "dados": {
                        "origem": "loja",
                        "catalogo_item_id": "acessorio",
                        "grupo_limite_uso": "item-pericia",
                        "equipado": True,
                    },
                },
                {
                    "item_id": "catalogo:artefato",
                    "titulo": "Artefato",
                    "quantidade": 1,
                    "dados": {
                        "origem": "loja",
                        "catalogo_item_id": "artefato",
                        "tipo": "artefato",
                        "equipado": False,
                    },
                },
            ],
        )
        payload = EconomyOperationsInput(
            versao_esperada=7,
            operacoes=[
                {
                    "tipo": "editar_item",
                    "item_id": "catalogo:artefato",
                    "dados": {"equipado": True},
                }
            ],
        )

        with self.assertRaises(HTTPException) as captured:
            self._apply(connection, payload)
        self.assertEqual(captured.exception.status_code, 422)
        self.assertIn("pode usar 1", str(captured.exception.detail))
        self.assertFalse(any("INSERT INTO inventario_personagem" in sql for sql, _ in connection.statements))

    def test_common_player_cannot_forge_mechanical_fields_on_loja_item(self):
        connection = self._connection(
            inventory=[
                {
                    "item_id": "catalogo:espada-amaldicoada",
                    "titulo": "Espada Amaldicoada",
                    "quantidade": 1,
                    "dados": {
                        "origem": "loja",
                        "catalogo_item_id": "espada-amaldicoada",
                        "preco": 500,
                        "raridade": "comum",
                        "modificacoes": [],
                        "efeitosRaridade": [],
                        "equipado": False,
                    },
                }
            ],
        )
        payload = EconomyOperationsInput(
            versao_esperada=7,
            operacoes=[
                {
                    "tipo": "editar_item",
                    "item_id": "catalogo:espada-amaldicoada",
                    "dados": {
                        "raridade": "lendaria",
                        "modificacoes": [
                            {"id": "forjado-pelo-cliente", "efeito": "+99 dano"}
                        ],
                        "efeitosRaridade": [{"bonus": "dano", "valor": 99}],
                        "equipado": True,
                        "favorito": True,
                        "localArmazenamento": "Cinto",
                        "municaoAtual": 3,
                        "municaoMaxima": 999,
                        "durabilidadeAtual": 7,
                        "durabilidadeMaxima": 999,
                    },
                }
            ],
        )
        self._apply(connection, payload)

        inventory_insert = next(
            params
            for sql, params in connection.statements
            if "INSERT INTO inventario_personagem" in sql
        )
        saved_data = inventory_insert[5].obj
        self.assertEqual(saved_data["raridade"], "comum")
        self.assertEqual(saved_data["modificacoes"], [])
        self.assertEqual(saved_data["efeitosRaridade"], [])
        # campo com evidencia de edicao legitima (ver teste acima) continua liberado
        self.assertTrue(saved_data["equipado"])
        self.assertTrue(saved_data["favorito"])
        self.assertEqual(saved_data["localArmazenamento"], "Cinto")
        self.assertEqual(saved_data["municaoAtual"], 3)
        self.assertNotIn("municaoMaxima", saved_data)
        self.assertEqual(saved_data["durabilidadeAtual"], 7)
        self.assertNotIn("durabilidadeMaxima", saved_data)

    def test_manager_can_still_edit_mechanical_fields_on_loja_item(self):
        connection = self._connection(
            role="mestre",
            inventory=[
                {
                    "item_id": "catalogo:espada-amaldicoada",
                    "titulo": "Espada Amaldicoada",
                    "quantidade": 1,
                    "dados": {
                        "origem": "loja",
                        "catalogo_item_id": "espada-amaldicoada",
                        "preco": 500,
                        "raridade": "comum",
                        "modificacoes": [],
                    },
                }
            ],
        )
        payload = EconomyOperationsInput(
            versao_esperada=7,
            operacoes=[
                {
                    "tipo": "editar_item",
                    "item_id": "catalogo:espada-amaldicoada",
                    "dados": {
                        "raridade": "lendaria",
                        "modificacoes": [
                            {"id": "presente-do-mestre", "efeito": "+2 dano"}
                        ],
                    },
                }
            ],
        )
        self._apply(connection, payload)

        inventory_insert = next(
            params
            for sql, params in connection.statements
            if "INSERT INTO inventario_personagem" in sql
        )
        saved_data = inventory_insert[5].obj
        self.assertEqual(saved_data["raridade"], "lendaria")
        self.assertEqual(
            saved_data["modificacoes"],
            [{"id": "presente-do-mestre", "efeito": "+2 dano"}],
        )

    def test_common_player_can_edit_mechanical_fields_on_non_loja_item(self):
        connection = self._connection(
            inventory=[
                {
                    "item_id": "item-caseiro",
                    "titulo": "Item caseiro",
                    "quantidade": 1,
                    "dados": {
                        "origem": "manual",
                        "raridade": "comum",
                        "modificacoes": [],
                    },
                }
            ],
        )
        payload = EconomyOperationsInput(
            versao_esperada=7,
            operacoes=[
                {
                    "tipo": "editar_item",
                    "item_id": "item-caseiro",
                    "dados": {
                        "origem": "manual",
                        "raridade": "lendaria",
                        "modificacoes": [{"id": "casa", "efeito": "brilha no escuro"}],
                    },
                }
            ],
        )
        self._apply(connection, payload)

        inventory_insert = next(
            params
            for sql, params in connection.statements
            if "INSERT INTO inventario_personagem" in sql
        )
        saved_data = inventory_insert[5].obj
        self.assertEqual(saved_data["raridade"], "lendaria")
        self.assertEqual(
            saved_data["modificacoes"], [{"id": "casa", "efeito": "brilha no escuro"}]
        )

    def test_mechanical_edit_block_has_no_side_effects_on_other_items(self):
        connection = self._connection(
            inventory=[
                {
                    "item_id": "catalogo:espada",
                    "titulo": "Espada",
                    "quantidade": 1,
                    "dados": {
                        "origem": "loja",
                        "catalogo_item_id": "espada",
                        "raridade": "comum",
                    },
                },
                {
                    "item_id": "item-caseiro",
                    "titulo": "Anel caseiro",
                    "quantidade": 1,
                    "dados": {"origem": "manual", "raridade": "epica"},
                },
            ],
            balances=[{"moeda": "Lunaris", "saldo": 10}],
        )
        payload = EconomyOperationsInput(
            versao_esperada=7,
            operacoes=[
                {
                    "tipo": "editar_item",
                    "item_id": "catalogo:espada",
                    "dados": {"raridade": "lendaria"},
                }
            ],
        )
        result = self._apply(connection, payload)

        inserts = [
            params
            for sql, params in connection.statements
            if "INSERT INTO inventario_personagem" in sql
        ]
        # somente o item da operacao deve ter sido reescrito
        self.assertEqual({params[2] for params in inserts}, {"catalogo:espada"})
        saved_data = inserts[0][5].obj
        self.assertEqual(saved_data["raridade"], "comum")
        self.assertEqual(result["economia_versao"], 8)
        self.assertEqual(
            sum(
                "SET economia_versao=economia_versao+1" in sql
                for sql, _ in connection.statements
            ),
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

    def test_owner_adjusts_own_wallet_with_player_ledger_origin(self):
        connection = self._connection(balances=[{"moeda": "Lunaris", "saldo": 10}])
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
        result = self._apply(connection, payload)

        wallet_update = next(
            params
            for sql, params in connection.statements
            if sql.startswith("UPDATE saldos_personagem")
        )
        self.assertEqual(wallet_update[0], 20)
        ledger = next(
            params
            for sql, params in connection.statements
            if "INSERT INTO lancamentos_economia" in sql
        )
        self.assertIn("site-ficha", ledger)
        self.assertIn(USER_ID, ledger)
        self.assertEqual(result["economia_versao"], 8)

    def test_owner_cannot_spend_more_than_the_wallet_holds(self):
        connection = self._connection(balances=[{"moeda": "Lunaris", "saldo": 3}])
        payload = EconomyOperationsInput(
            versao_esperada=7,
            operacoes=[
                {
                    "tipo": "ajustar_saldo",
                    "moeda": "Lunaris",
                    "delta": -4,
                    "motivo": "ajuste",
                }
            ],
        )
        with self.assertRaises(HTTPException) as captured:
            self._apply(connection, payload)
        self.assertEqual(captured.exception.status_code, 409)
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
