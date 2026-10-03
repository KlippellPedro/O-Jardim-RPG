"""Loot das criaturas do Bestiário.

A tabela de cada criatura mora em data/bestiario/loot-criaturas.json e só o
servidor a lê: o jogador descobre o que cai saqueando, e o Mestre vê a tabela
pela Sessão ao Vivo. Cada linha rola d100 contra a própria `chance`; a
quantidade e as moedas usam dados (`1`, `1d2`, `2d4`...). A rolagem é feita
aqui, no servidor, pelo mesmo motivo das outras rolagens da mesa: o resultado
vale como prova.
"""

from __future__ import annotations

import json
import secrets
from functools import lru_cache
from pathlib import Path
from typing import Callable
from uuid import uuid4

from core.dados import rolar_formula


def _localizar_data_root() -> Path:
    """Mesma resolução de plataforma/main.py::_DATA_ROOT."""
    app_root = Path(__file__).resolve().parent.parent
    local = app_root / "data"
    return local if local.exists() else app_root.parent / "data"


@lru_cache(maxsize=1)
def tabelas() -> dict:
    caminho = _localizar_data_root() / "bestiario" / "loot-criaturas.json"
    try:
        return json.loads(caminho.read_text(encoding="utf-8")).get("criaturas", {})
    except (OSError, json.JSONDecodeError):
        return {}


def tabela_da_criatura(monstro_id: str | None) -> dict | None:
    if not monstro_id:
        return None
    tabela = tabelas().get(str(monstro_id))
    return tabela if isinstance(tabela, dict) else None


def _d100() -> int:
    return secrets.randbelow(100) + 1


def _quantidade(formula: str) -> int:
    texto = str(formula or "1").strip()
    if texto.isdigit():
        return max(1, int(texto))
    return max(1, int(rolar_formula(texto)["total"]))


def rolar_loot(
    monstro_id: str,
    catalogo: dict[str, dict],
    *,
    d100: Callable[[], int] = _d100,
    quantidade: Callable[[str], int] = _quantidade,
) -> dict | None:
    """Rola a tabela da criatura. `catalogo` traz título e raridade dos itens
    (id -> {titulo, conteudo}); linha cujo item sumiu do catálogo é ignorada
    em vez de derrubar o saque inteiro."""
    tabela = tabela_da_criatura(monstro_id)
    if tabela is None:
        return None
    linhas: list[dict] = []
    for regra in tabela.get("itens") or []:
        item = catalogo.get(regra.get("item"))
        if item is None:
            continue
        rolagem = d100()
        if rolagem > int(regra.get("chance") or 0):
            continue
        conteudo = item.get("conteudo") if isinstance(item.get("conteudo"), dict) else {}
        linhas.append({
            "linha": uuid4().hex[:12],
            "tipo": "item",
            "item_id": regra["item"],
            "titulo": item.get("titulo") or regra["item"],
            "raridade": conteudo.get("raridade"),
            "quantidade": quantidade(regra.get("quantidade") or "1"),
            "rolagem": rolagem,
            "chance": int(regra["chance"]),
            "entregue_para": None,
        })
    moedas = tabela.get("moedas")
    if isinstance(moedas, dict):
        rolagem = d100()
        if rolagem <= int(moedas.get("chance") or 0):
            linhas.append({
                "linha": uuid4().hex[:12],
                "tipo": "moedas",
                "moeda": moedas.get("moeda") or "Lunaris",
                "titulo": moedas.get("moeda") or "Lunaris",
                "quantidade": quantidade(moedas.get("dados") or "1"),
                "rolagem": rolagem,
                "chance": int(moedas["chance"]),
                "entregue_para": None,
            })
    return {"monstro_id": monstro_id, "linhas": linhas}


def resumo_da_tabela(monstro_id: str, catalogo: dict[str, dict]) -> dict | None:
    """A tabela legível para o Mestre: o que pode cair, com que chance."""
    tabela = tabela_da_criatura(monstro_id)
    if tabela is None:
        return None
    itens = []
    for regra in tabela.get("itens") or []:
        item = catalogo.get(regra.get("item"))
        if item is None:
            continue
        conteudo = item.get("conteudo") if isinstance(item.get("conteudo"), dict) else {}
        itens.append({
            "item_id": regra["item"],
            "titulo": item.get("titulo") or regra["item"],
            "raridade": conteudo.get("raridade"),
            "exclusivo": conteudo.get("exclusivo") is True,
            "chance": int(regra.get("chance") or 0),
            "quantidade": str(regra.get("quantidade") or "1"),
        })
    return {"monstro_id": monstro_id, "itens": itens, "moedas": tabela.get("moedas")}
