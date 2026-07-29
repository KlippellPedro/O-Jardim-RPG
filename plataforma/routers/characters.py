from __future__ import annotations

from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from psycopg.types.json import Jsonb

from core.audit import record_audit
from core.character_summary import validar_arvore_raca_classe
from core.database import Database
from core.economy_commands import MAX_ECONOMY_AMOUNT
from core.economy_models import (
    AdjustInventoryQuantityOperation,
    AdjustWalletBalanceOperation,
    CreateManualItemOperation,
    DiscardInventoryItemOperation,
    EconomyOperationsInput,
    EditInventoryItemOperation,
    ReorderInventoryOperation,
    is_manual_item_id,
)
from core.dependencies import (
    AuthenticatedUser,
    campaign_access,
    get_current_user,
    get_database,
    require_csrf,
)
from schemas import CharacterCreateInput, CharacterUpdateInput, EconomyReplaceInput


router = APIRouter(prefix="/personagens", tags=["personagens"])
_CENTRAL_FIELDS = {"carteira", "inventario", "lunaris"}
_PROTECTED_INVENTORY_DATA_KEYS = {
    "catalogo_item_id",
    "custo",
    "loja_item_id",
    "moeda",
    "origem",
    "preco",
    "precos",
    "preço",
    "preços",
    "proveniencia",
    "proveniência",
    "recompensa_id",
    "tipo",
    "tipo_catalogo",
    "valor",
    "valor_compra",
    "valor_venda",
}


def _sheet_without_central_fields(sheet: dict) -> dict:
    """Evita duas fontes de verdade para economia e inventario."""
    return {key: value for key, value in sheet.items() if key not in _CENTRAL_FIELDS}


def _is_protected_inventory_data_key(key: str) -> bool:
    normalized = str(key).strip().casefold()
    protected_prefixes = (
        "_",
        "catalogo_",
        "loja_",
        "preco_",
        "preço_",
        "proveniencia_",
        "proveniência_",
        "recompensa_",
    )
    return normalized.startswith(protected_prefixes) or normalized in _PROTECTED_INVENTORY_DATA_KEYS


def _editable_inventory_data(desired: dict, current: dict | None = None) -> dict:
    """Aceita metadados de UI sem deixar o cliente reescrever proveniencia/preco."""
    result = {
        key: value
        for key, value in desired.items()
        if not _is_protected_inventory_data_key(key)
    }
    for key, value in (current or {}).items():
        if _is_protected_inventory_data_key(key):
            result[key] = value
    return result


def _is_manual_inventory_item(item: dict) -> bool:
    data = item.get("dados") or {}
    return is_manual_item_id(str(item.get("item_id") or "")) and data.get("origem") == "manual"


def _currency_key(value: str) -> str:
    return " ".join(value.strip().split()).casefold()


def _authorized_character(connection, character_id: UUID, user_id: UUID):
    row = connection.execute(
        """
        SELECT p.*, m.papel
        FROM personagens p
        JOIN membros_campanha m
          ON m.campanha_id=p.campanha_id AND m.usuario_id=%s
        WHERE p.id=%s AND p.status='ativo' AND m.status='ativo'
        """,
        (user_id, character_id),
    ).fetchone()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="personagem nao encontrado")
    if row["papel"] not in {"mestre", "assistente"} and row["dono_usuario_id"] != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="personagem nao encontrado")
    return row


