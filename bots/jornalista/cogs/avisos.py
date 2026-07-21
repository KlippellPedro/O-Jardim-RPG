"""Cog Avisos — publica no canal do jornal os avisos que o Banqueiro
enfileira (recompensas colocadas, jogadores procurados por dívida, capturas).
O Banqueiro só escreve na fila (`avisos_pendentes`); quem publica é sempre
o Jornalista, pra manter a separação: Banqueiro cuida de dinheiro, Jornalista
anuncia pro servidor."""

from __future__ import annotations

import logging

import discord
from discord.ext import commands, tasks

log = logging.getLogger("jornalista")


class Avisos(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self.ciclo.start()

    def cog_unload(self):
        self.ciclo.cancel()

    @tasks.loop(minutes=1)
    async def ciclo(self):
        db = self.bot.db
        for guild_id in db.listar_guilds_com_aviso_pendente():
            try:
                await self._publicar_guild(guild_id)
            except Exception:
                log.exception("erro ao publicar avisos (guild %s)", guild_id)

    @ciclo.before_loop
    async def _antes_do_ciclo(self):
        await self.bot.wait_until_ready()

    async def _publicar_guild(self, guild_id: str):
        db = self.bot.db
        canal_id = db.get_jornal_canal(guild_id)
        if not canal_id:
            return
        canal = self.bot.get_channel(int(canal_id))
        if canal is None:
            return
        for aviso in db.listar_avisos_pendentes(guild_id):
            emb = discord.Embed(description=aviso["mensagem"], color=0xE67E22)
            emb.set_footer(text="🌿 O Jardim · Jornalista")
            try:
                await canal.send(embed=emb)
            except discord.HTTPException:
                log.exception("falha ao publicar aviso %s no canal %s", aviso["id"], canal_id)
                continue
            db.marcar_aviso_publicado(aviso["id"])


async def setup(bot: commands.Bot):
    await bot.add_cog(Avisos(bot))
