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
        """
        SELECT id, status FROM sessoes_mesa
        WHERE campanha_id=%s AND status IN ('preparacao', 'aberta')
        """,
        (campanha_id,),
    ).fetchone()
    return linha


def _autor(
    connection,
    campanha_id: UUID,
    personagem_id: UUID | None,
    user: AuthenticatedUser,
    *,
    permitir_personagem_alheio: bool,
):
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
    if not permitir_personagem_alheio and linha["dono_usuario_id"] != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="jogador so pode rolar como um personagem proprio",
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
        personagem_id, autor_nome = _autor(
            connection,
            payload.campanha_id,
            payload.personagem_id,
            user,
            permitir_personagem_alheio=acesso.manages_content,
        )

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

        sessao = _sessao_atual(connection, payload.campanha_id)
        registro = _gravar(
            connection,
            campanha_id=payload.campanha_id,
            sessao_id=sessao["id"] if sessao else None,
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


def _tocar_sessao(connection, sessao_id) -> int:
    """Sobe sessoes_mesa.versao — mesma ideia de sessions.py::_tocar (duplicado
    aqui de propósito: rotas deste arquivo não importam de routers/sessions.py,
    seguindo o padrão já usado por _sessao_atual acima)."""
    linha = connection.execute(
        "UPDATE sessoes_mesa SET versao=versao+1, atualizado_em=CURRENT_TIMESTAMP WHERE id=%s RETURNING versao",
        (sessao_id,),
    ).fetchone()
    return int(linha["versao"])


def _descontar_mana_na_sessao(connection, *, sessao_id, personagem_id, custo: int) -> int | None:
    """Quando um poder/habilidade/magia com custo em Mana é registrado
    (ver AbaPoderes.tsx / AbaHabilidades.tsx, que já descontam da ficha), e o
    personagem está em cena numa sessão ao vivo, desconta o mesmo valor do HUD
    de combate — senão o número que o mestre vê em sessão fica parado enquanto
    a ficha já gastou a Mana (auditoria 2026-08, achados 8-9). Só desconta;
    nunca deixa negativo, e nunca bloqueia o uso por falta de saldo aqui — essa
    checagem já aconteceu no cliente antes de registrar.

    Devolve a nova versão da sessão quando algo mudou (pra quem chamou saber
    que precisa publicar "participante_atualizado" e não só "registro" — sem
    isso o HUD ao vivo do mestre não atualizava sozinho; achado descoberto na
    validação pós-correção), ou None se não havia participante pra descontar."""
    linha = connection.execute(
        """
        SELECT id, mana_atual FROM sessao_participantes
        WHERE sessao_id=%s AND personagem_id=%s
        FOR UPDATE
        """,
        (sessao_id, personagem_id),
    ).fetchone()
    if not linha or linha["mana_atual"] is None:
        return None
    novo_valor = max(0, int(linha["mana_atual"]) - custo)
    connection.execute(
        "UPDATE sessao_participantes SET mana_atual=%s, atualizado_em=CURRENT_TIMESTAMP WHERE id=%s",
        (novo_valor, linha["id"]),
    )
    return _tocar_sessao(connection, sessao_id)


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
        personagem_id, autor_nome = _autor(
            connection,
            payload.campanha_id,
            payload.personagem_id,
            user,
            permitir_personagem_alheio=acesso.manages_content,
        )
        sessao = _sessao_atual(connection, payload.campanha_id)
        registro = _gravar(
            connection,
            campanha_id=payload.campanha_id,
            sessao_id=sessao["id"] if sessao else None,
            user=user,
            personagem_id=personagem_id,
            autor_nome=autor_nome,
            tipo=payload.tipo,
            titulo=payload.titulo,
            formula="",
            resultado=None,
            detalhes=payload.detalhes,
        )
        nova_versao_sessao = None
        if sessao and personagem_id and payload.detalhes.get("recurso") == "mana":
            custo = payload.detalhes.get("custo")
            if isinstance(custo, (int, float)) and not isinstance(custo, bool) and custo > 0:
                nova_versao_sessao = _descontar_mana_na_sessao(
                    connection,
                    sessao_id=sessao["id"],
                    personagem_id=personagem_id,
                    custo=int(custo),
                )
    live_session.publicar(payload.campanha_id, "registro", 0)
    if nova_versao_sessao is not None:
        # Sem isso, o HUD da sessão só atualizava com uma ação manual do
        # mestre — "registro" só refresca o log de rolagens/usos, não os
        # participantes (achado descoberto na validação pós-correção, 2026-08).
        live_session.publicar(payload.campanha_id, "participante_atualizado", nova_versao_sessao)
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
        sessao = _sessao_atual(connection, campanha_id) if apenas_sessao else None
        if apenas_sessao and (sessao is None or (sessao["status"] == "preparacao" and not acesso.manages_content)):
            return {"registros": [], "comando": acesso.manages_content}
        sessao_id = sessao["id"] if sessao else None

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
