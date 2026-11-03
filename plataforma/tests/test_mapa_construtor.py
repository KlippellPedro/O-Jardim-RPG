"""Construtor de mapas: o projeto do Mestre, a publicação numa cena e o recorte da parte viva
(core/construtor.py, routers/construtor.py)."""

from __future__ import annotations

import os
import unittest
import uuid

import psycopg
import pytest
from psycopg import sql
from psycopg.conninfo import make_conninfo
from psycopg.types.json import Jsonb

from core import construtor
from core.construtor import ErroConstrutor

TEST_DSN = (os.getenv("TEST_DATABASE_URL") or "").strip()


def _sala(largura=6, altura=4):
    """Uma sala 3x2 de laje no canto, com parede em volta, uma porta e uma janela."""
    conteudo = construtor.conteudo_vazio(largura, altura)
    conteudo["chao"] = ["LLL...", "LLL...", "......", "......"][:altura]
    paredes = {}
    for x in range(3):
        paredes[f"h,{x},0"] = "pedra"
        paredes[f"h,{x},2"] = "pedra"
    for y in range(2):
        paredes[f"v,0,{y}"] = "pedra"
        paredes[f"v,3,{y}"] = "tijolo"
    conteudo["paredes"] = paredes
    conteudo["aberturas"] = {"h,1,2": {"tipo": "porta", "estado": "fechada"}, "v,3,0": {"tipo": "janela"}}
    return conteudo


# ------------------------------------------------------------------ projeto

def test_projeto_vazio_tem_uma_fileira_por_altura():
    vazio = construtor.conteudo_vazio(5, 3)
    assert vazio["chao"] == ["....."] * 3 and vazio["paredes"] == {} and vazio["aberturas"] == {}


def test_conteudo_corta_e_completa_fileiras_e_tira_o_que_saiu_da_grade():
    conteudo = construtor.normalizar_conteudo({
        "chao": ["LLLLLLLL", "TT"],
        "paredes": {"h,0,0": "pedra", "h,9,0": "pedra", "v,4,1": "sebe", "x,1,1": "pedra"},
        "aberturas": {"h,0,0": {"tipo": "porta", "estado": "trancada"}, "v,9,9": {"tipo": "janela"}},
    }, 4, 3)
    assert conteudo["chao"] == ["LLLL", "TT..", "...."]
    assert conteudo["paredes"] == {"h,0,0": "pedra", "v,4,1": "sebe"}
    assert conteudo["aberturas"] == {"h,0,0": {"tipo": "porta", "estado": "trancada"}}


def test_conteudo_recusa_material_e_tipo_que_nao_conhece():
    for ruim in (
        {"chao": ["LXL"]}, {"chao": "LLL"}, {"paredes": {"h,0,0": "vidro"}},
        {"paredes": {"h,0,0": "pedra"}, "aberturas": {"h,0,0": {"tipo": "portal"}}},
        {"paredes": {"h,0,0": "pedra"}, "aberturas": {"h,0,0": {"tipo": "porta", "estado": "quebrada"}}},
        [],
    ):
        with pytest.raises(ErroConstrutor):
            construtor.normalizar_conteudo(ruim, 4, 4)
    # Janela não tem estado de porta.
    janela = construtor.normalizar_conteudo({"paredes": {"h,0,0": "pedra"}, "aberturas": {"h,0,0": {"tipo": "janela", "estado": "aberta"}}}, 4, 4)
    assert janela["aberturas"]["h,0,0"]["estado"] == "fechada"
    assert construtor.ler_conteudo({"chao": "estragado"}, 4, 2) == construtor.conteudo_vazio(4, 2)


def test_tamanho_e_nome_conferidos():
    assert construtor.tamanho(30, 20, 100) == (30, 20, 100)
    for ruim in ((3, 20, 100), (30, 121, 100), (30, 20, 40), (30.5, 20, 100), (True, 20, 100)):
        with pytest.raises(ErroConstrutor):
            construtor.tamanho(*ruim)
    assert construtor.nome_limpo("  Torre   do  Mago ") == "Torre do Mago"
    with pytest.raises(ErroConstrutor):
        construtor.nome_limpo("   ")


# ------------------------------------------------------------ publicação

def test_paredes_viram_trechos_compridos_e_a_porta_abre_um_vao():
    conteudo = construtor.normalizar_conteudo(_sala(), 6, 4)
    trechos = sorted(construtor.segmentos_de_parede(conteudo["paredes"], conteudo["aberturas"]))
    # Em cima, inteira; embaixo, o vão da porta no meio corta em dois; dos lados, inteiras
    # (a janela continua parede).
    assert trechos == sorted([[0, 0, 3, 0], [0, 2, 1, 2], [2, 2, 3, 2], [0, 0, 0, 2], [3, 0, 3, 2]])


