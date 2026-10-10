"""`/jardim`: o painel do Jornal Lunar, e os eventos do Mestre."""

from __future__ import annotations

import asyncio
import random
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from types import SimpleNamespace

import discord
from discord.ext import commands

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE))

from cogs import jornal as jornal_mod
from cogs.painel import (
    EMOJI_EVENTO, SECOES, EscolherAlvoDoFuro, ModalClassificado, ModalFuro, coletar_resumo, montar_embed_inicio,
)
from core import arvores as arvores_mod
from core.painel import PainelView
from tests.db_utils import novo_db
from tests.test_comandos import EXTENSOES

G, U = "100", "200"


def _rodar(coro):
    return asyncio.run(coro)


async def _bot_carregado(db):
    bot = commands.Bot(command_prefix="!", intents=discord.Intents.default())
    bot.db = db
    bot.catalogo = object()
    bot.platform = None
    bot._ready = asyncio.Event()  # os ciclos dos cogs esperam o bot ficar pronto, sem erro de cliente nao iniciado
    for extensao in EXTENSOES:
        await bot.load_extension(extensao)
    return bot


def _resolver(bot, caminho):
    partes = caminho.split()
    comando = bot.tree.get_command(partes[0])
    for parte in partes[1:]:
        comando = comando.get_command(parte)
    return comando


def test_toda_secao_aponta_para_um_comando_existente_e_nao_de_mestre():
    assert len(SECOES) <= 25 and len({s[0] for s in SECOES}) == len(SECOES)

    async def verificar():
        bot = await _bot_carregado(object())
        try:
            for chave, _r, _e, _d, comando in SECOES:
                if comando is None:
                    continue
                encontrado = _resolver(bot, comando)
                assert encontrado is not None, f"{chave}: '{comando}' sumiu"
                assert not encontrado.checks and "[Mestre]" not in (encontrado.description or "")
            assert bot.tree.get_command("jardim") is not None
        finally:
            await bot.close()

    _rodar(verificar())


# ── tela inicial ────────────────────────────────────────────────────────────
def _dados(**extra):
    base = {
        "estacao": "primavera", "clima": None, "horoscopo": None, "cargos_arvore": {},
        "baus_no_ar": [], "baus_hoje": 0, "pistas": 0, "eventos": [], "furo": None,
        "entrevista": None, "fora_das_entrevistas": False, "bilhetes_total": 0,
    }
    base.update(extra)
    return base


def test_inicio_vazio_mostra_estacao_e_nenhum_bau():
    emb = montar_embed_inicio("Lina", _dados())
    assert "Lina" in emb.title and "Primavera" in emb.description
    campos = {c.name: c.value for c in emb.fields}
    assert campos["🎁 Baús"] == "Nenhum baú no ar agora."
    assert not any(n in campos for n in ("🔮 Horóscopo do dia", "📢 Eventos do Mestre", "⚠️ Para você"))


def test_inicio_mostra_clima_horoscopo_baus_eventos_e_avisos_pessoais():
    agora = datetime.now(timezone.utc)
    arvore = arvores_mod.ARVORES[0]
    emb = montar_embed_inicio(
        "Lina",
        _dados(
            clima="inflacao_loja",
            horoscopo=arvore.id, cargos_arvore={arvore.id: "55"},
            baus_hoje=3, pistas=2, bilhetes_total=9,
            baus_no_ar=[
                {"canal_id": "7", "mensagem_id": "1", "expira_em": agora + timedelta(hours=1),
                 "nome": "Baú Comum", "coletivo": True, "ja_peguei": False},
                {"canal_id": "7", "mensagem_id": "2", "expira_em": agora + timedelta(hours=1),
                 "nome": "Baú Raro", "coletivo": False, "ja_peguei": False},
            ],
            eventos=[{"titulo": "Feira", "tipo": "festival", "expira_em": agora + timedelta(days=1), "texto": ""}],
            furo={"prazo": agora + timedelta(minutes=20), "suborno_valor": 60},
            entrevista={"id": 1},
        ),
        cargos_do_jogador=frozenset({"55"}),
    )
    campos = {c.name: c.value for c in emb.fields}
    assert "20% mais caros" in emb.description
    assert arvore.nome in campos["🔮 Horóscopo do dia"] and "o dobro" in campos["🔮 Horóscopo do dia"]
    assert "pegue o seu!" in campos["🎁 Baús"] and "corrida do enigma" in campos["🎁 Baús"]
    assert "2" in campos["🎁 Baús"] and "Pista" in campos["🎁 Baús"]
    assert "Feira" in campos["📢 Eventos do Mestre"] and EMOJI_EVENTO["festival"] in campos["📢 Eventos do Mestre"]
    assert "/subornar_jornalista" in campos["⚠️ Para você"] and "☾ **60**" in campos["⚠️ Para você"]
    assert "/entrevista_responder" in campos["⚠️ Para você"]
    assert "9" in campos["🎟️ Loteria Dominical"]


