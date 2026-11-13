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
import math
import time
from types import SimpleNamespace
from urllib.parse import urlparse
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Request, Response, WebSocket, WebSocketDisconnect, status
from fastapi.responses import StreamingResponse
from psycopg.types.json import Jsonb
from pydantic import BaseModel, Field
from starlette.concurrency import run_in_threadpool

from core import artes_token, calendario, construtor, mapa, mapas_colocados, mesa_extras, movimento_token, nevoa, paredes, recursos_token, tempo_real, visao
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
    "nevoa, nevoa_ladrilhos, clima, estrutura, nota_mestre"
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
    #: Nota só do Mestre sobre a cena (vazio apaga).
    nota_mestre: str | None = Field(default=None, max_length=mapa.NOTA_MAXIMA)


class TokenInput(BaseModel):
    personagem_id: UUID | None = None
    participante_id: UUID | None = None
    imagem_id: UUID | None = None
    nome: str | None = Field(default=None, max_length=60)
    x: float
    y: float
    porte: int = 1
    lado: str | None = None
    camada: str = "personagens"
    oculto: bool = False
    moldura: str | None = Field(default=None, max_length=40)


class TokenEdicao(BaseModel):
    nome: str | None = Field(default=None, max_length=60)
    porte: int | None = None
    lado: str | None = None
    oculto: bool | None = None
    camada: str | None = None
    flip_x: bool | None = None
    flip_y: bool | None = None
    imagem_id: UUID | None = None
    sem_imagem: bool = False
    barras: dict | None = None
    moldura: str | None = Field(default=None, max_length=40)
    sem_moldura: bool = False
    #: Tocha, lanterna, luz mágica: o Mestre e o dono do token mudam.
    luz: dict | None = None
    sem_luz: bool = False
    #: Aura presa ao token: o Mestre e o dono do token mudam, como a luz.
    aura: dict | None = None
    sem_aura: bool = False
    #: Nota só do Mestre sobre este token (vazio apaga). O dono do personagem não mexe nela.
    nota_mestre: str | None = Field(default=None, max_length=mapa.NOTA_MAXIMA)


class RecursoTokenInput(BaseModel):
    """Mexer num recurso pela barra do token: some `delta` (dano é negativo) ou define o valor `atual`."""

    tipo: str = Field(pattern="^(vida|mana|estamina|sanidade)$")
    delta: int | None = Field(default=None, ge=-99_999, le=99_999)
    atual: int | None = Field(default=None, ge=-999, le=99_999)


class TokenDoPersonagemInput(BaseModel):
    moldura: str | None = Field(default=None, max_length=40)
    sem_moldura: bool = False
    enquadramento: dict | None = None
    #: Arte extra que o token mostra; `sem_arte` volta à foto da ficha.
    arte_id: UUID | None = None
    sem_arte: bool = False


class ArteInput(BaseModel):
    nome: str | None = Field(default=None, max_length=artes_token.NOME_MAXIMO * 2)
    imagem: str = Field(min_length=32, max_length=artes_token.MAX_CARACTERES_ARTE + 64)


class ConfigMapaInput(BaseModel):
    moldura_mesa: str | None = Field(default=None, max_length=40)


class NevoaInput(BaseModel):
    """Uma mudança por vez na névoa da cena; o Mestre desenha e cada forma solta vira um pedido."""

    ligada: bool | None = None
    visao_pelas_paredes: bool | None = None
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


class PortaInput(BaseModel):
    """Mexer numa porta do mapa montado: `id` é a aresta ("h,3,4"). O jogador só abre e fecha."""

    id: str = Field(min_length=5, max_length=16)
    estado: str | None = None
    #: Só o Mestre: True revela a porta secreta (vira porta comum), False a esconde de novo.
    revelar: bool | None = None


class CamadasInput(BaseModel):
    jogadores: dict[str, bool]


class AnotacoesInput(BaseModel):
    anotacoes: list[dict] = Field(default_factory=list, max_length=mapa.MAX_ANOTACOES)


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
    if acesso.manages_content:
        permissoes_mesa = mapa.normalizar_permissoes_mesa({}, acesso.role)
    else:
        membro = connection.execute(
            "SELECT papel, permissoes_mesa FROM membros_campanha WHERE campanha_id=%s AND usuario_id=%s AND status='ativo'",
            (campanha_id, user_id),
        ).fetchone()
        permissoes_mesa = mapa.ler_permissoes_mesa(membro["permissoes_mesa"] if membro else None, membro["papel"] if membro else acesso.role)
    return Espectador(
        usuario_id=str(user_id), gestor=acesso.manages_content, personagens=personagens,
        permissoes_mesa=permissoes_mesa,
    )


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
                   t.x, t.y, t.porte, t.lado, t.oculto, t.barras, t.moldura, t.luz, t.aura,
                   t.camada, t.flip_x, t.flip_y, t.nota_mestre, t.recipiente,
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
            "arte_id": str(linha["arte_id"]) if linha["arte_id"] else None,
        }
        for linha in connection.execute(
            "SELECT personagem_id, moldura, enquadramento, arte_id FROM personagem_token WHERE personagem_id = ANY(%s::uuid[])",
            (list(personagens),),
        ).fetchall()
    }


def _mesa_da_campanha(connection, campanha_id: UUID) -> dict:
    """Pausa, relógios e cronômetro da campanha (core/mesa_extras.py)."""
    linha = connection.execute("SELECT mesa FROM mapa_campanha WHERE campanha_id=%s", (campanha_id,)).fetchone()
    return mesa_extras.ler_mesa(linha["mesa"] if linha else None)


def _moldura_mesa(connection, campanha_id: UUID) -> str | None:
    linha = connection.execute("SELECT moldura_mesa FROM mapa_campanha WHERE campanha_id=%s", (campanha_id,)).fetchone()
    return linha["moldura_mesa"] if linha else None


