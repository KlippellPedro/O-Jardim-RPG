"""Acervo do Mestre: pastas, imagens e os pedaços de cada imagem.

O acervo é de cada pessoa que conduz mesas e serve a todas as campanhas dela.
Sem limite de quantidade (decisão do Pedro); o Painel mostra quanto ocupa.
Jogador lê uma imagem do acervo só quando ela está numa cena ou num token de
uma campanha em que ele joga (ver `pode_ler_item`).
"""

from __future__ import annotations

from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from psycopg.types.json import Jsonb
from pydantic import BaseModel, Field
from starlette.concurrency import run_in_threadpool

from core import acervo
from core.acervo import ErroAcervo
from core.database import Database
from core.dependencies import AuthenticatedUser, get_current_user, get_database, require_csrf

router = APIRouter(prefix="/acervo", tags=["acervo"])

CACHE_PEDACO = "private, max-age=31536000, immutable"


class PastaInput(BaseModel):
    nome: str = Field(min_length=1, max_length=80)
    pai_id: UUID | None = None


class CaminhoInput(BaseModel):
    caminho: str = Field(min_length=1, max_length=400)


class PastaEdicao(BaseModel):
    nome: str | None = Field(default=None, min_length=1, max_length=80)
    pai_id: UUID | None = None
    mover_para_raiz: bool = False


class ItemInput(BaseModel):
    nome: str = Field(min_length=1, max_length=120)
    tipo: str = "mapa"
    largura: int = Field(ge=1, le=acervo.MAIOR_LADO)
    altura: int = Field(ge=1, le=acervo.MAIOR_LADO)
    pasta_id: UUID | None = None
    etiquetas: list[str] = Field(default_factory=list)


class ItemEdicao(BaseModel):
    nome: str | None = Field(default=None, min_length=1, max_length=120)
    #: Autoria, origem (endereço ou descrição) e licença; texto vazio apaga o que estava anotado.
    autoria: str | None = Field(default=None, max_length=120)
    origem: str | None = Field(default=None, max_length=300)
    licenca: str | None = Field(default=None, max_length=30)
    tipo: str | None = None
    pasta_id: UUID | None = None
    mover_para_raiz: bool = False
    etiquetas: list[str] | None = None


def _exigir_quem_conduz(user: AuthenticatedUser, connection) -> None:
    """Acervo é de quem conduz mesa: quem pode criar campanha ou já comanda uma."""
    if user.can_create_campaign:
        return
    comanda = connection.execute(
        """
        SELECT 1 FROM membros_campanha
        WHERE usuario_id=%s AND status='ativo' AND papel IN ('mestre', 'assistente') LIMIT 1
        """,
        (user.id,),
    ).fetchone()
    if not comanda:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="o acervo e de quem conduz mesas")


def _erro(erro: ErroAcervo) -> HTTPException:
    return HTTPException(status_code=erro.codigo, detail=erro.mensagem)


def _pasta_do_dono(connection, pasta_id: UUID | None, dono_id: UUID):
    if pasta_id is None:
        return None
    pasta = connection.execute(
        "SELECT id, pai_id FROM acervo_pastas WHERE id=%s AND dono_id=%s", (pasta_id, dono_id)
    ).fetchone()
    if not pasta:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="pasta nao encontrada")
    return pasta


def _item_do_dono(connection, item_id: UUID, dono_id: UUID, *, travar: bool = False):
    item = connection.execute(
        f"""
        SELECT id, nome, tipo, largura, altura, chaves, estado, pasta_id
        FROM acervo_itens WHERE id=%s AND dono_id=%s{' FOR UPDATE' if travar else ''}
        """,
        (item_id, dono_id),
    ).fetchone()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="item nao encontrado")
    return item


def _resumo_item(linha) -> dict:
    return {
        "id": str(linha["id"]),
        "nome": linha["nome"],
        "tipo": linha["tipo"],
        "largura": linha["largura"],
        "altura": linha["altura"],
        "pasta_id": str(linha["pasta_id"]) if linha["pasta_id"] else None,
        "etiquetas": list(linha["etiquetas"] or []),
        "estado": linha["estado"],
        "bytes": int(linha["bytes"]),
        "chaves": list(linha["chaves"] or []),
        "criado_em": linha["criado_em"].isoformat(),
        "autoria": linha.get("autoria"),
        "origem": linha.get("origem"),
        "licenca": linha.get("licenca"),
    }


