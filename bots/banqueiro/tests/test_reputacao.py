"""Ganhos de reputação pelo dispatch real do Discord e pelo PostgreSQL."""

from __future__ import annotations

import asyncio
import itertools
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock

import discord
import psycopg
import pytest

import main
from cogs.economia import Economia
from core import cassino, economia
from core.db import SaldoInsuficiente
from tests.db_utils import novo_db
from tests.test_db_resetar_economia_guild import _preparar_tabelas_plataforma

_IDS = itertools.count(100000000000000001)


def _bot(monkeypatch, db):
    monkeypatch.setattr(main, "Database", lambda *_args, **_kwargs: db)
    monkeypatch.setattr(main.Banqueiro, "recarregar_catalogo", lambda *_args, **_kwargs: None)
    monkeypatch.setattr(main.config, "plataforma_configurada", lambda: False)
    bot = main.Banqueiro()
    bot._connection.user = discord.ClientUser(state=bot._connection, data={
        "id": "99", "username": "Banqueiro", "discriminator": "0", "avatar": None, "bot": True,
    })
    bot.process_commands = AsyncMock()
    return bot


async def _comando(bot, nome, *, guild_id=11, user_id=22, tipo=2, comando_guild=False):
    """Usa a mesma ordem de agendamento do Gateway, sem conectar ao Discord."""
    user = {"id": str(user_id), "username": "Luna", "discriminator": "0", "avatar": None}
    data = {
        "id": str(next(_IDS)), "application_id": "99", "version": 1,
        "type": tipo, "token": "teste-local", "attachment_size_limit": 10000000,
        "data": {"id": "77", "name": nome, "type": 1},
    }
    if guild_id:
        data.update(guild_id=str(guild_id), member={
            "user": user, "roles": [], "joined_at": None, "deaf": False, "mute": False, "flags": 0,
        })
    else:
        data["user"] = user
    if comando_guild:
        data["data"]["guild_id"] = str(guild_id)
    anteriores = asyncio.all_tasks()
    bot._connection.parse_interaction_create(data)
    novas = asyncio.all_tasks() - anteriores
    if novas:
        await asyncio.gather(*novas)


def _capturar_respostas(monkeypatch):
    respostas = []

    async def enviar(_self, *args, **kwargs):
        respostas.append((args, kwargs))

    monkeypatch.setattr(discord.InteractionResponse, "send_message", enviar)
    return respostas


@pytest.mark.parametrize("inicial", [None, -20, 250])
@pytest.mark.parametrize("somente_guild", [False, True])
def test_comandos_seguidos_exibem_o_ponto_atual_sem_perder_reputacao(monkeypatch, inicial, somente_guild):
    db = novo_db()
    respostas = _capturar_respostas(monkeypatch)

    async def executar():
        async with _bot(monkeypatch, db) as bot:
            if inicial is not None:
                db.set_credito("11", "22", inicial)
            cog = object.__new__(Economia)
            cog.bot = bot

            @bot.tree.command(name="cartao")
            async def cartao(interaction: discord.Interaction):
                await Economia.cartao.callback(cog, interaction)

            if somente_guild:
                bot.tree.copy_global_to(guild=discord.Object(id=11))
                bot.tree.clear_commands(guild=None)
            await _comando(bot, "cartao", comando_guild=somente_guild)
            await _comando(bot, "cartao", comando_guild=somente_guild)
            base = economia.CREDITO_INICIAL if inicial is None else inicial
            valores = [
                next(c.value for c in kwargs["embed"].fields if c.name == "🏦 Reputação bancária")
                for _args, kwargs in respostas
            ]
            assert f"**{base + 1} pontos**" in valores[0]
            assert f"**{base + 2} pontos**" in valores[1]
            assert db.get_cartao("11", "22")["credito"] == base + 2

    asyncio.run(executar())


def test_falha_ao_gravar_ponto_nao_executa_comando_em_silencio(monkeypatch):
    db = novo_db()
    respostas = _capturar_respostas(monkeypatch)
    executados = []

    def falhar(*_args):
        raise RuntimeError("falha simulada")

    async def executar():
        async with _bot(monkeypatch, db) as bot:
            monkeypatch.setattr(db, "adicionar_reputacao", falhar)

            @bot.tree.command(name="carteira")
            async def carteira(interaction: discord.Interaction):
                executados.append(interaction.id)

            await _comando(bot, "carteira")
            assert executados == []
            assert len(respostas) == 1
            assert "registrar" in respostas[0][0][0]
            assert respostas[0][1]["ephemeral"] is True

    asyncio.run(executar())


