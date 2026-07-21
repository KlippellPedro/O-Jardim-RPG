"""Loot dos baús — logica PURA. rng injetavel. Preparado pra Estações."""

from __future__ import annotations

import random as _random
from typing import Dict, List, Optional

PESOS_RARIDADE: Dict[str, int] = {"comum": 60, "incomum": 25, "raro": 10, "epico": 4, "lendario": 1}
LUNARIS_MIN, LUNARIS_MAX = 5, 40


def sortear_item(catalogo, rng=_random, pesos: Optional[Dict[str, int]] = None, tipos=None):
    """Sorteia 1 item, ponderado por raridade. Respeita peso 0 explicito
    (raridade fora do dict recebe peso 1). None se catalogo vazio."""
    pesos = pesos if pesos is not None else PESOS_RARIDADE
    itens = catalogo.listar()
    if tipos:
        itens = [it for it in itens if it.tipo in tipos]
    if not itens:
        return None
    por_raridade: Dict[str, List] = {}
    for it in itens:
        por_raridade.setdefault(it.raridade, []).append(it)
    raridades = list(por_raridade.keys())
    w = [pesos[r] if r in pesos else 1 for r in raridades]
    if sum(w) <= 0:
        w = [1] * len(raridades)
    escolhida = rng.choices(raridades, weights=w, k=1)[0]
    return rng.choice(por_raridade[escolhida])


def sortear_bau(catalogo, qtd_itens: int = 1, rng=_random,
                pesos: Optional[Dict[str, int]] = None,
                lunaris_min: int = LUNARIS_MIN, lunaris_max: int = LUNARIS_MAX, tipos=None) -> dict:
    itens = []
    for _ in range(max(1, qtd_itens)):
        it = sortear_item(catalogo, rng=rng, pesos=pesos, tipos=tipos)
        if it is not None:
            itens.append(it)
    return {"itens": itens, "lunaris": rng.randint(lunaris_min, lunaris_max)}
