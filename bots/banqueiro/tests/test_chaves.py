"""Chaves do Jardim no Banqueiro: compra atômica e a loja dentro do /banco."""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path
from types import SimpleNamespace

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE))

from cogs.painel import ViewChaves, embed_chaves, montar_embed_inicio
from core import economia
from core.painel import PainelView
from tests.db_utils import novo_db
from tests.test_painel import _Inter, _bot_carregado, _dados

G, U = "100", "200"


def _rodar(coro):
    return asyncio.run(coro)


def _saldo(db, moeda="Lunaris"):
    return db.get_carteira(G, U).get(moeda, 0)


def _extrato(db):
    with db._conn() as con:
        return [dict(r) for r in con.execute(
            "SELECT delta, moeda, descricao FROM extrato WHERE guild_id=%s AND user_id=%s ORDER BY id", (G, U)
        ).fetchall()]


def test_compra_debita_soma_o_estoque_e_registra_no_extrato():
    db = novo_db()
    db.creditar(G, U, "Lunaris", 500)
    antes = _saldo(db)
    r = db.comprar_chaves(G, U, 3, economia.CHAVE_PRECO, economia.CHAVES_MAX)
    assert r == {"status": "ok", "quantidade": 3, "custo": 3 * economia.CHAVE_PRECO}
    assert _saldo(db) == antes - 3 * economia.CHAVE_PRECO
    assert db.get_chaves(G, U) == {"quantidade": 3, "auto_usar": True}
    ultimo = _extrato(db)[-1]
    assert ultimo["delta"] == -3 * economia.CHAVE_PRECO and "3 Chave(s)" in ultimo["descricao"]


def test_compra_sem_saldo_nao_mexe_em_nada():
    db = novo_db()
    db.garantir_jogador(G, U)
    antes = _saldo(db)
    r = db.comprar_chaves(G, U, 1, 10_000, economia.CHAVES_MAX)
    assert r["status"] == "saldo"
    assert _saldo(db) == antes and db.get_chaves(G, U)["quantidade"] == 0


def test_compra_respeita_o_limite_do_estoque():
    db = novo_db()
    db.creditar(G, U, "Lunaris", 5000)
    assert db.comprar_chaves(G, U, 9, economia.CHAVE_PRECO, economia.CHAVES_MAX)["status"] == "ok"
    antes = _saldo(db)
    r = db.comprar_chaves(G, U, 2, economia.CHAVE_PRECO, economia.CHAVES_MAX)
    assert r == {"status": "limite", "quantidade": 9}
    assert _saldo(db) == antes and db.get_chaves(G, U)["quantidade"] == 9
    assert db.comprar_chaves(G, U, 1, economia.CHAVE_PRECO, economia.CHAVES_MAX)["status"] == "ok"


def test_o_preco_e_o_limite_do_banqueiro_batem_com_os_do_jornalista():
    """Os ZIPs são separados e cada um tem a própria constante do limite."""
    jornalista = (BASE.parent / "jornalista" / "core" / "loot.py").read_text(encoding="utf-8")
    assert f"CHAVES_MAX = {economia.CHAVES_MAX}" in jornalista


def test_tela_da_loja_mostra_estoque_preco_e_aviso():
    emb = embed_chaves({"quantidade": 2, "auto_usar": False}, 120, "✅ comprou")
    campos = {c.name: c.value for c in emb.fields}
    assert "fundo falso" in emb.description and "✅ comprou" in emb.description
    assert "2" in campos["Você tem"] and str(economia.CHAVE_PRECO) in campos["Preço"]
    assert "120" in campos["Sua carteira"] and "Desligado" in campos["Uso automático"]


def test_inicio_do_banco_so_fala_de_chaves_quem_tem():
    sem = montar_embed_inicio("Lina", _dados())
    assert "🗝️ Chaves do Jardim" not in {c.name for c in sem.fields}
    com = montar_embed_inicio("Lina", _dados(chaves={"quantidade": 2, "auto_usar": True}))
    campo = {c.name: c.value for c in com.fields}["🗝️ Chaves do Jardim"]
    assert "**2**" in campo and "ligado" in campo


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


