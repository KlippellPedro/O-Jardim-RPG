"""Regras de chefe na Sessão: Ímpeto, Determinação e Guarda (Guia do Mestre, estante ameaca).

Cada participante pode ter `chefe` (JSONB em sessao_participantes). Sem a coluna
preenchida, a criatura não usa nenhuma das três regras. Com ela:

- **Ímpeto**: o lado do chefe tem pontos iguais a jogadores menos inimigos em cena
  (contando o próprio chefe), com 1 a menos se algum chefe tiver covil. É um bolso
  só para todos os chefes da cena: o gasto de cada um soma. Volta inteiro quando
  começa o turno de um chefe que usa Ímpeto. No máximo um ponto por turno de
  jogador, e só no turno de um jogador.
- **Determinação**: 1 ponto no começo da luta e o ponto volta a 1 a cada fase nova
  (o que sobra não passa). Gastar deixa o chefe Exposto e enche uma parte da Guarda.
- **Guarda**: relógio de 4 a 6 partes. Cheia, quebra: Exposto, sem reação até o
  próximo turno dele, próximo ataque contra ele com vantagem, e volta a zero.

O módulo é puro: recebe e devolve dicionários. Quem grava é routers/sessions.py.
"""

from __future__ import annotations

from typing import Any, Iterable

PARTES_DA_GUARDA = (4, 5, 6)
MAXIMO_DETERMINACAO = 9
MAXIMO_IMPETO = 20

# O que a quebra da Guarda (e o gasto de Determinação) põe no chefe. "turnos": 1
# some na virada da rodada, que é quando o turno dele volta.
EXPOSTO = {"nome": "Exposto", "turnos": 1}
GUARDA_QUEBRADA = {"nome": "Guarda quebrada", "turnos": 1}

MOTIVOS_DA_GUARDA = {
    "critico": "um crítico",
    "ousada": "um acerto ousado",
    "combinado": "um ataque combinado",
    "fraqueza": "a fraqueza dele",
    "determinacao": "a Determinação gasta",
}


def _inteiro(valor: Any, minimo: int, maximo: int, padrao: int = 0) -> int:
    if isinstance(valor, bool) or not isinstance(valor, (int, float)):
        return padrao
    return max(minimo, min(maximo, int(valor)))


def chefe_limpo(valor: Any) -> dict | None:
    """O que a coluna `chefe` pode ter, com tipos garantidos. Lixo vira None."""
    if not isinstance(valor, dict):
        return None
    partes = valor.get("guarda_partes")
    partes = int(partes) if isinstance(partes, int) and not isinstance(partes, bool) and partes in PARTES_DA_GUARDA else 0
    turno = valor.get("impeto_turno")
    return {
        "impeto": bool(valor.get("impeto", True)),
        "covil": bool(valor.get("covil", False)),
        "determinacao": _inteiro(valor.get("determinacao"), 0, MAXIMO_DETERMINACAO, 1),
        "guarda_partes": partes,
        "guarda": _inteiro(valor.get("guarda"), 0, max(0, partes - 1)) if partes else 0,
        "impeto_gasto": _inteiro(valor.get("impeto_gasto"), 0, MAXIMO_IMPETO),
        "impeto_turno": turno[:40] if isinstance(turno, str) and turno else None,
    }


def configurar(atual: dict | None, *, impeto: bool, covil: bool, guarda_partes: int) -> dict:
    """Liga as regras ou muda a configuração, mantendo o que já foi gasto."""
    base = chefe_limpo(atual) or chefe_limpo({})
    base["impeto"] = bool(impeto)
    base["covil"] = bool(covil)
    base["guarda_partes"] = guarda_partes if guarda_partes in PARTES_DA_GUARDA else 0
    base["guarda"] = min(base["guarda"], max(0, base["guarda_partes"] - 1)) if base["guarda_partes"] else 0
    if not base["impeto"]:
        base["impeto_gasto"], base["impeto_turno"] = 0, None
    return base


def chefe_novo_para(conteudo: Any) -> dict | None:
    """Criatura do Bestiário que já nasce com as regras ligadas: papel chefe, única ou com fases."""
    if not isinstance(conteudo, dict):
        return None
    if conteudo.get("papel") == "chefe" or conteudo.get("unico") or conteudo.get("fases"):
        return chefe_limpo({})
    return None


