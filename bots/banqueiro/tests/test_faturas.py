"""Interface e ciclo de vencimento das faturas, sem depender de PostgreSQL."""

from __future__ import annotations

import asyncio
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import AsyncMock, patch

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE))

from cogs.recompensas import Recompensas


class _Resposta:
    def __init__(self):
        self.mensagens = []

    async def send_message(self, texto=None, *, embed=None, ephemeral=False, **_kwargs):
        self.mensagens.append((texto, embed, ephemeral))


class _Interacao:
    def __init__(self):
        self.guild_id = 1
        self.user = type("Usuario", (), {"id": 2, "mention": "<@2>"})()
        self.response = _Resposta()


class _DB:
    def __init__(self, divida_total=45):
        self.extratos = []
        self.avisos = []
        self.divida_total = divida_total
        self.recompensa_sistema = False
        self.recompensas = []

    def garantir_jogador(self, _guild_id, _user_id):
        pass

    def listar_faturas_pendentes(self, _guild_id, _user_id):
        return [
            {
                "id": 7,
                "descricao": "Compra: Espada",
                "valor_original": 80,
                "valor_pendente": 30,
                "criado_em": datetime.now(timezone.utc),
                "vence_em": datetime.now(timezone.utc) + timedelta(days=4),
            }
        ]

    def pagar_faturas(self, _guild_id, _user_id, _quantia):
        return {"pago": 30, "restante": 0, "saldo": 70, "reputacao_ganha": 4}

    def registrar_extrato(self, *args):
        self.extratos.append(args)

    def converter_faturas_vencidas(self, guild_id):
        if guild_id != "1":
            return []
        self.avisos.append(
            (guild_id, "⚠️ A fatura de <@2> venceu. ☾ **45 Lunaris** não pagos viraram dívida.")
        )
        return [{"user_id": "2", "valor": 45, "faturas": 1, "divida_total": self.divida_total}]

    def criar_aviso(self, guild_id, mensagem):
        self.avisos.append((guild_id, mensagem))

    def get_mestre_protegido(self, _guild_id):
        return None

    def get_recompensa(self, _guild_id, _user_id):
        return {"tem_sistema": self.recompensa_sistema}

    def adicionar_recompensa(self, guild_id, user_id, valor, *, sistema):
        self.recompensa_sistema = sistema
        self.recompensas.append((guild_id, user_id, valor, sistema))


def _cog(db):
    cog = object.__new__(Recompensas)
    cog.bot = type("Bot", (), {"db": db, "guilds": [type("Guild", (), {"id": 1})()]})()
    return cog


def test_fatura_mostra_valor_e_vencimento_privadamente():
    db = _DB()
    cog = _cog(db)
    interaction = _Interacao()

    asyncio.run(Recompensas.fatura.callback(cog, interaction))

    texto, embed, ephemeral = interaction.response.mensagens[0]
    assert texto is None
    assert ephemeral is True
    assert "Compra: Espada" in embed.description
    assert "☾ **30**" in embed.description
    assert "<t:" in embed.description


def test_quitacao_pontual_informa_reputacao_ganha():
    db = _DB()
    cog = _cog(db)
    interaction = _Interacao()

    asyncio.run(Recompensas.fatura_pagar.callback(cog, interaction, 30))

    _texto, embed, ephemeral = interaction.response.mensagens[0]
    assert ephemeral is True
    assert "+4 de reputação bancária" in embed.description
    assert db.extratos


def test_ciclo_converte_vencimento_e_cria_aviso():
    db = _DB()
    cog = _cog(db)

    asyncio.run(Recompensas.ciclo_faturas.coro(cog))

    assert db.avisos
    assert "45 Lunaris" in db.avisos[0][1]
    assert "viraram dívida" in db.avisos[0][1]


def test_fatura_vencida_acima_do_limiar_vira_procurado_sem_esperar_tick_diario():
    db = _DB(divida_total=180)
    cog = _cog(db)

    with patch(
        "cogs.recompensas.cargos_mod.sincronizar_mais_procurado",
        new=AsyncMock(),
    ) as sincronizar:
        asyncio.run(Recompensas.ciclo_faturas.coro(cog))

    assert db.recompensas == [("1", "2", 180, True)]
    assert any("**Procurado!**" in mensagem for _gid, mensagem in db.avisos)
    sincronizar.assert_awaited_once()


def test_promocao_a_procurado_e_idempotente():
    db = _DB(divida_total=180)
    cog = _cog(db)

    with patch(
        "cogs.recompensas.cargos_mod.sincronizar_mais_procurado",
        new=AsyncMock(),
    ):
        primeira = asyncio.run(cog._promover_a_procurado("1", "2", 180))
        segunda = asyncio.run(cog._promover_a_procurado("1", "2", 180))

    assert primeira is True
    assert segunda is False
    assert len(db.recompensas) == 1
