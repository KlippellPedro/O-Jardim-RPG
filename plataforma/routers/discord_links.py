from __future__ import annotations

from datetime import datetime, timedelta, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends, status

from core.audit import record_audit
from core.database import Database
from core.dependencies import AuthenticatedUser, get_current_user, get_database, require_csrf
from core.security import hash_token, new_human_code


router = APIRouter(prefix="/discord", tags=["discord"])


@router.get("")
def get_link(
    user: AuthenticatedUser = Depends(get_current_user),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        row = connection.execute(
            """
            SELECT discord_user_id, discord_nome, vinculado_em
            FROM contas_discord WHERE usuario_id=%s
            """,
            (user.id,),
        ).fetchone()
    return {"vinculo": dict(row) if row else None}


@router.post("/codigo", status_code=status.HTTP_201_CREATED)
def create_link_code(
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    code = new_human_code()
    expires = datetime.now(timezone.utc) + timedelta(minutes=10)
    with database.connection() as connection:
        connection.execute(
            """
            UPDATE codigos_vinculo_discord SET consumido_em=CURRENT_TIMESTAMP
            WHERE usuario_id=%s AND consumido_em IS NULL
            """,
            (user.id,),
        )
        connection.execute(
            """
            INSERT INTO codigos_vinculo_discord
                (id, usuario_id, codigo_hash, expira_em)
            VALUES (%s, %s, %s, %s)
            """,
            (uuid4(), user.id, hash_token(code), expires),
        )
        record_audit(
            connection,
            action="discord.codigo_criado",
            actor_user_id=user.id,
            target_type="conta_discord",
        )
    return {"codigo": code, "expira_em": expires, "instrucao": "Envie este codigo ao comando /vincular do bot."}


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
def unlink_discord(
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        connection.execute("DELETE FROM contas_discord WHERE usuario_id=%s", (user.id,))
        record_audit(
            connection,
            action="discord.desvinculado",
            actor_user_id=user.id,
            target_type="conta_discord",
        )
    return None
