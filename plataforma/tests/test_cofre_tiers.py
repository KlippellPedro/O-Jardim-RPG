import json
import unittest
import importlib.util
from pathlib import Path

from core.cofre_tiers import (
    COFRE_TIER_INICIAL,
    COFRE_TIERS,
    REPUTACAO_POR_COFRE_TIER,
    REPUTACAO_POR_SEGURANCA_TIER,
    SEGURANCA_TIER_INICIAL,
    SEGURANCA_TIERS,
    custos_upgrade,
    posicao_tier,
    proximo_tier,
    tier_com_reputacao,
)


def _carregar_modulo_avulso(nome: str, caminho: Path):
    """Carrega um .py fora do pacote `core`, do jeito que main.py de produção
    nunca faria — só existe pra provar, num teste, que o módulo publicado de
    outro bot bate com o que a plataforma expõe, sem precisar de um pacote
    Python compartilhado entre bots/plataforma (que viram ZIPs separados)."""
    spec = importlib.util.spec_from_file_location(nome, caminho)
    assert spec is not None and spec.loader is not None
    modulo = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(modulo)
    return modulo


_RAIZ_REPO = Path(__file__).resolve().parents[2]


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
        caminho = _RAIZ_REPO / "bots" / "banqueiro" / "core" / "economia.py"
        modulo = _carregar_modulo_avulso("economia_banqueiro_contrato", caminho)

        self.assertEqual(COFRE_TIERS, modulo.COFRE_TIERS)
        self.assertEqual(SEGURANCA_TIERS, modulo.SEGURANCA_TIERS)
        self.assertEqual(REPUTACAO_POR_COFRE_TIER, modulo.REPUTACAO_POR_COFRE_TIER)
        self.assertEqual(
            REPUTACAO_POR_SEGURANCA_TIER,
            modulo.REPUTACAO_POR_SEGURANCA_TIER,
        )

    def test_espelho_permanece_identico_ao_jornalista(self):
        # Terceira cópia descoberta na validação pós-correção (achado 10,
        # escopo ampliado): o Jornalista só precisa de COFRE_TIERS, mas lia
        # sua própria tabela hardcoded até esta correção.
        caminho = _RAIZ_REPO / "bots" / "jornalista" / "core" / "economia.py"
        modulo = _carregar_modulo_avulso("economia_jornalista_contrato", caminho)

        self.assertEqual(COFRE_TIERS, modulo.COFRE_TIERS)
        self.assertEqual(COFRE_TIER_INICIAL, modulo.COFRE_TIER_INICIAL)

    def test_nenhum_dos_tres_modulos_reintroduziu_uma_tabela_propria(self):
        """Guarda-costas contra divergência futura: banqueiro, plataforma e
        jornalista precisam bater exatamente com o JSON compartilhado — não
        só entre si (o que passaria mesmo se os três copiassem o mesmo valor
        errado por coincidência)."""
        caminho_json = _RAIZ_REPO / "data" / "economia" / "cofre_seguranca_tiers.json"
        fonte = json.loads(caminho_json.read_text(encoding="utf-8"))

        self.assertEqual(COFRE_TIERS, fonte["cofre"]["tiers"])
        self.assertEqual(COFRE_TIER_INICIAL, fonte["cofre"]["tier_inicial"])
        self.assertEqual(SEGURANCA_TIERS, fonte["seguranca"]["tiers"])
        self.assertEqual(SEGURANCA_TIER_INICIAL, fonte["seguranca"]["tier_inicial"])
        self.assertEqual(REPUTACAO_POR_COFRE_TIER, fonte["reputacao_por_cofre_tier"])
        self.assertEqual(REPUTACAO_POR_SEGURANCA_TIER, fonte["reputacao_por_seguranca_tier"])

        banqueiro = _carregar_modulo_avulso(
            "economia_banqueiro_json_contrato",
            _RAIZ_REPO / "bots" / "banqueiro" / "core" / "economia.py",
        )
        jornalista = _carregar_modulo_avulso(
            "economia_jornalista_json_contrato",
            _RAIZ_REPO / "bots" / "jornalista" / "core" / "economia.py",
        )
        self.assertEqual(banqueiro.COFRE_TIERS, fonte["cofre"]["tiers"])
        self.assertEqual(jornalista.COFRE_TIERS, fonte["cofre"]["tiers"])


if __name__ == "__main__":
    unittest.main()
