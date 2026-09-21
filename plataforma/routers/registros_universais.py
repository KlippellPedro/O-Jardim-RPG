"""Registros Universais por campanha (regras em core/registros_universais.py).

Qualquer membro lê (recortado pelo papel); o Mestre e o assistente escrevem.
"""

from __future__ import annotations

from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from psycopg.types.json import Jsonb
from pydantic import BaseModel, Field

from core import registros_universais as regras
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
from core.registros_universais import ErroRegistro

router = APIRouter(prefix="/registros-universais", tags=["registros-universais"])


class RegistroInput(BaseModel):
    """Cria um registro próprio (sem `origem_id`) ou ajusta um de fábrica (com `origem_id`)."""

    secao: str
    origem_id: str | None = Field(default=None, max_length=120)
    revelacao: str = "aberto"
    dados: dict = Field(default_factory=dict)


def _erro(erro: ErroRegistro) -> HTTPException:
    return HTTPException(status_code=erro.codigo, detail=erro.mensagem)


def _listar(connection, campanha_id: UUID, *, gestor: bool) -> list[dict]:
    ocultas: set[str] = set()
    if not gestor:
        campanha = connection.execute("SELECT configuracoes FROM campanhas WHERE id=%s", (campanha_id,)).fetchone()
        ocultas = regras.secoes_ocultas(campanha["configuracoes"] if campanha else None)
    linhas = connection.execute(
        """
        SELECT id, secao, origem_id, revelacao, dados
        FROM campanha_registros_universais
        WHERE campanha_id=%s
        ORDER BY criado_em, id
        """,
        (campanha_id,),
    ).fetchall()
    return [
        visto for linha in linhas
        if linha["secao"] not in ocultas and (visto := regras.visao(dict(linha), gestor=gestor)) is not None
    ]


@router.get("/{campanha_id}")
def obter(
    campanha_id: UUID,
    user: AuthenticatedUser = Depends(get_current_user),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        acesso = campaign_access(connection, campanha_id, user.id)
        registros = _listar(connection, campanha_id, gestor=acesso.manages_content)
    return {"registros": registros, "gestor": acesso.manages_content}


@router.put("/{campanha_id}")
def salvar(
    campanha_id: UUID,
    payload: RegistroInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    """Upsert: registro de fábrica é identificado por (secao, origem_id); registro próprio nasce novo."""
    try:
        secao = regras.validar_secao(payload.secao)
        revelacao = regras.validar_revelacao(payload.revelacao)
        dados = regras.normalizar_dados(payload.dados)
        if not payload.origem_id and not dados.get("titulo"):
            raise ErroRegistro("registro novo precisa de titulo")
    except ErroRegistro as erro:
        raise _erro(erro) from erro
    with database.connection() as connection:
        require_campaign_manager(connection, campanha_id, user.id)
        total = connection.execute(
            "SELECT COUNT(*) AS total FROM campanha_registros_universais WHERE campanha_id=%s", (campanha_id,)
        ).fetchone()["total"]
        if payload.origem_id:
            linha = connection.execute(
                """
                INSERT INTO campanha_registros_universais (id, campanha_id, secao, origem_id, revelacao, dados)
                VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT (campanha_id, secao, origem_id) WHERE origem_id IS NOT NULL
                DO UPDATE SET revelacao=EXCLUDED.revelacao, dados=EXCLUDED.dados, atualizado_em=CURRENT_TIMESTAMP
                RETURNING id
                """,
                (uuid4(), campanha_id, secao, payload.origem_id, revelacao, Jsonb(dados)),
            ).fetchone()
        else:
            if total >= regras.MAX_REGISTROS_POR_CAMPANHA:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="limite de registros da campanha")
            linha = connection.execute(
                """
                INSERT INTO campanha_registros_universais (id, campanha_id, secao, revelacao, dados)
                VALUES (%s, %s, %s, %s, %s) RETURNING id
                """,
                (uuid4(), campanha_id, secao, revelacao, Jsonb(dados)),
            ).fetchone()
        record_audit(
            connection, action="registro_universal.salvo", actor_user_id=user.id, campaign_id=campanha_id,
            target_type="registro_universal", target_id=str(linha["id"]),
            details={"secao": secao, "origem_id": payload.origem_id, "revelacao": revelacao},
        )
        registros = _listar(connection, campanha_id, gestor=True)
    return {"id": str(linha["id"]), "registros": registros}


@router.put("/{campanha_id}/{registro_id}")
def editar(
    campanha_id: UUID,
    registro_id: UUID,
    payload: RegistroInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    """Edita um registro pelo id (próprio ou ajuste de fábrica já salvo)."""
    try:
        revelacao = regras.validar_revelacao(payload.revelacao)
        dados = regras.normalizar_dados(payload.dados)
    except ErroRegistro as erro:
        raise _erro(erro) from erro
    with database.connection() as connection:
        require_campaign_manager(connection, campanha_id, user.id)
        linha = connection.execute(
            """
            UPDATE campanha_registros_universais
            SET revelacao=%s, dados=%s, atualizado_em=CURRENT_TIMESTAMP
            WHERE id=%s AND campanha_id=%s RETURNING id
            """,
            (revelacao, Jsonb(dados), registro_id, campanha_id),
        ).fetchone()
        if not linha:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="registro nao encontrado")
        record_audit(
            connection, action="registro_universal.editado", actor_user_id=user.id, campaign_id=campanha_id,
            target_type="registro_universal", target_id=str(registro_id), details={"revelacao": revelacao},
        )
        registros = _listar(connection, campanha_id, gestor=True)
    return {"id": str(registro_id), "registros": registros}


@router.delete("/{campanha_id}/{registro_id}")
def apagar(
    campanha_id: UUID,
    registro_id: UUID,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    """Apaga um registro próprio, ou desfaz o ajuste de um de fábrica (volta ao original)."""
    with database.connection() as connection:
        require_campaign_manager(connection, campanha_id, user.id)
        linha = connection.execute(
            "DELETE FROM campanha_registros_universais WHERE id=%s AND campanha_id=%s RETURNING id, secao, origem_id",
            (registro_id, campanha_id),
        ).fetchone()
        if not linha:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="registro nao encontrado")
        record_audit(
            connection, action="registro_universal.apagado", actor_user_id=user.id, campaign_id=campanha_id,
            target_type="registro_universal", target_id=str(registro_id),
            details={"secao": linha["secao"], "origem_id": linha["origem_id"]},
        )
        registros = _listar(connection, campanha_id, gestor=True)
    return {"registros": registros}
