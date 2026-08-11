"""Contrato de preço e prioridade das proteções consumíveis."""

from __future__ import annotations

import sys
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE))

from cogs.economia import Economia
from core import economia


class _DB:
    def __init__(self, disponiveis):
        self.disponiveis = dict(disponiveis)
        self.tentativas = []

    def consumir_protecao(self, _sid, _uid, tipo):
        self.tentativas.append(tipo)
        if self.disponiveis.get(tipo, 0) <= 0:
            return False
        self.disponiveis[tipo] -= 1
        return True


def _cog(db):
    cog = object.__new__(Economia)
    cog.bot = type("Bot", (), {"db": db})()
    return cog


def test_alarme_e_alternativa_acessivel_ao_cao_de_guarda():
    assert economia.PROTECAO_TIPOS["alarme_magico"]["custo"] == 30
    assert economia.PROTECAO_TIPOS["cao_de_guarda"]["custo"] == 80


def test_cao_de_guarda_tem_prioridade_sem_gastar_alarme():
    db = _DB({"cao_de_guarda": 1, "alarme_magico": 1})
    assert _cog(db)._consumir_melhor_protecao("g", "u") == "cao_de_guarda"
    assert db.disponiveis == {"cao_de_guarda": 0, "alarme_magico": 1}
    assert db.tentativas == ["cao_de_guarda"]


def test_alarme_e_usado_quando_nao_ha_cao():
    db = _DB({"alarme_magico": 1})
    assert _cog(db)._consumir_melhor_protecao("g", "u") == "alarme_magico"
    assert db.tentativas == ["cao_de_guarda", "alarme_magico"]
