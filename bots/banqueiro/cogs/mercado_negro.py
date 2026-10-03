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


class VenderAoDoleiroView(discord.ui.View):
    """Oferta do doleiro: o jogador vê quanto vão pagar e aceita ou recusa."""

    def __init__(self, bot, sid: str, uid: str, item, quantidade: int, creditos: int, chave: str):
        super().__init__(timeout=90)
        self.bot, self.sid, self.uid = bot, sid, uid
        self.item, self.quantidade, self.creditos, self.chave = item, quantidade, creditos, chave
        self.resolvido = False

    @discord.ui.button(label="Fechar negócio", style=discord.ButtonStyle.danger)
    async def aceitar(self, interaction: discord.Interaction, button: discord.ui.Button):
        from core.inventario import InventarioErro, ItemIndisponivel

        if str(interaction.user.id) != self.uid or self.resolvido:
            await interaction.response.send_message("Este negócio não é seu, ou já foi resolvido.", ephemeral=True)
            return
        self.resolvido = True
        self.stop()
        motivo = f"Mercado Negro: venda de {self.item.titulo} x{self.quantidade}"
        try:
            await self.bot.inventario.tirar(self.sid, self.uid, self.item.id, self.quantidade, motivo=motivo, chave=self.chave)
        except ItemIndisponivel:
            await interaction.response.edit_message(content="Você não tem mais essa quantidade. O doleiro guarda o sobretudo.", embed=None, view=None)
            return
        except InventarioErro:
            await interaction.response.edit_message(content="O cofre não respondeu agora. Nada foi vendido, tente de novo em instantes.", embed=None, view=None)
            return
        try:
            self.bot.db.receber_do_doleiro(self.sid, self.uid, self.creditos, motivo)
        except Exception:
            # O item já saiu: devolve para o jogador nunca ficar sem nenhum dos dois.
            await self.bot.inventario.dar(
                self.sid, self.uid, self.item.id, self.item.titulo, self.item.tipo, self.quantidade,
                motivo=f"Devolução: {motivo}", chave=f"{self.chave}:devolucao",
            )
            await interaction.response.edit_message(content="O doleiro desistiu na hora de pagar. O item voltou para o seu inventário.", embed=None, view=None)
            return
        simbolo = ui.simbolo_moeda("Créditos Sombrios")
        await interaction.response.edit_message(
            content=f"🤝 O doleiro levou {self.quantidade}× **{self.item.titulo}** e deixou {simbolo} **{self.creditos} Créditos Sombrios** na sua carteira.",
            embed=None, view=None,
        )

    @discord.ui.button(label="Recusar", style=discord.ButtonStyle.secondary)
    async def recusar(self, interaction: discord.Interaction, button: discord.ui.Button):
        if str(interaction.user.id) != self.uid:
            await interaction.response.send_message("Este negócio não é seu.", ephemeral=True)
            return
        self.resolvido = True
        self.stop()
        await interaction.response.edit_message(content="Você guardou o item. O doleiro dá de ombros.", embed=None, view=None)

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
            if not 1 <= qtd <= 99:
                raise ValueError()
        except ValueError:
            await interaction.response.send_message("Quantidade inválida.", ephemeral=True)
            return

        sid, uid = _sid(interaction), str(interaction.user.id)
        moeda = self.item_data["moeda"]
        simbolo = ui.simbolo_moeda(moeda)
        custo_total = self.item_data["preco"] * qtd

        try:
            self.bot.db.comprar_item_mercado_negro(
                sid, uid, self.item_data["id"], self.item_data["titulo"],
                self.item_data.get("tipo", "item"), moeda, self.item_data["preco"], qtd,
            )
        except SaldoInsuficiente:
            await interaction.response.send_message(
                f"Saldo insuficiente de {moeda}.", ephemeral=True
            )
            return
        except ValueError:
            await interaction.response.send_message("Esta oferta está com dados inválidos. Avise o mestre.", ephemeral=True)
            return

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


    @app_commands.command(
        name="mercado_negro_vender",
        description="Vende um item do seu inventário ao doleiro, que paga em Créditos Sombrios (não há câmbio).",
    )
    @app_commands.describe(item="Item do seu inventário", quantidade="Quantas unidades vender")
    async def mercado_negro_vender(self, interaction: discord.Interaction, item: str, quantidade: app_commands.Range[int, 1, 99] = 1):
        sid, uid = _sid(interaction), str(interaction.user.id)
        possuidos = {p.item_id: p for p in await self.bot.inventario.listar(sid, uid)}
        posse = possuidos.get(item)
        if posse is None or posse.quantidade < quantidade:
            await interaction.response.send_message("Você não tem essa quantidade desse item no inventário.", ephemeral=True)
            return
        entrada = self.bot.catalogo.get(item)
        if entrada is None or entrada.tipo in economia.DOLEIRO_NAO_COMPRA:
            await interaction.response.send_message("O doleiro não compra isso.", ephemeral=True)
            return
        rate, _taxa = self.bot.db.get_cambio(sid)
        hoje = datetime.now(timezone.utc).date()
        creditos = economia.oferta_do_doleiro(entrada.conteudo.get("preco"), quantidade, hoje, rate)
        if creditos < 1:
            await interaction.response.send_message("Isso vale pouco demais até para o doleiro. Ele nem olha.", ephemeral=True)
            return
        simbolo = ui.simbolo_moeda("Créditos Sombrios")
        emb = ui.embed(
            "🕵️ O doleiro examina a mercadoria",
            descricao=(
                f"{quantidade}× **{entrada.titulo}**\n"
                f"Ele oferece {simbolo} **{creditos} Créditos Sombrios**, sem perguntas.\n\n"
                "*Créditos Sombrios não se trocam por Lunaris nem por Solares: só se gastam no mercado negro.*"
            ),
            categoria="economia",
        )
        chave = f"mn-venda:{sid}:{uid}:{interaction.id}"
        view = VenderAoDoleiroView(self.bot, sid, uid, entrada, quantidade, creditos, chave)
        await interaction.response.send_message(embed=emb, view=view, ephemeral=True)

    @mercado_negro_vender.autocomplete("item")
    async def _ac_venda(self, interaction: discord.Interaction, current: str):
        sid, uid = _sid(interaction), str(interaction.user.id)
        termo = (current or "").strip().lower()
        try:
            possuidos = await self.bot.inventario.listar(sid, uid)
        except Exception:
            return []
        out = []
        for p in possuidos:
            entrada = self.bot.catalogo.get(p.item_id)
            if entrada is None or entrada.tipo in economia.DOLEIRO_NAO_COMPRA:
                continue
            if termo and termo not in p.titulo.lower():
                continue
            out.append(app_commands.Choice(name=f"{p.titulo} (x{p.quantidade})"[:100], value=p.item_id))
            if len(out) >= 25:
                break
        return out


async def setup(bot):
    await bot.add_cog(MercadoNegro(bot))
