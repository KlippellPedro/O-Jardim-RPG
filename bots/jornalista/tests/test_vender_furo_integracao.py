"""Regressão: /vender_furo chamava db.adicionar_fofoca(..., suborno=...), que
não existia (faltava o método inteiro no Database do Jornalista, e a chamada
usava um nome de parâmetro e uma assinatura erradas). Toda vez que o "furo"
saía bom (30% de chance), o comando quebrava com AttributeError depois de já
ter creditado os Solares — o jogador recebia o dinheiro mas via um erro
genérico, e nenhuma fofoca era criada. Roda contra um Postgres real
(novo_db), já que nenhum teste chamava o callback de verdade."""

from __future__ import annotations

import asyncio
import random
import sys
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE))

import discord

from cogs.jornal import Jornal
from tests.db_utils import novo_db


class _Resposta:
    def __init__(self):
        self.mensagens = []

    async def send_message(self, *args, **kwargs):
        self.mensagens.append((args, kwargs))


def _interacao(guild_id, user_id):
    return type(
        "Interacao",
        (),
        {
            "guild_id": guild_id,
            "user": type("Usuario", (), {"id": user_id})(),
            "response": _Resposta(),
        },
    )()


class _Vitima:
    """Alvo do furo: guarda as DMs recebidas; `dm_fechada` simula DMs bloqueadas."""

    def __init__(self, jid, dm_fechada=False):
        self.id = jid
        self.mention = f"<@{jid}>"
        self.bot = False
        self.dms = []
        self._dm_fechada = dm_fechada

    async def send(self, texto):
        if self._dm_fechada:
            raise discord.Forbidden(type("R", (), {"status": 403, "reason": "x"})(), "DM fechada")
        self.dms.append(texto)


def _jogador(jid, dm_fechada=False):
    return _Vitima(jid, dm_fechada)


class _DBComAutomacao:
    """Envolve o banco real e permite desligar uma automação."""

    def __init__(self, db, desligadas=()):
        self._db = db
        self._desligadas = set(desligadas)

    def automacao_ativa(self, guild_id, tipo, padrao=True):
        return tipo not in self._desligadas

    def __getattr__(self, nome):
        return getattr(self._db, nome)


def _cog(db, desligadas=()):
    cog = object.__new__(Jornal)
    cog.bot = type("Bot", (), {"db": _DBComAutomacao(db, desligadas)})()
    return cog


def test_vender_furo_bom_credita_em_lunaris_registra_fofoca_e_avisa_a_vitima(monkeypatch):
    monkeypatch.setattr(random, "random", lambda: 0.1)  # força o "furo bom" (< 0.30)
    monkeypatch.setattr(random, "randint", lambda a, b: 30)

    db = novo_db()
    sid, uid, alvo = "g-furo", "1", "2"
    db.garantir_jogador(sid, uid)
    inicial = db.creditar(sid, uid, "Lunaris", 0)

    interacao = _interacao(sid, int(uid))
    vitima = _jogador(int(alvo))
    asyncio.run(Jornal.vender_furo.callback(_cog(db), interacao, vitima))

    # Lunaris, não Solares: um Solar vale 100 Lunaris e o furo pagava 5.000+.
    assert db.creditar(sid, uid, "Lunaris", 0) == inicial + 30
    assert db.creditar(sid, uid, "Solares", 0) == 0
    fofoca = db.get_fofoca_pendente_usuario(sid, alvo)
    assert fofoca is not None
    assert fofoca["suborno_valor"] == 60
    assert len(interacao.response.mensagens) == 1
    # A vítima recebe o aviso (sem isso nunca sabia da janela de suborno).
    assert len(vitima.dms) == 1
    assert "/subornar_jornalista" in vitima.dms[0]
    assert "60" in vitima.dms[0]
    assert uid not in vitima.dms[0]


def test_vender_furo_nao_quebra_com_dm_da_vitima_fechada(monkeypatch):
    monkeypatch.setattr(random, "random", lambda: 0.1)
    monkeypatch.setattr(random, "randint", lambda a, b: 20)

    db = novo_db()
    db.garantir_jogador("g-dm", "1")
    interacao = _interacao("g-dm", 1)
    asyncio.run(Jornal.vender_furo.callback(_cog(db), interacao, _jogador(2, dm_fechada=True)))

    assert db.get_fofoca_pendente_usuario("g-dm", "2") is not None
    assert len(interacao.response.mensagens) == 1


def test_vender_furo_respeita_o_interruptor_de_fofocas(monkeypatch):
    monkeypatch.setattr(random, "random", lambda: 0.1)
    db = novo_db()
    db.garantir_jogador("g-off", "1")
    inicial = db.creditar("g-off", "1", "Lunaris", 0)
    interacao = _interacao("g-off", 1)
    asyncio.run(
        Jornal.vender_furo.callback(_cog(db, desligadas={"fofocas"}), interacao, _jogador(2))
    )
    assert db.creditar("g-off", "1", "Lunaris", 0) == inicial
    assert db.get_fofoca_pendente_usuario("g-off", "2") is None
    assert "não está comprando" in interacao.response.mensagens[0][0][0]


def test_recompensa_do_furo_na_escala_do_bot():
    from core import db as db_mod

    # Carteira inicial de 20 Lunaris e baú comum de 5 a 40: o furo precisa
    # caber nessa escala (e nunca em Solares, que valem 100 Lunaris).
    assert db_mod.FURO_RECOMPENSA_MAX <= 50
    assert db_mod.FURO_RECOMPENSA_MIN >= 1
