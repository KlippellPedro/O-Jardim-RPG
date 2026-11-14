"""Cópias de token e encontros salvos no mapa (regras em core/encontros.py): só o Mestre.

- Duplicar um token (de 1 a 20 cópias, com nome numerado): a criatura da Sessão, se há, também é copiada.
- Salvar os inimigos da cena como um encontro, soltar um encontro num ponto (com os tokens escondidos, se quiser
  uma emboscada), revelar de uma vez os escondidos e limpar os inimigos da cena.

Personagem de jogador nunca é copiado, solto nem limpo. As criaturas voltam à Sessão (iniciativa) só se há uma
sessão em preparação ou ao vivo; sem ela, só os tokens entram.
"""

from __future__ import annotations

from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException
from psycopg.types.json import Jsonb
from pydantic import BaseModel, Field

from core import chefe as regras_de_chefe
from core import encontros, formas_token, live_session, mapa
from core.database import Database
from core.dependencies import AuthenticatedUser, get_current_user, get_database, require_campaign_manager, require_csrf
from routers import mapa as rotas_mapa

router = APIRouter(prefix="/mapa", tags=["mapa-encontros"])


class DuplicarInput(BaseModel):
    quantidade: int = Field(default=1, ge=1, le=encontros.MAX_COPIAS)


class SalvarEncontroInput(BaseModel):
    nome: str = Field(min_length=1, max_length=encontros.NOME_MAXIMO * 2)
    #: Os tokens a guardar; sem isto, todos os tokens dos `lados` pedidos que não são de jogador.
    tokens: list[UUID] | None = Field(default=None, max_length=encontros.MAX_MOLDES_POR_ENCONTRO)
    lados: list[str] = Field(default_factory=lambda: ["inimigo"], max_length=4)


class SoltarEncontroInput(BaseModel):
    x: float
    y: float
    #: Os tokens entram escondidos (emboscada); o Mestre revela depois.
    escondidos: bool = False


class FonteInput(BaseModel):
    ativa: bool
    #: Quantas cópias a fonte ainda pode gerar (nulo: sem limite).
    limite: int | None = Field(default=None, ge=1, le=formas_token.LIMITE_MAXIMO_DA_FONTE)
    #: Zera o contador de cópias já geradas.
    reiniciar: bool = False


class PontoInput(BaseModel):
    x: float
    y: float


class LadosInput(BaseModel):
    lados: list[str] = Field(default_factory=lambda: ["inimigo"], max_length=4)
    #: Limpar também tira a criatura da iniciativa da Sessão (sem isto, só o token sai do mapa).
    tirar_da_iniciativa: bool = False


def _lados(lados: list[str]) -> list[str]:
    validos = [lado for lado in lados if lado in mapa.LADOS and lado != "jogador"]
    if not validos:
        raise HTTPException(status_code=422, detail="escolha o lado: inimigo, aliado ou neutro")
    return validos


def _erro(erro: encontros.ErroEncontro) -> HTTPException:
    return HTTPException(status_code=erro.codigo, detail=erro.mensagem)


def _sessao_ativa(connection, campanha_id: UUID):
    return connection.execute(
        "SELECT id FROM sessoes_mesa WHERE campanha_id=%s AND status IN ('preparacao', 'aberta')", (campanha_id,),
    ).fetchone()


def _tocar_sessao(connection, sessao_id) -> int:
    return int(connection.execute(
        "UPDATE sessoes_mesa SET versao=versao+1, atualizado_em=CURRENT_TIMESTAMP WHERE id=%s RETURNING versao", (sessao_id,),
    ).fetchone()["versao"])


def _participante(connection, participante_id) -> dict | None:
    linha = connection.execute(
        """
        SELECT personagem_id, nome, tipo, iniciativa, vida_maxima, defesa, mana_maxima, estamina_maxima,
               ataques, vd, pericias, monstro_id, visibilidade
        FROM sessao_participantes WHERE id=%s
        """,
        (participante_id,),
    ).fetchone()
    return dict(linha) if linha else None


