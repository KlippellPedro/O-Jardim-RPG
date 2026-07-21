"""Confere que todos os cogs do Barista carregam e registram os comandos esperados."""

import asyncio
import sys
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE))

from main import Barista, EXTENSOES


COMANDOS_SLASH = {
    "ajuda",
    "despausar",
    "fila",
    "menu",
    "musica_status",
    "parar",
    "pausar",
    "playlist_adicionar",
    "playlist_apagar",
    "playlist_criar",
    "playlist_listar",
    "playlist_tocar",
    "playlist_ver",
    "pular",
    "rolar",
    "teste",
    "tocar",
    "volume",
}


def test_todos_os_cogs_carregam_e_registram_os_comandos(monkeypatch):
    # Impede que o teste local tente abrir o DATABASE_URL do .env de produção.
    from core import config

    monkeypatch.setattr(config, "DATABASE_URL", " ")

    async def carregar():
        bot = Barista()
        try:
            for extensao in EXTENSOES:
                await bot.load_extension(extensao)
            assert {cmd.name for cmd in bot.tree.get_commands()} == COMANDOS_SLASH

            comando_prefixo = bot.get_command("musica")
            assert comando_prefixo is not None
            assert set(comando_prefixo.aliases) == {"tocar", "play"}
        finally:
            await bot.close()

    asyncio.run(carregar())
