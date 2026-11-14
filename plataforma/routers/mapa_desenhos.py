"""Desenhos fixos da cena (regras em core/desenhos_fixos.py): o Mestre risca no mapa e o traço fica até ele apagar.

Só o Mestre e os assistentes. O jogador recebe só os desenhos que o Mestre deixou à mostra (`routers/mapa.py`, `_montar`).
"""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from psycopg.types.json import Jsonb
from pydantic import BaseModel, Field

from core import desenhos_fixos
from core.database import Database
from core.dependencies import AuthenticatedUser, get_database, require_campaign_manager, require_csrf
from routers import mapa as rotas_mapa

router = APIRouter(prefix="/mapa", tags=["mapa-desenhos"])


class DesenhoFixoInput(BaseModel):
    forma: str = Field(max_length=20)
    pontos: list[list[float]] = Field(max_length=64)
    cor: str | None = Field(default=None, max_length=7)
    #: A mesa vê o desenho; falso guarda como anotação só do Mestre.
    publico: bool = True


def _gravar(connection, campanha_id, cena_id, cena, transformar, acesso, user):
    estrutura = dict(cena["estrutura"]) if isinstance(cena["estrutura"], dict) else {}
    try:
        estrutura["desenhos"] = transformar(desenhos_fixos.ler_desenhos(estrutura))
    except desenhos_fixos.ErroDesenho as erro:
        raise HTTPException(status_code=erro.codigo, detail=erro.mensagem) from None
    connection.execute("UPDATE mapa_cenas SET estrutura=%s WHERE id=%s", (Jsonb(estrutura), cena_id))
    versao = rotas_mapa._tocar(connection, cena_id)
    return versao, rotas_mapa._montar(connection, campanha_id, acesso, user, cena_id)


@router.post("/{campanha_id}/cenas/{cena_id}/desenhos")
def prender_desenho(
    campanha_id: UUID,
    cena_id: UUID,
    payload: DesenhoFixoInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    """Guarda um traço na cena: ele fica até o Mestre apagar."""
    with database.connection() as connection:
        acesso = require_campaign_manager(connection, campanha_id, user.id)
        cena = rotas_mapa._cena(connection, campanha_id, cena_id, travar=True)
        try:
            desenho = desenhos_fixos.novo(payload.model_dump(), int(cena["largura"]), int(cena["altura"]))
        except desenhos_fixos.ErroDesenho as erro:
            raise HTTPException(status_code=erro.codigo, detail=erro.mensagem) from None
        versao, resposta = _gravar(connection, campanha_id, cena_id, cena, lambda atuais: desenhos_fixos.acrescentar(atuais, desenho), acesso, user)
    rotas_mapa._avisar(campanha_id, versao)
    return resposta


@router.delete("/{campanha_id}/cenas/{cena_id}/desenhos/{desenho_id}")
def apagar_desenho(
    campanha_id: UUID,
    cena_id: UUID,
    desenho_id: str,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    """Apaga um desenho fixo."""
    with database.connection() as connection:
        acesso = require_campaign_manager(connection, campanha_id, user.id)
        cena = rotas_mapa._cena(connection, campanha_id, cena_id, travar=True)
        versao, resposta = _gravar(connection, campanha_id, cena_id, cena, lambda atuais: desenhos_fixos.apagar(atuais, desenho_id), acesso, user)
    rotas_mapa._avisar(campanha_id, versao)
    return resposta


@router.delete("/{campanha_id}/cenas/{cena_id}/desenhos")
def limpar_desenhos(
    campanha_id: UUID,
    cena_id: UUID,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    """Apaga todos os desenhos fixos da cena."""
    with database.connection() as connection:
        acesso = require_campaign_manager(connection, campanha_id, user.id)
        cena = rotas_mapa._cena(connection, campanha_id, cena_id, travar=True)
        versao, resposta = _gravar(connection, campanha_id, cena_id, cena, lambda _atuais: [], acesso, user)
    rotas_mapa._avisar(campanha_id, versao)
    return resposta
