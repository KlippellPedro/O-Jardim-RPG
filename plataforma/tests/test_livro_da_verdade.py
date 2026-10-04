"""Livro da Verdade: queda de lenda na Sessão, calendário, manchete e selos "Matador de ...".

A primeira parte não precisa de banco (dados e catálogo de selos). A segunda só roda com
TEST_DATABASE_URL configurada, nunca contra o banco de produção.
"""

from __future__ import annotations

import json
import os
import re
import unittest
import uuid
from pathlib import Path
from unittest.mock import patch

import psycopg
from fastapi import HTTPException
from psycopg import sql
from psycopg.conninfo import make_conninfo

from core import conquistas, lendas
from core.calendario import completar
from core.database import Database
from core.dependencies import AuthenticatedUser
from core.discord_avisos import AVISOS_PADRAO, CATEGORIA_DISCORD, ROTULOS_AVISO
from routers.livro_da_verdade import desfazer_queda, marcar_queda, obter_livro
from routers.sessions import (
    _montar_estado,
    _sessao_ativa,
    abrir_sessao,
    adicionar_participante,
    atualizar_participante,
    controlar_turno,
)
from schemas import (
    ParticipantCreateInput,
    ParticipantUpdateInput,
    SessionOpenInput,
    SessionTurnInput,
)

RAIZ = Path(__file__).resolve().parents[2]
TEST_DSN = (os.getenv("TEST_DATABASE_URL") or "").strip()


