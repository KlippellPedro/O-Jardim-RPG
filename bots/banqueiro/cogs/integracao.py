from __future__ import annotations

import logging

import discord
from discord import app_commands
from discord.ext import commands

from core import ui
from core.platform_api import PlatformApiError

log = logging.getLogger("banqueiro")


class Integracao(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    def _client(self):
        client = getattr(self.bot, "platform", None)
        if client is None:
            raise PlatformApiError(
                "a integracao web ainda nao foi configurada neste bot"
            )
        return client

    @app_commands.command(
        name="vincular",
        description="Vincula sua conta do site ao Discord usando o codigo do perfil.",
    )
    async def vincular(self, interaction: discord.Interaction, codigo: str):
        try:
            await self._client().link_discord_account(
                code=codigo,
                discord_user_id=interaction.user.id,
                discord_name=str(interaction.user),
            )
        except PlatformApiError as exc:
            log.warning(
                "falha na integracao com a plataforma (comando=%s user=%s status=%s): %s",
                interaction.command.name if interaction.command else "?",
                interaction.user.id, exc.status_code, exc,
            )
            await interaction.response.send_message(f"❌ {exc}", ephemeral=True)
            return
        await interaction.response.send_message(
            "✅ Sua conta do site foi vinculada a este Discord.",
            ephemeral=True,
        )

    @app_commands.command(
        name="campanha_vincular",
        description="[Mestre] Liga este servidor Discord a uma campanha do site.",
    )
    @app_commands.default_permissions(manage_guild=True)
    async def campanha_vincular(
        self,
        interaction: discord.Interaction,
        campanha_id: str,
    ):
        if interaction.guild_id is None:
            await interaction.response.send_message(
                "Use este comando dentro do servidor da campanha.",
                ephemeral=True,
            )
            return
        try:
            result = await self._client().link_campaign(
                campaign_id=campanha_id,
                discord_guild_id=interaction.guild_id,
                requested_by_discord_user_id=interaction.user.id,
            )
        except PlatformApiError as exc:
            log.warning(
                "falha na integracao com a plataforma (comando=%s user=%s status=%s): %s",
                interaction.command.name if interaction.command else "?",
                interaction.user.id, exc.status_code, exc,
            )
            await interaction.response.send_message(f"❌ {exc}", ephemeral=True)
            return
        await interaction.response.send_message(
            f"✅ Servidor ligado a campanha `{result.get('campanha_id')}`.",
            ephemeral=True,
        )

    @app_commands.command(
        name="minhas_campanhas",
        description="Mostra suas campanhas e personagens vinculados ao site.",
    )
    async def minhas_campanhas(self, interaction: discord.Interaction):
        try:
            result = await self._client().user_context(interaction.user.id)
        except PlatformApiError as exc:
            log.warning(
                "falha na integracao com a plataforma (comando=%s user=%s status=%s): %s",
                interaction.command.name if interaction.command else "?",
                interaction.user.id, exc.status_code, exc,
            )
            await interaction.response.send_message(f"❌ {exc}", ephemeral=True)
            return
        campaigns = result.get("campanhas") or []
        characters = result.get("personagens") or []
        campaign_lines = [
            f"• **{item['nome']}** — {item['papel']}"
            for item in campaigns
        ] or ["• nenhuma campanha"]
        character_lines = [
            f"• **{item['nome']}**"
            for item in characters
        ] or ["• nenhum personagem"]
        embed = ui.embed("🔗 Sua conta n'O Jardim", categoria="integracao")
        embed.add_field(
            name="Campanhas",
            value="\n".join(campaign_lines)[:1024],
            inline=False,
        )
        embed.add_field(
            name="Personagens",
            value="\n".join(character_lines)[:1024],
            inline=False,
        )
        await interaction.response.send_message(embed=embed, ephemeral=True)


async def setup(bot):
    await bot.add_cog(Integracao(bot))