def _mensagem(*, guild_id=11, user_id=22, bot=False, webhook_id=None, tipo=None, agora=None):
    return SimpleNamespace(
        guild=SimpleNamespace(id=guild_id) if guild_id else None,
        author=SimpleNamespace(id=user_id, bot=bot), webhook_id=webhook_id,
        type=tipo or discord.MessageType.default,
        created_at=agora or datetime.now(timezone.utc), content="",
    )


def test_mensagens_sem_conteudo_privilegiado_concedem_pontos_com_intervalo(monkeypatch):
    db = novo_db()
    agora = datetime.now(timezone.utc)

    async def executar():
        async with _bot(monkeypatch, db) as bot:
            await bot.on_message(_mensagem(agora=agora))
            await bot.on_message(_mensagem(agora=agora + timedelta(seconds=30)))
            await bot.on_message(_mensagem(agora=agora + timedelta(seconds=60), tipo=discord.MessageType.reply))
            assert db.get_cartao("11", "22")["credito"] == economia.CREDITO_INICIAL + 2
            assert bot.intents.guild_messages
            assert not bot.intents.message_content
            assert bot.process_commands.await_count == 3

    asyncio.run(executar())


@pytest.mark.parametrize("atributos", [
    {"bot": True}, {"webhook_id": 99}, {"guild_id": None},
    {"tipo": discord.MessageType.new_member},
])
def test_mensagens_de_bots_webhooks_dm_e_sistema_nao_pontuam(monkeypatch, atributos):
    db = novo_db()

    async def executar():
        async with _bot(monkeypatch, db) as bot:
            await bot.on_message(_mensagem(**atributos))
            with db._conn() as con:
                assert con.execute("SELECT COUNT(*) AS n FROM cartao").fetchone()["n"] == 0

    asyncio.run(executar())


def test_mensagens_concorrentes_e_reinicio_nao_furam_intervalo():
    db = novo_db()
    agora = datetime.now(timezone.utc)
    with ThreadPoolExecutor(max_workers=4) as pool:
        ganhos = list(pool.map(lambda _: db.reputacao_por_mensagem("11", "22", agora), range(8)))
    assert sum(ganhos) == 1
    # Reexecutar a inicialização simula a migração no restart, mantendo o cooldown.
    db._init_schema()
    assert db.reputacao_por_mensagem("11", "22", agora + timedelta(seconds=59)) == 0
    assert db.reputacao_por_mensagem("11", "22", agora + timedelta(seconds=60)) == 1
    assert db.get_cartao("11", "22")["credito"] == economia.CREDITO_INICIAL + 2


def test_mensagens_isolam_servidores_e_pessoas():
    db = novo_db()
    agora = datetime.now(timezone.utc)
    for guild, user in [("11", "22"), ("12", "22"), ("11", "23")]:
        assert db.reputacao_por_mensagem(guild, user, agora) == 1
        assert db.get_cartao(guild, user)["credito"] == economia.CREDITO_INICIAL + 1


def test_comando_na_dm_nao_cria_reputacao_fora_de_servidor(monkeypatch):
    db = novo_db()
    executados = []

    async def executar():
        async with _bot(monkeypatch, db) as bot:
            @bot.tree.command(name="ajuda")
            async def ajuda(interaction: discord.Interaction):
                executados.append(interaction.id)

            await _comando(bot, "ajuda", guild_id=None)
            assert len(executados) == 1
            with db._conn() as con:
                assert con.execute("SELECT COUNT(*) AS n FROM cartao").fetchone()["n"] == 0

    asyncio.run(executar())


def test_pontos_de_fatura_e_mandato_sao_gravados_uma_unica_vez():
    db = novo_db()
    g, u = "11", "22"
    db.cobrar_compra_com_fatura(g, u, 100, 200, "Teste", "fatura-reputacao")
    db.creditar(g, u, "Lunaris", 100)
    assert db.pagar_faturas(g, u, 50)["reputacao_ganha"] == 0
    assert db.get_cartao(g, u)["credito"] == economia.CREDITO_INICIAL
    quitacao = db.pagar_faturas(g, u, 30)
    ganho_fatura = economia.reputacao_por_fatura_paga(80)
    assert quitacao["reputacao_ganha"] == ganho_fatura
    assert db.pagar_faturas(g, u, 30)["reputacao_ganha"] == 0
    semana = cassino.semana_local()
    for objetivo in list(cassino.OBJETIVOS_CONTRATO)[:cassino.CONTRATO_OBJETIVOS_NECESSARIOS]:
        db.registrar_atividade_contrato(g, u, semana, objetivo)
    assert db.resgatar_contrato(g, u, semana)["novo"] is True
    assert db.resgatar_contrato(g, u, semana)["novo"] is False
    assert db.get_cartao(g, u)["credito"] == (
        economia.CREDITO_INICIAL + ganho_fatura + cassino.CONTRATO_RECOMPENSA_REPUTACAO
    )


