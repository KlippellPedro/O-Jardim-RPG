"""Ofertas em destaque da Loja: rotação de 12h calculada pelo servidor.

Duas camadas: `core.promotions` é testado como função pura (sem banco,
sempre roda); os testes com banco confirmam que o preço mostrado por
GET /loja/catalogo é exatamente o preço cobrado por POST /loja/compras,
e que os dois mudam sozinhos quando a janela de 12h vira - sem catálogo
hardcoded e sem job agendado.
"""

from __future__ import annotations

import os
import unittest
import unittest.mock
import uuid
from datetime import datetime, timedelta, timezone

import psycopg
from psycopg import sql
from psycopg.conninfo import make_conninfo
from psycopg.types.json import Jsonb

from core.database import Database
from core.dependencies import AuthenticatedUser
from core.economy_commands import CatalogPrice
from core.promotions import (
    PROMOTION_DISCOUNTS,
    is_eligible_for_promotion,
    promotion_window_id,
    resolve_promotion,
)
from routers.shop import get_shop_catalog, purchase_batch
from schemas import ShopBatchCommandInput, ShopCommandItemInput

TEST_DSN = (os.getenv("TEST_DATABASE_URL") or "").strip()

# Par (item, janela) achado por busca offline: este item cai em promoção
# nesta janela específica, com 20% de desconto (100 -> 80 Lunaris). Serve
# de fixture determinística sem precisar mockar o hash interno.
_ITEM_PROMOVIDO_ID = "item-teste-promocao"
_JANELA_COM_PROMOCAO = datetime(2026, 1, 29, 0, 0, tzinfo=timezone.utc)
_JANELA_SEM_PROMOCAO = datetime(2026, 1, 1, 0, 0, tzinfo=timezone.utc)


class PromotionsPureFunctionTests(unittest.TestCase):
    """Sem banco: só a lógica de `core.promotions`."""

    def _preco(self, valor=100, moeda="Lunaris"):
        return CatalogPrice(moeda=moeda, valor=valor)

    def test_item_de_teste_promove_exatamente_na_janela_esperada(self):
        promovido = resolve_promotion(
            _ITEM_PROMOVIDO_ID, "arma", {"raridade": "comum"}, self._preco(), 1,
            now=_JANELA_COM_PROMOCAO,
        )
        self.assertIsNotNone(promovido)
        preco, promocao = promovido
        self.assertEqual(preco, CatalogPrice(moeda="Lunaris", valor=80))
        self.assertEqual(promocao.discount_percent, 20)
        self.assertIn(promocao.discount_percent, PROMOTION_DISCOUNTS)

    def test_mesmo_item_nao_promove_em_outra_janela(self):
        resultado = resolve_promotion(
            _ITEM_PROMOVIDO_ID, "arma", {"raridade": "comum"}, self._preco(), 1,
            now=_JANELA_SEM_PROMOCAO,
        )
        self.assertIsNone(resultado)

    def test_janela_e_estavel_dentro_das_12_horas_e_muda_depois(self):
        base = _JANELA_COM_PROMOCAO
        onze_horas_depois = base + timedelta(hours=11)
        treze_horas_depois = base + timedelta(hours=13)
        self.assertEqual(promotion_window_id(base), promotion_window_id(onze_horas_depois))
        self.assertNotEqual(promotion_window_id(base), promotion_window_id(treze_horas_depois))

    def test_reprocessar_o_mesmo_item_na_mesma_janela_da_o_mesmo_resultado(self):
        # É essa repetibilidade que garante que a compra cobra o que a
        # vitrine mostrou: listagem e compra chamam a função em momentos
        # diferentes, mas dentro da mesma janela ela não pode variar.
        primeira = resolve_promotion(
            _ITEM_PROMOVIDO_ID, "arma", {"raridade": "comum"}, self._preco(), 1,
            now=_JANELA_COM_PROMOCAO,
        )
        segunda = resolve_promotion(
            _ITEM_PROMOVIDO_ID, "arma", {"raridade": "comum"}, self._preco(), 1,
            now=_JANELA_COM_PROMOCAO + timedelta(hours=5),
        )
        self.assertEqual(primeira, segunda)

    def test_raridade_congelada_nunca_entra_em_promocao(self):
        for raridade in ("mitico", "reliquia da criacao", "reliquia"):
            for i in range(50):
                janela = _JANELA_COM_PROMOCAO + timedelta(hours=12 * i)
                resultado = resolve_promotion(
                    "reliquia-qualquer", "arma", {"raridade": raridade}, self._preco(500, "Fragmentos de Estrela"), 4,
                    now=janela,
                )
                self.assertIsNone(resultado, f"{raridade} entrou em promoção na janela {i}")

    def test_categoria_fora_do_pool_nunca_entra_em_promocao(self):
        for tipo in ("monstro", "drop", "fruto-eden", "propriedade"):
            for i in range(50):
                janela = _JANELA_COM_PROMOCAO + timedelta(hours=12 * i)
                resultado = resolve_promotion(
                    "item-qualquer", tipo, {"raridade": "comum"}, self._preco(), 1,
                    now=janela,
                )
                self.assertIsNone(resultado, f"{tipo} entrou em promoção na janela {i}")

    def test_is_eligible_for_promotion_ignora_acento_e_caixa(self):
        self.assertTrue(is_eligible_for_promotion("Arma", "Incomum"))
        self.assertFalse(is_eligible_for_promotion("arma", "Relíquia da Criação"))
        self.assertFalse(is_eligible_for_promotion("Monstro", "comum"))

    def test_preco_muito_baixo_nunca_gera_desconto_falso(self):
        # 1 Lunaris não sobra o que descontar sem zerar - a função deve
        # recusar a promoção em vez de anunciar um percentual que não muda
        # o preço mostrado.
        for i in range(200):
            janela = _JANELA_COM_PROMOCAO + timedelta(hours=12 * i)
            resultado = resolve_promotion(
                "item-baratissimo", "arma", {"raridade": "comum"}, self._preco(1), 1,
                now=janela,
            )
            self.assertIsNone(resultado, f"preco de 1 Lunaris nao deveria conseguir promocao valida (janela {i})")


