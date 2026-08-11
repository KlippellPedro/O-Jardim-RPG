"""/oferecer e /trocar em modo "cofre" (conta vinculada à plataforma):
regressão central da Fase 2: antes, um item comprado com a integração
ligada ficava invisível pra estes dois comandos (liam só a tabela local).

Usa fakes (não Postgres real) porque o foco aqui é a MISTURA de modos entre
os dois participantes: algo tedioso de montar via banco real e que os
testes em test_trocas.py (Postgres, modo legado puro) já não cobrem.
"""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE))

from cogs.trocas import Trocas
from core.inventario import Inventario
from core.platform_api import PlatformApiError


class _DB:
    def __init__(self, *, pares=None, saldos=None, inventarios_locais=None, baus=None):
        self.pares = pares or {}  # user_id -> {"usuario_id":..., "campanha_id":...} ou ausente = legado
        self.saldos = saldos or {}  # (guild, user, moeda) -> int
        self.inventarios_locais = inventarios_locais or {}  # user_id -> [ {item_id, titulo, tipo, quantidade} ]
        self.cofres = {}  # user_id -> [ {item_id, titulo, quantidade, dados} ]
        self.baus = baus or {}
        self.chamadas = []
        self.custodias = {}

    def garantir_jogador(self, g, u):
        pass

    def par_cofre_plataforma(self, g, u):
        return self.pares.get(u)

    def get_cofre_tier(self, g, u):
        return "comum"

    def listar_cofre_plataforma(self, g, u):
        return list(self.cofres.get(u, []))

    def contar_cofre_plataforma(self, g, u):
        return sum(i["quantidade"] for i in self.cofres.get(u, []))

    def listar_inventario(self, g, u):
        return list(self.inventarios_locais.get(u, []))

    def contar_itens(self, g, u):
        return sum(i["quantidade"] for i in self.inventarios_locais.get(u, []))

    def add_item(self, g, u, item_id, titulo, tipo, qtd=1):
        self.chamadas.append(("add_item", u, item_id, qtd))
        self.inventarios_locais.setdefault(u, []).append(
            {"item_id": item_id, "titulo": titulo, "tipo": tipo, "quantidade": qtd}
        )

    def remover_item(self, g, u, item_id, qtd=1):
        for i in self.inventarios_locais.get(u, []):
            if i["item_id"] == item_id and i["quantidade"] >= qtd:
                i["quantidade"] -= qtd
                self.chamadas.append(("remover_item", u, item_id, qtd))
                return True
        return False

    def get_saldo(self, g, u, moeda):
        return self.saldos.get((g, u, moeda), 0)

    def debitar(self, g, u, moeda, quantia):
        saldo = self.get_saldo(g, u, moeda)
        if saldo < quantia:
            from core.db import SaldoInsuficiente
            raise SaldoInsuficiente(f"Você só tem {saldo} {moeda}.")
        self.saldos[(g, u, moeda)] = saldo - quantia
        self.chamadas.append(("debitar", u, moeda, quantia))

    def creditar(self, g, u, moeda, quantia):
        self.saldos[(g, u, moeda)] = self.get_saldo(g, u, moeda) + quantia
        self.chamadas.append(("creditar", u, moeda, quantia))

    def registrar_extrato(self, *a, **k):
        pass

    def reservar_custodia_moeda(self, chave, g, u, moeda, quantia, descricao):
        self.debitar(g, u, moeda, quantia)
        self.custodias[chave] = (g, u, moeda, quantia)
        return {"chave": chave, "quantia": quantia}

    def devolver_custodia_moeda(self, chave, descricao):
        custodia = self.custodias.pop(chave, None)
        if custodia is None:
            return None
        g, u, moeda, quantia = custodia
        self.creditar(g, u, moeda, quantia)
        return {"chave": chave, "quantia": quantia}

    def transferir_custodia_moeda(self, chave, destino, descricao):
        custodia = self.custodias.pop(chave, None)
        if custodia is None:
            return None
        g, _u, moeda, quantia = custodia
        self.creditar(g, destino, moeda, quantia)
        return {"chave": chave, "quantia": quantia}

    def listar_baus_estoque(self, g, u):
        return []

    def contar_bau(self, g, u, ref):
        return self.baus.get((u, ref), 0)

    def remover_bau(self, g, u, ref, qtd=1):
        self.baus[(u, ref)] = self.baus.get((u, ref), 0) - qtd

    def add_bau(self, g, u, ref, qtd=1):
        self.baus[(u, ref)] = self.baus.get((u, ref), 0) + qtd


