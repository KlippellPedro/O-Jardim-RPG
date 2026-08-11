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
from cogs.economia import DefesaRouboView


EXTENSOES = (
    "cogs.economia",
    "cogs.admin",
    "cogs.trocas",
    "cogs.integracao",
    "cogs.recompensas",
    "cogs.protecao",
    "cogs.mercado",
    "cogs.investimentos",
    "cogs.emprestimos",
    "cogs.loteria",
    "cogs.servicos",
    "cogs.ajuda",
)

COMANDOS_ESPERADOS = {
    "abrir_bau",
    "abrir_todos",
    "ajuda",
    "alertas_banco",
    "cambio_auto",
    "cambio_ver",
    "campanha_vincular",
    "cambio",
    "carteira",
    "cartao",
    "cartao_melhorar",
    "catalogo_recarregar",
    "catalogo_republicar",
    "cofre",
    "cofre_depositar",
    "cofre_melhorias",
    "cofre_melhorar",
    "cofre_sacar",
    "cofre_seguranca_melhorar",
    "comandos",
    "comprar_bau",
    "crise_declarar",
    "dar",
    "daritem",
    "divida",
    "divida_pagar",
    "emprestar_para",
    "economia_diagnostico",
    "emprestimo_pagar",
    "emprestimos_ver",
    "extrato",
    "fatura",
    "fatura_pagar",
    "inventario",
    "investir",
    "investir_ver",
    "item",
    "juros_cofre",
    "leilao_cancelar",
    "leilao_iniciar",
    "leilao_ver",
    "loja_baus",
    "loteria_bolo",
    "loteria_comprar",
    "loteria_meus_bilhetes",
    "meus_baus",
    "mestre_proteger",
    "minhas_campanhas",
    "monstro",
    "oferecer",
    "pagar",
    "perfil",
    "protecao_comprar",
    "protecao_ver",
    "preparo_roubo_comprar",
    "preparos_roubo",
    "ranking",
    "recompensa_colocar",
    "recompensa_ver",
    "resetar_tudo",
    "resetjogador",
    "roubar",
    "roubar_cofre",
    "roubo_planejar",
    "seguro_cofre",
    "setcambio",
    "setcredito",
    "setreputacao",
    "seteconomia",
    "setroubo",
    "tirar",
    "tirar_item",
    "trocar",
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


def test_defesa_de_roubo_tem_cinco_segundos_e_um_botao():
    async def verificar():
        view = DefesaRouboView(alvo_id=123)
        try:
            assert view.timeout == 5.0
            assert len(view.children) == 1
            assert "5s" in view.children[0].label
        finally:
            view.stop()

    asyncio.run(verificar())


def test_juros_automatico_do_cofre_aplica_e_avisa():
    from cogs import economia as cog_economia
    from core import economia

    class _DB:
        def __init__(self):
            self.aplicados = []
            self.avisos = []

        def get_economia_config(self, gid):
            return {"juros_cofre_taxa": economia.JUROS_COFRE_TAXA}

        def aplicar_juros_cofre(self, gid, taxa):
            self.aplicados.append((gid, taxa))
            return 3  # 3 linhas renderam juros

        def criar_aviso(self, gid, msg):
            self.avisos.append((gid, msg))

        def ciclo_guild_devido(self, gid, ciclo, intervalo_horas):
            return True

        def marcar_ciclo_guild(self, gid, ciclo):
            pass

    db = _DB()
    bot = type("Bot", (), {})()
    bot.db = db
    bot.guilds = [type("G", (), {"id": 1})(), type("G", (), {"id": 2})()]
    cog = object.__new__(cog_economia.Economia)  # sem __init__: não dispara o loop real
    cog.bot = bot

    asyncio.run(cog_economia.Economia.ciclo_juros_cofre.coro(cog))

    assert db.aplicados == [("1", economia.JUROS_COFRE_TAXA), ("2", economia.JUROS_COFRE_TAXA)]
    assert len(db.avisos) == 2  # rendeu em ambas as guilds → avisa cada uma


def test_juros_automatico_nao_avisa_cofre_vazio():
    from cogs import economia as cog_economia

    class _DB:
        def __init__(self):
            self.avisos = []

        def get_economia_config(self, gid):
            return {"juros_cofre_taxa": 0.02}

        def aplicar_juros_cofre(self, gid, taxa):
            return 0  # ninguém tem saldo guardado

        def criar_aviso(self, gid, msg):
            self.avisos.append((gid, msg))

        def ciclo_guild_devido(self, gid, ciclo, intervalo_horas):
            return True

        def marcar_ciclo_guild(self, gid, ciclo):
            pass

    db = _DB()
    bot = type("Bot", (), {})()
    bot.db = db
    bot.guilds = [type("G", (), {"id": 1})()]
    cog = object.__new__(cog_economia.Economia)
    cog.bot = bot

    asyncio.run(cog_economia.Economia.ciclo_juros_cofre.coro(cog))

    assert db.avisos == []  # cofre vazio: aplica sem spam de aviso


def test_loja_direta_de_itens_nao_e_publicada_no_discord():
    comandos = asyncio.run(_inventario_real())
    assert {"loja", "comprar", "vender"}.isdisjoint(comandos)
    assert {"loja_baus", "comprar_bau", "meus_baus", "abrir_bau"} <= comandos
