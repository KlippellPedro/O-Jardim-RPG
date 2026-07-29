"""/loteria_bolo: mostra o tamanho do bolo antes do jogador comprar às
cegas. Antes só existiam /loteria_comprar e /loteria_meus_bilhetes, sem
tinha jeito nenhum de saber quanto tinha no pote da rodada atual."""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE))

from cogs.loteria import Loteria
from core import economia


class _Resposta:
    def __init__(self):
        self.mensagens = []

    async def send_message(self, texto=None, *, embed=None, ephemeral=False, **kwargs):
        self.mensagens.append((texto, embed, ephemeral))


class _Interacao:
    def __init__(self, guild_id, user_id):
        self.guild_id = guild_id
        self.user = type("Usuario", (), {"id": user_id})()
        self.response = _Resposta()


class _DB:
    def __init__(self, bilhetes=None):
        self.bilhetes = bilhetes or []

    def listar_bilhetes_loteria(self, guild_id):
        return list(self.bilhetes)

    def get_economia_config(self, guild_id):
        return {"loteria_preco_bilhete": economia.LOTERIA_PRECO_BILHETE, "loteria_corte": economia.LOTERIA_CORTE_CASA}


def _cog(db):
    cog = object.__new__(Loteria)
    cog.bot = type("Bot", (), {"db": db})()
    return cog


def _rodar(coro):
    return asyncio.run(coro)


def test_loteria_bolo_sem_bilhetes_avisa_e_nao_quebra():
    db = _DB(bilhetes=[])
    cog = _cog(db)
    interacao = _Interacao(100, 1)

    _rodar(Loteria.loteria_bolo.callback(cog, interacao))

    texto, embed, ephemeral = interacao.response.mensagens[0]
    assert embed is None
    assert ephemeral is True


def test_loteria_bolo_calcula_premio_estimado_com_corte_da_casa():
    db = _DB(bilhetes=[{"user_id": "1", "quantidade": 3}, {"user_id": "2", "quantidade": 1}])
    cog = _cog(db)
    interacao = _Interacao(100, 1)

    _rodar(Loteria.loteria_bolo.callback(cog, interacao))

    texto, embed, ephemeral = interacao.response.mensagens[0]
    assert ephemeral is False
    pote_bruto = 4 * economia.LOTERIA_PRECO_BILHETE
    premio_esperado = pote_bruto - int(pote_bruto * economia.LOTERIA_CORTE_CASA)
    assert "4" in embed.description
    assert "2" in embed.description  # 2 participantes
    assert str(premio_esperado) in embed.description


if __name__ == "__main__":
    import pytest

    raise SystemExit(pytest.main([__file__, "-v"]))
