"""/horoscopo (Jornalista, público): mostra a Árvore do dia sob demanda:
antes só era publicada uma vez por ciclo de 24h no canal de notícias, sem
nenhum jeito de consultar fora desse momento."""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE))

from cogs.horoscopo import Horoscopo
from core import arvores as arvores_mod


class _Resposta:
    def __init__(self):
        self.mensagens = []

    async def send_message(self, texto=None, *, embed=None, ephemeral=False, **kwargs):
        self.mensagens.append((embed, ephemeral))


class _Interacao:
    def __init__(self, guild_id, user):
        self.guild_id = guild_id
        self.user = user
        self.response = _Resposta()


class _Cargo:
    def __init__(self, id):
        self.id = id


class _Membro:
    def __init__(self, roles):
        self.roles = roles


class _DB:
    def __init__(self, *, horoscopo=None, cargos_arvore=None):
        self.horoscopo = horoscopo
        self.cargos_arvore = cargos_arvore or {}

    def get_horoscopo(self, guild_id):
        return self.horoscopo

    def get_cargos_arvore(self, guild_id):
        return dict(self.cargos_arvore)


def _cog(db):
    cog = object.__new__(Horoscopo)
    cog.bot = type("Bot", (), {"db": db})()
    return cog


def _rodar(coro):
    return asyncio.run(coro)


def test_horoscopo_sem_sorteio_ainda_avisa_e_nao_quebra():
    db = _DB(horoscopo=None)
    cog = _cog(db)
    interacao = _Interacao(100, _Membro([]))

    _rodar(Horoscopo.horoscopo.callback(cog, interacao))

    embed, ephemeral = interacao.response.mensagens[0]
    assert embed is None
    assert ephemeral is True


def test_horoscopo_mostra_a_arvore_do_dia():
    arvore = arvores_mod.ARVORES[0]
    db = _DB(horoscopo=arvore.id)
    cog = _cog(db)
    interacao = _Interacao(100, _Membro([]))

    _rodar(Horoscopo.horoscopo.callback(cog, interacao))

    embed, ephemeral = interacao.response.mensagens[0]
    assert ephemeral is False
    assert arvore.nome in embed.description
    assert len(embed.fields) == 0


def test_horoscopo_sinaliza_quando_o_jogador_tem_o_cargo():
    arvore = arvores_mod.ARVORES[0]
    db = _DB(horoscopo=arvore.id, cargos_arvore={arvore.id: "cargo-x"})
    cog = _cog(db)
    interacao = _Interacao(100, _Membro([_Cargo("cargo-x")]))

    _rodar(Horoscopo.horoscopo.callback(cog, interacao))

    embed, ephemeral = interacao.response.mensagens[0]
    assert len(embed.fields) == 1
    assert "dobro" in embed.fields[0].value.lower()


def test_horoscopo_nao_sinaliza_sem_o_cargo():
    arvore = arvores_mod.ARVORES[0]
    db = _DB(horoscopo=arvore.id, cargos_arvore={arvore.id: "cargo-x"})
    cog = _cog(db)
    interacao = _Interacao(100, _Membro([_Cargo("outro-cargo")]))

    _rodar(Horoscopo.horoscopo.callback(cog, interacao))

    embed, ephemeral = interacao.response.mensagens[0]
    assert len(embed.fields) == 0


if __name__ == "__main__":
    import pytest

    raise SystemExit(pytest.main([__file__, "-v"]))