def _criar_criatura(connection, sessao_id, criatura: dict, nome: str):
    """A criatura do molde entra na iniciativa com a Vida cheia, pelo mesmo caminho do botão de adicionar da Sessão."""
    proxima = connection.execute(
        "SELECT COALESCE(MAX(ordem), -1) + 1 AS proxima FROM sessao_participantes WHERE sessao_id=%s", (sessao_id,),
    ).fetchone()["proxima"]
    chefe = None
    if criatura.get("monstro_id") and criatura["tipo"] == "inimigo":
        do_catalogo = connection.execute(
            "SELECT conteudo FROM catalogo_itens WHERE id=%s AND tipo='monstro'", (criatura["monstro_id"],),
        ).fetchone()
        chefe = regras_de_chefe.chefe_novo_para(do_catalogo["conteudo"] if do_catalogo else None)
    participante_id = uuid4()
    vida = int(criatura["vida_maxima"] or 0)
    connection.execute(
        """
        INSERT INTO sessao_participantes
            (id, sessao_id, nome, tipo, iniciativa, vida_atual, vida_maxima, visibilidade, ordem, defesa,
             mana_atual, mana_maxima, ataques, vd, pericias, estamina_atual, estamina_maxima, monstro_id, chefe)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """,
        (participante_id, sessao_id, nome, criatura["tipo"], criatura["iniciativa"], vida, vida, criatura["visibilidade"], proxima,
         criatura["defesa"], criatura["mana_maxima"], criatura["mana_maxima"], Jsonb(criatura["ataques"]), criatura["vd"],
         Jsonb(criatura["pericias"]), criatura["estamina_maxima"], criatura["estamina_maxima"], criatura["monstro_id"],
         Jsonb(chefe) if chefe else None),
    )
    return participante_id


def _inserir_token(connection, cena_id, molde: dict, x: float, y: float, nome: str, participante_id, oculto: bool):
    dados = molde["token"]
    imagem = dados["imagem_id"]
    if imagem and not connection.execute("SELECT 1 FROM acervo_itens WHERE id=%s", (imagem,)).fetchone():
        imagem = None
    connection.execute(
        """
        INSERT INTO mapa_tokens
            (id, cena_id, participante_id, imagem_id, nome, x, y, porte, lado, oculto, barras, moldura, luz, aura,
             camada, flip_x, flip_y, enquadramento, nota_mestre)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """,
        (uuid4(), cena_id, participante_id, imagem, nome, x, y, dados["porte"], dados["lado"], oculto,
         Jsonb(dados["barras"] or mapa.barras_padrao(dados["lado"])), dados["moldura"],
         Jsonb(dados["luz"]) if dados["luz"] else None, Jsonb(dados["aura"]) if dados["aura"] else None,
         dados["camada"], dados["flip_x"], dados["flip_y"], Jsonb(dados["enquadramento"]), dados["nota_mestre"]),
    )


def _nomes_na_cena(connection, campanha_id: UUID, cena_id: UUID) -> set[str]:
    """Os nomes que a mesa já vê: os da cena (o do token, ou o da criatura quando o token não tem nome próprio) e os de
    quem está na iniciativa, mesmo sem token nesta cena, para a numeração não repetir um nome da Sessão."""
    participantes = rotas_mapa._participantes(connection, campanha_id)
    nomes_criaturas = {str(p["id"]): p["nome"] for p in participantes}
    usados = {p["nome"] for p in participantes if p["nome"]}
    for token in rotas_mapa._tokens(connection, cena_id):
        nome = token["nome"] or nomes_criaturas.get(str(token["participante_id"]))
        if nome:
            usados.add(nome)
    return usados


def _casa(cena) -> float:
    grade = mapa.normalizar_grade({}, cena["grade"] if isinstance(cena["grade"], dict) else {})
    return float(grade["tamanho"])


def _confere_limite(connection, cena_id, novos: int) -> None:
    total = int(connection.execute("SELECT COUNT(*) AS n FROM mapa_tokens WHERE cena_id=%s", (cena_id,)).fetchone()["n"])
    if total + novos > rotas_mapa.MAX_TOKENS_POR_CENA:
        raise HTTPException(status_code=409, detail=f"limite de {rotas_mapa.MAX_TOKENS_POR_CENA} tokens por cena")


