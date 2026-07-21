"""
Cog Jornal — comandos de conteúdo do Jornalista, agrupados em /jornal.

Passo 1 (17/07/2026): /jornal publicar.
Passo 3 (17/07/2026): /jornal estacao_definir + /jornal avancar_mes — a
estação (Plano_Jornalista.md, Decisão 2) e o clima do mês, que ela restringe.
/estacao é a versão de leitura, fora do grupo (qualquer jogador pode ver,
não só o mestre — o grupo /jornal inteiro é master-only).

O registro por Árvore/idade/pronomes virou um sistema próprio, configurável
por botões (estilo Zira), em cogs/registro.py (grupo /registro).
"""

from __future__ import annotations

import logging
from typing import Optional

import discord
from discord import app_commands
from discord.ext import commands

from core import clima as clima_mod
from core import economia
from core import ui

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
# cai no canal principal do jornal (/jornal_definir).
CATEGORIAS_CANAL = [
    app_commands.Choice(name="Entrada de membro", value="chegada"),
    app_commands.Choice(name="Saída de membro", value="partida"),
    app_commands.Choice(name="Notícia (/jornal publicar)", value="noticia"),
    app_commands.Choice(name="Clima e estação", value="clima"),
]


class Jornal(commands.Cog):
    jornal = app_commands.Group(
        name="jornal",
        description="Comandos de conteúdo do jornal do Jardim.",
        default_permissions=discord.Permissions(manage_guild=True),
    )

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    async def _canal_do_jornal(
        self, interaction: discord.Interaction, categoria: str = "noticia"
    ) -> Optional[discord.TextChannel]:
        """Resolve o canal da categoria (roteamento por `/jornal canal`), caindo
        no canal principal (`/jornal_definir` no Banqueiro). Responde o erro
        apropriado e devolve None quando não há canal utilizável."""
        if not interaction.guild_id or not interaction.guild:
            await interaction.response.send_message("⚠️ Isso só funciona dentro de um servidor.", ephemeral=True)
            return None
        canal_id = self.bot.db.get_canal_categoria(str(interaction.guild_id), categoria)
        if not canal_id:
            await interaction.response.send_message(
                "⚠️ Nenhum canal de jornal configurado ainda (use `/jornal_definir` no Banqueiro ou `/jornal canal` aqui).",
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

    @jornal.command(name="publicar", description="Publica uma notícia customizada no jornal.")
    @app_commands.describe(
        titulo="Título da notícia (aparece em destaque no embed)",
        conteudo="Corpo da notícia",
    )
    async def publicar(
        self,
        interaction: discord.Interaction,
        titulo: app_commands.Range[str, 1, 200],
        conteudo: app_commands.Range[str, 1, 4000],
    ):
        canal = await self._canal_do_jornal(interaction)
        if canal is None:
            return

        emb = ui.embed(
            f"{ui.icone_categoria('noticia')} {titulo}",
            categoria="noticia",
            descricao=conteudo,
        )
        try:
            await canal.send(embed=emb)
        except discord.HTTPException as exc:
            log.exception("falha ao publicar noticia customizada no canal %s", canal.id)
            await interaction.response.send_message(f"⚠️ Não consegui publicar no canal: {exc}", ephemeral=True)
            return
        await interaction.response.send_message(f"✅ Publicado em {canal.mention}.", ephemeral=True)

    @jornal.command(name="estacao_definir", description="Define a estação do Jardim (muda o peso de raridade do loot).")
    @app_commands.describe(estacao="Nova estação do Jardim")
    @app_commands.choices(estacao=ESTACAO_CHOICES)
    async def estacao_definir(self, interaction: discord.Interaction, estacao: app_commands.Choice[str]):
        if not interaction.guild_id:
            await interaction.response.send_message("⚠️ Isso só funciona dentro de um servidor.", ephemeral=True)
            return
        self.bot.db.set_estacao(str(interaction.guild_id), estacao.value)
        info = economia.estacao_info(estacao.value)
        await interaction.response.send_message(
            f"🍂 Estação: **{info['rotulo']}** — {info['descricao']}", ephemeral=True
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
    async def avancar_mes(self, interaction: discord.Interaction):
        canal = await self._canal_do_jornal(interaction, "clima")
        if canal is None:
            return

        guild_id = str(interaction.guild_id)
        estacao_atual = self.bot.db.get_estacao(guild_id)
        info_estacao = economia.estacao_info(estacao_atual)
        item_clima = clima_mod.sortear_clima(estacao_atual)

        emb = ui.embed(
            f"{ui.icone_categoria('clima')} GAZETA DO REINO — {info_estacao['rotulo']}",
            categoria="clima",
            descricao=f"**Previsão do tempo: {item_clima.nome}**\n{item_clima.efeito}",
        )
        emb.set_footer(text=f"{ui.MARCA} · Efeito narrativo — combine com o mestre")

        try:
            await canal.send(embed=emb)
        except discord.HTTPException as exc:
            log.exception("falha ao publicar clima do mes no canal %s", canal.id)
            await interaction.response.send_message(f"⚠️ Não consegui publicar no canal: {exc}", ephemeral=True)
            return
        await interaction.response.send_message(f"✅ Publicado em {canal.mention}.", ephemeral=True)

    @jornal.command(name="mensagem", description="Define o texto de entrada ou saída de membros (use {mencao} e {nome}).")
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
    @app_commands.describe(tipo="Qual mensagem ver")
    @app_commands.choices(tipo=TIPOS_MENSAGEM)
    async def mensagem_ver(self, interaction: discord.Interaction, tipo: app_commands.Choice[str]):
        if not interaction.guild_id:
            await interaction.response.send_message("⚠️ Isso só funciona dentro de um servidor.", ephemeral=True)
            return
        atual = self.bot.db.get_mensagem(str(interaction.guild_id), tipo.value)
        origem = "personalizada" if atual else "padrão do bot (sorteia entre várias)"
        corpo = (atual or "").strip() or "— sem texto personalizado; usa os padrões embutidos —"
        await interaction.response.send_message(
            f"**{tipo.name}** — {origem}:\n\n{corpo}\n\n"
            "Placeholders: `{mencao}` (menciona quem entrou) · `{nome}` (nome de quem saiu).",
            ephemeral=True,
        )

    @jornal.command(name="canal", description="Define em qual canal cada tipo de conteúdo do jornal é publicado.")
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
    async def canais(self, interaction: discord.Interaction):
        if not interaction.guild_id:
            await interaction.response.send_message("⚠️ Isso só funciona dentro de um servidor.", ephemeral=True)
            return
        rotas = self.bot.db.listar_canais_categoria(str(interaction.guild_id))
        principal_id = self.bot.db.get_jornal_canal(str(interaction.guild_id))
        principal = f"<#{principal_id}>" if principal_id else "*não definido (use /jornal_definir no Banqueiro)*"
        linhas = [f"**Canal principal:** {principal}", ""]
        for escolha in CATEGORIAS_CANAL:
            cid = rotas.get(escolha.value)
            destino = f"<#{cid}>" if cid else "↳ canal principal"
            linhas.append(f"**{escolha.name}:** {destino}")
        await interaction.response.send_message("\n".join(linhas), ephemeral=True)

    @jornal.command(name="imagem", description="Define a imagem fixa das boas-vindas ou da despedida (URL).")
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
        emb = ui.embed(f"Imagem de {tipo.name} definida", "Prévia:")
        emb.set_image(url=url)
        await interaction.response.send_message(embed=emb, ephemeral=True)

    @jornal.command(name="canais_boasvindas", description="Define os canais do bloco 'Confira estes canais' das boas-vindas.")
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
