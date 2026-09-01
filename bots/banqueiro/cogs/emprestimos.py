"""Cog Empréstimos: agiotagem P2P. O bot atua como cartório: o devedor
precisa aceitar, os juros compõem diariamente, e no vencimento o bot cobra
automaticamente. Se o devedor não tiver saldo, o empréstimo vira recompensa
do sistema pelo valor devido: reaproveita o mecanismo de caçada que já
existe em cogs/recompensas.py, em vez de inventar uma penhora de itens."""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Optional

import discord
from discord import app_commands
from discord.ext import commands, tasks

from core import cargos as cargos_mod
from core import economia, ui
from core.db import SaldoInsuficiente
from core.tasks_util import registrar_reinicio_em_erro
from cogs.servicos import enviar_alerta_banco

log = logging.getLogger("banqueiro")

MOEDAS_CHOICES = ui.MOEDAS_CHOICES


def _sid(interaction):
    return str(interaction.guild_id)


class EmprestimoView(discord.ui.View):
    def __init__(self, cog: "Emprestimos", guild_id: str, emprestimo_id: int, credor_id: int, devedor_id: int, timeout=300):
        super().__init__(timeout=timeout)
        self.cog = cog
        self.guild_id = guild_id
        self.emprestimo_id = emprestimo_id
        self.credor_id = credor_id
        self.devedor_id = devedor_id
        self.resolvido = False
        self.message: Optional[discord.Message] = None

    async def interaction_check(self, interaction: discord.Interaction) -> bool:
        if interaction.user.id != self.devedor_id:
            await interaction.response.send_message("Só quem recebeu a proposta pode responder.", ephemeral=True)
            return False
        return True

    async def _fechar(self):
        for c in self.children:
            c.disabled = True
        if self.message:
            try:
                await self.message.edit(view=self)
            except discord.HTTPException:
                pass

    async def on_timeout(self):
        if not self.resolvido:
            self.cog.bot.db.recusar_emprestimo_com_devolucao(
                self.guild_id, self.emprestimo_id, str(self.devedor_id)
            )
            await self._fechar()

    @discord.ui.button(label="Aceitar ✅", style=discord.ButtonStyle.success)
    async def aceitar(self, interaction: discord.Interaction, button: discord.ui.Button):
        if self.resolvido:
            await interaction.response.send_message("Essa proposta já foi resolvida.", ephemeral=True)
            return
        self.resolvido = True
        db = self.cog.bot.db
        emp = db.get_emprestimo(self.guild_id, self.emprestimo_id)
        if emp is None or emp["status"] != "pendente_aceite":
            await self._fechar()
            await interaction.response.send_message("Essa proposta não está mais disponível.", ephemeral=True)
            return
        resultado = db.aceitar_emprestimo_com_custodia(
            self.guild_id, self.emprestimo_id, str(self.devedor_id)
        )
        if resultado is None:
            await self._fechar()
            await interaction.response.send_message(
                "⚠️ A proposta ou a custódia não está mais disponível.", ephemeral=True
            )
            return
        await self._fechar()
        await interaction.response.send_message(
            f"✅ Empréstimo aceito! Você recebeu **{emp['valor_original']} {emp['moeda']}**: "
            f"juros de {emp['juros_diarios'] * 100:.1f}%/dia até pagar."
        )
        credor = self.cog.bot.get_user(self.credor_id)
        if credor:
            await enviar_alerta_banco(
                self.cog.bot,
                self.guild_id,
                credor,
                "emprestimos",
                f"🤝 Seu empréstimo #{self.emprestimo_id} foi aceito; a custódia foi entregue ao devedor.",
            )

    @discord.ui.button(label="Recusar ❌", style=discord.ButtonStyle.danger)
    async def recusar(self, interaction: discord.Interaction, button: discord.ui.Button):
        if self.resolvido:
            await interaction.response.send_message("Essa proposta já foi resolvida.", ephemeral=True)
            return
        self.resolvido = True
        self.cog.bot.db.recusar_emprestimo_com_devolucao(
            self.guild_id, self.emprestimo_id, str(self.devedor_id)
        )
        await self._fechar()
        await interaction.response.send_message("Empréstimo recusado.", ephemeral=True)


