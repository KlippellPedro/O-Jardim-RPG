"""Cofre do Jardim no Jornalista: abrir, encerrar com reembolso, festival e avisos."""

from __future__ import annotations

import asyncio
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from types import SimpleNamespace

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE))

from cogs import jornal as jornal_mod
from cogs.painel import montar_embed_inicio
from core import loot
from tests.db_utils import novo_db
from tests.test_baus_v2 import _CanalTexto, _cog_com_canal
from tests.test_painel import _Inter as _InterPainel, _bot_carregado, _dados, _painel

G = "100"


def _rodar(coro):
    return asyncio.run(coro)


def _saldo(db, uid):
    with db._conn() as con:
        row = con.execute(
            "SELECT saldo FROM carteira WHERE guild_id=%s AND user_id=%s AND moeda='Lunaris'", (G, uid)
        ).fetchone()
    return int(row["saldo"]) if row else 0


def _doar(db, uid, valor, meta_id=None):
    """Simula o que o Banqueiro grava numa doação (o Jornalista só lê e devolve)."""
    meta_id = meta_id or db.get_meta_ativa(G)["id"]
    with db._conn() as con:
        con.execute("INSERT INTO jardim_doacoes (meta_id, guild_id, user_id, valor) VALUES (%s, %s, %s, %s)", (meta_id, G, uid, valor))
        con.execute("UPDATE jardim_metas SET arrecadado = arrecadado + %s WHERE id=%s", (valor, meta_id))


def _cog(db):
    cog = object.__new__(jornal_mod.Jornal)
    cog.bot = SimpleNamespace(db=db)
    return cog


# ── banco ───────────────────────────────────────────────────────────────────
def test_so_uma_meta_aberta_por_servidor():
    db = novo_db()
    primeira = db.criar_meta(G, "Ponte", "", 100, 7, "", 0, "1")
    assert primeira is not None and db.get_meta_ativa(G)["titulo"] == "Ponte"
    assert db.criar_meta(G, "Outra", "", 100, 7, "", 0, "1") is None
    assert db.criar_meta("outro-servidor", "Ponte", "", 100, 7, "", 0, "1") is not None
    db.encerrar_meta_com_reembolso(G, primeira, "cancelada")
    assert db.criar_meta(G, "Outra", "", 100, 7, "", 0, "1") is not None


def test_encerrar_devolve_cada_doacao_uma_vez_e_registra_no_extrato():
    db = novo_db()
    meta_id = db.criar_meta(G, "Ponte", "", 500, 7, "", 0, "1")
    inicial_a, inicial_b = _saldo(db, "a"), _saldo(db, "b")
    db.garantir_jogador(G, "a")
    db.garantir_jogador(G, "b")
    inicial_a, inicial_b = _saldo(db, "a"), _saldo(db, "b")
    _doar(db, "a", 30)
    _doar(db, "a", 20)
    _doar(db, "b", 40)
    resultado = db.encerrar_meta_com_reembolso(G, meta_id, "cancelada")
    assert resultado["doadores"] == 2 and resultado["total"] == 90
    assert _saldo(db, "a") == inicial_a + 50 and _saldo(db, "b") == inicial_b + 40
    with db._conn() as con:
        extrato = con.execute("SELECT delta, descricao FROM extrato WHERE user_id='a' AND delta>0").fetchone()
        reembolsadas = con.execute("SELECT COUNT(*) AS n FROM jardim_doacoes WHERE reembolsada").fetchone()["n"]
        status = con.execute("SELECT status FROM jardim_metas WHERE id=%s", (meta_id,)).fetchone()["status"]
    assert extrato["delta"] == 50 and "Reembolso do Cofre do Jardim" in extrato["descricao"]
    assert reembolsadas == 3 and status == "cancelada"
    assert db.encerrar_meta_com_reembolso(G, meta_id, "cancelada") is None  # nunca devolve duas vezes
    assert _saldo(db, "a") == inicial_a + 50


