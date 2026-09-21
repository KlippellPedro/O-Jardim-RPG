"""Descobertas escondidas no site: registrar uma achada e ver quem achou o quê."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from core.database import Database
from core.dependencies import AuthenticatedUser, campaign_access, get_current_user, get_database, require_csrf
from core.descobertas import CATALOGO, POR_CHAVE, montar_lista, ranking

router = APIRouter(prefix="/descobertas", tags=["descobertas"])


@router.post("/registrar/{chave}")
def registrar(
    chave: str,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    """Guarda que esta pessoa achou algo. Repetir não muda nada (`nova: false`)."""
    item = POR_CHAVE.get(chave)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="descoberta desconhecida")
    with database.connection() as connection:
        inserida = connection.execute(
            """
            INSERT INTO descobertas (chave, usuario_id) VALUES (%s, %s)
            ON CONFLICT (chave, usuario_id) DO NOTHING
            """,
            (chave, user.id),
        ).rowcount
    return {"nova": bool(inserida), "chave": item.chave, "nome": item.nome, "raridade": item.raridade}


@router.get("/minhas")
def minhas(
    user: AuthenticatedUser = Depends(get_current_user),
    database: Database = Depends(get_database),
):
    """Só as chaves que eu já achei: o cliente usa para não repetir o pedido."""
    with database.connection() as connection:
        linhas = connection.execute("SELECT chave FROM descobertas WHERE usuario_id=%s", (user.id,)).fetchall()
    return {"achadas": [linha["chave"] for linha in linhas]}


@router.get("/{campanha_id}")
def da_campanha(
    campanha_id: UUID,
    user: AuthenticatedUser = Depends(get_current_user),
    database: Database = Depends(get_database),
):
    """Mural de descobertas da campanha: quem achou cada uma, sem dizer onde."""
    with database.connection() as connection:
        campaign_access(connection, campanha_id, user.id)
        linhas = connection.execute(
            """
            SELECT d.chave, d.usuario_id, d.descoberta_em, u.nome_exibicao
            FROM descobertas d
            JOIN membros_campanha m ON m.usuario_id = d.usuario_id AND m.campanha_id = %s AND m.status = 'ativo'
            JOIN usuarios u ON u.id = d.usuario_id
            ORDER BY d.descoberta_em
            """,
            (campanha_id,),
        ).fetchall()
    achadas_por_mim: dict[str, str] = {}
    descobridores: dict[str, list[str]] = {}
    for linha in linhas:
        descobridores.setdefault(linha["chave"], []).append(linha["nome_exibicao"])
        if linha["usuario_id"] == user.id:
            achadas_por_mim[linha["chave"]] = linha["descoberta_em"].isoformat()
    itens = montar_lista(achadas_por_mim, descobridores)
    return {
        "itens": itens,
        "total": len(CATALOGO),
        "achadas_por_mim": len(achadas_por_mim),
        "ranking": ranking(descobridores),
    }
