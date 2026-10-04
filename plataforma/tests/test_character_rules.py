from __future__ import annotations

from copy import deepcopy
from pathlib import Path

from core.character_summary import (
    RACA_PERSONALIZADA_ID,
    _CATALOGO,
    _atributo_efetivo,
    _fluxo_efetivo,
    _circulo_por_fluxo,
    bonus_escolhas_habilidade,
    bonus_unicos_jardim,
    carregar_catalogos,
    efeitos_escolhas_habilidade,
    iniciativa_fixa,
    resumir_ficha,
    validar_regras_ficha,
)


DATA_ROOT = Path(__file__).resolve().parent.parent.parent / "data"


def _ficha_criacao() -> dict:
    pericias = ("atletismo", "luta", "fortitude", "reflexos", "percepcao", "vontade")
    return {
        "arvoreId": "aethel",
        "racaId": "vampiro",
        "classeId": "guerreiro",
        "classes": [{"classeId": "guerreiro", "nivel": 1}],
        "nivel": 1,
        "xp": 0,
        "metodoAtributos": "padrao",
        "atributosBase": {
            "forca": 15,
            "destreza": 14,
            "constituicao": 13,
            "inteligencia": 12,
            "sabedoria": 10,
            "carisma": 8,
            "fluxo": 8,
        },
        "atributosFinais": {
            "forca": 15,
            "destreza": 14,
            "constituicao": 13,
            "inteligencia": 12,
            "sabedoria": 10,
            "carisma": 8,
            "fluxo": 8,
        },
        "pericias": {pericia: "aprendiz" for pericia in pericias},
        "lunarisInicial": 20,
        "inventarioInicial": [{"titulo": "Espada curta", "quantidade": 1}],
    }


class TestEscolhaRacialTardia:
    """A Cor da Alma do Espirito nasceu depois de fichas de Espirito ja existirem.
    Preencher um campo de escolha racial vazio e liberado uma unica vez; trocar
    uma escolha ja feita continua sendo do mestre."""

    @classmethod
    def setup_class(cls):
        carregar_catalogos(DATA_ROOT)

    def _ficha_espirito(self, cor: str | None = None) -> dict:
        ficha = _ficha_criacao()
        ficha["racaId"] = "espirito"
        if cor is not None:
            ficha["escolhaRacial"] = {"varianteId": cor}
        return ficha

    def test_ficha_antiga_sem_cor_pode_escolher_uma(self):
        anterior = self._ficha_espirito()
        atual = self._ficha_espirito("vermelho-vinho")
        assert validar_regras_ficha(atual, {}, ficha_anterior=anterior) is None

    def test_cor_invalida_continua_barrada(self):
        anterior = self._ficha_espirito()
        atual = self._ficha_espirito("roxo-que-nao-existe")
        assert "escolhas raciais" in validar_regras_ficha(atual, {}, ficha_anterior=anterior)

    def test_trocar_de_cor_continua_sendo_do_mestre(self):
        anterior = self._ficha_espirito("vermelho-vinho")
        atual = self._ficha_espirito("dourado")
        assert "escolhas raciais" in validar_regras_ficha(atual, {}, ficha_anterior=anterior)

    def test_apagar_a_cor_escolhida_continua_barrado(self):
        anterior = self._ficha_espirito("vermelho-vinho")
        atual = self._ficha_espirito("")
        assert "escolhas raciais" in validar_regras_ficha(atual, {}, ficha_anterior=anterior)


