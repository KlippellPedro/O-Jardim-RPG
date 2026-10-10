"""Furo de verdade: história escrita pelo jogador, botões da vítima e veto do Mestre."""

from __future__ import annotations

import asyncio
import random
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from types import SimpleNamespace

import discord

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE))

from cogs.furos import DESMENTIR_TEMPLATE, SUBORNAR_TEMPLATE
from cogs.jornal import Jornal
from core import furos as furos_mod
from tests.db_utils import novo_db
from tests.test_painel import _bot_carregado

G, VENDEDOR, VITIMA = "100", "1", "2"


def _rodar(coro):
    return asyncio.run(coro)


# ── texto ───────────────────────────────────────────────────────────────────
def test_historia_limpa_aceita_texto_normal_e_recusa_link_curto_e_longo():
    ok, erro = furos_mod.limpar_historia("  Vi   essa pessoa\ntreinando escondida  ")
    assert ok == "Vi essa pessoa treinando escondida" and erro is None
    for ruim in ("curto", "x" * 281, "olha https://exemplo.com bem aqui", "entra em discord.gg/abc123 agora", "veja www.site.com ok"):
        assert furos_mod.limpar_historia(ruim)[0] is None


def test_historia_nao_pinga_ninguem():
    limpo, _ = furos_mod.limpar_historia("O @everyone precisa saber que ele fugiu da taverna")
    assert "@everyone" not in limpo and "@​everyone" in limpo
    limpo, _ = furos_mod.limpar_historia("Foi <@123456> que fugiu da taverna ontem a noite")
    assert "<@123456>" not in limpo
    assert furos_mod.limpar_historia("<@123456> <@654321>")[0] is None


def test_manchete_e_publicacao_com_e_sem_desmentido():
    assert furos_mod.texto_da_manchete("2", None) == "Vazaram segredos obscuros de <@2>!"
    texto = furos_mod.texto_da_manchete("2", "Fugiu da taverna")
    assert texto == "**Sobre <@2>:** Fugiu da taverna"
    assert furos_mod.descricao_publicada(texto, "2", False) == texto
    assert "desmente tudo" in furos_mod.descricao_publicada(texto, "2", True)


# ── banco ───────────────────────────────────────────────────────────────────
def _vender(db, historia="Fugiu da taverna sem pagar", recompensa=30, agora=None):
    db.garantir_jogador(G, VENDEDOR)
    return db.tentar_vender_furo(G, VENDEDOR, VITIMA, recompensa, agora or datetime.now(timezone.utc), historia=historia)


def test_furo_guarda_historia_autor_e_devolve_o_id():
    db = novo_db()
    r = _vender(db)
    f = db.get_fofoca(r["fofoca_id"])
    assert r["status"] == "comprado" and r["suborno"] == 60
    assert f["texto_fofoca"] == "**Sobre <@2>:** Fugiu da taverna sem pagar"
    assert (f["autor_id"], f["user_id"], f["desmentida"], f["status"]) == (VENDEDOR, VITIMA, False, "pendente")
    # sem historia, a manchete genérica de antes
    outro = db.tentar_vender_furo(G, "7", VITIMA, 20, datetime.now(timezone.utc))
    assert db.get_fofoca(outro["fofoca_id"])["texto_fofoca"] == "Vazaram segredos obscuros de <@2>!"


def test_suborno_por_id_so_atinge_aquele_furo():
    db = novo_db()
    agora = datetime.now(timezone.utc)
    a = _vender(db, agora=agora)["fofoca_id"]
    b = db.tentar_vender_furo(G, "7", VITIMA, 20, agora)["fofoca_id"]
    db.creditar(G, VITIMA, "Lunaris", 500)
    assert db.subornar_fofoca(G, VITIMA, agora, fofoca_id=b)["status"] == "subornada"
    assert db.get_fofoca(b)["status"] == "subornada" and db.get_fofoca(a)["status"] == "pendente"
    assert db.subornar_fofoca(G, VITIMA, agora, fofoca_id=b)["status"] == "ausente"


def test_desmentir_e_gratis_uma_vez_e_so_para_a_vitima_dentro_do_prazo():
    db = novo_db()
    agora = datetime.now(timezone.utc)
    fid = _vender(db, agora=agora)["fofoca_id"]
    assert db.desmentir_fofoca(fid, "999", agora)["status"] == "ausente"  # não é a vítima
    assert db.desmentir_fofoca(fid, VITIMA, agora)["status"] == "desmentida"
    assert db.desmentir_fofoca(fid, VITIMA, agora)["status"] == "ausente"  # só uma vez
    assert db.get_fofoca(fid)["desmentida"] is True
    outro = db.tentar_vender_furo(G, "7", VITIMA, 20, agora)["fofoca_id"]
    assert db.desmentir_fofoca(outro, VITIMA, agora + timedelta(hours=1))["status"] == "ausente"  # prazo vencido


