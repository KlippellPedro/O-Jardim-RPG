from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Response, status
from psycopg.errors import UniqueViolation
from psycopg.types.json import Jsonb

from core.audit import record_audit
from core.backup import gerar_backup, nome_do_arquivo
from core.cofre_tiers import COFRE_TIER_INICIAL, capacidade_de_itens
from core.notifications import notify
from core.database import Database
from core.dependencies import get_database, require_service_key
from core.economy_commands import MAX_ECONOMY_AMOUNT
from core.security import hash_password, hash_token, new_temporary_password, normalize_human_code
from schemas import (
    CampaignDiscordLinkInput,
    ServiceAccountPasswordInput,
    DiscordVaultDepositInput,
    DiscordVaultReserveInput,
    DiscordVaultReserveResolveInput,
    DiscordVaultTransferInput,
    DiscordVaultWithdrawInput,
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


def _character_in_campaign(
    connection,
    campaign_id: UUID,
    character_id: UUID,
    *,
    for_update: bool = False,
):
    lock_clause = " FOR UPDATE" if for_update else ""
    row = connection.execute(
        """
        SELECT id, campanha_id, dono_usuario_id, nome, economia_versao
        FROM personagens
        WHERE id=%s AND campanha_id=%s AND status='ativo'
        """
        + lock_clause,
        (character_id, campaign_id),
    ).fetchone()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="personagem nao encontrado na campanha")
    return row


def _increment_economy_version(connection, character_id: UUID) -> int:
    row = connection.execute(
        """
        UPDATE personagens
        SET economia_versao=economia_versao+1,
            atualizado_em=CURRENT_TIMESTAMP
        WHERE id=%s AND status='ativo'
        RETURNING economia_versao
        """,
        (character_id,),
    ).fetchone()
    if not row:
        # A linha permanece bloqueada durante toda a transacao. Chegar aqui
        # indicaria uma violacao da invariante, nao um conflito recuperavel.
        raise RuntimeError("personagem bloqueado deixou de estar ativo durante a transacao")
    return int(row["economia_versao"])


def _same_idempotent_wallet_transaction(existing, payload: WalletTransactionInput) -> bool:
    return (
        existing["personagem_id"] == payload.personagem_id
        and existing["moeda"] == payload.moeda
        and int(existing["delta"]) == payload.delta
    )


def _same_idempotent_inventory_transaction(existing, payload: InventoryTransactionInput) -> bool:
    return (
        existing["personagem_id"] == payload.personagem_id
        and existing["item_id"] == payload.item_id
        and int(existing["delta"]) == payload.delta
    )


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


def _discord_destination(connection, *, discord_guild_id: str, discord_user_id: str) -> dict:
    """(usuario_id, campanha_id) do par Discord vinculado, ou 404.

    Compartilhado por todos os endpoints /interno/discord/cofre/* — depósito,
    leitura, retirada, transferência e reserva precisam resolver exatamente
    o mesmo par (usuário, campanha) a partir do (guild, user) do Discord.
    """
    destination = connection.execute(
        """
        SELECT d.usuario_id, cd.campanha_id
        FROM contas_discord d
        JOIN campanhas_discord cd ON cd.discord_guild_id=%s
        JOIN membros_campanha m
          ON m.campanha_id=cd.campanha_id AND m.usuario_id=d.usuario_id
        WHERE d.discord_user_id=%s AND m.status='ativo'
        """,
        (discord_guild_id, discord_user_id),
    ).fetchone()
    if not destination:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="vincule sua conta e confirme que o servidor esta ligado a campanha",
        )
    return destination


def _campaign_for_guild(connection, discord_guild_id: str) -> UUID:
    row = connection.execute(
        "SELECT campanha_id FROM campanhas_discord WHERE discord_guild_id=%s",
        (discord_guild_id,),
    ).fetchone()
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "codigo": "guild_nao_vinculada",
                "mensagem": "este servidor nao esta ligado a uma campanha",
            },
        )
    return row["campanha_id"]


