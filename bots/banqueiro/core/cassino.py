"""Regras puras dos jogos do Salao do Banco Lunar.

Este modulo nao conhece Discord nem PostgreSQL. Valores monetarios sao sempre
inteiros e multiplicadores usam pontos-base para evitar arredondamento binario.
O chamador de producao deve usar ``secrets.SystemRandom`` (o padrao daqui).
"""

from __future__ import annotations

import secrets
from datetime import datetime, timedelta
from typing import Iterable
from zoneinfo import ZoneInfo


DADOS_PAGAMENTO_BP = {"baixo": 20_000, "alto": 20_000, "exato": 60_000}
VINTE_UM_PAGAMENTO_BP = {
    "derrota": 0,
    "empate": 10_000,
    "vitoria": 20_000,
    "vinte_um_natural": 25_000,
}
CASSINO_CONFIG_PADRAO = {
    "ativo": True,
    "aposta_minima": 5,
    "aposta_maxima": 200,
    "limite_apostado_dia": 500,
    "limite_perda_dia": 200,
}
CORREDORES_ASTRAIS = {
    # As chaves antigas sao preservadas para que apostas abertas antes desta
    # versao continuem liquidaveis. Somente a identidade visivel mudou.
    "raposa": {"nome": "Estandarte de Gênese", "emoji": "🌱", "peso": 25},
    "cervo": {"nome": "Estandarte de Éon", "emoji": "⌛", "peso": 25},
    "serpente": {"nome": "Estandarte de Matriz", "emoji": "🌀", "peso": 25},
    "golem": {"nome": "Estandarte de Vórtice", "emoji": "🔥", "peso": 25},
}
CORRIDA_CORTE_BP = 0  # O bolo inteiro e dividido entre os vencedores.

FORCAS_DA_RODA = {
    "genese": {"nome": "Gênese · Aethel", "emoji": "🌱"},
    "aletheia": {"nome": "Alétheia · Ousias", "emoji": "🪞"},
    "anima": {"nome": "Anima · Haemus", "emoji": "🫀"},
    "baluarte": {"nome": "Baluarte · Moros", "emoji": "🪨"},
    "matriz": {"nome": "Matriz · Aperion", "emoji": "🌀"},
    "eon": {"nome": "Éon · Chronus", "emoji": "⌛"},
    "vortice": {"nome": "Vórtice · Ignis", "emoji": "🔥"},
    "parley": {"nome": "Parley · Keryx", "emoji": "🗝️"},
    "limiar": {"nome": "Limiar · Mulher Carmesim", "emoji": "🩸"},
    "vazio": {"nome": "Vazio · Erebus", "emoji": "⚫"},
}

JOGOS_INSTANTANEOS = {"dados", "vinte_um", "roda_fluxos", "sucessao", "vaos"}

OBJETIVOS_CONTRATO = {
    "mercado": {"nome": "Mercador", "emoji": "🔨", "comandos": {"leilao_iniciar", "oferecer", "trocar"}},
    "financas": {"nome": "Financista", "emoji": "🏦", "comandos": {"investir", "emprestar_para"}},
    "seguranca": {"nome": "Guardião", "emoji": "🛡️", "comandos": {"protecao_comprar", "contratar_guarda", "cofre_seguranca_melhorar"}},
    "cacada": {"nome": "Caçador", "emoji": "🎯", "comandos": {"cacar", "recompensa_colocar", "roubar", "roubar_cofre"}},
    "cassino": {
        "nome": "Cliente do Banco Lunar",
        "emoji": "🎰",
        "comandos": {
            "cassino dados", "cassino vinte_um", "cassino corrida_apostar",
            "cassino roda_fluxos", "cassino sucessao", "cassino vaos",
        },
    },
    "comercio": {"nome": "Cambista", "emoji": "🤝", "comandos": {"cambio", "pagar", "loteria_comprar"}},
}
CONTRATO_OBJETIVOS_NECESSARIOS = 3
CONTRATO_RECOMPENSA_LUNARIS = 15
CONTRATO_RECOMPENSA_REPUTACAO = 5

