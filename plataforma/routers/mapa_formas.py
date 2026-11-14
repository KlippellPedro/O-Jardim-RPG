"""Formas do token (regras em core/formas_token.py): as imagens do Acervo que um token do Mestre pode vestir.

Só o Mestre mexe. O token de personagem de jogador usa as artes da ficha (routers/mapa.py), não isto. A imagem que o
jogador recebe é sempre a da forma que está valendo, pela mesma rota e pelas mesmas regras de antes: quem não vê a
identidade do token continua sem imagem, qualquer que seja a forma.
"""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from psycopg.types.json import Jsonb
from pydantic import BaseModel, Field

from core import formas_token
from core.database import Database
from core.dependencies import AuthenticatedUser, get_database, require_campaign_manager, require_csrf
from routers import mapa as rotas_mapa

router = APIRouter(prefix="/mapa", tags=["mapa-formas"])


class FormaInput(BaseModel):
    imagem_id: UUID
    nome: str | None = Field(default=None, max_length=formas_token.NOME_MAXIMO * 2)


class FormaNomeInput(BaseModel):
    nome: str = Field(min_length=1, max_length=formas_token.NOME_MAXIMO * 2)


class FormaAtivaInput(BaseModel):
    #: O id da forma que passa a valer; nulo volta à imagem de base.
    forma: str | None = Field(default=None, max_length=32)


def _erro(erro: formas_token.ErroForma) -> HTTPException:
    return HTTPException(status_code=erro.codigo, detail=erro.mensagem)


def _token_de_criatura(connection, campanha_id: UUID, token_id: UUID) -> dict:
    """O token escolhido, travado; o de personagem de jogador não tem formas (ele tem as artes da ficha)."""
    token = rotas_mapa._token(connection, campanha_id, token_id, travar=True)
    if token["personagem_id"]:
        raise HTTPException(status_code=422, detail="o token de personagem usa as artes da ficha")
    if token["participante_id"]:
        dono = connection.execute("SELECT personagem_id FROM sessao_participantes WHERE id=%s", (token["participante_id"],)).fetchone()
        if dono and dono["personagem_id"]:
            raise HTTPException(status_code=422, detail="o token de personagem usa as artes da ficha")
    return token


def _gravar(connection, token: dict, formas: list[dict], ativa: str | None) -> None:
    connection.execute(
        "UPDATE mapa_tokens SET formas=%s, forma_ativa=%s, atualizado_em=CURRENT_TIMESTAMP WHERE id=%s",
        (Jsonb(formas), ativa, token["id"]),
    )


def _responder(connection, campanha_id: UUID, acesso, user: AuthenticatedUser, token: dict) -> dict:
    versao = rotas_mapa._tocar(connection, token["cena_id"])
    resposta = rotas_mapa._montar(connection, campanha_id, acesso, user, token["cena_id"])
    return {"resposta": resposta, "versao": versao}


@router.post("/{campanha_id}/tokens/{token_id}/formas", status_code=201)
def adicionar_forma(
    campanha_id: UUID,
    token_id: UUID,
    payload: FormaInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    """Põe uma imagem do Acervo como mais uma forma do token (no máximo 8)."""
    with database.connection() as connection:
        acesso = require_campaign_manager(connection, campanha_id, user.id)
        token = _token_de_criatura(connection, campanha_id, token_id)
        rotas_mapa._item_do_mestre(connection, payload.imagem_id, user)
        formas = formas_token.ler_formas(token["formas"])
        try:
            formas.append(formas_token.forma_nova(formas, payload.imagem_id, payload.nome))
        except formas_token.ErroForma as erro:
            raise _erro(erro) from None
        _gravar(connection, token, formas, token["forma_ativa"])
        feito = _responder(connection, campanha_id, acesso, user, token)
    rotas_mapa._avisar(campanha_id, feito["versao"])
    return feito["resposta"]


@router.put("/{campanha_id}/tokens/{token_id}/formas/{forma_id}")
def renomear_forma(
    campanha_id: UUID,
    token_id: UUID,
    forma_id: str,
    payload: FormaNomeInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        acesso = require_campaign_manager(connection, campanha_id, user.id)
        token = _token_de_criatura(connection, campanha_id, token_id)
        formas = formas_token.ler_formas(token["formas"])
        alvo = next((f for f in formas if f["id"] == forma_id), None)
        if alvo is None:
            raise HTTPException(status_code=404, detail="forma nao encontrada")
        alvo["nome"] = " ".join(payload.nome.split())[:formas_token.NOME_MAXIMO] or alvo["nome"]
        _gravar(connection, token, formas, token["forma_ativa"])
        feito = _responder(connection, campanha_id, acesso, user, token)
    rotas_mapa._avisar(campanha_id, feito["versao"])
    return feito["resposta"]


@router.delete("/{campanha_id}/tokens/{token_id}/formas/{forma_id}")
def apagar_forma(
    campanha_id: UUID,
    token_id: UUID,
    forma_id: str,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    """Tira a forma; se era a que estava valendo, o token volta à imagem de base."""
    with database.connection() as connection:
        acesso = require_campaign_manager(connection, campanha_id, user.id)
        token = _token_de_criatura(connection, campanha_id, token_id)
        formas = formas_token.ler_formas(token["formas"])
        restantes = [f for f in formas if f["id"] != forma_id]
        if len(restantes) == len(formas):
            raise HTTPException(status_code=404, detail="forma nao encontrada")
        _gravar(connection, token, restantes, formas_token.ativa_valida(token["forma_ativa"], restantes))
        feito = _responder(connection, campanha_id, acesso, user, token)
    rotas_mapa._avisar(campanha_id, feito["versao"])
    return feito["resposta"]


@router.put("/{campanha_id}/tokens/{token_id}/forma")
def escolher_forma(
    campanha_id: UUID,
    token_id: UUID,
    payload: FormaAtivaInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    """Troca a forma que o token veste agora (nulo: a imagem de base). A mesa vê a troca na hora."""
    with database.connection() as connection:
        acesso = require_campaign_manager(connection, campanha_id, user.id)
        token = _token_de_criatura(connection, campanha_id, token_id)
        formas = formas_token.ler_formas(token["formas"])
        if payload.forma is not None and formas_token.ativa_valida(payload.forma, formas) is None:
            raise HTTPException(status_code=404, detail="forma nao encontrada")
        _gravar(connection, token, formas, payload.forma)
        feito = _responder(connection, campanha_id, acesso, user, token)
    rotas_mapa._avisar(campanha_id, feito["versao"])
    return feito["resposta"]
