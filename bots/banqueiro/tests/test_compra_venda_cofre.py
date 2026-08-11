"""Compatibilidade após retirar a loja direta de itens do Discord."""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

import discord
from discord.ext import commands

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE))


def test_remocao_da_loja_nao_remove_inventario_nem_catalogo():
    async def carregar():
        bot = commands.Bot(command_prefix="!", intents=discord.Intents.default())
        bot.db = object()
        bot.catalogo = object()
        bot.platform = None
        try:
            await bot.load_extension("cogs.economia")
            nomes = {comando.name for comando in bot.tree.get_commands()}
            assert {"loja", "comprar", "vender"}.isdisjoint(nomes)
            assert {"inventario", "item", "loja_baus", "comprar_bau"} <= nomes
        finally:
            await bot.close()

    asyncio.run(carregar())
