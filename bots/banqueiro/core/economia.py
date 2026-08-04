"""
O Jardim RPG: Banqueiro
Lógica PURA da economia: sem Discord, sem banco de dados, sem I/O.
Fácil de testar isoladamente (ver tests/test_economia.py).

Moedas do sistema:
  - Lunaris (☾): moeda oficial. Todo jogador começa com 20.
  - Solares (☉): moeda "solar", mais valiosa.
O schema de preço vem da Loja do site (data/loja): `conteudo.preco` é um
número (preço nativo em Solares) OU um objeto { "Lunaris": X, "Solares": Y }.

Convenção de nomes de moeda: comparações ignoram acento e caixa, igual ao
site (src/loja/services/moedasService.js): "Solares" == "SOLARES" == "solares".
"""

from __future__ import annotations

import math
import random
import unicodedata
from typing import Optional, Union, Tuple, List, Dict

Numero = Union[int, float]

# ─────────────────────────── Constantes do sistema ───────────────────────────

MOEDA_OFICIAL = "Lunaris"
NOME_BOT = "Banqueiro"  # nome do bot (troque aqui pra renomear em tudo)
SIMBOLOS = {"lunaris": "☾", "solares": "☉", "fragmentos de estrela": "✧", "creditos sombrios": "♆"}

# Saldo inicial da carteira (bate com "Receba um item comum e 20 Lunaris").
SALDO_INICIAL: Dict[str, int] = {"Lunaris": 20, "Solares": 0, "Fragmentos de Estrela": 0, "Créditos Sombrios": 0}

# Câmbio padrão (configurável por servidor no banco). 1 Solares = 10 Lunaris.
CAMBIO_RATE_PADRAO = 10          # quantos Lunaris valem 1 Solares
CAMBIO_TAXA_PADRAO = 0.02        # 2% de taxa do banco (vibe da "Transferência 2%")

# Ao vender um item de volta pro Banqueiro, o jogador recebe esta fração do preço.
VENDA_RATIO = 0.5                # 50% do valor de compra

# /abrir_todos abre no máximo isso por vez (cada baú é uma chamada de rede pra
# entrega central): evita travar numa fila enorme e passar do prazo de
# resposta do Discord. Sobrando baú, o jogador só chama de novo.
ABRIR_TODOS_LIMITE = 25

# Cofre / Armazém: progressão longa do "Cofre Lunar" (custos multimoeda).
# Os cinco IDs antigos foram preservados para não rebaixar cofres já comprados.
# O último nível usa limites técnicos muito altos e é exibido como "sem limite
# prático": o PostgreSQL ainda precisa armazenar quantidades como inteiros.
COFRE_TIERS: List[Dict] = [
    {"id": "comum",      "nome": "Cofre Comum",       "capacidade": 10,      "capacidade_moeda": 500,           "custos": {"Lunaris": 100}},
    {"id": "cobre",      "nome": "Cofre de Cobre",     "capacidade": 15,      "capacidade_moeda": 900,           "custos": {"Lunaris": 150}},
    {"id": "prata",      "nome": "Cofre de Prata",     "capacidade": 20,      "capacidade_moeda": 1500,          "custos": {"Lunaris": 250}},
    {"id": "aco",        "nome": "Cofre de Aço",       "capacidade": 30,      "capacidade_moeda": 2800,          "custos": {"Lunaris": 375}},
    {"id": "dourado",    "nome": "Cofre Dourado",      "capacidade": 40,      "capacidade_moeda": 5000,          "custos": {"Lunaris": 500}},
    {"id": "obsidiana",  "nome": "Cofre de Obsidiana", "capacidade": 50,      "capacidade_moeda": 9000,          "custos": {"Lunaris": 350, "Solares": 30}},
    {"id": "arcano",     "nome": "Cofre Arcano",       "capacidade": 60,      "capacidade_moeda": 15000,         "custos": {"Lunaris": 400, "Solares": 40}},
    {"id": "runico",     "nome": "Cofre Rúnico",       "capacidade": 80,      "capacidade_moeda": 30000,         "custos": {"Lunaris": 600, "Solares": 60}},
    {"id": "eterno",     "nome": "Cofre Eterno",       "capacidade": 200,     "capacidade_moeda": 50000,         "custos": {"Lunaris": 1000, "Solares": 100}},
    {"id": "astral",     "nome": "Cofre Astral",       "capacidade": 300,     "capacidade_moeda": 100000,        "custos": {"Solares": 200, "Fragmentos de Estrela": 5}},
    {"id": "lunar",      "nome": "Cofre Lunar",        "capacidade": 500,     "capacidade_moeda": 250000,        "custos": {"Solares": 300, "Fragmentos de Estrela": 10}},
    {"id": "soberano",   "nome": "Cofre Soberano",     "capacidade": 800,     "capacidade_moeda": 750000,        "custos": {"Solares": 450, "Fragmentos de Estrela": 20}},
    {"id": "dimensional", "nome": "Cofre Dimensional",  "capacidade": 1200,    "capacidade_moeda": 2000000,       "custos": {"Solares": 500, "Fragmentos de Estrela": 30, "Créditos Sombrios": 500}},
    {"id": "paradoxal",  "nome": "Cofre Paradoxal",    "capacidade": 2500,    "capacidade_moeda": 10000000,      "custos": {"Solares": 750, "Fragmentos de Estrela": 50, "Créditos Sombrios": 1500}},
    {"id": "sem-fim",    "nome": "Cofre Sem-Fim",      "capacidade": 1000000, "capacidade_moeda": 9000000000000, "custos": {"Lunaris": 5000, "Solares": 1000, "Fragmentos de Estrela": 100, "Créditos Sombrios": 3000}, "limite_pratico": True},
]
COFRE_TIER_INICIAL = "comum"
COFRE_SAQUE_TAXA = 0.03  # taxa cobrada ao sacar do cofre pra carteira (custódia não é de graça)


