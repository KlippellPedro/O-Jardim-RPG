"""Classificados melhores: categorias, validade de 7 dias e o botão Responder."""

from __future__ import annotations

import asyncio
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from types import SimpleNamespace

import discord

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE))

from cogs.classificados import RESPONDER_TEMPLATE, embed_classificado, rotulo_categoria
from core import db as db_mod
from core import publicacoes
from core.publicacoes import payload_embed
from tests.db_utils import novo_db
from tests.test_painel import _Inter, _bot_carregado

G, U, V = "100", "200", "300"


def _rodar(coro):
    return asyncio.run(coro)


def _comprar(db, chave="classificado:1", texto="Vendo uma espada", categoria="vendo", valor=60, agora=None):
    db.creditar(G, U, "Lunaris", 500)
    return db.comprar_classificado(G, U, valor, chave, payload_embed(discord.Embed(title="x")), texto=texto, categoria=categoria, agora=agora)


def test_compra_grava_o_anuncio_com_categoria_validade_e_id_no_payload():
    db = novo_db()
    agora = datetime(2026, 10, 9, 12, 0, tzinfo=timezone.utc)
    pub = _comprar(db, agora=agora)
    anuncio = db.get_classificado(pub["payload"]["classificado_id"])
    assert (anuncio["categoria"], anuncio["texto"], anuncio["valor"], anuncio["status"]) == ("vendo", "Vendo uma espada", 60, "ativo")
    assert anuncio["expira_em"] == agora + timedelta(days=7)
    # a mesma interação não cobra nem grava de novo
    de_novo = db.comprar_classificado(G, U, 60, "classificado:1", {}, texto="outra", categoria="vendo")
    assert de_novo["id"] == pub["id"]
    with db._conn() as con:
        assert con.execute("SELECT COUNT(*) AS n FROM classificados").fetchone()["n"] == 1


def test_categoria_desconhecida_vira_outros_e_sem_texto_nao_cria_anuncio():
    db = novo_db()
    pub = _comprar(db, categoria="inventada")
    assert db.get_classificado(pub["payload"]["classificado_id"])["categoria"] == "outros"
    db.creditar(G, U, "Lunaris", 100)
    antigo = db.comprar_classificado(G, U, 50, "classificado:2", {})  # chamada no formato antigo
    assert "classificado_id" not in antigo["payload"]


def test_respostas_uma_por_pessoa_nunca_do_proprio_autor_e_nunca_apos_o_prazo():
    db = novo_db()
    agora = datetime.now(timezone.utc)
    cid = _comprar(db, agora=agora)["payload"]["classificado_id"]
    assert db.responder_classificado(cid, U, "oi")["status"] == "proprio"
    primeira = db.responder_classificado(cid, V, "Quero!")
    assert primeira["status"] == "ok" and primeira["total"] == 1 and primeira["anuncio"]["user_id"] == U
    assert db.responder_classificado(cid, V, "de novo")["status"] == "ja_respondeu"
    assert db.responder_classificado(cid, "400", "eu também")["total"] == 2
    assert db.contar_respostas_classificado(cid) == 2
    assert db.responder_classificado(cid, "500", "tarde", agora + timedelta(days=8))["status"] == "encerrado"
    assert db.responder_classificado(9999, V, "x")["status"] == "encerrado"


def test_anuncio_expira_apos_sete_dias_e_some_da_lista_de_ativos():
    db = novo_db()
    agora = datetime.now(timezone.utc)
    cid = _comprar(db, agora=agora)["payload"]["classificado_id"]
    assert [a["id"] for a in db.classificados_ativos(G)] == [cid]
    assert db.expirar_classificados(agora + timedelta(days=6)) == []
    expirados = db.expirar_classificados(agora + timedelta(days=7, minutes=1))
    assert [a["id"] for a in expirados] == [cid]
    assert db.get_classificado(cid)["status"] == "expirado" and db.classificados_ativos(G) == []
    assert db.expirar_classificados(agora + timedelta(days=9)) == []


