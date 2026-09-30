from __future__ import annotations

import unittest
from pathlib import Path

from core.character_summary import _CATALOGO, _graus_de_treinamento, carregar_catalogos
from core.maestria_classe import MARCOS_MAESTRIA, graus_de_maestria, niveis_de_reforco_de_recursos

DATA_ROOT = Path(__file__).resolve().parent.parent.parent / "data"

# Os mesmos valores estão em tests/frontend/maestriaClasse.test.ts.
GRAUS_ESPERADOS = [(1, 0), (20, 0), (24, 0), (29, 0), (30, 1), (39, 1), (40, 2), (49, 2), (50, 3), (60, 3)]
REFORCO_ESPERADO = [(1, 0), (24, 0), (25, 2), (34, 2), (35, 4), (44, 4), (45, 6), (50, 6), (80, 6)]


class MaestriaClasseTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        carregar_catalogos(DATA_ROOT)

    def test_marcos_de_5_em_5_entre_o_21_e_o_50(self) -> None:
        self.assertEqual([marco["nivel"] for marco in MARCOS_MAESTRIA], [25, 30, 35, 40, 45, 50])

    def test_graus_de_maestria_por_nivel(self) -> None:
        for nivel, graus in GRAUS_ESPERADOS:
            with self.subTest(nivel=nivel):
                self.assertEqual(graus_de_maestria(nivel), graus)

    def test_reforco_de_recursos_por_nivel(self) -> None:
        for nivel, niveis in REFORCO_ESPERADO:
            with self.subTest(nivel=nivel):
                self.assertEqual(niveis_de_reforco_de_recursos(nivel), niveis)

    def test_nivel_invalido_nao_quebra(self) -> None:
        for valor in ("abc", None, float("nan"), -5):
            with self.subTest(valor=valor):
                self.assertEqual(graus_de_maestria(valor), 0)

    def test_orcamento_de_graus_de_treinamento_inclui_a_maestria(self) -> None:
        comum = _CATALOGO["classe"]["guerreiro"]
        especial = _CATALOGO["classe"]["campeao-dimensional"]
        # Até o 20 é só o que a classe escreve: 4 para comum e 8 para especial.
        self.assertEqual(_graus_de_treinamento([(comum, 20)]), 4)
        self.assertEqual(_graus_de_treinamento([(especial, 20)]), 8)
        # Acima dele, +1 grau nos níveis 30, 40 e 50, igual para as duas categorias.
        self.assertEqual(_graus_de_treinamento([(comum, 29)]), 4)
        self.assertEqual(_graus_de_treinamento([(comum, 30)]), 5)
        self.assertEqual(_graus_de_treinamento([(comum, 50)]), 7)
        self.assertEqual(_graus_de_treinamento([(especial, 50)]), 11)
        # E soma entre as classes da ficha.
        self.assertEqual(_graus_de_treinamento([(comum, 50), (especial, 20)]), 7 + 8)


if __name__ == "__main__":
    unittest.main()
