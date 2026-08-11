"""Sorteio da Loteria Dominical: pagamento, encerramento da rodada e sorteio ponderado.

A regressão que motivou estes testes: `registrar_extrato` não existia no
Database do Jornalista, então o sorteio pagava o vencedor, estourava
AttributeError e **nunca limpava os bilhetes**: o mesmo bolo era sorteado e
pago de novo todo domingo, pra sempre.
"""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE))

from cogs.loteria import Loteria, sortear_vencedor
from core.db import Database, LOTERIA_CORTE_CASA_PADRAO, LOTERIA_PRECO_BILHETE_PADRAO

LOTERIA_PRECO_BILHETE = LOTERIA_PRECO_BILHETE_PADRAO
LOTERIA_CORTE_CASA = LOTERIA_CORTE_CASA_PADRAO


class _DBFake:
    def __init__(self, bilhetes):
        self._bilhetes = list(bilhetes)
        self.chamadas = []

    def listar_bilhetes_loteria(self, guild_id):
        return list(self._bilhetes)

    def get_loteria_config(self, guild_id):
        return {"preco_bilhete": LOTERIA_PRECO_BILHETE_PADRAO, "corte": LOTERIA_CORTE_CASA_PADRAO}

    def creditar(self, guild_id, user_id, moeda, quantia):
        self.chamadas.append(("creditar", user_id, moeda, quantia))
        return quantia

    def limpar_bilhetes_loteria(self, guild_id):
        self.chamadas.append(("limpar", guild_id))
        self._bilhetes = []

    def registrar_extrato(self, guild_id, user_id, delta, moeda, descricao):
        self.chamadas.append(("extrato", user_id, delta, descricao))

    def get_canal_categoria(self, guild_id, categoria):
        self.chamadas.append(("canal", guild_id, categoria))
        return None  # sem canal: o anúncio é pulado, o sorteio não

    def automacao_ativa(self, guild_id, tipo, padrao=True):
        # Estes testes isolam pagamento/encerramento da rodada, não publicação.
        return False


class _Guild:
    def __init__(self, guild_id=100):
        self.id = guild_id

    def get_channel(self, _canal_id):
        return None


def _rodar_sorteio(db):
    cog = object.__new__(Loteria)
    cog.bot = type("Bot", (), {"db": db})()
    asyncio.run(cog._sortear_guild(_Guild()))


def test_database_do_jornalista_expoe_registrar_extrato():
    """O sorteio e o desafio chamam esse método; ele só existia no Banqueiro."""
    assert hasattr(Database, "registrar_extrato")


def test_sorteio_paga_e_encerra_a_rodada():
    db = _DBFake([{"user_id": "42", "quantidade": 4}])
    _rodar_sorteio(db)

    pote = 4 * LOTERIA_PRECO_BILHETE
    premio = pote - int(pote * LOTERIA_CORTE_CASA)
    assert ("creditar", "42", "Lunaris", premio) in db.chamadas
    assert any(c[0] == "limpar" for c in db.chamadas)
    assert any(c[0] == "extrato" for c in db.chamadas)
    assert ("canal", "100", "dinheiro") in db.chamadas


def test_bilhetes_sao_limpos_antes_do_extrato_para_nao_resortear():
    """Regressão: qualquer falha depois do pagamento não pode deixar o bolo de
    pé: senão o domingo seguinte sorteia e paga tudo de novo."""
    db = _DBFake([{"user_id": "42", "quantidade": 2}])
    _rodar_sorteio(db)

    ordem = [c[0] for c in db.chamadas]
    assert ordem.index("creditar") < ordem.index("limpar")
    assert ordem.index("limpar") < ordem.index("extrato")


def test_segundo_sorteio_sem_bilhetes_nao_paga_ninguem():
    """Rodar duas vezes seguidas (o cenário real do bug) só pode pagar uma."""
    db = _DBFake([{"user_id": "42", "quantidade": 3}])
    _rodar_sorteio(db)
    _rodar_sorteio(db)

    pagamentos = [c for c in db.chamadas if c[0] == "creditar"]
    assert len(pagamentos) == 1


def test_sorteio_sem_bilhetes_nao_faz_nada():
    db = _DBFake([])
    _rodar_sorteio(db)
    assert db.chamadas == []


def test_vencedor_e_ponderado_pela_quantidade_de_bilhetes():
    bilhetes = [{"user_id": "a", "quantidade": 1}, {"user_id": "b", "quantidade": 99}]

    class _RngFixo:
        def choices(self, ids, weights, k):
            # Devolve quem tem o maior peso: confirma que os pesos chegam certos.
            return [max(zip(ids, weights), key=lambda par: par[1])[0]]

    assert sortear_vencedor(bilhetes, rng=_RngFixo()) == "b"
    assert sortear_vencedor([]) is None
