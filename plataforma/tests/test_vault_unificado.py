"""Cofre unificado: leitura, retirada, transferência e escrow de reserva
(GET/POST /interno/discord/cofre/*).

O cofre da plataforma (`cofre_itens_usuario`) vira a fonte única de posse de
item — hoje os bots também têm uma tabela `inventario` local, e item comprado
com a integração ligada fica invisível pra /vender, /trocar e /leilao. Esses
testes cobrem os endpoints novos que resolvem isso; a fachada do lado do bot
(Fase 2.3) e o corte dos cogs (Fase 2.4) consomem essa API.

Roda contra um Postgres real (schema isolado por teste) porque a correção
depende de comportamento de lock (`pg_advisory_xact_lock`) e de transação que
mocks de SQL não reproduzem com confiança — mesmo padrão de
tests/test_database_integration.py.
"""

from __future__ import annotations

import concurrent.futures
import os
import threading
import unittest
import uuid
from datetime import datetime, timedelta, timezone

import psycopg
from psycopg import sql
from psycopg.conninfo import make_conninfo

from fastapi import HTTPException

from core.database import Database
from routers.internal import (
    deposit_discord_reward,
    get_discord_vault,
    list_pending_discord_vault_reservations,
    reserve_discord_vault,
    resolve_discord_vault_reservation,
    transfer_discord_vault,
    withdraw_discord_vault,
)
from schemas import (
    DiscordVaultDepositInput,
    DiscordVaultReserveInput,
    DiscordVaultReserveResolveInput,
    DiscordVaultTransferInput,
    DiscordVaultWithdrawInput,
)


TEST_DSN = (os.getenv("TEST_DATABASE_URL") or "").strip()


