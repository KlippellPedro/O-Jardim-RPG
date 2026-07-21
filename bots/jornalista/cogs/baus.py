"""
Cog Baús — baús automáticos que aparecem em horário aleatório todo dia.
Primeiro a clicar leva o loot. Loot vem de core.loot (ponderado por raridade).
"""

from __future__ import annotations

import logging
import random
from datetime import datetime

import discord
from discord import app_commands
from discord.ext import commands, tasks

from core import economia
from core import loot as loot_mod
from core.loot import TZ
from core.platform_api import PlatformApiError

log = logging.getLogger("jornalista")


def _agora() -> datetime:
    return datetime.now(TZ) if TZ else datetime.now()


class BauView(discord.ui.View):
    """Botão de abrir o baú. O primeiro a clicar leva."""

    def __init__(self, cog: "Baus", guild_id: str, premio: dict, timeout: float = 86400):
        super().__init__(timeout=timeout)
        self.cog = cog
        self.guild_id = guild_id
        self.premio = premio
        self.reivindicado = False

    @discord.ui.button(label="Abrir baú 🎁", style=discord.ButtonStyle.success)
    async def abrir(self, interaction: discord.Interaction, button: discord.ui.Button):
        # Trava ANTES de qualquer await — garante "primeiro a clicar leva".
        if self.reivindicado:
            await interaction.response.send_message("Alguém já pegou esse baú! 😅", ephemeral=True)
            return
        self.reivindicado = True
        button.disabled = True
        button.label = f"Aberto por {interaction.user.display_name}"[:80]

        await self.cog.entregar(interaction, self.guild_id, self.premio)
        try:
            await interaction.message.edit(view=self)
        except discord.HTTPException:
            pass
        self.stop()


