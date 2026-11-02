"""Regras do mapa ao vivo: grade, barras dos tokens, quem move o quê e o que cada um vê.

Como `core/mesa.py`, este módulo não conhece banco nem HTTP. Recebe as linhas
já lidas (token, participante da sessão, ficha) e quem está olhando, e devolve
o recorte daquele papel. A regra de segredo mora aqui num lugar só:

- token oculto pelo Mestre não sai para jogador;
- token ligado a um participante da sessão segue os quatro degraus de
  visibilidade da Sessão (oculto, desconhecido, parcial, total);
- as barras de cada token obedecem à escolha do dono (todos, só eu e o Mestre,
  ninguém), e nunca mostram número que o degrau do participante esconde.
"""

from __future__ import annotations

import math
import re
from dataclasses import dataclass, field

TIPOS_GRADE = ("quadrada", "hex", "nenhuma")
LADOS = ("jogador", "aliado", "inimigo", "neutro")
BARRAS = ("vida", "mana", "estamina", "sanidade")
PARA_QUEM = ("todos", "dono", "ninguem")
PORTE_MAXIMO = 6
COR = re.compile(r"^#[0-9a-fA-F]{6}$")

FLUXOS = (
    "origem", "essencia", "comunicacao", "vitalidade", "inconstancia", "fisico",
    "espaco", "tempo", "vazio", "fim", "tecnologia",
)
#: Molduras que o site sabe desenhar (src/pages/Mapa/motor/molduras.ts). "nivel" é a
#: escada do retrato da ficha; "lado" é o aro simples na cor do lado do token.
MOLDURAS = (
    "nivel", "lado", "ferro", "ouro", "madeira", "osso", "runa", "cristal", "raiz", "sombra",
    *(f"fluxo-{fluxo}" for fluxo in FLUXOS),
)
ENQUADRAMENTO_PADRAO = {"zoom": 1.0, "x": 0.0, "y": 0.0}

GRADE_PADRAO = {
    "tipo": "quadrada",
    "tamanho": 100,
    "x": 0.0,
    "y": 0.0,
    "cor": "#ffffff",
    "opacidade": 0.18,
    "metros": 1.5,
}

# Rótulos da Sessão (routers/sessions.py) e a fração que a barra desenha para
# cada um: quem vê só o degrau "parcial" sabe que o inimigo está ferido, mas
# não quanto exatamente.
ESTADOS_VIDA = (
    (1.0, "Ileso", 1.0),
    (0.75, "Arranhado", 0.8),
    (0.5, "Ferido", 0.55),
    (0.25, "Muito ferido", 0.3),
    (0.0001, "Quase morto", 0.1),
)

NOME_GENERICO = {
    "inimigo": "Inimigo Desconhecido",
    "aliado": "Aliado Desconhecido",
    "jogador": "Alguém Desconhecido",
}


class ErroMapa(Exception):
    """Pedido recusado. `codigo` já é o status HTTP que a rota devolve."""

    def __init__(self, mensagem: str, codigo: int = 422):
        super().__init__(mensagem)
        self.mensagem = mensagem
        self.codigo = codigo


@dataclass(frozen=True)
class Espectador:
    usuario_id: str
    gestor: bool
    #: Personagens ativos de quem olha, nesta campanha.
    personagens: frozenset[str] = field(default_factory=frozenset)


def _numero(valor, campo: str, minimo: float, maximo: float) -> float:
    if isinstance(valor, bool) or not isinstance(valor, (int, float)) or not math.isfinite(valor):
        raise ErroMapa(f"{campo} precisa ser um numero")
    if valor < minimo or valor > maximo:
        raise ErroMapa(f"{campo} precisa ficar entre {minimo:g} e {maximo:g}")
    return float(valor)


