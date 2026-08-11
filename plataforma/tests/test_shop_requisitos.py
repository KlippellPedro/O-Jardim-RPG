"""_require_catalog_character_requirements não precisa de banco: cobre a regra
de que requisito de nível/classe hoje gera infração (registrada e visível pra
quem comprou) mas não bloqueia a compra. Ver docs/auditoria-integracao-sistema-2026-08.md,
achado 6."""

import unittest

from routers.shop import _require_catalog_character_requirements


def _personagem(nivel, classes_ids):
    return {
        "ficha": {
            "nivel": nivel,
            "classes": [{"id": classe_id, "nivel": nivel} for classe_id in classes_ids],
        }
    }


def _item(**conteudo):
    return {"id": "item-teste", "titulo": "Item de Teste", "conteudo": conteudo}


class RequisitosLojaTests(unittest.TestCase):
    def test_sem_requisito_nao_gera_infracao(self):
        item = _item(preco={"Lunaris": 10})
        self.assertEqual(_require_catalog_character_requirements(item, _personagem(1, [])), [])

    def test_nivel_insuficiente_gera_infracao_mas_nao_bloqueia(self):
        item = _item(requisitoNivel=25)
        infracoes = _require_catalog_character_requirements(item, _personagem(1, ["guerreiro"]))
        self.assertEqual(len(infracoes), 1)
        self.assertEqual(infracoes[0]["tipo_infracao"], "nivel_insuficiente")
        self.assertEqual(infracoes[0]["item_id"], "item-teste")

    def test_nivel_suficiente_nao_gera_infracao(self):
        item = _item(requisitoNivel=25)
        self.assertEqual(_require_catalog_character_requirements(item, _personagem(25, ["guerreiro"])), [])

    def test_classe_incompativel_gera_infracao(self):
        item = _item(requisitoClasse=["guardiao"])
        infracoes = _require_catalog_character_requirements(item, _personagem(5, ["guerreiro"]))
        self.assertEqual(len(infracoes), 1)
        self.assertEqual(infracoes[0]["tipo_infracao"], "classe_incompativel")

    def test_classe_compativel_nao_gera_infracao(self):
        item = _item(requisitoClasse=["guardiao"])
        self.assertEqual(_require_catalog_character_requirements(item, _personagem(5, ["guardiao"])), [])

    def test_requisitoClasse_aceita_string_unica_alem_de_lista(self):
        item = _item(requisitoClasse="guardiao")
        self.assertEqual(_require_catalog_character_requirements(item, _personagem(5, ["guardiao"])), [])
        self.assertEqual(len(_require_catalog_character_requirements(item, _personagem(5, ["ninja"]))), 1)

    def test_nivel_e_classe_juntos_podem_gerar_duas_infracoes(self):
        item = _item(requisitoNivel=25, requisitoClasse=["guardiao"])
        infracoes = _require_catalog_character_requirements(item, _personagem(1, ["ninja"]))
        tipos = {inf["tipo_infracao"] for inf in infracoes}
        self.assertEqual(tipos, {"nivel_insuficiente", "classe_incompativel"})


if __name__ == "__main__":
    unittest.main()
