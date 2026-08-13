"""B2 Tarefa 4: `/banco_status`, painel de diagnóstico do mestre espelhando
`/jornal status` do Jornalista — hoje o Banqueiro tinha mais superfície de
configuração (câmbio, roubo, taxas, catálogo) do que qualquer painel único
pra consultar tudo de uma vez. `/economia_diagnostico` já existe, mas mostra
métricas financeiras (circulação, dívida, concentração), não configuração."""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE))

from cogs.admin import Admin


class _Resposta:
    def __init__(self):
        self.mensagens = []

    async def send_message(self, *args, **kwargs):
        self.mensagens.append((args, kwargs))


class _Interacao:
    def __init__(self, guild_id=100):
        self.guild_id = guild_id
        self.response = _Resposta()


class _DB:
    def get_cambio(self, guild_id):
        return 100, 0.05

    def get_cambio_auto(self, guild_id):
        return True

    def get_config_roubo(self, guild_id):
        return {"chance_base": 0.35, "cooldown_horas": 12}

    def get_economia_config(self, guild_id):
        return {
            "cofre_saque_taxa": 0.03,
            "juros_cofre_taxa": 0.02,
            "leilao_corte": 0.1,
            "loteria_preco_bilhete": 10,
            "loteria_corte": 0.2,
        }


class _Catalogo:
    def listar(self):
        return [object(), object(), object()]


def _cog(db, catalogo):
    cog = object.__new__(Admin)
    cog.bot = type("Bot", (), {"db": db, "catalogo": catalogo})()
    return cog


def test_banco_status_mostra_cambio_roubo_taxas_e_catalogo():
    cog = _cog(_DB(), _Catalogo())
    interacao = _Interacao()

    asyncio.run(cog.banco_status.callback(cog, interacao))

    assert len(interacao.response.mensagens) == 1
    _args, kwargs = interacao.response.mensagens[0]
    assert kwargs.get("ephemeral") is True
    emb = kwargs["embed"]
    campos = {campo.name: campo.value for campo in emb.fields}

    assert "💱 Câmbio" in campos
    assert "100 Lunaris" in campos["💱 Câmbio"]
    assert "5.0%" in campos["💱 Câmbio"]
    assert "ligado" in campos["💱 Câmbio"]

    assert "🥷 Roubo" in campos
    assert "35.0%" in campos["🥷 Roubo"]
    assert "12h" in campos["🥷 Roubo"]

    assert "💰 Taxas" in campos
    assert "3%" in campos["💰 Taxas"]
    assert "2%/dia" in campos["💰 Taxas"]
    assert "10%" in campos["💰 Taxas"]
    assert "☾ **10**" in campos["💰 Taxas"]
    assert "20%" in campos["💰 Taxas"]

    assert "📦 Catálogo" in campos
    assert "3" in campos["📦 Catálogo"]


def test_banco_status_reflete_cambio_automatico_desligado():
    class _DBDesligado(_DB):
        def get_cambio_auto(self, guild_id):
            return False

    cog = _cog(_DBDesligado(), _Catalogo())
    interacao = _Interacao()

    asyncio.run(cog.banco_status.callback(cog, interacao))

    _args, kwargs = interacao.response.mensagens[0]
    campos = {campo.name: campo.value for campo in kwargs["embed"].fields}
    assert "desligado" in campos["💱 Câmbio"]


def test_banco_status_sem_catalogo_carregado_nao_quebra():
    cog = _cog(_DB(), None)
    interacao = _Interacao()

    asyncio.run(cog.banco_status.callback(cog, interacao))

    _args, kwargs = interacao.response.mensagens[0]
    campos = {campo.name: campo.value for campo in kwargs["embed"].fields}
    assert "0" in campos["📦 Catálogo"]


if __name__ == "__main__":
    import pytest

    raise SystemExit(pytest.main([__file__, "-v"]))
