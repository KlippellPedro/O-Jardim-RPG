from __future__ import annotations

import unicodedata
from typing import Any


def _normalize(value: Any) -> str:
    text = unicodedata.normalize("NFD", str(value or ""))
    return "".join(char for char in text if unicodedata.category(char) != "Mn").strip().casefold()


def special_item_use_limit(total_level: Any) -> int:
    """One initial slot, then one slot for every four total levels."""

    try:
        level = int(total_level)
    except (TypeError, ValueError):
        level = 1
    return max(1, max(1, level) // 4)


def special_item_group(item: dict[str, Any] | None) -> str | None:
    if not isinstance(item, dict):
        return None
    data = item.get("dados") if isinstance(item.get("dados"), dict) else item
    declared = _normalize(data.get("grupo_limite_uso"))
    if declared in {"item-pericia", "artefato"}:
        return declared
    if _normalize(data.get("tipo")) == "artefato":
        return "artefato"

    item_id = _normalize(data.get("catalogo_item_id") or item.get("item_id") or item.get("id"))
    if item_id == "acessorio" or item_id.startswith("acessorio-"):
        return "item-pericia"

    effects: list[Any] = []
    rarity_effects = data.get("efeitosRaridade")
    if isinstance(rarity_effects, list):
        effects.extend(rarity_effects)
    modifications = data.get("modificacoes")
    if isinstance(modifications, list):
        for modification in modifications:
            if isinstance(modification, dict) and isinstance(modification.get("efeitos"), list):
                effects.extend(modification["efeitos"])
    if _normalize(data.get("categoria")) == "geral" and any(
        isinstance(effect, dict) and _normalize(effect.get("categoria")) == "pericia"
        for effect in effects
    ):
        return "item-pericia"
    return None


def equipped_special_item_count(inventory: Any) -> int:
    if not isinstance(inventory, (list, tuple)):
        return 0
    total = 0
    for item in inventory:
        if not isinstance(item, dict):
            continue
        data = item.get("dados") if isinstance(item.get("dados"), dict) else {}
        quantity = item.get("quantidade", 1)
        try:
            available = int(quantity) > 0
        except (TypeError, ValueError):
            available = True
        if available and data.get("equipado") is True and special_item_group(item):
            total += 1
    return total


RARITY_MODIFICATION_LIMITS = {
    "comum": 1,
    "incomum": 2,
    "raro": 3,
    "epico": 4,
    "lendario": 5,
    "reliquia": 6,
    "mitico": 6,
    "reliquia da criacao": 7,
}


def modification_limit_for_rarity(rarity: Any) -> int:
    return RARITY_MODIFICATION_LIMITS.get(_normalize(rarity), 1)
