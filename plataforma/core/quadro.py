"""O quadro de investigação da mesa: cartas num mural, ligadas por barbantes, que a mesa toda monta junto.

Fica em `mapa_campanha.mesa.quadro` (sem migração): cada carta tem título, texto curto, cor e lugar. Os jogadores criam as suas e
mexem em qualquer carta que enxerguem; só o autor e o Mestre editam ou apagam. O Mestre também pode guardar uma carta escondida
(uma pista que o grupo ainda não achou) e revelá-la na hora certa: enquanto escondida, ela e os barbantes que chegam nela
nunca saem do servidor para os jogadores. As contas ficam aqui, sem banco nem HTTP, para testar.
"""

from __future__ import annotations

import math
from uuid import uuid4

LARGURA = 2400
ALTURA = 1600
MAX_CARTAS = 80
MAX_LIGACOES = 120
#: Quantas cartas cada jogador pode ter de uma vez (o Mestre não tem limite além do total).
MAX_CARTAS_POR_JOGADOR = 12
TITULO_MAX = 60
TEXTO_MAX = 240
NOME_MAX = 40
CORES = ("papel", "amarelo", "vermelho", "azul", "verde", "roxo")
ACOES = ("carta", "mover", "apagar", "ligar", "desligar", "revelar", "limpar")


class ErroQuadro(ValueError):
    def __init__(self, mensagem: str, codigo: int = 422):
        super().__init__(mensagem)
        self.mensagem = mensagem
        self.codigo = codigo


def quadro_vazio() -> dict:
    return {"cartas": [], "ligacoes": []}


def _texto(valor, limite: int) -> str:
    return " ".join(str(valor or "").split())[:limite]


def _paragrafo(valor, limite: int) -> str:
    return str(valor or "").replace("\r\n", "\n").strip()[:limite]


def _coordenada(valor, campo: str, maximo: int) -> float:
    if isinstance(valor, bool) or not isinstance(valor, (int, float)) or not math.isfinite(valor):
        raise ErroQuadro(f"{campo} precisa ser um numero")
    return round(max(0.0, min(float(maximo), float(valor))), 1)


def _carta_lida(bruto) -> dict | None:
    """Uma carta como está gravada; o que está quebrado é descartado (uma carta ruim não derruba o quadro)."""
    if not isinstance(bruto, dict) or not isinstance(bruto.get("id"), str) or not 0 < len(bruto["id"]) <= 40:
        return None
    try:
        return {
            "id": bruto["id"],
            "titulo": _texto(bruto.get("titulo"), TITULO_MAX),
            "texto": _paragrafo(bruto.get("texto"), TEXTO_MAX),
            "cor": bruto.get("cor") if bruto.get("cor") in CORES else "papel",
            "x": _coordenada(bruto.get("x", 0), "x", LARGURA),
            "y": _coordenada(bruto.get("y", 0), "y", ALTURA),
            "autor": str(bruto["autor"]) if bruto.get("autor") else None,
            "autor_nome": _texto(bruto.get("autor_nome"), NOME_MAX),
            "visivel": bool(bruto.get("visivel", True)),
        }
    except ErroQuadro:
        return None


def ler_quadro(dados) -> dict:
    """O quadro gravado; registro quebrado vira quadro vazio."""
    saida = quadro_vazio()
    if not isinstance(dados, dict):
        return saida
    vistos = set()
    for bruto in (dados.get("cartas") if isinstance(dados.get("cartas"), list) else [])[:MAX_CARTAS]:
        carta = _carta_lida(bruto)
        if carta and carta["id"] not in vistos:
            vistos.add(carta["id"])
            saida["cartas"].append(carta)
    pares = set()
    for bruto in (dados.get("ligacoes") if isinstance(dados.get("ligacoes"), list) else [])[:MAX_LIGACOES]:
        if not isinstance(bruto, dict):
            continue
        de, para = bruto.get("de"), bruto.get("para")
        chave = frozenset((de, para))
        if de in vistos and para in vistos and de != para and chave not in pares:
            pares.add(chave)
            saida["ligacoes"].append({"de": de, "para": para})
    return saida


def quadro_de(quadro: dict, *, gestor: bool) -> dict:
    """O que cada um recebe: o Mestre, tudo; o jogador, só as cartas à vista e os barbantes entre elas."""
    if gestor:
        return {"cartas": [dict(carta) for carta in quadro["cartas"]], "ligacoes": [dict(ligacao) for ligacao in quadro["ligacoes"]]}
    visiveis = {carta["id"] for carta in quadro["cartas"] if carta["visivel"]}
    return {
        "cartas": [dict(carta) for carta in quadro["cartas"] if carta["id"] in visiveis],
        "ligacoes": [dict(ligacao) for ligacao in quadro["ligacoes"] if ligacao["de"] in visiveis and ligacao["para"] in visiveis],
    }


def _achar(quadro: dict, identificador) -> dict:
    for carta in quadro["cartas"]:
        if carta["id"] == identificador:
            return carta
    raise ErroQuadro("carta nao encontrada", 404)


