"""Quadro de procurados da Loja (aba Caçadores). Regras em core/procurados.py."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Literal
from uuid import UUID, uuid4

from fastapi import APIRouter, Body, Depends, HTTPException, status
from psycopg.types.json import Jsonb
from pydantic import BaseModel, Field

from core import procurados
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
from core.notifications import campaign_member_ids, notify
from core.procurados import ErroProcurado
from routers.shop import creditar_carteira

router = APIRouter(prefix="/campanhas/{campanha_id}/procurados", tags=["procurados"])

_SELECT = """
    SELECT p.*, a.largura AS imagem_largura, a.altura AS imagem_altura, a.estado AS imagem_estado
    FROM procurados p
    LEFT JOIN acervo_itens a ON a.id = p.imagem_id
"""


class CacadorInput(BaseModel):
    personagem_id: UUID


class EncerrarInput(BaseModel):
    desfecho: Literal["capturado", "abatido", "cancelado"]
    #: Quem recebe a recompensa (dividida igual). Vazio só quando o desfecho é "cancelado".
    personagens: list[UUID] = Field(default_factory=list, max_length=procurados.MAX_CACADORES)


def _erro(erro: ErroProcurado) -> HTTPException:
    return HTTPException(status_code=erro.codigo, detail=erro.mensagem)


def _cartazes(connection, campanha_id: UUID, usuario_id: UUID, *, gestor: bool, ids: list[UUID] | None = None) -> list[dict[str, Any]]:
    filtros = ["p.campanha_id = %s"]
    parametros: list[Any] = [campanha_id]
    if not gestor:
        filtros.append("p.publicado")
    if ids is not None:
        filtros.append("p.id = ANY(%s)")
        parametros.append(ids)
    linhas = connection.execute(_SELECT + " WHERE " + " AND ".join(filtros), parametros).fetchall()
    if not linhas:
        return []
    cacadores = connection.execute(
        """
        SELECT c.procurado_id, c.personagem_id, pe.nome, pe.dono_usuario_id = %s AS meu
        FROM procurados_cacadores c
        JOIN personagens pe ON pe.id = c.personagem_id AND pe.status = 'ativo'
        WHERE c.procurado_id = ANY(%s)
        ORDER BY c.criado_em, pe.nome
        """,
        (usuario_id, [linha["id"] for linha in linhas]),
    ).fetchall()
    por_cartaz: dict[UUID, list[dict[str, Any]]] = {}
    for cacador in cacadores:
        por_cartaz.setdefault(cacador["procurado_id"], []).append(dict(cacador))
    return procurados.ordenar(
        [procurados.serializar(dict(linha), por_cartaz.get(linha["id"], []), gestor=gestor) for linha in linhas]
    )


def _um_cartaz(connection, campanha_id: UUID, usuario_id: UUID, procurado_id: UUID, *, gestor: bool) -> dict[str, Any]:
    achados = _cartazes(connection, campanha_id, usuario_id, gestor=gestor, ids=[procurado_id])
    if not achados:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="cartaz nao encontrado")
    return achados[0]


def _travar(connection, campanha_id: UUID, procurado_id: UUID) -> dict[str, Any]:
    linha = connection.execute(
        "SELECT * FROM procurados WHERE id=%s AND campanha_id=%s FOR UPDATE",
        (procurado_id, campanha_id),
    ).fetchone()
    if not linha:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="cartaz nao encontrado")
    return dict(linha)


def _conferir_imagem(connection, imagem_id: UUID | None, usuario_id: UUID) -> None:
    """Só imagem pronta do acervo de quem está pregando o cartaz: ninguém expõe a imagem de outra pessoa."""
    if imagem_id is None:
        return
    achada = connection.execute(
        "SELECT 1 FROM acervo_itens WHERE id=%s AND dono_id=%s AND estado='pronto'",
        (imagem_id, usuario_id),
    ).fetchone()
    if not achada:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="escolha uma imagem pronta do seu acervo")


def _avisar_publicacao(connection, campanha_id: UUID, ator: UUID, cartaz: dict[str, Any]) -> None:
    valor = int(cartaz["recompensa_valor"])
    recompensa = f" Recompensa: {valor:,} {cartaz['recompensa_moeda']}.".replace(",", ".") if valor else ""
    notify(
        connection,
        user_ids=campaign_member_ids(connection, campanha_id, roles=("jogador",)),
        category="campanha",
        title=f"Procurado: {cartaz['nome']}",
        message=f"Um cartaz novo foi pregado no quadro dos Caçadores, na Loja.{recompensa}",
        campaign_id=campanha_id,
        actor_user_id=ator,
        details={"tipo": "procurado_publicado", "procurado_id": str(cartaz["id"])},
    )


@router.get("")
def listar(
    campanha_id: UUID,
    user: AuthenticatedUser = Depends(get_current_user),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        access = campaign_access(connection, campanha_id, user.id)
        cartazes = _cartazes(connection, campanha_id, user.id, gestor=access.manages_content)
    return {"procurados": cartazes, "gestor": access.manages_content}


@router.post("", status_code=status.HTTP_201_CREATED)
def criar(
    campanha_id: UUID,
    dados: dict[str, Any] = Body(...),
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        require_campaign_manager(connection, campanha_id, user.id)
        try:
            campos = procurados.normalizar(dados)
        except ErroProcurado as erro:
            raise _erro(erro) from erro
        total = connection.execute(
            "SELECT COUNT(*) AS total FROM procurados WHERE campanha_id=%s", (campanha_id,),
        ).fetchone()["total"]
        if total >= procurados.MAX_POR_CAMPANHA:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"o quadro ja tem {procurados.MAX_POR_CAMPANHA} cartazes; apague os antigos",
            )
        _conferir_imagem(connection, campos["imagem_id"], user.id)
        novo_id = uuid4()
        agora = datetime.now(timezone.utc)
        connection.execute(
            """
            INSERT INTO procurados
                (id, campanha_id, nome, especie, descricao, local, condicao, ameaca, vd,
                 recompensa_valor, recompensa_moeda, imagem_id, imagem_foco, status,
                 publicado, publicado_em, notas_mestre, criado_por)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                novo_id, campanha_id, campos["nome"], campos["especie"], campos["descricao"], campos["local"],
                campos["condicao"], campos["ameaca"], campos["vd"], campos["recompensa_valor"],
                campos["recompensa_moeda"], campos["imagem_id"], campos["imagem_foco"], campos["status"],
                campos["publicado"], agora if campos["publicado"] else None, campos["notas_mestre"], user.id,
            ),
        )
        if campos["publicado"] and campos["status"] == "aberto":
            _avisar_publicacao(connection, campanha_id, user.id, {**campos, "id": novo_id})
        record_audit(
            connection, action="procurado.criado", actor_user_id=user.id, campaign_id=campanha_id,
            target_type="procurado", target_id=str(novo_id), details={"nome": campos["nome"], "publicado": campos["publicado"]},
        )
        cartaz = _um_cartaz(connection, campanha_id, user.id, novo_id, gestor=True)
    return {"procurado": cartaz}