def test_meta_ja_batida_nao_pode_ser_cancelada_nem_expirada():
    db = novo_db()
    meta_id = db.criar_meta(G, "Ponte", "", 100, 7, "", 0, "1")
    _doar(db, "a", 100)
    with db._conn() as con:
        con.execute("UPDATE jardim_metas SET status='concluida' WHERE id=%s", (meta_id,))
    assert db.encerrar_meta_com_reembolso(G, meta_id, "expirada") is None
    assert db.encerrar_meta_com_reembolso(G, meta_id, "cancelada") is None


def test_metas_vencidas_so_as_abertas_com_prazo_passado():
    db = novo_db()
    meta_id = db.criar_meta(G, "Ponte", "", 100, 7, "", 0, "1")
    assert db.metas_vencidas() == []
    with db._conn() as con:
        con.execute("UPDATE jardim_metas SET prazo = CURRENT_TIMESTAMP - interval '1 minute'")
    assert [m["id"] for m in db.metas_vencidas()] == [meta_id]
    assert db.get_meta_ativa(G) is None  # vencida já não aceita doação nem aparece nos painéis


def test_festival_ativo_depende_do_efeito_e_do_prazo():
    db = novo_db()
    assert db.festival_ativo(G) is False
    db.criar_evento(G, "Feira", "", "festival", 5, "1")  # evento comum, sem efeito
    assert db.festival_ativo(G) is False
    with db._conn() as con:
        con.execute(
            "INSERT INTO jardim_eventos (guild_id, titulo, tipo, expira_em, efeito) "
            "VALUES (%s, 'F', 'festival', CURRENT_TIMESTAMP + interval '1 hour', 'baus_especiais')", (G,),
        )
    assert db.festival_ativo(G) is True
    with db._conn() as con:
        con.execute("UPDATE jardim_eventos SET expira_em = CURRENT_TIMESTAMP - interval '1 minute' WHERE efeito IS NOT NULL")
    assert db.festival_ativo(G) is False


def test_titulo_mecenas_conta_o_doado_e_ignora_o_devolvido():
    db = novo_db()
    meta_id = db.criar_meta(G, "Ponte", "", 5000, 7, "", 0, "1")
    _doar(db, "1", 299)
    assert "mecenas" not in {r["chave"] for r in db.avaliar_conquistas_secretas(G, "1")}
    _doar(db, "1", 1)
    assert "mecenas" in {r["chave"] for r in db.avaliar_conquistas_secretas(G, "1")}
    db.encerrar_meta_com_reembolso(G, meta_id, "cancelada")
    outro = db.criar_meta(G, "Outra", "", 5000, 7, "", 0, "1")
    _doar(db, "2", 300, outro)
    with db._conn() as con:
        con.execute("UPDATE jardim_doacoes SET reembolsada=TRUE WHERE user_id='2'")
    assert "mecenas" not in {r["chave"] for r in db.avaliar_conquistas_secretas(G, "2")}


# ── comandos do Mestre ──────────────────────────────────────────────────────
class _Resp:
    def __init__(self):
        self.mensagens = []

    async def send_message(self, *a, **kw):
        self.mensagens.append((a, kw))

    async def defer(self, **kw):
        self.mensagens.append((("defer",), kw))


def _inter():
    resp = _Resp()
    seguimentos = []

    async def enviar(*a, **kw):
        seguimentos.append((a, kw))

    return SimpleNamespace(
        guild_id=int(G), response=resp, followup=SimpleNamespace(send=enviar), user=SimpleNamespace(id=1),
    ), resp, seguimentos


def _capturar_publicacoes(monkeypatch):
    publicados = []

    async def fake(bot, **kwargs):
        publicados.append(kwargs)
        return "entregue"

    monkeypatch.setattr(jornal_mod.publicacoes, "publicar_ou_enfileirar", fake)
    return publicados


