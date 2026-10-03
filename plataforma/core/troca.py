"""Movimentar item e moeda entre dois personagens da mesma campanha.

Usado pelo "mandar item", pelo "mandar moedas" e pela troca com aceite. Quem
chama já validou a permissão e travou os dois personagens com `travar_par`;
aqui ficam as regras do que pode viajar e o extrato das duas pontas.
"""

from __future__ import annotations

from uuid import UUID, uuid4

from fastapi import HTTPException, status
from psycopg.types.json import Jsonb

from core.economy_commands import MAX_ECONOMY_AMOUNT, normalize_currency


# Itens que não são só uma linha do inventário: a criatura comprada virou um
# Aliado na ficha, a casa virou uma Base e o veículo completo tem registro
# próprio. Mandar só a linha deixaria a outra metade para trás.
TIPOS_QUE_NAO_VIAJAM = frozenset({"monstro", "propriedade", "veiculo-completo"})
# Chaves que, se diferentes, fazem dois registros com o mesmo item_id serem
# itens diferentes (não dá para empilhar um no outro).
CHAVES_DE_IDENTIDADE = ("origem", "catalogo_item_id", "loja_item_id", "raridade")
MOEDAS_TROCAVEIS = ("Lunaris", "Solares", "Fragmentos de Estrela", "Créditos Sombrios")


def travar_par(connection, campanha_id: UUID, origem_id: UUID, destino_id: UUID) -> tuple[dict, dict]:
    """Trava os dois personagens sempre na mesma ordem (por id), para que duas
    trocas cruzadas (A com B enquanto B com A) não fiquem esperando uma à outra."""
    if origem_id == destino_id:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="escolha outro personagem",
        )
    travados = {
        row["id"]: dict(row)
        for row in connection.execute(
            """
            SELECT id, nome, dono_usuario_id
            FROM personagens
            WHERE campanha_id=%s AND status='ativo' AND id = ANY(%s)
            ORDER BY id
            FOR UPDATE
            """,
            (campanha_id, [origem_id, destino_id]),
        ).fetchall()
    }
    if origem_id not in travados:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="personagem nao encontrado")
    if destino_id not in travados:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="o outro personagem precisa estar ativo nesta campanha",
        )
    return travados[origem_id], travados[destino_id]


def _lancar(connection, *, campanha_id, personagem_id, delta, motivo, origem, chave, ator_id,
            item_id=None, moeda=None, saldo_apos=None) -> None:
    connection.execute(
        """
        INSERT INTO lancamentos_economia
            (id, campanha_id, personagem_id, item_id, moeda, delta, saldo_apos,
             motivo, origem, idempotencia, ator_usuario_id)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """,
        (uuid4(), campanha_id, personagem_id, item_id, moeda, delta, saldo_apos,
         motivo, origem, chave, ator_id),
    )


