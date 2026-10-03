"""Entidade nova publicada pelo Painel do Criador.

As Entidades oficiais continuam nos arquivos (data/mundo/entidades.ts). O editor
global aceita só Entidade nova, valida o conto e a entrega no Livro das
Entidades de todas as campanhas, como registro universal.
"""
from __future__ import annotations

import contextlib
import copy
from types import SimpleNamespace
from uuid import UUID

import pytest
from fastapi import HTTPException

from core.world_visibility import visible_world
from routers import content
from schemas import ContentEditorialDraftInput, GlobalContentEditorialDraftInput

CAMPAIGN_ID = UUID("11111111-1111-1111-1111-111111111111")
MASTER_ID = UUID("22222222-2222-2222-2222-222222222222")
CONTENT_ID = UUID("44444444-4444-4444-4444-444444444444")
CREATOR = SimpleNamespace(id=UUID("66666666-6666-6666-6666-666666666666"), is_creator=True)

TEMA = {
    "destaque": "#c9a227",
    "destaqueSuave": "rgba(201, 162, 39, .15)",
    "fundo": "#05060a",
    "superficie": "rgba(13, 15, 20, .86)",
    "texto": "#eef1f5",
    "textoSuave": "#9da3ae",
}


def _conto(**extra) -> dict:
    return {
        "id": "colecionador-de-sombras",
        "nome": "Colecionador de Sombras",
        "registroUniversal": True,
        "epigrafe": "Toda sombra tem dono, até o dia em que não tem.",
        "resumo": "Compra a sombra de quem não quer mais ser visto.",
        "rankPerigo": "laranja",
        "classificacao": ["negociador"],
        "tema": dict(TEMA),
        "conto": [{"paragrafos": ["Ele chegou com a feira.", "Ninguém lembrou de vê-lo partir."]}],
        **extra,
    }


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


def _draft(**extra) -> GlobalContentEditorialDraftInput:
    dados = {
        "tipo": "entidade",
        "chave_recurso": "colecionador-de-sombras",
        "titulo": "Colecionador de Sombras",
        "conteudo": _conto(),
        "revelado": True,
        "versao_esperada": None,
    }
    dados.update(extra)
    return GlobalContentEditorialDraftInput(**dados)


def _responder_novo(base=None):
    def responder(sql, _params):
        if "FROM biblioteca_conteudo" in sql:
            return base
        if sql.startswith("SELECT 1 FROM conteudo_global_editorial"):
            return None
        if sql.startswith("SELECT id, versao_editorial FROM conteudo_global_editorial"):
            return None
        if sql.startswith("INSERT INTO conteudo_global_editorial"):
            return {
                "id": CONTENT_ID, "titulo": "Colecionador de Sombras",
                "rascunho": {"tipo": "entidade", "id": "colecionador-de-sombras"},
                "dados_completos": None, "versao_editorial": 1,
                "publicado_em": None, "atualizado_em": None,
            }
        if sql.startswith("INSERT INTO eventos_auditoria"):
            return None
        raise AssertionError(f"consulta inesperada: {sql}")
    return responder


# ---------------------------------------------------------------- validação

def test_conto_valido_passa():
    content._validate_entity_content("colecionador-de-sombras", _conto())


@pytest.mark.parametrize("ajuste, trecho", [
    ({"musicaTema": {"titulo": "x", "arquivo": "/a.mp3"}}, "musicaTema"),
    ({"tema": {**TEMA, "imagemFundo": "/x.jpg"}}, "tema"),
    ({"tema": {**TEMA, "destaque": "url(javascript:alert(1))"}}, "destaque"),
    ({"rankPerigo": "roxo"}, "rank"),
    ({"classificacao": []}, "classificação"),
    ({"classificacao": ["pacifico", "pacifico"]}, "classificação"),
    ({"id": "outro-id"}, "id"),
    ({"nome": "   "}, "nome"),
    ({"registroUniversal": False}, "universal"),
    ({"conto": []}, "partes"),
    ({"conto": [{"paragrafos": ["ok", "  "]}]}, "parágrafos"),
    ({"conto": [{"paragrafos": ["ok"], "autor": "x"}]}, "título e parágrafos"),
    ({"conto": [{"paragrafos": ["x" * 5001]}]}, "5000"),
])
def test_conto_invalido_e_recusado(ajuste, trecho):
    with pytest.raises(HTTPException) as erro:
        content._validate_entity_content("colecionador-de-sombras", _conto(**ajuste))
    assert erro.value.status_code == 422
    assert trecho in str(erro.value.detail)


