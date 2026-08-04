from __future__ import annotations

from typing import Any

import httpx


class PlatformApiError(RuntimeError):
    def __init__(self, message: str, status_code: int | None = None, code: str | None = None):
        super().__init__(message)
        self.status_code = status_code
        # Código curto e estável (ex.: "cofre_cheio", "quantidade_indisponivel",
        # "nao_vinculado") que os endpoints do cofre unificado devolvem em
        # `detail.codigo`. Sem isso, todo 409 parece igual pro chamador: e
        # "cofre cheio" (erro do usuário) e "sem quantidade" (não pode cair
        # pro legado) precisam de tratamento bem diferente.
        self.code = code


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
            if isinstance(detail, str):
                message, code = detail, None
            elif isinstance(detail, dict):
                message = detail.get("mensagem") or "a plataforma recusou a operacao"
                code = detail.get("codigo")
            elif isinstance(detail, list):
                # Erro de validacao do FastAPI (422): lista de {"loc", "msg", ...}.
                # Sem isto virava sempre "a plataforma recusou a operacao", que nao
                # dizia qual campo estava errado (ex.: codigo colado com texto extra).
                mensagens = [
                    f"{'.'.join(str(parte) for parte in item.get('loc', ()) if parte != 'body')}: {item.get('msg')}"
                    for item in detail
                    if isinstance(item, dict) and item.get("msg")
                ]
                message = "; ".join(mensagens) or "dados invalidos"
                code = None
            else:
                message, code = "a plataforma recusou a operacao", None
            raise PlatformApiError(message, response.status_code, code)
        return payload if isinstance(payload, dict) else {}

    async def link_discord_account(
        self,
        *,
        code: str,
        discord_user_id: int,
        discord_name: str,
    ) -> dict[str, Any]:
        return await self._request(
            "POST",
            "/interno/discord/vincular",
            json={
                "codigo": code,
                "discord_user_id": str(discord_user_id),
                "discord_nome": discord_name,
            },
        )

    async def link_campaign(
        self,
        *,
        campaign_id: str,
        discord_guild_id: int,
        requested_by_discord_user_id: int,
    ) -> dict[str, Any]:
        return await self._request(
            "POST",
            "/interno/discord/campanhas/vincular",
            json={
                "campanha_id": campaign_id,
                "discord_guild_id": str(discord_guild_id),
                "solicitado_por_discord_user_id": str(requested_by_discord_user_id),
            },
        )

    async def user_context(self, discord_user_id: int) -> dict[str, Any]:
        return await self._request(
            "GET",
            f"/interno/discord/usuarios/{discord_user_id}/contexto",
        )

    async def _request_retrying_transport_errors(self, method: str, path: str, **kwargs) -> dict[str, Any]:
        """Duas tentativas, mas só retenta erro de transporte (timeout,
        conexão): um `status_code` presente significa que a plataforma
        respondeu de verdade (2xx, 4xx, 5xx) e insistir não muda o resultado.
        Seguro porque toda escrita do cofre é idempotente por chave."""
        last_error: PlatformApiError | None = None
        for attempt in range(2):
            try:
                return await self._request(method, path, **kwargs)
            except PlatformApiError as exc:
                last_error = exc
                if exc.status_code is not None or attempt == 1:
                    raise
        raise last_error or PlatformApiError("nao consegui completar a operacao")

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
        return await self._request_retrying_transport_errors(
            "POST", "/interno/discord/cofre/depositar", json=payload
        )

    async def get_vault(self, *, discord_guild_id: int, discord_user_id: int) -> dict[str, Any]:
        """Leitura do cofre unificado (itens, moedas, capacidade, reservas)."""
        return await self._request(
            "GET", f"/interno/discord/cofre/{discord_guild_id}/{discord_user_id}"
        )

    async def withdraw_vault(
        self,
        *,
        discord_user_id: int,
        discord_guild_id: int,
        idempotency_key: str,
        reason: str,
        items: list[dict[str, Any]],
    ) -> dict[str, Any]:
        """Retira item(ns) do cofre: venda, o mestre tirando algo, etc."""
        payload = {
            "discord_user_id": str(discord_user_id),
            "discord_guild_id": str(discord_guild_id),
            "idempotencia": idempotency_key,
            "motivo": reason,
            "itens": items,
        }
        return await self._request_retrying_transport_errors(
            "POST", "/interno/discord/cofre/retirar", json=payload
        )

    async def transfer_vault(
        self,
        *,
        discord_guild_id: int,
        idempotency_key: str,
        reason: str,
        moves: list[dict[str, Any]],
        respect_capacity: bool = True,
    ) -> dict[str, Any]:
        """Move item(ns) entre cofres numa única transação: /oferecer é um
        `move`, /trocar são dois espelhados. Nunca compor retirar+depositar
        no lado do bot: duas chamadas HTTP não são atômicas."""
        payload = {
            "discord_guild_id": str(discord_guild_id),
            "idempotencia": idempotency_key,
            "motivo": reason,
            "movimentos": moves,
            "respeitar_capacidade": respect_capacity,
        }
        return await self._request_retrying_transport_errors(
            "POST", "/interno/discord/cofre/transferir", json=payload
        )

    async def reserve_vault(
        self,
        *,
        discord_user_id: int,
        discord_guild_id: int,
        origin: str,
        reference: str,
        item_id: str,
        quantity: int,
        reason: str,
        expires_at: str,
    ) -> dict[str, Any]:
        """Escrow de leilão: retira o item do cofre e o mantém retido até
        `expires_at`. `reference` é a própria chave de idempotência."""
        payload = {
            "discord_user_id": str(discord_user_id),
            "discord_guild_id": str(discord_guild_id),
            "origem": origin,
            "referencia": reference,
            "item_id": item_id,
            "quantidade": quantity,
            "motivo": reason,
            "expira_em": expires_at,
        }
        return await self._request_retrying_transport_errors(
            "POST", "/interno/discord/cofre/reservas", json=payload
        )

    async def resolve_vault_reservation(
        self,
        *,
        discord_guild_id: int,
        origin: str,
        reference: str,
        destination_discord_user_id: int | None = None,
    ) -> dict[str, Any]:
        """Entrega ao vencedor (`destination_discord_user_id` informado) ou
        devolve ao dono original (omitido)."""
        payload = {
            "discord_guild_id": str(discord_guild_id),
            "origem": origin,
            "referencia": reference,
            "destino_discord_user_id": (
                str(destination_discord_user_id) if destination_discord_user_id is not None else None
            ),
        }
        return await self._request_retrying_transport_errors(
            "POST", "/interno/discord/cofre/reservas/resolver", json=payload
        )

    async def list_pending_vault_reservations(
        self, *, discord_guild_id: int, expired_only: bool = False
    ) -> dict[str, Any]:
        return await self._request(
            "GET",
            "/interno/discord/cofre/reservas/pendentes",
            params={"discord_guild_id": str(discord_guild_id), "vencidas": expired_only},
        )
