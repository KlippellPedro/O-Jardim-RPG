"""Mapa ao vivo e acervo contra Postgres real: cenas, tokens, segredos, permissões e pedaços.

Só roda com TEST_DATABASE_URL (Docker Postgres de teste), nunca contra o banco
de produção."""

from __future__ import annotations

import os
import unittest
import uuid

import psycopg
from fastapi import HTTPException
from psycopg import sql
from psycopg.conninfo import make_conninfo
from psycopg.types.json import Jsonb

from core import acervo as acervo_core
from core.database import Database
from core.dependencies import AuthenticatedUser
from routers import acervo, mapa

TEST_DSN = (os.getenv("TEST_DATABASE_URL") or "").strip()
WEBP = b"RIFF\x10\x00\x00\x00WEBPVP8 " + b"\x00" * 8


@unittest.skipUnless(TEST_DSN, "TEST_DATABASE_URL nao configurada")
class MapaBancoTests(unittest.TestCase):
    def setUp(self):
        if TEST_DSN == (os.getenv("DATABASE_URL") or "").strip():
            self.fail("TEST_DATABASE_URL nao pode ser o banco de producao")
        self.schema = f"jardim_test_{uuid.uuid4().hex}"
        with psycopg.connect(TEST_DSN, autocommit=True) as connection:
            connection.execute(sql.SQL("CREATE SCHEMA {}").format(sql.Identifier(self.schema)))
        self.database = Database(make_conninfo(TEST_DSN, options=f"-c search_path={self.schema}"))
        self.database.open()
        self.campanha_id = uuid.uuid4()
        self.mestre = self._usuario("mapa-mestre@example.com", "Mestre", "mestre", plataforma="mestre")
        self.ana = self._usuario("mapa-ana@example.com", "Ana", "jogador")
        self.bruno = self._usuario("mapa-bruno@example.com", "Bruno", "jogador")
        self.mira = uuid.uuid4()
        with self.database.connection() as connection:
            connection.execute(
                "INSERT INTO personagens (id, campanha_id, dono_usuario_id, nome, ficha, criado_por) VALUES (%s, %s, %s, 'Mira', %s, %s)",
                (self.mira, self.campanha_id, self.ana.id,
                 Jsonb({"nivel": 7, "status": {"sanidadeAtual": 60, "sanidadeMaxima": 80}, "foto": "data:image/webp;base64,UklGRhAAAABXRUJQVlA4IAAAAAAAAAAA"}),
                 self.ana.id),
            )

    def tearDown(self):
        self.database.close()
        with psycopg.connect(TEST_DSN, autocommit=True) as connection:
            connection.execute(sql.SQL("DROP SCHEMA IF EXISTS {} CASCADE").format(sql.Identifier(self.schema)))

    def _usuario(self, email, nome, papel, plataforma="player"):
        usuario = AuthenticatedUser(
            id=uuid.uuid4(), email=email, nome_exibicao=nome, admin_plataforma=False,
            papel_plataforma=plataforma, session_id=uuid.uuid4(), csrf_hash="hash",
        )
        with self.database.connection() as connection:
            connection.execute(
                "INSERT INTO usuarios (id, email, nome_exibicao, senha_hash, papel_plataforma) VALUES (%s, %s, %s, 'hash', %s)",
                (usuario.id, email, nome, plataforma),
            )
            if papel == "mestre":
                connection.execute("INSERT INTO campanhas (id, dono_id, nome) VALUES (%s, %s, 'Mesa')", (self.campanha_id, usuario.id))
            connection.execute(
                "INSERT INTO membros_campanha (campanha_id, usuario_id, papel) VALUES (%s, %s, %s)",
                (self.campanha_id, usuario.id, papel),
            )
        return usuario

    def _sessao(self, status="aberta"):
        self.sessao_id = uuid.uuid4()
        with self.database.connection() as connection:
            connection.execute(
                "INSERT INTO sessoes_mesa (id, campanha_id, status, titulo, aberta_por) VALUES (%s, %s, %s, 'Noite 1', %s)",
                (self.sessao_id, self.campanha_id, status, self.mestre.id),
            )
        return self.sessao_id

    def _participante(self, nome, tipo="inimigo", visibilidade="total", personagem_id=None):
        participante_id = uuid.uuid4()
        with self.database.connection() as connection:
            connection.execute(
                """
                INSERT INTO sessao_participantes (id, sessao_id, personagem_id, nome, tipo, vida_atual, vida_maxima, visibilidade)
                VALUES (%s, %s, %s, %s, %s, 12, 40, %s)
                """,
                (participante_id, self.sessao_id, personagem_id, nome, tipo, visibilidade),
            )
        return participante_id

    def _status(self, sessao_status):
        with self.database.connection() as connection:
            connection.execute("UPDATE sessoes_mesa SET status=%s WHERE id=%s", (sessao_status, self.sessao_id))

    def ver(self, usuario, cena_id=None):
        return mapa.obter_mapa(self.campanha_id, cena_id, user=usuario, database=self.database)

    def criar_cena(self, nome="Ruínas", **extra):
        return mapa.criar_cena(self.campanha_id, mapa.CenaInput(nome=nome, **extra), user=self.mestre, database=self.database)

    # ---------------------------------------------------------------- cenas

    def test_primeira_cena_nasce_ativa_e_jogador_so_ve_com_a_sessao_ao_vivo(self):
        self._sessao("preparacao")
        resposta = self.criar_cena()
        self.assertTrue(resposta["cena"]["ativa"])
        self.assertEqual(resposta["cena"]["grade"]["tamanho"], 100)
        self.assertTrue(self.ver(self.ana)["bloqueado"])
        self._status("aberta")
        visto = self.ver(self.ana)
        self.assertFalse(visto["bloqueado"])
        self.assertEqual(visto["cena"]["nome"], "Ruínas")
        self.assertEqual(visto["cenas"], [])

    def test_ativar_troca_a_cena_dos_jogadores(self):
        self._sessao()
        primeira = self.criar_cena("Taverna")["cena"]["id"]
        segunda = self.criar_cena("Estrada")
        self.assertFalse(segunda["cena"]["ativa"])
        mapa.ativar_cena(self.campanha_id, uuid.UUID(segunda["cena"]["id"]), user=self.mestre, database=self.database)
        self.assertEqual(self.ver(self.ana)["cena"]["nome"], "Estrada")
        cenas = {c["id"]: c["ativa"] for c in self.ver(self.mestre)["cenas"]}
        self.assertFalse(cenas[primeira])

    def test_jogador_nao_cria_cena(self):
        with self.assertRaises(HTTPException) as erro:
            mapa.criar_cena(self.campanha_id, mapa.CenaInput(nome="X"), user=self.ana, database=self.database)
        self.assertEqual(erro.exception.status_code, 403)

    def test_grade_invalida_e_recusada(self):
        cena = uuid.UUID(self.criar_cena()["cena"]["id"])
        with self.assertRaises(HTTPException):
            mapa.editar_cena(self.campanha_id, cena, mapa.CenaEdicao(grade={"tamanho": 3}), user=self.mestre, database=self.database)
        editada = mapa.editar_cena(self.campanha_id, cena, mapa.CenaEdicao(grade={"tamanho": 70, "tipo": "hex"}),
                                   user=self.mestre, database=self.database)
        self.assertEqual(editada["cena"]["grade"]["tipo"], "hex")

    # --------------------------------------------------------------- tokens

    def test_trazer_participantes_cria_um_token_por_quem_esta_na_sessao(self):
        self._sessao()
        self._participante("Mira", tipo="jogador", personagem_id=self.mira)
        self._participante("Lobo")
        cena = uuid.UUID(self.criar_cena()["cena"]["id"])
        resposta = mapa.trazer_participantes(self.campanha_id, cena, mapa.PontoInput(x=500, y=500),
                                             user=self.mestre, database=self.database)
        self.assertEqual(resposta["trazidos"], 2)
        de_novo = mapa.trazer_participantes(self.campanha_id, cena, mapa.PontoInput(x=500, y=500),
                                            user=self.mestre, database=self.database)
        self.assertEqual(de_novo["trazidos"], 0)
        da_ana = next(t for t in self.ver(self.ana)["tokens"] if t["e_meu"])
        self.assertEqual(da_ana["nome"], "Mira")
        self.assertEqual(da_ana["nivel"], 7)
        self.assertTrue(da_ana["imagem"])
        tipos = [b["tipo"] for b in da_ana["barras"]]
        self.assertIn("vida", tipos)
        self.assertIn("sanidade", tipos)
        sanidade = next(b for b in da_ana["barras"] if b["tipo"] == "sanidade")
        self.assertEqual((sanidade["atual"], sanidade["maximo"]), (60, 80))

    def test_segredos_do_mestre_nao_chegam_ao_jogador(self):
        self._sessao()
        oculto = self._participante("Assassino", visibilidade="oculto")
        anonimo = self._participante("Lich", visibilidade="desconhecido")
        cena = uuid.UUID(self.criar_cena()["cena"]["id"])
        for participante_id in (oculto, anonimo):
            mapa.criar_token(self.campanha_id, cena, mapa.TokenInput(participante_id=participante_id, x=100, y=100),
                             user=self.mestre, database=self.database)
        mapa.criar_token(self.campanha_id, cena, mapa.TokenInput(nome="Armadilha", x=300, y=300, oculto=True),
                         user=self.mestre, database=self.database)
        do_mestre = self.ver(self.mestre)["tokens"]
        self.assertEqual(len(do_mestre), 3)
        da_ana = self.ver(self.ana)["tokens"]
        self.assertEqual([t["nome"] for t in da_ana], ["Inimigo Desconhecido"])
        self.assertNotIn("participante_id", da_ana[0])
        regras = mapa._regras_sync(self.database, self.campanha_id)
        self.assertEqual(sorted(r.quem_ve for r in regras.tokens.values()), ["donos", "gestores", "todos"])

    def test_dono_ajusta_as_barras_mas_nao_o_resto(self):
        self._sessao()
        cena = uuid.UUID(self.criar_cena()["cena"]["id"])
        mapa.criar_token(self.campanha_id, cena, mapa.TokenInput(personagem_id=self.mira, x=150, y=150),
                         user=self.mestre, database=self.database)
        token_id = uuid.UUID(self.ver(self.ana)["tokens"][0]["id"])
        mapa.editar_token(self.campanha_id, token_id, mapa.TokenEdicao(barras={"para": "dono", "mostrar": ["vida"]}),
                          user=self.ana, database=self.database)
        self.assertEqual(self.ver(self.bruno)["tokens"][0]["barras"], [])
        with self.assertRaises(HTTPException) as erro:
            mapa.editar_token(self.campanha_id, token_id, mapa.TokenEdicao(nome="Outra"), user=self.ana, database=self.database)
        self.assertEqual(erro.exception.status_code, 403)
        with self.assertRaises(HTTPException):
            mapa.editar_token(self.campanha_id, token_id, mapa.TokenEdicao(barras={"para": "todos"}), user=self.bruno, database=self.database)

    def test_mover_respeita_dono_e_cena_livre(self):
        self._sessao()
        cena = uuid.UUID(self.criar_cena()["cena"]["id"])
        mapa.criar_token(self.campanha_id, cena, mapa.TokenInput(personagem_id=self.mira, x=150, y=150),
                         user=self.mestre, database=self.database)
        token_id = uuid.UUID(self.ver(self.ana)["tokens"][0]["id"])
        movido = mapa.mover_token(self.campanha_id, token_id, mapa.PontoInput(x=99999, y=250), user=self.ana, database=self.database)
        self.assertEqual(movido["x"], 3000.0)
        with self.assertRaises(HTTPException) as erro:
            mapa.mover_token(self.campanha_id, token_id, mapa.PontoInput(x=10, y=10), user=self.bruno, database=self.database)
        self.assertEqual(erro.exception.status_code, 403)
        mapa.editar_cena(self.campanha_id, cena, mapa.CenaEdicao(livre=True), user=self.mestre, database=self.database)
        mapa.mover_token(self.campanha_id, token_id, mapa.PontoInput(x=10, y=10), user=self.bruno, database=self.database)
        self._status("preparacao")
        with self.assertRaises(HTTPException):
            mapa.mover_token(self.campanha_id, token_id, mapa.PontoInput(x=20, y=20), user=self.ana, database=self.database)

    def test_posicao_gravada_pelo_tempo_real_so_vale_na_cena_ativa(self):
        self._sessao()
        ativa = uuid.UUID(self.criar_cena("A")["cena"]["id"])
        outra = uuid.UUID(self.criar_cena("B")["cena"]["id"])
        mapa.criar_token(self.campanha_id, ativa, mapa.TokenInput(nome="X", x=1, y=1), user=self.mestre, database=self.database)
        mapa.criar_token(self.campanha_id, outra, mapa.TokenInput(nome="Y", x=1, y=1), user=self.mestre, database=self.database)
        na_ativa = self.ver(self.mestre, ativa)["tokens"][0]["id"]
        na_outra = self.ver(self.mestre, outra)["tokens"][0]["id"]
        self.assertTrue(mapa._gravar_posicao_sync(self.database, self.campanha_id, na_ativa, 40.0, 50.0))
        self.assertFalse(mapa._gravar_posicao_sync(self.database, self.campanha_id, na_outra, 40.0, 50.0))
        self.assertFalse(mapa._gravar_posicao_sync(self.database, self.campanha_id, "nao-e-uuid", 1.0, 1.0))
        self.assertEqual(self.ver(self.mestre, ativa)["tokens"][0]["x"], 40.0)

    def test_imagem_do_token_sai_da_ficha_so_para_quem_ve(self):
        self._sessao()
        self._participante("Mira", tipo="jogador", personagem_id=self.mira, visibilidade="desconhecido")
        cena = uuid.UUID(self.criar_cena()["cena"]["id"])
        mapa.trazer_participantes(self.campanha_id, cena, mapa.PontoInput(x=500, y=500), user=self.mestre, database=self.database)
        token_id = uuid.UUID(self.ver(self.ana)["tokens"][0]["id"])
        resposta = mapa.imagem_do_token(self.campanha_id, token_id, user=self.ana, database=self.database)
        self.assertEqual(resposta.media_type, "image/webp")
        with self.assertRaises(HTTPException):
            mapa.imagem_do_token(self.campanha_id, token_id, user=self.bruno, database=self.database)

    # ------------------------------------------------------------- molduras

    def test_jogador_escolhe_moldura_do_proprio_personagem_e_mestre_trava_a_da_mesa(self):
        self._sessao()
        cena = uuid.UUID(self.criar_cena()["cena"]["id"])
        mapa.criar_token(self.campanha_id, cena, mapa.TokenInput(personagem_id=self.mira, x=150, y=150),
                         user=self.mestre, database=self.database)
        mapa.criar_token(self.campanha_id, cena, mapa.TokenInput(nome="Estatua", x=450, y=150, moldura="osso"),
                         user=self.mestre, database=self.database)
        molduras = {t["nome"]: t["moldura"] for t in self.ver(self.ana)["tokens"]}
        self.assertEqual(molduras, {"Mira": "nivel", "Estatua": "osso"})
        mapa.editar_token_do_personagem(self.campanha_id, self.mira, mapa.TokenDoPersonagemInput(moldura="fluxo-tempo", enquadramento={"zoom": 1.5}),
                                        user=self.ana, database=self.database)
        da_ana = next(t for t in self.ver(self.bruno)["tokens"] if t["nome"] == "Mira")
        self.assertEqual((da_ana["moldura"], da_ana["enquadramento"]["zoom"]), ("fluxo-tempo", 1.5))
        with self.assertRaises(HTTPException) as erro:
            mapa.editar_token_do_personagem(self.campanha_id, self.mira, mapa.TokenDoPersonagemInput(moldura="ouro"),
                                            user=self.bruno, database=self.database)
        self.assertEqual(erro.exception.status_code, 403)
        with self.assertRaises(HTTPException) as erro:
            mapa.editar_token_do_personagem(self.campanha_id, self.mira, mapa.TokenDoPersonagemInput(moldura="arco-iris"),
                                            user=self.ana, database=self.database)
        self.assertEqual(erro.exception.status_code, 422)
        with self.assertRaises(HTTPException):
            mapa.configurar_mapa(self.campanha_id, mapa.ConfigMapaInput(moldura_mesa="ferro"), user=self.ana, database=self.database)
        mapa.configurar_mapa(self.campanha_id, mapa.ConfigMapaInput(moldura_mesa="ferro"), user=self.mestre, database=self.database)
        visto = self.ver(self.ana)
        self.assertEqual(visto["moldura_mesa"], "ferro")
        self.assertEqual({t["moldura"] for t in visto["tokens"]}, {"ferro"})
        mapa.configurar_mapa(self.campanha_id, mapa.ConfigMapaInput(moldura_mesa=None), user=self.mestre, database=self.database)
        self.assertEqual({t["nome"]: t["moldura"] for t in self.ver(self.ana)["tokens"]}, {"Mira": "fluxo-tempo", "Estatua": "osso"})

    # --------------------------------------------------------------- acervo

    def _item(self, largura=800, altura=600, nome="Caverna"):
        criado = acervo.criar_item(acervo.ItemInput(nome=nome, largura=largura, altura=altura), user=self.mestre, database=self.database)
        item_id = uuid.UUID(criado["id"])
        with self.database.connection() as connection:
            for chave in criado["chaves"]:
                acervo_core.salvar(connection, item_id, chave, "image/webp", WEBP)
        return item_id, criado

    def test_acervo_so_conclui_com_todos_os_pedacos_e_soma_o_uso(self):
        criado = acervo.criar_item(acervo.ItemInput(nome="Mapa grande", largura=3000, altura=1500), user=self.mestre, database=self.database)
        item_id = uuid.UUID(criado["id"])
        self.assertIn("n2/0/0", criado["chaves"])
        with self.assertRaises(HTTPException) as erro:
            acervo.concluir_item(item_id, user=self.mestre, database=self.database)
        self.assertEqual(erro.exception.status_code, 409)
        with self.database.connection() as connection:
            for chave in criado["chaves"]:
                acervo_core.salvar(connection, item_id, chave, "image/webp", WEBP)
        pronto = acervo.concluir_item(item_id, user=self.mestre, database=self.database)
        self.assertEqual(pronto["estado"], "pronto")
        lista = acervo.listar(user=self.mestre, database=self.database)
        self.assertEqual(lista["uso_bytes"], len(WEBP) * len(criado["chaves"]))

    def test_jogador_nao_tem_acervo(self):
        with self.assertRaises(HTTPException) as erro:
            acervo.listar(user=self.ana, database=self.database)
        self.assertEqual(erro.exception.status_code, 403)

    def test_subir_pasta_do_pc_reaproveita_os_niveis(self):
        primeira = acervo.garantir_caminho(acervo.CaminhoInput(caminho="Mapas/Cavernas/Andar 1"), user=self.mestre, database=self.database)
        segunda = acervo.garantir_caminho(acervo.CaminhoInput(caminho="mapas/cavernas/andar 1"), user=self.mestre, database=self.database)
        self.assertEqual(primeira["id"], segunda["id"])
        pastas = acervo.listar(user=self.mestre, database=self.database)["pastas"]
        self.assertEqual(len(pastas), 3)

    def test_apagar_pasta_leva_as_imagens_para_a_raiz(self):
        pasta = acervo.garantir_caminho(acervo.CaminhoInput(caminho="Mapas"), user=self.mestre, database=self.database)
        criado = acervo.criar_item(acervo.ItemInput(nome="A", largura=10, altura=10, pasta_id=uuid.UUID(pasta["id"])),
                                   user=self.mestre, database=self.database)
        acervo.apagar_pasta(uuid.UUID(pasta["id"]), user=self.mestre, database=self.database)
        itens = acervo.listar(user=self.mestre, database=self.database)["itens"]
        self.assertEqual([(i["id"], i["pasta_id"]) for i in itens], [(criado["id"], None)])

    def test_jogador_le_o_mapa_so_da_cena_ativa_com_a_sessao_ao_vivo(self):
        item_id, _ = self._item()
        acervo.concluir_item(item_id, user=self.mestre, database=self.database)
        self._sessao("preparacao")
        self.criar_cena("Caverna", mapa_id=item_id)
        with self.assertRaises(HTTPException):
            acervo.ler_pedaco(item_id, "n0/0/0", user=self.ana, database=self.database)
        self._status("aberta")
        resposta = acervo.ler_pedaco(item_id, "n0/0/0", user=self.ana, database=self.database)
        self.assertEqual(resposta.body, WEBP)
        self.assertIn("immutable", resposta.headers["cache-control"])
        visto = self.ver(self.ana)
        self.assertEqual(visto["cena"]["mapa"]["largura"], 800)
        self.assertEqual(visto["cena"]["largura"], 800)

    # ---------------------------------------------------------- névoa e clima

    def nevoa(self, cena_id, usuario=None, **dados):
        return mapa.mudar_nevoa(self.campanha_id, uuid.UUID(cena_id), mapa.NevoaInput(**dados),
                                user=usuario or self.mestre, database=self.database)

    def pedaco(self, usuario, item_id, chave):
        try:
            return acervo.ler_pedaco(item_id, chave, user=usuario, database=self.database).status_code
        except HTTPException as erro:
            return erro.status_code

    def test_nevoa_entrega_ao_jogador_so_os_ladrilhos_revelados(self):
        item_id, criado = self._item(largura=3000, altura=2000, nome="Masmorra")
        acervo.concluir_item(item_id, user=self.mestre, database=self.database)
        self._sessao("aberta")
        cena_id = self.criar_cena("Masmorra", mapa_id=item_id)["cena"]["id"]
        # Sem névoa, tudo como antes.
        self.assertEqual(self.pedaco(self.ana, item_id, "n0/2/1"), 200)
        coberta = self.nevoa(cena_id, ligada=True)
        self.assertEqual(coberta["cena"]["nevoa"]["ladrilhos"], None)  # o Mestre baixa tudo
        self.assertEqual(self.ver(self.ana)["cena"]["nevoa"]["ladrilhos"], [])
        for chave in ("n0/0/0", "n2/0/0", "mini"):
            self.assertEqual(self.pedaco(self.ana, item_id, chave), 404, chave)
            self.assertEqual(self.pedaco(self.mestre, item_id, chave), 200, chave)
        self.nevoa(cena_id, forma={"op": "revelar", "tipo": "retangulo", "x": 1100, "y": 100, "w": 200, "h": 200})
        visto = self.ver(self.ana)["cena"]["nevoa"]
        self.assertEqual(visto["ladrilhos"], ["n0/1/0"])
        self.assertEqual(len(visto["formas"]), 1)
        self.assertEqual(self.pedaco(self.ana, item_id, "n0/1/0"), 200)
        self.assertEqual(self.pedaco(self.ana, item_id, "n0/0/0"), 404)
        self.nevoa(cena_id, desfazer=True)
        self.assertEqual(self.pedaco(self.ana, item_id, "n0/1/0"), 404)
        self.nevoa(cena_id, revelar_tudo=True)
        self.assertEqual(self.pedaco(self.ana, item_id, "n2/0/0"), 200)
        self.assertEqual(self.pedaco(self.ana, item_id, "mini"), 404)
        self.nevoa(cena_id, cobrir_tudo=True)
        self.assertEqual(self.pedaco(self.ana, item_id, "n0/2/1"), 404)
        self.nevoa(cena_id, ligada=False)
        self.assertEqual(self.pedaco(self.ana, item_id, "n0/2/1"), 200)

    def test_trocar_o_mapa_refaz_a_lista_da_nevoa(self):
        pequeno, _ = self._item(largura=800, altura=600, nome="Sala")
        grande, _ = self._item(largura=3000, altura=2000, nome="Salao")
        for item_id in (pequeno, grande):
            acervo.concluir_item(item_id, user=self.mestre, database=self.database)
        self._sessao("aberta")
        cena_id = self.criar_cena("Sala", mapa_id=pequeno)["cena"]["id"]
        self.nevoa(cena_id, ligada=True, forma={"op": "revelar", "tipo": "retangulo", "x": 0, "y": 0, "w": 3000, "h": 2000})
        self.assertEqual(self.ver(self.ana)["cena"]["nevoa"]["ladrilhos"], ["n0/0/0"])
        mapa.editar_cena(self.campanha_id, uuid.UUID(cena_id), mapa.CenaEdicao(mapa_id=grande), user=self.mestre, database=self.database)
        self.assertIn("n0/2/1", self.ver(self.ana)["cena"]["nevoa"]["ladrilhos"])
        self.assertEqual(self.pedaco(self.ana, grande, "n0/2/1"), 200)
        self.assertEqual(self.pedaco(self.ana, pequeno, "n0/0/0"), 404)  # saiu da cena

    def test_monstro_na_nevoa_nao_chega_ao_jogador_e_personagem_sim(self):
        self._sessao("aberta")
        cena_id = self.criar_cena()["cena"]["id"]
        lobo = self._participante("Lobo")
        for dados in ({"participante_id": lobo, "x": 150, "y": 150}, {"personagem_id": self.mira, "x": 250, "y": 150},
                      {"nome": "Bau", "x": 1500, "y": 150}):
            mapa.criar_token(self.campanha_id, uuid.UUID(cena_id), mapa.TokenInput(**dados), user=self.mestre, database=self.database)
        self.nevoa(cena_id, ligada=True, forma={"op": "revelar", "tipo": "retangulo", "x": 1000, "y": 0, "w": 1000, "h": 1000})
        self.assertEqual(sorted(t["nome"] for t in self.ver(self.bruno)["tokens"]), ["Bau", "Mira"])
        self.assertEqual(len(self.ver(self.mestre)["tokens"]), 3)
        regras = mapa._regras_sync(self.database, self.campanha_id)
        self.assertIsNotNone(regras.nevoa)
        por_nome = {t["nome"]: t["id"] for t in self.ver(self.mestre)["tokens"]}
        self.assertTrue(regras.tokens[por_nome["Lobo"]].some_na_nevoa)
        self.assertFalse(regras.tokens[por_nome["Lobo"]].revelado)
        self.assertFalse(regras.tokens[por_nome["Mira"]].some_na_nevoa)
        self.assertTrue(regras.tokens[por_nome["Bau"]].revelado)

    def test_so_o_mestre_mexe_na_nevoa_e_no_clima_e_o_clima_chega_a_todos(self):
        self._sessao("aberta")
        cena_id = uuid.UUID(self.criar_cena()["cena"]["id"])
        with self.assertRaises(HTTPException) as erro:
            self.nevoa(str(cena_id), usuario=self.ana, ligada=True)
        self.assertEqual(erro.exception.status_code, 403)
        with self.assertRaises(HTTPException) as erro:
            mapa.mudar_clima(self.campanha_id, cena_id, {"efeitos": [{"tipo": "chuva"}]}, user=self.ana, database=self.database)
        self.assertEqual(erro.exception.status_code, 403)
        with self.assertRaises(HTTPException) as erro:
            mapa.mudar_clima(self.campanha_id, cena_id, {"efeitos": [{"tipo": "granizo"}]}, user=self.mestre, database=self.database)
        self.assertEqual(erro.exception.status_code, 422)
        mapa.mudar_clima(self.campanha_id, cena_id, {"efeitos": [{"tipo": "neve", "intensidade": 0.4}], "vento": {"direcao": 45, "forca": 0.8}},
                         user=self.mestre, database=self.database)
        clima = self.ver(self.ana)["cena"]["clima"]
        self.assertEqual(clima["efeitos"], [{"tipo": "neve", "intensidade": 0.4, "area": None}])
        self.assertEqual(clima["vento"], {"direcao": 45.0, "forca": 0.8})
        with self.assertRaises(HTTPException) as erro:
            self.nevoa(str(cena_id), forma={"op": "revelar", "tipo": "pincel", "raio": 0.1, "pontos": [[1, 1]]})
        self.assertEqual(erro.exception.status_code, 422)

    def test_recorte_empurrado_pelo_tempo_real_guarda_os_mesmos_segredos_do_get(self):
        self._sessao("aberta")
        ativa = self.criar_cena("Ruínas")["cena"]["id"]
        preparo = self.criar_cena("Torre")["cena"]["id"]
        oculto = self._participante("Sombra", visibilidade="oculto")
        for dados in ({"participante_id": oculto, "x": 150, "y": 150}, {"personagem_id": self.mira, "x": 250, "y": 150}):
            mapa.criar_token(self.campanha_id, uuid.UUID(ativa), mapa.TokenInput(**dados), user=self.mestre, database=self.database)
        estranho = self._usuario("estranho@example.com", "Estranho", "jogador")
        with self.database.connection() as connection:
            connection.execute("DELETE FROM membros_campanha WHERE usuario_id=%s", (estranho.id,))
        pedidos = [
            (str(self.ana.id), None),
            (str(self.mestre.id), preparo),
            (str(self.mestre.id), None),
            (str(estranho.id), None),
            (str(self.mestre.id), str(uuid.uuid4())),
        ]
        ana, mestre_preparo, mestre_ativa, de_fora, cena_apagada = mapa._estados_sync(self.database, self.campanha_id, pedidos)
        # A Ana recebe exatamente o que o GET dela traz: sem a Sombra.
        self.assertEqual(ana, self.ver(self.ana))
        self.assertEqual([t["nome"] for t in ana["tokens"]], ["Mira"])
        self.assertNotIn("oculto", ana["tokens"][0])
        self.assertEqual(mestre_preparo["cena"]["id"], preparo)
        self.assertEqual(mestre_ativa["cena"]["id"], ativa)
        self.assertEqual(len(mestre_ativa["tokens"]), 2)
        self.assertIsNone(de_fora)
        self.assertEqual(cena_apagada["cena"]["id"], ativa)

    def test_mestre_nao_usa_imagem_de_outro_mestre(self):
        outro = self._usuario("outro@example.com", "Outro", "assistente", plataforma="mestre")
        criado = acervo.criar_item(acervo.ItemInput(nome="Dele", largura=10, altura=10), user=outro, database=self.database)
        with self.assertRaises(HTTPException) as erro:
            self.criar_cena("X", mapa_id=uuid.UUID(criado["id"]))
        self.assertEqual(erro.exception.status_code, 404)


    # ------------------------------------------------- mapas colocados na cena

    def _mapa_pronto(self, largura, altura, nome):
        item_id, _ = self._item(largura=largura, altura=altura, nome=nome)
        acervo.concluir_item(item_id, user=self.mestre, database=self.database)
        return item_id

    def _colocar(self, cena_id, item_id, usuario=None, **extra):
        from routers import mapa_colocados as rotas

        return rotas.colocar_mapa(
            self.campanha_id, uuid.UUID(cena_id), rotas.MapaColocadoInput(imagem_id=item_id, **extra),
            user=usuario or self.mestre, database=self.database,
        )

    def _mudar(self, cena_id, mapa_id, **dados):
        from routers import mapa_colocados as rotas

        return rotas.mudar_mapa(self.campanha_id, uuid.UUID(cena_id), mapa_id, dados, user=self.mestre, database=self.database)

    def test_varios_mapas_na_cena_cada_um_com_lugar_e_a_cena_cresce_para_caber(self):
        praca, porto = self._mapa_pronto(3000, 2000, "Praca"), self._mapa_pronto(2400, 1800, "Porto")
        self._sessao("aberta")
        cena_id = self.criar_cena("Cidade")["cena"]["id"]
        primeiro = self._colocar(cena_id, praca)
        segundo = self._colocar(cena_id, porto)
        mapas = segundo["cena"]["mapas_colocados"]
        # O primeiro entra com folga do canto; o segundo, à direita dele, alinhado em cima. A cena mede
        # o conjunto mais a folga (4000 px) à direita e embaixo.
        self.assertEqual([(m["nome"], m["x"], m["y"], m["escala"]) for m in mapas], [("Praca", 4000.0, 4000.0, 1.0), ("Porto", 7000.0, 4000.0, 1.0)])
        self.assertEqual((segundo["cena"]["largura"], segundo["cena"]["altura"]), (13400, 10000))
        self.assertTrue(all(m["visivel"] and not m["trancado"] for m in mapas))
        self.assertEqual(primeiro["mapa_colocado_id"], mapas[0]["id"])
        # A jogadora recebe os dois, sem nome, trava nem visibilidade (isso é do Mestre).
        da_ana = self.ver(self.ana)["cena"]["mapas_colocados"]
        self.assertEqual([m["id"] for m in da_ana], [m["id"] for m in mapas])
        self.assertTrue(all("nome" not in m and "trancado" not in m and "visivel" not in m for m in da_ana))
        # Mudar lugar e tamanho.
        movido = self._mudar(cena_id, mapas[1]["id"], x=2500, y=100, escala=0.5)["cena"]["mapas_colocados"][1]
        self.assertEqual((movido["x"], movido["y"], movido["escala"]), (2500.0, 100.0, 0.5))
        with self.assertRaises(HTTPException) as longe:
            self._mudar(cena_id, mapas[1]["id"], x=40000)
        self.assertEqual(longe.exception.status_code, 422)

    def test_so_o_mestre_mexe_e_so_imagem_do_tipo_mapa_entra(self):
        praca = self._mapa_pronto(1200, 800, "Praca")
        self._sessao("aberta")
        cena_id = self.criar_cena("Cidade")["cena"]["id"]
        with self.assertRaises(HTTPException) as da_ana:
            self._colocar(cena_id, praca, usuario=self.ana)
        self.assertEqual(da_ana.exception.status_code, 403)
        token = acervo.criar_item(acervo.ItemInput(nome="Lobo", largura=64, altura=64, tipo="token"), user=self.mestre, database=self.database)
        with self.database.connection() as connection:
            for chave in token["chaves"]:
                acervo_core.salvar(connection, uuid.UUID(token["id"]), chave, "image/webp", WEBP)
        acervo.concluir_item(uuid.UUID(token["id"]), user=self.mestre, database=self.database)
        with self.assertRaises(HTTPException) as nao_e_mapa:
            self._colocar(cena_id, uuid.UUID(token["id"]))
        self.assertEqual(nao_e_mapa.exception.status_code, 422)

    def test_escondido_nao_sai_do_servidor_e_trancado_nao_se_move(self):
        from routers import mapa_colocados as rotas

        a, b = self._mapa_pronto(3000, 2000, "A"), self._mapa_pronto(2400, 1800, "B")
        self._sessao("aberta")
        cena_id = self.criar_cena("Cidade")["cena"]["id"]
        self._colocar(cena_id, a)
        mapas = self._colocar(cena_id, b)["cena"]["mapas_colocados"]
        id_a, id_b = mapas[0]["id"], mapas[1]["id"]
        self.assertEqual((self.pedaco(self.ana, a, "n0/0/0"), self.pedaco(self.ana, b, "n0/0/0")), (200, 200))
        # Escondido: nem aparece para a jogadora, nem entrega pedaço; o Mestre continua vendo.
        escondido = self._mudar(cena_id, id_b, visivel=False)
        self.assertEqual([m["id"] for m in self.ver(self.ana)["cena"]["mapas_colocados"]], [id_a])
        self.assertEqual(len(escondido["cena"]["mapas_colocados"]), 2)
        self.assertEqual((self.pedaco(self.ana, b, "n0/0/0"), self.pedaco(self.mestre, b, "n0/0/0"), self.pedaco(self.ana, a, "n0/0/0")), (404, 200, 200))
        self._mudar(cena_id, id_b, visivel=True)
        self.assertEqual(self.pedaco(self.ana, b, "n0/0/0"), 200)
        # Trancado: não anda, não muda de tamanho e não sai; destrancar e mexer de uma vez vale.
        self._mudar(cena_id, id_a, trancado=True)
        for dados in ({"x": 10}, {"escala": 2}):
            with self.assertRaises(HTTPException) as preso:
                self._mudar(cena_id, id_a, **dados)
            self.assertEqual(preso.exception.status_code, 409)
        with self.assertRaises(HTTPException) as nao_tira:
            rotas.tirar_mapa(self.campanha_id, uuid.UUID(cena_id), id_a, user=self.mestre, database=self.database)
        self.assertEqual(nao_tira.exception.status_code, 409)
        livre = self._mudar(cena_id, id_a, trancado=False, x=10)["cena"]["mapas_colocados"][0]
        self.assertEqual((livre["x"], livre["trancado"]), (10.0, False))

    def test_duplicar_reordenar_e_tirar(self):
        from routers import mapa_colocados as rotas

        a, b = self._mapa_pronto(1200, 800, "A"), self._mapa_pronto(1200, 800, "B")
        self._sessao("aberta")
        cena_id = self.criar_cena("Cidade")["cena"]["id"]
        self._colocar(cena_id, a)
        mapas = self._colocar(cena_id, b)["cena"]["mapas_colocados"]
        id_a, id_b = mapas[0]["id"], mapas[1]["id"]
        copiado = rotas.duplicar_mapa(self.campanha_id, uuid.UUID(cena_id), id_a, user=self.mestre, database=self.database)
        nomes = [m["nome"] for m in copiado["cena"]["mapas_colocados"]]
        self.assertEqual(nomes, ["A", "A (cópia)", "B"])  # a cópia fica logo acima do original
        id_copia = copiado["mapa_colocado_id"]
        for acao, esperado in (("frente", ["A", "B", "A (cópia)"]), ("tras", ["A (cópia)", "A", "B"]), ("acima", ["A", "A (cópia)", "B"]), ("abaixo", ["A (cópia)", "A", "B"])):
            r = rotas.ordenar_mapa(self.campanha_id, uuid.UUID(cena_id), id_copia, rotas.OrdemInput(acao=acao), user=self.mestre, database=self.database)
            self.assertEqual([m["nome"] for m in r["cena"]["mapas_colocados"]], esperado, acao)
        with self.assertRaises(HTTPException):
            rotas.ordenar_mapa(self.campanha_id, uuid.UUID(cena_id), id_copia, rotas.OrdemInput(acao="meio"), user=self.mestre, database=self.database)
        tirado = rotas.tirar_mapa(self.campanha_id, uuid.UUID(cena_id), id_copia, user=self.mestre, database=self.database)
        self.assertEqual([m["id"] for m in tirado["cena"]["mapas_colocados"]], [id_a, id_b])

    def test_nevoa_libera_por_mapa_colocado_com_a_chave_prefixada(self):
        a, b = self._mapa_pronto(3000, 2000, "A"), self._mapa_pronto(2400, 1800, "B")
        self._sessao("aberta")
        cena_id = self.criar_cena("Cidade")["cena"]["id"]
        self._colocar(cena_id, a)
        self._colocar(cena_id, b)  # em x = 7000, y = 4000
        self.nevoa(cena_id, ligada=True)
        self.assertEqual(self.ver(self.ana)["cena"]["nevoa"]["ladrilhos"], [])
        self.assertEqual((self.pedaco(self.ana, a, "n0/0/0"), self.pedaco(self.ana, b, "n0/0/0")), (404, 404))
        # Revelar um quadrado dentro do segundo mapa: só o ladrilho dele sai, com o id do mapa na frente.
        self.nevoa(cena_id, forma={"op": "revelar", "tipo": "retangulo", "x": 7100, "y": 4100, "w": 200, "h": 200})
        visto = self.ver(self.ana)["cena"]["nevoa"]["ladrilhos"]
        self.assertEqual(visto, [f"{b}:n0/0/0"])
        self.assertEqual((self.pedaco(self.ana, b, "n0/0/0"), self.pedaco(self.ana, b, "n0/1/0"), self.pedaco(self.ana, a, "n0/0/0")), (200, 404, 404))
        # Mover o mapa refaz a lista: o quadrado agora cai em outro ladrilho dele.
        mapas = self.ver(self.mestre)["cena"]["mapas_colocados"]
        self._mudar(cena_id, mapas[1]["id"], x=6000)
        refeito = self.ver(self.ana)["cena"]["nevoa"]["ladrilhos"]
        self.assertEqual(refeito, [f"{b}:n0/1/0"])
        self.assertEqual((self.pedaco(self.ana, b, "n0/1/0"), self.pedaco(self.ana, b, "n0/0/0")), (200, 404))

    def test_apagar_o_mapa_do_acervo_tira_da_cena(self):
        a, b = self._mapa_pronto(1200, 800, "A"), self._mapa_pronto(1200, 800, "B")
        self._sessao("aberta")
        cena_id = self.criar_cena("Cidade")["cena"]["id"]
        self._colocar(cena_id, a)
        self._colocar(cena_id, b)
        acervo.apagar_item(a, user=self.mestre, database=self.database)
        restantes = self.ver(self.mestre)["cena"]["mapas_colocados"]
        self.assertEqual([m["nome"] for m in restantes], ["B"])


    def test_trocar_o_fundo_nao_deixa_os_mapas_colocados_fora_da_cena(self):
        a, pequeno = self._mapa_pronto(3000, 2000, "A"), self._mapa_pronto(800, 600, "Sala")
        self._sessao("aberta")
        cena_id = self.criar_cena("Cidade")["cena"]["id"]
        self._colocar(cena_id, a, x=2000, y=500)  # ocupa até 5000 x 2500
        mapa.editar_cena(self.campanha_id, uuid.UUID(cena_id), mapa.CenaEdicao(mapa_id=pequeno), user=self.mestre, database=self.database)
        cena = self.ver(self.mestre)["cena"]
        self.assertGreaterEqual(cena["largura"], 5000)
        self.assertGreaterEqual(cena["altura"], 2500)
        self.assertEqual(len(cena["mapas_colocados"]), 1)


if __name__ == "__main__":
    unittest.main()
