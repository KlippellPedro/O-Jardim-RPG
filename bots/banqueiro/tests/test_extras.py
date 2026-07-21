import os, sys, tempfile, random
from pathlib import Path
BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE))
from core import economia, loot
from core.catalogo import Catalogo
from tests.db_utils import novo_db



def _cat():
    c = Catalogo(); c.carregar_arquivo(str(BASE / "tests" / "fixtures" / "catalogo_teste.json")); return c


def test_baus_config():
    assert economia.bau_compravel_por_id("geral-raro")["preco"] == 150
    assert economia.bau_compravel_por_id("nada") is None


def test_pesos_zero_excluem_raridade():
    cat = _cat()
    pesos = economia.bau_compravel_por_id("geral-comum")["pesos"]  # epico/lendario = 0
    rng = random.Random(42)
    saiu = set()
    for _ in range(120):
        it = loot.sortear_item(cat, rng=rng, pesos=pesos)
        saiu.add(it.raridade)
    # catálogo-semente tem epico e lendario, mas peso 0 deve excluí-los
    assert "epico" not in saiu and "lendario" not in saiu, saiu


def test_db_baus_estoque():
    db = novo_db()
    g, u = "g", "u"
    db.add_bau(g, u, "comum", 2)
    assert db.contar_bau(g, u, "comum") == 2
    assert db.remover_bau(g, u, "comum", 1) is True
    assert db.contar_bau(g, u, "comum") == 1
    assert db.remover_bau(g, u, "comum", 5) is False


def test_db_jornal_canal():
    db = novo_db()
    g = "g"
    assert db.get_jornal_canal(g) is None
    db.set_cambio(g, 12, 0.03)
    db.set_jornal_canal(g, "123456")
    assert db.get_jornal_canal(g) == "123456"
    # nao deve sobrescrever o cambio ja configurado pro servidor
    assert db.get_cambio(g) == (12, 0.03)
    db.set_jornal_canal(g, "789")
    assert db.get_jornal_canal(g) == "789"


if __name__ == "__main__":
    testes = [v for k, v in sorted(globals().items()) if k.startswith("test_") and callable(v)]
    for fn in testes:
        fn(); print("ok:", fn.__name__)
    print(f"OK {len(testes)} testes extras")
