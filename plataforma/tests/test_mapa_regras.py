"""Regras puras do mapa ao vivo (core/mapa.py), do acervo (core/acervo.py) e do repasse em tempo real."""

from __future__ import annotations

import asyncio
import json

import pytest

from core import acervo, mapa, tempo_real
from core.acervo import ErroAcervo
from core.mapa import Espectador, ErroMapa

MESTRE = Espectador(usuario_id="m", gestor=True)
ANA = Espectador(usuario_id="ana", gestor=False, personagens=frozenset({"p-ana"}))
BRUNO = Espectador(usuario_id="bruno", gestor=False, personagens=frozenset({"p-bruno"}))


def token(**extra):
    base = {"id": "t1", "x": 150.0, "y": 250.0, "porte": 1, "lado": "inimigo", "oculto": False, "barras": {},
            "personagem_id": None, "participante_id": None, "imagem_id": None, "nome": None}
    base.update(extra)
    return base


def participante(**extra):
    base = {"id": "pa1", "personagem_id": None, "nome": "Lobo", "tipo": "inimigo", "visibilidade": "total",
            "vida_atual": 10, "vida_maxima": 40, "mana_atual": 0, "mana_maxima": 0,
            "estamina_atual": 5, "estamina_maxima": 10, "condicoes": []}
    base.update(extra)
    return base


# ------------------------------------------------------------- visibilidade

def test_token_oculto_nao_sai_para_jogador_mas_sai_para_o_mestre():
    oculto = token(oculto=True)
    assert mapa.visao_token(oculto, None, ANA, livre=False) is None
    visto = mapa.visao_token(oculto, None, MESTRE, livre=False)
    assert visto["oculto"] is True


def test_participante_oculto_some_e_desconhecido_vem_sem_nome_nem_barra():
    assert mapa.visao_token(token(participante_id="pa1"), participante(visibilidade="oculto"), ANA, livre=False) is None
    visto = mapa.visao_token(
        token(participante_id="pa1", barras={"para": "todos"}), participante(visibilidade="desconhecido"), ANA,
        livre=False, tem_retrato=True, condicoes=["Caído"],
    )
    assert visto["nome"] == "Inimigo Desconhecido"
    assert visto["barras"] == []
    assert visto["imagem"] is False
    assert visto["condicoes"] == []
    assert visto["desconhecido"] is True


def test_degrau_parcial_mostra_so_o_estado_da_vida():
    visto = mapa.visao_token(
        token(participante_id="pa1", barras={"para": "todos", "mostrar": ["vida", "mana"]}),
        participante(visibilidade="parcial", vida_atual=10, vida_maxima=40), ANA, livre=False,
    )
    assert visto["barras"] == [{"tipo": "vida", "rotulo": "Muito ferido", "fracao": 0.3}]


def test_degrau_total_mostra_numeros_conforme_a_escolha_do_dono():
    visto = mapa.visao_token(
        token(participante_id="pa1", barras={"para": "todos", "mostrar": ["vida", "estamina"]}),
        participante(), ANA, livre=False,
    )
    assert visto["barras"] == [
        {"tipo": "vida", "atual": 10, "maximo": 40},
        {"tipo": "estamina", "atual": 5, "maximo": 10},
    ]


def test_servidor_manda_os_recursos_liberados_e_o_aparelho_escolhe_qual_desenhar():
    # O servidor só filtra pela permissão do token; Mana, Estamina ou as duas é escolha de cada
    # aparelho (src/pages/Mapa/motor/barrasToken.ts, tests/frontend/barrasDoToken.test.ts).
    tudo = token(participante_id="pa1", barras={"para": "todos", "mostrar": ["vida", "mana", "estamina", "sanidade"]})
    com_mana = participante(mana_atual=3, mana_maxima=6)
    assert [b["tipo"] for b in mapa.visao_token(tudo, com_mana, ANA, livre=False)["barras"]] == ["vida", "mana", "estamina"]
    # Sem Mana na ficha, não há barra de Mana para mandar.
    assert [b["tipo"] for b in mapa.visao_token(tudo, participante(), ANA, livre=False)["barras"]] == ["vida", "estamina"]
    so_estamina = token(participante_id="pa1", barras={"para": "todos", "mostrar": ["vida", "estamina"]})
    assert [b["tipo"] for b in mapa.visao_token(so_estamina, com_mana, ANA, livre=False)["barras"]] == ["vida", "estamina"]


