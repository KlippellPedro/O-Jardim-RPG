"""`/banco`: o painel do Banco Lunar."""

from __future__ import annotations

import asyncio
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from types import SimpleNamespace

import discord
from discord.ext import commands

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE))

from cogs.painel import EMOJI_EVENTO, SECOES, coletar_resumo, montar_embed_inicio
from core.painel import PainelView
from tests.db_utils import novo_db
from tests.test_comandos import EXTENSOES

G, U = "100", "200"


def _rodar(coro):
    return asyncio.run(coro)


async def _bot_carregado(db=None):
    bot = commands.Bot(command_prefix="!", intents=discord.Intents.default())
    bot.db = db if db is not None else object()
    bot.catalogo = object()
    bot.platform = None
    bot._ready = asyncio.Event()  # os ciclos dos cogs esperam o bot ficar pronto, sem erro de cliente nao iniciado
    bot.inventario = SimpleNamespace(contar=_zero)
    for extensao in EXTENSOES:
        await bot.load_extension(extensao)
    return bot


async def _zero(*_a, **_k):
    return 0


def _resolver(bot, caminho):
    partes = caminho.split()
    comando = bot.tree.get_command(partes[0])
    for parte in partes[1:]:
        comando = comando.get_command(parte)
    return comando


def test_o_painel_tem_ate_25_secoes_e_todas_apontam_para_comandos_existentes():
    assert len(SECOES) <= 25
    assert len({s[0] for s in SECOES}) == len(SECOES)

    async def verificar():
        bot = await _bot_carregado()
        try:
            for chave, _rotulo, _emoji, _descricao, comando in SECOES:
                if comando is None:
                    continue  # tela própria (Chaves)
                encontrado = _resolver(bot, comando)
                assert encontrado is not None, f"{chave}: comando '{comando}' sumiu"
                assert callable(encontrado.callback)
            # O painel em si cabe no limite de 100 comandos do Discord.
            assert len(bot.tree.get_commands()) <= 100
            assert bot.tree.get_command("banco") is not None
        finally:
            await bot.close()

    _rodar(verificar())


def test_nenhuma_secao_expoe_comando_de_mestre():
    """As seções chamam o callback sem passar pelas checagens de permissão."""
    async def verificar():
        bot = await _bot_carregado()
        try:
            for chave, *_resto, comando in SECOES:
                if comando is None:
                    continue
                encontrado = _resolver(bot, comando)
                assert not encontrado.checks, f"{chave} tem checagem de permissão"
                assert "[Mestre]" not in (encontrado.description or ""), chave
        finally:
            await bot.close()

    _rodar(verificar())


# ── resumo e tela inicial ───────────────────────────────────────────────────
def _dados(**extra):
    base = {
        "carteira": {"Lunaris": 120, "Solares": 2},
        "cofre": {"Lunaris": 300},
        "cartao_nome": "Cartão Comum", "reputacao": 40, "reputacao_rotulo": "Confiável",
        "limite_total": 200, "limite_disponivel": 150, "divida": 0, "faturas_total": 0,
        "proxima_fatura": None, "recompensa": {"valor": 0, "tem_sistema": False},
        "bilhetes_meus": 0, "bilhetes_total": 0, "baus": [], "eventos": [], "mandato": None,
    }
    base.update(extra)
    return base


def test_inicio_mostra_conta_e_diz_quando_nao_ha_nada_acontecendo():
    emb = montar_embed_inicio("Lina", _dados())
    assert "Lina" in emb.title
    assert "120" in emb.description and "Solares" in emb.description
    campos = {c.name: c.value for c in emb.fields}
    assert "300" in campos["🔒 Guardado no cofre"]
    assert "Cartão Comum" in campos["💳 Cartão Lunar"] and "150 / 200" in campos["💳 Cartão Lunar"]
    assert "⚠️ Pede atenção" not in campos
    assert campos["🌿 Acontecendo agora"] == "Nada de especial no momento."