def test_horoscopo_nao_promete_dobro_a_quem_nao_tem_o_cargo():
    arvore = arvores_mod.ARVORES[0]
    emb = montar_embed_inicio("Lina", _dados(horoscopo=arvore.id, cargos_arvore={arvore.id: "55"}))
    assert "o dobro" not in {c.name: c.value for c in emb.fields}["🔮 Horóscopo do dia"]


def test_resumo_real_junta_eventos_baus_furo_e_entrevista():
    db = novo_db()
    db.set_estacao(G, "inverno")
    db.set_modificador_clima(G, "deflacao_loja")
    db.criar_evento(G, "Ativo", "texto", "mercado", 2, "1")
    antigo = db.criar_evento(G, "Encerrado", "", "aviso", 2, "1")
    assert db.encerrar_evento(G, antigo) is True
    assert db.encerrar_evento(G, antigo) is False  # já encerrado
    expira = datetime.now(timezone.utc) + timedelta(hours=1)
    premio = {"bau": {"raridade": "comum", "nome": "Baú Comum", "coletivo": True}}
    db.criar_bau_no_ar("t" * 32, G, "7", "900", premio, expira)
    db.registrar_bau_historico(G, "7", "900", "t" * 32, "comum", "Baú Comum", True, expira)
    db.adicionar_fofoca(G, U, "furo", 60, datetime.now(timezone.utc) + timedelta(minutes=20))
    db.criar_entrevista(G, U, "Pergunta?")

    dados = coletar_resumo(db, G, U)
    assert dados["estacao"] == "inverno" and dados["clima"] == "deflacao_loja"
    assert [e["titulo"] for e in dados["eventos"]] == ["Ativo"]
    assert [b["mensagem_id"] for b in dados["baus_no_ar"]] == ["900"] and dados["baus_hoje"] == 1
    assert dados["furo"]["suborno_valor"] == 60 and dados["entrevista"] is not None
    montar_embed_inicio("Lina", dados)  # não quebra com dados reais


# ── ponta a ponta ───────────────────────────────────────────────────────────
class _Resp:
    def __init__(self, i):
        self.i, self.feito = i, False

    def is_done(self):
        return self.feito

    async def defer(self, **kw):
        self.feito = True
        self.i.eventos.append("defer")

    async def edit_message(self, **kw):
        self.feito = True
        self.i.eventos.append(("edit", kw))

    async def send_message(self, *a, **kw):
        self.feito = True
        self.i.eventos.append(("send_message", a, kw))

    async def send_modal(self, modal):
        self.feito = True
        self.i.eventos.append(("send_modal", modal))


class _Inter:
    def __init__(self, valores=None, uid=int(U)):
        self.eventos = []
        self.id = 12345
        self.guild_id = int(G)
        self.guild = SimpleNamespace(id=int(G), get_member=lambda _id: None, get_channel=lambda _id: None)
        self.user = SimpleNamespace(id=uid, display_name="Lina", mention=f"<@{uid}>", roles=[])
        self.response = _Resp(self)
        self.followup = SimpleNamespace(send=self._followup)
        self.data = {"values": valores or []}

    async def _followup(self, *a, **kw):
        self.eventos.append(("followup", a, kw))

    async def edit_original_response(self, **kw):
        self.eventos.append(("edit_original", kw))


