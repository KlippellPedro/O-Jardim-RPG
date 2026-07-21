"""
Cog Boas-vindas — narra chegada e partida de membros do servidor (Passo 4
do Plano_Jornalista.md). Precisa da intent privilegiada `members` (main.py)
ligada também no Developer Portal, senão os eventos nunca disparam.
"""

from __future__ import annotations

import logging
import random

import discord
from discord.ext import commands

from core import ui

log = logging.getLogger("jornalista")

_CHEGADA = (
    "Uma carruagem acaba de cruzar os portões da cidade trazendo um novo "
    "rosto: {mencao}! Guardas já o escoltaram para a prefeitura para tirar "
    "seus documentos.",
    "Um forasteiro pisou no Jardim: {mencao} chegou pelas trilhas do leste, "
    "olhar curioso e a mochila pesada.",
    "A guarda registrou mais uma chegada: {mencao} entrou pelos portões ao "
    "anoitecer, sem dizer de onde vem.",
    "Rumor da taverna: {mencao} apareceu perto da praça perguntando onde "
    "fica o registro de cidadãos.",
)

_PARTIDA = (
    "O cidadão {nome} sumiu na névoa da floresta ontem à noite. As buscas "
    "foram encerradas e seus pertences foram leiloados.",
    "{nome} não foi mais visto no Jardim. Alguns dizem que partiu ao "
    "amanhecer; outros, que a névoa o levou.",
    "A prefeitura registrou o desaparecimento de {nome}. O quarto na "
    "estalagem já foi alugado pra outro viajante.",
    "{nome} deixou o Jardim sem se despedir. Seu nome já começa a sumir "
    "das conversas da taverna.",
)


class Boasvindas(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    def _canal(self, guild_id: int, categoria: str):
        """Canal da categoria (chegada/partida); cai no canal principal do jornal."""
        canal_id = self.bot.db.get_canal_categoria(str(guild_id), categoria)
        return self.bot.get_channel(int(canal_id)) if canal_id else None

    def _texto(self, guild_id: int, tipo: str, padroes, **campos) -> str:
        """Usa o texto que o mestre configurou (com {mencao}/{nome}); se não
        houver, sorteia um dos padrões embutidos."""
        template = self.bot.db.get_mensagem(str(guild_id), tipo)
        bruto = template if template else random.choice(padroes)
        for chave, valor in campos.items():
            bruto = bruto.replace("{" + chave + "}", valor)
        return bruto

    def _decorar(self, emb, guild_id: int, tipo: str) -> None:
        """Aplica a imagem fixa configurada (/jornal imagem) e, na chegada, o
        bloco 'Confira estes canais' (/jornal canais_boasvindas)."""
        img = self.bot.db.get_mensagem(str(guild_id), f"img_{tipo}")
        if img and img.strip().lower().startswith(("http://", "https://")):
            emb.set_image(url=img.strip())
        if tipo == "chegada":
            canais = self.bot.db.get_mensagem(str(guild_id), "canais_boasvindas")
            ids = [c.strip() for c in (canais or "").split(",") if c.strip()]
            if ids:
                emb.add_field(
                    name="Confira estes canais",
                    value="\n".join(f"📌 <#{cid}>" for cid in ids)[:1024],
                    inline=False,
                )

    @commands.Cog.listener()
    async def on_member_join(self, member: discord.Member):
        canal = self._canal(member.guild.id, "chegada")
        if canal is None:
            return

        texto = self._texto(
            member.guild.id, "chegada", _CHEGADA,
            mencao=member.mention, nome=member.display_name,
        )
        registro_id = self.bot.db.get_registro_canal(str(member.guild.id))
        if registro_id:
            texto += f"\n\nProcure <#{registro_id}> pra se registrar."

        emb = ui.embed(
            f"{ui.icone_categoria('chegada')} EXTRA! EXTRA!",
            categoria="chegada",
            descricao=texto,
        )
        self._decorar(emb, member.guild.id, "chegada")
        try:
            await canal.send(embed=emb)
        except discord.HTTPException:
            log.exception("falha ao anunciar chegada de membro (guild %s)", member.guild.id)

    @commands.Cog.listener()
    async def on_member_remove(self, member: discord.Member):
        canal = self._canal(member.guild.id, "partida")
        if canal is None:
            return

        texto = self._texto(
            member.guild.id, "partida", _PARTIDA,
            mencao=member.mention, nome=member.display_name,
        )
        emb = ui.embed(
            f"{ui.icone_categoria('partida')} Nota do Jardim",
            categoria="partida",
            descricao=texto,
        )
        self._decorar(emb, member.guild.id, "partida")
        emb.set_footer(text=f"ID do usuário: {member.id}")
        try:
            await canal.send(embed=emb)
        except discord.HTTPException:
            log.exception("falha ao anunciar partida de membro (guild %s)", member.guild.id)


async def setup(bot: commands.Bot):
    await bot.add_cog(Boasvindas(bot))
