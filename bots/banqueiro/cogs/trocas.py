"""Cog Trocas: um player oferece um item ou baú seu a outro por um preço.
O alvo aceita/recusa no botão; a troca é atômica (verifica posse e saldo).

Baús continuam numa tabela só do bot (`baus_estoque`): não fazem parte do
cofre unificado da plataforma. Item, sim: pode estar no cofre da conta (se o
jogador vinculou) ou na tabela legada `inventario`: a fachada `Inventario`
(core/inventario.py) esconde qual dos dois é, tanto pra ler posse quanto pra
mover. Um /trocar cruzando baú com item continua não-atômico ENTRE os dois
estoques (isso é aceito: ver Fase 2 do plano); dentro de cada estoque, a
troca é atômica ou reverte."""

from __future__ import annotations

from typing import Optional

import discord
from discord import app_commands
from discord.ext import commands

from core import economia, ui
from core.db import SaldoInsuficiente
from core.inventario import CofreIndisponivel, ItemIndisponivel

SIMBOLO = ui.SIMBOLO_MOEDA
MOEDAS_CHOICES = ui.MOEDAS_CHOICES


def _parse(oq: str):
    if ":" in oq:
        k, v = oq.split(":", 1)
        return k, v
    return "item", oq


class OfertaView(discord.ui.View):
    def __init__(self, cog, guild_id, ofertante_id, alvo_id, kind, ref, titulo, preco, moeda, timeout=120):
        super().__init__(timeout=timeout)
        self.cog = cog
        self.guild_id = guild_id
        self.ofertante_id = ofertante_id
        self.alvo_id = alvo_id
        self.kind = kind
        self.ref = ref
        self.titulo = titulo
        self.preco = preco
        self.moeda = moeda
        self.resolvido = False
        self.message = None

    async def interaction_check(self, interaction: discord.Interaction) -> bool:
        if interaction.user.id not in (self.alvo_id, self.ofertante_id):
            await interaction.response.send_message("Essa oferta não é sua.", ephemeral=True)
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
            await self._fechar()

    @discord.ui.button(label="Aceitar ✅", style=discord.ButtonStyle.success)
    async def aceitar(self, interaction: discord.Interaction, button: discord.ui.Button):
        if interaction.user.id != self.alvo_id:
            await interaction.response.send_message("Só quem recebeu a oferta pode aceitar.", ephemeral=True)
            return
        if self.resolvido:
            await interaction.response.send_message("Oferta já resolvida.", ephemeral=True)
            return
        self.resolvido = True
        # executar_troca pode falar com a plataforma (HTTP) agora: defere
        # antes pra não estourar os 3s que o Discord dá pra responder.
        await interaction.response.defer(ephemeral=True)
        ok, msg = await self.cog.executar_troca(
            self.guild_id, str(self.ofertante_id), str(self.alvo_id),
            self.kind, self.ref, self.titulo, self.preco, self.moeda,
            chave=f"oferta:{interaction.id}",
        )
        await self._fechar()
        await interaction.followup.send(msg, ephemeral=not ok)
        self.stop()

    @discord.ui.button(label="Recusar ❌", style=discord.ButtonStyle.danger)
    async def recusar(self, interaction: discord.Interaction, button: discord.ui.Button):
        if interaction.user.id != self.alvo_id:
            await interaction.response.send_message("Só quem recebeu a oferta pode recusar.", ephemeral=True)
            return
        if self.resolvido:
            await interaction.response.send_message("Oferta já resolvida.", ephemeral=True)
            return
        self.resolvido = True
        await self._fechar()
        await interaction.response.send_message("Oferta recusada.", ephemeral=True)
        self.stop()

    @discord.ui.button(label="Cancelar 🗑️", style=discord.ButtonStyle.secondary)
    async def cancelar(self, interaction: discord.Interaction, button: discord.ui.Button):
        if interaction.user.id != self.ofertante_id:
            await interaction.response.send_message("Só quem ofereceu pode cancelar.", ephemeral=True)
            return
        if self.resolvido:
            await interaction.response.send_message("Oferta já resolvida.", ephemeral=True)
            return
        self.resolvido = True
        await self._fechar()
        await interaction.response.send_message("Oferta cancelada.", ephemeral=True)
        self.stop()


