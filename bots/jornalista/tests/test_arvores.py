"""Testes de core/arvores.py — dado puro, sem discord.py nem banco."""

import sys
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE))

from core import arvores


def test_sao_dez_arvores():
    assert len(arvores.ARVORES) == 10


def test_ids_sao_unicos():
    ids = [a.id for a in arvores.ARVORES]
    assert len(ids) == len(set(ids))


def test_nomes_sao_unicos():
    nomes = [a.nome for a in arvores.ARVORES]
    assert len(nomes) == len(set(nomes))


def test_nomes_dentro_do_limite_de_cargo_e_select_do_discord():
    # Discord: nome de cargo <= 100, label de SelectOption <= 100.
    assert all(1 <= len(a.nome) <= 100 for a in arvores.ARVORES)


def test_cores_sao_rgb_validas():
    assert all(0 <= a.cor <= 0xFFFFFF for a in arvores.ARVORES)


def test_obter_por_id_existente():
    axis = arvores.obter("keryx")
    assert axis is not None
    assert axis.nome == "A.X.I.S"


def test_obter_por_id_inexistente_devolve_none():
    assert arvores.obter("nao-existe") is None
