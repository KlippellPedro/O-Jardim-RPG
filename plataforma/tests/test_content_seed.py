from __future__ import annotations

import json
from contextlib import contextmanager

import pytest

from core.content_seed import seed_world_library, sync_shop_catalog


class FakeCursor:
    def __init__(self, connection: "FakeConnection"):
        self._connection = connection

    def __enter__(self):
        return self

    def __exit__(self, *exc_info):
        return False

    def execute(self, sql: str, params: tuple | None = None):
        self._connection.calls.append((" ".join(sql.split()), params))
        return self

    def executemany(self, sql: str, params_seq):
        # psycopg3 registra uma linha por tupla de parâmetros mesmo em modo
        # pipeline - a fake espelha isso pra não mudar o formato que os
        # testes já leem em connection_value.calls.
        for params in params_seq:
            self._connection.calls.append((" ".join(sql.split()), params))
        return self


class FakeConnection:
    def __init__(self):
        self.calls: list[tuple[str, tuple | None]] = []

    def execute(self, sql: str, params: tuple | None = None):
        self.calls.append((" ".join(sql.split()), params))
        return self

    def cursor(self):
        return FakeCursor(self)


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


def test_seed_world_library_includes_chronicle_catalog(tmp_path):
    world_dir = tmp_path / "mundo"
    world_dir.mkdir()
    (world_dir / "cronicas-arvores.json").write_text(
        json.dumps({
            "versao": 1,
            "introducao": {"titulo": "Crônicas de teste"},
            "linha_tempo_geral": [],
            "arvores": [],
        }, ensure_ascii=False),
        encoding="utf-8",
    )
    database = FakeDatabase()

    assert seed_world_library(database, tmp_path) == 1
    inserts = [params for sql, params in database.connection_value.calls if "INSERT INTO biblioteca_conteudo" in sql]
    assert len(inserts) == 1
    assert inserts[0][0:3] == ("cronologia", "cronicas-arvores", "Crônicas de teste")


def test_seed_world_library_preserves_initial_visibility(tmp_path):
    world_dir = tmp_path / "mundo"
    world_dir.mkdir()
    (world_dir / "segredos.json").write_text(json.dumps({"entradas": [{
        "tipo": "evento",
        "id": "evento-secreto",
        "titulo": "Evento secreto",
        "revelado": False,
        "conteudo": {"descricao": "Ainda oculto."},
    }]}, ensure_ascii=False), encoding="utf-8")
    database = FakeDatabase()

    assert seed_world_library(database, tmp_path) == 1
    inserts = [params for sql, params in database.connection_value.calls if "INSERT INTO biblioteca_conteudo" in sql]
    assert inserts[0][3].obj["revelado"] is False


def test_seed_world_library_includes_editorial_rules_classes_and_races(tmp_path):
    (tmp_path / "mundo").mkdir()
    rules_dir = tmp_path / "regras"
    rules_dir.mkdir()
    (rules_dir / "regras-editorial.json").write_text(
        json.dumps({
            "entradas": [{
                "tipo": "regra",
                "id": "combate",
                "titulo": "Combate",
                "conteudo": {
                    "categoria": "Combate e Mecânicas",
                    "status": "Oficial",
                    "resumo": "Resumo",
                    "destaques": [["Turno", "Uma ação"]],
                    "corpo": "<p>Texto.</p>",
                },
            }],
        }, ensure_ascii=False),
        encoding="utf-8",
    )
    ficha_dir = tmp_path / "ficha"
    ficha_dir.mkdir()
    (ficha_dir / "classes.json").write_text(
        json.dumps([{"id": "guardiao", "titulo": "Guardião", "vida": 5, "mana": 2}], ensure_ascii=False),
        encoding="utf-8",
    )
    (ficha_dir / "racas.json").write_text(
        json.dumps([{"id": "humano", "titulo": "Humano", "vida": 1, "fisiologia": ["Versátil"]}], ensure_ascii=False),
        encoding="utf-8",
    )
    database = FakeDatabase()

    assert seed_world_library(database, tmp_path) == 3
    rules_inserts = [
        params for sql, params in database.connection_value.calls
        if "INSERT INTO biblioteca_conteudo" in sql and "VALUES ('regras'" in sql
    ]
    assert [(params[0], params[1], params[2]) for params in rules_inserts] == [
        ("regra", "combate", "Combate"),
        ("classe", "guardiao", "Guardião"),
        ("raca", "humano", "Humano"),
    ]


def test_seed_world_library_includes_extended_narrative_catalogs(tmp_path):
    (tmp_path / "mundo").mkdir()
    rules_dir = tmp_path / "regras"
    rules_dir.mkdir()
    (rules_dir / "condicoes-editorial.json").write_text(json.dumps({"entradas": [
        {"tipo": "condicao", "id": "cego", "titulo": "Cego", "categoria": "física", "duracao": "Cena", "efeitos": ["Não enxerga"], "remocao": "Cura"},
        {"tipo": "crise", "id": "panico", "titulo": "Pânico", "categoria": "mental", "duracao": "1 rodada", "efeitos": ["Foge"], "remocao": "Vontade"},
    ]}, ensure_ascii=False), encoding="utf-8")
    ficha_dir = tmp_path / "ficha"
    ficha_dir.mkdir()
    (ficha_dir / "magias.json").write_text(json.dumps({
        "fluxos": [{"id": "origem", "titulo": "Origem", "essencia": "Criação"}],
        "magias": [{"id": "luz", "titulo": "Luz", "descricao": "Brilha", "custo_mana": 1}],
        "rituais": [{"id": "chamado", "titulo": "Chamado", "descricao": "Convoca", "requisito": "Relíquia"}],
        "selos": [{"id": "vigia", "titulo": "Vigia", "descricao": "Observa"}],
        "encantamentos": [{"id": "fio", "titulo": "Fio", "descricao": "Encanta"}],
    }, ensure_ascii=False), encoding="utf-8")
    (ficha_dir / "pericias.json").write_text(json.dumps({"pericias": [
        {"id": "atletismo", "titulo": "Atletismo", "atributo": "forca", "descricao": "Esforço"},
    ]}, ensure_ascii=False), encoding="utf-8")
    (ficha_dir / "legados.json").write_text(json.dumps({"legados": [
        {"id": "heroi", "titulo": "Herói", "descricao": "Legado original", "pre_requisitos": []},
    ]}, ensure_ascii=False), encoding="utf-8")
    (ficha_dir / "legados-regras-v1.json").write_text(json.dumps({"regras": {
        "heroi": {"descricao": "Legado revisado", "pre_requisitos": [{"nivel_personagem": 5}]},
    }}, ensure_ascii=False), encoding="utf-8")
    database = FakeDatabase()

    assert seed_world_library(database, tmp_path) == 9
    rules_inserts = [
        params for sql, params in database.connection_value.calls
        if "INSERT INTO biblioteca_conteudo" in sql and "VALUES ('regras'" in sql
    ]
    assert {(params[0], params[1]) for params in rules_inserts} == {
        ("fluxo", "origem"), ("magia", "luz"), ("ritual", "chamado"),
        ("selo", "vigia"), ("encantamento", "fio"), ("pericia", "atletismo"),
        ("legado", "heroi"), ("condicao", "cego"), ("crise", "panico"),
    }
    deactivations = [
        params for sql, params in database.connection_value.calls
        if "UPDATE biblioteca_conteudo" in sql and "ativo=FALSE" in sql
    ]
    assert {params[0] for params in deactivations} == {
        "fluxo", "magia", "ritual", "selo", "encantamento",
        "pericia", "legado", "condicao", "crise",
    }
