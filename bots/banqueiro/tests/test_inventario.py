"""Fachada Inventario: decide cofre-da-plataforma vs tabela `inventario`
local e mapeia erros da plataforma pra exceções tipadas.

Regra que estes testes travam: ENTRADA (`dar`) pode cair pro legado em
qualquer falha; SAÍDA (`tirar`/`mover`/`reservar`) nunca cai: ela levanta
`CofreIndisponivel` e aborta, porque cair pro legado ali significaria afirmar
posse a partir de um estoque que já se sabe desatualizado.
"""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

import pytest

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE))

from core.inventario import (
    CofreCheio,
    CofreIndisponivel,
    Inventario,
    ItemIndisponivel,
    Movimento,
)
from core.platform_api import PlatformApiError


class _DB:
    def __init__(self, *, par=None, cofre_tier="comum", inventario_legado=None):
        self.par = par
        self.cofre_tier = cofre_tier
        self.inventario_legado = list(inventario_legado or [])
        self.chamadas = []

    def par_cofre_plataforma(self, guild_id, user_id):
        return self.par

    def get_cofre_tier(self, guild_id, user_id):
        return self.cofre_tier

    def listar_inventario(self, guild_id, user_id):
        return list(self.inventario_legado)

    def contar_itens(self, guild_id, user_id):
        return sum(item["quantidade"] for item in self.inventario_legado)

    def listar_cofre_plataforma(self, guild_id, user_id):
        return list(self.inventario_legado)

    def contar_cofre_plataforma(self, guild_id, user_id):
        return sum(item["quantidade"] for item in self.inventario_legado)

    def add_item(self, guild_id, user_id, item_id, titulo, tipo, qtd=1):
        self.chamadas.append(("add_item", guild_id, user_id, item_id, titulo, tipo, qtd))

    def remover_item(self, guild_id, user_id, item_id, qtd=1):
        self.chamadas.append(("remover_item", guild_id, user_id, item_id, qtd))
        for item in self.inventario_legado:
            if item["item_id"] == item_id and item["quantidade"] >= qtd:
                return True
        return False


class _Platform:
    def __init__(self):
        self.chamadas = []
        self.proxima_excecao = None
        self.proximo_resultado = None

    def _consumir(self, nome, kwargs):
        self.chamadas.append((nome, kwargs))
        if self.proxima_excecao:
            raise self.proxima_excecao
        return self.proximo_resultado or {}

    async def deposit_vault(self, **kwargs):
        return self._consumir("deposit_vault", kwargs)

    async def withdraw_vault(self, **kwargs):
        return self._consumir("withdraw_vault", kwargs)

    async def transfer_vault(self, **kwargs):
        return self._consumir("transfer_vault", kwargs)

    async def reserve_vault(self, **kwargs):
        return self._consumir("reserve_vault", kwargs)

    async def resolve_vault_reservation(self, **kwargs):
        return self._consumir("resolve_vault_reservation", kwargs)


def _bot(*, platform=None, db=None):
    return type("Bot", (), {"platform": platform, "db": db or _DB()})()


def _rodar(coro):
    return asyncio.run(coro)


# ── modo ─────────────────────────────────────────────────────────────────

def test_modo_e_legado_sem_integracao_configurada():
    inv = Inventario(_bot(platform=None, db=_DB(par={"usuario_id": "u", "campanha_id": "c"})))
    assert inv.modo("555000111", "777000222") == "legado"


def test_modo_e_legado_quando_discord_nao_vinculado():
    inv = Inventario(_bot(platform=_Platform(), db=_DB(par=None)))
    assert inv.modo("555000111", "777000222") == "legado"


def test_modo_e_cofre_quando_vinculado_e_integracao_ligada():
    inv = Inventario(_bot(platform=_Platform(), db=_DB(par={"usuario_id": "u", "campanha_id": "c"})))
    assert inv.modo("555000111", "777000222") == "cofre"


# ── dar (entrada: pode cair pro legado) ────────────────────────────────

def test_dar_em_modo_legado_grava_direto_no_inventario_local():
    db = _DB(par=None)
    inv = Inventario(_bot(platform=_Platform(), db=db))

    resultado = _rodar(inv.dar("555000111", "777000222", "espada", "Espada", "arma", 2, motivo="teste", chave="chave-0001"))

    assert resultado == "legado"
    assert ("add_item", "555000111", "777000222", "espada", "Espada", "arma", 2) in db.chamadas


def test_dar_em_modo_cofre_deposita_na_plataforma():
    plataforma = _Platform()
    plataforma.proximo_resultado = {"repetido": False}
    db = _DB(par={"usuario_id": "u", "campanha_id": "c"})
    inv = Inventario(_bot(platform=plataforma, db=db))

    resultado = _rodar(inv.dar("555000111", "777000222", "espada", "Espada", "arma", 1, motivo="teste", chave="chave-0001"))

    assert resultado == "cofre"
    nome, kwargs = plataforma.chamadas[0]
    assert nome == "deposit_vault"
    assert kwargs["idempotency_key"] == "chave-0001"
    assert kwargs["items"][0]["item_id"] == "espada"
    assert db.chamadas == []  # não escreveu no legado


