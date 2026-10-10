"""Chaves do Jardim no Jornalista: gasto automático nos baús, brinde e reembolso."""

from __future__ import annotations

import asyncio
import random
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from types import SimpleNamespace

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE))

from cogs.baus import Baus
from core import loot
from core.catalogo import Catalogo
from tests.db_utils import novo_db

G = "100"


def _rodar(coro):
    return asyncio.run(coro)


def _catalogo():
    c = Catalogo()
    c.carregar_dados({"entradas": [
        {"tipo": "arma", "id": "espada", "titulo": "Espada", "conteudo": {"raridade": "raro"}},
        {"tipo": "arma", "id": "adaga", "titulo": "Adaga", "conteudo": {"raridade": "incomum"}},
    ]})
    return c


# ── banco ───────────────────────────────────────────────────────────────────
def test_estoque_de_chaves_tem_teto_e_devolve_quantas_entraram():
    db = novo_db()
    assert db.get_chaves(G, "1") == {"quantidade": 0, "auto_usar": True}
    assert db.conceder_chave(G, "1") == 1
    assert db.conceder_chave(G, "1", 20) == loot.CHAVES_MAX - 1
    assert db.get_chaves(G, "1")["quantidade"] == loot.CHAVES_MAX
    assert db.conceder_chave(G, "1") == 0  # cheio: nada entra


def test_consumir_chave_so_com_estoque_e_uso_automatico_ligado():
    db = novo_db()
    assert db.consumir_chave(G, "1") is False  # sem linha
    db.conceder_chave(G, "1", 2)
    assert db.consumir_chave(G, "1") is True and db.get_chaves(G, "1")["quantidade"] == 1
    db.set_chaves_auto(G, "1", False)
    assert db.consumir_chave(G, "1") is False and db.get_chaves(G, "1")["quantidade"] == 1  # guardada
    db.set_chaves_auto(G, "1", True)
    assert db.consumir_chave(G, "1") is True
    assert db.consumir_chave(G, "1") is False  # zerou, nunca fica negativa


# ── lógica pura ─────────────────────────────────────────────────────────────
def test_chave_nao_vale_para_comum_e_a_corrida_so_dá_chave_do_raro_para_cima():
    assert not loot.chave_vale_para("comum")
    assert all(loot.chave_vale_para(r) for r in ("incomum", "raro", "epico", "lendario", "mitico"))
    assert not loot.chave_cai_na_corrida("comum") and not loot.chave_cai_na_corrida("incomum")
    assert all(loot.chave_cai_na_corrida(r) for r in ("raro", "epico", "lendario", "mitico"))


def test_fundo_falso_soma_lunaris_e_um_item_extra_sem_repetir():
    premio = {"lunaris": 40, "itens": [], "creditos_sombrios": 0}
    novo = loot.aplicar_chave_ao_premio(premio, _catalogo(), pesos={"raro": 1})
    assert novo["lunaris"] == 60 and [i.id for i in novo["itens"]] == ["espada"]
    assert novo["chave"] == {"item_extra": True}
    de_novo = loot.aplicar_chave_ao_premio(novo, _catalogo(), pesos={"raro": 1})
    assert [i.id if hasattr(i, "id") else i["id"] for i in de_novo["itens"]] == ["espada"]  # não repete
    sem_item = loot.aplicar_chave_ao_premio(premio, Catalogo(), pesos={"raro": 1})
    assert sem_item["lunaris"] == 60 and sem_item["itens"] == [] and sem_item["chave"] == {"item_extra": False}


# ── fluxos nos baús (banco real) ────────────────────────────────────────────
class _Resp:
    async def defer(self, **kw):
        pass


class _Inter:
    def __init__(self, uid):
        self.enviados = []
        self.response = _Resp()
        self.followup = SimpleNamespace(send=self._enviar)
        self.guild_id = int(G)
        self.message = None
        self.user = SimpleNamespace(id=uid, mention=f"<@{uid}>")

    async def _enviar(self, texto=None, **kw):
        self.enviados.append((texto, kw))

    def textos(self):
        saida = []
        for texto, kw in self.enviados:
            saida.append(texto or "")
            if kw.get("embed") is not None:
                saida.append(kw["embed"].description or "")
        return "\n".join(saida)


