"""Ritmos de nível (XP, Legado, atributo, patamares).

Lidos de data/ficha/progressao-niveis.json, o mesmo arquivo que o frontend lê
em src/services/progressaoNiveis.ts. A plataforma e o site saem em pacotes
separados, então o que os dois compartilham é o arquivo de dados, não código.
O nível total não tem teto: nada aqui bloqueia, só diz quanto vale cada faixa.
"""

from __future__ import annotations

import json
import math
from pathlib import Path


def _localizar_data_root() -> Path:
    """Mesma resolução de plataforma/main.py::_DATA_ROOT: `data/` empacotado
    ao lado da plataforma no ZIP de deploy, ou `data/` na raiz do repositório
    em desenvolvimento."""
    app_root = Path(__file__).resolve().parent.parent
    local = app_root / "data"
    return local if local.exists() else app_root.parent / "data"


def _carregar() -> dict:
    caminho = _localizar_data_root() / "ficha" / "progressao-niveis.json"
    return json.loads(caminho.read_text(encoding="utf-8"))


_DADOS = _carregar()

_XP_FORMULA = _DADOS["xp"]["formula"]
_XP_FAIXAS = sorted(_DADOS["xp"]["faixas"], key=lambda faixa: faixa["a_partir_do_nivel"])
_FAIXAS_LEGADO = sorted(_DADOS["legados"]["faixas"], key=lambda faixa: faixa["a_partir_do_nivel"])
_FAIXAS_ATRIBUTO = sorted(_DADOS["aumento_atributo"]["faixas"], key=lambda faixa: faixa["a_partir_do_nivel"])
_FAIXAS_ITEM_ESPECIAL = sorted(_DADOS["item_especial"]["faixas"], key=lambda faixa: faixa["a_partir_do_nivel"])
_ITEM_ESPECIAL_MINIMO = max(0, int(_DADOS["item_especial"].get("minimo") or 0))

# Onde a classe deixa de ter recompensa escrita e teto do botão de subir nível.
NIVEL_CONTEUDO_CLASSE: int = _DADOS["classe"]["nivel_conteudo"]
NIVEL_MAXIMO_CLASSE: int = _DADOS["classe"]["nivel_maximo"]
# Nível total mínimo de cada grau de perícia (iniciante ... renomado).
NIVEL_MINIMO_GRAU: tuple[int, ...] = tuple(int(nivel) for nivel in _DADOS["graus_pericia"]["nivel_minimo"])
# Níveis totais em que o personagem muda de patamar, em ordem crescente.
PATAMARES_NIVEL: tuple[int, ...] = tuple(sorted(_DADOS["patamares"]["niveis"]))
# Onde terminam as regras padrão (duas classes comuns + uma especial): o primeiro patamar.
NIVEL_TOTAL_PADRAO: int = PATAMARES_NIVEL[0]

_NIVEL_BUSCA_MAXIMO = 1_000_000


def _nivel_inteiro(nivel: object, minimo: int) -> int:
    try:
        return max(minimo, math.trunc(float(nivel)))  # type: ignore[arg-type]
    except (TypeError, ValueError, OverflowError):
        return minimo


def xp_para_nivel(nivel: object) -> int:
    """XP acumulado necessário para ALCANÇAR o nível (o nível 1 custa 0)."""
    alvo = _nivel_inteiro(nivel, 1)
    na_formula = min(alvo, _XP_FORMULA["ate_nivel"])
    total = _XP_FORMULA["custo_por_nivel"] * na_formula * (na_formula - 1) // 2
    for indice, faixa in enumerate(_XP_FAIXAS):
        fim = _XP_FAIXAS[indice + 1]["a_partir_do_nivel"] if indice + 1 < len(_XP_FAIXAS) else None
        limite = alvo if fim is None else min(alvo, fim)
        niveis = limite - faixa["a_partir_do_nivel"]
        if niveis > 0:
            total += niveis * faixa["custo_por_nivel"]
    return total


def nivel_por_xp(xp: object) -> int:
    """Maior nível cujo XP acumulado cabe no valor informado."""
    try:
        valor = float(xp)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        valor = 0.0
    if not math.isfinite(valor) or valor < 0:
        valor = 0.0
    baixo, alto = 1, 2
    while alto < _NIVEL_BUSCA_MAXIMO and xp_para_nivel(alto) <= valor:
        baixo, alto = alto, alto * 2
    while alto - baixo > 1:
        meio = (baixo + alto) // 2
        if xp_para_nivel(meio) <= valor:
            baixo = meio
        else:
            alto = meio
    return baixo


def _contar_por_faixas(nivel: object, faixas: list[dict]) -> int:
    alvo = _nivel_inteiro(nivel, 0)
    total = 0
    for indice, faixa in enumerate(faixas):
        fim = faixas[indice + 1]["a_partir_do_nivel"] if indice + 1 < len(faixas) else None
        limite = alvo if fim is None else min(alvo, fim)
        niveis = limite - faixa["a_partir_do_nivel"]
        if niveis > 0:
            total += niveis // faixa["a_cada"]
    return total


def legados_por_nivel(nivel_total: object) -> int:
    """Legados de Ascensão a que o nível total dá direito (sem os raciais)."""
    return _contar_por_faixas(nivel_total, _FAIXAS_LEGADO)


def aumentos_atributo_por_nivel(nivel_total: object) -> int:
    """Aumentos de +1 em atributo a que o nível total dá direito."""
    return _contar_por_faixas(nivel_total, _FAIXAS_ATRIBUTO)


def vagas_item_especial_por_nivel(nivel_total: object) -> int:
    """Vagas de item especial: pelo menos 1, depois seguem o ritmo do atributo."""
    return max(_ITEM_ESPECIAL_MINIMO, _contar_por_faixas(nivel_total, _FAIXAS_ITEM_ESPECIAL))


def patamares_alcancados(nivel_total: object) -> list[int]:
    """Patamares já alcançados pelo nível total (vazio abaixo do primeiro)."""
    alvo = _nivel_inteiro(nivel_total, 0)
    return [patamar for patamar in PATAMARES_NIVEL if alvo >= patamar]


def patamar_atual(nivel_total: object) -> int | None:
    """Maior patamar alcançado, ou None enquanto vale o padrão."""
    alcancados = patamares_alcancados(nivel_total)
    return alcancados[-1] if alcancados else None