def test_dar_cai_pro_legado_em_qualquer_falha_da_plataforma():
    """Igual ao padrão já estabelecido no Jornalista (baus.py): recompensa
    nunca fica refém da plataforma: não importa o motivo do erro."""
    plataforma = _Platform()
    plataforma.proxima_excecao = PlatformApiError("fora do ar", status_code=503)
    db = _DB(par={"usuario_id": "u", "campanha_id": "c"})
    inv = Inventario(_bot(platform=plataforma, db=db))

    resultado = _rodar(inv.dar("555000111", "777000222", "espada", "Espada", "arma", 1, motivo="teste", chave="chave-0001"))

    assert resultado == "legado"
    assert ("add_item", "555000111", "777000222", "espada", "Espada", "arma", 1) in db.chamadas


# ── tirar (saída: nunca cai pro legado) ────────────────────────────────

def test_tirar_em_modo_legado_usa_a_tabela_local():
    db = _DB(par=None, inventario_legado=[{"item_id": "faca", "titulo": "Faca", "tipo": "arma", "quantidade": 3}])
    inv = Inventario(_bot(platform=_Platform(), db=db))

    item = _rodar(inv.tirar("555000111", "777000222", "faca", 2, motivo="venda", chave="chave-0001"))

    assert item.item_id == "faca"
    assert item.quantidade == 2
    assert ("remover_item", "555000111", "777000222", "faca", 2) in db.chamadas


def test_tirar_em_modo_legado_sem_quantidade_levanta_item_indisponivel():
    db = _DB(par=None, inventario_legado=[])
    inv = Inventario(_bot(platform=_Platform(), db=db))

    with pytest.raises(ItemIndisponivel):
        _rodar(inv.tirar("555000111", "777000222", "faca", 1, motivo="venda", chave="chave-0001"))


def test_tirar_em_modo_cofre_chama_withdraw_vault():
    plataforma = _Platform()
    plataforma.proximo_resultado = {
        "repetido": False,
        "itens": [{"item_id": "faca", "titulo": "Faca", "quantidade": 1, "dados": {"tipo": "arma"}}],
    }
    db = _DB(par={"usuario_id": "u", "campanha_id": "c"})
    inv = Inventario(_bot(platform=plataforma, db=db))

    item = _rodar(inv.tirar("555000111", "777000222", "faca", 1, motivo="venda", chave="chave-0001"))

    assert item.titulo == "Faca"
    assert item.tipo == "arma"
    nome, kwargs = plataforma.chamadas[0]
    assert nome == "withdraw_vault"
    assert kwargs["items"] == [{"item_id": "faca", "quantidade": 1}]


def test_tirar_sem_quantidade_na_plataforma_levanta_item_indisponivel_sem_tocar_legado():
    plataforma = _Platform()
    plataforma.proxima_excecao = PlatformApiError("sem quantidade", status_code=409, code="quantidade_indisponivel")
    db = _DB(par={"usuario_id": "u", "campanha_id": "c"})
    inv = Inventario(_bot(platform=plataforma, db=db))

    with pytest.raises(ItemIndisponivel):
        _rodar(inv.tirar("555000111", "777000222", "faca", 1, motivo="venda", chave="chave-0001"))
    assert db.chamadas == []  # nao tentou o legado


def test_tirar_com_plataforma_fora_do_ar_levanta_cofre_indisponivel_nao_cai_pro_legado():
    """O caso crítico: diferente de dar(), uma falha aqui NÃO pode virar um
    remover_item() no legado: a tabela local pode estar desatualizada."""
    plataforma = _Platform()
    plataforma.proxima_excecao = PlatformApiError("timeout", status_code=None)
    db = _DB(par={"usuario_id": "u", "campanha_id": "c"})
    inv = Inventario(_bot(platform=plataforma, db=db))

    with pytest.raises(CofreIndisponivel):
        _rodar(inv.tirar("555000111", "777000222", "faca", 1, motivo="venda", chave="chave-0001"))
    assert db.chamadas == []


# ── mover (troca/oferta) ────────────────────────────────────────────────

def test_mover_em_modo_legado_levanta_cofre_indisponivel():
    db = _DB(par=None)
    inv = Inventario(_bot(platform=_Platform(), db=db))
    movimento = Movimento(de_user_id="1", para_user_id="2", item_id="x", quantidade=1)

    with pytest.raises(CofreIndisponivel):
        _rodar(inv.mover("555000111", [movimento], motivo="troca", chave="chave-0001"))


