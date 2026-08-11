"""Configuração simplificada e ciclos que só confirmam publicação real."""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE))

from cogs.jornal import Jornal


class _Permissoes:
    view_channel = True
    send_messages = True
    embed_links = True


class _GuildCanal:
    me = object()


class _Canal:
    def __init__(self, canal_id):
        self.id = canal_id
        self.mention = f"<#{canal_id}>"
        self.guild = _GuildCanal()

    def permissions_for(self, _membro):
        return _Permissoes()


class _Resposta:
    def __init__(self):
        self.mensagens = []

    async def send_message(self, texto=None, **kwargs):
        self.mensagens.append((texto, kwargs))


class _Interacao:
    guild_id = 100

    def __init__(self):
        self.response = _Resposta()


class _DB:
    def __init__(self):
        self.principal = None
        self.rotas = {}
        self.baus = []
        self.marcados = []

    def set_jornal_canal(self, gid, canal_id):
        self.principal = (gid, canal_id)

    def set_canal_categoria(self, gid, categoria, canal_id):
        self.rotas[categoria] = (gid, canal_id)

    def adicionar_bau_canal(self, gid, canal_id):
        self.baus.append((gid, canal_id))

    def listar_guilds_clima_auto(self):
        return ["1", "2"]

    def ciclo_guild_devido(self, *_args):
        return True

    def marcar_ciclo_guild(self, gid, ciclo):
        self.marcados.append((gid, ciclo))


def _cog(db):
    cog = object.__new__(Jornal)
    cog.bot = type("Bot", (), {"db": db})()
    return cog


def test_configurar_aplica_canais_em_uma_unica_execucao():
    db = _DB()
    cog = _cog(db)
    interacao = _Interacao()
    asyncio.run(
        Jornal.configurar.callback(
            cog,
            interacao,
            principal=_Canal(10),
            noticias=_Canal(11),
            clima=_Canal(12),
            dinheiro=None,
            chegadas=None,
            saidas=None,
            baus=_Canal(13),
        )
    )

    assert db.principal == ("100", "10")
    assert db.rotas == {"noticia": ("100", "11"), "clima": ("100", "12")}
    assert db.baus == [("100", "13")]
    assert "status" in interacao.response.mensagens[0][0]


def test_clima_automatico_so_marca_ciclo_quando_publica():
    db = _DB()
    cog = _cog(db)
    publicados = []

    async def publicar(gid):
        publicados.append(gid)
        return gid == "2"

    cog._publicar_clima_auto = publicar
    asyncio.run(Jornal.ciclo_clima.coro(cog))

    assert publicados == ["1", "2"]
    assert db.marcados == [("2", "clima_auto")]
