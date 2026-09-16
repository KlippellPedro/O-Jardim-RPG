"""Cargos por reação: eventos concorrentes e cache atrasado do Discord."""

import asyncio
import sys
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock

import discord
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from cogs.registro import Registro


def cenario(*, unico=True, cargos=()):
    roles = {n: SimpleNamespace(id=n) for n in (10, 20, 99)}
    atuais = set(cargos)
    reacoes = {"🌳": set(), "🔥": set(), "❓": set()}
    eventos = []

    async def adicionar(*rs, **kwargs):
        atuais.update(r.id for r in rs)

    async def remover(*rs, **kwargs):
        atuais.difference_update(r.id for r in rs)

    def membro():
        return SimpleNamespace(
            id=7, bot=False, roles=[roles[r] for r in atuais],
            add_roles=add, remove_roles=remove,
        )

    add, remove = AsyncMock(side_effect=adicionar), AsyncMock(side_effect=remover)
    cache = membro()  # deliberadamente não recebe MEMBER_UPDATE
    guild = SimpleNamespace(
        id=1, get_role=roles.get, get_member=lambda _: cache,
        fetch_member=AsyncMock(side_effect=lambda _: membro()),
    )

    def opcao(mid, emoji):
        rid = {"🌳": 10, "🔥": 20}.get(emoji)
        if mid != "3" or rid is None:
            return None
        return {"cargo_id": str(rid), "unico": unico, "cargos_irmaos": ["10", "20"]}

    class Reacao:
        def __init__(self, emoji):
            self.emoji = emoji

        async def remove(self, user):
            if user.id in reacoes[self.emoji]:
                reacoes[self.emoji].remove(user.id)
                eventos.append(asyncio.create_task(cog.on_raw_reaction_remove(payload(self.emoji))))

        async def users(self, **kwargs):
            if kwargs.get("type") == discord.ReactionType.burst:
                return
            ids = [uid for uid in sorted(reacoes[self.emoji]) if uid > kwargs["after"].id]
            for uid in ids[:kwargs["limit"]]:
                yield SimpleNamespace(id=uid)

    msg = SimpleNamespace(reactions=[Reacao(e) for e in reacoes])
    canal = SimpleNamespace(fetch_message=AsyncMock(return_value=msg))
    bot = SimpleNamespace(
        user=SimpleNamespace(id=100), db=SimpleNamespace(get_opcao_por_reacao=opcao),
        get_guild=lambda _: guild, get_channel=lambda _: canal,
    )
    cog = Registro(bot)

    def payload(emoji):
        return SimpleNamespace(guild_id=1, channel_id=2, message_id=3, user_id=7, emoji=emoji)

    async def reagir(emoji, presente=True):
        if presente:
            reacoes[emoji].add(7)
            await cog.on_raw_reaction_add(payload(emoji))
        else:
            reacoes[emoji].discard(7)
            await cog.on_raw_reaction_remove(payload(emoji))

    async def drenar():
        while eventos:
            await asyncio.gather(*[eventos.pop() for _ in range(len(eventos))])

    return SimpleNamespace(**locals())


@pytest.mark.parametrize("unico", [True, False])
def test_tirar_e_selecionar_outro_emoji_repetidamente(unico):
    async def rodar():
        c = cenario(unico=unico, cargos=(99,))
        for emoji in ("🌳", "🔥", "🌳", "🔥"):
            await c.reagir(emoji)
            assert c.atuais == {99, {"🌳": 10, "🔥": 20}[emoji]}
            await c.reagir(emoji, False)
            assert c.atuais == {99}
        await c.drenar()
    asyncio.run(rodar())


def test_troca_direta_com_cache_de_cargos_atrasado():
    async def rodar():
        c = cenario(cargos=(99,))
        c.reacoes["❓"].add(7)
        for emoji, cargo in (("🌳", 10), ("🔥", 20), ("🌳", 10)):
            await c.reagir(emoji)
            await c.drenar()
            assert c.atuais == {99, cargo}
            assert c.reacoes[emoji] == {7}
        assert c.reacoes["🔥"] == set()
        assert c.reacoes["❓"] == {7}  # reação fora do painel não é limpeza
    asyncio.run(rodar())


def test_multiplo_acumula_e_remove_so_o_cargo_escolhido():
    async def rodar():
        c = cenario(unico=False, cargos=(99,))
        await c.reagir("🌳")
        await c.reagir("🔥")
        assert c.atuais == {10, 20, 99}
        await c.reagir("🌳", False)
        assert c.atuais == {20, 99}
        assert c.reacoes["🔥"] == {7}
    asyncio.run(rodar())


