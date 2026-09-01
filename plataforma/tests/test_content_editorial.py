from __future__ import annotations

import contextlib
import copy
import json
from pathlib import Path
from types import SimpleNamespace
from uuid import UUID

import pytest
from fastapi import HTTPException

from routers import content
from schemas import ContentEditorialDeleteInput, ContentEditorialDraftInput, ContentEditorialPublishInput


CAMPAIGN_ID = UUID("11111111-1111-1111-1111-111111111111")
MASTER_ID = UUID("22222222-2222-2222-2222-222222222222")
ASSISTANT_ID = UUID("33333333-3333-3333-3333-333333333333")
CONTENT_ID = UUID("44444444-4444-4444-4444-444444444444")
REVISION_ID = UUID("55555555-5555-5555-5555-555555555555")
CREATOR_ID = UUID("66666666-6666-6666-6666-666666666666")


def _creator():
    """Edicao de conteudo agora e exclusiva do criador da plataforma."""
    return SimpleNamespace(id=CREATOR_ID, is_creator=True)


def _non_creator(user_id: UUID):
    return SimpleNamespace(id=user_id, is_creator=False)


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


def _draft(version=None):
    return ContentEditorialDraftInput(
        campanha_id=CAMPAIGN_ID,
        tipo="deidade",
        chave_recurso="aethel",
        titulo="Aethel revisada",
        conteudo={"descricao": "Nova descrição da campanha."},
        versao_esperada=version,
    )


def test_assistant_cannot_open_editor():
    def responder(sql, _params):
        raise AssertionError(f"consulta inesperada: {sql}")

    with pytest.raises(HTTPException) as captured:
        content.list_editorial_content(
            CAMPAIGN_ID,
            modulo="mundo",
            user=_non_creator(ASSISTANT_ID),
            database=_Database(_Connection(responder)),
        )
    assert captured.value.status_code == 403


def test_master_cannot_open_editor_anymore():
    """Edicao de conteudo deixou de ser um privilegio do mestre da campanha."""
    def responder(sql, _params):
        raise AssertionError(f"consulta inesperada: {sql}")

    with pytest.raises(HTTPException) as captured:
        content.list_editorial_content(
            CAMPAIGN_ID,
            modulo="mundo",
            user=_non_creator(MASTER_ID),
            database=_Database(_Connection(responder)),
        )
    assert captured.value.status_code == 403


def test_new_draft_is_saved_without_publishing():
    returned = {
        "id": CONTENT_ID,
        "titulo": "Aethel revisada",
        "rascunho": {"tipo": "deidade", "id": "aethel"},
        "versao_editorial": 1,
        "publicado_em": None,
        "atualizado_em": None,
    }

    def responder(sql, _params):
        if "FROM campanhas" in sql:
            return _access(MASTER_ID, "mestre")
        if "FROM biblioteca_conteudo" in sql:
            return {"tipo": "deidade", "chave_recurso": "aethel", "titulo": "Aethel", "dados": {}}
        if sql.startswith("SELECT id, versao_editorial FROM informacoes_campanha"):
            return None
        if sql.startswith("INSERT INTO informacoes_campanha"):
            return returned
        if sql.startswith("INSERT INTO eventos_auditoria"):
            return None
        raise AssertionError(f"consulta inesperada: {sql}")

    connection = _Connection(responder)
    result = content.save_editorial_draft(
        _draft(),
        user=_creator(),
        database=_Database(connection),
    )
    assert result["editorial"]["publicado_em"] is None
    assert any("'oculto'" in sql for sql, _ in connection.statements if sql.startswith("INSERT INTO informacoes_campanha"))
    assert not any("revisoes_conteudo" in sql for sql, _ in connection.statements)


