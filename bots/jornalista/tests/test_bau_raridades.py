"""Perfis automáticos de raridade dos baús do Jornalista."""

from __future__ import annotations

import sys
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE))

from core import loot


class _RngCaptura:
    def __init__(self):
        self.pesos = None

    def choices(self, opcoes, *, weights, k):
        self.pesos = list(weights)
        return [opcoes[-1]]


def test_existem_seis_raridades_na_ordem_publica():
    assert loot.BAU_RARIDADE_ORDEM == (
        "comum", "incomum", "raro", "epico", "lendario", "mitico"
    )
    assert sum(p["peso"] for p in loot.BAU_RARIDADES.values()) == 1000
    assert sum(p["peso_especial"] for p in loot.BAU_RARIDADES.values()) == 1000


def test_raridade_maior_da_menos_tempo_e_enigma_mais_dificil():
    perfis = [loot.BAU_RARIDADES[chave] for chave in loot.BAU_RARIDADE_ORDEM]
    assert [p["expira_minutos"] for p in perfis] == [180, 120, 90, 60, 30, 15]
    assert perfis[0]["dificuldade_enigma"] is None
    assert perfis[1]["dificuldade_enigma"] is None
    assert [p["dificuldade_enigma"] for p in perfis[2:]] == [
        "facil", "medio", "dificil", "lendario"
    ]


def test_premio_escala_sem_ultrapassar_cinco_itens():
    comum = loot.parametros_premio_bau("comum", 1, 5, 40)
    mitico = loot.parametros_premio_bau("mitico", 4, 5, 40)
    assert comum == {
        "qtd_itens": 1, "lunaris_min": 5, "lunaris_max": 40, "expira_minutos": 180
    }
    assert mitico == {
        "qtd_itens": 5, "lunaris_min": 40, "lunaris_max": 320, "expira_minutos": 15
    }


def test_estacao_especial_aumenta_pesos_dos_baus_altos():
    normal, especial = _RngCaptura(), _RngCaptura()
    assert loot.sortear_raridade_bau(normal) == "mitico"
    assert loot.sortear_raridade_bau(especial, evento_especial=True) == "mitico"
    indice_mitico = loot.BAU_RARIDADE_ORDEM.index("mitico")
    assert especial.pesos[indice_mitico] > normal.pesos[indice_mitico]


def test_perfil_do_bau_controla_raridades_de_item_sem_ignorar_estacao():
    pesos = loot.pesos_itens_do_bau(
        "epico", {"raro": 2, "epico": 4, "lendario": 1, "reliquia": 1}
    )
    assert pesos["epico"] > pesos["raro"]
    assert "comum" not in pesos
