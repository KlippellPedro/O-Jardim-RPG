"""
Cog Baús: baús automáticos que aparecem em horário aleatório todo dia.
Primeiro a clicar leva o loot. Loot vem de core.loot (ponderado por raridade).
"""

from __future__ import annotations

import logging
import random
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

import discord
from discord import app_commands
from discord.ext import commands, tasks

from core import economia
from core import enigmas as enigmas_mod
from core import loot as loot_mod
from core import ui
from core.catalogo import rotulo_raridade
from core.loot import TZ
from core.platform_api import PlatformApiError
from core.tasks_util import registrar_reinicio_em_erro

log = logging.getLogger("jornalista")
RETRY_DROP_MINUTOS = 15
RETRY_ENTREGA_MINUTOS = 10  # intervalo do recovery automático de baús pendentes
BAU_RARIDADE_CHOICES = [
    app_commands.Choice(name=perfil["nome"], value=raridade)
    for raridade, perfil in loot_mod.BAU_RARIDADES.items()
]

# Enfeite visual do baú por estação: (emoji, cor). Estações "normais" mantêm o
# dourado do baú (Decisão 3 do Plano_Jornalista); as especiais ganham um roxo
# de evento raro, sinalizando de longe que o loot está muito melhor.
_COR_BAU = 0xF1C40F
_COR_BAU_ESPECIAL = 0x8E44AD
_ESTACAO_ENFEITE = {
    "Primavera": ("🌸", _COR_BAU),
    "Verão": ("☀️", _COR_BAU),
    "Outono": ("🍂", _COR_BAU),
    "Inverno": ("❄️", _COR_BAU),
    "Noite Eterna": ("🌑", _COR_BAU_ESPECIAL),
    "Eclipse": ("🌘", _COR_BAU_ESPECIAL),
}
_RARIDADE_ROTULO = {
    "comum": "Comum", "incomum": "Incomum", "raro": "Raro",
    "epico": "Épico", "lendario": "Lendário", "reliquia": "Mítico",
    "reliquia da criacao": "Relíquia da Criação",
}
_ORDEM_RARIDADE = (
    "reliquia da criacao", "reliquia", "lendario", "epico", "raro",
    "incomum", "comum",
)


def _melhor_raridade(pesos: dict) -> str:
    """Rótulo da melhor raridade que pode cair (peso > 0) nesta estação."""
    for chave in _ORDEM_RARIDADE:
        if pesos.get(chave, 0) > 0:
            return _RARIDADE_ROTULO[chave]
    return _RARIDADE_ROTULO["comum"]


def _agora() -> datetime:
    return datetime.now(TZ) if TZ else datetime.now()


def _canal_aceita_bau(canal: object) -> bool:
    if not isinstance(canal, discord.TextChannel):
        return False
    membro = canal.guild.me
    if membro is None:
        return False
    permissoes = canal.permissions_for(membro)
    return bool(
        permissoes.view_channel
        and permissoes.send_messages
        and permissoes.embed_links
    )


def serializar_premio_bau(premio: dict) -> dict:
    """Transforma itens do catálogo em JSON estável para recovery posterior."""
    lunaris = int(premio.get("lunaris") or 0)
    if lunaris < 0:
        raise ValueError("o prêmio não pode ter Lunaris negativos")
    itens = []
    for item in premio.get("itens") or []:
        if isinstance(item, dict):
            dados = item
        else:
            dados = {
                "id": item.id,
                "titulo": item.titulo,
                "tipo": item.tipo,
                "raridade": item.raridade,
                "conteudo": item.conteudo,
                "quantidade": 1,
            }
        quantidade = int(dados.get("quantidade") or 1)
        if quantidade <= 0:
            raise ValueError("a quantidade do item do baú deve ser positiva")
        itens.append(
            {
                "id": str(dados["id"]),
                "titulo": str(dados.get("titulo") or dados["id"]),
                "tipo": str(dados.get("tipo") or "item"),
                "raridade": str(dados.get("raridade") or "comum"),
                "conteudo": dict(dados.get("conteudo") or {}),
                "quantidade": quantidade,
            }
        )
    resultado = {"lunaris": lunaris, "itens": itens, "creditos_sombrios": int(premio.get("creditos_sombrios") or 0)}
    if isinstance(premio.get("bau"), dict):
        resultado["bau"] = {
            "raridade": str(premio["bau"].get("raridade") or "comum"),
            "nome": str(premio["bau"].get("nome") or "Baú Comum"),
            "dificuldade_enigma": premio["bau"].get("dificuldade_enigma"),
            "expira_minutos": int(premio["bau"].get("expira_minutos") or 15),
        }
    return resultado


def _ganhos_do_premio(premio: dict) -> list[str]:
    creditos_sombrios = int(premio.get('creditos_sombrios') or 0)
    lunaris = int(premio.get('lunaris') or 0)
    if creditos_sombrios > 0:
        ganhos = [f"🕳️ {creditos_sombrios} Créditos Sombrios"]
    elif lunaris > 0:
        ganhos = [f"☾ {lunaris} Lunaris"]
    else:
        ganhos = []
    for item in premio.get("itens") or []:
        quantidade = int(item.get("quantidade") or 1)
        sufixo = f" ×{quantidade}" if quantidade > 1 else ""
        ganhos.append(
            f"**{item.get('titulo') or item.get('id') or 'Item'}** "
            f"({rotulo_raridade(item.get('raridade'))}){sufixo}"
        )
    return ganhos


BAU_ABRIR_TEMPLATE = r"bau_abrir:(?P<token>[0-9a-f]{32})"
BAU_ENIGMA_TEMPLATE = r"bau_enigma:(?P<token>[0-9a-f]{32})"


async def _responder_efemero(
    interaction: discord.Interaction, texto: Optional[str] = None, *, embed=None, followup: bool = False
) -> None:
    try:
        if followup:
            if embed is not None:
                await interaction.followup.send(
                    embed=embed, ephemeral=True, allowed_mentions=discord.AllowedMentions.none()
                )
            else:
                await interaction.followup.send(texto, ephemeral=True)
        else:
            await interaction.response.send_message(texto, ephemeral=True)
    except discord.HTTPException:
        log.info("nao consegui responder de forma efemera numa interacao de bau")


def _view_bau_abrir(cog: "Baus", token: str) -> discord.ui.View:
    view = discord.ui.View(timeout=None)
    view.add_item(BauAbrirButton(cog, token))
    return view


