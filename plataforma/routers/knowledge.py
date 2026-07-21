from __future__ import annotations

from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, status
from psycopg.errors import UniqueViolation
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
from core.notifications import campaign_member_ids, character_owner_ids, notify
from schemas import KnowledgeCreateInput, KnowledgeGrantInput


router = APIRouter(prefix="/conhecimento", tags=["conhecimento"])
_ACCESS_RANK = {"oculto": 0, "rumor": 1, "parcial": 2, "completo": 3}


@router.post("", status_code=status.HTTP_201_CREATED)
def create_knowledge(
    payload: KnowledgeCreateInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    knowledge_id = uuid4()
    try:
        with database.connection() as connection:
            require_campaign_manager(connection, payload.campanha_id, user.id)
            connection.execute(
                """
                INSERT INTO informacoes_campanha
                    (id, campanha_id, tipo, chave_recurso, titulo,
                     resumo_rumor, dados_parciais, dados_completos,
                     acesso_padrao, criado_por)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    knowledge_id,
                    payload.campanha_id,
                    payload.tipo,
                    payload.chave_recurso,
                    payload.titulo,
                    payload.resumo_rumor,
                    Jsonb(payload.dados_parciais),
                    Jsonb(payload.dados_completos),
                    payload.acesso_padrao,
                    user.id,
                ),
            )
            record_audit(
                connection,
                action="conhecimento.criado",
                actor_user_id=user.id,
                campaign_id=payload.campanha_id,
                target_type="informacao",
                target_id=str(knowledge_id),
                details={"tipo": payload.tipo, "chave": payload.chave_recurso},
            )
    except UniqueViolation:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="essa informacao ja existe na campanha") from None
    return {"id": knowledge_id, **payload.model_dump()}


@router.put("/{knowledge_id}/liberacoes")
def grant_knowledge(
    knowledge_id: UUID,
    payload: KnowledgeGrantInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        knowledge = connection.execute(
            "SELECT campanha_id, titulo FROM informacoes_campanha WHERE id=%s",
            (knowledge_id,),
        ).fetchone()
        if not knowledge:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="informacao nao encontrada")
        campaign_id = knowledge["campanha_id"]
        require_campaign_manager(connection, campaign_id, user.id)

        if payload.destinatario_tipo == "papel":
            if payload.destinatario_id not in {"mestre", "assistente", "jogador", "observador"}:
                raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="papel invalido")
        elif payload.destinatario_tipo == "usuario":
            try:
                recipient_uuid = UUID(payload.destinatario_id)
            except ValueError:
                raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="usuario invalido") from None
            exists = connection.execute(
                """
                SELECT 1 FROM membros_campanha
                WHERE campanha_id=%s AND usuario_id=%s AND status='ativo'
                """,
                (campaign_id, recipient_uuid),
            ).fetchone()
            if not exists:
                raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="usuario nao pertence a campanha")
        else:
            try:
                recipient_uuid = UUID(payload.destinatario_id)
            except ValueError:
                raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="personagem invalido") from None
            exists = connection.execute(
                """
                SELECT 1 FROM personagens
                WHERE campanha_id=%s AND id=%s AND status='ativo'
                """,
                (campaign_id, recipient_uuid),
            ).fetchone()
            if not exists:
                raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="personagem nao pertence a campanha")

        grant_id = uuid4()
        row = connection.execute(
            """
            INSERT INTO liberacoes_informacao
                (id, campanha_id, informacao_id, destinatario_tipo,
                 destinatario_id, acesso, liberado_por)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (informacao_id, destinatario_tipo, destinatario_id)
            DO UPDATE SET acesso=EXCLUDED.acesso,
                          liberado_por=EXCLUDED.liberado_por,
                          liberado_em=CURRENT_TIMESTAMP
            RETURNING id, informacao_id, destinatario_tipo, destinatario_id,
                      acesso, liberado_em
            """,
            (
                grant_id,
                campaign_id,
                knowledge_id,
                payload.destinatario_tipo,
                payload.destinatario_id,
                payload.acesso,
                user.id,
            ),
        ).fetchone()
        if payload.destinatario_tipo == "usuario":
            destinatarios = [UUID(payload.destinatario_id)]
        elif payload.destinatario_tipo == "personagem":
            destinatarios = character_owner_ids(
                connection, campaign_id, [UUID(payload.destinatario_id)]
            )
        else:
            destinatarios = campaign_member_ids(
                connection, campaign_id, roles=(payload.destinatario_id,)
            )
        notify(
            connection,
            user_ids=destinatarios,
            category="conteudo",
            title=f"O mestre revelou: {knowledge['titulo']}",
            message=f"Nível de acesso: {payload.acesso}.",
            campaign_id=campaign_id,
            actor_user_id=user.id,
            details={"informacao_id": str(knowledge_id), "acesso": payload.acesso},
        )
        record_audit(
            connection,
            action="conhecimento.liberado",
            actor_user_id=user.id,
            campaign_id=campaign_id,
            target_type="informacao",
            target_id=str(knowledge_id),
            details=payload.model_dump(),
        )
    return dict(row)


@router.delete("/{knowledge_id}/liberacoes", status_code=status.HTTP_204_NO_CONTENT)
def revoke_knowledge_grant(
    knowledge_id: UUID,
    destinatario_tipo: str = Query(pattern=r"^(usuario|personagem|papel)$"),
    destinatario_id: str = Query(min_length=1, max_length=160),
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        knowledge = connection.execute(
            "SELECT campanha_id FROM informacoes_campanha WHERE id=%s",
            (knowledge_id,),
        ).fetchone()
        if not knowledge:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="informacao nao encontrada")
        require_campaign_manager(connection, knowledge["campanha_id"], user.id)
        connection.execute(
            """
            DELETE FROM liberacoes_informacao
            WHERE informacao_id=%s AND destinatario_tipo=%s AND destinatario_id=%s
            """,
            (knowledge_id, destinatario_tipo, destinatario_id),
        )
        record_audit(
            connection,
            action="conhecimento.liberacao_revogada",
            actor_user_id=user.id,
            campaign_id=knowledge["campanha_id"],
            target_type="informacao",
            target_id=str(knowledge_id),
            details={
                "destinatario_tipo": destinatario_tipo,
                "destinatario_id": destinatario_id,
            },
        )
    return None


@router.get("")
def list_knowledge(
    campanha_id: UUID,
    administrar: bool = Query(default=False),
    user: AuthenticatedUser = Depends(get_current_user),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        access = campaign_access(connection, campanha_id, user.id)
        entries = connection.execute(
            """
            SELECT id, tipo, chave_recurso, titulo, resumo_rumor,
                   dados_parciais, dados_completos, acesso_padrao, atualizado_em
            FROM informacoes_campanha
            WHERE campanha_id=%s ORDER BY tipo, titulo
            """,
            (campanha_id,),
        ).fetchall()
        if administrar:
            if not access.manages_content:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="permissao de mestre necessaria")
            grants = connection.execute(
                """
                SELECT id, informacao_id, destinatario_tipo, destinatario_id,
                       acesso, liberado_em
                FROM liberacoes_informacao WHERE campanha_id=%s
                ORDER BY liberado_em DESC
                """,
                (campanha_id,),
            ).fetchall()
            return {
                "informacoes": [dict(row) for row in entries],
                "liberacoes": [dict(row) for row in grants],
            }

        character_ids = {
            str(row["id"])
            for row in connection.execute(
                """
                SELECT id FROM personagens
                WHERE campanha_id=%s AND dono_usuario_id=%s AND status='ativo'
                """,
                (campanha_id, user.id),
            ).fetchall()
        }
        grants = connection.execute(
            """
            SELECT informacao_id, destinatario_tipo, destinatario_id, acesso
            FROM liberacoes_informacao WHERE campanha_id=%s
            """,
            (campanha_id,),
        ).fetchall()

    by_entry: dict[UUID, list[dict]] = {}
    for grant in grants:
        by_entry.setdefault(grant["informacao_id"], []).append(dict(grant))
    visible = []
    for entry in entries:
        level = "completo" if access.manages_content else entry["acesso_padrao"]
        for grant in by_entry.get(entry["id"], []):
            matches = (
                (grant["destinatario_tipo"] == "usuario" and grant["destinatario_id"] == str(user.id))
                or (grant["destinatario_tipo"] == "papel" and grant["destinatario_id"] == access.role)
                or (grant["destinatario_tipo"] == "personagem" and grant["destinatario_id"] in character_ids)
            )
            if matches and _ACCESS_RANK[grant["acesso"]] > _ACCESS_RANK[level]:
                level = grant["acesso"]
        if level == "oculto":
            continue
        item = {
            "id": entry["id"],
            "tipo": entry["tipo"],
            "chave_recurso": entry["chave_recurso"],
            "titulo": entry["titulo"],
            "acesso": level,
            "resumo": entry["resumo_rumor"],
        }
        if level in {"parcial", "completo"}:
            item["dados"] = entry["dados_parciais"]
        if level == "completo":
            item["dados"] = entry["dados_completos"]
        visible.append(item)
    return {"informacoes": visible}
