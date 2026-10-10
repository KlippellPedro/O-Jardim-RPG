"""Eventos recorrentes: Leilão do Jardim (sábado) e Dia de Bolsa (quarta)."""

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

from cogs.mercado import LEILAO_LANCE_TEMPLATE
from core import economia, eventos
from core.catalogo import Catalogo
from tests.db_utils import novo_db
from tests.test_painel import _bot_carregado

G, U = "100", "200"
SP = eventos.FUSO

# 2026-10-07 é quarta, 08 quinta, 10 sábado, 11 domingo, 12 segunda.
QUARTA_13H = datetime(2026, 10, 7, 13, 0, tzinfo=SP)
SABADO_19H = datetime(2026, 10, 10, 19, 0, tzinfo=SP)


def _rodar(coro):
    return asyncio.run(coro)


def _catalogo(*entradas):
    cat = Catalogo()
    cat.carregar_dados({"entradas": list(entradas)})
    return cat


def _item(id_, tipo="arma", raridade="epico", preco=None, **extra):
    conteudo = {"raridade": raridade, "preco": preco if preco is not None else {"Lunaris": 400}, "descricao": "Uma lâmina."}
    conteudo.update(extra)
    return {"tipo": tipo, "id": id_, "titulo": id_.title(), "conteudo": conteudo}


# ── calendário ──────────────────────────────────────────────────────────────
def test_semana_chave_e_iso_em_sao_paulo():
    assert eventos.semana_chave(QUARTA_13H) == "2026-W41"
    assert eventos.semana_chave(SABADO_19H) == "2026-W41"
    # domingo 23h em SP já é segunda em UTC: continua na semana de SP
    assert eventos.semana_chave(datetime(2026, 10, 12, 1, 0, tzinfo=timezone.utc)) == "2026-W41"
    assert eventos.semana_chave(datetime(2026, 10, 12, 4, 0, tzinfo=SP)) == "2026-W42"


def test_janela_do_leilao_vai_de_sabado_18h_ao_fim_do_domingo():
    assert not eventos.janela_leilao(datetime(2026, 10, 10, 17, 59, tzinfo=SP))
    assert eventos.janela_leilao(datetime(2026, 10, 10, 18, 0, tzinfo=SP))
    assert eventos.janela_leilao(datetime(2026, 10, 11, 23, 59, tzinfo=SP))
    assert not eventos.janela_leilao(datetime(2026, 10, 12, 0, 0, tzinfo=SP))
    assert not eventos.janela_leilao(QUARTA_13H)


def test_janela_da_bolsa_vai_de_quarta_meio_dia_a_quinta_de_manha():
    assert not eventos.janela_bolsa(datetime(2026, 10, 7, 11, 59, tzinfo=SP))
    assert eventos.janela_bolsa(datetime(2026, 10, 7, 12, 0, tzinfo=SP))
    assert eventos.janela_bolsa(datetime(2026, 10, 8, 11, 59, tzinfo=SP))
    assert not eventos.janela_bolsa(datetime(2026, 10, 8, 12, 0, tzinfo=SP))
    assert not eventos.janela_bolsa(SABADO_19H)


# ── regras puras ────────────────────────────────────────────────────────────
class _RngFixo:
    def __init__(self, escolha=0):
        self.escolha = escolha

    def choices(self, itens, weights=None, k=1):
        return [itens[self.escolha]]

    def choice(self, itens):
        return itens[self.escolha]


