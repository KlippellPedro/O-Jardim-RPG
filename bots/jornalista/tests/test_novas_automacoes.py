"""Contratos das pautas, automações, fila, resumo e orçamento editorial."""

from __future__ import annotations

import asyncio
import sys
from datetime import datetime, timezone
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE))

from cogs import jornal as jornal_mod
from core import publicacoes
from core.db import Database, ORCAMENTO_EDITORIAL_PADRAO, _SCHEMA


def test_agendamento_aceita_formatos_documentados_e_converte_para_utc():
    primeiro = jornal_mod._parse_agendamento("10/08/2026 18:30")
    segundo = jornal_mod._parse_agendamento("2026-08-10 18:30")
    assert primeiro == segundo
    assert primeiro.tzinfo is timezone.utc
    assert jornal_mod._parse_agendamento("amanhã à noite") is None


def test_resumo_semanal_comeca_desligado_e_entrevista_ligada():
    class _DB:
        def get_clima_auto(self, _gid):
            return False

        def get_estacao_auto(self, _gid):
            return False

        def get_baus_config(self, _gid):
            return {"ativo": False}

        def automacao_ativa(self, _gid, _tipo, padrao=True):
            return padrao

    cog = object.__new__(jornal_mod.Jornal)
    cog.bot = type("Bot", (), {"db": _DB()})()
    assert cog._automacao_ativa("1", "entrevistas") is True
    assert cog._automacao_ativa("1", "resumo_semanal") is False


def test_publicacao_desativada_fica_pausada_sem_contar_como_falha():
    class _DB:
        def __init__(self):
            self.adiadas = []

        def automacao_ativa(self, _gid, _tipo, padrao=True):
            return False

        def adiar_publicacao(self, publicacao_id, minutos):
            self.adiadas.append((publicacao_id, minutos))

    db = _DB()
    bot = type("Bot", (), {"db": db})()
    item = {
        "id": 7,
        "guild_id": "1",
        "automacao": "entrevistas",
        "payload": {},
    }
    assert asyncio.run(publicacoes.tentar_publicacao(bot, item)) == "adiada"
    assert db.adiadas == [(7, 30)]


def test_publicacao_ja_reivindicada_nao_e_enviada_duas_vezes():
    class _DB:
        def automacao_ativa(self, _gid, _tipo, padrao=True):
            return True

        def reivindicar_publicacao(self, _publicacao_id):
            return None

    bot = type("Bot", (), {"db": _DB()})()
    item = {
        "id": 8, "guild_id": "1", "automacao": "entrevistas", "payload": {},
    }
    assert asyncio.run(publicacoes.tentar_publicacao(bot, item)) == "ocupada"


def test_pauta_e_persistida_antes_da_tentativa_de_entrega(monkeypatch):
    chamadas = []

    class _DB:
        def marcar_pauta_na_fila(self, pauta_id):
            chamadas.append(("fila", pauta_id))
            return True

    async def fake_tentar(_bot, publicacao):
        chamadas.append(("entregar", publicacao["id"]))
        return "entregue"

    def fake_enfileirar(_bot, _gid, **kwargs):
        chamadas.append(("persistir", kwargs["dedupe_key"]))
        return {"id": 9, "status": "pendente"}

    monkeypatch.setattr(publicacoes, "enfileirar_embed", fake_enfileirar)
    monkeypatch.setattr(publicacoes, "tentar_publicacao", fake_tentar)
    cog = object.__new__(jornal_mod.Jornal)
    cog.bot = type("Bot", (), {"db": _DB()})()
    pauta = {
        "id": 3, "guild_id": "1", "canal_id": "2", "titulo": "Teste",
        "resumo": "", "corpo": "Corpo", "autoria": "", "imagem_url": "",
    }
    resultado = asyncio.run(cog._enfileirar_pauta(pauta, agendada=False))
    assert resultado == "entregue"
    assert chamadas == [("persistir", "pauta:3"), ("fila", 3), ("entregar", 9)]


def test_resumo_informa_que_so_usa_dados_registrados():
    class _DB:
        def resumo_semanal(self, _gid, _desde):
            return {
                "entradas": 100, "saidas": 30, "jogadores": 2,
                "baus": 3, "vencedores_baus": 2, "desafios": 1,
                "premios_desafios": 20, "entrevistas": 1,
            }

    cog = object.__new__(jornal_mod.Jornal)
    cog.bot = type("Bot", (), {"db": _DB()})()
    emb = cog._montar_resumo_semanal("1")
    assert "semana" in emb.title.lower()
    assert "Somente atividades registradas" in emb.footer.text
    assert any("100" in campo.value for campo in emb.fields)


def test_banco_expoe_orcamento_e_fila_duravel():
    schema = "\n".join(_SCHEMA)
    assert ORCAMENTO_EDITORIAL_PADRAO == 1000
    assert "jornal_orcamento_movimentos" in schema
    assert "jornal_publicacoes" in schema
    assert "jornal_pautas" in schema
    assert hasattr(Database, "criar_desafio_com_orcamento")
    assert hasattr(Database, "reprocessar_publicacao")