def test_inicio_destaca_o_que_pede_atencao_e_o_que_esta_acontecendo():
    agora = datetime.now(timezone.utc)
    emb = montar_embed_inicio("Lina", _dados(
        divida=40, faturas_total=60, proxima_fatura=agora + timedelta(days=2),
        recompensa={"valor": 90, "tem_sistema": True},
        mandato={"resgatado": False, "quantidade": 3, "necessarios": 3},
        bilhetes_total=12, bilhetes_meus=2,
        baus=[
            {"canal_id": "7", "mensagem_id": "8", "expira_em": agora + timedelta(hours=1),
             "raridade": "comum", "nome": "Baú Comum", "coletivo": True, "ja_peguei": False},
            {"canal_id": "7", "mensagem_id": "9", "expira_em": agora + timedelta(hours=1),
             "raridade": "raro", "nome": "Baú Raro", "coletivo": False, "ja_peguei": False},
            {"canal_id": "7", "mensagem_id": "10", "expira_em": agora + timedelta(hours=1),
             "raridade": "incomum", "nome": "Baú Incomum", "coletivo": True, "ja_peguei": True},
        ],
        eventos=[{"id": 1, "titulo": "Feira de outono", "tipo": "festival",
                  "expira_em": agora + timedelta(days=1), "texto": ""}],
    ))
    campos = {c.name: c.value for c in emb.fields}
    atencao = campos["⚠️ Pede atenção"]
    assert "Dívida de ☾ **40**" in atencao and "Fatura de ☾ **60**" in atencao
    assert "recompensa na sua cabeça" in atencao and "procurado pelo Banco" in atencao
    assert "mandato semanal" in atencao
    agora_txt = campos["🌿 Acontecendo agora"]
    assert "pegue o seu!" in agora_txt and "corrida do enigma" in agora_txt and "já pegou o seu" in agora_txt
    assert "<#7>" in agora_txt
    assert "12" in agora_txt and "seus: **2**" in agora_txt
    assert "Feira de outono" in agora_txt and EMOJI_EVENTO["festival"] in agora_txt


def test_resumo_real_do_banco_com_eventos_baus_e_loteria():
    db = novo_db()
    with db._conn() as con:
        # Tabelas do Jornalista, que o painel só lê.
        con.execute("CREATE TABLE baus_no_ar (token TEXT, guild_id TEXT, canal_id TEXT, mensagem_id TEXT, "
                    "premio JSONB, expira_em TIMESTAMPTZ)")
        con.execute("CREATE TABLE baus_entregas (guild_id TEXT, mensagem_id TEXT)")
        premio = ('{"bau": {"raridade": "comum", "nome": "Baú Comum", "coletivo": true}}')
        con.execute("INSERT INTO baus_no_ar VALUES ('t1', %s, '7', '900', %s, CURRENT_TIMESTAMP + interval '1 hour')", (G, premio))
        con.execute("INSERT INTO baus_no_ar VALUES ('t2', %s, '7', '901', %s, CURRENT_TIMESTAMP + interval '1 hour')", (G, premio))
        con.execute("INSERT INTO baus_no_ar VALUES ('t3', %s, '7', '902', %s, CURRENT_TIMESTAMP - interval '1 hour')", (G, premio))
        con.execute("INSERT INTO baus_entregas VALUES (%s, %s)", (G, f"901:{U}"))
        con.execute("INSERT INTO loteria_bilhetes (guild_id, user_id, quantidade) VALUES (%s, %s, 3)", (G, U))
        con.execute("INSERT INTO loteria_bilhetes (guild_id, user_id, quantidade) VALUES (%s, 'outro', 5)", (G,))
        con.execute("INSERT INTO jardim_eventos (guild_id, titulo, tipo, expira_em) VALUES (%s, 'Ativo', 'mercado', CURRENT_TIMESTAMP + interval '2 hour')", (G,))
        con.execute("INSERT INTO jardim_eventos (guild_id, titulo, tipo, expira_em) VALUES (%s, 'Vencido', 'aviso', CURRENT_TIMESTAMP - interval '1 hour')", (G,))
        con.execute("INSERT INTO jardim_eventos (guild_id, titulo, tipo, expira_em, encerrado) VALUES (%s, 'Encerrado', 'aviso', CURRENT_TIMESTAMP + interval '2 hour', TRUE)", (G,))

    dados = coletar_resumo(db, G, U)
    assert dados["bilhetes_meus"] == 3 and dados["bilhetes_total"] == 8
    assert [e["titulo"] for e in dados["eventos"]] == ["Ativo"]
    assert [(b["mensagem_id"], b["ja_peguei"]) for b in dados["baus"]] == [("900", False), ("901", True)]
    assert dados["carteira"]["Lunaris"] >= 0 and dados["cartao_nome"]
    montar_embed_inicio("Lina", dados)  # não quebra com dados reais


