"""Ofício na criação: a faixa decide Lunaris, itens e renda.

Cobre os dados (todo item sugerido existe na Loja com a raridade da faixa), a
conferência do kit (raridade vem do catálogo, nunca do navegador) e a criação
de verdade no banco: Lunaris da faixa, item da Loja como item da Loja, item
escrito à mão como comum, e ficha sem ofício igual à regra antiga.
"""

from __future__ import annotations

import json
import os
import unittest
import uuid
from pathlib import Path

import psycopg
from fastapi import HTTPException
from psycopg import sql
from psycopg.conninfo import make_conninfo
from psycopg.types.json import Jsonb

from core import oficios
from core.character_summary import validar_regras_ficha
from core.database import Database
from core.dependencies import AuthenticatedUser
from routers.characters import create_character
from schemas import CharacterCreateInput

RAIZ = Path(__file__).resolve().parents[2]
CATALOGO = {
    entrada["id"]: entrada
    for entrada in json.loads((RAIZ / "data" / "loja" / "catalogo.json").read_text(encoding="utf-8"))["entradas"]
}
PERICIAS = {
    pericia["id"]
    for pericia in json.loads((RAIZ / "data" / "ficha" / "pericias.json").read_text(encoding="utf-8"))["pericias"]
}
TEST_DSN = (os.getenv("TEST_DATABASE_URL") or "").strip()


def test_faixas_seguem_a_tabela_de_trabalho_e_os_salarios():
    escala = json.loads((RAIZ / "data" / "economia" / "escala-precos-v1.json").read_text(encoding="utf-8"))
    salarios = escala["salarios_mensais"]
    faixas = oficios.FAIXAS
    assert [faixas[f]["por_dia"] for f in ("rua", "aprendiz", "trabalhador", "artesao", "especialista")] == [5, 5, 10, 25, 65]
    assert faixas["aprendiz"]["por_mes"] == salarios["servo_ou_aprendiz"]
    assert faixas["trabalhador"]["por_mes"] == salarios["trabalhador_comum"]
    assert faixas["artesao"]["por_mes"] == salarios["artesao_ou_soldado"]
    assert faixas["especialista"]["por_mes"] == salarios["especialista_ou_oficial"]
    # A faixa padrão é a regra antiga, para fichas sem ofício continuarem válidas.
    assert faixas[oficios.FAIXA_PADRAO]["lunaris_iniciais"] == 20
    assert faixas[oficios.FAIXA_PADRAO]["itens"] == {"comum": 1, "incomum": 0}
    lunaris = [faixas[f]["lunaris_iniciais"] for f in ("rua", "aprendiz", "trabalhador", "artesao", "especialista")]
    assert lunaris == sorted(lunaris)


def test_todo_oficio_aponta_para_itens_e_pericias_que_existem():
    for oficio in oficios.OFICIOS.values():
        faixa = oficios.FAIXAS[oficio["faixa"]]
        assert oficio["contato"]["quem"] and oficio["contato"]["ramo"], oficio["id"]
        for pericia in oficio["pericias"]:
            assert pericia in PERICIAS, (oficio["id"], pericia)
        for item in oficio["itens"]:
            if isinstance(item, dict):
                assert 2 <= len(item["titulo"]) <= 200
                continue
            entrada = CATALOGO.get(item)
            assert entrada, (oficio["id"], item)
            raridade = oficios.item_cabe_no_kit(entrada["conteudo"], entrada["tipo"])
            assert raridade, (oficio["id"], item)
            if raridade == "incomum":
                assert faixa["itens"]["incomum"] > 0, (oficio["id"], item)


def test_kit_barra_item_que_pede_nivel_acima_do_1():
    # As armaduras incomuns pedem o nível 5: a Loja não venderia a um personagem novo.
    assert CATALOGO["aco"]["conteudo"]["requisitoNivel"] == 5
    assert oficios.item_cabe_no_kit(CATALOGO["aco"]["conteudo"], "armadura") is None
    assert oficios.item_cabe_no_kit(CATALOGO["algemas"]["conteudo"], "equipamento") == "incomum"
    try:
        oficios.conferir_kit({"id": "oficial-da-guarda"}, [{"item_id": "aco"}], _catalogo("aco"))
    except oficios.KitInvalido:
        pass
    else:
        raise AssertionError("Armadura de Aço no nível 1")


def test_sobra_e_grau_minimo_das_faixas():
    faixas = oficios.FAIXAS
    ordem = ("rua", "aprendiz", "trabalhador", "artesao", "especialista")
    assert [faixas[f]["sobra_por_dia"] for f in ordem] == [1, 1, 2, 5, 13]
    assert [faixas[f]["grau_minimo"] for f in ordem] == [None, None, "aprendiz", "treinado", "especialista"]