def _editado(inter):
    return [e for e in inter.eventos if isinstance(e, tuple) and e[0] == "edit_original"][-1][1]


def _painel(cog):
    return PainelView(autor_id=int(U), secoes=cog._secoes(), inicio=cog._inicio, acoes=cog._acoes())


def test_secoes_do_painel_executam_os_comandos_reais():
    async def verificar():
        db = novo_db()
        db.set_estacao(G, "outono")
        db.criar_evento(G, "Feira de outono", "Barracas na praça.", "festival", 5, "1")
        bot = await _bot_carregado(db)
        try:
            cog = bot.get_cog("Painel")
            view = _painel(cog)
            for chave, trecho in [
                ("estacao", "Outono"),
                ("baus", "Achados de hoje"),
                ("eventos", "Feira de outono"),
            ]:
                inter = _Inter([chave])
                await view._ao_escolher(inter)
                editado = _editado(inter)
                alvo = (editado["embed"].title or "") + (editado["embed"].description or "")
                assert trecho in alvo, (chave, alvo)
            # Horóscopo sem sorteio ainda: a mensagem do comando aparece no painel.
            inter = _Inter(["horoscopo"])
            await view._ao_escolher(inter)
            assert "estrelas ainda não se manifestaram" in _editado(inter)["content"]
            # Títulos secretos: o comando usa defer + followup.
            inter = _Inter(["conquistas"])
            await view._ao_escolher(inter)
            assert "título" in _editado(inter)["content"].lower() or "descobriu" in _editado(inter)["content"]
        finally:
            await bot.close()

    _rodar(verificar())


def test_comando_jardim_abre_o_inicio_em_privado_com_os_tres_atalhos():
    async def verificar():
        db = novo_db()
        bot = await _bot_carregado(db)
        try:
            cog = bot.get_cog("Painel")
            inter = _Inter()
            enviados = []

            async def enviar(**kw):
                enviados.append(kw)

            inter.followup = SimpleNamespace(send=enviar)
            await type(cog).jardim.callback(cog, inter)
            assert inter.eventos[0] == "defer" and enviados[0]["ephemeral"] is True
            assert "Jornal Lunar" in enviados[0]["embed"].title
            nomes = {b.label for b in enviados[0]["view"].children if getattr(b, "label", None)}
            assert {"Início", "Atualizar", "Classificado", "Vender furo", "Entrevistas"} <= nomes
        finally:
            await bot.close()

    _rodar(verificar())


def test_atalho_de_classificado_cobra_em_lunaris_pelo_comando():
    async def verificar():
        db = novo_db()
        db.creditar(G, U, "Lunaris", 300)
        inicial = db.creditar(G, U, "Lunaris", 0)
        bot = await _bot_carregado(db)
        try:
            cog = bot.get_cog("Painel")
            view = _painel(cog)
            botao = [b for b in view.children if getattr(b, "label", "") == "Classificado"][0]
            inter = _Inter()
            await botao.callback(inter)
            modal = [e for e in inter.eventos if e[0] == "send_modal"][0][1]
            assert type(modal).__name__ == ModalClassificado.__name__  # load_extension recarrega o módulo

            modal.texto._value = "Vendo uma espada de ferro"
            modal.valor._value = "abc"
            inter2 = _Inter()
            await modal.on_submit(inter2)
            assert "número" in inter2.eventos[0][1][0]
            modal.valor._value = "10"
            inter3 = _Inter()
            await modal.on_submit(inter3)
            assert "mínimo" in inter3.eventos[0][1][0]

            modal.valor._value = "60"
            inter4 = _Inter()
            await modal.on_submit(inter4)
            assert db.creditar(G, U, "Lunaris", 0) == inicial - 60
            assert any("classificado foi entregue" in str(e) for e in inter4.eventos)
        finally:
            await bot.close()

    _rodar(verificar())


