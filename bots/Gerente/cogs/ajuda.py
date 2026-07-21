"""Ajuda curta do Gerente."""

from __future__ import annotations

import discord
from discord import app_commands
from discord.ext import commands

from core import ui


class Ajuda(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @app_commands.command(name="ajuda", description="Mostra como consultar o Gerente.")
    async def ajuda(self, interaction: discord.Interaction):
        emb = ui.embed(
            "🧑‍💼 Gerente — ajuda",
            "Eu mostro as regras publicadas de **O Jardim** por menus, sempre do jeito "
            "que estão escritas — sem inventar nada.",
        )
        emb.add_field(name="/regras", value="Navega por menus: raças, classes, perícias, legados e fundamentos.", inline=False)
        emb.add_field(name="/regra <termo>", value="Vai direto pra uma regra pelo nome (ex.: Humano, Guerreiro, Atletismo).", inline=False)
        emb.add_field(name="/fontes", value="Veja quais documentos oficiais eu consulto.", inline=False)
        await interaction.response.send_message(embed=emb, ephemeral=True)


async def setup(bot):
    await bot.add_cog(Ajuda(bot))