def test_new_campaign_only_world_entry_can_be_saved():
    payload = ContentEditorialDraftInput(
        campanha_id=CAMPAIGN_ID,
        tipo="evento",
        chave_recurso="queda-de-astraluna",
        titulo="A Queda de Astraluna",
        conteudo={"descricao": "Um evento exclusivo desta campanha.", "envolvidos": ["Aethel"]},
    )

    def responder(sql, _params):
        if "FROM campanhas" in sql:
            return _access(MASTER_ID, "mestre")
        if "FROM biblioteca_conteudo" in sql:
            return None
        if sql.startswith("SELECT id, versao_editorial FROM informacoes_campanha"):
            return None
        if sql.startswith("INSERT INTO informacoes_campanha"):
            return {
                "id": CONTENT_ID, "titulo": payload.titulo,
                "rascunho": {"tipo": payload.tipo, "id": payload.chave_recurso},
                "versao_editorial": 1, "publicado_em": None, "atualizado_em": None,
            }
        if sql.startswith("INSERT INTO eventos_auditoria"):
            return None
        raise AssertionError(f"consulta inesperada: {sql}")

    result = content.save_editorial_draft(
        payload,
        user=_creator(),
        database=_Database(_Connection(responder)),
    )
    assert result["editorial"]["versao_editorial"] == 1


def test_global_world_publication_is_appended_to_every_resolved_catalog():
    custom = {
        "tipo": "evento", "id": "queda-de-astraluna", "titulo": "A Queda de Astraluna",
        "conteudo": {"descricao": "Evento da campanha."},
    }

    def responder(sql, _params):
        if "FROM campanhas" in sql:
            return _access(MASTER_ID, "mestre")
        if "FROM biblioteca_conteudo" in sql:
            return _Result(rows=[])
        if "FROM conteudo_global_editorial" in sql:
            return _Result(rows=[{"chave_recurso": "evento:queda-de-astraluna", "dados_completos": custom}])
        raise AssertionError(f"consulta inesperada: {sql}")

    result = content.resolved_content(
        CAMPAIGN_ID,
        modulo="mundo",
        user=SimpleNamespace(id=MASTER_ID),
        database=_Database(_Connection(responder)),
    )
    assert result["entradas"] == [{**custom, "chave_origem": "evento:queda-de-astraluna"}]


def test_campaign_only_world_entry_can_be_deleted():
    def responder(sql, _params):
        if "FROM campanhas" in sql:
            return _access(MASTER_ID, "mestre")
        if sql.startswith("SELECT id, campanha_id, tipo, chave_recurso, titulo, rascunho"):
            return {
                "id": CONTENT_ID,
                "campanha_id": CAMPAIGN_ID,
                "tipo": "mundo",
                "chave_recurso": "evento:queda-de-astraluna",
                "titulo": "A Queda de Astraluna",
                "versao_editorial": 3,
            }
        if "FROM biblioteca_conteudo" in sql:
            return None
        if sql.startswith("DELETE FROM informacoes_campanha"):
            return {"id": CONTENT_ID}
        if sql.startswith("INSERT INTO eventos_auditoria"):
            return None
        raise AssertionError(f"consulta inesperada: {sql}")

    connection = _Connection(responder)
    result = content.delete_custom_editorial_content(
        CONTENT_ID,
        ContentEditorialDeleteInput(campanha_id=CAMPAIGN_ID, versao_esperada=3),
        user=_creator(),
        database=_Database(connection),
    )
    assert result is None
    assert any(sql.startswith("DELETE FROM informacoes_campanha") for sql, _ in connection.statements)
    assert any(sql.startswith("INSERT INTO eventos_auditoria") for sql, _ in connection.statements)


