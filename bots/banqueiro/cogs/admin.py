"""Cog Admin — comandos de mestre (Gerenciar Servidor)."""

from __future__ import annotations

import logging
from typing import List

import discord
from discord import app_commands
from discord.ext import commands

from core import economia, ui
from core.db import SaldoInsuficiente

log = logging.getLogger("banqueiro")

MOEDAS_CHOICES = [app_commands.Choice(name="Lunaris ☾", value="Lunaris"),
                  app_commands.Choice(name="Solares ☉", value="Solares")]


class Admin(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    async def _ac_itens(self, interaction, current: str) -> List[app_commands.Choice[str]]:
        cat = getattr(self.bot, "catalogo", None)
        if cat is None:
            return []
        itens = cat.buscar(current, limite=25) if current else cat.listar()[:25]
        return [app_commands.Choice(name=i.titulo[:100], value=i.id) for i in itens]

    @app_commands.command(description="[Mestre] Dá moeda a um jogador.")
    @app_commands.default_permissions(manage_guild=True)
    @app_commands.choices(moeda=MOEDAS_CHOICES)
    async def dar(self, interaction, membro: discord.Member, moeda: app_commands.Choice[str], quantia: app_commands.Range[int, 1]):
        sid = str(interaction.guild_id)
        novo = self.bot.db.creditar(sid, str(membro.id), moeda.value, quantia)
        self.bot.db.registrar_extrato(sid, str(membro.id), quantia, moeda.value, "Recebido do mestre")
        await interaction.response.send_message(f"✅ Dei {quantia} {moeda.value} pra {membro.mention}. Saldo: {novo}.", ephemeral=True)

    @app_commands.command(description="[Mestre] Remove moeda de um jogador.")
    @app_commands.default_permissions(manage_guild=True)
    @app_commands.choices(moeda=MOEDAS_CHOICES)
    async def tirar(self, interaction, membro: discord.Member, moeda: app_commands.Choice[str], quantia: app_commands.Range[int, 1]):
        sid = str(interaction.guild_id)
        try:
            novo = self.bot.db.debitar(sid, str(membro.id), moeda.value, quantia)
        except SaldoInsuficiente as e:
            await interaction.response.send_message(f"⚠️ {e}", ephemeral=True)
            return
        self.bot.db.registrar_extrato(sid, str(membro.id), -quantia, moeda.value, "Removido pelo mestre")
        await interaction.response.send_message(f"✅ Tirei {quantia} {moeda.value} de {membro.mention}. Saldo: {novo}.", ephemeral=True)

    @app_commands.command(name="daritem", description="[Mestre] Dá um item do catálogo a um jogador.")
    @app_commands.default_permissions(manage_guild=True)
    @app_commands.describe(item="Item.", quantidade="Unidades (padrão 1).")
    async def daritem(self, interaction, membro: discord.Member, item: str, quantidade: app_commands.Range[int, 1] = 1):
        it = self.bot.catalogo.get(item)
        if it is None:
            await interaction.response.send_message(f"Não achei o item `{item}`.", ephemeral=True)
            return
        self.bot.db.add_item(str(interaction.guild_id), str(membro.id), it.id, it.titulo, it.tipo, quantidade)
        await interaction.response.send_message(f"✅ Dei {quantidade}× **{it.titulo}** pra {membro.mention}.", ephemeral=True)

    @daritem.autocomplete("item")
    async def daritem_ac(self, interaction, current: str):
        return await self._ac_itens(interaction, current)

    @app_commands.command(name="tirar_item", description="[Mestre] Remove um item do inventário de um jogador.")
    @app_commands.default_permissions(manage_guild=True)
    @app_commands.describe(item="Item.", quantidade="Unidades (padrão 1).")
    async def tirar_item(self, interaction, membro: discord.Member, item: str, quantidade: app_commands.Range[int, 1] = 1):
        it = self.bot.catalogo.get(item)
        item_id = it.id if it else item
        titulo = it.titulo if it else item
        if not self.bot.db.remover_item(str(interaction.guild_id), str(membro.id), item_id, quantidade):
            await interaction.response.send_message(f"{membro.mention} não tem {quantidade}× **{titulo}**.", ephemeral=True)
            return
        await interaction.response.send_message(f"✅ Tirei {quantidade}× **{titulo}** de {membro.mention}.", ephemeral=True)

    @tirar_item.autocomplete("item")
    async def tirar_item_ac(self, interaction, current: str):
        return await self._ac_itens(interaction, current)

    @app_commands.command(name="resetjogador", description="[Mestre] Zera carteira, cofre, inventário e cartão de um jogador.")
    @app_commands.default_permissions(manage_guild=True)
    async def resetjogador(self, interaction, membro: discord.Member):
        self.bot.db.resetar_jogador(str(interaction.guild_id), str(membro.id))
        await interaction.response.send_message(
            f"✅ Economia de {membro.mention} resetada: carteira, cofre, inventário e cartão voltaram ao padrão.",
            ephemeral=True,
        )

    @app_commands.command(name="setcredito", description="[Mestre] Define o crédito do Cartão Lunar de um jogador.")
    @app_commands.default_permissions(manage_guild=True)
    async def setcredito(self, interaction, membro: discord.Member, valor: app_commands.Range[int, -100, 100000]):
        self.bot.db.set_credito(str(interaction.guild_id), str(membro.id), valor)
        benef = economia.beneficios_credito(valor)
        await interaction.response.send_message(f"✅ Crédito de {membro.mention} = {valor} ({benef['rotulo']}).", ephemeral=True)

    @app_commands.command(name="setcambio", description="[Mestre] Ajusta o câmbio (Lunaris por 1 Solares e taxa %).")
    @app_commands.default_permissions(manage_guild=True)
    @app_commands.describe(lunaris_por_solares="Lunaris por 1 Solares.", taxa_percent="Taxa do banco em % (0 a 50).")
    async def setcambio(self, interaction, lunaris_por_solares: app_commands.Range[int, 1], taxa_percent: app_commands.Range[int, 0, 50] = 2):
        self.bot.db.set_cambio(str(interaction.guild_id), lunaris_por_solares, taxa_percent / 100)
        await interaction.response.send_message(f"✅ Câmbio: 1 Solares = {lunaris_por_solares} Lunaris · taxa {taxa_percent}%.", ephemeral=True)

    @app_commands.command(name="setroubo", description="[Mestre] Ajusta as regras de /roubar_cofre neste servidor.")
    @app_commands.default_permissions(manage_guild=True)
    @app_commands.describe(
        chance_base_percent="Chance de sucesso contra Segurança Básica (1-95%). Tiers comprados mantêm defesa fixa própria.",
        cooldown_horas="Cooldown entre tentativas, em horas (1-168).",
    )
    async def setroubo(
        self,
        interaction,
        chance_base_percent: app_commands.Range[int, 1, 95] = None,
        cooldown_horas: app_commands.Range[int, 1, 168] = None,
    ):
        self.bot.db.set_config_roubo(
            str(interaction.guild_id),
            chance_base_percent=chance_base_percent,
            cooldown_horas=cooldown_horas,
        )
        cfg = self.bot.db.get_config_roubo(str(interaction.guild_id))
        await interaction.response.send_message(
            f"✅ Regras de /roubar_cofre: chance contra Segurança Básica {cfg['chance_base']*100:.0f}% · "
            f"leva {int(economia.ROUBO_COFRE_PERCENT*100)}% do cofre quando dá certo · cooldown {cfg['cooldown_horas']}h. "
            "(O /roubar da carteira continua sempre garantido, leva 50% fixo.)",
            ephemeral=True,
        )

    @app_commands.command(
        name="juros_cofre",
        description="[Mestre] Aplica juros sobre o dinheiro guardado no cofre de todo mundo (fim de sessão).",
    )
    @app_commands.default_permissions(manage_guild=True)
    @app_commands.describe(taxa_percent="Juros em % sobre o saldo guardado (1 a 50).")
    async def juros_cofre(self, interaction, taxa_percent: app_commands.Range[int, 1, 50]):
        afetados = self.bot.db.aplicar_juros_cofre(str(interaction.guild_id), taxa_percent / 100)
        await interaction.response.send_message(
            f"✅ Juros de {taxa_percent}% aplicados sobre o dinheiro guardado no cofre. "
            f"{afetados} saldo(s) atualizado(s). A carteira não rende juros, só o cofre.",
            ephemeral=True,
        )

    @app_commands.command(
        name="catalogo_recarregar",
        description="[Mestre] Recarrega no bot o catálogo salvo no banco central.",
    )
    @app_commands.default_permissions(manage_guild=True)
    async def catalogo_recarregar(self, interaction):
        try:
            n, erros, origem = self.bot.recarregar_catalogo()
        except Exception:
            log.exception("falha ao recarregar catalogo do PostgreSQL")
            await interaction.response.send_message(
                "❌ Não consegui recarregar o catálogo. Confira os logs do Banqueiro.",
                ephemeral=True,
            )
            return
        extra = f" ({len(erros)} aviso(s))" if erros else ""
        await interaction.response.send_message(
            f"✅ Catálogo recarregado de {origem}: {n} item(ns){extra}.",
            ephemeral=True,
        )

    @app_commands.command(
        name="catalogo_republicar",
        description="[Mestre] Re-semeia o catálogo do arquivo: publica adições/edições e desativa removidos.",
    )
    @app_commands.default_permissions(manage_guild=True)
    async def catalogo_republicar(self, interaction):
        await interaction.response.defer(ephemeral=True)
        try:
            n, desativados, erros = self.bot.republicar_catalogo()
        except Exception:
            log.exception("falha ao republicar catalogo a partir da semente")
            await interaction.followup.send(
                "❌ Não consegui republicar o catálogo. Confira os logs do Banqueiro.",
                ephemeral=True,
            )
            return
        extra = f" ({len(erros)} aviso(s))" if erros else ""
        await interaction.followup.send(
            f"✅ Catálogo republicado do arquivo: {n} item(ns) ativo(s), "
            f"{desativados} desativado(s){extra}.",
            ephemeral=True,
        )

    @app_commands.command(
        name="jornal_definir",
        description="[Mestre] Define o canal onde o Jardim publica avisos (ex.: mudança de estação).",
    )
    @app_commands.default_permissions(manage_guild=True)
    async def jornal_definir(self, interaction, canal: discord.TextChannel):
        self.bot.db.set_jornal_canal(str(interaction.guild_id), str(canal.id))
        await interaction.response.send_message(f"📰 Jornal do Jardim definido para {canal.mention}.", ephemeral=True)


async def setup(bot):
    await bot.add_cog(Admin(bot))