def test_humores_da_bolsa_e_efeitos():
    assert eventos.sortear_humor_bolsa(_RngFixo(0)) == "bolsa_alta"
    assert eventos.sortear_humor_bolsa(_RngFixo(1)) == "bolsa_baixa"
    assert eventos.sortear_humor_bolsa(_RngFixo(2)) == "cambio_livre"
    assert eventos.chance_ganho_com_bolsa("bolsa_alta", 0.7) == 0.90
    assert eventos.chance_ganho_com_bolsa("bolsa_baixa", 0.7) == 0.50
    assert eventos.chance_ganho_com_bolsa("cambio_livre", 0.7) == 0.7
    assert eventos.chance_ganho_com_bolsa(None, 0.7) == 0.7
    assert eventos.taxa_com_cambio_livre(0.05, "cambio_livre") == 0.0
    assert eventos.taxa_com_cambio_livre(0.05, "bolsa_alta") == 0.05


def test_titulo_rende_ou_perde_conforme_a_chance_do_dia(monkeypatch):
    monkeypatch.setattr(economia.random, "random", lambda: 0.80)
    assert economia.valor_maturado_investimento(1000, False) == 1000 - 30  # 0,80 > 0,70: perde
    assert economia.valor_maturado_investimento(1000, False, 0.90) == 1080  # bolsa em alta: rende
    assert economia.valor_maturado_investimento(1000, False, 0.50) == 1000 - 30
    assert economia.valor_maturado_investimento(1000, True, 0.99) == 1000 + economia.math.floor(
        1000 * economia.INVESTIMENTO_TAXA_CRISE
    )  # crise vale mais que a bolsa


def test_item_do_leilao_so_sai_de_tipo_e_raridade_permitidos():
    cat = _catalogo(
        _item("espada", "arma", "epico"),
        _item("urso", "monstro", "epico"),
        _item("castelo", "propriedade", "lendario"),
        _item("fruto", "fruto-eden", "mitico"),
        _item("relicario", "artefato", "reliquia da criacao"),
        _item("faca", "arma", "comum"),
        _item("balcao", "arma", "raro", disponivelNaLoja=False),
    )
    for _ in range(50):
        assert eventos.escolher_item_leilao(cat, random).id == "espada"
    assert eventos.escolher_item_leilao(_catalogo(_item("faca", "arma", "comum")), random) is None


def test_lance_inicial_e_um_quarto_do_preco_com_piso():
    assert eventos.lance_inicial(1000) == 250
    assert eventos.lance_inicial(100) == 50
    assert eventos.lance_inicial(None) == 50


# ── banco ───────────────────────────────────────────────────────────────────
def test_trava_de_ciclo_unico_vale_uma_vez_e_pode_ser_devolvida():
    db = novo_db()
    assert db.reivindicar_ciclo_unico(G, "evento:leilao:2026-W41") is True
    assert db.reivindicar_ciclo_unico(G, "evento:leilao:2026-W41") is False
    assert db.reivindicar_ciclo_unico("outro", "evento:leilao:2026-W41") is True
    db.liberar_ciclo_unico(G, "evento:leilao:2026-W41")
    assert db.reivindicar_ciclo_unico(G, "evento:leilao:2026-W41") is True


def test_automacao_e_canal_do_jornal_com_fallback():
    db = novo_db()
    assert db.automacao_ativa(G, "leilao_semanal", True) is True
    with db._conn() as con:
        con.execute("INSERT INTO jornal_automacoes (guild_id, tipo, ativo) VALUES (%s, 'leilao_semanal', FALSE)", (G,))
    assert db.automacao_ativa(G, "leilao_semanal", True) is False
    assert db.canal_do_jornal(G, "dinheiro") is None
    db.set_jornal_canal(G, "555")
    assert db.canal_do_jornal(G, "dinheiro") == "555"
    with db._conn() as con:
        con.execute("INSERT INTO canais_jornal (guild_id, categoria, canal_id) VALUES (%s, 'dinheiro', '777')", (G,))
    assert db.canal_do_jornal(G, "dinheiro") == "777"


