"""Livro da Verdade: a página de cada lenda que a mesa já derrubou (regras em core/lendas.py).

Qualquer membro lê; a mesa só recebe as páginas das lendas que caíram, e no lugar das
outras vai uma página rasurada sem nome. O Mestre vê todas as lendas, pode marcar uma
queda que aconteceu fora da Sessão e pode desfazer uma queda marcada por engano.
"""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from core import lendas
from core.audit import record_audit
from core.database import Database
from core.dependencies import (
    AuthenticatedUser,
    campaign_access,
    get_current_user,
    get_database,
    require_campaign_master,
    require_csrf,
)

router = APIRouter(prefix="/livro-da-verdade", tags=["livro-da-verdade"])


def _lenda_ou_404(monstro_id: str) -> dict:
    lenda = lendas.por_id().get(monstro_id)
    if not lenda:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="lenda nao encontrada")
    return lenda


@router.get("/{campanha_id}")
def obter_livro(
    campanha_id: UUID,
    user: AuthenticatedUser = Depends(get_current_user),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        acesso = campaign_access(connection, campanha_id, user.id)
        return lendas.livro(connection, campanha_id, gestor=acesso.manages_content)


@router.post("/{campanha_id}/{monstro_id}/queda", status_code=status.HTTP_201_CREATED)
def marcar_queda(
    campanha_id: UUID,
    monstro_id: str,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    """Marca à mão a queda de uma lenda que caiu fora da Sessão (ou que o Mestre quer abrir já)."""
    lenda = _lenda_ou_404(monstro_id)
    with database.connection() as connection:
        require_campaign_master(connection, campanha_id, user.id)
        sessao = connection.execute(
            "SELECT id FROM sessoes_mesa WHERE campanha_id=%s AND status IN ('preparacao', 'aberta')",
            (campanha_id,),
        ).fetchone()
        ja_caiu = connection.execute(
            "SELECT 1 FROM campanha_lendas WHERE campanha_id=%s AND monstro_id=%s AND tipo=%s",
            (campanha_id, monstro_id, lendas.TIPO_QUEDA),
        ).fetchone()
        if ja_caiu:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="essa lenda ja caiu nesta campanha")
        # Sem sessão amarrada à queda: o selo vai para o grupo da mesa (personagens ativos dos jogadores).
        lendas.registrar_queda(
            connection,
            campanha_id=campanha_id,
            monstro_id=monstro_id,
            grupo=lendas.grupo_da_sessao(connection, sessao["id"]) if sessao else lendas.grupo_da_campanha(connection, campanha_id),
            ator_id=user.id,
        )
        record_audit(
            connection,
            action="livro_da_verdade.queda_marcada",
            actor_user_id=user.id,
            campaign_id=campanha_id,
            target_type="lenda",
            target_id=monstro_id,
            details={"nome": lenda["nome"]},
        )
        resposta = lendas.livro(connection, campanha_id, gestor=True)
    return resposta


@router.delete("/{campanha_id}/{monstro_id}/queda")
def desfazer_queda(
    campanha_id: UUID,
    monstro_id: str,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    """Tira a página do Livro, o marco do calendário e o selo de quem foi creditado."""
    lenda = _lenda_ou_404(monstro_id)
    with database.connection() as connection:
        require_campaign_master(connection, campanha_id, user.id)
        if not lendas.desfazer_queda(connection, campanha_id, monstro_id):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="essa lenda nao tem queda registrada")
        record_audit(
            connection,
            action="livro_da_verdade.queda_desfeita",
            actor_user_id=user.id,
            campaign_id=campanha_id,
            target_type="lenda",
            target_id=monstro_id,
            details={"nome": lenda["nome"]},
        )
        return lendas.livro(connection, campanha_id, gestor=True)
