"""Zonas de terreno (core/zonas.py): cobertura, gatilho e terreno, as contas puras."""

from __future__ import annotations

import pytest

from core import zonas as z

L, A = 2000, 1500


def _zona(**extra):
    base = {"id": "z1", "nome": "Mesa virada", "x": 400, "y": 400, "w": 200, "h": 100, "cobertura": "parcial"}
    base.update(extra)
    return base


def test_a_lista_e_conferida_e_o_que_esta_errado_e_recusado():
    ok = z.normalizar_zonas([_zona(), _zona(id="z2", cobertura=None, gatilho={"texto_pisador": "  O chão   cede ", "uma_vez": False, "armadilha": 1}, terreno={"rotulo": "lama"})], L, A)
    assert ok[0]["cobertura"] == "parcial" and ok[0]["gatilho"] is None and ok[0]["terreno"] is None
    assert ok[1]["gatilho"] == {"texto_pisador": "O chão cede", "texto_mesa": "", "quem": "jogadores", "uma_vez": False, "armadilha": 1}
    assert ok[1]["terreno"] == {"rotulo": "lama", "visivel": True}
    for ruim in (
        [_zona(cobertura="total")], [_zona(gatilho={"quem": "ninguem"})], [_zona(gatilho={"armadilha": 9})], [_zona(terreno={"rotulo": "ouro"})],
        [_zona(x="a")], [_zona(), _zona()], "lixo", [_zona(x=L)], [3],
    ):
        with pytest.raises(z.ErroZona):
            z.normalizar_zonas(ruim, L, A)
    with pytest.raises(z.ErroZona):
        z.normalizar_zonas([_zona(id=f"z{i}") for i in range(z.MAX_ZONAS + 1)], L, A)
    # A zona que passa da borda é cortada na borda do mapa.
    assert z.normalizar_zonas([_zona(x=1900, w=500)], L, A)[0]["w"] == 100


def test_o_jogador_recebe_so_o_terreno_a_vista_e_nunca_cobertura_nem_gatilho():
    lista = z.normalizar_zonas([
        _zona(id="a"),
        _zona(id="b", cobertura=None, gatilho={"texto_mesa": "x"}),
        _zona(id="c", cobertura="superior", terreno={"rotulo": "molhado"}),
        _zona(id="d", cobertura=None, terreno={"rotulo": "veneno", "visivel": False}),
    ], L, A)
    visto = z.zonas_de(lista, gestor=False)
    assert [v["id"] for v in visto] == ["c"]
    assert visto[0]["cobertura"] is None and visto[0]["gatilho"] is None and visto[0]["terreno"]["rotulo"] == "molhado"
    assert [v["id"] for v in z.zonas_de(lista, gestor=True)] == ["a", "b", "c", "d"]


def test_o_telhado_chega_ao_jogador_sem_o_nome_e_sem_nada_de_cobertura_ou_gatilho():
    lista = z.normalizar_zonas([
        _zona(id="t", nome="Cripta do rei", cobertura="superior", gatilho={"texto_mesa": "x"}, terreno={"rotulo": "veneno", "visivel": False}, telhado=True),
        _zona(id="u", nome="Poça", cobertura=None, terreno={"rotulo": "molhado"}, telhado=True),
        _zona(id="v", cobertura=None),
    ], L, A)
    assert lista[0]["telhado"] is True and lista[2]["telhado"] is False
    visto = {v["id"]: v for v in z.zonas_de(lista, gestor=False)}
    assert sorted(visto) == ["t", "u"], "só o telhado e o terreno à vista chegam ao jogador"
    assert visto["t"] == {"id": "t", "nome": "", "x": 400, "y": 400, "w": 200, "h": 100, "cobertura": None, "gatilho": None, "terreno": None, "telhado": True}
    assert visto["u"]["nome"] == "Poça" and visto["u"]["terreno"]["rotulo"] == "molhado" and visto["u"]["telhado"] is True