def _cog(db):
    cog = object.__new__(Baus)
    cog.bot = SimpleNamespace(db=db, catalogo=_catalogo(), platform=None, get_guild=lambda gid: None)
    return cog


def _carteira(db, uid):
    with db._conn() as con:
        rows = con.execute("SELECT moeda, saldo FROM carteira WHERE guild_id=%s AND user_id=%s", (G, str(uid))).fetchall()
    return {r["moeda"]: r["saldo"] for r in rows}


def _itens(db, uid):
    with db._conn() as con:
        rows = con.execute("SELECT item_id FROM inventario WHERE guild_id=%s AND user_id=%s", (G, str(uid))).fetchall()
    return {r["item_id"] for r in rows}


def _bau_corrida(db, token="r" * 32, msg="800", raridade="raro", lunaris=40):
    expira = datetime.now(timezone.utc) + timedelta(hours=1)
    premio = {"lunaris": lunaris, "itens": [], "creditos_sombrios": 0,
              "bau": {"raridade": raridade, "nome": f"Baú {raridade}", "dificuldade_enigma": "facil", "expira_minutos": 90}}
    db.criar_bau_no_ar(token, G, "7", msg, premio, expira)
    db.registrar_bau_historico(G, "7", msg, token, raridade, f"Baú {raridade}", False, expira)
    return db.get_bau_no_ar(token)


def _bau_coletivo(db, token="c" * 32, msg="801", raridade="incomum", lunaris=10):
    expira = datetime.now(timezone.utc) + timedelta(hours=1)
    premio = {"lunaris": 0, "itens": [], "creditos_sombrios": 0,
              "bau": {"raridade": raridade, "nome": f"Baú {raridade}", "dificuldade_enigma": None,
                      "expira_minutos": 120, "coletivo": True},
              "coletivo": {"lunaris_min": lunaris, "lunaris_max": lunaris, "chance_item": 0,
                           "pesos_itens": {"incomum": 1}, "tipos": None}}
    db.criar_bau_no_ar(token, G, "7", msg, premio, expira)
    db.registrar_bau_historico(G, "7", msg, token, raridade, f"Baú {raridade}", True, expira)
    return db.get_bau_no_ar(token)


def test_corrida_de_bau_raro_gasta_a_chave_e_o_vencedor_ganha_outra(monkeypatch):
    db = novo_db()
    db.conceder_chave(G, "1")
    cog = _cog(db)
    inter = _Inter(1)
    _rodar(cog.abrir_bau_click(inter, _bau_corrida(db)["token"]))
    assert _carteira(db, 1)["Lunaris"] == 20 + 60  # 40 + 50% do fundo falso
    assert "espada" in _itens(db, 1)  # o item extra do degrau acima
    texto = inter.textos()
    assert "abriu o fundo falso" in texto and "Chave do Jardim" in texto  # recibo e brinde
    assert db.get_chaves(G, "1")["quantidade"] == 1  # gastou 1, ganhou 1 por vencer o Raro


def test_sem_chave_o_bau_abre_normalmente_e_o_vencedor_ainda_ganha_uma():
    db = novo_db()
    cog = _cog(db)
    inter = _Inter(1)
    _rodar(cog.abrir_bau_click(inter, _bau_corrida(db)["token"]))
    assert _carteira(db, 1)["Lunaris"] == 20 + 40 and _itens(db, 1) == set()
    assert "fundo falso" not in inter.textos()
    assert db.get_chaves(G, "1")["quantidade"] == 1


def test_bau_comum_nunca_gasta_chave(monkeypatch):
    monkeypatch.setattr(random, "random", lambda: 0.99)  # sem brinde
    db = novo_db()
    db.conceder_chave(G, "1")
    cog = _cog(db)
    _rodar(cog.abrir_bau_click(_Inter(1), _bau_coletivo(db, raridade="comum")["token"]))
    assert db.get_chaves(G, "1")["quantidade"] == 1
    assert _carteira(db, 1)["Lunaris"] == 20 + 10


