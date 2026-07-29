"""Roteamento dos avisos econômicos recebidos do Banqueiro."""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE))

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


def test_avisos_do_banqueiro_usam_o_canal_de_dinheiro():
    db = _DBFake()
    canal = _CanalFake()
    cog = _criar_cog(db, canal)

    asyncio.run(cog._publicar_guild("123"))

    assert db.rotas_consultadas == [("123", "dinheiro")]
    assert db.publicados == [7]
    assert len(canal.embeds) == 1


def test_aviso_usa_o_design_system_em_vez_de_embed_cru():
    """Regressão: avisos.py montava discord.Embed() cru com laranja fixo e
    repetia a marca do bot na mão em vez de usar ui.embed()/ui.MARCA."""
    db = _DBFake()
    canal = _CanalFake()
    cog = _criar_cog(db, canal)

    asyncio.run(cog._publicar_guild("123"))

    emb = canal.embeds[0]
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