def pode_ler_item(connection, item_id: UUID, user: AuthenticatedUser, chave: str) -> bool:
    """Dono sempre; outros, se a imagem está numa cena, token ou projeto autorizado.

    Quem comanda a campanha vê também as cenas em preparo; jogador só a cena
    ativa, e só com a sessão ao vivo. Névoa manual e visão individual liberam
    apenas os ladrilhos autorizados para aquele jogador; a miniatura não entra
    nessas listas.
    """
    linha = connection.execute(
        """
        SELECT
          EXISTS (SELECT 1 FROM acervo_itens WHERE id=%(item)s AND dono_id=%(usuario)s) AS dono,
          EXISTS (
            SELECT 1
            FROM mapa_cenas c
            LEFT JOIN mapa_tokens t ON t.cena_id = c.id AND t.imagem_id = %(item)s AND NOT t.oculto
            JOIN membros_campanha m ON m.campanha_id = c.campanha_id AND m.usuario_id = %(usuario)s AND m.status = 'ativo'
            WHERE (
              (
                c.mapa_id = %(item)s
                AND (
                  m.papel IN ('mestre', 'assistente')
                  OR (
                    COALESCE(c.estrutura->'camadas_jogadores'->>'mapa', 'true') = 'true'
                    AND COALESCE(m.permissoes_mesa->'camadas'->>'mapa', 'true') = 'true'
                  )
                )
                AND (
                  m.papel IN ('mestre', 'assistente')
                  OR (
                    c.ativa
                    AND EXISTS (
                      SELECT 1 FROM sessoes_mesa s WHERE s.campanha_id = c.campanha_id AND s.status = 'aberta'
                    )
                    AND (
                      (
                        COALESCE((c.nevoa->>'visao_pelas_paredes')::boolean, FALSE)
                        AND EXISTS (
                          SELECT 1 FROM mapa_exploracao e
                          WHERE e.cena_id = c.id AND e.usuario_id = m.usuario_id
                            AND %(chave)s = ANY(e.ladrilhos)
                        )
                      )
                      OR (
                        NOT COALESCE((c.nevoa->>'visao_pelas_paredes')::boolean, FALSE)
                        AND (
                          NOT COALESCE((c.nevoa->>'ligada')::boolean, FALSE)
                          OR %(chave)s = ANY(c.nevoa_ladrilhos)
                        )
                      )
                    )
                  )
                )
              )
              OR (
                -- Mapa colocado na cena: o jogador só lê os visíveis, e com a névoa ou a visão por paredes só os
                -- ladrilhos liberados (as chaves dele levam o id do mapa na frente).
                c.estrutura->'mapas' @> jsonb_build_array(jsonb_build_object('imagem_id', %(item_texto)s::text, 'visivel', true))
                AND (
                  m.papel IN ('mestre', 'assistente')
                  OR (
                    COALESCE(c.estrutura->'camadas_jogadores'->>'mapa', 'true') = 'true'
                    AND COALESCE(m.permissoes_mesa->'camadas'->>'mapa', 'true') = 'true'
                    AND c.ativa
                    AND EXISTS (
                      SELECT 1 FROM sessoes_mesa s WHERE s.campanha_id = c.campanha_id AND s.status = 'aberta'
                    )
                    AND (
                      (
                        COALESCE((c.nevoa->>'visao_pelas_paredes')::boolean, FALSE)
                        AND EXISTS (
                          SELECT 1 FROM mapa_exploracao e
                          WHERE e.cena_id = c.id AND e.usuario_id = m.usuario_id
                            AND (%(item_texto)s::text || ':' || %(chave)s) = ANY(e.ladrilhos)
                        )
                      )
                      OR (
                        NOT COALESCE((c.nevoa->>'visao_pelas_paredes')::boolean, FALSE)
                        AND (
                          NOT COALESCE((c.nevoa->>'ligada')::boolean, FALSE)
                          OR (%(item_texto)s::text || ':' || %(chave)s) = ANY(c.nevoa_ladrilhos)
                        )
                      )
                    )
                  )
                )
              )
              OR (
                t.id IS NOT NULL
                AND (
                  m.papel IN ('mestre', 'assistente')
                  OR (
                    COALESCE(c.estrutura->'camadas_jogadores'->>t.camada, 'true') = 'true'
                    AND COALESCE(m.permissoes_mesa->'camadas'->>t.camada, 'true') = 'true'
                  )
                )
                AND (
                  m.papel IN ('mestre', 'assistente')
                  OR (
                    c.ativa
                    AND EXISTS (
                      SELECT 1 FROM sessoes_mesa s WHERE s.campanha_id = c.campanha_id AND s.status = 'aberta'
                    )
                    AND (
                      NOT COALESCE((c.nevoa->>'visao_pelas_paredes')::boolean, FALSE)
                      OR EXISTS (
                        SELECT 1 FROM mapa_exploracao e
                        WHERE e.cena_id = c.id AND e.usuario_id = m.usuario_id
                          AND t.id = ANY(e.tokens_visiveis)
                      )
                    )
                  )
                )
              )
            )
          ) AS na_mesa,
          EXISTS (
            SELECT 1
            FROM mapa_projetos p
            JOIN membros_campanha m ON m.campanha_id=p.campanha_id AND m.usuario_id=%(usuario)s
              AND m.status='ativo' AND m.papel IN ('mestre', 'assistente')
            WHERE p.conteudo->'pecas' @> jsonb_build_array(jsonb_build_object('imagem_id', %(item_texto)s::text))
          ) AS no_projeto
        """,
        {"item": item_id, "item_texto": str(item_id), "usuario": user.id, "chave": chave},
    ).fetchone()
    if linha["dono"] or linha["na_mesa"] or linha["no_projeto"]:
        return True
    if user.is_creator:
        # O criador da plataforma conta como Mestre de qualquer campanha ativa.
        na_cena = connection.execute(
            """
            SELECT 1 FROM mapa_cenas c LEFT JOIN mapa_tokens t ON t.cena_id = c.id AND t.imagem_id=%s
            JOIN campanhas k ON k.id = c.campanha_id AND k.status = 'ativa'
            WHERE c.mapa_id=%s OR t.id IS NOT NULL
               OR c.estrutura->'mapas' @> jsonb_build_array(jsonb_build_object('imagem_id', %s::text))
            LIMIT 1
            """,
            (item_id, item_id, str(item_id)),
        ).fetchone()
        no_projeto = connection.execute(
            """
            SELECT 1 FROM mapa_projetos p
            JOIN campanhas k ON k.id=p.campanha_id AND k.status='ativa'
            WHERE p.conteudo->'pecas' @> jsonb_build_array(jsonb_build_object('imagem_id', %s::text))
            LIMIT 1
            """,
            (str(item_id),),
        ).fetchone()
        return bool(na_cena or no_projeto)
    return False


