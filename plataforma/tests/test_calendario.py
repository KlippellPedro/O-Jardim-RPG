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
        cal.definir_hoje(estado, {"ano": 3, "mes": 9, "dia": 28})
        cal.avancar(estado, 2)
        self.assertEqual(estado["hoje"], {"ano": 4, "mes": 0, "dia": 1})
        cal.avancar(estado, -1)
        self.assertEqual(estado["hoje"], {"ano": 3, "mes": 9, "dia": 29})

    def test_ano_tem_um_mes_por_arvore_e_alguns_meses_tem_o_dia_29(self):
        self.assertEqual(cal.MESES_POR_ANO, 10)
        self.assertEqual(cal.MESES_PADRAO, ("Gênese", "Alétheia", "Keryx", "Anima", "Vórtice", "Baluarte", "Matriz", "Éon", "Limiar", "Abismo"))
        self.assertEqual([cal.dias_do_mes(mes) for mes in range(10)], [28, 29, 28, 28, 28, 28, 28, 29, 29, 29])
        self.assertEqual(cal.DIAS_POR_ANO, 284)
        estado = novo()
        cal.definir_hoje(estado, {"ano": 1, "mes": 8, "dia": 28})
        cal.avancar(estado, 1)
        self.assertEqual(estado["hoje"], {"ano": 1, "mes": 8, "dia": 29})
        cal.avancar(estado, 1)
        self.assertEqual(estado["hoje"], {"ano": 1, "mes": 9, "dia": 1})

    def test_datas_de_ida_e_volta_em_todos_os_dias_do_ano(self):
        for total in range(-cal.DIAS_POR_ANO, cal.DIAS_POR_ANO * 2):
            data = cal.de_dia_absoluto(total)
            self.assertEqual(cal.para_dia_absoluto(data["ano"], data["mes"], data["dia"]), total)
            self.assertLessEqual(data["dia"], cal.dias_do_mes(data["mes"]))

    def test_dia_29_so_existe_nos_meses_com_evento_de_dia_extra(self):
        estado = novo()
        for mes in (0, 2, 3, 4, 5, 6):
            with self.assertRaises(ErroCalendario):
                cal.definir_hoje(estado, {"ano": 1, "mes": mes, "dia": 29})
        cal.definir_hoje(estado, {"ano": 1, "mes": 8, "dia": 29})
        dias = cal.visao(estado, gestor=False, mes=8)["mes"]["dias"]
        self.assertEqual(len(dias), 29)
        self.assertTrue(dias[28]["extra"])
        self.assertTrue(dias[28]["lua_carmesim"])
        self.assertEqual([e["nome"] for e in dias[28]["do_ano"]], ["Dia da Lua Carmesim"])
        self.assertFalse(dias[27]["extra"])
        self.assertEqual(len(cal.visao(estado, gestor=False, mes=0)["mes"]["dias"]), 28)
        self.assertFalse(any(d["lua_carmesim"] for d in cal.visao(estado, gestor=False, mes=7)["mes"]["dias"]))


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
        proprios = [p for p in proximos if not p.get("fixo")]
        self.assertEqual(proprios[0]["em_dias"], 10)
        self.assertTrue(proprios[0]["rasurado"])

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
    def test_renomear_meses_exige_um_por_arvore(self):
        estado = novo()
        with self.assertRaises(ErroCalendario):
            cal.definir_config(estado, {"meses": ["a", "b"]})
        cal.definir_config(estado, {"meses": [f"Mes {i}" for i in range(10)]})
        self.assertEqual(cal.visao(estado, gestor=False)["mes"]["nome"], "Mes 0")

    def test_estado_vazio_do_banco_vira_calendario_padrao(self):
        visao = cal.visao(cal.completar({}), gestor=False)
        self.assertEqual(visao["estacao"]["chave"], "primavera")
        self.assertEqual(len(visao["mes"]["dias"]), 28)
        self.assertNotIn("sincronizar_discord", visao["config"])

    def test_nomes_padrao_antigos_viram_o_padrao_novo_mas_nome_personalizado_fica(self):
        for antigo in cal._PADROES_ANTIGOS:
            estado = cal.completar({**cal.estado_inicial(), "config": {"meses": list(antigo), "sincronizar_discord": True}})
            self.assertEqual(estado["config"]["meses"], list(cal.MESES_PADRAO))
        proprio = ["Um", "Dois", "Tres", "Quatro", "Cinco", "Seis", "Sete", "Oito", "Nove", "Dez"]
        estado = cal.completar({**cal.estado_inicial(), "config": {"meses": proprio, "sincronizar_discord": True}})
        self.assertEqual(estado["config"]["meses"], proprio)

    def test_calendario_salvo_no_formato_antigo_e_encaixado_no_ano_novo(self):
        antigo = {
            "config": {"meses": [f"Antigo {i}" for i in range(12)], "sincronizar_discord": True},
            "hoje": {"ano": 2, "mes": 11, "dia": 30},
            "estacao_especial": None,
            "eventos": [{"id": "a", "titulo": "Festa", "nota": "", "mes": 10, "dia": 30, "ano": None, "anual": True, "revelacao": "aberto"}],
        }
        estado = cal.completar(antigo)
        self.assertEqual(estado["config"]["meses"], list(cal.MESES_PADRAO))
        self.assertEqual(estado["hoje"], {"ano": 2, "mes": 9, "dia": 29})
        self.assertEqual((estado["eventos"][0]["mes"], estado["eventos"][0]["dia"]), (9, 29))
        self.assertEqual(cal.completar(estado), estado)


