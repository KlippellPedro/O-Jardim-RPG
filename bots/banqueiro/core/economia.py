"""
O Jardim RPG: Banqueiro
Lógica PURA da economia: sem Discord, sem banco de dados. A única exceção é
uma leitura de arquivo na importação (tiers de Cofre/Segurança, compartilhada
com a plataforma — ver _carregar_cofre_seguranca_tiers); toda função continua
determinística e fácil de testar isoladamente (ver tests/test_economia.py).

Moedas do sistema:
  - Lunaris (☾): moeda oficial. Todo jogador começa com 20.
  - Solares (☉): moeda "solar", mais valiosa.
O schema de preço vem da Loja do site (data/loja): `conteudo.preco` é um
número (preço nativo em Solares) OU um objeto { "Lunaris": X, "Solares": Y }.

Convenção de nomes de moeda: comparações ignoram acento e caixa, igual ao
site (src/loja/services/moedasService.js): "Solares" == "SOLARES" == "solares".
"""

from __future__ import annotations

import json
import math
import os
import random
import unicodedata
from pathlib import Path
from typing import Optional, Union, Tuple, List, Dict

Numero = Union[int, float]


def _localizar_cofre_seguranca_tiers() -> Path:
    """Resolve sem depender de import relativo (este módulo às vezes é
    carregado avulso via importlib, fora do pacote `core`, por
    plataforma/tests/test_cofre_tiers.py — ver test_espelho_permanece_identico_ao_banqueiro).
    Mesma ideia de core/config.py::DATA_DIR: `data/economia` no repositório,
    ou `data/` (empacotado, ao lado do bot) no ZIP de deploy."""
    env = os.getenv("COFRE_SEGURANCA_TIERS_PATH")
    if env:
        return Path(env)
    base_dir = Path(__file__).resolve().parent.parent  # bots/banqueiro
    repositorio = base_dir.parent.parent / "data" / "economia" / "cofre_seguranca_tiers.json"
    if repositorio.is_file():
        return repositorio
    return base_dir / "data" / "cofre_seguranca_tiers.json"


def _carregar_cofre_seguranca_tiers() -> dict:
    """Única leitura de arquivo deste módulo: os tiers de Cofre/Segurança vêm
    de data/economia/cofre_seguranca_tiers.json, a mesma fonte que
    plataforma/core/cofre_tiers.py lê. Evita manter duas tabelas hardcoded
    sincronizadas à mão entre o bot e a plataforma (ver auditoria 2026-08,
    achado 10). O resto deste módulo continua lógica pura de economia."""
    return json.loads(_localizar_cofre_seguranca_tiers().read_text(encoding="utf-8"))


_TIERS_DATA = _carregar_cofre_seguranca_tiers()

# ─────────────────────────── Constantes do sistema ───────────────────────────

MOEDA_OFICIAL = "Lunaris"
NOME_BOT = "Banqueiro"  # nome do bot (troque aqui pra renomear em tudo)
SIMBOLOS = {"lunaris": "☾", "solares": "☉", "fragmentos de estrela": "✧", "creditos sombrios": "♆"}

# Saldo inicial da carteira (bate com "Receba um item comum e 20 Lunaris").
SALDO_INICIAL: Dict[str, int] = {"Lunaris": 20, "Solares": 0, "Fragmentos de Estrela": 0, "Créditos Sombrios": 0}

# Câmbio oficial das regras e da loja. Continua configurável por servidor.
CAMBIO_RATE_PADRAO = 100         # quantos Lunaris valem 1 Solar
CAMBIO_TAXA_PADRAO = 0.02        # 2% de taxa do banco (vibe da "Transferência 2%")

# Mantido apenas para ler configurações antigas. A compra e a revenda direta de
# itens foram retiradas do Discord; a Loja do site é a fonte única desse fluxo.
VENDA_RATIO = 0.5

