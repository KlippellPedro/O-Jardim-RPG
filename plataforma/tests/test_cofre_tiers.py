import unittest
import importlib.util
from pathlib import Path

from core.cofre_tiers import (
    COFRE_TIERS,
    REPUTACAO_POR_COFRE_TIER,
    REPUTACAO_POR_SEGURANCA_TIER,
    SEGURANCA_TIERS,
    custos_upgrade,
    posicao_tier,
    proximo_tier,
    tier_com_reputacao,
)


class CofreTierTests(unittest.TestCase):
    def test_progressao_tem_quinze_niveis_e_preserva_ids_antigos(self):
        self.assertEqual(len(COFRE_TIERS), 15)
        ids = {tier["id"] for tier in COFRE_TIERS}
        self.assertTrue({"comum", "prata", "dourado", "arcano", "eterno"} <= ids)
        self.assertEqual(COFRE_TIERS[-1]["id"], "sem-fim")
        self.assertTrue(COFRE_TIERS[-1]["limite_pratico"])

    def test_seguranca_termina_em_noventa_e_nove_por_cento(self):
        self.assertEqual(len(SEGURANCA_TIERS), 15)
        self.assertEqual(SEGURANCA_TIERS[-1]["id"], "absoluta")
        self.assertEqual(SEGURANCA_TIERS[-1]["defesa"], 0.99)
        self.assertEqual(
            proximo_tier(SEGURANCA_TIERS, "maximo", "basica")["id"],
            "soberana",
        )

    def test_contrato_do_site_inclui_posicao_e_reputacao_dos_niveis(self):
        self.assertEqual(posicao_tier(COFRE_TIERS, "lunar", "comum"), 11)
        self.assertEqual(posicao_tier(SEGURANCA_TIERS, "absoluta", "basica"), 15)
        sem_fim = tier_com_reputacao(COFRE_TIERS[-1], REPUTACAO_POR_COFRE_TIER)
        absoluta = tier_com_reputacao(SEGURANCA_TIERS[-1], REPUTACAO_POR_SEGURANCA_TIER)
        self.assertEqual(sem_fim["reputacao_exigida"], 1250)
        self.assertEqual(absoluta["reputacao_exigida"], 1250)

    def test_site_recebe_o_pacote_multimoeda_com_desconto_correto(self):
        custos = custos_upgrade(
            {
                "custos": {
                    "Lunaris": 101,
                    "Solares": 21,
                    "Fragmentos de Estrela": 3,
                    "Créditos Sombrios": 7,
                }
            },
            150,
        )
        self.assertEqual(custos, {
            "Lunaris": 96,
            "Solares": 20,
            "Fragmentos de Estrela": 3,
            "Créditos Sombrios": 7,
        })

    def test_espelho_permanece_identico_ao_banqueiro(self):
        caminho = Path(__file__).resolve().parents[2] / "bots" / "banqueiro" / "core" / "economia.py"
        spec = importlib.util.spec_from_file_location("economia_banqueiro_contrato", caminho)
        self.assertIsNotNone(spec)
        self.assertIsNotNone(spec.loader)
        modulo = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(modulo)

        self.assertEqual(COFRE_TIERS, modulo.COFRE_TIERS)
        self.assertEqual(SEGURANCA_TIERS, modulo.SEGURANCA_TIERS)
        self.assertEqual(REPUTACAO_POR_COFRE_TIER, modulo.REPUTACAO_POR_COFRE_TIER)
        self.assertEqual(
            REPUTACAO_POR_SEGURANCA_TIER,
            modulo.REPUTACAO_POR_SEGURANCA_TIER,
        )


if __name__ == "__main__":
    unittest.main()
