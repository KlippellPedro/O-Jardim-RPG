"""Mesa ao vivo: votação, relógios, cronômetros, bilhetes e replay.

Todo o estado é um documento por campanha, alterado por ações validadas em
`core/mesa.py`. Cada ação sobe a versão e avisa a campanha pelo mesmo fluxo SSE
da sessão (`tipo: "mesa"`); cada cliente refaz o GET e recebe o recorte do
próprio papel, então segredo nenhum viaja no evento.

Jogador só enxerga a mesa com a sessão ao vivo (`aberta`). Enquanto o Mestre
prepara (`preparacao`), o que ele monta continua privado.
"""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from psycopg.types.json import Jsonb
from pydantic import BaseModel, Field

from core import live_session, mesa
from core.database import Database
from core.dependencies import (
    AuthenticatedUser,
    campaign_access,
    get_current_user,
    get_database,
    require_csrf,
)
from core.mesa import Ator, Contexto, ErroMesa
from core.mesa_eventos import registrar_varios

router = APIRouter(prefix="/mesa", tags=["mesa-ao-vivo"])

LIMITE_REPLAY = 1500
DANO_MARCANTE = 30


class AcaoMesaInput(BaseModel):
    acao: str = Field(min_length=1, max_length=40)
    dados: dict = Field(default_factory=dict)


def _sessao_do_momento(connection, campanha_id: UUID):
    return connection.execute(
        """
        SELECT id, status FROM sessoes_mesa
        WHERE campanha_id=%s AND status IN ('preparacao', 'aberta')
        """,
        (campanha_id,),
    ).fetchone()


def _carregar_estado(connection, campanha_id: UUID, *, travar: bool) -> tuple[int, dict]:
    connection.execute(
        "INSERT INTO campanha_mesa (campanha_id, estado) VALUES (%s, %s) ON CONFLICT (campanha_id) DO NOTHING",
        (campanha_id, Jsonb(mesa.estado_inicial())),
    )
    linha = connection.execute(
        f"SELECT versao, estado FROM campanha_mesa WHERE campanha_id=%s{' FOR UPDATE' if travar else ''}",
        (campanha_id,),
    ).fetchone()
    estado = linha["estado"] if isinstance(linha["estado"], dict) else {}
    return int(linha["versao"]), estado


def _contexto(connection, campanha_id: UUID, acesso, user: AuthenticatedUser) -> Contexto:
    jogadores = {
        str(linha["usuario_id"]): linha["nome_exibicao"]
        for linha in connection.execute(
            """
            SELECT m.usuario_id, u.nome_exibicao
            FROM membros_campanha m JOIN usuarios u ON u.id = m.usuario_id
            WHERE m.campanha_id=%s AND m.status='ativo' AND m.papel='jogador'
            ORDER BY u.nome_exibicao
            """,
            (campanha_id,),
        ).fetchall()
    }
    return Contexto(
        ator=Ator(usuario_id=str(user.id), gestor=acesso.manages_content, nome=user.nome_exibicao),
        agora=datetime.now(timezone.utc),
        jogadores=jogadores,
    )


def _resposta(connection, campanha_id: UUID, acesso, user: AuthenticatedUser, versao: int, estado: dict) -> dict:
    sessao = _sessao_do_momento(connection, campanha_id)
    ao_vivo = bool(sessao and sessao["status"] == "aberta")
    resposta = {
        "versao": versao,
        "gestor": acesso.manages_content,
        "usuario_id": str(user.id),
        "sessao_id": str(sessao["id"]) if sessao else None,
        "sessao_status": sessao["status"] if sessao else None,
        "bloqueada": not acesso.manages_content and not ao_vivo,
        "estado": None,
        "jogadores": [],
    }
    if resposta["bloqueada"]:
        return resposta
    ctx = _contexto(connection, campanha_id, acesso, user)
    resposta["estado"] = mesa.visao(estado, ctx)
    if acesso.manages_content:
        resposta["jogadores"] = [{"usuario_id": uid, "nome": nome} for uid, nome in ctx.jogadores.items()]
    return resposta


@router.get("/{campanha_id}")
def obter_mesa(
    campanha_id: UUID,
    user: AuthenticatedUser = Depends(get_current_user),
    database: Database = Depends(get_database),
):
    """Estado da mesa no recorte do papel de quem pergunta."""
    with database.connection() as connection:
        acesso = campaign_access(connection, campanha_id, user.id)
        versao, estado = _carregar_estado(connection, campanha_id, travar=False)
        return _resposta(connection, campanha_id, acesso, user, versao, estado)


@router.post("/{campanha_id}/acoes")
def agir(
    campanha_id: UUID,
    payload: AcaoMesaInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        acesso = campaign_access(connection, campanha_id, user.id)
        sessao = _sessao_do_momento(connection, campanha_id)
        if not acesso.manages_content and not (sessao and sessao["status"] == "aberta"):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="a mesa so abre com a sessao ao vivo")
        versao, estado = _carregar_estado(connection, campanha_id, travar=True)
        ctx = _contexto(connection, campanha_id, acesso, user)
        try:
            novo, eventos = mesa.aplicar(estado, payload.acao, payload.dados, ctx)
        except ErroMesa as erro:
            raise HTTPException(status_code=erro.codigo, detail=erro.mensagem) from None
        nova_versao = versao + 1
        connection.execute(
            """
            UPDATE campanha_mesa
            SET estado=%s, versao=%s, atualizado_em=CURRENT_TIMESTAMP
            WHERE campanha_id=%s
            """,
            (Jsonb(novo), nova_versao, campanha_id),
        )
        registrar_varios(connection, campanha_id, sessao["id"] if sessao else None, eventos)
        resposta = _resposta(connection, campanha_id, acesso, user, nova_versao, novo)
    live_session.publicar(campanha_id, "mesa", nova_versao, {"acao": payload.acao})
    return resposta


