from __future__ import annotations

from datetime import datetime, timedelta, timezone
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, status

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
from core.notifications import campaign_member_ids, notify
from core.security import hash_token, new_secret_token
from schemas import (
    ActiveCharacterInput,
    CampaignCreateInput,
    CampaignInviteInput,
    CampaignOwnerInput,
    CampaignUpdateInput,
    JoinCampaignInput,
    MemberRoleInput,
)


router = APIRouter(prefix="/campanhas", tags=["campanhas"])


@router.post("", status_code=status.HTTP_201_CREATED)
def create_campaign(
    payload: CampaignCreateInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    if not user.can_create_campaign:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="somente contas mestre ou criador podem criar campanhas",
        )
    campaign_id = uuid4()
    with database.connection() as connection:
        connection.execute(
            """
            INSERT INTO campanhas (id, dono_id, nome, descricao)
            VALUES (%s, %s, %s, %s)
            """,
            (campaign_id, user.id, payload.nome, payload.descricao.strip()),
        )
        connection.execute(
            """
            INSERT INTO membros_campanha (campanha_id, usuario_id, papel)
            VALUES (%s, %s, 'mestre')
            """,
            (campaign_id, user.id),
        )
        record_audit(
            connection,
            action="campanha.criada",
            actor_user_id=user.id,
            campaign_id=campaign_id,
            target_type="campanha",
            target_id=str(campaign_id),
        )
    return {
        "id": campaign_id,
        "nome": payload.nome,
        "descricao": payload.descricao.strip(),
        "papel": "mestre",
        "status": "ativa",
    }


