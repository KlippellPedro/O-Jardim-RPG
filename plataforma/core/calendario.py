"""Calendário do mundo e estações.

O ano tem um mês para cada Árvore (10, contando o Abismo), de 28 dias, e cada mês é uma lunação:
Lua Nova no dia 1 e Lua Cheia no dia 15. Alguns meses têm dias a mais, que só
existem ali (o mês do Limiar tem o dia 29, o da Lua Carmesim). O Mestre
diz que dia é "hoje" no mundo e avança quando a história avança; os jogadores
leem. Eventos do calendário (festivais, prazos, profecias) têm três graus de
revelação: `oculto` (jogador não vê nem que existe), `rasurado` (jogador vê que
há ALGO naquele dia, sem título nem texto) e `aberto`. O que é `oculto` ou
`rasurado` nunca sai do servidor com o texto.

Módulo puro: sem banco e sem HTTP, para testar sem subir nada.
"""

from __future__ import annotations

import hashlib
from copy import deepcopy
from datetime import datetime, timezone
from uuid import uuid4

MAX_EVENTOS = 120
MAX_HISTORICO = 10
VERSAO_DO_ESTADO = 2

ESTACOES_NORMAIS = ("primavera", "verao", "outono", "inverno")
ESTACOES_ESPECIAIS = ("noite_eterna", "eclipse")
REVELACOES = ("oculto", "rasurado", "aberto")

# Descrições e clima seguem as do Jornalista (bots/jornalista/core/economia.py), que
# é o dono da estação no Discord.
ESTACOES = {
    "primavera": {"rotulo": "Primavera", "tipo": "normal", "descricao": "Renascimento e floração: mais variedade brota no Jardim."},
    "verao": {"rotulo": "Verão", "tipo": "normal", "descricao": "Calor e fartura: abundância de coisas comuns."},
    "outono": {"rotulo": "Outono", "tipo": "normal", "descricao": "Colheita e transição: o Jardim num equilíbrio mutável."},
    "inverno": {"rotulo": "Inverno", "tipo": "normal", "descricao": "Frio cortante: o loot minguou junto com o verde."},
    "noite_eterna": {"rotulo": "Noite Eterna", "tipo": "especial", "descricao": "O sol não nasce: perigo e recompensa em dose dupla."},
    "eclipse": {"rotulo": "Eclipse", "tipo": "especial", "descricao": "O véu se abre e tesouros surgem."},
}

# Um mês por Árvore (mais o Abismo), na ordem das Árvores: nome padrão e estação.
# As estações não dividem o ano em partes iguais (3, 2, 3 e 2 meses). O nome do
# mês o Mestre pode trocar; os dias e a estação são do calendário.
MESES_DO_ANO = (
    ("Gênese", "primavera"),
    ("Alétheia", "primavera"),
    ("Keryx", "primavera"),
    ("Anima", "verao"),
    ("Vórtice", "verao"),
    ("Baluarte", "outono"),
    ("Matriz", "outono"),
    ("Éon", "outono"),
    ("Limiar", "inverno"),
    ("Abismo", "inverno"),
)

DIAS_BASE = 28
DIA_EXTRA = 29
# Os meses de 28 dias se dividem em 4 semanas de 7 dias.
DIAS_DA_SEMANA = 7

