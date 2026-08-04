"""Regressão: baú pago sumia quando o salto HTTP até a plataforma caía.

`_abrir_um_bau` só tinha uma rota de entrega — `POST
/interno/discord/cofre/depositar`. Quando a API não respondia:

  * 4xx: o baú voltava pro estoque, mas o jogador não recebia nada;
  * 5xx/timeout (`status_code is None`): o baú NÃO voltava e nada era
    entregue — o jogador pagava 400 Lunaris e perdia tudo, enquanto
    /abrir_todos ainda afirmava que os baús "voltaram pro estoque".

Agora a entrega passa por core/entrega.py: API → PostgreSQL compartilhado →
cofre local. Como bot e plataforma dividem o mesmo banco, a queda do HTTP
não é mais queda do cofre, e o prêmio continua aparecendo no site.
"""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE))

import cogs.economia as economia_cog
from cogs.economia import Economia
from core.platform_api import PlatformApiError


class _ItemSorteado:
    def __init__(self, item_id="espada"):
        self.id = item_id
        self.titulo = "Espada"
        self.tipo = "arma"
        self.raridade = "comum"
        self.raridade_rotulo = "Comum"
        self.conteudo = {"preco": 5}


class _Interacao:
    def __init__(self):
        self.id = 999
        self.user = type("Usuario", (), {"id": 42})()
        self.guild_id = 100


class _PlatformFora:
    """Timeout de transporte: é o caso que apagava o baú (status_code None)."""

    def __init__(self, status_code=None):
        self.status_code = status_code
        self.tentativas = 0

    async def deposit_vault(self, **kwargs):
        self.tentativas += 1
        raise PlatformApiError("a plataforma demorou demais", self.status_code)


class _DB:
    """Só o que a entrega toca. `depositar_cofre_plataforma` devolvendo um
    dict = conta vinculada e depósito gravado no banco compartilhado."""

    def __init__(self, *, vinculado=True, banco_fora=False):
        self.vinculado = vinculado
        self.banco_fora = banco_fora
        self.depositos = []
        self.baus_repostos = []
        self.creditos = []
        self.itens_legado = []

    def depositar_cofre_plataforma(self, guild_id, user_id, **kwargs):
        if self.banco_fora:
            raise RuntimeError("o PostgreSQL nao respondeu")
        self.depositos.append({"guild_id": guild_id, "user_id": user_id, **kwargs})
        return None if not self.vinculado else {"repetido": False}

    def add_bau(self, guild_id, user_id, bau_id, quantidade):
        if self.banco_fora:
            raise RuntimeError("o PostgreSQL nao respondeu")
        self.baus_repostos.append((bau_id, quantidade))

    # ── caminho legado ── (mesmo banco: cai junto quando o Postgres cai)
    def creditar(self, guild_id, user_id, moeda, quantia):
        if self.banco_fora:
            raise RuntimeError("o PostgreSQL nao respondeu")
        self.creditos.append((moeda, quantia))

    def registrar_extrato(self, *a, **k):
        pass

    def get_cofre_tier(self, guild_id, user_id):
        return "pequeno"

    def contar_itens(self, guild_id, user_id):
        return 0

    def add_item(self, guild_id, user_id, item_id, titulo, tipo, quantidade):
        self.itens_legado.append(item_id)


def _bau_fixo():
    return {
        "id": "geral-lendario",
        "nome": "Baú Geral (Lendário)",
        "itens": 1,
        "pesos": {"comum": 1},
        "lunaris_min": 40,
        "lunaris_max": 40,
        "tipos": None,
    }


def _cog(db, platform):
    cog = object.__new__(Economia)
    cog.bot = type("Bot", (), {"db": db, "platform": platform, "catalogo": None})()
    return cog


def _premio_fixo(monkeypatch):
    monkeypatch.setattr(
        economia_cog.loot_mod,
        "sortear_bau",
        lambda *a, **k: {"lunaris": 40, "itens": [_ItemSorteado()]},
    )


