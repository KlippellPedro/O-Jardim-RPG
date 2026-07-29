"""/perfil (novo), /ranking (agora com categoria) e /extrato (agora
paginado): estatísticas que a tabela `extrato` sempre teve mas nenhum
comando agregava — só existia o ranking simples de carteira."""

from __future__ import annotations

import asyncio
import sys
from datetime import datetime, timezone
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE))

from cogs.economia import Economia
from core.ui import Paginador


class _Resposta:
    def __init__(self):
        self.mensagens = []

    async def send_message(self, texto=None, *, embed=None, view=None, ephemeral=False, **kwargs):
        self.mensagens.append((texto, embed, view, ephemeral))


class _Interacao:
    def __init__(self, guild_id, user_id, display_name="Fulano"):
        self.guild_id = guild_id
        self.user = type("Usuario", (), {"id": user_id, "display_name": display_name})()
        self.response = _Resposta()


class _DB:
    def __init__(self):
        self.carteira = {}
        self.cofre_saldo = {}
        self.resumo = {"por_moeda": {}, "roubou": 0, "foi_roubado": 0, "recompensas_coletadas": 0}
        self.leiloes_vencidos = 0
        self.extrato_rows = []
        self.top_carteiras_ret = []
        self.top_poupanca_ret = []
        self.top_patrimonio_ret = []
        self.top_roubos_ret = []
        self.top_recompensas_ret = []
        self.top_leiloes_ret = []

    def garantir_jogador(self, g, u):
        pass

    def get_carteira(self, g, u):
        return dict(self.carteira)

    def get_cofre_saldo(self, g, u):
        return dict(self.cofre_saldo)

    def get_cofre_tier(self, g, u):
        return "comum"

    def get_seguranca_tier(self, g, u):
        return "basica"

    def get_config_roubo(self, g):
        return {"chance_base": 0.5}

    def get_mestre_protegido(self, g):
        return None

    def resumo_extrato(self, g, u):
        return self.resumo

    def contar_leiloes_vencidos(self, g, u):
        return self.leiloes_vencidos

    def listar_extrato(self, g, u, limite=100):
        return list(self.extrato_rows)[:limite]

    def top_carteiras(self, g, moeda, limite=10):
        return self.top_carteiras_ret

    def top_poupanca(self, g, moeda, limite=10):
        return self.top_poupanca_ret

    def top_patrimonio(self, g, limite=10):
        return self.top_patrimonio_ret

    def top_roubos(self, g, limite=10):
        return self.top_roubos_ret

    def top_recompensas(self, g, limite=10):
        return self.top_recompensas_ret

    def top_leiloes_vendidos(self, g, limite=10):
        return self.top_leiloes_ret


class _Inventario:
    def __init__(self, qtd=0, itens=None):
        self.qtd = qtd
        self.itens = itens or []

    async def contar(self, g, u):
        return self.qtd

    async def listar(self, g, u):
        return list(self.itens)


def _cog(db, inventario=None):
    cog = object.__new__(Economia)
    cog.bot = type("Bot", (), {"db": db, "inventario": inventario or _Inventario()})()
    return cog


def _rodar(coro):
    return asyncio.run(coro)


# ── /perfil ───────────────────────────────────────────────────────────────

def test_perfil_mostra_carteira_cofre_e_resumo():
    db = _DB()
    db.carteira = {"Lunaris": 100}
    db.cofre_saldo = {"Lunaris": 50}
    db.resumo = {
        "por_moeda": {"Lunaris": {"ganhos": 300, "perdas": 120}},
        "roubou": 40,
        "foi_roubado": 10,
        "recompensas_coletadas": 25,
    }
    db.leiloes_vencidos = 3
    cog = _cog(db, inventario=_Inventario(qtd=7))
    interacao = _Interacao(100, 1)

    _rodar(Economia.perfil.callback(cog, interacao))

    texto, embed, view, ephemeral = interacao.response.mensagens[0]
    campos = {f.name: f.value for f in embed.fields}
    assert "100" in campos["Carteira"]
    assert "50" in campos["Cofre bancário"]
    assert campos["Itens no cofre"] == "7"
    assert campos["Leilões vencidos"] == "3"
    assert "25" in campos["Recompensas coletadas"]
    assert "300" in campos["Ganhos em Lunaris na vida"]
    assert "120" in campos["Perdas em Lunaris na vida"]
    assert "40" in campos["Roubou de outros"]
    assert "10" in campos["Foi roubado"]


