"""Cog Horóscopo: sorteia uma Árvore por dia e publica no jornal. Quem tem
o cargo daquela Árvore ganha Lunaris em dobro nos baús abertos no dia: ver
Baus.aplicar_bonus_horoscopo em cogs/baus.py."""

from __future__ import annotations

import logging
import random
from datetime import datetime, timezone

import discord
from discord import app_commands
from discord.ext import commands, tasks

from core import arvores as arvores_mod
from core import publicacoes
from core import ui
from core.loot import TZ
from core.tasks_util import registrar_reinicio_em_erro

log = logging.getLogger("jornalista")


def _hoje():
    """Data de hoje em São Paulo (o dia do servidor, não o dia UTC)."""
    return (datetime.now(TZ) if TZ else datetime.now(timezone.utc)).date()


class Horoscopo(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot
        registrar_reinicio_em_erro(self.ciclo, "ciclo_horoscopo", log)
        self.ciclo.start()

    def cog_unload(self):
        self.ciclo.cancel()

    # O loop roda de hora em hora e o banco decide se o dia de hoje (São Paulo)
    # já tem horóscopo. Antes a decisão era "24h desde o último sorteio": como
    # o carimbo era gravado depois do envio, o ciclo derivava uma hora por dia
    # (25h na prática) e, a cada ~24 dias, um dia inteiro ficava sem sorteio.
    # Por data do calendário não há deriva, e reiniciar o bot no meio do dia
    # não sorteia de novo (horoscopo_definido_hoje).
    @tasks.loop(hours=1)
    async def ciclo(self):
        for guild in self.bot.guilds:
            gid = str(guild.id)
            if not self.bot.db.automacao_ativa(gid, "horoscopo", True):
                continue
            if self.bot.db.horoscopo_definido_hoje(gid):
                continue
            try:
                await self._publicar(guild)
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

    async def _publicar(self, guild: discord.Guild) -> str:
        gid = str(guild.id)
        data_dia = _hoje().isoformat()
        # Determinístico por guild/dia: duas instâncias durante um deploy não
        # podem anunciar uma Árvore e deixar outra salva como bônus vigente.
        arvore = random.Random(f"{gid}:{data_dia}").choice(arvores_mod.ARVORES)
        self.bot.db.set_horoscopo(gid, arvore.id)
        canal_id = self.bot.db.get_canal_categoria(gid, "noticia")
        emb = self._montar_embed(gid, arvore)
        return await publicacoes.publicar_ou_enfileirar(
            self.bot,
            guild_id=gid,
            embed=emb,
            origem="horoscopo",
            dedupe_key=(
                f"horoscopo:{gid}:{data_dia}"
            ),
            categoria="noticia",
            canal_id=canal_id,
            automacao="horoscopo",
        )

    @app_commands.command(name="horoscopo", description="Mostra a Árvore favorecida pelas estrelas hoje.")
    @app_commands.guild_only()
    async def horoscopo(self, interaction: discord.Interaction):
        gid = str(interaction.guild_id)
        if not self.bot.db.automacao_ativa(gid, "horoscopo", True):
            await interaction.response.send_message(
                "⏸️ O horóscopo está desativado neste servidor; o bônus nos baús também não se aplica.",
                ephemeral=True,
            )
            return
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
