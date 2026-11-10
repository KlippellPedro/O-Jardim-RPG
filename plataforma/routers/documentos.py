"""Documentos do Mestre por campanha (regras em core/documentos.py).

Só quem comanda a mesa (Mestre e assistente) lê e escreve. A lista vem sem os campos,
que podem trazer imagem; o documento inteiro sai pela rota do id.
"""

from __future__ import annotations

from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from psycopg.types.json import Jsonb
from pydantic import BaseModel, Field

from core import documentos as regras
from core import documentos_universais as universais
from core.audit import record_audit
from core.database import Database
from core.dependencies import (
    AuthenticatedUser,
    get_current_user,
    get_database,
    require_campaign_manager,
    require_csrf,
)
from core.documentos import ErroDocumento

router = APIRouter(prefix="/documentos", tags=["documentos"])


class DocumentoInput(BaseModel):
    modelo: str = Field(max_length=48)
    titulo: str = Field(max_length=400)
    campos: dict = Field(default_factory=dict)


def _erro(erro: ErroDocumento) -> HTTPException:
    return HTTPException(status_code=erro.codigo, detail=erro.mensagem)


def _validar(payload: DocumentoInput) -> tuple[str, str, dict[str, str]]:
    try:
        return (
            regras.validar_modelo(payload.modelo),
            regras.normalizar_titulo(payload.titulo),
            regras.normalizar_campos(payload.campos),
        )
    except ErroDocumento as erro:
        raise _erro(erro) from erro


def _resumo(linha) -> dict:
    return {
        "id": str(linha["id"]),
        "modelo": linha["modelo"],
        "titulo": linha["titulo"],
        "criado_em": linha["criado_em"].isoformat() if linha["criado_em"] else None,
        "atualizado_em": linha["atualizado_em"].isoformat() if linha["atualizado_em"] else None,
    }


def _completo(linha) -> dict:
    return {**_resumo(linha), "campos": linha["campos"] or {}}


@router.get("/{campanha_id}")
def listar(
    campanha_id: UUID,
    user: AuthenticatedUser = Depends(get_current_user),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        require_campaign_manager(connection, campanha_id, user.id)
        linhas = connection.execute(
            """
            SELECT id, modelo, titulo, criado_em, atualizado_em
            FROM campanha_documentos
            WHERE campanha_id=%s
            ORDER BY atualizado_em DESC, id
            """,
            (campanha_id,),
        ).fetchall()
    return {"documentos": [_resumo(linha) for linha in linhas]}


@router.get("/{campanha_id}/universais")
def listar_universais(
    campanha_id: UUID,
    user: AuthenticatedUser = Depends(get_current_user),
    database: Database = Depends(get_database),
):
    """Os documentos prontos da lore (core/documentos_universais.py). Declarada antes da rota do id."""
    with database.connection() as connection:
        require_campaign_manager(connection, campanha_id, user.id)
    return {"documentos": universais.listar()}


@router.get("/{campanha_id}/{documento_id}")
def obter(
    campanha_id: UUID,
    documento_id: UUID,
    user: AuthenticatedUser = Depends(get_current_user),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        require_campaign_manager(connection, campanha_id, user.id)
        linha = connection.execute(
            """
            SELECT id, modelo, titulo, campos, criado_em, atualizado_em
            FROM campanha_documentos WHERE id=%s AND campanha_id=%s
            """,
            (documento_id, campanha_id),
        ).fetchone()
    if not linha:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="documento nao encontrado")
    return _completo(linha)


@router.post("/{campanha_id}", status_code=status.HTTP_201_CREATED)
def criar(
    campanha_id: UUID,
    payload: DocumentoInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    modelo, titulo, campos = _validar(payload)
    with database.connection() as connection:
        require_campaign_manager(connection, campanha_id, user.id)
        total = connection.execute(
            "SELECT COUNT(*) AS total FROM campanha_documentos WHERE campanha_id=%s", (campanha_id,)
        ).fetchone()["total"]
        if total >= regras.MAX_DOCUMENTOS_POR_CAMPANHA:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"a campanha guarda ate {regras.MAX_DOCUMENTOS_POR_CAMPANHA} documentos; apague algum antes",
            )
        linha = connection.execute(
            """
            INSERT INTO campanha_documentos (id, campanha_id, modelo, titulo, campos, criado_por)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id, modelo, titulo, campos, criado_em, atualizado_em
            """,
            (uuid4(), campanha_id, modelo, titulo, Jsonb(campos), user.id),
        ).fetchone()
        record_audit(
            connection, action="documento.criado", actor_user_id=user.id, campaign_id=campanha_id,
            target_type="documento", target_id=str(linha["id"]), details={"modelo": modelo, "titulo": titulo},
        )
    return _completo(linha)


@router.put("/{campanha_id}/{documento_id}")
def editar(
    campanha_id: UUID,
    documento_id: UUID,
    payload: DocumentoInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    modelo, titulo, campos = _validar(payload)
    with database.connection() as connection:
        require_campaign_manager(connection, campanha_id, user.id)
        linha = connection.execute(
            """
            UPDATE campanha_documentos
            SET modelo=%s, titulo=%s, campos=%s, atualizado_em=CURRENT_TIMESTAMP
            WHERE id=%s AND campanha_id=%s
            RETURNING id, modelo, titulo, campos, criado_em, atualizado_em
            """,
            (modelo, titulo, Jsonb(campos), documento_id, campanha_id),
        ).fetchone()
        if not linha:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="documento nao encontrado")
        record_audit(
            connection, action="documento.editado", actor_user_id=user.id, campaign_id=campanha_id,
            target_type="documento", target_id=str(documento_id), details={"modelo": modelo, "titulo": titulo},
        )
    return _completo(linha)


@router.delete("/{campanha_id}/{documento_id}")
def apagar(
    campanha_id: UUID,
    documento_id: UUID,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        require_campaign_manager(connection, campanha_id, user.id)
        linha = connection.execute(
            "DELETE FROM campanha_documentos WHERE id=%s AND campanha_id=%s RETURNING id, modelo, titulo",
            (documento_id, campanha_id),
        ).fetchone()
        if not linha:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="documento nao encontrado")
        record_audit(
            connection, action="documento.apagado", actor_user_id=user.id, campaign_id=campanha_id,
            target_type="documento", target_id=str(documento_id),
            details={"modelo": linha["modelo"], "titulo": linha["titulo"]},
        )
    return {"ok": True}
