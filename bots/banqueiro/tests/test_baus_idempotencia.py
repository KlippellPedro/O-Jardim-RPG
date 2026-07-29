"""Regressão: /abrir_todos perdia baús em silêncio.

`_abrir_um_bau` montava a chave de idempotência como
`bau-comprado:{interaction.id}:{bau_id}:{lunaris}`. Dentro do loop de
/abrir_todos o `interaction.id` é o mesmo em toda a chamada: então dois
baús do mesmo tipo que sorteiam o mesmo Lunaris geravam chave IDÊNTICA. A
plataforma deduplica o segundo depósito (idempotência funcionando como
projetado), mas o bot já tinha removido o baú do estoque e contava como
aberto: o jogador perdia o loot sem nenhum aviso.
"""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE))

import cogs.economia as economia_cog
from cogs.economia import Economia


class _ItemSorteado:
    def __init__(self, item_id):
        self.id = item_id
        self.titulo = "Espada"
        self.tipo = "arma"
        self.raridade = "comum"
        self.raridade_rotulo = "Comum"
        self.conteudo = {}


class _Interacao:
    """Um único interaction.id: exatamente o cenário de /abrir_todos, onde
    a mesma interação serve pra abrir vários baús em sequência."""

    def __init__(self):
        self.id = 999
        self.user = type("Usuario", (), {"id": 42})()
        self.guild_id = 100


class _Platform:
    def __init__(self):
        self.chaves = []

    async def deposit_vault(self, **kwargs):
        self.chaves.append(kwargs["idempotency_key"])
        return {"repetido": False}


def _bau_fixo():
    return {
        "id": "bau-teste",
        "nome": "Baú de Teste",
        "itens": 1,
        "pesos": {"comum": 1},
        "lunaris_min": 5,
        "lunaris_max": 5,
        "tipos": None,
    }


def test_abrir_varios_baus_iguais_na_mesma_interacao_gera_chaves_distintas(monkeypatch):
    # Mesmo prêmio (mesmo Lunaris, mesmo item) em toda chamada: é o cenário
    # exato que colidia antes da correção.
    monkeypatch.setattr(
        economia_cog.loot_mod,
        "sortear_bau",
        lambda *a, **k: {"lunaris": 5, "itens": [_ItemSorteado("espada")]},
    )

    platform = _Platform()
    cog = object.__new__(Economia)
    cog.bot = type(
        "Bot",
        (),
        {"db": type("DB", (), {})(), "platform": platform, "catalogo": None},
    )()
    interacao = _Interacao()
    b = _bau_fixo()

    async def verificar():
        await cog._abrir_um_bau(interacao, "100", "42", b, indice=0)
        await cog._abrir_um_bau(interacao, "100", "42", b, indice=1)

    asyncio.run(verificar())

    assert len(platform.chaves) == 2
    assert platform.chaves[0] != platform.chaves[1]
    assert platform.chaves == [
        "bau-comprado:999:0:bau-teste:5",
        "bau-comprado:999:1:bau-teste:5",
    ]


def test_abrir_um_unico_bau_sem_indice_usa_zero_por_padrao():
    """/abrir_bau (caminho de um baú só) não precisa passar indice: o
    default continua produzindo uma chave estável e correta."""
    monkeypatch_sortear = lambda *a, **k: {"lunaris": 7, "itens": []}
    economia_cog.loot_mod.sortear_bau, original = monkeypatch_sortear, economia_cog.loot_mod.sortear_bau
    try:
        platform = _Platform()
        cog = object.__new__(Economia)
        cog.bot = type(
            "Bot",
            (),
            {"db": type("DB", (), {})(), "platform": platform, "catalogo": None},
        )()

        asyncio.run(cog._abrir_um_bau(_Interacao(), "100", "42", _bau_fixo()))

        assert platform.chaves == ["bau-comprado:999:0:bau-teste:7"]
    finally:
        economia_cog.loot_mod.sortear_bau = original
