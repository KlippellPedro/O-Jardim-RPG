"""/jornal desafio agora confere a resposta de verdade (antes premiava a
primeira mensagem de QUALQUER UM no canal, sem olhar o conteúdo — nem
tinha como, o bot não liga o intent de message_content) e persiste em
`jornal_desafios`, sobrevivendo a um reinício do bot enquanto está em
aberto. /jornal rumor troca o asyncio.sleep solto (perdido pra sempre se o
bot reiniciasse) por um agendamento em tabela + ciclo periódico."""

from __future__ import annotations

import asyncio
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE))

from cogs.jornal import Jornal, DesafioModal


class _Resposta:
    def __init__(self):
        self.mensagens = []

    async def send_message(self, texto=None, *, embed=None, ephemeral=False, **kwargs):
        self.mensagens.append((texto, embed, ephemeral))


class _Interacao:
    def __init__(self, guild_id, user_id, mention="<@1>"):
        self.guild_id = guild_id
        self.user = type("Usuario", (), {"id": user_id, "mention": mention})()
        self.response = _Resposta()


class _DB:
    def __init__(self, *, desafio=None):
        self.desafio = desafio
        self.reivindicados = []
        self.creditos = []
        self.extratos = []
        self.rumores_processados = []

    def get_desafio_ativo(self, token):
        if self.desafio is None or self.desafio.get("resolvido_por"):
            return None
        return dict(self.desafio)

    def reivindicar_e_premiar_desafio(self, token, user_id):
        if self.desafio is None or self.desafio.get("resolvido_por"):
            return None
        self.desafio["resolvido_por"] = user_id
        self.reivindicados.append((token, user_id))
        recompensa = int(self.desafio["recompensa"])
        guild_id = str(self.desafio["guild_id"])
        self.creditos.append((guild_id, user_id, "Lunaris", recompensa))
        self.extratos.append(
            (guild_id, user_id, recompensa, "Lunaris", "Venceu um desafio do Jornal Lunar")
        )
        return dict(self.desafio)

    def marcar_rumor_bau_processado(self, rumor_id):
        self.rumores_processados.append(rumor_id)

    def get_baus_config(self, guild_id):
        return {"guild_id": guild_id}


def _cog(db):
    cog = object.__new__(Jornal)
    cog.bot = type("Bot", (), {"db": db})()
    return cog


def _rodar(coro):
    return asyncio.run(coro)


def _desafio_base(**overrides):
    base = {
        "token": "tok1", "guild_id": "100", "canal_id": "555", "mensagem_id": "999",
        "autor_id": "10", "pergunta": "Quantas Árvores tem o Jardim?", "resposta": "10",
        "recompensa": 20, "resolvido_por": None,
    }
    base.update(overrides)
    return base


# ── abrir_modal_desafio ──────────────────────────────────────────────────

def test_abrir_modal_recusa_desafio_ja_resolvido():
    db = _DB(desafio=None)
    cog = _cog(db)
    interacao = _Interacao(100, 5)

    _rodar(cog.abrir_modal_desafio(interacao, "tok1"))

    texto, embed, ephemeral = interacao.response.mensagens[0]
    assert "resolvido" in texto.lower()


def test_abrir_modal_recusa_o_proprio_autor():
    db = _DB(desafio=_desafio_base(autor_id="5"))
    cog = _cog(db)
    interacao = _Interacao(100, 5)  # mesmo id do autor

    _rodar(cog.abrir_modal_desafio(interacao, "tok1"))

    texto, embed, ephemeral = interacao.response.mensagens[0]
    assert "próprio desafio" in texto


# ── resolver_desafio ─────────────────────────────────────────────────────

async def _atualizar_noop(*args, **kwargs):
    return None


def test_resolver_desafio_resposta_errada_nao_credita():
    db = _DB(desafio=_desafio_base())
    cog = _cog(db)
    cog._atualizar_mensagem_desafio = _atualizar_noop
    interacao = _Interacao(100, 7)

    _rodar(cog.resolver_desafio(interacao, "tok1", "resposta errada"))

    assert db.creditos == []
    texto, embed, ephemeral = interacao.response.mensagens[0]
    assert "errada" in texto.lower()


def test_resolver_desafio_aceita_resposta_normalizada_e_credita():
    db = _DB(desafio=_desafio_base(resposta="Dez"))
    cog = _cog(db)
    chamadas = []

    async def fake_atualizar(desafio_row, vencedor):
        chamadas.append((desafio_row["token"], vencedor))

    cog._atualizar_mensagem_desafio = fake_atualizar
    interacao = _Interacao(100, 7, mention="<@7>")

    _rodar(cog.resolver_desafio(interacao, "tok1", "  dEz  "))

    assert db.creditos == [("100", "7", "Lunaris", 20)]
    assert db.extratos == [("100", "7", 20, "Lunaris", "Venceu um desafio do Jornal Lunar")]
    assert chamadas == [("tok1", interacao.user)]
    texto, embed, ephemeral = interacao.response.mensagens[0]
    assert "20" in texto


def test_resolver_desafio_segunda_resposta_certa_nao_credita_de_novo():
    """Duas pessoas acertam quase ao mesmo tempo: só a primeira reivindicação
    atômica (UPDATE ... WHERE resolvido_por IS NULL) pode creditar."""
    db = _DB(desafio=_desafio_base())
    cog = _cog(db)
    cog._atualizar_mensagem_desafio = _atualizar_noop

    _rodar(cog.resolver_desafio(_Interacao(100, 7), "tok1", "10"))
    _rodar(cog.resolver_desafio(_Interacao(100, 8), "tok1", "10"))

    assert len(db.creditos) == 1
    assert db.creditos[0][1] == "7"


# ── ciclo de rumores agendados ───────────────────────────────────────────

def test_soltar_bau_de_rumor_marca_processado_e_chama_dropar():
    db = _DB()
    dropados = []

    class _BausCog:
        async def _dropar(self, cfg):
            dropados.append(cfg)
            return object()

    cog = _cog(db)
    cog.bot.get_cog = lambda nome: _BausCog() if nome == "Baus" else None

    rumor_row = {"id": 1, "guild_id": "100"}
    _rodar(cog._soltar_bau_de_rumor(rumor_row))

    assert db.rumores_processados == [1]
    assert dropados == [{"guild_id": "100"}]


def test_soltar_bau_de_rumor_sem_cog_baus_nao_quebra():
    db = _DB()
    cog = _cog(db)
    cog.bot.get_cog = lambda nome: None

    _rodar(cog._soltar_bau_de_rumor({"id": 2, "guild_id": "100"}))

    assert db.rumores_processados == []


def test_soltar_bau_de_rumor_sem_canal_mantem_agendamento_para_retry():
    db = _DB()

    class _BausSemDestino:
        async def _dropar(self, cfg):
            return None

    cog = _cog(db)
    cog.bot.get_cog = lambda nome: _BausSemDestino() if nome == "Baus" else None

    _rodar(cog._soltar_bau_de_rumor({"id": 3, "guild_id": "100"}))

    assert db.rumores_processados == []


if __name__ == "__main__":
    import pytest

    raise SystemExit(pytest.main([__file__, "-v"]))
