from __future__ import annotations

import hashlib
import json
import os
import tempfile
import unittest
import uuid
from pathlib import Path
from unittest.mock import patch

import psycopg
from fastapi import HTTPException
from fastapi.responses import FileResponse
from psycopg import sql
from psycopg.conninfo import make_conninfo
from starlette.requests import Request

from core.database import Database
from core.dependencies import AuthenticatedUser
from routers import livro


TEST_DSN = (os.getenv("TEST_DATABASE_URL") or "").strip()

PDF_JOGADOR = b"%PDF-1.7\n% edicao do jogador\n%%EOF\n"
PDF_MESTRE = b"%PDF-1.7\n% edicao do Mestre, com o Guia\n%%EOF\n"


def _manifesto(pasta: Path, **extras) -> str:
    sha = hashlib.sha256(PDF_JOGADOR).hexdigest()
    dados = {
        "versao": 1,
        "gerado_em": "2026-10-13T12:00:00Z",
        "edicoes": {
            "jogador": {
                "paginas": 120,
                "sha256": sha,
                "gerado_em": "2026-10-13T12:00:00Z",
                "topicos": [{"id": "como-jogar", "numero": "1.1", "pagina": 6}],
                "capitulos": [{"id": "primeiros-passos", "numero": 1, "pagina": 5}],
            },
        },
        **extras,
    }
    (pasta / livro.NOME_DO_MANIFESTO).write_text(json.dumps(dados), encoding="utf-8")
    return sha


def _requisicao(**cabecalhos: str) -> Request:
    return Request({
        "type": "http",
        "method": "GET",
        "path": "/api/v1/livro/pdf/jogador",
        "headers": [(nome.lower().replace("_", "-").encode(), valor.encode()) for nome, valor in cabecalhos.items()],
    })


class LocalizarEdicaoTests(unittest.TestCase):
    """O que a rota sabe de cada edição sem precisar de banco: arquivo, manifesto e etag."""

    def setUp(self):
        self._pasta = tempfile.TemporaryDirectory()
        self.pasta = Path(self._pasta.name)

    def tearDown(self):
        self._pasta.cleanup()

    def test_edicao_desconhecida_nao_existe(self):
        self.assertIsNone(livro.localizar_edicao("../../segredo", [self.pasta]))
        self.assertIsNone(livro.localizar_edicao("qualquer", [self.pasta]))

    def test_sem_o_arquivo_a_edicao_nao_aparece(self):
        _manifesto(self.pasta)
        self.assertIsNone(livro.localizar_edicao("jogador", [self.pasta]))

    def test_com_manifesto_traz_paginas_data_e_paginas_dos_topicos(self):
        (self.pasta / "O-Jardim-Livro-de-Regras.pdf").write_bytes(PDF_JOGADOR)
        sha = _manifesto(self.pasta)
        achada = livro.localizar_edicao("jogador", [self.pasta])
        self.assertEqual(achada["paginas"], 120)
        self.assertEqual(achada["bytes"], len(PDF_JOGADOR))
        self.assertEqual(achada["gerado_em"], "2026-10-13T12:00:00Z")
        self.assertEqual(achada["topicos"][0]["pagina"], 6)
        self.assertEqual(achada["capitulos"][0]["pagina"], 5)
        self.assertEqual(achada["etag"], f'"{sha}"')

    def test_sem_manifesto_o_pdf_ainda_sai_e_o_etag_vem_do_arquivo(self):
        (self.pasta / "O-Jardim-Livro-de-Regras.pdf").write_bytes(PDF_JOGADOR)
        achada = livro.localizar_edicao("jogador", [self.pasta])
        self.assertIsNone(achada["paginas"])
        self.assertEqual(achada["topicos"], [])
        self.assertEqual(achada["capitulos"], [])
        self.assertTrue(achada["etag"].startswith('"'))

    def test_manifesto_quebrado_nao_derruba_o_pdf(self):
        (self.pasta / "O-Jardim-Livro-de-Regras.pdf").write_bytes(PDF_JOGADOR)
        (self.pasta / livro.NOME_DO_MANIFESTO).write_text("{ isto nao e json", encoding="utf-8")
        achada = livro.localizar_edicao("jogador", [self.pasta])
        self.assertEqual(achada["bytes"], len(PDF_JOGADOR))
        self.assertIsNone(achada["paginas"])

    def test_a_primeira_pasta_com_o_arquivo_ganha(self):
        outra = tempfile.TemporaryDirectory()
        self.addCleanup(outra.cleanup)
        (Path(outra.name) / "O-Jardim-Livro-de-Regras.pdf").write_bytes(PDF_MESTRE)
        (self.pasta / "O-Jardim-Livro-de-Regras.pdf").write_bytes(PDF_JOGADOR)
        achada = livro.localizar_edicao("jogador", [Path(outra.name), self.pasta])
        self.assertEqual(achada["bytes"], len(PDF_MESTRE))

    def test_o_manifesto_do_repositorio_aponta_para_arquivos_que_existem(self):
        """Se o gerador escreveu o manifesto, cada edição listada nele tem o PDF ao lado."""
        for pasta in livro.pastas_do_livro():
            caminho = pasta / livro.NOME_DO_MANIFESTO
            if not caminho.is_file():
                continue
            manifesto = json.loads(caminho.read_text(encoding="utf-8"))
            for edicao, dados in (manifesto.get("edicoes") or {}).items():
                self.assertIn(edicao, livro.EDICOES)
                self.assertTrue((pasta / livro.EDICOES[edicao]["arquivo"]).is_file(), edicao)
                self.assertGreater(dados.get("paginas") or 0, 0, edicao)