def _vivo(linha: dict) -> bool:
    vida_maxima = int(linha.get("vida_maxima") or 0)
    return vida_maxima == 0 or int(linha.get("vida_atual") or 0) > 0


def impeto_da_cena(linhas: Iterable[dict]) -> dict:
    """O bolso de Ímpeto da cena: máximo, gasto, restante e se já saiu ponto neste turno.

    `linhas` são os participantes com `tipo`, `vida_atual`, `vida_maxima`,
    `visibilidade` e `chefe`. Criatura oculta ainda não entrou na cena e não conta.
    """
    linhas = list(linhas)
    jogadores = sum(1 for linha in linhas if linha.get("tipo") == "jogador" and _vivo(linha))
    inimigos = sum(
        1 for linha in linhas
        if linha.get("tipo") == "inimigo" and _vivo(linha) and linha.get("visibilidade") != "oculto"
    )
    chefes = [chefe for chefe in (chefe_limpo(linha.get("chefe")) for linha in linhas) if chefe and chefe["impeto"]]
    covil = any(chefe["covil"] for chefe in chefes)
    maximo = max(0, jogadores - inimigos - (1 if covil else 0)) if chefes else 0
    gasto = sum(chefe["impeto_gasto"] for chefe in chefes)
    return {
        "maximo": maximo,
        "gasto": min(gasto, maximo),
        "restante": max(0, maximo - gasto),
        "turnos_usados": {chefe["impeto_turno"] for chefe in chefes if chefe["impeto_turno"]},
    }


def chave_do_turno(rodada: int, indice: int) -> str:
    return f"{int(rodada)}:{int(indice)}"


def gastar_impeto(chefe: dict, bolso: dict, turno: str) -> dict:
    if not chefe["impeto"]:
        raise ValueError("essa criatura nao usa Impeto")
    if bolso["restante"] <= 0:
        raise ValueError("o Impeto da cena acabou ate o proximo turno do chefe")
    if turno in bolso["turnos_usados"]:
        raise ValueError("ja saiu um ponto de Impeto neste turno")
    return {**chefe, "impeto_gasto": min(MAXIMO_IMPETO, chefe["impeto_gasto"] + 1), "impeto_turno": turno}


def devolver_impeto(chefe: dict) -> dict:
    """Desfaz o último ponto gasto (clique errado)."""
    if chefe["impeto_gasto"] <= 0:
        raise ValueError("nao ha Impeto gasto para devolver")
    return {**chefe, "impeto_gasto": chefe["impeto_gasto"] - 1, "impeto_turno": None}


def encher_impeto(chefe: dict) -> dict:
    return {**chefe, "impeto_gasto": 0, "impeto_turno": None}


def encher_guarda(chefe: dict) -> tuple[dict, bool]:
    """Uma parte a mais. Devolve (chefe, quebrou): cheia, a Guarda volta a zero."""
    partes = chefe["guarda_partes"]
    if not partes:
        return chefe, False
    cheias = chefe["guarda"] + 1
    if cheias >= partes:
        return {**chefe, "guarda": 0}, True
    return {**chefe, "guarda": cheias}, False


def esvaziar_guarda(chefe: dict) -> dict:
    if not chefe["guarda_partes"] or chefe["guarda"] <= 0:
        raise ValueError("a Guarda ja esta vazia")
    return {**chefe, "guarda": chefe["guarda"] - 1}


def gastar_determinacao(chefe: dict) -> tuple[dict, bool]:
    """Passa num teste de condição. Custa: Exposto, e uma parte da Guarda se ele tiver."""
    if chefe["determinacao"] <= 0:
        raise ValueError("nao sobrou Determinacao nesta fase")
    chefe = {**chefe, "determinacao": chefe["determinacao"] - 1}
    return encher_guarda(chefe)


def ao_comecar_luta(chefe: dict) -> dict:
    return {**chefe, "determinacao": 1, "guarda": 0, "impeto_gasto": 0, "impeto_turno": None}


def ao_subir_fase(chefe: dict) -> dict:
    """Fase nova: 1 ponto de Determinação, e o que sobrou da fase anterior não passa."""
    return {**chefe, "determinacao": 1}


def com_condicoes(condicoes: list[dict], *novas: dict) -> list[dict]:
    """Acrescenta as condições, renovando o prazo de quem já estava lá."""
    nomes = {item["nome"].lower() for item in novas}
    return [item for item in condicoes if str(item.get("nome", "")).lower() not in nomes] + [dict(item) for item in novas]