def test_remocao_lenta_nao_desfaz_nova_selecao_do_mesmo_emoji():
    async def rodar():
        c = cenario(cargos=(10,))
        entrou, liberar = asyncio.Event(), asyncio.Event()

        async def remover_lento(*rs, **kwargs):
            entrou.set()
            await liberar.wait()
            c.atuais.difference_update(r.id for r in rs)

        c.remove.side_effect = remover_lento
        tirou = asyncio.create_task(c.reagir("🌳", False))
        await entrou.wait()
        voltou = asyncio.create_task(c.reagir("🌳"))
        await asyncio.sleep(0)
        liberar.set()
        await asyncio.gather(tirou, voltou)
        assert c.atuais == {10}
    asyncio.run(rodar())


def test_sem_permissao_para_novo_cargo_preserva_o_anterior():
    async def rodar():
        c = cenario(cargos=(10,))
        c.reacoes["🌳"].add(7)
        c.add.side_effect = discord.Forbidden(SimpleNamespace(status=403, reason="Forbidden"), "negado")
        await c.reagir("🔥")
        await c.drenar()
        assert c.atuais == {10}
        assert c.reacoes["🌳"] == {7}
    asyncio.run(rodar())


def test_falha_http_de_cargo_e_registrada(caplog):
    async def rodar():
        c = cenario()
        c.add.side_effect = discord.HTTPException(SimpleNamespace(status=503, reason="Unavailable"), "falhou")
        await c.reagir("🌳")
        assert c.atuais == set()
    asyncio.run(rodar())
    assert "503" in caplog.text


def test_remocao_atrasada_da_limpeza_nao_tira_cargo_reselecionado():
    async def rodar():
        c = cenario(cargos=(10,))
        await c.reagir("🌳")
        await c.cog.on_raw_reaction_remove(c.payload("🌳"))
        assert c.atuais == {10}
        c.remove.assert_not_awaited()
    asyncio.run(rodar())


def test_clique_novo_durante_limpeza_preserva_a_ultima_escolha():
    async def rodar():
        c = cenario(cargos=(20,))
        c.reacoes["🔥"].add(7)
        entrou, liberar = asyncio.Event(), asyncio.Event()

        async def buscar_mensagem(_):
            entrou.set()
            await liberar.wait()
            return c.msg

        c.canal.fetch_message.side_effect = buscar_mensagem
        primeira = asyncio.create_task(c.reagir("🌳"))
        await entrou.wait()
        ultima = asyncio.create_task(c.reagir("🔥"))
        await asyncio.sleep(0)
        liberar.set()
        await asyncio.gather(primeira, ultima)
        await c.drenar()
        assert c.atuais == {20}
        assert c.reacoes["🔥"] == {7}
        assert c.reacoes["🌳"] == set()
    asyncio.run(rodar())


def test_sem_acesso_ao_historico_ainda_entrega_e_remove_cargos():
    async def rodar():
        c = cenario(cargos=(10,))
        c.canal.fetch_message.side_effect = discord.Forbidden(
            SimpleNamespace(status=403, reason="Forbidden"), "sem histórico",
        )
        await c.reagir("🔥")
        assert c.atuais == {20}
        await c.reagir("🔥", False)
        assert c.atuais == set()
    asyncio.run(rodar())


def test_sem_gerenciar_mensagens_ainda_troca_o_cargo():
    async def rodar():
        c = cenario(cargos=(10,))
        c.msg.reactions[0].remove = AsyncMock(side_effect=discord.Forbidden(
            SimpleNamespace(status=403, reason="Forbidden"), "sem gerenciar mensagens",
        ))
        await c.reagir("🔥")
        assert c.atuais == {20}
        assert c.reacoes["🔥"] == {7}
    asyncio.run(rodar())


def test_painel_existente_funciona_apos_recriar_cog_sem_cache_de_membro():
    async def rodar():
        c = cenario(cargos=(10,))
        c.cog = Registro(c.bot)
        c.guild.get_member = lambda _: None
        await c.cog.on_raw_reaction_add(c.payload("🔥"))
        assert c.atuais == {20}
        assert not c.cog._filas
    asyncio.run(rodar())


def test_ignora_emoji_desconhecido_dm_e_reacao_do_proprio_bot():
    async def rodar():
        c = cenario()
        desconhecido = c.payload("❓")
        dm = c.payload("🌳")
        dm.guild_id = None
        bot = c.payload("🌳")
        bot.user_id = 100
        for p in (desconhecido, dm, bot):
            await c.cog.on_raw_reaction_add(p)
            await c.cog.on_raw_reaction_remove(p)
        c.add.assert_not_awaited()
        c.remove.assert_not_awaited()
        c.guild.fetch_member.assert_not_awaited()
    asyncio.run(rodar())
