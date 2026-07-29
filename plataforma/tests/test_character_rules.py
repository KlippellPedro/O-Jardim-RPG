from __future__ import annotations

from copy import deepcopy
from pathlib import Path

from core.character_summary import carregar_catalogos, validar_regras_ficha


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

    def test_rejects_level_without_xp_and_early_second_common_class(self):
        anterior = _ficha_criacao()
        atual = deepcopy(anterior)
        atual["classes"] = [
            {"classeId": "guerreiro", "nivel": 2},
            {"classeId": "ninja", "nivel": 1},
        ]
        atual["nivel"] = 3
        erro = validar_regras_ficha(atual, {}, ficha_anterior=anterior)
        assert "segunda classe comum" in erro

        atual = deepcopy(anterior)
        atual["classes"][0]["nivel"] = 2
        atual["nivel"] = 2
        erro = validar_regras_ficha(atual, {}, ficha_anterior=anterior)
        assert "XP registrado" in erro

    def test_rejects_early_or_unearned_training_degree(self):
        anterior = _ficha_criacao()
        atual = deepcopy(anterior)
        atual["pericias"]["atletismo"] = "especialista"
        erro = validar_regras_ficha(atual, {}, ficha_anterior=anterior)
        assert "nivel total" in erro

    def test_players_cannot_award_themselves_xp(self):
        anterior = _ficha_criacao()
        atual = deepcopy(anterior)
        atual["xp"] = 1000
        erro = validar_regras_ficha(atual, {}, ficha_anterior=anterior)
        assert "somente o mestre" in erro

    def test_rejects_powers_beyond_class_slots(self):
        anterior = _ficha_criacao()
        anterior["classes"][0]["nivel"] = 6
        anterior["nivel"] = 6
        anterior["xp"] = 15000
        atual = deepcopy(anterior)
        atual["poderesClasseSelecionados"] = [
            {"classeId": "guerreiro", "poderId": "arma-do-arsenal"},
            {"classeId": "guerreiro", "poderId": "armadura-do-arsenal"},
            {"classeId": "guerreiro", "poderId": "escudo-do-arsenal"},
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

    def test_validates_magic_source_slots_circle_and_flux(self):
        anterior = _ficha_criacao()
        anterior["arvoreId"] = "ignis"
        anterior["classes"] = [
            {"classeId": "guerreiro", "nivel": 20},
            {"classeId": "elementarista", "nivel": 8},
        ]
        anterior["nivel"] = 28
        anterior["xp"] = 378000
        anterior["atributosFinais"]["fluxo"] = 12
        configuracoes = {"classes_liberadas": ["elementarista"]}

        atual = deepcopy(anterior)
        atual["magiasConhecidasIds"] = [
            "projetil-elemental",
            "surto-elemental",
            "bastiao-elemental",
            "lanca-elemental",
        ]
        assert validar_regras_ficha(atual, configuracoes, ficha_anterior=anterior) is None

        circulo_alto = deepcopy(atual)
        circulo_alto["magiasConhecidasIds"][-1] = "ruptura-elemental"
        assert "fonte de magia" in validar_regras_ficha(circulo_alto, configuracoes, ficha_anterior=anterior)

        sem_fluxo = deepcopy(atual)
        sem_fluxo["atributosFinais"]["fluxo"] = 11
        anterior_sem_fluxo = deepcopy(anterior)
        anterior_sem_fluxo["atributosFinais"]["fluxo"] = 11
        assert "Fluxo insuficiente" in validar_regras_ficha(sem_fluxo, configuracoes, ficha_anterior=anterior_sem_fluxo)

        excedente = deepcopy(atual)
        excedente["magiasConhecidasIds"].append("passo-elemental")
        assert "mais magias" in validar_regras_ficha(excedente, configuracoes, ficha_anterior=anterior)

    def test_players_cannot_change_master_grants_or_old_magic_records(self):
        anterior = _ficha_criacao()
        atual = deepcopy(anterior)
        atual["magiasConcedidasIds"] = ["ritual-do-limiar-seguro"]
        assert "somente o mestre" in validar_regras_ficha(atual, {}, ficha_anterior=anterior)

        atual = deepcopy(anterior)
        atual["magias"] = [{"id": "manual", "nome": "Antiga"}]
        assert "registros antigos" in validar_regras_ficha(atual, {}, ficha_anterior=anterior)
