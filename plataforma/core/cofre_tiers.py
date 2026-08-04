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

import math

COFRE_TIERS = [
    {"id": "comum", "nome": "Cofre Comum", "capacidade": 10, "capacidade_moeda": 500, "custos": {"Lunaris": 100}},
    {"id": "cobre", "nome": "Cofre de Cobre", "capacidade": 15, "capacidade_moeda": 900, "custos": {"Lunaris": 150}},
    {"id": "prata", "nome": "Cofre de Prata", "capacidade": 20, "capacidade_moeda": 1500, "custos": {"Lunaris": 250}},
    {"id": "aco", "nome": "Cofre de Aço", "capacidade": 30, "capacidade_moeda": 2800, "custos": {"Lunaris": 375}},
    {"id": "dourado", "nome": "Cofre Dourado", "capacidade": 40, "capacidade_moeda": 5000, "custos": {"Lunaris": 500}},
    {"id": "obsidiana", "nome": "Cofre de Obsidiana", "capacidade": 50, "capacidade_moeda": 9000, "custos": {"Lunaris": 350, "Solares": 30}},
    {"id": "arcano", "nome": "Cofre Arcano", "capacidade": 60, "capacidade_moeda": 15000, "custos": {"Lunaris": 400, "Solares": 40}},
    {"id": "runico", "nome": "Cofre Rúnico", "capacidade": 80, "capacidade_moeda": 30000, "custos": {"Lunaris": 600, "Solares": 60}},
    {"id": "eterno", "nome": "Cofre Eterno", "capacidade": 200, "capacidade_moeda": 50000, "custos": {"Lunaris": 1000, "Solares": 100}},
    {"id": "astral", "nome": "Cofre Astral", "capacidade": 300, "capacidade_moeda": 100000, "custos": {"Solares": 200, "Fragmentos de Estrela": 5}},
    {"id": "lunar", "nome": "Cofre Lunar", "capacidade": 500, "capacidade_moeda": 250000, "custos": {"Solares": 300, "Fragmentos de Estrela": 10}},
    {"id": "soberano", "nome": "Cofre Soberano", "capacidade": 800, "capacidade_moeda": 750000, "custos": {"Solares": 450, "Fragmentos de Estrela": 20}},
    {"id": "dimensional", "nome": "Cofre Dimensional", "capacidade": 1200, "capacidade_moeda": 2000000, "custos": {"Solares": 500, "Fragmentos de Estrela": 30, "Créditos Sombrios": 500}},
    {"id": "paradoxal", "nome": "Cofre Paradoxal", "capacidade": 2500, "capacidade_moeda": 10000000, "custos": {"Solares": 750, "Fragmentos de Estrela": 50, "Créditos Sombrios": 1500}},
    {"id": "sem-fim", "nome": "Cofre Sem-Fim", "capacidade": 1000000, "capacidade_moeda": 9000000000000, "custos": {"Lunaris": 5000, "Solares": 1000, "Fragmentos de Estrela": 100, "Créditos Sombrios": 3000}, "limite_pratico": True},
]
COFRE_TIER_INICIAL = "comum"

