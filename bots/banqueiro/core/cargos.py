"""Sincronização dos cargos dinâmicos do Discord: "Mais Procurado" (quem tem
a maior recompensa ativa) e "Caçador de Recompensas" (temporário, 24h, pra
quem captura um procurado via roubo). Precisa de discord.py de verdade
(mexe com cargos/membros), então fica fora de core/economia.py (que é puro)."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

import discord

from . import economia

log = logging.getLogger("banqueiro")


async def _obter_ou_criar_cargo(guild: discord.Guild, cargo_id, nome: str, cor: int, setter) -> discord.Role | None:
    cargo = guild.get_role(int(cargo_id)) if cargo_id else None
    if cargo is not None:
        return cargo
    try:
        cargo = await guild.create_role(
            name=nome, colour=discord.Colour(cor), reason="Cargo dinâmico automático do Banqueiro",
        )
        setter(str(guild.id), str(cargo.id))
        return cargo
    except discord.Forbidden:
        log.warning("sem permissao pra criar o cargo dinamico '%s' na guild %s", nome, guild.id)
        return None


async def sincronizar_mais_procurado(bot) -> None:
    """Garante que só quem tem a maior recompensa ativa da guild carrega o
    cargo. Idempotente e seguro de chamar com frequência."""
    for guild in bot.guilds:
        gid = str(guild.id)
        db = bot.db
        cargo = await _obter_ou_criar_cargo(
            guild, db.get_cargo_procurado(gid),
            economia.CARGO_MAIS_PROCURADO_PADRAO, 0xE74C3C, db.set_cargo_procurado,
        )
        if cargo is None:
            continue
        top = db.listar_recompensas(gid, limite=1)
        alvo_id = top[0]["alvo_user_id"] if top else None
        for membro in list(cargo.members):
            if str(membro.id) != alvo_id:
                try:
                    await membro.remove_roles(cargo, reason="Não é mais o mais procurado")
                except discord.Forbidden:
                    pass
        if alvo_id:
            membro = guild.get_member(int(alvo_id))
            if membro is not None and cargo not in membro.roles:
                try:
                    await membro.add_roles(cargo, reason="Agora é o mais procurado")
                except discord.Forbidden:
                    pass


async def conceder_cacador(bot, guild: discord.Guild, user_id: str) -> None:
    db = bot.db
    gid = str(guild.id)
    cargo = await _obter_ou_criar_cargo(
        guild, db.get_cargo_cacador(gid),
        economia.CARGO_CACADOR_PADRAO, 0xF1C40F, db.set_cargo_cacador,
    )
    if cargo is None:
        return
    expira_em = datetime.now(timezone.utc) + timedelta(hours=economia.CACADOR_RECOMPENSA_HORAS)
    db.conceder_cacador(gid, user_id, expira_em)
    membro = guild.get_member(int(user_id))
    if membro is not None:
        try:
            await membro.add_roles(cargo, reason="Capturou um procurado")
        except discord.Forbidden:
            pass


async def sweep_cacadores_expirados(bot) -> None:
    """Roda periodicamente: tira o cargo de quem passou das 24h da captura."""
    agora = datetime.now(timezone.utc)
    db = bot.db
    for guild in bot.guilds:
        gid = str(guild.id)
        cargo_id = db.get_cargo_cacador(gid)
        if not cargo_id:
            continue
        cargo = guild.get_role(int(cargo_id))
        for registro in db.listar_cacadores(gid):
            if registro["expira_em"] > agora:
                continue
            if cargo is not None:
                membro = guild.get_member(int(registro["user_id"]))
                if membro is not None and cargo in membro.roles:
                    try:
                        await membro.remove_roles(cargo, reason="Cargo de Caçador expirou")
                    except discord.Forbidden:
                        pass
            db.remover_cacador(gid, registro["user_id"])
