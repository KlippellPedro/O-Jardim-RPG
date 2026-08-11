"""Tiers do Cofre bancário (capacidade de itens/moeda) e de Segurança
(resistência a roubo) do bot Banqueiro.

Carregados de data/economia/cofre_seguranca_tiers.json — a mesma fonte que
bots/banqueiro/core/economia.py lê. A plataforma e os bots viram ZIPs
separados na Discloud (sem um pacote Python compartilhado), mas os dois lados
agora leem o mesmo arquivo de dados em vez de manter duas tabelas Python
hardcoded sincronizadas à mão (ver docs/auditoria-integracao-sistema-2026-08.md,
achado 10).

Extraído de routers/vault.py pra não duplicar quando routers/internal.py
também precisou checar capacidade (depósito/transferência/reserva do cofre
unificado).
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


def _carregar_cofre_seguranca_tiers() -> dict:
    caminho = _localizar_data_root() / "economia" / "cofre_seguranca_tiers.json"
    return json.loads(caminho.read_text(encoding="utf-8"))


_TIERS_DATA = _carregar_cofre_seguranca_tiers()

COFRE_TIERS = _TIERS_DATA["cofre"]["tiers"]
COFRE_TIER_INICIAL = _TIERS_DATA["cofre"]["tier_inicial"]

SEGURANCA_TIERS = _TIERS_DATA["seguranca"]["tiers"]
SEGURANCA_TIER_INICIAL = _TIERS_DATA["seguranca"]["tier_inicial"]

# Espelho dos requisitos bancários do Banqueiro. A plataforma lê as mesmas
# linhas de cofre/cartão no PostgreSQL compartilhado, mas é distribuída em um
# ZIP separado; por isso o contrato precisa existir também aqui.
REPUTACAO_INICIAL = 1
REPUTACAO_POR_COFRE_TIER = _TIERS_DATA["reputacao_por_cofre_tier"]
REPUTACAO_POR_SEGURANCA_TIER = _TIERS_DATA["reputacao_por_seguranca_tier"]


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
