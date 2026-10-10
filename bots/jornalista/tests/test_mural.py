"""Mural de Procurados: uma mensagem fixa, editada no lugar."""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path
from types import SimpleNamespace

import discord

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE))

from cogs.mural import assinatura, montar_mural
from tests.db_utils import novo_db
from tests.test_painel import _bot_carregado

G = "100"


def _rodar(coro):
    return asyncio.run(coro)


def _recompensa(db, alvo, jogadores=0, sistema=0):
    with db._conn() as con:
        con.execute(
            "INSERT INTO recompensa (guild_id, alvo_user_id, valor_jogadores, valor_sistema) VALUES (%s, %s, %s, %s)"
            " ON CONFLICT (guild_id, alvo_user_id) DO UPDATE SET valor_jogadores=EXCLUDED.valor_jogadores, valor_sistema=EXCLUDED.valor_sistema",
            (G, alvo, jogadores, sistema),
        )


def test_lista_do_banqueiro_vem_ordenada_e_sem_zerados():
    db = novo_db()
    _recompensa(db, "1", jogadores=50)
    _recompensa(db, "2", jogadores=20, sistema=100)
    _recompensa(db, "3", jogadores=0, sistema=0)
    assert db.listar_procurados(G) == [
        {"alvo_user_id": "2", "valor": 120, "tem_sistema": True},
        {"alvo_user_id": "1", "valor": 50, "tem_sistema": False},
    ]
    assert db.listar_procurados("outro") == []


def test_cartaz_do_mural_e_assinatura_estavel():
    cartaz = montar_mural([
        {"alvo_user_id": "2", "valor": 120, "tem_sistema": True},
        {"alvo_user_id": "1", "valor": 50, "tem_sistema": False},
    ])
    assert "<@2>" in cartaz.description and "☾ **120** 🏦" in cartaz.description and "**2.** <@1>" in cartaz.description
    assert "paz" in montar_mural([]).description
    a = assinatura([{"alvo_user_id": "1", "valor": 5, "tem_sistema": False}])
    assert a == assinatura([{"alvo_user_id": "1", "valor": 5, "tem_sistema": False}])
    assert a != assinatura([{"alvo_user_id": "1", "valor": 6, "tem_sistema": False}])


class _Canal(discord.TextChannel):
    def __init__(self, canal_id):
        self.id = canal_id
        self.mensagens = {}
        self.proximo = 100
        self.apagadas = set()

    async def send(self, **kw):
        self.proximo += 1
        self.mensagens[self.proximo] = kw["embed"]
        return SimpleNamespace(id=self.proximo)

    async def fetch_message(self, mid):
        canal = self
        if mid in self.apagadas or mid not in self.mensagens:
            raise discord.NotFound(SimpleNamespace(status=404, reason="x"), "sumiu")

        class _Msg:
            id = mid

            async def edit(self, embed=None, **kw):
                canal.mensagens[mid] = embed

        return _Msg()


def _guild(canal):
    return SimpleNamespace(id=int(G), get_channel=lambda cid: canal if cid == canal.id else None)


def test_mural_cria_edita_no_lugar_e_so_mexe_quando_algo_muda():
    async def verificar():
        db = novo_db()
        bot = await _bot_carregado(db)
        try:
            cog = bot.get_cog("Mural")
            canal = _Canal(555)
            guild = _guild(canal)
            assert await cog.atualizar_guild(guild) is None  # sem canal escolhido, desligado
            db.set_canal_categoria(G, "procurados", "555")
            _recompensa(db, "1", jogadores=50)
            assert await cog.atualizar_guild(guild) == "criado"
            assert await cog.atualizar_guild(guild) == "igual"
            assert len(canal.mensagens) == 1
            _recompensa(db, "1", jogadores=90)
            assert await cog.atualizar_guild(guild) == "editado"
            assert len(canal.mensagens) == 1 and "90" in list(canal.mensagens.values())[0].description
            # mensagem apagada por alguém: publica outra e passa a editar a nova
            canal.apagadas.add(101)
            _recompensa(db, "1", jogadores=95)
            assert await cog.atualizar_guild(guild) == "criado"
            assert db.get_mural_procurados(G)["mensagem_id"] == "102"
        finally:
            await bot.close()

    _rodar(verificar())


def test_mural_respeita_o_interruptor_e_a_troca_de_canal():
    async def verificar():
        db = novo_db()
        bot = await _bot_carregado(db)
        try:
            cog = bot.get_cog("Mural")
            canal = _Canal(555)
            outro = _Canal(777)
            guild = SimpleNamespace(id=int(G), get_channel=lambda cid: {555: canal, 777: outro}.get(cid))
            db.set_canal_categoria(G, "procurados", "555")
            assert await cog.atualizar_guild(guild) == "criado"
            with db._conn() as con:
                con.execute("INSERT INTO jornal_automacoes (guild_id, tipo, ativo) VALUES (%s, 'mural_procurados', FALSE)", (G,))
            assert await cog.atualizar_guild(guild) is None
            with db._conn() as con:
                con.execute("DELETE FROM jornal_automacoes")
            db.set_canal_categoria(G, "procurados", "777")
            assert await cog.atualizar_guild(guild) == "criado"  # canal novo: mensagem nova lá
            assert len(outro.mensagens) == 1
        finally:
            await bot.close()

    _rodar(verificar())


def test_canal_exato_nao_cai_no_principal():
    db = novo_db()
    db.set_jornal_canal(G, "999")
    assert db.get_canal_categoria(G, "procurados") == "999"  # o roteamento comum cai no principal
    assert db.canal_exato_categoria(G, "procurados") is None  # o mural exige escolha explícita
