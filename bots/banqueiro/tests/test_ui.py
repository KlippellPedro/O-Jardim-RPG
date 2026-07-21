"""Testes do core/ui.py — só as partes puras (sem precisar de um Discord real)."""

import sys
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE))

from core import ui


def test_barra_vazia():
    assert ui.barra(0, 10) == "▱▱▱▱▱▱▱▱▱▱  0/10"


def test_barra_cheia():
    assert ui.barra(10, 10) == "▰▰▰▰▰▰▰▰▰▰  10/10"


def test_barra_meio():
    assert ui.barra(5, 10) == "▰▰▰▰▰▱▱▱▱▱  5/10"


def test_barra_maximo_zero_nao_quebra():
    # cofre "zerado" nao pode gerar ZeroDivisionError
    assert ui.barra(0, 0).endswith("0/0")


def test_barra_acima_do_maximo_nao_estoura_tamanho():
    texto = ui.barra(15, 10)
    assert texto.count("▰") == 10
    assert "15/10" in texto


def test_cor_raridade_desconhecida_cai_no_padrao():
    assert ui.cor_raridade("nao-existe") == ui.COR_RARIDADE["comum"]


def test_cor_raridade_ignora_acento_e_caixa():
    assert ui.cor_raridade("LENDÁRIO") == ui.COR_RARIDADE["lendario"]


def test_icone_raridade_cobre_todas_as_faixas():
    for rk in ui.COR_RARIDADE:
        assert ui.icone_raridade(rk)  # não vazio


def test_simbolo_moeda_desconhecida_tem_fallback():
    assert ui.simbolo_moeda("Ecos") == "◈"
    assert ui.simbolo_moeda("Lunaris") == "☾"


def test_paginar_divide_em_grupos():
    paginas = ui.paginar(list(range(7)), 3)
    assert paginas == [[0, 1, 2], [3, 4, 5], [6]]


def test_paginar_lista_vazia_devolve_uma_pagina_vazia():
    assert ui.paginar([], 5) == [[]]


def test_embed_usa_marca_no_footer():
    e = ui.embed("Título", categoria="loja")
    assert e.footer.text == ui.MARCA
    assert e.color.value == ui.COR["loja"]


def test_embed_cor_explicita_sobrepoe_categoria():
    e = ui.embed("Título", categoria="loja", cor=0x123456)
    assert e.color.value == 0x123456


if __name__ == "__main__":
    testes = [v for k, v in sorted(globals().items()) if k.startswith("test_") and callable(v)]
    for fn in testes:
        fn()
        print("ok:", fn.__name__)
    print(f"\n✅ {len(testes)} testes de ui passaram.")