class TestCharacterRules:
    @classmethod
    def setup_class(cls):
        carregar_catalogos(DATA_ROOT)

    def test_accepts_official_creation(self):
        assert validar_regras_ficha(_ficha_criacao(), {}, criacao=True) is None

    def test_rejects_attributes_and_initial_skills_outside_budget(self):
        ficha = _ficha_criacao()
        ficha["atributosBase"]["fluxo"] = 9
        assert "conjunto padrao" in validar_regras_ficha(ficha, {}, criacao=True)

        ficha = _ficha_criacao()
        ficha["pericias"]["cura"] = "aprendiz"
        assert "exatamente 6" in validar_regras_ficha(ficha, {}, criacao=True)

    def test_rejects_early_second_common_class(self):
        anterior = _ficha_criacao()
        atual = deepcopy(anterior)
        atual["classes"] = [
            {"classeId": "guerreiro", "nivel": 2},
            {"classeId": "ninja", "nivel": 1},
        ]
        atual["nivel"] = 3
        erro = validar_regras_ficha(atual, {}, ficha_anterior=anterior)
        assert "segunda classe comum" in erro

    def _ficha_com_classes(self, classes):
        anterior = _ficha_criacao()
        atual = deepcopy(anterior)
        atual["classes"] = [{"classeId": classe, "nivel": nivel} for classe, nivel in classes]
        atual["nivel"] = sum(nivel for _, nivel in classes)
        return anterior, atual

    def test_class_level_above_20_is_not_an_error(self):
        # O 20 é onde a classe termina de entregar recompensas escritas, não um
        # teto: acima dele ela só soma recursos, e a ficha não gera alerta.
        anterior, atual = self._ficha_com_classes([("guerreiro", 35)])
        assert validar_regras_ficha(atual, {}, ficha_anterior=anterior) is None

    def test_class_level_stops_at_the_50_cap(self):
        # O 50 é o teto de uma classe: quem quer continuar abre outra, o nível
        # total é que não tem teto.
        anterior, atual = self._ficha_com_classes([("guerreiro", 50)])
        assert validar_regras_ficha(atual, {}, ficha_anterior=anterior) is None
        anterior, atual = self._ficha_com_classes([("guerreiro", 51)])
        assert "ate o nivel 50" in validar_regras_ficha(atual, {}, ficha_anterior=anterior)
        anterior, atual = self._ficha_com_classes([("guerreiro", 999)])
        assert "ate o nivel 50" in validar_regras_ficha(atual, {}, ficha_anterior=anterior)

    def test_old_sheet_above_the_cap_still_saves_but_cannot_climb(self):
        # Ficha criada antes da regra, com a classe já no 70: salvar outra coisa
        # não pode travar o jogador, mas subir mais continua barrado.
        anterior = _ficha_criacao()
        anterior["classes"] = [{"classeId": "guerreiro", "nivel": 70}]
        anterior["nivel"] = 70
        igual = deepcopy(anterior)
        assert validar_regras_ficha(igual, {}, ficha_anterior=anterior) is None
        reduzida = deepcopy(anterior)
        reduzida["classes"][0]["nivel"] = 60
        reduzida["nivel"] = 60
        assert validar_regras_ficha(reduzida, {}, ficha_anterior=anterior) is None
        subindo = deepcopy(anterior)
        subindo["classes"][0]["nivel"] = 71
        subindo["nivel"] = 71
        assert "ate o nivel 50" in validar_regras_ficha(subindo, {}, ficha_anterior=anterior)

    def test_total_level_has_no_cap_when_classes_stay_under_50(self):
        anterior, atual = self._ficha_com_classes([("guerreiro", 50), ("ninja", 50), ("atirador", 30)])
        assert validar_regras_ficha(atual, {}, ficha_anterior=anterior) is None

    def test_class_needs_at_least_one_level(self):
        anterior, atual = self._ficha_com_classes([("guerreiro", 0)])
        assert "pelo menos 1 nivel" in validar_regras_ficha(atual, {}, ficha_anterior=anterior)

    def test_total_level_and_class_count_have_no_ceiling_above_60(self):
        # Além do 60 é outro patamar: sem teto de nível total, sem limite de
        # classes, e nenhuma regra do padrão vira alerta ao mestre.
        anterior, atual = self._ficha_com_classes([
            ("guerreiro", 25), ("ninja", 25), ("piloto", 25), ("pop-star", 25),
        ])
        assert atual["nivel"] == 100
        assert validar_regras_ficha(atual, {}, ficha_anterior=anterior) is None

    def test_standard_build_limit_still_alerts_up_to_60(self):
        anterior, atual = self._ficha_com_classes([("guerreiro", 20), ("ninja", 10), ("piloto", 5)])
        assert "duas classes comuns" in validar_regras_ficha(atual, {}, ficha_anterior=anterior)
        # Passando do 60 o mesmo trio deixa de ser conferido.
        anterior, atual = self._ficha_com_classes([("guerreiro", 30), ("ninja", 20), ("piloto", 11)])
        assert validar_regras_ficha(atual, {}, ficha_anterior=anterior) is None

    def test_second_common_class_accepts_a_class_already_past_20(self):
        anterior, atual = self._ficha_com_classes([("guerreiro", 25), ("ninja", 5)])
        assert validar_regras_ficha(atual, {}, ficha_anterior=anterior) is None
        anterior, atual = self._ficha_com_classes([("guerreiro", 19), ("ninja", 5)])
        assert "segunda classe comum" in validar_regras_ficha(atual, {}, ficha_anterior=anterior)

    def test_player_can_raise_class_level_without_matching_xp(self):
        # Decisão de design 2026-08: o jogador ganhou o controle de
        # nível/classe/XP na própria ficha (era exclusivo do mestre); o
        # router (characters.py::update_character) avisa o mestre/assistente
        # sempre que um jogador mexe nisso, então a checagem virou aviso
        # pós-fato, não mais um bloqueio aqui.
        anterior = _ficha_criacao()
        atual = deepcopy(anterior)
        atual["classes"][0]["nivel"] = 2
        atual["nivel"] = 2
        assert validar_regras_ficha(atual, {}, ficha_anterior=anterior) is None

    def test_rejects_early_or_unearned_training_degree(self):
        anterior = _ficha_criacao()
        atual = deepcopy(anterior)
        atual["pericias"]["atletismo"] = "especialista"
        erro = validar_regras_ficha(atual, {}, ficha_anterior=anterior)
        assert "nivel total" in erro

    def test_graus_novos_abrem_so_nos_patamares(self):
        # Lendario abre no nivel total 60, Absoluto no 500: antes disso a ficha
        # avisa que o nivel ainda nao permite o grau.
        # Uma classe para no 50, entao o nivel total sobe repartido entre varias.
        outras = ("guerreiro", "ninja", "atirador", "lutador", "cacador", "medico", "piloto", "espadachim", "guardiao", "comerciante", "cozinheiro")

        def repartir(total):
            restante, classes = total, []
            for classe in outras:
                parte = min(50, restante)
                if parte:
                    classes.append((classe, parte))
                restante -= parte
            assert restante == 0
            return classes

        for grau, nivel_minimo in (("lendario", 60), ("mitico", 100), ("cosmico", 150), ("eterno", 250), ("absoluto", 500)):
            anterior, atual = self._ficha_com_classes(repartir(nivel_minimo - 1))
            atual["pericias"]["atletismo"] = grau
            assert f"nivel total ainda nao permite o grau {grau}" in validar_regras_ficha(atual, {}, ficha_anterior=anterior)
            anterior, atual = self._ficha_com_classes(repartir(nivel_minimo))
            atual["pericias"]["atletismo"] = grau
            erro = validar_regras_ficha(atual, {}, ficha_anterior=anterior)
            assert erro is None or "nivel total ainda nao permite" not in erro

    def test_grau_de_pericia_desconhecido_continua_invalido(self):
        anterior = _ficha_criacao()
        atual = deepcopy(anterior)
        atual["pericias"]["atletismo"] = "supremo"
        assert "grau de pericia invalido" in validar_regras_ficha(atual, {}, ficha_anterior=anterior)

    def test_players_can_award_themselves_xp(self):
        # Decisão de design 2026-08: idem ao nível de classe - o jogador
        # agora define o próprio XP, e o mestre é avisado pelo router.
        anterior = _ficha_criacao()
        atual = deepcopy(anterior)
        atual["xp"] = 1000
        assert validar_regras_ficha(atual, {}, ficha_anterior=anterior) is None

    def test_rejects_powers_beyond_class_slots(self):
        anterior = _ficha_criacao()
        anterior["classes"][0]["nivel"] = 6
        anterior["nivel"] = 6
        anterior["xp"] = 15000
        atual = deepcopy(anterior)
        # Poderes sem pre-requisito de proposito: o que esta em teste aqui e a
        # contagem de vagas, e os poderes do Arsenal agora exigem nivel 15.
        atual["poderesClasseSelecionados"] = [
            {"classeId": "guerreiro", "poderId": "correndo"},
            {"classeId": "guerreiro", "poderId": "serio-isso"},
            {"classeId": "guerreiro", "poderId": "grito-de-batalha"},
        ]
        erro = validar_regras_ficha(atual, {}, ficha_anterior=anterior)
        assert "mais poderes" in erro

    def test_rejects_legacy_beyond_level_milestones(self):
        anterior = _ficha_criacao()
        anterior["classes"][0]["nivel"] = 5
        anterior["nivel"] = 5
        anterior["xp"] = 10000
        atual = deepcopy(anterior)
        atual["legadosSelecionados"] = ["to-ficando-bom", "ainda-nao"]
        erro = validar_regras_ficha(atual, {}, ficha_anterior=anterior)
        assert "mais Legados" in erro

    def test_legado_repetivel_aceita_ate_o_limite_e_bloqueia_depois(self):
        # Decisão de balanceamento 2026-08: "Não é Tão Pesado" descreve uma
        # 2ª e 3ª escolha no texto — o dado precisa refletir isso (repetivel
        # + limite:3), senão o validador bloqueava a 2ª escolha mesmo com o
        # texto publicado permitindo.
        # Nível 20 dá 4 vagas (20 // 5) — acima do limite:3 do próprio
        # Legado, pra isolar o erro de "limite por Legado" do erro de "vagas
        # totais" (que dispara antes, na validação, se as duas faltarem juntas).
        anterior = _ficha_criacao()
        anterior["classes"][0]["nivel"] = 20
        anterior["nivel"] = 20
        anterior["xp"] = 120000
        dentro_do_limite = deepcopy(anterior)
        dentro_do_limite["legadosSelecionados"] = ["nao-e-tao-pesado"] * 3
        assert validar_regras_ficha(dentro_do_limite, {}, ficha_anterior=anterior) is None

        alem_do_limite = deepcopy(anterior)
        alem_do_limite["legadosSelecionados"] = ["nao-e-tao-pesado"] * 4
        erro = validar_regras_ficha(alem_do_limite, {}, ficha_anterior=anterior)
        assert "mais vezes que o permitido" in erro

    def test_legado_repetivel_com_pre_requisito_respeita_o_limite_de_2(self):
        # Nível 20 dá 4 vagas — acima do limite:2 do próprio Legado, pelo
        # mesmo motivo do teste anterior.
        anterior = _ficha_criacao()
        anterior["classes"][0]["nivel"] = 20
        anterior["nivel"] = 20
        anterior["xp"] = 120000
        anterior["atributosFinais"]["destreza"] = 16
        dentro_do_limite = deepcopy(anterior)
        dentro_do_limite["legadosSelecionados"] = ["rapidinho", "rapidinho"]
        assert validar_regras_ficha(dentro_do_limite, {}, ficha_anterior=anterior) is None

        alem_do_limite = deepcopy(anterior)
        alem_do_limite["legadosSelecionados"] = ["rapidinho", "rapidinho", "rapidinho"]
        erro = validar_regras_ficha(alem_do_limite, {}, ficha_anterior=anterior)
        assert "mais vezes que o permitido" in erro

    def test_legados_sem_pre_requisito_agora_exigem_nivel_5(self):
        # Decisão de balanceamento 2026-08: Bala Ágil, Tô ficando bom e
        # Mágico? não tinham pré-requisito nenhum — ficavam disponíveis já no
        # nível 1, desproporcionais aos outros Legados do mesmo custo.
        for legado_id in ("bala-agil", "to-ficando-bom", "magico-interrogacao"):
            anterior = _ficha_criacao()
            # Humano dá 1 vaga extra (legados_adicionais) — assim a ficha tem
            # vaga disponível mesmo abaixo do nível 5, isolando o erro de
            # "pré-requisito do Legado" do erro (diferente) de "sem vaga".
            anterior["racaId"] = "humano"
            anterior["classes"][0]["nivel"] = 4
            anterior["nivel"] = 4
            anterior["xp"] = 6000
            abaixo_do_nivel = deepcopy(anterior)
            abaixo_do_nivel["legadosSelecionados"] = [legado_id]
            erro = validar_regras_ficha(abaixo_do_nivel, {}, ficha_anterior=anterior)
            assert erro is not None and "pre-requisitos" in erro, (legado_id, erro)

            anterior["classes"][0]["nivel"] = 5
            anterior["nivel"] = 5
            anterior["xp"] = 10000
            no_nivel_5 = deepcopy(anterior)
            no_nivel_5["legadosSelecionados"] = [legado_id]
            assert validar_regras_ficha(no_nivel_5, {}, ficha_anterior=anterior) is None, legado_id

    def test_codigo_de_etica_tem_um_texto_so_e_define_arma_natural(self):
        # Decisão de 2026-10-04: o dano de metade do nível (que passava de uma
        # arma-relíquia no nível 60) saiu de vez, e o texto que o jogador vê é o
        # mesmo nos dois arquivos. Arma natural declarada conta como arma.
        import json

        legados = json.loads((DATA_ROOT / "ficha" / "legados.json").read_text(encoding="utf-8"))
        regras = json.loads((DATA_ROOT / "ficha" / "legados-regras-v1.json").read_text(encoding="utf-8"))["regras"]
        original = next(l for l in legados["legados"] if l["id"] == "codigo-de-etica")["descricao"]
        assert original == regras["codigo-de-etica"]["descricao"]
        assert "metade do seu nível" not in original and "+30" not in original
        assert "não ataca quem está desarmado" in original
        assert "arma natural declarada" in original.lower()
        desonroso = regras["desonroso"]["descricao"]
        assert "arma natural declarada" in desonroso

    def test_rejects_class_power_without_required_power(self):
        anterior = _ficha_criacao()
        anterior["classeId"] = "espadachim"
        anterior["classes"] = [{"classeId": "espadachim", "nivel": 20}]
        anterior["nivel"] = 20
        anterior["xp"] = 190000
        atual = deepcopy(anterior)
        atual["poderesClasseSelecionados"] = [{"classeId": "espadachim", "poderId": "golpe-em-w"}]
        erro = validar_regras_ficha(atual, {}, ficha_anterior=anterior)
        assert "pre-requisitos" in erro

    def test_teto_por_circulo_so_vale_do_nivel_25_em_diante(self):
        primeiro_circulo = sorted(
            magia_id for magia_id, magia in _CATALOGO["magia"].items()
            if magia.get("circulo") == 1 and magia.get("fluxo") in ("origem", "universal")
        )
        assert len(primeiro_circulo) == 5
        anterior = _ficha_criacao()
        anterior["arvoreId"] = "aethel"
        anterior["classeId"] = "canalizador"
        anterior["classes"] = [{"classeId": "canalizador", "nivel": 50}]
        anterior["nivel"] = 50
        # Fluxo baixo de proposito: o Fluxo minimo do circulo e so recomendacao.
        atual = deepcopy(anterior)
        atual["magiasConhecidasIds"] = primeiro_circulo[:4]
        assert validar_regras_ficha(atual, {}, ficha_anterior=anterior) is None
        atual["magiasConhecidasIds"] = primeiro_circulo
        assert "mesmo circulo" in validar_regras_ficha(atual, {}, ficha_anterior=anterior)
        # No nivel 20 (ultimo marco antigo) nao ha teto por circulo.
        anterior["classes"] = [{"classeId": "canalizador", "nivel": 20}]
        anterior["nivel"] = 20
        atual = deepcopy(anterior)
        atual["magiasConhecidasIds"] = primeiro_circulo
        assert "mesmo circulo" not in (validar_regras_ficha(atual, {}, ficha_anterior=anterior) or "")

    def test_validates_magic_source_slots_circle_and_flux(self):
        """Catálogo de dez círculos: Canalizador nível 8 libera até o 4º círculo
        com 4 vagas; o atributo Fluxo 15 só sustenta o 1º, mas isso é recomendação."""
        anterior = _ficha_criacao()
        anterior["arvoreId"] = "ignis"
        anterior["classes"] = [
            {"classeId": "guerreiro", "nivel": 20},
            {"classeId": "canalizador", "nivel": 8},
        ]
        anterior["nivel"] = 28
        anterior["xp"] = 378000
        anterior["atributosFinais"]["fluxo"] = 15  # base 8 + 7 do orçamento de nível

        atual = deepcopy(anterior)
        atual["magiasConhecidasIds"] = [
            "propriedade-errante",
            "rajada-improvavel",
            "troca-repentina",
        ]
        assert validar_regras_ficha(atual, {}, ficha_anterior=anterior) is None

        circulo_alto = deepcopy(atual)
        circulo_alto["magiasConhecidasIds"][-1] = "vortice-menor"  # 5º círculo
        assert "fonte de magia" in validar_regras_ficha(circulo_alto, {}, ficha_anterior=anterior)

        # O Fluxo minimo do circulo e so recomendacao: Fluxo baixo nao gera alerta,
        # porque a DT do circulo e o portao real na hora de conjurar.
        sem_fluxo = deepcopy(atual)
        sem_fluxo["atributosFinais"]["fluxo"] = 13
        anterior_sem_fluxo = deepcopy(anterior)
        anterior_sem_fluxo["atributosFinais"]["fluxo"] = 13
        assert "Fluxo insuficiente" not in (validar_regras_ficha(sem_fluxo, {}, ficha_anterior=anterior_sem_fluxo) or "")

        # O servidor conta vagas; o Fluxo nativo de cada magia é checado na ficha.
        excedente = deepcopy(atual)
        excedente["magiasConhecidasIds"].extend(["impacto-elemental", "escudo-material"])
        assert "mais magias" in validar_regras_ficha(excedente, {}, ficha_anterior=anterior)

    def test_validates_prepared_and_active_flux_catalysts(self):
        anterior = _ficha_criacao()
        anterior["classeId"] = "sintonizador"
        anterior["classes"] = [{"classeId": "sintonizador", "nivel": 15}]
        anterior["nivel"] = 15

        atual = deepcopy(anterior)
        atual["catalisadoresFluxo"] = {
            "preparadosIds": ["tempo", "espaco", "vazio"],
            "ativoId": "tempo",
        }
        assert validar_regras_ficha(atual, {}, ficha_anterior=anterior) is None

        excedente = deepcopy(atual)
        excedente["catalisadoresFluxo"]["preparadosIds"].append("fim")
        assert "excedem o limite" in validar_regras_ficha(excedente, {}, ficha_anterior=anterior)

        ativo_invalido = deepcopy(atual)
        ativo_invalido["catalisadoresFluxo"]["ativoId"] = "origem"
        assert "ativo deve estar" in validar_regras_ficha(ativo_invalido, {}, ficha_anterior=anterior)

        fluxo_artificial = deepcopy(atual)
        fluxo_artificial["catalisadoresFluxo"] = {"preparadosIds": ["tecnologia"], "ativoId": "tecnologia"}
        assert "Fluxo invalido" in validar_regras_ficha(fluxo_artificial, {}, ficha_anterior=anterior)

    def test_circulo_liberado_acompanha_os_limiares_publicados(self):
        """O servidor precisa enxergar os dez círculos publicados, não os cinco
        do catálogo antigo: os limiares saem de data/ficha/magias.json."""
        assert [_circulo_por_fluxo(fluxo) for fluxo in (13, 14, 17, 18, 21, 22)] == [0, 1, 1, 2, 2, 3]
        assert [_circulo_por_fluxo(fluxo) for fluxo in (34, 38, 42, 46, 50, 99)] == [6, 7, 8, 9, 10, 10]

    def test_atributo_final_pode_passar_de_20_fora_da_criacao(self):
        """O teto de 20 só rege a criação (métodos padrao/pontos nunca
        passam de 15 de qualquer forma). Um atributo adquirido - bênção,
        mutação, algo negociado com o mestre - pode passar de 20 depois."""
        anterior = _ficha_criacao()
        anterior["classes"] = [
            {"classeId": "guerreiro", "nivel": 20},
            {"classeId": "ninja", "nivel": 8},
        ]
        anterior["nivel"] = 28
        anterior["xp"] = 378000
        atual = deepcopy(anterior)
        atual["atributosFinais"]["forca"] = 22  # base 15, aumento 7 (orcamento: 28 // 4 = 7)
        assert validar_regras_ficha(atual, {}, ficha_anterior=anterior) is None

    def _ficha_de_nivel_alto(self, classes):
        anterior, atual = self._ficha_com_classes(classes)
        anterior["classes"], anterior["nivel"] = deepcopy(atual["classes"]), atual["nivel"]
        atual = deepcopy(anterior)
        return anterior, atual

    def test_aumentos_de_atributo_seguem_as_faixas_do_nivel(self):
        # 1 a cada 4 níveis até o 50, a cada 8 até o 100, a cada 16 depois:
        # 13 aumentos no nível 60 (o ritmo antigo daria 15), 18 no 100.
        casos = [
            ([("guerreiro", 30), ("ninja", 30)], 13),
            ([("guerreiro", 25), ("ninja", 25), ("piloto", 25), ("pop-star", 25)], 18),
            ([("guerreiro", 30), ("ninja", 20)], 12),
        ]
        for classes, direito in casos:
            anterior, atual = self._ficha_de_nivel_alto(classes)
            atual["atributosFinais"]["forca"] = 15 + direito
            assert validar_regras_ficha(atual, {}, ficha_anterior=anterior) is None, classes
            atual["atributosFinais"]["forca"] = 15 + direito + 1
            assert "aumentos de atributo" in validar_regras_ficha(atual, {}, ficha_anterior=anterior), classes

    def test_aumento_de_sessao_nao_gasta_o_direito_do_nivel(self):
        # Subida por bencao/sessao nao conta; so o que o jogador gastou (aumentosAtributo).
        anterior, atual = self._ficha_de_nivel_alto([("guerreiro", 30), ("ninja", 30)])
        atual["atributosFinais"]["forca"] = 15 + 13 + 4
        assert "aumentos de atributo" in validar_regras_ficha(atual, {}, ficha_anterior=anterior)
        atual["aumentosAtributo"] = {"forca": 13}
        assert validar_regras_ficha(atual, {}, ficha_anterior=anterior) is None
        atual["aumentosAtributo"] = {"forca": 14}
        assert "aumentos de atributo" in validar_regras_ficha(atual, {}, ficha_anterior=anterior)
        atual["aumentosAtributo"] = {"forca": -1}
        assert "aumentosAtributo" in validar_regras_ficha(atual, {}, ficha_anterior=anterior)

    def test_legados_seguem_as_faixas_do_nivel(self):
        # 1 a cada 5 níveis até o 50, a cada 10 até o 100, a cada 20 depois:
        # 10 vagas no nível 55 (o ritmo antigo daria 11), 11 no 60 e 15 no 100.
        livres = [
            legado_id for legado_id, legado in _CATALOGO["legado"].items()
            if not legado.get("repetivel") and all(
                isinstance(item, dict) and set(item) <= {"nivel_personagem"}
                for item in legado.get("pre_requisitos") or []
            )
        ]
        assert len(livres) >= 16
        casos = [
            ([("guerreiro", 30), ("ninja", 25)], 10),
            ([("guerreiro", 30), ("ninja", 30)], 11),
            ([("guerreiro", 25), ("ninja", 25), ("piloto", 25), ("pop-star", 25)], 15),
        ]
        for classes, vagas in casos:
            anterior, atual = self._ficha_de_nivel_alto(classes)
            atual["legadosSelecionados"] = livres[:vagas]
            assert validar_regras_ficha(atual, {}, ficha_anterior=anterior) is None, classes
            atual["legadosSelecionados"] = livres[:vagas + 1]
            assert "mais Legados" in validar_regras_ficha(atual, {}, ficha_anterior=anterior), classes

    def test_legados_de_nivel_alto_respeitam_nivel_e_atributo(self):
        # Os Legados de 2026-10-04 cobrem do 20 ao 500. Nível e atributo são
        # conferidos na escolha, como nos 42 anteriores.
        cem = [("guerreiro", 25), ("ninja", 25), ("piloto", 25), ("pop-star", 25)]
        anterior, atual = self._ficha_de_nivel_alto(cem)
        atual["legadosSelecionados"] = ["quando-parece-impossivel"]
        assert validar_regras_ficha(atual, {}, ficha_anterior=anterior) is None

        # Pele de Pedra Viva pede Constituição 28.
        atual["legadosSelecionados"] = ["pele-de-pedra-viva"]
        atual["atributosFinais"]["constituicao"] = 15
        assert "pre-requisitos" in validar_regras_ficha(atual, {}, ficha_anterior=anterior)
        atual["atributosFinais"]["constituicao"] = 28
        assert validar_regras_ficha(atual, {}, ficha_anterior=anterior) is None

        # No nível 60 o Legado de 100 ainda não abre.
        anterior60, atual60 = self._ficha_de_nivel_alto([("guerreiro", 30), ("ninja", 30)])
        atual60["legadosSelecionados"] = ["quando-parece-impossivel"]
        assert "pre-requisitos" in validar_regras_ficha(atual60, {}, ficha_anterior=anterior60)

        # Cicatrizes de Guerra é repetível até 2 vezes.
        atual["atributosFinais"]["constituicao"] = 15
        atual["legadosSelecionados"] = ["cicatrizes-de-guerra"] * 2
        assert validar_regras_ficha(atual, {}, ficha_anterior=anterior) is None
        atual["legadosSelecionados"] = ["cicatrizes-de-guerra"] * 3
        assert "mais vezes que o permitido" in validar_regras_ficha(atual, {}, ficha_anterior=anterior)

    def test_bonus_racial_de_atributo_nao_tem_mais_teto(self):
        # Elfo (+4 Int), Auleth (+2 Sab), Clone e Anomalia (bônus escolhido) e as
        # raças com Fluxo tinham um teto de 20 (ou 24) nos bônus raciais.
        def ficha(raca, **atributos):
            base = dict.fromkeys(("forca", "destreza", "constituicao", "inteligencia", "sabedoria", "carisma", "fluxo"), 10)
            base.update(atributos)
            return {"racaId": raca, "atributosFinais": base}

        assert _atributo_efetivo(ficha("elfo", inteligencia=22), "inteligencia") == 26
        assert _atributo_efetivo(ficha("auleth", sabedoria=20), "sabedoria") == 22
        assert _atributo_efetivo(ficha("divino", carisma=20), "carisma") == 22
        clone = ficha("clone", forca=20)
        clone["escolhaRacial"] = {"atributosRaciais": ["forca", "destreza"]}
        assert _atributo_efetivo(clone, "forca") == 22
        anomalia = ficha("anomalia", forca=21)
        anomalia["escolhaRacial"] = {"atributosRaciais": ["forca"]}
        assert _atributo_efetivo(anomalia, "forca") == 25
        onirico = ficha("onirico", fluxo=21)
        assert _fluxo_efetivo(onirico, _CATALOGO["raca"]["onirico"]) == 23

    def test_nenhuma_raca_declara_teto_de_atributo(self):
        def tem_teto(valor):
            if isinstance(valor, list):
                return any(tem_teto(item) for item in valor)
            if not isinstance(valor, dict):
                return False
            return any(
                chave == "limites_atributos" or (chave == "limite" and isinstance(filho, (int, float))) or tem_teto(filho)
                for chave, filho in valor.items()
            )

        assert [raca_id for raca_id, raca in _CATALOGO["raca"].items() if tem_teto(raca)] == []

    def test_atributo_final_nao_pode_ficar_abaixo_de_1(self):
        anterior = _ficha_criacao()
        atual = deepcopy(anterior)
        atual["atributosFinais"]["forca"] = 0
        erro = validar_regras_ficha(atual, {}, ficha_anterior=anterior)
        assert "abaixo de 1" in erro

    def test_cicatriz_exige_magia_de_decimo_circulo_e_id_valido(self):
        """Marca do 5o ao 9o e derivada e nao precisa de guarda. Cicatriz fica
        na ficha e concede beneficio, entao o servidor confere."""
        anterior = _ficha_criacao()
        anterior["arvoreId"] = "ignis"
        anterior["classeId"] = "canalizador"
        anterior["classes"] = [{"classeId": "canalizador", "nivel": 20}]
        anterior["nivel"] = 20
        anterior["xp"] = 190000

        # Sem magia de 10o circulo, nenhuma cicatriz e devida.
        atual = deepcopy(anterior)
        atual["cicatrizesIds"] = ["cicatriz-peso-da-fonte"]
        assert "mais cicatrizes" in validar_regras_ficha(atual, {}, ficha_anterior=anterior)

        # Id inventado nao passa.
        atual = deepcopy(anterior)
        atual["cicatrizesIds"] = ["cicatriz-que-eu-inventei"]
        assert "cicatriz inexistente" in validar_regras_ficha(atual, {}, ficha_anterior=anterior)

        # Repetida nao passa.
        atual = deepcopy(anterior)
        atual["cicatrizesIds"] = ["cicatriz-peso-da-fonte", "cicatriz-peso-da-fonte"]
        assert "duas vezes" in validar_regras_ficha(atual, {}, ficha_anterior=anterior)

    def test_simbolo_dos_sete_e_concessao_do_mestre(self):
        """O rito exige sete pessoas e acontece na mesa, entao o jogador nao
        se marca sozinho nem inventa um simbolo."""
        anterior = _ficha_criacao()

        # Id inventado nao passa nem para o mestre.
        atual = deepcopy(anterior)
        atual["simboloId"] = "pecado-que-eu-inventei"
        assert "simbolo dos Sete inexistente" in validar_regras_ficha(atual, {}, ficha_anterior=anterior)

        # Simbolo valido, mas o jogador nao pode se marcar sozinho.
        atual = deepcopy(anterior)
        atual["simboloId"] = "pecado-ira"
        assert "somente o mestre" in validar_regras_ficha(atual, {}, ficha_anterior=anterior)

        # Nem tirar o que o mestre pos.
        com_simbolo = deepcopy(anterior)
        com_simbolo["simboloId"] = "virtude-paciencia"
        sem_simbolo = deepcopy(com_simbolo)
        sem_simbolo["simboloId"] = None
        assert "somente o mestre" in validar_regras_ficha(sem_simbolo, {}, ficha_anterior=com_simbolo)

        # Mantendo o mesmo simbolo, a ficha salva normalmente.
        assert validar_regras_ficha(deepcopy(com_simbolo), {}, ficha_anterior=com_simbolo) is None

        # E ninguem comeca marcado.
        criacao = _ficha_criacao()
        criacao["simboloId"] = "pecado-gula"
        assert "nao comeca com um simbolo" in validar_regras_ficha(criacao, {}, criacao=True)

    def test_players_cannot_change_master_grants_or_old_magic_records(self):
        anterior = _ficha_criacao()
        atual = deepcopy(anterior)
        atual["magiasConcedidasIds"] = ["centelha-de-possibilidade"]
        assert "somente o mestre" in validar_regras_ficha(atual, {}, ficha_anterior=anterior)

        atual = deepcopy(anterior)
        atual["magias"] = [{"id": "manual", "nome": "Antiga"}]
        assert "registros antigos" in validar_regras_ficha(atual, {}, ficha_anterior=anterior)


