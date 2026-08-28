"""Regressão: /lavanderia_resgatar chamava db.get_config, que não existe
(o método certo é db.get_cambio) — o comando quebrava com AttributeError
toda vez que alguém tentava resgatar. Nenhum teste chamava o callback de
verdade, então passou despercebido. Roda contra um Postgres real (novo_db)."""

from __future__ import annotations

import asyncio
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE))

from cogs.economia import Economia
from tests.db_utils import novo_db


class _Resposta:
    def __init__(self):
        self.mensagens = []

    async def send_message(self, *args, **kwargs):
        self.mensagens.append((args, kwargs))


def _interacao(guild_id="g-lavanderia", user_id=7):
    return type(
        "Interacao",
        (),
        {
            "guild_id": guild_id,
            "user": type("Usuario", (), {"id": user_id})(),
            "response": _Resposta(),
        },
    )()


def _cog(db):
    cog = object.__new__(Economia)
    cog.bot = type("Bot", (), {"db": db})()
    return cog


def test_lavanderia_resgatar_converte_sem_quebrar():
    db = novo_db()
    sid, uid = "g-lavanderia", "7"
    db.garantir_jogador(sid, uid)
    db.adicionar_lavagem(sid, uid, 100, datetime.now(timezone.utc) - timedelta(hours=1))

    interacao = _interacao(guild_id=sid, user_id=int(uid))
    asyncio.run(Economia.lavanderia_resgatar.callback(_cog(db), interacao))

    # 100 Créditos Sombrios -(1:2, -2% de taxa bancária no câmbio)-> 196 Solares
    # -(-15% do doleiro)-> 166 Solares líquidos
    assert db.get_carteira(sid, uid)["Solares"] == 166
    assert db.get_lavagem(sid, uid) is None
    assert len(interacao.response.mensagens) == 1


def test_lavanderia_resgatar_ainda_nao_pronta_nao_move_saldo():
    db = novo_db()
    sid, uid = "g-lavanderia-2", "8"
    db.garantir_jogador(sid, uid)
    db.adicionar_lavagem(sid, uid, 100, datetime.now(timezone.utc) + timedelta(hours=1))

    interacao = _interacao(guild_id=sid, user_id=int(uid))
    asyncio.run(Economia.lavanderia_resgatar.callback(_cog(db), interacao))

    assert db.get_carteira(sid, uid).get("Solares", 0) == 0
    assert db.get_lavagem(sid, uid) is not None
