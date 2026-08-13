"""P5 da auditoria 2026-08: Admin.cog_app_command_error duplicava o
tratamento de MissingPermissions que main.on_app_command_error já fazia.

O bug real (achado só ao ler o dispatch do discord.py antes de corrigir):
CommandTree._dispatch_error chama command._invoke_error_handlers (que inclui
o cog_app_command_error) e DEPOIS, num finally, chama self.on_error (o
handler global) de qualquer forma — mesmo que o cog já tenha respondido.
Com os dois blocos de MissingPermissions, o jogador recebia DUAS mensagens
de erro (uma do cog, outra do handler global) toda vez que um comando do
Admin era chamado sem permissão. A correção foi remover o handler do cog
por completo, deixando só o global cuidar de tudo — este teste cobre que
ele continua respondendo com a mensagem certa, e que o cog não reintroduziu
um handler próprio."""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE))

import discord

import main
from cogs.admin import Admin


class _Resposta:
    def __init__(self):
        self.mensagens = []
        self._done = False

    async def send_message(self, *args, **kwargs):
        self.mensagens.append((args, kwargs))
        self._done = True

    def is_done(self):
        return self._done


class _Followup:
    def __init__(self):
        self.mensagens = []

    async def send(self, *args, **kwargs):
        self.mensagens.append((args, kwargs))


class _Interacao:
    def __init__(self):
        self.response = _Resposta()
        self.followup = _Followup()


def test_admin_nao_define_handler_de_erro_proprio():
    # Sem isso, o handler global roda em cima do handler do cog de qualquer
    # jeito (finally do discord.py) e o jogador leva duas mensagens.
    assert "cog_app_command_error" not in vars(Admin)


def test_missing_permissions_gera_uma_unica_mensagem_pelo_handler_global():
    interacao = _Interacao()
    erro = discord.app_commands.MissingPermissions(["manage_guild"])

    asyncio.run(main.on_app_command_error(interacao, erro))

    assert len(interacao.response.mensagens) == 1
    assert len(interacao.followup.mensagens) == 0
    (args, kwargs) = interacao.response.mensagens[0]
    assert "Gerenciar Servidor" in args[0]
    assert kwargs.get("ephemeral") is True


if __name__ == "__main__":
    import pytest

    raise SystemExit(pytest.main([__file__, "-v"]))
