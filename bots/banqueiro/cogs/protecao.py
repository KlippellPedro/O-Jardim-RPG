"""Cog Proteção: consumíveis de defesa passiva (Cão de Guarda, Alarme
Mágico). Consumidos automaticamente por cogs/economia.py na próxima
tentativa de roubo contra o dono; ver Economia._consumir_melhor_protecao."""

from __future__ import annotations

from discord import app_commands
from discord.ext import commands

from core import economia, ui
from core.db import SaldoInsuficiente

PROTECAO_CHOICES = [
    app_commands.Choice(name=f"{info['nome']} (☾ {info['custo']})", value=tipo_id)
    for tipo_id, info in economia.PROTECAO_TIPOS.items()
]


def _sid(interaction):
    return str(interaction.guild_id)


class Protecao(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @app_commands.command(
        name="protecao_comprar",
        description="Compra um item de defesa passiva contra roubo (consumido no próximo ataque sofrido).",
    )
    @app_commands.describe(tipo="Qual proteção comprar.")
    @app_commands.choices(tipo=PROTECAO_CHOICES)
    async def protecao_comprar(self, interaction, tipo: app_commands.Choice[str]):
        sid, uid = _sid(interaction), str(interaction.user.id)
        info = economia.protecao_por_id(tipo.value)
        if info is None:
            await interaction.response.send_message("⚠️ Proteção desconhecida.", ephemeral=True)
            return
        db = self.bot.db
        db.garantir_jogador(sid, uid)
        try:
            db.debitar(sid, uid, "Lunaris", info["custo"])
        except SaldoInsuficiente as e:
            await interaction.response.send_message(f"💸 {e}", ephemeral=True)
            return
        db.adicionar_protecao(sid, uid, tipo.value, 1)
        db.registrar_extrato(sid, uid, -info["custo"], "Lunaris", f"Comprou {info['nome']}")
        emb = ui.embed(
            f"🛡️ {info['nome']} comprado!",
            categoria="cofre",
            descricao=f"{info['descricao']}\nFica guardado até ser consumido automaticamente na próxima tentativa de roubo.",
        )
        await interaction.response.send_message(embed=emb, ephemeral=True)

    @app_commands.command(name="protecao_ver", description="Mostra suas proteções ativas contra roubo.")
    async def protecao_ver(self, interaction):
        sid, uid = _sid(interaction), str(interaction.user.id)
        ativos = self.bot.db.listar_protecoes(sid, uid)
        if not ativos:
            await interaction.response.send_message(
                "Você não tem nenhuma proteção ativa. Use `/protecao_comprar`.", ephemeral=True
            )
            return
        linhas = []
        for tipo_id, qtd in ativos.items():
            info = economia.protecao_por_id(tipo_id)
            nome = info["nome"] if info else tipo_id
            linhas.append(f"• **{nome}** ×{qtd}")
        emb = ui.embed("🛡️ Suas proteções ativas", categoria="cofre", descricao="\n".join(linhas))
        await interaction.response.send_message(embed=emb, ephemeral=True)


async def setup(bot):
    await bot.add_cog(Protecao(bot))
