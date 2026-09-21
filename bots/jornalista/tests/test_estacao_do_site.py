"""A estação definida pelo calendário do site tem a palavra final (core/db.py)."""

from __future__ import annotations

import unittest

from tests.db_utils import novo_db


class EstacaoDoSiteTests(unittest.TestCase):
    def setUp(self):
        self.db = novo_db()

    def test_por_padrao_o_bot_manda_na_estacao(self):
        self.assertFalse(self.db.estacao_gerida_pelo_site("g1"))
        self.db.set_estacao("g1", "outono")
        self.assertFalse(self.db.estacao_gerida_pelo_site("g1"))

    def test_marcada_pelo_site_o_bot_reconhece_e_a_soltura_volta_ao_normal(self):
        self.db.set_estacao("g1", "inverno")
        with self.db._conn() as con:  # o que a plataforma faz no calendario do Mundo
            con.execute("UPDATE estacao SET gerida_pelo_site=TRUE WHERE guild_id=%s", ("g1",))
        self.assertTrue(self.db.estacao_gerida_pelo_site("g1"))
        self.assertFalse(self.db.estacao_gerida_pelo_site("outro-servidor"))
        with self.db._conn() as con:
            con.execute("UPDATE estacao SET gerida_pelo_site=FALSE WHERE guild_id=%s", ("g1",))
        self.assertFalse(self.db.estacao_gerida_pelo_site("g1"))


if __name__ == "__main__":
    unittest.main()