# ----------------------------------------------------------------- lista

@router.get("")
def listar(
    user: AuthenticatedUser = Depends(get_current_user),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        _exigir_quem_conduz(user, connection)
        pastas = connection.execute(
            "SELECT id, pai_id, nome FROM acervo_pastas WHERE dono_id=%s ORDER BY lower(nome)",
            (user.id,),
        ).fetchall()
        itens = connection.execute(
            """
            SELECT id, nome, tipo, largura, altura, pasta_id, etiquetas, estado, bytes, chaves, criado_em, autoria, origem, licenca
            FROM acervo_itens WHERE dono_id=%s ORDER BY lower(nome)
            """,
            (user.id,),
        ).fetchall()
        uso = acervo.uso_do_dono(connection, user.id)
    return {
        "pastas": [
            {"id": str(p["id"]), "pai_id": str(p["pai_id"]) if p["pai_id"] else None, "nome": p["nome"]}
            for p in pastas
        ],
        "itens": [_resumo_item(item) for item in itens],
        "uso_bytes": uso,
        "aviso_bytes": 2 * 1024 ** 3,
    }


# ---------------------------------------------------------------- pastas

def _criar_pasta(connection, dono_id: UUID, nome: str, pai_id: UUID | None) -> str:
    existente = connection.execute(
        """
        SELECT id FROM acervo_pastas
        WHERE dono_id=%s AND pai_id IS NOT DISTINCT FROM %s AND lower(nome)=lower(%s)
        """,
        (dono_id, pai_id, nome),
    ).fetchone()
    if existente:
        return str(existente["id"])
    pasta_id = uuid4()
    connection.execute(
        "INSERT INTO acervo_pastas (id, dono_id, pai_id, nome) VALUES (%s, %s, %s, %s)",
        (pasta_id, dono_id, pai_id, nome),
    )
    return str(pasta_id)


@router.post("/pastas", status_code=status.HTTP_201_CREATED)
def criar_pasta(
    payload: PastaInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        _exigir_quem_conduz(user, connection)
        _pasta_do_dono(connection, payload.pai_id, user.id)
        try:
            nome = acervo.nome_limpo(payload.nome, 80, "nome")
        except ErroAcervo as erro:
            raise _erro(erro) from None
        return {"id": _criar_pasta(connection, user.id, nome, payload.pai_id)}


@router.post("/pastas/caminho")
def garantir_caminho(
    payload: CaminhoInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    """Para subir uma pasta do PC: cria (ou reaproveita) cada nível de 'Mapas/Cavernas/Andar 1'."""
    partes = [parte for parte in payload.caminho.replace("\\", "/").split("/") if parte.strip()]
    if not partes or len(partes) > 12:
        raise HTTPException(status_code=422, detail="caminho invalido")
    with database.connection() as connection:
        _exigir_quem_conduz(user, connection)
        pai: UUID | None = None
        for parte in partes:
            try:
                nome = acervo.nome_limpo(parte, 80, "pasta")
            except ErroAcervo as erro:
                raise _erro(erro) from None
            pai = UUID(_criar_pasta(connection, user.id, nome, pai))
        return {"id": str(pai)}


@router.put("/pastas/{pasta_id}")
def editar_pasta(
    pasta_id: UUID,
    payload: PastaEdicao,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        _exigir_quem_conduz(user, connection)
        _pasta_do_dono(connection, pasta_id, user.id)
        if payload.nome is not None:
            try:
                nome = acervo.nome_limpo(payload.nome, 80, "nome")
            except ErroAcervo as erro:
                raise _erro(erro) from None
            connection.execute("UPDATE acervo_pastas SET nome=%s WHERE id=%s", (nome, pasta_id))
        if payload.pai_id is not None or payload.mover_para_raiz:
            destino = None if payload.mover_para_raiz else payload.pai_id
            if destino is not None:
                _pasta_do_dono(connection, destino, user.id)
                # Não pode ir para dentro de si mesma nem de uma filha.
                ciclo = connection.execute(
                    """
                    WITH RECURSIVE acima AS (
                      SELECT id, pai_id FROM acervo_pastas WHERE id=%s
                      UNION ALL
                      SELECT p.id, p.pai_id FROM acervo_pastas p JOIN acima a ON p.id = a.pai_id
                    )
                    SELECT 1 FROM acima WHERE id=%s
                    """,
                    (destino, pasta_id),
                ).fetchone()
                if ciclo:
                    raise HTTPException(status_code=422, detail="a pasta nao cabe dentro dela mesma")
            connection.execute("UPDATE acervo_pastas SET pai_id=%s WHERE id=%s", (destino, pasta_id))
    return {"ok": True}


@router.delete("/pastas/{pasta_id}", status_code=status.HTTP_204_NO_CONTENT)
def apagar_pasta(
    pasta_id: UUID,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    """Apaga a pasta e as subpastas; as imagens de dentro vão para a raiz, nunca somem junto."""
    with database.connection() as connection:
        _exigir_quem_conduz(user, connection)
        _pasta_do_dono(connection, pasta_id, user.id)
        connection.execute("DELETE FROM acervo_pastas WHERE id=%s", (pasta_id,))
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ----------------------------------------------------------------- itens

@router.post("/itens", status_code=status.HTTP_201_CREATED)
def criar_item(
    payload: ItemInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    """Reserva o item e devolve as chaves dos pedaços que o navegador deve subir."""
    if payload.tipo not in acervo.TIPOS:
        raise HTTPException(status_code=422, detail="o tipo e mapa, token ou objeto")
    try:
        nome = acervo.nome_limpo(payload.nome, 120, "nome")
        etiquetas = acervo.etiquetas_limpas(payload.etiquetas)
        chaves = acervo.chaves_esperadas(payload.largura, payload.altura)
    except ErroAcervo as erro:
        raise _erro(erro) from None
    item_id = uuid4()
    with database.connection() as connection:
        _exigir_quem_conduz(user, connection)
        _pasta_do_dono(connection, payload.pasta_id, user.id)
        connection.execute(
            """
            INSERT INTO acervo_itens (id, dono_id, pasta_id, nome, tipo, largura, altura, ladrilho, chaves, etiquetas)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (item_id, user.id, payload.pasta_id, nome, payload.tipo, payload.largura, payload.altura,
             acervo.LADO_LADRILHO, chaves, etiquetas),
        )
    return {"id": str(item_id), "chaves": chaves, "ladrilho": acervo.LADO_LADRILHO}


@router.put("/itens/{item_id}/arquivos/{chave:path}", status_code=status.HTTP_204_NO_CONTENT)
async def subir_pedaco(
    item_id: UUID,
    chave: str,
    request: Request,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    """Um pedaço por pedido, com o corpo cru (image/webp, png ou jpeg)."""
    tamanho = request.headers.get("content-length")
    if tamanho and tamanho.isdigit() and int(tamanho) > acervo.TAMANHO_MAXIMO_PEDACO:
        raise HTTPException(status_code=413, detail="pedaco grande demais")
    dados = await request.body()

    def gravar():
        with database.connection() as connection:
            item = _item_do_dono(connection, item_id, user.id, travar=True)
            if item["estado"] != "enviando":
                raise HTTPException(status_code=409, detail="item ja concluido")
            try:
                mime = acervo.conferir_pedaco(chave, request.headers.get("content-type", ""), dados, list(item["chaves"]))
            except ErroAcervo as erro:
                raise _erro(erro) from None
            acervo.salvar(connection, item_id, chave, mime, dados)

    await run_in_threadpool(gravar)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/itens/{item_id}/concluir")
def concluir_item(
    item_id: UUID,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        item = _item_do_dono(connection, item_id, user.id, travar=True)
        salvas = acervo.chaves_salvas(connection, item_id)
        faltam = [chave for chave in item["chaves"] if chave not in salvas]
        if faltam:
            raise HTTPException(status_code=409, detail={"mensagem": "faltam pedacos", "faltam": faltam[:20]})
        linha = connection.execute(
            """
            UPDATE acervo_itens SET estado='pronto', bytes=%s, atualizado_em=CURRENT_TIMESTAMP
            WHERE id=%s
            RETURNING id, nome, tipo, largura, altura, pasta_id, etiquetas, estado, bytes, chaves, criado_em, autoria, origem, licenca
            """,
            (sum(salvas.values()), item_id),
        ).fetchone()
    return _resumo_item(linha)


@router.put("/itens/{item_id}")
def editar_item(
    item_id: UUID,
    payload: ItemEdicao,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        _item_do_dono(connection, item_id, user.id, travar=True)
        mudancas: dict = {}
        try:
            if payload.nome is not None:
                mudancas["nome"] = acervo.nome_limpo(payload.nome, 120, "nome")
            if payload.etiquetas is not None:
                mudancas["etiquetas"] = acervo.etiquetas_limpas(payload.etiquetas)
            for campo, limite in (("autoria", 120), ("origem", 300)):
                valor = getattr(payload, campo)
                if valor is not None:
                    mudancas[campo] = " ".join(valor.split())[:limite] or None
        except ErroAcervo as erro:
            raise _erro(erro) from None
        if payload.licenca is not None:
            if payload.licenca and payload.licenca not in acervo.LICENCAS:
                raise HTTPException(status_code=422, detail="licenca desconhecida")
            mudancas["licenca"] = payload.licenca or None
        if payload.tipo is not None:
            if payload.tipo not in acervo.TIPOS:
                raise HTTPException(status_code=422, detail="o tipo e mapa, token ou objeto")
            # Objeto e mapa servem de peça; token não serve, então não sai de um para o outro em uso.
            if payload.tipo not in ("objeto", "mapa") and _usado_em_projeto(connection, item_id):
                raise HTTPException(status_code=409, detail="a imagem esta sendo usada como peca em um mapa editavel")
            mudancas["tipo"] = payload.tipo
        if payload.mover_para_raiz:
            mudancas["pasta_id"] = None
        elif payload.pasta_id is not None:
            _pasta_do_dono(connection, payload.pasta_id, user.id)
            mudancas["pasta_id"] = payload.pasta_id
        for coluna, valor in mudancas.items():
            connection.execute(
                f"UPDATE acervo_itens SET {coluna}=%s, atualizado_em=CURRENT_TIMESTAMP WHERE id=%s",
                (valor, item_id),
            )
        linha = connection.execute(
            """
            SELECT id, nome, tipo, largura, altura, pasta_id, etiquetas, estado, bytes, chaves, criado_em, autoria, origem, licenca
            FROM acervo_itens WHERE id=%s
            """,
            (item_id,),
        ).fetchone()
    return _resumo_item(linha)


@router.delete("/itens/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def apagar_item(
    item_id: UUID,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    """Apaga a imagem. Cena que a usava fica sem mapa; token fica com o retrato padrão."""
    with database.connection() as connection:
        _item_do_dono(connection, item_id, user.id, travar=True)
        if _usado_em_projeto(connection, item_id):
            raise HTTPException(status_code=409, detail="a imagem esta sendo usada como peca em um mapa editavel")
        acervo.apagar_item(connection, item_id)
        _tirar_das_cenas(connection, item_id)
        connection.execute("DELETE FROM acervo_itens WHERE id=%s", (item_id,))
    return Response(status_code=status.HTTP_204_NO_CONTENT)


def _tirar_das_cenas(connection, item_id: UUID) -> None:
    """Tira o mapa apagado da lista de mapas colocados de qualquer cena, e a cena registra a mudança."""
    cenas = connection.execute(
        """
        SELECT id, estrutura FROM mapa_cenas
        WHERE estrutura->'mapas' @> jsonb_build_array(jsonb_build_object('imagem_id', %s::text))
        FOR UPDATE
        """,
        (str(item_id),),
    ).fetchall()
    for cena in cenas:
        estrutura = dict(cena["estrutura"])
        restantes = [mapa for mapa in estrutura.get("mapas", []) if str(mapa.get("imagem_id")) != str(item_id)]
        if restantes:
            estrutura["mapas"] = restantes
        else:
            estrutura.pop("mapas", None)
        connection.execute(
            "UPDATE mapa_cenas SET estrutura=%s, versao=versao+1, atualizado_em=CURRENT_TIMESTAMP WHERE id=%s",
            (Jsonb(estrutura), cena["id"]),
        )


def _usado_em_projeto(connection, item_id: UUID) -> bool:
    return bool(connection.execute(
        """
        SELECT 1 FROM mapa_projetos
        WHERE conteudo->'pecas' @> jsonb_build_array(jsonb_build_object('imagem_id', %s::text))
        LIMIT 1
        """,
        (str(item_id),),
    ).fetchone())


@router.get("/itens/{item_id}/arquivos/{chave:path}")
def ler_pedaco(
    item_id: UUID,
    chave: str,
    user: AuthenticatedUser = Depends(get_current_user),
    database: Database = Depends(get_database),
):
    """Serve um pedaço. O endereço nunca muda de conteúdo, então o navegador guarda para sempre."""
    if not acervo.CHAVE.match(chave):
        raise HTTPException(status_code=404, detail="pedaco nao encontrado")
    with database.connection() as connection:
        if not pode_ler_item(connection, item_id, user, chave):
            raise HTTPException(status_code=404, detail="pedaco nao encontrado")
        achado = acervo.ler(connection, item_id, chave)
    if not achado:
        raise HTTPException(status_code=404, detail="pedaco nao encontrado")
    mime, dados = achado
    return Response(content=dados, media_type=mime, headers={"Cache-Control": CACHE_PEDACO})
