"""Grade do mapa (formato, linha, unidade, medida) e a vista que alguém traz para a mesa inteira."""

import asyncio
import json

import pytest

from core import mapa, tempo_real
from core.tempo_real import Conexao


def test_grade_nova_tem_padroes_que_nao_mudam_o_que_ja_existia():
    grade = mapa.normalizar_grade({})
    assert grade["unidade"] == "m" and grade["linha"] == "solida"
    assert grade["espessura"] == 1.0 and grade["medicao"] == "euclidiana"
    # Uma cena gravada antes dos campos novos ganha os padrões sem perder o resto.
    antiga = mapa.normalizar_grade({}, {"tipo": "hex", "tamanho": 80, "metros": 2})
    assert antiga["tipo"] == "hex" and antiga["tamanho"] == 80 and antiga["metros"] == 2
    assert antiga["linha"] == "solida" and antiga["unidade"] == "m"


def test_grade_aceita_hexagono_plano_pes_linha_tracejada_e_medida():
    grade = mapa.normalizar_grade({
        "tipo": "hex-plano", "unidade": "ft", "metros": 5, "espessura": 2.5, "linha": "tracejada", "medicao": "hex",
    })
    assert grade["tipo"] == "hex-plano" and grade["unidade"] == "ft" and grade["metros"] == 5
    assert grade["espessura"] == 2.5 and grade["linha"] == "tracejada" and grade["medicao"] == "hex"
    for medicao in ("chebyshev", "alternada", "manhattan", "euclidiana"):
        assert mapa.normalizar_grade({"medicao": medicao})["medicao"] == medicao


@pytest.mark.parametrize("ruim", [
    {"unidade": "km"}, {"linha": "ondulada"}, {"medicao": "diagonal"}, {"espessura": 0.1}, {"espessura": 20},
    {"espessura": "grossa"}, {"tipo": "isometrica"}, {"metros": 0}, {"metros": 5000},
])
def test_grade_recusa_campo_novo_invalido(ruim):
    with pytest.raises(mapa.ErroMapa):
        mapa.normalizar_grade(ruim)


def test_vista_da_mesa_confere_centro_zoom_e_area():
    vista = mapa.normalizar_vista_mesa({"x": -300.04, "y": 1250, "zoom": 0.5, "vw": 2400.26, "vh": 1350, "lixo": 1}, 2000, 1000)
    assert vista == {"x": -300.0, "y": 1250.0, "zoom": 0.5, "vw": 2400.3, "vh": 1350.0}
    sem_area = mapa.normalizar_vista_mesa({"x": 10, "y": 10, "zoom": 1}, 2000, 1000)
    assert "vw" not in sem_area
    for ruim in (None, [], {"x": 1, "y": 1}, {"x": "a", "y": 1, "zoom": 1}, {"x": 1, "y": 1, "zoom": 99},
                 {"x": 1, "y": 1, "zoom": 1, "vw": -5}, {"x": 10 ** 9, "y": 1, "zoom": 1}):
        with pytest.raises(mapa.ErroMapa):
            mapa.normalizar_vista_mesa(ruim, 2000, 1000)


def _conexao(nome, gestor=False):
    return Conexao(usuario_id=nome, nome=nome.capitalize(), gestor=gestor)


def _mensagens(conexao):
    return [m for m in (json.loads(t) for t in conexao.tirar_agora()) if m["t"] != "presenca"]


def test_vista_chega_aos_outros_com_o_nome_de_quem_pediu_e_tem_freio():
    async def cenario():
        tempo_real._limpar_para_testes()
        mestre, ana, bruno = _conexao("m", gestor=True), _conexao("ana"), _conexao("bruno")
        for c in (mestre, ana, bruno):
            tempo_real.entrar("camp", c)
            _mensagens(c)
        regras = tempo_real.Regras(cena_id="c1", livre=False, largura=1000, altura=1000, tokens={})

        async def carregar():
            return regras

        vista = {"t": "vista", "x": 500, "y": 400, "zoom": 0.8, "vw": 1600, "vh": 900}
        # Uma jogadora também pode trazer a mesa; quem pediu não recebe de volta.
        assert await tempo_real.processar("camp", ana, vista, carregar, None) is None
        for outro in (mestre, bruno):
            recebida = _mensagens(outro)
            assert len(recebida) == 1
            assert recebida[0]["t"] == "vista" and recebida[0]["nome"] == "Ana"
            assert recebida[0]["x"] == 500 and recebida[0]["vw"] == 1600 and recebida[0]["cena"] == "c1"
        assert _mensagens(ana) == []

        # O Mestre olhando uma cena em preparo manda a vista dessa cena: quem está em outra ignora.
        mestre.vendo = "preparo"
        await tempo_real.processar("camp", mestre, vista, carregar, None)
        assert _mensagens(bruno)[0]["cena"] == "preparo"

        erro = await tempo_real.processar("camp", bruno, {"t": "vista", "x": "longe", "y": 0, "zoom": 1}, carregar, None)
        assert erro["t"] == "erro"

        # No máximo duas por janela: a terceira volta como erro e não chega a ninguém.
        for c in (mestre, ana):
            _mensagens(c)
        resultados = [await tempo_real.processar("camp", bruno, vista, carregar, None) for _ in range(tempo_real.VISTAS_POR_JANELA + 1)]
        # (o pedido inválido de antes já gastou uma das duas vagas)
        assert resultados[0] is None and resultados[-1]["t"] == "erro"

    asyncio.run(cenario())