def test_official_world_entry_is_removed_only_from_campaign():
    official = {
        "tipo": "deidade", "id": "aethel", "titulo": "Aethel",
        "conteudo": {"descricao": "Texto oficial."},
    }

    def responder(sql, _params):
        if "FROM campanhas" in sql:
            return _access(MASTER_ID, "mestre")
        if sql.startswith("SELECT id, campanha_id, tipo, chave_recurso, titulo, rascunho"):
            return {
                "id": CONTENT_ID,
                "campanha_id": CAMPAIGN_ID,
                "tipo": "mundo",
                "chave_recurso": "deidade:aethel",
                "titulo": "Aethel",
                "rascunho": None,
                "dados_completos": {},
                "versao_editorial": 2,
                "publicado_em": None,
            }
        if "FROM biblioteca_conteudo" in sql:
            return {"tipo": "deidade", "chave_recurso": "aethel", "titulo": "Aethel", "dados": official}
        if sql.startswith("UPDATE informacoes_campanha"):
            return {"id": CONTENT_ID}
        if sql.startswith("INSERT INTO revisoes_conteudo") or sql.startswith("INSERT INTO eventos_auditoria"):
            return None
        raise AssertionError(f"consulta inesperada: {sql}")

    connection = _Connection(responder)
    result = content.delete_custom_editorial_content(
        CONTENT_ID,
        ContentEditorialDeleteInput(campanha_id=CAMPAIGN_ID, versao_esperada=2),
        user=_creator(),
        database=_Database(connection),
    )
    assert result is None
    update = next(params for sql, params in connection.statements if sql.startswith("UPDATE informacoes_campanha"))
    assert update[2].obj["excluido"] is True
    assert update[2].obj["conteudo"] == official["conteudo"]
    assert not any(sql.startswith("DELETE FROM informacoes_campanha") for sql, _ in connection.statements)
    assert any(sql.startswith("INSERT INTO revisoes_conteudo") for sql, _ in connection.statements)


def test_world_entry_can_move_category_without_changing_storage_identity():
    payload = ContentEditorialDraftInput(
        campanha_id=CAMPAIGN_ID,
        tipo="local",
        chave_recurso="biblioteca-de-arkarin",
        chave_origem="reino:biblioteca-de-arkarin",
        titulo="Biblioteca de Arkarin",
        conteudo={"descricao": "Um lugar dentro do Castelo Carmesim."},
    )

    def responder(sql, params):
        if "FROM campanhas" in sql:
            return _access(MASTER_ID, "mestre")
        if "FROM biblioteca_conteudo" in sql:
            if params[1:] == ("reino", "biblioteca-de-arkarin"):
                return {
                    "tipo": "reino", "chave_recurso": "biblioteca-de-arkarin",
                    "titulo": payload.titulo,
                    "dados": {
                        "tipo": "reino", "id": payload.chave_recurso,
                        "titulo": payload.titulo, "conteudo": payload.conteudo,
                    },
                }
            return None
        if sql.startswith("SELECT id, versao_editorial FROM informacoes_campanha"):
            return None
        if sql.startswith("INSERT INTO informacoes_campanha"):
            return {
                "id": CONTENT_ID, "titulo": payload.titulo,
                "rascunho": {
                    "tipo": "local", "id": payload.chave_recurso,
                    "titulo": payload.titulo, "conteudo": payload.conteudo,
                },
                "versao_editorial": 1, "publicado_em": None, "atualizado_em": None,
            }
        if sql.startswith("INSERT INTO eventos_auditoria"):
            return None
        raise AssertionError(f"consulta inesperada: {sql}")

    connection = _Connection(responder)
    result = content.save_editorial_draft(
        payload,
        user=_creator(),
        database=_Database(connection),
    )
    insert_params = next(params for sql, params in connection.statements if sql.startswith("INSERT INTO informacoes_campanha"))
    assert insert_params[3] == "reino:biblioteca-de-arkarin"
    assert result["editorial"]["rascunho"]["tipo"] == "local"


def test_custom_world_entry_delete_rejects_stale_version():
    def responder(sql, _params):
        if "FROM campanhas" in sql:
            return _access(MASTER_ID, "mestre")
        if sql.startswith("SELECT id, campanha_id, tipo, chave_recurso, titulo, rascunho"):
            return {
                "id": CONTENT_ID,
                "campanha_id": CAMPAIGN_ID,
                "tipo": "mundo",
                "chave_recurso": "evento:queda-de-astraluna",
                "titulo": "A Queda de Astraluna",
                "versao_editorial": 4,
            }
        raise AssertionError(f"consulta inesperada: {sql}")

    with pytest.raises(HTTPException) as captured:
        content.delete_custom_editorial_content(
            CONTENT_ID,
            ContentEditorialDeleteInput(campanha_id=CAMPAIGN_ID, versao_esperada=3),
            user=_creator(),
            database=_Database(_Connection(responder)),
        )
    assert captured.value.status_code == 409