# Eventos do ano, de 1 a 2 por mês. São propostas de calendário do mundo: o
# Mestre liga ou desliga cada um por campanha. O calendário vale para TODAS as
# Árvores, então a descrição fala do que acontece com o mundo naquele dia e
# nunca de um lugar só (nada de Viveiro, Malha, Alicerce). Três tipos:
#   fixo      começa sempre no mesmo dia do mês e pode durar vários dias (`duracao`);
#   extra     ganha um dia a mais (o 29) que só existe naquele mês;
#   aleatorio cai num dia sorteado dos 28, diferente a cada ano (o sorteio é
#             sempre o mesmo para o mesmo ano). O jogador só o enxerga quando o
#             dia chega; o Mestre sabe antes.
EVENTOS_DO_ANO = (
    {
        "id": "chuva-roxa", "mes": 0, "tipo": "aleatorio", "nome": "Chuva Roxa",
        "descricao": "Em qualquer Árvore, o céu respira: as nuvens giram contra o vento e o ar fica pesado. Depois caem gotas violeta, e quem toca numa sente a vida escorrer. Só abrigo fechado ou mágico protege.",
    },
    {
        "id": "baile-da-primavera", "mes": 0, "tipo": "fixo", "dia": 15, "duracao": DIAS_DA_SEMANA, "nome": "Baile da Primavera",
        "descricao": "Uma semana inteira, em toda parte, entre flores e em danças de roda. É o baile do amor e das alianças novas, e casamentos e pactos costumam ser anunciados nesses dias.",
    },
    {
        "id": "dia-dos-pactos", "mes": 1, "tipo": "extra", "nome": "Dia dos Pactos",
        "descricao": "Um dia a mais, que só existe no mês de Alétheia. Quem quer um acordo que valha de verdade costuma escolher este dia para selá-lo.",
    },
    {
        "id": "silencio-da-malha", "mes": 2, "tipo": "aleatorio", "nome": "Grande Silêncio",
        "descricao": "Nesse dia toda comunicação falha, em qualquer Árvore. Mensagens não chegam, aparelhos e meios de contato não respondem, e cada um fica sozinho até o dia acabar.",
    },
    {
        "id": "baile-do-verao", "mes": 3, "tipo": "fixo", "dia": 15, "duracao": DIAS_DA_SEMANA, "nome": "Baile do Verão",
        "descricao": "Uma semana inteira ao ar livre, com fogueiras e banquete farto. Música forte, competições amistosas e famílias mostrando poder e riqueza.",
    },
    {
        "id": "florescer-subito", "mes": 3, "tipo": "aleatorio", "nome": "Florescer Súbito",
        "descricao": "Nesse dia tudo que vive cresce e floresce mais depressa. Plantas brotam à vista, bichos se recuperam e a vida parece aproveitar cada hora.",
    },
    {
        "id": "tormenta-da-inconstancia", "mes": 4, "tipo": "aleatorio", "nome": "Grande Tormenta",
        "descricao": "Nesse dia nada se comporta como ontem. A sorte vira, o clima muda sem aviso e planos bem feitos saem do trilho.",
    },
    {
        "id": "desastre-elemental", "mes": 5, "tipo": "aleatorio", "nome": "Desastre Elemental",
        "descricao": "Nesse dia um elemento perde o freio, onde quer que haja mundo: a terra treme, a água sobe, o fogo corre ou o vento arranca o que estiver de pé. Ninguém sabe qual será até começar.",
    },
    {
        "id": "baile-do-outono", "mes": 5, "tipo": "fixo", "dia": 15, "duracao": DIAS_DA_SEMANA, "nome": "Baile do Outono",
        "descricao": "Uma semana mais calma, em tons quentes. Agradece a colheita, lembra quem se foi e costuma ser interrompida por encenações de lendas antigas.",
    },
    {
        "id": "mare-de-portais", "mes": 6, "tipo": "aleatorio", "nome": "Maré de Portais",
        "descricao": "Nesse dia o espaço afrouxa. Portais se abrem sozinhos e ligam lugares que não deveriam se tocar.",
    },
    {
        "id": "dia-fora-do-tempo", "mes": 7, "tipo": "extra", "nome": "Dia Fora do Tempo",
        "descricao": "Um dia a mais, que só existe no mês de Éon. Ninguém sabe onde ele se encaixa, e há quem jure que já aconteceu.",
    },
    {
        "id": "lua-carmesim", "mes": 8, "tipo": "extra", "nome": "Dia da Lua Carmesim",
        "descricao": "Um dia a mais, que só existe no mês do Limiar. É quando o céu pode ficar vermelho.",
    },
    {
        "id": "baile-do-inverno", "mes": 8, "tipo": "fixo", "dia": 15, "duracao": DIAS_DA_SEMANA, "nome": "Baile do Inverno",
        "descricao": "Uma semana em salões de candelabros e cristais de gelo, todos de máscara. Noites de discursos formais, danças lentas e acordos selados em segredo.",
    },
    {
        "id": "eclipse", "mes": 9, "tipo": "aleatorio", "nome": "Eclipse",
        "descricao": "Nesse dia o sol some em pleno dia, em toda Árvore. O véu se abre e coisas guardadas aparecem. O Mestre pode ligar a estação especial Eclipse.",
    },
    {
        "id": "dia-em-branco", "mes": 9, "tipo": "extra", "nome": "Dia em Branco",
        "descricao": "Um dia a mais, que só existe no mês do Abismo. Quem o viveu conta pouca coisa, e o pouco que conta não bate com o que os outros lembram.",
    },
)
IDS_DOS_EVENTOS_DO_ANO = frozenset(evento["id"] for evento in EVENTOS_DO_ANO)

MESES_POR_ANO = len(MESES_DO_ANO)
MESES_PADRAO = tuple(mes[0] for mes in MESES_DO_ANO)
DIAS_DOS_MESES = tuple(
    DIAS_BASE + (1 if any(e["mes"] == mes and e["tipo"] == "extra" for e in EVENTOS_DO_ANO) else 0)
    for mes in range(MESES_POR_ANO)
)
DIAS_POR_ANO = sum(DIAS_DOS_MESES)
DIAS_DA_LUNACAO = DIAS_BASE

# Listas de nomes que já foram o padrão. Uma campanha que ainda usa uma delas
# (o Mestre nunca renomeou) passa para o padrão de agora; nome personalizado fica.
_PADROES_ANTIGOS = (
    ("Aethel", "Ousias", "A.X.I.S", "Haemus", "Ignis", "Moros", "Aperion", "Chronus", "Mulher Carmesim", "Erebus"),
    ("Aethel", "Ousias", "Keryx", "Haemus", "Ignis", "Moros", "Aperion", "Chronus", "Mulher Carmesim", "Erebus"),
    ("Gênese", "Alétheia", "A.X.I.S", "Anima", "Vórtice", "Baluarte", "Matriz", "Éon", "Limiar", "O Vazio"),
    ("Gênese", "Alétheia", "Keryx", "Anima", "Vórtice", "Baluarte", "Matriz", "Éon", "Limiar", "Vazio"),
)

