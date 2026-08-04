"""Contrato puro da composição visual de notícias e baús."""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE))

from cogs.baus import Baus, _ganhos_do_premio, serializar_premio_bau
from cogs.entrevista import _titulo_entrevista
from cogs.jornal import _url_imagem_valida, montar_embed_noticia
from core.platform_api import PlatformApiError


class _Usuario:
    mention = "<@42>"


def test_titulo_entrevista_usa_nome_e_jornal_lunar():
    autor = type("Autor", (), {"display_name": "vick"})()
    assert _titulo_entrevista(autor) == "🎙️ Entrevista exclusiva com Vick para o Jornal Lunar"


def test_bau_exibe_reliquia_da_criacao_sem_rebaixar_para_comum():
    ganhos = _ganhos_do_premio({
        "lunaris": 44,
        "itens": [{
            "id": "reliquia-excalibur",
            "titulo": "Excalibur",
            "tipo": "arma",
            "raridade": "reliquia da criacao",
            "conteudo": {},
            "quantidade": 1,
        }],
    })

    assert ganhos == ["☾ 44 Lunaris", "**Excalibur** (Relíquia da Criação)"]


def test_noticia_rica_usa_os_cinco_campos_do_modal():
    emb = montar_embed_noticia(
        "Festival das Lanternas",
        "A noite ganhou novas cores.",
        "Moradores se reuniram diante do lago.",
        "Jornal Lunar",
        "https://cdn.example.test/lanternas.png",
    )

    assert emb.title == "📰 Festival das Lanternas"
    assert emb.description == (
        "*A noite ganhou novas cores.*\n\n"
        "Moradores se reuniram diante do lago."
    )
    assert emb.author.name == "Por Jornal Lunar"
    assert emb.image.url == "https://cdn.example.test/lanternas.png"
    assert emb.timestamp is not None


def test_url_de_imagem_aceita_vazia_ou_https_e_recusa_outros_esquemas():
    assert _url_imagem_valida("") is True
    assert _url_imagem_valida("https://example.test/a.png") is True
    assert _url_imagem_valida("http://example.test/a.png") is False
    assert _url_imagem_valida("javascript:alert(1)") is False


def test_card_final_do_bau_expoe_vencedor_premio_e_destino():
    emb = Baus.embed_bau_final(
        _Usuario(),
        {
            "ganhos": ["☾ 20 Lunaris", "**Orbe** (raro)"],
            "destino": "cofre da conta",
            "confirmado": True,
        },
    )

    assert "<@42>" in emb.description
    assert emb.fields[0].name == "Tesouro encontrado"
    assert "20 Lunaris" in emb.fields[0].value
    assert emb.fields[1].value == "cofre da conta"
    assert "Recompensa entregue" in emb.footer.text


def test_bau_confirma_interacao_e_reserva_primeiro_clique_em_falha_ambigua():
    """O baú fica persistido em `baus_no_ar` até alguém clicar: o clique
    precisa confirmar a interação (defer), reservar o vencedor no banco
    ANTES de tentar entregar, e sair do ar mesmo quando a entrega em si
    fica ambígua (timeout na plataforma, por exemplo)."""
    eventos = []

    class _Resposta:
        async def defer(self, **kwargs):
            eventos.append(("defer", kwargs))

    class _Followup:
        async def send(self, *args, **kwargs):
            eventos.append(("followup", args, kwargs))

    class _Interacao:
        response = _Resposta()
        followup = _Followup()
        message = None
        guild_id = 999
        channel_id = 654
        user = type(
            "Usuario",
            (),
            {"id": 42, "mention": "<@42>", "display_name": "Lina"},
        )()

    row = {
        "token": "abc123",
        "guild_id": "999",
        "canal_id": "654",
        "mensagem_id": "321",
        "premio": {"lunaris": 10, "itens": []},
        "enigma_pergunta": None,
        "enigma_respostas": None,
    }

    class _DB:
        def get_bau_no_ar(self, token):
            eventos.append(("get_bau_no_ar", token))
            return dict(row)

        def remover_bau_no_ar(self, token):
            eventos.append(("remover_bau_no_ar", token))

        def get_horoscopo(self, guild_id):
            return None

        def get_cargos_arvore(self, guild_id):
            return {}

        def registrar_bau_entrega_pendente(
            self, guild_id, mensagem_id, canal_id, vencedor_user_id, premio, modo_entrega
        ):
            eventos.append(("registrar", mensagem_id, vencedor_user_id, premio))
            return {
                "guild_id": guild_id,
                "mensagem_id": mensagem_id,
                "canal_id": canal_id,
                "vencedor_user_id": vencedor_user_id,
                "idempotencia": f"bau-drop:{mensagem_id}",
                "premio": premio,
                "modo_entrega": modo_entrega,
                "status": "pendente",
                "resultado": None,
                "nova": True,
            }

    class _Bot:
        db = _DB()
        platform = None

    class _Cog:
        bot = _Bot()
        aplicar_bonus_horoscopo = Baus.aplicar_bonus_horoscopo
        abrir_bau_click = Baus.abrir_bau_click
        _resolver_abertura = Baus._resolver_abertura

        @staticmethod
        def resultado_pendente(entrega, erro=""):
            return Baus.resultado_pendente(entrega, erro)

        async def processar_entrega(self, entrega):
            eventos.append(("processar", entrega["idempotencia"]))
            return self.resultado_pendente(entrega, "timeout")

        async def atualizar_mensagem_entrega(self, entrega, resultado, view=None):
            eventos.append(("atualizar", entrega["mensagem_id"], view))

    async def verificar():
        cog = _Cog()
        await cog.abrir_bau_click(_Interacao(), "abc123")

        assert eventos[0] == ("get_bau_no_ar", "abc123")
        assert eventos[1][0] == "defer"
        assert eventos[1][1] == {"ephemeral": True, "thinking": True}
        assert next(i for i, evento in enumerate(eventos) if evento[0] == "registrar") < next(
            i for i, evento in enumerate(eventos) if evento[0] == "processar"
        )
        assert any(evento[0] == "followup" for evento in eventos)
        assert any(evento[0] == "remover_bau_no_ar" for evento in eventos)
        atualizar = next(evento for evento in eventos if evento[0] == "atualizar")
        view = atualizar[2]
        button = view.children[0]
        assert button.disabled is True
        assert button.label == "Entrega pendente"

    asyncio.run(verificar())


