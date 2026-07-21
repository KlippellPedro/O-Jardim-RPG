from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Response, status
from psycopg.errors import UniqueViolation
from psycopg.types.json import Jsonb

from core.audit import record_audit
from core.backup import gerar_backup, nome_do_arquivo
from core.notifications import notify
from core.database import Database
from core.dependencies import get_database, require_service_key
from core.security import hash_password, hash_token, new_temporary_password, normalize_human_code
from schemas import (
    CampaignDiscordLinkInput,
    ServiceAccountPasswordInput,
    DiscordVaultDepositInput,
    DiscordLinkConsumeInput,
    InventoryTransactionInput,
    WalletTransactionInput,
)


router = APIRouter(prefix="/interno", tags=["integracao-interna"])


def _lock_resource(connection, key: str) -> None:
    connection.execute(
        "SELECT pg_advisory_xact_lock(hashtextextended(%s, 0))",
        (key,),
    )


def _character_in_campaign(connection, campaign_id: UUID, character_id: UUID):
    row = connection.execute(
        """
        SELECT id, campanha_id, dono_usuario_id, nome
        FROM personagens
        WHERE id=%s AND campanha_id=%s AND status='ativo'
        """,
        (character_id, campaign_id),
    ).fetchone()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="personagem nao encontrado na campanha")
    return row


@router.post("/discord/vincular")
def consume_discord_link(
    payload: DiscordLinkConsumeInput,
    service: str = Depends(require_service_key),
    database: Database = Depends(get_database),
):
    code = normalize_human_code(payload.codigo)
    now = datetime.now(timezone.utc)
    try:
        with database.connection() as connection:
            link_code = connection.execute(
                """
                SELECT id, usuario_id, expira_em, consumido_em
                FROM codigos_vinculo_discord
                WHERE codigo_hash=%s FOR UPDATE
                """,
                (hash_token(code),),
            ).fetchone()
            if (
                not link_code
                or link_code["consumido_em"] is not None
                or link_code["expira_em"] <= now
            ):
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="codigo invalido ou expirado")
            connection.execute(
                """
                INSERT INTO contas_discord
                    (usuario_id, discord_user_id, discord_nome)
                VALUES (%s, %s, %s)
                ON CONFLICT (usuario_id) DO UPDATE SET
                    discord_user_id=EXCLUDED.discord_user_id,
                    discord_nome=EXCLUDED.discord_nome,
                    vinculado_em=CURRENT_TIMESTAMP
                """,
                (
                    link_code["usuario_id"],
                    payload.discord_user_id,
                    payload.discord_nome,
                ),
            )
            connection.execute(
                "UPDATE codigos_vinculo_discord SET consumido_em=CURRENT_TIMESTAMP WHERE id=%s",
                (link_code["id"],),
            )
            record_audit(
                connection,
                action="discord.vinculado",
                actor_service=service,
                target_type="usuario",
                target_id=str(link_code["usuario_id"]),
                details={"discord_user_id": payload.discord_user_id},
            )
    except UniqueViolation:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="essa conta Discord ja esta vinculada") from None
    return {"usuario_id": link_code["usuario_id"], "discord_user_id": payload.discord_user_id}


@router.get("/discord/usuarios/{discord_user_id}/contexto")
def discord_user_context(
    discord_user_id: str,
    service: str = Depends(require_service_key),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        user = connection.execute(
            """
            SELECT u.id, u.nome_exibicao, d.discord_user_id, d.discord_nome
            FROM contas_discord d
            JOIN usuarios u ON u.id=d.usuario_id
            WHERE d.discord_user_id=%s AND u.ativo=TRUE
            """,
            (discord_user_id,),
        ).fetchone()
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="conta Discord nao vinculada")
        campaigns = connection.execute(
            """
            SELECT c.id, c.nome, m.papel, m.personagem_ativo_id,
                   cd.discord_guild_id
            FROM membros_campanha m
            JOIN campanhas c ON c.id=m.campanha_id
            LEFT JOIN campanhas_discord cd ON cd.campanha_id=c.id
            WHERE m.usuario_id=%s AND m.status='ativo' AND c.status='ativa'
            ORDER BY c.nome
            """,
            (user["id"],),
        ).fetchall()
        characters = connection.execute(
            """
            SELECT id, campanha_id, nome, versao
            FROM personagens
            WHERE dono_usuario_id=%s AND status='ativo'
            ORDER BY nome
            """,
            (user["id"],),
        ).fetchall()
    return {
        "usuario": dict(user),
        "campanhas": [dict(row) for row in campaigns],
        "personagens": [dict(row) for row in characters],
    }


