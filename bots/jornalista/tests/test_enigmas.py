"""Banco de enigmas dos Baús Trancados.

Regressão: o enigma sobre estações aceitava "inverno" como a que traz mais
loot raro, mas em `core/economia.py` o Inverno é a PIOR estação normal (raro
2%, sem épico/lendário) e o Verão é melhor (raro 7%, épico 1%). Quem
consultasse `/estacao` e raciocinasse corretamente era rejeitado.
"""

from __future__ import annotations

import sys
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE))

from core import economia
from core.enigmas import DIFICULDADES, ENIGMAS, checar_resposta, enigmas_da_dificuldade, normalizar


def _enigma_das_estacoes():
    candidatos = [e for e in ENIGMAS if "Verão" in e.pergunta and "Inverno" in e.pergunta]
    assert len(candidatos) == 1, "esperava exatamente um enigma comparando Verão e Inverno"
    return candidatos[0]


def test_resposta_do_enigma_bate_com_os_pesos_reais_das_estacoes():
    enigma = _enigma_das_estacoes()

    def chance_de_raro_ou_melhor(estacao_id: str) -> int:
        pesos = economia.ESTACOES[estacao_id]["pesos"]
        return pesos["raro"] + pesos["epico"] + pesos["lendario"]

    verao = chance_de_raro_ou_melhor("verao")
    inverno = chance_de_raro_ou_melhor("inverno")
    assert verao > inverno, "se isso falhar, o enigma também precisa mudar"

    resposta_certa = "verao" if verao > inverno else "inverno"
    assert checar_resposta(enigma, resposta_certa) is True
    assert checar_resposta(enigma, "inverno" if resposta_certa == "verao" else "verao") is False


def test_todos_os_enigmas_tem_pelo_menos_uma_resposta_normalizavel():
    for enigma in ENIGMAS:
        assert enigma.respostas, f"enigma sem resposta: {enigma.pergunta}"
        for resposta in enigma.respostas:
            assert normalizar(resposta) == resposta, (
                f"resposta '{resposta}' não está na forma normalizada "
                f"('{normalizar(resposta)}'): checar_resposta ainda funciona, "
                "mas é sinal de inconsistência no cadastro"
            )


def test_todas_as_dificuldades_tem_variedade_suficiente():
    for dificuldade in DIFICULDADES:
        assert len(enigmas_da_dificuldade(dificuldade)) >= 8


def test_banco_mistura_rpg_vida_charadas_e_logica():
    categorias = {enigma.categoria for enigma in ENIGMAS}
    assert {"O Jardim", "Economia", "Vida cotidiana", "Charada clássica", "Lógica"} <= categorias
    assert len(ENIGMAS) >= 50
