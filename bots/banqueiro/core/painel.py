"""Painel interativo: uma única mensagem privada com menu de seções e botões.

Serve de base para `/banco` (Banqueiro) e `/jardim` (Jornalista). O arquivo é
IDÊNTICO nos dois bots, de propósito: eles são ZIPs deployados separados e não
importam código um do outro (mesma regra de core/cassino.py). Se mudar um,
mude o outro.

Como as seções reaproveitam os comandos que já existem: cada seção chama o
callback do comando com uma `InteracaoPainel`, que se comporta como a
interação real mas troca "enviar mensagem nova" por "editar o painel". Assim a
lógica de cada tela continua num lugar só (o comando), o jogador navega sem
encher o canal de respostas e o mesmo código serve ao comando e ao painel.
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass
from typing import Any, Awaitable, Callable, Optional, Sequence

import discord

log = logging.getLogger("painel")

LIMITE_ACOES = 3  # a linha de botões comporta Início, Atualizar e mais 3


@dataclass(frozen=True)
class Secao:
    """Uma tela do painel. `executar` recebe a InteracaoPainel."""

    chave: str
    rotulo: str
    emoji: str
    descricao: str
    executar: Callable[["InteracaoPainel"], Awaitable[None]]


@dataclass(frozen=True)
class Acao:
    """Botão de ação rápida. `executar` recebe a interação REAL (para poder
    abrir um modal, que não pode vir depois de um defer)."""

    rotulo: str
    emoji: str
    executar: Callable[[discord.Interaction], Awaitable[None]]
    estilo: discord.ButtonStyle = discord.ButtonStyle.secondary


def _kwargs_de_envio(content, embed, embeds, view) -> dict:
    """Só repassa o que veio: o discord.py usa MISSING (não None) como ausente."""
    if embed is None and embeds:
        embed = embeds[0]
    kw: dict[str, Any] = {}
    if content is not None:
        kw["content"] = content
    if embed is not None:
        kw["embed"] = embed
    if view is not None:
        kw["view"] = view
    return kw


class _RespostaPainel:
    def __init__(self, ctx: "InteracaoPainel"):
        self._ctx = ctx

    def is_done(self) -> bool:
        return self._ctx.feito or self._ctx.real.response.is_done()

    async def send_message(self, content=None, *, embed=None, embeds=None, view=None, **_ignorado):
        await self._ctx.mostrar(content=content, embed=embed or (embeds[0] if embeds else None), view=view)

    edit_message = send_message

    async def defer(self, **_ignorado):
        if not self._ctx.real.response.is_done():
            await self._ctx.real.response.defer()
        self._ctx.feito = True

    async def send_modal(self, modal):
        await self._ctx.real.response.send_modal(modal)
        self._ctx.feito = True


class _FollowupPainel:
    def __init__(self, ctx: "InteracaoPainel"):
        self._ctx = ctx

    async def send(self, content=None, *, embed=None, embeds=None, view=None, **_ignorado):
        ctx = self._ctx
        if ctx.editou:
            # O painel já mostrou algo nesta ação: o resto vai como mensagem
            # nova e privada, sem apagar o que o jogador acabou de ver.
            kw = _kwargs_de_envio(content, embed, embeds, view)
            return await ctx.real.followup.send(ephemeral=True, **kw)
        await ctx.mostrar(content=content, embed=embed or (embeds[0] if embeds else None), view=view)


class InteracaoPainel:
    """Faz as vezes da `discord.Interaction` para os callbacks dos comandos."""

    def __init__(self, real: discord.Interaction, painel: "PainelView"):
        self.real = real
        self.painel = painel
        self.feito = False
        self.editou = False
        self.response = _RespostaPainel(self)
        self.followup = _FollowupPainel(self)

    def __getattr__(self, nome: str):
        # user, guild, guild_id, client, channel, data...: tudo da interação real.
        return getattr(self.real, nome)

    async def mostrar(self, *, content=None, embed=None, view=None) -> None:
        await self.painel.mostrar(self.real, content=content, embed=embed, view=view)
        self.feito = True
        self.editou = True

    async def edit_original_response(self, **kw):
        return await self.real.edit_original_response(**kw)


class _BotaoInicio(discord.ui.Button):
    """Botão de volta para as telas que trazem a própria view (um paginador)."""

    def __init__(self, painel: "PainelView", row: int = 1):
        super().__init__(label="Início", emoji="🏠", style=discord.ButtonStyle.secondary, row=row)
        self._painel = painel

    async def callback(self, interaction: discord.Interaction):
        await self._painel.ir_para_inicio(interaction)


class PainelView(discord.ui.View):
    def __init__(
        self,
        *,
        autor_id: int,
        secoes: Sequence[Secao],
        inicio: Callable[[discord.Interaction], Awaitable[discord.Embed]],
        acoes: Sequence[Acao] = (),
        timeout: float = 600,
    ):
        super().__init__(timeout=timeout)
        if not 1 <= len(secoes) <= 25:
            raise ValueError("o menu do painel comporta de 1 a 25 seções")
        if len(acoes) > LIMITE_ACOES:
            raise ValueError(f"no máximo {LIMITE_ACOES} ações rápidas")
        self.autor_id = autor_id
        self.secoes = {s.chave: s for s in secoes}
        if len(self.secoes) != len(secoes):
            raise ValueError("chaves de seção repetidas")
        self._inicio = inicio
        self.atual: Optional[str] = None
        self._origem: Optional[discord.Interaction] = None

        self.menu = discord.ui.Select(
            placeholder="Abrir uma seção…",
            options=[
                discord.SelectOption(
                    label=s.rotulo[:100], value=s.chave, emoji=s.emoji, description=s.descricao[:100]
                )
                for s in secoes
            ],
            row=0,
        )
        self.menu.callback = self._ao_escolher
        self.add_item(self.menu)

        botao_inicio = discord.ui.Button(label="Início", emoji="🏠", style=discord.ButtonStyle.primary, row=1)
        botao_inicio.callback = self.ir_para_inicio
        self.add_item(botao_inicio)
        botao_atualizar = discord.ui.Button(label="Atualizar", emoji="🔄", style=discord.ButtonStyle.secondary, row=1)
        botao_atualizar.callback = self._atualizar
        self.add_item(botao_atualizar)
        for acao in acoes:
            botao = discord.ui.Button(label=acao.rotulo, emoji=acao.emoji, style=acao.estilo, row=1)
            botao.callback = self._fazer_callback_de_acao(acao)
            self.add_item(botao)

    # ── ciclo de vida ───────────────────────────────────────────────────────
    async def abrir(self, interaction: discord.Interaction) -> None:
        """Envia o painel (início) como resposta privada ao comando."""
        self._origem = interaction
        # Confirma o comando antes de consultar o banco (o Discord só espera 3s).
        await interaction.response.defer(ephemeral=True)
        embed = await self._inicio(interaction)
        await interaction.followup.send(embed=embed, view=self, ephemeral=True)

    async def interaction_check(self, interaction: discord.Interaction) -> bool:
        if interaction.user.id != self.autor_id:
            await interaction.response.send_message(
                "Esse painel é de outra pessoa. Abra o seu com o comando.", ephemeral=True
            )
            return False
        return True

    async def on_timeout(self) -> None:
        for item in self.children:
            item.disabled = True
        if self._origem is not None:
            try:
                await self._origem.edit_original_response(view=self)
            except discord.HTTPException:
                pass

    async def on_error(self, interaction: discord.Interaction, error: Exception, item) -> None:
        log.exception("erro no painel", exc_info=error)
        await self._mostrar_erro(interaction)

    # ── navegação ───────────────────────────────────────────────────────────
    def _marcar_atual(self) -> None:
        for opcao in self.menu.options:
            opcao.default = opcao.value == self.atual

    async def _ao_escolher(self, interaction: discord.Interaction) -> None:
        await self.abrir_secao(interaction, interaction.data["values"][0])

    async def abrir_secao(self, interaction: discord.Interaction, chave: str) -> None:
        secao = self.secoes.get(chave)
        if secao is None:
            await self.ir_para_inicio(interaction)
            return
        self.atual = chave
        self._marcar_atual()
        # Confirma o clique já: as seções consultam o banco e o Discord só
        # espera 3s. Depois do defer, todo envio do callback vira edição.
        if not interaction.response.is_done():
            await interaction.response.defer()
        ctx = InteracaoPainel(interaction, self)
        try:
            await secao.executar(ctx)
        except Exception:
            log.exception("erro na seção %s do painel", chave)
            await self._mostrar_erro(interaction)
            return
        if not ctx.editou:
            # O comando respondeu de outro jeito (ou nem respondeu): devolve o painel.
            await self.mostrar(
                interaction,
                embed=discord.Embed(description="Nada para mostrar nessa seção agora.", colour=0x95A5A6),
            )

    async def ir_para_inicio(self, interaction: discord.Interaction) -> None:
        self.atual = None
        self._marcar_atual()
        if not interaction.response.is_done():
            await interaction.response.defer()
        try:
            embed = await self._inicio(interaction)
        except Exception:
            log.exception("erro ao montar o início do painel")
            await self._mostrar_erro(interaction)
            return
        await self.mostrar(interaction, embed=embed)

    async def _atualizar(self, interaction: discord.Interaction) -> None:
        if self.atual is None:
            await self.ir_para_inicio(interaction)
        else:
            await self.abrir_secao(interaction, self.atual)

    def _fazer_callback_de_acao(self, acao: Acao):
        async def _callback(interaction: discord.Interaction) -> None:
            try:
                await acao.executar(interaction)
            except Exception:
                log.exception("erro na ação %s do painel", acao.rotulo)
                await self._mostrar_erro(interaction)

        return _callback

    async def mostrar(
        self, interaction: discord.Interaction, *, content=None, embed=None, view=None
    ) -> None:
        """Troca o conteúdo do painel. Uma tela que traz a própria view (um
        paginador) ganha só o botão de volta ao início."""
        if view is None or view is self:
            view = self
        else:
            if not any(isinstance(i, _BotaoInicio) for i in view.children):
                try:
                    view.add_item(_BotaoInicio(self))
                except Exception:
                    log.info("nao consegui acrescentar o botao de inicio a view da secao")
        kw = {"content": content, "embed": embed, "view": view}
        if interaction.response.is_done():
            await interaction.edit_original_response(**kw)
        else:
            await interaction.response.edit_message(**kw)

    async def _mostrar_erro(self, interaction: discord.Interaction) -> None:
        emb = discord.Embed(
            description="⚠️ Algo deu errado ao abrir essa tela. Tente de novo em instantes.",
            colour=0xE74C3C,
        )
        try:
            await self.mostrar(interaction, embed=emb)
        except discord.HTTPException:
            log.info("nao consegui avisar o erro no painel")


def ler_inteiro(texto: object) -> Optional[int]:
    """Número digitado num modal. Aceita só dígitos ("1500") ou milhar com ponto ou vírgula
    ("1.500", "1,500"). Qualquer outra forma (como "50,5") é recusada em vez de virar 505."""
    limpo = str(texto).strip().replace(" ", "")
    if re.fullmatch(r"\d+", limpo):
        return int(limpo)
    if re.fullmatch(r"\d{1,3}(?:[.,]\d{3})+", limpo):
        return int(re.sub(r"[.,]", "", limpo))
    return None


class ModalQuantia(discord.ui.Modal):
    """Pergunta um número inteiro e entrega ao callback `ao_enviar`.

    O callback recebe (interaction_do_modal, quantia). Número inválido ou fora
    da faixa responde em privado sem chamar o callback."""

    def __init__(
        self,
        titulo: str,
        rotulo: str,
        ao_enviar: Callable[[discord.Interaction, int], Awaitable[None]],
        *,
        minimo: int = 1,
        maximo: Optional[int] = None,
    ):
        super().__init__(title=titulo[:45], timeout=300)
        self.quantia = discord.ui.TextInput(max_length=9, placeholder="Ex.: 50")
        self.add_item(discord.ui.Label(text=rotulo[:45], component=self.quantia))
        self._ao_enviar = ao_enviar
        self._minimo = minimo
        self._maximo = maximo

    async def on_submit(self, interaction: discord.Interaction) -> None:
        valor = ler_inteiro(self.quantia.value)
        if valor is None:
            await interaction.response.send_message("⚠️ Informe só números inteiros, sem decimais.", ephemeral=True)
            return
        if valor < self._minimo or (self._maximo is not None and valor > self._maximo):
            faixa = f"a partir de {self._minimo}" if self._maximo is None else f"de {self._minimo} a {self._maximo}"
            await interaction.response.send_message(f"⚠️ Informe um valor {faixa}.", ephemeral=True)
            return
        await self._ao_enviar(interaction, valor)

    async def on_error(self, interaction: discord.Interaction, error: Exception) -> None:
        log.exception("erro no modal do painel", exc_info=error)
        try:
            if interaction.response.is_done():
                await interaction.followup.send("⚠️ Algo deu errado. Tente de novo.", ephemeral=True)
            else:
                await interaction.response.send_message("⚠️ Algo deu errado. Tente de novo.", ephemeral=True)
        except discord.HTTPException:
            pass


class _RespostaEfemera:
    """Resposta que sai privada por padrão (quem quiser público passa ephemeral=False)."""

    def __init__(self, real):
        self._real = real

    def __getattr__(self, nome: str):
        return getattr(self._real, nome)

    async def send_message(self, *args, **kw):
        kw.setdefault("ephemeral", True)
        return await self._real.send_message(*args, **kw)

    async def defer(self, *args, **kw):
        kw.setdefault("ephemeral", True)
        return await self._real.defer(*args, **kw)


class _FollowupEfemero:
    def __init__(self, real):
        self._real = real

    def __getattr__(self, nome: str):
        return getattr(self._real, nome)

    async def send(self, *args, **kw):
        kw.setdefault("ephemeral", True)
        return await self._real.send(*args, **kw)


class InteracaoEfemera:
    """Envolve a interação de um modal aberto pelo painel: o painel é privado, e a resposta de um
    comando chamado a partir dele (que normalmente sai pública) não pode vazar para o canal."""

    def __init__(self, real: discord.Interaction):
        self.real = real
        self.response = _RespostaEfemera(real.response)
        self.followup = _FollowupEfemero(real.followup)

    def __getattr__(self, nome: str):
        return getattr(self.real, nome)


async def chamar_comando(bot, caminho: str, interaction, **argumentos) -> None:
    """Executa o callback de um comando já registrado ("carteira" ou
    "cassino abrir") com a interação dada. Não passa pelas checagens do
    comando: só use com comandos de jogador."""
    partes = caminho.split()
    comando = bot.tree.get_command(partes[0])
    for parte in partes[1:]:
        comando = comando.get_command(parte) if comando is not None else None
    if comando is None:
        raise LookupError(f"comando inexistente: {caminho}")
    binding = getattr(comando, "binding", None)
    if binding is not None:
        await comando.callback(binding, interaction, **argumentos)
    else:
        await comando.callback(interaction, **argumentos)
