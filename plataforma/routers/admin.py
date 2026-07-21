from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status

from core.audit import record_audit
from core.backup import gerar_backup, nome_do_arquivo
from core.database import Database
from core.dependencies import (
    AuthenticatedUser,
    get_database,
    require_csrf,
    require_platform_admin,
)
from core.notifications import notify
from core.security import hash_password, new_temporary_password
from schemas import AdminUserUpdateInput


ROLE_LABELS = {
    "player": "Player",
    "mestre": "Mestre",
    "admin": "Administrador",
    "criador": "Criador",
}


router = APIRouter(prefix="/admin", tags=["administracao"])


def _require_admin_csrf(
    user: AuthenticatedUser = Depends(require_csrf),
) -> AuthenticatedUser:
    if not user.is_platform_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="permissao de administrador necessaria",
        )
    return user


def _public_user(row) -> dict:
    return {
        "id": row["id"],
        "email": row["email"],
        "nome_exibicao": row["nome_exibicao"],
        "papel_plataforma": row["papel_plataforma"],
        "ativo": bool(row["ativo"]),
        "email_verificado": bool(row["email_verificado"]),
        "criado_em": row["criado_em"],
        "atualizado_em": row["atualizado_em"],
    }


@router.get("/resumo")
def admin_summary(
    user: AuthenticatedUser = Depends(require_platform_admin),
    database: Database = Depends(get_database),
):
    del user
    with database.connection() as connection:
        rows = connection.execute(
            """
            SELECT papel_plataforma, ativo, COUNT(*) AS total
            FROM usuarios
            GROUP BY papel_plataforma, ativo
            """
        ).fetchall()
        campaigns = connection.execute(
            """
            SELECT status, COUNT(*) AS total
            FROM campanhas GROUP BY status
            """
        ).fetchall()
    return {
        "usuarios": [dict(row) for row in rows],
        "campanhas": [dict(row) for row in campaigns],
    }


