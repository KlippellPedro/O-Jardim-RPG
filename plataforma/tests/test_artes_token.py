import base64
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from core import artes_token as at  # noqa: E402

PNG_MINIMO = "data:image/png;base64," + base64.b64encode(b"\x89PNG\r\n\x1a\n" + b"\x00" * 24).decode()


class ArtesDoTokenTest(unittest.TestCase):
    def test_imagem_valida_passa(self):
        self.assertEqual(at.conferir_imagem(PNG_MINIMO), PNG_MINIMO)

    def test_so_aceita_webp_png_e_jpeg(self):
        for ruim in ("data:image/gif;base64,AAAA", "data:image/svg+xml;base64,AAAA", "http://x/y.png", "", "data:text/html;base64,AAAA"):
            with self.subTest(ruim=ruim), self.assertRaises(at.ErroArte):
                at.conferir_imagem(ruim)

    def test_base64_quebrado_e_imagem_vazia(self):
        with self.assertRaises(at.ErroArte):
            at.conferir_imagem("data:image/png;base64,@@@@")
        with self.assertRaises(at.ErroArte):
            at.conferir_imagem("data:image/png;base64,AAAA")

    def test_imagem_grande_demais(self):
        grande = "data:image/webp;base64," + "A" * at.MAX_CARACTERES_ARTE
        with self.assertRaises(at.ErroArte):
            at.conferir_imagem(grande)

    def test_nome_limpo_e_com_padrao(self):
        self.assertEqual(at.nome_da_arte("  Traje   de gala ", 2), "Traje de gala")
        self.assertEqual(at.nome_da_arte("", 3), "Arte 3")
        self.assertEqual(at.nome_da_arte(None, 1), "Arte 1")
        self.assertEqual(len(at.nome_da_arte("x" * 100, 1)), at.NOME_MAXIMO)

    def test_decodificar(self):
        mime, dados = at.decodificar(PNG_MINIMO)
        self.assertEqual(mime, "image/png")
        self.assertTrue(dados.startswith(b"\x89PNG"))
        self.assertIsNone(at.decodificar(None))
        self.assertIsNone(at.decodificar("data:image/png;base64,@@@@"))


if __name__ == "__main__":
    unittest.main()