# ──────────────────────────────── Utilidades ─────────────────────────────────

def normalizar(texto: object) -> str:
    """Dobra acento e caixa pra comparação de nomes de moeda/raridade."""
    t = unicodedata.normalize("NFKD", str(texto))
    t = "".join(c for c in t if not unicodedata.combining(c))
    return t.strip().lower()


def mesma_moeda(a: object, b: object) -> bool:
    return normalizar(a) == normalizar(b)


# ─────────────────────────────────── Preço ───────────────────────────────────

def resolver_preco(preco: object, moeda: str) -> Optional[int]:
    """Resolve o preço de um item para `moeda`.

    - número  -> preço nativo em Solares;
    - dict    -> pega a chave que casar (sem acento/caixa) com `moeda`;
    - ausente / inválido / negativo / sem a moeda -> None.
    Retorna int >= 0 ou None.
    """
    if preco is None or isinstance(preco, bool):
        return None
    if isinstance(preco, (int, float)):
        if not mesma_moeda(moeda, "Solares"):
            return None
        valor = int(preco)
        return valor if valor >= 0 else None
    if isinstance(preco, dict):
        alvo = normalizar(moeda)
        for chave, valor in preco.items():
            if normalizar(chave) == alvo and isinstance(valor, (int, float)) and not isinstance(valor, bool):
                v = int(valor)
                return v if v >= 0 else None
        return None
    return None


# ─────────────────────────────────── Câmbio ──────────────────────────────────

def converter(
    quantia: int,
    de: str,
    para: str,
    rate_solares_para_lunaris: int = CAMBIO_RATE_PADRAO,
    taxa: float = CAMBIO_TAXA_PADRAO,
) -> Tuple[int, int]:
    """Converte entre Lunaris e Solares.

    Retorna (recebido, taxa_cobrada), ambos na moeda de destino (inteiros).
    A taxa do banco é descontada do valor convertido. `quantia` é debitada
    integralmente da moeda de origem por quem chama.

    Levanta ValueError em entrada inválida (deixa o chamador tratar a mensagem).
    """
    if not isinstance(quantia, int) or isinstance(quantia, bool) or quantia <= 0:
        raise ValueError("A quantia precisa ser um número inteiro positivo.")
    if not isinstance(rate_solares_para_lunaris, int) or rate_solares_para_lunaris <= 0:
        raise ValueError("Taxa de câmbio inválida.")
    if not (0 <= taxa < 1):
        raise ValueError("Taxa do banco inválida.")

    d, p = normalizar(de), normalizar(para)
    if d == p:
        raise ValueError("As moedas de origem e destino são iguais.")
    if {d, p} != {"lunaris", "solares"}:
        raise ValueError("Por enquanto o câmbio só funciona entre Lunaris e Solares.")

    if d == "solares":                      # Solares -> Lunaris
        bruto = quantia * rate_solares_para_lunaris
    else:                                   # Lunaris -> Solares
        bruto = quantia / rate_solares_para_lunaris

    recebido = math.floor(bruto * (1 - taxa))
    taxa_cobrada = math.floor(bruto) - recebido
    if taxa_cobrada < 0:
        taxa_cobrada = 0
    return recebido, taxa_cobrada