@router.get("/usuarios")
def list_users(
    busca: str = Query(default="", max_length=120),
    papel: str | None = Query(
        default=None,
        pattern=r"^(player|mestre|admin|criador)$",
    ),
    ativo: bool | None = None,
    pagina: int = Query(default=1, ge=1),
    por_pagina: int = Query(default=25, ge=10, le=100),
    user: AuthenticatedUser = Depends(require_platform_admin),
    database: Database = Depends(get_database),
):
    del user
    term = busca.strip()
    like_term = f"%{term}%"
    offset = (pagina - 1) * por_pagina
    with database.connection() as connection:
        total = connection.execute(
            """
            SELECT COUNT(*) AS total
            FROM usuarios
            WHERE (%s = '' OR nome_exibicao ILIKE %s OR email ILIKE %s)
              AND (%s IS NULL OR papel_plataforma=%s)
              AND (%s IS NULL OR ativo=%s)
            """,
            (term, like_term, like_term, papel, papel, ativo, ativo),
        ).fetchone()["total"]
        rows = connection.execute(
            """
            SELECT id, email, nome_exibicao, papel_plataforma, ativo,
                   email_verificado, criado_em, atualizado_em
            FROM usuarios
            WHERE (%s = '' OR nome_exibicao ILIKE %s OR email ILIKE %s)
              AND (%s IS NULL OR papel_plataforma=%s)
              AND (%s IS NULL OR ativo=%s)
            ORDER BY ativo DESC, papel_plataforma, nome_exibicao
            LIMIT %s OFFSET %s
            """,
            (
                term,
                like_term,
                like_term,
                papel,
                papel,
                ativo,
                ativo,
                por_pagina,
                offset,
            ),
        ).fetchall()
    return {
        "usuarios": [_public_user(row) for row in rows],
        "paginacao": {
            "pagina": pagina,
            "por_pagina": por_pagina,
            "total": int(total),
            "paginas": max(1, (int(total) + por_pagina - 1) // por_pagina),
        },
    }


@router.get("/pedidos-senha")
def list_password_requests(
    user: AuthenticatedUser = Depends(require_platform_admin),
    database: Database = Depends(get_database),
):
    """Fila de quem pediu ajuda com a senha na tela de entrada."""
    del user
    with database.connection() as connection:
        rows = connection.execute(
            """
            SELECT p.id, p.email, p.status, p.criado_em, p.usuario_id,
                   u.nome_exibicao, u.papel_plataforma, u.ativo
            FROM pedidos_senha p
            LEFT JOIN usuarios u ON u.id = p.usuario_id
            WHERE p.status='aberto'
            ORDER BY p.criado_em
            """
        ).fetchall()
    return {"pedidos": [dict(row) for row in rows]}


@router.delete("/pedidos-senha/{pedido_id}", status_code=status.HTTP_204_NO_CONTENT)
def dismiss_password_request(
    pedido_id: UUID,
    actor: AuthenticatedUser = Depends(_require_admin_csrf),
    database: Database = Depends(get_database),
):
    """Arquiva um pedido sem redefinir — para quando não era a pessoa mesmo."""
    with database.connection() as connection:
        row = connection.execute(
            """
            UPDATE pedidos_senha
            SET status='recusado', atendido_por=%s, atendido_em=CURRENT_TIMESTAMP
            WHERE id=%s AND status='aberto'
            RETURNING email
            """,
            (actor.id, pedido_id),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="pedido nao encontrado")
        record_audit(
            connection,
            action="admin.pedido_senha_recusado",
            actor_user_id=actor.id,
            target_type="conta",
            target_id=row["email"],
        )
    return None


@router.get("/backup")
def download_backup(
    actor: AuthenticatedUser = Depends(require_platform_admin),
    database: Database = Depends(get_database),
):
    """Baixa o banco inteiro como arquivo. Guarde fora do servidor.

    O arquivo contém e-mails e hashes de senha — trate como material sensível.
    Sessões, códigos de vínculo e limites de login ficam de fora de propósito.
    """
    conteudo, resumo = gerar_backup(database)
    with database.connection() as connection:
        record_audit(
            connection,
            action="admin.backup_gerado",
            actor_user_id=actor.id,
            target_type="plataforma",
            details={"linhas": resumo["linhas"], "bytes": resumo["bytes"]},
        )
    return Response(
        content=conteudo,
        media_type="application/gzip",
        headers={
            "Content-Disposition": f'attachment; filename="{nome_do_arquivo()}"',
            "X-Backup-Linhas": str(resumo["linhas"]),
            "Cache-Control": "no-store",
        },
    )


@router.get("/campanhas")
def list_all_campaigns(
    incluir_arquivadas: bool = Query(default=False),
    user: AuthenticatedUser = Depends(require_platform_admin),
    database: Database = Depends(get_database),
):
    del user
    with database.connection() as connection:
        rows = connection.execute(
            """
            SELECT c.id, c.nome, c.descricao, c.status, c.criado_em,
                   c.atualizado_em, c.dono_id,
                   d.nome_exibicao AS dono_nome, d.email AS dono_email,
                   (SELECT COUNT(*) FROM membros_campanha m
                     WHERE m.campanha_id=c.id AND m.status='ativo') AS membros,
                   (SELECT COUNT(*) FROM personagens p
                     WHERE p.campanha_id=c.id AND p.status='ativo') AS personagens,
                   (SELECT COUNT(*) FROM informacoes_campanha i
                     WHERE i.campanha_id=c.id) AS publicacoes,
                   EXISTS (SELECT 1 FROM campanhas_discord g
                            WHERE g.campanha_id=c.id) AS discord
            FROM campanhas c
            LEFT JOIN usuarios d ON d.id=c.dono_id
            WHERE (%s IS TRUE OR c.status='ativa')
            ORDER BY c.status, c.atualizado_em DESC
            """,
            (incluir_arquivadas,),
        ).fetchall()
    return {"campanhas": [dict(row) for row in rows]}


@router.get("/auditoria")
def list_platform_audit(
    limite: int = Query(default=80, ge=1, le=300),
    user: AuthenticatedUser = Depends(require_platform_admin),
    database: Database = Depends(get_database),
):
    """Últimos eventos de toda a plataforma, inclusive fora de campanha."""
    del user
    with database.connection() as connection:
        rows = connection.execute(
            """
            SELECT e.id, e.acao, e.alvo_tipo, e.alvo_id, e.detalhes,
                   e.criado_em, e.ator_servico,
                   u.nome_exibicao AS ator_nome,
                   c.nome AS campanha_nome
            FROM eventos_auditoria e
            LEFT JOIN usuarios u ON u.id=e.ator_usuario_id
            LEFT JOIN campanhas c ON c.id=e.campanha_id
            ORDER BY e.criado_em DESC
            LIMIT %s
            """,
            (limite,),
        ).fetchall()
    return {"eventos": [dict(row) for row in rows]}


@router.put("/usuarios/{user_id}")
def update_user(
    user_id: UUID,
    payload: AdminUserUpdateInput,
    actor: AuthenticatedUser = Depends(_require_admin_csrf),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        current = connection.execute(
            """
            SELECT id, email, nome_exibicao, papel_plataforma, ativo,
                   email_verificado, criado_em, atualizado_em
            FROM usuarios WHERE id=%s FOR UPDATE
            """,
            (user_id,),
        ).fetchone()
        if not current:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="usuario nao encontrado",
            )
        if current["papel_plataforma"] == "criador":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="a conta criador so pode ser alterada pela configuracao segura do servidor",
            )
        if user_id == actor.id and payload.ativo is False:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="voce nao pode desativar a propria conta",
            )

        next_role = payload.papel_plataforma or current["papel_plataforma"]
        next_active = payload.ativo if payload.ativo is not None else bool(current["ativo"])
        if current["papel_plataforma"] == "admin" and (
            next_role != "admin" or not next_active
        ):
            remaining = connection.execute(
                """
                SELECT COUNT(*) AS total FROM usuarios
                WHERE id<>%s AND ativo=TRUE
                  AND papel_plataforma IN ('admin', 'criador')
                """,
                (user_id,),
            ).fetchone()["total"]
            if not remaining:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="a plataforma precisa manter ao menos um administrador ativo",
                )

        next_name = payload.nome_exibicao or current["nome_exibicao"]
        row = connection.execute(
            """
            UPDATE usuarios
            SET nome_exibicao=%s, papel_plataforma=%s, ativo=%s,
                admin_plataforma=%s, atualizado_em=CURRENT_TIMESTAMP
            WHERE id=%s
            RETURNING id, email, nome_exibicao, papel_plataforma, ativo,
                      email_verificado, criado_em, atualizado_em
            """,
            (
                next_name,
                next_role,
                next_active,
                next_role == "admin",
                user_id,
            ),
        ).fetchone()
        if not next_active:
            connection.execute(
                """
                UPDATE sessoes_auth SET revogada_em=CURRENT_TIMESTAMP
                WHERE usuario_id=%s AND revogada_em IS NULL
                """,
                (user_id,),
            )
        if next_role != current["papel_plataforma"]:
            notify(
                connection,
                user_ids=[user_id],
                category="conta",
                title=f"Seu cargo agora é {ROLE_LABELS.get(next_role, next_role)}",
                message=(
                    "Você já pode criar campanhas."
                    if next_role in {"mestre", "admin", "criador"}
                    else "Seu acesso de gestão foi removido."
                ),
                actor_user_id=actor.id,
                details={"papel": next_role},
            )
        if next_active and not current["ativo"]:
            notify(
                connection,
                user_ids=[user_id],
                category="conta",
                title="Sua conta foi reativada",
                message="Você já pode entrar normalmente.",
                actor_user_id=actor.id,
            )
        record_audit(
            connection,
            action="admin.usuario_atualizado",
            actor_user_id=actor.id,
            target_type="usuario",
            target_id=str(user_id),
            details={
                "papel_anterior": current["papel_plataforma"],
                "papel_novo": next_role,
                "ativo": next_active,
            },
        )
    return {"usuario": _public_user(row)}


