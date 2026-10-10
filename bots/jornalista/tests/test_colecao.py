"""Coleção das Dez Árvores: fragmentos nos baús, páginas de lore e Afinidade."""

from __future__ import annotations

import asyncio
import importlib.util
import json
import random
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from types import SimpleNamespace

import discord

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE))

from cogs.baus import Baus
from cogs.painel import ViewColecao
from core import arvores as arvores_mod
from core import colecao
from core import publicacoes
from core.catalogo import Catalogo
from core.conquistas import POR_CHAVE
from tests.db_utils import novo_db
from tests.test_painel import _Inter as _InterPainel, _bot_carregado, _painel

G = "100"


def _rodar(coro):
    return asyncio.run(coro)


# ── dados ───────────────────────────────────────────────────────────────────
def test_paginas_cobrem_as_dez_arvores_com_tres_camadas_cada():
    assert set(colecao.PAGINAS) == {a.id for a in arvores_mod.ARVORES} and colecao.TOTAL_PAGINAS == 10
    for pg in colecao.PAGINAS.values():
        assert len(pg["camadas"]) == colecao.FRAGMENTOS_POR_PAGINA
        assert pg["epiteto"] and all(c["titulo"] and c["texto"] for c in pg["camadas"])
        assert all(len(c["texto"]) <= 1024 for c in pg["camadas"])  # cabe num campo de embed


def test_o_arquivo_de_dados_esta_em_dia_com_as_cronicas():
    """Os textos são das Crônicas (canônico): o JSON do bot tem de ser o gerado por elas."""
    gerador = BASE.parent.parent / "tools" / "gerar-colecao-arvores.py"
    if not gerador.is_file():
        return
    spec = importlib.util.spec_from_file_location("gerar_colecao", gerador)
    modulo = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(modulo)
    atual = json.loads((BASE / "data" / "colecao_arvores.json").read_text(encoding="utf-8"))
    assert modulo.gerar() == atual, "rode: python tools/gerar-colecao-arvores.py"


# ── sorteio da Árvore ───────────────────────────────────────────────────────
def test_sorteio_so_considera_paginas_incompletas_e_acaba_com_o_album():
    progresso = {i: 3 for i in colecao.IDS}
    assert colecao.sortear_arvore(progresso) is None
    progresso["moros"] = 1
    assert {colecao.sortear_arvore(progresso, rng=random.Random(s)) for s in range(30)} == {"moros"}


def test_a_propria_arvore_e_a_do_horoscopo_saem_com_mais_frequencia():
    rng = random.Random(5)
    contagem = {"aethel": 0, "ousias": 0, "keryx": 0}
    for _ in range(6000):
        contagem[colecao.sortear_arvore({i: 3 for i in colecao.IDS if i not in contagem}, minhas=["aethel"], horoscopo="ousias", rng=rng)] += 1
    # pesos 2 : 2 : 1 entre as três candidatas
    assert contagem["keryx"] < contagem["aethel"] * 0.65 and contagem["keryx"] < contagem["ousias"] * 0.65
    assert abs(contagem["aethel"] - contagem["ousias"]) < 400
    empilhado = {"aethel": 0, "ousias": 0}
    for _ in range(6000):
        empilhado[colecao.sortear_arvore({i: 3 for i in colecao.IDS if i not in empilhado}, minhas=["aethel"], horoscopo="aethel", rng=rng)] += 1
    assert empilhado["aethel"] > empilhado["ousias"] * 3  # minha Árvore + horóscopo: peso 4 contra 1


def test_afinidade_soma_dez_por_cento_sempre_arredondando_para_cima():
    assert colecao.aplicar_afinidade({"lunaris": 10}, "aethel")["lunaris"] == 11
    assert colecao.aplicar_afinidade({"lunaris": 5}, "aethel")["lunaris"] == 6
    assert colecao.aplicar_afinidade({"lunaris": 100}, "aethel")["lunaris"] == 110
    sombrio = colecao.aplicar_afinidade({"lunaris": 0, "creditos_sombrios": 30}, "aethel")
    assert sombrio["lunaris"] == 0 and sombrio["creditos_sombrios"] == 30
    assert colecao.aplicar_afinidade({"lunaris": 10}, "aethel")["afinidade"] == {"arvore": "aethel", "nome": "Gênese", "bonus": 10}


