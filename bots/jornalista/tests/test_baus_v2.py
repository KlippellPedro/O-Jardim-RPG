"""Baús v2: vários por dia em faixas, baús coletivos, proteção de azar,
Pistas de Sorte, histórico e mural."""

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

import cogs.baus as baus_mod
from cogs.baus import Baus, chave_coleta, eh_chave_de_coleta, id_da_mensagem
from core import loot
from core.catalogo import Catalogo
from tests.db_utils import novo_db

G = "100"
SP = loot.TZ


def _sp(ano, mes, dia, hora, minuto=0):
    return datetime(ano, mes, dia, hora, minuto, tzinfo=SP) if SP else datetime(ano, mes, dia, hora, minuto)


# ── Faixas do dia ───────────────────────────────────────────────────────────
def test_janela_e_dividida_em_faixas_iguais_e_contiguas():
    faixas = loot.horarios_do_dia(0, 23, 4, _sp(2026, 10, 4, 15))
    assert [(i.hour, f.hour) for i, f in faixas] == [(0, 6), (6, 12), (12, 18), (18, 0)]
    assert faixas[-1][1] == _sp(2026, 10, 5, 0)
    faixas = loot.horarios_do_dia(9, 23, 5, _sp(2026, 10, 4, 15))
    assert faixas[0][0] == _sp(2026, 10, 4, 9)
    assert faixas[-1][1] == _sp(2026, 10, 5, 0)
    assert all(faixas[i][1] == faixas[i + 1][0] for i in range(4))


def test_quantidade_exata_de_baus_por_dia_dentro_das_faixas():
    for por_dia in (1, 4, 5):
        rng = random.Random(por_dia)
        agora = _sp(2026, 1, 1, 12)
        prox = loot.agendar_proximo_bau(9, 23, por_dia, rng=rng, agora=agora)
        drops = []
        while prox < agora + timedelta(days=200):
            drops.append(prox)
            prox = loot.agendar_proximo_bau(9, 23, por_dia, rng=rng, agora=prox, apos_drop=True)
        por_dia_contado = {}
        for d in drops:
            por_dia_contado[d.date()] = por_dia_contado.get(d.date(), 0) + 1
            assert 9 <= d.hour <= 23  # dentro da janela
        dias_completos = list(por_dia_contado.items())[1:-1]  # o primeiro e o último dia são parciais
        assert dias_completos and all(n == por_dia for _, n in dias_completos), por_dia
        assert drops == sorted(drops) and len(set(drops)) == len(drops)


def test_baus_do_mesmo_dia_nao_ficam_colados():
    rng = random.Random(3)
    agora = _sp(2026, 1, 1, 0, 30)
    prox = loot.agendar_proximo_bau(9, 23, 4, rng=rng, agora=agora)
    anterior = None
    menor_intervalo = None
    for _ in range(400):
        if anterior is not None and prox.date() == anterior.date():
            intervalo = prox - anterior
            menor_intervalo = intervalo if menor_intervalo is None else min(menor_intervalo, intervalo)
        anterior = prox
        prox = loot.agendar_proximo_bau(9, 23, 4, rng=rng, agora=prox, apos_drop=True)
    # Faixas de 3h45: dois baús vizinhos nunca saem em sequência imediata.
    assert menor_intervalo is None or menor_intervalo > timedelta(minutes=2)


def test_ligar_no_meio_da_faixa_usa_o_resto_dela():
    agora = _sp(2026, 10, 4, 10, 0)  # faixa 9h-12h45 (4 por dia, 9h-23h)
    for semente in range(100):
        prox = loot.agendar_proximo_bau(9, 23, 4, rng=random.Random(semente), agora=agora)
        assert prox > agora
        assert prox.date() == agora.date() and prox.hour < 13


def test_depois_do_ultimo_bau_do_dia_o_proximo_e_amanha_cedo():
    agora = _sp(2026, 10, 4, 22, 30)
    prox = loot.agendar_proximo_bau(9, 23, 4, rng=random.Random(1), agora=agora, apos_drop=True)
    assert prox.date() == (agora + timedelta(days=1)).date() and prox.hour < 13


