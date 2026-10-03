"""Doleiro do mercado negro: vende item e recebe Créditos Sombrios (sem câmbio de volta).

A lavanderia acabou: Créditos Sombrios não viram Lunaris nem Solares. Quem ainda
tinha Créditos lavando recebe tudo de volta na migração do banco.
"""
import asyncio
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from cogs.mercado_negro import MercadoNegro, VenderAoDoleiroView
from core import db as db_modulo
from core import economia
from core.catalogo import Catalogo
from core.inventario import ItemIndisponivel, ItemPossuido
from tests.db_utils import novo_db

CATALOGO = Catalogo()
CATALOGO.carregar_arquivo(str(__import__("pathlib").Path(__file__).resolve().parents[3] / "data" / "loja" / "catalogo.json"))
ITEM = next(i for i in CATALOGO.listar() if i.tipo == "equipamento" and economia.valor_em_solares(i.conteudo.get("preco")) and economia.valor_em_solares(i.conteudo.get("preco")) >= 10)


def _interacao(user_id=7):
    return SimpleNamespace(
        id=1234, guild_id=1, user=SimpleNamespace(id=user_id),
        response=SimpleNamespace(send_message=AsyncMock(), edit_message=AsyncMock()),
    )


class _Inventario:
    def __init__(self, itens, falha_ao_tirar=None):
        self.itens = {p.item_id: p for p in itens}
        self.tirados = []
        self.devolvidos = []
        self.falha_ao_tirar = falha_ao_tirar

    async def listar(self, sid, uid):
        return list(self.itens.values())

    async def tirar(self, sid, uid, item_id, quantidade=1, *, motivo, chave):
        if self.falha_ao_tirar:
            raise self.falha_ao_tirar
        self.tirados.append((item_id, quantidade, chave))
        return self.itens[item_id]

    async def dar(self, sid, uid, item_id, titulo, tipo, quantidade=1, dados=None, *, motivo, chave):
        self.devolvidos.append((item_id, quantidade))
        return "legado"


def _cog(db, inventario):
    return MercadoNegro(SimpleNamespace(db=db, inventario=inventario, catalogo=CATALOGO))


def _posse(quantidade=3):
    return ItemPossuido(ITEM.id, ITEM.titulo, ITEM.tipo, quantidade)


def test_receber_do_doleiro_credita_e_grava_extrato():
    db = novo_db()
    assert db.receber_do_doleiro("1", "7", 25, "Mercado Negro: venda de teste") == 25
    assert db.get_saldo("1", "7", "Créditos Sombrios") == 25
    with db._conn() as con:
        linhas = con.execute("SELECT delta, moeda FROM extrato WHERE guild_id='1' AND user_id='7'").fetchall()
    assert [(l["delta"], l["moeda"]) for l in linhas] == [(25, "Créditos Sombrios")]
    with pytest.raises(ValueError):
        db.receber_do_doleiro("1", "7", 0, "nada")


def test_a_venda_mostra_a_oferta_e_so_fecha_depois_do_aceite():
    db = novo_db()
    inventario = _Inventario([_posse()])
    interacao = _interacao()
    asyncio.run(MercadoNegro.mercado_negro_vender.callback(_cog(db, inventario), interacao, ITEM.id, 2))
    interacao.response.send_message.assert_awaited_once()
    view = interacao.response.send_message.await_args.kwargs["view"]
    assert isinstance(view, VenderAoDoleiroView) and view.creditos >= 1
    # Nada saiu do inventário nem entrou na carteira antes do aceite.
    assert inventario.tirados == [] and db.get_saldo("1", "7", "Créditos Sombrios") == 0

    clique = _interacao()
    asyncio.run(view.aceitar.callback(clique))
    assert inventario.tirados[0][:2] == (ITEM.id, 2)
    assert db.get_saldo("1", "7", "Créditos Sombrios") == view.creditos
    # O mesmo botão não paga duas vezes.
    asyncio.run(view.aceitar.callback(_interacao()))
    assert len(inventario.tirados) == 1
    assert db.get_saldo("1", "7", "Créditos Sombrios") == view.creditos


