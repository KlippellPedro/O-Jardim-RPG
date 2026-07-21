"""Contrato dos slash commands publicados pelo Banqueiro."""

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
    "cogs.economia",
    "cogs.admin",
    "cogs.trocas",
    "cogs.integracao",
    "cogs.recompensas",
    "cogs.ajuda",
)

COMANDOS_ESPERADOS = {
    "abrir_bau",
    "abrir_todos",
    "ajuda",
    "campanha_vincular",
    "cambio",
    "carteira",
    "cartao",
    "cartao_melhorar",
    "catalogo_recarregar",
    "catalogo_republicar",
    "cofre",
    "cofre_depositar",
    "cofre_melhorar",
    "cofre_sacar",
    "cofre_seguranca_melhorar",
    "comandos",
    "comprar",
    "comprar_bau",
    "dar",
    "daritem",
    "divida",
    "divida_pagar",
    "extrato",
    "inventario",
    "jornal_definir",
    "juros_cofre",
    "loja",
    "loja_baus",
    "meus_baus",
    "minhas_campanhas",
    "oferecer",
    "pagar",
    "ranking",
    "recompensa_colocar",
    "recompensa_ver",
    "resetjogador",
    "roubar",
    "roubar_cofre",
    "setcambio",
    "setcredito",
    "setroubo",
    "tirar",
    "tirar_item",
    "vender",
    "vincular",
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


def test_ajuda_lista_todos_os_comandos_de_jogador_e_mestre():
    # /ajuda e /comandos descrevem o próprio índice, por isso não aparecem
    # como itens dentro das categorias.
    assert _inventario_ajuda() == COMANDOS_ESPERADOS - {"ajuda", "comandos"}
