"""Bestiário no balcão: o que se contrata, o que fica só de referência.

Não precisa de banco. Cobre duas regras que o catálogo declara e o servidor
aplica:

1. Perfil universal (`conteudo.disponivelNaLoja: false`) sai da vitrine e da
   compra. Antes disso, "Modelo de Criatura (VD 3)" aparecia à venda na categoria
   Mercenários junto com os contratáveis de verdade.
2. Quem é contratável declara `funcao`, e ela vira o papel do Aliado criado na
   ficha. Guarda de local e ofício entram lotados na base, fora de cena.
"""

import json
import unittest
from pathlib import Path

from core.economy_commands import resolve_catalog_price

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


# Os "Modelo de Criatura (VD n)" saíram do catálogo (o gerador do site monta uma
# criatura de qualquer VD), mas a rede de segurança da categoria "Universal"
# continua valendo para quem voltar a publicar um perfil assim.
_UNIVERSAL = {
    "id": "universal-teste",
    "tipo": "monstro",
    "titulo": "Modelo de Criatura (teste)",
    "conteudo": {"categoria": "Universal", "vd": 10, "nivel": 10, "raridade": "comum"},
}


class BestiarioForaDoBalcaoTests(unittest.TestCase):
    def test_catalogo_nao_traz_mais_perfil_universal_gravado(self):
        self.assertEqual([e["id"] for e in _MONSTROS if e["conteudo"].get("categoria") == "Universal"], [])

    def test_perfil_universal_some_do_balcao_mesmo_sem_config_de_campanha(self):
        self.assertTrue(_is_hidden_catalog_item(_linha(_UNIVERSAL), set(), set()))

    def test_criatura_e_contratavel_continuam_no_balcao(self):
        # Estágios gerados de VD alto e únicos ficam só no Bestiário (disponivelNaLoja false).
        vendaveis = [
            e for e in _MONSTROS
            if e["conteudo"].get("categoria") != "Universal" and e["conteudo"].get("disponivelNaLoja") is not False
        ]
        self.assertTrue(vendaveis)
        for entrada in vendaveis:
            with self.subTest(entrada["id"]):
                self.assertFalse(_is_hidden_catalog_item(_linha(entrada), set(), set()))

    def test_criatura_so_de_bestiario_some_do_balcao_e_a_de_familia_comum_continua(self):
        so_bestiario = [e for e in _MONSTROS if e["conteudo"].get("disponivelNaLoja") is False]
        self.assertGreaterEqual(len(so_bestiario), 30)
        for entrada in so_bestiario:
            with self.subTest(entrada["id"]):
                self.assertTrue(_is_hidden_catalog_item(_linha(entrada), set(), set()))
        # As nove primeiras (Dragão Jovem, Lobo Alfa...) seguem à venda.
        self.assertFalse(_is_hidden_catalog_item(_linha(next(e for e in _MONSTROS if e["id"] == "dragao-jovem")), set(), set()))

    def test_marca_de_fora_do_balcao_convive_com_os_filtros_da_campanha(self):
        # Ocultar por raridade ou por id continua funcionando por cima da marca.
        lobo = next(e for e in _MONSTROS if e["id"] == "lobo-cinzento")
        self.assertTrue(_is_hidden_catalog_item(_linha(lobo), set(), {"lobo-cinzento"}))
        self.assertTrue(_is_hidden_catalog_item(_linha(lobo), {"comum"}, set()))

    def test_linha_antiga_do_banco_sem_a_marca_ainda_fica_fora_do_balcao(self):
        # A tabela `catalogo_itens` só recebe a marca quando o catálogo é
        # ressincronizado no boot da API. Até lá a linha antiga continua no
        # banco sem `disponivelNaLoja`, e foi assim que o "Modelo de Criatura"
        # apareceu à venda em Mercenários. A categoria "Universal" segura isso.
        linha_antiga = _linha(_UNIVERSAL)
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


