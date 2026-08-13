"""Roteamento dos avisos econômicos recebidos do Banqueiro.

P14 da auditoria 2026-08: a entrega deixou de ser `canal.send()` direto e
passou a ser `publicacoes.publicar_ou_enfileirar` (fila durável) — os testes
que inspecionavam o canal diretamente passaram a inspecionar a chamada à
fila. O comportamento da fila em si (retry, backoff, dedupe) já tem
cobertura própria em test_novas_automacoes.py e test_loteria.py."""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE))

import cogs.avisos as avisos_mod
from cogs.avisos import Avisos
from cogs.jornal import CATEGORIAS_CANAL
from core import ui


class _CanalFake:
    def __init__(self):
        self.embeds = []

    async def send(self, *, embed):
        self.embeds.append(embed)


class _DBFake:
    def __init__(self, canal_id="99"):
        self.canal_id = canal_id
        self.rotas_consultadas = []
        self.publicados = []

    def automacao_ativa(self, guild_id, tipo, padrao=True):
        return True

    def get_canal_categoria(self, guild_id, categoria):
        self.rotas_consultadas.append((guild_id, categoria))
        return self.canal_id

    def listar_avisos_pendentes(self, guild_id):
        return [{"id": 7, "mensagem": "O cofre rendeu juros."}]

    def marcar_aviso_publicado(self, aviso_id):
        self.publicados.append(aviso_id)


def _criar_cog(db, canal):
    cog = object.__new__(Avisos)
    cog.bot = type(
        "BotFake",
        (),
        {"db": db, "get_channel": lambda self, canal_id: canal if canal_id == 99 else None},
    )()
    return cog


def test_categoria_dinheiro_aparece_no_jornal_canal():
    assert any(
        escolha.value == "dinheiro" and escolha.name == "Dinheiro e economia"
        for escolha in CATEGORIAS_CANAL
    )


def test_avisos_do_banqueiro_usam_o_canal_de_dinheiro(monkeypatch):
    chamadas = []

    async def _fake_publicar_ou_enfileirar(bot, **kwargs):
        chamadas.append(kwargs)
        return "entregue"

    monkeypatch.setattr(avisos_mod.publicacoes, "publicar_ou_enfileirar", _fake_publicar_ou_enfileirar)

    db = _DBFake()
    canal = _CanalFake()
    cog = _criar_cog(db, canal)

    asyncio.run(cog._publicar_guild("123"))

    assert db.rotas_consultadas == [("123", "dinheiro")]
    assert db.publicados == [7]
    assert len(chamadas) == 1
    assert chamadas[0]["guild_id"] == "123"
    assert chamadas[0]["categoria"] == "dinheiro"
    assert chamadas[0]["dedupe_key"] == "aviso:7"
    assert chamadas[0]["automacao"] == "avisos_economicos"


def test_aviso_usa_o_design_system_em_vez_de_embed_cru(monkeypatch):
    """Regressão: avisos.py montava discord.Embed() cru com laranja fixo e
    repetia a marca do bot na mão em vez de usar ui.embed()/ui.MARCA."""
    chamadas = []

    async def _fake_publicar_ou_enfileirar(bot, **kwargs):
        chamadas.append(kwargs)
        return "entregue"

    monkeypatch.setattr(avisos_mod.publicacoes, "publicar_ou_enfileirar", _fake_publicar_ou_enfileirar)

    db = _DBFake()
    canal = _CanalFake()
    cog = _criar_cog(db, canal)

    asyncio.run(cog._publicar_guild("123"))

    emb = chamadas[0]["embed"]
    assert emb.footer.text == ui.MARCA
    assert emb.description == "O cofre rendeu juros."
    assert not emb.title


def test_sem_destino_avisos_continuam_pendentes():
    db = _DBFake(canal_id=None)
    canal = _CanalFake()
    cog = _criar_cog(db, canal)

    asyncio.run(cog._publicar_guild("123"))

    assert db.rotas_consultadas == [("123", "dinheiro")]
    assert db.publicados == []
    assert canal.embeds == []


def test_falha_ao_enfileirar_nao_marca_aviso_como_publicado(monkeypatch):
    """P14: durabilidade exige que marcar_aviso_publicado só rode depois que
    a fila aceitar o aviso — se o enfileiramento em si falhar (ex.: banco
    fora do ar), o aviso tem que continuar pendente pro próximo minuto
    tentar de novo, nunca sumir como se tivesse sido publicado."""
    async def _fake_publicar_ou_enfileirar_com_falha(bot, **kwargs):
        raise RuntimeError("o PostgreSQL nao respondeu")

    monkeypatch.setattr(
        avisos_mod.publicacoes, "publicar_ou_enfileirar", _fake_publicar_ou_enfileirar_com_falha
    )

    db = _DBFake()
    canal = _CanalFake()
    cog = _criar_cog(db, canal)

    asyncio.run(cog._publicar_guild("123"))

    assert db.publicados == []
