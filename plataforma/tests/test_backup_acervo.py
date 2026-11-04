"""Backup próprio das imagens do acervo (core/backup.py): ZIP por partes, com cursor, e restauração."""

from __future__ import annotations

import io
import json
import os
import unittest
import uuid
import zipfile

import psycopg
from psycopg import sql
from psycopg.conninfo import make_conninfo

TEST_DSN = (os.getenv("TEST_DATABASE_URL") or "").strip()


@unittest.skipUnless(TEST_DSN, "TEST_DATABASE_URL nao configurada")
class BackupDoAcervoTests(unittest.TestCase):
    def setUp(self):
        from core.database import Database

        if TEST_DSN == (os.getenv("DATABASE_URL") or "").strip():
            self.fail("TEST_DATABASE_URL nao pode ser o banco de producao")
        self.schema = f"jardim_test_{uuid.uuid4().hex}"
        with psycopg.connect(TEST_DSN, autocommit=True) as connection:
            connection.execute(sql.SQL("CREATE SCHEMA {}").format(sql.Identifier(self.schema)))
        self.database = Database(make_conninfo(TEST_DSN, options=f"-c search_path={self.schema}"))
        self.database.open()
        self.dono = uuid.uuid4()
        self.item = uuid.uuid4()
        with self.database.connection() as connection:
            connection.execute(
                "INSERT INTO usuarios (id, email, nome_exibicao, senha_hash, papel_plataforma) VALUES (%s, 'acervo@example.com', 'Dono', 'hash', 'mestre')",
                (self.dono,),
            )
            connection.execute(
                "INSERT INTO acervo_itens (id, dono_id, nome, tipo, largura, altura, estado) VALUES (%s, %s, 'Cripta', 'mapa', 2048, 1024, 'pronto')",
                (self.item, self.dono),
            )
            for ordem, chave in enumerate(("mini", "n0/0/0", "n0/1/0", "n1/0/0", "n1/1/0")):
                connection.execute(
                    "INSERT INTO acervo_arquivos (item_id, chave, mime, tamanho, dados, criado_em) VALUES (%s, %s, 'image/webp', %s, %s, now() + make_interval(secs => %s))",
                    (self.item, chave, 1000 + ordem, bytes([ordem]) * (1000 + ordem), ordem),
                )

    def tearDown(self):
        self.database.close()
        with psycopg.connect(TEST_DSN, autocommit=True) as connection:
            connection.execute(sql.SQL("DROP SCHEMA IF EXISTS {} CASCADE").format(sql.Identifier(self.schema)))

    @staticmethod
    def _abrir(conteudo):
        pacote = zipfile.ZipFile(io.BytesIO(conteudo))
        return pacote, json.loads(pacote.read("manifesto.json"))

    def test_uma_parte_leva_tudo_e_o_zip_confere_com_o_banco(self):
        from core.backup import gerar_backup_acervo

        conteudo, resumo = gerar_backup_acervo(self.database)
        self.assertEqual((resumo["arquivos"], resumo["mais"]), (5, False))
        pacote, manifesto = self._abrir(conteudo)
        self.assertEqual([e["chave"] for e in manifesto["arquivos"]], ["mini", "n0/0/0", "n0/1/0", "n1/0/0", "n1/1/0"])
        for entrada in manifesto["arquivos"]:
            self.assertEqual(len(pacote.read(entrada["arquivo"])), entrada["tamanho"])
            self.assertNotIn("/..", entrada["arquivo"])
            self.assertTrue(entrada["arquivo"].startswith("dados/"), "o caminho dentro do ZIP não vem do banco")

    def test_partes_com_cursor_juntas_dao_o_mesmo_que_uma_so_e_depois_so_vem_o_novo(self):
        from core.backup import gerar_backup_acervo

        vistas, cursor, partes = [], None, 0
        while True:
            conteudo, resumo = gerar_backup_acervo(self.database, cursor, limite_bytes=2500)
            _, manifesto = self._abrir(conteudo)
            vistas += [e["chave"] for e in manifesto["arquivos"]]
            partes += 1
            cursor = resumo["cursor"]
            if not resumo["mais"]:
                break
            self.assertLess(partes, 10, "o cursor precisa andar")
        self.assertGreaterEqual(partes, 2)
        self.assertEqual(vistas, ["mini", "n0/0/0", "n0/1/0", "n1/0/0", "n1/1/0"], "nada repetido nem perdido")

        # Da vez seguinte, com o cursor guardado, só chega o que entrou depois.
        _, vazio = gerar_backup_acervo(self.database, cursor)
        self.assertEqual((vazio["arquivos"], vazio["mais"], vazio["cursor"]), (0, False, cursor))
        with self.database.connection() as connection:
            connection.execute(
                "INSERT INTO acervo_arquivos (item_id, chave, mime, tamanho, dados, criado_em) VALUES (%s, 'n2/0/0', 'image/webp', 3, %s, now() + interval '1 hour')",
                (self.item, b"abc"),
            )
        conteudo, novo = gerar_backup_acervo(self.database, cursor)
        _, manifesto = self._abrir(conteudo)
        self.assertEqual([e["chave"] for e in manifesto["arquivos"]], ["n2/0/0"])

    def test_um_arquivo_maior_que_o_limite_ainda_sai_sozinho(self):
        from core.backup import gerar_backup_acervo

        conteudo, resumo = gerar_backup_acervo(self.database, limite_bytes=10)
        self.assertEqual((resumo["arquivos"], resumo["mais"]), (1, True))

    def test_cursor_estragado_e_recusado(self):
        from core.backup import gerar_backup_acervo

        for ruim in ("lixo", "x|y", "2026-13-99T00:00:00|a|b"):
            with self.assertRaises(ValueError):
                gerar_backup_acervo(self.database, ruim)

    def test_restaurar_devolve_os_ladrilhos_e_nao_duplica(self):
        from core.backup import gerar_backup_acervo, restaurar_backup_acervo

        conteudo, _ = gerar_backup_acervo(self.database)
        with self.database.connection() as connection:
            connection.execute("DELETE FROM acervo_arquivos")
        self.assertEqual(restaurar_backup_acervo(self.database, conteudo), {"inseridos": 5, "pulados_sem_item": 0})
        self.assertEqual(restaurar_backup_acervo(self.database, conteudo), {"inseridos": 0, "pulados_sem_item": 0})
        with self.database.connection() as connection:
            linhas = connection.execute("SELECT chave, length(dados) AS n FROM acervo_arquivos ORDER BY criado_em").fetchall()
        self.assertEqual([(l["chave"], l["n"]) for l in linhas][:2], [("mini", 1000), ("n0/0/0", 1001)])

        # Sem o item (banco novo sem o JSONL restaurado), o ladrilho não entra solto.
        with self.database.connection() as connection:
            connection.execute("DELETE FROM acervo_itens")
        self.assertEqual(restaurar_backup_acervo(self.database, conteudo), {"inseridos": 0, "pulados_sem_item": 5})

    def test_zip_adulterado_ou_de_outro_formato_e_recusado(self):
        from core.backup import gerar_backup_acervo, restaurar_backup_acervo

        conteudo, _ = gerar_backup_acervo(self.database)
        corrompido = io.BytesIO()
        with zipfile.ZipFile(io.BytesIO(conteudo)) as origem, zipfile.ZipFile(corrompido, "w") as destino:
            for nome in origem.namelist():
                destino.writestr(nome, b"x" if nome == "dados/0.bin" else origem.read(nome))
        with self.assertRaises(ValueError):
            restaurar_backup_acervo(self.database, corrompido.getvalue())
        estranho = io.BytesIO()
        with zipfile.ZipFile(estranho, "w") as destino:
            destino.writestr("manifesto.json", json.dumps({"formato": "outro", "arquivos": []}))
        with self.assertRaises(ValueError):
            restaurar_backup_acervo(self.database, estranho.getvalue())
