"""Paredes vivas na mesa (docs/propostas/mapa-ao-vivo/CONSTRUTOR_E_EXTENSOES.md, leva 4).

O mapa montado no construtor guarda na cena, em px, as paredes (`estrutura.paredes`, trechos
retos) e as aberturas (`estrutura.aberturas`, com tipo e estado). Aqui moram:

- o bloqueio: parede, janela, porta secreta e porta fechada ou trancada seguram o arrasto do
  jogador; a porta aberta é um vão. O Mestre atravessa tudo (quem chama decide);
- a regra das portas na mesa: o jogador abre e fecha a porta destrancada que está ao lado de
  um token dele; o Mestre abre, fecha, tranca, destranca e revela a porta secreta (ela vira
  uma porta comum e pode voltar a ser secreta).

Nada daqui vai ao jogador: a forma das paredes entregaria o que a névoa ainda cobre.
"""

from __future__ import annotations

import math

from core import construtor

#: Distância máxima, em casas, do centro do token ao batente para o jogador mexer na porta.
ALCANCE_PORTA_CASAS = 1.6
#: Quanto o token para antes da parede, em casas (para não ficar desenhado em cima dela).
RECUO_CASAS = 0.3
_EPS = 1e-6


class ErroPorta(Exception):
    """Pedido de porta recusado. `codigo` já é o status HTTP."""

    def __init__(self, mensagem: str, codigo: int = 422):
        super().__init__(mensagem)
        self.mensagem = mensagem
        self.codigo = codigo


def _trecho(valor) -> list[float] | None:
    if isinstance(valor, (list, tuple)) and len(valor) == 4 and all(isinstance(n, (int, float)) for n in valor):
        return [float(n) for n in valor]
    return None


def _aberta(abertura: dict) -> bool:
    return abertura.get("tipo") == "porta" and abertura.get("estado") == "aberta"


def barreiras(estrutura) -> tuple[list[list[float]], list[list[float]]]:
    """(trechos que barram, vãos abertos), em px. As paredes publicadas já trazem janela e porta
    secreta (são parede no desenho); a porta comum é um buraco nelas, então entra aqui quando
    está fechada ou trancada. O vão aberto vale também para a secreta que o Mestre revelou."""
    if not isinstance(estrutura, dict):
        return [], []
    barram = [trecho for trecho in map(_trecho, estrutura.get("paredes") or []) if trecho]
    vaos: list[list[float]] = []
    for abertura in construtor.ler_aberturas(estrutura):
        trecho = [float(abertura["x1"]), float(abertura["y1"]), float(abertura["x2"]), float(abertura["y2"])]
        if _aberta(abertura):
            vaos.append(trecho)
        elif abertura["tipo"] == "porta":
            barram.append(trecho)
    return barram, vaos


def _cruzamento(x0: float, y0: float, dx: float, dy: float, trecho: list[float]) -> float | None:
    """Em que fração do caminho (0 a 1) ele cruza o trecho; None se não cruza. Tocar a ponta
    do trecho conta: nada de escorregar pela quina onde duas paredes se encontram."""
    ax, ay, bx, by = trecho
    sx, sy = bx - ax, by - ay
    denominador = dx * sy - dy * sx
    if abs(denominador) < _EPS:
        return None
    qx, qy = ax - x0, ay - y0
    t = (qx * sy - qy * sx) / denominador
    u = (qx * dy - qy * dx) / denominador
    if _EPS < t <= 1 + _EPS and -_EPS <= u <= 1 + _EPS:
        return t
    return None


def _no_trecho(px: float, py: float, trecho: list[float], folga: float = 0.5) -> bool:
    ax, ay, bx, by = trecho
    sx, sy = bx - ax, by - ay
    comprimento = sx * sx + sy * sy
    if comprimento < _EPS:
        return math.hypot(px - ax, py - ay) <= folga
    u = max(0.0, min(1.0, ((px - ax) * sx + (py - ay) * sy) / comprimento))
    return math.hypot(px - (ax + u * sx), py - (ay + u * sy)) <= folga


def caminho(x0: float, y0: float, x1: float, y1: float, barram, vaos, casa: float) -> tuple[float, float, bool]:
    """Até onde o token vai de (x0, y0) a (x1, y1): (x, y, barrou). Parando, fica um pouco antes
    da primeira parede do caminho."""
    dx, dy = x1 - x0, y1 - y0
    distancia = math.hypot(dx, dy)
    if distancia < _EPS or not barram:
        return x1, y1, False
    primeira = None
    for trecho in barram:
        t = _cruzamento(x0, y0, dx, dy, trecho)
        if t is None or (primeira is not None and t >= primeira):
            continue
        if vaos and any(_no_trecho(x0 + dx * t, y0 + dy * t, vao) for vao in vaos):
            continue
        primeira = t
    if primeira is None:
        return x1, y1, False
    parar = max(0.0, primeira * distancia - RECUO_CASAS * casa)
    return x0 + dx * parar / distancia, y0 + dy * parar / distancia, True


def distancia_da_porta(abertura: dict, x: float, y: float) -> float:
    ax, ay, bx, by = (float(abertura[c]) for c in ("x1", "y1", "x2", "y2"))
    sx, sy = bx - ax, by - ay
    comprimento = sx * sx + sy * sy
    u = 0.0 if comprimento < _EPS else max(0.0, min(1.0, ((x - ax) * sx + (y - ay) * sy) / comprimento))
    return math.hypot(x - (ax + u * sx), y - (ay + u * sy))


def mudar_porta(
    aberturas: list[dict], porta_id: str, *, estado: str | None, revelar: bool | None, gestor: bool,
    perto: bool = False, a_vista: bool = True,
) -> list[dict]:
    """A lista de aberturas com a porta mudada. `perto`: um token do jogador está ao lado dela;
    `a_vista`: a névoa deixa o jogador ver a porta."""
    achada = next((abertura for abertura in aberturas if abertura.get("id") == porta_id), None)
    # O jogador não sabe da porta secreta nem da que a névoa cobre: para ele, ela não existe.
    if achada is None or (not gestor and (achada["tipo"] == "secreta" or not a_vista)):
        raise ErroPorta("porta desconhecida", 404)
    nova = dict(achada)
    if revelar is not None:
        if not gestor:
            raise ErroPorta("so o Mestre revela porta secreta", 403)
        if revelar and nova["tipo"] == "secreta":
            nova["tipo"] = "porta"
            nova["era_secreta"] = True
        elif not revelar and nova.get("era_secreta"):
            nova["tipo"] = "secreta"
            nova.pop("era_secreta", None)
    if estado is not None:
        if estado not in construtor.ESTADOS_PORTA:
            raise ErroPorta("estado de porta desconhecido")
        if nova["tipo"] == "janela":
            raise ErroPorta("janela nao abre", 422)
        if not gestor:
            if nova["tipo"] != "porta":
                raise ErroPorta("porta desconhecida", 404)
            if nova["estado"] == "trancada" or estado == "trancada":
                raise ErroPorta("a porta esta trancada", 409)
            if not perto:
                raise ErroPorta("chegue com seu personagem ao lado da porta", 403)
        nova["estado"] = estado
    return [nova if abertura is achada else abertura for abertura in aberturas]