def test_inimigo_comeca_com_barras_so_para_o_mestre():
    inimigo = token(participante_id="pa1")
    assert mapa.visao_token(inimigo, participante(), ANA, livre=False)["barras"] == []
    assert mapa.visao_token(inimigo, participante(), MESTRE, livre=False)["barras"][0]["tipo"] == "vida"


def test_barras_do_jogador_respeitam_dono_e_ninguem():
    da_ana = token(id="t2", personagem_id="p-ana", lado="jogador", barras={"para": "dono"})
    ficha = {"vida_atual": 30, "vida_maxima": 30, "mana_atual": 4, "mana_maxima": 8}
    sanidade = (70, 100)
    da_ana_para_ana = mapa.visao_token(da_ana, None, ANA, livre=False, recursos_ficha=ficha, sanidade=sanidade)
    assert [b["tipo"] for b in da_ana_para_ana["barras"]] == ["vida", "mana", "sanidade"]
    assert da_ana_para_ana["config_barras"]["para"] == "dono"
    assert mapa.visao_token(da_ana, None, BRUNO, livre=False, recursos_ficha=ficha)["barras"] == []
    assert "config_barras" not in mapa.visao_token(da_ana, None, BRUNO, livre=False, recursos_ficha=ficha)
    assert mapa.visao_token(da_ana, None, MESTRE, livre=False, recursos_ficha=ficha)["barras"]
    escondido = token(id="t3", personagem_id="p-ana", lado="jogador", barras={"para": "ninguem"})
    assert mapa.visao_token(escondido, None, ANA, livre=False, recursos_ficha=ficha)["barras"] == []


def test_sanidade_le_a_ficha_como_o_hud():
    assert mapa.sanidade_da_ficha({"status": {}}) == (100, 100)
    assert mapa.sanidade_da_ficha({"status": {"sanidadeAtual": 40, "sanidadeMaxima": 80}}) == (40, 80)
    assert mapa.sanidade_da_ficha({"status": {"sanidadeAtual": 400}}) == (100, 100)
    assert mapa.sanidade_da_ficha({}) is None


# ------------------------------------------------------------------ mover

def test_quem_move_o_que():
    da_ana = token(personagem_id="p-ana", lado="jogador")
    lobo = token(participante_id="pa1")
    assert mapa.pode_mover(da_ana, None, ANA, livre=False)
    assert not mapa.pode_mover(da_ana, None, BRUNO, livre=False)
    assert mapa.pode_mover(da_ana, None, BRUNO, livre=True)
    assert mapa.pode_mover(lobo, participante(), MESTRE, livre=False)
    assert not mapa.pode_mover(lobo, participante(visibilidade="desconhecido"), BRUNO, livre=True)
    assert not mapa.pode_mover(token(oculto=True), None, BRUNO, livre=True)


def test_dono_pelo_participante_ligado_ao_personagem():
    da_ana_na_sessao = token(participante_id="pa1")
    assert mapa.e_dono(da_ana_na_sessao, participante(personagem_id="p-ana"), ANA)
    assert mapa.degrau_de(token(oculto=True, personagem_id="p-ana"), None, ANA) == "total"


# ------------------------------------------------------------ normalização

def test_grade_recusa_campo_errado_e_mescla_o_resto():
    grade = mapa.normalizar_grade({"tamanho": 70, "tipo": "hex"}, {"cor": "#ff0000"})
    assert grade["tamanho"] == 70 and grade["tipo"] == "hex" and grade["cor"] == "#ff0000"
    assert grade["metros"] == 1.5
    for ruim in ({"tipo": "triangular"}, {"tamanho": 5}, {"cor": "vermelho"}, {"opacidade": 2}, {"x": float("nan")}):
        with pytest.raises(ErroMapa):
            mapa.normalizar_grade(ruim)


def test_barras_recusa_tipo_e_destino_desconhecidos():
    with pytest.raises(ErroMapa):
        mapa.normalizar_barras({"mostrar": ["fome"]})
    with pytest.raises(ErroMapa):
        mapa.normalizar_barras({"para": "metade"})
    assert mapa.normalizar_barras({"mostrar": ["sanidade", "vida"]})["mostrar"] == ["vida", "sanidade"]


