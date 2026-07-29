from __future__ import annotations

from typing import Any
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
    require_campaign_manager,
    require_csrf,
)
from core.economy_commands import (
    MAX_ECONOMY_AMOUNT,
    begin_economy_command,
    command_fingerprint,
    complete_economy_command,
    get_economy_command_replay,
    normalize_currency,
)
from core.notifications import notify
from schemas import BountyClaimCommandInput, BountyResolveCommandInput


router = APIRouter(prefix="/campanhas/{campanha_id}/recompensas", tags=["economia"])


def _locked_characters(connection, campaign_id: UUID, character_ids: list[UUID]):
    rows = connection.execute(
        """
        SELECT id, nome, dono_usuario_id, economia_versao, status
        FROM personagens
        WHERE campanha_id=%s AND id = ANY(%s)
        ORDER BY id
        FOR UPDATE
        """,
        (campaign_id, character_ids),
    ).fetchall()
    return {row["id"]: row for row in rows}


def _locked_bounty_for_target(connection, campaign_id: UUID, target_owner_id: UUID):
    return connection.execute(
        """
        SELECT r.guild_id, r.alvo_user_id,
               r.valor_jogadores, r.valor_sistema,
               (r.valor_jogadores + r.valor_sistema) AS valor_total
        FROM campanhas_discord cgd
        JOIN contas_discord cd ON cd.usuario_id=%s
        JOIN recompensa r
          ON r.guild_id=cgd.discord_guild_id
         AND r.alvo_user_id=cd.discord_user_id
        WHERE cgd.campanha_id=%s
        FOR UPDATE OF r
        """,
        (target_owner_id, campaign_id),
    ).fetchone()


def _bounty_total(row) -> int | None:
    if not row:
        return None
    player_value = int(row["valor_jogadores"])
    system_value = int(row["valor_sistema"])
    total = player_value + system_value
    if player_value < 0 or system_value < 0 or total <= 0 or total > MAX_ECONOMY_AMOUNT:
        return None
    return total


def _credit_lunaris(connection, campaign_id: UUID, character_id: UUID, amount: int):
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
    lunaris = [row for row in rows if normalize_currency(row["moeda"]) == "lunaris"]
    if len(lunaris) > 1:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="a carteira possui entradas duplicadas para Lunaris",
        )
    current = int(lunaris[0]["saldo"]) if lunaris else 0
    new_balance = current + amount
    if new_balance > MAX_ECONOMY_AMOUNT:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="a recompensa excederia o limite de saldo em Lunaris",
        )
    currency = lunaris[0]["moeda"] if lunaris else "Lunaris"
    row = connection.execute(
        """
        INSERT INTO saldos_personagem (campanha_id, personagem_id, moeda, saldo)
        VALUES (%s, %s, %s, %s)
        ON CONFLICT (campanha_id, personagem_id, moeda) DO UPDATE SET
            saldo=EXCLUDED.saldo,
            atualizado_em=CURRENT_TIMESTAMP
        RETURNING saldo
        """,
        (campaign_id, character_id, currency, new_balance),
    ).fetchone()
    return currency, int(row["saldo"])


