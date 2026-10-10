"""
Cog Baús: baús automáticos que aparecem em horário aleatório todo dia.
Primeiro a clicar leva o loot. Loot vem de core.loot (ponderado por raridade).
"""

from __future__ import annotations

import logging
import random
import re
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

import discord
from discord import app_commands
from discord.ext import commands, tasks

from core import colecao as colecao_mod
from core.edicao import inicio_do_mes
from core import economia
from core import enigmas as enigmas_mod
from core import loot as loot_mod
from core import publicacoes
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
        if premio["bau"].get("coletivo"):
            resultado["bau"]["coletivo"] = True
    if isinstance(premio.get("afinidade"), dict):
        resultado["afinidade"] = {
            "arvore": str(premio["afinidade"].get("arvore") or ""),
            "nome": str(premio["afinidade"].get("nome") or ""),
            "bonus": int(premio["afinidade"].get("bonus") or 0),
        }
    if isinstance(premio.get("chave"), dict):
        resultado["chave"] = {"item_extra": bool(premio["chave"].get("item_extra"))}
    if isinstance(premio.get("sorte"), dict):
        resultado["sorte"] = {
            "pistas": int(premio["sorte"].get("pistas") or 0),
            "item_extra": bool(premio["sorte"].get("item_extra")),
        }
    return resultado


def chave_coleta(mensagem_id, user_id) -> str:
    """Num baú coletivo cada pessoa tem a própria entrega, guardada em
    `baus_entregas` com esta chave composta no lugar do id da mensagem."""
    return f"{mensagem_id}:{user_id}"


def eh_chave_de_coleta(mensagem_id) -> bool:
    return ":" in str(mensagem_id)


def id_da_mensagem(mensagem_id) -> str:
    return str(mensagem_id).split(":", 1)[0]


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


def _view_bau_abrir(cog: "Baus", token: str, coletivo: bool = False) -> discord.ui.View:
    view = discord.ui.View(timeout=None)
    view.add_item(BauAbrirButton(cog, token, coletivo=coletivo))
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


def _view_bau_encerrado() -> discord.ui.View:
    view = discord.ui.View(timeout=None)
    view.add_item(discord.ui.Button(label="Baú encerrado", style=discord.ButtonStyle.secondary, disabled=True))
    return view