@unittest.skipUnless(TEST_DSN, "TEST_DATABASE_URL nao configurada")
class RotasDoLivroTests(unittest.TestCase):
    """Quem pode baixar o quê, contra um Postgres de verdade (schema isolado)."""

    def setUp(self):
        production_dsn = (os.getenv("DATABASE_URL") or "").strip()
        if TEST_DSN == production_dsn:
            self.fail("TEST_DATABASE_URL nao pode ser o banco de producao")
        self.schema = f"jardim_test_{uuid.uuid4().hex}"
        with psycopg.connect(TEST_DSN, autocommit=True) as connection:
            connection.execute(sql.SQL("CREATE SCHEMA {}").format(sql.Identifier(self.schema)))
        self.database = Database(make_conninfo(TEST_DSN, options=f"-c search_path={self.schema}"))
        self.database.open()

        self._pasta = tempfile.TemporaryDirectory()
        self.pasta = Path(self._pasta.name)
        (self.pasta / "O-Jardim-Livro-de-Regras.pdf").write_bytes(PDF_JOGADOR)
        (self.pasta / "O-Jardim-Livro-de-Regras-MESTRE.pdf").write_bytes(PDF_MESTRE)
        self.sha = _manifesto(self.pasta)
        patcher = patch.object(livro, "pastas_do_livro", return_value=[self.pasta])
        patcher.start()
        self.addCleanup(patcher.stop)

        self.campanha_id = uuid.uuid4()
        self.outra_campanha_id = uuid.uuid4()
        self.mestre = self._conta("mestre@example.com", "Mestre", "mestre")
        self.assistente = self._conta("assistente@example.com", "Assistente", "player")
        self.jogador = self._conta("jogador@example.com", "Jogador", "player")
        self.admin = self._conta("admin@example.com", "Admin", "admin")
        self.criador = self._conta("criador@example.com", "Criador", "criador")
        with self.database.connection() as connection:
            for campanha in (self.campanha_id, self.outra_campanha_id):
                connection.execute(
                    "INSERT INTO campanhas (id, dono_id, nome) VALUES (%s, %s, 'Mesa')",
                    (campanha, self.mestre.id),
                )
            connection.execute(
                "INSERT INTO membros_campanha (campanha_id, usuario_id, papel) VALUES (%s, %s, 'mestre')",
                (self.campanha_id, self.mestre.id),
            )
            connection.execute(
                "INSERT INTO membros_campanha (campanha_id, usuario_id, papel) VALUES (%s, %s, 'assistente')",
                (self.campanha_id, self.assistente.id),
            )
            connection.execute(
                "INSERT INTO membros_campanha (campanha_id, usuario_id, papel) VALUES (%s, %s, 'jogador')",
                (self.campanha_id, self.jogador.id),
            )
            # O mestre desta mesa é só jogador na outra: lá a edição do Mestre não é dele.
            connection.execute(
                "INSERT INTO membros_campanha (campanha_id, usuario_id, papel) VALUES (%s, %s, 'jogador')",
                (self.outra_campanha_id, self.assistente.id),
            )

    def tearDown(self):
        self.database.close()
        self._pasta.cleanup()
        with psycopg.connect(TEST_DSN, autocommit=True) as connection:
            connection.execute(
                sql.SQL("DROP SCHEMA IF EXISTS {} CASCADE").format(sql.Identifier(self.schema))
            )

    def _conta(self, email: str, nome: str, papel: str) -> AuthenticatedUser:
        usuario_id = uuid.uuid4()
        with self.database.connection() as connection:
            connection.execute(
                """
                INSERT INTO usuarios (id, email, nome_exibicao, senha_hash, papel_plataforma)
                VALUES (%s, %s, %s, 'hash', %s)
                """,
                (usuario_id, email, nome, papel),
            )
        return AuthenticatedUser(
            id=usuario_id,
            email=email,
            nome_exibicao=nome,
            admin_plataforma=papel == "admin",
            papel_plataforma=papel,
            session_id=uuid.uuid4(),
            csrf_hash="hash",
        )

    def _edicoes(self, usuario, campanha_id=None) -> list[str]:
        resposta = livro.edicoes_disponiveis(campanha_id=campanha_id, user=usuario, database=self.database)
        return [item["edicao"] for item in resposta["edicoes"]]

    def _pdf(self, edicao, usuario, *, baixar=False, campanha_id=None, request=None):
        return livro.pdf_da_edicao(
            edicao=edicao,
            request=request or _requisicao(),
            baixar=baixar,
            campanha_id=campanha_id,
            user=usuario,
            database=self.database,
        )

    # ── lista ───────────────────────────────────────────────────────────────

    def test_jogador_ve_so_a_edicao_do_jogador(self):
        self.assertEqual(self._edicoes(self.jogador, self.campanha_id), ["jogador"])
        self.assertEqual(self._edicoes(self.jogador), ["jogador"])

    def test_mestre_ve_as_duas_quando_informa_a_mesa_que_conduz(self):
        self.assertEqual(self._edicoes(self.mestre, self.campanha_id), ["jogador", "mestre"])

    def test_mestre_sem_informar_a_mesa_so_ve_a_do_jogador(self):
        self.assertEqual(self._edicoes(self.mestre), ["jogador"])

    def test_ser_mestre_numa_mesa_nao_vale_em_outra(self):
        """Na mesa onde a pessoa é só jogadora, a edição do Mestre continua escondida."""
        self.assertEqual(self._edicoes(self.assistente, self.outra_campanha_id), ["jogador"])

    def test_assistente_conta_como_quem_conduz(self):
        self.assertEqual(self._edicoes(self.assistente, self.campanha_id), ["jogador", "mestre"])

    def test_admin_e_criador_veem_as_duas_sem_mesa(self):
        self.assertEqual(self._edicoes(self.admin), ["jogador", "mestre"])
        self.assertEqual(self._edicoes(self.criador), ["jogador", "mestre"])

    def test_mesa_que_nao_existe_nao_libera_nada(self):
        self.assertEqual(self._edicoes(self.jogador, uuid.uuid4()), ["jogador"])

    def test_lista_traz_paginas_bytes_e_a_pagina_de_cada_capitulo_e_topico(self):
        item = livro.edicoes_disponiveis(campanha_id=None, user=self.jogador, database=self.database)["edicoes"][0]
        self.assertEqual(item["paginas"], 120)
        self.assertEqual(item["bytes"], len(PDF_JOGADOR))
        self.assertEqual(item["topicos"], [{"id": "como-jogar", "numero": "1.1", "pagina": 6}])
        self.assertEqual(item["capitulos"], [{"id": "primeiros-passos", "numero": 1, "pagina": 5}])
        self.assertNotIn("caminho", item)

    def test_sem_arquivo_publicado_a_lista_vem_vazia(self):
        (self.pasta / "O-Jardim-Livro-de-Regras.pdf").unlink()
        self.assertEqual(self._edicoes(self.mestre, self.campanha_id), ["mestre"])

    # ── arquivo ─────────────────────────────────────────────────────────────

    def test_jogador_abre_o_pdf_no_navegador_por_padrao(self):
        resposta = self._pdf("jogador", self.jogador)
        self.assertIsInstance(resposta, FileResponse)
        self.assertEqual(resposta.media_type, "application/pdf")
        self.assertTrue(resposta.headers["content-disposition"].startswith("inline"))
        self.assertIn("O-Jardim-Livro-de-Regras.pdf", resposta.headers["content-disposition"])

    def test_baixar_manda_o_navegador_salvar_o_arquivo(self):
        resposta = self._pdf("jogador", self.jogador, baixar=True)
        self.assertTrue(resposta.headers["content-disposition"].startswith("attachment"))

    def test_o_pdf_leva_etag_e_cache_privado_e_foge_do_gzip(self):
        resposta = self._pdf("jogador", self.jogador)
        self.assertEqual(resposta.headers["etag"], f'"{self.sha}"')
        self.assertIn("private", resposta.headers["cache-control"])
        self.assertEqual(resposta.headers["content-encoding"], "identity")

    def test_etag_igual_devolve_304_sem_corpo(self):
        resposta = self._pdf("jogador", self.jogador, request=_requisicao(if_none_match=f'"{self.sha}"'))
        self.assertEqual(resposta.status_code, 304)

    def test_etag_diferente_manda_o_arquivo(self):
        resposta = self._pdf("jogador", self.jogador, request=_requisicao(if_none_match='"outro"'))
        self.assertIsInstance(resposta, FileResponse)

    def test_jogador_nao_baixa_a_edicao_do_mestre_nem_informando_a_mesa(self):
        for campanha in (None, self.campanha_id):
            with self.assertRaises(HTTPException) as erro:
                self._pdf("mestre", self.jogador, campanha_id=campanha)
            self.assertEqual(erro.exception.status_code, 403)

    def test_mestre_baixa_a_edicao_do_mestre_da_propria_mesa(self):
        resposta = self._pdf("mestre", self.mestre, campanha_id=self.campanha_id)
        self.assertIsInstance(resposta, FileResponse)
        self.assertEqual(Path(resposta.path).read_bytes(), PDF_MESTRE)

    def test_mestre_nao_baixa_a_edicao_do_mestre_sem_dizer_a_mesa(self):
        with self.assertRaises(HTTPException) as erro:
            self._pdf("mestre", self.mestre)
        self.assertEqual(erro.exception.status_code, 403)

    def test_admin_baixa_a_edicao_do_mestre(self):
        self.assertIsInstance(self._pdf("mestre", self.admin), FileResponse)

    def test_edicao_inexistente_e_arquivo_ausente_dao_404(self):
        with self.assertRaises(HTTPException) as erro:
            self._pdf("../../etc/passwd", self.jogador)
        self.assertEqual(erro.exception.status_code, 404)
        (self.pasta / "O-Jardim-Livro-de-Regras.pdf").unlink()
        with self.assertRaises(HTTPException) as erro:
            self._pdf("jogador", self.jogador)
        self.assertEqual(erro.exception.status_code, 404)


if __name__ == "__main__":
    unittest.main()