class TestLiberacaoDeRacaEClasseEspecial:
    """Regressão: o painel do mestre promete que raça/classe especial
    liberada "aparece na criação/edição de fichas", mas até aqui a criação
    exigia incondicionalmente raça/classe comum (liberada ou não), e nenhuma
    ficha já criada podia trocar de raça/classe - nem pra algo liberado."""

    @classmethod
    def setup_class(cls):
        carregar_catalogos(DATA_ROOT)

    def _ficha_elfo(self) -> dict:
        ficha = _ficha_criacao()
        ficha["racaId"] = "elfo"  # esquecida, presa a arvoreId="aethel"
        return ficha

    def test_creation_rejects_unliberated_special_race(self):
        erro = validar_regras_ficha(self._ficha_elfo(), {}, criacao=True)
        assert "raca comum" in erro

    def test_creation_accepts_special_race_liberated_for_the_campaign(self):
        config = {"racas_liberadas": ["elfo"]}
        assert validar_regras_ficha(self._ficha_elfo(), config, criacao=True) is None

    def test_creation_accepts_special_race_liberated_only_for_this_player(self):
        config = {"racas_liberadas_membros": {"user-1": ["elfo"]}}
        assert validar_regras_ficha(self._ficha_elfo(), config, criacao=True, usuario_id="user-1") is None
        # liberado só pro user-1: outro jogador continua barrado
        erro = validar_regras_ficha(self._ficha_elfo(), config, criacao=True, usuario_id="user-2")
        assert "raca comum" in erro

    def test_creation_accepts_a_pure_liberated_special_class_at_level_1(self):
        ficha = _ficha_criacao()
        ficha["classeId"] = "invocador"  # esquecida, presa a arvoreId="aethel"
        ficha["classes"] = [{"classeId": "invocador", "nivel": 1}]
        config = {"classes_liberadas": ["invocador"]}
        assert validar_regras_ficha(ficha, config, criacao=True) is None

    def test_player_can_swap_race_to_a_race_liberated_after_creation(self):
        anterior = _ficha_criacao()  # racaId="vampiro" (comum)
        atual = deepcopy(anterior)
        atual["racaId"] = "elfo"
        config = {"racas_liberadas": ["elfo"]}
        assert validar_regras_ficha(atual, config, ficha_anterior=anterior) is None

    def test_player_cannot_swap_race_to_an_unliberated_special_race(self):
        anterior = _ficha_criacao()
        atual = deepcopy(anterior)
        atual["racaId"] = "elfo"
        # Barrado já pela checagem de liberação de `_compativel_com_arvore`,
        # antes mesmo de chegar na regra de troca pós-criação.
        erro = validar_regras_ficha(atual, {}, ficha_anterior=anterior)
        assert "liberado pelo mestre nesta campanha" in erro

    def test_player_still_cannot_swap_between_two_common_races(self):
        """Nunca foi promessa do painel: raça comum continua travada, mesmo
        com liberações no ar - senão vira respec livre."""
        anterior = _ficha_criacao()  # "vampiro"
        atual = deepcopy(anterior)
        atual["racaId"] = "goblim"
        config = {"racas_liberadas": ["elfo"], "racas_liberadas_membros": {"qualquer": ["goblim"]}}
        erro = validar_regras_ficha(atual, config, ficha_anterior=anterior)
        assert "raca especial liberada" in erro

    def test_arvore_still_locked_after_creation_even_with_liberation(self):
        anterior = _ficha_criacao()
        atual = deepcopy(anterior)
        atual["arvoreId"] = "ousias"
        config = {"racas_liberadas": ["elfo"]}
        erro = validar_regras_ficha(atual, config, ficha_anterior=anterior)
        assert "jogador nao pode alterar arvoreId" in erro

    def test_player_can_swap_class_slot_to_a_liberated_special_class(self):
        anterior = _ficha_criacao()  # classes=[guerreiro nivel 1] (comum)
        atual = deepcopy(anterior)
        atual["classeId"] = "invocador"
        atual["classes"] = [{"classeId": "invocador", "nivel": 1}]
        config = {"classes_liberadas": ["invocador"]}
        assert validar_regras_ficha(atual, config, ficha_anterior=anterior) is None

    def test_player_can_drop_a_common_class_without_a_liberated_replacement(self):
        # Decisão de design 2026-08: idem acima - trocar/remover classe
        # deixou de ser exclusivo do mestre; o router avisa quando acontece.
        anterior = _ficha_criacao()
        atual = deepcopy(anterior)
        atual["classeId"] = "ninja"
        atual["classes"] = [{"classeId": "ninja", "nivel": 1}]
        assert validar_regras_ficha(atual, {}, ficha_anterior=anterior) is None


