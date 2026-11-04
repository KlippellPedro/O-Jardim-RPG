"""Névoa de guerra: o que o Mestre revelou e o que isso libera para o jogador.

A névoa é uma lista de formas aplicadas em ordem sobre um mapa todo coberto.
Cada forma revela ou esconde; um ponto está à vista quando a última forma que o
contém revela. Isso decide, aqui num lugar só:

- se um token está à vista do jogador (`Nevoa.revelado`, conta exata);
- que ladrilhos do mapa o jogador pode baixar (`ladrilhos_liberados`). É o
  segredo de verdade: pedaço do mapa que não toca área revelada nunca sai do
  servidor. A conta passa por uma grade de células e é generosa para o lado da
  imagem, nunca para o lado do segredo: célula tocada por uma forma que revela
  conta como revelada, e só célula inteira dentro de uma forma que esconde volta
  a ser escondida. Fica exposta no máximo a borda de um ladrilho em volta do que
  foi revelado, e na tela ela continua coberta.

Como `core/mapa.py`, este módulo não conhece banco nem HTTP.
"""

from __future__ import annotations

import math

from core.mapa import ErroMapa

OPERACOES = ("revelar", "esconder")
TIPOS = ("retangulo", "poligono", "pincel")
MAX_FORMAS = 400
MAX_PONTOS_FORMA = 600
MAX_PONTOS_TOTAL = 30000
RAIO_MINIMO = 4.0
RAIO_MAXIMO = 4000.0
#: Uma forma pode passar um pouco da borda do mapa (o pincel no canto, por exemplo).
FOLGA_BORDA = 4000.0
LADO_LADRILHO = 1024
#: Células da conta dos ladrilhos: o menor tamanho que deixa a grade com até 256 por lado.
#: Todos dividem 1024, então cada célula cai inteira dentro de um ladrilho.
CELULAS = (16, 32, 64, 128, 256)
CELULAS_POR_LADO = 256


# ------------------------------------------------------------- validação

def _coordenada(valor, campo: str, limite: float) -> float:
    if isinstance(valor, bool) or not isinstance(valor, (int, float)) or not math.isfinite(valor):
        raise ErroMapa(f"{campo} precisa ser um numero")
    return round(max(-FOLGA_BORDA, min(limite + FOLGA_BORDA, float(valor))), 1)


def _pontos(valor, largura: int, altura: int, minimo: int) -> list[list[float]]:
    if not isinstance(valor, list) or not minimo <= len(valor) <= MAX_PONTOS_FORMA:
        raise ErroMapa(f"a forma precisa de {minimo} a {MAX_PONTOS_FORMA} pontos")
    saida = []
    for ponto in valor:
        if not isinstance(ponto, (list, tuple)) or len(ponto) != 2:
            raise ErroMapa("ponto invalido na forma")
        saida.append([_coordenada(ponto[0], "x", largura), _coordenada(ponto[1], "y", altura)])
    return saida


def normalizar_forma(dados, largura: int, altura: int) -> dict:
    """Confere uma forma que o Mestre desenhou e devolve só os campos que valem."""
    if not isinstance(dados, dict):
        raise ErroMapa("forma invalida")
    operacao = dados.get("op")
    if operacao not in OPERACOES:
        raise ErroMapa("a forma revela ou esconde")
    tipo = dados.get("tipo")
    if tipo == "retangulo":
        x = _coordenada(dados.get("x"), "x", largura)
        y = _coordenada(dados.get("y"), "y", altura)
        w = _coordenada(dados.get("w"), "largura", largura)
        h = _coordenada(dados.get("h"), "altura", altura)
        # Retângulo puxado para trás (largura negativa) vira o mesmo retângulo do jeito certo.
        x0, x1 = sorted((x, x + w))
        y0, y1 = sorted((y, y + h))
        if x1 - x0 < 1 or y1 - y0 < 1:
            raise ErroMapa("retangulo pequeno demais")
        return {"op": operacao, "tipo": tipo, "x": x0, "y": y0, "w": round(x1 - x0, 1), "h": round(y1 - y0, 1)}
    if tipo == "poligono":
        return {"op": operacao, "tipo": tipo, "pontos": _pontos(dados.get("pontos"), largura, altura, 3)}
    if tipo == "pincel":
        raio = dados.get("raio")
        if isinstance(raio, bool) or not isinstance(raio, (int, float)) or not RAIO_MINIMO <= raio <= RAIO_MAXIMO:
            raise ErroMapa(f"o pincel vai de {RAIO_MINIMO:g} a {RAIO_MAXIMO:g} de raio")
        return {"op": operacao, "tipo": tipo, "raio": round(float(raio), 1), "pontos": _pontos(dados.get("pontos"), largura, altura, 1)}
    raise ErroMapa("a forma e retangulo, poligono ou pincel")