def test_resumo_aguenta_banco_sem_as_tabelas_do_jornalista():
    db = novo_db()
    dados = coletar_resumo(db, G, U)
    assert dados["baus"] == [] and dados["eventos"] == []
    assert dados["bilhetes_total"] == 0 and dados["recompensa"]["valor"] == 0


# ── ponta a ponta: o painel chama o comando real ────────────────────────────
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


class _Inter:
    def __init__(self, valores):
        self.eventos = []
        self.guild_id = int(G)
        self.user = SimpleNamespace(id=int(U), display_name="Lina", mention=f"<@{U}>")
        self.response = _Resp(self)
        self.followup = SimpleNamespace()
        self.data = {"values": valores}

    async def edit_original_response(self, **kw):
        self.eventos.append(("edit_original", kw))


def test_secao_carteira_do_painel_mostra_a_tela_do_comando_carteira():
    async def verificar():
        db = novo_db()
        bot = await _bot_carregado(db)
        try:
            cog = bot.get_cog("Painel")
            view = PainelView(autor_id=int(U), secoes=cog._secoes(), inicio=cog._inicio, acoes=cog._acoes())
            inter = _Inter(["carteira"])
            await view._ao_escolher(inter)
            embed = [e for e in inter.eventos if isinstance(e, tuple) and e[0] == "edit_original"][-1][1]["embed"]
            assert embed.title == "💰 Carteira de Lina"
            assert "Lunaris" in embed.description
        finally:
            await bot.close()

    _rodar(verificar())


def test_secao_publica_vira_privada_no_painel():
    """/ranking responde para o canal inteiro; dentro do painel fica só para quem abriu."""
    async def verificar():
        db = novo_db()
        db.garantir_jogador(G, U)
        bot = await _bot_carregado(db)
        try:
            cog = bot.get_cog("Painel")
            view = PainelView(autor_id=int(U), secoes=cog._secoes(), inicio=cog._inicio, acoes=cog._acoes())
            inter = _Inter(["ranking"])
            await view._ao_escolher(inter)
            editado = [e for e in inter.eventos if isinstance(e, tuple) and e[0] == "edit_original"]
            assert editado and "Ranking" in editado[-1][1]["embed"].title
        finally:
            await bot.close()

    _rodar(verificar())


def test_abrir_uma_secao_rende_o_mesmo_ponto_de_reputacao_do_comando():
    async def verificar():
        db = novo_db()
        db.garantir_jogador(G, U)
        antes = db.get_cartao(G, U)["credito"]
        bot = await _bot_carregado(db)
        try:
            cog = bot.get_cog("Painel")
            view = PainelView(autor_id=int(U), secoes=cog._secoes(), inicio=cog._inicio, acoes=cog._acoes())
            await view._ao_escolher(_Inter(["cambio"]))
            assert db.get_cartao(G, U)["credito"] == antes + 1
        finally:
            await bot.close()

    _rodar(verificar())


def test_o_comando_banco_abre_o_inicio_em_privado():
    async def verificar():
        db = novo_db()
        bot = await _bot_carregado(db)
        try:
            cog = bot.get_cog("Painel")
            inter = _Inter([])
            enviados = []

            async def enviar(**kw):
                enviados.append(kw)

            inter.followup = SimpleNamespace(send=enviar)
            await type(cog).banco.callback(cog, inter)
            assert inter.eventos[0] == "defer"
            assert enviados[0]["ephemeral"] is True
            assert "Banco Lunar" in enviados[0]["embed"].title
            assert isinstance(enviados[0]["view"], PainelView)
            nomes = [b.label for b in enviados[0]["view"].children if getattr(b, "label", None)]
            assert {"Início", "Atualizar", "Guardar", "Sacar", "Bilhetes"} <= set(nomes)
        finally:
            await bot.close()

    _rodar(verificar())
