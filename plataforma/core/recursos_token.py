"""Mexer em Vida, Mana, Estamina e Sanidade direto pela barra do token no mapa.

O cálculo é o mesmo do HUD do Mestre na Sessão (routers/sessions.py, `atualizar_participante`):
o dano gasta primeiro o extra temporário de Vida, e a cura que passa do máximo vira extra
temporário. Mana, Estamina e Sanidade só andam entre 0 e o máximo. Aqui fica só a conta;
quem grava (participante da Sessão e ficha) é a rota do mapa.
"""

from __future__ import annotations

TIPOS = ("vida", "mana", "estamina", "sanidade")
#: Vida negativa é informação de jogo (o quanto passou de zero), como na Sessão.
VIDA_MINIMA = -999


class ErroRecurso(ValueError):
    """Pedido que não faz sentido (sem máximo, sem valor, tipo desconhecido)."""


def aplicar(
    tipo: str,
    atual: int,
    maximo: int,
    temporario: int = 0,
    *,
    delta: int | None = None,
    novo: int | None = None,
) -> tuple[int, int]:
    """Devolve (atual, temporário) depois de somar `delta` ou de definir o valor `novo`."""
    if tipo not in TIPOS:
        raise ErroRecurso("recurso desconhecido")
    if (delta is None) == (novo is None):
        raise ErroRecurso("informe a mudanca (delta) ou o valor novo, nunca os dois")
    if maximo <= 0:
        raise ErroRecurso("este personagem nao tem esse recurso")
    temporario = max(0, temporario)

    if tipo != "vida":
        alvo = novo if novo is not None else atual + (delta or 0)
        return max(0, min(alvo, maximo)), temporario

    if novo is not None:
        # Valor escrito à mão: não mexe no extra temporário, só limita ao máximo.
        return max(VIDA_MINIMA, min(novo, maximo)), temporario

    delta = delta or 0
    if delta < 0:
        absorvido = min(temporario, -delta)
        temporario -= absorvido
        atual += delta + absorvido
    elif delta > 0:
        excesso = max(0, atual + delta - maximo)
        atual += delta - excesso
        temporario += excesso
    return max(VIDA_MINIMA, min(atual, maximo)), temporario


def campos_da_ficha(tipo: str, atual: int, temporario: int) -> tuple[dict, dict]:
    """O que gravar em `ficha.status` e `ficha.recursos` para este recurso."""
    if tipo == "vida":
        return {"vidaAtual": atual, "vidaTemporaria": temporario}, {"vidaAtual": atual}
    if tipo == "mana":
        return {"manaAtual": atual}, {}
    if tipo == "estamina":
        return {"estaminaAtual": atual}, {}
    if tipo == "sanidade":
        return {"sanidadeAtual": atual}, {}
    raise ErroRecurso("recurso desconhecido")
