"""
Configuração do bot Barista. Lê variáveis de ambiente (.env).
Segurança: o TOKEN NUNCA é hardcoded — vem só do ambiente. Se faltar,
o main.py aborta com mensagem clara (fail-closed), em vez de rodar inseguro.
"""

from __future__ import annotations

import os
from pathlib import Path

# Carrega .env se python-dotenv estiver instalado (opcional em produção,
# onde as variáveis podem já vir do painel de hospedagem).
try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass

DISCORD_TOKEN = os.getenv("DISCORD_TOKEN")

# Mesmo PostgreSQL central do Banqueiro/Jornalista (VLAN da Discloud).
# Opcional pro Barista: sem isso, dados e música continuam funcionando
# normalmente — só playlist e /menu ficam desabilitados (ver main.py).
DATABASE_URL = os.getenv("DATABASE_URL")

# Opcional: ID do servidor de testes pra sincronizar slash commands na hora.
GUILD_ID = os.getenv("GUILD_ID") or None

# Opcional: caminho de um cookies.txt de uma conta YouTube logada. Com ele, o
# Barista toca do YouTube direto (contorna a verificação anti-bot que o YouTube
# dispara contra IPs de datacenter, como o da Discloud). Sem cookies, cai no
# SoundCloud. Aponte YOUTUBE_COOKIES pro arquivo, ou deixe um cookies.txt na
# raiz do bot.
YOUTUBE_COOKIES = os.getenv("YOUTUBE_COOKIES") or None
_BOT_DIR = Path(__file__).resolve().parent.parent


def _eh_arquivo(caminho: str) -> bool:
    """is_file() sem explodir se o valor não for um caminho válido — ex.: alguém
    colou o CONTEÚDO do cookies.txt numa variável em vez do caminho (aí o valor
    é enorme e o os.stat levanta OSError 'File name too long' no Linux)."""
    try:
        return bool(caminho) and Path(caminho).is_file()
    except (OSError, ValueError):
        return False


def youtube_cookies_path() -> str | None:
    """Caminho do cookies.txt do YouTube, se existir: env YOUTUBE_COOKIES com o
    CAMINHO do arquivo, ou um cookies.txt na raiz do bot. None quando não há —
    aí a busca usa SoundCloud. Nunca crasha por um valor inválido (fail-open)."""
    if _eh_arquivo(YOUTUBE_COOKIES):
        return YOUTUBE_COOKIES
    padrao = str(_BOT_DIR / "cookies.txt")
    return padrao if _eh_arquivo(padrao) else None


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


def token_valido() -> bool:
    return bool(DISCORD_TOKEN and DISCORD_TOKEN.strip())


def db_url_valido() -> bool:
    return bool(DATABASE_URL and DATABASE_URL.strip())