def test_estrutura_publicada_em_px_com_as_aberturas():
    conteudo = construtor.normalizar_conteudo(_sala(), 6, 4)
    viva = construtor.estrutura_publicada(conteudo, 100)
    assert [0, 0, 300, 0] in viva["paredes"]
    porta = next(a for a in viva["aberturas"] if a["tipo"] == "porta")
    assert (porta["x1"], porta["y1"], porta["x2"], porta["y2"]) == (100, 200, 200, 200)
    assert porta["id"] == "h,1,2" and porta["estado"] == "fechada" and porta["material"] == "pedra"
    janela = next(a for a in viva["aberturas"] if a["tipo"] == "janela")
    assert (janela["x1"], janela["y1"], janela["x2"], janela["y2"]) == (300, 0, 300, 100) and janela["material"] == "tijolo"


def test_jogador_nao_ve_porta_secreta_nem_abertura_na_nevoa():
    aberturas = [
        {"id": "a", "tipo": "porta", "estado": "fechada", "x1": 0, "y1": 0, "x2": 100, "y2": 0},
        {"id": "b", "tipo": "secreta", "estado": "fechada", "x1": 0, "y1": 0, "x2": 0, "y2": 100},
        {"id": "c", "tipo": "janela", "estado": "fechada", "x1": 900, "y1": 0, "x2": 1000, "y2": 0},
    ]
    assert [a["id"] for a in construtor.aberturas_de(aberturas, gestor=True, revelado=lambda x, y: False)] == ["a", "b", "c"]
    assert [a["id"] for a in construtor.aberturas_de(aberturas, gestor=False, revelado=lambda x, y: True)] == ["a", "c"]
    assert [a["id"] for a in construtor.aberturas_de(aberturas, gestor=False, revelado=lambda x, y: x < 500)] == ["a"]
    assert construtor.ler_aberturas({"aberturas": [{"tipo": "porta"}, "x", *aberturas]}) == aberturas
    assert construtor.ler_aberturas(None) == []


# ------------------------------------------------------------- com banco

