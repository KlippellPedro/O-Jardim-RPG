"""Desenho livre na mesa (core/tempo_real.py, tipo "traco"): confere forma, pontos e ritmo, e o que é segredo."""

from __future__ import annotations

import asyncio
import json

from core import tempo_real


def _regras():
    return tempo_real.Regras(cena_id="c1", livre=False, largura=1000, altura=1000, tokens={})


def _conexao(usuario, gestor=False):
    return tempo_real.Conexao(usuario_id=usuario, nome=usuario.title(), gestor=gestor)


def _mensagens(conexao):
    return [m for m in (json.loads(t) for t in conexao.tirar_agora()) if m["t"] != "presenca"]


def _mesa():
    tempo_real._limpar_para_testes()
    mestre, ana, bia = _conexao("m", gestor=True), _conexao("ana"), _conexao("bia")
    for c in (mestre, ana, bia):
        tempo_real.entrar("camp", c)
        _mensagens(c)
    for c in (mestre, ana, bia):
        _mensagens(c)
    return mestre, ana, bia, _regras()


def _traco(**extra):
    return {"t": "traco", "id": "t1", "forma": "seta", "pontos": [[10, 10], [200, 90]], "duracao": 8000, **extra}


def test_traco_passa_pela_mesa_e_o_mestre_faz_traco_so_dele():
    async def cenario():
        mestre, ana, bia, regras = _mesa()

        async def carregar():
            return regras

        await tempo_real.processar("camp", ana, _traco(), carregar, None)
        assert [(m["t"], m["forma"], m["duracao"], m["por"]) for m in _mensagens(bia)] == [("traco", "seta", 8000, "ana")]
        assert [m["id"] for m in _mensagens(mestre)] == ["t1"]

        # Traço privado é rascunho do Mestre: só quem comanda recebe.
        await tempo_real.processar("camp", mestre, _traco(id="t2", privado=True), carregar, None)
        assert _mensagens(ana) == [] and _mensagens(bia) == []
        # Jogador não consegue fazer traço privado: o campo só vale para o Mestre.
        await tempo_real.processar("camp", ana, _traco(id="t3", privado=True), carregar, None)
        assert [m["id"] for m in _mensagens(bia)] == ["t3"]

    asyncio.run(cenario())


def test_traco_confere_a_forma_os_pontos_e_o_ritmo():
    async def cenario():
        mestre, ana, _, regras = _mesa()

        async def carregar():
            return regras

        for ruim in (
            _traco(forma="pincel"), _traco(pontos=[[1, 1]]), _traco(pontos=[[1, 1], [2, 2], [3, 3]]),
            _traco(pontos=[[1, "x"], [2, 2]]), _traco(id=""), _traco(pontos=[[1, 1], [999999, 2]]),
        ):
            # Cada pedido ruim usa uma vaga do ritmo; só o que passou conta, então a conta fecha mais abaixo.
            resposta = await tempo_real.processar("camp", ana, ruim, carregar, None)
            assert resposta["t"] == "erro"
        mestre_msgs = _mensagens(mestre)
        assert mestre_msgs == []

    asyncio.run(cenario())


def test_lapis_aceita_varios_pontos_ate_o_teto_e_a_duracao_fica_entre_3_e_60_segundos():
    async def cenario():
        mestre, ana, _, regras = _mesa()

        async def carregar():
            return regras

        lapis = _traco(forma="lapis", pontos=[[i, i] for i in range(64)])
        assert await tempo_real.processar("camp", ana, lapis, carregar, None) is None
        mais = _traco(forma="lapis", pontos=[[i, i] for i in range(65)])
        assert (await tempo_real.processar("camp", ana, mais, carregar, None))["t"] == "erro"
        _mensagens(mestre)
        await tempo_real.processar("camp", ana, _traco(id="a", duracao=1), carregar, None)
        await tempo_real.processar("camp", ana, _traco(id="b", duracao=10**9), carregar, None)
        await tempo_real.processar("camp", ana, _traco(id="c", duracao="x"), carregar, None)
        assert [m["duracao"] for m in _mensagens(mestre)] == [3000, 60000, 10000]

    asyncio.run(cenario())


def test_no_maximo_oito_tracos_a_cada_cinco_segundos():
    async def cenario():
        _, ana, _, regras = _mesa()

        async def carregar():
            return regras

        respostas = [await tempo_real.processar("camp", ana, _traco(id=f"x{i}"), carregar, None) for i in range(10)]
        assert respostas[:8] == [None] * 8
        assert [r["t"] for r in respostas[8:]] == ["erro", "erro"]

    asyncio.run(cenario())


def test_traco_de_jogador_que_comeca_na_nevoa_fica_entre_quem_comanda():
    async def cenario():
        mestre, ana, bia, regras = _mesa()

        class NevoaFalsa:
            def revelado(self, x, y):
                return x < 100

        regras.nevoa = NevoaFalsa()

        async def carregar():
            return regras

        await tempo_real.processar("camp", ana, _traco(id="dentro", pontos=[[500, 5], [600, 9]]), carregar, None)
        assert [m["id"] for m in _mensagens(mestre)] == ["dentro"] and _mensagens(bia) == []
        await tempo_real.processar("camp", ana, _traco(id="fora", pontos=[[5, 5], [600, 9]]), carregar, None)
        assert [m["id"] for m in _mensagens(bia)] == ["fora"]

    asyncio.run(cenario())


def test_desfazer_e_limpar_os_tracos_chegam_aos_outros():
    async def cenario():
        mestre, ana, _, regras = _mesa()

        async def carregar():
            return regras

        await tempo_real.processar("camp", ana, {"t": "traco_apagar", "id": "t1"}, carregar, None)
        await tempo_real.processar("camp", ana, {"t": "traco_limpar"}, carregar, None)
        assert [(m["t"], m.get("id"), m["por"]) for m in _mensagens(mestre)] == [("traco_apagar", "t1", "ana"), ("traco_limpar", None, "ana")]
        resposta = await tempo_real.processar("camp", ana, {"t": "traco_apagar"}, carregar, None)
        assert resposta["t"] == "erro"

    asyncio.run(cenario())


def test_jogador_sem_permissao_de_ping_nao_desenha():
    async def cenario():
        mestre, ana, _, regras = _mesa()
        ana.permissoes_mesa = {"usar_ping": False}

        async def carregar():
            return regras

        resposta = await tempo_real.processar("camp", ana, _traco(), carregar, None)
        assert resposta["t"] == "erro" and _mensagens(mestre) == []

    asyncio.run(cenario())


def test_a_regua_de_quem_sai_some_da_tela_dos_outros():
    async def cenario():
        mestre, ana, _, regras = _mesa()

        async def carregar():
            return regras

        await tempo_real.processar("camp", ana, {"t": "regua", "pontos": [[1, 1], [50, 50], [90, 20]]}, carregar, None)
        assert [m["t"] for m in _mensagens(mestre)] == ["regua"]
        tempo_real.sair("camp", ana)
        sumiu = [m for m in _mensagens(mestre) if m["t"] == "regua"]
        assert sumiu and sumiu[-1]["pontos"] is None and sumiu[-1]["por"] == "ana"

    asyncio.run(cenario())
