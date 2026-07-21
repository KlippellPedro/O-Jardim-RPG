"""
O Jardim RPG — bot Banqueiro.
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
log = logging.getLogger("banqueiro")

EXTENSOES = (
    "cogs.economia",
    "cogs.admin",
    "cogs.trocas",
    "cogs.integracao",
    "cogs.recompensas",
    "cogs.ajuda",
)


class Banqueiro(commands.Bot):
    def __init__(self):
        intents = discord.Intents.default()
        super().__init__(command_prefix="!banqueiro ", intents=intents, help_command=None)
        self.db = Database(
            config.DATABASE_URL,
            startup_timeout=config.DATABASE_STARTUP_TIMEOUT,
        )
        try:
            self.catalogo = Catalogo()
            self.platform = None
            self.recarregar_catalogo(semear_se_vazio=True)
            if config.plataforma_configurada():
                self.platform = PlatformClient(
                    config.PLATFORM_API_URL,
                    config.SERVICE_API_KEY,
                )
        except Exception:
            self.db.fechar()
            raise

    def recarregar_catalogo(self, semear_se_vazio: bool = False):
        entradas = self.db.catalogo_listar()
        origem = "PostgreSQL"

        if not entradas and semear_se_vazio:
            self.catalogo.limpar()
            n, erros = self.catalogo.carregar_arquivo(config.CATALOGO_SEED_PATH)
            if n == 0:
                detalhe = "; ".join(erros[:3]) if erros else "semente vazia"
                raise RuntimeError(f"nao foi possivel semear o catalogo: {detalhe}")
            self.db.catalogo_salvar(self.catalogo.serializar_entradas())
            entradas = self.db.catalogo_listar()
            origem = "semente inicial -> PostgreSQL"

        if not entradas:
            raise RuntimeError("a tabela catalogo_itens esta vazia")

        self.catalogo.limpar()
        n, erros = self.catalogo.carregar_dados({"entradas": entradas})
        if n == 0:
            detalhe = "; ".join(erros[:3]) if erros else "nenhuma entrada valida"
            raise RuntimeError(f"catalogo do banco invalido: {detalhe}")
        log.info("Catalogo carregado de %s: %d itens (%d avisos).", origem, n, len(erros))
        return n, erros, origem

    def republicar_catalogo(self):
        """Re-semeia o catálogo a partir do arquivo mesmo com a tabela cheia:
        faz upsert de tudo e desativa o que saiu da semente. Usado pra publicar
        adições, edições e remoções sem mexer no banco na mão."""
        semente = Catalogo()
        n, erros = semente.carregar_arquivo(config.CATALOGO_SEED_PATH)
        if n == 0:
            detalhe = "; ".join(erros[:3]) if erros else "semente vazia"
            raise RuntimeError(f"nao foi possivel ler a semente: {detalhe}")
        entradas = semente.serializar_entradas()
        self.db.catalogo_salvar(entradas)
        desativados = self.db.catalogo_desativar_ausentes([e["id"] for e in entradas])
        self.recarregar_catalogo()  # recarrega a memória a partir do banco já atualizado
        return n, desativados, erros

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
        log.info("Banqueiro online como %s.", self.user)

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
        bot = Banqueiro()
        bot.run(config.DISCORD_TOKEN, log_handler=None)
    except DatabaseUnavailable as exc:
        log.error("Falha ao iniciar banco: %s", exc)
        raise SystemExit(1) from None
    finally:
        if bot is not None:
            bot.db.fechar()


if __name__ == "__main__":
    main()
