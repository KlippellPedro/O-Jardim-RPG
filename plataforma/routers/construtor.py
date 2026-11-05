"""Construtor de mapas do Mestre: os projetos editáveis e a publicação numa cena.

As regras moram em core/construtor.py. O projeto é só de quem conduz a campanha; o
jogador nunca recebe o projeto, só o mapa publicado (uma imagem do acervo como outra
qualquer) e a parte viva da cena que a névoa deixa ver.
"""

from __future__ import annotations

from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Response, status
from psycopg.types.json import Jsonb
from pydantic import BaseModel, Field

from core import construtor, mapa
from core.construtor import ErroConstrutor
from core.database import Database
from core.dependencies import AuthenticatedUser, get_current_user, get_database, require_campaign_manager, require_csrf
from core.mapa import ErroMapa
from routers import mapa as rotas_mapa

router = APIRouter(prefix="/mapa", tags=["construtor"])

COLUNAS = "id, campanha_id, nome, largura, altura, casa, conteudo, cena_id, versao, atualizado_em"


class ProjetoInput(BaseModel):
    nome: str = Field(min_length=1, max_length=80)
    largura: int = 30
    altura: int = 20
    casa: int = construtor.CASA_PADRAO


class ProjetoEdicao(BaseModel):
    nome: str | None = Field(default=None, max_length=80)
    largura: int | None = None
    altura: int | None = None
    casa: int | None = None
    conteudo: dict | None = None


class ProjetoDuplicacao(BaseModel):
    nome: str | None = Field(default=None, max_length=80)


class ProntasInput(BaseModel):
    prontas: list[dict] = Field(default_factory=list, max_length=construtor.MAX_PRONTAS)


class PublicarInput(BaseModel):
    #: A imagem que o navegador do Mestre desenhou e subiu ao acervo.
    mapa_id: UUID
    #: A cena que recebe o mapa; sem ela, nasce uma cena nova.
    cena_id: UUID | None = None
    nome: str | None = Field(default=None, max_length=80)


def _erro(erro: ErroConstrutor) -> HTTPException:
    return HTTPException(status_code=erro.codigo, detail=erro.mensagem)


def _projeto(connection, campanha_id: UUID, projeto_id: UUID, *, travar: bool = False):
    linha = connection.execute(
        f"SELECT {COLUNAS} FROM mapa_projetos WHERE id=%s AND campanha_id=%s{' FOR UPDATE' if travar else ''}",
        (projeto_id, campanha_id),
    ).fetchone()
    if not linha:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="mapa do construtor nao encontrado")
    return linha


def _validar_pecas(connection, conteudo: dict, user_id: UUID, ids_ja_usados: set[str]) -> None:
    """Só aceita objetos prontos do Acervo do Mestre que está editando.

    Referências já presentes no projeto podem ser mantidas por outro Mestre da
    campanha, que recebe acesso ao arquivo pela regra de leitura do Acervo.
    """
    # A mobília do Jardim é do site, não do Acervo de ninguém: não há o que conferir.
    do_acervo = [peca for peca in conteudo.get("pecas", []) if not peca.get("pacote")]
    ids = {UUID(peca["imagem_id"]) for peca in do_acervo}
    if not ids:
        return
    linhas = connection.execute(
        "SELECT id, dono_id, tipo, estado, nome, largura, altura FROM acervo_itens WHERE id = ANY(%s)",
        (list(ids),),
    ).fetchall()
    itens = {str(linha["id"]): linha for linha in linhas}
    if len(itens) != len(ids):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="uma imagem usada como peca nao esta mais no Acervo")
    for item_id in ids:
        item = itens[str(item_id)]
        # Objeto é a peça de sempre; mapa entra para juntar vários mapas num só (peça grande no chão).
        if item["tipo"] not in ("objeto", "mapa") or item["estado"] != "pronto":
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="as pecas precisam ser imagens prontas do tipo objeto ou mapa")
        if item["dono_id"] != user_id and str(item_id) not in ids_ja_usados:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="use como peca uma imagem do seu Acervo")
    for peca in do_acervo:
        item = itens[peca["imagem_id"]]
        peca["rotulo"] = item["nome"]
        peca["imagem_largura"] = int(item["largura"])
        peca["imagem_altura"] = int(item["altura"])


