"""Cog Painel: `/jardim`, o painel do Jornal Lunar.

Uma mensagem privada com o que importa agora para quem joga: estação e clima,
horóscopo do dia, baús no ar, eventos do Mestre e avisos pessoais (um furo
sobre você, uma entrevista esperando). O menu leva a cada tela e três botões
fazem as ações rápidas (classificado, vender furo, entrar/sair das entrevistas).
As telas reaproveitam os comandos que já existem (core/painel.py).
"""

from __future__ import annotations

import asyncio
import logging
from typing import Optional

import discord
from discord import app_commands
from discord.ext import commands

from core import arvores as arvores_mod
from core import colecao as colecao_mod
from core import economia
from core import furos as furos_mod
from core import ui
from cogs.jornal import barra_meta, embed_meta_anuncio
from core.db import CLASSIFICADO_CATEGORIAS, CLASSIFICADO_VALOR_MINIMO
from core.painel import Acao, InteracaoEfemera, PainelView, Secao, chamar_comando, ler_inteiro

log = logging.getLogger("jornalista")

EMOJI_EVENTO = {"aviso": "📢", "mercado": "💹", "festival": "🎉", "perigo": "⚠️"}
EFEITO_DO_CLIMA = {
    "inflacao_loja": "Loja e Mercado Negro **20% mais caros**.",
    "deflacao_loja": "**15% de desconto** na Loja.",
}

# (chave, rótulo, emoji, descrição, comando | None para tela própria)
SECOES = (
    ("estacao", "Estação do Jardim", "🍂", "Estação atual e como ela mexe nos baús", "estacao"),
    ("horoscopo", "Horóscopo do dia", "🔮", "A Árvore das estrelas hoje e o bônus nos baús", "horoscopo"),
    ("baus", "Baús de hoje", "🎁", "O que apareceu hoje e as suas Pistas de Sorte", "baus_hoje"),
    ("cofre", "Cofre do Jardim", "🏛️", "A meta coletiva do servidor e como doar", None),
    ("colecao", "Coleção das Árvores", "📚", "Fragmentos, páginas reveladas e Afinidade", None),
    ("eventos", "Eventos do Mestre", "📢", "O que o Mestre anunciou e ainda vale", None),
    ("conquistas", "Meus títulos secretos", "🏅", "Títulos que você já descobriu", "conquistas"),
)


def coletar_resumo(db, gid: str, uid: str) -> dict:
    """Tudo que o início do painel mostra. Blocos secundários falham sozinhos."""

    def tentar(nome, funcao, padrao):
        try:
            return funcao()
        except Exception:
            log.exception("painel: falha ao coletar %s", nome)
            return padrao

    return {
        "estacao": tentar("estacao", lambda: db.get_estacao(gid), economia.ESTACAO_PADRAO),
        "clima": tentar("clima", lambda: db.get_modificador_clima(gid), None),
        "horoscopo": tentar("horoscopo", lambda: db.get_horoscopo(gid), None)
        if db.automacao_ativa(gid, "horoscopo", True) else None,
        "cargos_arvore": tentar("cargos das arvores", lambda: db.get_cargos_arvore(gid), {}),
        "baus_no_ar": tentar("baus no ar", lambda: db.baus_no_ar_para(gid, uid), []),
        "baus_hoje": tentar("baus de hoje", lambda: len(db.listar_baus_do_dia(gid)), 0),
        "pistas": tentar("pistas", lambda: db.get_pistas(gid, uid), 0),
        "chaves": tentar("chaves", lambda: db.get_chaves(gid, uid), {"quantidade": 0, "auto_usar": True}),
        "colecao": tentar("colecao", lambda: db.get_colecao(gid, uid), {})
        if db.automacao_ativa(gid, "colecao", True) else None,
        "eventos": tentar("eventos", lambda: db.listar_eventos_ativos(gid), []),
        "meta": tentar("meta", lambda: db.get_meta_ativa(gid), None),
        "furo": tentar("furo", lambda: db.get_fofoca_pendente_usuario(gid, uid), None),
        "entrevista": tentar("entrevista", lambda: db.entrevista_pendente_do_usuario(uid, gid), None),
        "fora_das_entrevistas": tentar("preferencia", lambda: uid in set(db.usuarios_fora_das_entrevistas(gid)), False),
        "bilhetes_total": tentar(
            "loteria", lambda: sum(b["quantidade"] for b in db.listar_bilhetes_loteria(gid)), 0
        ),
    }