# /abrir_todos abre no máximo isso por vez (cada baú é uma chamada de rede pra
# entrega central): evita travar numa fila enorme e passar do prazo de
# resposta do Discord. Sobrando baú, o jogador só chama de novo.
ABRIR_TODOS_LIMITE = 25

# Cofre / Armazém: progressão longa do "Cofre Lunar" (custos multimoeda).
# Os cinco IDs antigos foram preservados para não rebaixar cofres já comprados.
# O último nível usa limites técnicos muito altos e é exibido como "sem limite
# prático": o PostgreSQL ainda precisa armazenar quantidades como inteiros.
COFRE_TIERS: List[Dict] = _TIERS_DATA["cofre"]["tiers"]
COFRE_TIER_INICIAL = _TIERS_DATA["cofre"]["tier_inicial"]
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
SEGURANCA_TIERS: List[Dict] = _TIERS_DATA["seguranca"]["tiers"]
SEGURANCA_TIER_INICIAL = _TIERS_DATA["seguranca"]["tier_inicial"]


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

# Calor é uma medida privada de exposição do ladrão. Decai sozinho e torna
# novas tentativas mais lentas/caras, sem alterar permanentemente a ficha.
ROUBO_CALOR_MAXIMO = 100
ROUBO_CALOR_DECAIMENTO_POR_HORA = 5
ROUBO_CALOR_COOLDOWN_MAX_BONUS = 0.50
ROUBO_CALOR_CHANCE_MAX_PENALIDADE = 0.20

ROUBO_ABORDAGENS: Dict[str, Dict] = {
    "cuidadosa": {
        "nome": "Cuidadosa",
        "timeout_mult": 1.40,
        "calor": 10,
        "multa_mult": 1.0,
        "saque_mult": 1.0,
        "oculta_identidade": False,
        "requer_preparo": None,
        "descricao": "Mais tempo para a vítima reagir, mas gera menos Calor.",
    },
    "rapida": {
        "nome": "Rápida",
        "timeout_mult": 0.60,
        "calor": 25,
        "multa_mult": 1.50,
        "saque_mult": 1.0,
        "oculta_identidade": False,
        "requer_preparo": None,
        "descricao": "Janela curta; gera muito Calor e aumenta a multa do cofre.",
    },
    "disfarcada": {
        "nome": "Disfarçada",
        "timeout_mult": 1.0,
        "calor": 12,
        "multa_mult": 1.0,
        "saque_mult": 0.70,
        "oculta_identidade": True,
        "requer_preparo": "kit_disfarce",
        "descricao": "Oculta o nome até o resultado, reduz o saque e consome um Kit de Disfarce.",
    },
}

PREPAROS_ROUBO: Dict[str, Dict] = {
    "kit_disfarce": {
        "nome": "Kit de Disfarce",
        "custo": 20,
        "descricao": "Consumido ao iniciar uma abordagem Disfarçada.",
    }
}

SEGURO_COFRE_CUSTO = 25
SEGURO_COFRE_DIAS = 30
SEGURO_COFRE_COBERTURA = 0.30
SEGURO_COFRE_LIMITE = 200
SEGURO_COFRE_CARENCIA_DIAS = 7


def valor_roubo_carteira(saldo: int, percentual: float = ROUBO_CARTEIRA_PERCENT) -> int:
    """Valor exposto transferido por um roubo de carteira bem-sucedido."""
    saldo_inteiro = int(saldo)
    if saldo_inteiro <= 0:
        return 0
    if not 0 < percentual <= 1:
        raise ValueError("percentual de roubo invalido")
    return max(1, math.floor(saldo_inteiro * percentual))


def abordagem_roubo(abordagem_id: str) -> Dict:
    return ROUBO_ABORDAGENS.get(normalizar(abordagem_id), ROUBO_ABORDAGENS["cuidadosa"])


def cooldown_com_calor(horas_base: int, calor: int) -> float:
    bonus = min(ROUBO_CALOR_COOLDOWN_MAX_BONUS, max(0, int(calor)) / 200)
    return max(1.0, float(horas_base) * (1 + bonus))