def test_cada_faixa_tem_pelo_menos_tres_oficios():
    for faixa_id in oficios.FAIXAS:
        assert sum(1 for o in oficios.OFICIOS.values() if o["faixa"] == faixa_id) >= 3, faixa_id


def _catalogo(*ids):
    return {item_id: CATALOGO[item_id] for item_id in ids}


def test_kit_confere_raridade_pelo_catalogo():
    oficio = {"id": "medico", "faixa": "especialista"}
    kit = oficios.conferir_kit(
        oficio,
        [{"item_id": "pomada-restauradora"}, {"item_id": "faca"}, {"titulo": "Bisturi de prata"}],
        _catalogo("pomada-restauradora", "faca"),
    )
    assert [escolha.raridade for escolha in kit] == ["incomum", "comum", "comum"]
    assert kit[2].item_id is None

    # Dois incomuns não cabem; comum no lugar do incomum cabe.
    try:
        oficios.conferir_kit(oficio, [{"item_id": "pomada-restauradora"}, {"item_id": "traje"}], _catalogo("pomada-restauradora", "traje"))
    except oficios.KitInvalido:
        pass
    else:
        raise AssertionError("dois incomuns deveriam falhar")
    assert len(oficios.conferir_kit(oficio, [{"item_id": "faca"}] * 3, _catalogo("faca"))) == 3


def test_kit_barra_raridade_alta_patamar_alto_e_excesso():
    trabalhador = {"id": "pescador"}
    for item_id in ("pomada-restauradora", "espada-longa"):  # incomum na faixa errada; patamar 2
        try:
            oficios.conferir_kit(trabalhador, [{"item_id": item_id}], _catalogo(item_id))
        except oficios.KitInvalido:
            continue
        raise AssertionError(item_id)
    try:
        oficios.conferir_kit(trabalhador, [{"titulo": "a"}, {"titulo": "bb"}, {"titulo": "cc"}], {})
    except oficios.KitInvalido:
        pass
    else:
        raise AssertionError("tres itens na faixa de dois")
    try:
        oficios.conferir_kit(trabalhador, [{"item_id": "nao-existe"}], {})
    except oficios.KitInvalido:
        pass
    else:
        raise AssertionError("item fora do catalogo")


def test_oficio_personalizado_precisa_de_nome_e_faixa():
    assert oficios.validar_oficio(None) is None
    assert oficios.validar_oficio({"id": "personalizado", "titulo": "Domador de vespas", "faixa": "artesao"}) is None
    assert oficios.validar_oficio({"id": "personalizado", "titulo": "", "faixa": "artesao"})
    assert oficios.validar_oficio({"id": "personalizado", "titulo": "Rei", "faixa": "nobre"})
    assert oficios.validar_oficio({"id": "ferreiro", "faixa": "especialista"})
    assert oficios.faixa_do_oficio({"id": "personalizado", "titulo": "Domador", "faixa": "artesao"})["id"] == "artesao"
    assert oficios.faixa_do_oficio(None)["id"] == "aprendiz"


def test_aviso_de_regras_usa_os_lunaris_da_faixa():
    from core.character_summary import carregar_catalogos
    from tests.test_character_rules import _ficha_criacao

    carregar_catalogos(RAIZ / "data")
    ficha = _ficha_criacao()
    assert validar_regras_ficha(ficha, None, criacao=True) is None
    ficha_oficio = {**ficha, "oficio": {"id": "ferreiro", "faixa": "artesao"}}
    assert "80 Lunaris" in (validar_regras_ficha(ficha_oficio, None, criacao=True) or "")
    ficha_oficio["lunarisInicial"] = 80
    ficha_oficio["inventarioInicial"] = [{"item_id": "kit-de-ferramentas"}, {"titulo": "Avental"}]
    assert validar_regras_ficha(ficha_oficio, None, criacao=True) is None


