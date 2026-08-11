"""_atende_requisito_legado aplicado aos pre_requisitos reais de modificação
do catálogo, sem precisar de banco — cobre a validação nova de shop.py
(achado 11 da auditoria 2026-08: pre_requisitos tipado existia mas nunca era
conferido na compra/instalação; corrigido na etapa de implementação final).
"""

from __future__ import annotations

import json
import unittest
from pathlib import Path

from core.character_summary import _atende_requisito_legado

_CATALOGO = json.loads(
    (Path(__file__).resolve().parents[2] / "data" / "loja" / "catalogo.json").read_text(encoding="utf-8")
)


def _modificacao(item_id: str) -> dict:
    entrada = next(e for e in _CATALOGO["entradas"] if e["id"] == item_id)
    return entrada["conteudo"]


def _ficha(**atributos) -> dict:
    return {"atributosFinais": atributos} if atributos else {}


class ModificacaoPreRequisitosTests(unittest.TestCase):
    def test_mod_vampirica_exige_nivel_total_7(self):
        pre_requisitos = _modificacao("mod-vampirica")["pre_requisitos"]
        self.assertTrue(all(_atende_requisito_legado(r, _ficha(), 7) for r in pre_requisitos))
        self.assertFalse(all(_atende_requisito_legado(r, _ficha(), 6) for r in pre_requisitos))

    def test_mod_sintonizada_exige_fluxo_14(self):
        pre_requisitos = _modificacao("mod-sintonizada")["pre_requisitos"]
        self.assertTrue(all(_atende_requisito_legado(r, _ficha(fluxo=14), 1) for r in pre_requisitos))
        self.assertFalse(all(_atende_requisito_legado(r, _ficha(fluxo=13), 1) for r in pre_requisitos))

    def test_mod_devastadora_aceita_forca_ou_destreza_14(self):
        pre_requisitos = _modificacao("mod-devastadora")["pre_requisitos"]
        self.assertTrue(all(_atende_requisito_legado(r, _ficha(forca=14, destreza=8), 1) for r in pre_requisitos))
        self.assertTrue(all(_atende_requisito_legado(r, _ficha(forca=8, destreza=14), 1) for r in pre_requisitos))
        self.assertFalse(all(_atende_requisito_legado(r, _ficha(forca=8, destreza=8), 1) for r in pre_requisitos))

    def test_todas_as_15_modificacoes_com_pre_requisito_tem_a_forma_esperada(self):
        com_pre_requisito = [
            e["conteudo"] for e in _CATALOGO["entradas"]
            if e["tipo"] == "modificacao" and e["conteudo"].get("pre_requisito")
        ]
        self.assertEqual(len(com_pre_requisito), 15)
        for conteudo in com_pre_requisito:
            pre_requisitos = conteudo["pre_requisitos"]
            self.assertIsInstance(pre_requisitos, list)
            self.assertTrue(pre_requisitos)
            # Não pode levantar exceção pra nenhuma ficha vazia — cada
            # requisito precisa ser uma forma que _atende_requisito_legado
            # reconhece (nivel_personagem / atributo+valor_minimo / ou).
            for requisito in pre_requisitos:
                _atende_requisito_legado(requisito, _ficha(), 1)


if __name__ == "__main__":
    unittest.main()
