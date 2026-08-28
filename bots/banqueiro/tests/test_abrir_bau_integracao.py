"""Cobertura de ponta a ponta do comando /abrir_bau (não só a entrega
interna, já coberta em test_bau_entrega_fallback.py): compra/estoque real,
catálogo real e Postgres real via novo_db(). Isso é o caminho que o jogador
realmente percorre ao abrir um baú."""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE))

from cogs.economia import Economia
from core.catalogo import Catalogo
from tests.db_utils import novo_db


class _Resposta:
    def __init__(self):
        self._done = False
        self.mensagens = []

    def is_done(self):
        return self._done

    async def defer(self, **_kwargs):
        self._done = True

    async def send_message(self, *args, **kwargs):
        self.mensagens.append((args, kwargs))
        self._done = True


class _Followup:
    def __init__(self):
        self.mensagens = []

    async def send(self, *args, **kwargs):
        self.mensagens.append((args, kwargs))


class _Interacao:
    def __init__(self, guild_id, user_id):
        self.id = 555
        self.guild_id = guild_id
        self.user = type("Usuario", (), {"id": user_id})()
        self.response = _Resposta()
        self.followup = _Followup()


def _cat():
    c = Catalogo()
    c.carregar_arquivo(str(BASE / "tests" / "fixtures" / "catalogo_teste.json"))
    return c


def _cog(db):
    cog = object.__new__(Economia)
    cog.bot = type("Bot", (), {"db": db, "catalogo": _cat(), "platform": None})()
    return cog


def _tipo(bau_id):
    return type("Choice", (), {"value": bau_id})()


def test_abrir_bau_entrega_e_consome_o_estoque():
    db = novo_db()
    sid, uid = "g-bau", "9"
    db.garantir_jogador(sid, uid)
    db.add_bau(sid, uid, "geral-comum", 1)

    interacao = _Interacao(sid, int(uid))
    asyncio.run(Economia.abrir_bau.callback(_cog(db), interacao, _tipo("geral-comum")))

    assert interacao.followup.mensagens, "o comando deveria ter respondido com o resultado"
    assert db.listar_baus_estoque(sid, uid) == []  # baú consumido, não sobrou no estoque
    assert db.get_carteira(sid, uid)["Lunaris"] > 20  # ganhou Lunaris do baú (acima do inicial)


def test_abrir_bau_sem_estoque_avisa_e_nao_quebra():
    db = novo_db()
    sid, uid = "g-bau-vazio", "10"
    db.garantir_jogador(sid, uid)

    interacao = _Interacao(sid, int(uid))
    asyncio.run(Economia.abrir_bau.callback(_cog(db), interacao, _tipo("geral-comum")))

    assert interacao.followup.mensagens == []  # não chegou a deferir/entregar
    assert interacao.response.mensagens  # respondeu direto avisando que não tem o baú
