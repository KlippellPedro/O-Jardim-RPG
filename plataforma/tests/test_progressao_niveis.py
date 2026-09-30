from __future__ import annotations

import unittest

from core.progressao_niveis import (
    NIVEL_CONTEUDO_CLASSE,
    NIVEL_MAXIMO_CLASSE,
    NIVEL_MINIMO_GRAU,
    PATAMARES_NIVEL,
    aumentos_atributo_por_nivel,
    legados_por_nivel,
    nivel_por_xp,
    patamar_atual,
    patamares_alcancados,
    vagas_item_especial_por_nivel,
    xp_para_nivel,
)

# Os mesmos valores estão em tests/frontend/progressaoNiveis.test.ts: se um lado
# mudar sem o outro, um dos dois testes quebra.
XP_ESPERADO = [
    (1, 0), (2, 1_000), (20, 190_000), (60, 1_770_000), (99, 4_851_000), (100, 4_950_000),
    (101, 5_050_000), (149, 9_850_000), (150, 9_950_000), (151, 10_100_000), (249, 24_800_000),
    (250, 24_950_000), (251, 25_200_000), (499, 87_200_000), (500, 87_450_000), (501, 87_950_000),
    (1000, 337_450_000),
]
LEGADOS_ESPERADOS = [
    (0, 0), (4, 0), (5, 1), (49, 9), (50, 10), (59, 10), (60, 11), (100, 15), (119, 15),
    (120, 16), (199, 19), (200, 20), (500, 35),
]
ATRIBUTOS_ESPERADOS = [
    (3, 0), (4, 1), (48, 12), (50, 12), (57, 12), (58, 13), (60, 13), (100, 18), (115, 18),
    (116, 19), (200, 24),
]


class ProgressaoNiveisTests(unittest.TestCase):
    def test_xp_acumulado_bate_com_a_tabela_e_com_as_faixas(self) -> None:
        for nivel, xp in XP_ESPERADO:
            with self.subTest(nivel=nivel):
                self.assertEqual(xp_para_nivel(nivel), xp)

    def test_ate_o_100_o_xp_segue_a_formula_de_sempre(self) -> None:
        for nivel in range(1, 101):
            with self.subTest(nivel=nivel):
                self.assertEqual(xp_para_nivel(nivel), 500 * nivel * (nivel - 1))

    def test_nivel_por_xp_e_o_inverso_e_nao_tem_teto(self) -> None:
        for nivel in (1, 2, 3, 19, 20, 60, 99, 100, 101, 149, 150, 151, 249, 250, 251, 499, 500, 501, 1000, 1450):
            with self.subTest(nivel=nivel):
                self.assertEqual(nivel_por_xp(xp_para_nivel(nivel)), nivel)
                if nivel > 1:
                    self.assertEqual(nivel_por_xp(xp_para_nivel(nivel) - 1), nivel - 1)

    def test_nivel_por_xp_aceita_lixo(self) -> None:
        for valor in (-10, float("nan"), float("inf"), "abc", None):
            with self.subTest(valor=valor):
                self.assertEqual(nivel_por_xp(valor), 1)

    def test_legados_por_faixa(self) -> None:
        for nivel, legados in LEGADOS_ESPERADOS:
            with self.subTest(nivel=nivel):
                self.assertEqual(legados_por_nivel(nivel), legados)

    def test_aumentos_de_atributo_por_faixa(self) -> None:
        for nivel, aumentos in ATRIBUTOS_ESPERADOS:
            with self.subTest(nivel=nivel):
                self.assertEqual(aumentos_atributo_por_nivel(nivel), aumentos)

    def test_ate_o_50_nada_muda_para_quem_esta_no_padrao(self) -> None:
        for nivel in range(1, 51):
            with self.subTest(nivel=nivel):
                self.assertEqual(legados_por_nivel(nivel), nivel // 5)
                self.assertEqual(aumentos_atributo_por_nivel(nivel), nivel // 4)

    def test_vagas_de_item_especial_por_faixa(self) -> None:
        for nivel, vagas in ((1, 1), (7, 1), (8, 2), (50, 12), (58, 13), (100, 18), (116, 19)):
            with self.subTest(nivel=nivel):
                self.assertEqual(vagas_item_especial_por_nivel(nivel), vagas)

    def test_nivel_minimo_de_cada_grau_de_pericia(self) -> None:
        # Mesmo valor de tests/frontend/progressaoNiveis.test.ts.
        self.assertEqual(NIVEL_MINIMO_GRAU, (1, 1, 3, 7, 13, 19, 29))

    def test_patamares(self) -> None:
        self.assertEqual(PATAMARES_NIVEL, (60, 100, 150, 250, 500))
        self.assertEqual(patamares_alcancados(59), [])
        self.assertEqual(patamares_alcancados(100), [60, 100])
        self.assertIsNone(patamar_atual(59))
        self.assertEqual(patamar_atual(249), 150)
        self.assertEqual(patamar_atual(250), 250)

    def test_limites_de_classe(self) -> None:
        self.assertEqual(NIVEL_CONTEUDO_CLASSE, 20)
        self.assertEqual(NIVEL_MAXIMO_CLASSE, 50)


if __name__ == "__main__":
    unittest.main()
