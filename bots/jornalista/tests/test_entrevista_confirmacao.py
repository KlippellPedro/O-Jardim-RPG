"""Entrevista: preview com confirmação, links barrados e o ciclo à prova de falha de DM."""

from __future__ import annotations

import asyncio
import re
import sys
from pathlib import Path
from types import SimpleNamespace

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE))

from cogs.entrevista import PUBLICAR_TEMPLATE, REFAZER_TEMPLATE
from tests.db_utils import novo_db
from tests.test_entrevista_fluxo import (
    _clique, _id_pendente, _Canal, _Membro, _MensagemDM, _preparar, _responder_e_publicar,
)

G = "100"


def _rodar(coro):
    return asyncio.run(coro)


def test_mensagem_na_dm_so_gera_preview_e_nada_e_publicado_sem_confirmar():
    async def verificar():
        db = novo_db()
        ana = _Membro(1, "Ana")
        bot, guild, canal = await _preparar(db, [ana])
        try:
            cog = bot.get_cog("Entrevista")
            await cog._nova_entrevista(guild)
            msg = _MensagemDM(ana, "oi, quem e voce?")
            enviados = []

            async def enviar(texto=None, **kw):
                enviados.append((texto, kw))

            msg.channel.send = enviar
            await cog.on_message(msg)
            assert canal.enviados == []  # conversar com o bot não publica entrevista
            texto, kw = enviados[0]
            assert "Publicar" in texto and "oi, quem e voce?" in kw["embed"].description
            assert [b.item.label for b in kw["view"].children] == ["Publicar", "Reescrever"]
            pendente = db.entrevista_pendente_do_usuario("1")
            assert pendente is not None and pendente["rascunho"] == "oi, quem e voce?"
        finally:
            await bot.close()

    _rodar(verificar())


def test_reescrever_descarta_o_rascunho_e_a_nova_resposta_e_a_que_vale():
    async def verificar():
        db = novo_db()
        ana = _Membro(1, "Ana")
        bot, guild, canal = await _preparar(db, [ana])
        try:
            cog = bot.get_cog("Entrevista")
            await cog._nova_entrevista(guild)
            eid = _id_pendente(db, 1)
            await cog.on_message(_MensagemDM(ana, "texto descartado qwzx"))
            clique = _clique(ana)
            await cog.refazer_rascunho(clique, eid)
            assert db.get_entrevista(eid)["rascunho"] is None
            assert "descartei" in clique.response.eventos[0][1]["content"]
            await cog.on_message(_MensagemDM(ana, "segunda tentativa, essa vale"))
            await cog.publicar_rascunho(_clique(ana), eid)
            assert len(canal.enviados) == 1
            assert "segunda tentativa" in canal.enviados[0]["embed"].description
            assert "qwzx" not in canal.enviados[0]["embed"].description
        finally:
            await bot.close()

    _rodar(verificar())


def test_so_o_entrevistado_confirma_e_publicar_duas_vezes_nao_duplica():
    async def verificar():
        db = novo_db()
        ana, bia = _Membro(1, "Ana"), _Membro(2, "Bia")
        bot, guild, canal = await _preparar(db, [ana])
        try:
            cog = bot.get_cog("Entrevista")
            await cog._nova_entrevista(guild)
            eid = _id_pendente(db, 1)
            await cog.on_message(_MensagemDM(ana, "minha resposta"))
            intruso = _clique(bia)
            await cog.publicar_rascunho(intruso, eid)
            assert intruso.response.eventos[0] == ("msg", "Essa entrevista não é sua.") and canal.enviados == []
            await cog.publicar_rascunho(_clique(ana), eid)
            tarde = _clique(ana)
            await cog.publicar_rascunho(tarde, eid)
            assert len(canal.enviados) == 1
            assert "já foi publicada" in tarde.response.eventos[0][1]["content"]
        finally:
            await bot.close()

    _rodar(verificar())


def test_resposta_com_link_e_recusada_e_paragrafos_sao_preservados():
    async def verificar():
        db = novo_db()
        ana = _Membro(1, "Ana")
        bot, guild, canal = await _preparar(db, [ana])
        try:
            cog = bot.get_cog("Entrevista")
            await cog._nova_entrevista(guild)
            ruim = _MensagemDM(ana, "olhem meu canal em meucanal.com agora")
            await cog.on_message(ruim)
            assert "links" in ruim.respostas[0]
            assert db.entrevista_pendente_do_usuario("1")["rascunho"] is None
            await _responder_e_publicar(cog, db, ana, "Primeiro paragrafo.\n\n\n\nSegundo   paragrafo.")
            assert "Primeiro paragrafo.\n\nSegundo paragrafo." in canal.enviados[0]["embed"].description
        finally:
            await bot.close()

    _rodar(verificar())


def test_erro_ao_avisar_a_pessoa_nao_faz_o_ciclo_sortear_outra_a_cada_hora():
    async def verificar():
        db = novo_db()
        ana, bia = _Membro(1, "Ana"), _Membro(2, "Bia")

        async def explode(*a, **k):
            raise RuntimeError("falha inesperada do Discord")

        ana.send = explode
        bia.send = explode
        bot, guild, canal = await _preparar(db, [ana, bia])
        try:
            cog = bot.get_cog("Entrevista")
            assert await cog._nova_entrevista(guild) is True  # o ciclo é marcado como feito
            with db._conn() as con:
                assert con.execute("SELECT COUNT(*) AS n FROM entrevistas").fetchone()["n"] == 1
        finally:
            await bot.close()

    _rodar(verificar())


def test_autor_da_resposta_aparece_com_o_apelido_do_servidor_e_nao_com_o_nome_global():
    async def verificar():
        db = novo_db()
        ana = _Membro(1, "Ana do Servidor")
        bot, guild, canal = await _preparar(db, [ana])
        try:
            cog = bot.get_cog("Entrevista")
            guild.get_member = lambda uid: ana if uid == 1 else None
            usuario_dm = SimpleNamespace(id=1, display_name="ana_global_123")
            await cog._publicar(1, G, usuario_dm, "P?", "R!")
            assert "Ana do Servidor" in canal.enviados[0]["embed"].title
        finally:
            await bot.close()

    _rodar(verificar())


def test_templates_dos_botoes_da_entrevista():
    assert re.fullmatch(PUBLICAR_TEMPLATE, "entrevista_ok:42").group("id") == "42"
    assert re.fullmatch(REFAZER_TEMPLATE, "entrevista_refazer:42").group("id") == "42"
    assert re.fullmatch(PUBLICAR_TEMPLATE, "entrevista_refazer:42") is None