def _enxerga(carta: dict, gestor: bool) -> bool:
    return gestor or carta["visivel"]


def _pode_mexer_no_conteudo(carta: dict, usuario_id: str, gestor: bool) -> bool:
    return gestor or (carta["autor"] is not None and carta["autor"] == usuario_id)


def aplicar(atual: dict, acao: str, dados: dict, *, usuario_id: str, nome: str, gestor: bool) -> dict:
    """Aplica uma ação do quadro e devolve o quadro novo. Recusa o que a pessoa não pode fazer."""
    if acao not in ACOES:
        raise ErroQuadro("acao do quadro desconhecida")
    quadro = ler_quadro(atual)
    cartas, ligacoes = quadro["cartas"], quadro["ligacoes"]

    if acao == "carta":
        identificador = dados.get("id")
        if identificador:
            carta = _achar(quadro, identificador)
            if not _enxerga(carta, gestor):
                raise ErroQuadro("carta nao encontrada", 404)
            if not _pode_mexer_no_conteudo(carta, usuario_id, gestor):
                raise ErroQuadro("so quem fez a carta (ou o mestre) muda o texto dela", 403)
        else:
            if len(cartas) >= MAX_CARTAS:
                raise ErroQuadro(f"o quadro comporta {MAX_CARTAS} cartas")
            if not gestor and sum(1 for outra in cartas if outra["autor"] == usuario_id) >= MAX_CARTAS_POR_JOGADOR:
                raise ErroQuadro(f"voce ja tem {MAX_CARTAS_POR_JOGADOR} cartas no quadro: apague alguma antes de pregar outra")
            carta = {
                "id": uuid4().hex[:12], "titulo": "", "texto": "", "cor": "papel", "x": LARGURA / 2 - 90, "y": ALTURA / 2 - 60,
                "autor": usuario_id, "autor_nome": _texto(nome, NOME_MAX), "visivel": True,
            }
            cartas.append(carta)
        if "titulo" in dados:
            carta["titulo"] = _texto(dados["titulo"], TITULO_MAX)
        if "texto" in dados:
            carta["texto"] = _paragrafo(dados["texto"], TEXTO_MAX)
        if "cor" in dados:
            if dados["cor"] not in CORES:
                raise ErroQuadro("escolha uma cor da lista")
            carta["cor"] = dados["cor"]
        if "x" in dados:
            carta["x"] = _coordenada(dados["x"], "x", LARGURA)
        if "y" in dados:
            carta["y"] = _coordenada(dados["y"], "y", ALTURA)
        if "visivel" in dados and gestor:
            carta["visivel"] = bool(dados["visivel"])
        if not carta["titulo"] and not carta["texto"]:
            raise ErroQuadro("a carta precisa de um titulo ou de um texto")

    elif acao == "mover":
        carta = _achar(quadro, dados.get("id"))
        if not _enxerga(carta, gestor):
            raise ErroQuadro("carta nao encontrada", 404)
        carta["x"] = _coordenada(dados.get("x"), "x", LARGURA)
        carta["y"] = _coordenada(dados.get("y"), "y", ALTURA)

    elif acao == "apagar":
        carta = _achar(quadro, dados.get("id"))
        if not _enxerga(carta, gestor):
            raise ErroQuadro("carta nao encontrada", 404)
        if not _pode_mexer_no_conteudo(carta, usuario_id, gestor):
            raise ErroQuadro("so quem fez a carta (ou o mestre) apaga", 403)
        quadro["cartas"] = [outra for outra in cartas if outra["id"] != carta["id"]]
        quadro["ligacoes"] = [lig for lig in ligacoes if carta["id"] not in (lig["de"], lig["para"])]

    elif acao in ("ligar", "desligar"):
        de, para = _achar(quadro, dados.get("de")), _achar(quadro, dados.get("para"))
        if not (_enxerga(de, gestor) and _enxerga(para, gestor)):
            raise ErroQuadro("carta nao encontrada", 404)
        if de["id"] == para["id"]:
            raise ErroQuadro("uma carta nao se liga a ela mesma")
        par = frozenset((de["id"], para["id"]))
        existente = [lig for lig in ligacoes if frozenset((lig["de"], lig["para"])) == par]
        if acao == "ligar":
            if not existente:
                if len(ligacoes) >= MAX_LIGACOES:
                    raise ErroQuadro(f"o quadro comporta {MAX_LIGACOES} barbantes")
                ligacoes.append({"de": de["id"], "para": para["id"]})
        else:
            quadro["ligacoes"] = [lig for lig in ligacoes if frozenset((lig["de"], lig["para"])) != par]

    elif acao == "revelar":
        if not gestor:
            raise ErroQuadro("so o mestre esconde e revela cartas", 403)
        carta = _achar(quadro, dados.get("id"))
        carta["visivel"] = bool(dados.get("visivel", True))

    elif acao == "limpar":
        if not gestor:
            raise ErroQuadro("so o mestre limpa o quadro", 403)
        quadro = quadro_vazio()

    return quadro
