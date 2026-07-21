from __future__ import annotations

from typing import Any

import httpx


class PlatformApiError(RuntimeError):
    def __init__(self, message: str, status_code: int | None = None):
        super().__init__(message)
        self.status_code = status_code


class PlatformClient:
    def __init__(self, base_url: str, service_api_key: str):
        self._client = httpx.AsyncClient(
            base_url=f"{base_url.rstrip('/')}/",
            headers={
                "X-Service-Key": service_api_key,
                "Accept": "application/json",
            },
            timeout=httpx.Timeout(10.0, connect=5.0),
        )

    async def close(self) -> None:
        await self._client.aclose()

    async def _request(self, method: str, path: str, **kwargs) -> dict[str, Any]:
        try:
            response = await self._client.request(method, path.lstrip("/"), **kwargs)
        except httpx.TimeoutException as exc:
            raise PlatformApiError("a plataforma demorou demais para responder") from exc
        except httpx.RequestError as exc:
            raise PlatformApiError("nao consegui acessar a plataforma") from exc

        try:
            payload = response.json()
        except ValueError:
            payload = {}
        if response.is_error:
            detail = payload.get("detail") if isinstance(payload, dict) else None
            message = detail if isinstance(detail, str) else "a plataforma recusou a operacao"
            raise PlatformApiError(message, response.status_code)
        return payload if isinstance(payload, dict) else {}

    async def deposit_vault(
        self,
        *,
        discord_user_id: int,
        discord_guild_id: int,
        idempotency_key: str,
        reason: str,
        items: list[dict[str, Any]] | None = None,
        currencies: list[dict[str, Any]] | None = None,
    ) -> dict[str, Any]:
        """Deposit a Discord reward in the account vault without duplicates."""
        payload = {
            "discord_user_id": str(discord_user_id),
            "discord_guild_id": str(discord_guild_id),
            "idempotencia": idempotency_key,
            "motivo": reason,
            "itens": items or [],
            "moedas": currencies or [],
        }
        last_error: PlatformApiError | None = None
        for attempt in range(2):
            try:
                return await self._request(
                    "POST",
                    "/interno/discord/cofre/depositar",
                    json=payload,
                )
            except PlatformApiError as exc:
                last_error = exc
                if exc.status_code is not None or attempt == 1:
                    raise
        raise last_error or PlatformApiError("nao consegui depositar a recompensa")
