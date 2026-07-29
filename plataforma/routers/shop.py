from __future__ import annotations

from typing import Any
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, status
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
from core.economy_commands import (
    MAX_ECONOMY_AMOUNT,
    begin_economy_command,
    command_fingerprint,
    complete_economy_command,
    get_economy_command_replay,
    normalize_catalog_filter,
    normalize_currency,
    resale_value,
    resolve_catalog_price,
)
from schemas import ShopBatchCommandInput


router = APIRouter(prefix="/loja", tags=["loja"])

_PROTECTED_INVENTORY_METADATA = frozenset(
    {
        "catalogo_item_id",
        "custo",
        "loja_item_id",
        "moeda",
        "origem",
        "preco",
        "precos",
        "proveniencia",
        "recompensa_id",
        "tipo",
        "tipo_catalogo",
        "valor",
        "valor_compra",
        "valor_venda",
    }
)


def _editable_instance_metadata(data: dict[str, Any]) -> dict[str, Any]:
    """Preserva estado/metadata desconhecida sem preservar campos econômicos."""

    result = {}
    for key, value in data.items():
        normalized = normalize_catalog_filter(key).replace(" ", "_")
        if normalized.startswith(
            ("_", "catalogo_", "loja_", "preco_", "proveniencia_", "recompensa_")
        ):
            continue
        if normalized in _PROTECTED_INVENTORY_METADATA:
            continue
        result[key] = value
    return result


def _inventory_category(catalog_type: str) -> str:
    normalized = normalize_catalog_filter(catalog_type)
    if normalized == "arma":
        return "arma"
    if normalized == "armadura":
        return "armadura"
    if normalized in {"equipamento", "consumivel", "fruto-eden"}:
        return "consumivel"
    if normalized in {"veiculo", "veiculo-completo"}:
        return "veiculo"
    return "geral"


def _shop_config(connection, campaign_id: UUID, *, lock: bool = False) -> tuple[set[str], set[str]]:
    row = connection.execute(
        "SELECT configuracoes FROM campanhas WHERE id=%s AND status='ativa'"
        + (" FOR SHARE" if lock else ""),
        (campaign_id,),
    ).fetchone()
    config = row["configuracoes"] if row and isinstance(row["configuracoes"], dict) else {}
    raw_hidden_rarities = config.get("raridades_ocultas", [])
    raw_hidden_items = config.get("itens_ocultos", [])
    if not isinstance(raw_hidden_rarities, list):
        raw_hidden_rarities = []
    if not isinstance(raw_hidden_items, list):
        raw_hidden_items = []
    hidden_rarities = {
        normalize_catalog_filter(value)
        for value in raw_hidden_rarities
        if isinstance(value, str) and value.strip()
    }
    hidden_items = {
        normalize_catalog_filter(value)
        for value in raw_hidden_items
        if isinstance(value, str) and value.strip()
    }
    return hidden_rarities, hidden_items


def _is_hidden_catalog_item(
    row: dict[str, Any],
    hidden_rarities: set[str],
    hidden_items: set[str],
) -> bool:
    content = row.get("conteudo") if isinstance(row.get("conteudo"), dict) else {}
    rarity = normalize_catalog_filter(content.get("raridade", ""))
    return (
        normalize_catalog_filter(row.get("id", "")) in hidden_items
        or bool(rarity and rarity in hidden_rarities)
    )


def _visible_catalog_rows(
    connection,
    campaign_id: UUID,
    item_ids: list[str] | None = None,
    *,
    lock: bool = False,
) -> list[dict[str, Any]]:
    lock_clause = " FOR SHARE OF c" if lock else ""
    if item_ids is None:
        rows = connection.execute(
            """
            SELECT c.id, c.tipo, c.titulo, c.conteudo
            FROM catalogo_itens c
            WHERE c.ativo=TRUE
            ORDER BY c.tipo, c.titulo, c.id
            """ + lock_clause
        ).fetchall()
    else:
        rows = connection.execute(
            """
            SELECT c.id, c.tipo, c.titulo, c.conteudo
            FROM catalogo_itens c
            WHERE c.ativo=TRUE AND c.id = ANY(%s)
            ORDER BY c.id
            """ + lock_clause,
            (item_ids,),
        ).fetchall()
    hidden_rarities, hidden_items = _shop_config(connection, campaign_id, lock=lock)
    return [
        dict(row)
        for row in rows
        if not _is_hidden_catalog_item(dict(row), hidden_rarities, hidden_items)
    ]


