"""Cog Eventos: os dois compromissos fixos da semana do Banco Lunar.

- Leilão do Jardim (sábado à noite): a casa leiloa um item bom por 24h. O
  dinheiro do lance some (ralo da economia) e o item vai pro vencedor.
- Dia de Bolsa (quarta ao meio-dia): por 24h os Títulos rendem mais (ou menos)
  ou o câmbio fica sem taxa. O humor é sorteado.

Quem decide se hoje é dia é core/eventos.py (puro). Aqui só se confere a trava da
semana no banco, se o servidor deixou o evento ligado (`/jornal automacoes`) e se
cria o evento. Em falha, a trava é devolvida e a próxima volta tenta de novo."""

from __future__ import annotations

import logging
import random
from datetime import datetime, timedelta, timezone
from typing import Optional

import discord
from discord.ext import commands, tasks

from core import economia, eventos
from core.tasks_util import registrar_reinicio_em_erro

log = logging.getLogger("banqueiro")


class Eventos(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        registrar_reinicio_em_erro(self.ciclo, "ciclo_eventos", log)
        self.ciclo.start()

    def cog_unload(self):
        self.ciclo.cancel()

    @tasks.loop(minutes=15)
    async def ciclo(self):
        agora = datetime.now(timezone.utc)
        for guild in list(self.bot.guilds):
            try:
                await self.rodar_guild(guild, agora)
            except Exception:
                log.exception("erro nos eventos recorrentes (guild %s)", guild.id)

    @ciclo.before_loop
    async def _antes(self):
        await self.bot.wait_until_ready()

    async def rodar_guild(self, guild, agora: datetime, rng=random) -> None:
        db = self.bot.db
        gid = str(guild.id)
        semana = eventos.semana_chave(agora)
        if eventos.janela_leilao(agora) and db.automacao_ativa(gid, eventos.AUTOMACAO_LEILAO, True):
            await self._uma_vez(gid, f"evento:leilao:{semana}", lambda: self.abrir_leilao_semanal(guild, agora, rng))
        if eventos.janela_bolsa(agora) and db.automacao_ativa(gid, eventos.AUTOMACAO_BOLSA, True):
            await self._uma_vez(gid, f"evento:bolsa:{semana}", lambda: self.abrir_dia_de_bolsa(gid, rng))

    async def _uma_vez(self, gid: str, chave: str, abrir) -> None:
        if not self.bot.db.reivindicar_ciclo_unico(gid, chave):
            return
        try:
            feito = await abrir()
        except Exception:
            log.exception("falha ao abrir %s (guild %s)", chave, gid)
            feito = False
        if not feito:
            self.bot.db.liberar_ciclo_unico(gid, chave)

    async def abrir_leilao_semanal(self, guild, agora: Optional[datetime] = None, rng=random) -> bool:
        from cogs.mercado import LeilaoView  # evita ciclo na carga dos cogs

        db = self.bot.db
        gid = str(guild.id)
        agora = agora or datetime.now(timezone.utc)
        mercado = self.bot.get_cog("Mercado")
        canal_id = db.canal_do_jornal(gid, "dinheiro")
        canal = guild.get_channel(int(canal_id)) if canal_id else None
        if mercado is None or not isinstance(canal, discord.TextChannel):
            return False
        item = eventos.escolher_item_leilao(self.bot.catalogo, rng)
        if item is None:
            return False

        preco_lunaris = eventos.preco_em_lunaris(item)
        permissoes = canal.permissions_for(guild.me) if getattr(guild, "me", None) is not None else None
        if permissoes is not None and not (permissoes.send_messages and permissoes.embed_links):
            log.warning("sem permissao para postar o leilao semanal no canal %s (guild %s)", canal.id, gid)
            return False
        leilao = db.criar_leilao(
            gid, eventos.LEILAO_VENDEDOR, "item", item.id, item.titulo, "Lunaris",
            eventos.lance_inicial(preco_lunaris), str(canal.id),
            agora + timedelta(hours=eventos.LEILAO_DURACAO_HORAS), eventos.LEILAO_MODO_POSSE,
        )
        emb = mercado._embed_leilao(leilao)
        emb.insert_field_at(
            0, name=f"{item.raridade_rotulo} · {item.tipo}",
            value=(item.descricao[:300] or "Sem descrição.") + "\n*Leilão semanal do Jardim: o item vai pra quem der o maior lance em 24h.*",
            inline=False,
        )
        try:
            mensagem = await canal.send(embed=emb, view=LeilaoView(mercado, leilao["id"]))
        except discord.HTTPException:
            db.encerrar_leilao(leilao["id"], "cancelado")
            log.exception("nao consegui publicar o leilao semanal (guild %s)", gid)
            return False
        try:
            db.set_leilao_mensagem(leilao["id"], str(mensagem.id))
        except Exception:
            # A mensagem já está no ar com o botão (que só precisa do id do leilão). Devolver a trava
            # abriria um segundo leilão na próxima volta; só se perde a edição do cartaz no fim.
            log.exception("leilao semanal %s publicado, mas nao consegui gravar a mensagem", leilao["id"])
        return True

    async def abrir_dia_de_bolsa(self, gid: str, rng=random) -> bool:
        db = self.bot.db
        if db.humor_bolsa_ativo(gid):
            return True  # já há um em vigor (aberto à mão ou na volta anterior)
        humor = eventos.sortear_humor_bolsa(rng)
        info = eventos.HUMORES_BOLSA[humor]
        titulo = f"Dia de Bolsa: {info['titulo']}"
        db.abrir_dia_de_bolsa(
            gid, humor, titulo, str(info["texto"]), eventos.BOLSA_DURACAO_HORAS,
            aviso=f"{info['emoji']} **{titulo}**\n{info['texto']}\nValem as próximas 24h.",
        )
        return True


async def setup(bot):
    await bot.add_cog(Eventos(bot))