def _lock_vault(connection, usuario_id: UUID, campanha_id: UUID) -> None:
    """Trava o cofre inteiro de uma conta numa campanha. Escopo mais grosso
    que trava-por-item de propósito: capacidade é uma soma sobre várias
    linhas, e checar-então-escrever precisa de exclusividade no cofre todo,
    não só na linha do item que está mudando."""
    _lock_resource(connection, f"cofre:{campanha_id}:{usuario_id}")


def _lock_vaults_ordenado(connection, pares: list[tuple[UUID, UUID]]) -> None:
    """Trava vários cofres em ordem determinística (por usuario_id) — é o que
    evita deadlock entre duas transferências cruzadas (A→B rodando ao mesmo
    tempo que B→A)."""
    for usuario_id, campanha_id in sorted(set(pares), key=lambda par: str(par[0])):
        _lock_vault(connection, usuario_id, campanha_id)


def _vault_item_total(connection, usuario_id: UUID, campanha_id: UUID) -> int:
    """Itens guardados + reservados (um item em leilão ainda ocupa espaço no
    cofre — senão leiloar vira um jeito de burlar a capacidade)."""
    row = connection.execute(
        """
        SELECT
            COALESCE((SELECT SUM(quantidade) FROM cofre_itens_usuario
                       WHERE usuario_id=%s AND campanha_id=%s), 0)
            + COALESCE((SELECT SUM(quantidade) FROM reservas_cofre
                         WHERE usuario_id=%s AND campanha_id=%s AND status='reservada'), 0)
            AS total
        """,
        (usuario_id, campanha_id, usuario_id, campanha_id),
    ).fetchone()
    return int(row["total"])


def _vault_capacity_for_discord(connection, *, discord_guild_id: str, discord_user_id: str) -> int:
    row = connection.execute(
        "SELECT tier FROM cofre WHERE guild_id=%s AND user_id=%s",
        (discord_guild_id, discord_user_id),
    ).fetchone()
    return capacidade_de_itens(row["tier"] if row else COFRE_TIER_INICIAL)


def _require_vault_capacity(
    connection,
    *,
    usuario_id: UUID,
    campanha_id: UUID,
    discord_guild_id: str,
    discord_user_id: str,
    quantidade_extra: int,
) -> None:
    atual = _vault_item_total(connection, usuario_id, campanha_id)
    capacidade = _vault_capacity_for_discord(
        connection, discord_guild_id=discord_guild_id, discord_user_id=discord_user_id
    )
    if atual + quantidade_extra > capacidade:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "codigo": "cofre_cheio",
                "mensagem": f"cofre cheio ({atual}/{capacidade}) — melhore o tier ou libere espaço",
            },
        )


def _take_from_vault(connection, usuario_id: UUID, campanha_id: UUID, item_id: str, quantidade: int) -> dict:
    """Decremento guardado, não read-then-write: sem quantidade suficiente,
    nenhuma das duas queries abaixo casa nenhuma linha — o Postgres recusa
    silenciosamente em vez de deixar o saldo ir negativo. Vale mesmo que um
    chamador futuro esqueça de travar o cofre antes.

    Duas queries, não uma, porque `CHECK (quantidade > 0)` na tabela proíbe
    gravar zero: um UPDATE que zerasse a linha explodiria a própria
    constraint antes de eu conseguir apagar a linha depois. Sobra > pedido
    vira UPDATE; sobra == pedido vira DELETE."""
    row = connection.execute(
        """
        UPDATE cofre_itens_usuario
        SET quantidade = quantidade - %s, atualizado_em = CURRENT_TIMESTAMP
        WHERE usuario_id=%s AND campanha_id=%s AND item_id=%s AND quantidade > %s
        RETURNING titulo, dados
        """,
        (quantidade, usuario_id, campanha_id, item_id, quantidade),
    ).fetchone()
    if row is None:
        row = connection.execute(
            """
            DELETE FROM cofre_itens_usuario
            WHERE usuario_id=%s AND campanha_id=%s AND item_id=%s AND quantidade = %s
            RETURNING titulo, dados
            """,
            (usuario_id, campanha_id, item_id, quantidade),
        ).fetchone()
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "codigo": "quantidade_indisponivel",
                "mensagem": f"item '{item_id}' indisponivel na quantidade pedida",
            },
        )
    return {
        "item_id": item_id,
        "titulo": row["titulo"],
        "dados": row["dados"] or {},
        "quantidade": quantidade,
    }


