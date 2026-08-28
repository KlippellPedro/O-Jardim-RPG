"""Liquida e publica resultados da Corrida das Arvores do Banco Lunar."""

from __future__ import annotations

import logging
from datetime import datetime, timezone

import discord
from discord.ext import commands, tasks

from core import cassino, publicacoes, ui
from core.tasks_util import registrar_reinicio_em_erro


log = logging.getLogger("jornalista")


class CassinoJornal(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        registrar_reinicio_em_erro(self.ciclo, "ciclo_corrida_astral", log)
        self.ciclo.start()

    def cog_unload(self):
        self.ciclo.cancel()

    @tasks.loop(minutes=1)
    async def ciclo(self):
        for corrida in self.bot.db.listar_corridas_vencidas(datetime.now(timezone.utc)):
            try:
                resultado = self.bot.db.liquidar_corrida_atomica(corrida["id"])
                if resultado and resultado.get("nova") and resultado["status"] == "liquidada":
                    await self._publicar(resultado)
            except Exception:
                log.exception("erro ao liquidar Corrida das Arvores %s", corrida["id"])

    @ciclo.before_loop
    async def _antes(self):
        await self.bot.wait_until_ready()

    async def _publicar(self, resultado: dict):
        guild_id = resultado["guild_id"]
        info = cassino.CORREDORES_ASTRAIS[resultado["vencedor"]]
        vencedores = [p for p in resultado["pagamentos"] if p["corredor"] == resultado["vencedor"]]
        if resultado.get("sem_aposta_vencedora"):
            detalhe = "Ninguém apostou no vencedor; o bolo inteiro voltou proporcionalmente aos participantes."
        elif vencedores:
            detalhe = "\n".join(
                f"• <@{p['user_id']}> recebeu ☾ **{p['pagamento']}**"
                + (" · 🏆 **Estandarte Vencedor**" if p.get("conquista_nova") else "")
                for p in vencedores[:10]
            )
        else:
            detalhe = "Não houve pagamento vencedor."
        emb = ui.embed(
            "🏁 Corrida das Árvores: resultado",
            categoria="noticia",
            descricao=(
                f"{info['emoji']} **{info['nome']}** completou o percurso primeiro.\n\n"
                f"Bolo: ☾ **{resultado['total_apostado']}** · pago: ☾ **{resultado['total_pago']}**\n"
                f"{detalhe}"
            ),
        )
        canal_id = self.bot.db.get_canal_categoria(guild_id, "dinheiro")
        guild = self.bot.get_guild(int(guild_id))
        canal = guild.get_channel(int(canal_id)) if guild and canal_id else None
        await publicacoes.publicar_ou_enfileirar(
            self.bot,
            guild_id=guild_id,
            embed=emb,
            origem="cassino_corrida",
            dedupe_key=f"cassino-corrida:{resultado['id']}",
            categoria="dinheiro",
            canal_id=str(canal.id) if isinstance(canal, discord.TextChannel) else None,
            automacao="cassino_corrida",
            mencoes="usuarios",
        )


async def setup(bot):
    await bot.add_cog(CassinoJornal(bot))