def test_humor_da_bolsa_so_vale_enquanto_o_evento_esta_no_ar():
    db = novo_db()
    assert db.humor_bolsa_ativo(G) is None
    db.abrir_dia_de_bolsa(G, "bolsa_alta", "Dia de Bolsa: Bolsa em alta", "Texto.", 24)
    assert db.humor_bolsa_ativo(G) == "bolsa_alta"
    assert db.humor_bolsa_ativo("outro") is None
    with db._conn() as con:
        con.execute("UPDATE jardim_eventos SET expira_em = CURRENT_TIMESTAMP - interval '1 minute'")
    assert db.humor_bolsa_ativo(G) is None
    # o evento do Mestre sem efeito de bolsa não conta
    with db._conn() as con:
        con.execute(
            "INSERT INTO jardim_eventos (guild_id, titulo, texto, tipo, criado_por, expira_em, efeito) "
            "VALUES (%s, 'Festa', 't', 'festival', 'x', CURRENT_TIMESTAMP + interval '1 hour', 'baus_especiais')", (G,)
        )
    assert db.humor_bolsa_ativo(G) is None


def _leilao_casa(db, lance_minimo=50):
    return db.criar_leilao(
        G, eventos.LEILAO_VENDEDOR, "item", "espada", "Espada", "Lunaris", lance_minimo, "1",
        datetime.now(timezone.utc) + timedelta(hours=24), eventos.LEILAO_MODO_POSSE,
    )


def test_leilao_da_casa_nao_credita_ninguem_e_o_dinheiro_sai_da_economia():
    db = novo_db()
    db.creditar(G, U, "Lunaris", 500)
    antes = db.get_carteira(G, U)["Lunaris"]
    leilao = _leilao_casa(db)
    assert db.dar_lance_leilao_com_custodia(leilao["id"], G, U, 120) is not None
    resultado = db.liquidar_leilao_com_custodia(leilao["id"], 0.05)
    assert resultado is not None
    assert db.get_carteira(G, U)["Lunaris"] == antes - 120
    assert db.get_leilao(leilao["id"])["status"] == "encerrado"
    with db._conn() as con:
        assert con.execute("SELECT COUNT(*) AS n FROM extrato WHERE user_id=%s", (eventos.LEILAO_VENDEDOR,)).fetchone()["n"] == 0
        assert con.execute("SELECT COUNT(*) AS n FROM carteira WHERE user_id=%s", (eventos.LEILAO_VENDEDOR,)).fetchone()["n"] == 0
        assert con.execute("SELECT COUNT(*) AS n FROM custodia_moeda").fetchone()["n"] == 0


# ── cog ─────────────────────────────────────────────────────────────────────
class _Canal(discord.TextChannel):
    def __init__(self, canal_id, falhar=False):
        self.id = canal_id
        self.falhar = falhar
        self.enviados = []

    async def send(self, **kw):
        if self.falhar:
            raise discord.HTTPException(SimpleNamespace(status=500, reason="x"), "erro")
        self.enviados.append(kw)
        return SimpleNamespace(id=9000 + len(self.enviados))


def _guild(canal=None):
    return SimpleNamespace(id=int(G), get_channel=lambda cid: canal if canal is not None and canal.id == cid else None)


class _Inventario:
    def __init__(self):
        self.entregas = []

    async def contar(self, *a, **k):
        return 0

    async def dar(self, guild_id, user_id, item_id, titulo, tipo, quantidade=1, dados=None, *, motivo, chave):
        self.entregas.append((user_id, item_id, chave))
        return "cofre"


async def _preparar(db, canal_id=555, itens=None):
    bot = await _bot_carregado(db)
    bot.catalogo = _catalogo(*(itens or [_item("espada")]))
    bot.inventario = _Inventario()
    db.set_jornal_canal(G, str(canal_id))
    return bot


