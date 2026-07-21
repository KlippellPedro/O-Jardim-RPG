"""
O Jardim RPG — bot Jornalista.
Anuncia baús que aparecem sozinhos pelo servidor (loot aleatório) e publica
os avisos que o Banqueiro enfileira (recompensas, procurados por dívida,
capturas) no canal do jornal. Toda a economia (carteira, loja, cofre,
cartão, roubo) mora no Banqueiro; o Jornalista só entrega/anuncia.
Ponto de entrada. Roda com: python main.py  (com o .env preenchido).
"""

from __future__ import annotations

import logging

import discord
from discord.ext import commands

from core import config
from core.db import Database, DatabaseUnavailable
from core.catalogo import Catalogo
from core.platform_api import PlatformClient

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("jornalista")

EXTENSOES = (
    "cogs.baus",
    "cogs.avisos",
    "cogs.jornal",
    "cogs.registro",
    "cogs.boasvindas",
    "cogs.ajuda",
)


class Jornalista(commands.Bot):
    def __init__(self):
        intents = discord.Intents.default()
        # Privilegiada: precisa pra on_member_join/on_member_remove (Passo 4)
        # e pra checar cargos do jogador no registro por Árvore (Passo 5).
        # Também precisa ser ligada no Developer Portal (Bot > Privileged
        # Gateway Intents > Server Members Intent), senão o bot recusa
        # conectar — mesma pegadinha do Barista com Message Content.
        intents.members = True
        super().__init__(command_prefix="!jornalista ", intents=intents, help_command=None)
        self.db = Database(
            config.DATABASE_URL,
            startup_timeout=config.DATABASE_STARTUP_TIMEOUT,
        )
        try:
            self.catalogo = Catalogo()
            self.platform = None
            self.recarregar_catalogo()
            if config.plataforma_configurada():
                self.platform = PlatformClient(
                    config.PLATFORM_API_URL,
                    config.SERVICE_API_KEY,
                )
        except Exception:
            self.db.fechar()
            raise

    def recarregar_catalogo(self):
        """O Jornalista só lê o catálogo central — quem semeia é o Banqueiro
        (ou o site). Um catálogo vazio não é erro aqui, só um aviso: os baús
        ainda dão Lunaris mesmo sem item nenhum pra sortear."""
        entradas = self.db.catalogo_listar()
        self.catalogo.limpar()
        n, erros = self.catalogo.carregar_dados({"entradas": entradas})
        if not entradas:
            log.warning("catalogo_itens ainda esta vazia (aguardando o Banqueiro semear)")
        elif n == 0:
            detalhe = "; ".join(erros[:3]) if erros else "nenhuma entrada valida"
            log.warning("catalogo do banco invalido: %s", detalhe)
        else:
            log.info("Catalogo carregado do PostgreSQL: %d itens (%d avisos).", n, len(erros))
        return n, erros

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
        log.info("Jornalista online como %s.", self.user)

    async def close(self):
        try:
            if self.platform is not None:
                await self.platform.close()
            await super().close()
        finally:
            self.db.fechar()


def main():
    if not config.token_valido():
        raise SystemExit("ERRO: DISCORD_TOKEN nao definido (veja .env.example).")
    if not config.db_url_valido():
        raise SystemExit("ERRO: DATABASE_URL nao definido (veja .env.example).")
    bot = None
    try:
        bot = Jornalista()
        bot.run(config.DISCORD_TOKEN, log_handler=None)
    except DatabaseUnavailable as exc:
        log.error("Falha ao iniciar banco: %s", exc)
        raise SystemExit(1) from None
    finally:
        if bot is not None:
            bot.db.fechar()


if __name__ == "__main__":
    main()
