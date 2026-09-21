"""Regras da mesa ao vivo: votação, relógios, cronômetros e bilhetes.

Tudo mora num único documento por campanha (`campanha_mesa.estado`) que o
servidor altera por AÇÕES validadas. Este módulo não conhece banco nem HTTP:
recebe o estado, a ação, os dados e quem está agindo, e devolve o estado novo
mais os eventos que valem entrar no replay. Assim as regras de segredo (névoa,
ficha escondida, bilhete alheio, quem votou em quê) ficam num lugar só e dá
para testar sem subir nada.

O cliente nunca recebe o documento cru: `visao` recorta por papel.
"""

from __future__ import annotations

import copy
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from uuid import uuid4

TAMANHOS_RELOGIO = (4, 6, 8, 10, 12)
CORES_RELOGIO = ("perigo", "ritual", "progresso", "misterio")
ESTILOS_BILHETE = ("papel", "carta", "runa")

MAX_RELOGIOS = 20
MAX_CRONOMETROS = 12
DURACAO_MAXIMA_S = 24 * 3600
MAX_BILHETES = 60
MIN_OPCOES = 2
MAX_OPCOES = 6


class ErroMesa(Exception):
    """Ação recusada. `codigo` já é o status HTTP que a rota devolve."""

    def __init__(self, mensagem: str, codigo: int = 422):
        super().__init__(mensagem)
        self.mensagem = mensagem
        self.codigo = codigo


@dataclass
class Ator:
    usuario_id: str
    gestor: bool
    nome: str = ""


@dataclass
class Contexto:
    ator: Ator
    agora: datetime
    #: Jogadores que podem votar e receber bilhete: usuario_id -> nome de exibição.
    jogadores: dict[str, str] = field(default_factory=dict)


def estado_inicial() -> dict:
    return {
        "votacao": None,
        "ultima_votacao": None,
        "relogios": [],
        "cronometros": [],
        "bilhetes": [],
    }


def _novo_id() -> str:
    return uuid4().hex[:12]


def _texto(valor, limite: int, campo: str, *, obrigatorio: bool = True) -> str:
    texto = " ".join(str(valor or "").split())
    if obrigatorio and not texto:
        raise ErroMesa(f"{campo} e obrigatorio")
    return texto[:limite]


def _texto_longo(valor, limite: int, campo: str) -> str:
    texto = str(valor or "").replace("\r\n", "\n").strip()
    if not texto:
        raise ErroMesa(f"{campo} e obrigatorio")
    return texto[:limite]


def _inteiro(valor, campo: str, minimo: int, maximo: int) -> int:
    if isinstance(valor, bool) or not isinstance(valor, (int, float)) or valor != int(valor):
        raise ErroMesa(f"{campo} precisa ser um numero inteiro")
    numero = int(valor)
    if numero < minimo or numero > maximo:
        raise ErroMesa(f"{campo} precisa ficar entre {minimo} e {maximo}")
    return numero


# ------------------------------------------------------------- votação

def _fechar_votacao(estado, eventos, motivo: str = "encerrada"):
    votacao = estado["votacao"]
    if not votacao:
        return
    votacao["aberta"] = False
    estado["ultima_votacao"] = votacao
    estado["votacao"] = None
    contagem = _contagem(votacao)
    if contagem:
        vencedora = max(contagem, key=lambda item: item[1])
        resumo = f"Resultado: “{vencedora[0]}” com {vencedora[1]} voto(s)."
    else:
        resumo = "Ninguém votou."
    eventos.append({"tipo": "votacao", "texto": f"Votação {motivo}: {votacao['pergunta']} {resumo}", "publico": True})


def _contagem(votacao: dict) -> list[tuple[str, int]]:
    total: dict[str, int] = {opcao["id"]: 0 for opcao in votacao["opcoes"]}
    for opcao_id in votacao["votos"].values():
        if opcao_id in total:
            total[opcao_id] += 1
    textos = {opcao["id"]: opcao["texto"] for opcao in votacao["opcoes"]}
    return [(textos[chave], quantidade) for chave, quantidade in total.items() if quantidade > 0]


