"""Fila durável e entrega idempotente das publicações do Jornalista."""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Optional

import discord

log = logging.getLogger("jornalista")


def _mencoes(modo: str) -> discord.AllowedMentions:
    if modo == "usuarios":
        return discord.AllowedMentions(users=True, roles=False, everyone=False)
    if modo == "cargos":
        return discord.AllowedMentions(users=False, roles=True, everyone=False)
    return discord.AllowedMentions.none()


def payload_embed(
    embed: discord.Embed,
    *,
    content: Optional[str] = None,
    mencoes: str = "nenhuma",
) -> dict:
    return {
        "embed": embed.to_dict(),
        "content": content,
        "mencoes": mencoes,
    }


def enfileirar_embed(
    bot,
    guild_id: str,
    *,
    embed: discord.Embed,
    origem: str,
    dedupe_key: str,
    categoria: str = "noticia",
    canal_id: Optional[str] = None,
    referencia: Optional[str] = None,
    automacao: Optional[str] = None,
    content: Optional[str] = None,
    mencoes: str = "nenhuma",
    quando=None,
) -> dict:
    return bot.db.enfileirar_publicacao(
        str(guild_id),
        canal_id=str(canal_id) if canal_id else None,
        categoria=categoria,
        origem=origem,
        referencia=str(referencia) if referencia is not None else None,
        automacao=automacao,
        dedupe_key=dedupe_key,
        payload=payload_embed(embed, content=content, mencoes=mencoes),
        proxima_tentativa=quando,
    )


def _resolver_canal(bot, publicacao: dict):
    guild_id = str(publicacao["guild_id"])
    guild = bot.get_guild(int(guild_id))
    if guild is None:
        return None
    ids = []
    if publicacao.get("canal_id"):
        ids.append(publicacao["canal_id"])
    atual = bot.db.get_canal_categoria(guild_id, publicacao.get("categoria") or "noticia")
    if atual and atual not in ids:
        ids.append(atual)
    for canal_id in ids:
        try:
            canal = guild.get_channel(int(canal_id))
        except (TypeError, ValueError):
            continue
        if isinstance(canal, discord.TextChannel):
            return canal
    return None


async def tentar_publicacao(bot, publicacao: dict) -> str:
    """Tenta uma linha da fila; devolve entregue, adiada ou falha."""
    automacao = publicacao.get("automacao")
    gid = str(publicacao["guild_id"])
    if automacao == "clima_auto":
        ativa = bot.db.get_clima_auto(gid)
    elif automacao == "estacao_auto":
        ativa = bot.db.get_estacao_auto(gid)
    elif automacao == "baus_auto":
        ativa = bool(bot.db.get_baus_config(gid).get("ativo"))
    else:
        # Todas as automações que chegam aqui (fora de clima_auto/estacao_auto/
        # baus_auto, tratadas acima) vêm ligadas por padrão em AUTOMACOES
        # (cogs/jornal.py) — inclusive resumo_semanal, que era a única exceção
        # até B2/2026-08 e por isso tinha um caso especial aqui.
        ativa = not automacao or bot.db.automacao_ativa(gid, automacao, padrao=True)
    if not ativa:
        bot.db.adiar_publicacao(publicacao["id"], 30)
        return "adiada"

    reivindicada = bot.db.reivindicar_publicacao(publicacao["id"])
    if reivindicada is None:
        return "ocupada"
    publicacao = reivindicada

    canal = _resolver_canal(bot, publicacao)
    if canal is None:
        bot.db.marcar_publicacao_falha(
            publicacao["id"], "canal ausente, inacessível ou não configurado"
        )
        return "falha"

    payload = publicacao.get("payload") or {}
    embed_dados = payload.get("embed")
    embed = discord.Embed.from_dict(embed_dados) if embed_dados else None
    try:
        mensagem = await canal.send(
            content=payload.get("content"),
            embed=embed,
            allowed_mentions=_mencoes(str(payload.get("mencoes") or "nenhuma")),
        )
    except discord.HTTPException as exc:
        log.warning(
            "publicacao %s falhou no canal %s: %s",
            publicacao.get("id"), canal.id, exc,
        )
        bot.db.marcar_publicacao_falha(publicacao["id"], str(exc))
        return "falha"
    bot.db.marcar_publicacao_entregue(publicacao["id"], str(mensagem.id))
    return "entregue"


async def publicar_ou_enfileirar(bot, **kwargs) -> str:
    """Persiste primeiro e tenta imediatamente; o ciclo assume qualquer falha."""
    publicacao = enfileirar_embed(bot, **kwargs)
    if publicacao.get("status") == "entregue":
        return "entregue"
    if publicacao.get("status") != "pendente":
        return str(publicacao.get("status") or "ignorada")
    quando = publicacao.get("proxima_tentativa")
    if quando and quando > datetime.now(timezone.utc):
        return "agendada"
    return await tentar_publicacao(bot, publicacao)
