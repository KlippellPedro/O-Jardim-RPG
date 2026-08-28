from __future__ import annotations

import asyncio
from datetime import date

from cogs.cassino import Cassino, CassinoHubView, ConfirmarApostaView, VinteUmView
from tests.db_utils import novo_db


class _Response:
    def __init__(self):
        self.done = False
        self.deferred = []
        self.sent = []

    def is_done(self):
        return self.done

    async def defer(self, **kwargs):
        self.done = True
        self.deferred.append(kwargs)

    async def send_message(self, *args, **kwargs):
        self.done = True
        self.sent.append((args, kwargs))


class _Followup:
    def __init__(self):
        self.sent = []

    async def send(self, *args, **kwargs):
        self.sent.append((args, kwargs))


class _Message:
    async def edit(self, **_kwargs):
        pass


class _Interaction:
    def __init__(self, interaction_id=123, user_id=7):
        self.id = interaction_id
        self.guild_id = 99
        self.user = type("User", (), {"id": user_id})()
        self.response = _Response()
        self.followup = _Followup()
        self.edits = []

    async def edit_original_response(self, **kwargs):
        self.edits.append(kwargs)

    async def original_response(self):
        return _Message()


def _cog(db):
    cog = object.__new__(Cassino)
    cog.bot = type("Bot", (), {"db": db})()
    return cog


def test_dados_discord_debita_liquida_e_responde_uma_vez():
    db = novo_db()
    interacao = _Interaction()
    asyncio.run(_cog(db).executar_dados(interacao, 5, "baixo", None))

    rodadas = db.listar_rodadas_cassino("99", "7")
    assert len(rodadas) == 1
    assert rodadas[0]["status"] == "liquidada"
    assert rodadas[0]["jogo"] == "dados"
    assert len(interacao.edits) == 1
    assert interacao.followup.sent == []


def test_comando_exibe_regras_e_confirmacao_antes_de_debitar():
    db = novo_db()
    inicial = db.get_saldo("99", "7", "Lunaris")
    interacao = _Interaction()
    asyncio.run(_cog(db).pedir_confirmacao_dados(interacao, 5, "baixo", None))

    assert db.get_saldo("99", "7", "Lunaris") == inicial
    assert len(interacao.response.sent) == 1
    kwargs = interacao.response.sent[0][1]
    assert isinstance(kwargs["view"], ConfirmarApostaView)
    assert "3/6 (50%)" in kwargs["embed"].description
    assert "só será sorteado depois" in kwargs["embed"].description


def test_novos_jogos_discord_liquidam_com_resultado_persistido():
    db = novo_db()

    async def executar():
        cog = _cog(db)
        await cog.executar_roda_fluxos(_Interaction(201), 5, "genese")
        await cog.executar_sucessao(_Interaction(202), 5, "antes")
        await cog.executar_vaos(_Interaction(203), 5)

    asyncio.run(executar())
    rodadas = db.listar_rodadas_cassino("99", "7")
    assert {rodada["jogo"] for rodada in rodadas} == {"roda_fluxos", "sucessao", "vaos"}
    assert all(rodada["status"] == "liquidada" for rodada in rodadas)


def test_vinte_um_por_botao_liquida_estado_persistido():
    db = novo_db()
    estado = {
        "baralho": ["2"],
        "jogador": ["10", "9"],
        "banqueiro": ["10", "6"],
        "status": "ativa",
        "resultado": None,
        "multiplicador_bp": None,
        "dobrada": False,
    }
    db.iniciar_rodada_cassino("mesa", "99", "7", "vinte_um", 5, 13, estado, date(2026, 8, 27))

    async def executar():
        cog = _cog(db)
        view = VinteUmView(cog, "mesa", 7)
        try:
            interacao = _Interaction(456, 7)
            await cog.agir_vinte_um(interacao, "mesa", "parar", view)
            return interacao, view
        finally:
            view.stop()

    interacao, view = asyncio.run(executar())
    rodada = db.get_rodada_cassino("mesa")
    assert rodada["status"] == "liquidada"
    assert rodada["estado"]["resultado"] == "vitoria"
    assert rodada["pagamento"] == 10
    assert all(item.disabled for item in view.children)
    assert len(interacao.edits) == 1


def test_painel_e_mesa_rejeitam_outro_usuario():
    async def executar():
        cog = _cog(object())
        hub = CassinoHubView(cog, 7)
        mesa = VinteUmView(cog, "x", 7)
        try:
            intruso_hub = _Interaction(user_id=8)
            intruso_mesa = _Interaction(user_id=8)
            assert await hub.interaction_check(intruso_hub) is False
            assert await mesa.interaction_check(intruso_mesa) is False
            assert intruso_hub.response.sent
            assert intruso_mesa.response.sent
        finally:
            hub.stop()
            mesa.stop()

    asyncio.run(executar())
