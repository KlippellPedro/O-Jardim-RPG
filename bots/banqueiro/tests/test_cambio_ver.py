"""/cambio_ver: a taxa atual e se o câmbio flutuante automático está ligado
não apareciam em lugar nenhum antes disso — get_cambio_auto existia desde o
lançamento do câmbio flutuante e tinha zero chamadas em qualquer comando."""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE))

from cogs.economia import Economia


class _Resposta:
    def __init__(self):
        self.mensagens = []

    async def send_message(self, texto=None, *, embed=None, ephemeral=False, **kwargs):
        self.mensagens.append((texto, embed, ephemeral))


class _Interacao:
    def __init__(self, guild_id):
        self.guild_id = guild_id
        self.response = _Resposta()


class _DB:
    def __init__(self, *, rate=15, taxa=0.02, auto=False):
        self.rate = rate
        self.taxa = taxa
        self.auto = auto

    def get_cambio(self, guild_id):
        return self.rate, self.taxa

    def get_cambio_auto(self, guild_id):
        return self.auto


def _cog(db):
    cog = object.__new__(Economia)
    cog.bot = type("Bot", (), {"db": db})()
    return cog


def _rodar(coro):
    return asyncio.run(coro)


def test_cambio_ver_mostra_taxa_e_auto_desligado():
    db = _DB(rate=15, taxa=0.02, auto=False)
    cog = _cog(db)
    interacao = _Interacao(100)

    _rodar(Economia.cambio_ver.callback(cog, interacao))

    texto, embed, ephemeral = interacao.response.mensagens[0]
    assert "15" in embed.description
    assert "2.0%" in embed.description or "2%" in embed.description
    assert "Desligado" in embed.description


def test_cambio_ver_mostra_auto_ligado():
    db = _DB(auto=True)
    cog = _cog(db)
    interacao = _Interacao(100)

    _rodar(Economia.cambio_ver.callback(cog, interacao))

    texto, embed, ephemeral = interacao.response.mensagens[0]
    assert "Ligado" in embed.description


if __name__ == "__main__":
    import pytest

    raise SystemExit(pytest.main([__file__, "-v"]))
