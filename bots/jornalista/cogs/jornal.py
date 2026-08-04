"""
Cog Jornal: comandos de conteúdo do Jornalista, agrupados em /jornal.

Passo 1 (17/07/2026): /jornal publicar.
Passo 3 (17/07/2026): /jornal estacao_definir + /jornal avancar_mes: a
estação (docs/Plano_Jornalista.md, Decisão 2) e o clima do mês, que ela restringe.
/estacao é a versão de leitura, fora do grupo (qualquer jogador pode ver,
não só o mestre: o grupo /jornal inteiro é master-only).

O registro por Árvore/idade/pronomes virou um sistema próprio, configurável
por botões (estilo Zira), em cogs/registro.py (grupo /registro).
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional
from urllib.parse import urlparse

import discord
from discord import app_commands
from discord.ext import commands, tasks

from core import clima as clima_mod
from core import economia
from core import enigmas as enigmas_mod
from core import ui
from core.tasks_util import registrar_reinicio_em_erro

log = logging.getLogger("jornalista")

ESTACAO_CHOICES = [
    app_commands.Choice(name=info["rotulo"], value=chave)
    for chave, info in economia.ESTACOES.items()
]

TIPOS_MENSAGEM = [
    app_commands.Choice(name="Entrada (quando alguém entra)", value="chegada"),
    app_commands.Choice(name="Saída (quando alguém sai)", value="partida"),
]

# Cada categoria de conteúdo pode ir pra um canal próprio; sem rota específica,
# cai no canal principal do Jornalista (/jornal principal).
CATEGORIAS_CANAL = [
    app_commands.Choice(name="Entrada de membro", value="chegada"),
    app_commands.Choice(name="Saída de membro", value="partida"),
    app_commands.Choice(name="Notícia (/jornal publicar)", value="noticia"),
    app_commands.Choice(name="Clima e estação", value="clima"),
    app_commands.Choice(name="Dinheiro e economia", value="dinheiro"),
]


def _url_imagem_valida(url: str) -> bool:
    if not url:
        return True
    parsed = urlparse(url)
    return parsed.scheme == "https" and bool(parsed.netloc)


def montar_embed_noticia(
    titulo: str,
    resumo: str,
    corpo: str,
    autoria: str,
    imagem_url: str = "",
) -> discord.Embed:
    """Monta a prévia e a publicação a partir dos mesmos dados validados."""
    resumo = resumo.strip()
    descricao = f"*{resumo}*\n\n{corpo.strip()}" if resumo else corpo.strip()
    emb = ui.embed(
        f"{ui.icone_categoria('noticia')} {titulo.strip()}",
        categoria="noticia",
        descricao=descricao,
    )
    if autoria.strip():
        emb.set_author(name=f"Por {autoria.strip()}"[:256])
    if imagem_url.strip():
        emb.set_image(url=imagem_url.strip())
    emb.timestamp = discord.utils.utcnow()
    return emb


def _bot_pode_publicar(canal: discord.TextChannel) -> bool:
    guild = canal.guild
    membro = guild.me
    if membro is None:
        return False
    permissoes = canal.permissions_for(membro)
    return bool(
        permissoes.view_channel
        and permissoes.send_messages
        and permissoes.embed_links
    )


def _usuario_e_mestre(interaction: discord.Interaction) -> bool:
    return isinstance(interaction.user, discord.Member) and bool(
        interaction.user.guild_permissions.manage_guild
    )


class PublicarNoticiaView(discord.ui.View):
    def __init__(
        self,
        *,
        autor_id: int,
        canal: discord.TextChannel,
        embed: discord.Embed,
        timeout: float = 300,
    ):
        super().__init__(timeout=timeout)
        self.autor_id = autor_id
        self.canal = canal
        self.embed = embed
        self.finalizado = False
        self.mensagem: Optional[discord.Message] = None

    async def interaction_check(self, interaction: discord.Interaction) -> bool:
        if interaction.user.id != self.autor_id:
            await interaction.response.send_message(
                "Só quem criou esta prévia pode publicar ou cancelar.",
                ephemeral=True,
            )
            return False
        if not _usuario_e_mestre(interaction):
            await interaction.response.send_message(
                "Você precisa da permissão **Gerenciar Servidor** para publicar.",
                ephemeral=True,
            )
            return False
        return True

    def _desabilitar(self) -> None:
        for item in self.children:
            item.disabled = True

    @discord.ui.button(label="Publicar", emoji="📰", style=discord.ButtonStyle.success)
    async def publicar(self, interaction: discord.Interaction, button: discord.ui.Button):
        # A trava acontece antes do primeiro await para impedir clique duplo.
        if self.finalizado:
            await interaction.response.send_message(
                "Esta prévia já foi finalizada.", ephemeral=True
            )
            return
        self.finalizado = True
        self._desabilitar()
        await interaction.response.defer()

        if not _bot_pode_publicar(self.canal):
            self.finalizado = False
            for item in self.children:
                item.disabled = False
            await interaction.edit_original_response(
                content=(
                    f"⚠️ Não consigo publicar em {self.canal.mention}. "
                    "Confira **Ver canal**, **Enviar mensagens** e **Inserir links**."
                ),
                embed=self.embed,
                view=self,
            )
            return

        try:
            mensagem = await self.canal.send(
                embed=self.embed,
                allowed_mentions=discord.AllowedMentions.none(),
            )
        except discord.HTTPException:
            log.exception("falha ao publicar noticia confirmada no canal %s", self.canal.id)
            self.finalizado = False
            for item in self.children:
                item.disabled = False
            await interaction.edit_original_response(
                content="⚠️ Não consegui publicar. Confira as permissões do canal e tente novamente.",
                embed=self.embed,
                view=self,
            )
            return

        button.label = "Publicado"
        self.stop()
        await interaction.edit_original_response(
            content=f"✅ Notícia publicada em {self.canal.mention}: {mensagem.jump_url}",
            embed=self.embed,
            view=self,
        )

    @discord.ui.button(label="Cancelar", emoji="✖️", style=discord.ButtonStyle.secondary)
    async def cancelar(self, interaction: discord.Interaction, button: discord.ui.Button):
        if self.finalizado:
            await interaction.response.send_message(
                "Esta prévia já foi finalizada.", ephemeral=True
            )
            return
        self.finalizado = True
        self._desabilitar()
        self.stop()
        await interaction.response.edit_message(
            content="Publicação cancelada. Nada foi enviado ao canal.",
            embed=None,
            view=self,
        )

    async def on_timeout(self) -> None:
        if self.finalizado:
            return
        self.finalizado = True
        self._desabilitar()
        if self.mensagem is not None:
            try:
                await self.mensagem.edit(view=self)
            except discord.HTTPException:
                pass


class NoticiaModal(discord.ui.Modal, title="Criar notícia do Jardim"):
    titulo_noticia = discord.ui.TextInput(
        label="Título",
        placeholder="A manchete principal",
        min_length=1,
        max_length=200,
    )
    resumo = discord.ui.TextInput(
        label="Resumo",
        placeholder="Uma chamada curta (opcional)",
        required=False,
        max_length=450,
    )
    corpo = discord.ui.TextInput(
        label="Corpo da notícia",
        placeholder="Conte o que aconteceu no Jardim…",
        style=discord.TextStyle.paragraph,
        min_length=1,
        max_length=3500,
    )
    autoria = discord.ui.TextInput(
        label="Autoria",
        placeholder="Ex.: Jornal Lunar (opcional)",
        required=False,
        max_length=100,
    )
    imagem_url = discord.ui.TextInput(
        label="URL da imagem",
        placeholder="https://… (opcional)",
        required=False,
        max_length=500,
    )

    def __init__(self, *, canal: discord.TextChannel, autor_id: int):
        super().__init__(timeout=300)
        self.canal = canal
        self.autor_id = autor_id

    async def interaction_check(self, interaction: discord.Interaction) -> bool:
        if interaction.user.id != self.autor_id:
            await interaction.response.send_message(
                "Esta notícia pertence a outra pessoa.", ephemeral=True
            )
            return False
        if not _usuario_e_mestre(interaction):
            await interaction.response.send_message(
                "Você precisa da permissão **Gerenciar Servidor**.", ephemeral=True
            )
            return False
        return True

    async def on_submit(self, interaction: discord.Interaction) -> None:
        imagem_url = self.imagem_url.value.strip()
        if not _url_imagem_valida(imagem_url):
            await interaction.response.send_message(
                "⚠️ A imagem precisa ser uma URL HTTPS válida. Nada foi publicado.",
                ephemeral=True,
            )
            return

        emb = montar_embed_noticia(
            self.titulo_noticia.value,
            self.resumo.value,
            self.corpo.value,
            self.autoria.value,
            imagem_url,
        )
        view = PublicarNoticiaView(
            autor_id=self.autor_id,
            canal=self.canal,
            embed=emb,
        )
        await interaction.response.send_message(
            content=f"**Prévia privada** · destino: {self.canal.mention}",
            embed=emb,
            view=view,
            ephemeral=True,
            allowed_mentions=discord.AllowedMentions.none(),
        )
        try:
            view.mensagem = await interaction.original_response()
        except discord.HTTPException:
            pass

    async def on_error(self, interaction: discord.Interaction, error: Exception) -> None:
        log.exception("erro no modal de noticia", exc_info=error)
        mensagem = "⚠️ Não consegui montar a prévia. Tente novamente."
        if interaction.response.is_done():
            await interaction.followup.send(mensagem, ephemeral=True)
        else:
            await interaction.response.send_message(mensagem, ephemeral=True)


# A cada quanto tempo (quando ligado) o Jornal Lunar publica o clima sazonal.
CLIMA_AUTO_INTERVALO_HORAS = 48

# A cada quanto tempo (quando ligado) a estação avança sozinha (1 semana).
ESTACAO_AUTO_INTERVALO_HORAS = 168

# A cada quanto tempo o ciclo verifica baús agendados por /jornal rumor.
RUMOR_CICLO_MINUTOS = 5

DESAFIO_RESPONDER_TEMPLATE = r"jornal_desafio:(?P<token>[0-9a-f]{32})"


class DesafioResponderButton(discord.ui.DynamicItem[discord.ui.Button], template=DESAFIO_RESPONDER_TEMPLATE):
    """Botão do /jornal desafio. Mesmo esquema de token dos baús
    (cogs/baus.py): o custom_id precisa existir antes do id da mensagem, e o
    estado persistido em `jornal_desafios` é o que sobrevive a um reinício
    do bot enquanto o desafio ainda está em aberto."""

    def __init__(self, cog: "Jornal", token: str):
        super().__init__(
            discord.ui.Button(
                label="Responder 🎯",
                style=discord.ButtonStyle.primary,
                custom_id=f"jornal_desafio:{token}",
            )
        )
        self.cog = cog
        self.token = token

    @classmethod
    async def from_custom_id(cls, interaction: discord.Interaction, item, match):
        return cls(interaction.client.get_cog("Jornal"), match["token"])

    async def callback(self, interaction: discord.Interaction) -> None:
        await self.cog.abrir_modal_desafio(interaction, self.token)


class DesafioModal(discord.ui.Modal, title="Responder ao Desafio"):
    resposta = discord.ui.TextInput(label="Sua resposta", max_length=200)

    def __init__(self, cog: "Jornal", token: str):
        super().__init__(timeout=180)
        self.cog = cog
        self.token = token

    async def on_submit(self, interaction: discord.Interaction):
        await self.cog.resolver_desafio(interaction, self.token, str(self.resposta.value))


def _view_desafio(cog: "Jornal", token: str) -> discord.ui.View:
    view = discord.ui.View(timeout=None)
    view.add_item(DesafioResponderButton(cog, token))
    return view


def _view_desafio_resolvido() -> discord.ui.View:
    view = discord.ui.View(timeout=None)
    view.add_item(discord.ui.Button(label="Desafio resolvido", style=discord.ButtonStyle.secondary, disabled=True))
    return view


class Jornal(commands.Cog):
    jornal = app_commands.Group(
        name="jornal",
        description="Comandos de conteúdo do jornal do Jardim.",
        default_permissions=discord.Permissions(manage_guild=True),
    )

    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self.bot.add_dynamic_items(DesafioResponderButton)
        registrar_reinicio_em_erro(self.ciclo_clima, "ciclo_clima", log)
        registrar_reinicio_em_erro(self.ciclo_estacao_auto, "ciclo_estacao_auto", log)
        registrar_reinicio_em_erro(self.ciclo_rumores, "ciclo_rumores", log)
        self.ciclo_clima.start()
        self.ciclo_estacao_auto.start()
        self.ciclo_rumores.start()

    def cog_unload(self):
        self.ciclo_clima.cancel()
        self.ciclo_estacao_auto.cancel()
        self.ciclo_rumores.cancel()

    # ── Clima sazonal automático (opt-in por guild via /jornal clima_auto) ────
    @tasks.loop(hours=CLIMA_AUTO_INTERVALO_HORAS)
    async def ciclo_clima(self):
        for gid in self.bot.db.listar_guilds_clima_auto():
            # tasks.loop dispara a primeira iteracao assim que o bot sobe: sem
            # isto, todo restart (cada deploy na Discloud) publicava clima de
            # novo mesmo horas depois do ultimo.
            if not self.bot.db.ciclo_guild_devido(gid, "clima_auto", CLIMA_AUTO_INTERVALO_HORAS):
                continue
            try:
                await self._publicar_clima_auto(gid)
                self.bot.db.marcar_ciclo_guild(gid, "clima_auto")
            except Exception:
                log.exception("erro no ciclo de clima automatico (guild %s)", gid)

    @ciclo_clima.before_loop
    async def _antes_ciclo_clima(self):
        await self.bot.wait_until_ready()

    # ── Rotação automática de estação (opt-in via /jornal estacao_auto) ──────
    @tasks.loop(hours=ESTACAO_AUTO_INTERVALO_HORAS)
    async def ciclo_estacao_auto(self):
        for gid in self.bot.db.listar_guilds_estacao_auto():
            # tasks.loop dispara a primeira iteracao assim que o bot sobe: sem
            # isto, todo restart avancava a estacao de novo mesmo dias antes
            # do proximo avanco semanal de verdade.
            if not self.bot.db.ciclo_guild_devido(gid, "estacao_auto", ESTACAO_AUTO_INTERVALO_HORAS):
                continue
            try:
                await self._avancar_estacao_auto(gid)
                self.bot.db.marcar_ciclo_guild(gid, "estacao_auto")
            except Exception:
                log.exception("erro no ciclo de rotacao automatica de estacao (guild %s)", gid)

    @ciclo_estacao_auto.before_loop
    async def _antes_ciclo_estacao_auto(self):
        await self.bot.wait_until_ready()

    async def _avancar_estacao_auto(self, gid: str) -> None:
        atual = self.bot.db.get_estacao(gid)
        proxima = economia.proxima_estacao_normal(atual)
        self.bot.db.set_estacao(gid, proxima)
        info = economia.estacao_info(proxima)
        canal_id = self.bot.db.get_canal_categoria(gid, "clima")
        if not canal_id:
            return
        guild = self.bot.get_guild(int(gid))
        if guild is None:
            return
        canal = guild.get_channel(int(canal_id))
        if not isinstance(canal, discord.TextChannel):
            return
        emb = ui.embed(
            f"{ui.icone_categoria('clima')} A estação do Jardim mudou sozinha: {info['rotulo']}",
            categoria="clima",
            descricao=info["descricao"],
        )
        try:
            await canal.send(embed=emb)
        except discord.HTTPException:
            log.exception("falha ao publicar rotacao automatica de estacao no canal %s", canal_id)

    def _montar_embed_clima(self, guild_id: str) -> discord.Embed:
        """Boletim do Jornal Lunar para o clima da estação atual."""
        estacao = self.bot.db.get_estacao(guild_id)
        info_estacao = economia.estacao_info(estacao)
        item_clima = clima_mod.sortear_clima(estacao)
        emb = ui.embed(
            f"{ui.icone_categoria('clima')} JORNAL LUNAR: {info_estacao['rotulo']}",
            categoria="clima",
            descricao=f"**Previsão do tempo: {item_clima.nome}**\n{item_clima.efeito}",
        )
        emb.set_footer(text=f"{ui.MARCA} · Efeito narrativo: combine com o mestre")
        return emb

    async def _publicar_clima_auto(self, gid: str) -> None:
        canal_id = self.bot.db.get_canal_categoria(gid, "clima")
        if not canal_id:
            return
        guild = self.bot.get_guild(int(gid))
        if guild is None:
            return
        canal = guild.get_channel(int(canal_id))
        if not isinstance(canal, discord.TextChannel):
            return
        try:
            await canal.send(embed=self._montar_embed_clima(gid))
        except discord.HTTPException:
            log.exception("falha ao publicar clima automatico no canal %s", canal_id)

    async def _canal_do_jornal(
        self, interaction: discord.Interaction, categoria: str = "noticia"
    ) -> Optional[discord.TextChannel]:
        """Resolve o canal da categoria (roteamento por `/jornal canal`), caindo
        no canal principal (`/jornal principal`). Responde o erro
        apropriado e devolve None quando não há canal utilizável."""
        if not interaction.guild_id or not interaction.guild:
            await interaction.response.send_message("⚠️ Isso só funciona dentro de um servidor.", ephemeral=True)
            return None
        canal_id = self.bot.db.get_canal_categoria(str(interaction.guild_id), categoria)
        if not canal_id:
            await interaction.response.send_message(
                "⚠️ Nenhum canal de jornal configurado. Use `/jornal principal` ou `/jornal canal`.",
                ephemeral=True,
            )
            return None
        canal = interaction.guild.get_channel(int(canal_id))
        if canal is None:
            await interaction.response.send_message(
                "⚠️ O canal configurado não existe mais (ou o bot não tem acesso a ele).",
                ephemeral=True,
            )
            return None
        return canal

    @jornal.command(name="publicar", description="Cria uma notícia com formulário, prévia e confirmação.")
    @app_commands.checks.has_permissions(manage_guild=True)
    async def publicar(self, interaction: discord.Interaction):
        canal = await self._canal_do_jornal(interaction)
        if canal is None:
            return
        if not _bot_pode_publicar(canal):
            await interaction.response.send_message(
                f"⚠️ Não consigo publicar em {canal.mention}. Confira minhas permissões no canal.",
                ephemeral=True,
            )
            return
        await interaction.response.send_modal(
            NoticiaModal(canal=canal, autor_id=interaction.user.id)
        )

    @jornal.command(name="principal", description="Define o canal principal do Jornalista.")
    @app_commands.describe(canal="Fallback para notícias, clima, avisos e boas-vindas.")
    @app_commands.checks.has_permissions(manage_guild=True)
    async def principal(
        self, interaction: discord.Interaction, canal: discord.TextChannel
    ):
        if not interaction.guild_id:
            await interaction.response.send_message(
                "⚠️ Isso só funciona dentro de um servidor.", ephemeral=True
            )
            return
        if not _bot_pode_publicar(canal):
            await interaction.response.send_message(
                "⚠️ Preciso de **Ver canal**, **Enviar mensagens** e **Inserir links** nesse canal.",
                ephemeral=True,
            )
            return
        self.bot.db.set_jornal_canal(str(interaction.guild_id), str(canal.id))
        await interaction.response.send_message(
            f"📰 Canal principal do Jornalista definido como {canal.mention}.",
            ephemeral=True,
        )

    @jornal.command(name="estacao_definir", description="Define a estação do Jardim (muda o peso de raridade do loot).")
    @app_commands.checks.has_permissions(manage_guild=True)
    @app_commands.describe(estacao="Nova estação do Jardim")
    @app_commands.choices(estacao=ESTACAO_CHOICES)
    async def estacao_definir(self, interaction: discord.Interaction, estacao: app_commands.Choice[str]):
        if not interaction.guild_id:
            await interaction.response.send_message("⚠️ Isso só funciona dentro de um servidor.", ephemeral=True)
            return
        self.bot.db.set_estacao(str(interaction.guild_id), estacao.value)
        info = economia.estacao_info(estacao.value)
        await interaction.response.send_message(
            f"🍂 Estação: **{info['rotulo']}**: {info['descricao']}", ephemeral=True
        )

        canal_id = self.bot.db.get_canal_categoria(str(interaction.guild_id), "clima")
        if not canal_id or not interaction.guild:
            return
        canal = interaction.guild.get_channel(int(canal_id))
        if canal is None:
            return
        emb = ui.embed(
            f"{ui.icone_categoria('clima')} A estação do Jardim mudou: {info['rotulo']}",
            categoria="clima",
            descricao=info["descricao"],
        )
        try:
            await canal.send(embed=emb)
        except discord.HTTPException:
            log.exception("falha ao publicar mudanca de estacao no canal %s", canal_id)

    @jornal.command(name="avancar_mes", description="Sorteia o clima do mês, restrito pela estação atual.")
    @app_commands.checks.has_permissions(manage_guild=True)
    async def avancar_mes(self, interaction: discord.Interaction):
        canal = await self._canal_do_jornal(interaction, "clima")
        if canal is None:
            return
        emb = self._montar_embed_clima(str(interaction.guild_id))
        try:
            await canal.send(embed=emb)
        except discord.HTTPException as exc:
            log.exception("falha ao publicar clima do mes no canal %s", canal.id)
            await interaction.response.send_message(f"⚠️ Não consegui publicar no canal: {exc}", ephemeral=True)
            return
        await interaction.response.send_message(f"✅ Publicado em {canal.mention}.", ephemeral=True)

    @jornal.command(name="clima_auto", description="Liga/desliga o boletim automático do clima no Jornal Lunar.")
    @app_commands.checks.has_permissions(manage_guild=True)
    @app_commands.describe(ligar="Ligar (True) ou desligar (False) a publicação automática.")
    async def clima_auto(self, interaction: discord.Interaction, ligar: bool):
        if not interaction.guild_id:
            await interaction.response.send_message("⚠️ Isso só funciona dentro de um servidor.", ephemeral=True)
            return
        gid = str(interaction.guild_id)
        self.bot.db.set_clima_auto(gid, ligar)
        if ligar and not self.bot.db.get_canal_categoria(gid, "clima"):
            await interaction.response.send_message(
                "✅ Clima automático **ligado**: mas nenhum canal de clima está configurado ainda. "
                "Use `/jornal canal clima <canal>` pra ele ter onde publicar.",
                ephemeral=True,
            )
            return
        if ligar:
            msg = (
                "✅ Clima automático **ligado**: o boletim do Jornal Lunar sai a cada "
                f"~{CLIMA_AUTO_INTERVALO_HORAS}h no canal de clima."
            )
        else:
            msg = "✅ Clima automático **desligado**: só sai quando você rodar `/jornal avancar_mes`."
        await interaction.response.send_message(msg, ephemeral=True)

    @jornal.command(name="estacao_auto", description="Liga/desliga a rotação automática de estação (avança 1x/semana).")
    @app_commands.checks.has_permissions(manage_guild=True)
    @app_commands.describe(ligar="Ligar (True) ou desligar (False) a rotação automática.")
    async def estacao_auto(self, interaction: discord.Interaction, ligar: bool):
        if not interaction.guild_id:
            await interaction.response.send_message("⚠️ Isso só funciona dentro de um servidor.", ephemeral=True)
            return
        gid = str(interaction.guild_id)
        self.bot.db.set_estacao_auto(gid, ligar)
        if ligar and not self.bot.db.get_canal_categoria(gid, "clima"):
            await interaction.response.send_message(
                "✅ Rotação automática de estação **ligada**: mas nenhum canal de clima está configurado ainda. "
                "Use `/jornal canal clima <canal>` pra ela ter onde publicar.",
                ephemeral=True,
            )
            return
        if ligar:
            msg = (
                "✅ Rotação automática **ligada**: a estação avança sozinha pro próximo ponto do ciclo "
                f"(Primavera → Verão → Outono → Inverno → …) a cada ~{ESTACAO_AUTO_INTERVALO_HORAS // 24} dias. "
                "As estações especiais continuam só na mão, via `/jornal estacao_definir`."
            )
        else:
            msg = "✅ Rotação automática **desligada**: a estação só muda com `/jornal estacao_definir`."
        await interaction.response.send_message(msg, ephemeral=True)

    @jornal.command(name="mensagem", description="Define o texto de entrada ou saída de membros (use {mencao} e {nome}).")
    @app_commands.checks.has_permissions(manage_guild=True)
    @app_commands.describe(tipo="Qual mensagem editar", texto="Texto novo. Placeholders: {mencao} e {nome}.")
    @app_commands.choices(tipo=TIPOS_MENSAGEM)
    async def mensagem(
        self,
        interaction: discord.Interaction,
        tipo: app_commands.Choice[str],
        texto: app_commands.Range[str, 1, 2000],
    ):
        if not interaction.guild_id:
            await interaction.response.send_message("⚠️ Isso só funciona dentro de um servidor.", ephemeral=True)
            return
        self.bot.db.set_mensagem(str(interaction.guild_id), tipo.value, texto)
        previa = texto.replace("{mencao}", interaction.user.mention).replace("{nome}", interaction.user.display_name)
        await interaction.response.send_message(
            f"✅ Mensagem de **{tipo.name}** atualizada. Prévia:\n\n{previa}", ephemeral=True
        )

    @jornal.command(name="mensagem_ver", description="Mostra o texto atual (personalizado ou padrão) de entrada/saída.")
    @app_commands.checks.has_permissions(manage_guild=True)
    @app_commands.describe(tipo="Qual mensagem ver")
    @app_commands.choices(tipo=TIPOS_MENSAGEM)
    async def mensagem_ver(self, interaction: discord.Interaction, tipo: app_commands.Choice[str]):
        if not interaction.guild_id:
            await interaction.response.send_message("⚠️ Isso só funciona dentro de um servidor.", ephemeral=True)
            return
        atual = self.bot.db.get_mensagem(str(interaction.guild_id), tipo.value)
        origem = "personalizada" if atual else "padrão do bot (sorteia entre várias)"
        corpo = (atual or "").strip() or "Sem texto personalizado. Usa os padrões embutidos."
        await interaction.response.send_message(
            f"**{tipo.name}**: {origem}:\n\n{corpo}\n\n"
            "Placeholders: `{mencao}` (menciona quem entrou) · `{nome}` (nome de quem saiu).",
            ephemeral=True,
        )

    @jornal.command(name="canal", description="Define em qual canal cada tipo de conteúdo do jornal é publicado.")
    @app_commands.checks.has_permissions(manage_guild=True)
    @app_commands.describe(categoria="Tipo de conteúdo", canal="Canal de destino")
    @app_commands.choices(categoria=CATEGORIAS_CANAL)
    async def canal(
        self,
        interaction: discord.Interaction,
        categoria: app_commands.Choice[str],
        canal: discord.TextChannel,
    ):
        if not interaction.guild_id:
            await interaction.response.send_message("⚠️ Isso só funciona dentro de um servidor.", ephemeral=True)
            return
        self.bot.db.set_canal_categoria(str(interaction.guild_id), categoria.value, str(canal.id))
        await interaction.response.send_message(
            f"✅ **{categoria.name}** agora é publicado em {canal.mention}.", ephemeral=True
        )

    @jornal.command(name="canais", description="Mostra em que canal cada tipo de conteúdo é publicado.")
    @app_commands.checks.has_permissions(manage_guild=True)
    async def canais(self, interaction: discord.Interaction):
        if not interaction.guild_id:
            await interaction.response.send_message("⚠️ Isso só funciona dentro de um servidor.", ephemeral=True)
            return
        rotas = self.bot.db.listar_canais_categoria(str(interaction.guild_id))
        principal_id = self.bot.db.get_jornal_canal(str(interaction.guild_id))
        principal = f"<#{principal_id}>" if principal_id else "*não definido (use /jornal principal)*"
        linhas = [f"**Canal principal:** {principal}", ""]
        for escolha in CATEGORIAS_CANAL:
            cid = rotas.get(escolha.value)
            destino = f"<#{cid}>" if cid else "↳ canal principal"
            linhas.append(f"**{escolha.name}:** {destino}")
        await interaction.response.send_message("\n".join(linhas), ephemeral=True)

    @jornal.command(name="imagem", description="Define a imagem fixa das boas-vindas ou da despedida (URL).")
    @app_commands.checks.has_permissions(manage_guild=True)
    @app_commands.describe(tipo="Entrada ou saída", url="URL da imagem (https://…). Deixe vazio pra remover.")
    @app_commands.choices(tipo=TIPOS_MENSAGEM)
    async def imagem(
        self,
        interaction: discord.Interaction,
        tipo: app_commands.Choice[str],
        url: app_commands.Range[str, 0, 500] = "",
    ):
        if not interaction.guild_id:
            await interaction.response.send_message("⚠️ Isso só funciona dentro de um servidor.", ephemeral=True)
            return
        chave = f"img_{tipo.value}"
        url = (url or "").strip()
        if not url:
            self.bot.db.limpar_mensagem(str(interaction.guild_id), chave)
            await interaction.response.send_message(f"✅ Imagem de **{tipo.name}** removida.", ephemeral=True)
            return
        if not url.lower().startswith(("http://", "https://")):
            await interaction.response.send_message("⚠️ Mande uma URL que comece com http:// ou https://.", ephemeral=True)
            return
        self.bot.db.set_mensagem(str(interaction.guild_id), chave, url)
        emb = ui.embed(f"Imagem de {tipo.name} definida", descricao="Prévia:")
        emb.set_image(url=url)
        await interaction.response.send_message(embed=emb, ephemeral=True)

    @jornal.command(name="canais_boasvindas", description="Define os canais do bloco 'Confira estes canais' das boas-vindas.")
    @app_commands.checks.has_permissions(manage_guild=True)
    @app_commands.describe(
        canal1="1º canal (deixe todos vazios pra limpar a lista).",
        canal2="2º canal (opcional).",
        canal3="3º canal (opcional).",
        canal4="4º canal (opcional).",
    )
    async def canais_boasvindas(
        self,
        interaction: discord.Interaction,
        canal1: discord.TextChannel = None,
        canal2: discord.TextChannel = None,
        canal3: discord.TextChannel = None,
        canal4: discord.TextChannel = None,
    ):
        if not interaction.guild_id:
            await interaction.response.send_message("⚠️ Isso só funciona dentro de um servidor.", ephemeral=True)
            return
        canais = [c for c in (canal1, canal2, canal3, canal4) if c is not None]
        if not canais:
            self.bot.db.limpar_mensagem(str(interaction.guild_id), "canais_boasvindas")
            await interaction.response.send_message("✅ Lista de canais das boas-vindas limpa.", ephemeral=True)
            return
        self.bot.db.set_mensagem(
            str(interaction.guild_id), "canais_boasvindas", ",".join(str(c.id) for c in canais)
        )
        await interaction.response.send_message(
            "✅ As boas-vindas vão mostrar: " + " · ".join(c.mention for c in canais), ephemeral=True
        )

    @jornal.command(name="rumor", description="Publica um rumor no jornal e agenda um baú surpresa em algumas horas.")
    @app_commands.checks.has_permissions(manage_guild=True)
    @app_commands.describe(texto="O rumor (flavor text) a publicar.", horas="Em quantas horas o baú vai cair (1-12).")
    async def rumor(
        self, interaction: discord.Interaction, texto: app_commands.Range[str, 1, 1000],
        horas: app_commands.Range[int, 1, 12] = 3,
    ):
        canal_pub = await self._canal_do_jornal(interaction, "noticia")
        if canal_pub is None:
            return
        gid = str(interaction.guild_id)
        if self.bot.get_cog("Baus") is None or not self.bot.db.listar_baus_canais(gid):
            await interaction.response.send_message(
                "⚠️ Nenhum canal de baú configurado ainda. Use `/bau_canal_adicionar` primeiro.", ephemeral=True
            )
            return
        emb = ui.embed("📰 Rumores do Jornal Lunar", categoria="noticia", descricao=texto)
        try:
            await canal_pub.send(embed=emb)
        except discord.HTTPException:
            log.exception("falha ao publicar rumor no canal %s", canal_pub.id)
            await interaction.response.send_message("⚠️ Não consegui publicar o rumor.", ephemeral=True)
            return
        dropar_em = datetime.now(timezone.utc) + timedelta(hours=horas)
        self.bot.db.agendar_rumor_bau(gid, dropar_em)
        await interaction.response.send_message(
            f"✅ Rumor publicado em {canal_pub.mention}. Um baú deve aparecer em ~{horas}h "
            "num dos canais de baú configurados.",
            ephemeral=True,
        )

    # ── Baú agendado por /jornal rumor (sobrevive a restart) ────────────────
    @tasks.loop(minutes=RUMOR_CICLO_MINUTOS)
    async def ciclo_rumores(self):
        agora = datetime.now(timezone.utc)
        for rumor_row in self.bot.db.listar_rumores_baus_pendentes(agora):
            try:
                await self._soltar_bau_de_rumor(rumor_row)
            except Exception:
                log.exception("erro ao soltar bau agendado por rumor (id %s)", rumor_row.get("id"))

    @ciclo_rumores.before_loop
    async def _antes_do_ciclo_rumores(self):
        await self.bot.wait_until_ready()

    async def _soltar_bau_de_rumor(self, rumor_row: dict) -> None:
        guild_id = str(rumor_row["guild_id"])
        # Marca processado ANTES de soltar: se _dropar falhar, o baú desse
        # rumor simplesmente não sai (igual ao comportamento antigo, que
        # também não tinha retry) em vez de tentar de novo sem parar.
        self.bot.db.marcar_rumor_bau_processado(rumor_row["id"])
        baus_cog = self.bot.get_cog("Baus")
        if baus_cog is None:
            log.warning("cog Baus indisponível: baú do rumor %s não foi solto", rumor_row["id"])
            return
        cfg = self.bot.db.get_baus_config(guild_id)
        await baus_cog._dropar(cfg)

    # ── /jornal desafio (botão + modal: confere a resposta de verdade) ──────
    @jornal.command(
        name="desafio",
        description="Publica um desafio com botão; quem acertar primeiro ganha Lunaris.",
    )
    @app_commands.checks.has_permissions(manage_guild=True)
    @app_commands.describe(
        pergunta="O desafio/pergunta a publicar.",
        resposta="A resposta certa (comparada sem acento/maiúscula/espaço extra).",
        recompensa="Quanto Lunaris pra quem acertar primeiro (1-500).",
    )
    async def desafio(
        self, interaction: discord.Interaction, pergunta: app_commands.Range[str, 1, 1000],
        resposta: app_commands.Range[str, 1, 200],
        recompensa: app_commands.Range[int, 1, 500] = 20,
    ):
        if not isinstance(interaction.channel, discord.TextChannel):
            await interaction.response.send_message("Use isso num canal de texto do servidor.", ephemeral=True)
            return
        token = uuid.uuid4().hex
        emb = ui.embed(
            "🎲 Desafio do Jornal Lunar", categoria="noticia",
            descricao=f"{pergunta}\n\n🏆 Clique no botão e responda: quem acertar primeiro ganha ☾ **{recompensa} Lunaris**!",
        )
        view = _view_desafio(self, token)
        await interaction.response.send_message(embed=emb, view=view)
        mensagem = await interaction.original_response()
        gid = str(interaction.guild_id)
        self.bot.db.criar_desafio(
            token, gid, str(interaction.channel.id), str(interaction.user.id), pergunta, resposta, recompensa
        )
        self.bot.db.set_desafio_mensagem(token, str(mensagem.id))

    async def abrir_modal_desafio(self, interaction: discord.Interaction, token: str) -> None:
        row = self.bot.db.get_desafio_ativo(token)
        if row is None:
            await interaction.response.send_message(
                "Esse desafio já foi resolvido ou não existe mais.", ephemeral=True
            )
            return
        if str(interaction.user.id) == str(row["autor_id"]):
            await interaction.response.send_message(
                "Você não pode responder ao seu próprio desafio.", ephemeral=True
            )
            return
        await interaction.response.send_modal(DesafioModal(self, token))

    async def resolver_desafio(self, interaction: discord.Interaction, token: str, resposta_dada: str) -> None:
        row = self.bot.db.get_desafio_ativo(token)
        if row is None:
            await interaction.response.send_message("Esse desafio já foi resolvido.", ephemeral=True)
            return
        if enigmas_mod.normalizar(resposta_dada) != enigmas_mod.normalizar(row["resposta"]):
            await interaction.response.send_message(
                "❌ Resposta errada. Clique no botão e tente de novo!", ephemeral=True
            )
            return
        ganho = self.bot.db.reivindicar_desafio(token, str(interaction.user.id))
        if ganho is None:
            await interaction.response.send_message("Alguém já acertou esse desafio! 😅", ephemeral=True)
            return
        gid, recompensa = str(ganho["guild_id"]), int(ganho["recompensa"])
        self.bot.db.creditar(gid, str(interaction.user.id), "Lunaris", recompensa)
        self.bot.db.registrar_extrato(
            gid, str(interaction.user.id), recompensa, "Lunaris", "Venceu um desafio do Jornal Lunar"
        )
        try:
            await interaction.response.send_message(
                f"🏆 Você acertou e ganhou ☾ **{recompensa} Lunaris**!", ephemeral=True
            )
        except discord.HTTPException:
            pass
        await self._atualizar_mensagem_desafio(ganho, interaction.user)

    async def _atualizar_mensagem_desafio(self, desafio_row: dict, vencedor) -> None:
        guild = self.bot.get_guild(int(desafio_row["guild_id"]))
        if guild is None:
            return
        canal_id, mensagem_id = desafio_row.get("canal_id"), desafio_row.get("mensagem_id")
        if not canal_id or not mensagem_id:
            return
        canal = guild.get_channel(int(canal_id))
        if not isinstance(canal, discord.TextChannel):
            return
        emb = ui.embed(
            "🎲 Desafio do Jornal Lunar: resolvido!", categoria="noticia",
            descricao=(
                f"{desafio_row['pergunta']}\n\n"
                f"🏆 {vencedor.mention} acertou primeiro e ganhou ☾ **{desafio_row['recompensa']} Lunaris**!"
            ),
        )
        try:
            mensagem = await canal.fetch_message(int(mensagem_id))
            await mensagem.edit(embed=emb, view=_view_desafio_resolvido())
        except discord.HTTPException:
            pass

    # Fora do grupo /jornal de propósito: /jornal inteiro é master-only,
    # mas ver a estação atual é informação pública pra qualquer jogador.
    @app_commands.command(name="estacao", description="Mostra a estação atual do Jardim (afeta o loot dos baús).")
    async def estacao(self, interaction: discord.Interaction):
        if not interaction.guild_id:
            await interaction.response.send_message("⚠️ Isso só funciona dentro de um servidor.", ephemeral=True)
            return
        info = economia.estacao_info(self.bot.db.get_estacao(str(interaction.guild_id)))
        emb = ui.embed(f"🍂 Estação: {info['rotulo']}", categoria="clima", descricao=info["descricao"])
        await interaction.response.send_message(embed=emb)


async def setup(bot: commands.Bot):
    await bot.add_cog(Jornal(bot))
