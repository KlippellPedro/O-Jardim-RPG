from __future__ import annotations

import json
import logging
from pathlib import Path


log = logging.getLogger("jardim-plataforma")

_NOMES: dict[str, dict[str, str]] = {"raca": {}, "classe": {}}
_CATALOGO: dict[str, dict[str, dict]] = {"raca": {}, "classe": {}}


def carregar_catalogos(data_root: Path) -> None:
    """Guarda id -> título (pro painel do mestre) e o item completo (pra
    validar Árvore/liberação na criação de personagem — ver
    `validar_arvore_raca_classe`).

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
        _CATALOGO[chave] = {
            str(item.get("id")): item
            for item in itens
            if isinstance(item, dict) and item.get("id")
        }


def _compativel_com_arvore(tipo: str, item_id, arvore_id, liberados: list) -> str | None:
    """None = ok; string = motivo do bloqueio."""
    if not item_id:
        return None
    item = _CATALOGO.get(tipo, {}).get(str(item_id))
    if not item:
        # id fora do catálogo conhecido: não é essa validação que garante
        # integridade referencial, só a regra de Árvore/liberação.
        return None
    if item.get("indisponivel"):
        return f"{tipo} indisponível: {item.get('motivo_indisponivel') or 'conteúdo ainda não liberado'}"
    disponibilidade = item.get("disponibilidade")
    arvore = item.get("arvore")
    arvores = item.get("arvores") or []
    compativel_arvore = (
        disponibilidade == "geral"
        or arvore == arvore_id
        or (isinstance(arvores, list) and arvore_id in arvores)
    )
    if not compativel_arvore:
        return f"{tipo} não disponível para esta Árvore"
    if item.get("categoria") == "esquecida" and str(item_id) not in liberados:
        return f"{tipo} especial ainda não liberado pelo mestre nesta campanha"
    return None


def validar_arvore_raca_classe(arvore_id, raca_id, classe_id, configuracoes: dict | None) -> str | None:
    """Confere Raça/Classe contra a Árvore escolhida e contra o que o mestre
    liberou na campanha (`configuracoes.racas_liberadas`/`classes_liberadas`).
    Devolve None se estiver tudo certo, ou uma mensagem pronta pra 422.
    Só chamada para jogadores comuns — mestre/assistente ignora a regra."""
    config = configuracoes or {}
    erro = _compativel_com_arvore("raca", raca_id, arvore_id, config.get("racas_liberadas") or [])
    if erro:
        return erro
    return _compativel_com_arvore("classe", classe_id, arvore_id, config.get("classes_liberadas") or [])


def _nome(tipo: str, identificador) -> str | None:
    if not identificador:
        return None
    chave = str(identificador)
    return _NOMES.get(tipo, {}).get(chave) or chave


def _numero(valor, padrao: int = 0) -> int:
    try:
        return int(float(valor))
    except (TypeError, ValueError, OverflowError):
        return padrao


def iniciativa_fixa(ficha: dict | None) -> int:
    """Calcula a iniciativa da ficha sem dado, igual ao front-end.

    Iniciativa é um atributo fixo: base derivada + bônus/penalidade + ajustes
    nomeados + efeitos de combate ativos. Nenhum d20 participa deste cálculo.
    """
    if not isinstance(ficha, dict):
        return 0
    derivados = ficha.get("derivados") if isinstance(ficha.get("derivados"), dict) else {}
    recursos = ficha.get("recursos") if isinstance(ficha.get("recursos"), dict) else {}
    total = _numero(derivados.get("iniciativa"), 10)
    total += _numero(recursos.get("bonusIniciativa"))
    total += sum(
        _numero(item.get("valor"))
        for item in (recursos.get("ajustesIniciativa") or [])
        if isinstance(item, dict)
    )

    ativos = ficha.get("efeitosAtivos") if isinstance(ficha.get("efeitosAtivos"), dict) else {}
    for colecao in ("poderes", "habilidades", "magias"):
        for item in ficha.get(colecao) or []:
            if not isinstance(item, dict):
                continue
            for efeito in item.get("efeitos") or []:
                if not isinstance(efeito, dict):
                    continue
                ativo = efeito.get("modo") == "sempre" or ativos.get(str(item.get("id"))) is True
                if ativo and efeito.get("tipo") == "combate" and efeito.get("alvo") == "iniciativa":
                    total += _numero(efeito.get("valor"))
    return total


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
