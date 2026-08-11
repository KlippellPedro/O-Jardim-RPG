"""Cog Investimentos: Títulos do Jardim: trava um valor por alguns dias e
paga rendimento ao vencer. O mestre pode declarar Crise Econômica pra reduzir
o rendimento dos títulos que vencerem enquanto ela estiver ativa (evento
narrativo controlado pelo mestre, não detectado automaticamente)."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

import discord
from discord import app_commands
from discord.ext import commands, tasks

from core import economia, ui
from core.db import SaldoInsuficiente
from core.tasks_util import registrar_reinicio_em_erro
from cogs.servicos import enviar_alerta_banco

log = logging.getLogger("banqueiro")

MOEDAS_CHOICES = ui.MOEDAS_CHOICES


def _sid(interaction):
    return str(interaction.guild_id)


class Investimentos(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        registrar_reinicio_em_erro(self.ciclo_maturacao, "ciclo_maturacao", log)
        self.ciclo_maturacao.start()

    def cog_unload(self):
        self.ciclo_maturacao.cancel()

    @app_commands.command(
        name="investir",
        description=f"Trava um valor por {economia.INVESTIMENTO_DIAS} dias num Título do Jardim; rende ao vencer.",
    )
    @app_commands.describe(valor="Quanto investir.", moeda="Moeda (padrão Lunaris).")
    @app_commands.choices(moeda=MOEDAS_CHOICES)
    async def investir(
        self, interaction: discord.Interaction, valor: app_commands.Range[int, 1],
        moeda: Optional[app_commands.Choice[str]] = None,
    ):
        moeda_nome = moeda.value if moeda else "Lunaris"
        sid, uid = _sid(interaction), str(interaction.user.id)
        db = self.bot.db
        db.garantir_jogador(sid, uid)
        vence_em = datetime.now(timezone.utc) + timedelta(days=economia.INVESTIMENTO_DIAS)
        try:
            db.comprar_investimento(sid, uid, moeda_nome, valor, vence_em)
        except SaldoInsuficiente as e:
            await interaction.response.send_message(f"💸 {e}", ephemeral=True)
            return
        em_crise = db.get_crise_economica(sid)
        simb = ui.simbolo_moeda(moeda_nome)
        if em_crise:
            previsao = (
                f"Rendimento previsto se vencer agora: **{int(economia.INVESTIMENTO_TAXA_CRISE * 100)}%** "
                "(⚠️ servidor em Crise Econômica)."
            )
        else:
            chance_ganho = int(economia.INVESTIMENTO_CHANCE_GANHO * 100)
            previsao = (
                f"Título de risco: **{chance_ganho}%** de chance de vencer com "
                f"**+{int(economia.INVESTIMENTO_TAXA_GANHO * 100)}%**, "
                f"**{100 - chance_ganho}%** de chance de vencer com "
                f"**{int(economia.INVESTIMENTO_TAXA_PERDA * 100)}%**. O resultado só é sorteado no vencimento."
            )
        emb = ui.embed(
            "📜 Título do Jardim emitido!", categoria="economia",
            descricao=(
                f"Você travou {simb} **{valor} {moeda_nome}** por {economia.INVESTIMENTO_DIAS} dias.\n"
                f"{previsao}\n"
                f"Vence {discord.utils.format_dt(vence_em, style='R')}."
            ),
        )
        await interaction.response.send_message(embed=emb, ephemeral=True)

    @app_commands.command(name="investir_ver", description="Mostra seus Títulos do Jardim ativos.")
    @app_commands.describe(historico="Incluir títulos já vencidos e pagos.")
    async def investir_ver(self, interaction: discord.Interaction, historico: Optional[bool] = False):
        sid, uid = _sid(interaction), str(interaction.user.id)
        ativos = self.bot.db.listar_investimentos_usuario(sid, uid, incluir_historico=bool(historico))
        if not ativos:
            mensagem = (
                "Você nunca teve nenhum Título do Jardim."
                if historico
                else "Você não tem nenhum Título do Jardim ativo. Use `historico:True` pra ver os já vencidos."
            )
            await interaction.response.send_message(mensagem, ephemeral=True)
            return
        linhas = []
        for inv in ativos:
            simb = ui.simbolo_moeda(inv["moeda"])
            if inv["status"] == "maturado":
                linhas.append(f"• {simb} **{inv['valor']} {inv['moeda']}**: pago em {discord.utils.format_dt(inv['vence_em'], style='d')}")
            else:
                linhas.append(
                    f"• {simb} **{inv['valor']} {inv['moeda']}**: vence "
                    f"{discord.utils.format_dt(inv['vence_em'], style='R')}"
                )
        titulo = "📜 Seus Títulos do Jardim (com histórico)" if historico else "📜 Seus Títulos do Jardim ativos"
        emb = ui.embed(titulo, categoria="economia", descricao="\n".join(linhas))
        await interaction.response.send_message(embed=emb, ephemeral=True)

    @app_commands.command(
        name="crise_declarar",
        description="[Mestre] Liga/desliga a Crise Econômica (reduz o rendimento dos títulos que vencerem).",
    )
    @app_commands.default_permissions(manage_guild=True)
    @app_commands.checks.has_permissions(manage_guild=True)
    @app_commands.describe(ativa="Ligar (True) ou desligar (False) a crise.")
    async def crise_declarar(self, interaction: discord.Interaction, ativa: bool):
        sid = _sid(interaction)
        db = self.bot.db
        db.set_crise_economica(sid, ativa)
        if ativa:
            db.criar_aviso(
                sid,
                "🚨 **Crise Econômica declarada pelo mestre!** Títulos do Jardim que vencerem agora "
                f"rendem {int(economia.INVESTIMENTO_TAXA_CRISE * 100)}% em vez do normal.",
            )
        else:
            db.criar_aviso(sid, "✅ A Crise Econômica terminou. Investimentos voltam a render normalmente.")
        await interaction.response.send_message(
            f"✅ Crise econômica: {'ativa 🚨' if ativa else 'encerrada ✅'}.", ephemeral=True
        )

    @tasks.loop(hours=1)
    async def ciclo_maturacao(self):
        agora = datetime.now(timezone.utc)
        for inv in self.bot.db.listar_investimentos_vencidos(agora):
            try:
                await self._maturar(inv)
            except Exception:
                log.exception("erro ao maturar investimento %s", inv.get("id"))

    @ciclo_maturacao.before_loop
    async def _antes_maturacao(self):
        await self.bot.wait_until_ready()

    async def _maturar(self, inv: dict) -> None:
        db = self.bot.db
        em_crise = db.get_crise_economica(inv["guild_id"])
        final = economia.valor_maturado_investimento(inv["valor"], em_crise)
        processado = db.pagar_investimento_maturado(inv["id"], final)
        if processado is None:
            return
        ganho = final - inv["valor"]
        usuario = self.bot.get_user(int(inv["user_id"]))
        if usuario is not None:
            await enviar_alerta_banco(
                self.bot,
                inv["guild_id"],
                usuario,
                "rendimentos",
                f"📜 Seu Título do Jardim venceu: {inv['valor']} → **{final} {inv['moeda']}** "
                f"({'+' if ganho >= 0 else ''}{ganho}).",
            )


async def setup(bot):
    await bot.add_cog(Investimentos(bot))
