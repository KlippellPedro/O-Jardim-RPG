"""Base dos painéis (core/painel.py, idêntico no Banqueiro e no Jornalista).

Este arquivo também é idêntico nos dois bots."""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path
from types import SimpleNamespace

import discord

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE))

import pytest

from core.painel import (
    Acao, InteracaoPainel, ModalQuantia, PainelView, Secao, chamar_comando,
)


# ── interação falsa de componente ───────────────────────────────────────────
class _Resposta:
    def __init__(self, interacao):
        self._i = interacao
        self._feito = False

    def is_done(self):
        return self._feito

    async def defer(self, **kw):
        self._feito = True
        self._i.eventos.append(("defer", kw))

    async def edit_message(self, **kw):
        self._feito = True
        self._i.eventos.append(("edit_message", kw))

    async def send_message(self, *a, **kw):
        self._feito = True
        self._i.eventos.append(("send_message", a, kw))

    async def send_modal(self, modal):
        self._feito = True
        self._i.eventos.append(("send_modal", modal))


class _Followup:
    def __init__(self, interacao):
        self._i = interacao

    async def send(self, *a, **kw):
        self._i.eventos.append(("followup", a, kw))


class _Inter:
    def __init__(self, uid=1, valores=None):
        self.eventos = []
        self.user = SimpleNamespace(id=uid, display_name="Lina")
        self.guild_id = 100
        self.response = _Resposta(self)
        self.followup = _Followup(self)
        self.data = {"values": valores or []}

    async def edit_original_response(self, **kw):
        self.eventos.append(("edit_original", kw))


def _emb(texto):
    return discord.Embed(description=texto)


def _rodar(coro):
    return asyncio.run(coro)


def _painel(secoes, acoes=(), inicio_texto="início"):
    async def inicio(_interacao):
        return _emb(inicio_texto)

    return PainelView(autor_id=1, secoes=secoes, inicio=inicio, acoes=acoes)


def _secao(chave, executar):
    return Secao(chave, chave.title(), "📌", f"tela {chave}", executar)


def _ultimo(inter, tipo):
    return [e for e in inter.eventos if e[0] == tipo][-1]


# ── validações ──────────────────────────────────────────────────────────────
def test_o_menu_aceita_de_1_a_25_secoes_sem_repetir_e_ate_3_acoes():
    async def nada(_ctx):
        pass

    async def acao(_i):
        pass

    with pytest.raises(ValueError):
        _painel([])
    with pytest.raises(ValueError):
        _painel([_secao(f"s{i}", nada) for i in range(26)])
    with pytest.raises(ValueError):
        _painel([_secao("a", nada), _secao("a", nada)])
    with pytest.raises(ValueError):
        _painel([_secao("a", nada)], acoes=[Acao(str(i), "🔹", acao) for i in range(4)])
    assert _painel([_secao(f"s{i}", nada) for i in range(25)], acoes=[Acao("x", "🔹", acao)] * 3)


# ── abrir e navegar ─────────────────────────────────────────────────────────
def test_abrir_confirma_o_comando_e_envia_o_inicio_em_privado():
    async def nada(_ctx):
        pass

    view = _painel([_secao("a", nada)])
    inter = _Inter()
    _rodar(view.abrir(inter))
    assert inter.eventos[0] == ("defer", {"ephemeral": True})
    _, args, kw = _ultimo(inter, "followup")
    assert kw["ephemeral"] is True and kw["view"] is view and kw["embed"].description == "início"


def test_secao_que_envia_mensagem_vira_edicao_do_painel():
    async def tela(ctx):
        await ctx.response.send_message(embed=_emb("conteúdo da tela"), ephemeral=False)

    view = _painel([_secao("a", tela)])
    inter = _Inter(valores=["a"])
    _rodar(view._ao_escolher(inter))
    assert inter.eventos[0][0] == "defer"  # confirma o clique antes de qualquer coisa
    assert not any(e[0] in ("send_message", "followup") for e in inter.eventos)
    _, kw = _ultimo(inter, "edit_original")
    assert kw["embed"].description == "conteúdo da tela" and kw["view"] is view
    assert [o.default for o in view.menu.options] == [True]  # a seção atual fica marcada


