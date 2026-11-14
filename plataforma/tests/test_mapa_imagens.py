"""Imagens mostradas à mesa e cena narrativa (core/imagens_mostradas.py, core/mesa_extras.py, routers/mapa_imagens.py)."""

from __future__ import annotations

import os
import unittest
import uuid

import psycopg
import pytest
from fastapi import HTTPException
from psycopg import sql
from psycopg.conninfo import make_conninfo

from core import imagens_mostradas, mesa_extras, tempo_real
from core.mesa_extras import ErroMesa

TEST_DSN = (os.getenv("TEST_DATABASE_URL") or "").strip()


# ------------------------------------------------------------------ regras puras

def test_a_imagem_liberada_vale_por_oito_horas_e_so_para_quem_o_mestre_escolheu():
    imagens_mostradas._limpar_para_testes()
    item, campanha = uuid.uuid4(), uuid.uuid4()
    imagens_mostradas.liberar(item, campanha, None, agora=1000)
    assert imagens_mostradas.campanhas_liberadas(item, "ana", agora=1000 + 60) == [str(campanha)]
    assert imagens_mostradas.campanhas_liberadas(item, "ana", agora=1000 + imagens_mostradas.VALIDADE_S + 1) == []
    imagens_mostradas.liberar(item, campanha, frozenset({"bia"}), agora=2000)
    assert imagens_mostradas.campanhas_liberadas(item, "ana", agora=2001) == []
    assert imagens_mostradas.campanhas_liberadas(item, "bia", agora=2001) == [str(campanha)]


def test_revogar_e_o_teto_de_imagens_por_campanha():
    imagens_mostradas._limpar_para_testes()
    campanha, outra = uuid.uuid4(), uuid.uuid4()
    itens = [uuid.uuid4() for _ in range(imagens_mostradas.MAX_POR_CAMPANHA + 3)]
    for i, item in enumerate(itens):
        imagens_mostradas.liberar(item, campanha, None, agora=1000 + i)
    vivas = [item for item in itens if imagens_mostradas.campanhas_liberadas(item, "ana", agora=1100)]
    assert len(vivas) == imagens_mostradas.MAX_POR_CAMPANHA and itens[0] not in vivas and itens[-1] in vivas
    imagens_mostradas.liberar(itens[-1], outra, None, agora=1100)
    imagens_mostradas.revogar(campanha, itens[-1])
    assert imagens_mostradas.campanhas_liberadas(itens[-1], "ana", agora=1101) == [str(outra)], "a outra campanha continua"
    imagens_mostradas.revogar_menos(campanha, {str(itens[-2])})
    assert imagens_mostradas.campanhas_liberadas(itens[-2], "ana", agora=1101) == [str(campanha)]
    assert imagens_mostradas.campanhas_liberadas(itens[-3], "ana", agora=1101) == []


def test_cena_narrativa_conferida_e_so_liga_com_imagem():
    imagem = str(uuid.uuid4())
    token = str(uuid.uuid4())
    ligada = mesa_extras.normalizar_narrativa({"imagem_id": imagem, "largura": 2000, "altura": 1200, "titulo": "  A   Taverna ", "falantes": [token, token, "lixo"], "ligada": True})
    assert ligada == {"ligada": True, "imagem_id": imagem, "largura": 2000, "altura": 1200, "titulo": "A Taverna", "falantes": [token]}
    with pytest.raises(ErroMesa):
        mesa_extras.normalizar_narrativa({"ligada": True})
    with pytest.raises(ErroMesa):
        mesa_extras.normalizar_narrativa({"imagem_id": "lixo"})
    with pytest.raises(ErroMesa):
        mesa_extras.normalizar_narrativa({"falantes": "x"})
    # Mudar só o título não desliga nem troca o resto.
    assert mesa_extras.normalizar_narrativa({"titulo": "Outra"}, ligada)["imagem_id"] == imagem
    # Seis falantes no máximo.
    muitos = [str(uuid.uuid4()) for _ in range(9)]
    assert len(mesa_extras.normalizar_narrativa({"falantes": muitos}, ligada)["falantes"]) == mesa_extras.MAX_FALANTES