def test_leilao_semanal_abre_uma_vez_por_semana_com_botao_e_embed_da_casa():
    async def verificar():
        db = novo_db()
        bot = await _preparar(db)
        try:
            cog = bot.get_cog("Eventos")
            canal = _Canal(555)
            guild = _guild(canal)
            await cog.rodar_guild(guild, SABADO_19H)
            await cog.rodar_guild(guild, SABADO_19H + timedelta(minutes=15))
            await cog.rodar_guild(guild, SABADO_19H + timedelta(days=1))  # domingo, mesma semana
            assert len(canal.enviados) == 1
            leilao = db.listar_leiloes_ativos(G)[0]
            assert leilao["vendedor_id"] == "jardim" and leilao["modo_posse"] == "casa"
            assert leilao["lance_minimo"] == 100 and leilao["mensagem_id"] == "9001"  # 25% de 400
            emb = canal.enviados[0]["embed"]
            assert "Casa do Jardim" in emb.description and "Lance mínimo" in emb.description
            assert emb.fields[0].name.startswith("Épico")
            botao = canal.enviados[0]["view"].children[0]
            assert botao.item.custom_id == f"leilao_lance:{leilao['id']}"
            assert (leilao["expira_em"] - datetime.now(timezone.utc)) > timedelta(hours=23)
            # semana seguinte: outro leilão
            await cog.rodar_guild(guild, SABADO_19H + timedelta(days=7))
            assert len(canal.enviados) == 2
        finally:
            await bot.close()

    _rodar(verificar())


def test_leilao_semanal_devolve_a_trava_quando_falha_e_tenta_de_novo():
    async def verificar():
        db = novo_db()
        bot = await _preparar(db)
        try:
            cog = bot.get_cog("Eventos")
            quebrado = _Canal(555, falhar=True)
            await cog.rodar_guild(_guild(quebrado), SABADO_19H)
            assert db.listar_leiloes_ativos(G) == []  # nada ficou pendurado
            with db._conn() as con:
                assert con.execute("SELECT status FROM leiloes").fetchone()["status"] == "cancelado"
            bom = _Canal(555)
            await cog.rodar_guild(_guild(bom), SABADO_19H + timedelta(minutes=15))
            assert len(bom.enviados) == 1
            # sem canal configurado também não trava a semana
            sem_canal = _guild(None)
            await cog.rodar_guild(sem_canal, SABADO_19H + timedelta(days=7))
            assert db.reivindicar_ciclo_unico(G, "evento:leilao:2026-W42") is True
        finally:
            await bot.close()

    _rodar(verificar())


def test_eventos_desligados_pelo_jornal_nao_rodam():
    async def verificar():
        db = novo_db()
        bot = await _preparar(db)
        try:
            with db._conn() as con:
                con.execute("INSERT INTO jornal_automacoes (guild_id, tipo, ativo) VALUES (%s, 'leilao_semanal', FALSE)", (G,))
                con.execute("INSERT INTO jornal_automacoes (guild_id, tipo, ativo) VALUES (%s, 'dia_de_bolsa', FALSE)", (G,))
            cog = bot.get_cog("Eventos")
            canal = _Canal(555)
            await cog.rodar_guild(_guild(canal), SABADO_19H)
            await cog.rodar_guild(_guild(canal), QUARTA_13H)
            assert canal.enviados == [] and db.humor_bolsa_ativo(G) is None
        finally:
            await bot.close()

    _rodar(verificar())


def test_dia_de_bolsa_abre_uma_vez_com_aviso_e_so_na_janela():
    async def verificar():
        db = novo_db()
        bot = await _preparar(db)
        try:
            cog = bot.get_cog("Eventos")
            guild = _guild(_Canal(555))
            await cog.rodar_guild(guild, datetime(2026, 10, 7, 11, 0, tzinfo=SP))
            assert db.humor_bolsa_ativo(G) is None
            await cog.rodar_guild(guild, QUARTA_13H, rng=_RngFixo(1))
            await cog.rodar_guild(guild, QUARTA_13H + timedelta(hours=1), rng=_RngFixo(0))
            assert db.humor_bolsa_ativo(G) == "bolsa_baixa"
            with db._conn() as con:
                avisos = con.execute("SELECT mensagem, categoria FROM avisos_pendentes").fetchall()
                eventos_db = con.execute("SELECT titulo, tipo, criado_por FROM jardim_eventos").fetchall()
            assert len(avisos) == 1 and avisos[0]["categoria"] == "noticia" and "50%" in avisos[0]["mensagem"]
            assert [(e["tipo"], e["criado_por"]) for e in eventos_db] == [("mercado", "dia-de-bolsa")]
            assert eventos_db[0]["titulo"] == "Dia de Bolsa: Bolsa em baixa"
        finally:
            await bot.close()

    _rodar(verificar())