def test_posicao_fica_dentro_do_mapa_e_porte_tem_limite():
    assert mapa.limitar_posicao(-50, 9999, 1000, 800) == (0.0, 800.0)
    with pytest.raises(ErroMapa):
        mapa.limitar_posicao(True, 1, 100, 100)
    with pytest.raises(ErroMapa):
        mapa.porte_valido(7)
    assert mapa.porte_valido(3) == 3


def test_quem_ve_no_tempo_real():
    assert mapa.quem_ve(token(oculto=True), None) == "gestores"
    assert mapa.quem_ve(token(), participante(visibilidade="oculto")) == "donos"
    assert mapa.quem_ve(token(), participante(visibilidade="desconhecido")) == "todos"


# ------------------------------------------------------------------ acervo

def test_chaves_esperadas_cobrem_o_mapa_e_a_versao_reduzida():
    pequena = acervo.chaves_esperadas(800, 600)
    assert pequena == ["mini", "n0/0/0"]
    grande = acervo.chaves_esperadas(5000, 3000)
    assert "n0/4/2" in grande and "n0/5/0" not in grande
    assert "n2/1/0" in grande and "n2/0/0" in grande and "n2/2/0" not in grande
    with pytest.raises(ErroAcervo):
        acervo.chaves_esperadas(0, 10)


def test_pedaco_confere_tipo_pelos_bytes():
    webp = b"RIFF\x10\x00\x00\x00WEBPVP8 " + b"\x00" * 8
    esperadas = ["mini", "n0/0/0"]
    assert acervo.conferir_pedaco("n0/0/0", "image/webp", webp, esperadas) == "image/webp"
    with pytest.raises(ErroAcervo):
        acervo.conferir_pedaco("n0/0/0", "image/png", webp, esperadas)
    with pytest.raises(ErroAcervo):
        acervo.conferir_pedaco("n0/9/9", "image/webp", webp, esperadas)
    with pytest.raises(ErroAcervo):
        acervo.conferir_pedaco("../../etc", "image/webp", webp, esperadas)
    with pytest.raises(ErroAcervo):
        acervo.conferir_pedaco("mini", "text/html", b"<html>", esperadas)


def test_nome_do_acervo_nao_aceita_barra():
    assert acervo.nome_limpo("  Cavernas / Andar 1 ", 80, "nome") == "Cavernas Andar 1"
    assert acervo.etiquetas_limpas(["Floresta", "floresta", "", "Noite"]) == ["floresta", "noite"]


# ------------------------------------------------------------- tempo real

def _regras(**tokens):
    return tempo_real.Regras(cena_id="c1", livre=False, largura=1000, altura=1000, tokens=tokens)


def _conexao(usuario, gestor=False):
    return tempo_real.Conexao(usuario_id=usuario, nome=usuario.title(), gestor=gestor)


def _mensagens(conexao):
    saida = [json.loads(texto) for texto in conexao.tirar_agora()]
    return [m for m in saida if m["t"] != "presenca"]


def test_arrasto_de_token_oculto_so_chega_ao_mestre():
    async def cenario():
        tempo_real._limpar_para_testes()
        mestre, ana, bruno = _conexao("m", gestor=True), _conexao("ana"), _conexao("bruno")
        for c in (mestre, ana, bruno):
            tempo_real.entrar("camp", c)
        regras = _regras(
            lobo=tempo_real.RegraToken(quem_ve="gestores", donos=frozenset(), movivel_livre=False),
            mira=tempo_real.RegraToken(quem_ve="todos", donos=frozenset({"ana"}), movivel_livre=True),
        )

        async def carregar():
            return regras

        gravadas = []

        async def gravar(token_id, x, y):
            gravadas.append((token_id, x, y))
            return True

        await tempo_real.processar("camp", mestre, {"t": "arrastar", "token": "lobo", "x": 10, "y": 20}, carregar, gravar)
        assert [m["t"] for m in _mensagens(ana)] == []
        assert [m["t"] for m in _mensagens(bruno)] == []

        await tempo_real.processar("camp", ana, {"t": "arrastar", "token": "mira", "x": 2000, "y": 20}, carregar, gravar)
        recebida = _mensagens(bruno)
        assert recebida[0]["t"] == "arrastando" and recebida[0]["x"] == 1000
        assert _mensagens(ana) == []

        recusa = await tempo_real.processar("camp", bruno, {"t": "soltar", "token": "mira", "x": 5, "y": 5}, carregar, gravar)
        assert recusa["t"] == "erro" and gravadas == []

        await tempo_real.processar("camp", ana, {"t": "soltar", "token": "mira", "x": 5, "y": 5}, carregar, gravar)
        assert gravadas == [("mira", 5.0, 5.0)]
        assert _mensagens(mestre)[-1]["t"] == "token"

    asyncio.run(cenario())