class TestRacaPersonalizada:
    """Entrada real e mecanicamente vazia em data/ficha/racas.json (categoria
    padrao, sem liberação) - o nome de verdade vem de `racaNomePersonalizado`,
    texto livre que o jogador escreve na ficha."""

    @classmethod
    def setup_class(cls):
        carregar_catalogos(DATA_ROOT)

    def test_creation_accepts_the_custom_race_without_any_liberation(self):
        ficha = _ficha_criacao()
        ficha["racaId"] = RACA_PERSONALIZADA_ID
        ficha["racaNomePersonalizado"] = "Filho da Névoa"
        assert validar_regras_ficha(ficha, {}, criacao=True) is None

    def test_resumo_do_mestre_usa_o_nome_escrito_pelo_jogador(self):
        ficha = _ficha_criacao()
        ficha["racaId"] = RACA_PERSONALIZADA_ID
        ficha["racaNomePersonalizado"] = "Filho da Névoa"
        assert resumir_ficha(ficha)["raca"] == "Filho da Névoa"

    def test_resumo_cai_no_rotulo_do_catalogo_sem_nome_escrito(self):
        ficha = _ficha_criacao()
        ficha["racaId"] = RACA_PERSONALIZADA_ID
        assert resumir_ficha(ficha)["raca"] == "Outra coisa (personalizada)"


