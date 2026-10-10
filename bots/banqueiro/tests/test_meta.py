"""Cofre do Jardim no Banqueiro: doação atômica e a tela dentro do /banco."""

from __future__ import annotations

import asyncio
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from types import SimpleNamespace

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE))

from cogs.painel import ViewMeta, embed_meta, montar_embed_inicio
from core.painel import PainelView
from tests.db_utils import novo_db
from tests.test_painel import _Inter, _bot_carregado, _dados

G, U = "100", "200"


def _rodar(coro):
    return asyncio.run(coro)


def _abrir_meta(db, alvo=100, festival_horas=0, recompensa="", dias=7, titulo="Reconstruir a ponte"):
    with db._conn() as con:
        row = con.execute(
            """
            INSERT INTO jardim_metas (guild_id, titulo, descricao, alvo, recompensa, festival_horas, prazo)
            VALUES (%s, %s, 'Para a ponte do norte.', %s, %s, %s, CURRENT_TIMESTAMP + make_interval(days => %s))
            RETURNING id
            """,
            (G, titulo, alvo, recompensa, festival_horas, dias),
        ).fetchone()
    return int(row["id"])


def _saldo(db, uid=U):
    return db.get_carteira(G, uid).get("Lunaris", 0)


def _extrato(db, uid=U):
    with db._conn() as con:
        return [dict(r) for r in con.execute(
            "SELECT delta, descricao FROM extrato WHERE guild_id=%s AND user_id=%s ORDER BY id", (G, uid)
        ).fetchall()]


# ── banco ───────────────────────────────────────────────────────────────────
def test_sem_meta_aberta_a_doacao_e_recusada():
    db = novo_db()
    db.creditar(G, U, "Lunaris", 100)
    assert db.doar_meta(G, U, 10) == {"status": "sem_meta"}
    assert _saldo(db) == 120


def test_doacao_debita_soma_na_meta_e_registra_no_extrato():
    db = novo_db()
    db.creditar(G, U, "Lunaris", 100)
    antes = _saldo(db)
    meta_id = _abrir_meta(db, alvo=500)
    r = db.doar_meta(G, U, 30)
    assert r == {"status": "ok", "valor": 30, "arrecadado": 30, "alvo": 500, "concluida": False, "meta_id": meta_id}
    assert _saldo(db) == antes - 30
    assert db.get_meta_ativa(G)["arrecadado"] == 30
    assert _extrato(db)[-1]["delta"] == -30 and "Reconstruir a ponte" in _extrato(db)[-1]["descricao"]
    db.doar_meta(G, U, 20)
    assert db.top_doadores(meta_id) == [{"user_id": U, "total": 50}]


def test_doacao_sem_saldo_nao_mexe_em_nada():
    db = novo_db()
    db.garantir_jogador(G, U)
    _abrir_meta(db, alvo=500)
    antes = _saldo(db)
    r = db.doar_meta(G, U, 10_000)
    assert r["status"] == "saldo"
    assert _saldo(db) == antes and db.get_meta_ativa(G)["arrecadado"] == 0 and db.top_doadores(1) == []


def test_ninguem_paga_a_mais_do_que_falta_e_a_meta_fecha():
    db = novo_db()
    db.creditar(G, U, "Lunaris", 500)
    antes = _saldo(db)
    _abrir_meta(db, alvo=100)
    db.doar_meta(G, U, 90)
    r = db.doar_meta(G, U, 50)  # só faltavam 10
    assert r["valor"] == 10 and r["concluida"] is True and r["arrecadado"] == 100
    assert _saldo(db) == antes - 100
    assert db.get_meta_ativa(G) is None
    assert db.get_ultima_meta_encerrada(G)["status"] == "concluida"
    assert db.doar_meta(G, U, 5) == {"status": "sem_meta"}


