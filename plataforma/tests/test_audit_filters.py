from __future__ import annotations

import contextlib
from datetime import datetime, timezone
from types import SimpleNamespace
from uuid import UUID

import pytest
from fastapi import HTTPException

from routers import campaigns


CAMPAIGN_ID = UUID("11111111-1111-1111-1111-111111111111")
MASTER_ID = UUID("22222222-2222-2222-2222-222222222222")
ACTOR_ID = UUID("33333333-3333-3333-3333-333333333333")
CHARACTER_ID = UUID("44444444-4444-4444-4444-444444444444")


class _Result:
    def __init__(self, row=None, rows=None):
        self.row = row
        self.rows = rows or []

    def fetchone(self):
        return self.row

    def fetchall(self):
        return self.rows


class _Connection:
    def __init__(self):
        self.statements = []

    def execute(self, statement, params=None):
        sql = " ".join(str(statement).split())
        self.statements.append((sql, params))
        if "FROM campanhas c" in sql:
            return _Result(row={
                "campanha_id": CAMPAIGN_ID,
                "dono_id": MASTER_ID,
                "status": "ativa",
                "papel_plataforma": "mestre",
                "usuario_id": MASTER_ID,
                "papel": "mestre",
                "membro_status": "ativo",
            })
        if sql.startswith("SELECT count(*) AS total"):
            return _Result(row={"total": 61})
        if sql.startswith("SELECT e.id"):
            return _Result(rows=[{
                "id": UUID("55555555-5555-5555-5555-555555555555"),
                "acao": "personagem.atualizado",
                "detalhes": {},
            }])
        raise AssertionError(f"consulta inesperada: {sql}")


class _Database:
    def __init__(self, connection):
        self.connection_value = connection

    @contextlib.contextmanager
    def connection(self):
        yield self.connection_value


def test_audit_filters_are_parameterized_and_response_is_paginated():
    connection = _Connection()
    start = datetime(2026, 8, 1, tzinfo=timezone.utc)
    end = datetime(2026, 8, 31, tzinfo=timezone.utc)

    result = campaigns.list_audit_events(
        CAMPAIGN_ID,
        limite=30,
        pagina=2,
        ator_id=ACTOR_ID,
        personagem_id=CHARACTER_ID,
        categoria="personagem",
        busca="Lia",
        desde=start,
        ate=end,
        user=SimpleNamespace(id=MASTER_ID),
        database=_Database(connection),
    )

    assert result["pagina"] == 2
    assert result["total"] == 61
    assert result["paginas"] == 3
    select_sql, params = next(
        (sql, params) for sql, params in connection.statements if sql.startswith("SELECT e.id")
    )
    assert "e.ator_usuario_id=%s" in select_sql
    assert "e.alvo_id=%s" in select_sql
    assert "e.acao LIKE %s" in select_sql
    assert "LIMIT %s OFFSET %s" in select_sql
    assert ACTOR_ID in params
    assert str(CHARACTER_ID) in params
    assert "personagem.%" in params
    assert params[-2:] == (30, 30)


def test_audit_rejects_category_that_could_change_sql_shape():
    with pytest.raises(HTTPException) as captured:
        campaigns.list_audit_events(
            CAMPAIGN_ID,
            categoria="personagem%' OR TRUE --",
            user=SimpleNamespace(id=MASTER_ID),
            database=_Database(_Connection()),
        )
    assert captured.value.status_code == 422


def test_audit_rejects_inverted_period():
    with pytest.raises(HTTPException) as captured:
        campaigns.list_audit_events(
            CAMPAIGN_ID,
            desde=datetime(2026, 8, 31, tzinfo=timezone.utc),
            ate=datetime(2026, 8, 1, tzinfo=timezone.utc),
            user=SimpleNamespace(id=MASTER_ID),
            database=_Database(_Connection()),
        )
    assert captured.value.status_code == 422
