"""
As 10 Árvores do Jardim — nome e cor oficiais, mesma fonte que
src/mundo/config/arvores.js usa pra cena 3D (RGB convertido pra hex aqui).

Usado pelo registro por Árvore (Passo 5 do Plano_Jornalista.md, Decisão 1):
puramente cosmético, "qual Árvore você é" — sem ligação com classe/ficha.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import List, Optional


@dataclass(frozen=True)
class Arvore:
    id: str
    nome: str
    cor: int  # hex, pronto pra discord.Colour(...)


ARVORES: List[Arvore] = [
    Arvore("aethel", "Gênese", 0xD6789C),
    Arvore("ousias", "Alétheia", 0xDEC658),
    Arvore("keryx", "A.X.I.S", 0x35D8EC),
    Arvore("haemus", "Anima", 0x56AC5C),
    Arvore("ignis", "Vórtice", 0xDE722A),
    Arvore("moros", "Baluarte", 0x745234),
    Arvore("aperion", "Matriz", 0x8454BC),
    Arvore("chronus", "Éon", 0xA88A48),
    Arvore("erebus", "Abismo", 0x221E28),
    Arvore("mulher-carmesim", "Limiar", 0x861C30),
]

_POR_ID = {a.id: a for a in ARVORES}


def obter(arvore_id: str) -> Optional[Arvore]:
    return _POR_ID.get(arvore_id)
