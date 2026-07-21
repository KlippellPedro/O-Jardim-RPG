"""Cog Playlist — playlists nomeadas persistentes (Postgres compartilhado)."""

from __future__ import annotations

import logging

import discord
from discord import app_commands
from discord.ext import commands

from core import db as db_mod
from core import musica as core_musica
from core import ui

log = logging.getLogger("barista.playlist")

_SEM_BANCO = (
    "⚠️ Playlist precisa do banco compartilhado, que não está configurado "
    "agora neste bot. Fala com quem administra o Barista."
)


class Playlist(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    async def cog_app_command_error(
        self,
        interaction: discord.Interaction,
        error: app_commands.AppCommandError,
    ) -> None:
        original = getattr(error, "original", error)
        if not isinstance(original, db_mod.DatabaseUnavailable):
            raise error

        log.exception("Banco indisponível durante comando de playlist", exc_info=original)
        mensagem = "⚠️ O banco ficou indisponível. Nada foi alterado; tenta novamente em instantes."
        if interaction.response.is_done():
            await interaction.followup.send(mensagem, ephemeral=True)
        else:
            await interaction.response.send_message(mensagem, ephemeral=True)

    async def _autocomplete_playlist(self, interaction: discord.Interaction, atual: str):
        if self.bot.db is None or not interaction.guild_id:
            return []
        try:
            playlists = self.bot.db.listar_playlists(str(interaction.guild_id))
        except db_mod.DatabaseUnavailable:
            return []
        atual_lower = atual.lower()
        return [
            app_commands.Choice(name=f"{p['nome']} ({p['n_faixas']} faixas)", value=p["nome"])
            for p in playlists
            if atual_lower in p["nome"].lower()
        ][:25]

    @app_commands.command(name="playlist_criar", description="Cria uma playlist nomeada vazia.")
    @app_commands.describe(nome="Nome da playlist, ex.: Combate")
    async def playlist_criar(self, interaction: discord.Interaction, nome: str):
        if self.bot.db is None:
            await interaction.response.send_message(_SEM_BANCO, ephemeral=True)
            return
        nome = nome.strip()
        if not nome:
            await interaction.response.send_message("⚠️ Dá um nome pra playlist.", ephemeral=True)
            return
        try:
            self.bot.db.criar_playlist(str(interaction.guild_id), nome, str(interaction.user.id))
        except db_mod.PlaylistJaExiste as exc:
            await interaction.response.send_message(f"⚠️ {exc}", ephemeral=True)
            return
        await interaction.response.send_message(
            f"✅ Playlist **{nome}** criada. Usa `/playlist_adicionar` pra colocar músicas."
        )

    @app_commands.command(name="playlist_adicionar", description="Adiciona uma música ao fim de uma playlist.")
    @app_commands.describe(nome="Nome da playlist", busca="Nome da música ou link")
    @app_commands.autocomplete(nome=_autocomplete_playlist)
    async def playlist_adicionar(self, interaction: discord.Interaction, nome: str, busca: str):
        if self.bot.db is None:
            await interaction.response.send_message(_SEM_BANCO, ephemeral=True)
            return
        await interaction.response.defer()
        try:
            faixa = await core_musica.buscar_faixa(busca, interaction.user.id)
        except core_musica.ErroMusica as exc:
            await interaction.followup.send(f"⚠️ {exc}", ephemeral=True)
            return
        try:
            total = self.bot.db.adicionar_faixa(
                str(interaction.guild_id), nome, faixa.titulo, faixa.url_pagina, str(interaction.user.id)
            )
        except db_mod.PlaylistNaoEncontrada as exc:
            await interaction.followup.send(f"⚠️ {exc}", ephemeral=True)
            return
        except ValueError as exc:
            await interaction.followup.send(f"⚠️ {exc}", ephemeral=True)
            return
        await interaction.followup.send(
            f"➕ [{faixa.titulo}]({faixa.url_pagina}) adicionada em **{nome}** ({total} faixa(s))."
        )

    @app_commands.command(name="playlist_tocar", description="Toca uma playlist inteira, do começo (limpa a fila atual).")
    @app_commands.describe(nome="Nome da playlist")
    @app_commands.autocomplete(nome=_autocomplete_playlist)
    async def playlist_tocar(self, interaction: discord.Interaction, nome: str):
        if self.bot.db is None:
            await interaction.response.send_message(_SEM_BANCO, ephemeral=True)
            return

        membro = interaction.user
        if not isinstance(membro, discord.Member) or membro.voice is None or membro.voice.channel is None:
            await interaction.response.send_message("⚠️ Entre num canal de voz primeiro.", ephemeral=True)
            return

        musica = self.bot.get_cog("Musica")
        if musica is None:
            await interaction.response.send_message("⚠️ Cog de música indisponível.", ephemeral=True)
            return

        await interaction.response.defer()
        playlist = self.bot.db.obter_playlist(str(interaction.guild_id), nome)
        if playlist is None:
            await interaction.followup.send(f'⚠️ Não achei nenhuma playlist chamada "{nome}".', ephemeral=True)
            return
        if not playlist["faixas"]:
            await interaction.followup.send(f'⚠️ A playlist **{playlist["nome"]}** está vazia.', ephemeral=True)
            return

        resultados = await core_musica.buscar_faixas_em_lote(
            [f["url_pagina"] for f in playlist["faixas"]], interaction.user.id
        )
        faixas_ok = [r for r in resultados if isinstance(r, core_musica.Faixa)]
        falhas = len(resultados) - len(faixas_ok)
        if not faixas_ok:
            await interaction.followup.send(
                "⚠️ Nenhuma faixa da playlist tocou — todas falharam ao carregar.", ephemeral=True
            )
            return

        try:
            n = await musica.tocar_lote(
                membro=interaction.user,
                canal_texto=interaction.channel,
                faixas=faixas_ok,
                limpar_fila=True,
            )
        except core_musica.ErroMusica as exc:
            await interaction.followup.send(f"⚠️ {exc}", ephemeral=True)
            return

        descricao = f"{n} faixa(s) na fila."
        if falhas:
            descricao += f" {falhas} faixa(s) falharam ao carregar e foram puladas."
        emb = ui.embed(f"🎶 Tocando playlist: {playlist['nome']}", categoria="musica", descricao=descricao)
        await interaction.followup.send(embed=emb)

    @app_commands.command(name="playlist_listar", description="Lista as playlists deste servidor.")
    async def playlist_listar(self, interaction: discord.Interaction):
        if self.bot.db is None:
            await interaction.response.send_message(_SEM_BANCO, ephemeral=True)
            return
        playlists = self.bot.db.listar_playlists(str(interaction.guild_id))
        emb = ui.embed("🎵 Playlists", categoria="musica")
        if not playlists:
            emb.description = "Nenhuma playlist ainda — cria uma com `/playlist_criar`."
        else:
            linhas = [f"**{p['nome']}** — {p['n_faixas']} faixa(s)" for p in playlists]
            emb.add_field(name="Playlists deste servidor", value="\n".join(linhas)[:1024], inline=False)
        await interaction.response.send_message(embed=emb)

    @app_commands.command(name="playlist_ver", description="Mostra as músicas de uma playlist.")
    @app_commands.describe(nome="Nome da playlist")
    @app_commands.autocomplete(nome=_autocomplete_playlist)
    async def playlist_ver(self, interaction: discord.Interaction, nome: str):
        if self.bot.db is None:
            await interaction.response.send_message(_SEM_BANCO, ephemeral=True)
            return
        playlist = self.bot.db.obter_playlist(str(interaction.guild_id), nome)
        if playlist is None:
            await interaction.response.send_message(f'⚠️ Não achei nenhuma playlist chamada "{nome}".', ephemeral=True)
            return
        emb = ui.embed(f"🎵 Playlist: {playlist['nome']}", categoria="musica")
        if not playlist["faixas"]:
            emb.description = "Vazia — usa `/playlist_adicionar` pra colocar músicas."
        else:
            linhas = [f"{i}. [{f['titulo']}]({f['url_pagina']})" for i, f in enumerate(playlist["faixas"], start=1)]
            emb.add_field(name="Faixas", value="\n".join(linhas)[:1024], inline=False)
        await interaction.response.send_message(embed=emb)

    @app_commands.command(name="playlist_apagar", description="Apaga uma playlist inteira.")
    @app_commands.describe(nome="Nome da playlist")
    @app_commands.autocomplete(nome=_autocomplete_playlist)
    async def playlist_apagar(self, interaction: discord.Interaction, nome: str):
        if self.bot.db is None:
            await interaction.response.send_message(_SEM_BANCO, ephemeral=True)
            return
        apagou = self.bot.db.apagar_playlist(str(interaction.guild_id), nome)
        if not apagou:
            await interaction.response.send_message(f'⚠️ Não achei nenhuma playlist chamada "{nome}".', ephemeral=True)
            return
        await interaction.response.send_message(f"🗑️ Playlist **{nome}** apagada.")


async def setup(bot):
    await bot.add_cog(Playlist(bot))
