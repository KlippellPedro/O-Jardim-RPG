from __future__ import annotations

import contextlib
from types import SimpleNamespace
from uuid import UUID

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from routers import shop
from schemas import ShopCatalogDraftInput, ShopCatalogPublishInput


CAMPAIGN_ID = UUID("11111111-1111-1111-1111-111111111111")
MASTER_ID = UUID("22222222-2222-2222-2222-222222222222")
ASSISTANT_ID = UUID("33333333-3333-3333-3333-333333333333")
EDITORIAL_ID = UUID("44444444-4444-4444-4444-444444444444")
REVISION_ID = UUID("55555555-5555-5555-5555-555555555555")


def _sql(statement: str) -> str:
    return " ".join(statement.split())


class _Result:
    def __init__(self, row=None, rows=None):
        self.row = row
        self.rows = rows if rows is not None else []

    def fetchone(self):
        return self.row

    def fetchall(self):
        return self.rows


class _Connection:
    def __init__(self, responder):
        self.responder = responder
        self.statements = []

    def execute(self, statement, params=None):
        normalized = _sql(str(statement))
        self.statements.append((normalized, params))
        response = self.responder(normalized, params)
        return response if isinstance(response, _Result) else _Result(row=response)


class _Database:
    def __init__(self, connection):
        self.connection_value = connection

    @contextlib.contextmanager
    def connection(self):
        yield self.connection_value


def _access(user_id: UUID, role: str):
    return {
        "campanha_id": CAMPAIGN_ID,
        "dono_id": MASTER_ID,
        "status": "ativa",
        "papel_plataforma": "mestre",
        "usuario_id": user_id,
        "papel": role,
        "membro_status": "ativo",
    }


def _draft(*, version=None, price=None, active=True):
    return ShopCatalogDraftInput(
        campanha_id=CAMPAIGN_ID,
        item_id="espada-da-campanha",
        tipo="arma",
        titulo="Espada da Campanha",
        conteudo={
            "descricao": "Uma arma criada pelo mestre.",
            "raridade": "raro",
            "preco": price if price is not None else {"Lunaris": 25},
            "nivelMinimoLoja": 2,
        },
        ativo=active,
        versao_esperada=version,
    )


def test_catalog_item_id_must_be_a_safe_slug():
    with pytest.raises(ValidationError):
        ShopCatalogDraftInput(
            campanha_id=CAMPAIGN_ID,
            item_id="../item perigoso",
            tipo="arma",
            titulo="Item",
            conteudo={"preco": 1},
        )


def test_editor_rejects_unknown_currency():
    with pytest.raises(HTTPException) as captured:
        shop._validate_catalog_editor_item(_draft(price={"Moeda Inventada": 10}))
    assert captured.value.status_code == 422


def test_campaign_publication_overlays_and_can_hide_official_item():
    official = [
        {"id": "espada", "tipo": "arma", "titulo": "Espada oficial", "conteudo": {"preco": 10}},
        {"id": "escudo", "tipo": "armadura", "titulo": "Escudo", "conteudo": {"preco": 5}},
    ]
    overrides = [
        {
            "item_id": "espada",
            "publicado": {
                "id": "espada", "tipo": "arma", "titulo": "Espada da mesa",
                "conteudo": {"preco": 20}, "ativo": True,
            },
        },
        {
            "item_id": "escudo",
            "publicado": {
                "id": "escudo", "tipo": "armadura", "titulo": "Escudo",
                "conteudo": {"preco": 5}, "ativo": False,
            },
        },
        {
            "item_id": "pocao-da-mesa",
            "publicado": {
                "id": "pocao-da-mesa", "tipo": "consumivel", "titulo": "Poção da mesa",
                "conteudo": {"preco": 3}, "ativo": True,
            },
        },
    ]

    def responder(sql, _params):
        if "FROM catalogo_itens_campanha" in sql:
            return _Result(rows=overrides)
        if "FROM catalogo_itens" in sql:
            return _Result(rows=official)
        raise AssertionError(f"consulta inesperada: {sql}")

    rows = shop._resolved_catalog_rows(_Connection(responder), CAMPAIGN_ID)
    by_id = {row["id"]: row for row in rows}
    assert by_id["espada"]["titulo"] == "Espada da mesa"
    assert by_id["pocao-da-mesa"]["conteudo"]["preco"] == 3
    assert "escudo" not in by_id


