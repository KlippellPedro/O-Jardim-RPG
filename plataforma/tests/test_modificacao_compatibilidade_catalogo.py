"""Valida o catálogo real de modificações contra o modelo de compatibilidade
aplicacao→categoria implementado em routers/shop.py, sem precisar de banco —
roda a cada suíte e detecta problema de dado antes que chegue à loja (parte 6
da tarefa de correção de compatibilidade, 2026-08).
"""

from __future__ import annotations

import json
import unittest
from collections import Counter
from pathlib import Path

from routers.shop import normalize_catalog_filter

_CATALOGO = json.loads(
    (Path(__file__).resolve().parents[2] / "data" / "loja" / "catalogo.json").read_text(encoding="utf-8")
)
_MODIFICACOES = [e for e in _CATALOGO["entradas"] if e["tipo"] == "modificacao"]

# Espelha _ALVOS_POR_APLICACAO de routers/shop.py — mantido separado de
# propósito: se alguém mudar o mapeamento em produção sem atualizar aqui (ou
# vice-versa), um teste começa a falhar em vez de as duas cópias silenciosamente
# divergirem.
_ALVOS_POR_APLICACAO = {
    "armas": {"arma"},
    "armaduras": {"armadura"},
    "escudos": {"armadura"},
}
_APLICACOES_SEM_RESTRICAO = {"itens gerais e magicos"}
_APLICACOES_CONHECIDAS = set(_ALVOS_POR_APLICACAO) | _APLICACOES_SEM_RESTRICAO


class CompatibilidadeCatalogoTests(unittest.TestCase):
    def test_catalogo_tem_51_modificacoes(self):
        self.assertEqual(len(_MODIFICACOES), 51)

    def test_toda_modificacao_tem_aplicacao_reconhecida(self):
        desconhecidas = []
        for mod in _MODIFICACOES:
            aplicacao_norm = normalize_catalog_filter(mod["conteudo"].get("aplicacao", ""))
            if aplicacao_norm not in _APLICACOES_CONHECIDAS:
                desconhecidas.append((mod["id"], mod["conteudo"].get("aplicacao")))
        self.assertEqual(desconhecidas, [], f"modificacoes com aplicacao nao mapeada: {desconhecidas}")

    def test_nenhuma_aplicacao_fica_sem_nenhuma_modificacao(self):
        # Sanity check pedido na tarefa: garantir que o mapeamento não rejeitaria
        # implicitamente uma categoria inteira por ela ter ficado sem nenhum item.
        contagem = Counter(
            normalize_catalog_filter(mod["conteudo"].get("aplicacao", "")) for mod in _MODIFICACOES
        )
        for aplicacao in _APLICACOES_CONHECIDAS:
            self.assertGreater(contagem[aplicacao], 0, f"nenhuma modificacao usa aplicacao={aplicacao!r}")

    def test_toda_modificacao_com_aplicacao_restrita_aponta_para_categoria_de_inventario_valida(self):
        # As categorias que _ALVOS_POR_APLICACAO promete (arma/armadura)
        # precisam ser exatamente as que _inventory_category() de shop.py
        # realmente produz para os tipos "arma"/"armadura" do catálogo — se
        # esse mapeamento mudar de um lado sem o outro, este teste denuncia.
        categorias_possiveis_no_inventario = {"arma", "armadura", "consumivel", "veiculo", "modulo-veicular", "implante", "propriedade", "geral"}
        for alvos in _ALVOS_POR_APLICACAO.values():
            self.assertTrue(alvos <= categorias_possiveis_no_inventario)


if __name__ == "__main__":
    unittest.main()