CONQUISTAS = {
    "primeira_rodada": ("Primeiro Registro", "Concluiu a primeira aposta no livro-caixa de Amadheus."),
    "frequentador": ("Cliente do Banco Lunar", "Concluiu dez apostas no salão."),
    "habitante_salao": ("Nome no Livro-Caixa", "Concluiu cinquenta apostas no salão."),
    "todos_jogos": ("Entre as Dez Forças", "Jogou todos os cinco jogos de mesa do salão."),
    "vinte_um_natural": ("Vinte-e-Um de Amadheus", "Abriu a mesa com um 21 natural."),
    "dado_exato": ("Aposta de Ignis", "Acertou um número exato nos Dados da Inconstância."),
    "roda_exata": ("Uma Força entre Dez", "Acertou o símbolo escolhido na Roda das Dez Forças."),
    "roda_vazio": ("Erebus Respondeu", "Apostou no Vazio e a roda parou em Erebus."),
    "passo_chronus": ("Imóvel no Passo", "A Sucessão parou exatamente no marco 7."),
    "vaos_borda": ("Além dos Vãos", "Alcançou uma borda na Queda pelo Interstício."),
    "vaos_centro": ("Preso no Interstício", "Terminou exatamente no centro da Queda."),
    "grande_vitoria": ("Cofre de Astraluna", "Lucrou pelo menos 50 Lunaris numa aposta."),
    "fortuna_lunar": ("Conta de Amadheus", "Lucrou pelo menos 200 Lunaris numa aposta."),
    "sequencia_tres": ("Três Galhos", "Venceu três apostas seguidas."),
    "sequencia_cinco": ("Cinco Galhos", "Venceu cinco apostas seguidas."),
    "retorno_arkarin": ("Retorno de Arkarin", "Venceu depois de três derrotas seguidas."),
    "apostador_astral": ("Estandarte Vencedor", "Recebeu pagamento na Corrida das Árvores."),
    "mandato_cumprido": ("Mandato do Banco Lunar", "Concluiu e resgatou um mandato semanal."),
    "oferenda_torneio": ("Oferenda entre Árvores", "Depositou um item no pote semanal."),
    "campeao_torneio": ("Pote das Dez Árvores", "Venceu o pote semanal de itens."),
    "pausa_consciente": ("Portas Fechadas", "Ativou voluntariamente uma pausa de apostas."),
}
TIPOS_TORNEIO = {"arma", "armadura", "equipamento", "consumivel"}
RARIDADES_TORNEIO = {"comum", "incomum"}
FLAGS_BLOQUEADAS_TORNEIO = {
    "requer_autorizacao_mestre", "nao_trocavel", "vinculado",
    "item_missao", "unico", "requerAutorizacaoMestre", "naoTrocavel",
    "itemMissao", "efeitoPermanente",
}


def item_elegivel_torneio(item) -> tuple[bool, str]:
    if item is None:
        return False, "item ausente do catálogo"
    tipo = str(getattr(item, "tipo", ""))
    conteudo = getattr(item, "conteudo", {}) or {}
    raridade = str(getattr(item, "raridade", conteudo.get("raridade", "comum")))
    if tipo not in TIPOS_TORNEIO:
        return False, "tipo não permitido"
    if raridade not in RARIDADES_TORNEIO:
        return False, "somente itens comuns ou incomuns"
    if any(bool(conteudo.get(flag)) for flag in FLAGS_BLOQUEADAS_TORNEIO):
        return False, "item protegido, único ou dependente do mestre"
    return True, "elegível"


def semana_local(agora=None):
    agora = agora or datetime.now(ZoneInfo("America/Sao_Paulo"))
    return (agora - timedelta(days=agora.weekday())).date()


def nome_comando_interacao(dados: dict | None) -> str:
    if not isinstance(dados, dict):
        return ""
    partes = [str(dados.get("name") or "")]
    opcoes = dados.get("options") or []
    if opcoes and isinstance(opcoes[0], dict) and opcoes[0].get("type") in (1, 2):
        partes.append(str(opcoes[0].get("name") or ""))
    return " ".join(p for p in partes if p).strip()


