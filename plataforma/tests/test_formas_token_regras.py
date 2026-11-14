"""Formas e fonte do token (core/formas_token.py): as contas puras."""

from __future__ import annotations

import uuid

import pytest

from core import formas_token as ft


def _img():
    return str(uuid.uuid4())


def test_forma_nova_entra_no_fim_com_nome_limpo_e_numerado_quando_vazio():
    formas = []
    primeira = ft.forma_nova(formas, _img(), "  Lobo   ferido ")
    assert primeira["nome"] == "Lobo ferido" and len(primeira["id"]) == 12
    formas.append(primeira)
    segunda = ft.forma_nova(formas, _img(), "")
    assert segunda["nome"] == "Forma 3", "a base é a forma 1; a primeira extra é a 2"
    assert len(ft.forma_nova([], _img(), "x" * 80)["nome"]) == ft.NOME_MAXIMO


def test_no_maximo_oito_formas_e_a_imagem_tem_de_ser_um_id():
    cheias = [ft.forma_nova([], _img(), f"f{i}") for i in range(ft.MAX_FORMAS)]
    with pytest.raises(ft.ErroForma) as erro:
        ft.forma_nova(cheias, _img(), "demais")
    assert erro.value.codigo == 409
    for ruim in ("lixo", None, 7, ""):
        with pytest.raises(ft.ErroForma):
            ft.forma_nova([], ruim, "x")


def test_o_que_vem_do_banco_quebrado_e_descartado_e_o_resto_fica():
    boa = ft.forma_nova([], _img(), "Boa")
    lido = ft.ler_formas([boa, "lixo", {"id": "x", "imagem_id": "nao-uuid"}, {"id": boa["id"], "imagem_id": _img()}, {"id": "", "imagem_id": _img()}, 7])
    assert [f["id"] for f in lido] == [boa["id"]], "id repetido e imagem quebrada ficam de fora"
    assert ft.ler_formas("nada") == [] and ft.ler_formas(None) == []
    assert len(ft.ler_formas([ft.forma_nova([], _img(), "x")] * 20)) == 1, "repetidas contam uma vez e o teto vale"


def test_forma_ativa_troca_a_imagem_do_token_e_guarda_a_de_base():
    base, outra = uuid.uuid4(), _img()
    forma = {"id": "abc", "nome": "Ferido", "imagem_id": outra}
    token = {"imagem_id": base, "formas": [forma], "forma_ativa": "abc"}
    ft.aplicar_forma(token)
    assert str(token["imagem_id"]) == outra and token["imagem_id_base"] == base and token["forma_ativa"] == "abc"
    # Forma apagada ou id que não existe: volta à imagem de base sem erro.
    token = {"imagem_id": base, "formas": [forma], "forma_ativa": "sumiu"}
    ft.aplicar_forma(token)
    assert token["imagem_id"] == base and token["forma_ativa"] is None
    token = {"imagem_id": None, "formas": None, "forma_ativa": None}
    ft.aplicar_forma(token)
    assert token["imagem_id"] is None and token["formas"] == []


def test_o_mestre_recebe_so_id_nome_e_a_ativa_nunca_a_imagem():
    forma = ft.forma_nova([], _img(), "Ferido")
    visto = ft.lista_do_mestre({"formas": [forma], "forma_ativa": forma["id"]})
    assert visto == {"formas": [{"id": forma["id"], "nome": "Ferido"}], "forma_ativa": forma["id"]}
    assert ft.lista_do_mestre({"formas": [forma], "forma_ativa": "outra"})["forma_ativa"] is None


def test_fonte_liga_com_limite_desliga_e_so_reinicia_quando_pedido():
    assert ft.fonte_configurada(None, False, None) is None
    assert ft.fonte_configurada(None, True, None) == {"limite": None, "usados": 0}
    gasta = ft.gastar_copia({"limite": 3, "usados": 2})
    assert ft.fonte_configurada(gasta, True, 5) == {"limite": 5, "usados": 3}, "mudar o limite não recarrega"
    assert ft.fonte_configurada(gasta, True, 5, reiniciar=True) == {"limite": 5, "usados": 0}
    for ruim in (0, 201, True, "3", 2.5):
        with pytest.raises(ft.ErroForma):
            ft.fonte_configurada(None, True, ruim)


def test_a_fonte_gasta_uma_copia_por_vez_e_para_no_limite():
    fonte = {"limite": 2, "usados": 0}
    fonte = ft.gastar_copia(fonte)
    fonte = ft.gastar_copia(fonte)
    assert fonte == {"limite": 2, "usados": 2}
    with pytest.raises(ft.ErroForma) as erro:
        ft.gastar_copia(fonte)
    assert erro.value.codigo == 409
    sem_limite = {"limite": None, "usados": 500}
    assert ft.gastar_copia(sem_limite)["usados"] == 501
    with pytest.raises(ft.ErroForma):
        ft.gastar_copia(None)
    assert ft.ler_fonte({"limite": "x", "usados": -4}) == {"limite": None, "usados": 0}
    assert ft.ler_fonte("lixo") is None
