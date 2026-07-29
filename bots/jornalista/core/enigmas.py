"""Banco de enigmas dos Baús Trancados: perguntas curtas de lore do Jardim
ou contas simples. Lógica PURA (sem discord.py), fácil de testar isolada.
Resposta comparada sem acento/caixa/espaços extras, aceitando mais de uma
forma correta (ex.: "10" e "dez")."""

from __future__ import annotations

import random
import unicodedata
from dataclasses import dataclass
from typing import Optional, Tuple


def normalizar(texto: object) -> str:
    t = unicodedata.normalize("NFKD", str(texto))
    t = "".join(c for c in t if not unicodedata.combining(c))
    return " ".join(t.strip().lower().split())


@dataclass(frozen=True)
class Enigma:
    pergunta: str
    respostas: Tuple[str, ...]


ENIGMAS = (
    Enigma("Quantas Árvores existem no Jardim?", ("10", "dez")),
    Enigma("Some 7 e 8. Quanto dá?", ("15", "quinze")),
    Enigma("Qual é a moeda oficial do Jardim: Lunaris ou Solares?", ("lunaris",)),
    Enigma("Quem cuida da economia do Jardim: Banqueiro ou Jornalista?", ("banqueiro", "o banqueiro")),
    Enigma("Um baú lendário pesa 5. Quanto pesam dois baús lendários?", ("10", "dez")),
    # Verão: raro 7%, épico 1% · Inverno: raro 2%, sem épico/lendário (core/economia.py).
    Enigma("Qual estação normalmente traz mais loot raro: Verão ou Inverno?", ("verao",)),
    Enigma("Quantos segundos a vítima tem pra impedir um roubo no Banqueiro?", ("5", "cinco")),
    Enigma("Multiplique 6 por 4.", ("24", "vinte e quatro")),
    Enigma("Metade de 50 é quanto?", ("25", "vinte e cinco")),
    Enigma("Qual bot publica notícias e avisos do Jardim: Jornalista ou Banqueiro?", ("jornalista", "o jornalista")),
)


def sortear_enigma(rng: Optional[random.Random] = None) -> Enigma:
    gerador = rng or random
    return gerador.choice(ENIGMAS)


def checar_resposta(enigma: Enigma, resposta_usuario: str) -> bool:
    alvo = normalizar(resposta_usuario)
    return any(alvo == normalizar(certa) for certa in enigma.respostas)