# ─────────────────────────────── Cofre / Armazém ─────────────────────────────

def cofre_por_id(tier_id: str) -> Optional[Dict]:
    alvo = normalizar(tier_id)
    for tier in COFRE_TIERS:
        if tier["id"] == alvo:
            return tier
    return None


def capacidade_do_cofre(tier_id: str) -> int:
    tier = cofre_por_id(tier_id) or cofre_por_id(COFRE_TIER_INICIAL)
    return int(tier["capacidade"])


def proximo_cofre(tier_id: str) -> Optional[Dict]:
    """Próximo tier de cofre (pra upgrade) ou None se já for o máximo."""
    ids = [t["id"] for t in COFRE_TIERS]
    alvo = normalizar(tier_id)
    if alvo not in ids:
        # tier desconhecido -> assume o inicial e devolve o próximo
        alvo = COFRE_TIER_INICIAL
    idx = ids.index(alvo)
    if idx + 1 >= len(COFRE_TIERS):
        return None
    return COFRE_TIERS[idx + 1]


def pode_guardar(itens_atuais: int, quantidade: int, tier_id: str) -> bool:
    """Se cabe `quantidade` itens no cofre do jogador."""
    if quantidade <= 0:
        return True
    return (itens_atuais + quantidade) <= capacidade_do_cofre(tier_id)


def capacidade_moeda_do_cofre(tier_id: str) -> int:
    tier = cofre_por_id(tier_id) or cofre_por_id(COFRE_TIER_INICIAL)
    return int(tier["capacidade_moeda"])


def pode_guardar_moeda(saldo_atual: int, quantidade: int, tier_id: str) -> bool:
    """Se cabe depositar `quantidade` a mais no saldo guardado do cofre."""
    if quantidade <= 0:
        return True
    return (saldo_atual + quantidade) <= capacidade_moeda_do_cofre(tier_id)


# ─────────────────────────── Segurança do cofre ───────────────────────────────
# `defesa` = chance (fração 0-1) de o LADRÃO FALHAR um /roubar_cofre contra
# esse jogador. Todo jogador começa na Segurança Básica (defesa "de fábrica",
# sem comprar nada). Cada tier comprado é um patamar fixo de defesa: não é
# um bônus somado, é o nível de proteção que aquele cofre garante.
SEGURANCA_TIERS: List[Dict] = [
    {"id": "basica",       "nome": "Segurança Básica",       "defesa": 0.50, "custos": {}},
    {"id": "tranca-dupla", "nome": "Tranca Dupla",           "defesa": 0.58, "custos": {"Lunaris": 75}},
    {"id": "alarme",       "nome": "Alarme Mecânico",        "defesa": 0.64, "custos": {"Lunaris": 110}},
    {"id": "fechadura",    "nome": "Fechadura Reforçada",    "defesa": 0.70, "custos": {"Lunaris": 150}},
    {"id": "runas",        "nome": "Runas de Vigilância",     "defesa": 0.74, "custos": {"Lunaris": 220}},
    {"id": "sentinela",    "nome": "Sentinela Lunar",         "defesa": 0.77, "custos": {"Lunaris": 140, "Solares": 14}},
    {"id": "cofre-forte",  "nome": "Cofre-Forte",             "defesa": 0.80, "custos": {"Lunaris": 180, "Solares": 17}},
    {"id": "selos",        "nome": "Selos Antiviolação",      "defesa": 0.83, "custos": {"Lunaris": 235, "Solares": 24}},
    {"id": "barreira",     "nome": "Barreira Etérea",         "defesa": 0.86, "custos": {"Lunaris": 300, "Solares": 30}},
    {"id": "blindado",     "nome": "Blindagem Arcana",        "defesa": 0.88, "custos": {"Solares": 50, "Fragmentos de Estrela": 3}},
    {"id": "labirinto",    "nome": "Labirinto Dimensional",   "defesa": 0.90, "custos": {"Solares": 60, "Fragmentos de Estrela": 5}},
    {"id": "guardiao",     "nome": "Guardião Astral",         "defesa": 0.92, "custos": {"Solares": 70, "Fragmentos de Estrela": 8}},
    {"id": "maximo",       "nome": "Segurança Máxima",        "defesa": 0.94, "custos": {"Solares": 70, "Fragmentos de Estrela": 12, "Créditos Sombrios": 200}},
    {"id": "soberana",     "nome": "Proteção Soberana",       "defesa": 0.97, "custos": {"Solares": 100, "Fragmentos de Estrela": 20, "Créditos Sombrios": 600}},
    {"id": "absoluta",     "nome": "Proteção Absoluta",       "defesa": 0.99, "custos": {"Lunaris": 500, "Solares": 150, "Fragmentos de Estrela": 40, "Créditos Sombrios": 1500}},
]
SEGURANCA_TIER_INICIAL = "basica"


