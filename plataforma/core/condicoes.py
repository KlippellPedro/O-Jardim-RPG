"""Condições de combate com duração opcional em turnos.

Retrocompatível: aceita o formato antigo (lista de strings, sem duração) e o
novo (lista de ``{"nome", "turnos"}``), e sempre devolve o novo. ``turnos`` é
um inteiro positivo (rodadas restantes) ou ``None`` para condição permanente —
o que preserva o comportamento das condições que já estavam salvas.
"""

from __future__ import annotations

from typing import Any

LIMITE_CONDICOES = 20
LIMITE_NOME = 40
LIMITE_TURNOS = 999


def _turnos_validos(valor: Any) -> int | None:
    if isinstance(valor, bool):
        return None
    if isinstance(valor, (int, float)):
        n = int(valor)
        if n > 0:
            return min(n, LIMITE_TURNOS)
    return None


def normalizar_condicoes(valor: Any) -> list[dict]:
    """Devolve ``[{"nome": str, "turnos": int|None}]`` sem duplicatas (por nome)."""
    if not valor:
        return []
    saida: list[dict] = []
    vistos: set[str] = set()
    for item in valor:
        if isinstance(item, str):
            nome, turnos = item.strip(), None
        elif isinstance(item, dict):
            nome = str(item.get("nome", "")).strip()
            turnos = _turnos_validos(item.get("turnos"))
        else:
            continue
        chave = nome.lower()
        if not nome or chave in vistos:
            continue
        vistos.add(chave)
        saida.append({"nome": nome[:LIMITE_NOME], "turnos": turnos})
        if len(saida) >= LIMITE_CONDICOES:
            break
    return saida


def decrementar_condicoes(valor: Any) -> list[dict]:
    """Passa uma rodada: tira 1 de cada duração e remove as que zeraram.

    Condições permanentes (``turnos is None``) ficam. Usado quando o combate
    vira para uma nova rodada.
    """
    restantes = []
    for cond in normalizar_condicoes(valor):
        turnos = cond["turnos"]
        if turnos is None:
            restantes.append(cond)
            continue
        if turnos - 1 > 0:
            restantes.append({"nome": cond["nome"], "turnos": turnos - 1})
    return restantes
