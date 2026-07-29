"""executar_troca_bidirecional ignorava o retorno de db.remover_bau no lado
baú de uma troca mista (item x baú). A checagem inicial (contar_bau) e a
remoção de fato podiam discordar numa corrida: o await real de
Inventario.tirar() no lado item dá tempo de sobra pra outra troca esvaziar
o baú do meio do caminho. Sem checar o retorno, a troca seguia em frente,
entregava o item do outro lado e nunca devolvia nada — duplicando o baú
quando ele reaparecesse em outro lugar e sumindo com o item entregue.
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
    def __init__(self, *, pares=None, inventarios_locais=None, baus=None):
        self.pares = pares or {}
        self.inventarios_locais = inventarios_locais or {}
        self.cofres = {}
        self.baus = baus or {}
        self.chamadas = []

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

    def contar_bau(self, g, u, ref):
        return self.baus.get((u, ref), 0)

    def remover_bau(self, g, u, ref, qtd=1):
        """Mesmo comportamento do core/db.py real: UPDATE guardado, devolve
        False sem levantar se não há quantidade suficiente."""
        atual = self.baus.get((u, ref), 0)
        if atual < qtd:
            return False
        self.baus[(u, ref)] = atual - qtd
        self.chamadas.append(("remover_bau", u, ref, qtd))
        return True

    def add_bau(self, g, u, ref, qtd=1):
        self.baus[(u, ref)] = self.baus.get((u, ref), 0) + qtd
        self.chamadas.append(("add_bau", u, ref, qtd))


class _Platform:
    def __init__(self, db):
        self.db = db

    async def deposit_vault(self, *, discord_user_id, items, **kwargs):
        u = str(discord_user_id)
        for item in items:
            self.db.cofres.setdefault(u, []).append(
                {"item_id": item["item_id"], "titulo": item["titulo"], "quantidade": item["quantidade"], "dados": item.get("dados", {})}
            )
        return {"repetido": False}

    async def withdraw_vault(self, *, discord_user_id, items, **kwargs):
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


def test_trocar_bidirecional_bau_sem_estoque_de_verdade_reverte_sem_duplicar():
    """A oferece um item (cofre), B oferece um baú que só existia na hora da
    checagem inicial mas já foi consumido por outra troca antes da remoção
    de fato. A retirada do item de A (que envolve um await real) já
    aconteceu quando isso é descoberto: o item precisa voltar pra A, e o
    baú de B não pode ser tratado como se tivesse saído."""
    db = _DB(pares={"333000444": {"usuario_id": "ua", "campanha_id": "c"}})
    db.cofres["333000444"] = [{"item_id": "orbe", "titulo": "Orbe", "quantidade": 1, "dados": {}}]
    db.baus[("444000555", "geral-comum")] = 1

    # Simula a corrida: no instante em que remover_bau roda de verdade
    # (depois do await de tirar() no lado item), o baú já foi consumido
    # por outra troca concorrente.
    original_remover = db.remover_bau

    def remover_ja_vazio(g, u, ref, qtd=1):
        db.baus[(u, ref)] = 0
        return original_remover(g, u, ref, qtd)

    db.remover_bau = remover_ja_vazio
    cog = Trocas(_bot(db))

    ok, msg = _rodar(
        cog.executar_troca_bidirecional(
            "555000111", "333000444", "444000555",
            "item", "orbe", "Orbe", "bau", "geral-comum", "Baú Geral (Comum)",
            chave="teste-bau-corrida-0001",
        )
    )

    assert not ok
    assert "baú" in msg
    # O orbe voltou pro cofre de A: nada ficou "no ar".
    total_a = sum(i["quantidade"] for i in db.cofres.get("333000444", []) if i["item_id"] == "orbe")
    assert total_a == 1
    # Nenhum baú foi creditado a A: a remoção nunca teve sucesso de fato.
    assert not any(c[0] == "add_bau" for c in db.chamadas)


def test_trocar_bidirecional_bau_com_estoque_funciona_normalmente():
    db = _DB(pares={"333000444": {"usuario_id": "ua", "campanha_id": "c"}})
    db.cofres["333000444"] = [{"item_id": "orbe", "titulo": "Orbe", "quantidade": 1, "dados": {}}]
    db.baus[("444000555", "geral-comum")] = 1
    cog = Trocas(_bot(db))

    ok, msg = _rodar(
        cog.executar_troca_bidirecional(
            "555000111", "333000444", "444000555",
            "item", "orbe", "Orbe", "bau", "geral-comum", "Baú Geral (Comum)",
            chave="teste-bau-ok-0001",
        )
    )

    assert ok, msg
    assert db.baus.get(("444000555", "geral-comum"), 0) == 0
    assert db.baus.get(("333000444", "geral-comum"), 0) == 1
    assert any(i["item_id"] == "orbe" for i in db.inventarios_locais.get("444000555", []))


if __name__ == "__main__":
    import pytest

    raise SystemExit(pytest.main([__file__, "-v"]))
