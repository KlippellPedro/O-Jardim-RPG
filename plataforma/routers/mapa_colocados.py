"""Rotas dos mapas colocados na cena (core/mapas_colocados.py): pôr um mapa do Acervo, mover,
mudar o tamanho, esconder dos jogadores, trancar, duplicar, reordenar e tirar. Só quem comanda a
campanha mexe; os jogadores recebem os mapas visíveis pelo estado da cena e pelos pedaços do Acervo."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from psycopg.types.json import Jsonb
from pydantic import BaseModel, Field

from core import mapas_colocados
from core.database import Database
from core.dependencies import AuthenticatedUser, get_database, require_campaign_manager, require_csrf
from core.mapa import ErroMapa
from routers import mapa as rotas_mapa

router = APIRouter(prefix="/mapa", tags=["mapa-ao-vivo"])

#: Cópia de um mapa colocado: um pouco abaixo e à direita, para a cópia aparecer ao lado do original.
DESLOCAMENTO_DA_COPIA = 120.0


class MapaColocadoInput(BaseModel):
    imagem_id: UUID
    nome: str | None = Field(default=None, max_length=80)
    x: float | None = None
    y: float | None = None
    escala: float | None = None


class OrdemInput(BaseModel):
    acao: str


def _erro(erro: ErroMapa) -> HTTPException:
    return HTTPException(status_code=erro.codigo, detail=erro.mensagem)


def _gravar(connection, campanha_id: UUID, cena, mapas: list[dict]) -> int:
    """Grava a lista na cena: a cena cresce até caber todos (nunca encolhe), a névoa é refeita e a versão sobe."""
    itens = rotas_mapa._itens_dos_mapas(connection, mapas)
    try:
        largura, altura = mapas_colocados.caber_na_cena(mapas, itens, com_base=bool(cena["mapa_id"]))
    except ErroMapa as erro:
        raise _erro(erro) from None
    estrutura = dict(cena["estrutura"]) if isinstance(cena["estrutura"], dict) else {}
    if mapas:
        estrutura["mapas"] = mapas
    else:
        estrutura.pop("mapas", None)
    connection.execute(
        "UPDATE mapa_cenas SET estrutura=%s, largura=%s, altura=%s WHERE id=%s",
        (
            Jsonb(estrutura), max(int(cena["largura"]), largura, mapas_colocados.LADO_MINIMO_CENA),
            max(int(cena["altura"]), altura, mapas_colocados.LADO_MINIMO_CENA), cena["id"],
        ),
    )
    rotas_mapa._recalcular_nevoa(connection, rotas_mapa._cena(connection, campanha_id, cena["id"]))
    return rotas_mapa._tocar(connection, cena["id"])


def _escolher(mapas: list[dict], mapa_id: str) -> tuple[int, dict]:
    id_mapa = mapas_colocados.id_valido(mapa_id)
    for posicao, mapa in enumerate(mapas):
        if mapa["id"] == id_mapa:
            return posicao, mapa
    raise HTTPException(status_code=404, detail="mapa nao encontrado na cena")


@router.post("/{campanha_id}/cenas/{cena_id}/mapas", status_code=201)
def colocar_mapa(
    campanha_id: UUID,
    cena_id: UUID,
    payload: MapaColocadoInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    """Põe um mapa do Acervo na cena. Sem lugar, ele entra à direita do que já está lá."""
    with database.connection() as connection:
        acesso = require_campaign_manager(connection, campanha_id, user.id)
        cena = rotas_mapa._cena(connection, campanha_id, cena_id, travar=True)
        rotas_mapa._item_do_mestre(connection, payload.imagem_id, user)
        tipo = connection.execute("SELECT tipo, nome FROM acervo_itens WHERE id=%s", (payload.imagem_id,)).fetchone()
        if tipo["tipo"] != "mapa":
            raise HTTPException(status_code=422, detail="so imagens do tipo mapa entram na cena como mapa")
        atuais = mapas_colocados.ler(cena["estrutura"])
        if len(atuais) >= mapas_colocados.MAX_MAPAS:
            raise HTTPException(status_code=409, detail=f"a cena aceita ate {mapas_colocados.MAX_MAPAS} mapas")
        x, y = payload.x, payload.y
        if x is None or y is None:
            if not atuais and not cena["mapa_id"]:
                # O primeiro mapa de uma cena vazia entra no meio da arena, para dar para arrastar para qualquer lado.
                itens = rotas_mapa._itens_dos_mapas(connection, [{"imagem_id": str(payload.imagem_id)}])
                item = itens.get(str(payload.imagem_id))
                escala = payload.escala or 1.0
                x, y = mapas_colocados.centro_da_arena(
                    item["largura"] * escala if item else 0.0, item["altura"] * escala if item else 0.0,
                )
            else:
                # À direita de tudo o que já está na cena, alinhado com o de cima (o mapa base ocupa a cena desde a origem).
                itens = rotas_mapa._itens_dos_mapas(connection, atuais)
                direita, _ = mapas_colocados.extensao(atuais, itens)
                mapa_base = rotas_mapa._mapa_da_cena(connection, cena)
                base = int(mapa_base["largura"]) if mapa_base else 0
                x = float(max(direita, base))
                y = float(min((m["y"] for m in atuais), default=0.0))
        try:
            novo = mapas_colocados.novo(payload.imagem_id, payload.nome or tipo["nome"], x, y, payload.escala or 1.0)
        except ErroMapa as erro:
            raise _erro(erro) from None
        versao = _gravar(connection, campanha_id, cena, [*atuais, novo])
        resposta = rotas_mapa._montar(connection, campanha_id, acesso, user, cena_id)
    rotas_mapa._avisar(campanha_id, versao)
    return {**resposta, "mapa_colocado_id": novo["id"]}


@router.put("/{campanha_id}/cenas/{cena_id}/mapas/{mapa_id}")
def mudar_mapa(
    campanha_id: UUID,
    cena_id: UUID,
    mapa_id: str,
    payload: dict,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    """Muda lugar, tamanho (escala), nome, visibilidade ou trava. Mapa trancado só aceita trava, nome e visibilidade."""
    with database.connection() as connection:
        acesso = require_campaign_manager(connection, campanha_id, user.id)
        cena = rotas_mapa._cena(connection, campanha_id, cena_id, travar=True)
        mapas = mapas_colocados.ler(cena["estrutura"])
        posicao, mapa = _escolher(mapas, mapa_id)
        try:
            mapas[posicao] = mapas_colocados.atualizar(mapa, payload)
        except ErroMapa as erro:
            raise _erro(erro) from None
        versao = _gravar(connection, campanha_id, cena, mapas)
        resposta = rotas_mapa._montar(connection, campanha_id, acesso, user, cena_id)
    rotas_mapa._avisar(campanha_id, versao)
    return resposta


@router.post("/{campanha_id}/cenas/{cena_id}/mapas/{mapa_id}/duplicar", status_code=201)
def duplicar_mapa(
    campanha_id: UUID,
    cena_id: UUID,
    mapa_id: str,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        acesso = require_campaign_manager(connection, campanha_id, user.id)
        cena = rotas_mapa._cena(connection, campanha_id, cena_id, travar=True)
        mapas = mapas_colocados.ler(cena["estrutura"])
        posicao, mapa = _escolher(mapas, mapa_id)
        if len(mapas) >= mapas_colocados.MAX_MAPAS:
            raise HTTPException(status_code=409, detail=f"a cena aceita ate {mapas_colocados.MAX_MAPAS} mapas")
        copia = mapas_colocados.duplicar(mapa, DESLOCAMENTO_DA_COPIA)
        # A cópia fica logo acima do original na pilha.
        mapas.insert(posicao + 1, copia)
        versao = _gravar(connection, campanha_id, cena, mapas)
        resposta = rotas_mapa._montar(connection, campanha_id, acesso, user, cena_id)
    rotas_mapa._avisar(campanha_id, versao)
    return {**resposta, "mapa_colocado_id": copia["id"]}


@router.put("/{campanha_id}/cenas/{cena_id}/mapas/{mapa_id}/ordem")
def ordenar_mapa(
    campanha_id: UUID,
    cena_id: UUID,
    mapa_id: str,
    payload: OrdemInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    """Sobe ou desce o mapa na pilha (o de cima tapa o de baixo): frente, tras, acima, abaixo."""
    with database.connection() as connection:
        acesso = require_campaign_manager(connection, campanha_id, user.id)
        cena = rotas_mapa._cena(connection, campanha_id, cena_id, travar=True)
        mapas = mapas_colocados.ler(cena["estrutura"])
        _escolher(mapas, mapa_id)
        try:
            mapas = mapas_colocados.reordenar(mapas, mapas_colocados.id_valido(mapa_id), payload.acao)
        except ErroMapa as erro:
            raise _erro(erro) from None
        versao = _gravar(connection, campanha_id, cena, mapas)
        resposta = rotas_mapa._montar(connection, campanha_id, acesso, user, cena_id)
    rotas_mapa._avisar(campanha_id, versao)
    return resposta


@router.delete("/{campanha_id}/cenas/{cena_id}/mapas/{mapa_id}")
def tirar_mapa(
    campanha_id: UUID,
    cena_id: UUID,
    mapa_id: str,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        acesso = require_campaign_manager(connection, campanha_id, user.id)
        cena = rotas_mapa._cena(connection, campanha_id, cena_id, travar=True)
        mapas = mapas_colocados.ler(cena["estrutura"])
        posicao, mapa = _escolher(mapas, mapa_id)
        if mapa["trancado"]:
            raise HTTPException(status_code=409, detail="o mapa esta trancado: destranque para tirar")
        del mapas[posicao]
        versao = _gravar(connection, campanha_id, cena, mapas)
        resposta = rotas_mapa._montar(connection, campanha_id, acesso, user, cena_id)
    rotas_mapa._avisar(campanha_id, versao)
    return resposta
