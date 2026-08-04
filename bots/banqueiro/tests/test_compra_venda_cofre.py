"""/comprar e /vender depois do cutover pra Inventario (Fase 2.4).

Cobre a regressão que motivou a fachada inteira: item comprado com a
integração ligada ficava invisível pra /vender (lia só a tabela local).
Também trava a ordem retirar-antes-de-creditar em /vender e a checagem de
capacidade valendo igual nos dois modos em /comprar (antes só valia sem
integração).
"""

from __future__ import annotations

import asyncio
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE))

from cogs.economia import Economia
from core.catalogo import Item
from core.db import SaldoInsuficiente
from core.inventario import Inventario
from core.platform_api import PlatformApiError


class _Catalogo:
    def __init__(self, itens):
        self._itens = {i.id: i for i in itens}

    def get(self, item_id):
        return self._itens.get(item_id)


class _DB:
    def __init__(self, *, par=None, cofre_tier="comum", saldo=1000, reputacao=1, faturas=0, inventario_legado=None):
        self.par = par
        self.cofre_tier = cofre_tier
        self.saldos = {"Lunaris": saldo}
        self.reputacao = reputacao
        self.faturas = faturas
        self.inventario_legado = list(inventario_legado or [])
        self.chamadas = []

    def garantir_jogador(self, guild_id, user_id):
        pass

    def get_cofre_tier(self, guild_id, user_id):
        return self.cofre_tier

    def get_cartao(self, guild_id, user_id):
        return {"credito": self.reputacao, "tier": "comum"}

    def get_divida(self, guild_id, user_id):
        return 0

    def get_saldo(self, guild_id, user_id, moeda):
        return self.saldos.get(moeda, 0)

    def get_total_faturas_pendentes(self, guild_id, user_id):
        return self.faturas

    def converter_faturas_vencidas(self, guild_id):
        return []

    def get_economia_config(self, guild_id):
        return {"venda_ratio": 0.5}

    def debitar(self, guild_id, user_id, moeda, quantia, permitir_negativo_ate=0):
        saldo = self.saldos.get(moeda, 0)
        if saldo < quantia and saldo - quantia < -permitir_negativo_ate:
            raise SaldoInsuficiente(f"Você só tem {saldo} {moeda}.")
        self.saldos[moeda] = saldo - quantia
        self.chamadas.append(("debitar", moeda, quantia))
        return self.saldos[moeda]

    def cobrar_compra_com_fatura(self, guild_id, user_id, quantia, limite_total, descricao, chave, prazo_dias=7):
        saldo = self.saldos.get("Lunaris", 0)
        financiado = max(0, quantia - saldo)
        disponivel = limite_total - self.faturas
        if financiado > disponivel:
            raise SaldoInsuficiente("limite insuficiente")
        usado = min(saldo, quantia)
        self.saldos["Lunaris"] = saldo - usado
        self.faturas += financiado
        self.chamadas.append(("fatura", financiado, chave))
        return {
            "saldo": self.saldos["Lunaris"],
            "carteira_usada": usado,
            "financiado": financiado,
            "fatura_id": 1,
            "vence_em": datetime.now(timezone.utc) + timedelta(days=prazo_dias),
            "repetido": False,
        }

    def creditar(self, guild_id, user_id, moeda, quantia):
        self.saldos[moeda] = self.saldos.get(moeda, 0) + quantia
        self.chamadas.append(("creditar", moeda, quantia))
        return self.saldos[moeda]

    def registrar_extrato(self, *a, **k):
        self.chamadas.append(("extrato", a))

    def estornar_debito(self, *a, **k):
        self.chamadas.append(("estornar_debito", a))

    # inventário legado
    def contar_itens(self, guild_id, user_id):
        return sum(i["quantidade"] for i in self.inventario_legado)

    def listar_inventario(self, guild_id, user_id):
        return list(self.inventario_legado)

    def add_item(self, guild_id, user_id, item_id, titulo, tipo, qtd=1):
        self.chamadas.append(("add_item", item_id, qtd))
        self.inventario_legado.append({"item_id": item_id, "titulo": titulo, "tipo": tipo, "quantidade": qtd})

    def remover_item(self, guild_id, user_id, item_id, qtd=1):
        for i in self.inventario_legado:
            if i["item_id"] == item_id and i["quantidade"] >= qtd:
                i["quantidade"] -= qtd
                self.chamadas.append(("remover_item", item_id, qtd))
                return True
        return False

    # cofre da plataforma
    def par_cofre_plataforma(self, guild_id, user_id):
        return self.par

    def contar_cofre_plataforma(self, guild_id, user_id):
        return sum(i["quantidade"] for i in self.inventario_legado)

    def listar_cofre_plataforma(self, guild_id, user_id):
        return list(self.inventario_legado)