# ---------------------------------------------------------------- editor global

def test_entidade_nova_vira_rascunho_global():
    connection = _Connection(_responder_novo())
    resultado = content.save_global_editorial_draft(_draft(), user=CREATOR, database=_Database(connection))
    assert resultado["editorial"]["versao_editorial"] == 1
    inseridos = [params for sql, params in connection.statements if sql.startswith("INSERT INTO conteudo_global_editorial")]
    assert inseridos and inseridos[0][1] == "entidade:colecionador-de-sombras"


def test_entidade_oficial_continua_nos_arquivos():
    oficial = {"tipo": "entidade", "chave_recurso": "colecionador-de-sombras", "titulo": "x", "dados": {}}
    with pytest.raises(HTTPException) as erro:
        content.save_global_editorial_draft(_draft(), user=CREATOR, database=_Database(_Connection(_responder_novo(oficial))))
    assert erro.value.status_code == 422
    assert "oficiais ficam nos arquivos" in str(erro.value.detail)


def test_conto_ruim_nao_vira_rascunho():
    with pytest.raises(HTTPException) as erro:
        content.save_global_editorial_draft(
            _draft(conteudo=_conto(rankPerigo="roxo")), user=CREATOR, database=_Database(_Connection(_responder_novo())),
        )
    assert erro.value.status_code == 422


def test_entidade_nao_muda_de_categoria():
    def responder(sql, _params):
        raise AssertionError(f"consulta inesperada: {sql}")

    with pytest.raises(HTTPException) as erro:
        content.save_global_editorial_draft(
            _draft(chave_origem="local:colecionador-de-sombras"), user=CREATOR, database=_Database(_Connection(responder)),
        )
    assert erro.value.status_code == 422


def test_faccao_continua_bloqueada():
    with pytest.raises(HTTPException) as erro:
        content.save_global_editorial_draft(
            _draft(tipo="faccao", chave_recurso="banco-lunar"), user=CREATOR, database=_Database(_Connection(_responder_novo())),
        )
    assert erro.value.status_code == 422


def test_editor_de_campanha_nao_cria_entidade():
    payload = ContentEditorialDraftInput(
        campanha_id=CAMPAIGN_ID, tipo="entidade", chave_recurso="colecionador-de-sombras",
        titulo="Colecionador de Sombras", conteudo=_conto(),
    )

    def responder(sql, _params):
        if "FROM campanhas" in sql:
            return {
                "campanha_id": CAMPAIGN_ID, "dono_id": MASTER_ID, "status": "ativa",
                "papel_plataforma": "mestre", "usuario_id": CREATOR.id, "papel": "mestre", "membro_status": "ativo",
            }
        raise AssertionError(f"consulta inesperada: {sql}")

    with pytest.raises(HTTPException) as erro:
        content.save_editorial_draft(payload, user=CREATOR, database=_Database(_Connection(responder)))
    assert erro.value.status_code == 422


def test_lista_global_mostra_so_a_entidade_criada_no_painel():
    criada = {"tipo": "entidade", "id": "colecionador-de-sombras", "titulo": "Colecionador de Sombras", "conteudo": _conto()}

    def responder(sql, _params):
        if "FROM biblioteca_conteudo" in sql:
            return _Result(rows=[{
                "tipo": "entidade", "chave_recurso": "dama-solitaria", "titulo": "Dama Solitária",
                "dados": {"tipo": "entidade", "id": "dama-solitaria", "titulo": "Dama Solitária", "conteudo": {}},
            }])
        if "FROM conteudo_global_editorial" in sql:
            return _Result(rows=[{
                "id": CONTENT_ID, "chave_recurso": "entidade:colecionador-de-sombras", "titulo": criada["titulo"],
                "rascunho": None, "dados_completos": criada, "versao_editorial": 2,
                "publicado_em": "2026-10-03", "atualizado_em": "2026-10-03",
            }])
        raise AssertionError(f"consulta inesperada: {sql}")

    entradas = content._global_editor_entries(_Connection(responder))
    assert [entrada["chave"] for entrada in entradas] == ["entidade:colecionador-de-sombras"]