# ── Raridade, coletivos e sorte ─────────────────────────────────────────────
def test_so_comum_e_incomum_sao_coletivos():
    assert loot.eh_coletivo("comum") and loot.eh_coletivo("incomum")
    assert not any(loot.eh_coletivo(r) for r in ("raro", "epico", "lendario", "mitico"))


def test_protecao_de_azar_sobe_para_raro_so_depois_da_sequencia():
    limite = loot.PROTECAO_BAUS_SEM_BOM
    assert loot.aplicar_protecao_de_azar("comum", limite - 1) == "comum"
    assert loot.aplicar_protecao_de_azar("comum", limite) == "raro"
    assert loot.aplicar_protecao_de_azar("incomum", limite + 5) == "raro"
    assert loot.aplicar_protecao_de_azar("epico", limite + 5) == "epico"  # nunca rebaixa


def test_premio_coletivo_respeita_a_faixa_e_as_pistas_aumentam():
    params = {"lunaris_min": 10, "lunaris_max": 10, "chance_item": 0, "pesos_itens": None, "tipos": None}
    base = loot.sortear_premio_coletivo(Catalogo(), params, rng=random.Random(1))
    assert base["lunaris"] == 10 and base["itens"] == [] and "sorte" not in base
    com_pistas = loot.sortear_premio_coletivo(Catalogo(), params, rng=random.Random(1), pistas=2)
    assert com_pistas["lunaris"] == 14  # +20% por Pista
    assert loot.sortear_premio_coletivo(Catalogo(), params, rng=random.Random(1), pistas=99)["lunaris"] == 20  # teto de 5


def test_pistas_em_premio_de_corrida_somam_lunaris_e_marcam_a_sorte():
    premio = {"lunaris": 50, "itens": [], "creditos_sombrios": 0}
    novo = loot.aplicar_pistas_ao_premio(premio, 3, Catalogo(), rng=random.Random(2))
    assert novo["lunaris"] == 80 and novo["sorte"]["pistas"] == 3
    assert loot.aplicar_pistas_ao_premio(premio, 0, Catalogo()) is premio


# ── Banco ───────────────────────────────────────────────────────────────────
def _historico(db, n, raridade, coletivo=False, msg_base=1000):
    for i in range(n):
        db.registrar_bau_historico(
            G, "777", str(msg_base + i), f"tok{msg_base + i}", raridade, "Baú", coletivo,
            datetime.now(timezone.utc) + timedelta(hours=1),
        )


def test_contagem_de_baus_sem_bom_para_na_primeira_raridade_boa():
    db = novo_db()
    _historico(db, 2, "raro", msg_base=1)
    _historico(db, 3, "comum", msg_base=10)
    _historico(db, 2, "incomum", msg_base=20)
    assert db.contar_baus_sem_bom(G) == 5
    _historico(db, 1, "lendario", msg_base=30)
    assert db.contar_baus_sem_bom(G) == 0


def test_historico_conta_abertos_expirados_e_pessoas():
    db = novo_db()
    futuro = datetime.now(timezone.utc) + timedelta(hours=1)
    for i, raridade in enumerate(["comum", "raro", "raro", "incomum"]):
        db.registrar_bau_historico(G, "777", str(i), f"t{i}", raridade, "Baú", raridade in ("comum", "incomum"), futuro)
    db.marcar_bau_historico_aberto(G, "1", "42")
    db.marcar_bau_historico_expirado(G, "2")
    assert db.registrar_coleta_historico(G, "0") == 1
    assert db.registrar_coleta_historico(G, "0") == 2
    db.marcar_bau_historico_expirado(G, "0")  # já aberto: não vira expirado
    stats = db.estatisticas_baus(G)
    assert (stats["lancados"], stats["abertos"], stats["expirados"]) == (4, 2, 1)
    assert len(db.listar_baus_do_dia(G)) == 4


