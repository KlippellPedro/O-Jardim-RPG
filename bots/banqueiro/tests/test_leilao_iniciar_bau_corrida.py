"""/leilao_iniciar ignorava o retorno de db.remover_bau (que devolve False,
sem levantar, quando a quantidade já não é mais suficiente — igual ao
padrão que remover_item usa). Chamar /leilao_iniciar duas vezes rápido pro
mesmo baú criava dois leilões "ativo", mas só um dos dois de fato tirava o
baú do vendedor: quando o segundo resolvesse, _entregar_posse chamava
add_bau incondicionalmente e duplicava o baú pro comprador."""

from __future__ import annotations

import asyncio
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import Mock

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE))

import discord

from cogs.mercado import Mercado
from core.inventario import Inventario


class _Resposta:
    def __init__(self):
        self._deferida = False

    async def send_message(self, *args, **kwargs):
        pass

    async def defer(self, **kwargs):
        self._deferida = True


class _Followup:
    def __init__(self):
        self.mensagens = []

    async def send(self, *args, **kwargs):
        self.mensagens.append((args, kwargs))

    async def original_response(self):
        return None


def _canal_fake():
    canal = Mock(spec=discord.TextChannel)
    canal.id = 111
    return canal


class _Interacao:
    def __init__(self):
        self.id = 1
        self.guild_id = 555000111
        self.channel = _canal_fake()
        self.channel_id = 111
        self.user = type("Usuario", (), {"id": 1})()
        self.response = _Resposta()
        self.followup = _Followup()

    async def original_response(self):
        return type("Msg", (), {"id": 999})()


class _DB:
    def __init__(self, *, baus_disponiveis: int):
        self.baus = baus_disponiveis
        self.leiloes = {}
        self._prox_id = 1
        self.chamadas = []

    def garantir_jogador(self, g, u):
        pass

    def get_economia_config(self, g):
        return {"leilao_corte": 0.05}

    def contar_bau(self, g, u, ref):
        return self.baus

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
        pass

    def remover_bau(self, g, u, ref, qtd=1):
        """Mesmo comportamento do core/db.py real: UPDATE guardado, devolve
        False sem levantar se não há quantidade suficiente."""
        if self.baus < qtd:
            return False
        self.baus -= qtd
        self.chamadas.append(("remover_bau", u, ref, qtd))
        return True


def _cog(db):
    bot = type("Bot", (), {"db": db, "inventario": None, "catalogo": None})()
    bot.inventario = Inventario(bot)
    cog = object.__new__(Mercado)
    cog.bot = bot
    return cog


def _rodar(coro):
    return asyncio.run(coro)


def test_leilao_iniciar_bau_com_estoque_remove_normalmente():
    db = _DB(baus_disponiveis=1)
    cog = _cog(db)

    _rodar(Mercado.leilao_iniciar.callback(cog, _Interacao(), "bau:geral-comum", 10, 1, moeda=None))

    assert db.leiloes[1]["status"] == "ativo"
    assert ("remover_bau", "1", "geral-comum", 1) in db.chamadas


def test_leilao_iniciar_bau_sem_estoque_de_verdade_cancela_o_leilao():
    """Regressão: contar_bau (checagem inicial) e remover_bau (remoção real)
    podem discordar entre si numa corrida; o retorno de remover_bau precisa
    ser respeitado, não só a checagem inicial."""
    db = _DB(baus_disponiveis=1)
    cog = _cog(db)

    # Simula a corrida: entre a checagem (contar_bau, que ainda diz 1) e a
    # remoção de fato, outra chamada já esvaziou o estoque.
    original_remover = db.remover_bau

    def remover_ja_vazio(g, u, ref, qtd=1):
        db.baus = 0  # já foi consumido por "outro" comando concorrente
        return original_remover(g, u, ref, qtd)

    db.remover_bau = remover_ja_vazio
    interacao = _Interacao()

    _rodar(Mercado.leilao_iniciar.callback(cog, interacao, "bau:geral-comum", 10, 1, moeda=None))

    # O ponto central da regressão: o leilão NÃO pode ficar "ativo" sem o
    # baú ter de fato saído do vendedor.
    assert db.leiloes[1]["status"] == "cancelado"
    assert not any(c[0] == "remover_bau" for c in db.chamadas)
    assert interacao.followup.mensagens
    (args, kwargs) = interacao.followup.mensagens[0]
    assert "não tem mais esse baú" in args[0]


if __name__ == "__main__":
    import pytest

    raise SystemExit(pytest.main([__file__, "-v"]))
