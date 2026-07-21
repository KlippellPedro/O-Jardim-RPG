"""Avisos em tempo real da sessão de mesa, por Server-Sent Events.

O evento carrega só a versão nova do estado, nunca o estado em si: cada cliente
refaz o GET e recebe o recorte que o papel dele permite ver. Assim a regra de
"o jogador não vê a vida exata do monstro" mora em um lugar só, e um evento
perdido durante uma reconexão não deixa a tela mentindo.

Uma instância só de uvicorn atende o site, então um registro em memória basta.
Se um dia houver mais de um processo, isto vira LISTEN/NOTIFY do Postgres — o
formato do evento não muda.
"""

from __future__ import annotations

import asyncio
import json
import logging
from uuid import UUID


log = logging.getLogger("jardim-plataforma")

_LIMITE_FILA = 32
_assinantes: dict[UUID, set[asyncio.Queue]] = {}
_loop: asyncio.AbstractEventLoop | None = None


def registrar_loop(loop: asyncio.AbstractEventLoop) -> None:
    """Guarda o loop do servidor: as rotas são síncronas e rodam fora dele."""
    global _loop
    _loop = loop


def assinar(campanha_id: UUID) -> asyncio.Queue:
    fila: asyncio.Queue = asyncio.Queue(maxsize=_LIMITE_FILA)
    _assinantes.setdefault(campanha_id, set()).add(fila)
    return fila


def cancelar(campanha_id: UUID, fila: asyncio.Queue) -> None:
    filas = _assinantes.get(campanha_id)
    if not filas:
        return
    filas.discard(fila)
    if not filas:
        _assinantes.pop(campanha_id, None)


def _entregar(campanha_id: UUID, mensagem: str) -> None:
    for fila in list(_assinantes.get(campanha_id, ())):
        try:
            fila.put_nowait(mensagem)
        except asyncio.QueueFull:
            # Cliente parado engolindo eventos: descartar é melhor do que travar
            # a rota de quem está jogando. Ele se atualiza na próxima mudança.
            log.debug("Fila de eventos cheia na campanha %s", campanha_id)


def publicar(campanha_id: UUID, tipo: str, versao: int) -> None:
    """Chamado de dentro de uma rota síncrona, depois de gravar no banco."""
    if not _assinantes.get(campanha_id):
        return
    mensagem = json.dumps({"tipo": tipo, "versao": versao}, ensure_ascii=False)
    if _loop is None:
        _entregar(campanha_id, mensagem)
        return
    try:
        _loop.call_soon_threadsafe(_entregar, campanha_id, mensagem)
    except RuntimeError:
        # Servidor encerrando: sem ninguém para receber, e não é motivo de erro.
        log.debug("Loop indisponivel ao publicar evento da campanha %s", campanha_id)


def ouvintes(campanha_id: UUID) -> int:
    return len(_assinantes.get(campanha_id, ()))
