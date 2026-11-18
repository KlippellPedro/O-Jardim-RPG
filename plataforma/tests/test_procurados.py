"""Quadro de procurados da Loja (core/procurados.py, routers/procurados.py) e a
cotação de venda do balcão (routers/shop.py, quote_sale).

Cobre: rascunho e notas do Mestre nunca chegam ao jogador; a imagem do cartaz
publicado fica legível para quem joga na campanha (e só para quem joga);
jogador entra na caçada só com personagem dele; a recompensa divide igual,
cai na carteira com lançamento no extrato e nunca é paga duas vezes; a
cotação lista todo o inventário com o mesmo preço que a venda credita.
"""

from __future__ import annotations

import json
import os
import unittest
import uuid
from pathlib import Path

import psycopg
import pytest
from fastapi import HTTPException
from psycopg import sql
from psycopg.conninfo import make_conninfo
from psycopg.types.json import Jsonb

from core import procurados
from core.procurados import ErroProcurado

TEST_DSN = (os.getenv("TEST_DATABASE_URL") or "").strip()

_CATALOGO_REAL = {
    e["id"]: e
    for e in json.loads(
        (Path(__file__).resolve().parents[2] / "data" / "loja" / "catalogo.json").read_text(encoding="utf-8")
    )["entradas"]
}


# ------------------------------------------------------------------ regras puras

def test_cartaz_novo_ganha_os_padroes_e_confere_os_textos():
    campos = procurados.normalizar({"nome": "  Lobo   de Cinza ", "recompensa_valor": 1500})
    assert campos["nome"] == "Lobo de Cinza"
    assert campos["condicao"] == "vivo-ou-morto" and campos["ameaca"] == "desconhecida"
    assert campos["status"] == "aberto" and campos["publicado"] is False
    assert campos["recompensa_moeda"] == "Lunaris" and campos["imagem_foco"] == 35
    assert campos["vd"] is None and campos["imagem_id"] is None
    with pytest.raises(ErroProcurado):
        procurados.normalizar({"nome": "   "})
    with pytest.raises(ErroProcurado):
        procurados.normalizar({"nome": "x" * 81})
    with pytest.raises(ErroProcurado):
        procurados.normalizar({"nome": "Ok", "ameaca": "apocaliptica"})
    with pytest.raises(ErroProcurado):
        procurados.normalizar({"nome": "Ok", "recompensa_valor": -1})
    with pytest.raises(ErroProcurado):
        procurados.normalizar({"nome": "Ok", "recompensa_valor": 2.5})
    with pytest.raises(ErroProcurado):
        procurados.normalizar({"nome": "Ok", "publicado": "sim"})
    with pytest.raises(ErroProcurado):
        procurados.normalizar({"nome": "Ok", "campo_inventado": 1})


def test_edicao_muda_so_o_que_veio_e_cartaz_pago_nao_troca_de_desfecho():
    atual = {"status": "capturado", "pagamento": {"total": 10}}
    assert procurados.normalizar({"local": " Ponte  velha "}, atual) == {"local": "Ponte velha"}
    with pytest.raises(ErroProcurado) as erro:
        procurados.normalizar({"status": "aberto"}, atual)
    assert erro.value.codigo == 409
    # Repetir o mesmo desfecho não é mudança.
    assert procurados.normalizar({"status": "capturado"}, atual) == {"status": "capturado"}


def test_descricao_mantem_paragrafos_e_limpa_espacos():
    campos = procurados.normalizar({"nome": "X", "descricao": "  Linha um  \r\n\r\n\r\n\r\nLinha   dois "})
    assert campos["descricao"] == "Linha um\n\nLinha dois"


def test_recompensa_divide_igual_e_a_sobra_vai_aos_primeiros():
    assert procurados.dividir_recompensa(1001, 2) == [501, 500]
    assert procurados.dividir_recompensa(10, 3) == [4, 3, 3]
    assert sum(procurados.dividir_recompensa(12345, 7)) == 12345
    assert procurados.dividir_recompensa(0, 2) == [0, 0]
    assert procurados.dividir_recompensa(50, 0) == []