@router.post("/discord/campanhas/vincular")
def link_discord_campaign(
    payload: CampaignDiscordLinkInput,
    service: str = Depends(require_service_key),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        actor = connection.execute(
            """
            SELECT u.id, u.papel_plataforma
            FROM contas_discord d
            JOIN usuarios u ON u.id=d.usuario_id
            WHERE d.discord_user_id=%s AND u.ativo=TRUE
            """,
            (payload.solicitado_por_discord_user_id,),
        ).fetchone()
        if not actor:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="o mestre precisa vincular a conta do site ao Discord",
            )
        membership = connection.execute(
            """
            SELECT papel FROM membros_campanha
            WHERE campanha_id=%s AND usuario_id=%s AND status='ativo'
            """,
            (payload.campanha_id, actor["id"]),
        ).fetchone()
        if actor["papel_plataforma"] != "criador" and (
            not membership or membership["papel"] != "mestre"
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="somente o mestre pode vincular o servidor Discord",
            )
        try:
            row = connection.execute(
                """
                INSERT INTO campanhas_discord
                    (campanha_id, discord_guild_id, vinculado_por)
                VALUES (%s, %s, %s)
                ON CONFLICT (campanha_id) DO UPDATE SET
                    discord_guild_id=EXCLUDED.discord_guild_id,
                    vinculado_por=EXCLUDED.vinculado_por,
                    vinculado_em=CURRENT_TIMESTAMP
                RETURNING campanha_id, discord_guild_id, vinculado_em
                """,
                (payload.campanha_id, payload.discord_guild_id, actor["id"]),
            ).fetchone()
        except UniqueViolation:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="este servidor Discord ja esta ligado a outra campanha",
            ) from None
        record_audit(
            connection,
            action="discord.campanha_vinculada",
            actor_user_id=actor["id"],
            actor_service=None,
            campaign_id=payload.campanha_id,
            target_type="servidor_discord",
            target_id=payload.discord_guild_id,
        )
    return dict(row)


