"""Lembretes de sessão: 24 horas e 1 hora antes de cada sessão.

Uma rotina leve roda de minuto em minuto dentro do próprio servidor. A próxima
sessão vem da agenda (sessão fixa da semana ou uma especial); quando ela muda,
os marcadores `lembrete_24h_em` e `lembrete_1h_em` recomeçam, então cada sessão
recebe cada lembrete uma vez só, mesmo reiniciando o servidor ou rodando duas
vezes.
"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timedelta, timezone

from core import agenda as agenda_regras
from core.discord_avisos import avisar_discord
from core.engajamento import contagem_regressiva
from core.notifications import campaign_member_ids, notify

log = logging.getLogger("jardim-plataforma")

INTERVALO_SEGUNDOS = 60


def processar(database, agora: datetime | None = None) -> int:
    """Envia os lembretes que estão na hora. Devolve quantos saíram."""
    agora = agora or datetime.now(timezone.utc)
    enviados = 0
    with database.connection() as connection:
        linhas = connection.execute(
            """
            SELECT campanha_id, recorrencia, cancelados, especiais,
                   lembrete_para, lembrete_24h_em, lembrete_1h_em
            FROM campanha_agenda
            WHERE recorrencia <> '{}'::jsonb OR especiais <> '[]'::jsonb
            FOR UPDATE SKIP LOCKED
            """
        ).fetchall()
        for linha in linhas:
            agenda = {
                "recorrencia": linha["recorrencia"] or {},
                "cancelados": linha["cancelados"] or [],
                "especiais": linha["especiais"] or [],
            }
            try:
                proxima = agenda_regras.proxima_ocorrencia(agenda, agora)
            except agenda_regras.ErroAgenda:
                log.warning("Agenda invalida na campanha %s; lembrete ignorado", linha["campanha_id"])
                continue
            if not proxima:
                continue
            quando = datetime.fromisoformat(proxima["em"])
            falta = quando - agora
            if falta <= timedelta(0) or falta > timedelta(hours=24):
                continue

            enviou_24h, enviou_1h = linha["lembrete_24h_em"], linha["lembrete_1h_em"]
            if linha["lembrete_para"] != quando:
                # Sessão nova na frente (mudou a data, cancelou a da semana): recomeça a contagem.
                enviou_24h = enviou_1h = None
                connection.execute(
                    """
                    UPDATE campanha_agenda
                    SET lembrete_para=%s, lembrete_24h_em=NULL, lembrete_1h_em=NULL
                    WHERE campanha_id=%s
                    """,
                    (quando, linha["campanha_id"]),
                )

            if falta <= timedelta(hours=1) and enviou_1h is None:
                tipo = "1h"
            elif enviou_24h is None and enviou_1h is None:
                tipo = "24h"
            else:
                continue  # o de 24h já saiu e o de 1h ainda não chegou na hora

            contagem = contagem_regressiva(quando, agora)
            titulo = proxima["titulo"] or agenda["recorrencia"].get("titulo") or "A sessão"
            texto = contagem["texto"] if contagem else "em breve"
            notify(
                connection,
                user_ids=campaign_member_ids(connection, linha["campanha_id"]),
                category="sessao",
                title="A sessão está chegando",
                message=f"{titulo} começa {texto}.",
                campaign_id=linha["campanha_id"],
                details={"proxima_em": quando.isoformat(), "lembrete": tipo},
            )
            avisar_discord(
                connection, linha["campanha_id"], "lembrete",
                f"⏰ **{titulo}** começa {texto}. Preparem os dados.",
            )
            if tipo == "1h":
                connection.execute(
                    "UPDATE campanha_agenda SET lembrete_1h_em=CURRENT_TIMESTAMP, lembrete_24h_em=COALESCE(lembrete_24h_em, CURRENT_TIMESTAMP) WHERE campanha_id=%s",
                    (linha["campanha_id"],),
                )
            else:
                connection.execute(
                    "UPDATE campanha_agenda SET lembrete_24h_em=CURRENT_TIMESTAMP WHERE campanha_id=%s",
                    (linha["campanha_id"],),
                )
            enviados += 1
    return enviados


async def rodar(database, parada: asyncio.Event) -> None:
    """Laço do servidor. Erro numa rodada é registrado e a próxima tenta de novo."""
    while not parada.is_set():
        try:
            await asyncio.to_thread(processar, database)
        except Exception:  # noqa: BLE001 - um problema aqui não pode derrubar a API
            log.exception("Falha ao processar lembretes de sessão")
        try:
            await asyncio.wait_for(parada.wait(), timeout=INTERVALO_SEGUNDOS)
        except asyncio.TimeoutError:
            continue
