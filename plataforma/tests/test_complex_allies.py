from pathlib import Path
from uuid import uuid4

from core.character_summary import carregar_catalogos

from routers.characters import (
    _complex_ally_summary,
    _player_complex_allies_error,
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
