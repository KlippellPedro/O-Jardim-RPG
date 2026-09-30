"""Maestria de classe (níveis 21 a 50 de uma classe).

Lida de data/ficha/maestria-classe.json, o mesmo arquivo que o frontend lê em
src/services/maestriaClasse.ts. Igual para todas as classes: a cada 5 níveis, ou
um reforço de recursos (que o site calcula) ou um grau de perícia (que o
servidor confere no orçamento de Graus de Treinamento).
"""

from __future__ import annotations

import json
import math
from pathlib import Path


def _localizar_data_root() -> Path:
    """Mesma resolução de plataforma/main.py::_DATA_ROOT: `data/` empacotado
    ao lado da plataforma no ZIP de deploy, ou `data/` na raiz do repositório
    em desenvolvimento."""
    app_root = Path(__file__).resolve().parent.parent
    local = app_root / "data"
    return local if local.exists() else app_root.parent / "data"


def _carregar() -> dict:
    caminho = _localizar_data_root() / "ficha" / "maestria-classe.json"
    return json.loads(caminho.read_text(encoding="utf-8"))


MARCOS_MAESTRIA: tuple[dict, ...] = tuple(
    sorted(_carregar()["marcos"], key=lambda marco: marco["nivel"])
)


def _nivel_inteiro(nivel: object) -> int:
    try:
        return max(0, math.trunc(float(nivel)))  # type: ignore[arg-type]
    except (TypeError, ValueError, OverflowError):
        return 0


def graus_de_maestria(nivel_classe: object) -> int:
    """Graus de perícia que a Maestria da classe já entregou naquele nível."""
    alvo = _nivel_inteiro(nivel_classe)
    return sum(
        max(1, _nivel_inteiro(marco.get("quantidade")) or 1)
        for marco in MARCOS_MAESTRIA
        if marco["tipo"] == "grau_pericia" and marco["nivel"] <= alvo
    )


def niveis_de_reforco_de_recursos(nivel_classe: object) -> int:
    """Níveis 'de brinde' em Vida, Mana e Estamina dos reforços de recursos."""
    alvo = _nivel_inteiro(nivel_classe)
    return sum(
        _nivel_inteiro(marco.get("niveis_equivalentes"))
        for marco in MARCOS_MAESTRIA
        if marco["tipo"] == "bonus_recursos" and marco["nivel"] <= alvo
    )