def test_meta_criar_abre_anuncia_e_recusa_uma_segunda(monkeypatch):
    publicados = _capturar_publicacoes(monkeypatch)
    db = novo_db()
    db.set_canal_categoria(G, "dinheiro", "777")
    cog = _cog(db)
    inter, resp, seg = _inter()
    _rodar(jornal_mod.Jornal.meta_criar.callback(cog, inter, "Reconstruir a ponte", 300, 5, "Para a ponte.", "A feira abre.", 12))
    meta = db.get_meta_ativa(G)
    assert (meta["alvo"], meta["festival_horas"], meta["recompensa"]) == (300, 12, "A feira abre.")
    assert abs((meta["prazo"] - datetime.now(timezone.utc)) - timedelta(days=5)) < timedelta(minutes=1)
    assert publicados[0]["dedupe_key"].startswith("meta-abre:") and publicados[0]["canal_id"] == "777"
    texto = publicados[0]["embed"].description
    assert "A feira abre." in texto and "festival de 12h" in texto and "/banco" in texto
    assert "aberta" in seg[0][0][0]

    inter2, resp2, _ = _inter()
    _rodar(jornal_mod.Jornal.meta_criar.callback(cog, inter2, "Outra", 100, 7, "", "", 0))
    assert "Já existe uma meta aberta" in resp2.mensagens[0][0][0]


def test_meta_criar_sem_canal_de_dinheiro_funciona_so_nos_paineis(monkeypatch):
    publicados = _capturar_publicacoes(monkeypatch)
    db = novo_db()
    inter, resp, _ = _inter()
    _rodar(jornal_mod.Jornal.meta_criar.callback(_cog(db), inter, "Ponte", 100, 7, "", "", 0))
    assert db.get_meta_ativa(G) is not None and publicados == []
    assert "só aparece nos painéis" in resp.mensagens[0][0][0]


def test_meta_listar_e_cancelar_com_reembolso(monkeypatch):
    publicados = _capturar_publicacoes(monkeypatch)
    db = novo_db()
    db.set_canal_categoria(G, "dinheiro", "777")
    cog = _cog(db)
    inter, resp, _ = _inter()
    _rodar(jornal_mod.Jornal.meta_listar.callback(cog, inter))
    assert resp.mensagens[0][0][0] == "Nenhuma meta criada ainda."

    meta_id = db.criar_meta(G, "Ponte", "", 200, 7, "", 0, "1")
    db.garantir_jogador(G, "a")
    antes = _saldo(db, "a")
    _doar(db, "a", 60)
    inter, resp, _ = _inter()
    _rodar(jornal_mod.Jornal.meta_listar.callback(cog, inter))
    assert "Ponte" in resp.mensagens[0][1]["embed"].description and "aberta" in resp.mensagens[0][1]["embed"].description

    inter, resp, seg = _inter()
    _rodar(jornal_mod.Jornal.meta_cancelar.callback(cog, inter, meta_id))
    assert "cancelada" in seg[0][0][0] and "60" in seg[0][0][0]
    assert _saldo(db, "a") == antes + 60
    anuncio = publicados[-1]
    assert anuncio["dedupe_key"] == f"meta-fim:{meta_id}" and "O Mestre encerrou a meta" in anuncio["embed"].description
    assert "voltaram" in anuncio["embed"].description

    inter, resp, _ = _inter()
    _rodar(jornal_mod.Jornal.meta_cancelar.callback(cog, inter, meta_id))
    assert "não encontrada ou já encerrada" in resp.mensagens[0][0][0]


def test_ciclo_encerra_so_a_meta_vencida_devolve_e_anuncia(monkeypatch):
    publicados = _capturar_publicacoes(monkeypatch)
    db = novo_db()
    db.set_canal_categoria(G, "dinheiro", "777")
    meta_id = db.criar_meta(G, "Ponte", "", 200, 7, "", 0, "1")
    db.garantir_jogador(G, "a")
    antes = _saldo(db, "a")
    _doar(db, "a", 40)
    cog = _cog(db)

    _rodar(jornal_mod.Jornal.ciclo_metas.coro(cog))  # ainda no prazo: nada acontece
    assert db.get_meta_ativa(G) is not None and publicados == []

    with db._conn() as con:
        con.execute("UPDATE jardim_metas SET prazo = CURRENT_TIMESTAMP - interval '1 minute'")
    _rodar(jornal_mod.Jornal.ciclo_metas.coro(cog))
    assert _saldo(db, "a") == antes + 40
    assert len(publicados) == 1 and "não foi batida" in publicados[0]["embed"].description
    assert db.listar_metas(G)[0]["status"] == "expirada"
    _rodar(jornal_mod.Jornal.ciclo_metas.coro(cog))  # idempotente
    assert _saldo(db, "a") == antes + 40 and len(publicados) == 1


