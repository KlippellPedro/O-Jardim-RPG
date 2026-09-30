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
# Graus de perícia do menor para o maior (iniciante ... absoluto): fonte única do site e da plataforma.
GRAUS_PERICIA_DADOS: tuple[dict, ...] = tuple(_DADOS["graus_pericia"]["graus"])
GRAUS_PERICIA: tuple[str, ...] = tuple(grau["id"] for grau in GRAUS_PERICIA_DADOS)
BONUS_GRAU: dict[str, int] = {grau["id"]: int(grau["bonus"]) for grau in GRAUS_PERICIA_DADOS}
ROTULO_GRAU: dict[str, str] = {grau["id"]: grau["rotulo"] for grau in GRAUS_PERICIA_DADOS}
# Nível total mínimo de cada grau de perícia, na ordem dos graus.
NIVEL_MINIMO_GRAU: tuple[int, ...] = tuple(int(grau["nivel_minimo"]) for grau in GRAUS_PERICIA_DADOS)
# Valor de Desafio: nível do grupo que a criatura desafia sozinha. O máximo só
# barra digitação absurda (únicas podem passar do 100); o XP é um quinto do custo.
VD_MAXIMO: int = int(_DADOS["combate"]["vd_maximo"])
_XP_DIVISOR_POR_VD: int = int(_DADOS["combate"]["xp_divisor_por_vd"])
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


def custo_do_nivel(nivel: object) -> int:
    """XP para sair do nível informado e chegar ao seguinte."""
    atual = _nivel_inteiro(nivel, 1)
    return xp_para_nivel(atual + 1) - xp_para_nivel(atual)


def xp_por_vd(vd: object) -> int:
    """XP de uma criatura solo de um VD: um quinto do custo do nível de mesmo
    número. Vazio paga 0; abaixo de 1 vale como 1, acima do máximo como o máximo."""
    if vd is None or vd == "":
        return 0
    alvo = min(VD_MAXIMO, _nivel_inteiro(vd, 1))
    return custo_do_nivel(alvo) // _XP_DIVISOR_POR_VD


def vd_antigo_para_nivel(vd_antigo: int) -> int:
    """O VD antigo ia de 1 a 10 (cada um uma faixa de 5 níveis de criatura).
    Devolve o VD de hoje no meio da faixa: 1 vira 3, 2 vira 8, ..., 10 vira 48.
    A migração 46 faz a mesma conta em SQL (5 * vd - 2)."""
    return 5 * int(vd_antigo) - 2


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


_ROMANOS = ("I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X")


def rotulo_do_patamar(nivel_total: object) -> str | None:
    """"Patamar I" a partir do primeiro patamar, ou None dentro do padrão."""
    alcancados = patamares_alcancados(nivel_total)
    if not alcancados:
        return None
    return f"Patamar {_ROMANOS[min(len(alcancados), len(_ROMANOS)) - 1]}"


def patamar_novo(nivel_antes: object, nivel_depois: object) -> int | None:
    """O patamar em que a ficha ENTROU ao ir de um nível total ao outro (o maior
    novo), ou None quando não entrou em nenhum. Descer de nível nunca conta."""
    antes = set(patamares_alcancados(nivel_antes))
    novos = [patamar for patamar in patamares_alcancados(nivel_depois) if patamar not in antes]
    return max(novos) if novos else None


def patamar_atual(nivel_total: object) -> int | None:
    """Maior patamar alcançado, ou None enquanto vale o padrão."""
    alcancados = patamares_alcancados(nivel_total)
    return alcancados[-1] if alcancados else None
