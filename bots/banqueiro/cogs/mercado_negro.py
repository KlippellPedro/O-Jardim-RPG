from typing import Optional
import random
from datetime import datetime, timezone
import discord
from discord import app_commands
from discord.ext import commands

from core import economia
from core import ui

def _aplicar_modificador_preco(preco_base: int, modificador: Optional[str]) -> int:
    if modificador == "inflacao_loja":
        return int(preco_base * 1.2)
    if modificador == "deflacao_loja":
        return int(preco_base * 0.85)
    return preco_base

def _extrair_preco(preco) -> tuple[str, int]:
    """Preço do catálogo vem como {moeda: valor}. Devolve (moeda, valor)."""
    if isinstance(preco, dict) and preco:
        moeda, valor = next(iter(preco.items()))
        return moeda, int(valor)
    return "Créditos Sombrios", 9999

def _sid(interaction: discord.Interaction) -> str:
    return str(interaction.guild_id) if interaction.guild_id else "global"

class ComprarMercadoNegroModal(discord.ui.Modal, title="Comprar do Mercado Negro"):
    def __init__(self, bot, item_data):
        super().__init__()
        self.bot = bot
        self.item_data = item_data
        
        self.quantidade = discord.ui.TextInput(
            label="Quantidade",
            default="1",
            max_length=2,
            required=True
        )
        self.add_item(self.quantidade)

    async def on_submit(self, interaction: discord.Interaction):
        from core.db import SaldoInsuficiente

        try:
            qtd = int(self.quantidade.value)
            if qtd <= 0:
                raise ValueError()
        except ValueError:
            await interaction.response.send_message("Quantidade inválida.", ephemeral=True)
            return

        sid, uid = _sid(interaction), str(interaction.user.id)
        moeda = self.item_data["moeda"]
        simbolo = ui.simbolo_moeda(moeda)
        custo_total = self.item_data["preco"] * qtd

        self.bot.db.garantir_jogador(sid, uid)
        carteira = self.bot.db.get_carteira(sid, uid)

        saldo = carteira.get(moeda, 0)
        if saldo < custo_total:
            await interaction.response.send_message(
                f"Você não tem {moeda} suficientes. "
                f"Custa {simbolo} {custo_total}, você tem {simbolo} {saldo}.",
                ephemeral=True,
            )
            return

        # Debitar — levanta SaldoInsuficiente se a corrida mudar o saldo
        try:
            self.bot.db.debitar(sid, uid, moeda, custo_total)
        except SaldoInsuficiente:
            await interaction.response.send_message(
                f"Saldo insuficiente de {moeda}.", ephemeral=True
            )
            return

        # Entregar itens — add_item precisa de titulo e tipo
        for _ in range(qtd):
            self.bot.db.add_item(
                sid, uid,
                self.item_data["id"],
                self.item_data["titulo"],
                self.item_data.get("tipo", "item"),
                qtd=1,
            )

        # Reputação passiva
        self.bot.db.adicionar_reputacao(sid, uid, 1)

        await interaction.response.send_message(
            f"🤝 Você comprou {qtd}× **{self.item_data['titulo']}** "
            f"por {simbolo} {custo_total} {moeda}. Foi parar no seu `/inventario`.",
            ephemeral=True,
        )


class MercadoNegroView(discord.ui.View):
    def __init__(self, bot, itens_do_dia):
        super().__init__(timeout=120)
        self.bot = bot
        self.itens_do_dia = itens_do_dia
        
        for i, item in enumerate(itens_do_dia):
            simbolo = ui.simbolo_moeda(item["moeda"])
            btn = discord.ui.Button(label=f"Comprar: {item['titulo']} ({simbolo} {item['preco']})", style=discord.ButtonStyle.danger, custom_id=f"mn_comprar_{i}")
            btn.callback = self.make_callback(item)
            self.add_item(btn)

    def make_callback(self, item):
        async def callback(interaction: discord.Interaction):
            await interaction.response.send_modal(ComprarMercadoNegroModal(self.bot, item))
        return callback


class MercadoNegro(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @app_commands.command(name="mercado_negro", description="Acesso restrito. Vende itens exóticos com preço variável no dia.")
    async def mercado_negro(self, interaction: discord.Interaction):
        todos_itens = self.bot.catalogo.listar()
        itens_sombrios = []
        
        sid = _sid(interaction)
        modificador = self.bot.db.get_modificador_clima(sid)
        
        for it in todos_itens:
            if it.conteudo.get("mercado_negro"):
                moeda, preco_base = _extrair_preco(it.conteudo.get("preco"))
                preco_real = _aplicar_modificador_preco(preco_base, modificador)
                itens_sombrios.append({
                    "id": it.id,
                    "titulo": it.titulo,
                    "tipo": it.tipo,
                    "descricao": it.conteudo.get("descricao", "Sem descrição."),
                    "preco": preco_real,
                    "moeda": moeda,
                    "raridade": it.raridade_rotulo
                })
        
        if not itens_sombrios:
            await interaction.response.send_message("O doleiro não apareceu hoje.", ephemeral=True)
            return
            
        # Seed by day
        hoje = datetime.now(timezone.utc).date()
        seed = int(hoje.strftime("%Y%m%d"))
        rng = random.Random(seed)
        
        qtd = min(3, len(itens_sombrios))
        ofertas = rng.sample(itens_sombrios, qtd)
        
        aviso_clima = ""
        if modificador == "inflacao_loja":
            aviso_clima = "\n\n🏜️ *O calor secou as rotas: os itens estão 20% mais caros hoje.*"
        elif modificador == "deflacao_loja":
            aviso_clima = "\n\n❄️ *Com o frio congelante, o doleiro quer se livrar logo da mercadoria: 15% de desconto!*"
        
        emb = ui.embed(
            "🕵️ Mercado Negro",
            descricao="O contrabandista abre o sobretudo e revela as mercadorias de hoje. A seleção muda à meia-noite.\n\n*Pagamento na moeda indicada em cada item*" + aviso_clima,
            categoria="economia"
        )

        for item in ofertas:
            simbolo = ui.simbolo_moeda(item["moeda"])
            emb.add_field(
                name=f"{item['titulo']} ({item['raridade']}) - {simbolo} {item['preco']}",
                value=item['descricao'],
                inline=False
            )
            
        view = MercadoNegroView(self.bot, ofertas)
        await interaction.response.send_message(embed=emb, view=view, ephemeral=True)


async def setup(bot):
    await bot.add_cog(MercadoNegro(bot))
