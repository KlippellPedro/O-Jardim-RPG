"""Achados da revisão geral de 2026-10-09 sobre os eventos recorrentes e o /banco."""

from __future__ import annotations

import asyncio
import random
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from types import SimpleNamespace

import pytest

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE))

from core import eventos
from tests.db_utils import novo_db
from tests.test_eventos import (
    G, SABADO_19H, U, _Canal, _catalogo, _guild, _item, _leilao_casa, _preparar,
)

BASE_REPO = Path(__file__).resolve().parents[3]


def _rodar(coro):
    return asyncio.run(coro)


def test_leilao_semanal_so_oferece_itens_pagos_em_lunaris_ou_solares_e_alcancaveis():
    cat = _catalogo(
        _item("implante-sombrio", "implante", "epico", preco={"Créditos Sombrios": 200}),
        _item("calice", "artefato", "mitico", preco={"Fragmentos de Estrela": 150}),
        _item("espada-cara", "arma", "lendario", preco={"Lunaris": 90_000}),
        _item("armadura-solar", "armadura", "raro", preco=5),  # número = 5 Solares = 500 Lunaris
        _item("sem-preco", "arma", "raro", preco={}),
    )
    for _ in range(40):
        assert eventos.escolher_item_leilao(cat, random).id == "armadura-solar"
    por_id = {i.id: i for i in cat.listar()}
    assert eventos.preco_em_lunaris(por_id["armadura-solar"]) == 500
    assert eventos.lance_inicial(500) == 125
    assert eventos.preco_em_lunaris(por_id["implante-sombrio"]) is None


def test_catalogo_real_tem_itens_elegiveis_e_o_lance_inicial_nunca_passa_de_600():
    from core.catalogo import Catalogo

    arquivo = BASE_REPO / "data" / "loja" / "catalogo.json"
    if not arquivo.exists():
        pytest.skip("catálogo do repositório indisponível")
    cat = Catalogo()
    cat.carregar_arquivo(str(arquivo))
    viu = set()
    for semente in range(400):
        item = eventos.escolher_item_leilao(cat, random.Random(semente))
        assert item is not None
        assert eventos.lance_inicial(eventos.preco_em_lunaris(item)) <= 600
        assert item.tipo in eventos.LEILAO_TIPOS and item.raridade in eventos.LEILAO_PESOS
        viu.add(item.id)
    assert len(viu) >= 10, "a rotação precisa ter variedade de verdade"


def test_ranking_de_leiloes_nao_conta_a_casa_mas_conta_jogadores():
    db = novo_db()
    db.creditar(G, U, "Lunaris", 500)
    casa = _leilao_casa(db)["id"]
    db.dar_lance_leilao_com_custodia(casa, G, U, 100)
    db.liquidar_leilao_com_custodia(casa, 0.05)
    assert db.top_leiloes_vendidos(G) == []
    jogador = db.criar_leilao(
        G, "7", "item", "espada", "Espada", "Lunaris", 10, "1",
        datetime.now(timezone.utc) + timedelta(hours=1), "legado",
    )["id"]
    db.dar_lance_leilao_com_custodia(jogador, G, U, 50)
    db.liquidar_leilao_com_custodia(jogador, 0.05)
    assert db.top_leiloes_vendidos(G) == [{"user_id": "7", "quantidade": 1}]


def test_lance_depois_do_prazo_e_recusado_mesmo_antes_do_ciclo_fechar():
    db = novo_db()
    db.creditar(G, U, "Lunaris", 500)
    lid = _leilao_casa(db)["id"]
    with db._conn() as con:
        con.execute("UPDATE leiloes SET expira_em = CURRENT_TIMESTAMP - interval '1 second' WHERE id=%s", (lid,))
    saldo = db.get_carteira(G, U)["Lunaris"]
    assert db.dar_lance_leilao_com_custodia(lid, G, U, 100) is None
    assert db.get_carteira(G, U)["Lunaris"] == saldo


def test_reset_da_economia_cancela_a_meta_e_nao_deixa_o_reembolso_criar_dinheiro():
    db = novo_db()
    db.creditar(G, U, "Lunaris", 500)
    with db._conn() as con:
        meta_id = int(con.execute(
            "INSERT INTO jardim_metas (guild_id, titulo, alvo, prazo) "
            "VALUES (%s, 'Ponte', 500, CURRENT_TIMESTAMP + interval '3 days') RETURNING id", (G,),
        ).fetchone()["id"])
    db.doar_meta(G, U, 40)
    db.comprar_chaves(G, U, 1, 40, 10)
    with db._conn() as con:  # tabela da plataforma que o reset consulta (sem campanha vinculada)
        con.execute("CREATE TABLE IF NOT EXISTS campanhas_discord (campanha_id TEXT PRIMARY KEY, discord_guild_id TEXT UNIQUE NOT NULL)")
    db.resetar_economia_guild(G)
    with db._conn() as con:
        meta = con.execute("SELECT status FROM jardim_metas WHERE id=%s", (meta_id,)).fetchone()
        doacoes = con.execute("SELECT reembolsada FROM jardim_doacoes WHERE meta_id=%s", (meta_id,)).fetchall()
    assert meta["status"] == "cancelada" and doacoes and all(d["reembolsada"] for d in doacoes)
    assert db.get_chaves(G, U)["quantidade"] == 0