class TestEscolhasDeHabilidade:
    """Engenhocas do Engenheiro: o jogador escolhe na lista da habilidade a cada
    descanso, dentro das vagas que o nivel liberou. Espelha
    `selecoesHabilidadeValidas` em src/services/progressaoFichaService.ts."""

    @classmethod
    def setup_class(cls):
        carregar_catalogos(DATA_ROOT)

    @staticmethod
    def _engenheiro(nivel: int, escolhas: dict) -> tuple[dict, dict]:
        anterior = _ficha_criacao()
        anterior["classeId"] = "engenheiro"
        anterior["classes"] = [{"classeId": "engenheiro", "nivel": nivel}]
        anterior["nivel"] = nivel
        anterior["xp"] = 1000000
        atual = deepcopy(anterior)
        atual["escolhasHabilidade"] = escolhas
        return atual, anterior

    def test_aceita_engenhocas_dentro_das_vagas(self):
        atual, anterior = self._engenheiro(8, {
            "engenheiro:engenhocas": ["mina-adesiva", "mina-adesiva"],
            "engenheiro:meus-filhos": ["robotica"],
        })
        assert validar_regras_ficha(atual, {}, ficha_anterior=anterior) is None

    def test_rejeita_mais_engenhocas_do_que_as_vagas(self):
        atual, anterior = self._engenheiro(3, {"engenheiro:engenhocas": ["mina-adesiva", "drone-batedor"]})
        erro = validar_regras_ficha(atual, {}, ficha_anterior=anterior)
        assert "mais opcoes de habilidade" in erro

    def test_rejeita_opcao_fora_do_catalogo(self):
        atual, anterior = self._engenheiro(8, {"engenheiro:engenhocas": ["canhao-de-plasma"]})
        erro = validar_regras_ficha(atual, {}, ficha_anterior=anterior)
        assert "opcao inexistente" in erro

    def test_rejeita_especialidade_duplicada(self):
        # Meus Filhos tem vaga unica: repetir a especialidade ja estoura as vagas
        # antes de chegar na regra de repeticao.
        atual, anterior = self._engenheiro(8, {"engenheiro:meus-filhos": ["robotica", "robotica"]})
        erro = validar_regras_ficha(atual, {}, ficha_anterior=anterior)
        assert "mais opcoes de habilidade" in erro

    def test_rejeita_escolha_de_habilidade_nao_liberada(self):
        atual, anterior = self._engenheiro(2, {"engenheiro:engenhocas": ["mina-adesiva"]})
        erro = validar_regras_ficha(atual, {}, ficha_anterior=anterior)
        assert "ainda nao foi liberada" in erro


