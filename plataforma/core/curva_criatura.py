"""Curva de criaturas por VD, lida de data/regras/curva-criatura-v1.json (gerado
por `npm run audit:balance`; o mesmo arquivo que o site lê em
src/services/curvaCriatura.ts).

Só a parte que o servidor usa: a Vida de uma criatura quando ela vira ALIADO de
um jogador. No Bestiário a Vida de uma criatura é a de um inimigo que segura o
grupo inteiro (o "solo"); comprada ou contratada, ela luta ao lado do grupo, e
com 5 a 8 vezes a Vida de um personagem ela passaria a tomar o lugar dele.
"""

from __future__ import annotations

import json
from pathlib import Path

from core.progressao_niveis import VD_MAXIMO, _localizar_data_root

# Vida de aliado = este fator vezes a Vida média de um personagem do nível.
FATOR_DE_VIDA_DE_ALIADO = 2


def _carregar() -> dict[int, dict[str, int]]:
    caminho: Path = _localizar_data_root() / "regras" / "curva-criatura-v1.json"
    bruto = json.loads(caminho.read_text(encoding="utf-8"))
    colunas = bruto["colunas"]
    return {int(linha[0]): dict(zip(colunas, linha)) for linha in bruto["linhas"]}


_CURVA = _carregar()


def vida_de_aliado(vd: object, pv_do_catalogo: int) -> int:
    """Vida da criatura na ficha de quem a comprou ou contratou: o menor entre a
    Vida do catálogo e 2x a Vida média de um personagem do VD. Sem VD válido,
    mantém a Vida do catálogo."""
    try:
        alvo = min(VD_MAXIMO, max(1, int(vd)))  # type: ignore[call-overload]
    except (TypeError, ValueError):
        return max(1, int(pv_do_catalogo))
    linha = _CURVA.get(alvo)
    if not linha:
        return max(1, int(pv_do_catalogo))
    return max(1, min(int(pv_do_catalogo), FATOR_DE_VIDA_DE_ALIADO * int(linha["vidaDoPersonagem"])))