class _Platform:
    def __init__(self, db):
        self.db = db
        self.chamadas = []

    async def deposit_vault(self, *, discord_user_id, items, **kwargs):
        self.chamadas.append(("deposit_vault", discord_user_id))
        u = str(discord_user_id)
        for item in items:
            self.db.cofres.setdefault(u, []).append(
                {"item_id": item["item_id"], "titulo": item["titulo"], "quantidade": item["quantidade"], "dados": item.get("dados", {})}
            )
        return {"repetido": False}

    async def withdraw_vault(self, *, discord_user_id, items, **kwargs):
        self.chamadas.append(("withdraw_vault", discord_user_id))
        u = str(discord_user_id)
        item_id, qtd = items[0]["item_id"], items[0]["quantidade"]
        cofre = self.db.cofres.setdefault(u, [])
        for entrada in cofre:
            if entrada["item_id"] == item_id and entrada["quantidade"] >= qtd:
                entrada["quantidade"] -= qtd
                return {"repetido": False, "itens": [{"item_id": item_id, "titulo": entrada["titulo"], "quantidade": qtd, "dados": entrada.get("dados", {})}]}
        raise PlatformApiError("sem quantidade", status_code=409, code="quantidade_indisponivel")


def _bot(db):
    bot = type("Bot", (), {"db": db, "platform": None, "catalogo": None, "inventario": None})()
    bot.platform = _Platform(db)
    bot.inventario = Inventario(bot)
    return bot


def _rodar(coro):
    return asyncio.run(coro)


# ── /oferecer (executar_troca) com o item no cofre ──────────────────────

def test_oferecer_um_item_que_esta_no_cofre_da_plataforma():
    """Este é o bug central: item comprado com a integração ligada ficava
    invisível pro /oferecer porque a checagem de posse só olhava a tabela
    local: agora usa Inventario.listar(), que enxerga os dois estoques."""
    db = _DB(
        pares={"111000222": {"usuario_id": "u1", "campanha_id": "c"}, "222000333": {"usuario_id": "u2", "campanha_id": "c"}},
        saldos={("555000111", "222000333", "Lunaris"): 100},
    )
    db.cofres["111000222"] = [{"item_id": "espada", "titulo": "Espada", "quantidade": 1, "dados": {"tipo": "arma"}}]
    cog = Trocas(_bot(db))

    ok, msg = _rodar(cog.executar_troca("555000111", "111000222", "222000333", "item", "espada", "Espada", 40, "Lunaris", chave="teste-cofre-0001"))

    assert ok, msg
    assert db.cofres["111000222"] == [] or db.cofres["111000222"][0]["quantidade"] == 0
    assert db.cofres["222000333"][0]["item_id"] == "espada"
    assert db.get_saldo("555000111", "222000333", "Lunaris") == 60
    assert db.get_saldo("555000111", "111000222", "Lunaris") == 40