class TestPericiaConcedidaPelaClasse:
    """O Oficio (Engenharia) chega junto da classe: ele nao ocupa uma das seis
    pericias iniciais e nao consome Grau de Treinamento. Espelha
    `periciasConcedidasPelaClasse` em src/services/periciasFichaService.ts."""

    @classmethod
    def setup_class(cls):
        carregar_catalogos(DATA_ROOT)

    @staticmethod
    def _engenheiro(nivel: int = 1) -> dict:
        ficha = _ficha_criacao()
        ficha["classeId"] = "engenheiro"
        ficha["classes"] = [{"classeId": "engenheiro", "nivel": nivel}]
        ficha["nivel"] = nivel
        if nivel > 1:
            ficha["xp"] = 1000000
        return ficha

    def test_criacao_aceita_o_oficio_alem_das_seis_pericias(self):
        ficha = self._engenheiro()
        ficha["pericias"]["oficio-engenharia"] = "aprendiz"
        assert validar_regras_ficha(ficha, {}, criacao=True) is None

    def test_criacao_sem_o_oficio_continua_valendo(self):
        assert validar_regras_ficha(self._engenheiro(), {}, criacao=True) is None

    def test_grau_concedido_nao_consome_grau_de_treinamento(self):
        # Nivel 6 da dois Graus de Treinamento. Gastar os dois e ainda carregar o
        # Oficio em Aprendiz precisa passar: o grau da classe nao entra na conta.
        anterior = self._engenheiro(6)
        atual = deepcopy(anterior)
        atual["pericias"]["atletismo"] = "treinado"
        atual["pericias"]["luta"] = "treinado"
        atual["pericias"]["oficio-engenharia"] = "aprendiz"
        assert validar_regras_ficha(atual, {}, ficha_anterior=anterior) is None

    def test_treinar_o_oficio_acima_do_concedido_cobra_a_diferenca(self):
        anterior = self._engenheiro(3)
        atual = deepcopy(anterior)
        # Nivel 3 da um Grau de Treinamento so. Subir o Oficio ate Treinado cobra
        # um grau alem do concedido, e ai o orcamento estoura junto de Atletismo.
        atual["pericias"]["atletismo"] = "treinado"
        atual["pericias"]["oficio-engenharia"] = "treinado"
        erro = validar_regras_ficha(atual, {}, ficha_anterior=anterior)
        assert "excedem os Graus de Treinamento" in erro

    def test_classe_sem_concessao_nao_ganha_a_pericia(self):
        anterior = _ficha_criacao()
        atual = deepcopy(anterior)
        atual["pericias"]["oficio-engenharia"] = "aprendiz"
        erro = validar_regras_ficha(atual, {}, ficha_anterior=anterior)
        assert "pericia inexistente" in erro

    def test_cada_classe_concede_o_proprio_oficio(self):
        # O Alquimista entrou depois do Engenheiro: os dois ids convivem, e a
        # ficha so aceita o oficio da classe que ela realmente tem.
        anterior = _ficha_criacao()
        anterior["classeId"] = "alquimista"
        anterior["classes"] = [{"classeId": "alquimista", "nivel": 1}]
        atual = deepcopy(anterior)
        atual["pericias"]["oficio-alquimia"] = "aprendiz"
        assert validar_regras_ficha(atual, {}, ficha_anterior=anterior) is None

        intruso = deepcopy(anterior)
        intruso["pericias"]["oficio-engenharia"] = "aprendiz"
        assert "pericia inexistente" in validar_regras_ficha(intruso, {}, ficha_anterior=anterior)