def _acao_votacao_abrir(estado, dados, ctx, eventos):
    if estado["votacao"]:
        raise ErroMesa("ja existe uma votacao aberta; feche antes de abrir outra", 409)
    opcoes = dados.get("opcoes")
    if not isinstance(opcoes, list):
        raise ErroMesa("informe as opcoes")
    textos = []
    for opcao in opcoes:
        texto = _texto(opcao, 80, "opcao", obrigatorio=False)
        if texto and texto.lower() not in [t.lower() for t in textos]:
            textos.append(texto)
    if not MIN_OPCOES <= len(textos) <= MAX_OPCOES:
        raise ErroMesa(f"a votacao precisa de {MIN_OPCOES} a {MAX_OPCOES} opcoes diferentes")
    estado["votacao"] = {
        "id": _novo_id(),
        "pergunta": _texto(dados.get("pergunta"), 200, "pergunta"),
        "opcoes": [{"id": _novo_id(), "texto": texto} for texto in textos],
        "anonima": bool(dados.get("anonima")),
        "aberta": True,
        "votos": {},
        "criada_em": ctx.agora.isoformat(),
    }
    eventos.append({"tipo": "votacao", "texto": f"Votação aberta: {estado['votacao']['pergunta']}", "publico": True})


def _acao_votacao_fechar(estado, dados, ctx, eventos):
    if not estado["votacao"]:
        raise ErroMesa("nao ha votacao aberta", 404)
    _fechar_votacao(estado, eventos)


def _acao_votar(estado, dados, ctx, eventos):
    votacao = estado["votacao"]
    if not votacao or not votacao["aberta"]:
        raise ErroMesa("nao ha votacao aberta", 409)
    ator = ctx.ator
    if ator.usuario_id not in ctx.jogadores:
        raise ErroMesa("so jogadores da campanha votam", 403)
    opcao_id = str(dados.get("opcao_id") or "")
    if opcao_id not in {opcao["id"] for opcao in votacao["opcoes"]}:
        raise ErroMesa("opcao invalida")
    votacao["votos"][ator.usuario_id] = opcao_id
    if len(votacao["votos"]) >= len(ctx.jogadores) and ctx.jogadores:
        _fechar_votacao(estado, eventos, "concluída (todos votaram)")


# ------------------------------------------------------------ relógios

def _relogio(estado: dict, relogio_id: str) -> dict:
    for relogio in estado["relogios"]:
        if relogio["id"] == relogio_id:
            return relogio
    raise ErroMesa("relogio nao encontrado", 404)


def _acao_relogio_criar(estado, dados, ctx, eventos):
    if len(estado["relogios"]) >= MAX_RELOGIOS:
        raise ErroMesa(f"limite de {MAX_RELOGIOS} relogios")
    fatias = dados.get("fatias", 6)
    if fatias not in TAMANHOS_RELOGIO:
        raise ErroMesa("o relogio tem 4, 6, 8, 10 ou 12 fatias")
    relogio = {
        "id": _novo_id(),
        "titulo": _texto(dados.get("titulo"), 60, "titulo"),
        "fatias": fatias,
        "cheias": 0,
        "cor": dados.get("cor") if dados.get("cor") in CORES_RELOGIO else "perigo",
        "visivel": dados.get("visivel", True) is not False,
    }
    estado["relogios"].append(relogio)
    if relogio["visivel"]:
        eventos.append({"tipo": "relogio", "texto": f"Novo relógio: {relogio['titulo']} (0/{fatias}).", "publico": True})


def _acao_relogio_ajustar(estado, dados, ctx, eventos):
    relogio = _relogio(estado, str(dados.get("relogio_id") or ""))
    delta = _inteiro(dados.get("delta"), "delta", -12, 12)
    antes = relogio["cheias"]
    relogio["cheias"] = max(0, min(relogio["fatias"], antes + delta))
    if relogio["cheias"] == antes or not relogio["visivel"]:
        return
    if relogio["cheias"] >= relogio["fatias"]:
        eventos.append({"tipo": "relogio", "texto": f"O relógio “{relogio['titulo']}” se completou!", "publico": True})
    else:
        eventos.append({
            "tipo": "relogio",
            "texto": f"{relogio['titulo']}: {relogio['cheias']}/{relogio['fatias']}.",
            "publico": True,
        })


def _acao_relogio_editar(estado, dados, ctx, eventos):
    relogio = _relogio(estado, str(dados.get("relogio_id") or ""))
    if "titulo" in dados:
        relogio["titulo"] = _texto(dados["titulo"], 60, "titulo")
    if "visivel" in dados:
        relogio["visivel"] = bool(dados["visivel"])
    if dados.get("cor") in CORES_RELOGIO:
        relogio["cor"] = dados["cor"]