# ── telas ───────────────────────────────────────────────────────────────────
def test_cada_fragmento_revela_uma_camada_e_o_terceiro_fecha_a_pagina():
    pg = colecao.PAGINAS["aethel"]
    for q in (1, 2, 3):
        emb = colecao.embed_fragmento("aethel", q, paginas_total=q)
        assert pg["camadas"][q - 1]["texto"] in emb.description and pg["epiteto"] in emb.description
        assert f"{q}/3" in emb.title and "Gênese" in emb.title
    fechada = colecao.embed_fragmento("aethel", 3, paginas_total=4)
    assert fechada.fields[0].name == "📖 Página completa!" and "+10%" in fechada.fields[0].value and "4/10" in fechada.fields[0].value
    assert colecao.embed_fragmento("aethel", 1, 0).footer.text.startswith("Faltam 2")


def test_pagina_cobre_com_tinta_o_que_ainda_nao_foi_revelado():
    emb = colecao.embed_pagina("ousias", 1)
    assert emb.fields[0].value == colecao.PAGINAS["ousias"]["camadas"][0]["texto"]
    assert "tinta" in emb.fields[1].value and "tinta" in emb.fields[2].value
    assert not any("Afinidade" in f.name for f in emb.fields)
    assert any("Afinidade" in f.name for f in colecao.embed_pagina("ousias", 3).fields)


def test_album_mostra_progresso_e_afinidade_ativa_so_com_o_cargo():
    progresso = {"aethel": 3, "ousias": 1}
    sem_cargo = {f.name: f.value for f in colecao.embed_album(progresso, [], {"aethel": "55"}).fields}
    com_cargo = {f.name: f.value for f in colecao.embed_album(progresso, ["55"], {"aethel": "55"}).fields}
    assert "Afinidade ativa" not in sem_cargo["Gênese"] and "Afinidade ativa" in com_cargo["Gênese"]
    assert "1/3" in com_cargo["Alétheia"] and "0/3" in com_cargo["A.X.I.S"]
    assert "1/10" in colecao.embed_album(progresso).title
    completo = colecao.embed_album({i: 3 for i in colecao.IDS})
    assert "Crônicas do Jardim" in [f.name for f in completo.fields][-1]


# ── banco ───────────────────────────────────────────────────────────────────
def test_fragmentos_somam_ate_completar_a_pagina_e_contam_as_paginas():
    db = novo_db()
    r1 = db.conceder_fragmento(G, "1", "aethel")
    assert r1 == {"quantidade": 1, "completa": False, "paginas_total": 0}
    db.conceder_fragmento(G, "1", "aethel")
    r3 = db.conceder_fragmento(G, "1", "aethel")
    assert r3 == {"quantidade": 3, "completa": True, "paginas_total": 1}
    assert db.conceder_fragmento(G, "1", "aethel")["quantidade"] == 3  # nunca passa de 3
    db.conceder_fragmento(G, "1", "ousias")
    assert db.get_colecao(G, "1") == {"aethel": 3, "ousias": 1}
    assert db.get_colecao(G, "2") == {}


def test_dez_paginas_completas_destravam_o_titulo_cronista():
    db = novo_db()
    for arvore in colecao.IDS[:9]:
        for _ in range(3):
            db.conceder_fragmento(G, "1", arvore)
    assert "cronista" not in {r["chave"] for r in db.avaliar_conquistas_secretas(G, "1")}
    for _ in range(2):
        db.conceder_fragmento(G, "1", colecao.IDS[9])
    assert "cronista" not in {r["chave"] for r in db.avaliar_conquistas_secretas(G, "1")}  # 2 de 3 ainda não fecha
    db.conceder_fragmento(G, "1", colecao.IDS[9])
    assert "cronista" in {r["chave"] for r in db.avaliar_conquistas_secretas(G, "1")}
    assert POR_CHAVE["cronista"].nome == "Cronista das Dez Árvores"


# ── fluxos nos baús (banco real) ────────────────────────────────────────────
class _Resp:
    async def defer(self, **kw):
        pass


class _Inter:
    def __init__(self, user):
        self.enviados = []
        self.response = _Resp()
        self.followup = SimpleNamespace(send=self._enviar)
        self.guild_id = int(G)
        self.message = None
        self.user = user

    async def _enviar(self, texto=None, **kw):
        self.enviados.append((texto, kw))

    def embeds(self):
        return [kw["embed"] for _t, kw in self.enviados if kw.get("embed") is not None]

    def textos(self):
        saida = []
        for texto, kw in self.enviados:
            saida.append(texto or "")
            if kw.get("embed") is not None:
                saida.append((kw["embed"].title or "") + "\n" + (kw["embed"].description or ""))
        return "\n".join(saida)


def _usuario(uid=1):
    return SimpleNamespace(id=uid, mention=f"<@{uid}>")