def test_cartaz_mostra_categoria_validade_respostas_e_encerramento():
    anuncio = {
        "texto": "Procuro grupo", "user_id": U, "valor": 50, "categoria": "procuro_grupo",
        "expira_em": datetime(2026, 10, 16, tzinfo=timezone.utc),
    }
    aberto = embed_classificado(anuncio, respostas=2)
    assert "Procuro grupo" in aberto.title and "Válido até" in aberto.description
    assert aberto.fields[0].value == "💬 2"
    fechado = embed_classificado(anuncio, encerrado=True)
    assert "encerrado" in fechado.description and "Válido até" not in fechado.description
    assert rotulo_categoria("nao-existe") == rotulo_categoria("outros")
    assert set(db_mod.CLASSIFICADO_CATEGORIAS) == {"compro", "vendo", "procuro_grupo", "servico", "outros"}


class _Canal(discord.TextChannel):
    def __init__(self, canal_id):
        self.id = canal_id
        self.enviados = []
        self.editadas = []

    async def send(self, **kw):
        self.enviados.append(kw)
        return SimpleNamespace(id=7000 + len(self.enviados))

    async def fetch_message(self, mid):
        canal = self

        class _Msg:
            async def edit(self, **kw):
                canal.editadas.append((mid, kw))

        return _Msg()


def test_publicacao_sai_com_botao_responder_e_vincula_a_mensagem():
    async def verificar():
        db = novo_db()
        bot = await _bot_carregado(db)
        try:
            canal = _Canal(555)
            bot.get_guild = lambda gid: SimpleNamespace(get_channel=lambda cid: canal if cid == 555 else None)
            db.set_canal_categoria(G, "noticia", "555")
            pub = _comprar(db)
            assert await publicacoes.tentar_publicacao(bot, pub) == "entregue"
            cid = pub["payload"]["classificado_id"]
            botao = canal.enviados[0]["view"].children[0]
            assert botao.item.custom_id == f"classificado_resp:{cid}" and botao.item.label == "Responder"
            anuncio = db.get_classificado(cid)
            assert (anuncio["canal_id"], anuncio["mensagem_id"]) == ("555", "7001")
        finally:
            await bot.close()

    _rodar(verificar())


class _Usuario:
    def __init__(self, uid, fechada=False):
        self.id, self.mention, self.fechada, self.dms = uid, f"<@{uid}>", fechada, []

    async def send(self, **kw):
        if self.fechada:
            raise discord.Forbidden(SimpleNamespace(status=403, reason="x"), "dm fechada")
        self.dms.append(kw)


class _Resp:
    def __init__(self):
        self.eventos = []

    async def send_message(self, texto=None, **kw):
        self.eventos.append(("msg", texto))

    async def defer(self, **kw):
        self.eventos.append(("defer", None))

    async def send_modal(self, modal):
        self.eventos.append(("modal", modal))


class _Interacao:
    def __init__(self, uid):
        self.user = _Usuario(uid)
        self.response = _Resp()
        self.followups = []
        outer = self

        class _Follow:
            async def send(self, texto=None, **kw):
                outer.followups.append(texto)

        self.followup = _Follow()


def test_resposta_chega_por_dm_ao_autor_e_atualiza_o_cartaz():
    async def verificar():
        db = novo_db()
        bot = await _bot_carregado(db)
        try:
            cog = bot.get_cog("Classificados")
            canal = _Canal(555)
            bot.get_channel = lambda cid: canal if cid == 555 else None
            autor = _Usuario(int(U))
            bot.get_user = lambda uid: autor if uid == int(U) else None
            cid = _comprar(db)["payload"]["classificado_id"]
            db.vincular_mensagem_classificado(cid, "555", "9")

            inter = _Interacao(int(V))
            await cog.registrar_resposta(inter, cid, "Tenho interesse!")
            assert "entregue" in inter.followups[0]
            dm = autor.dms[0]["embed"]
            assert f"<@{V}>" in dm.description and "Tenho interesse!" in dm.description
            mid, kw = canal.editadas[-1]
            assert mid == 9 and kw["embed"].fields[0].value == "💬 1" and kw["view"] is not None

            repetida = _Interacao(int(V))
            await cog.registrar_resposta(repetida, cid, "outra")
            assert "já respondeu" in repetida.response.eventos[0][1] and len(autor.dms) == 1
            vazio = _Interacao(int(V))
            await cog.registrar_resposta(vazio, cid, "")
            assert "Escreva" in vazio.response.eventos[0][1]
        finally:
            await bot.close()

    _rodar(verificar())