@router.get("")
def list_campaigns(
    user: AuthenticatedUser = Depends(get_current_user),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        if user.is_creator:
            rows = connection.execute(
                """
                SELECT c.id, c.nome, c.descricao, c.status, c.atualizado_em,
                       c.dono_id, 'mestre' AS papel,
                       m.personagem_ativo_id
                FROM campanhas c
                LEFT JOIN membros_campanha m
                  ON m.campanha_id=c.id AND m.usuario_id=%s AND m.status='ativo'
                WHERE c.status='ativa'
                ORDER BY c.atualizado_em DESC
                """,
                (user.id,),
            ).fetchall()
        else:
            rows = connection.execute(
                """
                SELECT c.id, c.nome, c.descricao, c.status, c.atualizado_em,
                       c.dono_id, m.papel, m.personagem_ativo_id
                FROM campanhas c
                JOIN membros_campanha m ON m.campanha_id=c.id
                WHERE m.usuario_id=%s AND m.status='ativo' AND c.status='ativa'
                ORDER BY c.atualizado_em DESC
                """,
                (user.id,),
            ).fetchall()
    return {"campanhas": [dict(row) for row in rows]}


@router.get("/{campaign_id}")
def get_campaign(
    campaign_id: UUID,
    user: AuthenticatedUser = Depends(get_current_user),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        access = campaign_access(connection, campaign_id, user.id)
        campaign = connection.execute(
            """
            SELECT id, nome, descricao, status, configuracoes, dono_id,
                   criado_em, atualizado_em
            FROM campanhas WHERE id=%s
            """,
            (campaign_id,),
        ).fetchone()
        members = []
        discord_link = connection.execute(
            """
            SELECT discord_guild_id, vinculado_em
            FROM campanhas_discord WHERE campanha_id=%s
            """,
            (campaign_id,),
        ).fetchone()
        if access.manages_content:
            members = connection.execute(
                """
                SELECT u.id, u.nome_exibicao, u.email, u.papel_plataforma,
                       u.ativo, m.papel, m.status, m.entrou_em,
                       m.personagem_ativo_id
                FROM membros_campanha m
                JOIN usuarios u ON u.id=m.usuario_id
                WHERE m.campanha_id=%s AND m.status='ativo'
                ORDER BY m.papel, u.nome_exibicao
                """,
                (campaign_id,),
            ).fetchall()
    return {
        "campanha": dict(campaign),
        "meu_papel": access.role,
        "discord": dict(discord_link) if discord_link else None,
        "membros": [dict(row) for row in members],
    }


@router.put("/{campaign_id}")
def update_campaign(
    campaign_id: UUID,
    payload: CampaignUpdateInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        access = campaign_access(connection, campaign_id, user.id)
        if not access.is_master:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="somente o mestre altera a campanha",
            )
        current = connection.execute(
            "SELECT nome, descricao FROM campanhas WHERE id=%s FOR UPDATE",
            (campaign_id,),
        ).fetchone()
        row = connection.execute(
            """
            UPDATE campanhas
            SET nome=%s, descricao=%s, atualizado_em=CURRENT_TIMESTAMP
            WHERE id=%s AND status='ativa'
            RETURNING id, dono_id, nome, descricao, status, atualizado_em
            """,
            (
                payload.nome if payload.nome is not None else current["nome"],
                payload.descricao if payload.descricao is not None else current["descricao"],
                campaign_id,
            ),
        ).fetchone()
        record_audit(
            connection,
            action="campanha.atualizada",
            actor_user_id=user.id,
            campaign_id=campaign_id,
            target_type="campanha",
            target_id=str(campaign_id),
            details={
                "nome_anterior": current["nome"],
                "nome_novo": row["nome"],
            },
        )
    return {"campanha": dict(row)}


@router.delete("/{campaign_id}", status_code=status.HTTP_204_NO_CONTENT)
def archive_campaign(
    campaign_id: UUID,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        access = campaign_access(connection, campaign_id, user.id)
        if not access.is_master:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="somente o mestre arquiva a campanha",
            )
        campaign = connection.execute(
            "SELECT nome FROM campanhas WHERE id=%s",
            (campaign_id,),
        ).fetchone()
        notify(
            connection,
            user_ids=campaign_member_ids(connection, campaign_id),
            category="campanha",
            title=f"{campaign['nome']} foi arquivada",
            message="A campanha saiu do acesso normal. Fichas e histórico continuam salvos.",
            campaign_id=campaign_id,
            actor_user_id=user.id,
        )
        connection.execute(
            """
            UPDATE campanhas
            SET status='arquivada', atualizado_em=CURRENT_TIMESTAMP
            WHERE id=%s
            """,
            (campaign_id,),
        )
        record_audit(
            connection,
            action="campanha.arquivada",
            actor_user_id=user.id,
            campaign_id=campaign_id,
            target_type="campanha",
            target_id=str(campaign_id),
        )
    return None


@router.put("/{campaign_id}/personagem-ativo")
def set_active_character(
    campaign_id: UUID,
    payload: ActiveCharacterInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        campaign_access(connection, campaign_id, user.id)
        character = connection.execute(
            """
            SELECT id FROM personagens
            WHERE id=%s AND campanha_id=%s AND dono_usuario_id=%s
              AND status='ativo'
            """,
            (payload.personagem_id, campaign_id, user.id),
        ).fetchone()
        if not character:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="selecione um personagem seu desta campanha",
            )
        connection.execute(
            """
            UPDATE membros_campanha
            SET personagem_ativo_id=%s, atualizado_em=CURRENT_TIMESTAMP
            WHERE campanha_id=%s AND usuario_id=%s AND status='ativo'
            """,
            (payload.personagem_id, campaign_id, user.id),
        )
        record_audit(
            connection,
            action="campanha.personagem_ativo_alterado",
            actor_user_id=user.id,
            campaign_id=campaign_id,
            target_type="personagem",
            target_id=str(payload.personagem_id),
        )
    return {"campanha_id": campaign_id, "personagem_ativo_id": payload.personagem_id}


@router.post("/{campaign_id}/convites", status_code=status.HTTP_201_CREATED)
def create_invite(
    campaign_id: UUID,
    payload: CampaignInviteInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    raw_code = new_secret_token(18)
    invite_id = uuid4()
    expires = datetime.now(timezone.utc) + timedelta(days=payload.expira_em_dias)
    with database.connection() as connection:
        require_campaign_manager(connection, campaign_id, user.id)
        connection.execute(
            """
            INSERT INTO convites_campanha
                (id, campanha_id, criado_por, codigo_hash, papel,
                 max_usos, expira_em)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            """,
            (
                invite_id,
                campaign_id,
                user.id,
                hash_token(raw_code),
                payload.papel,
                payload.max_usos,
                expires,
            ),
        )
        record_audit(
            connection,
            action="campanha.convite_criado",
            actor_user_id=user.id,
            campaign_id=campaign_id,
            target_type="convite",
            target_id=str(invite_id),
            details={"papel": payload.papel, "max_usos": payload.max_usos},
        )
    return {"id": invite_id, "codigo": raw_code, "expira_em": expires, "papel": payload.papel}


@router.get("/{campaign_id}/convites")
def list_invites(
    campaign_id: UUID,
    user: AuthenticatedUser = Depends(get_current_user),
    database: Database = Depends(get_database),
):
    """Convites ainda utilizáveis. O código em si nunca volta — só o hash existe."""
    now = datetime.now(timezone.utc)
    with database.connection() as connection:
        require_campaign_manager(connection, campaign_id, user.id)
        rows = connection.execute(
            """
            SELECT i.id, i.papel, i.max_usos, i.usos, i.expira_em,
                   i.revogado_em, i.criado_em, u.nome_exibicao AS criado_por_nome
            FROM convites_campanha i
            LEFT JOIN usuarios u ON u.id=i.criado_por
            WHERE i.campanha_id=%s AND i.revogado_em IS NULL
              AND i.expira_em > %s AND i.usos < i.max_usos
            ORDER BY i.criado_em DESC
            """,
            (campaign_id, now),
        ).fetchall()
    return {"convites": [dict(row) for row in rows]}


@router.delete("/{campaign_id}/convites/{invite_id}", status_code=status.HTTP_204_NO_CONTENT)
def revoke_invite(
    campaign_id: UUID,
    invite_id: UUID,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        require_campaign_manager(connection, campaign_id, user.id)
        row = connection.execute(
            """
            UPDATE convites_campanha SET revogado_em=CURRENT_TIMESTAMP
            WHERE id=%s AND campanha_id=%s AND revogado_em IS NULL
            RETURNING id
            """,
            (invite_id, campaign_id),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="convite nao encontrado")
        record_audit(
            connection,
            action="campanha.convite_revogado",
            actor_user_id=user.id,
            campaign_id=campaign_id,
            target_type="convite",
            target_id=str(invite_id),
        )
    return None


@router.delete("/{campaign_id}/membros/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_member(
    campaign_id: UUID,
    member_id: UUID,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    """Remove o membro sem apagar personagens, economia ou histórico."""
    with database.connection() as connection:
        access = campaign_access(connection, campaign_id, user.id)
        if not access.is_master:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="somente o mestre remove membros")
        if member_id == access.owner_id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="transfira a campanha antes de remover o dono",
            )
        row = connection.execute(
            """
            UPDATE membros_campanha
            SET status='removido', personagem_ativo_id=NULL,
                atualizado_em=CURRENT_TIMESTAMP
            WHERE campanha_id=%s AND usuario_id=%s AND status='ativo'
            RETURNING usuario_id
            """,
            (campaign_id, member_id),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="membro nao encontrado")
        campaign = connection.execute(
            "SELECT nome FROM campanhas WHERE id=%s",
            (campaign_id,),
        ).fetchone()
        notify(
            connection,
            user_ids=[member_id],
            category="campanha",
            title=f"Você saiu de {campaign['nome']}",
            message="O mestre removeu seu acesso a esta campanha. Suas fichas continuam salvas.",
            campaign_id=campaign_id,
            actor_user_id=user.id,
        )
        record_audit(
            connection,
            action="campanha.membro_removido",
            actor_user_id=user.id,
            campaign_id=campaign_id,
            target_type="usuario",
            target_id=str(member_id),
        )
    return None


@router.post("/entrar", status_code=status.HTTP_201_CREATED)
def join_campaign(
    payload: JoinCampaignInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    now = datetime.now(timezone.utc)
    with database.connection() as connection:
        invite = connection.execute(
            """
            SELECT id, campanha_id, papel, max_usos, usos, expira_em, revogado_em
            FROM convites_campanha WHERE codigo_hash=%s FOR UPDATE
            """,
            (hash_token(payload.codigo.strip()),),
        ).fetchone()
        if (
            not invite
            or invite["revogado_em"] is not None
            or invite["expira_em"] <= now
            or invite["usos"] >= invite["max_usos"]
        ):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="convite invalido ou expirado")
        existing = connection.execute(
            """
            SELECT papel, status FROM membros_campanha
            WHERE campanha_id=%s AND usuario_id=%s
            """,
            (invite["campanha_id"], user.id),
        ).fetchone()
        if not existing or existing["status"] != "ativo":
            connection.execute(
                """
                INSERT INTO membros_campanha (campanha_id, usuario_id, papel, status)
                VALUES (%s, %s, %s, 'ativo')
                ON CONFLICT (campanha_id, usuario_id) DO UPDATE SET
                    papel=EXCLUDED.papel,
                    status='ativo',
                    atualizado_em=CURRENT_TIMESTAMP
                """,
                (invite["campanha_id"], user.id, invite["papel"]),
            )
            connection.execute(
                "UPDATE convites_campanha SET usos=usos+1 WHERE id=%s",
                (invite["id"],),
            )
        notify(
            connection,
            user_ids=campaign_member_ids(
                connection,
                invite["campanha_id"],
                roles=("mestre", "assistente"),
            ),
            category="campanha",
            title=f"{user.nome_exibicao} entrou na campanha",
            message=f"Entrou como {invite['papel']} usando um convite.",
            campaign_id=invite["campanha_id"],
            actor_user_id=user.id,
        )
        record_audit(
            connection,
            action="campanha.membro_entrou",
            actor_user_id=user.id,
            campaign_id=invite["campanha_id"],
            target_type="usuario",
            target_id=str(user.id),
            details={"papel": invite["papel"]},
        )
    return {"campanha_id": invite["campanha_id"], "papel": invite["papel"]}


@router.put("/{campaign_id}/membros/{member_id}/papel")
def update_member_role(
    campaign_id: UUID,
    member_id: UUID,
    payload: MemberRoleInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        access = campaign_access(connection, campaign_id, user.id)
        if not access.is_master:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="somente o mestre altera papeis")
        if member_id == access.owner_id and payload.papel != "mestre":
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="o dono da campanha deve continuar mestre")
        row = connection.execute(
            """
            UPDATE membros_campanha SET papel=%s, atualizado_em=CURRENT_TIMESTAMP
            WHERE campanha_id=%s AND usuario_id=%s AND status='ativo'
            RETURNING usuario_id, papel
            """,
            (payload.papel, campaign_id, member_id),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="membro nao encontrado")
        campaign = connection.execute(
            "SELECT nome FROM campanhas WHERE id=%s",
            (campaign_id,),
        ).fetchone()
        notify(
            connection,
            user_ids=[member_id],
            category="campanha",
            title=f"Seu papel em {campaign['nome']} mudou",
            message=f"Agora você é {payload.papel} nesta campanha.",
            campaign_id=campaign_id,
            actor_user_id=user.id,
            details={"papel": payload.papel},
        )
        record_audit(
            connection,
            action="campanha.papel_alterado",
            actor_user_id=user.id,
            campaign_id=campaign_id,
            target_type="usuario",
            target_id=str(member_id),
            details={"papel": payload.papel},
        )
    return dict(row)


@router.put("/{campaign_id}/dono")
def transfer_campaign_ownership(
    campaign_id: UUID,
    payload: CampaignOwnerInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        access = campaign_access(connection, campaign_id, user.id)
        if access.owner_id != user.id and not user.is_creator:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="somente o dono ou o criador transfere a campanha",
            )
        if payload.novo_dono_id == access.owner_id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="essa conta ja e dona da campanha",
            )
        target = connection.execute(
            """
            SELECT u.id, u.papel_plataforma
            FROM usuarios u
            JOIN membros_campanha m
              ON m.usuario_id=u.id AND m.campanha_id=%s AND m.status='ativo'
            WHERE u.id=%s AND u.ativo=TRUE
            """,
            (campaign_id, payload.novo_dono_id),
        ).fetchone()
        if not target:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="o novo dono precisa ser membro ativo da campanha",
            )
        if target["papel_plataforma"] not in {"mestre", "criador"}:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="altere primeiro o cargo global da conta para mestre",
            )
        connection.execute(
            """
            UPDATE campanhas
            SET dono_id=%s, atualizado_em=CURRENT_TIMESTAMP
            WHERE id=%s
            """,
            (payload.novo_dono_id, campaign_id),
        )
        connection.execute(
            """
            UPDATE membros_campanha
            SET papel='mestre', atualizado_em=CURRENT_TIMESTAMP
            WHERE campanha_id=%s AND usuario_id=%s
            """,
            (campaign_id, payload.novo_dono_id),
        )
        campaign = connection.execute(
            "SELECT nome FROM campanhas WHERE id=%s",
            (campaign_id,),
        ).fetchone()
        notify(
            connection,
            user_ids=campaign_member_ids(connection, campaign_id),
            category="campanha",
            title=f"{campaign['nome']} tem um novo dono",
            message="A propriedade da campanha foi transferida.",
            campaign_id=campaign_id,
            actor_user_id=user.id,
            details={"novo_dono_id": str(payload.novo_dono_id)},
        )
        record_audit(
            connection,
            action="campanha.propriedade_transferida",
            actor_user_id=user.id,
            campaign_id=campaign_id,
            target_type="usuario",
            target_id=str(payload.novo_dono_id),
            details={"dono_anterior": str(access.owner_id)},
        )
    return {"campanha_id": campaign_id, "dono_id": payload.novo_dono_id}


@router.get("/{campaign_id}/auditoria")
def list_audit_events(
    campaign_id: UUID,
    limite: int = 100,
    user: AuthenticatedUser = Depends(get_current_user),
    database: Database = Depends(get_database),
):
    limite = max(1, min(500, limite))
    with database.connection() as connection:
        require_campaign_manager(connection, campaign_id, user.id)
        rows = connection.execute(
            """
            SELECT e.id, e.ator_usuario_id, u.nome_exibicao AS ator_nome,
                   e.ator_servico, e.acao, e.alvo_tipo, e.alvo_id,
                   e.detalhes, e.criado_em
            FROM eventos_auditoria e
            LEFT JOIN usuarios u ON u.id=e.ator_usuario_id
            WHERE e.campanha_id=%s
            ORDER BY e.criado_em DESC
            LIMIT %s
            """,
            (campaign_id, limite),
        ).fetchall()
    return {"eventos": [dict(row) for row in rows]}