@router.get("")
def listar_recompensas(
    campanha_id: UUID,
    user: AuthenticatedUser = Depends(get_current_user),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        campaign_access(connection, campanha_id, user.id)
        rows = connection.execute(
            """
            SELECT
                (r.valor_jogadores + r.valor_sistema) AS valor_total,
                r.alvo_user_id AS discord_alvo_id,
                p.id AS personagem_id,
                p.nome AS personagem_nome,
                p.dono_usuario_id,
                r.valor_sistema > 0 AS origem_sistema
            FROM recompensa r
            JOIN contas_discord cd ON cd.discord_user_id=r.alvo_user_id
            JOIN personagens p ON p.dono_usuario_id=cd.usuario_id
            JOIN campanhas_discord cgd ON cgd.discord_guild_id=r.guild_id
            WHERE cgd.campanha_id=%s
              AND p.campanha_id=%s
              AND p.status='ativo'
              AND (r.valor_jogadores + r.valor_sistema) > 0
            ORDER BY valor_total DESC, p.nome, p.id
            """,
            (campanha_id, campanha_id),
        ).fetchall()
    return {"recompensas": [dict(row) for row in rows]}


@router.get("/pendentes")
def listar_reivindicacoes_pendentes(
    campanha_id: UUID,
    user: AuthenticatedUser = Depends(get_current_user),
    database: Database = Depends(get_database),
):
    """Fila canônica compartilhada por mestre e assistentes da campanha."""

    with database.connection() as connection:
        require_campaign_manager(connection, campanha_id, user.id)
        rows = connection.execute(
            """
            SELECT id, campanha_id, categoria, mensagem, dados, criado_em
            FROM notificacoes
            WHERE campanha_id=%s
              AND categoria='economia'
              AND dados->>'tipo'='claim_recompensa'
              AND (
                    dados->>'status'='pendente'
                    OR (dados->>'status' IS NULL AND lida_em IS NULL)
              )
            ORDER BY criado_em, id
            """,
            (campanha_id,),
        ).fetchall()
    return {"reivindicacoes": [dict(row) for row in rows]}


@router.post("/reivindicar", status_code=status.HTTP_201_CREATED)
def reivindicar_recompensa(
    campanha_id: UUID,
    payload: BountyClaimCommandInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        access = campaign_access(connection, campanha_id, user.id)
        fingerprint = command_fingerprint(payload)
        replay = get_economy_command_replay(
            connection,
            campaign_id=campanha_id,
            user_id=user.id,
            command_type="recompensa.reivindicar",
            idempotency_key=payload.idempotencia,
            fingerprint=fingerprint,
        )
        if replay is not None:
            return replay.replay_result
        locked_characters = _locked_characters(
            connection,
            campanha_id,
            [payload.cacador_personagem_id, payload.alvo_personagem_id],
        )
        hunter = locked_characters.get(payload.cacador_personagem_id)
        target = locked_characters.get(payload.alvo_personagem_id)
        if not hunter or hunter["status"] != "ativo" or hunter["dono_usuario_id"] != user.id:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="o cacador precisa ser um personagem ativo seu desta campanha",
            )
        if not target or target["status"] != "ativo":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="personagem alvo nao encontrado nesta campanha",
            )
        if hunter["id"] == target["id"] or hunter["dono_usuario_id"] == target["dono_usuario_id"]:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="nao e permitido reivindicar recompensa contra si mesmo",
            )

        command = begin_economy_command(
            connection,
            campaign_id=campanha_id,
            user_id=user.id,
            command_type="recompensa.reivindicar",
            idempotency_key=payload.idempotencia,
            fingerprint=fingerprint,
        )
        if command.replay_result is not None:
            return command.replay_result

        # O lock da recompensa serializa reivindicacoes com chaves diferentes.
        bounty = _locked_bounty_for_target(connection, campanha_id, target["dono_usuario_id"])
        total = _bounty_total(bounty)
        if total is None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="a recompensa nao esta mais disponivel",
            )
        pending = connection.execute(
            """
            SELECT id
            FROM notificacoes
            WHERE campanha_id=%s
              AND categoria='economia'
              AND dados->>'tipo'='claim_recompensa'
              AND (
                    dados->>'status'='pendente'
                    OR (dados->>'status' IS NULL AND lida_em IS NULL)
              )
              AND dados->>'cacador_personagem_id'=%s
              AND (
                    dados->>'alvo_personagem_id'=%s
                    OR dados->>'alvo_discord_id'=%s
              )
            ORDER BY criado_em
            LIMIT 1
            FOR UPDATE
            """,
            (
                campanha_id,
                str(payload.cacador_personagem_id),
                str(payload.alvo_personagem_id),
                str(bounty["alvo_user_id"]),
            ),
        ).fetchone()
        if pending:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "mensagem": "ja existe uma reivindicacao pendente para este cacador e alvo",
                    "claim_id": str(pending["id"]),
                },
            )

        claim_id = uuid4()
        data = {
            "tipo": "claim_recompensa",
            "status": "pendente",
            "cacador_personagem_id": str(payload.cacador_personagem_id),
            "cacador_nome": hunter["nome"],
            "alvo_personagem_id": str(payload.alvo_personagem_id),
            "alvo_nome": target["nome"],
            "alvo_discord_id": bounty["alvo_user_id"],
            "guild_id": bounty["guild_id"],
            "valor_no_pedido": total,
            "valor_total": total,
            "comando_id": str(command.id),
        }
        connection.execute(
            """
            INSERT INTO notificacoes
                (id, usuario_id, campanha_id, origem_usuario_id,
                 categoria, titulo, mensagem, dados)
            VALUES (%s, %s, %s, %s, 'economia', %s, %s, %s)
            """,
            (
                claim_id,
                access.owner_id,
                campanha_id,
                user.id,
                "Reivindicacao de Recompensa",
                f"{hunter['nome']} reivindicou a recompensa por {target['nome']}.",
                Jsonb(data),
            ),
        )
        result = {
            "operacao_id": str(command.id),
            "repetida": False,
            "claim_id": str(claim_id),
            "status": "pendente",
            "valor_total": total,
        }
        record_audit(
            connection,
            action="recompensa.reivindicada",
            actor_user_id=user.id,
            campaign_id=campanha_id,
            target_type="recompensa",
            target_id=str(claim_id),
            details={
                "cacador_personagem_id": str(payload.cacador_personagem_id),
                "alvo_personagem_id": str(payload.alvo_personagem_id),
                "valor_derivado": total,
            },
        )
        complete_economy_command(connection, command.id, result)
    return result


