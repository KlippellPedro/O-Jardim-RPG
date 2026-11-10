"""Fases de chefe: criaturas únicas mudam de jeito quando a Vida cai.

As fases moram no catálogo (`conteudo.fases` de cada criatura). A fase 1 é o começo
da luta; cada item da lista é a fase seguinte (a primeira entrada é a fase 2). Cada
fase traz `quando` (fração da Vida máxima em que ela começa), `rodada` (rodada do
combate em que ela começa mesmo sem ninguém ferir a criatura), `nome`, `anuncio` (a
frase que a mesa inteira pode ouvir) e `mudancas` (o que muda de regra, só para quem
comanda). Vale o gatilho que chegar primeiro; sem nenhum dos dois, a fase é só manual
(o "acontecimento" da história: o Mestre troca no editor). A fase só sobe: curar a
criatura ou voltar a rodada não a devolve.
"""

from __future__ import annotations

from typing import Any

MAXIMO_DE_FASES = 6
# A fase por rodada começa na 2ª (na 1ª seria só a criatura começar diferente) e
# para na 99, longe de qualquer combate de verdade.
PRIMEIRA_RODADA, ULTIMA_RODADA = 2, 99


def _rodada_limpa(valor: Any) -> int | None:
    if isinstance(valor, bool) or not isinstance(valor, (int, float)):
        return None
    if isinstance(valor, float) and not valor.is_integer():
        return None
    rodada = int(valor)
    return rodada if PRIMEIRA_RODADA <= rodada <= ULTIMA_RODADA else None


def fases_limpas(valor: Any) -> list[dict]:
    """Só o que a Sessão usa, com tipos garantidos. Lixo no catálogo vira lista vazia."""
    if not isinstance(valor, list):
        return []
    saida = []
    for item in valor[:MAXIMO_DE_FASES]:
        if not isinstance(item, dict) or not isinstance(item.get("nome"), str):
            continue
        quando = item.get("quando")
        if isinstance(quando, bool) or not isinstance(quando, (int, float)) or not 0 < float(quando) < 1:
            quando = None
        mudancas = item.get("mudancas")
        saida.append(
            {
                "quando": float(quando) if quando is not None else None,
                "rodada": _rodada_limpa(item.get("rodada")),
                "nome": item["nome"][:80],
                "anuncio": str(item.get("anuncio") or "")[:240],
                "mudancas": [str(m)[:400] for m in mudancas[:6]] if isinstance(mudancas, list) else [],
            }
        )
    return saida


def fases_do_catalogo(connection, monstro_ids) -> dict[str, list[dict]]:
    ids = sorted({str(item) for item in monstro_ids if item})
    if not ids:
        return {}
    linhas = connection.execute(
        "SELECT id, conteudo->'fases' AS fases FROM catalogo_itens WHERE id = ANY(%s) AND tipo='monstro'",
        (ids,),
    ).fetchall()
    resultado = {}
    for linha in linhas:
        fases = fases_limpas(linha["fases"])
        if fases:
            resultado[linha["id"]] = fases
    return resultado


def fase_alcancada(
    fases: list[dict],
    vida_atual: int,
    vida_maxima: int,
    fase_atual: int = 1,
    rodada: int | None = None,
) -> int:
    """A maior fase em que a criatura já entrou. Nunca desce, e criatura caída não avança.

    `rodada` é a rodada do combate em andamento (nula fora de combate): a fase com
    `rodada` começa quando o combate chega nela, mesmo com a Vida cheia.
    """
    alcancada = max(1, int(fase_atual))
    if vida_atual <= 0:
        return alcancada
    fracao = vida_atual / vida_maxima if vida_maxima > 0 else None
    for indice, fase in enumerate(fases):
        quando = fase.get("quando")
        marco = fase.get("rodada")
        pela_vida = quando is not None and fracao is not None and fracao <= quando
        pelo_tempo = marco is not None and rodada is not None and rodada >= marco
        if pela_vida or pelo_tempo:
            alcancada = max(alcancada, indice + 2)
    return alcancada
