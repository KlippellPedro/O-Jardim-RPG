"""Fases de chefe sem banco: o que o catálogo pode trazer e quando a fase sobe."""

from __future__ import annotations

import unittest

from core.fases import fase_alcancada, fases_limpas


def _fase(nome, quando=None, rodada=None):
    return {"nome": nome, "quando": quando, "rodada": rodada, "anuncio": "A cena muda.", "mudancas": ["Algo muda."]}


class FasesLimpasTest(unittest.TestCase):
    def test_rodada_entra_limpa_e_lixo_vira_nulo(self):
        limpas = fases_limpas([
            _fase("Pela rodada", rodada=6),
            _fase("Rodada em texto", rodada="6"),
            _fase("Rodada um", rodada=1),
            _fase("Rodada quebrada", rodada=4.5),
            _fase("Rodada demais", rodada=100),
            _fase("Rodada booleana", rodada=True),
        ])
        self.assertEqual([fase["rodada"] for fase in limpas], [6, None, None, None, None, None])

    def test_fase_antiga_sem_rodada_continua_igual(self):
        limpas = fases_limpas([{"nome": "Metade", "quando": 0.5, "anuncio": "x", "mudancas": ["y"]}])
        self.assertEqual(limpas[0]["quando"], 0.5)
        self.assertIsNone(limpas[0]["rodada"])


class FaseAlcancadaTest(unittest.TestCase):
    fases = [_fase("Meia-Noite", quando=0.5, rodada=4), _fase("Hora Zero", rodada=8)]

    def test_vale_o_gatilho_que_chegar_primeiro(self):
        self.assertEqual(fase_alcancada(self.fases, 100, 100, 1, rodada=3), 1)
        self.assertEqual(fase_alcancada(self.fases, 100, 100, 1, rodada=4), 2, "a rodada chega antes da Vida")
        self.assertEqual(fase_alcancada(self.fases, 40, 100, 1, rodada=2), 2, "a Vida chega antes da rodada")
        self.assertEqual(fase_alcancada(self.fases, 100, 100, 1, rodada=9), 3, "a rodada pode pular fases")

    def test_fora_de_combate_a_rodada_nao_conta(self):
        self.assertEqual(fase_alcancada(self.fases, 100, 100, 1, rodada=None), 1)

    def test_a_fase_nunca_desce_e_criatura_caida_nao_avanca(self):
        self.assertEqual(fase_alcancada(self.fases, 100, 100, 3, rodada=1), 3)
        self.assertEqual(fase_alcancada(self.fases, 0, 100, 1, rodada=9), 1)

    def test_sem_vida_maxima_so_a_rodada_decide(self):
        self.assertEqual(fase_alcancada(self.fases, 5, 0, 1, rodada=4), 2)
        self.assertEqual(fase_alcancada(self.fases, 5, 0, 1, rodada=None), 1)


if __name__ == "__main__":
    unittest.main()
