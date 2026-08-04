"""Testes do Cartão Lunar: rodam SEM Discord.
Uso: python tests/test_cartao.py  (a partir de bots/banqueiro)
"""

import asyncio
import os
import sys
import tempfile
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE))

from core import economia
from core.db import SaldoInsuficiente
from cogs.economia import Economia
from tests.db_utils import novo_db



def test_beneficios():
    assert economia.beneficios_reputacao(-5)["taxa_mult"] == 2.0
    assert economia.beneficios_reputacao(50)["desconto"] == 0.0
    assert economia.beneficios_reputacao(1)["cashback"] == 0.0
    assert economia.beneficios_reputacao(200)["desconto"] == 0.05
    assert economia.beneficios_reputacao(400)["cashback"] == 0.05
    assert economia.beneficios_reputacao(700)["limite_mult"] == 2
    assert economia.beneficios_credito(200) == economia.beneficios_reputacao(200)


def test_limite_e_tiers():
    assert economia.limite_efetivo("comum", 1) == 200
    assert economia.limite_efetivo("comum", 700) == 400          # 601+ dobra
    assert economia.limite_disponivel("comum", 1, 80) == 120
    assert economia.limite_disponivel("comum", 1, 250) == 0
    assert economia.proximo_cartao("comum")["id"] == "prata"
    assert economia.proximo_cartao("eterno") is None


def test_cotacao_do_limite_cobre_os_tres_exemplos_da_regra():
    bloqueada = economia.cotar_pagamento(100, 0, 50)
    assert bloqueada["pode_comprar"] is False
    assert bloqueada["financiado"] == 100

    parcial = economia.cotar_pagamento(100, 70, 50)
    assert parcial["pode_comprar"] is True
    assert parcial["precisa_confirmacao"] is True
    assert parcial["financiado"] == 30
    assert parcial["limite_apos"] == 20

    integral = economia.cotar_pagamento(100, 0, 150)
    assert integral["pode_comprar"] is True
    assert integral["financiado"] == 100
    assert integral["limite_apos"] == 50


def test_faturas_e_divida_consumem_o_mesmo_limite():
    cotacao = economia.cotar_pagamento(100, 20, 200, divida=50, faturas_pendentes=80)
    assert cotacao["limite_disponivel"] == 70
    assert cotacao["financiado"] == 80
    assert cotacao["pode_comprar"] is False
    assert economia.limite_disponivel("comum", 1, 50, 80) == 70


def test_requisitos_de_reputacao_escalam_raridades_e_melhorias():
    assert economia.reputacao_minima_raridade("comum") == 0
    assert economia.reputacao_minima_raridade("raro") == 250
    assert economia.reputacao_minima_raridade("Relíquia da Criação") == 1500
    assert economia.reputacao_minima_upgrade("cartao", "prata") == 100
    assert economia.reputacao_minima_upgrade("cofre", "sem-fim") == 1250
    assert economia.reputacao_minima_upgrade("seguranca", "absoluta") == 1250
    assert economia.reputacao_por_fatura_paga(30) == 3
    assert economia.reputacao_por_fatura_paga(200) == 10
    assert economia.reputacao_por_fatura_paga(5000) == 50


def test_cartao_separa_reputacao_de_limite_na_interface():
    class Resposta:
        def __init__(self):
            self.embed = None

        async def send_message(self, *, embed=None, **_kwargs):
            self.embed = embed

    class DB:
        def get_cartao(self, _guild_id, _user_id):
            return {"credito": 250, "tier": "prata"}

        def get_divida(self, _guild_id, _user_id):
            return 125

        def get_total_faturas_pendentes(self, _guild_id, _user_id):
            return 50

    interacao = type(
        "Interacao",
        (),
        {
            "guild_id": 1,
            "user": type("Usuario", (), {"id": 2, "display_name": "Luna"})(),
            "response": Resposta(),
        },
    )()
    cog = object.__new__(Economia)
    cog.bot = type("Bot", (), {"db": DB()})()

    asyncio.run(Economia.cartao.callback(cog, interacao))

    campos = {campo.name: campo.value for campo in interacao.response.embed.fields}
    assert "🏦 Reputação bancária" in campos
    assert "250 pontos" in campos["🏦 Reputação bancária"]
    assert "🌙 Limite do cartão" in campos
    assert "Total: ☾ **400**" in campos["🌙 Limite do cartão"]
    assert "em faturas: ☾ **50**" in campos["🌙 Limite do cartão"]
    assert "em dívida: ☾ **125**" in campos["🌙 Limite do cartão"]
    assert "disponível: ☾ **225**" in campos["🌙 Limite do cartão"]
    assert "Crédito" not in campos


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


def test_compra_financiada_cria_fatura_sem_criar_divida():
    db = novo_db()
    g, u = "g", "u"
    db.garantir_jogador(g, u)                                    # 20 Lunaris
    compra = db.cobrar_compra_com_fatura(g, u, 100, 200, "Compra de teste", "teste:1")
    assert compra["saldo"] == 0
    assert compra["financiado"] == 80
    assert db.get_divida(g, u) == 0
    assert db.get_total_faturas_pendentes(g, u) == 80
    db.creditar(g, u, "Lunaris", 100)
    parcial = db.pagar_faturas(g, u, 50)
    assert parcial == {
        "pago": 50,
        "restante": 30,
        "saldo": 50,
        "reputacao_ganha": 0,
        "convertido_em_divida": 0,
    }
    quitacao = db.pagar_faturas(g, u, 30)
    assert quitacao["restante"] == 0
    assert quitacao["reputacao_ganha"] == economia.reputacao_por_fatura_paga(80)


def test_fatura_vencida_converte_somente_o_restante_em_divida():
    db = novo_db()
    g, u = "g-estorno", "u-estorno"
    db.garantir_jogador(g, u)                                    # 20 Lunaris
    db.cobrar_compra_com_fatura(g, u, 100, 200, "Compra de teste", "teste:vencida")
    db.creditar(g, u, "Lunaris", 30)
    db.pagar_faturas(g, u, 30)
    with db._conn() as con:
        con.execute(
            "UPDATE faturas_cartao SET vence_em=CURRENT_TIMESTAMP - INTERVAL '1 day' WHERE guild_id=%s",
            (g,),
        )
    vencidas = db.converter_faturas_vencidas(g)
    assert vencidas[0]["valor"] == 50
    assert db.get_total_faturas_pendentes(g, u) == 0
    assert db.get_divida(g, u) == 50


if __name__ == "__main__":
    testes = [v for k, v in sorted(globals().items()) if k.startswith("test_") and callable(v)]
    for fn in testes:
        fn()
        print("ok:", fn.__name__)
    print(f"\n✅ {len(testes)} testes de cartão passaram.")
