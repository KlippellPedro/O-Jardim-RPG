"""Cog Economia: comandos do jogador. Integra o Cartão Lunar (cashback,
desconto por reputação bancária e limite do cartão). Lógica vem de core.economia e core.db."""

from __future__ import annotations

import asyncio
import logging
import random
import time
from datetime import datetime, timedelta, timezone
from typing import Awaitable, Callable, Optional, List

import discord
from discord import app_commands
from discord.ext import commands, tasks

from core import cargos as cargos_mod
from core import economia
from core import entrega as entrega_mod
from core import loot as loot_mod
from core import ui
from core.db import AlvoProtegido, SaldoInsuficiente, UpgradeDesatualizado
from core.tasks_util import registrar_reinicio_em_erro
from cogs.servicos import enviar_alerta_banco

log = logging.getLogger("banqueiro")

COR_RARIDADE = ui.COR_RARIDADE
SIMBOLO = ui.SIMBOLO_MOEDA
MOEDAS_CHOICES = ui.MOEDAS_CHOICES
# /cambio só sabe converter Lunaris <-> Solares (core/economia.py:converter);
# oferecer as 4 moedas fazia o usuário levar uma exceção crua ao escolher
# Fragmentos/Créditos.
CAMBIO_CHOICES = [
    app_commands.Choice(name="Lunaris ☾", value="Lunaris"),
    app_commands.Choice(name="Solares ☉", value="Solares"),
]
ROUBO_ABORDAGEM_CHOICES = [
    app_commands.Choice(name=info["nome"], value=abordagem_id)
    for abordagem_id, info in economia.ROUBO_ABORDAGENS.items()
]
PREPARO_ROUBO_CHOICES = [
    app_commands.Choice(name=info["nome"], value=preparo_id)
    for preparo_id, info in economia.PREPAROS_ROUBO.items()
]


def _sid(interaction): return str(interaction.guild_id)


def fmt_carteira(carteira: dict, vazio: str = "carteira vazia") -> str:
    if not carteira:
        return vazio
    partes = []
    for moeda, saldo in carteira.items():
        partes.append(f"{SIMBOLO.get(economia.normalizar(moeda), '◈')} **{saldo}** {moeda}")
    return " · ".join(partes)


def fmt_quantidade(valor: int) -> str:
    """Inteiro com separador de milhar no padrão usado nas mensagens PT-BR."""
    return f"{int(valor):,}".replace(",", ".")


PATAMARES_VISUAIS = (
    ("🟫", "Bronze I"),
    ("🟫", "Bronze II"),
    ("🟫", "Bronze III"),
    ("⚪", "Prata I"),
    ("⚪", "Prata II"),
    ("⚪", "Prata III"),
    ("🟨", "Ouro I"),
    ("🟨", "Ouro II"),
    ("🟨", "Ouro III"),
    ("🔷", "Safira I"),
    ("🔷", "Safira II"),
    ("🔴", "Rubi I"),
    ("🔴", "Rubi II"),
    ("💎", "Diamante"),
    ("🌌", "Absoluto"),
)


def visual_tier(tiers: List[dict], tier_id: str) -> dict:
    """Metadados visuais estáveis para qualquer uma das duas trilhas."""
    alvo = economia.normalizar(tier_id)
    indice = next(
        (i for i, tier in enumerate(tiers) if tier["id"] == alvo),
        0,
    )
    icone, patamar = PATAMARES_VISUAIS[min(indice, len(PATAMARES_VISUAIS) - 1)]
    return {
        "icone": icone,
        "patamar": patamar,
        "nivel": indice + 1,
        "total": len(tiers),
    }


def fmt_capacidade_tier(tier: dict) -> str:
    if tier.get("limite_pratico"):
        return "∞ itens · ∞ moedas"
    return (
        f"{fmt_quantidade(tier['capacidade'])} itens · "
        f"{fmt_quantidade(tier['capacidade_moeda'])} por moeda"
    )


def fmt_itens_cofre(itens, limite: int = 12) -> str:
    """Lista compacta que respeita o limite de 1.024 caracteres do embed."""
    if not itens:
        return "Nenhum item guardado."
    exibidos = list(itens[:limite])
    linhas = [f"• **{item.titulo}** ×{item.quantidade}" for item in exibidos]
    restantes = len(itens) - len(exibidos)
    if restantes > 0:
        linhas.append(f"… e mais {restantes} tipo(s) de item. Use `/inventario` para ver todos.")
    return "\n".join(linhas)[:1024]


def fmt_preco(preco) -> str:
    if preco is None:
        return "Não informado"
    if isinstance(preco, dict):
        return " / ".join(
            f"{SIMBOLO.get(economia.normalizar(k), '◈')} {fmt_quantidade(v)} {k}"
            for k, v in preco.items()
        )
    return f"☉ {fmt_quantidade(preco)} Solares"


def fmt_custos(custos: dict, compacto: bool = False, markdown: bool = True) -> str:
    """Exibe um pacote multimoeda sem esconder nenhum material exigido."""
    if not custos:
        return "Sem custo"
    separador = " · " if compacto else "\n"
    def quantidade(valor: int) -> str:
        texto = fmt_quantidade(valor)
        return f"**{texto}**" if markdown else texto
    return separador.join(
        f"{SIMBOLO.get(economia.normalizar(moeda), '◈')} {quantidade(valor)} {moeda}"
        for moeda, valor in custos.items()
    )


def fmt_requisito_reputacao(valor: int) -> str:
    return "Livre" if int(valor) <= 0 else f"🏦 {int(valor)} de reputação"


def embed_confirmacao_financiamento(descricao: str, cotacao: dict) -> discord.Embed:
    vencimento = datetime.now(timezone.utc) + timedelta(days=economia.FATURA_PRAZO_DIAS)
    vence_ts = int(vencimento.timestamp())
    emb = ui.embed(
        "💳 Confirmar uso do limite?",
        categoria="economia",
        descricao=(
            f"**{descricao}**\n\n"
            f"Preço: ☾ **{cotacao['preco']}**\n"
            f"Saldo da carteira: ☾ **{cotacao['saldo_carteira']}**\n"
            f"Sai da carteira: ☾ **{cotacao['da_carteira']}**\n"
            f"Valor financiado: ☾ **{cotacao['financiado']}**\n"
            f"Limite restante após a compra: ☾ **{cotacao['limite_apos']}**\n"
            f"Vencimento da fatura: <t:{vence_ts}:F> (<t:{vence_ts}:R>)"
        ),
    )
    emb.set_footer(text=f"{ui.MARCA} · Só haverá cobrança se você confirmar")
    return emb


def _tag_item(it) -> str:
    """Resumo curto de catálogo usado nas consultas e fluxos legados."""
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
    if it.tipo == "veiculo-completo":
        return "Veículo completo"
    if it.tipo == "monstro":
        classe, nivel = c.get("classe"), c.get("nivel")
        return f"{classe} · Nv {nivel}" if classe and nivel is not None else "Ser"
    if it.tipo == "drop":
        parte, especie = c.get("parte"), c.get("especie")
        return f"{parte} · {especie}" if parte and especie else "Drop"
    if it.tipo == "equipamento":
        return "Equipamento"
    if it.tipo == "consumivel":
        return "Consumível"
    if it.tipo == "fruto-eden":
        return "Fruto do Éden"
    if it.tipo == "implante":
        return "Implante cibernético"
    if it.tipo == "artefato":
        return "Artefato mágico"
    return it.tipo.capitalize()


def _embed_item(it) -> discord.Embed:
    """Ficha de detalhe de um item/monstro do catálogo."""
    cor = COR_RARIDADE.get(it.raridade)
    emb = ui.embed(f"{ui.icone_raridade(it.raridade)} {it.titulo}", categoria="loja", cor=cor)
    if it.descricao:
        emb.description = it.descricao[:4096]
    emb.add_field(name="Tipo", value=_tag_item(it), inline=True)
    emb.add_field(name="Raridade", value=it.raridade_rotulo, inline=True)
    requisito = economia.reputacao_minima_raridade(it.raridade)
    emb.add_field(name="Acesso bancário", value=fmt_requisito_reputacao(requisito), inline=True)
    if it.preco is not None:
        emb.add_field(name="Preço", value=fmt_preco(it.preco), inline=True)
    if it.atributos:
        emb.add_field(
            name="Atributos",
            value="\n".join(f"• {a}" for a in it.atributos)[:1024],
            inline=False,
        )
    if it.imagem:
        emb.set_thumbnail(url=it.imagem)
    emb.set_footer(text=f"{ui.MARCA} · id: {it.id} · compras e revendas são feitas na Loja do site")
    return emb


class DefesaRouboView(discord.ui.View):
    """Janela curta em que somente a vítima pode impedir a tentativa."""

    def __init__(self, alvo_id: int, timeout: float = 5.0):
        super().__init__(timeout=timeout)
        self.alvo_id = alvo_id
        self.impedido = False
        self.encerrado = False
        self._duracao = timeout
        self._prazo: Optional[float] = None
        self._resolvido = asyncio.Event()
        self.impedir.label = f"Impedir o roubo ({int(timeout)}s)"

    def iniciar_prazo(self) -> None:
        self._prazo = time.monotonic() + self._duracao

    async def aguardar(self) -> None:
        if self._prazo is None:
            raise RuntimeError("o prazo da defesa ainda nao foi iniciado")
        restante = max(0.0, self._prazo - time.monotonic())
        try:
            await asyncio.wait_for(self._resolvido.wait(), timeout=restante)
        except asyncio.TimeoutError:
            pass
        finally:
            # O timeout interno do discord.py é renovado a cada interação,
            # inclusive clique alheio. Este relógio próprio encerra em 5s.
            self.stop()

    async def interaction_check(self, interaction: discord.Interaction) -> bool:
        if interaction.user.id != self.alvo_id:
            await interaction.response.send_message(
                "Só a pessoa que está sendo roubada pode usar este botão.",
                ephemeral=True,
            )
            return False
        return True

    def desabilitar(self) -> None:
        self.encerrado = True
        for child in self.children:
            child.disabled = True

    @discord.ui.button(
        label="Impedir o roubo (5s)",
        emoji="🛡️",
        style=discord.ButtonStyle.danger,
    )
    async def impedir(
        self, interaction: discord.Interaction, button: discord.ui.Button
    ):
        # Não há await entre a checagem e a mudança de estado: no event loop,
        # apenas um clique consegue vencer a disputa com o fim do prazo.
        if (
            self.encerrado
            or self._prazo is None
            or time.monotonic() > self._prazo
        ):
            await interaction.response.send_message(
                f"Tarde demais: os {int(self._duracao)} segundos já acabaram.", ephemeral=True
            )
            self.desabilitar()
            self._resolvido.set()
            self.stop()
            return
        self.impedido = True
        self.desabilitar()
        self._resolvido.set()
        await interaction.response.defer()
        self.stop()


class ConfirmarFinanciamentoView(discord.ui.View):
    """Confirmação privada antes de qualquer uso do limite do cartão."""

    def __init__(
        self,
        *,
        autor_id: int,
        executar: Callable[[discord.Interaction], Awaitable[None]],
        timeout: float = 60,
    ):
        super().__init__(timeout=timeout)
        self.autor_id = autor_id
        self.executar = executar
        self.finalizado = False

    async def interaction_check(self, interaction: discord.Interaction) -> bool:
        if interaction.user.id != self.autor_id:
            await interaction.response.send_message(
                "Só quem iniciou a compra pode confirmar o financiamento.",
                ephemeral=True,
            )
            return False
        return True

    def _desabilitar(self) -> None:
        for child in self.children:
            child.disabled = True

    @discord.ui.button(label="Confirmar financiamento", emoji="💳", style=discord.ButtonStyle.success)
    async def confirmar(self, interaction: discord.Interaction, _button: discord.ui.Button):
        if self.finalizado:
            await interaction.response.send_message("Esta compra já foi processada.", ephemeral=True)
            return
        self.finalizado = True
        self._desabilitar()
        await interaction.response.defer(ephemeral=True)
        await interaction.edit_original_response(view=self)
        try:
            await self.executar(interaction)
        except Exception:
            log.exception("erro ao concluir compra financiada")
            await interaction.followup.send(
                "⚠️ Não foi possível concluir a compra. Nenhum novo clique será processado; tente novamente.",
                ephemeral=True,
            )
        finally:
            self.stop()

    @discord.ui.button(label="Cancelar", emoji="✖️", style=discord.ButtonStyle.secondary)
    async def cancelar(self, interaction: discord.Interaction, _button: discord.ui.Button):
        if self.finalizado:
            await interaction.response.send_message("Esta compra já foi processada.", ephemeral=True)
            return
        self.finalizado = True
        self._desabilitar()
        await interaction.response.edit_message(content="Compra cancelada. Nada foi cobrado.", embed=None, view=self)
        self.stop()


