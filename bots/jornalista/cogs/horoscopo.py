"""Cog Horóscopo: sorteia uma Árvore por dia e publica no jornal. Quem tem
o cargo daquela Árvore ganha Lunaris em dobro nos baús abertos no dia: ver
Baus.aplicar_bonus_horoscopo em cogs/baus.py."""

from __future__ import annotations

import logging
import random

import discord
from discord import app_commands
from discord.ext import commands, tasks

from core import arvores as arvores_mod
from core import ui
from core.tasks_util import registrar_reinicio_em_erro

log = logging.getLogger("jornalista")

HOROSCOPO_INTERVALO_HORAS = 24


class Horoscopo(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot
        registrar_reinicio_em_erro(self.ciclo, "ciclo_horoscopo", log)
        self.ciclo.start()

    def cog_unload(self):
        self.ciclo.cancel()

    @tasks.loop(hours=HOROSCOPO_INTERVALO_HORAS)
    async def ciclo(self):
        for guild in self.bot.guilds:
            gid = str(guild.id)
            # tasks.loop dispara a primeira iteracao assim que o bot sobe: sem
            # isto, todo restart (cada deploy na Discloud) sorteava um novo
            # horoscopo do dia, mesmo horas depois do ultimo.
            if not self.bot.db.ciclo_guild_devido(gid, "horoscopo", HOROSCOPO_INTERVALO_HORAS):
                continue
            try:
                await self._publicar(guild)
                self.bot.db.marcar_ciclo_guild(gid, "horoscopo")
            except Exception:
                log.exception("erro no ciclo do horoscopo (guild %s)", guild.id)

    @ciclo.before_loop
    async def _antes(self):
        await self.bot.wait_until_ready()

    def _montar_embed(self, gid: str, arvore) -> discord.Embed:
        cargo_id = self.bot.db.get_cargos_arvore(gid).get(arvore.id)
        cargo_txt = f" (<@&{cargo_id}>)" if cargo_id else ""
        return ui.embed(
            "🔮 Horóscopo do Jardim",
            categoria="noticia",
            descricao=(
                f"Hoje as estrelas sorriem para os filhos de **{arvore.nome}**{cargo_txt}.\n"
                "Quem carrega essa Árvore encontra o dobro de Lunaris nos baús de hoje."
            ),
            cor=arvore.cor,
        )

    async def _publicar(self, guild: discord.Guild) -> None:
        gid = str(guild.id)
        arvore = random.choice(arvores_mod.ARVORES)
        self.bot.db.set_horoscopo(gid, arvore.id)
        canal_id = self.bot.db.get_canal_categoria(gid, "noticia")
        if not canal_id:
            return
        canal = guild.get_channel(int(canal_id))
        if not isinstance(canal, discord.TextChannel):
            return
        emb = self._montar_embed(gid, arvore)
        try:
            await canal.send(embed=emb, allowed_mentions=discord.AllowedMentions.none())
        except discord.HTTPException:
            log.exception("falha ao publicar horoscopo no canal %s", canal_id)

    @app_commands.command(name="horoscopo", description="Mostra a Árvore favorecida pelas estrelas hoje.")
    @app_commands.guild_only()
    async def horoscopo(self, interaction: discord.Interaction):
        gid = str(interaction.guild_id)
        arvore_id = self.bot.db.get_horoscopo(gid)
        arvore = arvores_mod.obter(arvore_id) if arvore_id else None
        if arvore is None:
            await interaction.response.send_message(
                "As estrelas ainda não se manifestaram hoje. Volte mais tarde.",
                ephemeral=True,
            )
            return
        emb = self._montar_embed(gid, arvore)
        cargo_id = self.bot.db.get_cargos_arvore(gid).get(arvore.id)
        membro = interaction.user
        if cargo_id and any(str(c.id) == cargo_id for c in getattr(membro, "roles", [])):
            emb.add_field(
                name="Você",
                value="Você carrega essa Árvore. Seus baús de hoje valem o dobro em Lunaris.",
                inline=False,
            )
        await interaction.response.send_message(embed=emb)


async def setup(bot: commands.Bot):
    await bot.add_cog(Horoscopo(bot))
