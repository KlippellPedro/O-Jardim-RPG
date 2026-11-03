"""Mapa ao vivo: cenas, tokens e a conexão em tempo real.

O que muda a estrutura (cena nova, token criado, escondido, removido, grade)
passa pelas rotas REST, sobe a versão da cena e avisa quem está no mapa
(`tempo_real.mudou`); cada um refaz o GET e recebe o recorte do próprio papel.
O arrasto passa pelo WebSocket (`/ws`) e só a posição final vai para o banco.
Se o WebSocket não abrir, o navegador cai no plano B: SSE para descer e POST
para subir (`/ao-vivo`), com o mesmo formato de mensagem.

Jogador vê a cena ativa só com a sessão ao vivo, como a mesa ao vivo.
"""

from __future__ import annotations

import asyncio
import base64
import binascii
import json
import time
from types import SimpleNamespace
from urllib.parse import urlparse
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Request, Response, WebSocket, WebSocketDisconnect, status
from fastapi.responses import StreamingResponse
from psycopg.types.json import Jsonb
from pydantic import BaseModel, Field
from starlette.concurrency import run_in_threadpool

from core import calendario, construtor, mapa, nevoa, tempo_real
from core.acervo import ler as ler_pedaco
from core.condicoes import normalizar_condicoes
from core.database import Database
from core.dependencies import (
    AuthenticatedUser,
    campaign_access,
    get_current_user,
    get_database,
    require_campaign_manager,
    require_csrf,
)
from core.mapa import Espectador, ErroMapa

router = APIRouter(prefix="/mapa", tags=["mapa-ao-vivo"])

MAX_CENAS = 200
MAX_TOKENS_POR_CENA = 400
COLUNAS_CENA = (
    "id, campanha_id, nome, mapa_id, largura, altura, grade, ativa, livre, ordem, versao, "
    "nevoa, nevoa_ladrilhos, clima, estrutura"
)


class CenaInput(BaseModel):
    nome: str = Field(min_length=1, max_length=80)
    mapa_id: UUID | None = None
    largura: int | None = Field(default=None, ge=100, le=32768)
    altura: int | None = Field(default=None, ge=100, le=32768)
    grade: dict = Field(default_factory=dict)
    livre: bool = False


class CenaEdicao(BaseModel):
    nome: str | None = Field(default=None, min_length=1, max_length=80)
    mapa_id: UUID | None = None
    sem_mapa: bool = False
    largura: int | None = Field(default=None, ge=100, le=32768)
    altura: int | None = Field(default=None, ge=100, le=32768)
    grade: dict | None = None
    livre: bool | None = None
    ordem: int | None = Field(default=None, ge=0, le=10000)


class TokenInput(BaseModel):
    personagem_id: UUID | None = None
    participante_id: UUID | None = None
    imagem_id: UUID | None = None
    nome: str | None = Field(default=None, max_length=60)
    x: float
    y: float
    porte: int = 1
    lado: str | None = None
    oculto: bool = False
    moldura: str | None = Field(default=None, max_length=40)


class TokenEdicao(BaseModel):
    nome: str | None = Field(default=None, max_length=60)
    porte: int | None = None
    lado: str | None = None
    oculto: bool | None = None
    imagem_id: UUID | None = None
    sem_imagem: bool = False
    barras: dict | None = None
    moldura: str | None = Field(default=None, max_length=40)
    sem_moldura: bool = False
    #: Tocha, lanterna, luz mágica: o Mestre e o dono do token mudam.
    luz: dict | None = None
    sem_luz: bool = False


class TokenDoPersonagemInput(BaseModel):
    moldura: str | None = Field(default=None, max_length=40)
    sem_moldura: bool = False
    enquadramento: dict | None = None


class ConfigMapaInput(BaseModel):
    moldura_mesa: str | None = Field(default=None, max_length=40)


class NevoaInput(BaseModel):
    """Uma mudança por vez na névoa da cena; o Mestre desenha e cada forma solta vira um pedido."""

    ligada: bool | None = None
    forma: dict | None = None
    desfazer: bool = False
    #: Cobre o mapa inteiro de novo (apaga as formas).
    cobrir_tudo: bool = False
    revelar_tudo: bool = False


class PontoInput(BaseModel):
    x: float
    y: float
    #: Id do portal que pede confirmação e a pessoa aceitou atravessar.
    atravessar: str | None = Field(default=None, max_length=40)


class PortaisInput(BaseModel):
    portais: list[dict] = Field(default_factory=list, max_length=mapa.MAX_PORTAIS)


class MensagensInput(BaseModel):
    mensagens: list[dict] = Field(default_factory=list, max_length=60)


# ----------------------------------------------------------------- leitura

def _sessao_do_momento(connection, campanha_id: UUID):
    return connection.execute(
        "SELECT id, status FROM sessoes_mesa WHERE campanha_id=%s AND status IN ('preparacao', 'aberta')",
        (campanha_id,),
    ).fetchone()


def _espectador(connection, campanha_id: UUID, acesso, user_id) -> Espectador:
    personagens = frozenset(
        str(linha["id"])
        for linha in connection.execute(
            "SELECT id FROM personagens WHERE campanha_id=%s AND dono_usuario_id=%s AND status='ativo'",
            (campanha_id, user_id),
        ).fetchall()
    )
    return Espectador(usuario_id=str(user_id), gestor=acesso.manages_content, personagens=personagens)


def _cena(connection, campanha_id: UUID, cena_id: UUID, *, travar: bool = False):
    cena = connection.execute(
        f"""
        SELECT {COLUNAS_CENA}
        FROM mapa_cenas WHERE id=%s AND campanha_id=%s{' FOR UPDATE' if travar else ''}
        """,
        (cena_id, campanha_id),
    ).fetchone()
    if not cena:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="cena nao encontrada")
    return cena


def _cena_ativa(connection, campanha_id: UUID):
    return connection.execute(
        f"SELECT {COLUNAS_CENA} FROM mapa_cenas WHERE campanha_id=%s AND ativa",
        (campanha_id,),
    ).fetchone()


def _tocar(connection, cena_id: UUID) -> int:
    linha = connection.execute(
        "UPDATE mapa_cenas SET versao=versao+1, atualizado_em=CURRENT_TIMESTAMP WHERE id=%s RETURNING versao",
        (cena_id,),
    ).fetchone()
    return int(linha["versao"])


def _participantes(connection, campanha_id: UUID) -> list[dict]:
    """Participantes da sessão em andamento (preparação ou ao vivo)."""
    return [
        dict(linha)
        for linha in connection.execute(
            """
            SELECT p.id, p.personagem_id, p.nome, p.tipo, p.visibilidade, p.condicoes,
                   p.vida_atual, p.vida_maxima, p.mana_atual, p.mana_maxima,
                   p.estamina_atual, p.estamina_maxima
            FROM sessao_participantes p
            JOIN sessoes_mesa s ON s.id = p.sessao_id
            WHERE s.campanha_id=%s AND s.status IN ('preparacao', 'aberta')
            """,
            (campanha_id,),
        ).fetchall()
    ]