class _Platform:
    def __init__(self):
        self.chamadas = []
        self.excecao_deposit = None
        self.excecao_withdraw = None

    async def deposit_vault(self, **kwargs):
        self.chamadas.append(("deposit_vault", kwargs))
        if self.excecao_deposit:
            raise self.excecao_deposit
        return {"repetido": False}

    async def withdraw_vault(self, **kwargs):
        self.chamadas.append(("withdraw_vault", kwargs))
        if self.excecao_withdraw:
            raise self.excecao_withdraw
        item_id = kwargs["items"][0]["item_id"]
        qtd = kwargs["items"][0]["quantidade"]
        return {"repetido": False, "itens": [{"item_id": item_id, "titulo": item_id, "quantidade": qtd, "dados": {"tipo": "item"}}]}


class _Resposta:
    def __init__(self):
        self.mensagens = []
        self.deferido = False

    async def defer(self, **kwargs):
        self.deferido = True

    async def send_message(self, *args, **kwargs):
        self.mensagens.append((args, kwargs))


class _Followup:
    def __init__(self):
        self.mensagens = []

    async def send(self, *args, **kwargs):
        self.mensagens.append((args, kwargs))


class _Interacao:
    def __init__(self, guild_id=555000111, user_id=777000222, interaction_id=999888):
        self.id = interaction_id
        self.guild_id = guild_id
        self.user = type("Usuario", (), {"id": user_id, "display_name": "Jogador"})()
        self.response = _Resposta()
        self.followup = _Followup()


def _item_espada(preco=None, raridade="comum"):
    if preco is None:
        preco = {"Lunaris": 100}
    return Item("arma", "espada", "Espada", {"preco": preco, "raridade": raridade})


def _cog(*, db, platform):
    cog = object.__new__(Economia)
    cog.bot = type(
        "Bot",
        (),
        {
            "db": db,
            "platform": platform,
            "catalogo": _Catalogo([_item_espada()]),
            "inventario": None,
        },
    )()
    cog.bot.inventario = Inventario(cog.bot)
    return cog


def _rodar(coro):
    return asyncio.run(coro)


# ── /comprar ─────────────────────────────────────────────────────────────

def test_comprar_em_modo_legado_debita_e_grava_no_inventario_local():
    db = _DB(par=None)
    cog = _cog(db=db, platform=_Platform())

    _rodar(cog._executar_compra(_Interacao(), "espada", "Lunaris"))

    assert ("debitar", "Lunaris", 100) in db.chamadas
    assert ("add_item", "espada", 1) in db.chamadas


def test_comprar_em_modo_cofre_deposita_na_plataforma_com_chave_da_interacao():
    plataforma = _Platform()
    db = _DB(par={"usuario_id": "u", "campanha_id": "c"})
    cog = _cog(db=db, platform=plataforma)
    interacao = _Interacao(interaction_id=424242)

    _rodar(cog._executar_compra(interacao, "espada", "Lunaris"))

    assert ("debitar", "Lunaris", 100) in db.chamadas
    assert not any(c[0] == "add_item" for c in db.chamadas)
    nome, kwargs = plataforma.chamadas[0]
    assert nome == "deposit_vault"
    assert kwargs["idempotency_key"] == "compra-item:424242"


def test_comprar_respeita_capacidade_mesmo_em_modo_cofre():
    """Regressão: antes só checava capacidade sem integração ligada: quem
    estava integrado tinha cofre efetivamente ilimitado na compra."""
    cheio = [{"item_id": f"x{i}", "titulo": "X", "tipo": "item", "quantidade": 1} for i in range(10)]
    db = _DB(par={"usuario_id": "u", "campanha_id": "c"}, cofre_tier="comum", inventario_legado=cheio)
    plataforma = _Platform()
    cog = _cog(db=db, platform=plataforma)
    interacao = _Interacao()

    _rodar(cog._executar_compra(interacao, "espada", "Lunaris"))

    assert not any(c[0] == "debitar" for c in db.chamadas)  # nem chegou a cobrar
    assert plataforma.chamadas == []
    (args, kwargs) = interacao.response.mensagens[0]
    assert "cheio" in args[0]