def test_publish_creates_immutable_revision():
    draft = {
        "tipo": "deidade",
        "id": "aethel",
        "titulo": "Aethel revisada",
        "conteudo": {"descricao": "Nova descrição da campanha."},
    }

    def responder(sql, _params):
        if "FROM campanhas" in sql:
            return _access(MASTER_ID, "mestre")
        if sql.startswith("SELECT id, campanha_id, tipo, chave_recurso"):
            return {
                "id": CONTENT_ID,
                "campanha_id": CAMPAIGN_ID,
                "tipo": "mundo",
                "chave_recurso": "deidade:aethel",
                "titulo": "Aethel revisada",
                "rascunho": draft,
                "versao_editorial": 3,
            }
        if "FROM biblioteca_conteudo" in sql:
            return {
                "tipo": "deidade",
                "chave_recurso": "aethel",
                "titulo": "Aethel",
                "dados": {
                    "tipo": "deidade", "id": "aethel", "titulo": "Aethel",
                    "conteudo": {"descricao": "Texto oficial."},
                },
            }
        if sql.startswith("UPDATE informacoes_campanha"):
            return {
                "id": CONTENT_ID,
                "titulo": "Aethel revisada",
                "dados_completos": draft,
                "versao_editorial": 4,
                "publicado_em": None,
                "atualizado_em": None,
            }
        if sql.startswith("INSERT INTO revisoes_conteudo") or sql.startswith("INSERT INTO eventos_auditoria"):
            return None
        raise AssertionError(f"consulta inesperada: {sql}")

    connection = _Connection(responder)
    result = content.publish_editorial_content(
        CONTENT_ID,
        ContentEditorialPublishInput(campanha_id=CAMPAIGN_ID, versao_esperada=3),
        user=_creator(),
        database=_Database(connection),
    )
    assert result["editorial"]["versao_editorial"] == 4
    assert any(sql.startswith("INSERT INTO revisoes_conteudo") for sql, _ in connection.statements)
    assert any(sql.startswith("INSERT INTO eventos_auditoria") for sql, _ in connection.statements)


def test_revision_is_restored_as_draft_without_republishing():
    document = {
        "tipo": "deidade", "id": "aethel", "titulo": "Aethel anterior",
        "conteudo": {"descricao": "Versão anterior."},
    }

    def responder(sql, _params):
        if "FROM campanhas" in sql:
            return _access(MASTER_ID, "mestre")
        if sql.startswith("SELECT id, tipo, versao_editorial"):
            return {"id": CONTENT_ID, "tipo": "mundo", "versao_editorial": 4}
        if sql.startswith("SELECT id, titulo, dados FROM revisoes_conteudo"):
            return {"id": REVISION_ID, "titulo": document["titulo"], "dados": document}
        if "FROM biblioteca_conteudo" in sql:
            return {
                "tipo": "deidade", "chave_recurso": "aethel", "titulo": "Aethel",
                "dados": {**document, "titulo": "Aethel", "conteudo": {"descricao": "Oficial"}},
            }
        if sql.startswith("UPDATE informacoes_campanha"):
            return {
                "id": CONTENT_ID, "titulo": document["titulo"], "rascunho": document,
                "versao_editorial": 5, "publicado_em": None, "atualizado_em": None,
            }
        if sql.startswith("INSERT INTO eventos_auditoria"):
            return None
        raise AssertionError(f"consulta inesperada: {sql}")

    connection = _Connection(responder)
    result = content.restore_editorial_revision(
        CONTENT_ID,
        REVISION_ID,
        ContentEditorialPublishInput(campanha_id=CAMPAIGN_ID, versao_esperada=4),
        user=_creator(),
        database=_Database(connection),
    )
    assert result["editorial"]["rascunho"] == document
    assert not any(sql.startswith("INSERT INTO revisoes_conteudo") for sql, _ in connection.statements)


