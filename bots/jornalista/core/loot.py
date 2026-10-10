"""Loot dos baús: logica PURA. rng injetavel. Preparado pra Estações."""

from __future__ import annotations

import random as _random
from datetime import datetime, timedelta
from typing import Dict, List, Optional

try:
    from zoneinfo import ZoneInfo
    TZ: Optional[object] = ZoneInfo("America/Sao_Paulo")
except Exception:
    TZ = None

PESOS_RARIDADE: Dict[str, int] = {
    "comum": 60,
    "incomum": 25,
    "raro": 10,
    "epico": 4,
    "lendario": 1,
    "reliquia": 1,
}
LUNARIS_MIN, LUNARIS_MAX = 5, 40
CHANCE_BAU_ENIGMA = 0.25  # legado: bancos antigos ainda podem expor este valor

# O baú possui uma raridade própria, separada da raridade de cada item.
# Os pesos somam 1.000 para a distribuição ser legível sem floats. Estações
# especiais usam a segunda coluna e realmente tornam os baús altos mais comuns.
BAU_RARIDADES = {
    "comum": {
        "nome": "Baú Comum", "emoji": "🎁", "cor": 0x95A5A6,
        "peso": 550, "peso_especial": 160, "expira_minutos": 180,
        "dificuldade_enigma": None, "bonus_itens": 0, "lunaris_mult": 1.0,
        "pesos_itens": {"comum": 90, "incomum": 10},
        "coletivo": True, "chance_item": 0.35,
    },
    "incomum": {
        "nome": "Baú Incomum", "emoji": "🌿", "cor": 0x2ECC71,
        "peso": 290, "peso_especial": 260, "expira_minutos": 120,
        "dificuldade_enigma": None, "bonus_itens": 0, "lunaris_mult": 1.25,
        "pesos_itens": {"comum": 25, "incomum": 65, "raro": 10},
        "coletivo": True, "chance_item": 0.55,
    },
    "raro": {
        "nome": "Baú Raro", "emoji": "💎", "cor": 0x3498DB,
        "peso": 120, "peso_especial": 280, "expira_minutos": 90,
        "dificuldade_enigma": "facil", "bonus_itens": 0, "lunaris_mult": 1.75,
        "pesos_itens": {"incomum": 20, "raro": 65, "epico": 15},
    },
    "epico": {
        "nome": "Baú Épico", "emoji": "🔮", "cor": 0x9B59B6,
        "peso": 30, "peso_especial": 180, "expira_minutos": 60,
        "dificuldade_enigma": "medio", "bonus_itens": 1, "lunaris_mult": 2.5,
        "pesos_itens": {"raro": 20, "epico": 65, "lendario": 12, "reliquia": 3},
    },
    "lendario": {
        "nome": "Baú Lendário", "emoji": "👑", "cor": 0xF39C12,
        "peso": 8, "peso_especial": 90, "expira_minutos": 30,
        "dificuldade_enigma": "dificil", "bonus_itens": 1, "lunaris_mult": 4.0,
        "pesos_itens": {"epico": 20, "lendario": 65, "reliquia": 14},
    },
    "mitico": {
        "nome": "Baú Mítico", "emoji": "🔥", "cor": 0xE74C3C,
        "peso": 2, "peso_especial": 30, "expira_minutos": 15,
        "dificuldade_enigma": "lendario", "bonus_itens": 3, "lunaris_mult": 8.0,
        "pesos_itens": {"lendario": 15, "reliquia": 70},
    },
}
# Relíquias da Criação (inclui Frutos do Éden) nunca entram em pesos_itens:
# são únicas e só chegam por evento/compra com Fragmentos de Estrela, nunca
# por baú.
BAU_RARIDADE_ORDEM = tuple(BAU_RARIDADES)


def perfil_bau(raridade: str) -> dict:
    """Retorna uma cópia do perfil; ids desconhecidos caem no Comum."""
    return dict(BAU_RARIDADES.get(str(raridade), BAU_RARIDADES["comum"]))


def sortear_raridade_bau(rng=_random, *, evento_especial: bool = False) -> str:
    pesos = [
        BAU_RARIDADES[chave]["peso_especial" if evento_especial else "peso"]
        for chave in BAU_RARIDADE_ORDEM
    ]
    return rng.choices(BAU_RARIDADE_ORDEM, weights=pesos, k=1)[0]


