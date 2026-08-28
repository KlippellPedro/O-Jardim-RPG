"""Salao do Banco Lunar: jogos transparentes ligados a lore do Jardim.

Todas as apostas usam apenas Lunaris da carteira. Cartao, divida, cofre e
limite de credito nunca financiam o cassino.
"""

from __future__ import annotations

import logging
from datetime import datetime, time as dtime, timedelta, timezone
from functools import partial
from zoneinfo import ZoneInfo

import discord
from discord import app_commands
from discord.ext import commands, tasks

from core import cassino as regras
from core import ui
from core.db import (
    CassinoIndisponivel,
    CassinoLimite,
    RodadaCassinoConflito,
    SaldoInsuficiente,
)
from core.tasks_util import registrar_reinicio_em_erro
from core.inventario import CofreIndisponivel, ItemIndisponivel


log = logging.getLogger("banqueiro")
TZ_JARDIM = ZoneInfo("America/Sao_Paulo")

DADOS_CHOICES = [
    app_commands.Choice(name="Baixo (1–3) · paga 2×", value="baixo"),
    app_commands.Choice(name="Alto (4–6) · paga 2×", value="alto"),
    app_commands.Choice(name="Número exato · paga 6×", value="exato"),
]
RODA_CHOICES = [
    app_commands.Choice(name=f"{info['emoji']} {info['nome']}", value=chave)
    for chave, info in regras.FORCAS_DA_RODA.items()
]
SUCESSAO_CHOICES = [
    app_commands.Choice(name="Antes do Passo · marcos 1–6", value="antes"),
    app_commands.Choice(name="Depois do Passo · marcos 8–13", value="depois"),
]
PAUSA_CHOICES = [
    app_commands.Choice(name="1 dia", value=1),
    app_commands.Choice(name="7 dias", value=7),
    app_commands.Choice(name="30 dias", value=30),
]
CORREDORES_CHOICES = [
    app_commands.Choice(
        name=f"{info['emoji']} {info['nome']} · {info['peso']}%",
        value=chave,
    )
    for chave, info in regras.CORREDORES_ASTRAIS.items()
]


def _sid(interaction: discord.Interaction) -> str:
    return str(interaction.guild_id)


def _hoje():
    return datetime.now(TZ_JARDIM).date()


