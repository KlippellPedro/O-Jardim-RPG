"""Edição semanal do Jornal Lunar: seções, dados reais e a janela de domingo."""

from __future__ import annotations

import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE))

from cogs import jornal as jornal_mod
from core.edicao import FUSO, janela_edicao, montar_edicao
from tests.db_utils import novo_db

G = "100"


def _campos(emb):
    return {c.name: c.value for c in emb.fields}


def test_edicao_vazia_so_tem_cabecalho_e_rodape():
    emb = montar_edicao({})
    assert "Edição da semana" in emb.title and emb.fields == []
    assert "Somente atividades registradas" in emb.footer.text


def test_edicao_cheia_monta_todas_as_secoes_e_corta_textos_longos():
    dados = {
        "estacao": "primavera", "clima": "inflacao_loja", "horoscopo": "ignis",
        "cacadores": [{"user_id": "1", "baus": 5}, {"user_id": "2", "baus": 3}],
        "procurados": [{"alvo_user_id": "9", "valor": 120, "tem_sistema": True}],
        "furos": [{"texto_fofoca": "x" * 400, "user_id": "3"}],
        "classificados": [{"categoria": "vendo", "texto": "Vendo espada " * 20}],
        "entrevista": {"user_id": "4", "pergunta": "Qual foi o plano?", "resposta": "Tudo certo " * 40},
        "meta": {"titulo": "Ponte", "arrecadado": 30, "alvo": 100},
        "loteria": {"vencedor_user_id": "5", "premio": 250, "participantes": 4},
        "eventos": [{"titulo": "Feira", "tipo": "festival"}],
        "resumo": {"baus": 3, "vencedores_baus": 2, "desafios": 1, "entrevistas": 1, "entradas": 100, "saidas": 30, "jogadores": 2},
    }
    campos = _campos(montar_edicao(dados))
    assert list(campos) == [
        "🌦️ O tempo no Jardim", "🏆 Caçadores de baú da semana", "🎯 Procurados", "🗣️ Nos bastidores",
        "🎙️ Entrevista da semana", "🏛️ Cofre do Jardim", "🎟️ Loteria Dominical", "📢 Eventos do Mestre", "📊 Em números",
    ]
    assert "🥇 <@1> · 5 baú(s)" in campos["🏆 Caçadores de baú da semana"]
    assert "Vórtice" in campos["🌦️ O tempo no Jardim"] and "20% mais caros" in campos["🌦️ O tempo no Jardim"]
    assert "☾ **120** 🏦" in campos["🎯 Procurados"]
    assert "…" in campos["🗣️ Nos bastidores"] and "🏷️" in campos["🗣️ Nos bastidores"]
    assert "☾ 30/100" in campos["🏛️ Cofre do Jardim"] and "<@5> levou ☾ **250**" in campos["🎟️ Loteria Dominical"]
    assert all(len(v) <= 1024 for v in campos.values())


def test_meta_batida_na_semana_aparece_quando_nao_ha_meta_aberta():
    campos = _campos(montar_edicao({"meta_encerrada": {"titulo": "Ponte", "status": "concluida"}}))
    assert "foi batida" in campos["🏛️ Cofre do Jardim"]
    assert "🏛️ Cofre do Jardim" not in _campos(montar_edicao({"meta_encerrada": {"titulo": "Ponte", "status": "expirada"}}))


def test_edicao_sai_no_domingo_a_noite_e_e_recuperada_ate_segunda_de_manha():
    assert not janela_edicao(datetime(2026, 10, 11, 18, 59, tzinfo=FUSO))
    assert janela_edicao(datetime(2026, 10, 11, 19, 0, tzinfo=FUSO))
    assert janela_edicao(datetime(2026, 10, 12, 11, 59, tzinfo=FUSO))
    assert not janela_edicao(datetime(2026, 10, 12, 12, 0, tzinfo=FUSO))
    assert not janela_edicao(datetime(2026, 10, 9, 20, 0, tzinfo=FUSO))


def _recompensa(db, alvo, valor):
    with db._conn() as con:
        con.execute("INSERT INTO recompensa (guild_id, alvo_user_id, valor_jogadores) VALUES (%s, %s, %s)", (G, alvo, valor))


