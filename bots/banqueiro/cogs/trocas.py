"""Cog Trocas — um player oferece um item ou baú seu a outro por um preço.
O alvo aceita/recusa no botão; a troca é atômica (verifica posse e saldo)."""

from __future__ import annotations

from typing import Optional

import discord
from discord import app_commands
from discord.ext import commands

from core import economia, ui
from core.db import SaldoInsuficiente

SIMBOLO = {"lunaris": "☾", "solares": "☉"}
MOEDAS_CHOICES = [app_commands.Choice(name="Lunaris ☾", value="Lunaris"),
                  app_commands.Choice(name="Solares ☉", value="Solares")]


def _parse(oq: str):
    if ":" in oq:
        k, v = oq.split(":", 1)
        return k, v
    return "item", oq


class OfertaView(discord.ui.View):
    def __init__(self, cog, guild_id, ofertante_id, alvo_id, kind, ref, titulo, preco, moeda, timeout=120):
        super().__init__(timeout=timeout)
        self.cog = cog
        self.guild_id = guild_id
        self.ofertante_id = ofertante_id
        self.alvo_id = alvo_id
        self.kind = kind
        self.ref = ref
        self.titulo = titulo
        self.preco = preco
        self.moeda = moeda
        self.resolvido = False
        self.message = None

    async def interaction_check(self, interaction: discord.Interaction) -> bool:
        if interaction.user.id not in (self.alvo_id, self.ofertante_id):
            await interaction.response.send_message("Essa oferta não é sua.", ephemeral=True)
            return False
        return True

    async def _fechar(self):
        for c in self.children:
            c.disabled = True
        if self.message:
            try:
                await self.message.edit(view=self)
            except discord.HTTPException:
                pass

    async def on_timeout(self):
        if not self.resolvido:
            await self._fechar()

    @discord.ui.button(label="Aceitar ✅", style=discord.ButtonStyle.success)
    async def aceitar(self, interaction: discord.Interaction, button: discord.ui.Button):
        if interaction.user.id != self.alvo_id:
            await interaction.response.send_message("Só quem recebeu a oferta pode aceitar.", ephemeral=True)
            return
        if self.resolvido:
            await interaction.response.send_message("Oferta já resolvida.", ephemeral=True)
            return
        self.resolvido = True
        ok, msg = self.cog.executar_troca(self.guild_id, str(self.ofertante_id), str(self.alvo_id),
                                          self.kind, self.ref, self.titulo, self.preco, self.moeda)
        await self._fechar()
        await interaction.response.send_message(msg, ephemeral=not ok)
        self.stop()

    @discord.ui.button(label="Recusar ❌", style=discord.ButtonStyle.danger)
    async def recusar(self, interaction: discord.Interaction, button: discord.ui.Button):
        if interaction.user.id != self.alvo_id:
            await interaction.response.send_message("Só quem recebeu a oferta pode recusar.", ephemeral=True)
            return
        if self.resolvido:
            await interaction.response.send_message("Oferta já resolvida.", ephemeral=True)
            return
        self.resolvido = True
        await self._fechar()
        await interaction.response.send_message("Oferta recusada.", ephemeral=True)
        self.stop()

    @discord.ui.button(label="Cancelar 🗑️", style=discord.ButtonStyle.secondary)
    async def cancelar(self, interaction: discord.Interaction, button: discord.ui.Button):
        if interaction.user.id != self.ofertante_id:
            await interaction.response.send_message("Só quem ofereceu pode cancelar.", ephemeral=True)
            return
        if self.resolvido:
            await interaction.response.send_message("Oferta já resolvida.", ephemeral=True)
            return
        self.resolvido = True
        await self._fechar()
        await interaction.response.send_message("Oferta cancelada.", ephemeral=True)
        self.stop()


