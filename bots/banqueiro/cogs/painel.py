"""Cog Painel: `/banco`, o painel único do Banco Lunar.

Um comando só abre uma mensagem privada com o resumo da conta, avisos do que
pede atenção e do que está acontecendo no servidor (baús no ar, loteria,
eventos do Mestre) e um menu que leva a todas as telas de consulta. Cada tela
reaproveita o comando que já existe (core/painel.py), então nada é duplicado.

Os comandos antigos continuam funcionando; o painel é um caminho a mais, e
libera espaço no limite de 100 comandos do Discord quando for hora de aposentar
os de consulta (o Banqueiro está em 97 com este).
"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone
from typing import Optional

import discord
from discord import app_commands
from discord.ext import commands

from core import cassino as cassino_mod
from core import economia
from core import ui
from core.painel import Acao, InteracaoEfemera, ModalQuantia, PainelView, Secao, chamar_comando

log = logging.getLogger("banqueiro")

EMOJI_EVENTO = {"aviso": "📢", "mercado": "💹", "festival": "🎉", "perigo": "⚠️"}

# (chave, rótulo, emoji, descrição, comando)
SECOES = (
    ("carteira", "Carteira", "💰", "Saldos, cofre, cartão e dívidas num lugar só", "carteira"),
    ("cartao", "Cartão Lunar", "💳", "Nível, limite e como ganhar reputação", "cartao"),
    ("cofre", "Cofre", "🔒", "Itens e dinheiro guardados, segurança", "cofre"),
    ("cofre_melhorias", "Melhorias do cofre", "⬆️", "Próximos upgrades e quanto custam", "cofre_melhorias"),
    ("extrato", "Extrato", "📜", "Histórico das suas transações", "extrato"),
    ("inventario", "Inventário", "🎒", "Seus itens", "inventario"),
    ("fatura", "Faturas", "🧾", "Compras financiadas e vencimentos", "fatura"),
    ("divida", "Dívida", "📋", "Sua situação de dívida e se está procurado", "divida"),
    ("emprestimos", "Empréstimos", "🤝", "O que você deve e o que te devem", "emprestimos_ver"),
    ("procurados", "Procurados", "🎯", "Quem tem recompensa na cabeça", "recompensa_ver"),
    ("loja_baus", "Loja de baús", "🛒", "Baús que dá para comprar", "loja_baus"),
    ("meus_baus", "Meus baús", "🎁", "Baús que você comprou e ainda não abriu", "meus_baus"),
    ("leiloes", "Leilões", "🔨", "Leilões ativos no servidor", "leilao_ver"),
    ("mercado_negro", "Mercado Negro", "🕳️", "Preços do contrabandista de hoje", "mercado_negro"),
    ("encomendas", "Encomendas", "📦", "Seus pedidos ao contrabandista", "mercado_negro_encomendas"),
    ("cambio", "Câmbio", "💱", "Taxa atual entre as moedas", "cambio_ver"),
    ("investimentos", "Títulos do Jardim", "📈", "Seus investimentos ativos", "investir_ver"),
    ("loteria", "Loteria Dominical", "🎟️", "Tamanho do bolo do sorteio de domingo", "loteria_bolo"),
    ("cofre_jardim", "Cofre do Jardim", "🏛️", "A meta coletiva do servidor: doe e acompanhe", None),
    ("chaves", "Chaves do Jardim", "🗝️", "Compre Chaves que abrem o fundo falso dos baús", None),
    ("salao", "Salão do Banco Lunar", "🎰", "Abrir o salão de jogos", "cassino abrir"),
    ("mandato", "Mandato semanal", "🗓️", "Progresso das atividades da semana", "cassino contratos"),
    ("mandato_resgatar", "Resgatar mandato", "🏅", "Pega a recompensa do mandato concluído", "cassino contrato_resgatar"),
    ("corrida", "Corrida das Árvores", "🏁", "Apostas abertas e bolo atual", "cassino corrida"),
    ("ranking", "Ranking", "🏆", "Quem está no topo do servidor", "ranking"),
)


def coletar_resumo(db, sid: str, uid: str) -> dict:
    """Junta, de forma síncrona, tudo que o início do painel mostra. Cada
    bloco que não é essencial falha sozinho: o painel abre mesmo sem ele."""
    db.garantir_jogador(sid, uid)
    r: dict = {
        "carteira": db.get_carteira(sid, uid),
        "cofre": db.get_cofre_saldo(sid, uid),
    }
    cartao = db.get_cartao(sid, uid)
    divida = db.get_divida(sid, uid)
    faturas = db.get_total_faturas_pendentes(sid, uid)
    tier = economia.cartao_por_id(cartao["tier"]) or economia.cartao_por_id(economia.CARTAO_TIER_INICIAL)
    r.update(
        cartao_nome=tier["nome"],
        reputacao=cartao["credito"],
        reputacao_rotulo=economia.beneficios_reputacao(cartao["credito"])["rotulo"],
        limite_total=economia.limite_efetivo(cartao["tier"], cartao["credito"]),
        limite_disponivel=economia.limite_disponivel(cartao["tier"], cartao["credito"], divida, faturas),
        divida=divida,
        faturas_total=faturas,
    )

    def tentar(nome, funcao, padrao):
        try:
            return funcao()
        except Exception:
            log.exception("painel: falha ao coletar %s", nome)
            return padrao

    r["proxima_fatura"] = tentar(
        "faturas",
        lambda: min((f["vence_em"] for f in db.listar_faturas_pendentes(sid, uid)), default=None),
        None,
    )
    r["recompensa"] = tentar("recompensa", lambda: db.get_recompensa(sid, uid), {"valor": 0, "tem_sistema": False})
    r["bilhetes_meus"] = tentar("bilhetes", lambda: db.meus_bilhetes_loteria(sid, uid), 0)
    r["bilhetes_total"] = tentar(
        "bilhetes do servidor", lambda: sum(b["quantidade"] for b in db.listar_bilhetes_loteria(sid)), 0
    )
    r["baus"] = tentar("baus no ar", lambda: db.baus_no_ar_para(sid, uid), [])
    r["meta"] = tentar("meta", lambda: db.get_meta_ativa(sid), None)
    r["leilao_casa"] = tentar(
        "leilao da casa",
        lambda: next((l for l in db.listar_leiloes_ativos(sid) if l.get("modo_posse") == "casa"), None),
        None,
    )
    r["chaves"] = tentar("chaves", lambda: db.get_chaves(sid, uid), {"quantidade": 0, "auto_usar": True})
    r["eventos"] = tentar("eventos", lambda: db.listar_eventos_ativos(sid), [])
    r["mandato"] = tentar(
        "mandato", lambda: db.resumo_contrato(sid, uid, cassino_mod.semana_local()), None
    )
    return r


def _caber_em_campo(linhas: list, limite: int = 1024) -> str:
    """`linhas` é [(prioridade, texto)], com menor número = mais importante. Tira linhas INTEIRAS, das
    menos importantes para as mais, até caber no campo (cortar no meio quebraria um <t:...:R>)."""
    atuais = list(linhas)

    def juntar() -> str:
        return "\n".join(texto for _, texto in atuais)

    while len(juntar()) > limite and len(atuais) > 1:
        atuais.pop(max(range(len(atuais)), key=lambda i: (atuais[i][0], i)))
    return juntar()[:limite]


def montar_embed_inicio(nome: str, dados: dict) -> discord.Embed:
    """Tela inicial. Função pura sobre o dicionário de `coletar_resumo`."""
    from cogs.economia import fmt_carteira  # evita ciclo na importação dos cogs

    emb = ui.embed(f"🏦 Banco Lunar · {nome}", categoria="economia", descricao=fmt_carteira(dados["carteira"]))
    emb.add_field(
        name="🔒 Guardado no cofre",
        value=fmt_carteira(dados["cofre"], vazio="nada guardado"),
        inline=False,
    )
    emb.add_field(
        name="💳 Cartão Lunar",
        value=(
            f"**{dados['cartao_nome']}** · limite disponível ☾ **{dados['limite_disponivel']} / {dados['limite_total']}**\n"
            f"🏦 Reputação bancária: **{dados['reputacao']}** · {dados['reputacao_rotulo']}"
        ),
        inline=False,
    )

    chaves = dados.get("chaves") or {}
    if chaves.get("quantidade", 0) > 0:
        emb.add_field(
            name="🗝️ Chaves do Jardim",
            value=(
                f"**{chaves['quantidade']}** · uso automático "
                + ("ligado: a próxima é gasta num baú Incomum ou melhor." if chaves.get("auto_usar") else "desligado.")
            ),
            inline=False,
        )

    atencao = []
    if dados.get("divida", 0) > 0:
        atencao.append(f"📋 Dívida de ☾ **{dados['divida']}**: pague com `/divida_pagar` antes que cresça.")
    if dados.get("faturas_total", 0) > 0 and dados.get("proxima_fatura"):
        atencao.append(
            f"🧾 Fatura de ☾ **{dados['faturas_total']}** vence <t:{int(dados['proxima_fatura'].timestamp())}:R>."
        )
    recompensa = dados.get("recompensa") or {}
    if recompensa.get("valor", 0) > 0:
        atencao.append(
            f"🎯 Há ☾ **{recompensa['valor']}** de recompensa na sua cabeça"
            + (" 🚨 (procurado pelo Banco)." if recompensa.get("tem_sistema") else ".")
        )
    mandato = dados.get("mandato")
    if mandato and not mandato["resgatado"] and mandato["quantidade"] >= mandato["necessarios"]:
        atencao.append("🏅 Seu **mandato semanal** está pronto: abra *Resgatar mandato* no menu.")
    if atencao:
        emb.add_field(name="⚠️ Pede atenção", value="\n".join(atencao)[:1024], inline=False)

    agora_linhas = []
    for bau in (dados.get("baus") or [])[:3]:
        icone = ui.icone_raridade(bau.get("raridade") or "comum")
        quando = f"<t:{int(bau['expira_em'].timestamp())}:R>"
        if bau.get("coletivo"):
            situacao = "✅ você já pegou o seu" if bau.get("ja_peguei") else "pegue o seu!"
        else:
            situacao = "corrida do enigma"
        agora_linhas.append(
            (4, f"{icone} **{bau.get('nome') or 'Baú'}** em <#{bau['canal_id']}> · {situacao} · some {quando}")
        )
    if dados.get("bilhetes_total") or dados.get("bilhetes_meus"):
        agora_linhas.append((
            3,
            f"🎟️ Loteria de domingo: **{dados['bilhetes_total']}** bilhete(s) vendido(s)"
            f" · seus: **{dados['bilhetes_meus']}**",
        ))
    meta = dados.get("meta")
    if meta:
        agora_linhas.append((
            2,
            f"🏛️ Cofre do Jardim: **{meta['titulo']}** · {ui.barra(meta['arrecadado'], meta['alvo'])} "
            f"· até <t:{int(meta['prazo'].timestamp())}:R>",
        ))
    leilao_casa = dados.get("leilao_casa")
    if leilao_casa:
        agora_linhas.append((
            1,
            f"🔨 Leilão do Jardim: **{leilao_casa['titulo']}** · "
            + (f"lance em ☾ {leilao_casa['lance_atual']}" if leilao_casa.get("lance_atual") else "sem lances")
            + f" · encerra <t:{int(leilao_casa['expira_em'].timestamp())}:R>",
        ))
    for ev in (dados.get("eventos") or [])[:3]:
        emoji = EMOJI_EVENTO.get(ev.get("tipo"), "📢")
        agora_linhas.append((0, f"{emoji} **{ev['titulo']}** · até <t:{int(ev['expira_em'].timestamp())}:R>"))
    emb.add_field(
        name="🌿 Acontecendo agora",
        value=_caber_em_campo(agora_linhas) if agora_linhas else "Nada de especial no momento.",
        inline=False,
    )
    emb.set_footer(text=f"{ui.MARCA} · Use o menu abaixo para abrir qualquer tela")
    return emb


def embed_chaves(estado: dict, lunaris: int, aviso: str = "") -> discord.Embed:
    """Tela da loja de Chaves. Função pura."""
    emb = ui.embed(
        "🗝️ Chaves do Jardim",
        categoria="economia",
        descricao=(
            "Uma Chave abre o **fundo falso** de um baú: **+50% de Lunaris e um item extra**. "
            "Ela é gasta sozinha no próximo baú **Incomum ou melhor** que você pegar (nunca no Comum) "
            "e nunca é exigida para abrir nada."
            + (f"\n\n{aviso}" if aviso else "")
        ),
    )
    emb.add_field(
        name="Você tem", value=f"**{estado['quantidade']}** de {economia.CHAVES_MAX}", inline=True
    )
    emb.add_field(name="Preço", value=f"☾ **{economia.CHAVE_PRECO}** cada", inline=True)
    emb.add_field(name="Sua carteira", value=f"☾ **{lunaris}** Lunaris", inline=True)
    emb.add_field(
        name="Uso automático",
        value="Ligado" if estado["auto_usar"] else "Desligado (as Chaves ficam guardadas)",
        inline=True,
    )
    emb.add_field(
        name="Onde mais achar",
        value="Quem vence um baú Raro ou melhor leva uma Chave. Nos baús coletivos há uma pequena chance.",
        inline=False,
    )
    return emb


def embed_meta(meta, doadores: list, lunaris: int, aviso: str = "", ultima=None) -> discord.Embed:
    """Tela do Cofre do Jardim. Função pura."""
    if not meta:
        texto = "Nenhuma meta aberta agora. Quando o Mestre abrir uma, ela aparece aqui e no jornal."
        if ultima:
            estado = {
                "concluida": "foi **batida** 🎉", "expirada": "não foi batida (as doações voltaram)",
                "cancelada": "foi cancelada (as doações voltaram)",
            }.get(ultima["status"], "terminou")
            texto += f"\n\nA última, **{ultima['titulo']}**, {estado}."
        return ui.embed("🏛️ Cofre do Jardim", categoria="economia", descricao=(texto + (f"\n\n{aviso}" if aviso else "")))
    descricao = meta["descricao"] or "Uma meta de todos: cada Lunaris doado conta."
    if meta["recompensa"]:
        descricao += f"\n\n🎁 **Se a meta for batida:** {meta['recompensa']}"
    if int(meta["festival_horas"]) > 0:
        descricao += f"\n🎉 Abre um **festival de {int(meta['festival_horas'])}h** com baús muito mais generosos."
    descricao += "\n\nSe o prazo acabar sem bater a meta, **todo mundo recebe de volta** o que doou."
    if aviso:
        descricao += f"\n\n{aviso}"
    emb = ui.embed(f"🏛️ Cofre do Jardim: {meta['titulo']}", categoria="economia", descricao=descricao)
    falta = int(meta["alvo"]) - int(meta["arrecadado"])
    emb.add_field(
        name="Progresso",
        value=f"{ui.barra(meta['arrecadado'], meta['alvo'])}\nFaltam ☾ **{falta}** Lunaris.",
        inline=False,
    )
    emb.add_field(name="Prazo", value=f"<t:{int(meta['prazo'].timestamp())}:R>", inline=True)
    emb.add_field(name="Sua carteira", value=f"☾ **{lunaris}**", inline=True)
    if doadores:
        emb.add_field(
            name="Quem mais doou",
            value="\n".join(f"{i + 1}. <@{d['user_id']}>: ☾ {d['total']}" for i, d in enumerate(doadores)),
            inline=False,
        )
    return emb


class ViewMeta(discord.ui.View):
    """Doações rápidas (10 e 50) e um modal para outro valor."""

    def __init__(self, cog: "Painel", autor_id: int, ativa: bool):
        super().__init__(timeout=600)
        self.cog = cog
        self.autor_id = autor_id
        self.dez = discord.ui.Button(label="Doar ☾10", emoji="🏛️", style=discord.ButtonStyle.success, row=0)
        self.cinquenta = discord.ui.Button(label="Doar ☾50", emoji="🏛️", style=discord.ButtonStyle.success, row=0)
        self.outro = discord.ui.Button(label="Outro valor", emoji="✍️", style=discord.ButtonStyle.secondary, row=0)
        self.dez.callback = lambda i: self._doar(i, 10)
        self.cinquenta.callback = lambda i: self._doar(i, 50)
        self.outro.callback = self._modal
        for botao in (self.dez, self.cinquenta, self.outro):
            botao.disabled = not ativa
            self.add_item(botao)

    async def interaction_check(self, interaction: discord.Interaction) -> bool:
        if interaction.user.id != self.autor_id:
            await interaction.response.send_message("Esse painel é de outra pessoa.", ephemeral=True)
            return False
        return True

    async def _doar(self, interaction: discord.Interaction, valor: int) -> None:
        await interaction.response.defer()
        aviso = await self.cog.executar_doacao(str(interaction.guild_id), str(interaction.user.id), valor)
        embed = await self.cog.montar_embed_meta(str(interaction.guild_id), str(interaction.user.id), aviso)
        meta_ativa = await asyncio.to_thread(self.cog.bot.db.get_meta_ativa, str(interaction.guild_id))
        for botao in (self.dez, self.cinquenta, self.outro):
            botao.disabled = meta_ativa is None
        await interaction.edit_original_response(embed=embed, view=self)

    async def _modal(self, interaction: discord.Interaction) -> None:
        async def enviado(inter: discord.Interaction, valor: int) -> None:
            aviso = await self.cog.executar_doacao(str(inter.guild_id), str(inter.user.id), valor)
            await inter.response.send_message(
                embed=await self.cog.montar_embed_meta(str(inter.guild_id), str(inter.user.id), aviso),
                ephemeral=True,
            )

        await interaction.response.send_modal(ModalQuantia("Doar ao Cofre do Jardim", "Quantos Lunaris doar?", enviado))


class ViewChaves(discord.ui.View):
    """Compra e liga/desliga o uso automático. Os botões são fixos e só mudam
    de rótulo, para o botão de volta ao início do painel continuar no lugar."""

    def __init__(self, cog: "Painel", autor_id: int, estado: dict):
        super().__init__(timeout=600)
        self.cog = cog
        self.autor_id = autor_id
        self.comprar1 = discord.ui.Button(style=discord.ButtonStyle.success, emoji="🗝️", row=0)
        self.comprar3 = discord.ui.Button(style=discord.ButtonStyle.success, emoji="🗝️", row=0)
        self.alternar = discord.ui.Button(row=0)
        self.comprar1.callback = lambda i: self._comprar(i, 1)
        self.comprar3.callback = lambda i: self._comprar(i, 3)
        self.alternar.callback = self._alternar
        for botao in (self.comprar1, self.comprar3, self.alternar):
            self.add_item(botao)
        self.atualizar(estado)

    def atualizar(self, estado: dict) -> None:
        tem = estado["quantidade"]
        self.comprar1.label = f"Comprar 1 (☾{economia.CHAVE_PRECO})"
        self.comprar3.label = f"Comprar 3 (☾{economia.CHAVE_PRECO * 3})"
        self.comprar1.disabled = tem + 1 > economia.CHAVES_MAX
        self.comprar3.disabled = tem + 3 > economia.CHAVES_MAX
        ligado = estado["auto_usar"]
        self.alternar.label = "Uso automático: ligado" if ligado else "Uso automático: desligado"
        self.alternar.style = discord.ButtonStyle.primary if ligado else discord.ButtonStyle.secondary

    async def interaction_check(self, interaction: discord.Interaction) -> bool:
        if interaction.user.id != self.autor_id:
            await interaction.response.send_message("Esse painel é de outra pessoa.", ephemeral=True)
            return False
        return True

    async def _recarregar(self, interaction: discord.Interaction, aviso: str = "") -> None:
        sid, uid = str(interaction.guild_id), str(interaction.user.id)
        estado = await asyncio.to_thread(self.cog.bot.db.get_chaves, sid, uid)
        carteira = await asyncio.to_thread(self.cog.bot.db.get_carteira, sid, uid)
        self.atualizar(estado)
        await interaction.edit_original_response(
            embed=embed_chaves(estado, int(carteira.get("Lunaris", 0)), aviso), view=self
        )

    async def _comprar(self, interaction: discord.Interaction, quantidade: int) -> None:
        await interaction.response.defer()
        sid, uid = str(interaction.guild_id), str(interaction.user.id)
        resultado = await asyncio.to_thread(
            self.cog.bot.db.comprar_chaves, sid, uid, quantidade, economia.CHAVE_PRECO, economia.CHAVES_MAX,
        )
        if resultado["status"] == "ok":
            aviso = f"✅ Você comprou {quantidade} Chave(s) por ☾ {resultado['custo']}."
        elif resultado["status"] == "saldo":
            aviso = f"💸 Faltam Lunaris: {quantidade} Chave(s) custam ☾ {resultado['custo']}."
        else:
            aviso = f"🗝️ Você já está no limite de {economia.CHAVES_MAX} Chaves."
        await self._recarregar(interaction, aviso)

    async def _alternar(self, interaction: discord.Interaction) -> None:
        await interaction.response.defer()
        sid, uid = str(interaction.guild_id), str(interaction.user.id)
        atual = await asyncio.to_thread(self.cog.bot.db.get_chaves, sid, uid)
        await asyncio.to_thread(self.cog.bot.db.set_chaves_auto, sid, uid, not atual["auto_usar"])
        await self._recarregar(interaction)


class Painel(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    async def executar_doacao(self, sid: str, uid: str, valor: int) -> str:
        """Doa e devolve a frase para o jogador. Nunca levanta por erro de negócio."""
        try:
            r = await asyncio.to_thread(self.bot.db.doar_meta, sid, uid, valor)
        except Exception:
            log.exception("painel: falha ao doar ao Cofre do Jardim")
            return "⚠️ Não consegui registrar a doação. Tente de novo."
        if r["status"] == "sem_meta":
            return "⌛ Essa meta já terminou."
        if r["status"] == "saldo":
            return f"💸 Faltam Lunaris: a doação seria de ☾ {r['valor']}."
        texto = f"✅ Você doou ☾ **{r['valor']}** ao Cofre do Jardim."
        if r["valor"] < valor:
            texto += " (Só faltava isso para a meta.)"
        if r["concluida"]:
            texto += "\n🎉 **A meta foi batida!** O anúncio sai no jornal."
        return texto

    async def montar_embed_meta(self, sid: str, uid: str, aviso: str = "") -> discord.Embed:
        db = self.bot.db
        meta = await asyncio.to_thread(db.get_meta_ativa, sid)
        doadores = await asyncio.to_thread(db.top_doadores, meta["id"]) if meta else []
        ultima = None if meta else await asyncio.to_thread(db.get_ultima_meta_encerrada, sid)
        carteira = await asyncio.to_thread(db.get_carteira, sid, uid)
        return embed_meta(meta, doadores, int(carteira.get("Lunaris", 0)), aviso, ultima)

    async def _tela_meta(self, ctx) -> None:
        sid, uid = str(ctx.guild_id), str(ctx.user.id)
        embed = await self.montar_embed_meta(sid, uid)
        meta = await asyncio.to_thread(self.bot.db.get_meta_ativa, sid)
        await ctx.response.send_message(embed=embed, view=ViewMeta(self, ctx.user.id, meta is not None))

    async def _tela_chaves(self, ctx) -> None:
        sid, uid = str(ctx.guild_id), str(ctx.user.id)
        estado = await asyncio.to_thread(self.bot.db.get_chaves, sid, uid)
        carteira = await asyncio.to_thread(self.bot.db.get_carteira, sid, uid)
        await ctx.response.send_message(
            embed=embed_chaves(estado, int(carteira.get("Lunaris", 0))),
            view=ViewChaves(self, ctx.user.id, estado),
        )

    async def _pontuar(self, interaction: discord.Interaction) -> None:
        """Abrir uma tela pelo painel rende o mesmo ponto de reputação que o
        comando equivalente renderia (ver ArvoreComandosBanqueiro)."""
        if not interaction.guild_id:
            return
        try:
            await asyncio.to_thread(
                self.bot.db.adicionar_reputacao,
                str(interaction.guild_id), str(interaction.user.id),
                economia.REPUTACAO_POR_COMANDO,
            )
        except Exception:
            log.exception("painel: falha ao registrar reputacao")

    def _secoes(self) -> list[Secao]:
        telas = {"chaves": self._tela_chaves, "cofre_jardim": self._tela_meta}

        def fazer(chave: str, comando: Optional[str]):
            async def executar(ctx):
                await self._pontuar(ctx)
                if comando is None:
                    await telas[chave](ctx)
                else:
                    await chamar_comando(self.bot, comando, ctx)

            return executar

        return [
            Secao(chave, rotulo, emoji, descricao, fazer(chave, comando))
            for chave, rotulo, emoji, descricao, comando in SECOES
        ]

    async def _inicio(self, interaction: discord.Interaction) -> discord.Embed:
        dados = await asyncio.to_thread(
            coletar_resumo, self.bot.db, str(interaction.guild_id), str(interaction.user.id)
        )
        return montar_embed_inicio(interaction.user.display_name, dados)

    # ── Ações rápidas (abrem um modal; o comando faz o resto) ───────────────
    async def _abrir_modal_cofre(self, interaction: discord.Interaction, comando: str, titulo: str, rotulo: str):
        async def enviado(inter: discord.Interaction, quantia: int) -> None:
            await chamar_comando(self.bot, comando, InteracaoEfemera(inter), quantia=quantia, moeda=None)

        await interaction.response.send_modal(ModalQuantia(titulo, rotulo, enviado))

    async def _acao_depositar(self, interaction: discord.Interaction) -> None:
        await self._abrir_modal_cofre(interaction, "cofre_depositar", "Guardar no cofre", "Quantos Lunaris guardar?")

    async def _acao_sacar(self, interaction: discord.Interaction) -> None:
        await self._abrir_modal_cofre(interaction, "cofre_sacar", "Sacar do cofre", "Quantos Lunaris sacar?")

    async def _acao_bilhetes(self, interaction: discord.Interaction) -> None:
        async def enviado(inter: discord.Interaction, quantidade: int) -> None:
            sid, uid = str(inter.guild_id), str(inter.user.id)
            antes = await asyncio.to_thread(self.bot.db.meus_bilhetes_loteria, sid, uid)
            await chamar_comando(self.bot, "loteria_comprar", InteracaoEfemera(inter), quantidade=quantidade)
            depois = await asyncio.to_thread(self.bot.db.meus_bilhetes_loteria, sid, uid)
            if depois > antes:  # a compra passou: conta para o mandato semanal
                await asyncio.to_thread(
                    self.bot.db.registrar_atividade_contrato,
                    sid, uid, cassino_mod.semana_local(), "comercio",
                )

        await interaction.response.send_modal(
            ModalQuantia("Bilhetes da loteria", "Quantos bilhetes (1 a 100)?", enviado, minimo=1, maximo=100)
        )

    def _acoes(self) -> list[Acao]:
        return [
            Acao("Guardar", "💰", self._acao_depositar, discord.ButtonStyle.success),
            Acao("Sacar", "🏧", self._acao_sacar),
            Acao("Bilhetes", "🎟️", self._acao_bilhetes),
        ]

    @app_commands.command(
        name="banco",
        description="Abre o painel do Banco Lunar: sua conta, avisos e tudo que acontece no servidor.",
    )
    @app_commands.guild_only()
    async def banco(self, interaction: discord.Interaction):
        view = PainelView(
            autor_id=interaction.user.id,
            secoes=self._secoes(),
            inicio=self._inicio,
            acoes=self._acoes(),
        )
        await view.abrir(interaction)


async def setup(bot):
    await bot.add_cog(Painel(bot))