def test_recovery_usa_premio_vencedor_e_chave_persistidos():
    chamadas = []
    premio = serializar_premio_bau(
        {
            "lunaris": 17,
            "itens": [
                {
                    "id": "orbe",
                    "titulo": "Orbe",
                    "tipo": "artefato",
                    "raridade": "raro",
                    "conteudo": {"efeito": "luz"},
                    "quantidade": 1,
                }
            ],
        }
    )
    entrega = {
        "guild_id": "100",
        "mensagem_id": "321",
        "canal_id": "654",
        "vencedor_user_id": "42",
        "idempotencia": "bau-drop:321",
        "premio": premio,
        "modo_entrega": "plataforma",
        "status": "pendente",
        "resultado": None,
    }

    class _DB:
        def iniciar_tentativa_bau_entrega(self, guild_id, mensagem_id):
            chamadas.append(("iniciar", guild_id, mensagem_id))
            return dict(entrega)

        def marcar_bau_entrega_entregue(self, guild_id, mensagem_id, resultado, **kwargs):
            chamadas.append(("entregue", guild_id, mensagem_id, resultado))

    class _Platform:
        async def deposit_vault(self, **kwargs):
            chamadas.append(("depositar", kwargs))
            return {"repetido": False}

    class _Bot:
        db = _DB()
        platform = _Platform()

    async def verificar():
        cog = object.__new__(Baus)
        cog.bot = _Bot()
        resultado = await cog.processar_entrega(entrega)
        deposito = next(item[1] for item in chamadas if item[0] == "depositar")
        assert deposito["discord_user_id"] == 42
        assert deposito["idempotency_key"] == "bau-drop:321"
        assert deposito["currencies"] == []  # Lunaris de bau vai pra carteira local, nao pro cofre
        assert deposito["items"][0]["item_id"] == "orbe"
        assert resultado["confirmado"] is True
        assert any(item[0] == "entregue" for item in chamadas)

    asyncio.run(verificar())


def test_recovery_automatico_reprocessa_pendentes_de_todas_as_guilds():
    """Sem alguém digitar /bau_reprocessar: o loop de recovery deve varrer
    todas as guilds do bot e reentregar quem ainda está pendente."""
    premio = serializar_premio_bau({
        "lunaris": 5,
        "itens": [{
            "id": "orbe", "titulo": "Orbe", "tipo": "artefato",
            "raridade": "raro", "conteudo": {}, "quantidade": 1,
        }],
    })
    pendente = {
        "guild_id": "100",
        "mensagem_id": "321",
        "canal_id": "654",
        "vencedor_user_id": "42",
        "idempotencia": "bau-drop:321",
        "premio": premio,
        "modo_entrega": "plataforma",
        "status": "pendente",
        "resultado": None,
    }
    chamadas = []

    class _DB:
        def listar_baus_entregas_pendentes(self, guild_id, limite=20):
            chamadas.append(("listar", guild_id))
            return [dict(pendente)] if guild_id == "100" else []

        def iniciar_tentativa_bau_entrega(self, guild_id, mensagem_id):
            return dict(pendente)

        def marcar_bau_entrega_entregue(self, guild_id, mensagem_id, resultado, **kwargs):
            chamadas.append(("entregue", guild_id, mensagem_id))

        def get_bau_entrega(self, guild_id, mensagem_id):
            return dict(pendente)

    class _Platform:
        async def deposit_vault(self, **kwargs):
            chamadas.append(("depositar", kwargs))
            return {"repetido": False}

    class _Guild:
        def __init__(self, guild_id):
            self.id = guild_id

    class _Bot:
        db = _DB()
        platform = _Platform()
        guilds = [_Guild(100), _Guild(200)]  # a 200 não tem nada pendente

    async def verificar():
        cog = object.__new__(Baus)
        cog.bot = _Bot()
        atualizacoes = []

        async def fake_atualizar(entrega, resultado, view=None):
            atualizacoes.append((entrega["mensagem_id"], resultado.get("confirmado")))

        cog.atualizar_mensagem_entrega = fake_atualizar
        await Baus.recovery.coro(cog)

        # As duas guilds foram varridas, mas só a 100 tinha algo pra reprocessar.
        assert ("listar", "100") in chamadas
        assert ("listar", "200") in chamadas
        assert any(item[0] == "depositar" for item in chamadas)
        assert any(item[0] == "entregue" for item in chamadas)
        assert atualizacoes == [("321", True)]

    asyncio.run(verificar())


