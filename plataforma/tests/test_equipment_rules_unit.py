from __future__ import annotations

import unittest

from core.equipment_rules import (
    equipped_special_item_count,
    modification_limit_for_rarity,
    special_item_group,
    special_item_use_limit,
)


class EquipmentRulesTests(unittest.TestCase):
    def test_special_limit_uses_one_slot_per_four_total_levels(self):
        self.assertEqual(special_item_use_limit(1), 1)
        self.assertEqual(special_item_use_limit(3), 1)
        self.assertEqual(special_item_use_limit(4), 1)
        self.assertEqual(special_item_use_limit(7), 1)
        self.assertEqual(special_item_use_limit(8), 2)
        self.assertEqual(special_item_use_limit(20), 5)

    def test_skill_items_and_artifacts_share_the_equipped_count(self):
        inventory = [
            {
                "item_id": "acessorio-refinado",
                "quantidade": 1,
                "dados": {"grupo_limite_uso": "item-pericia", "equipado": True},
            },
            {
                "item_id": "pedra-antiga",
                "quantidade": 1,
                "dados": {"tipo": "artefato", "equipado": True},
            },
            {
                "item_id": "artefato-guardado",
                "quantidade": 1,
                "dados": {"tipo": "artefato", "equipado": False},
            },
        ]
        self.assertEqual(special_item_group(inventory[0]), "item-pericia")
        self.assertEqual(special_item_group(inventory[1]), "artefato")
        self.assertEqual(equipped_special_item_count(inventory), 2)

    def test_rarity_defines_modification_capacity(self):
        self.assertEqual(modification_limit_for_rarity("Comum"), 1)
        self.assertEqual(modification_limit_for_rarity("Épico"), 4)
        self.assertEqual(modification_limit_for_rarity("Mítico"), 6)
        self.assertEqual(modification_limit_for_rarity("Relíquia da Criação"), 7)
        self.assertEqual(modification_limit_for_rarity("desconhecida"), 1)


if __name__ == "__main__":
    unittest.main()