class Trocas(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    def executar_troca(self, guild_id, vendedor_id, comprador_id, kind, ref, titulo, preco, moeda):
        """Executa a troca de forma atômica-ish (checa tudo antes de mover)."""
        db = self.bot.db
        if kind == "bau":
            if db.contar_bau(guild_id, vendedor_id, ref) < 1:
                return False, "O ofertante não tem mais esse baú."
        else:
            if ref not in {i["item_id"] for i in db.listar_inventario(guild_id, vendedor_id)}:
                return False, "O ofertante não tem mais esse item."
        if db.get_saldo(guild_id, comprador_id, moeda) < preco:
            return False, f"Você não tem {preco} {moeda} pra fechar a troca."
        if kind == "item":
            tier = db.get_cofre_tier(guild_id, comprador_id)
            if not economia.pode_guardar(db.contar_itens(guild_id, comprador_id), 1, tier):
                return False, "Seu cofre está cheio. Use `/cofre_melhorar` antes de receber o item."
        try:
            db.debitar(guild_id, comprador_id, moeda, preco)  # sem linha de crédito em troca P2P
        except SaldoInsuficiente as e:
            return False, str(e)
        if kind == "bau":
            db.remover_bau(guild_id, vendedor_id, ref, 1)
            db.add_bau(guild_id, comprador_id, ref, 1)
        else:
            db.remover_item(guild_id, vendedor_id, ref, 1)
            it = self.bot.catalogo.get(ref)
            db.add_item(guild_id, comprador_id, ref,
                        it.titulo if it else titulo, it.tipo if it else "equipamento", 1)
        db.creditar(guild_id, vendedor_id, moeda, preco)
        db.registrar_extrato(guild_id, comprador_id, -preco, moeda, f"Troca: comprou {titulo}")
        db.registrar_extrato(guild_id, vendedor_id, preco, moeda, f"Troca: vendeu {titulo}")
        simb = SIMBOLO.get(economia.normalizar(moeda), "")
        return True, f"✅ Troca fechada! **{titulo}** por {simb} {preco} {moeda}."

    async def _ac_oferecer(self, interaction, current):
        db = self.bot.db
        g, u = str(interaction.guild_id), str(interaction.user.id)
        db.garantir_jogador(g, u)
        opts = []
        for i in db.listar_inventario(g, u):
            opts.append(app_commands.Choice(name=f"[Item] {i['titulo']} x{i['quantidade']}"[:100], value=f"item:{i['item_id']}"))
        for b in db.listar_baus_estoque(g, u):
            bb = economia.bau_compravel_por_id(b["bau_id"])
            nome = bb["nome"] if bb else b["bau_id"]
            opts.append(app_commands.Choice(name=f"[Baú] {nome} x{b['quantidade']}"[:100], value=f"bau:{b['bau_id']}"))
        cur = economia.normalizar(current)
        if cur:
            opts = [o for o in opts if cur in economia.normalizar(o.name)]
        return opts[:25]

    @app_commands.command(description="Oferece um item ou baú seu a outro player por um preço.")
    @app_commands.describe(para="Pra quem você oferece.", o_que="O que você oferece (item ou baú seu).",
                           preco="Preço que você pede.", moeda="Moeda (padrão Lunaris).")
    @app_commands.choices(moeda=MOEDAS_CHOICES)
    async def oferecer(self, interaction: discord.Interaction, para: discord.Member, o_que: str,
                       preco: app_commands.Range[int, 1], moeda: Optional[app_commands.Choice[str]] = None):
        if para.id == interaction.user.id:
            await interaction.response.send_message("Você não pode ofertar pra si mesmo.", ephemeral=True)
            return
        if para.bot:
            await interaction.response.send_message("Não dá pra ofertar pra um bot.", ephemeral=True)
            return
        moeda_nome = moeda.value if moeda else "Lunaris"
        kind, ref = _parse(o_que)
        g, u = str(interaction.guild_id), str(interaction.user.id)
        db = self.bot.db
        db.garantir_jogador(g, u)
        if kind == "bau":
            bb = economia.bau_compravel_por_id(ref)
            if not bb or db.contar_bau(g, u, ref) < 1:
                await interaction.response.send_message("Você não tem esse baú.", ephemeral=True)
                return
            titulo = bb["nome"]
        else:
            inv = {i["item_id"]: i["titulo"] for i in db.listar_inventario(g, u)}
            if ref not in inv:
                await interaction.response.send_message("Você não tem esse item.", ephemeral=True)
                return
            titulo = inv[ref]
        view = OfertaView(self, g, interaction.user.id, para.id, kind, ref, titulo, preco, moeda_nome)
        simb = SIMBOLO.get(economia.normalizar(moeda_nome), "")
        emb = ui.embed("🤝 Proposta de troca", categoria="troca",
                       descricao=f"{interaction.user.mention} oferece **{titulo}** a {para.mention} "
                                 f"por {simb} **{preco} {moeda_nome}**.\n{para.mention}, aceita?")
        await interaction.response.send_message(content=para.mention, embed=emb, view=view)
        view.message = await interaction.original_response()

    @oferecer.autocomplete("o_que")
    async def oferecer_ac(self, interaction, current: str):
        return await self._ac_oferecer(interaction, current)


async def setup(bot):
    await bot.add_cog(Trocas(bot))
