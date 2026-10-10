"""Regressões da revisão do Jornalista (2026-10-04).

Cada teste aqui trava um defeito que os testes anteriores não enxergavam:
ciclos de 24h que viravam 25h, horóscopo que nunca expirava, janela dos baús
reescrita a cada boot, Créditos Sombrios perdidos, loteria sem recuperação,
baús em rajada, estação avançando duas vezes e outros.
"""

from __future__ import annotations

import asyncio
import random
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

import discord
from discord import app_commands

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE))

from cogs import jornal as jornal_mod
from cogs.boasvindas import Boasvindas
from cogs.horoscopo import Horoscopo
from cogs.loteria import Loteria, sorteio_devido
from cogs.registro import Registro
from core import arvores as arvores_mod
from core import clima as clima_mod
from core import db as db_mod
from core import enigmas as enigmas_mod
from core import loot
from core.catalogo import Catalogo
from core.db import Database
from tests.db_utils import novo_db

G, U = "100", "200"
SP = loot.TZ


# ── Gate dos ciclos periódicos ──────────────────────────────────────────────
def _carimbar(db, ciclo, quando):
    with db._conn() as con:
        con.execute(
            """INSERT INTO ciclos_guild (guild_id, ciclo, executado_em) VALUES (%s, %s, %s)
               ON CONFLICT (guild_id, ciclo) DO UPDATE SET executado_em=EXCLUDED.executado_em""",
            (G, ciclo, quando),
        )


def test_ciclo_de_24h_roda_no_tick_exato_de_24h_mesmo_com_o_carimbo_atrasado():
    """O carimbo é gravado depois do envio. O tick 24h depois ainda via o
    carimbo como recente e o ciclo só rodava na hora seguinte (25h)."""
    db = novo_db()
    atraso_do_envio = timedelta(milliseconds=300)
    _carimbar(db, "horoscopo", datetime.now(timezone.utc) - timedelta(hours=24) + atraso_do_envio)
    assert db.ciclo_guild_devido(G, "horoscopo", 24) is True


def test_ciclo_nao_antecipa_uma_rodada_inteira():
    """A folga é pequena perto do período do loop (1h): 23h depois não pode rodar."""
    db = novo_db()
    _carimbar(db, "horoscopo", datetime.now(timezone.utc) - timedelta(hours=23))
    assert db.ciclo_guild_devido(G, "horoscopo", 24) is False
    _carimbar(db, "horoscopo", datetime.now(timezone.utc) - timedelta(hours=23, minutes=30))
    assert db.ciclo_guild_devido(G, "horoscopo", 24) is False
    assert db_mod.CICLO_TOLERANCIA < timedelta(hours=1)


# ── Horóscopo ───────────────────────────────────────────────────────────────
def test_horoscopo_expira_e_nao_vale_para_sempre():
    db = novo_db()
    db.set_horoscopo(G, "aethel")
    assert db.get_horoscopo(G) == "aethel"
    with db._conn() as con:
        con.execute(
            "UPDATE horoscopo_atual SET definido_em = CURRENT_TIMESTAMP - INTERVAL '10 days' WHERE guild_id=%s",
            (G,),
        )
    assert db.get_horoscopo(G) is None


def test_horoscopo_definido_hoje_segue_a_data_de_sao_paulo():
    db = novo_db()
    assert db.horoscopo_definido_hoje(G) is False
    db.set_horoscopo(G, "aethel")
    assert db.horoscopo_definido_hoje(G) is True
    with db._conn() as con:
        con.execute(
            "UPDATE horoscopo_atual SET definido_em = CURRENT_TIMESTAMP - INTERVAL '30 hours' WHERE guild_id=%s",
            (G,),
        )
    assert db.horoscopo_definido_hoje(G) is False


