"""Processa retentativas duráveis das mensagens automáticas do Jornalista."""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from discord.ext import commands, tasks

from core import publicacoes
from core.tasks_util import registrar_reinicio_em_erro

log = logging.getLogger("jornalista")


class Publicacoes(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot
        registrar_reinicio_em_erro(self.ciclo, "ciclo_publicacoes", log)
        self.ciclo.start()

    def cog_unload(self):
        self.ciclo.cancel()

    @tasks.loop(minutes=1)
    async def ciclo(self):
        agora = datetime.now(timezone.utc)
        for item in self.bot.db.listar_publicacoes_devidas(agora):
            try:
                await publicacoes.tentar_publicacao(self.bot, item)
            except Exception:
                log.exception("erro ao reprocessar publicacao %s", item.get("id"))
                
        # Fofocas
        from core import ui
        for fofoca in self.bot.db.listar_fofocas_pendentes(agora):
            try:
                emb = ui.embed(
                    "📸 Furo de Reportagem!",
                    categoria="noticia",
                    descricao=fofoca["texto_fofoca"]
                )
                await publicacoes.publicar_ou_enfileirar(
                    self.bot,
                    guild_id=fofoca["guild_id"],
                    embed=emb,
                    origem="fofoca",
                    dedupe_key=f"fofoca_{fofoca['id']}",
                    categoria="noticia"
                )
                self.bot.db.atualizar_status_fofoca(fofoca["id"], "publicada")
            except Exception:
                log.exception("erro ao publicar fofoca %s", fofoca["id"])

    @ciclo.before_loop
    async def _antes(self):
        await self.bot.wait_until_ready()


async def setup(bot: commands.Bot):
    await bot.add_cog(Publicacoes(bot))
