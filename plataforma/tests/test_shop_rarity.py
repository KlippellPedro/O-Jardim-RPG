import unittest

from fastapi import HTTPException

from core.economy_commands import (
    CatalogPrice,
    equipment_variant_content,
    equipment_variant_price,
)
from routers.shop import (
    _catalog_shop_level,
    _equipment_inventory_item_id,
    _selected_equipment_rarity,
)
from schemas import ShopBatchCommandInput


class EquipmentRarityPriceTests(unittest.TestCase):
    def test_awp_uses_martial_base_price_and_rarity_multipliers(self):
        awp = {
            "dano": "3d12",
            "margem_ameaca": 20,
            "multiplicador_critico": 3,
            "subtipo": "marcial",
        }
        self.assertEqual(equipment_variant_price(awp, "arma", "comum"), CatalogPrice("Lunaris", 75))
        self.assertEqual(equipment_variant_price(awp, "arma", "incomum"), CatalogPrice("Lunaris", 225))
        self.assertEqual(equipment_variant_price(awp, "arma", "raro"), CatalogPrice("Lunaris", 600))
        self.assertEqual(equipment_variant_price(awp, "arma", "epico"), CatalogPrice("Solares", 15))
        self.assertEqual(equipment_variant_price(awp, "arma", "lendario"), CatalogPrice("Solares", 45))

    def test_simple_and_protection_common_prices_stay_in_requested_bands(self):
        dagger = {"dano": "1d4", "margem_ameaca": 19, "multiplicador_critico": 2, "subtipo": "simples"}
        leather = {"bonus": "+2", "penalidade": "-1", "descricao": "Armadura leve."}
        shield = {"bonus": "+1", "penalidade": "-2", "subtipo": "simples", "categoria_protecao": "escudo"}
        self.assertEqual(equipment_variant_price(dagger, "arma", "comum"), CatalogPrice("Lunaris", 15))
        self.assertEqual(equipment_variant_price(leather, "armadura", "comum"), CatalogPrice("Lunaris", 50))
        self.assertEqual(equipment_variant_price(shield, "armadura", "comum"), CatalogPrice("Lunaris", 15))

    def test_weapon_rarity_improves_damage_margin_and_multiplier(self):
        awp = {
            "dano": "3d12",
            "critico": "20/x3",
            "margem_ameaca": 20,
            "multiplicador_critico": 3,
            "atributos": ["3d12 de dano", "Crítico 20/x3"],
        }
        rare = equipment_variant_content(awp, "arma", "raro")
        epic = equipment_variant_content(awp, "arma", "epico")
        self.assertEqual(rare["dano"], "3d12+1d6")
        self.assertEqual(rare["critico"], "19-20/x3")
        self.assertEqual(epic["dano"], "3d12+1d8")
        self.assertEqual(epic["critico"], "19-20/x4")

    def test_armor_rarity_improves_defense_penalty_and_typed_resistance(self):
        armor = {"bonus": "+7", "penalidade": "-4", "descricao": "Armadura de aço."}
        legendary = equipment_variant_content(armor, "armadura", "lendario")
        self.assertEqual(legendary["defesa"], 11)
        self.assertEqual(legendary["bonus"], "+11")
        self.assertEqual(legendary["penalidade"], "-2")
        self.assertEqual(
            legendary["resistencias_por_tipo"],
            {"Corte": 5, "Perfuração": 5, "Impacto": 5, "Balístico": 5},
        )

    def test_unavailable_target_or_non_equipment_is_rejected(self):
        self.assertIsNone(equipment_variant_price({}, "arma", "mitico"))
        self.assertIsNone(equipment_variant_price({}, "consumivel", "raro"))

    def test_batch_accepts_same_item_in_distinct_rarities(self):
        payload = ShopBatchCommandInput(
            campanha_id="00000000-0000-0000-0000-000000000001",
            personagem_id="00000000-0000-0000-0000-000000000002",
            economia_versao_esperada=1,
            localizacao_loja=4,
            idempotencia="rarity-batch-123",
            itens=[
                {"item_id": "espada", "raridade": "comum"},
                {"item_id": "espada", "raridade": "raro"},
            ],
        )
        self.assertEqual([item.raridade for item in payload.itens], ["comum", "raro"])

    def test_inventory_variants_do_not_mix_rarities_and_keep_legacy_id(self):
        item = {
            "id": "katana",
            "tipo": "arma",
            "titulo": "Katana",
            "conteudo": {"raridade": "incomum", "preco": {"Lunaris": 70}},
        }
        self.assertEqual(_equipment_inventory_item_id(item, "incomum"), "katana")
        self.assertEqual(_equipment_inventory_item_id(item, "comum"), "katana::raridade::comum")
        self.assertEqual(_equipment_inventory_item_id(item, "raro"), "katana::raridade::raro")

    def test_selected_rarity_controls_shop_level_instead_of_old_catalog_rarity(self):
        item = {
            "id": "lamina-antiga",
            "tipo": "arma",
            "titulo": "Lâmina Antiga",
            "conteudo": {
                "raridade": "lendario",
                "nivelMinimoLoja": 4,
                "preco": {"Solares": 80},
                "subtipo": "simples",
            },
        }
        self.assertEqual(_catalog_shop_level(item, "comum"), 1)
        self.assertEqual(_catalog_shop_level(item, "raro"), 2)
        self.assertEqual(_catalog_shop_level(item, "lendario"), 4)

    def test_rarity_is_rejected_for_non_equipment(self):
        potion = {"id": "pocao", "tipo": "consumivel", "titulo": "Poção", "conteudo": {}}
        with self.assertRaises(HTTPException) as raised:
            _selected_equipment_rarity(potion, "raro")
        self.assertEqual(raised.exception.status_code, 422)


if __name__ == "__main__":
    unittest.main()
