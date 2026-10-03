"""Fichas das Deidades no Bestiário da Sessão.

O arquivo data/bestiario/deidades-v1.json só o servidor lê, e só quem comanda a
mesa recebe: o campo Estado de cada ficha revela o que a mesa descobre pela
história (quem está presa, quem domina quem). O navegador nunca importa esse
arquivo; a fronteira de conteúdo (tools/browser-content-boundary.ts) o barra.
"""

from __future__ import annotations

import json
from functools import lru_cache

from core.progressao_niveis import xp_por_vd
from core.loot_criaturas import _localizar_data_root

PREFIXO = "deidade-"


@lru_cache(maxsize=1)
def _fichas() -> tuple[dict, ...]:
    caminho = _localizar_data_root() / "bestiario" / "deidades-v1.json"
    try:
        dados = json.loads(caminho.read_text(encoding="utf-8")).get("deidades", [])
    except (OSError, json.JSONDecodeError):
        return ()
    return tuple(ficha for ficha in dados if isinstance(ficha, dict) and str(ficha.get("id", "")).startswith(PREFIXO))


def eh_deidade(monstro_id: str | None) -> bool:
    return bool(monstro_id) and str(monstro_id).startswith(PREFIXO)


def para_o_bestiario() -> list[dict]:
    """As deidades no mesmo formato dos monstros de /sessao/bestiario."""
    lista = []
    for ficha in _fichas():
        vd = ficha.get("vd")
        lista.append(
            {
                "id": ficha["id"],
                "titulo": ficha["titulo"],
                "nivel": ficha.get("nivel"),
                "classe": "Deidade",
                "categoria": "Deidade",
                "descricao": ficha.get("descricao"),
                "vd": vd,
                "xp": xp_por_vd(vd),
                "familia": None,
                "estagio": None,
                "papel": "chefe",
                "unico": True,
                "tem_loot": False,
                "loot_ajustado": False,
                "pv": ficha.get("pv"),
                "defesa": ficha.get("defesa"),
                "mana": ficha.get("mana"),
                "estamina": ficha.get("estamina"),
                "iniciativa": ficha.get("iniciativa"),
                "ataques": ficha.get("ataques") or [],
                "pericias": ficha.get("pericias") or [],
                "habilidades": ficha.get("habilidades") or [],
                "deslocamento": ficha.get("deslocamento"),
                "atributos": ficha.get("atributos"),
                "raridade": "reliquia",
                "subtipo": ficha.get("fluxo"),
                "funcao": None,
            }
        )
    return lista