def _visao_tokens(connection, campanha_id: UUID, cena, quem: Espectador, visao_jogador=None) -> list[dict]:
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
    camadas_visiveis = _camadas_visiveis(cena["estrutura"], quem.gestor, quem.permissoes_mesa)
    saida = []
    for token in tokens:
        if not quem.gestor and not camadas_visiveis.get(token.get("camada") or "personagens", False):
            continue
        personagem = str(token["personagem_efetivo"]) if token["personagem_efetivo"] else None
        proprio = personagem in quem.personagens if personagem else False
        if visao_jogador is not None and not proprio and not visao_jogador["grade"].contem(
            visao_jogador["grade"].visiveis, float(token["x"]), float(token["y"]),
        ):
            continue
        participante = ligacoes[str(token["id"])]
        do_personagem = tokens_de_personagem.get(personagem) or {}
        ficha_linha = fichas.get(personagem) if personagem else None
        ficha = ficha_linha["ficha"] if ficha_linha and isinstance(ficha_linha["ficha"], dict) else {}
        if token["imagem_id"]:
            versao_imagem = f"a{str(token['imagem_id'])[:8]}"
        elif do_personagem.get("arte_id"):
            # Arte extra escolhida pelo dono: a versão é o id dela (a arte nunca muda, só nasce e some).
            versao_imagem = f"r{do_personagem['arte_id'][:8]}"
        elif ficha_linha and ficha_linha["foto_hash"]:
            versao_imagem = f"f{ficha_linha['foto_hash'][:10]}"
        else:
            versao_imagem = None
        condicoes_do_participante = normalizar_condicoes(participante["condicoes"]) if participante else []
        condicoes = [c["nome"] for c in condicoes_do_participante]
        item = mapa.visao_token(
            token,
            participante,
            quem,
            livre=bool(cena["livre"]),
            recursos_ficha=_session_resources(ficha) if ficha_linha else None,
            sanidade=mapa.sanidade_da_ficha(ficha) if ficha_linha else None,
            nivel=_nivel(ficha) if ficha_linha else None,
            movimento=movimento_token.da_ficha(ficha, condicoes) if ficha_linha else None,
            tem_retrato=versao_imagem is not None,
            condicoes=condicoes,
            turnos_das_condicoes={c["nome"]: c["turnos"] for c in condicoes_do_participante},
            aflicoes=mapa.aflicoes_da_ficha(ficha, gestor=quem.gestor) if ficha_linha else [],
            moldura=mapa.moldura_efetiva(token, personagem, do_personagem.get("moldura"), moldura_mesa),
            # O enquadramento é da foto da ficha; imagem do acervo já vem recortada.
            enquadramento=do_personagem.get("enquadramento") if not token["imagem_id"] else None,
            na_nevoa=(
                False if proprio and visao_jogador is not None
                else cobertura is not None and not cobertura.revelado(float(token["x"]), float(token["y"]))
            ),
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


def _mapas_colocados_da_cena(connection, cena, gestor: bool) -> list[dict]:
    """Os mapas colocados na cena, de baixo para cima. O jogador só recebe os visíveis, sem nome nem trava."""
    mapas = mapas_colocados.ler(cena["estrutura"])
    if not gestor:
        mapas = mapas_colocados.visiveis_para_jogador(mapas)
    itens = _itens_dos_mapas(connection, mapas)
    saida = []
    for mapa in mapas:
        item = itens.get(mapa["imagem_id"])
        if item is None:
            continue
        linha = {
            "id": mapa["id"], "imagem_id": mapa["imagem_id"], "x": mapa["x"], "y": mapa["y"], "escala": mapa["escala"],
            "rotacao": mapa["rotacao"], "largura": item["largura"], "altura": item["altura"], "ladrilho": item["ladrilho"], "chaves": item["chaves"],
        }
        if gestor:
            linha.update(nome=mapa["nome"], visivel=mapa["visivel"], trancado=mapa["trancado"], nota=mapa["nota"])
        saida.append(linha)
    return saida


def _portais(cena) -> list[dict]:
    return mapa.ler_estrutura(cena["estrutura"], int(cena["largura"]), int(cena["altura"]))["portais"]


def _camadas_visiveis(estrutura, gestor: bool, permissoes_mesa: dict | None = None) -> dict[str, bool]:
    if gestor:
        return {camada: True for camada in mapa.CAMADAS_MAPA}
    liberadas = mapa.camadas_jogadores(estrutura)
    pessoais = permissoes_mesa.get("camadas", {}) if isinstance(permissoes_mesa, dict) else {}
    return {camada: liberadas.get(camada, False) and pessoais.get(camada, True) for camada in mapa.CAMADAS_MAPA}


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


def _visao_jogador(connection, campanha_id: UUID, cena, quem: Espectador) -> dict | None:
    """Calcula e grava a memória de quem pergunta. Nenhuma geometria de parede sai daqui."""
    estado = nevoa.ler(cena["nevoa"])
    if quem.gestor or not estado["visao_pelas_paredes"]:
        return None

    largura, altura = int(cena["largura"]), int(cena["altura"])
    grade_cena = mapa.normalizar_grade({}, cena["grade"] if isinstance(cena["grade"], dict) else {})
    casa = float(grade_cena["tamanho"])
    camadas_visiveis = _camadas_visiveis(cena["estrutura"], False, quem.permissoes_mesa)
    tokens = _tokens(connection, cena["id"])
    participantes = _participantes(connection, campanha_id)
    ligacoes = _ligacoes(tokens, participantes)
    proprios = {
        str(token["id"])
        for token in tokens
        if token["personagem_efetivo"]
        and str(token["personagem_efetivo"]) in quem.personagens
        and not token["oculto"]
        and camadas_visiveis.get(token.get("camada") or "personagens", False)
    }
    fontes = []
    for token in tokens:
        personagem = str(token["personagem_efetivo"]) if token["personagem_efetivo"] else None
        if personagem not in quem.personagens or token["oculto"]:
            continue
        if not camadas_visiveis.get(token.get("camada") or "personagens", False):
            continue
        luz = token.get("luz")
        raio = None
        if isinstance(luz, dict) and isinstance(luz.get("raio"), (int, float)) and not isinstance(luz.get("raio"), bool):
            raio = max(0.0, float(luz["raio"]) * casa)
        fontes.append((float(token["x"]), float(token["y"]), raio))

    barram, vaos = paredes.barreiras(cena["estrutura"])
    # Janelas continuam barrando movimento, mas deixam a linha de visão passar.
    for abertura in construtor.ler_aberturas(cena["estrutura"]):
        if abertura.get("tipo") == "janela":
            vaos.append([float(abertura[c]) for c in ("x1", "y1", "x2", "y2")])
    cobertura = nevoa.Nevoa(estado["formas"]) if estado["ligada"] else None
    indice_paredes = (
        visao.IndiceParedes(largura, altura, nevoa.tamanho_da_celula(largura, altura), barram, vaos)
        if fontes else None
    )
    celula, colunas, linhas, visiveis = visao.calcular_celulas_visiveis(
        largura, altura, fontes, barram, vaos, cobertura, indice_paredes,
    )
    total_fontes_tokens = len(fontes)
    # Uma luz fixa só participa depois que o jogador já consegue ver a própria
    # fonte. Isso impede que uma tocha numa sala secreta revele aquela sala.
    grade_inicial = visao.GradeVisao(largura, altura, celula, colunas, linhas, visiveis, set())
    for luz in construtor.ler_luzes(cena["estrutura"]):
        if grade_inicial.contem(visiveis, float(luz["x"]), float(luz["y"])):
            fontes.append((float(luz["x"]), float(luz["y"]), max(0.0, float(luz["raio"]) * casa)))
    if len(fontes) > total_fontes_tokens:
        celula, colunas, linhas, visiveis = visao.calcular_celulas_visiveis(
            largura, altura, fontes, barram, vaos, cobertura, indice_paredes,
        )
    anterior = connection.execute(
        """
        SELECT mapa_id, largura, altura, celula, celulas_exploradas
        FROM mapa_exploracao WHERE cena_id=%s AND usuario_id=%s
        """,
        (cena["id"], UUID(quem.usuario_id)),
    ).fetchone()
    exploradas_antes = []
    if anterior and anterior["mapa_id"] == cena["mapa_id"] and (
        int(anterior["largura"]), int(anterior["altura"]), int(anterior["celula"])
    ) == (largura, altura, celula):
        exploradas_antes = anterior["celulas_exploradas"] or []
    grade = visao.combinar(largura, altura, celula, colunas, linhas, visiveis, exploradas_antes)

    # O dono continua vendo seu próprio token, mesmo que o Mestre o tenha posto
    # numa parte coberta. A célula só é liberada para esse recorte da pessoa.
    for token in tokens:
        if str(token["id"]) in proprios:
            indice = visao.indice_da_posicao(grade, float(token["x"]), float(token["y"]))
            if indice is not None:
                grade.visiveis.add(indice)
                grade.exploradas.add(indice)

    tokens_visiveis = []
    for token in tokens:
        if token["oculto"] or not camadas_visiveis.get(token.get("camada") or "personagens", False):
            continue
        participante = ligacoes[str(token["id"])]
        visibilidade = mapa.quem_ve(token, participante)
        if visibilidade == "gestores" or (visibilidade == "donos" and not mapa.e_dono(token, participante, quem)):
            continue
        if str(token["id"]) in proprios or grade.contem(grade.visiveis, float(token["x"]), float(token["y"])):
            tokens_visiveis.append(UUID(str(token["id"])))

    formas_visiveis = visao.formas(grade, grade.visiveis)
    formas_exploradas = visao.formas(grade, grade.exploradas)
    mapa_da_cena = _mapa_da_cena(connection, cena) if camadas_visiveis["mapa"] else None
    ladrilhos = nevoa.ladrilhos_liberados(
        formas_exploradas, largura, altura, mapa_da_cena["chaves"] if mapa_da_cena else [],
    ) if camadas_visiveis["mapa"] else []
    colocados = mapas_colocados.visiveis_para_jogador(mapas_colocados.ler(cena["estrutura"])) if camadas_visiveis["mapa"] else []
    if colocados and formas_exploradas:
        ladrilhos = sorted({*ladrilhos, *mapas_colocados.ladrilhos_liberados(
            formas_exploradas, colocados, _itens_dos_mapas(connection, colocados),
        )})
    connection.execute(
        """
        INSERT INTO mapa_exploracao (
            cena_id, usuario_id, mapa_id, largura, altura, celula, celulas_exploradas,
            celulas_visiveis, ladrilhos, tokens_visiveis
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (cena_id, usuario_id) DO UPDATE SET
            mapa_id=EXCLUDED.mapa_id,
            largura=EXCLUDED.largura,
            altura=EXCLUDED.altura,
            celula=EXCLUDED.celula,
            celulas_exploradas=CASE
                WHEN mapa_exploracao.mapa_id IS NOT DISTINCT FROM EXCLUDED.mapa_id
                  AND mapa_exploracao.largura=EXCLUDED.largura
                  AND mapa_exploracao.altura=EXCLUDED.altura
                  AND mapa_exploracao.celula=EXCLUDED.celula
                THEN ARRAY(
                    SELECT DISTINCT indice FROM unnest(mapa_exploracao.celulas_exploradas || EXCLUDED.celulas_exploradas) AS u(indice)
                    ORDER BY indice
                )
                ELSE EXCLUDED.celulas_exploradas
            END,
            celulas_visiveis=EXCLUDED.celulas_visiveis,
            ladrilhos=CASE
                WHEN mapa_exploracao.mapa_id IS NOT DISTINCT FROM EXCLUDED.mapa_id
                  AND mapa_exploracao.largura=EXCLUDED.largura
                  AND mapa_exploracao.altura=EXCLUDED.altura
                  AND mapa_exploracao.celula=EXCLUDED.celula
                THEN ARRAY(
                    SELECT DISTINCT chave FROM unnest(mapa_exploracao.ladrilhos || EXCLUDED.ladrilhos) AS u(chave)
                    ORDER BY chave
                )
                ELSE EXCLUDED.ladrilhos
            END,
            tokens_visiveis=EXCLUDED.tokens_visiveis,
            atualizado_em=CURRENT_TIMESTAMP
        """,
        (
            cena["id"], UUID(quem.usuario_id), cena["mapa_id"], largura, altura, celula,
            sorted(grade.exploradas), sorted(grade.visiveis), ladrilhos, tokens_visiveis,
        ),
    )
    return {
        "grade": grade,
        "formas": formas_visiveis,
        "formas_exploradas": formas_exploradas,
        "ladrilhos": ladrilhos,
        "tokens_visiveis": {str(token_id) for token_id in tokens_visiveis},
    }


def _abertura_a_vista(abertura: dict, visao_jogador: dict) -> bool:
    """Uma porta fechada é visível do lado acessível, mesmo que seu meio fique na parede."""
    grade = visao_jogador["grade"]
    pontos = [float(abertura[c]) for c in ("x1", "y1", "x2", "y2")]
    x1, y1, x2, y2 = pontos
    meio_x, meio_y = (x1 + x2) / 2, (y1 + y2) / 2
    if grade.contem(grade.visiveis, meio_x, meio_y):
        return True
    dx, dy = x2 - x1, y2 - y1
    comprimento = math.hypot(dx, dy)
    if comprimento <= 1e-6:
        return False
    afastamento = grade.celula * 0.75
    normal_x, normal_y = -dy / comprimento, dx / comprimento
    return any(
        grade.contem(grade.visiveis, meio_x + lado * normal_x * afastamento, meio_y + lado * normal_y * afastamento)
        for lado in (-1, 1)
    )


def _resumo_cena(
    connection, cena, *, completa: bool, gestor: bool = False,
    permissoes_mesa: dict | None = None, visao_jogador: dict | None = None,
) -> dict:
    resumo = {
        "id": str(cena["id"]),
        "nome": cena["nome"],
        "ativa": bool(cena["ativa"]),
        "versao": int(cena["versao"]),
    }
    if completa:
        estado_nevoa = nevoa.ler(cena["nevoa"])
        cobertura = nevoa.Nevoa(estado_nevoa["formas"]) if estado_nevoa["ligada"] else None
        camadas_visiveis = _camadas_visiveis(cena["estrutura"], gestor, permissoes_mesa)
        if visao_jogador is not None:
            revelado = lambda x, y: visao_jogador["grade"].contem(visao_jogador["grade"].visiveis, x, y)
        else:
            revelado = cobertura.revelado if cobertura is not None else (lambda _x, _y: True)
        anotacoes = mapa.ler_anotacoes(cena["estrutura"], int(cena["largura"]), int(cena["altura"]))
        if not gestor:
            anotacoes = [a for a in anotacoes if camadas_visiveis["anotacoes"] and not a.get("secreta") and revelado(a["x"], a["y"])]
        clima = mapa.ler_clima(cena["clima"], int(cena["largura"]), int(cena["altura"]))
        if visao_jogador is not None:
            clima["efeitos"] = [
                efeito for efeito in clima["efeitos"]
                if efeito["area"] is None or visao.retangulo_totalmente_visivel(
                    visao_jogador["grade"], visao_jogador["grade"].visiveis,
                    [efeito["area"]["x"], efeito["area"]["y"], efeito["area"]["w"], efeito["area"]["h"]],
                )
            ]
        nevoa_resposta = {
            **estado_nevoa,
            "ligada": (True if visao_jogador is not None else estado_nevoa["ligada"]) if camadas_visiveis["mapa"] else False,
            "formas": visao_jogador["formas"] if visao_jogador is not None else estado_nevoa["formas"],
            "exploradas": visao_jogador["formas_exploradas"] if visao_jogador is not None else [],
            "personalizada": visao_jogador is not None,
            "ladrilhos": (
                visao_jogador["ladrilhos"] if visao_jogador is not None
                else list(cena["nevoa_ladrilhos"] or []) if estado_nevoa["ligada"] and not gestor and camadas_visiveis["mapa"]
                else None
            ),
        }
        resumo.update({
            "largura": cena["largura"],
            "altura": cena["altura"],
            "grade": mapa.normalizar_grade({}, cena["grade"] if isinstance(cena["grade"], dict) else {}),
            "livre": bool(cena["livre"]),
            # A nota da cena é só de quem comanda a mesa: jogador nem recebe a chave.
            **({"nota_mestre": cena["nota_mestre"] or ""} if gestor else {}),
            # Onde a tela abre a cena (core/mesa_extras.py); None é o mapa inteiro.
            "vista": mesa_extras.ler_vista(cena["estrutura"]),
            "mapa": _mapa_da_cena(connection, cena) if camadas_visiveis["mapa"] else None,
            "mapas_colocados": _mapas_colocados_da_cena(connection, cena, gestor) if camadas_visiveis["mapa"] else [],
            "camadas_jogadores": mapa.camadas_jogadores(cena["estrutura"]) if gestor else None,
            "camadas_visiveis": [chave for chave, visivel in camadas_visiveis.items() if visivel],
            "anotacoes": anotacoes,
            "nevoa": nevoa_resposta if camadas_visiveis["mapa"] else {
                **nevoa_resposta, "ligada": False, "formas": [], "exploradas": [],
                "personalizada": False, "ladrilhos": None,
            },
            "clima": clima,
            # Portal escondido, desligado ou com as duas bocas na névoa não chega ao jogador.
            "portais": mapa.portais_de(
                _portais(cena) if camadas_visiveis["mapa"] else [], gestor=gestor,
                revelado=revelado,
            ),
            # Portas e janelas do mapa montado no construtor; a porta secreta é só do Mestre.
            "aberturas": (
                construtor.aberturas_de(
                    [a for a in construtor.ler_aberturas(cena["estrutura"]) if _abertura_a_vista(a, visao_jogador)],
                    gestor=False, revelado=lambda _x, _y: True,
                )
                if visao_jogador is not None and camadas_visiveis["mapa"]
                else construtor.aberturas_de(
                    construtor.ler_aberturas(cena["estrutura"]) if camadas_visiveis["mapa"] else [],
                    gestor=gestor, revelado=revelado,
                )
            ),
            # Luzes fixas (só as que a névoa mostra) e as casas de água e lava, que ganham movimento.
            "luzes": construtor.luzes_de(
                construtor.ler_luzes(cena["estrutura"]) if camadas_visiveis["mapa"] else [], gestor=gestor,
                revelado=revelado,
            ),
            "liquidos": (
                {
                    tipo: [
                        retangulo for retangulo in retangulos
                        if visao.retangulo_totalmente_visivel(visao_jogador["grade"], visao_jogador["grade"].visiveis, retangulo)
                    ]
                    for tipo, retangulos in construtor.ler_liquidos(cena["estrutura"]).items()
                }
                if visao_jogador is not None and camadas_visiveis["mapa"]
                else construtor.ler_liquidos(cena["estrutura"]) if camadas_visiveis["mapa"]
                else {"agua": [], "lava": []}
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
        "permissoes_mesa": quem.permissoes_mesa,
        "ao_vivo": ao_vivo,
        "bloqueado": not gestor and not ao_vivo,
        "cenas": [],
        "cena": None,
        "tokens": [],
        "moldura_mesa": None,
        "tempo": None,
        "mesa": None,
    }
    if resposta["bloqueado"]:
        return resposta
    resposta["moldura_mesa"] = _moldura_mesa(connection, campanha_id)
    resposta["tempo"] = _tempo_da_campanha(connection, campanha_id, gestor)
    resposta["mesa"] = mesa_extras.mesa_de(_mesa_da_campanha(connection, campanha_id), gestor=gestor)
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
    visao_jogador = _visao_jogador(connection, campanha_id, escolhida, quem)
    resposta["cena"] = _resumo_cena(
        connection, escolhida, completa=True, gestor=gestor, permissoes_mesa=quem.permissoes_mesa,
        visao_jogador=visao_jogador,
    )
    resposta["tokens"] = _visao_tokens(connection, campanha_id, escolhida, quem, visao_jogador)
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
        # Trocar o mapa de fundo (ou o tamanho) não pode deixar os mapas colocados fora da cena.
        colocados = mapas_colocados.ler(cena["estrutura"])
        if colocados and {"largura", "altura"} & mudancas.keys():
            direita, baixo = mapas_colocados.extensao(colocados, _itens_dos_mapas(connection, colocados))
            if "largura" in mudancas:
                mudancas["largura"] = max(int(mudancas["largura"]), direita)
            if "altura" in mudancas:
                mudancas["altura"] = max(int(mudancas["altura"]), baixo)
        if payload.grade is not None:
            try:
                mudancas["grade"] = Jsonb(mapa.normalizar_grade(payload.grade, cena["grade"] if isinstance(cena["grade"], dict) else {}))
            except ErroMapa as erro:
                raise HTTPException(status_code=erro.codigo, detail=erro.mensagem) from None
        if payload.livre is not None:
            mudancas["livre"] = payload.livre
        if payload.ordem is not None:
            mudancas["ordem"] = payload.ordem
        if payload.nota_mestre is not None:
            try:
                mudancas["nota_mestre"] = mapa.normalizar_nota(payload.nota_mestre)
            except ErroMapa as erro:
                raise _erro_mapa(erro) from None
        for coluna, valor in mudancas.items():
            connection.execute(f"UPDATE mapa_cenas SET {coluna}=%s WHERE id=%s", (valor, cena_id))
        if {"mapa_id", "largura", "altura"} & mudancas.keys():
            # Outro mapa tem outros ladrilhos: a lista do que o jogador baixa é refeita.
            _recalcular_nevoa(connection, _cena(connection, campanha_id, cena_id))
        versao = _tocar(connection, cena_id)
        resposta = _montar(connection, campanha_id, acesso, user, cena_id)
    _avisar(campanha_id, versao)
    return resposta


def _itens_dos_mapas(connection, mapas: list[dict]) -> dict[str, dict]:
    """Os itens do Acervo que os mapas colocados usam, por id (só os prontos e do tipo mapa)."""
    ids = {UUID(mapa["imagem_id"]) for mapa in mapas}
    if not ids:
        return {}
    linhas = connection.execute(
        "SELECT id, nome, largura, altura, ladrilho, chaves FROM acervo_itens WHERE id = ANY(%s) AND estado='pronto' AND tipo='mapa'",
        (list(ids),),
    ).fetchall()
    return {
        str(linha["id"]): {
            "nome": linha["nome"], "largura": int(linha["largura"]), "altura": int(linha["altura"]),
            "ladrilho": linha["ladrilho"], "chaves": list(linha["chaves"] or []),
        }
        for linha in linhas
    }


def _recalcular_nevoa(connection, cena, estado: dict | None = None) -> None:
    estado = estado or nevoa.ler(cena["nevoa"])
    mapa_da_cena = _mapa_da_cena(connection, cena)
    ladrilhos = (
        nevoa.ladrilhos_liberados(estado["formas"], int(cena["largura"]), int(cena["altura"]), mapa_da_cena["chaves"])
        if mapa_da_cena else []
    )
    # Cada mapa colocado e visível entra na mesma lista, com o id dele na frente da chave.
    colocados = mapas_colocados.ler(cena["estrutura"])
    if colocados and estado["formas"]:
        ladrilhos = sorted({*ladrilhos, *mapas_colocados.ladrilhos_liberados(
            estado["formas"], colocados, _itens_dos_mapas(connection, colocados),
        )})
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
            if payload.visao_pelas_paredes is not None:
                estado["visao_pelas_paredes"] = payload.visao_pelas_paredes
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
        # Portal entre cenas: as outras cenas da campanha são os destinos possíveis.
        destinos = {
            str(linha["id"]): (int(linha["largura"]), int(linha["altura"]), linha["nome"])
            for linha in connection.execute(
                "SELECT id, nome, largura, altura FROM mapa_cenas WHERE campanha_id=%s AND id<>%s",
                (campanha_id, cena_id),
            ).fetchall()
        }
        try:
            portais = mapa.normalizar_portais(payload.portais, int(cena["largura"]), int(cena["altura"]), destinos)
        except ErroMapa as erro:
            raise _erro_mapa(erro) from None
        estrutura = dict(cena["estrutura"]) if isinstance(cena["estrutura"], dict) else {}
        estrutura["portais"] = portais
        connection.execute("UPDATE mapa_cenas SET estrutura=%s WHERE id=%s", (Jsonb(estrutura), cena_id))
        versao = _tocar(connection, cena_id)
        resposta = _montar(connection, campanha_id, acesso, user, cena_id)
    _avisar(campanha_id, versao)
    return resposta


@router.put("/{campanha_id}/cenas/{cena_id}/camadas")
def mudar_camadas(
    campanha_id: UUID,
    cena_id: UUID,
    payload: CamadasInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    """Salva quais camadas o servidor pode entregar aos jogadores. O Mestre sempre vê todas."""
    with database.connection() as connection:
        acesso = require_campaign_manager(connection, campanha_id, user.id)
        cena = _cena(connection, campanha_id, cena_id, travar=True)
        estrutura = dict(cena["estrutura"]) if isinstance(cena["estrutura"], dict) else {}
        try:
            atual = mapa.camadas_jogadores(estrutura)
            estrutura["camadas_jogadores"] = mapa.normalizar_camadas_jogadores(payload.jogadores, atual)
        except ErroMapa as erro:
            raise _erro_mapa(erro) from None
        connection.execute("UPDATE mapa_cenas SET estrutura=%s WHERE id=%s", (Jsonb(estrutura), cena_id))
        versao = _tocar(connection, cena_id)
        resposta = _montar(connection, campanha_id, acesso, user, cena_id)
    _avisar(campanha_id, versao)
    return resposta


@router.put("/{campanha_id}/cenas/{cena_id}/anotacoes")
def mudar_anotacoes(
    campanha_id: UUID,
    cena_id: UUID,
    payload: AnotacoesInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    """Cria, edita ou remove os textos persistentes da cena."""
    with database.connection() as connection:
        acesso = require_campaign_manager(connection, campanha_id, user.id)
        cena = _cena(connection, campanha_id, cena_id, travar=True)
        try:
            anotacoes = mapa.normalizar_anotacoes(payload.anotacoes, int(cena["largura"]), int(cena["altura"]))
        except ErroMapa as erro:
            raise _erro_mapa(erro) from None
        estrutura = dict(cena["estrutura"]) if isinstance(cena["estrutura"], dict) else {}
        estrutura["anotacoes"] = anotacoes
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
               t.porte, t.lado, t.oculto, t.barras, t.moldura, t.luz, t.aura, t.camada, t.flip_x, t.flip_y, t.recipiente,
               c.largura, c.altura, c.livre, c.ativa, c.estrutura
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
        if payload.camada not in mapa.CAMADAS_TOKEN:
            raise HTTPException(status_code=422, detail="camada do token invalida")
        try:
            porte = mapa.porte_valido(payload.porte)
            x, y = mapa.limitar_posicao(payload.x, payload.y, cena["largura"], cena["altura"])
            moldura = mapa.normalizar_moldura(payload.moldura)
        except ErroMapa as erro:
            raise _erro_mapa(erro) from None
        connection.execute(
            """
            INSERT INTO mapa_tokens (id, cena_id, personagem_id, participante_id, imagem_id, nome, x, y, porte, lado, oculto, barras, moldura, camada)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (uuid4(), cena_id, payload.personagem_id, payload.participante_id, payload.imagem_id,
             (payload.nome or "").strip() or None, x, y, porte, lado, payload.oculto, Jsonb(mapa.barras_padrao(lado)), moldura, payload.camada),
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
        if not quem.gestor and not _camadas_visiveis(token["estrutura"], False, quem.permissoes_mesa).get(token["camada"], False):
            raise HTTPException(status_code=404, detail="token nao encontrado")
        estruturais = (payload.nome, payload.porte, payload.lado, payload.oculto, payload.imagem_id, payload.moldura, payload.camada, payload.nota_mestre)
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
            if payload.camada is not None:
                if payload.camada not in mapa.CAMADAS_TOKEN:
                    raise ErroMapa("camada do token invalida")
                mudancas["camada"] = payload.camada
            if payload.nota_mestre is not None:
                mudancas["nota_mestre"] = mapa.normalizar_nota(payload.nota_mestre)
            if payload.flip_x is not None:
                mudancas["flip_x"] = payload.flip_x
            if payload.flip_y is not None:
                mudancas["flip_y"] = payload.flip_y
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
            if payload.sem_aura:
                mudancas["aura"] = None
            elif payload.aura is not None:
                try:
                    mudancas["aura"] = Jsonb(mesa_extras.normalizar_aura(payload.aura))
                except mesa_extras.ErroMesa as erro:
                    raise HTTPException(status_code=erro.codigo, detail=erro.mensagem) from None
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


@router.post("/{campanha_id}/tokens/{token_id}/recurso")
def mexer_no_recurso_do_token(
    campanha_id: UUID,
    token_id: UUID,
    payload: RecursoTokenInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    """Vida, Mana, Estamina ou Sanidade pela barra do token. O dono do personagem e o Mestre mexem; o número
    novo vai para o participante da Sessão (se ele estiver lá) e para a ficha, como no HUD do Mestre."""
    from routers.sessions import _avisar_fichas_alteradas, _tocar as _tocar_sessao  # import tardio: o router da Sessão é pesado
    from routers.characters import _session_resources
    from core import live_session
    from core.combate_intenso import registrar_minimos

    if (payload.delta is None) == (payload.atual is None):
        raise HTTPException(status_code=422, detail="informe a mudanca (delta) ou o valor novo (atual)")
    with database.connection() as connection:
        acesso = campaign_access(connection, campanha_id, user.id)
        token = _token(connection, campanha_id, token_id, travar=True)
        quem = _espectador(connection, campanha_id, acesso, user.id)
        participante = _participante_do_token(connection, campanha_id, token)
        if not quem.gestor:
            if not mapa.e_dono(token, participante, quem):
                raise HTTPException(status_code=403, detail="este token nao e seu")
            if not _camadas_visiveis(token["estrutura"], False, quem.permissoes_mesa).get(token["camada"], False):
                raise HTTPException(status_code=404, detail="token nao encontrado")
        personagem_id = mapa.personagem_do_token(token, participante)
        if not personagem_id:
            raise HTTPException(status_code=422, detail="so o token de um personagem tem recursos para mexer por aqui")

        # Mesma ordem de trava da Sessão: participante primeiro, ficha depois.
        linha_participante = None
        if participante:
            linha_participante = connection.execute(
                """
                SELECT id, sessao_id, vida_atual, vida_maxima, vida_temporaria,
                       mana_atual, mana_maxima, estamina_atual, estamina_maxima
                FROM sessao_participantes WHERE id=%s FOR UPDATE
                """,
                (participante["id"],),
            ).fetchone()
        ficha_linha = connection.execute(
            "SELECT ficha FROM personagens WHERE id=%s AND campanha_id=%s AND status='ativo' FOR UPDATE",
            (personagem_id, campanha_id),
        ).fetchone()
        if not ficha_linha:
            raise HTTPException(status_code=404, detail="personagem nao encontrado")
        ficha = ficha_linha["ficha"] if isinstance(ficha_linha["ficha"], dict) else {}
        status_ficha = ficha.get("status") if isinstance(ficha.get("status"), dict) else {}

        if payload.tipo == "sanidade":
            sanidade = mapa.sanidade_da_ficha(ficha)
            atual, maximo = sanidade if sanidade else (0, 0)
            temporario = 0
        else:
            recursos = _session_resources(ficha)
            fonte = linha_participante if linha_participante else recursos
            atual = fonte.get(f"{payload.tipo}_atual")
            maximo = fonte.get(f"{payload.tipo}_maxima")
            temporario = (
                int((linha_participante["vida_temporaria"] if linha_participante else status_ficha.get("vidaTemporaria")) or 0)
                if payload.tipo == "vida" else 0
            )
            if atual is None and maximo is not None:
                atual = maximo
        try:
            if atual is None or maximo is None:
                raise recursos_token.ErroRecurso("este personagem nao tem esse recurso")
            novo_atual, novo_temp = recursos_token.aplicar(
                payload.tipo, int(atual), int(maximo), temporario, delta=payload.delta, novo=payload.atual,
            )
        except recursos_token.ErroRecurso as erro:
            raise HTTPException(status_code=422, detail=str(erro)) from None

        versao_sessao = None
        if linha_participante and payload.tipo != "sanidade":
            if payload.tipo == "vida":
                connection.execute(
                    "UPDATE sessao_participantes SET vida_atual=%s, vida_temporaria=%s, atualizado_em=CURRENT_TIMESTAMP WHERE id=%s",
                    (novo_atual, novo_temp, linha_participante["id"]),
                )
            else:
                connection.execute(
                    f"UPDATE sessao_participantes SET {payload.tipo}_atual=%s, atualizado_em=CURRENT_TIMESTAMP WHERE id=%s",
                    (novo_atual, linha_participante["id"]),
                )
            registrar_minimos(connection, linha_participante["sessao_id"])
            versao_sessao = _tocar_sessao(connection, linha_participante["sessao_id"])
        campos_status, campos_recursos = recursos_token.campos_da_ficha(payload.tipo, novo_atual, novo_temp)
        versao_ficha = int(connection.execute(
            """
            UPDATE personagens
            SET ficha=jsonb_set(
                    jsonb_set(ficha, '{status}', COALESCE(ficha->'status', '{}'::jsonb) || %s, true),
                    '{recursos}', COALESCE(ficha->'recursos', '{}'::jsonb) || %s, true
                ),
                versao=versao+1,
                atualizado_em=CURRENT_TIMESTAMP
            WHERE id=%s AND status='ativo'
            RETURNING versao
            """,
            (Jsonb(campos_status), Jsonb(campos_recursos), personagem_id),
        ).fetchone()["versao"])
        versao = _tocar(connection, token["cena_id"])
        resposta = _montar(connection, campanha_id, acesso, user, token["cena_id"] if quem.gestor else None)
    _avisar(campanha_id, versao)
    if versao_sessao is not None:
        live_session.publicar(campanha_id, "participante_atualizado", versao_sessao)
    # A ficha aberta (do dono, do Mestre) busca a versão nova em vez de brigar com o próprio autosave.
    _avisar_fichas_alteradas(campanha_id, [{"personagem_id": personagem_id, "versao": versao_ficha}])
    return resposta


def _personagem_do_dono(connection, campanha_id: UUID, user: AuthenticatedUser, personagem_id: UUID):
    """O personagem ativo da campanha, para o dono ou para quem comanda a mesa."""
    acesso = campaign_access(connection, campanha_id, user.id)
    personagem = connection.execute(
        "SELECT id, dono_usuario_id, md5(ficha->>'foto') AS foto_hash, (ficha->>'foto') IS NOT NULL AS tem_foto "
        "FROM personagens WHERE id=%s AND campanha_id=%s AND status='ativo'",
        (personagem_id, campanha_id),
    ).fetchone()
    if not personagem:
        raise HTTPException(status_code=404, detail="personagem nao encontrado")
    if not acesso.manages_content and personagem["dono_usuario_id"] != user.id:
        raise HTTPException(status_code=403, detail="este personagem nao e seu")
    return personagem


def _lista_de_artes(connection, personagem) -> dict:
    """As artes do personagem sem as imagens (cada uma tem a sua rota) e qual está no token."""
    artes = connection.execute(
        "SELECT id, nome FROM personagem_artes WHERE personagem_id=%s ORDER BY criado_em, id", (personagem["id"],),
    ).fetchall()
    ativa = connection.execute("SELECT arte_id FROM personagem_token WHERE personagem_id=%s", (personagem["id"],)).fetchone()
    return {
        "artes": [{"id": str(a["id"]), "nome": a["nome"]} for a in artes],
        "ativa": str(ativa["arte_id"]) if ativa and ativa["arte_id"] else None,
        "tem_foto_ficha": bool(personagem["tem_foto"]),
        "versao_foto_ficha": (personagem["foto_hash"] or "")[:10],
        "maximo": artes_token.MAX_ARTES,
    }


@router.get("/{campanha_id}/personagens/{personagem_id}/artes")
def listar_artes_do_personagem(
    campanha_id: UUID,
    personagem_id: UUID,
    user: AuthenticatedUser = Depends(get_current_user),
    database: Database = Depends(get_database),
):
    """As artes extras do token do personagem (a foto da ficha é a padrão). Dono ou Mestre."""
    with database.connection() as connection:
        personagem = _personagem_do_dono(connection, campanha_id, user, personagem_id)
        return _lista_de_artes(connection, personagem)


@router.get("/{campanha_id}/personagens/{personagem_id}/artes/{arte_id}/imagem")
def imagem_da_arte(
    campanha_id: UUID,
    personagem_id: UUID,
    arte_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
    database: Database = Depends(get_database),
):
    """A imagem de uma arte; `ficha` é a foto da ficha. Dono ou Mestre."""
    with database.connection() as connection:
        personagem = _personagem_do_dono(connection, campanha_id, user, personagem_id)
        if arte_id == "ficha":
            achado = _foto_da_ficha(connection, personagem["id"])
            cache = "private, no-cache"
        else:
            try:
                alvo = UUID(arte_id)
            except ValueError:
                raise HTTPException(status_code=404, detail="arte nao encontrada") from None
            linha = connection.execute(
                "SELECT imagem FROM personagem_artes WHERE id=%s AND personagem_id=%s", (alvo, personagem["id"]),
            ).fetchone()
            achado = artes_token.decodificar(linha["imagem"] if linha else None)
            cache = "private, max-age=31536000, immutable"
    if not achado:
        raise HTTPException(status_code=404, detail="arte nao encontrada")
    mime, dados = achado
    return Response(content=dados, media_type=mime, headers={"Cache-Control": cache})


@router.post("/{campanha_id}/personagens/{personagem_id}/artes", status_code=status.HTTP_201_CREATED)
def criar_arte_do_personagem(
    campanha_id: UUID,
    personagem_id: UUID,
    payload: ArteInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    """Guarda uma arte extra para o token do personagem."""
    try:
        imagem = artes_token.conferir_imagem(payload.imagem)
    except artes_token.ErroArte as erro:
        raise HTTPException(status_code=422, detail=str(erro)) from None
    with database.connection() as connection:
        personagem = _personagem_do_dono(connection, campanha_id, user, personagem_id)
        # Trava a linha do personagem: dois envios ao mesmo tempo não passam do limite.
        connection.execute("SELECT 1 FROM personagens WHERE id=%s FOR UPDATE", (personagem["id"],))
        total = int(connection.execute(
            "SELECT COUNT(*) AS n FROM personagem_artes WHERE personagem_id=%s", (personagem["id"],),
        ).fetchone()["n"])
        if total >= artes_token.MAX_ARTES:
            raise HTTPException(status_code=409, detail=f"limite de {artes_token.MAX_ARTES} artes por personagem")
        connection.execute(
            "INSERT INTO personagem_artes (id, personagem_id, nome, imagem) VALUES (%s, %s, %s, %s)",
            (uuid4(), personagem["id"], artes_token.nome_da_arte(payload.nome, total + 1), imagem),
        )
        resposta = _lista_de_artes(connection, personagem)
    return resposta


@router.delete("/{campanha_id}/personagens/{personagem_id}/artes/{arte_id}")
def apagar_arte_do_personagem(
    campanha_id: UUID,
    personagem_id: UUID,
    arte_id: UUID,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    """Apaga uma arte; se era a do token, o token volta à foto da ficha."""
    with database.connection() as connection:
        personagem = _personagem_do_dono(connection, campanha_id, user, personagem_id)
        era_a_ativa = connection.execute(
            "SELECT 1 FROM personagem_token WHERE personagem_id=%s AND arte_id=%s", (personagem["id"], arte_id),
        ).fetchone()
        apagada = connection.execute(
            "DELETE FROM personagem_artes WHERE id=%s AND personagem_id=%s RETURNING id", (arte_id, personagem["id"]),
        ).fetchone()
        if not apagada:
            raise HTTPException(status_code=404, detail="arte nao encontrada")
        resposta = _lista_de_artes(connection, personagem)
    if era_a_ativa:
        _avisar(campanha_id, int(time.time()))
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
            "SELECT moldura, enquadramento, arte_id FROM personagem_token WHERE personagem_id=%s FOR UPDATE",
            (personagem_id,),
        ).fetchone()
        moldura = atual["moldura"] if atual else None
        enquadramento = atual["enquadramento"] if atual and isinstance(atual["enquadramento"], dict) else {}
        arte_id = atual["arte_id"] if atual else None
        if payload.sem_arte:
            arte_id = None
        elif payload.arte_id is not None:
            existe = connection.execute(
                "SELECT 1 FROM personagem_artes WHERE id=%s AND personagem_id=%s", (payload.arte_id, personagem_id),
            ).fetchone()
            if not existe:
                raise HTTPException(status_code=404, detail="arte nao encontrada")
            arte_id = payload.arte_id
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
            INSERT INTO personagem_token (personagem_id, moldura, enquadramento, arte_id) VALUES (%s, %s, %s, %s)
            ON CONFLICT (personagem_id) DO UPDATE
            SET moldura = EXCLUDED.moldura, enquadramento = EXCLUDED.enquadramento, arte_id = EXCLUDED.arte_id,
                atualizado_em = CURRENT_TIMESTAMP
            """,
            (personagem_id, moldura, Jsonb(enquadramento), arte_id),
        )
    _avisar(campanha_id, int(time.time()))
    return {
        "moldura": moldura,
        "enquadramento": mapa.normalizar_enquadramento({}, enquadramento),
        "arte_id": str(arte_id) if arte_id else None,
    }


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
            if not _camadas_visiveis(token["estrutura"], False, quem.permissoes_mesa).get(token["camada"], False):
                raise HTTPException(status_code=404, detail="token nao encontrado")
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
        barrado = False
        if not quem.gestor:
            # Parede, janela e porta fechada seguram o jogador; o Mestre atravessa.
            barram, vaos = paredes.barreiras(cena["estrutura"])
            x, y, barrado = paredes.caminho(float(token["x"]), float(token["y"]), x, y, barram, vaos, float(casa))
        achado = mapa.portal_atingido(_portais(cena), x, y, casa, gestor=quem.gestor, aceito=payload.atravessar)
        resposta = None
        if achado and achado[0].get("cena"):
            # Portal entre cenas: o token vai gravado para a outra cena.
            portal, (bx, by) = achado
            levado = _levar_para_cena(connection, campanha_id, token_id, UUID(portal["cena"]), float(bx), float(by))
            if not levado:
                raise HTTPException(status_code=409, detail="a cena do portal nao existe mais")
            travessia = {"portal": portal["id"], "fluxo": portal["fluxo"], "de": [payload.x, payload.y], "cena": portal["cena"]}
            if quem.gestor:
                travessia["cena_nome"] = levado["cena_nome"]
            resposta = {"x": float(bx), "y": float(by), "versao": levado["versao"], "travessia": travessia, "barrado": barrado}
        elif achado:
            portal, (x, y) = achado
            travessia = {"portal": portal["id"], "fluxo": portal["fluxo"], "de": [payload.x, payload.y]}
        if resposta is None:
            connection.execute("UPDATE mapa_tokens SET x=%s, y=%s, atualizado_em=CURRENT_TIMESTAMP WHERE id=%s", (x, y, token_id))
            versao = _tocar(connection, token["cena_id"])
            resposta = {"x": x, "y": y, "versao": versao, "travessia": travessia, "barrado": barrado}
    _avisar(campanha_id, resposta["versao"])
    return resposta


def _levar_para_cena(connection, campanha_id: UUID, token_id: UUID, cena_destino: UUID, x: float, y: float) -> dict | None:
    """Portal entre cenas: o token passa para a outra cena, na saída do portal. Se o mesmo
    personagem (ou participante) já tem token lá, aquele vai para a saída e este some: o
    personagem nunca fica duas vezes na mesma cena. None se a cena não existe mais."""
    destino = connection.execute(
        "SELECT id, nome, largura, altura FROM mapa_cenas WHERE id=%s AND campanha_id=%s FOR UPDATE",
        (cena_destino, campanha_id),
    ).fetchone()
    token = connection.execute(
        """
        SELECT t.id, t.cena_id, t.personagem_id, t.participante_id, COALESCE(t.nome, p.nome) AS nome
        FROM mapa_tokens t JOIN mapa_cenas c ON c.id = t.cena_id
        LEFT JOIN personagens p ON p.id = t.personagem_id
        WHERE t.id=%s AND c.campanha_id=%s FOR UPDATE OF t
        """,
        (token_id, campanha_id),
    ).fetchone()
    if not destino or not token or token["cena_id"] == destino["id"]:
        return None
    x, y = mapa.limitar_posicao(x, y, int(destino["largura"]), int(destino["altura"]))
    gemeo = connection.execute(
        """
        SELECT id FROM mapa_tokens
        WHERE cena_id=%s AND id<>%s
          AND ((personagem_id IS NOT NULL AND personagem_id=%s) OR (participante_id IS NOT NULL AND participante_id=%s))
        LIMIT 1
        """,
        (destino["id"], token["id"], token["personagem_id"], token["participante_id"]),
    ).fetchone()
    if gemeo:
        connection.execute("UPDATE mapa_tokens SET x=%s, y=%s, atualizado_em=CURRENT_TIMESTAMP WHERE id=%s", (x, y, gemeo["id"]))
        connection.execute("DELETE FROM mapa_tokens WHERE id=%s", (token["id"],))
    else:
        connection.execute(
            "UPDATE mapa_tokens SET cena_id=%s, x=%s, y=%s, atualizado_em=CURRENT_TIMESTAMP WHERE id=%s",
            (destino["id"], x, y, token["id"]),
        )
    _tocar(connection, token["cena_id"])
    versao = _tocar(connection, destino["id"])
    return {"nome": token["nome"] or "Um token", "cena_nome": destino["nome"], "versao": versao}


@router.put("/{campanha_id}/cenas/{cena_id}/portas")
def mudar_porta(
    campanha_id: UUID,
    cena_id: UUID,
    payload: PortaInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    """Abrir, fechar, trancar ou revelar uma porta do mapa montado. O jogador abre e fecha a
    porta destrancada ao lado de um token dele, na cena ao vivo; o Mestre mexe em qualquer uma."""
    with database.connection() as connection:
        acesso = campaign_access(connection, campanha_id, user.id)
        quem = _espectador(connection, campanha_id, acesso, user.id)
        cena = _cena(connection, campanha_id, cena_id, travar=True)
        aberturas = construtor.ler_aberturas(cena["estrutura"])
        perto, a_vista = False, True
        if not quem.gestor:
            sessao = _sessao_do_momento(connection, campanha_id)
            if not cena["ativa"] or not (sessao and sessao["status"] == "aberta"):
                raise HTTPException(status_code=403, detail="o mapa so abre com a sessao ao vivo")
            achada = next((a for a in aberturas if a.get("id") == payload.id), None)
            if achada is not None:
                estado_nevoa = nevoa.ler(cena["nevoa"])
                if estado_nevoa["visao_pelas_paredes"]:
                    visao_atual = _visao_jogador(connection, campanha_id, cena, quem)
                    a_vista = bool(visao_atual and _abertura_a_vista(achada, visao_atual))
                elif estado_nevoa["ligada"]:
                    meio_x = (achada["x1"] + achada["x2"]) / 2
                    meio_y = (achada["y1"] + achada["y2"]) / 2
                    a_vista = nevoa.Nevoa(estado_nevoa["formas"]).revelado(meio_x, meio_y)
                casa = mapa.normalizar_grade({}, cena["grade"] if isinstance(cena["grade"], dict) else {})["tamanho"]
                tokens = _tokens(connection, cena_id)
                ligacoes = _ligacoes(tokens, _participantes(connection, campanha_id))
                alcance = paredes.ALCANCE_PORTA_CASAS * float(casa)
                perto = any(
                    mapa.e_dono(token, ligacoes[str(token["id"])], quem)
                    and paredes.distancia_da_porta(achada, float(token["x"]), float(token["y"])) <= alcance
                    for token in tokens
                )
        try:
            novas = paredes.mudar_porta(
                aberturas, payload.id, estado=payload.estado, revelar=payload.revelar,
                gestor=quem.gestor, perto=perto, a_vista=a_vista,
            )
        except paredes.ErroPorta as erro:
            raise HTTPException(status_code=erro.codigo, detail=erro.mensagem) from None
        estrutura = dict(cena["estrutura"]) if isinstance(cena["estrutura"], dict) else {}
        estrutura["aberturas"] = novas
        connection.execute("UPDATE mapa_cenas SET estrutura=%s WHERE id=%s", (Jsonb(estrutura), cena_id))
        versao = _tocar(connection, cena_id)
        resposta = _montar(connection, campanha_id, acesso, user, cena_id if quem.gestor else None)
    # A porta muda o que barra o caminho: o hub recarrega as paredes junto com a mesa.
    _avisar(campanha_id, versao)
    return resposta


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
    return artes_token.decodificar(linha["foto"] if linha else None)


def _arte_do_token(connection, personagem_id) -> tuple[str, bytes] | None:
    """A arte extra que o dono escolheu para o token, ou None (vale a foto da ficha)."""
    linha = connection.execute(
        """
        SELECT a.imagem FROM personagem_token t
        JOIN personagem_artes a ON a.id = t.arte_id AND a.personagem_id = t.personagem_id
        WHERE t.personagem_id=%s
        """,
        (personagem_id,),
    ).fetchone()
    return artes_token.decodificar(linha["imagem"] if linha else None)


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
            if not _camadas_visiveis(token["estrutura"], False, quem.permissoes_mesa).get(token["camada"], False):
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
                achado = _arte_do_token(connection, personagem) or _foto_da_ficha(connection, personagem)
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
        camadas_visiveis = mapa.camadas_jogadores(cena["estrutura"])
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
        visiveis_por_usuario: dict[str, frozenset[str]] = {}
        if estado_nevoa["visao_pelas_paredes"]:
            membros = connection.execute(
                "SELECT usuario_id, papel FROM membros_campanha WHERE campanha_id=%s AND status='ativo' AND papel NOT IN ('mestre', 'assistente')",
                (campanha_id,),
            ).fetchall()
            for membro in membros:
                user_id = UUID(str(membro["usuario_id"]))
                acesso_pessoal = SimpleNamespace(manages_content=False, role=membro["papel"])
                quem = _espectador(connection, campanha_id, acesso_pessoal, user_id)
                recorte = _visao_jogador(connection, campanha_id, cena, quem)
                visiveis_por_usuario[str(user_id)] = frozenset(
                    recorte["tokens_visiveis"] if recorte is not None
                    else (token["id"] for token in _visao_tokens(connection, campanha_id, cena, quem))
                )
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
            camada_visivel_jogadores=camadas_visiveis.get(token.get("camada") or "personagens", False),
            camada=token.get("camada") or "personagens",
            x=float(token["x"]),
            y=float(token["y"]),
        )
    barram, vaos = paredes.barreiras(cena["estrutura"])
    return tempo_real.Regras(
        cena_id=str(cena["id"]), livre=bool(cena["livre"]),
        largura=int(cena["largura"]), altura=int(cena["altura"]), tokens=regras,
        carregadas_em=time.monotonic(), nevoa=cobertura, portais=portais, casa=float(casa),
        barram=barram, vaos=vaos,
        visao_pelas_paredes=estado_nevoa["visao_pelas_paredes"],
        visiveis_por_usuario=visiveis_por_usuario,
    )


def _gravar_posicao_sync(database: Database, campanha_id: UUID, token_id: str, x: float, y: float, cena: str | None = None):
    try:
        token_uuid = UUID(token_id)
    except ValueError:
        return False if cena is None else None
    if cena is not None:
        # Portal entre cenas: o token sai da cena ativa e vai para a saída na outra.
        try:
            cena_uuid = UUID(cena)
        except ValueError:
            return None
        with database.connection() as connection:
            return _levar_para_cena(connection, campanha_id, token_uuid, cena_uuid, x, y)
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
    """Quem está entrando, seu recorte, identidade e permissões pessoais."""
    usuario = get_current_user(conexao_http, database)
    with database.connection() as connection:
        acesso = campaign_access(connection, campanha_id, usuario.id)
        if not acesso.manages_content:
            sessao = _sessao_do_momento(connection, campanha_id)
            if not (sessao and sessao["status"] == "aberta"):
                raise HTTPException(status_code=403, detail="o mapa so abre com a sessao ao vivo")
        quem = _espectador(connection, campanha_id, acesso, usuario.id)
        identidade = connection.execute(
            """
            SELECT nome_mesa, cor_mesa
            FROM membros_campanha
            WHERE campanha_id=%s AND usuario_id=%s AND status='ativo'
            """,
            (campanha_id, usuario.id),
        ).fetchone()
        if identidade is None:
            # O Criador entra sem ser membro: o nome e a cor que ele escolheu ficam numa tabela à parte.
            identidade = connection.execute(
                "SELECT nome_mesa, cor_mesa FROM mesa_identidade_criador WHERE campanha_id=%s AND usuario_id=%s",
                (campanha_id, usuario.id),
            ).fetchone()
    nome = (identidade["nome_mesa"] if identidade else None) or usuario.nome_exibicao
    cor = identidade["cor_mesa"] if identidade else None
    return usuario, quem, nome, cor, acesso.role


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

    async def gravar(token_id: str, x: float, y: float, cena: str | None = None):
        return await run_in_threadpool(_gravar_posicao_sync, database, campanha_id, token_id, x, y, cena)

    return carregar, gravar


@router.websocket("/{campanha_id}/ws")
async def ao_vivo_ws(websocket: WebSocket, campanha_id: UUID):
    database: Database = websocket.app.state.database
    if not _origem_permitida(websocket.headers, websocket.app.state.settings):
        await websocket.close(code=4403)
        return
    try:
        usuario, quem, nome, cor, papel = await run_in_threadpool(_entrada_sync, database, websocket, campanha_id)
    except HTTPException as erro:
        await websocket.close(code=4000 + min(erro.status_code, 999))
        return
    await websocket.accept()
    conexao = tempo_real.Conexao(
        usuario_id=str(usuario.id), nome=nome, gestor=quem.gestor, personagens=quem.personagens,
        permissoes_mesa=quem.permissoes_mesa, cor_personalizada=cor, papel=papel,
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
    usuario, quem, nome, cor, papel = await run_in_threadpool(_entrada_sync, database, request, campanha_id)
    conexao = tempo_real.Conexao(
        usuario_id=str(usuario.id), nome=nome, gestor=quem.gestor, personagens=quem.personagens,
        permissoes_mesa=quem.permissoes_mesa, cor_personalizada=cor, papel=papel,
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
