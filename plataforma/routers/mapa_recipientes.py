"""Recipientes de loot no mapa (regras em core/recipientes.py): baús e afins que o Mestre prepara e os jogadores abrem.

O Mestre marca um token como recipiente, escolhe uma predefinição ou monta a tabela (item, % e quantidade).
O jogador abre: o servidor rola uma vez e a mesa vê o que saiu. Quem abriu pega as linhas, que vão para o
inventário e a carteira do personagem dele, pelo mesmo caminho da concessão da Loja. A tabela e as chances
nunca saem do servidor para quem não comanda a mesa.
"""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from psycopg.types.json import Jsonb
from pydantic import BaseModel, Field

from core import mapa, recipientes
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
from core.loot_criaturas import resumo_da_tabela
from core.notifications import campaign_member_ids, notify
from routers import mapa as rotas_mapa
from routers.shop import _any_active_character, _resolved_catalog_rows, conceder_itens_do_catalogo, creditar_carteira

router = APIRouter(prefix="/mapa", tags=["mapa-recipientes"])


class LinhaTabelaInput(BaseModel):
    item_id: str = Field(min_length=1, max_length=160, pattern=r"^[a-z0-9][a-z0-9_-]*$")
    chance: int = Field(ge=1, le=100)
    quantidade: str = Field(default="1", pattern=r"^\d{1,2}(d\d{1,3})?$")


class MoedasTabelaInput(BaseModel):
    moeda: str = Field(pattern="^(Lunaris|Solares)$")
    dados: str = Field(pattern=r"^\d{1,2}(d\d{1,3})?$")
    chance: int = Field(ge=1, le=100)


class TabelaInput(BaseModel):
    itens: list[LinhaTabelaInput] = Field(default_factory=list, max_length=recipientes.MAX_LINHAS)
    moedas: MoedasTabelaInput | None = None


class RecipienteInput(BaseModel):
    """Tudo opcional: o painel manda só o que mudou."""

    rotulo: str | None = Field(default=None, max_length=recipientes.ROTULO_MAXIMO * 2)
    #: Sorteia a tabela dessa predefinição (troca a que está lá e fecha o recipiente de novo).
    predefinicao: str | None = Field(default=None, max_length=40)
    tabela: TabelaInput | None = None
    trancado: bool | None = None
    #: Fecha de novo e esquece o que tinha saído.
    reiniciar: bool = False
    #: Tira a condição de recipiente do token.
    remover: bool = False


class PegarInput(BaseModel):
    linhas: list[str] = Field(min_length=1, max_length=recipientes.MAX_LINHAS + 1)
    #: Quem pega. O jogador só pode usar o próprio personagem; sem isso vale o único que ele tem.
    personagem_id: UUID | None = None


def _tabela_para_guardar(tabela: TabelaInput) -> dict:
    return {
        "moedas": tabela.moedas.model_dump() if tabela.moedas else None,
        "itens": [{"item": linha.item_id, "chance": linha.chance, "quantidade": linha.quantidade} for linha in tabela.itens],
    }


def _catalogo(connection, campanha_id: UUID, ids: list[str]) -> dict[str, dict]:
    return {row["id"]: row for row in _resolved_catalog_rows(connection, campanha_id, ids)} if ids else {}


def _ids_da_tabela(tabela: dict) -> list[str]:
    return sorted({str(linha.get("item")) for linha in tabela.get("itens") or [] if linha.get("item")})


def _resumo_da_tabela(connection, campanha_id: UUID, recipiente: dict) -> dict | None:
    tabela = recipiente["tabela"]
    return resumo_da_tabela("recipiente", _catalogo(connection, campanha_id, _ids_da_tabela(tabela)), tabela)


def _erro(erro: recipientes.ErroRecipiente) -> HTTPException:
    return HTTPException(status_code=422, detail=str(erro))


def _gravar(connection, token_id: UUID, recipiente: dict | None) -> None:
    connection.execute(
        "UPDATE mapa_tokens SET recipiente=%s, atualizado_em=CURRENT_TIMESTAMP WHERE id=%s",
        (Jsonb(recipiente) if recipiente is not None else None, token_id),
    )


