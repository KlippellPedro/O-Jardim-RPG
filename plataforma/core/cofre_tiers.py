"""Tiers do Cofre bancário (capacidade de itens/moeda) e de Segurança
(resistência a roubo) do bot Banqueiro.

Espelho de bots/banqueiro/core/economia.py (COFRE_TIERS / SEGURANCA_TIERS). A
plataforma e os bots viram ZIPs separados na Discloud — sem um pacote Python
compartilhado, não dá pra importar direto do bot. Se os tiers do Banqueiro
mudarem, atualize aqui também.

Extraído de routers/vault.py pra não duplicar quando routers/internal.py
também precisou checar capacidade (depósito/transferência/reserva do cofre
unificado).
"""

from __future__ import annotations

COFRE_TIERS = [
    {"id": "comum", "nome": "Cofre Comum", "capacidade": 10, "capacidade_moeda": 500, "custo": 100},
    {"id": "prata", "nome": "Cofre de Prata", "capacidade": 20, "capacidade_moeda": 1500, "custo": 250},
    {"id": "dourado", "nome": "Cofre Dourado", "capacidade": 40, "capacidade_moeda": 5000, "custo": 500},
    {"id": "arcano", "nome": "Cofre Arcano", "capacidade": 60, "capacidade_moeda": 15000, "custo": 800},
    {"id": "eterno", "nome": "Cofre Eterno", "capacidade": 200, "capacidade_moeda": 50000, "custo": 2000},
]
COFRE_TIER_INICIAL = "comum"

SEGURANCA_TIERS = [
    {"id": "basica", "nome": "Segurança Básica", "defesa": 0.50, "custo": 0},
    {"id": "fechadura", "nome": "Fechadura Reforçada", "defesa": 0.70, "custo": 150},
    {"id": "cofre-forte", "nome": "Cofre-Forte", "defesa": 0.80, "custo": 350},
    {"id": "blindado", "nome": "Blindagem Arcana", "defesa": 0.88, "custo": 700},
    {"id": "maximo", "nome": "Segurança Máxima", "defesa": 0.94, "custo": 1400},
]
SEGURANCA_TIER_INICIAL = "basica"


def tier_info(tiers: list[dict], tier_id: str, inicial: str) -> dict:
    for tier in tiers:
        if tier["id"] == tier_id:
            return tier
    for tier in tiers:
        if tier["id"] == inicial:
            return tier
    return tiers[0]


def proximo_tier(tiers: list[dict], tier_id: str, inicial: str) -> dict | None:
    ids = [t["id"] for t in tiers]
    alvo = tier_id if tier_id in ids else inicial
    indice = ids.index(alvo)
    if indice + 1 >= len(tiers):
        return None
    return tiers[indice + 1]


def capacidade_de_itens(tier_id: str) -> int:
    """Quantos itens o cofre desse tier aguenta — usado pela checagem de
    capacidade do cofre unificado (routers/internal.py)."""
    return tier_info(COFRE_TIERS, tier_id, COFRE_TIER_INICIAL)["capacidade"]