_INICIO_DOS_MESES = tuple(sum(DIAS_DOS_MESES[:indice]) for indice in range(MESES_POR_ANO))
MESES_SEM_DIA_EXTRA = tuple(mes for mes in range(MESES_POR_ANO) if DIAS_DOS_MESES[mes] == DIAS_BASE)
REPETICOES = ("unico", "mensal", "anual")
MAX_DURACAO = DIAS_BASE


def dias_do_mes(mes: int, dias: tuple[int, ...] = DIAS_DOS_MESES) -> int:
    return dias[mes]


class ErroCalendario(Exception):
    def __init__(self, mensagem: str, codigo: int = 422):
        super().__init__(mensagem)
        self.mensagem = mensagem
        self.codigo = codigo


def estado_inicial() -> dict:
    return {
        "versao": VERSAO_DO_ESTADO,
        "config": {"meses": list(MESES_PADRAO), "sincronizar_discord": True, "dias_extras": []},
        "hoje": {"ano": 1, "mes": 0, "dia": 1},
        "estacao_especial": None,
        "eventos": [],
        "historico": [],
    }


def _texto(valor, limite: int, campo: str, *, obrigatorio: bool = True) -> str:
    texto = " ".join(str(valor or "").split())
    if obrigatorio and not texto:
        raise ErroCalendario(f"{campo} e obrigatorio")
    return texto[:limite]


def _inteiro(valor, campo: str, minimo: int, maximo: int) -> int:
    if isinstance(valor, bool) or not isinstance(valor, int):
        raise ErroCalendario(f"{campo} precisa ser um numero inteiro")
    if valor < minimo or valor > maximo:
        raise ErroCalendario(f"{campo} fora do intervalo ({minimo} a {maximo})")
    return valor


def completar(estado: dict | None) -> dict:
    """O estado com todos os campos, mesmo vindo vazio do banco."""
    base = estado_inicial()
    antigo = isinstance(estado, dict) and bool(estado) and estado.get("versao") != VERSAO_DO_ESTADO
    if isinstance(estado, dict):
        for chave in base:
            if chave in estado and estado[chave] is not None:
                base[chave] = estado[chave]
        config = dict(estado_inicial()["config"])
        if isinstance(estado.get("config"), dict):
            config.update(estado["config"])
        base["config"] = config
    if antigo:
        _migrar_para_o_ano_das_deidades(base)
    meses = base["config"].get("meses")
    if not isinstance(meses, list) or len(meses) != MESES_POR_ANO or tuple(meses) in _PADROES_ANTIGOS:
        base["config"]["meses"] = list(MESES_PADRAO)
    if not isinstance(base["config"].get("dias_extras"), list):
        base["config"]["dias_extras"] = []
    if not isinstance(base.get("historico"), list):
        base["historico"] = []
    return base


def _migrar_para_o_ano_das_deidades(estado: dict) -> None:
    """Calendários salvos antes tinham 12 meses de 30 dias com nomes de estação.
    Os nomes voltam ao padrão e as datas são encaixadas no ano novo (o dia é
    cortado no último dia do mês novo)."""
    estado["versao"] = VERSAO_DO_ESTADO
    estado["config"]["meses"] = list(MESES_PADRAO)

    def encaixar(data: dict) -> None:
        mes = min(max(int(data.get("mes", 0) or 0), 0), MESES_POR_ANO - 1)
        data["mes"] = mes
        data["dia"] = min(max(int(data.get("dia", 1) or 1), 1), dias_do_mes(mes))

    if isinstance(estado.get("hoje"), dict):
        encaixar(estado["hoje"])
    for evento in estado.get("eventos") or []:
        if isinstance(evento, dict):
            encaixar(evento)


# ------------------------------------------------------------ dias a mais criados pelo Mestre

def _extras_criados(estado: dict) -> list[dict]:
    return [item for item in estado["config"].get("dias_extras") or [] if isinstance(item, dict)]


def _dias_do_estado(estado: dict) -> tuple[int, ...]:
    """Quantos dias cada mês tem NESTA campanha: o padrão mais os dias a mais que o Mestre criou."""
    criados = {item["mes"] for item in _extras_criados(estado)}
    return tuple(DIAS_DOS_MESES[mes] + (1 if mes in criados else 0) for mes in range(MESES_POR_ANO))


def _todos_os_eventos_do_ano(estado: dict) -> list[dict]:
    """Os eventos do ano do calendário e os dias a mais que o Mestre criou nesta campanha."""
    criados = [
        {"id": item["id"], "mes": item["mes"], "tipo": "extra", "nome": item["nome"], "descricao": item.get("descricao", ""), "custom": True}
        for item in _extras_criados(estado)
    ]
    return [*EVENTOS_DO_ANO, *criados]


