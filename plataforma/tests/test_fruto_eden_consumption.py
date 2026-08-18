from __future__ import annotations

import contextlib
import unittest
from types import SimpleNamespace
from unittest import mock
from uuid import UUID

from fastapi import HTTPException

from routers import characters
from schemas import EdenFruitConsumeInput


CAMPAIGN_ID = UUID("11111111-1111-1111-1111-111111111111")
CHARACTER_ID = UUID("22222222-2222-2222-2222-222222222222")
USER_ID = UUID("33333333-3333-3333-3333-333333333333")


def _sql(statement: str) -> str:
    return " ".join(statement.split())


class _Result:
    def __init__(self, row=None):
        self._row = row

    def fetchone(self):
        return self._row


class _Connection:
    def __init__(self, responder):
        self.responder = responder
        self.statements: list[tuple[str, object]] = []

    def execute(self, statement, params=None):
        normalized = _sql(str(statement))
        self.statements.append((normalized, params))
        return _Result(self.responder(normalized, params))


class _Database:
    def __init__(self, connection):
        self.connection_value = connection

    @contextlib.contextmanager
    def connection(self):
        yield self.connection_value


class EdenFruitConsumptionTests(unittest.TestCase):
    def _consume(self, connection, *, replace=False):
        payload = EdenFruitConsumeInput(
            versao_ficha_esperada=3,
            economia_versao_esperada=7,
            substituir=replace,
        )
        with mock.patch.object(characters, "record_audit"):
            return characters.consume_eden_fruit(
                CHARACTER_ID,
                "fruto-instante",
                payload,
                user=SimpleNamespace(id=USER_ID),
                database=_Database(connection),
            )

    def test_consumption_removes_inventory_and_links_trusted_catalog_snapshot(self):
        def responder(sql, _params):
            if "JOIN membros_campanha" in sql:
                return {
                    "campanha_id": CAMPAIGN_ID,
                    "dono_usuario_id": USER_ID,
                    "papel": "jogador",
                }
            if sql.startswith("SELECT ficha, versao, economia_versao"):
                return {
                    "ficha": {"status": {"manaAtual": 20}},
                    "versao": 3,
                    "economia_versao": 7,
                }
            if sql.startswith("SELECT item_id, titulo, quantidade, dados"):
                return {
                    "item_id": "fruto-instante",
                    "titulo": "Fruto adulterado no cliente",
                    "quantidade": 1,
                    "dados": {
                        "origem": "loja",
                        "catalogo_item_id": "fruto-instante",
                        "passivo": "conteudo adulterado",
                    },
                }
            if sql.startswith("SELECT id, tipo, titulo, conteudo"):
                return {
                    "id": "fruto-instante",
                    "tipo": "fruto-eden",
                    "titulo": "Fruto do Instante",
                    "conteudo": {
                        "passivo": "Olhar entre Segundos",
                        "efeitosFicha": [
                            {
                                "id": "iniciativa",
                                "categoria": "combate",
                                "alvo": "iniciativa",
                                "modo": "bonus",
                                "valor": 2,
                            }
                        ],
                    },
                }
            if sql.startswith("UPDATE personagens SET ficha="):
                return {"versao": 4, "economia_versao": 8}
            return None

        connection = _Connection(responder)
        result = self._consume(connection)

        self.assertEqual(result["fruto"]["titulo"], "Fruto do Instante")
        self.assertEqual(result["versao"], 4)
        self.assertTrue(any(sql.startswith("DELETE FROM inventario_personagem") for sql, _ in connection.statements))
        update_params = next(
            params for sql, params in connection.statements
            if sql.startswith("UPDATE personagens SET ficha=")
        )
        stored_sheet = update_params[0].obj
        self.assertEqual(stored_sheet["frutoEdenConsumido"]["conteudo"]["passivo"], "Olhar entre Segundos")

    def test_consumption_rejects_non_shop_item_before_catalog_lookup(self):
        def responder(sql, _params):
            if "JOIN membros_campanha" in sql:
                return {
                    "campanha_id": CAMPAIGN_ID,
                    "dono_usuario_id": USER_ID,
                    "papel": "jogador",
                }
            if sql.startswith("SELECT ficha, versao, economia_versao"):
                return {"ficha": {}, "versao": 3, "economia_versao": 7}
            if sql.startswith("SELECT item_id, titulo, quantidade, dados"):
                return {
                    "item_id": "fruto-instante",
                    "titulo": "Fruto falso",
                    "quantidade": 1,
                    "dados": {"origem": "manual", "tipo": "fruto-eden"},
                }
            return None

        connection = _Connection(responder)
        with self.assertRaises(HTTPException) as captured:
            self._consume(connection)
        self.assertEqual(captured.exception.status_code, 422)
        self.assertFalse(any(sql.startswith("SELECT id, tipo, titulo, conteudo") for sql, _ in connection.statements))

    def test_existing_link_requires_explicit_replacement(self):
        def responder(sql, _params):
            if "JOIN membros_campanha" in sql:
                return {
                    "campanha_id": CAMPAIGN_ID,
                    "dono_usuario_id": USER_ID,
                    "papel": "jogador",
                }
            if sql.startswith("SELECT ficha, versao, economia_versao"):
                return {
                    "ficha": {"frutoEdenConsumido": {"itemId": "fruto-gelo", "titulo": "Fruto do Gelo"}},
                    "versao": 3,
                    "economia_versao": 7,
                }
            if sql.startswith("SELECT item_id, titulo, quantidade, dados"):
                return {
                    "item_id": "fruto-instante",
                    "titulo": "Fruto do Instante",
                    "quantidade": 1,
                    "dados": {"origem": "loja", "catalogo_item_id": "fruto-instante"},
                }
            if sql.startswith("SELECT id, tipo, titulo, conteudo"):
                return {
                    "id": "fruto-instante",
                    "tipo": "fruto-eden",
                    "titulo": "Fruto do Instante",
                    "conteudo": {},
                }
            return None

        connection = _Connection(responder)
        with self.assertRaises(HTTPException) as captured:
            self._consume(connection)
        self.assertEqual(captured.exception.status_code, 409)
        self.assertFalse(any(sql.startswith("DELETE FROM inventario_personagem") for sql, _ in connection.statements))


if __name__ == "__main__":
    unittest.main()
