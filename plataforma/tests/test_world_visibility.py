from copy import deepcopy
from types import SimpleNamespace
from uuid import uuid4

from core.world_visibility import visible_world
from routers import content
from tests.test_content_editorial import _Connection, _Database, _Result


def document(id, tipo="local", **kwargs):
    return {"id": id, "tipo": tipo, "titulo": id, "conteudo": {"descricao": "reservado:" + id}, **kwargs}


def test_explicit_default_visibility_and_manager_override():
    entries = [document("aberto"), document("fechado", revelado=False)]
    assert [e["id"] for e in visible_world(entries, {})] == ["aberto"]
    config = {"lore_oculto": ["aberto"], "lore_revelado": ["fechado"]}
    assert [e["id"] for e in visible_world(entries, config)] == ["fechado"]
    assert visible_world(entries, config, True) == entries


def test_hidden_parent_hides_descendants_even_if_explicitly_revealed():
    entries = [document("pai", revelado=False), document("filho", conteudo={"local_pai": "pai"}),
               document("neto", conteudo={"reino": "filho"})]
    assert visible_world(entries, {"lore_revelado": ["filho", "neto"]}) == []


def test_cycles_and_missing_parents_fail_closed():
    entries = [document("a", conteudo={"local_pai": "b"}), document("b", conteudo={"local_pai": "a"}),
               document("orfao", conteudo={"dimensao": "apagada"})]
    assert visible_world(entries, {}) == []


def test_chronicle_does_not_repeat_a_hidden_place_summary():
    place = document("segredo", revelado=False)
    chronicle = document("cronicas", "cronologia", conteudo={"arvores": [
        {"id": "aethel", "lugares": [{"nome": "segredo", "resumo": "reservado"}, {"nome": "publico"}]}]})
    result = visible_world([place, chronicle], {})
    assert result[0]["conteudo"]["arvores"][0]["lugares"] == [{"nome": "publico"}]


def test_tree_gate_is_separate_from_deity_lore_gate():
    entries = [document("aethel", "deidade"), document("galho", "galho", arvore_origem="aethel")]
    assert visible_world(entries, {"arvores_oculto": ["aethel"]}) == []
    assert [e["id"] for e in visible_world(entries, {"lore_oculto": ["aethel"]})] == ["galho"]


def test_entities_use_entity_visibility_and_keep_full_story_for_manager():
    entries = [document("conto", "entidade", revelado=False, conteudo={"conto": [{"paragrafos": ["segredo"]}]})]
    assert visible_world(entries, {}) == []
    assert visible_world(entries, {"entidades_revelado": ["conto"]}) == entries
    assert visible_world(entries, {}, True) == entries


def test_universal_records_and_private_fields():
    entries = [document("registro", registro_universal="ser"), document("outro", conteudo={
        "descricao": "público", "corpoMestre": "segredo", "_nota": "interna", "anexo": {"rascunho": "segredo"},
    })]
    result = visible_world(entries, {"registros_universais_ocultos": True})
    assert [e["id"] for e in result] == ["outro"]
    assert result[0]["conteudo"] == {"descricao": "público", "anexo": {}}


def test_chronicle_sections_events_trees_and_global_gate_without_mutating_source():
    payload = {"introducao": {}, "linha_tempo_geral": [{"id": "global"}, {"id": "axis", "arvores": ["keryx"]}],
               "arvores": [{"id": "aethel", "tese": "essência", "atmosfera": "clima", "historia": ["passado"],
                            "cronologia": [{"id": "permitido"}, {"id": "oculto"}]}, {"id": "keryx", "historia": ["segredo"]}]}
    entries = [document("cronicas", "cronologia", conteudo=payload)]
    original = deepcopy(entries)
    config = {"cronologia_geral_oculta": True, "cronica_secoes_ocultas": ["aethel:historia", "aethel:tese"], "cronica_eventos_ocultos": ["oculto"]}
    resolved = visible_world(entries, config)[0]["conteudo"]
    assert resolved["linha_tempo_geral"] == []
    assert len(resolved["arvores"]) == 1
    tree = resolved["arvores"][0]
    assert tree["historia"] == [] and tree["tese"] == "" and tree["atmosfera"] == "clima"
    assert tree["cronologia"] == [{"id": "permitido"}]
    assert entries == original


