"""/seteconomia: taxas do cofre, leilão e Loteria por servidor."""

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

    async def send_message(self, texto=None, *, ephemeral=False, **kwargs):
        self.mensagens.append((texto, ephemeral))


class _Interacao:
    def __init__(self, guild_id):
        self.guild_id = guild_id
        self.response = _Resposta()


class _DB:
    def __init__(self):
        self.chamadas_set = []
        self.config = {
            "venda_ratio": 0.5, "cofre_saque_taxa": 0.03, "juros_cofre_taxa": 0.02,
            "leilao_corte": 0.05, "loteria_preco_bilhete": 25, "loteria_corte": 0.10,
        }

    def set_economia_config(self, guild_id, **kwargs):
        self.chamadas_set.append((guild_id, kwargs))
        if kwargs.get("cofre_saque_taxa_percent") is not None:
            self.config["cofre_saque_taxa"] = kwargs["cofre_saque_taxa_percent"] / 100
        if kwargs.get("juros_cofre_taxa_percent") is not None:
            self.config["juros_cofre_taxa"] = kwargs["juros_cofre_taxa_percent"] / 100
        if kwargs.get("leilao_corte_percent") is not None:
            self.config["leilao_corte"] = kwargs["leilao_corte_percent"] / 100
        if kwargs.get("loteria_preco_bilhete") is not None:
            self.config["loteria_preco_bilhete"] = kwargs["loteria_preco_bilhete"]
        if kwargs.get("loteria_corte_percent") is not None:
            self.config["loteria_corte"] = kwargs["loteria_corte_percent"] / 100

    def get_economia_config(self, guild_id):
        return dict(self.config)


def _cog(db):
    cog = object.__new__(Admin)
    cog.bot = type("Bot", (), {"db": db})()
    return cog


def _rodar(coro):
    return asyncio.run(coro)


def test_seteconomia_atualiza_so_os_campos_informados():
    db = _DB()
    cog = _cog(db)
    interacao = _Interacao(100)

    _rodar(
        Admin.seteconomia.callback(
            cog, interacao,
            cofre_saque_taxa_percent=7, juros_cofre_taxa_percent=None, leilao_corte_percent=None,
            loteria_preco_bilhete=None, loteria_corte_percent=None,
        )
    )

    guild_id, kwargs = db.chamadas_set[0]
    assert guild_id == "100"
    assert kwargs["cofre_saque_taxa_percent"] == 7
    assert db.config["cofre_saque_taxa"] == 0.07


def test_seteconomia_responde_com_o_resumo_atualizado():
    db = _DB()
    cog = _cog(db)
    interacao = _Interacao(100)

    _rodar(
        Admin.seteconomia.callback(
            cog, interacao,
            cofre_saque_taxa_percent=10, juros_cofre_taxa_percent=None, leilao_corte_percent=None,
            loteria_preco_bilhete=50, loteria_corte_percent=None,
        )
    )

    texto, ephemeral = interacao.response.mensagens[0]
    assert "10%" in texto
    assert "50" in texto
    assert ephemeral is True


if __name__ == "__main__":
    import pytest

    raise SystemExit(pytest.main([__file__, "-v"]))