class DadosDasLendasTests(unittest.TestCase):
    def setUp(self):
        self.lendas = json.loads((RAIZ / "data" / "bestiario" / "lendas-v1.json").read_text(encoding="utf-8"))["lendas"]
        entradas = json.loads((RAIZ / "data" / "loja" / "catalogo.json").read_text(encoding="utf-8"))["entradas"]
        self.catalogo = {item["id"]: item for item in entradas if item["tipo"] == "monstro"}

    def test_sao_as_28_criaturas_com_se_cair_na_ficha(self):
        com_se_cair = {
            ident for ident, item in self.catalogo.items()
            if re.search(r"Se [^,]{1,60} cair", item["conteudo"].get("descricao") or "")
        }
        self.assertEqual(len(self.lendas), 28)
        self.assertEqual({lenda["id"] for lenda in self.lendas}, com_se_cair)

    def test_cada_lenda_bate_com_a_ficha(self):
        for lenda in self.lendas:
            ficha = self.catalogo[lenda["id"]]
            self.assertEqual(lenda["vd"], ficha["conteudo"]["vd"], lenda["id"])
            self.assertIn(lenda["nome"], ficha["titulo"], lenda["id"])
            self.assertIn(lenda["epiteto"].lower(), ficha["titulo"].lower(), lenda["id"])

    def test_campos_e_limites_do_calendario(self):
        for lenda in self.lendas:
            self.assertEqual(len(lenda["verdade"]), 2, lenda["id"])
            self.assertTrue(all(len(par) >= 60 for par in lenda["verdade"]), lenda["id"])
            self.assertLessEqual(len(lenda["calendario"]["titulo"]), 80)
            self.assertLessEqual(len(lenda["calendario"]["nota"]), 600)
            self.assertEqual(lenda["calendario"]["nota"], lenda["consequencia"])
            self.assertLessEqual(len(lenda["manchete"]), 160)

    def test_tom_do_texto_para_o_jogador(self):
        for lenda in self.lendas:
            texto = " ".join([lenda["nome"], lenda["epiteto"], lenda["manchete"], lenda["consequencia"], *lenda["verdade"], lenda["calendario"]["titulo"]])
            self.assertNotRegex(texto, "[—–]", lenda["id"])
            self.assertNotRegex(texto, r"(?i)\beco(s)?\b", lenda["id"])
            self.assertNotRegex(texto, r"(?i)não é [^.;:]{1,60}, é ", lenda["id"])
            self.assertNotRegex(texto, r"\d{2,}\s*(PV|de Vida|VD)", lenda["id"])

    def test_catalogo_de_selos(self):
        chaves = [conquista.chave for conquista in conquistas.CATALOGO]
        self.assertEqual(len(chaves), len(set(chaves)))
        selos = [c for c in conquistas.CATALOGO if c.metrica.startswith("lenda:")]
        self.assertEqual(len(selos), 28)
        self.assertTrue(all(c.secreta and c.raridade == "lendaria" for c in selos))
        deidade = conquistas.POR_CHAVE["cara_a_cara_com_um_deus"]
        self.assertFalse(deidade.secreta)
        self.assertEqual(deidade.metrica, "deidades_encaradas")

    def test_manchete_vai_para_o_canal_de_noticias_e_vem_ligada(self):
        self.assertTrue(AVISOS_PADRAO["manchete"])
        self.assertEqual(CATEGORIA_DISCORD["manchete"], "noticia")
        self.assertIn("manchete", ROTULOS_AVISO)

    def test_todo_efeito_do_livro_entra_no_calendario_e_o_texto_segue_o_tom(self):
        from core import calendario

        com_efeito = [lenda for lenda in self.lendas if lenda.get("efeitos")]
        self.assertEqual({lenda["id"] for lenda in com_efeito}, {"hiemark", "ignarrak", "anzhur", "marenostra", "mareia"})
        for lenda in com_efeito:
            for efeito in lenda["efeitos"]:
                estado = calendario.completar(None)
                aplicado = calendario.adicionar_efeito(estado, {**efeito, "origem": lenda["id"]})
                self.assertIsNotNone(aplicado, lenda["id"])
                self.assertTrue(efeito["texto"] and len(efeito["texto"]) <= 300, lenda["id"])
                self.assertNotRegex(efeito["texto"], "[—–]")
                self.assertNotRegex(efeito["texto"], r"(?i)\beco(s)?\b")
                self.assertNotRegex(efeito["texto"], r"(?i)não é [^.;:]{1,60}, é ")

    def test_efeitos_de_preco_so_citam_tipos_que_a_loja_ajusta(self):
        from core import calendario

        for lenda in self.lendas:
            for efeito in lenda.get("efeitos") or []:
                if efeito["tipo"] == "preco":
                    self.assertTrue(set(efeito["alvos"]) <= calendario.TIPOS_AJUSTAVEIS_NA_LOJA, lenda["id"])
                    self.assertLessEqual(abs(efeito["percentual"]), 20, "efeito de lenda é ajuste, não terremoto")

    def test_regras_dos_efeitos_do_calendario(self):
        from core import calendario

        estado = calendario.completar(None)
        self.assertIsNone(calendario.adicionar_efeito(estado, {"tipo": "estacao", "estacao": "noite_eterna", "meses": 1}), "estação especial não se força")
        self.assertIsNone(calendario.adicionar_efeito(estado, {"tipo": "preco", "alvos": ["arma"], "percentual": 10, "meses": 1}), "arma tem variante de raridade")
        self.assertIsNone(calendario.adicionar_efeito(estado, {"tipo": "preco", "alvos": ["equipamento"], "percentual": 0, "meses": 1}))
        self.assertIsNone(calendario.adicionar_efeito(estado, {"tipo": "preco", "alvos": ["equipamento"], "percentual": 10, "meses": 99}))
        self.assertIsNone(calendario.adicionar_efeito(estado, {"tipo": "outro", "meses": 1}))
        calendario.adicionar_efeito(estado, {"tipo": "estacao", "estacao": "inverno", "meses": 1, "origem": "a"})
        calendario.adicionar_efeito(estado, {"tipo": "estacao", "estacao": "outono", "meses": 1, "origem": "b"})
        self.assertEqual(calendario.estacao_atual(estado), "outono", "o efeito mais novo manda")
        estado["estacao_especial"] = "eclipse"
        self.assertEqual(calendario.estacao_atual(estado), "eclipse", "a estação especial do Mestre manda sobre o efeito")
        estado["estacao_especial"] = None
        estado["hoje"] = {"ano": 1, "mes": 5, "dia": 1}
        self.assertEqual(calendario.estacao_atual(estado), calendario.estacao_do_mes(5), "efeito vencido some")
        for _ in range(calendario.MAX_EFEITOS + 5):
            calendario.adicionar_efeito(estado, {"tipo": "estacao", "estacao": "inverno", "meses": 1})
        self.assertLessEqual(len(estado["efeitos"]), calendario.MAX_EFEITOS)
        self.assertEqual(calendario.completar({"versao": 2})["efeitos"], [], "calendário salvo sem o campo ganha a lista vazia")

    def test_o_navegador_nunca_importa_o_arquivo(self):
        fronteira = (RAIZ / "tools" / "browser-content-boundary.ts").read_text(encoding="utf-8")
        self.assertIn("lendas-v1", fronteira)