def test_dm_fechada_nao_perde_a_resposta_e_orienta_quem_respondeu():
    async def verificar():
        db = novo_db()
        bot = await _bot_carregado(db)
        try:
            cog = bot.get_cog("Classificados")
            bot.get_user = lambda uid: _Usuario(uid, fechada=True)
            cid = _comprar(db)["payload"]["classificado_id"]
            inter = _Interacao(int(V))
            await cog.registrar_resposta(inter, cid, "Oi")
            assert "DMs" in inter.followups[0] and f"<@{U}>" in inter.followups[0]
            assert db.contar_respostas_classificado(cid) == 1
        finally:
            await bot.close()

    _rodar(verificar())


def test_botao_barra_o_autor_e_anuncio_encerrado_e_abre_o_modal_para_os_demais():
    async def verificar():
        db = novo_db()
        bot = await _bot_carregado(db)
        try:
            cog = bot.get_cog("Classificados")
            cid = _comprar(db)["payload"]["classificado_id"]
            botao = cog.view_do(cid).children[0]
            do_autor = _Interacao(int(U))
            await botao.callback(do_autor)
            assert "seu" in do_autor.response.eventos[0][1]
            outro = _Interacao(int(V))
            await botao.callback(outro)
            assert outro.response.eventos[0][0] == "modal"
            assert outro.response.eventos[0][1].classificado_id == cid
            db.expirar_classificados(datetime.now(timezone.utc) + timedelta(days=8))
            tarde = _Interacao(int(V))
            await botao.callback(tarde)
            assert "encerrado" in tarde.response.eventos[0][1]
        finally:
            await bot.close()

    _rodar(verificar())


def test_ciclo_encerra_a_mensagem_sem_botao_e_com_a_contagem_de_respostas():
    async def verificar():
        db = novo_db()
        bot = await _bot_carregado(db)
        try:
            cog = bot.get_cog("Classificados")
            canal = _Canal(555)
            bot.get_channel = lambda cid: canal if cid == 555 else None
            antes = datetime.now(timezone.utc) - timedelta(days=8)
            cid = _comprar(db, agora=antes)["payload"]["classificado_id"]
            db.vincular_mensagem_classificado(cid, "555", "9")
            db.responder_classificado(cid, V, "oi", antes)
            await cog.ciclo.coro(cog)
            mid, kw = canal.editadas[-1]
            assert kw["view"] is None and "encerrado" in kw["embed"].description
            assert kw["embed"].fields[0].value == "💬 1"
        finally:
            await bot.close()

    _rodar(verificar())


def test_template_do_botao_so_aceita_id_numerico():
    import re

    assert re.fullmatch(RESPONDER_TEMPLATE, "classificado_resp:12").group("id") == "12"
    assert re.fullmatch(RESPONDER_TEMPLATE, "classificado_resp:x") is None


def test_respostas_simultaneas_da_mesma_pessoa_contam_uma_so_vez():
    from concurrent.futures import ThreadPoolExecutor

    db = novo_db()
    cid = _comprar(db)["payload"]["classificado_id"]
    with ThreadPoolExecutor(max_workers=6) as pool:
        resultados = list(pool.map(lambda _: db.responder_classificado(cid, V, "Quero!")["status"], range(6)))
    assert resultados.count("ok") == 1 and resultados.count("ja_respondeu") == 5
    assert db.contar_respostas_classificado(cid) == 1


def test_compras_simultaneas_do_mesmo_classificado_cobram_e_gravam_uma_vez():
    from concurrent.futures import ThreadPoolExecutor

    db = novo_db()
    db.creditar(G, U, "Lunaris", 500)
    antes = db.creditar(G, U, "Lunaris", 0)
    with ThreadPoolExecutor(max_workers=4) as pool:
        pubs = list(pool.map(
            lambda _: db.comprar_classificado(G, U, 60, "classificado:777", {}, texto="Vendo espada", categoria="vendo"),
            range(4),
        ))
    assert len({p["id"] for p in pubs}) == 1
    assert db.creditar(G, U, "Lunaris", 0) == antes - 60
    with db._conn() as con:
        assert con.execute("SELECT COUNT(*) AS n FROM classificados").fetchone()["n"] == 1
