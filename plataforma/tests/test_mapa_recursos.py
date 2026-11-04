"""Documentos mostrados na mesa e trilha sincronizada (routers/mapa_recursos.py)."""

from __future__ import annotations

import asyncio
import json
import os
import unittest
import uuid

import psycopg
from psycopg import sql
from psycopg.conninfo import make_conninfo

from core import tempo_real

TEST_DSN = (os.getenv("TEST_DATABASE_URL") or "").strip()

#: Um cabeçalho Ogg basta: o servidor confere a assinatura, não decodifica o áudio.
OGG = b"OggS" + bytes(60)


def test_documento_vai_ao_mestre_e_so_aos_donos_dos_personagens_escolhidos():
    tempo_real._limpar_para_testes()
    mestre = tempo_real.Conexao(usuario_id="m", nome="M", gestor=True)
    ana = tempo_real.Conexao(usuario_id="ana", nome="Ana", gestor=False, personagens=frozenset({"p-ana"}))
    beto = tempo_real.Conexao(usuario_id="beto", nome="Beto", gestor=False, personagens=frozenset({"p-beto"}))
    for conexao in (mestre, ana, beto):
        tempo_real.entrar("camp", conexao)
        conexao.tirar_agora()

    def documentos(conexao):
        return [m for m in map(json.loads, conexao.tirar_agora()) if m["t"] == "documento"]

    tempo_real.anunciar_para("camp", {"t": "documento", "documento": {"titulo": "Carta"}}, ["p-ana"])
    assert documentos(mestre) and documentos(ana)
    assert not documentos(beto), "o documento mirado não chega a quem não foi escolhido"
    tempo_real.anunciar_para("camp", {"t": "documento", "documento": {"titulo": "Aviso"}}, None)
    assert all(documentos(conexao) for conexao in (mestre, ana, beto))
    tempo_real._limpar_para_testes()


class _PedidoFalso:
    """O bastante de um Request do Starlette para o envio da trilha."""

    def __init__(self, corpo: bytes, tipo: str, nome: str = "Chuva.ogg"):
        self.headers = {"content-type": tipo, "content-length": str(len(corpo)), "x-trilha-nome": nome}
        self._corpo = corpo

    async def stream(self):
        yield self._corpo