def normalizar_grade(dados, atual: dict | None = None) -> dict:
    """Mescla o que veio com a grade atual; campo inválido é recusado, não ignorado."""
    grade = dict(GRADE_PADRAO)
    grade.update(atual or {})
    if not isinstance(dados, dict):
        raise ErroMapa("grade invalida")
    if "tipo" in dados:
        if dados["tipo"] not in TIPOS_GRADE:
            raise ErroMapa("a grade e quadrada, hex ou nenhuma")
        grade["tipo"] = dados["tipo"]
    if "tamanho" in dados:
        grade["tamanho"] = _numero(dados["tamanho"], "tamanho do quadrado", 10, 1000)
    for eixo in ("x", "y"):
        if eixo in dados:
            grade[eixo] = _numero(dados[eixo], f"deslocamento {eixo}", -1000, 1000)
    if "cor" in dados:
        if not isinstance(dados["cor"], str) or not COR.match(dados["cor"]):
            raise ErroMapa("cor da grade invalida")
        grade["cor"] = dados["cor"].lower()
    if "opacidade" in dados:
        grade["opacidade"] = _numero(dados["opacidade"], "opacidade", 0, 1)
    if "metros" in dados:
        grade["metros"] = _numero(dados["metros"], "metros por quadrado", 0.1, 100)
    return grade


def barras_padrao(lado: str) -> dict:
    """Jogador e aliado mostram tudo para a mesa; inimigo começa só para o Mestre."""
    if lado in ("jogador", "aliado"):
        return {"mostrar": list(BARRAS), "para": "todos"}
    return {"mostrar": ["vida"], "para": "dono"}


def normalizar_barras(dados, atual: dict | None = None, lado: str = "neutro") -> dict:
    barras = barras_padrao(lado)
    barras.update(atual or {})
    if not isinstance(dados, dict):
        raise ErroMapa("barras invalidas")
    if "mostrar" in dados:
        mostrar = dados["mostrar"]
        if not isinstance(mostrar, list) or any(item not in BARRAS for item in mostrar):
            raise ErroMapa("barras: vida, mana, estamina ou sanidade")
        barras["mostrar"] = [item for item in BARRAS if item in mostrar]
    if "para" in dados:
        if dados["para"] not in PARA_QUEM:
            raise ErroMapa("as barras aparecem para todos, para o dono ou para ninguem")
        barras["para"] = dados["para"]
    return barras


def limitar_posicao(x, y, largura: int, altura: int) -> tuple[float, float]:
    """Posição do centro do token, presa dentro do mapa."""
    px = _numero(x, "x", -1e7, 1e7)
    py = _numero(y, "y", -1e7, 1e7)
    return max(0.0, min(float(largura), px)), max(0.0, min(float(altura), py))


def porte_valido(valor) -> int:
    if isinstance(valor, bool) or not isinstance(valor, int) or not 1 <= valor <= PORTE_MAXIMO:
        raise ErroMapa(f"o porte vai de 1 a {PORTE_MAXIMO} quadrados")
    return valor


def normalizar_moldura(valor) -> str | None:
    """None (ou vazio) volta ao padrão; um nome que o site não desenha é recusado."""
    if valor is None or valor == "":
        return None
    if valor not in MOLDURAS:
        raise ErroMapa("moldura desconhecida")
    return valor


def normalizar_enquadramento(dados, atual: dict | None = None) -> dict:
    """Zoom de 1 a 4 e deslocamento de -1 a 1 (fração do raio) da foto dentro do círculo."""
    enquadramento = dict(ENQUADRAMENTO_PADRAO)
    enquadramento.update(atual or {})
    if not isinstance(dados, dict):
        raise ErroMapa("enquadramento invalido")
    if "zoom" in dados:
        enquadramento["zoom"] = _numero(dados["zoom"], "zoom", 1, 4)
    for eixo in ("x", "y"):
        if eixo in dados:
            enquadramento[eixo] = _numero(dados[eixo], f"deslocamento {eixo}", -1, 1)
    return enquadramento