def _avisar_sessao(campanha_id: UUID, versao_sessao: int | None, tipo: str) -> None:
    if versao_sessao is not None:
        live_session.publicar(campanha_id, tipo, versao_sessao)


@router.post("/{campanha_id}/tokens/{token_id}/duplicar")
def duplicar_token(
    campanha_id: UUID,
    token_id: UUID,
    payload: DuplicarInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    """Cópias do token em volta dele, com nome numerado ("Lobo 2", "Lobo 3"). A criatura da Sessão, se há, também."""
    versao_sessao = None
    with database.connection() as connection:
        acesso = require_campaign_manager(connection, campanha_id, user.id)
        token = rotas_mapa._token(connection, campanha_id, token_id, travar=True)
        cena = rotas_mapa._cena(connection, campanha_id, token["cena_id"], travar=True)
        molde, participante, base = _molde_e_base(connection, token)
        _confere_limite(connection, token["cena_id"], payload.quantidade)
        casa = _casa(cena)
        existentes = rotas_mapa._tokens(connection, token["cena_id"])
        posicoes = encontros.posicoes_livres(
            (float(token["x"]), float(token["y"])), [(float(t["x"]), float(t["y"])) for t in existentes],
            casa, payload.quantidade, float(cena["largura"]), float(cena["altura"]),
        )
        if len(posicoes) < payload.quantidade:
            raise HTTPException(status_code=409, detail="nao ha casas livres suficientes em volta do token")
        usados = _nomes_na_cena(connection, campanha_id, token["cena_id"])
        sessao = _sessao_ativa(connection, campanha_id) if molde["criatura"] else None
        for x, y in posicoes:
            nome = encontros.nome_numerado(base, usados)
            usados.add(nome)
            participante_id = _criar_criatura(connection, sessao["id"], molde["criatura"], nome) if sessao else None
            # Com a criatura na Sessão, o nome mora nela; o token fica sem nome próprio, como os de "Trazer".
            _inserir_token(connection, token["cena_id"], molde, x, y, None if participante_id else nome, participante_id, molde["token"]["oculto"])
        if sessao and molde["criatura"]:
            versao_sessao = _tocar_sessao(connection, sessao["id"])
        versao = rotas_mapa._tocar(connection, token["cena_id"])
        resposta = rotas_mapa._montar(connection, campanha_id, acesso, user, token["cena_id"])
    rotas_mapa._avisar(campanha_id, versao)
    _avisar_sessao(campanha_id, versao_sessao, "participante_adicionado")
    resposta["copias"] = len(posicoes)
    return resposta


@router.get("/{campanha_id}/encontros")
def listar_encontros(
    campanha_id: UUID,
    user: AuthenticatedUser = Depends(get_current_user),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        require_campaign_manager(connection, campanha_id, user.id)
        return {"encontros": _resumos(_gravados(connection, campanha_id))}


def _gravados(connection, campanha_id: UUID) -> list[dict]:
    linha = connection.execute("SELECT encontros FROM mapa_campanha WHERE campanha_id=%s", (campanha_id,)).fetchone()
    return encontros.normalizar_encontros(linha["encontros"] if linha else [])


def _gravar(connection, campanha_id: UUID, lista: list[dict]) -> None:
    connection.execute(
        """
        INSERT INTO mapa_campanha (campanha_id, encontros) VALUES (%s, %s)
        ON CONFLICT (campanha_id) DO UPDATE SET encontros = EXCLUDED.encontros, atualizado_em = CURRENT_TIMESTAMP
        """,
        (campanha_id, Jsonb(lista)),
    )


def _resumos(lista: list[dict]) -> list[dict]:
    saida = []
    for encontro in lista:
        contagem: dict[str, int] = {}
        for molde in encontro["moldes"]:
            nome = molde["token"]["nome"] or (molde["criatura"] or {}).get("nome") or "Token"
            contagem[nome] = contagem.get(nome, 0) + 1
        saida.append({
            "id": encontro["id"], "nome": encontro["nome"], "total": len(encontro["moldes"]),
            "criaturas": sum(1 for molde in encontro["moldes"] if molde["criatura"]),
            "resumo": ", ".join(f"{quantos}x {nome}" if quantos > 1 else nome for nome, quantos in list(contagem.items())[:6]),
        })
    return saida


@router.post("/{campanha_id}/cenas/{cena_id}/encontros", status_code=201)
def salvar_encontro(
    campanha_id: UUID,
    cena_id: UUID,
    payload: SalvarEncontroInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    """Guarda como encontro os tokens escolhidos da cena (ou os de um lado, sem os personagens de jogador)."""
    with database.connection() as connection:
        require_campaign_manager(connection, campanha_id, user.id)
        rotas_mapa._cena(connection, campanha_id, cena_id)
        lados = _lados(payload.lados)
        tokens = rotas_mapa._tokens(connection, cena_id)
        if payload.tokens is not None:
            pedidos = {str(t) for t in payload.tokens}
            tokens = [t for t in tokens if str(t["id"]) in pedidos]
        else:
            tokens = [t for t in tokens if t["lado"] in lados]
        tokens = [t for t in tokens if not t["personagem_efetivo"]]
        participantes = {}
        for token in tokens:
            if token["participante_id"]:
                encontrado = _participante(connection, token["participante_id"])
                if encontrado:
                    participantes[str(token["participante_id"])] = encontrado
        try:
            encontro = encontros.encontro_novo(payload.nome, tokens, participantes)
        except encontros.ErroEncontro as erro:
            raise _erro(erro) from None
        lista = _gravados(connection, campanha_id)
        if len(lista) >= encontros.MAX_ENCONTROS:
            raise HTTPException(status_code=409, detail=f"limite de {encontros.MAX_ENCONTROS} encontros por campanha")
        encontro = encontros.normalizar_encontro(encontro)
        lista.append(encontro)
        _gravar(connection, campanha_id, lista)
    return {"encontros": _resumos(lista), "salvo": encontro["id"]}


@router.delete("/{campanha_id}/encontros/{encontro_id}")
def apagar_encontro(
    campanha_id: UUID,
    encontro_id: str,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        require_campaign_manager(connection, campanha_id, user.id)
        lista = _gravados(connection, campanha_id)
        restante = [e for e in lista if e["id"] != encontro_id]
        if len(restante) == len(lista):
            raise HTTPException(status_code=404, detail="encontro nao encontrado")
        _gravar(connection, campanha_id, restante)
    return {"encontros": _resumos(restante)}


@router.post("/{campanha_id}/cenas/{cena_id}/encontros/{encontro_id}/soltar")
def soltar_encontro(
    campanha_id: UUID,
    cena_id: UUID,
    encontro_id: str,
    payload: SoltarEncontroInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    """Cria na cena os tokens do encontro em volta do ponto (e as criaturas na iniciativa, se há sessão)."""
    versao_sessao = None
    with database.connection() as connection:
        acesso = require_campaign_manager(connection, campanha_id, user.id)
        cena = rotas_mapa._cena(connection, campanha_id, cena_id, travar=True)
        encontro = next((e for e in _gravados(connection, campanha_id) if e["id"] == encontro_id), None)
        if not encontro:
            raise HTTPException(status_code=404, detail="encontro nao encontrado")
        _confere_limite(connection, cena_id, len(encontro["moldes"]))
        casa = _casa(cena)
        largura, altura = float(cena["largura"]), float(cena["altura"])
        existentes = [(float(t["x"]), float(t["y"])) for t in rotas_mapa._tokens(connection, cena_id)]
        usados = _nomes_na_cena(connection, campanha_id, cena_id)
        sessao = _sessao_ativa(connection, campanha_id) if any(m["criatura"] for m in encontro["moldes"]) else None
        soltos = 0
        for molde in encontro["moldes"]:
            alvo = (payload.x + molde["dx"], payload.y + molde["dy"])
            # Cada token cai no centro da casa mais perto do lugar que tinha no grupo, sem pisar em outro.
            livres = encontros.posicoes_livres(alvo, existentes, casa, 1, largura, altura)
            if not livres:
                raise HTTPException(status_code=409, detail="nao ha casas livres para o encontro inteiro")
            x, y = livres[0]
            existentes.append((x, y))
            base = molde["token"]["nome"] or (molde["criatura"] or {}).get("nome") or "Token"
            nome = base if base not in usados else encontros.nome_numerado(base, usados)
            usados.add(nome)
            participante_id = _criar_criatura(connection, sessao["id"], molde["criatura"], nome) if sessao and molde["criatura"] else None
            _inserir_token(connection, cena_id, molde, x, y, None if participante_id else nome, participante_id, payload.escondidos or molde["token"]["oculto"])
            soltos += 1
        if sessao and any(m["criatura"] for m in encontro["moldes"]):
            versao_sessao = _tocar_sessao(connection, sessao["id"])
        versao = rotas_mapa._tocar(connection, cena_id)
        resposta = rotas_mapa._montar(connection, campanha_id, acesso, user, cena_id)
    rotas_mapa._avisar(campanha_id, versao)
    _avisar_sessao(campanha_id, versao_sessao, "participante_adicionado")
    resposta["soltos"] = soltos
    return resposta


@router.post("/{campanha_id}/cenas/{cena_id}/revelar")
def revelar_escondidos(
    campanha_id: UUID,
    cena_id: UUID,
    payload: LadosInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    """Tira o "escondido" de todos os tokens dos lados pedidos (a emboscada começa). Personagem de jogador fica como está."""
    with database.connection() as connection:
        acesso = require_campaign_manager(connection, campanha_id, user.id)
        rotas_mapa._cena(connection, campanha_id, cena_id, travar=True)
        lados = _lados(payload.lados if payload.lados != ["inimigo"] else ["inimigo", "neutro", "aliado"])
        revelados = connection.execute(
            """
            UPDATE mapa_tokens SET oculto=FALSE, atualizado_em=CURRENT_TIMESTAMP
            WHERE cena_id=%s AND oculto AND personagem_id IS NULL AND lado = ANY(%s)
            RETURNING id
            """,
            (cena_id, lados),
        ).fetchall()
        versao = rotas_mapa._tocar(connection, cena_id)
        resposta = rotas_mapa._montar(connection, campanha_id, acesso, user, cena_id)
    rotas_mapa._avisar(campanha_id, versao)
    resposta["revelados"] = len(revelados)
    return resposta


@router.post("/{campanha_id}/cenas/{cena_id}/limpar")
def limpar_cena(
    campanha_id: UUID,
    cena_id: UUID,
    payload: LadosInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    """Tira da cena os tokens dos lados pedidos (por padrão, os inimigos). Personagem de jogador nunca sai."""
    versao_sessao = None
    with database.connection() as connection:
        acesso = require_campaign_manager(connection, campanha_id, user.id)
        rotas_mapa._cena(connection, campanha_id, cena_id, travar=True)
        lados = _lados(payload.lados)
        alvos = [
            t for t in rotas_mapa._tokens(connection, cena_id)
            if t["lado"] in lados and not t["personagem_efetivo"] and not t["personagem_id"]
        ]
        ids = [t["id"] for t in alvos]
        connection.execute("DELETE FROM mapa_tokens WHERE id = ANY(%s)", (ids,))
        if payload.tirar_da_iniciativa:
            participantes = [t["participante_id"] for t in alvos if t["participante_id"]]
            if participantes:
                sessoes = connection.execute(
                    "DELETE FROM sessao_participantes WHERE id = ANY(%s) AND personagem_id IS NULL RETURNING sessao_id", (participantes,),
                ).fetchall()
                if sessoes:
                    versao_sessao = _tocar_sessao(connection, sessoes[0]["sessao_id"])
        versao = rotas_mapa._tocar(connection, cena_id)
        resposta = rotas_mapa._montar(connection, campanha_id, acesso, user, cena_id)
    rotas_mapa._avisar(campanha_id, versao)
    _avisar_sessao(campanha_id, versao_sessao, "participante_removido")
    resposta["removidos"] = len(alvos)
    return resposta


def _molde_e_base(connection, token: dict) -> tuple[dict, dict | None, str | None]:
    """O molde para copiar este token (nunca o de personagem de jogador), a criatura dele na Sessão e o nome que as cópias numeram."""
    participante = _participante(connection, token["participante_id"]) if token["participante_id"] else None
    if token["personagem_id"] or (participante and participante["personagem_id"]):
        raise HTTPException(status_code=422, detail="personagem de jogador nao se copia")
    molde = encontros.normalizar_encontro({"nome": "copia", "moldes": [encontros.molde_do_token(token, participante)]})["moldes"][0]
    return molde, participante, token["nome"] or (participante["nome"] if participante else None)


@router.put("/{campanha_id}/tokens/{token_id}/fonte")
def configurar_fonte(
    campanha_id: UUID,
    token_id: UUID,
    payload: FonteInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    """Liga ou desliga o token como fonte de cópias, com um limite opcional. Só o Mestre."""
    with database.connection() as connection:
        acesso = require_campaign_manager(connection, campanha_id, user.id)
        token = rotas_mapa._token(connection, campanha_id, token_id, travar=True)
        _molde_e_base(connection, token)
        try:
            nova = formas_token.fonte_configurada(token["fonte"], payload.ativa, payload.limite, payload.reiniciar)
        except formas_token.ErroForma as erro:
            raise HTTPException(status_code=erro.codigo, detail=erro.mensagem) from None
        connection.execute(
            "UPDATE mapa_tokens SET fonte=%s, atualizado_em=CURRENT_TIMESTAMP WHERE id=%s", (Jsonb(nova) if nova else None, token_id),
        )
        versao = rotas_mapa._tocar(connection, token["cena_id"])
        resposta = rotas_mapa._montar(connection, campanha_id, acesso, user, token["cena_id"])
    rotas_mapa._avisar(campanha_id, versao)
    return resposta


@router.post("/{campanha_id}/tokens/{token_id}/fonte/soltar")
def soltar_da_fonte(
    campanha_id: UUID,
    token_id: UUID,
    payload: PontoInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    """Arrastar a fonte deixa uma cópia numerada onde foi solta (na casa livre mais perto); a fonte fica onde estava."""
    versao_sessao = None
    with database.connection() as connection:
        acesso = require_campaign_manager(connection, campanha_id, user.id)
        token = rotas_mapa._token(connection, campanha_id, token_id, travar=True)
        cena = rotas_mapa._cena(connection, campanha_id, token["cena_id"], travar=True)
        try:
            fonte = formas_token.gastar_copia(token["fonte"])
        except formas_token.ErroForma as erro:
            raise HTTPException(status_code=erro.codigo, detail=erro.mensagem) from None
        molde, _, base = _molde_e_base(connection, token)
        _confere_limite(connection, token["cena_id"], 1)
        try:
            alvo = mapa.limitar_posicao(payload.x, payload.y, cena["largura"], cena["altura"])
        except mapa.ErroMapa as erro:
            raise HTTPException(status_code=erro.codigo, detail=erro.mensagem) from None
        existentes = [(float(t["x"]), float(t["y"])) for t in rotas_mapa._tokens(connection, token["cena_id"])]
        livres = encontros.posicoes_livres(alvo, existentes, _casa(cena), 1, float(cena["largura"]), float(cena["altura"]))
        if not livres:
            raise HTTPException(status_code=409, detail="nao ha casa livre perto de onde a copia caiu")
        usados = _nomes_na_cena(connection, campanha_id, token["cena_id"])
        nome = encontros.nome_numerado(base, usados)
        sessao = _sessao_ativa(connection, campanha_id) if molde["criatura"] else None
        participante_id = _criar_criatura(connection, sessao["id"], molde["criatura"], nome) if sessao else None
        _inserir_token(connection, token["cena_id"], molde, livres[0][0], livres[0][1], None if participante_id else nome, participante_id, molde["token"]["oculto"])
        if participante_id:
            versao_sessao = _tocar_sessao(connection, sessao["id"])
        connection.execute("UPDATE mapa_tokens SET fonte=%s WHERE id=%s", (Jsonb(fonte), token_id))
        versao = rotas_mapa._tocar(connection, token["cena_id"])
        resposta = rotas_mapa._montar(connection, campanha_id, acesso, user, token["cena_id"])
    rotas_mapa._avisar(campanha_id, versao)
    _avisar_sessao(campanha_id, versao_sessao, "participante_adicionado")
    return resposta
