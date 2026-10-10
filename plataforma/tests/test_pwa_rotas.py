"""O site instalável: o servidor entrega o service worker e o manifest da raiz do bundle com os
cabeçalhos certos. Sem banco; o bundle é uma pasta temporária."""

from __future__ import annotations

import tempfile
import unittest
from pathlib import Path
from unittest import mock

from fastapi.testclient import TestClient

import main


class PwaRotasTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(main.app, raise_server_exceptions=False)

    @classmethod
    def tearDownClass(cls):
        cls.client.close()

    def setUp(self):
        self.temporario = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporario.cleanup)
        self.raiz = Path(self.temporario.name)
        (self.raiz / "sw.js").write_text("self.addEventListener('fetch', () => {});", encoding="utf-8")
        (self.raiz / "manifest.webmanifest").write_text('{"name": "O Jardim RPG"}', encoding="utf-8")
        patch = mock.patch.object(main, "_FRONTEND_ROOT", self.raiz)
        patch.start()
        self.addCleanup(patch.stop)

    def test_service_worker_sai_como_javascript_sem_cache_e_com_escopo_da_raiz(self):
        resposta = self.client.get("/sw.js")
        self.assertEqual(resposta.status_code, 200)
        self.assertIn("javascript", resposta.headers["content-type"])
        self.assertEqual(resposta.headers["cache-control"], "no-cache")
        self.assertEqual(resposta.headers["service-worker-allowed"], "/")
        self.assertIn("addEventListener", resposta.text)

    def test_manifest_sai_com_o_tipo_certo_e_cache_curto(self):
        resposta = self.client.get("/manifest.webmanifest")
        self.assertEqual(resposta.status_code, 200)
        self.assertIn("application/manifest+json", resposta.headers["content-type"])
        self.assertEqual(resposta.headers["cache-control"], "public, max-age=3600")
        self.assertEqual(resposta.json()["name"], "O Jardim RPG")

    def test_arquivo_ausente_e_404_em_json_e_nunca_o_index(self):
        (self.raiz / "sw.js").unlink()
        (self.raiz / "manifest.webmanifest").unlink()
        for caminho in ("/sw.js", "/manifest.webmanifest"):
            resposta = self.client.get(caminho, headers={"Accept": "text/html"})
            self.assertEqual(resposta.status_code, 404, caminho)
            self.assertIn("application/json", resposta.headers["content-type"], caminho)
            self.assertEqual(resposta.headers["cache-control"], "no-store", caminho)

    def test_rotas_nao_entram_na_documentacao_da_api(self):
        caminhos = main.app.openapi()["paths"]
        self.assertNotIn("/sw.js", caminhos)
        self.assertNotIn("/manifest.webmanifest", caminhos)


if __name__ == "__main__":
    unittest.main()