def moldura_efetiva(token: dict, personagem: str | None, moldura_personagem: str | None, moldura_mesa: str | None) -> str:
    """A da mesa (o Mestre travou) vale acima de tudo; depois a do token; depois a do personagem;
    sem escolha, personagem usa a escada do nível e o resto, o aro do lado."""
    if moldura_mesa:
        return moldura_mesa
    if token.get("moldura"):
        return token["moldura"]
    if personagem:
        return moldura_personagem or "nivel"
    return "lado"


# ------------------------------------------------------------ quem é dono

def personagem_do_token(token: dict, participante: dict | None) -> str | None:
    if token.get("personagem_id"):
        return str(token["personagem_id"])
    if participante and participante.get("personagem_id"):
        return str(participante["personagem_id"])
    return None


def e_dono(token: dict, participante: dict | None, quem: Espectador) -> bool:
    personagem = personagem_do_token(token, participante)
    return bool(personagem and personagem in quem.personagens)


def pode_mover(token: dict, participante: dict | None, quem: Espectador, livre: bool) -> bool:
    """Mestre move tudo. Jogador move o próprio token, ou qualquer um que enxergue
    se o Mestre deixou a cena livre."""
    if quem.gestor:
        return True
    if token.get("oculto"):
        return False
    if e_dono(token, participante, quem):
        return True
    if not livre:
        return False
    return degrau_de(token, participante, quem) in ("parcial", "total")


def degrau_de(token: dict, participante: dict | None, quem: Espectador) -> str | None:
    """Quanto este espectador enxerga do token: None (nada), desconhecido, parcial ou total."""
    if quem.gestor or e_dono(token, participante, quem):
        return "total"
    if token.get("oculto"):
        return None
    if participante is None:
        return "total"
    nivel = participante.get("visibilidade") or "total"
    if nivel == "oculto":
        return None
    return nivel if nivel in ("desconhecido", "parcial", "total") else "total"


# ------------------------------------------------------------- recursos

def _inteiro(valor) -> int | None:
    if isinstance(valor, bool) or not isinstance(valor, (int, float)):
        return None
    return int(valor)


def sanidade_da_ficha(ficha) -> tuple[int, int] | None:
    """(atual, máxima) como o HUD da ficha lê: atual ausente vale a máxima, máxima ausente vale 100."""
    status = ficha.get("status") if isinstance(ficha, dict) and isinstance(ficha.get("status"), dict) else None
    if status is None:
        return None
    maxima = _inteiro(status.get("sanidadeMaxima"))
    maxima = 100 if maxima is None or maxima <= 0 else maxima
    atual = _inteiro(status.get("sanidadeAtual"))
    atual = maxima if atual is None else max(0, min(atual, maxima))
    return atual, maxima


def _barra(tipo: str, atual, maxima) -> dict | None:
    atual = _inteiro(atual)
    maxima = _inteiro(maxima)
    if atual is None or maxima is None or maxima <= 0:
        return None
    return {"tipo": tipo, "atual": max(0, atual), "maximo": maxima}


def _barra_aproximada(atual, maxima) -> dict | None:
    atual = _inteiro(atual)
    maxima = _inteiro(maxima)
    if atual is None or maxima is None or maxima <= 0:
        return None
    if atual <= 0:
        return {"tipo": "vida", "rotulo": "Fora de combate", "fracao": 0.0}
    proporcao = atual / maxima
    for limite, rotulo, fracao in ESTADOS_VIDA:
        if proporcao >= limite:
            return {"tipo": "vida", "rotulo": rotulo, "fracao": fracao}
    return {"tipo": "vida", "rotulo": "Quase morto", "fracao": 0.1}


def recursos_do_token(participante: dict | None, recursos_ficha: dict | None, sanidade: tuple[int, int] | None) -> dict:
    """Números de Vida, Mana e Estamina (a Sessão manda; sem sessão, vale a ficha) e Sanidade (só a ficha)."""
    fonte = participante if participante else (recursos_ficha or {})
    return {
        "vida": (fonte.get("vida_atual"), fonte.get("vida_maxima")),
        "mana": (fonte.get("mana_atual"), fonte.get("mana_maxima")),
        "estamina": (fonte.get("estamina_atual"), fonte.get("estamina_maxima")),
        "sanidade": sanidade or (None, None),
    }