def _encaixar_data(data: dict, dias: tuple[int, ...]) -> None:
    data["dia"] = min(data["dia"], dias[data["mes"]])


def criar_dia_extra(estado: dict, dados: dict) -> dict:
    """Dá um dia a mais (o 29) a um mês que ainda tem 28 dias, com nome e texto."""
    mes = _inteiro(dados.get("mes"), "mes", 0, MESES_POR_ANO - 1)
    if mes not in MESES_SEM_DIA_EXTRA or any(item["mes"] == mes for item in _extras_criados(estado)):
        raise ErroCalendario("esse mes ja tem um dia a mais", 409)
    extra = {
        "id": f"extra-{mes}",
        "mes": mes,
        "nome": _texto(dados.get("nome"), 40, "nome do dia"),
        "descricao": _texto(dados.get("descricao"), 300, "descricao", obrigatorio=False),
    }
    estado["config"].setdefault("dias_extras", []).append(extra)
    return extra


def apagar_dia_extra(estado: dict, mes) -> None:
    """Tira o dia a mais criado pelo Mestre. Acontecimentos marcados nele vão para o último dia normal."""
    mes = _inteiro(mes, "mes", 0, MESES_POR_ANO - 1)
    extras = _extras_criados(estado)
    extra = next((item for item in extras if item["mes"] == mes), None)
    if extra is None:
        raise ErroCalendario("dia a mais nao encontrado", 404)
    hoje = estado["hoje"]
    if hoje["mes"] == mes and hoje["dia"] > DIAS_BASE:
        raise ErroCalendario("hoje e esse dia: mude a data do mundo antes de apagar", 409)
    estado["config"]["dias_extras"] = [item for item in extras if item["mes"] != mes]
    estado["config"]["eventos_desligados"] = [item for item in estado["config"].get("eventos_desligados") or [] if item != extra["id"]]
    dias = _dias_do_estado(estado)
    for evento in estado["eventos"]:
        if evento.get("mes") == mes and evento.get("dia", 1) > DIAS_BASE:
            evento["dia"] = DIAS_BASE
    for item in estado.get("historico") or []:
        if isinstance(item.get("hoje"), dict):
            _encaixar_data(item["hoje"], dias)


# ------------------------------------------------------------ datas

def para_dia_absoluto(ano: int, mes: int, dia: int, dias: tuple[int, ...] = DIAS_DOS_MESES) -> int:
    """Dias desde o ano 1, mês 0, dia 1 (que vale 0). Anos podem ser negativos (eras antigas)."""
    return (ano - 1) * sum(dias) + sum(dias[:mes]) + (dia - 1)


def de_dia_absoluto(total: int, dias: tuple[int, ...] = DIAS_DOS_MESES) -> dict:
    ano, resto = divmod(total, sum(dias))
    mes = 0
    while mes < len(dias) - 1 and resto >= dias[mes]:
        resto -= dias[mes]
        mes += 1
    return {"ano": ano + 1, "mes": mes, "dia": resto + 1}


def estacao_do_mes(mes: int) -> str:
    return MESES_DO_ANO[mes][1]


def estacao_atual(estado: dict) -> str:
    """A estação que vale hoje: a especial (Noite Eterna, Eclipse), se o Mestre a declarou, senão a do mês."""
    especial = estado.get("estacao_especial")
    if especial in ESTACOES_ESPECIAIS:
        return especial
    return estacao_do_mes(estado["hoje"]["mes"])


def info_da_estacao(chave: str) -> dict:
    return {"chave": chave, **ESTACOES[chave]}


def _dia_sorteado(evento_id: str, ano: int) -> int:
    """Um dia de 1 a 28, sempre o mesmo para o mesmo evento e o mesmo ano."""
    digest = hashlib.sha256(f"{evento_id}:{ano}".encode("utf-8")).digest()
    return int.from_bytes(digest[:4], "big") % DIAS_BASE + 1


def dia_do_evento_do_ano(evento: dict, ano: int) -> int:
    if evento["tipo"] == "fixo":
        return evento["dia"]
    if evento["tipo"] == "extra":
        return DIA_EXTRA
    return _dia_sorteado(evento["id"], ano)


def _eventos_do_ano_ativos(estado: dict) -> list[dict]:
    desligados = set(estado["config"].get("eventos_desligados") or [])
    return [evento for evento in _todos_os_eventos_do_ano(estado) if evento["id"] not in desligados]


def dias_ate(hoje: dict, ano: int, mes: int, dia: int, dias: tuple[int, ...] = DIAS_DOS_MESES) -> int:
    return para_dia_absoluto(ano, mes, dia, dias) - para_dia_absoluto(hoje["ano"], hoje["mes"], hoje["dia"], dias)


# ------------------------------------------------------------ ações (Mestre)

def _validar_data(estado: dict, ano, mes, dia) -> tuple[int, int, int]:
    ano = _inteiro(ano, "ano", -99999, 99999)
    mes = _inteiro(mes, "mes", 0, MESES_POR_ANO - 1)
    return ano, mes, _inteiro(dia, "dia", 1, _dias_do_estado(estado)[mes])