def _put_in_vault(
    connection, usuario_id: UUID, campanha_id: UUID, item_id: str, titulo: str, quantidade: int, dados: dict, origem: str
) -> None:
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
        (usuario_id, campanha_id, item_id, titulo, quantidade, Jsonb(dados), origem),
    )


@router.post("/discord/cofre/depositar")
def deposit_discord_reward(
    payload: DiscordVaultDepositInput,
    service: str = Depends(require_service_key),
    database: Database = Depends(get_database),
):
    """Entrega loot à conta; o jogador escolhe depois qual personagem recebe."""
    with database.connection() as connection:
        destination = _discord_destination(
            connection,
            discord_guild_id=payload.discord_guild_id,
            discord_user_id=payload.discord_user_id,
        )
        # Trava a chave de idempotência ANTES de checar se ela já existe: sem
        # isso, dois depósitos concorrentes com a mesma chave (o retry de
        # transporte do bot pode gerar exatamente isso) passam os dois pelo
        # SELECT sem ver nada, e o segundo INSERT esbarra no UNIQUE
        # (campanha_id, origem, idempotencia) como erro não tratado — 500 pro
        # bot, que não sabe se o depósito aconteceu ou não.
        _lock_resource(
            connection, f"movimento:{destination['campanha_id']}:{service}:{payload.idempotencia}"
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


@router.get("/discord/cofre/{discord_guild_id}/{discord_user_id}")
def get_discord_vault(
    discord_guild_id: str,
    discord_user_id: str,
    service: str = Depends(require_service_key),
    database: Database = Depends(get_database),
):
    """Leitura do cofre unificado. Sem lock — é consultivo; toda escrita
    re-valida do zero, então uma leitura desatualizada nunca causa dado
    inconsistente, só uma resposta ligeiramente velha."""
    del service
    with database.connection() as connection:
        destination = _discord_destination(
            connection, discord_guild_id=discord_guild_id, discord_user_id=discord_user_id
        )
        usuario_id, campanha_id = destination["usuario_id"], destination["campanha_id"]
        itens = connection.execute(
            """
            SELECT item_id, titulo, quantidade, dados, origem, atualizado_em
            FROM cofre_itens_usuario
            WHERE usuario_id=%s AND campanha_id=%s
            ORDER BY titulo
            """,
            (usuario_id, campanha_id),
        ).fetchall()
        moedas = connection.execute(
            """
            SELECT moeda, saldo FROM cofre_saldos_usuario
            WHERE usuario_id=%s AND campanha_id=%s AND saldo > 0
            ORDER BY moeda
            """,
            (usuario_id, campanha_id),
        ).fetchall()
        reservas = connection.execute(
            """
            SELECT referencia, origem, item_id, titulo, quantidade, expira_em
            FROM reservas_cofre
            WHERE usuario_id=%s AND campanha_id=%s AND status='reservada'
            ORDER BY expira_em
            """,
            (usuario_id, campanha_id),
        ).fetchall()
        tier_row = connection.execute(
            "SELECT tier FROM cofre WHERE guild_id=%s AND user_id=%s",
            (discord_guild_id, discord_user_id),
        ).fetchone()
    tier_id = tier_row["tier"] if tier_row else COFRE_TIER_INICIAL
    capacidade = capacidade_de_itens(tier_id)
    usado = sum(item["quantidade"] for item in itens) + sum(r["quantidade"] for r in reservas)
    return {
        "usuario_id": usuario_id,
        "campanha_id": campanha_id,
        "itens": [dict(item) for item in itens],
        "moedas": [dict(moeda) for moeda in moedas],
        "reservas": [dict(reserva) for reserva in reservas],
        "capacidade": {"tier": tier_id, "capacidade": capacidade, "usado": usado},
    }


@router.post("/discord/cofre/retirar")
def withdraw_discord_vault(
    payload: DiscordVaultWithdrawInput,
    service: str = Depends(require_service_key),
    database: Database = Depends(get_database),
):
    """Retirada (venda, dar pro mestre tirar, etc.). Ao contrário do
    depósito, uma retirada cuja resposta se perde num timeout é irretentável
    sem a idempotência — o bot não tem como saber se aconteceu ou não."""
    with database.connection() as connection:
        destination = _discord_destination(
            connection, discord_guild_id=payload.discord_guild_id, discord_user_id=payload.discord_user_id
        )
        usuario_id, campanha_id = destination["usuario_id"], destination["campanha_id"]
        _lock_vault(connection, usuario_id, campanha_id)
        _lock_resource(connection, f"movimento:{campanha_id}:{service}:{payload.idempotencia}")

        existing = connection.execute(
            "SELECT id, detalhes FROM movimentos_cofre WHERE campanha_id=%s AND origem=%s AND idempotencia=%s",
            (campanha_id, service, payload.idempotencia),
        ).fetchone()
        if existing:
            detalhes = existing["detalhes"] or {}
            return {
                "movimento_id": existing["id"],
                "campanha_id": campanha_id,
                "repetido": True,
                "itens": detalhes.get("itens_retirados", []),
            }

        retirados = [
            _take_from_vault(connection, usuario_id, campanha_id, item.item_id, item.quantidade)
            for item in payload.itens
        ]

        movement_id = uuid4()
        details = {"motivo": payload.motivo, "itens_retirados": retirados}
        connection.execute(
            """
            INSERT INTO movimentos_cofre (id, usuario_id, campanha_id, origem, idempotencia, detalhes)
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (movement_id, usuario_id, campanha_id, service, payload.idempotencia, Jsonb(details)),
        )
        record_audit(
            connection,
            action="cofre.retirada_discord",
            actor_service=service,
            campaign_id=campanha_id,
            target_type="usuario",
            target_id=str(usuario_id),
            details=details,
        )
    return {
        "movimento_id": movement_id,
        "campanha_id": campanha_id,
        "repetido": False,
        "itens": retirados,
    }


@router.post("/discord/cofre/transferir")
def transfer_discord_vault(
    payload: DiscordVaultTransferInput,
    service: str = Depends(require_service_key),
    database: Database = Depends(get_database),
):
    """Cobre /oferecer (um movimento) e /trocar (dois movimentos espelhados).
    Não é composto de retirar+depositar no bot de propósito: duas chamadas
    HTTP não podem ser atômicas — uma falha no meio destrói um item. A
    transação inteira mora aqui."""
    with database.connection() as connection:
        # `campanhas_discord.discord_guild_id` é UNIQUE — um guild só aponta
        # pra uma campanha, então todo mundo resolvido aqui cai na mesma
        # campanha por construção. Não tem "campanhas diferentes" a checar.
        pares: dict[str, dict] = {}
        campanha_id: UUID | None = None
        for movimento in payload.movimentos:
            for discord_user_id in (movimento.de_discord_user_id, movimento.para_discord_user_id):
                if discord_user_id in pares:
                    continue
                destino = _discord_destination(
                    connection, discord_guild_id=payload.discord_guild_id, discord_user_id=discord_user_id
                )
                pares[discord_user_id] = destino
                campanha_id = destino["campanha_id"]

        _lock_vaults_ordenado(
            connection, [(destino["usuario_id"], campanha_id) for destino in pares.values()]
        )
        _lock_resource(connection, f"movimento:{campanha_id}:{service}:{payload.idempotencia}")

        existing = connection.execute(
            "SELECT id FROM movimentos_cofre WHERE campanha_id=%s AND origem=%s AND idempotencia=%s",
            (campanha_id, service, payload.idempotencia),
        ).fetchone()
        if existing:
            return {"movimento_id": existing["id"], "campanha_id": campanha_id, "repetido": True}

        if payload.respeitar_capacidade:
            recebendo: dict[str, int] = {}
            for movimento in payload.movimentos:
                total = sum(item.quantidade for item in movimento.itens)
                recebendo[movimento.para_discord_user_id] = recebendo.get(movimento.para_discord_user_id, 0) + total
            for discord_user_id, quantidade_extra in recebendo.items():
                destino = pares[discord_user_id]
                _require_vault_capacity(
                    connection,
                    usuario_id=destino["usuario_id"],
                    campanha_id=campanha_id,
                    discord_guild_id=payload.discord_guild_id,
                    discord_user_id=discord_user_id,
                    quantidade_extra=quantidade_extra,
                )

        # Retira de todo mundo primeiro, deposita depois — uma retirada que
        # falhar (quantidade insuficiente) não deixa nenhum depósito parcial
        # pra trás (a exceção estoura a transação inteira).
        retiradas: list[tuple[str, dict]] = []
        for movimento in payload.movimentos:
            origem_destino = pares[movimento.de_discord_user_id]
            for item in movimento.itens:
                retirado = _take_from_vault(
                    connection, origem_destino["usuario_id"], campanha_id, item.item_id, item.quantidade
                )
                retiradas.append((movimento.para_discord_user_id, retirado))
        for para_discord_user_id, retirado in retiradas:
            destino = pares[para_discord_user_id]
            _put_in_vault(
                connection,
                destino["usuario_id"],
                campanha_id,
                retirado["item_id"],
                retirado["titulo"],
                retirado["quantidade"],
                retirado["dados"],
                service,
            )

        movement_id = uuid4()
        details = {
            "motivo": payload.motivo,
            "movimentos": [movimento.model_dump() for movimento in payload.movimentos],
        }
        primeiro_de = pares[payload.movimentos[0].de_discord_user_id]
        connection.execute(
            """
            INSERT INTO movimentos_cofre (id, usuario_id, campanha_id, origem, idempotencia, detalhes)
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (movement_id, primeiro_de["usuario_id"], campanha_id, service, payload.idempotencia, Jsonb(details)),
        )
        record_audit(
            connection,
            action="cofre.transferencia_discord",
            actor_service=service,
            campaign_id=campanha_id,
            target_type="movimento",
            target_id=str(movement_id),
            details=details,
        )
    return {"movimento_id": movement_id, "campanha_id": campanha_id, "repetido": False}


@router.post("/discord/cofre/reservas")
def reserve_discord_vault(
    payload: DiscordVaultReserveInput,
    service: str = Depends(require_service_key),
    database: Database = Depends(get_database),
):
    """Escrow do leilão: o item sai do cofre e fica retido até 72h,
    atravessando restart do bot. `UNIQUE(campanha_id, origem, referencia)` É
    a chave de idempotência — sem campo separado."""
    with database.connection() as connection:
        destination = _discord_destination(
            connection, discord_guild_id=payload.discord_guild_id, discord_user_id=payload.discord_user_id
        )
        usuario_id, campanha_id = destination["usuario_id"], destination["campanha_id"]
        _lock_vault(connection, usuario_id, campanha_id)
        _lock_resource(connection, f"reserva:{campanha_id}:{payload.origem}:{payload.referencia}")

        existing = connection.execute(
            """
            SELECT id, item_id, titulo, quantidade, expira_em FROM reservas_cofre
            WHERE campanha_id=%s AND origem=%s AND referencia=%s
            """,
            (campanha_id, payload.origem, payload.referencia),
        ).fetchone()
        if existing:
            return {
                "reserva_id": existing["id"],
                "referencia": payload.referencia,
                "item_id": existing["item_id"],
                "titulo": existing["titulo"],
                "quantidade": existing["quantidade"],
                "expira_em": existing["expira_em"],
                "repetido": True,
            }

        retirado = _take_from_vault(connection, usuario_id, campanha_id, payload.item_id, payload.quantidade)
        reserva_id = uuid4()
        connection.execute(
            """
            INSERT INTO reservas_cofre
                (id, usuario_id, campanha_id, origem, referencia, item_id, titulo, quantidade, dados, motivo, expira_em)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                reserva_id,
                usuario_id,
                campanha_id,
                payload.origem,
                payload.referencia,
                retirado["item_id"],
                retirado["titulo"],
                retirado["quantidade"],
                Jsonb(retirado["dados"]),
                payload.motivo,
                payload.expira_em,
            ),
        )
        record_audit(
            connection,
            action="cofre.reserva_criada",
            actor_service=service,
            campaign_id=campanha_id,
            target_type="usuario",
            target_id=str(usuario_id),
            details={
                "referencia": payload.referencia,
                "item_id": retirado["item_id"],
                "quantidade": retirado["quantidade"],
            },
        )
    return {
        "reserva_id": reserva_id,
        "referencia": payload.referencia,
        "item_id": retirado["item_id"],
        "titulo": retirado["titulo"],
        "quantidade": retirado["quantidade"],
        "expira_em": payload.expira_em,
        "repetido": False,
    }


@router.post("/discord/cofre/reservas/resolver")
def resolve_discord_vault_reservation(
    payload: DiscordVaultReserveResolveInput,
    service: str = Depends(require_service_key),
    database: Database = Depends(get_database),
):
    """Entrega ao vencedor (destino informado) ou devolve ao dono original
    (destino omitido). Idempotente por natureza — uma reserva já resolvida
    apenas devolve o resultado salvo, sem chave separada."""
    with database.connection() as connection:
        campanha_id = _campaign_for_guild(connection, payload.discord_guild_id)
        _lock_resource(connection, f"reserva:{campanha_id}:{payload.origem}:{payload.referencia}")

        reserva = connection.execute(
            """
            SELECT * FROM reservas_cofre
            WHERE campanha_id=%s AND origem=%s AND referencia=%s
            FOR UPDATE
            """,
            (campanha_id, payload.origem, payload.referencia),
        ).fetchone()
        if not reserva:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"codigo": "reserva_nao_encontrada", "mensagem": "nenhuma reserva com essa referencia"},
            )
        if reserva["status"] != "reservada":
            return {
                "reserva_id": reserva["id"],
                "referencia": payload.referencia,
                "status": reserva["status"],
                "repetido": True,
            }

        if payload.destino_discord_user_id:
            destino = _discord_destination(
                connection,
                discord_guild_id=payload.discord_guild_id,
                discord_user_id=payload.destino_discord_user_id,
            )
            destino_usuario_id = destino["usuario_id"]
            novo_status = "entregue"
        else:
            destino_usuario_id = reserva["usuario_id"]
            novo_status = "devolvida"

        _lock_vault(connection, destino_usuario_id, campanha_id)
        _put_in_vault(
            connection,
            destino_usuario_id,
            campanha_id,
            reserva["item_id"],
            reserva["titulo"],
            reserva["quantidade"],
            reserva["dados"] or {},
            payload.origem,
        )
        connection.execute(
            "UPDATE reservas_cofre SET status=%s, resolvido_em=CURRENT_TIMESTAMP WHERE id=%s",
            (novo_status, reserva["id"]),
        )
        record_audit(
            connection,
            action=f"cofre.reserva_{novo_status}",
            actor_service=service,
            campaign_id=campanha_id,
            target_type="usuario",
            target_id=str(destino_usuario_id),
            details={
                "referencia": payload.referencia,
                "item_id": reserva["item_id"],
                "quantidade": reserva["quantidade"],
            },
        )
    return {
        "reserva_id": reserva["id"],
        "referencia": payload.referencia,
        "status": novo_status,
        "destino_usuario_id": destino_usuario_id,
        "repetido": False,
    }


@router.get("/discord/cofre/reservas/pendentes")
def list_pending_discord_vault_reservations(
    discord_guild_id: str,
    vencidas: bool = False,
    service: str = Depends(require_service_key),
    database: Database = Depends(get_database),
):
    """Reconciliação: reservas em aberto (ou só as vencidas), pra um comando
    tipo /leilao_recuperar devolver item de leilão órfão por bot morto."""
    del service
    with database.connection() as connection:
        campanha_id = _campaign_for_guild(connection, discord_guild_id)
        clausula_vencidas = "AND expira_em <= CURRENT_TIMESTAMP" if vencidas else ""
        rows = connection.execute(
            f"""
            SELECT id, usuario_id, origem, referencia, item_id, titulo, quantidade, expira_em, criado_em
            FROM reservas_cofre
            WHERE campanha_id=%s AND status='reservada' {clausula_vencidas}
            ORDER BY expira_em
            """,
            (campanha_id,),
        ).fetchall()
    return {"reservas": [dict(row) for row in rows]}


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
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="delta nao pode ser zero")
    with database.connection() as connection:
        character = _character_in_campaign(
            connection,
            payload.campanha_id,
            payload.personagem_id,
            for_update=True,
        )
        _lock_resource(
            connection,
            f"wallet:{payload.campanha_id}:{payload.personagem_id}:{payload.moeda.casefold()}",
        )
        existing = connection.execute(
            """
            SELECT id, personagem_id, moeda, delta, saldo_apos
            FROM lancamentos_economia
            WHERE campanha_id=%s AND origem=%s AND idempotencia=%s
            """,
            (payload.campanha_id, service, payload.idempotencia),
        ).fetchone()
        if existing:
            if not _same_idempotent_wallet_transaction(existing, payload):
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="a chave de idempotencia ja foi usada em outra transacao",
                )
            return {
                "lancamento_id": existing["id"],
                "saldo": existing["saldo_apos"],
                "economia_versao": int(character["economia_versao"]),
                "repetido": True,
            }
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
        if abs(new_balance) > MAX_ECONOMY_AMOUNT:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="o saldo resultante excede o limite economico",
            )
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
        economy_version = _increment_economy_version(connection, payload.personagem_id)
        record_audit(
            connection,
            action="economia.moeda_alterada",
            actor_service=service,
            campaign_id=payload.campanha_id,
            target_type="personagem",
            target_id=str(payload.personagem_id),
            details={
                "moeda": payload.moeda,
                "delta": payload.delta,
                "saldo": new_balance,
                "economia_versao": economy_version,
            },
        )
    return {
        "lancamento_id": ledger_id,
        "saldo": new_balance,
        "economia_versao": economy_version,
        "repetido": False,
    }


@router.post("/economia/inventario")
def apply_inventory_transaction(
    payload: InventoryTransactionInput,
    service: str = Depends(require_service_key),
    database: Database = Depends(get_database),
):
    if payload.delta == 0:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="delta nao pode ser zero")
    with database.connection() as connection:
        character = _character_in_campaign(
            connection,
            payload.campanha_id,
            payload.personagem_id,
            for_update=True,
        )
        _lock_resource(
            connection,
            f"inventory:{payload.campanha_id}:{payload.personagem_id}:{payload.item_id}",
        )
        existing = connection.execute(
            """
            SELECT id, personagem_id, item_id, delta
            FROM lancamentos_economia
            WHERE campanha_id=%s AND origem=%s AND idempotencia=%s
            """,
            (payload.campanha_id, service, payload.idempotencia),
        ).fetchone()
        if existing:
            if not _same_idempotent_inventory_transaction(existing, payload):
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="a chave de idempotencia ja foi usada em outra transacao",
                )
            current = connection.execute(
                """
                SELECT quantidade FROM inventario_personagem
                WHERE campanha_id=%s AND personagem_id=%s AND item_id=%s
                """,
                (payload.campanha_id, payload.personagem_id, payload.item_id),
            ).fetchone()
            return {
                "lancamento_id": existing["id"],
                "quantidade": int(current["quantidade"]) if current else 0,
                "economia_versao": int(character["economia_versao"]),
                "repetido": True,
            }
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
        if new_quantity > 1_000_000:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="a quantidade resultante excede o limite do inventario",
            )
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
        economy_version = _increment_economy_version(connection, payload.personagem_id)
        record_audit(
            connection,
            action="economia.inventario_alterado",
            actor_service=service,
            campaign_id=payload.campanha_id,
            target_type="personagem",
            target_id=str(payload.personagem_id),
            details={
                "item_id": payload.item_id,
                "delta": payload.delta,
                "quantidade": new_quantity,
                "economia_versao": economy_version,
            },
        )
    return {
        "lancamento_id": ledger_id,
        "quantidade": new_quantity,
        "economia_versao": economy_version,
        "repetido": False,
    }


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