def test_campaign_export_contains_only_campaign_scoped_rules():
    document = {
        "tipo": "regra", "id": "combate", "titulo": "Combate",
        "conteudo": {"descricao": "Publicado."},
    }

    def responder(sql, _params):
        if sql.startswith("SELECT id, nome FROM campanhas"):
            return {"id": CAMPAIGN_ID, "nome": "Campanha de teste"}
        if "FROM campanhas" in sql:
            return _access(MASTER_ID, "mestre")
        if sql.startswith("SELECT tipo AS modulo"):
            return _Result(rows=[{
                "modulo": "regras", "chave_recurso": "regra:combate",
                "titulo": document["titulo"], "dados": document,
                "versao": 3, "publicado_em": None,
            }])
        if sql.startswith("SELECT item_id, publicado AS dados"):
            return _Result(rows=[])
        raise AssertionError(f"consulta inesperada: {sql}")

    result = content.export_published_editorial_content(
        CAMPAIGN_ID,
        user=_creator(),
        database=_Database(_Connection(responder)),
    )
    assert result["formato"] == "o-jardim-conteudo-publicado"
    assert result["campanha"]["id"] == str(CAMPAIGN_ID)
    assert result["conteudo"][0]["dados"] == document


def test_draft_rejects_stale_version():
    def responder(sql, _params):
        if "FROM campanhas" in sql:
            return _access(MASTER_ID, "mestre")
        if "FROM biblioteca_conteudo" in sql:
            return {"tipo": "deidade", "chave_recurso": "aethel", "titulo": "Aethel", "dados": {}}
        if sql.startswith("SELECT id, versao_editorial FROM informacoes_campanha"):
            return {"id": CONTENT_ID, "versao_editorial": 5}
        raise AssertionError(f"consulta inesperada: {sql}")

    with pytest.raises(HTTPException) as captured:
        content.save_editorial_draft(
            _draft(version=4),
            user=_creator(),
            database=_Database(_Connection(responder)),
        )
    assert captured.value.status_code == 409
    assert captured.value.detail["versao_atual"] == 5


def test_resolved_content_overlays_only_published_global_version():
    base_aethel = {
        "tipo": "deidade",
        "id": "aethel",
        "titulo": "Aethel oficial",
        "conteudo": {"descricao": "Texto oficial"},
    }
    base_axis = {
        "tipo": "deidade",
        "id": "keryx",
        "titulo": "A.X.I.S",
        "conteudo": {"descricao": "Permanece oficial"},
    }
    override = {
        **base_aethel,
        "titulo": "Aethel da campanha",
        "conteudo": {"descricao": "Texto publicado pelo mestre"},
    }

    def responder(sql, _params):
        if "FROM campanhas" in sql:
            return _access(MASTER_ID, "mestre")
        if "FROM biblioteca_conteudo" in sql:
            return _Result(rows=[
                {"tipo": "deidade", "chave_recurso": "aethel", "titulo": "Aethel oficial", "dados": base_aethel},
                {"tipo": "deidade", "chave_recurso": "keryx", "titulo": "A.X.I.S", "dados": base_axis},
            ])
        if "FROM conteudo_global_editorial" in sql:
            return _Result(rows=[{"chave_recurso": "deidade:aethel", "dados_completos": override}])
        raise AssertionError(f"consulta inesperada: {sql}")

    result = content.resolved_content(
        CAMPAIGN_ID,
        modulo="mundo",
        user=SimpleNamespace(id=MASTER_ID),
        database=_Database(_Connection(responder)),
    )
    assert result["entradas"] == [
        {**override, "chave_origem": "deidade:aethel"},
        {**base_axis, "chave_origem": "deidade:keryx"},
    ]


def test_resolved_content_omits_entry_removed_globally():
    base = {
        "tipo": "reino", "id": "biblioteca-de-arkarin",
        "titulo": "Biblioteca de Arkarin",
        "conteudo": {"descricao": "Texto oficial."},
    }
    removed = {**base, "tipo": "local", "excluido": True}

    def responder(sql, _params):
        if "FROM campanhas" in sql:
            return _access(MASTER_ID, "mestre")
        if "FROM biblioteca_conteudo" in sql:
            return _Result(rows=[{
                "tipo": "reino", "chave_recurso": base["id"],
                "titulo": base["titulo"], "dados": base,
            }])
        if "FROM conteudo_global_editorial" in sql:
            return _Result(rows=[{
                "chave_recurso": "reino:biblioteca-de-arkarin",
                "dados_completos": removed,
            }])
        raise AssertionError(f"consulta inesperada: {sql}")

    result = content.resolved_content(
        CAMPAIGN_ID,
        modulo="mundo",
        user=SimpleNamespace(id=MASTER_ID),
        database=_Database(_Connection(responder)),
    )
    assert result["entradas"] == []