def test_pistas_de_consolo_cada_baú_concede_uma_vez_e_ha_teto():
    db = novo_db()
    for uid in ("1", "2", "3"):
        db.registrar_tentativa_bau(G, "m1", uid)
    db.registrar_tentativa_bau(G, "m1", "2")  # tentar de novo não conta em dobro
    assert sorted(db.conceder_pistas_aos_que_tentaram(G, "m1", excluir_user_id="1")) == ["2", "3"]
    assert db.get_pistas(G, "1") == 0 and db.get_pistas(G, "2") == 1
    assert db.conceder_pistas_aos_que_tentaram(G, "m1") == []  # já concedido
    for i in range(10):
        db.registrar_tentativa_bau(G, f"m{i + 2}", "2")
        db.conceder_pistas_aos_que_tentaram(G, f"m{i + 2}")
    assert db.get_pistas(G, "2") == loot.PISTAS_MAX
    db.consumir_pistas(G, "2", 3)
    assert db.get_pistas(G, "2") == loot.PISTAS_MAX - 3
    db.consumir_pistas(G, "2", 99)
    assert db.get_pistas(G, "2") == 0


def test_config_de_baus_por_dia_tem_padrao_4_e_limites():
    db = novo_db()
    assert db.get_baus_config(G)["baus_por_dia"] == 4
    assert db.set_baus_por_dia(G, 5) == 5 and db.get_baus_config(G)["baus_por_dia"] == 5
    assert db.set_baus_por_dia(G, 99) == loot.BAUS_POR_DIA_MAX
    assert db.set_baus_por_dia(G, 0) == 1


def test_mural_guarda_a_mensagem_do_dia():
    db = novo_db()
    assert db.get_bau_mural(G) is None
    db.set_bau_mural(G, "55", "66")
    mural = db.get_bau_mural(G)
    assert mural["de_hoje"] is True and mural["mensagem_id"] == "66"


# ── Cog: fluxos completos com banco real ────────────────────────────────────
class _Resposta:
    def __init__(self):
        self.deferido = False

    async def defer(self, **kwargs):
        self.deferido = True


class _Followup:
    def __init__(self):
        self.enviados = []

    async def send(self, texto=None, **kwargs):
        self.enviados.append((texto, kwargs))


def _interacao(uid, mensagem_id=None):
    return SimpleNamespace(
        response=_Resposta(), followup=_Followup(), guild_id=int(G), message=None,
        user=SimpleNamespace(id=uid, mention=f"<@{uid}>"),
    )


def _cog(db):
    cog = object.__new__(Baus)
    cog.bot = SimpleNamespace(db=db, catalogo=Catalogo(), platform=None, get_guild=lambda gid: None)
    return cog


def _carteira(db, uid):
    with db._conn() as con:
        rows = con.execute(
            "SELECT moeda, saldo FROM carteira WHERE guild_id=%s AND user_id=%s", (G, str(uid))
        ).fetchall()
    return {r["moeda"]: r["saldo"] for r in rows}


def _bau_coletivo(db, token="a" * 32, msg="900", lunaris=10):
    expira = datetime.now(timezone.utc) + timedelta(hours=3)
    premio = {
        "lunaris": 0, "itens": [], "creditos_sombrios": 0,
        "bau": {"raridade": "comum", "nome": "Baú Comum", "dificuldade_enigma": None,
                "expira_minutos": 180, "coletivo": True},
        "coletivo": {"lunaris_min": lunaris, "lunaris_max": lunaris, "chance_item": 0,
                     "pesos_itens": {"comum": 1}, "tipos": None},
    }
    db.criar_bau_no_ar(token, G, "777", msg, premio, expira)
    db.registrar_bau_historico(G, "777", msg, token, "comum", "Baú Comum", True, expira)
    return db.get_bau_no_ar(token)