def montar_embed_inicio(nome: str, dados: dict, cargos_do_jogador: frozenset = frozenset()) -> discord.Embed:
    """Tela inicial. Função pura sobre o dicionário de `coletar_resumo`.
    `cargos_do_jogador` são os ids de cargo (texto) de quem abriu o painel."""
    info = economia.estacao_info(dados["estacao"])
    texto_estacao = f"**{info['rotulo']}**: {info['descricao']}"
    efeito = EFEITO_DO_CLIMA.get(dados.get("clima") or "")
    if efeito:
        texto_estacao += f"\n{efeito}"
    emb = ui.embed(f"🌿 Jornal Lunar · {nome}", categoria="noticia", descricao=texto_estacao)

    arvore = arvores_mod.obter(dados["horoscopo"]) if dados.get("horoscopo") else None
    if arvore is not None:
        cargo_id = (dados.get("cargos_arvore") or {}).get(arvore.id)
        linha = f"As estrelas sorriem para **{arvore.nome}**."
        if cargo_id and cargo_id in cargos_do_jogador:
            linha += " Você carrega essa Árvore: seus baús de hoje valem **o dobro em Lunaris**."
        emb.add_field(name="🔮 Horóscopo do dia", value=linha, inline=False)

    baus = []
    for bau in (dados.get("baus_no_ar") or [])[:3]:
        icone = ui.icone_categoria("bau")
        quando = f"<t:{int(bau['expira_em'].timestamp())}:R>"
        if bau.get("coletivo"):
            situacao = "✅ você já pegou o seu" if bau.get("ja_peguei") else "pegue o seu!"
        else:
            situacao = "corrida do enigma"
        baus.append(f"{icone} **{bau.get('nome') or 'Baú'}** em <#{bau['canal_id']}> · {situacao} · some {quando}")
    if not baus:
        baus.append(
            f"Nenhum baú no ar agora. Hoje já apareceram **{dados.get('baus_hoje', 0)}**."
            if dados.get("baus_hoje") else "Nenhum baú no ar agora."
        )
    if dados.get("pistas"):
        baus.append(f"🍀 Você tem **{dados['pistas']}** Pista(s) de Sorte para o próximo baú.")
    chaves = dados.get("chaves") or {}
    if chaves.get("quantidade"):
        baus.append(
            f"🗝️ Você tem **{chaves['quantidade']}** Chave(s) do Jardim"
            + (": a próxima abre o fundo falso de um baú Incomum ou melhor." if chaves.get("auto_usar")
               else " (uso automático desligado).")
        )
    emb.add_field(name="🎁 Baús", value="\n".join(baus)[:1024], inline=False)

    meta = dados.get("meta")
    if meta:
        emb.add_field(
            name="🏛️ Cofre do Jardim",
            value=(
                f"**{meta['titulo']}**\n{barra_meta(meta['arrecadado'], meta['alvo'])}\n"
                f"Até <t:{int(meta['prazo'].timestamp())}:R>. Doe pelo `/banco`."
            ),
            inline=False,
        )
    colecao = dados.get("colecao")
    if colecao is not None:
        paginas = colecao_mod.paginas_completas(colecao)
        fragmentos = sum(min(q, colecao_mod.FRAGMENTOS_POR_PAGINA) for q in colecao.values())
        emb.add_field(
            name="📚 Coleção das Dez Árvores",
            value=(
                f"**{paginas}/{colecao_mod.TOTAL_PAGINAS}** páginas · {fragmentos} fragmento(s). "
                "Os baús trazem fragmentos que revelam o que restou escrito sobre cada Árvore."
            ),
            inline=False,
        )

    eventos = [
        f"{EMOJI_EVENTO.get(ev.get('tipo'), '📢')} **{ev['titulo']}** · até <t:{int(ev['expira_em'].timestamp())}:R>"
        for ev in (dados.get("eventos") or [])[:3]
    ]
    if eventos:
        emb.add_field(name="📢 Eventos do Mestre", value="\n".join(eventos)[:1024], inline=False)

    avisos = []
    furo = dados.get("furo")
    if furo:
        avisos.append(
            f"📸 O Jornalista tem um furo sobre você, que sai <t:{int(furo['prazo'].timestamp())}:R>. "
            f"Para abafar: `/subornar_jornalista` (☾ **{furo['suborno_valor']}**)."
        )
    if dados.get("entrevista"):
        avisos.append("🎙️ Há uma pergunta da entrevista esperando por você: use `/entrevista_responder`.")
    if avisos:
        emb.add_field(name="⚠️ Para você", value="\n".join(avisos)[:1024], inline=False)

    if dados.get("bilhetes_total"):
        emb.add_field(
            name="🎟️ Loteria Dominical",
            value=f"**{dados['bilhetes_total']}** bilhete(s) vendido(s). Sorteio domingo às 18h.",
            inline=False,
        )
    emb.set_footer(text=f"{ui.MARCA} · Use o menu abaixo para abrir qualquer tela")
    return emb