@router.post("/usuarios/{user_id}/senha")
def reset_user_password(
    user_id: UUID,
    actor: AuthenticatedUser = Depends(_require_admin_csrf),
    database: Database = Depends(get_database),
):
    """Gera uma senha provisória e obriga a troca no próximo acesso.

    A senha em texto aparece uma única vez, nesta resposta: o admin a entrega
    pelo canal que já usa com a pessoa (Discord, presencialmente). O banco
    guarda só o hash, e todas as sessões abertas caem — se a conta foi perdida
    para outra pessoa, o reset expulsa quem estava dentro.
    """
    temporary = new_temporary_password()
    with database.connection() as connection:
        target = connection.execute(
            """
            SELECT id, nome_exibicao, papel_plataforma, ativo
            FROM usuarios WHERE id=%s FOR UPDATE
            """,
            (user_id,),
        ).fetchone()
        if not target:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="usuario nao encontrado",
            )
        if target["papel_plataforma"] == "criador":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="a senha da conta criador so pode ser trocada pela propria conta",
            )
        if not target["ativo"]:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="reative a conta antes de definir uma senha provisoria",
            )
        connection.execute(
            """
            UPDATE usuarios
            SET senha_hash=%s, senha_provisoria=TRUE,
                senha_alterada_em=CURRENT_TIMESTAMP,
                atualizado_em=CURRENT_TIMESTAMP
            WHERE id=%s
            """,
            (hash_password(temporary), user_id),
        )
        connection.execute(
            """
            UPDATE sessoes_auth SET revogada_em=CURRENT_TIMESTAMP
            WHERE usuario_id=%s AND revogada_em IS NULL
            """,
            (user_id,),
        )
        # Se a pessoa tinha pedido ajuda na tela de entrada, o pedido some da
        # fila agora — o admin não precisa fechar duas coisas.
        connection.execute(
            """
            UPDATE pedidos_senha
            SET status='atendido', atendido_por=%s, atendido_em=CURRENT_TIMESTAMP
            WHERE usuario_id=%s AND status='aberto'
            """,
            (actor.id, user_id),
        )
        notify(
            connection,
            user_ids=[user_id],
            category="conta",
            title="Sua senha foi redefinida",
            message=(
                "Um administrador gerou uma senha provisória para você. "
                "Escolha uma senha nova antes de continuar usando o site."
            ),
            actor_user_id=actor.id,
        )
        record_audit(
            connection,
            action="admin.senha_redefinida",
            actor_user_id=actor.id,
            target_type="usuario",
            target_id=str(user_id),
        )
    return {
        "usuario_id": user_id,
        "nome_exibicao": target["nome_exibicao"],
        "senha_provisoria": temporary,
    }


