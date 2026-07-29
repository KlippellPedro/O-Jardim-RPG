"""Cog Loteria: venda de bilhetes da Loteria Dominical. O sorteio roda no
Jornalista, que também escreve na mesma tabela `loteria_bilhetes` (os dois
bots compartilham o mesmo PostgreSQL central): ver
bots/jornalista/cogs/loteria.py pro sorteio e pagamento do prêmio."""

from __future__ import annotations

from discord import app_commands
from discord.ext import commands

from core import ui
from core.db import SaldoInsuficiente


def _sid(interaction):
    return str(interaction.guild_id)


class Loteria(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @app_commands.command(
        name="loteria_comprar",
        description="Compra bilhetes da Loteria Dominical (sorteio todo domingo).",
    )
    @app_commands.describe(quantidade="Quantos bilhetes comprar.")
    async def loteria_comprar(self, interaction, quantidade: app_commands.Range[int, 1, 100]):
        sid, uid = _sid(interaction), str(interaction.user.id)
        db = self.bot.db
        db.garantir_jogador(sid, uid)
        preco_bilhete = db.get_economia_config(sid)["loteria_preco_bilhete"]
        custo = preco_bilhete * quantidade
        try:
            db.debitar(sid, uid, "Lunaris", custo)
        except SaldoInsuficiente as e:
            await interaction.response.send_message(f"💸 {e}", ephemeral=True)
            return
        total = db.comprar_bilhete_loteria(sid, uid, quantidade)
        db.registrar_extrato(sid, uid, -custo, "Lunaris", f"Comprou {quantidade} bilhete(s) da Loteria Dominical")
        emb = ui.embed(
            "🎟️ Bilhetes comprados!", categoria="economia",
            descricao=(
                f"Você comprou **{quantidade}** bilhete(s) por ☾ **{custo} Lunaris**.\n"
                f"Total de bilhetes seus nesta rodada: **{total}**.\n"
                "O sorteio sai todo domingo no jornal do servidor: quanto mais bilhetes, maior a chance."
            ),
        )
        await interaction.response.send_message(embed=emb, ephemeral=True)

    @app_commands.command(
        name="loteria_meus_bilhetes",
        description="Mostra quantos bilhetes você tem na rodada atual da Loteria Dominical.",
    )
    async def loteria_meus_bilhetes(self, interaction):
        sid, uid = _sid(interaction), str(interaction.user.id)
        qtd = self.bot.db.meus_bilhetes_loteria(sid, uid)
        if qtd <= 0:
            await interaction.response.send_message(
                "Você ainda não comprou bilhetes nesta rodada. Use `/loteria_comprar`.", ephemeral=True
            )
            return
        await interaction.response.send_message(
            f"🎟️ Você tem **{qtd}** bilhete(s) nesta rodada da Loteria Dominical.", ephemeral=True
        )

    @app_commands.command(
        name="loteria_bolo",
        description="Mostra o tamanho do bolo da Loteria Dominical antes de comprar às cegas.",
    )
    async def loteria_bolo(self, interaction):
        sid = _sid(interaction)
        bilhetes = self.bot.db.listar_bilhetes_loteria(sid)
        total_bilhetes = sum(b["quantidade"] for b in bilhetes)
        if total_bilhetes <= 0:
            await interaction.response.send_message(
                "Ninguém comprou bilhete ainda nesta rodada. Seja o primeiro com `/loteria_comprar`!",
                ephemeral=True,
            )
            return
        cfg_loteria = self.bot.db.get_economia_config(sid)
        pote_bruto = total_bilhetes * cfg_loteria["loteria_preco_bilhete"]
        premio_estimado = pote_bruto - int(pote_bruto * cfg_loteria["loteria_corte"])
        emb = ui.embed(
            "🎟️ Bolo da Loteria Dominical", categoria="economia",
            descricao=(
                f"**{total_bilhetes}** bilhete(s) vendido(s) entre **{len(bilhetes)}** participante(s).\n"
                f"Prêmio estimado agora: ☾ **{premio_estimado} Lunaris** (após o corte da casa).\n"
                "Sorteio todo domingo, à noite, no jornal do servidor. O prêmio final depende de "
                "quantos bilhetes ainda forem vendidos até lá."
            ),
        )
        await interaction.response.send_message(embed=emb)


async def setup(bot):
    await bot.add_cog(Loteria(bot))
