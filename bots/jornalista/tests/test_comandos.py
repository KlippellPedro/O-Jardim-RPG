"""Contrato dos slash commands publicados pelo Jornalista."""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

import discord
from discord.ext import commands

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE))

from cogs.ajuda import CATEGORIAS


EXTENSOES = (
    "cogs.baus",
    "cogs.avisos",
    "cogs.publicacoes",
    "cogs.jornal",
    "cogs.registro",
    "cogs.boasvindas",
    "cogs.horoscopo",
    "cogs.entrevista",
    "cogs.loteria",
    "cogs.cassino",
    "cogs.ajuda",
)

COMANDOS_ESPERADOS = {
    "ajuda",
    "bau_agora",
    "bau_canais",
    "bau_canal_adicionar",
    "bau_canal_remover",
    "bau_canal_tema",
    "bau_config",
    "bau_pendentes",
    "bau_reprocessar",
    "entrevista_responder",
    "entrevista_participar",
    "estacao",
    "horoscopo",
    "jornal avancar_mes",
    "jornal canais",
    "jornal clima_auto",
    "subornar_jornalista",
    "anunciar_classificado",
    "vender_furo",
    "publicar_noticia",
    "jornal configurar",
    "jornal automacao",
    "jornal automacoes",
    "jornal fila",
    "jornal fila_reprocessar",
    "jornal orcamento",
    "jornal pauta agendar",
    "jornal pauta cancelar",
    "jornal pauta criar",
    "jornal pauta listar",
    "jornal pauta publicar",
    "jornal pauta ver",
    "jornal estacao_auto",
    "jornal rumor",
    "jornal desafio",
    "jornal canais_boasvindas",
    "jornal canal",
    "jornal estacao_definir",
    "jornal imagem",
    "jornal mensagem",
    "jornal mensagem_ver",
    "jornal principal",
    "jornal status",
    "registro apagar",
    "registro canal",
    "registro criar",
    "registro modo",
    "registro opcao",
    "registro opcoes",
    "registro paineis",
    "registro preset_arvores",
    "registro publicar",
    "registro remover_opcao",
}


def _folhas(comando, prefixo: str = ""):
    nome = f"{prefixo} {comando.name}".strip()
    filhos = getattr(comando, "commands", None)
    if filhos:
        for filho in filhos:
            yield from _folhas(filho, nome)
        return
    yield nome


async def _inventario_real() -> set[str]:
    bot = commands.Bot(command_prefix="!", intents=discord.Intents.default())
    bot.db = object()
    bot.catalogo = object()
    bot.platform = None
    try:
        for extensao in EXTENSOES:
            await bot.load_extension(extensao)
        return {
            nome
            for comando in bot.tree.get_commands()
            for nome in _folhas(comando)
        }
    finally:
        await bot.close()


def _inventario_ajuda() -> set[str]:
    inventario = set()
    for categoria in CATEGORIAS.values():
        for assinatura, _descricao in categoria["comandos"]:
            nome = assinatura.removeprefix("/").split(" <", 1)[0].split(" [", 1)[0]
            inventario.add(nome)
    return inventario


def test_inventario_de_comandos_nao_regride():
    assert asyncio.run(_inventario_real()) == COMANDOS_ESPERADOS


def test_ajuda_lista_todos_os_comandos_publicos():
    assert _inventario_ajuda() == COMANDOS_ESPERADOS - {"ajuda"}


def test_paginas_da_ajuda_respeitam_limite_de_25_campos_do_discord():
    assert all(len(categoria["comandos"]) <= 25 for categoria in CATEGORIAS.values())


def test_ciclo_clima_publica_nas_guilds_optantes():
    from cogs import jornal as cog_jornal

    class _DB:
        def listar_guilds_clima_auto(self):
            return ["1", "2"]

        def ciclo_guild_devido(self, gid, ciclo, intervalo_horas):
            return True

        def marcar_ciclo_guild(self, gid, ciclo):
            pass

    publicados = []

    cog = object.__new__(cog_jornal.Jornal)  # sem __init__: não inicia o loop real
    cog.bot = type("Bot", (), {"db": _DB()})()

    async def fake_publicar(gid):
        publicados.append(gid)

    cog._publicar_clima_auto = fake_publicar
    asyncio.run(cog_jornal.Jornal.ciclo_clima.coro(cog))
    assert publicados == ["1", "2"]  # publica só nas guilds que optaram


def test_montar_embed_clima_gera_o_jornal_lunar_da_estacao():
    from cogs import jornal as cog_jornal

    class _DB:
        def get_estacao(self, guild_id):
            return "inverno"
        def set_modificador_clima(self, guild_id, mod):
            pass

    cog = object.__new__(cog_jornal.Jornal)
    cog.bot = type("Bot", (), {"db": _DB()})()
    emb = cog._montar_embed_clima("1")
    assert "JORNAL LUNAR" in emb.title
    assert "Inverno" in emb.title
    assert emb.description  # previsão do tempo preenchida
