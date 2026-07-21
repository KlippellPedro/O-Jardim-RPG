"""Cog Ajuda — menu de comandos do Jornalista por categoria (Select do Discord).

Não existia até 17/07/2026 — o bot tinha comandos mas nenhum jeito de
descobrir quais, diferente do Banqueiro/Barista que já tinham /ajuda."""

from __future__ import annotations

import discord
from discord import app_commands
from discord.ext import commands

from core import ui

CATEGORIAS = {
    "baus": {
        "rotulo": "🎁 Baús automáticos",
        "descricao": "Baús que aparecem sozinhos pelo servidor.",
        "comandos": [
            ("/bau_config", "[Mestre] Liga/desliga os baús, define canal, janela de horário e itens por baú."),
            ("/bau_agora", "[Mestre] Solta um baú imediatamente (pra testar)."),
        ],
    },
    "jornal": {
        "rotulo": "📰 Jornal",
        "descricao": "Notícias, estação e clima do Jardim.",
        "comandos": [
            ("/jornal publicar <titulo> <conteudo>", "[Mestre] Publica uma notícia customizada."),
            ("/jornal estacao_definir <estacao>", "[Mestre] Define a estação do Jardim (muda o loot dos baús)."),
            ("/jornal avancar_mes", "[Mestre] Sorteia o clima do mês, restrito pela estação atual."),
            ("/jornal mensagem <tipo> <texto>", "[Mestre] Edita o texto de entrada/saída de membros (use {mencao} e {nome})."),
            ("/jornal mensagem_ver <tipo>", "[Mestre] Mostra o texto atual (personalizado ou padrão) de entrada/saída."),
            ("/jornal canal <categoria> <canal>", "[Mestre] Define o canal de cada conteúdo (entrada, saída, notícia, clima)."),
            ("/jornal canais", "[Mestre] Mostra em que canal cada conteúdo é publicado."),
            ("/jornal imagem <tipo> <url>", "[Mestre] Imagem fixa das boas-vindas ou da despedida."),
            ("/jornal canais_boasvindas <canal1>", "[Mestre] Canais do bloco 'Confira estes canais' das boas-vindas."),
            ("/estacao", "Mostra a estação atual do Jardim."),
        ],
    },
    "registro": {
        "rotulo": "🪪 Registro (reações)",
        "descricao": "Painéis de cargos por reação — o jogador reage com o emoji (estilo Zira).",
        "comandos": [
            ("/registro criar <titulo> [descricao] [unico]", "[Mestre] Cria um painel novo (ex.: Idade, Pronomes)."),
            ("/registro opcao <painel> <emoji> <texto> [cargo] [criar_cargo]", "[Mestre] Adiciona uma opção de cargo (um emoji) ao painel."),
            ("/registro publicar <painel> [canal]", "[Mestre] Publica o painel e coloca as reações num canal."),
            ("/registro paineis", "[Mestre] Lista todos os painéis do servidor."),
            ("/registro opcoes <painel>", "[Mestre] Lista as opções (botões) de um painel."),
            ("/registro remover_opcao <painel> <opcao>", "[Mestre] Remove uma opção do painel."),
            ("/registro modo <painel> <unico>", "[Mestre] Um cargo por vez (único) ou vários."),
            ("/registro apagar <painel>", "[Mestre] Apaga um painel inteiro."),
            ("/registro canal <canal>", "[Mestre] Canal pra onde as boas-vindas mandam os novatos."),
            ("/registro preset_arvores", "[Mestre] Cria um painel pronto com as 10 Árvores do Jardim."),
        ],
    },
}


def _pagina(chave: str) -> discord.Embed:
    info = CATEGORIAS[chave]
    emb = ui.embed(info["rotulo"], categoria="noticia", descricao=info["descricao"])
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

    @app_commands.command(description="Mostra o menu de comandos do Jornalista por categoria.")
    async def ajuda(self, interaction: discord.Interaction):
        primeira_chave = next(iter(CATEGORIAS))
        view = MenuAjuda(autor_id=interaction.user.id)
        await interaction.response.send_message(embed=_pagina(primeira_chave), view=view, ephemeral=True)


async def setup(bot):
    await bot.add_cog(Ajuda(bot))
