"""Doleiro: o balanço da economia, sem banco de dados.

O doleiro paga 40% do valor do item, em Créditos Sombrios, com humor entre 0,85 e 1,15.
Créditos valem 2 Solares na régua de valor e nunca voltam a ser Lunaris ou Solares, então o
doleiro é um ralo: quem vende para ele sempre sai perdendo. Estes testes travam isso para todo
o catálogo, e travam que nada (fracionar, câmbio flutuante, quantidade) abre uma brecha.
"""
from datetime import date, timedelta
from pathlib import Path

import pytest

from core import economia
from core.catalogo import Catalogo

CATALOGO = Catalogo()
CATALOGO.carregar_arquivo(str(Path(__file__).resolve().parents[3] / "data" / "loja" / "catalogo.json"))
COMPRAVEIS = [
    item for item in CATALOGO.listar()
    if item.tipo not in economia.DOLEIRO_NAO_COMPRA and economia.valor_em_solares(item.conteudo.get("preco"))
]
MAIOR_HUMOR = 1.15
INICIO = date(2026, 1, 1)


def test_o_catalogo_tem_o_que_vender_ao_doleiro_e_o_que_ele_recusa():
    assert len(COMPRAVEIS) > 400
    for tipo in economia.DOLEIRO_NAO_COMPRA:
        assert any(item.tipo == tipo for item in CATALOGO.listar()), tipo


def test_o_humor_do_doleiro_fica_entre_085_e_115_e_gira_em_torno_de_1():
    fatores = [economia.fator_do_doleiro(INICIO + timedelta(days=n)) for n in range(1095)]
    assert min(fatores) >= 0.85 and max(fatores) <= MAIOR_HUMOR
    assert 0.97 <= sum(fatores) / len(fatores) <= 1.03
    # Dia ruim existe e dia bom também: o humor não pode ficar parado.
    assert len({round(f, 3) for f in fatores}) > 250


def test_o_doleiro_nunca_paga_mais_que_o_valor_do_item_nem_perto():
    """No melhor humor, em Solares-equivalentes (1 Crédito = 2 Solares), ele paga no máximo 46% do preço."""
    dia = INICIO
    while economia.fator_do_doleiro(dia) < 1.14:
        dia += timedelta(days=1)
    for item in COMPRAVEIS:
        valor = economia.valor_em_solares(item.conteudo.get("preco"))
        creditos = economia.oferta_do_doleiro(item.conteudo.get("preco"), 1, dia)
        assert creditos * economia.CREDITO_EM_SOLARES <= valor * economia.DOLEIRO_FRACAO * MAIOR_HUMOR + 1e-6, item.id
        assert creditos * economia.CREDITO_EM_SOLARES < valor, item.id


def test_fracionar_a_venda_nunca_rende_mais_que_vender_tudo_junto():
    dia = INICIO + timedelta(days=40)
    for item in COMPRAVEIS[::7]:
        preco = item.conteudo.get("preco")
        unitaria = economia.oferta_do_doleiro(preco, 1, dia)
        for quantidade in (2, 5, 99):
            junto = economia.oferta_do_doleiro(preco, quantidade, dia)
            assert unitaria * quantidade <= junto, f"{item.id} x{quantidade}"
            assert junto * economia.CREDITO_EM_SOLARES <= economia.valor_em_solares(preco) * quantidade * economia.DOLEIRO_FRACAO * MAIOR_HUMOR + 1e-6


def test_a_oferta_sobe_com_o_preco_e_com_a_quantidade_e_o_que_vale_pouco_nao_rende_nada():
    dia = INICIO + timedelta(days=3)
    anterior = 0
    for solares in (1, 4, 5, 20, 100, 1000, 100000):
        oferta = economia.oferta_do_doleiro({"Solares": solares}, 1, dia)
        assert oferta >= anterior
        anterior = oferta
    assert economia.oferta_do_doleiro({"Solares": 1}, 1, dia) == 0
    assert economia.oferta_do_doleiro({"Lunaris": 50}, 99, dia) >= 0
    assert economia.oferta_do_doleiro(None, 3, dia) == 0
    assert economia.oferta_do_doleiro({"Moeda Inventada": 500}, 1, dia) == 0
    assert economia.oferta_do_doleiro({"Solares": -5}, 1, dia) == 0