@router.post("", status_code=status.HTTP_201_CREATED)
def create_character(
    payload: CharacterCreateInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    character_id = uuid4()
    with database.connection() as connection:
        access = campaign_access(connection, payload.campanha_id, user.id)
        if access.role == "observador":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="observadores nao criam personagens")
        owner_id = payload.dono_usuario_id or user.id
        if owner_id != user.id and not access.manages_content:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="jogador so pode criar o proprio personagem")
        if not access.manages_content:
            # Mestre/assistente pode criar qualquer combinação (NPCs, testes);
            # jogador comum fica preso à Árvore escolhida e ao que foi liberado.
            campanha_row = connection.execute(
                "SELECT configuracoes FROM campanhas WHERE id=%s", (payload.campanha_id,)
            ).fetchone()
            erro_catalogo = validar_arvore_raca_classe(
                payload.ficha.get("arvoreId"),
                payload.ficha.get("racaId"),
                payload.ficha.get("classeId"),
                campanha_row["configuracoes"] if campanha_row else None,
            )
            if erro_catalogo:
                raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=erro_catalogo)
        owner = connection.execute(
            """
            SELECT 1 FROM membros_campanha
            WHERE campanha_id=%s AND usuario_id=%s AND status='ativo'
            """,
            (payload.campanha_id, owner_id),
        ).fetchone()
        if not owner:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="o dono deve ser membro da campanha")
        connection.execute(
            """
            INSERT INTO personagens
                (id, campanha_id, dono_usuario_id, nome, ficha, criado_por)
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (
                character_id,
                payload.campanha_id,
                owner_id,
                payload.nome,
                Jsonb(_sheet_without_central_fields(payload.ficha)),
                user.id,
            ),
        )
        record_audit(
            connection,
            action="personagem.criado",
            actor_user_id=user.id,
            campaign_id=payload.campanha_id,
            target_type="personagem",
            target_id=str(character_id),
            details={"dono_usuario_id": str(owner_id), "nome": payload.nome},
        )
    return {
        "id": character_id,
        "campanha_id": payload.campanha_id,
        "dono_usuario_id": owner_id,
        "nome": payload.nome,
        "ficha": _sheet_without_central_fields(payload.ficha),
        "versao": 1,
        "economia_versao": 1,
        "status": "ativo",
    }


@router.get("")
def list_characters(
    campanha_id: UUID,
    completo: bool = False,
    user: AuthenticatedUser = Depends(get_current_user),
    database: Database = Depends(get_database),
):
    """`completo=true` já traz carteira e inventário de cada personagem.

    Sem isso o módulo Ficha listava e depois pedia cada personagem
    individualmente — sete idas ao servidor para seis fichas.
    """
    with database.connection() as connection:
        access = campaign_access(connection, campanha_id, user.id)
        if access.manages_content:
            rows = connection.execute(
                """
                SELECT p.id, p.campanha_id, p.dono_usuario_id, p.nome,
                       p.ficha, p.versao, p.economia_versao, p.status, p.atualizado_em,
                       u.nome_exibicao AS dono_nome
                FROM personagens p
                LEFT JOIN usuarios u ON u.id=p.dono_usuario_id
                WHERE p.campanha_id=%s AND p.status='ativo'
                ORDER BY p.nome
                """,
                (campanha_id,),
            ).fetchall()
        else:
            rows = connection.execute(
                """
                SELECT p.id, p.campanha_id, p.dono_usuario_id, p.nome,
                       p.ficha, p.versao, p.economia_versao, p.status, p.atualizado_em,
                       u.nome_exibicao AS dono_nome
                FROM personagens p
                LEFT JOIN usuarios u ON u.id=p.dono_usuario_id
                WHERE p.campanha_id=%s AND p.dono_usuario_id=%s
                  AND p.status='ativo'
                ORDER BY p.nome
                """,
                (campanha_id, user.id),
            ).fetchall()

        personagens = [dict(row) for row in rows]
        if completo and personagens:
            ids = [item["id"] for item in personagens]
            carteiras: dict[UUID, list] = {}
            for saldo in connection.execute(
                """
                SELECT personagem_id, moeda, saldo FROM saldos_personagem
                WHERE campanha_id=%s AND personagem_id = ANY(%s)
                ORDER BY moeda
                """,
                (campanha_id, ids),
            ).fetchall():
                carteiras.setdefault(saldo["personagem_id"], []).append(
                    {"moeda": saldo["moeda"], "saldo": saldo["saldo"]}
                )
            inventarios: dict[UUID, list] = {}
            for item in connection.execute(
                """
                SELECT personagem_id, item_id, titulo, quantidade, dados, atualizado_em
                FROM inventario_personagem
                WHERE campanha_id=%s AND personagem_id = ANY(%s)
                ORDER BY titulo
                """,
                (campanha_id, ids),
            ).fetchall():
                registro = dict(item)
                inventarios.setdefault(registro.pop("personagem_id"), []).append(registro)
            for personagem in personagens:
                personagem["carteira"] = carteiras.get(personagem["id"], [])
                personagem["inventario_central"] = inventarios.get(personagem["id"], [])

    return {"personagens": personagens}


@router.get("/{character_id}")
def get_character(
    character_id: UUID,
    user: AuthenticatedUser = Depends(get_current_user),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        row = _authorized_character(connection, character_id, user.id)
        balances = connection.execute(
            """
            SELECT moeda, saldo FROM saldos_personagem
            WHERE campanha_id=%s AND personagem_id=%s ORDER BY moeda
            """,
            (row["campanha_id"], character_id),
        ).fetchall()
        inventory = connection.execute(
            """
            SELECT item_id, titulo, quantidade, dados, atualizado_em
            FROM inventario_personagem
            WHERE campanha_id=%s AND personagem_id=%s ORDER BY titulo
            """,
            (row["campanha_id"], character_id),
        ).fetchall()
    result = dict(row)
    result.pop("papel", None)
    result["carteira"] = [dict(item) for item in balances]
    result["inventario_central"] = [dict(item) for item in inventory]
    return {"personagem": result}


@router.put("/{character_id}")
def update_character(
    character_id: UUID,
    payload: CharacterUpdateInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        current = _authorized_character(connection, character_id, user.id)
        name = payload.nome or current["nome"]
        row = connection.execute(
            """
            UPDATE personagens
            SET nome=%s, ficha=%s, versao=versao+1,
                atualizado_em=CURRENT_TIMESTAMP
            WHERE id=%s AND versao=%s AND status='ativo'
            RETURNING id, campanha_id, dono_usuario_id, nome, ficha,
                      versao, status, atualizado_em
            """,
            (
                name,
                Jsonb(_sheet_without_central_fields(payload.ficha)),
                character_id,
                payload.versao_esperada,
            ),
        ).fetchone()
        if not row:
            actual = connection.execute(
                "SELECT versao FROM personagens WHERE id=%s",
                (character_id,),
            ).fetchone()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "mensagem": "a ficha foi alterada em outro lugar; recarregue antes de salvar",
                    "versao_atual": actual["versao"] if actual else None,
                },
            )
        record_audit(
            connection,
            action="personagem.atualizado",
            actor_user_id=user.id,
            campaign_id=current["campanha_id"],
            target_type="personagem",
            target_id=str(character_id),
            details={"versao": row["versao"]},
        )
    return {"personagem": dict(row)}


@router.post("/{character_id}/economia/operacoes")
def apply_character_economy_operations(
    character_id: UUID,
    payload: EconomyOperationsInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    """Aplica um lote economico validado e incrementa a versao uma unica vez.

    Jogadores podem administrar metadados, ordem e consumo do proprio
    inventario. Somente gestores alteram saldo; itens recebidos da loja ou de
    recompensas nunca podem ser aumentados por um jogador comum.
    """
    with database.connection() as connection:
        current = _authorized_character(connection, character_id, user.id)
        is_manager = current["papel"] in {"mestre", "assistente"}
        if not is_manager and any(
            isinstance(operation, AdjustWalletBalanceOperation)
            for operation in payload.operacoes
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="somente mestre ou assistente pode ajustar saldos",
            )

        locked = connection.execute(
            """
            SELECT economia_versao FROM personagens
            WHERE id=%s AND status='ativo' FOR UPDATE
            """,
            (character_id,),
        ).fetchone()
        actual_version = int(locked["economia_versao"]) if locked else None
        if actual_version != payload.versao_esperada:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "mensagem": "a economia mudou; recarregue antes de aplicar as operacoes",
                    "versao_atual": actual_version,
                },
            )

        inventory_rows = connection.execute(
            """
            SELECT item_id, titulo, quantidade, dados
            FROM inventario_personagem
            WHERE campanha_id=%s AND personagem_id=%s
            """,
            (current["campanha_id"], character_id),
        ).fetchall()
        inventory = {row["item_id"]: dict(row) for row in inventory_rows}
        initial_item_ids = set(inventory)

        balance_rows = connection.execute(
            """
            SELECT moeda, saldo FROM saldos_personagem
            WHERE campanha_id=%s AND personagem_id=%s
            """,
            (current["campanha_id"], character_id),
        ).fetchall()
        balances: dict[str, dict] = {}
        for balance in balance_rows:
            key = _currency_key(balance["moeda"])
            if key in balances:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="a carteira possui moedas duplicadas por capitalizacao; normalize-a como gestor",
                )
            balances[key] = dict(balance)

        changed_items: dict[str, dict] = {}
        deleted_item_ids: set[str] = set()
        ledger_entries: list[dict] = []

        for operation in payload.operacoes:
            if isinstance(operation, CreateManualItemOperation):
                if operation.item_id in initial_item_ids or operation.item_id in inventory:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail=f"item {operation.item_id} ja existe",
                    )
                catalog_item = connection.execute(
                    "SELECT 1 FROM catalogo_itens WHERE id=%s",
                    (operation.item_id,),
                ).fetchone()
                if catalog_item:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail="item manual nao pode reutilizar um id do catalogo",
                    )
                data = _editable_inventory_data(operation.dados)
                data["origem"] = "manual"
                item = {
                    "item_id": operation.item_id,
                    "titulo": operation.titulo,
                    "quantidade": operation.quantidade,
                    "dados": data,
                }
                inventory[operation.item_id] = item
                changed_items[operation.item_id] = item
                deleted_item_ids.discard(operation.item_id)
                ledger_entries.append(
                    {
                        "item_id": operation.item_id,
                        "delta": operation.quantidade,
                        "motivo": "item manual criado na ficha",
                    }
                )
                continue

            if isinstance(operation, EditInventoryItemOperation):
                item = inventory.get(operation.item_id)
                if not item:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail=f"item {operation.item_id} nao existe mais",
                    )
                current_data = item.get("dados") if isinstance(item.get("dados"), dict) else {}
                updated = {
                    **item,
                    "titulo": operation.titulo or item["titulo"],
                    "dados": (
                        _editable_inventory_data(operation.dados, current_data)
                        if operation.dados is not None
                        else current_data
                    ),
                }
                inventory[operation.item_id] = updated
                changed_items[operation.item_id] = updated
                continue

            if isinstance(operation, AdjustInventoryQuantityOperation):
                item = inventory.get(operation.item_id)
                if not item:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail=f"item {operation.item_id} nao existe mais",
                    )
                if operation.delta > 0 and not is_manager and not _is_manual_inventory_item(item):
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="jogador nao pode aumentar item recebido da loja ou de recompensa",
                    )
                new_quantity = int(item["quantidade"]) + operation.delta
                if new_quantity < 0:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail=f"quantidade insuficiente de {item['titulo']}",
                    )
                if new_quantity > 1_000_000:
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                        detail=f"a quantidade de {item['titulo']} excede o limite do inventario",
                    )
                if new_quantity == 0:
                    inventory.pop(operation.item_id)
                    changed_items.pop(operation.item_id, None)
                    deleted_item_ids.add(operation.item_id)
                else:
                    updated = {**item, "quantidade": new_quantity}
                    inventory[operation.item_id] = updated
                    changed_items[operation.item_id] = updated
                ledger_entries.append(
                    {
                        "item_id": operation.item_id,
                        "delta": operation.delta,
                        "motivo": "quantidade ajustada pela ficha",
                    }
                )
                continue

            if isinstance(operation, DiscardInventoryItemOperation):
                item = inventory.pop(operation.item_id, None)
                if not item:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail=f"item {operation.item_id} nao existe mais",
                    )
                changed_items.pop(operation.item_id, None)
                deleted_item_ids.add(operation.item_id)
                ledger_entries.append(
                    {
                        "item_id": operation.item_id,
                        "delta": -int(item["quantidade"]),
                        "motivo": "item descartado pela ficha",
                    }
                )
                continue

            if isinstance(operation, ReorderInventoryOperation):
                if set(operation.item_ids) != set(inventory):
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail="reordenar deve listar exatamente os itens atuais",
                    )
                for order, item_id in enumerate(operation.item_ids):
                    item = inventory[item_id]
                    current_data = item.get("dados") if isinstance(item.get("dados"), dict) else {}
                    updated = {**item, "dados": {**current_data, "ordem": order}}
                    inventory[item_id] = updated
                    changed_items[item_id] = updated
                continue

            if isinstance(operation, AdjustWalletBalanceOperation):
                key = _currency_key(operation.moeda)
                balance = balances.get(key)
                current_balance = int(balance["saldo"]) if balance else 0
                new_balance = current_balance + operation.delta
                if new_balance < 0:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail=f"saldo insuficiente de {operation.moeda}",
                    )
                if new_balance > MAX_ECONOMY_AMOUNT:
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                        detail=f"o saldo em {operation.moeda} excederia o limite economico",
                    )
                currency_name = balance["moeda"] if balance else operation.moeda
                if new_balance == 0:
                    if balance:
                        connection.execute(
                            """
                            DELETE FROM saldos_personagem
                            WHERE campanha_id=%s AND personagem_id=%s AND moeda=%s
                            """,
                            (current["campanha_id"], character_id, currency_name),
                        )
                    balances.pop(key, None)
                elif balance:
                    connection.execute(
                        """
                        UPDATE saldos_personagem
                        SET saldo=%s, atualizado_em=CURRENT_TIMESTAMP
                        WHERE campanha_id=%s AND personagem_id=%s AND moeda=%s
                        """,
                        (
                            new_balance,
                            current["campanha_id"],
                            character_id,
                            currency_name,
                        ),
                    )
                    balances[key] = {"moeda": currency_name, "saldo": new_balance}
                else:
                    connection.execute(
                        """
                        INSERT INTO saldos_personagem
                            (campanha_id, personagem_id, moeda, saldo)
                        VALUES (%s, %s, %s, %s)
                        """,
                        (
                            current["campanha_id"],
                            character_id,
                            currency_name,
                            new_balance,
                        ),
                    )
                    balances[key] = {"moeda": currency_name, "saldo": new_balance}
                ledger_entries.append(
                    {
                        "moeda": currency_name,
                        "delta": operation.delta,
                        "saldo_apos": new_balance,
                        "motivo": operation.motivo,
                    }
                )

        for item_id in deleted_item_ids:
            connection.execute(
                """
                DELETE FROM inventario_personagem
                WHERE campanha_id=%s AND personagem_id=%s AND item_id=%s
                """,
                (current["campanha_id"], character_id, item_id),
            )
        for item in changed_items.values():
            connection.execute(
                """
                INSERT INTO inventario_personagem
                    (campanha_id, personagem_id, item_id, titulo, quantidade, dados)
                VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT (campanha_id, personagem_id, item_id)
                DO UPDATE SET titulo=EXCLUDED.titulo,
                              quantidade=EXCLUDED.quantidade,
                              dados=EXCLUDED.dados,
                              atualizado_em=CURRENT_TIMESTAMP
                """,
                (
                    current["campanha_id"],
                    character_id,
                    item["item_id"],
                    item["titulo"],
                    item["quantidade"],
                    Jsonb(item["dados"]),
                ),
            )

        ledger_origin = "site-manager" if is_manager else "site-ficha"
        for entry in ledger_entries:
            connection.execute(
                """
                INSERT INTO lancamentos_economia
                    (id, campanha_id, personagem_id, moeda, item_id, delta,
                     saldo_apos, motivo, origem, ator_usuario_id)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    uuid4(),
                    current["campanha_id"],
                    character_id,
                    entry.get("moeda"),
                    entry.get("item_id"),
                    entry["delta"],
                    entry.get("saldo_apos"),
                    entry["motivo"],
                    ledger_origin,
                    user.id,
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
            (character_id,),
        ).fetchone()
        if not version_row:
            raise RuntimeError("personagem bloqueado deixou de estar ativo durante a transacao")

        authoritative_balances = connection.execute(
            """
            SELECT moeda, saldo FROM saldos_personagem
            WHERE campanha_id=%s AND personagem_id=%s ORDER BY moeda
            """,
            (current["campanha_id"], character_id),
        ).fetchall()
        authoritative_inventory = connection.execute(
            """
            SELECT item_id, titulo, quantidade, dados, atualizado_em
            FROM inventario_personagem
            WHERE campanha_id=%s AND personagem_id=%s ORDER BY titulo, item_id
            """,
            (current["campanha_id"], character_id),
        ).fetchall()
        economy_version = int(version_row["economia_versao"])
        record_audit(
            connection,
            action="personagem.economia_operacoes_aplicadas",
            actor_user_id=user.id,
            campaign_id=current["campanha_id"],
            target_type="personagem",
            target_id=str(character_id),
            details={
                "operacoes": len(payload.operacoes),
                "lancamentos": len(ledger_entries),
                "economia_versao": economy_version,
            },
        )

    return {
        "economia_versao": economy_version,
        "carteira": [dict(row) for row in authoritative_balances],
        "inventario": [dict(row) for row in authoritative_inventory],
    }