class _Membro(discord.Member):
    """Member sem o construtor do discord.py: o fluxo só usa id, mention e roles."""

    def __init__(self, uid, cargos):
        self._uid = uid
        self._cargos = [SimpleNamespace(id=c) for c in cargos]

    id = property(lambda self: self._uid)
    mention = property(lambda self: f"<@{self._uid}>")
    roles = property(lambda self: self._cargos)


def _cog(db):
    cog = object.__new__(Baus)
    cog.bot = SimpleNamespace(db=db, catalogo=Catalogo(), platform=None, get_guild=lambda gid: None)
    return cog


def _carteira(db, uid):
    with db._conn() as con:
        rows = con.execute("SELECT moeda, saldo FROM carteira WHERE guild_id=%s AND user_id=%s", (G, str(uid))).fetchall()
    return {r["moeda"]: r["saldo"] for r in rows}


def _bau_coletivo(db, raridade="comum", token="c" * 32, msg="810", lunaris=10):
    expira = datetime.now(timezone.utc) + timedelta(hours=1)
    premio = {"lunaris": 0, "itens": [], "creditos_sombrios": 0,
              "bau": {"raridade": raridade, "nome": f"Baú {raridade}", "dificuldade_enigma": None,
                      "expira_minutos": 120, "coletivo": True},
              "coletivo": {"lunaris_min": lunaris, "lunaris_max": lunaris, "chance_item": 0,
                           "pesos_itens": {"comum": 1}, "tipos": None}}
    db.criar_bau_no_ar(token, G, "7", msg, premio, expira)
    db.registrar_bau_historico(G, "7", msg, token, raridade, f"Baú {raridade}", True, expira)
    return db.get_bau_no_ar(token)


def _bau_corrida(db, raridade="raro", token="r" * 32, msg="811", lunaris=40):
    expira = datetime.now(timezone.utc) + timedelta(hours=1)
    premio = {"lunaris": lunaris, "itens": [], "creditos_sombrios": 0,
              "bau": {"raridade": raridade, "nome": f"Baú {raridade}", "dificuldade_enigma": "facil", "expira_minutos": 90}}
    db.criar_bau_no_ar(token, G, "7", msg, premio, expira)
    db.registrar_bau_historico(G, "7", msg, token, raridade, f"Baú {raridade}", False, expira)
    return db.get_bau_no_ar(token)


def test_baus_coletivos_podem_dar_fragmento_e_mostram_a_camada_revelada(monkeypatch):
    monkeypatch.setattr(random, "random", lambda: 0.0)  # sorteia o fragmento (e uma Chave, que não interessa aqui)
    db = novo_db()
    inter = _Inter(_usuario())
    _rodar(_cog(db).abrir_bau_click(inter, _bau_coletivo(db)["token"]))
    progresso = db.get_colecao(G, "1")
    assert sum(progresso.values()) == 1
    arvore_id = next(iter(progresso))
    texto = inter.textos()
    assert f"Fragmento de {colecao.PAGINAS[arvore_id]['nome']}" in texto
    assert colecao.PAGINAS[arvore_id]["camadas"][0]["texto"] in texto


def test_sem_sorte_no_bau_coletivo_nao_ha_fragmento(monkeypatch):
    monkeypatch.setattr(random, "random", lambda: 0.99)
    db = novo_db()
    _rodar(_cog(db).abrir_bau_click(_Inter(_usuario()), _bau_coletivo(db)["token"]))
    assert db.get_colecao(G, "1") == {}


def test_corrida_garante_fragmentos_pela_raridade():
    for raridade, esperado in [("raro", 1), ("epico", 1), ("lendario", 2)]:
        db = novo_db()
        _rodar(_cog(db).abrir_bau_click(_Inter(_usuario()), _bau_corrida(db, raridade)["token"]))
        assert sum(db.get_colecao(G, "1").values()) == esperado, raridade


def test_colecao_desligada_pelo_mestre_nao_da_fragmento_nem_afinidade():
    db = novo_db()
    db.set_automacao(G, "colecao", False)
    db.set_cargo_arvore(G, "aethel", "55")
    for _ in range(3):
        db.conceder_fragmento(G, "1", "aethel")
    inter = _Inter(_Membro(1, ["55"]))
    _rodar(_cog(db).abrir_bau_click(inter, _bau_corrida(db)["token"]))
    assert sum(db.get_colecao(G, "1").values()) == 3  # nada novo
    assert _carteira(db, 1)["Lunaris"] == 20 + 40  # sem +10%
    assert "Afinidade" not in inter.textos()