@pytest.mark.parametrize("quantidade", [0, -1, 1.5, True, "2", None])
def test_quantidade_invalida_e_recusada(quantidade):
    with pytest.raises(ValueError):
        economia.oferta_do_doleiro({"Solares": 100}, quantidade, INICIO)


def test_o_cambio_flutuante_nao_muda_o_que_o_doleiro_paga():
    """A venda usa o câmbio padrão: um item pago em Lunaris vale o mesmo com o Lunaris forte ou fraco."""
    from cogs import mercado_negro

    fonte = Path(mercado_negro.__file__).read_text(encoding="utf-8")
    assert "oferta_do_doleiro(entrada.conteudo.get(\"preco\"), quantidade, hoje)" in fonte
    assert "get_cambio" not in fonte.split("async def mercado_negro_vender")[1].split("@mercado_negro_vender.autocomplete")[0]
    # E a função, com o câmbio padrão, trata Lunaris e Solares iguais.
    dia = INICIO + timedelta(days=11)
    assert economia.oferta_do_doleiro({"Lunaris": 20_000}, 1, dia) == economia.oferta_do_doleiro({"Solares": 200}, 1, dia)


def test_o_preco_em_fragmentos_e_creditos_entra_na_regua_de_valor():
    dia = INICIO + timedelta(days=5)
    por_fragmento = economia.oferta_do_doleiro({"Fragmentos de Estrela": 10}, 1, dia)
    assert por_fragmento == economia.oferta_do_doleiro({"Solares": 500}, 1, dia)
    # Item pago em Créditos: o doleiro devolve menos Créditos do que o item custou, nunca mais.
    for creditos_do_item in (10, 30, 100, 250):
        assert economia.oferta_do_doleiro({"Créditos Sombrios": creditos_do_item}, 1, dia) < creditos_do_item


def test_comprar_no_mercado_negro_e_revender_ao_doleiro_nunca_da_lucro():
    """As ofertas do mercado negro (Solares e Lunaris) custam, no pior dia de desconto, mais do que o doleiro paga de volta."""
    from cogs.mercado_negro import _aplicar_modificador_preco, _extrair_preco

    ofertas = [item for item in CATALOGO.listar() if item.conteudo.get("mercado_negro")]
    assert ofertas
    dia = INICIO
    while economia.fator_do_doleiro(dia) < 1.14:
        dia += timedelta(days=1)
    for item in ofertas:
        moeda, base = _extrair_preco(item.conteudo.get("preco"))
        pago = _aplicar_modificador_preco(base, "deflacao_loja")  # o dia mais barato do mercado negro
        custo_em_solares = economia.valor_em_solares({moeda: pago})
        volta = economia.oferta_do_doleiro(item.conteudo.get("preco"), 1, dia) * economia.CREDITO_EM_SOLARES
        assert volta < custo_em_solares, item.id


def test_o_ralo_tem_o_tamanho_que_o_livro_promete():
    """Para juntar 30 Créditos (um implante barato), a venda precisa de itens que valem uns 150 Solares."""
    dia = INICIO + timedelta(days=9)
    fator = economia.fator_do_doleiro(dia)
    solares_necessarios = 30 * economia.CREDITO_EM_SOLARES / (economia.DOLEIRO_FRACAO * fator)
    assert 120 <= solares_necessarios <= 180
    creditos = economia.oferta_do_doleiro({"Solares": solares_necessarios + 1}, 1, dia)
    assert creditos >= 30
