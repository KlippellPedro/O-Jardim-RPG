"""
Testes do loot dos baús automáticos — rodam SEM Discord.
Uso: python tests/test_loot.py  (a partir de bots/jornalista)
"""

import random
import sys
from datetime import datetime, timedelta
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE))

from core.catalogo import Catalogo
from core import loot


def _catalogo() -> Catalogo:
    c = Catalogo()
    c.carregar_arquivo(str(BASE / "tests" / "fixtures" / "catalogo_teste.json"))
    return c


def test_sortear_bau():
    cat = _catalogo()
    rng = random.Random(1)
    premio = loot.sortear_bau(cat, qtd_itens=2, rng=rng)
    assert 5 <= premio["lunaris"] <= 40, premio["lunaris"]
    assert len(premio["itens"]) == 2
    for it in premio["itens"]:
        assert it.raridade in loot.PESOS_RARIDADE


def test_sortear_bau_catalogo_vazio():
    premio = loot.sortear_bau(Catalogo(), qtd_itens=3, rng=random.Random(0))
    assert premio["itens"] == []            # sem itens, mas ainda dá Lunaris
    assert 5 <= premio["lunaris"] <= 40


def test_agendar_proximo_futuro():
    rng = random.Random(2)
    base = datetime(2026, 7, 15, 23, 0, 0, tzinfo=loot.TZ) if loot.TZ else datetime(2026, 7, 15, 23, 0, 0)
    prox = loot.agendar_proximo(10, 22, rng=rng, agora=base)
    assert prox > base                      # sempre no futuro
    assert 10 <= prox.hour <= 22            # dentro da janela
    assert prox <= base + timedelta(days=1)


def test_agendar_proximo_janela_invertida():
    # min > max deve ser tolerado (troca)
    prox = loot.agendar_proximo(22, 8, rng=random.Random(3),
                                agora=datetime(2026, 1, 1, 0, 0, 0, tzinfo=loot.TZ) if loot.TZ else datetime(2026, 1, 1))
    assert 8 <= prox.hour <= 22


if __name__ == "__main__":
    testes = [v for k, v in sorted(globals().items()) if k.startswith("test_") and callable(v)]
    for fn in testes:
        fn()
        print("ok:", fn.__name__)
    print(f"\n✅ {len(testes)} testes de loot passaram.")
