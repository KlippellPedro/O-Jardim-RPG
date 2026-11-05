"""Mapas colocados na cena: vários mapas do Acervo, cada um com lugar, tamanho, ordem,
trava e visibilidade própria, como no Owlbear. Moram em `mapa_cenas.estrutura["mapas"]`
(a ordem da lista é a ordem de empilhamento: o último fica por cima).

Segredo: um mapa escondido dos jogadores não sai do servidor (a leitura dos pedaços confere
`visivel`). Com a névoa ligada, cada mapa colocado também só entrega os ladrilhos que a
névoa libera; os ladrilhos dele entram na mesma lista do mapa base, com o id do mapa na frente
("<imagem_id>:n0/1/2"), calculados com as formas da névoa trazidas para o desenho do mapa.

Como `core/mapa.py`, este módulo não conhece banco nem HTTP: as rotas leem o Acervo e passam
os itens para cá.
"""

from __future__ import annotations

import math
import re
from uuid import UUID, uuid4

from core import nevoa
from core.mapa import ErroMapa

MAX_MAPAS = 40
ESCALA_MIN = 0.05
ESCALA_MAX = 20.0
#: Maior lado de uma cena (o mesmo teto de routers/mapa.py).
LADO_MAXIMO_CENA = 32768
LADO_MINIMO_CENA = 100
#: Folga em volta dos mapas: o primeiro mapa de uma cena entra a esta distância do canto, e a cena
#: mede os mapas mais esta folga à direita e embaixo. Assim o Mestre arrasta um mapa para o lado
#: que quiser (a cena não tem coordenadas negativas) e ainda sobra espaço para os tokens.
MARGEM_DA_CENA = 4000
ID = re.compile(r"^[0-9a-f-]{36}$")


def _numero(valor, campo: str, minimo: float, maximo: float) -> float:
    if isinstance(valor, bool) or not isinstance(valor, (int, float)) or not math.isfinite(valor):
        raise ErroMapa(f"{campo} precisa ser um numero")
    if valor < minimo or valor > maximo:
        raise ErroMapa(f"{campo} precisa ficar entre {minimo:g} e {maximo:g}")
    return float(valor)


def _nome(valor, padrao: str = "Mapa") -> str:
    texto = " ".join(str(valor or "").split())[:80]
    return texto or padrao


def ler(estrutura) -> list[dict]:
    """Os mapas guardados na cena. Registro quebrado é ignorado, não derruba a cena."""
    brutos = estrutura.get("mapas") if isinstance(estrutura, dict) else None
    if not isinstance(brutos, list):
        return []
    saida = []
    vistos = set()
    for bruto in brutos[:MAX_MAPAS]:
        if not isinstance(bruto, dict):
            continue
        try:
            id_mapa = str(bruto.get("id") or "").lower()
            imagem_id = str(bruto.get("imagem_id") or "").lower()
            if not ID.match(id_mapa) or not ID.match(imagem_id) or id_mapa in vistos:
                continue
            saida.append({
                "id": id_mapa,
                "imagem_id": imagem_id,
                "nome": _nome(bruto.get("nome")),
                "x": _numero(bruto.get("x", 0), "x", 0, LADO_MAXIMO_CENA),
                "y": _numero(bruto.get("y", 0), "y", 0, LADO_MAXIMO_CENA),
                "escala": _numero(bruto.get("escala", 1), "escala", ESCALA_MIN, ESCALA_MAX),
                "visivel": bool(bruto.get("visivel", True)),
                "trancado": bool(bruto.get("trancado", False)),
            })
            vistos.add(id_mapa)
        except ErroMapa:
            continue
    return saida


def novo(imagem_id, nome, x: float, y: float, escala: float = 1.0) -> dict:
    """Um mapa novo para pôr na lista (visível, solto)."""
    return {
        "id": str(uuid4()),
        "imagem_id": str(imagem_id).lower(),
        "nome": _nome(nome),
        "x": round(_numero(x, "x", 0, LADO_MAXIMO_CENA), 1),
        "y": round(_numero(y, "y", 0, LADO_MAXIMO_CENA), 1),
        "escala": round(_numero(escala, "escala", ESCALA_MIN, ESCALA_MAX), 4),
        "visivel": True,
        "trancado": False,
    }


#: O que cada pedido pode mudar. Trancado só deixa mudar a trava, o nome, a visibilidade e a ordem.
CAMPOS_DE_POSICAO = ("x", "y", "escala")
CAMPOS_LIVRES = ("nome", "visivel", "trancado")


def atualizar(mapa: dict, dados) -> dict:
    """Aplica um pedido de mudança num mapa: confere cada campo e recusa o que não cabe."""
    if not isinstance(dados, dict):
        raise ErroMapa("pedido invalido")
    mudancas = {}
    if "nome" in dados:
        mudancas["nome"] = _nome(dados["nome"], mapa["nome"])
    for campo in ("visivel", "trancado"):
        if campo in dados:
            if not isinstance(dados[campo], bool):
                raise ErroMapa(f"{campo} e verdadeiro ou falso")
            mudancas[campo] = dados[campo]
    for campo, minimo, maximo in (("x", 0, LADO_MAXIMO_CENA), ("y", 0, LADO_MAXIMO_CENA), ("escala", ESCALA_MIN, ESCALA_MAX)):
        if campo in dados:
            mudancas[campo] = round(_numero(dados[campo], campo, minimo, maximo), 4 if campo == "escala" else 1)
    # Se o pedido também destranca, a mudança de lugar vale (destrancar e mexer de uma vez).
    destranca = mudancas.get("trancado") is False
    if mapa["trancado"] and not destranca and any(campo in mudancas for campo in CAMPOS_DE_POSICAO):
        raise ErroMapa("o mapa esta trancado: destranque para mexer", 409)
    return {**mapa, **mudancas}


