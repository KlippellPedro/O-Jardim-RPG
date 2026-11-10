"""Documentos universais: papéis prontos que explicam a lore e kits de missão secundária.

O arquivo data/documentos/universais.json só o servidor lê, e só quem comanda a mesa
recebe: alguns documentos trazem pistas de segredos da campanha. O navegador nunca
importa esse arquivo; a fronteira de conteúdo (tools/browser-content-boundary.ts) o barra.
O desenho continua no navegador, com os mesmos modelos da Oficina de Documentos.

O arquivo é a base oficial e o site não escreve nele. O que o Criador muda pelo site
(título, notas e campos) fica na tabela `documentos_universais_editados`, uma linha por
documento, e vale para todas as campanhas. Apagar a linha devolve o texto original.
"""

from __future__ import annotations

import json
from functools import lru_cache

from core.documentos import CHAVE, MODELO, ErroDocumento, normalizar_campos, normalizar_titulo
from core.loot_criaturas import _localizar_data_root

FORMATO = "o-jardim-documentos-universais"
CAMPOS_DE_NOTA = ("tema", "titulo", "ensina", "entregar")
LISTAS_DE_NOTA = ("fontes", "inventado")
MAX_NOTA = 2000
TEXTOS_DA_MISSAO = ("titulo", "tamanho", "resumo", "relogio", "desfecho", "tom")
LISTAS_DA_MISSAO = ("perguntas", "pistas", "texto_da_carta_em_universal")


def _lista_de_textos(valor) -> bool:
    return isinstance(valor, list) and all(isinstance(item, str) for item in valor)


def _documento_valido(doc) -> bool:
    if not isinstance(doc, dict):
        return False
    if not isinstance(doc.get("id"), str) or not MODELO.match(doc["id"]):
        return False
    if not isinstance(doc.get("modelo"), str) or not MODELO.match(doc["modelo"]):
        return False
    if any(not isinstance(doc.get(chave), str) or not doc[chave].strip() for chave in CAMPOS_DE_NOTA):
        return False
    if any(not _lista_de_textos(doc.get(chave, [])) for chave in LISTAS_DE_NOTA):
        return False
    for chave in ("missao", "papel_na_missao"):
        if chave in doc and not isinstance(doc[chave], str):
            return False
    campos = doc.get("campos")
    if not isinstance(campos, dict) or not campos:
        return False
    return all(isinstance(chave, str) and CHAVE.match(chave) and isinstance(valor, str) for chave, valor in campos.items())


def _missao_valida(missao) -> bool:
    if not isinstance(missao, dict) or not isinstance(missao.get("id"), str) or not MODELO.match(missao["id"]):
        return False
    if any(not isinstance(missao.get(chave), str) or not missao[chave].strip() for chave in TEXTOS_DA_MISSAO):
        return False
    return all(_lista_de_textos(missao.get(chave, [])) for chave in LISTAS_DA_MISSAO)


@lru_cache(maxsize=1)
def _arquivo() -> tuple[tuple[dict, ...], tuple[dict, ...]]:
    """(missões, documentos) válidos, na ordem do arquivo. Malformado ou repetido fica de fora."""
    caminho = _localizar_data_root() / "documentos" / "universais.json"
    try:
        dados = json.loads(caminho.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return (), ()
    if not isinstance(dados, dict) or dados.get("formato") != FORMATO:
        return (), ()
    missoes: list[dict] = []
    for missao in dados.get("missoes", []):
        if _missao_valida(missao) and all(outra["id"] != missao["id"] for outra in missoes):
            missoes.append(missao)
    ids_de_missao = {missao["id"] for missao in missoes}
    vistos: set[str] = set()
    documentos = []
    for doc in dados.get("documentos", []):
        if not _documento_valido(doc) or doc["id"] in vistos:
            continue
        if doc.get("missao") and doc["missao"] not in ids_de_missao:
            continue
        vistos.add(doc["id"])
        documentos.append(doc)
    return tuple(missoes), tuple(documentos)


def documento_oficial(documento_id: str) -> dict | None:
    return next((doc for doc in _arquivo()[1] if doc["id"] == documento_id), None)


def _missao_para_a_tela(missao: dict) -> dict:
    return {
        **{chave: missao[chave] for chave in ("id", *TEXTOS_DA_MISSAO)},
        **{chave: list(missao.get(chave, [])) for chave in LISTAS_DA_MISSAO},
    }


def listar(edicoes: dict[str, dict] | None = None) -> dict:
    """Missões e documentos na ordem do arquivo, cada documento com a edição do Criador por cima, se houver."""
    edicoes = edicoes or {}
    missoes, documentos = _arquivo()
    lista = []
    for doc in documentos:
        edicao = edicoes.get(doc["id"])
        lista.append(
            {
                "id": doc["id"],
                "tema": doc["tema"],
                "missao": doc.get("missao"),
                "papel_na_missao": doc.get("papel_na_missao"),
                "titulo": edicao["titulo"] if edicao else doc["titulo"],
                "ensina": edicao["ensina"] if edicao else doc["ensina"],
                "entregar": edicao["entregar"] if edicao else doc["entregar"],
                "fontes": list(doc.get("fontes", [])),
                "inventado": list(doc.get("inventado", [])),
                "modelo": doc["modelo"],
                "campos": dict(edicao["campos"]) if edicao else dict(doc["campos"]),
                "editado": bool(edicao),
                "editado_em": edicao["atualizado_em"].isoformat() if edicao and edicao.get("atualizado_em") else None,
            }
        )
    return {"missoes": [_missao_para_a_tela(missao) for missao in missoes], "documentos": lista}


def _nota(valor, nome: str) -> str:
    if not isinstance(valor, str):
        raise ErroDocumento(f"{nome} precisa ser texto")
    limpo = valor.replace("\r\n", "\n").strip()
    if len(limpo) > MAX_NOTA:
        raise ErroDocumento(f"{nome} passa de {MAX_NOTA} caracteres")
    return limpo


def normalizar_edicao(titulo, ensina, entregar, campos) -> dict:
    """O que o Criador mandou, conferido como um documento da Oficina. O modelo não muda."""
    return {
        "titulo": normalizar_titulo(titulo),
        "ensina": _nota(ensina, "a nota do que ensina"),
        "entregar": _nota(entregar, "a nota de quando entregar"),
        "campos": normalizar_campos(campos),
    }
