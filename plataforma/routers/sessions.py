from __future__ import annotations

import asyncio
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import StreamingResponse
from psycopg.types.json import Jsonb

from core.audit import record_audit
from core.dados import rolar_dado
from core.database import Database
from core.dependencies import (
    AuthenticatedUser,
    campaign_access,
    get_current_user,
    get_database,
    require_campaign_manager,
    require_csrf,
)
from core import live_session
from core.notifications import campaign_member_ids, notify
from schemas import (
    ParticipantCreateInput,
    ParticipantUpdateInput,
    SessionOpenInput,
    SessionTurnInput,
)


router = APIRouter(prefix="/sessao", tags=["sessao-ao-vivo"])

# Faixas usadas quando o mestre esconde os números do monstro. O jogador vê o
# estado sem conseguir calcular quantos pontos faltam para derrubá-lo.
_ESTADOS_VIDA = (
    (1.0, "Ileso"),
    (0.75, "Arranhado"),
    (0.5, "Ferido"),
    (0.25, "Muito ferido"),
    (0.0001, "Quase morto"),
)


def _estado_da_vida(atual: int, maximo: int) -> str:
    if maximo <= 0:
        return "Sem ferimentos registrados"
    if atual <= 0:
        return "Fora de combate"
    proporcao = atual / maximo
    for limite, rotulo in _ESTADOS_VIDA:
        if proporcao >= limite:
            return rotulo
    return "Quase morto"


def _sessao_aberta(connection, campaign_id: UUID):
    return connection.execute(
        """
        SELECT id, campanha_id, titulo, status, rodada, turno_indice,
               em_combate, versao, aberta_por, iniciada_em
        FROM sessoes_mesa
        WHERE campanha_id=%s AND status='aberta'
        """,
        (campaign_id,),
    ).fetchone()


def _participantes(connection, sessao_id: UUID):
    return connection.execute(
        """
        SELECT id, personagem_id, nome, tipo, iniciativa, vida_atual,
               vida_maxima, condicoes, anotacao, visivel, vida_visivel, ordem
        FROM sessao_participantes
        WHERE sessao_id=%s
        ORDER BY ordem, iniciativa DESC, nome
        """,
        (sessao_id,),
    ).fetchall()


def _tocar(connection, sessao_id: UUID) -> int:
    """Sobe a versão da sessão — é o que os clientes usam para detectar mudança."""
    row = connection.execute(
        """
        UPDATE sessoes_mesa
        SET versao=versao+1, atualizado_em=CURRENT_TIMESTAMP
        WHERE id=%s RETURNING versao
        """,
        (sessao_id,),
    ).fetchone()
    return int(row["versao"])


def _montar_estado(connection, sessao, papel: str, usuario_id: UUID) -> dict:
    """Recorta o estado conforme quem está olhando."""
    manda = papel in {"mestre", "assistente"}
    linhas = _participantes(connection, sessao["id"])

    meus_personagens = {
        row["id"]
        for row in connection.execute(
            """
            SELECT id FROM personagens
            WHERE campanha_id=%s AND dono_usuario_id=%s AND status='ativo'
            """,
            (sessao["campanha_id"], usuario_id),
        ).fetchall()
    }

    participantes = []
    for indice, linha in enumerate(linhas):
        item = dict(linha)
        proprio = item["personagem_id"] in meus_personagens
        if not manda and not item["visivel"]:
            continue
        publico = {
            "id": item["id"],
            "nome": item["nome"],
            "tipo": item["tipo"],
            "iniciativa": item["iniciativa"],
            "condicoes": item["condicoes"],
            "ordem": item["ordem"],
            "indice": indice,
            "e_meu": proprio,
        }
        # Números exatos: sempre para quem comanda, e sempre no próprio
        # personagem. Para o resto, só se o mestre deixou visível.
        if manda or proprio or item["vida_visivel"]:
            publico["vida_atual"] = item["vida_atual"]
            publico["vida_maxima"] = item["vida_maxima"]
        publico["estado_vida"] = _estado_da_vida(item["vida_atual"], item["vida_maxima"])
        # O id da ficha abre o atalho "Abrir ficha": vai para quem comanda e
        # para o dono do personagem, nunca para quem não pode ver aquela ficha.
        if manda or proprio:
            publico["personagem_id"] = item["personagem_id"]
        if manda:
            publico["visivel"] = item["visivel"]
            publico["vida_visivel"] = item["vida_visivel"]
            publico["anotacao"] = item["anotacao"]
        participantes.append(publico)

    visiveis = [p for p in participantes if p is not None]
    turno_de = None
    if sessao["em_combate"] and linhas:
        indice = sessao["turno_indice"] % len(linhas)
        atual = dict(linhas[indice])
        if manda or atual["visivel"]:
            turno_de = {"id": atual["id"], "nome": atual["nome"], "indice": indice}
        else:
            turno_de = {"id": None, "nome": "Alguém que você não vê", "indice": indice}

    return {
        "sessao": {
            "id": sessao["id"],
            "campanha_id": sessao["campanha_id"],
            "titulo": sessao["titulo"],
            "rodada": sessao["rodada"],
            "em_combate": sessao["em_combate"],
            "versao": sessao["versao"],
            "iniciada_em": sessao["iniciada_em"],
            "turno_de": turno_de,
        },
        "participantes": visiveis,
        "meu_papel": papel,
        "comando": manda,
    }


