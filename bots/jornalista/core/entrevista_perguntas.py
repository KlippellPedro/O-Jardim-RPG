"""Banco de perguntas do quadro 'Entrevista Exclusiva' do Jornalista."""

from __future__ import annotations

import random
from typing import Optional

PERGUNTAS = (
    "Qual foi o monstro mais difícil que seu grupo já enfrentou?",
    "Se pudesse escolher outra Árvore pro seu personagem, qual seria e por quê?",
    "Qual foi a decisão mais arriscada que seu personagem já tomou numa sessão?",
    "Tem algum NPC do Jardim que você adoraria ver de novo?",
    "Qual item ou baú foi o melhor achado da sua jornada até agora?",
    "O que você mais gosta na sua Árvore?",
    "Se seu personagem pudesse mandar um recado pro Jardim inteiro, o que diria?",
    "Qual foi o momento mais engraçado de uma sessão recente?",
)


def sortear_pergunta(rng: Optional[random.Random] = None) -> str:
    gerador = rng or random
    return gerador.choice(PERGUNTAS)