def _visao(linha, *, completa: bool = True) -> dict:
    visao = {
        "id": str(linha["id"]),
        "nome": linha["nome"],
        "largura": int(linha["largura"]),
        "altura": int(linha["altura"]),
        "casa": int(linha["casa"]),
        "cena_id": str(linha["cena_id"]) if linha["cena_id"] else None,
        "versao": int(linha["versao"]),
        "atualizado_em": linha["atualizado_em"].isoformat() if linha["atualizado_em"] else None,
    }
    if completa:
        visao["conteudo"] = construtor.ler_conteudo(linha["conteudo"], visao["largura"], visao["altura"])
    return visao


def _prontas_gravadas(connection, campanha_id: UUID) -> list[dict]:
    linha = connection.execute("SELECT prontas FROM mapa_campanha WHERE campanha_id=%s", (campanha_id,)).fetchone()
    try:
        return construtor.normalizar_prontas(linha["prontas"] if linha else [])
    except ErroConstrutor:
        return []


@router.get("/{campanha_id}/prontas")
def listar_prontas(
    campanha_id: UUID,
    user: AuthenticatedUser = Depends(get_current_user),
    database: Database = Depends(get_database),
):
    """As peças prontas da campanha (grupos de peças que o Mestre salvou para reaproveitar)."""
    with database.connection() as connection:
        require_campaign_manager(connection, campanha_id, user.id)
        return {"prontas": _prontas_gravadas(connection, campanha_id)}


