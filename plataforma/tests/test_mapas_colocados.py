"""Mapas colocados na cena, sem banco (core/mapas_colocados.py): leitura, conferência, pilha e névoa."""

import pytest

from core import mapas_colocados as mc
from core.mapa import ErroMapa

A = "11111111-1111-1111-1111-111111111111"
B = "22222222-2222-2222-2222-222222222222"


def _mapa(id_mapa, imagem, x=0, y=0, escala=1.0, **extra):
    return {"id": id_mapa, "imagem_id": imagem, "nome": "M", "x": x, "y": y, "escala": escala, "visivel": True, "trancado": False, **extra}


def test_leitura_ignora_registro_quebrado_e_repetido():
    bom = _mapa("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", A, x=10)
    lido = mc.ler({"mapas": [bom, {"id": "x"}, "lixo", bom, {**bom, "id": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", "escala": 99}]})
    assert [m["id"] for m in lido] == [bom["id"]]
    assert mc.ler(None) == [] and mc.ler({"mapas": "x"}) == []


def test_atualizar_confere_campos_e_respeita_a_trava():
    mapa = _mapa("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", A)
    assert mc.atualizar(mapa, {"x": 5.04, "escala": 0.5, "nome": "  Praça   velha "})["nome"] == "Praça velha"
    for ruim in ({"x": -1}, {"escala": 0}, {"visivel": "sim"}, {"x": "a"}):
        with pytest.raises(ErroMapa):
            mc.atualizar(mapa, ruim)
    preso = {**mapa, "trancado": True}
    with pytest.raises(ErroMapa) as erro:
        mc.atualizar(preso, {"x": 5})
    assert erro.value.codigo == 409
    # Mudar nome, esconder e destrancar-e-mexer continuam valendo.
    assert mc.atualizar(preso, {"visivel": False, "nome": "Cofre"})["visivel"] is False
    assert mc.atualizar(preso, {"trancado": False, "x": 5})["x"] == 5.0


def test_pilha_frente_tras_e_degraus():
    mapas = [_mapa(f"{i}" * 8 + "-0000-0000-0000-000000000000", A) for i in "abc"]
    ids = [m["id"] for m in mapas]
    assert [m["id"] for m in mc.reordenar(mapas, ids[0], "frente")] == [ids[1], ids[2], ids[0]]
    assert [m["id"] for m in mc.reordenar(mapas, ids[2], "tras")] == [ids[2], ids[0], ids[1]]
    assert [m["id"] for m in mc.reordenar(mapas, ids[1], "acima")] == [ids[0], ids[2], ids[1]]
    assert [m["id"] for m in mc.reordenar(mapas, ids[0], "abaixo")] == ids  # já está embaixo
    with pytest.raises(ErroMapa):
        mc.reordenar(mapas, ids[0], "meio")


def test_a_cena_cresce_ate_cobrir_os_mapas_e_tem_teto():
    itens = {A: {"largura": 3000, "altura": 2000}, B: {"largura": 2400, "altura": 1800}}
    mapas = [_mapa("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", A), _mapa("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", B, x=3000, y=500, escala=0.5)]
    assert mc.extensao(mapas, itens) == (4200, 2000)
    com_escala = [_mapa("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", A, escala=20)]
    with pytest.raises(ErroMapa):
        mc.caber_na_cena(com_escala, itens)


def test_forma_da_nevoa_vai_para_o_desenho_do_mapa_e_so_conta_se_tocar_nele():
    mapa = _mapa("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", B, x=3000, y=100, escala=2.0)
    retangulo = {"op": "revelar", "tipo": "retangulo", "x": 3200, "y": 300, "w": 400, "h": 200}
    assert mc.forma_no_mapa(retangulo, mapa) == {**retangulo, "x": 100.0, "y": 100.0, "w": 200.0, "h": 100.0}
    pincel = {"op": "revelar", "tipo": "pincel", "raio": 100.0, "pontos": [[3400, 500]]}
    assert mc.forma_no_mapa(pincel, mapa)["pontos"] == [[200.0, 200.0]] and mc.forma_no_mapa(pincel, mapa)["raio"] == 50.0
    itens = {B: {"largura": 2400, "altura": 1800, "chaves": ["mini", "n0/0/0", "n0/1/0", "n0/2/0", "n2/0/0"]}}
    longe = {"op": "revelar", "tipo": "retangulo", "x": 0, "y": 0, "w": 500, "h": 500}
    assert mc.ladrilhos_liberados([longe], [mapa], itens) == []
    assert mc.ladrilhos_liberados([retangulo], [mapa], itens) == [f"{B}:n0/0/0"]
    # Escondido não libera nada.
    assert mc.ladrilhos_liberados([retangulo], [{**mapa, "visivel": False}], itens) == []
