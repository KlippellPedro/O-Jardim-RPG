"""Névoa de guerra (core/nevoa.py), clima (core/mapa.py) e o tempo real com a névoa ligada."""

from __future__ import annotations

import asyncio
import json
import random

import pytest

from core import mapa, nevoa, tempo_real
from core.mapa import Espectador, ErroMapa

MESTRE = Espectador(usuario_id="m", gestor=True)
ANA = Espectador(usuario_id="ana", gestor=False, personagens=frozenset({"p-ana"}))


def forma(**dados):
    return nevoa.normalizar_forma(dados, 4000, 3000)


def chaves_do_mapa(largura, altura):
    colunas, linhas = -(-largura // 1024), -(-altura // 1024)
    chaves = [f"n0/{c}/{l}" for c in range(colunas) for l in range(linhas)]
    if max(largura, altura) > 2048:
        chaves += [f"n2/{c}/{l}" for c in range(-(-largura // 4096)) for l in range(-(-altura // 4096))]
    return chaves + ["mini"]


# ---------------------------------------------------------------- formas

def test_forma_invalida_e_recusada_e_retangulo_ao_contrario_e_acertado():
    with pytest.raises(ErroMapa):
        forma(op="apagar", tipo="retangulo", x=0, y=0, w=10, h=10)
    with pytest.raises(ErroMapa):
        forma(op="revelar", tipo="poligono", pontos=[[0, 0], [10, 10]])
    with pytest.raises(ErroMapa):
        forma(op="revelar", tipo="pincel", raio=0, pontos=[[5, 5]])
    with pytest.raises(ErroMapa):
        forma(op="revelar", tipo="pincel", raio=20, pontos=[[5, float("nan")]])
    with pytest.raises(ErroMapa):
        forma(op="revelar", tipo="pincel", raio=20, pontos=[[1, 1]] * (nevoa.MAX_PONTOS_FORMA + 1))
    acertado = forma(op="revelar", tipo="retangulo", x=500, y=400, w=-300, h=-200)
    assert acertado == {"op": "revelar", "tipo": "retangulo", "x": 200.0, "y": 200.0, "w": 300.0, "h": 200.0}


def test_teto_de_formas():
    muitas = [forma(op="revelar", tipo="retangulo", x=0, y=0, w=10, h=10)] * (nevoa.MAX_FORMAS + 1)
    with pytest.raises(ErroMapa) as erro:
        nevoa.caber(muitas)
    assert erro.value.codigo == 409


def test_a_ultima_forma_que_contem_o_ponto_decide():
    cobertura = nevoa.Nevoa([
        forma(op="revelar", tipo="retangulo", x=0, y=0, w=1000, h=1000),
        forma(op="esconder", tipo="poligono", pontos=[[400, 400], [600, 400], [500, 600]]),
        forma(op="revelar", tipo="pincel", raio=30, pontos=[[500, 450]]),
    ])
    assert cobertura.revelado(100, 100)
    assert not cobertura.revelado(500, 520)
    assert cobertura.revelado(510, 460)
    assert not cobertura.revelado(1500, 100)
    assert not nevoa.Nevoa([]).revelado(10, 10)


def test_pincel_cobre_o_traco_inteiro_e_nao_so_os_pontos():
    traco = nevoa.Nevoa([forma(op="revelar", tipo="pincel", raio=20, pontos=[[100, 100], [900, 100]])])
    assert traco.revelado(500, 115)
    assert not traco.revelado(500, 125)


# -------------------------------------------------------------- ladrilhos

def test_sem_nada_revelado_nenhum_ladrilho_sai_e_a_miniatura_nunca_sai():
    chaves = chaves_do_mapa(8000, 6000)
    assert nevoa.ladrilhos_liberados([], 8000, 6000, chaves) == []
    tudo = [forma(op="revelar", tipo="retangulo", x=0, y=0, w=8000, h=6000)]
    liberados = nevoa.ladrilhos_liberados(tudo, 8000, 6000, chaves)
    assert "mini" not in liberados
    assert set(liberados) == set(chaves) - {"mini"}


def test_so_os_ladrilhos_que_a_area_revelada_toca():
    chaves = chaves_do_mapa(4000, 3000)
    sala = [forma(op="revelar", tipo="retangulo", x=1000, y=1100, w=100, h=100)]
    # 1000..1100 em x toca a coluna 0 (até 1024) e a 1; 1100..1200 em y fica na linha 1.
    assert nevoa.ladrilhos_liberados(sala, 4000, 3000, chaves) == ["n0/0/1", "n0/1/1"]


def test_versao_reduzida_so_sai_quando_todos_os_ladrilhos_dela_saem():
    chaves = chaves_do_mapa(8000, 6000)
    metade = [forma(op="revelar", tipo="retangulo", x=0, y=0, w=4096, h=4096)]
    liberados = nevoa.ladrilhos_liberados(metade, 8000, 6000, chaves)
    assert "n2/0/0" in liberados and "n2/1/0" not in liberados
    # Até 3000 em x, a quarta coluna de ladrilhos (3072..4096) fica escondida: a versão reduzida não sai.
    quase = [forma(op="revelar", tipo="retangulo", x=0, y=0, w=3000, h=4096)]
    liberados = nevoa.ladrilhos_liberados(quase, 8000, 6000, chaves)
    assert "n2/0/0" not in liberados and "n0/2/3" in liberados and "n0/3/0" not in liberados


def test_esconder_so_tira_o_ladrilho_coberto_por_inteiro():
    chaves = chaves_do_mapa(4000, 3000)
    revelado = forma(op="revelar", tipo="retangulo", x=0, y=0, w=4000, h=3000)
    quase_tudo = forma(op="esconder", tipo="retangulo", x=0, y=0, w=2040, h=3000)
    liberados = nevoa.ladrilhos_liberados([revelado, quase_tudo], 4000, 3000, chaves)
    # A coluna 0 some inteira; a coluna 1 (1024..2048) ainda tem uma fresta revelada.
    assert not any(c.startswith("n0/0/") for c in liberados)
    assert "n0/1/0" in liberados


@pytest.mark.parametrize("semente", range(6))
def test_ladrilho_com_ponto_revelado_sempre_sai(semente):
    """A conta por células nunca esconde um ladrilho que tem um ponto revelado de verdade."""
    sorteio = random.Random(semente)
    largura, altura = 5000, 3500
    formas = []
    for indice in range(25):
        operacao = "esconder" if indice % 3 == 2 else "revelar"
        tipo = sorteio.choice(nevoa.TIPOS)
        cx, cy = sorteio.uniform(0, largura), sorteio.uniform(0, altura)
        if tipo == "retangulo":
            dados = {"x": cx, "y": cy, "w": sorteio.uniform(-600, 600), "h": sorteio.uniform(-600, 600)}
        elif tipo == "poligono":
            dados = {"pontos": [[cx + sorteio.uniform(-500, 500), cy + sorteio.uniform(-500, 500)] for _ in range(sorteio.randint(3, 7))]}
        else:
            dados = {"raio": sorteio.uniform(5, 120), "pontos": [[cx + sorteio.uniform(-400, 400), cy + sorteio.uniform(-400, 400)] for _ in range(sorteio.randint(1, 8))]}
        try:
            formas.append(nevoa.normalizar_forma({"op": operacao, "tipo": tipo, **dados}, largura, altura))
        except ErroMapa:
            continue
    liberados = set(nevoa.ladrilhos_liberados(formas, largura, altura, chaves_do_mapa(largura, altura)))
    cobertura = nevoa.Nevoa(formas)
    for _ in range(4000):
        x, y = sorteio.uniform(0, largura - 0.01), sorteio.uniform(0, altura - 0.01)
        if cobertura.revelado(x, y):
            assert f"n0/{int(x // 1024)}/{int(y // 1024)}" in liberados, (x, y)


# ---------------------------------------------------------------- tokens

def _token(**extra):
    base = {"id": "t1", "x": 150.0, "y": 250.0, "porte": 1, "lado": "inimigo", "oculto": False, "barras": {},
            "personagem_id": None, "participante_id": None, "imagem_id": None, "nome": "Lobo"}
    base.update(extra)
    return base


def test_monstro_na_nevoa_some_para_o_jogador_e_personagem_continua_a_vista():
    lobo = _token()
    assert mapa.visao_token(lobo, None, ANA, livre=False, na_nevoa=True) is None
    assert mapa.visao_token(lobo, None, MESTRE, livre=False, na_nevoa=True) is not None
    assert mapa.visao_token(lobo, None, ANA, livre=False, na_nevoa=False) is not None
    colega = _token(id="t2", personagem_id="p-bruno", lado="jogador")
    assert mapa.visao_token(colega, None, ANA, livre=False, na_nevoa=True) is not None
    proprio = _token(id="t3", personagem_id="p-ana", lado="jogador")
    assert mapa.visao_token(proprio, None, ANA, livre=False, na_nevoa=True)["e_meu"]


# ----------------------------------------------------------------- clima

def test_clima_recusa_efeito_desconhecido_e_limita_quantidade_e_area():
    with pytest.raises(ErroMapa):
        mapa.normalizar_clima({"efeitos": [{"tipo": "meteoro"}]}, 2000, 1000)
    with pytest.raises(ErroMapa):
        mapa.normalizar_clima({"efeitos": [{"tipo": "chuva"}] * (mapa.MAX_EFEITOS_CLIMA + 1)}, 2000, 1000)
    with pytest.raises(ErroMapa):
        mapa.normalizar_clima({"efeitos": [{"tipo": "fluxo"}]}, 2000, 1000)
    with pytest.raises(ErroMapa):
        mapa.normalizar_clima({"efeitos": [{"tipo": "neve", "area": {"x": 5000, "y": 0, "w": 100, "h": 100}}]}, 2000, 1000)
    clima = mapa.normalizar_clima({
        "efeitos": [{"tipo": "chuva", "intensidade": 0.7, "area": {"x": 1900, "y": -50, "w": -400, "h": 300}}],
        "vento": {"direcao": -90, "forca": 0.5},
    }, 2000, 1000)
    # Área puxada para trás e passando da borda fica do jeito certo e dentro do mapa.
    assert clima["efeitos"][0]["area"] == {"x": 1500.0, "y": 0.0, "w": 400.0, "h": 250.0}
    assert clima["vento"] == {"direcao": 270.0, "forca": 0.5}
    with pytest.raises(ErroMapa):
        mapa.normalizar_clima({"efeitos": [{"tipo": "chuva", "intensidade": 3}]}, 2000, 1000)


def test_clima_guardado_quebrado_vira_ceu_limpo_e_escuridao_tem_luz():
    assert mapa.ler_clima({"efeitos": "x"}, 1000, 1000)["efeitos"] == []
    assert mapa.ler_clima(None, 1000, 1000)["vento"] == mapa.VENTO_PADRAO
    escuro = mapa.normalizar_clima({"efeitos": [{"tipo": "escuridao"}, {"tipo": "fluxo", "fluxo": "vazio"}]}, 1000, 1000)
    assert escuro["efeitos"][0]["luz"] == mapa.LUZ_PADRAO
    assert escuro["efeitos"][1]["fluxo"] == "vazio"


# ------------------------------------------------------------- tempo real

def _conexao(usuario, gestor=False):
    return tempo_real.Conexao(usuario_id=usuario, nome=usuario.title(), gestor=gestor)


def _mensagens(conexao):
    saida = [json.loads(texto) for texto in conexao.tirar_agora()]
    return [m for m in saida if m["t"] != "presenca"]


def test_arrasto_na_nevoa_so_chega_quando_o_monstro_sai_dela():
    async def cenario():
        tempo_real._limpar_para_testes()
        mestre, ana = _conexao("m", gestor=True), _conexao("ana")
        for c in (mestre, ana):
            tempo_real.entrar("camp", c)
        cobertura = nevoa.Nevoa([nevoa.normalizar_forma({"op": "revelar", "tipo": "retangulo", "x": 500, "y": 0, "w": 500, "h": 1000}, 1000, 1000)])
        regras = tempo_real.Regras(
            cena_id="c1", livre=False, largura=1000, altura=1000, nevoa=cobertura,
            tokens={
                "lobo": tempo_real.RegraToken(quem_ve="todos", donos=frozenset(), movivel_livre=False, some_na_nevoa=True, revelado=False),
                "ana": tempo_real.RegraToken(quem_ve="todos", donos=frozenset({"ana"}), movivel_livre=False, some_na_nevoa=False),
            },
        )

        async def carregar():
            return regras

        gravadas = []

        async def gravar(token_id, x, y):
            gravadas.append((token_id, x, y))
            return True

        await tempo_real.processar("camp", mestre, {"t": "arrastar", "token": "lobo", "x": 100, "y": 100}, carregar, gravar)
        assert _mensagens(ana) == [] and gravadas == []

        # Saiu da névoa: a posição vai para o banco e a Ana recarrega a cena para conhecer o lobo.
        await tempo_real.processar("camp", mestre, {"t": "arrastar", "token": "lobo", "x": 600, "y": 100}, carregar, gravar)
        assert gravadas == [("lobo", 600.0, 100.0)]
        assert [m["t"] for m in _mensagens(ana)] == ["arrastando", "mudou"]

        await tempo_real.processar("camp", mestre, {"t": "arrastar", "token": "lobo", "x": 700, "y": 100}, carregar, gravar)
        assert [m["t"] for m in _mensagens(ana)] == ["arrastando"]

        # Voltou para a névoa: a Ana recebe "sumiu" e mais nenhuma posição.
        await tempo_real.processar("camp", mestre, {"t": "arrastar", "token": "lobo", "x": 200, "y": 100}, carregar, gravar)
        assert _mensagens(ana) == [{"t": "sumiu", "token": "lobo"}]
        await tempo_real.processar("camp", mestre, {"t": "soltar", "token": "lobo", "x": 250, "y": 100}, carregar, gravar)
        assert _mensagens(ana) == []
        assert [m["t"] for m in _mensagens(mestre)] == []

        # O personagem da Ana anda na névoa à vista de todos.
        await tempo_real.processar("camp", ana, {"t": "arrastar", "token": "ana", "x": 50, "y": 50}, carregar, gravar)
        assert [m["t"] for m in _mensagens(mestre)] == ["arrastando"]

    asyncio.run(cenario())
