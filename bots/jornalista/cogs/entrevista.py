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

from core import arvores as arvores_mod
from core import entrevista_perguntas as perguntas_mod
from core import furos as furos_mod
from core import publicacoes
from core import ui
from core.tasks_util import registrar_reinicio_em_erro

log = logging.getLogger("jornalista")

ENTREVISTA_INTERVALO_HORAS = 168  # semanal
ENTREVISTA_PRAZO_DIAS = 7
RESPOSTA_MAX = 1800

PUBLICAR_TEMPLATE = r"entrevista_ok:(?P<id>\d+)"
REFAZER_TEMPLATE = r"entrevista_refazer:(?P<id>\d+)"


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
        # Quem usa o comando como fallback de DM precisa enxergar a pergunta
        # dentro do próprio modal; antes aparecia apenas "Sua resposta".
        self.resposta.placeholder = str(entrevista.get("pergunta") or "")[:100]

    async def on_submit(self, interaction: discord.Interaction):
        resposta, erro = furos_mod.limpar_texto(
            self.resposta.value, minimo=1, maximo=RESPOSTA_MAX, tirar_mencoes=False, preservar_linhas=True,
        )
        if erro:
            await interaction.response.send_message(f"⚠️ {erro}", ephemeral=True)
            return
        if not self.cog.bot.db.responder_entrevista(self.entrevista["id"], resposta):
            await interaction.response.send_message(
                "Essa entrevista não está mais pendente. Talvez ela já tenha expirado.", ephemeral=True
            )
            return
        await interaction.response.send_message(
            "✅ Recebi sua resposta! Ela será publicada assim que o canal do jornal estiver disponível.",
            ephemeral=True,
        )
        await self.cog._publicar(
            self.entrevista["id"],
            self.entrevista["guild_id"],
            interaction.user,
            self.entrevista["pergunta"],
            resposta,
        )


class PublicarButton(discord.ui.DynamicItem[discord.ui.Button], template=PUBLICAR_TEMPLATE):
    """Confirma o preview da resposta. Persistente: sobrevive a reinício do bot."""

    def __init__(self, cog: "Entrevista", entrevista_id: int):
        super().__init__(discord.ui.Button(
            label="Publicar", emoji="✅", style=discord.ButtonStyle.success,
            custom_id=f"entrevista_ok:{int(entrevista_id)}",
        ))
        self.cog = cog
        self.entrevista_id = int(entrevista_id)

    @classmethod
    async def from_custom_id(cls, interaction: discord.Interaction, item, match):
        return cls(interaction.client.get_cog("Entrevista"), int(match["id"]))

    async def callback(self, interaction: discord.Interaction) -> None:
        await self.cog.publicar_rascunho(interaction, self.entrevista_id)


class RefazerButton(discord.ui.DynamicItem[discord.ui.Button], template=REFAZER_TEMPLATE):
    def __init__(self, cog: "Entrevista", entrevista_id: int):
        super().__init__(discord.ui.Button(
            label="Reescrever", emoji="✏️", style=discord.ButtonStyle.secondary,
            custom_id=f"entrevista_refazer:{int(entrevista_id)}",
        ))
        self.cog = cog
        self.entrevista_id = int(entrevista_id)

    @classmethod
    async def from_custom_id(cls, interaction: discord.Interaction, item, match):
        return cls(interaction.client.get_cog("Entrevista"), int(match["id"]))

    async def callback(self, interaction: discord.Interaction) -> None:
        await self.cog.refazer_rascunho(interaction, self.entrevista_id)