# ------------------------------------------------------------------ replay

@router.get("/{campanha_id}/sessoes")
def listar_sessoes(
    campanha_id: UUID,
    user: AuthenticatedUser = Depends(get_current_user),
    database: Database = Depends(get_database),
):
    """Sessões que já rolaram (ou estão rolando), para escolher qual rever."""
    with database.connection() as connection:
        acesso = campaign_access(connection, campanha_id, user.id)
        linhas = connection.execute(
            """
            SELECT id, titulo, status, iniciada_em, encerrada_em, rodada
            FROM sessoes_mesa
            WHERE campanha_id=%s AND (%s IS TRUE OR status <> 'preparacao')
            ORDER BY iniciada_em DESC
            LIMIT 30
            """,
            (campanha_id, acesso.manages_content),
        ).fetchall()
    return {"sessoes": [dict(linha) for linha in linhas]}


def _texto_do_registro(linha: dict) -> tuple[str, str | None]:
    detalhes = linha["detalhes"] if isinstance(linha["detalhes"], dict) else {}
    autor = linha["autor_nome"] or "Alguém"
    titulo = (linha["titulo"] or "").strip() or "um teste"
    tipo = linha["tipo"]
    if tipo == "rolagem":
        total = detalhes.get("total", linha["resultado"])
        if detalhes.get("critico_natural"):
            return f"{autor} tirou 20 natural em {titulo}!", "critico"
        if detalhes.get("falha_natural"):
            return f"{autor} tirou 1 natural em {titulo}.", "falha"
        return f"{autor} rolou {titulo}: {total}.", None
    if tipo == "dano":
        return f"{autor} causou {linha['resultado']} de dano ({titulo}).", "dano"
    if tipo in ("poder", "habilidade", "magia"):
        return f"{autor} usou {titulo}.", None
    return f"{autor}: {titulo}.", None


@router.get("/{campanha_id}/replay/{sessao_id}")
def replay(
    campanha_id: UUID,
    sessao_id: UUID,
    user: AuthenticatedUser = Depends(get_current_user),
    database: Database = Depends(get_database),
):
    """Linha do tempo da sessão: eventos da mesa e rolagens, do começo ao fim.

    O Mestre vê tudo. Jogador vê os eventos públicos, as próprias rolagens e só
    os momentos marcantes dos outros (críticos, falhas e golpes grandes): o log
    completo entregaria, por exemplo, quem rolou Furtividade.
    """
    with database.connection() as connection:
        acesso = campaign_access(connection, campanha_id, user.id)
        sessao = connection.execute(
            """
            SELECT id, titulo, status, iniciada_em, encerrada_em
            FROM sessoes_mesa WHERE id=%s AND campanha_id=%s
            """,
            (sessao_id, campanha_id),
        ).fetchone()
        if not sessao or (sessao["status"] == "preparacao" and not acesso.manages_content):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="sessao nao encontrada")

        eventos = [
            {"t": linha["criado_em"], "tipo": linha["tipo"], "texto": linha["texto"], "destaque": None}
            for linha in connection.execute(
                """
                SELECT tipo, texto, criado_em FROM eventos_mesa
                WHERE sessao_id=%s AND (%s IS TRUE OR publico IS TRUE)
                ORDER BY criado_em LIMIT %s
                """,
                (sessao_id, acesso.manages_content, LIMITE_REPLAY),
            ).fetchall()
        ]
        registros = connection.execute(
            """
            SELECT tipo, titulo, resultado, detalhes, autor_nome, criado_em
            FROM registros_mesa
            WHERE sessao_id=%s
              AND (
                %s IS TRUE
                OR usuario_id=%s
                OR (tipo='rolagem' AND (detalhes->>'critico_natural'='true' OR detalhes->>'falha_natural'='true'))
                OR (tipo='dano' AND resultado >= %s)
              )
            ORDER BY criado_em LIMIT %s
            """,
            (sessao_id, acesso.manages_content, user.id, DANO_MARCANTE, LIMITE_REPLAY),
        ).fetchall()
        for linha in registros:
            texto, destaque = _texto_do_registro(linha)
            eventos.append({"t": linha["criado_em"], "tipo": linha["tipo"], "texto": texto, "destaque": destaque})

    inicio = sessao["iniciada_em"]
    fim = sessao["encerrada_em"]
    eventos.sort(key=lambda evento: evento["t"])
    eventos = eventos[:LIMITE_REPLAY]
    ultimo = eventos[-1]["t"] if eventos else inicio
    fim_efetivo = fim or ultimo
    linha_do_tempo = [
        {"t": inicio.isoformat(), "s": 0.0, "tipo": "sessao", "texto": "A sessão começou.", "destaque": None},
        *[
            {
                "t": evento["t"].isoformat(),
                "s": max(0.0, round((evento["t"] - inicio).total_seconds(), 1)),
                "tipo": evento["tipo"],
                "texto": evento["texto"],
                "destaque": evento["destaque"],
            }
            for evento in eventos
        ],
    ]
    if fim:
        linha_do_tempo.append({
            "t": fim.isoformat(),
            "s": max(0.0, round((fim - inicio).total_seconds(), 1)),
            "tipo": "sessao",
            "texto": "A sessão terminou.",
            "destaque": None,
        })
    return {
        "sessao": {
            "id": str(sessao["id"]),
            "titulo": sessao["titulo"],
            "status": sessao["status"],
            "iniciada_em": inicio.isoformat(),
            "encerrada_em": fim.isoformat() if fim else None,
        },
        "duracao_s": max(0.0, round((fim_efetivo - inicio).total_seconds(), 1)),
        "eventos": linha_do_tempo,
    }
