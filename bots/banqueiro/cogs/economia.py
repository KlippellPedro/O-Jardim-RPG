"""Cog Economia — comandos do jogador. Integra o Cartão Lunar (cashback,
desconto, linha de crédito). Lógica vem de core.economia e core.db."""

from __future__ import annotations

import logging
import math
import random
from datetime import datetime, timedelta, timezone
from typing import Optional, List

import discord
from discord import app_commands
from discord.ext import commands

from core import economia
from core import loot as loot_mod
from core import ui
from core.db import SaldoInsuficiente
from core.platform_api import PlatformApiError

log = logging.getLogger("banqueiro")

COR_RARIDADE = ui.COR_RARIDADE
SIMBOLO = ui.SIMBOLO_MOEDA
MOEDAS_CHOICES = [app_commands.Choice(name="Lunaris ☾", value="Lunaris"),
                  app_commands.Choice(name="Solares ☉", value="Solares")]


def _sid(interaction): return str(interaction.guild_id)


def fmt_carteira(carteira: dict, vazio: str = "carteira vazia") -> str:
    if not carteira:
        return vazio
    partes = []
    for moeda, saldo in carteira.items():
        partes.append(f"{SIMBOLO.get(economia.normalizar(moeda), '◈')} **{saldo}** {moeda}")
    return " · ".join(partes)


def fmt_preco(preco) -> str:
    if preco is None:
        return "—"
    if isinstance(preco, dict):
        return " / ".join(f"{v} {k}" for k, v in preco.items())
    return f"{preco} (qualquer moeda)"


def _tag_item(it) -> str:
    """Resumo curto pro /loja: arma mostra simples/marcial + corpo a corpo/à
    distância; os demais tipos mostram um rótulo próprio."""
    c = it.conteudo
    if it.tipo == "arma":
        modo = c.get("modo") or "Corpo a corpo"
        sub = str(c.get("subtipo", "")).capitalize()
        return " · ".join(p for p in (sub, modo) if p)
    if it.tipo == "armadura":
        return "Escudo" if c.get("subtipo") == "escudo" else "Armadura"
    if it.tipo == "veiculo":
        sistema, tier = c.get("sistema"), c.get("tier")
        return f"{sistema} · {tier}" if sistema and tier and tier != "T0" else "Veículo"
    if it.tipo == "monstro":
        classe, nivel = c.get("classe"), c.get("nivel")
        return f"{classe} · Nv {nivel}" if classe and nivel is not None else "Ser"
    if it.tipo == "drop":
        parte, especie = c.get("parte"), c.get("especie")
        return f"{parte} · {especie}" if parte and especie else "Drop"
    if it.tipo == "equipamento":
        return "Equipamento"
    return it.tipo.capitalize()


