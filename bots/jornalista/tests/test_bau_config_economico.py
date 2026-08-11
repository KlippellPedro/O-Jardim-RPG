"""A configuração define bases econômicas; os sete perfis de raridade
aplicam automaticamente enigma, multiplicador, itens extras e expiração."""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE))

from cogs.baus import Baus


class _Resposta:
    def __init__(self):
        self.mensagens = []

    async def send_message(self, texto=None, *, ephemeral=False, **kwargs):
        self.mensagens.append((texto, ephemeral))


class _Interacao:
    def __init__(self, guild_id):
        self.guild_id = guild_id
        self.response = _Resposta()


class _DB:
    def __init__(self):
        self.chamadas_atualizar = []
        self.cfg = {
            "guild_id": "100", "canal_id": None, "ativo": False,
            "min_hora": 10, "max_hora": 22, "itens_por_bau": 1, "proximo_drop": "2026-01-01",
            "chance_enigma": 0.25, "lunaris_min": 5, "lunaris_max": 40,
        }

    def listar_baus_canais(self, guild_id):
        return ["555"]

    def atualizar_baus_config(self, guild_id, **kwargs):
        self.chamadas_atualizar.append((guild_id, kwargs))

    def get_baus_config(self, guild_id):
        return dict(self.cfg)


def _cog(db):
    cog = object.__new__(Baus)
    cog.bot = type("Bot", (), {"db": db})()
    return cog


def _rodar(coro):
    return asyncio.run(coro)


def test_bau_config_repassa_faixa_base_de_lunaris():
    db = _DB()
    cog = _cog(db)
    interacao = _Interacao(100)

    _rodar(
        Baus.bau_config.callback(
            cog, interacao,
            canal=None, ativo=None, min_hora=None, max_hora=None, itens_por_bau=None,
            lunaris_min=10, lunaris_max=20,
        )
    )

    guild_id, kwargs = db.chamadas_atualizar[0]
    assert kwargs["lunaris_min"] == 10
    assert kwargs["lunaris_max"] == 20


def test_bau_config_recusa_lunaris_min_maior_que_max():
    db = _DB()
    cog = _cog(db)
    interacao = _Interacao(100)

    _rodar(
        Baus.bau_config.callback(
            cog, interacao,
            canal=None, ativo=None, min_hora=None, max_hora=None, itens_por_bau=None,
            lunaris_min=50, lunaris_max=10,
        )
    )

    assert not db.chamadas_atualizar
    texto, ephemeral = interacao.response.mensagens[0]
    assert "mínimo de Lunaris" in texto


def test_bau_config_valida_faixa_mesmo_quando_so_um_limite_muda():
    db = _DB()
    cog = _cog(db)
    interacao = _Interacao(100)

    _rodar(
        Baus.bau_config.callback(
            cog, interacao,
            canal=None, ativo=None, min_hora=None, max_hora=None, itens_por_bau=None,
            lunaris_min=50, lunaris_max=None,
        )
    )

    assert not db.chamadas_atualizar
    assert "mínimo de Lunaris" in interacao.response.mensagens[0][0]


def test_bau_config_recusa_janela_de_horario_invertida():
    db = _DB()
    cog = _cog(db)
    interacao = _Interacao(100)

    _rodar(
        Baus.bau_config.callback(
            cog, interacao,
            canal=None, ativo=None, min_hora=23, max_hora=None, itens_por_bau=None,
            lunaris_min=None, lunaris_max=None,
        )
    )

    assert not db.chamadas_atualizar
    assert "hora mínima" in interacao.response.mensagens[0][0]


def test_bau_config_resposta_mostra_faixa_e_raridades_automaticas():
    db = _DB()
    cog = _cog(db)
    interacao = _Interacao(100)

    _rodar(
        Baus.bau_config.callback(
            cog, interacao,
            canal=None, ativo=None, min_hora=None, max_hora=None, itens_por_bau=None,
            lunaris_min=None, lunaris_max=None,
        )
    )

    texto, ephemeral = interacao.response.mensagens[0]
    assert "5" in texto and "40" in texto
    assert "Mítico" in texto
    assert "Relíquia da Criação" not in texto
    assert "Raro ou superior" in texto


if __name__ == "__main__":
    import pytest

    raise SystemExit(pytest.main([__file__, "-v"]))