def test_editor_lists_moved_entry_in_effective_category():
    base = {
        "tipo": "reino", "id": "biblioteca-de-arkarin",
        "titulo": "Biblioteca de Arkarin",
        "conteudo": {"descricao": "Texto oficial."},
    }
    moved_draft = {**base, "tipo": "local"}

    def responder(sql, _params):
        if "FROM campanhas" in sql:
            return {"id": CAMPAIGN_ID}
        if "FROM biblioteca_conteudo" in sql:
            return _Result(rows=[{
                "tipo": "reino", "chave_recurso": base["id"],
                "titulo": base["titulo"], "dados": base,
            }])
        if sql.startswith("SELECT id, chave_recurso, titulo, rascunho"):
            return _Result(rows=[{
                "id": CONTENT_ID,
                "chave_recurso": "reino:biblioteca-de-arkarin",
                "titulo": base["titulo"], "rascunho": moved_draft,
                "dados_completos": {}, "versao_editorial": 1,
                "publicado_em": None, "atualizado_em": None,
            }])
        raise AssertionError(f"consulta inesperada: {sql}")

    result = content.list_editorial_content(
        CAMPAIGN_ID,
        modulo="mundo",
        user=_creator(),
        database=_Database(_Connection(responder)),
    )
    assert result["entradas"][0]["chave"] == "reino:biblioteca-de-arkarin"
    assert result["entradas"][0]["tipo"] == "local"


def test_official_chronology_passes_editorial_validation():
    root = Path(__file__).resolve().parents[2]
    chronology = json.loads((root / "data" / "mundo" / "cronicas-arvores.json").read_text(encoding="utf-8"))
    content._validate_chronicle_content(chronology)


def test_chronology_rejects_duplicate_event_id():
    root = Path(__file__).resolve().parents[2]
    chronology = json.loads((root / "data" / "mundo" / "cronicas-arvores.json").read_text(encoding="utf-8"))
    broken = copy.deepcopy(chronology)
    broken["linha_tempo_geral"][1]["id"] = broken["linha_tempo_geral"][0]["id"]
    with pytest.raises(HTTPException) as captured:
        content._validate_chronicle_content(broken)
    assert captured.value.status_code == 422
    assert "duplicado" in captured.value.detail


def test_chronology_rejects_unknown_tree_reference():
    root = Path(__file__).resolve().parents[2]
    chronology = json.loads((root / "data" / "mundo" / "cronicas-arvores.json").read_text(encoding="utf-8"))
    broken = copy.deepcopy(chronology)
    broken["linha_tempo_geral"][0]["arvores"] = ["arvore-inexistente"]
    with pytest.raises(HTTPException) as captured:
        content._validate_chronicle_content(broken)
    assert captured.value.status_code == 422
    assert "inexistente" in captured.value.detail


def test_chronology_rejects_invalid_tree_narrative_section():
    root = Path(__file__).resolve().parents[2]
    chronology = json.loads((root / "data" / "mundo" / "cronicas-arvores.json").read_text(encoding="utf-8"))
    broken = copy.deepcopy(chronology)
    broken["arvores"][0]["historia"] = "isto deveria ser uma lista de paragrafos"
    with pytest.raises(HTTPException) as captured:
        content._validate_chronicle_content(broken)
    assert captured.value.status_code == 422
    assert "narrativas" in captured.value.detail


def test_chronology_accepts_empty_optional_tree_sections():
    root = Path(__file__).resolve().parents[2]
    chronology = json.loads((root / "data" / "mundo" / "cronicas-arvores.json").read_text(encoding="utf-8"))
    chronology["arvores"][0]["atmosfera"] = ""
    chronology["arvores"][0]["historia"] = []
    chronology["arvores"][0]["lugares"] = []
    content._validate_chronicle_content(chronology)