def _registrar(estado: dict, texto: str) -> None:
    """Guarda o estado do tempo ANTES de uma mudança, para o Mestre poder desfazer."""
    historico = estado.setdefault("historico", [])
    historico.append({
        "quando": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "texto": texto,
        "hoje": deepcopy(estado["hoje"]),
        "estacao_especial": estado.get("estacao_especial"),
    })
    del historico[:-MAX_HISTORICO]


def _nome_da_data(estado: dict, data: dict) -> str:
    return f"dia {data['dia']} · {estado['config']['meses'][data['mes']]}, ano {data['ano']}"


def definir_hoje(estado: dict, dados: dict) -> dict:
    ano, mes, dia = _validar_data(estado, dados.get("ano"), dados.get("mes"), dados.get("dia"))
    novo = {"ano": ano, "mes": mes, "dia": dia}
    _registrar(estado, f"Definiu a data: {_nome_da_data(estado, novo)}")
    estado["hoje"] = novo
    # Mudar o dia à mão para outra estação encerra o evento especial que estava valendo.
    estado["estacao_especial"] = None
    return estado


def avancar(estado: dict, dias) -> dict:
    """Soma (ou tira) dias do "hoje". Uma estação especial só dura até a estação normal mudar."""
    dias = _inteiro(dias, "dias", -3650, 3650)
    tabela = _dias_do_estado(estado)
    antes = estacao_do_mes(estado["hoje"]["mes"])
    _registrar(estado, f"{'Avançou' if dias >= 0 else 'Voltou'} {abs(dias)} {'dia' if abs(dias) == 1 else 'dias'}")
    hoje = estado["hoje"]
    estado["hoje"] = de_dia_absoluto(para_dia_absoluto(hoje["ano"], hoje["mes"], hoje["dia"], tabela) + dias, tabela)
    if estacao_do_mes(estado["hoje"]["mes"]) != antes:
        estado["estacao_especial"] = None
    return estado


def definir_estacao_especial(estado: dict, chave) -> dict:
    if chave is not None and chave not in ESTACOES_ESPECIAIS:
        raise ErroCalendario("estacao especial invalida")
    _registrar(estado, f"Estação especial: {ESTACOES[chave]['rotulo'] if chave else 'nenhuma'}")
    estado["estacao_especial"] = chave
    return estado


def desfazer(estado: dict) -> dict:
    """Volta o tempo do mundo ao que era antes da última mudança de data ou de estação especial."""
    historico = estado.get("historico") or []
    if not historico:
        raise ErroCalendario("nao ha nada para desfazer", 409)
    ultimo = historico.pop()
    estado["hoje"] = ultimo["hoje"]
    _encaixar_data(estado["hoje"], _dias_do_estado(estado))
    estado["estacao_especial"] = ultimo.get("estacao_especial")
    return estado


def revelar_passados(estado: dict) -> int:
    """Abre para os jogadores todo acontecimento único que já terminou. Devolve quantos abriu."""
    dias = _dias_do_estado(estado)
    hoje = estado["hoje"]
    base = para_dia_absoluto(hoje["ano"], hoje["mes"], hoje["dia"], dias)
    abertos = 0
    for evento in estado["eventos"]:
        if _repeticao_do(evento) != "unico" or evento.get("ano") is None or evento.get("revelacao") == "aberto":
            continue
        if _fim_do_unico(evento, dias) < base:
            evento["revelacao"] = "aberto"
            abertos += 1
    if not abertos:
        raise ErroCalendario("nenhum acontecimento que ja passou esta escondido", 409)
    return abertos


def definir_config(estado: dict, dados: dict) -> dict:
    if "meses" in dados:
        meses = dados["meses"]
        if not isinstance(meses, list) or len(meses) != MESES_POR_ANO:
            raise ErroCalendario(f"informe os {MESES_POR_ANO} nomes de mes")
        estado["config"]["meses"] = [_texto(nome, 24, "nome do mes") for nome in meses]
    if "sincronizar_discord" in dados:
        estado["config"]["sincronizar_discord"] = bool(dados["sincronizar_discord"])
    if "eventos_desligados" in dados:
        desligados = dados["eventos_desligados"]
        conhecidos = {evento["id"] for evento in _todos_os_eventos_do_ano(estado)}
        if not isinstance(desligados, list) or any(item not in conhecidos for item in desligados):
            raise ErroCalendario("evento do ano desconhecido")
        estado["config"]["eventos_desligados"] = sorted(set(desligados))
    return estado


# ------------------------------------------------------------ acontecimentos do Mestre

def _repeticao_do(evento: dict) -> str:
    return evento.get("repeticao") or ("anual" if evento.get("anual") else "unico")


def _duracao_do(evento: dict) -> int:
    return max(1, int(evento.get("duracao") or 1))


def _fim_do_unico(evento: dict, dias: tuple[int, ...]) -> int:
    return para_dia_absoluto(evento["ano"], evento["mes"], evento["dia"], dias) + _duracao_do(evento) - 1


