"""Eventos recorrentes do Banco Lunar: Leilão do Jardim (sábado à noite) e Dia de
Bolsa (quarta ao meio-dia). Lógica PURA: o relógio e o rng entram por parâmetro.

A semana é a ISO em São Paulo. A chave da semana ("2026-W41") serve de trava:
cada evento acontece no máximo uma vez por semana e por servidor, mesmo que o bot
reinicie ou fique fora do ar na hora marcada (a janela dura até o dia seguinte, para
o evento ser recuperado)."""

from __future__ import annotations

import math
import random as _random
from datetime import datetime
from typing import Dict, Optional
from zoneinfo import ZoneInfo

from . import economia as _economia

FUSO = ZoneInfo("America/Sao_Paulo")

# ── Leilão do Jardim ─────────────────────────────────────────────────────────
LEILAO_DURACAO_HORAS = 24
LEILAO_VENDEDOR = "jardim"       # a casa vende; nenhum jogador recebe o dinheiro
LEILAO_MODO_POSSE = "casa"
LEILAO_LANCE_FRACAO = 0.25       # lance inicial: 25% do preço de balcão
LEILAO_LANCE_MINIMO = 50
# Preço de balcão máximo (em Lunaris) de um item do leilão semanal: acima disso o lance inicial
# (25%) passaria de ☾ 600, o que a mesa dificilmente junta, e a semana viraria um leilão vazio.
LEILAO_PRECO_MAXIMO = 2400
LEILAO_TIPOS = frozenset({"arma", "armadura", "equipamento", "artefato", "consumivel", "implante", "modificacao"})
# Chances por raridade: o leilão semanal é o lugar de achar algo bom sem depender da sorte do baú.
LEILAO_PESOS: Dict[str, int] = {"raro": 55, "epico": 30, "lendario": 12, "mitico": 3}

# ── Dia de Bolsa ─────────────────────────────────────────────────────────────
BOLSA_DURACAO_HORAS = 24
HUMORES_BOLSA: Dict[str, Dict[str, object]] = {
    "bolsa_alta": {
        "peso": 40, "emoji": "📈", "titulo": "Bolsa em alta",
        "texto": "Os Títulos do Jardim que vencerem hoje têm 90% de chance de render (o normal é 70%).",
    },
    "bolsa_baixa": {
        "peso": 25, "emoji": "📉", "titulo": "Bolsa em baixa",
        "texto": "Os Títulos do Jardim que vencerem hoje têm só 50% de chance de render. Quem esperar pode se queimar.",
    },
    "cambio_livre": {
        "peso": 35, "emoji": "💱", "titulo": "Câmbio livre",
        "texto": "O Banco Lunar não cobra taxa de conversão entre Lunaris e Solares durante o dia.",
    },
}
CHANCE_BOLSA: Dict[str, float] = {"bolsa_alta": 0.90, "bolsa_baixa": 0.50}

AUTOMACAO_LEILAO = "leilao_semanal"
AUTOMACAO_BOLSA = "dia_de_bolsa"


def _em_sp(agora: datetime) -> datetime:
    return agora.astimezone(FUSO)


def semana_chave(agora: datetime) -> str:
    ano, semana, _ = _em_sp(agora).isocalendar()
    return f"{ano}-W{semana:02d}"


def janela_leilao(agora: datetime) -> bool:
    """Sábado a partir das 18h, até o fim do domingo."""
    local = _em_sp(agora)
    return (local.weekday() == 5 and local.hour >= 18) or local.weekday() == 6


def janela_bolsa(agora: datetime) -> bool:
    """Quarta a partir do meio-dia, até a manhã de quinta."""
    local = _em_sp(agora)
    return (local.weekday() == 2 and local.hour >= 12) or (local.weekday() == 3 and local.hour < 12)


def sortear_humor_bolsa(rng=_random) -> str:
    chaves = list(HUMORES_BOLSA)
    return rng.choices(chaves, weights=[int(HUMORES_BOLSA[c]["peso"]) for c in chaves], k=1)[0]


def chance_ganho_com_bolsa(humor: Optional[str], padrao: float) -> float:
    """Chance de um Título render. Fora de um humor de Bolsa, vale o padrão."""
    return CHANCE_BOLSA.get(humor or "", padrao)


def taxa_com_cambio_livre(taxa: float, humor: Optional[str]) -> float:
    return 0.0 if humor == "cambio_livre" else taxa


def preco_em_lunaris(item) -> Optional[int]:
    """Preço de balcão do item em Lunaris, só quando o catálogo o escreve em Lunaris ou Solares.
    Itens pagos em Créditos Sombrios ou Fragmentos de Estrela devolvem None: essas moedas não se
    compram com Lunaris, e o leilão da casa cobra Lunaris."""
    lunaris = _economia.resolver_preco(item.preco, "Lunaris")
    if lunaris is not None:
        return lunaris
    solares = _economia.resolver_preco(item.preco, "Solares")
    if solares is not None:
        return solares * _economia.CAMBIO_RATE_PADRAO
    return None


def escolher_item_leilao(catalogo, rng=_random):
    """Item do catálogo para o leilão da casa, ponderado por raridade. None se
    não houver item elegível. Fora daqui ficam monstros, bens, veículos, drops,
    Frutos do Éden, Relíquias da Criação, itens pagos em outras moedas e itens caros demais."""
    por_raridade: Dict[str, list] = {}
    for item in catalogo.listar():
        if item.tipo not in LEILAO_TIPOS or not item.disponivel_na_loja:
            continue
        if item.raridade not in LEILAO_PESOS:
            continue
        preco = preco_em_lunaris(item)
        if preco is None or preco <= 0 or preco > LEILAO_PRECO_MAXIMO:
            continue
        por_raridade.setdefault(item.raridade, []).append(item)
    raridades = list(por_raridade)
    if not raridades:
        return None
    escolhida = rng.choices(raridades, weights=[LEILAO_PESOS[r] for r in raridades], k=1)[0]
    return rng.choice(por_raridade[escolhida])


def lance_inicial(preco_lunaris: Optional[int]) -> int:
    """25% do preço de balcão, com piso. Sem preço conhecido, vale o piso."""
    if not preco_lunaris or preco_lunaris <= 0:
        return LEILAO_LANCE_MINIMO
    return max(LEILAO_LANCE_MINIMO, int(math.floor(preco_lunaris * LEILAO_LANCE_FRACAO)))
