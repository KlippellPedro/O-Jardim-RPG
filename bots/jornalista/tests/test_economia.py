"""
Testes da fatia de economia que o Jornalista usa pra entregar loot — rodam
SEM Discord e SEM banco de dados.
Uso: python tests/test_economia.py  (a partir de bots/jornalista)
"""

import sys
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE))

from core import economia


def test_capacidade_do_cofre_tier_conhecido():
    assert economia.capacidade_do_cofre("comum") == 10
    assert economia.capacidade_do_cofre("eterno") == 200


def test_capacidade_do_cofre_tier_desconhecido_cai_no_inicial():
    assert economia.capacidade_do_cofre("nao-existe") == economia.capacidade_do_cofre(economia.COFRE_TIER_INICIAL)


def test_pode_guardar_respeita_capacidade():
    assert economia.pode_guardar(itens_atuais=9, quantidade=1, tier_id="comum") is True
    assert economia.pode_guardar(itens_atuais=10, quantidade=1, tier_id="comum") is False


def test_estacao_info_desconhecida_cai_no_padrao():
    info = economia.estacao_info("nao-existe")
    assert info == economia.ESTACOES[economia.ESTACAO_PADRAO]


def test_estacao_info_ignora_acento_e_caixa():
    assert economia.estacao_info("VERAO") == economia.ESTACOES["verao"]


def test_estacoes_sao_seis_com_quatro_normais_e_duas_especiais():
    assert len(economia.ESTACOES) == 6
    normais = [k for k, v in economia.ESTACOES.items() if v["tipo"] == "normal"]
    especiais = [k for k, v in economia.ESTACOES.items() if v["tipo"] == "especial"]
    assert set(normais) == {"primavera", "verao", "outono", "inverno"}
    assert set(especiais) == {"noite_eterna", "eclipse"}


def test_pesos_de_cada_estacao_somam_100():
    for chave, info in economia.ESTACOES.items():
        assert sum(info["pesos"].values()) == 100, chave


if __name__ == "__main__":
    testes = [v for k, v in sorted(globals().items()) if k.startswith("test_") and callable(v)]
    for fn in testes:
        fn()
        print("ok:", fn.__name__)
    print(f"\n✅ {len(testes)} testes de economia passaram.")