def test_meta_batida_com_festival_abre_o_evento_e_enfileira_o_aviso():
    db = novo_db()
    db.creditar(G, U, "Lunaris", 500)
    _abrir_meta(db, alvo=50, festival_horas=24, recompensa="O Mestre libera a feira de outono.")
    db.doar_meta(G, U, 50)
    eventos = db.listar_eventos_ativos(G)
    assert [e["titulo"] for e in eventos] == ["Festival: Reconstruir a ponte"]
    with db._conn() as con:
        ev = con.execute("SELECT tipo, efeito FROM jardim_eventos").fetchone()
        aviso = con.execute("SELECT mensagem, categoria, publicado FROM avisos_pendentes").fetchone()
    assert (ev["tipo"], ev["efeito"]) == ("festival", "baus_especiais")
    assert aviso["categoria"] == "noticia" and aviso["publicado"] is False
    assert "bateu a meta" in aviso["mensagem"] and "feira de outono" in aviso["mensagem"] and "festival de **24h**" in aviso["mensagem"]


def test_meta_batida_sem_festival_so_avisa():
    db = novo_db()
    db.creditar(G, U, "Lunaris", 500)
    _abrir_meta(db, alvo=50)
    db.doar_meta(G, U, 50)
    assert db.listar_eventos_ativos(G) == []
    with db._conn() as con:
        assert con.execute("SELECT COUNT(*) AS n FROM avisos_pendentes").fetchone()["n"] == 1


def test_meta_com_prazo_vencido_nao_recebe_doacao():
    db = novo_db()
    db.creditar(G, U, "Lunaris", 100)
    _abrir_meta(db, alvo=100)
    with db._conn() as con:
        con.execute("UPDATE jardim_metas SET prazo = CURRENT_TIMESTAMP - interval '1 minute'")
    assert db.get_meta_ativa(G) is None
    assert db.doar_meta(G, U, 10) == {"status": "sem_meta"}


def test_doacoes_simultaneas_nao_estouram_a_meta():
    from concurrent.futures import ThreadPoolExecutor

    db = novo_db()
    for uid in ("1", "2", "3", "4"):
        db.creditar(G, uid, "Lunaris", 100)
    _abrir_meta(db, alvo=100)
    with ThreadPoolExecutor(max_workers=4) as pool:
        resultados = list(pool.map(lambda uid: db.doar_meta(G, uid, 60), ["1", "2", "3", "4"]))
    ok = [r for r in resultados if r["status"] == "ok"]
    assert sum(r["valor"] for r in ok) == 100  # exatamente o alvo
    assert sum(1 for r in resultados if r["status"] == "sem_meta") >= 1
    with db._conn() as con:
        total = con.execute("SELECT COALESCE(SUM(valor), 0)::int AS t FROM jardim_doacoes").fetchone()["t"]
    assert total == 100


# ── telas ───────────────────────────────────────────────────────────────────
def _meta_dict(**extra):
    base = {
        "id": 1, "titulo": "Reconstruir a ponte", "descricao": "Para a ponte do norte.", "alvo": 200, "arrecadado": 50,
        "recompensa": "A feira de outono abre.", "festival_horas": 12, "status": "aberta",
        "prazo": datetime.now(timezone.utc) + timedelta(days=3),
    }
    base.update(extra)
    return base


def test_tela_do_cofre_mostra_progresso_recompensa_reembolso_e_doadores():
    emb = embed_meta(_meta_dict(), [{"user_id": "7", "total": 30}], 80, "✅ doou")
    assert "Reconstruir a ponte" in emb.title and "✅ doou" in emb.description
    assert "feira de outono" in emb.description and "festival de 12h" in emb.description
    assert "recebe de volta" in emb.description  # a garantia fica explícita
    campos = {c.name: c.value for c in emb.fields}
    assert "50/200" in campos["Progresso"] and "Faltam ☾ **150**" in campos["Progresso"]
    assert "<@7>: ☾ 30" in campos["Quem mais doou"] and "80" in campos["Sua carteira"]


def test_tela_sem_meta_lembra_a_ultima():
    vazio = embed_meta(None, [], 0)
    assert "Nenhuma meta aberta" in vazio.description
    batida = embed_meta(None, [], 0, ultima=_meta_dict(status="concluida"))
    assert "batida" in batida.description and "Reconstruir a ponte" in batida.description
    assert "voltaram" in embed_meta(None, [], 0, ultima=_meta_dict(status="expirada")).description


