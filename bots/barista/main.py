"""
O Jardim RPG — bot Barista (dados e música).
Ponto de entrada. Roda com: python main.py  (com o .env preenchido).
"""

from __future__ import annotations

import logging

import discord
from discord.ext import commands

from core import config
from core.db import Database, DatabaseUnavailable

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("barista")

EXTENSOES = (
    "cogs.dados",
    "cogs.musica",
    "cogs.playlist",
    "cogs.menu",
    "cogs.ajuda",
)


class Barista(commands.Bot):
    def __init__(self):
        intents = discord.Intents.default()
        # Precisa do conteúdo da mensagem pra reconhecer "!musica <link>"
        # (comando de prefixo) — também precisa ligar essa intent
        # privilegiada no Developer Portal do bot, senão o Discord ignora.
        intents.message_content = True
        super().__init__(command_prefix="!", intents=intents, help_command=None)

        # Diferente do Banqueiro/Jornalista, o banco aqui é OPCIONAL: dados
        # e música não dependem dele. Sem DATABASE_URL (ou se a conexão
        # falhar), o bot sobe normalmente e só playlist/menu ficam
        # indisponíveis — evita que uma VLAN/env var ainda não configurada
        # derrube funções que já funcionavam sem banco nenhum.
        self.db = None
        if config.db_url_valido():
            try:
                self.db = Database(config.DATABASE_URL, startup_timeout=config.DATABASE_STARTUP_TIMEOUT)
                log.info("Conectado ao PostgreSQL compartilhado — playlist e /menu habilitados.")
            except DatabaseUnavailable as exc:
                log.error(
                    "Nao consegui conectar ao PostgreSQL (%s) — playlist e /menu ficam "
                    "indisponiveis; dados e musica seguem funcionando normalmente.",
                    exc,
                )
        else:
            log.warning(
                "DATABASE_URL nao configurada — playlist e /menu ficam indisponiveis; "
                "dados e musica seguem funcionando normalmente."
            )

    async def setup_hook(self):
        for ext in EXTENSOES:
            await self.load_extension(ext)
            log.info("Cog carregado: %s", ext)
        if config.GUILD_ID:
            guild = discord.Object(id=int(config.GUILD_ID))
            self.tree.copy_global_to(guild=guild)
            comandos = await self.tree.sync(guild=guild)
            log.info("Slash sincronizado no servidor %s (%d comandos).", config.GUILD_ID, len(comandos))
        else:
            comandos = await self.tree.sync()
            log.info("Slash sincronizado global (%d comandos).", len(comandos))

    async def on_ready(self):
        log.info("Barista online como %s.", self.user)

    async def close(self):
        try:
            await super().close()
        finally:
            if self.db is not None:
                self.db.fechar()


def main():
    if not config.token_valido():
        raise SystemExit("ERRO: DISCORD_TOKEN nao definido (veja .env.example).")
    bot = Barista()
    bot.run(config.DISCORD_TOKEN, log_handler=None)


if __name__ == "__main__":
    main()
