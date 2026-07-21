"""Cog Música — toca áudio nos canais de voz via yt-dlp + FFmpeg."""

from __future__ import annotations

import asyncio
import logging
from typing import List, Optional

import discord
from discord import app_commands
from discord.ext import commands

from core import musica as core_musica
from core import ui

log = logging.getLogger("barista.musica")


class Musica(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        self.gerenciador = core_musica.GerenciadorMusica()

    def _voice_client(self, guild: Optional[discord.Guild]) -> Optional[discord.VoiceClient]:
        return guild.voice_client if guild else None

    async def _conectar_voz(self, membro: discord.abc.User) -> discord.VoiceClient:
        """Entra (ou move pra) o canal de voz de quem chamou. Levanta
        ErroMusica se a pessoa não estiver numa call."""
        if not isinstance(membro, discord.Member) or membro.voice is None or membro.voice.channel is None:
            raise core_musica.ErroMusica("Entre num canal de voz primeiro.")

        canal_voz = membro.voice.channel
        vc = self._voice_client(membro.guild)
        try:
            if vc is None:
                # Um deploy enquanto o bot estava numa call pode deixar a
                # sessão anterior visível por alguns segundos. Não deixa o
                # jogador preso em "pensando..." pelo timeout padrão de 60 s.
                vc = await canal_voz.connect(timeout=12.0, reconnect=True)
            elif vc.channel.id != canal_voz.id:
                await vc.move_to(canal_voz)
        except asyncio.TimeoutError as exc:
            raise core_musica.ErroMusica(
                "A conexão com o canal de voz demorou demais. Tenta novamente em alguns segundos."
            ) from exc
        except discord.DiscordException as exc:
            raise core_musica.ErroMusica(f"Não consegui entrar no canal de voz: {exc}") from exc
        return vc

    async def _tocar(
        self,
        *,
        membro: discord.abc.User,
        canal_texto: discord.abc.Messageable,
        busca: str,
    ) -> discord.Embed:
        """Lógica compartilhada entre /tocar (slash) e !musica (prefixo):
        conecta na call, busca a faixa e entra na fila. Levanta ErroMusica
        pra quem chamou decidir como mostrar o erro."""
        vc = await self._conectar_voz(membro)
        faixa = await core_musica.buscar_faixa(busca, membro.id)

        fila = self.gerenciador.fila(membro.guild.id)
        fila.canal = canal_texto
        posicao = fila.adicionar(faixa)
        ja_tocando = vc.is_playing() or vc.is_paused()

        if not ja_tocando:
            await self._agendar_proxima(membro.guild.id, vc)
            return ui.embed(
                "🎶 Tocando agora",
                categoria="musica",
                descricao=(
                    f"[{faixa.titulo}]({faixa.url_pagina}) · {faixa.duracao_fmt()}"
                    f"{faixa.observacao_origem()}"
                ),
            )
        return ui.embed(
            "➕ Adicionado à fila",
            categoria="musica",
            descricao=(
                f"[{faixa.titulo}]({faixa.url_pagina}) · {faixa.duracao_fmt()}\n"
                f"Posição na fila: {posicao}{faixa.observacao_origem()}"
            ),
        )

    async def tocar_lote(
        self,
        *,
        membro: discord.abc.User,
        canal_texto: discord.abc.Messageable,
        faixas: List[core_musica.Faixa],
        limpar_fila: bool = False,
    ) -> int:
        """Usado pelo /playlist_tocar: conecta na call e enfileira várias
        faixas já resolvidas de uma vez. Devolve quantas entraram na fila.
        Levanta ErroMusica se não achar canal de voz."""
        vc = await self._conectar_voz(membro)
        guild_id = membro.guild.id
        fila = self.gerenciador.fila(guild_id)
        fila.canal = canal_texto

        estava_tocando = False
        if limpar_fila:
            estava_tocando = vc.is_playing() or vc.is_paused()
            fila.limpar()

        for faixa in faixas:
            fila.adicionar(faixa)

        if estava_tocando:
            # NÃO chama _agendar_proxima aqui: o "after" já registrado na
            # faixa que está tocando vai disparar sozinho (via _avancar)
            # assim que o stop() for processado, e vai pegar a fila que
            # acabou de ser recarregada. Chamar os dois seria uma corrida —
            # a segunda chamada de voice_client.play() bate em "Already
            # playing audio" e perde uma faixa da playlist.
            vc.stop()
        elif not (vc.is_playing() or vc.is_paused()):
            await self._agendar_proxima(guild_id, vc)

        return len(faixas)

    async def _agendar_proxima(self, guild_id: int, vc: discord.VoiceClient) -> Optional[core_musica.Faixa]:
        def _ao_terminar(erro: Optional[Exception]):
            if erro:
                log.warning("Erro na reprodução (guild %s): %s", guild_id, erro)
            asyncio.run_coroutine_threadsafe(self._avancar(guild_id, vc), self.bot.loop)

        return self.gerenciador.tocar_proxima(vc, guild_id, _ao_terminar)

    async def _avancar(self, guild_id: int, vc: discord.VoiceClient):
        """Chamado quando uma faixa termina — toca a próxima da fila, se houver."""
        if not vc.is_connected():
            return
        fila = self.gerenciador.fila(guild_id)
        try:
            faixa = await self._agendar_proxima(guild_id, vc)
        except core_musica.ErroMusica as exc:
            if fila.canal:
                await fila.canal.send(f"⚠️ {exc}")
            return
        if faixa and fila.canal:
            emb = ui.embed(
                "🎶 Tocando agora",
                categoria="musica",
                descricao=(
                    f"[{faixa.titulo}]({faixa.url_pagina}) · {faixa.duracao_fmt()}"
                    f"{faixa.observacao_origem()}"
                ),
            )
            await fila.canal.send(embed=emb)

    @app_commands.command(name="tocar", description="Toca por nome ou link do YouTube/Spotify.")
    @app_commands.describe(busca="Nome da música ou link")
    async def tocar(self, interaction: discord.Interaction, busca: str):
        await interaction.response.defer()
        try:
            emb = await self._tocar(membro=interaction.user, canal_texto=interaction.channel, busca=busca)
        except core_musica.ErroMusica as exc:
            await interaction.followup.send(f"⚠️ {exc}", ephemeral=True)
            return
        await interaction.followup.send(embed=emb)

    @commands.command(name="musica", aliases=["tocar", "play"])
    async def musica_prefixo(self, ctx: commands.Context, *, busca: str):
        """Atalho de mensagem: "!musica <link ou nome>" — mesmo efeito do /tocar."""
        async with ctx.typing():
            try:
                emb = await self._tocar(membro=ctx.author, canal_texto=ctx.channel, busca=busca)
            except core_musica.ErroMusica as exc:
                await ctx.send(f"⚠️ {exc}")
                return
        await ctx.send(embed=emb)

    @app_commands.command(name="pular", description="Pula a música atual.")
    async def pular(self, interaction: discord.Interaction):
        vc = self._voice_client(interaction.guild)
        if vc is None or not (vc.is_playing() or vc.is_paused()):
            await interaction.response.send_message("Não tem nada tocando agora.", ephemeral=True)
            return
        vc.stop()  # dispara o "after" registrado em _agendar_proxima, que avança a fila
        await interaction.response.send_message("⏭️ Pulei pra próxima.")

    @app_commands.command(name="pausar", description="Pausa a música atual.")
    async def pausar(self, interaction: discord.Interaction):
        vc = self._voice_client(interaction.guild)
        if vc is None or not vc.is_playing():
            await interaction.response.send_message("Não tem nada tocando agora.", ephemeral=True)
            return
        vc.pause()
        await interaction.response.send_message("⏸️ Pausei.")

    @app_commands.command(name="despausar", description="Retoma a música pausada.")
    async def despausar(self, interaction: discord.Interaction):
        vc = self._voice_client(interaction.guild)
        if vc is None or not vc.is_paused():
            await interaction.response.send_message("Não tem nada pausado agora.", ephemeral=True)
            return
        vc.resume()
        await interaction.response.send_message("▶️ Retomei.")

    @app_commands.command(name="fila", description="Mostra a fila de músicas.")
    async def fila_cmd(self, interaction: discord.Interaction):
        fila = self.gerenciador.fila(interaction.guild_id)
        emb = ui.embed("🎼 Fila", categoria="musica")

        if fila.atual:
            emb.add_field(name="Tocando agora", value=f"[{fila.atual.titulo}]({fila.atual.url_pagina})", inline=False)
        if fila.faixas:
            linhas = [f"{i}. [{f.titulo}]({f.url_pagina})" for i, f in enumerate(fila.faixas, start=1)]
            emb.add_field(name="A seguir", value="\n".join(linhas)[:1024], inline=False)
        elif not fila.atual:
            emb.description = "A fila está vazia."

        await interaction.response.send_message(embed=emb)

    @app_commands.command(name="volume", description="Ajusta o volume (0 a 200%).")
    @app_commands.describe(porcentagem="Volume em porcentagem, de 0 a 200")
    async def volume(self, interaction: discord.Interaction, porcentagem: app_commands.Range[int, 0, 200]):
        fila = self.gerenciador.fila(interaction.guild_id)
        fila.volume = porcentagem / 100
        sufixo = " A faixa atual mantém o volume anterior; vale a partir da próxima." if fila.fonte_atual else ""
        await interaction.response.send_message(f"🔊 Volume ajustado pra {porcentagem}%.{sufixo}")

    @app_commands.command(name="musica_status", description="[Mestre] Diagnóstico do YouTube: cookie + teste de extração.")
    @app_commands.default_permissions(manage_guild=True)
    async def musica_status(self, interaction: discord.Interaction):
        await interaction.response.defer(ephemeral=True)
        cookie = core_musica.config.youtube_cookies_path()
        linhas = [
            f"**Cookie do YouTube:** {'✅ `' + cookie + '`' if cookie else '❌ não encontrado'}",
            f"**Modo YouTube direto:** {'ativado' if core_musica.YOUTUBE_DISPONIVEL else 'desativado (só SoundCloud)'}",
        ]
        # Testa uma extração real de um vídeo estável do YouTube. A `origem` diz
        # se tocou do YouTube (`youtube`) ou caiu no SoundCloud (`youtube-espelhado`).
        try:
            faixa = await core_musica.buscar_faixa(
                "https://www.youtube.com/watch?v=dQw4w9WgXcQ", interaction.user.id
            )
            linhas.append(f"**Teste de extração:** ✅ tocável — origem `{faixa.origem_audio}` · {faixa.titulo}")
        except core_musica.ErroMusica as exc:
            linhas.append(f"**Teste de extração:** ⚠️ {exc}")
        except Exception as exc:  # noqa: BLE001
            linhas.append(f"**Teste de extração:** ❌ `{type(exc).__name__}`: {str(exc)[:500]}")
        await interaction.followup.send("\n".join(linhas), ephemeral=True)

    @app_commands.command(name="parar", description="Para a música, limpa a fila e sai do canal.")
    async def parar(self, interaction: discord.Interaction):
        vc = self._voice_client(interaction.guild)
        fila = self.gerenciador.fila(interaction.guild_id)
        fila.limpar()
        if vc is not None:
            vc.stop()
            await vc.disconnect()
        await interaction.response.send_message("⏹️ Parei e limpei a fila.")


async def setup(bot):
    await bot.add_cog(Musica(bot))
