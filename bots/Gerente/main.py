"""O Jardim RPG — bot Gerente, consulta verificável das regras publicadas."""

from __future__ import annotations

import logging

import discord
from discord.ext import commands

from core import config
from core.conhecimento import BaseConhecimento, FontesAusentes
from core.navegacao import Navegacao

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("gerente")

EXTENSOES = ("cogs.regras", "cogs.ajuda")


class Gerente(commands.Bot):
    def __init__(self):
        intents = discord.Intents.default()
        super().__init__(
            command_prefix=commands.when_mentioned,
            intents=intents,
            help_command=None,
            allowed_mentions=discord.AllowedMentions.none(),
        )
        self.conhecimento = BaseConhecimento()
        self.navegacao = Navegacao()
        log.info(
            "Base carregada: %d trechos em %d fontes publicadas.",
            len(self.conhecimento.trechos),
            len(self.conhecimento.fontes),
        )

    async def setup_hook(self):
        for extensao in EXTENSOES:
            await self.load_extension(extensao)
            log.info("Cog carregado: %s", extensao)
        if config.GUILD_ID:
            guild = discord.Object(id=int(config.GUILD_ID))
            self.tree.copy_global_to(guild=guild)
            comandos = await self.tree.sync(guild=guild)
            log.info("Slash sincronizado no servidor %s (%d comandos).", config.GUILD_ID, len(comandos))
        else:
            comandos = await self.tree.sync()
            log.info("Slash sincronizado global (%d comandos).", len(comandos))

    async def on_ready(self):
        log.info("Gerente online como %s.", self.user)


def main():
    if not config.token_valido():
        raise SystemExit("ERRO: DISCORD_TOKEN nao definido (veja .env.example).")
    try:
        bot = Gerente()
    except FontesAusentes as exc:
        raise SystemExit(f"ERRO: {exc}") from exc
    bot.run(config.DISCORD_TOKEN, log_handler=None)


if __name__ == "__main__":
    main()