def objetivo_para_comando(nome: str) -> str | None:
    for chave, info in OBJETIVOS_CONTRATO.items():
        if nome in info["comandos"]:
            return chave
    return None


def pagamento(aposta: int, multiplicador_bp: int) -> int:
    if aposta <= 0 or multiplicador_bp < 0:
        raise ValueError("aposta ou multiplicador invalido")
    return (int(aposta) * int(multiplicador_bp)) // 10_000


def jogar_dados(escolha: str, aposta: int, numero: int | None = None, rng=None) -> dict:
    escolha = str(escolha).strip().lower()
    if aposta <= 0:
        raise ValueError("aposta invalida")
    if escolha not in DADOS_PAGAMENTO_BP:
        raise ValueError("escolha de dados invalida")
    if escolha == "exato" and (numero is None or not 1 <= int(numero) <= 6):
        raise ValueError("numero exato deve ficar entre 1 e 6")
    gerador = rng or secrets.SystemRandom()
    dado = int(gerador.randint(1, 6))
    venceu = (
        (escolha == "baixo" and dado <= 3)
        or (escolha == "alto" and dado >= 4)
        or (escolha == "exato" and dado == int(numero))
    )
    multiplicador = DADOS_PAGAMENTO_BP[escolha] if venceu else 0
    return {
        "dado": dado,
        "escolha": escolha,
        "numero": int(numero) if numero is not None else None,
        "venceu": venceu,
        "multiplicador_bp": multiplicador,
        "pagamento": pagamento(aposta, multiplicador) if venceu else 0,
    }


def jogar_roda_fluxos(escolha: str, aposta: int, rng=None) -> dict:
    """Sorteia uma das dez forcas com distribuicao uniforme e pagamento justo."""
    escolha = str(escolha).strip().lower()
    if aposta <= 0:
        raise ValueError("aposta invalida")
    if escolha not in FORCAS_DA_RODA:
        raise ValueError("forca escolhida invalida")
    gerador = rng or secrets.SystemRandom()
    sorteada = str(gerador.choice(tuple(FORCAS_DA_RODA)))
    venceu = sorteada == escolha
    multiplicador = 100_000 if venceu else 0
    return {
        "escolha": escolha,
        "sorteada": sorteada,
        "venceu": venceu,
        "multiplicador_bp": multiplicador,
        "pagamento": pagamento(aposta, multiplicador) if venceu else 0,
    }


def jogar_sucessao(escolha: str, aposta: int, rng=None) -> dict:
    """Alto/baixo simetrico: seis marcos de cada lado e o 7 devolve a aposta."""
    escolha = str(escolha).strip().lower()
    if aposta <= 0:
        raise ValueError("aposta invalida")
    if escolha not in {"antes", "depois"}:
        raise ValueError("escolha da sucessao invalida")
    gerador = rng or secrets.SystemRandom()
    marco = int(gerador.randint(1, 13))
    lado = "antes" if marco <= 6 else "depois" if marco >= 8 else "passo"
    venceu = lado == escolha
    multiplicador = 20_000 if venceu else 10_000 if lado == "passo" else 0
    return {
        "escolha": escolha,
        "marco": marco,
        "lado": lado,
        "venceu": venceu,
        "empate": lado == "passo",
        "multiplicador_bp": multiplicador,
        "pagamento": pagamento(aposta, multiplicador) if multiplicador else 0,
    }


def jogar_vaos(aposta: int, rng=None) -> dict:
    """Quatro desvios binarios formam uma distribuicao binomial auditavel."""
    if aposta <= 0:
        raise ValueError("aposta invalida")
    gerador = rng or secrets.SystemRandom()
    passos = [int(gerador.randint(0, 1)) for _ in range(4)]
    indice = sum(passos)
    nomes = ("Borda esquerda", "Vão esquerdo", "Interstício", "Vão direito", "Borda direita")
    multiplicadores = (40_000, 10_000, 0, 10_000, 40_000)
    multiplicador = multiplicadores[indice]
    return {
        "passos": passos,
        "indice": indice,
        "destino": nomes[indice],
        "multiplicador_bp": multiplicador,
        "pagamento": pagamento(aposta, multiplicador) if multiplicador else 0,
        "venceu": multiplicador > 10_000,
    }