# ── festival nos baús ───────────────────────────────────────────────────────
def test_festival_ativo_deixa_os_baus_generosos_e_avisa(monkeypatch):
    chamadas = []
    original = loot.sortear_raridade_bau

    def espiao(rng, *, evento_especial=False):
        chamadas.append(evento_especial)
        return original(rng, evento_especial=evento_especial)

    import cogs.baus as baus_mod

    monkeypatch.setattr(baus_mod.loot_mod, "sortear_raridade_bau", espiao)
    db = novo_db()
    canal = _CanalTexto()
    cog = _cog_com_canal(db, canal)
    cog._sortear_canal_valido = lambda guild_id, canal_forcado=None: canal

    _rodar(cog._dropar({"guild_id": G, "itens_por_bau": 1}))
    assert chamadas == [False]
    assert "Festival do Jardim" not in {c.name for c in canal.enviados[0]["embed"].fields}

    with db._conn() as con:
        con.execute(
            "INSERT INTO jardim_eventos (guild_id, titulo, tipo, expira_em, efeito) "
            "VALUES (%s, 'Festival', 'festival', CURRENT_TIMESTAMP + interval '1 hour', 'baus_especiais')", (G,),
        )
    _rodar(cog._dropar({"guild_id": G, "itens_por_bau": 1}))
    assert chamadas == [False, True]
    campos = {c.name: c.value for c in canal.enviados[1]["embed"].fields}
    assert "mesa bateu a meta" in campos["🎉 Festival do Jardim"]


# ── painel ──────────────────────────────────────────────────────────────────
def test_inicio_do_jardim_mostra_a_meta():
    meta = {"titulo": "Ponte", "arrecadado": 50, "alvo": 200, "prazo": datetime.now(timezone.utc) + timedelta(days=2)}
    campos = {c.name: c.value for c in montar_embed_inicio("Lina", _dados(meta=meta)).fields}
    assert "Ponte" in campos["🏛️ Cofre do Jardim"] and "50/200" in campos["🏛️ Cofre do Jardim"] and "/banco" in campos["🏛️ Cofre do Jardim"]
    assert "🏛️ Cofre do Jardim" not in {c.name for c in montar_embed_inicio("Lina", _dados()).fields}


def test_secao_cofre_do_jardim_no_painel_do_jornalista():
    async def verificar():
        db = novo_db()
        inter = _InterPainel(["cofre"])
        bot = await _bot_carregado(db)
        try:
            view = _painel(bot.get_cog("Painel"))
            await view._ao_escolher(inter)
            vazio = [e for e in inter.eventos if isinstance(e, tuple) and e[0] == "edit_original"][-1][1]["embed"]
            assert "Nenhuma meta aberta" in vazio.description

            meta_id = db.criar_meta("100", "Ponte", "Para o norte.", 200, 7, "A feira abre.", 0, "1")
            _doar(db, "200", 80, meta_id)
            inter2 = _InterPainel(["cofre"])
            await view._ao_escolher(inter2)
            emb = [e for e in inter2.eventos if isinstance(e, tuple) and e[0] == "edit_original"][-1][1]["embed"]
            assert "Ponte" in emb.title and "A feira abre." in emb.description and "/banco" in emb.description
            assert "<@200>: ☾ 80" in {f.name: f.value for f in emb.fields}["Quem mais doou"]
        finally:
            await bot.close()

    _rodar(verificar())
