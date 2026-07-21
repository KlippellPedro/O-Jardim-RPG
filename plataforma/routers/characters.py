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
from schemas import CharacterCreateInput, CharacterUpdateInput, EconomyReplaceInput


router = APIRouter(prefix="/personagens", tags=["personagens"])
_CENTRAL_FIELDS = {"carteira", "inventario", "lunaris"}


def _sheet_without_central_fields(sheet: dict) -> dict:
    """Evita duas fontes de verdade para economia e inventario."""
    return {key: value for key, value in sheet.items() if key not in _CENTRAL_FIELDS}


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
