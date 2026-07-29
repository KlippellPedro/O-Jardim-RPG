"""Cog Loteria: sorteio semanal da Loteria Dominical. Os bilhetes são
vendidos pelo Banqueiro (/loteria_comprar) na mesma tabela `loteria_bilhetes`
Os dois bots compartilham o PostgreSQL central. Aqui só sorteamos, pagamos
o vencedor direto na carteira compartilhada e anunciamos no jornal."""

from __future__ import annotations

import logging
import random
from datetime import datetime, time as dtime

import discord
from discord.ext import commands, tasks

from core import ui
from core.loot import TZ
from core.tasks_util import registrar_reinicio_em_erro

log = logging.getLogger("jornalista")

LOTERIA_HORARIO_SORTEIO = dtime(hour=21, minute=0)  # UTC: ~18h em São Paulo


def sortear_vencedor(bilhetes: list[dict], rng=None):
    gerador = rng or random
    if not bilhetes:
        return None
    ids = [b["user_id"] for b in bilhetes]
    pesos = [b["quantidade"] for b in bilhetes]
    return gerador.choices(ids, weights=pesos, k=1)[0]


class Loteria(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot
        registrar_reinicio_em_erro(self.ciclo, "ciclo_loteria", log)
        self.ciclo.start()

    def cog_unload(self):
        self.ciclo.cancel()

    @tasks.loop(time=LOTERIA_HORARIO_SORTEIO)
    async def ciclo(self):
        agora = datetime.now(TZ) if TZ else datetime.now()
        if agora.weekday() != 6:  # só domingo (0=segunda ... 6=domingo)
            return
        for guild in self.bot.guilds:
            try:
                await self._sortear_guild(guild)
            except Exception:
                log.exception("erro no sorteio da loteria (guild %s)", guild.id)

    @ciclo.before_loop
    async def _antes(self):
        await self.bot.wait_until_ready()

    async def _sortear_guild(self, guild: discord.Guild) -> None:
        gid = str(guild.id)
        db = self.bot.db
        bilhetes = db.listar_bilhetes_loteria(gid)
        total_bilhetes = sum(b["quantidade"] for b in bilhetes)
        if not bilhetes or total_bilhetes <= 0:
            return

        vencedor_id = sortear_vencedor(bilhetes)
        cfg_loteria = db.get_loteria_config(gid)
        pote_bruto = total_bilhetes * cfg_loteria["preco_bilhete"]
        premio = pote_bruto - int(pote_bruto * cfg_loteria["corte"])

        # Ordem importa: pagar, encerrar a rodada e só então anunciar. Se o
        # anúncio (ou qualquer coisa depois) falhar, o domingo seguinte não
        # pode sortear o mesmo bolo de novo: foi exatamente o que acontecia
        # quando `registrar_extrato` estourava antes de limpar os bilhetes.
        db.creditar(gid, vencedor_id, "Lunaris", premio)
        db.limpar_bilhetes_loteria(gid)
        db.registrar_extrato(gid, vencedor_id, premio, "Lunaris", "Ganhou a Loteria Dominical")

        canal_id = db.get_canal_categoria(gid, "dinheiro")
        canal = guild.get_channel(int(canal_id)) if canal_id else None
        if isinstance(canal, discord.TextChannel):
            emb = ui.embed(
                "🎟️ Loteria Dominical: resultado!", categoria="noticia",
                descricao=(
                    f"{total_bilhetes} bilhete(s) vendido(s) entre {len(bilhetes)} participante(s) essa semana.\n\n"
                    f"🏆 <@{vencedor_id}> levou ☾ **{premio} Lunaris**!"
                ),
            )
            try:
                await canal.send(embed=emb, allowed_mentions=discord.AllowedMentions(users=True))
            except discord.HTTPException:
                log.exception("falha ao publicar resultado da loteria no canal %s", canal_id)


async def setup(bot: commands.Bot):
    await bot.add_cog(Loteria(bot))
