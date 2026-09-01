from __future__ import annotations

import contextlib
from types import SimpleNamespace
from uuid import UUID

import pytest
from fastapi import HTTPException

from routers import content
from schemas import GlobalContentEditorialDraftInput, GlobalContentEditorialVersionInput


CONTENT_ID = UUID("44444444-4444-4444-4444-444444444444")
CREATOR_ID = UUID("66666666-6666-6666-6666-666666666666")
CAMPAIGN_ID = UUID("11111111-1111-1111-1111-111111111111")


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


def _creator():
    return SimpleNamespace(id=CREATOR_ID, is_creator=True)


def _document(entry_type="reino"):
    return {
        "tipo": entry_type,
        "id": "biblioteca-de-arkarin",
        "titulo": "Biblioteca de Arkarin",
        "conteudo": {"descricao": "Arquivo vivo de Arkarin."},
        "revelado": True,
    }


def _state(*, version=1, draft=None, published=None):
    return {
        "id": CONTENT_ID,
        "titulo": "Biblioteca de Arkarin",
        "rascunho": draft,
        "dados_completos": published,
        "versao_editorial": version,
        "publicado_em": None if published is None else "2026-08-29T12:00:00Z",
        "atualizado_em": "2026-08-29T12:00:00Z",
    }


def test_only_creator_can_open_global_world_editor():
    connection = _Connection(lambda sql, params: pytest.fail(f"consulta inesperada: {sql}"))
    with pytest.raises(HTTPException) as captured:
        content.list_global_editorial_content(
            user=SimpleNamespace(id=UUID(int=1), is_creator=False),
            database=_Database(connection),
        )
    assert captured.value.status_code == 403
    assert connection.statements == []


def test_global_draft_is_saved_without_campaign_dependency():
    draft = _document("reino")
    payload = GlobalContentEditorialDraftInput(
        tipo=draft["tipo"],
        chave_recurso=draft["id"],
        titulo=draft["titulo"],
        conteudo=draft["conteudo"],
        revelado=True,
    )

    def responder(sql, _params):
        if "FROM biblioteca_conteudo" in sql:
            return {"tipo": "reino", "chave_recurso": draft["id"], "titulo": draft["titulo"], "dados": draft}
        if sql.startswith("SELECT 1 FROM conteudo_global_editorial"):
            return None
        if sql.startswith("SELECT id, versao_editorial FROM conteudo_global_editorial"):
            return None
        if sql.startswith("INSERT INTO conteudo_global_editorial"):
            return _state(draft=draft)
        if sql.startswith("INSERT INTO eventos_auditoria"):
            return None
        raise AssertionError(f"consulta inesperada: {sql}")

    connection = _Connection(responder)
    result = content.save_global_editorial_draft(
        payload, user=_creator(), database=_Database(connection)
    )
    assert result["editorial"]["publicado_em"] is None
    assert any(sql.startswith("INSERT INTO conteudo_global_editorial") for sql, _ in connection.statements)
    assert not any("informacoes_campanha" in sql for sql, _ in connection.statements)


def test_global_entry_moves_category_without_changing_origin_key():
    source = _document("reino")
    moved = _document("local")
    payload = GlobalContentEditorialDraftInput(
        tipo="local",
        chave_recurso=source["id"],
        chave_origem=f"reino:{source['id']}",
        titulo=source["titulo"],
        conteudo=source["conteudo"],
        revelado=True,
        versao_esperada=3,
    )
    library_calls = 0

    def responder(sql, _params):
        nonlocal library_calls
        if "FROM biblioteca_conteudo" in sql:
            library_calls += 1
            return ({"tipo": "reino", "chave_recurso": source["id"], "titulo": source["titulo"], "dados": source}
                    if library_calls == 1 else None)
        if sql.startswith("SELECT 1 FROM conteudo_global_editorial"):
            return None
        if sql.startswith("SELECT id, versao_editorial FROM conteudo_global_editorial"):
            return {"id": CONTENT_ID, "versao_editorial": 3}
        if sql.startswith("UPDATE conteudo_global_editorial"):
            return _state(version=4, draft=moved)
        if sql.startswith("INSERT INTO eventos_auditoria"):
            return None
        raise AssertionError(f"consulta inesperada: {sql}")

    connection = _Connection(responder)
    content.save_global_editorial_draft(payload, user=_creator(), database=_Database(connection))
    update = next(params for sql, params in connection.statements if sql.startswith("UPDATE conteudo_global_editorial"))
    assert update[1].obj["tipo"] == "local"
    select_current = next(params for sql, params in connection.statements if sql.startswith("SELECT id, versao_editorial FROM conteudo_global_editorial"))
    assert select_current == ("reino:biblioteca-de-arkarin",)


