"""Recipientes de loot no mapa: baús, caixotes, bolsas e qualquer token que guarde itens.

O Mestre marca um token como recipiente e escolhe uma predefinição (Baú comum, Baú raro...) ou monta a
tabela à mão. Cada linha tem o item, a chance (%) de cair e a quantidade (número ou dados). A predefinição
sorteia itens do catálogo da campanha e grava a tabela concreta, que o Mestre pode ajustar linha a linha.

Quando um jogador abre o recipiente, o servidor rola a tabela uma única vez (d100 por linha, mesma rolagem do
loot das criaturas em core/loot_criaturas.py) e guarda o resultado. Quem vê o token enxerga o que saiu, sem as
chances nem a tabela: ela só chega a quem comanda a mesa. Cada linha só pode ser pega uma vez.

Formato guardado em `mapa_tokens.recipiente`:
    {"rotulo": "Baú comum", "predefinicao": "bau-comum" | None, "trancado": False,
     "tabela": {"moedas": {...} | None, "itens": [{"item", "chance", "quantidade"}]},
     "aberto": False, "loot": None | {"linhas": [...], "aberto_por": "Mira", "aberto_em": "2026-..."}}
"""

from __future__ import annotations

import random
import re
from datetime import datetime, timezone
from typing import Any

from core.loot_criaturas import rolar_loot

ROTULO_MAXIMO = 40
MAX_LINHAS = 30
DADOS = re.compile(r"^\d{1,2}(d\d{1,3})?$")
RARIDADES = ("comum", "incomum", "raro", "epico", "lendario")
#: Tipos que nunca entram como loot (criatura e propriedade não cabem num baú).
TIPOS_FORA = frozenset({"monstro", "propriedade"})


class ErroRecipiente(ValueError):
    """Pedido inválido sobre um recipiente."""


# ------------------------------------------------------------ predefinições
#
# Cada slot é "uma chance de sair uma coisa deste tipo e raridade". O item exato é sorteado do catálogo quando
# o Mestre aplica a predefinição (e de novo cada vez que ele pede "sortear de novo"). Faltou item da raridade:
# o sorteio desce uma raridade de cada vez.

_ARMAS_E_ARMADURAS = ("arma", "armadura")


def _slot(tipos: tuple[str, ...], raridade: str, chance: int, quantidade: str = "1") -> dict:
    return {"tipos": tipos, "raridade": raridade, "chance": chance, "quantidade": quantidade}


PREDEFINICOES: dict[str, dict[str, Any]] = {
    "bau-comum": {
        "rotulo": "Baú comum",
        "descricao": "Moedas pequenas, algum consumível e material simples.",
        "moedas": {"moeda": "Lunaris", "dados": "4d10", "chance": 100},
        "slots": [
            _slot(("consumivel",), "comum", 70),
            _slot(("drop",), "comum", 60, "1d2"),
            _slot(("equipamento",), "comum", 40),
            _slot(_ARMAS_E_ARMADURAS, "comum", 15),
        ],
    },
    "bau-incomum": {
        "rotulo": "Baú incomum",
        "descricao": "Mais moedas, equipamento melhor e uma chance de arma ou modificação.",
        "moedas": {"moeda": "Lunaris", "dados": "2d100", "chance": 100},
        "slots": [
            _slot(("consumivel",), "incomum", 65),
            _slot(("drop",), "incomum", 55, "1d2"),
            _slot(("equipamento",), "incomum", 40),
            _slot(_ARMAS_E_ARMADURAS, "incomum", 25),
            _slot(("modificacao",), "incomum", 20),
        ],
    },
    "bau-raro": {
        "rotulo": "Baú raro",
        "descricao": "Já paga em Solares e guarda equipamento de verdade.",
        "moedas": {"moeda": "Solares", "dados": "2d6", "chance": 100},
        "slots": [
            _slot(("consumivel",), "raro", 50),
            _slot(("drop",), "raro", 50, "1d2"),
            _slot(("equipamento",), "raro", 35),
            _slot(_ARMAS_E_ARMADURAS, "raro", 30),
            _slot(("modificacao",), "raro", 25),
        ],
    },
    "bau-epico": {
        "rotulo": "Baú épico",
        "descricao": "Tesouro de masmorra: Solares, armas e armaduras épicas, talvez um artefato.",
        "moedas": {"moeda": "Solares", "dados": "4d10", "chance": 100},
        "slots": [
            _slot(("drop",), "epico", 60, "1d2"),
            _slot(("equipamento",), "epico", 40),
            _slot(_ARMAS_E_ARMADURAS, "epico", 35),
            _slot(("implante",), "epico", 15),
            _slot(("artefato",), "epico", 10),
        ],
    },
    "bau-lendario": {
        "rotulo": "Baú lendário",
        "descricao": "Um tesouro que muda a campanha. Poucas linhas, todas raras.",
        "moedas": {"moeda": "Solares", "dados": "2d100", "chance": 100},
        "slots": [
            _slot(("drop",), "lendario", 60, "1d2"),
            _slot(("equipamento",), "lendario", 40),
            _slot(_ARMAS_E_ARMADURAS, "lendario", 40),
            _slot(("artefato",), "lendario", 20),
        ],
    },
    "caixote-de-suprimentos": {
        "rotulo": "Caixote de suprimentos",
        "descricao": "Comida, poções e tralha útil. Quase nunca tem moedas.",
        "moedas": {"moeda": "Lunaris", "dados": "2d6", "chance": 50},
        "slots": [
            _slot(("consumivel",), "comum", 80, "1d3"),
            _slot(("equipamento",), "comum", 50),
            _slot(("drop",), "comum", 40),
        ],
    },
    "bolsa-de-saque": {
        "rotulo": "Bolsa de saque",
        "descricao": "O que um inimigo ou viajante carrega: moedas e materiais.",
        "moedas": {"moeda": "Lunaris", "dados": "4d10", "chance": 100},
        "slots": [
            _slot(("drop",), "comum", 70, "1d2"),
            _slot(("drop",), "incomum", 30),
            _slot(("consumivel",), "comum", 35),
        ],
    },
}