def _resolved_result(command_id: UUID, claim_id: UUID, data: dict[str, Any]) -> dict[str, Any]:
    return {
        "operacao_id": str(command_id),
        "repetida": True,
        "claim_id": str(claim_id),
        "status": data["status"],
        "valor_pago": int(data.get("valor_pago") or 0),
        "saldo": data.get("saldo_apos"),
        "economia_versao": data.get("economia_versao"),
    }


@router.post("/resolver")
def resolver_recompensa(
    campanha_id: UUID,
    payload: BountyResolveCommandInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        require_campaign_manager(connection, campanha_id, user.id)
        fingerprint = command_fingerprint(payload)
        replay = get_economy_command_replay(
            connection,
            campaign_id=campanha_id,
            user_id=user.id,
            command_type="recompensa.resolver",
            idempotency_key=payload.idempotencia,
            fingerprint=fingerprint,
        )
        if replay is not None:
            return replay.replay_result
        pre_notification = connection.execute(
            """
            SELECT id, dados, lida_em
            FROM notificacoes
            WHERE id=%s AND campanha_id=%s AND categoria='economia'
            """,
            (payload.claim_id, campanha_id),
        ).fetchone()
        if not pre_notification:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="reivindicacao nao encontrada")
        pre_data = pre_notification["dados"] if isinstance(pre_notification["dados"], dict) else {}
        if pre_data.get("tipo") != "claim_recompensa":
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="reivindicacao nao encontrada")
        try:
            hunter_id = UUID(str(pre_data["cacador_personagem_id"]))
            target_id = UUID(str(pre_data["alvo_personagem_id"]))
        except (KeyError, TypeError, ValueError) as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="reivindicacao sem personagens validos",
            ) from exc

        # Ordem global: personagem antes da chave de comando e dos agregados.
        # O status é validado depois do replay para que uma resposta já
        # concluída continue consultável caso a ficha seja arquivada.
        characters_to_lock = [hunter_id, target_id] if payload.aprovado else [hunter_id]
        locked_characters = _locked_characters(
            connection,
            campanha_id,
            characters_to_lock,
        )
        hunter = locked_characters.get(hunter_id)
        target = locked_characters.get(target_id) if payload.aprovado else None
        if not hunter:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="o personagem cacador nao existe mais nesta campanha",
            )
        command = begin_economy_command(
            connection,
            campaign_id=campanha_id,
            user_id=user.id,
            command_type="recompensa.resolver",
            idempotency_key=payload.idempotencia,
            fingerprint=fingerprint,
        )
        if command.replay_result is not None:
            return command.replay_result

        notification = connection.execute(
            """
            SELECT id, dados, lida_em
            FROM notificacoes
            WHERE id=%s AND campanha_id=%s AND categoria='economia'
            FOR UPDATE
            """,
            (payload.claim_id, campanha_id),
        ).fetchone()
        if not notification:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="reivindicacao nao encontrada")
        data = notification["dados"] if isinstance(notification["dados"], dict) else {}
        if data.get("tipo") != "claim_recompensa":
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="reivindicacao nao encontrada")

        try:
            locked_hunter_id = UUID(str(data["cacador_personagem_id"]))
            locked_target_id = UUID(str(data["alvo_personagem_id"]))
        except (KeyError, TypeError, ValueError) as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="reivindicacao sem personagens validos",
            ) from exc
        if locked_hunter_id != hunter_id or locked_target_id != target_id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="os personagens da reivindicacao mudaram durante a resolucao",
            )

        claim_status = data.get("status")
        if notification["lida_em"] is not None and claim_status is None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="esta reivindicacao legada ja foi encerrada",
            )
        if claim_status in {"aprovada", "rejeitada"}:
            same_decision = (claim_status == "aprovada") == payload.aprovado
            if not same_decision:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"a reivindicacao ja foi {claim_status}",
                )
            result = _resolved_result(command.id, payload.claim_id, data)
            complete_economy_command(connection, command.id, result)
            return result
        if claim_status not in {None, "pendente"}:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="estado invalido da reivindicacao",
            )

        if payload.aprovado and (hunter["status"] != "ativo" or not target or target["status"] != "ativo"):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="cacador ou alvo nao esta mais ativo nesta campanha",
            )

        paid = 0
        balance = None
        economy_version = None
        if payload.aprovado:
            bounty = _locked_bounty_for_target(connection, campanha_id, target["dono_usuario_id"])
            current_total = _bounty_total(bounty)
            if current_total is None:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="a recompensa nao esta mais disponivel",
                )
            if (
                str(bounty["guild_id"]) != str(data.get("guild_id"))
                or str(bounty["alvo_user_id"]) != str(data.get("alvo_discord_id"))
            ):
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="o vinculo Discord da recompensa mudou desde a reivindicacao",
                )
            paid = current_total
            currency, balance = _credit_lunaris(connection, campanha_id, hunter_id, paid)
            deleted = connection.execute(
                "DELETE FROM recompensa WHERE guild_id=%s AND alvo_user_id=%s",
                (bounty["guild_id"], bounty["alvo_user_id"]),
            )
            if deleted.rowcount != 1:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="a recompensa foi consumida por outra operacao",
                )
            economy_version = int(
                connection.execute(
                    """
                    UPDATE personagens
                    SET economia_versao=economia_versao+1,
                        atualizado_em=CURRENT_TIMESTAMP
                    WHERE id=%s
                    RETURNING economia_versao
                    """,
                    (hunter_id,),
                ).fetchone()["economia_versao"]
            )
            connection.execute(
                """
                INSERT INTO lancamentos_economia
                    (id, campanha_id, personagem_id, moeda, delta, saldo_apos,
                     motivo, origem, idempotencia, ator_usuario_id)
                VALUES (%s, %s, %s, %s, %s, %s,
                        'Recompensa reivindicada', 'recompensa.aprovada', %s, %s)
                """,
                (
                    uuid4(),
                    campanha_id,
                    hunter_id,
                    currency,
                    paid,
                    balance,
                    f"claim:{payload.claim_id}",
                    user.id,
                ),
            )

        final_status = "aprovada" if payload.aprovado else "rejeitada"
        resolved_data = {
            **data,
            "status": final_status,
            "valor_pago": paid,
            "saldo_apos": balance,
            "economia_versao": economy_version,
            "resolvido_por": str(user.id),
            "comando_resolucao_id": str(command.id),
        }
        connection.execute(
            """
            UPDATE notificacoes
            SET dados=%s, lida_em=CURRENT_TIMESTAMP
            WHERE id=%s
            """,
            (Jsonb(resolved_data), payload.claim_id),
        )
        notify(
            connection,
            user_ids=[hunter["dono_usuario_id"]],
            category="economia",
            title="Recompensa aprovada" if payload.aprovado else "Recompensa rejeitada",
            message=(
                f"{hunter['nome']} recebeu {paid} Lunaris."
                if payload.aprovado
                else f"A reivindicacao de {hunter['nome']} foi rejeitada."
            ),
            campaign_id=campanha_id,
            actor_user_id=user.id,
            details={"claim_id": str(payload.claim_id), "status": final_status, "valor": paid},
        )
        result = {
            "operacao_id": str(command.id),
            "repetida": False,
            "claim_id": str(payload.claim_id),
            "status": final_status,
            "valor_pago": paid,
            "saldo": balance,
            "economia_versao": economy_version,
        }
        record_audit(
            connection,
            action=f"recompensa.{final_status}",
            actor_user_id=user.id,
            campaign_id=campanha_id,
            target_type="recompensa",
            target_id=str(payload.claim_id),
            details={
                "cacador_personagem_id": str(hunter_id),
                "alvo_personagem_id": str(target_id),
                "valor_derivado": paid,
            },
        )
        complete_economy_command(connection, command.id, result)
    return result