def _tokens(connection, cena_id: UUID) -> list[dict]:
    return [
        dict(linha)
        for linha in connection.execute(
            """
            SELECT t.id, t.cena_id, t.personagem_id, t.participante_id, t.imagem_id, t.nome,
                   t.x, t.y, t.porte, t.lado, t.oculto, t.barras, t.moldura, t.luz,
                   COALESCE(t.personagem_id, sp.personagem_id) AS personagem_efetivo
            FROM mapa_tokens t
            LEFT JOIN sessao_participantes sp ON sp.id = t.participante_id
            WHERE t.cena_id=%s
            ORDER BY t.criado_em
            """,
            (cena_id,),
        ).fetchall()
    ]


def _fichas(connection, campanha_id: UUID, ids: set[str]) -> dict[str, dict]:
    """Ficha sem a foto (só o resumo dela), mais o dono, de cada personagem com token."""
    if not ids:
        return {}
    return {
        str(linha["id"]): dict(linha)
        for linha in connection.execute(
            """
            SELECT id, nome, dono_usuario_id, ficha - 'foto' AS ficha,
                   md5(ficha->>'foto') AS foto_hash
            FROM personagens
            WHERE campanha_id=%s AND id = ANY(%s::uuid[])
            """,
            (campanha_id, list(ids)),
        ).fetchall()
    }


def _nivel(ficha) -> int | None:
    valor = ficha.get("nivel") if isinstance(ficha, dict) else None
    if isinstance(valor, bool) or not isinstance(valor, (int, float)):
        return None
    return max(1, int(valor))


def _ligacoes(tokens: list[dict], participantes: list[dict]) -> dict[str, dict | None]:
    """Participante de cada token: o ligado direto ou, para token de personagem, o dele na sessão."""
    por_id = {str(p["id"]): p for p in participantes}
    por_personagem = {str(p["personagem_id"]): p for p in participantes if p["personagem_id"]}
    saida: dict[str, dict | None] = {}
    for token in tokens:
        if token["participante_id"]:
            saida[str(token["id"])] = por_id.get(str(token["participante_id"]))
        elif token["personagem_id"]:
            saida[str(token["id"])] = por_personagem.get(str(token["personagem_id"]))
        else:
            saida[str(token["id"])] = None
    return saida


def _tokens_de_personagem(connection, personagens: set[str]) -> dict[str, dict]:
    if not personagens:
        return {}
    return {
        str(linha["personagem_id"]): {
            "moldura": linha["moldura"],
            "enquadramento": linha["enquadramento"] if isinstance(linha["enquadramento"], dict) else {},
        }
        for linha in connection.execute(
            "SELECT personagem_id, moldura, enquadramento FROM personagem_token WHERE personagem_id = ANY(%s::uuid[])",
            (list(personagens),),
        ).fetchall()
    }


def _moldura_mesa(connection, campanha_id: UUID) -> str | None:
    linha = connection.execute("SELECT moldura_mesa FROM mapa_campanha WHERE campanha_id=%s", (campanha_id,)).fetchone()
    return linha["moldura_mesa"] if linha else None


def _visao_tokens(connection, campanha_id: UUID, cena, quem: Espectador) -> list[dict]:
    from routers.characters import _session_resources  # import tardio: o router de fichas é pesado

    tokens = _tokens(connection, cena["id"])
    participantes = _participantes(connection, campanha_id)
    ligacoes = _ligacoes(tokens, participantes)
    personagens = {str(t["personagem_efetivo"]) for t in tokens if t["personagem_efetivo"]}
    fichas = _fichas(connection, campanha_id, personagens)
    tokens_de_personagem = _tokens_de_personagem(connection, personagens)
    moldura_mesa = _moldura_mesa(connection, campanha_id)
    estado_nevoa = nevoa.ler(cena["nevoa"])
    cobertura = nevoa.Nevoa(estado_nevoa["formas"]) if estado_nevoa["ligada"] and not quem.gestor else None
    saida = []
    for token in tokens:
        participante = ligacoes[str(token["id"])]
        personagem = str(token["personagem_efetivo"]) if token["personagem_efetivo"] else None
        do_personagem = tokens_de_personagem.get(personagem) or {}
        ficha_linha = fichas.get(personagem) if personagem else None
        ficha = ficha_linha["ficha"] if ficha_linha and isinstance(ficha_linha["ficha"], dict) else {}
        if token["imagem_id"]:
            versao_imagem = f"a{str(token['imagem_id'])[:8]}"
        elif ficha_linha and ficha_linha["foto_hash"]:
            versao_imagem = f"f{ficha_linha['foto_hash'][:10]}"
        else:
            versao_imagem = None
        condicoes = [c["nome"] for c in normalizar_condicoes(participante["condicoes"])] if participante else []
        item = mapa.visao_token(
            token,
            participante,
            quem,
            livre=bool(cena["livre"]),
            recursos_ficha=_session_resources(ficha) if ficha_linha else None,
            sanidade=mapa.sanidade_da_ficha(ficha) if ficha_linha else None,
            nivel=_nivel(ficha) if ficha_linha else None,
            tem_retrato=versao_imagem is not None,
            condicoes=condicoes,
            moldura=mapa.moldura_efetiva(token, personagem, do_personagem.get("moldura"), moldura_mesa),
            # O enquadramento é da foto da ficha; imagem do acervo já vem recortada.
            enquadramento=do_personagem.get("enquadramento") if not token["imagem_id"] else None,
            na_nevoa=cobertura is not None and not cobertura.revelado(float(token["x"]), float(token["y"])),
        )
        if item is None:
            continue
        item["imagem"] = versao_imagem if item["imagem"] else None
        if not item["nome"] or item["nome"] == "Token":
            item["nome"] = (ficha_linha or {}).get("nome") or item["nome"]
        saida.append(item)
    return saida


def _mapa_da_cena(connection, cena) -> dict | None:
    if not cena["mapa_id"]:
        return None
    item = connection.execute(
        "SELECT id, nome, largura, altura, ladrilho, chaves, estado FROM acervo_itens WHERE id=%s",
        (cena["mapa_id"],),
    ).fetchone()
    if not item or item["estado"] != "pronto":
        return None
    return {
        "id": str(item["id"]),
        "nome": item["nome"],
        "largura": item["largura"],
        "altura": item["altura"],
        "ladrilho": item["ladrilho"],
        "chaves": list(item["chaves"]),
    }


def _portais(cena) -> list[dict]:
    return mapa.ler_estrutura(cena["estrutura"], int(cena["largura"]), int(cena["altura"]))["portais"]