def test_bau_incomum_coletivo_gasta_a_chave(monkeypatch):
    monkeypatch.setattr(random, "random", lambda: 0.99)
    db = novo_db()
    db.conceder_chave(G, "1")
    cog = _cog(db)
    inter = _Inter(1)
    _rodar(cog.abrir_bau_click(inter, _bau_coletivo(db)["token"]))
    assert db.get_chaves(G, "1")["quantidade"] == 0
    assert _carteira(db, 1)["Lunaris"] == 20 + 15
    assert len(_itens(db, 1) & {"espada", "adaga"}) == 1  # o degrau acima do Incomum sorteia entre os dois
    assert "abriu o fundo falso" in inter.textos()


def test_chave_guardada_quando_o_uso_automatico_esta_desligado(monkeypatch):
    monkeypatch.setattr(random, "random", lambda: 0.99)
    db = novo_db()
    db.conceder_chave(G, "1")
    db.set_chaves_auto(G, "1", False)
    _rodar(_cog(db).abrir_bau_click(_Inter(1), _bau_coletivo(db)["token"]))
    assert db.get_chaves(G, "1")["quantidade"] == 1
    assert _carteira(db, 1)["Lunaris"] == 20 + 10


def test_clique_repetido_no_coletivo_devolve_a_chave(monkeypatch):
    monkeypatch.setattr(random, "random", lambda: 0.99)
    db = novo_db()
    db.conceder_chave(G, "1", 2)
    cog = _cog(db)
    row = _bau_coletivo(db)
    _rodar(cog.abrir_bau_click(_Inter(1), row["token"]))
    assert db.get_chaves(G, "1")["quantidade"] == 1
    repetido = _Inter(1)
    _rodar(cog.abrir_bau_click(repetido, row["token"]))
    assert "já pegou o seu" in repetido.textos()
    assert db.get_chaves(G, "1")["quantidade"] == 1  # a segunda tentativa não custou Chave


def test_quem_perde_a_corrida_na_hora_recebe_a_chave_de_volta():
    db = novo_db()
    cog = _cog(db)
    row = _bau_corrida(db)
    db.conceder_chave(G, "2")
    _rodar(cog.abrir_bau_click(_Inter(1), row["token"]))  # o 1 leva
    # O 2 clicou com o baú ainda "no ar" na visão dele (cliques simultâneos).
    atrasado = _Inter(2)
    _rodar(cog._resolver_abertura(atrasado, row))
    assert "já foi atribuído" in atrasado.textos()
    assert db.get_chaves(G, "2")["quantidade"] == 1
    assert "espada" not in _itens(db, 2) and _carteira(db, 2).get("Lunaris", 20) == 20


def test_brinde_respeita_o_estoque_cheio(monkeypatch):
    monkeypatch.setattr(random, "random", lambda: 0.0)  # sempre sorteia a Chave
    db = novo_db()
    db.conceder_chave(G, "1", loot.CHAVES_MAX)
    inter = _Inter(1)
    _rodar(_cog(db).abrir_bau_click(inter, _bau_coletivo(db, raridade="comum")["token"]))
    assert db.get_chaves(G, "1")["quantidade"] == loot.CHAVES_MAX
    assert "achou uma **Chave" not in inter.textos()  # sem aviso de uma Chave que não entrou


def test_brinde_do_baú_coletivo_avisa_quando_entra(monkeypatch):
    monkeypatch.setattr(random, "random", lambda: 0.0)
    db = novo_db()
    inter = _Inter(1)
    _rodar(_cog(db).abrir_bau_click(inter, _bau_coletivo(db, raridade="comum")["token"]))
    assert db.get_chaves(G, "1")["quantidade"] == 1
    assert "Chave do Jardim" in inter.textos()


def test_baus_hoje_mostra_as_chaves():
    db = novo_db()
    db.conceder_chave(G, "5", 3)
    cog = _cog(db)
    enviados = []

    class _R:
        async def send_message(self, *a, **kw):
            enviados.append(kw)

    inter = SimpleNamespace(guild_id=int(G), response=_R(), user=SimpleNamespace(id=5))
    _rodar(Baus.baus_hoje.callback(cog, inter))
    campos = {c.name: c.value for c in enviados[0]["embed"].fields}
    assert "3" in campos["🗝️ Suas Chaves do Jardim"]