def _evento_validado(estado: dict, dados: dict, atual: dict | None = None) -> dict:
    dias = _dias_do_estado(estado)
    base = dict(atual or {})
    if atual is None or "titulo" in dados:
        base["titulo"] = _texto(dados.get("titulo"), 80, "titulo")
    if atual is None or "nota" in dados:
        base["nota"] = _texto(dados.get("nota"), 600, "nota", obrigatorio=False)

    pedida = dados.get("repeticao")
    if pedida is None and "anual" in dados:
        pedida = "anual" if dados["anual"] else "unico"
    if atual is None or pedida is not None:
        pedida = pedida or "unico"
        if pedida not in REPETICOES:
            raise ErroCalendario("repeticao invalida")
        base["repeticao"] = pedida
    repeticao = _repeticao_do(base)
    base["repeticao"] = repeticao
    base["anual"] = repeticao == "anual"

    if atual is None or "duracao" in dados:
        base["duracao"] = _inteiro(dados.get("duracao", 1), "duracao", 1, MAX_DURACAO)
    else:
        base["duracao"] = _duracao_do(base)

    if repeticao == "mensal":
        # Todo mês, no mesmo dia: o mês de referência não conta e o dia precisa existir em todos.
        base["mes"] = 0
        base["dia"] = _inteiro(dados.get("dia", base.get("dia")), "dia", 1, DIAS_BASE)
        base["ano"] = None
    else:
        if atual is None or "mes" in dados or base.get("mes") is None:
            base["mes"] = _inteiro(dados.get("mes", base.get("mes")), "mes", 0, MESES_POR_ANO - 1)
        base["dia"] = _inteiro(dados.get("dia", base.get("dia")), "dia", 1, dias[base["mes"]])
        if repeticao == "anual":
            base["ano"] = None
        elif atual is None or "ano" in dados or base.get("ano") is None:
            base["ano"] = _inteiro(dados.get("ano", base.get("ano")), "ano", -99999, 99999)

    if atual is None or "revelacao" in dados:
        revelacao = dados.get("revelacao", "rasurado")
        if revelacao not in REVELACOES:
            raise ErroCalendario("revelacao invalida")
        base["revelacao"] = revelacao
    return base


def adicionar_evento(estado: dict, dados: dict) -> dict:
    if len(estado["eventos"]) >= MAX_EVENTOS:
        raise ErroCalendario(f"limite de {MAX_EVENTOS} eventos")
    evento = _evento_validado(estado, dados)
    evento["id"] = uuid4().hex[:10]
    estado["eventos"].append(evento)
    return evento


def editar_evento(estado: dict, evento_id: str, dados: dict) -> dict:
    for indice, evento in enumerate(estado["eventos"]):
        if evento["id"] == evento_id:
            estado["eventos"][indice] = _evento_validado(estado, dados, evento)
            return estado["eventos"][indice]
    raise ErroCalendario("evento nao encontrado", 404)


def apagar_evento(estado: dict, evento_id: str) -> None:
    restantes = [evento for evento in estado["eventos"] if evento["id"] != evento_id]
    if len(restantes) == len(estado["eventos"]):
        raise ErroCalendario("evento nao encontrado", 404)
    estado["eventos"] = restantes


# ------------------------------------------------------------ visão

def _mes_anterior(ano: int, mes: int) -> tuple[int, int]:
    return (ano, mes - 1) if mes > 0 else (ano - 1, MESES_POR_ANO - 1)


def _inicios_que_podem_cobrir(evento: dict, ano: int, mes: int, dias: tuple[int, ...]) -> list[int]:
    """Dias absolutos em que uma ocorrência do evento COMEÇA e que ainda podem alcançar o mês visto."""
    repeticao = _repeticao_do(evento)
    if repeticao == "unico":
        return [para_dia_absoluto(evento["ano"], evento["mes"], evento["dia"], dias)] if evento.get("ano") is not None else []
    if repeticao == "anual":
        return [para_dia_absoluto(a, evento["mes"], evento["dia"], dias) for a in (ano - 1, ano)]
    inicios = []
    for a, m in (_mes_anterior(ano, mes), (ano, mes)):
        if evento["dia"] <= dias[m]:
            inicios.append(para_dia_absoluto(a, m, evento["dia"], dias))
    return inicios


def _parte_do_dia(evento: dict, ano: int, mes: int, dia: int, dias: tuple[int, ...]) -> int | None:
    """Qual dia do acontecimento é este (1, 2, 3...), ou nada se ele não cobre o dia."""
    alvo = para_dia_absoluto(ano, mes, dia, dias)
    duracao = _duracao_do(evento)
    for inicio in _inicios_que_podem_cobrir(evento, ano, mes, dias):
        if 0 <= alvo - inicio < duracao:
            return alvo - inicio + 1
    return None


