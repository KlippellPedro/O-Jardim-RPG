"""Formas e fonte do token contra Postgres real (routers/mapa_formas.py, routers/mapa_encontros.py).

Só roda com TEST_DATABASE_URL (Postgres descartável), nunca contra o banco de produção."""

from __future__ import annotations

import os
import unittest
import uuid

import psycopg
from fastapi import HTTPException
from psycopg import sql
from psycopg.conninfo import make_conninfo
from psycopg.types.json import Jsonb

from core import tempo_real

TEST_DSN = (os.getenv("TEST_DATABASE_URL") or "").strip()


@unittest.skipUnless(TEST_DSN, "TEST_DATABASE_URL nao configurada")
class FormasEFonteBancoTests(unittest.TestCase):
    def setUp(self):
        from core.database import Database
        from core.dependencies import AuthenticatedUser

        if TEST_DSN == (os.getenv("DATABASE_URL") or "").strip():
            self.fail("TEST_DATABASE_URL nao pode ser o banco de producao")
        self.schema = f"jardim_test_{uuid.uuid4().hex}"
        with psycopg.connect(TEST_DSN, autocommit=True) as connection:
            connection.execute(sql.SQL("CREATE SCHEMA {}").format(sql.Identifier(self.schema)))
        self.database = Database(make_conninfo(TEST_DSN, options=f"-c search_path={self.schema}"))
        self.database.open()
        self.campanha_id = uuid.uuid4()

        def usuario(email, nome, papel, plataforma="player"):
            pessoa = AuthenticatedUser(
                id=uuid.uuid4(), email=email, nome_exibicao=nome, admin_plataforma=False,
                papel_plataforma=plataforma, session_id=uuid.uuid4(), csrf_hash="hash",
            )
            with self.database.connection() as connection:
                connection.execute(
                    "INSERT INTO usuarios (id, email, nome_exibicao, senha_hash, papel_plataforma) VALUES (%s, %s, %s, 'hash', %s)",
                    (pessoa.id, email, nome, plataforma),
                )
                if papel == "mestre":
                    connection.execute("INSERT INTO campanhas (id, dono_id, nome) VALUES (%s, %s, 'Mesa')", (self.campanha_id, pessoa.id))
                connection.execute(
                    "INSERT INTO membros_campanha (campanha_id, usuario_id, papel) VALUES (%s, %s, %s)",
                    (self.campanha_id, pessoa.id, papel),
                )
            return pessoa

        self.mestre = usuario("forma-mestre@example.com", "Mestre", "mestre", plataforma="mestre")
        self.ana = usuario("forma-ana@example.com", "Ana", "jogador")
        self.cena, self.sessao = uuid.uuid4(), uuid.uuid4()
        self.personagem, self.token_ana = uuid.uuid4(), uuid.uuid4()
        self.participante, self.token_lobo = uuid.uuid4(), uuid.uuid4()
        self.base = self._imagem(self.mestre, "Lobo")
        self.ferido = self._imagem(self.mestre, "Lobo ferido")
        with self.database.connection() as connection:
            connection.execute(
                "INSERT INTO sessoes_mesa (id, campanha_id, status, titulo, aberta_por) VALUES (%s, %s, 'aberta', 'Noite', %s)",
                (self.sessao, self.campanha_id, self.mestre.id),
            )
            connection.execute(
                "INSERT INTO mapa_cenas (id, campanha_id, nome, largura, altura, ativa) VALUES (%s, %s, 'Clareira', 1200, 900, TRUE)",
                (self.cena, self.campanha_id),
            )
            connection.execute(
                "INSERT INTO personagens (id, campanha_id, dono_usuario_id, criado_por, nome) VALUES (%s, %s, %s, %s, 'Mira')",
                (self.personagem, self.campanha_id, self.ana.id, self.ana.id),
            )
            connection.execute(
                "INSERT INTO mapa_tokens (id, cena_id, personagem_id, x, y, lado) VALUES (%s, %s, %s, 150, 150, 'jogador')",
                (self.token_ana, self.cena, self.personagem),
            )
            connection.execute(
                """
                INSERT INTO sessao_participantes (id, sessao_id, nome, tipo, iniciativa, vida_atual, vida_maxima, visibilidade, ordem, defesa, ataques)
                VALUES (%s, %s, 'Lobo', 'inimigo', 12, 17, 30, 'parcial', 0, 14, %s)
                """,
                (self.participante, self.sessao, Jsonb([{"nome": "Mordida"}])),
            )
            connection.execute(
                "INSERT INTO mapa_tokens (id, cena_id, participante_id, imagem_id, x, y, lado) VALUES (%s, %s, %s, %s, 450, 450, 'inimigo')",
                (self.token_lobo, self.cena, self.participante, self.base),
            )

    def _imagem(self, dono, nome):
        item = uuid.uuid4()
        with self.database.connection() as connection:
            connection.execute(
                "INSERT INTO acervo_itens (id, dono_id, nome, tipo, largura, altura, estado) VALUES (%s, %s, %s, 'token', 256, 256, 'pronto')",
                (item, dono.id, nome),
            )
        return item

    def tearDown(self):
        tempo_real._limpar_para_testes()
        self.database.close()
        with psycopg.connect(TEST_DSN, autocommit=True) as connection:
            connection.execute(sql.SQL("DROP SCHEMA IF EXISTS {} CASCADE").format(sql.Identifier(self.schema)))

    def _ver(self, quem):
        from routers import mapa as rotas

        return rotas.obter_mapa(self.campanha_id, None, user=quem, database=self.database)

    def _lobo(self, quem):
        return next(t for t in self._ver(quem)["tokens"] if t["id"] == str(self.token_lobo))

    def _tokens(self):
        with self.database.connection() as connection:
            return [dict(l) for l in connection.execute(
                "SELECT id, nome, x, y, lado, participante_id, fonte FROM mapa_tokens WHERE cena_id=%s", (self.cena,)).fetchall()]

    def _criaturas(self):
        with self.database.connection() as connection:
            return [l["nome"] for l in connection.execute("SELECT nome FROM sessao_participantes WHERE sessao_id=%s ORDER BY ordem", (self.sessao,)).fetchall()]

    def test_forma_ativa_troca_a_imagem_que_a_mesa_recebe_e_o_mestre_ve_o_nome(self):
        from routers import mapa_formas as rotas

        antes = self._lobo(self.ana)["imagem"]
        resposta = rotas.adicionar_forma(self.campanha_id, self.token_lobo, rotas.FormaInput(imagem_id=self.ferido, nome="Ferido"), user=self.mestre, database=self.database)
        lobo = next(t for t in resposta["tokens"] if t["id"] == str(self.token_lobo))
        self.assertEqual([f["nome"] for f in lobo["formas"]], ["Ferido"])
        self.assertIsNone(lobo["forma_ativa"])
        self.assertEqual(lobo["imagem_id"], str(self.base))
        forma_id = lobo["formas"][0]["id"]

        rotas.escolher_forma(self.campanha_id, self.token_lobo, rotas.FormaAtivaInput(forma=forma_id), user=self.mestre, database=self.database)
        do_mestre = self._lobo(self.mestre)
        self.assertEqual((do_mestre["forma_ativa"], do_mestre["imagem_id"]), (forma_id, str(self.ferido)))
        da_ana = self._lobo(self.ana)
        self.assertNotEqual(da_ana["imagem"], antes, "a versão da imagem muda, e o navegador baixa a forma nova")
        # A jogadora nunca recebe a lista de formas, nem os ids das imagens, nem a fonte.
        for campo in ("formas", "forma_ativa", "imagem_id", "fonte"):
            self.assertNotIn(campo, da_ana)

        rotas.escolher_forma(self.campanha_id, self.token_lobo, rotas.FormaAtivaInput(forma=None), user=self.mestre, database=self.database)
        self.assertEqual(self._lobo(self.ana)["imagem"], antes)

    def test_so_o_mestre_e_nao_no_token_de_personagem_e_no_maximo_oito(self):
        from routers import mapa_formas as rotas

        com = lambda token, imagem, quem: rotas.adicionar_forma(self.campanha_id, token, rotas.FormaInput(imagem_id=imagem), user=quem, database=self.database)
        for chamada, esperado in (
            (lambda: com(self.token_lobo, self.ferido, self.ana), 403),
            (lambda: com(self.token_ana, self.ferido, self.mestre), 422),
            (lambda: com(self.token_lobo, uuid.uuid4(), self.mestre), 404),
        ):
            with self.assertRaises(HTTPException) as erro:
                chamada()
            self.assertEqual(erro.exception.status_code, esperado)
        # A imagem de outra pessoa que não é o Mestre também não entra.
        alheia = self._imagem(self.ana, "da Ana")
        with self.assertRaises(HTTPException) as erro:
            com(self.token_lobo, alheia, self.mestre)
        self.assertEqual(erro.exception.status_code, 404)
        for _ in range(8):
            com(self.token_lobo, self.ferido, self.mestre)
        with self.assertRaises(HTTPException) as erro:
            com(self.token_lobo, self.ferido, self.mestre)
        self.assertEqual(erro.exception.status_code, 409)

    def test_apagar_a_forma_ativa_volta_a_imagem_de_base_e_renomear_funciona(self):
        from routers import mapa_formas as rotas

        resposta = rotas.adicionar_forma(self.campanha_id, self.token_lobo, rotas.FormaInput(imagem_id=self.ferido), user=self.mestre, database=self.database)
        forma_id = next(t for t in resposta["tokens"] if t["id"] == str(self.token_lobo))["formas"][0]["id"]
        rotas.escolher_forma(self.campanha_id, self.token_lobo, rotas.FormaAtivaInput(forma=forma_id), user=self.mestre, database=self.database)
        renomeada = rotas.renomear_forma(self.campanha_id, self.token_lobo, forma_id, rotas.FormaNomeInput(nome="  Quase   morto "), user=self.mestre, database=self.database)
        self.assertEqual(next(t for t in renomeada["tokens"] if t["id"] == str(self.token_lobo))["formas"][0]["nome"], "Quase morto")
        with self.assertRaises(HTTPException) as erro:
            rotas.escolher_forma(self.campanha_id, self.token_lobo, rotas.FormaAtivaInput(forma="nao-existe"), user=self.mestre, database=self.database)
        self.assertEqual(erro.exception.status_code, 404)
        rotas.apagar_forma(self.campanha_id, self.token_lobo, forma_id, user=self.mestre, database=self.database)
        lobo = self._lobo(self.mestre)
        self.assertEqual((lobo["formas"], lobo["forma_ativa"], lobo["imagem_id"]), ([], None, str(self.base)))
        with self.assertRaises(HTTPException) as erro:
            rotas.apagar_forma(self.campanha_id, self.token_lobo, forma_id, user=self.mestre, database=self.database)
        self.assertEqual(erro.exception.status_code, 404)

    def test_fonte_gera_copias_numeradas_ate_o_limite_e_recarrega(self):
        from routers import mapa_encontros as rotas

        ligada = rotas.configurar_fonte(self.campanha_id, self.token_lobo, rotas.FonteInput(ativa=True, limite=2), user=self.mestre, database=self.database)
        self.assertEqual(next(t for t in ligada["tokens"] if t["id"] == str(self.token_lobo))["fonte"], {"limite": 2, "usados": 0})
        self.assertNotIn("fonte", self._lobo(self.ana))
        for x, y in ((800, 500), (900, 500)):
            rotas.soltar_da_fonte(self.campanha_id, self.token_lobo, rotas.PontoInput(x=x, y=y), user=self.mestre, database=self.database)
        self.assertEqual(self._criaturas(), ["Lobo", "Lobo 2", "Lobo 3"], "cada cópia entra na iniciativa com o nome numerado")
        lobos = [t for t in self._tokens() if t["lado"] == "inimigo"]
        self.assertEqual(len(lobos), 3)
        self.assertEqual(len({(t["x"], t["y"]) for t in lobos}), 3)
        self.assertEqual([t for t in lobos if t["fonte"]][0]["id"], self.token_lobo, "só o original é fonte, não as cópias")
        with self.assertRaises(HTTPException) as erro:
            rotas.soltar_da_fonte(self.campanha_id, self.token_lobo, rotas.PontoInput(x=1000, y=500), user=self.mestre, database=self.database)
        self.assertEqual(erro.exception.status_code, 409)
        self.assertEqual(len(self._tokens()), 4)
        rotas.configurar_fonte(self.campanha_id, self.token_lobo, rotas.FonteInput(ativa=True, limite=2, reiniciar=True), user=self.mestre, database=self.database)
        rotas.soltar_da_fonte(self.campanha_id, self.token_lobo, rotas.PontoInput(x=1000, y=500), user=self.mestre, database=self.database)
        self.assertEqual(len(self._tokens()), 5)
        # Desligar tira a fonte.
        rotas.configurar_fonte(self.campanha_id, self.token_lobo, rotas.FonteInput(ativa=False), user=self.mestre, database=self.database)
        self.assertIsNone(self._lobo(self.mestre)["fonte"])
        with self.assertRaises(HTTPException) as erro:
            rotas.soltar_da_fonte(self.campanha_id, self.token_lobo, rotas.PontoInput(x=500, y=500), user=self.mestre, database=self.database)
        self.assertEqual(erro.exception.status_code, 409)

    def test_fonte_so_do_mestre_e_nunca_no_token_de_personagem(self):
        from routers import mapa_encontros as rotas

        with self.assertRaises(HTTPException) as erro:
            rotas.configurar_fonte(self.campanha_id, self.token_lobo, rotas.FonteInput(ativa=True), user=self.ana, database=self.database)
        self.assertEqual(erro.exception.status_code, 403)
        with self.assertRaises(HTTPException) as erro:
            rotas.configurar_fonte(self.campanha_id, self.token_ana, rotas.FonteInput(ativa=True), user=self.mestre, database=self.database)
        self.assertEqual(erro.exception.status_code, 422)

    def test_a_copia_da_fonte_leva_a_forma_que_estava_valendo_como_imagem_de_base_do_molde(self):
        """O molde copia o token como a mesa o vê agora: com a forma ativa, a cópia nasce com essa imagem."""
        from routers import mapa_encontros as rotas_enc
        from routers import mapa_formas as rotas

        resposta = rotas.adicionar_forma(self.campanha_id, self.token_lobo, rotas.FormaInput(imagem_id=self.ferido), user=self.mestre, database=self.database)
        forma_id = next(t for t in resposta["tokens"] if t["id"] == str(self.token_lobo))["formas"][0]["id"]
        rotas.escolher_forma(self.campanha_id, self.token_lobo, rotas.FormaAtivaInput(forma=forma_id), user=self.mestre, database=self.database)
        rotas_enc.duplicar_token(self.campanha_id, self.token_lobo, rotas_enc.DuplicarInput(quantidade=1), user=self.mestre, database=self.database)
        with self.database.connection() as connection:
            copia = connection.execute("SELECT imagem_id, formas FROM mapa_tokens WHERE id <> %s AND lado='inimigo'", (self.token_lobo,)).fetchone()
        self.assertEqual(copia["imagem_id"], self.ferido)
        self.assertEqual(copia["formas"], [])
