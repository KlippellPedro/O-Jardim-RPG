"""Zonas de terreno do mapa: as contas, sem banco nem HTTP.

Uma **zona** é um retângulo da cena que o Mestre marca, com até três funções:

- **cobertura**: o obstáculo (uma mesa virada, um muro baixo). A régua entre dois tokens avisa a cobertura que a linha
  atravessa: parcial (+2 de Defesa) ou superior (+5), como no Livro de Regras. Só o servidor sabe onde elas estão;
- **gatilho**: algo acontece quando um token entra (um texto para quem pisou, um texto para a mesa, um aviso ao Mestre com
  o cartão de uma das armadilhas do Livro). O dano e a Condição nunca são aplicados sozinhos: quem decide é o Mestre;
- **terreno**: uma marca à vista de todos (Molhado, Lama, Em chamas...), para a mesa saber o chão em que está;
- **telhado**: o retângulo cobre o que tem dentro e some quando o grupo entra (só o desenho: o Mestre segue vendo tudo).

Ficam em `mapa_cenas.estrutura.zonas`, sem migração. O jogador só recebe o terreno à vista; cobertura e gatilho nunca saem.
"""

from __future__ import annotations

import math
from uuid import uuid4

MAX_ZONAS = 60
NOME_MAXIMO = 40
TEXTO_MAXIMO = 240
COBERTURAS = ("parcial", "superior")
#: Quem dispara o gatilho: só os jogadores (o Mestre atravessa à vontade) ou qualquer token.
QUEM_DISPARA = ("jogadores", "todos")
ARMADILHAS = (1, 2, 3, 4, 5, 6)
#: As marcas de terreno e a cor de cada uma (o mapa as desenha com essa cor).
TERRENOS = {
    "molhado": "#5aa9e6",
    "lama": "#8b6b43",
    "gelo": "#bfe6f5",
    "em-chamas": "#f26a21",
    "eletrificado": "#fcd34d",
    "fumaca": "#9aa0a6",
    "escuridao": "#3b3358",
    "veneno": "#7bc043",
    "sagrado": "#fff2b3",
    "vazio": "#7a6f8f",
}


class ErroZona(ValueError):
    def __init__(self, mensagem: str, codigo: int = 422):
        super().__init__(mensagem)
        self.mensagem = mensagem
        self.codigo = codigo


def _texto(valor, limite: int) -> str:
    return " ".join(str(valor or "").split())[:limite]


def _numero(valor, campo: str, minimo: float, maximo: float) -> float:
    if isinstance(valor, bool) or not isinstance(valor, (int, float)) or not math.isfinite(valor):
        raise ErroZona(f"{campo} precisa ser um numero")
    return max(minimo, min(maximo, float(valor)))


def _gatilho(bruto) -> dict | None:
    if bruto in (None, False):
        return None
    if not isinstance(bruto, dict):
        raise ErroZona("gatilho invalido")
    quem = bruto.get("quem", "jogadores")
    if quem not in QUEM_DISPARA:
        raise ErroZona("o gatilho dispara para jogadores ou para todos")
    armadilha = bruto.get("armadilha")
    if armadilha is not None and (isinstance(armadilha, bool) or armadilha not in ARMADILHAS):
        raise ErroZona("armadilha do Livro de 1 a 6")
    return {
        "texto_pisador": _texto(bruto.get("texto_pisador"), TEXTO_MAXIMO),
        "texto_mesa": _texto(bruto.get("texto_mesa"), TEXTO_MAXIMO),
        "quem": quem,
        "uma_vez": bool(bruto.get("uma_vez", True)),
        "armadilha": armadilha,
    }


def _terreno(bruto) -> dict | None:
    if bruto in (None, False):
        return None
    if not isinstance(bruto, dict) or bruto.get("rotulo") not in TERRENOS:
        raise ErroZona("escolha um terreno da lista")
    return {"rotulo": bruto["rotulo"], "visivel": bool(bruto.get("visivel", True))}


def normalizar_zonas(bruto, largura: int, altura: int) -> list[dict]:
    """A lista que o Mestre mandou, conferida: recusa o que está errado em vez de consertar no escuro."""
    if not isinstance(bruto, list) or len(bruto) > MAX_ZONAS:
        raise ErroZona(f"no maximo {MAX_ZONAS} zonas por cena")
    saida, vistos = [], set()
    for item in bruto:
        if not isinstance(item, dict):
            raise ErroZona("zona invalida")
        identificador = item.get("id")
        if not isinstance(identificador, str) or not 0 < len(identificador) <= 40:
            identificador = uuid4().hex[:12]
        if identificador in vistos:
            raise ErroZona("duas zonas com o mesmo id")
        vistos.add(identificador)
        x = _numero(item.get("x"), "x", 0, largura)
        y = _numero(item.get("y"), "y", 0, altura)
        w = _numero(item.get("w"), "w", 1, largura)
        h = _numero(item.get("h"), "h", 1, altura)
        cobertura = item.get("cobertura")
        if cobertura is not None and cobertura not in COBERTURAS:
            raise ErroZona("cobertura parcial ou superior")
        zona = {
            "id": identificador,
            "nome": _texto(item.get("nome"), NOME_MAXIMO) or "Zona",
            "x": round(x, 1), "y": round(y, 1),
            "w": round(min(w, largura - x), 1), "h": round(min(h, altura - y), 1),
            "cobertura": cobertura,
            "gatilho": _gatilho(item.get("gatilho")),
            "terreno": _terreno(item.get("terreno")),
            "telhado": bool(item.get("telhado", False)),
        }
        if zona["w"] < 1 or zona["h"] < 1:
            raise ErroZona("a zona ficou fora do mapa")
        saida.append(zona)
    return saida