class TrocaBidirecionalView(discord.ui.View):
    """/trocar: os dois lados dão algo; só executa se o alvo aceitar."""

    def __init__(
        self, cog, guild_id, ofertante_id, alvo_id,
        meu_kind, meu_ref, meu_titulo, dele_kind, dele_ref, dele_titulo,
        timeout=180,
    ):
        super().__init__(timeout=timeout)
        self.cog = cog
        self.guild_id = guild_id
        self.ofertante_id = ofertante_id
        self.alvo_id = alvo_id
        self.meu_kind = meu_kind
        self.meu_ref = meu_ref
        self.meu_titulo = meu_titulo
        self.dele_kind = dele_kind
        self.dele_ref = dele_ref
        self.dele_titulo = dele_titulo
        self.resolvido = False
        self.message = None

    async def interaction_check(self, interaction: discord.Interaction) -> bool:
        if interaction.user.id not in (self.alvo_id, self.ofertante_id):
            await interaction.response.send_message("Essa troca não é sua.", ephemeral=True)
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
            await self._fechar()

    @discord.ui.button(label="Aceitar ✅", style=discord.ButtonStyle.success)
    async def aceitar(self, interaction: discord.Interaction, button: discord.ui.Button):
        if interaction.user.id != self.alvo_id:
            await interaction.response.send_message("Só quem recebeu a proposta pode aceitar.", ephemeral=True)
            return
        if self.resolvido:
            await interaction.response.send_message("Troca já resolvida.", ephemeral=True)
            return
        self.resolvido = True
        await interaction.response.defer(ephemeral=True)
        ok, msg = await self.cog.executar_troca_bidirecional(
            self.guild_id, str(self.ofertante_id), str(self.alvo_id),
            self.meu_kind, self.meu_ref, self.meu_titulo,
            self.dele_kind, self.dele_ref, self.dele_titulo,
            chave=f"troca:{interaction.id}",
        )
        await self._fechar()
        await interaction.followup.send(msg, ephemeral=not ok)
        self.stop()

    @discord.ui.button(label="Recusar ❌", style=discord.ButtonStyle.danger)
    async def recusar(self, interaction: discord.Interaction, button: discord.ui.Button):
        if interaction.user.id != self.alvo_id:
            await interaction.response.send_message("Só quem recebeu a proposta pode recusar.", ephemeral=True)
            return
        if self.resolvido:
            await interaction.response.send_message("Troca já resolvida.", ephemeral=True)
            return
        self.resolvido = True
        await self._fechar()
        await interaction.response.send_message("Troca recusada.", ephemeral=True)
        self.stop()

    @discord.ui.button(label="Cancelar 🗑️", style=discord.ButtonStyle.secondary)
    async def cancelar(self, interaction: discord.Interaction, button: discord.ui.Button):
        if interaction.user.id != self.ofertante_id:
            await interaction.response.send_message("Só quem propôs pode cancelar.", ephemeral=True)
            return
        if self.resolvido:
            await interaction.response.send_message("Troca já resolvida.", ephemeral=True)
            return
        self.resolvido = True
        await self._fechar()
        await interaction.response.send_message("Troca cancelada.", ephemeral=True)
        self.stop()