def test_afinidade_so_com_pagina_completa_e_o_cargo_da_mesma_arvore(monkeypatch):
    monkeypatch.setattr(random, "random", lambda: 0.99)
    db = novo_db()
    db.set_cargo_arvore(G, "aethel", "55")
    db.set_cargo_arvore(G, "ousias", "66")
    for _ in range(3):
        db.conceder_fragmento(G, "1", "aethel")

    # Página de Gênese completa, mas o cargo é o de Alétheia: nada.
    sem = _Inter(_Membro(1, ["66"]))
    _rodar(_cog(db).abrir_bau_click(sem, _bau_coletivo(db, msg="820", token="a" * 32)["token"]))
    assert _carteira(db, 1)["Lunaris"] == 20 + 10 and "Afinidade" not in sem.textos()

    # Com o cargo de Gênese: +10%.
    com = _Inter(_Membro(1, ["55", "66"]))
    _rodar(_cog(db).abrir_bau_click(com, _bau_coletivo(db, msg="821", token="b" * 32)["token"]))
    assert _carteira(db, 1)["Lunaris"] == 20 + 10 + 11
    assert "Afinidade com Gênese" in com.textos() and "+10%" in com.textos()

    # Quem tem o cargo mas não completou a página também não ganha.
    outro = _Inter(_Membro(2, ["55"]))
    _rodar(_cog(db).abrir_bau_click(outro, _bau_coletivo(db, msg="822", token="c" * 32)["token"]))
    assert _carteira(db, 2)["Lunaris"] == 20 + 10


def test_a_decima_pagina_mostra_o_epilogo_e_anuncia_o_cronista(monkeypatch):
    publicados = []

    async def fake(bot, **kwargs):
        publicados.append(kwargs)
        return "entregue"

    monkeypatch.setattr(publicacoes, "publicar_ou_enfileirar", fake)
    db = novo_db()
    db.set_canal_categoria(G, "noticia", "777")
    ultima = colecao.IDS[9]
    for arvore in colecao.IDS[:9]:
        for _ in range(3):
            db.conceder_fragmento(G, "1", arvore)
    for _ in range(2):
        db.conceder_fragmento(G, "1", ultima)
    inter = _Inter(_usuario())
    _rodar(_cog(db).abrir_bau_click(inter, _bau_corrida(db)["token"]))
    assert db.get_colecao(G, "1")[ultima] == 3
    assert colecao.EPILOGO["texto"] in inter.textos()  # a última revelação, só para quem a ganhou
    assert len(publicados) == 1 and publicados[0]["dedupe_key"] == "cronista:1"
    anuncio = publicados[0]["embed"].description
    assert "<@1>" in anuncio and colecao.PAGINAS[ultima]["camadas"][0]["texto"] not in anuncio  # sem spoiler


# ── painel ──────────────────────────────────────────────────────────────────
def test_secao_colecao_do_painel_mostra_o_album_e_abre_paginas():
    async def verificar():
        db = novo_db()
        db.conceder_fragmento(G, "200", "keryx")
        db.conceder_fragmento(G, "200", "keryx")
        bot = await _bot_carregado(db)
        try:
            cog = bot.get_cog("Painel")
            view = _painel(cog)
            inter = _InterPainel(["colecao"])
            await view._ao_escolher(inter)
            editado = [e for e in inter.eventos if isinstance(e, tuple) and e[0] == "edit_original"][-1][1]
            assert "Coleção das Dez Árvores" in editado["embed"].title and "0/10" in editado["embed"].title  # 2 fragmentos ainda não fecham página
            campos = {f.name: f.value for f in editado["embed"].fields}
            assert "2/3" in campos["A.X.I.S"]
            sub = editado["view"]
            assert type(sub).__name__ == ViewColecao.__name__
            assert [o.value for o in sub.seletor.options] == ["keryx"]

            aberta = _InterPainel(["keryx"])
            aberta.response.edit_message = lambda **kw: _registrar(aberta, kw)
            await sub._ler(aberta)
            pagina = [e for e in aberta.eventos if isinstance(e, tuple) and e[0] == "pagina"][0][1]["embed"]
            assert "A.X.I.S" in pagina.title and "2/3" in pagina.title
        finally:
            await bot.close()

    _rodar(verificar())


async def _registrar(inter, kw):
    inter.eventos.append(("pagina", kw))


def test_inicio_do_jardim_resume_a_colecao():
    from cogs.painel import montar_embed_inicio
    from tests.test_painel import _dados

    sem = montar_embed_inicio("Lina", _dados(colecao=None))
    assert "📚 Coleção das Dez Árvores" not in {f.name for f in sem.fields}  # desligada pelo Mestre
    com = montar_embed_inicio("Lina", _dados(colecao={"aethel": 3, "ousias": 2}))
    assert "**1/10** páginas · 5 fragmento(s)" in {f.name: f.value for f in com.fields}["📚 Coleção das Dez Árvores"]