def ler_zonas(estrutura, largura: int, altura: int) -> list[dict]:
    """As zonas guardadas na cena; o que está quebrado é descartado (uma zona ruim não derruba a mesa)."""
    bruto = estrutura.get("zonas") if isinstance(estrutura, dict) else None
    if not isinstance(bruto, list):
        return []
    saida = []
    for item in bruto[:MAX_ZONAS]:
        try:
            saida.extend(normalizar_zonas([item], largura, altura))
        except ErroZona:
            continue
    return saida


def zonas_de(zonas: list[dict], *, gestor: bool) -> list[dict]:
    """O que cada um recebe: o Mestre, tudo; o jogador, só o terreno à vista e os telhados (sem cobertura nem gatilho).

    O telhado é a única zona escondida que o jogador recebe, porque o desenho dele é justamente o que cobre o que tem dentro:
    chega só o retângulo, sem o nome que o Mestre deu (um "Cripta do rei" entregaria o segredo)."""
    if gestor:
        return [dict(zona) for zona in zonas]
    saida = []
    for z in zonas:
        terreno = z["terreno"] if z["terreno"] and z["terreno"]["visivel"] else None
        if not terreno and not z.get("telhado"):
            continue
        saida.append({
            "id": z["id"], "nome": z["nome"] if terreno else "", "x": z["x"], "y": z["y"], "w": z["w"], "h": z["h"],
            "cobertura": None, "gatilho": None, "terreno": terreno, "telhado": bool(z.get("telhado")),
        })
    return saida


def dentro(zona: dict, x: float, y: float) -> bool:
    return zona["x"] <= x <= zona["x"] + zona["w"] and zona["y"] <= y <= zona["y"] + zona["h"]


def zonas_em(zonas: list[dict], x: float, y: float) -> list[dict]:
    return [zona for zona in zonas if dentro(zona, x, y)]


def _segmento_cruza(zona: dict, x0: float, y0: float, x1: float, y1: float) -> bool:
    """O segmento toca o retângulo (Liang-Barsky)."""
    dx, dy = x1 - x0, y1 - y0
    t0, t1 = 0.0, 1.0
    for p, q in ((-dx, x0 - zona["x"]), (dx, zona["x"] + zona["w"] - x0), (-dy, y0 - zona["y"]), (dy, zona["y"] + zona["h"] - y0)):
        if p == 0:
            if q < 0:
                return False
            continue
        r = q / p
        if p < 0:
            if r > t1:
                return False
            t0 = max(t0, r)
        else:
            if r < t0:
                return False
            t1 = min(t1, r)
    return t0 <= t1


def cobertura_no_caminho(zonas: list[dict], x0: float, y0: float, x1: float, y1: float) -> str | None:
    """A maior cobertura (superior vence parcial) das zonas que o caminho de (x0, y0) a (x1, y1) toca.

    A zona em que quem ataca (a origem) está de pé não conta: ela protege quem está do outro lado, não quem se encosta nela."""
    nivel = None
    for zona in zonas:
        if not zona["cobertura"] or dentro(zona, x0, y0):
            continue
        if _segmento_cruza(zona, x0, y0, x1, y1):
            if zona["cobertura"] == "superior":
                return "superior"
            nivel = "parcial"
    return nivel


# ------------------------------------------------------------------ gatilhos

def gatilhos_disparados(zonas: list[dict], antes: tuple[float, float], depois: tuple[float, float], *, gestor: bool, usados: set[str]) -> list[dict]:
    """Os gatilhos que o token acabou de disparar: zonas em que ele entrou agora (não estava dentro antes), de quem a zona
    chama (jogador ou todos) e que não são de uma vez só já usadas. Devolve as zonas, na ordem da lista."""
    disparadas = []
    for zona in zonas:
        gatilho = zona["gatilho"]
        if not gatilho or not dentro(zona, *depois) or dentro(zona, *antes):
            continue
        if gatilho["quem"] == "jogadores" and gestor:
            continue
        if gatilho["uma_vez"] and zona["id"] in usados:
            continue
        disparadas.append(zona)
    return disparadas
