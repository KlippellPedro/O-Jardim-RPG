"""Cog Dados — rolagem de expressões (NdM) e testes de d20 com vantagem/desvantagem."""

from __future__ import annotations

import random
from typing import Optional

import discord
from discord import app_commands
from discord.ext import commands

from core import dados as core_dados
from core import ui

MODOS = {
    "normal": "Normal",
    "vantagem": "Vantagem",
    "desvantagem": "Desvantagem",
}

# Flavor de 20/1 natural — o sistema não dá crítico automático (ver
# docs/regras/fundamentos-v1.md, "Testes e Dificuldade do Teste"): um 20
# natural melhora o resultado em um grau, um 1 natural piora em um grau.
# O texto aqui só decora esse fato, não inventa um "crítico" que a regra
# não garante.
_FLAVOR_20 = (
    "Os deuses do dado sorriem hoje.",
    "Direto pra lenda da mesa.",
    "Um brilho raro no dado.",
    "Isso vai virar história na campanha.",
)
_FLAVOR_1 = (
    "O dado não teve pena.",
    "Vergonha alheia ativada.",
    "Hoje não é o seu dia.",
    "Nem o destino quis ajudar dessa vez.",
)


class Dados(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @app_commands.command(name="rolar", description="Rola uma expressão de dados, ex.: 2d6+3 ou 2#d20.")
    @app_commands.describe(
        expressao="Expressão de dados: 2d6+1d4-2, ou 2#d20 para duas rolagens separadas",
        motivo="Texto opcional pra identificar a rolagem",
    )
    async def rolar(self, interaction: discord.Interaction, expressao: str, motivo: Optional[str] = None):
        try:
            resultado = core_dados.rolar(expressao)
        except core_dados.ExpressaoInvalida as exc:
            await interaction.response.send_message(f"⚠️ {exc}", ephemeral=True)
            return

        emb = ui.embed("🎲 Rolagem", categoria="dados", descricao=motivo)
        emb.add_field(name="Expressão", value=f"`{resultado.expressao}`", inline=True)
        # Com `N#`, cada rolagem é independente: somar os totais enganaria quem
        # pediu, por exemplo, dois ataques separados.
        if resultado.repetida:
            emb.add_field(name="Resultados", value=f"**{resultado.resumo_total()}**", inline=True)
        else:
            emb.add_field(name="Total", value=f"**{resultado.total}**", inline=True)
        emb.add_field(name="Detalhe", value=resultado.detalhe()[:1024], inline=False)
        await interaction.response.send_message(embed=emb)

    @app_commands.command(name="teste", description="Rola um teste de d20 (com modificador e vantagem/desvantagem).")
    @app_commands.describe(
        modificador="Soma ao resultado do d20 (pode ser negativo)",
        modo="Normal, vantagem (2d20, maior) ou desvantagem (2d20, menor)",
        motivo="Texto opcional pra identificar o teste",
    )
    @app_commands.choices(modo=[
        app_commands.Choice(name="Normal", value="normal"),
        app_commands.Choice(name="Vantagem", value="vantagem"),
        app_commands.Choice(name="Desvantagem", value="desvantagem"),
    ])
    async def teste(
        self,
        interaction: discord.Interaction,
        modificador: int = 0,
        modo: Optional[app_commands.Choice[str]] = None,
        motivo: Optional[str] = None,
    ):
        modo_valor = modo.value if modo else "normal"
        resultado = core_dados.rolar_teste(modificador=modificador, modo=modo_valor)

        emb = ui.embed("🎯 Teste", categoria="dados", descricao=motivo)
        emb.add_field(name="Modo", value=MODOS[modo_valor], inline=True)
        emb.add_field(name="d20", value=", ".join(str(v) for v in resultado.dados), inline=True)
        emb.add_field(name="Modificador", value=f"{resultado.modificador:+d}", inline=True)
        emb.add_field(name="Total", value=f"**{resultado.total}**", inline=False)

        if resultado.escolhido == 20:
            emb.colour = 0xF1C40F
            emb.add_field(
                name="🌟 20 natural!",
                value=f"{random.choice(_FLAVOR_20)} O resultado melhora em um grau.",
                inline=False,
            )
        elif resultado.escolhido == 1:
            emb.colour = 0x992D22
            emb.add_field(
                name="💀 1 natural...",
                value=f"{random.choice(_FLAVOR_1)} O resultado piora em um grau.",
                inline=False,
            )

        await interaction.response.send_message(embed=emb)


async def setup(bot):
    await bot.add_cog(Dados(bot))
