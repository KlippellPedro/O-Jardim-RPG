"""Mestre concede item, criatura ou propriedade direto na ficha de qualquer
personagem da campanha, sem cobrar moeda e sem as travas que só existem para
compra (nível de loja, `requer_autorizacao_mestre`, classe/nível mínimo).

Cobre: item comum não mexe na carteira; criatura vira Aliado; jogador comum
é barrado; a trava de compra que normalmente bloquearia o item some quando
quem chama é o Mestre; idempotência não duplica quantidade.
"""

from __future__ import annotations

import json
import os
import unittest
import uuid
from pathlib import Path

import psycopg
from psycopg import sql
from psycopg.conninfo import make_conninfo
from psycopg.types.json import Jsonb

from fastapi import HTTPException

from core.database import Database
from core.dependencies import AuthenticatedUser
from routers.shop import grant_batch
from schemas import ShopGrantCommandInput, ShopGrantItemInput


TEST_DSN = (os.getenv("TEST_DATABASE_URL") or "").strip()

_CATALOGO_REAL = {
    e["id"]: e
    for e in json.loads(
        (Path(__file__).resolve().parents[2] / "data" / "loja" / "catalogo.json").read_text(encoding="utf-8")
    )["entradas"]
}


@unittest.skipUnless(TEST_DSN, "TEST_DATABASE_URL nao configurada")
class ConcessaoMestreTests(unittest.TestCase):
    def setUp(self):
        production_dsn = (os.getenv("DATABASE_URL") or "").strip()
        if TEST_DSN == production_dsn:
            self.fail("TEST_DATABASE_URL nao pode ser o banco de producao")
        self.schema = f"jardim_test_{uuid.uuid4().hex}"
        with psycopg.connect(TEST_DSN, autocommit=True) as connection:
            connection.execute(sql.SQL("CREATE SCHEMA {}").format(sql.Identifier(self.schema)))
        isolated_dsn = make_conninfo(TEST_DSN, options=f"-c search_path={self.schema}")
        self.database = Database(isolated_dsn)
        self.database.open()

    def tearDown(self):
        self.database.close()
        with psycopg.connect(TEST_DSN, autocommit=True) as connection:
            connection.execute(sql.SQL("DROP SCHEMA IF EXISTS {} CASCADE").format(sql.Identifier(self.schema)))

    # -- helpers ---------------------------------------------------------

    def _usuario(self, email: str, papel_campanha: str) -> tuple[uuid.UUID, AuthenticatedUser]:
        usuario_id = uuid.uuid4()
        with self.database.connection() as connection:
            connection.execute(
                "INSERT INTO usuarios (id, email, nome_exibicao, senha_hash, papel_plataforma) VALUES (%s, %s, %s, 'hash', 'player')",
                (usuario_id, email, "Mestre" if papel_campanha == "mestre" else "Jogador"),
            )
        actor = AuthenticatedUser(
            id=usuario_id,
            email=email,
            nome_exibicao="Mestre" if papel_campanha == "mestre" else "Jogador",
            admin_plataforma=False,
            papel_plataforma="player",
            session_id=uuid.uuid4(),
            csrf_hash="hash",
        )
        return usuario_id, actor

    def _campanha_com_personagem(self):
        """Uma campanha com um Mestre e um Jogador dono do personagem-alvo —
        prova que a concessão mira em qualquer ficha, não só na de quem chama."""
        mestre_id, mestre_actor = self._usuario("mestre@example.com", "mestre")
        jogador_id, jogador_actor = self._usuario("jogador@example.com", "jogador")
        campanha_id = uuid.uuid4()
        personagem_id = uuid.uuid4()
        with self.database.connection() as connection:
            connection.execute(
                "INSERT INTO campanhas (id, dono_id, nome) VALUES (%s, %s, 'Mesa')",
                (campanha_id, mestre_id),
            )
            connection.execute(
                "INSERT INTO membros_campanha (campanha_id, usuario_id, papel) VALUES (%s, %s, 'mestre')",
                (campanha_id, mestre_id),
            )
            connection.execute(
                "INSERT INTO membros_campanha (campanha_id, usuario_id, papel) VALUES (%s, %s, 'jogador')",
                (campanha_id, jogador_id),
            )
            connection.execute(
                "INSERT INTO personagens (id, campanha_id, dono_usuario_id, nome, criado_por) VALUES (%s, %s, %s, 'Heroi', %s)",
                (personagem_id, campanha_id, jogador_id, jogador_id),
            )
        return campanha_id, personagem_id, mestre_actor, jogador_actor

    def _catalogo_item_real(self, item_id: str) -> dict:
        entrada = _CATALOGO_REAL[item_id]
        with self.database.connection() as connection:
            connection.execute(
                "INSERT INTO catalogo_itens (id, tipo, titulo, conteudo, ativo) VALUES (%s, %s, %s, %s, TRUE)",
                (entrada["id"], entrada["tipo"], entrada["titulo"], Jsonb(entrada["conteudo"])),
            )
        return entrada

    def _conceder(self, *, campanha_id, personagem_id, actor, item_id, quantidade=1, idempotencia="teste-idempotencia"):
        payload = ShopGrantCommandInput(
            campanha_id=campanha_id,
            personagem_id=personagem_id,
            idempotencia=idempotencia,
            itens=[ShopGrantItemInput(item_id=item_id, quantidade=quantidade)],
        )
        return grant_batch(payload=payload, user=actor, database=self.database)

    def _ficha(self, personagem_id: uuid.UUID) -> dict:
        with self.database.connection() as connection:
            row = connection.execute(
                "SELECT ficha FROM personagens WHERE id=%s", (personagem_id,)
            ).fetchone()
        return row["ficha"]

    def _inventario(self, campanha_id: uuid.UUID, personagem_id: uuid.UUID) -> list[dict]:
        with self.database.connection() as connection:
            rows = connection.execute(
                "SELECT item_id, quantidade FROM inventario_personagem WHERE campanha_id=%s AND personagem_id=%s",
                (campanha_id, personagem_id),
            ).fetchall()
        return [dict(row) for row in rows]

    # -- comportamento -----------------------------------------------------

    def test_item_comum_entra_no_inventario_sem_mexer_na_carteira(self):
        campanha_id, personagem_id, mestre, _jogador = self._campanha_com_personagem()
        self._catalogo_item_real("lobo-cinzento")
        with self.database.connection() as connection:
            connection.execute(
                "INSERT INTO saldos_personagem (campanha_id, personagem_id, moeda, saldo) VALUES (%s, %s, 'Lunaris', 50)",
                (campanha_id, personagem_id),
            )

        resultado = self._conceder(
            campanha_id=campanha_id, personagem_id=personagem_id, actor=mestre, item_id="lobo-cinzento",
        )

        self.assertEqual(resultado["itens"][0]["item_id"], "lobo-cinzento")
        inventario = self._inventario(campanha_id, personagem_id)
        self.assertEqual([item["item_id"] for item in inventario], ["lobo-cinzento"])
        with self.database.connection() as connection:
            saldo = connection.execute(
                "SELECT saldo FROM saldos_personagem WHERE campanha_id=%s AND personagem_id=%s AND moeda='Lunaris'",
                (campanha_id, personagem_id),
            ).fetchone()
        self.assertEqual(saldo["saldo"], 50, "concessao nao pode debitar a carteira")

    def test_criatura_vira_aliado_na_ficha_do_personagem_alvo(self):
        campanha_id, personagem_id, mestre, _jogador = self._campanha_com_personagem()
        self._catalogo_item_real("caribdis")

        self._conceder(campanha_id=campanha_id, personagem_id=personagem_id, actor=mestre, item_id="caribdis")

        ficha = self._ficha(personagem_id)
        aliados = ficha.get("aliados") or []
        self.assertEqual(len(aliados), 1)
        self.assertEqual(aliados[0]["nome"], "Caríbdis")
        self.assertEqual(aliados[0]["nivel"], 33)

    def test_fantasma_do_vendaval_vira_aliado_voador_pronto_pra_jogar(self):
        # A criatura pensada pra ser o aliado ganho na Tripulação do Pirata
        # Amaldiçoado: precisa chegar na ficha com Movimento de voo, não só
        # com Vida e Defesa - senão o jogador não consegue usá-la de verdade.
        campanha_id, personagem_id, mestre, _jogador = self._campanha_com_personagem()
        self._catalogo_item_real("fantasma-do-vendaval")

        self._conceder(campanha_id=campanha_id, personagem_id=personagem_id, actor=mestre, item_id="fantasma-do-vendaval")

        ficha = self._ficha(personagem_id)
        aliado = (ficha.get("aliados") or [])[0]
        self.assertEqual(aliado["nome"], "Fantasma do Vendaval")
        self.assertEqual(aliado["nivel"], 33)
        self.assertEqual(aliado["movimento"], "18m (Voo)")
        self.assertEqual(aliado["defesa"], 27)
        self.assertIn("Ar", aliado["ataquePrincipal"])
        self.assertTrue(aliado["emCena"], "aliado de combate entra em cena, nao lotado na base")

    def test_jogador_comum_nao_pode_conceder(self):
        campanha_id, personagem_id, _mestre, jogador = self._campanha_com_personagem()
        self._catalogo_item_real("lobo-cinzento")

        with self.assertRaises(HTTPException) as ctx:
            self._conceder(campanha_id=campanha_id, personagem_id=personagem_id, actor=jogador, item_id="lobo-cinzento")
        self.assertEqual(ctx.exception.status_code, 403)

    def test_concessao_ignora_a_trava_de_autorizacao_que_bloquearia_a_compra(self):
        # A Caríbdis é "requer_autorizacao_mestre": true e nivelMinimoLoja 4 —
        # travas que existem para BLOQUEAR compra de jogador, mas que não fazem
        # sentido numa concessão: quem esta chamando isto já é a autorização.
        campanha_id, personagem_id, mestre, _jogador = self._campanha_com_personagem()
        entrada = self._catalogo_item_real("caribdis")
        self.assertTrue(entrada["conteudo"]["requer_autorizacao_mestre"])

        resultado = self._conceder(campanha_id=campanha_id, personagem_id=personagem_id, actor=mestre, item_id="caribdis")
        self.assertEqual(resultado["itens"][0]["item_id"], "caribdis")

    def test_idempotencia_nao_duplica_quantidade(self):
        campanha_id, personagem_id, mestre, _jogador = self._campanha_com_personagem()
        self._catalogo_item_real("lobo-cinzento")

        self._conceder(
            campanha_id=campanha_id, personagem_id=personagem_id, actor=mestre,
            item_id="lobo-cinzento", quantidade=3, idempotencia="mesma-chave",
        )
        repetida = self._conceder(
            campanha_id=campanha_id, personagem_id=personagem_id, actor=mestre,
            item_id="lobo-cinzento", quantidade=3, idempotencia="mesma-chave",
        )

        self.assertTrue(repetida["repetida"])
        inventario = self._inventario(campanha_id, personagem_id)
        self.assertEqual(inventario[0]["quantidade"], 3, "a repeticao nao pode somar quantidade de novo")


if __name__ == "__main__":
    unittest.main()