def mover_item(
    connection,
    *,
    campanha_id: UUID,
    de: dict,
    para: dict,
    item_id: str,
    quantidade: int,
    origem: str,
    chave: str,
    ator_id: UUID,
) -> dict:
    """Tira `quantidade` do inventário de `de` e põe no de `para`. O item chega
    desequipado. Devolve título e quanto sobrou na origem."""
    linhas = {
        (row["personagem_id"], row["item_id"]): row
        for row in connection.execute(
            """
            SELECT personagem_id, item_id, titulo, quantidade, dados
            FROM inventario_personagem
            WHERE campanha_id=%s AND item_id=%s AND personagem_id = ANY(%s)
            ORDER BY personagem_id
            FOR UPDATE
            """,
            (campanha_id, item_id, [de["id"], para["id"]]),
        ).fetchall()
    }
    estoque = linhas.get((de["id"], item_id))
    if not estoque:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{de['nome']} nao tem mais esse item no inventario",
        )
    dados = dict(estoque["dados"]) if isinstance(estoque["dados"], dict) else {}
    quantidade_atual = int(estoque["quantidade"])
    if quantidade_atual < quantidade:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"mensagem": f"{de['nome']} so tem {quantidade_atual} de {estoque['titulo']}", "disponivel": quantidade_atual},
        )
    if str(dados.get("tipo") or "") in TIPOS_QUE_NAO_VIAJAM:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="aliados, bases e veiculos completos nao podem ser mandados pelo inventario",
        )
    if dados.get("modificacoes") and quantidade < quantidade_atual:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="este item tem modificacoes instaladas; mande a pilha inteira ou tire as modificacoes antes",
        )

    chegada = linhas.get((para["id"], item_id))
    if chegada:
        dados_destino = chegada["dados"] if isinstance(chegada["dados"], dict) else {}
        if any(dados_destino.get(campo) != dados.get(campo) for campo in CHAVES_DE_IDENTIDADE) or (
            dados.get("modificacoes") or dados_destino.get("modificacoes")
        ):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"{para['nome']} ja tem um {estoque['titulo']} diferente deste; nao da para juntar os dois",
            )
        nova_chegada = int(chegada["quantidade"]) + quantidade
        if nova_chegada > 1_000_000:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="a quantidade resultante excede o limite do inventario",
            )
        connection.execute(
            """
            UPDATE inventario_personagem
            SET quantidade=%s, atualizado_em=CURRENT_TIMESTAMP
            WHERE campanha_id=%s AND personagem_id=%s AND item_id=%s
            """,
            (nova_chegada, campanha_id, para["id"], item_id),
        )
    else:
        connection.execute(
            """
            INSERT INTO inventario_personagem
                (campanha_id, personagem_id, item_id, titulo, quantidade, dados)
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (campanha_id, para["id"], item_id, estoque["titulo"], quantidade, Jsonb({**dados, "equipado": False})),
        )

    restante = quantidade_atual - quantidade
    if restante:
        connection.execute(
            """
            UPDATE inventario_personagem
            SET quantidade=%s, atualizado_em=CURRENT_TIMESTAMP
            WHERE campanha_id=%s AND personagem_id=%s AND item_id=%s
            """,
            (restante, campanha_id, de["id"], item_id),
        )
    else:
        connection.execute(
            "DELETE FROM inventario_personagem WHERE campanha_id=%s AND personagem_id=%s AND item_id=%s",
            (campanha_id, de["id"], item_id),
        )

    _lancar(connection, campanha_id=campanha_id, personagem_id=de["id"], item_id=item_id, delta=-quantidade,
            motivo=f"Mandou para {para['nome']}", origem=origem, chave=f"{chave}:saida", ator_id=ator_id)
    _lancar(connection, campanha_id=campanha_id, personagem_id=para["id"], item_id=item_id, delta=quantidade,
            motivo=f"Recebeu de {de['nome']}", origem=origem, chave=f"{chave}:entrada", ator_id=ator_id)
    return {"item_id": item_id, "titulo": estoque["titulo"], "quantidade": quantidade, "restante": restante}


def _saldo_travado(connection, campanha_id: UUID, personagem_id: UUID, moeda: str):
    alvo = normalize_currency(moeda)
    for row in connection.execute(
        """
        SELECT moeda, saldo FROM saldos_personagem
        WHERE campanha_id=%s AND personagem_id=%s
        ORDER BY moeda
        FOR UPDATE
        """,
        (campanha_id, personagem_id),
    ).fetchall():
        if normalize_currency(row["moeda"]) == alvo:
            return dict(row)
    return None


def _gravar_saldo(connection, campanha_id: UUID, personagem_id: UUID, moeda: str, saldo: int) -> None:
    connection.execute(
        """
        INSERT INTO saldos_personagem (campanha_id, personagem_id, moeda, saldo)
        VALUES (%s, %s, %s, %s)
        ON CONFLICT (campanha_id, personagem_id, moeda) DO UPDATE SET
            saldo=EXCLUDED.saldo, atualizado_em=CURRENT_TIMESTAMP
        """,
        (campanha_id, personagem_id, moeda, saldo),
    )


def mover_moeda(
    connection,
    *,
    campanha_id: UUID,
    de: dict,
    para: dict,
    moeda: str,
    valor: int,
    origem: str,
    chave: str,
    ator_id: UUID,
) -> dict:
    """Tira `valor` da carteira de `de` e põe na de `para`, com extrato nas duas."""
    if moeda not in MOEDAS_TROCAVEIS:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="moeda desconhecida")
    if valor <= 0:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="o valor precisa ser positivo")
    saida = _saldo_travado(connection, campanha_id, de["id"], moeda)
    disponivel = int(saida["saldo"]) if saida else 0
    if disponivel < valor:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"mensagem": f"{de['nome']} so tem {disponivel} {moeda}", "disponivel": disponivel},
        )
    entrada = _saldo_travado(connection, campanha_id, para["id"], moeda)
    saldo_destino = (int(entrada["saldo"]) if entrada else 0) + valor
    if saldo_destino > MAX_ECONOMY_AMOUNT:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"o saldo em {moeda} de {para['nome']} excederia o limite economico",
        )
    saldo_origem = disponivel - valor
    _gravar_saldo(connection, campanha_id, de["id"], saida["moeda"], saldo_origem)
    _gravar_saldo(connection, campanha_id, para["id"], entrada["moeda"] if entrada else moeda, saldo_destino)
    _lancar(connection, campanha_id=campanha_id, personagem_id=de["id"], moeda=moeda, delta=-valor,
            saldo_apos=saldo_origem, motivo=f"Mandou para {para['nome']}", origem=origem,
            chave=f"{chave}:saida", ator_id=ator_id)
    _lancar(connection, campanha_id=campanha_id, personagem_id=para["id"], moeda=moeda, delta=valor,
            saldo_apos=saldo_destino, motivo=f"Recebeu de {de['nome']}", origem=origem,
            chave=f"{chave}:entrada", ator_id=ator_id)
    return {"moeda": moeda, "valor": valor, "saldo": saldo_origem}


def tocar_economia(connection, personagem_ids: list[UUID]) -> dict[UUID, int]:
    """Sobe a versão da economia das fichas mexidas (a ficha aberta recarrega)."""
    return {
        row["id"]: int(row["economia_versao"])
        for row in connection.execute(
            """
            UPDATE personagens
            SET economia_versao=economia_versao+1, atualizado_em=CURRENT_TIMESTAMP
            WHERE id = ANY(%s)
            RETURNING id, economia_versao
            """,
            (list(personagem_ids),),
        ).fetchall()
    }


def itens_trocaveis(connection, campanha_id: UUID, personagem_id: UUID) -> list[dict]:
    """O que pode entrar numa troca: nome e quantidade, sem os detalhes da ficha."""
    linhas = connection.execute(
        """
        SELECT item_id, titulo, quantidade, dados->>'tipo' AS tipo, dados->>'raridade' AS raridade
        FROM inventario_personagem
        WHERE campanha_id=%s AND personagem_id=%s
        ORDER BY titulo
        """,
        (campanha_id, personagem_id),
    ).fetchall()
    return [
        {"item_id": row["item_id"], "titulo": row["titulo"], "quantidade": int(row["quantidade"]), "raridade": row["raridade"]}
        for row in linhas
        if (row["tipo"] or "") not in TIPOS_QUE_NAO_VIAJAM
    ]
