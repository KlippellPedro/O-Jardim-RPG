"""Cog Entrevista: toda semana o Jornalista manda DM com uma pergunta pra um
membro aleatório; a resposta é publicada formatada no jornal assim que chega
(não espera o próximo ciclo). Prioriza quem ainda não foi entrevistado, mas
permite repetir se o servidor for pequeno demais pra sempre ter gente nova."""

from __future__ import annotations

import logging
import random
from datetime import datetime, timedelta, timezone

import discord
from discord import app_commands
from discord.ext import commands, tasks

from core import entrevista_perguntas as perguntas_mod
from core import ui
from core.tasks_util import registrar_reinicio_em_erro

log = logging.getLogger("jornalista")

ENTREVISTA_INTERVALO_HORAS = 168  # semanal
ENTREVISTA_PRAZO_DIAS = 7


def _titulo_entrevista(autor: object) -> str:
    nome = str(getattr(autor, "display_name", autor)).strip() or "Convidado"
    nome = nome[:1].upper() + nome[1:190]
    return f"🎙️ Entrevista exclusiva com {nome} para o Jornal Lunar"


class RespostaEntrevistaModal(discord.ui.Modal, title="Responder à Entrevista"):
    resposta = discord.ui.TextInput(
        label="Sua resposta",
        style=discord.TextStyle.paragraph,
        max_length=1800,
        required=True,
    )

    def __init__(self, cog: "Entrevista", entrevista: dict):
        super().__init__()
        self.cog = cog
        self.entrevista = entrevista

    async def on_submit(self, interaction: discord.Interaction):
        resposta = str(self.resposta.value).strip()
        if not self.cog.bot.db.responder_entrevista(self.entrevista["id"], resposta):
            await interaction.response.send_message(
                "Essa entrevista não está mais pendente. Talvez ela já tenha expirado.", ephemeral=True
            )
            return
        await interaction.response.send_message(
            "✅ Recebi sua resposta! Já vou publicar no jornal do servidor. Obrigado!", ephemeral=True
        )
        await self.cog._publicar(
            self.entrevista["id"],
            self.entrevista["guild_id"],
            interaction.user,
            self.entrevista["pergunta"],
            resposta,
        )