@router.get("")
def obter_sessao(
    campanha_id: UUID,
    user: AuthenticatedUser = Depends(get_current_user),
    database: Database = Depends(get_database),
):
    """Estado atual da mesa. Sem sessão aberta, devolve `sessao: null`."""
    with database.connection() as connection:
        acesso = campaign_access(connection, campanha_id, user.id)
        sessao = _sessao_aberta(connection, campanha_id)
        if not sessao:
            return {
                "sessao": None,
                "participantes": [],
                "meu_papel": acesso.role,
                "comando": acesso.manages_content,
            }
        return _montar_estado(connection, sessao, acesso.role, user.id)


@router.post("", status_code=status.HTTP_201_CREATED)
def abrir_sessao(
    payload: SessionOpenInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    """Abre a sessão já com os personagens ativos da campanha na lista."""
    sessao_id = uuid4()
    with database.connection() as connection:
        require_campaign_manager(connection, payload.campanha_id, user.id)
        if _sessao_aberta(connection, payload.campanha_id):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="ja existe uma sessao aberta nesta campanha",
            )
        connection.execute(
            """
            INSERT INTO sessoes_mesa (id, campanha_id, titulo, aberta_por)
            VALUES (%s, %s, %s, %s)
            """,
            (sessao_id, payload.campanha_id, payload.titulo.strip(), user.id),
        )

        if payload.incluir_personagens:
            personagens = connection.execute(
                """
                SELECT id, nome,
                       COALESCE((ficha->'derivados'->>'vida')::int, 0) AS vida_maxima,
                       COALESCE((ficha->'recursos'->>'vidaAtual')::int, 0) AS vida_atual
                FROM personagens
                WHERE campanha_id=%s AND status='ativo'
                ORDER BY nome
                """,
                (payload.campanha_id,),
            ).fetchall()
            for ordem, personagem in enumerate(personagens):
                maximo = max(0, int(personagem["vida_maxima"] or 0))
                atual = int(personagem["vida_atual"] or 0) or maximo
                connection.execute(
                    """
                    INSERT INTO sessao_participantes
                        (id, sessao_id, personagem_id, nome, tipo,
                         vida_atual, vida_maxima, ordem)
                    VALUES (%s, %s, %s, %s, 'jogador', %s, %s, %s)
                    """,
                    (uuid4(), sessao_id, personagem["id"], personagem["nome"],
                     min(atual, maximo) if maximo else atual, maximo, ordem),
                )

        notify(
            connection,
            user_ids=campaign_member_ids(connection, payload.campanha_id),
            category="campanha",
            title="A sessão começou",
            message=payload.titulo.strip() or "O mestre abriu a mesa ao vivo.",
            campaign_id=payload.campanha_id,
            actor_user_id=user.id,
        )
        record_audit(
            connection,
            action="sessao.aberta",
            actor_user_id=user.id,
            campaign_id=payload.campanha_id,
            target_type="sessao",
            target_id=str(sessao_id),
        )
        sessao = _sessao_aberta(connection, payload.campanha_id)
        estado = _montar_estado(connection, sessao, "mestre", user.id)
    live_session.publicar(payload.campanha_id, "sessao_aberta", estado["sessao"]["versao"])
    return estado