def seguranca_por_id(tier_id: str) -> Optional[Dict]:
    alvo = normalizar(tier_id)
    for tier in SEGURANCA_TIERS:
        if tier["id"] == alvo:
            return tier
    return None


def defesa_seguranca(tier_id: str) -> float:
    tier = seguranca_por_id(tier_id) or seguranca_por_id(SEGURANCA_TIER_INICIAL)
    return float(tier["defesa"])


def proximo_seguranca(tier_id: str) -> Optional[Dict]:
    ids = [t["id"] for t in SEGURANCA_TIERS]
    alvo = normalizar(tier_id)
    if alvo not in ids:
        alvo = SEGURANCA_TIER_INICIAL
    idx = ids.index(alvo)
    if idx + 1 >= len(SEGURANCA_TIERS):
        return None
    return SEGURANCA_TIERS[idx + 1]


# ────────────────────────────────── Roubo ─────────────────────────────────────
# A carteira não tem defesa percentual, mas a vítima pode impedir a tentativa
# no botão de 5 segundos. Se não impedir, /roubar leva a fração abaixo. O
# cofre tem a mesma janela e ainda depende da Segurança comprada pelo alvo.
ROUBO_COOLDOWN_HORAS = 24            # 1 tentativa de /roubar por jogador a cada 24h
ROUBO_PROTECAO_VITIMA_HORAS = 6      # depois de ser roubado, fica 6h sem poder ser roubado de novo
ROUBO_CARTEIRA_PERCENT = 1.00        # /roubar bem-sucedido esvazia a carteira exposta

ROUBO_COFRE_CHANCE_MINIMA = 0.01     # Proteção Absoluta deixa apenas 1% de chance de arrombamento
ROUBO_COFRE_COOLDOWN_HORAS = 24      # cooldown separado do /roubar (ações independentes)
ROUBO_COFRE_PERCENT = 0.50           # /roubar_cofre bem-sucedido leva 50% fixo do saldo guardado
ROUBO_MULTA_PERCENT_MIN = 0.10       # se falhar o /roubar_cofre, paga essa faixa da PRÓPRIA carteira...
ROUBO_MULTA_PERCENT_MAX = 0.25       # ...de multa pro alvo (flagrado tentando arrombar o cofre)


def valor_roubo_carteira(saldo: int) -> int:
    """Valor exposto transferido por um roubo de carteira bem-sucedido."""
    saldo_inteiro = int(saldo)
    if saldo_inteiro <= 0:
        return 0
    return max(1, math.floor(saldo_inteiro * ROUBO_CARTEIRA_PERCENT))


def chance_roubo_cofre(seguranca_tier_alvo: str, chance_base: Optional[float] = None) -> float:
    """Chance de sucesso do LADRÃO em /roubar_cofre = 1 - defesa do alvo.
    `chance_base` (fração 0-1, vindo do /setroubo) sobrescreve a defesa só
    pra quem está na Segurança Básica: tiers comprados sempre entregam a
    defesa fixa da tabela, senão o mestre poderia desvalorizar um upgrade
    já pago mudando a configuração do servidor depois."""
    if chance_base is not None and normalizar(seguranca_tier_alvo) == SEGURANCA_TIER_INICIAL:
        defesa = 1 - chance_base
    else:
        defesa = defesa_seguranca(seguranca_tier_alvo)
    return max(ROUBO_COFRE_CHANCE_MINIMA, 1 - defesa)


# ────────────────────────────── Dívida e recompensa ───────────────────────────
# Dívida no Cartão Lunar (saldo negativo de Lunaris) cresce sozinha com o
# tempo, como juros de atraso, e machuca a reputação bancária. Fica muito tempo/muito
# fundo no vermelho e o Banqueiro põe recompensa na cabeça do devedor.
DIVIDA_TICK_HORAS = 24               # de quanto em quanto tempo a dívida "anda"
DIVIDA_TAXA_CRESCIMENTO = 0.08       # a dívida cresce 8% a cada tick

