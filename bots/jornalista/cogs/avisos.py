"""Cog Avisos: publica no canal de dinheiro os avisos que o Banqueiro
enfileira (recompensas colocadas, jogadores procurados por dívida, capturas).
O Banqueiro só escreve na fila (`avisos_pendentes`); quem publica é sempre
o Jornalista, pra manter a separação: Banqueiro cuida de dinheiro, Jornalista
anuncia pro servidor. Sem rota específica, usa o canal principal do jornal."""

from __future__ import annotations

import logging

import discord
from discord.ext import commands, tasks

from core import ui
from core.tasks_util import registrar_reinicio_em_erro

log = logging.getLogger("jornalista")


class Avisos(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot
        registrar_reinicio_em_erro(self.ciclo, "ciclo_avisos", log)
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
        canal_id = db.get_canal_categoria(guild_id, "dinheiro")
        if not canal_id:
            return
        canal = self.bot.get_channel(int(canal_id))
        if canal is None:
            return
        for aviso in db.listar_avisos_pendentes(guild_id):
            # A mensagem já vem pronta do Banqueiro (recompensa, procurado,
            # dívida quitada, captura...) sem categoria estruturada — usa a
            # cor neutra do design system em vez de laranja fixo pra tudo.
            emb = ui.embed("", categoria="noticia", descricao=aviso["mensagem"])
            emb.title = None
            try:
                await canal.send(embed=emb)
            except discord.HTTPException:
                log.exception("falha ao publicar aviso %s no canal %s", aviso["id"], canal_id)
                continue
            db.marcar_aviso_publicado(aviso["id"])


async def setup(bot: commands.Bot):
    await bot.add_cog(Avisos(bot))
