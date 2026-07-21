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
    "cogs.jornal",
    "cogs.registro",
    "cogs.boasvindas",
    "cogs.ajuda",
)

COMANDOS_ESPERADOS = {
    "ajuda",
    "bau_agora",
    "bau_config",
    "estacao",
    "jornal avancar_mes",
    "jornal canais",
    "jornal canais_boasvindas",
    "jornal canal",
    "jornal estacao_definir",
    "jornal imagem",
    "jornal mensagem",
    "jornal mensagem_ver",
    "jornal publicar",
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