def chance_com_calor(chance_base: float, calor: int) -> float:
    penalidade = min(ROUBO_CALOR_CHANCE_MAX_PENALIDADE, max(0, int(calor)) / 500)
    return max(ROUBO_COFRE_CHANCE_MINIMA, float(chance_base) - penalidade)


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
# Acima deste valor guardado (por moeda), o excedente continua seguro no
# cofre mas para de render juros automáticos — sem teto, 2%/dia composto sem
# limite dominava estritamente o rendimento de /investir em qualquer prazo
# igual ou maior que uma semana (decisão de balanceamento 2026-08). O valor
# reaproveita a Unidade de Aquisição já usada em bases.ts (1.000 Lunaris),
# em vez de inventar uma escala nova.
JUROS_COFRE_TETO = 1000
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
    "mitico": 1000,
    "reliquia": 1000,  # alias legado
    "reliquia da criacao": 1500,
}

REPUTACAO_POR_CARTAO_TIER = {
    "comum": 0,
    "prata": 100,
    "dourado": 250,
    "arcano": 500,
    "eterno": 800,
}

REPUTACAO_POR_COFRE_TIER = _TIERS_DATA["reputacao_por_cofre_tier"]
REPUTACAO_POR_SEGURANCA_TIER = _TIERS_DATA["reputacao_por_seguranca_tier"]

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
ITENS_ELEGIVEIS_BAU = [
    "arma", "armadura", "equipamento", "consumivel", "artefato",
    "fruto-eden", "implante",
]

_CATS_BAU = [
    # Nunca sorteia veículos, modificações, monstros ou drops comerciais. Isso
    # evita que um baú barato contorne sistemas e preços próprios da Loja.
    ("geral", "Geral", ITENS_ELEGIVEIS_BAU),
    ("armas", "de Armas", ["arma"]),
    ("armaduras", "de Armaduras", ["armadura"]),
    ("itens", "de Itens", ["equipamento", "consumivel"]),
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
        "custo": 30,
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
# A banda antiga (5–20) pertencia à economia 10:1 e derrubava imediatamente
# a taxa atual de 100:1 quando o ajuste automático rodava. Mantemos espaço
# para flutuação sem permitir que um único ciclo volte à escala legada.
CAMBIO_RATE_MINIMO = 50
CAMBIO_RATE_MAXIMO = 200
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
INVESTIMENTO_TAXA_CRISE = -0.02   # rendimento se a guild estiver em Crise Econômica (evento do mestre, sem variância)
# Condições normais: risco/recompensa real em vez de um retorno fixo — com
# taxa fixa, Investimento era estritamente pior que só guardar no Cofre em
# qualquer prazo (juros do Cofre, mesmo com o novo teto, seguem previsíveis
# e sem risco; ver docs/decisao-design-balanceamento-2026-08.md). O valor
# esperado (0,7×8% + 0,3×(-3%) ≈ 4,7%) fica perto do antigo +5% fixo, mas
# agora com dispersão de verdade: dá pra perder.
INVESTIMENTO_CHANCE_GANHO = 0.70   # chance de o título vencer com o retorno bom
INVESTIMENTO_TAXA_GANHO = 0.08     # retorno se vencer bem
INVESTIMENTO_TAXA_PERDA = -0.03    # retorno se vencer mal


def valor_maturado_investimento(valor: int, em_crise: bool) -> int:
    """Resolve o rendimento na hora da maturação (não antes) — em crise é
    sempre o mesmo prejuízo controlado pelo mestre; fora de crise, sorteia
    entre o retorno bom e o ruim a cada título que vence."""
    if em_crise:
        taxa = INVESTIMENTO_TAXA_CRISE
    else:
        taxa = INVESTIMENTO_TAXA_GANHO if random.random() < INVESTIMENTO_CHANCE_GANHO else INVESTIMENTO_TAXA_PERDA
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
