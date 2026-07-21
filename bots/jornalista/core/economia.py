"""
O Jardim RPG — Jornalista
Fatia PURA de economia que o Jornalista precisa pra entregar loot: sem
Discord, sem banco de dados, sem I/O.

O restante da economia (câmbio, Cartão Lunar, baús compráveis, roubo) mora
só no Banqueiro — o Jornalista não mexe em nada disso, só entrega prêmio de
baú achado no mundo.

Convenção de nomes de moeda: comparações ignoram acento e caixa, igual ao
site (src/loja/services/moedasService.js) — "Solares" == "SOLARES" == "solares".
"""

from __future__ import annotations

import unicodedata
from typing import Dict, List, Optional

NOME_BOT = "Jornalista"

# Saldo inicial da carteira de um jogador novo (mesmo valor do Banqueiro —
# só é usado aqui se o Jornalista for o primeiro bot a ver esse jogador).
SALDO_INICIAL: Dict[str, int] = {"Lunaris": 20, "Solares": 0}

# Cofre / Armazém — precisa bater com bots/banqueiro/core/economia.py, já
# que os dois bots leem a mesma tabela `cofre` no Postgres central.
COFRE_TIERS: List[Dict] = [
    {"id": "comum",   "nome": "Cofre Comum",   "capacidade": 10,  "custo": 100},
    {"id": "prata",   "nome": "Cofre de Prata", "capacidade": 20,  "custo": 250},
    {"id": "dourado", "nome": "Cofre Dourado", "capacidade": 40,  "custo": 500},
    {"id": "arcano",  "nome": "Cofre Arcano",  "capacidade": 60,  "custo": 800},
    {"id": "eterno",  "nome": "Cofre Eterno",  "capacidade": 200, "custo": 2000},
]
COFRE_TIER_INICIAL = "comum"


def normalizar(texto: object) -> str:
    """Dobra acento e caixa pra comparação de nomes de moeda/raridade."""
    t = unicodedata.normalize("NFKD", str(texto))
    t = "".join(c for c in t if not unicodedata.combining(c))
    return t.strip().lower()


def cofre_por_id(tier_id: str) -> Optional[Dict]:
    alvo = normalizar(tier_id)
    for tier in COFRE_TIERS:
        if tier["id"] == alvo:
            return tier
    return None


def capacidade_do_cofre(tier_id: str) -> int:
    tier = cofre_por_id(tier_id) or cofre_por_id(COFRE_TIER_INICIAL)
    return int(tier["capacidade"])


def pode_guardar(itens_atuais: int, quantidade: int, tier_id: str) -> bool:
    """Se cabe `quantidade` itens no cofre do jogador."""
    if quantidade <= 0:
        return True
    return (itens_atuais + quantidade) <= capacidade_do_cofre(tier_id)


# ─────────────────────── Estações do Jardim (mudam o loot) ───────────────────
# Redesenhado em 17/07/2026 (Plano_Jornalista.md, Decisão 2): 4 estações
# normais (calendário clássico) + 2 especiais (Noite Eterna, Eclipse), cada
# uma com peso de raridade de loot e um clima exclusivo (ver core/clima.py).
# Esse conjunto SUBSTITUI o antigo (Equilíbrio/Florada/Colheita/Estiagem/
# Eclipse) que morava no Banqueiro — agora o Jornalista é o dono, porque é
# ele quem sorteia o loot dos baús automáticos que a estação influencia.
ESTACOES = {
    "primavera": {
        "rotulo": "Primavera", "tipo": "normal", "clima_exclusivo": "chuva_de_flores",
        "pesos": {"comum": 50, "incomum": 32, "raro": 14, "epico": 4, "lendario": 0},
        "descricao": "Renascimento e floração — mais variedade brota no Jardim.",
    },
    "verao": {
        "rotulo": "Verão", "tipo": "normal", "clima_exclusivo": "onda_de_calor",
        "pesos": {"comum": 70, "incomum": 22, "raro": 7, "epico": 1, "lendario": 0},
        "descricao": "Calor e fartura — abundância de coisas comuns.",
    },
    "outono": {
        "rotulo": "Outono", "tipo": "normal", "clima_exclusivo": "ventania_de_folhas",
        "pesos": {"comum": 60, "incomum": 28, "raro": 10, "epico": 2, "lendario": 0},
        "descricao": "Colheita e transição — o Jardim num equilíbrio mutável.",
    },
    "inverno": {
        "rotulo": "Inverno", "tipo": "normal", "clima_exclusivo": "nevasca",
        "pesos": {"comum": 85, "incomum": 13, "raro": 2, "epico": 0, "lendario": 0},
        "descricao": "Frio cortante — o loot minguou junto com o verde.",
    },
    "noite_eterna": {
        "rotulo": "Noite Eterna", "tipo": "especial", "clima_exclusivo": "silencio_absoluto",
        "pesos": {"comum": 15, "incomum": 25, "raro": 32, "epico": 20, "lendario": 8},
        "descricao": "O sol não nasce — perigo e recompensa em dose dupla.",
    },
    "eclipse": {
        "rotulo": "Eclipse", "tipo": "especial", "clima_exclusivo": "tempestade_arcana",
        "pesos": {"comum": 20, "incomum": 25, "raro": 30, "epico": 18, "lendario": 7},
        "descricao": "O véu se abre e tesouros surgem.",
    },
}
ESTACAO_PADRAO = "primavera"


def estacao_info(nome):
    return ESTACOES.get(normalizar(nome), ESTACOES[ESTACAO_PADRAO])
