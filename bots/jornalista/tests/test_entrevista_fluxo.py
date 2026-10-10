"""Entrevista semanal de ponta a ponta contra o banco real: sorteio, DM, resposta e publicação."""

from __future__ import annotations

import asyncio
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from types import SimpleNamespace

import discord

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE))

from tests.db_utils import novo_db
from tests.test_painel import _bot_carregado

G = "100"


def _rodar(coro):
    return asyncio.run(coro)


class _Canal(discord.TextChannel):
    def __init__(self, canal_id):
        self.id = canal_id
        self.enviados = []

    async def send(self, **kw):
        self.enviados.append(kw)
        return SimpleNamespace(id=7000 + len(self.enviados))


class _Membro:
    def __init__(self, uid, nome=None, bot=False, dm_fechada=False):
        self.id, self.bot, self.dm_fechada = uid, bot, dm_fechada
        self.display_name = nome or f"Jogador{uid}"
        self.mention = f"<@{uid}>"
        self.roles = []
        self.dms = []

    async def send(self, texto=None, **kw):
        if self.dm_fechada:
            raise discord.Forbidden(SimpleNamespace(status=403, reason="x"), "DM fechada")
        self.dms.append(texto)


class _Guild:
    def __init__(self, membros, canal=None):
        self.id = int(G)
        self.members = membros
        self._canal = canal

    def get_member(self, uid):
        return next((m for m in self.members if m.id == uid), None)

    def get_channel(self, cid):
        return self._canal if self._canal is not None and self._canal.id == cid else None


class _MensagemDM:
    guild = None

    def __init__(self, autor, texto):
        self.author = autor
        self.content = texto
        self.respostas = []
        outer = self

        class _Canal:
            async def send(self, texto=None, **kw):
                outer.respostas.append(texto)

        self.channel = _Canal()


class _RespostaClique:
    def __init__(self):
        self.eventos = []

    async def edit_message(self, **kw):
        self.eventos.append(("edit", kw))

    async def send_message(self, texto=None, **kw):
        self.eventos.append(("msg", texto))

    def is_done(self):
        return bool(self.eventos)


def _clique(usuario):
    return SimpleNamespace(user=usuario, response=_RespostaClique())


def _id_pendente(db, uid):
    return db.entrevista_pendente_do_usuario(str(uid))["id"]


async def _responder_e_publicar(cog, db, usuario, texto):
    """A pessoa manda a resposta na DM e toca em Publicar no preview."""
    msg = _MensagemDM(usuario, texto)
    entrevista_id = _id_pendente(db, usuario.id)
    await cog.on_message(msg)
    await cog.publicar_rascunho(_clique(usuario), entrevista_id)
    return msg


async def _preparar(db, membros, com_canal=True):
    bot = await _bot_carregado(db)
    canal = _Canal(555) if com_canal else None
    guild = _Guild(membros, canal)
    bot.get_guild = lambda gid: guild if gid == int(G) else None
    if com_canal:
        db.set_canal_categoria(G, "noticia", "555")
    return bot, guild, canal


def test_ciclo_completo_sorteia_manda_dm_recebe_resposta_e_publica():
    async def verificar():
        db = novo_db()
        ana, bia = _Membro(1, "Ana"), _Membro(2, "Bia")
        bot, guild, canal = await _preparar(db, [ana, bia, _Membro(9, "Robo", bot=True)])
        try:
            cog = bot.get_cog("Entrevista")
            assert await cog._nova_entrevista(guild) is True
            alvo = ana if ana.dms else bia
            assert len(alvo.dms) == 1 and "Pergunta da semana" in alvo.dms[0]
            pergunta = db.entrevista_pendente_do_usuario(str(alvo.id))["pergunta"]
            assert pergunta in alvo.dms[0]

            msg = await _responder_e_publicar(cog, db, alvo, "Foi a noite do dragao, ninguem dormiu.")
            assert len(canal.enviados) == 1
            emb = canal.enviados[0]["embed"]
            assert alvo.display_name in emb.title and pergunta in emb.description and "dragao" in emb.description
            with db._conn() as con:
                estado = con.execute("SELECT status FROM entrevistas").fetchone()["status"]
            assert estado == "publicada"
            # responder de novo não republica
            await cog.on_message(_MensagemDM(alvo, "mais uma coisa"))
            assert len(canal.enviados) == 1 and db.entrevista_pendente_do_usuario(str(alvo.id)) is None
        finally:
            await bot.close()

    _rodar(verificar())


def test_quem_nao_tem_entrevista_pendente_e_ignorado_e_mensagem_de_servidor_tambem():
    async def verificar():
        db = novo_db()
        ana = _Membro(1, "Ana")
        bot, guild, canal = await _preparar(db, [ana])
        try:
            cog = bot.get_cog("Entrevista")
            msg = _MensagemDM(ana, "oi bot")
            await cog.on_message(msg)
            assert msg.respostas == [] and canal.enviados == []
            de_servidor = _MensagemDM(ana, "oi")
            de_servidor.guild = guild
            await cog.on_message(de_servidor)
            assert canal.enviados == []
        finally:
            await bot.close()

    _rodar(verificar())


