"""Cog Recompensas: dívida que cresce sozinha, vira caçada com recompensa
paga pelo Banqueiro, e recompensa que qualquer jogador pode colocar na
cabeça de outro. Quem rouba (carteira ou cofre) um alvo com recompensa ativa
leva o valor junto: ver core.economia.Economia._resgatar_recompensa."""

from __future__ import annotations

import logging
from typing import Optional

import discord
from discord import app_commands
from discord.ext import commands, tasks

from core import cargos as cargos_mod
from core import economia, ui
from core.db import SaldoInsuficiente
from core.tasks_util import registrar_reinicio_em_erro

log = logging.getLogger("banqueiro")


def _sid(interaction): return str(interaction.guild_id)


class Recompensas(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        registrar_reinicio_em_erro(self.ciclo_divida, "ciclo_divida", log)
        registrar_reinicio_em_erro(self.ciclo_faturas, "ciclo_faturas", log)
        registrar_reinicio_em_erro(self.ciclo_cacadores, "ciclo_cacadores", log)
        self.ciclo_divida.start()
        self.ciclo_faturas.start()
        self.ciclo_cacadores.start()

    def cog_unload(self):
        self.ciclo_divida.cancel()
        self.ciclo_faturas.cancel()
        self.ciclo_cacadores.cancel()

    # ── Sweep do cargo temporário de Caçador de Recompensas ────────────────
    @tasks.loop(minutes=15)
    async def ciclo_cacadores(self):
        try:
            await cargos_mod.sweep_cacadores_expirados(self.bot)
        except Exception:
            log.exception("erro no sweep de cacadores de recompensa expirados")

    @ciclo_cacadores.before_loop
    async def _antes_ciclo_cacadores(self):
        await self.bot.wait_until_ready()

    # ── Ciclo de dívida (roda sozinho, cresce dívida e cria recompensa) ────
    @tasks.loop(hours=economia.DIVIDA_TICK_HORAS)
    async def ciclo_divida(self):
        for guild in self.bot.guilds:
            gid = str(guild.id)
            # tasks.loop dispara a primeira iteracao assim que o bot sobe: sem
            # isto, todo restart (cada deploy na Discloud) cobrava juros de
            # divida de novo mesmo horas depois do ultimo tick.
            if not self.bot.db.ciclo_guild_devido(gid, "divida", economia.DIVIDA_TICK_HORAS):
                continue
            try:
                await self._processar_divida_guild(gid)
                self.bot.db.marcar_ciclo_guild(gid, "divida")
            except Exception:
                log.exception("erro no ciclo de divida (guild %s)", guild.id)

    @ciclo_divida.before_loop
    async def _antes_ciclo_divida(self):
        await self.bot.wait_until_ready()

    # Faturas são verificadas com frequência própria para não atrasar em até
    # 24h só porque o ciclo de juros roda diariamente.
    @tasks.loop(minutes=1)
    async def ciclo_faturas(self):
        for guild in self.bot.guilds:
            gid = str(guild.id)
            try:
                convertidas = self.bot.db.converter_faturas_vencidas(gid)
                # A fatura já cumpriu os sete dias. Se o total convertido
                # alcançou o limiar de caça, publica o status de Procurado no
                # mesmo ciclo, sem esperar o próximo tick diário (e sem cobrar
                # juros antes da hora).
                for conversao in convertidas:
                    await self._promover_a_procurado(
                        gid,
                        conversao["user_id"],
                        conversao["divida_total"],
                    )
            except Exception:
                log.exception("erro no ciclo de faturas (guild %s)", gid)

    @ciclo_faturas.before_loop
    async def _antes_ciclo_faturas(self):
        await self.bot.wait_until_ready()

    async def _processar_divida_guild(self, gid: str):
        db = self.bot.db
        for dev in db.listar_devedores(gid):
            uid = dev["user_id"]
            nova_divida = db.aplicar_juros_divida(gid, uid, economia.DIVIDA_TAXA_CRESCIMENTO)
            crescimento = nova_divida - dev["divida"]
            db.registrar_extrato(gid, uid, -crescimento, "Lunaris", "Juros da dívida em atraso")
            reputacao_atual = dev["credito"]  # chave legada do banco
            alvo_reputacao = max(
                economia.DIVIDA_REPUTACAO_MINIMA,
                reputacao_atual - economia.DIVIDA_PENALIDADE_REPUTACAO,
            )
            if alvo_reputacao != reputacao_atual:
                db.add_credito(gid, uid, alvo_reputacao - reputacao_atual)
            await self._promover_a_procurado(gid, uid, nova_divida)
        for sol in db.listar_solventes_com_credito_baixo(gid, economia.REPUTACAO_RECUPERACAO_TETO):
            uid = sol["user_id"]
            reputacao_atual = sol["credito"]  # chave legada do banco
            alvo = min(
                economia.REPUTACAO_RECUPERACAO_TETO,
                reputacao_atual + economia.REPUTACAO_RECUPERACAO_TICK,
            )
            if alvo != reputacao_atual:
                db.add_credito(gid, uid, alvo - reputacao_atual)

        # Quem pagou a própria dívida (sem ser capturado) não deve continuar
        # com recompensa de sistema pendurada na cabeça: só some a parte que
        # veio da dívida; recompensa colocada por outro jogador continua.
        for uid in db.limpar_recompensas_sistema_quitadas(gid):
            db.criar_aviso(gid, f"📋 <@{uid}> quitou a dívida com o Banqueiro: não está mais procurado por isso.")

    async def _promover_a_procurado(
        self, guild_id: str, user_id: str, divida_total: int
    ) -> bool:
        """Cria uma única recompensa de sistema ao cruzar o limiar da dívida.

        É compartilhado pelo vencimento da fatura e pelo ciclo diário de juros,
        garantindo anúncio imediato no Jornalista sem recompensas duplicadas.
        """
        if divida_total < economia.DIVIDA_RECOMPENSA_LIMIAR:
            return False
        db = self.bot.db
        if user_id == db.get_mestre_protegido(guild_id):
            return False
        if db.get_recompensa(guild_id, user_id)["tem_sistema"]:
            return False

        valor = min(economia.DIVIDA_RECOMPENSA_TETO, divida_total)
        db.adicionar_recompensa(guild_id, user_id, valor, sistema=True)
        try:
            await cargos_mod.sincronizar_mais_procurado(self.bot)
        except Exception:
            log.exception(
                "falha ao sincronizar cargo de mais procurado (guild %s)",
                guild_id,
            )
        db.criar_aviso(
            guild_id,
            f"🚨 **Procurado!** <@{user_id}> deve ☾ {divida_total} Lunaris ao Banqueiro e agora "
            f"tem recompensa de ☾ {valor} na cabeça. Quem roubar a carteira ou o cofre dele "
            "leva a recompensa: e a dívida é perdoada.",
        )
        return True

    # ── Comandos de jogador ─────────────────────────────────────────────────
    @app_commands.command(description="Mostra suas faturas pendentes do Cartão Lunar.")
    async def fatura(self, interaction: discord.Interaction):
        sid, uid = _sid(interaction), str(interaction.user.id)
        db = self.bot.db
        db.garantir_jogador(sid, uid)
        faturas = db.listar_faturas_pendentes(sid, uid)
        if not faturas:
            await interaction.response.send_message(
                "✅ Você não tem faturas pendentes no Cartão Lunar.", ephemeral=True
            )
            return
        linhas = []
        for fat in faturas[:10]:
            vence_ts = int(fat["vence_em"].timestamp())
            linhas.append(
                f"• `#{fat['id']}` **{fat['descricao']}** — ☾ **{fat['valor_pendente']}** "
                f"· vence <t:{vence_ts}:R>"
            )
        if len(faturas) > 10:
            linhas.append(f"… e mais {len(faturas) - 10} fatura(s).")
        total = sum(fat["valor_pendente"] for fat in faturas)
        emb = ui.embed(
            "🧾 Faturas do Cartão Lunar",
            categoria="economia",
            descricao="\n".join(linhas),
        )
        emb.add_field(name="Total pendente", value=f"☾ **{total} Lunaris**", inline=False)
        emb.set_footer(text=f"{ui.MARCA} · Pague as mais antigas primeiro com /fatura_pagar")
        await interaction.response.send_message(embed=emb, ephemeral=True)

    @app_commands.command(
        name="fatura_pagar",
        description="Paga faturas pendentes usando Lunaris da carteira.",
    )
    @app_commands.describe(quantia="Quanto pagar; as faturas mais antigas têm prioridade.")
    async def fatura_pagar(
        self,
        interaction: discord.Interaction,
        quantia: app_commands.Range[int, 1],
    ):
        sid, uid = _sid(interaction), str(interaction.user.id)
        db = self.bot.db
        try:
            resultado = db.pagar_faturas(sid, uid, quantia)
        except SaldoInsuficiente as exc:
            await interaction.response.send_message(f"💸 {exc}", ephemeral=True)
            return
        if resultado["pago"] <= 0:
            if resultado.get("convertido_em_divida", 0) > 0:
                await interaction.response.send_message(
                    f"⚠️ O prazo terminou: ☾ **{resultado['convertido_em_divida']} Lunaris** "
                    "foram transferidos para sua dívida. Consulte `/divida`.",
                    ephemeral=True,
                )
                return
            await interaction.response.send_message(
                "Você não tem faturas pendentes no Cartão Lunar.", ephemeral=True
            )
            return
        db.registrar_extrato(
            sid,
            uid,
            -resultado["pago"],
            "Lunaris",
            "Pagamento de fatura do Cartão Lunar",
        )
        linhas = [
            f"Você pagou ☾ **{resultado['pago']} Lunaris**.",
            f"Faturas ainda pendentes: ☾ **{resultado['restante']} Lunaris**.",
            f"Saldo na carteira: ☾ **{resultado['saldo']} Lunaris**.",
        ]
        if resultado["reputacao_ganha"]:
            linhas.append(
                f"🏦 Pagamento pontual: **+{resultado['reputacao_ganha']} de reputação bancária**."
            )
        emb = ui.embed(
            "🧾 Pagamento de fatura",
            categoria="economia",
            descricao="\n".join(linhas),
        )
        await interaction.response.send_message(embed=emb, ephemeral=True)

    @app_commands.command(description="Mostra sua situação de dívida no Cartão Lunar (e se você tá procurado).")
    async def divida(self, interaction: discord.Interaction):
        sid, uid = _sid(interaction), str(interaction.user.id)
        db = self.bot.db
        db.garantir_jogador(sid, uid)
        divida = db.get_divida(sid, uid)
        cartao = db.get_cartao(sid, uid)
        rec = db.get_recompensa(sid, uid)
        if divida <= 0:
            desc = "Você está em dia, sem dívida no Cartão Lunar."
        else:
            desc = (
                f"Você deve ☾ **{divida} Lunaris**. Receber dinheiro não paga essa dívida automaticamente. "
                f"Use `/divida_pagar` quando decidir pagar. A dívida cresce a cada "
                f"{economia.DIVIDA_TICK_HORAS}h (~{int(economia.DIVIDA_TAXA_CRESCIMENTO*100)}%) "
                "e reduz sua reputação bancária."
            )
        emb = ui.embed("📋 Sua situação com o Banqueiro", categoria="economia", descricao=desc)
        emb.add_field(name="🏦 Reputação bancária", value=f"{cartao['credito']} pontos")
        if rec["valor"] > 0:
            emb.add_field(name="⚠️ Recompensa na sua cabeça", value=f"☾ {rec['valor']}: quem te roubar leva junto.", inline=False)
        await interaction.response.send_message(embed=emb, ephemeral=True)

    @app_commands.command(
        name="divida_pagar",
        description="Paga uma parte (ou toda) da dívida usando Lunaris da sua carteira.",
    )
    @app_commands.describe(quantia="Quanto da dívida você quer pagar.")
    async def divida_pagar(
        self,
        interaction: discord.Interaction,
        quantia: app_commands.Range[int, 1],
    ):
        sid, uid = _sid(interaction), str(interaction.user.id)
        db = self.bot.db
        try:
            resultado = db.pagar_divida(sid, uid, quantia)
        except SaldoInsuficiente as exc:
            await interaction.response.send_message(f"💸 {exc}", ephemeral=True)
            return

        if resultado["pago"] <= 0:
            await interaction.response.send_message(
                "Você não tem dívida no Cartão Lunar.", ephemeral=True
            )
            return

        db.registrar_extrato(
            sid,
            uid,
            -resultado["pago"],
            "Lunaris",
            "Pagamento voluntário da dívida",
        )
        quitou = resultado["restante"] == 0
        if quitou:
            db.limpar_recompensas_sistema_quitadas(sid)
            db.criar_aviso(
                sid,
                f"📋 {interaction.user.mention} quitou voluntariamente a dívida com o Banqueiro.",
            )
        descricao = (
            f"Você pagou ☾ **{resultado['pago']} Lunaris**. "
            + ("A dívida foi quitada." if quitou else f"Ainda deve ☾ **{resultado['restante']} Lunaris**.")
            + f"\nSaldo disponível na carteira: ☾ **{resultado['saldo']} Lunaris**."
        )
        emb = ui.embed("📋 Pagamento da dívida", categoria="economia", descricao=descricao)
        await interaction.response.send_message(embed=emb, ephemeral=True)

    @app_commands.command(name="recompensa_colocar", description="Coloca recompensa na cabeça de outro jogador (pago da sua carteira).")
    @app_commands.describe(membro="Quem você quer que seja caçado.", valor="Quanto Lunaris oferecer de recompensa.")
    async def recompensa_colocar(self, interaction: discord.Interaction, membro: discord.Member, valor: app_commands.Range[int, economia.RECOMPENSA_MINIMA]):
        sid, uid = _sid(interaction), str(interaction.user.id)
        if membro.id == interaction.user.id:
            await interaction.response.send_message("Você não pode colocar recompensa em si mesmo.", ephemeral=True)
            return
        if membro.bot:
            await interaction.response.send_message("Não dá pra colocar recompensa em um bot.", ephemeral=True)
            return
        db = self.bot.db
        alvo_id = str(membro.id)
        if db.get_mestre_protegido(sid) == alvo_id:
            await interaction.response.send_message(
                "Essa conta está protegida como mestre e não pode receber recompensa.",
                ephemeral=True,
            )
            return
        db.garantir_jogador(sid, uid)
        db.garantir_jogador(sid, alvo_id)
        try:
            db.debitar(sid, uid, "Lunaris", valor)
        except SaldoInsuficiente as e:
            await interaction.response.send_message(f"💸 {e}", ephemeral=True)
            return
        total = db.adicionar_recompensa(sid, alvo_id, valor, sistema=False)
        db.registrar_extrato(sid, uid, -valor, "Lunaris", f"Recompensa colocada em {membro.display_name}")
        try:
            await cargos_mod.sincronizar_mais_procurado(self.bot)
        except Exception:
            log.exception("falha ao sincronizar cargo de mais procurado (guild %s)", sid)
        db.criar_aviso(
            sid,
            f"💰 {interaction.user.mention} colocou ☾ {valor} Lunaris de recompensa pela cabeça de "
            f"{membro.mention}! Total acumulado: ☾ {total}.",
        )
        emb = ui.embed("🎯 Recompensa colocada!", categoria="economia",
            descricao=f"Você colocou ☾ **{valor} Lunaris** de recompensa em {membro.mention}.\n"
                      f"Total acumulado: ☾ **{total} Lunaris**.\n"
                      "Quem roubar a carteira ou o cofre dele leva a recompensa junto.")
        await interaction.response.send_message(embed=emb)

    @app_commands.command(name="recompensa_ver", description="Mostra a recompensa na cabeça de alguém, ou os mais procurados do servidor.")
    @app_commands.describe(membro="Ver a recompensa de alguém específico (opcional).")
    async def recompensa_ver(self, interaction: discord.Interaction, membro: Optional[discord.Member] = None):
        sid = _sid(interaction)
        db = self.bot.db
        if membro:
            rec = db.get_recompensa(sid, str(membro.id))
            if rec["valor"] <= 0:
                await interaction.response.send_message(f"{membro.display_name} não tem recompensa na cabeça.", ephemeral=True)
                return
            origem = "dívida com o Banqueiro" if rec["tem_sistema"] else "outro(s) jogador(es)"
            emb = ui.embed(f"🎯 Recompensa em {membro.display_name}", categoria="economia",
                descricao=f"☾ **{rec['valor']} Lunaris**: origem: {origem}.")
            await interaction.response.send_message(embed=emb)
            return
        top = db.listar_recompensas(sid, limite=10)
        if not top:
            await interaction.response.send_message("Ninguém tem recompensa na cabeça agora.", ephemeral=True)
            return
        linhas = [
            f"{i + 1}. <@{r['alvo_user_id']}>: ☾ {r['valor']}" + (" 🚨 procurado" if r["tem_sistema"] else "")
            for i, r in enumerate(top)
        ]
        emb = ui.embed("🎯 Mais procurados", categoria="economia", descricao="\n".join(linhas))
        await interaction.response.send_message(embed=emb)


async def setup(bot):
    await bot.add_cog(Recompensas(bot))