def test_atalho_de_entrevistas_inverte_a_escolha_do_jogador():
    async def verificar():
        db = novo_db()
        bot = await _bot_carregado(db)
        try:
            cog = bot.get_cog("Painel")
            view = _painel(cog)
            botao = [b for b in view.children if getattr(b, "label", "") == "Entrevistas"][0]
            await botao.callback(_Inter())
            assert U in db.usuarios_fora_das_entrevistas(G)  # estava dentro: saiu
            await botao.callback(_Inter())
            assert U not in db.usuarios_fora_das_entrevistas(G)  # voltou
        finally:
            await bot.close()

    _rodar(verificar())


class _Vitima(discord.Member):
    """Member sem passar pelo construtor do discord.py: o /vender_furo só usa
    id, bot, mention e send."""

    id = 999
    bot = False
    mention = "<@999>"

    def __init__(self):
        self.dms = []

    async def send(self, texto, **kw):
        self.dms.append(texto)
        self.view = kw.get("view")


def test_atalho_de_furo_pergunta_o_alvo_e_chama_o_comando(monkeypatch):
    monkeypatch.setattr(random, "random", lambda: 0.1)
    monkeypatch.setattr(random, "randint", lambda a, b: 30)

    async def verificar():
        db = novo_db()
        db.garantir_jogador(G, U)
        inicial = db.creditar(G, U, "Lunaris", 0)
        bot = await _bot_carregado(db)
        try:
            cog = bot.get_cog("Painel")
            view = _painel(cog)
            botao = [b for b in view.children if getattr(b, "label", "") == "Vender furo"][0]
            inter = _Inter()
            await botao.callback(inter)
            _, _args, kw = [e for e in inter.eventos if isinstance(e, tuple) and e[0] == "send_message"][0]
            seletor_view = kw["view"]
            assert type(seletor_view).__name__ == EscolherAlvoDoFuro.__name__ and kw["ephemeral"] is True

            alvo = _Vitima()
            inter_alvo = _Inter()
            await seletor_view._ao_escolher(inter_alvo, alvo)  # o que o UserSelect entrega ao escolher
            modal = [e for e in inter_alvo.eventos if e[0] == "send_modal"][0][1]
            assert type(modal).__name__ == ModalFuro.__name__
            modal.historia._value = "Vi essa pessoa treinando escondida atras da taverna"
            await modal.on_submit(_Inter())
            assert db.creditar(G, U, "Lunaris", 0) == inicial + 30
            assert "treinando escondida" in db.get_fofoca_pendente_usuario(G, "999")["texto_fofoca"]
            assert [b.item.label.split(" (")[0] for b in alvo.view.children] == ["Subornar", "Desmentir"]
            assert db.get_fofoca_pendente_usuario(G, "999") is not None
            assert len(alvo.dms) == 1 and "/subornar_jornalista" in alvo.dms[0]
        finally:
            await bot.close()

    _rodar(verificar())


def test_so_o_dono_usa_o_seletor_de_alvo():
    async def verificar():
        view = EscolherAlvoDoFuro(1, None)
        inter = _Inter(uid=2)
        assert await view.interaction_check(inter) is False
        assert await view.interaction_check(_Inter(uid=1)) is True

    _rodar(verificar())


# ── eventos do Mestre ───────────────────────────────────────────────────────
def test_eventos_ativos_respeitam_prazo_e_encerramento():
    db = novo_db()
    a = db.criar_evento(G, "A", "", "aviso", 1, "1")
    b = db.criar_evento(G, "B", "", "perigo", 5, "1")
    with db._conn() as con:
        con.execute("UPDATE jardim_eventos SET expira_em = CURRENT_TIMESTAMP - interval '1 minute' WHERE id=%s", (a,))
    assert [e["titulo"] for e in db.listar_eventos_ativos(G)] == ["B"]
    todos = {e["titulo"]: e["ativo"] for e in db.listar_eventos(G)}
    assert todos == {"A": False, "B": True}
    db.encerrar_evento(G, b)
    assert db.listar_eventos_ativos(G) == []
    assert db.listar_eventos_ativos("outra") == []