def test_ciclo_do_horoscopo_sorteia_so_quando_o_dia_ainda_nao_tem():
    class _DB:
        def __init__(self, ja_tem):
            self.ja_tem = ja_tem

        def automacao_ativa(self, *_a, **_k):
            return True

        def horoscopo_definido_hoje(self, _gid):
            return self.ja_tem

    class _Guild:
        id = 1

    def rodar(ja_tem):
        publicados = []
        cog = object.__new__(Horoscopo)
        cog.bot = type("Bot", (), {"db": _DB(ja_tem), "guilds": [_Guild()]})()

        async def fake(guild):
            publicados.append(guild.id)
            return "entregue"

        cog._publicar = fake
        asyncio.run(Horoscopo.ciclo.coro(cog))
        return publicados

    assert rodar(ja_tem=False) == [1]
    assert rodar(ja_tem=True) == []  # reiniciar o bot no meio do dia não sorteia de novo


# ── Janela dos baús ─────────────────────────────────────────────────────────
def test_janela_dos_baus_escolhida_pelo_mestre_sobrevive_a_um_reinicio():
    db = novo_db()
    db.atualizar_baus_config(G, ativo=True, min_hora=10, max_hora=22)
    reinicio = Database(db.pool.conninfo)  # re-roda o schema, como um boot
    try:
        cfg = reinicio.get_baus_config(G)
    finally:
        reinicio.fechar()
    assert (cfg["min_hora"], cfg["max_hora"]) == (10, 22)


# ── Baú Sombrio: Créditos Sombrios ──────────────────────────────────────────
def _premio_sombrio(creditos=40):
    return {
        "lunaris": 0, "creditos_sombrios": creditos, "itens": [],
        "bau": {"raridade": "raro", "nome": "Baú Raro", "expira_minutos": 90},
    }


def _saldos(db, user=U, guild=G):
    with db._conn() as con:
        rows = con.execute(
            "SELECT moeda, saldo FROM carteira WHERE guild_id=%s AND user_id=%s", (guild, user)
        ).fetchall()
    return {r["moeda"]: r["saldo"] for r in rows}


def test_entrega_legada_do_bau_sombrio_credita_e_mostra_os_creditos():
    db = novo_db()
    db.registrar_bau_entrega_pendente(G, "m1", "c1", U, _premio_sombrio(40), "legado")
    resultado = db.entregar_bau_legado(G, "m1")
    assert resultado["ganhos"] == ["🕳️ 40 Créditos Sombrios"]  # antes: "☾ 0 Lunaris"
    assert _saldos(db)["Créditos Sombrios"] == 40


def test_creditos_sombrios_entram_na_transacao_que_fecha_a_entrega():
    """Reprocessar (retry do recovery) não pode pagar os créditos duas vezes."""
    db = novo_db()
    db.registrar_bau_entrega_pendente(G, "m2", "c1", U, _premio_sombrio(40), "plataforma")
    for _ in range(2):
        db.marcar_bau_entrega_entregue(
            G, "m2", {"ganhos": [], "confirmado": True}, vencedor_user_id=U,
            lunaris=0, creditos_sombrios=40,
        )
    assert _saldos(db)["Créditos Sombrios"] == 40


def test_creditos_sombrios_cobrem_todas_as_raridades_em_ordem_crescente():
    ordem = list(loot.BAU_RARIDADES)  # comum ... mitico
    assert set(loot.CREDITOS_SOMBRIOS_BAU) == set(ordem)
    maximos = [loot.CREDITOS_SOMBRIOS_BAU[r][1] for r in ordem]
    minimos = [loot.CREDITOS_SOMBRIOS_BAU[r][0] for r in ordem]
    assert maximos == sorted(maximos) and minimos == sorted(minimos)  # épico não paga menos que raro


def test_bau_sombrio_pode_sortear_item_mitico_do_catalogo():
    """A raridade Mítica de um item é "reliquia" no catálogo; a chave era
    "mitico" e nunca casava com nenhum item."""
    catalogo = Catalogo()
    catalogo.carregar_dados({"entradas": [
        {"tipo": "arma", "id": "faca-negra", "titulo": "Faca Negra",
         "conteudo": {"raridade": "mitico", "mercado_negro": True}},
    ]})
    item = loot.sortear_item_sombrio(catalogo, rng=random.Random(1))
    assert item is not None and item.id == "faca-negra"


