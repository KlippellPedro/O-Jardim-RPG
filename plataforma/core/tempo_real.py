"""Tempo real do mapa: quem está conectado em cada campanha e o repasse das mensagens.

Enquanto alguém arrasta um token, o navegador manda a posição umas 20 vezes por
segundo. O servidor só confere e repassa, sem gravar; quando o token é solto, a
posição final vai para o banco. Ping e régua também só passam por aqui.

Com a névoa ligada, o arrasto de um monstro coberto não chega ao jogador. Se ele
sai da névoa no meio do caminho, a posição vai para o banco e os jogadores
recarregam a cena (só então sabem que ele existe); se entra, eles recebem
`sumiu`.

Uma instância só de uvicorn atende o site, então tudo mora em memória, como em
`core/live_session.py`. As regras de cada campanha (que token existe, quem vê,
quem move) ficam num retrato carregado do banco pela rota e jogado fora a cada
mudança de estrutura (`invalidar`), para o próximo pedido recarregar. Quando só
vencem pelo tempo, a recarga acontece em segundo plano: o arrasto nunca espera o
banco.

A fila de saída de cada conexão junta as posições de um mesmo token (só a mais
nova sai) e, se encher mesmo assim, troca tudo o que esperava por um pedido de
recarga: a posição final nunca se perde em silêncio.

Mudanças de estrutura (token criado, editado, removido; névoa, clima, cena; e, da
Sessão, vida, condições, participantes, visibilidade) não pedem mais que cada tela
recarregue o mapa. O servidor calcula o recorte de cada pessoa conectada (com a
mesma função do GET, então o segredo continua no servidor), compara com o último
que mandou para ela e manda só a diferença (`delta`), ou o estado inteiro na
primeira vez (`estado`). Mudanças seguidas se juntam num envio só.

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

from core.mapa import ErroMapa, normalizar_magia, portal_atingido
from core.paredes import caminho
from core.nevoa import Nevoa

log = logging.getLogger("jardim-plataforma")

LIMITE_FILA = 256
#: Mensagens por segundo que uma conexão pode mandar; o resto é descartado. Folga para o
#: arrasto (30 por segundo), a régua (30) e o batimento ao mesmo tempo.
LIMITE_POR_SEGUNDO = 90
MAX_PONTOS_REGUA = 24
#: Efeitos de magia por pessoa: no máximo 3 a cada 2 segundos (o resto não chega à mesa).
MAGIAS_POR_JANELA = 3
JANELA_MAGIA_S = 2.0
#: As regras (quem vê, quem move) valem por alguns segundos e são recarregadas:
#: mudar a visibilidade de um participante na Sessão chega aqui no máximo nesse tempo.
VALIDADE_REGRAS_S = 5.0
#: Mudanças que chegam juntas (um traço de névoa e o clique logo depois) viram um envio só.
JUNTAR_MUDANCAS_S = 0.03
#: Eventos da Sessão que não mexem em nada que o mapa mostra.
#: O calendário muda o mapa (a hora e a luz do dia), então não está aqui.
EVENTOS_SEM_EFEITO_NO_MAPA = frozenset({"registro", "mesa", "destaque_mesa", "loot_rolado", "loot_entregue", "iniciativa"})
#: Partes do estado do mapa que vão inteiras quando mudam (tokens vão um a um).
CAMPOS_DO_ESTADO = ("gestor", "usuario_id", "ao_vivo", "bloqueado", "cenas", "moldura_mesa", "tempo", "mesa")
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
    papel: str = "jogador"
    personagens: frozenset[str] = field(default_factory=frozenset)
    permissoes_mesa: dict = field(default_factory=dict)
    cor_personalizada: str | None = None
    bloqueada: bool = False
    fila: asyncio.Queue = field(default_factory=lambda: asyncio.Queue(maxsize=LIMITE_FILA))
    enviadas: deque = field(default_factory=deque)
    #: Mensagens que se substituem enquanto esperam a saída (a posição de um token, a régua
    #: de alguém). Na fila fica só a marca; o texto mais novo mora aqui.
    juntas: dict = field(default_factory=dict)
    #: A cena que o Mestre está olhando (pode ser uma em preparo); jogador vê sempre a ativa.
    vendo: str | None = None
    #: Resumo do último estado mandado a esta tela, para mandar só a diferença.
    ultimo: dict | None = None
    seq: int = 0
    #: Horários dos últimos efeitos de magia que esta conexão mandou.
    magias: deque = field(default_factory=deque)

    @property
    def cor(self) -> str:
        return self.cor_personalizada or cor_de(self.usuario_id)

    def entregar(self, mensagem: str, chave: str | None = None) -> None:
        if chave is not None and chave in self.juntas:
            self.juntas[chave] = mensagem
            return
        try:
            self.fila.put_nowait(("junta", chave) if chave is not None else mensagem)
        except asyncio.QueueFull:
            self._ressincronizar()
            return
        if chave is not None:
            self.juntas[chave] = mensagem

    def _ressincronizar(self) -> None:
        """Fila cheia (aparelho lento, rede travando): o que esperava sai e a tela recarrega a cena."""
        log.debug("Fila do mapa cheia para %s; pedindo recarga", self.usuario_id)
        while not self.fila.empty():
            self.fila.get_nowait()
        self.juntas.clear()
        # A tela vai baixar o mapa inteiro: a próxima diferença parte do zero.
        self.ultimo = None
        self.fila.put_nowait(json.dumps({"t": "mudou", "versao": int(agora_ms()), "motivo": "fila"}))

    def _abrir(self, item) -> str | None:
        if isinstance(item, tuple):
            return self.juntas.pop(item[1], None)
        return item

    async def proxima(self) -> str:
        """A próxima mensagem para mandar a esta conexão."""
        while True:
            texto = self._abrir(await self.fila.get())
            if texto is not None:
                return texto

    def tirar_agora(self) -> list[str]:
        """Tudo o que está esperando, na ordem, sem esperar (testes)."""
        saida = []
        while not self.fila.empty():
            texto = self._abrir(self.fila.get_nowait())
            if texto is not None:
                saida.append(texto)
        return saida

    def dentro_do_limite(self) -> bool:
        agora = time.monotonic()
        while self.enviadas and agora - self.enviadas[0] > 1:
            self.enviadas.popleft()
        if len(self.enviadas) >= LIMITE_POR_SEGUNDO:
            return False
        self.enviadas.append(agora)
        return True

    def magia_liberada(self) -> bool:
        """Efeito de magia é para a mesa ver: no máximo MAGIAS_POR_JANELA a cada JANELA_MAGIA_S segundos."""
        agora = time.monotonic()
        while self.magias and agora - self.magias[0] > JANELA_MAGIA_S:
            self.magias.popleft()
        if len(self.magias) >= MAGIAS_POR_JANELA:
            return False
        self.magias.append(agora)
        return True


@dataclass
class RegraToken:
    #: 'todos', 'gestores' ou 'donos' (Mestre e dono do personagem).
    quem_ve: str
    donos: frozenset[str]
    #: Na cena livre, quem não é dono pode mover este token (ele aparece por inteiro).
    movivel_livre: bool
    #: Monstro, NPC ou objeto: com a névoa ligada, some para o jogador enquanto está coberto.
    some_na_nevoa: bool = False
    #: À vista na posição gravada, para saber se o primeiro arrasto o tira ou o põe na névoa.
    revelado: bool = True
    #: Camada liberada para jogadores; a camada oculta não pode ser vista nem movida pelo WebSocket.
    camada_visivel_jogadores: bool = True
    camada: str = "personagens"
    #: A última posição gravada (px): de onde sai o caminho que as paredes conferem.
    x: float = 0.0
    y: float = 0.0


@dataclass
class Regras:
    cena_id: str | None
    livre: bool
    largura: int
    altura: int
    tokens: dict[str, RegraToken]
    carregadas_em: float = field(default_factory=time.monotonic)
    #: As formas da névoa da cena ativa, ou None com a névoa desligada.
    nevoa: Nevoa | None = None
    #: Os portais da cena ativa (core/mapa.py, normalizar_portais) e o tamanho da casa, em px.
    portais: list = field(default_factory=list)
    casa: float = 100.0
    #: Paredes vivas (core/paredes.py, barreiras): trechos que barram o jogador e vãos abertos, em px.
    barram: list = field(default_factory=list)
    vaos: list = field(default_factory=list)
    #: Com visão individual, posições só são reenviadas após o estado personalizado do jogador.
    visao_pelas_paredes: bool = False
    #: Tokens à vista agora para cada conexão, usados também para impedir interação às cegas.
    visiveis_por_usuario: dict[str, frozenset[str]] = field(default_factory=dict)

    def vencidas(self) -> bool:
        return time.monotonic() - self.carregadas_em > VALIDADE_REGRAS_S


@dataclass(eq=False)
class Sala:
    conexoes: set = field(default_factory=set)
    regras: Regras | None = None
    #: O que a mesa sabe de cada token sujeito à névoa (à vista ou não), para avisar só quando muda.
    na_nevoa: dict[str, bool] = field(default_factory=dict)
    #: Sobe a cada mudança de estrutura: uma recarga que começou antes dela não vale mais.
    geracao: int = 0
    recarregando: bool = False
    empurrao_agendado: bool = False
    empurrando: bool = False
    #: Chegou mudança enquanto um envio era calculado: outro sai logo depois.
    de_novo: bool = False


#: Calcula o estado do mapa de cada conexão (None para quem perdeu o acesso). Registrado pela
#: rota do mapa, que tem o banco; sem ele, o hub volta ao "mudou" e cada tela recarrega.
Empurrador = Callable[[str, list], Awaitable[list]]

_salas: dict[str, Sala] = {}
_loop: asyncio.AbstractEventLoop | None = None
#: Recargas e envios em segundo plano (o laço só guarda referência fraca às tarefas).
_tarefas: set = set()
_empurrador: Empurrador | None = None


def registrar_empurrador(funcao: Empurrador | None) -> None:
    global _empurrador
    _empurrador = funcao


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


def anunciar(campanha_id, mensagem: dict) -> None:
    """Recado para toda a mesa conectada (a fala de um NPC). Nada fica gravado."""
    _no_loop(_anunciar, str(campanha_id), mensagem)


def _anunciar(campanha_id: str, mensagem: dict) -> None:
    sala = _salas.get(campanha_id)
    if sala:
        texto = json.dumps({**mensagem, "ts": agora_ms()}, ensure_ascii=False)
        for conexao in list(sala.conexoes):
            conexao.entregar(texto)


def anunciar_para(campanha_id, mensagem: dict, personagens: list | None) -> None:
    """Envia um documento aos gestores e aos jogadores donos dos personagens indicados.

    `None` significa todos os jogadores. O conteúdo só é montado pela rota depois de
    verificar que quem pediu é Mestre ou assistente.
    """
    alvos = None if personagens is None else frozenset(str(personagem) for personagem in personagens)
    _no_loop(_anunciar_para, str(campanha_id), mensagem, alvos)


def _anunciar_para(campanha_id: str, mensagem: dict, personagens: frozenset[str] | None) -> None:
    sala = _salas.get(campanha_id)
    if not sala:
        return
    texto = json.dumps({**mensagem, "ts": agora_ms()}, ensure_ascii=False)
    for conexao in list(sala.conexoes):
        if conexao.gestor or personagens is None or (conexao.personagens & personagens):
            conexao.entregar(texto)


def conectados(campanha_id) -> int:
    sala = _salas.get(str(campanha_id))
    return len(sala.conexoes) if sala else 0


def _avisar_presenca(sala: Sala) -> None:
    pessoas = {}
    for conexao in sala.conexoes:
        pessoas[conexao.usuario_id] = {
            "usuario_id": conexao.usuario_id, "nome": conexao.nome, "cor": conexao.cor,
            "gestor": conexao.gestor, "papel": conexao.papel,
        }
    mensagem = json.dumps({"t": "presenca", "pessoas": sorted(pessoas.values(), key=lambda p: p["nome"])}, ensure_ascii=False)
    for conexao in list(sala.conexoes):
        conexao.entregar(mensagem)


def _atualizar_membro(campanha_id: str, usuario_id: str, nome: str, cor: str | None, gestor: bool, papel: str, permissoes_mesa: dict, versao: int) -> None:
    sala = _salas.get(campanha_id)
    if sala:
        for conexao in sala.conexoes:
            if conexao.usuario_id != usuario_id:
                continue
            conexao.nome = nome
            conexao.cor_personalizada = cor
            conexao.gestor = gestor
            conexao.papel = papel
            conexao.permissoes_mesa = dict(permissoes_mesa)
        _avisar_presenca(sala)
    _invalidar(campanha_id, versao)


def atualizar_membro(campanha_id: str, usuario_id: str, *, nome: str, cor: str | None, gestor: bool, papel: str, permissoes_mesa: dict, versao: int) -> None:
    """Aplica alterações de papel, identidade e ferramentas nas conexões abertas."""
    _no_loop(_atualizar_membro, campanha_id, usuario_id, nome, cor, gestor, papel, permissoes_mesa, versao)


def _revogar_membro(campanha_id: str, usuario_id: str, versao: int) -> None:
    sala = _salas.get(campanha_id)
    if not sala:
        return
    for conexao in list(sala.conexoes):
        if conexao.usuario_id == usuario_id:
            conexao.entregar(json.dumps({"t": "aviso", "texto": "Seu acesso a esta campanha foi removido."}, ensure_ascii=False))
            conexao.bloqueada = True
            sala.conexoes.discard(conexao)
    if sala.conexoes:
        _avisar_presenca(sala)
    else:
        _salas.pop(campanha_id, None)
    _invalidar(campanha_id, versao)


def revogar_membro(campanha_id: str, usuario_id: str, versao: int) -> None:
    """Corta ações e presença de conexões abertas depois da remoção de um membro."""
    _no_loop(_revogar_membro, campanha_id, usuario_id, versao)


def _no_loop(funcao: Callable, *args) -> None:
    """Chamado de rotas síncronas (fora do loop): agenda a função no loop do servidor."""
    if _loop is None:
        funcao(*args)
        return
    try:
        _loop.call_soon_threadsafe(funcao, *args)
    except RuntimeError:
        log.debug("Loop indisponivel para o tempo real do mapa")


def _todos(sala: Sala, mensagem: dict) -> None:
    texto = json.dumps(mensagem)
    for conexao in list(sala.conexoes):
        conexao.entregar(texto)


def _invalidar(campanha_id: str, versao: int | None) -> None:
    sala = _salas.get(campanha_id)
    if not sala:
        return
    sala.regras = None
    sala.geracao += 1
    sala.na_nevoa.clear()
    if versao is not None:
        _agendar_empurrao(campanha_id, versao)


def mudou(campanha_id, versao: int | None = None) -> None:
    """A estrutura mudou (cena, token criado, escondido, removido): recarrega as regras e manda a mesa ao dia."""
    _no_loop(_invalidar, str(campanha_id), versao)


def esquecer_regras(campanha_id) -> None:
    """Só recarrega as regras, sem mandar nada a ninguém."""
    _no_loop(_invalidar, str(campanha_id), None)


def mudanca_da_sessao(campanha_id, tipo: str) -> None:
    """Um evento da Sessão: as regras recarregam (participante novo, visibilidade) e, se ele
    mexe no que o mapa mostra (vida, condições, participantes), a mesa recebe o recorte novo."""
    if tipo in EVENTOS_SEM_EFEITO_NO_MAPA or tipo.startswith(("veiculo_", "propriedade_")):
        esquecer_regras(campanha_id)
        return
    _no_loop(_invalidar, str(campanha_id), int(agora_ms()))


# ------------------------------------------------- diferenças do estado

def _texto(valor) -> str:
    return json.dumps(valor, sort_keys=True, ensure_ascii=False, default=str)


def diferenca(ultimo: dict | None, estado: dict) -> tuple[dict | None, dict]:
    """O que mandar a uma tela que recebeu `ultimo` (resumo) para ela ficar com `estado`.

    Devolve (mensagem ou None se nada mudou, resumo novo). Primeira vez ou outra cena:
    o estado inteiro. Depois, só os campos e os tokens que mudaram.
    """
    cena = estado.get("cena")
    tokens = estado.get("tokens") or []
    resumo = {
        "campos": {campo: _texto(estado.get(campo)) for campo in CAMPOS_DO_ESTADO},
        "cena_id": cena["id"] if cena else None,
        "cena": _texto(cena),
        "tokens": {token["id"]: _texto(token) for token in tokens},
        "ordem": [token["id"] for token in tokens],
    }
    if ultimo is None or ultimo["cena_id"] != resumo["cena_id"]:
        return {"t": "estado", "estado": estado}, resumo
    mensagem: dict = {"t": "delta", "cena_id": resumo["cena_id"]}
    for campo in CAMPOS_DO_ESTADO:
        if ultimo["campos"].get(campo) != resumo["campos"][campo]:
            mensagem[campo] = estado.get(campo)
    if ultimo["cena"] != resumo["cena"]:
        mensagem["cena"] = cena
    mudar = [token for token in tokens if ultimo["tokens"].get(token["id"]) != resumo["tokens"][token["id"]]]
    tirar = [token_id for token_id in ultimo["tokens"] if token_id not in resumo["tokens"]]
    if mudar:
        mensagem["mudar"] = mudar
    if tirar:
        mensagem["tirar"] = tirar
    if ultimo["ordem"] != resumo["ordem"]:
        mensagem["ordem"] = resumo["ordem"]
    return (mensagem if len(mensagem) > 2 else None), resumo


def _agendar_empurrao(campanha_id: str, versao: int | None = None) -> None:
    sala = _salas.get(campanha_id)
    if not sala:
        return
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = None
    if _empurrador is None or loop is None:
        # Ninguém para calcular o recorte de cada um: cada tela recarrega o mapa.
        _todos(sala, {"t": "mudou", "versao": versao if versao is not None else int(agora_ms())})
        return
    if sala.empurrando:
        sala.de_novo = True
        return
    if sala.empurrao_agendado:
        return
    sala.empurrao_agendado = True
    loop.call_later(JUNTAR_MUDANCAS_S, _comecar_empurrao, campanha_id)


def _comecar_empurrao(campanha_id: str) -> None:
    sala = _salas.get(campanha_id)
    if not sala:
        return
    sala.empurrao_agendado = False
    sala.empurrando = True
    tarefa = asyncio.get_running_loop().create_task(_empurrar(campanha_id, sala))
    _tarefas.add(tarefa)
    tarefa.add_done_callback(_tarefas.discard)


async def _empurrar(campanha_id: str, sala: Sala) -> None:
    try:
        conexoes = list(sala.conexoes)
        if not conexoes or _empurrador is None:
            return
        try:
            estados = await _empurrador(campanha_id, conexoes)
        except Exception:  # noqa: BLE001 - sem o recorte, a mesa recarrega do jeito antigo
            log.exception("Falha ao calcular o estado do mapa para a mesa")
            _todos(sala, {"t": "mudou", "versao": int(agora_ms())})
            return
        ts = agora_ms()
        for conexao, estado in zip(conexoes, estados):
            if conexao not in sala.conexoes:
                continue
            if estado is None:
                conexao.ultimo = None
                conexao.entregar(json.dumps({"t": "mudou", "versao": int(ts)}))
                continue
            mensagem, conexao.ultimo = diferenca(conexao.ultimo, estado)
            if mensagem is None:
                continue
            conexao.seq += 1
            mensagem["seq"] = conexao.seq
            mensagem["ts"] = ts
            conexao.entregar(json.dumps(mensagem, ensure_ascii=False, default=str))
    finally:
        sala.empurrando = False
        if sala.de_novo:
            sala.de_novo = False
            _agendar_empurrao(campanha_id)


def _pode_ver(conexao: Conexao, regra: RegraToken, a_vista: bool = True) -> bool:
    """`a_vista`: o token não está coberto pela névoa (ou não some nela)."""
    if conexao.gestor:
        return True
    if not _pode_ver_camada(conexao, regra):
        return False
    if regra.quem_ve == "todos":
        return a_vista or conexao.usuario_id in regra.donos
    if regra.quem_ve == "donos":
        return conexao.usuario_id in regra.donos
    return False


def _pode_ver_camada(conexao: Conexao, regra: RegraToken) -> bool:
    if conexao.gestor:
        return True
    camadas = conexao.permissoes_mesa.get("camadas", {})
    return regra.camada_visivel_jogadores and camadas.get(regra.camada, True)


def _pode_mover(conexao: Conexao, regra: RegraToken, regras: Regras, token_id: str) -> bool:
    if conexao.gestor:
        return True
    if regras.visao_pelas_paredes and token_id not in regras.visiveis_por_usuario.get(conexao.usuario_id, frozenset()):
        return False
    permissoes = conexao.permissoes_mesa
    camadas = permissoes.get("camadas", {})
    if not permissoes.get("mover_tokens", True):
        return False
    if not regra.camada_visivel_jogadores or not camadas.get(regra.camada, True):
        return False
    if conexao.usuario_id in regra.donos:
        return True
    return regras.livre and regra.movivel_livre and regra.quem_ve == "todos"


def _numero(valor) -> float | None:
    if isinstance(valor, bool) or not isinstance(valor, (int, float)) or not math.isfinite(valor):
        return None
    return float(valor)


def _pode_usar(conexao: Conexao, acao: str) -> bool:
    return conexao.gestor or conexao.permissoes_mesa.get(acao, True)


def _repassar(
    sala: Sala, origem: Conexao, mensagem: dict, regra: RegraToken | None = None, a_vista: bool = True, chave: str | None = None,
) -> None:
    texto = json.dumps(mensagem, ensure_ascii=False)
    for conexao in list(sala.conexoes):
        if conexao is origem:
            continue
        if regra is not None and not _pode_ver(conexao, regra, a_vista):
            continue
        conexao.entregar(texto, chave)


def _avisar_quem_nao_via(sala: Sala, regra: RegraToken, mensagem: dict) -> None:
    """Avisa quem pode ver a camada, mas ainda não recebeu o token por causa da névoa."""
    texto = json.dumps(mensagem, ensure_ascii=False)
    for conexao in list(sala.conexoes):
        if not conexao.gestor and conexao.usuario_id not in regra.donos and _pode_ver_camada(conexao, regra):
            conexao.entregar(texto)


CarregarRegras = Callable[[], Awaitable[Regras]]
#: Grava a posição; com `cena=`, leva o token a outra cena (portal entre cenas) e devolve
#: {"nome", "cena_nome"} ou None.
GravarPosicao = Callable[..., Awaitable]


async def _recarregar(sala: Sala, carregar_regras: CarregarRegras, geracao: int) -> None:
    """`geracao` é a da hora em que a recarga foi pedida: uma mudança de estrutura no meio a anula."""
    try:
        novas = await carregar_regras()
        if sala.geracao == geracao:
            sala.regras = novas
    except Exception:  # noqa: BLE001 - as regras antigas seguem valendo até a próxima tentativa
        log.exception("Falha ao recarregar as regras do mapa")
        if sala.regras is not None:
            sala.regras.carregadas_em = time.monotonic()
    finally:
        sala.recarregando = False


async def _regras_da_sala(sala: Sala, carregar_regras: CarregarRegras) -> Regras:
    """Sem regras (sala nova ou estrutura mudou), espera o banco. Vencidas só pelo tempo,
    segue com as de agora e recarrega em segundo plano: o arrasto não espera o banco."""
    regras = sala.regras
    if regras is None:
        geracao = sala.geracao
        regras = await carregar_regras()
        if sala.geracao == geracao:
            sala.regras = regras
        return regras
    if regras.vencidas() and not sala.recarregando:
        sala.recarregando = True
        tarefa = asyncio.get_running_loop().create_task(_recarregar(sala, carregar_regras, sala.geracao))
        _tarefas.add(tarefa)
        tarefa.add_done_callback(_tarefas.discard)
    return regras


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
    if conexao.bloqueada:
        return {"t": "erro", "motivo": "acesso removido da campanha"}
    tipo = mensagem.get("t")
    if tipo == "oi":
        # `c` volta como veio: com ele e `ts`, o navegador mede a ida e volta e acerta o relógio com o servidor.
        resposta = {"t": "oi", "ts": agora_ms()}
        c = _numero(mensagem.get("c"))
        if c is not None:
            resposta["c"] = c
        return resposta
    if tipo == "vendo":
        # O Mestre trocou a cena que olha: as próximas mudanças vêm dela, e a primeira vem inteira.
        if conexao.gestor:
            cena = mensagem.get("cena")
            conexao.vendo = cena if isinstance(cena, str) and 0 < len(cena) <= 64 else None
            conexao.ultimo = None
        return None
    if not conexao.dentro_do_limite():
        return None
    sala = _sala(campanha_id)
    regras = await _regras_da_sala(sala, carregar_regras)

    if tipo in ("arrastar", "soltar"):
        token_id = str(mensagem.get("token") or "")
        regra = regras.tokens.get(token_id)
        x = _numero(mensagem.get("x"))
        y = _numero(mensagem.get("y"))
        if regra is None or x is None or y is None:
            return {"t": "erro", "motivo": "token desconhecido"}
        if not _pode_mover(conexao, regra, regras, token_id):
            return {"t": "erro", "motivo": "voce nao move este token", "token": token_id}
        x = max(0.0, min(float(regras.largura), x))
        y = max(0.0, min(float(regras.altura), y))
        barrado = False
        if not conexao.gestor and regras.barram:
            # Parede, janela e porta fechada seguram o jogador; o Mestre atravessa.
            x, y, barrado = caminho(regra.x, regra.y, x, y, regras.barram, regras.vaos, regras.casa)
        travessia = None
        if tipo == "soltar" and regras.portais:
            aceito = mensagem.get("atravessar")
            achado = portal_atingido(
                regras.portais, x, y, regras.casa, gestor=conexao.gestor, aceito=aceito if isinstance(aceito, str) else None,
            )
            if achado and achado[0].get("cena"):
                return await _atravessar_para_outra_cena(sala, conexao, campanha_id, token_id, achado, gravar_posicao)
            if achado:
                portal, (px, py) = achado
                de_vista = regras.nevoa is None or not regra.some_na_nevoa or regras.nevoa.revelado(x, y)
                travessia = {"portal": portal["id"], "fluxo": portal["fluxo"], "de": [round(x, 2), round(y, 2)] if de_vista else None}
                x, y = float(px), float(py)
        a_vista, antes = True, True
        if regras.nevoa is not None and regra.some_na_nevoa and regra.quem_ve == "todos":
            a_vista = regras.nevoa.revelado(x, y)
            antes = sala.na_nevoa.get(token_id, regra.revelado)
            sala.na_nevoa[token_id] = a_vista
        saiu_da_nevoa = a_vista and not antes
        repasse = {
            "t": "arrastando" if tipo == "arrastar" else "token",
            "token": token_id,
            "x": round(x, 2),
            "y": round(y, 2),
            "ts": agora_ms(),
            "por": conexao.usuario_id,
        }
        # `tm`: a hora do gesto, no relógio do servidor estimado por quem arrasta. Só serve ao medidor.
        tm = _numero(mensagem.get("tm"))
        if tm is not None:
            repasse["tm"] = round(tm)
        if travessia is not None:
            # Atravessou um portal: todos (e quem soltou) veem o token sumir de um lado e surgir no outro.
            repasse.update({"t": "portal", **travessia})
        # A mesa recebe a posição antes do banco gravar: soltar não espera o banco.
        # A posição intermediária poderia mostrar um token atravessando uma
        # parede. Com visão por jogador, cada pessoa recebe o recorte do servidor
        # depois do soltar; quem arrasta continua vendo o movimento local.
        if not regras.visao_pelas_paredes:
            _repassar(sala, conexao, repasse, regra, a_vista, chave=f"t:{token_id}")
        if tipo == "soltar" or saiu_da_nevoa:
            # Saindo da névoa no meio do arrasto, a posição também vai para o banco: os
            # jogadores ainda não conhecem o token e o GET deles precisa trazê-lo aqui.
            if not await gravar_posicao(token_id, x, y):
                # A posição repassada não valeu (o token saiu da cena): todos recarregam.
                _invalidar(str(campanha_id), int(agora_ms()))
                return {"t": "erro", "motivo": "o token saiu da cena", "token": token_id}
            if tipo == "soltar":
                regra.x, regra.y = x, y
                if regras.visao_pelas_paredes:
                    _invalidar(str(campanha_id), int(agora_ms()))
        if saiu_da_nevoa:
            # Os jogadores ainda não conhecem o token: recebem o recorte novo (ou recarregam).
            if _empurrador is not None:
                _agendar_empurrao(str(campanha_id))
            else:
                _avisar_quem_nao_via(sala, regra, {"t": "mudou", "versao": int(agora_ms())})
        elif antes and not a_vista:
            _avisar_quem_nao_via(sala, regra, {"t": "sumiu", "token": token_id})
        if travessia is not None:
            return repasse
        if barrado and tipo == "soltar":
            # Quem soltou vê o token voltar para antes da parede.
            return {**repasse, "barrado": True}
        return None

    if tipo == "ping":
        if not _pode_usar(conexao, "usar_ping"):
            return {"t": "erro", "motivo": "ping bloqueado pelo mestre"}
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
        if not _pode_usar(conexao, "usar_regua"):
            return {"t": "erro", "motivo": "regua bloqueada pelo mestre"}
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
        }, chave=f"r:{conexao.usuario_id}")
        return None

    if tipo == "magia":
        # Efeito de magia jogado no mapa: só passa por aqui, a mesa inteira vê e nada é gravado.
        if not _pode_usar(conexao, "usar_magia"):
            return {"t": "erro", "motivo": "efeito de magia bloqueado pelo mestre"}
        if not conexao.magia_liberada():
            return None
        try:
            magia = normalizar_magia(mensagem, regras.largura, regras.altura)
        except ErroMapa as erro:
            return {"t": "erro", "motivo": erro.mensagem}
        repasse = {
            "t": "magia", **magia, "ts": agora_ms(),
            "por": conexao.usuario_id, "nome": conexao.nome, "cor": conexao.cor,
        }
        # Magia do Mestre toda dentro da névoa (um teste, uma armadilha preparada) fica entre quem comanda.
        escondida = (
            conexao.gestor and regras.nevoa is not None
            and not regras.nevoa.revelado(magia["x"], magia["y"]) and not regras.nevoa.revelado(magia["ax"], magia["ay"])
        )
        if escondida:
            texto = json.dumps(repasse, ensure_ascii=False)
            for outra in list(sala.conexoes):
                if outra is not conexao and outra.gestor:
                    outra.entregar(texto)
        else:
            _repassar(sala, conexao, repasse)
        return None

    return {"t": "erro", "motivo": "tipo de mensagem desconhecido"}


async def _atravessar_para_outra_cena(sala: Sala, conexao: Conexao, campanha_id, token_id: str, achado, gravar_posicao) -> dict:
    """Portal entre cenas: o token vai gravado para a outra cena, a mesa recarrega (ele some da
    cena ativa) e quem comanda recebe um aviso dizendo para onde ele foi."""
    portal, (px, py) = achado
    levado = await gravar_posicao(token_id, float(px), float(py), cena=portal["cena"])
    _invalidar(str(campanha_id), int(agora_ms()))
    if not levado:
        return {"t": "erro", "motivo": "a cena do portal nao existe mais", "token": token_id}
    aviso = json.dumps({
        "t": "aviso",
        "texto": f"{levado['nome']} atravessou o portal {portal['nome']} e foi para a cena {levado['cena_nome']}.",
    }, ensure_ascii=False)
    for outra in list(sala.conexoes):
        if outra.gestor and outra is not conexao:
            outra.entregar(aviso)
    resposta = {"t": "portal_cena", "token": token_id, "fluxo": portal["fluxo"]}
    if conexao.gestor:
        resposta.update({"cena": portal["cena"], "cena_nome": levado["cena_nome"]})
    return resposta


def _limpar_para_testes() -> None:
    _salas.clear()
    registrar_empurrador(None)
