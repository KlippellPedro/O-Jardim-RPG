"""Serviços bancários: alertas, seguro do cofre e diagnóstico econômico."""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Optional

import discord
from discord import app_commands
from discord.ext import commands, tasks

from core import economia, ui
from core.db import SaldoInsuficiente
from core.tasks_util import registrar_reinicio_em_erro

log = logging.getLogger("banqueiro")

ALERTAS = {
    "seguranca": "Roubo e segurança",
    "pagamentos": "Pagamentos recebidos",
    "mercado": "Leilões e trocas",
    "emprestimos": "Empréstimos e vencimentos",
    "rendimentos": "Juros e investimentos",
}
ALERTA_CHOICES = [
    app_commands.Choice(name=rotulo, value=chave)
    for chave, rotulo in ALERTAS.items()
]
SEGURO_ACOES = [
    app_commands.Choice(name="Ver situação", value="ver"),
    app_commands.Choice(name="Assinar/renovar 30 dias", value="assinar"),
    app_commands.Choice(name="Ligar renovação automática", value="auto_ligar"),
    app_commands.Choice(name="Desligar renovação automática", value="auto_desligar"),
]


async def enviar_alerta_banco(
    bot,
    guild_id: str,
    usuario: discord.abc.User,
    categoria: str,
    texto: str,
    *,
    obrigatorio: bool = False,
) -> bool:
    """Envia DM respeitando preferências; nunca derruba a operação principal."""
    if not obrigatorio and not bot.db.alerta_banco_ativo(
        guild_id, str(usuario.id), categoria, True
    ):
        return False
    try:
        await usuario.send(texto)
        return True
    except (discord.Forbidden, discord.HTTPException):
        log.info("nao consegui enviar alerta bancario %s para %s", categoria, usuario.id)
        return False


