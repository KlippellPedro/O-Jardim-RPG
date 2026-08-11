"""Loot dos baús: logica PURA. rng injetavel. Preparado pra Estações."""

from __future__ import annotations

import random as _random
from datetime import datetime, timedelta
from typing import Dict, List, Optional

try:
    from zoneinfo import ZoneInfo
    TZ: Optional[object] = ZoneInfo("America/Sao_Paulo")
except Exception:
    TZ = None

PESOS_RARIDADE: Dict[str, int] = {
    "comum": 60,
    "incomum": 25,
    "raro": 10,
    "epico": 4,
    "lendario": 1,
    "reliquia": 1,
    "reliquia da criacao": 1,
}
LUNARIS_MIN, LUNARIS_MAX = 5, 40
CHANCE_BAU_ENIGMA = 0.25  # legado: bancos antigos ainda podem expor este valor

# O baú possui uma raridade própria, separada da raridade de cada item.
# Os pesos somam 1.000 para a distribuição ser legível sem floats. Estações
# especiais usam a segunda coluna e realmente tornam os baús altos mais comuns.
BAU_RARIDADES = {
    "comum": {
        "nome": "Baú Comum", "emoji": "🎁", "cor": 0x95A5A6,
        "peso": 550, "peso_especial": 160, "expira_minutos": 180,
        "dificuldade_enigma": None, "bonus_itens": 0, "lunaris_mult": 1.0,
        "pesos_itens": {"comum": 90, "incomum": 10},
    },
    "incomum": {
        "nome": "Baú Incomum", "emoji": "🌿", "cor": 0x2ECC71,
        "peso": 290, "peso_especial": 260, "expira_minutos": 120,
        "dificuldade_enigma": None, "bonus_itens": 0, "lunaris_mult": 1.25,
        "pesos_itens": {"comum": 25, "incomum": 65, "raro": 10},
    },
    "raro": {
        "nome": "Baú Raro", "emoji": "💎", "cor": 0x3498DB,
        "peso": 120, "peso_especial": 280, "expira_minutos": 90,
        "dificuldade_enigma": "facil", "bonus_itens": 0, "lunaris_mult": 1.75,
        "pesos_itens": {"incomum": 20, "raro": 65, "epico": 15},
    },
    "epico": {
        "nome": "Baú Épico", "emoji": "🔮", "cor": 0x9B59B6,
        "peso": 30, "peso_especial": 180, "expira_minutos": 60,
        "dificuldade_enigma": "medio", "bonus_itens": 1, "lunaris_mult": 2.5,
        "pesos_itens": {"raro": 20, "epico": 65, "lendario": 12, "reliquia": 3},
    },
    "lendario": {
        "nome": "Baú Lendário", "emoji": "👑", "cor": 0xF39C12,
        "peso": 8, "peso_especial": 90, "expira_minutos": 30,
        "dificuldade_enigma": "dificil", "bonus_itens": 1, "lunaris_mult": 4.0,
        "pesos_itens": {"epico": 20, "lendario": 65, "reliquia": 14, "reliquia da criacao": 1},
    },
    "mitico": {
        "nome": "Baú Mítico", "emoji": "🔥", "cor": 0xE74C3C,
        "peso": 2, "peso_especial": 30, "expira_minutos": 15,
        "dificuldade_enigma": "lendario", "bonus_itens": 3, "lunaris_mult": 8.0,
        "pesos_itens": {"lendario": 15, "reliquia": 70, "reliquia da criacao": 15},
    },
}
BAU_RARIDADE_ORDEM = tuple(BAU_RARIDADES)


def perfil_bau(raridade: str) -> dict:
    """Retorna uma cópia do perfil; ids desconhecidos caem no Comum."""
    return dict(BAU_RARIDADES.get(str(raridade), BAU_RARIDADES["comum"]))


def sortear_raridade_bau(rng=_random, *, evento_especial: bool = False) -> str:
    pesos = [
        BAU_RARIDADES[chave]["peso_especial" if evento_especial else "peso"]
        for chave in BAU_RARIDADE_ORDEM
    ]
    return rng.choices(BAU_RARIDADE_ORDEM, weights=pesos, k=1)[0]


