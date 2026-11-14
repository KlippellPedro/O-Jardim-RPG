"""Cópias de token e encontros salvos (core/encontros.py): as contas puras, sem banco."""

from __future__ import annotations

import uuid

import pytest

from core import encontros


def _token(nome="Lobo", x=300.0, y=300.0, **extra):
    base = {
        "id": uuid.uuid4(), "nome": nome, "porte": 1, "lado": "inimigo", "imagem_id": uuid.uuid4(), "moldura": "ferro", "camada": "personagens",
        "luz": None, "aura": {"raio": 2, "cor": "#f00", "visivel": True}, "flip_x": False, "flip_y": False, "enquadramento": {}, "barras": {"vida": "todos"},
        "nota_mestre": "foge com 1/4 da vida", "oculto": False, "x": x, "y": y, "personagem_id": None, "participante_id": None,
    }
    base.update(extra)
    return base


def _criatura(**extra):
    base = {"personagem_id": None, "nome": "Lobo", "tipo": "inimigo", "iniciativa": 12, "vida_maxima": 30, "defesa": 14, "mana_maxima": None,
            "estamina_maxima": 10, "ataques": [{"nome": "Mordida"}], "vd": 3, "pericias": ["Luta +5"], "monstro_id": "lobo-cinzento", "visibilidade": "parcial"}
    base.update(extra)
    return base


def test_o_molde_leva_o_que_refaz_o_token_e_a_criatura_e_guarda_so_json():
    molde = encontros.molde_do_token(_token(), _criatura(), dx=100, dy=-50)
    assert molde["dx"] == 100 and molde["dy"] == -50
    assert molde["token"]["nome"] == "Lobo" and isinstance(molde["token"]["imagem_id"], str)
    assert molde["criatura"]["vida_maxima"] == 30 and molde["criatura"]["monstro_id"] == "lobo-cinzento"
    import json
    json.dumps(molde)


def test_personagem_de_jogador_nunca_vira_molde():
    assert encontros.criatura_do_participante(_criatura(personagem_id=uuid.uuid4())) is None
    with pytest.raises(encontros.ErroEncontro):
        encontros.encontro_novo("Emboscada", [_token(nome="Ana", personagem_id=uuid.uuid4())], {})


def test_encontro_guarda_a_posicao_em_relacao_ao_centro_do_grupo():
    a, b = _token("Lobo", 200, 200), _token("Lobo", 400, 200)
    encontro = encontros.encontro_novo("  Bando   de lobos ", [a, b], {})
    assert encontro["nome"] == "Bando de lobos"
    assert [(m["dx"], m["dy"]) for m in encontro["moldes"]] == [(-100.0, 0.0), (100.0, 0.0)]


def test_encontro_usa_a_criatura_do_participante_de_cada_token():
    pid = uuid.uuid4()
    encontro = encontros.encontro_novo("Lobos", [_token(participante_id=pid), _token("Rato")], {str(pid): _criatura()})
    assert encontro["moldes"][0]["criatura"]["nome"] == "Lobo" and encontro["moldes"][1]["criatura"] is None


def test_limites_e_nome_obrigatorio():
    with pytest.raises(encontros.ErroEncontro):
        encontros.encontro_novo("   ", [_token()], {})
    muitos = [_token(x=i * 10.0) for i in range(encontros.MAX_MOLDES_POR_ENCONTRO + 1)]
    with pytest.raises(encontros.ErroEncontro):
        encontros.encontro_novo("Horda", muitos, {})


def test_o_que_vem_do_banco_quebrado_e_descartado_e_o_resto_fica():
    bom = encontros.encontro_novo("Bom", [_token()], {})
    lista = encontros.normalizar_encontros([bom, "lixo", {"nome": "sem moldes", "moldes": []}, {"nome": "", "moldes": bom["moldes"]}, {"nome": "x", "moldes": ["lixo", {"token": 3}]}])
    assert [e["nome"] for e in lista] == ["Bom"]
    assert encontros.normalizar_encontros("nada") == []
    molde = lista[0]["moldes"][0]["token"]
    assert molde["lado"] == "inimigo" and molde["porte"] == 1


def test_molde_com_valor_fora_do_catalogo_volta_ao_padrao_seguro():
    bruto = {"nome": "Estranho", "moldes": [{"dx": "x", "dy": 1e9, "token": {"lado": "rei", "camada": "ceu", "porte": 99, "imagem_id": "a" * 99}, "criatura": {"tipo": "jogador", "visibilidade": "x", "vida_maxima": -4}}]}
    molde = encontros.normalizar_encontro(bruto)["moldes"][0]
    assert molde["token"]["lado"] == "neutro" and molde["token"]["camada"] == "personagens" and molde["token"]["porte"] == 6
    assert molde["token"]["imagem_id"] is None
    assert molde["dx"] == 0.0 and molde["dy"] == 20000.0
    assert molde["criatura"]["tipo"] == "inimigo" and molde["criatura"]["visibilidade"] == "parcial" and molde["criatura"]["vida_maxima"] == 0


def test_nomes_numerados_seguem_a_cena():
    assert encontros.nome_numerado("Lobo", {"Lobo"}) == "Lobo 2"
    assert encontros.nome_numerado("Lobo", {"Lobo", "Lobo 2", "Lobo 3"}) == "Lobo 4"
    assert encontros.nome_numerado("Lobo 2", {"Lobo", "Lobo 2"}) == "Lobo 3"
    assert encontros.nome_numerado(None, set()) == "Token 2"
    assert encontros.nome_numerado("Goblin Arqueiro", {"Goblin Arqueiro"}) == "Goblin Arqueiro 2"


def test_posicoes_livres_andam_em_aneis_sem_pisar_em_ninguem_nem_sair_do_mapa():
    ocupadas = [(150.0, 150.0)]
    livres = encontros.posicoes_livres((160, 140), ocupadas, 100.0, 5, 1000, 1000)
    assert len(livres) == 5 and len(set(livres)) == 5
    assert (150.0, 150.0) not in livres
    assert all(0 <= x <= 1000 and 0 <= y <= 1000 for x, y in livres)
    # Dentro de um mapa de uma casa só, nada cabe além do que existe.
    assert encontros.posicoes_livres((50, 50), [], 100.0, 4, 100, 100) == [(50.0, 50.0)]
    assert encontros.posicoes_livres((50, 50), [], 0, 3, 100, 100) == []


def test_posicoes_livres_nao_repetem_entre_si_nem_com_a_origem_ocupada():
    livres = encontros.posicoes_livres((500, 500), [(550.0, 550.0)], 100.0, 20, 2000, 2000)
    assert len(livres) == 20 and len(set(livres)) == 20
    for i, a in enumerate(livres):
        for b in livres[i + 1:]:
            assert ((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2) ** 0.5 >= 45