def _view_bau_enigma(cog: "Baus", token: str) -> discord.ui.View:
    view = discord.ui.View(timeout=None)
    view.add_item(BauEnigmaResponderButton(cog, token))
    return view


def _view_bau_resolvido(confirmado: bool) -> discord.ui.View:
    view = discord.ui.View(timeout=None)
    label = "Recompensa entregue" if confirmado else "Entrega pendente"
    view.add_item(discord.ui.Button(label=label, style=discord.ButtonStyle.secondary, disabled=True))
    return view


def _view_bau_desaparecido() -> discord.ui.View:
    view = discord.ui.View(timeout=None)
    view.add_item(discord.ui.Button(label="Baú desaparecido", style=discord.ButtonStyle.secondary, disabled=True))
    return view


class BauAbrirButton(discord.ui.DynamicItem[discord.ui.Button], template=BAU_ABRIR_TEMPLATE):
    """Botão do baú normal. O custom_id carrega um token (não o id da
    mensagem, que só existe DEPOIS de enviá-la) que aponta pro estado
    persistido em `baus_no_ar`. Isso é o que permite reconstruir o baú a
    cada interação, mesmo que o processo do bot tenha reiniciado no meio."""

    def __init__(self, cog: "Baus", token: str):
        super().__init__(
            discord.ui.Button(
                label="Abrir baú 🎁",
                style=discord.ButtonStyle.success,
                custom_id=f"bau_abrir:{token}",
            )
        )
        self.cog = cog
        self.token = token

    @classmethod
    async def from_custom_id(cls, interaction: discord.Interaction, item, match):
        return cls(interaction.client.get_cog("Baus"), match["token"])

    async def callback(self, interaction: discord.Interaction) -> None:
        await self.cog.abrir_bau_click(interaction, self.token)


class BauEnigmaResponderButton(discord.ui.DynamicItem[discord.ui.Button], template=BAU_ENIGMA_TEMPLATE):
    """Botão do baú trancado: abre o modal do enigma. Mesmo esquema de
    token do BauAbrirButton."""

    def __init__(self, cog: "Baus", token: str):
        super().__init__(
            discord.ui.Button(
                label="Responder o enigma 🔒",
                style=discord.ButtonStyle.success,
                custom_id=f"bau_enigma:{token}",
            )
        )
        self.cog = cog
        self.token = token

    @classmethod
    async def from_custom_id(cls, interaction: discord.Interaction, item, match):
        return cls(interaction.client.get_cog("Baus"), match["token"])

    async def callback(self, interaction: discord.Interaction) -> None:
        row = self.cog.bot.db.get_bau_no_ar(self.token)
        if row is None or not row.get("enigma_pergunta"):
            await _responder_efemero(interaction, "Esse baú não está mais disponível.")
            return
        enigma = enigmas_mod.Enigma(pergunta=row["enigma_pergunta"], respostas=tuple(row["enigma_respostas"]))
        await interaction.response.send_modal(EnigmaModal(self.cog, self.token, enigma))


class EnigmaModal(discord.ui.Modal, title="Enigma do Baú Trancado"):
    """Só pede a resposta: a pergunta já está no embed público do baú."""

    resposta = discord.ui.TextInput(label="Sua resposta", max_length=100)

    def __init__(self, cog: "Baus", token: str, enigma: enigmas_mod.Enigma):
        super().__init__(timeout=180)
        self.cog = cog
        self.token = token
        self.enigma = enigma

    async def on_submit(self, interaction: discord.Interaction):
        if not enigmas_mod.checar_resposta(self.enigma, str(self.resposta.value)):
            await interaction.response.send_message(
                "❌ Resposta errada. Clique no botão e tente de novo!", ephemeral=True
            )
            return
        await self.cog.abrir_bau_click(interaction, self.token)