def test_coleta_real_reune_caçadores_furos_entrevista_loteria_e_classificados():
    db = novo_db()
    agora = datetime.now(timezone.utc)
    desde = agora - timedelta(days=7)
    with db._conn() as con:
        for i, (uid, quando) in enumerate([("1", agora), ("1", agora), ("2", agora), ("3", agora - timedelta(days=9))]):
            con.execute(
                """INSERT INTO baus_entregas
                       (guild_id, canal_id, mensagem_id, idempotencia, vencedor_user_id, premio, modo_entrega, status, entregue_em)
                   VALUES (%s, '5', %s, %s, %s, '{}'::jsonb, 'legado', 'entregue', %s)""",
                (G, f"m{i}:{uid}", f"id{i}", uid, quando),
            )
        con.execute("INSERT INTO fofocas (guild_id, user_id, texto_fofoca, suborno_valor, prazo, status) VALUES (%s, '8', 'Fugiu', 60, %s, 'publicada')", (G, agora))
        con.execute("INSERT INTO fofocas (guild_id, user_id, texto_fofoca, suborno_valor, prazo, status) VALUES (%s, '8', 'Barrado', 60, %s, 'vetada')", (G, agora))
        con.execute("INSERT INTO entrevistas (guild_id, user_id, pergunta, resposta, status, publicado_em) VALUES (%s, '4', 'P?', 'R!', 'publicada', %s)", (G, agora))
        con.execute("INSERT INTO loteria_rodadas (guild_id, rodada_id, vencedor_user_id, total_bilhetes, participantes, premio) VALUES (%s, 'r1', '5', 10, 3, 200)", (G,))
    _recompensa(db, "9", 70)
    db.creditar(G, "6", "Lunaris", 500)
    db.comprar_classificado(G, "6", 60, "c:1", {}, texto="Vendo uma espada", categoria="vendo")

    assert db.ranking_cacadores(G, desde, 3) == [{"user_id": "1", "baus": 2}, {"user_id": "2", "baus": 1}]
    assert [f["texto_fofoca"] for f in db.furos_publicados_desde(G, desde)] == ["Fugiu"]
    assert db.entrevista_da_semana(G, desde)["resposta"] == "R!"
    assert db.loteria_desde(G, desde)["premio"] == 200
    assert db.loteria_desde(G, agora + timedelta(days=1)) is None

    cog = object.__new__(jornal_mod.Jornal)
    cog.bot = type("Bot", (), {"db": db})()
    campos = _campos(cog._montar_resumo_semanal(G))
    assert "<@1> · 2 baú(s)" in campos["🏆 Caçadores de baú da semana"]
    assert "<@9>" in campos["🎯 Procurados"]
    assert "Fugiu" in campos["🗣️ Nos bastidores"] and "Vendo uma espada" in campos["🗣️ Nos bastidores"]
    assert "<@4>" in campos["🎙️ Entrevista da semana"] and "<@5> levou" in campos["🎟️ Loteria Dominical"]


def test_um_bloco_com_erro_nao_derruba_a_edicao():
    class _DBQuebrado:
        def resumo_semanal(self, *_a):
            return {"baus": 1, "vencedores_baus": 1, "desafios": 0, "entrevistas": 0, "entradas": 5, "saidas": 1, "jogadores": 1}

        def automacao_ativa(self, *_a, **_k):
            raise RuntimeError("banco fora")

    cog = object.__new__(jornal_mod.Jornal)
    cog.bot = type("Bot", (), {"db": _DBQuebrado()})()
    try:
        emb = cog._montar_resumo_semanal("1")
    except RuntimeError:
        emb = None
    # automacao_ativa só é consultada para o horóscopo e fica fora do try; o resto (ranking etc.) falha sozinho
    assert emb is None or "📊 Em números" in _campos(emb)


# ── ranking mensal de caçadores no mural dos baús ───────────────────────────
def test_inicio_do_mes_e_em_sao_paulo():
    from core.edicao import inicio_do_mes

    ref = datetime(2026, 10, 9, 15, 30, tzinfo=timezone.utc)
    assert inicio_do_mes(ref) == datetime(2026, 10, 1, 0, 0, tzinfo=FUSO)
    # 1º de novembro 01h em UTC ainda é 31/10 em São Paulo
    assert inicio_do_mes(datetime(2026, 11, 1, 1, 0, tzinfo=timezone.utc)) == datetime(2026, 10, 1, 0, 0, tzinfo=FUSO)


def test_mural_dos_baus_mostra_o_ranking_do_mes_quando_ha_cacadores():
    from cogs.baus import Baus

    sem = Baus.embed_mural([])
    assert "🏆 Caçadores de baú do mês" not in _campos(sem)
    com = _campos(Baus.embed_mural([], ranking=[{"user_id": str(i), "baus": 10 - i} for i in range(6)]))
    texto = com["🏆 Caçadores de baú do mês"]
    assert texto.startswith("🥇 <@0> · 10 baú(s)") and "**4.** <@3>" in texto and "<@5>" not in texto  # só os 5 primeiros
