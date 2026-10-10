"""Textos livres dos jogadores (furos, classificados, recados): validação e montagem.

Lógica pura. O jogador escreve, o texto passa por aqui antes de ir para o banco e de
aparecer para outras pessoas: sem links nem convites (nem domínio solto), sem
@everyone/@here e, quando pedido, sem marcar ninguém."""

from __future__ import annotations

import re
from typing import Optional, Tuple

HISTORIA_MIN = 10
HISTORIA_MAX = 280

_TLDS = (
    "com|net|org|gg|io|me|br|xyz|app|dev|ly|co|tv|link|click|info|gift|shop|site|online|ru|cc|to|"
    "store|live|fun|top|club|vip|pro|cloud"
)
_LINK = re.compile(
    r"(https?://|www\.|discord\.gg/|discord\.com/invite|discordapp\.com/invite"
    rf"|\b[\w-]+\.(?:{_TLDS})\b)",
    re.IGNORECASE,
)
_MENCAO_EM_MASSA = re.compile(r"@(everyone|here)", re.IGNORECASE)
_MENCAO = re.compile(r"<@[!&]?\d+>|<#\d+>")


def limpar_texto(
    texto: Optional[str], *, minimo: int, maximo: int, tirar_mencoes: bool = True,
    preservar_linhas: bool = False,
) -> Tuple[Optional[str], Optional[str]]:
    """Devolve (texto limpo, None) ou (None, motivo da recusa). Espaços e quebras de
    linha viram um espaço só; com `preservar_linhas` os parágrafos ficam (no máximo uma linha em branco)."""
    bruto = str(texto or "")
    if preservar_linhas:
        linhas = [re.sub(r"[ \t]+", " ", linha).strip() for linha in bruto.replace("\r", "").split("\n")]
        limpo = re.sub(r"\n{3,}", "\n\n", "\n".join(linhas)).strip()
    else:
        limpo = re.sub(r"\s+", " ", bruto).strip()
    if len(limpo) < minimo:
        return None, f"Escreva pelo menos {minimo} caractere(s)." if minimo <= 1 else f"Escreva pelo menos {minimo} caracteres."
    if len(limpo) > maximo:
        return None, f"O texto precisa caber em {maximo} caracteres."
    if _LINK.search(limpo):
        return None, "O Jornalista não publica links, convites nem endereços de site."
    limpo = _MENCAO_EM_MASSA.sub(lambda m: "@​" + m.group(1), limpo)
    if tirar_mencoes:
        limpo = _MENCAO.sub("", limpo).strip()
        if len(limpo) < minimo:
            return None, "Escreva o texto sem marcar ninguém."
    return limpo, None


def limpar_historia(texto: Optional[str]) -> Tuple[Optional[str], Optional[str]]:
    """História de um furo: a vítima já aparece na manchete, então ninguém é marcado."""
    limpo, erro = limpar_texto(texto, minimo=HISTORIA_MIN, maximo=HISTORIA_MAX)
    if erro == "Escreva o texto sem marcar ninguém.":
        erro = "Escreva o furo sem marcar ninguém: a vítima já aparece na manchete."
    if erro and erro.startswith("Escreva pelo menos"):
        erro = f"Conte o furo em pelo menos {HISTORIA_MIN} caracteres."
    return limpo, erro


def texto_da_manchete(alvo_id: str, historia: Optional[str]) -> str:
    """Texto guardado na fofoca. Sem história escrita, vale a manchete genérica de antes."""
    if not historia:
        return f"Vazaram segredos obscuros de <@{alvo_id}>!"
    return f"**Sobre <@{alvo_id}>:** {historia}"


def descricao_publicada(texto_fofoca: str, alvo_id: str, desmentida: bool) -> str:
    """Corpo do furo no jornal; se a vítima desmentiu, a manchete sai com a negativa."""
    if not desmentida:
        return texto_fofoca
    return f"{texto_fofoca}\n\n🗣️ <@{alvo_id}> desmente tudo e diz que é invenção."
