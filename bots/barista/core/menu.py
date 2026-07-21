"""
Cardápio do Barista: bebidas compráveis via /menu, debitadas da carteira
(Lunaris) e narradas como um efeito de roleplay. Puro (sem discord.py).

O Barista não tem acesso à ficha do personagem — o "buff" é só uma frase
narrativa mostrada no pedido, pra mesa combinar o efeito com o mestre, não
um bônus mecânico que o bot aplica sozinho.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import List, Optional

MOEDA = "Lunaris"


@dataclass(frozen=True)
class ItemMenu:
    id: str
    nome: str
    preco: int
    descricao: str
    buff: str


# Preços/efeitos são um ponto de partida — fácil de ajustar aqui sem mexer
# em nenhum outro arquivo.
CARDAPIO: List[ItemMenu] = [
    ItemMenu(
        id="cafe_forte",
        nome="☕ Café",
        preco=10,
        descricao="Encorpado, do jeito que só o Barista sabe fazer.",
        buff="+1 narrativo no próximo teste de Vontade (combine com o mestre).",
    ),
    ItemMenu(
        id="cha_calmante",
        nome="🍵 Chá",
        preco=8,
        descricao="Ervas colhidas no Jardim, ainda quentes.",
        buff="Acalma os nervos — remove 1 de Estresse narrativo (combine com o mestre).",
    ),
    ItemMenu(
        id="suco_da_horta",
        nome="🥤 Suco",
        preco=6,
        descricao="Fruta fresca colhida hoje de manhã.",
        buff="Fôlego extra — +1 Vida temporária narrativa até o fim da cena (combine com o mestre).",
    ),
    ItemMenu(
        id="energetico_do_barista",
        nome="⚡ Energético",
        preco=15,
        descricao="Receita secreta. Não pergunte o que tem dentro.",
        buff="Foco total — remove desvantagem do próximo teste (combine com o mestre).",
    ),
]

_POR_ID = {item.id: item for item in CARDAPIO}


def obter(item_id: str) -> Optional[ItemMenu]:
    return _POR_ID.get(item_id)