def test_baus_coletivos_cada_um_pega_o_seu_uma_vez(monkeypatch):
    monkeypatch.setattr(random, "random", lambda: 0.99)  # sem Chave nem fragmento de brinde: o recibo é a última mensagem
    db = novo_db()
    row = _bau_coletivo(db)
    cog = _cog(db)
    inicial = _carteira(db, 1).get("Lunaris", 20)

    for uid in (1, 2):
        interacao = _interacao(uid)
        asyncio.run(cog.abrir_bau_click(interacao, row["token"]))
        assert interacao.response.deferido
        embed = interacao.followup.enviados[-1][1]["embed"]
        assert "pegou o seu" in embed.description and "10 Lunaris" in embed.description

    repetido = _interacao(1)
    asyncio.run(cog.abrir_bau_click(repetido, row["token"]))
    assert "já pegou" in repetido.followup.enviados[-1][0]

    assert _carteira(db, 1)["Lunaris"] == inicial + 10  # só uma vez
    assert _carteira(db, 2)["Lunaris"] == 20 + 10
    assert db.get_bau_no_ar(row["token"]) is not None  # o baú continua no ar para os outros
    assert db.get_bau_historico(G, "900")["coletas"] == 2
    with db._conn() as con:
        chaves = {r["mensagem_id"] for r in con.execute("SELECT mensagem_id FROM baus_entregas").fetchall()}
    assert chaves == {chave_coleta("900", 1), chave_coleta("900", 2)}


def test_chave_de_coleta_nao_confunde_com_id_de_mensagem():
    chave = chave_coleta("123", "456")
    assert eh_chave_de_coleta(chave) and not eh_chave_de_coleta("123")
    assert id_da_mensagem(chave) == "123" and id_da_mensagem("123") == "123"


def test_corrida_dos_baus_raros_da_pista_aos_que_tentaram_e_a_pista_vira_bonus(monkeypatch):
    monkeypatch.setattr(random, "random", lambda: 0.99)  # sem Chave nem fragmento de brinde: o recibo é a última mensagem
    db = novo_db()
    expira = datetime.now(timezone.utc) + timedelta(hours=1)
    premio = {
        "lunaris": 50, "itens": [], "creditos_sombrios": 0,
        "bau": {"raridade": "raro", "nome": "Baú Raro", "dificuldade_enigma": "facil", "expira_minutos": 90},
    }
    db.criar_bau_no_ar("b" * 32, G, "777", "901", premio, expira)
    db.registrar_bau_historico(G, "777", "901", "b" * 32, "raro", "Baú Raro", False, expira)
    for uid in ("10", "20", "30"):
        db.registrar_tentativa_bau(G, "901", uid)
    cog = _cog(db)

    vencedor = _interacao(10)
    asyncio.run(cog.abrir_bau_click(vencedor, "b" * 32))
    assert _carteira(db, 10)["Lunaris"] == 20 + 50
    assert db.get_bau_historico(G, "901")["status"] == "aberto"
    assert db.get_pistas(G, "10") == 0  # o vencedor não ganha consolo
    assert db.get_pistas(G, "20") == 1 and db.get_pistas(G, "30") == 1

    # Quem ganhou a Pista a gasta no próximo baú que pegar.
    row = _bau_coletivo(db, token="c" * 32, msg="902", lunaris=10)
    interacao = _interacao(20)
    asyncio.run(cog.abrir_bau_click(interacao, row["token"]))
    embed = interacao.followup.enviados[-1][1]["embed"]
    assert "Pista de Sorte" in embed.description and "+20%" in embed.description
    assert _carteira(db, 20)["Lunaris"] == 20 + 12  # 10 + 20%
    assert db.get_pistas(G, "20") == 0


class _CanalTexto(discord.TextChannel):
    """Canal falso que passa no isinstance(..., TextChannel)."""

    def __init__(self, canal_id=777):
        self.id = canal_id
        self.enviados = []
        self.mensagens = {}

    async def send(self, **kwargs):
        mensagem = SimpleNamespace(id=5000 + len(self.enviados), edits=[])

        async def editar(**k):
            mensagem.edits.append(k)

        mensagem.edit = editar
        self.enviados.append(kwargs)
        self.mensagens[mensagem.id] = mensagem
        return mensagem

    async def fetch_message(self, mensagem_id):
        if mensagem_id not in self.mensagens:
            raise discord.NotFound(SimpleNamespace(status=404, reason="x"), "sumiu")
        return self.mensagens[mensagem_id]


def _cog_com_canal(db, canal):
    cog = object.__new__(Baus)
    guild = SimpleNamespace(get_channel=lambda cid: canal if int(cid) == canal.id else None)
    cog.bot = SimpleNamespace(db=db, catalogo=Catalogo(), platform=None, get_guild=lambda gid: guild)
    return cog


