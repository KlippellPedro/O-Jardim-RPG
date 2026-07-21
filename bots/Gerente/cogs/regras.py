"""Consulta às regras publicadas por navegação em menus (/regras).

Em vez de busca por texto (que rankeava trechos e às vezes errava), o jogador
escolhe categoria → item → detalhe. Sempre correto, formatado, e sem citar a
fonte. `/regra <termo>` pula direto pro item pelo nome.
"""

from __future__ import annotations

import logging

import discord
from discord import app_commands
from discord.ext import commands

from core import navegacao, ui

log = logging.getLogger("gerente.regras")

POR_PAGINA = 25  # limite de opções de um Select do Discord


# ── Formatadores (item → embed) ─────────────────────────────────────────────

def _sinal(valor) -> str:
    try:
        v = int(valor or 0)
    except (TypeError, ValueError):
        return str(valor)
    return f"+{v}" if v > 0 else str(v)


def _meta(item) -> str | None:
    partes = []
    if item.get("categoria"):
        partes.append(str(item["categoria"]).capitalize())
    if item.get("disponibilidade"):
        partes.append(str(item["disponibilidade"]).capitalize())
    if item.get("arvore"):
        partes.append(f"Árvore: {item['arvore']}")
    return " · ".join(partes) or None


def _embed_raca(r) -> discord.Embed:
    e = ui.embed(f"🧬 {r.get('titulo', 'Raça')}", _meta(r))
    ajustes = []
    for campo, rot in (("vida", "Vida"), ("mana", "Mana"), ("movimento", "Movimento")):
        if int(r.get(campo) or 0) != 0:
            ajustes.append(f"{rot} {_sinal(r.get(campo))}")
    if r.get("pericias_iniciais_adicionais"):
        ajustes.append(f"Perícias iniciais {_sinal(r['pericias_iniciais_adicionais'])}")
    e.add_field(name="Ajustes raciais", value=" · ".join(ajustes) or "Nenhum", inline=False)
    fis = r.get("fisiologia") or []
    if fis:
        e.add_field(name="Fisiologia", value="\n".join(f"• {f}" for f in fis)[:1024], inline=False)
    for c in r.get("caracteristicas", []):
        desc = (c.get("descricao") or "").strip()
        if desc:
            e.add_field(name=f"✦ {c.get('titulo', 'Característica')}", value=desc[:1024], inline=False)
    return e


def _embed_classe(c) -> discord.Embed:
    e = ui.embed(f"⚔️ {c.get('titulo', 'Classe')}", _meta(c))
    e.add_field(name="Vida / nível", value=str(c.get("vida", "—")), inline=True)
    e.add_field(name="Mana / nível", value=str(c.get("mana", "—")), inline=True)
    return e


def _fmt_prereq(prereqs) -> str:
    partes = []
    for pr in prereqs or []:
        if isinstance(pr, dict):
            for chave, valor in pr.items():
                partes.append(f"{chave.replace('_', ' ').capitalize()}: {valor}")
        else:
            partes.append(str(pr))
    return "\n".join(f"• {p}" for p in partes) if partes else "Nenhum."


def _embed_legado(l) -> discord.Embed:
    e = ui.embed(f"✨ {l.get('titulo', 'Legado')}", (l.get("descricao") or "Sem descrição.").strip()[:4000])
    prereq = l.get("pre_requisitos") or []
    if prereq:
        e.add_field(name="Pré-requisitos", value=_fmt_prereq(prereq)[:1024], inline=False)
    return e


def _embed_pericia(p) -> discord.Embed:
    atr = navegacao.ATRIBUTO_ROTULO.get(p.get("atributo"), str(p.get("atributo", "")).capitalize())
    e = ui.embed(f"🎯 {p.get('titulo', 'Perícia')}")
    if atr:
        e.add_field(name="Atributo-chave", value=atr, inline=True)
    if p.get("origem"):
        e.add_field(name="Origem", value=str(p["origem"]), inline=True)
    return e


def _embed_fundamento(secao) -> discord.Embed:
    texto = secao.get("texto", "")
    if len(texto) > 4000:
        texto = texto[:3990].rsplit("\n", 1)[0] + "\n…"
    return ui.embed(f"📖 {secao.get('titulo', 'Fundamentos')}", texto)