# ── Frequência dos baús ─────────────────────────────────────────────────────
def test_proximo_bau_depois_de_um_drop_sempre_cai_no_dia_seguinte():
    agora = datetime(2026, 10, 4, 14, 30, tzinfo=SP) if SP else datetime(2026, 10, 4, 14, 30)
    for semente in range(200):
        prox = loot.agendar_proximo(0, 23, rng=random.Random(semente), agora=agora, proximo_dia=True)
        assert prox.date() == (agora + timedelta(days=1)).date()


def test_ligar_os_baus_ainda_agenda_para_o_proximo_horario_possivel():
    agora = datetime(2026, 10, 4, 3, 0, tzinfo=SP) if SP else datetime(2026, 10, 4, 3, 0)
    prox = loot.agendar_proximo(10, 22, rng=random.Random(1), agora=agora)
    assert prox.date() == agora.date()  # hoje mesmo, ainda dá tempo


def test_no_maximo_um_bau_por_dia_numa_simulacao_longa():
    rng = random.Random(7)
    t = datetime(2026, 1, 1, 12, 0)
    drops = []
    prox = loot.agendar_proximo(0, 23, rng=rng, agora=t)
    while prox < t + timedelta(days=400):
        drops.append(prox)
        prox = loot.agendar_proximo(0, 23, rng=rng, agora=prox, proximo_dia=True)
    por_dia = {}
    for d in drops:
        por_dia[d.date()] = por_dia.get(d.date(), 0) + 1
    assert max(por_dia.values()) == 1


# ── Loteria ─────────────────────────────────────────────────────────────────
def _sp(ano, mes, dia, hora, minuto=0):
    return datetime(ano, mes, dia, hora, minuto, tzinfo=SP) if SP else datetime(ano, mes, dia, hora, minuto)


def test_sorteio_devido_domingo_18h_e_recuperacao_ate_24h_depois():
    domingo = _sp(2026, 10, 4, 18)  # 2026-10-04 é domingo
    assert domingo.weekday() == 6
    assert sorteio_devido(_sp(2026, 10, 4, 17, 59)) is None
    assert sorteio_devido(_sp(2026, 10, 4, 18, 0)) == domingo
    assert sorteio_devido(_sp(2026, 10, 4, 23, 59)) == domingo
    # Bot voltou na segunda de manhã: ainda recupera a rodada de domingo.
    assert sorteio_devido(_sp(2026, 10, 5, 9, 30)) == domingo
    assert sorteio_devido(_sp(2026, 10, 5, 18, 0)) is None  # 24h depois: passou
    assert sorteio_devido(_sp(2026, 10, 8, 12, 0)) is None  # meio da semana


def test_loteria_recuperada_na_segunda_usa_a_rodada_de_domingo(monkeypatch):
    chamadas = []

    class _DB:
        def get_loteria_config(self, _gid):
            return {"preco_bilhete": 25, "corte": 0.1}

        def encerrar_loteria_atomica(self, gid, rodada_id, preco, corte):
            chamadas.append(rodada_id)
            return None

    class _Guild:
        id = 100

    cog = object.__new__(Loteria)
    cog.bot = type("Bot", (), {"db": _DB(), "guilds": [_Guild()]})()
    class _Relogio(datetime):
        @classmethod
        def now(cls, tz=None):
            return _sp(2026, 10, 5, 9, 30)

    # Os globals da própria função: test_comandos recarrega os cogs com
    # load_extension, e `import cogs.loteria` passaria a devolver outro módulo.
    monkeypatch.setitem(Loteria.ciclo.coro.__globals__, "datetime", _Relogio)
    asyncio.run(Loteria.ciclo.coro(cog))
    assert chamadas == ["2026-10-04"]