def test_global_delete_publishes_tombstone_for_official_entry():
    document = _document("reino")
    current = {
        "id": CONTENT_ID,
        "chave_origem": "reino:biblioteca-de-arkarin",
        "titulo": document["titulo"],
        "rascunho": document,
        "dados_publicados": None,
        "versao_editorial": 1,
        "publicado_em": None,
    }

    def responder(sql, _params):
        if sql.startswith("SELECT id, chave_origem, titulo, rascunho, dados_publicados"):
            return current
        if "FROM biblioteca_conteudo" in sql:
            return {"tipo": "reino", "chave_recurso": document["id"], "titulo": document["titulo"], "dados": document}
        if sql.startswith("UPDATE conteudo_global_editorial"):
            return {"id": CONTENT_ID}
        if sql.startswith("INSERT INTO revisoes_conteudo_global") or sql.startswith("INSERT INTO eventos_auditoria"):
            return None
        raise AssertionError(f"consulta inesperada: {sql}")

    connection = _Connection(responder)
    content.delete_global_editorial_content(
        CONTENT_ID,
        GlobalContentEditorialVersionInput(versao_esperada=1),
        user=_creator(),
        database=_Database(connection),
    )
    update = next(params for sql, params in connection.statements if sql.startswith("UPDATE conteudo_global_editorial"))
    assert update[1].obj["excluido"] is True
    assert any(sql.startswith("INSERT INTO revisoes_conteudo_global") for sql, _ in connection.statements)


def test_global_publication_creates_revision():
    draft = _document("local")
    current = {
        "id": CONTENT_ID,
        "chave_origem": "reino:biblioteca-de-arkarin",
        "titulo": draft["titulo"],
        "rascunho": draft,
        "versao_editorial": 4,
    }

    def responder(sql, _params):
        if sql.startswith("SELECT id, chave_origem, titulo, rascunho"):
            return current
        if "FROM biblioteca_conteudo" in sql:
            return {"tipo": "reino", "chave_recurso": draft["id"], "titulo": draft["titulo"], "dados": _document("reino")}
        if sql.startswith("UPDATE conteudo_global_editorial"):
            return _state(version=5, published=draft)
        if sql.startswith("INSERT INTO revisoes_conteudo_global") or sql.startswith("INSERT INTO eventos_auditoria"):
            return None
        raise AssertionError(f"consulta inesperada: {sql}")

    connection = _Connection(responder)
    result = content.publish_global_editorial_content(
        CONTENT_ID,
        GlobalContentEditorialVersionInput(versao_esperada=4),
        user=_creator(),
        database=_Database(connection),
    )
    assert result["editorial"]["versao_editorial"] == 5
    assert any(sql.startswith("INSERT INTO revisoes_conteudo_global") for sql, _ in connection.statements)


def test_global_editor_lists_moved_entry_under_effective_category():
    base = _document("reino")
    moved = _document("local")
    editorial = _state(version=5, published=moved)

    def responder(sql, _params):
        if "FROM biblioteca_conteudo" in sql:
            return _Result(rows=[{"tipo": "reino", "chave_recurso": base["id"], "titulo": base["titulo"], "dados": base}])
        if sql.startswith("SELECT id, chave_origem AS chave_recurso"):
            return _Result(rows=[{**editorial, "chave_recurso": "reino:biblioteca-de-arkarin"}])
        raise AssertionError(f"consulta inesperada: {sql}")

    result = content.list_global_editorial_content(
        user=_creator(), database=_Database(_Connection(responder))
    )
    assert len(result["entradas"]) == 1
    assert result["entradas"][0]["chave"] == "reino:biblioteca-de-arkarin"
    assert result["entradas"][0]["tipo"] == "local"
    assert result["escopo"] == "global"


def test_resolved_moved_entry_preserves_official_metadata_and_origin():
    base = {**_document("reino"), "arvore_origem": "mulher-carmesim"}
    moved = _document("local")

    def responder(sql, _params):
        if "FROM campanhas" in sql:
            return {
                "campanha_id": CAMPAIGN_ID,
                "dono_id": CREATOR_ID,
                "status": "ativa",
                "papel_plataforma": "criador",
                "usuario_id": None,
                "papel": None,
                "membro_status": None,
            }
        if "FROM biblioteca_conteudo" in sql:
            return _Result(rows=[{"tipo": "reino", "chave_recurso": base["id"], "titulo": base["titulo"], "dados": base}])
        if "FROM conteudo_global_editorial" in sql:
            return _Result(rows=[{"chave_recurso": "reino:biblioteca-de-arkarin", "dados_completos": moved}])
        raise AssertionError(f"consulta inesperada: {sql}")

    result = content.resolved_content(
        CAMPAIGN_ID,
        modulo="mundo",
        user=SimpleNamespace(id=CREATOR_ID),
        database=_Database(_Connection(responder)),
    )
    assert result["entradas"] == [{
        **moved,
        "arvore_origem": "mulher-carmesim",
        "chave_origem": "reino:biblioteca-de-arkarin",
    }]


def test_global_export_does_not_require_or_identify_a_campaign():
    document = _document("local")

    def responder(sql, _params):
        if sql.startswith("SELECT modulo, chave_origem"):
            return _Result(rows=[{
                "modulo": "mundo",
                "chave_origem": "reino:biblioteca-de-arkarin",
                "titulo": document["titulo"],
                "dados": document,
                "versao": 5,
                "publicado_em": "2026-08-29T12:00:00Z",
            }])
        raise AssertionError(f"consulta inesperada: {sql}")

    result = content.export_global_editorial_content(
        user=_creator(), database=_Database(_Connection(responder))
    )
    assert result["formato"] == "o-jardim-conteudo-global"
    assert "campanha" not in result
    assert result["conteudo"][0]["chave_origem"] == "reino:biblioteca-de-arkarin"