class TestVagasPorNivel:
    """Vaga que nao sai em todo estagio: a Rede de Negocios do Comerciante abre
    praca nos niveis 1 e 5 e para por ai. Espelha `vagasEscolhaHabilidade` em
    src/services/progressaoFichaService.ts."""

    @classmethod
    def setup_class(cls):
        carregar_catalogos(DATA_ROOT)

    @staticmethod
    def _comerciante(nivel: int, escolhas: dict) -> tuple[dict, dict]:
        anterior = _ficha_criacao()
        anterior["classeId"] = "comerciante"
        anterior["classes"] = [{"classeId": "comerciante", "nivel": nivel}]
        anterior["nivel"] = nivel
        anterior["xp"] = 1000000
        atual = deepcopy(anterior)
        atual["escolhasHabilidade"] = escolhas
        return atual, anterior

    def test_uma_praca_no_nivel_1(self):
        atual, anterior = self._comerciante(1, {"comerciante:rede-de-negocios": ["feira-de-rua"]})
        assert validar_regras_ficha(atual, {}, ficha_anterior=anterior) is None

    def test_segunda_praca_so_a_partir_do_nivel_5(self):
        escolhas = {"comerciante:rede-de-negocios": ["feira-de-rua", "casa-de-leilao"]}
        atual, anterior = self._comerciante(4, escolhas)
        assert "mais opcoes de habilidade" in validar_regras_ficha(atual, {}, ficha_anterior=anterior)

        atual, anterior = self._comerciante(5, escolhas)
        assert validar_regras_ficha(atual, {}, ficha_anterior=anterior) is None

    def test_a_terceira_praca_nunca_abre(self):
        atual, anterior = self._comerciante(20, {
            "comerciante:rede-de-negocios": ["feira-de-rua", "casa-de-leilao", "mercado-negro"],
        })
        assert "mais opcoes de habilidade" in validar_regras_ficha(atual, {}, ficha_anterior=anterior)

    def test_linhas_de_estoque_seguem_por_estagio(self):
        atual, anterior = self._comerciante(8, {
            "comerciante:estoque": ["pocoes-e-curativos", "pocoes-e-curativos"],
        })
        assert validar_regras_ficha(atual, {}, ficha_anterior=anterior) is None