@router.delete("/{sessao_id}", status_code=status.HTTP_204_NO_CONTENT)
def encerrar_sessao(
    sessao_id: UUID,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        sessao = connection.execute(
            "SELECT campanha_id, versao FROM sessoes_mesa WHERE id=%s AND status='aberta'",
            (sessao_id,),
        ).fetchone()
        if not sessao:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="sessao nao encontrada")
        require_campaign_manager(connection, sessao["campanha_id"], user.id)
        connection.execute(
            """
            UPDATE sessoes_mesa
            SET status='encerrada', encerrada_em=CURRENT_TIMESTAMP,
                versao=versao+1, atualizado_em=CURRENT_TIMESTAMP
            WHERE id=%s
            """,
            (sessao_id,),
        )
        record_audit(
            connection,
            action="sessao.encerrada",
            actor_user_id=user.id,
            campaign_id=sessao["campanha_id"],
            target_type="sessao",
            target_id=str(sessao_id),
        )
        campanha_id = sessao["campanha_id"]
    live_session.publicar(campanha_id, "sessao_encerrada", int(sessao["versao"]) + 1)
    return None


def _sessao_sob_comando(connection, sessao_id: UUID, user_id: UUID):
    sessao = connection.execute(
        """
        SELECT id, campanha_id, rodada, turno_indice, em_combate, versao
        FROM sessoes_mesa WHERE id=%s AND status='aberta'
        """,
        (sessao_id,),
    ).fetchone()
    if not sessao:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="sessao nao encontrada")
    require_campaign_manager(connection, sessao["campanha_id"], user_id)
    return sessao