@unittest.skipUnless(TEST_DSN, "TEST_DATABASE_URL nao configurada")
class VaultUnificadoTests(unittest.TestCase):
    def setUp(self):
        production_dsn = (os.getenv("DATABASE_URL") or "").strip()
        if TEST_DSN == production_dsn:
            self.fail("TEST_DATABASE_URL nao pode ser o banco de producao")
        self.schema = f"jardim_test_{uuid.uuid4().hex}"
        with psycopg.connect(TEST_DSN, autocommit=True) as connection:
            connection.execute(
                sql.SQL("CREATE SCHEMA {}").format(sql.Identifier(self.schema))
            )
        isolated_dsn = make_conninfo(TEST_DSN, options=f"-c search_path={self.schema}")
        self.database = Database(isolated_dsn)
        self.database.open()
        # `cofre` é do bot Banqueiro, não existe no schema da plataforma
        # (ZIPs separados na Discloud) — recriada só pra estes testes, mesmo
        # padrão de test_database_integration.py.
        with self.database.connection() as connection:
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS cofre (
                    guild_id TEXT NOT NULL, user_id TEXT NOT NULL, tier TEXT NOT NULL,
                    seguranca_tier TEXT NOT NULL DEFAULT 'basica',
                    PRIMARY KEY (guild_id, user_id)
                )
                """
            )

    def tearDown(self):
        self.database.close()

    # ── fixtures ────────────────────────────────────────────────────────

    def _conta_vinculada(self, *, email: str, discord_user_id: str, campanha_id=None, discord_guild_id="555000111222"):
        usuario_id = uuid.uuid4()
        campanha_id = campanha_id or uuid.uuid4()
        with self.database.connection() as connection:
            connection.execute(
                """
                INSERT INTO usuarios (id, email, nome_exibicao, senha_hash, papel_plataforma)
                VALUES (%s, %s, 'Jogador', 'hash', 'player')
                """,
                (usuario_id, email),
            )
            existe_campanha = connection.execute(
                "SELECT 1 FROM campanhas WHERE id=%s", (campanha_id,)
            ).fetchone()
            if not existe_campanha:
                connection.execute(
                    "INSERT INTO campanhas (id, dono_id, nome) VALUES (%s, %s, 'Mesa')",
                    (campanha_id, usuario_id),
                )
            connection.execute(
                "INSERT INTO membros_campanha (campanha_id, usuario_id, papel) VALUES (%s, %s, 'jogador')",
                (campanha_id, usuario_id),
            )
            connection.execute(
                "INSERT INTO contas_discord (usuario_id, discord_user_id) VALUES (%s, %s)",
                (usuario_id, discord_user_id),
            )
            existe_guild = connection.execute(
                "SELECT 1 FROM campanhas_discord WHERE discord_guild_id=%s", (discord_guild_id,)
            ).fetchone()
            if not existe_guild:
                connection.execute(
                    "INSERT INTO campanhas_discord (campanha_id, discord_guild_id, vinculado_por) VALUES (%s, %s, %s)",
                    (campanha_id, discord_guild_id, usuario_id),
                )
        return usuario_id, campanha_id, discord_guild_id

    def _depositar(self, *, discord_user_id, discord_guild_id, item_id="espada", titulo="Espada", quantidade=1, idempotencia=None):
        payload = DiscordVaultDepositInput(
            discord_user_id=discord_user_id,
            discord_guild_id=discord_guild_id,
            idempotencia=idempotencia or f"seed:{uuid.uuid4().hex}",
            motivo="Seed de teste",
            itens=[{"item_id": item_id, "titulo": titulo, "quantidade": quantidade, "dados": {"raridade": "comum"}}],
        )
        return deposit_discord_reward(payload=payload, service="jornalista", database=self.database)

    # ── leitura ─────────────────────────────────────────────────────────

    def test_leitura_mostra_itens_moedas_capacidade_e_reservas(self):
        _, campanha_id, guild = self._conta_vinculada(email="leitura@example.com", discord_user_id="100200300")
        self._depositar(discord_user_id="100200300", discord_guild_id=guild, item_id="espada", quantidade=2)

        resultado = get_discord_vault(
            discord_guild_id=guild, discord_user_id="100200300", service="jornalista", database=self.database
        )

        self.assertEqual(len(resultado["itens"]), 1)
        self.assertEqual(resultado["itens"][0]["item_id"], "espada")
        self.assertEqual(resultado["itens"][0]["quantidade"], 2)
        self.assertEqual(resultado["capacidade"]["tier"], "comum")
        self.assertEqual(resultado["capacidade"]["capacidade"], 10)
        self.assertEqual(resultado["capacidade"]["usado"], 2)
        self.assertEqual(resultado["reservas"], [])

    def test_leitura_sem_vinculo_devolve_404(self):
        with self.assertRaises(HTTPException) as ctx:
            get_discord_vault(
                discord_guild_id="999", discord_user_id="888", service="jornalista", database=self.database
            )
        self.assertEqual(ctx.exception.status_code, 404)

    # ── retirada ────────────────────────────────────────────────────────

    def test_retirada_diminui_quantidade_e_apaga_linha_zerada(self):
        _, campanha_id, guild = self._conta_vinculada(email="retirada@example.com", discord_user_id="111000222")
        self._depositar(discord_user_id="111000222", discord_guild_id=guild, item_id="faca", quantidade=3)

        resultado = withdraw_discord_vault(
            payload=DiscordVaultWithdrawInput(
                discord_user_id="111000222",
                discord_guild_id=guild,
                idempotencia="venda:0001",
                motivo="Venda no Banqueiro",
                itens=[{"item_id": "faca", "quantidade": 3}],
            ),
            service="banqueiro",
            database=self.database,
        )

        self.assertFalse(resultado["repetido"])
        self.assertEqual(resultado["itens"][0]["quantidade"], 3)
        leitura = get_discord_vault(
            discord_guild_id=guild, discord_user_id="111000222", service="banqueiro", database=self.database
        )
        self.assertEqual(leitura["itens"], [])

    def test_retirada_sem_quantidade_suficiente_devolve_409_com_codigo(self):
        _, campanha_id, guild = self._conta_vinculada(email="retirada-curta@example.com", discord_user_id="333444555")
        self._depositar(discord_user_id="333444555", discord_guild_id=guild, item_id="escudo", quantidade=1)

        with self.assertRaises(HTTPException) as ctx:
            withdraw_discord_vault(
                payload=DiscordVaultWithdrawInput(
                    discord_user_id="333444555",
                    discord_guild_id=guild,
                    idempotencia="venda:curta",
                    motivo="Venda",
                    itens=[{"item_id": "escudo", "quantidade": 5}],
                ),
                service="banqueiro",
                database=self.database,
            )
        self.assertEqual(ctx.exception.status_code, 409)
        self.assertEqual(ctx.exception.detail["codigo"], "quantidade_indisponivel")
        # Nada foi retirado — a exceção não pode ter mexido no item.
        leitura = get_discord_vault(
            discord_guild_id=guild, discord_user_id="333444555", service="banqueiro", database=self.database
        )
        self.assertEqual(leitura["itens"][0]["quantidade"], 1)

    def test_retirada_e_idempotente(self):
        _, campanha_id, guild = self._conta_vinculada(email="retirada-repete@example.com", discord_user_id="777000111")
        self._depositar(discord_user_id="777000111", discord_guild_id=guild, item_id="arco", quantidade=1)

        payload = DiscordVaultWithdrawInput(
            discord_user_id="777000111",
            discord_guild_id=guild,
            idempotencia="venda:repete",
            motivo="Venda",
            itens=[{"item_id": "arco", "quantidade": 1}],
        )
        primeira = withdraw_discord_vault(payload=payload, service="banqueiro", database=self.database)
        segunda = withdraw_discord_vault(payload=payload, service="banqueiro", database=self.database)

        self.assertFalse(primeira["repetido"])
        self.assertTrue(segunda["repetido"])
        self.assertEqual(primeira["movimento_id"], segunda["movimento_id"])

    def test_retiradas_concorrentes_na_mesma_chave_nao_duplicam(self):
        """Duas retiradas de verdade (não simuladas) contra o mesmo item, na
        mesma chave de idempotência — igual ao teste equivalente do
        depósito, prova que o lock por cofre não deixa passar duas."""
        _, campanha_id, guild = self._conta_vinculada(email="retirada-concorrente@example.com", discord_user_id="222333444")
        self._depositar(discord_user_id="222333444", discord_guild_id=guild, item_id="lanca", quantidade=1)

        def montar_payload():
            return DiscordVaultWithdrawInput(
                discord_user_id="222333444",
                discord_guild_id=guild,
                idempotencia="venda:concorrente",
                motivo="Venda",
                itens=[{"item_id": "lanca", "quantidade": 1}],
            )

        barreira = threading.Barrier(2)
        erros = []
        resultados = []

        def chamar():
            barreira.wait(timeout=5)
            try:
                resultados.append(
                    withdraw_discord_vault(payload=montar_payload(), service="banqueiro", database=self.database)
                )
            except Exception as exc:
                erros.append(exc)

        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
            futures = [pool.submit(chamar), pool.submit(chamar)]
            for future in futures:
                future.result(timeout=10)

        self.assertEqual(erros, [])
        self.assertEqual(sorted(r["repetido"] for r in resultados), [False, True])

    # ── transferência ───────────────────────────────────────────────────

    def test_transferencia_unica_move_item_de_a_para_b(self):
        campanha_id = uuid.uuid4()
        _, _, guild = self._conta_vinculada(email="a@example.com", discord_user_id="100001", campanha_id=campanha_id)
        self._conta_vinculada(email="b@example.com", discord_user_id="200002", campanha_id=campanha_id, discord_guild_id=guild)
        self._depositar(discord_user_id="100001", discord_guild_id=guild, item_id="poção", quantidade=5)

        resultado = transfer_discord_vault(
            payload=DiscordVaultTransferInput(
                discord_guild_id=guild,
                idempotencia="oferta:1",
                motivo="Troca no Discord",
                movimentos=[{"de_discord_user_id": "100001", "para_discord_user_id": "200002", "itens": [{"item_id": "poção", "quantidade": 2}]}],
            ),
            service="banqueiro",
            database=self.database,
        )
        self.assertFalse(resultado["repetido"])

        de_a = get_discord_vault(discord_guild_id=guild, discord_user_id="100001", service="banqueiro", database=self.database)
        de_b = get_discord_vault(discord_guild_id=guild, discord_user_id="200002", service="banqueiro", database=self.database)
        self.assertEqual(de_a["itens"][0]["quantidade"], 3)
        self.assertEqual(de_b["itens"][0]["quantidade"], 2)

    def test_transferencia_bidirecional_troca_dois_itens_atomicamente(self):
        campanha_id = uuid.uuid4()
        _, _, guild = self._conta_vinculada(email="troca-a@example.com", discord_user_id="300003", campanha_id=campanha_id)
        self._conta_vinculada(email="troca-b@example.com", discord_user_id="400004", campanha_id=campanha_id, discord_guild_id=guild)
        self._depositar(discord_user_id="300003", discord_guild_id=guild, item_id="orbe", quantidade=1)
        self._depositar(discord_user_id="400004", discord_guild_id=guild, item_id="adaga", quantidade=1)

        transfer_discord_vault(
            payload=DiscordVaultTransferInput(
                discord_guild_id=guild,
                idempotencia="troca:0001",
                motivo="Troca bidirecional",
                movimentos=[
                    {"de_discord_user_id": "300003", "para_discord_user_id": "400004", "itens": [{"item_id": "orbe", "quantidade": 1}]},
                    {"de_discord_user_id": "400004", "para_discord_user_id": "300003", "itens": [{"item_id": "adaga", "quantidade": 1}]},
                ],
            ),
            service="banqueiro",
            database=self.database,
        )

        de_a = get_discord_vault(discord_guild_id=guild, discord_user_id="300003", service="banqueiro", database=self.database)
        de_b = get_discord_vault(discord_guild_id=guild, discord_user_id="400004", service="banqueiro", database=self.database)
        self.assertEqual([item["item_id"] for item in de_a["itens"]], ["adaga"])
        self.assertEqual([item["item_id"] for item in de_b["itens"]], ["orbe"])

    def test_transferencia_sem_quantidade_suficiente_nao_move_nada(self):
        """Um lado sem o item precisa reverter a transação inteira — o outro
        lado não pode ter perdido o item dele sem receber nada em troca."""
        campanha_id = uuid.uuid4()
        _, _, guild = self._conta_vinculada(email="troca-falha-a@example.com", discord_user_id="500005", campanha_id=campanha_id)
        self._conta_vinculada(email="troca-falha-b@example.com", discord_user_id="600006", campanha_id=campanha_id, discord_guild_id=guild)
        self._depositar(discord_user_id="500005", discord_guild_id=guild, item_id="martelo", quantidade=1)
        # 6000 NÃO tem "escudo" — a segunda perna da troca vai falhar.

        with self.assertRaises(HTTPException) as ctx:
            transfer_discord_vault(
                payload=DiscordVaultTransferInput(
                    discord_guild_id=guild,
                    idempotencia="troca:falha",
                    motivo="Troca bidirecional",
                    movimentos=[
                        {"de_discord_user_id": "500005", "para_discord_user_id": "600006", "itens": [{"item_id": "martelo", "quantidade": 1}]},
                        {"de_discord_user_id": "600006", "para_discord_user_id": "500005", "itens": [{"item_id": "escudo", "quantidade": 1}]},
                    ],
                ),
                service="banqueiro",
                database=self.database,
            )
        self.assertEqual(ctx.exception.status_code, 409)

        de_a = get_discord_vault(discord_guild_id=guild, discord_user_id="500005", service="banqueiro", database=self.database)
        self.assertEqual(de_a["itens"][0]["item_id"], "martelo")
        self.assertEqual(de_a["itens"][0]["quantidade"], 1)

    def test_transferencia_respeita_capacidade_do_destino(self):
        campanha_id = uuid.uuid4()
        _, _, guild = self._conta_vinculada(email="capacidade-a@example.com", discord_user_id="700007", campanha_id=campanha_id)
        self._conta_vinculada(email="capacidade-b@example.com", discord_user_id="800008", campanha_id=campanha_id, discord_guild_id=guild)
        # Tier "comum" aguenta 10 itens — enche o destino até o limite.
        for indice in range(10):
            self._depositar(discord_user_id="800008", discord_guild_id=guild, item_id=f"item-{indice}", quantidade=1)
        self._depositar(discord_user_id="700007", discord_guild_id=guild, item_id="ultimo", quantidade=1)

        with self.assertRaises(HTTPException) as ctx:
            transfer_discord_vault(
                payload=DiscordVaultTransferInput(
                    discord_guild_id=guild,
                    idempotencia="oferta:cheio",
                    motivo="Troca",
                    movimentos=[{"de_discord_user_id": "700007", "para_discord_user_id": "800008", "itens": [{"item_id": "ultimo", "quantidade": 1}]}],
                    respeitar_capacidade=True,
                ),
                service="banqueiro",
                database=self.database,
            )
        self.assertEqual(ctx.exception.status_code, 409)
        self.assertEqual(ctx.exception.detail["codigo"], "cofre_cheio")

    def test_transferencia_pode_ignorar_capacidade_quando_pedido(self):
        """Baús e /daritem do mestre não podem quicar por cofre cheio —
        `respeitar_capacidade=False` é o caminho deles."""
        campanha_id = uuid.uuid4()
        _, _, guild = self._conta_vinculada(email="ignora-cap-a@example.com", discord_user_id="910010", campanha_id=campanha_id)
        self._conta_vinculada(email="ignora-cap-b@example.com", discord_user_id="920020", campanha_id=campanha_id, discord_guild_id=guild)
        for indice in range(10):
            self._depositar(discord_user_id="920020", discord_guild_id=guild, item_id=f"cheio-{indice}", quantidade=1)
        self._depositar(discord_user_id="910010", discord_guild_id=guild, item_id="extra", quantidade=1)

        resultado = transfer_discord_vault(
            payload=DiscordVaultTransferInput(
                discord_guild_id=guild,
                idempotencia="oferta:sem-limite",
                motivo="Presente do mestre",
                movimentos=[{"de_discord_user_id": "910010", "para_discord_user_id": "920020", "itens": [{"item_id": "extra", "quantidade": 1}]}],
                respeitar_capacidade=False,
            ),
            service="banqueiro",
            database=self.database,
        )
        self.assertFalse(resultado["repetido"])

    def test_transferencia_com_participante_de_outro_servidor_e_rejeitada(self):
        """`campanhas_discord.discord_guild_id` é UNIQUE — um guild só mapeia
        pra uma campanha, então "campanhas diferentes" nunca é alcançável
        pela API (só existe um discord_guild_id por transferência). O caso
        real é este: o segundo participante não está vinculado a ESSE guild
        (está vinculado a outro), o que já cai no 404 de não-vinculado."""
        _, _, guild_a = self._conta_vinculada(email="camp-a@example.com", discord_user_id="999911")
        _, _, guild_b = self._conta_vinculada(email="camp-b@example.com", discord_user_id="999922", discord_guild_id="666777888999")

        with self.assertRaises(HTTPException) as ctx:
            transfer_discord_vault(
                payload=DiscordVaultTransferInput(
                    discord_guild_id=guild_a,
                    idempotencia="oferta:cruzada",
                    motivo="Troca",
                    movimentos=[{"de_discord_user_id": "999911", "para_discord_user_id": "999922", "itens": [{"item_id": "x", "quantidade": 1}]}],
                ),
                service="banqueiro",
                database=self.database,
            )
        self.assertEqual(ctx.exception.status_code, 404)

    # ── reserva (escrow de leilão) ─────────────────────────────────────

    def test_reserva_retira_do_cofre_e_idempotencia_e_a_referencia(self):
        _, campanha_id, guild = self._conta_vinculada(email="leilao@example.com", discord_user_id="555100")
        self._depositar(discord_user_id="555100", discord_guild_id=guild, item_id="coroa", quantidade=1)
        expira = datetime.now(timezone.utc) + timedelta(hours=72)

        resultado = reserve_discord_vault(
            payload=DiscordVaultReserveInput(
                discord_user_id="555100",
                discord_guild_id=guild,
                origem="banqueiro",
                referencia="leilao:1",
                item_id="coroa",
                quantidade=1,
                motivo="Leilão iniciado",
                expira_em=expira,
            ),
            service="banqueiro",
            database=self.database,
        )
        self.assertFalse(resultado["repetido"])

        leitura = get_discord_vault(discord_guild_id=guild, discord_user_id="555100", service="banqueiro", database=self.database)
        self.assertEqual(leitura["itens"], [])
        self.assertEqual(len(leitura["reservas"]), 1)
        self.assertEqual(leitura["reservas"][0]["referencia"], "leilao:1")

        repetida = reserve_discord_vault(
            payload=DiscordVaultReserveInput(
                discord_user_id="555100",
                discord_guild_id=guild,
                origem="banqueiro",
                referencia="leilao:1",
                item_id="coroa",
                quantidade=1,
                motivo="Leilão iniciado",
                expira_em=expira,
            ),
            service="banqueiro",
            database=self.database,
        )
        self.assertTrue(repetida["repetido"])

    def test_resolver_reserva_entrega_ao_vencedor(self):
        campanha_id = uuid.uuid4()
        _, _, guild = self._conta_vinculada(email="leilao-dono@example.com", discord_user_id="111100", campanha_id=campanha_id)
        self._conta_vinculada(email="leilao-vencedor@example.com", discord_user_id="222200", campanha_id=campanha_id, discord_guild_id=guild)
        self._depositar(discord_user_id="111100", discord_guild_id=guild, item_id="cetro", quantidade=1)
        reserve_discord_vault(
            payload=DiscordVaultReserveInput(
                discord_user_id="111100", discord_guild_id=guild, origem="banqueiro", referencia="leilao:2",
                item_id="cetro", quantidade=1, motivo="Leilão", expira_em=datetime.now(timezone.utc) + timedelta(hours=1),
            ),
            service="banqueiro", database=self.database,
        )

        resultado = resolve_discord_vault_reservation(
            payload=DiscordVaultReserveResolveInput(
                discord_guild_id=guild, origem="banqueiro", referencia="leilao:2", destino_discord_user_id="222200",
            ),
            service="banqueiro", database=self.database,
        )
        self.assertEqual(resultado["status"], "entregue")

        leitura_vencedor = get_discord_vault(discord_guild_id=guild, discord_user_id="222200", service="banqueiro", database=self.database)
        self.assertEqual(leitura_vencedor["itens"][0]["item_id"], "cetro")
        leitura_dono = get_discord_vault(discord_guild_id=guild, discord_user_id="111100", service="banqueiro", database=self.database)
        self.assertEqual(leitura_dono["itens"], [])

    def test_resolver_reserva_sem_destino_devolve_ao_dono(self):
        _, campanha_id, guild = self._conta_vinculada(email="leilao-sem-lance@example.com", discord_user_id="333300")
        self._depositar(discord_user_id="333300", discord_guild_id=guild, item_id="anel", quantidade=1)
        reserve_discord_vault(
            payload=DiscordVaultReserveInput(
                discord_user_id="333300", discord_guild_id=guild, origem="banqueiro", referencia="leilao:3",
                item_id="anel", quantidade=1, motivo="Leilão sem lances", expira_em=datetime.now(timezone.utc) + timedelta(hours=1),
            ),
            service="banqueiro", database=self.database,
        )

        resultado = resolve_discord_vault_reservation(
            payload=DiscordVaultReserveResolveInput(discord_guild_id=guild, origem="banqueiro", referencia="leilao:3"),
            service="banqueiro", database=self.database,
        )
        self.assertEqual(resultado["status"], "devolvida")

        leitura = get_discord_vault(discord_guild_id=guild, discord_user_id="333300", service="banqueiro", database=self.database)
        self.assertEqual(leitura["itens"][0]["item_id"], "anel")

    def test_resolver_reserva_ja_resolvida_e_idempotente_sem_duplicar_entrega(self):
        campanha_id = uuid.uuid4()
        _, _, guild = self._conta_vinculada(email="leilao-repete-a@example.com", discord_user_id="444100", campanha_id=campanha_id)
        self._conta_vinculada(email="leilao-repete-b@example.com", discord_user_id="444200", campanha_id=campanha_id, discord_guild_id=guild)
        self._depositar(discord_user_id="444100", discord_guild_id=guild, item_id="varinha", quantidade=1)
        reserve_discord_vault(
            payload=DiscordVaultReserveInput(
                discord_user_id="444100", discord_guild_id=guild, origem="banqueiro", referencia="leilao:4",
                item_id="varinha", quantidade=1, motivo="Leilão", expira_em=datetime.now(timezone.utc) + timedelta(hours=1),
            ),
            service="banqueiro", database=self.database,
        )
        payload_resolver = DiscordVaultReserveResolveInput(
            discord_guild_id=guild, origem="banqueiro", referencia="leilao:4", destino_discord_user_id="444200",
        )
        resolve_discord_vault_reservation(payload=payload_resolver, service="banqueiro", database=self.database)
        repetida = resolve_discord_vault_reservation(payload=payload_resolver, service="banqueiro", database=self.database)

        self.assertTrue(repetida["repetido"])
        leitura = get_discord_vault(discord_guild_id=guild, discord_user_id="444200", service="banqueiro", database=self.database)
        # Só uma varinha — se a segunda chamada tivesse entregado de novo, seriam 2.
        self.assertEqual(leitura["itens"][0]["quantidade"], 1)

    def test_resolver_reserva_inexistente_devolve_404(self):
        _, campanha_id, guild = self._conta_vinculada(email="leilao-fantasma@example.com", discord_user_id="555500")
        with self.assertRaises(HTTPException) as ctx:
            resolve_discord_vault_reservation(
                payload=DiscordVaultReserveResolveInput(discord_guild_id=guild, origem="banqueiro", referencia="leilao:inexistente"),
                service="banqueiro", database=self.database,
            )
        self.assertEqual(ctx.exception.status_code, 404)

    # ── reservas pendentes (reconciliação) ─────────────────────────────

    def test_lista_reservas_pendentes_e_filtra_vencidas(self):
        _, campanha_id, guild = self._conta_vinculada(email="pendentes@example.com", discord_user_id="666100")
        self._depositar(discord_user_id="666100", discord_guild_id=guild, item_id="taca-a", quantidade=1)
        self._depositar(discord_user_id="666100", discord_guild_id=guild, item_id="taca-b", quantidade=1)
        reserve_discord_vault(
            payload=DiscordVaultReserveInput(
                discord_user_id="666100", discord_guild_id=guild, origem="banqueiro", referencia="leilao:vencido",
                item_id="taca-a", quantidade=1, motivo="Leilão", expira_em=datetime.now(timezone.utc) - timedelta(hours=1),
            ),
            service="banqueiro", database=self.database,
        )
        reserve_discord_vault(
            payload=DiscordVaultReserveInput(
                discord_user_id="666100", discord_guild_id=guild, origem="banqueiro", referencia="leilao:futuro",
                item_id="taca-b", quantidade=1, motivo="Leilão", expira_em=datetime.now(timezone.utc) + timedelta(hours=1),
            ),
            service="banqueiro", database=self.database,
        )

        todas = list_pending_discord_vault_reservations(
            discord_guild_id=guild, vencidas=False, service="banqueiro", database=self.database
        )
        self.assertEqual(len(todas["reservas"]), 2)

        vencidas = list_pending_discord_vault_reservations(
            discord_guild_id=guild, vencidas=True, service="banqueiro", database=self.database
        )
        self.assertEqual([r["referencia"] for r in vencidas["reservas"]], ["leilao:vencido"])


if __name__ == "__main__":
    unittest.main()