@router.get("/{campanha_id}/recipientes/predefinicoes")
def listar_predefinicoes(
    campanha_id: UUID,
    user: AuthenticatedUser = Depends(get_current_user),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        require_campaign_manager(connection, campanha_id, user.id)
    return {"predefinicoes": recipientes.lista_de_predefinicoes()}


@router.get("/{campanha_id}/tokens/{token_id}/recipiente")
def ler_recipiente(
    campanha_id: UUID,
    token_id: UUID,
    user: AuthenticatedUser = Depends(get_current_user),
    database: Database = Depends(get_database),
):
    """A tabela do recipiente com as chances, só para quem comanda a mesa."""
    with database.connection() as connection:
        require_campaign_manager(connection, campanha_id, user.id)
        token = rotas_mapa._token(connection, campanha_id, token_id)
        recipiente = recipientes.ler(token.get("recipiente"))
        if recipiente is None:
            return {"recipiente": None, "tabela": None}
        return {
            "recipiente": recipientes.visao(recipiente, gestor=True),
            "tabela": _resumo_da_tabela(connection, campanha_id, recipiente),
        }


@router.put("/{campanha_id}/tokens/{token_id}/recipiente")
def configurar_recipiente(
    campanha_id: UUID,
    token_id: UUID,
    payload: RecipienteInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    """O Mestre torna o token um recipiente, troca a tabela, tranca, reinicia ou tira a condição."""
    with database.connection() as connection:
        acesso = require_campaign_manager(connection, campanha_id, user.id)
        token = rotas_mapa._token(connection, campanha_id, token_id, travar=True)
        atual = recipientes.ler(token.get("recipiente"))
        resultado: dict | None = atual
        try:
            if payload.remover:
                resultado = None
            else:
                if payload.predefinicao:
                    modelo = recipientes.PREDEFINICOES.get(payload.predefinicao)
                    if modelo is None:
                        raise recipientes.ErroRecipiente("predefinicao desconhecida")
                    catalogo = _resolved_catalog_rows(connection, campanha_id)
                    tabela = recipientes.gerar_tabela(payload.predefinicao, catalogo)
                    rotulo = payload.rotulo or modelo["rotulo"]
                    resultado = recipientes.novo(rotulo, payload.predefinicao, tabela)
                    if atual:
                        resultado["trancado"] = atual["trancado"]
                elif atual is None:
                    tabela = _tabela_para_guardar(payload.tabela) if payload.tabela else {"moedas": None, "itens": []}
                    resultado = recipientes.novo(payload.rotulo or "Recipiente", None, tabela)
                elif payload.tabela is not None:
                    ids = [linha.item_id for linha in payload.tabela.itens]
                    achados = _catalogo(connection, campanha_id, ids)
                    ausente = next((i for i in ids if i not in achados), None)
                    if ausente:
                        raise recipientes.ErroRecipiente(f"o item {ausente} nao existe no catalogo")
                    if any(achados[i]["tipo"] in recipientes.TIPOS_FORA for i in ids):
                        raise recipientes.ErroRecipiente("criatura e propriedade nao entram como loot")
                    resultado = {**atual, "tabela": recipientes.tabela_valida(_tabela_para_guardar(payload.tabela)), "predefinicao": None}
                if resultado is not None and atual is not None and payload.rotulo and not payload.predefinicao:
                    resultado = {**resultado, "rotulo": " ".join(payload.rotulo.split())[:recipientes.ROTULO_MAXIMO] or resultado["rotulo"]}
                if resultado is not None and payload.trancado is not None:
                    resultado = {**resultado, "trancado": payload.trancado}
                if resultado is not None and payload.reiniciar:
                    resultado = recipientes.reiniciar(resultado)
        except recipientes.ErroRecipiente as erro:
            raise _erro(erro) from None
        _gravar(connection, token_id, resultado)
        record_audit(
            connection,
            action="mapa.recipiente_configurado",
            actor_user_id=user.id,
            campaign_id=campanha_id,
            target_type="mapa_token",
            target_id=str(token_id),
            details={
                "removido": resultado is None,
                "predefinicao": (resultado or {}).get("predefinicao"),
                "linhas": len(((resultado or {}).get("tabela") or {}).get("itens") or []),
                "reiniciado": payload.reiniciar,
            },
        )
        versao = rotas_mapa._tocar(connection, token["cena_id"])
        resposta = rotas_mapa._montar(connection, campanha_id, acesso, user, token["cena_id"])
        resposta["recipiente_tabela"] = _resumo_da_tabela(connection, campanha_id, resultado) if resultado else None
    rotas_mapa._avisar(campanha_id, versao)
    return resposta


def _quem_abre(connection, quem, user: AuthenticatedUser) -> str:
    if quem.personagens:
        linha = connection.execute(
            "SELECT nome FROM personagens WHERE id = ANY(%s::uuid[]) ORDER BY nome LIMIT 1", (list(quem.personagens),),
        ).fetchone()
        if linha and linha["nome"]:
            return str(linha["nome"])
    return user.nome_exibicao or "Alguém"


def _recipiente_visto(connection, campanha_id: UUID, token_id: UUID, user: AuthenticatedUser, *, travar: bool):
    """Token, espectador e recipiente de um token que este usuário pode mesmo ver. Esconde o resto com 404."""
    acesso = campaign_access(connection, campanha_id, user.id)
    token = rotas_mapa._token(connection, campanha_id, token_id, travar=travar)
    quem = rotas_mapa._espectador(connection, campanha_id, acesso, user.id)
    recipiente = recipientes.ler(token.get("recipiente"))
    if recipiente is None:
        raise HTTPException(status_code=404, detail="este token nao guarda nada")
    if not quem.gestor:
        if not token["ativa"]:
            raise HTTPException(status_code=404, detail="token nao encontrado")
        sessao = rotas_mapa._sessao_do_momento(connection, campanha_id)
        if not (sessao and sessao["status"] == "aberta"):
            raise HTTPException(status_code=404, detail="token nao encontrado")
        if not rotas_mapa._camadas_visiveis(token["estrutura"], False, quem.permissoes_mesa).get(token["camada"], False):
            raise HTTPException(status_code=404, detail="token nao encontrado")
        participante = rotas_mapa._participante_do_token(connection, campanha_id, token)
        if mapa.degrau_de(token, participante, quem) not in ("parcial", "total"):
            raise HTTPException(status_code=404, detail="token nao encontrado")
    return acesso, token, quem, recipiente


@router.post("/{campanha_id}/tokens/{token_id}/recipiente/abrir")
def abrir_recipiente(
    campanha_id: UUID,
    token_id: UUID,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    """Abre o recipiente. A primeira abertura rola a tabela no servidor; abrir de novo mostra o mesmo que saiu."""
    with database.connection() as connection:
        acesso, token, quem, recipiente = _recipiente_visto(connection, campanha_id, token_id, user, travar=True)
        if recipiente["trancado"] and not quem.gestor:
            raise HTTPException(status_code=403, detail="esta trancado")
        ja_aberto = recipiente["aberto"] and bool(recipiente["loot"])
        if not ja_aberto:
            catalogo = _catalogo(connection, campanha_id, _ids_da_tabela(recipiente["tabela"]))
            novo = recipientes.abrir(recipiente, catalogo, _quem_abre(connection, quem, user))
            _gravar(connection, token_id, novo)
            record_audit(
                connection,
                action="mapa.recipiente_aberto",
                actor_user_id=user.id,
                campaign_id=campanha_id,
                target_type="mapa_token",
                target_id=str(token_id),
                details={"linhas": [
                    {k: linha.get(k) for k in ("tipo", "item_id", "moeda", "quantidade", "rolagem", "chance")}
                    for linha in recipientes.linhas_abertas(novo)
                ]},
            )
            versao = rotas_mapa._tocar(connection, token["cena_id"])
        else:
            versao = None
        resposta = rotas_mapa._montar(connection, campanha_id, acesso, user, token["cena_id"] if quem.gestor else None)
    if versao is not None:
        rotas_mapa._avisar(campanha_id, versao)
    return resposta


@router.post("/{campanha_id}/tokens/{token_id}/recipiente/pegar")
def pegar_do_recipiente(
    campanha_id: UUID,
    token_id: UUID,
    payload: PegarInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    """Passa linhas do que saiu para o inventário e a carteira de um personagem. Cada linha só sai uma vez."""
    from routers.sessions import _avisar_fichas_alteradas  # import tardio: o router da Sessão é pesado

    with database.connection() as connection:
        acesso, token, quem, recipiente = _recipiente_visto(connection, campanha_id, token_id, user, travar=True)
        if not recipiente["aberto"] or not recipiente["loot"]:
            raise HTTPException(status_code=409, detail="abra o recipiente antes de pegar")
        if quem.gestor:
            if payload.personagem_id is None:
                raise HTTPException(status_code=422, detail="escolha quem recebe")
            personagem_id = payload.personagem_id
        else:
            meus = [UUID(p) for p in sorted(quem.personagens)]
            if payload.personagem_id is not None:
                if str(payload.personagem_id) not in quem.personagens:
                    raise HTTPException(status_code=403, detail="este personagem nao e seu")
                personagem_id = payload.personagem_id
            elif len(meus) == 1:
                personagem_id = meus[0]
            else:
                raise HTTPException(status_code=422, detail="escolha com qual personagem pegar")
        linhas = {linha.get("linha"): linha for linha in recipiente["loot"]["linhas"] if isinstance(linha, dict)}
        if len(set(payload.linhas)) != len(payload.linhas):
            raise HTTPException(status_code=400, detail="a mesma linha veio duas vezes")
        escolhidas = []
        for id_linha in payload.linhas:
            linha = linhas.get(id_linha)
            if linha is None:
                raise HTTPException(status_code=404, detail="essa linha nao esta no que saiu")
            if linha.get("entregue_para"):
                raise HTTPException(status_code=409, detail=f"{linha.get('titulo')} ja foi pego")
            escolhidas.append(linha)

        personagem = _any_active_character(connection, campanha_id, personagem_id, lock=True)
        itens = [linha for linha in escolhidas if linha.get("tipo") == "item"]
        moedas = [linha for linha in escolhidas if linha.get("tipo") == "moedas"]
        versao_ficha = None
        if itens:
            _concedidos, _economia, versao_ficha = conceder_itens_do_catalogo(
                connection, campanha_id, personagem,
                [(str(linha["item_id"]), int(linha["quantidade"])) for linha in itens],
            )
        for linha in moedas:
            creditar_carteira(
                connection,
                campaign_id=campanha_id,
                character_id=personagem_id,
                currency=str(linha.get("moeda") or "Lunaris"),
                amount=int(linha["quantidade"]),
                actor_user_id=user.id,
                origin="mapa.recipiente",
                reason=f"{recipiente['rotulo']}",
                idempotency=f"{token_id}:{linha['linha']}",
            )
        if moedas and not itens:
            connection.execute(
                "UPDATE personagens SET economia_versao=economia_versao+1, atualizado_em=CURRENT_TIMESTAMP WHERE id=%s",
                (personagem_id,),
            )
        for linha in escolhidas:
            linha["entregue_para"] = {"personagem_id": str(personagem_id), "nome": personagem["nome"]}
        _gravar(connection, token_id, {**recipiente, "loot": recipiente["loot"]})
        recebeu = [f"{linha['quantidade']}x {linha['titulo']}" for linha in escolhidas]
        notify(
            connection,
            user_ids=campaign_member_ids(connection, campanha_id, roles=("mestre",)),
            category="sessao",
            title=f"{recipiente['rotulo']}",
            message=f"**{personagem['nome']}** pegou:\n" + "\n".join(f"- {texto}" for texto in recebeu),
            campaign_id=campanha_id,
            actor_user_id=user.id,
        )
        record_audit(
            connection,
            action="mapa.recipiente_pego",
            actor_user_id=user.id,
            campaign_id=campanha_id,
            target_type="mapa_token",
            target_id=str(token_id),
            details={"personagem_id": str(personagem_id), "linhas": [linha.get("linha") for linha in escolhidas]},
        )
        versao = rotas_mapa._tocar(connection, token["cena_id"])
        resposta = rotas_mapa._montar(connection, campanha_id, acesso, user, token["cena_id"] if quem.gestor else None)
    rotas_mapa._avisar(campanha_id, versao)
    if versao_ficha is not None:
        _avisar_fichas_alteradas(campanha_id, [{"personagem_id": personagem_id, "versao": versao_ficha}])
    return resposta