# ---------------------------------------------------------------- Livro das Entidades

def _resolver(documento: dict):
    def responder(sql, _params):
        if "FROM campanhas" in sql:
            return {
                "campanha_id": CAMPAIGN_ID, "dono_id": MASTER_ID, "status": "ativa",
                "papel_plataforma": "mestre", "usuario_id": MASTER_ID, "papel": "mestre", "membro_status": "ativo",
            }
        if "FROM biblioteca_conteudo" in sql:
            return _Result(rows=[])
        if "FROM conteudo_global_editorial" in sql:
            return _Result(rows=[{"chave_recurso": "entidade:colecionador-de-sombras", "dados_completos": documento}])
        raise AssertionError(f"consulta inesperada: {sql}")
    return content.resolved_content(
        CAMPAIGN_ID, modulo="mundo", user=SimpleNamespace(id=MASTER_ID),
        database=_Database(_Connection(responder)),
    )


def test_entidade_publicada_entra_no_livro_como_registro_universal():
    documento = {"tipo": "entidade", "id": "colecionador-de-sombras", "titulo": "Colecionador de Sombras",
                 "conteudo": _conto(), "revelado": True}
    entradas = _resolver(documento)["entradas"]
    assert len(entradas) == 1
    assert entradas[0]["registro_universal"] is True
    assert entradas[0]["conteudo"]["nome"] == "Colecionador de Sombras"


def test_visibilidade_da_campanha_vale_para_a_entidade_nova():
    entrada = {"tipo": "entidade", "id": "colecionador-de-sombras", "titulo": "Colecionador de Sombras",
               "conteudo": _conto(), "revelado": True, "registro_universal": True}
    assert visible_world([copy.deepcopy(entrada)], {}) != []
    assert visible_world([copy.deepcopy(entrada)], {"entidades_oculto": ["colecionador-de-sombras"]}) == []
    assert visible_world([copy.deepcopy(entrada)], {"registros_universais_ocultos": True}) == []
    trancada = {**entrada, "revelado": False}
    assert visible_world([copy.deepcopy(trancada)], {}) == []
    assert visible_world([copy.deepcopy(trancada)], {"entidades_revelado": ["colecionador-de-sombras"]}) != []


def _publicar(rascunho: dict):
    from schemas import GlobalContentEditorialVersionInput

    def responder(sql, _params):
        if sql.startswith("SELECT id, chave_origem, titulo, rascunho, versao_editorial FROM conteudo_global_editorial"):
            return {"id": CONTENT_ID, "chave_origem": "entidade:colecionador-de-sombras", "titulo": "x",
                    "rascunho": rascunho, "versao_editorial": 1}
        if "FROM biblioteca_conteudo" in sql:
            return None
        if sql.startswith("UPDATE conteudo_global_editorial"):
            return {"id": CONTENT_ID, "titulo": rascunho["titulo"], "rascunho": None, "dados_completos": rascunho,
                    "versao_editorial": 2, "publicado_em": "2026-10-03", "atualizado_em": "2026-10-03"}
        if sql.startswith("INSERT INTO revisoes_conteudo_global") or sql.startswith("INSERT INTO eventos_auditoria"):
            return None
        raise AssertionError(f"consulta inesperada: {sql}")

    connection = _Connection(responder)
    resultado = content.publish_global_editorial_content(
        CONTENT_ID, GlobalContentEditorialVersionInput(versao_esperada=1), user=CREATOR, database=_Database(connection),
    )
    return resultado, connection


def test_publicar_entidade_cria_revisao():
    rascunho = {"tipo": "entidade", "id": "colecionador-de-sombras", "titulo": "Colecionador de Sombras", "conteudo": _conto()}
    resultado, connection = _publicar(rascunho)
    assert resultado["editorial"]["versao_editorial"] == 2
    assert any(sql.startswith("INSERT INTO revisoes_conteudo_global") for sql, _ in connection.statements)


def test_publicar_confere_o_conto_de_novo():
    rascunho = {"tipo": "entidade", "id": "colecionador-de-sombras", "titulo": "x", "conteudo": _conto(conto=[])}
    with pytest.raises(HTTPException) as erro:
        _publicar(rascunho)
    assert erro.value.status_code == 422
