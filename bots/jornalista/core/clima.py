"""
Núcleo de clima do Jornalista: clima mensal sorteado, restrito pela estação
atual (ver core/economia.py:ESTACOES). Puro (sem discord.py) — devolve o
clima sorteado pra quem chama decidir como mostrar.

Efeitos são só flavor narrativo (ver Plano_Jornalista.md) — o Jornalista não
tem acesso à ficha nem ao motor de rolagem, então não aplica bônus sozinho
em nenhum teste; cada efeito pressupõe "combine com o mestre".
"""

from __future__ import annotations

import random
from dataclasses import dataclass
from typing import List, Optional

PESO_COMUM = 10
PESO_RARO = 2

_NORMAIS = ["primavera", "verao", "outono", "inverno"]


@dataclass(frozen=True)
class ItemClima:
    id: str
    nome: str
    efeito: str
    estacoes: Optional[List[str]]  # None = qualquer estação
    peso: int = PESO_COMUM


CLIMAS: List[ItemClima] = [
    # Comuns — qualquer uma das 4 estações normais (não rolam em Noite
    # Eterna/Eclipse, que têm climas próprios mais marcantes).
    ItemClima(
        "ensolarado", "☀️ Ensolarado",
        "Nenhum efeito — dia comum de aventura.",
        estacoes=_NORMAIS,
    ),
    ItemClima(
        "nublado", "☁️ Nublado",
        "Nenhum efeito mecânico, só atmosfera.",
        estacoes=_NORMAIS,
    ),
    ItemClima(
        "chuva", "🌧️ Chuva",
        "Trilhas de barro atrapalham rastreamento, mas passos ficam abafados — "
        "vantagem ou desvantagem em Furtividade, dependendo da cena.",
        estacoes=_NORMAIS,
    ),
    ItemClima(
        "vento_forte", "💨 Vento Forte",
        "Desvantagem em ataques à distância — as flechas desviam.",
        estacoes=_NORMAIS,
    ),

    # Exclusivos de uma estação normal específica.
    ItemClima(
        "chuva_de_flores", "🌸 Chuva de Flores",
        "+1 narrativo em testes sociais/Carisma.",
        estacoes=["primavera"],
    ),
    ItemClima(
        "onda_de_calor", "🔥 Onda de Calor",
        "Desvantagem em Fortitude em esforços prolongados (marchas, trabalho pesado).",
        estacoes=["verao"],
    ),
    ItemClima(
        "ventania_de_folhas", "🍂 Ventania de Folhas",
        "Vantagem em Furtividade — o barulho das folhas cobre os passos.",
        estacoes=["outono"],
    ),
    ItemClima(
        "nevasca", "❄️ Nevasca",
        "Desvantagem em Percepção à distância; terreno difícil.",
        estacoes=["inverno"],
    ),

    # Exclusivos das estações especiais.
    ItemClima(
        "silencio_absoluto", "🌑 Silêncio Absoluto",
        "Vantagem em Furtividade, mas desvantagem em Percepção auditiva — dá pra "
        "se esconder, mas também não se ouve o perigo chegando.",
        estacoes=["noite_eterna"],
    ),
    ItemClima(
        "tempestade_arcana", "⚡ Tempestade Arcana",
        "Magos ganham +1 em testes de conjuração; arqueiros têm desvantagem por causa dos ventos.",
        estacoes=["eclipse"],
    ),

    # Raros — podem cair em qualquer estação, chance bem menor.
    ItemClima(
        "nevoa_maldita", "🌫️ Névoa Maldita",
        "Desvantagem em Percepção visual; gancho pro mestre encaixar um encontro inesperado.",
        estacoes=None, peso=PESO_RARO,
    ),
    ItemClima(
        "chuva_de_cinzas", "🩸 Chuva de Cinzas",
        "Só presságio — algo grande aconteceu em outro lugar do Jardim.",
        estacoes=None, peso=PESO_RARO,
    ),
    ItemClima(
        "estrelas_cadentes", "✨ Estrelas Cadentes",
        "+1 narrativo num teste à escolha do jogador nessa sessão (fez um pedido).",
        estacoes=None, peso=PESO_RARO,
    ),
]

_POR_ID = {c.id: c for c in CLIMAS}


def obter(clima_id: str) -> Optional[ItemClima]:
    return _POR_ID.get(clima_id)


def climas_permitidos(estacao_id: str) -> List[ItemClima]:
    return [c for c in CLIMAS if c.estacoes is None or estacao_id in c.estacoes]


def sortear_clima(estacao_id: str, rng: Optional[random.Random] = None) -> ItemClima:
    gerador = rng or random
    permitidos = climas_permitidos(estacao_id)
    pesos = [c.peso for c in permitidos]
    return gerador.choices(permitidos, weights=pesos, k=1)[0]