# Juros automático do cofre: recompensa por guardar (menor que o crescimento da
# dívida, então guardar rende mas dever ainda é pior). O mestre pode dar um
# bônus extra a qualquer momento com /juros_cofre.
JUROS_COFRE_TICK_HORAS = 24          # aplica juros do cofre uma vez por dia
JUROS_COFRE_TAXA = 0.02              # +2% por dia no que está guardado no cofre
DIVIDA_PENALIDADE_REPUTACAO = 15     # reputação cai isso a cada tick em dívida
DIVIDA_REPUTACAO_MINIMA = -200       # reputação não desce de -200 só por dívida
REPUTACAO_RECUPERACAO_TICK = 10      # recuperação de reputação negativa pra quem quitou as dívidas
REPUTACAO_RECUPERACAO_TETO = 0       # reputação positiva é conquistada pagando faturas no prazo

# Nomes antigos mantidos como aliases porque a coluna do banco e integrações
# existentes ainda se chamam `credito`. Semanticamente, esses valores são a
# reputação do cliente — nunca o limite monetário disponível no cartão.
DIVIDA_PENALIDADE_CREDITO = DIVIDA_PENALIDADE_REPUTACAO
DIVIDA_CREDITO_MINIMO = DIVIDA_REPUTACAO_MINIMA
CREDITO_RECUPERACAO_TICK = REPUTACAO_RECUPERACAO_TICK
CREDITO_RECUPERACAO_TETO = REPUTACAO_RECUPERACAO_TETO

DIVIDA_RECOMPENSA_LIMIAR = 150       # dívida passou disso (valor absoluto) -> vira procurado
DIVIDA_RECOMPENSA_TETO = 500         # recompensa do sistema nunca passa disso

RECOMPENSA_MINIMA = 10               # menor valor que um jogador pode colocar de recompensa


# ─────────────────────────────── Cartão Lunar ────────────────────────────────
REPUTACAO_INICIAL = 1
CREDITO_INICIAL = REPUTACAO_INICIAL  # alias da coluna legada `cartao.credito`
FATURA_PRAZO_DIAS = 7

# A reputação não substitui o preço: ela é uma licença de acesso. O jogador
# ainda precisa pagar o item/upgrade depois de atingir o patamar necessário.
REPUTACAO_POR_RARIDADE = {
    "comum": 0,
    "incomum": 100,
    "raro": 250,
    "epico": 450,
    "lendario": 700,
    "reliquia": 1000,
    "reliquia da criacao": 1500,
}

REPUTACAO_POR_CARTAO_TIER = {
    "comum": 0,
    "prata": 100,
    "dourado": 250,
    "arcano": 500,
    "eterno": 800,
}

REPUTACAO_POR_COFRE_TIER = {
    "comum": 0,
    "cobre": 0,
    "prata": 50,
    "aco": 100,
    "dourado": 150,
    "obsidiana": 200,
    "arcano": 250,
    "runico": 300,
    "eterno": 350,
    "astral": 450,
    "lunar": 550,
    "soberano": 650,
    "dimensional": 800,
    "paradoxal": 1000,
    "sem-fim": 1250,
}

REPUTACAO_POR_SEGURANCA_TIER = {
    "basica": 0,
    "tranca-dupla": 0,
    "alarme": 50,
    "fechadura": 100,
    "runas": 150,
    "sentinela": 200,
    "cofre-forte": 250,
    "selos": 300,
    "barreira": 350,
    "blindado": 450,
    "labirinto": 550,
    "guardiao": 650,
    "maximo": 800,
    "soberana": 1000,
    "absoluta": 1250,
}

REPUTACAO_POR_BAU = {
    "comum": 0,
    "raro": 250,
    "lendario": 700,
}

# O Jornalista anuncia apenas conquistas raras. Publicar todos os 14 upgrades
# de cada trilha deixaria o canal econômico tão poluído quanto os comandos
# antigos; estes marcos contam uma história sem expor cada compra cotidiana.
UPGRADES_NOTICIAVEIS = {
    "cofre": {"lunar", "sem-fim"},
    "seguranca": {"maximo", "absoluta"},
    "cartao": {"eterno"},
}

