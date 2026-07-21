"""Testes do Cartão Lunar — rodam SEM Discord.
Uso: python tests/test_cartao.py  (a partir de bots/banqueiro)
"""

import os
import sys
import tempfile
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE))

from core import economia
from core.db import SaldoInsuficiente
from tests.db_utils import novo_db



def test_beneficios():
    assert economia.beneficios_credito(-5)["taxa_mult"] == 2.0
    assert economia.beneficios_credito(50)["desconto"] == 0.0
    assert economia.beneficios_credito(1)["cashback"] == 0.0
    assert economia.beneficios_credito(200)["desconto"] == 0.05
    assert economia.beneficios_credito(400)["cashback"] == 0.05
    assert economia.beneficios_credito(700)["limite_mult"] == 2


def test_limite_e_tiers():
    assert economia.limite_efetivo("comum", 1) == 200
    assert economia.limite_efetivo("comum", 700) == 400          # 601+ dobra
    assert economia.proximo_cartao("comum")["id"] == "prata"
    assert economia.proximo_cartao("eterno") is None


def test_db_cartao_e_credito():
    db = novo_db()
    g, u = "g", "u"
    c = db.get_cartao(g, u)
    assert c["credito"] == 1 and c["tier"] == "comum"
    assert db.add_credito(g, u, 200) == 201
    db.set_credito(g, u, 350)
    assert db.get_cartao(g, u)["credito"] == 350
    db.set_cartao_tier(g, u, "dourado")
    assert db.get_cartao(g, u)["tier"] == "dourado"


def test_linha_de_credito():
    db = novo_db()
    g, u = "g", "u"
    db.garantir_jogador(g, u)                                    # 20 Lunaris
    novo = db.debitar(g, u, "Lunaris", 100, permitir_negativo_ate=200)
    assert novo == 0, novo
    assert db.get_divida(g, u) == 80                              # faltante virou dívida separada
    db.creditar(g, u, "Lunaris", 100)
    assert db.get_saldo(g, u, "Lunaris") == 100                  # recebimento não quita dívida
    assert db.get_divida(g, u) == 80
    pagamento = db.pagar_divida(g, u, 50)
    assert pagamento == {"pago": 50, "restante": 30, "saldo": 50}
    try:
        db.debitar(g, u, "Lunaris", 250, permitir_negativo_ate=200)  # passaria do limite da dívida
        raise AssertionError("deveria falhar")
    except SaldoInsuficiente:
        pass


def test_estorno_de_compra_a_credito():
    db = novo_db()
    g, u = "g-estorno", "u-estorno"
    db.garantir_jogador(g, u)                                    # 20 Lunaris
    antes = db.get_divida(g, u)
    db.debitar(g, u, "Lunaris", 100, permitir_negativo_ate=200)
    criada = db.get_divida(g, u) - antes
    db.estornar_debito(g, u, "Lunaris", 100, criada)
    assert db.get_saldo(g, u, "Lunaris") == 20
    assert db.get_divida(g, u) == 0


if __name__ == "__main__":
    testes = [v for k, v in sorted(globals().items()) if k.startswith("test_") and callable(v)]
    for fn in testes:
        fn()
        print("ok:", fn.__name__)
    print(f"\n✅ {len(testes)} testes de cartão passaram.")
