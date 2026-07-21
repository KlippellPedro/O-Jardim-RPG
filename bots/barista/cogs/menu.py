"""
Cog Menu — cardápio de bebidas do Barista, comprável por botão.

Cada compra debita da carteira REAL do jogador (mesma tabela do Banqueiro,
Postgres compartilhado) e mostra um efeito narrativo — o Barista não tem
acesso à ficha, então não aplica nenhum bônus mecânico sozinho.
"""

from __future__ import annotations

import logging

import discord
from discord import app_commands
from discord.ext import commands

from core import db as db_mod
from core import menu as menu_mod
from core import ui

log = logging.getLogger("barista.menu")

_SEM_BANCO = (
    "⚠️ O /menu precisa do banco compartilhado, que não está configurado "
    "agora neste bot. Fala com quem administra o Barista."
)


class BotaoBebida(discord.ui.Button):
    def __init__(self, item: menu_mod.ItemMenu):
        super().__init__(
            label=f"{item.nome} — {item.preco}☾",
            style=discord.ButtonStyle.secondary,
            custom_id=f"barista:menu:{item.id}",
        )
        self.item_id = item.id

    async def callback(self, interaction: discord.Interaction):
        item = menu_mod.obter(self.item_id)
        if item is None:
            await interaction.response.send_message("⚠️ Esse item saiu do cardápio.", ephemeral=True)
            return

        bot = interaction.client
        if getattr(bot, "db", None) is None:
            await interaction.response.send_message(_SEM_BANCO, ephemeral=True)
            return
        if interaction.guild_id is None:
            await interaction.response.send_message("⚠️ Isso só funciona dentro de um servidor.", ephemeral=True)
            return

        guild_id = str(interaction.guild_id)
        user_id = str(interaction.user.id)
        try:
            bot.db.comprar_item_menu(
                guild_id,
                user_id,
                item.preco,
                f"Menu do Barista: {item.nome}",
                moeda=menu_mod.MOEDA,
            )
        except db_mod.SaldoInsuficiente as exc:
            await interaction.response.send_message(
                f"⚠️ Saldo insuficiente pra pedir {item.nome}: {exc}.", ephemeral=True
            )
            return
        except db_mod.DatabaseUnavailable:
            log.exception("Banco indisponível ao comprar %s", item.id)
            await interaction.response.send_message(
                "⚠️ O banco ficou indisponível e a compra não foi concluída. Tenta novamente em instantes.",
                ephemeral=True,
            )
            return

        emb = ui.embed(item.nome, categoria="menu", descricao=item.descricao)
        emb.add_field(name="Efeito (narrativo)", value=item.buff, inline=False)
        emb.set_footer(
            text=f"{ui.MARCA} · Pedido de {interaction.user.display_name} · combine o efeito com o mestre"
        )
        await interaction.response.send_message(embed=emb)


class MenuView(discord.ui.View):
    """timeout=None + custom_id fixo por botão = view persistente: continua
    funcionando depois de um restart do bot, registrada em setup()."""

    def __init__(self):
        super().__init__(timeout=None)
        for item in menu_mod.CARDAPIO:
            self.add_item(BotaoBebida(item))


class Menu(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @app_commands.command(name="menu", description="Mostra o cardápio de bebidas do Barista.")
    async def menu(self, interaction: discord.Interaction):
        if self.bot.db is None:
            await interaction.response.send_message(_SEM_BANCO, ephemeral=True)
            return
        emb = ui.embed(
            "☕ Cardápio do Barista",
            categoria="menu",
            descricao="Clica num item pra pedir — debita da tua carteira (Lunaris) na hora.",
        )
        for item in menu_mod.CARDAPIO:
            emb.add_field(name=f"{item.nome} — {item.preco}☾", value=item.descricao, inline=False)
        await interaction.response.send_message(embed=emb, view=MenuView())


async def setup(bot):
    await bot.add_cog(Menu(bot))
    bot.add_view(MenuView())
