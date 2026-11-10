"""Mapas colocados na cena: vários mapas do Acervo, cada um com lugar, tamanho, ordem,
trava e visibilidade própria, como no Owlbear. Moram em `mapa_cenas.estrutura["mapas"]`
(a ordem da lista é a ordem de empilhamento: o último fica por cima).

Segredo: um mapa escondido dos jogadores não sai do servidor (a leitura dos pedaços confere
`visivel`). Com a névoa ligada, cada mapa colocado também só entrega os ladrilhos que a
névoa libera; os ladrilhos dele entram na mesma lista do mapa base, com o id do mapa na frente
("<imagem_id>:n0/1/2"), calculados com as formas da névoa trazidas para o desenho do mapa.

Giro: o mapa gira em graus (sentido horário na tela) em torno do centro dele. `x` e `y` continuam
sendo o canto de cima e da esquerda do desenho sem girar, então girar não muda o centro. A cena,
a névoa e o limite da borda usam a caixa do mapa já girado.

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
#: Folga em volta dos mapas de uma cena que tem mapa de fundo: a cena mede os mapas mais esta folga
#: à direita e embaixo, para sobrar espaço para os tokens. (Cena só com mapas colocados é uma arena
#: do tamanho máximo, com o primeiro mapa no meio.)
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


#: Até onde um pedido pode ir em graus antes de ser recusado (o valor guardado sempre cai em 0 a 360).
GIRO_MAXIMO = 3600.0
#: Quanto o mapa girado pode passar da borda de cima e da esquerda por causa do arredondamento.
FOLGA_DA_BORDA = 1.0


def _graus(valor) -> float:
    """Giro em graus, levado para 0 (inclusive) a 360 (exclusive), com uma casa."""
    giro = round(_numero(valor, "rotacao", -GIRO_MAXIMO, GIRO_MAXIMO) % 360.0, 1)
    return 0.0 if giro >= 360.0 else giro


def _menor_posicao(rotacao: float) -> float:
    """O menor `x` ou `y` que se guarda: zero sem giro; girado, o desenho pode ter o canto atrás da borda."""
    return -LADO_MAXIMO_CENA if rotacao else 0.0


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
            rotacao = _graus(bruto.get("rotacao", 0))
            minimo = _menor_posicao(rotacao)
            saida.append({
                "id": id_mapa,
                "imagem_id": imagem_id,
                "nome": _nome(bruto.get("nome")),
                "x": _numero(bruto.get("x", 0), "x", minimo, LADO_MAXIMO_CENA),
                "y": _numero(bruto.get("y", 0), "y", minimo, LADO_MAXIMO_CENA),
                "escala": _numero(bruto.get("escala", 1), "escala", ESCALA_MIN, ESCALA_MAX),
                "rotacao": rotacao,
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
        "rotacao": 0.0,
        "visivel": True,
        "trancado": False,
    }


#: O que cada pedido pode mudar. Trancado só deixa mudar a trava, o nome, a visibilidade e a ordem.
CAMPOS_DE_POSICAO = ("x", "y", "escala", "rotacao")
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
    if "rotacao" in dados:
        mudancas["rotacao"] = _graus(dados["rotacao"])
    # Sem giro, o canto do desenho é o canto da caixa e não sai da cena. Girado, o canto do desenho sem girar
    # pode ficar atrás da borda enquanto a caixa girada ainda cabe (a conferência final é `caber_na_cena`).
    menor = _menor_posicao(mudancas.get("rotacao", mapa.get("rotacao", 0.0)))
    for campo, minimo, maximo in (("x", menor, LADO_MAXIMO_CENA), ("y", menor, LADO_MAXIMO_CENA), ("escala", ESCALA_MIN, ESCALA_MAX)):
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


def centro_do_mapa(mapa: dict, item: dict) -> tuple[float, float]:
    """O centro do mapa na cena: o ponto em torno do qual ele gira."""
    w, h = tamanho_na_cena(mapa, item)
    return mapa["x"] + w / 2, mapa["y"] + h / 2


def _girar(dx: float, dy: float, graus: float) -> tuple[float, float]:
    """Gira um vetor no sentido horário da tela (o eixo y cresce para baixo)."""
    radianos = math.radians(graus)
    seno, cosseno = math.sin(radianos), math.cos(radianos)
    return dx * cosseno - dy * seno, dx * seno + dy * cosseno


def cantos_na_cena(mapa: dict, item: dict) -> list[tuple[float, float]]:
    """Os quatro cantos do mapa já girado (cima-esquerda, cima-direita, baixo-direita, baixo-esquerda), em px da cena."""
    w, h = tamanho_na_cena(mapa, item)
    cx, cy = centro_do_mapa(mapa, item)
    giro = mapa.get("rotacao", 0.0)
    pontos = []
    for dx, dy in ((-w / 2, -h / 2), (w / 2, -h / 2), (w / 2, h / 2), (-w / 2, h / 2)):
        gx, gy = _girar(dx, dy, giro)
        pontos.append((cx + gx, cy + gy))
    return pontos


def caixa_na_cena(mapa: dict, item: dict) -> tuple[float, float, float, float]:
    """O menor retângulo (x0, y0, x1, y1) que cobre o mapa já girado."""
    if not mapa.get("rotacao"):
        w, h = tamanho_na_cena(mapa, item)
        return mapa["x"], mapa["y"], mapa["x"] + w, mapa["y"] + h
    cantos = cantos_na_cena(mapa, item)
    xs = [x for x, _ in cantos]
    ys = [y for _, y in cantos]
    return min(xs), min(ys), max(xs), max(ys)


def extensao(mapas: list[dict], itens: dict[str, dict]) -> tuple[int, int]:
    """O menor canto direito/baixo que cobre todos os mapas (a cena cresce até aqui, nunca encolhe)."""
    largura = altura = 0.0
    for mapa in mapas:
        item = itens.get(mapa["imagem_id"])
        if item is None:
            continue
        _, _, x1, y1 = caixa_na_cena(mapa, item)
        largura = max(largura, x1)
        altura = max(altura, y1)
    return math.ceil(largura), math.ceil(altura)


def caber_na_cena(mapas: list[dict], itens: dict[str, dict], com_base: bool = False) -> tuple[int, int]:
    """O tamanho que a cena precisa para os mapas.

    Uma cena montada só com mapas colocados (sem mapa de fundo) é sempre uma arena do tamanho máximo:
    a névoa cobre tudo e o Mestre arrasta os mapas para qualquer lado. Com mapa de fundo, a cena cresce
    só o que os mapas pedem, com a folga em volta. Um mapa girado não pode passar da borda de cima nem
    da esquerda (a cena só cresce para a direita e para baixo).
    """
    for mapa in mapas:
        item = itens.get(mapa["imagem_id"])
        if item is None:
            continue
        x0, y0, _, _ = caixa_na_cena(mapa, item)
        if x0 < -FOLGA_DA_BORDA or y0 < -FOLGA_DA_BORDA:
            raise ErroMapa("o mapa girado passaria da borda da cena: afaste-o do canto de cima ou da esquerda", 422)
    largura, altura = extensao(mapas, itens)
    if largura > LADO_MAXIMO_CENA or altura > LADO_MAXIMO_CENA:
        raise ErroMapa(f"os mapas juntos passam de {LADO_MAXIMO_CENA} px: diminua ou aproxime", 422)
    if not mapas:
        return largura, altura
    if not com_base:
        return LADO_MAXIMO_CENA, LADO_MAXIMO_CENA
    return min(LADO_MAXIMO_CENA, largura + MARGEM_DA_CENA), min(LADO_MAXIMO_CENA, altura + MARGEM_DA_CENA)


def centro_da_arena(largura: float, altura: float) -> tuple[float, float]:
    """O canto de cima e da esquerda que põe um mapa (já com a escala) no meio da arena."""
    return (
        round(max(0.0, (LADO_MAXIMO_CENA - largura) / 2), 1),
        round(max(0.0, (LADO_MAXIMO_CENA - altura) / 2), 1),
    )


# ------------------------------------------------------------------ névoa

def forma_no_mapa(forma: dict, mapa: dict, largura: float = 0.0, altura: float = 0.0) -> dict:
    """A forma da névoa (em px da cena) trazida para o desenho do mapa: sem o deslocamento, na escala dele.

    Com o mapa girado (`largura` e `altura` são as da imagem, sem escala), os pontos voltam o giro em torno do
    centro e o retângulo vira polígono de quatro pontos, porque deixa de ser alinhado com os eixos do desenho.
    """
    ox, oy, e = mapa["x"], mapa["y"], mapa["escala"]
    if not mapa.get("rotacao"):
        if forma["tipo"] == "retangulo":
            return {**forma, "x": (forma["x"] - ox) / e, "y": (forma["y"] - oy) / e, "w": forma["w"] / e, "h": forma["h"] / e}
        traduzida = {**forma, "pontos": [[(px - ox) / e, (py - oy) / e] for px, py in forma["pontos"]]}
        if "raio" in forma:
            traduzida["raio"] = forma["raio"] / e
        return traduzida

    cx, cy = ox + largura * e / 2, oy + altura * e / 2

    def para_o_desenho(px: float, py: float) -> list[float]:
        gx, gy = _girar(px - cx, py - cy, -mapa["rotacao"])
        return [gx / e + largura / 2, gy / e + altura / 2]

    if forma["tipo"] == "retangulo":
        x, y, w, h = forma["x"], forma["y"], forma["w"], forma["h"]
        base = {chave: valor for chave, valor in forma.items() if chave not in ("x", "y", "w", "h")}
        return {**base, "tipo": "poligono", "pontos": [para_o_desenho(px, py) for px, py in ((x, y), (x + w, y), (x + w, y + h), (x, y + h))]}
    traduzida = {**forma, "pontos": [para_o_desenho(px, py) for px, py in forma["pontos"]]}
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
        x0, y0, x1, y1 = caixa_na_cena(mapa, item)
        # Só as formas que tocam o mapa contam: a ordem das outras não muda o que ele libera.
        tocam = [forma for forma in formas if _toca(forma, x0, y0, x1, y1)]
        if not tocam:
            continue
        locais = [forma_no_mapa(forma, mapa, float(item["largura"]), float(item["altura"])) for forma in tocam]
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
