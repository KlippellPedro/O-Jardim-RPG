"""
O Jardim RPG: Jornalista
Fatia PURA de economia que o Jornalista precisa pra entregar loot: sem
Discord, sem banco de dados, sem I/O.

O restante da economia (câmbio, Cartão Lunar, baús compráveis, roubo) mora
só no Banqueiro: o Jornalista não mexe em nada disso, só entrega prêmio de
baú achado no mundo.

Convenção de nomes de moeda: comparações ignoram acento e caixa, compatível
com src/services/lojaCatalogService.ts.
"""

from __future__ import annotations

import json
import unicodedata
from pathlib import Path
from typing import Dict, List, Optional

NOME_BOT = "Jornalista"

# Saldo inicial da carteira de um jogador novo (mesmo valor do Banqueiro:
# só é usado aqui se o Jornalista for o primeiro bot a ver esse jogador).
SALDO_INICIAL: Dict[str, int] = {"Lunaris": 20, "Solares": 0}


def _localizar_cofre_seguranca_tiers() -> Path:
    """Mesma fonte que bots/banqueiro/core/economia.py e
    plataforma/core/cofre_tiers.py leem (data/economia/cofre_seguranca_tiers.json):
    era uma tabela hardcoded própria aqui, que só um comentário lembrava de
    manter sincronizada com o Banqueiro à mão (achado 10 da auditoria 2026-08,
    escopo ampliado depois de descoberta na validação pós-correção)."""
    import os

    env = os.getenv("COFRE_SEGURANCA_TIERS_PATH")
    if env:
        return Path(env)
    base_dir = Path(__file__).resolve().parent.parent  # bots/jornalista
    repositorio = base_dir.parent.parent / "data" / "economia" / "cofre_seguranca_tiers.json"
    if repositorio.is_file():
        return repositorio
    return base_dir / "data" / "cofre_seguranca_tiers.json"


def _carregar_cofre_seguranca_tiers() -> dict:
    return json.loads(_localizar_cofre_seguranca_tiers().read_text(encoding="utf-8"))


_TIERS_DATA = _carregar_cofre_seguranca_tiers()

# Cofre / Armazém: o Jornalista só usa capacidade (pra saber se um baú cabe),
# mas lê a mesma fonte que o Banqueiro pra nunca mais divergir.
COFRE_TIERS: List[Dict] = _TIERS_DATA["cofre"]["tiers"]
COFRE_TIER_INICIAL = _TIERS_DATA["cofre"]["tier_inicial"]


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
# Mecânica própria do Jornalista: 4 estações normais (calendário clássico) +
# 2 especiais (Noite Eterna, Eclipse), cada
# uma com peso de raridade de loot e um clima exclusivo (ver core/clima.py).
# Esse conjunto SUBSTITUI o antigo (Equilíbrio/Florada/Colheita/Estiagem/
# Eclipse) que morava no Banqueiro: agora o Jornalista é o dono, porque é
# ele quem sorteia o loot dos baús automáticos que a estação influencia.
ESTACOES = {
    "primavera": {
        "rotulo": "Primavera", "tipo": "normal", "clima_exclusivo": "chuva_de_flores",
        "pesos": {"comum": 50, "incomum": 32, "raro": 14, "epico": 4, "lendario": 0},
        "descricao": "Renascimento e floração: mais variedade brota no Jardim.",
    },
    "verao": {
        "rotulo": "Verão", "tipo": "normal", "clima_exclusivo": "onda_de_calor",
        "pesos": {"comum": 70, "incomum": 22, "raro": 7, "epico": 1, "lendario": 0},
        "descricao": "Calor e fartura: abundância de coisas comuns.",
    },
    "outono": {
        "rotulo": "Outono", "tipo": "normal", "clima_exclusivo": "ventania_de_folhas",
        "pesos": {"comum": 60, "incomum": 28, "raro": 10, "epico": 2, "lendario": 0},
        "descricao": "Colheita e transição: o Jardim num equilíbrio mutável.",
    },
    "inverno": {
        "rotulo": "Inverno", "tipo": "normal", "clima_exclusivo": "nevasca",
        "pesos": {"comum": 85, "incomum": 13, "raro": 2, "epico": 0, "lendario": 0},
        "descricao": "Frio cortante: o loot minguou junto com o verde.",
    },
    "noite_eterna": {
        "rotulo": "Noite Eterna", "tipo": "especial", "clima_exclusivo": "silencio_absoluto",
        "pesos": {"comum": 15, "incomum": 25, "raro": 32, "epico": 20, "lendario": 8},
        "descricao": "O sol não nasce: perigo e recompensa em dose dupla.",
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


# Ordem do ciclo normal do calendário: as especiais (noite_eterna, eclipse)
# ficam de fora de propósito: são eventos raros que o mestre dispara na mão
# com /jornal estacao_definir, não parte da rotação automática semanal.
_ORDEM_ESTACOES_NORMAIS = ["primavera", "verao", "outono", "inverno"]


def proxima_estacao_normal(atual: str) -> str:
    alvo = normalizar(atual)
    if alvo not in _ORDEM_ESTACOES_NORMAIS:
        return _ORDEM_ESTACOES_NORMAIS[0]
    idx = _ORDEM_ESTACOES_NORMAIS.index(alvo)
    return _ORDEM_ESTACOES_NORMAIS[(idx + 1) % len(_ORDEM_ESTACOES_NORMAIS)]