class _RespostaSimples:
    def __init__(self):
        self.mensagens = []

    async def send_message(self, *a, **kw):
        self.mensagens.append((a, kw))

    async def defer(self, **kw):
        self.mensagens.append((("defer",), kw))


def _cmd_inter():
    resp = _RespostaSimples()
    seguimentos = []

    async def enviar(*a, **kw):
        seguimentos.append((a, kw))

    inter = SimpleNamespace(
        guild_id=int(G), response=resp, followup=SimpleNamespace(send=enviar),
        user=SimpleNamespace(id=1),
    )
    return inter, resp, seguimentos


def test_evento_criar_publica_no_jornal_e_aparece_nos_paineis(monkeypatch):
    db = novo_db()
    db.set_canal_categoria(G, "noticia", "777")
    publicados = []

    async def fake_publicar(bot, **kwargs):
        publicados.append(kwargs)
        return "entregue"

    monkeypatch.setattr(jornal_mod.publicacoes, "publicar_ou_enfileirar", fake_publicar)
    cog = object.__new__(jornal_mod.Jornal)
    cog.bot = SimpleNamespace(db=db)
    inter, resp, seguimentos = _cmd_inter()
    escolha = SimpleNamespace(value="mercado")
    _rodar(jornal_mod.Jornal.evento_criar.callback(cog, inter, "Guerra no norte", "Armas 20% mais caras.", 12, escolha))

    ev = db.listar_eventos_ativos(G)[0]
    assert ev["titulo"] == "Guerra no norte" and ev["tipo"] == "mercado"
    assert publicados[0]["dedupe_key"] == f"evento:{ev['id']}" and publicados[0]["canal_id"] == "777"
    assert "Guerra no norte" in publicados[0]["embed"].title and "💹" in publicados[0]["embed"].title
    assert "Anunciado no canal de notícias" in seguimentos[0][0][0]


def test_evento_criar_sem_canal_de_noticias_nao_tenta_publicar(monkeypatch):
    db = novo_db()

    async def nao_deveria(bot, **kwargs):
        raise AssertionError("não havia canal configurado")

    monkeypatch.setattr(jornal_mod.publicacoes, "publicar_ou_enfileirar", nao_deveria)
    cog = object.__new__(jornal_mod.Jornal)
    cog.bot = SimpleNamespace(db=db)
    inter, resp, _ = _cmd_inter()
    _rodar(jornal_mod.Jornal.evento_criar.callback(cog, inter, "Aviso simples", "", 24, None))
    assert len(db.listar_eventos_ativos(G)) == 1
    assert "só aparece em `/jardim`" in resp.mensagens[0][0][0]


def test_evento_listar_e_encerrar():
    db = novo_db()
    cog = object.__new__(jornal_mod.Jornal)
    cog.bot = SimpleNamespace(db=db)
    inter, resp, _ = _cmd_inter()
    _rodar(jornal_mod.Jornal.evento_listar.callback(cog, inter))
    assert resp.mensagens[0][0][0] == "Nenhum evento criado ainda."

    evento_id = db.criar_evento(G, "Festa", "", "festival", 3, "1")
    inter, resp, _ = _cmd_inter()
    _rodar(jornal_mod.Jornal.evento_listar.callback(cog, inter))
    assert "Festa" in resp.mensagens[0][1]["embed"].description and "ativo" in resp.mensagens[0][1]["embed"].description

    inter, resp, _ = _cmd_inter()
    _rodar(jornal_mod.Jornal.evento_encerrar.callback(cog, inter, evento_id))
    assert "encerrado" in resp.mensagens[0][0][0]
    inter, resp, _ = _cmd_inter()
    _rodar(jornal_mod.Jornal.evento_encerrar.callback(cog, inter, evento_id))
    assert "não encontrado" in resp.mensagens[0][0][0]
