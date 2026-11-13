"""Quanto o personagem anda por turno, para o mapa desenhar o alcance de movimento.

O Movimento final da ficha é calculado no site (equipamento, sobrecarga e ajustes à mão entram lá). Aqui vale
o que o servidor conhece sem repetir essa conta: o Movimento guardado na ficha, o Cansaço e as condições que
mexem em movimento. É o mesmo corte de `movimentoComCondicoes` e `movimentoBloqueadoPorCondicao` do site
(src/services/statusService.ts). O alcance é ajuda de mesa: quem joga ainda acerta o número no próprio aparelho.
"""

from __future__ import annotations

import math
import unicodedata

#: A ficha sem Movimento guardado anda 9 m, como na tela da ficha.
MOVIMENTO_PADRAO = 9.0
#: Cansaço deste grau para cima corta o Movimento pela metade.
CANSACO_QUE_CORTA = 5

_PARADO = {"agarrado", "imobilizado", "paralisado", "inconsciente"}
_METADE = {"perna-quebrada", "perna quebrada", "perda-perna", "perda de uma perna"}


def _chave(valor) -> str:
    texto = unicodedata.normalize("NFD", str(valor or ""))
    return "".join(letra for letra in texto if unicodedata.category(letra) != "Mn").strip().lower()


def _chaves(condicoes) -> set[str]:
    """Os nomes e ids das condições, sem acento e em minúsculas. Aceita texto solto ou o objeto da ficha."""
    chaves: set[str] = set()
    for item in condicoes if isinstance(condicoes, (list, tuple, set)) else []:
        if isinstance(item, str):
            chaves.add(_chave(item))
        elif isinstance(item, dict):
            chaves.update(_chave(item.get(campo)) for campo in ("id", "nome", "titulo"))
    chaves.discard("")
    return chaves


def _numero(valor) -> float | None:
    if isinstance(valor, bool) or not isinstance(valor, (int, float)) or not math.isfinite(valor):
        return None
    return float(valor)


def da_ficha(ficha, condicoes_da_sessao=None) -> float:
    """Metros por turno: Movimento da ficha, cortado pelo Cansaço e pelas condições (da ficha e da Sessão)."""
    ficha = ficha if isinstance(ficha, dict) else {}
    derivados = ficha.get("derivados") if isinstance(ficha.get("derivados"), dict) else {}
    status = ficha.get("status") if isinstance(ficha.get("status"), dict) else {}
    chaves = _chaves(ficha.get("condicoesAtivas")) | _chaves(condicoes_da_sessao)
    if chaves & _PARADO:
        return 0.0
    base = _numero(derivados.get("movimento"))
    movimento = max(0.0, base if base and base > 0 else MOVIMENTO_PADRAO)
    cansaco = _numero(status.get("cansacoAtual")) or 0
    if int(cansaco) >= CANSACO_QUE_CORTA:
        movimento *= 0.5
    lento = "lento" in chaves
    apressado = "apressado" in chaves
    # Lento e as lesões de perna cortam uma vez só; Lento e Apressado juntos se anulam.
    if chaves & _METADE or (lento and not apressado):
        movimento = float(math.floor(movimento / 2))
    if apressado and not lento:
        movimento += 3
    return round(movimento, 1)