class TestEfeitosEscolhasDeClasse:
    @classmethod
    def setup_class(cls):
        carregar_catalogos(DATA_ROOT)

    @staticmethod
    def _pirata(nivel: int) -> dict:
        return {
            "classes": [{"classeId": "pirata-amaldicoado", "nivel": nivel}],
            "escolhasHabilidade": {
                "pirata-amaldicoado:evolucao-abissal": [
                    "pele-de-tubarao", "coracao-de-leviata",
                ],
            },
        }

    def test_aplica_so_o_marco_atual_da_mutacao(self):
        nivel_8 = self._pirata(8)
        assert bonus_escolhas_habilidade(nivel_8, "combate", "defesa") == 1
        assert bonus_escolhas_habilidade(nivel_8, "recurso", "vidaMaxima") == 10

        nivel_20 = self._pirata(20)
        assert bonus_escolhas_habilidade(nivel_20, "combate", "defesa") == 2
        assert bonus_escolhas_habilidade(nivel_20, "recurso", "vidaMaxima") == 20
        assert len(efeitos_escolhas_habilidade(nivel_20)) == 2

    def test_nao_aplica_mutacao_nao_escolhida(self):
        ficha = self._pirata(20)
        ficha["escolhasHabilidade"]["pirata-amaldicoado:evolucao-abissal"] = ["faro-de-tempestade"]
        assert efeitos_escolhas_habilidade(ficha) == []


class TestNivelEscolhasDeClasse:
    @classmethod
    def setup_class(cls):
        carregar_catalogos(DATA_ROOT)

    @staticmethod
    def _lutador(nivel: int, com_estilo: bool = True) -> tuple[dict, dict]:
        anterior = _ficha_criacao()
        anterior["classeId"] = "lutador"
        anterior["classes"] = [{"classeId": "lutador", "nivel": nivel}]
        anterior["nivel"] = nivel
        anterior["xp"] = 1000000
        atual = deepcopy(anterior)
        if com_estilo:
            atual["escolhasHabilidade"] = {"lutador:estilo-de-combate": ["boxe"]}
        return atual, anterior

    def test_estilo_de_combate_barrado_no_nivel_8(self):
        atual, anterior = self._lutador(8)
        erro = validar_regras_ficha(atual, {}, ficha_anterior=anterior)
        assert "ainda nao foi liberada" in erro

    def test_estilo_de_combate_liberado_no_nivel_18(self):
        atual, anterior = self._lutador(18)
        assert validar_regras_ficha(atual, {}, ficha_anterior=anterior) is None


class TestPoderesComRequisitoDeNivel:
    """Os poderes do Arsenal Especial do Guerreiro so funcionam com a habilidade
    que chega no nivel 15. Sem o pre-requisito, dava para gastar uma vaga no
    nivel 2 num poder morto por treze niveis."""

    @classmethod
    def setup_class(cls):
        carregar_catalogos(DATA_ROOT)

    @staticmethod
    def _guerreiro(nivel: int, poderes: list[str]) -> tuple[dict, dict]:
        anterior = _ficha_criacao()
        anterior["classes"][0]["nivel"] = nivel
        anterior["nivel"] = nivel
        anterior["xp"] = 1000000
        atual = deepcopy(anterior)
        atual["poderesClasseSelecionados"] = [
            {"classeId": "guerreiro", "poderId": poder} for poder in poderes
        ]
        return atual, anterior

    def test_arsenal_barrado_antes_do_nivel_15(self):
        atual, anterior = self._guerreiro(6, ["arma-do-arsenal"])
        erro = validar_regras_ficha(atual, {}, ficha_anterior=anterior)
        assert "pre-requisitos" in erro

    def test_arsenal_liberado_no_nivel_15(self):
        atual, anterior = self._guerreiro(15, ["arma-do-arsenal", "armadura-do-arsenal"])
        assert validar_regras_ficha(atual, {}, ficha_anterior=anterior) is None


class TestUnicosPassivosDoJardim:
    def test_so_o_maior_bonus_de_cada_alvo_vale(self):
        ficha = {"jardim": {"unicosComprados": ["raiz-de-vigor", "raiz-funda", "tronco-do-jardim"]}}
        assert bonus_unicos_jardim(ficha, "recurso", "vidaMaxima") == 20
        assert bonus_unicos_jardim(ficha, "recurso", "manaMaxima") == 0
        assert bonus_unicos_jardim({}, "recurso", "vidaMaxima") == 0
        assert bonus_unicos_jardim({"jardim": {"unicosComprados": ["inexistente", 7]}}, "recurso", "vidaMaxima") == 0

    def test_vida_do_painel_do_mestre_e_iniciativa_da_sessao_incluem_o_passivo(self):
        base = {"derivados": {"vida": 40, "iniciativa": 12}}
        com = {**base, "jardim": {"unicosComprados": ["raiz-funda", "alerta-de-raiz"]}}
        assert resumir_ficha(com)["vida_maxima"] == resumir_ficha(base)["vida_maxima"] + 12
        assert iniciativa_fixa(com) == iniciativa_fixa(base) + 2
