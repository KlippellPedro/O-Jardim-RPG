"""Regras puras dos sete jogos de mesa usados pelo Gambler.

Dados, Vinte-e-Um, Roda dos Fluxos, Sucessao e Vaos acompanham os mesmos
pagamentos e probabilidades de ``bots/banqueiro/core/cassino.py`` (o Salao do
Banco Lunar do Discord). Pergaminhos do Acaso e Duelo do Vazio sao exclusivos do
cassino do site: o Gambler da entidade nao precisa jogar igual ao Banqueiro do
Discord, sao mesas diferentes com a mesma casa por tras.

Este modulo nao conhece HTTP nem PostgreSQL; o router e responsavel por
sortear no servidor e liquidar cada rodada atomicamente.
"""

from __future__ import annotations

import secrets
from typing import Iterable


DADOS_PAGAMENTO_BP = {"baixo": 20_000, "alto": 20_000, "exato": 60_000}
VINTE_UM_PAGAMENTO_BP = {
    "derrota": 0,
    "empate": 10_000,
    "vitoria": 20_000,
    "vinte_um_natural": 25_000,
}
CASSINO_CONFIG = {
    "ativo": True,
    "aposta_minima": 5,
    "aposta_maxima": 200,
    "limite_apostado_dia": 500,
    "limite_perda_dia": 200,
}
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
JOGOS = {"dados", "vinte_um", "roda_fluxos", "sucessao", "vaos", "rolos", "duelo"}

# Pergaminhos do Acaso - caca-niqueis de tres pergaminhos independentes. So
# trinca paga; a trinca de Vazios e o premio maior da casa inteira, de
# proposito, pra ser a unica mesa do salao com um "jackpot" de verdade.
ROLOS_SIMBOLOS = {
    "moeda": {"nome": "Moeda de Amadheus"},
    "ficha": {"nome": "Ficha do Salão"},
    "coroa": {"nome": "Coroa do Banco Lunar"},
    "chama": {"nome": "Chama de Ignis"},
    "vazio": {"nome": "Vazio de Erebus"},
}
ROLOS_PAGAMENTO_BP = {"comum": 200_000, "vazio": 450_000}  # trinca comum 20x, trinca de Vazios 45x

# Duelo do Vazio - uma carta cada, a mais alta vence. Mesma distribuicao 6/13,
# 6/13, 1/13 da Sucessao de Chronus, so que decidida por cartas em vez de um
# marco na linha do tempo.
DUELO_CARTAS = tuple(range(2, 15))  # 2 a 14; 14 = Ás alto
DUELO_PAGAMENTO_BP = {"vitoria": 20_000, "empate": 10_000, "derrota": 0}

MOEDAS_PARA_FICHAS = {
    "Lunaris": 1,
    "Solares": 100,
    "Fragmentos de Estrela": 5_000,
    "Créditos Sombrios": 200,
}

# As 16 primeiras chaves e textos acompanham CONQUISTAS de
# bots/banqueiro/core/cassino.py (mesma mesa, mesma lore); as demais são
# exclusivas do salão do site, que tem câmbio, resgate e dois jogos próprios.
CONQUISTAS_GAMBLER = {
    "primeira_rodada": ("Primeiro Registro", "Concluiu a primeira aposta no livro-caixa de Amadheus."),
    "frequentador": ("Cliente do Banco Lunar", "Já é rosto conhecido: dez apostas concluídas."),
    "habitante_salao": ("Nome no Livro-Caixa", "Passou de cinquenta apostas. A cadeira já tem o formato do seu corpo."),
    "veterano_do_salao": ("Cadeira Reservada", "Cem apostas fechadas. Amadheus já sabe seu nome de cor."),
    "todos_jogos": ("Entre as Dez Forças", "Já sentou nas sete mesas do salão."),
    "vinte_um_natural": ("Vinte-e-Um de Amadheus", "Abriu a mesa com um 21 natural."),
    "dado_exato": ("Aposta de Ignis", "Acertou um número exato nos Dados da Inconstância."),
    "roda_exata": ("Uma Força entre Dez", "Acertou o símbolo escolhido na Roda das Dez Forças."),
    "roda_vazio": ("Erebus Respondeu", "Apostou no Vazio e a roda parou em Erebus."),
    "passo_chronus": ("Imóvel no Passo", "A Sucessão parou exatamente no marco 7."),
    "vaos_borda": ("Além dos Vãos", "Alcançou uma borda na Queda pelo Interstício."),
    "vaos_centro": ("Preso no Interstício", "Terminou exatamente no centro da Queda."),
    "trinca_comum": ("Três Iguais", "Bateu uma trinca nos Pergaminhos do Acaso."),
    "trinca_vazio": ("O Prêmio do Vazio", "Bateu a trinca de Vazios nos Pergaminhos do Acaso."),
    "duelo_as": ("Ás no Duelo", "Venceu o Duelo do Vazio com um Ás na mão."),
    "grande_vitoria": ("Cofre de Astraluna", "Lucrou 50 fichas ou mais numa aposta só."),
    "fortuna_lunar": ("Conta de Amadheus", "Lucrou 200 fichas ou mais numa aposta só."),
    "sequencia_tres": ("Três Galhos", "Venceu três apostas seguidas."),
    "sequencia_cinco": ("Cinco Galhos", "Venceu cinco apostas seguidas."),
    "retorno_arkarin": ("Retorno de Arkarin", "Venceu depois de três derrotas seguidas."),
    "primeiro_cambio": ("Moeda na Mesa", "Fez o primeiro câmbio: moeda virou ficha."),
    "primeiro_resgate": ("Volta ao Bolso", "Saiu da mesa com fichas e voltou com Lunaris no bolso."),
    "resgate_grande": ("Saiu com Tudo", "Resgatou 200 fichas ou mais de uma vez só."),
    "mesa_zerada": ("Cadeira Vazia", "Ficou sem fichas depois de já ter apostado no salão."),
    "campeao_das_mesas": ("Nome Gravado na Mesa", "Já são quinze conquistas na parede do salão."),
}


