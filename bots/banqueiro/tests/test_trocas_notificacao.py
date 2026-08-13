"""B2 Tarefa 5: `/oferecer` e `/trocar` só avisavam o alvo por menção
pública no canal — quem não estivesse olhando aquele canal na hora não
percebia a proposta. A infraestrutura de DM opt-in (`enviar_alerta_banco`,
categoria "mercado", já rotulada "Leilões e trocas" em `ALERTAS`) já existia
e já era usada por leilão (`cogs/mercado.py`); só faltava chamá-la aqui.

Este teste cobre só a chamada e os parâmetros do alerta (categoria, alvo,
guild) — o comportamento do próprio `enviar_alerta_banco` (respeita opt-in,
nunca derruba a operação principal) já tem cobertura própria em
tests/test_melhorias_banqueiro.py."""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE))

import cogs.trocas as trocas_mod
from cogs.trocas import Trocas


class _Resposta:
    def __init__(self):
        self.mensagens = []

    async def send_message(self, *args, **kwargs):
        self.mensagens.append((args, kwargs))


class _Mensagem:
    pass


class _Guild:
    name = "Servidor de Teste"


class _Usuario:
    def __init__(self, id_, display_name="Ofertante"):
        self.id = id_
        self.display_name = display_name
        self.mention = f"<@{id_}>"
        self.bot = False


class _Interacao:
    def __init__(self, autor_id=1, guild_id=100):
        self.guild_id = guild_id
        self.guild = _Guild()
        self.user = _Usuario(autor_id, "Ofertante")
        self.response = _Resposta()

    async def original_response(self):
        return _Mensagem()


class _DB:
    def __init__(self):
        self.jogadores_garantidos = []

    def garantir_jogador(self, guild_id, user_id):
        self.jogadores_garantidos.append((guild_id, user_id))

    def contar_bau(self, guild_id, user_id, bau_id):
        return 1  # ofertante sempre tem o baú nestes testes


def _cog(db):
    cog = object.__new__(Trocas)
    cog.bot = type("Bot", (), {"db": db, "inventario": None})()
    return cog


def test_oferecer_notifica_o_alvo_por_dm_na_categoria_mercado(monkeypatch):
    chamadas = []

    async def _fake_alerta(bot, guild_id, usuario, categoria, texto):
        chamadas.append((guild_id, usuario, categoria, texto))
        return True

    monkeypatch.setattr(trocas_mod, "enviar_alerta_banco", _fake_alerta)

    cog = _cog(_DB())
    interacao = _Interacao(autor_id=1)
    alvo = _Usuario(2, "Alvo")

    asyncio.run(
        cog.oferecer.callback(
            cog, interacao, alvo, "bau:geral-comum",
            preco=50, moeda=None,
        )
    )

    assert len(chamadas) == 1
    guild_id, usuario, categoria, texto = chamadas[0]
    assert guild_id == "100"
    assert usuario is alvo
    assert categoria == "mercado"
    assert "Ofertante" in texto
    assert "50" in texto


def test_trocar_notifica_o_alvo_por_dm_na_categoria_mercado(monkeypatch):
    chamadas = []

    async def _fake_alerta(bot, guild_id, usuario, categoria, texto):
        chamadas.append((guild_id, usuario, categoria, texto))
        return True

    monkeypatch.setattr(trocas_mod, "enviar_alerta_banco", _fake_alerta)

    cog = _cog(_DB())
    interacao = _Interacao(autor_id=1)
    alvo = _Usuario(2, "Proponente-alvo")

    asyncio.run(
        cog.trocar.callback(
            cog, interacao, alvo, "bau:geral-comum", "bau:geral-comum",
        )
    )

    assert len(chamadas) == 1
    guild_id, usuario, categoria, texto = chamadas[0]
    assert guild_id == "100"
    assert usuario is alvo
    assert categoria == "mercado"


def test_oferecer_ainda_manda_a_mensagem_publica_de_sempre(monkeypatch):
    """A DM é um extra, não uma substituição: a menção pública no canal
    continua sendo enviada do mesmo jeito."""
    async def _fake_alerta(*a, **k):
        return True

    monkeypatch.setattr(trocas_mod, "enviar_alerta_banco", _fake_alerta)

    cog = _cog(_DB())
    interacao = _Interacao(autor_id=1)
    alvo = _Usuario(2, "Alvo")

    asyncio.run(
        cog.oferecer.callback(
            cog, interacao, alvo, "bau:geral-comum",
            preco=50, moeda=None,
        )
    )

    assert len(interacao.response.mensagens) == 1
    args, kwargs = interacao.response.mensagens[0]
    assert kwargs["content"] == alvo.mention
    assert "view" in kwargs


def test_oferta_para_si_mesmo_nao_chega_a_notificar(monkeypatch):
    """Guarda de validação existente (não pode ofertar pra si mesmo) roda
    antes de qualquer notificação — não deve chamar o alerta."""
    chamadas = []

    async def _fake_alerta(*a, **k):
        chamadas.append(a)
        return True

    monkeypatch.setattr(trocas_mod, "enviar_alerta_banco", _fake_alerta)

    cog = _cog(_DB())
    interacao = _Interacao(autor_id=1)
    mesmo = _Usuario(1, "Ofertante")

    asyncio.run(
        cog.oferecer.callback(
            cog, interacao, mesmo, "bau:geral-comum",
            preco=50, moeda=None,
        )
    )

    assert chamadas == []


if __name__ == "__main__":
    import pytest

    raise SystemExit(pytest.main([__file__, "-v"]))