class FerramentasDoMestreTests(unittest.TestCase):
    def test_desfazer_volta_a_data_e_a_estacao_especial(self):
        estado = novo()
        cal.definir_hoje(estado, {"ano": 2, "mes": 3, "dia": 5})
        cal.definir_estacao_especial(estado, "eclipse")
        cal.avancar(estado, 10)
        self.assertEqual(estado["hoje"], {"ano": 2, "mes": 3, "dia": 15})
        cal.desfazer(estado)
        self.assertEqual(estado["hoje"], {"ano": 2, "mes": 3, "dia": 5})
        self.assertEqual(estado["estacao_especial"], "eclipse")
        cal.desfazer(estado)
        self.assertIsNone(estado["estacao_especial"])
        cal.desfazer(estado)
        self.assertEqual(estado["hoje"], {"ano": 1, "mes": 0, "dia": 1})
        with self.assertRaises(ErroCalendario):
            cal.desfazer(estado)

    def test_historico_guarda_so_as_ultimas_dez_mudancas(self):
        estado = novo()
        for _ in range(15):
            cal.avancar(estado, 1)
        self.assertEqual(len(estado["historico"]), cal.MAX_HISTORICO)
        self.assertEqual(estado["hoje"]["dia"], 16)

    def test_voltar_dias_e_registrado_como_voltou(self):
        estado = novo()
        cal.avancar(estado, -3)
        self.assertEqual(estado["historico"][-1]["texto"], "Voltou 3 dias")
        self.assertEqual(estado["hoje"], {"ano": 0, "mes": 9, "dia": 27})

    def test_revelar_passados_abre_so_o_que_ja_passou_e_e_unico(self):
        estado = novo()
        cal.definir_hoje(estado, {"ano": 5, "mes": 2, "dia": 10})
        passado = cal.adicionar_evento(estado, {"titulo": "Passou", "nota": "n", "mes": 1, "dia": 3, "ano": 5, "revelacao": "oculto"})
        futuro = cal.adicionar_evento(estado, {"titulo": "Vem ai", "mes": 4, "dia": 3, "ano": 5, "revelacao": "rasurado"})
        anual = cal.adicionar_evento(estado, {"titulo": "Festa", "mes": 0, "dia": 1, "anual": True, "revelacao": "oculto"})
        self.assertEqual(cal.revelar_passados(estado), 1)
        situacao = {e["id"]: e["revelacao"] for e in estado["eventos"]}
        self.assertEqual(situacao, {passado["id"]: "aberto", futuro["id"]: "rasurado", anual["id"]: "oculto"})
        with self.assertRaises(ErroCalendario):
            cal.revelar_passados(estado)

    def test_lista_completa_so_para_o_mestre_e_marca_o_que_passou(self):
        estado = novo()
        cal.definir_hoje(estado, {"ano": 5, "mes": 2, "dia": 10})
        cal.adicionar_evento(estado, {"titulo": "Segredo", "mes": 1, "dia": 3, "ano": 5, "revelacao": "oculto"})
        cal.adicionar_evento(estado, {"titulo": "Festa", "mes": 0, "dia": 1, "anual": True, "revelacao": "aberto"})
        mestre = cal.visao(estado, gestor=True)
        self.assertEqual([e["titulo"] for e in mestre["todos_eventos"]], ["Segredo", "Festa"])
        self.assertTrue(mestre["todos_eventos"][0]["passou"])
        self.assertFalse(mestre["todos_eventos"][1]["passou"])
        self.assertEqual(mestre["historico"][0]["texto"], "Definiu a data: dia 10 · Keryx, ano 5")
        jogador = cal.visao(estado, gestor=False)
        self.assertNotIn("todos_eventos", jogador)
        self.assertNotIn("historico", jogador)
        self.assertNotIn("Segredo", str(jogador))

    def test_config_publica_manda_estacoes_e_dias_especiais_para_os_atalhos(self):
        config = cal.visao(novo(), gestor=False)["config"]
        self.assertEqual(config["estacao_por_mes"], ["primavera"] * 3 + ["verao"] * 2 + ["outono"] * 3 + ["inverno"] * 2)
        self.assertEqual(
            [(e["mes"], e["nome"]) for e in config["dias_especiais"]],
            [(1, "Dia dos Pactos"), (7, "Dia Fora do Tempo"), (8, "Dia da Lua Carmesim"), (9, "Dia em Branco")],
        )

    def test_editar_o_mes_de_um_evento_reajusta_o_limite_do_dia(self):
        estado = novo()
        evento = cal.adicionar_evento(estado, {"titulo": "x", "mes": 8, "dia": 29, "ano": 1})
        with self.assertRaises(ErroCalendario):
            cal.editar_evento(estado, evento["id"], {"mes": 0})
        cal.editar_evento(estado, evento["id"], {"mes": 0, "dia": 10})
        self.assertEqual((estado["eventos"][0]["mes"], estado["eventos"][0]["dia"]), (0, 10))