@unittest.skipUnless(TEST_DSN, "TEST_DATABASE_URL nao configurada")
class CriacaoComOficioTests(unittest.TestCase):
    def setUp(self):
        if TEST_DSN == (os.getenv("DATABASE_URL") or "").strip():
            self.fail("TEST_DATABASE_URL nao pode ser o banco de producao")
        self.schema = f"jardim_test_{uuid.uuid4().hex}"
        with psycopg.connect(TEST_DSN, autocommit=True) as connection:
            connection.execute(sql.SQL("CREATE SCHEMA {}").format(sql.Identifier(self.schema)))
        self.database = Database(make_conninfo(TEST_DSN, options=f"-c search_path={self.schema}"))
        self.database.open()
        self.usuario_id = uuid.uuid4()
        self.campanha_id = uuid.uuid4()
        with self.database.connection() as connection:
            connection.execute(
                "INSERT INTO usuarios (id, email, nome_exibicao, senha_hash, papel_plataforma) VALUES (%s, 'j@example.com', 'Jogador', 'hash', 'player')",
                (self.usuario_id,),
            )
            connection.execute("INSERT INTO campanhas (id, dono_id, nome) VALUES (%s, %s, 'Mesa')", (self.campanha_id, self.usuario_id))
            connection.execute(
                "INSERT INTO membros_campanha (campanha_id, usuario_id, papel) VALUES (%s, %s, 'jogador')",
                (self.campanha_id, self.usuario_id),
            )
            for item_id in ("pomada-restauradora", "faca", "kit-de-ferramentas", "espada-longa"):
                entrada = CATALOGO[item_id]
                connection.execute(
                    """
                    INSERT INTO catalogo_itens (id, tipo, titulo, conteudo, ativo) VALUES (%s, %s, %s, %s, TRUE)
                    ON CONFLICT (id) DO UPDATE SET conteudo=EXCLUDED.conteudo, ativo=TRUE
                    """,
                    (item_id, entrada["tipo"], entrada["titulo"], Jsonb(entrada["conteudo"])),
                )
        self.ator = AuthenticatedUser(
            id=self.usuario_id, email="j@example.com", nome_exibicao="Jogador", admin_plataforma=False,
            papel_plataforma="player", session_id=uuid.uuid4(), csrf_hash="hash",
        )

    def tearDown(self):
        self.database.close()
        with psycopg.connect(TEST_DSN, autocommit=True) as connection:
            connection.execute(sql.SQL("DROP SCHEMA IF EXISTS {} CASCADE").format(sql.Identifier(self.schema)))

    def _criar(self, ficha):
        return create_character(
            payload=CharacterCreateInput(campanha_id=self.campanha_id, nome="Heroi", ficha=ficha),
            user=self.ator,
            database=self.database,
        )

    def test_especialista_ganha_lunaris_da_faixa_e_itens_da_loja(self):
        criado = self._criar({
            "oficio": {"id": "medico", "faixa": "especialista"},
            "lunarisInicial": 1_000_000,  # o servidor ignora e usa a faixa
            "inventarioInicial": [
                {"item_id": "pomada-restauradora"},
                {"item_id": "faca"},
                {"titulo": "Bisturi da escola"},
            ],
        })
        self.assertEqual(criado["carteira"], [{"moeda": "Lunaris", "saldo": 150}])
        itens = {item["titulo"]: item for item in criado["inventario_central"]}
        self.assertEqual(itens["Pomada Restauradora"]["dados"]["origem"], "loja")
        self.assertEqual(itens["Pomada Restauradora"]["dados"]["raridade"], "incomum")
        self.assertEqual(itens["Faca de Caça"]["item_id"], "faca")
        self.assertEqual(itens["Bisturi da escola"]["dados"]["origem"], "criacao")
        self.assertEqual(criado["ficha"]["oficio"]["id"], "medico")
        self.assertNotIn("lunarisInicial", criado["ficha"])
        with self.database.connection() as connection:
            saldo = connection.execute(
                "SELECT saldo FROM saldos_personagem WHERE personagem_id=%s", (criado["id"],),
            ).fetchone()["saldo"]
            lancamentos = connection.execute(
                "SELECT count(*) AS n FROM lancamentos_economia WHERE personagem_id=%s AND origem='criacao-personagem'",
                (criado["id"],),
            ).fetchone()["n"]
        self.assertEqual(int(saldo), 150)
        self.assertEqual(int(lancamentos), 4)  # Lunaris + 3 itens

    def test_ficha_sem_oficio_segue_a_regra_antiga(self):
        criado = self._criar({"inventarioInicial": [{"titulo": "Espada curta", "quantidade": 1}]})
        self.assertEqual(criado["carteira"], [{"moeda": "Lunaris", "saldo": 20}])
        self.assertEqual([item["titulo"] for item in criado["inventario_central"]], ["Espada curta"])
        sem_nada = self._criar({})
        self.assertEqual(sem_nada["carteira"], [{"moeda": "Lunaris", "saldo": 20}])
        self.assertEqual(sem_nada["inventario_central"], [])

    def test_kit_fora_da_faixa_nao_cria_nada(self):
        for ficha in (
            {"oficio": {"id": "pedinte"}, "inventarioInicial": [{"item_id": "pomada-restauradora"}]},
            {"oficio": {"id": "soldado"}, "inventarioInicial": [{"item_id": "espada-longa"}]},
            {"oficio": {"id": "nao-existe"}, "inventarioInicial": [{"titulo": "Pau"}]},
        ):
            with self.assertRaises(HTTPException) as erro:
                self._criar(ficha)
            self.assertEqual(erro.exception.status_code, 422)
        with self.database.connection() as connection:
            total = connection.execute("SELECT count(*) AS n FROM personagens").fetchone()["n"]
        self.assertEqual(int(total), 0)
