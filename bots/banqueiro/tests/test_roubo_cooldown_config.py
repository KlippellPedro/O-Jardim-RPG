"""/setroubo cooldown_horas descrevia "as regras de /roubar_cofre neste
servidor", mas /roubar sempre ignorou a configuração e usava a constante
ROUBO_COOLDOWN_HORAS do código — só /roubar_cofre respeitava /setroubo.
Cobre que /roubar agora usa db.get_config_roubo(...)["cooldown_horas"]."""

from __future__ import annotations

import asyncio
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE))

from cogs.economia import Economia


class _Resposta:
    def __init__(self):
        self.mensagens = []
        self._done = False

    async def send_message(self, *args, **kwargs):
        self.mensagens.append((args, kwargs))
        self._done = True

    def is_done(self):
        return self._done


class _Interacao:
    def __init__(self, guild_id, user_id):
        self.guild_id = guild_id
        self.response = _Resposta()
        self.user = type("Usuario", (), {"id": user_id, "mention": f"<@{user_id}>"})()


class _Membro:
    def __init__(self, id):
        self.id = id
        self.mention = f"<@{id}>"
        self.bot = False
        self.display_name = f"User{id}"


class _DB:
    def __init__(self, *, cooldown_horas):
        self.cooldown_horas = cooldown_horas
        self.chamadas_reserva = []

    def garantir_jogador(self, g, u):
        pass

    def get_config_roubo(self, guild_id):
        return {"chance_base": 0.5, "cooldown_horas": self.cooldown_horas}

    def get_calor_roubo(self, *_args):
        return 0

    def get_mestre_protegido(self, guild_id):
        return "999"  # igual ao alvo: força o ramo de punição (early return)

    def reservar_tentativa_roubo(self, guild_id, user_id, agora, proxima):
        self.chamadas_reserva.append((agora, proxima))
        return True, proxima

    def penalizar_tentativa_contra_mestre(self, guild_id, uid, alvo_id):
        return True


def _cog(db):
    cog = object.__new__(Economia)
    cog.bot = type("Bot", (), {"db": db})()
    return cog


def _rodar(coro):
    return asyncio.run(coro)


def test_roubar_usa_o_cooldown_configurado_por_setroubo():
    db = _DB(cooldown_horas=72)  # valor não-padrão: só passa se vier do config
    cog = _cog(db)
    interacao = _Interacao(100, 1)
    membro = _Membro(999)

    antes = datetime.now(timezone.utc)
    _rodar(Economia.roubar.callback(cog, interacao, membro))
    depois = datetime.now(timezone.utc)

    assert len(db.chamadas_reserva) == 1
    agora, proxima = db.chamadas_reserva[0]
    delta_horas = (proxima - agora).total_seconds() / 3600
    assert delta_horas == 72
    assert antes <= agora <= depois


def test_roubar_respeita_cooldown_diferente_por_servidor():
    db = _DB(cooldown_horas=3)
    cog = _cog(db)
    interacao = _Interacao(100, 1)
    membro = _Membro(999)

    _rodar(Economia.roubar.callback(cog, interacao, membro))

    agora, proxima = db.chamadas_reserva[0]
    assert (proxima - agora) == timedelta(hours=3)


if __name__ == "__main__":
    import pytest

    raise SystemExit(pytest.main([__file__, "-v"]))