@router.delete("/usuarios/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def deactivate_user(
    user_id: UUID,
    actor: AuthenticatedUser = Depends(_require_admin_csrf),
    database: Database = Depends(get_database),
):
    if user_id == actor.id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="voce nao pode desativar a propria conta",
        )
    with database.connection() as connection:
        target = connection.execute(
            """
            SELECT id, papel_plataforma, ativo
            FROM usuarios WHERE id=%s FOR UPDATE
            """,
            (user_id,),
        ).fetchone()
        if not target:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="usuario nao encontrado",
            )
        if target["papel_plataforma"] == "criador":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="a conta criador nao pode ser desativada pelo painel",
            )
        owned = connection.execute(
            """
            SELECT COUNT(*) AS total FROM campanhas
            WHERE dono_id=%s AND status='ativa'
            """,
            (user_id,),
        ).fetchone()["total"]
        if owned:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="arquive ou transfira as campanhas deste mestre antes de desativar a conta",
            )
        connection.execute(
            """
            UPDATE usuarios
            SET ativo=FALSE, atualizado_em=CURRENT_TIMESTAMP
            WHERE id=%s
            """,
            (user_id,),
        )
        connection.execute(
            """
            UPDATE sessoes_auth SET revogada_em=CURRENT_TIMESTAMP
            WHERE usuario_id=%s AND revogada_em IS NULL
            """,
            (user_id,),
        )
        record_audit(
            connection,
            action="admin.usuario_desativado",
            actor_user_id=actor.id,
            target_type="usuario",
            target_id=str(user_id),
        )
    return None
