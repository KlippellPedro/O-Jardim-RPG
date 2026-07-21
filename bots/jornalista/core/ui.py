"""
Apresentação (embeds) do Jornalista.

Objetivo: centralizar a "cara" do bot num lugar só — mesmo espírito do
core/ui.py do Banqueiro/Barista. Cores e ícones por categoria seguem a
Decisão 3 do Plano_Jornalista.md (aprovada em 17/07/2026): cada tipo de
conteúdo (chegada/partida de membro, registro, recompensa, procurado,
capturado, dívida quitada, baú, clima, notícia do mestre) tem sua própria
cor/ícone, pra diferenciar visualmente os avisos publicados no jornal.
"""

from __future__ import annotations

from typing import Optional

import discord

NOME_BOT = "Jornalista"
MARCA = f"🌿 O Jardim · {NOME_BOT}"

COR = {
    "chegada": 0x7F8C9A,         # azul-acinzentado — chegada de membro
    "partida": 0x7F8C9A,         # azul-acinzentado — partida de membro
    "registro": 0x2ECC71,        # verde — registro concluído (escolha de Árvore)
    "recompensa": 0xE74C3C,      # vermelho — recompensa colocada
    "procurado": 0xE67E22,       # laranja — procurado por dívida
    "capturado": 0x9B59B6,       # roxo — capturado
    "divida_quitada": 0x2ECC71,  # verde — dívida quitada
    "bau": 0xF1C40F,             # dourado — baú anunciado
    "clima": 0x3498DB,           # azul — clima do mês
    "noticia": 0xECF0F1,         # branco/cinza-claro — notícia do mestre
    "erro": 0xE74C3C,            # vermelho — falhas/avisos
}

ICONE = {
    "chegada": "📢",
    "partida": "🍂",
    "registro": "✅",
    "recompensa": "🎯",
    "procurado": "🚨",
    "capturado": "⛓️",
    "divida_quitada": "💸",
    "bau": "🎁",
    "clima": "📰",
    "noticia": "📰",
}


def cor_categoria(chave: str) -> int:
    return COR.get(chave, COR["noticia"])


def icone_categoria(chave: str) -> str:
    return ICONE.get(chave, "📰")


def embed(
    titulo: str,
    *,
    categoria: str = "noticia",
    descricao: Optional[str] = None,
    cor: Optional[int] = None,
) -> discord.Embed:
    """Embed com a marca do bot já no footer — usar em vez de discord.Embed() cru."""
    e = discord.Embed(
        title=titulo,
        description=descricao,
        color=cor if cor is not None else cor_categoria(categoria),
    )
    e.set_footer(text=MARCA)
    return e
