"""O dado que cai para a mesa toda (core/dados.py, resumo_publico): leva só o que se vê no dado."""

from __future__ import annotations

import unittest

from core.dados import resumo_publico, rolar_formula, rolar_teste


class ResumoPublicoTests(unittest.TestCase):
    def test_teste_de_d20_leva_os_dados_o_bonus_e_o_total_mas_nao_a_dt_nem_o_grau(self):
        dados = rolar_teste(3, vantagens=1, dt=15)
        resumo = resumo_publico("rolagem", dados)
        self.assertEqual(resumo["dados"], dados["dados"])
        self.assertEqual(len(resumo["dados"]), 2)
        self.assertEqual(resumo["natural"], dados["natural"])
        self.assertEqual(resumo["bonus"], 3)
        self.assertEqual(resumo["total"], dados["total"])
        self.assertNotIn("dt", resumo)
        self.assertNotIn("grau", resumo)

    def test_dado_extra_entra_so_com_a_formula_e_o_total(self):
        resumo = resumo_publico("rolagem", rolar_teste(0, extras="1d4"))
        self.assertEqual(set(resumo["extras"]), {"formula", "total"})

    def test_dano_leva_os_termos_de_dado(self):
        dados = rolar_formula("2d6+1d4+3")
        resumo = resumo_publico("dano", dados)
        self.assertEqual([(t["faces"], len(t["valores"])) for t in resumo["termos"]], [(6, 2), (4, 1)])
        self.assertEqual(resumo["bonus"], 3)
        self.assertEqual(resumo["total"], dados["total"])

    def test_varias_rolagens_separadas_e_numero_puro_nao_viram_dado_na_tela(self):
        self.assertIsNone(resumo_publico("dano", rolar_formula("3#d8")))
        self.assertIsNone(resumo_publico("dano", rolar_formula("5")))
        self.assertIsNone(resumo_publico("outro", {"total": 4}))

    def test_o_servidor_nunca_manda_ao_navegador_algo_alem_dos_numeros_do_dado(self):
        for _ in range(20):
            resumo = resumo_publico("rolagem", rolar_teste(2, 0, 1, dt=12))
            self.assertTrue(set(resumo) <= {"dados", "natural", "bonus", "total", "critico_natural", "falha_natural", "extras"})


if __name__ == "__main__":
    unittest.main()
