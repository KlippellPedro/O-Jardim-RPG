"""Calendário do mundo e estações.

Um calendário simples e fixo: 12 meses de 30 dias (360 dias por ano), três
meses por estação. O Mestre diz que dia é "hoje" no mundo e avança quando a
história avança; os jogadores leem. Eventos do calendário (festivais, prazos,
profecias) têm três graus de revelação: `oculto` (jogador não vê nem que
existe), `rasurado` (jogador vê que há ALGO naquele dia, sem título nem texto)
e `aberto`. O que é `oculto` ou `rasurado` nunca sai do servidor com o texto.

Módulo puro: sem banco e sem HTTP, para testar sem subir nada.
"""

from __future__ import annotations

from uuid import uuid4

DIAS_POR_MES = 30
MESES_POR_ANO = 12
DIAS_POR_ANO = DIAS_POR_MES * MESES_POR_ANO
MAX_EVENTOS = 120

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

MESES_PADRAO = (
    "Brotar", "Florada", "Orvalho",
    "Chama", "Zênite", "Ceifa",
    "Folhaseca", "Bruma", "Colheita",
    "Geada", "Longa Noite", "Degelo",
)


class ErroCalendario(Exception):
    def __init__(self, mensagem: str, codigo: int = 422):
        super().__init__(mensagem)
        self.mensagem = mensagem
        self.codigo = codigo


