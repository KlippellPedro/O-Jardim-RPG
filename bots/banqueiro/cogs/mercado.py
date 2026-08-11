"""Cog Mercado: Casa de Leilão (item/baú P2P por lance) e o ajuste
automático do câmbio flutuante. As duas coisas moram juntas por serem
"mecânicas de mercado" do Banqueiro, sem ligação com carteira/cofre/roubo."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

import discord
from discord import app_commands
from discord.ext import commands, tasks

from core import economia, ui
from core.db import SaldoInsuficiente
from core.inventario import CofreIndisponivel, ItemIndisponivel
from core.tasks_util import registrar_reinicio_em_erro
from cogs.servicos import enviar_alerta_banco

log = logging.getLogger("banqueiro")

MOEDAS_CHOICES = ui.MOEDAS_CHOICES


def _sid(interaction):
    return str(interaction.guild_id)


def _parse(oq: str):
    if ":" in oq:
        k, v = oq.split(":", 1)
        return k, v
    return "item", oq


class LanceModal(discord.ui.Modal, title="Dar lance no leilão"):
    valor = discord.ui.TextInput(label="Seu lance (número inteiro)", placeholder="Ex.: 150", max_length=12)

    def __init__(self, cog: "Mercado", leilao_id: int):
        super().__init__(timeout=120)
        self.cog = cog
        self.leilao_id = leilao_id

    async def on_submit(self, interaction: discord.Interaction):
        bruto = str(self.valor.value).strip()
        if not bruto.lstrip("-").isdigit():
            await interaction.response.send_message("⚠️ Informe um número inteiro.", ephemeral=True)
            return
        valor = int(bruto)
        if valor <= 0:
            await interaction.response.send_message("⚠️ O lance precisa ser positivo.", ephemeral=True)
            return
        await self.cog.processar_lance(interaction, self.leilao_id, valor)


class LeilaoView(discord.ui.View):
    def __init__(self, cog: "Mercado", leilao_id: int):
        # Sem persistência entre reinícios do processo de propósito: a
        # resolução por tempo roda pelo banco (ciclo_leiloes), não pela view;
        # só o BOTÃO de lance fica indisponível se o bot reiniciar no meio.
        super().__init__(timeout=3600 * economia.LEILAO_DURACAO_MAX_HORAS)
        self.cog = cog
        self.leilao_id = leilao_id

    @discord.ui.button(label="Dar lance 💰", style=discord.ButtonStyle.success)
    async def lance(self, interaction: discord.Interaction, button: discord.ui.Button):
        await interaction.response.send_modal(LanceModal(self.cog, self.leilao_id))

    async def on_timeout(self):
        for child in self.children:
            child.disabled = True


class Mercado(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        registrar_reinicio_em_erro(self.ciclo_leiloes, "ciclo_leiloes", log)
        registrar_reinicio_em_erro(self.ciclo_cambio_flutuante, "ciclo_cambio_flutuante", log)
        self.ciclo_leiloes.start()
        self.ciclo_cambio_flutuante.start()

    def cog_unload(self):
        self.ciclo_leiloes.cancel()
        self.ciclo_cambio_flutuante.cancel()

    # ── Casa de Leilão ───────────────────────────────────────────────────
    def _embed_leilao(self, leilao: dict) -> discord.Embed:
        simb = ui.simbolo_moeda(leilao["moeda"])
        status_txt = {
            "ativo": "🔨 Em andamento",
            "encerrado": "✅ Encerrado: vendido",
            "sem_lances": "🚫 Encerrado: sem comprador",
            "cancelado": "🗑️ Cancelado",
        }.get(leilao["status"], leilao["status"])
        lance_txt = (
            f"{simb} {leilao['lance_atual']} {leilao['moeda']}"
            if leilao.get("lance_atual")
            else "Nenhum lance ainda"
        )
        vencedor_txt = f"<@{leilao['vencedor_id']}>" if leilao.get("vencedor_id") else "Sem vencedor"
        emb = ui.embed(
            f"🔨 Leilão: {leilao['titulo']}", categoria="troca",
            descricao=f"Vendedor: <@{leilao['vendedor_id']}>\nLance mínimo: {simb} {leilao['lance_minimo']} {leilao['moeda']}",
        )
        emb.add_field(name="Lance atual", value=lance_txt, inline=True)
        emb.add_field(name="Na frente", value=vencedor_txt, inline=True)
        emb.add_field(name="Status", value=status_txt, inline=True)
        if isinstance(leilao.get("expira_em"), datetime):
            emb.add_field(name="Encerra", value=discord.utils.format_dt(leilao["expira_em"], style="R"), inline=False)
        corte = self.bot.db.get_economia_config(leilao["guild_id"])["leilao_corte"]
        emb.set_footer(text=f"{ui.MARCA} · leilão #{leilao['id']} · corte da casa: {int(corte * 100)}%")
        return emb

    async def _entregar_posse(self, leilao: dict, destinatario_id: str) -> None:
        """Entrega ao vencedor, ou devolve ao vendedor (destinatario_id ==
        vendedor_id) quando não houve lance ou o vencedor ficou sem saldo."""
        guild_id, kind, ref, titulo = leilao["guild_id"], leilao["kind"], leilao["ref"], leilao["titulo"]
        if kind == "bau":
            self.bot.db.add_bau(guild_id, destinatario_id, ref, 1)
            return
        if leilao.get("modo_posse") == "cofre":
            eh_devolucao = destinatario_id == leilao["vendedor_id"]
            await self.bot.inventario.resolver_reserva(
                guild_id,
                origem="banqueiro",
                referencia=f"leilao:{guild_id}:{leilao['id']}",
                destino_user_id=None if eh_devolucao else destinatario_id,
            )
            return
        it = self.bot.catalogo.get(ref)
        self.bot.db.add_item(
            guild_id, destinatario_id, ref, it.titulo if it else titulo, it.tipo if it else "equipamento", 1
        )

    async def _ac_meu_inventario(self, interaction, current: str):
        db = self.bot.db
        g, u = str(interaction.guild_id), str(interaction.user.id)
        opts = []
        for i in await self.bot.inventario.listar(g, u):
            opts.append(app_commands.Choice(name=f"[Item] {i.titulo} x{i.quantidade}"[:100], value=f"item:{i.item_id}"))
        for b in db.listar_baus_estoque(g, u):
            bb = economia.bau_compravel_por_id(b["bau_id"])
            nome = bb["nome"] if bb else b["bau_id"]
            opts.append(app_commands.Choice(name=f"[Baú] {nome} x{b['quantidade']}"[:100], value=f"bau:{b['bau_id']}"))
        cur = economia.normalizar(current)
        if cur:
            opts = [o for o in opts if cur in economia.normalizar(o.name)]
        return opts[:25]

    @app_commands.command(name="leilao_iniciar", description="Coloca um item ou baú seu em leilão pros outros jogadores.")
    @app_commands.describe(
        o_que="O que você quer leiloar (item ou baú seu).",
        lance_minimo="Menor lance que você aceita.",
        duracao_horas=f"Duração em horas ({economia.LEILAO_DURACAO_MIN_HORAS}-{economia.LEILAO_DURACAO_MAX_HORAS}).",
        moeda="Moeda do leilão (padrão Lunaris).",
    )
    @app_commands.choices(moeda=MOEDAS_CHOICES)
    async def leilao_iniciar(
        self, interaction: discord.Interaction, o_que: str,
        lance_minimo: app_commands.Range[int, 1],
        duracao_horas: app_commands.Range[int, economia.LEILAO_DURACAO_MIN_HORAS, economia.LEILAO_DURACAO_MAX_HORAS],
        moeda: Optional[app_commands.Choice[str]] = None,
    ):
        if not isinstance(interaction.channel, discord.TextChannel):
            await interaction.response.send_message("Use isso num canal de texto do servidor.", ephemeral=True)
            return
        moeda_nome = moeda.value if moeda else "Lunaris"
        kind, ref = _parse(o_que)
        g, u = _sid(interaction), str(interaction.user.id)
        db = self.bot.db
        db.garantir_jogador(g, u)
        if kind == "bau":
            bb = economia.bau_compravel_por_id(ref)
            if not bb or db.contar_bau(g, u, ref) < 1:
                await interaction.response.send_message("Você não tem esse baú.", ephemeral=True)
                return
            titulo = bb["nome"]
        else:
            inv = {i.item_id: i.titulo for i in await self.bot.inventario.listar(g, u)}
            if ref not in inv:
                await interaction.response.send_message("Você não tem esse item.", ephemeral=True)
                return
            titulo = inv[ref]

        # A retirada de item pode falar com a plataforma (HTTP): defere
        # antes pra não estourar os 3s que o Discord dá pra responder.
        await interaction.response.defer()

        expira_em = datetime.now(timezone.utc) + timedelta(hours=duracao_horas)
        modo_posse = "cofre" if kind == "item" and self.bot.inventario.modo(g, u) == "cofre" else "legado"
        leilao = db.criar_leilao(
            g, u, kind, ref, titulo, moeda_nome, lance_minimo, str(interaction.channel.id), expira_em, modo_posse
        )

        # Tranca a posse SÓ DEPOIS de o leilão existir: a reserva no cofre
        # precisa do id do leilão pra referência (leilao:{guild}:{id}), e se
        # a retirada falhar cancelamos o leilão em vez de deixar um leilão
        # "ativo" sem o item ter saído de fato.
        if kind == "bau":
            # remover_bau devolve False (sem levantar) se a quantidade já não
            # é mais suficiente: ignorar o retorno deixava o leilão "ativo"
            # mesmo sem o baú ter saído de fato do vendedor — bastava chamar
            # /leilao_iniciar duas vezes rápido pro mesmo baú pra duplicá-lo
            # quando os dois leilões resolvessem.
            if not db.remover_bau(g, u, ref, 1):
                db.encerrar_leilao(leilao["id"], "cancelado")
                await interaction.followup.send("Você não tem mais esse baú.", ephemeral=True)
                return
        else:
            try:
                if modo_posse == "cofre":
                    await self.bot.inventario.reservar(
                        g, u, ref, 1,
                        origem="banqueiro", referencia=f"leilao:{g}:{leilao['id']}",
                        motivo=f"Leilão: {titulo}", expira_em=expira_em.isoformat(),
                    )
                else:
                    db.remover_item(g, u, ref, 1)
            except (ItemIndisponivel, CofreIndisponivel) as exc:
                db.encerrar_leilao(leilao["id"], "cancelado")
                mensagem = (
                    "Você não tem mais esse item."
                    if isinstance(exc, ItemIndisponivel)
                    else "O cofre central não respondeu. O leilão não foi criado: tente de novo em instantes."
                )
                await interaction.followup.send(mensagem, ephemeral=True)
                return

        view = LeilaoView(self, leilao["id"])
        await interaction.followup.send(embed=self._embed_leilao(leilao), view=view)
        mensagem = await interaction.original_response()
        db.set_leilao_mensagem(leilao["id"], str(mensagem.id))

    @leilao_iniciar.autocomplete("o_que")
    async def leilao_iniciar_ac(self, interaction, current: str):
        return await self._ac_meu_inventario(interaction, current)

    @app_commands.command(name="leilao_ver", description="Lista os leilões ativos do servidor.")
    async def leilao_ver(self, interaction: discord.Interaction):
        ativos = self.bot.db.listar_leiloes_ativos(_sid(interaction))
        if not ativos:
            await interaction.response.send_message("Nenhum leilão ativo agora. Use `/leilao_iniciar`.", ephemeral=True)
            return
        linhas = []
        for leilao in ativos:
            simb = ui.simbolo_moeda(leilao["moeda"])
            lance = f"{simb} {leilao['lance_atual']}" if leilao["lance_atual"] else "sem lances"
            linhas.append(
                f"`#{leilao['id']}` **{leilao['titulo']}**: {lance} {leilao['moeda']} · "
                f"encerra {discord.utils.format_dt(leilao['expira_em'], style='R')}"
            )
        emb = ui.embed("🔨 Leilões ativos", categoria="troca", descricao="\n".join(linhas))
        await interaction.response.send_message(embed=emb, ephemeral=True)

    @app_commands.command(
        name="leilao_cancelar",
        description="Cancela seu leilão ativo (só antes do primeiro lance) e recupera o item.",
    )
    @app_commands.describe(leilao_id="Número (#) do leilão que você quer cancelar.")
    async def leilao_cancelar(self, interaction: discord.Interaction, leilao_id: int):
        db = self.bot.db
        leilao = db.get_leilao(leilao_id)
        if leilao is None or leilao["guild_id"] != _sid(interaction):
            await interaction.response.send_message("Não achei esse leilão nesse servidor.", ephemeral=True)
            return
        uid = str(interaction.user.id)
        if leilao["vendedor_id"] != uid:
            await interaction.response.send_message("Só quem criou o leilão pode cancelá-lo.", ephemeral=True)
            return
        if leilao["status"] != "ativo":
            await interaction.response.send_message("Esse leilão já não está mais ativo.", ephemeral=True)
            return
        if leilao["vencedor_id"] is not None:
            await interaction.response.send_message(
                "Esse leilão já recebeu lance: não dá mais pra cancelar, só esperar encerrar.", ephemeral=True
            )
            return

        await interaction.response.defer(ephemeral=True)
        try:
            await self._entregar_posse(leilao, leilao["vendedor_id"])
        except (ItemIndisponivel, CofreIndisponivel):
            await interaction.followup.send(
                "O cofre central não respondeu. Nada foi cancelado: tente de novo em instantes.", ephemeral=True
            )
            return
        db.encerrar_leilao(leilao_id, "cancelado")

        guild = interaction.guild
        if guild is not None and leilao.get("mensagem_id"):
            canal = guild.get_channel(int(leilao["canal_id"]))
            if isinstance(canal, discord.TextChannel):
                try:
                    mensagem = await canal.fetch_message(int(leilao["mensagem_id"]))
                    await mensagem.edit(embed=self._embed_leilao(dict(leilao, status="cancelado")), view=None)
                except discord.HTTPException:
                    log.info("nao consegui atualizar a mensagem do leilao cancelado %s", leilao_id)
        await interaction.followup.send(f"🗑️ Leilão #{leilao_id} cancelado: o item voltou pra você.", ephemeral=True)

    async def processar_lance(self, interaction: discord.Interaction, leilao_id: int, valor: int) -> None:
        db = self.bot.db
        leilao = db.get_leilao(leilao_id)
        if leilao is None or leilao["status"] != "ativo":
            await interaction.response.send_message("Esse leilão já foi encerrado.", ephemeral=True)
            return
        sid, uid = str(interaction.guild_id), str(interaction.user.id)
        if uid == leilao["vendedor_id"]:
            await interaction.response.send_message("Você não pode dar lance no seu próprio leilão.", ephemeral=True)
            return
        db.garantir_jogador(sid, uid)
        try:
            atualizado = db.dar_lance_leilao_com_custodia(
                leilao_id, sid, uid, valor
            )
        except SaldoInsuficiente as exc:
            await interaction.response.send_message(f"💸 {exc}", ephemeral=True)
            return
        if atualizado is None:
            await interaction.response.send_message(
                "⚠️ Esse lance não superou o lance atual (ou o mínimo). Tente um valor maior.", ephemeral=True
            )
            return
        simb = ui.simbolo_moeda(leilao["moeda"])
        await interaction.response.send_message(
            f"✅ Lance registrado e reservado em custódia: {simb} {valor} {leilao['moeda']}!",
            ephemeral=True,
        )
        try:
            canal = interaction.guild.get_channel(int(atualizado["canal_id"])) if interaction.guild else None
            if isinstance(canal, discord.TextChannel) and atualizado.get("mensagem_id"):
                mensagem = await canal.fetch_message(int(atualizado["mensagem_id"]))
                await mensagem.edit(embed=self._embed_leilao(atualizado))
        except discord.HTTPException:
            log.info("nao consegui atualizar o embed do leilao %s", leilao_id)

    @tasks.loop(minutes=1)
    async def ciclo_leiloes(self):
        agora = datetime.now(timezone.utc)
        for leilao in self.bot.db.listar_leiloes_expirados(agora):
            try:
                await self._resolver_leilao(leilao)
            except Exception:
                log.exception("erro ao resolver leilao %s", leilao.get("id"))

    @ciclo_leiloes.before_loop
    async def _antes_leiloes(self):
        await self.bot.wait_until_ready()

    async def _resolver_leilao(self, leilao: dict) -> None:
        db = self.bot.db
        if leilao["vencedor_id"] is None:
            # Nenhum dinheiro em jogo ainda: se a devolução falhar (cofre
            # fora do ar), é seguro deixar o leilão "ativo" e o próprio
            # ciclo_leiloes tenta de novo no minuto seguinte (resolver_reserva
            # é idempotente: reservar de novo não duplica nada).
            await self._entregar_posse(leilao, leilao["vendedor_id"])
            db.encerrar_leilao(leilao["id"], "sem_lances")
            resultado = dict(leilao, status="sem_lances")
        else:
            corte = db.get_economia_config(leilao["guild_id"])["leilao_corte"]
            liquidacao = db.liquidar_leilao_com_custodia(leilao["id"], corte)
            pago = liquidacao is not None
            if not pago:
                # Compatibilidade com leilões ativos criados antes da versão
                # de custódia: eles ainda cobram no encerramento uma vez.
                try:
                    db.transferir_carteira_com_taxa(
                        leilao["guild_id"],
                        leilao["vencedor_id"],
                        leilao["vendedor_id"],
                        leilao["moeda"],
                        leilao["lance_atual"],
                        economia.valor_liquido_leilao(leilao["lance_atual"], taxa=corte),
                        f"Venceu o leilão de {leilao['titulo']}",
                        f"Vendeu {leilao['titulo']} em leilão",
                    )
                    pago = True
                except SaldoInsuficiente:
                    pago = False
            if not pago:
                await self._entregar_posse(leilao, leilao["vendedor_id"])
                db.encerrar_leilao(leilao["id"], "sem_lances")
                db.criar_aviso(
                    leilao["guild_id"],
                    f"🔨 O leilão de **{leilao['titulo']}** foi cancelado: o maior lance não tinha "
                    "mais saldo suficiente na hora de fechar.",
                )
                resultado = dict(leilao, status="sem_lances")
            else:
                # Aqui o dinheiro JÁ trocou de mãos: diferente dos outros
                # dois ramos, deixar a exceção propagar faria o ciclo
                # reprocessar (e debitar/creditar de novo) no minuto
                # seguinte. Se a entrega falhar, a reserva continua
                # 'reservada' na plataforma (recuperável depois via
                # GET/POST /interno/discord/cofre/reservas*): encerramos o
                # leilão mesmo assim e avisamos, em vez de arriscar cobrar
                # duas vezes.
                try:
                    await self._entregar_posse(leilao, leilao["vencedor_id"])
                except (ItemIndisponivel, CofreIndisponivel):
                    log.exception(
                        "leilao %s pago mas a entrega falhou: item continua reservado na plataforma",
                        leilao["id"],
                    )
                    db.criar_aviso(
                        leilao["guild_id"],
                        f"⚠️ O leilão de **{leilao['titulo']}** foi pago, mas a entrega falhou. "
                        f"O item continua reservado: peça pra um admin da plataforma liberar "
                        f"manualmente (leilão #{leilao['id']}).",
                    )
                db.encerrar_leilao(leilao["id"], "encerrado")
                db.criar_aviso(
                    leilao["guild_id"],
                    f"🔨 Leilão encerrado: <@{leilao['vencedor_id']}> levou **{leilao['titulo']}** "
                    f"por {leilao['lance_atual']} {leilao['moeda']}!",
                )
                resultado = dict(leilao, status="encerrado")

        if resultado["status"] == "encerrado":
            vencedor = self.bot.get_user(int(leilao["vencedor_id"]))
            vendedor = self.bot.get_user(int(leilao["vendedor_id"]))
            if vencedor:
                await enviar_alerta_banco(
                    self.bot,
                    leilao["guild_id"],
                    vencedor,
                    "mercado",
                    f"🔨 Você venceu o leilão de **{leilao['titulo']}** por {leilao['lance_atual']} {leilao['moeda']}.",
                )
            if vendedor:
                await enviar_alerta_banco(
                    self.bot,
                    leilao["guild_id"],
                    vendedor,
                    "mercado",
                    f"🔨 Seu leilão de **{leilao['titulo']}** foi concluído.",
                )

        guild = self.bot.get_guild(int(leilao["guild_id"]))
        if guild is not None and leilao.get("mensagem_id"):
            canal = guild.get_channel(int(leilao["canal_id"]))
            if isinstance(canal, discord.TextChannel):
                try:
                    mensagem = await canal.fetch_message(int(leilao["mensagem_id"]))
                    await mensagem.edit(embed=self._embed_leilao(resultado), view=None)
                except discord.HTTPException:
                    log.info("nao consegui atualizar a mensagem final do leilao %s", leilao["id"])

    # ── Câmbio flutuante automático ──────────────────────────────────────
    @tasks.loop(hours=24)
    async def ciclo_cambio_flutuante(self):
        for gid in self.bot.db.listar_guilds_cambio_auto():
            # tasks.loop dispara a primeira iteracao assim que o bot sobe: sem
            # isto, todo restart ajustava o cambio de novo mesmo horas depois
            # do ultimo ajuste diario.
            if not self.bot.db.ciclo_guild_devido(gid, "cambio_flutuante", 24):
                continue
            try:
                await self._ajustar_cambio_guild(gid)
                self.bot.db.marcar_ciclo_guild(gid, "cambio_flutuante")
            except Exception:
                log.exception("erro no ciclo de cambio flutuante (guild %s)", gid)

    @ciclo_cambio_flutuante.before_loop
    async def _antes_cambio_flutuante(self):
        await self.bot.wait_until_ready()

    async def _ajustar_cambio_guild(self, gid: str) -> None:
        db = self.bot.db
        rate_atual, taxa = db.get_cambio(gid)
        compra, venda = db.fluxo_cambio_periodo(gid)
        novo_rate = economia.ajustar_cambio_flutuante(rate_atual, compra, venda)
        if novo_rate != rate_atual:
            db.set_cambio(gid, novo_rate, taxa)
            db.criar_aviso(
                gid,
                f"💱 O câmbio flutuante ajustou sozinho: agora 1 Solares = {novo_rate} Lunaris "
                "(baseado na demanda do último período).",
            )

    @app_commands.command(
        name="cambio_auto",
        description="[Mestre] Liga/desliga o câmbio flutuante automático (ajusta a taxa pela demanda de compra/venda).",
    )
    @app_commands.default_permissions(manage_guild=True)
    @app_commands.checks.has_permissions(manage_guild=True)
    @app_commands.describe(ligar="Ligar (True) ou desligar (False).")
    async def cambio_auto(self, interaction: discord.Interaction, ligar: bool):
        gid = _sid(interaction)
        self.bot.db.set_cambio_auto(gid, ligar)
        msg = (
            "✅ Câmbio flutuante **ligado**: a taxa se ajusta sozinha 1x/dia conforme a demanda de conversão."
            if ligar
            else "✅ Câmbio flutuante **desligado**: a taxa só muda com `/setcambio`."
        )
        await interaction.response.send_message(msg, ephemeral=True)


async def setup(bot):
    await bot.add_cog(Mercado(bot))