def _embed_pericias_geral(nav) -> discord.Embed:
    e = ui.embed("🎯 Perícias", "Cada perícia usa um atributo-chave. Escolha uma no /regra pra ver a origem.")
    for atributo, lista in nav.pericias_por_atributo().items():
        rot = navegacao.ATRIBUTO_ROTULO.get(atributo, atributo.capitalize())
        nomes = ", ".join(p.get("titulo", "?") for p in lista)
        e.add_field(name=f"{rot} ({len(lista)})", value=nomes[:1024], inline=False)
    return e


def _embed_item(nav, categoria, item) -> discord.Embed:
    if item is None:
        return ui.embed("Não achei", "Esse item não está mais na lista.", cor=ui.COR_AVISO)
    return {
        "racas": _embed_raca,
        "classes": _embed_classe,
        "legados": _embed_legado,
        "pericias": _embed_pericia,
        "fundamentos": _embed_fundamento,
    }.get(categoria, lambda x: ui.embed(x.get("titulo", "?")))(item)


def _rotulo(categoria):
    for cid, rot, emoji in navegacao.CATEGORIAS:
        if cid == categoria:
            return rot, emoji
    return categoria, "•"


# ── View de navegação ───────────────────────────────────────────────────────

class NavRegras(discord.ui.View):
    def __init__(self, nav, autor_id: int, *, timeout: float = 180):
        super().__init__(timeout=timeout)
        self.nav = nav
        self.autor_id = autor_id
        self.categoria = None
        self.pagina = 0
        self.embed: discord.Embed | None = None
        self._render()

    async def interaction_check(self, interaction: discord.Interaction) -> bool:
        if interaction.user.id != self.autor_id:
            await interaction.response.send_message("Só quem abriu esse menu pode navegar — mande `/regras`.", ephemeral=True)
            return False
        return True

    async def on_timeout(self) -> None:
        for child in self.children:
            child.disabled = True

    # cada tela: limpa componentes e monta os certos + define self.embed
    def _render(self) -> None:
        self.clear_items()
        if self.categoria is None:
            self._tela_menu()
        elif self.categoria == "pericias":
            self._tela_pericias()
        else:
            self._tela_lista()

    def _tela_menu(self) -> None:
        self.embed = ui.embed(
            "📚 Regras do Jardim",
            "Escolha um assunto no menu. Você desce até a informação e pode voltar a qualquer momento.",
        )
        sel = discord.ui.Select(placeholder="Escolha um assunto…")
        for cid, rot, emoji in navegacao.CATEGORIAS:
            sel.add_option(label=rot, value=cid, emoji=emoji)
        sel.callback = self._on_categoria
        self.add_item(sel)

    def _tela_pericias(self) -> None:
        self.embed = _embed_pericias_geral(self.nav)
        self._add_botao("⌂ Menu", self._on_menu)

    def _tela_lista(self) -> None:
        rot, emoji = _rotulo(self.categoria)
        itens = self.nav.itens(self.categoria)
        total = len(itens)
        inicio = self.pagina * POR_PAGINA
        fatia = itens[inicio:inicio + POR_PAGINA]

        linhas = "\n".join(f"• {it.get('titulo', '?')}" for it in fatia) or "—"
        self.embed = ui.embed(f"{emoji} {rot}", linhas)
        if total > POR_PAGINA:
            paginas = (total + POR_PAGINA - 1) // POR_PAGINA
            self.embed.set_footer(text=f"{ui.MARCA} · Página {self.pagina + 1}/{paginas}")

        sel = discord.ui.Select(placeholder=f"Escolha — {rot}…")
        for it in fatia:
            sel.add_option(label=str(it.get("titulo", "?"))[:100], value=str(it.get("id", ""))[:100])
        sel.callback = self._on_item
        self.add_item(sel)

        self._add_botao("⌂ Menu", self._on_menu)
        if total > POR_PAGINA:
            self._add_botao("◀", self._pagina_anterior, desabilitado=self.pagina == 0)
            self._add_botao("▶", self._pagina_proxima, desabilitado=inicio + POR_PAGINA >= total)

    def _add_botao(self, label, callback, *, desabilitado=False) -> None:
        botao = discord.ui.Button(label=label, style=discord.ButtonStyle.secondary, disabled=desabilitado)
        botao.callback = callback
        self.add_item(botao)

    # ── callbacks ────────────────────────────────────────────────────────────
    async def _on_categoria(self, interaction: discord.Interaction) -> None:
        self.categoria = interaction.data["values"][0]
        self.pagina = 0
        self._render()
        await interaction.response.edit_message(embed=self.embed, view=self)

    async def _on_item(self, interaction: discord.Interaction) -> None:
        item = self.nav.item(self.categoria, interaction.data["values"][0])
        self.clear_items()
        self.embed = _embed_item(self.nav, self.categoria, item)
        self._add_botao("◀ Voltar à lista", self._on_voltar_lista)
        self._add_botao("⌂ Menu", self._on_menu)
        await interaction.response.edit_message(embed=self.embed, view=self)

    async def _on_voltar_lista(self, interaction: discord.Interaction) -> None:
        self._render()
        await interaction.response.edit_message(embed=self.embed, view=self)

    async def _on_menu(self, interaction: discord.Interaction) -> None:
        self.categoria = None
        self.pagina = 0
        self._render()
        await interaction.response.edit_message(embed=self.embed, view=self)

    async def _pagina_anterior(self, interaction: discord.Interaction) -> None:
        self.pagina = max(0, self.pagina - 1)
        self._render()
        await interaction.response.edit_message(embed=self.embed, view=self)

    async def _pagina_proxima(self, interaction: discord.Interaction) -> None:
        self.pagina += 1
        self._render()
        await interaction.response.edit_message(embed=self.embed, view=self)