class ModalClassificado(discord.ui.Modal):
    def __init__(self, ao_enviar):
        super().__init__(title="Classificado no Jornal Lunar", timeout=300)
        self._ao_enviar = ao_enviar
        self.texto = discord.ui.TextInput(
            style=discord.TextStyle.paragraph, max_length=1000, placeholder="Compro espada, procuro guilda…"
        )
        self.valor = discord.ui.TextInput(
            max_length=9, default=str(CLASSIFICADO_VALOR_MINIMO), placeholder=f"Mínimo {CLASSIFICADO_VALOR_MINIMO}"
        )
        self.categoria = discord.ui.Select(
            options=[
                discord.SelectOption(label=nome, value=chave, emoji=emoji, default=chave == "outros")
                for chave, (nome, emoji) in CLASSIFICADO_CATEGORIAS.items()
            ],
            min_values=1, max_values=1, required=False,
        )
        self.add_item(discord.ui.Label(text="Tipo do anúncio", component=self.categoria))
        self.add_item(discord.ui.Label(text="Texto do anúncio", component=self.texto))
        self.add_item(discord.ui.Label(text="Quanto pagar (Lunaris)", component=self.valor))

    async def on_submit(self, interaction: discord.Interaction) -> None:
        valor = ler_inteiro(self.valor.value)
        if valor is None:
            await interaction.response.send_message("⚠️ O valor precisa ser um número inteiro.", ephemeral=True)
            return
        if valor < CLASSIFICADO_VALOR_MINIMO:
            await interaction.response.send_message(
                f"⚠️ O mínimo é ☾ {CLASSIFICADO_VALOR_MINIMO} Lunaris.", ephemeral=True
            )
            return
        escolhida = self.categoria.values[0] if self.categoria.values else "outros"
        await self._ao_enviar(interaction, str(self.texto.value).strip(), valor, escolhida)

    async def on_error(self, interaction: discord.Interaction, error: Exception) -> None:
        log.exception("erro no modal de classificado", exc_info=error)
        try:
            if interaction.response.is_done():
                await interaction.followup.send("⚠️ Algo deu errado. Tente de novo.", ephemeral=True)
            else:
                await interaction.response.send_message("⚠️ Algo deu errado. Tente de novo.", ephemeral=True)
        except discord.HTTPException:
            pass


class ModalFuro(discord.ui.Modal):
    """Formulário do furo: o jogador escreve a história que quer vender."""

    def __init__(self, ao_enviar):
        super().__init__(title="Vender um furo", timeout=300)
        self._ao_enviar = ao_enviar
        self.historia = discord.ui.TextInput(
            style=discord.TextStyle.paragraph, min_length=furos_mod.HISTORIA_MIN, max_length=furos_mod.HISTORIA_MAX,
            placeholder="O que você viu? Sem links e sem marcar ninguém.",
        )
        self.add_item(discord.ui.Label(text="Conte o furo", component=self.historia))

    async def on_submit(self, interaction: discord.Interaction) -> None:
        await self._ao_enviar(interaction, str(self.historia.value).strip())

    async def on_error(self, interaction: discord.Interaction, error: Exception) -> None:
        log.exception("erro no modal de furo", exc_info=error)
        try:
            if interaction.response.is_done():
                await interaction.followup.send("⚠️ Algo deu errado. Tente de novo.", ephemeral=True)
            else:
                await interaction.response.send_message("⚠️ Algo deu errado. Tente de novo.", ephemeral=True)
        except discord.HTTPException:
            pass