def test_zona_quebrada_no_banco_e_descartada_e_o_resto_fica():
    estrutura = {"zonas": [_zona(), {"id": "x", "x": "lixo"}, "lixo", _zona(id="z3", cobertura="superior")]}
    assert [zona["id"] for zona in z.ler_zonas(estrutura, L, A)] == ["z1", "z3"]
    assert z.ler_zonas(None, L, A) == [] and z.ler_zonas({"zonas": "x"}, L, A) == []


def test_a_cobertura_vem_da_zona_que_o_caminho_toca_e_a_superior_vence():
    lista = z.normalizar_zonas([_zona(id="baixa"), _zona(id="muro", x=800, y=380, w=40, h=140, cobertura="superior")], L, A)
    # Atirar de longe, de cima para baixo, atravessando a mesa virada (parcial).
    assert z.cobertura_no_caminho(lista, 500, 100, 500, 800) == "parcial"
    # Atravessando o muro: superior.
    assert z.cobertura_no_caminho(lista, 700, 450, 1000, 450) == "superior"
    # Atravessando as duas: a superior vence.
    assert z.cobertura_no_caminho(lista, 300, 450, 1000, 450) == "superior"
    # Sem tocar em nada.
    assert z.cobertura_no_caminho(lista, 100, 100, 300, 100) is None
    # Quem ataca de dentro da zona não ganha cobertura contra o outro lado dela.
    assert z.cobertura_no_caminho(lista, 500, 450, 500, 900) is None
    # O alvo dentro da zona (agachado atrás da mesa) conta.
    assert z.cobertura_no_caminho(lista, 500, 100, 500, 450) == "parcial"
    # Zona só de terreno ou de gatilho não dá cobertura.
    so_terreno = z.normalizar_zonas([_zona(cobertura=None, terreno={"rotulo": "gelo"})], L, A)
    assert z.cobertura_no_caminho(so_terreno, 500, 100, 500, 800) is None


def test_o_gatilho_dispara_ao_entrar_uma_vez_e_so_para_quem_a_zona_chama():
    lista = z.normalizar_zonas([
        _zona(id="laje", cobertura=None, gatilho={"texto_pisador": "ceder", "quem": "jogadores", "uma_vez": True}),
        _zona(id="sino", x=100, y=100, w=50, h=50, cobertura=None, gatilho={"texto_mesa": "dlim", "quem": "todos", "uma_vez": False}),
    ], L, A)
    fora, dentro_da_laje = (100.0, 900.0), (500.0, 450.0)
    assert [g["id"] for g in z.gatilhos_disparados(lista, fora, dentro_da_laje, gestor=False, usados=set())] == ["laje"]
    # Já estava dentro: não dispara de novo só por andar lá.
    assert z.gatilhos_disparados(lista, dentro_da_laje, (510.0, 450.0), gestor=False, usados=set()) == []
    # O Mestre atravessa a zona "jogadores" sem disparar; a zona "todos" chama até ele.
    assert z.gatilhos_disparados(lista, fora, dentro_da_laje, gestor=True, usados=set()) == []
    assert [g["id"] for g in z.gatilhos_disparados(lista, (300.0, 300.0), (120.0, 120.0), gestor=True, usados=set())] == ["sino"]
    # De uma vez só: depois de usada, não dispara; a que repete dispara sempre.
    assert z.gatilhos_disparados(lista, fora, dentro_da_laje, gestor=False, usados={"laje"}) == []
    assert [g["id"] for g in z.gatilhos_disparados(lista, (300.0, 300.0), (120.0, 120.0), gestor=False, usados={"sino"})] == ["sino"]


# ------------------------------------------------------------------ no tempo real