class Economia(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        registrar_reinicio_em_erro(self.ciclo_juros_cofre, "ciclo_juros_cofre", log)
        self.ciclo_juros_cofre.start()

    def cog_unload(self):
        self.ciclo_juros_cofre.cancel()

    # ── Juros automático do cofre (roda sozinho, recompensa quem guarda) ──────
    @tasks.loop(hours=economia.JUROS_COFRE_TICK_HORAS)
    async def ciclo_juros_cofre(self):
        for guild in self.bot.guilds:
            gid = str(guild.id)
            # tasks.loop dispara a primeira iteracao assim que o bot sobe: sem
            # isto, todo restart (cada deploy na Discloud) pagava juros de
            # novo mesmo horas depois do ultimo tick.
            if not self.bot.db.ciclo_guild_devido(gid, "juros_cofre", economia.JUROS_COFRE_TICK_HORAS):
                continue
            try:
                taxa = self.bot.db.get_economia_config(gid)["juros_cofre_taxa"]
                afetados = self.bot.db.aplicar_juros_cofre(gid, taxa)
                if afetados:
                    self.bot.db.criar_aviso(
                        gid,
                        f"💰 O cofre rendeu juros! Quem guardou Lunaris viu o saldo crescer "
                        f"~{int(taxa * 100)}%. Guarde mais com `/cofre_depositar`.",
                    )
                self.bot.db.marcar_ciclo_guild(gid, "juros_cofre")
            except Exception:
                log.exception("erro no ciclo de juros do cofre (guild %s)", gid)

    @ciclo_juros_cofre.before_loop
    async def _antes_juros_cofre(self):
        await self.bot.wait_until_ready()

    async def _ac_itens(self, interaction, current: str) -> List[app_commands.Choice[str]]:
        cat = getattr(self.bot, "catalogo", None)
        if cat is None:
            return []
        itens = cat.buscar(current, limite=25) if current else cat.listar()[:25]
        return [app_commands.Choice(name=i.titulo[:100], value=i.id) for i in itens]

    @staticmethod
    def _pode_ver_financas(interaction: discord.Interaction, alvo: discord.Member) -> bool:
        """O próprio jogador e mestres podem consultar dados financeiros."""
        if alvo.id == interaction.user.id:
            return True
        permissoes = getattr(interaction.user, "guild_permissions", None)
        return bool(getattr(permissoes, "manage_guild", False))

    @app_commands.command(description="Mostra carteira, cofre, cartão e reputação bancária.")
    @app_commands.describe(membro="Ver de outra pessoa (opcional).")
    async def carteira(self, interaction, membro: Optional[discord.Member] = None):
        alvo = membro or interaction.user
        if not self._pode_ver_financas(interaction, alvo):
            await interaction.response.send_message(
                "🔒 A carteira de outro jogador é privada. Somente o próprio jogador e mestres podem consultá-la.",
                ephemeral=True,
            )
            return
        db = self.bot.db
        sid, uid = _sid(interaction), str(alvo.id)
        db.garantir_jogador(sid, uid)
        tier = db.get_cofre_tier(sid, uid)
        cofre = economia.cofre_por_id(tier)
        cap = economia.capacidade_do_cofre(tier)
        cartao = db.get_cartao(sid, uid)
        cartao_tier = economia.cartao_por_id(cartao["tier"]) or economia.cartao_por_id(economia.CARTAO_TIER_INICIAL)
        divida = db.get_divida(sid, uid)
        faturas_pendentes = db.get_total_faturas_pendentes(sid, uid)
        limite_total = economia.limite_efetivo(cartao["tier"], cartao["credito"])
        limite_restante = economia.limite_disponivel(
            cartao["tier"], cartao["credito"], divida, faturas_pendentes
        )
        reputacao = economia.beneficios_reputacao(cartao["credito"])
        emb = ui.embed(f"💰 Carteira de {alvo.display_name}", categoria="economia",
                        descricao=fmt_carteira(db.get_carteira(sid, uid)))
        emb.add_field(name="🔒 Guardado no cofre", value=fmt_carteira(db.get_cofre_saldo(sid, uid), vazio="nada guardado"), inline=False)
        emb.add_field(name=f"{cofre['nome']}: itens", value=ui.barra(await self.bot.inventario.contar(sid, uid), cap), inline=False)
        emb.add_field(
            name="💳 Cartão Lunar",
            value=(
                f"**{cartao_tier['nome']}** · limite disponível ☾ **{limite_restante} / {limite_total}**\n"
                f"🏦 Reputação bancária: **{cartao['credito']}** · {reputacao['rotulo']}"
            ),
            inline=False,
        )
        if divida > 0:
            emb.add_field(
                name="📋 Dívida do Cartão Lunar",
                value=f"☾ {divida} Lunaris · pague quando quiser com `/divida_pagar`",
                inline=False,
            )
        if faturas_pendentes > 0:
            emb.add_field(
                name="🧾 Faturas pendentes",
                value=f"☾ {faturas_pendentes} Lunaris · consulte com `/fatura`",
                inline=False,
            )
        protegido = db.get_mestre_protegido(sid) == uid
        if protegido:
            emb.add_field(
                name="🛡️ Proteção do mestre",
                value="Esta conta não pode ter a carteira nem o cofre roubados.",
                inline=False,
            )
        emb.set_footer(
            text=(
                f"{ui.MARCA} · Conta protegida contra roubos"
                if protegido
                else f"{ui.MARCA} · A defesa contra roubo chega por mensagem privada"
            )
        )
        await interaction.response.send_message(embed=emb, ephemeral=True)

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
            db.transferir_carteira(
                sid,
                uid,
                str(membro.id),
                moeda_nome,
                quantia,
                f"Pagamento pra {membro.display_name}",
                f"Pagamento de {interaction.user.display_name}",
            )
        except SaldoInsuficiente as e:
            await interaction.response.send_message(f"💸 {e}", ephemeral=True)
            return
        simb = SIMBOLO.get(economia.normalizar(moeda_nome), "")
        emb = ui.embed("💸 Pagamento feito!", categoria="economia",
            descricao=f"{interaction.user.mention} pagou {simb} **{quantia} {moeda_nome}** pra {membro.mention}.")
        await interaction.response.send_message(embed=emb)
        await enviar_alerta_banco(
            self.bot,
            sid,
            membro,
            "pagamentos",
            f"💸 Em **{interaction.guild.name}**, você recebeu {simb} **{quantia} {moeda_nome}** de {interaction.user.display_name}.",
        )

    RANKING_CATEGORIAS = [
        app_commands.Choice(name="Carteira", value="carteira"),
        app_commands.Choice(name="Patrimônio (carteira + cofre)", value="patrimonio"),
        app_commands.Choice(name="Poupança (cofre bancário)", value="poupanca"),
        app_commands.Choice(name="Roubos bem-sucedidos", value="roubos"),
        app_commands.Choice(name="Recompensas coletadas", value="recompensas"),
        app_commands.Choice(name="Vendas em leilão", value="leilao"),
    ]

    @app_commands.command(description="Mostra quem está no topo do servidor numa categoria.")
    @app_commands.describe(
        categoria="O que ranquear (padrão Carteira).",
        moeda="Moeda do ranking (padrão Lunaris; só vale pra Carteira e Poupança).",
    )
    @app_commands.choices(categoria=RANKING_CATEGORIAS, moeda=MOEDAS_CHOICES)
    async def ranking(
        self, interaction,
        categoria: Optional[app_commands.Choice[str]] = None,
        moeda: Optional[app_commands.Choice[str]] = None,
    ):
        cat = categoria.value if categoria else "carteira"
        moeda_nome = moeda.value if moeda else "Lunaris"
        sid = _sid(interaction)
        db = self.bot.db
        simb = SIMBOLO.get(economia.normalizar(moeda_nome), "")

        if cat == "carteira":
            top = db.top_carteiras(sid, moeda_nome, limite=10)
            titulo = f"🏆 Ranking de Carteira ({moeda_nome})"
            vazio = "Ninguém tem saldo nessa moeda ainda."
            linhas = [f"{i + 1}. <@{r['user_id']}>: {simb} {r['saldo']}" for i, r in enumerate(top)]
        elif cat == "poupanca":
            top = db.top_poupanca(sid, moeda_nome, limite=10)
            titulo = f"🏆 Ranking de Poupança ({moeda_nome})"
            vazio = "Ninguém tem nada guardado no cofre nessa moeda ainda."
            linhas = [f"{i + 1}. <@{r['user_id']}>: {simb} {r['saldo']}" for i, r in enumerate(top)]
        elif cat == "patrimonio":
            top = db.top_patrimonio(sid, limite=10)
            titulo = "🏆 Ranking de Patrimônio (carteira + cofre, Lunaris)"
            vazio = "Ninguém tem patrimônio em Lunaris ainda."
            linhas = [f"{i + 1}. <@{r['user_id']}>: ☾ {r['total']}" for i, r in enumerate(top)]
        elif cat == "roubos":
            top = db.top_roubos(sid, limite=10)
            titulo = "🏆 Ranking de Roubos bem-sucedidos"
            vazio = "Ninguém roubou ninguém ainda."
            linhas = [f"{i + 1}. <@{r['user_id']}>: {r['quantidade']} roubo(s)" for i, r in enumerate(top)]
        elif cat == "recompensas":
            top = db.top_recompensas(sid, limite=10)
            titulo = "🏆 Ranking de Recompensas coletadas"
            vazio = "Ninguém coletou recompensa nenhuma ainda."
            linhas = [f"{i + 1}. <@{r['user_id']}>: ☾ {r['total']}" for i, r in enumerate(top)]
        else:  # leilao
            top = db.top_leiloes_vendidos(sid, limite=10)
            titulo = "🏆 Ranking de Vendas em Leilão"
            vazio = "Nenhum leilão foi vendido ainda."
            linhas = [f"{i + 1}. <@{r['user_id']}>: {r['quantidade']} venda(s)" for i, r in enumerate(top)]

        if not top:
            await interaction.response.send_message(vazio, ephemeral=True)
            return
        emb = ui.embed(titulo, categoria="economia", descricao="\n".join(linhas))
        await interaction.response.send_message(embed=emb)

    @app_commands.command(description="Mostra o histórico de transações (compras, roubos, pagamentos...).")
    @app_commands.describe(membro="Ver o extrato de outra pessoa (opcional).")
    async def extrato(self, interaction, membro: Optional[discord.Member] = None):
        alvo = membro or interaction.user
        if not self._pode_ver_financas(interaction, alvo):
            await interaction.response.send_message(
                "🔒 O extrato de outro jogador é privado. Somente o próprio jogador e mestres podem consultá-lo.",
                ephemeral=True,
            )
            return
        sid, uid = _sid(interaction), str(alvo.id)
        registros = self.bot.db.listar_extrato(sid, uid, limite=100)
        if not registros:
            await interaction.response.send_message(f"{alvo.display_name} não tem transações registradas ainda.", ephemeral=True)
            return
        linhas = []
        for r in registros:
            simb = SIMBOLO.get(economia.normalizar(r["moeda"]), "")
            sinal = "+" if r["delta"] >= 0 else "−"
            quando = r["criado_em"].strftime("%d/%m %Hh%M")
            linhas.append(f"`{quando}` {sinal}{simb}{abs(r['delta'])}: {r['descricao']}")

        POR_PAGINA = 15
        blocos = [linhas[i:i + POR_PAGINA] for i in range(0, len(linhas), POR_PAGINA)]
        paginas = []
        for i, bloco in enumerate(blocos):
            emb = ui.embed(f"📜 Extrato de {alvo.display_name}", categoria="economia", descricao="\n".join(bloco))
            emb.set_footer(text=f"{ui.MARCA} · Página {i + 1}/{len(blocos)} · {len(registros)} transações, mais recente primeiro")
            paginas.append(emb)

        if len(paginas) == 1:
            await interaction.response.send_message(embed=paginas[0], ephemeral=True)
            return
        view = ui.Paginador(paginas, autor_id=interaction.user.id)
        await interaction.response.send_message(embed=view.pagina_atual, view=view, ephemeral=True)

    @app_commands.command(description="Mostra o perfil econômico de alguém: patrimônio, itens e histórico.")
    @app_commands.describe(membro="Ver o perfil de outra pessoa (opcional).")
    async def perfil(self, interaction, membro: Optional[discord.Member] = None):
        alvo = membro or interaction.user
        if not self._pode_ver_financas(interaction, alvo):
            await interaction.response.send_message(
                "🔒 O perfil econômico detalhado de outro jogador é privado. Somente o próprio jogador e mestres podem consultá-lo.",
                ephemeral=True,
            )
            return
        sid, uid = _sid(interaction), str(alvo.id)
        db = self.bot.db
        db.garantir_jogador(sid, uid)

        carteira = db.get_carteira(sid, uid)
        cofre_saldo = db.get_cofre_saldo(sid, uid)
        qtd_itens = await self.bot.inventario.contar(sid, uid)
        resumo = db.resumo_extrato(sid, uid)
        leiloes_vencidos = db.contar_leiloes_vencidos(sid, uid)

        ganhos_lunaris = resumo["por_moeda"].get("Lunaris", {}).get("ganhos", 0)
        perdas_lunaris = resumo["por_moeda"].get("Lunaris", {}).get("perdas", 0)

        emb = ui.embed(f"🪪 Perfil de {alvo.display_name}", categoria="economia")
        emb.add_field(name="Carteira", value=fmt_carteira(carteira), inline=False)
        emb.add_field(name="Cofre bancário", value=fmt_carteira(cofre_saldo, vazio="nada guardado"), inline=False)
        emb.add_field(name="Itens no cofre", value=str(qtd_itens), inline=True)
        emb.add_field(name="Leilões vencidos", value=str(leiloes_vencidos), inline=True)
        emb.add_field(name="Recompensas coletadas", value=f"☾ {resumo['recompensas_coletadas']}", inline=True)
        emb.add_field(name="Ganhos em Lunaris na vida", value=f"☾ {ganhos_lunaris}", inline=True)
        emb.add_field(name="Perdas em Lunaris na vida", value=f"☾ {perdas_lunaris}", inline=True)
        emb.add_field(name="Roubou de outros", value=f"☾ {resumo['roubou']}", inline=True)
        emb.add_field(name="Foi roubado", value=f"☾ {resumo['foi_roubado']}", inline=True)
        emb.set_footer(text=f"{ui.MARCA} · /extrato mostra o histórico completo de transações")
        await interaction.response.send_message(embed=emb, ephemeral=True)

    async def _autocomplete_catalogo(self, interaction, current: str, tipo: Optional[str] = None):
        achados = self.bot.catalogo.buscar(current or "", limite=25)
        if tipo:
            achados = [a for a in achados if a.tipo == tipo]
        return [
            app_commands.Choice(name=f"{a.titulo} ({a.id})"[:100], value=a.id)
            for a in achados[:25]
        ]

    @app_commands.command(description="Mostra os detalhes de um item do catálogo.")
    @app_commands.describe(busca="Nome ou id do item")
    async def item(self, interaction, busca: str):
        it = self.bot.catalogo.get(busca)
        if it is None:
            achados = self.bot.catalogo.buscar(busca, limite=8)
            if not achados:
                await interaction.response.send_message(f"Não achei nada com `{busca}`.", ephemeral=True)
                return
            if len(achados) > 1:
                linhas = "\n".join(f"• `{a.id}`: {a.titulo}" for a in achados)
                await interaction.response.send_message(
                    f"Achei vários; refine pelo id:\n{linhas}", ephemeral=True
                )
                return
            it = achados[0]
        await interaction.response.send_message(embed=_embed_item(it))

    @item.autocomplete("busca")
    async def _ac_item(self, interaction, current: str):
        return await self._autocomplete_catalogo(interaction, current)

    @app_commands.command(description="Mostra a ficha de um monstro do bestiário.")
    @app_commands.describe(busca="Nome ou id do monstro")
    async def monstro(self, interaction, busca: str):
        it = self.bot.catalogo.get(busca)
        if it is not None and it.tipo != "monstro":
            it = None  # colisão de nome com item não-monstro: força busca no bestiário
        if it is None:
            achados = [a for a in self.bot.catalogo.buscar(busca, limite=12) if a.tipo == "monstro"]
            if not achados:
                await interaction.response.send_message(f"Não achei monstro com `{busca}`.", ephemeral=True)
                return
            if len(achados) > 1:
                linhas = "\n".join(f"• `{a.id}`: {a.titulo}" for a in achados)
                await interaction.response.send_message(
                    f"Vários monstros; refine pelo id:\n{linhas}", ephemeral=True
                )
                return
            it = achados[0]
        await interaction.response.send_message(embed=_embed_item(it))

    @monstro.autocomplete("busca")
    async def _ac_monstro(self, interaction, current: str):
        return await self._autocomplete_catalogo(interaction, current, tipo="monstro")

    @app_commands.command(description="Mostra seu inventário.")
    @app_commands.describe(membro="Ver de outra pessoa (opcional).")
    async def inventario(self, interaction, membro: Optional[discord.Member] = None):
        alvo = membro or interaction.user
        sid, uid = _sid(interaction), str(alvo.id)
        db = self.bot.db
        db.garantir_jogador(sid, uid)
        itens = await self.bot.inventario.listar(sid, uid)
        cap = economia.capacidade_do_cofre(db.get_cofre_tier(sid, uid))
        corpo = "inventário vazio" if not itens else "\n".join(f"• **{i.titulo}** ×{i.quantidade}  (`{i.item_id}`)" for i in itens)
        emb = ui.embed(f"🎒 Inventário de {alvo.display_name}", categoria="inventario", descricao=corpo)
        emb.set_footer(text=f"{ui.MARCA} · Cofre: {ui.barra(await self.bot.inventario.contar(sid, uid), cap)}")
        await interaction.response.send_message(embed=emb)

    @app_commands.command(description="Troca moedas (Lunaris ⇄ Solares) no banco.")
    @app_commands.describe(de="Moeda que dá.", para="Moeda que quer.", quantia="Quanto trocar.")
    @app_commands.choices(de=CAMBIO_CHOICES, para=CAMBIO_CHOICES)
    async def cambio(self, interaction, de: app_commands.Choice[str], para: app_commands.Choice[str], quantia: app_commands.Range[int, 1]):
        sid, uid = _sid(interaction), str(interaction.user.id)
        rate, taxa = self.bot.db.get_cambio(sid)
        benef = economia.beneficios_reputacao(self.bot.db.get_cartao(sid, uid)["credito"])
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
        direcao_fluxo = (
            "compra_solares"
            if economia.mesma_moeda(de.value, "Lunaris")
            else "venda_solares"
        )
        fluxo_lunaris = quantia if direcao_fluxo == "compra_solares" else recebido
        try:
            self.bot.db.executar_cambio(
                sid,
                uid,
                de.value,
                quantia,
                para.value,
                recebido,
                direcao_fluxo,
                fluxo_lunaris,
            )
        except SaldoInsuficiente as e:
            await interaction.response.send_message(f"💸 {e}", ephemeral=True)
            return
        s_de = SIMBOLO.get(economia.normalizar(de.value), "")
        s_para = SIMBOLO.get(economia.normalizar(para.value), "")
        emb = ui.embed("💱 Câmbio no Banco Lunar", categoria="economia",
            descricao=f"Trocou {s_de} **{quantia} {de.value}** por {s_para} **{recebido} {para.value}**.\nTaxa: {taxa_cobrada} {para.value} ({round(taxa_aj*100,1)}%).")
        await interaction.response.send_message(embed=emb)

    @app_commands.command(description="Mostra a taxa de câmbio atual e se o ajuste automático está ligado.")
    async def cambio_ver(self, interaction):
        sid = _sid(interaction)
        rate, taxa = self.bot.db.get_cambio(sid)
        auto = self.bot.db.get_cambio_auto(sid)
        status_auto = (
            "🟢 Ligado: a taxa se ajusta sozinha 1x/dia conforme a demanda."
            if auto
            else "🔴 Desligado: a taxa só muda com `/setcambio`."
        )
        emb = ui.embed(
            "💱 Câmbio do Banco Lunar", categoria="economia",
            descricao=(
                f"☉ 1 Solares = ☾ **{rate} Lunaris**\n"
                f"Taxa cobrada na conversão: **{round(taxa * 100, 1)}%**\n\n"
                f"**Ajuste automático:** {status_auto}"
            ),
        )
        await interaction.response.send_message(embed=emb, ephemeral=True)

    @app_commands.command(description="Mostra seu cofre/armazém.")
    async def cofre(self, interaction):
        sid, uid = _sid(interaction), str(interaction.user.id)
        db = self.bot.db
        tier = db.get_cofre_tier(sid, uid)
        seg_tier = db.get_seguranca_tier(sid, uid)
        cofre = economia.cofre_por_id(tier) or economia.cofre_por_id(economia.COFRE_TIER_INICIAL)
        seguranca = economia.seguranca_por_id(seg_tier) or economia.seguranca_por_id(economia.SEGURANCA_TIER_INICIAL)
        visual_cofre = visual_tier(economia.COFRE_TIERS, tier)
        visual_seguranca = visual_tier(economia.SEGURANCA_TIERS, seg_tier)
        itens = await self.bot.inventario.listar(sid, uid)
        total_itens = sum(item.quantidade for item in itens)
        capacidade_itens = economia.capacidade_do_cofre(tier)
        emb = ui.embed(
            f"🔒 Cofre de {interaction.user.display_name}",
            categoria="cofre",
            descricao=(
                f"{visual_cofre['icone']} **{visual_cofre['patamar']} · {cofre['nome']}** "
                f"`Nv. {visual_cofre['nivel']}/{visual_cofre['total']}`\n"
                f"{visual_seguranca['icone']} **{visual_seguranca['patamar']} · {seguranca['nome']}** "
                f"`Nv. {visual_seguranca['nivel']}/{visual_seguranca['total']}`"
            ),
        )
        limite_pratico = bool(cofre.get("limite_pratico"))
        capacidade_itens_txt = "∞" if limite_pratico else fmt_quantidade(capacidade_itens)
        emb.add_field(
            name=f"📦 Conteúdo · {total_itens}/{capacidade_itens_txt}",
            value=fmt_itens_cofre(itens, limite=6),
            inline=False,
        )
        saldo_cofre = db.get_cofre_saldo(sid, uid)
        cap_moeda = economia.capacidade_moeda_do_cofre(tier)
        capacidade_moeda_txt = "∞" if limite_pratico else fmt_quantidade(cap_moeda)
        moedas_exibidas = list(saldo_cofre.keys())
        if "Lunaris" not in moedas_exibidas:
            moedas_exibidas.insert(0, "Lunaris")
        saldos = "\n".join(
            f"{SIMBOLO.get(economia.normalizar(m), '◈')} **{m}:** "
            f"{fmt_quantidade(saldo_cofre.get(m, 0))} / {capacidade_moeda_txt}"
            for m in moedas_exibidas
        )
        emb.add_field(
            name="🪙 Saldo protegido",
            value=saldos,
            inline=False,
        )
        chance = round(economia.chance_roubo_cofre(seg_tier, db.get_config_roubo(sid)["chance_base"]) * 100)
        emb.add_field(
            name="🛡️ Risco de arrombamento",
            value=f"Defesa **{round(seguranca['defesa'] * 100)}%** · chance estimada de sucesso do ladrão **~{chance}%**",
            inline=False,
        )
        if db.get_mestre_protegido(sid) == uid:
            emb.add_field(
                name="🛡️ Proteção do mestre",
                value="Este cofre é imune a tentativas de roubo.",
                inline=False,
            )
        emb.set_footer(text=f"{ui.MARCA} · Evolua com /cofre_melhorias · guarde com /cofre_depositar")
        await interaction.response.send_message(embed=emb)

    @app_commands.command(name="cofre_melhorias", description="Mostra os próximos upgrades disponíveis para seu cofre.")
    async def cofre_melhorias(self, interaction):
        sid, uid = _sid(interaction), str(interaction.user.id)
        db = self.bot.db
        db.garantir_jogador(sid, uid)

        tier = db.get_cofre_tier(sid, uid)
        seg_tier = db.get_seguranca_tier(sid, uid)
        atual = economia.cofre_por_id(tier) or economia.cofre_por_id(economia.COFRE_TIER_INICIAL)
        seguranca_atual = economia.seguranca_por_id(seg_tier) or economia.seguranca_por_id(economia.SEGURANCA_TIER_INICIAL)
        prox = economia.proximo_cofre(tier)
        prox_seg = economia.proximo_seguranca(seg_tier)
        visual_atual = visual_tier(economia.COFRE_TIERS, tier)
        visual_seg_atual = visual_tier(economia.SEGURANCA_TIERS, seg_tier)
        cartao = db.get_cartao(sid, uid)
        reputacao_atual = cartao["credito"]
        desconto = economia.beneficios_reputacao(reputacao_atual)["desconto"]

        emb = ui.embed(
            "✨ Melhorias do Cofre",
            categoria="cofre",
            descricao=(
                "Duas trilhas independentes. Aqui aparecem somente as melhorias "
                "que você pode comprar agora."
            ),
        )

        if prox:
            visual_prox = visual_tier(economia.COFRE_TIERS, prox["id"])
            custos = economia.custos_upgrade(prox, reputacao_atual)
            requisito = economia.reputacao_minima_upgrade("cofre", prox["id"])
            acesso = "✅ liberado" if requisito <= 0 or reputacao_atual >= requisito else "🔒 bloqueado"
            emb.add_field(
                name=f"{visual_prox['icone']} Armazenamento · {visual_prox['patamar']}",
                value=(
                    f"{visual_atual['icone']} **{atual['nome']}** → {visual_prox['icone']} **{prox['nome']}**\n"
                    f"{fmt_capacidade_tier(atual)} → **{fmt_capacidade_tier(prox)}**\n"
                    f"Reputação exigida: **{requisito}** · {acesso}\n"
                    f"Custo para você:\n{fmt_custos(custos)}\n"
                    "Use `/cofre_melhorar` para comprar."
                ),
                inline=False,
            )
        else:
            emb.add_field(
                name=f"{visual_atual['icone']} Armazenamento · nível máximo",
                value=f"**{atual['nome']}** · {fmt_capacidade_tier(atual)}",
                inline=False,
            )

        if prox_seg:
            visual_prox_seg = visual_tier(economia.SEGURANCA_TIERS, prox_seg["id"])
            custos_seg = economia.custos_upgrade(prox_seg, reputacao_atual)
            requisito_seg = economia.reputacao_minima_upgrade("seguranca", prox_seg["id"])
            acesso_seg = "✅ liberado" if requisito_seg <= 0 or reputacao_atual >= requisito_seg else "🔒 bloqueado"
            emb.add_field(
                name=f"{visual_prox_seg['icone']} Segurança · {visual_prox_seg['patamar']}",
                value=(
                    f"{visual_seg_atual['icone']} **{seguranca_atual['nome']}** → "
                    f"{visual_prox_seg['icone']} **{prox_seg['nome']}**\n"
                    f"Defesa {round(seguranca_atual['defesa'] * 100)}% → "
                    f"**{round(prox_seg['defesa'] * 100)}%**\n"
                    f"Reputação exigida: **{requisito_seg}** · {acesso_seg}\n"
                    f"Custo para você:\n{fmt_custos(custos_seg)}\n"
                    "Use `/cofre_seguranca_melhorar` para comprar."
                ),
                inline=False,
            )
        else:
            emb.add_field(
                name=f"{visual_seg_atual['icone']} Segurança · nível máximo",
                value=f"**{seguranca_atual['nome']}** · {round(seguranca_atual['defesa'] * 100)}% de defesa",
                inline=False,
            )

        if desconto:
            emb.add_field(
                name="💳 Benefício aplicado",
                value=(
                    f"Sua reputação bancária reduziu Lunaris e Solares em "
                    f"**{round(desconto * 100)}%**. Materiais raros mantêm o custo integral."
                ),
                inline=False,
            )
        emb.set_footer(text=f"{ui.MARCA} · Os valores exibidos já são os custos finais para sua reputação")
        await interaction.response.send_message(embed=emb, ephemeral=True)

    @app_commands.command(name="cofre_melhorar", description="Faz upgrade do cofre com as moedas e materiais exigidos.")
    async def cofre_melhorar(self, interaction):
        sid, uid = _sid(interaction), str(interaction.user.id)
        db = self.bot.db
        tier_atual = db.get_cofre_tier(sid, uid)
        prox = economia.proximo_cofre(tier_atual)
        if not prox:
            await interaction.response.send_message("Seu cofre já está no máximo (Sem-Fim).", ephemeral=True)
            return
        cartao = db.get_cartao(sid, uid)
        requisito = economia.reputacao_minima_upgrade("cofre", prox["id"])
        if requisito > 0 and cartao["credito"] < requisito:
            await interaction.response.send_message(
                f"🔒 **{prox['nome']}** exige **{requisito} de reputação bancária**. "
                f"Você tem **{cartao['credito']}**. Quite faturas no prazo para evoluir.",
                ephemeral=True,
            )
            return
        custos = economia.custos_upgrade(prox, cartao["credito"])
        try:
            db.comprar_upgrade_multimoeda(
                sid, uid, "cofre", tier_atual, prox["id"], custos,
                f"Upgrade do cofre para {prox['nome']}",
            )
        except (SaldoInsuficiente, UpgradeDesatualizado) as e:
            await interaction.response.send_message(f"💸 {e}", ephemeral=True)
            return
        visual = visual_tier(economia.COFRE_TIERS, prox["id"])
        if economia.upgrade_noticiavel("cofre", prox["id"]):
            db.criar_aviso(
                sid,
                f"🏛️ {interaction.user.mention} alcançou o **{prox['nome']}** "
                f"(`Nv. {visual['nivel']}/{visual['total']}`), com {fmt_capacidade_tier(prox)}.",
            )
        emb = ui.embed(
            f"{visual['icone']} {visual['patamar']} desbloqueado!",
            categoria="cofre",
            descricao=(
                f"**{prox['nome']}** · `Nv. {visual['nivel']}/{visual['total']}`\n"
                f"📦 {fmt_capacidade_tier(prox)}\n"
                f"🪙 Investimento:\n{fmt_custos(custos)}"
            ),
        )
        emb.set_footer(text=f"{ui.MARCA} · Veja o próximo passo com /cofre_melhorias")
        await interaction.response.send_message(embed=emb)

    @app_commands.command(name="cofre_seguranca_melhorar", description="Sobe a segurança do cofre (reduz a chance de te roubarem).")
    async def cofre_seguranca_melhorar(self, interaction):
        sid, uid = _sid(interaction), str(interaction.user.id)
        db = self.bot.db
        tier_atual = db.get_seguranca_tier(sid, uid)
        prox = economia.proximo_seguranca(tier_atual)
        if not prox:
            await interaction.response.send_message("Sua segurança já está no máximo.", ephemeral=True)
            return
        cartao = db.get_cartao(sid, uid)
        requisito = economia.reputacao_minima_upgrade("seguranca", prox["id"])
        if requisito > 0 and cartao["credito"] < requisito:
            await interaction.response.send_message(
                f"🔒 **{prox['nome']}** exige **{requisito} de reputação bancária**. "
                f"Você tem **{cartao['credito']}**.",
                ephemeral=True,
            )
            return
        custos = economia.custos_upgrade(prox, cartao["credito"])
        try:
            db.comprar_upgrade_multimoeda(
                sid, uid, "seguranca", tier_atual, prox["id"], custos,
                f"Upgrade de segurança para {prox['nome']}",
            )
        except (SaldoInsuficiente, UpgradeDesatualizado) as e:
            await interaction.response.send_message(f"💸 {e}", ephemeral=True)
            return
        visual = visual_tier(economia.SEGURANCA_TIERS, prox["id"])
        if economia.upgrade_noticiavel("seguranca", prox["id"]):
            db.criar_aviso(
                sid,
                f"🛡️ {interaction.user.mention} alcançou **{prox['nome']}** no cofre "
                f"(`Nv. {visual['nivel']}/{visual['total']}`): "
                f"**{round(prox['defesa'] * 100)}%** de proteção contra arrombamento.",
            )
        emb = ui.embed(
            f"{visual['icone']} {visual['patamar']} desbloqueado!",
            categoria="cofre",
            descricao=(
                f"**{prox['nome']}** · `Nv. {visual['nivel']}/{visual['total']}`\n"
                f"🛡️ Defesa contra arrombamento: **{round(prox['defesa'] * 100)}%**\n"
                f"🪙 Investimento:\n{fmt_custos(custos)}"
            ),
        )
        emb.set_footer(text=f"{ui.MARCA} · Veja o próximo passo com /cofre_melhorias")
        await interaction.response.send_message(embed=emb)

    @app_commands.command(name="cofre_depositar", description="Guarda dinheiro no cofre, protegido pelo nível de segurança.")
    @app_commands.describe(quantia="Quanto guardar.", moeda="Moeda (padrão Lunaris).")
    @app_commands.choices(moeda=MOEDAS_CHOICES)
    async def cofre_depositar(self, interaction, quantia: app_commands.Range[int, 1], moeda: Optional[app_commands.Choice[str]] = None):
        moeda_nome = moeda.value if moeda else "Lunaris"
        sid, uid = _sid(interaction), str(interaction.user.id)
        db = self.bot.db
        db.garantir_jogador(sid, uid)
        tier = db.get_cofre_tier(sid, uid)

        saldo_atual = db.get_saldo_cofre(sid, uid, moeda_nome)
        if not economia.pode_guardar_moeda(saldo_atual, quantia, tier):
            cap = economia.capacidade_moeda_do_cofre(tier)
            await interaction.response.send_message(
                f"Seu cofre só tem espaço para guardar até {cap} {moeda_nome} (já tem {saldo_atual}). Use `/cofre_melhorar` pra aumentar.",
                ephemeral=True)
            return
        try:
            novo = db.depositar_dinheiro_cofre(
                sid,
                uid,
                moeda_nome,
                quantia,
                economia.capacidade_moeda_do_cofre(tier),
            )
        except SaldoInsuficiente as e:
            await interaction.response.send_message(f"💸 {e}", ephemeral=True)
            return
        except ValueError:
            await interaction.response.send_message(
                "A capacidade do cofre mudou antes do depósito. Consulte `/cofre_melhorias`.",
                ephemeral=True,
            )
            return
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
        saque_taxa = self.bot.db.get_economia_config(sid)["cofre_saque_taxa"]
        try:
            resultado = db.sacar_dinheiro_cofre(
                sid, uid, moeda_nome, quantia, saque_taxa
            )
        except SaldoInsuficiente as e:
            await interaction.response.send_message(f"💸 {e}", ephemeral=True)
            return
        taxa = resultado["taxa"]
        recebido = resultado["recebido"]
        simb = SIMBOLO.get(economia.normalizar(moeda_nome), "")
        linhas = [f"Você sacou {simb} **{recebido} {moeda_nome}** pra carteira (taxa de {int(saque_taxa*100)}%: {simb} {taxa})."]
        linhas.append("⚠️ Dinheiro na carteira pode ser roubado.")
        emb = ui.embed("🔓 Saque do cofre!", categoria="cofre", descricao="\n".join(linhas))
        await interaction.response.send_message(embed=emb)

    async def _avisar_vitima(
        self,
        membro: discord.Member,
        guild_id: str,
        guild_nome: str,
        texto: str,
    ) -> None:
        await enviar_alerta_banco(
            self.bot,
            guild_id,
            membro,
            "seguranca",
            f"🥷 Em **{guild_nome}**: {texto}",
        )

    @staticmethod
    def _fmt_espera(proxima, agora) -> str:
        restante = proxima - agora
        horas, resto = divmod(int(restante.total_seconds()), 3600)
        minutos = resto // 60
        return f"{horas}h{minutos:02d}min"

    def _consumir_melhor_protecao(self, sid: str, alvo_id: str) -> Optional[str]:
        """Consome a proteção mais forte disponível da vítima, se houver.
        Cão de Guarda (bloqueio automático) tem prioridade sobre o Alarme
        Mágico (só estende a janela de defesa)."""
        db = self.bot.db
        if db.consumir_protecao(sid, alvo_id, "cao_de_guarda"):
            return "cao_de_guarda"
        if db.consumir_protecao(sid, alvo_id, "alarme_magico"):
            return "alarme_magico"
        return None

    async def _abrir_defesa_roubo(
        self,
        interaction: discord.Interaction,
        membro: discord.Member,
        origem: str,
        *,
        timeout: float = economia.DEFESA_ROUBO_TIMEOUT_PADRAO,
        ocultar_identidade: bool = False,
    ) -> str:
        """Abre a defesa exclusivamente na DM da vítima.

        Retorna ``impedido``, ``prosseguir`` ou ``indisponivel``. O último
        estado cancela a tentativa: roubo nenhum pode continuar se o alvo não
        teve como receber sua janela de reação privada.
        """
        view = DefesaRouboView(membro.id, timeout=timeout)
        guild_nome = getattr(interaction.guild, "name", "este servidor")
        identidade = (
            "uma figura disfarçada"
            if ocultar_identidade
            else f"**{interaction.user.display_name}**"
        )
        emb_vitima = ui.embed(
            "🥷 Tentativa de roubo!",
            categoria="economia",
            cor=0xE67E22,
            descricao=(
                f"Em **{guild_nome}**, {identidade} está tentando "
                f"roubar {origem} de você.\n\nVocê tem **{int(timeout)} segundos** "
                "para impedir no botão abaixo. Esta defesa é privada."
            ),
        )
        if not interaction.response.is_done():
            await interaction.response.defer(ephemeral=True, thinking=True)
        aguardando = ui.embed(
            "🥷 Tentativa enviada em privado",
            categoria="economia",
            descricao=(
                f"Aguardando **{membro.display_name}** reagir por mensagem privada "
                f"durante **{int(timeout)} segundos**. Nada foi publicado no servidor."
            ),
        )
        await interaction.edit_original_response(embed=aguardando, view=None)
        try:
            mensagem_vitima = await membro.send(embed=emb_vitima, view=view)
        except (discord.Forbidden, discord.HTTPException):
            log.info("nao consegui abrir a defesa privada de roubo pra %s", membro.id)
            erro = ui.embed(
                "📭 Tentativa cancelada",
                categoria="erro",
                descricao=(
                    f"Não consegui enviar a defesa privada para **{membro.display_name}**. "
                    "Nenhum dinheiro foi movido e seu cooldown não será consumido."
                ),
            )
            await interaction.edit_original_response(embed=erro, view=None)
            return "indisponivel"
        view.iniciar_prazo()
        await view.aguardar()
        view.desabilitar()
        if view.impedido:
            fim_vitima = ui.embed(
                "🛡️ Roubo impedido!",
                categoria="cofre",
                descricao=f"Você percebeu a tentativa de **{interaction.user.display_name}** e impediu o roubo.",
            )
            fim_ladrao = ui.embed(
                "🛡️ Roubo impedido!",
                categoria="erro",
                descricao=f"**{membro.display_name}** reagiu a tempo. Seu cooldown foi consumido.",
            )
            resultado = "impedido"
        else:
            fim_vitima = ui.embed(
                "⌛ A defesa não veio a tempo",
                categoria="economia",
                descricao=f"Os {int(timeout)} segundos acabaram. A tentativa será resolvida agora.",
            )
            fim_ladrao = ui.embed(
                "⌛ A defesa não veio a tempo",
                categoria="economia",
                descricao=f"Os {int(timeout)} segundos acabaram. Resolvendo a tentativa…",
            )
            resultado = "prosseguir"
        try:
            await mensagem_vitima.edit(embed=fim_vitima, view=view)
        except discord.HTTPException:
            log.info("nao consegui atualizar a DM de defesa do roubo %s", getattr(interaction, "id", "?"))
        await interaction.edit_original_response(content=None, embed=fim_ladrao, view=None)
        return resultado

    @staticmethod
    async def _mostrar_resultado_roubo(
        interaction: discord.Interaction, emb: discord.Embed
    ) -> None:
        try:
            await interaction.edit_original_response(content=None, embed=emb, view=None)
        except discord.HTTPException:
            await interaction.followup.send(embed=emb, ephemeral=True)

    async def _punir_tentativa_contra_mestre(
        self,
        interaction: discord.Interaction,
        membro: discord.Member,
        sid: str,
        uid: str,
    ) -> None:
        perdeu = self.bot.db.penalizar_tentativa_contra_mestre(
            sid, uid, str(membro.id)
        )
        castigo = (
            "O próprio Jardim engoliu **☾ 1 Lunaris** da carteira do ladrão, só pela audácia."
            if perdeu
            else "A proteção tentou cobrar ☾ 1 Lunaris, mas encontrou os bolsos vazios."
        )
        emb = ui.embed(
            "🌿 Péssima ideia.",
            categoria="erro",
            descricao=(
                f"{interaction.user.mention} tentou roubar {membro.mention}, que está "
                f"protegido como mestre. {castigo}\nO cooldown foi consumido."
            ),
        )
        if interaction.response.is_done():
            await self._mostrar_resultado_roubo(interaction, emb)
        else:
            await interaction.response.send_message(embed=emb, ephemeral=True)

    @staticmethod
    def _faixa_recurso(valor: int) -> str:
        if valor <= 0:
            return "vazio"
        if valor < 50:
            return "baixo"
        if valor < 200:
            return "médio"
        return "alto"

    @app_commands.command(
        name="roubo_planejar",
        description="Analisa em privado o risco de roubar alguém, sem revelar saldos exatos.",
    )
    @app_commands.describe(membro="Alvo que você quer observar.")
    async def roubo_planejar(
        self, interaction: discord.Interaction, membro: discord.Member
    ):
        if membro.id == interaction.user.id or membro.bot:
            await interaction.response.send_message(
                "Escolha outro jogador válido como alvo.", ephemeral=True
            )
            return
        sid, uid, alvo_id = _sid(interaction), str(interaction.user.id), str(membro.id)
        db = self.bot.db
        db.garantir_jogador(sid, uid)
        db.garantir_jogador(sid, alvo_id)
        calor = db.get_calor_roubo(sid, uid)
        carteira = self._faixa_recurso(db.get_saldo(sid, alvo_id, "Lunaris"))
        cofre = self._faixa_recurso(db.get_saldo_cofre(sid, alvo_id, "Lunaris"))
        chance = economia.chance_com_calor(
            economia.chance_roubo_cofre(
                db.get_seguranca_tier(sid, alvo_id),
                db.get_config_roubo(sid)["chance_base"],
            ),
            calor,
        )
        risco = "baixo" if chance >= 0.60 else "médio" if chance >= 0.25 else "alto"
        abordagens = "\n".join(
            f"• **{info['nome']}** — {info['descricao']}"
            for info in economia.ROUBO_ABORDAGENS.values()
        )
        emb = ui.embed(
            f"🗺️ Planejamento: {membro.display_name}",
            categoria="economia",
            descricao=(
                f"Carteira aparente: **{carteira}**\n"
                f"Cofre aparente: **{cofre}**\n"
                f"Risco do arrombamento: **{risco}**\n"
                f"Seu Calor atual: **{calor}/{economia.ROUBO_CALOR_MAXIMO}**\n\n"
                f"{abordagens}\n\nO planejamento não consome cooldown nem revela valores exatos."
            ),
        )
        try:
            await interaction.user.send(embed=emb)
            await interaction.response.send_message(
                "🗺️ Enviei o planejamento para sua DM.", ephemeral=True
            )
        except (discord.Forbidden, discord.HTTPException):
            await interaction.response.send_message(embed=emb, ephemeral=True)

    @app_commands.command(
        name="preparo_roubo_comprar",
        description="Compra um consumível usado por abordagens especiais de roubo.",
    )
    @app_commands.describe(tipo="Preparo que você quer comprar.")
    @app_commands.choices(tipo=PREPARO_ROUBO_CHOICES)
    async def preparo_roubo_comprar(
        self, interaction: discord.Interaction, tipo: app_commands.Choice[str]
    ):
        info = economia.PREPAROS_ROUBO[tipo.value]
        sid, uid = _sid(interaction), str(interaction.user.id)
        try:
            saldo = self.bot.db.comprar_preparo_roubo(
                sid, uid, tipo.value, info["custo"]
            )
        except SaldoInsuficiente as exc:
            await interaction.response.send_message(f"💸 {exc}", ephemeral=True)
            return
        await interaction.response.send_message(
            f"✅ **{info['nome']}** comprado por ☾ {info['custo']}. Saldo: ☾ {saldo}.",
            ephemeral=True,
        )

    @app_commands.command(
        name="preparos_roubo",
        description="Mostra seus consumíveis e seu Calor de roubo.",
    )
    async def preparos_roubo(self, interaction: discord.Interaction):
        sid, uid = _sid(interaction), str(interaction.user.id)
        preparos = self.bot.db.listar_preparos_roubo(sid, uid)
        linhas = [
            f"• **{info['nome']}** ×{preparos.get(tipo, 0)} — {info['descricao']}"
            for tipo, info in economia.PREPAROS_ROUBO.items()
        ]
        calor = self.bot.db.get_calor_roubo(sid, uid)
        emb = ui.embed(
            "🎭 Preparos de roubo",
            categoria="economia",
            descricao="\n".join(linhas) + f"\n\n🔥 Calor: **{calor}/{economia.ROUBO_CALOR_MAXIMO}**",
        )
        await interaction.response.send_message(embed=emb, ephemeral=True)

    @app_commands.command(description="Tenta roubar uma carteira; a defesa acontece por DM.")
    @app_commands.describe(
        membro="De quem você quer roubar.",
        abordagem="Como executar a tentativa (padrão: Cuidadosa).",
    )
    @app_commands.choices(abordagem=ROUBO_ABORDAGEM_CHOICES)
    async def roubar(
        self,
        interaction,
        membro: discord.Member,
        abordagem: Optional[app_commands.Choice[str]] = None,
    ):
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
        abordagem_id = abordagem.value if abordagem else "cuidadosa"
        dados_abordagem = economia.abordagem_roubo(abordagem_id)
        preparo_exigido = dados_abordagem["requer_preparo"]
        if preparo_exigido and db.listar_preparos_roubo(sid, uid).get(preparo_exigido, 0) < 1:
            preparo_info = economia.PREPAROS_ROUBO[preparo_exigido]
            await interaction.response.send_message(
                f"🎭 A abordagem **{dados_abordagem['nome']}** exige **{preparo_info['nome']}**. "
                "Compre com `/preparo_roubo_comprar`.",
                ephemeral=True,
            )
            return

        # /setroubo cooldown_horas descreve "as regras de /roubar_cofre neste
        # servidor", mas o cooldown sempre valeu pros dois comandos — só
        # /roubar ignorava a configuração e usava a constante do código.
        calor_atual = db.get_calor_roubo(sid, uid)
        cooldown_horas = economia.cooldown_com_calor(
            db.get_config_roubo(sid)["cooldown_horas"], calor_atual
        )
        agora = datetime.now(timezone.utc)
        mestre_protegido = db.get_mestre_protegido(sid)
        if mestre_protegido == alvo_id:
            reservado, proxima = db.reservar_tentativa_roubo(
                sid,
                uid,
                agora,
                agora + timedelta(hours=cooldown_horas),
            )
            if not reservado:
                await interaction.response.send_message(
                    f"🕒 Você já roubou recentemente. Espere mais {self._fmt_espera(proxima, agora)}.",
                    ephemeral=True,
                )
                return
            await self._punir_tentativa_contra_mestre(
                interaction, membro, sid, uid
            )
            return

        protecao = db.get_protecao_vitima(sid, alvo_id)
        if protecao is not None and protecao > agora:
            await interaction.response.send_message(
                f"{membro.display_name} acabou de ser roubado e tá de guarda alta: espere mais {self._fmt_espera(protecao, agora)}.",
                ephemeral=True)
            return

        saldo_alvo = db.get_saldo(sid, alvo_id, "Lunaris")
        if saldo_alvo <= 0:
            await interaction.response.send_message(f"{membro.display_name} não tem nada na carteira pra roubar.", ephemeral=True)
            return

        reserva_ate = agora + timedelta(seconds=30)
        alvo_reservado, _ = db.reservar_alvo_roubo(
            sid, alvo_id, agora, reserva_ate
        )
        if not alvo_reservado:
            await interaction.response.send_message(
                f"{membro.display_name} já está reagindo a outra tentativa de roubo. Tente novamente em alguns segundos.",
                ephemeral=True,
            )
            return

        try:
            cooldown_ate = agora + timedelta(hours=cooldown_horas)
            reservado, proxima = db.reservar_tentativa_roubo(
                sid,
                uid,
                agora,
                cooldown_ate,
            )
            if not reservado:
                await interaction.response.send_message(
                    f"🕒 Você já roubou recentemente. Espere mais {self._fmt_espera(proxima, agora)}.",
                    ephemeral=True,
                )
                return

            preparo_consumido = False
            if preparo_exigido:
                preparo_consumido = db.consumir_preparo_roubo(
                    sid, uid, preparo_exigido
                )
                if not preparo_consumido:
                    db.liberar_tentativa_roubo(sid, uid, cooldown_ate)
                    await interaction.response.send_message(
                        "Seu preparo já foi usado por outra tentativa. O cooldown foi liberado.",
                        ephemeral=True,
                    )
                    return

            protecao = self._consumir_melhor_protecao(sid, alvo_id)
            if protecao == "cao_de_guarda":
                novo_calor = db.adicionar_calor_roubo(
                    sid, uid, dados_abordagem["calor"]
                )
                emb = ui.embed(
                    "🐕 Um Cão de Guarda latiu!",
                    categoria="erro",
                    descricao=(
                        f"{membro.mention} tinha um **Cão de Guarda** de prontidão: a tentativa de "
                        f"{interaction.user.mention} foi barrada antes mesmo de começar. O item foi consumido.\n"
                        f"🔥 Calor atual: **{novo_calor}/{economia.ROUBO_CALOR_MAXIMO}**."
                    ),
                )
                await interaction.response.send_message(embed=emb, ephemeral=True)
                await self._avisar_vitima(
                    membro,
                    sid,
                    interaction.guild.name,
                    f"Seu **Cão de Guarda** impediu uma tentativa de roubo de {interaction.user.display_name}. O item foi consumido.",
                )
                return
            timeout_defesa = (
                economia.DEFESA_ROUBO_TIMEOUT_ALARME
                if protecao == "alarme_magico"
                else economia.DEFESA_ROUBO_TIMEOUT_PADRAO
            ) * dados_abordagem["timeout_mult"]
            defesa = await self._abrir_defesa_roubo(
                interaction,
                membro,
                "a carteira",
                timeout=timeout_defesa,
                ocultar_identidade=dados_abordagem["oculta_identidade"],
            )
            if defesa == "indisponivel":
                if protecao == "alarme_magico":
                    db.adicionar_protecao(sid, alvo_id, "alarme_magico")
                if preparo_consumido:
                    db.adicionar_preparo_roubo(sid, uid, preparo_exigido)
                db.liberar_tentativa_roubo(sid, uid, cooldown_ate)
                return
            novo_calor = db.adicionar_calor_roubo(
                sid, uid, dados_abordagem["calor"]
            )
            if defesa == "impedido":
                return

            # O saldo pode mudar durante os cinco segundos. Recalcula antes da
            # transação única, que transfere valores, extratos e recompensa.
            saldo_alvo = db.get_saldo(sid, alvo_id, "Lunaris")
            if saldo_alvo <= 0:
                emb = ui.embed(
                    "💨 A carteira escapou vazia",
                    categoria="erro",
                    descricao=f"Quando os 5 segundos acabaram, {membro.mention} já não tinha Lunaris disponíveis.",
                )
                await self._mostrar_resultado_roubo(interaction, emb)
                return
            try:
                resultado = db.executar_roubo_carteira(
                    sid,
                    uid,
                    alvo_id,
                    interaction.user.display_name,
                    membro.display_name,
                    datetime.now(timezone.utc)
                    + timedelta(hours=economia.ROUBO_PROTECAO_VITIMA_HORAS),
                    economia.ROUBO_CARTEIRA_PERCENT
                    * dados_abordagem["saque_mult"],
                )
            except AlvoProtegido:
                await self._punir_tentativa_contra_mestre(
                    interaction, membro, sid, uid
                )
                return
            except SaldoInsuficiente:
                emb = ui.embed(
                    "💨 O roubo perdeu o alvo",
                    categoria="erro",
                    descricao="O saldo mudou antes da transferência; ninguém perdeu dinheiro.",
                )
                await self._mostrar_resultado_roubo(interaction, emb)
                return

            valor = int(resultado["valor"])
            linhas = [
                f"{interaction.user.mention} roubou ☾ **{valor} Lunaris** da carteira de {membro.mention}!",
                f"🎭 Abordagem: **{dados_abordagem['nome']}** · 🔥 Calor: **{novo_calor}/{economia.ROUBO_CALOR_MAXIMO}**",
            ]
            recompensa = int(resultado["recompensa"]["valor"])
            if recompensa:
                linhas.append(f"🎯 {membro.mention} tinha recompensa na cabeça: {interaction.user.mention} coletou mais ☾ **{recompensa} Lunaris**!")
                try:
                    await cargos_mod.conceder_cacador(self.bot, interaction.guild, uid)
                    await cargos_mod.sincronizar_mais_procurado(self.bot)
                except Exception:
                    log.exception("falha ao sincronizar cargos dinamicos apos captura")
            emb = ui.embed("🥷 Roubo bem-sucedido!", categoria="economia", cor=0x2ECC71, descricao="\n".join(linhas))
            await self._mostrar_resultado_roubo(interaction, emb)
            await self._avisar_vitima(
                membro, sid, interaction.guild.name,
                f"{interaction.user.display_name} roubou ☾ **{valor} Lunaris** da sua carteira. "
                "Guarde no cofre com `/cofre_depositar` pra ficar mais seguro.",
            )
        finally:
            try:
                db.liberar_alvo_roubo(sid, alvo_id, reserva_ate)
            except Exception:
                log.exception("nao consegui liberar a reserva de roubo de %s", alvo_id)

    @app_commands.command(description="Tenta arrombar um cofre; a defesa acontece por DM.")
    @app_commands.describe(
        membro="De quem você quer roubar o cofre.",
        abordagem="Como executar a tentativa (padrão: Cuidadosa).",
    )
    @app_commands.choices(abordagem=ROUBO_ABORDAGEM_CHOICES)
    async def roubar_cofre(
        self,
        interaction,
        membro: discord.Member,
        abordagem: Optional[app_commands.Choice[str]] = None,
    ):
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
        abordagem_id = abordagem.value if abordagem else "cuidadosa"
        dados_abordagem = economia.abordagem_roubo(abordagem_id)
        preparo_exigido = dados_abordagem["requer_preparo"]
        if preparo_exigido and db.listar_preparos_roubo(sid, uid).get(preparo_exigido, 0) < 1:
            preparo_info = economia.PREPAROS_ROUBO[preparo_exigido]
            await interaction.response.send_message(
                f"🎭 A abordagem **{dados_abordagem['nome']}** exige **{preparo_info['nome']}**. "
                "Compre com `/preparo_roubo_comprar`.",
                ephemeral=True,
            )
            return

        agora = datetime.now(timezone.utc)
        cfg = db.get_config_roubo(sid)
        calor_atual = db.get_calor_roubo(sid, uid)
        cooldown_horas = economia.cooldown_com_calor(
            cfg["cooldown_horas"], calor_atual
        )
        mestre_protegido = db.get_mestre_protegido(sid)
        if mestre_protegido == alvo_id:
            reservado, proxima = db.reservar_tentativa_roubo_cofre(
                sid,
                uid,
                agora,
                agora + timedelta(hours=cooldown_horas),
            )
            if not reservado:
                await interaction.response.send_message(
                    f"🕒 Você já tentou arrombar um cofre recentemente. Espere mais {self._fmt_espera(proxima, agora)}.",
                    ephemeral=True,
                )
                return
            await self._punir_tentativa_contra_mestre(
                interaction, membro, sid, uid
            )
            return

        protecao_vitima = db.get_protecao_vitima(sid, alvo_id)
        if protecao_vitima is not None and protecao_vitima > agora:
            await interaction.response.send_message(
                f"{membro.display_name} acabou de ser roubado e está de guarda alta: espere mais {self._fmt_espera(protecao_vitima, agora)}.",
                ephemeral=True,
            )
            return

        saldo_alvo = db.get_saldo_cofre(sid, alvo_id, "Lunaris")
        if saldo_alvo <= 0:
            await interaction.response.send_message(f"O cofre de {membro.display_name} não tem Lunaris guardado.", ephemeral=True)
            return

        reserva_ate = agora + timedelta(seconds=30)
        alvo_reservado, _ = db.reservar_alvo_roubo(
            sid, alvo_id, agora, reserva_ate
        )
        if not alvo_reservado:
            await interaction.response.send_message(
                f"{membro.display_name} já está reagindo a outra tentativa de roubo. Tente novamente em alguns segundos.",
                ephemeral=True,
            )
            return

        try:
            cooldown_ate = agora + timedelta(hours=cooldown_horas)
            reservado, proxima = db.reservar_tentativa_roubo_cofre(
                sid,
                uid,
                agora,
                cooldown_ate,
            )
            if not reservado:
                await interaction.response.send_message(
                    f"🕒 Você já tentou arrombar um cofre recentemente. Espere mais {self._fmt_espera(proxima, agora)}.",
                    ephemeral=True,
                )
                return

            preparo_consumido = False
            if preparo_exigido:
                preparo_consumido = db.consumir_preparo_roubo(
                    sid, uid, preparo_exigido
                )
                if not preparo_consumido:
                    db.liberar_tentativa_roubo_cofre(sid, uid, cooldown_ate)
                    await interaction.response.send_message(
                        "Seu preparo já foi usado por outra tentativa. O cooldown foi liberado.",
                        ephemeral=True,
                    )
                    return

            protecao = self._consumir_melhor_protecao(sid, alvo_id)
            if protecao == "cao_de_guarda":
                novo_calor = db.adicionar_calor_roubo(
                    sid, uid, dados_abordagem["calor"]
                )
                emb = ui.embed(
                    "🐕 Um Cão de Guarda latiu!",
                    categoria="erro",
                    descricao=(
                        f"{membro.mention} tinha um **Cão de Guarda** de prontidão: a tentativa de "
                        f"{interaction.user.mention} foi barrada antes mesmo de começar. O item foi consumido.\n"
                        f"🔥 Calor atual: **{novo_calor}/{economia.ROUBO_CALOR_MAXIMO}**."
                    ),
                )
                await interaction.response.send_message(embed=emb, ephemeral=True)
                await self._avisar_vitima(
                    membro,
                    sid,
                    interaction.guild.name,
                    f"Seu **Cão de Guarda** impediu uma tentativa de arrombamento de {interaction.user.display_name}. O item foi consumido.",
                )
                return
            timeout_defesa = (
                economia.DEFESA_ROUBO_TIMEOUT_ALARME
                if protecao == "alarme_magico"
                else economia.DEFESA_ROUBO_TIMEOUT_PADRAO
            ) * dados_abordagem["timeout_mult"]
            defesa = await self._abrir_defesa_roubo(
                interaction,
                membro,
                "o cofre",
                timeout=timeout_defesa,
                ocultar_identidade=dados_abordagem["oculta_identidade"],
            )
            if defesa == "indisponivel":
                if protecao == "alarme_magico":
                    db.adicionar_protecao(sid, alvo_id, "alarme_magico")
                if preparo_consumido:
                    db.adicionar_preparo_roubo(sid, uid, preparo_exigido)
                db.liberar_tentativa_roubo_cofre(sid, uid, cooldown_ate)
                return
            novo_calor = db.adicionar_calor_roubo(
                sid, uid, dados_abordagem["calor"]
            )
            if defesa == "impedido":
                return

            saldo_alvo = db.get_saldo_cofre(sid, alvo_id, "Lunaris")
            if saldo_alvo <= 0:
                emb = ui.embed(
                    "💨 O cofre ficou vazio",
                    categoria="erro",
                    descricao=f"Quando os 5 segundos acabaram, o cofre de {membro.mention} já não tinha Lunaris.",
                )
                await self._mostrar_resultado_roubo(interaction, emb)
                return
            seg_tier = db.get_seguranca_tier(sid, alvo_id)
            chance = economia.chance_com_calor(
                economia.chance_roubo_cofre(seg_tier, cfg["chance_base"]),
                calor_atual,
            )

            if random.random() < chance:
                try:
                    resultado = db.executar_roubo_cofre(
                        sid,
                        uid,
                        alvo_id,
                        interaction.user.display_name,
                        membro.display_name,
                        datetime.now(timezone.utc)
                        + timedelta(hours=economia.ROUBO_PROTECAO_VITIMA_HORAS),
                        economia.ROUBO_COFRE_PERCENT
                        * dados_abordagem["saque_mult"],
                    )
                except AlvoProtegido:
                    await self._punir_tentativa_contra_mestre(
                        interaction, membro, sid, uid
                    )
                    return
                except SaldoInsuficiente:
                    emb = ui.embed(
                        "💨 O roubo perdeu o alvo",
                        categoria="erro",
                        descricao="O saldo do cofre mudou antes da transferência; ninguém perdeu dinheiro.",
                    )
                    await self._mostrar_resultado_roubo(interaction, emb)
                    return
                valor = int(resultado["valor"])
                linhas = [
                    f"{interaction.user.mention} arrombou o cofre de {membro.mention} e levou ☾ **{valor} Lunaris**!",
                    f"🎭 Abordagem: **{dados_abordagem['nome']}** · 🔥 Calor: **{novo_calor}/{economia.ROUBO_CALOR_MAXIMO}**",
                ]
                recompensa = int(resultado["recompensa"]["valor"])
                if recompensa:
                    linhas.append(f"🎯 {membro.mention} tinha recompensa na cabeça: {interaction.user.mention} coletou mais ☾ **{recompensa} Lunaris**!")
                    try:
                        await cargos_mod.conceder_cacador(self.bot, interaction.guild, uid)
                        await cargos_mod.sincronizar_mais_procurado(self.bot)
                    except Exception:
                        log.exception("falha ao sincronizar cargos dinamicos apos captura")
                seguro = int(resultado.get("seguro", 0))
                if seguro:
                    linhas.append(
                        f"🛡️ O seguro indenizou a vítima em ☾ **{seguro} Lunaris**."
                    )
                emb = ui.embed("🥷 Cofre arrombado!", categoria="economia", cor=0x2ECC71, descricao="\n".join(linhas))
                await self._mostrar_resultado_roubo(interaction, emb)
                await self._avisar_vitima(
                    membro, sid, interaction.guild.name,
                    f"{interaction.user.display_name} arrombou seu cofre e levou ☾ **{valor} Lunaris** guardados. "
                    + (f"Seu seguro devolveu ☾ **{seguro} Lunaris**. " if seguro else "")
                    + "Considere melhorar a segurança com `/cofre_seguranca_melhorar`.",
                )
                return

            percentual_multa = min(
                1.0,
                random.uniform(
                    economia.ROUBO_MULTA_PERCENT_MIN,
                    economia.ROUBO_MULTA_PERCENT_MAX,
                )
                * dados_abordagem["multa_mult"],
            )
            try:
                multa = db.transferir_multa_roubo(
                    sid,
                    uid,
                    alvo_id,
                    percentual_multa,
                    interaction.user.display_name,
                    membro.display_name,
                )
            except AlvoProtegido:
                await self._punir_tentativa_contra_mestre(
                    interaction, membro, sid, uid
                )
                return
            except SaldoInsuficiente:
                multa = 0
            emb = ui.embed("🚨 Arrombamento fracassado!", categoria="erro",
                descricao=f"{interaction.user.mention} tentou arrombar o cofre de {membro.mention} e a segurança pegou!"
                          + (f"\nPagou ☾ **{multa} Lunaris** de multa pro alvo." if multa else "\nNão tinha nada na carteira pra pagar multa."))
            await self._mostrar_resultado_roubo(interaction, emb)
            await self._avisar_vitima(
                membro,
                sid,
                interaction.guild.name,
                f"A segurança do seu cofre frustrou a tentativa de {interaction.user.display_name}."
                + (f" Você recebeu ☾ **{multa} Lunaris** de multa." if multa else ""),
            )
        finally:
            try:
                db.liberar_alvo_roubo(sid, alvo_id, reserva_ate)
            except Exception:
                log.exception("nao consegui liberar a reserva de roubo de %s", alvo_id)

    @app_commands.command(description="Mostra seu Cartão Lunar, limite e reputação bancária.")
    @app_commands.describe(membro="Ver de outra pessoa (opcional).")
    async def cartao(self, interaction, membro: Optional[discord.Member] = None):
        alvo = membro or interaction.user
        sid, uid = _sid(interaction), str(alvo.id)
        db = self.bot.db
        c = db.get_cartao(sid, uid)
        benef = economia.beneficios_reputacao(c["credito"])
        tier = economia.cartao_por_id(c["tier"]) or economia.cartao_por_id(economia.CARTAO_TIER_INICIAL)
        limite = economia.limite_efetivo(c["tier"], c["credito"])
        divida = db.get_divida(sid, uid)
        faturas_pendentes = db.get_total_faturas_pendentes(sid, uid)
        emb = ui.embed(f"💳 Cartão Lunar de {alvo.display_name}", categoria="economia")
        limite_restante = economia.limite_disponivel(
            c["tier"], c["credito"], divida, faturas_pendentes
        )
        emb.add_field(name="🏦 Reputação bancária", value=f"**{c['credito']} pontos** · {benef['rotulo']}", inline=False)
        emb.add_field(name="💳 Nível do cartão", value=tier["nome"], inline=False)
        emb.add_field(
            name="🌙 Limite do cartão",
            value=(
                f"Total: ☾ **{limite}** · em faturas: ☾ **{faturas_pendentes}** · "
                f"em dívida: ☾ **{divida}** · disponível: ☾ **{limite_restante}**"
            ),
            inline=False,
        )
        if faturas_pendentes > 0:
            emb.add_field(
                name="🧾 Faturas abertas",
                value=f"☾ {faturas_pendentes} Lunaris · veja vencimentos com `/fatura`",
                inline=False,
            )
        if divida > 0:
            emb.add_field(
                name="Dívida atual",
                value=f"☾ {divida} Lunaris · não é quitada por recebimentos; use `/divida_pagar`",
                inline=False,
            )
        prox = economia.proximo_cartao(c["tier"])
        rodape = f"{ui.MARCA}"
        if prox:
            requisito = economia.reputacao_minima_upgrade("cartao", prox["id"])
            custos = economia.custos_upgrade(prox, c["credito"])
            rodape += (
                f" · Próximo: {prox['nome']} · reputação {requisito} · "
                f"limite {prox['limite']} · {fmt_custos(custos, compacto=True, markdown=False)} · /cartao_melhorar"
            )
        emb.set_footer(text=rodape)
        await interaction.response.send_message(embed=emb)

    @app_commands.command(name="cartao_melhorar", description="Melhora o Cartão Lunar com as moedas e materiais exigidos.")
    async def cartao_melhorar(self, interaction):
        sid, uid = _sid(interaction), str(interaction.user.id)
        db = self.bot.db
        c = db.get_cartao(sid, uid)
        prox = economia.proximo_cartao(c["tier"])
        if not prox:
            await interaction.response.send_message("Seu cartão já é Eterno (máximo).", ephemeral=True)
            return
        requisito = economia.reputacao_minima_upgrade("cartao", prox["id"])
        if requisito > 0 and c["credito"] < requisito:
            await interaction.response.send_message(
                f"🔒 **{prox['nome']}** exige **{requisito} de reputação bancária**. "
                f"Você tem **{c['credito']}**. Pague faturas no prazo para melhorar sua reputação.",
                ephemeral=True,
            )
            return
        custos = economia.custos_upgrade(prox, c["credito"])
        try:
            db.comprar_upgrade_multimoeda(
                sid, uid, "cartao", c["tier"], prox["id"], custos,
                f"Upgrade do cartão para {prox['nome']}",
            )
        except (SaldoInsuficiente, UpgradeDesatualizado) as e:
            await interaction.response.send_message(f"💸 {e}", ephemeral=True)
            return
        if economia.upgrade_noticiavel("cartao", prox["id"]):
            db.criar_aviso(
                sid,
                f"💳 {interaction.user.mention} conquistou o **{prox['nome']}**, "
                f"o nível máximo do Cartão Lunar.",
            )
        emb = ui.embed("💳 Cartão melhorado!", categoria="economia",
            descricao=(
                f"Agora você tem um **{prox['nome']}** "
                f"(limite do cartão: {prox['limite']} Lunaris).\n"
                f"Investimento: {fmt_custos(custos, compacto=True)}."
            ))
        await interaction.response.send_message(embed=emb)


    # ── Loja de baús (compráveis) ──
    BAUS_CHOICES = [app_commands.Choice(name=b["nome"], value=b["id"]) for b in economia.BAUS_COMPRAVEIS]

    @app_commands.command(name="loja_baus", description="Baús que dá pra comprar e abrir.")
    async def loja_baus(self, interaction):
        emb = ui.embed("🎁 Loja de Baús", categoria="bau")
        for b in economia.BAUS_COMPRAVEIS:
            requisito = economia.reputacao_minima_bau(b["id"])
            emb.add_field(name=f"{b['nome']}: ☾ {b['preco']} Lunaris",
                          value=(
                              f"`{b['id']}` · {b['itens']} item(ns) + Lunaris · "
                              f"{fmt_requisito_reputacao(requisito)}"
                          ), inline=False)
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
        requisito = economia.reputacao_minima_bau(b["id"])
        if requisito > 0 and cartao["credito"] < requisito:
            await interaction.response.send_message(
                f"🔒 Este baú exige **{requisito} de reputação bancária**. "
                f"Sua reputação atual é **{cartao['credito']}**.",
                ephemeral=True,
            )
            return
        limite = economia.limite_efetivo(cartao["tier"], cartao["credito"])
        db.converter_faturas_vencidas(sid)
        cotacao = economia.cotar_pagamento(
            b["preco"],
            db.get_saldo(sid, uid, "Lunaris"),
            limite,
            db.get_divida(sid, uid),
            db.get_total_faturas_pendentes(sid, uid),
        )
        if not cotacao["pode_comprar"]:
            await interaction.response.send_message(
                f"💸 O baú custa ☾ **{b['preco']}**, mas sua carteira + limite disponível "
                f"somam apenas ☾ **{cotacao['saldo_carteira'] + cotacao['limite_disponivel']}**.",
                ephemeral=True,
            )
            return
        if cotacao["precisa_confirmacao"]:
            compra_id = str(interaction.id)

            async def confirmar(interacao_botao: discord.Interaction):
                cartao_atual = db.get_cartao(sid, uid)
                if requisito > 0 and cartao_atual["credito"] < requisito:
                    await interacao_botao.followup.send(
                        "🔒 Sua reputação mudou e não permite mais esta compra.", ephemeral=True
                    )
                    return
                limite_atual = economia.limite_efetivo(
                    cartao_atual["tier"], cartao_atual["credito"]
                )
                try:
                    pagamento = db.cobrar_compra_com_fatura(
                        sid,
                        uid,
                        b["preco"],
                        limite_atual,
                        f"Compra: {b['nome']}",
                        f"bau:{compra_id}",
                        entrega_bau={"id": b["id"], "nome": b["nome"]},
                    )
                except SaldoInsuficiente as exc:
                    await interacao_botao.followup.send(f"💸 {exc}", ephemeral=True)
                    return
                if pagamento["repetido"]:
                    await interacao_botao.followup.send(
                        "Esta compra já tinha sido processada.", ephemeral=True
                    )
                    return
                await self._finalizar_compra_bau(
                    interacao_botao,
                    b,
                    pagamento,
                    resposta_ja_deferida=True,
                    estoque_ja_creditado=True,
                )

            view = ConfirmarFinanciamentoView(
                autor_id=interaction.user.id,
                executar=confirmar,
            )
            await interaction.response.send_message(
                embed=embed_confirmacao_financiamento(f"Compra de {b['nome']}", cotacao),
                view=view,
                ephemeral=True,
            )
            return
        try:
            saldo_novo = db.comprar_bau_dinheiro(
                sid, uid, b["id"], b["nome"], b["preco"]
            )
        except SaldoInsuficiente as e:
            await interaction.response.send_message(f"💸 {e}", ephemeral=True)
            return
        await self._finalizar_compra_bau(
            interaction,
            b,
            {
                "saldo": saldo_novo,
                "carteira_usada": b["preco"],
                "financiado": 0,
                "vence_em": None,
            },
            estoque_ja_creditado=True,
        )

    async def _finalizar_compra_bau(
        self,
        interaction,
        b: dict,
        pagamento: dict,
        *,
        resposta_ja_deferida: bool = False,
        estoque_ja_creditado: bool = False,
    ):
        sid, uid = _sid(interaction), str(interaction.user.id)
        db = self.bot.db
        if not estoque_ja_creditado:
            db.add_bau(sid, uid, b["id"], 1)
            db.registrar_extrato(sid, uid, -b["preco"], "Lunaris", f"Comprou {b['nome']}")
        msg = f"Você comprou um **{b['nome']}** por ☾ {b['preco']}. Abra com `/abrir_bau`."
        if pagamento["financiado"] > 0:
            vence_ts = int(pagamento["vence_em"].timestamp())
            msg += (
                f"\n🧾 Fatura criada: ☾ **{pagamento['financiado']} Lunaris** · "
                f"vence <t:{vence_ts}:R>. Pague com `/fatura_pagar`."
            )
        emb = ui.embed("🎁 Baú comprado!", categoria="bau", descricao=msg)
        if resposta_ja_deferida:
            await interaction.followup.send(embed=emb, ephemeral=True)
        else:
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
        """Entrega no cofre local. Levantar aqui significa "nada saiu", e é o
        que autoriza `_abrir_um_bau` a repor o baú.

        Por isso o crédito das moedas vem primeiro e sozinho: passou dele, o
        jogador JÁ recebeu algo e repor o baú duplicaria o prêmio. Falha de
        item depois disso vira aviso na lista de ganhos, não exceção."""
        db = self.bot.db
        db.creditar(sid, uid, "Lunaris", premio["lunaris"])
        ganhos = [f"☾ {premio['lunaris']} Lunaris"]
        try:
            db.registrar_extrato(sid, uid, premio["lunaris"], "Lunaris", "Baú aberto")
            tier = db.get_cofre_tier(sid, uid)
            for it in premio["itens"]:
                if economia.pode_guardar(db.contar_itens(sid, uid), 1, tier):
                    db.add_item(sid, uid, it.id, it.titulo, it.tipo, 1)
                    ganhos.append(f"**{it.titulo}** ({it.raridade_rotulo})")
                else:
                    ganhos.append(f"~~{it.titulo}~~: cofre cheio! (`/cofre_melhorar`)")
        except Exception:
            log.exception(
                "entrega legada parcial (guild=%s user=%s): moedas creditadas, itens nao",
                sid, uid,
            )
            ganhos.append("⚠️ Não consegui guardar os itens: avise o mestre.")
        return ganhos

    async def _abrir_um_bau(self, interaction, sid: str, uid: str, b: dict, indice: int = 0):
        """Sorteia e entrega o prêmio de UM baú (já removido do estoque de
        quem chamou). Devolve (ganhos, destino, ok, lunaris). ok=False = nada
        foi entregue e o baú JÁ voltou ao estoque; o chamador só precisa
        avisar o jogador.

        A entrega passa por core/entrega.py, que tenta a API, cai pro
        PostgreSQL compartilhado e só então pro cofre local: um baú pago
        nunca fica sem prêmio porque o salto HTTP até a plataforma caiu.
        Falhar de verdade aqui exige o banco inteiro fora — e aí o baú é
        reposto em vez de sumir.

        `indice` distingue baús abertos na MESMA interação (/abrir_todos
        chama isto várias vezes com o mesmo interaction.id): sem ele, dois
        baús iguais que sorteiam o mesmo Lunaris geram chave idêntica, o
        depósito é deduplicado e o bot conta como aberto mesmo assim: o
        jogador perde o loot em silêncio."""
        db = self.bot.db
        premio = loot_mod.sortear_bau(self.bot.catalogo, qtd_itens=b["itens"], rng=random,
                                      pesos=b["pesos"], lunaris_min=b["lunaris_min"], lunaris_max=b["lunaris_max"], tipos=b.get("tipos"))
        ganhos = [f"☾ {premio['lunaris']} Lunaris"]
        ganhos.extend(f"**{it.titulo}** ({it.raridade_rotulo})" for it in premio["itens"])
        try:
            # Lunaris de baú vai sempre pra carteira local (inclusive para a
            # economia integrada ao site), mas é roubável. Só os itens usam
            # o cofre da conta no site: é ele que fica protegido e que a
            # ficha enxerga.
            destino_entrega = await entrega_mod.entregar_no_cofre(
                self.bot,
                guild_id=sid,
                user_id=uid,
                idempotencia=f"bau-comprado:{interaction.id}:{indice}:{b['id']}:{premio['lunaris']}",
                motivo=f"Abertura de {b['nome']} comprado no Banqueiro",
                itens=[{
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
                moedas=[],
            )
            if destino_entrega == entrega_mod.COFRE:
                db.creditar(sid, uid, "Lunaris", premio["lunaris"])
                return ganhos, "Lunaris na carteira · itens no cofre da conta no site", True, premio["lunaris"]
            ganhos = self._entregar_legado(sid, uid, premio)
        except Exception:
            # Só chega aqui com o PostgreSQL fora: nem o cofre da conta nem o
            # local aceitaram escrita. Repõe o baú — ele foi pago.
            log.exception(
                "nao consegui entregar o bau (guild=%s user=%s bau=%s); repondo no estoque",
                sid, uid, b["id"],
            )
            try:
                db.add_bau(sid, uid, b["id"], 1)
            except Exception:
                log.exception(
                    "falha ao repor o bau %s de %s/%s no estoque", b["id"], sid, uid
                )
            return [], "", False, 0
        destino = (
            "sua carteira no Banqueiro (vincule sua conta pra usar a ficha)"
            if self.bot.platform is not None else "sua carteira"
        )
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
                "⚠️ O banco não respondeu e eu não consegui entregar o prêmio. "
                f"Seu **{b['nome']}** voltou pro estoque: tente de novo em instantes.",
                ephemeral=True,
            )
            return
        rodape_dica = (
            "Escolha o personagem pelo site pra receber os itens; as moedas já estão na carteira."
            if "cofre da conta" in destino
            else "As moedas ficam na carteira: use `/cofre_depositar` para contar com a segurança do cofre."
        )
        emb = ui.embed(f"🎁 {b['nome']} aberto!", categoria="bau",
            descricao="\n".join(f"• {g}" for g in ganhos) + f"\n\nEntregue em **{destino}**. {rodape_dica}")
        await interaction.followup.send(embed=emb)

    @app_commands.command(name="abrir_todos", description="Abre todos os baús que você tem de uma vez (ou de um tipo só).")
    @app_commands.describe(tipo="Tipo de baú (opcional: sem isso, abre todos os tipos).")
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
        destinos: set[str] = set()
        interrompeu = False
        abertos = 0
        indice = 0
        restantes = economia.ABRIR_TODOS_LIMITE
        for entrada in estoque:
            if restantes <= 0 or interrompeu:
                break
            b = economia.bau_compravel_por_id(entrada["bau_id"])
            if not b:
                continue
            for _ in range(min(entrada["quantidade"], restantes)):
                if not db.remover_bau(sid, uid, b["id"], 1):
                    # Estoque mudou entre a listagem e a abertura (corrida com
                    # outro /abrir_todos ou /abrir_bau): nada foi retirado
                    # aqui, então não há o que repor — só para de tentar esse
                    # tipo em vez de repetir contra um estoque que já mudou.
                    interrompeu = True
                    break
                ganhos, destino, ok, lunaris = await self._abrir_um_bau(interaction, sid, uid, b, indice)
                indice += 1
                restantes -= 1
                if not ok:
                    # Só falha com o banco fora, e aí o próximo baú falharia
                    # igual: para na hora em vez de repetir 25 vezes. O baú
                    # foi reposto pelo _abrir_um_bau.
                    interrompeu = True
                    break
                abertos += 1
                total_lunaris += lunaris
                destinos.add(destino)
                itens_ganhos.extend(g for g in ganhos if "Lunaris" not in g)
        linhas = [f"Abriu **{abertos}** baú(s), ganhou ☾ **{total_lunaris} Lunaris** no total."]
        if itens_ganhos:
            linhas.append("Itens: " + ", ".join(itens_ganhos)[:900])
        if destinos:
            linhas.append("Entregue em " + ", ".join(f"**{d}**" for d in sorted(destinos)) + ".")
        if interrompeu:
            linhas.append(
                "⚠️ Parou no meio: um baú não pôde ser aberto agora (o estoque mudou ou o "
                "banco não respondeu) e o resto continua com você. Rode `/abrir_todos` de novo em instantes."
            )
        if not interrompeu and total_no_estoque > economia.ABRIR_TODOS_LIMITE:
            linhas.append(f"Você tinha mais baús do que o limite de {economia.ABRIR_TODOS_LIMITE} por vez: rode `/abrir_todos` de novo pro resto.")
        emb = ui.embed("🎁 Baús abertos!", categoria="bau", descricao="\n".join(linhas))
        await interaction.followup.send(embed=emb)



async def setup(bot):
    await bot.add_cog(Economia(bot))