def test_cofre_lista_itens_e_separa_capacidades_sem_barras_quebradas():
    db = _DB()
    db.cofre_saldo = {"Lunaris": 30}
    itens = [
        type("Item", (), {"titulo": "Espada Lunar", "quantidade": 2})(),
        type("Item", (), {"titulo": "Poção", "quantidade": 1})(),
    ]
    cog = _cog(db, inventario=_Inventario(qtd=3, itens=itens))
    interacao = _Interacao(100, 1)

    _rodar(Economia.cofre.callback(cog, interacao))

    _, embed, _, _ = interacao.response.mensagens[0]
    texto = "\n".join(f"{campo.name}\n{campo.value}" for campo in embed.fields)
    assert "Espada Lunar" in texto and "Poção" in texto
    assert "3/10" in texto
    assert "30 / 500" in texto
    assert "1.500 por moeda" in texto
    assert "▰" not in texto and "▱" not in texto


# ── /ranking ──────────────────────────────────────────────────────────────

def test_ranking_padrao_e_carteira():
    db = _DB()
    db.top_carteiras_ret = [{"user_id": "1", "saldo": 500}]
    cog = _cog(db)
    interacao = _Interacao(100, 1)

    _rodar(Economia.ranking.callback(cog, interacao, categoria=None, moeda=None))

    texto, embed, view, ephemeral = interacao.response.mensagens[0]
    assert "Carteira" in embed.title
    assert "500" in embed.description


def test_ranking_patrimonio():
    import discord

    db = _DB()
    db.top_patrimonio_ret = [{"user_id": "1", "total": 900}]
    cog = _cog(db)
    interacao = _Interacao(100, 1)
    categoria = discord.app_commands.Choice(name="Patrimônio", value="patrimonio")

    _rodar(Economia.ranking.callback(cog, interacao, categoria=categoria, moeda=None))

    texto, embed, view, ephemeral = interacao.response.mensagens[0]
    assert "Patrimônio" in embed.title
    assert "900" in embed.description


def test_ranking_roubos():
    import discord

    db = _DB()
    db.top_roubos_ret = [{"user_id": "1", "quantidade": 5}]
    cog = _cog(db)
    interacao = _Interacao(100, 1)
    categoria = discord.app_commands.Choice(name="Roubos", value="roubos")

    _rodar(Economia.ranking.callback(cog, interacao, categoria=categoria, moeda=None))

    texto, embed, view, ephemeral = interacao.response.mensagens[0]
    assert "5 roubo(s)" in embed.description


def test_ranking_recompensas():
    import discord

    db = _DB()
    db.top_recompensas_ret = [{"user_id": "1", "total": 200}]
    cog = _cog(db)
    interacao = _Interacao(100, 1)
    categoria = discord.app_commands.Choice(name="Recompensas", value="recompensas")

    _rodar(Economia.ranking.callback(cog, interacao, categoria=categoria, moeda=None))

    texto, embed, view, ephemeral = interacao.response.mensagens[0]
    assert "200" in embed.description


def test_ranking_leilao():
    import discord

    db = _DB()
    db.top_leiloes_ret = [{"user_id": "1", "quantidade": 2}]
    cog = _cog(db)
    interacao = _Interacao(100, 1)
    categoria = discord.app_commands.Choice(name="Leilão", value="leilao")

    _rodar(Economia.ranking.callback(cog, interacao, categoria=categoria, moeda=None))

    texto, embed, view, ephemeral = interacao.response.mensagens[0]
    assert "2 venda(s)" in embed.description


def test_ranking_vazio_avisa_efemero():
    db = _DB()
    cog = _cog(db)
    interacao = _Interacao(100, 1)

    _rodar(Economia.ranking.callback(cog, interacao, categoria=None, moeda=None))

    texto, embed, view, ephemeral = interacao.response.mensagens[0]
    assert embed is None
    assert ephemeral is True


# ── /extrato ──────────────────────────────────────────────────────────────

def _linha_extrato(i):
    return {"delta": i, "moeda": "Lunaris", "descricao": f"Transação {i}", "criado_em": datetime(2026, 1, 1, tzinfo=timezone.utc)}


def test_extrato_uma_pagina_nao_usa_paginador():
    db = _DB()
    db.extrato_rows = [_linha_extrato(i) for i in range(5)]
    cog = _cog(db)
    interacao = _Interacao(100, 1)

    _rodar(Economia.extrato.callback(cog, interacao, membro=None))

    texto, embed, view, ephemeral = interacao.response.mensagens[0]
    assert view is None
    assert embed is not None


def test_extrato_multiplas_paginas_usa_paginador():
    db = _DB()
    db.extrato_rows = [_linha_extrato(i) for i in range(30)]
    cog = _cog(db)
    interacao = _Interacao(100, 1)

    _rodar(Economia.extrato.callback(cog, interacao, membro=None))

    texto, embed, view, ephemeral = interacao.response.mensagens[0]
    assert isinstance(view, Paginador)
    assert len(view.paginas) == 2


if __name__ == "__main__":
    import pytest

    raise SystemExit(pytest.main([__file__, "-v"]))
