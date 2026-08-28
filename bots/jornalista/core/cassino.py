"""Constantes puras da Corrida das Arvores.

Duplicadas no ZIP do Banqueiro de proposito: os bots sao deployados como
aplicacoes separadas e nao importam codigo um do outro em producao.
"""

from __future__ import annotations

import secrets


CORREDORES_ASTRAIS = {
    # As chaves legadas precisam continuar iguais as usadas nas apostas abertas.
    "raposa": {"nome": "Estandarte de Gênese", "emoji": "🌱", "peso": 25},
    "cervo": {"nome": "Estandarte de Éon", "emoji": "⌛", "peso": 25},
    "serpente": {"nome": "Estandarte de Matriz", "emoji": "🌀", "peso": 25},
    "golem": {"nome": "Estandarte de Vórtice", "emoji": "🔥", "peso": 25},
}
CORRIDA_CORTE_BP = 0


def sortear_corredor(rng=None) -> str:
    gerador = rng or secrets.SystemRandom()
    total = sum(info["peso"] for info in CORREDORES_ASTRAIS.values())
    ponto = gerador.randrange(total)
    acumulado = 0
    for chave, info in CORREDORES_ASTRAIS.items():
        acumulado += info["peso"]
        if ponto < acumulado:
            return chave
    raise RuntimeError("nao foi possivel sortear o corredor")