class Emprestimos(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        registrar_reinicio_em_erro(self.ciclo_juros, "ciclo_juros", log)
        registrar_reinicio_em_erro(
            self.ciclo_propostas, "ciclo_propostas_emprestimo", log
        )
        self.ciclo_juros.start()
        self.ciclo_propostas.start()

    def cog_unload(self):
        self.ciclo_juros.cancel()
        self.ciclo_propostas.cancel()

    @tasks.loop(minutes=1)
    async def ciclo_propostas(self):
        expiradas = self.bot.db.expirar_propostas_emprestimo(
            datetime.now(timezone.utc)
        )
        for emp in expiradas:
            credor = self.bot.get_user(int(emp["credor_id"]))
            if credor:
                await enviar_alerta_banco(
                    self.bot,
                    emp["guild_id"],
                    credor,
                    "emprestimos",
                    f"⌛ A proposta de empréstimo #{emp['id']} expirou; o valor reservado voltou para sua carteira.",
                )

    @ciclo_propostas.before_loop
    async def _antes_propostas(self):
        await self.bot.wait_until_ready()

    @app_commands.command(name="emprestar_para", description="Propõe um empréstimo a outro jogador (ele precisa aceitar).")
    @app_commands.describe(
        membro="Pra quem emprestar.",
        valor="Quanto emprestar.",
        juros_diarios_percent="Juros por dia, em % (0-20).",
        prazo_dias=f"Prazo pra cobrança automática, em dias (1-{economia.EMPRESTIMO_PRAZO_MAX_DIAS}).",
        moeda="Moeda (padrão Lunaris).",
    )
    @app_commands.choices(moeda=MOEDAS_CHOICES)
    async def emprestar_para(
        self, interaction: discord.Interaction, membro: discord.Member,
        valor: app_commands.Range[int, 1],
        juros_diarios_percent: app_commands.Range[int, 0, int(economia.EMPRESTIMO_JUROS_MAXIMO * 100)],
        prazo_dias: app_commands.Range[int, 1, economia.EMPRESTIMO_PRAZO_MAX_DIAS],
        moeda: Optional[app_commands.Choice[str]] = None,
    ):
        if membro.id == interaction.user.id:
            await interaction.response.send_message("Você não pode emprestar pra si mesmo.", ephemeral=True)
            return
        if membro.bot:
            await interaction.response.send_message("Não dá pra emprestar pra um bot.", ephemeral=True)
            return
        moeda_nome = moeda.value if moeda else "Lunaris"
        sid, uid = _sid(interaction), str(interaction.user.id)
        db = self.bot.db
        db.garantir_jogador(sid, uid)
        db.garantir_jogador(sid, str(membro.id))
        saldo = db.get_saldo(sid, uid, moeda_nome)
        if saldo < valor:
            await interaction.response.send_message(
                f"💸 Você só tem {saldo} {moeda_nome}: não dá pra emprestar {valor}.", ephemeral=True
            )
            return
        try:
            emp = db.criar_emprestimo_com_custodia(
                sid,
                uid,
                str(membro.id),
                moeda_nome,
                valor,
                juros_diarios_percent / 100,
                prazo_dias,
            )
        except SaldoInsuficiente as exc:
            await interaction.response.send_message(f"💸 {exc}", ephemeral=True)
            return
        view = EmprestimoView(self, sid, emp["id"], interaction.user.id, membro.id)
        emb = ui.embed(
            "🤝 Proposta de empréstimo", categoria="economia",
            descricao=(
                f"{interaction.user.mention} oferece emprestar {ui.simbolo_moeda(moeda_nome)} **{valor} {moeda_nome}** "
                f"pra {membro.mention}.\nJuros: **{juros_diarios_percent}%/dia** (compostos) · "
                f"cobrança automática em **{prazo_dias} dias** se não for pago antes.\n"
                f"O valor já está reservado em custódia. {membro.mention}, aceita?"
            ),
        )
        try:
            await interaction.response.send_message(content=membro.mention, embed=emb, view=view)
        except (discord.Forbidden, discord.HTTPException):
            # A proposta não chegou ao devedor: devolve a custódia agora,
            # sem esperar o coletor de propostas expiradas.
            db.recusar_emprestimo_com_devolucao(sid, emp["id"], str(membro.id))
            raise
        view.message = await interaction.original_response()

    @app_commands.command(name="emprestimo_pagar", description="Paga parte (ou tudo) de um empréstimo ativo que você deve.")
    @app_commands.describe(emprestimo_id="ID mostrado em /emprestimos_ver.", valor="Quanto pagar.")
    async def emprestimo_pagar(self, interaction: discord.Interaction, emprestimo_id: int, valor: app_commands.Range[int, 1]):
        sid, uid = _sid(interaction), str(interaction.user.id)
        db = self.bot.db
        emp = db.get_emprestimo(sid, emprestimo_id)
        if emp is None or emp["devedor_id"] != uid or emp["status"] != "ativo":
            await interaction.response.send_message(
                "Não encontrei um empréstimo ativo seu com esse ID. Veja `/emprestimos_ver`.", ephemeral=True
            )
            return
        pago_alvo = min(valor, emp["valor_devido"])
        try:
            resultado = db.pagar_emprestimo_atomico(
                sid, emprestimo_id, uid, pago_alvo
            )
        except SaldoInsuficiente as e:
            await interaction.response.send_message(f"💸 {e}", ephemeral=True)
            return
        if resultado is None:
            await interaction.response.send_message("⚠️ Esse empréstimo não está mais ativo. Nada foi cobrado.", ephemeral=True)
            return
        txt = "quitado! ✅" if resultado["quitado"] else f"restam {resultado['restante']} {resultado['moeda']}"
        await interaction.response.send_message(
            f"✅ Você pagou {resultado['pago']} {resultado['moeda']} do empréstimo #{emprestimo_id}: {txt}", ephemeral=True
        )
        credor_alerta = self.bot.get_user(int(resultado["credor_id"]))
        if credor_alerta:
            await enviar_alerta_banco(
                self.bot,
                sid,
                credor_alerta,
                "emprestimos",
                f"💰 Você recebeu {resultado['pago']} {resultado['moeda']} do empréstimo #{emprestimo_id}.",
            )

    @app_commands.command(name="emprestimos_ver", description="Mostra seus empréstimos (como credor ou devedor).")
    @app_commands.describe(historico="Incluir empréstimos já quitados, recusados ou inadimplentes.")
    async def emprestimos_ver(self, interaction: discord.Interaction, historico: Optional[bool] = False):
        sid, uid = _sid(interaction), str(interaction.user.id)
        lista = self.bot.db.listar_emprestimos_usuario(sid, uid, incluir_historico=bool(historico))
        if not lista:
            mensagem = (
                "Você não tem nenhum empréstimo registrado ainda."
                if historico
                else "Você não tem empréstimos em aberto. Use `historico:True` pra ver os encerrados."
            )
            await interaction.response.send_message(mensagem, ephemeral=True)
            return
        situacao_por_status = {
            "pendente_aceite": "aguardando aceite",
            "recusado": "recusado",
            "quitado": "quitado",
            "inadimplente": "inadimplente (virou recompensa)",
        }
        linhas = []
        for emp in lista:
            sou_credor = emp["credor_id"] == uid
            outro = emp["devedor_id"] if sou_credor else emp["credor_id"]
            papel = "você emprestou pra" if sou_credor else "você deve a"
            situacao = situacao_por_status.get(emp["status"], f"deve {emp['valor_devido']} {emp['moeda']}")
            linhas.append(f"`#{emp['id']}` {papel} <@{outro}>: {situacao}")
        titulo = "🤝 Seus empréstimos (com histórico)" if historico else "🤝 Seus empréstimos em aberto"
        emb = ui.embed(titulo, categoria="economia", descricao="\n".join(linhas))
        await interaction.response.send_message(embed=emb, ephemeral=True)

    # Loop de hora em hora, não de 24 em 24h: o temporizador do tasks.loop é
    # em memória e só reagenda depois de dormir o período inteiro, então um
    # loop de 24h só dispara de novo se o bot ficar 24h ininterruptas no ar —
    # raro com deploys frequentes. ciclo_guild_devido (Postgres, sobrevive a
    # restart) é quem decide a cadência real. Não é por guild (a listagem
    # abaixo já cruza todas), então usa uma chave única.
    @tasks.loop(hours=1)
    async def ciclo_juros(self):
        db = self.bot.db
        if not db.ciclo_guild_devido("_global", "emprestimos_juros", 24):
            return
        for emp in db.listar_emprestimos_ativos():
            try:
                novo = economia.compor_juros_emprestimo(emp["valor_devido"], emp["juros_diarios"])
                db.aplicar_juros_emprestimo(emp["id"], novo)
            except Exception:
                log.exception("erro ao aplicar juros no emprestimo %s", emp.get("id"))
        db.marcar_ciclo_guild("_global", "emprestimos_juros")
        agora = datetime.now(timezone.utc)
        for emp in db.listar_emprestimos_vencidos(agora):
            try:
                await self._cobrar_vencido(emp)
            except Exception:
                log.exception("erro ao cobrar emprestimo vencido %s", emp.get("id"))

    @ciclo_juros.before_loop
    async def _antes_juros(self):
        await self.bot.wait_until_ready()

    def _valor_recompensa_em_lunaris(self, guild_id: str, valor: int, moeda: str) -> Optional[int]:
        """A recompensa (core/db.py:adicionar_recompensa) só existe em
        Lunaris: não tem coluna de moeda. Empréstimo em Solares converte pela
        taxa de câmbio do servidor; Fragmentos/Créditos não têm conversão
        definida em lugar nenhum do sistema, então não dá pra criar bounty
        sem inventar uma taxa."""
        if economia.mesma_moeda(moeda, "Lunaris"):
            return int(valor)
        if economia.mesma_moeda(moeda, "Solares"):
            rate, _taxa = self.bot.db.get_cambio(guild_id)
            return int(valor) * int(rate)
        return None

    async def _cobrar_vencido(self, emp: dict) -> None:
        db = self.bot.db
        atual = db.get_emprestimo(emp["guild_id"], emp["id"])
        if atual is None or atual["status"] != "ativo":
            return
        try:
            resultado = db.pagar_emprestimo_atomico(
                atual["guild_id"],
                atual["id"],
                atual["devedor_id"],
                atual["valor_devido"],
            )
        except SaldoInsuficiente:
            db.fechar_emprestimo(atual["id"], "inadimplente")
            valor_lunaris = self._valor_recompensa_em_lunaris(
                atual["guild_id"], atual["valor_devido"], atual["moeda"]
            )
            if valor_lunaris is not None:
                db.adicionar_recompensa(atual["guild_id"], atual["devedor_id"], valor_lunaris, sistema=True)
                complemento = f"e agora tem ☾ {valor_lunaris} Lunaris de recompensa na cabeça por isso."
            else:
                complemento = (
                    "mas essa dívida não é em Lunaris/Solares: não deu pra converter em recompensa "
                    "automaticamente. Um mestre pode cobrar na mão com `/recompensa_colocar`."
                )
            db.criar_aviso(
                atual["guild_id"],
                f"🚨 <@{atual['devedor_id']}> não pagou o empréstimo #{atual['id']} "
                f"({atual['valor_devido']} {atual['moeda']}) {complemento}",
            )
            try:
                await cargos_mod.sincronizar_mais_procurado(self.bot)
            except Exception:
                log.exception("falha ao sincronizar cargo de mais procurado apos emprestimo vencido")
            return
        if resultado is None:
            return
        db.criar_aviso(
            atual["guild_id"],
            f"✅ O empréstimo #{atual['id']} venceu e foi cobrado automaticamente: "
            f"<@{atual['credor_id']}> recebeu {atual['valor_devido']} {atual['moeda']}.",
        )


async def setup(bot):
    await bot.add_cog(Emprestimos(bot))
