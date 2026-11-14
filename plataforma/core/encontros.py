"""Cópias de token e encontros salvos: as contas, sem banco nem HTTP.

Um **molde** é um token (e, se ele é uma criatura da Sessão, o participante dele) guardado para ser refeito:
o nome, o porte, o lado, a arte, a moldura, a luz, a aura e, da criatura, a Vida, a Defesa, os ataques e o
que mais a Sessão precisa. Duplicar um token e soltar um encontro salvo usam o mesmo molde.

Um **encontro** é um grupo de moldes com a posição de cada um em relação ao centro do grupo, então ele cabe
em qualquer ponto de qualquer mapa. Fica em `mapa_campanha.encontros` (só o Mestre lê). O que não entra num
molde, de propósito: personagem de jogador (o token dele é dele), recipiente de loot (a tabela rolada seria
copiada) e qualquer segredo de outra tabela.
"""

from __future__ import annotations

import math
from uuid import uuid4

from core import mapa

MAX_ENCONTROS = 30
MAX_MOLDES_POR_ENCONTRO = 40
MAX_COPIAS = 20
NOME_MAXIMO = 60
#: O que se leva do token e da criatura da Sessão para o molde.
CAMPOS_DO_TOKEN = ("nome", "porte", "lado", "imagem_id", "moldura", "camada", "luz", "aura", "flip_x", "flip_y", "enquadramento", "barras", "nota_mestre", "oculto")
CAMPOS_DA_CRIATURA = ("nome", "tipo", "iniciativa", "vida_maxima", "defesa", "mana_maxima", "estamina_maxima", "ataques", "vd", "pericias", "monstro_id", "visibilidade")
VISIBILIDADES = ("oculto", "desconhecido", "parcial", "total")
TIPOS_DA_CRIATURA = ("aliado", "inimigo")


class ErroEncontro(ValueError):
    def __init__(self, mensagem: str, codigo: int = 422):
        super().__init__(mensagem)
        self.mensagem = mensagem
        self.codigo = codigo


def _texto(valor, maximo: int) -> str:
    return " ".join(str(valor or "").split())[:maximo]


def _numero(valor, padrao: float = 0.0) -> float:
    if isinstance(valor, bool) or not isinstance(valor, (int, float)) or not math.isfinite(valor):
        return padrao
    return float(valor)


def _inteiro(valor, minimo: int, maximo: int, padrao: int | None = None) -> int | None:
    if isinstance(valor, bool) or not isinstance(valor, (int, float)) or not math.isfinite(valor):
        return padrao
    return max(minimo, min(maximo, int(valor)))


def _json(valor):
    """Só o que o JSON guarda: UUID e datas viram texto, o resto passa."""
    if valor is None or isinstance(valor, (str, int, float, bool)):
        return valor
    if isinstance(valor, dict):
        return {str(chave): _json(item) for chave, item in valor.items()}
    if isinstance(valor, (list, tuple)):
        return [_json(item) for item in valor]
    return str(valor)


def criatura_do_participante(participante: dict | None) -> dict | None:
    """O que da criatura da Sessão volta a existir quando o molde é usado. Personagem de jogador nunca vira molde."""
    if not participante or participante.get("personagem_id"):
        return None
    tipo = participante.get("tipo")
    saida = {
        "nome": _texto(participante.get("nome"), NOMES_MAXIMOS["criatura"]) or "Criatura",
        "tipo": tipo if tipo in TIPOS_DA_CRIATURA else "inimigo",
        "iniciativa": _inteiro(participante.get("iniciativa"), -99, 999, 0),
        "vida_maxima": _inteiro(participante.get("vida_maxima"), 0, 99_999, 0),
        "defesa": _inteiro(participante.get("defesa"), 0, 999),
        "mana_maxima": _inteiro(participante.get("mana_maxima"), 0, 99_999),
        "estamina_maxima": _inteiro(participante.get("estamina_maxima"), 0, 99_999),
        "ataques": _json(participante.get("ataques")) if isinstance(participante.get("ataques"), list) else [],
        "vd": _inteiro(participante.get("vd"), 1, 100),
        "pericias": _json(participante.get("pericias")) if isinstance(participante.get("pericias"), list) else [],
        "monstro_id": participante.get("monstro_id") if isinstance(participante.get("monstro_id"), str) and len(participante["monstro_id"]) <= 160 else None,
        "visibilidade": participante.get("visibilidade") if participante.get("visibilidade") in VISIBILIDADES else "parcial",
    }
    saida["ataques"] = saida["ataques"][:12]
    saida["pericias"] = saida["pericias"][:8]
    return saida


NOMES_MAXIMOS = {"criatura": 80, "token": NOME_MAXIMO}


def molde_do_token(token: dict, participante: dict | None = None, dx: float = 0.0, dy: float = 0.0) -> dict:
    """O molde de um token da cena (`dx` e `dy`: onde ele está em relação ao centro do grupo, em px)."""
    saida = {campo: _json(token.get(campo)) for campo in CAMPOS_DO_TOKEN}
    saida["nome"] = _texto(token.get("nome"), NOME_MAXIMO) or None
    return {"dx": round(dx, 1), "dy": round(dy, 1), "token": saida, "criatura": criatura_do_participante(participante)}


