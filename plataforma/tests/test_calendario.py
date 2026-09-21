"""Calendário do mundo (core/calendario.py). Sem banco."""

from __future__ import annotations

import unittest

from core import calendario as cal
from core.calendario import ErroCalendario


def novo():
    return cal.estado_inicial()


class DatasTests(unittest.TestCase):
    def test_avancar_vira_mes_e_ano(self):
        estado = novo()
        cal.definir_hoje(estado, {"ano": 3, "mes": 11, "dia": 29})
        cal.avancar(estado, 2)
        self.assertEqual(estado["hoje"], {"ano": 4, "mes": 0, "dia": 1})
        cal.avancar(estado, -1)
        self.assertEqual(estado["hoje"], {"ano": 3, "mes": 11, "dia": 30})

    def test_estacao_segue_o_mes_e_a_especial_dura_ate_a_estacao_mudar(self):
        estado = novo()
        cal.definir_hoje(estado, {"ano": 1, "mes": 2, "dia": 28})
        self.assertEqual(cal.estacao_atual(estado), "primavera")
        cal.definir_estacao_especial(estado, "eclipse")
        self.assertEqual(cal.estacao_atual(estado), "eclipse")
        cal.avancar(estado, 1)  # ainda primavera
        self.assertEqual(cal.estacao_atual(estado), "eclipse")
        cal.avancar(estado, 3)  # virou o verao
        self.assertEqual(cal.estacao_atual(estado), "verao")
        self.assertIsNone(estado["estacao_especial"])

    def test_valida_intervalos(self):
        estado = novo()
        for dados in ({"ano": 1, "mes": 12, "dia": 1}, {"ano": 1, "mes": 0, "dia": 31}, {"ano": "x", "mes": 0, "dia": 1}):
            with self.assertRaises(ErroCalendario):
                cal.definir_hoje(estado, dados)
        with self.assertRaises(ErroCalendario):
            cal.definir_estacao_especial(estado, "verao")


class EventosTests(unittest.TestCase):
    def _com_eventos(self):
        estado = novo()
        cal.definir_hoje(estado, {"ano": 5, "mes": 0, "dia": 10})
        cal.adicionar_evento(estado, {"titulo": "Festa da Colheita", "mes": 8, "dia": 15, "anual": True, "revelacao": "aberto"})
        cal.adicionar_evento(estado, {"titulo": "O selo se rompe", "nota": "Segredo do vilao", "mes": 0, "dia": 20, "ano": 5, "revelacao": "rasurado"})
        cal.adicionar_evento(estado, {"titulo": "Traicao do rei", "mes": 0, "dia": 25, "ano": 5, "revelacao": "oculto"})
        return estado

    def test_jogador_nao_recebe_texto_de_evento_rasurado_nem_sabe_do_oculto(self):
        estado = self._com_eventos()
        visao = cal.visao(estado, gestor=False)
        dias = {d["dia"]: d["eventos"] for d in visao["mes"]["dias"]}
        self.assertEqual(len(dias[20]), 1)
        self.assertTrue(dias[20][0]["rasurado"])
        self.assertEqual((dias[20][0]["titulo"], dias[20][0]["nota"]), ("", ""))
        self.assertEqual(dias[25], [])
        texto = str(visao)
        self.assertNotIn("Segredo do vilao", texto)
        self.assertNotIn("Traicao do rei", texto)

    def test_mestre_ve_tudo_com_o_grau_de_revelacao(self):
        estado = self._com_eventos()
        visao = cal.visao(estado, gestor=True)
        dias = {d["dia"]: d["eventos"] for d in visao["mes"]["dias"]}
        self.assertEqual(dias[25][0]["titulo"], "Traicao do rei")
        self.assertEqual(dias[25][0]["revelacao"], "oculto")

    def test_evento_anual_repete_e_proximos_sao_ordenados(self):
        estado = self._com_eventos()
        visao = cal.visao(estado, gestor=False, ano=9, mes=8)
        dia15 = next(d for d in visao["mes"]["dias"] if d["dia"] == 15)
        self.assertEqual(dia15["eventos"][0]["titulo"], "Festa da Colheita")
        proximos = cal.visao(estado, gestor=False)["proximos"]
        self.assertEqual([p["em_dias"] for p in proximos], sorted(p["em_dias"] for p in proximos))
        self.assertEqual(proximos[0]["em_dias"], 10)
        self.assertTrue(proximos[0]["rasurado"])

    def test_editar_revelar_e_apagar(self):
        estado = self._com_eventos()
        oculto = next(e for e in estado["eventos"] if e["revelacao"] == "oculto")
        cal.editar_evento(estado, oculto["id"], {"revelacao": "aberto"})
        visao = cal.visao(estado, gestor=False)
        self.assertTrue(any(e["titulo"] == "Traicao do rei" for d in visao["mes"]["dias"] for e in d["eventos"]))
        cal.apagar_evento(estado, oculto["id"])
        with self.assertRaises(ErroCalendario):
            cal.apagar_evento(estado, oculto["id"])

    def test_evento_invalido(self):
        estado = novo()
        with self.assertRaises(ErroCalendario):
            cal.adicionar_evento(estado, {"titulo": " ", "mes": 0, "dia": 1, "ano": 1})
        with self.assertRaises(ErroCalendario):
            cal.adicionar_evento(estado, {"titulo": "x", "mes": 0, "dia": 1, "ano": 1, "revelacao": "talvez"})
        with self.assertRaises(ErroCalendario):
            cal.adicionar_evento(estado, {"titulo": "x", "mes": 0, "dia": 1})  # sem ano e nao anual


class ConfigTests(unittest.TestCase):
    def test_renomear_meses_exige_doze(self):
        estado = novo()
        with self.assertRaises(ErroCalendario):
            cal.definir_config(estado, {"meses": ["a", "b"]})
        cal.definir_config(estado, {"meses": [f"Mes {i}" for i in range(12)]})
        self.assertEqual(cal.visao(estado, gestor=False)["mes"]["nome"], "Mes 0")

    def test_estado_vazio_do_banco_vira_calendario_padrao(self):
        visao = cal.visao(cal.completar({}), gestor=False)
        self.assertEqual(visao["estacao"]["chave"], "primavera")
        self.assertEqual(len(visao["mes"]["dias"]), 30)
        self.assertNotIn("sincronizar_discord", visao["config"])


if __name__ == "__main__":
    unittest.main()
