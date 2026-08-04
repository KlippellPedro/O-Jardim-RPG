"""Regressão: baú do Jornalista sumia do site quando o HTTP caía.

O fallback antigo pulava direto pro cofre local do Banqueiro assim que a API
recusava. Funciona pra não perder o prêmio, mas item em cofre local não
aparece na página do Cofre nem chega na ficha — pro jogador, o baú
simplesmente não existiu.

Como bot e plataforma dividem o mesmo PostgreSQL, agora existe um degrau no
meio: API → banco compartilhado → cofre local. O legado passa a ser só o que
sempre deveria ter sido: o caminho de quem não vinculou a conta.
"""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE))

from cogs.baus import Baus, serializar_premio_bau
from core.platform_api import PlatformApiError


def _pendente():
    return {
        "guild_id": "100",
        "mensagem_id": "321",
        "canal_id": "654",
        "vencedor_user_id": "42",
        "idempotencia": "bau-drop:321",
        "premio": serializar_premio_bau({
            "lunaris": 5,
            "itens": [{
                "id": "corda-de-escalada",
                "titulo": "Corda de Escalada",
                "tipo": "equipamento",
                "raridade": "comum",
                "conteudo": {"preco": 3},
                "quantidade": 1,
            }],
        }),
        "modo_entrega": "plataforma",
        "status": "pendente",
        "resultado": None,
    }


class _PlatformFora:
    async def deposit_vault(self, **kwargs):
        raise PlatformApiError("a plataforma demorou demais para responder")


class _DB:
    def __init__(self, *, vinculado=True):
        self.vinculado = vinculado
        self.depositos = []
        self.chamadas = []
        self.entregue = None

    def iniciar_tentativa_bau_entrega(self, guild_id, mensagem_id):
        return _pendente()

    def depositar_cofre_plataforma(self, guild_id, user_id, **kwargs):
        self.depositos.append({"guild_id": guild_id, "user_id": user_id, **kwargs})
        return {"repetido": False} if self.vinculado else None

    def marcar_bau_entrega_entregue(self, guild_id, mensagem_id, resultado, **kwargs):
        self.entregue = resultado

    def definir_modo_bau_entrega(self, guild_id, mensagem_id, modo_entrega):
        self.chamadas.append(("modo", modo_entrega))

    def entregar_bau_legado(self, guild_id, mensagem_id):
        self.chamadas.append(("legado", mensagem_id))
        return {"ganhos": ["☾ 5 Lunaris"], "destino": "carteira do Banqueiro", "confirmado": True}


def _entregar(db):
    cog = object.__new__(Baus)
    cog.bot = type("Bot", (), {"db": db, "platform": _PlatformFora()})()
    return asyncio.run(cog.processar_entrega(_pendente()))


def test_api_fora_grava_no_cofre_da_conta_e_nao_no_legado():
    db = _DB()

    resultado = _entregar(db)

    assert resultado["confirmado"] is True
    assert resultado["destino"] == "Lunaris na carteira · itens no cofre da conta no site"
    assert db.chamadas == []  # nenhum desvio pro legado
    assert len(db.depositos) == 1
    deposito = db.depositos[0]
    assert deposito["user_id"] == "42"
    assert deposito["moedas"] == []  # Lunaris de bau vai pra carteira local, nao pro cofre
    assert deposito["itens"][0]["item_id"] == "corda-de-escalada"
    # Mesma chave que o HTTP usou: se a API escreveu e só a resposta se
    # perdeu, o banco reconhece o movimento e não credita de novo.
    assert deposito["idempotencia"] == "bau-drop:321"


def test_conta_nao_vinculada_continua_caindo_pro_cofre_local():
    db = _DB(vinculado=False)

    resultado = _entregar(db)

    assert resultado["destino"] == "carteira do Banqueiro"
    assert ("modo", "legado") in db.chamadas
    assert ("legado", "321") in db.chamadas
