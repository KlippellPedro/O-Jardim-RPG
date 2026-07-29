"""/resetjogador e /catalogo_republicar ganharam confirmação: antes
executavam a ação destrutiva assim que o mestre apertava Enter no comando,
sem chance de desistir de um clique errado.

/resetar_tudo (o mesmo, mas pro servidor inteiro) ganhou uma segunda trava:
além do botão, o mestre precisa digitar a frase de confirmação exata no
próprio comando — é mais fácil apertar Enter num slash command sem reparar
no que tem depois do nome do que clicar num botão sem querer."""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE))

from cogs.admin import CONFIRMACAO_RESET_TUDO, Admin, ConfirmarView
from core.inventario import Inventario


class _Resposta:
    def __init__(self):
        self.mensagens = []
        self.view_capturada = None

    async def send_message(self, *args, **kwargs):
        self.mensagens.append((args, kwargs))
        self.view_capturada = kwargs.get("view")


class _Interacao:
    def __init__(self, user_id=1):
        self.guild_id = 555000111
        self.user = type("Usuario", (), {"id": user_id, "display_name": "Mestre", "mention": f"<@{user_id}>"})()
        self.response = _Resposta()
        self.edicoes = []

    async def edit_original_response(self, **kwargs):
        self.edicoes.append(kwargs)


class _Membro:
    id = 777000222
    mention = "<@777000222>"


class _DB:
    def __init__(self):
        self.par = None
        self.chamadas = []

    def par_cofre_plataforma(self, guild_id, user_id):
        return self.par

    def resetar_jogador(self, guild_id, user_id):
        self.chamadas.append(("resetar_jogador", guild_id, user_id))

    def resetar_economia_guild(self, guild_id):
        self.chamadas.append(("resetar_economia_guild", guild_id))
        return {
            "carteira": 4, "inventario": 2, "cofre_saldo": 4, "baus_estoque": 1,
            "divida_cartao": 1, "loteria_bilhetes": 1, "investimentos": 1, "emprestimos": 1,
            "leiloes_cancelados": 1, "cofre_plataforma_itens": 0, "cofre_plataforma_saldos": 0,
            "cofre_plataforma_reservas": 0,
        }


def _admin(db):
    bot = type("Bot", (), {"db": db, "platform": None, "catalogo": None, "inventario": None})()
    bot.inventario = Inventario(bot)
    return Admin(bot)


def _rodar(coro):
    return asyncio.run(coro)


def test_confirmarview_comeca_sem_decisao():
    view = ConfirmarView(autor_id=1)
    assert view.confirmado is None
    assert len(view.children) == 2  # Confirmar + Cancelar


def test_resetjogador_cancelado_nao_mexe_em_nada():
    db = _DB()
    admin = _admin(db)
    interacao = _Interacao()

    async def cenario():
        tarefa = asyncio.ensure_future(admin.resetjogador.callback(admin, interacao, _Membro()))
        await asyncio.sleep(0)  # deixa a corrotina rodar até o send_message
        view = interacao.response.view_capturada
        assert isinstance(view, ConfirmarView)
        view.confirmado = False
        view.stop()
        await tarefa

    _rodar(cenario())

    assert not db.chamadas
    assert "cancelado" in interacao.edicoes[0]["content"].lower()


def test_resetjogador_confirmado_reseta():
    db = _DB()
    admin = _admin(db)
    interacao = _Interacao()

    async def cenario():
        tarefa = asyncio.ensure_future(admin.resetjogador.callback(admin, interacao, _Membro()))
        await asyncio.sleep(0)
        view = interacao.response.view_capturada
        view.confirmado = True
        view.stop()
        await tarefa

    _rodar(cenario())

    assert ("resetar_jogador", "555000111", "777000222") in db.chamadas
    assert "resetada" in interacao.edicoes[0]["content"].lower()


def test_resetar_tudo_com_frase_de_confirmacao_errada_nao_chama_nada():
    db = _DB()
    admin = _admin(db)
    interacao = _Interacao()

    _rodar(admin.resetar_tudo.callback(admin, interacao, "eu confirmo"))

    assert not db.chamadas
    assert not interacao.edicoes
    assert CONFIRMACAO_RESET_TUDO in interacao.response.mensagens[0][0][0]


def test_resetar_tudo_frase_certa_mas_cancelado_no_botao_nao_mexe_em_nada():
    db = _DB()
    admin = _admin(db)
    interacao = _Interacao()

    async def cenario():
        tarefa = asyncio.ensure_future(admin.resetar_tudo.callback(admin, interacao, CONFIRMACAO_RESET_TUDO))
        await asyncio.sleep(0)
        view = interacao.response.view_capturada
        assert isinstance(view, ConfirmarView)
        view.confirmado = False
        view.stop()
        await tarefa

    _rodar(cenario())

    assert not db.chamadas
    assert "cancelado" in interacao.edicoes[0]["content"].lower()


def test_resetar_tudo_frase_certa_e_confirmado_reseta_o_servidor_inteiro():
    db = _DB()
    admin = _admin(db)
    interacao = _Interacao()

    async def cenario():
        tarefa = asyncio.ensure_future(
            admin.resetar_tudo.callback(admin, interacao, f"  {CONFIRMACAO_RESET_TUDO.lower()}  ")
        )
        await asyncio.sleep(0)
        view = interacao.response.view_capturada
        view.confirmado = True
        view.stop()
        await tarefa

    _rodar(cenario())

    assert ("resetar_economia_guild", "555000111") in db.chamadas
    resumo = interacao.edicoes[0]["content"]
    assert "resetada" in resumo.lower()
    assert "4 carteira" in resumo


if __name__ == "__main__":
    import pytest

    raise SystemExit(pytest.main([__file__, "-v"]))
