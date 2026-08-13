"""Cog Avisos: publica no canal de dinheiro os avisos que o Banqueiro
enfileira (recompensas, procurados, quitações e eventos econômicos).
O Banqueiro só escreve na fila (`avisos_pendentes`); quem publica é sempre
o Jornalista, pra manter a separação: Banqueiro cuida de dinheiro, Jornalista
anuncia pro servidor. Sem rota específica, usa o canal principal do jornal.

P14 da auditoria 2026-08: a entrega usava `canal.send` direto, fora da fila
durável (`jornal_publicacoes`) que o resto do bot já usa — sem contagem de
tentativas nem visibilidade em `/jornal fila`. Agora cada aviso pendente é
transferido pra fila durável (`publicacoes.publicar_ou_enfileirar`), que
assume o retry/backoff a partir daí; `marcar_aviso_publicado` só roda depois
que a transferência pra fila é confirmada (não levanta), então uma falha no
enfileiramento em si mantém o aviso pendente pra tentar de novo no próximo
minuto — nunca marca como "publicado" algo que não foi nem aceito pela fila."""

from __future__ import annotations

import logging

import discord
from discord.ext import commands, tasks

from core import publicacoes, ui
from core.tasks_util import registrar_reinicio_em_erro

log = logging.getLogger("jornalista")


class Avisos(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot
        registrar_reinicio_em_erro(self.ciclo, "ciclo_avisos", log)
        self.ciclo.start()

    def cog_unload(self):
        self.ciclo.cancel()

    @tasks.loop(minutes=1)
    async def ciclo(self):
        db = self.bot.db
        for guild_id in db.listar_guilds_com_aviso_pendente():
            try:
                await self._publicar_guild(guild_id)
            except Exception:
                log.exception("erro ao publicar avisos (guild %s)", guild_id)

    @ciclo.before_loop
    async def _antes_do_ciclo(self):
        await self.bot.wait_until_ready()

    async def _publicar_guild(self, guild_id: str):
        db = self.bot.db
        if not db.automacao_ativa(guild_id, "avisos_economicos", True):
            return
        canal_id = db.get_canal_categoria(guild_id, "dinheiro")
        if not canal_id:
            return
        canal = self.bot.get_channel(int(canal_id))
        if canal is None:
            return
        for aviso in db.listar_avisos_pendentes(guild_id):
            # A mensagem já vem pronta do Banqueiro (recompensa, procurado,
            # dívida quitada, leilão...) sem categoria estruturada — usa a
            # cor neutra do design system em vez de laranja fixo pra tudo.
            emb = ui.embed("", categoria="noticia", descricao=aviso["mensagem"])
            emb.title = None
            try:
                await publicacoes.publicar_ou_enfileirar(
                    self.bot,
                    guild_id=guild_id,
                    embed=emb,
                    origem="aviso_economico",
                    dedupe_key=f"aviso:{aviso['id']}",
                    categoria="dinheiro",
                    canal_id=str(canal.id) if isinstance(canal, discord.TextChannel) else None,
                    automacao="avisos_economicos",
                )
            except Exception:
                log.exception("falha ao enfileirar aviso %s (guild %s)", aviso["id"], guild_id)
                continue
            # A partir daqui a fila durável assume entrega/retry: marcar como
            # "publicado" aqui significa "transferido pra fila", igual já
            # acontece com baú/loteria — não "chegou no Discord".
            db.marcar_aviso_publicado(aviso["id"])


async def setup(bot: commands.Bot):
    await bot.add_cog(Avisos(bot))