def _acao_relogio_apagar(estado, dados, ctx, eventos):
    relogio = _relogio(estado, str(dados.get("relogio_id") or ""))
    estado["relogios"] = [item for item in estado["relogios"] if item["id"] != relogio["id"]]


# ---------------------------------------------------------- cronômetros
#
# Um cronômetro é uma contagem regressiva que todos veem: "a bomba explode em
# 5 minutos". O servidor guarda só o instante em que ele zera (`termina_em`)
# ou, parado, quanto falta (`restante_s`); cada tela conta sozinha a partir do
# `restante_s` que a visão calcula. Ninguém precisa mandar um tique por segundo.

def _cronometro(estado: dict, cronometro_id: str) -> dict:
    for cronometro in estado["cronometros"]:
        if cronometro["id"] == cronometro_id:
            return cronometro
    raise ErroMesa("cronometro nao encontrado", 404)


def restante_do_cronometro(cronometro: dict, agora: datetime) -> int:
    """Segundos que faltam agora (0 quando zerou)."""
    if cronometro.get("termina_em"):
        termina = datetime.fromisoformat(cronometro["termina_em"])
        return max(0, int((termina - agora).total_seconds() + 0.999))
    return int(cronometro.get("restante_s", 0))


def situacao_do_cronometro(cronometro: dict, agora: datetime) -> str:
    """parado (nunca rodou), correndo, pausado ou zerado."""
    restante = restante_do_cronometro(cronometro, agora)
    if cronometro.get("termina_em"):
        return "zerado" if restante == 0 else "correndo"
    if restante == 0:
        return "zerado"
    return "parado" if restante == cronometro["duracao_s"] else "pausado"


def _acao_cronometro_criar(estado, dados, ctx, eventos):
    if len(estado["cronometros"]) >= MAX_CRONOMETROS:
        raise ErroMesa(f"limite de {MAX_CRONOMETROS} cronometros")
    duracao = _inteiro(dados.get("duracao_s"), "duracao", 5, DURACAO_MAXIMA_S)
    cronometro = {
        "id": _novo_id(),
        "titulo": _texto(dados.get("titulo"), 60, "titulo"),
        "cor": dados.get("cor") if dados.get("cor") in CORES_RELOGIO else "perigo",
        "visivel": dados.get("visivel", True) is not False,
        "duracao_s": duracao,
        "restante_s": duracao,
        "termina_em": None,
    }
    if dados.get("iniciar"):
        cronometro["termina_em"] = (ctx.agora + timedelta(seconds=duracao)).isoformat()
    estado["cronometros"].append(cronometro)
    if cronometro["visivel"]:
        eventos.append({"tipo": "cronometro", "texto": f"Cronômetro: {cronometro['titulo']} ({duracao // 60}:{duracao % 60:02d}).", "publico": True})


def _acao_cronometro_iniciar(estado, dados, ctx, eventos):
    cronometro = _cronometro(estado, str(dados.get("cronometro_id") or ""))
    if cronometro.get("termina_em"):
        return
    restante = int(cronometro.get("restante_s", 0))
    if restante <= 0:
        raise ErroMesa("o cronometro ja zerou; reinicie antes")
    cronometro["termina_em"] = (ctx.agora + timedelta(seconds=restante)).isoformat()
    if cronometro["visivel"]:
        eventos.append({"tipo": "cronometro", "texto": f"{cronometro['titulo']}: o tempo corre ({restante // 60}:{restante % 60:02d}).", "publico": True})


def _acao_cronometro_pausar(estado, dados, ctx, eventos):
    cronometro = _cronometro(estado, str(dados.get("cronometro_id") or ""))
    if not cronometro.get("termina_em"):
        return
    cronometro["restante_s"] = restante_do_cronometro(cronometro, ctx.agora)
    cronometro["termina_em"] = None


def _acao_cronometro_reiniciar(estado, dados, ctx, eventos):
    cronometro = _cronometro(estado, str(dados.get("cronometro_id") or ""))
    cronometro["restante_s"] = cronometro["duracao_s"]
    cronometro["termina_em"] = None


