"""A edição semanal do Jornal Lunar (domingo).

Antes era só um quadro de contadores. Agora é um jornal: o tempo no Jardim, os
caçadores de baú da semana, os procurados, os furos e classificados, a
entrevista, o Cofre do Jardim, a loteria e os eventos do Mestre. Cada seção só
entra se tiver o que contar. Função pura sobre o dicionário de dados."""

from __future__ import annotations

from typing import Optional

from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

import discord

from . import arvores as arvores_mod
from . import economia
from . import ui

FUSO = ZoneInfo("America/Sao_Paulo")


def janela_edicao(agora: datetime) -> bool:
    """A edição sai no domingo à noite (depois da Loteria, às 18h) e, se o bot
    estiver fora do ar, é recuperada até a manhã de segunda."""
    local = agora.astimezone(FUSO)
    return (local.weekday() == 6 and local.hour >= 19) or (local.weekday() == 0 and local.hour < 12)


def semana_da_edicao(agora: datetime) -> str:
    """Chave "AAAA-Wss" da edição, pela semana de São Paulo. A recuperação de segunda de manhã
    pertence à semana do domingo anterior, então os dois horários geram a mesma chave."""
    local = agora.astimezone(FUSO)
    if local.weekday() == 0:
        local = local - timedelta(days=1)
    ano, semana, _ = local.isocalendar()
    return f"{ano}-W{semana:02d}"


def inicio_do_mes(agora: datetime) -> datetime:
    """Primeiro instante do mês corrente em São Paulo (a janela do ranking de caçadores)."""
    return agora.astimezone(FUSO).replace(day=1, hour=0, minute=0, second=0, microsecond=0)


EMOJI_EVENTO = {"aviso": "📢", "mercado": "💹", "festival": "🎉", "perigo": "⚠️"}
EFEITO_DO_CLIMA = {
    "inflacao_loja": "Loja e Mercado Negro 20% mais caros.",
    "deflacao_loja": "15% de desconto na Loja.",
}
MEDALHAS = ("🥇", "🥈", "🥉")


def _corta(texto: str, limite: int) -> str:
    texto = " ".join(str(texto or "").split())
    return texto if len(texto) <= limite else texto[: limite - 1].rstrip() + "…"


def _secao_tempo(dados: dict) -> Optional[str]:
    estacao = dados.get("estacao")
    if not estacao:
        return None
    info = economia.estacao_info(estacao)
    linhas = [f"**{info['rotulo']}**"]
    efeito = EFEITO_DO_CLIMA.get(dados.get("clima") or "")
    if efeito:
        linhas.append(efeito)
    arvore = arvores_mod.obter(dados["horoscopo"]) if dados.get("horoscopo") else None
    if arvore is not None:
        linhas.append(f"🔮 As estrelas sorriem para **{arvore.nome}**.")
    return "\n".join(linhas)


def _secao_cacadores(dados: dict) -> Optional[str]:
    topo = dados.get("cacadores") or []
    if not topo:
        return None
    return "\n".join(
        f"{MEDALHAS[i]} <@{c['user_id']}> · {c['baus']} baú(s)" for i, c in enumerate(topo[:3])
    )


def _secao_procurados(dados: dict) -> Optional[str]:
    topo = dados.get("procurados") or []
    if not topo:
        return None
    return "\n".join(
        f"<@{p['alvo_user_id']}> · ☾ **{p['valor']}**" + (" 🏦" if p.get("tem_sistema") else "")
        for p in topo[:3]
    )


def _secao_bastidores(dados: dict) -> Optional[str]:
    linhas = []
    furos = dados.get("furos") or []
    if furos:
        linhas.append(f"📸 **{len(furos)}** furo(s) saíram esta semana:")
        linhas.extend(f"> {_corta(f['texto_fofoca'], 140)}" for f in furos[:2])
    classificados = dados.get("classificados") or []
    if classificados:
        linhas.append("📰 Nos classificados:")
        from .db import CLASSIFICADO_CATEGORIAS

        for c in classificados[:3]:
            nome, emoji = CLASSIFICADO_CATEGORIAS.get(c["categoria"], CLASSIFICADO_CATEGORIAS["outros"])
            linhas.append(f"{emoji} *{_corta(c['texto'], 90)}*")
    return "\n".join(linhas) if linhas else None


def _secao_entrevista(dados: dict) -> Optional[str]:
    e = dados.get("entrevista")
    if not e:
        return None
    return f"**<@{e['user_id']}>** respondeu:\n> {_corta(e['pergunta'], 140)}\n{_corta(e['resposta'], 240)}"


def _secao_cofre(dados: dict) -> Optional[str]:
    meta = dados.get("meta")
    if meta:
        feito = min(int(meta["arrecadado"]), int(meta["alvo"]))
        return f"**{_corta(meta['titulo'], 80)}**: ☾ {feito}/{meta['alvo']}. Doe pelo `/banco`."
    ultima = dados.get("meta_encerrada")
    if ultima and ultima.get("status") == "concluida":
        return f"A meta **{_corta(ultima['titulo'], 80)}** foi batida esta semana. 🎉"
    return None


def _secao_loteria(dados: dict) -> Optional[str]:
    rodada = dados.get("loteria")
    if not rodada:
        return None
    return (
        f"<@{rodada['vencedor_user_id']}> levou ☾ **{rodada['premio']}** "
        f"entre {rodada['participantes']} participante(s)."
    )


def _secao_eventos(dados: dict) -> Optional[str]:
    eventos = dados.get("eventos") or []
    if not eventos:
        return None
    return "\n".join(f"{EMOJI_EVENTO.get(ev.get('tipo'), '📢')} {_corta(ev['titulo'], 90)}" for ev in eventos[:3])


def _secao_numeros(dados: dict) -> Optional[str]:
    resumo = dados.get("resumo")
    if not resumo:
        return None
    return (
        f"Baús abertos: **{resumo['baus']}** · Exploradores premiados: **{resumo['vencedores_baus']}**\n"
        f"Desafios resolvidos: **{resumo['desafios']}** · Entrevistas: **{resumo['entrevistas']}**\n"
        f"Entradas: ☾ **{resumo['entradas']}** · Saídas: ☾ **{resumo['saidas']}** · "
        f"Jogadores ativos: **{resumo['jogadores']}**"
    )


SECOES = (
    ("🌦️ O tempo no Jardim", _secao_tempo),
    ("🏆 Caçadores de baú da semana", _secao_cacadores),
    ("🎯 Procurados", _secao_procurados),
    ("🗣️ Nos bastidores", _secao_bastidores),
    ("🎙️ Entrevista da semana", _secao_entrevista),
    ("🏛️ Cofre do Jardim", _secao_cofre),
    ("🎟️ Loteria Dominical", _secao_loteria),
    ("📢 Eventos do Mestre", _secao_eventos),
    ("📊 Em números", _secao_numeros),
)


def montar_edicao(dados: dict) -> discord.Embed:
    emb = ui.embed(
        "🗞️ Jornal Lunar · Edição da semana",
        categoria="noticia",
        descricao="O que movimentou o Jardim nos últimos sete dias.",
    )
    for titulo, construir in SECOES:
        texto = construir(dados)
        if texto:
            emb.add_field(name=titulo, value=texto[:1024], inline=False)
    emb.set_footer(text="Somente atividades registradas pelos bots entram nesta edição.")
    return emb
