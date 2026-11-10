"""Documentos universais: papéis prontos que explicam a lore (Fluxos, Deidades, Árvores, povos).

O arquivo data/documentos/universais.json só o servidor lê, e só quem comanda a mesa
recebe: alguns documentos trazem pistas de segredos da campanha. O navegador nunca
importa esse arquivo; a fronteira de conteúdo (tools/browser-content-boundary.ts) o barra.
O desenho continua no navegador, com os mesmos modelos da Oficina de Documentos.
"""

from __future__ import annotations

import json
from functools import lru_cache

from core.documentos import CHAVE, MODELO
from core.loot_criaturas import _localizar_data_root

FORMATO = "o-jardim-documentos-universais"
CAMPOS_DE_NOTA = ("tema", "titulo", "ensina", "entregar")
LISTAS_DE_NOTA = ("fontes", "inventado")


def _documento_valido(doc) -> bool:
    if not isinstance(doc, dict):
        return False
    if not isinstance(doc.get("id"), str) or not MODELO.match(doc["id"]):
        return False
    if not isinstance(doc.get("modelo"), str) or not MODELO.match(doc["modelo"]):
        return False
    if any(not isinstance(doc.get(chave), str) or not doc[chave].strip() for chave in CAMPOS_DE_NOTA):
        return False
    if any(not isinstance(doc.get(chave, []), list) or not all(isinstance(item, str) for item in doc.get(chave, [])) for chave in LISTAS_DE_NOTA):
        return False
    campos = doc.get("campos")
    if not isinstance(campos, dict) or not campos:
        return False
    return all(isinstance(chave, str) and CHAVE.match(chave) and isinstance(valor, str) for chave, valor in campos.items())


@lru_cache(maxsize=1)
def _arquivo() -> tuple[dict, ...]:
    caminho = _localizar_data_root() / "documentos" / "universais.json"
    try:
        dados = json.loads(caminho.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return ()
    if not isinstance(dados, dict) or dados.get("formato") != FORMATO:
        return ()
    vistos: set[str] = set()
    documentos = []
    for doc in dados.get("documentos", []):
        # Documento malformado ou repetido fica de fora; o teste do repositório acusa antes do deploy.
        if not _documento_valido(doc) or doc["id"] in vistos:
            continue
        vistos.add(doc["id"])
        documentos.append(doc)
    return tuple(documentos)


def listar() -> list[dict]:
    """Os documentos na ordem do arquivo, só com o que a aba usa."""
    return [
        {
            "id": doc["id"],
            "tema": doc["tema"],
            "titulo": doc["titulo"],
            "ensina": doc["ensina"],
            "entregar": doc["entregar"],
            "fontes": list(doc.get("fontes", [])),
            "inventado": list(doc.get("inventado", [])),
            "modelo": doc["modelo"],
            "campos": dict(doc["campos"]),
        }
        for doc in _arquivo()
    ]
