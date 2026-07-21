"""Testes do core/dados.py — lógica pura de rolagem (sem precisar de um Discord real)."""

import random
import sys
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE))

import pytest

from core import dados


def test_rolar_expressao_simples_soma_valores():
    resultado = dados.rolar("2d6", rng=random.Random(1))
    assert resultado.total == sum(resultado.termos[0].valores)
    assert len(resultado.termos[0].valores) == 2
    assert all(1 <= v <= 6 for v in resultado.termos[0].valores)


def test_rolar_expressao_com_modificador_fixo():
    rng = random.Random(1)
    parcial = dados.rolar("2d6", rng=random.Random(1))
    resultado = dados.rolar("2d6+3", rng=rng)
    assert resultado.total == parcial.total + 3


def test_rolar_expressao_mista_com_subtracao():
    resultado = dados.rolar("1d20+1d4-2", rng=random.Random(42))
    assert resultado.total == sum(t.total for t in resultado.termos)
    assert len(resultado.termos) == 3


def test_rolar_aceita_apenas_numero_fixo():
    resultado = dados.rolar("7", rng=random.Random(1))
    assert resultado.total == 7


def test_rolar_ignora_espacos_e_maiusculas():
    resultado = dados.rolar(" 1 D 6 + 2 ", rng=random.Random(1))
    assert 3 <= resultado.total <= 8


def test_rolar_expressao_vazia_invalida():
    with pytest.raises(dados.ExpressaoInvalida):
        dados.rolar("")


def test_rolar_texto_invalido_levanta_erro():
    with pytest.raises(dados.ExpressaoInvalida):
        dados.rolar("abc")


def test_rolar_lixo_apos_expressao_valida_levanta_erro():
    with pytest.raises(dados.ExpressaoInvalida):
        dados.rolar("2d6xyz")


def test_rolar_quantidade_acima_do_limite_levanta_erro():
    with pytest.raises(dados.ExpressaoInvalida):
        dados.rolar(f"{dados.MAX_QUANTIDADE + 1}d6")


def test_rolar_lados_acima_do_limite_levanta_erro():
    with pytest.raises(dados.ExpressaoInvalida):
        dados.rolar(f"1d{dados.MAX_LADOS + 1}")


def test_rolar_quantidade_zero_invalida():
    with pytest.raises(dados.ExpressaoInvalida):
        dados.rolar("0d6")


def test_rolar_detalhe_mostra_valores_rolados():
    resultado = dados.rolar("2d6+1", rng=random.Random(1))
    detalhe = resultado.detalhe()
    assert "2d6" in detalhe
    assert "+1" in detalhe


def test_teste_normal_usa_um_d20():
    resultado = dados.rolar_teste(modificador=2, modo="normal", rng=random.Random(1))
    assert len(resultado.dados) == 1
    assert resultado.total == resultado.dados[0] + 2


def test_teste_vantagem_usa_o_maior_dos_dois():
    resultado = dados.rolar_teste(modo="vantagem", rng=random.Random(7))
    assert len(resultado.dados) == 2
    assert resultado.escolhido == max(resultado.dados)


def test_teste_desvantagem_usa_o_menor_dos_dois():
    resultado = dados.rolar_teste(modo="desvantagem", rng=random.Random(7))
    assert len(resultado.dados) == 2
    assert resultado.escolhido == min(resultado.dados)


def test_teste_modo_invalido_levanta_erro():
    with pytest.raises(dados.ExpressaoInvalida):
        dados.rolar_teste(modo="turbo")


def test_sem_rng_explicito_usa_gerador_seguro():
    # rolar()/rolar_teste() sem "rng" devem cair no CSPRNG (random.SystemRandom),
    # não no random do módulo (Mersenne Twister, previsível a partir de outputs).
    assert isinstance(dados._RNG_PADRAO, random.SystemRandom)
    resultado = dados.rolar("1d20")
    assert 1 <= resultado.total <= 20


if __name__ == "__main__":
    testes = [v for k, v in sorted(globals().items()) if k.startswith("test_") and callable(v)]
    falhas = 0
    for fn in testes:
        try:
            fn()
            print("ok:", fn.__name__)
        except Exception as exc:  # noqa: BLE001 - runner manual sem pytest
            falhas += 1
            print("FALHOU:", fn.__name__, "-", exc)
    print(f"\n{'✅' if not falhas else '❌'} {len(testes) - falhas}/{len(testes)} testes de dados passaram.")
