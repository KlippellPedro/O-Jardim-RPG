"""/entrevista_responder (modal, fallback pra DM fechada) e a recuperação
de entrevistas respondidas mas nunca publicadas: `listar_entrevistas_
respondidas_nao_publicadas` existia desde o lançamento da feature e nunca
era chamada em lugar nenhum. Uma falha ao publicar (canal ausente, erro de
rede) deixava a resposta do jogador presa pra sempre."""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE))

from cogs.entrevista import Entrevista, RespostaEntrevistaModal


class _Resposta:
    def __init__(self):
        self.mensagens = []
        self.modal = None

    async def send_message(self, texto=None, *, ephemeral=False, **kwargs):
        self.mensagens.append((texto, ephemeral))

    async def send_modal(self, modal):
        self.modal = modal


class _Interacao:
    def __init__(self, user_id):
        self.user = type("Usuario", (), {"id": user_id, "display_name": f"User{user_id}"})()
        self.response = _Resposta()


class _Membro:
    def __init__(self, id, display_name):
        self.id = id
        self.display_name = display_name


class _Guild:
    def __init__(self, guild_id, membros=None):
        self.id = guild_id
        self._membros = membros or {}

    def get_member(self, user_id):
        return self._membros.get(user_id)


class _DB:
    def __init__(self, *, pendente=None, pendentes_nao_publicadas=None):
        self.pendente = pendente
        self.pendentes_nao_publicadas = pendentes_nao_publicadas or []
        self.respostas = []
        self.publicadas = []

    def entrevista_pendente_do_usuario(self, user_id):
        return self.pendente

    def responder_entrevista(self, entrevista_id, resposta):
        self.respostas.append((entrevista_id, resposta))
        return True

    def listar_entrevistas_respondidas_nao_publicadas(self, guild_id):
        return list(self.pendentes_nao_publicadas)

    def marcar_entrevista_publicada(self, entrevista_id):
        self.publicadas.append(entrevista_id)


def _cog(db):
    cog = object.__new__(Entrevista)
    cog.bot = type("Bot", (), {"db": db})()
    return cog


def _rodar(coro):
    return asyncio.run(coro)


# ── /entrevista_responder ────────────────────────────────────────────────

def test_entrevista_responder_sem_pendente_avisa_e_nao_abre_modal():
    db = _DB(pendente=None)
    cog = _cog(db)
    interacao = _Interacao(1)

    _rodar(Entrevista.entrevista_responder.callback(cog, interacao))

    assert interacao.response.modal is None
    assert interacao.response.mensagens[0][1] is True  # ephemeral


def test_entrevista_responder_com_pendente_abre_o_modal():
    db = _DB(pendente={"id": 5, "guild_id": "100", "pergunta": "Qual sua Árvore?"})
    cog = _cog(db)
    interacao = _Interacao(1)

    _rodar(Entrevista.entrevista_responder.callback(cog, interacao))

    assert isinstance(interacao.response.modal, RespostaEntrevistaModal)
    assert interacao.response.modal.entrevista["id"] == 5


# ── RespostaEntrevistaModal.on_submit ────────────────────────────────────

def test_modal_publica_a_resposta_no_submit():
    db = _DB()
    cog = _cog(db)
    publicacoes = []

    async def fake_publicar(entrevista_id, guild_id, autor, pergunta, resposta):
        publicacoes.append((entrevista_id, guild_id, resposta))

    cog._publicar = fake_publicar
    entrevista = {"id": 9, "guild_id": "100", "pergunta": "Qual sua Árvore?"}
    modal = RespostaEntrevistaModal(cog, entrevista)
    modal.resposta._value = "Aethel, sem dúvida."
    interacao = _Interacao(1)

    _rodar(modal.on_submit(interacao))

    assert db.respostas == [(9, "Aethel, sem dúvida.")]
    assert publicacoes == [(9, "100", "Aethel, sem dúvida.")]
    assert interacao.response.mensagens[0][1] is True  # ephemeral


def test_modal_entrevista_ja_nao_pendente_nao_publica():
    class _DBFalha(_DB):
        def responder_entrevista(self, entrevista_id, resposta):
            return False

    db = _DBFalha()
    cog = _cog(db)
    chamou_publicar = []
    cog._publicar = lambda *a, **k: chamou_publicar.append(True)
    modal = RespostaEntrevistaModal(cog, {"id": 9, "guild_id": "100", "pergunta": "P"})
    modal.resposta._value = "resposta tardia"
    interacao = _Interacao(1)

    _rodar(modal.on_submit(interacao))

    assert not chamou_publicar
    assert interacao.response.mensagens[0][1] is True


# ── recuperação de entrevistas presas ────────────────────────────────────

def test_recuperar_pendentes_publica_todas_as_respondidas_nao_publicadas():
    pendentes = [
        {"id": 1, "guild_id": "100", "user_id": "111", "pergunta": "P1", "resposta": "R1"},
        {"id": 2, "guild_id": "100", "user_id": "222", "pergunta": "P2", "resposta": "R2"},
    ]
    db = _DB(pendentes_nao_publicadas=pendentes)
    cog = _cog(db)
    chamadas = []

    async def fake_publicar(entrevista_id, guild_id, autor, pergunta, resposta):
        chamadas.append((entrevista_id, guild_id, autor, pergunta, resposta))

    cog._publicar = fake_publicar
    guild = _Guild(100, membros={111: _Membro(111, "Fulano")})

    _rodar(cog._recuperar_pendentes(guild))

    assert len(chamadas) == 2
    assert chamadas[0] == (1, "100", guild._membros[111], "P1", "R1")
    assert chamadas[1][2] == "222"  # membro saiu do servidor: cai pro id cru


def test_recuperar_pendentes_sem_nada_preso_nao_chama_publicar():
    db = _DB(pendentes_nao_publicadas=[])
    cog = _cog(db)
    cog._publicar = lambda *a, **k: (_ for _ in ()).throw(AssertionError("não deveria publicar nada"))
    guild = _Guild(100)

    _rodar(cog._recuperar_pendentes(guild))


if __name__ == "__main__":
    import pytest

    raise SystemExit(pytest.main([__file__, "-v"]))