def test_imagem_do_cartaz_usa_a_imagem_inteira_num_pedaco_so():
    base = {"imagem_id": uuid.uuid4(), "imagem_estado": "pronto"}
    assert procurados.imagem_do_cartaz({**base, "imagem_largura": 800, "imagem_altura": 600})["chave"] == "n0/0/0"
    assert procurados.imagem_do_cartaz({**base, "imagem_largura": 3000, "imagem_altura": 2000})["chave"] == "n2/0/0"
    assert procurados.imagem_do_cartaz({**base, "imagem_largura": 9000, "imagem_altura": 2000})["chave"] == "mini"
    assert procurados.imagem_do_cartaz({**base, "imagem_estado": "enviando", "imagem_largura": 10, "imagem_altura": 10}) is None
    assert procurados.imagem_do_cartaz({"imagem_id": None}) is None


def test_quadro_mostra_abertos_primeiro_e_os_mais_novos_em_cima():
    cartazes = [
        {"id": "a", "status": "capturado", "publicado_em": "2026-11-17T10:00:00", "atualizado_em": None},
        {"id": "b", "status": "aberto", "publicado_em": "2026-11-15T10:00:00", "atualizado_em": None},
        {"id": "c", "status": "aberto", "publicado_em": "2026-11-16T10:00:00", "atualizado_em": None},
    ]
    assert [c["id"] for c in procurados.ordenar(cartazes)] == ["c", "b", "a"]


def test_jogador_nao_recebe_notas_do_mestre():
    linha = {
        "id": uuid.uuid4(), "nome": "X", "especie": "", "descricao": "", "local": "", "condicao": "vivo",
        "ameaca": "baixa", "vd": None, "recompensa_valor": 5, "recompensa_moeda": "Lunaris", "imagem_id": None,
        "imagem_foco": 35, "status": "aberto", "publicado": True, "publicado_em": None, "atualizado_em": None,
        "notas_mestre": "segredo", "pagamento": None,
    }
    assert "notas_mestre" not in procurados.serializar(linha, [], gestor=False)
    assert procurados.serializar(linha, [], gestor=True)["notas_mestre"] == "segredo"


# ------------------------------------------------------------------ banco