def barras_visiveis(token: dict, participante: dict | None, recursos: dict, quem: Espectador, degrau: str) -> list[dict]:
    config = normalizar_barras({}, token.get("barras") or {}, token.get("lado") or "neutro")
    if config["para"] == "ninguem":
        return []
    dono_ou_mestre = quem.gestor or e_dono(token, participante, quem)
    if config["para"] == "dono" and not dono_ou_mestre:
        return []
    if degrau == "desconhecido":
        return []
    if degrau == "parcial":
        # O degrau parcial da Sessão mostra só o estado qualitativo da Vida.
        if "vida" not in config["mostrar"]:
            return []
        aproximada = _barra_aproximada(*recursos["vida"])
        return [aproximada] if aproximada else []
    saida = []
    for tipo in config["mostrar"]:
        barra = _barra(tipo, *recursos[tipo])
        if barra:
            saida.append(barra)
    return saida


# ----------------------------------------------------------------- visão

def visao_token(
    token: dict,
    participante: dict | None,
    quem: Espectador,
    *,
    livre: bool,
    recursos_ficha: dict | None = None,
    sanidade: tuple[int, int] | None = None,
    nivel: int | None = None,
    tem_retrato: bool = False,
    condicoes: list | None = None,
    moldura: str = "lado",
    enquadramento: dict | None = None,
) -> dict | None:
    """O token como este espectador o recebe, ou None quando não deve nem saber que existe."""
    degrau = degrau_de(token, participante, quem)
    if degrau is None:
        return None
    identidade = degrau in ("parcial", "total")
    nome = token.get("nome") or (participante or {}).get("nome") or "Token"
    if not identidade:
        nome = NOME_GENERICO.get((participante or {}).get("tipo"), "Desconhecido")
    recursos = recursos_do_token(participante, recursos_ficha, sanidade)
    saida = {
        "id": str(token["id"]),
        "x": float(token["x"]),
        "y": float(token["y"]),
        "porte": int(token.get("porte") or 1),
        "lado": token.get("lado") or "neutro",
        "nome": nome,
        "imagem": identidade and (bool(token.get("imagem_id")) or tem_retrato),
        "nivel": nivel if identidade else None,
        "barras": barras_visiveis(token, participante, recursos, quem, degrau),
        "condicoes": (condicoes or []) if identidade else [],
        "e_meu": e_dono(token, participante, quem),
        "pode_mover": pode_mover(token, participante, quem, livre),
        "desconhecido": degrau == "desconhecido",
        # Moldura de personagem entregaria quem é: o desconhecido usa o aro simples.
        "moldura": moldura if identidade else "lado",
        "enquadramento": normalizar_enquadramento({}, enquadramento or {}) if identidade else dict(ENQUADRAMENTO_PADRAO),
    }
    if quem.gestor or saida["e_meu"]:
        saida["config_barras"] = normalizar_barras({}, token.get("barras") or {}, saida["lado"])
        # Abre a ficha no painel lateral; só para quem já pode abrir aquela ficha.
        saida["personagem_id"] = personagem_do_token(token, participante)
    if quem.gestor:
        saida["oculto"] = bool(token.get("oculto"))
        saida["participante_id"] = str(token["participante_id"]) if token.get("participante_id") else None
        saida["personagem_id"] = personagem_do_token(token, participante)
        saida["imagem_id"] = str(token["imagem_id"]) if token.get("imagem_id") else None
        saida["visibilidade"] = (participante or {}).get("visibilidade")
    return saida


def quem_ve(token: dict, participante: dict | None) -> str:
    """Para o tempo real: 'todos', 'gestores' ou 'donos' (Mestre e dono do personagem)."""
    if token.get("oculto"):
        return "gestores"
    if participante and participante.get("visibilidade") == "oculto":
        return "donos"
    return "todos"