class Entrevista(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self.bot.add_dynamic_items(PublicarButton, RefazerButton)
        registrar_reinicio_em_erro(self.ciclo, "ciclo_entrevista", log)
        self.ciclo.start()

    def cog_unload(self):
        self.ciclo.cancel()

    # O intervalo do loop NAO pode ser ENTREVISTA_INTERVALO_HORAS (168): o
    # tasks.loop só reagenda a próxima iteração depois que a atual dorme o
    # período inteiro, e esse temporizador é em memória, então qualquer
    # restart do bot (redeploy na Discloud, crash) zera a contagem. Com o
    # loop de 168h, isso significa que a entrevista só dispara de verdade se
    # o bot ficar 7 dias ininterruptos no ar — o que basicamente nunca
    # acontece num bot em desenvolvimento ativo, e foi por isso que parou de
    # mandar entrevista pros players. Igual ciclo_resumo (cogs/jornal.py):
    # loop curto e frequente, com ciclo_guild_devido/marcar_ciclo_guild (no
    # Postgres, sobrevive a restart) controlando a cadência semanal de verdade.
    @tasks.loop(hours=1)
    async def ciclo(self):
        for guild in self.bot.guilds:
            gid = str(guild.id)
            if not self.bot.db.automacao_ativa(gid, "entrevistas", True):
                continue
            try:
                await self._recuperar_pendentes(guild)
            except Exception:
                log.exception("erro ao recuperar entrevistas pendentes (guild %s)", guild.id)
            if not self.bot.db.ciclo_guild_devido(gid, "entrevista", ENTREVISTA_INTERVALO_HORAS):
                continue
            try:
                # Só marca o ciclo como feito se uma entrevista foi realmente
                # criada: se não havia ninguém disponível agora, tenta de
                # novo na próxima hora em vez de esperar a semana inteira.
                if await self._nova_entrevista(guild):
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

    async def _nova_entrevista(self, guild: discord.Guild) -> bool:
        """True = uma entrevista nova foi criada (ciclo pode ficar quieto até
        a próxima semana). False = ninguém disponível agora — o chamador deve
        tentar de novo em breve em vez de esperar o intervalo todo."""
        gid = str(guild.id)
        db = self.bot.db
        db.expirar_entrevistas_antigas(
            gid, datetime.now(timezone.utc) - timedelta(days=ENTREVISTA_PRAZO_DIAS)
        )

        candidatos = [m for m in guild.members if not m.bot]
        if not candidatos:
            return False
        ja_entrevistados = set(db.usuarios_ja_entrevistados(gid))
        pendentes = set(db.usuarios_com_entrevista_pendente(gid))
        recusaram = set(db.usuarios_fora_das_entrevistas(gid))
        disponiveis = [
            m for m in candidatos
            if str(m.id) not in pendentes and str(m.id) not in recusaram
        ]
        if not disponiveis:
            return False
        novos = [m for m in disponiveis if str(m.id) not in ja_entrevistados]
        alvo = random.choice(novos) if novos else random.choice(disponiveis)

        pergunta = perguntas_mod.sortear_pergunta(
            arvore=self._arvore_do_membro(gid, alvo),
            recentes=db.perguntas_recentes_entrevista(gid),
        )
        # Persiste antes da tentativa de DM para o fallback
        # /entrevista_responder existir de verdade quando a DM estiver fechada.
        entrevista_id = db.criar_entrevista(gid, str(alvo.id), pergunta)
        # Daqui em diante a entrevista EXISTE. Qualquer erro ao avisar a pessoa (DM, convite no canal)
        # é registrado e engolido: se subisse, o ciclo não seria marcado como feito e a próxima hora
        # sortearia OUTRA pessoa, e assim por diante, mandando uma entrevista por hora.
        try:
            await alvo.send(
                "👋 Olá! Sou o Jornalista do Jornal Lunar. Pergunta da semana:\n\n"
                f"**{pergunta}**\n\nResponda esta DM, eu mostro como vai ficar e você confirma antes de eu "
                "publicar no jornal do servidor."
            )
        except (discord.Forbidden, discord.HTTPException):
            log.info("nao consegui mandar DM de entrevista pra %s", alvo.id)
            try:
                await self._avisar_entrevista_sem_dm(guild, alvo, pergunta, entrevista_id)
            except Exception:
                log.exception("falha ao publicar o convite da entrevista %s", entrevista_id)
        except Exception:
            log.exception("erro inesperado ao avisar %s da entrevista %s", alvo.id, entrevista_id)
        return True

    def _arvore_do_membro(self, gid: str, membro) -> "str | None":
        """Nome da Árvore do entrevistado, pelo cargo de Árvore registrado
        (`/registro cargo_arvore`). Sem cargo, sem pergunta de Árvore."""
        try:
            cargos = self.bot.db.get_cargos_arvore(gid)
        except Exception:
            log.exception("nao consegui ler os cargos de Arvore (guild %s)", gid)
            return None
        meus = {str(getattr(cargo, "id", cargo)) for cargo in getattr(membro, "roles", [])}
        for arvore in arvores_mod.ARVORES:
            if cargos.get(arvore.id) and str(cargos[arvore.id]) in meus:
                return arvore.nome
        return None

    async def _avisar_entrevista_sem_dm(
        self, guild: discord.Guild, alvo: discord.Member, pergunta: str,
        entrevista_id: int,
    ) -> None:
        canal_id = self.bot.db.get_canal_categoria(str(guild.id), "noticia")
        canal = guild.get_channel(int(canal_id)) if canal_id else None
        emb = ui.embed(
            "🎙️ Entrevista da semana",
            categoria="noticia",
            descricao=(
                f"{alvo.mention}, não consegui entregar sua entrevista por DM. "
                "Use `/entrevista_responder` neste servidor.\n\n"
                f"**Pergunta:** {pergunta}"
            ),
        )
        await publicacoes.publicar_ou_enfileirar(
            self.bot,
            guild_id=str(guild.id),
            embed=emb,
            origem="convite_entrevista",
            dedupe_key=f"convite-entrevista:{entrevista_id}",
            categoria="noticia",
            canal_id=str(canal.id) if isinstance(canal, discord.TextChannel) else None,
            automacao="entrevistas",
            mencoes="usuarios",
        )

    @commands.Cog.listener()
    async def on_message(self, message: discord.Message):
        if message.guild is not None or message.author.bot:
            return
        entrevista = self.bot.db.entrevista_pendente_do_usuario(str(message.author.id))
        if entrevista is None:
            return
        texto = (message.content or "").strip()
        if not texto:
            await self._responder_dm(message.channel, "Manda a resposta em texto, por favor: não consegui ler nada aí. 🙂")
            return
        resposta, erro = furos_mod.limpar_texto(
            texto, minimo=1, maximo=RESPOSTA_MAX, tirar_mencoes=False, preservar_linhas=True,
        )
        if erro:
            await self._responder_dm(message.channel, f"⚠️ {erro} Tente de novo.")
            return
        if not self.bot.db.salvar_rascunho_entrevista(entrevista["id"], resposta):
            return
        # Nada é publicado só porque a pessoa mandou uma mensagem: ela pode estar conversando com o bot.
        # Primeiro um preview, depois o botão.
        emb = ui.embed(
            "👀 Assim vai ficar no jornal", categoria="noticia",
            descricao=f"**P:** {entrevista['pergunta']}\n\n**R:** {resposta}",
        )
        try:
            await message.channel.send(
                "Confira abaixo. Se estiver bom, toque em **Publicar**. Para mudar, toque em **Reescrever** "
                "ou mande outra resposta.",
                embed=emb, view=self.view_do(entrevista["id"]),
            )
        except discord.HTTPException:
            log.info("nao consegui mandar o preview da entrevista %s", entrevista["id"])

    async def _responder_dm(self, canal, texto: str) -> None:
        try:
            await canal.send(texto)
        except discord.HTTPException:
            pass

    def view_do(self, entrevista_id: int) -> discord.ui.View:
        view = discord.ui.View(timeout=None)
        view.add_item(PublicarButton(self, entrevista_id))
        view.add_item(RefazerButton(self, entrevista_id))
        return view

    async def publicar_rascunho(self, interaction: discord.Interaction, entrevista_id: int) -> None:
        entrevista = self.bot.db.get_entrevista(entrevista_id)
        if entrevista is None or entrevista["user_id"] != str(interaction.user.id):
            await interaction.response.send_message("Essa entrevista não é sua.", ephemeral=True)
            return
        if entrevista["status"] != "pendente" or not entrevista.get("rascunho"):
            await self._fechar_preview(interaction, "Essa entrevista já foi publicada ou não está mais aberta.")
            return
        resposta = entrevista["rascunho"]
        if not self.bot.db.responder_entrevista(entrevista["id"], resposta):
            await self._fechar_preview(interaction, "Essa entrevista já foi publicada ou não está mais aberta.")
            return
        await self._fechar_preview(interaction, "✅ Publicado! Obrigado por participar do Jornal Lunar.")
        await self._publicar(entrevista["id"], entrevista["guild_id"], interaction.user, entrevista["pergunta"], resposta)

    async def refazer_rascunho(self, interaction: discord.Interaction, entrevista_id: int) -> None:
        entrevista = self.bot.db.get_entrevista(entrevista_id)
        if entrevista is None or entrevista["user_id"] != str(interaction.user.id):
            await interaction.response.send_message("Essa entrevista não é sua.", ephemeral=True)
            return
        if entrevista["status"] == "pendente":
            self.bot.db.limpar_rascunho_entrevista(entrevista["id"])
        await self._fechar_preview(interaction, "Tudo bem, descartei esse rascunho. Mande a nova resposta quando quiser.")

    async def _fechar_preview(self, interaction: discord.Interaction, texto: str) -> None:
        try:
            await interaction.response.edit_message(content=texto, embed=None, view=None)
        except discord.HTTPException:
            if not interaction.response.is_done():
                await interaction.response.send_message(texto, ephemeral=True)

    @app_commands.command(
        name="entrevista_responder",
        description="Responde à entrevista pendente do Jornal Lunar (use se sua DM estiver fechada).",
    )
    async def entrevista_responder(self, interaction: discord.Interaction):
        guild_id = str(interaction.guild_id) if interaction.guild_id else None
        entrevista = self.bot.db.entrevista_pendente_do_usuario(
            str(interaction.user.id), guild_id
        )
        if entrevista is None:
            await interaction.response.send_message(
                "Você não tem nenhuma entrevista pendente no momento.", ephemeral=True
            )
            return
        await interaction.response.send_modal(RespostaEntrevistaModal(self, entrevista))

    @app_commands.command(
        name="entrevista_participar",
        description="Escolhe se você pode ser sorteado para entrevistas do Jornal Lunar.",
    )
    @app_commands.guild_only()
    async def entrevista_participar(
        self, interaction: discord.Interaction, participar: bool
    ):
        self.bot.db.set_participacao_entrevista(
            str(interaction.guild_id), str(interaction.user.id), participar
        )
        await interaction.response.send_message(
            "✅ Você voltou a participar das entrevistas."
            if participar else
            "⏸️ Você não será mais sorteado; entrevistas pendentes foram canceladas.",
            ephemeral=True,
        )

    async def _publicar(self, entrevista_id: int, guild_id: str, autor, pergunta: str, resposta: str) -> None:
        canal_id = self.bot.db.get_canal_categoria(guild_id, "noticia")
        guild = self.bot.get_guild(int(guild_id))
        canal = guild.get_channel(int(canal_id)) if guild and canal_id else None
        if guild is not None and not isinstance(autor, discord.Member) and hasattr(autor, "id"):
            # Numa DM o autor é um User (nome global). No servidor ele tem o apelido que a mesa conhece.
            autor = guild.get_member(autor.id) or autor
        emb = ui.embed(
            _titulo_entrevista(autor), categoria="noticia",
            descricao=f"**P:** {pergunta}\n\n**R:** {resposta}",
        )
        emb.set_author(name=getattr(autor, "display_name", str(autor)))
        await publicacoes.publicar_ou_enfileirar(
            self.bot,
            guild_id=guild_id,
            embed=emb,
            origem="entrevista",
            referencia=str(entrevista_id),
            dedupe_key=f"entrevista:{entrevista_id}",
            categoria="noticia",
            canal_id=str(canal.id) if isinstance(canal, discord.TextChannel) else None,
            automacao="entrevistas",
        )


async def setup(bot: commands.Bot):
    await bot.add_cog(Entrevista(bot))
