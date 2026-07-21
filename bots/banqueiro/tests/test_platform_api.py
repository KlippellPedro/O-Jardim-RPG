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


if __name__ == "__main__":
    unittest.main()
