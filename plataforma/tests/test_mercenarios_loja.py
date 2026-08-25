"""Bestiário no balcão: o que se contrata, o que fica só de referência.

Não precisa de banco. Cobre duas regras que o catálogo declara e o servidor
aplica:

1. Perfil universal (`conteudo.disponivelNaLoja: false`) sai da vitrine e da
   compra. Antes disso, "Ameaça Genérica (VD 3)" aparecia à venda na categoria
   Mercenários junto com os contratáveis de verdade.
2. Quem é contratável declara `funcao`, e ela vira o papel do Aliado criado na
   ficha. Guarda de local e ofício entram lotados na base, fora de cena.
"""

import json
import unittest
from pathlib import Path

from routers.shop import (
    _is_hidden_catalog_item,
    _mercenary_ally_from_catalog_item,
)


_CATALOGO = json.loads(
    (Path(__file__).resolve().parents[2] / "data" / "loja" / "catalogo.json").read_text(
        encoding="utf-8"
    )
)["entradas"]
_MONSTROS = [entrada for entrada in _CATALOGO if entrada["tipo"] == "monstro"]
_FUNCOES = {"Guarda de local", "Escolta", "Tripulação", "Ofício"}


def _linha(entrada):
    return {"id": entrada["id"], "tipo": entrada["tipo"], "titulo": entrada["titulo"], "conteudo": entrada["conteudo"]}


class BestiarioForaDoBalcaoTests(unittest.TestCase):
    def test_perfil_universal_some_do_balcao_mesmo_sem_config_de_campanha(self):
        universais = [e for e in _MONSTROS if e["conteudo"].get("categoria") == "Universal"]
        self.assertTrue(universais, "o bestiário precisa manter os perfis universais publicados")
        for entrada in universais:
            with self.subTest(entrada["id"]):
                self.assertTrue(_is_hidden_catalog_item(_linha(entrada), set(), set()))

    def test_criatura_e_contratavel_continuam_no_balcao(self):
        vendaveis = [e for e in _MONSTROS if e["conteudo"].get("categoria") != "Universal"]
        self.assertTrue(vendaveis)
        for entrada in vendaveis:
            with self.subTest(entrada["id"]):
                self.assertFalse(_is_hidden_catalog_item(_linha(entrada), set(), set()))

    def test_marca_de_fora_do_balcao_convive_com_os_filtros_da_campanha(self):
        # Ocultar por raridade ou por id continua funcionando por cima da marca.
        lobo = next(e for e in _MONSTROS if e["id"] == "lobo-cinzento")
        self.assertTrue(_is_hidden_catalog_item(_linha(lobo), set(), {"lobo-cinzento"}))
        self.assertTrue(_is_hidden_catalog_item(_linha(lobo), {"comum"}, set()))

    def test_linha_antiga_do_banco_sem_a_marca_ainda_fica_fora_do_balcao(self):
        # A tabela `catalogo_itens` só recebe a marca quando o catálogo é
        # ressincronizado no boot da API. Até lá a linha antiga continua no
        # banco sem `disponivelNaLoja`, e foi assim que a "Ameaça Genérica"
        # apareceu à venda em Mercenários. A categoria "Universal" segura isso.
        universal = next(e for e in _MONSTROS if e["conteudo"].get("categoria") == "Universal")
        linha_antiga = _linha(universal)
        linha_antiga["conteudo"] = {
            chave: valor
            for chave, valor in linha_antiga["conteudo"].items()
            if chave != "disponivelNaLoja"
        }
        self.assertNotIn("disponivelNaLoja", linha_antiga["conteudo"])
        self.assertTrue(_is_hidden_catalog_item(linha_antiga, set(), set()))

    def test_marca_explicita_vale_para_qualquer_tipo_de_item(self):
        # A categoria "Universal" é rede de segurança do bestiário; a marca em
        # si continua servindo para tirar qualquer entrada do balcão.
        arma = {"id": "arma-x", "tipo": "arma", "titulo": "Arma X", "conteudo": {"disponivelNaLoja": False}}
        self.assertTrue(_is_hidden_catalog_item(arma, set(), set()))


class ContratacaoViraAliadoTests(unittest.TestCase):
    def test_toda_classe_ajudante_declara_funcao_conhecida(self):
        ajudantes = [e for e in _MONSTROS if e["conteudo"].get("classe") == "Ajudante"]
        self.assertTrue(ajudantes)
        for entrada in ajudantes:
            with self.subTest(entrada["id"]):
                self.assertIn(entrada["conteudo"].get("funcao"), _FUNCOES)

    def test_papel_do_aliado_sai_da_funcao_contratada(self):
        sentinela = next(e for e in _MONSTROS if e["id"] == "sentinela-de-portao")
        aliado = _mercenary_ally_from_catalog_item(sentinela)
        self.assertEqual(aliado["papel"], "Guarda de local")
        self.assertEqual(aliado["especieTipo"], "Humanoide")
        self.assertEqual(aliado["mercenarioCatalogoId"], "sentinela-de-portao")
        self.assertEqual(aliado["vidaAtual"], aliado["vidaMaxima"])
        self.assertGreater(aliado["vidaMaxima"], 0)

    def test_posto_fixo_entra_lotado_na_base_e_escolta_entra_em_cena(self):
        guarda = next(e for e in _MONSTROS if e["conteudo"].get("funcao") == "Guarda de local")
        oficio = next(e for e in _MONSTROS if e["conteudo"].get("funcao") == "Ofício")
        escolta = next(e for e in _MONSTROS if e["conteudo"].get("funcao") == "Escolta")
        fera = next(e for e in _MONSTROS if e["id"] == "lobo-cinzento")

        self.assertFalse(_mercenary_ally_from_catalog_item(guarda)["emCena"])
        self.assertFalse(_mercenary_ally_from_catalog_item(oficio)["emCena"])
        self.assertTrue(_mercenary_ally_from_catalog_item(escolta)["emCena"])
        self.assertTrue(_mercenary_ally_from_catalog_item(fera)["emCena"])

    def test_criatura_sem_funcao_cai_na_classe_como_papel(self):
        fera = next(e for e in _MONSTROS if e["id"] == "lobo-cinzento")
        self.assertEqual(_mercenary_ally_from_catalog_item(fera)["papel"], "Criatura")


if __name__ == "__main__":
    unittest.main()
