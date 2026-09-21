"""Sessão fixa semanal, cancelamentos e sessões especiais (core/agenda.py). Sem banco."""

from __future__ import annotations

import unittest
from datetime import date, datetime, timedelta, timezone

from core import agenda as ag
from core.agenda import ErroAgenda

# 21/09/2026 é segunda-feira; a sexta seguinte é 25/09.
SEGUNDA = datetime(2026, 9, 21, 12, 0, tzinfo=timezone.utc)
SEXTA_18H_BRASILIA = datetime(2026, 9, 25, 21, 0, tzinfo=timezone.utc)


def fixa(**extra):
    base = {"ativa": True, "dia_semana": 4, "hora": "18:00", "fuso": "America/Sao_Paulo", "titulo": "Noite de RPG", "nota": ""}
    return {"recorrencia": {**base, **extra}, "cancelados": [], "especiais": []}


class RecorrenciaTests(unittest.TestCase):
    def test_sem_marcar_como_ativa_nao_ha_sessao_fixa(self):
        self.assertEqual(ag.normalizar_recorrencia({"ativa": False, "dia_semana": 4, "hora": "18:00"}), {})
        self.assertEqual(ag.normalizar_recorrencia({}), {})

    def test_valida_dia_hora_e_fuso(self):
        for ruim in (
            {"ativa": True, "dia_semana": 7, "hora": "18:00"},
            {"ativa": True, "dia_semana": "sexta", "hora": "18:00"},
            {"ativa": True, "dia_semana": True, "hora": "18:00"},
            {"ativa": True, "dia_semana": 4, "hora": "25:00"},
            {"ativa": True, "dia_semana": 4, "hora": "18h"},
            {"ativa": True, "dia_semana": 4, "hora": "18:00", "fuso": "Marte/Olympus"},
        ):
            with self.assertRaises(ErroAgenda, msg=repr(ruim)):
                ag.normalizar_recorrencia(ruim)
        ok = ag.normalizar_recorrencia({"ativa": True, "dia_semana": 4, "hora": "18:00", "titulo": "  Noite   de RPG "})
        self.assertEqual((ok["hora"], ok["fuso"], ok["titulo"]), ("18:00", ag.FUSO_PADRAO, "Noite de RPG"))

    def test_texto_da_recorrencia_concorda_com_o_genero_do_dia(self):
        self.assertEqual(ag.texto_da_recorrencia(fixa()["recorrencia"]), "Toda sexta, às 18:00")
        self.assertEqual(ag.texto_da_recorrencia(fixa(dia_semana=6, hora="14:30")["recorrencia"]), "Todo domingo, às 14:30")
        self.assertEqual(ag.texto_da_recorrencia({}), "")


class OcorrenciasTests(unittest.TestCase):
    def test_sexta_as_18h_de_brasilia_e_21h_utc(self):
        proxima = ag.proxima_ocorrencia(fixa(), SEGUNDA)
        self.assertEqual(datetime.fromisoformat(proxima["em"]), SEXTA_18H_BRASILIA)
        self.assertEqual((proxima["tipo"], proxima["data"], proxima["cancelada"]), ("fixa", "2026-09-25", False))

    def test_lista_as_sextas_de_um_mes_em_ordem(self):
        inicio = datetime(2026, 10, 1, tzinfo=timezone.utc)
        fim = datetime(2026, 10, 31, 23, 59, tzinfo=timezone.utc)
        datas = [o["data"] for o in ag.ocorrencias(fixa(), inicio, fim)]
        self.assertEqual(datas, ["2026-10-02", "2026-10-09", "2026-10-16", "2026-10-23", "2026-10-30"])

    def test_hora_de_fim_de_noite_nao_escorrega_de_dia_no_calendario(self):
        # 22:00 em Brasília é 01:00 UTC do sábado, mas o dia da sessão continua sendo sexta.
        noite = ag.ocorrencias(fixa(hora="22:00"), SEGUNDA, SEGUNDA + timedelta(days=10))[0]
        self.assertEqual(datetime.fromisoformat(noite["em"]), datetime(2026, 9, 26, 1, 0, tzinfo=timezone.utc))
        self.assertEqual(noite["data"], "2026-09-25")

    def test_semana_cancelada_fica_riscada_e_a_proxima_pula_para_a_seguinte(self):
        agenda = {**fixa(), "cancelados": ["2026-09-25"]}
        lista = ag.ocorrencias(agenda, SEGUNDA, SEGUNDA + timedelta(days=15))
        self.assertEqual([(o["data"], o["cancelada"]) for o in lista], [("2026-09-25", True), ("2026-10-02", False)])
        self.assertEqual(ag.proxima_ocorrencia(agenda, SEGUNDA)["data"], "2026-10-02")

    def test_sessao_especial_entra_e_pode_ser_a_proxima(self):
        especial = ag.normalizar_especial({"em": "2026-09-23T23:00:00Z", "titulo": "Sessão extra", "nota": "Especial de Halloween"})
        agenda = {**fixa(), "especiais": [especial]}
        proxima = ag.proxima_ocorrencia(agenda, SEGUNDA)
        self.assertEqual((proxima["tipo"], proxima["titulo"], proxima["id"]), ("especial", "Sessão extra", especial["id"]))
        # Sem sessão fixa, só a especial.
        so_especial = {"recorrencia": {}, "cancelados": [], "especiais": [especial]}
        self.assertEqual(ag.proxima_ocorrencia(so_especial, SEGUNDA)["tipo"], "especial")

    def test_sem_nada_marcado_nao_ha_proxima(self):
        self.assertIsNone(ag.proxima_ocorrencia({"recorrencia": {}, "cancelados": [], "especiais": []}, SEGUNDA))
        self.assertIsNone(ag.proxima_ocorrencia({}, SEGUNDA))

    def test_sessao_que_comecou_ha_pouco_ainda_e_a_proxima_e_a_de_ontem_nao(self):
        durante = SEXTA_18H_BRASILIA + timedelta(hours=1)
        self.assertEqual(ag.proxima_ocorrencia(fixa(), durante)["data"], "2026-09-25")
        depois = SEXTA_18H_BRASILIA + timedelta(hours=5)
        self.assertEqual(ag.proxima_ocorrencia(fixa(), depois)["data"], "2026-10-02")

    def test_especial_com_data_invalida_ou_sem_fuso_e_tratado(self):
        with self.assertRaises(ErroAgenda):
            ag.normalizar_especial({"em": "amanha"})
        with self.assertRaises(ErroAgenda):
            ag.normalizar_especial({})
        sem_fuso = ag.normalizar_especial({"em": datetime(2026, 9, 30, 20, 0)})
        self.assertTrue(sem_fuso["em"].endswith("+00:00"))

    def test_data_de_cancelamento_e_dia_por_extenso(self):
        self.assertEqual(ag.normalizar_data("2026-09-25"), "2026-09-25")
        with self.assertRaises(ErroAgenda):
            ag.normalizar_data("25/09/2026")
        self.assertEqual(ag.dia_por_extenso("2026-09-25"), "sexta (25/09)")

    def test_dia_do_domingo_e_da_segunda_batem_com_weekday(self):
        for indice in range(7):
            proxima = ag.proxima_ocorrencia(fixa(dia_semana=indice), SEGUNDA)
            self.assertEqual(date.fromisoformat(proxima["data"]).weekday(), indice)


if __name__ == "__main__":
    unittest.main()
