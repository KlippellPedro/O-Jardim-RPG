"""Condições de combate com duração (retrocompatível com o formato antigo)."""

import unittest

from core.condicoes import decrementar_condicoes, normalizar_condicoes


class NormalizarCondicoesTests(unittest.TestCase):
    def test_strings_antigas_viram_permanentes(self):
        self.assertEqual(
            normalizar_condicoes(["Envenenado", "Caído"]),
            [{"nome": "Envenenado", "turnos": None}, {"nome": "Caído", "turnos": None}],
        )

    def test_objetos_com_turnos_sao_preservados(self):
        self.assertEqual(
            normalizar_condicoes([{"nome": "Atordoado", "turnos": 2}]),
            [{"nome": "Atordoado", "turnos": 2}],
        )

    def test_turnos_invalidos_viram_permanente(self):
        for ruim in (0, -3, "x", True, None):
            self.assertIsNone(normalizar_condicoes([{"nome": "X", "turnos": ruim}])[0]["turnos"])

    def test_turno_fracionario_trunca_para_inteiro(self):
        self.assertEqual(normalizar_condicoes([{"nome": "X", "turnos": 2.9}])[0]["turnos"], 2)

    def test_deduplica_por_nome_sem_diferenciar_maiuscula(self):
        saida = normalizar_condicoes(["Cego", {"nome": "cego", "turnos": 3}])
        self.assertEqual(len(saida), 1)
        self.assertEqual(saida[0]["nome"], "Cego")  # mantém a primeira ocorrência

    def test_ignora_vazio_e_limita_quantidade(self):
        self.assertEqual(normalizar_condicoes(None), [])
        self.assertEqual(normalizar_condicoes([""]), [])
        muitas = [{"nome": f"c{n}", "turnos": 1} for n in range(30)]
        self.assertEqual(len(normalizar_condicoes(muitas)), 20)


class DecrementarCondicoesTests(unittest.TestCase):
    def test_tira_um_turno_e_mantem_permanentes(self):
        entrada = [{"nome": "Atordoado", "turnos": 2}, "Envenenado"]
        self.assertEqual(
            decrementar_condicoes(entrada),
            [{"nome": "Atordoado", "turnos": 1}, {"nome": "Envenenado", "turnos": None}],
        )

    def test_remove_ao_chegar_a_zero(self):
        self.assertEqual(decrementar_condicoes([{"nome": "Cego", "turnos": 1}]), [])

    def test_encadear_rodadas(self):
        atual = [{"nome": "Paralisado", "turnos": 3}]
        for esperado in (2, 1):
            atual = decrementar_condicoes(atual)
            self.assertEqual(atual[0]["turnos"], esperado)
        self.assertEqual(decrementar_condicoes(atual), [])  # a 3ª rodada zera


if __name__ == "__main__":
    unittest.main()
