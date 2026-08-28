from core import cassino


class _DadoFixo:
    def __init__(self, valor):
        self.valor = valor

    def randint(self, inicio, fim):
        assert (inicio, fim) == (1, 6)
        return self.valor


class _BaralhoFixo:
    def __init__(self, topo):
        self.topo = list(topo)

    def shuffle(self, baralho):
        # pop() compra do fim; a lista recebida aqui esta na ordem de compra.
        baralho[:] = list(reversed(self.topo)) + baralho[len(self.topo):]


class _EscolhaFixa:
    def __init__(self, valor):
        self.valor = valor

    def choice(self, valores):
        assert self.valor in valores
        return self.valor


class _InteiroFixo:
    def __init__(self, valor):
        self.valor = valor

    def randint(self, inicio, fim):
        assert inicio <= self.valor <= fim
        return self.valor


class _BitsFixos:
    def __init__(self, bits):
        self.bits = iter(bits)

    def randint(self, inicio, fim):
        assert (inicio, fim) == (0, 1)
        return next(self.bits)


def _estado(jogador, banqueiro, baralho=()):
    return {
        "baralho": list(reversed(baralho)),
        "jogador": list(jogador),
        "banqueiro": list(banqueiro),
        "status": "ativa",
        "resultado": None,
        "multiplicador_bp": None,
        "dobrada": False,
    }


def test_dados_mostra_probabilidade_no_pagamento_sem_float():
    baixo = cassino.jogar_dados("baixo", 10, rng=_DadoFixo(3))
    alto = cassino.jogar_dados("alto", 10, rng=_DadoFixo(3))
    exato = cassino.jogar_dados("exato", 10, numero=3, rng=_DadoFixo(3))
    assert baixo["pagamento"] == 20
    assert alto["pagamento"] == 0
    assert exato["pagamento"] == 60


def test_jogos_novos_tem_resultados_e_pagamentos_auditaveis():
    roda = cassino.jogar_roda_fluxos("vazio", 10, rng=_EscolhaFixa("vazio"))
    antes = cassino.jogar_sucessao("antes", 10, rng=_InteiroFixo(3))
    passo = cassino.jogar_sucessao("antes", 10, rng=_InteiroFixo(7))
    borda = cassino.jogar_vaos(10, rng=_BitsFixos([0, 0, 0, 0]))
    centro = cassino.jogar_vaos(10, rng=_BitsFixos([0, 0, 1, 1]))

    assert roda["pagamento"] == 100
    assert antes["pagamento"] == 20
    assert passo["pagamento"] == 10
    assert borda["indice"] == 0 and borda["pagamento"] == 40
    assert centro["indice"] == 2 and centro["pagamento"] == 0


def test_valor_esperado_dos_jogos_puros_e_exatamente_cem_porcento():
    # Soma dos pagamentos de uma aposta unitaria em todos os resultados
    # equiprovaveis, dividida pela quantidade de resultados.
    dados_baixo = sum(
        cassino.jogar_dados("baixo", 1, rng=_DadoFixo(face))["pagamento"]
        for face in range(1, 7)
    )
    sucessao = sum(
        cassino.jogar_sucessao("antes", 1, rng=_InteiroFixo(marco))["pagamento"]
        for marco in range(1, 14)
    )
    vaos = 0
    for numero in range(16):
        bits = [(numero >> deslocamento) & 1 for deslocamento in range(4)]
        vaos += cassino.jogar_vaos(1, rng=_BitsFixos(bits))["pagamento"]

    assert dados_baixo == 6
    assert sucessao == 13
    assert vaos == 16
    assert len(cassino.FORCAS_DA_RODA) == 10
    assert cassino.jogar_roda_fluxos("genese", 1, rng=_EscolhaFixa("genese"))["pagamento"] == 10


def test_corrida_tem_quatro_resultados_iguais_e_sem_corte_da_casa():
    assert {info["peso"] for info in cassino.CORREDORES_ASTRAIS.values()} == {25}
    assert sum(info["peso"] for info in cassino.CORREDORES_ASTRAIS.values()) == 100
    assert cassino.CORRIDA_CORTE_BP == 0


