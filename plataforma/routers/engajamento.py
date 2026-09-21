"""Engajamento entre sessões: agenda fixa e calendário, mural, MVP e rank.

Tudo aqui vale por campanha. O Mestre (e o assistente) escrevem; os jogadores
leem o que é público e participam do mural, das curtidas e do voto de MVP.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, status
from psycopg.types.json import Jsonb
from pydantic import BaseModel, Field

from core.conquistas import POR_CHAVE
from core import agenda as agenda_regras
from core.agenda import ErroAgenda
from core.database import Database
from core.dependencies import (
    AuthenticatedUser,
    campaign_access,
    get_current_user,
    get_database,
    require_campaign_manager,
    require_csrf,
)
from core.discord_avisos import AVISOS_PADRAO, ROTULOS_AVISO, avisar_discord, avisos_da_campanha
from core.engajamento import contagem_regressiva, montar_rank, resultado_mvp
from core.notifications import campaign_member_ids, notify

router = APIRouter(prefix="/engajamento", tags=["engajamento"])

LIMITE_MURAL = 60
LIMITE_FOTOS = 40
TAMANHO_MAXIMO_FOTO = 160_000
PREFIXOS_FOTO = ("data:image/jpeg;base64,", "data:image/webp;base64,", "data:image/png;base64,")


def _erro(erro: ErroAgenda) -> HTTPException:
    return HTTPException(status_code=erro.codigo, detail=erro.mensagem)


def _agora() -> datetime:
    return datetime.now(timezone.utc)


def _texto(valor, limite: int, campo: str, *, obrigatorio: bool = True) -> str:
    texto = " ".join(str(valor or "").split())
    if obrigatorio and not texto:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=f"{campo} e obrigatorio")
    return texto[:limite]


def _sessao_recente(connection, campanha_id: UUID):
    """A sessão ao vivo ou a última encerrada nas últimas 24h, onde o mural pendura o que acontece."""
    return connection.execute(
        """
        SELECT id FROM sessoes_mesa
        WHERE campanha_id=%s AND status IN ('aberta', 'encerrada')
          AND COALESCE(encerrada_em, CURRENT_TIMESTAMP) > CURRENT_TIMESTAMP - INTERVAL '24 hours'
        ORDER BY iniciada_em DESC LIMIT 1
        """,
        (campanha_id,),
    ).fetchone()


# ------------------------------------------------------------------ agenda

def _agenda(connection, campanha_id: UUID, *, travar: bool = False) -> dict:
    """A agenda da campanha, sempre com todos os campos (mesmo sem linha no banco)."""
    linha = connection.execute(
        f"SELECT recorrencia, cancelados, especiais, avisos FROM campanha_agenda WHERE campanha_id=%s{' FOR UPDATE' if travar else ''}",
        (campanha_id,),
    ).fetchone()
    if not linha:
        return {"recorrencia": {}, "cancelados": [], "especiais": [], "avisos": None}
    return {
        "recorrencia": linha["recorrencia"] if isinstance(linha["recorrencia"], dict) else {},
        "cancelados": linha["cancelados"] if isinstance(linha["cancelados"], list) else [],
        "especiais": linha["especiais"] if isinstance(linha["especiais"], list) else [],
        "avisos": linha["avisos"],
    }


def _gravar_agenda(connection, campanha_id: UUID, **campos) -> None:
    colunas = ", ".join(f"{nome}=%s" for nome in campos)
    valores = [Jsonb(valor) for valor in campos.values()]
    connection.execute(
        "INSERT INTO campanha_agenda (campanha_id) VALUES (%s) ON CONFLICT (campanha_id) DO NOTHING", (campanha_id,)
    )
    connection.execute(
        f"UPDATE campanha_agenda SET {colunas}, atualizado_em=CURRENT_TIMESTAMP WHERE campanha_id=%s",
        (*valores, campanha_id),
    )


def _proxima_para_a_tela(agenda: dict, agora: datetime) -> dict | None:
    proxima = agenda_regras.proxima_ocorrencia(agenda, agora)
    if not proxima:
        return None
    instante = datetime.fromisoformat(proxima["em"])
    contagem = contagem_regressiva(instante, agora) or {}
    return {
        **contagem,
        "em": proxima["em"],
        "tipo": proxima["tipo"],
        "titulo": proxima["titulo"] or (agenda["recorrencia"].get("titulo", "") if proxima["tipo"] == "fixa" else ""),
        "nota": proxima["nota"],
    }


def _avisar_agenda(connection, campanha_id: UUID, ator: UUID, titulo: str, mensagem: str, discord: str) -> None:
    notify(
        connection,
        user_ids=campaign_member_ids(connection, campanha_id),
        category="sessao",
        title=titulo,
        message=mensagem,
        campaign_id=campanha_id,
        actor_user_id=ator,
    )
    avisar_discord(connection, campanha_id, "sessao", discord)


class RecorrenciaInput(BaseModel):
    ativa: bool = False
    dia_semana: int | None = None
    hora: str | None = None
    fuso: str | None = None
    titulo: str = Field(default="", max_length=120)
    nota: str = Field(default="", max_length=600)


class EspecialInput(BaseModel):
    em: datetime
    titulo: str = Field(default="", max_length=120)
    nota: str = Field(default="", max_length=600)


class CancelamentoInput(BaseModel):
    data: str = Field(min_length=8, max_length=10)


class AvisosInput(BaseModel):
    avisos: dict[str, bool]


@router.put("/{campanha_id}/agenda/recorrencia")
def definir_recorrencia(
    campanha_id: UUID,
    payload: RecorrenciaInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    """Define (ou desliga) a sessão fixa da semana."""
    try:
        recorrencia = agenda_regras.normalizar_recorrencia(payload.model_dump())
    except ErroAgenda as erro:
        raise _erro(erro) from None
    with database.connection() as connection:
        require_campaign_manager(connection, campanha_id, user.id)
        _gravar_agenda(connection, campanha_id, recorrencia=recorrencia)
        if recorrencia:
            texto = agenda_regras.texto_da_recorrencia(recorrencia)
            _avisar_agenda(connection, campanha_id, user.id, "Sessão fixa definida", f"{texto}.", f"📅 **Sessão fixa**: {texto.lower()}.")
    return {"recorrencia": recorrencia, "texto": agenda_regras.texto_da_recorrencia(recorrencia)}


@router.post("/{campanha_id}/agenda/cancelar")
def alternar_cancelamento(
    campanha_id: UUID,
    payload: CancelamentoInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    """Cancela a sessão fixa de uma data (ou volta atrás, se já estava cancelada)."""
    try:
        data = agenda_regras.normalizar_data(payload.data)
    except ErroAgenda as erro:
        raise _erro(erro) from None
    with database.connection() as connection:
        require_campaign_manager(connection, campanha_id, user.id)
        agenda = _agenda(connection, campanha_id, travar=True)
        recorrencia = agenda["recorrencia"]
        if not recorrencia.get("ativa") or datetime.fromisoformat(data).weekday() != recorrencia["dia_semana"]:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="essa data nao e dia de sessao fixa")
        cancelados = list(agenda["cancelados"])
        cancelando = data not in cancelados
        if cancelando:
            cancelados.append(data)
        else:
            cancelados.remove(data)
        limite = (_agora() - timedelta(days=60)).date().isoformat()
        cancelados = sorted(item for item in cancelados if item >= limite)[-agenda_regras.MAX_CANCELADOS:]
        _gravar_agenda(connection, campanha_id, cancelados=cancelados)
        extenso = agenda_regras.dia_por_extenso(data)
        if cancelando:
            _avisar_agenda(connection, campanha_id, user.id, "Sessão cancelada", f"A sessão de {extenso} foi cancelada.", f"❌ **Sessão cancelada**: {extenso}.")
        else:
            _avisar_agenda(connection, campanha_id, user.id, "Sessão de volta", f"A sessão de {extenso} está mantida.", f"✅ **Sessão mantida**: {extenso}.")
    return {"data": data, "cancelada": cancelando}


@router.post("/{campanha_id}/agenda/especiais", status_code=status.HTTP_201_CREATED)
def marcar_sessao_especial(
    campanha_id: UUID,
    payload: EspecialInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    """Sessão fora do normal: um sábado extra, uma remarcação, um especial."""
    try:
        especial = agenda_regras.normalizar_especial(payload.model_dump())
    except ErroAgenda as erro:
        raise _erro(erro) from None
    with database.connection() as connection:
        require_campaign_manager(connection, campanha_id, user.id)
        agenda = _agenda(connection, campanha_id, travar=True)
        if len(agenda["especiais"]) >= agenda_regras.MAX_ESPECIAIS:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"ate {agenda_regras.MAX_ESPECIAIS} sessoes especiais; apague alguma antes")
        _gravar_agenda(connection, campanha_id, especiais=[*agenda["especiais"], especial])
        instante = datetime.fromisoformat(especial["em"])
        contagem = contagem_regressiva(instante, _agora())
        nome = especial["titulo"] or "Sessão especial"
        quando = contagem["texto"] if contagem else "em breve"
        _avisar_agenda(connection, campanha_id, user.id, "Sessão especial marcada", f"{nome}: {quando}.", f"📅 **Sessão especial**: {nome}, {quando}.")
    return especial


@router.delete("/{campanha_id}/agenda/especiais/{especial_id}", status_code=status.HTTP_204_NO_CONTENT)
def apagar_sessao_especial(
    campanha_id: UUID,
    especial_id: str,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        require_campaign_manager(connection, campanha_id, user.id)
        agenda = _agenda(connection, campanha_id, travar=True)
        restantes = [item for item in agenda["especiais"] if item.get("id") != especial_id]
        if len(restantes) == len(agenda["especiais"]):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="sessao especial nao encontrada")
        _gravar_agenda(connection, campanha_id, especiais=restantes)
    return None


@router.get("/{campanha_id}/calendario")
def calendario(
    campanha_id: UUID,
    mes: str = Query(default="", pattern=r"^(\d{4}-\d{2})?$"),
    user: AuthenticatedUser = Depends(get_current_user),
    database: Database = Depends(get_database),
):
    """As sessões de um mês (fixas, especiais e canceladas) e a regra da sessão fixa."""
    agora = _agora()
    ano, numero = (int(parte) for parte in (mes or agora.strftime("%Y-%m")).split("-"))
    if not 1 <= numero <= 12:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="mes invalido")
    inicio = datetime(ano, numero, 1, tzinfo=timezone.utc) - timedelta(days=2)
    proximo_mes = datetime(ano + (numero == 12), (numero % 12) + 1, 1, tzinfo=timezone.utc)
    with database.connection() as connection:
        acesso = campaign_access(connection, campanha_id, user.id)
        agenda = _agenda(connection, campanha_id)
    prefixo = f"{ano:04d}-{numero:02d}"
    sessoes = [
        item for item in agenda_regras.ocorrencias(agenda, inicio, proximo_mes + timedelta(days=2))
        if item["data"].startswith(prefixo)
    ]
    recorrencia = agenda["recorrencia"]
    resposta = {
        "mes": prefixo,
        "sessoes": sessoes,
        "recorrencia": {**recorrencia, "texto": agenda_regras.texto_da_recorrencia(recorrencia)} if recorrencia else None,
        "proxima": _proxima_para_a_tela(agenda, agora),
        "gestor": acesso.manages_content,
    }
    if acesso.manages_content:
        resposta["especiais"] = agenda["especiais"]
        resposta["avisos"] = avisos_da_campanha(agenda["avisos"])
        resposta["avisos_rotulos"] = ROTULOS_AVISO
    return resposta


@router.put("/{campanha_id}/avisos")
def definir_avisos(
    campanha_id: UUID,
    payload: AvisosInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    """Liga ou desliga cada tipo de aviso do Discord."""
    limpo = {chave: valor for chave, valor in payload.avisos.items() if chave in AVISOS_PADRAO}
    with database.connection() as connection:
        require_campaign_manager(connection, campanha_id, user.id)
        atual = connection.execute("SELECT avisos FROM campanha_agenda WHERE campanha_id=%s", (campanha_id,)).fetchone()
        novos = {**avisos_da_campanha(atual["avisos"] if atual else None), **limpo}
        connection.execute(
            """
            INSERT INTO campanha_agenda (campanha_id, avisos) VALUES (%s, %s)
            ON CONFLICT (campanha_id) DO UPDATE SET avisos=EXCLUDED.avisos, atualizado_em=CURRENT_TIMESTAMP
            """,
            (campanha_id, Jsonb(novos)),
        )
    return {"avisos": novos, "avisos_rotulos": ROTULOS_AVISO}


# ------------------------------------------------------------------ resumo

@router.get("/{campanha_id}/resumo")
def resumo_da_home(
    campanha_id: UUID,
    user: AuthenticatedUser = Depends(get_current_user),
    database: Database = Depends(get_database),
):
    """O que a Home mostra do lado da campanha: próxima sessão e novidades da mesa."""
    with database.connection() as connection:
        acesso = campaign_access(connection, campanha_id, user.id)
        gestor = acesso.manages_content
        agora = _agora()
        agenda = _agenda(connection, campanha_id)
        visita = connection.execute(
            "SELECT visto_em FROM visitas_campanha WHERE usuario_id=%s AND campanha_id=%s",
            (user.id, campanha_id),
        ).fetchone()
        visto_em = visita["visto_em"] if visita else None
        ao_vivo = connection.execute(
            "SELECT id, titulo FROM sessoes_mesa WHERE campanha_id=%s AND status='aberta'",
            (campanha_id,),
        ).fetchone()

        mudancas: dict = {"desde": visto_em.isoformat() if visto_em else None, "primeira_visita": visto_em is None}
        conquistas_novas: list[dict] = []
        if visto_em:
            mural_novo = connection.execute(
                """
                SELECT COUNT(*) AS total FROM mural_itens
                WHERE campanha_id=%s AND criado_em > %s AND usuario_id IS DISTINCT FROM %s
                """,
                (campanha_id, visto_em, user.id),
            ).fetchone()
            sessoes_novas = connection.execute(
                """
                SELECT COUNT(*) AS total FROM sessoes_mesa
                WHERE campanha_id=%s AND status='encerrada' AND encerrada_em > %s
                """,
                (campanha_id, visto_em),
            ).fetchone()
            nao_lidas = connection.execute(
                "SELECT COUNT(*) AS total FROM notificacoes WHERE usuario_id=%s AND campanha_id=%s AND lida_em IS NULL",
                (user.id, campanha_id),
            ).fetchone()
            for linha in connection.execute(
                """
                SELECT pc.chave, pc.desbloqueada_em, p.nome
                FROM personagem_conquistas pc
                JOIN personagens p ON p.id = pc.personagem_id
                WHERE p.campanha_id=%s AND p.dono_usuario_id=%s AND pc.desbloqueada_em > %s
                ORDER BY pc.desbloqueada_em DESC LIMIT 6
                """,
                (campanha_id, user.id, visto_em),
            ).fetchall():
                conquista = POR_CHAVE.get(linha["chave"])
                if conquista:
                    conquistas_novas.append({
                        "chave": conquista.chave, "nome": conquista.nome, "descricao": conquista.descricao,
                        "raridade": conquista.raridade, "personagem": linha["nome"],
                    })
            mudancas.update({
                "mural": int(mural_novo["total"]),
                "sessoes_encerradas": int(sessoes_novas["total"]),
                "avisos_nao_lidos": int(nao_lidas["total"]),
            })

        frase = connection.execute(
            """
            SELECT i.texto, i.autor_nome,
                   (SELECT COUNT(*) FROM mural_votos v WHERE v.item_id = i.id) AS votos
            FROM mural_itens i
            WHERE i.campanha_id=%s AND i.tipo='citacao'
            ORDER BY votos DESC, i.criado_em DESC LIMIT 1
            """,
            (campanha_id,),
        ).fetchone()

    return {
        "proxima_sessao": _proxima_para_a_tela(agenda, agora),
        "recorrencia_texto": agenda_regras.texto_da_recorrencia(agenda["recorrencia"]),
        "ao_vivo": {"sessao_id": str(ao_vivo["id"]), "titulo": ao_vivo["titulo"]} if ao_vivo else None,
        "mudancas": mudancas,
        "conquistas_novas": conquistas_novas,
        "frase_do_mural": {"texto": frase["texto"], "autor": frase["autor_nome"], "votos": int(frase["votos"])} if frase else None,
        "gestor": gestor,
    }


@router.post("/{campanha_id}/visita", status_code=status.HTTP_204_NO_CONTENT)
def marcar_visita(
    campanha_id: UUID,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    """Marca "vi tudo até agora": é o que zera o "o que mudou" da próxima visita."""
    with database.connection() as connection:
        campaign_access(connection, campanha_id, user.id)
        connection.execute(
            """
            INSERT INTO visitas_campanha (usuario_id, campanha_id, visto_em)
            VALUES (%s, %s, CURRENT_TIMESTAMP)
            ON CONFLICT (usuario_id, campanha_id) DO UPDATE SET visto_em = CURRENT_TIMESTAMP
            """,
            (user.id, campanha_id),
        )
    return None


# ------------------------------------------------------------------- mural

class CitacaoInput(BaseModel):
    texto: str = Field(min_length=1, max_length=300)
    quem_disse: str = Field(default="", max_length=60)


class FotoInput(BaseModel):
    imagem: str = Field(min_length=20, max_length=TAMANHO_MAXIMO_FOTO)
    legenda: str = Field(default="", max_length=140)


def _item_mural(linha: dict, usuario_id: UUID, gestor: bool) -> dict:
    return {
        "id": str(linha["id"]),
        "tipo": linha["tipo"],
        "texto": linha["texto"],
        "imagem": linha["imagem"],
        "autor": linha["autor_nome"],
        "publicado_por": linha["publicador"],
        "sessao_id": str(linha["sessao_id"]) if linha["sessao_id"] else None,
        "criado_em": linha["criado_em"].isoformat(),
        "votos": int(linha["votos"]),
        "votei": bool(linha["votei"]),
        "meu": linha["usuario_id"] == usuario_id,
        "pode_apagar": gestor or linha["usuario_id"] == usuario_id,
        "melhor_da_noite": False,
    }


@router.get("/{campanha_id}/mural")
def listar_mural(
    campanha_id: UUID,
    user: AuthenticatedUser = Depends(get_current_user),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        acesso = campaign_access(connection, campanha_id, user.id)
        linhas = connection.execute(
            """
            SELECT i.id, i.tipo, i.texto, i.imagem, i.autor_nome, i.sessao_id, i.criado_em, i.usuario_id,
                   COALESCE(u.nome_exibicao, i.autor_nome) AS publicador,
                   (SELECT COUNT(*) FROM mural_votos v WHERE v.item_id = i.id) AS votos,
                   EXISTS (SELECT 1 FROM mural_votos v WHERE v.item_id = i.id AND v.usuario_id = %s) AS votei
            FROM mural_itens i LEFT JOIN usuarios u ON u.id = i.usuario_id
            WHERE i.campanha_id=%s
            ORDER BY i.criado_em DESC LIMIT %s
            """,
            (user.id, campanha_id, LIMITE_MURAL),
        ).fetchall()
    itens = [_item_mural(dict(linha), user.id, acesso.manages_content) for linha in linhas]
    # "Melhor frase da noite": a citação mais curtida de cada sessão, se alguém curtiu.
    melhores: dict[str, dict] = {}
    for item in itens:
        if item["tipo"] == "citacao" and item["sessao_id"] and item["votos"] > 0:
            atual = melhores.get(item["sessao_id"])
            if atual is None or item["votos"] > atual["votos"]:
                melhores[item["sessao_id"]] = item
    for item in melhores.values():
        item["melhor_da_noite"] = True
    return {"itens": itens}


@router.post("/{campanha_id}/mural/citacoes", status_code=status.HTTP_201_CREATED)
def publicar_citacao(
    campanha_id: UUID,
    payload: CitacaoInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        acesso = campaign_access(connection, campanha_id, user.id)
        if acesso.role == "observador":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="observadores nao publicam no mural")
        sessao = _sessao_recente(connection, campanha_id)
        item_id = uuid4()
        connection.execute(
            """
            INSERT INTO mural_itens (id, campanha_id, sessao_id, usuario_id, autor_nome, tipo, texto)
            VALUES (%s, %s, %s, %s, %s, 'citacao', %s)
            """,
            (
                item_id, campanha_id, sessao["id"] if sessao else None, user.id,
                _texto(payload.quem_disse, 60, "quem disse", obrigatorio=False) or user.nome_exibicao,
                _texto(payload.texto, 300, "frase"),
            ),
        )
        avisar_discord(connection, campanha_id, "mural", f"💬 **Frase nova no mural**: “{_texto(payload.texto, 200, 'frase')}”")
    return {"id": str(item_id)}


@router.post("/{campanha_id}/mural/fotos", status_code=status.HTTP_201_CREATED)
def publicar_foto(
    campanha_id: UUID,
    payload: FotoInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    if not payload.imagem.startswith(PREFIXOS_FOTO):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="a foto precisa ser JPG, PNG ou WebP")
    with database.connection() as connection:
        acesso = campaign_access(connection, campanha_id, user.id)
        if acesso.role == "observador":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="observadores nao publicam no mural")
        total = connection.execute(
            "SELECT COUNT(*) AS total FROM mural_itens WHERE campanha_id=%s AND tipo='foto'", (campanha_id,)
        ).fetchone()["total"]
        if total >= LIMITE_FOTOS:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"o mural guarda ate {LIMITE_FOTOS} fotos; apague alguma antes")
        sessao = _sessao_recente(connection, campanha_id)
        item_id = uuid4()
        connection.execute(
            """
            INSERT INTO mural_itens (id, campanha_id, sessao_id, usuario_id, autor_nome, tipo, texto, imagem)
            VALUES (%s, %s, %s, %s, %s, 'foto', %s, %s)
            """,
            (item_id, campanha_id, sessao["id"] if sessao else None, user.id, user.nome_exibicao,
             _texto(payload.legenda, 140, "legenda", obrigatorio=False), payload.imagem),
        )
    return {"id": str(item_id)}


@router.delete("/{campanha_id}/mural/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def apagar_item_do_mural(
    campanha_id: UUID,
    item_id: UUID,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        acesso = campaign_access(connection, campanha_id, user.id)
        item = connection.execute(
            "SELECT usuario_id FROM mural_itens WHERE id=%s AND campanha_id=%s", (item_id, campanha_id)
        ).fetchone()
        if not item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="item nao encontrado")
        if not acesso.manages_content and item["usuario_id"] != user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="so quem publicou ou o Mestre apaga")
        connection.execute("DELETE FROM mural_itens WHERE id=%s", (item_id,))
    return None


@router.post("/{campanha_id}/mural/{item_id}/voto")
def alternar_voto(
    campanha_id: UUID,
    item_id: UUID,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    """Curtir ou tirar a curtida. A citação mais curtida da noite ganha o selo."""
    with database.connection() as connection:
        campaign_access(connection, campanha_id, user.id)
        item = connection.execute(
            "SELECT id FROM mural_itens WHERE id=%s AND campanha_id=%s", (item_id, campanha_id)
        ).fetchone()
        if not item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="item nao encontrado")
        removido = connection.execute(
            "DELETE FROM mural_votos WHERE item_id=%s AND usuario_id=%s", (item_id, user.id)
        ).rowcount
        if not removido:
            connection.execute("INSERT INTO mural_votos (item_id, usuario_id) VALUES (%s, %s)", (item_id, user.id))
        votos = connection.execute("SELECT COUNT(*) AS total FROM mural_votos WHERE item_id=%s", (item_id,)).fetchone()["total"]
    return {"votos": int(votos), "votei": not removido}


# --------------------------------------------------------------------- MVP

class MvpInput(BaseModel):
    sessao_id: UUID
    alvo_usuario_id: UUID


def _jogadores(connection, campanha_id: UUID) -> dict[UUID, str]:
    return {
        linha["usuario_id"]: linha["nome_exibicao"]
        for linha in connection.execute(
            """
            SELECT m.usuario_id, u.nome_exibicao FROM membros_campanha m
            JOIN usuarios u ON u.id = m.usuario_id
            WHERE m.campanha_id=%s AND m.status='ativo' AND m.papel='jogador'
            ORDER BY u.nome_exibicao
            """,
            (campanha_id,),
        ).fetchall()
    }


def _resposta_mvp(connection, campanha_id: UUID, sessao_id: UUID, usuario_id: UUID, gestor: bool) -> dict:
    jogadores = _jogadores(connection, campanha_id)
    votos = connection.execute(
        "SELECT votante_id, alvo_usuario_id FROM mvp_votos WHERE sessao_id=%s", (sessao_id,)
    ).fetchall()
    meu = next((str(v["alvo_usuario_id"]) for v in votos if v["votante_id"] == usuario_id), None)
    sessao = connection.execute("SELECT status FROM sessoes_mesa WHERE id=%s", (sessao_id,)).fetchone()
    # O resultado só aparece para quem já votou, para o Mestre ou com a sessão encerrada:
    # ver o placar antes de votar puxa o voto para o líder.
    mostrar = bool(meu) or gestor or (sessao and sessao["status"] == "encerrada")
    resposta = {
        "sessao_id": str(sessao_id),
        "candidatos": [{"usuario_id": str(uid), "nome": nome} for uid, nome in jogadores.items()],
        "meu_voto": meu,
        "votaram": len(votos),
        "total_eleitores": len(jogadores),
        "resultado": None,
    }
    if mostrar:
        resposta["resultado"] = resultado_mvp([
            {"alvo_usuario_id": v["alvo_usuario_id"], "alvo_nome": jogadores.get(v["alvo_usuario_id"], "?")} for v in votos
        ])
    return resposta


@router.get("/{campanha_id}/mvp/{sessao_id}")
def ver_mvp(
    campanha_id: UUID,
    sessao_id: UUID,
    user: AuthenticatedUser = Depends(get_current_user),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        acesso = campaign_access(connection, campanha_id, user.id)
        sessao = connection.execute(
            "SELECT status FROM sessoes_mesa WHERE id=%s AND campanha_id=%s", (sessao_id, campanha_id)
        ).fetchone()
        if not sessao or (sessao["status"] == "preparacao" and not acesso.manages_content):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="sessao nao encontrada")
        return _resposta_mvp(connection, campanha_id, sessao_id, user.id, acesso.manages_content)


@router.post("/{campanha_id}/mvp")
def votar_mvp(
    campanha_id: UUID,
    payload: MvpInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        acesso = campaign_access(connection, campanha_id, user.id)
        sessao = connection.execute(
            "SELECT status FROM sessoes_mesa WHERE id=%s AND campanha_id=%s", (payload.sessao_id, campanha_id)
        ).fetchone()
        if not sessao or sessao["status"] == "preparacao":
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="sessao nao encontrada")
        jogadores = _jogadores(connection, campanha_id)
        if user.id not in jogadores:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="so jogadores votam no MVP")
        if payload.alvo_usuario_id not in jogadores:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="o MVP precisa ser um jogador da campanha")
        if payload.alvo_usuario_id == user.id:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="voto em si mesmo nao vale; escolha outra pessoa")
        connection.execute(
            """
            INSERT INTO mvp_votos (sessao_id, votante_id, alvo_usuario_id) VALUES (%s, %s, %s)
            ON CONFLICT (sessao_id, votante_id) DO UPDATE SET alvo_usuario_id=EXCLUDED.alvo_usuario_id, criado_em=CURRENT_TIMESTAMP
            """,
            (payload.sessao_id, user.id, payload.alvo_usuario_id),
        )
        return _resposta_mvp(connection, campanha_id, payload.sessao_id, user.id, acesso.manages_content)


# -------------------------------------------------------------------- rank

@router.get("/{campanha_id}/rank")
def rank_da_mesa(
    campanha_id: UUID,
    periodo: str = Query(default="campanha", pattern="^(campanha|ultima|atual)$"),
    user: AuthenticatedUser = Depends(get_current_user),
    database: Database = Depends(get_database),
):
    """Números da mesa em tom de brincadeira. `periodo`: a campanha toda, a
    última sessão encerrada ou a que está rolando agora."""
    with database.connection() as connection:
        campaign_access(connection, campanha_id, user.id)
        sessao = None
        if periodo == "atual":
            sessao = connection.execute(
                "SELECT id, iniciada_em, encerrada_em FROM sessoes_mesa WHERE campanha_id=%s AND status='aberta'",
                (campanha_id,),
            ).fetchone()
        elif periodo == "ultima":
            sessao = connection.execute(
                """
                SELECT id, iniciada_em, encerrada_em FROM sessoes_mesa
                WHERE campanha_id=%s AND status='encerrada' ORDER BY encerrada_em DESC LIMIT 1
                """,
                (campanha_id,),
            ).fetchone()
        if periodo != "campanha" and not sessao:
            return {"periodo": periodo, "sessao": None, "jogadores": [], "titulos": []}

        sessao_id = sessao["id"] if sessao else None
        inicio = sessao["iniciada_em"] if sessao else None
        fim = (sessao["encerrada_em"] if sessao else None) or _agora()

        personagens = connection.execute(
            """
            SELECT p.id, p.nome FROM personagens p
            JOIN membros_campanha m ON m.usuario_id = p.dono_usuario_id AND m.campanha_id = p.campanha_id
            WHERE p.campanha_id=%s AND p.status='ativo' AND m.status='ativo' AND m.papel='jogador'
            """,
            (campanha_id,),
        ).fetchall()
        registros = {
            linha["personagem_id"]: linha
            for linha in connection.execute(
                """
                SELECT personagem_id,
                    COUNT(*) FILTER (WHERE tipo='rolagem') AS rolagens,
                    COUNT(*) FILTER (WHERE tipo='rolagem' AND detalhes->>'critico_natural'='true') AS criticos,
                    COUNT(*) FILTER (WHERE tipo='rolagem' AND detalhes->>'falha_natural'='true') AS falhas,
                    COALESCE(MAX(resultado) FILTER (WHERE tipo='dano'), 0) AS dano_maximo,
                    COALESCE(SUM(resultado) FILTER (WHERE tipo='dano'), 0) AS dano_total,
                    COUNT(*) FILTER (WHERE tipo IN ('poder', 'habilidade', 'magia')) AS usos
                FROM registros_mesa
                WHERE campanha_id=%s AND personagem_id IS NOT NULL
                  AND (%s::uuid IS NULL OR sessao_id=%s)
                GROUP BY personagem_id
                """,
                (campanha_id, sessao_id, sessao_id),
            ).fetchall()
        }
        dinheiro = {
            linha["personagem_id"]: linha
            for linha in connection.execute(
                """
                SELECT personagem_id,
                    COALESCE(SUM(-delta) FILTER (WHERE delta < 0), 0) AS gastos,
                    COALESCE(SUM(delta) FILTER (WHERE delta > 0), 0) AS ganhos
                FROM lancamentos_economia
                WHERE campanha_id=%s AND lower(moeda)='lunaris'
                  AND (%s::timestamptz IS NULL OR (criado_em >= %s AND criado_em <= %s))
                GROUP BY personagem_id
                """,
                (campanha_id, inicio, inicio, fim),
            ).fetchall()
        }

    linhas = []
    for personagem in personagens:
        registro = registros.get(personagem["id"]) or {}
        caixa = dinheiro.get(personagem["id"]) or {}
        linhas.append({
            "personagem_id": personagem["id"],
            "nome": personagem["nome"],
            "rolagens": registro.get("rolagens", 0),
            "criticos": registro.get("criticos", 0),
            "falhas": registro.get("falhas", 0),
            "dano_maximo": registro.get("dano_maximo", 0),
            "dano_total": registro.get("dano_total", 0),
            "usos": registro.get("usos", 0),
            "lunaris_gastos": caixa.get("gastos", 0),
            "lunaris_ganhos": caixa.get("ganhos", 0),
        })
    return {"periodo": periodo, "sessao": str(sessao_id) if sessao_id else None, **montar_rank(linhas)}
