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
            quantidade = db.comprar_protecao(
                sid, uid, tipo.value, info["custo"], info["nome"]
            )
        except SaldoInsuficiente as e:
            await interaction.response.send_message(f"💸 {e}", ephemeral=True)
            return
        emb = ui.embed(
            f"🛡️ {info['nome']} comprado!",
            categoria="cofre",
            descricao=(
                f"{info['descricao']}\n"
                f"Você tem **{quantidade}** unidade(s). Fica guardado até uma tentativa de roubo.\n\n"
                "**Prioridade automática:** Cão de Guarda primeiro; Alarme Mágico só é gasto quando não há cão disponível."
            ),
        )
        await interaction.response.send_message(embed=emb, ephemeral=True)

    @app_commands.command(name="protecao_ver", description="Mostra suas proteções ativas contra roubo.")
    async def protecao_ver(self, interaction):
        sid, uid = _sid(interaction), str(interaction.user.id)
        ativos = self.bot.db.listar_protecoes(sid, uid)
        if not ativos:
            opcoes = "\n".join(
                f"• **{info['nome']}** — ☾ {info['custo']}: {info['descricao']}"
                for info in economia.PROTECAO_TIPOS.values()
            )
            await interaction.response.send_message(
                f"Você não tem proteção ativa.\n\n{opcoes}\n\nUse `/protecao_comprar` para adquirir uma.",
                ephemeral=True,
            )
            return
        linhas = []
        for tipo_id, qtd in ativos.items():
            info = economia.protecao_por_id(tipo_id)
            nome = info["nome"] if info else tipo_id
            efeito = f" — {info['descricao']}" if info else ""
            linhas.append(f"• **{nome}** ×{qtd}{efeito}")
        linhas.append("\n**Ordem de uso:** Cão de Guarda → Alarme Mágico.")
        emb = ui.embed("🛡️ Suas proteções ativas", categoria="cofre", descricao="\n".join(linhas))
        await interaction.response.send_message(embed=emb, ephemeral=True)


async def setup(bot):
    await bot.add_cog(Protecao(bot))