def test_narrativa_quebrada_no_banco_vira_desligada_e_a_mesa_leva_o_campo():
    assert mesa_extras.ler_narrativa("lixo") == mesa_extras.narrativa_vazia()
    assert mesa_extras.ler_narrativa({"ligada": True})["ligada"] is False, "ligada sem imagem não prende a mesa"
    assert mesa_extras.ler_mesa({"pausa": {"ligada": True}})["narrativa"] == mesa_extras.narrativa_vazia()
    imagem = str(uuid.uuid4())
    mesa = mesa_extras.normalizar_mesa({"narrativa": {"imagem_id": imagem, "ligada": True}})
    assert mesa["narrativa"]["ligada"] and mesa_extras.mesa_de(mesa, gestor=False)["narrativa"]["imagem_id"] == imagem


# ------------------------------------------------------------------ banco

@unittest.skipUnless(TEST_DSN, "TEST_DATABASE_URL nao configurada")
class ImagensDaMesaBancoTests(unittest.TestCase):
    def setUp(self):
        from core.database import Database
        from core.dependencies import AuthenticatedUser

        if TEST_DSN == (os.getenv("DATABASE_URL") or "").strip():
            self.fail("TEST_DATABASE_URL nao pode ser o banco de producao")
        imagens_mostradas._limpar_para_testes()
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
                if papel:
                    connection.execute(
                        "INSERT INTO membros_campanha (campanha_id, usuario_id, papel) VALUES (%s, %s, %s)",
                        (self.campanha_id, pessoa.id, papel),
                    )
            return pessoa

        self.mestre = usuario("img-mestre@example.com", "Mestre", "mestre", plataforma="mestre")
        self.ana = usuario("img-ana@example.com", "Ana", "jogador")
        self.estranho = usuario("img-estranho@example.com", "Estranho", None)
        self.item = uuid.uuid4()
        with self.database.connection() as connection:
            connection.execute(
                "INSERT INTO acervo_itens (id, dono_id, nome, tipo, largura, altura, estado, chaves) VALUES (%s, %s, 'Carta do rei', 'objeto', 800, 600, 'pronto', %s)",
                (self.item, self.mestre.id, ["mini", "n0/0/0"]),
            )
            connection.execute("INSERT INTO acervo_arquivos (item_id, chave, mime, tamanho, dados) VALUES (%s, 'n0/0/0', 'image/png', 3, %s)", (self.item, b"\x89PN"))

    def tearDown(self):
        imagens_mostradas._limpar_para_testes()
        tempo_real._limpar_para_testes()
        self.database.close()
        with psycopg.connect(TEST_DSN, autocommit=True) as connection:
            connection.execute(sql.SQL("DROP SCHEMA IF EXISTS {} CASCADE").format(sql.Identifier(self.schema)))

    def _baixar(self, quem):
        from routers import acervo as rotas

        return rotas.ler_pedaco(self.item, "n0/0/0", user=quem, database=self.database)

    def test_antes_de_mostrar_o_jogador_nao_baixa_e_depois_baixa_so_ele_e_so_na_campanha(self):
        from routers import mapa_imagens as rotas

        with self.assertRaises(HTTPException) as erro:
            self._baixar(self.ana)
        self.assertEqual(erro.exception.status_code, 404)
        rotas.mostrar_imagem(self.campanha_id, self.item, rotas.MostrarImagemInput(legenda="  Um   convite "), user=self.mestre, database=self.database)
        self.assertEqual(self._baixar(self.ana).status_code, 200)
        self.assertEqual(self._baixar(self.mestre).status_code, 200)
        with self.assertRaises(HTTPException):
            self._baixar(self.estranho)
        rotas.fechar_imagem(self.campanha_id, user=self.mestre, database=self.database)
        with self.assertRaises(HTTPException):
            self._baixar(self.ana)

    def test_so_o_mestre_mostra_e_so_imagem_dele(self):
        from routers import mapa_imagens as rotas

        with self.assertRaises(HTTPException) as erro:
            rotas.mostrar_imagem(self.campanha_id, self.item, rotas.MostrarImagemInput(), user=self.ana, database=self.database)
        self.assertEqual(erro.exception.status_code, 403)
        with self.assertRaises(HTTPException) as erro:
            rotas.mostrar_imagem(self.campanha_id, uuid.uuid4(), rotas.MostrarImagemInput(), user=self.mestre, database=self.database)
        self.assertEqual(erro.exception.status_code, 404)

    def test_cena_narrativa_liga_com_imagem_libera_o_fundo_e_o_jogador_ve_o_estado(self):
        from routers import mapa as rotas_mapa
        from routers import mapa_imagens as rotas

        with self.assertRaises(HTTPException) as erro:
            rotas.mudar_narrativa(self.campanha_id, rotas.NarrativaInput(ligada=True), user=self.mestre, database=self.database)
        self.assertEqual(erro.exception.status_code, 422, "sem imagem de fundo não liga")
        mesa = rotas.mudar_narrativa(self.campanha_id, rotas.NarrativaInput(imagem_id=self.item, ligada=True), user=self.mestre, database=self.database)
        narrativa = mesa["narrativa"]
        self.assertEqual((narrativa["ligada"], narrativa["titulo"], narrativa["largura"], narrativa["altura"]), (True, "Carta do rei", 800, 600))
        self.assertEqual(self._baixar(self.ana).status_code, 200, "o fundo da cena narrativa é liberado a todos")
        # Fechar uma imagem avulsa não derruba o fundo da cena que segue ligada.
        rotas.fechar_imagem(self.campanha_id, user=self.mestre, database=self.database)
        self.assertEqual(self._baixar(self.ana).status_code, 200)
        # O jogador recebe a cena narrativa pelo estado do mapa (a mesa).
        with self.database.connection() as connection:
            connection.execute("INSERT INTO mapa_cenas (id, campanha_id, nome, largura, altura, ativa) VALUES (%s, %s, 'C', 1000, 800, TRUE)", (uuid.uuid4(), self.campanha_id))
            connection.execute("INSERT INTO sessoes_mesa (id, campanha_id, status, titulo, aberta_por) VALUES (%s, %s, 'aberta', 'x', %s)", (uuid.uuid4(), self.campanha_id, self.mestre.id))
        vista = rotas_mapa.obter_mapa(self.campanha_id, None, user=self.ana, database=self.database)
        self.assertTrue(vista["mesa"]["narrativa"]["ligada"])
        # Desligar tira a cena, mas guarda a imagem e os falantes para a próxima vez.
        mesa = rotas.mudar_narrativa(self.campanha_id, rotas.NarrativaInput(ligada=False), user=self.mestre, database=self.database)
        self.assertFalse(mesa["narrativa"]["ligada"])
        self.assertEqual(mesa["narrativa"]["imagem_id"], str(self.item))
        rotas.mudar_narrativa(self.campanha_id, rotas.NarrativaInput(sem_imagem=True), user=self.mestre, database=self.database)
        self.assertIsNone(self.database and rotas_mapa.obter_mapa(self.campanha_id, None, user=self.mestre, database=self.database)["mesa"]["narrativa"]["imagem_id"])

    def test_a_rota_generica_da_mesa_nao_liga_a_narrativa(self):
        from routers import mapa_extras as extras

        extras.mudar_mesa(self.campanha_id, {"narrativa": {"imagem_id": str(self.item), "ligada": True}, "pausa": {"ligada": True, "texto": "Já volto"}}, user=self.mestre, database=self.database)
        from routers import mapa as rotas_mapa
        with self.database.connection() as connection:
            connection.execute("INSERT INTO mapa_cenas (id, campanha_id, nome, largura, altura, ativa) VALUES (%s, %s, 'C', 1000, 800, TRUE)", (uuid.uuid4(), self.campanha_id))
        mesa = rotas_mapa.obter_mapa(self.campanha_id, None, user=self.mestre, database=self.database)["mesa"]
        self.assertFalse(mesa["narrativa"]["ligada"])
        self.assertTrue(mesa["pausa"]["ligada"], "o resto do pedido vale")