@unittest.skipUnless(TEST_DSN, "TEST_DATABASE_URL nao configurada")
class ConstrutorBancoTests(unittest.TestCase):
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

        self.mestre = usuario("construtor-mestre@example.com", "Mestre", "mestre", plataforma="mestre")
        self.ana = usuario("construtor-ana@example.com", "Ana", "jogador")
        with self.database.connection() as connection:
            connection.execute(
                "INSERT INTO sessoes_mesa (id, campanha_id, status, titulo, aberta_por) VALUES (%s, %s, 'aberta', 'Noite 1', %s)",
                (uuid.uuid4(), self.campanha_id, self.mestre.id),
            )

    def tearDown(self):
        self.database.close()
        with psycopg.connect(TEST_DSN, autocommit=True) as connection:
            connection.execute(sql.SQL("DROP SCHEMA IF EXISTS {} CASCADE").format(sql.Identifier(self.schema)))

    def _imagem(self, largura, altura, tipo="mapa", dono=None):
        item_id = uuid.uuid4()
        with self.database.connection() as connection:
            connection.execute(
                """
                INSERT INTO acervo_itens (id, dono_id, nome, tipo, largura, altura, chaves, estado)
                VALUES (%s, %s, 'Masmorra', %s, %s, %s, %s, 'pronto')
                """,
                (item_id, (dono or self.mestre).id, tipo, largura, altura, ["n0/0/0"]),
            )
        return item_id

    def test_projeto_criado_salvo_listado_e_apagado_so_pelo_mestre(self):
        from routers import construtor as rotas

        criado = rotas.criar_projeto(self.campanha_id, rotas.ProjetoInput(nome="Cripta", largura=6, altura=4), user=self.mestre, database=self.database)
        projeto_id = uuid.UUID(criado["id"])
        self.assertEqual(criado["conteudo"]["chao"], ["......"] * 4)
        salvo = rotas.salvar_projeto(self.campanha_id, projeto_id, rotas.ProjetoEdicao(conteudo=_sala()), user=self.mestre, database=self.database)
        self.assertEqual(salvo["conteudo"]["chao"][0], "LLL...")
        self.assertEqual(salvo["versao"], 2)
        # Aumentar o mapa completa o chão com vazio e mantém o desenho.
        maior = rotas.salvar_projeto(self.campanha_id, projeto_id, rotas.ProjetoEdicao(largura=8), user=self.mestre, database=self.database)
        self.assertEqual(maior["conteudo"]["chao"][0], "LLL.....")
        self.assertEqual(len(maior["conteudo"]["paredes"]), 10)
        lista = rotas.listar_projetos(self.campanha_id, user=self.mestre, database=self.database)["projetos"]
        self.assertEqual([p["nome"] for p in lista], ["Cripta"])
        self.assertNotIn("conteudo", lista[0])
        with self.assertRaises(Exception):
            rotas.listar_projetos(self.campanha_id, user=self.ana, database=self.database)
        with self.assertRaises(Exception):
            rotas.obter_projeto(self.campanha_id, projeto_id, user=self.ana, database=self.database)
        rotas.apagar_projeto(self.campanha_id, projeto_id, user=self.mestre, database=self.database)
        self.assertEqual(rotas.listar_projetos(self.campanha_id, user=self.mestre, database=self.database)["projetos"], [])

    def test_publicar_numa_cena_nova_e_depois_na_mesma_guardando_os_portais(self):
        from routers import construtor as rotas
        from routers import mapa as rotas_mapa

        criado = rotas.criar_projeto(self.campanha_id, rotas.ProjetoInput(nome="Cripta", largura=6, altura=4), user=self.mestre, database=self.database)
        projeto_id = uuid.UUID(criado["id"])
        conteudo = _sala()
        conteudo["paredes"]["h,0,2"] = "pedra"
        conteudo["aberturas"]["v,0,1"] = {"tipo": "secreta", "estado": "fechada"}
        rotas.salvar_projeto(self.campanha_id, projeto_id, rotas.ProjetoEdicao(conteudo=conteudo), user=self.mestre, database=self.database)

        with self.assertRaises(Exception):
            rotas.publicar_projeto(self.campanha_id, projeto_id, rotas.PublicarInput(mapa_id=self._imagem(500, 400)), user=self.mestre, database=self.database)
        publicado = rotas.publicar_projeto(
            self.campanha_id, projeto_id, rotas.PublicarInput(mapa_id=self._imagem(600, 400)), user=self.mestre, database=self.database,
        )
        cena = publicado["cena"]
        self.assertEqual((cena["nome"], cena["largura"], cena["altura"], cena["grade"]["tamanho"]), ("Cripta", 600, 400, 100))
        self.assertTrue(cena["ativa"])
        self.assertEqual(sorted(a["tipo"] for a in cena["aberturas"]), ["janela", "porta", "secreta"])
        cena_id = uuid.UUID(cena["id"])
        lista = rotas.listar_projetos(self.campanha_id, user=self.mestre, database=self.database)["projetos"]
        self.assertEqual((lista[0]["cena_id"], lista[0]["cena_nome"]), (str(cena_id), "Cripta"))

        visto = rotas_mapa.obter_mapa(self.campanha_id, None, user=self.ana, database=self.database)
        self.assertEqual(sorted(a["tipo"] for a in visto["cena"]["aberturas"]), ["janela", "porta"])

        # Um portal na cena, e o projeto publicado de novo nela: o portal fica.
        rotas_mapa.mudar_portais(
            self.campanha_id, cena_id, rotas_mapa.PortaisInput(portais=[{"a": {"x": 50, "y": 50}, "b": {"x": 550, "y": 350}}]),
            user=self.mestre, database=self.database,
        )
        conteudo["aberturas"]["h,1,2"]["estado"] = "aberta"
        rotas.salvar_projeto(self.campanha_id, projeto_id, rotas.ProjetoEdicao(conteudo=conteudo), user=self.mestre, database=self.database)
        de_novo = rotas.publicar_projeto(
            self.campanha_id, projeto_id, rotas.PublicarInput(mapa_id=self._imagem(600, 400), cena_id=cena_id), user=self.mestre, database=self.database,
        )
        self.assertEqual(de_novo["cena"]["id"], str(cena_id))
        self.assertEqual(len(de_novo["cena"]["portais"]), 1)
        porta = next(a for a in de_novo["cena"]["aberturas"] if a["tipo"] == "porta")
        self.assertEqual(porta["estado"], "aberta")
        self.assertEqual(len(rotas_mapa.obter_mapa(self.campanha_id, None, user=self.mestre, database=self.database)["cenas"]), 1)
        with self.database.connection() as connection:
            estrutura = connection.execute("SELECT estrutura FROM mapa_cenas WHERE id=%s", (cena_id,)).fetchone()["estrutura"]
        self.assertEqual(estrutura["projeto_id"], str(projeto_id))
        self.assertIn([0, 0, 300, 0], estrutura["paredes"])

    def test_jogador_nao_publica(self):
        from routers import construtor as rotas

        criado = rotas.criar_projeto(self.campanha_id, rotas.ProjetoInput(nome="Cripta", largura=6, altura=4), user=self.mestre, database=self.database)
        with self.assertRaises(Exception):
            rotas.publicar_projeto(
                self.campanha_id, uuid.UUID(criado["id"]), rotas.PublicarInput(mapa_id=self._imagem(600, 400)), user=self.ana, database=self.database,
            )
        with self.database.connection() as connection:
            connection.execute("UPDATE mapa_projetos SET conteudo=%s WHERE id=%s", (Jsonb({"chao": 5}), uuid.UUID(criado["id"])))
        # Registro estragado no banco abre como mapa vazio.
        aberto = rotas.obter_projeto(self.campanha_id, uuid.UUID(criado["id"]), user=self.mestre, database=self.database)
        self.assertEqual(aberto["conteudo"]["chao"], ["......"] * 4)

    def test_peca_do_acervo_entra_no_projeto_e_a_imagem_fica_protegida(self):
        from fastapi import HTTPException
        from routers import acervo as rotas_acervo
        from routers import construtor as rotas

        criado = rotas.criar_projeto(self.campanha_id, rotas.ProjetoInput(nome="Taverna", largura=6, altura=4), user=self.mestre, database=self.database)
        projeto_id = uuid.UUID(criado["id"])
        mesa = self._imagem(256, 128, tipo="objeto")
        peca = {
            "id": str(uuid.uuid4()), "imagem_id": str(mesa), "rotulo": "x", "imagem_largura": 1, "imagem_altura": 1,
            "x": 3, "y": 2, "escala": 2, "rotacao": 0, "espelhada": False,
        }
        salvo = rotas.salvar_projeto(
            self.campanha_id, projeto_id, rotas.ProjetoEdicao(conteudo={**_sala(), "pecas": [peca]}), user=self.mestre, database=self.database,
        )
        # Nome e tamanho vêm do Acervo, não do que o navegador mandou.
        self.assertEqual((salvo["conteudo"]["pecas"][0]["rotulo"], salvo["conteudo"]["pecas"][0]["imagem_largura"]), ("Masmorra", 256))
        with self.database.connection() as connection:
            self.assertTrue(rotas_acervo.pode_ler_item(connection, mesa, self.mestre, "n0/0/0"))
            self.assertFalse(rotas_acervo.pode_ler_item(connection, mesa, self.ana, "n0/0/0"))
        # A imagem em uso não sai do Acervo nem deixa de ser objeto.
        with self.assertRaises(HTTPException) as apagar:
            rotas_acervo.apagar_item(mesa, user=self.mestre, database=self.database)
        self.assertEqual(apagar.exception.status_code, 409)
        with self.assertRaises(HTTPException) as virar_mapa:
            rotas_acervo.editar_item(mesa, rotas_acervo.ItemEdicao(tipo="mapa"), user=self.mestre, database=self.database)
        self.assertEqual(virar_mapa.exception.status_code, 409)
        # Imagem que não é objeto, ou que é de outra pessoa, não vira peça.
        mapa_grande = self._imagem(600, 400)
        with self.assertRaises(HTTPException) as nao_objeto:
            rotas.salvar_projeto(
                self.campanha_id, projeto_id, rotas.ProjetoEdicao(conteudo={**_sala(), "pecas": [{**peca, "imagem_id": str(mapa_grande)}]}),
                user=self.mestre, database=self.database,
            )
        self.assertEqual(nao_objeto.exception.status_code, 422)
        alheia = self._imagem(64, 64, tipo="objeto", dono=self.ana)
        with self.assertRaises(HTTPException) as de_outro:
            rotas.salvar_projeto(
                self.campanha_id, projeto_id, rotas.ProjetoEdicao(conteudo={**_sala(), "pecas": [peca, {**peca, "id": str(uuid.uuid4()), "imagem_id": str(alheia)}]}),
                user=self.mestre, database=self.database,
            )
        self.assertEqual(de_outro.exception.status_code, 403)
        # Sem a peça no projeto, a imagem pode ser apagada.
        rotas.salvar_projeto(self.campanha_id, projeto_id, rotas.ProjetoEdicao(conteudo=_sala()), user=self.mestre, database=self.database)
        rotas_acervo.apagar_item(mesa, user=self.mestre, database=self.database)
