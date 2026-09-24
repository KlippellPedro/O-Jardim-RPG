"""Calendário do mundo e estações (regras em core/calendario.py).

Qualquer membro da campanha lê; só o Mestre (e o criador da plataforma) escreve. O que o
jogador recebe já vem recortado: evento oculto não aparece, evento rasurado
chega sem título nem texto.
"""

from __future__ import annotations

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from psycopg.types.json import Jsonb
from pydantic import BaseModel, Field

from core import calendario as regras
from core.calendario import ErroCalendario
from core.database import Database
from core.discord_avisos import avisar_discord
from core.notifications import campaign_member_ids, notify
from core.dependencies import (
    AuthenticatedUser,
    campaign_access,
    get_current_user,
    get_database,
    require_campaign_master,
    require_csrf,
)

log = logging.getLogger(__name__)
router = APIRouter(prefix="/calendario", tags=["calendario"])


class HojeInput(BaseModel):
    ano: int
    mes: int
    dia: int


class AvancarInput(BaseModel):
    dias: int = Field(ge=-3650, le=3650)


class EstacaoEspecialInput(BaseModel):
    estacao: str | None = None


class ConfigInput(BaseModel):
    meses: list[str] | None = Field(default=None, max_length=regras.MESES_POR_ANO)
    sincronizar_discord: bool | None = None
    eventos_desligados: list[str] | None = Field(default=None, max_length=50)


class DiaExtraInput(BaseModel):
    mes: int
    nome: str = Field(min_length=1, max_length=40)
    descricao: str = Field(default="", max_length=300)


class EventoInput(BaseModel):
    titulo: str = Field(min_length=1, max_length=80)
    nota: str = Field(default="", max_length=600)
    mes: int
    dia: int
    ano: int | None = None
    anual: bool = False
    repeticao: str | None = None
    duracao: int = Field(default=1, ge=1, le=28)
    revelacao: str = "rasurado"


class EventoEdicaoInput(BaseModel):
    titulo: str | None = Field(default=None, max_length=80)
    nota: str | None = Field(default=None, max_length=600)
    mes: int | None = None
    dia: int | None = None
    ano: int | None = None
    anual: bool | None = None
    repeticao: str | None = None
    duracao: int | None = Field(default=None, ge=1, le=28)
    revelacao: str | None = None


def _erro(erro: ErroCalendario) -> HTTPException:
    return HTTPException(status_code=erro.codigo, detail=erro.mensagem)


def _ler(connection, campanha_id: UUID, *, travar: bool = False) -> dict:
    linha = connection.execute(
        f"SELECT estado FROM campanha_calendario WHERE campanha_id=%s{' FOR UPDATE' if travar else ''}",
        (campanha_id,),
    ).fetchone()
    return regras.completar(linha["estado"] if linha else None)


def _gravar(connection, campanha_id: UUID, estado: dict) -> None:
    connection.execute(
        """
        INSERT INTO campanha_calendario (campanha_id, estado) VALUES (%s, %s)
        ON CONFLICT (campanha_id) DO UPDATE SET estado=EXCLUDED.estado, atualizado_em=CURRENT_TIMESTAMP
        """,
        (campanha_id, Jsonb(estado)),
    )