class EventosDoAnoTests(unittest.TestCase):
    def test_cada_mes_tem_de_um_a_dois_eventos_do_ano(self):
        for mes in range(cal.MESES_POR_ANO):
            quantos = sum(1 for e in cal.EVENTOS_DO_ANO if e["mes"] == mes)
            self.assertIn(quantos, (1, 2), f"mes {mes} tem {quantos}")
        ids = [e["id"] for e in cal.EVENTOS_DO_ANO]
        self.assertEqual(len(ids), len(set(ids)))
        self.assertEqual({e["tipo"] for e in cal.EVENTOS_DO_ANO}, {"fixo", "extra", "aleatorio"})

    def test_texto_dos_eventos_sem_travessao(self):
        for evento in cal.EVENTOS_DO_ANO:
            self.assertNotIn(" - ", evento["descricao"])
            self.assertNotIn("\u2014", evento["descricao"])

    def test_descricao_vale_para_todas_as_arvores_e_nao_cita_lugar_de_uma_so(self):
        lugares = ("Viveiro", "Malha", "Alicerce", "Interstício", "Sucessão", "Arkarin", "Espiral", "Anámnesis", "Salém", "Dimensão Padrão")
        for evento in cal.EVENTOS_DO_ANO:
            for lugar in lugares:
                self.assertNotIn(lugar, evento["descricao"], f"{evento['id']} cita {lugar}")

    def test_dia_sorteado_e_estavel_no_ano_e_muda_de_um_ano_para_outro(self):
        chuva = next(e for e in cal.EVENTOS_DO_ANO if e["id"] == "chuva-roxa")
        dias = [cal.dia_do_evento_do_ano(chuva, ano) for ano in range(1, 200)]
        self.assertEqual(dias, [cal.dia_do_evento_do_ano(chuva, ano) for ano in range(1, 200)])
        self.assertTrue(all(1 <= d <= 28 for d in dias))
        self.assertGreater(len(set(dias)), 15, "o sorteio precisa espalhar pelos 28 dias")
        outro = next(e for e in cal.EVENTOS_DO_ANO if e["id"] == "eclipse")
        self.assertNotEqual(dias, [cal.dia_do_evento_do_ano(outro, ano) for ano in range(1, 200)])

    def _dia_da_chuva(self, ano):
        chuva = next(e for e in cal.EVENTOS_DO_ANO if e["id"] == "chuva-roxa")
        return cal.dia_do_evento_do_ano(chuva, ano)

    def test_jogador_so_ve_o_evento_sorteado_quando_o_dia_chega_e_o_mestre_ve_antes(self):
        estado = novo()
        dia = self._dia_da_chuva(1)
        cal.definir_hoje(estado, {"ano": 1, "mes": 0, "dia": 1})

        def nomes(gestor, dia_visto):
            visao = cal.visao(estado, gestor=gestor, ano=1, mes=0)
            return [e["nome"] for e in visao["mes"]["dias"][dia_visto - 1]["do_ano"]]

        self.assertNotIn("Chuva Roxa", nomes(False, dia) if dia > 1 else [])
        self.assertIn("Chuva Roxa", nomes(True, dia))
        self.assertNotIn("Chuva Roxa", str(cal.visao(estado, gestor=False, ano=1, mes=0)) if dia > 1 else "")
        cal.definir_hoje(estado, {"ano": 1, "mes": 0, "dia": dia})
        self.assertIn("Chuva Roxa", nomes(False, dia))
        self.assertTrue(cal.visao(estado, gestor=False, ano=1, mes=0)["mes"]["dias"][dia - 1]["do_ano"][0]["sorteado"])
        # Anos que ja passaram tambem aparecem para o jogador.
        cal.definir_hoje(estado, {"ano": 3, "mes": 0, "dia": 1})
        self.assertIn("Chuva Roxa", nomes(False, dia))

    def test_evento_fixo_e_extra_aparecem_para_todos_e_entram_nos_proximos(self):
        estado = novo()
        cal.definir_hoje(estado, {"ano": 1, "mes": 0, "dia": 10})
        visao = cal.visao(estado, gestor=False, ano=1, mes=0)
        self.assertEqual([e["nome"] for e in visao["mes"]["dias"][14]["do_ano"]], ["Baile da Primavera"])
        proximos = cal.visao(estado, gestor=False)["proximos"]
        self.assertEqual((proximos[0]["titulo"], proximos[0]["em_dias"], proximos[0]["fixo"]), ("Baile da Primavera", 5, True))
        nomes_do_jogador = {p["titulo"] for p in cal.visao(estado, gestor=False, proximos=50)["proximos"]}
        self.assertNotIn("Chuva Roxa", nomes_do_jogador)
        self.assertIn("Chuva Roxa", {p["titulo"] for p in cal.visao(estado, gestor=True, proximos=50)["proximos"]})

    def test_mestre_desliga_um_evento_e_o_dia_extra_continua_existindo(self):
        estado = novo()
        cal.definir_config(estado, {"eventos_desligados": ["lua-carmesim", "baile-da-primavera", "baile-da-primavera"]})
        self.assertEqual(estado["config"]["eventos_desligados"], ["baile-da-primavera", "lua-carmesim"])
        dias = cal.visao(estado, gestor=True, ano=1, mes=8)["mes"]["dias"]
        self.assertEqual(len(dias), 29, "desligar nao muda o tamanho do mes")
        self.assertFalse(dias[28]["lua_carmesim"])
        self.assertEqual(dias[28]["do_ano"], [])
        self.assertEqual(cal.visao(estado, gestor=True, ano=1, mes=0)["mes"]["dias"][14]["do_ano"], [])
        lista = cal.visao(estado, gestor=True)["eventos_do_ano"]
        self.assertFalse(next(e for e in lista if e["id"] == "lua-carmesim")["ativo"])
        self.assertTrue(next(e for e in lista if e["id"] == "eclipse")["ativo"])
        with self.assertRaises(ErroCalendario):
            cal.definir_config(estado, {"eventos_desligados": ["nao-existe"]})
        self.assertNotIn("eventos_do_ano", cal.visao(estado, gestor=False))

    def test_lista_do_mestre_mostra_o_dia_sorteado_do_ano_de_hoje(self):
        estado = novo()
        cal.definir_hoje(estado, {"ano": 7, "mes": 0, "dia": 1})
        chuva = next(e for e in cal.visao(estado, gestor=True)["eventos_do_ano"] if e["id"] == "chuva-roxa")
        self.assertEqual(chuva["dia"], self._dia_da_chuva(7))


