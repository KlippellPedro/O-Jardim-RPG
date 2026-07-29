"""O endpoint legado da loja não pode contornar os comandos econômicos."""

import unittest

from fastapi import HTTPException

from routers.vault import legacy_purchase_disabled

class LegacyPurchaseTests(unittest.TestCase):
    def test_endpoint_legado_retorna_410(self):
        with self.assertRaises(HTTPException) as raised:
            legacy_purchase_disabled()
        self.assertEqual(raised.exception.status_code, 410)
        self.assertIn("/api/v1/loja/compras", raised.exception.detail)


if __name__ == "__main__":
    unittest.main()
