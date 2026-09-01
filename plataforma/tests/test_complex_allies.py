from pathlib import Path
from uuid import uuid4

from core.character_summary import carregar_catalogos

from routers.characters import (
    _complex_ally_summary,
    _player_complex_allies_error,
    _player_shared_allies_error,
    _shared_allies_from_rows,
    _sheet_links_complex_ally,
)


def _complex_ally(ally_id="aliado-1", character_id=None, **changes):
    ally = {
        "id": ally_id,
        "nome": "Zias",
        "categoria": "complexo",
        "personagemId": str(character_id or uuid4()),
        "papel": "Twin",
        "emCena": True,
        "favorito": False,
        "ordem": 0,
    }
    ally.update(changes)
    return ally


def test_player_can_create_and_edit_simple_allies_without_changing_complex_links():
    linked_id = uuid4()
    current = {"aliados": [_complex_ally(character_id=linked_id)]}
    desired = {
        "aliados": [
            _complex_ally(character_id=linked_id, favorito=True, emCena=False, ordem=1),
            {"id": "simple-1", "categoria": "comum", "nome": "Lobo"},
        ]
    }
    assert _player_complex_allies_error(current, desired) is None


def test_player_cannot_create_remove_or_retarget_complex_links():
    first_id = uuid4()
    second_id = uuid4()
    current = {"aliados": [_complex_ally(character_id=first_id)]}

    assert _player_complex_allies_error(current, {"aliados": []})
    assert _player_complex_allies_error(
        current,
        {"aliados": [_complex_ally(character_id=second_id)]},
    )
    assert _player_complex_allies_error(
        {"aliados": []},
        {"aliados": [_complex_ally(character_id=first_id)]},
    )


def test_complex_ally_summary_exposes_stats_but_not_private_sheet_fields():
    character_id = uuid4()
    summary = _complex_ally_summary({
        "id": character_id,
        "nome": "Zias",
        "ficha": {
            "foto": "data:image/png;base64,abc",
            "nivel": 8,
            "derivados": {
                "vida": 42,
                "mana": 18,
                "defesaNatural": 17,
                "movimento": 12,
                "iniciativa": 7,
            },
            "status": {
                "vidaAtual": 31,
                "manaAtual": 11,
                "bonusIniciativa": 2,
                "ajustesIniciativa": [{"valor": 1}],
                "cansacoAtual": 2,
            },
            "condicoesAtivas": ["Surpreendido"],
            "notas": "segredo do outro jogador",
            "inventario": [{"titulo": "item secreto"}],
        },
    })

    assert summary == {
        "personagem_id": str(character_id),
        "nome": "Zias",
        "foto": "data:image/png;base64,abc",
        "vida_atual": 31,
        "vida_maxima": 42,
        "mana_atual": 11,
        "mana_maxima": 18,
        "defesa": 17,
        "movimento": 12,
        "iniciativa": 4,
        "nivel": 8,
    }
    assert "notas" not in summary
    assert "inventario" not in summary


def test_complex_ally_summary_includes_selected_class_mutation_bonuses():
    carregar_catalogos(Path(__file__).resolve().parent.parent.parent / "data")
    summary = _complex_ally_summary({
        "id": uuid4(),
        "nome": "Pirata",
        "ficha": {
            "nivel": 20,
            "classes": [{"classeId": "pirata-amaldicoado", "nivel": 20}],
            "escolhasHabilidade": {
                "pirata-amaldicoado:evolucao-abissal": [
                    "pele-de-tubarao", "coracao-de-leviata",
                ],
            },
            "derivados": {"vida": 42, "mana": 18, "defesaNatural": 17},
            "status": {"vidaAtual": 31, "manaAtual": 11},
        },
    })
    assert summary["vida_maxima"] == 62
    assert summary["defesa"] == 19


def test_only_complex_link_grants_linked_sheet_read_access():
    linked_id = uuid4()
    assert _sheet_links_complex_ally({"aliados": [_complex_ally(character_id=linked_id)]}, linked_id)
    assert not _sheet_links_complex_ally({
        "aliados": [{"categoria": "comum", "personagemId": str(linked_id)}],
    }, linked_id)
    assert not _sheet_links_complex_ally({"aliados": [_complex_ally()]}, linked_id)


def test_one_ally_can_be_shared_with_multiple_characters_without_duplication():
    source_id = uuid4()
    first_target = uuid4()
    second_target = uuid4()
    ally = {
        "id": "simple-1",
        "nome": "Corvo de vigilia",
        "categoria": "comum",
        "emCena": True,
        "personagensVinculados": [str(first_target), str(second_target)],
        "efeitos": [{
            "id": "percepcao",
            "categoria": "pericia",
            "alvo": "percepcao",
            "modo": "vantagem",
            "valor": 1,
        }],
    }

    shared = _shared_allies_from_rows([{
        "id": source_id,
        "nome": "Daphne",
        "ficha": {"aliados": [ally]},
    }], {first_target, second_target})

    assert [item["id"] for item in shared[first_target]] == ["simple-1"]
    assert [item["id"] for item in shared[second_target]] == ["simple-1"]
    assert shared[first_target][0]["compartilhadoDe"] == str(source_id)
    assert shared[first_target][0]["compartilhadoDeNome"] == "Daphne"
    assert shared[first_target][0]["somenteLeitura"] is True
    assert "personagensVinculados" not in shared[first_target][0]
    assert shared[first_target][0]["efeitos"] == ally["efeitos"]


def test_player_cannot_change_master_controlled_shared_ally():
    target_id = uuid4()
    current = {"aliados": [{
        "id": "simple-1",
        "nome": "Lobo",
        "categoria": "comum",
        "emCena": True,
        "personagensVinculados": [str(target_id)],
        "efeitos": [],
        "favorito": False,
        "ordem": 0,
    }]}
    harmless = {"aliados": [{
        **current["aliados"][0],
        "favorito": True,
        "ordem": 2,
    }]}
    changed_effect = {"aliados": [{
        **current["aliados"][0],
        "efeitos": [{
            "id": "bonus",
            "categoria": "pericia",
            "alvo": "atletismo",
            "modo": "bonus",
            "valor": 3,
        }],
    }]}

    assert _player_shared_allies_error(current, harmless) is None
    assert _player_shared_allies_error(current, changed_effect)
    assert _player_shared_allies_error(current, {"aliados": []})
