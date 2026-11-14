"""Imagens do Acervo na mesa: mostrar uma imagem a todos (ou a alguns) e a cena narrativa (regras em core/imagens_mostradas.py).

Só o Mestre e os assistentes. A imagem é do Acervo de quem comanda e não está em nenhuma cena: por isso a rota a libera
por algumas horas para a campanha, e o Acervo (`routers/acervo.py`) confere essa lista antes de negar o pedaço.
"""

from __future__ import annotations

import time
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from psycopg.types.json import Jsonb
from pydantic import BaseModel, Field

from core import imagens_mostradas, mesa_extras, tempo_real
from core.database import Database
from core.dependencies import AuthenticatedUser, campaign_access, get_database, require_csrf
from core.mesa_extras import ErroMesa
from routers import mapa as rotas_mapa
from routers.mapa_recursos import CompartilharDocumento, _validar_destino

router = APIRouter(prefix="/mapa", tags=["mapa-imagens"])

LEGENDA_MAXIMA = 200


class MostrarImagemInput(CompartilharDocumento):
    legenda: str | None = Field(default=None, max_length=LEGENDA_MAXIMA)


class NarrativaInput(BaseModel):
    ligada: bool | None = None
    imagem_id: UUID | None = None
    titulo: str | None = Field(default=None, max_length=mesa_extras.TITULO_NARRATIVA_MAX * 2)
    #: Os tokens que aparecem embaixo, como numa história em quadrinhos (só quem enxerga o token vê o retrato).
    falantes: list[UUID] | None = Field(default=None, max_length=mesa_extras.MAX_FALANTES * 4)
    #: Tira a imagem de fundo (a cena narrativa desliga junto).
    sem_imagem: bool = False


def _gestor(connection, campanha_id: UUID, user: AuthenticatedUser):
    acesso = campaign_access(connection, campanha_id, user.id)
    if not acesso.manages_content:
        raise HTTPException(status_code=403, detail="permissao de mestre necessaria")
    return acesso


def _imagem_do_mestre(connection, item_id: UUID, user: AuthenticatedUser) -> dict:
    """A imagem do Acervo de quem comanda, pronta, com o tamanho para o visor montar os pedaços."""
    item = rotas_mapa._item_do_mestre(connection, item_id, user)
    nome = connection.execute("SELECT nome FROM acervo_itens WHERE id=%s", (item_id,)).fetchone()["nome"]
    return {"id": str(item["id"]), "nome": nome, "largura": int(item["largura"]), "altura": int(item["altura"])}


def _alvos(connection, personagens: list[UUID] | None) -> frozenset[str] | None:
    """Os usuários dos personagens escolhidos (quem baixa a imagem); sem escolha, todos os membros."""
    if personagens is None:
        return None
    donos = connection.execute(
        "SELECT dono_usuario_id FROM personagens WHERE id = ANY(%s::uuid[]) AND dono_usuario_id IS NOT NULL", (personagens,),
    ).fetchall()
    return frozenset(str(linha["dono_usuario_id"]) for linha in donos)


@router.post("/{campanha_id}/imagens/{item_id}/mostrar")
def mostrar_imagem(
    campanha_id: UUID,
    item_id: UUID,
    payload: MostrarImagemInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    """Mostra uma imagem do Acervo na tela de todos (ou dos jogadores escolhidos). Nada fica gravado."""
    with database.connection() as connection:
        _gestor(connection, campanha_id, user)
        imagem = _imagem_do_mestre(connection, item_id, user)
        _validar_destino(connection, campanha_id, payload.personagens)
        alvos = _alvos(connection, payload.personagens)
    imagens_mostradas.liberar(item_id, campanha_id, alvos)
    legenda = " ".join((payload.legenda or "").split())[:LEGENDA_MAXIMA]
    tempo_real.anunciar_para(campanha_id, {"t": "imagem", "imagem": imagem, "legenda": legenda}, payload.personagens)
    return {"ok": True}


@router.post("/{campanha_id}/imagens/fechar")
def fechar_imagem(
    campanha_id: UUID,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    """O Mestre guarda a imagem: some da tela de todos. A liberação das imagens avulsas acaba junto."""
    with database.connection() as connection:
        _gestor(connection, campanha_id, user)
        narrativa = connection.execute("SELECT mesa FROM mapa_campanha WHERE campanha_id=%s", (campanha_id,)).fetchone()
        fundo = mesa_extras.ler_mesa(narrativa["mesa"] if narrativa else None)["narrativa"]
    # O fundo da cena narrativa continua liberado enquanto ela estiver ligada.
    manter = {fundo["imagem_id"]} if fundo["ligada"] and fundo["imagem_id"] else set()
    imagens_mostradas.revogar_menos(campanha_id, manter)
    tempo_real.anunciar(campanha_id, {"t": "imagem_fechar"})
    return {"ok": True}


@router.put("/{campanha_id}/narrativa")
def mudar_narrativa(
    campanha_id: UUID,
    payload: NarrativaInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    """Liga, desliga e monta a cena narrativa: o mapa some, a imagem vira o fundo e os falantes aparecem embaixo."""
    with database.connection() as connection:
        _gestor(connection, campanha_id, user)
        linha = connection.execute("SELECT mesa FROM mapa_campanha WHERE campanha_id=%s FOR UPDATE", (campanha_id,)).fetchone()
        mesa = mesa_extras.ler_mesa(linha["mesa"] if linha else None)
        mudanca: dict = {}
        if payload.sem_imagem:
            mudanca.update({"imagem_id": None, "largura": 0, "altura": 0, "ligada": False})
        elif payload.imagem_id is not None:
            imagem = _imagem_do_mestre(connection, payload.imagem_id, user)
            mudanca.update({"imagem_id": imagem["id"], "largura": imagem["largura"], "altura": imagem["altura"]})
            if payload.titulo is None and not mesa["narrativa"]["titulo"]:
                mudanca["titulo"] = imagem["nome"]
        if payload.titulo is not None:
            mudanca["titulo"] = payload.titulo
        if payload.falantes is not None:
            mudanca["falantes"] = [str(token) for token in payload.falantes]
        if payload.ligada is not None and not payload.sem_imagem:
            mudanca["ligada"] = payload.ligada
        try:
            mesa["narrativa"] = mesa_extras.normalizar_narrativa(mudanca, mesa["narrativa"])
        except ErroMesa as erro:
            raise HTTPException(status_code=erro.codigo, detail=erro.mensagem) from None
        connection.execute(
            """
            INSERT INTO mapa_campanha (campanha_id, mesa) VALUES (%s, %s)
            ON CONFLICT (campanha_id) DO UPDATE SET mesa = EXCLUDED.mesa, atualizado_em = CURRENT_TIMESTAMP
            """,
            (campanha_id, Jsonb(mesa)),
        )
        narrativa = mesa["narrativa"]
    if narrativa["imagem_id"] and narrativa["ligada"]:
        imagens_mostradas.liberar(narrativa["imagem_id"], campanha_id, None)
    rotas_mapa._avisar(campanha_id, int(time.time() * 1000))
    return mesa_extras.mesa_de(mesa, gestor=True)
