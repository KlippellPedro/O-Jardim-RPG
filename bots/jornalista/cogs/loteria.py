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
from core import publicacoes
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
                await self._sortear_guild(guild, agora)
            except Exception:
                log.exception("erro no sorteio da loteria (guild %s)", guild.id)

    @ciclo.before_loop
    async def _antes(self):
        await self.bot.wait_until_ready()

    async def _sortear_guild(self, guild: discord.Guild, agora: datetime) -> None:
        gid = str(guild.id)
        db = self.bot.db
        cfg_loteria = db.get_loteria_config(gid)
        rodada_id = agora.date().isoformat()
        resultado = db.encerrar_loteria_atomica(
            gid,
            rodada_id,
            cfg_loteria["preco_bilhete"],
            cfg_loteria["corte"],
        )
        if not resultado or not resultado["nova"]:
            return
        vencedor_id = resultado["vencedor_user_id"]
        total_bilhetes = int(resultado["total_bilhetes"])
        participantes = int(resultado["participantes"])
        premio = int(resultado["premio"])

        canal_id = db.get_canal_categoria(gid, "dinheiro")
        canal = guild.get_channel(int(canal_id)) if canal_id else None
        if not db.automacao_ativa(gid, "loteria_resultado", True):
            return
        emb = ui.embed(
            "🎟️ Loteria Dominical: resultado!", categoria="noticia",
            descricao=(
                f"{total_bilhetes} bilhete(s) vendido(s) entre {participantes} participante(s) essa semana.\n\n"
                f"🏆 <@{vencedor_id}> levou ☾ **{premio} Lunaris**!"
            ),
        )
        await publicacoes.publicar_ou_enfileirar(
            self.bot,
            guild_id=gid,
            embed=emb,
            origem="loteria_resultado",
            dedupe_key=f"loteria:{gid}:{rodada_id}",
            categoria="dinheiro",
            canal_id=str(canal.id) if isinstance(canal, discord.TextChannel) else None,
            automacao="loteria_resultado",
            mencoes="usuarios",
        )


async def setup(bot: commands.Bot):
    await bot.add_cog(Loteria(bot))
