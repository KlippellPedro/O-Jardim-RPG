"""Rotas dos extras da mesa (core/mesa_extras.py): pausa, relógios e cronômetro da campanha,
fala de NPC e a vista inicial da cena. Ficam fora de routers/mapa.py para não crescer o
arquivo do mapa; usam as mesmas peças de lá."""

from __future__ import annotations

import time
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from psycopg.types.json import Jsonb

from core import mesa_extras, tempo_real
from core.database import Database
from core.dependencies import AuthenticatedUser, get_database, require_campaign_manager, require_csrf
from core.mesa_extras import ErroMesa
from routers import mapa as rotas_mapa

router = APIRouter(prefix="/mapa", tags=["mapa-ao-vivo"])


def _erro(erro: ErroMesa) -> HTTPException:
    return HTTPException(status_code=erro.codigo, detail=erro.mensagem)


@router.put("/{campanha_id}/mesa")
def mudar_mesa(
    campanha_id: UUID,
    payload: dict,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    """Pausa, relógios e cronômetro da campanha. Só o que vier no pedido muda."""
    with database.connection() as connection:
        require_campaign_manager(connection, campanha_id, user.id)
        linha = connection.execute(
            "SELECT mesa FROM mapa_campanha WHERE campanha_id=%s FOR UPDATE", (campanha_id,),
        ).fetchone()
        try:
            mesa = mesa_extras.normalizar_mesa(payload, linha["mesa"] if linha else None)
        except ErroMesa as erro:
            raise _erro(erro) from None
        connection.execute(
            """
            INSERT INTO mapa_campanha (campanha_id, mesa) VALUES (%s, %s)
            ON CONFLICT (campanha_id) DO UPDATE SET mesa = EXCLUDED.mesa, atualizado_em = CURRENT_TIMESTAMP
            """,
            (campanha_id, Jsonb(mesa)),
        )
    rotas_mapa._avisar(campanha_id, int(time.time() * 1000))
    return mesa_extras.mesa_de(mesa, gestor=True)


@router.post("/{campanha_id}/fala")
def falar(
    campanha_id: UUID,
    payload: dict,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    """O Mestre fala por um NPC: a mesa conectada vê a fala com o nome (e o retrato do token,
    para quem enxerga o token). Nada fica gravado."""
    with database.connection() as connection:
        require_campaign_manager(connection, campanha_id, user.id)
    try:
        fala = mesa_extras.normalizar_fala(payload)
    except ErroMesa as erro:
        raise _erro(erro) from None
    tempo_real.anunciar(campanha_id, {"t": "fala", **fala})
    return {"ok": True, "conectados": tempo_real.conectados(campanha_id)}


@router.put("/{campanha_id}/cenas/{cena_id}/vista")
def guardar_vista(
    campanha_id: UUID,
    cena_id: UUID,
    payload: dict,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    """Onde a tela abre a cena (centro e zoom). `{"vista": null}` volta ao mapa inteiro."""
    with database.connection() as connection:
        acesso = require_campaign_manager(connection, campanha_id, user.id)
        cena = rotas_mapa._cena(connection, campanha_id, cena_id, travar=True)
        try:
            vista = mesa_extras.normalizar_vista(payload.get("vista"), int(cena["largura"]), int(cena["altura"]))
        except ErroMesa as erro:
            raise _erro(erro) from None
        estrutura = dict(cena["estrutura"]) if isinstance(cena["estrutura"], dict) else {}
        if vista is None:
            estrutura.pop("vista", None)
        else:
            estrutura["vista"] = vista
        connection.execute("UPDATE mapa_cenas SET estrutura=%s WHERE id=%s", (Jsonb(estrutura), cena_id))
        versao = rotas_mapa._tocar(connection, cena_id)
        resposta = rotas_mapa._montar(connection, campanha_id, acesso, user, cena_id)
    rotas_mapa._avisar(campanha_id, versao)
    return resposta