def test_baus_coletivos_expirados_mostram_quantos_pegaram():
    db = novo_db()
    canal = _CanalTexto()
    cog = _cog_com_canal(db, canal)
    row = _bau_coletivo(db)
    mensagem = SimpleNamespace(id=900, edits=[])

    async def editar(**k):
        mensagem.edits.append(k)

    mensagem.edit = editar
    canal.mensagens[900] = mensagem
    db.registrar_coleta_historico(G, "900")
    db.registrar_coleta_historico(G, "900")

    asyncio.run(cog._expirar_bau_no_ar(row))
    assert db.get_bau_no_ar(row["token"]) is None
    assert db.get_bau_historico(G, "900")["status"] == "aberto"  # alguém pegou: não é "expirado"
    assert "2" in mensagem.edits[-1]["embed"].description and "pegaram" in mensagem.edits[-1]["embed"].description
    assert mensagem.edits[-1]["view"].children[0].label == "Baú encerrado"


def test_bau_de_corrida_expirado_da_pista_a_quem_tentou():
    db = novo_db()
    canal = _CanalTexto()
    cog = _cog_com_canal(db, canal)
    expira = datetime.now(timezone.utc) - timedelta(minutes=1)
    premio = {"lunaris": 5, "itens": [], "creditos_sombrios": 0,
              "bau": {"raridade": "raro", "nome": "Baú Raro", "dificuldade_enigma": "facil", "expira_minutos": 90}}
    db.criar_bau_no_ar("d" * 32, G, "777", "903", premio, expira)
    db.registrar_bau_historico(G, "777", "903", "d" * 32, "raro", "Baú Raro", False, expira)
    db.registrar_tentativa_bau(G, "903", "7")
    mensagem = SimpleNamespace(id=903, edits=[])

    async def editar(**k):
        mensagem.edits.append(k)

    mensagem.edit = editar
    canal.mensagens[903] = mensagem

    asyncio.run(cog._expirar_bau_no_ar(db.get_bau_no_ar("d" * 32)))
    assert db.get_bau_historico(G, "903")["status"] == "expirado"
    assert db.get_pistas(G, "7") == 1
    assert "Pista de Sorte" in mensagem.edits[-1]["embed"].description


def test_dropar_baus_coletivos_e_protecao_de_azar(monkeypatch):
    monkeypatch.setattr(baus_mod.loot_mod, "sortear_raridade_bau", lambda *a, **k: "comum")
    db = novo_db()
    canal = _CanalTexto()
    cog = _cog_com_canal(db, canal)
    cog._sortear_canal_valido = lambda guild_id, canal_forcado=None: canal

    asyncio.run(cog._dropar({"guild_id": G, "itens_por_bau": 1}))
    token, = [r["token"] for r in _todos_no_ar(db)]
    estado = db.get_bau_no_ar(token)
    assert estado["premio"]["bau"]["coletivo"] is True
    assert estado["premio"]["coletivo"]["lunaris_max"] >= estado["premio"]["coletivo"]["lunaris_min"]
    view = canal.enviados[0]["view"]
    assert view.children[0].item.label == "Pegar o meu 🎁"
    campos = {c.name: c.value for c in canal.enviados[0]["embed"].fields}
    assert campos["👥 Já pegaram"] == "0"
    assert db.get_bau_historico(G, "5000")["coletivo"] is True  # mensagens falsas começam em 5000
    assert db.contar_baus_sem_bom(G) == 1

    # Depois de uma sequência de baús fracos, o próximo sai Raro, trancado e de corrida.
    _historico(db, loot.PROTECAO_BAUS_SEM_BOM, "comum", msg_base=100)
    asyncio.run(cog._dropar({"guild_id": G, "itens_por_bau": 1}))
    ultimo = canal.enviados[-1]
    assert ultimo["view"].children[0].custom_id.startswith("bau_enigma:")
    assert db.contar_baus_sem_bom(G) == 0


def _todos_no_ar(db):
    with db._conn() as con:
        return [dict(r) for r in con.execute("SELECT token FROM baus_no_ar").fetchall()]