def test_producao_cria_gerador_criptografico_quando_rng_nao_e_injetado(monkeypatch):
    criado = []

    class _Seguro:
        def randint(self, inicio, fim):
            assert (inicio, fim) == (1, 6)
            return 1

    def fabrica():
        criado.append(True)
        return _Seguro()

    monkeypatch.setattr(cassino.secrets, "SystemRandom", fabrica)
    resultado = cassino.jogar_dados("baixo", 1)
    assert resultado["dado"] == 1
    assert criado == [True]


def test_dados_rejeita_numero_e_aposta_invalidos():
    for numero in (0, 7, None):
        try:
            cassino.jogar_dados("exato", 10, numero=numero)
        except ValueError:
            pass
        else:
            raise AssertionError("numero invalido foi aceito")
    try:
        cassino.jogar_dados("baixo", 0)
    except ValueError:
        pass
    else:
        raise AssertionError("aposta zero foi aceita")


def test_valor_da_mao_trata_ases_sem_estourar():
    assert cassino.valor_mao(["A", "K"]) == 21
    assert cassino.valor_mao(["A", "A", "9"]) == 21
    assert cassino.valor_mao(["A", "A", "K", "9"]) == 21


def test_vinte_um_comprar_pode_estourar():
    final = cassino.agir_vinte_um(_estado(["10", "8"], ["9", "7"], ["K"]), "comprar")
    assert final["status"] == "finalizada"
    assert final["resultado"] == "derrota"
    assert cassino.pagamento_vinte_um(final, 20) == 0


def test_vinte_um_parar_faz_banqueiro_comprar_ate_dezessete():
    final = cassino.agir_vinte_um(_estado(["10", "9"], ["10", "6"], ["2"]), "parar")
    assert final["banqueiro"] == ["10", "6", "2"]
    assert final["resultado"] == "vitoria"
    assert cassino.pagamento_vinte_um(final, 20) == 40


def test_vinte_um_empate_devolve_aposta():
    final = cassino.agir_vinte_um(_estado(["10", "8"], ["9", "9"]), "parar")
    assert final["resultado"] == "empate"
    assert cassino.pagamento_vinte_um(final, 20) == 20


def test_dobrar_compra_uma_carta_e_para_obrigatoriamente():
    final = cassino.agir_vinte_um(_estado(["5", "6"], ["10", "6"], ["10", "5"]), "dobrar")
    assert final["dobrada"] is True
    assert final["jogador"] == ["5", "6", "10"]
    assert final["status"] == "finalizada"


def test_so_pode_dobrar_com_duas_cartas():
    try:
        cassino.agir_vinte_um(_estado(["2", "3", "4"], ["10", "6"], ["5"]), "dobrar")
    except ValueError:
        pass
    else:
        raise AssertionError("dobrar depois da compra foi aceito")


def test_contrato_mapeia_comando_simples_e_subcomando():
    assert cassino.nome_comando_interacao({"name": "investir"}) == "investir"
    assert cassino.nome_comando_interacao(
        {"name": "cassino", "options": [{"type": 1, "name": "dados"}]}
    ) == "cassino dados"
    assert cassino.objetivo_para_comando("investir") == "financas"
    assert cassino.objetivo_para_comando("cassino dados") == "cassino"
    assert cassino.objetivo_para_comando("carteira") is None


def test_torneio_aceita_so_item_simples_comum_ou_incomum():
    def item(tipo="equipamento", raridade="comum", **conteudo):
        return type("Item", (), {"tipo": tipo, "raridade": raridade, "conteudo": conteudo})()

    assert cassino.item_elegivel_torneio(item())[0] is True
    assert cassino.item_elegivel_torneio(item(raridade="incomum"))[0] is True
    assert cassino.item_elegivel_torneio(item(raridade="raro"))[0] is False
    assert cassino.item_elegivel_torneio(item(tipo="veiculo"))[0] is False
    assert cassino.item_elegivel_torneio(item(requer_autorizacao_mestre=True))[0] is False
    assert cassino.item_elegivel_torneio(None)[0] is False
