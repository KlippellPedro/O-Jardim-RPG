"""P6 da auditoria 2026-08: quando `db.remover_bau` retorna False no meio de
`/abrir_todos` (o estoque mudou entre a listagem e a abertura — corrida com
outro `/abrir_todos`/`/abrir_bau`), o loop interno só dava `break` sem marcar
`interrompeu=True`. O jogador via "abriu N baús" sem nenhum aviso de que o
resto daquele tipo não foi processado. Só o caminho separado (`_abrir_um_bau`
falhando com o banco fora do ar) avisava.

Este teste cobre o fluxo completo do comando (não só `_abrir_um_bau` isolado,
que já tem cobertura em test_bau_entrega_fallback.py e
test_baus_idempotencia.py): dois baús do mesmo tipo em estoque, o primeiro
abre normalmente, o segundo tropeça numa "corrida" simulada em
`remover_bau`, e a mensagem final precisa avisar sobre a interrupção."""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE))

import cogs.economia as economia_cog
from cogs.economia import Economia


class _ItemSorteado:
    def __init__(self, item_id="espada"):
        self.id = item_id
        self.titulo = "Espada"
        self.tipo = "arma"
        self.raridade = "comum"
        self.raridade_rotulo = "Comum"
        self.conteudo = {}


class _Resposta:
    def __init__(self):
        self._deferida = False

    async def defer(self, **kwargs):
        self._deferida = True

    def is_done(self):
        return self._deferida


class _Followup:
    def __init__(self):
        self.mensagens = []

    async def send(self, *args, **kwargs):
        self.mensagens.append((args, kwargs))


class _Interacao:
    def __init__(self, interaction_id=777):
        self.id = interaction_id
        self.guild_id = 100
        self.user = type("Usuario", (), {"id": 42})()
        self.response = _Resposta()
        self.followup = _Followup()


class _Platform:
    async def deposit_vault(self, **kwargs):
        return {"repetido": False}


class _DB:
    """Estoque com 2 baús do mesmo tipo: o primeiro `remover_bau` sucede
    (True), o segundo simula a corrida de estoque (False) — exatamente o
    caminho que ficava silencioso antes da correção."""

    def __init__(self, *, chamadas_remover_bau_ate_falhar: int):
        self._chamadas_ate_falhar = chamadas_remover_bau_ate_falhar
        self.chamadas_remover_bau = 0
        self.creditos = []

    def listar_baus_estoque(self, guild_id, user_id):
        return [{"bau_id": "geral-lendario", "quantidade": 2}]

    def remover_bau(self, guild_id, user_id, bau_id, quantidade):
        self.chamadas_remover_bau += 1
        return self.chamadas_remover_bau <= self._chamadas_ate_falhar

    def creditar(self, guild_id, user_id, moeda, quantia):
        self.creditos.append((moeda, quantia))


def _cog(db, platform):
    cog = object.__new__(Economia)
    cog.bot = type("Bot", (), {"db": db, "platform": platform, "catalogo": None})()
    return cog


def _premio_fixo(monkeypatch):
    monkeypatch.setattr(
        economia_cog.loot_mod,
        "sortear_bau",
        lambda *a, **k: {"lunaris": 10, "itens": [_ItemSorteado()]},
    )


def test_remover_bau_falhando_no_meio_avisa_a_interrupcao(monkeypatch):
    _premio_fixo(monkeypatch)
    db = _DB(chamadas_remover_bau_ate_falhar=1)  # 1ª chamada sucede, 2ª falha
    cog = _cog(db, _Platform())
    interacao = _Interacao()

    asyncio.run(cog.abrir_todos.callback(cog, interacao, tipo=None))

    assert db.chamadas_remover_bau == 2
    assert db.creditos == [("Lunaris", 10)]  # só o primeiro baú pagou
    assert len(interacao.followup.mensagens) == 1
    _args, kwargs = interacao.followup.mensagens[0]
    descricao = kwargs["embed"].description
    assert "Abriu **1** baú" in descricao
    assert "Parou no meio" in descricao
    assert "estoque mudou ou o" in descricao


def test_sem_interrupcao_nao_mostra_nenhum_aviso(monkeypatch):
    _premio_fixo(monkeypatch)
    db = _DB(chamadas_remover_bau_ate_falhar=2)  # os 2 baús abrem normalmente
    cog = _cog(db, _Platform())
    interacao = _Interacao()

    asyncio.run(cog.abrir_todos.callback(cog, interacao, tipo=None))

    assert db.chamadas_remover_bau == 2
    _args, kwargs = interacao.followup.mensagens[0]
    descricao = kwargs["embed"].description
    assert "Abriu **2** baú" in descricao
    assert "Parou no meio" not in descricao


if __name__ == "__main__":
    import pytest

    raise SystemExit(pytest.main([__file__, "-v"]))