def test_cena_livre_deixa_jogador_mover_o_que_ve_e_regua_e_conferida():
    async def cenario():
        tempo_real._limpar_para_testes()
        bruno, ana = _conexao("bruno"), _conexao("ana")
        tempo_real.entrar("camp2", bruno)
        tempo_real.entrar("camp2", ana)
        regras = _regras(mira=tempo_real.RegraToken(quem_ve="todos", donos=frozenset({"ana"}), movivel_livre=True))
        regras.livre = True

        async def carregar():
            return regras

        async def gravar(*_):
            return True

        assert await tempo_real.processar("camp2", bruno, {"t": "arrastar", "token": "mira", "x": 1, "y": 1}, carregar, gravar) is None
        assert _mensagens(ana)[0]["por"] == "bruno"
        erro = await tempo_real.processar("camp2", bruno, {"t": "regua", "pontos": [[1, 2, 3]]}, carregar, gravar)
        assert erro["t"] == "erro"
        await tempo_real.processar("camp2", bruno, {"t": "regua", "pontos": [[1, 2], [30, 40]]}, carregar, gravar)
        assert _mensagens(ana)[0]["pontos"] == [[1, 2], [30, 40]]

    asyncio.run(cenario())


def test_limite_de_mensagens_por_segundo():
    conexao = _conexao("ana")
    aceitas = sum(1 for _ in range(100) if conexao.dentro_do_limite())
    assert aceitas == tempo_real.LIMITE_POR_SEGUNDO


# ---------------------------------------------------------------- molduras

def test_moldura_da_mesa_vale_acima_de_tudo_e_depois_token_personagem_padrao():
    assert mapa.moldura_efetiva(token(moldura="osso"), "p-ana", "ouro", "runa") == "runa"
    assert mapa.moldura_efetiva(token(moldura="osso"), "p-ana", "ouro", None) == "osso"
    assert mapa.moldura_efetiva(token(), "p-ana", "ouro", None) == "ouro"
    assert mapa.moldura_efetiva(token(), "p-ana", None, None) == "nivel"
    assert mapa.moldura_efetiva(token(), None, None, None) == "lado"


def test_moldura_desconhecida_e_recusada_e_vazio_volta_ao_padrao():
    assert mapa.normalizar_moldura("fluxo-tempo") == "fluxo-tempo"
    assert mapa.normalizar_moldura("") is None
    with pytest.raises(ErroMapa):
        mapa.normalizar_moldura("diamante-rosa")
    assert len([m for m in mapa.MOLDURAS if m.startswith("fluxo-")]) == 11


def test_enquadramento_tem_limites():
    assert mapa.normalizar_enquadramento({"zoom": 2, "x": -0.5}) == {"zoom": 2.0, "x": -0.5, "y": 0.0}
    for ruim in ({"zoom": 0.5}, {"zoom": 9}, {"x": 2}, {"y": "meio"}):
        with pytest.raises(ErroMapa):
            mapa.normalizar_enquadramento(ruim)


def test_desconhecido_nao_entrega_a_moldura_do_personagem():
    visto = mapa.visao_token(token(participante_id="pa1"), participante(visibilidade="desconhecido"), ANA,
                             livre=False, moldura="ouro", enquadramento={"zoom": 3})
    assert visto["moldura"] == "lado"
    assert visto["enquadramento"] == mapa.ENQUADRAMENTO_PADRAO
    visivel = mapa.visao_token(token(participante_id="pa1"), participante(), ANA, livre=False, moldura="ouro", enquadramento={"zoom": 3})
    assert visivel["moldura"] == "ouro" and visivel["enquadramento"]["zoom"] == 3.0