def test_outro_jogador_nao_fecha_o_negocio_alheio():
    db = novo_db()
    inventario = _Inventario([_posse()])
    interacao = _interacao()
    asyncio.run(MercadoNegro.mercado_negro_vender.callback(_cog(db, inventario), interacao, ITEM.id, 1))
    view = interacao.response.send_message.await_args.kwargs["view"]
    asyncio.run(view.aceitar.callback(_interacao(user_id=99)))
    assert inventario.tirados == [] and db.get_saldo("1", "7", "Créditos Sombrios") == 0


def test_sem_a_quantidade_ou_com_item_que_nao_se_compra_nao_ha_oferta():
    db = novo_db()
    inventario = _Inventario([_posse(1)])
    interacao = _interacao()
    asyncio.run(MercadoNegro.mercado_negro_vender.callback(_cog(db, inventario), interacao, ITEM.id, 5))
    assert "não tem essa quantidade" in interacao.response.send_message.await_args.args[0]
    monstro = next(i for i in CATALOGO.listar() if i.tipo == "monstro")
    inventario = _Inventario([ItemPossuido(monstro.id, monstro.titulo, "monstro", 1)])
    interacao = _interacao()
    asyncio.run(MercadoNegro.mercado_negro_vender.callback(_cog(db, inventario), interacao, monstro.id, 1))
    assert "não compra" in interacao.response.send_message.await_args.args[0]


def test_item_que_sumiu_antes_do_aceite_nao_gera_credito():
    db = novo_db()
    inventario = _Inventario([_posse()], falha_ao_tirar=ItemIndisponivel(ITEM.id))
    interacao = _interacao()
    asyncio.run(MercadoNegro.mercado_negro_vender.callback(_cog(db, inventario), interacao, ITEM.id, 1))
    view = interacao.response.send_message.await_args.kwargs["view"]
    asyncio.run(view.aceitar.callback(_interacao()))
    assert db.get_saldo("1", "7", "Créditos Sombrios") == 0


def test_se_o_pagamento_falha_o_item_volta_para_o_jogador():
    db = novo_db()
    inventario = _Inventario([_posse()])
    interacao = _interacao()
    asyncio.run(MercadoNegro.mercado_negro_vender.callback(_cog(db, inventario), interacao, ITEM.id, 1))
    view = interacao.response.send_message.await_args.kwargs["view"]

    def _quebra(*args, **kwargs):
        raise RuntimeError("banco indisponível")

    db.receber_do_doleiro = _quebra
    asyncio.run(view.aceitar.callback(_interacao()))
    assert inventario.devolvidos == [(ITEM.id, 1)]


def test_lavanderia_encerrada_devolve_os_creditos_que_estavam_lavando():
    db = novo_db()
    with db._conn() as con:
        con.execute(
            "INSERT INTO lavagem_dinheiro (guild_id, user_id, quantia, pronto_em) VALUES ('1', '7', 120, now()), ('1', '8', 40, now())"
        )
    db.creditar("1", "7", "Créditos Sombrios", 5)
    devolve = next(s for s in db_modulo._SCHEMA if "Lavanderia encerrada" in s)
    with db._conn() as con:
        con.execute(devolve)
        con.execute(devolve)  # segunda vez é no-op
        restantes = con.execute("SELECT count(*) AS n FROM lavagem_dinheiro").fetchone()["n"]
    assert restantes == 0
    assert db.get_saldo("1", "7", "Créditos Sombrios") == 125
    assert db.get_saldo("1", "8", "Créditos Sombrios") == 40
    with db._conn() as con:
        extrato = con.execute("SELECT user_id, delta FROM extrato WHERE descricao LIKE 'Lavanderia encerrada%' ORDER BY user_id").fetchall()
    assert [(e["user_id"], e["delta"]) for e in extrato] == [("7", 120), ("8", 40)]