def test_a_regua_avisa_a_cobertura_das_zonas_e_a_parede_continua_sendo_total():
    import asyncio

    from core import tempo_real

    def _perguntar(regras):
        tempo_real._limpar_para_testes()
        ana = tempo_real.Conexao(usuario_id="ana", nome="Ana", gestor=False)

        async def cenario():
            async def carregar():
                return regras

            return await tempo_real.processar("camp", ana, {"t": "linha", "de": "a", "para": "b"}, carregar, None)

        return asyncio.run(cenario())

    tokens = {
        "a": tempo_real.RegraToken(quem_ve="todos", donos=frozenset(), movivel_livre=False, x=100, y=450),
        "b": tempo_real.RegraToken(quem_ve="todos", donos=frozenset(), movivel_livre=False, x=900, y=450),
    }
    lista = z.normalizar_zonas([_zona(), _zona(id="muro", x=700, y=380, w=40, h=140, cobertura="superior")], L, A)
    regras = tempo_real.Regras(cena_id="c1", livre=False, largura=L, altura=A, tokens=tokens, zonas=lista, casa=100.0)
    assert _perguntar(regras)["cobertura"] == "superior"
    regras.zonas = lista[:1]
    resposta = _perguntar(regras)
    assert (resposta["cobertura"], resposta["bloqueada"]) == ("parcial", False)
    regras.zonas = []
    assert _perguntar(regras)["cobertura"] is None
    regras.estrutura = {"paredes": [[500.0, 0.0, 500.0, 1500.0]]}
    regras.zonas = lista[:1]
    assert _perguntar(regras)["cobertura"] == "total", "a parede vence a cobertura das zonas"


def test_soltar_numa_zona_dispara_o_gatilho_para_quem_pisou_a_mesa_e_o_mestre():
    import asyncio
    import json

    from core import tempo_real

    tempo_real._limpar_para_testes()
    mestre = tempo_real.Conexao(usuario_id="m", nome="Mestre", gestor=True)
    ana = tempo_real.Conexao(usuario_id="ana", nome="Ana", gestor=False)
    bia = tempo_real.Conexao(usuario_id="bia", nome="Bia", gestor=False)
    for c in (mestre, ana, bia):
        tempo_real.entrar("camp", c)
        c.tirar_agora()
    lista = z.normalizar_zonas([
        _zona(id="laje", nome="Laje oca", cobertura=None, gatilho={"texto_pisador": "O chão cede!", "texto_mesa": "Um estalo ecoa.", "armadilha": 1, "uma_vez": True}),
    ], L, A)
    tokens = {"ana": tempo_real.RegraToken(quem_ve="todos", donos=frozenset({"ana"}), movivel_livre=False, x=100, y=100)}
    regras = tempo_real.Regras(cena_id="c1", livre=False, largura=L, altura=A, tokens=tokens, zonas=lista, casa=100.0)

    async def cenario():
        async def carregar():
            return regras

        async def gravar(*_):
            return True

        await tempo_real.processar("camp", ana, {"t": "soltar", "token": "ana", "x": 450, "y": 450}, carregar, gravar)

    asyncio.run(cenario())
    tipos = lambda c: [(m["t"], m.get("texto") or m.get("zona")) for m in (json.loads(t) for t in c.tirar_agora()) if m["t"].startswith("gatilho")]
    assert tipos(ana) == [("gatilho", "O chão cede!"), ("gatilho_mesa", "Um estalo ecoa.")]
    assert tipos(bia) == [("gatilho_mesa", "Um estalo ecoa.")], "quem não pisou só recebe o texto da mesa"
    do_mestre = [json.loads(t) for t in mestre.tirar_agora()]
    aviso = next(m for m in do_mestre if m["t"] == "gatilho_mestre")
    assert (aviso["zona"], aviso["quem"], aviso["armadilha"]) == ("Laje oca", "Ana", 1)

    # Uma vez só: sair e entrar de novo não dispara, e o Mestre rearma.
    async def de_novo(x, y):
        async def carregar():
            return regras

        async def gravar(*_):
            return True

        await tempo_real.processar("camp", ana, {"t": "soltar", "token": "ana", "x": x, "y": y}, carregar, gravar)

    asyncio.run(de_novo(100, 900))
    for c in (mestre, ana, bia):
        c.tirar_agora()
    asyncio.run(de_novo(450, 450))
    assert tipos(ana) == [] and tipos(bia) == []
    tempo_real.rearmar_gatilho("camp", "c1", "laje")
    asyncio.run(de_novo(100, 900))
    asyncio.run(de_novo(450, 450))
    assert ("gatilho", "O chão cede!") in tipos(ana)
