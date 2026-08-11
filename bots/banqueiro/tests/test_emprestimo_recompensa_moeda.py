"""Empréstimo vencido e não pago vira recompensa (core/db.py:adicionar_
recompensa, que só existe em Lunaris — não tem coluna de moeda). Antes o
valor da dívida era passado direto pra recompensa não importa a moeda do
empréstimo: um empréstimo de 100 Solares virava recompensa de ☾ 100
Lunaris, quando a taxa de câmbio torna essas quantias bem diferentes."""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE))

from cogs.emprestimos import Emprestimos
from core.db import SaldoInsuficiente


class _DB:
    def __init__(self, *, emprestimo, rate=15):
        self.emprestimo = dict(emprestimo)
        self.rate = rate
        self.recompensas = []
        self.avisos = []
        self.fechados = []

    def get_emprestimo(self, guild_id, emprestimo_id):
        return dict(self.emprestimo)

    def debitar(self, guild_id, user_id, moeda, quantia):
        raise SaldoInsuficiente("sem saldo pra pagar")

    def pagar_emprestimo_atomico(self, guild_id, emprestimo_id, devedor_id, quantia):
        raise SaldoInsuficiente("sem saldo pra pagar")

    def fechar_emprestimo(self, emprestimo_id, status):
        self.fechados.append((emprestimo_id, status))

    def adicionar_recompensa(self, guild_id, alvo_user_id, valor, sistema=False):
        self.recompensas.append((guild_id, alvo_user_id, valor, sistema))
        return valor

    def criar_aviso(self, guild_id, mensagem):
        self.avisos.append(mensagem)

    def get_cambio(self, guild_id):
        return self.rate, 0.02


def _cog(db):
    cog = object.__new__(Emprestimos)
    bot = type("Bot", (), {"db": db, "guilds": []})()
    cog.bot = bot
    return cog


def _rodar(coro):
    return asyncio.run(coro)


def _emprestimo_base(**overrides):
    base = {
        "id": 1, "guild_id": "100", "credor_id": "10", "devedor_id": "20",
        "moeda": "Lunaris", "valor_devido": 100, "status": "ativo",
    }
    base.update(overrides)
    return base


# ── _valor_recompensa_em_lunaris ─────────────────────────────────────────

def test_recompensa_em_lunaris_passa_direto():
    db = _DB(emprestimo=_emprestimo_base())
    cog = _cog(db)
    assert cog._valor_recompensa_em_lunaris("100", 50, "Lunaris") == 50


def test_recompensa_em_solares_converte_pela_taxa_de_cambio():
    db = _DB(emprestimo=_emprestimo_base(), rate=15)
    cog = _cog(db)
    assert cog._valor_recompensa_em_lunaris("100", 10, "Solares") == 150


def test_recompensa_em_fragmentos_nao_tem_conversao():
    db = _DB(emprestimo=_emprestimo_base())
    cog = _cog(db)
    assert cog._valor_recompensa_em_lunaris("100", 10, "Fragmentos de Estrela") is None


# ── _cobrar_vencido ponta a ponta ────────────────────────────────────────

def test_cobrar_vencido_em_solares_cria_recompensa_convertida():
    db = _DB(emprestimo=_emprestimo_base(moeda="Solares", valor_devido=10), rate=15)
    cog = _cog(db)

    _rodar(cog._cobrar_vencido(_emprestimo_base(moeda="Solares", valor_devido=10)))

    assert db.recompensas == [("100", "20", 150, True)]
    assert "150" in db.avisos[0]


def test_cobrar_vencido_em_fragmentos_nao_cria_recompensa_errada():
    db = _DB(emprestimo=_emprestimo_base(moeda="Fragmentos de Estrela", valor_devido=10))
    cog = _cog(db)

    _rodar(cog._cobrar_vencido(_emprestimo_base(moeda="Fragmentos de Estrela", valor_devido=10)))

    assert db.recompensas == []
    assert "não deu pra converter" in db.avisos[0]


if __name__ == "__main__":
    import pytest

    raise SystemExit(pytest.main([__file__, "-v"]))