class Baus(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self.bot.add_dynamic_items(BauAbrirButton, BauEnigmaResponderButton)
        registrar_reinicio_em_erro(self.ciclo, "ciclo_baus", log)
        registrar_reinicio_em_erro(self.recovery, "recovery_baus", log)
        registrar_reinicio_em_erro(self.ciclo_expiracao_baus, "ciclo_expiracao_baus", log)
        self.ciclo.start()
        self.recovery.start()
        self.ciclo_expiracao_baus.start()

    def cog_unload(self):
        self.ciclo.cancel()
        self.recovery.cancel()
        self.ciclo_expiracao_baus.cancel()

    def aplicar_bonus_horoscopo(self, guild_id: str, membro: discord.Member, premio: dict):
        """Se o Horóscopo do Jardim de hoje (cogs/horoscopo.py) apontar pra
        Árvore do jogador que abriu o baú, dobra o Lunaris do prêmio. Não mexe
        nos itens: só na sorte em dinheiro do dia."""
        if not self.bot.db.automacao_ativa(guild_id, "horoscopo", True):
            return premio, False
        arvore_id = self.bot.db.get_horoscopo(guild_id)
        if not arvore_id:
            return premio, False
        cargo_id = self.bot.db.get_cargos_arvore(guild_id).get(arvore_id)
        if not cargo_id or not any(str(cargo.id) == cargo_id for cargo in membro.roles):
            return premio, False
        premio_bonus = dict(premio)
        premio_bonus["lunaris"] = int(premio.get("lunaris") or 0) * 2
        return premio_bonus, True

    # ── Entrega do prêmio ─────────────────────────────────────────────────
    async def processar_entrega(self, entrega: dict) -> dict:
        """Entrega sempre a partir do registro persistido, nunca do comando."""
        guild_id = str(entrega["guild_id"])
        mensagem_id = str(entrega["mensagem_id"])
        atual = self.bot.db.iniciar_tentativa_bau_entrega(guild_id, mensagem_id)
        if atual is None:
            raise ValueError("entrega de baú não encontrada")
        if atual.get("status") == "entregue":
            return dict(atual.get("resultado") or {})

        premio = serializar_premio_bau(atual["premio"])
        vencedor_user_id = str(atual["vencedor_user_id"])
        modo_entrega = str(atual.get("modo_entrega") or "legado")
        if modo_entrega == "legado":
            return self.bot.db.entregar_bau_legado(guild_id, mensagem_id)
        itens_cofre = [
            {
                "item_id": item["id"],
                "titulo": item["titulo"],
                "quantidade": item["quantidade"],
                "dados": {
                    **item["conteudo"],
                    "tipo": item["tipo"],
                    "raridade": item["raridade"],
                    "origem": "bau-discord",
                },
            }
            for item in premio["itens"]
        ]
        # Lunaris de baú vai pra carteira local (integrada à economia do site,
        # mas roubável). Só os itens usam o cofre da conta no
        # site: é ele que fica protegido e que a ficha enxerga.
        lunaris = premio["lunaris"]
        creditos_sombrios = int(premio.get("creditos_sombrios") or 0)

        # sortear_item pode não achar nada pro tema/raridade configurado: sem
        # item nenhum não há o que depositar no cofre da conta (moedas não
        # entram mais nesse depósito), então não há API/banco pra chamar.
        entregue = not itens_cofre
        if itens_cofre and self.bot.platform is not None:
            try:
                await self.bot.platform.deposit_vault(
                    discord_user_id=int(vencedor_user_id),
                    discord_guild_id=int(guild_id),
                    idempotency_key=str(atual["idempotencia"]),
                    reason="Bau automatico do Jornalista",
                    items=itens_cofre,
                    currencies=[],
                )
                entregue = True
            except PlatformApiError as exc:
                log.warning(
                    "bau %s: entrega pela API falhou (%s) — tentando o banco direto",
                    mensagem_id, exc,
                )

        if not entregue:
            try:
                entregue = self.bot.db.depositar_cofre_plataforma(
                    guild_id,
                    vencedor_user_id,
                    idempotencia=str(atual["idempotencia"]),
                    motivo="Bau automatico do Jornalista",
                    itens=itens_cofre,
                    moedas=[],
                ) is not None
            except Exception:
                log.exception("bau %s: entrega direta no banco falhou", mensagem_id)

        if not entregue:
            log.warning("bau %s caiu para o modo legado", mensagem_id)
            self.bot.db.definir_modo_bau_entrega(guild_id, mensagem_id, "legado")
            return self.bot.db.entregar_bau_legado(guild_id, mensagem_id)

        # Credita a moeda correspondente ao tipo de baú
        if creditos_sombrios > 0:
            self.bot.db.creditar(guild_id, vencedor_user_id, "Créditos Sombrios", creditos_sombrios)

        resultado = {
            "ganhos": _ganhos_do_premio(premio),
            "destino": (
                "Créditos Sombrios na carteira · itens no cofre da conta no site"
                if creditos_sombrios > 0
                else "Lunaris na carteira · itens no cofre da conta no site"
            ),
            "confirmado": True,
            "bau": dict(premio.get("bau") or {}),
        }
        self.bot.db.marcar_bau_entrega_entregue(
            guild_id, mensagem_id, resultado,
            vencedor_user_id=vencedor_user_id, lunaris=lunaris,
        )
        return resultado

    # ── Clique no botão (normal ou depois de acertar o enigma) ─────────────
    async def abrir_bau_click(self, interaction: discord.Interaction, token: str) -> None:
        """Ponto de entrada único dos dois fluxos (baú normal e baú com
        enigma, após acertar): busca o estado em `baus_no_ar` — se não achar,
        o baú já foi reivindicado por outra pessoa ou expirou."""
        row = self.bot.db.get_bau_no_ar(token)
        if row is None:
            guild_id = str(interaction.guild_id)
            mensagem_id = str(interaction.message.id) if interaction.message else None
            entrega_existente = (
                self.bot.db.get_bau_entrega(guild_id, mensagem_id) if mensagem_id else None
            )
            if entrega_existente is not None:
                resultado = entrega_existente.get("resultado") or self.resultado_pendente(entrega_existente)
                await _responder_efemero(
                    interaction,
                    "ℹ️ Este baú já foi atribuído. Se estiver pendente, um mestre pode usar `/bau_reprocessar`.",
                )
                await self.atualizar_mensagem_entrega(
                    entrega_existente, resultado, view=_view_bau_resolvido(bool(resultado.get("confirmado")))
                )
                return
            await _responder_efemero(interaction, "Esse baú não está mais disponível.")
            return

        # A entrega pode aguardar a plataforma por vários segundos. Confirma o
        # clique ao Discord antes de qualquer I/O lento pro token não expirar.
        try:
            await interaction.response.defer(ephemeral=True, thinking=True)
        except discord.HTTPException:
            return
        await self._resolver_abertura(interaction, row)

    async def _resolver_abertura(self, interaction: discord.Interaction, row: dict) -> None:
        guild_id = str(row["guild_id"])
        mensagem_id = str(row["mensagem_id"])
        token = row["token"]
        premio = row["premio"]

        premio_final, bonus_horoscopo = premio, False
        if isinstance(interaction.user, discord.Member):
            premio_final, bonus_horoscopo = self.aplicar_bonus_horoscopo(guild_id, interaction.user, premio)
        if bonus_horoscopo:
            await _responder_efemero(
                interaction,
                "🌟 O Horóscopo do Jardim está com você hoje: Lunaris em dobro nesse baú!",
                followup=True,
            )

        try:
            entrega = self.bot.db.registrar_bau_entrega_pendente(
                guild_id,
                mensagem_id,
                str(row["canal_id"]),
                str(interaction.user.id),
                premio_final,
                "plataforma" if self.bot.platform is not None else "legado",
            )
        except Exception:
            log.exception("falha ao registrar vencedor do bau %s", mensagem_id)
            await _responder_efemero(
                interaction, "⚠️ Não consegui registrar o vencedor. Tente de novo.", followup=True
            )
            return

        # O baú sai do ar assim que alguém reivindica (com sucesso ou não: se
        # "nova" vier False é porque outra pessoa já tinha travado antes, e
        # `baus_entregas` já é a fonte da verdade a partir daqui).
        self.bot.db.remover_bau_no_ar(token)

        if not entrega.get("nova"):
            resultado = entrega.get("resultado") or self.resultado_pendente(
                entrega, "Esta mensagem já tem um vencedor registrado."
            )
            await _responder_efemero(
                interaction,
                "ℹ️ Este baú já foi atribuído. Se estiver pendente, um mestre pode usar `/bau_reprocessar`.",
                followup=True,
            )
            await self.atualizar_mensagem_entrega(
                entrega, resultado, view=_view_bau_resolvido(bool(resultado.get("confirmado")))
            )
            return

        try:
            resultado = await self.processar_entrega(entrega)
        except Exception:
            log.exception("falha inesperada ao entregar bau %s", mensagem_id)
            try:
                estado = self.bot.db.marcar_bau_entrega_pendente(
                    guild_id, mensagem_id, "erro inesperado na entrega"
                )
            except Exception:
                log.exception("falha ao manter bau %s como pendente", mensagem_id)
                estado = None
            if estado and estado.get("status") == "entregue":
                resultado = dict(estado.get("resultado") or {})
            else:
                resultado = self.resultado_pendente(entrega, "erro inesperado na entrega")

        if resultado.get("confirmado"):
            await _responder_efemero(
                interaction, embed=self.embed_recibo_privado(str(interaction.user.id), resultado), followup=True
            )
        else:
            await _responder_efemero(
                interaction,
                resultado.get("aviso")
                or "⚠️ A entrega ficou pendente. Um mestre pode reprocessá-la sem duplicar o prêmio.",
                followup=True,
            )
        await self.atualizar_mensagem_entrega(
            entrega, resultado, view=_view_bau_resolvido(bool(resultado.get("confirmado")))
        )

    @staticmethod
    def resultado_pendente(entrega: dict, erro: str = "") -> dict:
        return {
            "ganhos": _ganhos_do_premio(entrega.get("premio") or {}),
            "destino": "entrega pendente de reprocessamento",
            "confirmado": False,
            "bau": dict((entrega.get("premio") or {}).get("bau") or {}),
            "aviso": (
                "⚠️ A entrega ficou pendente e continua reservada para o primeiro vencedor. "
                "Um mestre pode usar `/bau_reprocessar`."
            ),
            "erro": str(erro)[:500],
        }

    @staticmethod
    def embed_recibo_privado(vencedor_user_id: str, resultado: dict) -> discord.Embed:
        destino = str(resultado.get("destino") or "cofre")
        bau = resultado.get("bau") or {}
        perfil = loot_mod.perfil_bau(str(bau.get("raridade") or "comum"))
        nome_bau = str(bau.get("nome") or perfil["nome"])
        return discord.Embed(
            title=f"{perfil['emoji']} {nome_bau} aberto!",
            description=(
                f"<@{vencedor_user_id}> abriu o baú e achou:\n"
                + "\n".join(
                    f"• {ganho}" for ganho in resultado.get("ganhos") or []
                )
                + f"\n\nEntregue na **{destino}**."
            ),
            color=perfil["cor"],
        )

    @staticmethod
    def embed_bau_final(
        usuario: discord.User | discord.Member | str, resultado: dict
    ) -> discord.Embed:
        mencao = usuario if isinstance(usuario, str) else usuario.mention
        ganhos = resultado.get("ganhos") or ["Recompensa reservada"]
        confirmado = bool(resultado.get("confirmado"))
        bau = resultado.get("bau") or {}
        perfil = loot_mod.perfil_bau(str(bau.get("raridade") or "comum"))
        nome_bau = str(bau.get("nome") or perfil["nome"])
        emb = ui.embed(
            f"🔓 {nome_bau} conquistado!" if confirmado else f"🔐 {nome_bau} reivindicado",
            categoria="bau",
            cor=perfil["cor"],
            descricao=f"{mencao} foi a primeira pessoa a abrir este baú.",
        )
        emb.add_field(
            name="Tesouro encontrado",
            value="\n".join(f"• {ganho}" for ganho in ganhos)[:1024],
            inline=False,
        )
        emb.add_field(
            name="Destino",
            value=str(resultado.get("destino") or "conferência pendente")[:1024],
            inline=False,
        )
        emb.set_footer(
            text=f"{ui.MARCA} · "
            + (
                "Recompensa entregue"
                if confirmado
                else "Entrega persistida · mestre: /bau_reprocessar"
            )
        )
        emb.timestamp = discord.utils.utcnow()
        return emb

    async def atualizar_mensagem_entrega(
        self,
        entrega: dict,
        resultado: dict,
        view: Optional[discord.ui.View] = None,
    ) -> None:
        guild = self.bot.get_guild(int(entrega["guild_id"]))
        if guild is None:
            return
        canal = guild.get_channel(int(entrega["canal_id"]))
        if not isinstance(canal, discord.TextChannel):
            return
        try:
            mensagem = await canal.fetch_message(int(entrega["mensagem_id"]))
            await mensagem.edit(
                embed=self.embed_bau_final(
                    f"<@{entrega['vencedor_user_id']}>", resultado
                ),
                view=view,
            )
        except (discord.HTTPException, ValueError):
            log.info(
                "nao consegui atualizar a mensagem do bau %s",
                entrega["mensagem_id"],
            )

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
            destino = await self._dropar(cfg)
            if destino is not None:
                self._reagendar(cfg)
            else:
                # Canal apagado ou permissão temporariamente ausente não deve
                # consumir o evento do dia inteiro. Tenta de novo mais tarde,
                # sem repetir a cada minuto.
                nova_tentativa = agora + timedelta(minutes=RETRY_DROP_MINUTOS)
                self.bot.db.set_proximo_drop(
                    cfg["guild_id"], nova_tentativa.isoformat()
                )

    def _reagendar(self, cfg: dict):
        prox = loot_mod.agendar_proximo(cfg["min_hora"], cfg["max_hora"], rng=random)
        self.bot.db.set_proximo_drop(cfg["guild_id"], prox.isoformat())

    # ── Recovery automático de entregas pendentes ─────────────────────────
    # Sem isso, uma falha transitória na plataforma (timeout, deploy,
    # reinício) prende o baú em "entrega pendente de reprocessamento" até um
    # mestre notar e digitar /bau_reprocessar manualmente. A chave de
    # idempotência já torna reprocessar seguro, então tentamos de novo
    # sozinhos antes de depender de alguém perceber.
    @tasks.loop(minutes=RETRY_ENTREGA_MINUTOS)
    async def recovery(self):
        for guild in list(self.bot.guilds):
            try:
                await self._reprocessar_pendentes_da_guild(str(guild.id))
            except Exception:
                log.exception(
                    "erro ao reprocessar entregas de baú pendentes (guild %s)", guild.id
                )

    @recovery.before_loop
    async def _antes_do_recovery(self):
        await self.bot.wait_until_ready()

    async def _reprocessar_pendentes_da_guild(self, guild_id: str) -> None:
        for entrega in self.bot.db.listar_baus_entregas_pendentes(guild_id):
            await self._reprocessar_uma_entrega(guild_id, entrega)

    async def _reprocessar_uma_entrega(self, guild_id: str, entrega: dict) -> dict:
        """Núcleo compartilhado por /bau_reprocessar e pelo recovery automático."""
        mensagem_id = str(entrega["mensagem_id"])
        try:
            resultado = await self.processar_entrega(entrega)
        except Exception as exc:
            log.exception("falha ao reprocessar bau %s (guild %s)", mensagem_id, guild_id)
            try:
                self.bot.db.marcar_bau_entrega_pendente(guild_id, mensagem_id, str(exc))
            except Exception:
                log.exception("falha ao manter recovery do bau %s", mensagem_id)
            resultado = self.resultado_pendente(entrega, str(exc))

        if resultado.get("confirmado"):
            atual = self.bot.db.get_bau_entrega(guild_id, mensagem_id) or entrega
            await self.atualizar_mensagem_entrega(atual, resultado, view=None)
            log.info("entrega do bau %s (guild %s) confirmada via recovery", mensagem_id, guild_id)
        return resultado

    # ── Expiração de baús no ar (ninguém abriu a tempo) ─────────────────────
    # Como as views agora são persistentes (sem timeout próprio: sobrevivem a
    # reinício), o antigo View.on_timeout não roda mais. Esse ciclo é quem
    # fecha o baú no prazo definido por sua raridade.
    @tasks.loop(minutes=1)
    async def ciclo_expiracao_baus(self):
        agora = datetime.now(timezone.utc)
        for row in self.bot.db.listar_baus_no_ar_expirados(agora):
            try:
                await self._expirar_bau_no_ar(row)
            except Exception:
                log.exception("erro ao expirar bau no ar (token %s)", row.get("token"))

    @ciclo_expiracao_baus.before_loop
    async def _antes_da_expiracao(self):
        await self.bot.wait_until_ready()

    async def _expirar_bau_no_ar(self, row: dict) -> None:
        guild_id, mensagem_id, token = str(row["guild_id"]), str(row["mensagem_id"]), row["token"]
        self.bot.db.remover_bau_no_ar(token)
        # Se já foi reivindicado e só a linha de controle não foi apagada (uma
        # falha bem no meio, entre registrar a entrega e remover_bau_no_ar),
        # não pode sobrescrever o embed de sucesso com "baú desapareceu".
        if self.bot.db.get_bau_entrega(guild_id, mensagem_id) is not None:
            return
        guild = self.bot.get_guild(int(guild_id))
        if guild is None:
            return
        canal = guild.get_channel(int(row["canal_id"]))
        if not isinstance(canal, discord.TextChannel):
            return
        trancado = bool(row.get("enigma_pergunta"))
        bau_info = (row.get("premio") or {}).get("bau") or {}
        nome_bau = str(bau_info.get("nome") or "Baú")
        emb = ui.embed(
            f"🍂 O {nome_bau} trancado desapareceu" if trancado else f"🍂 O {nome_bau} desapareceu",
            categoria="bau",
            descricao=(
                "Ninguém acertou o enigma a tempo. O Jardim levou o mistério de volta."
                if trancado
                else "Ninguém chegou a tempo. O Jardim levou o mistério de volta."
            ),
        )
        try:
            mensagem = await canal.fetch_message(int(mensagem_id))
            await mensagem.edit(embed=emb, view=_view_bau_desaparecido())
        except discord.HTTPException:
            pass

    async def _dropar(
        self,
        cfg: dict,
        canal_forcado: Optional[discord.TextChannel] = None,
        raridade_forcada: Optional[str] = None,
    ):
        canal = self._sortear_canal_valido(cfg["guild_id"], canal_forcado)
        if canal is None:
            log.warning("nenhum canal válido de baú na guild %s", cfg["guild_id"])
            return None
        info_estacao = economia.estacao_info(self.bot.db.get_estacao(cfg["guild_id"]))
        pesos_estacao = info_estacao["pesos"]
        especial = info_estacao.get("tipo") == "especial"
        raridade_bau = (
            raridade_forcada
            if raridade_forcada in loot_mod.BAU_RARIDADES
            else loot_mod.sortear_raridade_bau(random, evento_especial=especial)
        )
        perfil = loot_mod.perfil_bau(raridade_bau)
        parametros = loot_mod.parametros_premio_bau(
            raridade_bau,
            cfg.get("itens_por_bau", 1),
            cfg.get("lunaris_min", loot_mod.LUNARIS_MIN),
            cfg.get("lunaris_max", loot_mod.LUNARIS_MAX),
        )
        qtd = parametros["qtd_itens"]
        tema = self.bot.db.get_bau_canal_tema(cfg["guild_id"], str(canal.id))
        if tema and tema not in loot_mod.TIPOS_PERMITIDOS_BAU:
            # Configs antigas podiam escolher veículos. Não apagamos o dado
            # automaticamente, mas evitamos um baú sem itens e usamos a
            # seleção padrão até o mestre trocar/remover o tema.
            log.warning(
                "tema de bau obsoleto %r na guild %s; usando loot padrao",
                tema, cfg["guild_id"],
            )
            tema = None
        tipos = [tema] if tema else None
        pesos_itens = loot_mod.pesos_itens_do_bau(raridade_bau, pesos_estacao)

        # Baú Sombrio: loot especial com Créditos Sombrios
        if tema == "sombrio":
            premio = loot_mod.sortear_bau_sombrio(
                self.bot.catalogo,
                qtd_itens=max(2, qtd),
                rng=random,
                raridade_bau=raridade_bau,
            )
        else:
            premio = loot_mod.sortear_bau(
                self.bot.catalogo, qtd_itens=qtd, rng=random, pesos=pesos_itens, tipos=tipos,
                lunaris_min=parametros["lunaris_min"],
                lunaris_max=parametros["lunaris_max"],
            )

        rotulo = info_estacao.get("rotulo", "Jardim")
        emoji_estacao, _cor_estacao = _ESTACAO_ENFEITE.get(rotulo, ("✦", _COR_BAU))
        dificuldade = perfil["dificuldade_enigma"]
        enigma = (
            enigmas_mod.sortear_enigma(rng=random, dificuldade=dificuldade)
            if dificuldade
            else None
        )
        expira_em = datetime.now(timezone.utc) + timedelta(
            minutes=parametros["expira_minutos"]
        )
        premio["bau"] = {
            "raridade": raridade_bau,
            "nome": perfil["nome"],
            "dificuldade_enigma": dificuldade,
            "expira_minutos": parametros["expira_minutos"],
        }
        premio_serializado = serializar_premio_bau(premio)
        # Token gerado ANTES de enviar: o custom_id do botão precisa existir
        # já na primeira mensagem, mas o id da mensagem só existe depois de
        # enviada. É o token (não o mensagem_id) que identifica esse baú em
        # `baus_no_ar`, e é por isso que sobrevive a reinício do bot.
        token = uuid.uuid4().hex

        if tema == "sombrio":
            # Visual especial pro baú sombrio
            if enigma is not None:
                view = _view_bau_enigma(self, token)
                titulo = f"🕳️ 📜 {perfil['nome']} Sombrio surge das sombras..."
                descricao = (
                    "*Uma caixa sem marca, sem origem. Quem a tocou antes de você?*\n\n"
                    f"**Enigma {dificuldade.upper()} · {enigma.categoria}:**\n{enigma.pergunta}\n\n"
                    "Responda certo pra destrancar: **só o primeiro acerto leva a recompensa.**"
                )
                rodape_acao = "Primeiro acerto vence"
            else:
                view = _view_bau_abrir(self, token)
                titulo = f"🕳️ {perfil['emoji']} Baú Sombrio emerge das trevas!"
                descricao = (
                    "*Um embrulho sem marca aparece no canal. Ninguém sabe de onde veio, "
                    "mas todos sabem que o que está dentro não é legal.*\n\n"
                    "**Só a primeira pessoa a abrir leva o conteúdo.**"
                )
                rodape_acao = "Primeiro clique válido vence"
            cor_embed = 0x1a0a2e  # roxo escuro sombrio
        else:
            if enigma is not None:
                view = _view_bau_enigma(self, token)
                titulo = f"🔒 {perfil['emoji']} {perfil['nome']} trancado surgiu!"
                descricao = (
                    f"_{info_estacao.get('descricao', '')}_\n\n"
                    f"**Enigma {dificuldade.upper()} · {enigma.categoria}:**\n{enigma.pergunta}\n\n"
                    "Responda certo pra destrancar: **só o primeiro acerto leva a recompensa.**"
                )
                cor_embed = perfil["cor"]
                rodape_acao = "Primeiro acerto vence"
            else:
                view = _view_bau_abrir(self, token)
                titulo = f"{emoji_estacao} {perfil['emoji']} {perfil['nome']} surgiu!"
                descricao = (
                    f"_{info_estacao.get('descricao', '')}_\n\n"
                    "As folhas se afastam e revelam um tesouro. "
                    "**Só a primeira pessoa a abrir leva a recompensa.**"
                )
                cor_embed = perfil["cor"]
                rodape_acao = "Primeiro clique válido vence"

        emb = ui.embed(titulo, categoria="bau", cor=cor_embed, descricao=descricao)
        if tema == "sombrio":
            creditos = premio.get("creditos_sombrios", 0)
            emb.add_field(
                name="🕳️ O que pode haver dentro",
                value=(
                    f"**{creditos} Créditos Sombrios** e até **{max(2, qtd)} item(ns)** "
                    "extraído(s) do mercado negro. Raridades acima do normal."
                ),
                inline=False,
            )
        else:
            emb.add_field(
                name="🎁 O que pode haver dentro",
                value=(
                    f"**{parametros['lunaris_min']}–{parametros['lunaris_max']} Lunaris** e "
                    f"até **{qtd} item(ns)**. O perfil deste baú favorece itens de até "
                    f"**{_melhor_raridade(perfil['pesos_itens'])}**."
                    + (f" Tema do canal: **{tema}**." if tema else "")
                ),
                inline=False,
            )
        emb.add_field(
            name="⏳ Tempo para conquistar",
            value=(
                f"Desaparece <t:{int(expira_em.timestamp())}:R> "
                f"(<t:{int(expira_em.timestamp())}:t>)."
            ),
            inline=False,
        )
        if especial:
            emb.add_field(
                name="✨ Evento especial",
                value="A chance de itens raros está **muito acima do normal**. Corra!",
                inline=False,
            )
        emb.set_footer(
            text=f"{ui.MARCA} · {perfil['nome']} · Evento aleatório · {rodape_acao}"
        )
        emb.timestamp = discord.utils.utcnow()
        try:
            mensagem = await canal.send(
                embed=emb,
                view=view,
                allowed_mentions=discord.AllowedMentions.none(),
            )
        except discord.HTTPException:
            log.exception("falha ao enviar baú no canal %s", canal.id)
            return None

        self.bot.db.criar_bau_no_ar(
            token, cfg["guild_id"], str(canal.id), str(mensagem.id), premio_serializado, expira_em, enigma=enigma
        )
        return canal

    def _sortear_canal_valido(
        self,
        guild_id: str,
        canal_forcado: Optional[discord.TextChannel] = None,
    ) -> Optional[discord.TextChannel]:
        if canal_forcado is not None:
            return canal_forcado if _canal_aceita_bau(canal_forcado) else None
        guild = self.bot.get_guild(int(guild_id))
        if guild is None:
            return None
        validos = []
        for canal_id in self.bot.db.listar_baus_canais(guild_id):
            try:
                canal = guild.get_channel(int(canal_id))
            except (TypeError, ValueError):
                continue
            if _canal_aceita_bau(canal):
                validos.append(canal)
        return random.choice(validos) if validos else None

    # ── Comandos de mestre ────────────────────────────────────────────────
    @app_commands.command(name="bau_config", description="[Mestre] Configura os baús automáticos.")
    @app_commands.default_permissions(manage_guild=True)
    @app_commands.checks.has_permissions(manage_guild=True)
    @app_commands.describe(
        canal="Canal inicial da rotação (opcional; prefira /bau_canal_adicionar).",
        ativo="Liga (True) ou desliga (False) os baús.",
        min_hora="Hora mínima da janela (0-23).",
        max_hora="Hora máxima da janela (0-23).",
        itens_por_bau="Quantidade-base; raridades altas recebem itens extras (1-5 no total).",
        lunaris_min="Base mínima de Lunaris; a raridade aplica um multiplicador.",
        lunaris_max="Base máxima de Lunaris; a raridade aplica um multiplicador.",
    )
    async def bau_config(self, interaction: discord.Interaction,
                         canal: discord.TextChannel = None, ativo: bool = None,
                         min_hora: app_commands.Range[int, 0, 23] = None,
                         max_hora: app_commands.Range[int, 0, 23] = None,
                         itens_por_bau: app_commands.Range[int, 1, 5] = None,
                         lunaris_min: app_commands.Range[int, 0] = None,
                         lunaris_max: app_commands.Range[int, 0] = None):
        gid = str(interaction.guild_id)
        cfg_atual = self.bot.db.get_baus_config(gid)
        if canal is not None and not _canal_aceita_bau(canal):
            await interaction.response.send_message(
                "⚠️ Preciso de **Ver canal**, **Enviar mensagens** e **Inserir links** nesse canal.",
                ephemeral=True,
            )
            return
        hora_min_efetiva = cfg_atual["min_hora"] if min_hora is None else min_hora
        hora_max_efetiva = cfg_atual["max_hora"] if max_hora is None else max_hora
        if hora_min_efetiva > hora_max_efetiva:
            await interaction.response.send_message(
                "⚠️ A hora mínima não pode ser maior que a hora máxima.", ephemeral=True
            )
            return
        lunaris_min_efetivo = cfg_atual["lunaris_min"] if lunaris_min is None else lunaris_min
        lunaris_max_efetivo = cfg_atual["lunaris_max"] if lunaris_max is None else lunaris_max
        if lunaris_min_efetivo > lunaris_max_efetivo:
            await interaction.response.send_message(
                "⚠️ O mínimo de Lunaris não pode ser maior que o máximo.", ephemeral=True
            )
            return
        if canal is not None:
            self.bot.db.adicionar_bau_canal(gid, str(canal.id))
        if ativo is True and not self.bot.db.listar_baus_canais(gid):
            await interaction.response.send_message(
                "⚠️ Adicione pelo menos um destino com `/bau_canal_adicionar` antes de ligar os baús.",
                ephemeral=True,
            )
            return
        self.bot.db.atualizar_baus_config(
            gid,
            canal_id=(str(canal.id) if canal else None),
            ativo=ativo, min_hora=min_hora, max_hora=max_hora, itens_por_bau=itens_por_bau,
            lunaris_min=lunaris_min, lunaris_max=lunaris_max,
        )
        cfg = self.bot.db.get_baus_config(gid)
        canais = self.bot.db.listar_baus_canais(gid)
        if cfg["ativo"] and canais and not cfg.get("proximo_drop"):
            self._reagendar(cfg)
            cfg = self.bot.db.get_baus_config(gid)

        canal_txt = " · ".join(f"<#{canal_id}>" for canal_id in canais) or "Nenhum canal"
        await interaction.response.send_message(
            f"🎁 **Baús:** {'ligados ✅' if cfg['ativo'] else 'desligados ⛔'}\n"
            f"Canais da rotação: {canal_txt}\n"
            f"Janela: {cfg['min_hora']}h–{cfg['max_hora']}h · "
            f"{cfg['itens_por_bau']} item(ns) de base\n"
            f"Lunaris-base: {cfg['lunaris_min']}–{cfg['lunaris_max']}\n"
            "Raridades automáticas: **Comum, Incomum, Raro, Épico, Lendário e "
            "Mítico**. Raro ou superior vem trancado; a dificuldade e a recompensa "
            "crescem, mas o prazo diminui conforme a raridade.\n"
            f"Próximo: {cfg.get('proximo_drop') or 'Não agendado'}",
            ephemeral=True,
        )

    @app_commands.command(name="bau_canal_adicionar", description="[Mestre] Adiciona um canal à rotação aleatória de baús.")
    @app_commands.default_permissions(manage_guild=True)
    @app_commands.checks.has_permissions(manage_guild=True)
    async def bau_canal_adicionar(
        self, interaction: discord.Interaction, canal: discord.TextChannel
    ):
        if not _canal_aceita_bau(canal):
            await interaction.response.send_message(
                "⚠️ Preciso de **Ver canal**, **Enviar mensagens** e **Inserir links** nesse canal.",
                ephemeral=True,
            )
            return
        adicionado = self.bot.db.adicionar_bau_canal(
            str(interaction.guild_id), str(canal.id)
        )
        texto = "adicionado à" if adicionado else "já estava na"
        await interaction.response.send_message(
            f"✅ {canal.mention} {texto} rotação aleatória dos baús.",
            ephemeral=True,
        )

    @app_commands.command(name="bau_canal_remover", description="[Mestre] Remove um canal da rotação de baús.")
    @app_commands.default_permissions(manage_guild=True)
    @app_commands.checks.has_permissions(manage_guild=True)
    async def bau_canal_remover(
        self, interaction: discord.Interaction, canal: discord.TextChannel
    ):
        removido = self.bot.db.remover_bau_canal(
            str(interaction.guild_id), str(canal.id)
        )
        await interaction.response.send_message(
            (
                f"✅ {canal.mention} removido da rotação."
                if removido
                else f"ℹ️ {canal.mention} não estava na rotação."
            ),
            ephemeral=True,
        )

    @app_commands.command(name="bau_canais", description="[Mestre] Lista os canais da rotação aleatória de baús.")
    @app_commands.default_permissions(manage_guild=True)
    @app_commands.checks.has_permissions(manage_guild=True)
    async def bau_canais(self, interaction: discord.Interaction):
        ids = self.bot.db.listar_baus_canais(str(interaction.guild_id))
        if not ids:
            await interaction.response.send_message(
                "Nenhum canal configurado. Use `/bau_canal_adicionar`.", ephemeral=True
            )
            return
        guild = interaction.guild
        linhas = []
        for canal_id in ids:
            canal = guild.get_channel(int(canal_id)) if guild and canal_id.isdigit() else None
            estado = "válido ✅" if _canal_aceita_bau(canal) else "ignorado: sem acesso ou removido ⚠️"
            linhas.append(f"• <#{canal_id}>: {estado}")
        await interaction.response.send_message(
            "**Canais sorteados aleatoriamente:**\n" + "\n".join(linhas),
            ephemeral=True,
            allowed_mentions=discord.AllowedMentions.none(),
        )

    @app_commands.command(
        name="bau_canal_tema",
        description="[Mestre] Enviesa o tipo de item que cai nos baús de um canal (imersão geográfica).",
    )
    @app_commands.default_permissions(manage_guild=True)
    @app_commands.checks.has_permissions(manage_guild=True)
    @app_commands.describe(canal="Canal a configurar.", tipo="Tipo de item favorecido (vazio remove o tema).")
    @app_commands.choices(tipo=[
        app_commands.Choice(name="Arma (ex.: campo de treino)", value="arma"),
        app_commands.Choice(name="Armadura", value="armadura"),
        app_commands.Choice(name="Equipamento", value="equipamento"),
        app_commands.Choice(name="Consumível", value="consumivel"),
        app_commands.Choice(name="Modificação", value="modificacao"),
        app_commands.Choice(name="Drop (ex.: local de caça/pesca)", value="drop"),
        app_commands.Choice(name="🕳️ Sombrio (baú do mercado negro)", value="sombrio"),
    ])
    async def bau_canal_tema(
        self, interaction: discord.Interaction, canal: discord.TextChannel,
        tipo: Optional[app_commands.Choice[str]] = None,
    ):
        gid = str(interaction.guild_id)
        self.bot.db.set_bau_canal_tema(gid, str(canal.id), tipo.value if tipo else None)
        if tipo:
            await interaction.response.send_message(
                f"✅ Baús de {canal.mention} agora favorecem itens do tipo **{tipo.name}**.", ephemeral=True
            )
        else:
            await interaction.response.send_message(
                f"✅ Tema removido: baús de {canal.mention} voltam a sortear qualquer tipo.", ephemeral=True
            )

    @app_commands.command(
        name="bau_pendentes",
        description="[Mestre] Lista baús cujo vencedor aguarda confirmação da entrega.",
    )
    @app_commands.default_permissions(manage_guild=True)
    @app_commands.checks.has_permissions(manage_guild=True)
    async def bau_pendentes(self, interaction: discord.Interaction):
        await interaction.response.defer(ephemeral=True, thinking=True)
        entregas = self.bot.db.listar_baus_entregas_pendentes(
            str(interaction.guild_id), limite=20
        )
        if not entregas:
            await interaction.followup.send(
                "✅ Não há entregas de baú pendentes neste servidor.",
                ephemeral=True,
            )
            return

        emb = ui.embed(
            "🔐 Entregas de baú pendentes",
            categoria="bau",
            descricao=(
                "O vencedor e o prêmio já estão persistidos. Reprocesse pelo "
                "ID da mensagem; a mesma chave impede duplicação na plataforma."
            ),
        )
        for entrega in entregas:
            erro = str(entrega.get("ultimo_erro") or "sem detalhe")
            erro = " ".join(erro.split())[:250]
            premio = " · ".join(_ganhos_do_premio(entrega["premio"]))[:500]
            link = (
                f"https://discord.com/channels/{entrega['guild_id']}/"
                f"{entrega['canal_id']}/{entrega['mensagem_id']}"
            )
            emb.add_field(
                name=f"Mensagem {entrega['mensagem_id']}",
                value=(
                    f"Vencedor: <@{entrega['vencedor_user_id']}> · "
                    f"tentativas: **{entrega['tentativas']}**\n"
                    f"{premio}\nErro: {erro}\n[Ver baú]({link})"
                )[:1024],
                inline=False,
            )
        emb.set_footer(text=f"{ui.MARCA} · /bau_reprocessar <mensagem_id>")
        await interaction.followup.send(
            embed=emb,
            ephemeral=True,
            allowed_mentions=discord.AllowedMentions.none(),
        )

    @app_commands.command(
        name="bau_reprocessar",
        description="[Mestre] Repete uma entrega pendente sem trocar vencedor ou prêmio.",
    )
    @app_commands.default_permissions(manage_guild=True)
    @app_commands.checks.has_permissions(manage_guild=True)
    @app_commands.describe(mensagem_id="ID da mensagem mostrado por /bau_pendentes.")
    async def bau_reprocessar(
        self, interaction: discord.Interaction, mensagem_id: str
    ):
        mensagem_id = mensagem_id.strip()
        if not mensagem_id.isdigit():
            await interaction.response.send_message(
                "⚠️ Informe apenas o ID numérico da mensagem do baú.",
                ephemeral=True,
            )
            return
        await interaction.response.defer(ephemeral=True, thinking=True)
        guild_id = str(interaction.guild_id)
        entrega = self.bot.db.get_bau_entrega(guild_id, mensagem_id)
        if entrega is None:
            await interaction.followup.send(
                "⚠️ Não encontrei uma entrega de baú com esse ID neste servidor.",
                ephemeral=True,
            )
            return
        if entrega.get("status") == "entregue":
            await interaction.followup.send(
                "ℹ️ Essa entrega já está confirmada; nada foi enviado novamente.",
                ephemeral=True,
            )
            return

        resultado = await self._reprocessar_uma_entrega(guild_id, entrega)
        if resultado.get("confirmado"):
            await interaction.followup.send(
                content=(
                    f"✅ Entrega confirmada para <@{entrega['vencedor_user_id']}> "
                    f"com a chave `{entrega['idempotencia']}`."
                ),
                embed=self.embed_recibo_privado(
                    str(entrega["vencedor_user_id"]), resultado
                ),
                ephemeral=True,
                allowed_mentions=discord.AllowedMentions.none(),
            )
            return
        await interaction.followup.send(
            resultado.get("aviso")
            or "⚠️ A entrega continua pendente; nenhuma troca de vencedor foi feita.",
            ephemeral=True,
        )

    @app_commands.command(name="bau_agora", description="[Mestre] Solta um baú agora (pra testar).")
    @app_commands.default_permissions(manage_guild=True)
    @app_commands.checks.has_permissions(manage_guild=True)
    @app_commands.describe(
        canal="Canal onde soltar (padrão: um canal da rotação).",
        raridade="Forçar uma raridade para teste; vazio mantém o sorteio.",
    )
    @app_commands.choices(raridade=BAU_RARIDADE_CHOICES)
    async def bau_agora(
        self,
        interaction: discord.Interaction,
        canal: discord.TextChannel = None,
        raridade: Optional[app_commands.Choice[str]] = None,
    ):
        gid = str(interaction.guild_id)
        cfg = dict(self.bot.db.get_baus_config(gid))
        if canal:
            if not _canal_aceita_bau(canal):
                await interaction.response.send_message(
                    "⚠️ Não consigo publicar nesse canal.", ephemeral=True
                )
                return
        elif not self.bot.db.listar_baus_canais(gid):
            await interaction.response.send_message(
                "Adicione um canal com `/bau_canal_adicionar` primeiro (ou passe um canal aqui).", ephemeral=True)
            return
        await interaction.response.defer(ephemeral=True, thinking=True)
        destino = await self._dropar(
            cfg,
            canal_forcado=canal,
            raridade_forcada=raridade.value if raridade else None,
        )
        if destino is None:
            await interaction.followup.send(
                "⚠️ Nenhum canal configurado está acessível ao bot.", ephemeral=True
            )
            return
        await interaction.followup.send(
            f"🎁 Baú lançado em {destino.mention}.", ephemeral=True
        )


async def setup(bot: commands.Bot):
    await bot.add_cog(Baus(bot))
