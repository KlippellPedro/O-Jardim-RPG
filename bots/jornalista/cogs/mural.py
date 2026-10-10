"""Cog Mural: o quadro fixo de Procurados do Jardim.

Em vez de uma enxurrada de avisos a cada recompensa, o Jornalista mantém UMA
mensagem no canal escolhido (`/jornal canal` categoria Mural de Procurados) e a
edita no lugar quando as recompensas mudam. As recompensas são do Banqueiro
(tabela `recompensa`); o selo 🏦 marca quem o próprio Banco procura por dívida."""

from __future__ import annotations

import hashlib
import logging
from typing import Optional

import discord
from discord.ext import commands, tasks

from core import ui
from core.tasks_util import registrar_reinicio_em_erro

log = logging.getLogger("jornalista")

MURAL_CATEGORIA = "procurados"
MURAL_AUTOMACAO = "mural_procurados"
MURAL_LIMITE = 10


def montar_mural(procurados: list[dict]) -> discord.Embed:
    """Cartaz de procurados. Função pura sobre as linhas de `listar_recompensas`."""
    if not procurados:
        corpo = "Ninguém tem recompensa na cabeça. O Jardim está em paz, por enquanto."
    else:
        linhas = []
        for posicao, alvo in enumerate(procurados[:MURAL_LIMITE], start=1):
            selo = " 🏦" if alvo.get("tem_sistema") else ""
            linhas.append(f"**{posicao}.** <@{alvo['alvo_user_id']}> · ☾ **{alvo['valor']}**{selo}")
        corpo = "\n".join(linhas) + "\n\n🏦 = procurado pelo Banco Lunar por dívida."
    emb = ui.embed("🎯 Procurados do Jardim", categoria="procurado", descricao=corpo)
    return emb


def assinatura(procurados: list[dict]) -> str:
    """Resumo estável do quadro: só edita a mensagem se isto mudar."""
    bruto = "|".join(
        f"{p['alvo_user_id']}:{p['valor']}:{int(bool(p.get('tem_sistema')))}" for p in procurados[:MURAL_LIMITE]
    )
    return hashlib.sha1(bruto.encode("utf-8")).hexdigest()


class Mural(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot
        registrar_reinicio_em_erro(self.ciclo, "ciclo_mural", log)
        self.ciclo.start()

    def cog_unload(self):
        self.ciclo.cancel()

    @tasks.loop(minutes=5)
    async def ciclo(self):
        for guild in list(self.bot.guilds):
            try:
                await self.atualizar_guild(guild)
            except Exception:
                log.exception("erro ao atualizar o mural de procurados (guild %s)", guild.id)

    @ciclo.before_loop
    async def _antes(self):
        await self.bot.wait_until_ready()

    async def atualizar_guild(self, guild) -> Optional[str]:
        """Devolve 'criado', 'editado', 'igual' ou None (mural desligado/sem canal)."""
        db = self.bot.db
        gid = str(guild.id)
        canal_id = db.canal_exato_categoria(gid, MURAL_CATEGORIA)
        if not canal_id or not db.automacao_ativa(gid, MURAL_AUTOMACAO, True):
            return None
        canal = guild.get_channel(int(canal_id))
        if not isinstance(canal, discord.TextChannel):
            return None
        procurados = db.listar_procurados(gid, MURAL_LIMITE)
        marca = assinatura(procurados)
        estado = db.get_mural_procurados(gid)
        if estado and estado["canal_id"] == str(canal.id) and estado["assinatura"] == marca:
            return "igual"
        emb = montar_mural(procurados)
        if estado and estado["canal_id"] == str(canal.id) and estado["mensagem_id"]:
            try:
                mensagem = await canal.fetch_message(int(estado["mensagem_id"]))
                await mensagem.edit(embed=emb)
                db.salvar_mural_procurados(gid, str(canal.id), str(mensagem.id), marca)
                return "editado"
            except discord.NotFound:
                pass  # a mensagem foi apagada: publica outra
            except discord.HTTPException:
                log.warning("nao consegui editar o mural de procurados (guild %s)", gid)
                return None
        try:
            mensagem = await canal.send(embed=emb, allowed_mentions=discord.AllowedMentions.none())
        except discord.HTTPException:
            log.warning("nao consegui publicar o mural de procurados (guild %s)", gid)
            return None
        db.salvar_mural_procurados(gid, str(canal.id), str(mensagem.id), marca)
        return "criado"


async def setup(bot: commands.Bot):
    await bot.add_cog(Mural(bot))