SEGURANCA_TIERS = [
    {"id": "basica", "nome": "Segurança Básica", "defesa": 0.50, "custos": {}},
    {"id": "tranca-dupla", "nome": "Tranca Dupla", "defesa": 0.58, "custos": {"Lunaris": 75}},
    {"id": "alarme", "nome": "Alarme Mecânico", "defesa": 0.64, "custos": {"Lunaris": 110}},
    {"id": "fechadura", "nome": "Fechadura Reforçada", "defesa": 0.70, "custos": {"Lunaris": 150}},
    {"id": "runas", "nome": "Runas de Vigilância", "defesa": 0.74, "custos": {"Lunaris": 220}},
    {"id": "sentinela", "nome": "Sentinela Lunar", "defesa": 0.77, "custos": {"Lunaris": 140, "Solares": 14}},
    {"id": "cofre-forte", "nome": "Cofre-Forte", "defesa": 0.80, "custos": {"Lunaris": 180, "Solares": 17}},
    {"id": "selos", "nome": "Selos Antiviolação", "defesa": 0.83, "custos": {"Lunaris": 235, "Solares": 24}},
    {"id": "barreira", "nome": "Barreira Etérea", "defesa": 0.86, "custos": {"Lunaris": 300, "Solares": 30}},
    {"id": "blindado", "nome": "Blindagem Arcana", "defesa": 0.88, "custos": {"Solares": 50, "Fragmentos de Estrela": 3}},
    {"id": "labirinto", "nome": "Labirinto Dimensional", "defesa": 0.90, "custos": {"Solares": 60, "Fragmentos de Estrela": 5}},
    {"id": "guardiao", "nome": "Guardião Astral", "defesa": 0.92, "custos": {"Solares": 70, "Fragmentos de Estrela": 8}},
    {"id": "maximo", "nome": "Segurança Máxima", "defesa": 0.94, "custos": {"Solares": 70, "Fragmentos de Estrela": 12, "Créditos Sombrios": 200}},
    {"id": "soberana", "nome": "Proteção Soberana", "defesa": 0.97, "custos": {"Solares": 100, "Fragmentos de Estrela": 20, "Créditos Sombrios": 600}},
    {"id": "absoluta", "nome": "Proteção Absoluta", "defesa": 0.99, "custos": {"Lunaris": 500, "Solares": 150, "Fragmentos de Estrela": 40, "Créditos Sombrios": 1500}},
]
SEGURANCA_TIER_INICIAL = "basica"

# Espelho dos requisitos bancários do Banqueiro. A plataforma lê as mesmas
# linhas de cofre/cartão no PostgreSQL compartilhado, mas é distribuída em um
# ZIP separado; por isso o contrato precisa existir também aqui.
REPUTACAO_INICIAL = 1
REPUTACAO_POR_COFRE_TIER = {
    "comum": 0, "cobre": 0, "prata": 50, "aco": 100, "dourado": 150,
    "obsidiana": 200, "arcano": 250, "runico": 300, "eterno": 350,
    "astral": 450, "lunar": 550, "soberano": 650, "dimensional": 800,
    "paradoxal": 1000, "sem-fim": 1250,
}
REPUTACAO_POR_SEGURANCA_TIER = {
    "basica": 0, "tranca-dupla": 0, "alarme": 50, "fechadura": 100,
    "runas": 150, "sentinela": 200, "cofre-forte": 250, "selos": 300,
    "barreira": 350, "blindado": 450, "labirinto": 550, "guardiao": 650,
    "maximo": 800, "soberana": 1000, "absoluta": 1250,
}


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


def posicao_tier(tiers: list[dict], tier_id: str, inicial: str) -> int:
    """Posição humana (começando em 1), com fallback seguro ao nível inicial."""
    ids = [t["id"] for t in tiers]
    alvo = tier_id if tier_id in ids else inicial
    return ids.index(alvo) + 1


def desconto_por_reputacao(reputacao: int) -> float:
    """Espelho do desconto bancário aplicado pelo Banqueiro."""
    pontos = int(reputacao)
    return 0.05 if 101 <= pontos <= 300 else 0.0


def custos_upgrade(tier: dict, reputacao: int) -> dict[str, int]:
    """Custo final; materiais raros não recebem desconto bancário."""
    desconto = desconto_por_reputacao(reputacao)
    resultado: dict[str, int] = {}
    for moeda, valor_bruto in (tier.get("custos") or {}).items():
        valor = int(valor_bruto)
        if valor <= 0:
            continue
        if moeda in {"Lunaris", "Solares"}:
            valor = max(1, math.ceil(valor * (1 - desconto)))
        resultado[str(moeda)] = valor
    return resultado


def tier_com_reputacao(
    tier: dict | None,
    requisitos: dict[str, int],
    reputacao: int | None = None,
) -> dict | None:
    if tier is None:
        return None
    resultado = dict(tier)
    resultado["reputacao_exigida"] = int(requisitos.get(tier["id"], 0))
    resultado["custos_base"] = dict(tier.get("custos") or {})
    if reputacao is not None:
        resultado["custos"] = custos_upgrade(tier, reputacao)
    return resultado


def capacidade_de_itens(tier_id: str) -> int:
    """Quantos itens o cofre desse tier aguenta — usado pela checagem de
    capacidade do cofre unificado (routers/internal.py)."""
    return tier_info(COFRE_TIERS, tier_id, COFRE_TIER_INICIAL)["capacidade"]