@router.put("/{character_id}/economia")
def replace_character_economy(
    character_id: UUID,
    payload: EconomyReplaceInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    """Sincroniza carteira/inventario da ficha com controle de concorrencia."""
    with database.connection() as connection:
        current = _authorized_character(connection, character_id, user.id)
        if current["papel"] not in {"mestre", "assistente"}:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    "jogadores nao podem substituir carteira ou inventario; "
                    "use as operacoes economicas autorizadas"
                ),
            )
        locked = connection.execute(
            """
            SELECT economia_versao FROM personagens
            WHERE id=%s AND status='ativo' FOR UPDATE
            """,
            (character_id,),
        ).fetchone()
        if not locked or int(locked["economia_versao"]) != payload.versao_esperada:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "mensagem": "o inventario foi alterado em outro lugar; recarregue antes de salvar",
                    "versao_atual": int(locked["economia_versao"]) if locked else None,
                },
            )

        connection.execute(
            "DELETE FROM saldos_personagem WHERE campanha_id=%s AND personagem_id=%s",
            (current["campanha_id"], character_id),
        )
        for wallet in payload.carteira:
            connection.execute(
                """
                INSERT INTO saldos_personagem (campanha_id, personagem_id, moeda, saldo)
                VALUES (%s, %s, %s, %s)
                """,
                (current["campanha_id"], character_id, wallet.moeda.strip(), wallet.saldo),
            )

        connection.execute(
            "DELETE FROM inventario_personagem WHERE campanha_id=%s AND personagem_id=%s",
            (current["campanha_id"], character_id),
        )
        for item in payload.inventario:
            connection.execute(
                """
                INSERT INTO inventario_personagem
                    (campanha_id, personagem_id, item_id, titulo, quantidade, dados)
                VALUES (%s, %s, %s, %s, %s, %s)
                """,
                (
                    current["campanha_id"],
                    character_id,
                    item.item_id,
                    item.titulo,
                    item.quantidade,
                    Jsonb(item.dados),
                ),
            )

        row = connection.execute(
            """
            UPDATE personagens
            SET economia_versao=economia_versao+1, atualizado_em=CURRENT_TIMESTAMP
            WHERE id=%s
            RETURNING economia_versao
            """,
            (character_id,),
        ).fetchone()
        record_audit(
            connection,
            action="personagem.economia_sincronizada",
            actor_user_id=user.id,
            campaign_id=current["campanha_id"],
            target_type="personagem",
            target_id=str(character_id),
            details={
                "moedas": len(payload.carteira),
                "itens": len(payload.inventario),
                "versao": row["economia_versao"],
            },
        )
    return {"economia_versao": row["economia_versao"]}


@router.delete("/{character_id}", status_code=status.HTTP_204_NO_CONTENT)
def archive_character(
    character_id: UUID,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        current = _authorized_character(connection, character_id, user.id)
        connection.execute(
            """
            UPDATE personagens SET status='arquivado', atualizado_em=CURRENT_TIMESTAMP
            WHERE id=%s
            """,
            (character_id,),
        )
        record_audit(
            connection,
            action="personagem.arquivado",
            actor_user_id=user.id,
            campaign_id=current["campanha_id"],
            target_type="personagem",
            target_id=str(character_id),
        )
    return None