class Economia(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    async def _ac_itens(self, interaction, current: str) -> List[app_commands.Choice[str]]:
        cat = getattr(self.bot, "catalogo", None)
        if cat is None:
            return []
        itens = cat.buscar(current, limite=25) if current else cat.listar()[:25]
        return [app_commands.Choice(name=i.titulo[:100], value=i.id) for i in itens]

    @app_commands.command(description="Mostra sua carteira, cofre e crédito.")
    @app_commands.describe(membro="Ver de outra pessoa (opcional).")
    async def carteira(self, interaction, membro: Optional[discord.Member] = None):
        alvo = membro or interaction.user
        db = self.bot.db
        sid, uid = _sid(interaction), str(alvo.id)
        db.garantir_jogador(sid, uid)
        tier = db.get_cofre_tier(sid, uid)
        cofre = economia.cofre_por_id(tier)
        cap = economia.capacidade_do_cofre(tier)
        cartao = db.get_cartao(sid, uid)
        emb = ui.embed(f"💰 Carteira de {alvo.display_name}", categoria="economia",
                        descricao=fmt_carteira(db.get_carteira(sid, uid)))
        emb.add_field(name="🔒 Guardado no cofre", value=fmt_carteira(db.get_cofre_saldo(sid, uid), vazio="nada guardado"), inline=False)
        emb.add_field(name=f"{cofre['nome']} — itens", value=ui.barra(db.contar_itens(sid, uid), cap), inline=False)
        emb.add_field(name="Cartão", value=f"crédito {cartao['credito']} · {economia.cartao_por_id(cartao['tier'])['nome']}")
        divida = db.get_divida(sid, uid)
        if divida > 0:
            emb.add_field(
                name="📋 Dívida do Cartão Lunar",
                value=f"☾ {divida} Lunaris · pague quando quiser com `/divida_pagar`",
                inline=False,
            )
        emb.set_footer(text=f"{ui.MARCA} · Dinheiro na carteira pode ser roubado — use /cofre_depositar pra guardar")
        await interaction.response.send_message(embed=emb)

    @app_commands.command(description="Transfere dinheiro da sua carteira pra de outro jogador.")
    @app_commands.describe(membro="Pra quem pagar.", quantia="Quanto transferir.", moeda="Moeda (padrão Lunaris).")
    @app_commands.choices(moeda=MOEDAS_CHOICES)
    async def pagar(self, interaction, membro: discord.Member, quantia: app_commands.Range[int, 1], moeda: Optional[app_commands.Choice[str]] = None):
        if membro.id == interaction.user.id:
            await interaction.response.send_message("Você não pode pagar a si mesmo.", ephemeral=True)
            return
        if membro.bot:
            await interaction.response.send_message("Não dá pra pagar um bot.", ephemeral=True)
            return
        moeda_nome = moeda.value if moeda else "Lunaris"
        sid, uid = _sid(interaction), str(interaction.user.id)
        db = self.bot.db
        db.garantir_jogador(sid, uid)
        db.garantir_jogador(sid, str(membro.id))
        try:
            db.debitar(sid, uid, moeda_nome, quantia)
        except SaldoInsuficiente as e:
            await interaction.response.send_message(f"💸 {e}", ephemeral=True)
            return
        db.creditar(sid, str(membro.id), moeda_nome, quantia)
        db.registrar_extrato(sid, uid, -quantia, moeda_nome, f"Pagamento pra {membro.display_name}")
        db.registrar_extrato(sid, str(membro.id), quantia, moeda_nome, f"Pagamento de {interaction.user.display_name}")
        simb = SIMBOLO.get(economia.normalizar(moeda_nome), "")
        emb = ui.embed("💸 Pagamento feito!", categoria="economia",
            descricao=f"{interaction.user.mention} pagou {simb} **{quantia} {moeda_nome}** pra {membro.mention}.")
        await interaction.response.send_message(embed=emb)

    @app_commands.command(description="Mostra as carteiras mais cheias do servidor.")
    @app_commands.describe(moeda="Moeda pro ranking (padrão Lunaris).")
    @app_commands.choices(moeda=MOEDAS_CHOICES)
    async def ranking(self, interaction, moeda: Optional[app_commands.Choice[str]] = None):
        moeda_nome = moeda.value if moeda else "Lunaris"
        sid = _sid(interaction)
        top = self.bot.db.top_carteiras(sid, moeda_nome, limite=10)
        if not top:
            await interaction.response.send_message("Ninguém tem saldo nessa moeda ainda.", ephemeral=True)
            return
        simb = SIMBOLO.get(economia.normalizar(moeda_nome), "")
        linhas = [f"{i + 1}. <@{r['user_id']}> — {simb} {r['saldo']}" for i, r in enumerate(top)]
        emb = ui.embed(f"🏆 Ranking de {moeda_nome}", categoria="economia", descricao="\n".join(linhas))
        await interaction.response.send_message(embed=emb)

    @app_commands.command(description="Mostra o histórico recente de transações (compras, roubos, pagamentos...).")
    @app_commands.describe(membro="Ver o extrato de outra pessoa (opcional).")
    async def extrato(self, interaction, membro: Optional[discord.Member] = None):
        alvo = membro or interaction.user
        sid, uid = _sid(interaction), str(alvo.id)
        registros = self.bot.db.listar_extrato(sid, uid, limite=15)
        if not registros:
            await interaction.response.send_message(f"{alvo.display_name} não tem transações registradas ainda.", ephemeral=True)
            return
        linhas = []
        for r in registros:
            simb = SIMBOLO.get(economia.normalizar(r["moeda"]), "")
            sinal = "+" if r["delta"] >= 0 else "−"
            quando = r["criado_em"].strftime("%d/%m %Hh%M")
            linhas.append(f"`{quando}` {sinal}{simb}{abs(r['delta'])} — {r['descricao']}")
        emb = ui.embed(f"📜 Extrato de {alvo.display_name}", categoria="economia", descricao="\n".join(linhas))
        emb.set_footer(text=f"{ui.MARCA} · Últimas {len(registros)} transações, mais recente primeiro")
        await interaction.response.send_message(embed=emb)

    @app_commands.command(description="Lista o que o Banqueiro tem à venda.")
    @app_commands.describe(categoria="Filtra por categoria.")
    @app_commands.choices(categoria=[
        app_commands.Choice(name="Tudo", value="todos"),
        app_commands.Choice(name="Arsenal", value="arsenal"),
        app_commands.Choice(name="Veículos", value="veiculos"),
        app_commands.Choice(name="Bestiário", value="bestiario"),
        app_commands.Choice(name="Drops", value="drops")])
    async def loja(self, interaction, categoria: Optional[app_commands.Choice[str]] = None):
        itens = self.bot.catalogo.listar()
        alvo = categoria.value if categoria else "todos"
        if alvo != "todos":
            itens = [i for i in itens if i.categoria == alvo]
        if not itens:
            await interaction.response.send_message("Nada à venda nessa categoria ainda.", ephemeral=True)
            return

        blocos = ui.paginar(itens, 20)
        paginas = []
        for i, bloco in enumerate(blocos, start=1):
            emb = ui.embed(f"🏪 Loja do {economia.NOME_BOT}", categoria="loja", descricao=f"{len(itens)} item(ns).")
            for it in bloco:
                emb.add_field(name=f"{ui.icone_raridade(it.raridade)} {it.titulo}  ·  {_tag_item(it)}",
                              value=f"`{it.id}` — {fmt_preco(it.preco)}", inline=False)
            if len(blocos) > 1:
                emb.set_footer(text=f"{ui.MARCA} · Página {i}/{len(blocos)} · Use ◀ ▶ pra navegar, /comprar pra comprar")
            paginas.append(emb)

        if len(paginas) == 1:
            await interaction.response.send_message(embed=paginas[0])
            return
        view = ui.Paginador(paginas, autor_id=interaction.user.id)
        await interaction.response.send_message(embed=view.pagina_atual, view=view)

    @app_commands.command(description="Compra um item da loja.")
    @app_commands.describe(item="Item.", moeda="Moeda pra pagar (padrão Lunaris).")
    @app_commands.choices(moeda=MOEDAS_CHOICES)
    async def comprar(self, interaction, item: str, moeda: Optional[app_commands.Choice[str]] = None):
        moeda_nome = moeda.value if moeda else "Lunaris"
        it = self.bot.catalogo.get(item)
        if it is None:
            await interaction.response.send_message(f"Não achei o item `{item}`.", ephemeral=True)
            return
        preco = economia.resolver_preco(it.preco, moeda_nome)
        if preco is None:
            await interaction.response.send_message(f"**{it.titulo}** não tem preço em {moeda_nome}. Preço: {fmt_preco(it.preco)}.", ephemeral=True)
            return
        sid, uid = _sid(interaction), str(interaction.user.id)
        db = self.bot.db
        db.garantir_jogador(sid, uid)
        tier = db.get_cofre_tier(sid, uid)
        if self.bot.platform is None and not economia.pode_guardar(db.contar_itens(sid, uid), 1, tier):
            await interaction.response.send_message(f"Seu cofre ({economia.cofre_por_id(tier)['nome']}) está cheio. Use `/cofre_melhorar`.", ephemeral=True)
            return
        cartao = db.get_cartao(sid, uid)
        benef = economia.beneficios_credito(cartao["credito"])
        limite = economia.limite_efetivo(cartao["tier"], cartao["credito"]) if economia.mesma_moeda(moeda_nome, "Lunaris") else 0
        divida_antes = db.get_divida(sid, uid)
        try:
            saldo_novo = db.debitar(sid, uid, moeda_nome, preco, permitir_negativo_ate=limite)
        except SaldoInsuficiente as e:
            await interaction.response.send_message(f"💸 {e}", ephemeral=True)
            return
        db.registrar_extrato(sid, uid, -preco, moeda_nome, f"Compra: {it.titulo}")
        divida_depois = db.get_divida(sid, uid)
        divida_criada = max(0, divida_depois - divida_antes)
        # A entrega no cofre central é uma chamada HTTP que pode passar dos 3s
        # que o Discord dá pra responder a interação; defere antes pra não
        # estourar ("The application did not respond"). Daqui pra frente toda
        # resposta é followup.send.
        await interaction.response.defer()
        destino_central = False
        if self.bot.platform is not None:
            try:
                await self.bot.platform.deposit_vault(
                    discord_user_id=interaction.user.id,
                    discord_guild_id=interaction.guild_id,
                    idempotency_key=f"compra-item:{interaction.id}",
                    reason=f"Compra de {it.titulo} no Banqueiro",
                    items=[{
                        "item_id": it.id,
                        "titulo": it.titulo,
                        "quantidade": 1,
                        "dados": {
                            **it.conteudo,
                            "tipo": it.tipo,
                            "raridade": it.raridade,
                            "origem": "loja-discord",
                        },
                    }],
                )
                destino_central = True
            except PlatformApiError as exc:
                log.warning(
                    "falha ao depositar compra na plataforma (guild=%s user=%s item=%s status=%s): %s",
                    sid, uid, it.id, exc.status_code, exc,
                )
                if exc.status_code == 404:
                    if not economia.pode_guardar(db.contar_itens(sid, uid), 1, tier):
                        db.estornar_debito(sid, uid, moeda_nome, preco, divida_criada)
                        db.registrar_extrato(sid, uid, preco, moeda_nome, f"Compra cancelada: {it.titulo} (cofre cheio)")
                        await interaction.followup.send(
                            "Sua conta ainda nao esta vinculada e o cofre antigo esta cheio. "
                            "A compra foi cancelada e o valor devolvido.",
                            ephemeral=True,
                        )
                        return
                else:
                    if exc.status_code is not None and 400 <= exc.status_code < 500:
                        db.estornar_debito(sid, uid, moeda_nome, preco, divida_criada)
                        db.registrar_extrato(sid, uid, preco, moeda_nome, f"Compra cancelada: {it.titulo} (falha na entrega)")
                    await interaction.followup.send(
                        "Nao consegui confirmar a entrega. Em erro de validacao o valor foi devolvido; "
                        "em falha de rede, avise o mestre para conferir o cofre antes de repetir.",
                        ephemeral=True,
                    )
                    return
        if not destino_central:
            db.add_item(sid, uid, it.id, it.titulo, it.tipo, 1)
        cashback = 0
        if benef["cashback"] > 0 and economia.mesma_moeda(moeda_nome, "Lunaris"):
            cashback = math.floor(preco * benef["cashback"])
            if cashback > 0:
                db.creditar(sid, uid, "Lunaris", cashback)
                db.registrar_extrato(sid, uid, cashback, "Lunaris", "Cashback do Cartão Lunar")
        simb = SIMBOLO.get(economia.normalizar(moeda_nome), "")
        linhas = [f"Você {'contratou' if it.acao == 'Contratar' else 'comprou'} **{it.titulo}** por {simb} {preco} {moeda_nome}."]
        linhas.append(
            "O item foi para o cofre da sua conta; escolha o personagem no site."
            if destino_central
            else "O item foi para o cofre antigo do bot; vincule sua conta para usar a ficha."
        )
        if cashback:
            linhas.append(f"💳 Cashback: +{cashback} Lunaris.")
        if divida_criada > 0:
            linhas.append(f"⚠️ Usou {divida_criada} Lunaris do crédito. Dívida total: {divida_depois} Lunaris.")
        emb = ui.embed(f"{ui.icone_raridade(it.raridade)} Compra realizada!", categoria="loja",
                        descricao="\n".join(linhas), cor=ui.cor_raridade(it.raridade))
        await interaction.followup.send(embed=emb)

    @comprar.autocomplete("item")
    async def comprar_ac(self, interaction, current: str):
        return await self._ac_itens(interaction, current)

    @app_commands.command(description="Vende um item do inventário de volta pra loja.")
    @app_commands.describe(item="Item.", moeda="Moeda pra receber (padrão Lunaris).")
    @app_commands.choices(moeda=MOEDAS_CHOICES)
    async def vender(self, interaction, item: str, moeda: Optional[app_commands.Choice[str]] = None):
        moeda_nome = moeda.value if moeda else "Lunaris"
        it = self.bot.catalogo.get(item)
        if it is None:
            await interaction.response.send_message(f"Não achei o item `{item}` no catálogo.", ephemeral=True)
            return
        preco = economia.resolver_preco(it.preco, moeda_nome)
        if preco is None:
            await interaction.response.send_message(f"**{it.titulo}** não tem preço em {moeda_nome}.", ephemeral=True)
            return
        sid, uid = _sid(interaction), str(interaction.user.id)
        if not self.bot.db.remover_item(sid, uid, it.id, 1):
            await interaction.response.send_message(f"Você não tem **{it.titulo}** no inventário.", ephemeral=True)
            return
        reembolso = math.floor(preco * economia.VENDA_RATIO)
        self.bot.db.creditar(sid, uid, moeda_nome, reembolso)
        self.bot.db.registrar_extrato(sid, uid, reembolso, moeda_nome, f"Venda: {it.titulo}")
        simb = SIMBOLO.get(economia.normalizar(moeda_nome), "")
        emb = ui.embed("Venda realizada!", categoria="loja",
            descricao=f"Você vendeu **{it.titulo}** por {simb} {reembolso} {moeda_nome} ({int(economia.VENDA_RATIO*100)}%).")
        await interaction.response.send_message(embed=emb)

    @vender.autocomplete("item")
    async def vender_ac(self, interaction, current: str):
        return await self._ac_itens(interaction, current)

    @app_commands.command(description="Mostra seu inventário.")
    @app_commands.describe(membro="Ver de outra pessoa (opcional).")
    async def inventario(self, interaction, membro: Optional[discord.Member] = None):
        alvo = membro or interaction.user
        sid, uid = _sid(interaction), str(alvo.id)
        db = self.bot.db
        db.garantir_jogador(sid, uid)
        itens = db.listar_inventario(sid, uid)
        cap = economia.capacidade_do_cofre(db.get_cofre_tier(sid, uid))
        corpo = "inventário vazio" if not itens else "\n".join(f"• **{i['titulo']}** ×{i['quantidade']}  (`{i['item_id']}`)" for i in itens)
        emb = ui.embed(f"🎒 Inventário de {alvo.display_name}", categoria="inventario", descricao=corpo)
        emb.set_footer(text=f"{ui.MARCA} · Cofre: {ui.barra(db.contar_itens(sid, uid), cap)}")
        await interaction.response.send_message(embed=emb)

    @app_commands.command(description="Troca moedas (Lunaris ⇄ Solares) no banco.")
    @app_commands.describe(de="Moeda que dá.", para="Moeda que quer.", quantia="Quanto trocar.")
    @app_commands.choices(de=MOEDAS_CHOICES, para=MOEDAS_CHOICES)
    async def cambio(self, interaction, de: app_commands.Choice[str], para: app_commands.Choice[str], quantia: app_commands.Range[int, 1]):
        sid, uid = _sid(interaction), str(interaction.user.id)
        rate, taxa = self.bot.db.get_cambio(sid)
        benef = economia.beneficios_credito(self.bot.db.get_cartao(sid, uid)["credito"])
        taxa_aj = max(0.0, min(0.99, taxa * benef["taxa_mult"] * (1 - benef["desconto"])))
        try:
            recebido, taxa_cobrada = economia.converter(quantia, de.value, para.value, rate, taxa_aj)
        except ValueError as e:
            await interaction.response.send_message(f"⚠️ {e}", ephemeral=True)
            return
        if recebido <= 0:
            await interaction.response.send_message("Quantia baixa demais pra converter. Aumente.", ephemeral=True)
            return
        self.bot.db.garantir_jogador(sid, uid)
        try:
            self.bot.db.debitar(sid, uid, de.value, quantia)
        except SaldoInsuficiente as e:
            await interaction.response.send_message(f"💸 {e}", ephemeral=True)
            return
        self.bot.db.creditar(sid, uid, para.value, recebido)
        self.bot.db.registrar_extrato(sid, uid, -quantia, de.value, f"Câmbio: trocado por {para.value}")
        self.bot.db.registrar_extrato(sid, uid, recebido, para.value, f"Câmbio: recebido de {de.value}")
        s_de = SIMBOLO.get(economia.normalizar(de.value), "")
        s_para = SIMBOLO.get(economia.normalizar(para.value), "")
        emb = ui.embed("💱 Câmbio no Banco Lunar", categoria="economia",
            descricao=f"Trocou {s_de} **{quantia} {de.value}** por {s_para} **{recebido} {para.value}**.\nTaxa: {taxa_cobrada} {para.value} ({round(taxa_aj*100,1)}%).")
        await interaction.response.send_message(embed=emb)

    @app_commands.command(description="Mostra seu cofre/armazém.")
    async def cofre(self, interaction):
        sid, uid = _sid(interaction), str(interaction.user.id)
        db = self.bot.db
        tier = db.get_cofre_tier(sid, uid)
        seg_tier = db.get_seguranca_tier(sid, uid)
        cofre = economia.cofre_por_id(tier)
        seguranca = economia.seguranca_por_id(seg_tier)
        prox = economia.proximo_cofre(tier)
        prox_seg = economia.proximo_seguranca(seg_tier)
        emb = ui.embed(f"🔒 Cofre de {interaction.user.display_name}", categoria="cofre",
                        descricao=f"**{cofre['nome']}** · {seguranca['nome']}")
        emb.add_field(name="Itens", value=ui.barra(db.contar_itens(sid, uid), economia.capacidade_do_cofre(tier)), inline=False)
        saldo_cofre = db.get_cofre_saldo(sid, uid)
        cap_moeda = economia.capacidade_moeda_do_cofre(tier)
        emb.add_field(name="Dinheiro guardado (a salvo de roubo)",
                      value=f"{fmt_carteira(saldo_cofre, vazio='nada guardado')}\n"
                            f"Limite: {ui.barra(saldo_cofre.get('Lunaris', 0), cap_moeda)} Lunaris", inline=False)
        chance = round(economia.chance_roubo_cofre(seg_tier, db.get_config_roubo(sid)["chance_base"]) * 100)
        emb.add_field(name="Segurança", value=f"{seguranca['nome']} — chance de arrombarem seu cofre hoje: ~{chance}%", inline=False)
        if prox:
            emb.add_field(name="Próximo tier de cofre", value=f"{prox['nome']} ({prox['capacidade']} itens) — ☾ {prox['custo']} · /cofre_melhorar", inline=False)
        if prox_seg:
            emb.add_field(name="Próxima segurança", value=f"{prox_seg['nome']} ({int(prox_seg['defesa']*100)}% de defesa) — ☾ {prox_seg['custo']} · /cofre_seguranca_melhorar", inline=False)
        emb.set_footer(text=f"{ui.MARCA} · /cofre_depositar e /cofre_sacar movem dinheiro entre carteira e cofre")
        await interaction.response.send_message(embed=emb)

    @app_commands.command(name="cofre_melhorar", description="Faz upgrade do cofre (paga em Lunaris).")
    async def cofre_melhorar(self, interaction):
        sid, uid = _sid(interaction), str(interaction.user.id)
        db = self.bot.db
        prox = economia.proximo_cofre(db.get_cofre_tier(sid, uid))
        if not prox:
            await interaction.response.send_message("Seu cofre já está no máximo (Eterno).", ephemeral=True)
            return
        benef = economia.beneficios_credito(db.get_cartao(sid, uid)["credito"])
        custo = math.ceil(prox["custo"] * (1 - benef["desconto"]))
        try:
            db.debitar(sid, uid, "Lunaris", custo)
        except SaldoInsuficiente as e:
            await interaction.response.send_message(f"💸 {e}", ephemeral=True)
            return
        db.set_cofre_tier(sid, uid, prox["id"])
        db.registrar_extrato(sid, uid, -custo, "Lunaris", f"Upgrade do cofre pra {prox['nome']}")
        emb = ui.embed("🔒 Cofre melhorado!", categoria="cofre",
            descricao=f"Agora você tem um **{prox['nome']}** ({prox['capacidade']} itens, guarda até {economia.capacidade_moeda_do_cofre(prox['id'])} Lunaris). Custou ☾ {custo}.")
        await interaction.response.send_message(embed=emb)

    @app_commands.command(name="cofre_seguranca_melhorar", description="Sobe a segurança do cofre (reduz a chance de te roubarem).")
    async def cofre_seguranca_melhorar(self, interaction):
        sid, uid = _sid(interaction), str(interaction.user.id)
        db = self.bot.db
        prox = economia.proximo_seguranca(db.get_seguranca_tier(sid, uid))
        if not prox:
            await interaction.response.send_message("Sua segurança já está no máximo.", ephemeral=True)
            return
        benef = economia.beneficios_credito(db.get_cartao(sid, uid)["credito"])
        custo = math.ceil(prox["custo"] * (1 - benef["desconto"]))
        try:
            db.debitar(sid, uid, "Lunaris", custo)
        except SaldoInsuficiente as e:
            await interaction.response.send_message(f"💸 {e}", ephemeral=True)
            return
        db.set_seguranca_tier(sid, uid, prox["id"])
        db.registrar_extrato(sid, uid, -custo, "Lunaris", f"Upgrade de segurança pra {prox['nome']}")
        emb = ui.embed("🛡️ Segurança melhorada!", categoria="cofre",
            descricao=f"Agora seu cofre tem **{prox['nome']}** ({int(prox['defesa']*100)}% de defesa contra /roubar_cofre). Custou ☾ {custo}.")
        await interaction.response.send_message(embed=emb)

    @app_commands.command(name="cofre_depositar", description="Guarda dinheiro da carteira no cofre (fica a salvo de roubo).")
    @app_commands.describe(quantia="Quanto guardar.", moeda="Moeda (padrão Lunaris).")
    @app_commands.choices(moeda=MOEDAS_CHOICES)
    async def cofre_depositar(self, interaction, quantia: app_commands.Range[int, 1], moeda: Optional[app_commands.Choice[str]] = None):
        moeda_nome = moeda.value if moeda else "Lunaris"
        sid, uid = _sid(interaction), str(interaction.user.id)
        db = self.bot.db
        db.garantir_jogador(sid, uid)
        if economia.mesma_moeda(moeda_nome, "Lunaris"):
            tier = db.get_cofre_tier(sid, uid)
            saldo_atual = db.get_saldo_cofre(sid, uid, "Lunaris")
            if not economia.pode_guardar_moeda(saldo_atual, quantia, tier):
                cap = economia.capacidade_moeda_do_cofre(tier)
                await interaction.response.send_message(
                    f"Seu cofre só guarda até ☾ {cap} Lunaris (tem ☾ {saldo_atual}). Use `/cofre_melhorar` pra aumentar.",
                    ephemeral=True)
                return
        try:
            db.debitar(sid, uid, moeda_nome, quantia)
        except SaldoInsuficiente as e:
            await interaction.response.send_message(f"💸 {e}", ephemeral=True)
            return
        novo = db.creditar_cofre(sid, uid, moeda_nome, quantia)
        db.registrar_extrato(sid, uid, -quantia, moeda_nome, "Depositado no cofre")
        simb = SIMBOLO.get(economia.normalizar(moeda_nome), "")
        emb = ui.embed("🔒 Guardado no cofre!", categoria="cofre",
            descricao=f"Você guardou {simb} **{quantia} {moeda_nome}**. Saldo guardado: {simb} {novo} {moeda_nome}.")
        await interaction.response.send_message(embed=emb)

    @app_commands.command(name="cofre_sacar", description="Tira dinheiro do cofre de volta pra carteira (cobra uma taxa pequena).")
    @app_commands.describe(quantia="Quanto sacar.", moeda="Moeda (padrão Lunaris).")
    @app_commands.choices(moeda=MOEDAS_CHOICES)
    async def cofre_sacar(self, interaction, quantia: app_commands.Range[int, 1], moeda: Optional[app_commands.Choice[str]] = None):
        moeda_nome = moeda.value if moeda else "Lunaris"
        sid, uid = _sid(interaction), str(interaction.user.id)
        db = self.bot.db
        try:
            db.debitar_cofre(sid, uid, moeda_nome, quantia)
        except SaldoInsuficiente as e:
            await interaction.response.send_message(f"💸 {e}", ephemeral=True)
            return
        taxa = math.floor(quantia * economia.COFRE_SAQUE_TAXA)
        recebido = quantia - taxa
        novo = db.creditar(sid, uid, moeda_nome, recebido)
        db.registrar_extrato(sid, uid, -quantia, moeda_nome, "Sacado do cofre")
        db.registrar_extrato(sid, uid, recebido, moeda_nome, f"Recebido na carteira (taxa de {int(economia.COFRE_SAQUE_TAXA*100)}%)")
        simb = SIMBOLO.get(economia.normalizar(moeda_nome), "")
        linhas = [f"Você sacou {simb} **{recebido} {moeda_nome}** pra carteira (taxa de {int(economia.COFRE_SAQUE_TAXA*100)}%: {simb} {taxa})."]
        linhas.append("⚠️ Dinheiro na carteira pode ser roubado.")
        emb = ui.embed("🔓 Saque do cofre!", categoria="cofre", descricao="\n".join(linhas))
        await interaction.response.send_message(embed=emb)

    @staticmethod
    async def _avisar_vitima(membro: discord.Member, guild_nome: str, texto: str) -> None:
        """DM pra vítima de um roubo. Gente pode ter DM fechada ou ter
        bloqueado o bot — isso não pode derrubar o comando, só loga e segue."""
        try:
            await membro.send(f"🥷 Em **{guild_nome}**: {texto}")
        except (discord.Forbidden, discord.HTTPException):
            log.info("nao consegui mandar DM de aviso de roubo pra %s", membro.id)

    def _resgatar_recompensa(self, sid: str, uid: str, alvo_id: str) -> Optional[int]:
        """Se o alvo tem recompensa ativa, paga pro ladrão, zera a recompensa e
        quita a dívida (se a recompensa era do sistema). Devolve o valor pago."""
        db = self.bot.db
        rec = db.get_recompensa(sid, alvo_id)
        if rec["valor"] <= 0:
            return None
        db.creditar(sid, uid, "Lunaris", rec["valor"])
        if rec["tem_sistema"]:
            perdoado = db.zerar_divida(sid, alvo_id)
            if perdoado:
                db.registrar_extrato(sid, alvo_id, perdoado, "Lunaris", "Dívida perdoada (capturado)")
        db.limpar_recompensa(sid, alvo_id)
        return rec["valor"]

    @staticmethod
    def _fmt_espera(proxima, agora) -> str:
        restante = proxima - agora
        horas, resto = divmod(int(restante.total_seconds()), 3600)
        minutos = resto // 60
        return f"{horas}h{minutos:02d}min"

    @app_commands.command(description="Rouba metade da carteira de outro jogador. Sempre funciona — guardar na carteira é um risco.")
    @app_commands.describe(membro="De quem você quer roubar.")
    async def roubar(self, interaction, membro: discord.Member):
        sid, uid = _sid(interaction), str(interaction.user.id)
        db = self.bot.db
        if membro.id == interaction.user.id:
            await interaction.response.send_message("Você não pode roubar de si mesmo.", ephemeral=True)
            return
        if membro.bot:
            await interaction.response.send_message("Não dá pra roubar de um bot.", ephemeral=True)
            return
        alvo_id = str(membro.id)
        db.garantir_jogador(sid, uid)
        db.garantir_jogador(sid, alvo_id)

        agora = datetime.now(timezone.utc)
        proxima = db.get_proxima_tentativa_roubo(sid, uid)
        if proxima is not None and proxima > agora:
            await interaction.response.send_message(
                f"🕒 Você já roubou recentemente. Espere mais {self._fmt_espera(proxima, agora)}.", ephemeral=True)
            return
        protecao = db.get_protecao_vitima(sid, alvo_id)
        if protecao is not None and protecao > agora:
            await interaction.response.send_message(
                f"{membro.display_name} acabou de ser roubado e tá de guarda alta — espere mais {self._fmt_espera(protecao, agora)}.",
                ephemeral=True)
            return

        saldo_alvo = db.get_saldo(sid, alvo_id, "Lunaris")
        if saldo_alvo <= 0:
            await interaction.response.send_message(f"{membro.display_name} não tem nada na carteira pra roubar.", ephemeral=True)
            return

        db.registrar_tentativa_roubo(sid, uid, agora + timedelta(hours=economia.ROUBO_COOLDOWN_HORAS))
        db.registrar_protecao_vitima(sid, alvo_id, agora + timedelta(hours=economia.ROUBO_PROTECAO_VITIMA_HORAS))
        valor = max(1, math.floor(saldo_alvo * economia.ROUBO_CARTEIRA_PERCENT))
        db.debitar(sid, alvo_id, "Lunaris", valor)
        db.creditar(sid, uid, "Lunaris", valor)
        db.registrar_extrato(sid, uid, valor, "Lunaris", f"Roubado de {membro.display_name}")
        db.registrar_extrato(sid, alvo_id, -valor, "Lunaris", f"Roubado por {interaction.user.display_name}")

        linhas = [f"{interaction.user.mention} roubou ☾ **{valor} Lunaris** da carteira de {membro.mention}!"]
        recompensa = self._resgatar_recompensa(sid, uid, alvo_id)
        if recompensa:
            linhas.append(f"🎯 {membro.mention} tinha recompensa na cabeça — {interaction.user.mention} coletou mais ☾ **{recompensa} Lunaris**!")
            db.registrar_extrato(sid, uid, recompensa, "Lunaris", f"Recompensa por capturar {membro.display_name}")
            db.criar_aviso(sid, f"🎯 {membro.mention} foi capturado! {interaction.user.mention} coletou a recompensa.")
        emb = ui.embed("🥷 Roubo bem-sucedido!", categoria="economia", cor=0x2ECC71, descricao="\n".join(linhas))
        await interaction.response.send_message(embed=emb)
        await self._avisar_vitima(
            membro, interaction.guild.name,
            f"{interaction.user.display_name} roubou ☾ **{valor} Lunaris** da sua carteira. "
            "Guarde no cofre com `/cofre_depositar` pra ficar mais seguro.",
        )

    @app_commands.command(description="Tenta arrombar o cofre de outro jogador. Chance depende da segurança dele; se falhar, paga multa.")
    @app_commands.describe(membro="De quem você quer roubar o cofre.")
    async def roubar_cofre(self, interaction, membro: discord.Member):
        sid, uid = _sid(interaction), str(interaction.user.id)
        db = self.bot.db
        if membro.id == interaction.user.id:
            await interaction.response.send_message("Você não pode roubar de si mesmo.", ephemeral=True)
            return
        if membro.bot:
            await interaction.response.send_message("Não dá pra roubar de um bot.", ephemeral=True)
            return
        alvo_id = str(membro.id)
        db.garantir_jogador(sid, uid)
        db.garantir_jogador(sid, alvo_id)

        agora = datetime.now(timezone.utc)
        cfg = db.get_config_roubo(sid)
        proxima = db.get_proxima_tentativa_roubo_cofre(sid, uid)
        if proxima is not None and proxima > agora:
            await interaction.response.send_message(
                f"🕒 Você já tentou arrombar um cofre recentemente. Espere mais {self._fmt_espera(proxima, agora)}.", ephemeral=True)
            return

        saldo_alvo = db.get_saldo_cofre(sid, alvo_id, "Lunaris")
        if saldo_alvo <= 0:
            await interaction.response.send_message(f"O cofre de {membro.display_name} não tem Lunaris guardado.", ephemeral=True)
            return

        db.registrar_tentativa_roubo_cofre(sid, uid, agora + timedelta(hours=cfg["cooldown_horas"]))
        seg_tier = db.get_seguranca_tier(sid, alvo_id)
        chance = economia.chance_roubo_cofre(seg_tier, cfg["chance_base"])

        if random.random() < chance:
            valor = max(1, math.floor(saldo_alvo * economia.ROUBO_COFRE_PERCENT))
            db.debitar_cofre(sid, alvo_id, "Lunaris", valor)
            db.creditar(sid, uid, "Lunaris", valor)
            db.registrar_extrato(sid, uid, valor, "Lunaris", f"Cofre arrombado de {membro.display_name}")
            db.registrar_extrato(sid, alvo_id, -valor, "Lunaris", f"Cofre arrombado por {interaction.user.display_name}")
            linhas = [f"{interaction.user.mention} arrombou o cofre de {membro.mention} e levou ☾ **{valor} Lunaris**!"]
            recompensa = self._resgatar_recompensa(sid, uid, alvo_id)
            if recompensa:
                linhas.append(f"🎯 {membro.mention} tinha recompensa na cabeça — {interaction.user.mention} coletou mais ☾ **{recompensa} Lunaris**!")
                db.registrar_extrato(sid, uid, recompensa, "Lunaris", f"Recompensa por capturar {membro.display_name}")
                db.criar_aviso(sid, f"🎯 {membro.mention} foi capturado! {interaction.user.mention} coletou a recompensa.")
            emb = ui.embed("🥷 Cofre arrombado!", categoria="economia", cor=0x2ECC71, descricao="\n".join(linhas))
            await interaction.response.send_message(embed=emb)
            await self._avisar_vitima(
                membro, interaction.guild.name,
                f"{interaction.user.display_name} arrombou seu cofre e levou ☾ **{valor} Lunaris** guardados. "
                "Considere melhorar a segurança com `/cofre_seguranca_melhorar`.",
            )
            return

        saldo_ladrao = db.get_saldo(sid, uid, "Lunaris")
        percentual_multa = random.uniform(economia.ROUBO_MULTA_PERCENT_MIN, economia.ROUBO_MULTA_PERCENT_MAX)
        multa = max(1, math.floor(saldo_ladrao * percentual_multa)) if saldo_ladrao > 0 else 0
        if multa > 0:
            db.debitar(sid, uid, "Lunaris", multa)
            db.creditar(sid, alvo_id, "Lunaris", multa)
            db.registrar_extrato(sid, uid, -multa, "Lunaris", f"Multa por tentar arrombar o cofre de {membro.display_name}")
            db.registrar_extrato(sid, alvo_id, multa, "Lunaris", f"Multa recebida de {interaction.user.display_name}")
        emb = ui.embed("🚨 Arrombamento fracassado!", categoria="erro",
            descricao=f"{interaction.user.mention} tentou arrombar o cofre de {membro.mention} e a segurança pegou!"
                      + (f"\nPagou ☾ **{multa} Lunaris** de multa pro alvo." if multa else "\nNão tinha nada na carteira pra pagar multa."))
        await interaction.response.send_message(embed=emb)

    @app_commands.command(description="Mostra seu Cartão Lunar (crédito, nível e limite).")
    @app_commands.describe(membro="Ver de outra pessoa (opcional).")
    async def cartao(self, interaction, membro: Optional[discord.Member] = None):
        alvo = membro or interaction.user
        sid, uid = _sid(interaction), str(alvo.id)
        db = self.bot.db
        c = db.get_cartao(sid, uid)
        benef = economia.beneficios_credito(c["credito"])
        tier = economia.cartao_por_id(c["tier"]) or economia.cartao_por_id(economia.CARTAO_TIER_INICIAL)
        limite = economia.limite_efetivo(c["tier"], c["credito"])
        divida = db.get_divida(sid, uid)
        emb = ui.embed(f"💳 Cartão Lunar de {alvo.display_name}", categoria="economia")
        emb.add_field(name="Crédito", value=f"{c['credito']} — {benef['rotulo']}", inline=False)
        emb.add_field(name="Nível", value=f"{tier['nome']} (limite base {tier['limite']})")
        emb.add_field(name="Limite de crédito", value=f"☾ {limite} Lunaris")
        if divida > 0:
            emb.add_field(
                name="Dívida atual",
                value=f"☾ {divida} Lunaris · não é quitada por recebimentos; use `/divida_pagar`",
                inline=False,
            )
        prox = economia.proximo_cartao(c["tier"])
        rodape = f"{ui.MARCA}"
        if prox:
            rodape += f" · Próximo: {prox['nome']} (limite {prox['limite']}) — ☾ {prox['custo']} · /cartao_melhorar"
        emb.set_footer(text=rodape)
        await interaction.response.send_message(embed=emb)

    @app_commands.command(name="cartao_melhorar", description="Sobe o nível do Cartão Lunar (paga em Lunaris).")
    async def cartao_melhorar(self, interaction):
        sid, uid = _sid(interaction), str(interaction.user.id)
        db = self.bot.db
        c = db.get_cartao(sid, uid)
        prox = economia.proximo_cartao(c["tier"])
        if not prox:
            await interaction.response.send_message("Seu cartão já é Eterno (máximo).", ephemeral=True)
            return
        benef = economia.beneficios_credito(c["credito"])
        custo = math.ceil(prox["custo"] * (1 - benef["desconto"]))
        try:
            db.debitar(sid, uid, "Lunaris", custo)
        except SaldoInsuficiente as e:
            await interaction.response.send_message(f"💸 {e}", ephemeral=True)
            return
        db.set_cartao_tier(sid, uid, prox["id"])
        db.registrar_extrato(sid, uid, -custo, "Lunaris", f"Upgrade do cartão pra {prox['nome']}")
        emb = ui.embed("💳 Cartão melhorado!", categoria="economia",
            descricao=f"Agora você tem um **{prox['nome']}** (limite {prox['limite']} Lunaris). Custou ☾ {custo}.")
        await interaction.response.send_message(embed=emb)


    # ── Loja de baús (compráveis) ──
    BAUS_CHOICES = [app_commands.Choice(name=b["nome"], value=b["id"]) for b in economia.BAUS_COMPRAVEIS]

    @app_commands.command(name="loja_baus", description="Baús que dá pra comprar e abrir.")
    async def loja_baus(self, interaction):
        emb = ui.embed("🎁 Loja de Baús", categoria="bau")
        for b in economia.BAUS_COMPRAVEIS:
            emb.add_field(name=f"{b['nome']} — ☾ {b['preco']} Lunaris",
                          value=f"`{b['id']}` · {b['itens']} item(ns) + Lunaris", inline=False)
        emb.set_footer(text=f"{ui.MARCA} · /comprar_bau <tipo> · /abrir_bau <tipo>")
        await interaction.response.send_message(embed=emb)

    @app_commands.command(name="comprar_bau", description="Compra um baú de loot (paga em Lunaris).")
    @app_commands.describe(tipo="Tipo de baú.")
    @app_commands.choices(tipo=BAUS_CHOICES)
    async def comprar_bau(self, interaction, tipo: app_commands.Choice[str]):
        b = economia.bau_compravel_por_id(tipo.value)
        if not b:
            await interaction.response.send_message("Baú desconhecido.", ephemeral=True)
            return
        sid, uid = _sid(interaction), str(interaction.user.id)
        db = self.bot.db
        db.garantir_jogador(sid, uid)
        cartao = db.get_cartao(sid, uid)
        limite = economia.limite_efetivo(cartao["tier"], cartao["credito"])
        divida_antes = db.get_divida(sid, uid)
        try:
            saldo_novo = db.debitar(sid, uid, "Lunaris", b["preco"], permitir_negativo_ate=limite)
        except SaldoInsuficiente as e:
            await interaction.response.send_message(f"💸 {e}", ephemeral=True)
            return
        db.add_bau(sid, uid, b["id"], 1)
        db.registrar_extrato(sid, uid, -b["preco"], "Lunaris", f"Comprou {b['nome']}")
        msg = f"Você comprou um **{b['nome']}** por ☾ {b['preco']}. Abra com `/abrir_bau`."
        divida_depois = db.get_divida(sid, uid)
        divida_criada = max(0, divida_depois - divida_antes)
        if divida_criada > 0:
            msg += f"\n⚠️ Usou {divida_criada} Lunaris do crédito. Dívida total: {divida_depois} Lunaris."
        emb = ui.embed("🎁 Baú comprado!", categoria="bau", descricao=msg)
        await interaction.response.send_message(embed=emb)

    @app_commands.command(name="meus_baus", description="Mostra os baús que você tem pra abrir.")
    async def meus_baus(self, interaction):
        sid, uid = _sid(interaction), str(interaction.user.id)
        estoque = self.bot.db.listar_baus_estoque(sid, uid)
        if not estoque:
            await interaction.response.send_message("Você não tem baús. Compre com `/loja_baus`.", ephemeral=True)
            return
        linhas = []
        for e in estoque:
            b = economia.bau_compravel_por_id(e["bau_id"])
            linhas.append(f"• {(b['nome'] if b else e['bau_id'])} ×{e['quantidade']}  (`{e['bau_id']}`)")
        emb = ui.embed("🎁 Seus baús", categoria="bau", descricao="\n".join(linhas))
        await interaction.response.send_message(embed=emb)

    def _entregar_legado(self, sid: str, uid: str, premio: dict) -> List[str]:
        db = self.bot.db
        db.creditar(sid, uid, "Lunaris", premio["lunaris"])
        db.registrar_extrato(sid, uid, premio["lunaris"], "Lunaris", "Baú aberto")
        tier = db.get_cofre_tier(sid, uid)
        ganhos = [f"☾ {premio['lunaris']} Lunaris"]
        for it in premio["itens"]:
            if economia.pode_guardar(db.contar_itens(sid, uid), 1, tier):
                db.add_item(sid, uid, it.id, it.titulo, it.tipo, 1)
                ganhos.append(f"**{it.titulo}** ({it.raridade})")
            else:
                ganhos.append(f"~~{it.titulo}~~ — cofre cheio! (`/cofre_melhorar`)")
        return ganhos

    async def _abrir_um_bau(self, interaction, sid: str, uid: str, b: dict):
        """Sorteia e entrega o prêmio de UM baú (já removido do estoque de
        quem chamou). Devolve (ganhos, destino, ok, lunaris). ok=False = a
        entrega central falhou de um jeito recuperável; o baú já foi
        devolvido ao estoque e o chamador deve avisar o jogador."""
        db = self.bot.db
        premio = loot_mod.sortear_bau(self.bot.catalogo, qtd_itens=b["itens"], rng=random,
                                      pesos=b["pesos"], lunaris_min=b["lunaris_min"], lunaris_max=b["lunaris_max"], tipos=b.get("tipos"))
        ganhos = [f"☾ {premio['lunaris']} Lunaris"]
        ganhos.extend(f"**{it.titulo}** ({it.raridade})" for it in premio["itens"])
        destino = "cofre da sua conta no site"
        if self.bot.platform is not None:
            try:
                await self.bot.platform.deposit_vault(
                    discord_user_id=interaction.user.id,
                    discord_guild_id=interaction.guild_id,
                    idempotency_key=f"bau-comprado:{interaction.id}:{b['id']}:{premio['lunaris']}",
                    reason=f"Abertura de {b['nome']} comprado no Banqueiro",
                    items=[{
                        "item_id": it.id,
                        "titulo": it.titulo,
                        "quantidade": 1,
                        "dados": {
                            **it.conteudo,
                            "tipo": it.tipo,
                            "raridade": it.raridade,
                            "origem": "bau-comprado-discord",
                        },
                    } for it in premio["itens"]],
                    currencies=[{"moeda": "Lunaris", "quantidade": premio["lunaris"]}],
                )
            except PlatformApiError as exc:
                log.warning(
                    "falha ao depositar bau na plataforma (guild=%s user=%s bau=%s status=%s): %s",
                    sid, uid, b["id"], exc.status_code, exc,
                )
                if exc.status_code == 404:
                    destino = "sua carteira no Banqueiro (vincule sua conta pra usar a ficha)"
                    ganhos = self._entregar_legado(sid, uid, premio)
                else:
                    if exc.status_code is not None and 400 <= exc.status_code < 500:
                        db.add_bau(sid, uid, b["id"], 1)
                    return [], "", False, 0
        else:
            destino = "sua carteira"
            ganhos = self._entregar_legado(sid, uid, premio)
        return ganhos, destino, True, premio["lunaris"]

    @app_commands.command(name="abrir_bau", description="Abre um baú que você comprou.")
    @app_commands.describe(tipo="Tipo de baú.")
    @app_commands.choices(tipo=BAUS_CHOICES)
    async def abrir_bau(self, interaction, tipo: app_commands.Choice[str]):
        b = economia.bau_compravel_por_id(tipo.value)
        if not b:
            await interaction.response.send_message("Baú desconhecido.", ephemeral=True)
            return
        sid, uid = _sid(interaction), str(interaction.user.id)
        db = self.bot.db
        if not db.remover_bau(sid, uid, b["id"], 1):
            await interaction.response.send_message(f"Você não tem um **{b['nome']}**. Compre com `/loja_baus`.", ephemeral=True)
            return
        # _abrir_um_bau faz a entrega no cofre central (HTTP, pode passar dos
        # 3s do Discord); defere antes pra não estourar a interação.
        await interaction.response.defer()
        ganhos, destino, ok, _lunaris = await self._abrir_um_bau(interaction, sid, uid, b)
        if not ok:
            await interaction.followup.send(
                "Nao consegui confirmar a entrega central. "
                "Se o erro foi de validacao, o bau voltou ao estoque; caso contrario, avise o mestre para conferir o cofre.",
                ephemeral=True,
            )
            return
        rodape_dica = (
            "Escolha o personagem pelo site." if self.bot.platform is not None
            else "As moedas ficam na carteira — guarde no cofre com `/cofre_depositar` pra ficar a salvo de roubo."
        )
        emb = ui.embed(f"🎁 {b['nome']} aberto!", categoria="bau",
            descricao="\n".join(f"• {g}" for g in ganhos) + f"\n\nEntregue em **{destino}**. {rodape_dica}")
        await interaction.followup.send(embed=emb)

    @app_commands.command(name="abrir_todos", description="Abre todos os baús que você tem de uma vez (ou de um tipo só).")
    @app_commands.describe(tipo="Tipo de baú (opcional — sem isso, abre todos os tipos).")
    @app_commands.choices(tipo=BAUS_CHOICES)
    async def abrir_todos(self, interaction, tipo: Optional[app_commands.Choice[str]] = None):
        sid, uid = _sid(interaction), str(interaction.user.id)
        db = self.bot.db
        estoque = db.listar_baus_estoque(sid, uid)
        if tipo:
            estoque = [e for e in estoque if e["bau_id"] == tipo.value]
        if not estoque:
            await interaction.response.send_message("Você não tem baús pra abrir. Compre com `/loja_baus`.", ephemeral=True)
            return
        total_no_estoque = sum(e["quantidade"] for e in estoque)
        await interaction.response.defer()
        total_lunaris = 0
        itens_ganhos: List[str] = []
        falhas = 0
        abertos = 0
        restantes = economia.ABRIR_TODOS_LIMITE
        for entrada in estoque:
            if restantes <= 0:
                break
            b = economia.bau_compravel_por_id(entrada["bau_id"])
            if not b:
                continue
            for _ in range(min(entrada["quantidade"], restantes)):
                if not db.remover_bau(sid, uid, b["id"], 1):
                    break
                ganhos, _destino, ok, lunaris = await self._abrir_um_bau(interaction, sid, uid, b)
                restantes -= 1
                if not ok:
                    falhas += 1
                    continue
                abertos += 1
                total_lunaris += lunaris
                itens_ganhos.extend(g for g in ganhos if "Lunaris" not in g)
        linhas = [f"Abriu **{abertos}** baú(s), ganhou ☾ **{total_lunaris} Lunaris** no total."]
        if itens_ganhos:
            linhas.append("Itens: " + ", ".join(itens_ganhos)[:900])
        if falhas:
            linhas.append(f"⚠️ {falhas} baú(s) não confirmaram entrega central e voltaram pro estoque.")
        if total_no_estoque > economia.ABRIR_TODOS_LIMITE:
            linhas.append(f"Você tinha mais baús do que o limite de {economia.ABRIR_TODOS_LIMITE} por vez — rode `/abrir_todos` de novo pro resto.")
        emb = ui.embed("🎁 Baús abertos!", categoria="bau", descricao="\n".join(linhas))
        await interaction.followup.send(embed=emb)



async def setup(bot):
    await bot.add_cog(Economia(bot))
