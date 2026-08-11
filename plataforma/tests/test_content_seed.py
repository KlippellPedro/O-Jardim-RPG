from __future__ import annotations

import json
from contextlib import contextmanager

import pytest

from core.content_seed import sync_shop_catalog


class FakeConnection:
    def __init__(self):
        self.calls: list[tuple[str, tuple | None]] = []

    def execute(self, sql: str, params: tuple | None = None):
        self.calls.append((" ".join(sql.split()), params))
        return self


class FakeDatabase:
    def __init__(self):
        self.connection_value = FakeConnection()
        self.opened = 0

    @contextmanager
    def connection(self):
        self.opened += 1
        yield self.connection_value


def write_catalog(tmp_path, entries):
    shop_dir = tmp_path / "loja"
    shop_dir.mkdir()
    (shop_dir / "catalogo.json").write_text(
        json.dumps({"entradas": entries}, ensure_ascii=False),
        encoding="utf-8",
    )


def test_sync_shop_catalog_upserts_and_deactivates_missing_items(tmp_path):
    write_catalog(tmp_path, [
        {
            "id": "selo-teste",
            "tipo": "consumivel",
            "titulo": "Selo: Teste",
            "conteudo": {"preco": 10, "raridade": "incomum", "subtipo": "selo"},
        },
        {
            "id": "manto",
            "tipo": "equipamento",
            "titulo": "Manto",
            "conteudo": {"preco": 20, "raridade": "épico"},
        },
        {
            "id": "mod-afiada",
            "tipo": "modificacao",
            "titulo": "Afiada",
            "conteudo": {"preco": 60, "raridade": "incomum", "categoria_loja": "Modificações", "aplicacao": "Armas"},
        },
    ])
    database = FakeDatabase()

    assert sync_shop_catalog(database, tmp_path) == 3
    assert database.opened == 1
    assert len(database.connection_value.calls) == 4
    assert "ON CONFLICT (id) DO UPDATE" in database.connection_value.calls[0][0]
    assert "NOT (id = ANY(%s))" in database.connection_value.calls[-1][0]
    assert set(database.connection_value.calls[-1][1][0]) == {"selo-teste", "manto", "mod-afiada"}


def test_sync_shop_catalog_rejects_invalid_source_before_opening_transaction(tmp_path):
    write_catalog(tmp_path, [
        {
            "id": "quebrado",
            "tipo": "tipo-inexistente",
            "titulo": "Quebrado",
            "conteudo": {},
        },
    ])
    database = FakeDatabase()

    with pytest.raises(RuntimeError, match="tipo desconhecido"):
        sync_shop_catalog(database, tmp_path)
    assert database.opened == 0


def test_sync_shop_catalog_rejects_modification_with_unknown_aplicacao(tmp_path):
    write_catalog(tmp_path, [
        {
            "id": "mod-quebrada",
            "tipo": "modificacao",
            "titulo": "Quebrada",
            "conteudo": {"preco": 60, "raridade": "incomum", "aplicacao": "arma"},
        },
    ])
    database = FakeDatabase()

    with pytest.raises(RuntimeError, match="aplicacao desconhecida"):
        sync_shop_catalog(database, tmp_path)
    assert database.opened == 0


def test_sync_shop_catalog_accepts_modification_aplicacao_case_and_accent_insensitive(tmp_path):
    write_catalog(tmp_path, [
        {
            "id": "mod-ok",
            "tipo": "modificacao",
            "titulo": "Ok",
            "conteudo": {"preco": 60, "raridade": "incomum", "aplicacao": "ITENS GERAIS E MÁGICOS"},
        },
    ])
    database = FakeDatabase()

    assert sync_shop_catalog(database, tmp_path) == 1

