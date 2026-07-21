"""Identidade visual do Gerente."""

from __future__ import annotations

from typing import Optional

import discord

MARCA = "🌿 O Jardim · Gerente"
COR_REGRA = 0x5865F2
COR_AVISO = 0xF1C40F


def embed(titulo: str, descricao: Optional[str] = None, *, cor: int = COR_REGRA) -> discord.Embed:
    resposta = discord.Embed(title=titulo, description=descricao, color=cor)
    resposta.set_footer(text=MARCA)
    return resposta
