from __future__ import annotations

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
    require_campaign_manager,
    require_csrf,
)
from core.notifications import campaign_member_ids, notify
from schemas import ContentAccessInput, ContentPublishInput


router = APIRouter(prefix="/conteudo", tags=["conteudo-central"])
_MODULE_LABELS = {"loja": "Itens", "mundo": "Mundo", "regras": "Área do mestre"}


def _library_rows(connection, module: str):
    if module == "loja":
        return connection.execute(
            """
            SELECT tipo, id AS chave_recurso, titulo,
                   jsonb_build_object(
                       'tipo', tipo, 'id', id, 'titulo', titulo,
                       'conteudo', conteudo
                   ) AS dados
            FROM catalogo_itens
            WHERE ativo=TRUE
            ORDER BY tipo, titulo
            """
        ).fetchall()
    return connection.execute(
        """
        SELECT tipo, chave_recurso, titulo, dados
        FROM biblioteca_conteudo
        WHERE modulo=%s AND ativo=TRUE
        ORDER BY tipo, titulo
        """,
        (module,),
    ).fetchall()


@router.get("/biblioteca")
def list_library(
    campanha_id: UUID,
    modulo: str = Query(pattern=r"^(loja|mundo|regras)$"),
    user: AuthenticatedUser = Depends(get_current_user),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        require_campaign_manager(connection, campanha_id, user.id)
        entries = _library_rows(connection, modulo)
        published = connection.execute(
            """
            SELECT id, chave_recurso, acesso_padrao
            FROM informacoes_campanha
            WHERE campanha_id=%s AND tipo=%s
            """,
            (campanha_id, modulo),
        ).fetchall()
    by_key = {row["chave_recurso"]: dict(row) for row in published}
    result = []
    for row in entries:
        item = dict(row)
        composite_key = f"{item['tipo']}:{item['chave_recurso']}"
        publication = by_key.get(composite_key)
        item["chave"] = composite_key
        item["publicacao"] = publication
        result.append(item)
    return {"modulo": modulo, "entradas": result}


@router.post("/publicar")
def publish_content(
    payload: ContentPublishInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    published = []
    with database.connection() as connection:
        require_campaign_manager(connection, payload.campanha_id, user.id)
        library = _library_rows(connection, payload.modulo)
        by_key = {
            f"{row['tipo']}:{row['chave_recurso']}": dict(row)
            for row in library
        }
        missing = [key for key in payload.chaves if key not in by_key]
        if missing:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"conteudo inexistente: {missing[0]}",
            )
        for key in payload.chaves:
            item = by_key[key]
            knowledge_id = uuid4()
            row = connection.execute(
                """
                INSERT INTO informacoes_campanha
                    (id, campanha_id, tipo, chave_recurso, titulo,
                     resumo_rumor, dados_parciais, dados_completos,
                     acesso_padrao, criado_por, atualizado_em)
                VALUES (%s, %s, %s, %s, %s, '', %s, %s, %s, %s, CURRENT_TIMESTAMP)
                ON CONFLICT (campanha_id, tipo, chave_recurso) DO UPDATE SET
                    titulo=EXCLUDED.titulo,
                    dados_parciais=EXCLUDED.dados_parciais,
                    dados_completos=EXCLUDED.dados_completos,
                    acesso_padrao=EXCLUDED.acesso_padrao,
                    atualizado_em=CURRENT_TIMESTAMP
                RETURNING id, chave_recurso, titulo, acesso_padrao
                """,
                (
                    knowledge_id,
                    payload.campanha_id,
                    payload.modulo,
                    key,
                    item["titulo"],
                    Jsonb(item["dados"]),
                    Jsonb(item["dados"]),
                    payload.acesso_padrao,
                    user.id,
                ),
            ).fetchone()
            published.append(dict(row))
        if payload.acesso_padrao != "oculto":
            rotulo = _MODULE_LABELS.get(payload.modulo, payload.modulo)
            amostra = ", ".join(item["titulo"] for item in published[:3])
            resto = len(published) - 3
            notify(
                connection,
                user_ids=campaign_member_ids(connection, payload.campanha_id),
                category="conteudo",
                title=f"{len(published)} novidade(s) liberadas em {rotulo}",
                message=amostra + (f" e mais {resto}." if resto > 0 else "."),
                campaign_id=payload.campanha_id,
                actor_user_id=user.id,
                details={"modulo": payload.modulo, "total": len(published)},
            )
        record_audit(
            connection,
            action="conteudo.publicado",
            actor_user_id=user.id,
            campaign_id=payload.campanha_id,
            target_type=payload.modulo,
            details={"chaves": payload.chaves, "acesso": payload.acesso_padrao},
        )
    return {"publicados": published}


@router.put("/{knowledge_id}/acesso")
def change_default_access(
    knowledge_id: UUID,
    payload: ContentAccessInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    """Muda o acesso padrão sem republicar — de 'todos veem' a 'só liberado'."""
    with database.connection() as connection:
        current = connection.execute(
            """
            SELECT campanha_id, tipo, titulo, acesso_padrao
            FROM informacoes_campanha WHERE id=%s
            """,
            (knowledge_id,),
        ).fetchone()
        if not current:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="conteudo nao encontrado")
        require_campaign_manager(connection, current["campanha_id"], user.id)
        row = connection.execute(
            """
            UPDATE informacoes_campanha
            SET acesso_padrao=%s, atualizado_em=CURRENT_TIMESTAMP
            WHERE id=%s
            RETURNING id, titulo, tipo, acesso_padrao
            """,
            (payload.acesso_padrao, knowledge_id),
        ).fetchone()
        if payload.acesso_padrao != "oculto" and current["acesso_padrao"] == "oculto":
            notify(
                connection,
                user_ids=campaign_member_ids(connection, current["campanha_id"]),
                category="conteudo",
                title=f"Liberado para a mesa: {current['titulo']}",
                message=f"Agora todos veem em {_MODULE_LABELS.get(current['tipo'], current['tipo'])}.",
                campaign_id=current["campanha_id"],
                actor_user_id=user.id,
            )
        record_audit(
            connection,
            action="conteudo.acesso_alterado",
            actor_user_id=user.id,
            campaign_id=current["campanha_id"],
            target_type=current["tipo"],
            target_id=str(knowledge_id),
            details={
                "acesso_anterior": current["acesso_padrao"],
                "acesso_novo": payload.acesso_padrao,
            },
        )
    return {"informacao": dict(row)}


@router.delete("/{knowledge_id}", status_code=status.HTTP_204_NO_CONTENT)
def unpublish_content(
    knowledge_id: UUID,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        row = connection.execute(
            "SELECT campanha_id, tipo FROM informacoes_campanha WHERE id=%s",
            (knowledge_id,),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="conteudo nao encontrado")
        require_campaign_manager(connection, row["campanha_id"], user.id)
        connection.execute("DELETE FROM informacoes_campanha WHERE id=%s", (knowledge_id,))
        record_audit(
            connection,
            action="conteudo.ocultado",
            actor_user_id=user.id,
            campaign_id=row["campanha_id"],
            target_type=row["tipo"],
            target_id=str(knowledge_id),
        )
    return None


@router.get("/visivel")
def visible_content(
    campanha_id: UUID,
    modulo: str = Query(pattern=r"^(loja|mundo|regras)$"),
    user: AuthenticatedUser = Depends(get_current_user),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        access = campaign_access(connection, campanha_id, user.id)
        rows = connection.execute(
            """
            SELECT id, chave_recurso, titulo, dados_completos, acesso_padrao
            FROM informacoes_campanha
            WHERE campanha_id=%s AND tipo=%s AND acesso_padrao <> 'oculto'
            ORDER BY titulo
            """,
            (campanha_id, modulo),
        ).fetchall()
        # Liberações mais específicas continuam sendo resolvidas pelo endpoint
        # /conhecimento. Esta rota cobre a publicação padrão para a campanha.
    return {
        "modulo": modulo,
        "papel": access.role,
        "entradas": [row["dados_completos"] for row in rows],
    }