def _acao_cronometro_ajustar(estado, dados, ctx, eventos):
    """Soma ou tira segundos do que falta (o Mestre dando uma folga ou apertando)."""
    cronometro = _cronometro(estado, str(dados.get("cronometro_id") or ""))
    delta = _inteiro(dados.get("delta_s"), "delta", -3600, 3600)
    restante = max(0, min(DURACAO_MAXIMA_S, restante_do_cronometro(cronometro, ctx.agora) + delta))
    cronometro["duracao_s"] = max(cronometro["duracao_s"], restante)
    if cronometro.get("termina_em"):
        cronometro["termina_em"] = (ctx.agora + timedelta(seconds=restante)).isoformat()
    else:
        cronometro["restante_s"] = restante


def _acao_cronometro_editar(estado, dados, ctx, eventos):
    cronometro = _cronometro(estado, str(dados.get("cronometro_id") or ""))
    if "titulo" in dados:
        cronometro["titulo"] = _texto(dados["titulo"], 60, "titulo")
    if "visivel" in dados:
        cronometro["visivel"] = bool(dados["visivel"])
    if dados.get("cor") in CORES_RELOGIO:
        cronometro["cor"] = dados["cor"]


def _acao_cronometro_apagar(estado, dados, ctx, eventos):
    cronometro = _cronometro(estado, str(dados.get("cronometro_id") or ""))
    estado["cronometros"] = [item for item in estado["cronometros"] if item["id"] != cronometro["id"]]


# ------------------------------------------------------------ bilhetes

def _acao_bilhete_enviar(estado, dados, ctx, eventos):
    destino = str(dados.get("para_usuario_id") or "")
    if destino not in ctx.jogadores:
        raise ErroMesa("o bilhete precisa de um jogador da campanha")
    if len(estado["bilhetes"]) >= MAX_BILHETES:
        # Abre espaço descartando o bilhete lido mais antigo; nunca um ainda fechado.
        lidos = [b for b in estado["bilhetes"] if b.get("aberto_em")]
        if not lidos:
            raise ErroMesa(f"limite de {MAX_BILHETES} bilhetes fechados")
        estado["bilhetes"].remove(lidos[0])
    bilhete = {
        "id": _novo_id(),
        "para_usuario_id": destino,
        "titulo": _texto(dados.get("titulo"), 80, "titulo"),
        "texto": _texto_longo(dados.get("texto"), 2000, "texto"),
        "estilo": dados.get("estilo") if dados.get("estilo") in ESTILOS_BILHETE else "papel",
        "criado_em": ctx.agora.isoformat(),
        "aberto_em": None,
    }
    estado["bilhetes"].append(bilhete)
    eventos.append({
        "tipo": "bilhete",
        "texto": f"O Mestre passou um bilhete para {ctx.jogadores[destino]}.",
        "publico": False,
    })


def _acao_bilhete_abrir(estado, dados, ctx, eventos):
    bilhete_id = str(dados.get("bilhete_id") or "")
    for bilhete in estado["bilhetes"]:
        if bilhete["id"] != bilhete_id:
            continue
        if bilhete["para_usuario_id"] != ctx.ator.usuario_id:
            raise ErroMesa("este bilhete nao e seu", 403)
        if not bilhete["aberto_em"]:
            bilhete["aberto_em"] = ctx.agora.isoformat()
            eventos.append({
                "tipo": "bilhete",
                "texto": f"{ctx.jogadores.get(ctx.ator.usuario_id, 'Um jogador')} abriu o bilhete “{bilhete['titulo']}”.",
                "publico": False,
            })
        return
    raise ErroMesa("bilhete nao encontrado", 404)


def _acao_bilhete_apagar(estado, dados, ctx, eventos):
    bilhete_id = str(dados.get("bilhete_id") or "")
    antes = len(estado["bilhetes"])
    estado["bilhetes"] = [b for b in estado["bilhetes"] if b["id"] != bilhete_id]
    if len(estado["bilhetes"]) == antes:
        raise ErroMesa("bilhete nao encontrado", 404)


#: Ações de quem conduz a mesa. Quem não conduz só acessa `ACOES_JOGADOR`.
ACOES_GESTOR = {
    "votacao_abrir": _acao_votacao_abrir,
    "votacao_fechar": _acao_votacao_fechar,
    "relogio_criar": _acao_relogio_criar,
    "relogio_ajustar": _acao_relogio_ajustar,
    "relogio_editar": _acao_relogio_editar,
    "relogio_apagar": _acao_relogio_apagar,
    "cronometro_criar": _acao_cronometro_criar,
    "cronometro_iniciar": _acao_cronometro_iniciar,
    "cronometro_pausar": _acao_cronometro_pausar,
    "cronometro_reiniciar": _acao_cronometro_reiniciar,
    "cronometro_ajustar": _acao_cronometro_ajustar,
    "cronometro_editar": _acao_cronometro_editar,
    "cronometro_apagar": _acao_cronometro_apagar,
    "bilhete_enviar": _acao_bilhete_enviar,
    "bilhete_apagar": _acao_bilhete_apagar,
}

