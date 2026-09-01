from __future__ import annotations

from collections.abc import Mapping
from uuid import UUID


_PLAYER_CONFIG_KEYS = {
    "lore_revelado",
    "lore_oculto",
    "arvores_revelado",
    "arvores_oculto",
    "entidades_revelado",
    "entidades_oculto",
    "cronologia_geral_oculta",
    "registros_universais_ocultos",
    "cronica_secoes_ocultas",
    "cronica_eventos_ocultos",
    "locais_ocultos",
    "racas_liberadas",
    "classes_liberadas",
}


def visible_campaign_config(
    raw_config: Mapping | None,
    *,
    role: str,
    user_id: UUID,
) -> dict:
    """Recorta configurações privadas antes de enviá-las ao navegador.

    Mestre e assistente precisam do documento completo para administrar a mesa.
    Jogadores recebem apenas toggles usados pela própria UI e, nas liberações
    individuais, somente a entrada referente à própria conta.
    """
    config = dict(raw_config or {})
    if role in {"mestre", "assistente"}:
        return config

    visible = {key: config[key] for key in _PLAYER_CONFIG_KEYS if key in config}
    user_key = str(user_id)
    for key in ("racas_liberadas_membros", "classes_liberadas_membros"):
        member_map = config.get(key)
        own_values = member_map.get(user_key, []) if isinstance(member_map, Mapping) else []
        visible[key] = {user_key: own_values}
    return visible
