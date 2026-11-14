"""Zonas de terreno da cena (regras em core/zonas.py): o Mestre marca cobertura, gatilhos e terreno.

Só o Mestre e os assistentes mexem. O jogador recebe só o terreno marcado como à vista (`routers/mapa.py`, `_montar`).
"""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from psycopg.types.json import Jsonb
from pydantic import BaseModel, Field

from core import tempo_real, zonas
from core.database import Database
from core.dependencies import AuthenticatedUser, get_database, require_campaign_manager, require_csrf
from routers import mapa as rotas_mapa

router = APIRouter(prefix="/mapa", tags=["mapa-zonas"])


class ZonasInput(BaseModel):
    #: A lista inteira da cena (como os portais): o que não vier é apagado.
    zonas: list[dict] = Field(default_factory=list, max_length=zonas.MAX_ZONAS)


class RearmarInput(BaseModel):
    #: A zona a rearmar; nulo rearma todos os gatilhos de uma vez só da cena.
    zona: str | None = Field(default=None, max_length=40)


@router.put("/{campanha_id}/cenas/{cena_id}/zonas")
def mudar_zonas(
    campanha_id: UUID,
    cena_id: UUID,
    payload: ZonasInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    """A lista inteira de zonas da cena: o Mestre desenha, edita e apaga."""
    with database.connection() as connection:
        acesso = require_campaign_manager(connection, campanha_id, user.id)
        cena = rotas_mapa._cena(connection, campanha_id, cena_id, travar=True)
        try:
            lista = zonas.normalizar_zonas(payload.zonas, int(cena["largura"]), int(cena["altura"]))
        except zonas.ErroZona as erro:
            raise HTTPException(status_code=erro.codigo, detail=erro.mensagem) from None
        estrutura = dict(cena["estrutura"]) if isinstance(cena["estrutura"], dict) else {}
        estrutura["zonas"] = lista
        connection.execute("UPDATE mapa_cenas SET estrutura=%s WHERE id=%s", (Jsonb(estrutura), cena_id))
        versao = rotas_mapa._tocar(connection, cena_id)
        resposta = rotas_mapa._montar(connection, campanha_id, acesso, user, cena_id)
    rotas_mapa._avisar(campanha_id, versao)
    return resposta


@router.post("/{campanha_id}/cenas/{cena_id}/zonas/rearmar")
def rearmar_zonas(
    campanha_id: UUID,
    cena_id: UUID,
    payload: RearmarInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    """Rearma os gatilhos de uma vez só: eles disparam de novo na próxima vez que alguém entrar."""
    with database.connection() as connection:
        require_campaign_manager(connection, campanha_id, user.id)
        rotas_mapa._cena(connection, campanha_id, cena_id)
    tempo_real.rearmar_gatilho(campanha_id, str(cena_id), payload.zona)
    return {"ok": True}