def pontos_de(forma: dict) -> int:
    return len(forma.get("pontos") or ()) or 2


def caber(formas: list[dict]) -> None:
    """A névoa tem teto para o mapa continuar leve para todos."""
    if len(formas) > MAX_FORMAS:
        raise ErroMapa(f"a nevoa passou de {MAX_FORMAS} formas: cubra tudo e revele de novo em pedacos maiores", 409)
    if sum(pontos_de(f) for f in formas) > MAX_PONTOS_TOTAL:
        raise ErroMapa("a nevoa tem pontos demais: cubra tudo e revele de novo em pedacos maiores", 409)


def ler(dados) -> dict:
    """A névoa guardada na cena e o modo opcional de visão pelos tokens."""
    dados = dados if isinstance(dados, dict) else {}
    formas = dados.get("formas")
    return {
        "ligada": bool(dados.get("ligada")),
        "formas": formas if isinstance(formas, list) else [],
        "visao_pelas_paredes": bool(dados.get("visao_pelas_paredes")),
    }


# --------------------------------------------------------------- geometria

def caixa(forma: dict) -> tuple[float, float, float, float]:
    if forma["tipo"] == "retangulo":
        return forma["x"], forma["y"], forma["x"] + forma["w"], forma["y"] + forma["h"]
    xs = [p[0] for p in forma["pontos"]]
    ys = [p[1] for p in forma["pontos"]]
    folga = forma.get("raio", 0.0)
    return min(xs) - folga, min(ys) - folga, max(xs) + folga, max(ys) + folga


def _dentro_do_poligono(pontos: list[list[float]], x: float, y: float) -> bool:
    """Par ou ímpar: o polígono do Mestre pode se cruzar, e assim a regra é a mesma da tela."""
    dentro = False
    j = len(pontos) - 1
    for i in range(len(pontos)):
        xi, yi = pontos[i]
        xj, yj = pontos[j]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
            dentro = not dentro
        j = i
    return dentro


def _distancia2_ao_segmento(px: float, py: float, ax: float, ay: float, bx: float, by: float) -> float:
    dx, dy = bx - ax, by - ay
    comprimento2 = dx * dx + dy * dy
    if comprimento2 == 0:
        return (px - ax) ** 2 + (py - ay) ** 2
    t = max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / comprimento2))
    qx, qy = ax + t * dx - px, ay + t * dy - py
    return qx * qx + qy * qy


def _segmentos(pontos: list[list[float]]):
    if len(pontos) == 1:
        yield pontos[0], pontos[0]
        return
    for i in range(len(pontos) - 1):
        yield pontos[i], pontos[i + 1]


def contem(forma: dict, x: float, y: float) -> bool:
    tipo = forma["tipo"]
    if tipo == "retangulo":
        return forma["x"] <= x <= forma["x"] + forma["w"] and forma["y"] <= y <= forma["y"] + forma["h"]
    if tipo == "poligono":
        return _dentro_do_poligono(forma["pontos"], x, y)
    raio2 = forma["raio"] ** 2
    return any(_distancia2_ao_segmento(x, y, a[0], a[1], b[0], b[1]) <= raio2 for a, b in _segmentos(forma["pontos"]))


class Nevoa:
    """As formas de uma cena com as caixas já calculadas, para perguntar ponto a ponto."""

    def __init__(self, formas: list[dict]):
        self.formas = formas
        self.caixas = [caixa(f) for f in formas]

    def revelado(self, x: float, y: float) -> bool:
        for indice in range(len(self.formas) - 1, -1, -1):
            x0, y0, x1, y1 = self.caixas[indice]
            if x < x0 or x > x1 or y < y0 or y > y1:
                continue
            forma = self.formas[indice]
            if contem(forma, x, y):
                return forma["op"] == "revelar"
        return False


