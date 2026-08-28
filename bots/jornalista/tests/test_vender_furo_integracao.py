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


def _jogador(jid):
    return type("Membro", (), {"id": jid, "mention": f"<@{jid}>"})()


def _cog(db):
    cog = object.__new__(Jornal)
    cog.bot = type("Bot", (), {"db": db})()
    return cog


def test_vender_furo_bom_credita_e_registra_fofoca_sem_quebrar(monkeypatch):
    monkeypatch.setattr(random, "random", lambda: 0.1)  # força o "furo bom" (< 0.30)
    monkeypatch.setattr(random, "randint", lambda a, b: 100)

    db = novo_db()
    sid, uid, alvo = "g-furo", "1", "2"
    db.garantir_jogador(sid, uid)

    interacao = _interacao(sid, int(uid))
    asyncio.run(Jornal.vender_furo.callback(_cog(db), interacao, _jogador(int(alvo))))

    assert db.creditar(sid, uid, "Solares", 0) == 100  # creditar(0) só lê o saldo atual
    fofoca = db.get_fofoca_pendente_usuario(sid, alvo)
    assert fofoca is not None
    assert fofoca["suborno_valor"] == 200
    assert len(interacao.response.mensagens) == 1
