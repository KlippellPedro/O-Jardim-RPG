"""Cog Admin: comandos de mestre (Gerenciar Servidor)."""

from __future__ import annotations

import logging
from typing import List, Optional

import discord
from discord import app_commands
from discord.ext import commands

from core import economia, ui
from core.db import SaldoInsuficiente
from core.inventario import CofreIndisponivel, ItemIndisponivel

log = logging.getLogger("banqueiro")

MOEDAS_CHOICES = ui.MOEDAS_CHOICES
CONFIRMACAO_RESET_TUDO = "RESETAR-TUDO"


class ConfirmarView(discord.ui.View):
    """Botão de confirmação genérico pra ações destrutivas do mestre
    (/resetjogador, /catalogo_republicar): sem isso, um clique errado no
    autocomplete de membro já destruía dados sem chance de voltar atrás."""

    def __init__(self, *, autor_id: int, timeout: float = 60):
        super().__init__(timeout=timeout)
        self.autor_id = autor_id
        self.confirmado: Optional[bool] = None

    async def interaction_check(self, interaction: discord.Interaction) -> bool:
        if interaction.user.id != self.autor_id:
            await interaction.response.send_message("Só quem pediu esse comando pode confirmar.", ephemeral=True)
            return False
        return True

    @discord.ui.button(label="Confirmar", style=discord.ButtonStyle.danger)
    async def confirmar(self, interaction: discord.Interaction, button: discord.ui.Button):
        self.confirmado = True
        for item in self.children:
            item.disabled = True
        await interaction.response.edit_message(view=self)
        self.stop()

    @discord.ui.button(label="Cancelar", style=discord.ButtonStyle.secondary)
    async def cancelar(self, interaction: discord.Interaction, button: discord.ui.Button):
        self.confirmado = False
        for item in self.children:
            item.disabled = True
        await interaction.response.edit_message(view=self)
        self.stop()

    async def on_timeout(self) -> None:
        self.confirmado = False
        for item in self.children:
            item.disabled = True


