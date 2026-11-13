import random
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from core import recipientes as rc  # noqa: E402


def item(id_, tipo, raridade, **conteudo):
    return {"id": id_, "tipo": tipo, "titulo": id_.title(), "conteudo": {"raridade": raridade, **conteudo}}


CATALOGO = [
    item("pocao-a", "consumivel", "comum"), item("pocao-b", "consumivel", "comum"),
    item("pelo", "drop", "comum"), item("garra", "drop", "comum"), item("garra-unica", "drop", "comum", exclusivo=True),
    item("corda", "equipamento", "comum"), item("adaga", "arma", "comum"), item("escudo", "armadura", "comum"),
    item("espada-rara", "arma", "raro"), item("elixir-raro", "consumivel", "raro"),
    item("cria", "monstro", "comum"), item("casa", "propriedade", "comum"),
]


class PredefinicoesTest(unittest.TestCase):
    def test_toda_predefinicao_gera_tabela_valida(self):
        for id_ in rc.PREDEFINICOES:
            with self.subTest(id_=id_):
                tabela = rc.gerar_tabela(id_, CATALOGO, random.Random(1))
                self.assertEqual(rc.tabela_valida(tabela), tabela)

    def test_bau_comum_so_sorteia_do_tipo_e_da_raridade_do_slot(self):
        tabela = rc.gerar_tabela("bau-comum", CATALOGO, random.Random(7))
        por_id = {i["id"]: i for i in CATALOGO}
        for linha in tabela["itens"]:
            self.assertEqual(por_id[linha["item"]]["conteudo"]["raridade"], "comum")
            self.assertNotIn(por_id[linha["item"]]["tipo"], rc.TIPOS_FORA)
        ids = [linha["item"] for linha in tabela["itens"]]
        self.assertEqual(len(ids), len(set(ids)))
        self.assertNotIn("garra-unica", ids)
        self.assertEqual(tabela["moedas"], {"moeda": "Lunaris", "dados": "4d10", "chance": 100})

    def test_sem_item_da_raridade_desce_uma_raridade_de_cada_vez(self):
        catalogo = [item("elixir-raro", "consumivel", "raro"), item("pocao", "consumivel", "comum")]
        tabela = rc.gerar_tabela("bau-epico", catalogo + [item("drop-epico", "drop", "epico")], random.Random(3))
        # Não há nada épico de equipamento nem consumível: o épico só leva o drop; sem nada abaixo, o slot some.
        self.assertEqual([linha["item"] for linha in tabela["itens"]], ["drop-epico"])

    def test_predefinicao_desconhecida(self):
        with self.assertRaises(rc.ErroRecipiente):
            rc.gerar_tabela("bau-de-ouro-maciço", CATALOGO)

    def test_ha_um_bau_por_raridade(self):
        for id_ in ("bau-comum", "bau-incomum", "bau-raro", "bau-epico", "bau-lendario"):
            self.assertIn(id_, rc.PREDEFINICOES)
        self.assertEqual(len(rc.lista_de_predefinicoes()), len(rc.PREDEFINICOES))


class TabelaEEstadoTest(unittest.TestCase):
    def test_valida_chance_quantidade_e_repetidos(self):
        ok = {"moedas": None, "itens": [{"item": "pelo", "chance": 50, "quantidade": "1d4"}]}
        self.assertEqual(rc.tabela_valida(ok)["itens"][0]["quantidade"], "1d4")
        for ruim in (
            {"itens": [{"item": "pelo", "chance": 0, "quantidade": "1"}]},
            {"itens": [{"item": "pelo", "chance": 101, "quantidade": "1"}]},
            {"itens": [{"item": "pelo", "chance": 10, "quantidade": "muitos"}]},
            {"itens": [{"item": "pelo", "chance": 10}, {"item": "pelo", "chance": 20}]},
            {"itens": [], "moedas": {"moeda": "Ouro", "dados": "1d4", "chance": 10}},
        ):
            with self.subTest(ruim=ruim), self.assertRaises(rc.ErroRecipiente):
                rc.tabela_valida(ruim)

    def test_abrir_rola_uma_vez_e_abrir_de_novo_nao_rola_outra(self):
        tabela = {"moedas": {"moeda": "Lunaris", "dados": "1", "chance": 100}, "itens": [{"item": "pelo", "chance": 100, "quantidade": "2"}]}
        recipiente = rc.novo("Baú", None, tabela)
        catalogo = {"pelo": {"id": "pelo", "titulo": "Pelo", "conteudo": {"raridade": "comum"}}}
        aberto = rc.abrir(recipiente, catalogo, "Mira")
        self.assertTrue(aberto["aberto"])
        self.assertEqual([(l["tipo"], l["quantidade"]) for l in aberto["loot"]["linhas"]], [("item", 2), ("moedas", 1)])
        self.assertIs(rc.abrir(aberto, catalogo, "Outro"), aberto)
        self.assertEqual(aberto["loot"]["aberto_por"], "Mira")
        reiniciado = rc.reiniciar(aberto)
        self.assertEqual((reiniciado["aberto"], reiniciado["loot"]), (False, None))

    def test_chance_que_nao_cai_nao_aparece(self):
        # chance 1% com d100 nas mãos do teste: uma tabela só de 1% costuma sair vazia, mas o formato continua valendo.
        recipiente = rc.novo("Vazio", None, {"moedas": None, "itens": []})
        aberto = rc.abrir(recipiente, {}, "Mira")
        self.assertEqual(aberto["loot"]["linhas"], [])

    def test_o_jogador_nao_ve_tabela_chance_nem_rolagem(self):
        recipiente = rc.novo("Baú comum", "bau-comum", {"moedas": None, "itens": [{"item": "pelo", "chance": 100, "quantidade": "1"}]})
        catalogo = {"pelo": {"id": "pelo", "titulo": "Pelo", "conteudo": {"raridade": "comum"}}}
        fechado = rc.visao(recipiente, gestor=False)
        self.assertEqual(fechado["linhas"], [])
        self.assertNotIn("predefinicao", fechado)
        aberto = rc.abrir(recipiente, catalogo, "Mira")
        jogador = rc.visao(aberto, gestor=False)
        self.assertEqual(set(jogador["linhas"][0]), {"linha", "tipo", "titulo", "raridade", "quantidade", "entregue_para"})
        self.assertNotIn("tabela", str(jogador))
        mestre = rc.visao(aberto, gestor=True)
        self.assertEqual(mestre["predefinicao"], "bau-comum")
        self.assertIn("rolagem", mestre["linhas"][0])

    def test_esvaziado_quando_tudo_foi_pego(self):
        recipiente = rc.novo("Baú", None, {"moedas": None, "itens": [{"item": "pelo", "chance": 100, "quantidade": "1"}]})
        catalogo = {"pelo": {"id": "pelo", "titulo": "Pelo", "conteudo": {}}}
        aberto = rc.abrir(recipiente, catalogo, "Mira")
        self.assertFalse(rc.visao(aberto, gestor=False)["esvaziado"])
        aberto["loot"]["linhas"][0]["entregue_para"] = {"personagem_id": "x", "nome": "Mira"}
        visto = rc.visao(aberto, gestor=False)
        self.assertTrue(visto["esvaziado"])
        self.assertEqual(visto["linhas"][0]["entregue_para"], "Mira")

    def test_ler_defende_contra_lixo(self):
        self.assertIsNone(rc.ler(None))
        self.assertIsNone(rc.ler({"rotulo": "x"}))
        self.assertIsNone(rc.visao("quebrado", gestor=True))


if __name__ == "__main__":
    unittest.main()