def test_dm_fechada_publica_o_convite_e_o_modal_fecha_o_ciclo():
    async def verificar():
        db = novo_db()
        ana = _Membro(1, "Ana", dm_fechada=True)
        bot, guild, canal = await _preparar(db, [ana])
        try:
            cog = bot.get_cog("Entrevista")
            assert await cog._nova_entrevista(guild) is True
            assert len(canal.enviados) == 1 and "entrevista_responder" in canal.enviados[0]["embed"].description
            from cogs.entrevista import RespostaEntrevistaModal

            entrevista = db.entrevista_pendente_do_usuario("1", G)
            modal = RespostaEntrevistaModal(cog, entrevista)
            modal.resposta._value = "Respondi pelo modal."
            enviados = []

            class _R:
                async def send_message(self, texto=None, **kw):
                    enviados.append(texto)

            await modal.on_submit(SimpleNamespace(user=ana, response=_R()))
            assert "Recebi sua resposta" in enviados[0]
            assert len(canal.enviados) == 2 and "Respondi pelo modal" in canal.enviados[1]["embed"].description
        finally:
            await bot.close()

    _rodar(verificar())


def test_sem_canal_de_noticias_a_resposta_nao_se_perde_e_sai_quando_o_canal_existir():
    async def verificar():
        db = novo_db()
        ana = _Membro(1, "Ana")
        bot, guild, canal = await _preparar(db, [ana], com_canal=False)
        try:
            cog = bot.get_cog("Entrevista")
            await cog._nova_entrevista(guild)
            await _responder_e_publicar(cog, db, ana, "Resposta que precisa sobreviver.")
            with db._conn() as con:
                assert con.execute("SELECT status FROM entrevistas").fetchone()["status"] == "respondida"
            # o Mestre configura o canal só depois; o ciclo de recuperação publica
            guild._canal = canal = _Canal(555)
            db.set_canal_categoria(G, "noticia", "555")
            with db._conn() as con:  # pula o recuo entre tentativas
                con.execute("UPDATE jornal_publicacoes SET proxima_tentativa=CURRENT_TIMESTAMP")
            await cog._recuperar_pendentes(guild)
            assert len(canal.enviados) == 1
            with db._conn() as con:
                assert con.execute("SELECT status FROM entrevistas").fetchone()["status"] == "publicada"
        finally:
            await bot.close()

    _rodar(verificar())


def test_publicacao_esgotada_por_falta_de_canal_tambem_se_recupera():
    async def verificar():
        db = novo_db()
        ana = _Membro(1, "Ana")
        bot, guild, canal = await _preparar(db, [ana], com_canal=False)
        try:
            cog = bot.get_cog("Entrevista")
            await cog._nova_entrevista(guild)
            await _responder_e_publicar(cog, db, ana, "Resposta que precisa sobreviver.")
            with db._conn() as con:
                con.execute("UPDATE jornal_publicacoes SET status='falha', tentativas=12")
            guild._canal = canal = _Canal(555)
            db.set_canal_categoria(G, "noticia", "555")
            await cog._recuperar_pendentes(guild)
            assert len(canal.enviados) == 1
        finally:
            await bot.close()

    _rodar(verificar())


def test_quem_saiu_do_servidor_nao_aparece_como_numero_na_entrevista_recuperada():
    async def verificar():
        db = novo_db()
        ana = _Membro(1, "Ana")
        bot, guild, canal = await _preparar(db, [ana], com_canal=False)
        try:
            cog = bot.get_cog("Entrevista")
            await cog._nova_entrevista(guild)
            await _responder_e_publicar(cog, db, ana, "Resposta de quem saiu depois.")
            guild.members = []  # Ana saiu do servidor
            guild._canal = canal = _Canal(555)
            db.set_canal_categoria(G, "noticia", "555")
            with db._conn() as con:
                con.execute("UPDATE jornal_publicacoes SET proxima_tentativa=CURRENT_TIMESTAMP")
            await cog._recuperar_pendentes(guild)
            emb = canal.enviados[0]["embed"]
            assert "1" not in (emb.author.name or "").split() and emb.author.name != "1"
            assert "Um membro do Jardim" in emb.title or "Ana" in emb.title
        finally:
            await bot.close()

    _rodar(verificar())


def test_ciclo_semanal_repete_so_apos_sete_dias_e_expira_quem_nao_respondeu():
    async def verificar():
        db = novo_db()
        membros = [_Membro(i, f"J{i}") for i in range(1, 4)]
        bot, guild, canal = await _preparar(db, membros)
        try:
            cog = bot.get_cog("Entrevista")
            assert await cog._nova_entrevista(guild) is True
            primeiro = db.perguntas_recentes_entrevista(G)[0]
            # ninguém respondeu; uma semana e meia depois o convite antigo expira e outra pessoa é sorteada
            with db._conn() as con:
                con.execute("UPDATE entrevistas SET criado_em = CURRENT_TIMESTAMP - interval '8 days'")
            assert await cog._nova_entrevista(guild) is True
            with db._conn() as con:
                status = sorted(r["status"] for r in con.execute("SELECT status FROM entrevistas").fetchall())
            assert status == ["expirada", "pendente"]
            # a pergunta nova não repete a anterior
            assert db.perguntas_recentes_entrevista(G)[0] != primeiro
        finally:
            await bot.close()

    _rodar(verificar())


def test_resposta_vazia_ou_so_com_anexo_pede_texto_e_mantem_a_entrevista_aberta():
    async def verificar():
        db = novo_db()
        ana = _Membro(1, "Ana")
        bot, guild, canal = await _preparar(db, [ana])
        try:
            cog = bot.get_cog("Entrevista")
            await cog._nova_entrevista(guild)
            msg = _MensagemDM(ana, "   ")
            await cog.on_message(msg)
            assert "texto" in msg.respostas[0]
            assert db.entrevista_pendente_do_usuario("1") is not None and canal.enviados == []
        finally:
            await bot.close()

    _rodar(verificar())