def _proximo_inicio(evento: dict, hoje: dict, base_hoje: int, dias: tuple[int, ...]) -> tuple[int, int, int, int] | None:
    """(ano, mes, dia, dias até lá) do próximo começo, de hoje até um ano à frente."""
    repeticao = _repeticao_do(evento)
    if repeticao == "unico":
        candidatos = [(evento["ano"], evento["mes"], evento["dia"])] if evento.get("ano") is not None else []
    elif repeticao == "anual":
        candidatos = [(ano, evento["mes"], evento["dia"]) for ano in (hoje["ano"], hoje["ano"] + 1)]
    else:
        candidatos = []
        for k in range(MESES_POR_ANO + 2):
            passo = hoje["mes"] + k
            mes = passo % MESES_POR_ANO
            if evento["dia"] <= dias[mes]:
                candidatos.append((hoje["ano"] + passo // MESES_POR_ANO, mes, evento["dia"]))
    for ano, mes, dia in candidatos:
        distancia = para_dia_absoluto(ano, mes, dia, dias) - base_hoje
        if 0 <= distancia <= sum(dias):
            return ano, mes, dia, distancia
    return None


def _visao_do_evento(evento: dict, gestor: bool, ano: int) -> dict | None:
    """O evento como o papel enxerga. Jogador nunca recebe título e nota de algo que não está aberto."""
    revelacao = evento.get("revelacao", "rasurado")
    comum = {
        "id": evento["id"], "mes": evento["mes"], "dia": evento["dia"],
        "repeticao": _repeticao_do(evento), "duracao": _duracao_do(evento),
    }
    anual = bool(evento.get("anual"))
    if gestor or revelacao == "aberto":
        return {
            **comum, "titulo": evento["titulo"], "nota": evento.get("nota", ""), "ano": evento.get("ano"),
            "anual": anual, "revelacao": revelacao, "rasurado": False,
        }
    if revelacao == "rasurado":
        return {
            **comum, "titulo": "", "nota": "", "ano": evento.get("ano") if not anual else ano,
            "anual": anual, "revelacao": "rasurado", "rasurado": True,
        }
    return None


def _config_publica(estado: dict, meses: list, gestor: bool) -> dict:
    extras = [evento for evento in _todos_os_eventos_do_ano(estado) if evento["tipo"] == "extra"]
    config = {
        "meses": meses,
        "dias_por_mes": list(_dias_do_estado(estado)),
        "estacao_por_mes": [mes[1] for mes in MESES_DO_ANO],
        "dias_especiais": [{"mes": evento["mes"], "dia": DIA_EXTRA, "nome": evento["nome"]} for evento in extras],
    }
    if gestor:
        criados = _extras_criados(estado)
        config["sincronizar_discord"] = bool(estado["config"].get("sincronizar_discord", True))
        config["dias_extras_criados"] = [
            {"mes": item["mes"], "nome": item["nome"], "descricao": item.get("descricao", "")} for item in criados
        ]
        config["meses_para_dia_extra"] = [mes for mes in MESES_SEM_DIA_EXTRA if all(item["mes"] != mes for item in criados)]
    return config


def _eventos_do_ano_para_o_mestre(estado: dict) -> list[dict]:
    """Todos os eventos do ano, ligados ou não, com o dia que cada um cai no ano de hoje."""
    ano = estado["hoje"]["ano"]
    desligados = set(estado["config"].get("eventos_desligados") or [])
    return [
        {
            "id": evento["id"], "nome": evento["nome"], "descricao": evento["descricao"], "mes": evento["mes"],
            "tipo": evento["tipo"], "dia": dia_do_evento_do_ano(evento, ano), "duracao": evento.get("duracao", 1),
            "ativo": evento["id"] not in desligados, "criado": bool(evento.get("custom")),
        }
        for evento in _todos_os_eventos_do_ano(estado)
    ]


def _todos_os_eventos(estado: dict) -> list[dict]:
    """Todos os acontecimentos como o Mestre vê, do mais antigo ao mais novo (os que se repetem por último)."""
    dias = _dias_do_estado(estado)
    hoje = estado["hoje"]
    base = para_dia_absoluto(hoje["ano"], hoje["mes"], hoje["dia"], dias)
    lista = []
    for evento in estado["eventos"]:
        visto = _visao_do_evento(evento, True, hoje["ano"])
        if visto is None:
            continue
        unico = _repeticao_do(evento) == "unico" and evento.get("ano") is not None
        visto["passou"] = unico and _fim_do_unico(evento, dias) < base
        lista.append(visto)
    lista.sort(key=lambda e: (e["repeticao"] != "unico", e["ano"] if e["ano"] is not None else 0, e["mes"], e["dia"]))
    return lista


def visao(estado: dict, *, gestor: bool, ano: int | None = None, mes: int | None = None, proximos: int = 6) -> dict:
    """O calendário de um mês (o de hoje, se nada for pedido) e os próximos eventos."""
    estado = completar(estado)
    dias_do_ano = _dias_do_estado(estado)
    hoje = estado["hoje"]
    ano = hoje["ano"] if ano is None else ano
    mes = hoje["mes"] if mes is None else mes
    meses = estado["config"]["meses"]
    chave = estacao_atual(estado)

    base_hoje = para_dia_absoluto(hoje["ano"], hoje["mes"], hoje["dia"], dias_do_ano)
    ativos = _eventos_do_ano_ativos(estado)
    do_ano_no_mes: dict[int, list[dict]] = {}
    for evento_do_ano in ativos:
        if evento_do_ano["mes"] != mes:
            continue
        primeiro = dia_do_evento_do_ano(evento_do_ano, ano)
        duracao = evento_do_ano.get("duracao", 1)
        for parte in range(duracao):
            dia_coberto = primeiro + parte
            if dia_coberto > dias_do_ano[mes]:
                break
            # Um acontecimento sorteado é surpresa: o jogador só o vê quando o dia chega.
            if not gestor and evento_do_ano["tipo"] == "aleatorio" and para_dia_absoluto(ano, mes, dia_coberto, dias_do_ano) > base_hoje:
                continue
            do_ano_no_mes.setdefault(dia_coberto, []).append({
                "id": evento_do_ano["id"], "nome": evento_do_ano["nome"], "descricao": evento_do_ano["descricao"],
                "tipo": evento_do_ano["tipo"], "sorteado": evento_do_ano["tipo"] == "aleatorio",
                "parte": parte + 1, "duracao": duracao,
            })

    dias = []
    for dia in range(1, dias_do_ano[mes] + 1):
        eventos = []
        for evento in estado["eventos"]:
            parte = _parte_do_dia(evento, ano, mes, dia, dias_do_ano)
            if parte is None:
                continue
            visto = _visao_do_evento(evento, gestor, ano)
            if visto is not None:
                eventos.append({**visto, "parte": parte})
        do_ano = do_ano_no_mes.get(dia, [])
        dias.append({
            "dia": dia, "eventos": eventos, "hoje": (ano, mes, dia) == (hoje["ano"], hoje["mes"], hoje["dia"]),
            "do_ano": do_ano,
            "extra": dia > DIAS_BASE,
            "lua_carmesim": any(item["id"] == "lua-carmesim" for item in do_ano),
        })

    # Próximos eventos a partir de hoje, no máximo um ano à frente.
    futuros = []
    for evento in estado["eventos"]:
        proximo = _proximo_inicio(evento, hoje, base_hoje, dias_do_ano)
        if proximo is None:
            continue
        ano_alvo, mes_alvo, dia_alvo, distancia = proximo
        visto = _visao_do_evento(evento, gestor, ano_alvo)
        if visto is not None:
            futuros.append({**visto, "ano": ano_alvo, "mes": mes_alvo, "dia": dia_alvo, "em_dias": distancia})
    for evento_do_ano in ativos:
        if not gestor and evento_do_ano["tipo"] == "aleatorio":
            continue
        for ano_alvo in (hoje["ano"], hoje["ano"] + 1):
            dia_alvo = dia_do_evento_do_ano(evento_do_ano, ano_alvo)
            distancia = para_dia_absoluto(ano_alvo, evento_do_ano["mes"], dia_alvo, dias_do_ano) - base_hoje
            if 0 <= distancia <= sum(dias_do_ano):
                futuros.append({
                    "id": f"ano:{evento_do_ano['id']}", "titulo": evento_do_ano["nome"], "nota": evento_do_ano["descricao"],
                    "mes": evento_do_ano["mes"], "dia": dia_alvo, "ano": ano_alvo, "anual": True, "repeticao": "anual",
                    "duracao": evento_do_ano.get("duracao", 1),
                    "revelacao": "aberto", "rasurado": False, "fixo": True, "em_dias": distancia,
                })
                break
    futuros.sort(key=lambda item: (item["em_dias"], item["mes"], item["dia"]))

    extras = {}
    if gestor:
        extras = {
            "todos_eventos": _todos_os_eventos(estado),
            "eventos_do_ano": _eventos_do_ano_para_o_mestre(estado),
            "historico": [
                {"quando": item["quando"], "texto": item["texto"]}
                for item in reversed(estado["historico"])
            ],
        }

    return {
        **extras,
        "hoje": hoje,
        "hoje_extenso": f"Dia {hoje['dia']} · {meses[hoje['mes']]}, ano {hoje['ano']}",
        "estacao": info_da_estacao(chave),
        "estacao_especial": estado["estacao_especial"],
        "estacao_normal": estacao_do_mes(hoje["mes"]),
        "hoje_lua_carmesim": any(
            evento["id"] == "lua-carmesim" and evento["mes"] == hoje["mes"] and hoje["dia"] == DIA_EXTRA
            for evento in ativos
        ),
        "config": _config_publica(estado, meses, gestor),
        "mes": {
            "ano": ano, "mes": mes, "nome": meses[mes],
            "estacao": estacao_do_mes(mes) if mes != hoje["mes"] or ano != hoje["ano"] else chave,
            "estacao_normal": estacao_do_mes(mes),
            "dias": dias,
        },
        "proximos": futuros[:proximos],
        "gestor": gestor,
    }