@router.post("/discord/cofre/depositar")
def deposit_discord_reward(
    payload: DiscordVaultDepositInput,
    service: str = Depends(require_service_key),
    database: Database = Depends(get_database),
):
    """Entrega loot à conta; o jogador escolhe depois qual personagem recebe."""
    with database.connection() as connection:
        destination = connection.execute(
            """
            SELECT d.usuario_id, cd.campanha_id
            FROM contas_discord d
            JOIN campanhas_discord cd ON cd.discord_guild_id=%s
            JOIN membros_campanha m
              ON m.campanha_id=cd.campanha_id AND m.usuario_id=d.usuario_id
            WHERE d.discord_user_id=%s AND m.status='ativo'
            """,
            (payload.discord_guild_id, payload.discord_user_id),
        ).fetchone()
        if not destination:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="vincule sua conta e confirme que o servidor esta ligado a campanha",
            )
        existing = connection.execute(
            """
            SELECT id FROM movimentos_cofre
            WHERE campanha_id=%s AND origem=%s AND idempotencia=%s
            """,
            (destination["campanha_id"], service, payload.idempotencia),
        ).fetchone()
        if existing:
            return {
                "movimento_id": existing["id"],
                "campanha_id": destination["campanha_id"],
                "repetido": True,
            }

        for item in payload.itens:
            connection.execute(
                """
                INSERT INTO cofre_itens_usuario
                    (usuario_id, campanha_id, item_id, titulo, quantidade, dados, origem)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (usuario_id, campanha_id, item_id) DO UPDATE SET
                    titulo=EXCLUDED.titulo,
                    quantidade=cofre_itens_usuario.quantidade + EXCLUDED.quantidade,
                    dados=EXCLUDED.dados,
                    origem=EXCLUDED.origem,
                    atualizado_em=CURRENT_TIMESTAMP
                """,
                (
                    destination["usuario_id"],
                    destination["campanha_id"],
                    item.item_id,
                    item.titulo,
                    item.quantidade,
                    Jsonb(item.dados),
                    service,
                ),
            )
        for currency in payload.moedas:
            connection.execute(
                """
                INSERT INTO cofre_saldos_usuario
                    (usuario_id, campanha_id, moeda, saldo)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (usuario_id, campanha_id, moeda) DO UPDATE SET
                    saldo=cofre_saldos_usuario.saldo + EXCLUDED.saldo,
                    atualizado_em=CURRENT_TIMESTAMP
                """,
                (
                    destination["usuario_id"],
                    destination["campanha_id"],
                    currency.moeda,
                    currency.quantidade,
                ),
            )
        movement_id = uuid4()
        details = {
            "motivo": payload.motivo,
            "itens": [item.model_dump() for item in payload.itens],
            "moedas": [currency.model_dump() for currency in payload.moedas],
        }
        connection.execute(
            """
            INSERT INTO movimentos_cofre
                (id, usuario_id, campanha_id, origem, idempotencia, detalhes)
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (
                movement_id,
                destination["usuario_id"],
                destination["campanha_id"],
                service,
                payload.idempotencia,
                Jsonb(details),
            ),
        )
        premios = [item.titulo for item in payload.itens]
        premios += [f"{moeda.quantidade} {moeda.moeda}" for moeda in payload.moedas]
        notify(
            connection,
            user_ids=[destination["usuario_id"]],
            category="economia",
            title="Recompensa nova no seu cofre",
            message=f"{', '.join(premios[:4])} — {payload.motivo}",
            campaign_id=destination["campanha_id"],
            actor_user_id=None,
            details={"origem": service},
            include_actor=True,
        )
        record_audit(
            connection,
            action="cofre.recompensa_discord",
            actor_service=service,
            campaign_id=destination["campanha_id"],
            target_type="usuario",
            target_id=str(destination["usuario_id"]),
            details=details,
        )
    return {
        "movimento_id": movement_id,
        "campanha_id": destination["campanha_id"],
        "repetido": False,
    }


@router.get("/economia/{character_id}")
def economy_state(
    character_id: UUID,
    campanha_id: UUID,
    service: str = Depends(require_service_key),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        character = _character_in_campaign(connection, campanha_id, character_id)
        balances = connection.execute(
            """
            SELECT moeda, saldo FROM saldos_personagem
            WHERE campanha_id=%s AND personagem_id=%s ORDER BY moeda
            """,
            (campanha_id, character_id),
        ).fetchall()
        items = connection.execute(
            """
            SELECT item_id, titulo, quantidade, dados
            FROM inventario_personagem
            WHERE campanha_id=%s AND personagem_id=%s ORDER BY titulo
            """,
            (campanha_id, character_id),
        ).fetchall()
    return {
        "personagem": dict(character),
        "carteira": [dict(row) for row in balances],
        "inventario": [dict(row) for row in items],
    }


@router.post("/economia/moedas")
def apply_wallet_transaction(
    payload: WalletTransactionInput,
    service: str = Depends(require_service_key),
    database: Database = Depends(get_database),
):
    if payload.delta == 0:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="delta nao pode ser zero")
    with database.connection() as connection:
        _character_in_campaign(connection, payload.campanha_id, payload.personagem_id)
        _lock_resource(
            connection,
            f"wallet:{payload.campanha_id}:{payload.personagem_id}:{payload.moeda.casefold()}",
        )
        existing = connection.execute(
            """
            SELECT id, saldo_apos FROM lancamentos_economia
            WHERE campanha_id=%s AND origem=%s AND idempotencia=%s
            """,
            (payload.campanha_id, service, payload.idempotencia),
        ).fetchone()
        if existing:
            return {"lancamento_id": existing["id"], "saldo": existing["saldo_apos"], "repetido": True}
        connection.execute(
            """
            INSERT INTO saldos_personagem
                (campanha_id, personagem_id, moeda, saldo)
            VALUES (%s, %s, %s, 0)
            ON CONFLICT DO NOTHING
            """,
            (payload.campanha_id, payload.personagem_id, payload.moeda),
        )
        current = connection.execute(
            """
            SELECT saldo FROM saldos_personagem
            WHERE campanha_id=%s AND personagem_id=%s AND moeda=%s
            FOR UPDATE
            """,
            (payload.campanha_id, payload.personagem_id, payload.moeda),
        ).fetchone()
        new_balance = int(current["saldo"]) + payload.delta
        if new_balance < 0 and not payload.permitir_negativo:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="saldo insuficiente")
        connection.execute(
            """
            UPDATE saldos_personagem
            SET saldo=%s, atualizado_em=CURRENT_TIMESTAMP
            WHERE campanha_id=%s AND personagem_id=%s AND moeda=%s
            """,
            (new_balance, payload.campanha_id, payload.personagem_id, payload.moeda),
        )
        ledger_id = uuid4()
        connection.execute(
            """
            INSERT INTO lancamentos_economia
                (id, campanha_id, personagem_id, moeda, delta, saldo_apos,
                 motivo, origem, idempotencia)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                ledger_id,
                payload.campanha_id,
                payload.personagem_id,
                payload.moeda,
                payload.delta,
                new_balance,
                payload.motivo,
                service,
                payload.idempotencia,
            ),
        )
        record_audit(
            connection,
            action="economia.moeda_alterada",
            actor_service=service,
            campaign_id=payload.campanha_id,
            target_type="personagem",
            target_id=str(payload.personagem_id),
            details={"moeda": payload.moeda, "delta": payload.delta, "saldo": new_balance},
        )
    return {"lancamento_id": ledger_id, "saldo": new_balance, "repetido": False}


