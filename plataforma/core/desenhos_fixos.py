"""Desenhos fixos do Mestre: traços que ficam na cena até ele apagar (a seta num mapa, o círculo em volta de uma pista).

O desenho livre comum (core/mapa.py, normalizar_traco) some sozinho e nunca é gravado. O fixo é o mesmo traço, guardado em
`mapa_cenas.estrutura.desenhos` (sem migração). Só o Mestre desenha; ele escolhe entre deixar a mesa ver ou guardar como
anotação só dele (o jogador nunca recebe um desenho que não é público). As contas ficam aqui, sem banco nem HTTP.
"""

from __future__ import annotations

import re
from uuid import uuid4

from core.mapa import ErroMapa, normalizar_traco

MAX_DESENHOS = 80
COR = re.compile(r"^#[0-9a-fA-F]{6}$")
COR_PADRAO = "#fcd34d"


class ErroDesenho(ValueError):
    def __init__(self, mensagem: str, codigo: int = 422):
        super().__init__(mensagem)
        self.mensagem = mensagem
        self.codigo = codigo


def novo(dados, largura: int, altura: int) -> dict:
    """Um desenho fixo a partir do que o navegador mandou (forma, pontos, cor e se a mesa vê)."""
    if not isinstance(dados, dict):
        raise ErroDesenho("desenho invalido")
    try:
        traco = normalizar_traco({**dados, "id": "novo"}, largura, altura)
    except ErroMapa as erro:
        raise ErroDesenho(erro.mensagem) from None
    cor = dados.get("cor")
    return {
        "id": uuid4().hex[:12],
        "forma": traco["forma"],
        "pontos": traco["pontos"],
        "cor": cor if isinstance(cor, str) and COR.match(cor) else COR_PADRAO,
        "publico": dados.get("publico", True) is not False,
    }


def ler_desenhos(estrutura) -> list[dict]:
    """Os desenhos gravados na cena; o que está quebrado é descartado (um desenho ruim não derruba a mesa)."""
    bruto = estrutura.get("desenhos") if isinstance(estrutura, dict) else None
    if not isinstance(bruto, list):
        return []
    saida, vistos = [], set()
    for item in bruto[:MAX_DESENHOS]:
        if not isinstance(item, dict) or not isinstance(item.get("id"), str) or item["id"] in vistos:
            continue
        pontos = item.get("pontos")
        if item.get("forma") not in ("lapis", "linha", "seta", "circulo", "retangulo") or not isinstance(pontos, list):
            continue
        try:
            limpos = [[float(p[0]), float(p[1])] for p in pontos]
        except (TypeError, ValueError, IndexError):
            continue
        if len(limpos) < 2:
            continue
        vistos.add(item["id"])
        saida.append({
            "id": item["id"], "forma": item["forma"], "pontos": limpos,
            "cor": item["cor"] if isinstance(item.get("cor"), str) and COR.match(item["cor"]) else COR_PADRAO,
            "publico": item.get("publico", True) is not False,
        })
    return saida


def desenhos_de(desenhos: list[dict], *, gestor: bool) -> list[dict]:
    """O que cada um recebe: o Mestre, tudo; o jogador, só o que o Mestre deixou à mostra (sem o campo `publico`)."""
    if gestor:
        return [dict(desenho) for desenho in desenhos]
    return [{chave: valor for chave, valor in desenho.items() if chave != "publico"} for desenho in desenhos if desenho["publico"]]


def acrescentar(desenhos: list[dict], desenho: dict) -> list[dict]:
    if len(desenhos) >= MAX_DESENHOS:
        raise ErroDesenho(f"a cena comporta {MAX_DESENHOS} desenhos fixos: apague alguns")
    return [*desenhos, desenho]


def apagar(desenhos: list[dict], identificador: str) -> list[dict]:
    if not any(desenho["id"] == identificador for desenho in desenhos):
        raise ErroDesenho("desenho nao encontrado", 404)
    return [desenho for desenho in desenhos if desenho["id"] != identificador]