def pesos_itens_do_bau(
    raridade: str, pesos_estacao: Optional[Dict[str, int]] = None
) -> Dict[str, int]:
    """Combina identidade do baú com a estação sem zerar tiers raros."""
    base = BAU_RARIDADES.get(raridade, BAU_RARIDADES["comum"])["pesos_itens"]
    estacao = pesos_estacao or {}
    return {
        item_raridade: int(peso) * max(1, int(estacao.get(item_raridade, 0)))
        for item_raridade, peso in base.items()
        if int(peso) > 0
    }


def parametros_premio_bau(
    raridade: str,
    itens_base: int,
    lunaris_min: int,
    lunaris_max: int,
) -> dict:
    perfil = BAU_RARIDADES.get(raridade, BAU_RARIDADES["comum"])
    multiplicador = float(perfil["lunaris_mult"])
    minimo = max(0, round(int(lunaris_min) * multiplicador))
    maximo = max(minimo, round(int(lunaris_max) * multiplicador))
    return {
        "qtd_itens": min(5, max(1, int(itens_base)) + int(perfil["bonus_itens"])),
        "lunaris_min": minimo,
        "lunaris_max": maximo,
        "expira_minutos": int(perfil["expira_minutos"]),
    }

# Só objetos que fazem sentido como achado físico vão automaticamente para o
# cofre. Monstros são contratos do bestiário e veículos/peças agora pertencem
# à página de Bens, não ao inventário. A lista explícita também impede que um
# tipo novo da loja passe a cair em baús sem uma decisão de balanceamento.
TIPOS_PERMITIDOS_BAU = frozenset({
    "arma",
    "armadura",
    "artefato",
    "consumivel",
    "drop",
    "equipamento",
    "fruto-eden",
    "implante",
    "modificacao",
})


def sortear_item(
    catalogo,
    rng=_random,
    pesos: Optional[Dict[str, int]] = None,
    tipos=None,
    excluir_ids=None,
):
    """Sorteia 1 item, ponderado por raridade.

    Um perfil de pesos explícito é autoritativo: raridades ausentes ou com
    peso zero não participam. Retorna None se não houver item elegível.
    """
    pesos = pesos if pesos is not None else PESOS_RARIDADE
    itens = [it for it in catalogo.listar() if it.tipo in TIPOS_PERMITIDOS_BAU]
    ids_bloqueados = set(excluir_ids or ())
    if ids_bloqueados:
        itens = [it for it in itens if it.id not in ids_bloqueados]
    if tipos:
        tipos_validos = TIPOS_PERMITIDOS_BAU.intersection(tipos)
        itens = [it for it in itens if it.tipo in tipos_validos]
    if not itens:
        return None
    por_raridade: Dict[str, List] = {}
    for it in itens:
        por_raridade.setdefault(it.raridade, []).append(it)
    raridades = [r for r in por_raridade if pesos.get(r, 0) > 0]
    if not raridades:
        return None
    w = [pesos[r] for r in raridades]
    escolhida = rng.choices(raridades, weights=w, k=1)[0]
    return rng.choice(por_raridade[escolhida])


def sortear_bau(catalogo, qtd_itens: int = 1, rng=_random,
                pesos: Optional[Dict[str, int]] = None,
                lunaris_min: int = LUNARIS_MIN, lunaris_max: int = LUNARIS_MAX, tipos=None) -> dict:
    itens = []
    ids_sorteados = set()
    for _ in range(max(1, qtd_itens)):
        it = sortear_item(
            catalogo,
            rng=rng,
            pesos=pesos,
            tipos=tipos,
            excluir_ids=ids_sorteados,
        )
        if it is not None:
            itens.append(it)
            ids_sorteados.add(it.id)
    return {"itens": itens, "lunaris": rng.randint(lunaris_min, lunaris_max)}


def agendar_proximo(min_hora: int, max_hora: int, rng=_random, agora: Optional[datetime] = None) -> datetime:
    if min_hora > max_hora:
        min_hora, max_hora = max_hora, min_hora
    min_hora = max(0, min(23, int(min_hora)))
    max_hora = max(0, min(23, int(max_hora)))
    if agora is None:
        agora = datetime.now(TZ) if TZ else datetime.now()
    cand = agora.replace(hour=rng.randint(min_hora, max_hora), minute=rng.randint(0, 59), second=0, microsecond=0)
    if cand <= agora:
        cand = cand + timedelta(days=1)
    return cand
