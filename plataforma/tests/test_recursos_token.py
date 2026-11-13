import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from core import recursos_token as rt  # noqa: E402


class AplicarRecursoTest(unittest.TestCase):
    def test_dano_gasta_o_extra_temporario_primeiro(self):
        self.assertEqual(rt.aplicar("vida", 30, 40, 5, delta=-8), (27, 0))

    def test_dano_menor_que_o_extra_so_gasta_o_extra(self):
        self.assertEqual(rt.aplicar("vida", 30, 40, 5, delta=-3), (30, 2))

    def test_cura_que_passa_do_maximo_vira_extra_temporario(self):
        self.assertEqual(rt.aplicar("vida", 38, 40, 0, delta=10), (40, 8))

    def test_vida_pode_ficar_negativa_ate_o_limite(self):
        self.assertEqual(rt.aplicar("vida", 3, 40, 0, delta=-10), (-7, 0))
        self.assertEqual(rt.aplicar("vida", 3, 40, 0, delta=-5000)[0], rt.VIDA_MINIMA)

    def test_valor_escrito_a_mao_nao_mexe_no_extra(self):
        self.assertEqual(rt.aplicar("vida", 10, 40, 6, novo=25), (25, 6))
        self.assertEqual(rt.aplicar("vida", 10, 40, 6, novo=90), (40, 6))

    def test_mana_estamina_e_sanidade_ficam_entre_zero_e_o_maximo(self):
        for tipo in ("mana", "estamina", "sanidade"):
            with self.subTest(tipo=tipo):
                self.assertEqual(rt.aplicar(tipo, 5, 20, 0, delta=-9)[0], 0)
                self.assertEqual(rt.aplicar(tipo, 18, 20, 0, delta=9)[0], 20)
                self.assertEqual(rt.aplicar(tipo, 5, 20, 0, novo=12)[0], 12)

    def test_pede_delta_ou_valor_novo_nunca_os_dois(self):
        with self.assertRaises(rt.ErroRecurso):
            rt.aplicar("mana", 5, 20)
        with self.assertRaises(rt.ErroRecurso):
            rt.aplicar("mana", 5, 20, delta=1, novo=3)

    def test_sem_maximo_nao_ha_o_que_mexer(self):
        with self.assertRaises(rt.ErroRecurso):
            rt.aplicar("mana", 0, 0, delta=1)

    def test_tipo_desconhecido(self):
        with self.assertRaises(rt.ErroRecurso):
            rt.aplicar("fome", 1, 10, delta=1)

    def test_campos_da_ficha(self):
        self.assertEqual(rt.campos_da_ficha("vida", 12, 3), ({"vidaAtual": 12, "vidaTemporaria": 3}, {"vidaAtual": 12}))
        self.assertEqual(rt.campos_da_ficha("mana", 7, 0), ({"manaAtual": 7}, {}))
        self.assertEqual(rt.campos_da_ficha("estamina", 7, 0), ({"estaminaAtual": 7}, {}))
        self.assertEqual(rt.campos_da_ficha("sanidade", 70, 0), ({"sanidadeAtual": 70}, {}))


if __name__ == "__main__":
    unittest.main()
