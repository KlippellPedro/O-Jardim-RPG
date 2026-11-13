"""Artes extras do token de um personagem (mesmo personagem, roupa ou visual diferente).

A foto da ficha continua sendo a arte padrão. O jogador guarda outras aqui e escolhe qual aparece no
token; escolher "a da ficha" devolve o padrão. Cada arte é uma imagem pequena (o cliente já recorta
em 512 px) guardada como data URL, igual à foto da ficha. Só a conferência mora aqui; quem grava é a
rota do mapa (routers/mapa.py).
"""

from __future__ import annotations

import base64
import binascii

MAX_ARTES = 8
NOME_MAXIMO = 40
#: Uma arte de 512 px em WebP fica em dezenas de KB; o teto aguenta PNG e JPEG sem deixar a tabela inchar.
MAX_CARACTERES_ARTE = 900_000
MIMES = ("image/webp", "image/png", "image/jpeg")
PREFIXOS = tuple(f"data:{mime};base64," for mime in MIMES)


class ErroArte(ValueError):
    """Arte recusada: imagem inválida, grande demais ou nome inútil."""


def nome_da_arte(nome: str | None, numero: int) -> str:
    limpo = " ".join((nome or "").split())[:NOME_MAXIMO]
    return limpo or f"Arte {numero}"


def conferir_imagem(imagem: str) -> str:
    """Devolve a imagem (data URL) se for WebP, PNG ou JPEG de verdade e de tamanho aceito."""
    if not isinstance(imagem, str) or not imagem.startswith(PREFIXOS):
        raise ErroArte("a arte precisa ser uma imagem WebP, PNG ou JPEG")
    if len(imagem) > MAX_CARACTERES_ARTE:
        raise ErroArte("a arte e grande demais")
    try:
        bytes_ = base64.b64decode(imagem.split(";base64,", 1)[1], validate=True)
    except (binascii.Error, ValueError):
        raise ErroArte("a imagem da arte esta corrompida") from None
    if len(bytes_) < 16:
        raise ErroArte("a imagem da arte esta vazia")
    return imagem


def decodificar(imagem: str | None) -> tuple[str, bytes] | None:
    """(mime, bytes) de um data URL de imagem, ou None se não for uma imagem aceita."""
    if not isinstance(imagem, str) or not imagem.startswith(PREFIXOS):
        return None
    cabecalho, conteudo = imagem.split(";base64,", 1)
    try:
        return cabecalho[len("data:"):], base64.b64decode(conteudo, validate=True)
    except (binascii.Error, ValueError):
        return None
