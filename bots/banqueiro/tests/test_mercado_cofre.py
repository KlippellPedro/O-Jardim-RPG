"""/leilao_iniciar e a resolução automática (_resolver_leilao) depois do
cutover pra Inventario: cobre o escrow de item no cofre da plataforma
(reservar/resolver_reserva) e o caso degradado "pago mas entrega falhou",
que não pode retentar sem risco de debitar/creditar duas vezes.
"""

from __future__ import annotations

import asyncio
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE))

from cogs.mercado import Mercado
from core import economia
from core.inventario import Inventario
from core.platform_api import PlatformApiError


class _DB:
    def __init__(self, *, par=None, inventario_legado=None):
        self.par = par
        self.inventario_legado = list(inventario_legado or [])
        self.cofres = {}
        self.baus = {}
        self.leiloes = {}
        self._prox_id = 1
        self.saldos = {}
        self.chamadas = []

    def garantir_jogador(self, g, u):
        pass

    def get_economia_config(self, g):
        return {"leilao_corte": economia.LEILAO_CORTE_CASA}

    def par_cofre_plataforma(self, g, u):
        return self.par.get(u) if self.par else None

    def get_cofre_tier(self, g, u):
        return "comum"

    def listar_cofre_plataforma(self, g, u):
        return list(self.cofres.get(u, []))

    def contar_cofre_plataforma(self, g, u):
        return sum(i["quantidade"] for i in self.cofres.get(u, []))

    def listar_inventario(self, g, u):
        return list(self.inventario_legado)

    def contar_itens(self, g, u):
        return sum(i["quantidade"] for i in self.inventario_legado)

    def add_item(self, g, u, item_id, titulo, tipo, qtd=1):
        self.chamadas.append(("add_item", u, item_id, qtd))

    def remover_item(self, g, u, item_id, qtd=1):
        for i in self.inventario_legado:
            if i["item_id"] == item_id and i["quantidade"] >= qtd:
                i["quantidade"] -= qtd
                self.chamadas.append(("remover_item", u, item_id, qtd))
                return True
        return False

    def contar_bau(self, g, u, ref):
        return self.baus.get((u, ref), 0)

    def remover_bau(self, g, u, ref, qtd=1):
        self.baus[(u, ref)] = self.baus.get((u, ref), 0) - qtd

    def add_bau(self, g, u, ref, qtd=1):
        self.baus[(u, ref)] = self.baus.get((u, ref), 0) + qtd

    def listar_baus_estoque(self, g, u):
        return []

    def criar_leilao(self, g, u, kind, ref, titulo, moeda, lance_minimo, canal_id, expira_em, modo_posse="legado"):
        leilao_id = self._prox_id
        self._prox_id += 1
        leilao = {
            "id": leilao_id, "guild_id": g, "vendedor_id": u, "kind": kind, "ref": ref, "titulo": titulo,
            "moeda": moeda, "lance_minimo": lance_minimo, "lance_atual": 0, "vencedor_id": None,
            "canal_id": canal_id, "mensagem_id": None, "expira_em": expira_em, "status": "ativo",
            "modo_posse": modo_posse,
        }
        self.leiloes[leilao_id] = leilao
        return dict(leilao)

    def encerrar_leilao(self, leilao_id, status):
        self.leiloes[leilao_id]["status"] = status
        self.chamadas.append(("encerrar_leilao", leilao_id, status))

    def set_leilao_mensagem(self, leilao_id, mensagem_id):
        self.leiloes[leilao_id]["mensagem_id"] = mensagem_id

    def get_saldo(self, g, u, moeda):
        return self.saldos.get((u, moeda), 0)

    def debitar(self, g, u, moeda, quantia):
        saldo = self.get_saldo(g, u, moeda)
        if saldo < quantia:
            from core.db import SaldoInsuficiente
            raise SaldoInsuficiente("sem saldo")
        self.saldos[(u, moeda)] = saldo - quantia
        self.chamadas.append(("debitar", u, moeda, quantia))

    def creditar(self, g, u, moeda, quantia):
        self.saldos[(u, moeda)] = self.get_saldo(g, u, moeda) + quantia
        self.chamadas.append(("creditar", u, moeda, quantia))

    def registrar_extrato(self, *a, **k):
        pass

    def criar_aviso(self, guild_id, mensagem):
        self.chamadas.append(("aviso", guild_id, mensagem))