class ContratarOuComprarTests(unittest.TestCase):
    """Mercenario agora tem dois jeitos de virar aliado: comprado (preco cheio,
    servo/escravo permanente, sem mensalidade) ou contratado (preco reduzido,
    mensalidade recorrente que a mesa cobra fora do sistema - mesmo tratamento
    que a manutencao de Bens ja recebe)."""

    def test_todo_mercenario_declara_preco_de_contratacao_e_mensalidade(self):
        for entrada in _MONSTROS:
            with self.subTest(entrada["id"]):
                self.assertIn("preco_contratacao", entrada["conteudo"])
                self.assertIn("contrato_mensal", entrada["conteudo"])

    def test_comprar_e_o_padrao_e_nao_gera_mensalidade(self):
        lobo = next(e for e in _MONSTROS if e["id"] == "lobo-cinzento")
        aliado = _mercenary_ally_from_catalog_item(lobo)
        self.assertEqual(aliado["vinculo"], "comprado")
        self.assertIsNone(aliado["mensalidade"])

    def test_contratar_gera_mensalidade_a_partir_do_catalogo(self):
        # A mensalidade e 20% da taxa de contratacao, nao o valor cheio dela -
        # ver data/economia/escala-precos-v1.json (salarios_mensais e a base,
        # a mensalidade e uma fracao disso pra nao equivaler a pagar o "salario"
        # inteiro nao mes 1 e de novo todo mes seguinte).
        lobo = next(e for e in _MONSTROS if e["id"] == "lobo-cinzento")
        aliado = _mercenary_ally_from_catalog_item(lobo, modo="contratar")
        self.assertEqual(aliado["vinculo"], "contratado")
        self.assertEqual(lobo["conteudo"]["preco_contratacao"], {"Lunaris": 300})
        self.assertEqual(aliado["mensalidade"], {"moeda": "Lunaris", "valor": 60})

    def test_mensalidade_e_sempre_vinte_por_cento_da_taxa_de_contratacao(self):
        for entrada in _MONSTROS:
            with self.subTest(entrada["id"]):
                # Criatura de VD 50 em diante cobra em Fragmentos de Estrela; as outras, em Lunaris.
                moeda, contratacao = next(iter(entrada["conteudo"]["preco_contratacao"].items()))
                self.assertEqual(list(entrada["conteudo"]["contrato_mensal"]), [moeda])
                mensal = entrada["conteudo"]["contrato_mensal"][moeda]
                self.assertEqual(mensal, round(contratacao * 0.2))

    def test_criatura_de_vd_alto_se_contrata_em_fragmentos_e_a_mensalidade_acompanha(self):
        # data/economia/escala-precos-v1.json, criaturas_de_vd_alto: metade da verba de uma sessao.
        atlarion = next(e for e in _MONSTROS if e["id"] == "atlarion")
        self.assertEqual(atlarion["conteudo"]["preco_contratacao"], {"Fragmentos de Estrela": 160})
        self.assertEqual(atlarion["conteudo"]["preco"], {"Fragmentos de Estrela": 1600})
        aliado = _mercenary_ally_from_catalog_item(atlarion, modo="contratar")
        self.assertEqual(aliado["mensalidade"], {"moeda": "Fragmentos de Estrela", "valor": 32})
        self.assertEqual(resolve_catalog_price(atlarion["conteudo"], field="preco_contratacao").moeda, "Fragmentos de Estrela")
        # Contratar nunca custa mais que comprar (nas criaturas baratas custa o mesmo; tudo em Solares: 1 Lunaris = 0,01, 1 Fragmento = 50).
        em_solares = {"Lunaris": 0.01, "Solares": 1, "Fragmentos de Estrela": 50}
        for entrada in _MONSTROS:
            with self.subTest(entrada["id"]):
                compra = resolve_catalog_price(entrada["conteudo"])
                contratacao = resolve_catalog_price(entrada["conteudo"], field="preco_contratacao")
                self.assertLessEqual(contratacao.valor * em_solares[contratacao.moeda], compra.valor * em_solares[compra.moeda])

    def test_contratar_nao_muda_papel_nem_posto_fixo(self):
        guarda = next(e for e in _MONSTROS if e["conteudo"].get("funcao") == "Guarda de local")
        comprado = _mercenary_ally_from_catalog_item(guarda)
        contratado = _mercenary_ally_from_catalog_item(guarda, modo="contratar")
        self.assertEqual(comprado["papel"], contratado["papel"])
        self.assertFalse(comprado["emCena"])
        self.assertFalse(contratado["emCena"])


if __name__ == "__main__":
    unittest.main()


class VidaDeAliadoTests(unittest.TestCase):
    def test_vida_do_aliado_e_no_maximo_o_dobro_da_vida_de_um_personagem(self):
        from core.curva_criatura import vida_de_aliado
        # Mesmos valores de tests/frontend/curvaCriatura.test.ts.
        for vd, pv, esperado in ((3, 105, 38), (8, 170, 74), (20, 410, 160), (33, 850, 276), (50, 1320, 428), (100, 2700, 772)):
            self.assertEqual(vida_de_aliado(vd, pv), esperado, f"VD {vd}")
        self.assertEqual(vida_de_aliado(20, 100), 100)
        self.assertEqual(vida_de_aliado(None, 500), 500)

    def test_criatura_comprada_nasce_com_a_vida_de_aliado_e_nao_a_de_inimigo(self):
        for entrada in _MONSTROS:
            conteudo = entrada["conteudo"]
            if conteudo.get("disponivelNaLoja") is False or conteudo.get("vd", 0) < 8:
                continue
            with self.subTest(entrada["id"]):
                aliado = _mercenary_ally_from_catalog_item(entrada)
                self.assertLessEqual(aliado["vidaMaxima"], 0.6 * conteudo["pv"])
                self.assertEqual(aliado["vidaAtual"], aliado["vidaMaxima"])
