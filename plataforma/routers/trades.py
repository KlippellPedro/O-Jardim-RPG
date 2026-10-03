"""Troca com aceite entre dois personagens da mesma campanha.

Quem propõe diz o que oferece (itens e moedas) e o que pede de volta. Nada
muda de mão até o outro lado aceitar; o aceite move tudo numa transação só,
então ou a troca inteira acontece ou nada acontece.
"""

from __future__ import annotations

from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from psycopg.types.json import Jsonb

from core.audit import record_audit
from core.database import Database
from core.dependencies import AuthenticatedUser, get_current_user, get_database, require_csrf
from core.notifications import notify
from core.troca import TIPOS_QUE_NAO_VIAJAM, itens_trocaveis, mover_item, mover_moeda, tocar_economia, travar_par
from core.economy_commands import normalize_currency
from routers.characters import _authorized_character
from schemas import TradeProposalInput, TradeSide


router = APIRouter(prefix="/trocas", tags=["trocas"])

# Propostas abertas por personagem: o bastante para negociar com a mesa toda
# sem virar spam de notificação.
_MAXIMO_ABERTAS = 10


def _personagem_da_campanha(connection, campanha_id: UUID, personagem_id: UUID):
    row = connection.execute(
        """
        SELECT id, nome, dono_usuario_id FROM personagens
        WHERE id=%s AND campanha_id=%s AND status='ativo'
        """,
        (personagem_id, campanha_id),
    ).fetchone()
    if not row:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="o outro personagem precisa estar ativo nesta campanha",
        )
    return row


def _conferir_lado(connection, campanha_id: UUID, personagem, lado: TradeSide, *, conferir_moedas: bool) -> dict:
    """Confere que o personagem tem o que o lado cita e devolve o lado já com
    o título de cada item, para a proposta ser lida sem abrir a ficha."""
    estoque = {
        row["item_id"]: row
        for row in connection.execute(
            """
            SELECT item_id, titulo, quantidade, dados->>'tipo' AS tipo
            FROM inventario_personagem
            WHERE campanha_id=%s AND personagem_id=%s AND item_id = ANY(%s)
            """,
            (campanha_id, personagem["id"], [linha.item_id for linha in lado.itens] or [""]),
        ).fetchall()
    }
    itens = []
    for linha in lado.itens:
        item = estoque.get(linha.item_id)
        if not item:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=f"{personagem['nome']} nao tem esse item",
            )
        if (item["tipo"] or "") in TIPOS_QUE_NAO_VIAJAM:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="aliados, bases e veiculos completos nao entram em troca",
            )
        if int(item["quantidade"]) < linha.quantidade:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"{personagem['nome']} so tem {item['quantidade']} de {item['titulo']}",
            )
        itens.append({"item_id": linha.item_id, "titulo": item["titulo"], "quantidade": linha.quantidade})
    if conferir_moedas and lado.moedas:
        saldos = {
            normalize_currency(row["moeda"]): int(row["saldo"])
            for row in connection.execute(
                "SELECT moeda, saldo FROM saldos_personagem WHERE campanha_id=%s AND personagem_id=%s",
                (campanha_id, personagem["id"]),
            ).fetchall()
        }
        for linha in lado.moedas:
            if saldos.get(normalize_currency(linha.moeda), 0) < linha.valor:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"{personagem['nome']} nao tem {linha.valor} {linha.moeda}",
                )
    return {"itens": itens, "moedas": [{"moeda": linha.moeda, "valor": linha.valor} for linha in lado.moedas]}


def _proposta_publica(row, personagem_id: UUID | None = None) -> dict:
    return {
        "id": row["id"],
        "de": {"id": row["de_personagem_id"], "nome": row["de_nome"]},
        "para": {"id": row["para_personagem_id"], "nome": row["para_nome"]},
        "oferta": row["oferta"],
        "pedido": row["pedido"],
        "mensagem": row["mensagem"],
        "status": row["status"],
        "criado_em": row["criado_em"],
        "resolvida_em": row["resolvida_em"],
        "recebida": personagem_id is not None and row["para_personagem_id"] == personagem_id,
    }