def _active_catalog_rows(connection, item_ids: list[str], *, lock: bool = False) -> list[dict[str, Any]]:
    rows = connection.execute(
        """
        SELECT id, tipo, titulo, conteudo
        FROM catalogo_itens
        WHERE ativo=TRUE AND id = ANY(%s)
        ORDER BY id
        """ + (" FOR SHARE" if lock else ""),
        (item_ids,),
    ).fetchall()
    return [dict(row) for row in rows]


def _owned_character(connection, campaign_id: UUID, character_id: UUID, user_id: UUID, *, lock: bool):
    suffix = " FOR UPDATE" if lock else ""
    row = connection.execute(
        """
        SELECT id, nome, economia_versao
        FROM personagens
        WHERE id=%s AND campanha_id=%s AND dono_usuario_id=%s AND status='ativo'
        """ + suffix,
        (character_id, campaign_id, user_id),
    ).fetchone()
    if not row:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="escolha um personagem ativo seu desta campanha",
        )
    return row


def _require_expected_version(character, expected: int) -> None:
    current = int(character["economia_versao"])
    if current != expected:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "mensagem": "a economia mudou; recarregue antes de tentar novamente",
                "versao_atual": current,
            },
        )


def _locked_wallet(connection, campaign_id: UUID, character_id: UUID):
    rows = connection.execute(
        """
        SELECT moeda, saldo
        FROM saldos_personagem
        WHERE campanha_id=%s AND personagem_id=%s
        ORDER BY LOWER(BTRIM(moeda)), moeda
        FOR UPDATE
        """,
        (campaign_id, character_id),
    ).fetchall()
    by_currency: dict[str, dict[str, Any]] = {}
    for raw_row in rows:
        row = dict(raw_row)
        normalized = normalize_currency(row["moeda"])
        if normalized in by_currency:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"a carteira possui entradas duplicadas para {row['moeda']}",
            )
        by_currency[normalized] = row
    return by_currency


def _locked_inventory(connection, campaign_id: UUID, character_id: UUID, item_ids: list[str]):
    rows = connection.execute(
        """
        SELECT item_id, titulo, quantidade, dados
        FROM inventario_personagem
        WHERE campanha_id=%s AND personagem_id=%s AND item_id = ANY(%s)
        ORDER BY item_id
        FOR UPDATE
        """,
        (campaign_id, character_id, item_ids),
    ).fetchall()
    return {row["item_id"]: dict(row) for row in rows}


def _add_total(totals: dict[str, dict[str, Any]], currency: str, value: int) -> None:
    normalized = normalize_currency(currency)
    if normalized not in totals:
        totals[normalized] = {"moeda": currency, "valor": 0}
    new_value = int(totals[normalized]["valor"]) + int(value)
    if new_value > MAX_ECONOMY_AMOUNT:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"o total em {currency} excede o limite economico",
        )
    totals[normalized]["valor"] = new_value