@unittest.skipUnless(TEST_DSN, "TEST_DATABASE_URL nao configurada")
class LivroDaVerdadeBancoTests(unittest.TestCase):
    def setUp(self):
        production_dsn = (os.getenv("DATABASE_URL") or "").strip()
        if TEST_DSN == production_dsn:
            self.fail("TEST_DATABASE_URL nao pode ser o banco de producao")
        self.schema = f"jardim_test_{uuid.uuid4().hex}"
        with psycopg.connect(TEST_DSN, autocommit=True) as connection:
            connection.execute(sql.SQL("CREATE SCHEMA {}").format(sql.Identifier(self.schema)))
        self.database = Database(make_conninfo(TEST_DSN, options=f"-c search_path={self.schema}"))
        self.database.open()
        self.manchetes: list[str] = []
        parar = patch("core.lendas.avisar_discord", lambda connection, campanha_id, tipo, mensagem: self.manchetes.append(mensagem) or True)
        parar.start()
        self.addCleanup(parar.stop)
        self._montar()

    def tearDown(self):
        self.database.close()
        with psycopg.connect(TEST_DSN, autocommit=True) as connection:
            connection.execute(sql.SQL("DROP SCHEMA IF EXISTS {} CASCADE").format(sql.Identifier(self.schema)))

    def _ator(self, usuario_id, email):
        return AuthenticatedUser(
            id=usuario_id, email=email, nome_exibicao=email.split("@")[0], admin_plataforma=False,
            papel_plataforma="player", session_id=uuid.uuid4(), csrf_hash="hash",
        )

    def _montar(self):
        self.mestre_id, self.ana_id, self.bia_id, self.cai_id = (uuid.uuid4() for _ in range(4))
        self.campanha_id, self.outra_campanha_id = uuid.uuid4(), uuid.uuid4()
        self.heroi_ana, self.heroi_bia, self.heroi_cai = uuid.uuid4(), uuid.uuid4(), uuid.uuid4()
        with self.database.connection() as connection:
            for usuario_id, email in (
                (self.mestre_id, "mestre@example.com"), (self.ana_id, "ana@example.com"),
                (self.bia_id, "bia@example.com"), (self.cai_id, "cai@example.com"),
            ):
                connection.execute(
                    "INSERT INTO usuarios (id, email, nome_exibicao, senha_hash, papel_plataforma) VALUES (%s, %s, %s, 'hash', 'player')",
                    (usuario_id, email, email.split("@")[0]),
                )
            for campanha_id in (self.campanha_id, self.outra_campanha_id):
                connection.execute("INSERT INTO campanhas (id, dono_id, nome) VALUES (%s, %s, 'Mesa')", (campanha_id, self.mestre_id))
                connection.execute(
                    "INSERT INTO membros_campanha (campanha_id, usuario_id, papel) VALUES (%s, %s, 'mestre')",
                    (campanha_id, self.mestre_id),
                )
            for campanha_id, usuario_id in ((self.campanha_id, self.ana_id), (self.campanha_id, self.bia_id), (self.outra_campanha_id, self.cai_id)):
                connection.execute(
                    "INSERT INTO membros_campanha (campanha_id, usuario_id, papel) VALUES (%s, %s, 'jogador')",
                    (campanha_id, usuario_id),
                )
            for personagem_id, campanha_id, dono, nome in (
                (self.heroi_ana, self.campanha_id, self.ana_id, "Ana"),
                (self.heroi_bia, self.campanha_id, self.bia_id, "Bia"),
                (self.heroi_cai, self.outra_campanha_id, self.cai_id, "Caio"),
            ):
                connection.execute(
                    "INSERT INTO personagens (id, campanha_id, dono_usuario_id, nome, criado_por) VALUES (%s, %s, %s, %s, %s)",
                    (personagem_id, campanha_id, dono, nome, dono),
                )
        self.mestre = self._ator(self.mestre_id, "mestre@example.com")
        self.ana = self._ator(self.ana_id, "ana@example.com")

    # -- ajudantes --------------------------------------------------------

    def _sessao_com(self, monstro_id, *, vida=100, titulo="Caçada", campanha_id=None):
        campanha_id = campanha_id or self.campanha_id
        sessao = abrir_sessao(
            SessionOpenInput(campanha_id=campanha_id, titulo=titulo, incluir_personagens=True),
            user=self.mestre, database=self.database,
        )
        sessao_id = sessao["sessao"]["id"]
        criado = adicionar_participante(
            sessao_id, ParticipantCreateInput(nome="Criatura", vida_maxima=vida, monstro_id=monstro_id),
            user=self.mestre, database=self.database,
        )
        return sessao_id, criado["id"]

    def _bater(self, sessao_id, participante_id, **campos):
        return atualizar_participante(
            sessao_id, participante_id, ParticipantUpdateInput(**campos), user=self.mestre, database=self.database,
        )["participante"]

    def _livro(self, usuario, campanha_id=None):
        return obter_livro(campanha_id or self.campanha_id, user=usuario, database=self.database)

    def _quedas(self, campanha_id=None):
        with self.database.connection() as connection:
            return connection.execute(
                "SELECT monstro_id, tipo, personagens FROM campanha_lendas WHERE campanha_id=%s ORDER BY criada_em",
                (campanha_id or self.campanha_id,),
            ).fetchall()

    def _eventos_do_calendario(self):
        with self.database.connection() as connection:
            linha = connection.execute("SELECT estado FROM campanha_calendario WHERE campanha_id=%s", (self.campanha_id,)).fetchone()
        return completar(linha["estado"] if linha else None)["eventos"]

    def _selos(self, personagem_id):
        with self.database.connection() as connection:
            return {
                linha["chave"] for linha in connection.execute(
                    "SELECT chave FROM personagem_conquistas WHERE personagem_id=%s", (personagem_id,)
                ).fetchall()
            }

    def _avaliar(self, personagem_id, gravar=True):
        with self.database.connection() as connection:
            return conquistas.avaliar(connection, personagem_id, gravar=gravar)

    # -- a queda ----------------------------------------------------------

    def test_lenda_a_zero_de_vida_abre_o_livro_marca_o_calendario_e_faz_manchete(self):
        sessao_id, pid = self._sessao_com("vaelthor")
        self._bater(sessao_id, pid, dano=40)
        self.assertEqual(self._quedas(), [], "lenda de pé não abre página")
        self._bater(sessao_id, pid, dano=60)
        quedas = self._quedas()
        self.assertEqual([(q["monstro_id"], q["tipo"]) for q in quedas], [("vaelthor", "queda")])
        self.assertEqual(sorted(item["nome"] for item in quedas[0]["personagens"]), ["Ana", "Bia"])

        eventos = self._eventos_do_calendario()
        self.assertEqual([e["titulo"] for e in eventos], ["A queda de Vaelthor"])
        self.assertEqual(eventos[0]["revelacao"], "aberto")
        self.assertIn("céu verdadeiro", eventos[0]["nota"])

        self.assertEqual(len(self.manchetes), 1)
        self.assertIn("Leviatã Espelhado", self.manchetes[0])
        self.assertIn("Estavam lá: Ana e Bia.", self.manchetes[0])
        self.assertNotIn("campanha", self.manchetes[0].lower())

        with self.database.connection() as connection:
            avisos = connection.execute("SELECT titulo FROM notificacoes WHERE campanha_id=%s", (self.campanha_id,)).fetchall()
        self.assertTrue(any("Vaelthor caiu" == aviso["titulo"] for aviso in avisos))

    def test_bater_de_novo_na_lenda_caida_nao_repete_nada(self):
        sessao_id, pid = self._sessao_com("vaelthor", vida=50)
        self._bater(sessao_id, pid, dano=60)
        self._bater(sessao_id, pid, dano=10)
        self._bater(sessao_id, pid, vida_atual=-5)
        self.assertEqual(len(self._quedas()), 1)
        self.assertEqual(len(self._eventos_do_calendario()), 1)
        self.assertEqual(len(self.manchetes), 1)

    def test_criatura_comum_ou_so_curada_nao_vira_lenda(self):
        sessao_id, pid = self._sessao_com("bandido-qualquer", vida=20)
        self._bater(sessao_id, pid, dano=30)
        self.assertEqual(self._quedas(), [])
        self.assertEqual(self._eventos_do_calendario(), [])

    def test_segunda_queda_em_sessao_nova_so_credita_selo_sem_nova_manchete(self):
        sessao_id, pid = self._sessao_com("gulhar", vida=30)
        self._bater(sessao_id, pid, dano=30)
        from routers.sessions import encerrar_sessao  # encerra a sessão aberta antes da seguinte
        encerrar_sessao(sessao_id, user=self.mestre, database=self.database)
        segunda, pid2 = self._sessao_com("gulhar", vida=30, titulo="De novo")
        self._bater(segunda, pid2, dano=30)
        self.assertEqual(len(self._quedas()), 2)
        self.assertEqual(len(self._eventos_do_calendario()), 1)
        self.assertEqual(len(self.manchetes), 1)

    # -- o Livro ----------------------------------------------------------

    def test_a_mesa_so_ve_as_paginas_das_lendas_que_cairam(self):
        antes = self._livro(self.ana)
        self.assertEqual((antes["total"], antes["caidas"]), (28, 0))
        self.assertTrue(all(item.get("retida") for item in antes["entradas"]))
        self.assertEqual(len(antes["entradas"]), 28)

        sessao_id, pid = self._sessao_com("nyxhael", vida=20)
        self._bater(sessao_id, pid, dano=20)
        depois = self._livro(self.ana)
        self.assertEqual(depois["caidas"], 1)
        aberta = depois["entradas"][0]
        self.assertTrue(aberta["caida"])
        self.assertEqual(aberta["nome"], "Nyxhael")
        self.assertEqual(len(aberta["verdade"]), 2)
        self.assertEqual(aberta["sessao"], "Caçada")
        self.assertEqual(sorted(aberta["por"]), ["Ana", "Bia"])
        retidas = [item for item in depois["entradas"] if not item["caida"]]
        self.assertEqual(len(retidas), 27)
        # Nada que identifique uma lenda de pé: nem nome, nem texto, nem VD.
        for item in retidas:
            self.assertEqual(set(item), {"id", "caida", "retida"})
            self.assertTrue(item["id"].startswith("retida-"))
        texto = json.dumps(retidas, ensure_ascii=False)
        for lenda in lendas.todas():
            if lenda["id"] != "nyxhael":
                self.assertNotIn(lenda["nome"], texto)

    def test_o_mestre_ve_todas_as_lendas_com_o_estado_de_cada_uma(self):
        livro = self._livro(self.mestre)
        self.assertTrue(livro["gestor"])
        self.assertEqual(len(livro["entradas"]), 28)
        self.assertTrue(all(item["nome"] and item["verdade"] and item["consequencia"] and not item["caida"] for item in livro["entradas"]))
        self.assertEqual([item["vd"] for item in livro["entradas"]], sorted(item["vd"] for item in livro["entradas"]))

    def test_o_estado_da_sessao_lista_as_lendas_caidas_para_todos(self):
        sessao_id, pid = self._sessao_com("selah", vida=10)
        self._bater(sessao_id, pid, dano=10)
        with self.database.connection() as connection:
            sessao = _sessao_ativa(connection, self.campanha_id)
            para_a_mesa = _montar_estado(connection, sessao, "jogador", self.ana_id)
        self.assertEqual([lenda["id"] for lenda in para_a_mesa["lendas"]], ["selah"])
        self.assertEqual(set(para_a_mesa["lendas"][0]), {"id", "nome", "epiteto", "consequencia", "em"})

    # -- marcar e desfazer ------------------------------------------------

    def test_mestre_marca_e_desfaz_a_queda_e_so_ele(self):
        with self.assertRaises(HTTPException) as erro:
            marcar_queda(self.campanha_id, "lacuna", user=self.ana, database=self.database)
        self.assertEqual(erro.exception.status_code, 403)
        with self.assertRaises(HTTPException) as erro:
            marcar_queda(self.campanha_id, "nao-existe", user=self.mestre, database=self.database)
        self.assertEqual(erro.exception.status_code, 404)

        # Sem membro com personagem ativo escolhido, ninguém é creditado, mas a página abre.
        livro = marcar_queda(self.campanha_id, "lacuna", user=self.mestre, database=self.database)
        self.assertEqual(livro["caidas"], 1)
        with self.assertRaises(HTTPException) as erro:
            marcar_queda(self.campanha_id, "lacuna", user=self.mestre, database=self.database)
        self.assertEqual(erro.exception.status_code, 409)
        self.assertEqual(len(self._eventos_do_calendario()), 1)

        with self.assertRaises(HTTPException) as erro:
            desfazer_queda(self.campanha_id, "lacuna", user=self.ana, database=self.database)
        self.assertEqual(erro.exception.status_code, 403)
        livro = desfazer_queda(self.campanha_id, "lacuna", user=self.mestre, database=self.database)
        self.assertEqual(livro["caidas"], 0)
        self.assertEqual(self._eventos_do_calendario(), [])
        with self.assertRaises(HTTPException) as erro:
            desfazer_queda(self.campanha_id, "lacuna", user=self.mestre, database=self.database)
        self.assertEqual(erro.exception.status_code, 404)

    def test_desfazer_tira_o_selo_de_quem_foi_creditado(self):
        sessao_id, pid = self._sessao_com("teleios", vida=10)
        self._bater(sessao_id, pid, dano=10)
        self._avaliar(self.heroi_ana)
        self.assertIn("matador_teleios", self._selos(self.heroi_ana))
        desfazer_queda(self.campanha_id, "teleios", user=self.mestre, database=self.database)
        self.assertNotIn("matador_teleios", self._selos(self.heroi_ana))

    # -- selos ------------------------------------------------------------

    def test_selo_matador_so_vai_para_quem_estava_na_mesa(self):
        sessao_id, pid = self._sessao_com("ussurr", vida=10)
        self._bater(sessao_id, pid, dano=10)
        resultado = self._avaliar(self.heroi_ana)
        self.assertIn("matador_ussurr", resultado["novas"])
        item = next(c for c in resultado["catalogo"] if c["chave"] == "matador_ussurr")
        self.assertEqual(item["nome"], "Matador de Ussurr")
        self.assertTrue(item["desbloqueada"])
        # Quem estava em outra campanha não ganha.
        self.assertNotIn("matador_ussurr", self._avaliar(self.heroi_cai)["novas"])
        self.assertNotIn("matador_ussurr", self._selos(self.heroi_cai))

    def test_selo_de_lenda_de_pe_sai_mascarado_na_galeria(self):
        resultado = self._avaliar(self.heroi_ana)
        secretos = [c for c in resultado["catalogo"] if c["secreta"]]
        self.assertEqual(len(secretos), 28)
        for item in secretos:
            self.assertEqual(item["nome"], "Lenda por derrubar")
            self.assertFalse(item["desbloqueada"])
        texto = json.dumps(secretos, ensure_ascii=False)
        for lenda in lendas.todas():
            self.assertNotIn(lenda["nome"], texto)
            self.assertNotIn(lenda["id"], texto)

    def test_quem_so_consulta_a_ficha_nao_gasta_a_comemoracao(self):
        sessao_id, pid = self._sessao_com("apokalyx", vida=10)
        self._bater(sessao_id, pid, dano=10)
        consulta = self._avaliar(self.heroi_ana, gravar=False)
        self.assertEqual(consulta["novas"], [])
        self.assertEqual(self._selos(self.heroi_ana), set())
        self.assertIn("matador_apokalyx", self._avaliar(self.heroi_ana)["novas"])

    def test_encarar_uma_deidade_vale_o_selo_uma_vez_por_personagem(self):
        sessao = abrir_sessao(
            SessionOpenInput(campanha_id=self.campanha_id, titulo="Audiência", incluir_personagens=True),
            user=self.mestre, database=self.database,
        )
        sessao_id = sessao["sessao"]["id"]
        adicionar_participante(
            sessao_id, ParticipantCreateInput(nome="Chronus", vida_maxima=1000, monstro_id="deidade-chronus", visibilidade="oculto"),
            user=self.mestre, database=self.database,
        )
        self.assertNotIn("cara_a_cara_com_um_deus", self._avaliar(self.heroi_ana)["novas"], "só conta quando o grupo a encara")
        controlar_turno(sessao_id, SessionTurnInput(acao="iniciar"), user=self.mestre, database=self.database)
        primeira = self._avaliar(self.heroi_ana)
        self.assertIn("cara_a_cara_com_um_deus", primeira["novas"])
        self.assertNotIn("cara_a_cara_com_um_deus", self._avaliar(self.heroi_ana)["novas"])
        self.assertIn("cara_a_cara_com_um_deus", self._selos(self.heroi_ana) | {c["chave"] for c in self._avaliar(self.heroi_bia)["catalogo"] if c["desbloqueada"]})
        # A Deidade não vira lenda, não abre página no Livro e não faz manchete.
        self.assertEqual([q["tipo"] for q in self._quedas()], ["encontro_deidade"])
        self.assertEqual(self._livro(self.ana)["caidas"], 0)
        self.assertEqual(self.manchetes, [])

    # -- efeitos no mundo -------------------------------------------------

    def _estado_do_calendario(self):
        with self.database.connection() as connection:
            linha = connection.execute("SELECT estado FROM campanha_calendario WHERE campanha_id=%s", (self.campanha_id,)).fetchone()
        return completar(linha["estado"] if linha else None)

    def test_a_queda_de_hiemark_forca_o_inverno_por_tres_meses_e_desfazer_devolve_a_estacao(self):
        from core import calendario

        assert calendario.estacao_atual(self._estado_do_calendario()) == "primavera"
        sessao_id, pid = self._sessao_com("hiemark", vida=10)
        self._bater(sessao_id, pid, dano=10)
        estado = self._estado_do_calendario()
        assert calendario.estacao_atual(estado) == "inverno"
        efeitos = calendario.efeitos_ativos(estado, "estacao")
        assert len(efeitos) == 1 and efeitos[0]["origem"] == "hiemark"
        dias = calendario._dias_do_estado(estado)
        hoje = estado["hoje"]
        depois = calendario.de_dia_absoluto(efeitos[0]["ate"] + 1, dias)
        assert (depois["mes"], depois["dia"]) == ((hoje["mes"] + 3) % calendario.MESES_POR_ANO, hoje["dia"]),             "o efeito de três meses acaba na véspera do mesmo dia, três meses de calendário depois"
        visao = calendario.visao(estado, gestor=False)
        assert visao["estacao"]["chave"] == "inverno" and visao["estacao_normal"] == "primavera"
        assert "neve" in visao["efeitos_do_mundo"][0]["texto"]
        assert any("📌" in linha for linha in self.manchetes[0].split("\n"))
        pagina = self._livro(self.ana)["entradas"][0]
        self.assertEqual(len(pagina["efeitos"]), 1)
        desfazer_queda(self.campanha_id, "hiemark", user=self.mestre, database=self.database)
        estado = self._estado_do_calendario()
        assert calendario.estacao_atual(estado) == "primavera" and estado["efeitos"] == []

    def test_a_queda_de_uma_lenda_de_preco_deixa_o_ajuste_e_a_segunda_queda_nao_empilha(self):
        from core import efeitos_do_mundo

        sessao_id, pid = self._sessao_com("ignarrak", vida=10)
        self._bater(sessao_id, pid, dano=10)
        with self.database.connection() as connection:
            ajustes = efeitos_do_mundo.ajustes_de_preco(connection, self.campanha_id)
        self.assertEqual([(a["origem"], a["percentual"], a["alvos"]) for a in ajustes], [("ignarrak", 10, ["equipamento"])])
        from routers.sessions import encerrar_sessao

        encerrar_sessao(sessao_id, user=self.mestre, database=self.database)
        segunda, pid2 = self._sessao_com("ignarrak", vida=10, titulo="De novo")
        self._bater(segunda, pid2, dano=10)
        with self.database.connection() as connection:
            self.assertEqual(len(efeitos_do_mundo.ajustes_de_preco(connection, self.campanha_id)), 1)

    def test_lenda_sem_efeito_nao_mexe_na_estacao_nem_no_preco(self):
        sessao_id, pid = self._sessao_com("selah", vida=10)
        self._bater(sessao_id, pid, dano=10)
        self.assertEqual(self._estado_do_calendario()["efeitos"], [])

    def test_o_jogador_so_ve_o_efeito_depois_da_queda(self):
        antes = json.dumps(self._livro(self.ana), ensure_ascii=False)
        self.assertNotIn("neve", antes)
        sessao_id, pid = self._sessao_com("hiemark", vida=10)
        self._bater(sessao_id, pid, dano=10)
        self.assertIn("neve", json.dumps(self._livro(self.ana), ensure_ascii=False))

    def test_deidade_que_entra_com_o_combate_aberto_tambem_conta(self):
        sessao = abrir_sessao(
            SessionOpenInput(campanha_id=self.campanha_id, titulo="Audiência", incluir_personagens=True),
            user=self.mestre, database=self.database,
        )
        sessao_id = sessao["sessao"]["id"]
        adicionar_participante(sessao_id, ParticipantCreateInput(nome="Soldado", vida_maxima=10), user=self.mestre, database=self.database)
        controlar_turno(sessao_id, SessionTurnInput(acao="iniciar"), user=self.mestre, database=self.database)
        self.assertEqual(self._quedas(), [])
        adicionar_participante(
            sessao_id, ParticipantCreateInput(nome="Chronus", vida_maxima=1000, monstro_id="deidade-chronus"),
            user=self.mestre, database=self.database,
        )
        self.assertEqual([q["tipo"] for q in self._quedas()], ["encontro_deidade"])
