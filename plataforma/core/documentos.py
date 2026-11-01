"""Documentos do Mestre: papelada feita a partir de um modelo (cartaz de procurado, carta, edital...).

O desenho mora no navegador (src/pages/Mestre/documentos); o servidor guarda só o que o
Mestre preencheu, campo a campo, e confere tamanho e formato. Cada valor é texto: a imagem
de um campo de retrato chega como data URL já reduzida pelo navegador. Nenhum jogador lê
estas linhas, a página é do Painel do Mestre.
"""

from __future__ import annotations

import base64
import binascii
import re

MAX_DOCUMENTOS_POR_CAMPANHA = 300
MAX_CAMPOS = 40
MAX_TITULO = 120
MAX_TEXTO = 6000
MAX_IMAGEM = 320_000
MAX_TOTAL = 900_000

MODELO = re.compile(r"^[a-z0-9][a-z0-9-]{0,47}$")
CHAVE = re.compile(r"^[A-Za-z][A-Za-z0-9_]{0,39}$")
PREFIXOS_IMAGEM = ("data:image/jpeg;base64,", "data:image/webp;base64,", "data:image/png;base64,")


class ErroDocumento(Exception):
    def __init__(self, mensagem: str, codigo: int = 422):
        super().__init__(mensagem)
        self.mensagem = mensagem
        self.codigo = codigo


def validar_modelo(modelo) -> str:
    """O id do modelo vem do navegador; aqui só a forma. Modelo que o site ainda não conhece abre com aviso lá."""
    if not isinstance(modelo, str) or not MODELO.match(modelo.strip()):
        raise ErroDocumento("modelo de documento invalido")
    return modelo.strip()


def normalizar_titulo(titulo) -> str:
    if not isinstance(titulo, str):
        raise ErroDocumento("o documento precisa de um nome")
    limpo = " ".join(titulo.split())[:MAX_TITULO]
    if not limpo:
        raise ErroDocumento("o documento precisa de um nome")
    return limpo


def _imagem(valor: str) -> str:
    if not valor.startswith(PREFIXOS_IMAGEM):
        raise ErroDocumento("a imagem precisa ser JPG, PNG ou WebP")
    if len(valor) > MAX_IMAGEM:
        raise ErroDocumento("imagem grande demais para o documento", 413)
    try:
        base64.b64decode(valor.split(",", 1)[1], validate=True)
    except (binascii.Error, ValueError) as erro:
        raise ErroDocumento("imagem corrompida") from erro
    return valor


def _texto(valor: str) -> str:
    texto = valor.replace("\r\n", "\n").replace("\r", "\n")
    texto = re.sub(r"\n{4,}", "\n\n\n", texto)
    return texto.rstrip()[:MAX_TEXTO]


def normalizar_campos(campos) -> dict[str, str]:
    """Guarda cada campo como texto. Campo vazio fica (o Mestre apagou de propósito); campo ausente o navegador
    preenche com o exemplo do modelo."""
    if campos is None:
        return {}
    if not isinstance(campos, dict):
        raise ErroDocumento("campos do documento invalidos")
    if len(campos) > MAX_CAMPOS:
        raise ErroDocumento("campos demais no documento")
    limpos: dict[str, str] = {}
    total = 0
    for chave, valor in campos.items():
        if not isinstance(chave, str) or not CHAVE.match(chave):
            raise ErroDocumento("campo do documento com nome invalido")
        if valor is None:
            continue
        if not isinstance(valor, str):
            raise ErroDocumento(f"o campo {chave} precisa ser texto")
        limpo = _imagem(valor) if valor.startswith("data:") else _texto(valor)
        total += len(limpo)
        limpos[chave] = limpo
    if total > MAX_TOTAL:
        raise ErroDocumento("documento grande demais; use imagens menores", 413)
    return limpos
