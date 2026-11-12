"""_require_catalog_character_requirements não precisa de banco: cobre a regra
de que requisito de nível/classe hoje gera infração (registrada e visível pra
quem comprou) mas não bloqueia a compra. Ver docs/sistema/INTEGRACAO.md,
achado 6."""

import unittest

from routers.shop import _require_catalog_character_requirements


def _personagem(nivel, classes_ids, atributos=None):
    ficha = {
        "nivel": nivel,
        "classes": [{"id": classe_id, "nivel": nivel} for classe_id in classes_ids],
    }
    if atributos is not None:
        ficha["atributosFinais"] = atributos
    return {"ficha": ficha}


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

    def test_atributo_insuficiente_gera_infracao(self):
        item = _item(requisitoAtributo={"forca": 18})
        infracoes = _require_catalog_character_requirements(item, _personagem(25, ["guerreiro"], {"forca": 16}))
        self.assertEqual(len(infracoes), 1)
        self.assertEqual(infracoes[0]["tipo_infracao"], "atributo_insuficiente")
        self.assertEqual(infracoes[0]["mensagem"], "Item de Teste exige Força 18")

    def test_atributo_suficiente_nao_gera_infracao(self):
        item = _item(requisitoNivel=25, requisitoAtributo={"forca": 18})
        self.assertEqual(_require_catalog_character_requirements(item, _personagem(25, ["guerreiro"], {"forca": 18})), [])

    def test_ficha_sem_atributos_conta_como_zero(self):
        item = _item(requisitoAtributo={"constituicao": 15})
        self.assertEqual(len(_require_catalog_character_requirements(item, _personagem(15, ["guerreiro"]))), 1)


if __name__ == "__main__":
    unittest.main()