def _sincronizar_discord(connection, campanha_id: UUID, antes: str, estado: dict) -> None:
    """Mantém a estação do Jornalista igual à do calendário (ela muda o loot sazonal). Nunca levanta."""
    depois = regras.estacao_atual(estado)
    sincronizar = bool(estado["config"].get("sincronizar_discord", True))
    try:
        with connection.transaction():
            linha = connection.execute(
                "SELECT discord_guild_id FROM campanhas_discord WHERE campanha_id=%s", (campanha_id,)
            ).fetchone()
            tabela = connection.execute("SELECT to_regclass('estacao') AS tabela").fetchone()
            if not linha or not tabela or not tabela["tabela"]:
                return
            # A coluna nasce no bot; garantimos aqui também para a ordem de subida não importar.
            connection.execute(
                "ALTER TABLE estacao ADD COLUMN IF NOT EXISTS gerida_pelo_site BOOLEAN NOT NULL DEFAULT FALSE"
            )
            if sincronizar:
                connection.execute(
                    """
                    INSERT INTO estacao (guild_id, nome, gerida_pelo_site) VALUES (%s, %s, TRUE)
                    ON CONFLICT (guild_id) DO UPDATE SET nome=EXCLUDED.nome, gerida_pelo_site=TRUE
                    """,
                    (linha["discord_guild_id"], depois),
                )
            else:
                # Soltou: o bot volta a mandar na estação (o nome que está lá fica como está).
                connection.execute(
                    "UPDATE estacao SET gerida_pelo_site=FALSE WHERE guild_id=%s", (linha["discord_guild_id"],)
                )
    except Exception:  # noqa: BLE001 - sincronizar é cortesia, nunca derruba a ação do Mestre
        log.exception("Falha ao sincronizar a estacao com o Discord (campanha %s)", campanha_id)


def _ids_abertos(estado: dict) -> set[str]:
    return {evento["id"] for evento in estado["eventos"] if evento.get("revelacao") == "aberto"}


def _avisar_a_mesa(connection, campanha_id: UUID, user: AuthenticatedUser, estacao_antes: str, abertos_antes: set[str], estado: dict) -> None:
    """Mudou a estação ou um acontecimento foi aberto: a mesa recebe um aviso no site e no Discord."""
    mensagens: list[tuple[str, str]] = []
    estacao_depois = regras.estacao_atual(estado)
    if estacao_depois != estacao_antes:
        rotulo = regras.ESTACOES[estacao_depois]["rotulo"]
        mensagens.append((f"A estação mudou: {rotulo}", regras.ESTACOES[estacao_depois]["descricao"]))
    revelados = [
        evento for evento in estado["eventos"]
        if evento.get("revelacao") == "aberto" and evento["id"] not in abertos_antes
    ]
    if revelados:
        titulo = revelados[0]["titulo"] if len(revelados) == 1 else f"{len(revelados)} acontecimentos"
        mensagens.append((f"Calendário: {titulo}", "O Mestre revelou um acontecimento do calendário do mundo."))
    for titulo, texto in mensagens:
        try:
            with connection.transaction():
                notify(
                    connection,
                    user_ids=campaign_member_ids(connection, campanha_id),
                    category="campanha",
                    title=titulo,
                    message=texto,
                    campaign_id=campanha_id,
                    actor_user_id=user.id,
                )
                avisar_discord(connection, campanha_id, "liberacao", f"📅 **{titulo}**. {texto}")
        except Exception:  # noqa: BLE001 - aviso é cortesia
            log.exception("Falha ao avisar a mesa sobre o calendario (campanha %s)", campanha_id)


def _alterar(campanha_id: UUID, user: AuthenticatedUser, database: Database, mudar) -> dict:
    """Trava o calendário, aplica `mudar(estado)`, grava, sincroniza e devolve a visão do Mestre."""
    with database.connection() as connection:
        require_campaign_master(connection, campanha_id, user.id)
        estado = _ler(connection, campanha_id, travar=True)
        estacao_antes = regras.estacao_atual(estado)
        abertos_antes = _ids_abertos(estado)
        try:
            mudar(estado)
        except ErroCalendario as erro:
            raise _erro(erro) from erro
        _gravar(connection, campanha_id, estado)
        _sincronizar_discord(connection, campanha_id, estacao_antes, estado)
        _avisar_a_mesa(connection, campanha_id, user, estacao_antes, abertos_antes, estado)
    return regras.visao(estado, gestor=True)