# ── Cog ──────────────────────────────────────────────────────────────────────

class Regras(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @app_commands.command(name="regras", description="Navega pelas regras por menus: raças, classes, perícias, legados e fundamentos.")
    async def regras(self, interaction: discord.Interaction):
        view = NavRegras(self.bot.navegacao, interaction.user.id)
        await interaction.response.send_message(embed=view.embed, view=view, ephemeral=True)

    @app_commands.command(name="regra", description="Vai direto pra uma regra pelo nome (raça, classe, perícia ou Legado).")
    @app_commands.describe(termo="Nome que você quer ver (ex.: Humano, Guerreiro, Atletismo).")
    async def regra(self, interaction: discord.Interaction, termo: app_commands.Range[str, 2, 100]):
        achados = self.bot.navegacao.buscar_item(termo)
        if not achados:
            await interaction.response.send_message(
                embed=ui.embed(
                    f"🔎 Nada encontrado para “{termo[:80]}”",
                    "Confere o nome, ou navegue com `/regras`.",
                    cor=ui.COR_AVISO,
                ),
                ephemeral=True,
            )
            return
        categoria, item = achados[0]
        emb = _embed_item(self.bot.navegacao, categoria, item)
        if len(achados) > 1:
            outros = ", ".join(it.get("titulo", "?") for _, it in achados[1:4])
            emb.set_footer(text=f"{ui.MARCA} · Também achei: {outros}")
        await interaction.response.send_message(embed=emb)

    @app_commands.command(name="fontes", description="Mostra quais documentos oficiais o Gerente consulta.")
    async def fontes(self, interaction: discord.Interaction):
        linhas = "\n".join(f"• `{fonte}`" for fonte in self.bot.conhecimento.fontes)
        emb = ui.embed(
            "📑 Fontes do Gerente",
            f"{linhas}\n\nO arquivo interno do mestre não é exposto aos jogadores.",
        )
        await interaction.response.send_message(embed=emb, ephemeral=True)

    async def cog_app_command_error(
        self,
        interaction: discord.Interaction,
        error: app_commands.AppCommandError,
    ) -> None:
        original = getattr(error, "original", error)
        log.exception("Falha inesperada em comando de regras", exc_info=original)
        mensagem = "⚠️ Não consegui consultar as regras agora. Nada foi alterado; tente novamente."
        if interaction.response.is_done():
            await interaction.followup.send(mensagem, ephemeral=True)
        else:
            await interaction.response.send_message(mensagem, ephemeral=True)


async def setup(bot):
    await bot.add_cog(Regras(bot))