@unittest.skipUnless(TEST_DSN, "TEST_DATABASE_URL nao configurada")
class PromocaoLojaIntegrationTests(unittest.TestCase):
    """Com banco: confirma que listagem e compra concordam no preço."""

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

    def _personagem(self, *, email: str, saldo_lunaris: int = 1000):
        usuario_id = uuid.uuid4()
        campanha_id = uuid.uuid4()
        personagem_id = uuid.uuid4()
        with self.database.connection() as connection:
            connection.execute(
                "INSERT INTO usuarios (id, email, nome_exibicao, senha_hash, papel_plataforma) "
                "VALUES (%s, %s, 'Jogador', 'hash', 'player')",
                (usuario_id, email),
            )
            connection.execute(
                "INSERT INTO campanhas (id, dono_id, nome) VALUES (%s, %s, 'Mesa')",
                (campanha_id, usuario_id),
            )
            connection.execute(
                "INSERT INTO membros_campanha (campanha_id, usuario_id, papel) VALUES (%s, %s, 'jogador')",
                (campanha_id, usuario_id),
            )
            connection.execute(
                "INSERT INTO personagens (id, campanha_id, dono_usuario_id, nome, criado_por) "
                "VALUES (%s, %s, %s, 'Heroi', %s)",
                (personagem_id, campanha_id, usuario_id, usuario_id),
            )
            connection.execute(
                "INSERT INTO saldos_personagem (campanha_id, personagem_id, moeda, saldo) VALUES (%s, %s, 'Lunaris', %s)",
                (campanha_id, personagem_id, saldo_lunaris),
            )
        actor = AuthenticatedUser(
            id=usuario_id, email=email, nome_exibicao="Jogador", admin_plataforma=False,
            papel_plataforma="player", session_id=uuid.uuid4(), csrf_hash="hash",
        )
        return campanha_id, personagem_id, actor

    def _catalogo_item(self, item_id: str, tipo: str, conteudo: dict) -> None:
        conteudo = {"raridade": "comum", **conteudo}
        with self.database.connection() as connection:
            connection.execute(
                "INSERT INTO catalogo_itens (id, tipo, titulo, conteudo, ativo) VALUES (%s, %s, %s, %s, TRUE)",
                (item_id, tipo, conteudo.get("titulo", item_id), Jsonb(conteudo)),
            )

    def _saldo(self, campanha_id, personagem_id, moeda="Lunaris") -> int:
        with self.database.connection() as connection:
            row = connection.execute(
                "SELECT saldo FROM saldos_personagem WHERE campanha_id=%s AND personagem_id=%s AND moeda=%s",
                (campanha_id, personagem_id, moeda),
            ).fetchone()
        return int(row["saldo"]) if row else 0

    def test_catalogo_mostra_o_item_com_desconto_na_janela_promovida(self):
        campanha_id, _personagem_id, actor = self._personagem(email="vitrine-promo@example.com")
        self._catalogo_item(_ITEM_PROMOVIDO_ID, "arma", {"preco": {"Lunaris": 100}})

        with unittest.mock.patch("routers.shop.datetime") as mock_datetime:
            mock_datetime.now.return_value = _JANELA_COM_PROMOCAO
            resultado = get_shop_catalog(campanha_id=campanha_id, user=actor, database=self.database)

        item = next(i for i in resultado["itens"] if i["id"] == _ITEM_PROMOVIDO_ID)
        self.assertEqual(item["preco"], {"moeda": "Lunaris", "valor": 80})
        self.assertEqual(item["conteudo"]["promocao"]["ativa"], True)
        self.assertEqual(item["conteudo"]["promocao"]["desconto_percentual"], 20)
        self.assertEqual(item["conteudo"]["preco_original"], {"Lunaris": 100})

    def test_catalogo_mostra_preco_cheio_fora_da_janela_promovida(self):
        campanha_id, _personagem_id, actor = self._personagem(email="vitrine-sem-promo@example.com")
        self._catalogo_item(_ITEM_PROMOVIDO_ID, "arma", {"preco": {"Lunaris": 100}})

        with unittest.mock.patch("routers.shop.datetime") as mock_datetime:
            mock_datetime.now.return_value = _JANELA_SEM_PROMOCAO
            resultado = get_shop_catalog(campanha_id=campanha_id, user=actor, database=self.database)

        item = next(i for i in resultado["itens"] if i["id"] == _ITEM_PROMOVIDO_ID)
        self.assertEqual(item["preco"], {"moeda": "Lunaris", "valor": 100})
        self.assertNotIn("promocao", item["conteudo"])
        self.assertNotIn("preco_original", item["conteudo"])

    def test_compra_cobra_exatamente_o_preco_que_a_vitrine_mostrou(self):
        campanha_id, personagem_id, actor = self._personagem(email="compra-com-promo@example.com", saldo_lunaris=1000)
        self._catalogo_item(_ITEM_PROMOVIDO_ID, "arma", {"preco": {"Lunaris": 100}})

        payload = ShopBatchCommandInput(
            campanha_id=campanha_id,
            personagem_id=personagem_id,
            economia_versao_esperada=1,
            idempotencia="teste-compra-com-desconto-ativo",
            itens=[ShopCommandItemInput(item_id=_ITEM_PROMOVIDO_ID, quantidade=1)],
        )
        with unittest.mock.patch("routers.shop.datetime") as mock_datetime:
            mock_datetime.now.return_value = _JANELA_COM_PROMOCAO
            purchase_batch(payload=payload, user=actor, database=self.database)

        # 1000 - 80 (preço promocional), não 1000 - 100.
        self.assertEqual(self._saldo(campanha_id, personagem_id), 920)

    def test_compra_fora_da_janela_cobra_preco_cheio(self):
        campanha_id, personagem_id, actor = self._personagem(email="compra-sem-promo@example.com", saldo_lunaris=1000)
        self._catalogo_item(_ITEM_PROMOVIDO_ID, "arma", {"preco": {"Lunaris": 100}})

        payload = ShopBatchCommandInput(
            campanha_id=campanha_id,
            personagem_id=personagem_id,
            economia_versao_esperada=1,
            idempotencia="teste-compra-sem-desconto-ativo",
            itens=[ShopCommandItemInput(item_id=_ITEM_PROMOVIDO_ID, quantidade=1)],
        )
        with unittest.mock.patch("routers.shop.datetime") as mock_datetime:
            mock_datetime.now.return_value = _JANELA_SEM_PROMOCAO
            purchase_batch(payload=payload, user=actor, database=self.database)

        self.assertEqual(self._saldo(campanha_id, personagem_id), 900)


if __name__ == "__main__":
    unittest.main()
