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
    "registros_universais_secoes_ocultas",
    "calendario_oculto",
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


_LISTAS_DE_LIBERACAO = (
    # (chave que cresce quando algo é liberado, chave que encolhe quando algo deixa de ser oculto, rótulo)
    ("lore_revelado", "lore_oculto", "lore"),
    ("arvores_revelado", "arvores_oculto", "arvores"),
    ("entidades_revelado", "entidades_oculto", "entidades"),
    ("racas_liberadas", None, "racas"),
    ("classes_liberadas", None, "classes"),
    (None, "registros_universais_secoes_ocultas", "secoes"),
)


def _como_conjunto(valor) -> set[str]:
    return {str(item) for item in valor} if isinstance(valor, (list, tuple, set)) else set()


def novas_liberacoes(antes: Mapping | None, depois: Mapping | None) -> dict[str, int]:
    """Quantos itens passaram a ser visíveis para os jogadores, por tipo.

    Conta só o que ficou MAIS aberto (revelado agora, ou tirado da lista de
    ocultos). Esconder de novo não avisa ninguém. Devolve apenas os tipos com
    novidade; o aviso diz "quantos", nunca "quais", para não estragar o mistério.
    """
    antes = antes or {}
    depois = depois or {}
    novidades: dict[str, int] = {}
    for chave_revelado, chave_oculto, rotulo in _LISTAS_DE_LIBERACAO:
        total = len(_como_conjunto(depois.get(chave_revelado)) - _como_conjunto(antes.get(chave_revelado))) if chave_revelado else 0
        if chave_oculto:
            total += len(_como_conjunto(antes.get(chave_oculto)) - _como_conjunto(depois.get(chave_oculto)))
        if total:
            novidades[rotulo] = total
    if antes.get("calendario_oculto") is True and depois.get("calendario_oculto") is not True:
        novidades["calendario"] = 1
    return novidades


_ROTULOS = {"lore": "registro de lore", "arvores": "Árvore", "entidades": "entidade", "racas": "raça", "classes": "classe", "secoes": "seção dos Registros Universais", "calendario": "calendário do mundo"}
_ROTULOS_PLURAL = {"lore": "registros de lore", "arvores": "Árvores", "entidades": "entidades", "racas": "raças", "classes": "classes", "secoes": "seções dos Registros Universais", "calendario": "calendário do mundo"}


def texto_das_liberacoes(novidades: dict[str, int]) -> str:
    partes = [
        f"{quantidade} {(_ROTULOS if quantidade == 1 else _ROTULOS_PLURAL)[rotulo]}"
        for rotulo, quantidade in novidades.items()
    ]
    if len(partes) > 1:
        return ", ".join(partes[:-1]) + " e " + partes[-1]
    return partes[0] if partes else ""