# ── Boas-vindas ─────────────────────────────────────────────────────────────
def test_boas_vindas_ignoram_bots():
    class _DB:
        def automacao_ativa(self, *_a, **_k):
            raise AssertionError("não era para consultar nada para um bot")

    cog = object.__new__(Boasvindas)
    cog.bot = type("Bot", (), {"db": _DB()})()
    bot_membro = type("M", (), {"bot": True, "guild": type("G", (), {"id": 1})(), "id": 5})()
    asyncio.run(Boasvindas.on_member_join(cog, bot_membro))
    asyncio.run(Boasvindas.on_member_remove(cog, bot_membro))


# ── Estação e clima ─────────────────────────────────────────────────────────
def test_estacao_automatica_publica_antes_de_mudar_e_limpa_o_clima(monkeypatch):
    eventos = []

    class _DB:
        def get_estacao(self, _gid):
            return "primavera"

        def get_canal_categoria(self, *_a):
            return None

        def set_estacao(self, gid, nome):
            eventos.append(("estacao", nome))

        def set_modificador_clima(self, gid, mod):
            eventos.append(("clima", mod))

    async def fake_publicar(bot, **kwargs):
        eventos.append(("publicar", kwargs["origem"]))
        return "ocupada"  # o resultado que antes fazia a estação avançar de novo

    monkeypatch.setattr(jornal_mod.publicacoes, "publicar_ou_enfileirar", fake_publicar)
    cog = object.__new__(jornal_mod.Jornal)
    cog.bot = type("Bot", (), {"db": _DB()})()
    asyncio.run(cog._avancar_estacao_auto("1"))
    assert eventos == [("publicar", "estacao_auto"), ("estacao", "verao"), ("clima", None)]


def test_ciclo_da_estacao_marca_o_ciclo_mesmo_quando_a_publicacao_volta_ocupada():
    marcados = []

    class _DB:
        def listar_guilds_estacao_auto(self):
            return ["1"]

        def estacao_gerida_pelo_site(self, _gid):
            return False

        def ciclo_guild_devido(self, *_a):
            return True

        def marcar_ciclo_guild(self, gid, ciclo):
            marcados.append((gid, ciclo))

    cog = object.__new__(jornal_mod.Jornal)
    cog.bot = type("Bot", (), {"db": _DB()})()

    async def fake(_gid):
        return "ocupada"

    cog._avancar_estacao_auto = fake
    asyncio.run(jornal_mod.Jornal.ciclo_estacao_auto.coro(cog))
    assert marcados == [("1", "estacao_auto")]


def test_estrelas_cadentes_nao_promete_o_que_nenhum_codigo_entrega():
    clima = clima_mod.obter("estrelas_cadentes")
    assert clima.modificador_economico is None
    assert "Fragmentos" not in clima.efeito
    # Os modificadores que sobraram são todos consumidos pelo Banqueiro.
    assert {c.modificador_economico for c in clima_mod.CLIMAS} <= {None, "inflacao_loja", "deflacao_loja"}


# ── Registro: vínculo Árvore ↔ cargo ────────────────────────────────────────
def test_cargo_arvore_liga_o_cargo_sem_precisar_do_preset():
    db = novo_db()
    cog = object.__new__(Registro)
    cog.bot = type("Bot", (), {"db": db})()
    arvore = arvores_mod.ARVORES[0]
    enviados = []

    class _Resposta:
        async def send_message(self, texto, **kwargs):
            enviados.append(texto)

    interacao = type("I", (), {"guild_id": 100, "response": _Resposta()})()
    cargo = type("Cargo", (), {"id": 555, "mention": "<@&555>"})()
    escolha = app_commands.Choice(name=arvore.nome, value=arvore.id)
    asyncio.run(Registro.cargo_arvore.callback(cog, interacao, escolha, cargo))
    assert db.get_cargos_arvore("100") == {arvore.id: "555"}
    assert "bônus" in enviados[0]