def test_falha_na_plataforma_cai_para_o_cofre_local_em_vez_de_ficar_pendente():
    """Não importa o motivo do erro (conta não vinculada, plataforma fora do
    ar, bug momentâneo): a entrega tem que sair do "pendente" sozinha, sem
    ninguém precisar rodar /bau_reprocessar."""
    premio = serializar_premio_bau({
        "lunaris": 5,
        "itens": [{
            "id": "orbe", "titulo": "Orbe", "tipo": "artefato",
            "raridade": "raro", "conteudo": {}, "quantidade": 1,
        }],
    })
    pendente = {
        "guild_id": "100",
        "mensagem_id": "321",
        "canal_id": "654",
        "vencedor_user_id": "42",
        "idempotencia": "bau-drop:321",
        "premio": premio,
        "modo_entrega": "plataforma",
        "status": "pendente",
        "resultado": None,
    }
    chamadas = []

    class _DB:
        def iniciar_tentativa_bau_entrega(self, guild_id, mensagem_id):
            return dict(pendente)

        def definir_modo_bau_entrega(self, guild_id, mensagem_id, modo_entrega):
            chamadas.append(("modo", guild_id, mensagem_id, modo_entrega))

        def entregar_bau_legado(self, guild_id, mensagem_id):
            chamadas.append(("legado", guild_id, mensagem_id))
            return {"ganhos": ["☾ 5 Lunaris"], "destino": "carteira do Banqueiro", "confirmado": True}

        def get_bau_entrega(self, guild_id, mensagem_id):
            return dict(pendente)

    class _Platform:
        async def deposit_vault(self, **kwargs):
            raise PlatformApiError("a plataforma demorou demais para responder")

    class _Bot:
        db = _DB()
        platform = _Platform()

    async def verificar():
        cog = object.__new__(Baus)
        cog.bot = _Bot()
        atualizacoes = []

        async def fake_atualizar(entrega, resultado, view=None):
            atualizacoes.append((entrega["mensagem_id"], resultado.get("confirmado")))

        cog.atualizar_mensagem_entrega = fake_atualizar
        resultado = await cog._reprocessar_uma_entrega("100", dict(pendente))

        assert resultado["confirmado"] is True
        assert resultado["destino"] == "carteira do Banqueiro"
        assert ("modo", "100", "321", "legado") in chamadas
        assert ("legado", "100", "321") in chamadas
        assert atualizacoes == [("321", True)]

    asyncio.run(verificar())


def test_entrega_so_fica_pendente_se_ate_o_fallback_local_falhar():
    """Único caso legítimo de continuar pendente: o próprio banco local do
    bot falhou (não a plataforma): aí sim precisa de atenção manual."""
    premio = serializar_premio_bau({
        "lunaris": 5,
        "itens": [{
            "id": "orbe", "titulo": "Orbe", "tipo": "artefato",
            "raridade": "raro", "conteudo": {}, "quantidade": 1,
        }],
    })
    pendente = {
        "guild_id": "100",
        "mensagem_id": "321",
        "canal_id": "654",
        "vencedor_user_id": "42",
        "idempotencia": "bau-drop:321",
        "premio": premio,
        "modo_entrega": "plataforma",
        "status": "pendente",
        "resultado": None,
    }
    marcacoes = []

    class _DB:
        def iniciar_tentativa_bau_entrega(self, guild_id, mensagem_id):
            return dict(pendente)

        def definir_modo_bau_entrega(self, guild_id, mensagem_id, modo_entrega):
            pass

        def entregar_bau_legado(self, guild_id, mensagem_id):
            raise RuntimeError("banco local indisponível")

        def marcar_bau_entrega_pendente(self, guild_id, mensagem_id, erro):
            marcacoes.append((guild_id, mensagem_id, erro))
            return dict(pendente)

    class _Platform:
        async def deposit_vault(self, **kwargs):
            raise PlatformApiError("a plataforma demorou demais para responder")

    class _Bot:
        db = _DB()
        platform = _Platform()

    async def verificar():
        cog = object.__new__(Baus)
        cog.bot = _Bot()
        atualizacoes = []
        cog.atualizar_mensagem_entrega = lambda *a, **k: atualizacoes.append(1)

        resultado = await cog._reprocessar_uma_entrega("100", dict(pendente))

        assert resultado["confirmado"] is False
        assert marcacoes and marcacoes[0][:2] == ("100", "321")
        assert atualizacoes == []  # não confirmou; a mensagem não precisa mudar

    asyncio.run(verificar())