def test_mover_bidirecional_envia_os_dois_movimentos_para_transferir():
    plataforma = _Platform()
    plataforma.proximo_resultado = {"repetido": False}
    db = _DB(par={"usuario_id": "u", "campanha_id": "c"})
    inv = Inventario(_bot(platform=plataforma, db=db))
    movimentos = [
        Movimento(de_user_id="1", para_user_id="2", item_id="orbe", quantidade=1),
        Movimento(de_user_id="2", para_user_id="1", item_id="adaga", quantidade=1),
    ]

    _rodar(inv.mover("555000111", movimentos, motivo="troca", chave="chave-0001", respeitar_capacidade=False))

    nome, kwargs = plataforma.chamadas[0]
    assert nome == "transfer_vault"
    assert len(kwargs["moves"]) == 2
    assert kwargs["respect_capacity"] is False


def test_mover_cofre_cheio_levanta_cofre_cheio():
    plataforma = _Platform()
    plataforma.proxima_excecao = PlatformApiError("cheio", status_code=409, code="cofre_cheio")
    db = _DB(par={"usuario_id": "u", "campanha_id": "c"})
    inv = Inventario(_bot(platform=plataforma, db=db))
    movimento = Movimento(de_user_id="1", para_user_id="2", item_id="x", quantidade=1)

    with pytest.raises(CofreCheio):
        _rodar(inv.mover("555000111", [movimento], motivo="troca", chave="chave-0001"))


# ── reservar / resolver_reserva (escrow do leilão) ──────────────────────

def test_reservar_em_modo_legado_levanta_cofre_indisponivel():
    db = _DB(par=None)
    inv = Inventario(_bot(platform=_Platform(), db=db))

    with pytest.raises(CofreIndisponivel):
        _rodar(inv.reservar(
            "555000111", "777000222", "coroa", 1, origem="banqueiro", referencia="leilao:1",
            motivo="leilao", expira_em="2026-01-01T00:00:00Z",
        ))


def test_reservar_em_modo_cofre_chama_reserve_vault():
    plataforma = _Platform()
    plataforma.proximo_resultado = {
        "reserva_id": "r1", "referencia": "leilao:1", "item_id": "coroa",
        "titulo": "Coroa", "quantidade": 1, "repetido": False,
    }
    db = _DB(par={"usuario_id": "u", "campanha_id": "c"})
    inv = Inventario(_bot(platform=plataforma, db=db))

    item = _rodar(inv.reservar(
        "555000111", "777000222", "coroa", 1, origem="banqueiro", referencia="leilao:1",
        motivo="leilao", expira_em="2026-01-01T00:00:00Z",
    ))

    assert item.item_id == "coroa"
    nome, kwargs = plataforma.chamadas[0]
    assert nome == "reserve_vault"
    assert kwargs["reference"] == "leilao:1"


def test_resolver_reserva_entrega_ao_destino_informado():
    plataforma = _Platform()
    plataforma.proximo_resultado = {"status": "entregue", "repetido": False}
    inv = Inventario(_bot(platform=plataforma, db=_DB()))

    status = _rodar(inv.resolver_reserva("555000111", origem="banqueiro", referencia="leilao:1", destino_user_id="99"))

    assert status == "entregue"
    nome, kwargs = plataforma.chamadas[0]
    assert kwargs["destination_discord_user_id"] == 99


def test_resolver_reserva_sem_destino_devolve_status_devolvida():
    plataforma = _Platform()
    plataforma.proximo_resultado = {"status": "devolvida", "repetido": False}
    inv = Inventario(_bot(platform=plataforma, db=_DB()))

    status = _rodar(inv.resolver_reserva("555000111", origem="banqueiro", referencia="leilao:1"))

    assert status == "devolvida"
    nome, kwargs = plataforma.chamadas[0]
    assert kwargs["destination_discord_user_id"] is None


def test_resolver_reserva_com_falha_da_plataforma_levanta_cofre_indisponivel():
    plataforma = _Platform()
    plataforma.proxima_excecao = PlatformApiError("fora do ar", status_code=503)
    inv = Inventario(_bot(platform=plataforma, db=_DB()))

    with pytest.raises(CofreIndisponivel):
        _rodar(inv.resolver_reserva("555000111", origem="banqueiro", referencia="leilao:1"))


# ── capacidade ───────────────────────────────────────────────────────────

def test_capacidade_le_o_tier_do_cofre_do_jogador():
    db = _DB(cofre_tier="dourado")
    inv = Inventario(_bot(platform=None, db=db))

    capacidade = _rodar(inv.capacidade("555000111", "777000222"))

    assert capacidade == 40  # tier dourado, core/economia.py::COFRE_TIERS


def test_cabe_compara_total_atual_com_a_capacidade():
    db = _DB(
        par={"usuario_id": "u", "campanha_id": "c"},
        cofre_tier="comum",
        inventario_legado=[{"item_id": f"item-{i}", "titulo": "X", "tipo": "item", "quantidade": 1} for i in range(9)],
    )
    inv = Inventario(_bot(platform=_Platform(), db=db))

    assert _rodar(inv.cabe("555000111", "777000222", 1)) is True   # 9 + 1 = 10, capacidade do tier comum
    assert _rodar(inv.cabe("555000111", "777000222", 2)) is False  # 9 + 2 = 11 > 10
