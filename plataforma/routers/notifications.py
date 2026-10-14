from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from core.database import Database
from core.dependencies import AuthenticatedUser, get_current_user, get_database, require_csrf
from core.notifications import MANAGES_CAMPAIGN_SQL, PANELS, PENDING_WORK_SQL, contar_avisos
from schemas import NotificationReadInput


router = APIRouter(prefix="/avisos", tags=["avisos"])


def _valid_panel(painel: str | None) -> str | None:
    if painel is not None and painel not in PANELS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="painel de avisos invalido",
        )
    return painel


def _scope(user: AuthenticatedUser, painel: str | None, campanha_id: UUID | None) -> tuple[list[str], list]:
    """Condições (alias `n`) que dizem quais avisos da pessoa entram na operação.

    Sem `painel` o escopo é a caixa inteira, como era antes da divisão por painel: é o que um site
    antigo, ainda aberto no navegador, continua pedindo.
    """
    condicoes = ["n.usuario_id=%s"]
    params: list = [user.id]
    if painel:
        condicoes.append("n.painel=%s")
        params.append(painel)
    if campanha_id:
        condicoes.append("n.campanha_id=%s")
        params.append(campanha_id)
    if painel == "mestre":
        condicoes.append(MANAGES_CAMPAIGN_SQL)
    if painel == "admin" and not user.is_platform_admin:
        condicoes.append("FALSE")
    return condicoes, params


@router.get("")
def list_notifications(
    apenas_nao_lidos: bool = Query(default=False),
    painel: Annotated[str | None, Query()] = None,
    campanha_id: Annotated[UUID | None, Query()] = None,
    limite: int = Query(default=40, ge=1, le=200),
    user: AuthenticatedUser = Depends(get_current_user),
    database: Database = Depends(get_database),
):
    """Avisos da pessoa. `painel` ('geral', 'mestre' ou 'admin') e `campanha_id` filtram a lista;
    `contagens` sempre traz os não lidos de todos os painéis, que é o que alimenta os números do menu."""
    painel = _valid_panel(painel)
    condicoes, params = _scope(user, painel, campanha_id)
    if apenas_nao_lidos:
        condicoes.append("n.lida_em IS NULL")
    with database.connection() as connection:
        rows = connection.execute(
            f"""
            SELECT n.id, n.campanha_id, c.nome AS campanha_nome,
                   n.categoria, n.painel, n.titulo, n.mensagem, n.dados,
                   n.lida_em, n.criado_em,
                   u.nome_exibicao AS origem_nome
            FROM notificacoes n
            LEFT JOIN campanhas c ON c.id = n.campanha_id
            LEFT JOIN usuarios u ON u.id = n.origem_usuario_id
            WHERE {" AND ".join(condicoes)}
            ORDER BY n.criado_em DESC
            LIMIT %s
            """,
            (*params, limite),
        ).fetchall()
        contagens = contar_avisos(
            connection,
            user.id,
            campaign_id=campanha_id,
            is_platform_admin=user.is_platform_admin,
        )
    return {
        "avisos": [dict(row) for row in rows],
        "nao_lidos": contagens["total"],
        "contagens": contagens,
    }


@router.post("/lidos")
def mark_as_read(
    payload: NotificationReadInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    condicoes, params = _scope(user, payload.painel, payload.campanha_id)
    condicoes.append("n.lida_em IS NULL")
    # Reivindicação pendente só sai da fila quando o Mestre responde na Loja.
    condicoes.append(f"NOT {PENDING_WORK_SQL}")
    if payload.ids:
        condicoes.append("n.id = ANY(%s)")
        params.append(list(payload.ids))
    with database.connection() as connection:
        connection.execute(
            f"UPDATE notificacoes n SET lida_em=CURRENT_TIMESTAMP WHERE {' AND '.join(condicoes)}",
            tuple(params),
        )
        contagens = contar_avisos(
            connection,
            user.id,
            campaign_id=payload.campanha_id,
            is_platform_admin=user.is_platform_admin,
        )
    return {"nao_lidos": contagens["total"], "contagens": contagens}


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
def clear_read(
    painel: Annotated[str | None, Query()] = None,
    campanha_id: Annotated[UUID | None, Query()] = None,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    """Limpa apenas o que já foi lido — nada some antes de o dono ver. Respeita o painel pedido."""
    painel = _valid_panel(painel)
    condicoes, params = _scope(user, painel, campanha_id)
    condicoes.append("n.lida_em IS NOT NULL")
    condicoes.append(f"NOT {PENDING_WORK_SQL}")
    with database.connection() as connection:
        connection.execute(
            f"DELETE FROM notificacoes n WHERE {' AND '.join(condicoes)}",
            tuple(params),
        )
    return None
