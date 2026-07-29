import asyncio
import os, sys, tempfile
from pathlib import Path
BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE))
from tests.db_utils import novo_db

from core.catalogo import Catalogo
from core.inventario import Inventario
from cogs.trocas import Trocas


class FakeBot:
    platform = None


def _cog():
    bot = FakeBot()
    bot.db = novo_db()
    bot.catalogo = Catalogo()
    bot.catalogo.carregar_arquivo(str(BASE / "tests" / "fixtures" / "catalogo_teste.json"))
    bot.inventario = Inventario(bot)  # bot.platform=None -> sempre modo "legado" aqui
    return Trocas(bot), bot.db


def _rodar(coro):
    return asyncio.run(coro)


def test_troca_bau_ok():
    cog, db = _cog()
    g, a, b = "g", "A", "B"
    db.garantir_jogador(g, a); db.garantir_jogador(g, b)
    db.add_bau(g, a, "geral-comum", 1)
    db.creditar(g, b, "Lunaris", 100)   # B: 20+100 = 120
    ok, msg = _rodar(cog.executar_troca(g, a, b, "bau", "geral-comum", "Baú Geral (Comum)", 10, "Lunaris", chave="teste-bau-0001"))
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
    ok, msg = _rodar(cog.executar_troca(g, a, b, "bau", "geral-comum", "Baú Geral (Comum)", 50, "Lunaris", chave="teste-semsaldo-0001"))
    assert not ok
    assert db.contar_bau(g, a, "geral-comum") == 1   # nada mudou


def test_troca_item_ok():
    cog, db = _cog()
    g, a, b = "g", "A", "B"
    db.garantir_jogador(g, a); db.garantir_jogador(g, b)
    db.add_item(g, a, "espada-de-longinus", "Espada de Longinus", "arma", 1)
    db.creditar(g, b, "Lunaris", 100)
    ok, msg = _rodar(cog.executar_troca(g, a, b, "item", "espada-de-longinus", "Espada de Longinus", 40, "Lunaris", chave="teste-item-0001"))
    assert ok, msg
    assert db.contar_itens(g, a) == 0
    assert db.contar_itens(g, b) == 1


def test_troca_item_sem_o_item_nao_move_dinheiro():
    """O vendedor não tem mais o item: a checagem de posse (agora via
    Inventario.listar) precisa continuar bloqueando ANTES de debitar."""
    cog, db = _cog()
    g, a, b = "g", "A", "B"
    db.garantir_jogador(g, a); db.garantir_jogador(g, b)
    db.creditar(g, b, "Lunaris", 100)
    ok, msg = _rodar(cog.executar_troca(g, a, b, "item", "espada-de-longinus", "Espada de Longinus", 40, "Lunaris", chave="teste-sematem-0001"))
    assert not ok
    assert db.get_saldo(g, b, "Lunaris") == 120  # nada foi debitado


def test_troca_bidirecional_itens_ok():
    cog, db = _cog()
    g, a, b = "g", "A", "B"
    db.garantir_jogador(g, a); db.garantir_jogador(g, b)
    db.add_item(g, a, "espada-de-longinus", "Espada de Longinus", "arma", 1)
    db.add_item(g, b, "escudo-teste", "Escudo Teste", "armadura", 1)
    ok, msg = _rodar(
        cog.executar_troca_bidirecional(
            g, a, b, "item", "espada-de-longinus", "Espada de Longinus",
            "item", "escudo-teste", "Escudo Teste", chave="teste-bidi-0001",
        )
    )
    assert ok, msg
    assert db.contar_itens(g, a) == 1  # ficou com o escudo
    assert db.contar_itens(g, b) == 1  # ficou com a espada
    ids_a = {i["item_id"] for i in db.listar_inventario(g, a)}
    ids_b = {i["item_id"] for i in db.listar_inventario(g, b)}
    assert ids_a == {"escudo-teste"}
    assert ids_b == {"espada-de-longinus"}


def test_troca_bidirecional_sem_o_item_do_alvo_nao_move_nada():
    """B não tem o escudo: a checagem tem que travar antes de mexer no
    item de A (senão A perde o item sem receber nada)."""
    cog, db = _cog()
    g, a, b = "g", "A", "B"
    db.garantir_jogador(g, a); db.garantir_jogador(g, b)
    db.add_item(g, a, "espada-de-longinus", "Espada de Longinus", "arma", 1)
    ok, msg = _rodar(
        cog.executar_troca_bidirecional(
            g, a, b, "item", "espada-de-longinus", "Espada de Longinus",
            "item", "escudo-teste", "Escudo Teste", chave="teste-bidi-falha-0001",
        )
    )
    assert not ok
    assert db.contar_itens(g, a) == 1  # A continua com a espada
    ids_a = {i["item_id"] for i in db.listar_inventario(g, a)}
    assert ids_a == {"espada-de-longinus"}


if __name__ == "__main__":
    testes = [v for k, v in sorted(globals().items()) if k.startswith("test_") and callable(v)]
    for fn in testes:
        fn(); print("ok:", fn.__name__)
    print(f"OK {len(testes)} testes de trocas")
