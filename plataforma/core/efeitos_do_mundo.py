"""Efeitos do mundo na Loja do site.

A queda de uma lenda (core/lendas.py) pode deixar um ajuste de preço por alguns meses, guardado no estado do
calendário da campanha. Este módulo lê o que ainda vale e aplica o percentual ao preço de catálogo, com a mesma
conta na listagem e na compra: o preço que a mesa vê é o que ela paga.

Só entram os tipos sem variante de raridade (equipamento, veículo, artefato, consumível). Contratação de
criatura e as promoções em destaque seguem como são; o efeito vem depois da promoção.
"""

from __future__ import annotations

from typing import Any, Mapping

from core import calendario as regras_calendario
from core.economy_commands import CatalogPrice, normalize_catalog_filter


def ajustes_de_preco(connection, campanha_id) -> list[dict]:
    """Efeitos de preço que valem hoje na campanha (lista vazia quando não há nenhum)."""
    linha = connection.execute(
        "SELECT estado FROM campanha_calendario WHERE campanha_id=%s", (campanha_id,)
    ).fetchone()
    if not linha:
        return []
    return regras_calendario.efeitos_ativos(regras_calendario.completar(linha["estado"]), "preco")


def percentual_do_tipo(ajustes: list[dict], tipo: str) -> int:
    """Soma dos percentuais que valem para o tipo de item, limitada a -50% e +100%."""
    alvo = normalize_catalog_filter(tipo)
    total = sum(int(ajuste["percentual"]) for ajuste in ajustes if alvo in ajuste.get("alvos", []))
    return max(-50, min(100, total))


def preco_com_efeitos(price: CatalogPrice, tipo: str, ajustes: list[dict]) -> tuple[CatalogPrice, Mapping[str, Any] | None]:
    """O preço depois dos efeitos do mundo e o resumo que a tela mostra (None se nada mudou)."""
    percentual = percentual_do_tipo(ajustes, tipo)
    if not percentual:
        return price, None
    novo = max(1, round(price.valor * (1 + percentual / 100)))
    if novo == price.valor:
        return price, None
    textos = [ajuste.get("texto") for ajuste in ajustes if normalize_catalog_filter(tipo) in ajuste.get("alvos", []) and ajuste.get("texto")]
    return CatalogPrice(moeda=price.moeda, valor=novo), {"percentual": percentual, "texto": " ".join(textos)}