def test_dia_de_bolsa_e_o_aviso_nascem_na_mesma_transacao():
    db = novo_db()
    db.abrir_dia_de_bolsa(G, "bolsa_alta", "Dia de Bolsa: Bolsa em alta", "t", 24, aviso="📈 aviso")
    with db._conn() as con:
        assert con.execute("SELECT COUNT(*) AS n FROM avisos_pendentes WHERE categoria='noticia'").fetchone()["n"] == 1
    with pytest.raises(Exception):
        db.abrir_dia_de_bolsa(G, "bolsa_baixa", "titulo", "t", "horas-invalidas", aviso="não deve ficar")  # type: ignore[arg-type]
    with db._conn() as con:
        assert con.execute("SELECT COUNT(*) AS n FROM avisos_pendentes").fetchone()["n"] == 1


def test_campo_do_inicio_corta_linhas_inteiras_e_preserva_os_eventos():
    from cogs.painel import _caber_em_campo

    linhas = [(0, "📢 Dia de Bolsa <t:1:R>"), (1, "🔨 leilão"), (4, "🎁 " + "x" * 600), (4, "🎁 " + "y" * 600)]
    texto = _caber_em_campo(linhas)
    assert len(texto) <= 1024 and texto.startswith("📢 Dia de Bolsa <t:1:R>") and "🔨 leilão" in texto
    assert not (("x" * 100) in texto and ("y" * 100) in texto)  # as duas não cabem juntas
    assert _caber_em_campo([(0, "só uma")]) == "só uma"


def test_interacao_efemera_forca_resposta_privada_sem_tirar_a_escolha_do_comando():
    from core.painel import InteracaoEfemera

    class Resp:
        def __init__(self):
            self.chamadas = []

        async def send_message(self, *a, **kw):
            self.chamadas.append(kw)

        async def defer(self, *a, **kw):
            self.chamadas.append(kw)

    class Seg:
        def __init__(self):
            self.chamadas = []

        async def send(self, *a, **kw):
            self.chamadas.append(kw)

    real = SimpleNamespace(response=Resp(), followup=Seg(), user=SimpleNamespace(id=1), guild_id=5)
    eph = InteracaoEfemera(real)

    async def usar():
        await eph.response.send_message("oi")
        await eph.response.send_message("publico", ephemeral=False)
        await eph.response.defer()
        await eph.followup.send("depois")

    _rodar(usar())
    assert [c["ephemeral"] for c in real.response.chamadas] == [True, False, True]
    assert real.followup.chamadas == [{"ephemeral": True}]
    assert eph.user.id == 1 and eph.guild_id == 5  # o resto vem da interação real


def test_leilao_semanal_nao_posta_sem_permissao_e_nao_deixa_leilao_pendurado():
    async def verificar():
        db = novo_db()
        bot = await _preparar(db)
        try:
            cog = bot.get_cog("Eventos")

            class Sem(_Canal):
                def permissions_for(self, membro):
                    return SimpleNamespace(send_messages=False, embed_links=False)

            canal = Sem(555)
            guild = SimpleNamespace(id=int(G), me=object(), get_channel=lambda cid: canal)
            await cog.rodar_guild(guild, SABADO_19H)
            assert db.listar_leiloes_ativos(G) == [] and canal.enviados == []
            with db._conn() as con:
                assert con.execute("SELECT COUNT(*) AS n FROM leiloes").fetchone()["n"] == 0
            guild.get_channel = lambda cid: _Canal(555)  # com permissão a trava foi devolvida e tenta de novo
            guild.me = None
            await cog.rodar_guild(guild, SABADO_19H + timedelta(minutes=15))
            assert len(db.listar_leiloes_ativos(G)) == 1
        finally:
            await bot.close()

    _rodar(verificar())


def test_falha_ao_gravar_a_mensagem_nao_abre_um_segundo_leilao():
    async def verificar():
        db = novo_db()
        bot = await _preparar(db)
        try:
            cog = bot.get_cog("Eventos")
            canal = _Canal(555)
            guild = _guild(canal)
            original = db.set_leilao_mensagem

            def quebrado(*a, **k):
                raise RuntimeError("banco piscou")

            db.set_leilao_mensagem = quebrado
            await cog.rodar_guild(guild, SABADO_19H)
            db.set_leilao_mensagem = original
            await cog.rodar_guild(guild, SABADO_19H + timedelta(minutes=15))
            assert len(canal.enviados) == 1 and len(db.listar_leiloes_ativos(G)) == 1
        finally:
            await bot.close()

    _rodar(verificar())