def duplicar(mapa: dict, deslocamento: float) -> dict:
    """Cópia ao lado (um pouco abaixo e à direita), solta e visível como o original."""
    copia = dict(mapa)
    copia["id"] = str(uuid4())
    copia["nome"] = _nome(f"{mapa['nome']} (cópia)")
    copia["x"] = round(min(LADO_MAXIMO_CENA, mapa["x"] + deslocamento), 1)
    copia["y"] = round(min(LADO_MAXIMO_CENA, mapa["y"] + deslocamento), 1)
    copia["trancado"] = False
    return copia


ACOES_DE_ORDEM = ("frente", "tras", "acima", "abaixo")


def reordenar(mapas: list[dict], id_mapa: str, acao: str) -> list[dict]:
    """Move um mapa na pilha: `frente`/`tras` vão ao fim e ao começo; `acima`/`abaixo` andam um degrau."""
    if acao not in ACOES_DE_ORDEM:
        raise ErroMapa("a ordem e frente, tras, acima ou abaixo")
    posicao = next((i for i, m in enumerate(mapas) if m["id"] == id_mapa), None)
    if posicao is None:
        raise ErroMapa("mapa nao encontrado", 404)
    lista = list(mapas)
    mapa = lista.pop(posicao)
    destino = {
        "frente": len(lista), "tras": 0,
        "acima": min(len(lista), posicao + 1), "abaixo": max(0, posicao - 1),
    }[acao]
    lista.insert(destino, mapa)
    return lista


def tamanho_na_cena(mapa: dict, item: dict) -> tuple[float, float]:
    """Largura e altura do mapa já com a escala, em px da cena."""
    return item["largura"] * mapa["escala"], item["altura"] * mapa["escala"]


def extensao(mapas: list[dict], itens: dict[str, dict]) -> tuple[int, int]:
    """O menor canto direito/baixo que cobre todos os mapas (a cena cresce até aqui, nunca encolhe)."""
    largura = altura = 0.0
    for mapa in mapas:
        item = itens.get(mapa["imagem_id"])
        if item is None:
            continue
        w, h = tamanho_na_cena(mapa, item)
        largura = max(largura, mapa["x"] + w)
        altura = max(altura, mapa["y"] + h)
    return math.ceil(largura), math.ceil(altura)


def caber_na_cena(mapas: list[dict], itens: dict[str, dict]) -> tuple[int, int]:
    """O tamanho que a cena precisa para os mapas (com a folga em volta, até o teto de uma cena)."""
    largura, altura = extensao(mapas, itens)
    if largura > LADO_MAXIMO_CENA or altura > LADO_MAXIMO_CENA:
        raise ErroMapa(f"os mapas juntos passam de {LADO_MAXIMO_CENA} px: diminua ou aproxime", 422)
    if not mapas:
        return largura, altura
    return min(LADO_MAXIMO_CENA, largura + MARGEM_DA_CENA), min(LADO_MAXIMO_CENA, altura + MARGEM_DA_CENA)


# ------------------------------------------------------------------ névoa

def forma_no_mapa(forma: dict, mapa: dict) -> dict:
    """A forma da névoa (em px da cena) trazida para o desenho do mapa: sem o deslocamento, na escala dele."""
    ox, oy, e = mapa["x"], mapa["y"], mapa["escala"]
    if forma["tipo"] == "retangulo":
        return {**forma, "x": (forma["x"] - ox) / e, "y": (forma["y"] - oy) / e, "w": forma["w"] / e, "h": forma["h"] / e}
    traduzida = {**forma, "pontos": [[(px - ox) / e, (py - oy) / e] for px, py in forma["pontos"]]}
    if "raio" in forma:
        traduzida["raio"] = forma["raio"] / e
    return traduzida


def _toca(forma: dict, x0: float, y0: float, x1: float, y1: float) -> bool:
    fx0, fy0, fx1, fy1 = nevoa.caixa(forma)
    return fx0 <= x1 and fx1 >= x0 and fy0 <= y1 and fy1 >= y0


def chave_prefixada(imagem_id: str, chave: str) -> str:
    return f"{imagem_id}:{chave}"


def ladrilhos_liberados(formas: list[dict], mapas: list[dict], itens: dict[str, dict]) -> list[str]:
    """Os ladrilhos de cada mapa colocado que a névoa libera, com o id do mapa na frente.

    O mesmo desenho (item do Acervo) posto duas vezes entra uma vez só, pela união do que cada cópia libera.
    """
    liberados: set[str] = set()
    for mapa in mapas:
        item = itens.get(mapa["imagem_id"])
        if item is None or not mapa["visivel"]:
            continue
        w, h = tamanho_na_cena(mapa, item)
        # Só as formas que tocam o mapa contam: a ordem das outras não muda o que ele libera.
        tocam = [forma for forma in formas if _toca(forma, mapa["x"], mapa["y"], mapa["x"] + w, mapa["y"] + h)]
        if not tocam:
            continue
        locais = [forma_no_mapa(forma, mapa) for forma in tocam]
        for chave in nevoa.ladrilhos_liberados(locais, int(item["largura"]), int(item["altura"]), list(item["chaves"])):
            liberados.add(chave_prefixada(mapa["imagem_id"], chave))
    return sorted(liberados)


def visiveis_para_jogador(mapas: list[dict]) -> list[dict]:
    return [mapa for mapa in mapas if mapa["visivel"]]


def id_valido(valor) -> str:
    try:
        return str(UUID(str(valor)))
    except ValueError:
        raise ErroMapa("id de mapa invalido", 404) from None