def test_secao_que_usa_followup_depois_de_deferir_tambem_edita_o_painel():
    async def tela(ctx):
        await ctx.response.defer(ephemeral=True)
        await ctx.followup.send(embed=_emb("via followup"), ephemeral=True)

    view = _painel([_secao("a", tela)])
    inter = _Inter(valores=["a"])
    _rodar(view._ao_escolher(inter))
    assert not any(e[0] == "followup" for e in inter.eventos)
    assert _ultimo(inter, "edit_original")[1]["embed"].description == "via followup"


def test_segunda_mensagem_da_mesma_secao_vai_como_mensagem_nova_privada():
    async def tela(ctx):
        await ctx.response.send_message(embed=_emb("primeira"))
        await ctx.followup.send(embed=_emb("segunda"), ephemeral=False)

    view = _painel([_secao("a", tela)])
    inter = _Inter(valores=["a"])
    _rodar(view._ao_escolher(inter))
    assert _ultimo(inter, "edit_original")[1]["embed"].description == "primeira"
    _, _, kw = _ultimo(inter, "followup")
    assert kw["ephemeral"] is True and kw["embed"].description == "segunda"


def test_o_callback_ve_a_interacao_real_por_tras_do_proxy():
    visto = {}

    async def tela(ctx):
        visto.update(user=ctx.user.id, guild=ctx.guild_id, feito=ctx.response.is_done())
        await ctx.response.send_message("texto simples")

    view = _painel([_secao("a", tela)])
    inter = _Inter(valores=["a"])
    _rodar(view._ao_escolher(inter))
    assert visto == {"user": 1, "guild": 100, "feito": True}  # já deferido: comandos usam o caminho do followup
    kw = _ultimo(inter, "edit_original")[1]
    assert kw["content"] == "texto simples" and kw["embed"] is None


def test_tela_com_view_propria_ganha_um_botao_de_inicio():
    class _Paginador(discord.ui.View):
        pass

    async def tela(ctx):
        await ctx.response.send_message(embed=_emb("paginada"), view=_Paginador())

    view = _painel([_secao("a", tela)])
    inter = _Inter(valores=["a"])
    _rodar(view._ao_escolher(inter))
    mostrada = _ultimo(inter, "edit_original")[1]["view"]
    assert isinstance(mostrada, _Paginador) and mostrada is not view
    assert [b.label for b in mostrada.children] == ["Início"]


def test_secao_que_falha_mostra_erro_amigavel_e_mantem_o_painel():
    async def tela(_ctx):
        raise RuntimeError("quebrou")

    view = _painel([_secao("a", tela)])
    inter = _Inter(valores=["a"])
    _rodar(view._ao_escolher(inter))
    kw = _ultimo(inter, "edit_original")[1]
    assert "Algo deu errado" in kw["embed"].description and kw["view"] is view


def test_secao_que_nao_responde_nada_devolve_o_painel_em_vez_de_travar():
    async def tela(_ctx):
        return

    view = _painel([_secao("a", tela)])
    inter = _Inter(valores=["a"])
    _rodar(view._ao_escolher(inter))
    assert "Nada para mostrar" in _ultimo(inter, "edit_original")[1]["embed"].description


def test_inicio_e_atualizar():
    chamadas = []

    async def tela(ctx):
        chamadas.append("tela")
        await ctx.response.send_message(embed=_emb("t"))

    view = _painel([_secao("a", tela)], inicio_texto="home")
    inter = _Inter(valores=["a"])
    _rodar(view._ao_escolher(inter))
    inter2 = _Inter()
    _rodar(view._atualizar(inter2))  # atualiza a seção aberta
    assert chamadas == ["tela", "tela"]
    inter3 = _Inter()
    _rodar(view.ir_para_inicio(inter3))
    assert view.atual is None and _ultimo(inter3, "edit_original")[1]["embed"].description == "home"
    assert [o.default for o in view.menu.options] == [False]
    inter4 = _Inter()
    _rodar(view._atualizar(inter4))  # sem seção aberta: volta ao início
    assert _ultimo(inter4, "edit_original")[1]["embed"].description == "home"