@router.post("/{sessao_id}/participantes", status_code=status.HTTP_201_CREATED)
def adicionar_participante(
    sessao_id: UUID,
    payload: ParticipantCreateInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    participante_id = uuid4()
    with database.connection() as connection:
        sessao = _sessao_sob_comando(connection, sessao_id, user.id)
        proxima_ordem = connection.execute(
            "SELECT COALESCE(MAX(ordem), -1) + 1 AS proxima FROM sessao_participantes WHERE sessao_id=%s",
            (sessao_id,),
        ).fetchone()["proxima"]
        vida = max(0, payload.vida_maxima)
        connection.execute(
            """
            INSERT INTO sessao_participantes
                (id, sessao_id, nome, tipo, iniciativa, vida_atual, vida_maxima,
                 visivel, vida_visivel, ordem)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                participante_id,
                sessao_id,
                payload.nome,
                payload.tipo,
                payload.iniciativa,
                vida,
                vida,
                payload.visivel,
                payload.vida_visivel,
                proxima_ordem,
            ),
        )
        versao = _tocar(connection, sessao_id)
        campanha_id = sessao["campanha_id"]
    live_session.publicar(campanha_id, "participante_adicionado", versao)
    return {"id": participante_id, "versao": versao}


@router.put("/{sessao_id}/participantes/{participante_id}")
def atualizar_participante(
    sessao_id: UUID,
    participante_id: UUID,
    payload: ParticipantUpdateInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    """Dano, cura, condições e visibilidade — tudo o que muda durante a luta."""
    with database.connection() as connection:
        sessao = _sessao_sob_comando(connection, sessao_id, user.id)
        atual = connection.execute(
            """
            SELECT id, nome, vida_atual, vida_maxima, personagem_id
            FROM sessao_participantes
            WHERE id=%s AND sessao_id=%s FOR UPDATE
            """,
            (participante_id, sessao_id),
        ).fetchone()
        if not atual:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="participante nao encontrado")

        vida_maxima = payload.vida_maxima if payload.vida_maxima is not None else int(atual["vida_maxima"])
        vida_atual = int(atual["vida_atual"])
        if payload.vida_atual is not None:
            vida_atual = payload.vida_atual
        if payload.dano:
            vida_atual -= payload.dano
        if payload.cura:
            vida_atual = min(vida_maxima or vida_atual + payload.cura, vida_atual + payload.cura)
        # Vida negativa é informação de jogo (o quanto passou de zero), mas não
        # deixamos ultrapassar o máximo por cura.
        vida_atual = max(-999, min(vida_atual, vida_maxima if vida_maxima else vida_atual))

        row = connection.execute(
            """
            UPDATE sessao_participantes SET
                nome=COALESCE(%s, nome),
                iniciativa=COALESCE(%s, iniciativa),
                vida_atual=%s,
                vida_maxima=%s,
                condicoes=COALESCE(%s, condicoes),
                anotacao=COALESCE(%s, anotacao),
                visivel=COALESCE(%s, visivel),
                vida_visivel=COALESCE(%s, vida_visivel),
                atualizado_em=CURRENT_TIMESTAMP
            WHERE id=%s AND sessao_id=%s
            RETURNING id, nome, vida_atual, vida_maxima
            """,
            (
                payload.nome,
                payload.iniciativa,
                vida_atual,
                vida_maxima,
                Jsonb(payload.condicoes) if payload.condicoes is not None else None,
                payload.anotacao,
                payload.visivel,
                payload.vida_visivel,
                participante_id,
                sessao_id,
            ),
        ).fetchone()
        versao = _tocar(connection, sessao_id)
        campanha_id = sessao["campanha_id"]
    live_session.publicar(campanha_id, "participante_atualizado", versao)
    return {"participante": dict(row), "versao": versao}


@router.delete("/{sessao_id}/participantes/{participante_id}", status_code=status.HTTP_204_NO_CONTENT)
def remover_participante(
    sessao_id: UUID,
    participante_id: UUID,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        sessao = _sessao_sob_comando(connection, sessao_id, user.id)
        removido = connection.execute(
            "DELETE FROM sessao_participantes WHERE id=%s AND sessao_id=%s RETURNING id",
            (participante_id, sessao_id),
        ).fetchone()
        if not removido:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="participante nao encontrado")
        versao = _tocar(connection, sessao_id)
        campanha_id = sessao["campanha_id"]
    live_session.publicar(campanha_id, "participante_removido", versao)
    return None


@router.post("/{sessao_id}/turno")
def controlar_turno(
    sessao_id: UUID,
    payload: SessionTurnInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    """Inicia o combate, ordena por iniciativa e anda com os turnos."""
    with database.connection() as connection:
        sessao = _sessao_sob_comando(connection, sessao_id, user.id)
        total = connection.execute(
            "SELECT COUNT(*) AS total FROM sessao_participantes WHERE sessao_id=%s",
            (sessao_id,),
        ).fetchone()["total"]

        rodada = int(sessao["rodada"])
        indice = int(sessao["turno_indice"])
        em_combate = bool(sessao["em_combate"])

        if payload.acao == "ordenar":
            linhas = connection.execute(
                """
                SELECT id FROM sessao_participantes WHERE sessao_id=%s
                ORDER BY iniciativa DESC, nome
                """,
                (sessao_id,),
            ).fetchall()
            for posicao, linha in enumerate(linhas):
                connection.execute(
                    "UPDATE sessao_participantes SET ordem=%s WHERE id=%s",
                    (posicao, linha["id"]),
                )
            indice = 0
        elif payload.acao == "iniciar":
            if not total:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="adicione participantes antes de iniciar o combate",
                )
            em_combate = True
            rodada = 1
            indice = 0
        elif payload.acao == "encerrar":
            em_combate = False
            indice = 0
        elif payload.acao == "proximo" and total:
            indice += 1
            if indice >= total:
                indice = 0
                rodada += 1
        elif payload.acao == "anterior" and total:
            indice -= 1
            if indice < 0:
                indice = max(0, total - 1)
                rodada = max(1, rodada - 1)

        connection.execute(
            """
            UPDATE sessoes_mesa
            SET rodada=%s, turno_indice=%s, em_combate=%s,
                versao=versao+1, atualizado_em=CURRENT_TIMESTAMP
            WHERE id=%s
            """,
            (rodada, indice, em_combate, sessao_id),
        )
        atualizada = _sessao_aberta(connection, sessao["campanha_id"])
        estado = _montar_estado(connection, atualizada, "mestre", user.id)
        campanha_id = sessao["campanha_id"]
    live_session.publicar(campanha_id, "turno", estado["sessao"]["versao"])
    return estado


@router.post("/{sessao_id}/iniciativa")
def rolar_iniciativa(
    sessao_id: UUID,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    """Rola 1d20 de iniciativa para todo mundo e já ordena a fila.

    O dado sai do servidor como qualquer outra rolagem — o mestre não digita
    número nenhum, e o resultado fica no log junto com o resto da sessão.
    """
    with database.connection() as connection:
        sessao = _sessao_sob_comando(connection, sessao_id, user.id)
        participantes = connection.execute(
            "SELECT id, nome, personagem_id FROM sessao_participantes WHERE sessao_id=%s",
            (sessao_id,),
        ).fetchall()
        if not participantes:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="adicione participantes antes de rolar iniciativa",
            )

        sorteios = []
        for participante in participantes:
            valor = rolar_dado(20)
            sorteios.append({"linha": participante, "valor": valor})
        # Maior iniciativa começa; empate mantém a ordem alfabética do nome.
        sorteios.sort(key=lambda item: (-item["valor"], item["linha"]["nome"]))

        for posicao, sorteio in enumerate(sorteios):
            connection.execute(
                """
                UPDATE sessao_participantes
                SET iniciativa=%s, ordem=%s, atualizado_em=CURRENT_TIMESTAMP
                WHERE id=%s
                """,
                (sorteio["valor"], posicao, sorteio["linha"]["id"]),
            )

        connection.execute(
            """
            UPDATE sessoes_mesa
            SET turno_indice=0, versao=versao+1, atualizado_em=CURRENT_TIMESTAMP
            WHERE id=%s
            """,
            (sessao_id,),
        )
        connection.execute(
            """
            INSERT INTO registros_mesa
                (id, campanha_id, sessao_id, usuario_id, autor_nome, tipo,
                 titulo, formula, resultado, detalhes)
            VALUES (%s, %s, %s, %s, %s, 'rolagem', 'Iniciativa da cena', 'd20', NULL, %s)
            """,
            (
                uuid4(),
                sessao["campanha_id"],
                sessao_id,
                user.id,
                user.nome_exibicao,
                Jsonb({
                    "iniciativas": [
                        {"nome": s["linha"]["nome"], "valor": s["valor"]} for s in sorteios
                    ],
                    "origem": {"tipo": "iniciativa"},
                }),
            ),
        )
        record_audit(
            connection,
            action="sessao.iniciativa_rolada",
            actor_user_id=user.id,
            campaign_id=sessao["campanha_id"],
            target_type="sessao",
            target_id=str(sessao_id),
            details={"participantes": len(sorteios)},
        )
        atualizada = _sessao_aberta(connection, sessao["campanha_id"])
        estado = _montar_estado(connection, atualizada, "mestre", user.id)
        campanha_id = sessao["campanha_id"]
    live_session.publicar(campanha_id, "iniciativa", estado["sessao"]["versao"])
    return estado


@router.get("/{campanha_id}/eventos")
async def acompanhar(
    campanha_id: UUID,
    request: Request,
    user: AuthenticatedUser = Depends(get_current_user),
    database: Database = Depends(get_database),
):
    """Fluxo SSE: avisa que algo mudou; o cliente refaz o GET da sessão."""
    with database.connection() as connection:
        campaign_access(connection, campanha_id, user.id)

    async def eventos():
        fila = live_session.assinar(campanha_id)
        try:
            yield b": conectado\n\n"
            while True:
                if await request.is_disconnected():
                    break
                try:
                    mensagem = await asyncio.wait_for(fila.get(), timeout=20)
                except asyncio.TimeoutError:
                    # Comentário periódico: mantém a conexão viva atravessando
                    # proxies que cortam conexões ociosas.
                    yield b": ping\n\n"
                    continue
                yield f"data: {mensagem}\n\n".encode("utf-8")
        finally:
            live_session.cancelar(campanha_id, fila)

    return StreamingResponse(
        eventos(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-store",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )
