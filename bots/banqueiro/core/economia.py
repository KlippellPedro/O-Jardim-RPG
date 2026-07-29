"""
O Jardim RPG: Banqueiro
Lógica PURA da economia: sem Discord, sem banco de dados, sem I/O.
Fácil de testar isoladamente (ver tests/test_economia.py).

Moedas do sistema:
  - Lunaris (☾): moeda oficial. Todo jogador começa com 20.
  - Solares (☉): moeda "solar", mais valiosa.
O schema de preço vem da Loja do site (data/loja): `conteudo.preco` é um
número (vale em qualquer moeda) OU um objeto { "Lunaris": X, "Solares": Y }.

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

# Cofre / Armazém: tabela de tamanho do "Cofre Lunar" (custo em Lunaris).
# Todo jogador começa no Cofre Comum (10 itens, guarda até 500 por moeda).
# capacidade_moeda = teto de cada moeda que dá pra manter guardada nesse tier.
COFRE_TIERS: List[Dict] = [
    {"id": "comum",   "nome": "Cofre Comum",   "capacidade": 10,  "capacidade_moeda": 500,   "custo": 100},
    {"id": "prata",   "nome": "Cofre de Prata", "capacidade": 20,  "capacidade_moeda": 1500,  "custo": 250},
    {"id": "dourado", "nome": "Cofre Dourado", "capacidade": 40,  "capacidade_moeda": 5000,  "custo": 500},
    {"id": "arcano",  "nome": "Cofre Arcano",  "capacidade": 60,  "capacidade_moeda": 15000, "custo": 800},
    {"id": "eterno",  "nome": "Cofre Eterno",  "capacidade": 200, "capacidade_moeda": 50000, "custo": 2000},
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

    - número  -> vale em qualquer moeda;
    - dict    -> pega a chave que casar (sem acento/caixa) com `moeda`;
    - ausente / inválido / negativo / sem a moeda -> None.
    Retorna int >= 0 ou None.
    """
    if preco is None or isinstance(preco, bool):
        return None
    if isinstance(preco, (int, float)):
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
    {"id": "basica",      "nome": "Segurança Básica",     "defesa": 0.50, "custo": 0},
    {"id": "fechadura",   "nome": "Fechadura Reforçada",  "defesa": 0.70, "custo": 150},
    {"id": "cofre-forte", "nome": "Cofre-Forte",          "defesa": 0.80, "custo": 350},
    {"id": "blindado",    "nome": "Blindagem Arcana",     "defesa": 0.88, "custo": 700},
    {"id": "maximo",      "nome": "Segurança Máxima",     "defesa": 0.94, "custo": 1400},
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
ROUBO_CARTEIRA_PERCENT = 0.50        # /roubar leva 50% fixo do saldo de Lunaris da carteira

ROUBO_COFRE_CHANCE_MINIMA = 0.05     # o ladrão sempre tem pelo menos 5% de chance, por mais seguro que seja
ROUBO_COFRE_COOLDOWN_HORAS = 24      # cooldown separado do /roubar (ações independentes)
ROUBO_COFRE_PERCENT = 0.50           # /roubar_cofre bem-sucedido leva 50% fixo do saldo guardado
ROUBO_MULTA_PERCENT_MIN = 0.10       # se falhar o /roubar_cofre, paga essa faixa da PRÓPRIA carteira...
ROUBO_MULTA_PERCENT_MAX = 0.25       # ...de multa pro alvo (flagrado tentando arrombar o cofre)


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
# tempo, como juros de atraso, e machuca o crédito. Fica muito tempo/muito
# fundo no vermelho e o Banqueiro põe recompensa na cabeça do devedor.
DIVIDA_TICK_HORAS = 24               # de quanto em quanto tempo a dívida "anda"
DIVIDA_TAXA_CRESCIMENTO = 0.08       # a dívida cresce 8% a cada tick

# Juros automático do cofre: recompensa por guardar (menor que o crescimento da
# dívida, então guardar rende mas dever ainda é pior). O mestre pode dar um
# bônus extra a qualquer momento com /juros_cofre.
JUROS_COFRE_TICK_HORAS = 24          # aplica juros do cofre uma vez por dia
JUROS_COFRE_TAXA = 0.02              # +2% por dia no que está guardado no cofre
DIVIDA_PENALIDADE_CREDITO = 15       # crédito cai isso a cada tick em dívida
DIVIDA_CREDITO_MINIMO = -200         # crédito não desce de -200 só por dívida
CREDITO_RECUPERACAO_TICK = 10        # crédito sobe isso por tick pra quem tá em dia (< neutro)
CREDITO_RECUPERACAO_TETO = 100       # só recupera sozinho até aqui (faixa "neutra"); acima disso é conquista mesmo

DIVIDA_RECOMPENSA_LIMIAR = 150       # dívida passou disso (valor absoluto) -> vira procurado
DIVIDA_RECOMPENSA_TETO = 500         # recompensa do sistema nunca passa disso

RECOMPENSA_MINIMA = 10               # menor valor que um jogador pode colocar de recompensa


# ─────────────────────────────── Cartão Lunar ────────────────────────────────
CREDITO_INICIAL = 1

# Níveis do cartão: limite de gasto (linha de crédito) e custo de emissão, em Lunaris.
CARTAO_TIERS = [
    {"id": "comum",   "nome": "Cartão Comum",   "limite": 200,  "custo": 10},
    {"id": "prata",   "nome": "Cartão de Prata", "limite": 400,  "custo": 20},
    {"id": "dourado", "nome": "Cartão Dourado", "limite": 600,  "custo": 30},
    {"id": "arcano",  "nome": "Cartão Arcano",  "limite": 800,  "custo": 40},
    {"id": "eterno",  "nome": "Cartão Eterno",  "limite": 1000, "custo": 50},
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


def beneficios_credito(credito):
    """Efeitos da faixa de crédito (tabela do Cartão Lunar)."""
    c = int(credito)
    b = {"desconto": 0.0, "cashback": 0.0, "taxa_mult": 1.0, "limite_mult": 1, "rotulo": "Neutro"}
    if c <= -1:
        b["taxa_mult"] = 2.0
        b["rotulo"] = "Crédito negativo: taxas dobradas e risco de cobrador"
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


def limite_efetivo(tier_id, credito):
    base = (cartao_por_id(tier_id) or cartao_por_id(CARTAO_TIER_INICIAL))["limite"]
    return base * beneficios_credito(credito)["limite_mult"]


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