def test_vencedor_do_leilao_da_casa_recebe_o_item_uma_vez_e_ninguem_e_creditado():
    async def verificar():
        db = novo_db()
        db.creditar(G, U, "Lunaris", 500)
        bot = await _preparar(db)
        try:
            mercado = bot.get_cog("Mercado")
            leilao = _leilao_casa(db)
            db.dar_lance_leilao_com_custodia(leilao["id"], G, U, 150)
            with db._conn() as con:
                con.execute("UPDATE leiloes SET expira_em = CURRENT_TIMESTAMP - interval '1 minute'")
            await mercado._resolver_leilao(db.get_leilao(leilao["id"]))
            assert bot.inventario.entregas == [(U, "espada", f"leilao-casa:{G}:{leilao['id']}")]
            assert db.get_leilao(leilao["id"])["status"] == "encerrado"
            with db._conn() as con:
                aviso = con.execute("SELECT mensagem FROM avisos_pendentes").fetchone()["mensagem"]
            assert f"<@{U}> levou **Espada**" in aviso
        finally:
            await bot.close()

    _rodar(verificar())


def test_leilao_da_casa_sem_lance_encerra_sem_entregar_nem_quebrar():
    async def verificar():
        db = novo_db()
        bot = await _preparar(db)
        try:
            mercado = bot.get_cog("Mercado")
            leilao = _leilao_casa(db)
            await mercado._resolver_leilao(db.get_leilao(leilao["id"]))
            assert bot.inventario.entregas == []
            assert db.get_leilao(leilao["id"])["status"] == "sem_lances"
        finally:
            await bot.close()

    _rodar(verificar())


def test_botao_de_lance_e_persistente_pelo_id_do_leilao():
    import re

    assert re.fullmatch(LEILAO_LANCE_TEMPLATE, "leilao_lance:42").group("id") == "42"
    assert re.fullmatch(LEILAO_LANCE_TEMPLATE, "leilao_lance:abc") is None


def test_inicio_do_banco_mostra_o_leilao_da_casa_no_ar():
    from cogs.painel import coletar_resumo, montar_embed_inicio

    db = novo_db()
    dados = coletar_resumo(db, G, U)
    assert dados["leilao_casa"] is None
    _leilao_casa(db)
    dados = coletar_resumo(db, G, U)
    campos = {c.name: c.value for c in montar_embed_inicio("Lina", dados).fields}
    assert "Leilão do Jardim" in campos["🌿 Acontecendo agora"] and "sem lances" in campos["🌿 Acontecendo agora"]
    db.creditar(G, U, "Lunaris", 500)
    db.dar_lance_leilao_com_custodia(db.listar_leiloes_ativos(G)[0]["id"], G, U, 90)
    campos = {c.name: c.value for c in montar_embed_inicio("Lina", coletar_resumo(db, G, U)).fields}
    assert "lance em ☾ 90" in campos["🌿 Acontecendo agora"]


# ── revisão geral: conservação de dinheiro e entrega à prova de falha ───────
def _total_lunaris(db):
    with db._conn() as con:
        carteira = con.execute("SELECT COALESCE(SUM(saldo), 0)::bigint AS t FROM carteira WHERE moeda='Lunaris'").fetchone()["t"]
        custodia = con.execute("SELECT COALESCE(SUM(valor), 0)::bigint AS t FROM custodia_moeda WHERE moeda='Lunaris'").fetchone()["t"]
    return int(carteira) + int(custodia)