class ServicosBanco(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        registrar_reinicio_em_erro(
            self.ciclo_seguros, "ciclo_seguros", log
        )
        self.ciclo_seguros.start()

    def cog_unload(self):
        self.ciclo_seguros.cancel()

    @app_commands.command(
        name="alertas_banco",
        description="Consulta ou altera os alertas privados enviados pelo Banqueiro.",
    )
    @app_commands.describe(
        categoria="Categoria que você quer alterar; deixe vazia para listar.",
        ligar="Ligar ou desligar a categoria escolhida.",
    )
    @app_commands.choices(categoria=ALERTA_CHOICES)
    async def alertas_banco(
        self,
        interaction: discord.Interaction,
        categoria: Optional[app_commands.Choice[str]] = None,
        ligar: Optional[bool] = None,
    ):
        sid, uid = str(interaction.guild_id), str(interaction.user.id)
        if categoria is not None and ligar is not None:
            self.bot.db.set_alerta_banco(sid, uid, categoria.value, ligar)
        configurados = self.bot.db.listar_alertas_banco(sid, uid)
        linhas = [
            f"{'🟢' if configurados.get(chave, True) else '🔴'} **{rotulo}**"
            for chave, rotulo in ALERTAS.items()
        ]
        linhas.append(
            "\nA DM com o botão de defesa de um roubo é obrigatória e não pode ser desligada; "
            "o alerta do resultado pode."
        )
        emb = ui.embed(
            "🔔 Alertas do Banco Lunar",
            categoria="economia",
            descricao="\n".join(linhas),
        )
        await interaction.response.send_message(embed=emb, ephemeral=True)

    @app_commands.command(
        name="seguro_cofre",
        description="Assina, renova ou consulta o seguro contra arrombamento do cofre.",
    )
    @app_commands.describe(acao="O que fazer com o seguro.")
    @app_commands.choices(acao=SEGURO_ACOES)
    async def seguro_cofre(
        self, interaction: discord.Interaction, acao: app_commands.Choice[str]
    ):
        sid, uid = str(interaction.guild_id), str(interaction.user.id)
        db = self.bot.db
        if acao.value == "assinar":
            try:
                resultado = db.contratar_seguro_cofre(sid, uid)
            except SaldoInsuficiente as exc:
                await interaction.response.send_message(f"💸 {exc}", ephemeral=True)
                return
            await interaction.response.send_message(
                f"🛡️ Seguro ativo até {discord.utils.format_dt(resultado['valido_ate'], style='D')}. "
                f"Foram cobrados ☾ {economia.SEGURO_COFRE_CUSTO} Lunaris.",
                ephemeral=True,
            )
            return
        if acao.value in {"auto_ligar", "auto_desligar"}:
            existe = db.set_seguro_auto_renovar(
                sid, uid, acao.value == "auto_ligar"
            )
            if not existe:
                await interaction.response.send_message(
                    "Você ainda não tem seguro. Use `Assinar/renovar 30 dias` primeiro.",
                    ephemeral=True,
                )
                return
        seguro = db.get_seguro_cofre(sid, uid)
        if not seguro:
            texto = (
                f"Nenhum seguro contratado. Custa ☾ {economia.SEGURO_COFRE_CUSTO} por "
                f"{economia.SEGURO_COFRE_DIAS} dias."
            )
        else:
            valido = seguro["ativo"] and seguro["valido_ate"] > datetime.now(timezone.utc)
            texto = (
                f"Status: **{'ativo' if valido else 'vencido'}**\n"
                f"Válido até: {discord.utils.format_dt(seguro['valido_ate'], style='F')}\n"
                f"Renovação automática: **{'ligada' if seguro['auto_renovar'] else 'desligada'}**\n"
                f"Cobertura: **{int(economia.SEGURO_COFRE_COBERTURA * 100)}%**, "
                f"limitada a ☾ {economia.SEGURO_COFRE_LIMITE}, uma vez a cada "
                f"{economia.SEGURO_COFRE_CARENCIA_DIAS} dias."
            )
        await interaction.response.send_message(
            embed=ui.embed("🛡️ Seguro do cofre", categoria="cofre", descricao=texto),
            ephemeral=True,
        )

    @app_commands.command(
        name="economia_diagnostico",
        description="[Mestre] Mostra indicadores privados da economia do servidor.",
    )
    @app_commands.checks.has_permissions(manage_guild=True)
    async def economia_diagnostico(self, interaction: discord.Interaction):
        dados = self.bot.db.diagnostico_economia(str(interaction.guild_id))
        emb = ui.embed(
            "📊 Diagnóstico econômico",
            categoria="economia",
            descricao=(
                f"Jogadores com carteira: **{dados['jogadores']}**\n"
                f"Em carteiras: ☾ **{dados['carteira']}**\n"
                f"Em cofres: ☾ **{dados['cofre']}**\n"
                f"Patrimônio total: ☾ **{dados['patrimonio']}**\n"
                f"Dívida de cartão: ☾ **{dados['divida']}**\n"
                f"Concentração no top 5: **{dados['top5_percent'] * 100:.1f}%**\n\n"
                f"Últimos 7 dias — entradas: ☾ **{dados['entradas_7d']}**, "
                f"saídas: ☾ **{dados['saidas_7d']}**, roubos: **{dados['roubos_7d']}**\n"
                f"Ativos — leilões: **{dados['leiloes']}**, empréstimos: **{dados['emprestimos']}**, "
                f"investimentos: **{dados['investimentos']}**\n"
                f"Dinheiro reservado em custódia: ☾ **{dados['custodia']}**"
            ),
        )
        await interaction.response.send_message(embed=emb, ephemeral=True)

    # Loop de hora em hora, não de 24 em 24h: o temporizador do tasks.loop é
    # em memória e só reagenda depois de dormir o período inteiro, então um
    # loop de 24h só dispara de novo se o bot ficar 24h ininterruptas no ar —
    # raro com deploys frequentes. ciclo_guild_devido (Postgres, sobrevive a
    # restart) é quem decide a cadência real.
    @tasks.loop(hours=1)
    async def ciclo_seguros(self):
        if not self.bot.db.ciclo_guild_devido("_global", "seguros_cofre", 24):
            return
        resultado = self.bot.db.renovar_seguros_vencidos()
        self.bot.db.marcar_ciclo_guild("_global", "seguros_cofre")
        for guild_id, user_id, valido_ate in resultado["renovados"]:
            usuario = self.bot.get_user(int(user_id))
            if usuario:
                await enviar_alerta_banco(
                    self.bot,
                    guild_id,
                    usuario,
                    "seguranca",
                    f"🛡️ Seu seguro do cofre foi renovado até {valido_ate:%d/%m/%Y}.",
                )
        for guild_id, user_id in resultado["encerrados"]:
            usuario = self.bot.get_user(int(user_id))
            if usuario:
                await enviar_alerta_banco(
                    self.bot,
                    guild_id,
                    usuario,
                    "seguranca",
                    "⚠️ Seu seguro do cofre venceu e não foi renovado.",
                )

    @ciclo_seguros.before_loop
    async def _antes_seguros(self):
        await self.bot.wait_until_ready()


async def setup(bot):
    await bot.add_cog(ServicosBanco(bot))