class _Platform:
    def __init__(self, db):
        self.db = db
        self.chamadas = []
        self.falhar_reservar = None
        self.falhar_resolver = None

    async def reserve_vault(self, *, discord_user_id, reference, item_id, quantity, **kwargs):
        self.chamadas.append(("reserve_vault", discord_user_id, reference))
        if self.falhar_reservar:
            raise self.falhar_reservar
        u = str(discord_user_id)
        cofre = self.db.cofres.setdefault(u, [])
        for entrada in cofre:
            if entrada["item_id"] == item_id and entrada["quantidade"] >= quantity:
                entrada["quantidade"] -= quantity
                self.db.reservas = getattr(self.db, "reservas", {})
                self.db.reservas[reference] = {"item_id": item_id, "titulo": entrada["titulo"], "quantidade": quantity, "dono": u}
                return {"repetido": False, "item_id": item_id, "titulo": entrada["titulo"], "quantidade": quantity, "reserva_id": reference}
        raise PlatformApiError("sem quantidade", status_code=409, code="quantidade_indisponivel")

    async def resolve_vault_reservation(self, *, origin, reference, destination_discord_user_id, **kwargs):
        self.chamadas.append(("resolve_vault_reservation", reference, destination_discord_user_id))
        if self.falhar_resolver:
            raise self.falhar_resolver
        reservas = getattr(self.db, "reservas", {})
        reserva = reservas.get(reference)
        if reserva is None:
            raise PlatformApiError("reserva nao encontrada", status_code=404)
        destino = str(destination_discord_user_id) if destination_discord_user_id else reserva["dono"]
        self.db.cofres.setdefault(destino, []).append(
            {"item_id": reserva["item_id"], "titulo": reserva["titulo"], "quantidade": reserva["quantidade"], "dados": {}}
        )
        status = "entregue" if destination_discord_user_id else "devolvida"
        return {"repetido": False, "status": status}


class _Catalogo:
    """Item nunca cadastrado no catálogo: força o fallback pro título/tipo
    já conhecidos pelo leilão, igual ao comportamento real pra itens que
    saíram do catálogo desde que foram leiloados."""

    def get(self, item_id):
        return None


def _cog(db):
    bot = type("Bot", (), {"db": db, "platform": None, "catalogo": _Catalogo(), "inventario": None})()
    bot.platform = _Platform(db)
    bot.inventario = Inventario(bot)
    bot.get_guild = lambda guild_id: None  # sem servidor real -> pula a edição de mensagem final
    cog = object.__new__(Mercado)
    cog.bot = bot
    return cog


def _rodar(coro):
    return asyncio.run(coro)


def _leilao_base(**overrides):
    base = {
        "id": 1, "guild_id": "555000111", "vendedor_id": "111000222", "kind": "item", "ref": "espada",
        "titulo": "Espada", "moeda": "Lunaris", "lance_minimo": 10, "lance_atual": 0, "vencedor_id": None,
        "canal_id": "1", "mensagem_id": None, "expira_em": datetime.now(timezone.utc), "status": "ativo",
        "modo_posse": "legado",
    }
    base.update(overrides)
    return base


# ── entrega/devolução via _entregar_posse ───────────────────────────────

def test_entregar_posse_bau_sempre_local():
    db = _DB()
    cog = _cog(db)
    leilao = _leilao_base(kind="bau", ref="bau-comum", modo_posse="legado")
    db.leiloes[leilao["id"]] = dict(leilao)

    _rodar(cog._entregar_posse(leilao, "222000333"))

    assert db.baus[("222000333", "bau-comum")] == 1


def test_entregar_posse_item_legado_usa_add_item():
    db = _DB()
    cog = _cog(db)
    leilao = _leilao_base(modo_posse="legado")
    db.leiloes[leilao["id"]] = dict(leilao)

    _rodar(cog._entregar_posse(leilao, "222000333"))

    assert ("add_item", "222000333", "espada", 1) in db.chamadas


