import os, sys, tempfile
from pathlib import Path
BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE))
from tests.db_utils import novo_db

from core.catalogo import Catalogo
from cogs.trocas import Trocas


class FakeBot:
    pass


def _cog():
    bot = FakeBot()
    bot.db = novo_db()
    bot.catalogo = Catalogo()
    bot.catalogo.carregar_arquivo(str(BASE / "tests" / "fixtures" / "catalogo_teste.json"))
    return Trocas(bot), bot.db


def test_troca_bau_ok():
    cog, db = _cog()
    g, a, b = "g", "A", "B"
    db.garantir_jogador(g, a); db.garantir_jogador(g, b)
    db.add_bau(g, a, "geral-comum", 1)
    db.creditar(g, b, "Lunaris", 100)   # B: 20+100 = 120
    ok, msg = cog.executar_troca(g, a, b, "bau", "geral-comum", "Baú Geral (Comum)", 10, "Lunaris")
    assert ok, msg
    assert db.contar_bau(g, a, "geral-comum") == 0
    assert db.contar_bau(g, b, "geral-comum") == 1
    assert db.get_saldo(g, b, "Lunaris") == 110   # 120 - 10
    assert db.get_saldo(g, a, "Lunaris") == 30     # 20 + 10


def test_troca_sem_saldo():
    cog, db = _cog()
    g, a, b = "g", "A", "B"
    db.garantir_jogador(g, a); db.garantir_jogador(g, b)  # B só tem 20
    db.add_bau(g, a, "geral-comum", 1)
    ok, msg = cog.executar_troca(g, a, b, "bau", "geral-comum", "Baú Geral (Comum)", 50, "Lunaris")
    assert not ok
    assert db.contar_bau(g, a, "geral-comum") == 1   # nada mudou


def test_troca_item_ok():
    cog, db = _cog()
    g, a, b = "g", "A", "B"
    db.garantir_jogador(g, a); db.garantir_jogador(g, b)
    db.add_item(g, a, "espada-de-longinus", "Espada de Longinus", "arma", 1)
    db.creditar(g, b, "Lunaris", 100)
    ok, msg = cog.executar_troca(g, a, b, "item", "espada-de-longinus", "Espada de Longinus", 40, "Lunaris")
    assert ok, msg
    assert db.contar_itens(g, a) == 0
    assert db.contar_itens(g, b) == 1


if __name__ == "__main__":
    testes = [v for k, v in sorted(globals().items()) if k.startswith("test_") and callable(v)]
    for fn in testes:
        fn(); print("ok:", fn.__name__)
    print(f"OK {len(testes)} testes de trocas")