@router.get("/{campanha_id}")
def obter(
    campanha_id: UUID,
    ano: int | None = Query(default=None, ge=-99999, le=99999),
    mes: int | None = Query(default=None, ge=0, le=regras.MESES_POR_ANO - 1),
    user: AuthenticatedUser = Depends(get_current_user),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        acesso = campaign_access(connection, campanha_id, user.id)
        if not acesso.manages_content:
            campanha = connection.execute("SELECT configuracoes FROM campanhas WHERE id=%s", (campanha_id,)).fetchone()
            if campanha and isinstance(campanha["configuracoes"], dict) and campanha["configuracoes"].get("calendario_oculto") is True:
                raise HTTPException(status_code=403, detail="o calendario do mundo ainda nao foi liberado")
        estado = _ler(connection, campanha_id)
    return regras.visao(estado, gestor=acesso.is_master, ano=ano, mes=mes)


@router.put("/{campanha_id}/hoje")
def definir_hoje(campanha_id: UUID, payload: HojeInput, user: AuthenticatedUser = Depends(require_csrf), database: Database = Depends(get_database)):
    return _alterar(campanha_id, user, database, lambda estado: regras.definir_hoje(estado, payload.model_dump()))


@router.post("/{campanha_id}/avancar")
def avancar(campanha_id: UUID, payload: AvancarInput, user: AuthenticatedUser = Depends(require_csrf), database: Database = Depends(get_database)):
    return _alterar(campanha_id, user, database, lambda estado: regras.avancar(estado, payload.dias))


@router.post("/{campanha_id}/dias-extras")
def criar_dia_extra(campanha_id: UUID, payload: DiaExtraInput, user: AuthenticatedUser = Depends(require_csrf), database: Database = Depends(get_database)):
    return _alterar(campanha_id, user, database, lambda estado: regras.criar_dia_extra(estado, payload.model_dump()))


@router.delete("/{campanha_id}/dias-extras/{mes}")
def apagar_dia_extra(campanha_id: UUID, mes: int, user: AuthenticatedUser = Depends(require_csrf), database: Database = Depends(get_database)):
    return _alterar(campanha_id, user, database, lambda estado: regras.apagar_dia_extra(estado, mes))


@router.post("/{campanha_id}/desfazer")
def desfazer(campanha_id: UUID, user: AuthenticatedUser = Depends(require_csrf), database: Database = Depends(get_database)):
    return _alterar(campanha_id, user, database, regras.desfazer)


@router.post("/{campanha_id}/revelar-passados")
def revelar_passados(campanha_id: UUID, user: AuthenticatedUser = Depends(require_csrf), database: Database = Depends(get_database)):
    return _alterar(campanha_id, user, database, regras.revelar_passados)


@router.put("/{campanha_id}/estacao-especial")
def estacao_especial(campanha_id: UUID, payload: EstacaoEspecialInput, user: AuthenticatedUser = Depends(require_csrf), database: Database = Depends(get_database)):
    return _alterar(campanha_id, user, database, lambda estado: regras.definir_estacao_especial(estado, payload.estacao))


@router.put("/{campanha_id}/config")
def definir_config(campanha_id: UUID, payload: ConfigInput, user: AuthenticatedUser = Depends(require_csrf), database: Database = Depends(get_database)):
    return _alterar(campanha_id, user, database, lambda estado: regras.definir_config(estado, payload.model_dump(exclude_none=True)))


@router.post("/{campanha_id}/eventos")
def criar_evento(campanha_id: UUID, payload: EventoInput, user: AuthenticatedUser = Depends(require_csrf), database: Database = Depends(get_database)):
    return _alterar(campanha_id, user, database, lambda estado: regras.adicionar_evento(estado, payload.model_dump()))


@router.patch("/{campanha_id}/eventos/{evento_id}")
def editar_evento(campanha_id: UUID, evento_id: str, payload: EventoEdicaoInput, user: AuthenticatedUser = Depends(require_csrf), database: Database = Depends(get_database)):
    return _alterar(campanha_id, user, database, lambda estado: regras.editar_evento(estado, evento_id, payload.model_dump(exclude_none=True)))


@router.delete("/{campanha_id}/eventos/{evento_id}")
def apagar_evento(campanha_id: UUID, evento_id: str, user: AuthenticatedUser = Depends(require_csrf), database: Database = Depends(get_database)):
    return _alterar(campanha_id, user, database, lambda estado: regras.apagar_evento(estado, evento_id))