def pesos_itens_do_bau(
    raridade: str, pesos_estacao: Optional[Dict[str, int]] = None
) -> Dict[str, int]:
    """Combina identidade do baú com a estação sem zerar tiers raros."""
    base = BAU_RARIDADES.get(raridade, BAU_RARIDADES["comum"])["pesos_itens"]
    estacao = pesos_estacao or {}
    return {
        item_raridade: int(peso) * max(1, int(estacao.get(item_raridade, 0)))
        for item_raridade, peso in base.items()
        if int(peso) > 0
    }


def parametros_premio_bau(
    raridade: str,
    itens_base: int,
    lunaris_min: int,
    lunaris_max: int,
) -> dict:
    perfil = BAU_RARIDADES.get(raridade, BAU_RARIDADES["comum"])
    multiplicador = float(perfil["lunaris_mult"])
    minimo = max(0, round(int(lunaris_min) * multiplicador))
    maximo = max(minimo, round(int(lunaris_max) * multiplicador))
    return {
        "qtd_itens": min(5, max(1, int(itens_base)) + int(perfil["bonus_itens"])),
        "lunaris_min": minimo,
        "lunaris_max": maximo,
        "expira_minutos": int(perfil["expira_minutos"]),
    }

# ── Baús v2 ──────────────────────────────────────────────────────────────────
# Baús Comum e Incomum são COLETIVOS: cada pessoa pega o seu (uma vez por baú),
# sem corrida. Do Raro para cima continua valendo o primeiro a acertar o enigma.
BAUS_POR_DIA_PADRAO = 4
BAUS_POR_DIA_MAX = 8

# Proteção de azar do servidor: depois de tantos baús seguidos só Comum/Incomum,
# o próximo sai pelo menos Raro.
PROTECAO_BAUS_SEM_BOM = 8
_ORDEM_BAU = tuple(BAU_RARIDADES)
_RARIDADES_BOAS = frozenset({"raro", "epico", "lendario", "mitico"})

# Pistas de Sorte: consolo de quem tentou o enigma e não levou. Cada Pista
# vira bônus no próximo baú que a pessoa levar.
PISTAS_MAX = 5
PISTA_BONUS_LUNARIS = 0.20     # +20% de Lunaris por Pista
PISTA_CHANCE_ITEM_EXTRA = 0.15  # +15% de chance de um item extra por Pista


# Chaves do Jardim: o Banqueiro vende (CHAVE_PRECO em bots/banqueiro/core/economia.py,
# que repete CHAVES_MAX: os ZIPs são separados, mantenha iguais). Uma Chave é gasta
# sozinha no próximo baú Incomum ou melhor e abre o "fundo falso": mais Lunaris e um
# item extra de um degrau acima. Nunca é exigida para abrir um baú.
CHAVES_MAX = 10
CHAVE_BONUS_LUNARIS = 0.5
# Chance de achar uma Chave ao pegar o seu num baú coletivo. Quem vence a corrida
# de um baú Raro ou melhor sempre leva uma.
CHANCE_CHAVE_COLETIVO = {"comum": 0.08, "incomum": 0.12}


def chave_vale_para(raridade: str) -> bool:
    """A Chave não é gasta em baú Comum."""
    return str(raridade) != "comum"


def chave_cai_na_corrida(raridade: str) -> bool:
    return str(raridade) in _RARIDADES_BOAS


def aplicar_chave_ao_premio(
    premio: dict, catalogo, rng=_random,
    pesos: Optional[Dict[str, int]] = None, tipos=None,
) -> dict:
    """Fundo falso: +50% de Lunaris e um item extra sorteado nos pesos do degrau
    acima. Sem item elegível no catálogo, só o bônus de Lunaris."""
    novo = dict(premio)
    novo["lunaris"] = round(int(premio.get("lunaris") or 0) * (1 + CHAVE_BONUS_LUNARIS))
    existentes = {(i["id"] if isinstance(i, dict) else i.id) for i in premio.get("itens") or []}
    item = sortear_item(catalogo, rng=rng, pesos=pesos, tipos=tipos, excluir_ids=existentes)
    novo["itens"] = list(premio.get("itens") or []) + ([item] if item is not None else [])
    novo["chave"] = {"item_extra": item is not None}
    return novo