def estado_inicial() -> dict:
    return {
        "config": {"meses": list(MESES_PADRAO), "sincronizar_discord": True},
        "hoje": {"ano": 1, "mes": 0, "dia": 1},
        "estacao_especial": None,
        "eventos": [],
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
    if isinstance(estado, dict):
        for chave in base:
            if chave in estado and estado[chave] is not None:
                base[chave] = estado[chave]
        config = dict(estado_inicial()["config"])
        if isinstance(estado.get("config"), dict):
            config.update(estado["config"])
        base["config"] = config
    meses = base["config"].get("meses")
    if not isinstance(meses, list) or len(meses) != MESES_POR_ANO:
        base["config"]["meses"] = list(MESES_PADRAO)
    return base


# ------------------------------------------------------------ datas

def para_dia_absoluto(ano: int, mes: int, dia: int) -> int:
    """Dias desde o ano 1, mês 0, dia 1 (que vale 0). Anos podem ser negativos (eras antigas)."""
    return (ano - 1) * DIAS_POR_ANO + mes * DIAS_POR_MES + (dia - 1)


def de_dia_absoluto(total: int) -> dict:
    ano, resto = divmod(total, DIAS_POR_ANO)
    mes, dia = divmod(resto, DIAS_POR_MES)
    return {"ano": ano + 1, "mes": mes, "dia": dia + 1}


def estacao_do_mes(mes: int) -> str:
    return ESTACOES_NORMAIS[(mes // 3) % 4]


def estacao_atual(estado: dict) -> str:
    """A estação que vale hoje: a especial (Noite Eterna, Eclipse), se o Mestre a declarou, senão a do mês."""
    especial = estado.get("estacao_especial")
    if especial in ESTACOES_ESPECIAIS:
        return especial
    return estacao_do_mes(estado["hoje"]["mes"])


def info_da_estacao(chave: str) -> dict:
    return {"chave": chave, **ESTACOES[chave]}


def dias_ate(hoje: dict, ano: int, mes: int, dia: int) -> int:
    return para_dia_absoluto(ano, mes, dia) - para_dia_absoluto(hoje["ano"], hoje["mes"], hoje["dia"])


# ------------------------------------------------------------ ações (Mestre)

def _validar_data(ano, mes, dia) -> tuple[int, int, int]:
    return (
        _inteiro(ano, "ano", -99999, 99999),
        _inteiro(mes, "mes", 0, MESES_POR_ANO - 1),
        _inteiro(dia, "dia", 1, DIAS_POR_MES),
    )


def definir_hoje(estado: dict, dados: dict) -> dict:
    ano, mes, dia = _validar_data(dados.get("ano"), dados.get("mes"), dados.get("dia"))
    estado["hoje"] = {"ano": ano, "mes": mes, "dia": dia}
    # Mudar o dia à mão para outra estação encerra o evento especial que estava valendo.
    estado["estacao_especial"] = None
    return estado


def avancar(estado: dict, dias) -> dict:
    """Soma (ou tira) dias do "hoje". Uma estação especial só dura até a estação normal mudar."""
    dias = _inteiro(dias, "dias", -3650, 3650)
    antes = estacao_do_mes(estado["hoje"]["mes"])
    hoje = estado["hoje"]
    estado["hoje"] = de_dia_absoluto(para_dia_absoluto(hoje["ano"], hoje["mes"], hoje["dia"]) + dias)
    if estacao_do_mes(estado["hoje"]["mes"]) != antes:
        estado["estacao_especial"] = None
    return estado


def definir_estacao_especial(estado: dict, chave) -> dict:
    if chave is not None and chave not in ESTACOES_ESPECIAIS:
        raise ErroCalendario("estacao especial invalida")
    estado["estacao_especial"] = chave
    return estado


def definir_config(estado: dict, dados: dict) -> dict:
    if "meses" in dados:
        meses = dados["meses"]
        if not isinstance(meses, list) or len(meses) != MESES_POR_ANO:
            raise ErroCalendario(f"informe os {MESES_POR_ANO} nomes de mes")
        estado["config"]["meses"] = [_texto(nome, 24, "nome do mes") for nome in meses]
    if "sincronizar_discord" in dados:
        estado["config"]["sincronizar_discord"] = bool(dados["sincronizar_discord"])
    return estado


def _evento_validado(dados: dict, atual: dict | None = None) -> dict:
    base = dict(atual or {})
    if atual is None or "titulo" in dados:
        base["titulo"] = _texto(dados.get("titulo"), 80, "titulo")
    if atual is None or "nota" in dados:
        base["nota"] = _texto(dados.get("nota"), 600, "nota", obrigatorio=False)
    if atual is None or "mes" in dados:
        base["mes"] = _inteiro(dados.get("mes"), "mes", 0, MESES_POR_ANO - 1)
    if atual is None or "dia" in dados:
        base["dia"] = _inteiro(dados.get("dia"), "dia", 1, DIAS_POR_MES)
    if atual is None or "anual" in dados:
        base["anual"] = bool(dados.get("anual", False))
    if base.get("anual"):
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
    evento = _evento_validado(dados)
    evento["id"] = uuid4().hex[:10]
    estado["eventos"].append(evento)
    return evento


def editar_evento(estado: dict, evento_id: str, dados: dict) -> dict:
    for indice, evento in enumerate(estado["eventos"]):
        if evento["id"] == evento_id:
            estado["eventos"][indice] = _evento_validado(dados, evento)
            return estado["eventos"][indice]
    raise ErroCalendario("evento nao encontrado", 404)


def apagar_evento(estado: dict, evento_id: str) -> None:
    restantes = [evento for evento in estado["eventos"] if evento["id"] != evento_id]
    if len(restantes) == len(estado["eventos"]):
        raise ErroCalendario("evento nao encontrado", 404)
    estado["eventos"] = restantes


# ------------------------------------------------------------ visão

def _ocorre(evento: dict, ano: int, mes: int, dia: int) -> bool:
    if evento["mes"] != mes or evento["dia"] != dia:
        return False
    return bool(evento.get("anual")) or evento.get("ano") == ano


def _visao_do_evento(evento: dict, gestor: bool, ano: int) -> dict | None:
    """O evento como o papel enxerga. Jogador nunca recebe título e nota de algo que não está aberto."""
    revelacao = evento.get("revelacao", "rasurado")
    if gestor or revelacao == "aberto":
        return {
            "id": evento["id"], "titulo": evento["titulo"], "nota": evento.get("nota", ""),
            "mes": evento["mes"], "dia": evento["dia"], "ano": evento.get("ano"),
            "anual": bool(evento.get("anual")), "revelacao": revelacao, "rasurado": False,
        }
    if revelacao == "rasurado":
        return {
            "id": evento["id"], "titulo": "", "nota": "",
            "mes": evento["mes"], "dia": evento["dia"], "ano": evento.get("ano") if not evento.get("anual") else ano,
            "anual": bool(evento.get("anual")), "revelacao": "rasurado", "rasurado": True,
        }
    return None


def visao(estado: dict, *, gestor: bool, ano: int | None = None, mes: int | None = None, proximos: int = 6) -> dict:
    """O calendário de um mês (o de hoje, se nada for pedido) e os próximos eventos."""
    estado = completar(estado)
    hoje = estado["hoje"]
    ano = hoje["ano"] if ano is None else ano
    mes = hoje["mes"] if mes is None else mes
    meses = estado["config"]["meses"]
    chave = estacao_atual(estado)

    dias = []
    for dia in range(1, DIAS_POR_MES + 1):
        eventos = [
            visto for evento in estado["eventos"]
            if _ocorre(evento, ano, mes, dia) and (visto := _visao_do_evento(evento, gestor, ano)) is not None
        ]
        dias.append({"dia": dia, "eventos": eventos, "hoje": (ano, mes, dia) == (hoje["ano"], hoje["mes"], hoje["dia"])})

    # Próximos eventos a partir de hoje, no máximo um ano à frente.
    futuros = []
    base_hoje = para_dia_absoluto(hoje["ano"], hoje["mes"], hoje["dia"])
    for evento in estado["eventos"]:
        candidatos = []
        if evento.get("anual"):
            for ano_alvo in (hoje["ano"], hoje["ano"] + 1):
                candidatos.append(ano_alvo)
        elif evento.get("ano") is not None:
            candidatos.append(evento["ano"])
        for ano_alvo in candidatos:
            distancia = para_dia_absoluto(ano_alvo, evento["mes"], evento["dia"]) - base_hoje
            if 0 <= distancia <= DIAS_POR_ANO:
                visto = _visao_do_evento(evento, gestor, ano_alvo)
                if visto is not None:
                    futuros.append({**visto, "ano": ano_alvo, "em_dias": distancia})
                break
    futuros.sort(key=lambda item: (item["em_dias"], item["mes"], item["dia"]))

    return {
        "hoje": hoje,
        "hoje_extenso": f"{hoje['dia']} de {meses[hoje['mes']]}, ano {hoje['ano']}",
        "estacao": info_da_estacao(chave),
        "estacao_especial": estado["estacao_especial"],
        "config": {"meses": meses, "sincronizar_discord": bool(estado["config"].get("sincronizar_discord", True))} if gestor
        else {"meses": meses},
        "mes": {
            "ano": ano, "mes": mes, "nome": meses[mes],
            "estacao": estacao_do_mes(mes) if mes != hoje["mes"] or ano != hoje["ano"] else chave,
            "dias": dias,
        },
        "proximos": futuros[:proximos],
        "gestor": gestor,
    }