def _tempo_da_campanha(connection, campanha_id: UUID, gestor: bool) -> dict:
    """Hora, estação e lua para a luz do dia; a data só para quem pode ver o calendário."""
    linha = connection.execute("SELECT estado FROM campanha_calendario WHERE campanha_id=%s", (campanha_id,)).fetchone()
    tempo = calendario.resumo_do_tempo(linha["estado"] if linha else None)
    tempo["em_uso"] = linha is not None
    if not gestor:
        campanha = connection.execute("SELECT configuracoes FROM campanhas WHERE id=%s", (campanha_id,)).fetchone()
        configuracoes = campanha["configuracoes"] if campanha and isinstance(campanha["configuracoes"], dict) else {}
        if configuracoes.get("calendario_oculto") is True:
            tempo["data"] = None
    return tempo


def _resumo_cena(connection, cena, *, completa: bool, gestor: bool = False) -> dict:
    resumo = {
        "id": str(cena["id"]),
        "nome": cena["nome"],
        "ativa": bool(cena["ativa"]),
        "versao": int(cena["versao"]),
    }
    if completa:
        estado_nevoa = nevoa.ler(cena["nevoa"])
        cobertura = nevoa.Nevoa(estado_nevoa["formas"]) if estado_nevoa["ligada"] else None
        resumo.update({
            "largura": cena["largura"],
            "altura": cena["altura"],
            "grade": mapa.normalizar_grade({}, cena["grade"] if isinstance(cena["grade"], dict) else {}),
            "livre": bool(cena["livre"]),
            "mapa": _mapa_da_cena(connection, cena),
            "nevoa": {
                **estado_nevoa,
                # Só o jogador precisa da lista: o Mestre baixa o mapa inteiro.
                "ladrilhos": list(cena["nevoa_ladrilhos"] or []) if estado_nevoa["ligada"] and not gestor else None,
            },
            "clima": mapa.ler_clima(cena["clima"], int(cena["largura"]), int(cena["altura"])),
            # Portal escondido, desligado ou com as duas bocas na névoa não chega ao jogador.
            "portais": mapa.portais_de(
                _portais(cena), gestor=gestor,
                revelado=cobertura.revelado if cobertura is not None else (lambda _x, _y: True),
            ),
            # Portas e janelas do mapa montado no construtor; a porta secreta é só do Mestre.
            "aberturas": construtor.aberturas_de(
                construtor.ler_aberturas(cena["estrutura"]), gestor=gestor,
                revelado=cobertura.revelado if cobertura is not None else (lambda _x, _y: True),
            ),
        })
    return resumo


def _montar(connection, campanha_id: UUID, acesso, user: AuthenticatedUser, cena_id: UUID | None = None) -> dict:
    sessao = _sessao_do_momento(connection, campanha_id)
    ao_vivo = bool(sessao and sessao["status"] == "aberta")
    gestor = acesso.manages_content
    quem = _espectador(connection, campanha_id, acesso, user.id)
    resposta = {
        "gestor": gestor,
        "usuario_id": str(user.id),
        "ao_vivo": ao_vivo,
        "bloqueado": not gestor and not ao_vivo,
        "cenas": [],
        "cena": None,
        "tokens": [],
        "moldura_mesa": None,
        "tempo": None,
    }
    if resposta["bloqueado"]:
        return resposta
    resposta["moldura_mesa"] = _moldura_mesa(connection, campanha_id)
    resposta["tempo"] = _tempo_da_campanha(connection, campanha_id, gestor)
    if gestor:
        # A lista leva só o resumo; a névoa e o clima vêm apenas da cena aberta.
        cenas = connection.execute(
            "SELECT id, nome, ativa, versao FROM mapa_cenas WHERE campanha_id=%s ORDER BY ordem, criado_em",
            (campanha_id,),
        ).fetchall()
        resposta["cenas"] = [_resumo_cena(connection, c, completa=False) for c in cenas]
        escolhida = None
        if cena_id:
            escolhida = next((c for c in cenas if c["id"] == cena_id), None)
            if escolhida is None:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="cena nao encontrada")
        escolhida = escolhida or next((c for c in cenas if c["ativa"]), None) or (cenas[0] if cenas else None)
        if escolhida is not None:
            escolhida = _cena(connection, campanha_id, escolhida["id"])
    else:
        escolhida = _cena_ativa(connection, campanha_id)
    if escolhida is None:
        return resposta
    resposta["cena"] = _resumo_cena(connection, escolhida, completa=True, gestor=gestor)
    resposta["tokens"] = _visao_tokens(connection, campanha_id, escolhida, quem)
    return resposta


@router.get("/{campanha_id}")
def obter_mapa(
    campanha_id: UUID,
    cena_id: UUID | None = None,
    user: AuthenticatedUser = Depends(get_current_user),
    database: Database = Depends(get_database),
):
    """A cena (a ativa, ou a pedida pelo Mestre) no recorte de quem pergunta."""
    with database.connection() as connection:
        acesso = campaign_access(connection, campanha_id, user.id)
        return _montar(connection, campanha_id, acesso, user, cena_id)


# ------------------------------------------------------------------ cenas

def _item_do_mestre(connection, item_id: UUID, user: AuthenticatedUser):
    item = connection.execute(
        "SELECT id, largura, altura, estado, dono_id FROM acervo_itens WHERE id=%s",
        (item_id,),
    ).fetchone()
    if not item or (item["dono_id"] != user.id and not user.is_creator):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="imagem do acervo nao encontrada")
    if item["estado"] != "pronto":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="a imagem ainda esta subindo")
    return item


def _avisar(campanha_id: UUID, versao: int) -> None:
    tempo_real.mudou(campanha_id, versao)