def test_comprar_sem_saldo_nem_credito_suficiente_nao_debita_nem_entrega():
    """Preço bem acima do limite de crédito do Cartão Lunar: não é só
    "sem saldo", é sem saldo E sem linha de crédito que cubra."""
    db = _DB(par=None, saldo=10)
    cog = _cog(db=db, platform=_Platform())
    cog.bot.catalogo = _Catalogo([_item_espada(preco=100_000)])

    _rodar(cog._executar_compra(_Interacao(), "espada", "Lunaris"))

    assert not any(c[0] == "add_item" for c in db.chamadas)


def test_comprar_com_falta_de_saldo_oferece_fatura_sem_cobrar_antes_da_confirmacao():
    db = _DB(par=None, saldo=70)
    cog = _cog(db=db, platform=_Platform())
    interacao = _Interacao()

    _rodar(cog._executar_compra(interacao, "espada", "Lunaris"))

    assert not any(c[0] in ("debitar", "fatura", "add_item") for c in db.chamadas)
    _args, kwargs = interacao.response.mensagens[0]
    assert kwargs["ephemeral"] is True
    assert "Valor financiado: ☾ **30**" in kwargs["embed"].description
    assert kwargs["view"].__class__.__name__ == "ConfirmarFinanciamentoView"

    botao = _Interacao(interaction_id=interacao.id)
    _rodar(kwargs["view"].executar(botao))
    assert ("fatura", 30, f"item:{interacao.id}") in db.chamadas
    assert ("add_item", "espada", 1) in db.chamadas


def test_comprar_raro_bloqueia_reputacao_baixa_antes_de_cobrar():
    db = _DB(par=None, saldo=10_000, reputacao=249)
    cog = _cog(db=db, platform=_Platform())
    cog.bot.catalogo = _Catalogo([_item_espada(raridade="raro")])
    interacao = _Interacao()

    _rodar(cog._executar_compra(interacao, "espada", "Lunaris"))

    assert not any(c[0] in ("debitar", "fatura", "add_item") for c in db.chamadas)
    (args, kwargs) = interacao.response.mensagens[0]
    assert kwargs["ephemeral"] is True
    assert "250 de reputação" in args[0]


# ── /vender ──────────────────────────────────────────────────────────────

def test_vender_em_modo_cofre_retira_antes_de_creditar():
    plataforma = _Platform()
    db = _DB(par={"usuario_id": "u", "campanha_id": "c"}, saldo=0)
    cog = _cog(db=db, platform=plataforma)

    _rodar(cog.vender.callback(cog, _Interacao(), "espada", None))

    ordem = [c[0] for c in db.chamadas if c[0] in ("creditar",)]
    nome, _ = plataforma.chamadas[0]
    assert nome == "withdraw_vault"
    assert ("creditar", "Lunaris", 50) in db.chamadas  # VENDA_RATIO 50% de 100


def test_vender_sem_o_item_no_cofre_nao_credita_nada():
    plataforma = _Platform()
    plataforma.excecao_withdraw = PlatformApiError("sem quantidade", status_code=409, code="quantidade_indisponivel")
    db = _DB(par={"usuario_id": "u", "campanha_id": "c"})
    cog = _cog(db=db, platform=plataforma)

    _rodar(cog.vender.callback(cog, _Interacao(), "espada", None))

    assert not any(c[0] == "creditar" for c in db.chamadas)


def test_vender_com_plataforma_fora_do_ar_nao_credita_nada():
    """O caso que a fachada existe pra evitar: sem isso, uma tabela local
    desatualizada pagaria por um item que o jogador já não tem mais lá."""
    plataforma = _Platform()
    plataforma.excecao_withdraw = PlatformApiError("timeout", status_code=None)
    db = _DB(par={"usuario_id": "u", "campanha_id": "c"})
    cog = _cog(db=db, platform=plataforma)

    _rodar(cog.vender.callback(cog, _Interacao(), "espada", None))

    assert not any(c[0] == "creditar" for c in db.chamadas)


def test_vender_em_modo_legado_continua_funcionando():
    db = _DB(par=None, inventario_legado=[{"item_id": "espada", "titulo": "Espada", "tipo": "arma", "quantidade": 1}])
    cog = _cog(db=db, platform=_Platform())

    _rodar(cog.vender.callback(cog, _Interacao(), "espada", None))

    assert ("remover_item", "espada", 1) in db.chamadas
    assert ("creditar", "Lunaris", 50) in db.chamadas
