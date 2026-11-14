"""Ofícios da criação de personagem.

Lidos de data/economia/oficios-v1.json, o mesmo arquivo que o site lê em
src/services/oficios.ts. O ofício encaixa o personagem numa faixa, e a faixa
decide os Lunaris iniciais, quantos itens ele escolhe (e de que raridade) e a
renda do tempo entre aventuras. Ficha sem ofício cai na faixa "aprendiz", que é
a regra antiga: 20 Lunaris e um item comum.

O servidor nunca confia no que o navegador diz sobre dinheiro ou raridade: os
Lunaris saem da faixa, e a raridade de cada item sai do catálogo da campanha.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

FAIXA_PADRAO = "aprendiz"
OFICIO_PERSONALIZADO = "personalizado"


def _localizar_data_root() -> Path:
    app_root = Path(__file__).resolve().parent.parent
    local = app_root / "data"
    return local if local.exists() else app_root.parent / "data"


def _carregar() -> dict:
    caminho = _localizar_data_root() / "economia" / "oficios-v1.json"
    return json.loads(caminho.read_text(encoding="utf-8"))


_DADOS = _carregar()
FAIXAS: dict[str, dict] = {faixa["id"]: faixa for faixa in _DADOS["faixas"]}
OFICIOS: dict[str, dict] = {oficio["id"]: oficio for oficio in _DADOS["oficios"]}
TIPOS_DE_ITEM: frozenset[str] = frozenset(_DADOS["itens"]["tipos"])
NIVEL_LOJA_MAXIMO: int = int(_DADOS["itens"]["nivel_loja_maximo"])
NIVEL_DO_PERSONAGEM: int = int(_DADOS["itens"]["nivel_do_personagem"])
TITULO_MAXIMO: int = int(_DADOS["itens"]["titulo_maximo"])
RARIDADES_ESCOLHIVEIS = ("comum", "incomum")


@dataclass(frozen=True)
class EscolhaInicial:
    """Um item do kit já conferido: do catálogo (``item_id``) ou escrito à mão (``titulo``)."""

    item_id: str | None
    titulo: str
    raridade: str


class KitInvalido(ValueError):
    """O kit inicial pedido não cabe no que a faixa do ofício permite."""


def _texto(valor: Any) -> str:
    return " ".join(str(valor or "").split())


def faixa_do_oficio(oficio: Any) -> dict:
    """Faixa da ficha. Sem ofício, ou com ofício que não se reconhece, é a padrão."""

    if not isinstance(oficio, dict):
        return FAIXAS[FAIXA_PADRAO]
    oficio_id = str(oficio.get("id") or "")
    if oficio_id in OFICIOS:
        return FAIXAS[OFICIOS[oficio_id]["faixa"]]
    faixa_id = str(oficio.get("faixa") or "")
    if oficio_id == OFICIO_PERSONALIZADO and faixa_id in FAIXAS:
        return FAIXAS[faixa_id]
    return FAIXAS[FAIXA_PADRAO]


def validar_oficio(oficio: Any) -> str | None:
    """Confere a forma do campo ``oficio`` da ficha. Ausente vale (faixa padrão)."""

    if oficio is None:
        return None
    if not isinstance(oficio, dict):
        return "o oficio precisa ser um objeto"
    oficio_id = str(oficio.get("id") or "")
    faixa_id = str(oficio.get("faixa") or "")
    if oficio_id in OFICIOS:
        if faixa_id and faixa_id != OFICIOS[oficio_id]["faixa"]:
            return "a faixa nao bate com o oficio escolhido"
        return None
    if oficio_id != OFICIO_PERSONALIZADO:
        return "oficio desconhecido"
    if faixa_id not in FAIXAS:
        return "escolha a faixa do seu oficio"
    titulo = _texto(oficio.get("titulo"))
    if not 2 <= len(titulo) <= TITULO_MAXIMO:
        return "de um nome ao seu oficio"
    return None


def item_cabe_no_kit(conteudo: dict, tipo: str) -> str | None:
    """Raridade nativa do item se ele pode ser escolhido na criação, ou None.

    O kit sai da Loja, então vale o que a Loja venderia a um personagem novo:
    item com requisito de nível acima do 1 (as armaduras incomuns pedem o 5)
    fica de fora.
    """

    if tipo not in TIPOS_DE_ITEM or not isinstance(conteudo, dict):
        return None
    raridade = _texto(conteudo.get("raridade")).lower()
    if raridade not in RARIDADES_ESCOLHIVEIS:
        return None
    try:
        nivel = int(conteudo.get("nivelMinimoLoja") or 1)
    except (TypeError, ValueError):
        return None
    if nivel > NIVEL_LOJA_MAXIMO:
        return None
    requisito = conteudo.get("requisitoNivel")
    if isinstance(requisito, int) and not isinstance(requisito, bool) and requisito > NIVEL_DO_PERSONAGEM:
        return None
    return raridade


def conferir_kit(
    oficio: Any,
    inventario_inicial: Any,
    catalogo: dict[str, dict],
) -> list[EscolhaInicial]:
    """Confere o kit pedido contra a faixa e o catálogo da campanha.

    ``catalogo`` mapeia id -> linha visível do catálogo (com ``tipo``,
    ``titulo`` e ``conteudo``). Item escrito à mão conta como comum. A vaga de
    incomum aceita um comum no lugar; o contrário não. Pedir menos do que a
    faixa dá é permitido, mas pelo menos um item é obrigatório.
    """

    faixa = faixa_do_oficio(oficio)
    if not isinstance(inventario_inicial, list) or not inventario_inicial:
        raise KitInvalido("escolha pelo menos um item inicial")
    escolhas: list[EscolhaInicial] = []
    for entrada in inventario_inicial:
        if not isinstance(entrada, dict):
            raise KitInvalido("item inicial invalido")
        item_id = _texto(entrada.get("item_id"))
        if item_id:
            linha = catalogo.get(item_id)
            raridade = item_cabe_no_kit(linha.get("conteudo") or {}, linha.get("tipo") or "") if linha else None
            if raridade is None:
                raise KitInvalido(f"o item {item_id} nao pode ser escolhido na criacao")
            escolhas.append(EscolhaInicial(item_id=item_id, titulo=_texto(linha.get("titulo")), raridade=raridade))
            continue
        titulo = _texto(entrada.get("titulo"))[:200]
        if len(titulo) < 2:
            raise KitInvalido("o item inicial precisa de um nome valido")
        escolhas.append(EscolhaInicial(item_id=None, titulo=titulo, raridade="comum"))

    permitidos = faixa["itens"]
    incomuns = sum(1 for escolha in escolhas if escolha.raridade == "incomum")
    total_permitido = int(permitidos["comum"]) + int(permitidos["incomum"])
    if incomuns > int(permitidos["incomum"]):
        raise KitInvalido(f"a faixa {faixa['titulo']} nao escolhe item incomum a mais")
    if len(escolhas) > total_permitido:
        raise KitInvalido(f"a faixa {faixa['titulo']} escolhe no maximo {total_permitido} itens")
    return escolhas
