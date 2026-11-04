"""Documentos compartilhados e trilhas sincronizadas da mesa ao vivo."""

from __future__ import annotations

import time
from datetime import datetime, timezone
from urllib.parse import unquote
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel, Field

from core import tempo_real
from core.database import Database
from core.dependencies import AuthenticatedUser, campaign_access, get_current_user, get_database, require_csrf

router = APIRouter(prefix="/mapa", tags=["mapa-ao-vivo"])

MAX_AUDIO_BYTES = 20 * 1024 * 1024
MAX_AUDIO_MS = 4 * 60 * 60 * 1000


class CompartilharDocumento(BaseModel):
    #: None mostra a todos os jogadores conectados; uma lista mira os personagens escolhidos.
    personagens: list[UUID] | None = Field(default=None, max_length=40)


class EstadoTrilhaInput(BaseModel):
    faixa_id: UUID | None = None
    reproduzindo: bool = False
    posicao_ms: int = Field(default=0, ge=0, le=MAX_AUDIO_MS)


def _acesso_de_mesa(connection, campanha_id: UUID, user_id: UUID):
    acesso = campaign_access(connection, campanha_id, user_id)
    if not acesso.manages_content:
        sessao = connection.execute(
            "SELECT id FROM sessoes_mesa WHERE campanha_id=%s AND status='aberta'",
            (campanha_id,),
        ).fetchone()
        if not sessao:
            raise HTTPException(status_code=403, detail="o recurso so abre com a sessao ao vivo")
    return acesso


def _estado_trilha(connection, campanha_id: UUID) -> dict:
    linha = connection.execute(
        """
        SELECT e.faixa_id, e.reproduzindo, e.posicao_ms, e.atualizado_em,
               f.nome, f.mime
        FROM mapa_trilha_estado e
        LEFT JOIN mapa_trilhas f ON f.id=e.faixa_id AND f.campanha_id=e.campanha_id
        WHERE e.campanha_id=%s
        """,
        (campanha_id,),
    ).fetchone()
    servidor_ms = int(time.time() * 1000)
    if not linha or not linha["faixa_id"]:
        return {"faixa_id": None, "nome": None, "mime": None, "reproduzindo": False, "posicao_ms": 0, "servidor_ms": servidor_ms}
    posicao = max(0, int(linha["posicao_ms"] or 0))
    if linha["reproduzindo"] and linha["atualizado_em"]:
        atualizado = linha["atualizado_em"]
        if atualizado.tzinfo is None:
            atualizado = atualizado.replace(tzinfo=timezone.utc)
        posicao += max(0, int((datetime.now(timezone.utc) - atualizado).total_seconds() * 1000))
    return {
        "faixa_id": str(linha["faixa_id"]), "nome": linha["nome"], "mime": linha["mime"],
        "reproduzindo": bool(linha["reproduzindo"]), "posicao_ms": min(posicao, MAX_AUDIO_MS),
        "servidor_ms": servidor_ms,
    }


