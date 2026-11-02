"""Tempo real do mapa: quem está conectado em cada campanha e o repasse das mensagens.

Enquanto alguém arrasta um token, o navegador manda a posição umas 20 vezes por
segundo. O servidor só confere e repassa, sem gravar; quando o token é solto, a
posição final vai para o banco. Ping e régua também só passam por aqui.

Uma instância só de uvicorn atende o site, então tudo mora em memória, como em
`core/live_session.py`. As regras de cada campanha (que token existe, quem vê,
quem move) ficam num retrato carregado do banco pela rota e jogado fora a cada
mudança de estrutura (`invalidar`), para o próximo pedido recarregar.

A conexão pode ser um WebSocket ou, no plano B, um fluxo SSE com POST para
subir; para o hub as duas são uma `Conexao` com uma fila.
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import math
import time
from collections import deque
from dataclasses import dataclass, field
from typing import Awaitable, Callable

log = logging.getLogger("jardim-plataforma")

LIMITE_FILA = 256
#: Mensagens por segundo que uma conexão pode mandar; o resto é descartado.
LIMITE_POR_SEGUNDO = 60
MAX_PONTOS_REGUA = 24
#: As regras (quem vê, quem move) valem por alguns segundos e são recarregadas:
#: mudar a visibilidade de um participante na Sessão chega aqui no máximo nesse tempo.
VALIDADE_REGRAS_S = 5.0
CORES = ("#4fd1c5", "#f6ad55", "#f687b3", "#90cdf4", "#9ae6b4", "#fbd38d", "#b794f4", "#feb2b2")


def agora_ms() -> float:
    return time.time() * 1000


def cor_de(usuario_id: str) -> str:
    return CORES[int(hashlib.sha1(usuario_id.encode()).hexdigest(), 16) % len(CORES)]


@dataclass(eq=False)
class Conexao:
    usuario_id: str
    nome: str
    gestor: bool
    personagens: frozenset[str] = field(default_factory=frozenset)
    fila: asyncio.Queue = field(default_factory=lambda: asyncio.Queue(maxsize=LIMITE_FILA))
    enviadas: deque = field(default_factory=deque)

    @property
    def cor(self) -> str:
        return cor_de(self.usuario_id)

    def entregar(self, mensagem: str) -> None:
        try:
            self.fila.put_nowait(mensagem)
        except asyncio.QueueFull:
            # Quem não está lendo perde posições intermediárias; a final chega
            # de novo no próximo GET da cena.
            log.debug("Fila do mapa cheia para %s", self.usuario_id)

    def dentro_do_limite(self) -> bool:
        agora = time.monotonic()
        while self.enviadas and agora - self.enviadas[0] > 1:
            self.enviadas.popleft()
        if len(self.enviadas) >= LIMITE_POR_SEGUNDO:
            return False
        self.enviadas.append(agora)
        return True


@dataclass
class RegraToken:
    #: 'todos', 'gestores' ou 'donos' (Mestre e dono do personagem).
    quem_ve: str
    donos: frozenset[str]
    #: Na cena livre, quem não é dono pode mover este token (ele aparece por inteiro).
    movivel_livre: bool


@dataclass
class Regras:
    cena_id: str | None
    livre: bool
    largura: int
    altura: int
    tokens: dict[str, RegraToken]
    carregadas_em: float = field(default_factory=time.monotonic)

    def vencidas(self) -> bool:
        return time.monotonic() - self.carregadas_em > VALIDADE_REGRAS_S


@dataclass(eq=False)
class Sala:
    conexoes: set = field(default_factory=set)
    regras: Regras | None = None


_salas: dict[str, Sala] = {}
_loop: asyncio.AbstractEventLoop | None = None


def registrar_loop(loop: asyncio.AbstractEventLoop) -> None:
    global _loop
    _loop = loop


def _sala(campanha_id: str) -> Sala:
    return _salas.setdefault(str(campanha_id), Sala())


def entrar(campanha_id, conexao: Conexao) -> None:
    sala = _sala(campanha_id)
    sala.conexoes.add(conexao)
    _avisar_presenca(sala)


def sair(campanha_id, conexao: Conexao) -> None:
    sala = _salas.get(str(campanha_id))
    if not sala:
        return
    sala.conexoes.discard(conexao)
    if not sala.conexoes:
        _salas.pop(str(campanha_id), None)
        return
    _avisar_presenca(sala)


def conectados(campanha_id) -> int:
    sala = _salas.get(str(campanha_id))
    return len(sala.conexoes) if sala else 0


def _avisar_presenca(sala: Sala) -> None:
    pessoas = {}
    for conexao in sala.conexoes:
        pessoas[conexao.usuario_id] = {"usuario_id": conexao.usuario_id, "nome": conexao.nome, "cor": conexao.cor, "gestor": conexao.gestor}
    mensagem = json.dumps({"t": "presenca", "pessoas": sorted(pessoas.values(), key=lambda p: p["nome"])}, ensure_ascii=False)
    for conexao in list(sala.conexoes):
        conexao.entregar(mensagem)


def _no_loop(funcao: Callable, *args) -> None:
    """Chamado de rotas síncronas (fora do loop): agenda a função no loop do servidor."""
    if _loop is None:
        funcao(*args)
        return
    try:
        _loop.call_soon_threadsafe(funcao, *args)
    except RuntimeError:
        log.debug("Loop indisponivel para o tempo real do mapa")


def _invalidar(campanha_id: str, versao: int | None) -> None:
    sala = _salas.get(campanha_id)
    if not sala:
        return
    sala.regras = None
    if versao is not None:
        mensagem = json.dumps({"t": "mudou", "versao": versao})
        for conexao in list(sala.conexoes):
            conexao.entregar(mensagem)


def mudou(campanha_id, versao: int | None = None) -> None:
    """A estrutura mudou (cena, token criado, escondido, removido): recarrega as regras e avisa a mesa."""
    _no_loop(_invalidar, str(campanha_id), versao)


def esquecer_regras(campanha_id) -> None:
    """A Sessão mudou (visibilidade, participante): só recarrega as regras, sem avisar ninguém."""
    _no_loop(_invalidar, str(campanha_id), None)


def _pode_ver(conexao: Conexao, regra: RegraToken) -> bool:
    if conexao.gestor or regra.quem_ve == "todos":
        return True
    if regra.quem_ve == "donos":
        return conexao.usuario_id in regra.donos
    return False


def _pode_mover(conexao: Conexao, regra: RegraToken, regras: Regras) -> bool:
    if conexao.gestor or conexao.usuario_id in regra.donos:
        return True
    return regras.livre and regra.movivel_livre and regra.quem_ve == "todos"


def _numero(valor) -> float | None:
    if isinstance(valor, bool) or not isinstance(valor, (int, float)) or not math.isfinite(valor):
        return None
    return float(valor)


def _repassar(sala: Sala, origem: Conexao, mensagem: dict, regra: RegraToken | None = None) -> None:
    texto = json.dumps(mensagem, ensure_ascii=False)
    for conexao in list(sala.conexoes):
        if conexao is origem:
            continue
        if regra is not None and not _pode_ver(conexao, regra):
            continue
        conexao.entregar(texto)


CarregarRegras = Callable[[], Awaitable[Regras]]
GravarPosicao = Callable[[str, float, float], Awaitable[bool]]


async def processar(
    campanha_id,
    conexao: Conexao,
    mensagem,
    carregar_regras: CarregarRegras,
    gravar_posicao: GravarPosicao,
) -> dict | None:
    """Trata uma mensagem de quem está conectado. Devolve uma resposta só para ele, quando há."""
    if not isinstance(mensagem, dict):
        return {"t": "erro", "motivo": "mensagem invalida"}
    tipo = mensagem.get("t")
    if tipo == "oi":
        return {"t": "oi", "ts": agora_ms()}
    if not conexao.dentro_do_limite():
        return None
    sala = _sala(campanha_id)
    if sala.regras is None or sala.regras.vencidas():
        sala.regras = await carregar_regras()
    regras = sala.regras

    if tipo in ("arrastar", "soltar"):
        token_id = str(mensagem.get("token") or "")
        regra = regras.tokens.get(token_id)
        x = _numero(mensagem.get("x"))
        y = _numero(mensagem.get("y"))
        if regra is None or x is None or y is None:
            return {"t": "erro", "motivo": "token desconhecido"}
        if not _pode_mover(conexao, regra, regras):
            return {"t": "erro", "motivo": "voce nao move este token", "token": token_id}
        x = max(0.0, min(float(regras.largura), x))
        y = max(0.0, min(float(regras.altura), y))
        if tipo == "soltar":
            if not await gravar_posicao(token_id, x, y):
                return {"t": "erro", "motivo": "o token saiu da cena", "token": token_id}
        _repassar(sala, conexao, {
            "t": "arrastando" if tipo == "arrastar" else "token",
            "token": token_id,
            "x": round(x, 2),
            "y": round(y, 2),
            "ts": agora_ms(),
            "por": conexao.usuario_id,
        }, regra)
        return None

    if tipo == "ping":
        x = _numero(mensagem.get("x"))
        y = _numero(mensagem.get("y"))
        if x is None or y is None:
            return {"t": "erro", "motivo": "ping sem lugar"}
        _repassar(sala, conexao, {
            "t": "ping", "x": round(x, 1), "y": round(y, 1), "ts": agora_ms(),
            "por": conexao.usuario_id, "nome": conexao.nome, "cor": conexao.cor,
        })
        return None

    if tipo == "regua":
        pontos = mensagem.get("pontos")
        limpos = None
        if pontos is not None:
            if not isinstance(pontos, list) or len(pontos) > MAX_PONTOS_REGUA:
                return {"t": "erro", "motivo": "regua invalida"}
            limpos = []
            for ponto in pontos:
                if not isinstance(ponto, list) or len(ponto) != 2:
                    return {"t": "erro", "motivo": "regua invalida"}
                px, py = _numero(ponto[0]), _numero(ponto[1])
                if px is None or py is None:
                    return {"t": "erro", "motivo": "regua invalida"}
                limpos.append([round(px, 1), round(py, 1)])
        _repassar(sala, conexao, {
            "t": "regua", "pontos": limpos, "por": conexao.usuario_id,
            "nome": conexao.nome, "cor": conexao.cor,
        })
        return None

    return {"t": "erro", "motivo": "tipo de mensagem desconhecido"}


def _limpar_para_testes() -> None:
    _salas.clear()