def lista_de_predefinicoes() -> list[dict]:
    return [
        {"id": id_, "rotulo": dados["rotulo"], "descricao": dados["descricao"]}
        for id_, dados in PREDEFINICOES.items()
    ]


def _elegiveis(catalogo: list[dict], tipos: tuple[str, ...], raridade: str) -> list[dict]:
    """Itens do tipo e da raridade pedidos, descendo uma raridade por vez até achar. Criatura exclusiva fica fora."""
    ordem = RARIDADES.index(raridade)
    for degrau in range(ordem, -1, -1):
        alvo = RARIDADES[degrau]
        achados = []
        for item in catalogo:
            conteudo = item.get("conteudo") if isinstance(item.get("conteudo"), dict) else {}
            if item.get("tipo") not in tipos or item.get("tipo") in TIPOS_FORA:
                continue
            if conteudo.get("raridade") != alvo or conteudo.get("exclusivo") is True:
                continue
            achados.append(item)
        if achados:
            return achados
    return []


def gerar_tabela(predefinicao: str, catalogo: list[dict], rng: random.Random | None = None) -> dict:
    """Sorteia a tabela concreta da predefinição: um item por slot (sem repetir item) e as moedas dela."""
    modelo = PREDEFINICOES.get(predefinicao)
    if modelo is None:
        raise ErroRecipiente("predefinicao desconhecida")
    rng = rng or random.SystemRandom()
    usados: set[str] = set()
    itens: list[dict] = []
    for slot in modelo["slots"]:
        pool = [item for item in _elegiveis(catalogo, slot["tipos"], slot["raridade"]) if item["id"] not in usados]
        if not pool:
            continue
        escolhido = rng.choice(pool)
        usados.add(escolhido["id"])
        itens.append({"item": escolhido["id"], "chance": slot["chance"], "quantidade": slot["quantidade"]})
    return {"moedas": dict(modelo["moedas"]) if modelo.get("moedas") else None, "itens": itens}


# ------------------------------------------------------------ estado guardado

def tabela_valida(tabela: Any) -> dict:
    """Confere uma tabela (do Mestre ou da predefinição) e devolve a forma guardada."""
    if not isinstance(tabela, dict):
        raise ErroRecipiente("tabela invalida")
    itens = tabela.get("itens") or []
    if not isinstance(itens, list) or len(itens) > MAX_LINHAS:
        raise ErroRecipiente(f"a tabela aceita ate {MAX_LINHAS} itens")
    vistos: set[str] = set()
    limpos = []
    for linha in itens:
        item = str((linha or {}).get("item") or "")
        chance = (linha or {}).get("chance")
        quantidade = str((linha or {}).get("quantidade") or "1").strip().lower()
        if not item or item in vistos:
            raise ErroRecipiente("item faltando ou repetido na tabela")
        if isinstance(chance, bool) or not isinstance(chance, int) or not 1 <= chance <= 100:
            raise ErroRecipiente("a chance vai de 1 a 100")
        if not DADOS.match(quantidade):
            raise ErroRecipiente("quantidade e um numero ou dados, como 2 ou 1d4")
        vistos.add(item)
        limpos.append({"item": item, "chance": chance, "quantidade": quantidade})
    moedas = tabela.get("moedas")
    if moedas:
        if moedas.get("moeda") not in ("Lunaris", "Solares") or not DADOS.match(str(moedas.get("dados") or "")):
            raise ErroRecipiente("moedas invalidas")
        chance = moedas.get("chance")
        if isinstance(chance, bool) or not isinstance(chance, int) or not 1 <= chance <= 100:
            raise ErroRecipiente("a chance das moedas vai de 1 a 100")
        moedas = {"moeda": moedas["moeda"], "dados": str(moedas["dados"]).lower(), "chance": chance}
    else:
        moedas = None
    return {"moedas": moedas, "itens": limpos}


