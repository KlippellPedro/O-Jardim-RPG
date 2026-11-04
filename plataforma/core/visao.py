"""Visão do jogador na mesa: linha de visão, paredes e memória por pessoa.

Este módulo trabalha só com geometria e grades. Persistência e recorte de dados
ficam no router do mapa; paredes, portas secretas e células não são enviadas ao
jogador.
"""

from __future__ import annotations

import math
from dataclasses import dataclass

from core import nevoa, paredes

MAX_CANDIDATOS_POR_RAIO = 4096


@dataclass
class GradeVisao:
    largura: int
    altura: int
    celula: int
    colunas: int
    linhas: int
    visiveis: set[int]
    exploradas: set[int]

    def contem(self, celulas: set[int], x: float, y: float) -> bool:
        if not math.isfinite(x) or not math.isfinite(y) or x < 0 or y < 0 or x > self.largura or y > self.altura:
            return False
        coluna = min(self.colunas - 1, int(x // self.celula))
        linha = min(self.linhas - 1, int(y // self.celula))
        return linha * self.colunas + coluna in celulas


def _celulas_do_segmento(ax: float, ay: float, bx: float, by: float, celula: int, colunas: int, linhas: int) -> set[int]:
    """Células tocadas por um segmento, incluindo as vizinhas quando passa num canto."""
    dx, dy = bx - ax, by - ay
    coluna, linha = math.floor(ax / celula), math.floor(ay / celula)
    fim_coluna, fim_linha = math.floor(bx / celula), math.floor(by / celula)
    passo_x = 1 if dx > 0 else -1
    passo_y = 1 if dy > 0 else -1
    t_max_x = ((coluna + (passo_x > 0)) * celula - ax) / dx if dx else math.inf
    t_max_y = ((linha + (passo_y > 0)) * celula - ay) / dy if dy else math.inf
    t_delta_x = abs(celula / dx) if dx else math.inf
    t_delta_y = abs(celula / dy) if dy else math.inf
    tocadas: set[tuple[int, int]] = {(coluna, linha)}
    limite = abs(fim_coluna - coluna) + abs(fim_linha - linha) + 2
    while (coluna, linha) != (fim_coluna, fim_linha) and limite > 0:
        limite -= 1
        if t_max_x < t_max_y:
            coluna += passo_x
            t_max_x += t_delta_x
        elif t_max_y < t_max_x:
            linha += passo_y
            t_max_y += t_delta_y
        else:
            tocadas.add((coluna + passo_x, linha))
            tocadas.add((coluna, linha + passo_y))
            coluna += passo_x
            linha += passo_y
            t_max_x += t_delta_x
            t_max_y += t_delta_y
        tocadas.add((coluna, linha))

    saida = set()
    for x, y in tocadas:
        # Parede e raio com borda na mesma célula também são candidatos. A
        # interseção exata abaixo descarta vizinhos que não cruzam o segmento.
        for dy_vizinho in (-1, 0, 1):
            for dx_vizinho in (-1, 0, 1):
                coluna_vizinha, linha_vizinha = x + dx_vizinho, y + dy_vizinho
                if 0 <= coluna_vizinha < colunas and 0 <= linha_vizinha < linhas:
                    saida.add(linha_vizinha * colunas + coluna_vizinha)
    return saida


class IndiceParedes:
    """Índice espacial: cada raio confere só paredes perto do seu percurso."""

    def __init__(self, largura: int, altura: int, celula: int, barram, vaos):
        self.celula = celula
        self.colunas = max(1, math.ceil(largura / celula))
        self.linhas = max(1, math.ceil(altura / celula))
        self.barram = list(barram)
        self.vaos = list(vaos)
        self.paredes_por_celula: dict[int, set[int]] = {}
        self.vaos_por_celula: dict[int, set[int]] = {}
        for indice, trecho in enumerate(self.barram):
            self._indexar(self.paredes_por_celula, indice, trecho)
        for indice, trecho in enumerate(self.vaos):
            self._indexar(self.vaos_por_celula, indice, trecho)

    def _indexar(self, indice: dict[int, set[int]], id_trecho: int, trecho) -> None:
        ax, ay, bx, by = trecho
        for celula in _celulas_do_segmento(ax, ay, bx, by, self.celula, self.colunas, self.linhas):
            indice.setdefault(celula, set()).add(id_trecho)

    def bloqueada(self, x0: float, y0: float, x1: float, y1: float) -> bool:
        if not self.barram:
            return False
        dx, dy = x1 - x0, y1 - y0
        if math.hypot(dx, dy) < 1e-6:
            return False
        celulas_raio = _celulas_do_segmento(x0, y0, x1, y1, self.celula, self.colunas, self.linhas)
        candidatos: set[int] = set()
        for celula in celulas_raio:
            candidatos.update(self.paredes_por_celula.get(celula, ()))
        # Um mapa patológico não faz cada consulta varrer milhões de pares; na
        # dúvida, esta linha de visão fica fechada.
        if len(candidatos) > MAX_CANDIDATOS_POR_RAIO:
            return True
        for id_parede in candidatos:
            trecho = self.barram[id_parede]
            cruzamento = paredes._cruzamento(x0, y0, dx, dy, trecho)
            if cruzamento is None:
                continue
            px, py = x0 + dx * cruzamento, y0 + dy * cruzamento
            celula_cruzada = _celulas_do_segmento(px, py, px, py, self.celula, self.colunas, self.linhas)
            id_vaos = set()
            for celula in celula_cruzada:
                id_vaos.update(self.vaos_por_celula.get(celula, ()))
            if any(paredes._no_trecho(px, py, self.vaos[id_vao]) for id_vao in id_vaos):
                continue
            return True
        return False


def calcular_celulas_visiveis(
    largura: int,
    altura: int,
    fontes: list[tuple[float, float, float | None]],
    barram,
    vaos,
    cobertura: nevoa.Nevoa | None = None,
    indice_paredes: IndiceParedes | None = None,
) -> tuple[int, int, int, set[int]]:
    """Calcula células cujo centro é alcançado por uma fonte sem cruzar parede.

    `raio=None` significa visão ambiente até o limite do mapa. Um raio numérico
    limita a fonte (luzes carregadas pelos tokens usam casas da grade).
    """
    celula = nevoa.tamanho_da_celula(largura, altura)
    colunas = max(1, math.ceil(largura / celula))
    linhas = max(1, math.ceil(altura / celula))
    visiveis: set[int] = set()
    if not fontes:
        return celula, colunas, linhas, visiveis
    indice_paredes = indice_paredes or IndiceParedes(largura, altura, celula, barram, vaos)

    raio_mapa = math.hypot(largura, altura)
    for sx, sy, raio_fonte in fontes:
        if not math.isfinite(sx) or not math.isfinite(sy) or sx < 0 or sy < 0 or sx > largura or sy > altura:
            continue
        raio = raio_mapa if raio_fonte is None else max(0.0, min(raio_mapa, raio_fonte))
        raio2 = raio * raio
        primeira_coluna = max(0, math.floor((sx - raio) / celula))
        ultima_coluna = min(colunas - 1, math.floor((sx + raio) / celula))
        primeira_linha = max(0, math.floor((sy - raio) / celula))
        ultima_linha = min(linhas - 1, math.floor((sy + raio) / celula))
        for linha in range(primeira_linha, ultima_linha + 1):
            cy = min(altura, (linha + 0.5) * celula)
            dy2 = (cy - sy) ** 2
            for coluna in range(primeira_coluna, ultima_coluna + 1):
                cx = min(largura, (coluna + 0.5) * celula)
                if (cx - sx) ** 2 + dy2 > raio2:
                    continue
                if cobertura is not None and not cobertura.revelado(cx, cy):
                    continue
                if indice_paredes.bloqueada(sx, sy, cx, cy):
                    continue
                visiveis.add(linha * colunas + coluna)
    return celula, colunas, linhas, visiveis


def combinar(
    largura: int,
    altura: int,
    celula: int,
    colunas: int,
    linhas: int,
    visiveis: set[int],
    exploradas_antes,
) -> GradeVisao:
    """Une a visão atual com a memória, descartando dados de grade incompatível."""
    maximo = colunas * linhas
    anteriores = {
        item for item in (exploradas_antes or [])
        if isinstance(item, int) and not isinstance(item, bool) and 0 <= item < maximo
    }
    atual = {item for item in visiveis if 0 <= item < maximo}
    return GradeVisao(largura, altura, celula, colunas, linhas, atual, anteriores | atual)


def formas(grade: GradeVisao, celulas: set[int]) -> list[dict]:
    """Compacta células marcadas em retângulos contíguos para a máscara do mapa."""
    retangulos_ativos: dict[tuple[int, int], int] = {}
    retangulos: list[tuple[int, int, int, int]] = []
    for linha in range(grade.linhas):
        runs: set[tuple[int, int]] = set()
        coluna = 0
        base = linha * grade.colunas
        while coluna < grade.colunas:
            if base + coluna not in celulas:
                coluna += 1
                continue
            inicio = coluna
            while coluna < grade.colunas and base + coluna in celulas:
                coluna += 1
            runs.add((inicio, coluna))
        for chave, inicio_linha in list(retangulos_ativos.items()):
            if chave not in runs:
                retangulos.append((chave[0], inicio_linha, chave[1], linha))
                del retangulos_ativos[chave]
        for chave in runs:
            retangulos_ativos.setdefault(chave, linha)
    for (inicio, fim), inicio_linha in retangulos_ativos.items():
        retangulos.append((inicio, inicio_linha, fim, grade.linhas))

    saida = []
    for x0, y0, x1, y1 in retangulos:
        px = x0 * grade.celula
        py = y0 * grade.celula
        fim_x = min(grade.largura, x1 * grade.celula)
        fim_y = min(grade.altura, y1 * grade.celula)
        if fim_x > px and fim_y > py:
            saida.append({"op": "revelar", "tipo": "retangulo", "x": px, "y": py, "w": fim_x - px, "h": fim_y - py})
    return saida


def indice_da_posicao(grade: GradeVisao, x: float, y: float) -> int | None:
    if not math.isfinite(x) or not math.isfinite(y) or x < 0 or y < 0 or x > grade.largura or y > grade.altura:
        return None
    coluna = min(grade.colunas - 1, int(x // grade.celula))
    linha = min(grade.linhas - 1, int(y // grade.celula))
    return linha * grade.colunas + coluna


def retangulo_totalmente_visivel(grade: GradeVisao, celulas: set[int], retangulo) -> bool:
    """Só entrega um efeito retangular se todas as células que ele ocupa estão à vista."""
    if not isinstance(retangulo, (list, tuple)) or len(retangulo) != 4:
        return False
    if any(isinstance(v, bool) or not isinstance(v, (int, float)) or not math.isfinite(v) for v in retangulo):
        return False
    x, y, largura, altura = map(float, retangulo)
    x0 = max(0.0, min(x, x + largura))
    x1 = min(float(grade.largura), max(x, x + largura))
    y0 = max(0.0, min(y, y + altura))
    y1 = min(float(grade.altura), max(y, y + altura))
    if x1 <= x0 or y1 <= y0:
        return False
    primeira_coluna = max(0, math.floor(x0 / grade.celula))
    ultima_coluna = min(grade.colunas - 1, math.ceil(x1 / grade.celula) - 1)
    primeira_linha = max(0, math.floor(y0 / grade.celula))
    ultima_linha = min(grade.linhas - 1, math.ceil(y1 / grade.celula) - 1)
    return all(
        linha * grade.colunas + coluna in celulas
        for linha in range(primeira_linha, ultima_linha + 1)
        for coluna in range(primeira_coluna, ultima_coluna + 1)
    )
