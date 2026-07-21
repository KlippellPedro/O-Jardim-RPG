"""
Configuração do bot Jornalista. Lê variáveis de ambiente (.env).
Segurança: o TOKEN NUNCA é hardcoded — vem só do ambiente. Se faltar,
o main.py aborta com mensagem clara (fail-closed), em vez de rodar inseguro.
"""

from __future__ import annotations

import os

# Carrega .env se python-dotenv estiver instalado (opcional em produção,
# onde as variáveis podem já vir do painel de hospedagem).
try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass

# Token do bot — validado no main (não no import, pra não quebrar os testes).
DISCORD_TOKEN = os.getenv("DISCORD_TOKEN")

# Mesmo PostgreSQL central do Banqueiro (VLAN da Discloud). O Jornalista só
# le/grava as tabelas que precisa pra anunciar e entregar baús.
DATABASE_URL = os.getenv("DATABASE_URL")


def _int_env(nome: str, padrao: int, minimo: int, maximo: int) -> int:
    raw = os.getenv(nome)
    if raw is None:
        return padrao
    try:
        valor = int(raw)
    except ValueError:
        return padrao
    return max(minimo, min(maximo, valor))


DATABASE_STARTUP_TIMEOUT = _int_env("DATABASE_STARTUP_TIMEOUT", 12, 5, 60)
PLATFORM_API_URL = (os.getenv("PLATFORM_API_URL") or "").strip().rstrip("/") or None
SERVICE_API_KEY = (os.getenv("SERVICE_API_KEY") or "").strip() or None

# Opcional: ID do servidor de testes pra sincronizar slash commands na hora.
GUILD_ID = os.getenv("GUILD_ID") or None


def token_valido() -> bool:
    return bool(DISCORD_TOKEN and DISCORD_TOKEN.strip())


def db_url_valido() -> bool:
    return bool(DATABASE_URL and DATABASE_URL.strip())


def plataforma_configurada() -> bool:
    return bool(
        PLATFORM_API_URL
        and SERVICE_API_KEY
        and len(SERVICE_API_KEY) >= 32
    )