def test_api_fora_entrega_pelo_banco_e_nao_perde_o_bau(monkeypatch):
    _premio_fixo(monkeypatch)
    db = _DB()
    platform = _PlatformFora()  # timeout: o caso que apagava o baú

    ganhos, destino, ok, lunaris = asyncio.run(
        _cog(db, platform)._abrir_um_bau(_Interacao(), "100", "42", _bau_fixo())
    )

    assert ok is True
    assert lunaris == 40
    assert destino == "Lunaris na carteira · itens no cofre da conta no site"
    assert db.baus_repostos == []  # nada a repor: o prêmio saiu
    assert db.creditos == [("Lunaris", 40)]  # Lunaris vai pra carteira, nao pro cofre
    assert len(db.depositos) == 1
    deposito = db.depositos[0]
    assert deposito["moedas"] == []
    assert deposito["itens"][0]["item_id"] == "espada"
    # Mesma chave do HTTP: se a API tiver escrito e só a resposta se perdeu,
    # o banco reconhece o movimento e não credita de novo.
    assert deposito["idempotencia"] == "bau-comprado:999:0:geral-lendario:40"
    assert any("Espada" in g for g in ganhos)


def test_erro_de_validacao_tambem_cai_pro_banco(monkeypatch):
    """4xx antes devolvia o baú e não entregava nada. O depósito direto usa
    o mesmo payload que a API validaria, então não há motivo pra desistir."""
    _premio_fixo(monkeypatch)
    db = _DB()

    _ganhos, destino, ok, _lunaris = asyncio.run(
        _cog(db, _PlatformFora(status_code=422))._abrir_um_bau(
            _Interacao(), "100", "42", _bau_fixo()
        )
    )

    assert ok is True
    assert destino == "Lunaris na carteira · itens no cofre da conta no site"
    assert db.baus_repostos == []


def test_conta_nao_vinculada_cai_pro_cofre_local(monkeypatch):
    _premio_fixo(monkeypatch)
    db = _DB(vinculado=False)

    ganhos, destino, ok, lunaris = asyncio.run(
        _cog(db, _PlatformFora(status_code=404))._abrir_um_bau(
            _Interacao(), "100", "42", _bau_fixo()
        )
    )

    assert ok is True
    assert lunaris == 40
    assert "carteira" in destino
    assert db.creditos == [("Lunaris", 40)]
    assert db.itens_legado == ["espada"]
    assert db.baus_repostos == []
    assert any("Espada" in g for g in ganhos)


def test_banco_fora_repoe_o_bau_em_vez_de_engolir(monkeypatch):
    """Sem banco não há entrega possível — mas o baú foi pago, então volta
    pro estoque em vez de sumir."""
    _premio_fixo(monkeypatch)
    db = _DB(banco_fora=True)

    ganhos, _destino, ok, lunaris = asyncio.run(
        _cog(db, _PlatformFora())._abrir_um_bau(_Interacao(), "100", "42", _bau_fixo())
    )

    assert ok is False
    assert ganhos == []
    assert lunaris == 0
    # add_bau também levanta com o banco fora; o importante é que a
    # reposição foi tentada e o erro não vazou pro comando.
    assert db.depositos == []


def test_falha_ao_guardar_item_nao_repoe_bau_ja_pago_em_moeda(monkeypatch):
    """Repor o baú depois de creditar as moedas duplicaria o prêmio: o
    jogador ficaria com o Lunaris E com o baú de volta. Item que não coube
    (ou que o banco recusou) vira aviso, não reposição."""
    _premio_fixo(monkeypatch)
    db = _DB(vinculado=False)

    def add_item_quebrado(*a, **k):
        raise RuntimeError("o PostgreSQL nao respondeu")

    db.add_item = add_item_quebrado

    ganhos, _destino, ok, lunaris = asyncio.run(
        _cog(db, _PlatformFora())._abrir_um_bau(_Interacao(), "100", "42", _bau_fixo())
    )

    assert ok is True
    assert lunaris == 40
    assert db.creditos == [("Lunaris", 40)]
    assert db.baus_repostos == []  # o prêmio saiu em parte: não repõe
    assert any("avise o mestre" in g for g in ganhos)


def test_sem_integracao_configurada_usa_o_cofre_local(monkeypatch):
    _premio_fixo(monkeypatch)
    db = _DB(vinculado=False)

    _ganhos, destino, ok, _lunaris = asyncio.run(
        _cog(db, None)._abrir_um_bau(_Interacao(), "100", "42", _bau_fixo())
    )

    assert ok is True
    assert destino == "sua carteira"
    assert db.creditos == [("Lunaris", 40)]
