"""O quadro de investigação da mesa (regras em core/quadro.py): cartas e barbantes que todos montam juntos.

Qualquer membro da campanha usa; o que cada um pode fazer e o que cada um enxerga é decidido em `core/quadro.py`. O quadro
mora em `mapa_campanha.mesa.quadro`, junto da pausa e dos relógios: cada mudança trava a linha, aplica uma ação só e a mesa
inteira recebe o recorte novo pelo mesmo caminho do resto da mesa.
"""

from __future__ import annotations

import time
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from psycopg.types.json import Jsonb
from pydantic import BaseModel, Field

from core import mesa_extras, quadro as regras_quadro
from core.database import Database
from core.dependencies import AuthenticatedUser, campaign_access, get_database, require_csrf
from routers import mapa as rotas_mapa

router = APIRouter(prefix="/mapa", tags=["mapa-quadro"])


class QuadroInput(BaseModel):
    """Uma ação do quadro. Os campos que cada ação usa estão em core/quadro.py (aplicar)."""

    acao: str = Field(max_length=20)
    id: str | None = Field(default=None, max_length=40)
    de: str | None = Field(default=None, max_length=40)
    para: str | None = Field(default=None, max_length=40)
    titulo: str | None = Field(default=None, max_length=regras_quadro.TITULO_MAX * 4)
    texto: str | None = Field(default=None, max_length=regras_quadro.TEXTO_MAX * 4)
    cor: str | None = Field(default=None, max_length=20)
    x: float | None = Field(default=None, ge=-100_000, le=100_000)
    y: float | None = Field(default=None, ge=-100_000, le=100_000)
    visivel: bool | None = None


@router.post("/{campanha_id}/quadro")
def mexer_no_quadro(
    campanha_id: UUID,
    payload: QuadroInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    """Cria, edita, move, apaga, liga, desliga, revela ou limpa. Devolve a mesa já no recorte de quem pediu."""
    with database.connection() as connection:
        acesso = campaign_access(connection, campanha_id, user.id)
        gestor = rotas_mapa._espectador(connection, campanha_id, acesso, user.id).gestor
        linha = connection.execute("SELECT mesa FROM mapa_campanha WHERE campanha_id=%s FOR UPDATE", (campanha_id,)).fetchone()
        mesa = mesa_extras.ler_mesa(linha["mesa"] if linha else None)
        dados = {chave: valor for chave, valor in payload.model_dump(exclude={"acao"}).items() if valor is not None}
        try:
            mesa["quadro"] = regras_quadro.aplicar(
                mesa["quadro"], payload.acao, dados,
                usuario_id=str(user.id), nome=user.nome_exibicao or "Jogador", gestor=gestor,
            )
        except regras_quadro.ErroQuadro as erro:
            raise HTTPException(status_code=erro.codigo, detail=erro.mensagem) from None
        connection.execute(
            """
            INSERT INTO mapa_campanha (campanha_id, mesa) VALUES (%s, %s)
            ON CONFLICT (campanha_id) DO UPDATE SET mesa = EXCLUDED.mesa, atualizado_em = CURRENT_TIMESTAMP
            """,
            (campanha_id, Jsonb(mesa)),
        )
    rotas_mapa._avisar(campanha_id, int(time.time() * 1000))
    return mesa_extras.mesa_de(mesa, gestor=gestor)
