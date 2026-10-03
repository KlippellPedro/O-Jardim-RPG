"""Loot das criaturas do Bestiário.

A tabela de cada criatura mora em data/bestiario/loot-criaturas.json e só o
servidor a lê: o jogador descobre o que cai saqueando, e o Mestre vê a tabela
pela Sessão ao Vivo. Cada linha rola d100 contra a própria `chance`; a
quantidade e as moedas usam dados (`1`, `1d2`, `2d4`...). A rolagem é feita
aqui, no servidor, pelo mesmo motivo das outras rolagens da mesa: o resultado
vale como prova.
"""

from __future__ import annotations

import hashlib
import json
import random
import re
import secrets
from functools import lru_cache
from pathlib import Path
from typing import Callable
from uuid import uuid4

from core.dados import rolar_formula


def _localizar_data_root() -> Path:
    """Mesma resolução de plataforma/main.py::_DATA_ROOT."""
    app_root = Path(__file__).resolve().parent.parent
    local = app_root / "data"
    return local if local.exists() else app_root.parent / "data"


@lru_cache(maxsize=1)
def tabelas() -> dict:
    caminho = _localizar_data_root() / "bestiario" / "loot-criaturas.json"
    try:
        return json.loads(caminho.read_text(encoding="utf-8")).get("criaturas", {})
    except (OSError, json.JSONDecodeError):
        return {}


def tabela_da_criatura(monstro_id: str | None) -> dict | None:
    if not monstro_id:
        return None
    tabela = tabelas().get(str(monstro_id))
    return tabela if isinstance(tabela, dict) else None


# ---------------------------------------------------------------- sob medida
#
# A criatura que o gerador monta por VD (id "sob-medida-<vd>-<papel>-<arquétipo>")
# não tem tabela no arquivo. A tabela dela sai daqui: moedas pela faixa de VD,
# materiais da raridade que combina com o VD e mais coisas quanto mais forte o
# papel. A semente é o próprio id, então a mesma criatura mostra e rola sempre
# a mesma tabela.

_SOB_MEDIDA = re.compile(r"^sob-medida-(\d{1,4})-([a-z]+)-([a-z]+)$")

# (chance de cada item, em ordem) por papel. Lacaio quase não carrega nada;
# chefe e solo deixam o saque de uma luta inteira.
_ITENS_POR_PAPEL = {
    "lacaio": (60,),
    "padrao": (100, 35),
    "elite": (100, 50, 15),
    "chefe": (100, 60, 25),
    "solo": (100, 60, 25),
}
# Que tipo de material cada jeito de lutar deixa para trás, quando há.
_USOS_POR_ARQUETIPO = {
    "bruto": ("forja", "engenharia"),
    "defensor": ("forja", "engenharia"),
    "agil": ("alquimia", "cozinha"),
    "assassino": ("alquimia",),
    "atirador": ("engenharia", "veiculos"),
    "conjurador": ("ritual", "alquimia"),
}
_ORDEM_RARIDADE = ("comum", "incomum", "raro", "epico", "lendario")


def eh_sob_medida(monstro_id: str | None) -> bool:
    return bool(monstro_id and _SOB_MEDIDA.match(str(monstro_id)))


def _raridade_pelo_vd(vd: int) -> str:
    if vd <= 8:
        return "comum"
    if vd <= 18:
        return "incomum"
    if vd <= 35:
        return "raro"
    if vd <= 60:
        return "epico"
    return "lendario"


def _moedas_pelo_vd(vd: int) -> dict:
    # Mesma escada das tabelas oficiais de humanoides.
    if vd <= 5:
        return {"dados": "2d6", "moeda": "Lunaris"}
    if vd <= 12:
        return {"dados": "4d10", "moeda": "Lunaris"}
    if vd <= 20:
        return {"dados": "2d100", "moeda": "Lunaris"}
    if vd <= 30:
        return {"dados": "2d6", "moeda": "Solares"}
    return {"dados": "4d10", "moeda": "Solares"}


def tabela_sob_medida(monstro_id: str, materiais: list[dict]) -> dict | None:
    """Monta a tabela de uma criatura sob medida. `materiais` são os drops à
    venda do catálogo ({id, raridade, usos})."""
    casamento = _SOB_MEDIDA.match(str(monstro_id or ""))
    if not casamento:
        return None
    vd = max(1, int(casamento.group(1)))
    papel, arquetipo = casamento.group(2), casamento.group(3)
    chances = _ITENS_POR_PAPEL.get(papel, _ITENS_POR_PAPEL["padrao"])
    alvo = _raridade_pelo_vd(vd)
    # Começa na raridade do VD e desce uma de cada vez se faltar material.
    inicio = _ORDEM_RARIDADE.index(alvo)
    candidatos: list[dict] = []
    for raridade in _ORDEM_RARIDADE[inicio::-1]:
        candidatos = [item for item in materiais if item.get("raridade") == raridade]
        if len(candidatos) >= len(chances):
            break
    preferidos = [
        item for item in candidatos
        if set(item.get("usos") or ()) & set(_USOS_POR_ARQUETIPO.get(arquetipo, ()))
    ]
    pool = sorted(preferidos if len(preferidos) >= len(chances) else candidatos, key=lambda item: item["id"])
    semente = int(hashlib.sha256(str(monstro_id).encode("utf-8")).hexdigest()[:12], 16)
    escolhidos = random.Random(semente).sample(pool, k=min(len(chances), len(pool)))
    moedas = _moedas_pelo_vd(vd)
    return {
        "moedas": {**moedas, "chance": 50 if papel == "lacaio" else 100},
        "itens": [
            {"item": item["id"], "chance": chance, "quantidade": "1d2" if indice == 0 and chance == 100 else "1"}
            for indice, (item, chance) in enumerate(zip(escolhidos, chances))
        ],
    }