def _rule_base(document: dict) -> dict:
    return {
        "tipo": document["tipo"],
        "chave_recurso": document["id"],
        "titulo": document["titulo"],
        "dados": document,
    }


def _catalog_document(item: dict, entry_type: str) -> dict:
    return {
        "tipo": entry_type,
        "id": item["id"],
        "titulo": item["titulo"],
        "conteudo": {
            key: value for key, value in item.items()
            if key not in {"id", "tipo", "titulo"}
        },
    }


def test_all_generated_rule_chapters_pass_editorial_validation():
    root = Path(__file__).resolve().parents[2]
    payload = json.loads((root / "data" / "regras" / "regras-editorial.json").read_text(encoding="utf-8"))
    assert len(payload["entradas"]) >= 40
    for document in payload["entradas"]:
        content._validate_rules_content("regra", document["conteudo"], _rule_base(document))


def test_rule_chapter_rejects_script_html():
    root = Path(__file__).resolve().parents[2]
    payload = json.loads((root / "data" / "regras" / "regras-editorial.json").read_text(encoding="utf-8"))
    document = copy.deepcopy(payload["entradas"][0])
    document["conteudo"]["corpo"] += '<script>alert("xss")</script>'

    with pytest.raises(HTTPException) as captured:
        content._validate_rules_content("regra", document["conteudo"], _rule_base(document))
    assert captured.value.status_code == 422
    assert "tag HTML não permitida" in captured.value.detail


def test_class_narrative_can_change_but_mechanics_cannot():
    root = Path(__file__).resolve().parents[2]
    classes = json.loads((root / "data" / "ficha" / "classes.json").read_text(encoding="utf-8"))
    document = _catalog_document(classes[0], "classe")
    base = _rule_base(document)
    narrative = copy.deepcopy(document["conteudo"])
    narrative["descricao"] = "Uma descrição própria desta campanha."
    content._validate_rules_content("classe", narrative, base)

    mechanical = copy.deepcopy(narrative)
    mechanical["vida"] = int(mechanical["vida"]) + 1
    with pytest.raises(HTTPException) as captured:
        content._validate_rules_content("classe", mechanical, base)
    assert captured.value.status_code == 422
    assert "campos mecânicos" in captured.value.detail

    without_description = copy.deepcopy(document)
    without_description["conteudo"].pop("descricao", None)
    added_description = copy.deepcopy(without_description["conteudo"])
    added_description["descricao"] = "Uma descrição que não existia no catálogo base."
    content._validate_rules_content("classe", added_description, _rule_base(without_description))


def test_nested_class_narrative_can_change_but_progression_cannot():
    document = {
        "tipo": "classe",
        "id": "guardiao",
        "titulo": "Guardião",
        "conteudo": {
            "vida": 5,
            "habilidades": [{"id": "bastiao", "titulo": "Bastião", "descricao": "Texto oficial", "nivel": 2}],
        },
    }
    base = _rule_base(document)
    narrative = copy.deepcopy(document["conteudo"])
    narrative["habilidades"][0]["titulo"] = "Bastião da Campanha"
    narrative["habilidades"][0]["descricao"] = "Texto personalizado."
    content._validate_rules_content("classe", narrative, base)

    mechanical = copy.deepcopy(narrative)
    mechanical["habilidades"][0]["nivel"] = 1
    with pytest.raises(HTTPException) as captured:
        content._validate_rules_content("classe", mechanical, base)
    assert captured.value.status_code == 422


