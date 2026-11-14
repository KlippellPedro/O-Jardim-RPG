"""Extras da mesa (docs/propostas/mapa-ao-vivo/CONSTRUTOR_E_EXTENSOES.md, leva 6).

- aura presa ao token: um círculo em casas, com cor, que anda com ele (aura de paladino,
  área de controle). A aura escondida é só de quem comanda e do dono do token;
- mesa da campanha (`mapa_campanha.mesa`): pausa com recado, relógios de progresso e um
  cronômetro. O jogador só recebe o que o Mestre deixou à vista;
- fala de NPC: passa pelo tempo real e não fica gravada;
- vista inicial da cena: onde a tela de quem entra abre (centro e zoom).
"""

from __future__ import annotations

import math
import re
import time
from uuid import uuid4

AURA_MAXIMA_CASAS = 30
#: Como a aura se desenha (src/pages/Mapa/motor/auras.ts): campo (preenchido), anel (só o contorno), suave (esmaece
#: para fora), pulso (ondas que se abrem), tracejada (gira), ondas (borda que ondula) e chamas (borda de fogo).
ESTILOS_DE_AURA = ("campo", "anel", "suave", "pulso", "tracejada", "ondas", "chamas")
COR = re.compile(r"^#[0-9a-fA-F]{6}$")
ID_ITEM = re.compile(r"^[A-Za-z0-9_-]{1,40}$")
MAX_RELOGIOS = 12
PARTES_RELOGIO = (2, 12)
TEXTO_PAUSA_MAX = 140
NOME_MAX = 40
FALA_MAX = 400
#: Um cronômetro vai até 24 horas.
CRONOMETRO_MAX_MS = 24 * 60 * 60 * 1000
ZOOM_VISTA = (0.05, 4.0)


class ErroMesa(Exception):
    def __init__(self, mensagem: str, codigo: int = 422):
        super().__init__(mensagem)
        self.mensagem = mensagem
        self.codigo = codigo


def _numero(valor, campo: str, minimo: float, maximo: float) -> float:
    if isinstance(valor, bool) or not isinstance(valor, (int, float)) or not math.isfinite(valor):
        raise ErroMesa(f"{campo} invalido")
    return max(minimo, min(maximo, float(valor)))


def _texto(valor, limite: int) -> str:
    return " ".join(str(valor or "").split())[:limite]


def agora_ms() -> int:
    return int(time.time() * 1000)


# ------------------------------------------------------------------ aura

def normalizar_aura(dados) -> dict | None:
    """None tira a aura; senão raio (casas), cor, estilo e se os jogadores veem. Sem estilo, é o campo de sempre."""
    if dados is None:
        return None
    if not isinstance(dados, dict):
        raise ErroMesa("aura invalida")
    raio = _numero(dados.get("raio", 2), "raio da aura", 0.5, AURA_MAXIMA_CASAS)
    cor = dados.get("cor", "#7dd3fc")
    if not isinstance(cor, str) or not COR.fullmatch(cor):
        raise ErroMesa("cor da aura invalida")
    estilo = dados.get("estilo", "campo")
    if estilo not in ESTILOS_DE_AURA:
        raise ErroMesa("estilo da aura invalido")
    return {"raio": round(raio, 1), "cor": cor.lower(), "visivel": bool(dados.get("visivel", True)), "estilo": estilo}


def aura_vista(aura, *, gestor: bool, dono: bool) -> dict | None:
    """A aura que cada um recebe: a escondida é só de quem comanda e do dono."""
    if not isinstance(aura, dict):
        return None
    try:
        conferida = normalizar_aura(aura)
    except ErroMesa:
        return None
    if conferida and not conferida["visivel"] and not (gestor or dono):
        return None
    return conferida


# ------------------------------------------------------------------ mesa

def mesa_vazia() -> dict:
    return {"pausa": {"ligada": False, "texto": ""}, "relogios": [], "cronometro": None}


def _relogios(dados) -> list[dict]:
    if not isinstance(dados, list) or len(dados) > MAX_RELOGIOS:
        raise ErroMesa(f"a mesa tem ate {MAX_RELOGIOS} relogios")
    saida, ids = [], set()
    for bruto in dados:
        if not isinstance(bruto, dict):
            raise ErroMesa("relogio invalido")
        relogio_id = bruto.get("id")
        if not isinstance(relogio_id, str) or not ID_ITEM.fullmatch(relogio_id) or relogio_id in ids:
            relogio_id = f"r{uuid4().hex[:10]}"
        ids.add(relogio_id)
        partes = int(_numero(bruto.get("partes", 4), "partes do relogio", *PARTES_RELOGIO))
        cheias = int(_numero(bruto.get("cheias", 0), "partes cheias do relogio", 0, partes))
        saida.append({
            "id": relogio_id,
            "nome": _texto(bruto.get("nome"), NOME_MAX) or "Relógio",
            "partes": partes,
            "cheias": cheias,
            "visivel": bool(bruto.get("visivel", True)),
        })
    return saida


