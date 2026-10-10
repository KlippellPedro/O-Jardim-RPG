"""Correções da revisão geral de 2026-10-09 (achados dos revisores independentes)."""

from __future__ import annotations

import asyncio
import sys
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from pathlib import Path
from types import SimpleNamespace

import discord

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE))

from cogs.jornal import Jornal
from core import furos as furos_mod
from core.edicao import FUSO, semana_da_edicao
from core.painel import ler_inteiro
from core.publicacoes import payload_embed
from tests.db_utils import novo_db
from tests.test_painel import _bot_carregado

G, U, V = "100", "200", "300"


def _rodar(coro):
    return asyncio.run(coro)


# ── filtro de texto livre ───────────────────────────────────────────────────
def test_dominio_solto_tambem_e_bloqueado_mas_texto_normal_passa():
    for ruim in ("visite evil.com/x agora", "entre em meu.site.com.br hoje", "olhe discord.gg/abc", "ve isso: LOJA.GG"):
        assert furos_mod.limpar_texto(ruim, minimo=1, maximo=300)[0] is None, ruim
    for bom in (
        "Vendo espada de ferro por 3.000 Lunaris. Preço bom, aceito troca.",
        "Procuro grupo para sábado à noite, nível 5 ou 6.",
        "Compro poção de cura (qualquer quantidade)!",
    ):
        assert furos_mod.limpar_texto(bom, minimo=1, maximo=300)[0] == bom


def test_classificado_mantem_mencao_de_usuario_mas_recado_e_furo_nao():
    texto = "Me chama no privado: <@123456> para negociar"
    assert furos_mod.limpar_texto(texto, minimo=1, maximo=300, tirar_mencoes=False)[0] == texto
    assert "<@123456>" not in furos_mod.limpar_texto(texto, minimo=1, maximo=300)[0]
    assert "@​everyone" in furos_mod.limpar_texto("oi @everyone", minimo=1, maximo=300, tirar_mencoes=False)[0]


def test_recado_de_varias_linhas_vira_uma_linha_so():
    assert furos_mod.limpar_texto("linha um\n\nlinha   dois\nlinha tres", minimo=1, maximo=300)[0] == "linha um linha dois linha tres"


# ── números digitados ───────────────────────────────────────────────────────
def test_ler_inteiro_aceita_milhar_e_recusa_decimal():
    assert [ler_inteiro(x) for x in ("50", " 1500 ", "1.500", "1,500", "12.345.678", "1 000")] == [50, 1500, 1500, 1500, 12345678, 1000]
    for ruim in ("50,5", "1.5", "0,5", "abc", "", "1.50", "10.00", "-5", "1,5,5"):
        assert ler_inteiro(ruim) is None, ruim


# ── classificados ───────────────────────────────────────────────────────────
class _Resp:
    def __init__(self):
        self.mensagens = []

    async def send_message(self, texto=None, **kw):
        self.mensagens.append(texto)

    async def defer(self, **kw):
        pass

    def is_done(self):
        return bool(self.mensagens)


def _inter(uid, gid=G):
    return SimpleNamespace(
        guild_id=int(gid), id=1, user=SimpleNamespace(id=int(uid)), response=_Resp(),
        followup=SimpleNamespace(send=lambda *a, **k: _vazio()),
    )


async def _vazio():
    return None


def test_comando_de_classificado_recusa_link_sem_cobrar():
    async def verificar():
        db = novo_db()
        db.creditar(G, U, "Lunaris", 500)
        antes = db.creditar(G, U, "Lunaris", 0)
        bot = await _bot_carregado(db)
        try:
            cog = bot.get_cog("Jornal")
            inter = _inter(U)
            await Jornal.anunciar_classificado.callback(cog, inter, "Compre barato em loja-falsa.com agora", 60, None)
            assert "links" in inter.response.mensagens[0]
            assert db.creditar(G, U, "Lunaris", 0) == antes
        finally:
            await bot.close()

    _rodar(verificar())


def test_resposta_com_link_nao_e_registrada_nem_entregue():
    async def verificar():
        db = novo_db()
        db.creditar(G, U, "Lunaris", 500)
        pub = db.comprar_classificado(G, U, 60, "c:1", payload_embed(discord.Embed(title="x")), texto="Vendo espada", categoria="vendo")
        cid = pub["payload"]["classificado_id"]
        bot = await _bot_carregado(db)
        try:
            cog = bot.get_cog("Classificados")
            inter = _inter(V)
            await cog.registrar_resposta(inter, cid, "clique em golpe.xyz para ver")
            assert "links" in inter.response.mensagens[0]
            assert db.contar_respostas_classificado(cid) == 0
        finally:
            await bot.close()

    _rodar(verificar())


def _falhar_ate_esgotar(db, pub_id):
    for _ in range(12):
        with db._conn() as con:  # pula o recuo entre tentativas
            con.execute("UPDATE jornal_publicacoes SET proxima_tentativa=CURRENT_TIMESTAMP WHERE id=%s", (pub_id,))
        assert db.reivindicar_publicacao(pub_id) is not None
        db.marcar_publicacao_falha(pub_id, "canal ausente")