class Trocas(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    async def _mover_item_entre_jogadores(self, guild_id, de_id, para_id, item_id, titulo_fallback, *, motivo, chave):
        """Tira de um jogador e dá pro outro, cobrindo qualquer mistura de
        modo (cofre/legado) sem precisar saber qual é qual: cada chamada
        decide o modo do SEU participante de forma independente. `tirar()`
        é o único ponto que pode abortar (levanta antes de escrever
        qualquer coisa); `dar()` praticamente nunca falha de verdade: cai
        pro cofre local do destinatário em qualquer problema da plataforma."""
        item = await self.bot.inventario.tirar(guild_id, de_id, item_id, 1, motivo=motivo, chave=f"{chave}:retirar")
        await self.bot.inventario.dar(
            guild_id, para_id, item.item_id, item.titulo or titulo_fallback, item.tipo, 1,
            dados=item.dados, motivo=motivo, chave=f"{chave}:entregar",
        )
        return item

    async def executar_troca(self, guild_id, vendedor_id, comprador_id, kind, ref, titulo, preco, moeda, *, chave):
        """Executa a troca de forma atômica-ish (checa tudo antes de mover)."""
        db = self.bot.db
        if kind == "bau":
            if db.contar_bau(guild_id, vendedor_id, ref) < 1:
                return False, "O ofertante não tem mais esse baú."
        else:
            posse = {i.item_id for i in await self.bot.inventario.listar(guild_id, vendedor_id)}
            if ref not in posse:
                return False, "O ofertante não tem mais esse item."
        if db.get_saldo(guild_id, comprador_id, moeda) < preco:
            return False, f"Você não tem {preco} {moeda} pra fechar a troca."
        if kind == "item" and not await self.bot.inventario.cabe(guild_id, comprador_id, 1):
            return False, "Seu cofre está cheio. Use `/cofre_melhorar` antes de receber o item."
        custodia_chave = f"troca:{chave}"
        try:
            db.reservar_custodia_moeda(
                custodia_chave,
                guild_id,
                comprador_id,
                moeda,
                preco,
                f"Valor reservado para comprar {titulo}",
            )
        except SaldoInsuficiente as e:
            return False, str(e)
        if kind == "bau":
            if not db.remover_bau(guild_id, vendedor_id, ref, 1):
                db.devolver_custodia_moeda(
                    custodia_chave, "Troca cancelada: custódia devolvida"
                )
                return False, "O ofertante não tem mais esse baú."
            db.add_bau(guild_id, comprador_id, ref, 1)
        else:
            try:
                await self._mover_item_entre_jogadores(
                    guild_id, vendedor_id, comprador_id, ref, titulo, motivo=f"Troca: {titulo}", chave=chave
                )
            except (ItemIndisponivel, CofreIndisponivel) as exc:
                # O item não saiu do lugar (tirar() aborta antes de escrever
                # qualquer coisa): devolve o dinheiro já debitado.
                db.devolver_custodia_moeda(
                    custodia_chave, "Troca cancelada: custódia devolvida"
                )
                mensagem = (
                    "O ofertante não tem mais esse item."
                    if isinstance(exc, ItemIndisponivel)
                    else "O cofre central não respondeu. A troca não foi feita: tente de novo em instantes."
                )
                return False, mensagem
        db.transferir_custodia_moeda(
            custodia_chave, vendedor_id, f"Troca: vendeu {titulo}"
        )
        simb = SIMBOLO.get(economia.normalizar(moeda), "")
        return True, f"✅ Troca fechada! **{titulo}** por {simb} {preco} {moeda}."

    async def _ac_oferecer(self, interaction, current):
        db = self.bot.db
        g, u = str(interaction.guild_id), str(interaction.user.id)
        db.garantir_jogador(g, u)
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

    @app_commands.command(description="Oferece um item ou baú seu a outro player por um preço.")
    @app_commands.describe(para="Pra quem você oferece.", o_que="O que você oferece (item ou baú seu).",
                           preco="Preço que você pede.", moeda="Moeda (padrão Lunaris).")
    @app_commands.choices(moeda=MOEDAS_CHOICES)
    async def oferecer(self, interaction: discord.Interaction, para: discord.Member, o_que: str,
                       preco: app_commands.Range[int, 1], moeda: Optional[app_commands.Choice[str]] = None):
        if para.id == interaction.user.id:
            await interaction.response.send_message("Você não pode ofertar pra si mesmo.", ephemeral=True)
            return
        if para.bot:
            await interaction.response.send_message("Não dá pra ofertar pra um bot.", ephemeral=True)
            return
        moeda_nome = moeda.value if moeda else "Lunaris"
        kind, ref = _parse(o_que)
        g, u = str(interaction.guild_id), str(interaction.user.id)
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
        view = OfertaView(self, g, interaction.user.id, para.id, kind, ref, titulo, preco, moeda_nome)
        simb = SIMBOLO.get(economia.normalizar(moeda_nome), "")
        emb = ui.embed("🤝 Proposta de troca", categoria="troca",
                       descricao=f"{interaction.user.mention} oferece **{titulo}** a {para.mention} "
                                 f"por {simb} **{preco} {moeda_nome}**.\n{para.mention}, aceita?")
        await interaction.response.send_message(content=para.mention, embed=emb, view=view)
        view.message = await interaction.original_response()

    @oferecer.autocomplete("o_que")
    async def oferecer_ac(self, interaction, current: str):
        return await self._ac_oferecer(interaction, current)

    # ── /trocar: escrow bidirecional: os dois lados dão algo, atômico ─────
    async def _titulo_posse(self, guild_id, user_id, kind, ref):
        db = self.bot.db
        if kind == "bau":
            bb = economia.bau_compravel_por_id(ref)
            if not bb or db.contar_bau(guild_id, user_id, ref) < 1:
                return None
            return bb["nome"]
        inv = {i.item_id: i.titulo for i in await self.bot.inventario.listar(guild_id, user_id)}
        return inv.get(ref)

    async def executar_troca_bidirecional(
        self, guild_id, ofertante_id, alvo_id,
        meu_kind, meu_ref, meu_titulo, dele_kind, dele_ref, dele_titulo, *, chave,
    ):
        """Valida posse dos DOIS lados antes de mover qualquer coisa: ou troca
        tudo, ou não troca nada. Sem risco de golpe pra nenhum dos lados."""
        db = self.bot.db
        if meu_kind == "bau":
            if db.contar_bau(guild_id, ofertante_id, meu_ref) < 1:
                return False, "Você não tem mais esse baú."
        else:
            posse_ofertante = {i.item_id for i in await self.bot.inventario.listar(guild_id, ofertante_id)}
            if meu_ref not in posse_ofertante:
                return False, "Você não tem mais esse item."
        if dele_kind == "bau":
            if db.contar_bau(guild_id, alvo_id, dele_ref) < 1:
                return False, "A outra pessoa não tem mais esse baú."
        else:
            posse_alvo = {i.item_id for i in await self.bot.inventario.listar(guild_id, alvo_id)}
            if dele_ref not in posse_alvo:
                return False, "A outra pessoa não tem mais esse item."
        if meu_kind == "item" and not await self.bot.inventario.cabe(guild_id, alvo_id, 1):
            return False, "O cofre da outra pessoa está cheio."
        if dele_kind == "item" and not await self.bot.inventario.cabe(guild_id, ofertante_id, 1):
            return False, "Seu cofre está cheio. Use `/cofre_melhorar`."

        # Retira os DOIS lados antes de entregar qualquer um. Se qualquer
        # etapa falhar, devolve tudo que já saiu até ali. remover_bau devolve
        # False (sem levantar) quando a quantidade já não é mais suficiente
        # — ignorar esse retorno (como o código fazia antes) deixava a troca
        # seguir em frente e duplicar o baú do outro lado: o await real de
        # Inventario.tirar() no lado item dá tempo de sobra pro dono do baú
        # gastá-lo em outro comando enquanto essa troca ainda está em voo.
        meu_retirado = None
        dele_retirado = None
        meu_bau_removido = False
        dele_bau_removido = False

        async def _reverter(mensagem: str):
            if meu_retirado is not None:
                await self.bot.inventario.dar(
                    guild_id, ofertante_id, meu_retirado.item_id, meu_retirado.titulo or meu_titulo, meu_retirado.tipo, 1,
                    dados=meu_retirado.dados, motivo="Estorno de troca cancelada", chave=f"{chave}:estorno-ofertante",
                )
            if dele_retirado is not None:
                await self.bot.inventario.dar(
                    guild_id, alvo_id, dele_retirado.item_id, dele_retirado.titulo or dele_titulo, dele_retirado.tipo, 1,
                    dados=dele_retirado.dados, motivo="Estorno de troca cancelada", chave=f"{chave}:estorno-alvo",
                )
            if meu_bau_removido:
                db.add_bau(guild_id, ofertante_id, meu_ref, 1)
            if dele_bau_removido:
                db.add_bau(guild_id, alvo_id, dele_ref, 1)
            return False, mensagem

        try:
            if meu_kind == "item":
                meu_retirado = await self.bot.inventario.tirar(
                    guild_id, ofertante_id, meu_ref, 1, motivo=f"Troca: {meu_titulo}", chave=f"{chave}:retirar-ofertante"
                )
            else:
                if not db.remover_bau(guild_id, ofertante_id, meu_ref, 1):
                    return await _reverter("Você não tem mais esse baú.")
                meu_bau_removido = True
            if dele_kind == "item":
                dele_retirado = await self.bot.inventario.tirar(
                    guild_id, alvo_id, dele_ref, 1, motivo=f"Troca: {dele_titulo}", chave=f"{chave}:retirar-alvo"
                )
            else:
                if not db.remover_bau(guild_id, alvo_id, dele_ref, 1):
                    return await _reverter("A outra pessoa não tem mais esse baú.")
                dele_bau_removido = True
        except (ItemIndisponivel, CofreIndisponivel) as exc:
            mensagem = (
                "Um dos itens não estava mais disponível."
                if isinstance(exc, ItemIndisponivel)
                else "O cofre central não respondeu. A troca não foi feita: tente de novo em instantes."
            )
            return await _reverter(mensagem)

        # Baú de cada lado já foi removido (e checado) acima; só falta
        # entregar quem é item.
        if meu_kind == "item":
            await self.bot.inventario.dar(
                guild_id, alvo_id, meu_retirado.item_id, meu_retirado.titulo or meu_titulo, meu_retirado.tipo, 1,
                dados=meu_retirado.dados, motivo=f"Troca: {meu_titulo}", chave=f"{chave}:entregar-alvo",
            )
        else:
            db.add_bau(guild_id, alvo_id, meu_ref, 1)
        if dele_kind == "item":
            await self.bot.inventario.dar(
                guild_id, ofertante_id, dele_retirado.item_id, dele_retirado.titulo or dele_titulo, dele_retirado.tipo, 1,
                dados=dele_retirado.dados, motivo=f"Troca: {dele_titulo}", chave=f"{chave}:entregar-ofertante",
            )
        else:
            db.add_bau(guild_id, ofertante_id, dele_ref, 1)

        return True, f"✅ Troca fechada! **{meu_titulo}** por **{dele_titulo}**."

    async def _ac_inventario_de(self, interaction, current, user_id):
        db = self.bot.db
        g = str(interaction.guild_id)
        opts = []
        for i in await self.bot.inventario.listar(g, user_id):
            opts.append(app_commands.Choice(name=f"[Item] {i.titulo} x{i.quantidade}"[:100], value=f"item:{i.item_id}"))
        for b in db.listar_baus_estoque(g, user_id):
            bb = economia.bau_compravel_por_id(b["bau_id"])
            nome = bb["nome"] if bb else b["bau_id"]
            opts.append(app_commands.Choice(name=f"[Baú] {nome} x{b['quantidade']}"[:100], value=f"bau:{b['bau_id']}"))
        cur = economia.normalizar(current)
        if cur:
            opts = [o for o in opts if cur in economia.normalizar(o.name)]
        return opts[:25]

    @app_commands.command(description="Troca segura: você dá um item/baú seu e recebe um da outra pessoa, só se ela aceitar.")
    @app_commands.describe(
        membro="Com quem você quer trocar.",
        meu_item="O que você oferece (seu).",
        item_dele="O que você quer em troca (dela).",
    )
    async def trocar(self, interaction: discord.Interaction, membro: discord.Member, meu_item: str, item_dele: str):
        if membro.id == interaction.user.id:
            await interaction.response.send_message("Você não pode trocar consigo mesmo.", ephemeral=True)
            return
        if membro.bot:
            await interaction.response.send_message("Não dá pra trocar com um bot.", ephemeral=True)
            return
        g, u = str(interaction.guild_id), str(interaction.user.id)
        db = self.bot.db
        db.garantir_jogador(g, u)
        db.garantir_jogador(g, str(membro.id))
        meu_kind, meu_ref = _parse(meu_item)
        dele_kind, dele_ref = _parse(item_dele)
        meu_titulo = await self._titulo_posse(g, u, meu_kind, meu_ref)
        if meu_titulo is None:
            await interaction.response.send_message("Você não tem esse item/baú.", ephemeral=True)
            return
        dele_titulo = await self._titulo_posse(g, str(membro.id), dele_kind, dele_ref)
        if dele_titulo is None:
            await interaction.response.send_message(f"{membro.display_name} não tem esse item/baú.", ephemeral=True)
            return
        view = TrocaBidirecionalView(
            self, g, interaction.user.id, membro.id,
            meu_kind, meu_ref, meu_titulo, dele_kind, dele_ref, dele_titulo,
        )
        emb = ui.embed(
            "🤝 Proposta de troca segura", categoria="troca",
            descricao=(
                f"{interaction.user.mention} oferece **{meu_titulo}** por **{dele_titulo}** de {membro.mention}.\n"
                f"Ninguém perde a posse até {membro.mention} aceitar: sem risco de calote.\n"
                f"{membro.mention}, aceita?"
            ),
        )
        await interaction.response.send_message(content=membro.mention, embed=emb, view=view)
        view.message = await interaction.original_response()

    @trocar.autocomplete("meu_item")
    async def trocar_meu_ac(self, interaction, current: str):
        return await self._ac_inventario_de(interaction, current, str(interaction.user.id))

    @trocar.autocomplete("item_dele")
    async def trocar_dele_ac(self, interaction, current: str):
        alvo = getattr(interaction.namespace, "membro", None)
        if alvo is None:
            return []
        return await self._ac_inventario_de(interaction, current, str(alvo.id))


async def setup(bot):
    await bot.add_cog(Trocas(bot))
