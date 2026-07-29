from __future__ import annotations

import unittest

import httpx

from core.platform_api import PlatformApiError, PlatformClient


class PlatformClientTests(unittest.IsolatedAsyncioTestCase):
    async def _client_with_handler(self, handler):
        client = PlatformClient(
            "http://jardim-api:8080/api/v1",
            "x" * 32,
        )
        await client._client.aclose()
        client._client = httpx.AsyncClient(
            base_url="http://jardim-api:8080/api/v1/",
            headers={"X-Service-Key": "x" * 32},
            transport=httpx.MockTransport(handler),
        )
        return client

    async def test_keeps_api_v1_prefix(self):
        requested = []

        async def handler(request):
            requested.append(request.url.path)
            return httpx.Response(200, json={"campanhas": []})

        client = await self._client_with_handler(handler)
        try:
            await client.user_context(123456789)
        finally:
            await client.close()
        self.assertEqual(
            requested,
            ["/api/v1/interno/discord/usuarios/123456789/contexto"],
        )

    async def test_maps_api_error_without_leaking_body(self):
        async def handler(request):
            return httpx.Response(403, json={"detail": "conta nao vinculada"})

        client = await self._client_with_handler(handler)
        try:
            with self.assertRaisesRegex(PlatformApiError, "conta nao vinculada"):
                await client.user_context(123456789)
        finally:
            await client.close()

    async def test_dict_detail_exposes_code_and_status(self):
        """Os endpoints novos do cofre unificado (retirar/transferir/reservar)
        devolvem `detail` como dict ({"codigo", "mensagem"}), não string: sem
        isso todo 409 parecia igual e o bot não conseguia distinguir "cofre
        cheio" (erro do usuário) de "sem quantidade" (nunca cair pro legado)."""
        async def handler(request):
            return httpx.Response(
                409,
                json={"detail": {"codigo": "quantidade_indisponivel", "mensagem": "Você não tem esse item."}},
            )

        client = await self._client_with_handler(handler)
        try:
            await client.user_context(123456789)
            self.fail("deveria ter lançado PlatformApiError")
        except PlatformApiError as exc:
            self.assertEqual(exc.code, "quantidade_indisponivel")
            self.assertEqual(exc.status_code, 409)
        finally:
            await client.close()

    async def test_string_detail_continua_sem_code(self):
        """Retrocompatibilidade: endpoints antigos (ex.: 404 de vincular)
        ainda mandam `detail` como string simples: code deve ficar None."""
        async def handler(request):
            return httpx.Response(404, json={"detail": "vincule sua conta"})

        client = await self._client_with_handler(handler)
        try:
            await client.user_context(123456789)
            self.fail("deveria ter lançado PlatformApiError")
        except PlatformApiError as exc:
            self.assertIsNone(exc.code)
            self.assertEqual(str(exc), "vincule sua conta")
        finally:
            await client.close()

    async def test_deposit_vault_uses_internal_endpoint_and_idempotency(self):
        requests = []

        async def handler(request):
            requests.append((request.url.path, request.read()))
            return httpx.Response(200, json={"repetido": False})

        client = await self._client_with_handler(handler)
        try:
            await client.deposit_vault(
                discord_user_id=123456789,
                discord_guild_id=987654321,
                idempotency_key="bau-drop:mensagem:usuario",
                reason="teste",
                items=[{"item_id": "faca", "titulo": "Faca", "quantidade": 1}],
            )
        finally:
            await client.close()
        self.assertEqual(requests[0][0], "/api/v1/interno/discord/cofre/depositar")
        self.assertIn(b'"idempotencia":"bau-drop:mensagem:usuario"', requests[0][1])

    async def test_get_vault_uses_guild_and_user_in_the_path(self):
        requested = []

        async def handler(request):
            requested.append(request.url.path)
            return httpx.Response(200, json={"itens": []})

        client = await self._client_with_handler(handler)
        try:
            await client.get_vault(discord_guild_id=1, discord_user_id=2)
        finally:
            await client.close()
        self.assertEqual(requested, ["/api/v1/interno/discord/cofre/1/2"])

    async def test_withdraw_vault_posts_to_retirar(self):
        requests = []

        async def handler(request):
            requests.append((request.url.path, request.read()))
            return httpx.Response(200, json={"repetido": False, "itens": []})

        client = await self._client_with_handler(handler)
        try:
            await client.withdraw_vault(
                discord_user_id=1,
                discord_guild_id=2,
                idempotency_key="venda:0001",
                reason="Venda",
                items=[{"item_id": "faca", "quantidade": 1}],
            )
        finally:
            await client.close()
        self.assertEqual(requests[0][0], "/api/v1/interno/discord/cofre/retirar")
        self.assertIn(b'"idempotencia":"venda:0001"', requests[0][1])

    async def test_transfer_vault_posts_moves_and_capacity_flag(self):
        requests = []

        async def handler(request):
            requests.append((request.url.path, request.read()))
            return httpx.Response(200, json={"repetido": False})

        client = await self._client_with_handler(handler)
        try:
            await client.transfer_vault(
                discord_guild_id=1,
                idempotency_key="troca:0001",
                reason="Troca",
                moves=[{"de_discord_user_id": "10", "para_discord_user_id": "20", "itens": [{"item_id": "x", "quantidade": 1}]}],
                respect_capacity=False,
            )
        finally:
            await client.close()
        self.assertEqual(requests[0][0], "/api/v1/interno/discord/cofre/transferir")
        self.assertIn(b'"respeitar_capacidade":false', requests[0][1])

    async def test_reserve_vault_posts_to_reservas(self):
        requests = []

        async def handler(request):
            requests.append((request.url.path, request.read()))
            return httpx.Response(200, json={"repetido": False})

        client = await self._client_with_handler(handler)
        try:
            await client.reserve_vault(
                discord_user_id=1,
                discord_guild_id=2,
                origin="banqueiro",
                reference="leilao:1",
                item_id="x",
                quantity=1,
                reason="Leilão",
                expires_at="2026-01-01T00:00:00Z",
            )
        finally:
            await client.close()
        self.assertEqual(requests[0][0], "/api/v1/interno/discord/cofre/reservas")
        self.assertIn(b'"referencia":"leilao:1"', requests[0][1])

    async def test_resolve_vault_reservation_posts_to_resolver(self):
        requests = []

        async def handler(request):
            requests.append((request.url.path, request.read()))
            return httpx.Response(200, json={"repetido": False, "status": "entregue"})

        client = await self._client_with_handler(handler)
        try:
            await client.resolve_vault_reservation(
                discord_guild_id=1, origin="banqueiro", reference="leilao:1", destination_discord_user_id=99,
            )
        finally:
            await client.close()
        self.assertEqual(requests[0][0], "/api/v1/interno/discord/cofre/reservas/resolver")
        self.assertIn(b'"destino_discord_user_id":"99"', requests[0][1])

    async def test_list_pending_vault_reservations_sends_query_params(self):
        requested = []

        async def handler(request):
            requested.append(str(request.url))
            return httpx.Response(200, json={"reservas": []})

        client = await self._client_with_handler(handler)
        try:
            await client.list_pending_vault_reservations(discord_guild_id=1, expired_only=True)
        finally:
            await client.close()
        self.assertIn("discord_guild_id=1", requested[0])
        self.assertIn("vencidas=true", requested[0])


if __name__ == "__main__":
    unittest.main()