@router.put("/{procurado_id}")
def editar(
    campanha_id: UUID,
    procurado_id: UUID,
    dados: dict[str, Any] = Body(...),
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        require_campaign_manager(connection, campanha_id, user.id)
        atual = _travar(connection, campanha_id, procurado_id)
        try:
            campos = procurados.normalizar(dados, atual)
        except ErroProcurado as erro:
            raise _erro(erro) from erro
        if "imagem_id" in campos and campos["imagem_id"] != atual["imagem_id"]:
            _conferir_imagem(connection, campos["imagem_id"], user.id)
        primeira_publicacao = bool(campos.get("publicado")) and atual["publicado_em"] is None
        if primeira_publicacao:
            campos["publicado_em"] = datetime.now(timezone.utc)
        if campos:
            atribuicoes = ", ".join(f"{campo}=%s" for campo in campos)
            connection.execute(
                f"UPDATE procurados SET {atribuicoes}, atualizado_em=CURRENT_TIMESTAMP WHERE id=%s",
                (*campos.values(), procurado_id),
            )
        final = {**atual, **campos}
        if primeira_publicacao and final["status"] == "aberto":
            _avisar_publicacao(connection, campanha_id, user.id, final)
        record_audit(
            connection, action="procurado.editado", actor_user_id=user.id, campaign_id=campanha_id,
            target_type="procurado", target_id=str(procurado_id), details={"campos": sorted(campos)},
        )
        cartaz = _um_cartaz(connection, campanha_id, user.id, procurado_id, gestor=True)
    return {"procurado": cartaz}


@router.delete("/{procurado_id}", status_code=status.HTTP_204_NO_CONTENT)
def apagar(
    campanha_id: UUID,
    procurado_id: UUID,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        require_campaign_manager(connection, campanha_id, user.id)
        atual = _travar(connection, campanha_id, procurado_id)
        connection.execute("DELETE FROM procurados WHERE id=%s", (procurado_id,))
        record_audit(
            connection, action="procurado.apagado", actor_user_id=user.id, campaign_id=campanha_id,
            target_type="procurado", target_id=str(procurado_id),
            details={"nome": atual["nome"], "pago": bool(atual.get("pagamento"))},
        )
    return None


@router.post("/{procurado_id}/cacadores")
def entrar_na_cacada(
    campanha_id: UUID,
    procurado_id: UUID,
    payload: CacadorInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        access = campaign_access(connection, campanha_id, user.id)
        cartaz = _travar(connection, campanha_id, procurado_id)
        if not cartaz["publicado"] and not access.manages_content:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="cartaz nao encontrado")
        if cartaz["status"] != "aberto":
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="esta caçada ja foi encerrada")
        personagem = connection.execute(
            "SELECT id, nome, dono_usuario_id FROM personagens WHERE id=%s AND campanha_id=%s AND status='ativo'",
            (payload.personagem_id, campanha_id),
        ).fetchone()
        if not personagem or (personagem["dono_usuario_id"] != user.id and not access.manages_content):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="escolha um personagem ativo seu desta campanha",
            )
        total = connection.execute(
            "SELECT COUNT(*) AS total FROM procurados_cacadores WHERE procurado_id=%s", (procurado_id,),
        ).fetchone()["total"]
        if total >= procurados.MAX_CACADORES:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="esta caçada ja esta cheia")
        inserido = connection.execute(
            """
            INSERT INTO procurados_cacadores (procurado_id, personagem_id, usuario_id)
            VALUES (%s, %s, %s)
            ON CONFLICT DO NOTHING
            RETURNING personagem_id
            """,
            (procurado_id, payload.personagem_id, user.id),
        ).fetchone()
        if inserido and not access.manages_content:
            notify(
                connection,
                user_ids=campaign_member_ids(connection, campanha_id, roles=("mestre", "assistente")),
                category="campanha",
                title=f"Caçada: {cartaz['nome']}",
                message=f"{personagem['nome']} entrou na caçada.",
                campaign_id=campanha_id,
                actor_user_id=user.id,
                details={"tipo": "procurado_cacador", "procurado_id": str(procurado_id)},
                panel="mestre",
            )
        resultado = _um_cartaz(connection, campanha_id, user.id, procurado_id, gestor=access.manages_content)
    return {"procurado": resultado}