# Níveis do cartão: limite de gasto e materiais/moedas exigidos na emissão.
CARTAO_TIERS = [
    {"id": "comum",   "nome": "Cartão Comum",   "limite": 200,  "custos": {"Lunaris": 10}},
    {"id": "prata",   "nome": "Cartão de Prata", "limite": 400,  "custos": {"Lunaris": 20}},
    {"id": "dourado", "nome": "Cartão Dourado", "limite": 600,  "custos": {"Lunaris": 20, "Solares": 1}},
    {"id": "arcano",  "nome": "Cartão Arcano",  "limite": 800,  "custos": {"Solares": 20, "Fragmentos de Estrela": 2}},
    {"id": "eterno",  "nome": "Cartão Eterno",  "limite": 1000, "custos": {"Solares": 50, "Fragmentos de Estrela": 5, "Créditos Sombrios": 250}},
]
CARTAO_TIER_INICIAL = "comum"


def cartao_por_id(tier_id):
    alvo = normalizar(tier_id)
    for t in CARTAO_TIERS:
        if t["id"] == alvo:
            return t
    return None


def proximo_cartao(tier_id):
    ids = [t["id"] for t in CARTAO_TIERS]
    alvo = normalizar(tier_id)
    if alvo not in ids:
        alvo = CARTAO_TIER_INICIAL
    i = ids.index(alvo)
    return CARTAO_TIERS[i + 1] if i + 1 < len(CARTAO_TIERS) else None


def beneficios_reputacao(reputacao):
    """Efeitos da reputação bancária do cliente."""
    c = int(reputacao)
    b = {"desconto": 0.0, "cashback": 0.0, "taxa_mult": 1.0, "limite_mult": 1, "rotulo": "Neutro"}
    if c <= -1:
        b["taxa_mult"] = 2.0
        b["rotulo"] = "Reputação negativa: taxas dobradas e risco de cobrador"
    elif c <= 100:
        b["rotulo"] = "Sem bônus nem penalidades"
    elif c <= 300:
        b["desconto"] = 0.05
        b["rotulo"] = "5% de desconto em taxas e cofres"
    elif c <= 600:
        b["cashback"] = 0.05
        b["rotulo"] = "5% de cashback em compras"
    else:
        b["limite_mult"] = 2
        b["rotulo"] = "Limite do cartão dobrado e prioridade"
    return b


def custos_upgrade(tier: dict, reputacao: int = 0) -> Dict[str, int]:
    """Preço efetivo de um upgrade.

    O desconto bancário alcança apenas as moedas conversíveis (Lunaris e
    Solares). Fragmentos e Créditos Sombrios são componentes raros e mantêm a
    quantidade integral, para não perderem a função de progressão.
    """
    desconto = float(beneficios_reputacao(reputacao)["desconto"])
    resultado: Dict[str, int] = {}
    for moeda, valor_bruto in (tier.get("custos") or {}).items():
        valor = int(valor_bruto)
        if valor <= 0:
            continue
        if normalizar(moeda) in {"lunaris", "solares"}:
            valor = max(1, math.ceil(valor * (1 - desconto)))
        resultado[str(moeda)] = valor
    return resultado


def beneficios_credito(credito):
    """Alias compatível: `credito` é o nome legado da reputação no banco."""
    return beneficios_reputacao(credito)


def limite_efetivo(tier_id, reputacao):
    base = (cartao_por_id(tier_id) or cartao_por_id(CARTAO_TIER_INICIAL))["limite"]
    return base * beneficios_reputacao(reputacao)["limite_mult"]


def limite_disponivel(tier_id, reputacao, divida=0, faturas_pendentes=0):
    """Parte utilizável do limite após dívida e faturas ainda abertas."""
    usado = max(0, int(divida)) + max(0, int(faturas_pendentes))
    return max(0, limite_efetivo(tier_id, reputacao) - usado)


def reputacao_minima_raridade(raridade) -> int:
    return REPUTACAO_POR_RARIDADE.get(normalizar(raridade), 0)


def reputacao_minima_bau(bau_id) -> int:
    raridade = normalizar(bau_id).rsplit("-", 1)[-1]
    return REPUTACAO_POR_BAU.get(raridade, 0)


def reputacao_minima_upgrade(trilha: str, tier_id: str) -> int:
    tabelas = {
        "cartao": REPUTACAO_POR_CARTAO_TIER,
        "cofre": REPUTACAO_POR_COFRE_TIER,
        "seguranca": REPUTACAO_POR_SEGURANCA_TIER,
    }
    tabela = tabelas.get(normalizar(trilha))
    if tabela is None:
        raise ValueError("trilha de reputacao desconhecida")
    return int(tabela.get(normalizar(tier_id), 0))


def upgrade_noticiavel(trilha: str, tier_id: str) -> bool:
    return normalizar(tier_id) in UPGRADES_NOTICIAVEIS.get(normalizar(trilha), set())


