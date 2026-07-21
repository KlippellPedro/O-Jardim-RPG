from __future__ import annotations

from fastapi import APIRouter, Depends, Query, status

from core.database import Database
from core.dependencies import AuthenticatedUser, get_current_user, get_database, require_csrf
from schemas import NotificationReadInput


router = APIRouter(prefix="/avisos", tags=["avisos"])


@router.get("")
def list_notifications(
    apenas_nao_lidos: bool = Query(default=False),
    limite: int = Query(default=40, ge=1, le=200),
    user: AuthenticatedUser = Depends(get_current_user),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        rows = connection.execute(
            """
            SELECT n.id, n.campanha_id, c.nome AS campanha_nome,
                   n.categoria, n.titulo, n.mensagem, n.dados,
                   n.lida_em, n.criado_em,
                   u.nome_exibicao AS origem_nome
            FROM notificacoes n
            LEFT JOIN campanhas c ON c.id = n.campanha_id
            LEFT JOIN usuarios u ON u.id = n.origem_usuario_id
            WHERE n.usuario_id=%s AND (%s IS FALSE OR n.lida_em IS NULL)
            ORDER BY n.criado_em DESC
            LIMIT %s
            """,
            (user.id, apenas_nao_lidos, limite),
        ).fetchall()
        nao_lidos = connection.execute(
            """
            SELECT COUNT(*) AS total FROM notificacoes
            WHERE usuario_id=%s AND lida_em IS NULL
            """,
            (user.id,),
        ).fetchone()["total"]
    return {"avisos": [dict(row) for row in rows], "nao_lidos": int(nao_lidos)}


@router.post("/lidos")
def mark_as_read(
    payload: NotificationReadInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        if payload.ids:
            connection.execute(
                """
                UPDATE notificacoes SET lida_em=CURRENT_TIMESTAMP
                WHERE usuario_id=%s AND lida_em IS NULL AND id = ANY(%s)
                """,
                (user.id, list(payload.ids)),
            )
        else:
            connection.execute(
                """
                UPDATE notificacoes SET lida_em=CURRENT_TIMESTAMP
                WHERE usuario_id=%s AND lida_em IS NULL
                """,
                (user.id,),
            )
        restante = connection.execute(
            """
            SELECT COUNT(*) AS total FROM notificacoes
            WHERE usuario_id=%s AND lida_em IS NULL
            """,
            (user.id,),
        ).fetchone()["total"]
    return {"nao_lidos": int(restante)}


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
def clear_read(
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    """Limpa apenas o que já foi lido — nada some antes de o dono ver."""
    with database.connection() as connection:
        connection.execute(
            "DELETE FROM notificacoes WHERE usuario_id=%s AND lida_em IS NOT NULL",
            (user.id,),
        )
    return None
