"""Cog Classificados: o botão Responder dos anúncios do jornal e a validade de 7 dias.

O anúncio nasce em `/anunciar_classificado` (cogs/jornal.py), que cobra e grava
o classificado junto com a publicação na fila durável. Quando o Jornalista
publica a mensagem, ela sai com o botão **Responder** (DynamicItem, sobrevive a
reinício). Quem responde escreve um recado curto, o autor recebe por DM com a
menção de quem respondeu, e cada pessoa responde uma vez por anúncio. Passados
7 dias o anúncio expira: o botão some e a mensagem fica marcada como encerrada."""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Optional

import discord
from discord.ext import commands, tasks

from core import db as db_mod
from core import furos as furos_mod
from core import ui
from core.tasks_util import registrar_reinicio_em_erro

log = logging.getLogger("jornalista")

RESPONDER_TEMPLATE = r"classificado_resp:(?P<id>\d+)"


def rotulo_categoria(chave: str) -> str:
    nome, emoji = db_mod.CLASSIFICADO_CATEGORIAS.get(chave, db_mod.CLASSIFICADO_CATEGORIAS["outros"])
    return f"{emoji} {nome}"


def embed_classificado(
    anuncio: dict, *, encerrado: bool = False, respostas: int = 0,
) -> discord.Embed:
    """Cartaz do anúncio. Usado na publicação inicial e quando muda (respostas, expiração)."""
    corpo = f"*{anuncio['texto']}*\n\nAnúncio pago por <@{anuncio['user_id']}> (☾ {anuncio['valor']} Lunaris)"
    if encerrado:
        corpo += "\n\n🔒 **Anúncio encerrado.**"
    else:
        corpo += f"\n⏳ Válido até {discord.utils.format_dt(anuncio['expira_em'], style='D')}"
    emb = ui.embed(f"📰 CLASSIFICADOS · {rotulo_categoria(anuncio['categoria'])}", categoria="noticia", descricao=corpo)
    if respostas:
        emb.add_field(name="Respostas", value=f"💬 {respostas}", inline=True)
    return emb


class ModalResponder(discord.ui.Modal, title="Responder ao classificado"):
    recado = discord.ui.TextInput(
        label="Seu recado para o anunciante", style=discord.TextStyle.paragraph, max_length=300,
        placeholder="Tenho interesse. Podemos combinar?",
    )

    def __init__(self, cog: "Classificados", classificado_id: int):
        super().__init__(timeout=300)
        self.cog = cog
        self.classificado_id = int(classificado_id)

    async def on_submit(self, interaction: discord.Interaction) -> None:
        await self.cog.registrar_resposta(interaction, self.classificado_id, str(self.recado.value).strip())


class ResponderButton(discord.ui.DynamicItem[discord.ui.Button], template=RESPONDER_TEMPLATE):
    def __init__(self, cog: "Classificados", classificado_id: int):
        super().__init__(
            discord.ui.Button(
                label="Responder", emoji="💬", style=discord.ButtonStyle.primary,
                custom_id=f"classificado_resp:{int(classificado_id)}",
            )
        )
        self.cog = cog
        self.classificado_id = int(classificado_id)

    @classmethod
    async def from_custom_id(cls, interaction: discord.Interaction, item, match):
        return cls(interaction.client.get_cog("Classificados"), int(match["id"]))

    async def callback(self, interaction: discord.Interaction) -> None:
        anuncio = self.cog.bot.db.get_classificado(self.classificado_id)
        if anuncio is None or anuncio["status"] != "ativo":
            await interaction.response.send_message("Esse anúncio já foi encerrado.", ephemeral=True)
            return
        if str(interaction.user.id) == anuncio["user_id"]:
            await interaction.response.send_message("Esse anúncio é seu.", ephemeral=True)
            return
        await interaction.response.send_modal(ModalResponder(self.cog, self.classificado_id))