class Baus(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self.ciclo.start()

    def cog_unload(self):
        self.ciclo.cancel()

    # ── Entrega do prêmio ─────────────────────────────────────────────────
    async def entregar(self, interaction: discord.Interaction, guild_id: str, premio: dict):
        uid = str(interaction.user.id)
        ganhos = [f"☾ {premio['lunaris']} Lunaris"]
        ganhos.extend(f"**{it.titulo}** ({it.raridade})" for it in premio["itens"])
        destino = "cofre da sua conta no site"

        if self.bot.platform is not None:
            try:
                await self.bot.platform.deposit_vault(
                    discord_user_id=interaction.user.id,
                    discord_guild_id=int(guild_id),
                    idempotency_key=f"bau-drop:{interaction.message.id}:{interaction.user.id}",
                    reason="Bau automatico do Jornalista",
                    items=[{
                        "item_id": it.id,
                        "titulo": it.titulo,
                        "quantidade": 1,
                        "dados": {
                            **it.conteudo,
                            "tipo": it.tipo,
                            "raridade": it.raridade,
                            "origem": "bau-discord",
                        },
                    } for it in premio["itens"]],
                    currencies=[{
                        "moeda": "Lunaris",
                        "quantidade": premio["lunaris"],
                    }],
                )
            except PlatformApiError as exc:
                if exc.status_code != 404:
                    log.exception(
                        "nao foi possivel confirmar o deposito do bau %s",
                        interaction.message.id,
                    )
                    await interaction.response.send_message(
                        "O bau foi aberto, mas nao consegui confirmar a entrega no cofre central. "
                        "A operacao nao duplica loot; avise o mestre para conferir o site.",
                        ephemeral=True,
                    )
                    return
                destino = "carteira do Banqueiro (vincule sua conta pra usar a ficha)"
                ganhos = self._entregar_na_carteira_legada(guild_id, uid, premio)
        else:
            destino = "carteira do Banqueiro"
            ganhos = self._entregar_na_carteira_legada(guild_id, uid, premio)

        emb = discord.Embed(
            title="🎁 Baú aberto!",
            description=f"{interaction.user.mention} abriu o baú e achou:\n"
                        + "\n".join(f"• {g}" for g in ganhos)
                        + f"\n\nEntregue na **{destino}**."
                          + (" Escolha o personagem pelo site." if self.bot.platform is not None else
                             " As moedas ficam na carteira — guarde no cofre com `/cofre_depositar` no Banqueiro."),
            color=0xF1C40F,
        )
        await interaction.response.send_message(embed=emb)

    def _entregar_na_carteira_legada(self, guild_id: str, uid: str, premio: dict) -> list[str]:
        """Fallback temporario para contas/campanhas ainda nao vinculadas ao site:
        credita a carteira que o Banqueiro usa (mesma tabela `carteira`)."""
        db = self.bot.db
        db.garantir_jogador(guild_id, uid)
        db.creditar(guild_id, uid, "Lunaris", premio["lunaris"])
        ganhos = [f"☾ {premio['lunaris']} Lunaris"]
        tier = db.get_cofre_tier(guild_id, uid)
        for it in premio["itens"]:
            if economia.pode_guardar(db.contar_itens(guild_id, uid), 1, tier):
                db.add_item(guild_id, uid, it.id, it.titulo, it.tipo, 1)
                ganhos.append(f"**{it.titulo}** ({it.raridade})")
            else:
                ganhos.append(f"~~{it.titulo}~~ — cofre cheio! (`/cofre_melhorar` no Banqueiro)")
        return ganhos

    # ── Ciclo de agendamento (checa a cada minuto) ────────────────────────
    @tasks.loop(minutes=1)
    async def ciclo(self):
        agora = _agora()
        for cfg in self.bot.db.listar_baus_ativos():
            try:
                await self._checar(cfg, agora)
            except Exception:
                log.exception("erro no ciclo de baús (guild %s)", cfg.get("guild_id"))

    @ciclo.before_loop
    async def _antes_do_ciclo(self):
        await self.bot.wait_until_ready()

    async def _checar(self, cfg: dict, agora: datetime):
        prox = cfg.get("proximo_drop")
        if not prox:
            self._reagendar(cfg)
            return
        try:
            quando = datetime.fromisoformat(prox)
        except ValueError:
            self._reagendar(cfg)
            return
        if agora >= quando:
            await self._dropar(cfg)
            self._reagendar(cfg)

    def _reagendar(self, cfg: dict):
        prox = loot_mod.agendar_proximo(cfg["min_hora"], cfg["max_hora"], rng=random)
        self.bot.db.set_proximo_drop(cfg["guild_id"], prox.isoformat())

    async def _dropar(self, cfg: dict):
        if not cfg.get("canal_id"):
            return
        canal = self.bot.get_channel(int(cfg["canal_id"]))
        if canal is None:
            log.warning("canal de baú %s não encontrado", cfg["canal_id"])
            return
        pesos = economia.estacao_info(self.bot.db.get_estacao(cfg["guild_id"]))["pesos"]
        premio = loot_mod.sortear_bau(self.bot.catalogo, qtd_itens=cfg.get("itens_por_bau", 1), rng=random, pesos=pesos)
        view = BauView(self, cfg["guild_id"], premio)
        emb = discord.Embed(
            title="🎁 Um baú apareceu n'O Jardim!",
            description="Primeiro a clicar leva o loot. Corre! 🏃",
            color=0x2ECC71,
        )
        try:
            await canal.send(embed=emb, view=view)
        except discord.HTTPException:
            log.exception("falha ao enviar baú no canal %s", cfg["canal_id"])

    # ── Comandos de mestre ────────────────────────────────────────────────
    @app_commands.command(name="bau_config", description="[Mestre] Configura os baús automáticos.")
    @app_commands.default_permissions(manage_guild=True)
    @app_commands.describe(
        canal="Canal onde os baús aparecem.",
        ativo="Liga (True) ou desliga (False) os baús.",
        min_hora="Hora mínima da janela (0-23).",
        max_hora="Hora máxima da janela (0-23).",
        itens_por_bau="Quantos itens por baú (1-5).",
    )
    async def bau_config(self, interaction: discord.Interaction,
                         canal: discord.TextChannel = None, ativo: bool = None,
                         min_hora: app_commands.Range[int, 0, 23] = None,
                         max_hora: app_commands.Range[int, 0, 23] = None,
                         itens_por_bau: app_commands.Range[int, 1, 5] = None):
        gid = str(interaction.guild_id)
        self.bot.db.atualizar_baus_config(
            gid,
            canal_id=(str(canal.id) if canal else None),
            ativo=ativo, min_hora=min_hora, max_hora=max_hora, itens_por_bau=itens_por_bau,
        )
        cfg = self.bot.db.get_baus_config(gid)
        if cfg["ativo"] and cfg["canal_id"] and not cfg.get("proximo_drop"):
            self._reagendar(cfg)
            cfg = self.bot.db.get_baus_config(gid)

        canal_txt = f"<#{cfg['canal_id']}>" if cfg["canal_id"] else "—"
        await interaction.response.send_message(
            f"🎁 **Baús:** {'ligados ✅' if cfg['ativo'] else 'desligados ⛔'}\n"
            f"Canal: {canal_txt} · Janela: {cfg['min_hora']}h–{cfg['max_hora']}h · "
            f"{cfg['itens_por_bau']} item(ns)/baú\n"
            f"Próximo: {cfg.get('proximo_drop') or '—'}",
            ephemeral=True,
        )

    @app_commands.command(name="bau_agora", description="[Mestre] Solta um baú agora (pra testar).")
    @app_commands.default_permissions(manage_guild=True)
    @app_commands.describe(canal="Canal onde soltar (padrão: o configurado).")
    async def bau_agora(self, interaction: discord.Interaction, canal: discord.TextChannel = None):
        gid = str(interaction.guild_id)
        cfg = dict(self.bot.db.get_baus_config(gid))
        if canal:
            cfg["canal_id"] = str(canal.id)
        if not cfg.get("canal_id"):
            await interaction.response.send_message(
                "Defina um canal com `/bau_config` primeiro (ou passe um canal aqui).", ephemeral=True)
            return
        await interaction.response.send_message("Soltando um baú… 🎁", ephemeral=True)
        await self._dropar(cfg)


async def setup(bot: commands.Bot):
    await bot.add_cog(Baus(bot))