def eh_coletivo(raridade: str) -> bool:
    return bool(perfil_bau(raridade).get("coletivo"))


def aplicar_protecao_de_azar(raridade: str, baus_sem_bom: int) -> str:
    """Sobe para Raro o baú que viria Comum/Incomum depois de uma longa
    sequência sem nenhum baú bom."""
    if raridade in _RARIDADES_BOAS or int(baus_sem_bom) < PROTECAO_BAUS_SEM_BOM:
        return raridade
    return "raro"


def raridade_acima(raridade: str) -> str:
    """Próximo degrau da escala de baús (o Mítico não sobe)."""
    try:
        indice = _ORDEM_BAU.index(raridade)
    except ValueError:
        return "incomum"
    return _ORDEM_BAU[min(indice + 1, len(_ORDEM_BAU) - 1)]


def horarios_do_dia(min_hora: int, max_hora: int, por_dia: int, dia: datetime):
    """Divide a janela [min_hora, max_hora] do dia em `por_dia` faixas iguais.
    Devolve [(inicio, fim)] como datetimes do mesmo fuso de `dia`."""
    if min_hora > max_hora:
        min_hora, max_hora = max_hora, min_hora
    min_hora = max(0, min(23, int(min_hora)))
    max_hora = max(0, min(23, int(max_hora)))
    por_dia = max(1, min(BAUS_POR_DIA_MAX, int(por_dia)))
    inicio_janela = dia.replace(hour=min_hora, minute=0, second=0, microsecond=0)
    minutos = (max_hora - min_hora + 1) * 60
    tamanho = minutos / por_dia
    faixas = []
    for i in range(por_dia):
        ini = inicio_janela + timedelta(minutes=round(i * tamanho))
        fim = inicio_janela + timedelta(minutes=round((i + 1) * tamanho))
        faixas.append((ini, fim))
    return faixas


