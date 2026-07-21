"""Testes de core/clima.py — lógica pura (sem discord.py, sem banco)."""

import random
import sys
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE))

from core import clima, economia


def test_todo_clima_exclusivo_de_estacao_existe_e_aponta_de_volta():
    for chave, info in economia.ESTACOES.items():
        item = clima.obter(info["clima_exclusivo"])
        assert item is not None, f"{chave}: clima_exclusivo {info['clima_exclusivo']!r} nao existe"
        assert item.estacoes == [chave]


def test_climas_raros_valem_pra_qualquer_estacao():
    raros = [c for c in clima.CLIMAS if c.estacoes is None]
    assert len(raros) == 3
    for r in raros:
        for estacao_id in economia.ESTACOES:
            assert r in clima.climas_permitidos(estacao_id)


def test_estacoes_normais_nao_tem_clima_exclusivo_de_outra():
    permitidos_primavera = {c.id for c in clima.climas_permitidos("primavera")}
    assert "nevasca" not in permitidos_primavera  # exclusivo do Inverno
    assert "tempestade_arcana" not in permitidos_primavera  # exclusivo do Eclipse


def test_estacoes_especiais_nao_tem_climas_comuns():
    permitidos_eclipse = {c.id for c in clima.climas_permitidos("eclipse")}
    assert "ensolarado" not in permitidos_eclipse
    assert "chuva" not in permitidos_eclipse


def test_sortear_clima_so_devolve_permitido():
    rng = random.Random(1)
    for _ in range(50):
        item = clima.sortear_clima("inverno", rng=rng)
        assert item in clima.climas_permitidos("inverno")


def test_sortear_clima_estacao_desconhecida_nao_quebra():
    # nenhuma estacao bate -> so os raros (estacoes=None) sobram
    rng = random.Random(2)
    item = clima.sortear_clima("nao-existe", rng=rng)
    assert item.estacoes is None
