from __future__ import annotations

import hashlib
import json
import math
import unicodedata
from dataclasses import dataclass
from typing import Any, Mapping
from uuid import UUID, uuid4

from fastapi import HTTPException, status
from psycopg.types.json import Jsonb


MAX_ECONOMY_AMOUNT = 9_000_000_000


@dataclass(frozen=True)
class CatalogPrice:
    moeda: str
    valor: int


@dataclass(frozen=True)
class EconomyCommand:
    id: UUID
    replay_result: dict[str, Any] | None = None


def normalize_currency(value: str) -> str:
    """Normaliza uma moeda apenas para comparação, sem alterar o nome exibido."""

    return " ".join(str(value).strip().casefold().split())


def normalize_catalog_filter(value: object) -> str:
    text = unicodedata.normalize("NFKD", str(value).strip().casefold())
    without_marks = "".join(char for char in text if not unicodedata.combining(char))
    return " ".join(without_marks.split())


def _positive_integer(value: object) -> int | None:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    if isinstance(value, float) and (not math.isfinite(value) or not value.is_integer()):
        return None
    integer = int(value)
    if integer <= 0 or integer > MAX_ECONOMY_AMOUNT:
        return None
    return integer


def resolve_catalog_price(content: Mapping[str, Any] | None) -> CatalogPrice | None:
    """Resolve o preço autoritativo do catálogo.

    Um número usa ``Solares``. Um objeto precisa declarar exatamente uma moeda
    não vazia com valor inteiro positivo; preços ambíguos ou truncáveis são
    rejeitados em vez de serem interpretados pelo cliente.
    """

    if not isinstance(content, Mapping):
        return None
    raw_price = content.get("preco")
    numeric_price = _positive_integer(raw_price)
    if numeric_price is not None:
        return CatalogPrice(moeda="Solares", valor=numeric_price)
    if not isinstance(raw_price, Mapping) or len(raw_price) != 1:
        return None
    raw_currency, raw_value = next(iter(raw_price.items()))
    currency = " ".join(str(raw_currency).strip().split())
    value = _positive_integer(raw_value)
    if not currency or len(currency) > 40 or value is None:
        return None
    return CatalogPrice(moeda=currency, valor=value)


def resale_value(price: CatalogPrice) -> CatalogPrice:
    """Política autoritativa de recompra: 50%, arredondada para baixo."""

    return CatalogPrice(moeda=price.moeda, valor=max(1, price.valor // 2))


def command_fingerprint(payload: object) -> str:
    if hasattr(payload, "model_dump"):
        payload = payload.model_dump(mode="json", exclude={"idempotencia"})
    encoded = json.dumps(
        payload,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    ).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


def get_economy_command_replay(
    connection,
    *,
    campaign_id: UUID,
    user_id: UUID,
    command_type: str,
    idempotency_key: str,
    fingerprint: str,
) -> EconomyCommand | None:
    """Consulta um replay concluído sem adquirir lock de escrita.

    A leitura antecipada permite devolver a resposta original mesmo se o
    personagem tiver sido arquivado depois. Se não existir linha visível, o
    chamador ainda deve adquirir o lock do personagem e usar
    :func:`begin_economy_command`; isso fecha a corrida com outra requisição.
    """

    existing = connection.execute(
        """
        SELECT id, requisicao_hash, resultado
        FROM comandos_economia
        WHERE campanha_id=%s AND usuario_id=%s AND tipo=%s AND idempotencia=%s
        """,
        (campaign_id, user_id, command_type, idempotency_key),
    ).fetchone()
    if not existing:
        return None
    if existing["requisicao_hash"] != fingerprint:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="a chave de idempotencia ja foi usada com outro comando",
        )
    if existing["resultado"] is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="o comando com esta chave ainda esta em processamento",
        )
    replay = dict(existing["resultado"])
    replay["repetida"] = True
    return EconomyCommand(id=existing["id"], replay_result=replay)


def begin_economy_command(
    connection,
    *,
    campaign_id: UUID,
    user_id: UUID,
    command_type: str,
    idempotency_key: str,
    fingerprint: str,
) -> EconomyCommand:
    """Reserva a chave idempotente dentro da transação corrente.

    ``ON CONFLICT DO NOTHING`` também serializa duas inserções concorrentes da
    mesma chave no PostgreSQL. Depois que a primeira transação conclui, a
    segunda lê e devolve exatamente o resultado persistido.
    """

    command_id = uuid4()
    inserted = connection.execute(
        """
        INSERT INTO comandos_economia
            (id, campanha_id, usuario_id, tipo, idempotencia, requisicao_hash)
        VALUES (%s, %s, %s, %s, %s, %s)
        ON CONFLICT (campanha_id, usuario_id, tipo, idempotencia) DO NOTHING
        RETURNING id
        """,
        (
            command_id,
            campaign_id,
            user_id,
            command_type,
            idempotency_key,
            fingerprint,
        ),
    ).fetchone()
    if inserted:
        return EconomyCommand(id=inserted["id"])

    existing = connection.execute(
        """
        SELECT id, requisicao_hash, resultado
        FROM comandos_economia
        WHERE campanha_id=%s AND usuario_id=%s AND tipo=%s AND idempotencia=%s
        FOR UPDATE
        """,
        (campaign_id, user_id, command_type, idempotency_key),
    ).fetchone()
    if not existing:
        # Só seria possível com corrupção ou isolamento incompatível.
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="nao foi possivel confirmar a chave de idempotencia",
        )
    if existing["requisicao_hash"] != fingerprint:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="a chave de idempotencia ja foi usada com outro comando",
        )
    if existing["resultado"] is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="o comando com esta chave ainda esta em processamento",
        )
    replay = dict(existing["resultado"])
    replay["repetida"] = True
    return EconomyCommand(id=existing["id"], replay_result=replay)


def complete_economy_command(connection, command_id: UUID, result: dict[str, Any]) -> None:
    updated = connection.execute(
        """
        UPDATE comandos_economia
        SET resultado=%s, concluido_em=CURRENT_TIMESTAMP
        WHERE id=%s AND resultado IS NULL
        """,
        (Jsonb(result), command_id),
    )
    if updated.rowcount != 1:
        raise RuntimeError("comando economico nao reservado ou ja concluido")