def _record_wallet_ledger(
    connection,
    *,
    operation_id: UUID,
    campaign_id: UUID,
    character_id: UUID,
    actor_user_id: UUID,
    origin: str,
    movements: list[dict[str, Any]],
    sign: int,
) -> None:
    for movement in movements:
        connection.execute(
            """
            INSERT INTO lancamentos_economia
                (id, campanha_id, personagem_id, moeda, delta, saldo_apos,
                 motivo, origem, idempotencia, ator_usuario_id)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                uuid4(),
                campaign_id,
                character_id,
                movement["moeda"],
                sign * int(movement["valor"]),
                movement["saldo"],
                "Compra na loja" if sign < 0 else "Venda para a loja",
                origin,
                f"{operation_id}:wallet:{normalize_currency(movement['moeda'])}",
                actor_user_id,
            ),
        )


@router.get("/catalogo")
def get_shop_catalog(
    campanha_id: UUID = Query(),
    user: AuthenticatedUser = Depends(get_current_user),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        campaign_access(connection, campanha_id, user.id)
        rows = _visible_catalog_rows(connection, campanha_id)
    items = []
    for row in rows:
        price = resolve_catalog_price(row["conteudo"])
        if price is None:
            # Entrada publicada com preço inválido não pode aparecer como comprável.
            continue
        items.append(
            {
                "id": row["id"],
                "titulo": row["titulo"],
                "tipo": row["tipo"],
                "conteudo": row["conteudo"],
                "preco": {"moeda": price.moeda, "valor": price.valor},
            }
        )
    return {"itens": items}


@router.post("/compras", status_code=status.HTTP_201_CREATED)
def purchase_batch(
    payload: ShopBatchCommandInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        campaign_access(connection, payload.campanha_id, user.id)
        fingerprint = command_fingerprint(payload)
        replay = get_economy_command_replay(
            connection,
            campaign_id=payload.campanha_id,
            user_id=user.id,
            command_type="loja.compra",
            idempotency_key=payload.idempotencia,
            fingerprint=fingerprint,
        )
        if replay is not None:
            return replay.replay_result
        character = _owned_character(
            connection,
            payload.campanha_id,
            payload.personagem_id,
            user.id,
            lock=True,
        )
        command = begin_economy_command(
            connection,
            campaign_id=payload.campanha_id,
            user_id=user.id,
            command_type="loja.compra",
            idempotency_key=payload.idempotencia,
            fingerprint=fingerprint,
        )
        if command.replay_result is not None:
            return command.replay_result
        _require_expected_version(character, payload.economia_versao_esperada)

        requested_ids = [line.item_id for line in payload.itens]
        catalog = {
            row["id"]: row
            for row in _visible_catalog_rows(
                connection,
                payload.campanha_id,
                requested_ids,
                lock=True,
            )
        }
        missing = next((item_id for item_id in requested_ids if item_id not in catalog), None)
        if missing:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"o item {missing} nao esta disponivel nesta loja",
            )

        totals: dict[str, dict[str, Any]] = {}
        purchased_items = []
        for line in payload.itens:
            item = catalog[line.item_id]
            price = resolve_catalog_price(item["conteudo"])
            if price is None:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"{item['titulo']} possui preco invalido no catalogo",
                )
            _add_total(totals, price.moeda, price.valor * line.quantidade)
            purchased_items.append(
                {
                    "item_id": item["id"],
                    "titulo": item["titulo"],
                    "quantidade": line.quantidade,
                }
            )

        wallet = _locked_wallet(connection, payload.campanha_id, payload.personagem_id)
        existing_inventory = _locked_inventory(
            connection,
            payload.campanha_id,
            payload.personagem_id,
            requested_ids,
        )
        for item_id, existing in existing_inventory.items():
            data = existing["dados"] if isinstance(existing["dados"], dict) else {}
            if data.get("origem") != "loja" or data.get("catalogo_item_id") != item_id:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"o item_id {item_id} ja e usado por um item sem origem verificavel",
                )

        debits = []
        for normalized, total in sorted(totals.items()):
            balance = wallet.get(normalized)
            current = int(balance["saldo"]) if balance else 0
            if current < total["valor"]:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail={
                        "mensagem": f"saldo insuficiente em {total['moeda']}",
                        "moeda": total["moeda"],
                        "necessario": total["valor"],
                        "disponivel": current,
                    },
                )
            remaining = current - int(total["valor"])
            connection.execute(
                """
                UPDATE saldos_personagem
                SET saldo=%s, atualizado_em=CURRENT_TIMESTAMP
                WHERE campanha_id=%s AND personagem_id=%s AND moeda=%s
                """,
                (
                    remaining,
                    payload.campanha_id,
                    payload.personagem_id,
                    balance["moeda"],
                ),
            )
            debits.append(
                {
                    "moeda": balance["moeda"],
                    "valor": int(total["valor"]),
                    "saldo": remaining,
                }
            )

        for line in payload.itens:
            item = catalog[line.item_id]
            existing = existing_inventory.get(line.item_id, {})
            existing_quantity = int(existing.get("quantidade", 0))
            new_quantity = existing_quantity + line.quantidade
            if new_quantity > 1_000_000:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"a quantidade de {item['titulo']} excede o limite do inventario",
                )
            existing_data = existing.get("dados") if isinstance(existing.get("dados"), dict) else {}
            editable_state = _editable_instance_metadata(existing_data)
            item_data = {
                **editable_state,
                **(item["conteudo"] or {}),
                "tipo": item["tipo"],
                "categoria": _inventory_category(item["tipo"]),
                "origem": "loja",
                "catalogo_item_id": item["id"],
            }
            connection.execute(
                """
                INSERT INTO inventario_personagem
                    (campanha_id, personagem_id, item_id, titulo, quantidade, dados)
                VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT (campanha_id, personagem_id, item_id) DO UPDATE SET
                    titulo=EXCLUDED.titulo,
                    quantidade=EXCLUDED.quantidade,
                    dados=EXCLUDED.dados,
                    atualizado_em=CURRENT_TIMESTAMP
                """,
                (
                    payload.campanha_id,
                    payload.personagem_id,
                    item["id"],
                    item["titulo"],
                    new_quantity,
                    Jsonb(item_data),
                ),
            )

        version = connection.execute(
            """
            UPDATE personagens
            SET economia_versao=economia_versao+1, atualizado_em=CURRENT_TIMESTAMP
            WHERE id=%s
            RETURNING economia_versao
            """,
            (payload.personagem_id,),
        ).fetchone()["economia_versao"]
        _record_wallet_ledger(
            connection,
            operation_id=command.id,
            campaign_id=payload.campanha_id,
            character_id=payload.personagem_id,
            actor_user_id=user.id,
            origin="loja.compra",
            movements=debits,
            sign=-1,
        )
        result = {
            "operacao_id": str(command.id),
            "repetida": False,
            "economia_versao": int(version),
            "debitos": debits,
            "itens": purchased_items,
        }
        record_audit(
            connection,
            action="loja.compra_lote",
            actor_user_id=user.id,
            campaign_id=payload.campanha_id,
            target_type="personagem",
            target_id=str(payload.personagem_id),
            details={"operacao_id": str(command.id), "debitos": debits, "itens": purchased_items},
        )
        complete_economy_command(connection, command.id, result)
    return result


@router.post("/vendas", status_code=status.HTTP_201_CREATED)
def sell_batch(
    payload: ShopBatchCommandInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        campaign_access(connection, payload.campanha_id, user.id)
        fingerprint = command_fingerprint(payload)
        replay = get_economy_command_replay(
            connection,
            campaign_id=payload.campanha_id,
            user_id=user.id,
            command_type="loja.venda",
            idempotency_key=payload.idempotencia,
            fingerprint=fingerprint,
        )
        if replay is not None:
            return replay.replay_result
        character = _owned_character(
            connection,
            payload.campanha_id,
            payload.personagem_id,
            user.id,
            lock=True,
        )
        command = begin_economy_command(
            connection,
            campaign_id=payload.campanha_id,
            user_id=user.id,
            command_type="loja.venda",
            idempotency_key=payload.idempotencia,
            fingerprint=fingerprint,
        )
        if command.replay_result is not None:
            return command.replay_result
        _require_expected_version(character, payload.economia_versao_esperada)
        requested_ids = [line.item_id for line in payload.itens]

        # Ordem global dos locks econômicos: personagem, carteira, inventário.
        wallet = _locked_wallet(connection, payload.campanha_id, payload.personagem_id)
        inventory = _locked_inventory(
            connection,
            payload.campanha_id,
            payload.personagem_id,
            requested_ids,
        )
        missing = next((item_id for item_id in requested_ids if item_id not in inventory), None)
        if missing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"o item {missing} nao esta mais no inventario",
            )

        for item_id, item in inventory.items():
            data = item["dados"] if isinstance(item["dados"], dict) else {}
            if (
                data.get("origem") != "loja"
                or data.get("catalogo_item_id") != item_id
            ):
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"o item {item_id} nao possui origem de loja verificavel",
                )

        catalog = {
            row["id"]: row
            for row in _active_catalog_rows(connection, requested_ids, lock=True)
        }
        missing_catalog = next((item_id for item_id in requested_ids if item_id not in catalog), None)
        if missing_catalog:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"o item {missing_catalog} nao existe mais no catalogo ativo",
            )

        totals: dict[str, dict[str, Any]] = {}
        sold_items = []
        for line in payload.itens:
            stock = inventory[line.item_id]
            if int(stock["quantidade"]) < line.quantidade:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail={
                        "mensagem": f"quantidade insuficiente de {stock['titulo']}",
                        "item_id": line.item_id,
                        "disponivel": int(stock["quantidade"]),
                    },
                )
            catalog_item = catalog[line.item_id]
            price = resolve_catalog_price(catalog_item["conteudo"])
            if price is None:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"{catalog_item['titulo']} possui preco invalido no catalogo",
                )
            reward = resale_value(price)
            _add_total(totals, reward.moeda, reward.valor * line.quantidade)
            sold_items.append(
                {
                    "item_id": line.item_id,
                    "titulo": stock["titulo"],
                    "quantidade": line.quantidade,
                }
            )

        credits = []
        for normalized, total in sorted(totals.items()):
            balance = wallet.get(normalized)
            current = int(balance["saldo"]) if balance else 0
            new_balance = current + int(total["valor"])
            if new_balance > MAX_ECONOMY_AMOUNT:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"o saldo em {total['moeda']} excederia o limite economico",
                )
            row = connection.execute(
                """
                INSERT INTO saldos_personagem
                    (campanha_id, personagem_id, moeda, saldo)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (campanha_id, personagem_id, moeda) DO UPDATE SET
                    saldo=EXCLUDED.saldo,
                    atualizado_em=CURRENT_TIMESTAMP
                RETURNING moeda, saldo
                """,
                (
                    payload.campanha_id,
                    payload.personagem_id,
                    balance["moeda"] if balance else total["moeda"],
                    new_balance,
                ),
            ).fetchone()
            credits.append(
                {"moeda": row["moeda"], "valor": int(total["valor"]), "saldo": int(row["saldo"])}
            )

        for line in payload.itens:
            remaining = int(inventory[line.item_id]["quantidade"]) - line.quantidade
            if remaining:
                connection.execute(
                    """
                    UPDATE inventario_personagem
                    SET quantidade=%s, atualizado_em=CURRENT_TIMESTAMP
                    WHERE campanha_id=%s AND personagem_id=%s AND item_id=%s
                    """,
                    (remaining, payload.campanha_id, payload.personagem_id, line.item_id),
                )
            else:
                connection.execute(
                    """
                    DELETE FROM inventario_personagem
                    WHERE campanha_id=%s AND personagem_id=%s AND item_id=%s
                    """,
                    (payload.campanha_id, payload.personagem_id, line.item_id),
                )

        version = connection.execute(
            """
            UPDATE personagens
            SET economia_versao=economia_versao+1, atualizado_em=CURRENT_TIMESTAMP
            WHERE id=%s
            RETURNING economia_versao
            """,
            (payload.personagem_id,),
        ).fetchone()["economia_versao"]
        _record_wallet_ledger(
            connection,
            operation_id=command.id,
            campaign_id=payload.campanha_id,
            character_id=payload.personagem_id,
            actor_user_id=user.id,
            origin="loja.venda",
            movements=credits,
            sign=1,
        )
        result = {
            "operacao_id": str(command.id),
            "repetida": False,
            "economia_versao": int(version),
            "creditos": credits,
            "itens": sold_items,
        }
        record_audit(
            connection,
            action="loja.venda_lote",
            actor_user_id=user.id,
            campaign_id=payload.campanha_id,
            target_type="personagem",
            target_id=str(payload.personagem_id),
            details={"operacao_id": str(command.id), "creditos": credits, "itens": sold_items},
        )
        complete_economy_command(connection, command.id, result)
    return result