def test_oferecer_estorna_o_dinheiro_se_o_item_sumiu_do_cofre():
    db = _DB(
        pares={"111000222": {"usuario_id": "u1", "campanha_id": "c"}, "222000333": {"usuario_id": "u2", "campanha_id": "c"}},
        saldos={("555000111", "222000333", "Lunaris"): 100},
    )
    # "111000222" NÃO tem mais o item no cofre no momento do aceite: mas a
    # checagem de posse acontece antes; simula a corrida vendendo o item
    # entre a checagem inicial e a execução não é trivial aqui, então
    # testamos o caminho onde withdraw_vault falha diretamente.
    db.cofres["111000222"] = []
    db.inventarios_locais.setdefault("111000222", []).append(
        {"item_id": "espada", "titulo": "Espada", "tipo": "arma", "quantidade": 1}
    )  # a pré-checagem via listar() olha o cofre (vazio) OU o legado:
    # como "111000222" está em modo cofre, listar() só olha o cofre: vazio.
    cog = Trocas(_bot(db))

    ok, msg = _rodar(cog.executar_troca("555000111", "111000222", "222000333", "item", "espada", "Espada", 40, "Lunaris", chave="teste-falha-0001"))

    assert not ok
    assert db.get_saldo("555000111", "222000333", "Lunaris") == 100  # nada foi cobrado


# ── /trocar (bidirecional) misturando modos ─────────────────────────────

def test_trocar_bidirecional_um_no_cofre_outro_legado():
    """Caso misto: A vinculado (item no cofre), B não vinculado (item na
    tabela local). tirar()+dar() cobre isso porque decide o modo de cada
    participante de forma independente."""
    db = _DB(pares={"333000444": {"usuario_id": "ua", "campanha_id": "c"}})  # "444000555" não tem par -> legado
    db.cofres["333000444"] = [{"item_id": "orbe", "titulo": "Orbe", "quantidade": 1, "dados": {"tipo": "artefato"}}]
    db.inventarios_locais["444000555"] = [{"item_id": "adaga", "titulo": "Adaga", "tipo": "arma", "quantidade": 1}]
    cog = Trocas(_bot(db))

    ok, msg = _rodar(
        cog.executar_troca_bidirecional(
            "555000111", "333000444", "444000555", "item", "orbe", "Orbe", "item", "adaga", "Adaga", chave="teste-misto-0001"
        )
    )

    assert ok, msg
    # A perdeu o orbe do cofre e ganhou a adaga (cai no legado dele, já que
    # dar() decide pelo modo do DESTINATÁRIO: A está em modo cofre, então
    # a adaga vai pro cofre de A).
    assert not any(i["item_id"] == "orbe" and i["quantidade"] > 0 for i in db.cofres.get("333000444", []))
    assert any(i["item_id"] == "adaga" for i in db.cofres.get("333000444", []))
    # B perdeu a adaga do inventário local e ganhou o orbe (local, já que B
    # está em modo legado).
    assert not any(i["item_id"] == "adaga" and i["quantidade"] > 0 for i in db.inventarios_locais.get("444000555", []))
    assert any(i["item_id"] == "orbe" for i in db.inventarios_locais.get("444000555", []))


def test_trocar_bidirecional_devolve_o_primeiro_item_se_o_segundo_falhar():
    """A tem o item, retirada de A funciona; B NÃO tem mais o item dele:
    a retirada de B falha. O item de A precisa voltar pra A."""
    db = _DB(pares={"333000444": {"usuario_id": "ua", "campanha_id": "c"}, "444000555": {"usuario_id": "ub", "campanha_id": "c"}})
    db.cofres["333000444"] = [{"item_id": "orbe", "titulo": "Orbe", "quantidade": 1, "dados": {}}]
    db.cofres["444000555"] = []  # B não tem o item combinado
    cog = Trocas(_bot(db))

    ok, msg = _rodar(
        cog.executar_troca_bidirecional(
            "555000111", "333000444", "444000555", "item", "orbe", "Orbe", "item", "adaga", "Adaga", chave="teste-devolve-0001"
        )
    )

    assert not ok
    # O orbe voltou pra A (retirado e devolvido), não ficou em lugar nenhum.
    total_a = sum(i["quantidade"] for i in db.cofres.get("333000444", []) if i["item_id"] == "orbe")
    assert total_a == 1