def test_veto_barra_a_publicacao_e_o_vendedor_fica_com_o_dinheiro():
    db = novo_db()
    agora = datetime.now(timezone.utc)
    antes = db.creditar(G, VENDEDOR, "Lunaris", 0)
    fid = _vender(db, agora=agora - timedelta(hours=1))["fofoca_id"]  # prazo já vencido: iria sair
    assert db.vetar_fofoca("outro-servidor", fid) is None
    assert db.vetar_fofoca(G, fid)["status"] == "vetada"
    assert db.listar_fofocas_pendentes(agora) == []
    assert db.enfileirar_fofoca(fid, {"embed": {}}, agora) is None
    assert db.creditar(G, VENDEDOR, "Lunaris", 0) >= antes + 30
    assert db.vetar_fofoca(G, fid) is None  # já barrado
    assert [f["id"] for f in db.listar_fofocas_para_mestre(G)] == [fid]


# ── botões da vítima ────────────────────────────────────────────────────────
class _Resp:
    def __init__(self):
        self.eventos = []

    async def send_message(self, texto=None, **kw):
        self.eventos.append(("msg", texto))

    async def edit_message(self, **kw):
        self.eventos.append(("edit", kw))

    def is_done(self):
        return bool(self.eventos)


def _inter(uid):
    return SimpleNamespace(user=SimpleNamespace(id=int(uid)), response=_Resp())


def test_botoes_so_funcionam_para_a_vitima_e_encerram_a_mensagem():
    async def verificar():
        db = novo_db()
        bot = await _bot_carregado(db)
        try:
            cog = bot.get_cog("Furos")
            fid = _vender(db)["fofoca_id"]
            view = cog.view_da_vitima(fid, 60)
            subornar, desmentir = view.children
            assert subornar.item.custom_id == f"furo_subornar:{fid}" and "60" in subornar.item.label

            estranho = _inter(999)
            await subornar.callback(estranho)
            assert "não é sobre você" in estranho.response.eventos[0][1]

            db.garantir_jogador(G, VITIMA)
            with db._conn() as con:
                con.execute("UPDATE carteira SET saldo=0 WHERE user_id=%s", (VITIMA,))
            sem_saldo = _inter(VITIMA)
            await subornar.callback(sem_saldo)
            assert "Desmentir" in sem_saldo.response.eventos[0][1]
            assert db.get_fofoca(fid)["status"] == "pendente"

            db.creditar(G, VITIMA, "Lunaris", 500)
            ok = _inter(VITIMA)
            await subornar.callback(ok)
            assert ok.response.eventos[0][0] == "edit" and ok.response.eventos[0][1]["view"] is None
            assert db.get_fofoca(fid)["status"] == "subornada"

            tarde = _inter(VITIMA)
            await desmentir.callback(tarde)  # já foi subornada: a janela fechou
            assert "já saiu" in tarde.response.eventos[0][1]["content"]
        finally:
            await bot.close()

    _rodar(verificar())


def test_desmentir_marca_a_fofoca_e_ela_sai_com_a_negativa():
    async def verificar():
        db = novo_db()
        bot = await _bot_carregado(db)
        try:
            cog = bot.get_cog("Furos")
            fid = _vender(db)["fofoca_id"]
            inter = _inter(VITIMA)
            await cog.view_da_vitima(fid, 60).children[1].callback(inter)
            assert "desmentido" in inter.response.eventos[0][1]["content"]
            assert db.get_fofoca(fid)["desmentida"] is True and db.get_fofoca(fid)["status"] == "pendente"
            repetido = _inter(VITIMA)
            await cog.view_da_vitima(fid, 60).children[1].callback(repetido)
            assert "já desmentiu" in repetido.response.eventos[0][1]
        finally:
            await bot.close()

    _rodar(verificar())


def test_templates_dos_botoes_so_aceitam_id_numerico():
    import re

    assert re.fullmatch(SUBORNAR_TEMPLATE, "furo_subornar:7").group("id") == "7"
    assert re.fullmatch(DESMENTIR_TEMPLATE, "furo_desmentir:x") is None


# ── comandos ────────────────────────────────────────────────────────────────
class _Alvo(discord.Member):
    id = int(VITIMA)
    bot = False
    mention = f"<@{VITIMA}>"

    def __init__(self):
        self.dms = []

    async def send(self, texto, **kw):
        self.dms.append((texto, kw))