def cotar_pagamento(preco, saldo_carteira, limite_total, divida=0, faturas_pendentes=0):
    """Cota uma compra sem movimentar dinheiro.

    Retorna quanto sai da carteira, quanto precisaria ser financiado e se o
    conjunto carteira + limite disponível cobre o preço inteiro.
    """
    valor = int(preco)
    if valor <= 0:
        raise ValueError("o preco precisa ser positivo")
    saldo = max(0, int(saldo_carteira))
    da_carteira = min(valor, saldo)
    financiado = valor - da_carteira
    disponivel = max(
        0,
        int(limite_total) - max(0, int(divida)) - max(0, int(faturas_pendentes)),
    )
    return {
        "preco": valor,
        "saldo_carteira": saldo,
        "da_carteira": da_carteira,
        "financiado": financiado,
        "limite_disponivel": disponivel,
        "limite_apos": max(0, disponivel - financiado),
        "pode_comprar": financiado <= disponivel,
        "precisa_confirmacao": financiado > 0 and financiado <= disponivel,
    }


def reputacao_por_fatura_paga(valor_original) -> int:
    """Recompensa por quitar uma fatura inteira no prazo, sem premiar parcelas."""
    valor = max(1, int(valor_original))
    return min(50, max(3, math.ceil(valor / 20)))


# ─────────────────────── Baús compráveis (loja de baús) ──────────────────────
# Perfis de raridade dos baús (peso relativo por raridade no sorteio)
_PESOS_BAU = {
    "comum":    {"comum": 70, "incomum": 25, "raro": 5,  "epico": 0,  "lendario": 0},
    "raro":     {"comum": 25, "incomum": 35, "raro": 30, "epico": 10, "lendario": 0},
    "lendario": {"comum": 0,  "incomum": 15, "raro": 35, "epico": 35, "lendario": 15},
}
# (id, rótulo, tiers de item que podem sair; None = qualquer)
_CATS_BAU = [
    ("geral", "Geral", None),
    ("armas", "de Armas", ["arma"]),
    ("armaduras", "de Armaduras", ["armadura"]),
    ("itens", "de Itens", ["equipamento"]),
]
# raridade -> (preco, itens, lunaris_min, lunaris_max, rotulo)
_TIER_BAU = {
    "comum":    (50, 1, 5, 20, "Comum"),
    "raro":     (150, 2, 15, 45, "Raro"),
    "lendario": (400, 3, 40, 90, "Lendário"),
}


def _gerar_baus_compraveis():
    baus = []
    for ck, cn, tipos in _CATS_BAU:
        for rk, (preco, itens, lmin, lmax, rot) in _TIER_BAU.items():
            baus.append({
                "id": f"{ck}-{rk}", "nome": f"Baú {cn} ({rot})", "tipos": tipos,
                "preco": preco, "itens": itens, "lunaris_min": lmin, "lunaris_max": lmax,
                "pesos": _PESOS_BAU[rk],
            })
    return baus


BAUS_COMPRAVEIS = _gerar_baus_compraveis()


def bau_compravel_por_id(bau_id):
    alvo = normalizar(bau_id)
    for b in BAUS_COMPRAVEIS:
        if b["id"] == alvo:
            return b
    return None


# Estações do Jardim (ESTACOES/estacao_info) moveram pro Jornalista:
# bots/jornalista/core/economia.py: porque é ele quem sorteia o loot dos
# baús automáticos que a estação influencia. Ver docs/Plano_Jornalista.md,
# Decisão 2. /jornal estacao_definir substitui o antigo /estacao_definir.


# ─────────────────────────── Furtividade no roubo ─────────────────────────────
CUSTO_FURTIVIDADE = 15  # Lunaris pra suprimir o ping da vítima em /roubar e /roubar_cofre


# ─────────────────────── Itens de defesa passiva (consumíveis) ────────────────
# Comprados com /protecao_comprar, consumidos automaticamente na próxima vez
# que alguém tenta roubar o dono. Não passam pelo catálogo central (não são
# itens de inventário "de verdade", só um contador por tipo).
PROTECAO_TIPOS: Dict[str, Dict] = {
    "cao_de_guarda": {
        "nome": "Cão de Guarda",
        "custo": 80,
        "descricao": "Bloqueia automaticamente a próxima tentativa de roubo contra você (carteira ou cofre).",
    },
    "alarme_magico": {
        "nome": "Alarme Mágico",
        "custo": 50,
        "descricao": "Estende sua janela de defesa de 5s para 10s na próxima tentativa de roubo.",
    },
}
DEFESA_ROUBO_TIMEOUT_PADRAO = 5.0
DEFESA_ROUBO_TIMEOUT_ALARME = 10.0


