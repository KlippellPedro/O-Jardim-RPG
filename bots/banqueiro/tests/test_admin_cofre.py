"""/daritem, /tirar_item e /resetjogador depois do cutover pra Inventario.

Regressão coberta: o mestre conseguia dar item pro cofre da plataforma
(/daritem) mas não tinha como tirar de lá (/tirar_item nunca falava com a
plataforma). E /resetjogador "resetava" só o estado local, deixando o cofre
da conta intocado sem avisar ninguém.
"""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE))

from cogs.admin import Admin
from core.catalogo import Item
from core.inventario import Inventario
from core.platform_api import PlatformApiError


class _Catalogo:
    def __init__(self, itens):
        self._itens = {i.id: i for i in itens}

    def get(self, item_id):
        return self._itens.get(item_id)


class _DB:
    def __init__(self, *, par=None, inventario_legado=None):
        self.par = par
        self.inventario_legado = list(inventario_legado or [])
        self.chamadas = []

    def par_cofre_plataforma(self, guild_id, user_id):
        return self.par

    def add_item(self, guild_id, user_id, item_id, titulo, tipo, qtd=1):
        self.chamadas.append(("add_item", item_id, qtd))
        self.inventario_legado.append({"item_id": item_id, "titulo": titulo, "tipo": tipo, "quantidade": qtd})

    def remover_item(self, guild_id, user_id, item_id, qtd=1):
        for i in self.inventario_legado:
            if i["item_id"] == item_id and i["quantidade"] >= qtd:
                i["quantidade"] -= qtd
                self.chamadas.append(("remover_item", item_id, qtd))
                return True
        return False

    def resetar_jogador(self, guild_id, user_id):
        self.chamadas.append(("resetar_jogador", guild_id, user_id))

    def listar_cofre_plataforma(self, guild_id, user_id):
        return list(self.inventario_legado)

    def contar_cofre_plataforma(self, guild_id, user_id):
        return sum(i["quantidade"] for i in self.inventario_legado)


class _Platform:
    def __init__(self):
        self.chamadas = []
        self.excecao = None

    async def deposit_vault(self, **kwargs):
        self.chamadas.append(("deposit_vault", kwargs))
        if self.excecao:
            raise self.excecao
        return {"repetido": False}

    async def withdraw_vault(self, **kwargs):
        self.chamadas.append(("withdraw_vault", kwargs))
        if self.excecao:
            raise self.excecao
        item = kwargs["items"][0]
        return {"repetido": False, "itens": [{"item_id": item["item_id"], "titulo": item["item_id"], "quantidade": item["quantidade"], "dados": {}}]}


class _Resposta:
    def __init__(self):
        self.mensagens = []

    async def defer(self, **kwargs):
        pass

    async def send_message(self, *args, **kwargs):
        self.mensagens.append((args, kwargs))
        view = kwargs.get("view")
        if view is not None and hasattr(view, "confirmado"):
            # Simula o clique em "Confirmar": sem isso, view.wait() trava
            # pelos 60s de timeout esperando uma interação que nunca vem.
            view.confirmado = True
            view.stop()


class _Followup:
    def __init__(self):
        self.mensagens = []

    async def send(self, *args, **kwargs):
        self.mensagens.append((args, kwargs))


class _Interacao:
    def __init__(self, interaction_id=555):
        self.id = interaction_id
        self.guild_id = 555000111
        self.user = type("Usuario", (), {"id": 1, "display_name": "Mestre"})()
        self.response = _Resposta()
        self.followup = _Followup()
        self.edicoes = []

    async def edit_original_response(self, **kwargs):
        self.edicoes.append(kwargs)


class _Membro:
    def __init__(self, id_=777000222):
        self.id = id_
        self.mention = f"<@{id_}>"


def _item_faca():
    return Item("arma", "faca", "Faca", {"raridade": "comum"})


def _admin(*, db, platform):
    bot = type("Bot", (), {"db": db, "platform": platform, "catalogo": _Catalogo([_item_faca()]), "inventario": None})()
    bot.inventario = Inventario(bot)
    return Admin(bot)


def _rodar(coro):
    return asyncio.run(coro)


# ── /daritem ─────────────────────────────────────────────────────────────

def test_daritem_em_modo_legado_grava_local():
    db = _DB(par=None)
    admin = _admin(db=db, platform=_Platform())

    _rodar(admin.daritem.callback(admin, _Interacao(), _Membro(), "faca", 2))

    assert ("add_item", "faca", 2) in db.chamadas


def test_daritem_em_modo_cofre_deposita_na_plataforma():
    plataforma = _Platform()
    db = _DB(par={"usuario_id": "u", "campanha_id": "c"})
    admin = _admin(db=db, platform=plataforma)

    _rodar(admin.daritem.callback(admin, _Interacao(), _Membro(), "faca", 1))

    assert plataforma.chamadas[0][0] == "deposit_vault"
    assert not db.chamadas


# ── /tirar_item ──────────────────────────────────────────────────────────

def test_tirar_item_em_modo_cofre_agora_fala_com_a_plataforma():
    """Regressão: antes nunca chamava a plataforma: o mestre não tinha como
    desfazer um /daritem entregue no cofre do site."""
    plataforma = _Platform()
    db = _DB(par={"usuario_id": "u", "campanha_id": "c"})
    admin = _admin(db=db, platform=plataforma)

    _rodar(admin.tirar_item.callback(admin, _Interacao(), _Membro(), "faca", 1))

    assert plataforma.chamadas[0][0] == "withdraw_vault"


def test_tirar_item_sem_o_item_avisa_sem_quebrar():
    plataforma = _Platform()
    plataforma.excecao = PlatformApiError("sem", status_code=409, code="quantidade_indisponivel")
    db = _DB(par={"usuario_id": "u", "campanha_id": "c"})
    admin = _admin(db=db, platform=plataforma)
    interacao = _Interacao()

    _rodar(admin.tirar_item.callback(admin, interacao, _Membro(), "faca", 1))

    (args, _kwargs) = interacao.followup.mensagens[0]
    assert "não tem" in args[0]


# ── /resetjogador ────────────────────────────────────────────────────────

def test_resetjogador_em_modo_legado_reseta_normalmente():
    db = _DB(par=None)
    admin = _admin(db=db, platform=_Platform())

    _rodar(admin.resetjogador.callback(admin, _Interacao(), _Membro()))

    assert any(c[0] == "resetar_jogador" for c in db.chamadas)


def test_resetjogador_em_modo_cofre_recusa_em_vez_de_fingir():
    """Regressão potencial: resetar só o estado local e dizer "resetado" com
    o cofre da conta ainda cheio seria uma mentira silenciosa."""
    db = _DB(par={"usuario_id": "u", "campanha_id": "c"})
    admin = _admin(db=db, platform=_Platform())
    interacao = _Interacao()

    _rodar(admin.resetjogador.callback(admin, interacao, _Membro()))

    assert not any(c[0] == "resetar_jogador" for c in db.chamadas)
    (args, _kwargs) = interacao.response.mensagens[0]
    assert "vinculada" in args[0]