def _janela_corrida(agora=None):
    agora = agora or datetime.now(TZ_JARDIM)
    inicio = agora.replace(hour=(agora.hour // 6) * 6, minute=0, second=0, microsecond=0)
    fecha = inicio + timedelta(hours=6)
    return inicio.strftime("%Y-%m-%dT%H"), fecha.astimezone(timezone.utc)


def _janela_torneio(agora=None):
    agora = agora or datetime.now(TZ_JARDIM)
    semana = regras.semana_local(agora)
    fecha_local = datetime.combine(semana + timedelta(days=7), dtime.min, tzinfo=TZ_JARDIM)
    return semana, fecha_local.astimezone(timezone.utc)


def _parse_aposta(valor: str) -> int:
    bruto = str(valor).strip()
    if not bruto.isdigit() or int(bruto) <= 0:
        raise ValueError("A aposta precisa ser um número inteiro positivo.")
    return int(bruto)


def _cartas(cartas: list[str]) -> str:
    return " · ".join(f"`{c}`" for c in cartas)


def _texto_conquistas_novas(rodada: dict) -> str:
    chaves = rodada.get("conquistas_novas") or []
    nomes = [regras.CONQUISTAS[chave][0] for chave in chaves if chave in regras.CONQUISTAS]
    if not nomes:
        return ""
    return "\n\n🏆 **Conquista desbloqueada:** " + ", ".join(f"**{nome}**" for nome in nomes)


def _embed_vinte_um(rodada: dict) -> discord.Embed:
    estado = rodada["estado"]
    ativa = rodada["status"] == "ativa" and estado.get("status") == "ativa"
    cartas_banco = (
        f"{_cartas(estado['banqueiro'][:1])} · `?`"
        if ativa
        else f"{_cartas(estado['banqueiro'])} (**{regras.valor_mao(estado['banqueiro'])}**)"
    )
    descricao = (
        f"Aposta: ☾ **{rodada['aposta']} Lunaris**\n\n"
        f"**Sua mão:** {_cartas(estado['jogador'])} (**{regras.valor_mao(estado['jogador'])}**)\n"
        f"**Banqueiro:** {cartas_banco}"
    )
    if not ativa:
        nomes = {
            "vitoria": "✅ Vitória",
            "vinte_um_natural": "🌟 21 natural",
            "empate": "🤝 Empate",
            "derrota": "❌ Derrota",
        }
        descricao += f"\n\n**Resultado:** {nomes.get(estado.get('resultado'), estado.get('resultado', 'encerrada'))}"
        if rodada.get("status") == "liquidada":
            descricao += f"\nPagamento: ☾ **{rodada['pagamento']} Lunaris**"
        descricao += _texto_conquistas_novas(rodada)
    emb = ui.embed("🃏 Vinte-e-Um de Amadheus", categoria="economia", descricao=descricao)
    emb.set_footer(text=f"{ui.MARCA} · vitória 2× · empate 1× · 21 natural 2,5×")
    return emb


def _embed_confirmacao(titulo: str, aposta: int, explicacao: str) -> discord.Embed:
    return ui.embed(
        f"Confirmar · {titulo}",
        categoria="economia",
        descricao=(
            f"{explicacao}\n\n"
            f"**Aposta:** ☾ {aposta} Lunaris da carteira.\n"
            "O resultado só será sorteado depois de você confirmar."
        ),
    )


class ConfirmarApostaView(discord.ui.View):
    def __init__(self, autor_id: int, executar):
        super().__init__(timeout=120)
        self.autor_id = autor_id
        self.executar = executar
        self.encerrada = False

    async def interaction_check(self, interaction: discord.Interaction) -> bool:
        if interaction.user.id != self.autor_id:
            await interaction.response.send_message("Esta confirmação pertence a outro jogador.", ephemeral=True)
            return False
        return True

    @discord.ui.button(label="Confirmar aposta", emoji="✅", style=discord.ButtonStyle.success)
    async def confirmar(self, interaction: discord.Interaction, _button: discord.ui.Button):
        if self.encerrada:
            await interaction.response.send_message("Esta aposta já foi confirmada ou cancelada.", ephemeral=True)
            return
        self.encerrada = True
        for child in self.children:
            child.disabled = True
        await self.executar(interaction)
        self.stop()

    @discord.ui.button(label="Cancelar", emoji="✖️", style=discord.ButtonStyle.secondary)
    async def cancelar(self, interaction: discord.Interaction, _button: discord.ui.Button):
        if self.encerrada:
            await interaction.response.send_message("Esta aposta já foi confirmada ou cancelada.", ephemeral=True)
            return
        self.encerrada = True
        self.stop()
        await interaction.response.edit_message(content="Aposta cancelada. Nenhum Lunar foi debitado.", embed=None, view=None)


class DadosModal(discord.ui.Modal, title="Dados da Inconstância"):
    aposta = discord.ui.TextInput(label="Aposta em Lunaris", placeholder="Ex.: 10", max_length=9)
    escolha = discord.ui.TextInput(label="Escolha: baixo, alto ou exato", placeholder="baixo", max_length=5)
    numero = discord.ui.TextInput(label="Número (somente para exato)", required=False, max_length=1)

    def __init__(self, cog: "Cassino"):
        super().__init__(timeout=120)
        self.cog = cog

    async def on_submit(self, interaction: discord.Interaction):
        try:
            aposta = _parse_aposta(self.aposta.value)
            escolha = str(self.escolha.value).strip().lower()
            numero = int(self.numero.value) if str(self.numero.value).strip() else None
        except ValueError as exc:
            await interaction.response.send_message(f"⚠️ {exc}", ephemeral=True)
            return
        await self.cog.pedir_confirmacao_dados(interaction, aposta, escolha, numero)


class VinteUmModal(discord.ui.Modal, title="Vinte-e-Um de Amadheus"):
    aposta = discord.ui.TextInput(label="Aposta em Lunaris", placeholder="Ex.: 10", max_length=9)

    def __init__(self, cog: "Cassino"):
        super().__init__(timeout=120)
        self.cog = cog

    async def on_submit(self, interaction: discord.Interaction):
        try:
            aposta = _parse_aposta(self.aposta.value)
        except ValueError as exc:
            await interaction.response.send_message(f"⚠️ {exc}", ephemeral=True)
            return
        await self.cog.pedir_confirmacao_vinte_um(interaction, aposta)


class CassinoHubView(discord.ui.View):
    def __init__(self, cog: "Cassino", autor_id: int):
        super().__init__(timeout=120)
        self.cog = cog
        self.autor_id = autor_id

    async def interaction_check(self, interaction: discord.Interaction) -> bool:
        if interaction.user.id != self.autor_id:
            await interaction.response.send_message("Só quem abriu o cassino pode usar este painel.", ephemeral=True)
            return False
        return True

    @discord.ui.button(label="Dados de Ignis", emoji="🎲", style=discord.ButtonStyle.primary)
    async def dados(self, interaction: discord.Interaction, _button: discord.ui.Button):
        await interaction.response.send_modal(DadosModal(self.cog))

    @discord.ui.button(label="21 de Amadheus", emoji="🃏", style=discord.ButtonStyle.success)
    async def vinte_um(self, interaction: discord.Interaction, _button: discord.ui.Button):
        await interaction.response.send_modal(VinteUmModal(self.cog))

    @discord.ui.button(label="Meu histórico", emoji="📜", style=discord.ButtonStyle.secondary)
    async def historico(self, interaction: discord.Interaction, _button: discord.ui.Button):
        await self.cog.mostrar_historico(interaction)

    @discord.ui.button(label="Limites", emoji="🛡️", style=discord.ButtonStyle.secondary)
    async def limites(self, interaction: discord.Interaction, _button: discord.ui.Button):
        await self.cog.mostrar_limites(interaction)

    @discord.ui.button(label="Corrida das Árvores", emoji="🏁", style=discord.ButtonStyle.secondary)
    async def corrida(self, interaction: discord.Interaction, _button: discord.ui.Button):
        await self.cog.mostrar_corrida(interaction)

    @discord.ui.button(label="Roda das Forças", emoji="☸️", style=discord.ButtonStyle.primary)
    async def roda(self, interaction: discord.Interaction, _button: discord.ui.Button):
        await interaction.response.send_message(
            "Use `/cassino roda_fluxos`: escolha uma das dez forças, veja as chances e confirme a aposta.",
            ephemeral=True,
        )

    @discord.ui.button(label="Queda nos Vãos", emoji="🔻", style=discord.ButtonStyle.primary)
    async def vaos(self, interaction: discord.Interaction, _button: discord.ui.Button):
        await interaction.response.send_message(
            "Use `/cassino vaos`: confira os cinco destinos e confirme a aposta antes da queda.",
            ephemeral=True,
        )


class VinteUmView(discord.ui.View):
    def __init__(self, cog: "Cassino", rodada_id: str, autor_id: int):
        super().__init__(timeout=180)
        self.cog = cog
        self.rodada_id = rodada_id
        self.autor_id = autor_id
        self.message = None

    async def interaction_check(self, interaction: discord.Interaction) -> bool:
        if interaction.user.id != self.autor_id:
            await interaction.response.send_message("Esta mesa pertence a outro jogador.", ephemeral=True)
            return False
        return True

    async def _agir(self, interaction: discord.Interaction, acao: str):
        await self.cog.agir_vinte_um(interaction, self.rodada_id, acao, self)

    @discord.ui.button(label="Comprar", emoji="➕", style=discord.ButtonStyle.primary)
    async def comprar(self, interaction: discord.Interaction, _button: discord.ui.Button):
        await self._agir(interaction, "comprar")

    @discord.ui.button(label="Parar", emoji="✋", style=discord.ButtonStyle.secondary)
    async def parar(self, interaction: discord.Interaction, _button: discord.ui.Button):
        await self._agir(interaction, "parar")

    @discord.ui.button(label="Dobrar", emoji="✖️", style=discord.ButtonStyle.success)
    async def dobrar(self, interaction: discord.Interaction, _button: discord.ui.Button):
        await self._agir(interaction, "dobrar")

    def desabilitar(self):
        for child in self.children:
            child.disabled = True

    async def on_timeout(self):
        atual = self.cog.bot.db.get_rodada_cassino(self.rodada_id, str(self.autor_id))
        rodada = self.cog._liquidar_21_se_final(atual) if atual else None
        if rodada and rodada["status"] == "ativa":
            rodada = self.cog.bot.db.reembolsar_rodada_cassino(
                self.rodada_id, "tempo da mesa esgotado"
            )
        self.desabilitar()
        if self.message and rodada and rodada.get("nova"):
            try:
                if rodada["status"] == "liquidada":
                    emb = _embed_vinte_um(rodada)
                else:
                    emb = ui.embed(
                        "⌛ Mesa encerrada",
                        categoria="erro",
                        descricao=f"A rodada expirou e ☾ **{rodada['aposta']} Lunaris** foram devolvidos.",
                    )
                await self.message.edit(embed=emb, view=self)
            except discord.HTTPException:
                log.info("nao consegui atualizar a mesa 21 expirada %s", self.rodada_id)


class Cassino(commands.Cog):
    grupo = app_commands.Group(name="cassino", description="Salão do Banco Lunar administrado pelo Banqueiro.")

    def __init__(self, bot):
        self.bot = bot
        registrar_reinicio_em_erro(self.ciclo_recuperacao, "ciclo_recuperacao_cassino", log)
        self.ciclo_recuperacao.start()
        registrar_reinicio_em_erro(self.ciclo_torneios, "ciclo_torneios_cassino", log)
        self.ciclo_torneios.start()

    def cog_unload(self):
        self.ciclo_recuperacao.cancel()
        self.ciclo_torneios.cancel()

    @staticmethod
    async def _erro(interaction: discord.Interaction, exc: Exception, *, editar_original: bool = True):
        if isinstance(exc, (CassinoIndisponivel, CassinoLimite, SaldoInsuficiente, RodadaCassinoConflito, ValueError)):
            mensagem = f"⚠️ {exc}"
        else:
            log.exception("erro no cassino", exc_info=exc)
            mensagem = "⚠️ O Banqueiro não conseguiu concluir esta rodada. Nenhum débito incompleto será mantido."
        if interaction.response.is_done() and editar_original:
            try:
                await interaction.edit_original_response(content=mensagem, embed=None, view=None)
            except discord.HTTPException:
                await interaction.followup.send(mensagem, ephemeral=True)
        elif interaction.response.is_done():
            await interaction.followup.send(mensagem, ephemeral=True)
        else:
            await interaction.response.send_message(mensagem, ephemeral=True)

    async def _confirmar(self, interaction, titulo: str, aposta: int, explicacao: str, executar):
        view = ConfirmarApostaView(interaction.user.id, executar)
        await interaction.response.send_message(
            embed=_embed_confirmacao(titulo, aposta, explicacao),
            view=view,
            ephemeral=True,
        )

    def _avaliar_novas_chaves(self, guild_id: str, user_id: str) -> list[str]:
        conquistas = self.bot.db.avaliar_conquistas_cassino(guild_id, user_id)
        return [item["chave"] for item in conquistas if item.get("nova")]

    def _avaliar_novas(self, guild_id: str, user_id: str) -> str:
        return _texto_conquistas_novas({
            "conquistas_novas": self._avaliar_novas_chaves(guild_id, user_id)
        })

    async def _liquidar_instantaneo(
        self, interaction: discord.Interaction, jogo: str, aposta: int,
        resultado: dict, multiplicador_maximo_bp: int,
    ) -> tuple[dict, dict]:
        if not interaction.response.is_done():
            await interaction.response.defer(ephemeral=True)
        rodada_id = f"{jogo}:{interaction.id}"
        maximo = regras.pagamento(aposta, multiplicador_maximo_bp)
        rodada = self.bot.db.iniciar_rodada_cassino(
            rodada_id, _sid(interaction), str(interaction.user.id), jogo,
            aposta, maximo, resultado, _hoje(),
        )
        resultado_real = rodada["estado"]
        if rodada["status"] == "ativa":
            rodada = self.bot.db.liquidar_rodada_cassino(
                rodada_id, str(interaction.user.id), int(resultado_real["pagamento"]),
                resultado_real, resultado_real,
            )
        if rodada["status"] == "liquidada":
            rodada = {
                **rodada,
                "conquistas_novas": self._avaliar_novas_chaves(
                    rodada["guild_id"], rodada["user_id"]
                ),
            }
        return rodada, resultado_real

    @grupo.command(name="abrir", description="Abre o salão de jogos do Banco Lunar.")
    async def abrir(self, interaction: discord.Interaction):
        cfg = self.bot.db.get_cassino_config(_sid(interaction))
        emb = ui.embed(
            "🏦 Salão do Banco Lunar",
            categoria="economia",
            descricao=(
                "Amadheus Colona mantém esta mesa do Banco Lunar fora das Árvores. "
                "Ela aceita somente **Lunaris da carteira**; cofre, cartão e empréstimos não entram.\n\n"
                "🎲 **Dados da Inconstância:** 2× em baixo/alto; 6× no número exato.\n"
                "🃏 **Vinte-e-Um de Amadheus:** compre, pare ou dobre contra o Banqueiro.\n"
                "☸️ **Roda das Dez Forças:** uma escolha entre nove Árvores e o Vazio; acerto paga 10×.\n"
                "⌛ **Sucessão de Chronus:** antes ou depois do Passo; o marco 7 devolve a aposta.\n"
                "🔻 **Queda pelo Interstício:** quatro desvios levam aos Vãos, ao centro ou às bordas.\n\n"
                "Toda aposta exibe regras e chances antes do botão de confirmação.\n"
                f"Mesa atual: ☾ **{cfg['aposta_minima']}–{cfg['aposta_maxima']}** por rodada."
            ),
        )
        await interaction.response.send_message(
            embed=emb, view=CassinoHubView(self, interaction.user.id), ephemeral=True
        )

    @grupo.command(name="dados", description="Aposta nos Dados da Inconstância de Ignis.")
    @app_commands.describe(aposta="Lunaris da carteira.", escolha="Baixo, alto ou número exato.", numero="Obrigatório se escolher número exato.")
    @app_commands.choices(escolha=DADOS_CHOICES)
    async def dados(
        self,
        interaction: discord.Interaction,
        aposta: app_commands.Range[int, 1, 1_000_000],
        escolha: app_commands.Choice[str],
        numero: app_commands.Range[int, 1, 6] | None = None,
    ):
        await self.pedir_confirmacao_dados(interaction, int(aposta), escolha.value, numero)

    async def pedir_confirmacao_dados(self, interaction, aposta: int, escolha: str, numero=None):
        escolha = str(escolha).strip().lower()
        if escolha not in regras.DADOS_PAGAMENTO_BP:
            await self._erro(interaction, ValueError("escolha de dados inválida"))
            return
        if escolha == "exato" and (numero is None or not 1 <= int(numero) <= 6):
            await self._erro(interaction, ValueError("informe um número exato entre 1 e 6"))
            return
        detalhe = (
            f"Você escolheu o número **{int(numero)}**. Chance: **1/6**; pagamento bruto: **6×**."
            if escolha == "exato"
            else f"Você escolheu **{escolha}**. Chance: **3/6 (50%)**; pagamento bruto: **2×**."
        )
        await self._confirmar(
            interaction, "Dados da Inconstância", aposta,
            "Ignis representa a mudança que não pode ser repetida de propósito. "
            + detalhe + " O dado é uniforme: cada face tem exatamente 1/6.",
            partial(self.executar_dados, aposta=aposta, escolha=escolha, numero=numero),
        )

    async def executar_dados(self, interaction: discord.Interaction, aposta: int, escolha: str, numero=None):
        try:
            if not interaction.response.is_done():
                await interaction.response.defer(ephemeral=True)
            resultado = regras.jogar_dados(escolha, aposta, numero)
            rodada, resultado = await self._liquidar_instantaneo(
                interaction, "dados", aposta, resultado,
                regras.DADOS_PAGAMENTO_BP[resultado["escolha"]],
            )
            ganhou = bool(resultado["venceu"])
            liquido = int(rodada["pagamento"]) - int(rodada["aposta"])
            titulo = "🎲 Ignis mudou o resultado a seu favor" if ganhou else "🎲 A Inconstância tomou outro rumo"
            descricao = (
                f"O dado caiu em **{resultado['dado']}**. Sua escolha: **{resultado['escolha']}**.\n"
                f"Aposta: ☾ **{rodada['aposta']}** · Pagamento: ☾ **{rodada['pagamento']}** · "
                f"Resultado líquido: {'+' if liquido >= 0 else ''}{liquido}."
                + _texto_conquistas_novas(rodada)
            )
            await interaction.edit_original_response(embed=ui.embed(titulo, categoria="economia", descricao=descricao), view=None)
        except Exception as exc:
            await self._erro(interaction, exc)

    @grupo.command(name="roda_fluxos", description="Escolhe uma força na Roda das Dez Forças.")
    @app_commands.choices(forca=RODA_CHOICES)
    async def roda_fluxos(
        self, interaction: discord.Interaction,
        aposta: app_commands.Range[int, 1, 1_000_000],
        forca: app_commands.Choice[str],
    ):
        info = regras.FORCAS_DA_RODA[forca.value]
        await self._confirmar(
            interaction, "Roda das Dez Forças", int(aposta),
            f"Você escolheu {info['emoji']} **{info['nome']}**. A roda contém as nove Árvores e o Vazio, "
            "todos com chance uniforme de **1/10 (10%)**. Acerto paga **10×**; qualquer outro símbolo paga 0. "
            "Retorno teórico: **100%**.",
            partial(self.executar_roda_fluxos, aposta=int(aposta), escolha=forca.value),
        )

    async def executar_roda_fluxos(self, interaction, aposta: int, escolha: str):
        try:
            resultado = regras.jogar_roda_fluxos(escolha, aposta)
            rodada, resultado = await self._liquidar_instantaneo(
                interaction, "roda_fluxos", aposta, resultado, 100_000
            )
            escolhida = regras.FORCAS_DA_RODA[resultado["escolha"]]
            sorteada = regras.FORCAS_DA_RODA[resultado["sorteada"]]
            liquido = int(rodada["pagamento"]) - int(rodada["aposta"])
            emb = ui.embed(
                "☸️ A Roda das Dez Forças parou",
                categoria="economia",
                descricao=(
                    f"Escolha: {escolhida['emoji']} **{escolhida['nome']}**\n"
                    f"Resultado: {sorteada['emoji']} **{sorteada['nome']}**\n\n"
                    f"Aposta: ☾ **{rodada['aposta']}** · Pagamento: ☾ **{rodada['pagamento']}** · "
                    f"Líquido: {'+' if liquido >= 0 else ''}{liquido}."
                    + _texto_conquistas_novas(rodada)
                ),
            )
            await interaction.edit_original_response(embed=emb, view=None)
        except Exception as exc:
            await self._erro(interaction, exc)

    @grupo.command(name="sucessao", description="Aposta antes ou depois do Passo de Chronus.")
    @app_commands.choices(lado=SUCESSAO_CHOICES)
    async def sucessao(
        self, interaction: discord.Interaction,
        aposta: app_commands.Range[int, 1, 1_000_000],
        lado: app_commands.Choice[str],
    ):
        await self._confirmar(
            interaction, "Sucessão de Chronus", int(aposta),
            f"Você escolheu **{lado.name}**. Um marco uniforme de 1 a 13 será revelado: "
            "**6/13** vencem e pagam **2×**, **1/13** cai no Passo (7) e devolve a aposta, "
            "e **6/13** perdem. Retorno teórico: **100%**.",
            partial(self.executar_sucessao, aposta=int(aposta), escolha=lado.value),
        )

    async def executar_sucessao(self, interaction, aposta: int, escolha: str):
        try:
            resultado = regras.jogar_sucessao(escolha, aposta)
            rodada, resultado = await self._liquidar_instantaneo(
                interaction, "sucessao", aposta, resultado, 20_000
            )
            nomes = {"antes": "antes do Passo", "depois": "depois do Passo", "passo": "no Passo"}
            liquido = int(rodada["pagamento"]) - int(rodada["aposta"])
            emb = ui.embed(
                "⌛ A Sucessão revelou um marco",
                categoria="economia",
                descricao=(
                    f"O marcador parou em **{resultado['marco']}**, {nomes[resultado['lado']]}.\n"
                    f"Sua escolha: **{nomes[resultado['escolha']]}**.\n\n"
                    f"Aposta: ☾ **{rodada['aposta']}** · Pagamento: ☾ **{rodada['pagamento']}** · "
                    f"Líquido: {'+' if liquido >= 0 else ''}{liquido}."
                    + _texto_conquistas_novas(rodada)
                ),
            )
            await interaction.edit_original_response(embed=emb, view=None)
        except Exception as exc:
            await self._erro(interaction, exc)

    @grupo.command(name="vaos", description="Deixa uma ficha cair pelos Vãos de Aperion.")
    async def vaos(
        self, interaction: discord.Interaction,
        aposta: app_commands.Range[int, 1, 1_000_000],
    ):
        await self._confirmar(
            interaction, "Queda pelo Interstício", int(aposta),
            "A ficha sofre **quatro desvios independentes de 50%**. As duas bordas somam **2/16** e pagam **4×**; "
            "os Vãos laterais somam **8/16** e devolvem a aposta; o Interstício central ocupa **6/16** e paga 0. "
            "Retorno teórico: **100%**.",
            partial(self.executar_vaos, aposta=int(aposta)),
        )

    async def executar_vaos(self, interaction, aposta: int):
        try:
            resultado = regras.jogar_vaos(aposta)
            rodada, resultado = await self._liquidar_instantaneo(
                interaction, "vaos", aposta, resultado, 40_000
            )
            caminho = " ".join("→" if passo else "←" for passo in resultado["passos"])
            liquido = int(rodada["pagamento"]) - int(rodada["aposta"])
            emb = ui.embed(
                "🔻 A ficha atravessou os Vãos",
                categoria="economia",
                descricao=(
                    f"Desvios: **{caminho}**\nDestino: **{resultado['destino']}** · "
                    f"pagamento **{resultado['multiplicador_bp'] / 10_000:g}×**.\n\n"
                    f"Aposta: ☾ **{rodada['aposta']}** · Pagamento: ☾ **{rodada['pagamento']}** · "
                    f"Líquido: {'+' if liquido >= 0 else ''}{liquido}."
                    + _texto_conquistas_novas(rodada)
                ),
            )
            await interaction.edit_original_response(embed=emb, view=None)
        except Exception as exc:
            await self._erro(interaction, exc)

    @grupo.command(name="vinte_um", description="Inicia uma mesa de Vinte-e-Um de Amadheus.")
    @app_commands.describe(aposta="Lunaris da carteira.")
    async def vinte_um(self, interaction: discord.Interaction, aposta: app_commands.Range[int, 1, 1_000_000]):
        await self.pedir_confirmacao_vinte_um(interaction, int(aposta))

    async def pedir_confirmacao_vinte_um(self, interaction, aposta: int):
        await self._confirmar(
            interaction, "Vinte-e-Um de Amadheus", aposta,
            "Um baralho padrão de **52 cartas** é embaralhado. Você pode comprar, parar ou dobrar; "
            "o Banqueiro compra até 17. Vitória paga **2×**, empate devolve e 21 natural paga **2,5×**. "
            "A chance não é fixa porque depende das cartas e das suas decisões.",
            partial(self.iniciar_vinte_um, aposta=aposta),
        )

    async def iniciar_vinte_um(self, interaction: discord.Interaction, aposta: int):
        try:
            if not interaction.response.is_done():
                await interaction.response.defer(ephemeral=True)
            estado = regras.novo_vinte_um()
            rodada_id = f"vinte-um:{interaction.id}"
            maximo = regras.pagamento(aposta, regras.VINTE_UM_PAGAMENTO_BP["vinte_um_natural"])
            rodada = self.bot.db.iniciar_rodada_cassino(
                rodada_id, _sid(interaction), str(interaction.user.id), "vinte_um",
                aposta, maximo, estado, _hoje(),
            )
            rodada = self._liquidar_21_se_final(rodada)
            if rodada["status"] != "ativa":
                await interaction.edit_original_response(embed=_embed_vinte_um(rodada), view=None)
                return
            view = VinteUmView(self, rodada_id, interaction.user.id)
            await interaction.edit_original_response(embed=_embed_vinte_um(rodada), view=view)
            view.message = await interaction.original_response()
        except Exception as exc:
            await self._erro(interaction, exc)

    def _liquidar_21_se_final(self, rodada: dict) -> dict:
        estado = rodada["estado"]
        if rodada["status"] == "ativa" and estado.get("status") == "finalizada":
            valor = regras.pagamento_vinte_um(estado, int(rodada["aposta"]))
            liquidada = self.bot.db.liquidar_rodada_cassino(
                rodada["id"], rodada["user_id"], valor,
                {"resultado": estado["resultado"], "dobrada": bool(estado.get("dobrada"))}, estado,
            )
            conquistas = self.bot.db.avaliar_conquistas_cassino(liquidada["guild_id"], liquidada["user_id"])
            return {
                **liquidada,
                "conquistas_novas": [item["chave"] for item in conquistas if item.get("nova")],
            }
        return rodada

    async def agir_vinte_um(
        self, interaction: discord.Interaction, rodada_id: str, acao: str, view: VinteUmView
    ):
        try:
            await interaction.response.defer()
            rodada = self.bot.db.get_rodada_cassino(rodada_id, str(interaction.user.id))
            if not rodada:
                raise RodadaCassinoConflito("mesa não encontrada")
            rodada = self._liquidar_21_se_final(rodada)
            if rodada["status"] != "ativa":
                view.desabilitar()
                await interaction.edit_original_response(embed=_embed_vinte_um(rodada), view=view)
                return
            novo_estado = regras.agir_vinte_um(rodada["estado"], acao)
            extra = int(rodada["aposta"]) if acao == "dobrar" else 0
            nova_aposta = int(rodada["aposta"]) + extra
            maximo = regras.pagamento(nova_aposta, regras.VINTE_UM_PAGAMENTO_BP["vinte_um_natural"])
            rodada = self.bot.db.atualizar_rodada_cassino(
                rodada_id, str(interaction.user.id), int(rodada["versao"]), novo_estado,
                aposta_extra=extra, pagamento_maximo=maximo,
            )
            rodada = self._liquidar_21_se_final(rodada)
            if rodada["status"] != "ativa":
                view.desabilitar()
            await interaction.edit_original_response(embed=_embed_vinte_um(rodada), view=view)
        except Exception as exc:
            await self._erro(interaction, exc, editar_original=False)

    @grupo.command(name="historico", description="Mostra suas últimas rodadas e o saldo líquido delas.")
    async def historico(self, interaction: discord.Interaction):
        await self.mostrar_historico(interaction)

    async def mostrar_historico(self, interaction: discord.Interaction):
        rodadas = self.bot.db.listar_rodadas_cassino(_sid(interaction), str(interaction.user.id), 10)
        if not rodadas:
            mensagem = "Você ainda não jogou no Salão do Banco Lunar."
            if interaction.response.is_done():
                await interaction.followup.send(mensagem, ephemeral=True)
            else:
                await interaction.response.send_message(mensagem, ephemeral=True)
            return
        linhas = []
        nomes_jogos = {
            "dados": "Dados da Inconstância",
            "vinte_um": "Vinte-e-Um de Amadheus",
            "roda_fluxos": "Roda das Dez Forças",
            "sucessao": "Sucessão de Chronus",
            "vaos": "Queda pelo Interstício",
            "corrida": "Corrida das Árvores",
        }
        for rodada in rodadas:
            liquido = int(rodada["pagamento"]) - int(rodada["aposta"])
            linhas.append(
                f"• **{nomes_jogos.get(rodada['jogo'], rodada['jogo'])}** · ☾ {rodada['aposta']} → {rodada['pagamento']} "
                f"· líquido {'+' if liquido >= 0 else ''}{liquido} · {rodada['status']}"
            )
        emb = ui.embed("📜 Meu livro-caixa no Banco Lunar", categoria="economia", descricao="\n".join(linhas))
        if interaction.response.is_done():
            await interaction.followup.send(embed=emb, ephemeral=True)
        else:
            await interaction.response.send_message(embed=emb, ephemeral=True)

    @grupo.command(name="corrida", description="Mostra a Corrida das Árvores e seu bolo de apostas.")
    async def corrida(self, interaction: discord.Interaction):
        await self.mostrar_corrida(interaction)

    async def mostrar_corrida(self, interaction: discord.Interaction):
        sid, uid = _sid(interaction), str(interaction.user.id)
        slot, fecha = _janela_corrida()
        corrida = self.bot.db.obter_ou_criar_corrida(sid, slot, fecha)
        resumo = self.bot.db.resumo_corrida(corrida["id"], sid, uid)
        linhas = []
        for chave, info in regras.CORREDORES_ASTRAIS.items():
            bolo = resumo["por_corredor"][chave]
            linhas.append(
                f"{info['emoji']} **{info['nome']}** · chance {info['peso']}% · "
                f"☾ {bolo['total']} em {bolo['apostadores']} aposta(s)"
            )
        total = sum(item["total"] for item in resumo["por_corredor"].values())
        descricao = (
            "\n".join(linhas)
            + f"\n\nBolo atual: ☾ **{total} Lunaris** · 100% vai aos vencedores.\n"
            + f"Apostas fecham {discord.utils.format_dt(corrida['fecha_em'], style='R')}."
        )
        if resumo["minha"]:
            info = regras.CORREDORES_ASTRAIS[resumo["minha"]["corredor"]]
            descricao += f"\nSua aposta: ☾ **{resumo['minha']['valor']}** em {info['emoji']} **{info['nome']}**."
        descricao += "\n\nUse `/cassino corrida_apostar` para participar."
        emb = ui.embed("🏁 Corrida das Árvores", categoria="economia", descricao=descricao)
        if interaction.response.is_done():
            await interaction.followup.send(embed=emb, ephemeral=True)
        else:
            await interaction.response.send_message(embed=emb, ephemeral=True)

    @grupo.command(name="corrida_apostar", description="Aposta em um estandarte da Corrida das Árvores.")
    @app_commands.choices(corredor=CORREDORES_CHOICES)
    async def corrida_apostar(
        self,
        interaction: discord.Interaction,
        corredor: app_commands.Choice[str],
        valor: app_commands.Range[int, 1, 1_000_000],
    ):
        info = regras.CORREDORES_ASTRAIS[corredor.value]
        await self._confirmar(
            interaction, "Corrida das Árvores", int(valor),
            f"Você escolheu {info['emoji']} **{info['nome']}**. Os quatro estandartes têm chance igual de "
            "**1/4 (25%)**. O bolo inteiro é dividido proporcionalmente entre quem escolheu o vencedor; "
            "por isso o multiplicador depende das apostas dos demais. Se ninguém escolheu o vencedor, "
            "todo o bolo retorna proporcionalmente aos participantes.",
            partial(self.executar_corrida_aposta, corredor=corredor.value, valor=int(valor)),
        )

    async def executar_corrida_aposta(self, interaction, corredor: str, valor: int):
        try:
            if not interaction.response.is_done():
                await interaction.response.defer(ephemeral=True)
            sid, uid = _sid(interaction), str(interaction.user.id)
            slot, fecha = _janela_corrida()
            corrida = self.bot.db.obter_ou_criar_corrida(sid, slot, fecha)
            aposta = self.bot.db.apostar_corrida(
                f"corrida:{interaction.id}", corrida["id"], sid, uid,
                corredor, int(valor), _hoje(),
            )
            info = regras.CORREDORES_ASTRAIS[aposta["corredor"]]
            await interaction.edit_original_response(
                content=(
                    f"🏁 Aposta registrada: ☾ **{aposta['valor']} Lunaris** em "
                    f"{info['emoji']} **{info['nome']}**. Resultado publicado pelo Jornalista "
                    f"{discord.utils.format_dt(corrida['fecha_em'], style='R')}."
                ),
                embed=None,
                view=None,
            )
        except Exception as exc:
            await self._erro(interaction, exc)

    @grupo.command(name="limites", description="Mostra limites, perdas e volume apostado hoje.")
    async def limites(self, interaction: discord.Interaction):
        await self.mostrar_limites(interaction)

    async def mostrar_limites(self, interaction: discord.Interaction):
        sid, uid = _sid(interaction), str(interaction.user.id)
        cfg = self.bot.db.get_cassino_config(sid)
        perfil = self.bot.db.perfil_cassino(sid, uid, _hoje())
        pausa = (
            discord.utils.format_dt(perfil["pausado_ate"], style="R")
            if perfil["pausado_ate"] and perfil["pausado_ate"] > datetime.now(timezone.utc)
            else "não"
        )
        emb = ui.embed(
            "🛡️ Limites do Salão",
            categoria="economia",
            descricao=(
                f"Por rodada: ☾ **{cfg['aposta_minima']}–{cfg['aposta_maxima']}**\n"
                f"Apostado hoje: ☾ **{perfil['apostado']}/{cfg['limite_apostado_dia']}**\n"
                f"Perda líquida hoje: ☾ **{perfil['perda_liquida']}/{cfg['limite_perda_dia']}**\n"
                f"Pausa ativa: **{pausa}**\n\nUse `/cassino pausa` para bloquear novas apostas por 1, 7 ou 30 dias."
            ),
        )
        if interaction.response.is_done():
            await interaction.followup.send(embed=emb, ephemeral=True)
        else:
            await interaction.response.send_message(embed=emb, ephemeral=True)

    @grupo.command(name="torneio", description="Mostra o Pote das Dez Árvores e seus itens.")
    async def torneio(self, interaction: discord.Interaction):
        await self.mostrar_torneio(interaction)

    async def mostrar_torneio(self, interaction: discord.Interaction):
        sid, uid = _sid(interaction), str(interaction.user.id)
        semana, fecha = _janela_torneio()
        torneio = self.bot.db.obter_ou_criar_torneio(sid, semana, fecha)
        resumo = self.bot.db.resumo_torneio(torneio["id"], sid, uid)
        linhas = [
            f"• **{entrada['titulo']}** ({entrada['raridade']}) · <@{entrada['user_id']}>"
            for entrada in resumo["entradas"][:20]
        ] or ["Ainda não há itens confirmados no pote."]
        minha = ""
        if resumo["minha"]:
            minha = f"\nSua inscrição: **{resumo['minha']['titulo']}** · {resumo['minha']['status']}."
        emb = ui.embed(
            "🏆 Pote das Dez Árvores",
            categoria="economia",
            descricao=(
                "Cada participante deposita **uma unidade duplicada** comum ou incomum. "
                "Uma unidade obrigatoriamente fica com o dono; itens únicos, de missão ou dependentes do mestre são bloqueados.\n\n"
                + "\n".join(linhas)
                + f"\n\nInscrições fecham {discord.utils.format_dt(torneio['fecha_em'], style='R')}."
                + minha
                + "\nUse `/cassino torneio_entrar` para escolher um item elegível."
            ),
        )
        await interaction.response.send_message(embed=emb, ephemeral=True)

    @grupo.command(name="torneio_entrar", description="Deposita um item duplicado no Pote das Dez Árvores.")
    async def torneio_entrar(self, interaction: discord.Interaction, item: str):
        sid, uid = _sid(interaction), str(interaction.user.id)
        try:
            posses = {posse.item_id: posse for posse in await self.bot.inventario.listar(sid, uid)}
            posse = posses.get(item)
            if posse is None or posse.quantidade < 2:
                raise CassinoLimite("você precisa ter pelo menos duas unidades; uma sempre fica com você")
            catalogo_item = self.bot.catalogo.get(item)
            elegivel, motivo = regras.item_elegivel_torneio(catalogo_item)
            if not elegivel:
                raise CassinoLimite(motivo)
            view = ConfirmarApostaView(
                interaction.user.id,
                partial(self.executar_entrada_torneio, item=item),
            )
            emb = ui.embed(
                "Confirmar · Pote das Dez Árvores",
                categoria="economia",
                descricao=(
                    f"Você vai depositar **1× {posse.titulo}** ({catalogo_item.raridade_rotulo}). "
                    f"Das suas **{posse.quantidade}** unidades, pelo menos uma continuará com você.\n\n"
                    "Cada participante confirmado tem **uma chance igual** de receber todos os itens do pote. "
                    "A chance exata depende do total de participantes quando as inscrições fecharem. "
                    "Quem não vencer perde a unidade depositada. O sorteio usa a mesma fonte criptográfica dos jogos.\n\n"
                    "O item só será reservado depois de você confirmar."
                ),
            )
            await interaction.response.send_message(embed=emb, view=view, ephemeral=True)
        except (CassinoIndisponivel, CassinoLimite, ItemIndisponivel, CofreIndisponivel, ValueError) as exc:
            await self._erro(interaction, exc)
        except Exception as exc:
            await self._erro(interaction, exc)

    async def executar_entrada_torneio(self, interaction: discord.Interaction, item: str):
        sid, uid = _sid(interaction), str(interaction.user.id)
        try:
            # Revalida depois da confirmação: inventário e janela podem mudar
            # enquanto o jogador lê as regras.
            posses = {posse.item_id: posse for posse in await self.bot.inventario.listar(sid, uid)}
            posse = posses.get(item)
            if posse is None or posse.quantidade < 2:
                raise CassinoLimite("você precisa ter pelo menos duas unidades; uma sempre fica com você")
            catalogo_item = self.bot.catalogo.get(item)
            elegivel, motivo = regras.item_elegivel_torneio(catalogo_item)
            if not elegivel:
                raise CassinoLimite(motivo)
            await interaction.response.defer(ephemeral=True)
            semana, fecha = _janela_torneio()
            torneio = self.bot.db.obter_ou_criar_torneio(sid, semana, fecha)
            modo = self.bot.inventario.modo(sid, uid)
            entrada = self.bot.db.criar_entrada_torneio_pendente(
                torneio["id"], sid, uid, item, posse.titulo, posse.tipo,
                catalogo_item.raridade, modo,
            )
            if entrada["item_id"] != item:
                raise CassinoLimite("você já escolheu outro item neste torneio")
            if entrada["status"] == "pendente":
                if modo == "cofre":
                    await self.bot.inventario.reservar(
                        sid, uid, item, 1,
                        origem="banqueiro",
                        referencia=entrada["referencia"],
                        motivo="Pote das Dez Árvores",
                        expira_em=(fecha + timedelta(days=7)).isoformat(),
                    )
                    restantes = {
                        atual.item_id: atual.quantidade
                        for atual in await self.bot.inventario.listar(sid, uid)
                    }
                    if restantes.get(item, 0) < 1:
                        await self.bot.inventario.resolver_reserva(
                            sid, origem="banqueiro", referencia=entrada["referencia"]
                        )
                        raise CassinoLimite(
                            "a reserva deixaria você sem nenhuma cópia; o item foi devolvido"
                        )
                    entrada = self.bot.db.confirmar_entrada_torneio_cofre(entrada["id"])
                else:
                    entrada = self.bot.db.confirmar_entrada_torneio_legado(entrada["id"])
            await interaction.edit_original_response(
                content=(
                    f"✅ **{entrada['titulo']}** entrou no pote. Você ainda mantém pelo menos uma unidade."
                    + self._avaliar_novas(sid, uid)
                ),
                embed=None,
            )
        except (CassinoIndisponivel, CassinoLimite, ItemIndisponivel, CofreIndisponivel, ValueError) as exc:
            await self._erro(interaction, exc)
        except Exception as exc:
            await self._erro(interaction, exc)

    @torneio_entrar.autocomplete("item")
    async def torneio_entrar_ac(self, interaction: discord.Interaction, current: str):
        sid, uid = _sid(interaction), str(interaction.user.id)
        try:
            opcoes = []
            for posse in await self.bot.inventario.listar(sid, uid):
                if posse.quantidade < 2:
                    continue
                item = self.bot.catalogo.get(posse.item_id)
                elegivel, _ = regras.item_elegivel_torneio(item)
                if not elegivel:
                    continue
                texto = f"{posse.titulo} ×{posse.quantidade} ({item.raridade_rotulo})"
                if current.lower() in texto.lower():
                    opcoes.append(app_commands.Choice(name=texto[:100], value=posse.item_id))
            return opcoes[:25]
        except Exception:
            log.exception("falha no autocomplete do torneio")
            return []

    @grupo.command(name="contratos", description="Mostra o mandato semanal de atividades do Banco Lunar.")
    async def contratos(self, interaction: discord.Interaction):
        semana = regras.semana_local()
        resumo = self.bot.db.resumo_contrato(_sid(interaction), str(interaction.user.id), semana)
        linhas = []
        for chave, info in regras.OBJETIVOS_CONTRATO.items():
            marca = "✅" if chave in resumo["concluidos"] else "⬜"
            exemplos = ", ".join(sorted(info["comandos"])[:2])
            linhas.append(f"{marca} {info['emoji']} **{info['nome']}** · `{exemplos}`")
        estado = (
            "Recompensa já resgatada."
            if resumo["resgatado"]
            else f"Progresso: **{resumo['quantidade']}/{resumo['necessarios']}** categorias."
        )
        emb = ui.embed(
            "📋 Mandato Semanal do Banco Lunar",
            categoria="economia",
            descricao=(
                "Use sistemas diferentes durante a semana; quantidade gasta não aumenta o prêmio.\n\n"
                + "\n".join(linhas)
                + f"\n\n{estado}\nRecompensa: ☾ **{regras.CONTRATO_RECOMPENSA_LUNARIS}** + "
                f"**{regras.CONTRATO_RECOMPENSA_REPUTACAO} reputação**. Use `/cassino contrato_resgatar`."
            ),
        )
        await interaction.response.send_message(embed=emb, ephemeral=True)

    @grupo.command(name="contrato_resgatar", description="Resgata a recompensa do mandato semanal concluído.")
    async def contrato_resgatar(self, interaction: discord.Interaction):
        try:
            resgate = self.bot.db.resgatar_contrato(
                _sid(interaction), str(interaction.user.id), regras.semana_local()
            )
            if not resgate["novo"]:
                await interaction.response.send_message("Você já resgatou o mandato desta semana.", ephemeral=True)
                return
            await interaction.response.send_message(
                f"✅ Mandato cumprido: recebeu ☾ **{resgate['lunaris']} Lunaris** e "
                f"**{resgate['reputacao']} pontos de reputação**."
                + self._avaliar_novas(_sid(interaction), str(interaction.user.id)),
                ephemeral=True,
            )
        except Exception as exc:
            await self._erro(interaction, exc)

    @grupo.command(name="conquistas", description="Mostra seus registros permanentes no Banco Lunar.")
    async def conquistas(self, interaction: discord.Interaction):
        sid, uid = _sid(interaction), str(interaction.user.id)
        desbloqueadas = {
            item["chave"]: item for item in self.bot.db.avaliar_conquistas_cassino(sid, uid)
        }
        linhas = []
        for chave, (nome, descricao) in regras.CONQUISTAS.items():
            marca = "🏆" if chave in desbloqueadas else "🔒"
            linhas.append(f"{marca} **{nome}** — {descricao}")
        emb = ui.embed(
            "🏆 Registros de Amadheus",
            categoria="economia",
            descricao="\n".join(linhas) + "\n\nConquistas são cosméticas e não alteram probabilidades.",
        )
        await interaction.response.send_message(embed=emb, ephemeral=True)

    @grupo.command(name="pausa", description="Bloqueia voluntariamente novas apostas por um período.")
    @app_commands.choices(dias=PAUSA_CHOICES)
    async def pausa(self, interaction: discord.Interaction, dias: app_commands.Choice[int]):
        ate = datetime.now(timezone.utc) + timedelta(days=int(dias.value))
        self.bot.db.pausar_cassino(_sid(interaction), str(interaction.user.id), ate)
        await interaction.response.send_message(
            f"🛡️ Novas apostas bloqueadas até {discord.utils.format_dt(ate, style='F')}. "
            "A pausa não pode ser removida antes do prazo."
            + self._avaliar_novas(_sid(interaction), str(interaction.user.id)),
            ephemeral=True,
        )

    @grupo.command(name="regras", description="Mostra probabilidades, pagamentos e origem da aleatoriedade.")
    async def regras_comando(self, interaction: discord.Interaction):
        emb = ui.embed(
            "📖 Livro de regras do Banco Lunar",
            categoria="economia",
            descricao=(
                "• Dados da Inconstância: baixo/alto **3/6 e 2×**; exato **1/6 e 6×**. RTP **100%**.\n"
                "• Roda das Dez Forças: cada símbolo **1/10**; acerto **10×**. RTP **100%**.\n"
                "• Sucessão: vitória **6/13 e 2×**; Passo **1/13 e 1×**; derrota **6/13**. RTP **100%**.\n"
                "• Queda: bordas **2/16 e 4×**; Vãos **8/16 e 1×**; centro **6/16 e 0×**. RTP **100%**.\n"
                "• Corrida: quatro estandartes com **25%** cada; o bolo inteiro é distribuído.\n"
                "• Vinte-e-Um: vitória **2×**, empate **1×**, natural **2,5×**; a chance depende das decisões.\n"
                "• Sorteios usam `secrets.SystemRandom`, alimentado pela fonte criptográfica do sistema operacional.\n"
                "• Saldo, histórico, sequência, horário e jogador **não alteram** nenhum resultado.\n"
                "• Apostas usam só Lunaris da carteira e respeitam limites diários.\n"
                "• Rodadas interrompidas são liquidadas pelo estado salvo ou reembolsadas.\n"
                "• Mandatos premiam variedade de sistemas, nunca volume apostado ou perdas.\n"
                "• Não existe conversão para dinheiro real."
            ),
        )
        await interaction.response.send_message(embed=emb, ephemeral=True)

    @grupo.command(name="auditoria", description="Mostra a distribuição pública dos resultados já sorteados.")
    async def auditoria(self, interaction: discord.Interaction):
        dados = self.bot.db.auditoria_sorteios_cassino(_sid(interaction))

        def serie(valores, chaves):
            return " · ".join(f"{chave}: **{valores.get(str(chave), 0)}**" for chave in chaves)

        roda = " · ".join(
            f"{info['emoji']} **{dados['roda_fluxos'].get(chave, 0)}**"
            for chave, info in regras.FORCAS_DA_RODA.items()
        )
        corrida = " · ".join(
            f"{info['emoji']} **{dados['corrida'].get(chave, 0)}**"
            for chave, info in regras.CORREDORES_ASTRAIS.items()
        )
        marcos = dados["sucessao"]
        antes = sum(marcos.get(str(i), 0) for i in range(1, 7))
        passo = marcos.get("7", 0)
        depois = sum(marcos.get(str(i), 0) for i in range(8, 14))
        emb = ui.embed(
            "🔍 Auditoria pública dos sorteios",
            categoria="economia",
            descricao=(
                f"**Dados** · esperado 1/6 por face\n{serie(dados['dados'], range(1, 7))}\n\n"
                f"**Roda** · esperado 1/10 por símbolo\n{roda}\n\n"
                f"**Sucessão** · esperado 6/13 · 1/13 · 6/13\n"
                f"antes: **{antes}** · Passo: **{passo}** · depois: **{depois}**\n\n"
                f"**Queda** · esperado por posição 1/16 · 4/16 · 6/16 · 4/16 · 1/16\n"
                f"{serie(dados['vaos'], range(5))}\n\n"
                f"**Corrida** · esperado 25% por estandarte\n{corrida}\n\n"
                "Amostras pequenas normalmente ficam desiguais; isso não significa viés. "
                "A auditoria não expõe jogadores nem valores apostados. O 21 não aparece porque suas chances mudam com as decisões."
            ),
        )
        await interaction.response.send_message(embed=emb, ephemeral=True)

    @grupo.command(name="configurar", description="[Mestre] Configura abertura e limites do Salão.")
    @app_commands.checks.has_permissions(manage_guild=True)
    async def configurar(
        self,
        interaction: discord.Interaction,
        ativo: bool,
        aposta_minima: app_commands.Range[int, 1, 1_000_000],
        aposta_maxima: app_commands.Range[int, 1, 1_000_000],
        limite_apostado_dia: app_commands.Range[int, 1, 10_000_000],
        limite_perda_dia: app_commands.Range[int, 1, 10_000_000],
    ):
        try:
            cfg = self.bot.db.configurar_cassino(
                _sid(interaction), ativo=ativo, aposta_minima=aposta_minima,
                aposta_maxima=aposta_maxima, limite_apostado_dia=limite_apostado_dia,
                limite_perda_dia=limite_perda_dia,
            )
            await interaction.response.send_message(
                f"✅ Salão {'aberto' if cfg['ativo'] else 'fechado'}; mesa ☾ {cfg['aposta_minima']}–{cfg['aposta_maxima']}.",
                ephemeral=True,
            )
        except Exception as exc:
            await self._erro(interaction, exc)

    @grupo.command(name="diagnostico", description="[Mestre] Mostra volume, retorno e resultado da casa.")
    @app_commands.checks.has_permissions(manage_guild=True)
    async def diagnostico(self, interaction: discord.Interaction):
        d = self.bot.db.diagnostico_cassino(_sid(interaction))
        emb = ui.embed(
            "🏦 Diagnóstico do Salão",
            categoria="economia",
            descricao=(
                f"Rodadas liquidadas: **{d['rodadas']}** · jogadores: **{d['jogadores']}**\n"
                f"Apostado: ☾ **{d['apostado']}** · pago: ☾ **{d['pago']}**\n"
                f"Resultado da casa: ☾ **{d['resultado_casa']}** · RTP real: **{d['rtp']:.1%}**\n"
                f"Rodadas ainda ativas: **{d['ativas']}**"
            ),
        )
        await interaction.response.send_message(embed=emb, ephemeral=True)

    @tasks.loop(minutes=5)
    async def ciclo_recuperacao(self):
        expiradas = self.bot.db.listar_rodadas_cassino_expiradas(
            datetime.now(timezone.utc) - timedelta(minutes=10)
        )
        for rodada in expiradas:
            try:
                estado = rodada["estado"]
                if rodada["jogo"] in {"dados", "roda_fluxos", "sucessao", "vaos"} and "pagamento" in estado:
                    self.bot.db.liquidar_rodada_cassino(
                        rodada["id"], rodada["user_id"], int(estado["pagamento"]), estado, estado
                    )
                elif rodada["jogo"] == "vinte_um" and estado.get("status") == "finalizada":
                    self._liquidar_21_se_final(rodada)
                else:
                    self.bot.db.reembolsar_rodada_cassino(rodada["id"], "reinício ou inatividade")
            except Exception:
                log.exception("falha ao recuperar rodada do cassino %s", rodada["id"])

    @ciclo_recuperacao.before_loop
    async def _antes_recuperacao(self):
        await self.bot.wait_until_ready()

    @tasks.loop(minutes=5)
    async def ciclo_torneios(self):
        for torneio in self.bot.db.listar_torneios_pendentes(datetime.now(timezone.utc)):
            try:
                resultado = self.bot.db.sortear_torneio(torneio["id"])
                if resultado["status"] == "sem_entradas":
                    continue
                vencedor = resultado["vencedor_user_id"]
                for entrada in resultado["entradas"]:
                    if entrada["status"] == "entregue":
                        continue
                    if entrada["modo_posse"] == "cofre":
                        status = await self.bot.inventario.resolver_reserva(
                            entrada["guild_id"], origem="banqueiro",
                            referencia=entrada["referencia"], destino_user_id=vencedor,
                        )
                        if status != "entregue":
                            raise CofreIndisponivel(f"reserva terminou como {status}")
                        self.bot.db.marcar_entrada_torneio_cofre_entregue(entrada["id"])
                    elif self.bot.inventario.modo(entrada["guild_id"], vencedor) == "legado":
                        self.bot.db.entregar_entrada_torneio_legado(entrada["id"], vencedor)
                    else:
                        await self.bot.inventario.dar(
                            entrada["guild_id"], vencedor, entrada["item_id"],
                            entrada["titulo"], entrada["tipo"], 1,
                            motivo="Prêmio do Pote das Dez Árvores",
                            chave=f"{entrada['referencia']}:premio",
                        )
                        self.bot.db.marcar_entrada_torneio_entregue_externamente(entrada["id"])
                concluido = self.bot.db.concluir_torneio(torneio["id"])
                if concluido:
                    conquista = self._avaliar_novas(torneio["guild_id"], vencedor)
                    self.bot.db.criar_aviso(
                        torneio["guild_id"],
                        f"🏆 <@{vencedor}> venceu o Pote das Dez Árvores e recebeu "
                        f"{len(resultado['entradas'])} item(ns) do pote!{conquista}",
                    )
            except Exception:
                log.exception("falha ao resolver Pote das Dez Árvores %s", torneio["id"])

    @ciclo_torneios.before_loop
    async def _antes_torneios(self):
        await self.bot.wait_until_ready()


async def setup(bot):
    await bot.add_cog(Cassino(bot))