def test_mercado_negro_so_da_bonus_quando_a_compra_e_confirmada():
    db = novo_db()
    db.comprar_item_mercado_negro("11", "22", "teste", "Teste", "item", "Lunaris", 2, 3)
    assert db.get_cartao("11", "22")["credito"] == economia.CREDITO_INICIAL + 1
    with pytest.raises(SaldoInsuficiente):
        db.comprar_item_mercado_negro("11", "22", "teste", "Teste", "item", "Lunaris", 1000, 1)
    assert db.get_cartao("11", "22")["credito"] == economia.CREDITO_INICIAL + 1


def test_falha_no_ponto_da_mensagem_desfaz_intervalo_para_permitir_nova_tentativa():
    db = novo_db()
    db.garantir_jogador("11", "22")
    agora = datetime.now(timezone.utc)
    with db._conn() as con:
        con.execute("""
            CREATE FUNCTION falhar_reputacao() RETURNS trigger LANGUAGE plpgsql AS $$
            BEGIN RAISE EXCEPTION 'falha simulada de reputacao'; END $$
        """)
        con.execute("""
            CREATE TRIGGER falhar_reputacao BEFORE UPDATE ON cartao
            FOR EACH ROW EXECUTE FUNCTION falhar_reputacao()
        """)
    with pytest.raises(psycopg.errors.RaiseException):
        db.reputacao_por_mensagem("11", "22", agora)
    assert db.get_cartao("11", "22")["credito"] == economia.CREDITO_INICIAL
    with db._conn() as con:
        assert con.execute("SELECT COUNT(*) AS n FROM reputacao_mensagens").fetchone()["n"] == 0
        con.execute("DROP TRIGGER falhar_reputacao ON cartao")
    assert db.reputacao_por_mensagem("11", "22", agora) == 1


def test_ganhos_simultaneos_de_comandos_nao_sobrescrevem_pontos():
    db = novo_db()
    db.set_credito("11", "22", 100)
    with ThreadPoolExecutor(max_workers=4) as pool:
        list(pool.map(lambda _: db.adicionar_reputacao("11", "22"), range(8)))
    assert db.get_cartao("11", "22")["credito"] == 108


def test_resets_limpam_intervalos_apenas_dos_alvos():
    db = novo_db()
    _preparar_tabelas_plataforma(db)
    agora = datetime.now(timezone.utc)
    for guild, user in [("11", "22"), ("11", "23"), ("12", "22")]:
        db.reputacao_por_mensagem(guild, user, agora)
    db.resetar_jogador("11", "22")
    assert db.reputacao_por_mensagem("11", "22", agora) == 1
    assert db.reputacao_por_mensagem("11", "23", agora) == 0
    assert db.reputacao_por_mensagem("12", "22", agora) == 0
    db.resetar_economia_guild("11")
    assert db.reputacao_por_mensagem("11", "22", agora) == 1
    assert db.reputacao_por_mensagem("11", "23", agora) == 1
    assert db.reputacao_por_mensagem("12", "22", agora) == 0


def test_falha_no_mandato_nao_impede_ponto_do_comando(monkeypatch):
    db = novo_db()
    executados = []

    def falhar(*_args):
        raise RuntimeError("falha simulada no mandato")

    async def executar():
        async with _bot(monkeypatch, db) as bot:
            monkeypatch.setattr(db, "registrar_atividade_contrato", falhar)

            @bot.tree.command(name="investir")
            async def investir(interaction: discord.Interaction):
                executados.append(interaction.id)

            await _comando(bot, "investir")
            assert len(executados) == 1
            assert db.get_cartao("11", "22")["credito"] == economia.CREDITO_INICIAL + 1

    asyncio.run(executar())


@pytest.mark.parametrize("tipo", [discord.InteractionType.autocomplete, discord.InteractionType.component,
                                  discord.InteractionType.modal_submit])
def test_sugestoes_botoes_e_modais_nao_concedem_bonus_de_comando(monkeypatch, tipo):
    db = novo_db()

    async def executar():
        async with _bot(monkeypatch, db) as bot:
            interaction = SimpleNamespace(type=tipo, guild_id=11)
            assert await bot.tree.interaction_check(interaction)
            with db._conn() as con:
                assert con.execute("SELECT COUNT(*) AS n FROM cartao").fetchone()["n"] == 0

    asyncio.run(executar())