@router.post("/{campanha_id}/cenas", status_code=status.HTTP_201_CREATED)
def criar_cena(
    campanha_id: UUID,
    payload: CenaInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        acesso = require_campaign_manager(connection, campanha_id, user.id)
        total = connection.execute("SELECT COUNT(*) AS n FROM mapa_cenas WHERE campanha_id=%s", (campanha_id,)).fetchone()
        if int(total["n"]) >= MAX_CENAS:
            raise HTTPException(status_code=409, detail=f"limite de {MAX_CENAS} cenas por campanha")
        try:
            grade = mapa.normalizar_grade(payload.grade)
        except ErroMapa as erro:
            raise HTTPException(status_code=erro.codigo, detail=erro.mensagem) from None
        largura, altura = payload.largura or 3000, payload.altura or 2000
        if payload.mapa_id:
            item = _item_do_mestre(connection, payload.mapa_id, user)
            largura, altura = max(100, item["largura"]), max(100, item["altura"])
        cena_id = uuid4()
        tem_ativa = _cena_ativa(connection, campanha_id) is not None
        connection.execute(
            """
            INSERT INTO mapa_cenas (id, campanha_id, nome, mapa_id, largura, altura, grade, livre, ativa, ordem)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s,
                    (SELECT COALESCE(MAX(ordem), 0) + 1 FROM mapa_cenas WHERE campanha_id=%s))
            """,
            (cena_id, campanha_id, payload.nome.strip(), payload.mapa_id, largura, altura, Jsonb(grade),
             payload.livre, not tem_ativa, campanha_id),
        )
        resposta = _montar(connection, campanha_id, acesso, user, cena_id)
    _avisar(campanha_id, 1)
    return resposta


@router.put("/{campanha_id}/cenas/{cena_id}")
def editar_cena(
    campanha_id: UUID,
    cena_id: UUID,
    payload: CenaEdicao,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        acesso = require_campaign_manager(connection, campanha_id, user.id)
        cena = _cena(connection, campanha_id, cena_id, travar=True)
        mudancas: dict = {}
        if payload.nome is not None:
            mudancas["nome"] = payload.nome.strip() or cena["nome"]
        if payload.sem_mapa:
            mudancas["mapa_id"] = None
        elif payload.mapa_id is not None:
            item = _item_do_mestre(connection, payload.mapa_id, user)
            mudancas.update(mapa_id=payload.mapa_id, largura=max(100, item["largura"]), altura=max(100, item["altura"]))
        if payload.largura is not None and "largura" not in mudancas:
            mudancas["largura"] = payload.largura
        if payload.altura is not None and "altura" not in mudancas:
            mudancas["altura"] = payload.altura
        if payload.grade is not None:
            try:
                mudancas["grade"] = Jsonb(mapa.normalizar_grade(payload.grade, cena["grade"] if isinstance(cena["grade"], dict) else {}))
            except ErroMapa as erro:
                raise HTTPException(status_code=erro.codigo, detail=erro.mensagem) from None
        if payload.livre is not None:
            mudancas["livre"] = payload.livre
        if payload.ordem is not None:
            mudancas["ordem"] = payload.ordem
        for coluna, valor in mudancas.items():
            connection.execute(f"UPDATE mapa_cenas SET {coluna}=%s WHERE id=%s", (valor, cena_id))
        if {"mapa_id", "largura", "altura"} & mudancas.keys():
            # Outro mapa tem outros ladrilhos: a lista do que o jogador baixa é refeita.
            _recalcular_nevoa(connection, _cena(connection, campanha_id, cena_id))
        versao = _tocar(connection, cena_id)
        resposta = _montar(connection, campanha_id, acesso, user, cena_id)
    _avisar(campanha_id, versao)
    return resposta


def _recalcular_nevoa(connection, cena, estado: dict | None = None) -> None:
    estado = estado or nevoa.ler(cena["nevoa"])
    mapa_da_cena = _mapa_da_cena(connection, cena)
    ladrilhos = (
        nevoa.ladrilhos_liberados(estado["formas"], int(cena["largura"]), int(cena["altura"]), mapa_da_cena["chaves"])
        if mapa_da_cena else []
    )
    connection.execute(
        "UPDATE mapa_cenas SET nevoa=%s, nevoa_ladrilhos=%s WHERE id=%s",
        (Jsonb(estado), ladrilhos, cena["id"]),
    )


@router.post("/{campanha_id}/cenas/{cena_id}/nevoa")
def mudar_nevoa(
    campanha_id: UUID,
    cena_id: UUID,
    payload: NevoaInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    """Liga ou desliga a névoa, acrescenta uma forma, desfaz a última, cobre ou revela tudo."""
    with database.connection() as connection:
        acesso = require_campaign_manager(connection, campanha_id, user.id)
        cena = _cena(connection, campanha_id, cena_id, travar=True)
        estado = nevoa.ler(cena["nevoa"])
        largura, altura = int(cena["largura"]), int(cena["altura"])
        try:
            if payload.ligada is not None:
                estado["ligada"] = payload.ligada
            if payload.cobrir_tudo:
                estado["formas"] = []
            if payload.revelar_tudo:
                estado["formas"] = [nevoa.normalizar_forma(
                    {"op": "revelar", "tipo": "retangulo", "x": 0, "y": 0, "w": largura, "h": altura}, largura, altura,
                )]
            if payload.desfazer and estado["formas"]:
                estado["formas"].pop()
            if payload.forma is not None:
                estado["formas"].append(nevoa.normalizar_forma(payload.forma, largura, altura))
                nevoa.caber(estado["formas"])
        except ErroMapa as erro:
            raise _erro_mapa(erro) from None
        _recalcular_nevoa(connection, cena, estado)
        versao = _tocar(connection, cena_id)
        resposta = _montar(connection, campanha_id, acesso, user, cena_id)
    _avisar(campanha_id, versao)
    return resposta


@router.put("/{campanha_id}/cenas/{cena_id}/clima")
def mudar_clima(
    campanha_id: UUID,
    cena_id: UUID,
    payload: dict,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    """O clima inteiro da cena de uma vez: efeitos e vento. Todos na mesa veem o mesmo."""
    with database.connection() as connection:
        acesso = require_campaign_manager(connection, campanha_id, user.id)
        cena = _cena(connection, campanha_id, cena_id, travar=True)
        try:
            clima = mapa.normalizar_clima(payload, int(cena["largura"]), int(cena["altura"]))
        except ErroMapa as erro:
            raise _erro_mapa(erro) from None
        connection.execute("UPDATE mapa_cenas SET clima=%s WHERE id=%s", (Jsonb(clima), cena_id))
        versao = _tocar(connection, cena_id)
        resposta = _montar(connection, campanha_id, acesso, user, cena_id)
    _avisar(campanha_id, versao)
    return resposta


@router.put("/{campanha_id}/cenas/{cena_id}/portais")
def mudar_portais(
    campanha_id: UUID,
    cena_id: UUID,
    payload: PortaisInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    """A lista inteira de portais da cena (o Mestre cria, move, liga, esconde e apaga)."""
    with database.connection() as connection:
        acesso = require_campaign_manager(connection, campanha_id, user.id)
        cena = _cena(connection, campanha_id, cena_id, travar=True)
        try:
            portais = mapa.normalizar_portais(payload.portais, int(cena["largura"]), int(cena["altura"]))
        except ErroMapa as erro:
            raise _erro_mapa(erro) from None
        estrutura = dict(cena["estrutura"]) if isinstance(cena["estrutura"], dict) else {}
        estrutura["portais"] = portais
        connection.execute("UPDATE mapa_cenas SET estrutura=%s WHERE id=%s", (Jsonb(estrutura), cena_id))
        versao = _tocar(connection, cena_id)
        resposta = _montar(connection, campanha_id, acesso, user, cena_id)
    _avisar(campanha_id, versao)
    return resposta


@router.post("/{campanha_id}/cenas/{cena_id}/ativar")
def ativar_cena(
    campanha_id: UUID,
    cena_id: UUID,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    """Troca a cena que os jogadores veem."""
    with database.connection() as connection:
        acesso = require_campaign_manager(connection, campanha_id, user.id)
        _cena(connection, campanha_id, cena_id, travar=True)
        connection.execute("UPDATE mapa_cenas SET ativa=FALSE WHERE campanha_id=%s AND ativa AND id<>%s", (campanha_id, cena_id))
        connection.execute("UPDATE mapa_cenas SET ativa=TRUE WHERE id=%s", (cena_id,))
        versao = _tocar(connection, cena_id)
        resposta = _montar(connection, campanha_id, acesso, user, cena_id)
    _avisar(campanha_id, versao)
    return resposta


@router.delete("/{campanha_id}/cenas/{cena_id}", status_code=status.HTTP_204_NO_CONTENT)
def apagar_cena(
    campanha_id: UUID,
    cena_id: UUID,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        require_campaign_manager(connection, campanha_id, user.id)
        _cena(connection, campanha_id, cena_id, travar=True)
        connection.execute("DELETE FROM mapa_cenas WHERE id=%s", (cena_id,))
    _avisar(campanha_id, int(time.time()))
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ----------------------------------------------------------------- tokens

def _token(connection, campanha_id: UUID, token_id: UUID, *, travar: bool = False):
    token = connection.execute(
        f"""
        SELECT t.id, t.cena_id, t.personagem_id, t.participante_id, t.imagem_id, t.nome, t.x, t.y,
               t.porte, t.lado, t.oculto, t.barras, t.moldura, t.luz,
               c.largura, c.altura, c.livre, c.ativa
        FROM mapa_tokens t JOIN mapa_cenas c ON c.id = t.cena_id
        WHERE t.id=%s AND c.campanha_id=%s{' FOR UPDATE OF t' if travar else ''}
        """,
        (token_id, campanha_id),
    ).fetchone()
    if not token:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="token nao encontrado")
    return dict(token)


def _participante_do_token(connection, campanha_id: UUID, token: dict) -> dict | None:
    participantes = _participantes(connection, campanha_id)
    return _ligacoes([token], participantes)[str(token["id"])]


def _erro_mapa(erro: ErroMapa) -> HTTPException:
    return HTTPException(status_code=erro.codigo, detail=erro.mensagem)


@router.post("/{campanha_id}/cenas/{cena_id}/tokens", status_code=status.HTTP_201_CREATED)
def criar_token(
    campanha_id: UUID,
    cena_id: UUID,
    payload: TokenInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        acesso = require_campaign_manager(connection, campanha_id, user.id)
        cena = _cena(connection, campanha_id, cena_id, travar=True)
        total = connection.execute("SELECT COUNT(*) AS n FROM mapa_tokens WHERE cena_id=%s", (cena_id,)).fetchone()
        if int(total["n"]) >= MAX_TOKENS_POR_CENA:
            raise HTTPException(status_code=409, detail=f"limite de {MAX_TOKENS_POR_CENA} tokens por cena")
        lado = payload.lado or "neutro"
        if payload.personagem_id:
            if not connection.execute(
                "SELECT 1 FROM personagens WHERE id=%s AND campanha_id=%s AND status='ativo'",
                (payload.personagem_id, campanha_id),
            ).fetchone():
                raise HTTPException(status_code=404, detail="personagem nao encontrado")
            lado = payload.lado or "jogador"
        if payload.participante_id:
            participante = connection.execute(
                """
                SELECT p.tipo FROM sessao_participantes p JOIN sessoes_mesa s ON s.id = p.sessao_id
                WHERE p.id=%s AND s.campanha_id=%s
                """,
                (payload.participante_id, campanha_id),
            ).fetchone()
            if not participante:
                raise HTTPException(status_code=404, detail="participante nao encontrado")
            lado = payload.lado or participante["tipo"]
        if payload.imagem_id:
            _item_do_mestre(connection, payload.imagem_id, user)
        if lado not in mapa.LADOS:
            raise HTTPException(status_code=422, detail="lado invalido")
        try:
            porte = mapa.porte_valido(payload.porte)
            x, y = mapa.limitar_posicao(payload.x, payload.y, cena["largura"], cena["altura"])
            moldura = mapa.normalizar_moldura(payload.moldura)
        except ErroMapa as erro:
            raise _erro_mapa(erro) from None
        connection.execute(
            """
            INSERT INTO mapa_tokens (id, cena_id, personagem_id, participante_id, imagem_id, nome, x, y, porte, lado, oculto, barras, moldura)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (uuid4(), cena_id, payload.personagem_id, payload.participante_id, payload.imagem_id,
             (payload.nome or "").strip() or None, x, y, porte, lado, payload.oculto, Jsonb(mapa.barras_padrao(lado)), moldura),
        )
        versao = _tocar(connection, cena_id)
        resposta = _montar(connection, campanha_id, acesso, user, cena_id)
    _avisar(campanha_id, versao)
    return resposta


@router.post("/{campanha_id}/cenas/{cena_id}/trazer")
def trazer_participantes(
    campanha_id: UUID,
    cena_id: UUID,
    payload: PontoInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    """Põe na cena quem está na Sessão e ainda não tem token, em fileira perto do ponto pedido."""
    with database.connection() as connection:
        acesso = require_campaign_manager(connection, campanha_id, user.id)
        cena = _cena(connection, campanha_id, cena_id, travar=True)
        tokens = _tokens(connection, cena_id)
        ja_tem_participante = {str(t["participante_id"]) for t in tokens if t["participante_id"]}
        ja_tem_personagem = {str(t["personagem_efetivo"]) for t in tokens if t["personagem_efetivo"]}
        grade = mapa.normalizar_grade({}, cena["grade"] if isinstance(cena["grade"], dict) else {})
        passo = float(grade["tamanho"])
        novos = 0
        for participante in _participantes(connection, campanha_id):
            personagem = str(participante["personagem_id"]) if participante["personagem_id"] else None
            if str(participante["id"]) in ja_tem_participante or (personagem and personagem in ja_tem_personagem):
                continue
            coluna, linha = novos % 6, novos // 6
            try:
                # Passos de casa inteira: se o ponto pedido está no meio de uma casa, todos ficam.
                x, y = mapa.limitar_posicao(payload.x + (coluna - 2) * passo, payload.y + linha * passo,
                                            cena["largura"], cena["altura"])
            except ErroMapa as erro:
                raise _erro_mapa(erro) from None
            lado = participante["tipo"] if participante["tipo"] in mapa.LADOS else "neutro"
            # Personagem de jogador ganha token próprio, que fica na cena entre uma sessão e outra.
            connection.execute(
                """
                INSERT INTO mapa_tokens (id, cena_id, personagem_id, participante_id, x, y, lado, barras)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (uuid4(), cena_id, participante["personagem_id"] if personagem else None,
                 None if personagem else participante["id"], x, y, lado, Jsonb(mapa.barras_padrao(lado))),
            )
            novos += 1
        versao = _tocar(connection, cena_id)
        resposta = _montar(connection, campanha_id, acesso, user, cena_id)
    _avisar(campanha_id, versao)
    resposta["trazidos"] = novos
    return resposta


@router.put("/{campanha_id}/tokens/{token_id}")
def editar_token(
    campanha_id: UUID,
    token_id: UUID,
    payload: TokenEdicao,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    """O Mestre mexe em tudo; o dono do personagem mexe só nas barras e na luz do próprio token."""
    with database.connection() as connection:
        acesso = campaign_access(connection, campanha_id, user.id)
        token = _token(connection, campanha_id, token_id, travar=True)
        quem = _espectador(connection, campanha_id, acesso, user.id)
        participante = _participante_do_token(connection, campanha_id, token)
        dono = mapa.e_dono(token, participante, quem)
        estruturais = (payload.nome, payload.porte, payload.lado, payload.oculto, payload.imagem_id, payload.moldura)
        if not quem.gestor and (any(v is not None for v in estruturais) or payload.sem_imagem or payload.sem_moldura):
            raise HTTPException(status_code=403, detail="so o mestre muda isso")
        if not quem.gestor and not dono:
            raise HTTPException(status_code=403, detail="este token nao e seu")
        mudancas: dict = {}
        try:
            if payload.nome is not None:
                mudancas["nome"] = payload.nome.strip() or None
            if payload.porte is not None:
                mudancas["porte"] = mapa.porte_valido(payload.porte)
            if payload.lado is not None:
                if payload.lado not in mapa.LADOS:
                    raise ErroMapa("lado invalido")
                mudancas["lado"] = payload.lado
            if payload.oculto is not None:
                mudancas["oculto"] = payload.oculto
            if payload.barras is not None:
                mudancas["barras"] = Jsonb(mapa.normalizar_barras(payload.barras, token["barras"] or {}, mudancas.get("lado", token["lado"])))
            if payload.sem_moldura:
                mudancas["moldura"] = None
            elif payload.moldura is not None:
                mudancas["moldura"] = mapa.normalizar_moldura(payload.moldura)
            if payload.sem_luz:
                mudancas["luz"] = None
            elif payload.luz is not None:
                mudancas["luz"] = Jsonb(mapa.normalizar_luz(payload.luz))
        except ErroMapa as erro:
            raise _erro_mapa(erro) from None
        if payload.sem_imagem:
            mudancas["imagem_id"] = None
        elif payload.imagem_id is not None:
            _item_do_mestre(connection, payload.imagem_id, user)
            mudancas["imagem_id"] = payload.imagem_id
        for coluna, valor in mudancas.items():
            connection.execute(f"UPDATE mapa_tokens SET {coluna}=%s, atualizado_em=CURRENT_TIMESTAMP WHERE id=%s", (valor, token_id))
        versao = _tocar(connection, token["cena_id"])
        resposta = _montar(connection, campanha_id, acesso, user, token["cena_id"] if quem.gestor else None)
    _avisar(campanha_id, versao)
    return resposta


@router.put("/{campanha_id}/personagens/{personagem_id}/token")
def editar_token_do_personagem(
    campanha_id: UUID,
    personagem_id: UUID,
    payload: TokenDoPersonagemInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    """Moldura e enquadramento da foto do personagem: valem em todas as cenas. Dono ou Mestre."""
    with database.connection() as connection:
        acesso = campaign_access(connection, campanha_id, user.id)
        personagem = connection.execute(
            "SELECT dono_usuario_id FROM personagens WHERE id=%s AND campanha_id=%s AND status='ativo'",
            (personagem_id, campanha_id),
        ).fetchone()
        if not personagem:
            raise HTTPException(status_code=404, detail="personagem nao encontrado")
        if not acesso.manages_content and personagem["dono_usuario_id"] != user.id:
            raise HTTPException(status_code=403, detail="este personagem nao e seu")
        atual = connection.execute(
            "SELECT moldura, enquadramento FROM personagem_token WHERE personagem_id=%s FOR UPDATE",
            (personagem_id,),
        ).fetchone()
        moldura = atual["moldura"] if atual else None
        enquadramento = atual["enquadramento"] if atual and isinstance(atual["enquadramento"], dict) else {}
        try:
            if payload.sem_moldura:
                moldura = None
            elif payload.moldura is not None:
                moldura = mapa.normalizar_moldura(payload.moldura)
            if payload.enquadramento is not None:
                enquadramento = mapa.normalizar_enquadramento(payload.enquadramento, enquadramento)
        except ErroMapa as erro:
            raise _erro_mapa(erro) from None
        connection.execute(
            """
            INSERT INTO personagem_token (personagem_id, moldura, enquadramento) VALUES (%s, %s, %s)
            ON CONFLICT (personagem_id) DO UPDATE
            SET moldura = EXCLUDED.moldura, enquadramento = EXCLUDED.enquadramento, atualizado_em = CURRENT_TIMESTAMP
            """,
            (personagem_id, moldura, Jsonb(enquadramento)),
        )
    _avisar(campanha_id, int(time.time()))
    return {"moldura": moldura, "enquadramento": mapa.normalizar_enquadramento({}, enquadramento)}


@router.put("/{campanha_id}/config")
def configurar_mapa(
    campanha_id: UUID,
    payload: ConfigMapaInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    """Moldura da mesa: com ela, todos os tokens da campanha usam a mesma. None devolve a escolha a cada um."""
    try:
        moldura = mapa.normalizar_moldura(payload.moldura_mesa)
    except ErroMapa as erro:
        raise _erro_mapa(erro) from None
    with database.connection() as connection:
        require_campaign_manager(connection, campanha_id, user.id)
        connection.execute(
            """
            INSERT INTO mapa_campanha (campanha_id, moldura_mesa) VALUES (%s, %s)
            ON CONFLICT (campanha_id) DO UPDATE SET moldura_mesa = EXCLUDED.moldura_mesa, atualizado_em = CURRENT_TIMESTAMP
            """,
            (campanha_id, moldura),
        )
    _avisar(campanha_id, int(time.time()))
    return {"moldura_mesa": moldura}


@router.post("/{campanha_id}/tokens/{token_id}/mover")
def mover_token(
    campanha_id: UUID,
    token_id: UUID,
    payload: PontoInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    """Mover sem o tempo real: cena em preparo do Mestre, ou o plano B sem WebSocket."""
    with database.connection() as connection:
        acesso = campaign_access(connection, campanha_id, user.id)
        token = _token(connection, campanha_id, token_id, travar=True)
        quem = _espectador(connection, campanha_id, acesso, user.id)
        if not quem.gestor:
            sessao = _sessao_do_momento(connection, campanha_id)
            if not token["ativa"] or not (sessao and sessao["status"] == "aberta"):
                raise HTTPException(status_code=403, detail="o mapa so abre com a sessao ao vivo")
        participante = _participante_do_token(connection, campanha_id, token)
        if not mapa.pode_mover(token, participante, quem, bool(token["livre"])):
            raise HTTPException(status_code=403, detail="voce nao move este token")
        try:
            x, y = mapa.limitar_posicao(payload.x, payload.y, token["largura"], token["altura"])
        except ErroMapa as erro:
            raise _erro_mapa(erro) from None
        travessia = None
        cena = _cena(connection, campanha_id, token["cena_id"])
        casa = mapa.normalizar_grade({}, cena["grade"] if isinstance(cena["grade"], dict) else {})["tamanho"]
        achado = mapa.portal_atingido(_portais(cena), x, y, casa, gestor=quem.gestor, aceito=payload.atravessar)
        if achado:
            portal, (x, y) = achado
            travessia = {"portal": portal["id"], "fluxo": portal["fluxo"], "de": [payload.x, payload.y]}
        connection.execute("UPDATE mapa_tokens SET x=%s, y=%s, atualizado_em=CURRENT_TIMESTAMP WHERE id=%s", (x, y, token_id))
        versao = _tocar(connection, token["cena_id"])
    _avisar(campanha_id, versao)
    return {"x": x, "y": y, "versao": versao, "travessia": travessia}


@router.delete("/{campanha_id}/tokens/{token_id}", status_code=status.HTTP_204_NO_CONTENT)
def apagar_token(
    campanha_id: UUID,
    token_id: UUID,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        require_campaign_manager(connection, campanha_id, user.id)
        token = _token(connection, campanha_id, token_id, travar=True)
        connection.execute("DELETE FROM mapa_tokens WHERE id=%s", (token_id,))
        versao = _tocar(connection, token["cena_id"])
    _avisar(campanha_id, versao)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


def _foto_da_ficha(connection, personagem_id) -> tuple[str, bytes] | None:
    linha = connection.execute("SELECT ficha->>'foto' AS foto FROM personagens WHERE id=%s", (personagem_id,)).fetchone()
    foto = linha["foto"] if linha else None
    if not isinstance(foto, str) or not foto.startswith("data:image/") or ";base64," not in foto:
        return None
    cabecalho, conteudo = foto.split(";base64,", 1)
    mime = cabecalho[len("data:"):]
    if mime not in ("image/webp", "image/png", "image/jpeg"):
        return None
    try:
        return mime, base64.b64decode(conteudo, validate=True)
    except (binascii.Error, ValueError):
        return None


@router.get("/{campanha_id}/tokens/{token_id}/imagem")
def imagem_do_token(
    campanha_id: UUID,
    token_id: UUID,
    user: AuthenticatedUser = Depends(get_current_user),
    database: Database = Depends(get_database),
):
    """Retrato do token: a imagem do acervo ou a foto da ficha. Só para quem vê a identidade do token."""
    with database.connection() as connection:
        acesso = campaign_access(connection, campanha_id, user.id)
        token = _token(connection, campanha_id, token_id)
        quem = _espectador(connection, campanha_id, acesso, user.id)
        if not quem.gestor:
            sessao = _sessao_do_momento(connection, campanha_id)
            if not token["ativa"] or not (sessao and sessao["status"] == "aberta"):
                raise HTTPException(status_code=404, detail="imagem nao encontrada")
        participante = _participante_do_token(connection, campanha_id, token)
        if mapa.degrau_de(token, participante, quem) not in ("parcial", "total"):
            raise HTTPException(status_code=404, detail="imagem nao encontrada")
        achado = None
        if token["imagem_id"]:
            item = connection.execute("SELECT largura, altura FROM acervo_itens WHERE id=%s", (token["imagem_id"],)).fetchone()
            if item:
                chave = "n0/0/0" if max(item["largura"], item["altura"]) <= 1024 else "mini"
                achado = ler_pedaco(connection, token["imagem_id"], chave)
        else:
            personagem = token["personagem_id"] or (participante or {}).get("personagem_id")
            if personagem:
                achado = _foto_da_ficha(connection, personagem)
    if not achado:
        raise HTTPException(status_code=404, detail="imagem nao encontrada")
    mime, dados = achado
    # O endereço leva a versão da imagem (?v=), então pode ficar guardado.
    return Response(content=dados, media_type=mime, headers={"Cache-Control": "private, max-age=31536000, immutable"})


# ------------------------------------------------------------ tempo real

def _regras_sync(database: Database, campanha_id: UUID) -> tempo_real.Regras:
    with database.connection() as connection:
        cena = _cena_ativa(connection, campanha_id)
        if not cena:
            return tempo_real.Regras(cena_id=None, livre=False, largura=0, altura=0, tokens={})
        portais = _portais(cena)
        casa = mapa.normalizar_grade({}, cena["grade"] if isinstance(cena["grade"], dict) else {})["tamanho"]
        tokens = _tokens(connection, cena["id"])
        participantes = _participantes(connection, campanha_id)
        ligacoes = _ligacoes(tokens, participantes)
        personagens = {str(t["personagem_efetivo"]) for t in tokens if t["personagem_efetivo"]}
        donos: dict[str, str] = {}
        if personagens:
            donos = {
                str(linha["id"]): str(linha["dono_usuario_id"])
                for linha in connection.execute(
                    "SELECT id, dono_usuario_id FROM personagens WHERE id = ANY(%s::uuid[]) AND dono_usuario_id IS NOT NULL",
                    (list(personagens),),
                ).fetchall()
            }
    estado_nevoa = nevoa.ler(cena["nevoa"])
    cobertura = nevoa.Nevoa(estado_nevoa["formas"]) if estado_nevoa["ligada"] else None
    regras = {}
    for token in tokens:
        participante = ligacoes[str(token["id"])]
        dono = donos.get(str(token["personagem_efetivo"])) if token["personagem_efetivo"] else None
        visivel = (participante or {}).get("visibilidade") or "total"
        regras[str(token["id"])] = tempo_real.RegraToken(
            quem_ve=mapa.quem_ve(token, participante),
            donos=frozenset({dono} if dono else ()),
            movivel_livre=not token["oculto"] and visivel in ("parcial", "total"),
            some_na_nevoa=mapa.some_na_nevoa(token, participante),
            revelado=cobertura is None or cobertura.revelado(float(token["x"]), float(token["y"])),
        )
    return tempo_real.Regras(
        cena_id=str(cena["id"]), livre=bool(cena["livre"]),
        largura=int(cena["largura"]), altura=int(cena["altura"]), tokens=regras,
        carregadas_em=time.monotonic(), nevoa=cobertura, portais=portais, casa=float(casa),
    )


def _gravar_posicao_sync(database: Database, campanha_id: UUID, token_id: str, x: float, y: float) -> bool:
    try:
        token_uuid = UUID(token_id)
    except ValueError:
        return False
    with database.connection() as connection:
        linha = connection.execute(
            """
            UPDATE mapa_tokens t SET x=%s, y=%s, atualizado_em=CURRENT_TIMESTAMP
            FROM mapa_cenas c
            WHERE t.id=%s AND t.cena_id=c.id AND c.campanha_id=%s AND c.ativa
            RETURNING t.id
            """,
            (x, y, token_uuid, campanha_id),
        ).fetchone()
    return linha is not None


def _origem_permitida(cabecalhos, settings) -> bool:
    """O WebSocket leva o cookie de login sozinho: outro site não pode abrir a conexão em nome de alguém."""
    origem = cabecalhos.get("origin")
    if not origem:
        return True
    if origem in settings.allowed_origins:
        return True
    if urlparse(origem).netloc == cabecalhos.get("host"):
        return True
    return not settings.production


def _entrada_sync(database: Database, conexao_http, campanha_id: UUID):
    """Quem está entrando e se pode: (usuário, gestor, personagens) ou um motivo de recusa."""
    usuario = get_current_user(conexao_http, database)
    with database.connection() as connection:
        acesso = campaign_access(connection, campanha_id, usuario.id)
        if not acesso.manages_content:
            sessao = _sessao_do_momento(connection, campanha_id)
            if not (sessao and sessao["status"] == "aberta"):
                raise HTTPException(status_code=403, detail="o mapa so abre com a sessao ao vivo")
        quem = _espectador(connection, campanha_id, acesso, usuario.id)
    return usuario, quem


def _estados_sync(database: Database, campanha_id: UUID, pedidos: list[tuple[str, str | None]]) -> list[dict | None]:
    """O estado do mapa de cada conexão, pela mesma `_montar` do GET: o recorte de cada papel
    (token oculto, desconhecido, na névoa) sai daqui do mesmo jeito. None: perdeu o acesso."""
    calculados: dict[tuple[str, str | None], dict | None] = {}
    with database.connection() as connection:
        for pedido in pedidos:
            if pedido in calculados:
                continue
            usuario_id, vendo = pedido
            try:
                usuario = SimpleNamespace(id=UUID(usuario_id))
                acesso = campaign_access(connection, campanha_id, usuario.id)
                cena_id = None
                if acesso.manages_content and vendo:
                    try:
                        cena_id = UUID(vendo)
                    except ValueError:
                        cena_id = None
                try:
                    calculados[pedido] = _montar(connection, campanha_id, acesso, usuario, cena_id)
                except HTTPException:
                    # A cena que o Mestre olhava foi apagada: vale a ativa.
                    calculados[pedido] = _montar(connection, campanha_id, acesso, usuario, None)
            except (HTTPException, ValueError):
                calculados[pedido] = None
    return [calculados[pedido] for pedido in pedidos]


def _empurrador_de(database: Database):
    async def empurrar(campanha_id: str, conexoes: list) -> list:
        pedidos = [(conexao.usuario_id, conexao.vendo if conexao.gestor else None) for conexao in conexoes]
        return await run_in_threadpool(_estados_sync, database, UUID(campanha_id), pedidos)

    return empurrar


def _funcoes_do_hub(database: Database, campanha_id: UUID):
    async def carregar():
        return await run_in_threadpool(_regras_sync, database, campanha_id)

    async def gravar(token_id: str, x: float, y: float) -> bool:
        return await run_in_threadpool(_gravar_posicao_sync, database, campanha_id, token_id, x, y)

    return carregar, gravar


@router.websocket("/{campanha_id}/ws")
async def ao_vivo_ws(websocket: WebSocket, campanha_id: UUID):
    database: Database = websocket.app.state.database
    if not _origem_permitida(websocket.headers, websocket.app.state.settings):
        await websocket.close(code=4403)
        return
    try:
        usuario, quem = await run_in_threadpool(_entrada_sync, database, websocket, campanha_id)
    except HTTPException as erro:
        await websocket.close(code=4000 + min(erro.status_code, 999))
        return
    await websocket.accept()
    conexao = tempo_real.Conexao(
        usuario_id=str(usuario.id), nome=usuario.nome_exibicao, gestor=quem.gestor, personagens=quem.personagens,
    )
    carregar, gravar = _funcoes_do_hub(database, campanha_id)
    tempo_real.registrar_empurrador(_empurrador_de(database))
    tempo_real.entrar(campanha_id, conexao)

    async def enviar():
        while True:
            await websocket.send_text(await conexao.proxima())

    enviador = asyncio.create_task(enviar())
    try:
        conexao.entregar(json.dumps({"t": "oi", "ts": tempo_real.agora_ms(), "eu": conexao.usuario_id, "cor": conexao.cor}))
        while True:
            texto = await websocket.receive_text()
            if len(texto) > 4096:
                continue
            try:
                mensagem = json.loads(texto)
            except ValueError:
                continue
            resposta = await tempo_real.processar(campanha_id, conexao, mensagem, carregar, gravar)
            if resposta:
                conexao.entregar(json.dumps(resposta, ensure_ascii=False))
    except WebSocketDisconnect:
        pass
    finally:
        enviador.cancel()
        tempo_real.sair(campanha_id, conexao)


# Plano B: SSE para descer e POST para subir, com as mesmas mensagens.
_conexoes_sse: dict[str, tuple[str, str, tempo_real.Conexao]] = {}


@router.get("/{campanha_id}/ao-vivo")
async def ao_vivo_sse(campanha_id: UUID, request: Request):
    database: Database = request.app.state.database
    usuario, quem = await run_in_threadpool(_entrada_sync, database, request, campanha_id)
    conexao = tempo_real.Conexao(
        usuario_id=str(usuario.id), nome=usuario.nome_exibicao, gestor=quem.gestor, personagens=quem.personagens,
    )
    conexao_id = uuid4().hex

    async def eventos():
        _conexoes_sse[conexao_id] = (str(campanha_id), str(usuario.id), conexao)
        tempo_real.registrar_empurrador(_empurrador_de(database))
        tempo_real.entrar(campanha_id, conexao)
        try:
            inicio = {"t": "oi", "ts": tempo_real.agora_ms(), "eu": conexao.usuario_id, "cor": conexao.cor, "conexao": conexao_id}
            yield f"data: {json.dumps(inicio)}\n\n".encode()
            while True:
                if await request.is_disconnected():
                    break
                try:
                    mensagem = await asyncio.wait_for(conexao.proxima(), timeout=20)
                except asyncio.TimeoutError:
                    yield b": ping\n\n"
                    continue
                yield f"data: {mensagem}\n\n".encode()
        finally:
            _conexoes_sse.pop(conexao_id, None)
            tempo_real.sair(campanha_id, conexao)

    return StreamingResponse(
        eventos(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-store", "X-Accel-Buffering": "no", "Connection": "keep-alive"},
    )


@router.post("/{campanha_id}/ao-vivo/{conexao_id}")
async def ao_vivo_post(
    campanha_id: UUID,
    conexao_id: str,
    payload: MensagensInput,
    request: Request,
    user: AuthenticatedUser = Depends(require_csrf),
):
    registro = _conexoes_sse.get(conexao_id)
    if not registro or registro[0] != str(campanha_id) or registro[1] != str(user.id):
        raise HTTPException(status_code=404, detail="conexao encerrada")
    conexao = registro[2]
    carregar, gravar = _funcoes_do_hub(request.app.state.database, campanha_id)
    respostas = []
    for mensagem in payload.mensagens:
        resposta = await tempo_real.processar(campanha_id, conexao, mensagem, carregar, gravar)
        if resposta:
            respostas.append(resposta)
    return {"respostas": respostas}