_SELECT_PROPOSTA = """
    SELECT t.*, d.nome AS de_nome, p.nome AS para_nome
    FROM propostas_troca t
    JOIN personagens d ON d.id=t.de_personagem_id
    JOIN personagens p ON p.id=t.para_personagem_id
"""


@router.get("")
def listar_trocas(
    personagem_id: UUID,
    user: AuthenticatedUser = Depends(get_current_user),
    database: Database = Depends(get_database),
):
    """Propostas abertas do personagem (feitas e recebidas) e as resolvidas
    da última semana."""
    with database.connection() as connection:
        _authorized_character(connection, personagem_id, user.id)
        rows = connection.execute(
            _SELECT_PROPOSTA + """
            WHERE (t.de_personagem_id=%s OR t.para_personagem_id=%s)
              AND (t.status='aberta' OR t.resolvida_em > CURRENT_TIMESTAMP - INTERVAL '7 days')
            ORDER BY (t.status='aberta') DESC, t.criado_em DESC
            LIMIT 40
            """,
            (personagem_id, personagem_id),
        ).fetchall()
    return {"propostas": [_proposta_publica(row, personagem_id) for row in rows]}


@router.get("/itens/{alvo_id}")
def itens_para_pedir(
    alvo_id: UUID,
    de_personagem_id: UUID,
    user: AuthenticatedUser = Depends(get_current_user),
    database: Database = Depends(get_database),
):
    """O que dá para pedir numa troca: nome e quantidade dos itens do outro
    personagem. Carteira e o resto da ficha continuam fechados."""
    with database.connection() as connection:
        autorizado = _authorized_character(connection, de_personagem_id, user.id)
        alvo = _personagem_da_campanha(connection, autorizado["campanha_id"], alvo_id)
        itens = itens_trocaveis(connection, autorizado["campanha_id"], alvo["id"])
    return {"itens": itens}