def materiais_do_catalogo(connection) -> list[dict]:
    """Drops à venda (os exclusivos de criatura única ficam de fora)."""
    return [
        {"id": row["id"], "raridade": row["raridade"], "usos": row["usos"] or []}
        for row in connection.execute(
            """
            SELECT id, conteudo->>'raridade' AS raridade, conteudo->'usos' AS usos
            FROM catalogo_itens
            WHERE tipo='drop' AND ativo=TRUE
              AND COALESCE((conteudo->>'exclusivo')::boolean, FALSE) = FALSE
              AND COALESCE((conteudo->>'disponivelNaLoja')::boolean, TRUE) = TRUE
            """
        ).fetchall()
    ]


def ajustes_da_campanha(connection, campanha_id) -> dict[str, dict]:
    """Tabelas que o Mestre ajustou só nesta campanha (monstro_id -> tabela)."""
    return {
        row["monstro_id"]: row["tabela"]
        for row in connection.execute(
            "SELECT monstro_id, tabela FROM loot_campanha WHERE campanha_id=%s",
            (campanha_id,),
        ).fetchall()
        if isinstance(row["tabela"], dict)
    }


def tabela_efetiva(connection, campanha_id, monstro_id: str | None) -> tuple[dict | None, bool]:
    """A tabela que vale nesta campanha e se ela foi ajustada pelo Mestre."""
    if not monstro_id:
        return None, False
    row = connection.execute(
        "SELECT tabela FROM loot_campanha WHERE campanha_id=%s AND monstro_id=%s",
        (campanha_id, monstro_id),
    ).fetchone()
    if row and isinstance(row["tabela"], dict):
        return row["tabela"], True
    if eh_sob_medida(monstro_id):
        return tabela_sob_medida(monstro_id, materiais_do_catalogo(connection)), False
    return tabela_da_criatura(monstro_id), False


def tem_loot(tabela: dict | None) -> bool:
    return bool(tabela and ((tabela.get("itens") or []) or tabela.get("moedas")))


def _d100() -> int:
    return secrets.randbelow(100) + 1


def _quantidade(formula: str) -> int:
    texto = str(formula or "1").strip()
    if texto.isdigit():
        return max(1, int(texto))
    return max(1, int(rolar_formula(texto)["total"]))


def rolar_loot(
    monstro_id: str,
    catalogo: dict[str, dict],
    *,
    d100: Callable[[], int] = _d100,
    quantidade: Callable[[str], int] = _quantidade,
    tabela: dict | None = None,
) -> dict | None:
    """Rola a tabela da criatura. `catalogo` traz título e raridade dos itens
    (id -> {titulo, conteudo}); linha cujo item sumiu do catálogo é ignorada
    em vez de derrubar o saque inteiro. `tabela` é a da campanha, quando o
    Mestre ajustou; sem ela vale a oficial."""
    tabela = tabela if tabela is not None else tabela_da_criatura(monstro_id)
    if tabela is None:
        return None
    linhas: list[dict] = []
    for regra in tabela.get("itens") or []:
        item = catalogo.get(regra.get("item"))
        if item is None:
            continue
        rolagem = d100()
        if rolagem > int(regra.get("chance") or 0):
            continue
        conteudo = item.get("conteudo") if isinstance(item.get("conteudo"), dict) else {}
        linhas.append({
            "linha": uuid4().hex[:12],
            "tipo": "item",
            "item_id": regra["item"],
            "titulo": item.get("titulo") or regra["item"],
            "raridade": conteudo.get("raridade"),
            "quantidade": quantidade(regra.get("quantidade") or "1"),
            "rolagem": rolagem,
            "chance": int(regra["chance"]),
            "entregue_para": None,
        })
    moedas = tabela.get("moedas")
    if isinstance(moedas, dict):
        rolagem = d100()
        if rolagem <= int(moedas.get("chance") or 0):
            linhas.append({
                "linha": uuid4().hex[:12],
                "tipo": "moedas",
                "moeda": moedas.get("moeda") or "Lunaris",
                "titulo": moedas.get("moeda") or "Lunaris",
                "quantidade": quantidade(moedas.get("dados") or "1"),
                "rolagem": rolagem,
                "chance": int(moedas["chance"]),
                "entregue_para": None,
            })
    return {"monstro_id": monstro_id, "linhas": linhas}


def resumo_da_tabela(monstro_id: str, catalogo: dict[str, dict], tabela: dict | None = None) -> dict | None:
    """A tabela legível para o Mestre: o que pode cair, com que chance."""
    tabela = tabela if tabela is not None else tabela_da_criatura(monstro_id)
    if tabela is None:
        return None
    itens = []
    for regra in tabela.get("itens") or []:
        item = catalogo.get(regra.get("item"))
        if item is None:
            continue
        conteudo = item.get("conteudo") if isinstance(item.get("conteudo"), dict) else {}
        itens.append({
            "item_id": regra["item"],
            "titulo": item.get("titulo") or regra["item"],
            "raridade": conteudo.get("raridade"),
            "exclusivo": conteudo.get("exclusivo") is True,
            "chance": int(regra.get("chance") or 0),
            "quantidade": str(regra.get("quantidade") or "1"),
        })
    return {"monstro_id": monstro_id, "itens": itens, "moedas": tabela.get("moedas")}
