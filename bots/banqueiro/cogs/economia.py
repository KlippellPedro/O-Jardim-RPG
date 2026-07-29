"""Cog Economia: comandos do jogador. Integra o Cartão Lunar (cashback,
desconto, linha de crédito). Lógica vem de core.economia e core.db."""

from __future__ import annotations

import asyncio
import logging
import math
import random
import time
from datetime import datetime, timedelta, timezone
from typing import Optional, List

import discord
from discord import app_commands
from discord.ext import commands, tasks

from core import cargos as cargos_mod
from core import economia
from core import loot as loot_mod
from core import ui
from core.db import AlvoProtegido, SaldoInsuficiente
from core.inventario import CofreCheio, CofreIndisponivel, ItemIndisponivel
from core.platform_api import PlatformApiError
from core.tasks_util import registrar_reinicio_em_erro

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
    emb.set_footer(text=f"{ui.MARCA} · id: {it.id} · {it.acao.lower()} com /comprar {it.id}")
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
                "Tarde demais: os 5 segundos já acabaram.", ephemeral=True
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


class LojaView(discord.ui.View):
    """Loja navegável: ◀ ▶ pra paginar e um menu pra comprar direto (mesma
    lógica de dinheiro do /comprar, via cog._executar_compra)."""

    def __init__(self, cog, itens, *, autor_id: int, moeda: str = "Lunaris", timeout: float = 180):
        super().__init__(timeout=timeout)
        self.cog = cog
        self.autor_id = autor_id
        self.moeda = moeda
        self.paginas = ui.paginar(itens, 20)
        self.total = sum(len(p) for p in self.paginas)
        self.indice = 0
        self._montar()

    async def interaction_check(self, interaction: discord.Interaction) -> bool:
        if interaction.user.id != self.autor_id:
            await interaction.response.send_message(
                "Essa loja é de quem abriu o comando. Use `/loja` pra abrir a sua.", ephemeral=True
            )
            return False
        return True

    def _itens_pagina(self):
        return self.paginas[self.indice] if self.paginas else []

    def embed_atual(self) -> discord.Embed:
        emb = ui.embed(
            f"🏪 Loja do {economia.NOME_BOT}",
            categoria="loja",
            descricao=f"{self.total} item(ns) à venda: escolha no menu pra comprar com {self.moeda}.",
        )
        for it in self._itens_pagina():
            emb.add_field(
                name=f"{ui.icone_raridade(it.raridade)} {it.titulo}  ·  {_tag_item(it)}",
                value=f"`{it.id}`: {fmt_preco(it.preco)}",
                inline=False,
            )
        if len(self.paginas) > 1:
            emb.set_footer(
                text=f"{ui.MARCA} · Página {self.indice + 1}/{len(self.paginas)} · "
                "/comprar <id> <moeda> pra pagar com Solares"
            )
        return emb

    def _montar(self) -> None:
        self.clear_items()
        if len(self.paginas) > 1:
            anterior = discord.ui.Button(
                label="◀", style=discord.ButtonStyle.secondary, disabled=self.indice == 0
            )
            anterior.callback = self._anterior
            proximo = discord.ui.Button(
                label="▶",
                style=discord.ButtonStyle.secondary,
                disabled=self.indice >= len(self.paginas) - 1,
            )
            proximo.callback = self._proximo
            self.add_item(anterior)
            self.add_item(proximo)
        itens = self._itens_pagina()
        if itens:
            menu = discord.ui.Select(
                placeholder=f"🛒 Comprar um item desta página ({self.moeda})…",
                options=[
                    discord.SelectOption(
                        label=it.titulo[:100],
                        value=it.id,
                        description=fmt_preco(it.preco)[:100],
                    )
                    for it in itens[:25]
                ],
            )
            menu.callback = self._comprar_selecionado
            self.add_item(menu)

    async def _anterior(self, interaction: discord.Interaction) -> None:
        self.indice = max(0, self.indice - 1)
        self._montar()
        await interaction.response.edit_message(embed=self.embed_atual(), view=self)

    async def _proximo(self, interaction: discord.Interaction) -> None:
        self.indice = min(len(self.paginas) - 1, self.indice + 1)
        self._montar()
        await interaction.response.edit_message(embed=self.embed_atual(), view=self)

    async def _comprar_selecionado(self, interaction: discord.Interaction) -> None:
        item_id = interaction.data["values"][0]
        await self.cog._executar_compra(interaction, item_id, self.moeda)


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
            try:
                taxa = self.bot.db.get_economia_config(gid)["juros_cofre_taxa"]
                afetados = self.bot.db.aplicar_juros_cofre(gid, taxa)
                if afetados:
                    self.bot.db.criar_aviso(
                        gid,
                        f"💰 O cofre rendeu juros! Quem guardou Lunaris viu o saldo crescer "
                        f"~{int(taxa * 100)}%. Guarde mais com `/cofre_depositar`.",
                    )
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
        emb.add_field(name=f"{cofre['nome']}: itens", value=ui.barra(await self.bot.inventario.contar(sid, uid), cap), inline=False)
        emb.add_field(name="Cartão", value=f"crédito {cartao['credito']} · {economia.cartao_por_id(cartao['tier'])['nome']}")
        divida = db.get_divida(sid, uid)
        if divida > 0:
            emb.add_field(
                name="📋 Dívida do Cartão Lunar",
                value=f"☾ {divida} Lunaris · pague quando quiser com `/divida_pagar`",
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
                else f"{ui.MARCA} · Em um roubo, você tem 5 segundos para reagir"
            )
        )
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
            await interaction.response.send_message(embed=paginas[0])
            return
        view = ui.Paginador(paginas, autor_id=interaction.user.id)
        await interaction.response.send_message(embed=view.pagina_atual, view=view)

    @app_commands.command(description="Mostra o perfil econômico de alguém: patrimônio, itens e histórico.")
    @app_commands.describe(membro="Ver o perfil de outra pessoa (opcional).")
    async def perfil(self, interaction, membro: Optional[discord.Member] = None):
        alvo = membro or interaction.user
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
        await interaction.response.send_message(embed=emb)

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
        view = LojaView(self, itens, autor_id=interaction.user.id)
        await interaction.response.send_message(embed=view.embed_atual(), view=view)

    @app_commands.command(description="Compra um item da loja.")
    @app_commands.describe(item="Item.", moeda="Moeda pra pagar (padrão Lunaris).")
    @app_commands.choices(moeda=MOEDAS_CHOICES)
    async def comprar(self, interaction, item: str, moeda: Optional[app_commands.Choice[str]] = None):
        moeda_nome = moeda.value if moeda else "Lunaris"
        await self._executar_compra(interaction, item, moeda_nome)

    async def _executar_compra(self, interaction, item: str, moeda_nome: str):
        """Fluxo de compra compartilhado pelo /comprar e pelos botões do /loja."""
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
        # Capacidade agora vale igual nos dois modos: antes só era checada
        # sem integração ligada, deixando o cofre da plataforma efetivamente
        # ilimitado por compra. É uma checagem consultiva (o depósito em si
        # não recusa por capacidade), mas fecha a inconsistência com /trocar,
        # que já respeitava capacidade nos dois modos.
        if not await self.bot.inventario.cabe(sid, uid, 1):
            tier = db.get_cofre_tier(sid, uid)
            await interaction.response.send_message(f"Seu cofre ({economia.cofre_por_id(tier)['nome']}) está cheio. Use `/cofre_melhorar`.", ephemeral=True)
            return
        cartao = db.get_cartao(sid, uid)
        benef = economia.beneficios_credito(cartao["credito"])
        limite = economia.limite_efetivo(cartao["tier"], cartao["credito"]) if economia.mesma_moeda(moeda_nome, "Lunaris") else 0
        divida_antes = db.get_divida(sid, uid)
        try:
            db.debitar(sid, uid, moeda_nome, preco, permitir_negativo_ate=limite)
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
        # Inventario.dar() nunca falha de um jeito que exija estorno: cai pro
        # cofre local em qualquer problema da plataforma (mesma regra do
        # Jornalista pra recompensa de baú): o dinheiro já debitado sempre
        # corresponde a um item entregue em algum lugar.
        destino = await self.bot.inventario.dar(
            sid, uid, it.id, it.titulo, it.tipo, 1,
            dados={**it.conteudo, "raridade": it.raridade, "origem": "loja-discord"},
            motivo=f"Compra de {it.titulo} no Banqueiro",
            chave=f"compra-item:{interaction.id}",
        )
        destino_central = destino == "cofre"
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
        # Retirar ANTES de creditar: a ordem inversa pagaria por um item que,
        # em modo "cofre" (chamada HTTP), pode nunca ter saído de fato.
        await interaction.response.defer()
        try:
            await self.bot.inventario.tirar(
                sid, uid, it.id, 1, motivo=f"Venda: {it.titulo}", chave=f"venda-item:{interaction.id}"
            )
        except ItemIndisponivel:
            await interaction.followup.send(f"Você não tem **{it.titulo}** no inventário.", ephemeral=True)
            return
        except CofreIndisponivel:
            await interaction.followup.send(
                "O cofre central não respondeu. Nada foi vendido: tente de novo em instantes.", ephemeral=True
            )
            return
        venda_ratio = self.bot.db.get_economia_config(sid)["venda_ratio"]
        reembolso = math.floor(preco * venda_ratio)
        self.bot.db.creditar(sid, uid, moeda_nome, reembolso)
        self.bot.db.registrar_extrato(sid, uid, reembolso, moeda_nome, f"Venda: {it.titulo}")
        simb = SIMBOLO.get(economia.normalizar(moeda_nome), "")
        emb = ui.embed("Venda realizada!", categoria="loja",
            descricao=f"Você vendeu **{it.titulo}** por {simb} {reembolso} {moeda_nome} ({int(venda_ratio*100)}%).")
        await interaction.followup.send(embed=emb)

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
        # Alimenta o câmbio flutuante (cogs/mercado.py): sempre em Lunaris
        # equivalente, pra comparar demanda nos dois sentidos igualzinho.
        if economia.mesma_moeda(de.value, "Lunaris"):
            self.bot.db.registrar_fluxo_cambio(sid, "compra_solares", quantia)
        else:
            self.bot.db.registrar_fluxo_cambio(sid, "venda_solares", recebido)
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
        cofre = economia.cofre_por_id(tier)
        seguranca = economia.seguranca_por_id(seg_tier)
        prox = economia.proximo_cofre(tier)
        prox_seg = economia.proximo_seguranca(seg_tier)
        itens = await self.bot.inventario.listar(sid, uid)
        total_itens = sum(item.quantidade for item in itens)
        capacidade_itens = economia.capacidade_do_cofre(tier)
        emb = ui.embed(
            f"🔒 Cofre de {interaction.user.display_name}",
            categoria="cofre",
            descricao=f"**{cofre['nome']}**\n{seguranca['nome']}",
        )
        emb.add_field(
            name=f"📦 Itens guardados — {total_itens}/{capacidade_itens}",
            value=fmt_itens_cofre(itens),
            inline=False,
        )
        saldo_cofre = db.get_cofre_saldo(sid, uid)
        cap_moeda = economia.capacidade_moeda_do_cofre(tier)
        moedas_exibidas = list(saldo_cofre.keys())
        if "Lunaris" not in moedas_exibidas:
            moedas_exibidas.insert(0, "Lunaris")
        saldos = "\n".join(
            f"{SIMBOLO.get(economia.normalizar(m), '◈')} **{m}:** "
            f"{fmt_quantidade(saldo_cofre.get(m, 0))} / {fmt_quantidade(cap_moeda)}"
            for m in moedas_exibidas
        )
        emb.add_field(
            name=f"🪙 Dinheiro protegido — limite por moeda",
            value=saldos,
            inline=False,
        )
        chance = round(economia.chance_roubo_cofre(seg_tier, db.get_config_roubo(sid)["chance_base"]) * 100)
        emb.add_field(
            name="🛡️ Segurança atual",
            value=f"**{seguranca['nome']}**\nChance estimada de arrombamento hoje: **~{chance}%**",
            inline=False,
        )
        if prox:
            emb.add_field(
                name="⬆️ Próxima melhoria do cofre",
                value=(
                    f"**{prox['nome']}**\n"
                    f"{prox['capacidade']} itens · {fmt_quantidade(economia.capacidade_moeda_do_cofre(prox['id']))} por moeda\n"
                    f"Custo: ☾ {fmt_quantidade(prox['custo'])} · `/cofre_melhorar`"
                ),
                inline=False,
            )
        if prox_seg:
            emb.add_field(
                name="🔐 Próxima melhoria de segurança",
                value=(
                    f"**{prox_seg['nome']}** · {int(prox_seg['defesa'] * 100)}% de defesa\n"
                    f"Custo: ☾ {fmt_quantidade(prox_seg['custo'])} · `/cofre_seguranca_melhorar`"
                ),
                inline=False,
            )
        if db.get_mestre_protegido(sid) == uid:
            emb.add_field(
                name="🛡️ Proteção do mestre",
                value="Este cofre é imune a tentativas de roubo.",
                inline=False,
            )
        emb.set_footer(text=f"{ui.MARCA} · Deposite com /cofre_depositar · saque com /cofre_sacar")
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
        saque_taxa = self.bot.db.get_economia_config(sid)["cofre_saque_taxa"]
        taxa = math.floor(quantia * saque_taxa)
        recebido = quantia - taxa
        novo = db.creditar(sid, uid, moeda_nome, recebido)
        db.registrar_extrato(sid, uid, -quantia, moeda_nome, "Sacado do cofre")
        db.registrar_extrato(sid, uid, recebido, moeda_nome, f"Recebido na carteira (taxa de {int(saque_taxa*100)}%)")
        simb = SIMBOLO.get(economia.normalizar(moeda_nome), "")
        linhas = [f"Você sacou {simb} **{recebido} {moeda_nome}** pra carteira (taxa de {int(saque_taxa*100)}%: {simb} {taxa})."]
        linhas.append("⚠️ Dinheiro na carteira pode ser roubado.")
        emb = ui.embed("🔓 Saque do cofre!", categoria="cofre", descricao="\n".join(linhas))
        await interaction.response.send_message(embed=emb)

    @staticmethod
    async def _avisar_vitima(membro: discord.Member, guild_nome: str, texto: str) -> None:
        """DM pra vítima de um roubo. Gente pode ter DM fechada ou ter
        bloqueado o bot: isso não pode derrubar o comando, só loga e segue."""
        try:
            await membro.send(f"🥷 Em **{guild_nome}**: {texto}")
        except (discord.Forbidden, discord.HTTPException):
            log.info("nao consegui mandar DM de aviso de roubo pra %s", membro.id)

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
        silencioso: bool = False,
    ) -> bool:
        view = DefesaRouboView(membro.id, timeout=timeout)
        emb = ui.embed(
            "🥷 Tentativa de roubo!",
            categoria="economia",
            cor=0xE67E22,
            descricao=(
                f"{interaction.user.mention} está tentando roubar {origem} de "
                f"{membro.mention}.\n\n{membro.mention}, você tem **{int(timeout)} segundos** "
                "para impedir no botão abaixo."
            ),
        )
        await interaction.response.send_message(
            content=None if silencioso else membro.mention,
            embed=emb,
            view=view,
            allowed_mentions=discord.AllowedMentions(
                users=not silencioso, roles=False, everyone=False
            ),
        )
        view.iniciar_prazo()
        await view.aguardar()
        view.desabilitar()
        if view.impedido:
            fim = ui.embed(
                "🛡️ Roubo impedido!",
                categoria="cofre",
                descricao=(
                    f"{membro.mention} percebeu a tentativa a tempo e barrou "
                    f"{interaction.user.mention}. O cooldown do ladrão foi consumido."
                ),
            )
        else:
            fim = ui.embed(
                "⌛ A defesa não veio a tempo",
                categoria="economia",
                descricao="Os 5 segundos acabaram. Resolvendo a tentativa…",
            )
        try:
            await interaction.edit_original_response(
                content=None, embed=fim, view=view
            )
        except discord.HTTPException:
            log.info("nao consegui atualizar a janela de defesa do roubo %s", interaction.id)
        return view.impedido

    @staticmethod
    async def _mostrar_resultado_roubo(
        interaction: discord.Interaction, emb: discord.Embed
    ) -> None:
        try:
            await interaction.edit_original_response(content=None, embed=emb, view=None)
        except discord.HTTPException:
            await interaction.followup.send(embed=emb)

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
            await interaction.response.send_message(embed=emb)

    @app_commands.command(description="Tenta roubar metade da carteira; o alvo tem 5 segundos para impedir.")
    @app_commands.describe(
        membro="De quem você quer roubar.",
        furtivo=f"Pague ☾ {economia.CUSTO_FURTIVIDADE} pra não avisar o alvo publicamente (padrão: não).",
    )
    async def roubar(self, interaction, membro: discord.Member, furtivo: Optional[bool] = False):
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

        # /setroubo cooldown_horas descreve "as regras de /roubar_cofre neste
        # servidor", mas o cooldown sempre valeu pros dois comandos — só
        # /roubar ignorava a configuração e usava a constante do código.
        cooldown_horas = db.get_config_roubo(sid)["cooldown_horas"]
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

            furtivo_aplicado = False
            if furtivo:
                try:
                    db.debitar(sid, uid, "Lunaris", economia.CUSTO_FURTIVIDADE)
                    db.registrar_extrato(sid, uid, -economia.CUSTO_FURTIVIDADE, "Lunaris", "Roubo furtivo (sem aviso à vítima)")
                    furtivo_aplicado = True
                except SaldoInsuficiente:
                    pass

            protecao = self._consumir_melhor_protecao(sid, alvo_id)
            if protecao == "cao_de_guarda":
                emb = ui.embed(
                    "🐕 Um Cão de Guarda latiu!",
                    categoria="erro",
                    descricao=(
                        f"{membro.mention} tinha um **Cão de Guarda** de prontidão: a tentativa de "
                        f"{interaction.user.mention} foi barrada antes mesmo de começar. O item foi consumido."
                    ),
                )
                await interaction.response.send_message(embed=emb)
                return
            timeout_defesa = (
                economia.DEFESA_ROUBO_TIMEOUT_ALARME
                if protecao == "alarme_magico"
                else economia.DEFESA_ROUBO_TIMEOUT_PADRAO
            )
            if await self._abrir_defesa_roubo(
                interaction, membro, "a carteira", timeout=timeout_defesa, silencioso=furtivo_aplicado
            ):
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
            linhas = [f"{interaction.user.mention} roubou ☾ **{valor} Lunaris** da carteira de {membro.mention}!"]
            recompensa = int(resultado["recompensa"]["valor"])
            if recompensa:
                linhas.append(f"🎯 {membro.mention} tinha recompensa na cabeça: {interaction.user.mention} coletou mais ☾ **{recompensa} Lunaris**!")
                try:
                    db.criar_aviso(sid, f"🎯 {membro.mention} foi capturado! {interaction.user.mention} coletou a recompensa.")
                except Exception:
                    log.exception("recompensa paga, mas o aviso nao foi enfileirado")
                try:
                    await cargos_mod.conceder_cacador(self.bot, interaction.guild, uid)
                    await cargos_mod.sincronizar_mais_procurado(self.bot)
                except Exception:
                    log.exception("falha ao sincronizar cargos dinamicos apos captura")
            emb = ui.embed("🥷 Roubo bem-sucedido!", categoria="economia", cor=0x2ECC71, descricao="\n".join(linhas))
            await self._mostrar_resultado_roubo(interaction, emb)
            await self._avisar_vitima(
                membro, interaction.guild.name,
                f"{interaction.user.display_name} roubou ☾ **{valor} Lunaris** da sua carteira. "
                "Guarde no cofre com `/cofre_depositar` pra ficar mais seguro.",
            )
        finally:
            try:
                db.liberar_alvo_roubo(sid, alvo_id, reserva_ate)
            except Exception:
                log.exception("nao consegui liberar a reserva de roubo de %s", alvo_id)

    @app_commands.command(description="Tenta arrombar um cofre; o alvo tem 5 segundos para impedir.")
    @app_commands.describe(
        membro="De quem você quer roubar o cofre.",
        furtivo=f"Pague ☾ {economia.CUSTO_FURTIVIDADE} pra não avisar o alvo publicamente (padrão: não).",
    )
    async def roubar_cofre(self, interaction, membro: discord.Member, furtivo: Optional[bool] = False):
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
        mestre_protegido = db.get_mestre_protegido(sid)
        if mestre_protegido == alvo_id:
            reservado, proxima = db.reservar_tentativa_roubo_cofre(
                sid,
                uid,
                agora,
                agora + timedelta(hours=cfg["cooldown_horas"]),
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
            reservado, proxima = db.reservar_tentativa_roubo_cofre(
                sid,
                uid,
                agora,
                agora + timedelta(hours=cfg["cooldown_horas"]),
            )
            if not reservado:
                await interaction.response.send_message(
                    f"🕒 Você já tentou arrombar um cofre recentemente. Espere mais {self._fmt_espera(proxima, agora)}.",
                    ephemeral=True,
                )
                return

            furtivo_aplicado = False
            if furtivo:
                try:
                    db.debitar(sid, uid, "Lunaris", economia.CUSTO_FURTIVIDADE)
                    db.registrar_extrato(sid, uid, -economia.CUSTO_FURTIVIDADE, "Lunaris", "Roubo furtivo (sem aviso à vítima)")
                    furtivo_aplicado = True
                except SaldoInsuficiente:
                    pass

            protecao = self._consumir_melhor_protecao(sid, alvo_id)
            if protecao == "cao_de_guarda":
                emb = ui.embed(
                    "🐕 Um Cão de Guarda latiu!",
                    categoria="erro",
                    descricao=(
                        f"{membro.mention} tinha um **Cão de Guarda** de prontidão: a tentativa de "
                        f"{interaction.user.mention} foi barrada antes mesmo de começar. O item foi consumido."
                    ),
                )
                await interaction.response.send_message(embed=emb)
                return
            timeout_defesa = (
                economia.DEFESA_ROUBO_TIMEOUT_ALARME
                if protecao == "alarme_magico"
                else economia.DEFESA_ROUBO_TIMEOUT_PADRAO
            )
            if await self._abrir_defesa_roubo(
                interaction, membro, "o cofre", timeout=timeout_defesa, silencioso=furtivo_aplicado
            ):
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
            chance = economia.chance_roubo_cofre(seg_tier, cfg["chance_base"])

            if random.random() < chance:
                try:
                    resultado = db.executar_roubo_cofre(
                        sid,
                        uid,
                        alvo_id,
                        interaction.user.display_name,
                        membro.display_name,
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
                linhas = [f"{interaction.user.mention} arrombou o cofre de {membro.mention} e levou ☾ **{valor} Lunaris**!"]
                recompensa = int(resultado["recompensa"]["valor"])
                if recompensa:
                    linhas.append(f"🎯 {membro.mention} tinha recompensa na cabeça: {interaction.user.mention} coletou mais ☾ **{recompensa} Lunaris**!")
                    try:
                        db.criar_aviso(sid, f"🎯 {membro.mention} foi capturado! {interaction.user.mention} coletou a recompensa.")
                    except Exception:
                        log.exception("recompensa paga, mas o aviso nao foi enfileirado")
                    try:
                        await cargos_mod.conceder_cacador(self.bot, interaction.guild, uid)
                        await cargos_mod.sincronizar_mais_procurado(self.bot)
                    except Exception:
                        log.exception("falha ao sincronizar cargos dinamicos apos captura")
                emb = ui.embed("🥷 Cofre arrombado!", categoria="economia", cor=0x2ECC71, descricao="\n".join(linhas))
                await self._mostrar_resultado_roubo(interaction, emb)
                await self._avisar_vitima(
                    membro, interaction.guild.name,
                    f"{interaction.user.display_name} arrombou seu cofre e levou ☾ **{valor} Lunaris** guardados. "
                    "Considere melhorar a segurança com `/cofre_seguranca_melhorar`.",
                )
                return

            percentual_multa = random.uniform(economia.ROUBO_MULTA_PERCENT_MIN, economia.ROUBO_MULTA_PERCENT_MAX)
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
        finally:
            try:
                db.liberar_alvo_roubo(sid, alvo_id, reserva_ate)
            except Exception:
                log.exception("nao consegui liberar a reserva de roubo de %s", alvo_id)

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
        emb.add_field(name="Crédito", value=f"{c['credito']}: {benef['rotulo']}", inline=False)
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
            rodape += f" · Próximo: {prox['nome']} (limite {prox['limite']}): ☾ {prox['custo']} · /cartao_melhorar"
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
            emb.add_field(name=f"{b['nome']}: ☾ {b['preco']} Lunaris",
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
                ganhos.append(f"**{it.titulo}** ({it.raridade_rotulo})")
            else:
                ganhos.append(f"~~{it.titulo}~~: cofre cheio! (`/cofre_melhorar`)")
        return ganhos

    async def _abrir_um_bau(self, interaction, sid: str, uid: str, b: dict, indice: int = 0):
        """Sorteia e entrega o prêmio de UM baú (já removido do estoque de
        quem chamou). Devolve (ganhos, destino, ok, lunaris). ok=False = a
        entrega central falhou de um jeito recuperável; o baú já foi
        devolvido ao estoque e o chamador deve avisar o jogador.

        `indice` distingue baús abertos na MESMA interação (/abrir_todos
        chama isto várias vezes com o mesmo interaction.id): sem ele, dois
        baús iguais que sorteiam o mesmo Lunaris geram chave idêntica, a
        plataforma deduplica o segundo depósito e o bot conta como aberto
        mesmo assim: o jogador perde o loot em silêncio."""
        db = self.bot.db
        premio = loot_mod.sortear_bau(self.bot.catalogo, qtd_itens=b["itens"], rng=random,
                                      pesos=b["pesos"], lunaris_min=b["lunaris_min"], lunaris_max=b["lunaris_max"], tipos=b.get("tipos"))
        ganhos = [f"☾ {premio['lunaris']} Lunaris"]
        ganhos.extend(f"**{it.titulo}** ({it.raridade_rotulo})" for it in premio["itens"])
        destino = "cofre da sua conta no site"
        if self.bot.platform is not None:
            try:
                await self.bot.platform.deposit_vault(
                    discord_user_id=interaction.user.id,
                    discord_guild_id=interaction.guild_id,
                    idempotency_key=f"bau-comprado:{interaction.id}:{indice}:{b['id']}:{premio['lunaris']}",
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
        falhas = 0
        abertos = 0
        indice = 0
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
                ganhos, _destino, ok, lunaris = await self._abrir_um_bau(interaction, sid, uid, b, indice)
                indice += 1
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
            linhas.append(f"Você tinha mais baús do que o limite de {economia.ABRIR_TODOS_LIMITE} por vez: rode `/abrir_todos` de novo pro resto.")
        emb = ui.embed("🎁 Baús abertos!", categoria="bau", descricao="\n".join(linhas))
        await interaction.followup.send(embed=emb)



async def setup(bot):
    await bot.add_cog(Economia(bot))
