"""
Apresentação (embeds, cores, paginação) do Banqueiro.

Objetivo: centralizar a "cara" do bot num lugar só, pra todo comando usar a
mesma marca, as mesmas cores por raridade/categoria e a mesma barra de
capacidade — em vez de cada cog inventar seu próprio hex e formatação.

Sem Discord.py "de verdade" nas partes que dá pra testar puro (barra, ícones,
paleta); Embed/View usam discord.py porque são objetos de apresentação.
"""

from __future__ import annotations

from typing import Iterable, List, Optional, Sequence

import discord

from . import economia

NOME_BOT = economia.NOME_BOT
MARCA = f"🌿 O Jardim · {NOME_BOT}"

# Cor por categoria de comando (não confundir com cor por raridade de item).
COR = {
    "economia": 0xF1C40F,    # dourado — carteira, câmbio, cartão
    "loja": 0x2ECC71,        # verde — loja, compras, venda
    "cofre": 0x3498DB,       # azul — cofre/armazém
    "inventario": 0x9B59B6,  # roxo — inventário
    "bau": 0xE67E22,         # laranja — baús
    "troca": 0xF1C40F,       # dourado — trocas entre players
    "integracao": 0x1ABC9C,  # verde-água — vínculo com o site
    "erro": 0xE74C3C,        # vermelho — falhas/avisos
    "ajuda": 0x5865F2,       # blurple — menu de ajuda
}

COR_RARIDADE = {
    "comum": 0x9AA0A6,
    "incomum": 0x2ECC71,
    "raro": 0x3498DB,
    "epico": 0x9B59B6,
    "lendario": 0xF1C40F,
}

ICONE_RARIDADE = {
    "comum": "⚪",
    "incomum": "🟢",
    "raro": "🔵",
    "epico": "🟣",
    "lendario": "🟡",
}

SIMBOLO_MOEDA = {"lunaris": "☾", "solares": "☉"}


def cor_categoria(chave: str) -> int:
    return COR.get(chave, COR["economia"])


def cor_raridade(raridade: object) -> int:
    return COR_RARIDADE.get(economia.normalizar(raridade), COR_RARIDADE["comum"])


def icone_raridade(raridade: object) -> str:
    return ICONE_RARIDADE.get(economia.normalizar(raridade), "⚪")


def simbolo_moeda(moeda: object) -> str:
    return SIMBOLO_MOEDA.get(economia.normalizar(moeda), "◈")


def embed(
    titulo: str,
    *,
    categoria: str = "economia",
    descricao: Optional[str] = None,
    cor: Optional[int] = None,
) -> discord.Embed:
    """Embed com a marca do bot já no footer — usar em vez de discord.Embed() cru."""
    e = discord.Embed(
        title=titulo,
        description=descricao,
        color=cor if cor is not None else cor_categoria(categoria),
    )
    e.set_footer(text=MARCA)
    return e


def barra(atual: int, maximo: int, tamanho: int = 10) -> str:
    """Barra de progresso textual: '▰▰▰▰▰▱▱▱▱▱  5/10'.

    Tolerante a maximo<=0 (evita ZeroDivisionError) e a atual fora da faixa
    (negativo ou acima do máximo não quebram a barra).
    """
    maximo_seguro = maximo if maximo > 0 else 1
    atual_seguro = max(0, atual)
    fracao = atual_seguro / maximo_seguro
    cheio = max(0, min(tamanho, round(tamanho * fracao)))
    return "▰" * cheio + "▱" * (tamanho - cheio) + f"  {atual}/{maximo}"


def paginar(itens: Sequence, por_pagina: int) -> List[Sequence]:
    """Quebra uma sequência em páginas de tamanho `por_pagina` (>= 1)."""
    tamanho = max(1, int(por_pagina))
    return [itens[i:i + tamanho] for i in range(0, len(itens), tamanho)] or [[]]


class Paginador(discord.ui.View):
    """View genérica de navegação Anterior/Próximo entre embeds prontos.

    Só quem pediu o comando pode navegar (interaction_check por autor_id).
    """

    def __init__(self, paginas: Sequence[discord.Embed], *, autor_id: int, timeout: float = 120):
        super().__init__(timeout=timeout)
        if not paginas:
            raise ValueError("Paginador precisa de pelo menos 1 página")
        self.paginas = list(paginas)
        self.autor_id = autor_id
        self.indice = 0
        self._atualizar_botoes()

    def _atualizar_botoes(self) -> None:
        self.anterior.disabled = self.indice <= 0
        self.proximo.disabled = self.indice >= len(self.paginas) - 1

    @property
    def pagina_atual(self) -> discord.Embed:
        return self.paginas[self.indice]

    async def interaction_check(self, interaction: discord.Interaction) -> bool:
        if interaction.user.id != self.autor_id:
            await interaction.response.send_message(
                "Só quem pediu esse comando pode navegar aqui.", ephemeral=True
            )
            return False
        return True

    @discord.ui.button(label="◀", style=discord.ButtonStyle.secondary)
    async def anterior(self, interaction: discord.Interaction, button: discord.ui.Button):
        self.indice = max(0, self.indice - 1)
        self._atualizar_botoes()
        await interaction.response.edit_message(embed=self.pagina_atual, view=self)

    @discord.ui.button(label="▶", style=discord.ButtonStyle.secondary)
    async def proximo(self, interaction: discord.Interaction, button: discord.ui.Button):
        self.indice = min(len(self.paginas) - 1, self.indice + 1)
        self._atualizar_botoes()
        await interaction.response.edit_message(embed=self.pagina_atual, view=self)

    async def on_timeout(self) -> None:
        for child in self.children:
            child.disabled = True