def protecao_por_id(tipo_id: str) -> Optional[Dict]:
    return PROTECAO_TIPOS.get(normalizar(tipo_id).replace(" ", "_"))


# ───────────────────────── Cargo dinâmico de recompensa ───────────────────────
CACADOR_RECOMPENSA_HORAS = 24  # duração do cargo "Caçador de Recompensas" após uma captura
CARGO_MAIS_PROCURADO_PADRAO = "🎯 Mais Procurado"
CARGO_CACADOR_PADRAO = "🏹 Caçador de Recompensas"


# ──────────────────────────────── Câmbio flutuante ─────────────────────────────
CAMBIO_AUTO_AJUSTE_MAX = 0.05     # variação máxima por ciclo (5%)
CAMBIO_RATE_MINIMO = 5
CAMBIO_RATE_MAXIMO = 20
CAMBIO_FLUXO_LIMIAR = 500         # abaixo disso o fluxo do dia é considerado ruído, não pressão real


def ajustar_cambio_flutuante(rate_atual: int, fluxo_lunaris_para_solares: int, fluxo_solares_para_lunaris: int) -> int:
    """Novo `cambio_rate` (Lunaris por 1 Solares) dado o fluxo líquido do período.

    Mais gente convertendo Lunaris->Solares (demanda por Solares) empurra o
    rate pra cima (Solares fica mais caro); o inverso baixa. Sempre inteiro e
    sempre dentro da banda [CAMBIO_RATE_MINIMO, CAMBIO_RATE_MAXIMO].
    """
    liquido = int(fluxo_lunaris_para_solares) - int(fluxo_solares_para_lunaris)
    if abs(liquido) < CAMBIO_FLUXO_LIMIAR:
        return int(rate_atual)
    direcao = 1 if liquido > 0 else -1
    variacao = max(1, round(rate_atual * CAMBIO_AUTO_AJUSTE_MAX))
    novo = int(rate_atual) + direcao * variacao
    return max(CAMBIO_RATE_MINIMO, min(CAMBIO_RATE_MAXIMO, novo))


# ──────────────────────────────────── Leilão ───────────────────────────────────
LEILAO_CORTE_CASA = 0.05          # taxa do Banqueiro sobre toda venda em leilão
LEILAO_DURACAO_MIN_HORAS = 1
LEILAO_DURACAO_MAX_HORAS = 72


def valor_liquido_leilao(lance: int, taxa: float = None) -> int:
    """Quanto o vendedor recebe depois do corte da casa."""
    taxa = LEILAO_CORTE_CASA if taxa is None else taxa
    return max(0, lance - math.floor(lance * taxa))


# ──────────────────────── Investimentos (Títulos do Jardim) ───────────────────
INVESTIMENTO_DIAS = 7
INVESTIMENTO_TAXA_NORMAL = 0.05   # rendimento ao vencer, em condições normais
INVESTIMENTO_TAXA_CRISE = -0.02   # rendimento se a guild estiver em Crise Econômica


def valor_maturado_investimento(valor: int, em_crise: bool) -> int:
    taxa = INVESTIMENTO_TAXA_CRISE if em_crise else INVESTIMENTO_TAXA_NORMAL
    return max(0, int(valor) + math.floor(valor * taxa))


# ──────────────────────────────── Empréstimos P2P ──────────────────────────────
EMPRESTIMO_JUROS_MAXIMO = 0.20    # trava de segurança: 20%/dia no máximo permitido
EMPRESTIMO_PRAZO_MAX_DIAS = 30


def compor_juros_emprestimo(valor_devido: int, juros_diarios: float) -> int:
    """Aplica um dia de juros compostos sobre o saldo devedor."""
    if valor_devido <= 0:
        return 0
    return int(valor_devido) + max(1, math.floor(valor_devido * juros_diarios))


# ──────────────────────────────── Loteria Dominical ────────────────────────────
LOTERIA_PRECO_BILHETE = 25
LOTERIA_CORTE_CASA = 0.10


def sortear_vencedor_loteria(bilhetes: List[Tuple[str, int]], rng=None):
    """`bilhetes`: [(user_id, quantidade), ...]. None se ninguém comprou."""
    gerador = rng or random
    if not bilhetes:
        return None
    ids = [b[0] for b in bilhetes]
    pesos = [b[1] for b in bilhetes]
    return gerador.choices(ids, weights=pesos, k=1)[0]
