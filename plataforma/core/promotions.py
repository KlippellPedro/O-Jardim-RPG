"""Ofertas em destaque da Loja: rotação de 12 em 12 horas sem estado nem cron.

Cada item elegível recebe um placar hash(id + janela de 12h); quem cai
abaixo do corte de sorteio entra em promoção naquela janela. Como a janela
muda sozinha com o relógio e o cálculo é uma função pura de (item, janela),
o mesmo resultado sai tanto na listagem quanto na compra - o preço riscado
que o jogador vê é sempre o preço que ele paga, sem precisar gravar nada no
banco nem agendar um job pra trocar de volta depois.
"""

from __future__ import annotations

import hashlib
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Mapping

from .economy_commands import CatalogPrice, normalize_catalog_filter

PROMOTION_WINDOW_SECONDS = 12 * 60 * 60

# ~3 ofertas por janela. A base é o tamanho do POOL ELEGÍVEL (tipos abaixo),
# não o catálogo inteiro - hoje ~320 dos 469 itens passam no filtro de tipo e
# raridade. Se o pool crescer ou encolher muito, ajuste aqui.
_PROMOTION_CHANCE = 3 / 320
_SCORE_SPACE = 1 << 32
_PROMOTION_THRESHOLD = int(_PROMOTION_CHANCE * _SCORE_SPACE)

PROMOTION_DISCOUNTS = (10, 15, 20, 25, 30)

# Mítico e Relíquia da Criação vivem na economia congelada (ver
# data/economia/escala-precos-v1.json); Fruto do Éden, monstro, drop e
# propriedade não fazem sentido como "oferta relâmpago" de vitrine.
_ELIGIBLE_TYPES = frozenset({
    "arma", "armadura", "equipamento", "modificacao", "consumivel",
    "veiculo", "veiculo-completo", "artefato",
})
_EXCLUDED_RARITIES = frozenset({"mitico", "mitica", "reliquia", "reliquia da criacao"})

_ROTULO_POR_NIVEL_LOJA = {
    1: "Oferta da Feira",
    2: "Promoção da Metrópole",
    3: "Oferta do Mercado Negro",
    4: "Liquidação do Banco Lunar",
}


@dataclass(frozen=True)
class Promotion:
    discount_percent: int
    label: str


def promotion_window_id(now: datetime | None = None) -> int:
    """Janela de 12h corrente. Incrementa sozinha com o relógio, sem estado."""

    moment = now or datetime.now(timezone.utc)
    return int(moment.timestamp() // PROMOTION_WINDOW_SECONDS)


def _score(key: str, window_id: int) -> int:
    """Placar estável entre processos (sha256, não o hash() salgado do Python)."""

    digest = hashlib.sha256(f"{key}:{window_id}".encode("utf-8")).hexdigest()
    return int(digest[:8], 16)


def is_eligible_for_promotion(tipo: str, raridade: object) -> bool:
    return (
        normalize_catalog_filter(tipo) in _ELIGIBLE_TYPES
        and normalize_catalog_filter(raridade) not in _EXCLUDED_RARITIES
    )


def resolve_promotion(
    item_id: str,
    tipo: str,
    content: Mapping[str, Any],
    price: CatalogPrice,
    shop_level: int,
    *,
    now: datetime | None = None,
) -> tuple[CatalogPrice, Promotion] | None:
    """Promoção ativa deste item nesta janela, se houver.

    Função pura de (item_id, janela): checar um item não exige carregar o
    resto do catálogo, então a compra reavalia sozinha e chega no mesmo
    resultado que a listagem mostrou.
    """

    if not is_eligible_for_promotion(tipo, content.get("raridade")):
        return None
    window_id = promotion_window_id(now)
    if _score(item_id, window_id) >= _PROMOTION_THRESHOLD:
        return None

    discount_percent = PROMOTION_DISCOUNTS[
        _score(f"desconto:{item_id}", window_id) % len(PROMOTION_DISCOUNTS)
    ]
    discounted_value = max(1, round(price.valor * (1 - discount_percent / 100)))
    if discounted_value >= price.valor:
        # Preço baixo demais pro desconto virar número diferente - sem
        # promoção falsa anunciando corte que não muda o que se paga.
        return None

    label = _ROTULO_POR_NIVEL_LOJA.get(shop_level, "Oferta em destaque")
    discounted_price = CatalogPrice(moeda=price.moeda, valor=discounted_value)
    return discounted_price, Promotion(discount_percent=discount_percent, label=label)
