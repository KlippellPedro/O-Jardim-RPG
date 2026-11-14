"""A régua pergunta se há parede entre dois tokens (core/tempo_real.py, tipo "linha"): a cobertura total do Livro.

A resposta é só sim ou não, e só chega a quem enxerga os dois tokens: onde estão as paredes nunca sai do servidor."""

from __future__ import annotations

import asyncio
import json

from core import tempo_real


def _conexao(usuario, gestor=False):
    return tempo_real.Conexao(usuario_id=usuario, nome=usuario.title(), gestor=gestor)


def _regra(x, y, quem_ve="todos", **extra):
    return tempo_real.RegraToken(quem_ve=quem_ve, donos=frozenset(), movivel_livre=False, x=x, y=y, **extra)


# Uma parede vertical no meio do mapa (x = 500), com uma porta fechada, uma aberta e uma janela em lugares diferentes.
ESTRUTURA = {
    "paredes": [[500.0, 0.0, 500.0, 300.0], [500.0, 700.0, 500.0, 1000.0]],
    "aberturas": [
        {"id": "p1", "tipo": "porta", "estado": "fechada", "x1": 500.0, "y1": 300.0, "x2": 500.0, "y2": 400.0},
        {"id": "p2", "tipo": "porta", "estado": "aberta", "x1": 500.0, "y1": 400.0, "x2": 500.0, "y2": 500.0},
        {"id": "j1", "tipo": "janela", "x1": 500.0, "y1": 500.0, "x2": 500.0, "y2": 600.0},
    ],
}


def _regras(**tokens):
    return tempo_real.Regras(cena_id="c1", livre=False, largura=1000, altura=1000, tokens=tokens, estrutura=ESTRUTURA, casa=100.0)


def _perguntar(conexao, regras, de, para):
    # Cada pergunta parte de uma sala limpa: as regras de uma pergunta anterior ficariam guardadas por alguns segundos.
    tempo_real._limpar_para_testes()

    async def cenario():
        async def carregar():
            return regras

        return await tempo_real.processar("camp", conexao, {"t": "linha", "de": de, "para": para}, carregar, None)

    return asyncio.run(cenario())


def _par(y_a, y_b, **extra):
    """Dois tokens dos dois lados da parede, a alturas diferentes."""
    return _regras(a=_regra(300, y_a, **extra), b=_regra(700, y_b, **extra))


def test_parede_entre_os_dois_e_cobertura_total_e_vao_livre_nao_e():
    tempo_real._limpar_para_testes()
    ana = _conexao("ana")
    assert _perguntar(ana, _par(100, 100), "a", "b") == {"t": "linha", "de": "a", "para": "b", "bloqueada": True, "cobertura": "total"}
    # Pela porta fechada (y 300 a 400) ainda é parede; pela porta aberta (400 a 500) e pela janela (500 a 600), a linha passa.
    assert _perguntar(ana, _par(350, 350), "a", "b")["bloqueada"] is True
    assert _perguntar(ana, _par(450, 450), "a", "b")["bloqueada"] is False
    assert _perguntar(ana, _par(550, 550), "a", "b")["bloqueada"] is False
    # Do mesmo lado da parede, claro, nada atrapalha.
    assert _perguntar(ana, _regras(a=_regra(100, 100), b=_regra(300, 100)), "a", "b")["bloqueada"] is False


def test_a_pergunta_so_e_respondida_para_quem_ve_os_dois_tokens():
    tempo_real._limpar_para_testes()
    ana, mestre = _conexao("ana"), _conexao("m", gestor=True)
    escondido = _regras(a=_regra(300, 100), b=_regra(700, 100, quem_ve="gestores"))
    assert _perguntar(ana, escondido, "a", "b") is None, "o jogador não descobre que há um token escondido do outro lado"
    assert _perguntar(mestre, escondido, "a", "b")["bloqueada"] is True

    class NevoaFalsa:
        def revelado(self, x, y):
            return x < 400

    coberto = _regras(a=_regra(300, 100), b=_regra(700, 100, some_na_nevoa=True))
    coberto.nevoa = NevoaFalsa()
    assert _perguntar(ana, coberto, "a", "b") is None, "token na névoa não existe para o jogador"

    com_visao = _regras(a=_regra(300, 100), b=_regra(700, 100))
    com_visao.visao_pelas_paredes = True
    com_visao.visiveis_por_usuario = {"ana": frozenset({"a"})}
    assert _perguntar(ana, com_visao, "a", "b") is None
    com_visao.visiveis_por_usuario = {"ana": frozenset({"a", "b"})}
    assert _perguntar(ana, com_visao, "a", "b")["bloqueada"] is True


def test_pergunta_mal_feita_e_ignorada_sem_erro():
    tempo_real._limpar_para_testes()
    ana = _conexao("ana")
    regras = _par(100, 100)
    assert _perguntar(ana, regras, "a", "a") is None
    assert _perguntar(ana, regras, "a", "nao-existe") is None
    assert _perguntar(ana, regras, "", "") is None
    # Cena sem paredes: a linha é sempre livre.
    livre = tempo_real.Regras(cena_id="c1", livre=False, largura=1000, altura=1000, tokens={"a": _regra(300, 100), "b": _regra(700, 100)})
    assert _perguntar(ana, livre, "a", "b")["bloqueada"] is False


def test_no_maximo_oito_perguntas_por_segundo_e_a_resposta_nao_leva_geometria():
    tempo_real._limpar_para_testes()
    ana = _conexao("ana")
    regras = _par(100, 100)
    respostas = [_perguntar(ana, regras, "a", "b") for _ in range(10)]
    assert [r is not None for r in respostas] == [True] * tempo_real.LINHAS_POR_SEGUNDO + [False] * (10 - tempo_real.LINHAS_POR_SEGUNDO)
    texto = json.dumps(respostas[0])
    assert "500" not in texto and "paredes" not in texto and set(respostas[0]) == {"t", "de", "para", "bloqueada", "cobertura"}
