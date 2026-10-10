from typing import Optional
import logging
import random
from datetime import datetime, timedelta, timezone
import discord
from discord import app_commands
from discord.ext import commands, tasks

from core import economia
from core import ui
from core.tasks_util import registrar_reinicio_em_erro

log = logging.getLogger("banqueiro")

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

def _encomendavel(entrada) -> bool:
    """O que o contrabandista aceita encomendar: item de catálogo à venda, fora monstro, imóvel, fruto, implante e relíquia."""
    conteudo = entrada.conteudo
    if entrada.tipo in economia.ENCOMENDA_NAO_ACEITA or conteudo.get("disponivelNaLoja") is False or conteudo.get("mercado_negro"):
        return False
    raridade = economia.normalizar(str(conteudo.get("raridade") or ""))
    if raridade in economia.ENCOMENDA_RARIDADES_FORA:
        return False
    return economia.valor_em_solares(conteudo.get("preco")) is not None


def _sid(interaction: discord.Interaction) -> str:
    return str(interaction.guild_id) if interaction.guild_id else "global"


class VenderAoDoleiroView(discord.ui.View):
    """Oferta do doleiro: o jogador vê quanto vão pagar e aceita ou recusa."""

    def __init__(self, bot, sid: str, uid: str, item, quantidade: int, creditos: int, chave: str, quentes: int = 0):
        super().__init__(timeout=90)
        self.bot, self.sid, self.uid = bot, sid, uid
        self.item, self.quantidade, self.creditos, self.chave = item, quantidade, creditos, chave
        self.quentes = quentes
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
            self.bot.db.receber_do_doleiro(self.sid, self.uid, self.creditos, motivo, item_id=self.item.id, quentes=self.quentes)
        except Exception:
            # O item já saiu: devolve para o jogador nunca ficar sem nenhum dos dois.
            await self.bot.inventario.dar(
                self.sid, self.uid, self.item.id, self.item.titulo, self.item.tipo, self.quantidade,
                motivo=f"Devolução: {motivo}", chave=f"{self.chave}:devolucao",
            )
            await interaction.response.edit_message(content="O doleiro desistiu na hora de pagar. O item voltou para o seu inventário.", embed=None, view=None)
            return
        simbolo = ui.simbolo_moeda("Créditos Sombrios")
        quente = ""
        if self.quentes:
            calor = self.bot.db.get_calor_roubo(self.sid, self.uid)
            quente = f"\n🔥 Mercadoria quente: seu Calor subiu para **{calor}/{economia.ROUBO_CALOR_MAXIMO}**."
        await interaction.response.edit_message(
            content=f"🤝 O doleiro levou {self.quantidade}× **{self.item.titulo}** e deixou {simbolo} **{self.creditos} Créditos Sombrios** na sua carteira.{quente}",
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
        registrar_reinicio_em_erro(self.ciclo_encomendas, "ciclo_encomendas_mercado_negro", log)

    async def cog_load(self):
        # Fora do __init__ de propósito: o ciclo precisa de um loop de eventos rodando.
        self.ciclo_encomendas.start()

    def cog_unload(self):
        self.ciclo_encomendas.cancel()

    @tasks.loop(minutes=5)
    async def ciclo_encomendas(self):
        await self.entregar_encomendas_prontas()

    @ciclo_encomendas.before_loop
    async def _antes_das_encomendas(self):
        await self.bot.wait_until_ready()
        try:
            retomadas = self.bot.db.retomar_encomendas_interrompidas()
            if retomadas:
                log.warning("%s encomenda(s) do mercado negro voltaram para a fila depois de uma queda", retomadas)
        except Exception:
            log.exception("falha ao retomar encomendas interrompidas")

    async def entregar_encomendas_prontas(self, agora: Optional[datetime] = None) -> int:
        """Entrega o que o contrabandista já tem pronto. Cada encomenda é reivindicada antes (só um ciclo entrega) e a
        entrega usa chave de idempotência: se o aviso falhar, o item não duplica na próxima tentativa."""
        agora = agora or datetime.now(timezone.utc)
        entregues = 0
        for pedido in self.bot.db.encomendas_prontas(agora):
            if not self.bot.db.reivindicar_encomenda(pedido["id"]):
                continue
            try:
                await self.bot.inventario.dar(
                    pedido["guild_id"], pedido["user_id"], pedido["item_id"], pedido["titulo"], pedido["tipo"], pedido["quantidade"],
                    motivo=f"Mercado Negro: encomenda #{pedido['id']}", chave=f"encomenda-mn:{pedido['id']}",
                )
            except Exception:
                log.exception("falha ao entregar a encomenda %s do mercado negro", pedido["id"])
                self.bot.db.concluir_encomenda(pedido["id"], False)
                continue
            self.bot.db.concluir_encomenda(pedido["id"], True)
            entregues += 1
            try:
                self.bot.db.enfileirar_aviso(
                    pedido["guild_id"],
                    f"🕵️ <@{pedido['user_id']}>, o contrabandista deixou a sua encomenda: {pedido['quantidade']}× **{pedido['titulo']}**. Está no seu `/inventario`.",
                )
            except Exception:
                log.exception("falha ao avisar a entrega da encomenda %s", pedido["id"])
        return entregues

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
        hoje = datetime.now(timezone.utc).date()
        # O valor do item usa sempre o câmbio padrão, nunca o câmbio flutuante da guilda: com o Lunaris
        # forte (rate 50) um item pago em Lunaris valeria o dobro e o doleiro quase não cobraria nada.
        creditos = economia.oferta_do_doleiro(entrada.conteudo.get("preco"), quantidade, hoje)
        if creditos < 1:
            await interaction.response.send_message("Isso vale pouco demais até para o doleiro. Ele nem olha.", ephemeral=True)
            return
        quentes = economia.unidades_quentes_na_venda(
            self.bot.db.get_mercadoria_quente(sid, uid).get(item, 0), posse.quantidade, quantidade,
        )
        calor_atual = self.bot.db.get_calor_roubo(sid, uid) if quentes else 0
        if quentes and calor_atual >= economia.CALOR_QUE_ESPANTA_O_DOLEIRO:
            await interaction.response.send_message(
                f"O doleiro olha a mercadoria e recua um passo. Com o seu Calor em **{calor_atual}/{economia.ROUBO_CALOR_MAXIMO}** ele não toca em nada quente: "
                "espere a poeira baixar, ou venda só o que não tem ninguém procurando.",
                ephemeral=True,
            )
            return
        simbolo = ui.simbolo_moeda("Créditos Sombrios")
        aviso_quente = ""
        if quentes:
            aviso_quente = (
                f"\n🔥 **{quentes}** de {quantidade} são mercadoria quente: vender isso soma "
                f"**{economia.calor_da_mercadoria_quente(quentes)} de Calor** (hoje você tem {calor_atual}/{economia.ROUBO_CALOR_MAXIMO})."
            )
        emb = ui.embed(
            "🕵️ O doleiro examina a mercadoria",
            descricao=(
                f"{quantidade}× **{entrada.titulo}**\n"
                f"Ele oferece {simbolo} **{creditos} Créditos Sombrios**, sem perguntas.{aviso_quente}\n\n"
                "*Créditos Sombrios não se trocam por Lunaris nem por Solares: só se gastam em implantes e no que o mercado negro vende em Créditos.*"
            ),
            categoria="economia",
        )
        chave = f"mn-venda:{sid}:{uid}:{interaction.id}"
        view = VenderAoDoleiroView(self.bot, sid, uid, entrada, quantidade, creditos, chave, quentes)
        await interaction.response.send_message(embed=emb, view=view, ephemeral=True)

    @app_commands.command(
        name="mercado_negro_encomendar",
        description="Encomenda um item ao contrabandista, pago em Créditos Sombrios. Chega em horas ou dias.",
    )
    @app_commands.describe(item="O que você quer", quantidade="Quantas unidades")
    async def mercado_negro_encomendar(
        self, interaction: discord.Interaction, item: str,
        quantidade: app_commands.Range[int, 1, economia.ENCOMENDA_MAXIMO_POR_PEDIDO] = 1,
    ):
        from core.db import EncomendasDemais, SaldoInsuficiente

        sid, uid = _sid(interaction), str(interaction.user.id)
        entrada = self.bot.catalogo.get(item)
        if entrada is None or not _encomendavel(entrada):
            await interaction.response.send_message("O contrabandista não consegue esse item.", ephemeral=True)
            return
        creditos = economia.creditos_da_encomenda(entrada.conteudo.get("preco"), quantidade)
        if creditos < 1:
            await interaction.response.send_message("Esse item não tem preço de tabela, então ele não sabe quanto cobrar.", ephemeral=True)
            return
        valor = (economia.valor_em_solares(entrada.conteudo.get("preco")) or 0) * quantidade
        pronto_em = datetime.now(timezone.utc) + timedelta(hours=economia.horas_da_encomenda(valor))
        try:
            encomenda_id = self.bot.db.criar_encomenda(sid, uid, entrada.id, entrada.titulo, entrada.tipo, quantidade, creditos, pronto_em)
        except SaldoInsuficiente:
            await interaction.response.send_message(f"Você precisa de **{creditos} Créditos Sombrios** para essa encomenda.", ephemeral=True)
            return
        except EncomendasDemais:
            await interaction.response.send_message(
                f"Você já tem {economia.ENCOMENDA_MAXIMO_PENDENTES} encomendas pendentes. Espere uma chegar ou cancele com `/mercado_negro_encomenda_cancelar`.",
                ephemeral=True,
            )
            return
        simbolo = ui.simbolo_moeda("Créditos Sombrios")
        await interaction.response.send_message(
            f"🕵️ Encomenda **#{encomenda_id}** feita: {quantidade}× **{entrada.titulo}** por {simbolo} **{creditos} Créditos Sombrios**.\n"
            f"Chega <t:{int(pronto_em.timestamp())}:R>, direto no seu `/inventario`. Cancelar devolve {int(economia.ENCOMENDA_REEMBOLSO * 100)}% dos Créditos.",
            ephemeral=True,
        )

    @mercado_negro_encomendar.autocomplete("item")
    async def _ac_encomenda(self, interaction: discord.Interaction, current: str):
        termo = (current or "").strip().lower()
        out = []
        for entrada in self.bot.catalogo.listar():
            if not _encomendavel(entrada) or (termo and termo not in entrada.titulo.lower()):
                continue
            out.append(app_commands.Choice(name=entrada.titulo[:100], value=entrada.id))
            if len(out) >= 25:
                break
        return out

    @app_commands.command(name="mercado_negro_encomendas", description="Mostra as suas encomendas ao contrabandista que ainda não chegaram.")
    async def mercado_negro_encomendas(self, interaction: discord.Interaction):
        sid, uid = _sid(interaction), str(interaction.user.id)
        pedidos = self.bot.db.listar_encomendas(sid, uid)
        if not pedidos:
            await interaction.response.send_message("Você não tem encomendas pendentes.", ephemeral=True)
            return
        linhas = [
            f"**#{pedido['id']}** · {pedido['quantidade']}× {pedido['titulo']} · chega <t:{int(pedido['pronto_em'].timestamp())}:R>"
            for pedido in pedidos
        ]
        await interaction.response.send_message("🕵️ **Suas encomendas**\n" + "\n".join(linhas), ephemeral=True)

    @app_commands.command(name="mercado_negro_encomenda_cancelar", description="Cancela uma encomenda pendente e recebe de volta 80% dos Créditos.")
    @app_commands.describe(numero="O número da encomenda (veja em /mercado_negro_encomendas)")
    async def mercado_negro_encomenda_cancelar(self, interaction: discord.Interaction, numero: int):
        sid, uid = _sid(interaction), str(interaction.user.id)
        devolvido = self.bot.db.cancelar_encomenda(sid, uid, int(numero))
        if devolvido is None:
            await interaction.response.send_message("Não achei essa encomenda pendente. Se ela já saiu para entrega, não dá mais para cancelar.", ephemeral=True)
            return
        simbolo = ui.simbolo_moeda("Créditos Sombrios")
        await interaction.response.send_message(f"Encomenda cancelada. O contrabandista devolveu {simbolo} **{devolvido} Créditos Sombrios**.", ephemeral=True)

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