@router.put("/{campanha_id}/prontas")
def salvar_prontas(
    campanha_id: UUID,
    payload: ProntasInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        require_campaign_manager(connection, campanha_id, user.id)
        try:
            prontas = construtor.normalizar_prontas(payload.prontas)
        except ErroConstrutor as erro:
            raise _erro(erro) from None
        # Imagem do Acervo dentro de uma peça pronta segue a regra das peças de um mapa.
        ja_usadas = {peca["imagem_id"] for pronta in _prontas_gravadas(connection, campanha_id) for peca in pronta["pecas"]}
        for pronta in prontas:
            _validar_pecas(connection, pronta, user.id, ja_usadas)
        connection.execute(
            """
            INSERT INTO mapa_campanha (campanha_id, prontas) VALUES (%s, %s)
            ON CONFLICT (campanha_id) DO UPDATE SET prontas = EXCLUDED.prontas, atualizado_em = CURRENT_TIMESTAMP
            """,
            (campanha_id, Jsonb(prontas)),
        )
    return {"prontas": prontas}


@router.get("/{campanha_id}/projetos")
def listar_projetos(
    campanha_id: UUID,
    user: AuthenticatedUser = Depends(get_current_user),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        require_campaign_manager(connection, campanha_id, user.id)
        linhas = connection.execute(
            f"SELECT {COLUNAS} FROM mapa_projetos WHERE campanha_id=%s ORDER BY atualizado_em DESC",
            (campanha_id,),
        ).fetchall()
        cenas = {
            str(linha["id"]): linha["nome"]
            for linha in connection.execute("SELECT id, nome FROM mapa_cenas WHERE campanha_id=%s", (campanha_id,)).fetchall()
        }
    projetos = []
    for linha in linhas:
        visao = _visao(linha, completa=False)
        visao["cena_nome"] = cenas.get(visao["cena_id"]) if visao["cena_id"] else None
        projetos.append(visao)
    return {"projetos": projetos}


@router.post("/{campanha_id}/projetos", status_code=status.HTTP_201_CREATED)
def criar_projeto(
    campanha_id: UUID,
    payload: ProjetoInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    try:
        nome = construtor.nome_limpo(payload.nome)
        largura, altura, casa = construtor.tamanho(payload.largura, payload.altura, payload.casa)
    except ErroConstrutor as erro:
        raise _erro(erro) from None
    with database.connection() as connection:
        require_campaign_manager(connection, campanha_id, user.id)
        total = connection.execute("SELECT COUNT(*) AS n FROM mapa_projetos WHERE campanha_id=%s", (campanha_id,)).fetchone()
        if int(total["n"]) >= construtor.MAX_PROJETOS:
            raise HTTPException(status_code=409, detail=f"limite de {construtor.MAX_PROJETOS} mapas no construtor")
        linha = connection.execute(
            f"""
            INSERT INTO mapa_projetos (id, campanha_id, nome, largura, altura, casa, conteudo)
            VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING {COLUNAS}
            """,
            (uuid4(), campanha_id, nome, largura, altura, casa, Jsonb(construtor.conteudo_vazio(largura, altura))),
        ).fetchone()
    return _visao(linha)


@router.post("/{campanha_id}/projetos/{projeto_id}/duplicar", status_code=status.HTTP_201_CREATED)
def duplicar_projeto(
    campanha_id: UUID,
    projeto_id: UUID,
    payload: ProjetoDuplicacao,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    """Cria um novo projeto a partir de um mapa existente da mesma campanha."""
    with database.connection() as connection:
        require_campaign_manager(connection, campanha_id, user.id)
        original = _projeto(connection, campanha_id, projeto_id)
        total = connection.execute(
            "SELECT COUNT(*) AS n FROM mapa_projetos WHERE campanha_id=%s", (campanha_id,),
        ).fetchone()
        if int(total["n"]) >= construtor.MAX_PROJETOS:
            raise HTTPException(status_code=409, detail=f"limite de {construtor.MAX_PROJETOS} mapas no construtor")
        largura, altura, casa = int(original["largura"]), int(original["altura"]), int(original["casa"])
        nome_bruto = payload.nome if payload.nome is not None else f"{original['nome'][:72]} (cópia)"
        try:
            nome = construtor.nome_limpo(nome_bruto)
            conteudo = construtor.normalizar_conteudo(original["conteudo"], largura, altura)
        except ErroConstrutor as erro:
            raise _erro(erro) from None
        ids_ja_usados = {peca["imagem_id"] for peca in conteudo["pecas"] if peca.get("imagem_id")}
        _validar_pecas(connection, conteudo, user.id, ids_ja_usados)
        linha = connection.execute(
            f"""
            INSERT INTO mapa_projetos (id, campanha_id, nome, largura, altura, casa, conteudo)
            VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING {COLUNAS}
            """,
            (uuid4(), campanha_id, nome, largura, altura, casa, Jsonb(conteudo)),
        ).fetchone()
    return _visao(linha)


@router.get("/{campanha_id}/projetos/{projeto_id}")
def obter_projeto(
    campanha_id: UUID,
    projeto_id: UUID,
    user: AuthenticatedUser = Depends(get_current_user),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        require_campaign_manager(connection, campanha_id, user.id)
        return _visao(_projeto(connection, campanha_id, projeto_id))


@router.put("/{campanha_id}/projetos/{projeto_id}")
def salvar_projeto(
    campanha_id: UUID,
    projeto_id: UUID,
    payload: ProjetoEdicao,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    """Nome, tamanho e o desenho inteiro (o editor salva sozinho, alguns segundos depois de cada mudança)."""
    with database.connection() as connection:
        require_campaign_manager(connection, campanha_id, user.id)
        atual = _projeto(connection, campanha_id, projeto_id, travar=True)
        try:
            nome = construtor.nome_limpo(payload.nome) if payload.nome is not None else atual["nome"]
            largura, altura, casa = construtor.tamanho(
                payload.largura if payload.largura is not None else int(atual["largura"]),
                payload.altura if payload.altura is not None else int(atual["altura"]),
                payload.casa if payload.casa is not None else int(atual["casa"]),
            )
            bruto = payload.conteudo if payload.conteudo is not None else atual["conteudo"]
            conteudo = construtor.normalizar_conteudo(bruto if isinstance(bruto, dict) else {}, largura, altura)
        except ErroConstrutor as erro:
            raise _erro(erro) from None
        conteudo_atual = construtor.ler_conteudo(atual["conteudo"], int(atual["largura"]), int(atual["altura"]))
        ids_ja_usados = {peca["imagem_id"] for peca in conteudo_atual.get("pecas", [])}
        _validar_pecas(connection, conteudo, user.id, ids_ja_usados)
        linha = connection.execute(
            f"""
            UPDATE mapa_projetos SET nome=%s, largura=%s, altura=%s, casa=%s, conteudo=%s,
                   versao=versao+1, atualizado_em=CURRENT_TIMESTAMP
            WHERE id=%s RETURNING {COLUNAS}
            """,
            (nome, largura, altura, casa, Jsonb(conteudo), projeto_id),
        ).fetchone()
    return _visao(linha)


@router.delete("/{campanha_id}/projetos/{projeto_id}", status_code=status.HTTP_204_NO_CONTENT)
def apagar_projeto(
    campanha_id: UUID,
    projeto_id: UUID,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    """Apaga só o projeto: a cena e a imagem já publicadas continuam."""
    with database.connection() as connection:
        require_campaign_manager(connection, campanha_id, user.id)
        _projeto(connection, campanha_id, projeto_id)
        connection.execute("DELETE FROM mapa_projetos WHERE id=%s", (projeto_id,))
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{campanha_id}/projetos/{projeto_id}/publicar")
def publicar_projeto(
    campanha_id: UUID,
    projeto_id: UUID,
    payload: PublicarInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    """O mapa desenhado vira o fundo de uma cena (nova ou a escolhida), com a grade do projeto e a
    parte viva (paredes e aberturas). Os portais e os tokens da cena continuam onde estavam."""
    with database.connection() as connection:
        acesso = require_campaign_manager(connection, campanha_id, user.id)
        projeto = _projeto(connection, campanha_id, projeto_id, travar=True)
        largura, altura, casa = int(projeto["largura"]), int(projeto["altura"]), int(projeto["casa"])
        item = rotas_mapa._item_do_mestre(connection, payload.mapa_id, user)
        if (int(item["largura"]), int(item["altura"])) != (largura * casa, altura * casa):
            raise HTTPException(status_code=409, detail="a imagem nao tem o tamanho deste mapa")
        conteudo = construtor.ler_conteudo(projeto["conteudo"], largura, altura)
        viva = {**construtor.estrutura_publicada(conteudo, casa), "projeto_id": str(projeto_id)}
        if payload.cena_id:
            cena = rotas_mapa._cena(connection, campanha_id, payload.cena_id, travar=True)
            try:
                grade = mapa.normalizar_grade(
                    {"tipo": "quadrada", "tamanho": casa, "x": 0, "y": 0},
                    cena["grade"] if isinstance(cena["grade"], dict) else {},
                )
            except ErroMapa as erro:
                raise HTTPException(status_code=erro.codigo, detail=erro.mensagem) from None
            estrutura = dict(cena["estrutura"]) if isinstance(cena["estrutura"], dict) else {}
            estrutura.update(viva)
            connection.execute(
                "UPDATE mapa_cenas SET mapa_id=%s, largura=%s, altura=%s, grade=%s, estrutura=%s WHERE id=%s",
                (payload.mapa_id, largura * casa, altura * casa, Jsonb(grade), Jsonb(estrutura), payload.cena_id),
            )
            cena_id = payload.cena_id
            rotas_mapa._recalcular_nevoa(connection, rotas_mapa._cena(connection, campanha_id, cena_id))
            versao = rotas_mapa._tocar(connection, cena_id)
        else:
            total = connection.execute("SELECT COUNT(*) AS n FROM mapa_cenas WHERE campanha_id=%s", (campanha_id,)).fetchone()
            if int(total["n"]) >= rotas_mapa.MAX_CENAS:
                raise HTTPException(status_code=409, detail=f"limite de {rotas_mapa.MAX_CENAS} cenas por campanha")
            try:
                nome = construtor.nome_limpo(payload.nome or projeto["nome"])
                grade = mapa.normalizar_grade({"tipo": "quadrada", "tamanho": casa})
            except (ErroConstrutor, ErroMapa) as erro:
                raise HTTPException(status_code=erro.codigo, detail=erro.mensagem) from None
            cena_id = uuid4()
            tem_ativa = rotas_mapa._cena_ativa(connection, campanha_id) is not None
            connection.execute(
                """
                INSERT INTO mapa_cenas (id, campanha_id, nome, mapa_id, largura, altura, grade, estrutura, ativa, ordem)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s,
                        (SELECT COALESCE(MAX(ordem), 0) + 1 FROM mapa_cenas WHERE campanha_id=%s))
                """,
                (cena_id, campanha_id, nome, payload.mapa_id, largura * casa, altura * casa, Jsonb(grade),
                 Jsonb(viva), not tem_ativa, campanha_id),
            )
            versao = 1
        connection.execute(
            "UPDATE mapa_projetos SET cena_id=%s, atualizado_em=CURRENT_TIMESTAMP WHERE id=%s", (cena_id, projeto_id),
        )
        resposta = rotas_mapa._montar(connection, campanha_id, acesso, user, cena_id)
    rotas_mapa._avisar(campanha_id, versao)
    return resposta
