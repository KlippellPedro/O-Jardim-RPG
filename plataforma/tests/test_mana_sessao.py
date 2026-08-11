"""_descontar_mana_na_sessao isolado, sem depender de Postgres real.

Cobre o achado 8 da auditoria 2026-08: usar um poder/magia com custo em Mana
(já descontado da ficha por AbaPoderes.tsx/AbaHabilidades.tsx) deveria manter
sessao_participantes.mana_atual em sincronia quando o personagem está em cena.
"""

from __future__ import annotations

import unittest

from routers.rolls import _descontar_mana_na_sessao


class FakeResult:
    def __init__(self, row):
        self._row = row

    def fetchone(self):
        return self._row


class FakeConnection:
    """Simula só o suficiente de psycopg pra exercitar a função: um SELECT (que
    devolve a linha programada), um UPDATE em sessao_participantes (só
    registrado, pra inspecionar o valor gravado) e o UPDATE de
    sessoes_mesa.versao que _tocar_sessao dispara quando algo mudou."""

    def __init__(self, participante_row, versao_sessao_inicial=1):
        self.participante_row = participante_row
        self.versao_sessao = versao_sessao_inicial
        self.calls: list[tuple[str, tuple]] = []

    def execute(self, sql, params=None):
        sql_normalizado = " ".join(sql.split())
        self.calls.append((sql_normalizado, params))
        if sql_normalizado.startswith("SELECT"):
            return FakeResult(self.participante_row)
        if "sessoes_mesa" in sql_normalizado:
            self.versao_sessao += 1
            return FakeResult({"versao": self.versao_sessao})
        return FakeResult(None)

    @property
    def update_calls(self):
        return [c for c in self.calls if c[0].startswith("UPDATE") and "sessao_participantes" in c[0]]

    @property
    def tocar_calls(self):
        return [c for c in self.calls if "sessoes_mesa" in c[0]]


class DescontarManaNaSessaoTests(unittest.TestCase):
    def test_desconta_o_custo_da_mana_atual_do_participante(self):
        conn = FakeConnection({"id": "participante-1", "mana_atual": 10})
        _descontar_mana_na_sessao(conn, sessao_id="sessao-1", personagem_id="pers-1", custo=4)
        self.assertEqual(len(conn.update_calls), 1)
        sql, params = conn.update_calls[0]
        self.assertIn("mana_atual=%s", sql)
        self.assertEqual(params[0], 6)  # 10 - 4
        self.assertEqual(params[1], "participante-1")

    def test_nunca_deixa_negativo_mesmo_com_custo_maior_que_a_mana_atual(self):
        conn = FakeConnection({"id": "participante-1", "mana_atual": 3})
        _descontar_mana_na_sessao(conn, sessao_id="sessao-1", personagem_id="pers-1", custo=8)
        _, params = conn.update_calls[0]
        self.assertEqual(params[0], 0)  # nunca negativo; não bloqueia, só zera

    def test_personagem_sem_participante_na_sessao_nao_faz_nada(self):
        conn = FakeConnection(None)
        resultado = _descontar_mana_na_sessao(conn, sessao_id="sessao-1", personagem_id="pers-1", custo=4)
        self.assertEqual(conn.update_calls, [])
        self.assertIsNone(resultado)

    def test_participante_sem_mana_atual_definida_nao_faz_nada(self):
        # Ex.: um NPC sem Mana no HUD (mana_atual NULL no banco).
        conn = FakeConnection({"id": "participante-1", "mana_atual": None})
        resultado = _descontar_mana_na_sessao(conn, sessao_id="sessao-1", personagem_id="pers-1", custo=4)
        self.assertEqual(conn.update_calls, [])
        self.assertIsNone(resultado)

    def test_custo_zero_ainda_executa_mas_mana_atual_fica_igual(self):
        # A rota só chama esta função quando custo > 0 (ver rolls.py::registrar_uso),
        # mas a função em si, chamada direto com custo=0, deve ser inofensiva.
        conn = FakeConnection({"id": "participante-1", "mana_atual": 10})
        _descontar_mana_na_sessao(conn, sessao_id="sessao-1", personagem_id="pers-1", custo=0)
        _, params = conn.update_calls[0]
        self.assertEqual(params[0], 10)

    def test_desconto_bem_sucedido_toca_a_sessao_e_devolve_a_nova_versao(self):
        # Corrige o achado descoberto na validação pós-correção: sem tocar a
        # sessão, o registro publicava só "registro" e o HUD do mestre não
        # atualizava sozinho.
        conn = FakeConnection({"id": "participante-1", "mana_atual": 10}, versao_sessao_inicial=5)
        resultado = _descontar_mana_na_sessao(conn, sessao_id="sessao-1", personagem_id="pers-1", custo=4)
        self.assertEqual(resultado, 6)  # 5 + 1
        self.assertEqual(len(conn.tocar_calls), 1)

    def test_quando_nao_ha_participante_a_sessao_nao_e_tocada(self):
        conn = FakeConnection(None, versao_sessao_inicial=5)
        _descontar_mana_na_sessao(conn, sessao_id="sessao-1", personagem_id="pers-1", custo=4)
        self.assertEqual(conn.tocar_calls, [])


if __name__ == "__main__":
    unittest.main()