# ── Fofocas e classificados ─────────────────────────────────────────────────
def test_fofocas_e_classificados_tem_interruptor_proprio_ligado_por_padrao():
    assert jornal_mod.AUTOMACOES["fofocas"][1] is True
    assert jornal_mod.AUTOMACOES["classificados"][1] is True


def test_fofoca_publicada_respeita_o_interruptor():
    db = novo_db()
    agora = datetime.now(timezone.utc)
    db.adicionar_fofoca(G, U, "furo", 60, agora - timedelta(minutes=1))
    fid = db.get_fofoca_pendente_usuario(G, U)["id"]
    publicacao = db.enfileirar_fofoca(fid, {}, agora)
    assert publicacao["automacao"] == "fofocas"


def test_conquista_olho_da_rua_conta_furos_antigos_em_solares_e_novos_em_lunaris():
    db = novo_db()
    with db._conn() as con:
        for moeda in ["Solares"] * 3 + ["Lunaris"] * 2:
            con.execute(
                "INSERT INTO extrato (guild_id, user_id, delta, moeda, descricao) "
                "VALUES (%s, %s, 50, %s, 'Furo comprado pelo Jornalista')",
                (G, U, moeda),
            )
    chaves = {r["chave"] for r in db.avaliar_conquistas_secretas(G, U)}
    assert "olho_rua" in chaves  # 5 furos, somando as duas moedas


# ── Enigma e ajuda ──────────────────────────────────────────────────────────
def test_enigma_da_corda_informa_o_tempo_de_queima():
    corda = next(e for e in enigmas_mod.ENIGMAS if "corda" in e.pergunta.lower())
    assert "60 minutos" in corda.pergunta
    assert "45" in corda.respostas


# ── Clique no baú ───────────────────────────────────────────────────────────
def test_clique_em_bau_que_nao_existe_mais_responde_pelo_followup_depois_do_defer():
    from cogs.baus import Baus

    eventos = []

    class _Resposta:
        async def defer(self, **kwargs):
            eventos.append("defer")

        async def send_message(self, *a, **k):
            eventos.append("send_message")  # depois do defer isto estouraria no Discord

    class _Followup:
        async def send(self, texto=None, **kwargs):
            eventos.append(("followup", texto))

    class _DB:
        def get_bau_no_ar(self, token):
            return None

        def get_bau_entrega(self, *_a):
            return None

    cog = object.__new__(Baus)
    cog.bot = type("Bot", (), {"db": _DB()})()
    interacao = type(
        "I", (), {"response": _Resposta(), "followup": _Followup(), "guild_id": 1, "message": None}
    )()
    asyncio.run(Baus.abrir_bau_click(cog, interacao, "t" * 32))
    assert eventos[0] == "defer"
    assert "send_message" not in eventos
    assert eventos[1][0] == "followup" and "não está mais disponível" in eventos[1][1]


def test_status_avisa_quando_faltam_cargos_das_arvores_para_o_horoscopo():
    db = novo_db()
    enviados = []

    class _Resposta:
        async def send_message(self, *_a, embed=None, **_k):
            enviados.append(embed)

    class _Guild:
        def get_channel(self, _id):
            return None

    interacao = type(
        "I", (), {"guild_id": 100, "guild": _Guild(), "response": _Resposta()}
    )()
    cog = object.__new__(jornal_mod.Jornal)
    cog.bot = type("Bot", (), {"db": db})()

    def ajustes():
        enviados.clear()
        asyncio.run(jornal_mod.Jornal.status.callback(cog, interacao))
        campos = {c.name: c.value for c in enviados[0].fields}
        return campos.get("Próximos ajustes", "")

    assert "/registro cargo_arvore" in ajustes()
    for arvore in arvores_mod.ARVORES:
        db.set_cargo_arvore("100", arvore.id, "1")
    assert "cargo_arvore" not in ajustes()