def _molde_valido(bruto) -> dict | None:
    """Um molde lido do banco: o que está quebrado é descartado, nunca consertado no escuro."""
    if not isinstance(bruto, dict) or not isinstance(bruto.get("token"), dict):
        return None
    token = bruto["token"]
    lado = token.get("lado") if token.get("lado") in mapa.LADOS else "neutro"
    camada = token.get("camada") if token.get("camada") in mapa.CAMADAS_TOKEN else "personagens"
    limpo = {
        "nome": _texto(token.get("nome"), NOME_MAXIMO) or None,
        "porte": _inteiro(token.get("porte"), 1, 6, 1),
        "lado": lado,
        "imagem_id": token.get("imagem_id") if isinstance(token.get("imagem_id"), str) and len(token["imagem_id"]) <= 40 else None,
        "moldura": token.get("moldura") if isinstance(token.get("moldura"), str) and len(token["moldura"]) <= 40 else None,
        "camada": camada,
        "luz": token.get("luz") if isinstance(token.get("luz"), dict) else None,
        "aura": token.get("aura") if isinstance(token.get("aura"), dict) else None,
        "flip_x": token.get("flip_x") is True,
        "flip_y": token.get("flip_y") is True,
        "enquadramento": token.get("enquadramento") if isinstance(token.get("enquadramento"), dict) else {},
        "barras": token.get("barras") if isinstance(token.get("barras"), dict) else {},
        "nota_mestre": _texto(token.get("nota_mestre"), 4000),
        "oculto": token.get("oculto") is True,
    }
    criatura = bruto.get("criatura")
    return {
        "dx": round(max(-20000.0, min(20000.0, _numero(bruto.get("dx")))), 1),
        "dy": round(max(-20000.0, min(20000.0, _numero(bruto.get("dy")))), 1),
        "token": limpo,
        "criatura": criatura_do_participante({**criatura, "personagem_id": None}) if isinstance(criatura, dict) else None,
    }


def normalizar_encontro(bruto) -> dict | None:
    if not isinstance(bruto, dict):
        return None
    moldes = [molde for molde in (_molde_valido(item) for item in (bruto.get("moldes") or [])[:MAX_MOLDES_POR_ENCONTRO]) if molde]
    nome = _texto(bruto.get("nome"), NOME_MAXIMO)
    if not moldes or not nome:
        return None
    identificador = bruto.get("id")
    return {
        "id": identificador if isinstance(identificador, str) and 0 < len(identificador) <= 40 else uuid4().hex[:16],
        "nome": nome,
        "moldes": moldes,
    }


def normalizar_encontros(bruto) -> list[dict]:
    if not isinstance(bruto, list):
        return []
    saida = []
    for item in bruto[:MAX_ENCONTROS]:
        encontro = normalizar_encontro(item)
        if encontro:
            saida.append(encontro)
    return saida


def encontro_novo(nome: str, tokens: list[dict], participantes: dict[str, dict]) -> dict:
    """Salva os tokens dados como um encontro, posições em relação ao centro do grupo.

    `participantes` é o participante da Sessão de cada token que tem um, pelo id do participante.
    Personagem de jogador fica de fora: o token dele não é um molde.
    """
    escolhidos = [t for t in tokens if not t.get("personagem_id") and not t.get("personagem_efetivo")]
    if not escolhidos:
        raise ErroEncontro("nao ha token para guardar: personagens de jogador ficam de fora")
    if len(escolhidos) > MAX_MOLDES_POR_ENCONTRO:
        raise ErroEncontro(f"um encontro guarda no maximo {MAX_MOLDES_POR_ENCONTRO} tokens")
    titulo = _texto(nome, NOME_MAXIMO)
    if not titulo:
        raise ErroEncontro("de um nome ao encontro")
    cx = sum(float(t["x"]) for t in escolhidos) / len(escolhidos)
    cy = sum(float(t["y"]) for t in escolhidos) / len(escolhidos)
    moldes = [
        molde_do_token(t, participantes.get(str(t.get("participante_id"))) if t.get("participante_id") else None, float(t["x"]) - cx, float(t["y"]) - cy)
        for t in escolhidos
    ]
    return {"id": uuid4().hex[:16], "nome": titulo, "moldes": moldes}


def nome_numerado(base: str | None, usados: set[str]) -> str:
    """"Lobo" com "Lobo" na cena vira "Lobo 2"; com "Lobo 2" também na cena, "Lobo 3". Um número no fim do nome
    base ("Lobo 2") conta como parte da numeração, não do nome."""
    limpo = _texto(base, NOME_MAXIMO) or "Token"
    partes = limpo.rsplit(" ", 1)
    raiz = partes[0] if len(partes) == 2 and partes[1].isdigit() else limpo
    n = 2
    while True:
        candidato = f"{raiz} {n}"
        if candidato not in usados:
            return candidato[:NOME_MAXIMO]
        n += 1


def posicoes_livres(origem: tuple[float, float], ocupadas: list[tuple[float, float]], casa: float, quantidade: int, largura: float, altura: float) -> list[tuple[float, float]]:
    """Centros de casa em volta de `origem` (anéis cada vez maiores) que ainda estão vazios e dentro do mapa."""
    if casa <= 0 or quantidade <= 0:
        return []
    # O ponto de partida encaixa no centro da casa mais próxima.
    base_x = (math.floor(origem[0] / casa) + 0.5) * casa
    base_y = (math.floor(origem[1] / casa) + 0.5) * casa
    tomadas = list(ocupadas)
    saida: list[tuple[float, float]] = []
    for anel in range(0, 60):
        deslocamentos = [(0, 0)] if anel == 0 else sorted(
            {(i, j) for i in range(-anel, anel + 1) for j in range(-anel, anel + 1) if max(abs(i), abs(j)) == anel},
            key=lambda d: (math.hypot(*d), d),
        )
        for i, j in deslocamentos:
            x, y = base_x + i * casa, base_y + j * casa
            if x < 0 or y < 0 or x > largura or y > altura:
                continue
            if any(math.hypot(x - ox, y - oy) < casa * 0.45 for ox, oy in tomadas):
                continue
            saida.append((x, y))
            tomadas.append((x, y))
            if len(saida) >= quantidade:
                return saida
    return saida
