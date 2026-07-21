"""Cog Ajuda — menu de comandos do Barista por categoria (Select do Discord)."""

from __future__ import annotations

import discord
from discord import app_commands
from discord.ext import commands

from core import ui

CATEGORIAS = {
    "dados": {
        "rotulo": "🎲 Dados",
        "descricao": "Rolagens de expressões e testes de d20.",
        "comandos": [
            ("/rolar <expressao> [motivo]", "Rola dados: 2d6+3, 1d20+1d4-2, ou 2#d20 para duas rolagens separadas."),
            ("/teste [modificador] [modo] [motivo]", "Rola um teste de d20 (normal, vantagem ou desvantagem)."),
        ],
    },
    "musica": {
        "rotulo": "🎶 Música",
        "descricao": "Toca áudio do YouTube no canal de voz.",
        "comandos": [
            ("/tocar <busca>", "Toca ou enfileira uma música (busca ou link)."),
            ("!musica <busca>", "Atalho por mensagem — mesmo efeito de /tocar (também !tocar, !play)."),
            ("/pular", "Pula a música atual."),
            ("/pausar", "Pausa a música atual."),
            ("/despausar", "Retoma a música pausada."),
            ("/fila", "Mostra a fila de músicas."),
            ("/volume <porcentagem>", "Ajusta o volume (0 a 200%)."),
            ("/parar", "Para a música, limpa a fila e sai do canal."),
        ],
    },
    "playlist": {
        "rotulo": "🎵 Playlist",
        "descricao": "Playlists nomeadas pra momentos específicos (combate, taverna...).",
        "comandos": [
            ("/playlist_criar <nome>", "Cria uma playlist nomeada vazia."),
            ("/playlist_adicionar <nome> <busca>", "Adiciona uma música ao fim de uma playlist."),
            ("/playlist_tocar <nome>", "Toca a playlist inteira, do começo (limpa a fila atual)."),
            ("/playlist_listar", "Lista as playlists deste servidor."),
            ("/playlist_ver <nome>", "Mostra as músicas de uma playlist."),
            ("/playlist_apagar <nome>", "Apaga uma playlist inteira."),
        ],
    },
    "menu": {
        "rotulo": "☕ Menu",
        "descricao": "Cardápio de bebidas do Barista — compra debita a carteira (Lunaris).",
        "comandos": [
            ("/menu", "Mostra o cardápio; clica num item pra pedir e pagar na hora."),
        ],
    },
}


def _pagina(chave: str) -> discord.Embed:
    info = CATEGORIAS[chave]
    emb = ui.embed(info["rotulo"], categoria="ajuda", descricao=info["descricao"])
    corpo = "\n".join(f"**{cmd}**\n{desc}" for cmd, desc in info["comandos"])
    emb.add_field(name="Comandos", value=corpo[:1024], inline=False)
    emb.set_footer(text=f"{ui.MARCA} · Escolha outra categoria no menu abaixo")
    return emb


class MenuAjuda(discord.ui.View):
    def __init__(self, autor_id: int, timeout: float = 120):
        super().__init__(timeout=timeout)
        self.autor_id = autor_id
        self.select.options = [
            discord.SelectOption(label=info["rotulo"], value=chave, description=info["descricao"][:100])
            for chave, info in CATEGORIAS.items()
        ]

    async def interaction_check(self, interaction: discord.Interaction) -> bool:
        if interaction.user.id != self.autor_id:
            await interaction.response.send_message("Só quem pediu `/ajuda` pode usar esse menu.", ephemeral=True)
            return False
        return True

    @discord.ui.select(placeholder="Escolha uma categoria de comandos…")
    async def select(self, interaction: discord.Interaction, select: discord.ui.Select):
        chave = select.values[0]
        await interaction.response.edit_message(embed=_pagina(chave), view=self)

    async def on_timeout(self) -> None:
        for child in self.children:
            child.disabled = True


class Ajuda(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @app_commands.command(description="Mostra o menu de comandos do Barista por categoria.")
    async def ajuda(self, interaction: discord.Interaction):
        primeira_chave = next(iter(CATEGORIAS))
        view = MenuAjuda(autor_id=interaction.user.id)
        await interaction.response.send_message(embed=_pagina(primeira_chave), view=view, ephemeral=True)


async def setup(bot):
    await bot.add_cog(Ajuda(bot))
