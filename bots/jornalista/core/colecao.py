"""Coleção das Dez Árvores: fragmentos que caem nos baús e revelam, camada por
camada, o que as Crônicas do Jardim já dizem sobre cada Árvore.

Nada de lore novo vive aqui: os textos vêm de data/colecao_arvores.json, gerado
por tools/gerar-colecao-arvores.py a partir de data/mundo/cronicas-arvores.json
(texto público e revisado). O que este módulo decide é só a mecânica:

- cada fragmento revela uma camada da página da Árvore (3 camadas por página);
- com os 3 fragmentos a página se completa;
- página completa dá AFINIDADE: quem carrega o cargo daquela Árvore (registro
  por reação) ganha um bônus pequeno de Lunaris em todo baú;
- as dez páginas fazem o Cronista do Jardim (título secreto, em core/conquistas.py).
"""

from __future__ import annotations

import json
import random as _random
from pathlib import Path
from typing import Dict, Iterable, List, Optional

import discord

from . import arvores as arvores_mod

FRAGMENTOS_POR_PAGINA = 3
# Chance de um fragmento ao pegar o seu num baú coletivo.
CHANCE_FRAGMENTO_COLETIVO = {"comum": 0.25, "incomum": 0.40}
# Fragmentos garantidos a quem vence a corrida de um baú trancado.
FRAGMENTOS_NA_CORRIDA = {"raro": 1, "epico": 1, "lendario": 2, "mitico": 2}
# A Árvore da pessoa e a do horóscopo do dia saem com mais frequência.
PESO_MINHA_ARVORE = 2
PESO_HOROSCOPO = 2
AFINIDADE_BONUS = 0.10  # +10% de Lunaris

_CAMINHO = Path(__file__).resolve().parent.parent / "data" / "colecao_arvores.json"


def _carregar() -> dict:
    return json.loads(_CAMINHO.read_text(encoding="utf-8"))


_DADOS = _carregar()
PAGINAS: Dict[str, dict] = {p["id"]: p for p in _DADOS["paginas"]}
EPILOGO: dict = _DADOS.get("epilogo") or {}

# A coleção só existe para as Árvores que o registro do Jornalista conhece.
IDS = tuple(a.id for a in arvores_mod.ARVORES)
TOTAL_PAGINAS = len(IDS)


def pagina(arvore_id: str) -> Optional[dict]:
    return PAGINAS.get(arvore_id)


def pagina_completa(quantidade: int) -> bool:
    return int(quantidade) >= FRAGMENTOS_POR_PAGINA


def barra(quantidade: int) -> str:
    q = max(0, min(FRAGMENTOS_POR_PAGINA, int(quantidade)))
    return "▰" * q + "▱" * (FRAGMENTOS_POR_PAGINA - q)


def sortear_arvore(
    progresso: Dict[str, int],
    minhas: Iterable[str] = (),
    horoscopo: Optional[str] = None,
    rng=_random,
) -> Optional[str]:
    """Árvore do próximo fragmento. Só entram páginas ainda incompletas, então
    nenhum fragmento é desperdiçado; devolve None com o álbum completo."""
    minhas = set(minhas)
    candidatas = [i for i in IDS if not pagina_completa(progresso.get(i, 0)) and i in PAGINAS]
    if not candidatas:
        return None
    pesos = []
    for arvore_id in candidatas:
        peso = 1
        if arvore_id in minhas:
            peso *= PESO_MINHA_ARVORE
        if arvore_id == horoscopo:
            peso *= PESO_HOROSCOPO
        pesos.append(peso)
    return rng.choices(candidatas, weights=pesos, k=1)[0]


def paginas_completas(progresso: Dict[str, int]) -> int:
    return sum(1 for i in IDS if pagina_completa(progresso.get(i, 0)))


def aplicar_afinidade(premio: dict, arvore_id: str) -> dict:
    """+10% de Lunaris (arredondado para cima: nunca some por arredondamento)."""
    arvore = arvores_mod.obter(arvore_id)
    novo = dict(premio)
    lunaris = int(premio.get("lunaris") or 0)
    novo["lunaris"] = int(lunaris * (1 + AFINIDADE_BONUS) + 0.999999) if lunaris else 0
    novo["afinidade"] = {
        "arvore": arvore_id,
        "nome": arvore.nome if arvore else arvore_id,
        "bonus": round(AFINIDADE_BONUS * 100),
    }
    return novo


# ── telas ───────────────────────────────────────────────────────────────────
def _cor(arvore_id: str) -> int:
    arvore = arvores_mod.obter(arvore_id)
    return arvore.cor if arvore else 0x95A5A6


