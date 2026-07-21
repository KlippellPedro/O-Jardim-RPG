"""Cog Ajuda — menu de comandos do Banqueiro por categoria (Select do Discord)."""

from __future__ import annotations

import discord
from discord import app_commands
from discord.ext import commands

from core import ui

CATEGORIAS = {
    "economia": {
        "rotulo": "💰 Economia",
        "descricao": "Carteira, loja, câmbio e Cartão Lunar.",
        "comandos": [
            ("/carteira", "Mostra sua carteira, cofre e crédito."),
            ("/pagar <membro> <quantia>", "Transfere dinheiro da sua carteira pra de outro jogador."),
            ("/ranking", "Mostra as carteiras mais cheias do servidor."),
            ("/extrato [membro]", "Mostra o histórico recente de transações."),
            ("/loja [categoria]", "Lista o que está à venda."),
            ("/comprar <item>", "Compra um item da loja."),
            ("/vender <item>", "Vende um item de volta pra loja."),
            ("/inventario", "Mostra seu inventário."),
            ("/cambio <de> <para> <quantia>", "Troca Lunaris ⇄ Solares."),
            ("/cofre", "Mostra seu cofre/armazém (itens, dinheiro guardado e segurança)."),
            ("/cofre_melhorar", "Faz upgrade do cofre (mais itens e mais dinheiro guardável)."),
            ("/cofre_seguranca_melhorar", "Sobe a segurança do cofre (reduz a chance de te roubarem)."),
            ("/cofre_depositar <quantia>", "Guarda dinheiro da carteira no cofre (fica a salvo de roubo)."),
            ("/cofre_sacar <quantia>", "Tira dinheiro do cofre pra carteira (cobra taxa pequena)."),
            ("/cartao", "Mostra seu Cartão Lunar."),
            ("/cartao_melhorar", "Sobe o nível do Cartão Lunar."),
            ("/divida", "Mostra sua situação de dívida no Cartão Lunar (e se você tá procurado)."),
            ("/divida_pagar <quantia>", "Paga voluntariamente parte ou toda a dívida usando a carteira."),
        ],
    },
    "roubo": {
        "rotulo": "🥷 Roubo",
        "descricao": "Risco e recompensa entre jogadores. Carteira é sempre vulnerável; cofre depende da segurança do alvo.",
        "comandos": [
            ("/roubar <membro>", "Rouba 50% do saldo de Lunaris da carteira do alvo. Sempre funciona."),
            ("/roubar_cofre <membro>", "Tenta arrombar o cofre do alvo. Chance depende da segurança dele — se falhar, você paga multa."),
            ("/recompensa_colocar <membro> <valor>", "Coloca recompensa na cabeça de outro jogador (pago da sua carteira)."),
            ("/recompensa_ver [membro]", "Mostra a recompensa em alguém, ou os mais procurados do servidor."),
        ],
    },
    "baus": {
        "rotulo": "🎁 Baús",
        "descricao": "Baús compráveis na loja. Os baús que aparecem sozinhos pelo servidor são anunciados pelo Jornalista.",
        "comandos": [
            ("/loja_baus", "Baús que dá pra comprar e abrir."),
            ("/comprar_bau <tipo>", "Compra um baú de loot."),
            ("/meus_baus", "Mostra os baús que você tem pra abrir."),
            ("/abrir_bau <tipo>", "Abre um baú que você comprou."),
            ("/abrir_todos [tipo]", "Abre todos os baús que você tem de uma vez."),
        ],
    },
    "trocas": {
        "rotulo": "🤝 Trocas",
        "descricao": "Ofereça itens ou baús a outros jogadores.",
        "comandos": [
            ("/oferecer <para> <o_que> <preco>", "Oferece um item/baú seu a outro jogador (dá pra cancelar antes de ser aceita)."),
        ],
    },
    "integracao": {
        "rotulo": "🔗 Site",
        "descricao": "Vínculo da conta do site com o Discord.",
        "comandos": [
            ("/vincular <codigo>", "Vincula sua conta do site a este Discord."),
            ("/campanha_vincular <id>", "[Mestre] Liga o servidor a uma campanha do site."),
            ("/minhas_campanhas", "Mostra suas campanhas e personagens."),
        ],
    },
    "mestre": {
        "rotulo": "🛡️ Mestre",
        "descricao": "Comandos administrativos (requer permissão Gerenciar Servidor).",
        "comandos": [
            ("/dar <membro> <moeda> <quantia>", "Dá moeda a um jogador."),
            ("/tirar <membro> <moeda> <quantia>", "Remove moeda de um jogador."),
            ("/daritem <membro> <item>", "Dá um item do catálogo a um jogador."),
            ("/tirar_item <membro> <item>", "Remove um item do inventário de um jogador."),
            ("/resetjogador <membro>", "Zera carteira, cofre, inventário e cartão de um jogador."),
            ("/setcredito <membro> <valor>", "Define o crédito do Cartão Lunar."),
            ("/setcambio <lunaris_por_solares>", "Ajusta a taxa de câmbio do servidor."),
            ("/setroubo", "Ajusta a chance de /roubar_cofre contra Segurança Básica e o cooldown."),
            ("/juros_cofre <taxa_percent>", "Aplica juros sobre o dinheiro guardado no cofre de todo mundo."),
            ("/catalogo_recarregar", "Recarrega o catálogo salvo no banco central."),
            ("/catalogo_republicar", "Re-semeia o catálogo do arquivo (publica adições/edições e desativa removidos)."),
            ("/jornal_definir <canal>", "Define o canal onde o Jardim (e o Jornalista) publica avisos."),
        ],
    },
}


def _pagina(chave: str, rodape: str = "Escolha outra categoria no menu abaixo") -> discord.Embed:
    info = CATEGORIAS[chave]
    emb = ui.embed(info["rotulo"], categoria="ajuda", descricao=info["descricao"])
    corpo = "\n".join(f"**{cmd}**\n{desc}" for cmd, desc in info["comandos"])
    emb.add_field(name="Comandos", value=corpo[:1024], inline=False)
    emb.set_footer(text=f"{ui.MARCA} · {rodape}")
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

    @app_commands.command(description="Mostra o menu de comandos do Banqueiro por categoria.")
    async def ajuda(self, interaction: discord.Interaction):
        primeira_chave = next(iter(CATEGORIAS))
        view = MenuAjuda(autor_id=interaction.user.id)
        await interaction.response.send_message(embed=_pagina(primeira_chave), view=view, ephemeral=True)

    @app_commands.command(description="Lista TODOS os comandos do Banqueiro, um bloco por categoria.")
    async def comandos(self, interaction: discord.Interaction):
        paginas = [_pagina(chave, rodape="Use ◀ ▶ pra navegar entre categorias") for chave in CATEGORIAS]
        view = ui.Paginador(paginas, autor_id=interaction.user.id)
        await interaction.response.send_message(embed=view.pagina_atual, view=view, ephemeral=True)


async def setup(bot):
    await bot.add_cog(Ajuda(bot))
