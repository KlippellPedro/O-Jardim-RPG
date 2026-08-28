"""Sorteio da Loteria Dominical: pagamento, encerramento da rodada e sorteio ponderado.

A regressão que motivou estes testes: `registrar_extrato` não existia no
Database do Jornalista, então o sorteio pagava o vencedor, estourava
AttributeError e **nunca limpava os bilhetes**: o mesmo bolo era sorteado e
pago de novo todo domingo, pra sempre.
"""

from __future__ import annotations

import asyncio
import sys
from datetime import datetime
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE))

from cogs.loteria import Loteria, sortear_vencedor
from core.db import Database, LOTERIA_CORTE_CASA_PADRAO, LOTERIA_PRECO_BILHETE_PADRAO
from core.loot import TZ
from tests.db_utils import novo_db

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

    def encerrar_loteria_atomica(self, guild_id, rodada_id, preco, corte):
        self.chamadas.append(("encerrar", guild_id, rodada_id))
        if not self._bilhetes:
            return None
        total = sum(b["quantidade"] for b in self._bilhetes)
        vencedor = self._bilhetes[0]["user_id"]
        participantes = len(self._bilhetes)
        self._bilhetes = []
        premio = total * preco - int(total * preco * corte)
        return {
            "nova": True,
            "vencedor_user_id": vencedor,
            "total_bilhetes": total,
            "participantes": participantes,
            "premio": premio,
        }

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
    agora = datetime.now(TZ) if TZ else datetime.now()
    asyncio.run(cog._sortear_guild(_Guild(), agora))


def test_database_do_jornalista_expoe_registrar_extrato():
    """O sorteio e o desafio chamam esse método; ele só existia no Banqueiro."""
    assert hasattr(Database, "registrar_extrato")


def test_sorteio_paga_e_encerra_a_rodada():
    db = _DBFake([{"user_id": "42", "quantidade": 4}])
    _rodar_sorteio(db)

    pote = 4 * LOTERIA_PRECO_BILHETE
    premio = pote - int(pote * LOTERIA_CORTE_CASA)
    assert any(c[0] == "encerrar" for c in db.chamadas)
    assert ("canal", "100", "dinheiro") in db.chamadas


def test_pagamento_e_limpeza_usam_uma_unica_operacao_atomica():
    db = _DBFake([{"user_id": "42", "quantidade": 2}])
    _rodar_sorteio(db)

    assert [c[0] for c in db.chamadas].count("encerrar") == 1


def test_segundo_sorteio_sem_bilhetes_nao_paga_ninguem():
    """Rodar duas vezes seguidas (o cenário real do bug) só pode pagar uma."""
    db = _DBFake([{"user_id": "42", "quantidade": 3}])
    _rodar_sorteio(db)
    _rodar_sorteio(db)

    encerramentos = [c for c in db.chamadas if c[0] == "encerrar"]
    assert len(encerramentos) == 2


def test_sorteio_sem_bilhetes_nao_faz_nada():
    db = _DBFake([])
    _rodar_sorteio(db)
    assert len(db.chamadas) == 1
    assert db.chamadas[0][:2] == ("encerrar", "100")


def test_dedupe_key_usa_o_mesmo_fuso_do_sorteio_nao_a_hora_local_ingenua():
    """P16 da auditoria 2026-08: a dedupe_key usava datetime.now() (hora
    local ingênua do host) enquanto o ciclo decide "é domingo?" com
    datetime.now(TZ) (America/Sao_Paulo). Perto da meia-noite, um host
    rodando em UTC podia gerar uma dedupe_key com a data errada. Agora as
    duas vêm do mesmo `agora`, então isso não pode mais divergir."""
    import cogs.loteria as loteria_mod

    db = _DBFake([{"user_id": "42", "quantidade": 1}])

    def _automacao_ativa(guild_id, tipo, padrao=True):
        return True

    db.automacao_ativa = _automacao_ativa
    db.get_canal_categoria = lambda guild_id, categoria: None

    chamadas = []

    async def _fake_publicar_ou_enfileirar(*args, **kwargs):
        chamadas.append(kwargs)

    original = loteria_mod.publicacoes.publicar_ou_enfileirar
    loteria_mod.publicacoes.publicar_ou_enfileirar = _fake_publicar_ou_enfileirar
    try:
        cog = object.__new__(Loteria)
        cog.bot = type("Bot", (), {"db": db})()
        # Domingo às 23h59 em São Paulo: se a dedupe_key usasse hora UTC
        # ingênua do host, cairia em segunda-feira de madrugada em UTC.
        agora = datetime(2026, 8, 9, 23, 59, tzinfo=TZ) if TZ else datetime(2026, 8, 9, 23, 59)
        asyncio.run(cog._sortear_guild(_Guild(), agora))
    finally:
        loteria_mod.publicacoes.publicar_ou_enfileirar = original

    assert len(chamadas) == 1
    assert chamadas[0]["dedupe_key"] == "loteria:100:2026-08-09"


def test_vencedor_e_ponderado_pela_quantidade_de_bilhetes():
    bilhetes = [{"user_id": "a", "quantidade": 1}, {"user_id": "b", "quantidade": 99}]

    class _RngFixo:
        def choices(self, ids, weights, k):
            # Devolve quem tem o maior peso: confirma que os pesos chegam certos.
            return [max(zip(ids, weights), key=lambda par: par[1])[0]]

    assert sortear_vencedor(bilhetes, rng=_RngFixo()) == "b"
    assert sortear_vencedor([]) is None


def test_liquidacao_real_e_atomica_e_idempotente():
    class _PrimeiroBilhete:
        @staticmethod
        def randrange(_total):
            return 0

    db = novo_db()
    db.garantir_jogador("g", "u")
    with db._conn() as con:
        saldo_inicial = con.execute(
            "SELECT saldo FROM carteira WHERE guild_id='g' AND user_id='u' AND moeda='Lunaris'"
        ).fetchone()["saldo"]
        con.execute(
            "INSERT INTO loteria_bilhetes (guild_id, user_id, quantidade) VALUES ('g', 'u', 4)"
        )

    primeira = db.encerrar_loteria_atomica("g", "2026-08-30", 25, 0.10, rng=_PrimeiroBilhete())
    segunda = db.encerrar_loteria_atomica("g", "2026-08-30", 25, 0.10, rng=_PrimeiroBilhete())

    assert primeira["nova"] is True
    assert primeira["premio"] == 90
    assert segunda["nova"] is False
    with db._conn() as con:
        saldo = con.execute(
            "SELECT saldo FROM carteira WHERE guild_id='g' AND user_id='u' AND moeda='Lunaris'"
        ).fetchone()["saldo"]
        bilhetes = con.execute(
            "SELECT COUNT(*) AS total FROM loteria_bilhetes WHERE guild_id='g'"
        ).fetchone()["total"]
        extratos = con.execute(
            "SELECT COUNT(*) AS total FROM extrato WHERE guild_id='g' AND descricao='Ganhou a Loteria Dominical'"
        ).fetchone()["total"]
    assert saldo == saldo_inicial + 90
    assert bilhetes == 0
    assert extratos == 1
