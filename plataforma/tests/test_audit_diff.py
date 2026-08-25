from core.audit import character_sheet_diff


def test_character_diff_reports_nested_fields_and_stable_list_items():
    before = {
        "nome": "Lia",
        "ficha": {
            "xp": 10,
            "classes": [
                {"id": "guerreiro", "nivel": 2},
                {"id": "ninja", "nivel": 1},
            ],
        },
    }
    after = {
        "nome": "Lia da Aurora",
        "ficha": {
            "xp": 25,
            "classes": [
                {"id": "guerreiro", "nivel": 3},
                {"id": "alquimista", "nivel": 1},
            ],
        },
    }

    result = character_sheet_diff(before, after)
    by_path = {change["caminho"]: change for change in result["mudancas"]}

    assert by_path["nome"]["depois"] == "Lia da Aurora"
    assert by_path["ficha.xp"] == {
        "caminho": "ficha.xp", "operacao": "alterado", "antes": 10, "depois": 25,
    }
    assert by_path["ficha.classes[guerreiro].nivel"]["depois"] == 3
    assert by_path["ficha.classes[ninja]"]["operacao"] == "removido"
    assert by_path["ficha.classes[alquimista]"]["operacao"] == "adicionado"
    assert result["truncado"] is False


def test_character_diff_masks_sensitive_values_and_truncates_long_text():
    result = character_sheet_diff(
        {"ficha": {"token_sessao": "antigo", "anotacao": "a" * 300}},
        {"ficha": {"token_sessao": "novo", "anotacao": "b" * 300}},
    )
    by_path = {change["caminho"]: change for change in result["mudancas"]}

    assert by_path["ficha.token_sessao"]["antes"] == "[protegido]"
    assert by_path["ficha.token_sessao"]["depois"] == "[protegido]"
    assert len(by_path["ficha.anotacao"]["depois"]) == 180
    assert by_path["ficha.anotacao"]["depois"].endswith("...")


def test_character_diff_caps_persisted_changes_but_keeps_total():
    before = {f"campo_{index}": index for index in range(20)}
    after = {f"campo_{index}": index + 1 for index in range(20)}

    result = character_sheet_diff(before, after, max_changes=5)

    assert len(result["mudancas"]) == 5
    assert result["total_mudancas"] == 20
    assert result["truncado"] is True


def test_character_diff_summarizes_lists_without_stable_ids():
    result = character_sheet_diff(
        {"ficha": {"notas": [{"texto": "antes"}]}},
        {"ficha": {"notas": [{"texto": "depois"}, {"texto": "outra"}]}},
    )

    change = result["mudancas"][0]
    assert change["caminho"] == "ficha.notas"
    assert change["antes"] == {"tipo": "lista", "itens": 1}
    assert change["depois"] == {"tipo": "lista", "itens": 2}