def test_mural_publica_uma_vez_e_depois_edita_a_mesma_mensagem(monkeypatch):
    monkeypatch.setattr(baus_mod, "_canal_aceita_bau", lambda canal: True)
    db = novo_db()
    canal = _CanalTexto(canal_id=777)
    cog = _cog_com_canal(db, canal)
    db.set_bau_mural_canal(G, "777")
    _bau_coletivo(db)

    asyncio.run(cog.atualizar_mural(G))
    assert len(canal.enviados) == 1
    primeira = db.get_bau_mural(G)["mensagem_id"]
    assert "Baú Comum" in canal.enviados[0]["embed"].description

    asyncio.run(cog.atualizar_mural(G))
    assert len(canal.enviados) == 1  # editou, não publicou outra
    mensagem = canal.mensagens[int(primeira)]
    assert mensagem.edits and "Baú Comum" in mensagem.edits[-1]["embed"].description

    # Mensagem apagada: publica uma nova e guarda o novo id.
    del canal.mensagens[int(primeira)]
    asyncio.run(cog.atualizar_mural(G))
    assert len(canal.enviados) == 2 and db.get_bau_mural(G)["mensagem_id"] != primeira


def test_mural_desligado_nao_faz_nada():
    db = novo_db()
    canal = _CanalTexto()
    cog = _cog_com_canal(db, canal)
    asyncio.run(cog.atualizar_mural(G))
    assert canal.enviados == []


def test_embed_do_mural_descreve_cada_estado():
    agora = datetime.now(timezone.utc)
    base = {"guild_id": G, "canal_id": "7", "mensagem_id": "9", "criado_em": agora, "expira_em": agora + timedelta(hours=1),
            "raridade": "comum", "nome": "Baú Comum", "vencedor_user_id": None, "coletas": 0, "coletivo": False}
    baus = [
        {**base, "status": "no_ar"},
        {**base, "status": "aberto", "coletivo": True, "coletas": 3},
        {**base, "status": "aberto", "vencedor_user_id": "42", "raridade": "raro", "nome": "Baú Raro"},
        {**base, "status": "expirado"},
    ]
    texto = Baus.embed_mural(baus, pistas=2).description
    assert "no ar até" in texto and "3 pegaram" in texto and "<@42>" in texto and "desapareceu" in texto
    assert Baus.embed_mural([]).description == "Nenhum baú apareceu ainda hoje."
    assert Baus.embed_mural(baus, pistas=2).fields[0].name == "🍀 Suas Pistas de Sorte"


def test_bau_config_baus_por_dia_reagenda_dentro_das_novas_faixas(monkeypatch):
    db = novo_db()
    cog = _cog(db)
    db.adicionar_bau_canal(G, "777")
    respostas = []

    class _Resp:
        async def send_message(self, texto, **kwargs):
            respostas.append(texto)

    interacao = SimpleNamespace(guild_id=int(G), response=_Resp())
    asyncio.run(Baus.bau_config.callback(cog, interacao, ativo=True, min_hora=9, max_hora=23, baus_por_dia=5))
    cfg = db.get_baus_config(G)
    assert cfg["baus_por_dia"] == 5 and cfg["ativo"] is True
    assert datetime.fromisoformat(cfg["proximo_drop"]) > (datetime.now(SP) if SP else datetime.now())
    assert "5 baú(s) por dia" in respostas[0]


def test_baus_hoje_mostra_o_dia_e_as_pistas():
    db = novo_db()
    _bau_coletivo(db)
    db.registrar_tentativa_bau(G, "x", "5")
    db.conceder_pistas_aos_que_tentaram(G, "x")
    cog = _cog(db)
    enviados = []

    class _Resp:
        async def send_message(self, *args, **kwargs):
            enviados.append(kwargs)

    interacao = SimpleNamespace(guild_id=int(G), response=_Resp(), user=SimpleNamespace(id=5))
    asyncio.run(Baus.baus_hoje.callback(cog, interacao))
    embed = enviados[0]["embed"]
    assert "Baú Comum" in embed.description and embed.fields[0].value.startswith("**1**")
    assert enviados[0]["ephemeral"] is True
