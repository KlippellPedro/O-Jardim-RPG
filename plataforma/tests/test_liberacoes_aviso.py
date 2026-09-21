"""O que conta como "liberou algo novo" para avisar a mesa (core/campaign_visibility.py)."""

from __future__ import annotations

import unittest

from core.campaign_visibility import novas_liberacoes, texto_das_liberacoes


class LiberacoesTests(unittest.TestCase):
    def test_revelar_e_tirar_do_oculto_contam(self):
        antes = {"lore_revelado": ["a"], "lore_oculto": ["x", "y"], "racas_liberadas": []}
        depois = {"lore_revelado": ["a", "b", "c"], "lore_oculto": ["y"], "racas_liberadas": ["elfo"]}
        self.assertEqual(novas_liberacoes(antes, depois), {"lore": 3, "racas": 1})

    def test_esconder_de_novo_ou_nao_mudar_nao_avisa(self):
        antes = {"lore_revelado": ["a", "b"], "lore_oculto": []}
        self.assertEqual(novas_liberacoes(antes, {"lore_revelado": ["a"], "lore_oculto": ["b"]}), {})
        self.assertEqual(novas_liberacoes(antes, antes), {})
        self.assertEqual(novas_liberacoes(None, None), {})

    def test_config_estranha_nao_quebra(self):
        self.assertEqual(novas_liberacoes({"lore_revelado": "texto"}, {"lore_revelado": None}), {})

    def test_secao_e_calendario_liberados_contam(self):
        antes = {"registros_universais_secoes_ocultas": ["bestiario", "rumores"], "calendario_oculto": True}
        depois = {"registros_universais_secoes_ocultas": ["rumores"], "calendario_oculto": False}
        self.assertEqual(novas_liberacoes(antes, depois), {"secoes": 1, "calendario": 1})
        self.assertEqual(novas_liberacoes(depois, antes), {})

    def test_texto_diz_quantos_nunca_quais(self):
        self.assertEqual(texto_das_liberacoes({"lore": 1}), "1 registro de lore")
        self.assertEqual(texto_das_liberacoes({"lore": 3, "arvores": 1, "classes": 2}), "3 registros de lore, 1 Árvore e 2 classes")


if __name__ == "__main__":
    unittest.main()
