"""Cog Furos: os botões que a vítima de um furo recebe por DM.

Quando alguém vende um furo sobre você, o Jornalista manda uma DM com duas saídas
até o fim da janela: **Subornar** (paga o suborno e a história some) ou
**Desmentir** (de graça, mas a história sai com a sua negativa). Os botões são
persistentes (sobrevivem a reinício) e só valem para a vítima."""

from __future__ import annotations

import logging
from datetime import datetime, timezone

import discord
from discord.ext import commands

log = logging.getLogger("jornalista")

SUBORNAR_TEMPLATE = r"furo_subornar:(?P<id>\d+)"
DESMENTIR_TEMPLATE = r"furo_desmentir:(?P<id>\d+)"


class _MixinFuro:
    """Parte comum dos dois botões (cada DynamicItem exige o próprio `template`)."""

    cog: "Furos"
    fofoca_id: int

    async def _fofoca_da_vitima(self, interaction: discord.Interaction):
        fofoca = self.cog.bot.db.get_fofoca(self.fofoca_id)
        if fofoca is None or fofoca["user_id"] != str(interaction.user.id):
            await interaction.response.send_message("Esse furo não é sobre você.", ephemeral=True)
            return None
        if fofoca["status"] != "pendente" or fofoca["prazo"] <= datetime.now(timezone.utc):
            await self.cog.encerrar_mensagem(
                interaction, "⌛ Essa história já saiu no jornal (ou foi barrada). Não dá mais para agir."
            )
            return None
        return fofoca


class SubornarButton(_MixinFuro, discord.ui.DynamicItem[discord.ui.Button], template=SUBORNAR_TEMPLATE):
    def __init__(self, cog: "Furos", fofoca_id: int, valor: int = 0):
        rotulo = f"Subornar (☾ {valor})" if valor else "Subornar"
        discord.ui.DynamicItem.__init__(self, discord.ui.Button(
            label=rotulo, emoji="🤐", style=discord.ButtonStyle.danger, custom_id=f"furo_subornar:{int(fofoca_id)}",
        ))
        self.cog = cog
        self.fofoca_id = int(fofoca_id)

    @classmethod
    async def from_custom_id(cls, interaction: discord.Interaction, item, match):
        return cls(interaction.client.get_cog("Furos"), int(match["id"]))

    async def callback(self, interaction: discord.Interaction) -> None:
        fofoca = await self._fofoca_da_vitima(interaction)
        if fofoca is None:
            return
        resultado = self.cog.bot.db.subornar_fofoca(
            fofoca["guild_id"], str(interaction.user.id), datetime.now(timezone.utc), fofoca_id=self.fofoca_id
        )
        if resultado["status"] == "saldo_insuficiente":
            await interaction.response.send_message(
                f"Você não tem ☾ {resultado['valor']} Lunaris para o suborno. Você ainda pode **Desmentir**.",
                ephemeral=True,
            )
            return
        if resultado["status"] != "subornada":
            await self.cog.encerrar_mensagem(interaction, "⌛ Essa história já saiu no jornal. Não dá mais para agir.")
            return
        await self.cog.encerrar_mensagem(
            interaction, f"🤐 Você pagou ☾ {resultado['valor']} Lunaris e a história foi para o triturador."
        )


class DesmentirButton(_MixinFuro, discord.ui.DynamicItem[discord.ui.Button], template=DESMENTIR_TEMPLATE):
    def __init__(self, cog: "Furos", fofoca_id: int):
        discord.ui.DynamicItem.__init__(self, discord.ui.Button(
            label="Desmentir", emoji="🗣️", style=discord.ButtonStyle.secondary,
            custom_id=f"furo_desmentir:{int(fofoca_id)}",
        ))
        self.cog = cog
        self.fofoca_id = int(fofoca_id)

    @classmethod
    async def from_custom_id(cls, interaction: discord.Interaction, item, match):
        return cls(interaction.client.get_cog("Furos"), int(match["id"]))

    async def callback(self, interaction: discord.Interaction) -> None:
        fofoca = await self._fofoca_da_vitima(interaction)
        if fofoca is None:
            return
        resultado = self.cog.bot.db.desmentir_fofoca(self.fofoca_id, str(interaction.user.id), datetime.now(timezone.utc))
        if resultado["status"] != "desmentida":
            await interaction.response.send_message("Você já desmentiu essa história.", ephemeral=True)
            return
        await self.cog.encerrar_mensagem(
            interaction, "🗣️ Registrado. A história ainda pode sair, mas junto com o seu desmentido (de graça)."
        )


class Furos(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self.bot.add_dynamic_items(SubornarButton, DesmentirButton)

    def view_da_vitima(self, fofoca_id: int, suborno: int) -> discord.ui.View:
        view = discord.ui.View(timeout=None)
        view.add_item(SubornarButton(self, fofoca_id, suborno))
        view.add_item(DesmentirButton(self, fofoca_id))
        return view

    async def encerrar_mensagem(self, interaction: discord.Interaction, texto: str) -> None:
        """Troca o texto da DM e tira os botões, para a vítima não clicar duas vezes."""
        try:
            await interaction.response.edit_message(content=texto, view=None)
        except discord.HTTPException:
            if not interaction.response.is_done():
                await interaction.response.send_message(texto, ephemeral=True)


async def setup(bot: commands.Bot):
    await bot.add_cog(Furos(bot))