def novo(rotulo: str, predefinicao: str | None, tabela: dict) -> dict:
    return {
        "rotulo": " ".join((rotulo or "").split())[:ROTULO_MAXIMO] or "Recipiente",
        "predefinicao": predefinicao,
        "trancado": False,
        "tabela": tabela_valida(tabela),
        "aberto": False,
        "loot": None,
    }


def ler(valor: Any) -> dict | None:
    """O recipiente como está guardado, ou None. Defende contra linha antiga ou quebrada."""
    if not isinstance(valor, dict) or not isinstance(valor.get("tabela"), dict):
        return None
    loot = valor.get("loot") if isinstance(valor.get("loot"), dict) else None
    return {
        "rotulo": str(valor.get("rotulo") or "Recipiente")[:ROTULO_MAXIMO],
        "predefinicao": valor.get("predefinicao") if valor.get("predefinicao") in PREDEFINICOES else None,
        "trancado": bool(valor.get("trancado")),
        "tabela": valor["tabela"],
        "aberto": bool(valor.get("aberto")),
        "loot": loot,
    }


def abrir(recipiente: dict, catalogo: dict[str, dict], quem: str) -> dict:
    """Rola a tabela na primeira abertura e guarda o resultado. Abrir de novo devolve o mesmo loot."""
    if recipiente["aberto"] and recipiente["loot"]:
        return recipiente
    rolado = rolar_loot("recipiente", catalogo, tabela=recipiente["tabela"]) or {"linhas": []}
    return {
        **recipiente,
        "aberto": True,
        "loot": {
            "linhas": rolado["linhas"],
            "aberto_por": quem,
            "aberto_em": datetime.now(timezone.utc).isoformat(),
        },
    }


def reiniciar(recipiente: dict) -> dict:
    """Fecha de novo e esquece o que tinha saído: a próxima abertura rola outra vez."""
    return {**recipiente, "aberto": False, "loot": None}


def linhas_abertas(recipiente: dict | None) -> list[dict]:
    loot = (recipiente or {}).get("loot") or {}
    return [linha for linha in loot.get("linhas") or [] if isinstance(linha, dict)]


# ------------------------------------------------------------------- visão

def visao(recipiente: dict | None, *, gestor: bool) -> dict | None:
    """O que o espectador recebe. Jogador vê o rótulo, se está trancado e o que saiu depois de aberto, sem a
    tabela, as chances nem as rolagens. O Mestre recebe também a predefinição e o tamanho da tabela."""
    dados = ler(recipiente)
    if dados is None:
        return None
    linhas = []
    for linha in linhas_abertas(dados):
        item = {
            "linha": linha.get("linha"),
            "tipo": linha.get("tipo"),
            "titulo": linha.get("titulo"),
            "raridade": linha.get("raridade"),
            "quantidade": linha.get("quantidade"),
            "entregue_para": (linha.get("entregue_para") or {}).get("nome") if linha.get("entregue_para") else None,
        }
        if gestor:
            item["rolagem"] = linha.get("rolagem")
            item["chance"] = linha.get("chance")
        linhas.append(item)
    saida = {
        "rotulo": dados["rotulo"],
        "trancado": dados["trancado"],
        "aberto": dados["aberto"],
        "linhas": linhas,
        "esvaziado": bool(linhas) and all(linha["entregue_para"] for linha in linhas),
        "aberto_por": (dados["loot"] or {}).get("aberto_por") if dados["aberto"] else None,
    }
    if gestor:
        saida["predefinicao"] = dados["predefinicao"]
        saida["itens_na_tabela"] = len(dados["tabela"].get("itens") or []) + (1 if dados["tabela"].get("moedas") else 0)
    return saida
