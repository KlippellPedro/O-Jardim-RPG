"""/leilao_cancelar: o schema já previa status='cancelado' desde o
lançamento da Casa de Leilão, mas nada escrevia esse valor — quem colocava
um item à venda por engano ficava com ele preso até 72h sem nenhuma saída."""

from __future__ import annotations

import asyncio
import sys
from datetime import datetime, timezone
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE))

from cogs.mercado import Mercado


class _DB:
    def __init__(self, *, leilao=None):
        self.leiloes = {leilao["id"]: dict(leilao)} if leilao else {}
        self.chamadas = []

    def get_leilao(self, leilao_id):
        leilao = self.leiloes.get(leilao_id)
        return dict(leilao) if leilao else None

    def encerrar_leilao(self, leilao_id, status):
        self.leiloes[leilao_id]["status"] = status
        self.chamadas.append(("encerrar_leilao", leilao_id, status))

    def add_item(self, g, u, item_id, titulo, tipo, qtd=1):
        self.chamadas.append(("add_item", u, item_id, qtd))

    def add_bau(self, g, u, ref, qtd=1):
        self.chamadas.append(("add_bau", u, ref, qtd))


class _Resposta:
    def __init__(self):
        self.mensagens = []
        self.deferida = False

    async def send_message(self, texto=None, *, ephemeral=False, **kwargs):
        self.mensagens.append((texto, ephemeral))

    async def defer(self, *, ephemeral=False, **kwargs):
        self.deferida = True


class _Followup:
    def __init__(self):
        self.mensagens = []

    async def send(self, texto=None, *, ephemeral=False, **kwargs):
        self.mensagens.append((texto, ephemeral))


class _Interacao:
    def __init__(self, guild_id, user_id):
        self.guild_id = guild_id
        self.guild = None
        self.user = type("Usuario", (), {"id": user_id})()
        self.response = _Resposta()
        self.followup = _Followup()


class _Catalogo:
    def get(self, item_id):
        return None


def _cog(db):
    bot = type("Bot", (), {"db": db, "platform": None, "inventario": None, "catalogo": _Catalogo()})()
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


def test_leilao_cancelar_devolve_item_e_marca_cancelado():
    leilao = _leilao_base()
    db = _DB(leilao=leilao)
    cog = _cog(db)
    interacao = _Interacao("555000111", "111000222")

    _rodar(Mercado.leilao_cancelar.callback(cog, interacao, 1))

    assert db.leiloes[1]["status"] == "cancelado"
    assert ("add_item", "111000222", "espada", 1) in db.chamadas
    texto, ephemeral = interacao.followup.mensagens[0]
    assert "cancelado" in texto.lower()


def test_leilao_cancelar_bau_devolve_ao_estoque():
    leilao = _leilao_base(kind="bau", ref="bau-comum")
    db = _DB(leilao=leilao)
    cog = _cog(db)
    interacao = _Interacao("555000111", "111000222")

    _rodar(Mercado.leilao_cancelar.callback(cog, interacao, 1))

    assert ("add_bau", "111000222", "bau-comum", 1) in db.chamadas
    assert db.leiloes[1]["status"] == "cancelado"


def test_leilao_cancelar_recusa_quem_nao_e_o_vendedor():
    leilao = _leilao_base()
    db = _DB(leilao=leilao)
    cog = _cog(db)
    interacao = _Interacao("555000111", "999888777")  # não é o vendedor

    _rodar(Mercado.leilao_cancelar.callback(cog, interacao, 1))

    assert db.leiloes[1]["status"] == "ativo"
    assert not db.chamadas
    texto, ephemeral = interacao.response.mensagens[0]
    assert ephemeral is True


def test_leilao_cancelar_recusa_se_ja_tem_lance():
    leilao = _leilao_base(lance_atual=50, vencedor_id="333444555")
    db = _DB(leilao=leilao)
    cog = _cog(db)
    interacao = _Interacao("555000111", "111000222")

    _rodar(Mercado.leilao_cancelar.callback(cog, interacao, 1))

    assert db.leiloes[1]["status"] == "ativo"
    assert not db.chamadas


def test_leilao_cancelar_recusa_leilao_ja_encerrado():
    leilao = _leilao_base(status="encerrado")
    db = _DB(leilao=leilao)
    cog = _cog(db)
    interacao = _Interacao("555000111", "111000222")

    _rodar(Mercado.leilao_cancelar.callback(cog, interacao, 1))

    assert not db.chamadas


def test_leilao_cancelar_leilao_inexistente_avisa():
    db = _DB()
    cog = _cog(db)
    interacao = _Interacao("555000111", "111000222")

    _rodar(Mercado.leilao_cancelar.callback(cog, interacao, 999))

    texto, ephemeral = interacao.response.mensagens[0]
    assert "não achei" in texto.lower()


if __name__ == "__main__":
    import pytest

    raise SystemExit(pytest.main([__file__, "-v"]))