@router.post("/economia/inventario")
def apply_inventory_transaction(
    payload: InventoryTransactionInput,
    service: str = Depends(require_service_key),
    database: Database = Depends(get_database),
):
    if payload.delta == 0:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="delta nao pode ser zero")
    with database.connection() as connection:
        _character_in_campaign(connection, payload.campanha_id, payload.personagem_id)
        _lock_resource(
            connection,
            f"inventory:{payload.campanha_id}:{payload.personagem_id}:{payload.item_id}",
        )
        existing = connection.execute(
            """
            SELECT id FROM lancamentos_economia
            WHERE campanha_id=%s AND origem=%s AND idempotencia=%s
            """,
            (payload.campanha_id, service, payload.idempotencia),
        ).fetchone()
        if existing:
            current = connection.execute(
                """
                SELECT quantidade FROM inventario_personagem
                WHERE campanha_id=%s AND personagem_id=%s AND item_id=%s
                """,
                (payload.campanha_id, payload.personagem_id, payload.item_id),
            ).fetchone()
            return {"lancamento_id": existing["id"], "quantidade": int(current["quantidade"]) if current else 0, "repetido": True}
        current = connection.execute(
            """
            SELECT quantidade FROM inventario_personagem
            WHERE campanha_id=%s AND personagem_id=%s AND item_id=%s
            FOR UPDATE
            """,
            (payload.campanha_id, payload.personagem_id, payload.item_id),
        ).fetchone()
        new_quantity = (int(current["quantidade"]) if current else 0) + payload.delta
        if new_quantity < 0:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="quantidade insuficiente")
        if new_quantity == 0:
            connection.execute(
                """
                DELETE FROM inventario_personagem
                WHERE campanha_id=%s AND personagem_id=%s AND item_id=%s
                """,
                (payload.campanha_id, payload.personagem_id, payload.item_id),
            )
        else:
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
                    payload.campanha_id,
                    payload.personagem_id,
                    payload.item_id,
                    payload.titulo,
                    new_quantity,
                    Jsonb(payload.dados),
                ),
            )
        ledger_id = uuid4()
        connection.execute(
            """
            INSERT INTO lancamentos_economia
                (id, campanha_id, personagem_id, item_id, delta,
                 motivo, origem, idempotencia)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                ledger_id,
                payload.campanha_id,
                payload.personagem_id,
                payload.item_id,
                payload.delta,
                payload.motivo,
                service,
                payload.idempotencia,
            ),
        )
        record_audit(
            connection,
            action="economia.inventario_alterado",
            actor_service=service,
            campaign_id=payload.campanha_id,
            target_type="personagem",
            target_id=str(payload.personagem_id),
            details={"item_id": payload.item_id, "delta": payload.delta, "quantidade": new_quantity},
        )
    return {"lancamento_id": ledger_id, "quantidade": new_quantity, "repetido": False}


@router.post("/contas/senha")
def emergencia_senha(
    payload: ServiceAccountPasswordInput,
    service: str = Depends(require_service_key),
    database: Database = Depends(get_database),
):
    """Senha provisória para uma conta, usando a chave de serviço.

    Existe porque o banco fica na VLAN: quando ninguém consegue entrar no site,
    não há como falar direto com o Postgres de fora. Esta rota é o caminho de
    volta, e por isso a `SERVICE_API_KEY` vale como acesso administrativo —
    guarde-a com o mesmo cuidado da senha do banco.

    Diferente do painel, aqui a conta criador **pode** ser redefinida: se ela se
    perder e não houver outro administrador, este é o único caminho de volta.
    """
    email = payload.email.strip().lower()
    temporaria = new_temporary_password()
    with database.connection() as connection:
        alvo = connection.execute(
            """
            SELECT id, nome_exibicao, papel_plataforma, ativo
            FROM usuarios WHERE LOWER(email)=LOWER(%s) FOR UPDATE
            """,
            (email,),
        ).fetchone()
        if not alvo:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="conta nao encontrada")

        connection.execute(
            """
            UPDATE usuarios
            SET senha_hash=%s, senha_provisoria=TRUE,
                senha_alterada_em=CURRENT_TIMESTAMP, atualizado_em=CURRENT_TIMESTAMP
            WHERE id=%s
            """,
            (hash_password(temporaria), alvo["id"]),
        )
        connection.execute(
            """
            UPDATE sessoes_auth SET revogada_em=CURRENT_TIMESTAMP
            WHERE usuario_id=%s AND revogada_em IS NULL
            """,
            (alvo["id"],),
        )
        connection.execute(
            """
            UPDATE pedidos_senha
            SET status='atendido', atendido_em=CURRENT_TIMESTAMP
            WHERE usuario_id=%s AND status='aberto'
            """,
            (alvo["id"],),
        )
        record_audit(
            connection,
            action="conta.senha_emergencia",
            actor_service=service,
            target_type="usuario",
            target_id=str(alvo["id"]),
            details={"email": email, "papel": alvo["papel_plataforma"]},
        )
    return {
        "email": email,
        "nome_exibicao": alvo["nome_exibicao"],
        "papel_plataforma": alvo["papel_plataforma"],
        "ativo": bool(alvo["ativo"]),
        "senha_provisoria": temporaria,
    }


@router.post("/contas/criador")
def emergencia_criador(
    payload: ServiceAccountPasswordInput,
    service: str = Depends(require_service_key),
    database: Database = Depends(get_database),
):
    """Promove uma conta a criador sem depender de reinício nem de variável."""
    email = payload.email.strip().lower()
    with database.connection() as connection:
        alvo = connection.execute(
            "SELECT id, nome_exibicao, papel_plataforma FROM usuarios WHERE LOWER(email)=LOWER(%s) FOR UPDATE",
            (email,),
        ).fetchone()
        if not alvo:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="conta nao encontrada")
        if alvo["papel_plataforma"] != "criador":
            # O cargo é único: quem estiver nele desce para admin.
            connection.execute(
                """
                UPDATE usuarios
                SET papel_plataforma='admin', admin_plataforma=TRUE,
                    atualizado_em=CURRENT_TIMESTAMP
                WHERE papel_plataforma='criador' AND id<>%s
                """,
                (alvo["id"],),
            )
            connection.execute(
                """
                UPDATE usuarios
                SET papel_plataforma='criador', admin_plataforma=TRUE,
                    atualizado_em=CURRENT_TIMESTAMP
                WHERE id=%s
                """,
                (alvo["id"],),
            )
            record_audit(
                connection,
                action="conta.criador_emergencia",
                actor_service=service,
                target_type="usuario",
                target_id=str(alvo["id"]),
                details={"email": email, "papel_anterior": alvo["papel_plataforma"]},
            )
    return {
        "email": email,
        "nome_exibicao": alvo["nome_exibicao"],
        "papel_anterior": alvo["papel_plataforma"],
        "papel_plataforma": "criador",
    }


@router.get("/backup")
def service_backup(
    service: str = Depends(require_service_key),
    database: Database = Depends(get_database),
):
    """Mesmo backup do painel, para rotinas automáticas dentro da VLAN.

    Um bot agendado (ou o tools/backup-jardim.py) chama esta rota e guarda o
    arquivo fora do servidor. Exige X-Service-Key como as demais rotas
    internas.
    """
    conteudo, resumo = gerar_backup(database)
    with database.connection() as connection:
        record_audit(
            connection,
            action="plataforma.backup_automatico",
            actor_service=service,
            target_type="plataforma",
            details={"linhas": resumo["linhas"], "bytes": resumo["bytes"]},
        )
    return Response(
        content=conteudo,
        media_type="application/gzip",
        headers={
            "Content-Disposition": f'attachment; filename="{nome_do_arquivo()}"',
            "X-Backup-Linhas": str(resumo["linhas"]),
        },
    )
