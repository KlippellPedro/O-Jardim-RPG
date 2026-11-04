"""Visão pelas paredes (core/visao.py): o que cada fonte enxerga, sem passar por parede.

Cobre a regra (parede, porta fechada, janela, porta aberta, névoa manual, luz com alcance), compara o
cálculo por leque com o gabarito de um raio por célula e trava o tempo: a primeira versão levava de
18 a 90 segundos num mapa comum e prenderia o servidor da mesa.
"""

from __future__ import annotations

import math
import random
import time

from core import nevoa, visao


def sala(x: float, y: float, w: float, h: float) -> list[list[float]]:
    return [[x, y, x + w, y], [x + w, y, x + w, y + h], [x + w, y + h, x, y + h], [x, y + h, x, y]]


def centro(indice: int, colunas: int, celula: int) -> tuple[float, float]:
    return ((indice % colunas) + 0.5) * celula, ((indice // colunas) + 0.5) * celula


def visiveis(largura, altura, fontes, barram=(), vaos=(), cobertura=None):
    celula, colunas, linhas, celulas = visao.calcular_celulas_visiveis(
        largura, altura, fontes, list(barram), list(vaos), cobertura,
    )
    return celula, colunas, linhas, celulas


def gabarito(largura, altura, fontes, barram, vaos):
    """A regra original, um raio por célula (lento, serve só para conferir o leque)."""
    celula = nevoa.tamanho_da_celula(largura, altura)
    colunas = max(1, math.ceil(largura / celula))
    linhas = max(1, math.ceil(altura / celula))
    indice = visao.IndiceParedes(largura, altura, celula, barram, vaos)
    saida = set()
    for sx, sy, raio_fonte in fontes:
        raio = math.hypot(largura, altura) if raio_fonte is None else raio_fonte
        for linha in range(linhas):
            cy = min(altura, (linha + 0.5) * celula)
            for coluna in range(colunas):
                cx = min(largura, (coluna + 0.5) * celula)
                if (cx - sx) ** 2 + (cy - sy) ** 2 > raio * raio:
                    continue
                if indice.bloqueada(sx, sy, cx, cy):
                    continue
                saida.add(linha * colunas + coluna)
    return saida


def test_campo_aberto_ve_o_mapa_inteiro_e_o_alcance_limita():
    celula, colunas, linhas, tudo = visiveis(1600, 1200, [(800, 600, None)])
    assert len(tudo) == colunas * linhas
    _, _, _, perto = visiveis(1600, 1200, [(800, 600, 200)])
    assert 0 < len(perto) < len(tudo)
    for indice in perto:
        x, y = centro(indice, colunas, celula)
        assert math.hypot(x - 800, y - 600) <= 200 + 1e-6
    assert visiveis(1600, 1200, [(800, 600, None)], cobertura=None)[3] == tudo


def test_sala_fechada_nao_deixa_ver_o_lado_de_fora():
    paredes = sala(400, 300, 400, 300)
    celula, colunas, _, vistas = visiveis(1600, 1200, [(600, 450, None)], paredes)
    assert vistas
    for indice in vistas:
        x, y = centro(indice, colunas, celula)
        assert 400 - celula <= x <= 800 + celula and 300 - celula <= y <= 600 + celula, (x, y)
    # Dentro da sala tudo aparece: o centro dela e a quina de cima, longe da fonte.
    for x, y in ((600, 450), (450, 350), (750, 550)):
        assert int(y // celula) * colunas + int(x // celula) in vistas, (x, y)


def dentro_do_cone(x, y, origem, abertura, folga):
    """O ponto (x, y) além da parede está na linha que sai de `origem` e passa pela abertura?"""
    ox, oy = origem
    ax, ay, bx, by = abertura  # abertura horizontal, na altura ay
    if y <= ay:
        return True
    cruza = ox + (x - ox) * (ay - oy) / (y - oy)
    return min(ax, bx) - folga <= cruza <= max(ax, bx) + folga


def test_porta_fechada_barra_e_porta_aberta_deixa_passar():
    paredes = sala(400, 300, 400, 300)
    # A porta é um trecho da parede de baixo: fechada, ela é parede; aberta, é um vão.
    porta = [560.0, 600.0, 640.0, 600.0]
    celula, colunas, _, fechada = visiveis(1600, 1200, [(600, 450, None)], paredes + [porta])
    for indice in fechada:
        _, y = centro(indice, colunas, celula)
        assert y <= 600 + celula
    _, _, _, aberta = visiveis(1600, 1200, [(600, 450, None)], paredes + [porta], vaos=[porta])
    fora = [i for i in aberta if centro(i, colunas, celula)[1] > 600 + 2 * celula]
    assert fora, "a porta aberta precisa deixar ver o que está além dela"
    for indice in fora:
        x, y = centro(indice, colunas, celula)
        assert dentro_do_cone(x, y, (600, 450), porta, 2 * celula), (x, y)


def test_janela_deixa_ver_o_cone_e_a_parede_ao_lado_continua_barrando():
    paredes = sala(400, 300, 400, 300)
    janela = [560.0, 600.0, 640.0, 600.0]
    # A janela entra como parede que também é vão (é assim que o router a monta).
    celula, colunas, _, vistas = visiveis(1600, 1200, [(600, 450, None)], paredes + [janela], vaos=[janela])
    alem = [i for i in vistas if centro(i, colunas, celula)[1] > 600 + 2 * celula]
    assert alem
    for indice in alem:
        x, y = centro(indice, colunas, celula)
        assert dentro_do_cone(x, y, (600, 450), janela, 2 * celula), (x, y)
    # Quem está ao lado da janela, fora do cone, continua escondido atrás da parede.
    escondida = (420, 700)
    assert int(escondida[1] // celula) * colunas + int(escondida[0] // celula) not in vistas


def test_nevoa_manual_continua_limitando_a_visao():
    cobertura = nevoa.Nevoa([{"op": "revelar", "tipo": "retangulo", "x": 0, "y": 0, "w": 800, "h": 1200}])
    celula, colunas, _, vistas = visiveis(1600, 1200, [(400, 600, None)], cobertura=cobertura)
    assert vistas
    for indice in vistas:
        assert centro(indice, colunas, celula)[0] <= 800


def test_fonte_fora_do_mapa_ou_sem_alcance_nao_ve_nada():
    assert visiveis(1600, 1200, [(-5, 10, None)])[3] == set()
    assert visiveis(1600, 1200, [(2000, 10, None)])[3] == set()
    assert visiveis(1600, 1200, [])[3] == set()
    assert visiveis(1600, 1200, [(800, 600, 0)])[3] == set()


def test_alcance_do_raio_ate_a_primeira_parede():
    indice = visao.IndiceParedes(1600, 1200, 16, [[600.0, 0.0, 600.0, 1200.0]], [])
    assert math.isclose(indice.alcance(400, 600, 1.0, 0.0, 2000), 200.0, abs_tol=1e-6)
    assert indice.alcance(400, 600, -1.0, 0.0, 2000) == math.inf
    assert indice.alcance(400, 600, 1.0, 0.0, 100) == math.inf, "parede além do limite não conta"
    # Atravessar a parede por um vão aberto.
    com_vao = visao.IndiceParedes(1600, 1200, 16, [[600.0, 0.0, 600.0, 1200.0]], [[600.0, 580.0, 600.0, 620.0]])
    assert com_vao.alcance(400, 600, 1.0, 0.0, 2000) == math.inf
    assert math.isclose(com_vao.alcance(400, 500, 1.0, 0.0, 2000), 200.0, abs_tol=1e-6)


def test_leque_confere_com_o_raio_por_celula_sem_vazar_nem_perder_muito():
    sorteio = random.Random(11)
    vistos = vazou = perdeu = 0
    for _ in range(8):
        largura, altura, casa = sorteio.choice([(1400, 1000, 70), (1600, 1200, 100)])
        barram, vaos = [], []
        for _ in range(sorteio.randint(2, 7)):
            x = sorteio.randrange(0, largura - 6 * casa, casa)
            y = sorteio.randrange(0, altura - 5 * casa, casa)
            for lado in sala(x, y, sorteio.randrange(2, 6) * casa, sorteio.randrange(2, 5) * casa):
                barram.append(lado)
                if sorteio.random() < 0.25:  # porta aberta ou janela: um vão de uma casa no meio do lado
                    ax, ay, bx, by = lado
                    mx, my = (ax + bx) / 2, (ay + by) / 2
                    horizontal = ay == by
                    vaos.append([mx - casa / 2 if horizontal else mx, my if horizontal else my - casa / 2,
                                 mx + casa / 2 if horizontal else mx, my if horizontal else my + casa / 2])
        fontes = [
            (sorteio.uniform(0, largura), sorteio.uniform(0, altura), sorteio.choice([None, None, 6 * casa, 12 * casa]))
            for _ in range(sorteio.randint(1, 3))
        ]
        esperado = gabarito(largura, altura, fontes, barram, vaos)
        _, _, _, calculado = visiveis(largura, altura, fontes, barram, vaos)
        vistos += len(calculado)
        vazou += len(calculado - esperado)
        perdeu += len(esperado - calculado)
    assert vistos > 1000
    # Entre dois raios do leque vale o mais curto, então o erro é para o lado seguro: o que
    # sobra é uma célula na quina de uma sombra, nunca uma sala inteira.
    assert vazou / vistos < 0.002, (vazou, vistos)
    assert perdeu / vistos < 0.02, (perdeu, vistos)


def test_mapa_grande_com_muitas_paredes_responde_em_tempo_de_mesa():
    sorteio = random.Random(7)
    largura, altura, casa = 4000, 3000, 70
    barram = []
    for _ in range(40):
        x = sorteio.randrange(0, largura - 8 * casa, casa)
        y = sorteio.randrange(0, altura - 6 * casa, casa)
        barram += sala(x, y, sorteio.randrange(3, 8) * casa, sorteio.randrange(3, 6) * casa)
    fontes = [(sorteio.uniform(0, largura), sorteio.uniform(0, altura), None) for _ in range(6)]
    inicio = time.perf_counter()
    _, _, _, calculado = visiveis(largura, altura, fontes, barram)
    gasto = time.perf_counter() - inicio
    assert calculado
    # Antes: cerca de 90 s. Medido agora: perto de 0,25 s; a folga cobre uma máquina lenta.
    assert gasto < 4.0, f"visão de 6 fontes levou {gasto:.1f}s"