# ----------------------------------------------------------- ladrilhos

def tamanho_da_celula(largura: int, altura: int) -> int:
    maior = max(largura, altura, 1)
    for celula in CELULAS:
        if maior / celula <= CELULAS_POR_LADO:
            return celula
    return CELULAS[-1]


class _Grade:
    def __init__(self, largura: int, altura: int):
        self.largura = largura
        self.altura = altura
        self.celula = tamanho_da_celula(largura, altura)
        self.colunas = max(1, math.ceil(largura / self.celula))
        self.linhas = max(1, math.ceil(altura / self.celula))
        self.marcas = bytearray(self.colunas * self.linhas)

    def faixa(self, inicio: float, fim: float, total: int) -> range:
        c = self.celula
        return range(max(0, math.floor(inicio / c)), min(total, math.floor(fim / c) + 1))

    def marcar(self, coluna: int, linha: int, valor: int) -> None:
        if 0 <= coluna < self.colunas and 0 <= linha < self.linhas:
            self.marcas[linha * self.colunas + coluna] = valor


def _celulas_da_borda(grade: _Grade, pontos: list[list[float]]) -> set[tuple[int, int]]:
    """Células que alguma aresta do polígono atravessa (percurso de grade, sem pular canto)."""
    c = grade.celula
    tocadas: set[tuple[int, int]] = set()
    for i in range(len(pontos)):
        ax, ay = pontos[i]
        bx, by = pontos[(i + 1) % len(pontos)]
        coluna, linha = math.floor(ax / c), math.floor(ay / c)
        fim_coluna, fim_linha = math.floor(bx / c), math.floor(by / c)
        dx, dy = bx - ax, by - ay
        passo_x = 1 if dx > 0 else -1
        passo_y = 1 if dy > 0 else -1
        t_max_x = ((coluna + (passo_x > 0)) * c - ax) / dx if dx else math.inf
        t_max_y = ((linha + (passo_y > 0)) * c - ay) / dy if dy else math.inf
        t_delta_x = abs(c / dx) if dx else math.inf
        t_delta_y = abs(c / dy) if dy else math.inf
        tocadas.add((coluna, linha))
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
                # Passa bem no canto: as duas vizinhas contam, para não pular nada.
                tocadas.add((coluna + passo_x, linha))
                tocadas.add((coluna, linha + passo_y))
                coluna += passo_x
                linha += passo_y
                t_max_x += t_delta_x
                t_max_y += t_delta_y
            tocadas.add((coluna, linha))
    return tocadas


def _aplicar_retangulo(grade: _Grade, forma: dict, valor: int) -> None:
    c = grade.celula
    x0, y0, x1, y1 = caixa(forma)
    if valor:
        colunas = grade.faixa(x0, x1 - 1e-9, grade.colunas)
        linhas = grade.faixa(y0, y1 - 1e-9, grade.linhas)
    else:
        # A última célula passa da borda do mapa: chegar até a borda já a cobre inteira.
        fim_x = grade.colunas if x1 >= grade.largura else math.floor(x1 / c)
        fim_y = grade.linhas if y1 >= grade.altura else math.floor(y1 / c)
        colunas = range(max(0, math.ceil(x0 / c)), min(grade.colunas, fim_x))
        linhas = range(max(0, math.ceil(y0 / c)), min(grade.linhas, fim_y))
    for linha in linhas:
        inicio = linha * grade.colunas
        for coluna in colunas:
            grade.marcas[inicio + coluna] = valor