class _RespostaCmd:
    def __init__(self):
        self.mensagens = []

    async def send_message(self, *a, **kw):
        self.mensagens.append((a, kw))


def _cmd_interacao(uid=VENDEDOR):
    return SimpleNamespace(guild_id=G, user=SimpleNamespace(id=int(uid)), response=_RespostaCmd())


def test_vender_furo_com_historia_valida_antes_de_gastar_a_tentativa(monkeypatch):
    monkeypatch.setattr(random, "random", lambda: 0.1)
    monkeypatch.setattr(random, "randint", lambda a, b: 30)

    async def verificar():
        db = novo_db()
        bot = await _bot_carregado(db)
        try:
            cog = bot.get_cog("Jornal")
            db.garantir_jogador(G, VENDEDOR)
            ruim = _cmd_interacao()
            await Jornal.vender_furo.callback(cog, ruim, _Alvo(), historia="veja https://golpe.exemplo agora mesmo")
            assert "links" in ruim.response.mensagens[0][0][0]
            assert db.get_fofoca_pendente_usuario(G, VITIMA) is None  # nada foi cobrado nem gravado

            alvo = _Alvo()
            ok = _cmd_interacao()
            await Jornal.vender_furo.callback(cog, ok, alvo, historia="Fugiu da taverna sem pagar a conta")
            assert "Fugiu da taverna" in db.get_fofoca_pendente_usuario(G, VITIMA)["texto_fofoca"]
            texto, kw = alvo.dms[0]
            assert "Fugiu da taverna" in texto and "/subornar_jornalista" in texto
            assert [b.item.label.split(" (")[0] for b in kw["view"].children] == ["Subornar", "Desmentir"]
        finally:
            await bot.close()

    _rodar(verificar())


def test_comandos_do_mestre_listam_e_vetam():
    async def verificar():
        db = novo_db()
        bot = await _bot_carregado(db)
        try:
            cog = bot.get_cog("Jornal")
            vazio = _cmd_interacao()
            await Jornal.furo_listar.callback(cog, vazio)
            assert "Nenhum furo" in vazio.response.mensagens[0][0][0]

            fid = _vender(db)["fofoca_id"]
            lista = _cmd_interacao()
            await Jornal.furo_listar.callback(cog, lista)
            emb = lista.response.mensagens[0][1]["embed"]
            assert f"#{fid}" in emb.description and "aguardando" in emb.description and f"<@{VENDEDOR}>" in emb.description
            veto = _cmd_interacao()
            await Jornal.furo_vetar.callback(cog, veto, fid)
            assert "barrado" in veto.response.mensagens[0][0][0]
            de_novo = _cmd_interacao()
            await Jornal.furo_vetar.callback(cog, de_novo, fid)
            assert "não encontrado" in de_novo.response.mensagens[0][0][0]
        finally:
            await bot.close()

    _rodar(verificar())


def test_veto_e_publicacao_simultaneos_nunca_publicam_algo_vetado():
    from concurrent.futures import ThreadPoolExecutor

    for _ in range(5):
        db = novo_db()
        agora = datetime.now(timezone.utc)
        fid = _vender(db, agora=agora - timedelta(hours=1))["fofoca_id"]

        def publicar():
            return db.enfileirar_fofoca(fid, {"embed": {}}, agora)

        def vetar():
            return db.vetar_fofoca(G, fid)

        with ThreadPoolExecutor(max_workers=2) as pool:
            a, b = pool.submit(publicar), pool.submit(vetar)
            publicada, vetada = a.result(), b.result()
        # exatamente um dos dois vence, e o estado final bate com o vencedor
        assert (publicada is None) != (vetada is None)
        assert db.get_fofoca(fid)["status"] == ("vetada" if vetada else "publicada")


def test_duas_vitimas_simultaneas_nao_pagam_o_suborno_em_dobro():
    from concurrent.futures import ThreadPoolExecutor

    db = novo_db()
    agora = datetime.now(timezone.utc)
    fid = _vender(db, agora=agora)["fofoca_id"]
    db.creditar(G, VITIMA, "Lunaris", 500)
    antes = db.creditar(G, VITIMA, "Lunaris", 0)
    with ThreadPoolExecutor(max_workers=4) as pool:
        r = list(pool.map(lambda _: db.subornar_fofoca(G, VITIMA, agora, fofoca_id=fid)["status"], range(4)))
    assert r.count("subornada") == 1
    assert db.creditar(G, VITIMA, "Lunaris", 0) == antes - 60