class Admin(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    async def _ac_itens(self, interaction, current: str) -> List[app_commands.Choice[str]]:
        cat = getattr(self.bot, "catalogo", None)
        if cat is None:
            return []
        itens = cat.buscar(current, limite=25) if current else cat.listar()[:25]
        return [app_commands.Choice(name=i.titulo[:100], value=i.id) for i in itens]

    @app_commands.command(description="[Mestre] Dá moeda a um jogador.")
    @app_commands.default_permissions(manage_guild=True)
    @app_commands.checks.has_permissions(manage_guild=True)
    @app_commands.choices(moeda=MOEDAS_CHOICES)
    async def dar(self, interaction, membro: discord.Member, moeda: app_commands.Choice[str], quantia: app_commands.Range[int, 1]):
        sid = str(interaction.guild_id)
        novo = self.bot.db.creditar(sid, str(membro.id), moeda.value, quantia)
        self.bot.db.registrar_extrato(sid, str(membro.id), quantia, moeda.value, "Recebido do mestre")
        await interaction.response.send_message(
            f"✅ Dei {quantia} {moeda.value} pra carteira de {membro.mention}. Saldo: {novo}.",
            ephemeral=True,
        )

    @app_commands.command(description="[Mestre] Remove moeda de um jogador.")
    @app_commands.default_permissions(manage_guild=True)
    @app_commands.checks.has_permissions(manage_guild=True)
    @app_commands.choices(moeda=MOEDAS_CHOICES)
    async def tirar(self, interaction, membro: discord.Member, moeda: app_commands.Choice[str], quantia: app_commands.Range[int, 1]):
        sid = str(interaction.guild_id)
        try:
            novo = self.bot.db.debitar(sid, str(membro.id), moeda.value, quantia)
        except SaldoInsuficiente as e:
            await interaction.response.send_message(f"⚠️ {e}", ephemeral=True)
            return
        self.bot.db.registrar_extrato(sid, str(membro.id), -quantia, moeda.value, "Removido pelo mestre")
        await interaction.response.send_message(f"✅ Tirei {quantia} {moeda.value} de {membro.mention}. Saldo: {novo}.", ephemeral=True)

    @app_commands.command(name="daritem", description="[Mestre] Dá um item do catálogo a um jogador.")
    @app_commands.default_permissions(manage_guild=True)
    @app_commands.checks.has_permissions(manage_guild=True)
    @app_commands.describe(item="Item.", quantidade="Unidades (padrão 1).")
    async def daritem(self, interaction, membro: discord.Member, item: str, quantidade: app_commands.Range[int, 1] = 1):
        it = self.bot.catalogo.get(item)
        if it is None:
            await interaction.response.send_message(f"Não achei o item `{item}`.", ephemeral=True)
            return
        await interaction.response.defer(ephemeral=True)
        destino = await self.bot.inventario.dar(
            str(interaction.guild_id), str(membro.id), it.id, it.titulo, it.tipo, quantidade,
            dados={**it.conteudo, "raridade": it.raridade, "origem": "mestre-discord"},
            motivo=f"Recebido do mestre ({interaction.user.display_name})",
            chave=f"dar-item:{interaction.id}",
        )
        if destino == "cofre":
            await interaction.followup.send(
                f"✅ Depositei {quantidade}× **{it.titulo}** no cofre da conta de {membro.mention} no site.",
                ephemeral=True,
            )
        else:
            await interaction.followup.send(f"✅ Dei {quantidade}× **{it.titulo}** pra {membro.mention}.", ephemeral=True)

    @daritem.autocomplete("item")
    async def daritem_ac(self, interaction, current: str):
        return await self._ac_itens(interaction, current)

    @app_commands.command(name="tirar_item", description="[Mestre] Remove um item do inventário de um jogador.")
    @app_commands.default_permissions(manage_guild=True)
    @app_commands.checks.has_permissions(manage_guild=True)
    @app_commands.describe(item="Item.", quantidade="Unidades (padrão 1).")
    async def tirar_item(self, interaction, membro: discord.Member, item: str, quantidade: app_commands.Range[int, 1] = 1):
        it = self.bot.catalogo.get(item)
        item_id = it.id if it else item
        titulo = it.titulo if it else item
        # Antes só mexia na tabela legada: o mestre conseguia dar item pro
        # cofre do site (/daritem) mas não tinha como tirar de lá.
        await interaction.response.defer(ephemeral=True)
        try:
            await self.bot.inventario.tirar(
                str(interaction.guild_id), str(membro.id), item_id, quantidade,
                motivo=f"Removido pelo mestre ({interaction.user.display_name})",
                chave=f"tirar-item:{interaction.id}",
            )
        except ItemIndisponivel:
            await interaction.followup.send(f"{membro.mention} não tem {quantidade}× **{titulo}**.", ephemeral=True)
            return
        except CofreIndisponivel:
            await interaction.followup.send(
                "O cofre central não respondeu. Nada foi removido: tente de novo em instantes.", ephemeral=True
            )
            return
        await interaction.followup.send(f"✅ Tirei {quantidade}× **{titulo}** de {membro.mention}.", ephemeral=True)

    @tirar_item.autocomplete("item")
    async def tirar_item_ac(self, interaction, current: str):
        return await self._ac_itens(interaction, current)

    @app_commands.command(name="resetjogador", description="[Mestre] Zera carteira, cofre, inventário e cartão de um jogador.")
    @app_commands.default_permissions(manage_guild=True)
    @app_commands.checks.has_permissions(manage_guild=True)
    async def resetjogador(self, interaction, membro: discord.Member):
        sid, uid = str(interaction.guild_id), str(membro.id)
        if self.bot.inventario.modo(sid, uid) == "cofre":
            # Este comando só zera o estado LOCAL do bot. Rodar mesmo assim
            # deixaria os itens no cofre da conta (site) intocados: "resetado"
            # seria mentira. Recusar é melhor que fingir que funcionou.
            await interaction.response.send_message(
                f"⚠️ {membro.mention} tem a conta vinculada à plataforma: este comando só reseta a "
                "carteira/cofre/cartão *locais* do bot, não o cofre da conta no site. Peça pra pessoa "
                "esvaziar o cofre pelo site antes, ou fale com um admin da plataforma.",
                ephemeral=True,
            )
            return
        view = ConfirmarView(autor_id=interaction.user.id)
        await interaction.response.send_message(
            f"⚠️ Isso vai apagar **permanentemente** a carteira, cofre, inventário e cartão de "
            f"{membro.mention}. Confirma?",
            view=view,
            ephemeral=True,
        )
        await view.wait()
        if not view.confirmado:
            await interaction.edit_original_response(content="Cancelado: nada foi apagado.", view=None)
            return
        self.bot.db.resetar_jogador(sid, uid)
        await interaction.edit_original_response(
            content=f"✅ Economia de {membro.mention} resetada: carteira, cofre, inventário e cartão voltaram ao padrão.",
            view=None,
        )

    @app_commands.command(
        name="resetar_tudo",
        description="[Mestre] Reseta a economia do servidor INTEIRO: carteira, cofre, inventário e cartão de todo mundo.",
    )
    @app_commands.default_permissions(manage_guild=True)
    @app_commands.checks.has_permissions(manage_guild=True)
    @app_commands.describe(
        confirmacao=f'Digite exatamente "{CONFIRMACAO_RESET_TUDO}" pra confirmar que sabe que isso é irreversível.',
    )
    async def resetar_tudo(self, interaction: discord.Interaction, confirmacao: str):
        sid = str(interaction.guild_id)
        if confirmacao.strip().upper() != CONFIRMACAO_RESET_TUDO:
            await interaction.response.send_message(
                f'Pra evitar um reset por engano, digite exatamente `{CONFIRMACAO_RESET_TUDO}` '
                'no campo "confirmacao" (maiúsculo/minúsculo não importa).',
                ephemeral=True,
            )
            return
        view = ConfirmarView(autor_id=interaction.user.id)
        await interaction.response.send_message(
            "⚠️ **Isso vai apagar PERMANENTEMENTE, de TODO MUNDO neste servidor:**\n"
            "carteira, cofre (itens e saldo — local **e** da plataforma, pra quem tem conta "
            "vinculada), inventário, cartão/dívida, baús em estoque, bilhetes de loteria, "
            "investimentos e empréstimos. Leilões ativos são cancelados.\n\n"
            "Fichas de personagem e histórico (extrato, auditoria) **não** são apagados.\n\n"
            "Isso não pode ser desfeito. Confirma?",
            view=view,
            ephemeral=True,
        )
        await view.wait()
        if not view.confirmado:
            await interaction.edit_original_response(content="Cancelado: nada foi apagado.", view=None)
            return
        r = self.bot.db.resetar_economia_guild(sid)
        linhas = [
            f"👛 {r['carteira']} carteira(s) zerada(s)",
            f"🎒 {r['inventario']} item(ns) local(is) removido(s)",
            f"🏦 {r['cofre_saldo']} saldo(s) de cofre local zerado(s)",
            f"📦 {r['baus_estoque']} baú(s) em estoque removido(s)",
            f"💳 {r['divida_cartao']} dívida(s) de cartão zerada(s)",
            f"🧾 {r.get('faturas_cartao', 0)} fatura(s) de cartão removida(s)",
            f"🎟️ {r['loteria_bilhetes']} bilhete(s) de loteria removido(s)",
            f"📈 {r['investimentos']} investimento(s) removido(s)",
            f"🤝 {r['emprestimos']} empréstimo(s) removido(s)",
            f"🔨 {r['leiloes_cancelados']} leilão(ões) ativo(s) cancelado(s)",
        ]
        if r["cofre_plataforma_itens"] or r["cofre_plataforma_saldos"] or r["cofre_plataforma_reservas"]:
            linhas.append(
                f"🌐 Plataforma: {r['cofre_plataforma_itens']} item(ns), "
                f"{r['cofre_plataforma_saldos']} saldo(s) e {r['cofre_plataforma_reservas']} "
                "reserva(s) de cofre apagados de quem tem conta vinculada"
            )
        await interaction.edit_original_response(
            content="✅ Economia do servidor resetada:\n" + "\n".join(linhas),
            view=None,
        )

    async def _definir_reputacao(self, interaction, membro: discord.Member, valor: int, *, comando_legado: bool = False):
        self.bot.db.set_credito(str(interaction.guild_id), str(membro.id), valor)
        benef = economia.beneficios_reputacao(valor)
        prefixo = "ℹ️ `/setcredito` agora se chama `/setreputacao`.\n" if comando_legado else ""
        await interaction.response.send_message(
            f"{prefixo}✅ Reputação bancária de {membro.mention} = {valor} pontos ({benef['rotulo']}).",
            ephemeral=True,
        )

    @app_commands.command(name="setreputacao", description="[Mestre] Define a reputação bancária de um jogador.")
    @app_commands.default_permissions(manage_guild=True)
    @app_commands.checks.has_permissions(manage_guild=True)
    async def setreputacao(self, interaction, membro: discord.Member, valor: app_commands.Range[int, -100, 100000]):
        await self._definir_reputacao(interaction, membro, valor)

    @app_commands.command(name="setcredito", description="[Legado] Use /setreputacao para definir a reputação bancária.")
    @app_commands.default_permissions(manage_guild=True)
    @app_commands.checks.has_permissions(manage_guild=True)
    async def setcredito(self, interaction, membro: discord.Member, valor: app_commands.Range[int, -100, 100000]):
        await self._definir_reputacao(interaction, membro, valor, comando_legado=True)

    @app_commands.command(name="setcambio", description="[Mestre] Ajusta o câmbio (Lunaris por 1 Solares e taxa %).")
    @app_commands.default_permissions(manage_guild=True)
    @app_commands.checks.has_permissions(manage_guild=True)
    @app_commands.describe(lunaris_por_solares="Lunaris por 1 Solares.", taxa_percent="Taxa do banco em % (0 a 50).")
    async def setcambio(self, interaction, lunaris_por_solares: app_commands.Range[int, 1], taxa_percent: app_commands.Range[int, 0, 50] = 2):
        self.bot.db.set_cambio(str(interaction.guild_id), lunaris_por_solares, taxa_percent / 100)
        await interaction.response.send_message(f"✅ Câmbio: 1 Solares = {lunaris_por_solares} Lunaris · taxa {taxa_percent}%.", ephemeral=True)

    @app_commands.command(
        name="setroubo", description="[Mestre] Ajusta as regras de roubo (/roubar e /roubar_cofre) neste servidor."
    )
    @app_commands.default_permissions(manage_guild=True)
    @app_commands.checks.has_permissions(manage_guild=True)
    @app_commands.describe(
        chance_base_percent="Chance de /roubar_cofre contra Segurança Básica (1-95%). Tiers comprados mantêm defesa fixa própria.",
        cooldown_horas="Cooldown entre tentativas, em horas (1-168). Vale pros dois comandos: /roubar e /roubar_cofre.",
    )
    async def setroubo(
        self,
        interaction,
        chance_base_percent: app_commands.Range[int, 1, 95] = None,
        cooldown_horas: app_commands.Range[int, 1, 168] = None,
    ):
        self.bot.db.set_config_roubo(
            str(interaction.guild_id),
            chance_base_percent=chance_base_percent,
            cooldown_horas=cooldown_horas,
        )
        cfg = self.bot.db.get_config_roubo(str(interaction.guild_id))
        await interaction.response.send_message(
            f"✅ Cooldown de /roubar e /roubar_cofre: {cfg['cooldown_horas']}h. "
            f"/roubar_cofre: chance contra Segurança Básica {cfg['chance_base']*100:.0f}% · "
            f"leva {int(economia.ROUBO_COFRE_PERCENT*100)}% do cofre quando dá certo. "
            "(Nos dois roubos, o alvo tem 5 segundos para impedir a tentativa.)",
            ephemeral=True,
        )

    @app_commands.command(
        name="mestre_proteger",
        description="[Mestre] Protege uma conta contra roubos; sem membro, remove a proteção.",
    )
    @app_commands.guild_only()
    @app_commands.default_permissions(manage_guild=True)
    @app_commands.checks.has_permissions(manage_guild=True)
    @app_commands.describe(
        membro="Conta do mestre a proteger. Deixe vazio para remover a proteção atual."
    )
    async def mestre_proteger(
        self,
        interaction: discord.Interaction,
        membro: Optional[discord.Member] = None,
    ):
        sid = str(interaction.guild_id)
        atual = self.bot.db.get_mestre_protegido(sid)
        if membro is None:
            self.bot.db.set_mestre_protegido(sid, None)
            if atual:
                await interaction.response.send_message(
                    f"✅ Proteção de mestre removida de <@{atual}>.",
                    ephemeral=True,
                )
            else:
                await interaction.response.send_message(
                    "Nenhuma conta estava protegida como mestre.",
                    ephemeral=True,
                )
            return
        if membro.bot:
            await interaction.response.send_message(
                "Escolha uma pessoa, não um bot.", ephemeral=True
            )
            return
        self.bot.db.set_mestre_protegido(sid, str(membro.id))
        troca = f" (substituiu <@{atual}>)" if atual and atual != str(membro.id) else ""
        await interaction.response.send_message(
            f"🛡️ {membro.mention} agora está protegido contra roubo de carteira e cofre{troca}.",
            ephemeral=True,
        )

    async def cog_app_command_error(
        self,
        interaction: discord.Interaction,
        error: app_commands.AppCommandError,
    ) -> None:
        if isinstance(error, app_commands.MissingPermissions):
            mensagem = "Esse comando exige a permissão **Gerenciar Servidor**."
            if interaction.response.is_done():
                await interaction.followup.send(mensagem, ephemeral=True)
            else:
                await interaction.response.send_message(mensagem, ephemeral=True)
            return
        raise error

    @app_commands.command(
        name="juros_cofre",
        description="[Mestre] Bônus extra de juros no cofre, além do rendimento automático diário.",
    )
    @app_commands.default_permissions(manage_guild=True)
    @app_commands.checks.has_permissions(manage_guild=True)
    @app_commands.describe(taxa_percent="Juros em % sobre o saldo guardado (1 a 50).")
    async def juros_cofre(self, interaction, taxa_percent: app_commands.Range[int, 1, 50]):
        afetados = self.bot.db.aplicar_juros_cofre(str(interaction.guild_id), taxa_percent / 100)
        auto = int(self.bot.db.get_economia_config(str(interaction.guild_id))["juros_cofre_taxa"] * 100)
        await interaction.response.send_message(
            f"✅ Bônus de juros de {taxa_percent}% aplicado sobre o dinheiro guardado no cofre. "
            f"{afetados} saldo(s) atualizado(s). Isso é além do rendimento automático de ~{auto}%/dia. "
            "A carteira não rende juros, só o cofre.",
            ephemeral=True,
        )

    @app_commands.command(
        name="seteconomia",
        description="[Mestre] Ajusta taxas econômicas deste servidor (venda, saque, juros, leilão, loteria).",
    )
    @app_commands.default_permissions(manage_guild=True)
    @app_commands.checks.has_permissions(manage_guild=True)
    @app_commands.describe(
        venda_ratio_percent="% do preço de compra devolvido ao vender um item (1-100).",
        cofre_saque_taxa_percent="Taxa cobrada ao sacar do cofre pra carteira (0-50).",
        juros_cofre_taxa_percent="Juros automáticos diários do cofre, em % (0-50).",
        leilao_corte_percent="Corte da casa sobre venda em leilão, em % (0-50).",
        loteria_preco_bilhete="Preço de cada bilhete da Loteria Dominical, em Lunaris.",
        loteria_corte_percent="Corte da casa sobre o pote da Loteria Dominical, em % (0-50).",
    )
    async def seteconomia(
        self,
        interaction,
        venda_ratio_percent: app_commands.Range[int, 1, 100] = None,
        cofre_saque_taxa_percent: app_commands.Range[int, 0, 50] = None,
        juros_cofre_taxa_percent: app_commands.Range[int, 0, 50] = None,
        leilao_corte_percent: app_commands.Range[int, 0, 50] = None,
        loteria_preco_bilhete: app_commands.Range[int, 1, 10000] = None,
        loteria_corte_percent: app_commands.Range[int, 0, 50] = None,
    ):
        self.bot.db.set_economia_config(
            str(interaction.guild_id),
            venda_ratio_percent=venda_ratio_percent,
            cofre_saque_taxa_percent=cofre_saque_taxa_percent,
            juros_cofre_taxa_percent=juros_cofre_taxa_percent,
            leilao_corte_percent=leilao_corte_percent,
            loteria_preco_bilhete=loteria_preco_bilhete,
            loteria_corte_percent=loteria_corte_percent,
        )
        cfg = self.bot.db.get_economia_config(str(interaction.guild_id))
        await interaction.response.send_message(
            "✅ Economia deste servidor:\n"
            f"• Venda devolve {int(cfg['venda_ratio']*100)}% do preço de compra\n"
            f"• Saque do cofre cobra {int(cfg['cofre_saque_taxa']*100)}%\n"
            f"• Cofre rende {int(cfg['juros_cofre_taxa']*100)}%/dia sozinho\n"
            f"• Leilão: casa fica com {int(cfg['leilao_corte']*100)}%\n"
            f"• Loteria: bilhete ☾ {cfg['loteria_preco_bilhete']} · casa fica com {int(cfg['loteria_corte']*100)}%",
            ephemeral=True,
        )

    @app_commands.command(
        name="catalogo_recarregar",
        description="[Mestre] Recarrega no bot o catálogo salvo no banco central.",
    )
    @app_commands.default_permissions(manage_guild=True)
    @app_commands.checks.has_permissions(manage_guild=True)
    async def catalogo_recarregar(self, interaction):
        try:
            n, erros, origem = self.bot.recarregar_catalogo()
        except Exception:
            log.exception("falha ao recarregar catalogo do PostgreSQL")
            await interaction.response.send_message(
                "❌ Não consegui recarregar o catálogo. Confira os logs do Banqueiro.",
                ephemeral=True,
            )
            return
        extra = f" ({len(erros)} aviso(s))" if erros else ""
        await interaction.response.send_message(
            f"✅ Catálogo recarregado de {origem}: {n} item(ns){extra}.",
            ephemeral=True,
        )

    @app_commands.command(
        name="catalogo_republicar",
        description="[Mestre] Re-semeia o catálogo do arquivo: publica adições/edições e desativa removidos.",
    )
    @app_commands.default_permissions(manage_guild=True)
    @app_commands.checks.has_permissions(manage_guild=True)
    async def catalogo_republicar(self, interaction):
        view = ConfirmarView(autor_id=interaction.user.id)
        await interaction.response.send_message(
            "⚠️ Isso vai re-semear o catálogo inteiro a partir do arquivo: itens ausentes no arquivo "
            "são **desativados** (deixam de aparecer na loja). Confirma?",
            view=view,
            ephemeral=True,
        )
        await view.wait()
        if not view.confirmado:
            await interaction.edit_original_response(content="Cancelado: catálogo não foi tocado.", view=None)
            return
        try:
            n, desativados, erros = self.bot.republicar_catalogo()
        except Exception:
            log.exception("falha ao republicar catalogo a partir da semente")
            await interaction.edit_original_response(
                content="❌ Não consegui republicar o catálogo. Confira os logs do Banqueiro.", view=None
            )
            return
        extra = f" ({len(erros)} aviso(s))" if erros else ""
        await interaction.edit_original_response(
            content=(
                f"✅ Catálogo republicado do arquivo: {n} item(ns) ativo(s), "
                f"{desativados} desativado(s){extra}."
            ),
            view=None,
        )

async def setup(bot):
    await bot.add_cog(Admin(bot))