def test_entregar_posse_item_cofre_entrega_ao_vencedor():
    db = _DB()
    db.reservas = {"leilao:555000111:1": {"item_id": "espada", "titulo": "Espada", "quantidade": 1, "dono": "111000222"}}
    cog = _cog(db)
    leilao = _leilao_base(modo_posse="cofre")
    db.leiloes[leilao["id"]] = dict(leilao)

    _rodar(cog._entregar_posse(leilao, "222000333"))  # vencedor, != vendedor

    nome, referencia, destino = cog.bot.platform.chamadas[0]
    assert nome == "resolve_vault_reservation"
    assert destino == 222000333
    assert db.cofres["222000333"][0]["item_id"] == "espada"


def test_entregar_posse_item_cofre_devolve_ao_vendedor():
    db = _DB()
    db.reservas = {"leilao:555000111:1": {"item_id": "espada", "titulo": "Espada", "quantidade": 1, "dono": "111000222"}}
    cog = _cog(db)
    leilao = _leilao_base(modo_posse="cofre")
    db.leiloes[leilao["id"]] = dict(leilao)

    _rodar(cog._entregar_posse(leilao, "111000222"))  # == vendedor_id -> devolução

    nome, referencia, destino = cog.bot.platform.chamadas[0]
    assert destino is None  # resolver_reserva devolve ao dono quando destino=None


# ── resolução completa do leilão ─────────────────────────────────────────

def test_resolver_leilao_sem_lances_devolve_ao_vendedor():
    db = _DB()
    db.reservas = {"leilao:555000111:1": {"item_id": "espada", "titulo": "Espada", "quantidade": 1, "dono": "111000222"}}
    cog = _cog(db)
    leilao = _leilao_base(modo_posse="cofre", vencedor_id=None)
    db.leiloes[leilao["id"]] = dict(leilao)

    _rodar(cog._resolver_leilao(leilao))

    assert db.leiloes[1]["status"] == "sem_lances"
    assert db.cofres["111000222"][0]["item_id"] == "espada"


def test_resolver_leilao_sucesso_move_dinheiro_e_entrega_item():
    db = _DB()
    db.reservas = {"leilao:555000111:1": {"item_id": "espada", "titulo": "Espada", "quantidade": 1, "dono": "111000222"}}
    db.saldos[("222000333", "Lunaris")] = 100
    cog = _cog(db)
    leilao = _leilao_base(modo_posse="cofre", vencedor_id="222000333", lance_atual=50)
    db.leiloes[leilao["id"]] = dict(leilao)

    _rodar(cog._resolver_leilao(leilao))

    assert db.leiloes[1]["status"] == "encerrado"
    assert db.get_saldo("g", "222000333", "Lunaris") == 50  # pagou o lance
    assert db.cofres["222000333"][0]["item_id"] == "espada"  # recebeu o item
    assert not any(c[0] == "aviso" and "falhou" in c[2] for c in db.chamadas)


def test_resolver_leilao_pago_mas_entrega_falha_nao_reprocessa_pagamento():
    """O caso degradado: dinheiro já mudou de mãos quando a entrega falha.
    Não pode virar exceção solta (o ciclo reprocessaria e cobraria de novo)
   : precisa encerrar o leilão mesmo assim e avisar."""
    db = _DB()
    db.reservas = {"leilao:555000111:1": {"item_id": "espada", "titulo": "Espada", "quantidade": 1, "dono": "111000222"}}
    db.saldos[("222000333", "Lunaris")] = 100
    cog = _cog(db)
    cog.bot.platform.falhar_resolver = PlatformApiError("fora do ar", status_code=None)
    leilao = _leilao_base(modo_posse="cofre", vencedor_id="222000333", lance_atual=50)
    db.leiloes[leilao["id"]] = dict(leilao)

    _rodar(cog._resolver_leilao(leilao))  # não deve levantar

    assert db.leiloes[1]["status"] == "encerrado"  # não fica "ativo" pra reprocessar
    assert db.get_saldo("g", "222000333", "Lunaris") == 50  # dinheiro não foi devolvido
    assert any(c[0] == "aviso" and "falhou" in c[2] for c in db.chamadas)  # mestre avisado


if __name__ == "__main__":
    import pytest
    raise SystemExit(pytest.main([__file__, "-v"]))