@router.delete("/{procurado_id}/cacadores/{personagem_id}")
def sair_da_cacada(
    campanha_id: UUID,
    procurado_id: UUID,
    personagem_id: UUID,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        access = campaign_access(connection, campanha_id, user.id)
        cartaz = _travar(connection, campanha_id, procurado_id)
        if not cartaz["publicado"] and not access.manages_content:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="cartaz nao encontrado")
        if cartaz["status"] != "aberto":
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="esta caçada ja foi encerrada")
        dono = connection.execute(
            "SELECT dono_usuario_id FROM personagens WHERE id=%s AND campanha_id=%s",
            (personagem_id, campanha_id),
        ).fetchone()
        if not access.manages_content and (not dono or dono["dono_usuario_id"] != user.id):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="este personagem nao e seu")
        connection.execute(
            "DELETE FROM procurados_cacadores WHERE procurado_id=%s AND personagem_id=%s",
            (procurado_id, personagem_id),
        )
        resultado = _um_cartaz(connection, campanha_id, user.id, procurado_id, gestor=access.manages_content)
    return {"procurado": resultado}


@router.post("/{procurado_id}/encerrar")
def encerrar(
    campanha_id: UUID,
    procurado_id: UUID,
    payload: EncerrarInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    """Encerra a caçada. Capturado ou abatido divide a recompensa entre os escolhidos; cancelado não paga."""
    with database.connection() as connection:
        require_campaign_manager(connection, campanha_id, user.id)
        cartaz = _travar(connection, campanha_id, procurado_id)
        if cartaz.get("pagamento"):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="a recompensa deste cartaz ja foi paga")
        pagamento = None
        pagos: list[dict[str, Any]] = []
        if payload.desfecho in procurados.DESFECHOS_PAGOS:
            escolhidos = list(dict.fromkeys(payload.personagens))
            if not escolhidos:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                    detail="escolha quem recebe a recompensa",
                )
            # Personagem antes da carteira: a mesma ordem de trava das outras operações de economia.
            linhas = connection.execute(
                """
                SELECT id, nome, dono_usuario_id FROM personagens
                WHERE campanha_id=%s AND status='ativo' AND id = ANY(%s)
                ORDER BY id
                FOR UPDATE
                """,
                (campanha_id, escolhidos),
            ).fetchall()
            por_id = {linha["id"]: linha for linha in linhas}
            faltando = [str(item) for item in escolhidos if item not in por_id]
            if faltando:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                    detail="algum personagem escolhido nao esta ativo nesta campanha",
                )
            valores = procurados.dividir_recompensa(int(cartaz["recompensa_valor"]), len(escolhidos))
            moeda = cartaz["recompensa_moeda"] or "Lunaris"
            for personagem_id, valor in zip(escolhidos, valores):
                personagem = por_id[personagem_id]
                if valor > 0:
                    creditar_carteira(
                        connection,
                        campaign_id=campanha_id,
                        character_id=personagem_id,
                        currency=moeda,
                        amount=valor,
                        actor_user_id=user.id,
                        origin="procurado.recompensa",
                        reason=f"Recompensa por {cartaz['nome']}",
                        idempotency=f"{procurado_id}:{personagem_id}",
                    )
                    connection.execute(
                        "UPDATE personagens SET economia_versao=economia_versao+1, atualizado_em=CURRENT_TIMESTAMP WHERE id=%s",
                        (personagem_id,),
                    )
                pagos.append({
                    "id": str(personagem_id),
                    "nome": personagem["nome"],
                    "valor": valor,
                    "dono": personagem["dono_usuario_id"],
                })
            pagamento = {
                "moeda": moeda,
                "total": sum(valores),
                "em": datetime.now(timezone.utc).isoformat(),
                "por": str(user.id),
                "personagens": [{key: item[key] for key in ("id", "nome", "valor")} for item in pagos],
            }
        connection.execute(
            "UPDATE procurados SET status=%s, pagamento=%s, atualizado_em=CURRENT_TIMESTAMP WHERE id=%s",
            (payload.desfecho, Jsonb(pagamento) if pagamento else None, procurado_id),
        )
        for pago in pagos:
            notify(
                connection,
                user_ids=[pago["dono"]],
                category="economia",
                title=f"Recompensa: {cartaz['nome']}",
                message=(
                    f"{pago['nome']} recebeu {pago['valor']:,} {pagamento['moeda']} pela caçada.".replace(",", ".")
                    if pago["valor"]
                    else f"A caçada de {cartaz['nome']} terminou com {pago['nome']} no grupo."
                ),
                campaign_id=campanha_id,
                actor_user_id=user.id,
                details={"tipo": "procurado_pago", "procurado_id": str(procurado_id), "valor": pago["valor"]},
            )
        record_audit(
            connection, action=f"procurado.{payload.desfecho}", actor_user_id=user.id, campaign_id=campanha_id,
            target_type="procurado", target_id=str(procurado_id),
            details={"pagamento": {**pagamento, "personagens": pagamento["personagens"]} if pagamento else None},
        )
        resultado = _um_cartaz(connection, campanha_id, user.id, procurado_id, gestor=True)
    return {"procurado": resultado}
