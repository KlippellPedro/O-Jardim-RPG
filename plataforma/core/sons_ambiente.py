"""Sons de ambiente da mesa (chuva, vento, fogueira, taverna...).

Os arquivos não moram aqui: tocam direto de um repositório público do GitHub pelo
jsDelivr (data/mapa/sons-ambiente-v1.json guarda o catálogo e o commit fixado). O
que o servidor guarda e repassa à mesa é só a lista de sons ligados e o volume de
cada um, e ele só aceita os ids do catálogo: um id inventado, ou uma URL, nunca
chega ao navegador de ninguém.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any


class ErroAmbiente(ValueError):
    """A lista de sons ligados que o Mestre mandou não vale."""


def _localizar_data_root() -> Path:
    app_root = Path(__file__).resolve().parent.parent
    local = app_root / "data"
    return local if local.exists() else app_root.parent / "data"


def _carregar() -> dict:
    caminho = _localizar_data_root() / "mapa" / "sons-ambiente-v1.json"
    return json.loads(caminho.read_text(encoding="utf-8"))


_DADOS = _carregar()
#: id -> volume sugerido de cada som do catálogo.
SONS: dict[str, float] = {som["id"]: float(som.get("volume", 0.6)) for som in _DADOS["sons"]}
MAX_CAMADAS: int = int(_DADOS["maximo_ao_mesmo_tempo"])
VOLUME_PADRAO = 0.6


def normalizar_camadas(dados: Any) -> list[dict]:
    """A lista de sons ligados conferida: só ids do catálogo, sem repetir, até MAX_CAMADAS, volume de 0 a 1."""

    if not isinstance(dados, list):
        raise ErroAmbiente("a lista de sons precisa ser uma lista")
    if len(dados) > MAX_CAMADAS:
        raise ErroAmbiente(f"a mesa toca no maximo {MAX_CAMADAS} sons ao mesmo tempo")
    camadas: list[dict] = []
    vistos: set[str] = set()
    for bruto in dados:
        if not isinstance(bruto, dict):
            raise ErroAmbiente("som invalido")
        som_id = bruto.get("id")
        if not isinstance(som_id, str) or som_id not in SONS:
            raise ErroAmbiente("som desconhecido")
        if som_id in vistos:
            raise ErroAmbiente("o mesmo som aparece duas vezes")
        vistos.add(som_id)
        volume = bruto.get("volume", SONS[som_id] or VOLUME_PADRAO)
        if isinstance(volume, bool) or not isinstance(volume, (int, float)) or volume != volume:
            raise ErroAmbiente("volume invalido")
        camadas.append({"id": som_id, "volume": round(max(0.0, min(1.0, float(volume))), 2)})
    return camadas


def ler_camadas(dados: Any) -> list[dict]:
    """O que está guardado no banco; um registro velho ou quebrado vira silêncio em vez de erro."""

    try:
        return normalizar_camadas(dados)
    except ErroAmbiente:
        return []