@router.post("/{campanha_id}/documentos/{documento_id}/mostrar")
def mostrar_documento(
    campanha_id: UUID,
    documento_id: UUID,
    payload: CompartilharDocumento,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    """Envia um documento salvo para todos ou para os donos dos personagens indicados."""
    with database.connection() as connection:
        acesso = campaign_access(connection, campanha_id, user.id)
        if not acesso.manages_content:
            raise HTTPException(status_code=403, detail="permissao de mestre necessaria")
        documento = connection.execute(
            "SELECT id, modelo, titulo, campos FROM campanha_documentos WHERE id=%s AND campanha_id=%s",
            (documento_id, campanha_id),
        ).fetchone()
        if not documento:
            raise HTTPException(status_code=404, detail="documento nao encontrado")
        personagens = payload.personagens
        if personagens is not None:
            if not personagens:
                raise HTTPException(status_code=422, detail="escolha ao menos um personagem ou envie para todos")
            validos = {
                linha["personagem_id"]
                for linha in connection.execute(
                    """
                    SELECT DISTINCT sp.personagem_id
                    FROM sessao_participantes sp
                    JOIN sessoes_mesa s ON s.id=sp.sessao_id
                    WHERE s.campanha_id=%s AND s.status='aberta'
                      AND sp.tipo='jogador' AND sp.personagem_id IS NOT NULL
                      AND sp.personagem_id=ANY(%s::uuid[])
                    """,
                    (campanha_id, personagens),
                ).fetchall()
            }
            if validos != set(personagens):
                raise HTTPException(status_code=422, detail="um personagem escolhido nao esta na sessao")
        mensagem = {
            "t": "documento",
            "documento": {
                "id": str(documento["id"]), "modelo": documento["modelo"],
                "titulo": documento["titulo"], "campos": documento["campos"] or {},
            },
        }
    tempo_real.anunciar_para(campanha_id, mensagem, personagens)
    return {"ok": True}


@router.get("/{campanha_id}/trilhas")
def listar_trilhas(
    campanha_id: UUID,
    user: AuthenticatedUser = Depends(get_current_user),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        acesso = _acesso_de_mesa(connection, campanha_id, user.id)
        estado = _estado_trilha(connection, campanha_id)
        faixas = []
        if acesso.manages_content:
            faixas = [
                {"id": str(linha["id"]), "nome": linha["nome"], "mime": linha["mime"], "bytes": int(linha["bytes"])}
                for linha in connection.execute(
                    "SELECT id, nome, mime, bytes FROM mapa_trilhas WHERE campanha_id=%s ORDER BY criado_em DESC, nome",
                    (campanha_id,),
                ).fetchall()
            ]
    return {"faixas": faixas, "estado": estado, "gestor": acesso.manages_content}


@router.post("/{campanha_id}/trilhas", status_code=status.HTTP_201_CREATED)
async def enviar_trilha(
    campanha_id: UUID,
    request: Request,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    """Recebe MP3, Ogg, WAV ou WebM de áudio, até 20 MB, pelo corpo binário."""
    with database.connection() as connection:
        acesso = campaign_access(connection, campanha_id, user.id)
        if not acesso.manages_content:
            raise HTTPException(status_code=403, detail="permissao de mestre necessaria")
    mime = (request.headers.get("content-type") or "").split(";", 1)[0].strip().lower()
    mime = {"audio/x-wav": "audio/wav", "audio/mp3": "audio/mpeg"}.get(mime, mime)
    assinaturas = {
        "audio/mpeg": lambda b: b.startswith(b"ID3") or (len(b) > 1 and b[0] == 0xFF and b[1] & 0xE0 == 0xE0),
        "audio/ogg": lambda b: b.startswith(b"OggS"),
        "audio/wav": lambda b: len(b) >= 12 and b.startswith(b"RIFF") and b[8:12] == b"WAVE",
        "audio/webm": lambda b: b.startswith(b"\x1a\x45\xdf\xa3"),
    }
    if mime not in assinaturas:
        raise HTTPException(status_code=415, detail="use um arquivo MP3, Ogg, WAV ou WebM de áudio")
    tamanho_declarado = request.headers.get("content-length")
    if tamanho_declarado and tamanho_declarado.isdigit() and int(tamanho_declarado) > MAX_AUDIO_BYTES:
        raise HTTPException(status_code=413, detail="a trilha pode ter no maximo 20 MB")
    blocos, total = [], 0
    async for bloco in request.stream():
        total += len(bloco)
        if total > MAX_AUDIO_BYTES:
            raise HTTPException(status_code=413, detail="a trilha pode ter no maximo 20 MB")
        blocos.append(bloco)
    dados = b"".join(blocos)
    if len(dados) < 4 or not assinaturas[mime](dados[:16]):
        raise HTTPException(status_code=415, detail="o arquivo nao corresponde ao formato de audio informado")
    nome = unquote(request.headers.get("x-trilha-nome", "")).replace("\\", "/").split("/")[-1]
    nome = " ".join(nome.replace("\x00", "").split())[:80].strip() or "Trilha da cena"
    with database.connection() as connection:
        linha = connection.execute(
            """
            INSERT INTO mapa_trilhas (id, campanha_id, nome, mime, bytes, conteudo, criado_por)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING id, nome, mime, bytes
            """,
            (uuid4(), campanha_id, nome, mime, len(dados), dados, user.id),
        ).fetchone()
    return {"id": str(linha["id"]), "nome": linha["nome"], "mime": linha["mime"], "bytes": int(linha["bytes"])}


@router.put("/{campanha_id}/trilha")
def definir_trilha(
    campanha_id: UUID,
    payload: EstadoTrilhaInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        acesso = campaign_access(connection, campanha_id, user.id)
        if not acesso.manages_content:
            raise HTTPException(status_code=403, detail="permissao de mestre necessaria")
        if payload.faixa_id is not None:
            existe = connection.execute(
                "SELECT id FROM mapa_trilhas WHERE id=%s AND campanha_id=%s", (payload.faixa_id, campanha_id),
            ).fetchone()
            if not existe:
                raise HTTPException(status_code=404, detail="trilha nao encontrada")
        reproduzindo = bool(payload.reproduzindo and payload.faixa_id)
        connection.execute(
            """
            INSERT INTO mapa_trilha_estado (campanha_id, faixa_id, reproduzindo, posicao_ms, atualizado_em)
            VALUES (%s, %s, %s, %s, CURRENT_TIMESTAMP)
            ON CONFLICT (campanha_id) DO UPDATE SET faixa_id=EXCLUDED.faixa_id,
              reproduzindo=EXCLUDED.reproduzindo, posicao_ms=EXCLUDED.posicao_ms,
              atualizado_em=CURRENT_TIMESTAMP
            """,
            (campanha_id, payload.faixa_id, reproduzindo, payload.posicao_ms),
        )
        estado = _estado_trilha(connection, campanha_id)
    tempo_real.anunciar(campanha_id, {"t": "trilha", "estado": estado})
    return estado


@router.delete("/{campanha_id}/trilhas/{faixa_id}")
def apagar_trilha(
    campanha_id: UUID,
    faixa_id: UUID,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        acesso = campaign_access(connection, campanha_id, user.id)
        if not acesso.manages_content:
            raise HTTPException(status_code=403, detail="permissao de mestre necessaria")
        existe = connection.execute(
            "SELECT id FROM mapa_trilhas WHERE id=%s AND campanha_id=%s", (faixa_id, campanha_id),
        ).fetchone()
        if not existe:
            raise HTTPException(status_code=404, detail="trilha nao encontrada")
        connection.execute(
            """
            UPDATE mapa_trilha_estado SET faixa_id=NULL, reproduzindo=FALSE, posicao_ms=0,
              atualizado_em=CURRENT_TIMESTAMP
            WHERE campanha_id=%s AND faixa_id=%s
            """,
            (campanha_id, faixa_id),
        )
        connection.execute("DELETE FROM mapa_trilhas WHERE id=%s AND campanha_id=%s", (faixa_id, campanha_id))
        estado = _estado_trilha(connection, campanha_id)
    tempo_real.anunciar(campanha_id, {"t": "trilha", "estado": estado})
    return {"ok": True}


@router.get("/{campanha_id}/trilhas/{faixa_id}/audio")
def obter_audio(
    campanha_id: UUID,
    faixa_id: UUID,
    request: Request,
    user: AuthenticatedUser = Depends(get_current_user),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        acesso = _acesso_de_mesa(connection, campanha_id, user.id)
        if not acesso.manages_content:
            estado = connection.execute(
                "SELECT faixa_id FROM mapa_trilha_estado WHERE campanha_id=%s", (campanha_id,),
            ).fetchone()
            if not estado or estado["faixa_id"] != faixa_id:
                raise HTTPException(status_code=404, detail="trilha nao encontrada")
        faixa = connection.execute(
            "SELECT mime, bytes, conteudo FROM mapa_trilhas WHERE id=%s AND campanha_id=%s",
            (faixa_id, campanha_id),
        ).fetchone()
    if not faixa:
        raise HTTPException(status_code=404, detail="trilha nao encontrada")
    dados = bytes(faixa["conteudo"])
    inicio, fim, status_http = 0, len(dados) - 1, 200
    intervalo = request.headers.get("range")
    if intervalo:
        if not intervalo.startswith("bytes=") or "," in intervalo:
            return Response(status_code=416, headers={"Content-Range": f"bytes */{len(dados)}"})
        partes = intervalo[6:].split("-", 1)
        try:
            if not partes[0]:
                sufixo = int(partes[1])
                inicio = max(0, len(dados) - sufixo)
                fim = len(dados) - 1
            else:
                inicio = int(partes[0])
                fim = min(len(dados) - 1, int(partes[1])) if partes[1] else len(dados) - 1
        except ValueError:
            return Response(status_code=416, headers={"Content-Range": f"bytes */{len(dados)}"})
        if inicio < 0 or inicio > fim or inicio >= len(dados):
            return Response(status_code=416, headers={"Content-Range": f"bytes */{len(dados)}"})
        status_http = 206
    cabecalhos = {
        "Accept-Ranges": "bytes", "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
    }
    if status_http == 206:
        cabecalhos["Content-Range"] = f"bytes {inicio}-{fim}/{len(dados)}"
    cabecalhos["Content-Length"] = str(fim - inicio + 1)
    return Response(content=dados[inicio:fim + 1], status_code=status_http, media_type=faixa["mime"], headers=cabecalhos)