class EscolherAlvoDoFuro(discord.ui.View):
    """Mensagem privada com um seletor de jogador para o /vender_furo."""

    def __init__(self, autor_id: int, ao_escolher):
        super().__init__(timeout=120)
        self.autor_id = autor_id
        self._ao_escolher = ao_escolher
        self.seletor = discord.ui.UserSelect(placeholder="De quem é o segredo?", min_values=1, max_values=1)
        self.seletor.callback = self._escolhido
        self.add_item(self.seletor)

    async def interaction_check(self, interaction: discord.Interaction) -> bool:
        if interaction.user.id != self.autor_id:
            await interaction.response.send_message("Esse menu é de outra pessoa.", ephemeral=True)
            return False
        return True

    async def _escolhido(self, interaction: discord.Interaction) -> None:
        alvo = self.seletor.values[0]
        self.stop()
        await self._ao_escolher(interaction, alvo)


class ViewColecao(discord.ui.View):
    """Álbum da coleção: um seletor abre a página de cada Árvore que já tem
    fragmento, e o botão volta ao álbum."""

    def __init__(self, autor_id: int, progresso: dict, album: discord.Embed):
        super().__init__(timeout=600)
        self.autor_id = autor_id
        self.album = album
        opcoes = [
            discord.SelectOption(
                label=colecao_mod.PAGINAS[i]["nome"], value=i,
                description=f"{min(q, colecao_mod.FRAGMENTOS_POR_PAGINA)}/{colecao_mod.FRAGMENTOS_POR_PAGINA} fragmentos",
            )
            for i in colecao_mod.IDS
            if (q := progresso.get(i, 0)) > 0 and i in colecao_mod.PAGINAS
        ]
        self.progresso = progresso
        if opcoes:
            self.seletor = discord.ui.Select(placeholder="Ler uma página…", options=opcoes[:25], row=0)
            self.seletor.callback = self._ler
            self.add_item(self.seletor)
            voltar = discord.ui.Button(label="Álbum", emoji="📚", row=1)
            voltar.callback = self._voltar
            self.add_item(voltar)

    async def interaction_check(self, interaction: discord.Interaction) -> bool:
        if interaction.user.id != self.autor_id:
            await interaction.response.send_message("Esse painel é de outra pessoa.", ephemeral=True)
            return False
        return True

    async def _ler(self, interaction: discord.Interaction) -> None:
        arvore_id = interaction.data["values"][0]
        await interaction.response.edit_message(
            embed=colecao_mod.embed_pagina(arvore_id, self.progresso.get(arvore_id, 0)), view=self
        )

    async def _voltar(self, interaction: discord.Interaction) -> None:
        await interaction.response.edit_message(embed=self.album, view=self)


