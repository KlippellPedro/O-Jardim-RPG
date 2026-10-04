"""Conquistas de nível e de classe, sem banco: a conexão é uma dublê que devolve
o que as consultas de `core.conquistas.avaliar` esperam."""

from __future__ import annotations

import unittest

from core.conquistas import CATALOGO, POR_CHAVE, _maior_nivel_de_classe, avaliar
from core.progressao_niveis import PATAMARES_NIVEL


class _Resultado:
    def __init__(self, linhas):
        self._linhas = linhas

    def fetchone(self):
        return self._linhas[0] if self._linhas else None

    def fetchall(self):
        return list(self._linhas)


class _ConexaoDuble:
    def __init__(self, ficha, ja=()):
        self.ficha = ficha
        self.ja = list(ja)
        self.gravadas: list[str] = []

    def execute(self, sql, params=()):
        texto = " ".join(str(sql).split())
        if texto.startswith("SELECT ficha FROM personagens"):
            return _Resultado([{"ficha": self.ficha}])
        if "FROM registros_mesa" in texto:
            return _Resultado([{"rolagens": 0, "criticos": 0, "falhas": 0, "dano_maximo": 0, "usos": 0}])
        if "FROM campanha_lendas" in texto:
            return _Resultado([])
        if "FROM sessao_participantes" in texto or "FROM saldos_personagem" in texto:
            return _Resultado([{"total": 0}])
        if texto.startswith("SELECT chave, desbloqueada_em FROM personagem_conquistas"):
            return _Resultado([{"chave": chave, "desbloqueada_em": "antes"} for chave in self.ja])
        if texto.startswith("INSERT INTO personagem_conquistas"):
            self.gravadas.append(params[1])
            return _Resultado([{"desbloqueada_em": "agora"}])
        raise AssertionError(f"consulta inesperada: {texto}")


def _ficha(*niveis_de_classe: int) -> dict:
    classes = [{"classeId": f"classe-{indice}", "nivel": nivel} for indice, nivel in enumerate(niveis_de_classe)]
    return {"nivel": sum(niveis_de_classe), "classes": classes}


class ConquistasDeNivelTests(unittest.TestCase):
    def test_cada_patamar_tem_a_sua_conquista(self) -> None:
        # Os patamares moram em data/ficha/progressao-niveis.json; a conquista de
        # cada um é o aviso de "outro patamar", então as duas listas não divergem.
        for nivel in PATAMARES_NIVEL:
            with self.subTest(patamar=nivel):
                conquista = POR_CHAVE[f"nivel_{nivel}"]
                self.assertEqual(conquista.metrica, "nivel")
                self.assertEqual(conquista.minimo, nivel)
                self.assertEqual(conquista.raridade, "lendaria")
                self.assertEqual(conquista.icone, "montanha")

    def test_chaves_unicas_e_minimos_crescentes_por_metrica(self) -> None:
        self.assertEqual(len({conquista.chave for conquista in CATALOGO}), len(CATALOGO))
        for metrica in ("nivel", "classe_max"):
            minimos = [conquista.minimo for conquista in CATALOGO if conquista.metrica == metrica]
            self.assertEqual(minimos, sorted(set(minimos)), metrica)

    def test_maior_nivel_de_classe(self) -> None:
        self.assertEqual(_maior_nivel_de_classe(_ficha(35, 30)), 35)
        self.assertEqual(_maior_nivel_de_classe(_ficha(12)), 12)
        # Ficha antiga, sem a lista de classes: o nível da ficha é o da classe única.
        self.assertEqual(_maior_nivel_de_classe({"nivel": 8}), 8)
        self.assertEqual(_maior_nivel_de_classe({"classes": [], "nivel": 9}), 9)
        self.assertEqual(_maior_nivel_de_classe({"classes": [{"nivel": "x"}, "lixo"], "nivel": 9}), 0)
        self.assertEqual(_maior_nivel_de_classe({}), 0)

    def test_tudo_que_desbloqueia_fica_gravado_mas_so_a_maior_por_metrica_e_anunciada(self) -> None:
        conexao = _ConexaoDuble(_ficha(35, 30))
        resposta = avaliar(conexao, "personagem-1")

        # Nível 65 (patamar 60) e classe no 35: dez conquistas de uma vez.
        esperadas = {"nivel_5", "nivel_10", "nivel_15", "nivel_20", "nivel_30", "nivel_40", "nivel_50", "nivel_60",
                     "classe_20", "classe_30"}
        self.assertEqual(set(conexao.gravadas), esperadas)
        # A tela comemora uma por métrica: a maior.
        self.assertEqual(set(resposta["novas"]), {"nivel_60", "classe_30"})
        desbloqueadas = {item["chave"] for item in resposta["catalogo"] if item["desbloqueada"]}
        self.assertEqual(desbloqueadas, esperadas)

    def test_patamares_altos_sao_anunciados_um_de_cada_vez_ao_cruzar(self) -> None:
        # Quem já tinha tudo até o 60 e passa do 100 ganha só o aviso do 100.
        antes = [f"nivel_{n}" for n in (5, 10, 15, 20, 30, 40, 50, 60)] + ["classe_20", "classe_30", "classe_40", "classe_50"]
        conexao = _ConexaoDuble(_ficha(50, 50, 10), ja=antes)
        resposta = avaliar(conexao, "personagem-1")
        self.assertEqual(resposta["novas"], ["nivel_100"])
        self.assertEqual(conexao.gravadas, ["nivel_100"])

        conexao = _ConexaoDuble(_ficha(50, 50, 50, 50, 50, 50, 50, 50, 50, 50), ja=antes + ["nivel_100"])
        resposta = avaliar(conexao, "personagem-1")
        # 500 níveis: 150 e 250 e 500 de uma vez, e só o 500 é anunciado.
        self.assertEqual(set(conexao.gravadas), {"nivel_150", "nivel_250", "nivel_500"})
        self.assertEqual(resposta["novas"], ["nivel_500"])

    def test_quem_so_consulta_nao_grava_nem_gasta_a_comemoracao(self) -> None:
        conexao = _ConexaoDuble(_ficha(60, 40))
        resposta = avaliar(conexao, "personagem-1", gravar=False)
        self.assertEqual(conexao.gravadas, [])
        self.assertEqual(resposta["novas"], [])
        desbloqueadas = {item["chave"] for item in resposta["catalogo"] if item["desbloqueada"]}
        self.assertTrue({"nivel_100", "classe_50"} <= desbloqueadas)

    def test_progresso_dos_selos_bloqueados_mostra_quanto_falta(self) -> None:
        resposta = avaliar(_ConexaoDuble(_ficha(20)), "personagem-1")
        item = next(x for x in resposta["catalogo"] if x["chave"] == "nivel_60")
        self.assertFalse(item["desbloqueada"])
        self.assertEqual(item["progresso"], {"atual": 20, "minimo": 60})


if __name__ == "__main__":
    unittest.main()
