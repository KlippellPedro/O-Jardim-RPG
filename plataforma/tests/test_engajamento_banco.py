"""Engajamento entre sessões contra Postgres real: agenda, mural, MVP,
rank, avisos e lembretes. Só roda com TEST_DATABASE_URL."""

from __future__ import annotations

import os
import unittest
import uuid
from datetime import datetime, timedelta, timezone

import psycopg
from fastapi import HTTPException
from psycopg import sql
from psycopg.conninfo import make_conninfo
from psycopg.types.json import Jsonb

from core import lembretes
from core.database import Database
from core.dependencies import AuthenticatedUser
from routers import engajamento as eng

TEST_DSN = (os.getenv("TEST_DATABASE_URL") or "").strip()


@unittest.skipUnless(TEST_DSN, "TEST_DATABASE_URL nao configurada")
class EngajamentoBancoTests(unittest.TestCase):
    def setUp(self):
        if TEST_DSN == (os.getenv("DATABASE_URL") or "").strip():
            self.fail("TEST_DATABASE_URL nao pode ser o banco de producao")
        self.schema = f"jardim_test_{uuid.uuid4().hex}"
        with psycopg.connect(TEST_DSN, autocommit=True) as connection:
            connection.execute(sql.SQL("CREATE SCHEMA {}").format(sql.Identifier(self.schema)))
        self.database = Database(make_conninfo(TEST_DSN, options=f"-c search_path={self.schema}"))
        self.database.open()
        self.campanha = uuid.uuid4()
        self.mestre = self._usuario("eng-mestre@example.com", "Mestre", "mestre")
        self.ana = self._usuario("eng-ana@example.com", "Ana", "jogador")
        self.bruno = self._usuario("eng-bruno@example.com", "Bruno", "jogador")
        self.mira = self._personagem(self.ana, "Mira")
        self.kel = self._personagem(self.bruno, "Kel")

    def tearDown(self):
        self.database.close()
        with psycopg.connect(TEST_DSN, autocommit=True) as connection:
            connection.execute(sql.SQL("DROP SCHEMA IF EXISTS {} CASCADE").format(sql.Identifier(self.schema)))

    # ------------------------------------------------------------ apoio
    def _usuario(self, email, nome, papel):
        usuario = AuthenticatedUser(
            id=uuid.uuid4(), email=email, nome_exibicao=nome, admin_plataforma=False,
            papel_plataforma="player", session_id=uuid.uuid4(), csrf_hash="hash",
        )
        with self.database.connection() as connection:
            connection.execute(
                "INSERT INTO usuarios (id, email, nome_exibicao, senha_hash, papel_plataforma) VALUES (%s, %s, %s, 'hash', 'player')",
                (usuario.id, email, nome),
            )
            if papel == "mestre":
                connection.execute("INSERT INTO campanhas (id, dono_id, nome) VALUES (%s, %s, 'Mesa')", (self.campanha, usuario.id))
            connection.execute(
                "INSERT INTO membros_campanha (campanha_id, usuario_id, papel) VALUES (%s, %s, %s)",
                (self.campanha, usuario.id, papel),
            )
        return usuario

    def _personagem(self, dono, nome):
        personagem_id = uuid.uuid4()
        with self.database.connection() as connection:
            connection.execute(
                "INSERT INTO personagens (id, campanha_id, dono_usuario_id, nome, ficha, criado_por) VALUES (%s, %s, %s, %s, %s, %s)",
                (personagem_id, self.campanha, dono.id, nome, Jsonb({}), dono.id),
            )
        return personagem_id

    def _sessao(self, status="aberta", **extra):
        sessao_id = uuid.uuid4()
        with self.database.connection() as connection:
            connection.execute(
                """
                INSERT INTO sessoes_mesa (id, campanha_id, status, titulo, aberta_por, iniciada_em, encerrada_em)
                VALUES (%s, %s, %s, 'Noite', %s, %s, %s)
                """,
                (sessao_id, self.campanha, status, self.mestre.id,
                 extra.get("iniciada_em", datetime.now(timezone.utc) - timedelta(hours=3)), extra.get("encerrada_em")),
            )
        return sessao_id

    def _ligar_discord(self):
        with self.database.connection() as connection:
            connection.execute(
                """
                CREATE TABLE avisos_pendentes (
                    id SERIAL PRIMARY KEY, guild_id TEXT NOT NULL, mensagem TEXT NOT NULL,
                    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, publicado BOOLEAN NOT NULL DEFAULT FALSE
                )
                """
            )
            connection.execute(
                "INSERT INTO campanhas_discord (campanha_id, discord_guild_id, vinculado_por) VALUES (%s, '999', %s)",
                (self.campanha, self.mestre.id),
            )

    def _avisos_discord(self):
        with self.database.connection() as connection:
            return [linha["mensagem"] for linha in connection.execute("SELECT mensagem FROM avisos_pendentes ORDER BY id").fetchall()]

    def _notificacoes(self, usuario, categoria=None):
        with self.database.connection() as connection:
            linhas = connection.execute(
                "SELECT titulo, mensagem, categoria FROM notificacoes WHERE usuario_id=%s ORDER BY criado_em", (usuario.id,)
            ).fetchall()
        return [linha for linha in linhas if categoria is None or linha["categoria"] == categoria]

    def resumo(self, usuario):
        return eng.resumo_da_home(self.campanha, user=usuario, database=self.database)

    def especial(self, dias=0, horas=0, minutos=0, titulo="Sessão extra", usuario=None):
        return eng.marcar_sessao_especial(
            self.campanha,
            eng.EspecialInput(em=datetime.now(timezone.utc) + timedelta(days=dias, hours=horas, minutes=minutos), titulo=titulo, nota="Tragam poções"),
            user=usuario or self.mestre, database=self.database,
        )

    def fixa(self, dia=4, hora="18:00", **extra):
        return eng.definir_recorrencia(
            self.campanha, eng.RecorrenciaInput(ativa=True, dia_semana=dia, hora=hora, titulo="Noite de RPG", **extra),
            user=self.mestre, database=self.database,
        )

    def calendario(self, usuario, mes=""):
        return eng.calendario(self.campanha, mes=mes, user=usuario, database=self.database)

    # ------------------------------------------------------------ agenda / home
    def test_sessao_especial_mostra_a_contagem_e_avisa_o_site_menos_o_mestre(self):
        self.assertIsNone(self.resumo(self.ana)["proxima_sessao"])
        self.especial(dias=3, horas=1, titulo="Noite da Cripta")
        proxima = self.resumo(self.ana)["proxima_sessao"]
        self.assertEqual((proxima["texto"], proxima["titulo"], proxima["nota"], proxima["tipo"]), ("em 3 dias", "Noite da Cripta", "Tragam poções", "especial"))
        self.assertEqual(len(self._notificacoes(self.ana, "sessao")), 1)
        self.assertEqual(self._notificacoes(self.mestre, "sessao"), [])

    def test_sessao_fixa_aparece_como_proxima_com_o_texto_da_regra(self):
        self.fixa(dia=(datetime.now(timezone.utc) + timedelta(days=2)).weekday(), hora="20:00")
        resumo = self.resumo(self.ana)
        self.assertTrue(resumo["recorrencia_texto"].endswith("às 20:00"))
        self.assertEqual(resumo["proxima_sessao"]["tipo"], "fixa")
        self.assertEqual(resumo["proxima_sessao"]["titulo"], "Noite de RPG")
        self.assertEqual(len(self._notificacoes(self.ana, "sessao")), 1)

    def test_cancelar_uma_semana_pula_para_a_seguinte_e_restaurar_volta(self):
        dia = (datetime.now(timezone.utc) + timedelta(days=2)).weekday()
        self.fixa(dia=dia, hora="12:00", fuso="UTC")
        primeira = self.resumo(self.ana)["proxima_sessao"]["em"][:10]
        resposta = eng.alternar_cancelamento(self.campanha, eng.CancelamentoInput(data=primeira), user=self.mestre, database=self.database)
        self.assertTrue(resposta["cancelada"])
        proxima = self.resumo(self.ana)["proxima_sessao"]
        self.assertNotEqual(proxima["em"][:10], primeira)
        self.assertIn("Sessão cancelada", [n["titulo"] for n in self._notificacoes(self.ana, "sessao")])
        volta = eng.alternar_cancelamento(self.campanha, eng.CancelamentoInput(data=primeira), user=self.mestre, database=self.database)
        self.assertFalse(volta["cancelada"])
        self.assertEqual(self.resumo(self.ana)["proxima_sessao"]["em"][:10], primeira)

    def test_so_se_cancela_dia_de_sessao_fixa(self):
        with self.assertRaises(HTTPException) as erro:
            eng.alternar_cancelamento(self.campanha, eng.CancelamentoInput(data="2026-09-25"), user=self.mestre, database=self.database)
        self.assertEqual(erro.exception.status_code, 422)
        self.fixa(dia=4)
        with self.assertRaises(HTTPException):
            eng.alternar_cancelamento(self.campanha, eng.CancelamentoInput(data="2026-09-24"), user=self.mestre, database=self.database)
        with self.assertRaises(HTTPException):
            eng.alternar_cancelamento(self.campanha, eng.CancelamentoInput(data="25/09/2026"), user=self.mestre, database=self.database)

    def test_calendario_do_mes_traz_fixas_e_especiais_e_so_o_mestre_ve_as_regras(self):
        self.fixa(dia=4, hora="18:00")
        self.especial(dias=1, titulo="Extra")
        agora = datetime.now(timezone.utc)
        mes = agora.strftime("%Y-%m")
        cal = self.calendario(self.ana, mes)
        self.assertEqual(cal["recorrencia"]["texto"], "Toda sexta, às 18:00")
        self.assertTrue(all(s["data"].startswith(mes) for s in cal["sessoes"]))
        self.assertNotIn("especiais", cal)
        self.assertNotIn("avisos", cal)
        do_mestre = self.calendario(self.mestre, mes)
        self.assertEqual(len(do_mestre["especiais"]), 1)
        self.assertIn("sessao", do_mestre["avisos"])
        with self.assertRaises(HTTPException):
            self.calendario(self.ana, "2026-13")

    def test_apagar_sessao_especial_e_limite(self):
        criada = self.especial(dias=2)
        eng.apagar_sessao_especial(self.campanha, criada["id"], user=self.mestre, database=self.database)
        self.assertIsNone(self.resumo(self.mestre)["proxima_sessao"])
        with self.assertRaises(HTTPException) as erro:
            eng.apagar_sessao_especial(self.campanha, criada["id"], user=self.mestre, database=self.database)
        self.assertEqual(erro.exception.status_code, 404)

    def test_desligar_a_sessao_fixa_tira_a_regra(self):
        self.fixa(dia=4)
        eng.definir_recorrencia(self.campanha, eng.RecorrenciaInput(ativa=False), user=self.mestre, database=self.database)
        self.assertEqual(self.resumo(self.ana)["recorrencia_texto"], "")
        self.assertIsNone(self.resumo(self.ana)["proxima_sessao"])
        with self.assertRaises(HTTPException) as erro:
            eng.definir_recorrencia(self.campanha, eng.RecorrenciaInput(ativa=True, dia_semana=9, hora="18:00"), user=self.mestre, database=self.database)
        self.assertEqual(erro.exception.status_code, 422)

    def test_jogador_nao_mexe_na_agenda_nem_nos_avisos(self):
        for chamada in (
            lambda: eng.definir_recorrencia(self.campanha, eng.RecorrenciaInput(ativa=True, dia_semana=4, hora="18:00"), user=self.ana, database=self.database),
            lambda: eng.marcar_sessao_especial(self.campanha, eng.EspecialInput(em=datetime.now(timezone.utc)), user=self.ana, database=self.database),
            lambda: eng.alternar_cancelamento(self.campanha, eng.CancelamentoInput(data="2026-09-25"), user=self.ana, database=self.database),
            lambda: eng.definir_avisos(self.campanha, eng.AvisosInput(avisos={"critico": True}), user=self.ana, database=self.database),
        ):
            with self.assertRaises(HTTPException) as erro:
                chamada()
            self.assertEqual(erro.exception.status_code, 403)

    def test_o_que_mudou_so_conta_depois_da_ultima_visita(self):
        primeira = self.resumo(self.ana)["mudancas"]
        self.assertTrue(primeira["primeira_visita"])
        eng.marcar_visita(self.campanha, user=self.ana, database=self.database)
        self.assertEqual(self.resumo(self.ana)["mudancas"]["mural"], 0)
        eng.publicar_citacao(self.campanha, eng.CitacaoInput(texto="Eu abro a porta"), user=self.bruno, database=self.database)
        self.assertEqual(self.resumo(self.ana)["mudancas"]["mural"], 1)
        # A própria publicação não conta como novidade para quem publicou.
        eng.marcar_visita(self.campanha, user=self.bruno, database=self.database)
        eng.publicar_citacao(self.campanha, eng.CitacaoInput(texto="Outra"), user=self.bruno, database=self.database)
        self.assertEqual(self.resumo(self.bruno)["mudancas"]["mural"], 0)

    def test_conquista_nova_aparece_na_home_do_dono(self):
        eng.marcar_visita(self.campanha, user=self.ana, database=self.database)
        with self.database.connection() as connection:
            connection.execute(
                "INSERT INTO personagem_conquistas (personagem_id, chave) VALUES (%s, 'nivel_10')", (self.mira,)
            )
        novas = self.resumo(self.ana)["conquistas_novas"]
        self.assertEqual([(c["nome"], c["personagem"]) for c in novas], [("Meio Caminho", "Mira")])
        self.assertEqual(self.resumo(self.bruno)["conquistas_novas"], [])

    # ------------------------------------------------------------ mural
    def test_mural_curtir_alterna_e_a_mais_curtida_da_noite_ganha_o_selo(self):
        sessao = self._sessao("aberta")
        a = eng.publicar_citacao(self.campanha, eng.CitacaoInput(texto="Eu não sou um lobo", quem_disse="Kel"), user=self.bruno, database=self.database)["id"]
        b = eng.publicar_citacao(self.campanha, eng.CitacaoInput(texto="Rolei um 1 de novo"), user=self.ana, database=self.database)["id"]
        self.assertEqual(eng.alternar_voto(self.campanha, uuid.UUID(a), user=self.ana, database=self.database), {"votos": 1, "votei": True})
        eng.alternar_voto(self.campanha, uuid.UUID(a), user=self.mestre, database=self.database)
        eng.alternar_voto(self.campanha, uuid.UUID(b), user=self.bruno, database=self.database)
        itens = {i["id"]: i for i in eng.listar_mural(self.campanha, user=self.ana, database=self.database)["itens"]}
        self.assertEqual(itens[a]["votos"], 2)
        self.assertTrue(itens[a]["votei"])
        self.assertTrue(itens[a]["melhor_da_noite"])
        self.assertFalse(itens[b]["melhor_da_noite"])
        self.assertEqual(itens[a]["sessao_id"], str(sessao))
        self.assertEqual(itens[a]["autor"], "Kel")
        # Tirar a curtida devolve o número.
        self.assertEqual(eng.alternar_voto(self.campanha, uuid.UUID(a), user=self.ana, database=self.database), {"votos": 1, "votei": False})

    def test_so_quem_publicou_ou_o_mestre_apaga(self):
        item = uuid.UUID(eng.publicar_citacao(self.campanha, eng.CitacaoInput(texto="oi"), user=self.ana, database=self.database)["id"])
        with self.assertRaises(HTTPException) as erro:
            eng.apagar_item_do_mural(self.campanha, item, user=self.bruno, database=self.database)
        self.assertEqual(erro.exception.status_code, 403)
        eng.apagar_item_do_mural(self.campanha, item, user=self.mestre, database=self.database)
        self.assertEqual(eng.listar_mural(self.campanha, user=self.ana, database=self.database)["itens"], [])

    def test_foto_valida_tipo_tamanho_e_limite(self):
        with self.assertRaises(HTTPException) as erro:
            eng.publicar_foto(self.campanha, eng.FotoInput(imagem="https://exemplo.com/a.png" + "x" * 30), user=self.ana, database=self.database)
        self.assertEqual(erro.exception.status_code, 422)
        with self.assertRaises(HTTPException):
            eng.publicar_foto(self.campanha, eng.FotoInput(imagem="data:text/html;base64," + "A" * 40), user=self.ana, database=self.database)
        ok = "data:image/webp;base64," + "A" * 40
        eng.publicar_foto(self.campanha, eng.FotoInput(imagem=ok, legenda="A turma"), user=self.ana, database=self.database)
        foto = eng.listar_mural(self.campanha, user=self.bruno, database=self.database)["itens"][0]
        self.assertEqual((foto["tipo"], foto["texto"], foto["imagem"]), ("foto", "A turma", ok))
        with self.database.connection() as connection:
            for _ in range(eng.LIMITE_FOTOS - 1):
                connection.execute(
                    "INSERT INTO mural_itens (id, campanha_id, usuario_id, autor_nome, tipo, imagem) VALUES (%s, %s, %s, 'x', 'foto', %s)",
                    (uuid.uuid4(), self.campanha, self.ana.id, ok),
                )
        with self.assertRaises(HTTPException) as erro:
            eng.publicar_foto(self.campanha, eng.FotoInput(imagem=ok), user=self.ana, database=self.database)
        self.assertEqual(erro.exception.status_code, 409)

    # ------------------------------------------------------------ MVP
    def test_mvp_esconde_o_placar_ate_votar_e_nao_aceita_voto_em_si(self):
        sessao = self._sessao("aberta")
        antes = eng.ver_mvp(self.campanha, sessao, user=self.ana, database=self.database)
        self.assertIsNone(antes["resultado"])
        self.assertEqual(sorted(c["nome"] for c in antes["candidatos"]), ["Ana", "Bruno"])
        with self.assertRaises(HTTPException) as erro:
            eng.votar_mvp(self.campanha, eng.MvpInput(sessao_id=sessao, alvo_usuario_id=self.ana.id), user=self.ana, database=self.database)
        self.assertEqual(erro.exception.status_code, 422)
        with self.assertRaises(HTTPException) as erro:
            eng.votar_mvp(self.campanha, eng.MvpInput(sessao_id=sessao, alvo_usuario_id=self.mestre.id), user=self.ana, database=self.database)
        self.assertEqual(erro.exception.status_code, 422)
        depois = eng.votar_mvp(self.campanha, eng.MvpInput(sessao_id=sessao, alvo_usuario_id=self.bruno.id), user=self.ana, database=self.database)
        self.assertEqual(depois["resultado"]["vencedores"][0]["nome"], "Bruno")
        self.assertIsNone(eng.ver_mvp(self.campanha, sessao, user=self.bruno, database=self.database)["resultado"])
        self.assertIsNotNone(eng.ver_mvp(self.campanha, sessao, user=self.mestre, database=self.database)["resultado"])
        with self.assertRaises(HTTPException) as erro:
            eng.votar_mvp(self.campanha, eng.MvpInput(sessao_id=sessao, alvo_usuario_id=self.ana.id), user=self.mestre, database=self.database)
        self.assertEqual(erro.exception.status_code, 403)

    def test_mvp_de_sessao_encerrada_mostra_o_resultado_a_todos(self):
        sessao = self._sessao("encerrada", encerrada_em=datetime.now(timezone.utc))
        eng.votar_mvp(self.campanha, eng.MvpInput(sessao_id=sessao, alvo_usuario_id=self.ana.id), user=self.bruno, database=self.database)
        self.assertEqual(eng.ver_mvp(self.campanha, sessao, user=self.ana, database=self.database)["resultado"]["total_votos"], 1)

    # ------------------------------------------------------------ rank
    def _registro(self, personagem, usuario, tipo, resultado, detalhes=None, sessao=None):
        with self.database.connection() as connection:
            connection.execute(
                """
                INSERT INTO registros_mesa (id, campanha_id, sessao_id, usuario_id, personagem_id, autor_nome, tipo, titulo, resultado, detalhes)
                VALUES (%s, %s, %s, %s, %s, 'x', %s, 'Teste', %s, %s)
                """,
                (uuid.uuid4(), self.campanha, sessao, usuario.id, personagem, tipo, resultado, Jsonb(detalhes or {})),
            )

    def test_rank_da_campanha_reparte_os_titulos(self):
        for _ in range(3):
            self._registro(self.mira, self.ana, "rolagem", 25, {"critico_natural": True})
        self._registro(self.bruno and self.kel, self.bruno, "rolagem", 2, {"falha_natural": True})
        self._registro(self.kel, self.bruno, "dano", 41)
        with self.database.connection() as connection:
            connection.execute(
                """
                INSERT INTO lancamentos_economia (id, campanha_id, personagem_id, moeda, delta, saldo_apos, motivo, origem)
                VALUES (%s, %s, %s, 'Lunaris', -1200, 0, 'Compra na loja', 'loja')
                """,
                (uuid.uuid4(), self.campanha, self.kel),
            )
        rank = eng.rank_da_mesa(self.campanha, periodo="campanha", user=self.ana, database=self.database)
        quem = {t["chave"]: t["nome"] for t in rank["titulos"]}
        self.assertEqual(quem["rei_do_vinte"], "Mira")
        self.assertEqual(quem["azarao"], "Kel")
        self.assertEqual(quem["mao_pesada"], "Kel")
        self.assertEqual(quem["gastador"], "Kel")
        self.assertEqual(rank["jogadores"][0]["nome"], "Mira")

    def test_rank_por_sessao_so_conta_aquela_noite(self):
        antiga = self._sessao("encerrada", iniciada_em=datetime.now(timezone.utc) - timedelta(days=9), encerrada_em=datetime.now(timezone.utc) - timedelta(days=9, hours=-3))
        recente = self._sessao("encerrada", iniciada_em=datetime.now(timezone.utc) - timedelta(hours=6), encerrada_em=datetime.now(timezone.utc) - timedelta(hours=3))
        self._registro(self.mira, self.ana, "rolagem", 25, {"critico_natural": True}, sessao=antiga)
        self._registro(self.kel, self.bruno, "rolagem", 25, {"critico_natural": True}, sessao=recente)
        ultima = eng.rank_da_mesa(self.campanha, periodo="ultima", user=self.ana, database=self.database)
        self.assertEqual(next(t for t in ultima["titulos"] if t["chave"] == "rei_do_vinte")["nome"], "Kel")
        self.assertEqual(eng.rank_da_mesa(self.campanha, periodo="atual", user=self.ana, database=self.database)["titulos"], [])

    # ------------------------------------------------------------ discord
    def test_avisos_do_discord_respeitam_o_que_o_mestre_ligou(self):
        self._ligar_discord()
        self.fixa(dia=4, hora="18:00")
        self.especial(dias=2, titulo="Noite")
        avisos = self._avisos_discord()
        self.assertEqual(len(avisos), 2)
        self.assertIn("Sessão fixa", avisos[0])
        self.assertIn("Sessão especial", avisos[1])
        eng.definir_avisos(self.campanha, eng.AvisosInput(avisos={"sessao": False, "criticoo": True}), user=self.mestre, database=self.database)
        self.especial(dias=3, titulo="Outra")
        self.assertEqual(len(self._avisos_discord()), 2)
        self.assertFalse(self.calendario(self.mestre)["avisos"]["sessao"])

    def test_sem_a_fila_dos_bots_ou_sem_vinculo_nada_quebra(self):
        self.especial(dias=2)
        self.fixa(dia=4)
        self._ligar_discord()  # agora com fila e vinculo, mas o aviso anterior nao volta atras
        self.assertEqual(self._avisos_discord(), [])

    # ------------------------------------------------------------ lembretes
    def _agenda_com_especial(self, **delta):
        em = datetime.now(timezone.utc) + timedelta(**delta)
        with self.database.connection() as connection:
            connection.execute(
                """
                INSERT INTO campanha_agenda (campanha_id, especiais) VALUES (%s, %s)
                ON CONFLICT (campanha_id) DO UPDATE SET especiais=EXCLUDED.especiais,
                    lembrete_para=NULL, lembrete_24h_em=NULL, lembrete_1h_em=NULL
                """,
                (self.campanha, Jsonb([{"id": "e1", "em": em.isoformat(), "titulo": "Noite", "nota": ""}])),
            )
        return em

    def test_lembrete_sai_uma_vez_por_janela_e_mudar_a_sessao_zera(self):
        self._agenda_com_especial(minutes=30)
        self.assertEqual(lembretes.processar(self.database), 1)
        self.assertEqual(lembretes.processar(self.database), 0)
        self.assertEqual(len(self._notificacoes(self.ana, "sessao")), 1)
        self.assertEqual(len(self._notificacoes(self.mestre, "sessao")), 1)
        self._agenda_com_especial(minutes=45)
        self.assertEqual(lembretes.processar(self.database), 1)

    def test_sessao_muito_longe_ou_no_passado_nao_gera_lembrete(self):
        self._agenda_com_especial(days=5)
        self.assertEqual(lembretes.processar(self.database), 0)
        self._agenda_com_especial(hours=-1)
        self.assertEqual(lembretes.processar(self.database), 0)

    def test_lembrete_de_24h_e_o_de_1h_sao_separados(self):
        self._agenda_com_especial(hours=10)
        self.assertEqual(lembretes.processar(self.database), 1)  # 24h
        self.assertEqual(lembretes.processar(self.database), 0)
        with self.database.connection() as connection:
            em = datetime.now(timezone.utc) + timedelta(minutes=50)
            connection.execute("UPDATE campanha_agenda SET especiais=%s", (Jsonb([{"id": "e1", "em": em.isoformat(), "titulo": "Noite", "nota": ""}]),))
        self.assertEqual(lembretes.processar(self.database), 1)  # a sessao mudou: recomeca e sai o de 1h
        self.assertEqual(len(self._notificacoes(self.ana, "sessao")), 2)

    def test_lembrete_da_sessao_fixa_segue_a_semana_e_pula_a_cancelada(self):
        agora = datetime.now(timezone.utc)
        em_20_min = agora + timedelta(minutes=20)
        self.fixa(dia=em_20_min.weekday(), hora=em_20_min.strftime("%H:%M"), fuso="UTC")
        self.assertEqual(lembretes.processar(self.database), 1)
        eng.alternar_cancelamento(self.campanha, eng.CancelamentoInput(data=em_20_min.date().isoformat()), user=self.mestre, database=self.database)
        with self.database.connection() as connection:
            connection.execute("UPDATE campanha_agenda SET lembrete_para=NULL, lembrete_24h_em=NULL, lembrete_1h_em=NULL")
        self.assertEqual(lembretes.processar(self.database), 0)


if __name__ == "__main__":
    unittest.main()