def test_inicio_do_banco_mostra_a_meta_aberta():
    com = montar_embed_inicio("Lina", _dados(meta=_meta_dict()))
    assert "Cofre do Jardim" in {c.name: c.value for c in com.fields}["🌿 Acontecendo agora"]
    sem = montar_embed_inicio("Lina", _dados())
    assert "Cofre do Jardim" not in {c.name: c.value for c in sem.fields}["🌿 Acontecendo agora"]


class _Resposta:
    def __init__(self, i):
        self.i, self.feito = i, False

    def is_done(self):
        return self.feito

    async def defer(self, **kw):
        self.feito = True
        self.i.eventos.append("defer")

    async def send_message(self, *a, **kw):
        self.feito = True
        self.i.eventos.append(("send_message", a, kw))

    async def send_modal(self, modal):
        self.feito = True
        self.i.eventos.append(("send_modal", modal))


class _InterBotao:
    def __init__(self, uid=int(U)):
        self.eventos = []
        self.guild_id = int(G)
        self.user = SimpleNamespace(id=uid)
        self.response = _Resposta(self)

    async def edit_original_response(self, **kw):
        self.eventos.append(("edit_original", kw))


def _embed_final(inter):
    return [e for e in inter.eventos if isinstance(e, tuple) and e[0] == "edit_original"][-1][1]["embed"]


def test_botoes_de_doacao_atualizam_o_painel_e_travam_quando_a_meta_acaba():
    async def verificar():
        db = novo_db()
        db.creditar(G, U, "Lunaris", 300)
        _abrir_meta(db, alvo=60)
        cog = SimpleNamespace(bot=SimpleNamespace(db=db))
        from cogs.painel import Painel

        cog.executar_doacao = lambda s, u, v: Painel.executar_doacao(cog, s, u, v)
        cog.montar_embed_meta = lambda s, u, a="": Painel.montar_embed_meta(cog, s, u, a)
        view = ViewMeta(cog, int(U), True)

        inter = _InterBotao()
        await view._doar(inter, 10)
        assert inter.eventos[0] == "defer"
        assert "Você doou ☾ **10**" in _embed_final(inter).description
        assert db.get_meta_ativa(G)["arrecadado"] == 10 and view.dez.disabled is False

        inter = _InterBotao()
        await view._doar(inter, 50)  # fecha a meta
        assert "A meta foi batida" in _embed_final(inter).description
        assert view.dez.disabled and view.cinquenta.disabled and view.outro.disabled

        inter = _InterBotao()
        await view._doar(inter, 10)
        assert "já terminou" in _embed_final(inter).description

        pobre = _InterBotao(uid=999)
        db.garantir_jogador(G, "999")
        with db._conn() as con:
            con.execute("UPDATE carteira SET saldo=0 WHERE user_id='999'")
        _abrir_meta(db, alvo=500, titulo="Outra")
        view2 = ViewMeta(cog, 999, True)
        await view2._doar(pobre, 10)
        assert "Faltam Lunaris" in _embed_final(pobre).description

    _rodar(verificar())


def test_secao_cofre_do_jardim_do_painel_abre_a_tela_com_botoes_de_doar():
    async def verificar():
        db = novo_db()
        db.creditar(G, U, "Lunaris", 100)
        _abrir_meta(db, alvo=100)
        bot = await _bot_carregado(db)
        try:
            cog = bot.get_cog("Painel")
            view = PainelView(autor_id=int(U), secoes=cog._secoes(), inicio=cog._inicio, acoes=cog._acoes())
            inter = _Inter(["cofre_jardim"])
            await view._ao_escolher(inter)
            editado = [e for e in inter.eventos if isinstance(e, tuple) and e[0] == "edit_original"][-1][1]
            assert "Cofre do Jardim: Reconstruir a ponte" in editado["embed"].title
            rotulos = [getattr(b, "label", "") for b in editado["view"].children]
            assert {"Doar ☾10", "Doar ☾50", "Outro valor", "Início"} <= set(rotulos)
        finally:
            await bot.close()

    _rodar(verificar())


def test_o_menu_do_painel_continua_cabendo_nas_25_opcoes():
    from cogs.painel import SECOES

    assert len(SECOES) <= 25