def _cronometro(dados) -> dict | None:
    """Cronômetro regressivo: `fim` (ms do relógio do servidor) quando corre, `restante` quando
    está parado. Os dois vazios: zerado."""
    if dados is None:
        return None
    if not isinstance(dados, dict):
        raise ErroMesa("cronometro invalido")
    fim = dados.get("fim")
    restante = dados.get("restante")
    agora = agora_ms()
    if fim is not None:
        fim = int(_numero(fim, "fim do cronometro", agora, agora + CRONOMETRO_MAX_MS))
        restante = None
    elif restante is not None:
        restante = int(_numero(restante, "tempo do cronometro", 0, CRONOMETRO_MAX_MS))
    return {
        "nome": _texto(dados.get("nome"), NOME_MAX) or "Cronômetro",
        "fim": fim,
        "restante": restante,
        "visivel": bool(dados.get("visivel", True)),
    }


def normalizar_mesa(dados, atual: dict | None = None) -> dict:
    """Junta o que mudou (pausa, relógios, cronômetro) com o que já estava."""
    if not isinstance(dados, dict):
        raise ErroMesa("mesa invalida")
    mesa = ler_mesa(atual)
    if "pausa" in dados:
        pausa = dados["pausa"]
        if not isinstance(pausa, dict):
            raise ErroMesa("pausa invalida")
        mesa["pausa"] = {
            "ligada": bool(pausa.get("ligada", False)),
            "texto": _texto(pausa.get("texto"), TEXTO_PAUSA_MAX),
        }
    if "relogios" in dados:
        mesa["relogios"] = _relogios(dados["relogios"])
    if "cronometro" in dados:
        mesa["cronometro"] = _cronometro(dados["cronometro"])
    return mesa


def ler_mesa(dados) -> dict:
    """O que está gravado; registro quebrado vira mesa vazia (nada de pausa presa)."""
    mesa = mesa_vazia()
    if not isinstance(dados, dict):
        return mesa
    pausa = dados.get("pausa")
    if isinstance(pausa, dict):
        mesa["pausa"] = {"ligada": bool(pausa.get("ligada")), "texto": _texto(pausa.get("texto"), TEXTO_PAUSA_MAX)}
    try:
        mesa["relogios"] = _relogios(dados.get("relogios") or [])
    except ErroMesa:
        mesa["relogios"] = []
    cronometro = dados.get("cronometro")
    if isinstance(cronometro, dict):
        fim = cronometro.get("fim")
        restante = cronometro.get("restante")
        mesa["cronometro"] = {
            "nome": _texto(cronometro.get("nome"), NOME_MAX) or "Cronômetro",
            "fim": int(fim) if isinstance(fim, (int, float)) and not isinstance(fim, bool) else None,
            "restante": int(restante) if isinstance(restante, (int, float)) and not isinstance(restante, bool) else None,
            "visivel": bool(cronometro.get("visivel", True)),
        }
    return mesa


def mesa_de(mesa: dict, *, gestor: bool) -> dict:
    """O que cada um recebe da mesa (o navegador conta o cronômetro pelo relógio do servidor)."""
    saida = dict(mesa)
    if gestor:
        return saida
    saida["relogios"] = [relogio for relogio in mesa["relogios"] if relogio["visivel"]]
    if mesa["cronometro"] and not mesa["cronometro"]["visivel"]:
        saida["cronometro"] = None
    return saida


# ------------------------------------------------------------------ fala

def normalizar_fala(dados) -> dict:
    if not isinstance(dados, dict):
        raise ErroMesa("fala invalida")
    texto = str(dados.get("texto") or "").replace("\r\n", "\n").strip()[:FALA_MAX]
    if not texto:
        raise ErroMesa("a fala precisa de um texto")
    token = dados.get("token")
    if token is not None and (not isinstance(token, str) or not 1 <= len(token) <= 64):
        raise ErroMesa("token da fala invalido")
    return {"nome": _texto(dados.get("nome"), NOME_MAX) or "Mestre", "texto": texto, "token": token}


# ------------------------------------------------------------------ vista inicial

def normalizar_vista(dados, largura: int, altura: int) -> dict | None:
    if dados is None:
        return None
    if not isinstance(dados, dict):
        raise ErroMesa("vista invalida")
    return {
        "x": round(_numero(dados.get("x"), "centro da vista", 0, largura), 1),
        "y": round(_numero(dados.get("y"), "centro da vista", 0, altura), 1),
        "zoom": round(_numero(dados.get("zoom", 1), "zoom da vista", *ZOOM_VISTA), 3),
    }


def ler_vista(estrutura) -> dict | None:
    if not isinstance(estrutura, dict) or not isinstance(estrutura.get("vista"), dict):
        return None
    vista = estrutura["vista"]
    if all(isinstance(vista.get(c), (int, float)) and not isinstance(vista.get(c), bool) for c in ("x", "y", "zoom")):
        return {"x": float(vista["x"]), "y": float(vista["y"]), "zoom": float(vista["zoom"])}
    return None
