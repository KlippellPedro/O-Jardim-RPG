"""Configuração segura do Gerente via variáveis de ambiente."""

from __future__ import annotations

import os

from dotenv import load_dotenv

load_dotenv()

DISCORD_TOKEN = os.getenv("DISCORD_TOKEN")
GUILD_ID = os.getenv("GUILD_ID") or None


def token_valido() -> bool:
    return bool(DISCORD_TOKEN and DISCORD_TOKEN.strip())
