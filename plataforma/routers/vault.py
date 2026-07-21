from __future__ import annotations

from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from psycopg.types.json import Jsonb

from core.audit import record_audit
from core.database import Database
from core.dependencies import (
    AuthenticatedUser,
    campaign_access,
    get_current_user,
    get_database,
    require_csrf,
)
from schemas import VaultTransferCurrencyInput, VaultTransferItemInput


router = APIRouter(prefix="/cofre", tags=["cofre-da-conta"])


def _owned_character(connection, user_id, campaign_id, character_id):
    campaign_access(connection, campaign_id, user_id)
    row = connection.execute(
        """
        SELECT id, nome FROM personagens
        WHERE id=%s AND campanha_id=%s AND dono_usuario_id=%s AND status='ativo'
        """,
        (character_id, campaign_id, user_id),
    ).fetchone()
    if not row:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="escolha um personagem seu desta campanha",
        )
    return row


@router.get("")
def get_vault(
    campanha_id: UUID,
    user: AuthenticatedUser = Depends(get_current_user),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        campaign_access(connection, campanha_id, user.id)
        items = connection.execute(
            """
            SELECT item_id, titulo, quantidade, dados, origem, atualizado_em
            FROM cofre_itens_usuario
            WHERE usuario_id=%s AND campanha_id=%s
            ORDER BY titulo
            """,
            (user.id, campanha_id),
        ).fetchall()
        balances = connection.execute(
            """
            SELECT moeda, saldo, atualizado_em
            FROM cofre_saldos_usuario
            WHERE usuario_id=%s AND campanha_id=%s
            ORDER BY moeda
            """,
            (user.id, campanha_id),
        ).fetchall()
    return {"itens": [dict(row) for row in items], "moedas": [dict(row) for row in balances]}


@router.post("/transferir-item")
def transfer_item(
    payload: VaultTransferItemInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        character = _owned_character(
            connection, user.id, payload.campanha_id, payload.personagem_id
        )
        row = connection.execute(
            """
            SELECT titulo, quantidade, dados
            FROM cofre_itens_usuario
            WHERE usuario_id=%s AND campanha_id=%s AND item_id=%s
            FOR UPDATE
            """,
            (user.id, payload.campanha_id, payload.item_id),
        ).fetchone()
        if not row or int(row["quantidade"]) < payload.quantidade:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="quantidade indisponivel no cofre")
        remaining = int(row["quantidade"]) - payload.quantidade
        if remaining:
            connection.execute(
                """
                UPDATE cofre_itens_usuario SET quantidade=%s, atualizado_em=CURRENT_TIMESTAMP
                WHERE usuario_id=%s AND campanha_id=%s AND item_id=%s
                """,
                (remaining, user.id, payload.campanha_id, payload.item_id),
            )
        else:
            connection.execute(
                """
                DELETE FROM cofre_itens_usuario
                WHERE usuario_id=%s AND campanha_id=%s AND item_id=%s
                """,
                (user.id, payload.campanha_id, payload.item_id),
            )
        connection.execute(
            """
            INSERT INTO inventario_personagem
                (campanha_id, personagem_id, item_id, titulo, quantidade, dados)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT (campanha_id, personagem_id, item_id) DO UPDATE SET
                titulo=EXCLUDED.titulo,
                quantidade=inventario_personagem.quantidade + EXCLUDED.quantidade,
                dados=EXCLUDED.dados,
                atualizado_em=CURRENT_TIMESTAMP
            """,
            (
                payload.campanha_id,
                payload.personagem_id,
                payload.item_id,
                row["titulo"],
                payload.quantidade,
                Jsonb(row["dados"] or {}),
            ),
        )
        connection.execute(
            "UPDATE personagens SET economia_versao=economia_versao+1 WHERE id=%s",
            (payload.personagem_id,),
        )
        movement_id = uuid4()
        connection.execute(
            """
            INSERT INTO movimentos_cofre
                (id, usuario_id, campanha_id, personagem_id, origem, idempotencia, detalhes)
            VALUES (%s, %s, %s, %s, 'site', %s, %s)
            """,
            (
                movement_id,
                user.id,
                payload.campanha_id,
                payload.personagem_id,
                f"transfer-item:{movement_id}",
                Jsonb({"item_id": payload.item_id, "quantidade": payload.quantidade}),
            ),
        )
        record_audit(
            connection,
            action="cofre.item_transferido",
            actor_user_id=user.id,
            campaign_id=payload.campanha_id,
            target_type="personagem",
            target_id=str(payload.personagem_id),
            details={"item_id": payload.item_id, "quantidade": payload.quantidade},
        )
    return {"personagem": character, "restante": remaining}


@router.post("/transferir-moeda")
def transfer_currency(
    payload: VaultTransferCurrencyInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        character = _owned_character(
            connection, user.id, payload.campanha_id, payload.personagem_id
        )
        row = connection.execute(
            """
            SELECT saldo FROM cofre_saldos_usuario
            WHERE usuario_id=%s AND campanha_id=%s AND moeda=%s
            FOR UPDATE
            """,
            (user.id, payload.campanha_id, payload.moeda),
        ).fetchone()
        if not row or int(row["saldo"]) < payload.quantidade:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="saldo indisponivel no cofre")
        remaining = int(row["saldo"]) - payload.quantidade
        if remaining:
            connection.execute(
                """
                UPDATE cofre_saldos_usuario SET saldo=%s, atualizado_em=CURRENT_TIMESTAMP
                WHERE usuario_id=%s AND campanha_id=%s AND moeda=%s
                """,
                (remaining, user.id, payload.campanha_id, payload.moeda),
            )
        else:
            connection.execute(
                """
                DELETE FROM cofre_saldos_usuario
                WHERE usuario_id=%s AND campanha_id=%s AND moeda=%s
                """,
                (user.id, payload.campanha_id, payload.moeda),
            )
        balance = connection.execute(
            """
            INSERT INTO saldos_personagem (campanha_id, personagem_id, moeda, saldo)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (campanha_id, personagem_id, moeda) DO UPDATE SET
                saldo=saldos_personagem.saldo + EXCLUDED.saldo,
                atualizado_em=CURRENT_TIMESTAMP
            RETURNING saldo
            """,
            (payload.campanha_id, payload.personagem_id, payload.moeda, payload.quantidade),
        ).fetchone()
        connection.execute(
            "UPDATE personagens SET economia_versao=economia_versao+1 WHERE id=%s",
            (payload.personagem_id,),
        )
        movement_id = uuid4()
        connection.execute(
            """
            INSERT INTO movimentos_cofre
                (id, usuario_id, campanha_id, personagem_id, origem, idempotencia, detalhes)
            VALUES (%s, %s, %s, %s, 'site', %s, %s)
            """,
            (
                movement_id,
                user.id,
                payload.campanha_id,
                payload.personagem_id,
                f"transfer-currency:{movement_id}",
                Jsonb({"moeda": payload.moeda, "quantidade": payload.quantidade}),
            ),
        )
        record_audit(
            connection,
            action="cofre.moeda_transferida",
            actor_user_id=user.id,
            campaign_id=payload.campanha_id,
            target_type="personagem",
            target_id=str(payload.personagem_id),
            details={"moeda": payload.moeda, "quantidade": payload.quantidade},
        )
    return {"personagem": character, "restante": remaining, "saldo_personagem": balance["saldo"]}