def test_so_o_dono_do_painel_usa_os_botoes():
    async def nada(_ctx):
        pass

    view = _painel([_secao("a", nada)])
    estranho = _Inter(uid=2)
    assert _rodar(view.interaction_check(estranho)) is False
    assert "outra pessoa" in _ultimo(estranho, "send_message")[1][0]
    assert _rodar(view.interaction_check(_Inter(uid=1))) is True


def test_acao_rapida_recebe_a_interacao_real_para_abrir_modal():
    recebido = []

    async def acao(inter):
        recebido.append(inter)
        await inter.response.send_modal("modal")

    view = _painel([_secao("a", lambda c: None)], acoes=[Acao("Guardar", "💰", acao)])
    botao = [b for b in view.children if getattr(b, "label", "") == "Guardar"][0]
    inter = _Inter()
    _rodar(botao.callback(inter))
    assert recebido == [inter] and _ultimo(inter, "send_modal")[1] == "modal"


# ── modal de quantidade ─────────────────────────────────────────────────────
def test_modal_de_quantidade_valida_e_entrega_o_numero():
    recebidos = []

    async def enviado(inter, valor):
        recebidos.append(valor)

    def submeter(modal, texto):
        modal.quantia._value = texto  # TextInput guarda o valor enviado em _value
        inter = _Inter()
        _rodar(modal.on_submit(inter))
        return inter

    modal = ModalQuantia("Título", "Quantos?", enviado, minimo=1, maximo=100)
    assert "Informe só números" in _ultimo(submeter(modal, "abc"), "send_message")[1][0]
    assert "de 1 a 100" in _ultimo(submeter(modal, "101"), "send_message")[1][0]
    assert "de 1 a 100" in _ultimo(submeter(modal, "0"), "send_message")[1][0]
    assert recebidos == []
    submeter(modal, " 7 ")
    assert recebidos == [7]
    sem_teto = ModalQuantia("Título", "Quantos?", enviado)
    assert "a partir de 1" in _ultimo(submeter(sem_teto, "0"), "send_message")[1][0]
    submeter(sem_teto, "1.250")  # separador de milhar é aceito
    assert recebidos == [7, 1250]


def test_cada_modal_tem_o_proprio_rotulo():
    async def enviado(inter, valor):
        pass

    a = ModalQuantia("Guardar", "Quantos Lunaris guardar?", enviado)
    b = ModalQuantia("Sacar", "Quantos Lunaris sacar?", enviado)
    assert a.children[0].text == "Quantos Lunaris guardar?"
    assert b.children[0].text == "Quantos Lunaris sacar?"
    assert a.quantia is not b.quantia


# ── chamar_comando ──────────────────────────────────────────────────────────
def test_chamar_comando_resolve_comando_simples_e_subcomando_de_grupo():
    chamadas = []

    class _Cog:
        pass

    cog = _Cog()

    async def simples(self, inter, **kw):
        chamadas.append(("simples", self is cog, kw))

    async def filho(self, inter):
        chamadas.append(("filho", self is cog))

    sem_binding = SimpleNamespace(binding=None, callback=None)

    async def solto(inter):
        chamadas.append(("solto",))

    sem_binding.callback = solto
    grupo = SimpleNamespace(get_command=lambda nome: SimpleNamespace(binding=cog, callback=filho) if nome == "abrir" else None)
    comandos = {
        "carteira": SimpleNamespace(binding=cog, callback=simples),
        "cassino": grupo,
        "avulso": sem_binding,
    }
    bot = SimpleNamespace(tree=SimpleNamespace(get_command=lambda nome: comandos.get(nome)))

    _rodar(chamar_comando(bot, "carteira", object(), quantia=5))
    _rodar(chamar_comando(bot, "cassino abrir", object()))
    _rodar(chamar_comando(bot, "avulso", object()))
    assert chamadas == [("simples", True, {"quantia": 5}), ("filho", True), ("solto",)]
    with pytest.raises(LookupError):
        _rodar(chamar_comando(bot, "nao_existe", object()))
    with pytest.raises(LookupError):
        _rodar(chamar_comando(bot, "cassino nao_existe", object()))
