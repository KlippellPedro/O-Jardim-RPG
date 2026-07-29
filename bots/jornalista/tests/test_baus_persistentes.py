"""Baús sobrevivem a um reinício do bot antes do primeiro clique: o prêmio
(e o enigma, se trancado) fica persistido em `baus_no_ar` desde o instante
em que a mensagem é enviada, não só na memória de uma View. Cobre:
- `_dropar` grava o estado com um token (não o mensagem_id, que só existe
  depois de enviar) e o botão carrega esse token no custom_id;
- os DynamicItem reconstroem o botão certo a partir do custom_id (mesmo
  padrão usado pelo discord.py pra sobreviver a reinício);
- o ciclo de expiração fecha o baú quando ninguém reivindicou a tempo, e
  não pisa numa entrega que já foi confirmada."""

from __future__ import annotations

import asyncio
import re
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE))

import cogs.baus as baus_mod
from cogs.baus import Baus, BauAbrirButton, BauEnigmaResponderButton
from core import enigmas as enigmas_mod


class _Mensagem:
    def __init__(self, id):
        self.id = id


class _Canal:
    id = 777

    def __init__(self):
        self.enviados = []

    async def send(self, **kwargs):
        self.enviados.append(kwargs)
        return _Mensagem(999)


class _Catalogo:
    def listar(self):
        return []


class _DB:
    def __init__(self):
        self.baus_no_ar = {}

    def get_estacao(self, guild_id):
        return "primavera"

    def get_bau_canal_tema(self, guild_id, canal_id):
        return None

    def criar_bau_no_ar(self, token, guild_id, canal_id, mensagem_id, premio, expira_em, enigma=None):
        self.baus_no_ar[token] = {
            "token": token, "guild_id": guild_id, "canal_id": canal_id, "mensagem_id": mensagem_id,
            "premio": premio, "expira_em": expira_em,
            "enigma_pergunta": enigma.pergunta if enigma else None,
            "enigma_respostas": list(enigma.respostas) if enigma else None,
        }

    def get_bau_no_ar(self, token):
        return dict(self.baus_no_ar[token]) if token in self.baus_no_ar else None

    def remover_bau_no_ar(self, token):
        self.baus_no_ar.pop(token, None)

    def listar_baus_no_ar_expirados(self, agora):
        return [dict(row) for row in self.baus_no_ar.values() if row["expira_em"] <= agora]

    def get_bau_entrega(self, guild_id, mensagem_id):
        return None


def _cog(db):
    cog = object.__new__(Baus)
    cog.bot = type("Bot", (), {"db": db, "catalogo": _Catalogo(), "add_dynamic_items": lambda *a: None})()
    cog._sortear_canal_valido = lambda guild_id, canal_forcado=None: _Canal()
    return cog


def _rodar(coro):
    return asyncio.run(coro)


# ── _dropar persiste o estado antes de qualquer clique ──────────────────────

def test_dropar_persiste_bau_normal_com_token_no_custom_id(monkeypatch):
    monkeypatch.setattr(baus_mod.random, "random", lambda: 0.99)  # nunca sorteia enigma
    db = _DB()
    cog = _cog(db)

    canal = _rodar(cog._dropar({"guild_id": "100", "itens_por_bau": 1}))

    assert canal is not None
    assert len(db.baus_no_ar) == 1
    token, row = next(iter(db.baus_no_ar.items()))
    assert row["mensagem_id"] == "999"
    assert row["enigma_pergunta"] is None

    view = canal.enviados[0]["view"]
    button = view.children[0]
    assert button.custom_id == f"bau_abrir:{token}"
    assert re.match(BauAbrirButton.__discord_ui_compiled_template__, button.custom_id)


def test_dropar_bau_trancado_persiste_enigma(monkeypatch):
    monkeypatch.setattr(baus_mod.random, "random", lambda: 0.0)  # sempre sorteia enigma
    db = _DB()
    cog = _cog(db)

    canal = _rodar(cog._dropar({"guild_id": "100", "itens_por_bau": 1}))

    token, row = next(iter(db.baus_no_ar.items()))
    assert row["enigma_pergunta"]
    assert row["enigma_respostas"]

    view = canal.enviados[0]["view"]
    button = view.children[0]
    assert button.custom_id == f"bau_enigma:{token}"
    assert re.match(BauEnigmaResponderButton.__discord_ui_compiled_template__, button.custom_id)


# ── expiração ────────────────────────────────────────────────────────────

def test_expirar_bau_no_ar_remove_a_linha_e_nao_quebra_sem_guild():
    db = _DB()
    token = "tok1"
    db.baus_no_ar[token] = {
        "token": token, "guild_id": "100", "canal_id": "777", "mensagem_id": "999",
        "premio": {"lunaris": 5, "itens": []}, "enigma_pergunta": None,
        "expira_em": datetime.now(timezone.utc) - timedelta(hours=1),
    }
    cog = _cog(db)
    cog.bot.get_guild = lambda gid: None  # guild não está mais no cache: não deve quebrar

    _rodar(cog._expirar_bau_no_ar(dict(db.baus_no_ar[token])))

    assert token not in db.baus_no_ar


def test_expirar_bau_ja_reivindicado_nao_reescreve_a_mensagem():
    """Se a linha de controle sobreviveu por algum motivo depois de o baú já
    ter sido reivindicado (baus_entregas tem registro), o ciclo de expiração
    não pode sobrescrever o embed de sucesso com "baú desapareceu"."""
    db = _DB()
    token = "tok2"
    db.baus_no_ar[token] = {
        "token": token, "guild_id": "100", "canal_id": "777", "mensagem_id": "999",
        "premio": {"lunaris": 5, "itens": []}, "enigma_pergunta": None,
        "expira_em": datetime.now(timezone.utc) - timedelta(hours=1),
    }
    db.get_bau_entrega = lambda guild_id, mensagem_id: {"status": "entregue"}
    chamou_get_guild = []
    cog = _cog(db)
    cog.bot.get_guild = lambda gid: chamou_get_guild.append(gid) or None

    _rodar(cog._expirar_bau_no_ar(dict(db.baus_no_ar[token])))

    assert token not in db.baus_no_ar
    assert not chamou_get_guild  # nem chegou a tentar editar a mensagem


if __name__ == "__main__":
    import pytest

    raise SystemExit(pytest.main([__file__, "-v"]))