class _InterBotao:
    def __init__(self, uid=int(U)):
        self.eventos = []
        self.guild_id = int(G)
        self.user = SimpleNamespace(id=uid, display_name="Lina")
        self.response = _Resposta(self)

    async def edit_original_response(self, **kw):
        self.eventos.append(("edit_original", kw))


def _ultimo_embed(inter):
    return [e for e in inter.eventos if isinstance(e, tuple) and e[0] == "edit_original"][-1][1]["embed"]


def test_botoes_da_loja_compram_e_alternam_o_uso_automatico():
    async def verificar():
        db = novo_db()
        db.creditar(G, U, "Lunaris", 400)
        cog = SimpleNamespace(bot=SimpleNamespace(db=db))
        view = ViewChaves(cog, int(U), db.get_chaves(G, U))
        assert view.comprar1.label == f"Comprar 1 (☾{economia.CHAVE_PRECO})"

        inter = _InterBotao()
        await view._comprar(inter, 1)
        assert inter.eventos[0] == "defer"
        assert "comprou 1 Chave" in _ultimo_embed(inter).description
        assert db.get_chaves(G, U)["quantidade"] == 1

        inter = _InterBotao()
        await view._alternar(inter)
        assert db.get_chaves(G, U)["auto_usar"] is False
        assert view.alternar.label == "Uso automático: desligado"
        await view._alternar(_InterBotao())
        assert db.get_chaves(G, U)["auto_usar"] is True

        # No limite, os botões de compra se desativam.
        db.comprar_chaves(G, U, 7, economia.CHAVE_PRECO, economia.CHAVES_MAX)
        inter = _InterBotao()
        await view._comprar(inter, 3)  # 8 + 3 > 10: o banco recusa
        assert "limite" in _ultimo_embed(inter).description
        assert view.comprar3.disabled is True and view.comprar1.disabled is False

        inter = _InterBotao()
        db_pobre = novo_db()
        view_pobre = ViewChaves(SimpleNamespace(bot=SimpleNamespace(db=db_pobre)), int(U), {"quantidade": 0, "auto_usar": True})
        db_pobre.garantir_jogador(G, U)
        with db_pobre._conn() as con:
            con.execute("UPDATE carteira SET saldo=0 WHERE guild_id=%s AND user_id=%s", (G, U))
        await view_pobre._comprar(inter, 1)
        assert "Faltam Lunaris" in _ultimo_embed(inter).description

    _rodar(verificar())


def test_so_o_dono_usa_a_loja_de_chaves():
    async def verificar():
        view = ViewChaves(SimpleNamespace(bot=None), int(U), {"quantidade": 0, "auto_usar": True})
        estranho = _InterBotao(uid=1)
        assert await view.interaction_check(estranho) is False
        assert "outra pessoa" in estranho.eventos[0][1][0]
        assert await view.interaction_check(_InterBotao()) is True

    _rodar(verificar())


def test_secao_chaves_do_painel_abre_a_loja_com_o_botao_de_inicio():
    async def verificar():
        db = novo_db()
        db.creditar(G, U, "Lunaris", 100)
        bot = await _bot_carregado(db)
        try:
            cog = bot.get_cog("Painel")
            view = PainelView(autor_id=int(U), secoes=cog._secoes(), inicio=cog._inicio, acoes=cog._acoes())
            inter = _Inter(["chaves"])
            await view._ao_escolher(inter)
            editado = [e for e in inter.eventos if isinstance(e, tuple) and e[0] == "edit_original"][-1][1]
            assert editado["embed"].title == "🗝️ Chaves do Jardim"
            rotulos = [getattr(b, "label", "") for b in editado["view"].children]
            assert any(r.startswith("Comprar 1") for r in rotulos) and "Início" in rotulos
        finally:
            await bot.close()

    _rodar(verificar())
