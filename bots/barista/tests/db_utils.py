from __future__ import annotations

import atexit
import os
import uuid

import psycopg
import pytest
from psycopg import sql
from psycopg.conninfo import make_conninfo

from core.db import Database

_recursos = []


def novo_db() -> Database:
    """Cria um schema isolado; nunca apaga as tabelas do schema principal."""
    dsn = (os.getenv("TEST_DATABASE_URL") or "").strip()
    if not dsn:
        pytest.skip(
            "TEST_DATABASE_URL deve apontar para um PostgreSQL descartavel de testes"
        )
    if dsn == (os.getenv("DATABASE_URL") or "").strip():
        raise RuntimeError(
            "TEST_DATABASE_URL nao pode ser igual a DATABASE_URL de producao"
        )

    schema = f"barista_test_{uuid.uuid4().hex}"
    with psycopg.connect(dsn, autocommit=True) as con:
        con.execute(sql.SQL("CREATE SCHEMA {}").format(sql.Identifier(schema)))

    dsn_isolado = make_conninfo(dsn, options=f"-c search_path={schema}")
    db = Database(dsn_isolado)
    _recursos.append((db, dsn, schema))
    return db


@atexit.register
def _limpar_schemas() -> None:
    while _recursos:
        db, dsn, schema = _recursos.pop()
        db.fechar()
        try:
            with psycopg.connect(dsn, autocommit=True) as con:
                con.execute(
                    sql.SQL("DROP SCHEMA IF EXISTS {} CASCADE").format(
                        sql.Identifier(schema)
                    )
                )
        except Exception:
            # A limpeza e melhor-esforco; nunca deve mascarar o resultado do teste.
            pass
