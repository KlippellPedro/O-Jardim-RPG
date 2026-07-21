from __future__ import annotations

from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, status
from psycopg.types.json import Jsonb

from core import live_session
from core.dados import rolar_formula, rolar_teste
from core.database import Database
from core.dependencies import (
    AuthenticatedUser,
    campaign_access,
    get_current_user,
    get_database,
    require_csrf,
)
from schemas import RollInput, UsageInput


router = APIRouter(prefix="/registros", tags=["registros-da-mesa"])


def _sessao_atual(connection, campanha_id: UUID):
    linha = connection.execute(
        "SELECT id FROM sessoes_mesa WHERE campanha_id=%s AND status='aberta'",
        (campanha_id,),
    ).fetchone()
    return linha["id"] if linha else None


def _autor(connection, campanha_id: UUID, personagem_id: UUID | None, user: AuthenticatedUser):
    """Nome que aparece no log: o personagem quando houver, senão a conta."""
    if personagem_id is None:
        return None, user.nome_exibicao
    linha = connection.execute(
        """
        SELECT id, nome, dono_usuario_id FROM personagens
        WHERE id=%s AND campanha_id=%s AND status='ativo'
        """,
        (personagem_id, campanha_id),
    ).fetchone()
    if not linha:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="personagem nao pertence a esta campanha",
        )
    return linha["id"], linha["nome"]


def _gravar(connection, *, campanha_id, sessao_id, user, personagem_id, autor_nome,
            tipo, titulo, formula, resultado, detalhes) -> dict:
    registro_id = uuid4()
    linha = connection.execute(
        """
        INSERT INTO registros_mesa
            (id, campanha_id, sessao_id, usuario_id, personagem_id, autor_nome,
             tipo, titulo, formula, resultado, detalhes)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING id, tipo, titulo, formula, resultado, detalhes, autor_nome, criado_em
        """,
        (
            registro_id, campanha_id, sessao_id, user.id, personagem_id, autor_nome,
            tipo, titulo, formula or "", resultado, Jsonb(detalhes),
        ),
    ).fetchone()
    return dict(linha)


@router.post("/rolagem", status_code=status.HTTP_201_CREATED)
def rolar(
    payload: RollInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    """Rola e grava. O resultado nasce aqui — o cliente não pode escolhê-lo."""
    with database.connection() as connection:
        acesso = campaign_access(connection, payload.campanha_id, user.id)
        if acesso.role == "observador":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="observadores nao rolam dados")
        personagem_id, autor_nome = _autor(connection, payload.campanha_id, payload.personagem_id, user)

        if payload.formula:
            try:
                dados = rolar_formula(payload.formula)
            except ValueError as erro:
                raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(erro)) from None
            tipo, formula_usada = "dano", dados["formula"]
        else:
            dados = rolar_teste(
                payload.bonus,
                payload.vantagens,
                payload.desvantagens,
                payload.dt,
            )
            tipo = "rolagem"
            formula_usada = f"d20{payload.bonus:+d}" if payload.bonus else "d20"

        registro = _gravar(
            connection,
            campanha_id=payload.campanha_id,
            sessao_id=_sessao_atual(connection, payload.campanha_id),
            user=user,
            personagem_id=personagem_id,
            autor_nome=autor_nome,
            tipo=tipo,
            titulo=payload.titulo,
            formula=formula_usada,
            resultado=dados["total"],
            detalhes={**dados, "origem": payload.origem},
        )
    live_session.publicar(payload.campanha_id, "registro", 0)
    return {"registro": registro}


@router.post("/uso", status_code=status.HTTP_201_CREATED)
def registrar_uso(
    payload: UsageInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    """Marca que um poder, habilidade, magia ou item foi usado."""
    with database.connection() as connection:
        acesso = campaign_access(connection, payload.campanha_id, user.id)
        if acesso.role == "observador":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="observadores nao registram usos")
        personagem_id, autor_nome = _autor(connection, payload.campanha_id, payload.personagem_id, user)
        registro = _gravar(
            connection,
            campanha_id=payload.campanha_id,
            sessao_id=_sessao_atual(connection, payload.campanha_id),
            user=user,
            personagem_id=personagem_id,
            autor_nome=autor_nome,
            tipo=payload.tipo,
            titulo=payload.titulo,
            formula="",
            resultado=None,
            detalhes=payload.detalhes,
        )
    live_session.publicar(payload.campanha_id, "registro", 0)
    return {"registro": registro}


@router.get("")
def listar(
    campanha_id: UUID,
    apenas_sessao: bool = Query(default=False),
    limite: int = Query(default=60, ge=1, le=300),
    user: AuthenticatedUser = Depends(get_current_user),
    database: Database = Depends(get_database),
):
    """Log da mesa. O mestre vê tudo; o jogador vê o que ele mesmo registrou.

    Um jogador não deve descobrir pelo log que outro rolou Furtividade — isso
    entregaria a cena. Quem conduz precisa ver tudo, que é o ponto do registro.
    """
    with database.connection() as connection:
        acesso = campaign_access(connection, campanha_id, user.id)
        sessao_id = _sessao_atual(connection, campanha_id) if apenas_sessao else None
        if apenas_sessao and sessao_id is None:
            return {"registros": [], "comando": acesso.manages_content}

        linhas = connection.execute(
            """
            SELECT r.id, r.tipo, r.titulo, r.formula, r.resultado, r.detalhes,
                   r.autor_nome, r.personagem_id, r.criado_em,
                   u.nome_exibicao AS conta_nome
            FROM registros_mesa r
            LEFT JOIN usuarios u ON u.id = r.usuario_id
            WHERE r.campanha_id=%s
              AND (%s::uuid IS NULL OR r.sessao_id=%s)
              AND (%s IS TRUE OR r.usuario_id=%s)
            ORDER BY r.criado_em DESC
            LIMIT %s
            """,
            (
                campanha_id,
                sessao_id,
                sessao_id,
                acesso.manages_content,
                user.id,
                limite,
            ),
        ).fetchall()
    return {
        "registros": [dict(linha) for linha in linhas],
        "comando": acesso.manages_content,
    }