# Cada conquista desbloqueada afrouxa um pouco a mesa — a casa deixa quem já
# provou que volta arriscar mais, igual um cassino de verdade cortejando
# clientes fiéis. Conquistas nao mudam chance nem pagamento, só o quanto dá
# pra apostar; ver plataforma/routers/casino.py:_effective_config.
LIMITE_BONUS_POR_CONQUISTA = {
    "aposta_maxima": 10,
    "limite_apostado_dia": 25,
    "limite_perda_dia": 10,
}


def limites_efetivos(quantidade_conquistas: int) -> dict:
    bonus = max(0, int(quantidade_conquistas))
    return {
        **CASSINO_CONFIG,
        "aposta_maxima": CASSINO_CONFIG["aposta_maxima"] + bonus * LIMITE_BONUS_POR_CONQUISTA["aposta_maxima"],
        "limite_apostado_dia": (
            CASSINO_CONFIG["limite_apostado_dia"] + bonus * LIMITE_BONUS_POR_CONQUISTA["limite_apostado_dia"]
        ),
        "limite_perda_dia": (
            CASSINO_CONFIG["limite_perda_dia"] + bonus * LIMITE_BONUS_POR_CONQUISTA["limite_perda_dia"]
        ),
    }


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


def jogar_rolos(aposta: int, rng=None) -> dict:
    if aposta <= 0:
        raise ValueError("aposta invalida")
    gerador = rng or secrets.SystemRandom()
    simbolos = tuple(ROLOS_SIMBOLOS)
    rolos = [str(gerador.choice(simbolos)) for _ in range(3)]
    trinca = len(set(rolos)) == 1
    multiplicador = 0
    if trinca:
        multiplicador = ROLOS_PAGAMENTO_BP["vazio"] if rolos[0] == "vazio" else ROLOS_PAGAMENTO_BP["comum"]
    return {
        "rolos": rolos,
        "trinca": trinca,
        "multiplicador_bp": multiplicador,
        "pagamento": pagamento(aposta, multiplicador) if multiplicador else 0,
        "venceu": multiplicador > 0,
    }


def jogar_duelo(aposta: int, rng=None) -> dict:
    if aposta <= 0:
        raise ValueError("aposta invalida")
    gerador = rng or secrets.SystemRandom()
    carta_jogador = int(gerador.choice(DUELO_CARTAS))
    carta_gambler = int(gerador.choice(DUELO_CARTAS))
    if carta_jogador > carta_gambler:
        resultado = "vitoria"
    elif carta_jogador == carta_gambler:
        resultado = "empate"
    else:
        resultado = "derrota"
    multiplicador = DUELO_PAGAMENTO_BP[resultado]
    return {
        "carta_jogador": carta_jogador,
        "carta_gambler": carta_gambler,
        "resultado": resultado,
        "venceu": resultado == "vitoria",
        "multiplicador_bp": multiplicador,
        "pagamento": pagamento(aposta, multiplicador) if multiplicador else 0,
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
    estado.update({
        "status": "finalizada",
        "resultado": resultado,
        "multiplicador_bp": VINTE_UM_PAGAMENTO_BP[resultado],
    })
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