def test_magic_narrative_can_change_but_cost_and_requirements_cannot():
    spell = {
        "tipo": "magia", "id": "luz", "titulo": "Luz",
        "conteudo": {"descricao": "Original", "efeito": "Ilumina.", "custo_mana": 2, "circulo": 1},
    }
    narrative = copy.deepcopy(spell["conteudo"])
    narrative["descricao"] = "Nova descrição."
    narrative["efeito"] = "Nova apresentação do efeito."
    content._validate_rules_content("magia", narrative, _rule_base(spell))

    mechanical = copy.deepcopy(narrative)
    mechanical["custo_mana"] = 1
    with pytest.raises(HTTPException):
        content._validate_rules_content("magia", mechanical, _rule_base(spell))

    ritual = {
        "tipo": "ritual", "id": "chamado", "titulo": "Chamado",
        "conteudo": {"descricao": "Original", "efeito": "Convoca.", "falha": "Nada.", "requisito": "Uma relíquia", "custo_mana": 3},
    }
    changed_requirement = copy.deepcopy(ritual["conteudo"])
    changed_requirement["requisito"] = "Nenhum"
    with pytest.raises(HTTPException):
        content._validate_rules_content("ritual", changed_requirement, _rule_base(ritual))

    universal = {
        "tipo": "magia", "id": "centelha", "titulo": "Centelha",
        "conteudo": {"descricao": "Original", "efeito": "Base", "efeitos_por_fluxo": {"origem": "Cria", "tempo": "Atrasa"}, "custo_mana": 1},
    }
    changed_variants = copy.deepcopy(universal["conteudo"])
    changed_variants["efeitos_por_fluxo"]["origem"] = "Nova narrativa"
    content._validate_rules_content("magia", changed_variants, _rule_base(universal))
    changed_variants["efeitos_por_fluxo"]["vazio"] = "Variante nova"
    with pytest.raises(HTTPException):
        content._validate_rules_content("magia", changed_variants, _rule_base(universal))


def test_magic_without_official_variants_cannot_gain_invented_fluxos():
    spell = {
        "tipo": "magia", "id": "centelha-simples", "titulo": "Centelha Simples",
        "conteudo": {"descricao": "Original", "efeito": "Base", "custo_mana": 1},
    }
    invented = copy.deepcopy(spell["conteudo"])
    invented["efeitos_por_fluxo"] = {"origem": "Variante inventada"}
    with pytest.raises(HTTPException):
        content._validate_rules_content("magia", invented, _rule_base(spell))


def test_condition_text_can_change_but_category_cannot():
    document = {
        "tipo": "condicao", "id": "cego", "titulo": "Cego",
        "conteudo": {"categoria": "física", "duracao": "Conforme a fonte.", "efeitos": ["Não enxerga."], "remocao": "Remova a fonte."},
    }
    narrative = copy.deepcopy(document["conteudo"])
    narrative["efeitos"] = ["Desvantagem em testes de visão."]
    content._validate_rules_content("condicao", narrative, _rule_base(document))

    mechanical = copy.deepcopy(narrative)
    mechanical["categoria"] = "mental"
    with pytest.raises(HTTPException):
        content._validate_rules_content("condicao", mechanical, _rule_base(document))


def test_resolved_rule_hides_master_body_from_player():
    base = {
        "tipo": "regra",
        "id": "combate",
        "titulo": "Combate",
        "conteudo": {
            "categoria": "Combate e Mecânicas",
            "status": "Oficial",
            "resumo": "Resumo",
            "destaques": [["Turno", "Uma ação"]],
            "corpo": "<p>Texto público.</p>",
            "corpoMestre": "<p>Segredo do mestre.</p>",
        },
    }

    def responder(sql, _params):
        if "FROM campanhas" in sql:
            return _access(ASSISTANT_ID, "jogador")
        if "FROM biblioteca_conteudo" in sql:
            return _Result(rows=[{
                "tipo": "regra", "chave_recurso": "combate",
                "titulo": "Combate", "dados": base,
            }])
        if sql.startswith("SELECT chave_recurso, dados_completos"):
            return _Result(rows=[])
        raise AssertionError(f"consulta inesperada: {sql}")

    result = content.resolved_content(
        CAMPAIGN_ID,
        modulo="regras",
        user=SimpleNamespace(id=ASSISTANT_ID),
        database=_Database(_Connection(responder)),
    )
    assert result["entradas"][0]["conteudo"]["corpo"] == "<p>Texto público.</p>"
    assert "corpoMestre" not in result["entradas"][0]["conteudo"]