ACOES_JOGADOR = {
    "votar": _acao_votar,
    "bilhete_abrir": _acao_bilhete_abrir,
}


def aplicar(estado: dict, acao: str, dados: dict, ctx: Contexto) -> tuple[dict, list[dict]]:
    """Aplica uma ação sobre uma CÓPIA do estado; o original nunca é tocado.

    Levanta `ErroMesa` quando a ação é desconhecida, proibida para o papel ou
    inválida. Devolve o estado novo e os eventos para o replay.
    """
    if not isinstance(dados, dict):
        raise ErroMesa("dados invalidos")
    if acao in ACOES_JOGADOR:
        funcao = ACOES_JOGADOR[acao]
    elif acao in ACOES_GESTOR:
        if not ctx.ator.gestor:
            raise ErroMesa("permissao de mestre necessaria", 403)
        funcao = ACOES_GESTOR[acao]
    else:
        raise ErroMesa("acao desconhecida", 404)
    novo = copy.deepcopy(estado)
    for chave, padrao in estado_inicial().items():
        novo.setdefault(chave, copy.deepcopy(padrao))
    eventos: list[dict] = []
    funcao(novo, dados, ctx, eventos)
    return novo, eventos


# --------------------------------------------------------------- visão

def _visao_votacao(votacao: dict | None, ctx: Contexto) -> dict | None:
    if not votacao:
        return None
    ator = ctx.ator
    mostrar_nomes = ator.gestor or not votacao["anonima"]
    opcoes = []
    for opcao in votacao["opcoes"]:
        votantes = [uid for uid, escolha in votacao["votos"].items() if escolha == opcao["id"]]
        item = {"id": opcao["id"], "texto": opcao["texto"], "votos": len(votantes)}
        if mostrar_nomes:
            item["votantes"] = [ctx.jogadores.get(uid, "?") for uid in votantes]
        opcoes.append(item)
    return {
        "id": votacao["id"],
        "pergunta": votacao["pergunta"],
        "anonima": votacao["anonima"],
        "aberta": votacao["aberta"],
        "opcoes": opcoes,
        "meu_voto": votacao["votos"].get(ator.usuario_id),
        "total_votos": len(votacao["votos"]),
        "total_elegiveis": len(ctx.jogadores),
    }


def visao(estado: dict, ctx: Contexto) -> dict:
    """O que cada papel enxerga. Nada de segredo sai daqui para quem não pode ver."""
    ator = ctx.ator
    base = estado_inicial()
    base.update(estado)

    if ator.gestor:
        bilhetes = [
            {
                "id": b["id"], "para_usuario_id": b["para_usuario_id"],
                "para_nome": ctx.jogadores.get(b["para_usuario_id"], "?"),
                "titulo": b["titulo"], "texto": b["texto"], "estilo": b["estilo"],
                "criado_em": b["criado_em"], "aberto_em": b["aberto_em"],
            }
            for b in base["bilhetes"]
        ]
        relogios = list(base["relogios"])
    else:
        bilhetes = [
            {
                "id": b["id"], "titulo": b["titulo"], "texto": b["texto"], "estilo": b["estilo"],
                "criado_em": b["criado_em"], "aberto_em": b["aberto_em"],
            }
            for b in base["bilhetes"] if b["para_usuario_id"] == ator.usuario_id
        ]
        relogios = [r for r in base["relogios"] if r["visivel"]]

    cronometros = [
        {
            "id": c["id"], "titulo": c["titulo"], "cor": c["cor"], "visivel": c["visivel"],
            "duracao_s": c["duracao_s"],
            "restante_s": restante_do_cronometro(c, ctx.agora),
            "situacao": situacao_do_cronometro(c, ctx.agora),
        }
        for c in base["cronometros"] if ator.gestor or c["visivel"]
    ]

    return {
        "votacao": _visao_votacao(base["votacao"], ctx),
        "ultima_votacao": _visao_votacao(base["ultima_votacao"], ctx),
        "relogios": relogios,
        "cronometros": cronometros,
        "bilhetes": bilhetes,
    }
