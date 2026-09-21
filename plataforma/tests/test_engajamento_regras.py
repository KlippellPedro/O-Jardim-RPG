"""Regras do engajamento (core/engajamento.py e core/discord_avisos.py). Sem banco."""

from __future__ import annotations

import unittest
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from core.discord_avisos import AVISOS_PADRAO, avisos_da_campanha
from core.engajamento import contagem_regressiva, montar_rank, resultado_mvp

AGORA = datetime(2026, 9, 21, 20, 0, tzinfo=timezone.utc)


class ContagemTests(unittest.TestCase):
    def texto(self, **delta):
        return contagem_regressiva(AGORA + timedelta(**delta), AGORA)["texto"]

    def test_sem_data_nao_ha_contagem(self):
        self.assertIsNone(contagem_regressiva(None, AGORA))

    def test_palavras_para_cada_distancia(self):
        self.assertEqual(self.texto(days=3, hours=2), "em 3 dias")
        self.assertEqual(self.texto(days=1, hours=3), "amanhã")
        self.assertEqual(self.texto(hours=5, minutes=10), "em 5 horas")
        self.assertEqual(self.texto(hours=1, minutes=1), "em 1 hora")
        self.assertEqual(self.texto(minutes=40), "em 40 minutos")
        self.assertEqual(self.texto(minutes=1), "em 1 minuto")
        self.assertEqual(self.texto(seconds=20), "em 1 minuto")

    def test_no_momento_e_depois_de_passar(self):
        self.assertEqual(self.texto(seconds=-30), "É agora!")
        atrasada = contagem_regressiva(AGORA - timedelta(days=2), AGORA)
        self.assertTrue(atrasada["passou"])

    def test_data_sem_fuso_conta_como_utc(self):
        naive = (AGORA + timedelta(days=2, hours=1)).replace(tzinfo=None)
        self.assertEqual(contagem_regressiva(naive, AGORA)["texto"], "em 2 dias")


def personagem(nome, **campos):
    return {"personagem_id": uuid4(), "nome": nome, **campos}


class RankTests(unittest.TestCase):
    def test_sem_numeros_nao_ha_titulo(self):
        rank = montar_rank([personagem("Mira"), personagem("Kel")])
        self.assertEqual(rank["titulos"], [])
        self.assertEqual(len(rank["jogadores"]), 2)

    def test_cada_titulo_vai_para_o_maior_numero(self):
        rank = montar_rank([
            personagem("Mira", rolagens=40, criticos=3, falhas=0, dano_maximo=22, dano_total=300, lunaris_gastos=100, lunaris_ganhos=900),
            personagem("Kel", rolagens=55, criticos=1, falhas=4, dano_maximo=48, dano_total=200, lunaris_gastos=2500, lunaris_ganhos=400, usos=9),
        ])
        quem = {titulo["chave"]: titulo["nome"] for titulo in rank["titulos"]}
        self.assertEqual(quem["rei_do_vinte"], "Mira")
        self.assertEqual(quem["azarao"], "Kel")
        self.assertEqual(quem["mao_pesada"], "Kel")
        self.assertEqual(quem["maquina_de_dano"], "Mira")
        self.assertEqual(quem["gastador"], "Kel")
        self.assertEqual(quem["pe_de_meia"], "Mira")
        self.assertEqual(quem["rolador"], "Kel")
        self.assertEqual(quem["conjurador"], "Kel")

    def test_pe_de_meia_so_existe_com_saldo_positivo(self):
        rank = montar_rank([personagem("Kel", rolagens=3, lunaris_gastos=500, lunaris_ganhos=100)])
        self.assertNotIn("pe_de_meia", {t["chave"] for t in rank["titulos"]})

    def test_empate_fica_com_a_ordem_alfabetica_e_avisa_quantos_dividem(self):
        rank = montar_rank([personagem("Zed", criticos=2), personagem("Ana", criticos=2), personagem("Bia", criticos=1)])
        titulo = next(t for t in rank["titulos"] if t["chave"] == "rei_do_vinte")
        self.assertEqual((titulo["nome"], titulo["empatados"], titulo["valor"]), ("Ana", 2, 2))

    def test_frases_concordam_no_singular_e_nao_usam_travessao(self):
        um = montar_rank([personagem("Mira", criticos=1, falhas=1, rolagens=1)])
        frases = {t["chave"]: t["frase"] for t in um["titulos"]}
        self.assertIn("1 vinte natural", frases["rei_do_vinte"])
        self.assertIn("1 um natural", frases["azarao"])
        self.assertIn("1 vez", frases["rolador"])
        varios = montar_rank([personagem("Mira", criticos=3, lunaris_gastos=12500, rolagens=2)])
        todas = [t["frase"] for t in varios["titulos"]]
        self.assertTrue(any("3 vintes naturais" in f for f in todas))
        self.assertTrue(any("12.500 Lunaris" in f for f in todas))
        self.assertFalse(any("—" in f or "–" in f for f in todas))

    def test_jogadores_ordenados_por_rolagens(self):
        rank = montar_rank([personagem("A", rolagens=1), personagem("B", rolagens=9), personagem("C", rolagens=5)])
        self.assertEqual([j["nome"] for j in rank["jogadores"]], ["B", "C", "A"])


class MvpTests(unittest.TestCase):
    def test_placar_e_vencedores_com_empate(self):
        a, b = uuid4(), uuid4()
        resultado = resultado_mvp([
            {"alvo_usuario_id": a, "alvo_nome": "Ana"}, {"alvo_usuario_id": b, "alvo_nome": "Bruno"},
            {"alvo_usuario_id": a, "alvo_nome": "Ana"}, {"alvo_usuario_id": b, "alvo_nome": "Bruno"},
        ])
        self.assertEqual(resultado["total_votos"], 4)
        self.assertEqual([v["nome"] for v in resultado["vencedores"]], ["Ana", "Bruno"])

    def test_sem_votos_ninguem_vence(self):
        self.assertEqual(resultado_mvp([]), {"ranking": [], "vencedores": [], "total_votos": 0})


class AvisosDiscordTests(unittest.TestCase):
    def test_padrao_liga_o_essencial_e_desliga_critico(self):
        avisos = avisos_da_campanha(None)
        self.assertEqual(avisos, AVISOS_PADRAO)
        self.assertFalse(avisos["critico"])
        self.assertTrue(avisos["sessao"])

    def test_o_salvo_vence_o_padrao_e_lixo_e_ignorado(self):
        avisos = avisos_da_campanha({"critico": True, "sessao": False, "inventado": True, "lembrete": "sim"})
        self.assertTrue(avisos["critico"])
        self.assertFalse(avisos["sessao"])
        self.assertTrue(avisos["lembrete"])
        self.assertNotIn("inventado", avisos)


if __name__ == "__main__":
    unittest.main()
