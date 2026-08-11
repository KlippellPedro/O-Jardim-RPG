"""Cobertura sem infraestrutura para os novos serviços do Banqueiro."""

from __future__ import annotations

import asyncio
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

from discord import app_commands

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE))

from cogs.servicos import ServicosBanco, enviar_alerta_banco
from core import economia
from core.db import Database


class _Resposta:
    def __init__(self):
        self.mensagens = []

    async def send_message(self, *args, **kwargs):
        self.mensagens.append((args, kwargs))


class _Usuario:
    def __init__(self, user_id=7):
        self.id = user_id
        self.dms = []

    async def send(self, *args, **kwargs):
        self.dms.append((args, kwargs))


class _Interacao:
    def __init__(self):
        self.guild_id = 100
        self.user = _Usuario()
        self.response = _Resposta()


class _DB:
    def __init__(self):
        self.alertas = {}
        self.seguro = None
        self.alteracoes = []

    def alerta_banco_ativo(self, guild_id, user_id, categoria, padrao=True):
        return self.alertas.get((guild_id, user_id, categoria), padrao)

    def set_alerta_banco(self, guild_id, user_id, categoria, ativo):
        self.alertas[(guild_id, user_id, categoria)] = ativo
        self.alteracoes.append((guild_id, user_id, categoria, ativo))

    def listar_alertas_banco(self, guild_id, user_id):
        return {
            categoria: ativo
            for (gid, uid, categoria), ativo in self.alertas.items()
            if gid == guild_id and uid == user_id
        }

    def get_seguro_cofre(self, guild_id, user_id):
        return self.seguro

    def diagnostico_economia(self, guild_id):
        return {
            "jogadores": 4,
            "carteira": 300,
            "cofre": 700,
            "patrimonio": 1000,
            "divida": 50,
            "top5_percent": 0.75,
            "entradas_7d": 200,
            "saidas_7d": 120,
            "roubos_7d": 2,
            "leiloes": 1,
            "emprestimos": 1,
            "investimentos": 2,
            "custodia": 90,
        }


def _cog(db):
    cog = object.__new__(ServicosBanco)
    cog.bot = type("Bot", (), {"db": db})()
    return cog


def test_abordagens_tem_trocas_reais_e_fallback_seguro():
    cuidadosa = economia.abordagem_roubo("cuidadosa")
    rapida = economia.abordagem_roubo("rapida")
    disfarcada = economia.abordagem_roubo("disfarcada")

    assert cuidadosa["timeout_mult"] > 1
    assert rapida["timeout_mult"] < 1
    assert rapida["calor"] > cuidadosa["calor"]
    assert disfarcada["oculta_identidade"] is True
    assert disfarcada["requer_preparo"] == "kit_disfarce"
    assert economia.abordagem_roubo("inexistente") is cuidadosa


def test_calor_aumenta_cooldown_reduz_chance_e_respeita_limites():
    assert economia.cooldown_com_calor(24, 0) == 24
    assert economia.cooldown_com_calor(24, 100) == 36
    assert economia.cooldown_com_calor(24, 999) == 36
    assert economia.chance_com_calor(0.60, 0) == 0.60
    assert round(economia.chance_com_calor(0.60, 100), 2) == 0.40
    assert economia.chance_com_calor(0.05, 999) == economia.ROUBO_COFRE_CHANCE_MINIMA


def test_calor_decai_apenas_por_horas_completas():
    inicio = datetime(2026, 1, 1, tzinfo=timezone.utc)
    assert Database._calor_decaido(50, inicio, inicio + timedelta(minutes=59)) == 50
    assert Database._calor_decaido(50, inicio, inicio + timedelta(hours=3)) == 35
    assert Database._calor_decaido(5, inicio, inicio + timedelta(hours=10)) == 0


def test_percentual_de_saque_reduz_abordagem_disfarcada():
    assert economia.valor_roubo_carteira(100) == 100
    assert economia.valor_roubo_carteira(100, 0.70) == 70
    assert economia.valor_roubo_carteira(0, 0.70) == 0


def test_alerta_respeita_preferencia_mas_obrigatorio_ignora_bloqueio():
    db = _DB()
    usuario = _Usuario()
    bot = type("Bot", (), {"db": db})()
    db.alertas[("100", "7", "seguranca")] = False

    assert asyncio.run(enviar_alerta_banco(bot, "100", usuario, "seguranca", "normal")) is False
    assert usuario.dms == []
    assert asyncio.run(
        enviar_alerta_banco(bot, "100", usuario, "seguranca", "defesa", obrigatorio=True)
    ) is True
    assert usuario.dms[0][0] == ("defesa",)


def test_comando_alertas_altera_categoria_e_continua_privado():
    db = _DB()
    interacao = _Interacao()
    categoria = app_commands.Choice(name="Segurança", value="seguranca")

    asyncio.run(
        ServicosBanco.alertas_banco.callback(
            _cog(db), interacao, categoria, False
        )
    )

    assert db.alteracoes == [("100", "7", "seguranca", False)]
    assert interacao.response.mensagens[0][1]["ephemeral"] is True
    descricao = interacao.response.mensagens[0][1]["embed"].description
    assert "Roubo e segurança" in descricao
    assert "obrigatória" in descricao


def test_seguro_inexistente_exibe_preco_e_cobertura_sem_cobrar():
    db = _DB()
    interacao = _Interacao()
    acao = app_commands.Choice(name="Ver", value="ver")

    asyncio.run(ServicosBanco.seguro_cofre.callback(_cog(db), interacao, acao))

    kwargs = interacao.response.mensagens[0][1]
    assert kwargs["ephemeral"] is True
    descricao = kwargs["embed"].description
    assert str(economia.SEGURO_COFRE_CUSTO) in descricao
    assert str(economia.SEGURO_COFRE_DIAS) in descricao


def test_diagnostico_economico_mostra_custodia_e_concentracao():
    db = _DB()
    interacao = _Interacao()

    asyncio.run(
        ServicosBanco.economia_diagnostico.callback(_cog(db), interacao)
    )

    kwargs = interacao.response.mensagens[0][1]
    assert kwargs["ephemeral"] is True
    descricao = kwargs["embed"].description
    assert "75.0%" in descricao
    assert "90" in descricao