@unittest.skipUnless(TEST_DSN, "TEST_DATABASE_URL nao configurada")
class RecursosDaMesaBancoTests(unittest.TestCase):
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

        self.mestre = usuario("recursos-mestre@example.com", "Mestre", "mestre", plataforma="mestre")
        self.ana = usuario("recursos-ana@example.com", "Ana", "jogador")
        self.sessao = uuid.uuid4()
        self.personagem = uuid.uuid4()
        self.fora = uuid.uuid4()
        self.documento = uuid.uuid4()
        with self.database.connection() as connection:
            connection.execute(
                "INSERT INTO sessoes_mesa (id, campanha_id, status, titulo, aberta_por) VALUES (%s, %s, 'aberta', 'Noite 1', %s)",
                (self.sessao, self.campanha_id, self.mestre.id),
            )
            for personagem, nome in ((self.personagem, "Mira"), (self.fora, "Ausente")):
                connection.execute(
                    "INSERT INTO personagens (id, campanha_id, dono_usuario_id, criado_por, nome) VALUES (%s, %s, %s, %s, %s)",
                    (personagem, self.campanha_id, self.ana.id, self.ana.id, nome),
                )
            connection.execute(
                "INSERT INTO sessao_participantes (id, sessao_id, personagem_id, nome, tipo) VALUES (%s, %s, %s, 'Mira', 'jogador')",
                (uuid.uuid4(), self.sessao, self.personagem),
            )
            connection.execute(
                "INSERT INTO campanha_documentos (id, campanha_id, modelo, titulo, campos) VALUES (%s, %s, 'carta', 'Carta do Barão', '{}'::jsonb)",
                (self.documento, self.campanha_id),
            )

    def tearDown(self):
        tempo_real._limpar_para_testes()
        self.database.close()
        with psycopg.connect(TEST_DSN, autocommit=True) as connection:
            connection.execute(sql.SQL("DROP SCHEMA IF EXISTS {} CASCADE").format(sql.Identifier(self.schema)))

    def test_so_o_mestre_mostra_documentos_e_so_para_quem_esta_na_sessao(self):
        from fastapi import HTTPException
        from routers import mapa_recursos as rotas

        pedido = rotas.CompartilharDocumento
        self.assertTrue(rotas.mostrar_documento(self.campanha_id, self.documento, pedido(), user=self.mestre, database=self.database)["ok"])
        self.assertTrue(rotas.mostrar_documento(
            self.campanha_id, self.documento, pedido(personagens=[self.personagem]), user=self.mestre, database=self.database,
        )["ok"])
        for invalido in ([], [self.fora]):
            with self.assertRaises(HTTPException) as erro:
                rotas.mostrar_documento(self.campanha_id, self.documento, pedido(personagens=invalido), user=self.mestre, database=self.database)
            self.assertEqual(erro.exception.status_code, 422)
        with self.assertRaises(HTTPException) as erro:
            rotas.mostrar_documento(self.campanha_id, self.documento, pedido(), user=self.ana, database=self.database)
        self.assertEqual(erro.exception.status_code, 403)
        with self.assertRaises(HTTPException) as erro:
            rotas.mostrar_documento(self.campanha_id, uuid.uuid4(), pedido(), user=self.mestre, database=self.database)
        self.assertEqual(erro.exception.status_code, 404)

    def _enviar(self, quem, corpo=OGG, tipo="audio/ogg"):
        from routers import mapa_recursos as rotas

        return asyncio.run(rotas.enviar_trilha(self.campanha_id, _PedidoFalso(corpo, tipo), user=quem, database=self.database))

    def test_trilha_confere_o_arquivo_e_o_jogador_so_ouve_a_faixa_da_cena(self):
        from fastapi import HTTPException
        from routers import mapa_recursos as rotas

        with self.assertRaises(HTTPException) as erro:
            self._enviar(self.ana)
        self.assertEqual(erro.exception.status_code, 403)
        with self.assertRaises(HTTPException) as erro:
            self._enviar(self.mestre, corpo=b"<html>" + bytes(40))
        self.assertEqual(erro.exception.status_code, 415, "a assinatura do arquivo precisa bater com o tipo")
        with self.assertRaises(HTTPException):
            self._enviar(self.mestre, tipo="text/html")

        faixa = self._enviar(self.mestre)
        outra = self._enviar(self.mestre)
        self.assertEqual((faixa["nome"], faixa["mime"]), ("Chuva.ogg", "audio/ogg"))

        # O jogador não lista as faixas guardadas e só baixa a que está na cena.
        lista = rotas.listar_trilhas(self.campanha_id, user=self.ana, database=self.database)
        self.assertEqual((lista["faixas"], lista["gestor"]), ([], False))
        self.assertEqual(len(rotas.listar_trilhas(self.campanha_id, user=self.mestre, database=self.database)["faixas"]), 2)
        with self.assertRaises(HTTPException) as erro:
            rotas.obter_audio(self.campanha_id, uuid.UUID(faixa["id"]), _PedidoFalso(b"", ""), user=self.ana, database=self.database)
        self.assertEqual(erro.exception.status_code, 404)

        with self.assertRaises(HTTPException):
            rotas.definir_trilha(self.campanha_id, rotas.EstadoTrilhaInput(faixa_id=faixa["id"], reproduzindo=True), user=self.ana, database=self.database)
        estado = rotas.definir_trilha(
            self.campanha_id, rotas.EstadoTrilhaInput(faixa_id=faixa["id"], reproduzindo=True, posicao_ms=1500),
            user=self.mestre, database=self.database,
        )
        self.assertTrue(estado["reproduzindo"])
        self.assertGreaterEqual(estado["posicao_ms"], 1500)
        self.assertEqual(rotas.listar_trilhas(self.campanha_id, user=self.ana, database=self.database)["estado"]["faixa_id"], faixa["id"])

        pedido = _PedidoFalso(b"", "")
        pedido.headers = {"range": "bytes=0-3"}
        parte = rotas.obter_audio(self.campanha_id, uuid.UUID(faixa["id"]), pedido, user=self.ana, database=self.database)
        self.assertEqual((parte.status_code, parte.body), (206, b"OggS"))
        with self.assertRaises(HTTPException):
            rotas.obter_audio(self.campanha_id, uuid.UUID(outra["id"]), _PedidoFalso(b"", ""), user=self.ana, database=self.database)

        # Apagar a faixa que toca para a mesa e o estado volta a vazio.
        rotas.apagar_trilha(self.campanha_id, uuid.UUID(faixa["id"]), user=self.mestre, database=self.database)
        vazio = rotas.listar_trilhas(self.campanha_id, user=self.mestre, database=self.database)["estado"]
        self.assertEqual((vazio["faixa_id"], vazio["reproduzindo"]), (None, False))

    def test_sem_sessao_aberta_o_jogador_nao_abre_a_trilha(self):
        from fastapi import HTTPException
        from routers import mapa_recursos as rotas

        with self.database.connection() as connection:
            connection.execute("UPDATE sessoes_mesa SET status='encerrada' WHERE id=%s", (self.sessao,))
        with self.assertRaises(HTTPException) as erro:
            rotas.listar_trilhas(self.campanha_id, user=self.ana, database=self.database)
        self.assertEqual(erro.exception.status_code, 403)
        self.assertTrue(rotas.listar_trilhas(self.campanha_id, user=self.mestre, database=self.database)["gestor"])

    def test_audio_sai_do_banco_so_no_trecho_pedido(self):
        from fastapi import HTTPException
        from routers import mapa_recursos as rotas

        corpo = b"OggS" + bytes(range(60))
        faixa = self._enviar(self.mestre, corpo=corpo)
        rotas.definir_trilha(
            self.campanha_id, rotas.EstadoTrilhaInput(faixa_id=faixa["id"], reproduzindo=False), user=self.mestre, database=self.database,
        )

        def pedir(intervalo=None, quem=None):
            pedido = _PedidoFalso(b"", "")
            pedido.headers = {"range": intervalo} if intervalo else {}
            return rotas.obter_audio(self.campanha_id, uuid.UUID(faixa["id"]), pedido, user=quem or self.ana, database=self.database)

        inteiro = pedir()
        self.assertEqual((inteiro.status_code, inteiro.body), (200, corpo))
        self.assertEqual(inteiro.headers["content-length"], str(len(corpo)))
        meio = pedir("bytes=10-19")
        self.assertEqual((meio.status_code, meio.body), (206, corpo[10:20]))
        self.assertEqual(meio.headers["content-range"], f"bytes 10-19/{len(corpo)}")
        self.assertEqual(pedir("bytes=40-").body, corpo[40:])
        self.assertEqual(pedir("bytes=-8").body, corpo[-8:])
        # Pedir além do fim encolhe para o que existe, e o cabeçalho conta o que saiu de verdade.
        fim = pedir(f"bytes={len(corpo) - 4}-{len(corpo) + 500}")
        self.assertEqual((fim.body, fim.headers["content-length"]), (corpo[-4:], "4"))
        for invalido in (f"bytes={len(corpo)}-", "bytes=9-3", "bytes=a-b", "bytes=0-1,5-6", "chars=0-1"):
            self.assertEqual(pedir(invalido).status_code, 416, invalido)
        with self.assertRaises(HTTPException):
            rotas.obter_audio(
                self.campanha_id, uuid.uuid4(), _PedidoFalso(b"", ""), user=self.mestre, database=self.database,
            )

    def test_a_mesa_guarda_um_numero_limitado_de_trilhas(self):
        from fastapi import HTTPException
        from routers import mapa_recursos as rotas

        anterior = rotas.MAX_TRILHAS
        rotas.MAX_TRILHAS = 2
        try:
            self._enviar(self.mestre)
            self._enviar(self.mestre)
            with self.assertRaises(HTTPException) as erro:
                self._enviar(self.mestre)
            self.assertEqual(erro.exception.status_code, 409)
            self.assertIn("apague", erro.exception.detail)
        finally:
            rotas.MAX_TRILHAS = anterior


def test_trilhas_ficam_fora_do_backup_em_jsonl():
    """O áudio de até 20 MB por faixa não cabe no backup montado em memória (ver core/backup.py)."""
    from core.backup import TABELAS, TABELAS_IGNORADAS

    for tabela in ("mapa_trilhas", "mapa_trilha_estado"):
        assert tabela in TABELAS_IGNORADAS
        assert tabela not in TABELAS