def test_resolved_endpoint_filters_publication_and_not_draft():
    campaign, user = uuid4(), uuid4()
    base = document("publicacao")
    hidden = document("oculto", revelado=False)
    def responder(query, params):
        if "FROM campanhas c" in query:
            return dict(campanha_id=campaign, dono_id=uuid4(), usuario_id=user, membro_status="ativo", papel="jogador", papel_plataforma="player")
        if query.startswith("SELECT configuracoes"):
            return {"configuracoes": {"lore_oculto": ["publicacao"]}}
        if "FROM biblioteca_conteudo" in query:
            return _Result(rows=[dict(tipo=e["tipo"], chave_recurso=e["id"], titulo=e["titulo"], dados=e) for e in [base, hidden]])
        if "FROM conteudo_global_editorial" in query:
            assert "dados_publicados AS dados_completos" in query and "publicado_em IS NOT NULL" in query
            return _Result(rows=[])
        raise AssertionError(query)
    result = content.resolved_content(campaign, "mundo", SimpleNamespace(id=user), _Database(_Connection(responder)))
    assert result["entradas"] == []


def test_resolved_rules_never_return_master_chapter_library_or_nested_private_fields():
    campaign, user = uuid4(), uuid4()
    entries = [document("mestre", "regra"), document("mestre-v1", "regras-mestre"),
               document("publico", "regra", conteudo={"corpo": "público", "corpoMestre": "segredo"})]
    def responder(query, params):
        if "FROM campanhas c" in query:
            return dict(campanha_id=campaign, dono_id=uuid4(), usuario_id=user, membro_status="ativo", papel="jogador", papel_plataforma="player")
        if "FROM biblioteca_conteudo" in query:
            return _Result(rows=[dict(tipo=e["tipo"], chave_recurso=e["id"], titulo=e["titulo"], dados=e) for e in entries])
        if "FROM informacoes_campanha" in query:
            return _Result(rows=[])
        raise AssertionError(query)
    result = content.resolved_content(campaign, "regras", SimpleNamespace(id=user), _Database(_Connection(responder)))
    assert result["entradas"] == [document("publico", "regra", conteudo={"corpo": "público"})]


def test_legacy_references_use_current_visibility_and_do_not_expand_partial_access(monkeypatch):
    calls = []
    def resolve(campaign, module, user, db):
        calls.append(module)
        return {"entradas": [document("permitido", conteudo={"descricao": "publicado", "extra": "novo"})]}
    monkeypatch.setattr(content, "resolved_content", resolve)
    rows = [dict(tipo="mundo", chave_recurso="local:oculto", dados_completos={"segredo": "antigo"}),
            dict(tipo="mundo", chave_recurso="local:permitido", titulo="antigo", resumo_rumor="antigo",
                 dados_completos={"segredo": "antigo"}, dados_parciais={"conteudo": {"descricao": "publicado", "corpoMestre": "segredo"}})]
    result = list(content.public_legacy_rows(rows, uuid4(), None, None))
    assert len(result) == 1 and calls == ["mundo"]
    assert result[0]["titulo"] == "permitido" and result[0]["resumo_rumor"] == ""
    assert result[0]["dados_parciais"] == {"conteudo": {"descricao": "publicado"}}
    assert "segredo" not in str(result)


def test_custom_knowledge_keeps_grants_but_never_private_fields():
    row = dict(tipo="mundo", chave_recurso="avulso", acesso_padrao="parcial",
               dados_completos={"publico": "sim", "corpoMestre": "segredo"}, rascunho={"segredo": True})
    result = list(content.public_legacy_rows([row], uuid4(), None, None))[0]
    assert result["acesso_padrao"] == "parcial"
    assert result["dados_completos"] == {"publico": "sim"} and "rascunho" not in result


def test_proposed_factions_never_become_player_content_by_reveal_toggle():
    proposal = document("proposta", "faccao", conteudo={"estado": "proposta"}, revelado=False)
    assert visible_world([proposal], {"lore_revelado": ["proposta"]}) == []
    assert visible_world([proposal], {}, True) == [proposal]


def test_actual_server_seed_keeps_entities_and_world_metadata_without_id_collision():
    from pathlib import Path
    from core.content_seed import seed_world_library
    from tests.test_content_seed import FakeDatabase
    db = FakeDatabase()
    seed_world_library(db, Path(__file__).resolve().parents[2] / "data")
    entries = [params[3].obj for query, params in db.connection_value.calls
               if "INSERT INTO biblioteca_conteudo" in query and "VALUES ('mundo'" in query]
    assert any(e["tipo"] == "entidade" and e["conteudo"]["conto"] for e in entries)
    assert any(e.get("arvore_origem") for e in entries)
    players = visible_world(entries, {})
    assert any(e["id"] == "banco-lunar" and e["tipo"] == "local" for e in players)
    assert not any(e["id"] == "keryx" for e in players)
    assert not any(e["tipo"] == "faccao" and e["conteudo"]["estado"] == "proposta" for e in players)


def test_server_only_catalogs_do_not_open_new_editor_fields():
    import pytest
    from fastapi import HTTPException
    for kind in ("entidade", "faccao"):
        with pytest.raises(HTTPException) as error:
            content._require_editable_world_type(kind)
        assert error.value.status_code == 422