class Painel(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    async def _tela_cofre(self, ctx) -> None:
        gid = str(ctx.guild_id)
        meta = await asyncio.to_thread(self.bot.db.get_meta_ativa, gid)
        if meta is None:
            ultima = await asyncio.to_thread(self.bot.db.get_ultima_meta_encerrada, gid)
            texto = "Nenhuma meta aberta agora."
            if ultima:
                estado = {"concluida": "foi batida 🎉", "expirada": "não foi batida (as doações voltaram)",
                          "cancelada": "foi cancelada (as doações voltaram)"}.get(ultima["status"], "terminou")
                texto += f"\nA última, **{ultima['titulo']}**, {estado}."
            await ctx.response.send_message(embed=ui.embed("🏛️ Cofre do Jardim", categoria="dinheiro", descricao=texto))
            return
        doadores = await asyncio.to_thread(self.bot.db.top_doadores, meta["id"])
        emb = embed_meta_anuncio(
            meta, f"🏛️ Cofre do Jardim: {meta['titulo']}",
            f"Doe pelo **/banco**, na seção *Cofre do Jardim*. Prazo: <t:{int(meta['prazo'].timestamp())}:R>.",
        )
        if doadores:
            emb.add_field(
                name="Quem mais doou",
                value="\n".join(f"{i + 1}. <@{d['user_id']}>: ☾ {d['total']}" for i, d in enumerate(doadores)),
                inline=False,
            )
        await ctx.response.send_message(embed=emb)

    async def _tela_colecao(self, ctx) -> None:
        gid, uid = str(ctx.guild_id), str(ctx.user.id)
        if not await asyncio.to_thread(self.bot.db.automacao_ativa, gid, "colecao", True):
            await ctx.response.send_message(
                embed=ui.embed("📚 Coleção das Dez Árvores", categoria="noticia",
                               descricao="A coleção está pausada neste servidor pelo Mestre.")
            )
            return
        progresso = await asyncio.to_thread(self.bot.db.get_colecao, gid, uid)
        cargos_arvore = await asyncio.to_thread(self.bot.db.get_cargos_arvore, gid)
        meus = {str(c.id) for c in getattr(ctx.user, "roles", [])}
        album = colecao_mod.embed_album(progresso, meus, cargos_arvore)
        await ctx.response.send_message(embed=album, view=ViewColecao(ctx.user.id, progresso, album))

    # ── telas ───────────────────────────────────────────────────────────────
    async def _tela_eventos(self, ctx) -> None:
        eventos = await asyncio.to_thread(self.bot.db.listar_eventos_ativos, str(ctx.guild_id), 10)
        if not eventos:
            emb = ui.embed("📢 Eventos do Mestre", categoria="noticia", descricao="Nenhum evento ativo agora.")
        else:
            linhas = []
            for ev in eventos:
                emoji = EMOJI_EVENTO.get(ev.get("tipo"), "📢")
                corpo = f"\n{ev['texto']}" if ev.get("texto") else ""
                linhas.append(f"{emoji} **{ev['titulo']}** · até <t:{int(ev['expira_em'].timestamp())}:R>{corpo}")
            emb = ui.embed("📢 Eventos do Mestre", categoria="noticia", descricao="\n\n".join(linhas)[:4000])
        await ctx.response.send_message(embed=emb)

    def _secoes(self) -> list[Secao]:
        telas = {"eventos": self._tela_eventos, "colecao": self._tela_colecao, "cofre": self._tela_cofre}

        def fazer(chave: str, comando: Optional[str]):
            async def executar(ctx):
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
        cargos = frozenset(str(c.id) for c in getattr(interaction.user, "roles", []))
        return montar_embed_inicio(interaction.user.display_name, dados, cargos)

    # ── ações rápidas ───────────────────────────────────────────────────────
    async def _acao_classificado(self, interaction: discord.Interaction) -> None:
        async def enviado(inter: discord.Interaction, texto: str, valor: int, categoria: str = "outros") -> None:
            nome = CLASSIFICADO_CATEGORIAS.get(categoria, CLASSIFICADO_CATEGORIAS["outros"])[0]
            await chamar_comando(
                self.bot, "anunciar_classificado", InteracaoEfemera(inter), texto=texto, valor=valor,
                categoria=app_commands.Choice(name=nome, value=categoria),
            )

        await interaction.response.send_modal(ModalClassificado(enviado))

    async def _acao_furo(self, interaction: discord.Interaction) -> None:
        async def escolhido(inter: discord.Interaction, alvo) -> None:
            if not isinstance(alvo, discord.Member):
                alvo = inter.guild.get_member(alvo.id) if inter.guild else None
            if alvo is None:
                await inter.response.send_message("⚠️ Não achei essa pessoa no servidor.", ephemeral=True)
                return

            async def contado(inter2: discord.Interaction, historia: str) -> None:
                await chamar_comando(self.bot, "vender_furo", InteracaoEfemera(inter2), jogador=alvo, historia=historia)

            await inter.response.send_modal(ModalFuro(contado))

        await interaction.response.send_message(
            "📸 Quem é o alvo do furo? (uma tentativa por hora; a pessoa é avisada e pode subornar)",
            view=EscolherAlvoDoFuro(interaction.user.id, escolhido),
            ephemeral=True,
        )

    async def _acao_entrevistas(self, interaction: discord.Interaction) -> None:
        gid, uid = str(interaction.guild_id), str(interaction.user.id)
        fora = uid in set(await asyncio.to_thread(self.bot.db.usuarios_fora_das_entrevistas, gid))
        # Inverte a escolha atual: quem estava fora volta, quem estava dentro sai.
        await chamar_comando(self.bot, "entrevista_participar", interaction, participar=fora)

    def _acoes(self) -> list[Acao]:
        return [
            Acao("Classificado", "📰", self._acao_classificado, discord.ButtonStyle.success),
            Acao("Vender furo", "📸", self._acao_furo),
            Acao("Entrevistas", "🎙️", self._acao_entrevistas),
        ]

    @app_commands.command(
        name="jardim",
        description="Abre o painel do Jornal Lunar: estação, horóscopo, baús, eventos e avisos para você.",
    )
    @app_commands.guild_only()
    async def jardim(self, interaction: discord.Interaction):
        view = PainelView(
            autor_id=interaction.user.id,
            secoes=self._secoes(),
            inicio=self._inicio,
            acoes=self._acoes(),
        )
        await view.abrir(interaction)


async def setup(bot):
    await bot.add_cog(Painel(bot))
