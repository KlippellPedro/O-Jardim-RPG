"""Fichas das Deidades no Bestiário (arquivo só do servidor) e a troca de ids das criaturas lendárias."""

import json
import re
import unittest
from pathlib import Path

from core import deidades
from core.schema import IDS_ANTIGOS_DAS_CRIATURAS, MIGRATIONS

RAIZ = Path(__file__).resolve().parents[2]


class DeidadesTest(unittest.TestCase):
    def test_onze_fichas_no_formato_do_bestiario(self):
        lista = deidades.para_o_bestiario()
        self.assertEqual(len(lista), 11)
        ids = [item["id"] for item in lista]
        self.assertEqual(len(set(ids)), 11)
        for item in lista:
            self.assertTrue(deidades.eh_deidade(item["id"]))
            self.assertEqual(item["categoria"], "Deidade")
            self.assertEqual(item["vd"], 400 if item["id"] == "deidade-axis" else 500)
            self.assertEqual(len(item["ataques"]), 4)
            self.assertEqual(item["ataques"][0]["nome"], "Golpe do Domínio")
            self.assertFalse(item["tem_loot"])
            for ataque in item["ataques"]:
                self.assertLessEqual(len(ataque["nome"]), 60)
                self.assertLessEqual(len(ataque["detalhe"]), 160)
            textos = " ".join(item["habilidades"])
            for rotulo in ("Estado (", "Ápice (", "Domínio, Fluxo", "Limite (", "Contrajogo (", "Dom ("):
                self.assertIn(rotulo, textos, item["id"])

    def test_cada_deidade_esta_no_guia_do_mestre(self):
        guia = (RAIZ / "data" / "regras" / "regras.ts").read_text(encoding="utf-8")
        self.assertIn("Fichas das Deidades", guia)
        for item in deidades.para_o_bestiario():
            self.assertIn(f'{item["titulo"]}, ', guia, item["id"])

    def test_estado_das_deidades_nao_vaza_para_o_catalogo_publico(self):
        catalogo = (RAIZ / "data" / "loja" / "catalogo.json").read_text(encoding="utf-8")
        for item in deidades.para_o_bestiario():
            self.assertNotIn(item["id"], catalogo)

    def test_nao_sao_monstros_comuns(self):
        self.assertFalse(deidades.eh_deidade("vaelthor"))
        self.assertFalse(deidades.eh_deidade(None))


class IdsDasCriaturasTest(unittest.TestCase):
    def test_ids_novos_existem_no_catalogo_e_os_antigos_sumiram(self):
        catalogo = json.loads((RAIZ / "data" / "loja" / "catalogo.json").read_text(encoding="utf-8"))["entradas"]
        ids = {entrada["id"] for entrada in catalogo}
        self.assertEqual(len(IDS_ANTIGOS_DAS_CRIATURAS), 28)
        for antigo, novo in IDS_ANTIGOS_DAS_CRIATURAS.items():
            self.assertIn(novo, ids, novo)
            self.assertNotIn(antigo, ids, antigo)
            self.assertRegex(novo, r"^[a-z0-9]+(-[a-z0-9]+)*$")

    def test_loot_e_familias_usam_os_ids_novos(self):
        loot = json.loads((RAIZ / "data" / "bestiario" / "loot-criaturas.json").read_text(encoding="utf-8"))["criaturas"]
        familias = (RAIZ / "data" / "bestiario" / "familias-v1.json").read_text(encoding="utf-8")
        for antigo, novo in IDS_ANTIGOS_DAS_CRIATURAS.items():
            self.assertNotIn(antigo, loot)
            self.assertNotRegex(familias, rf'"{re.escape(antigo)}"')

    def test_migracao_50_renomeia_as_chaves(self):
        migracao = next(item for item in MIGRATIONS if item[0] == 50)
        sql = " ".join(migracao[2])
        for tabela in ("sessao_participantes", "loot_campanha", "inventario_personagem", "cofre_itens_usuario", "campanha_registros_universais"):
            self.assertIn(f"UPDATE {tabela}", sql)
        self.assertIn("'vaelthor'", sql)


if __name__ == "__main__":
    unittest.main()
