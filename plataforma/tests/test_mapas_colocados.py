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


def test_cena_so_com_mapas_e_a_arena_inteira_e_com_fundo_cresce_com_folga():
    itens = {A: {"largura": 3000, "altura": 2000}}
    mapas = [_mapa("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", A)]
    assert mc.caber_na_cena(mapas, itens) == (mc.LADO_MAXIMO_CENA, mc.LADO_MAXIMO_CENA)
    assert mc.caber_na_cena(mapas, itens, com_base=True) == (3000 + mc.MARGEM_DA_CENA, 2000 + mc.MARGEM_DA_CENA)
    assert mc.caber_na_cena([], itens) == (0, 0)
    assert mc.centro_da_arena(3000, 2000) == (14884.0, 15384.0)
    assert mc.centro_da_arena(40000, 40000) == (0.0, 0.0)


def test_giro_vai_de_0_a_360_confere_o_valor_e_respeita_a_trava():
    mapa = _mapa("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", A)
    assert mc.novo(A, "Praça", 10, 20)["rotacao"] == 0.0
    assert mc.ler({"mapas": [{k: v for k, v in mapa.items()}]})[0]["rotacao"] == 0.0  # mapa antigo, sem o campo
    assert mc.atualizar(mapa, {"rotacao": 90})["rotacao"] == 90.0
    assert mc.atualizar(mapa, {"rotacao": -90})["rotacao"] == 270.0
    assert mc.atualizar(mapa, {"rotacao": 360})["rotacao"] == 0.0
    assert mc.atualizar(mapa, {"rotacao": 720.5})["rotacao"] == 0.5
    assert mc.atualizar(mapa, {"rotacao": 45.04})["rotacao"] == 45.0
    for ruim in ({"rotacao": "a"}, {"rotacao": float("nan")}, {"rotacao": 99999}, {"rotacao": True}):
        with pytest.raises(ErroMapa):
            mc.atualizar(mapa, ruim)
    preso = {**mapa, "trancado": True}
    with pytest.raises(ErroMapa) as erro:
        mc.atualizar(preso, {"rotacao": 30})
    assert erro.value.codigo == 409
    assert mc.atualizar(preso, {"trancado": False, "rotacao": 30})["rotacao"] == 30.0
    # Girado, o canto do desenho sem girar pode ficar atrás da borda (a caixa girada é que não pode); sem giro, não.
    assert mc.atualizar(mapa, {"rotacao": 90, "x": -300})["x"] == -300.0
    with pytest.raises(ErroMapa):
        mc.atualizar(mapa, {"x": -300})
    guardado = {**mapa, "x": -300, "rotacao": 90.0}
    assert mc.ler({"mapas": [guardado]})[0]["x"] == -300.0
    assert mc.ler({"mapas": [{**guardado, "rotacao": 0}]}) == []
    # A cópia leva o giro do original.
    assert mc.duplicar({**mapa, "rotacao": 45.0}, 120)["rotacao"] == 45.0


def test_mapa_girado_tem_caixa_propria_a_cena_cresce_por_ela_e_a_borda_vale():
    item = {"largura": 1000, "altura": 400}
    mapa = _mapa("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", A, x=500, y=500, rotacao=0.0)
    assert mc.caixa_na_cena(mapa, item) == (500, 500, 1500, 900)
    assert mc.centro_do_mapa(mapa, item) == (1000, 700)
    # Girado em 90 graus em torno do centro (1000, 700): vira 400 de largura por 1000 de altura.
    girado = {**mapa, "rotacao": 90.0}
    assert [round(v, 6) for v in mc.caixa_na_cena(girado, item)] == [800, 200, 1200, 1200]
    assert mc.extensao([girado], {A: item}) == (1200, 1200)
    # Mais perto do canto, o mapa girado passaria da borda de cima: o servidor recusa em vez de cortar.
    perto = {**mapa, "x": 0, "y": 0, "rotacao": 90.0}
    with pytest.raises(ErroMapa) as erro:
        mc.caber_na_cena([perto], {A: item})
    assert erro.value.codigo == 422
    # Sem girar, o mesmo lugar é válido.
    assert mc.caber_na_cena([{**perto, "rotacao": 0.0}], {A: item}) == (mc.LADO_MAXIMO_CENA, mc.LADO_MAXIMO_CENA)


def test_nevoa_acompanha_o_giro_do_mapa():
    mapa = _mapa("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", B, x=500, y=500, rotacao=90.0)
    # O retângulo que cobre a caixa inteira do mapa girado volta a ser o desenho todo (como polígono).
    tudo = {"op": "revelar", "tipo": "retangulo", "x": 800, "y": 200, "w": 400, "h": 1000}
    local = mc.forma_no_mapa(tudo, mapa, 1000.0, 400.0)
    assert local["tipo"] == "poligono" and "x" not in local
    assert {(round(x, 6), round(y, 6)) for x, y in local["pontos"]} == {(0.0, 0.0), (1000.0, 0.0), (1000.0, 400.0), (0.0, 400.0)}
    # A ponta de cima do mapa girado (escala 1) é o canto de cima do desenho: o ponto (1200, 200) cai em (0, 0).
    pincel = {"op": "revelar", "tipo": "pincel", "raio": 50.0, "pontos": [[1200, 200]]}
    volta = mc.forma_no_mapa(pincel, mapa, 1000.0, 400.0)
    assert [round(v, 6) for v in volta["pontos"][0]] == [0.0, 0.0] and volta["raio"] == 50.0

    # Girado em 180 graus, o canto de baixo à direita da cena é o canto de cima à esquerda do desenho.
    itens = {B: {"largura": 2400, "altura": 1800, "chaves": ["mini", "n0/0/0", "n0/1/0", "n0/2/0", "n2/0/0"]}}
    virado = _mapa("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", B, x=3000, y=100, escala=2.0, rotacao=180.0)
    canto = {"op": "revelar", "tipo": "retangulo", "x": 7200, "y": 3400, "w": 400, "h": 200}
    assert mc.ladrilhos_liberados([canto], [virado], itens) == [f"{B}:n0/0/0"]
    # Sem o giro esse mesmo trecho cai no canto de baixo do desenho, onde não há ladrilho: nada sai.
    assert mc.ladrilhos_liberados([canto], [{**virado, "rotacao": 0.0}], itens) == []


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
