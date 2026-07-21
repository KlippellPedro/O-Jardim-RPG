"""
Apresentação (embeds) do Barista.

Objetivo: centralizar a "cara" do bot num lugar só, pra dados e música
usarem a mesma marca e as mesmas cores por categoria — mesmo espírito do
core/ui.py do Consultor, mas sem a dependência de economia/raridade.
"""

from __future__ import annotations

from typing import Optional

import discord

NOME_BOT = "Barista"
MARCA = f"🌿 O Jardim · {NOME_BOT}"

COR = {
    "dados": 0x5865F2,   # blurple — rolagens e testes
    "musica": 0x1ABC9C,  # verde-água — tocar/fila/volume/playlist
    "ajuda": 0x5865F2,
    "menu": 0xC67C3E,    # caramelo — cardápio de bebidas
    "erro": 0xE74C3C,    # vermelho — falhas/avisos
}


def cor_categoria(chave: str) -> int:
    return COR.get(chave, COR["dados"])


def embed(
    titulo: str,
    *,
    categoria: str = "dados",
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