@router.post("", status_code=status.HTTP_201_CREATED)
def propor_troca(
    payload: TradeProposalInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        autorizado = _authorized_character(connection, payload.de_personagem_id, user.id)
        campanha_id = autorizado["campanha_id"]
        para = _personagem_da_campanha(connection, campanha_id, payload.para_personagem_id)
        abertas = connection.execute(
            "SELECT COUNT(*) AS total FROM propostas_troca WHERE de_personagem_id=%s AND status='aberta'",
            (payload.de_personagem_id,),
        ).fetchone()["total"]
        if int(abertas) >= _MAXIMO_ABERTAS:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="ja ha propostas demais esperando resposta; cancele alguma antes",
            )
        oferta = _conferir_lado(connection, campanha_id, autorizado, payload.oferta, conferir_moedas=True)
        # O que se pede só é conferido de novo no aceite: a carteira do outro é
        # dele, e quem propõe não fica sabendo se ele tem o valor.
        pedido = _conferir_lado(connection, campanha_id, para, payload.pedido, conferir_moedas=False)
        proposta_id = uuid4()
        connection.execute(
            """
            INSERT INTO propostas_troca
                (id, campanha_id, de_personagem_id, para_personagem_id, oferta, pedido, mensagem, criada_por)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (proposta_id, campanha_id, payload.de_personagem_id, para["id"],
             Jsonb(oferta), Jsonb(pedido), payload.mensagem, user.id),
        )
        notify(
            connection,
            user_ids=[para["dono_usuario_id"]],
            category="campanha",
            title=f"{autorizado['nome']} propôs uma troca",
            message=f"**{autorizado['nome']}** quer trocar com **{para['nome']}**. Veja a proposta no Inventário.",
            campaign_id=campanha_id,
            actor_user_id=user.id,
        )
        row = connection.execute(_SELECT_PROPOSTA + " WHERE t.id=%s", (proposta_id,)).fetchone()
    return {"proposta": _proposta_publica(row, payload.de_personagem_id)}


def _proposta_aberta_travada(connection, proposta_id: UUID):
    row = connection.execute(
        "SELECT * FROM propostas_troca WHERE id=%s FOR UPDATE",
        (proposta_id,),
    ).fetchone()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="proposta nao encontrada")
    if row["status"] != "aberta":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="essa proposta ja foi resolvida")
    return row


def _resolver(connection, proposta_id: UUID, novo_status: str, user_id: UUID) -> None:
    connection.execute(
        """
        UPDATE propostas_troca
        SET status=%s, resolvida_por=%s, resolvida_em=CURRENT_TIMESTAMP
        WHERE id=%s
        """,
        (novo_status, user_id, proposta_id),
    )


@router.post("/{proposta_id}/aceitar")
def aceitar_troca(
    proposta_id: UUID,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        proposta = _proposta_aberta_travada(connection, proposta_id)
        # Só quem recebe (ou o Mestre) aceita.
        _authorized_character(connection, proposta["para_personagem_id"], user.id)
        campanha_id = proposta["campanha_id"]
        de, para = travar_par(connection, campanha_id, proposta["de_personagem_id"], proposta["para_personagem_id"])
        oferta = proposta["oferta"] if isinstance(proposta["oferta"], dict) else {}
        pedido = proposta["pedido"] if isinstance(proposta["pedido"], dict) else {}
        passo = 0
        for origem, destino, lado in ((de, para, oferta), (para, de, pedido)):
            for linha in lado.get("itens") or []:
                passo += 1
                mover_item(
                    connection, campanha_id=campanha_id, de=origem, para=destino,
                    item_id=str(linha["item_id"]), quantidade=int(linha["quantidade"]),
                    origem="troca", chave=f"{proposta_id}:{passo}", ator_id=user.id,
                )
            for linha in lado.get("moedas") or []:
                passo += 1
                mover_moeda(
                    connection, campanha_id=campanha_id, de=origem, para=destino,
                    moeda=str(linha["moeda"]), valor=int(linha["valor"]),
                    origem="troca", chave=f"{proposta_id}:{passo}", ator_id=user.id,
                )
        tocar_economia(connection, [de["id"], para["id"]])
        _resolver(connection, proposta_id, "aceita", user.id)
        notify(
            connection,
            user_ids=[de["dono_usuario_id"]],
            category="campanha",
            title=f"{para['nome']} aceitou a troca",
            message=f"A troca entre **{de['nome']}** e **{para['nome']}** foi feita. Os itens e as moedas já mudaram de mão.",
            campaign_id=campanha_id,
            actor_user_id=user.id,
        )
        record_audit(
            connection,
            action="troca.aceita",
            actor_user_id=user.id,
            campaign_id=campanha_id,
            target_type="proposta_troca",
            target_id=str(proposta_id),
            details={"de": str(de["id"]), "para": str(para["id"]), "oferta": oferta, "pedido": pedido},
        )
        row = connection.execute(_SELECT_PROPOSTA + " WHERE t.id=%s", (proposta_id,)).fetchone()
    return {"proposta": _proposta_publica(row, proposta["para_personagem_id"])}


@router.post("/{proposta_id}/recusar")
def recusar_troca(
    proposta_id: UUID,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        proposta = _proposta_aberta_travada(connection, proposta_id)
        para = _authorized_character(connection, proposta["para_personagem_id"], user.id)
        _resolver(connection, proposta_id, "recusada", user.id)
        de = connection.execute(
            "SELECT nome, dono_usuario_id FROM personagens WHERE id=%s", (proposta["de_personagem_id"],),
        ).fetchone()
        notify(
            connection,
            user_ids=[de["dono_usuario_id"]],
            category="campanha",
            title=f"{para['nome']} recusou a troca",
            message=f"**{para['nome']}** não aceitou a proposta de **{de['nome']}**.",
            campaign_id=proposta["campanha_id"],
            actor_user_id=user.id,
        )
    return {"status": "recusada"}


@router.post("/{proposta_id}/cancelar")
def cancelar_troca(
    proposta_id: UUID,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        proposta = _proposta_aberta_travada(connection, proposta_id)
        _authorized_character(connection, proposta["de_personagem_id"], user.id)
        _resolver(connection, proposta_id, "cancelada", user.id)
    return {"status": "cancelada"}