class DuracaoRepeticaoEDiasExtrasTests(unittest.TestCase):
    def _dias(self, estado, mes, ano=1, gestor=True):
        return cal.visao(estado, gestor=gestor, ano=ano, mes=mes)["mes"]["dias"]

    def test_bailes_duram_a_semana_de_7_dias_a_partir_do_dia_15(self):
        estado = novo()
        dias = self._dias(estado, 0)
        com_baile = [d["dia"] for d in dias if any(i["id"] == "baile-da-primavera" for i in d["do_ano"])]
        self.assertEqual(com_baile, list(range(15, 22)))
        partes = [i["parte"] for d in dias for i in d["do_ano"] if i["id"] == "baile-da-primavera"]
        self.assertEqual(partes, list(range(1, 8)))
        self.assertTrue(all(i["duracao"] == 7 for d in dias for i in d["do_ano"] if i["id"] == "baile-da-primavera"))
        proximo = next(p for p in cal.visao(estado, gestor=False, proximos=20)["proximos"] if p["titulo"] == "Baile da Primavera")
        self.assertEqual((proximo["dia"], proximo["duracao"]), (15, 7))

    def test_evento_de_varios_dias_atravessa_a_virada_do_mes(self):
        estado = novo()
        cal.adicionar_evento(estado, {"titulo": "Festival", "mes": 0, "dia": 27, "ano": 1, "duracao": 5, "revelacao": "aberto"})
        fim = self._dias(estado, 0)
        inicio_do_seguinte = self._dias(estado, 1)
        self.assertEqual([(d["dia"], d["eventos"][0]["parte"]) for d in fim if d["eventos"]], [(27, 1), (28, 2)])
        self.assertEqual([(d["dia"], d["eventos"][0]["parte"]) for d in inicio_do_seguinte if d["eventos"]], [(1, 3), (2, 4), (3, 5)])
        self.assertEqual([d for d in cal.visao(estado, gestor=False, ano=1, mes=2)["mes"]["dias"] if d["eventos"]], [])

    def test_evento_anual_de_varios_dias_atravessa_a_virada_do_ano(self):
        estado = novo()
        cal.adicionar_evento(estado, {"titulo": "Vigilia", "mes": 9, "dia": 28, "repeticao": "anual", "duracao": 3, "revelacao": "aberto"})
        ultimo_mes = [d["dia"] for d in self._dias(estado, 9, ano=4) if d["eventos"]]
        self.assertEqual(ultimo_mes, [28, 29])
        primeiro = self._dias(estado, 0, ano=5)
        self.assertEqual([(d["dia"], d["eventos"][0]["parte"]) for d in primeiro if d["eventos"]], [(1, 3)])

    def test_evento_todo_mes_aparece_em_todos_os_meses_e_nao_aceita_dia_29(self):
        estado = novo()
        cal.definir_hoje(estado, {"ano": 2, "mes": 3, "dia": 12})
        evento = cal.adicionar_evento(estado, {"titulo": "Feira", "mes": 5, "dia": 10, "repeticao": "mensal", "revelacao": "aberto"})
        self.assertEqual((evento["repeticao"], evento["anual"], evento["ano"], evento["mes"]), ("mensal", False, None, 0))
        for mes in range(cal.MESES_POR_ANO):
            marcados = [d["dia"] for d in self._dias(estado, mes, ano=7) if d["eventos"]]
            self.assertEqual(marcados, [10], f"mes {mes}")
        proximos = cal.visao(estado, gestor=False, proximos=30)["proximos"]
        feira = next(p for p in proximos if p["titulo"] == "Feira")
        self.assertEqual((feira["ano"], feira["mes"], feira["dia"]), (2, 4, 10))
        with self.assertRaises(ErroCalendario):
            cal.adicionar_evento(estado, {"titulo": "x", "mes": 0, "dia": 29, "repeticao": "mensal"})

    def test_evento_todo_mes_de_varios_dias_passa_de_um_mes_para_o_outro(self):
        estado = novo()
        cal.adicionar_evento(estado, {"titulo": "Ronda", "mes": 0, "dia": 27, "repeticao": "mensal", "duracao": 4, "revelacao": "aberto"})
        self.assertEqual([d["dia"] for d in self._dias(estado, 4) if d["eventos"]], [1, 2, 27, 28])

    def test_evento_antigo_sem_repeticao_nem_duracao_continua_valendo(self):
        estado = cal.completar({**cal.estado_inicial(), "eventos": [
            {"id": "velho", "titulo": "Antigo", "nota": "", "mes": 2, "dia": 4, "ano": None, "anual": True, "revelacao": "aberto"},
            {"id": "velho2", "titulo": "Unico", "nota": "", "mes": 1, "dia": 3, "ano": 1, "anual": False, "revelacao": "aberto"},
        ]})
        self.assertEqual([d["dia"] for d in self._dias(estado, 2, ano=9) if d["eventos"]], [4])
        self.assertEqual([d["dia"] for d in self._dias(estado, 1) if d["eventos"]], [3])
        editado = cal.editar_evento(estado, "velho", {"duracao": 2})
        self.assertEqual((editado["repeticao"], editado["duracao"]), ("anual", 2))

    def test_validacao_de_duracao_e_repeticao(self):
        estado = novo()
        for extra in ({"duracao": 0}, {"duracao": 29}, {"repeticao": "semanal"}):
            with self.assertRaises(ErroCalendario):
                cal.adicionar_evento(estado, {"titulo": "x", "mes": 0, "dia": 1, "ano": 1, **extra})

    def test_passou_e_revelar_passados_contam_o_fim_do_acontecimento(self):
        estado = novo()
        cal.definir_hoje(estado, {"ano": 1, "mes": 0, "dia": 12})
        andando = cal.adicionar_evento(estado, {"titulo": "Em curso", "mes": 0, "dia": 10, "ano": 1, "duracao": 3, "revelacao": "oculto"})
        acabou = cal.adicionar_evento(estado, {"titulo": "Acabou", "mes": 0, "dia": 9, "ano": 1, "duracao": 3, "revelacao": "oculto"})
        situacao = {e["titulo"]: e["passou"] for e in cal.visao(estado, gestor=True)["todos_eventos"]}
        self.assertEqual(situacao, {"Em curso": False, "Acabou": True})
        self.assertEqual(cal.revelar_passados(estado), 1)
        self.assertEqual({e["id"]: e["revelacao"] for e in estado["eventos"]}, {andando["id"]: "oculto", acabou["id"]: "aberto"})

    def test_mestre_cria_dia_extra_em_mes_de_28_dias_e_o_calendario_da_campanha_muda(self):
        estado = novo()
        cal.definir_hoje(estado, {"ano": 1, "mes": 0, "dia": 28})
        with self.assertRaises(ErroCalendario):
            cal.definir_hoje(estado, {"ano": 1, "mes": 0, "dia": 29})
        cal.criar_dia_extra(estado, {"mes": 0, "nome": "Dia do Recomeco", "descricao": "Tudo comeca de novo."})
        self.assertEqual(cal.visao(estado, gestor=False)["config"]["dias_por_mes"][0], 29)
        cal.avancar(estado, 1)
        self.assertEqual(estado["hoje"], {"ano": 1, "mes": 0, "dia": 29})
        cal.avancar(estado, 1)
        self.assertEqual(estado["hoje"], {"ano": 1, "mes": 1, "dia": 1})
        dias = self._dias(estado, 0)
        self.assertEqual(len(dias), 29)
        self.assertEqual([i["nome"] for i in dias[28]["do_ano"]], ["Dia do Recomeco"])
        self.assertTrue(dias[28]["extra"])
        self.assertFalse(dias[28]["lua_carmesim"])
        visao_do_mestre = cal.visao(estado, gestor=True)
        self.assertTrue(next(e for e in visao_do_mestre["eventos_do_ano"] if e["id"] == "extra-0")["criado"])
        self.assertNotIn(0, visao_do_mestre["config"]["meses_para_dia_extra"])
        self.assertEqual(cal.para_dia_absoluto(2, 0, 1, cal._dias_do_estado(estado)), sum(cal._dias_do_estado(estado)))

    def test_dia_extra_so_em_mes_que_ainda_tem_28_dias_e_uma_vez(self):
        estado = novo()
        for mes in (1, 7, 8, 9):
            with self.assertRaises(ErroCalendario, msg=f"mes {mes} ja tem"):
                cal.criar_dia_extra(estado, {"mes": mes, "nome": "x"})
        cal.criar_dia_extra(estado, {"mes": 2, "nome": "Um"})
        with self.assertRaises(ErroCalendario):
            cal.criar_dia_extra(estado, {"mes": 2, "nome": "Dois"})
        with self.assertRaises(ErroCalendario):
            cal.criar_dia_extra(estado, {"mes": 3, "nome": " "})
        self.assertEqual(cal.MESES_SEM_DIA_EXTRA, (0, 2, 3, 4, 5, 6))

    def test_apagar_dia_extra_reencaixa_acontecimentos_e_recusa_se_hoje_e_o_dia(self):
        estado = novo()
        cal.criar_dia_extra(estado, {"mes": 4, "nome": "Meio Dia"})
        evento = cal.adicionar_evento(estado, {"titulo": "No extra", "mes": 4, "dia": 29, "ano": 1})
        cal.definir_hoje(estado, {"ano": 1, "mes": 4, "dia": 29})
        with self.assertRaises(ErroCalendario):
            cal.apagar_dia_extra(estado, 4)
        cal.definir_hoje(estado, {"ano": 1, "mes": 4, "dia": 5})
        cal.definir_config(estado, {"eventos_desligados": ["extra-4"]})
        cal.apagar_dia_extra(estado, 4)
        self.assertEqual(cal._dias_do_estado(estado)[4], 28)
        self.assertEqual(next(e for e in estado["eventos"] if e["id"] == evento["id"])["dia"], 28)
        self.assertEqual(estado["config"]["eventos_desligados"], [])
        with self.assertRaises(ErroCalendario):
            cal.apagar_dia_extra(estado, 4)
        cal.desfazer(estado)
        self.assertLessEqual(estado["hoje"]["dia"], 28)

    def test_dia_extra_criado_pode_ser_desligado_como_os_do_calendario(self):
        estado = novo()
        cal.criar_dia_extra(estado, {"mes": 6, "nome": "Marca"})
        cal.definir_config(estado, {"eventos_desligados": ["extra-6"]})
        dias = self._dias(estado, 6)
        self.assertEqual(len(dias), 29)
        self.assertEqual(dias[28]["do_ano"], [])


if __name__ == "__main__":
    unittest.main()