def test_classificado_que_nunca_foi_publicado_e_reembolsado():
    db = novo_db()
    db.creditar(G, U, "Lunaris", 500)
    antes = db.creditar(G, U, "Lunaris", 0)
    pub = db.comprar_classificado(G, U, 80, "c:1", payload_embed(discord.Embed(title="x")), texto="Vendo espada", categoria="vendo")
    cid = pub["payload"]["classificado_id"]
    assert db.creditar(G, U, "Lunaris", 0) == antes - 80
    _falhar_ate_esgotar(db, pub["id"])
    assert db.creditar(G, U, "Lunaris", 0) == antes
    assert db.get_classificado(cid)["status"] == "expirado"
    with db._conn() as con:
        extrato = con.execute("SELECT delta, descricao FROM extrato WHERE user_id=%s ORDER BY id DESC LIMIT 1", (U,)).fetchone()
    assert extrato["delta"] == 80 and "Reembolso" in extrato["descricao"]


def test_classificado_ja_publicado_nao_e_reembolsado_e_outras_publicacoes_nao_sao_afetadas():
    db = novo_db()
    db.creditar(G, U, "Lunaris", 500)
    pub = db.comprar_classificado(G, U, 80, "c:1", payload_embed(discord.Embed(title="x")), texto="Vendo espada", categoria="vendo")
    cid = pub["payload"]["classificado_id"]
    db.vincular_mensagem_classificado(cid, "5", "9")  # a mensagem existe no Discord
    saldo = db.creditar(G, U, "Lunaris", 0)
    _falhar_ate_esgotar(db, pub["id"])
    assert db.creditar(G, U, "Lunaris", 0) == saldo and db.get_classificado(cid)["status"] == "ativo"
    outra = db.enfileirar_publicacao(G, categoria="noticia", origem="evento", dedupe_key="e:1", payload={"embed": {}}, canal_id=None, referencia=None, automacao=None)
    _falhar_ate_esgotar(db, outra["id"])
    assert db.creditar(G, U, "Lunaris", 0) == saldo


# ── chaves ──────────────────────────────────────────────────────────────────
def test_primeiras_concessoes_simultaneas_de_chave_somam_e_respeitam_o_teto():
    from core.loot import CHAVES_MAX

    db = novo_db()
    with ThreadPoolExecutor(max_workers=4) as pool:
        entradas = list(pool.map(lambda _: db.conceder_chave(G, U, 1), range(4)))
    assert sum(entradas) == 4 and db.get_chaves(G, U)["quantidade"] == 4
    assert db.conceder_chave(G, U, 100) == CHAVES_MAX - 4
    assert db.get_chaves(G, U)["quantidade"] == CHAVES_MAX
    assert db.conceder_chave(G, U, 1) == 0
    assert db.conceder_chave(G, "outro", 0) == 0


# ── edição semanal ──────────────────────────────────────────────────────────
def test_domingo_e_a_recuperacao_de_segunda_tem_a_mesma_chave_e_a_semana_seguinte_outra():
    domingo = datetime(2026, 10, 11, 19, 30, tzinfo=FUSO)
    segunda = datetime(2026, 10, 12, 8, 0, tzinfo=FUSO)
    assert semana_da_edicao(domingo) == semana_da_edicao(segunda) == "2026-W41"
    assert semana_da_edicao(domingo + timedelta(days=7)) == "2026-W42"
    # a chave segue o relógio de São Paulo: domingo 22h em SP já é segunda em UTC
    assert semana_da_edicao(datetime(2026, 10, 12, 1, 30, tzinfo=timezone.utc)) == "2026-W41"


def test_recuperar_na_segunda_nao_empurra_a_edicao_seguinte_para_depois_da_janela():
    db = novo_db()
    db.marcar_ciclo_guild(G, "resumo_semanal")
    segunda_8h = datetime(2026, 10, 12, 8, 0, tzinfo=FUSO)
    proximo_domingo_19h = datetime(2026, 10, 18, 19, 0, tzinfo=FUSO)
    decorrido = proximo_domingo_19h - segunda_8h
    with db._conn() as con:
        con.execute("UPDATE ciclos_guild SET executado_em = CURRENT_TIMESTAMP - make_interval(secs => %s) WHERE ciclo='resumo_semanal'", (decorrido.total_seconds(),))
    assert db.ciclo_guild_devido(G, "resumo_semanal", 144) is True  # com 168h ficaria falso
    assert db.ciclo_guild_devido(G, "resumo_semanal", 168) is False
    with db._conn() as con:
        con.execute("UPDATE ciclos_guild SET executado_em = CURRENT_TIMESTAMP - interval '30 hours' WHERE ciclo='resumo_semanal'")
    assert db.ciclo_guild_devido(G, "resumo_semanal", 144) is False  # nunca duas vezes na mesma semana