def _novo_baralho() -> list[str]:
    ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"]
    return ranks * 4


def valor_mao(cartas: Iterable[str]) -> int:
    total = 0
    ases = 0
    for carta in cartas:
        if carta == "A":
            total += 11
            ases += 1
        elif carta in {"J", "Q", "K"}:
            total += 10
        else:
            valor = int(carta)
            if not 2 <= valor <= 10:
                raise ValueError("carta invalida")
            total += valor
    while total > 21 and ases:
        total -= 10
        ases -= 1
    return total


def _finalizar_vinte_um(estado: dict) -> dict:
    jogador = valor_mao(estado["jogador"])
    banqueiro = valor_mao(estado["banqueiro"])
    natural_jogador = len(estado["jogador"]) == 2 and jogador == 21
    natural_banqueiro = len(estado["banqueiro"]) == 2 and banqueiro == 21
    if jogador > 21:
        resultado = "derrota"
    elif banqueiro > 21 or jogador > banqueiro:
        resultado = "vinte_um_natural" if natural_jogador and not natural_banqueiro else "vitoria"
    elif jogador == banqueiro:
        resultado = "empate"
    else:
        resultado = "derrota"
    estado.update(
        {
            "status": "finalizada",
            "resultado": resultado,
            "multiplicador_bp": VINTE_UM_PAGAMENTO_BP[resultado],
        }
    )
    return estado


def novo_vinte_um(rng=None) -> dict:
    gerador = rng or secrets.SystemRandom()
    baralho = _novo_baralho()
    gerador.shuffle(baralho)
    estado = {
        "baralho": baralho,
        "jogador": [],
        "banqueiro": [],
        "status": "ativa",
        "resultado": None,
        "multiplicador_bp": None,
        "dobrada": False,
    }
    for destino in ("jogador", "banqueiro", "jogador", "banqueiro"):
        estado[destino].append(estado["baralho"].pop())
    if valor_mao(estado["jogador"]) == 21 or valor_mao(estado["banqueiro"]) == 21:
        _finalizar_vinte_um(estado)
    return estado


def agir_vinte_um(estado_original: dict, acao: str) -> dict:
    estado = {
        **estado_original,
        "baralho": list(estado_original["baralho"]),
        "jogador": list(estado_original["jogador"]),
        "banqueiro": list(estado_original["banqueiro"]),
    }
    if estado.get("status") != "ativa":
        raise ValueError("a rodada ja terminou")
    acao = str(acao).strip().lower()
    if acao not in {"comprar", "parar", "dobrar"}:
        raise ValueError("acao de vinte e um invalida")
    if acao == "dobrar" and len(estado["jogador"]) != 2:
        raise ValueError("so e possivel dobrar com as duas cartas iniciais")

    if acao in {"comprar", "dobrar"}:
        estado["jogador"].append(estado["baralho"].pop())
        estado["dobrada"] = acao == "dobrar"
        valor_jogador = valor_mao(estado["jogador"])
        if valor_jogador > 21:
            return _finalizar_vinte_um(estado)
        if acao == "comprar" and valor_jogador < 21:
            return estado
        # Chegou a 21 comprando (nao natural) ou dobrou sem estourar: o
        # jogador nao tem mais decisao a tomar, entao a casa ainda compra
        # normalmente ate 17 antes de fechar a rodada.

    while valor_mao(estado["banqueiro"]) < 17:
        estado["banqueiro"].append(estado["baralho"].pop())
    return _finalizar_vinte_um(estado)


def pagamento_vinte_um(estado: dict, aposta: int) -> int:
    if estado.get("status") != "finalizada":
        raise ValueError("a rodada ainda nao terminou")
    return pagamento(aposta, int(estado["multiplicador_bp"]))