def test_assistant_cannot_edit_campaign_catalog():
    def responder(sql, _params):
        if "FROM campanhas" in sql:
            return _access(ASSISTANT_ID, "assistente")
        raise AssertionError(f"consulta inesperada: {sql}")

    with pytest.raises(HTTPException) as captured:
        shop.list_campaign_catalog_editor(
            CAMPAIGN_ID,
            user=SimpleNamespace(id=ASSISTANT_ID),
            database=_Database(_Connection(responder)),
        )
    assert captured.value.status_code == 403


def test_publish_creates_revision_and_audit_event():
    draft = {
        "id": "espada-da-campanha",
        "tipo": "arma",
        "titulo": "Espada da Campanha",
        "conteudo": {"preco": {"Lunaris": 25}},
        "ativo": True,
    }

    def responder(sql, _params):
        if "FROM campanhas" in sql:
            return _access(MASTER_ID, "mestre")
        if sql.startswith("SELECT id, item_id, rascunho, versao"):
            return {"id": EDITORIAL_ID, "item_id": "espada-da-campanha", "rascunho": draft, "versao": 3}
        if sql.startswith("UPDATE catalogo_itens_campanha"):
            return {
                "id": EDITORIAL_ID, "item_id": "espada-da-campanha",
                "rascunho": draft, "publicado": draft, "versao": 4,
                "atualizado_em": None, "publicado_em": None,
            }
        if sql.startswith("INSERT INTO revisoes_catalogo_campanha") or sql.startswith("INSERT INTO eventos_auditoria"):
            return None
        raise AssertionError(f"consulta inesperada: {sql}")

    connection = _Connection(responder)
    result = shop.publish_campaign_catalog_item(
        EDITORIAL_ID,
        ShopCatalogPublishInput(campanha_id=CAMPAIGN_ID, versao_esperada=3),
        user=SimpleNamespace(id=MASTER_ID),
        database=_Database(connection),
    )
    assert result["editorial"]["versao"] == 4
    assert any(sql.startswith("INSERT INTO revisoes_catalogo_campanha") for sql, _ in connection.statements)
    assert any(sql.startswith("INSERT INTO eventos_auditoria") for sql, _ in connection.statements)


def test_publish_rejects_stale_version():
    def responder(sql, _params):
        if "FROM campanhas" in sql:
            return _access(MASTER_ID, "mestre")
        if sql.startswith("SELECT id, item_id, rascunho, versao"):
            return {"id": EDITORIAL_ID, "item_id": "item", "rascunho": {"ativo": True}, "versao": 5}
        raise AssertionError(f"consulta inesperada: {sql}")

    with pytest.raises(HTTPException) as captured:
        shop.publish_campaign_catalog_item(
            EDITORIAL_ID,
            ShopCatalogPublishInput(campanha_id=CAMPAIGN_ID, versao_esperada=4),
            user=SimpleNamespace(id=MASTER_ID),
            database=_Database(_Connection(responder)),
        )
    assert captured.value.status_code == 409
    assert captured.value.detail["versao_atual"] == 5


def test_revision_is_restored_as_unpublished_draft():
    document = {
        "id": "espada-da-campanha",
        "tipo": "arma",
        "titulo": "Espada Antiga",
        "conteudo": {"descricao": "Versão anterior.", "preco": {"Lunaris": 25}},
        "ativo": True,
    }

    def responder(sql, _params):
        if "FROM campanhas" in sql:
            return _access(MASTER_ID, "mestre")
        if sql.startswith("SELECT id, item_id, versao"):
            return {"id": EDITORIAL_ID, "item_id": document["id"], "versao": 4}
        if sql.startswith("SELECT id, dados FROM revisoes_catalogo_campanha"):
            return {"id": REVISION_ID, "dados": document}
        if sql.startswith("UPDATE catalogo_itens_campanha"):
            return {
                "id": EDITORIAL_ID, "item_id": document["id"],
                "rascunho": document, "publicado": {**document, "titulo": "Espada Atual"},
                "versao": 5, "atualizado_em": None, "publicado_em": None,
            }
        if sql.startswith("INSERT INTO eventos_auditoria"):
            return None
        raise AssertionError(f"consulta inesperada: {sql}")

    connection = _Connection(responder)
    result = shop.restore_campaign_catalog_revision(
        EDITORIAL_ID,
        REVISION_ID,
        ShopCatalogPublishInput(campanha_id=CAMPAIGN_ID, versao_esperada=4),
        user=SimpleNamespace(id=MASTER_ID),
        database=_Database(connection),
    )
    assert result["editorial"]["rascunho"] == document
    assert not any(sql.startswith("INSERT INTO revisoes_catalogo_campanha") for sql, _ in connection.statements)