class Entrevista(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot
        registrar_reinicio_em_erro(self.ciclo, "ciclo_entrevista", log)
        self.ciclo.start()

    def cog_unload(self):
        self.ciclo.cancel()

    @tasks.loop(hours=ENTREVISTA_INTERVALO_HORAS)
    async def ciclo(self):
        for guild in self.bot.guilds:
            gid = str(guild.id)
            try:
                await self._recuperar_pendentes(guild)
            except Exception:
                log.exception("erro ao recuperar entrevistas pendentes (guild %s)", guild.id)
            # tasks.loop dispara a primeira iteracao assim que o bot sobe: sem
            # isto, todo restart mandava uma entrevista nova por DM mesmo dias
            # antes do proximo ciclo semanal de verdade. _recuperar_pendentes
            # acima nao entra nesse controle: e so retry, sempre seguro rodar.
            if not self.bot.db.ciclo_guild_devido(gid, "entrevista", ENTREVISTA_INTERVALO_HORAS):
                continue
            try:
                await self._nova_entrevista(guild)
                self.bot.db.marcar_ciclo_guild(gid, "entrevista")
            except Exception:
                log.exception("erro no ciclo de entrevista (guild %s)", guild.id)

    async def _recuperar_pendentes(self, guild: discord.Guild) -> None:
        """Entrevistas já respondidas mas nunca publicadas (canal ausente na
        hora, falha de rede) ficariam presas pra sempre sem isso: o ciclo
        semanal é o único lugar onde dá pra tentar de novo."""
        gid = str(guild.id)
        pendentes = self.bot.db.listar_entrevistas_respondidas_nao_publicadas(gid)
        for entrevista in pendentes:
            autor = guild.get_member(int(entrevista["user_id"])) or entrevista["user_id"]
            await self._publicar(
                entrevista["id"], gid, autor, entrevista["pergunta"], entrevista["resposta"]
            )

    @ciclo.before_loop
    async def _antes(self):
        await self.bot.wait_until_ready()

    async def _nova_entrevista(self, guild: discord.Guild) -> None:
        gid = str(guild.id)
        db = self.bot.db
        db.expirar_entrevistas_antigas(
            gid, datetime.now(timezone.utc) - timedelta(days=ENTREVISTA_PRAZO_DIAS)
        )

        candidatos = [m for m in guild.members if not m.bot]
        if not candidatos:
            return
        ja_entrevistados = set(db.usuarios_ja_entrevistados(gid))
        novos = [m for m in candidatos if str(m.id) not in ja_entrevistados]
        alvo = random.choice(novos) if novos else random.choice(candidatos)

        pergunta = perguntas_mod.sortear_pergunta()
        try:
            await alvo.send(
                "👋 Olá! Sou o Jornalista do Jornal Lunar. Pergunta da semana:\n\n"
                f"**{pergunta}**\n\nResponda esta DM e eu publico no jornal do servidor!"
            )
        except (discord.Forbidden, discord.HTTPException):
            log.info("nao consegui mandar DM de entrevista pra %s", alvo.id)
            return
        db.criar_entrevista(gid, str(alvo.id), pergunta)

    @commands.Cog.listener()
    async def on_message(self, message: discord.Message):
        if message.guild is not None or message.author.bot:
            return
        entrevista = self.bot.db.entrevista_pendente_do_usuario(str(message.author.id))
        if entrevista is None:
            return
        resposta = (message.content or "").strip()
        if not resposta:
            try:
                await message.channel.send("Manda a resposta em texto, por favor: não consegui ler nada aí. 🙂")
            except discord.HTTPException:
                pass
            return
        resposta = resposta[:1800]
        if not self.bot.db.responder_entrevista(entrevista["id"], resposta):
            return
        try:
            await message.channel.send("✅ Recebi sua resposta! Já vou publicar no jornal do servidor. Obrigado!")
        except discord.HTTPException:
            pass
        await self._publicar(entrevista["id"], entrevista["guild_id"], message.author, entrevista["pergunta"], resposta)

    @app_commands.command(
        name="entrevista_responder",
        description="Responde à entrevista pendente do Jornal Lunar (use se sua DM estiver fechada).",
    )
    async def entrevista_responder(self, interaction: discord.Interaction):
        entrevista = self.bot.db.entrevista_pendente_do_usuario(str(interaction.user.id))
        if entrevista is None:
            await interaction.response.send_message(
                "Você não tem nenhuma entrevista pendente no momento.", ephemeral=True
            )
            return
        await interaction.response.send_modal(RespostaEntrevistaModal(self, entrevista))

    async def _publicar(self, entrevista_id: int, guild_id: str, autor, pergunta: str, resposta: str) -> None:
        canal_id = self.bot.db.get_canal_categoria(guild_id, "noticia")
        if not canal_id:
            return
        guild = self.bot.get_guild(int(guild_id))
        if guild is None:
            return
        canal = guild.get_channel(int(canal_id))
        if not isinstance(canal, discord.TextChannel):
            return
        emb = ui.embed(
            _titulo_entrevista(autor), categoria="noticia",
            descricao=f"**P:** {pergunta}\n\n**R:** {resposta}",
        )
        emb.set_author(name=getattr(autor, "display_name", str(autor)))
        try:
            await canal.send(embed=emb)
            self.bot.db.marcar_entrevista_publicada(entrevista_id)
        except discord.HTTPException:
            log.exception("falha ao publicar entrevista no canal %s", canal_id)


async def setup(bot: commands.Bot):
    await bot.add_cog(Entrevista(bot))