def test_leilao_da_casa_com_disputa_conserva_o_dinheiro_e_so_o_lance_vencedor_some():
    db = novo_db()
    for uid in ("1", "2", "3"):
        db.creditar(G, uid, "Lunaris", 1000)
    inicio = _total_lunaris(db)
    lid = _leilao_casa(db)["id"]
    assert db.dar_lance_leilao_com_custodia(lid, G, "1", 100) is not None
    assert _total_lunaris(db) == inicio  # em custódia, nada saiu
    assert db.dar_lance_leilao_com_custodia(lid, G, "2", 150) is not None
    assert db.dar_lance_leilao_com_custodia(lid, G, "1", 120) is None  # abaixo do lance atual
    assert db.dar_lance_leilao_com_custodia(lid, G, "3", 200) is not None
    assert db.dar_lance_leilao_com_custodia(lid, G, "1", 250) is not None  # quem foi superado volta
    assert db.liquidar_leilao_com_custodia(lid, 0.05) is not None
    assert _total_lunaris(db) == inicio - 250  # só o lance vencedor saiu da economia
    carteira = {uid: db.get_carteira(G, uid)["Lunaris"] for uid in ("1", "2", "3")}
    assert carteira["2"] == carteira["3"] == 1020  # perderam o leilão e receberam de volta
    assert carteira["1"] == 1020 - 250  # saldo inicial de 20 + 1000, menos o lance vencedor
    assert db.liquidar_leilao_com_custodia(lid, 0.05) is None  # segunda liquidação não cobra de novo


def test_lances_simultaneos_no_leilao_da_casa_deixam_um_unico_vencedor_sem_perder_dinheiro():
    from concurrent.futures import ThreadPoolExecutor

    db = novo_db()
    for uid in map(str, range(1, 9)):
        db.creditar(G, uid, "Lunaris", 1000)
    inicio = _total_lunaris(db)
    lid = _leilao_casa(db)["id"]
    with ThreadPoolExecutor(max_workers=8) as pool:
        list(pool.map(lambda i: db.dar_lance_leilao_com_custodia(lid, G, str(i), 100 + i * 10), range(1, 9)))
    assert _total_lunaris(db) == inicio
    final = db.get_leilao(lid)
    assert final["vencedor_id"] is not None and final["lance_atual"] == 180
    db.liquidar_leilao_com_custodia(lid, 0.05)
    assert _total_lunaris(db) == inicio - 180


def test_falha_inesperada_na_entrega_da_casa_cai_no_inventario_local():
    async def verificar():
        db = novo_db()
        bot = await _preparar(db)
        try:
            async def quebrado(*a, **k):
                raise RuntimeError("cofre central explodiu")

            bot.inventario.dar = quebrado
            mercado = bot.get_cog("Mercado")
            leilao = _leilao_casa(db)
            await mercado._entregar_posse(leilao, U)
            assert any(i["item_id"] == "espada" for i in db.listar_inventario(G, U))
        finally:
            await bot.close()

    _rodar(verificar())


def test_dia_de_bolsa_muda_mesmo_a_chance_de_render_estatisticamente():
    import random as _r

    rng = _r.Random(7)
    rodadas = 4000

    def taxa(chance):
        ganhos = 0
        alvo = _r.random
        _r.random = rng.random
        try:
            for _ in range(rodadas):
                if economia.valor_maturado_investimento(1000, False, chance) > 1000:
                    ganhos += 1
        finally:
            _r.random = alvo
        return ganhos / rodadas

    alta, base, baixa = taxa(0.90), taxa(None), taxa(0.50)
    assert 0.87 < alta < 0.93 and 0.67 < base < 0.73 and 0.47 < baixa < 0.53