def _nota_afinidade() -> str:
    return (
        f"Quem carrega o cargo desta Árvore ganha **+{round(AFINIDADE_BONUS * 100)}% de Lunaris** "
        "em todo baú (Afinidade)."
    )


def embed_fragmento(arvore_id: str, quantidade: int, paginas_total: int) -> discord.Embed:
    """O que a pessoa lê ao achar um fragmento: a camada que ele revelou."""
    pg = PAGINAS[arvore_id]
    q = max(1, min(FRAGMENTOS_POR_PAGINA, int(quantidade)))
    camada = pg["camadas"][q - 1]
    emb = discord.Embed(
        title=f"🌳 Fragmento de {pg['nome']} · {barra(q)} {q}/{FRAGMENTOS_POR_PAGINA}",
        description=f"*{pg['epiteto']}*\n\n**{camada['titulo']}**\n{camada['texto']}",
        colour=_cor(arvore_id),
    )
    if pagina_completa(q):
        emb.add_field(
            name="📖 Página completa!",
            value=f"{_nota_afinidade()}\n\nPáginas completas: **{paginas_total}/{TOTAL_PAGINAS}**.",
            inline=False,
        )
    else:
        emb.set_footer(text=f"Faltam {FRAGMENTOS_POR_PAGINA - q} fragmento(s) para completar a página.")
    return emb


def embed_pagina(arvore_id: str, quantidade: int) -> discord.Embed:
    """A página da Árvore com as camadas já reveladas."""
    pg = PAGINAS[arvore_id]
    q = max(0, min(FRAGMENTOS_POR_PAGINA, int(quantidade)))
    emb = discord.Embed(
        title=f"📖 {pg['nome']} · {barra(q)} {q}/{FRAGMENTOS_POR_PAGINA}",
        description=f"*{pg['epiteto']}*" if q else "Nenhum fragmento ainda.",
        colour=_cor(arvore_id),
    )
    for i, camada in enumerate(pg["camadas"], start=1):
        if i <= q:
            emb.add_field(name=camada["titulo"], value=camada["texto"][:1024], inline=False)
        else:
            emb.add_field(name=f"Camada {i}", value="▒▒▒▒▒▒ ainda coberta pela tinta", inline=False)
    if pagina_completa(q):
        emb.add_field(name="🌿 Afinidade", value=_nota_afinidade(), inline=False)
    return emb


def embed_album(progresso: Dict[str, int], cargos_do_jogador: Iterable[str] = (), cargos_arvore: Optional[dict] = None) -> discord.Embed:
    cargos_do_jogador = set(cargos_do_jogador)
    cargos_arvore = cargos_arvore or {}
    total = paginas_completas(progresso)
    emb = discord.Embed(
        title=f"📚 Coleção das Dez Árvores · {total}/{TOTAL_PAGINAS} páginas",
        description=(
            "Os baús às vezes trazem um **fragmento** de uma Árvore. Cada fragmento revela uma camada "
            f"do que restou escrito sobre ela; com {FRAGMENTOS_POR_PAGINA}, a página se completa. "
            f"{_nota_afinidade()}\nCompletar as dez faz de você **Cronista do Jardim**."
        ),
        colour=0xC9C4D6,
    )
    for arvore_id in IDS:
        pg = PAGINAS.get(arvore_id)
        if pg is None:
            continue
        q = progresso.get(arvore_id, 0)
        linha = f"{barra(q)} {min(q, FRAGMENTOS_POR_PAGINA)}/{FRAGMENTOS_POR_PAGINA}"
        if pagina_completa(q):
            cargo = cargos_arvore.get(arvore_id)
            linha += " ✅" + (" · Afinidade ativa" if cargo and cargo in cargos_do_jogador else "")
        emb.add_field(name=pg["nome"], value=linha, inline=True)
    if total >= TOTAL_PAGINAS and EPILOGO.get("texto"):
        emb.add_field(name=f"📜 {EPILOGO.get('titulo', 'Crônicas do Jardim')}", value=EPILOGO["texto"][:1024], inline=False)
    return emb


def embed_cronista(nome: str) -> discord.Embed:
    """Aviso público (sem spoiler de texto) de quem completou as dez páginas."""
    return discord.Embed(
        title="📜 Um novo Cronista do Jardim",
        description=f"{nome} completou as dez páginas das Crônicas e leu tudo o que sobrou escrito sobre as Árvores.",
        colour=0xC9C4D6,
    )