def agendar_proximo_bau(
    min_hora: int,
    max_hora: int,
    por_dia: int,
    rng=_random,
    agora: Optional[datetime] = None,
    *,
    apos_drop: bool = False,
) -> datetime:
    """Horário do próximo baú: um sorteio por faixa do dia, para os baús não
    virarem rajada nem ficarem todos de madrugada.

    `apos_drop=True` (logo depois de um baú cair) só considera faixas que
    COMEÇAM depois de agora; sem isso (ao ligar os baús) vale a faixa em
    andamento, no tempo que ainda resta dela."""
    if agora is None:
        agora = datetime.now(TZ) if TZ else datetime.now()
    for deslocamento in (0, 1, 2):
        dia = agora + timedelta(days=deslocamento)
        for ini, fim in horarios_do_dia(min_hora, max_hora, por_dia, dia):
            if apos_drop:
                if ini <= agora:
                    continue
                piso = ini
            else:
                if fim <= agora + timedelta(minutes=1):
                    continue
                piso = max(ini, agora + timedelta(minutes=1))
            teto = fim - timedelta(minutes=1)
            if teto <= piso:
                return piso.replace(second=0, microsecond=0)
            espaco = int((teto - piso).total_seconds() // 60)
            return (piso + timedelta(minutes=rng.randint(0, espaco))).replace(second=0, microsecond=0)
    return agora + timedelta(days=1)  # inalcançável, só por segurança


def sortear_premio_coletivo(
    catalogo, params: dict, rng=_random, pesos_bonus: Optional[Dict[str, int]] = None,
    pistas: int = 0,
) -> dict:
    """Prêmio individual de um baú coletivo: Lunaris na faixa do baú e uma
    chance de um item. Cada Pista de Sorte soma Lunaris e chance de item extra."""
    pistas = max(0, min(PISTAS_MAX, int(pistas)))
    lunaris = rng.randint(int(params["lunaris_min"]), int(params["lunaris_max"]))
    lunaris = round(lunaris * (1 + PISTA_BONUS_LUNARIS * pistas))
    itens = []
    if rng.random() < float(params.get("chance_item", 0)):
        item = sortear_item(
            catalogo, rng=rng, pesos=params.get("pesos_itens"), tipos=params.get("tipos"),
        )
        if item is not None:
            itens.append(item)
    extras = _itens_extras_de_sorte(catalogo, rng, pistas, pesos_bonus or params.get("pesos_itens"),
                                    params.get("tipos"), {i.id for i in itens})
    itens += extras
    premio = {"lunaris": lunaris, "itens": itens, "creditos_sombrios": 0}
    if pistas > 0:
        premio["sorte"] = {"pistas": pistas, "item_extra": bool(extras)}
    return premio


def _itens_extras_de_sorte(catalogo, rng, pistas, pesos, tipos, excluir) -> list:
    if pistas <= 0:
        return []
    if rng.random() >= min(0.9, PISTA_CHANCE_ITEM_EXTRA * pistas):
        return []
    item = sortear_item(catalogo, rng=rng, pesos=pesos, tipos=tipos, excluir_ids=excluir)
    return [item] if item is not None else []


def aplicar_pistas_ao_premio(
    premio: dict, pistas: int, catalogo, rng=_random,
    pesos: Optional[Dict[str, int]] = None, tipos=None,
) -> dict:
    """Bônus das Pistas de Sorte sobre um prêmio já sorteado (baú de corrida):
    mais Lunaris e, às vezes, um item extra. Não mexe em Créditos Sombrios."""
    pistas = max(0, min(PISTAS_MAX, int(pistas)))
    if pistas <= 0:
        return premio
    novo = dict(premio)
    novo["lunaris"] = round(int(premio.get("lunaris") or 0) * (1 + PISTA_BONUS_LUNARIS * pistas))
    existentes = {(i["id"] if isinstance(i, dict) else i.id) for i in premio.get("itens") or []}
    extras = _itens_extras_de_sorte(catalogo, rng, pistas, pesos, tipos, existentes)
    novo["itens"] = list(premio.get("itens") or []) + extras
    novo["sorte"] = {"pistas": pistas, "item_extra": bool(extras)}
    return novo


# Só objetos que fazem sentido como achado físico vão automaticamente para o
# cofre. Monstros são contratos do bestiário e veículos/peças agora pertencem
# à página de Bens, não ao inventário. A lista explícita também impede que um
# tipo novo da loja passe a cair em baús sem uma decisão de balanceamento.
TIPOS_PERMITIDOS_BAU = frozenset({
    "arma",
    "armadura",
    "artefato",
    "consumivel",
    "drop",
    "equipamento",
    "fruto-eden",
    "implante",
    "modificacao",
})

# Pesos de raridade especiais para itens do baú sombrio (mais épicos/lendários).
# A raridade Mítica de um item vive no catálogo como "reliquia" (ver
# core/catalogo.py); a chave era "mitico", que nunca casava com nenhum item.
PESOS_SOMBRIO = {
    "incomum": 5,
    "raro": 30,
    "epico": 45,
    "lendario": 15,
    "reliquia": 5,
}

# Créditos Sombrios que caem no baú sombrio (por raridade do baú). Só havia
# comum, raro e lendário: incomum, épico e mítico caíam no padrão (5, 15), que
# pagava menos que um baú raro.
CREDITOS_SOMBRIOS_BAU = {
    "comum":    (3,  8),
    "incomum":  (5,  14),
    "raro":     (10, 25),
    "epico":    (18, 40),
    "lendario": (30, 70),
    "mitico":   (60, 120),
}


def sortear_item_sombrio(catalogo, rng=_random, excluir_ids=None):
    """Sorteia 1 item marcado como mercado_negro no catálogo, ponderado por raridade sombria."""
    ids_bloqueados = set(excluir_ids or ())
    itens = [
        it for it in catalogo.listar()
        if it.conteudo.get("mercado_negro")
        and it.tipo in TIPOS_PERMITIDOS_BAU
        and it.id not in ids_bloqueados
    ]
    if not itens:
        # fallback: qualquer item raro/épico/lendário normal
        itens = [
            it for it in catalogo.listar()
            if it.tipo in TIPOS_PERMITIDOS_BAU
            and it.raridade in ("raro", "epico", "lendario", "reliquia")
            and it.id not in ids_bloqueados
        ]
    if not itens:
        return None
    por_raridade: Dict[str, List] = {}
    for it in itens:
        por_raridade.setdefault(it.raridade, []).append(it)
    raridades = [r for r in por_raridade if PESOS_SOMBRIO.get(r, 0) > 0]
    if not raridades:
        return None
    w = [PESOS_SOMBRIO[r] for r in raridades]
    escolhida = rng.choices(raridades, weights=w, k=1)[0]
    return rng.choice(por_raridade[escolhida])


def sortear_bau_sombrio(catalogo, qtd_itens: int = 2, rng=_random, raridade_bau: str = "raro") -> dict:
    """Sorteia o loot de um baú sombrio: itens do mercado negro + Créditos Sombrios."""
    itens = []
    ids_sorteados = set()
    for _ in range(max(1, qtd_itens)):
        it = sortear_item_sombrio(catalogo, rng=rng, excluir_ids=ids_sorteados)
        if it is not None:
            itens.append(it)
            ids_sorteados.add(it.id)
    cmin, cmax = CREDITOS_SOMBRIOS_BAU.get(raridade_bau, (5, 15))
    return {"itens": itens, "creditos_sombrios": rng.randint(cmin, cmax), "lunaris": 0}


def sortear_item(
    catalogo,
    rng=_random,
    pesos: Optional[Dict[str, int]] = None,
    tipos=None,
    excluir_ids=None,
):
    """Sorteia 1 item, ponderado por raridade.

    Um perfil de pesos explícito é autoritativo: raridades ausentes ou com
    peso zero não participam. Retorna None se não houver item elegível.
    """
    pesos = pesos if pesos is not None else PESOS_RARIDADE
    itens = [it for it in catalogo.listar() if it.tipo in TIPOS_PERMITIDOS_BAU]
    ids_bloqueados = set(excluir_ids or ())
    if ids_bloqueados:
        itens = [it for it in itens if it.id not in ids_bloqueados]
    if tipos:
        tipos_validos = TIPOS_PERMITIDOS_BAU.intersection(tipos)
        itens = [it for it in itens if it.tipo in tipos_validos]
    if not itens:
        return None
    por_raridade: Dict[str, List] = {}
    for it in itens:
        por_raridade.setdefault(it.raridade, []).append(it)
    raridades = [r for r in por_raridade if pesos.get(r, 0) > 0]
    if not raridades:
        return None
    w = [pesos[r] for r in raridades]
    escolhida = rng.choices(raridades, weights=w, k=1)[0]
    return rng.choice(por_raridade[escolhida])


def sortear_bau(catalogo, qtd_itens: int = 1, rng=_random,
                pesos: Optional[Dict[str, int]] = None,
                lunaris_min: int = LUNARIS_MIN, lunaris_max: int = LUNARIS_MAX, tipos=None) -> dict:
    itens = []
    ids_sorteados = set()
    for _ in range(max(1, qtd_itens)):
        it = sortear_item(
            catalogo,
            rng=rng,
            pesos=pesos,
            tipos=tipos,
            excluir_ids=ids_sorteados,
        )
        if it is not None:
            itens.append(it)
            ids_sorteados.add(it.id)
    return {"itens": itens, "lunaris": rng.randint(lunaris_min, lunaris_max), "creditos_sombrios": 0}


def agendar_proximo(
    min_hora: int,
    max_hora: int,
    rng=_random,
    agora: Optional[datetime] = None,
    *,
    proximo_dia: bool = False,
) -> datetime:
    """Sorteia o horário do próximo baú dentro da janela [min_hora, max_hora].

    `proximo_dia=True` (usado logo depois de um baú cair) sempre agenda para
    amanhã: um por dia, como o cog promete. Sem isso, o sorteio do horário de
    hoje que ainda estivesse no futuro valia, e o servidor via em média 2 baús
    por dia, com rajadas de até 7. Sem `proximo_dia`, o próximo horário
    possível vale (hoje, se ainda der tempo), que é o que se quer ao ligar os
    baús."""
    if min_hora > max_hora:
        min_hora, max_hora = max_hora, min_hora
    min_hora = max(0, min(23, int(min_hora)))
    max_hora = max(0, min(23, int(max_hora)))
    if agora is None:
        agora = datetime.now(TZ) if TZ else datetime.now()
    cand = agora.replace(hour=rng.randint(min_hora, max_hora), minute=rng.randint(0, 59), second=0, microsecond=0)
    if proximo_dia or cand <= agora:  # replace() mantém a data de `agora`
        cand = cand + timedelta(days=1)
    return cand