def _aplicar_poligono(grade: _Grade, forma: dict, valor: int) -> None:
    pontos = forma["pontos"]
    c = grade.celula
    borda = _celulas_da_borda(grade, pontos)
    x0, y0, x1, y1 = caixa(forma)
    for linha in grade.faixa(y0, y1, grade.linhas):
        centro_y = (linha + 0.5) * c
        # Cruzamentos da linha do meio da faixa com as arestas: entre pares, o centro está dentro.
        cruzamentos = []
        j = len(pontos) - 1
        for i in range(len(pontos)):
            xi, yi = pontos[i]
            xj, yj = pontos[j]
            if (yi > centro_y) != (yj > centro_y):
                cruzamentos.append((xj - xi) * (centro_y - yi) / (yj - yi) + xi)
            j = i
        cruzamentos.sort()
        for k in range(0, len(cruzamentos) - 1, 2):
            primeira = max(0, math.ceil(cruzamentos[k] / c - 0.5))
            ultima = min(grade.colunas - 1, math.floor(cruzamentos[k + 1] / c - 0.5))
            for coluna in range(primeira, ultima + 1):
                # Célula com o centro dentro e sem aresta passando está inteira dentro.
                if valor or (coluna, linha) not in borda:
                    grade.marcar(coluna, linha, valor)
    if valor:
        for coluna, linha in borda:
            grade.marcar(coluna, linha, 1)


def _aplicar_pincel(grade: _Grade, forma: dict, valor: int) -> None:
    c = grade.celula
    meia_diagonal = c * math.sqrt(2) / 2
    # Revelar pega toda célula que o traço toca; esconder, só a que ele cobre inteira.
    alcance = forma["raio"] + meia_diagonal if valor else forma["raio"] - meia_diagonal
    if alcance <= 0:
        return
    alcance2 = alcance * alcance
    marcas = grade.marcas
    colunas_total = grade.colunas
    for (ax, ay), (bx, by) in _segmentos(forma["pontos"]):
        colunas = grade.faixa(min(ax, bx) - alcance, max(ax, bx) + alcance, grade.colunas)
        for linha in grade.faixa(min(ay, by) - alcance, max(ay, by) + alcance, grade.linhas):
            centro_y = (linha + 0.5) * c
            inicio = linha * colunas_total
            for coluna in colunas:
                if marcas[inicio + coluna] == valor:
                    continue
                if _distancia2_ao_segmento((coluna + 0.5) * c, centro_y, ax, ay, bx, by) <= alcance2:
                    marcas[inicio + coluna] = valor


def celulas_reveladas(formas: list[dict], largura: int, altura: int) -> _Grade:
    grade = _Grade(largura, altura)
    for forma in formas:
        valor = 1 if forma["op"] == "revelar" else 0
        if forma["tipo"] == "retangulo":
            _aplicar_retangulo(grade, forma, valor)
        elif forma["tipo"] == "poligono":
            _aplicar_poligono(grade, forma, valor)
        else:
            _aplicar_pincel(grade, forma, valor)
    return grade


def ladrilhos_liberados(formas: list[dict], largura: int, altura: int, chaves: list[str]) -> list[str]:
    """Pedaços do mapa que o jogador pode baixar com a névoa ligada.

    Ladrilho cheio (`n0`) que toca célula revelada. O da versão em 1/4 (`n2`)
    cobre 4 x 4 ladrilhos cheios e só sai quando todos eles saem: assim ele não
    entrega, mesmo borrado, um pedaço que o ladrilho cheio esconderia. A
    miniatura nunca sai.
    """
    grade = celulas_reveladas(formas, largura, altura)
    por_ladrilho = LADO_LADRILHO // grade.celula
    tocados: set[tuple[int, int]] = set()
    for linha in range(grade.linhas):
        inicio = linha * grade.colunas
        for coluna in range(grade.colunas):
            if grade.marcas[inicio + coluna]:
                tocados.add((coluna // por_ladrilho, linha // por_ladrilho))
    cheios = {chave for chave in chaves if chave.startswith("n0/")}
    liberados = []
    for chave in chaves:
        nivel, *resto = chave.split("/")
        if nivel == "n0":
            coluna, linha = map(int, resto)
            if (coluna, linha) in tocados:
                liberados.append(chave)
        elif nivel == "n2":
            coluna, linha = map(int, resto)
            filhos = [f"n0/{coluna * 4 + dx}/{linha * 4 + dy}" for dx in range(4) for dy in range(4)]
            existentes = [f for f in filhos if f in cheios]
            if existentes and all(tuple(map(int, f.split("/")[1:])) in tocados for f in existentes):
                liberados.append(chave)
    return sorted(liberados)