@unittest.skipUnless(TEST_DSN, "TEST_DATABASE_URL nao configurada")
class ProcuradosBancoTests(unittest.TestCase):
    def setUp(self):
        from core.database import Database

        if TEST_DSN == (os.getenv("DATABASE_URL") or "").strip():
            self.fail("TEST_DATABASE_URL nao pode ser o banco de producao")
        self.schema = f"jardim_test_{uuid.uuid4().hex}"
        with psycopg.connect(TEST_DSN, autocommit=True) as connection:
            connection.execute(sql.SQL("CREATE SCHEMA {}").format(sql.Identifier(self.schema)))
        self.database = Database(make_conninfo(TEST_DSN, options=f"-c search_path={self.schema}"))
        self.database.open()
        self.campanha_id = uuid.uuid4()
        self.mestre = self._usuario("procurados-mestre@example.com", "mestre", plataforma="mestre")
        self.ana = self._usuario("procurados-ana@example.com", "jogador")
        self.bia = self._usuario("procurados-bia@example.com", "jogador")
        self.estranho = self._usuario("procurados-estranho@example.com", None)
        self.lyra = self._personagem(self.ana, "Lyra")
        self.bram = self._personagem(self.bia, "Bram")
        self.imagem = uuid.uuid4()
        with self.database.connection() as connection:
            connection.execute(
                """
                INSERT INTO acervo_itens (id, dono_id, nome, tipo, largura, altura, estado, chaves)
                VALUES (%s, %s, 'Dama Rubra', 'token', 800, 1000, 'pronto', %s)
                """,
                (self.imagem, self.mestre.id, ["mini", "n0/0/0"]),
            )

    def tearDown(self):
        self.database.close()
        with psycopg.connect(TEST_DSN, autocommit=True) as connection:
            connection.execute(sql.SQL("DROP SCHEMA IF EXISTS {} CASCADE").format(sql.Identifier(self.schema)))

    # -- helpers ---------------------------------------------------------

    def _usuario(self, email, papel, plataforma="player"):
        from core.dependencies import AuthenticatedUser

        pessoa = AuthenticatedUser(
            id=uuid.uuid4(), email=email, nome_exibicao=email.split("@")[0], admin_plataforma=False,
            papel_plataforma=plataforma, session_id=uuid.uuid4(), csrf_hash="hash",
        )
        with self.database.connection() as connection:
            connection.execute(
                "INSERT INTO usuarios (id, email, nome_exibicao, senha_hash, papel_plataforma) VALUES (%s, %s, %s, 'hash', %s)",
                (pessoa.id, email, pessoa.nome_exibicao, plataforma),
            )
            if papel == "mestre":
                connection.execute("INSERT INTO campanhas (id, dono_id, nome) VALUES (%s, %s, 'Mesa')", (self.campanha_id, pessoa.id))
            if papel:
                connection.execute(
                    "INSERT INTO membros_campanha (campanha_id, usuario_id, papel) VALUES (%s, %s, %s)",
                    (self.campanha_id, pessoa.id, papel),
                )
        return pessoa

    def _personagem(self, dono, nome):
        personagem_id = uuid.uuid4()
        with self.database.connection() as connection:
            connection.execute(
                "INSERT INTO personagens (id, campanha_id, dono_usuario_id, nome, criado_por) VALUES (%s, %s, %s, %s, %s)",
                (personagem_id, self.campanha_id, dono.id, nome, dono.id),
            )
        return personagem_id

    def _criar(self, **dados):
        from routers.procurados import criar

        corpo = {"nome": "Dama Rubra", "recompensa_valor": 1001, "imagem_id": str(self.imagem), **dados}
        return criar(campanha_id=self.campanha_id, dados=corpo, user=self.mestre, database=self.database)["procurado"]

    def _listar(self, quem):
        from routers.procurados import listar

        return listar(campanha_id=self.campanha_id, user=quem, database=self.database)["procurados"]

    def _saldo(self, personagem_id, moeda="Lunaris"):
        with self.database.connection() as connection:
            linha = connection.execute(
                "SELECT saldo FROM saldos_personagem WHERE personagem_id=%s AND moeda=%s", (personagem_id, moeda),
            ).fetchone()
        return int(linha["saldo"]) if linha else 0

    # -- comportamento -----------------------------------------------------

    def test_rascunho_e_notas_ficam_com_o_mestre(self):
        from routers.procurados import editar

        cartaz = self._criar(notas_mestre="É a irmã do Duque.")
        self.assertEqual(self._listar(self.ana), [], "rascunho não aparece para o jogador")
        self.assertEqual(self._listar(self.mestre)[0]["notas_mestre"], "É a irmã do Duque.")
        editar(campanha_id=self.campanha_id, procurado_id=uuid.UUID(cartaz["id"]), dados={"publicado": True}, user=self.mestre, database=self.database)
        vistos = self._listar(self.ana)
        self.assertEqual([c["nome"] for c in vistos], ["Dama Rubra"])
        self.assertNotIn("notas_mestre", vistos[0])
        self.assertEqual(vistos[0]["imagem"]["chave"], "n0/0/0")
        with self.database.connection() as connection:
            avisos = connection.execute(
                "SELECT usuario_id FROM notificacoes WHERE dados->>'tipo'='procurado_publicado'",
            ).fetchall()
        self.assertEqual({a["usuario_id"] for a in avisos}, {self.ana.id, self.bia.id}, "só os jogadores recebem o aviso")
        # Republicar não avisa de novo.
        editar(campanha_id=self.campanha_id, procurado_id=uuid.UUID(cartaz["id"]), dados={"publicado": False}, user=self.mestre, database=self.database)
        editar(campanha_id=self.campanha_id, procurado_id=uuid.UUID(cartaz["id"]), dados={"publicado": True}, user=self.mestre, database=self.database)
        with self.database.connection() as connection:
            total = connection.execute("SELECT COUNT(*) AS n FROM notificacoes WHERE dados->>'tipo'='procurado_publicado'").fetchone()["n"]
        self.assertEqual(total, 2)

    def test_jogador_nao_prega_cartaz_nem_usa_imagem_alheia(self):
        from routers.procurados import criar

        with self.assertRaises(HTTPException) as erro:
            criar(campanha_id=self.campanha_id, dados={"nome": "X"}, user=self.ana, database=self.database)
        self.assertEqual(erro.exception.status_code, 403)
        alheia = uuid.uuid4()
        with self.database.connection() as connection:
            connection.execute(
                "INSERT INTO acervo_itens (id, dono_id, nome, tipo, largura, altura, estado, chaves) VALUES (%s, %s, 'x', 'token', 10, 10, 'pronto', %s)",
                (alheia, self.ana.id, ["mini", "n0/0/0"]),
            )
        with self.assertRaises(HTTPException) as erro:
            self._criar(imagem_id=str(alheia))
        self.assertEqual(erro.exception.status_code, 422)

    def test_imagem_do_cartaz_publicado_vale_so_para_quem_joga_na_campanha(self):
        from routers.procurados import editar

        cartaz = self._criar()
        with self.database.connection() as connection:
            self.assertFalse(procurados.pode_ler_imagem(connection, self.imagem, self.ana.id), "rascunho não libera a imagem")
        editar(campanha_id=self.campanha_id, procurado_id=uuid.UUID(cartaz["id"]), dados={"publicado": True}, user=self.mestre, database=self.database)
        with self.database.connection() as connection:
            self.assertTrue(procurados.pode_ler_imagem(connection, self.imagem, self.ana.id))
            self.assertFalse(procurados.pode_ler_imagem(connection, self.imagem, self.estranho.id))

    def test_cacada_paga_dividido_uma_vez_so(self):
        from routers.procurados import EncerrarInput, CacadorInput, editar, encerrar, entrar_na_cacada

        cartaz = self._criar(publicado=True)
        procurado_id = uuid.UUID(cartaz["id"])
        with self.assertRaises(HTTPException) as erro:
            entrar_na_cacada(campanha_id=self.campanha_id, procurado_id=procurado_id, payload=CacadorInput(personagem_id=self.bram), user=self.ana, database=self.database)
        self.assertEqual(erro.exception.status_code, 422, "jogador só entra com personagem dele")
        resposta = entrar_na_cacada(campanha_id=self.campanha_id, procurado_id=procurado_id, payload=CacadorInput(personagem_id=self.lyra), user=self.ana, database=self.database)
        self.assertEqual([(c["nome"], c["meu"]) for c in resposta["procurado"]["cacadores"]], [("Lyra", True)])
        # Entrar de novo não duplica.
        entrar_na_cacada(campanha_id=self.campanha_id, procurado_id=procurado_id, payload=CacadorInput(personagem_id=self.lyra), user=self.ana, database=self.database)
        self.assertEqual(len(self._listar(self.mestre)[0]["cacadores"]), 1)

        with self.assertRaises(HTTPException) as erro:
            encerrar(campanha_id=self.campanha_id, procurado_id=procurado_id, payload=EncerrarInput(desfecho="capturado", personagens=[self.lyra]), user=self.ana, database=self.database)
        self.assertEqual(erro.exception.status_code, 403)
        with self.assertRaises(HTTPException) as erro:
            encerrar(campanha_id=self.campanha_id, procurado_id=procurado_id, payload=EncerrarInput(desfecho="abatido", personagens=[]), user=self.mestre, database=self.database)
        self.assertEqual(erro.exception.status_code, 422, "pagar exige alguém para receber")

        pago = encerrar(
            campanha_id=self.campanha_id, procurado_id=procurado_id,
            payload=EncerrarInput(desfecho="capturado", personagens=[self.lyra, self.bram]),
            user=self.mestre, database=self.database,
        )["procurado"]
        self.assertEqual(pago["status"], "capturado")
        self.assertEqual([p["valor"] for p in pago["pagamento"]["personagens"]], [501, 500])
        self.assertEqual((self._saldo(self.lyra), self._saldo(self.bram)), (501, 500))
        with self.database.connection() as connection:
            extrato = connection.execute(
                "SELECT personagem_id, delta FROM lancamentos_economia WHERE origem='procurado.recompensa' ORDER BY delta DESC",
            ).fetchall()
            versoes = connection.execute("SELECT economia_versao FROM personagens WHERE id=%s", (self.lyra,)).fetchone()
        self.assertEqual([(e["personagem_id"], e["delta"]) for e in extrato], [(self.lyra, 501), (self.bram, 500)])
        self.assertEqual(versoes["economia_versao"], 2, "a ficha percebe que a carteira mudou")

        with self.assertRaises(HTTPException) as erro:
            encerrar(campanha_id=self.campanha_id, procurado_id=procurado_id, payload=EncerrarInput(desfecho="capturado", personagens=[self.lyra]), user=self.mestre, database=self.database)
        self.assertEqual(erro.exception.status_code, 409)
        with self.assertRaises(HTTPException) as erro:
            editar(campanha_id=self.campanha_id, procurado_id=procurado_id, dados={"status": "aberto"}, user=self.mestre, database=self.database)
        self.assertEqual(erro.exception.status_code, 409)
        self.assertEqual(self._saldo(self.lyra), 501)
        with self.assertRaises(HTTPException) as erro:
            entrar_na_cacada(campanha_id=self.campanha_id, procurado_id=procurado_id, payload=CacadorInput(personagem_id=self.lyra), user=self.ana, database=self.database)
        self.assertEqual(erro.exception.status_code, 409, "caçada encerrada não aceita ninguém")

    def test_cancelar_nao_paga(self):
        from routers.procurados import EncerrarInput, encerrar

        cartaz = self._criar(publicado=True)
        resposta = encerrar(
            campanha_id=self.campanha_id, procurado_id=uuid.UUID(cartaz["id"]),
            payload=EncerrarInput(desfecho="cancelado", personagens=[self.lyra]),
            user=self.mestre, database=self.database,
        )["procurado"]
        self.assertEqual(resposta["status"], "cancelado")
        self.assertIsNone(resposta["pagamento"])
        self.assertEqual(self._saldo(self.lyra), 0)

    def test_apagar_a_imagem_do_acervo_tira_so_a_imagem_do_cartaz(self):
        cartaz = self._criar(publicado=True)
        with self.database.connection() as connection:
            connection.execute("DELETE FROM acervo_itens WHERE id=%s", (self.imagem,))
        vistos = self._listar(self.ana)
        self.assertEqual(vistos[0]["id"], cartaz["id"])
        self.assertIsNone(vistos[0]["imagem"])

    def test_cotacao_lista_todo_o_inventario_com_o_preco_da_venda(self):
        from routers.shop import quote_sale, sell_batch
        from schemas import ShopBatchCommandInput, ShopCommandItemInput

        adaga = _CATALOGO_REAL["adaga"]
        with self.database.connection() as connection:
            connection.execute(
                "INSERT INTO catalogo_itens (id, tipo, titulo, conteudo, ativo) VALUES (%s, %s, %s, %s, TRUE)",
                (adaga["id"], adaga["tipo"], adaga["titulo"], Jsonb(adaga["conteudo"])),
            )
            connection.execute(
                "INSERT INTO inventario_personagem (campanha_id, personagem_id, item_id, titulo, quantidade, dados) VALUES (%s, %s, 'adaga', 'Adaga', 2, %s)",
                (self.campanha_id, self.lyra, Jsonb({**adaga["conteudo"], "tipo": "arma", "origem": "loja", "catalogo_item_id": "adaga"})),
            )
            connection.execute(
                "INSERT INTO inventario_personagem (campanha_id, personagem_id, item_id, titulo, quantidade, dados) VALUES (%s, %s, %s, 'Medalhão', 1, %s)",
                (self.campanha_id, self.lyra, f"manual:{uuid.uuid4()}", Jsonb({"origem": "manual", "preco": {"Lunaris": 99999}})),
            )
            connection.execute(
                "INSERT INTO inventario_personagem (campanha_id, personagem_id, item_id, titulo, quantidade, dados) VALUES (%s, %s, 'sumiu', 'Item velho', 1, %s)",
                (self.campanha_id, self.lyra, Jsonb({"origem": "loja", "catalogo_item_id": "sumiu"})),
            )
        cotacao = quote_sale(campanha_id=self.campanha_id, personagem_id=self.lyra, user=self.ana, database=self.database)
        por_titulo = {item["titulo"]: item for item in cotacao["itens"]}
        self.assertEqual(set(por_titulo), {"Adaga", "Medalhão", "Item velho"}, "a cotação mostra o inventário inteiro")
        self.assertTrue(por_titulo["Adaga"]["vendavel"])
        self.assertEqual(por_titulo["Adaga"]["max_venda"], 2)
        self.assertEqual(por_titulo["Medalhão"]["motivo"], "sem_origem", "preço escrito na ficha não vale no balcão")
        self.assertIsNone(por_titulo["Medalhão"]["preco_unitario"])
        self.assertEqual(por_titulo["Item velho"]["motivo"], "fora_do_catalogo")

        with self.assertRaises(HTTPException) as erro:
            quote_sale(campanha_id=self.campanha_id, personagem_id=self.lyra, user=self.bia, database=self.database)
        self.assertEqual(erro.exception.status_code, 422, "ninguém cota a bolsa de outra pessoa")

        unitario = por_titulo["Adaga"]["preco_unitario"]
        resultado = sell_batch(
            payload=ShopBatchCommandInput(
                campanha_id=self.campanha_id, personagem_id=self.lyra, economia_versao_esperada=cotacao["economia_versao"],
                idempotencia="teste-cotacao-venda", itens=[ShopCommandItemInput(item_id="adaga", quantidade=2)],
            ),
            user=self.ana, database=self.database,
        )
        self.assertEqual(resultado["creditos"][0]["valor"], unitario["valor"] * 2, "a venda credita o que a cotação mostrou")

    def test_cotacao_segura_o_ultimo_exemplar_modificado(self):
        from routers.shop import quote_sale

        adaga = _CATALOGO_REAL["adaga"]
        with self.database.connection() as connection:
            connection.execute(
                "INSERT INTO catalogo_itens (id, tipo, titulo, conteudo, ativo) VALUES (%s, %s, %s, %s, TRUE)",
                (adaga["id"], adaga["tipo"], adaga["titulo"], Jsonb(adaga["conteudo"])),
            )
            connection.execute(
                "INSERT INTO inventario_personagem (campanha_id, personagem_id, item_id, titulo, quantidade, dados) VALUES (%s, %s, 'adaga', 'Adaga', 1, %s)",
                (self.campanha_id, self.lyra, Jsonb({**adaga["conteudo"], "origem": "loja", "catalogo_item_id": "adaga", "modificacoes": [{"nome": "Fio Serrilhado"}]})),
            )
        item = quote_sale(campanha_id=self.campanha_id, personagem_id=self.lyra, user=self.ana, database=self.database)["itens"][0]
        self.assertFalse(item["vendavel"])
        self.assertEqual(item["motivo"], "modificado")
        self.assertEqual(item["modificacoes"], ["Fio Serrilhado"])
