"""/emprestimos_ver e /investir_ver ganharam a flag `historico`: antes
filtravam sempre pra pendente/ativo e o empréstimo quitado ou o título
vencido sumiam de vista sem nenhum jeito de consultar de novo."""

from __future__ import annotations

import asyncio
import sys
from datetime import datetime, timezone
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE))

from cogs.emprestimos import Emprestimos
from cogs.investimentos import Investimentos


class _Resposta:
    def __init__(self):
        self.mensagens = []

    async def send_message(self, texto=None, *, embed=None, ephemeral=False, **kwargs):
        self.mensagens.append((texto, embed, ephemeral))


class _Interacao:
    def __init__(self, guild_id, user_id):
        self.guild_id = guild_id
        self.user = type("Usuario", (), {"id": user_id})()
        self.response = _Resposta()


# ── /emprestimos_ver ─────────────────────────────────────────────────────

class _DBEmprestimos:
    def __init__(self, emprestimos):
        self._todos = emprestimos
        self.chamadas = []

    def listar_emprestimos_usuario(self, guild_id, user_id, incluir_historico=False):
        self.chamadas.append(incluir_historico)
        if incluir_historico:
            return list(self._todos)
        return [e for e in self._todos if e["status"] in ("pendente_aceite", "ativo")]


def _cog_emprestimos(db):
    cog = object.__new__(Emprestimos)
    cog.bot = type("Bot", (), {"db": db})()
    return cog


def _rodar(coro):
    return asyncio.run(coro)


def test_emprestimos_ver_padrao_esconde_quitados():
    emprestimos = [
        {"id": 1, "credor_id": "1", "devedor_id": "2", "status": "ativo", "valor_devido": 100, "moeda": "Lunaris"},
        {"id": 2, "credor_id": "1", "devedor_id": "2", "status": "quitado", "valor_devido": 0, "moeda": "Lunaris"},
    ]
    db = _DBEmprestimos(emprestimos)
    cog = _cog_emprestimos(db)
    interacao = _Interacao(100, 1)

    _rodar(Emprestimos.emprestimos_ver.callback(cog, interacao, historico=False))

    assert db.chamadas == [False]
    texto, embed, ephemeral = interacao.response.mensagens[0]
    assert "#1" in embed.description
    assert "#2" not in embed.description


def test_emprestimos_ver_com_historico_mostra_quitados():
    emprestimos = [
        {"id": 1, "credor_id": "1", "devedor_id": "2", "status": "ativo", "valor_devido": 100, "moeda": "Lunaris"},
        {"id": 2, "credor_id": "1", "devedor_id": "2", "status": "quitado", "valor_devido": 0, "moeda": "Lunaris"},
        {"id": 3, "credor_id": "3", "devedor_id": "1", "status": "inadimplente", "valor_devido": 40, "moeda": "Lunaris"},
    ]
    db = _DBEmprestimos(emprestimos)
    cog = _cog_emprestimos(db)
    interacao = _Interacao(100, 1)

    _rodar(Emprestimos.emprestimos_ver.callback(cog, interacao, historico=True))

    assert db.chamadas == [True]
    texto, embed, ephemeral = interacao.response.mensagens[0]
    assert "#1" in embed.description
    assert "#2" in embed.description
    assert "quitado" in embed.description
    assert "#3" in embed.description
    assert "inadimplente" in embed.description


def test_emprestimos_ver_vazio_sugere_historico():
    db = _DBEmprestimos([])
    cog = _cog_emprestimos(db)
    interacao = _Interacao(100, 1)

    _rodar(Emprestimos.emprestimos_ver.callback(cog, interacao, historico=False))

    texto, embed, ephemeral = interacao.response.mensagens[0]
    assert "historico" in texto.lower() or "histórico" in texto.lower()


# ── /investir_ver ─────────────────────────────────────────────────────────

class _DBInvestimentos:
    def __init__(self, investimentos):
        self._todos = investimentos
        self.chamadas = []

    def listar_investimentos_usuario(self, guild_id, user_id, incluir_historico=False):
        self.chamadas.append(incluir_historico)
        if incluir_historico:
            return list(self._todos)
        return [i for i in self._todos if i["status"] == "ativo"]


def _cog_investimentos(db):
    cog = object.__new__(Investimentos)
    cog.bot = type("Bot", (), {"db": db})()
    return cog


def test_investir_ver_padrao_esconde_maturados():
    investimentos = [
        {"valor": 100, "moeda": "Lunaris", "vence_em": datetime(2026, 6, 1, tzinfo=timezone.utc), "status": "ativo"},
        {"valor": 50, "moeda": "Lunaris", "vence_em": datetime(2026, 1, 1, tzinfo=timezone.utc), "status": "maturado"},
    ]
    db = _DBInvestimentos(investimentos)
    cog = _cog_investimentos(db)
    interacao = _Interacao(100, 1)

    _rodar(Investimentos.investir_ver.callback(cog, interacao, historico=False))

    assert db.chamadas == [False]
    texto, embed, ephemeral = interacao.response.mensagens[0]
    assert "100" in embed.description
    assert "50" not in embed.description


def test_investir_ver_com_historico_mostra_maturados_como_pagos():
    investimentos = [
        {"valor": 100, "moeda": "Lunaris", "vence_em": datetime(2026, 6, 1, tzinfo=timezone.utc), "status": "ativo"},
        {"valor": 50, "moeda": "Lunaris", "vence_em": datetime(2026, 1, 1, tzinfo=timezone.utc), "status": "maturado"},
    ]
    db = _DBInvestimentos(investimentos)
    cog = _cog_investimentos(db)
    interacao = _Interacao(100, 1)

    _rodar(Investimentos.investir_ver.callback(cog, interacao, historico=True))

    assert db.chamadas == [True]
    texto, embed, ephemeral = interacao.response.mensagens[0]
    assert "100" in embed.description
    assert "50" in embed.description
    assert "pago em" in embed.description


if __name__ == "__main__":
    import pytest

    raise SystemExit(pytest.main([__file__, "-v"]))