class Classificados(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self.bot.add_dynamic_items(ResponderButton)
        registrar_reinicio_em_erro(self.ciclo, "ciclo_classificados", log)
        self.ciclo.start()

    def cog_unload(self):
        self.ciclo.cancel()

    def view_do(self, classificado_id: int) -> discord.ui.View:
        view = discord.ui.View(timeout=None)
        view.add_item(ResponderButton(self, classificado_id))
        return view

    async def registrar_resposta(self, interaction: discord.Interaction, classificado_id: int, recado: str) -> None:
        recado, erro = furos_mod.limpar_texto(recado, minimo=1, maximo=300)
        if erro:
            await interaction.response.send_message(f"⚠️ {erro}", ephemeral=True)
            return
        resultado = self.bot.db.responder_classificado(classificado_id, str(interaction.user.id), recado)
        estado = resultado["status"]
        if estado == "encerrado":
            await interaction.response.send_message("Esse anúncio já foi encerrado.", ephemeral=True)
            return
        if estado == "proprio":
            await interaction.response.send_message("Esse anúncio é seu.", ephemeral=True)
            return
        if estado == "ja_respondeu":
            await interaction.response.send_message("Você já respondeu a esse anúncio.", ephemeral=True)
            return
        anuncio = resultado["anuncio"]
        await interaction.response.defer(ephemeral=True)
        avisado = await self._avisar_autor(interaction, anuncio, recado)
        await interaction.followup.send(
            "✅ Seu recado foi entregue ao anunciante." if avisado else
            f"✅ Registrei seu recado, mas as DMs de <@{anuncio['user_id']}> estão fechadas. Chame a pessoa direto.",
            ephemeral=True,
        )
        await self._atualizar_mensagem(anuncio, respostas=resultado["total"])

    async def _avisar_autor(self, interaction: discord.Interaction, anuncio: dict, recado: str) -> bool:
        emb = ui.embed(
            "💬 Alguém respondeu ao seu classificado", categoria="noticia",
            descricao=(
                f"{interaction.user.mention} escreveu (mensagem de outro jogador):\n> {recado}\n\n"
                f"Seu anúncio ({rotulo_categoria(anuncio['categoria'])}): *{anuncio['texto'][:200]}*"
            ),
        )
        try:
            usuario = self.bot.get_user(int(anuncio["user_id"])) or await self.bot.fetch_user(int(anuncio["user_id"]))
            await usuario.send(embed=emb)
            return True
        except (discord.HTTPException, ValueError):
            log.info("nao consegui avisar o autor do classificado %s por DM", anuncio.get("id"))
            return False

    async def _atualizar_mensagem(
        self, anuncio: dict, *, respostas: int = 0, encerrado: bool = False
    ) -> None:
        if not anuncio.get("canal_id") or not anuncio.get("mensagem_id"):
            return
        try:
            # Relê o estado: o ciclo pode ter encerrado o anúncio enquanto a resposta era processada.
            fresco = self.bot.db.get_classificado(anuncio["id"])
            if fresco is not None and fresco["status"] != "ativo":
                encerrado = True
                respostas = respostas or self.bot.db.contar_respostas_classificado(anuncio["id"])
            canal = self.bot.get_channel(int(anuncio["canal_id"]))
            if canal is None:
                return
            mensagem = await canal.fetch_message(int(anuncio["mensagem_id"]))
            await mensagem.edit(
                embed=embed_classificado(anuncio, encerrado=encerrado, respostas=respostas),
                view=None if encerrado else self.view_do(anuncio["id"]),
            )
        except discord.HTTPException:
            log.info("nao consegui atualizar a mensagem do classificado %s", anuncio.get("id"))

    @tasks.loop(minutes=10)
    async def ciclo(self):
        for anuncio in self.bot.db.expirar_classificados(datetime.now(timezone.utc)):
            try:
                await self._atualizar_mensagem(
                    anuncio, encerrado=True, respostas=self.bot.db.contar_respostas_classificado(anuncio["id"])
                )
            except Exception:
                log.exception("erro ao encerrar o classificado %s", anuncio.get("id"))

    @ciclo.before_loop
    async def _antes(self):
        await self.bot.wait_until_ready()


async def setup(bot: commands.Bot):
    await bot.add_cog(Classificados(bot))
