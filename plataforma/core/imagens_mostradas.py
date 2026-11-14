"""Imagens do Acervo que o Mestre mostra à mesa (handout, retrato de NPC, ilustração de um lugar, fundo de cena narrativa).

O Acervo só entrega os pedaços de uma imagem a quem a vê numa cena, num token ou num projeto. Uma imagem mostrada à mesa não
está em nenhum deles, então o Mestre a **libera** por algumas horas para a campanha (ou só para alguns jogadores), e o
Acervo confere essa lista antes de negar. A lista mora em memória, como o resto do tempo real (um processo só): quem
chega depois de o servidor reiniciar não vê a imagem até o Mestre mostrar de novo.
"""

from __future__ import annotations

import time
from uuid import UUID

#: Quanto tempo uma imagem mostrada continua liberada (uma sessão longa, com folga).
VALIDADE_S = 8 * 3600
#: Quantas imagens uma campanha mantém liberadas ao mesmo tempo (a mais antiga sai).
MAX_POR_CAMPANHA = 12

_liberacoes: dict[str, list[dict]] = {}


def _agora() -> float:
    return time.time()


def liberar(item_id, campanha_id, alvos: frozenset[str] | None = None, agora: float | None = None) -> None:
    """Libera a imagem para a campanha por `VALIDADE_S`. `alvos`: ids de usuário que podem baixar; nulo, todos os membros."""
    agora = _agora() if agora is None else agora
    chave = str(item_id)
    lista = [e for e in _liberacoes.get(chave, []) if e["campanha"] != str(campanha_id) and e["ate"] > agora]
    lista.append({"campanha": str(campanha_id), "ate": agora + VALIDADE_S, "alvos": alvos, "desde": agora})
    _liberacoes[chave] = lista
    # Passou do teto da campanha: a mais antiga deixa de valer.
    da_campanha = sorted(
        ((chave_item, e) for chave_item, entradas in _liberacoes.items() for e in entradas if e["campanha"] == str(campanha_id)),
        key=lambda par: par[1]["desde"],
    )
    for chave_item, entrada in da_campanha[: max(0, len(da_campanha) - MAX_POR_CAMPANHA)]:
        _liberacoes[chave_item] = [e for e in _liberacoes[chave_item] if e is not entrada]


def revogar(campanha_id, item_id=None) -> None:
    """Tira a liberação de uma imagem (ou de todas) da campanha: o Mestre fechou."""
    for chave in list(_liberacoes):
        if item_id is not None and chave != str(item_id):
            continue
        _liberacoes[chave] = [e for e in _liberacoes[chave] if e["campanha"] != str(campanha_id)]
        if not _liberacoes[chave]:
            del _liberacoes[chave]


def revogar_menos(campanha_id, manter: set[str]) -> None:
    """Tira da campanha a liberação de todas as imagens, menos as de `manter` (o fundo da cena narrativa que segue ligada)."""
    for chave in list(_liberacoes):
        if chave not in manter:
            revogar(campanha_id, chave)


def campanhas_liberadas(item_id, usuario_id, agora: float | None = None) -> list[str]:
    """As campanhas em que esta pessoa pode baixar a imagem agora (por tempo e por destino)."""
    agora = _agora() if agora is None else agora
    return [
        e["campanha"] for e in _liberacoes.get(str(item_id), [])
        if e["ate"] > agora and (e["alvos"] is None or str(usuario_id) in e["alvos"])
    ]


def pode_ler(connection, item_id: UUID, usuario_id: UUID) -> bool:
    """A imagem foi mostrada a esta pessoa, numa campanha de que ela é membro ativo."""
    campanhas = campanhas_liberadas(item_id, usuario_id)
    if not campanhas:
        return False
    return bool(connection.execute(
        "SELECT 1 FROM membros_campanha WHERE usuario_id=%s AND status='ativo' AND campanha_id = ANY(%s::uuid[]) LIMIT 1",
        (usuario_id, campanhas),
    ).fetchone())


def _limpar_para_testes() -> None:
    _liberacoes.clear()
