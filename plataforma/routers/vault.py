from __future__ import annotations

from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from psycopg.types.json import Jsonb

from core.audit import record_audit
from core.cofre_tiers import (
    COFRE_TIER_INICIAL as _COFRE_TIER_INICIAL,
    COFRE_TIERS as _COFRE_TIERS,
    SEGURANCA_TIER_INICIAL as _SEGURANCA_TIER_INICIAL,
    SEGURANCA_TIERS as _SEGURANCA_TIERS,
    proximo_tier as _proximo_tier,
    tier_info as _tier_info,
)
from core.database import Database
from core.economy_commands import MAX_ECONOMY_AMOUNT
from core.dependencies import (
    AuthenticatedUser,
    campaign_access,
    get_current_user,
    get_database,
    require_csrf,
)
from schemas import (
    VaultTransferCurrencyInput,
    VaultTransferItemInput,
)


router = APIRouter(prefix="/cofre", tags=["cofre-da-conta"])


def _owned_character(connection, user_id, campaign_id, character_id):
    campaign_access(connection, campaign_id, user_id)
    row = connection.execute(
        """
        SELECT id, nome FROM personagens
        WHERE id=%s AND campanha_id=%s AND dono_usuario_id=%s AND status='ativo'
        FOR UPDATE
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


@router.get("/movimentos")
def get_vault_movements(
    campanha_id: UUID,
    user: AuthenticatedUser = Depends(get_current_user),
    database: Database = Depends(get_database),
):
    """Extrato do cofre: entradas (Discord) e saídas (para personagens)."""
    with database.connection() as connection:
        campaign_access(connection, campanha_id, user.id)
        rows = connection.execute(
            """
            SELECT id, origem, personagem_id, detalhes, criado_em
            FROM movimentos_cofre
            WHERE usuario_id=%s AND campanha_id=%s
            ORDER BY criado_em DESC
            LIMIT 50
            """,
            (user.id, campanha_id),
        ).fetchall()
    return {"movimentos": [dict(row) for row in rows]}


@router.get("/nivel")
def get_vault_bank_tier(
    campanha_id: UUID,
    user: AuthenticatedUser = Depends(get_current_user),
    database: Database = Depends(get_database),
):
    """Status do Cofre bancário do Banqueiro (tier, capacidade, segurança).

    É um sistema à parte do Cofre de Recompensas acima: vive nas tabelas do
    bot (`cofre`/`cofre_saldo`, chaveadas por guild/user do Discord), não nas
    da plataforma. Só existe se a conta e a campanha estiverem vinculadas ao
    Discord — sem isso devolve `vinculado: false` em vez de erro.
    """
    with database.connection() as connection:
        campaign_access(connection, campanha_id, user.id)
        conta = connection.execute(
            "SELECT discord_user_id FROM contas_discord WHERE usuario_id=%s",
            (user.id,),
        ).fetchone()
        guild = connection.execute(
            "SELECT discord_guild_id FROM campanhas_discord WHERE campanha_id=%s",
            (campanha_id,),
        ).fetchone()
        if not conta or not guild:
            return {"vinculado": False}

        discord_user_id = conta["discord_user_id"]
        discord_guild_id = guild["discord_guild_id"]

        cofre_row = connection.execute(
            "SELECT tier, seguranca_tier FROM cofre WHERE guild_id=%s AND user_id=%s",
            (discord_guild_id, discord_user_id),
        ).fetchone()
        saldos = connection.execute(
            """
            SELECT moeda, saldo FROM cofre_saldo
            WHERE guild_id=%s AND user_id=%s AND saldo > 0
            ORDER BY moeda
            """,
            (discord_guild_id, discord_user_id),
        ).fetchall()
        # Para contas vinculadas, o cofre unificado é a fonte de verdade que o
        # Banqueiro também consulta. Contar a tabela legada `inventario` aqui
        # fazia a página e o comando /cofre exibirem totais diferentes.
        itens_row = connection.execute(
            """
            SELECT COALESCE(SUM(quantidade), 0) AS total
            FROM cofre_itens_usuario
            WHERE usuario_id=%s AND campanha_id=%s
            """,
            (user.id, campanha_id),
        ).fetchone()

    tier_id = cofre_row["tier"] if cofre_row else _COFRE_TIER_INICIAL
    seguranca_id = cofre_row["seguranca_tier"] if cofre_row else _SEGURANCA_TIER_INICIAL

    return {
        "vinculado": True,
        "tier": _tier_info(_COFRE_TIERS, tier_id, _COFRE_TIER_INICIAL),
        "proximo_tier": _proximo_tier(_COFRE_TIERS, tier_id, _COFRE_TIER_INICIAL),
        "seguranca": _tier_info(_SEGURANCA_TIERS, seguranca_id, _SEGURANCA_TIER_INICIAL),
        "proxima_seguranca": _proximo_tier(_SEGURANCA_TIERS, seguranca_id, _SEGURANCA_TIER_INICIAL),
        "saldos_guardados": [dict(row) for row in saldos],
        "itens_no_inventario": int(itens_row["total"]),
    }


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
        destination = connection.execute(
            """
            SELECT quantidade FROM inventario_personagem
            WHERE campanha_id=%s AND personagem_id=%s AND item_id=%s
            FOR UPDATE
            """,
            (payload.campanha_id, payload.personagem_id, payload.item_id),
        ).fetchone()
        destination_quantity = int(destination["quantidade"]) if destination else 0
        if destination_quantity + payload.quantidade > 1_000_000:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="a quantidade resultante excede o limite do inventario",
            )
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
        version_row = connection.execute(
            """
            UPDATE personagens
            SET economia_versao=economia_versao+1,
                atualizado_em=CURRENT_TIMESTAMP
            WHERE id=%s AND status='ativo'
            RETURNING economia_versao
            """,
            (payload.personagem_id,),
        ).fetchone()
        if not version_row:
            raise RuntimeError("personagem bloqueado deixou de estar ativo durante a transacao")
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
            details={
                "item_id": payload.item_id,
                "quantidade": payload.quantidade,
                "economia_versao": int(version_row["economia_versao"]),
            },
        )
    return {
        "personagem": character,
        "restante": remaining,
        "economia_versao": int(version_row["economia_versao"]),
    }


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
        destination = connection.execute(
            """
            SELECT saldo FROM saldos_personagem
            WHERE campanha_id=%s AND personagem_id=%s AND moeda=%s
            FOR UPDATE
            """,
            (payload.campanha_id, payload.personagem_id, payload.moeda),
        ).fetchone()
        destination_balance = int(destination["saldo"]) if destination else 0
        if destination_balance + payload.quantidade > MAX_ECONOMY_AMOUNT:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="o saldo resultante excede o limite economico",
            )
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
        version_row = connection.execute(
            """
            UPDATE personagens
            SET economia_versao=economia_versao+1,
                atualizado_em=CURRENT_TIMESTAMP
            WHERE id=%s AND status='ativo'
            RETURNING economia_versao
            """,
            (payload.personagem_id,),
        ).fetchone()
        if not version_row:
            raise RuntimeError("personagem bloqueado deixou de estar ativo durante a transacao")
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
            details={
                "moeda": payload.moeda,
                "quantidade": payload.quantidade,
                "economia_versao": int(version_row["economia_versao"]),
            },
        )
    return {
        "personagem": character,
        "restante": remaining,
        "saldo_personagem": balance["saldo"],
        "economia_versao": int(version_row["economia_versao"]),
    }


@router.post("/comprar", deprecated=True)
def legacy_purchase_disabled(
    user: AuthenticatedUser = Depends(require_csrf),
):
    """Bloqueia o contrato antigo, que aceitava moeda e preço implícitos do cliente."""
    raise HTTPException(
        status_code=status.HTTP_410_GONE,
        detail="endpoint substituido por /api/v1/loja/compras",
    )
