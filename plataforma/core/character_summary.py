from __future__ import annotations

import json
import logging
from pathlib import Path


log = logging.getLogger("jardim-plataforma")

_NOMES: dict[str, dict[str, str]] = {"raca": {}, "classe": {}}


def carregar_catalogos(data_root: Path) -> None:
    """Guarda apenas id -> título de raças e classes.

    A ficha grava `racaId` e `classes[].id`; o painel do mestre precisa do nome
    legível. Ler o catálogo aqui evita mandar 86 KB de JSON ao navegador só
    para traduzir dois rótulos.
    """
    for chave, arquivo in (("raca", "racas.json"), ("classe", "classes.json")):
        caminho = data_root / "ficha" / arquivo
        if not caminho.exists():
            log.warning("Catalogo de %s ausente em %s", chave, caminho)
            continue
        try:
            itens = json.loads(caminho.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            log.exception("Falha ao ler catalogo em %s", caminho)
            continue
        if not isinstance(itens, list):
            continue
        _NOMES[chave] = {
            str(item.get("id")): str(item.get("titulo") or item.get("id"))
            for item in itens
            if isinstance(item, dict) and item.get("id")
        }


def _nome(tipo: str, identificador) -> str | None:
    if not identificador:
        return None
    chave = str(identificador)
    return _NOMES.get(tipo, {}).get(chave) or chave


def resumir_ficha(ficha: dict | None) -> dict:
    """Extrai da ficha só o que a lista de personagens do mestre mostra.

    Uma ficha pode chegar a 1 MB; mandá-la inteira em toda página era o maior
    peso do endpoint de contexto.
    """
    if not isinstance(ficha, dict):
        return {}

    classes = []
    for item in ficha.get("classes") or []:
        if not isinstance(item, dict):
            continue
        nome = _nome("classe", item.get("id"))
        if not nome:
            continue
        nivel = item.get("nivel")
        classes.append(f"{nome} {nivel}" if nivel else nome)

    derivados = ficha.get("derivados") if isinstance(ficha.get("derivados"), dict) else {}
    recursos = ficha.get("recursos") if isinstance(ficha.get("recursos"), dict) else {}
    vida_maxima = derivados.get("vida")
    vida_atual = recursos.get("vidaAtual")

    resumo = {
        "raca": _nome("raca", ficha.get("racaId")),
        "classes": classes,
        "nivel": ficha.get("nivel"),
    }
    if isinstance(vida_maxima, (int, float)):
        resumo["vida_maxima"] = int(vida_maxima)
        resumo["vida_atual"] = int(vida_atual) if isinstance(vida_atual, (int, float)) else int(vida_maxima)
    return resumo
