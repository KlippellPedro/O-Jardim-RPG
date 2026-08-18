"""Cog Mestre: comandos administrativos avançados para o Mestre do RPG.

Permite desfazer ou forçar qualquer estado do sistema:
- Curar ferimentos
- Zerar/ajustar Calor de roubo
- Remover cooldown de roubo
- Zerar/ajustar dívida
- Limpar recompensa
- Conceder/remover proteção de roubo
- Ver o estado completo de um jogador
- Ajustar Créditos Sombrios
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional, List

import discord
from discord import app_commands
from discord.ext import commands

from core import ui


def _sid(interaction: discord.Interaction) -> str:
    return str(interaction.guild_id) if interaction.guild_id else "global"


def _uid(membro: discord.Member) -> str:
    return str(membro.id)


# ── Grupo de comandos ─────────────────────────────────────────────────────────

class Mestre(commands.Cog):
    """Comandos de mestre para gerir o estado dos jogadores."""

    def __init__(self, bot):
        self.bot = bot

    # ─── /mestre_ver ──────────────────────────────────────────────────────────

    @app_commands.command(
        name="mestre_ver",
        description="[Mestre] Painel completo de um jogador: ferimentos, Calor, cooldowns, proteções e dívida.",
    )
    @app_commands.default_permissions(manage_guild=True)
    @app_commands.checks.has_permissions(manage_guild=True)
    @app_commands.describe(membro="Jogador a inspecionar.")
    async def mestre_ver(self, interaction: discord.Interaction, membro: discord.Member):
        await interaction.response.defer(ephemeral=True, thinking=True)
        sid, uid = _sid(interaction), _uid(membro)
        db = self.bot.db
        db.garantir_jogador(sid, uid)

        ferimentos   = db.get_ferimentos(sid, uid)
        calor        = db.get_calor_roubo(sid, uid)
        divida       = db.get_divida(sid, uid)
        carteira     = db.get_carteira(sid, uid)
        recompensa   = db.get_recompensa(sid, uid)
        protecoes    = db.listar_protecoes(sid, uid) if hasattr(db, "listar_protecoes") else {}

        # Cooldowns diretos via query
        agora = datetime.now(timezone.utc)
        with db._conn() as con:
            cd_roubo = con.execute(
                "SELECT proxima_tentativa FROM roubo_cooldown WHERE guild_id=%s AND user_id=%s",
                (sid, uid),
            ).fetchone()
            cd_cofre = con.execute(
                "SELECT proxima_tentativa FROM roubo_cofre_cooldown WHERE guild_id=%s AND user_id=%s",
                (sid, uid),
            ).fetchone()

        cd_roubo_ts = cd_roubo["proxima_tentativa"] if cd_roubo else None
        cd_cofre_ts = cd_cofre["proxima_tentativa"] if cd_cofre else None

        def _fmt_cd(ts) -> str:
            if ts is None:
                return "✅ livre"
            if ts <= agora:
                return "✅ livre (expirou)"
            return f"⏳ <t:{int(ts.timestamp())}:R>"

        emb = ui.embed(
            f"🔍 Painel de mestre — {membro.display_name}",
            categoria="economia",
            descricao=f"Estado atual de <@{membro.id}> no servidor.",
        )
        emb.add_field(name="🩸 Ferimentos",    value=f"**{ferimentos}/6**", inline=True)
        emb.add_field(name="🔥 Calor de roubo", value=f"**{calor}/10**",    inline=True)
        emb.add_field(name="💳 Dívida",         value=f"**{divida} ☾**",    inline=True)
        emb.add_field(
            name="💰 Carteira",
            value="\n".join(f"{moeda}: **{saldo}**" for moeda, saldo in carteira.items()) or "—",
            inline=False,
        )
        emb.add_field(name="🗡️ Cooldown /roubar",       value=_fmt_cd(cd_roubo_ts), inline=True)
        emb.add_field(name="🏦 Cooldown /roubar_cofre", value=_fmt_cd(cd_cofre_ts), inline=True)
        recomp_val = recompensa.get("valor", 0) if recompensa else 0
        emb.add_field(name="💀 Recompensa",    value=f"**{recomp_val} ☾**" if recomp_val else "Nenhuma", inline=True)

        await interaction.followup.send(embed=emb, ephemeral=True)

    # ─── /mestre_investimentos ────────────────────────────────────────────────
    
    @app_commands.command(
        name="mestre_investimentos",
        description="[Mestre] Mostra os Títulos do Jardim ativos e vencidos de um jogador.",
    )
    @app_commands.default_permissions(manage_guild=True)
    @app_commands.checks.has_permissions(manage_guild=True)
    @app_commands.describe(membro="Jogador a inspecionar.", historico="Incluir títulos já vencidos.")
    async def mestre_investimentos(self, interaction: discord.Interaction, membro: discord.Member, historico: Optional[bool] = False):
        sid, uid = _sid(interaction), _uid(membro)
        ativos = self.bot.db.listar_investimentos_usuario(sid, uid, incluir_historico=bool(historico))
        
        if not ativos:
            mensagem = (
                f"**{membro.display_name}** nunca teve nenhum Título do Jardim."
                if historico
                else f"**{membro.display_name}** não tem nenhum Título do Jardim ativo. Use `historico:True` pra ver os já vencidos."
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
                
        titulo = f"📜 Títulos do Jardim de {membro.display_name} (com histórico)" if historico else f"📜 Títulos do Jardim ativos de {membro.display_name}"
        emb = ui.embed(titulo, categoria="economia", descricao="\n".join(linhas))
        await interaction.response.send_message(embed=emb, ephemeral=True)

    # ─── /mestre_curar ────────────────────────────────────────────────────────

    @app_commands.command(
        name="mestre_curar",
        description="[Mestre] Zera os ferimentos de um jogador.",
    )
    @app_commands.default_permissions(manage_guild=True)
    @app_commands.checks.has_permissions(manage_guild=True)
    @app_commands.describe(membro="Jogador a curar.")
    async def mestre_curar(self, interaction: discord.Interaction, membro: discord.Member):
        sid, uid = _sid(interaction), _uid(membro)
        self.bot.db.garantir_jogador(sid, uid)
        with self.bot.db._conn() as con:
            antes = con.execute(
                "SELECT pontos FROM ferimentos WHERE guild_id=%s AND user_id=%s",
                (sid, uid),
            ).fetchone()
            pontos = antes["pontos"] if antes else 0
            con.execute(
                "UPDATE ferimentos SET pontos = 0 WHERE guild_id=%s AND user_id=%s",
                (sid, uid),
            )
        await interaction.response.send_message(
            f"✅ <@{membro.id}> curado: **{pontos} → 0** ferimentos.",
            ephemeral=True,
        )

    # ─── /mestre_calor ────────────────────────────────────────────────────────

    @app_commands.command(
        name="mestre_calor",
        description="[Mestre] Zera ou define o Calor de roubo de um jogador.",
    )
    @app_commands.default_permissions(manage_guild=True)
    @app_commands.checks.has_permissions(manage_guild=True)
    @app_commands.describe(membro="Jogador.", valor="Novo valor de Calor (0 para zerar).")
    async def mestre_calor(
        self,
        interaction: discord.Interaction,
        membro: discord.Member,
        valor: app_commands.Range[int, 0, 10] = 0,
    ):
        sid, uid = _sid(interaction), _uid(membro)
        antes = self.bot.db.get_calor_roubo(sid, uid)
        agora = datetime.now(timezone.utc)
        with self.bot.db._conn() as con:
            con.execute(
                """
                INSERT INTO roubo_calor (guild_id, user_id, pontos, atualizado_em)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (guild_id, user_id) DO UPDATE SET
                    pontos = EXCLUDED.pontos,
                    atualizado_em = EXCLUDED.atualizado_em
                """,
                (sid, uid, valor, agora),
            )
        await interaction.response.send_message(
            f"✅ Calor de <@{membro.id}>: **{antes} → {valor}**.",
            ephemeral=True,
        )

    # ─── /mestre_cooldown ─────────────────────────────────────────────────────

    @app_commands.command(
        name="mestre_cooldown",
        description="[Mestre] Remove o cooldown de roubo de um jogador (carteira e/ou cofre).",
    )
    @app_commands.default_permissions(manage_guild=True)
    @app_commands.checks.has_permissions(manage_guild=True)
    @app_commands.describe(
        membro="Jogador.",
        tipo="Qual cooldown remover.",
    )
    @app_commands.choices(tipo=[
        app_commands.Choice(name="Ambos", value="ambos"),
        app_commands.Choice(name="Carteira (/roubar)", value="carteira"),
        app_commands.Choice(name="Cofre (/roubar_cofre)", value="cofre"),
    ])
    async def mestre_cooldown(
        self,
        interaction: discord.Interaction,
        membro: discord.Member,
        tipo: app_commands.Choice[str] = None,
    ):
        sid, uid = _sid(interaction), _uid(membro)
        agora = datetime.now(timezone.utc)
        escolha = tipo.value if tipo else "ambos"

        with self.bot.db._conn() as con:
            if escolha in ("ambos", "carteira"):
                con.execute(
                    "UPDATE roubo_cooldown SET proxima_tentativa=%s WHERE guild_id=%s AND user_id=%s",
                    (agora, sid, uid),
                )
            if escolha in ("ambos", "cofre"):
                con.execute(
                    "UPDATE roubo_cofre_cooldown SET proxima_tentativa=%s WHERE guild_id=%s AND user_id=%s",
                    (agora, sid, uid),
                )

        rotulo = tipo.name if tipo else "Ambos"
        await interaction.response.send_message(
            f"✅ Cooldown **{rotulo}** de <@{membro.id}> removido.",
            ephemeral=True,
        )

    # ─── /mestre_divida ───────────────────────────────────────────────────────

    @app_commands.command(
        name="mestre_divida",
        description="[Mestre] Zera ou ajusta a dívida do Cartão Lunar de um jogador.",
    )
    @app_commands.default_permissions(manage_guild=True)
    @app_commands.checks.has_permissions(manage_guild=True)
    @app_commands.describe(
        membro="Jogador.",
        novo_valor="Novo valor da dívida (0 para zerar, omita para zerar).",
    )
    async def mestre_divida(
        self,
        interaction: discord.Interaction,
        membro: discord.Member,
        novo_valor: app_commands.Range[int, 0] = 0,
    ):
        sid, uid = _sid(interaction), _uid(membro)
        antes = self.bot.db.get_divida(sid, uid)
        if novo_valor == 0:
            self.bot.db.zerar_divida(sid, uid)
        else:
            with self.bot.db._conn() as con:
                con.execute(
                    """
                    INSERT INTO divida_cartao (guild_id, user_id, valor, atualizada_em)
                    VALUES (%s, %s, %s, CURRENT_TIMESTAMP)
                    ON CONFLICT (guild_id, user_id) DO UPDATE SET
                        valor = EXCLUDED.valor,
                        atualizada_em = CURRENT_TIMESTAMP
                    """,
                    (sid, uid, novo_valor),
                )
        await interaction.response.send_message(
            f"✅ Dívida de <@{membro.id}>: **{antes} → {novo_valor} ☾**.",
            ephemeral=True,
        )

    # ─── /mestre_recompensa ───────────────────────────────────────────────────

    @app_commands.command(
        name="mestre_recompensa",
        description="[Mestre] Remove a recompensa de um jogador sem pagar ninguém.",
    )
    @app_commands.default_permissions(manage_guild=True)
    @app_commands.checks.has_permissions(manage_guild=True)
    @app_commands.describe(membro="Jogador cuja recompensa será removida.")
    async def mestre_recompensa(
        self, interaction: discord.Interaction, membro: discord.Member
    ):
        sid, uid = _sid(interaction), _uid(membro)
        rec = self.bot.db.get_recompensa(sid, uid)
        valor = rec.get("valor", 0) if rec else 0
        self.bot.db.limpar_recompensa(sid, uid)
        await interaction.response.send_message(
            f"✅ Recompensa de <@{membro.id}> removida (**{valor} ☾** cancelados).",
            ephemeral=True,
        )

    # ─── /mestre_dar_protecao ─────────────────────────────────────────────────

    @app_commands.command(
        name="mestre_dar_protecao",
        description="[Mestre] Concede proteções de roubo (Cão de Guarda ou Alarme) a um jogador.",
    )
    @app_commands.default_permissions(manage_guild=True)
    @app_commands.checks.has_permissions(manage_guild=True)
    @app_commands.describe(
        membro="Jogador.",
        tipo="Tipo de proteção.",
        quantidade="Quantidade a conceder.",
    )
    @app_commands.choices(tipo=[
        app_commands.Choice(name="Cão de Guarda", value="cao_de_guarda"),
        app_commands.Choice(name="Alarme Mágico", value="alarme_magico"),
    ])
    async def mestre_dar_protecao(
        self,
        interaction: discord.Interaction,
        membro: discord.Member,
        tipo: app_commands.Choice[str],
        quantidade: app_commands.Range[int, 1, 10] = 1,
    ):
        sid, uid = _sid(interaction), _uid(membro)
        self.bot.db.adicionar_protecao(sid, uid, tipo.value, quantidade)
        await interaction.response.send_message(
            f"✅ **{quantidade}× {tipo.name}** concedido(s) a <@{membro.id}>.",
            ephemeral=True,
        )

    # ─── /mestre_remover_protecao ─────────────────────────────────────────────

    @app_commands.command(
        name="mestre_remover_protecao",
        description="[Mestre] Consome/remove uma proteção de roubo de um jogador.",
    )
    @app_commands.default_permissions(manage_guild=True)
    @app_commands.checks.has_permissions(manage_guild=True)
    @app_commands.describe(membro="Jogador.", tipo="Tipo de proteção a remover.")
    @app_commands.choices(tipo=[
        app_commands.Choice(name="Cão de Guarda", value="cao_de_guarda"),
        app_commands.Choice(name="Alarme Mágico", value="alarme_magico"),
    ])
    async def mestre_remover_protecao(
        self,
        interaction: discord.Interaction,
        membro: discord.Member,
        tipo: app_commands.Choice[str],
    ):
        sid, uid = _sid(interaction), _uid(membro)
        removido = self.bot.db.consumir_protecao(sid, uid, tipo.value)
        if removido:
            await interaction.response.send_message(
                f"✅ **{tipo.name}** removido de <@{membro.id}>.",
                ephemeral=True,
            )
        else:
            await interaction.response.send_message(
                f"⚠️ <@{membro.id}> não tinha **{tipo.name}**.",
                ephemeral=True,
            )

    # ─── /mestre_ferimentos ───────────────────────────────────────────────────

    @app_commands.command(
        name="mestre_ferimentos",
        description="[Mestre] Define manualmente os pontos de ferimento de um jogador.",
    )
    @app_commands.default_permissions(manage_guild=True)
    @app_commands.checks.has_permissions(manage_guild=True)
    @app_commands.describe(membro="Jogador.", pontos="Valor de ferimentos (0–6).")
    async def mestre_ferimentos(
        self,
        interaction: discord.Interaction,
        membro: discord.Member,
        pontos: app_commands.Range[int, 0, 6] = 0,
    ):
        sid, uid = _sid(interaction), _uid(membro)
        self.bot.db.garantir_jogador(sid, uid)
        with self.bot.db._conn() as con:
            antes_row = con.execute(
                "SELECT pontos FROM ferimentos WHERE guild_id=%s AND user_id=%s",
                (sid, uid),
            ).fetchone()
            antes = antes_row["pontos"] if antes_row else 0
            if pontos == 0:
                con.execute(
                    "DELETE FROM ferimentos WHERE guild_id=%s AND user_id=%s",
                    (sid, uid),
                )
            else:
                con.execute(
                    """
                    INSERT INTO ferimentos (guild_id, user_id, pontos)
                    VALUES (%s, %s, %s)
                    ON CONFLICT (guild_id, user_id) DO UPDATE SET pontos = EXCLUDED.pontos
                    """,
                    (sid, uid, pontos),
                )
        await interaction.response.send_message(
            f"✅ Ferimentos de <@{membro.id}>: **{antes} → {pontos}/6**.",
            ephemeral=True,
        )

    # ─── /mestre_ajustar_saldo ────────────────────────────────────────────────

    @app_commands.command(
        name="ajustar_saldo",
        description="[Mestre] Credita (+) ou debita (-) qualquer moeda na carteira de um jogador.",
    )
    @app_commands.default_permissions(manage_guild=True)
    @app_commands.checks.has_permissions(manage_guild=True)
    @app_commands.describe(
        membro="Jogador.",
        moeda="Moeda a ajustar.",
        quantia="Valor positivo para creditar, negativo para debitar.",
    )
    @app_commands.choices(moeda=[
        app_commands.Choice(name="☾ Lunaris",           value="Lunaris"),
        app_commands.Choice(name="☀ Solares",            value="Solares"),
        app_commands.Choice(name="✦ Fragmentos de Estrela", value="Fragmentos de Estrela"),
        app_commands.Choice(name="🕳️ Créditos Sombrios", value="Créditos Sombrios"),
    ])
    async def ajustar_saldo(
        self,
        interaction: discord.Interaction,
        membro: discord.Member,
        moeda: app_commands.Choice[str],
        quantia: int,
    ):
        from core.db import SaldoInsuficiente

        sid, uid = _sid(interaction), _uid(membro)
        self.bot.db.garantir_jogador(sid, uid)
        antes = self.bot.db.get_carteira(sid, uid).get(moeda.value, 0)

        try:
            if quantia > 0:
                self.bot.db.creditar(sid, uid, moeda.value, quantia)
            elif quantia < 0:
                self.bot.db.debitar(sid, uid, moeda.value, abs(quantia))
            else:
                await interaction.response.send_message("Quantia zero — nada foi feito.", ephemeral=True)
                return
        except SaldoInsuficiente as e:
            await interaction.response.send_message(f"❌ Saldo insuficiente: {e}", ephemeral=True)
            return

        depois = self.bot.db.get_carteira(sid, uid).get(moeda.value, 0)
        sinal = "+" if quantia > 0 else ""
        await interaction.response.send_message(
            f"✅ **{moeda.name}** de <@{membro.id}>: "
            f"**{antes}** → **{depois}** ({sinal}{quantia}).",
            ephemeral=True,
        )


async def setup(bot):
    await bot.add_cog(Mestre(bot))