class BauAbrirButton(discord.ui.DynamicItem[discord.ui.Button], template=BAU_ABRIR_TEMPLATE):
    """Botão do baú normal. O custom_id carrega um token (não o id da
    mensagem, que só existe DEPOIS de enviá-la) que aponta pro estado
    persistido em `baus_no_ar`. Isso é o que permite reconstruir o baú a
    cada interação, mesmo que o processo do bot tenha reiniciado no meio."""

    def __init__(self, cog: "Baus", token: str, coletivo: bool = False):
        super().__init__(
            discord.ui.Button(
                label="Pegar o meu 🎁" if coletivo else "Abrir baú 🎁",
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
        # Quem tenta e não leva ganha uma Pista de Sorte quando o baú se resolve.
        try:
            self.cog.bot.db.registrar_tentativa_bau(
                str(row["guild_id"]), str(row["mensagem_id"]), str(interaction.user.id)
            )
        except Exception:
            log.exception("falha ao registrar tentativa de enigma")
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
    @staticmethod
    def _com_sorte(resultado: dict, premio: dict) -> dict:
        """A entrega legada é gravada pelo banco; a nota das Pistas de Sorte
        acompanha só o recibo que o jogador vê."""
        extras = {
            chave: dict(premio[chave])
            for chave in ("sorte", "chave", "afinidade")
            if premio.get(chave) and chave not in resultado
        }
        return {**resultado, **extras} if extras else resultado

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
            return self._com_sorte(self.bot.db.entregar_bau_legado(guild_id, mensagem_id), premio)
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
            return self._com_sorte(self.bot.db.entregar_bau_legado(guild_id, mensagem_id), premio)

        # Os Créditos Sombrios (baú sombrio) entram na carteira na mesma
        # transação que fecha a entrega, junto com os Lunaris: creditar aqui,
        # fora dela, podia pagar duas vezes se um retry reprocessasse o baú.
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
        for chave in ("sorte", "chave", "afinidade"):
            if premio.get(chave):
                resultado[chave] = dict(premio[chave])
        self.bot.db.marcar_bau_entrega_entregue(
            guild_id, mensagem_id, resultado,
            vencedor_user_id=vencedor_user_id, lunaris=lunaris,
            creditos_sombrios=creditos_sombrios,
        )
        return resultado

    # ── Clique no botão (normal ou depois de acertar o enigma) ─────────────
    def _tentar(self, descricao: str, funcao, *args, padrao=None):
        """Recursos secundários (Pistas de Sorte, histórico, mural) nunca podem
        impedir a entrega de um prêmio: qualquer falha vira log e segue."""
        try:
            return funcao(*args)
        except Exception:
            log.exception("baus: falha em recurso secundario (%s)", descricao)
            return padrao

    def _usar_chave(self, guild_id: str, usuario_id: str, canal_id, raridade: str, premio: dict):
        """Gasta uma Chave (se a pessoa tem e deixou o uso automático ligado)
        num baú Incomum ou melhor. Devolve (prêmio, usou). Qualquer falha
        devolve a Chave e o prêmio original: a Chave nunca se perde."""
        if not loot_mod.chave_vale_para(raridade):
            return premio, False
        gastou = self._tentar("consumir chave", self.bot.db.consumir_chave, guild_id, usuario_id, padrao=False)
        if not gastou:
            return premio, False

        def _aplicar():
            pesos, tipos = self._pesos_e_tipos(guild_id, canal_id, raridade, acima=True)
            return serializar_premio_bau(
                loot_mod.aplicar_chave_ao_premio(premio, self.bot.catalogo, pesos=pesos, tipos=tipos)
            )

        novo = self._tentar("aplicar chave", _aplicar)
        if novo is None:
            self._devolver_chave(guild_id, usuario_id)
            return premio, False
        return novo, True

    def _aplicar_afinidade(self, guild_id: str, usuario, premio: dict) -> dict:
        """Página completa de uma Árvore + o cargo dessa Árvore = +10% de
        Lunaris. Só vale para quem tem o cargo (registro por reação) e se a
        coleção estiver ligada. Qualquer falha devolve o prêmio como estava."""
        if not isinstance(usuario, discord.Member):
            return premio

        def _calcular():
            db = self.bot.db
            if not db.automacao_ativa(guild_id, "colecao", True):
                return premio
            progresso = db.get_colecao(guild_id, str(usuario.id))
            if not any(colecao_mod.pagina_completa(q) for q in progresso.values()):
                return premio
            cargos = db.get_cargos_arvore(guild_id)
            meus = {str(r.id) for r in usuario.roles}
            for arvore_id in colecao_mod.IDS:
                if colecao_mod.pagina_completa(progresso.get(arvore_id, 0)) and cargos.get(arvore_id) in meus:
                    return colecao_mod.aplicar_afinidade(premio, arvore_id)
            return premio

        return self._tentar("afinidade", _calcular, padrao=premio)

    def _sortear_fragmentos(self, guild_id: str, usuario, raridade: str, coletivo: bool) -> list:
        """Fragmentos da coleção das Árvores: chance nos baús coletivos e
        garantidos a quem vence uma corrida. Cada fragmento já é gravado aqui."""
        def _sortear():
            db = self.bot.db
            if not db.automacao_ativa(guild_id, "colecao", True):
                return []
            if coletivo:
                quantos = 1 if random.random() < colecao_mod.CHANCE_FRAGMENTO_COLETIVO.get(raridade, 0) else 0
            else:
                quantos = colecao_mod.FRAGMENTOS_NA_CORRIDA.get(raridade, 0)
            if not quantos:
                return []
            uid = str(usuario.id)
            cargos = db.get_cargos_arvore(guild_id)
            meus_cargos = {str(r.id) for r in getattr(usuario, "roles", [])}
            minhas = [a for a, c in cargos.items() if c in meus_cargos]
            horoscopo = db.get_horoscopo(guild_id)
            resultados = []
            for _ in range(quantos):
                progresso = db.get_colecao(guild_id, uid)
                arvore_id = colecao_mod.sortear_arvore(progresso, minhas, horoscopo, random)
                if arvore_id is None:
                    break
                dado = db.conceder_fragmento(guild_id, uid, arvore_id)
                dado["arvore"] = arvore_id
                resultados.append(dado)
            return resultados

        return self._tentar("fragmentos", _sortear, padrao=[]) or []

    async def _avisar_fragmentos(self, interaction: discord.Interaction, guild_id: str, fragmentos: list) -> None:
        for dado in fragmentos:
            await _responder_efemero(
                interaction,
                embed=colecao_mod.embed_fragmento(dado["arvore"], dado["quantidade"], dado["paginas_total"]),
                followup=True,
            )
        if fragmentos and fragmentos[-1]["paginas_total"] >= colecao_mod.TOTAL_PAGINAS and fragmentos[-1]["completa"]:
            epilogo = colecao_mod.EPILOGO
            if epilogo.get("texto"):
                await _responder_efemero(
                    interaction,
                    embed=discord.Embed(
                        title=f"📜 {epilogo.get('titulo', 'Crônicas do Jardim')}: {epilogo.get('subtitulo', '')}".strip(": "),
                        description=epilogo["texto"],
                        colour=0xC9C4D6,
                    ),
                    followup=True,
                )
            await self._anunciar_cronista(guild_id, interaction.user)

    async def _anunciar_cronista(self, guild_id: str, usuario) -> None:
        """Aviso público (sem o texto das páginas) de quem completou as dez."""
        try:
            canal_id = self.bot.db.get_canal_categoria(guild_id, "noticia")
            if not canal_id:
                return
            await publicacoes.publicar_ou_enfileirar(
                self.bot,
                guild_id=guild_id,
                embed=colecao_mod.embed_cronista(usuario.mention),
                origem="cronista",
                dedupe_key=f"cronista:{usuario.id}",
                categoria="noticia",
                canal_id=str(canal_id),
                automacao="colecao",
                mencoes="usuarios",
            )
        except Exception:
            log.exception("baus: falha ao anunciar o Cronista do Jardim")

    def _devolver_chave(self, guild_id: str, usuario_id: str) -> None:
        self._tentar("devolver chave", self.bot.db.conceder_chave, guild_id, usuario_id, 1)

    def _sorteou_chave(self, guild_id: str, usuario_id: str, raridade: str, coletivo: bool) -> bool:
        """Brinde: quem vence a corrida de um baú Raro+ leva uma Chave; quem
        pega o seu num baú coletivo tem uma chance. Respeita o limite do estoque."""
        if coletivo:
            ganhou = random.random() < loot_mod.CHANCE_CHAVE_COLETIVO.get(raridade, 0)
        else:
            ganhou = loot_mod.chave_cai_na_corrida(raridade)
        if not ganhou:
            return False
        entrou = self._tentar("conceder chave", self.bot.db.conceder_chave, guild_id, usuario_id, 1, padrao=0)
        return bool(entrou)

    async def _avisar_chave_achada(self, interaction: discord.Interaction) -> None:
        await _responder_efemero(
            interaction,
            "🗝️ Você achou uma **Chave do Jardim**! Ela é gasta sozinha no próximo baú Incomum ou melhor "
            "(+50% de Lunaris e um item extra). Ver ou desligar: `/banco`, seção Chaves.",
            followup=True,
        )

    def _pesos_e_tipos(self, guild_id: str, canal_id: str, raridade: str, *, acima: bool = False):
        info = economia.estacao_info(self.bot.db.get_estacao(guild_id))
        alvo = loot_mod.raridade_acima(raridade) if acima else raridade
        pesos = loot_mod.pesos_itens_do_bau(alvo, info["pesos"])
        tema = self.bot.db.get_bau_canal_tema(guild_id, str(canal_id))
        tipos = [tema] if tema and tema in loot_mod.TIPOS_PERMITIDOS_BAU else None
        return pesos, tipos

    async def abrir_bau_click(self, interaction: discord.Interaction, token: str) -> None:
        """Ponto de entrada único dos dois fluxos (baú normal e baú com
        enigma, após acertar): busca o estado em `baus_no_ar` — se não achar,
        o baú já foi reivindicado por outra pessoa ou expirou.

        O clique é confirmado ao Discord ANTES de qualquer consulta ao banco:
        o Discord só espera 3s por uma resposta, e as consultas são síncronas.
        Com o banco lento, quem clicava via "Algo deu errado" mesmo com o baú
        livre. Depois do defer, toda resposta sai pelo followup."""
        try:
            await interaction.response.defer(ephemeral=True, thinking=True)
        except discord.HTTPException:
            return

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
                    followup=True,
                )
                await self.atualizar_mensagem_entrega(
                    entrega_existente, resultado, view=_view_bau_resolvido(bool(resultado.get("confirmado")))
                )
                return
            await _responder_efemero(interaction, "Esse baú não está mais disponível.", followup=True)
            return

        if ((row.get("premio") or {}).get("bau") or {}).get("coletivo"):
            await self._coletar(interaction, row)
            return
        await self._resolver_abertura(interaction, row)

    async def _processar_e_responder(self, interaction: discord.Interaction, entrega: dict) -> dict:
        """Entrega o prêmio (com a mesma tolerância a falhas dos dois fluxos)
        e responde ao jogador em privado."""
        guild_id = str(entrega["guild_id"])
        mensagem_id = str(entrega["mensagem_id"])
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
        return resultado

    async def _resolver_abertura(self, interaction: discord.Interaction, row: dict) -> None:
        guild_id = str(row["guild_id"])
        mensagem_id = str(row["mensagem_id"])
        token = row["token"]
        premio = row["premio"]
        usuario_id = str(interaction.user.id)

        premio_final, bonus_horoscopo = premio, False
        if isinstance(interaction.user, discord.Member):
            premio_final, bonus_horoscopo = self.aplicar_bonus_horoscopo(guild_id, interaction.user, premio)
        if bonus_horoscopo:
            await _responder_efemero(
                interaction,
                "🌟 O Horóscopo do Jardim está com você hoje: Lunaris em dobro nesse baú!",
                followup=True,
            )

        # Pistas de Sorte: bônus de quem já tentou e não levou outros baús.
        pistas = int(self._tentar("ler pistas", self.bot.db.get_pistas, guild_id, usuario_id, padrao=0) or 0)
        if pistas > 0:
            def _com_pistas():
                raridade = (premio.get("bau") or {}).get("raridade") or "comum"
                pesos, tipos = self._pesos_e_tipos(guild_id, row["canal_id"], raridade, acima=True)
                bonificado = loot_mod.aplicar_pistas_ao_premio(
                    premio_final, pistas, self.bot.catalogo, pesos=pesos, tipos=tipos
                )
                return serializar_premio_bau(bonificado)

            premio_final = self._tentar("aplicar pistas", _com_pistas, padrao=premio_final)

        raridade_bau = (premio.get("bau") or {}).get("raridade") or "comum"
        premio_final, usou_chave = self._usar_chave(
            guild_id, usuario_id, row["canal_id"], raridade_bau, premio_final
        )
        premio_final = self._aplicar_afinidade(guild_id, interaction.user, premio_final)

        try:
            entrega = self.bot.db.registrar_bau_entrega_pendente(
                guild_id,
                mensagem_id,
                str(row["canal_id"]),
                usuario_id,
                premio_final,
                "plataforma" if self.bot.platform is not None else "legado",
            )
        except Exception:
            log.exception("falha ao registrar vencedor do bau %s", mensagem_id)
            if usou_chave:
                self._devolver_chave(guild_id, usuario_id)
            await _responder_efemero(
                interaction, "⚠️ Não consegui registrar o vencedor. Tente de novo.", followup=True
            )
            return

        # O baú sai do ar assim que alguém reivindica (com sucesso ou não: se
        # "nova" vier False é porque outra pessoa já tinha travado antes, e
        # `baus_entregas` já é a fonte da verdade a partir daqui).
        self.bot.db.remover_bau_no_ar(token)

        if not entrega.get("nova"):
            if usou_chave:  # outra pessoa levou antes: a Chave volta
                self._devolver_chave(guild_id, usuario_id)
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

        # Venceu: gasta as Pistas, registra no histórico e dá a Pista de
        # consolo para quem tentou o enigma e perdeu.
        if pistas > 0:
            self._tentar("consumir pistas", self.bot.db.consumir_pistas, guild_id, usuario_id, pistas)
        self._tentar("historico aberto", self.bot.db.marcar_bau_historico_aberto, guild_id, mensagem_id, usuario_id)
        self._tentar(
            "pistas de consolo", self.bot.db.conceder_pistas_aos_que_tentaram,
            guild_id, mensagem_id, usuario_id,
        )

        ganhou_chave = self._sorteou_chave(guild_id, usuario_id, raridade_bau, coletivo=False)
        fragmentos = self._sortear_fragmentos(guild_id, interaction.user, raridade_bau, coletivo=False)
        resultado = await self._processar_e_responder(interaction, entrega)
        if ganhou_chave:
            await self._avisar_chave_achada(interaction)
        await self._avisar_fragmentos(interaction, guild_id, fragmentos)
        await self.atualizar_mensagem_entrega(
            entrega, resultado, view=_view_bau_resolvido(bool(resultado.get("confirmado")))
        )
        await self.atualizar_mural(guild_id)

    async def _coletar(self, interaction: discord.Interaction, row: dict) -> None:
        """Baú coletivo (Comum e Incomum): cada pessoa pega o seu, uma vez."""
        guild_id = str(row["guild_id"])
        mensagem_id = str(row["mensagem_id"])
        usuario_id = str(interaction.user.id)
        premio_base = row["premio"] or {}
        bau_info = dict(premio_base.get("bau") or {})
        params = dict(premio_base.get("coletivo") or {})
        raridade = bau_info.get("raridade") or "comum"

        pistas = int(self._tentar("ler pistas", self.bot.db.get_pistas, guild_id, usuario_id, padrao=0) or 0)
        pesos_bonus = None
        if pistas > 0:
            pesos_bonus = self._tentar(
                "pesos das pistas",
                lambda: self._pesos_e_tipos(guild_id, row["canal_id"], raridade, acima=True)[0],
            )
        individual = loot_mod.sortear_premio_coletivo(
            self.bot.catalogo, params, pesos_bonus=pesos_bonus, pistas=pistas
        )
        individual["bau"] = bau_info
        individual, usou_chave = self._usar_chave(
            guild_id, usuario_id, row["canal_id"], raridade, serializar_premio_bau(individual)
        )
        premio_final, bonus_horoscopo = individual, False
        if isinstance(interaction.user, discord.Member):
            premio_final, bonus_horoscopo = self.aplicar_bonus_horoscopo(guild_id, interaction.user, individual)
        premio_final = self._aplicar_afinidade(guild_id, interaction.user, premio_final)
        premio_final = serializar_premio_bau(premio_final)
        if bonus_horoscopo:
            await _responder_efemero(
                interaction,
                "🌟 O Horóscopo do Jardim está com você hoje: Lunaris em dobro nesse baú!",
                followup=True,
            )

        try:
            entrega = self.bot.db.registrar_bau_entrega_pendente(
                guild_id,
                chave_coleta(mensagem_id, usuario_id),
                str(row["canal_id"]),
                usuario_id,
                premio_final,
                "plataforma" if self.bot.platform is not None else "legado",
            )
        except Exception:
            log.exception("falha ao registrar coleta do bau %s", mensagem_id)
            if usou_chave:
                self._devolver_chave(guild_id, usuario_id)
            await _responder_efemero(
                interaction, "⚠️ Não consegui registrar sua coleta. Tente de novo.", followup=True
            )
            return

        if not entrega.get("nova"):
            if usou_chave:
                self._devolver_chave(guild_id, usuario_id)
            await _responder_efemero(
                interaction, "ℹ️ Você já pegou o seu desse baú. Fique de olho no próximo!", followup=True
            )
            return

        if pistas > 0:
            self._tentar("consumir pistas", self.bot.db.consumir_pistas, guild_id, usuario_id, pistas)
        coletas = self._tentar(
            "contar coleta", self.bot.db.registrar_coleta_historico, guild_id, mensagem_id, padrao=0
        )

        ganhou_chave = self._sorteou_chave(guild_id, usuario_id, raridade, coletivo=True)
        fragmentos = self._sortear_fragmentos(guild_id, interaction.user, raridade, coletivo=True)
        await self._processar_e_responder(interaction, entrega)
        if ganhou_chave:
            await self._avisar_chave_achada(interaction)
        await self._avisar_fragmentos(interaction, guild_id, fragmentos)
        await self._atualizar_contador_coletivo(row, coletas)
        await self.atualizar_mural(guild_id)

    async def _atualizar_contador_coletivo(self, row: dict, coletas: int) -> None:
        guild = self.bot.get_guild(int(row["guild_id"]))
        canal = guild.get_channel(int(row["canal_id"])) if guild else None
        if not isinstance(canal, discord.TextChannel):
            return
        # Lê o total mais recente: cliques simultâneos não podem fazer uma
        # edição antiga sobrescrever um número maior.
        historico = self._tentar(
            "ler historico", self.bot.db.get_bau_historico, str(row["guild_id"]), str(row["mensagem_id"])
        )
        if historico:
            coletas = int(historico.get("coletas") or coletas)
        try:
            mensagem = await canal.fetch_message(int(row["mensagem_id"]))
            if not mensagem.embeds:
                return
            emb = mensagem.embeds[0]
            nome = "👥 Já pegaram"
            for i, campo in enumerate(emb.fields):
                if campo.name == nome:
                    emb.set_field_at(i, name=nome, value=str(coletas), inline=False)
                    break
            else:
                emb.add_field(name=nome, value=str(coletas), inline=False)
            await mensagem.edit(embed=emb)
        except (discord.HTTPException, ValueError):
            log.info("nao consegui atualizar o contador do bau coletivo %s", row["mensagem_id"])

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
        sorte = resultado.get("sorte") or {}
        nota_sorte = ""
        if sorte.get("pistas"):
            n = int(sorte["pistas"])
            nota_sorte = (
                f"\n\n🍀 {n} Pista{'s' if n > 1 else ''} de Sorte virou bônus: "
                f"+{round(loot_mod.PISTA_BONUS_LUNARIS * n * 100)}% de Lunaris"
                + (" e um item extra." if sorte.get("item_extra") else ".")
            )
        afinidade = resultado.get("afinidade") or {}
        if afinidade:
            nota_sorte += (
                f"\n\n🌿 Afinidade com {afinidade.get('nome') or 'sua Árvore'}: "
                f"+{int(afinidade.get('bonus') or 0)}% de Lunaris."
            )
        if (resultado.get("chave") or {}):
            nota_sorte += (
                "\n\n🗝️ Uma Chave do Jardim abriu o fundo falso: "
                f"+{round(loot_mod.CHAVE_BONUS_LUNARIS * 100)}% de Lunaris"
                + (" e um item extra." if resultado["chave"].get("item_extra") else ".")
            )
        return discord.Embed(
            title=f"{perfil['emoji']} {nome_bau} {'pego' if bau.get('coletivo') else 'aberto'}!",
            description=(
                f"<@{vencedor_user_id}> {'pegou o seu do baú' if bau.get('coletivo') else 'abriu o baú'} e achou:\n"
                + "\n".join(
                    f"• {ganho}" for ganho in resultado.get("ganhos") or []
                )
                + f"\n\nEntregue na **{destino}**."
                + nota_sorte
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
        if eh_chave_de_coleta(entrega["mensagem_id"]):
            return  # coleta individual de baú coletivo: a mensagem é de todos
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
                # O próximo cai na faixa seguinte do dia (ou amanhã cedo).
                self._reagendar(cfg, apos_drop=True)
            else:
                # Canal apagado ou permissão temporariamente ausente não deve
                # consumir o evento do dia inteiro. Tenta de novo mais tarde,
                # sem repetir a cada minuto.
                nova_tentativa = agora + timedelta(minutes=RETRY_DROP_MINUTOS)
                self.bot.db.set_proximo_drop(
                    cfg["guild_id"], nova_tentativa.isoformat()
                )

    def _reagendar(self, cfg: dict, *, apos_drop: bool = False):
        prox = loot_mod.agendar_proximo_bau(
            cfg["min_hora"], cfg["max_hora"],
            cfg.get("baus_por_dia", loot_mod.BAUS_POR_DIA_PADRAO),
            rng=random, apos_drop=apos_drop,
        )
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
        bau_info = (row.get("premio") or {}).get("bau") or {}
        coletivo = bool(bau_info.get("coletivo"))
        # Se já foi reivindicado e só a linha de controle não foi apagada (uma
        # falha bem no meio, entre registrar a entrega e remover_bau_no_ar),
        # não pode sobrescrever o embed de sucesso com "baú desapareceu".
        # (No baú coletivo as entregas têm chave própria por pessoa.)
        if not coletivo and self.bot.db.get_bau_entrega(guild_id, mensagem_id) is not None:
            return
        self._tentar("historico expirado", self.bot.db.marcar_bau_historico_expirado, guild_id, mensagem_id)
        # Quem tentou o enigma e o baú sumiu ganha a Pista de Sorte de consolo.
        tentaram = self._tentar(
            "pistas de consolo", self.bot.db.conceder_pistas_aos_que_tentaram,
            guild_id, mensagem_id, None, padrao=[],
        ) or []
        try:
            await self._editar_mensagem_expirada(row, bau_info, coletivo, len(tentaram))
        finally:
            await self.atualizar_mural(guild_id)

    async def _editar_mensagem_expirada(self, row: dict, bau_info: dict, coletivo: bool, tentaram: int) -> None:
        guild_id, mensagem_id = str(row["guild_id"]), str(row["mensagem_id"])
        guild = self.bot.get_guild(int(guild_id))
        if guild is None:
            return
        canal = guild.get_channel(int(row["canal_id"]))
        if not isinstance(canal, discord.TextChannel):
            return
        trancado = bool(row.get("enigma_pergunta"))
        nome_bau = str(bau_info.get("nome") or "Baú")
        pegaram = 0
        if coletivo:
            historico = self._tentar("ler historico", self.bot.db.get_bau_historico, guild_id, mensagem_id)
            pegaram = int((historico or {}).get("coletas") or 0)
        if coletivo and pegaram > 0:
            emb = ui.embed(
                f"🍃 O {nome_bau} foi encerrado",
                categoria="bau",
                descricao=(
                    f"**{pegaram}** {'pessoa pegou' if pegaram == 1 else 'pessoas pegaram'} o seu. "
                    "O que sobrou o Jardim levou de volta."
                ),
            )
            view = _view_bau_encerrado()
        else:
            emb = ui.embed(
                f"🍂 O {nome_bau} trancado desapareceu" if trancado else f"🍂 O {nome_bau} desapareceu",
                categoria="bau",
                descricao=(
                    "Ninguém acertou o enigma a tempo. O Jardim levou o mistério de volta."
                    if trancado
                    else "Ninguém chegou a tempo. O Jardim levou o mistério de volta."
                )
                + (
                    f"\n\n🍀 {tentaram} {'pessoa tentou' if tentaram == 1 else 'pessoas tentaram'} "
                    "o enigma e ganhou uma Pista de Sorte para o próximo baú."
                    if tentaram
                    else ""
                ),
            )
            view = _view_bau_desaparecido()
        try:
            mensagem = await canal.fetch_message(int(mensagem_id))
            await mensagem.edit(embed=emb, view=view)
        except discord.HTTPException:
            pass

    # ── Mural do dia ──────────────────────────────────────────────────────
    @staticmethod
    def embed_mural(
        baus: list, pistas: Optional[int] = None, chaves: Optional[dict] = None,
        ranking: Optional[list] = None,
    ) -> discord.Embed:
        """Lista os baús lançados hoje: quando, de que tipo e como terminaram."""
        linhas = []
        for b in baus:
            perfil = loot_mod.perfil_bau(str(b.get("raridade") or "comum"))
            hora = f"<t:{int(b['criado_em'].timestamp())}:t>"
            link = f"https://discord.com/channels/{b['guild_id']}/{b['canal_id']}/{b['mensagem_id']}"
            if b["status"] == "no_ar":
                estado = f"no ar até <t:{int(b['expira_em'].timestamp())}:t> · [ir ao baú]({link})"
            elif b["status"] == "aberto" and b.get("coletivo"):
                n = int(b.get("coletas") or 0)
                estado = f"{n} {'pegou' if n == 1 else 'pegaram'}"
            elif b["status"] == "aberto":
                estado = f"aberto por <@{b['vencedor_user_id']}>"
            else:
                estado = "desapareceu"
            linhas.append(f"{perfil['emoji']} {hora} · **{b['nome']}** · {estado}")
        emb = ui.embed(
            "🗺️ Achados de hoje",
            categoria="bau",
            descricao="\n".join(linhas)[:4000] if linhas else "Nenhum baú apareceu ainda hoje.",
        )
        if ranking:
            medalhas = ("🥇", "🥈", "🥉")
            emb.add_field(
                name="🏆 Caçadores de baú do mês",
                value="\n".join(
                    f"{medalhas[i] if i < 3 else f'**{i + 1}.**'} <@{c['user_id']}> · {c['baus']} baú(s)"
                    for i, c in enumerate(ranking[:5])
                ),
                inline=False,
            )
        if pistas:
            emb.add_field(
                name="🍀 Suas Pistas de Sorte",
                value=(
                    f"**{pistas}** (máx. {loot_mod.PISTAS_MAX}). Valem bônus de Lunaris e chance de item "
                    "extra no próximo baú que você levar."
                ),
                inline=False,
            )
        if chaves and chaves.get("quantidade"):
            emb.add_field(
                name="🗝️ Suas Chaves do Jardim",
                value=(
                    f"**{chaves['quantidade']}**. Uma é gasta sozinha no próximo baú Incomum ou melhor "
                    "(+50% de Lunaris e um item extra)."
                    + ("" if chaves.get("auto_usar") else " O uso automático está desligado.")
                ),
                inline=False,
            )
        emb.set_footer(text=f"{ui.MARCA} · Comum e Incomum: cada um pega o seu · Raro+: corrida do enigma")
        return emb

    def _ranking_do_mes(self, guild_id: str) -> list:
        return self._tentar(
            "ranking de cacadores",
            lambda gid: self.bot.db.ranking_cacadores(gid, inicio_do_mes(datetime.now(timezone.utc)), 5),
            guild_id, padrao=[],
        ) or []

    async def atualizar_mural(self, guild_id: str) -> None:
        """Mantém uma mensagem por dia no canal do mural. Nunca levanta:
        o mural é um extra e não pode atrapalhar um baú."""
        try:
            cfg = self.bot.db.get_baus_config(guild_id)
            canal_id = cfg.get("mural_canal_id")
            if not canal_id:
                return
            guild = self.bot.get_guild(int(guild_id))
            canal = guild.get_channel(int(canal_id)) if guild else None
            if not isinstance(canal, discord.TextChannel) or not _canal_aceita_bau(canal):
                return
            emb = self.embed_mural(
                self.bot.db.listar_baus_do_dia(guild_id), ranking=self._ranking_do_mes(guild_id)
            )
            mural = self.bot.db.get_bau_mural(guild_id)
            if mural and mural.get("de_hoje") and str(mural["canal_id"]) == str(canal_id):
                try:
                    mensagem = await canal.fetch_message(int(mural["mensagem_id"]))
                    await mensagem.edit(embed=emb)
                    return
                except discord.NotFound:
                    pass  # apagaram a mensagem: publica uma nova
                except discord.HTTPException:
                    return
            mensagem = await canal.send(embed=emb, allowed_mentions=discord.AllowedMentions.none())
            self.bot.db.set_bau_mural(guild_id, str(canal.id), str(mensagem.id))
        except Exception:
            log.exception("baus: falha ao atualizar o mural (guild %s)", guild_id)

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
        festival = bool(self._tentar("festival", self.bot.db.festival_ativo, cfg["guild_id"], padrao=False))
        especial = info_estacao.get("tipo") == "especial" or festival
        if raridade_forcada in loot_mod.BAU_RARIDADES:
            raridade_bau = raridade_forcada
        else:
            raridade_bau = loot_mod.sortear_raridade_bau(random, evento_especial=especial)
            # Proteção de azar: depois de uma sequência de baús fracos, o
            # próximo sai pelo menos Raro.
            sem_bom = self._tentar(
                "contar baus sem bom", self.bot.db.contar_baus_sem_bom, cfg["guild_id"], padrao=0
            )
            raridade_bau = loot_mod.aplicar_protecao_de_azar(raridade_bau, int(sem_bom or 0))
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
        # Comum e Incomum são coletivos (cada um pega o seu); o Sombrio e do
        # Raro para cima continuam sendo corrida.
        coletivo = loot_mod.eh_coletivo(raridade_bau) and tema != "sombrio"

        # Baú Sombrio: loot especial com Créditos Sombrios
        if tema == "sombrio":
            premio = loot_mod.sortear_bau_sombrio(
                self.bot.catalogo,
                qtd_itens=max(2, qtd),
                rng=random,
                raridade_bau=raridade_bau,
            )
        elif coletivo:
            # O prêmio é sorteado por pessoa, na hora de pegar.
            premio = {"lunaris": 0, "itens": [], "creditos_sombrios": 0}
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
        if coletivo:
            premio["bau"]["coletivo"] = True
        premio_serializado = serializar_premio_bau(premio)
        if coletivo:
            premio_serializado["coletivo"] = {
                "lunaris_min": parametros["lunaris_min"],
                "lunaris_max": parametros["lunaris_max"],
                "chance_item": perfil.get("chance_item", 0),
                "pesos_itens": pesos_itens,
                "tipos": tipos,
            }
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
            elif coletivo:
                view = _view_bau_abrir(self, token, coletivo=True)
                titulo = f"{emoji_estacao} {perfil['emoji']} {perfil['nome']} surgiu!"
                descricao = (
                    f"_{info_estacao.get('descricao', '')}_\n\n"
                    "As folhas se afastam e revelam um tesouro. "
                    "**Tem para todo mundo: cada pessoa pega o seu.**"
                )
                cor_embed = perfil["cor"]
                rodape_acao = "Cada um pega o seu"
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
        elif coletivo:
            chance = round(float(perfil.get("chance_item", 0)) * 100)
            emb.add_field(
                name="🎁 O que cada pessoa pode achar",
                value=(
                    f"**{parametros['lunaris_min']} a {parametros['lunaris_max']} Lunaris** e "
                    f"**{chance}% de chance de um item**."
                    + (f" Tema do canal: **{tema}**." if tema else "")
                ),
                inline=False,
            )
            emb.add_field(name="👥 Já pegaram", value="0", inline=False)
        else:
            emb.add_field(
                name="🎁 O que pode haver dentro",
                value=(
                    f"**{parametros['lunaris_min']} a {parametros['lunaris_max']} Lunaris** e "
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
        if festival:
            emb.add_field(
                name="🎉 Festival do Jardim",
                value="A mesa bateu a meta do Cofre! Enquanto durar o festival, a chance de baús e itens raros está **muito acima do normal**.",
                inline=False,
            )
        elif especial:
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
        self._tentar(
            "registrar historico", self.bot.db.registrar_bau_historico,
            cfg["guild_id"], str(canal.id), str(mensagem.id), token,
            raridade_bau, perfil["nome"], coletivo, expira_em,
        )
        await self.atualizar_mural(cfg["guild_id"])
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
        baus_por_dia="Quantos baús por dia (1-8): a janela é dividida em faixas, um baú por faixa.",
    )
    async def bau_config(self, interaction: discord.Interaction,
                         canal: discord.TextChannel = None, ativo: bool = None,
                         min_hora: app_commands.Range[int, 0, 23] = None,
                         max_hora: app_commands.Range[int, 0, 23] = None,
                         itens_por_bau: app_commands.Range[int, 1, 5] = None,
                         lunaris_min: app_commands.Range[int, 0] = None,
                         lunaris_max: app_commands.Range[int, 0] = None,
                         baus_por_dia: app_commands.Range[int, 1, 8] = None):
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
        if baus_por_dia is not None:
            self.bot.db.set_baus_por_dia(gid, baus_por_dia)
        cfg = self.bot.db.get_baus_config(gid)
        canais = self.bot.db.listar_baus_canais(gid)
        mudou_agenda = any(v is not None for v in (min_hora, max_hora, baus_por_dia))
        if cfg["ativo"] and canais and (mudou_agenda or not cfg.get("proximo_drop")):
            # Janela ou quantidade mudaram: o horário já sorteado pode estar
            # fora das novas faixas.
            self._reagendar(cfg)
            cfg = self.bot.db.get_baus_config(gid)

        canal_txt = " · ".join(f"<#{canal_id}>" for canal_id in canais) or "Nenhum canal"
        await interaction.response.send_message(
            f"🎁 **Baús:** {'ligados ✅' if cfg['ativo'] else 'desligados ⛔'}\n"
            f"Canais da rotação: {canal_txt}\n"
            f"Janela: {cfg['min_hora']}h–{cfg['max_hora']}h · "
            f"**{cfg.get('baus_por_dia', loot_mod.BAUS_POR_DIA_PADRAO)} baú(s) por dia**, um por faixa · "
            f"{cfg['itens_por_bau']} item(ns) de base\n"
            f"Lunaris-base: {cfg['lunaris_min']}–{cfg['lunaris_max']}\n"
            "Raridades automáticas: **Comum, Incomum, Raro, Épico, Lendário e "
            "Mítico**. Comum e Incomum são coletivos (cada um pega o seu); Raro ou "
            "superior vem trancado e é uma corrida: a dificuldade e a recompensa "
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
        name="bau_mural",
        description="[Mestre] Define o canal do mural \"Achados de hoje\" (vazio desliga).",
    )
    @app_commands.default_permissions(manage_guild=True)
    @app_commands.checks.has_permissions(manage_guild=True)
    @app_commands.describe(canal="Canal onde o mural do dia é mantido; deixe vazio para desligar.")
    async def bau_mural(
        self, interaction: discord.Interaction, canal: Optional[discord.TextChannel] = None
    ):
        gid = str(interaction.guild_id)
        if canal is None:
            self.bot.db.set_bau_mural_canal(gid, None)
            await interaction.response.send_message("✅ Mural dos baús desligado.", ephemeral=True)
            return
        if not _canal_aceita_bau(canal):
            await interaction.response.send_message(
                "⚠️ Preciso de **Ver canal**, **Enviar mensagens** e **Inserir links** nesse canal.",
                ephemeral=True,
            )
            return
        self.bot.db.set_bau_mural_canal(gid, str(canal.id))
        await interaction.response.defer(ephemeral=True)
        await self.atualizar_mural(gid)
        await interaction.followup.send(
            f"✅ O mural \"Achados de hoje\" agora fica em {canal.mention} e é atualizado a cada baú.",
            ephemeral=True,
        )

    @app_commands.command(
        name="baus_hoje",
        description="Mostra os baús de hoje e as suas Pistas de Sorte.",
    )
    @app_commands.guild_only()
    async def baus_hoje(self, interaction: discord.Interaction):
        gid = str(interaction.guild_id)
        baus = self._tentar("listar baus do dia", self.bot.db.listar_baus_do_dia, gid, padrao=[]) or []
        pistas = int(
            self._tentar("ler pistas", self.bot.db.get_pistas, gid, str(interaction.user.id), padrao=0) or 0
        )
        chaves = self._tentar(
            "ler chaves", self.bot.db.get_chaves, gid, str(interaction.user.id), padrao=None
        )
        await interaction.response.send_message(
            embed=self.embed_mural(baus, pistas, chaves, self._ranking_do_mes(gid)), ephemeral=True,
            allowed_mentions=discord.AllowedMentions.none(),
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
                f"{entrega['canal_id']}/{id_da_mensagem(entrega['mensagem_id'])}"
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
        if not re.fullmatch(r"\d+(:\d+)?", mensagem_id):
            await interaction.response.send_message(
                "⚠️ Informe o ID numérico da mensagem do baú (ou `mensagem:usuario` "
                "para a coleta de alguém num baú coletivo, como mostra /bau_pendentes).",
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
