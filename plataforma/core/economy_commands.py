from __future__ import annotations

import hashlib
import json
import math
import re
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


def resolve_catalog_price(content: Mapping[str, Any] | None, field: str = "preco") -> CatalogPrice | None:
    """Resolve um preço autoritativo do catálogo.

    Um número usa ``Solares``. Um objeto precisa declarar exatamente uma moeda
    não vazia com valor inteiro positivo; preços ambíguos ou truncáveis são
    rejeitados em vez de serem interpretados pelo cliente.

    ``field`` deixa resolver preços alternativos declarados no mesmo formato,
    como ``preco_contratacao``/``contrato_mensal`` dos Mercenários - ver
    ``_mercenary_ally_from_catalog_item`` em routers/shop.py.
    """

    if not isinstance(content, Mapping):
        return None
    raw_price = content.get(field)
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


EQUIPMENT_PURCHASE_RARITIES = ("comum", "incomum", "raro", "epico", "lendario")

_EQUIPMENT_RARITY_PRICE_MULTIPLIERS = {
    "comum": 1,
    "incomum": 3,
    "raro": 8,
    "epico": 20,
    "lendario": 60,
}

_WEAPON_RARITY_DAMAGE_DIE = {
    "incomum": "1d4",
    "raro": "1d6",
    "epico": "1d8",
    "lendario": "1d10",
}

_ARMOR_RARITY_RESISTANCES = {
    "incomum": {"Corte": 1},
    "raro": {"Corte": 2, "Perfuração": 2},
    "epico": {"Corte": 3, "Perfuração": 3, "Impacto": 3},
    "lendario": {"Corte": 5, "Perfuração": 5, "Impacto": 5, "Balístico": 5},
}


def normalize_equipment_rarity(value: object) -> str | None:
    normalized = normalize_catalog_filter(value)
    aliases = {
        "mitica": "mitico",
        "reliquia da criacao": "reliquia da criacao",
    }
    normalized = aliases.get(normalized, normalized)
    allowed = {*EQUIPMENT_PURCHASE_RARITIES, "mitico", "reliquia", "reliquia da criacao"}
    return normalized if normalized in allowed else None


def _numeric_stat(value: object, default: int = 0) -> int:
    match = re.search(r"[+-]?\d+", str(value or ""))
    return int(match.group(0)) if match else default


def _damage_average(value: object) -> float:
    text = str(value or "").strip().casefold()
    if text == "hit kill":
        return 100.0
    total = 0.0
    for amount, sides in re.findall(r"(\d*)d(\d+)", text):
        dice = int(amount or "1")
        total += dice * (int(sides) + 1) / 2
    for flat in re.findall(r"(?<![d\d])[+-]\d+", text):
        total += int(flat)
    return max(0.0, total)


def _round_to_five(value: float) -> int:
    return max(5, int((value + 2.5) // 5) * 5)


def _weapon_common_price(content: Mapping[str, Any]) -> int:
    subtype = normalize_catalog_filter(content.get("subtipo"))
    martial = subtype not in {"simples", "comum"}
    minimum, maximum = (50, 80) if martial else (15, 40)
    margin = _numeric_stat(content.get("margem_ameaca"), 20)
    multiplier = _numeric_stat(content.get("multiplicador_critico"), 2)
    score = (
        _damage_average(content.get("dano"))
        + max(0, 20 - margin) * 2
        + max(0, multiplier - 2) * 3
    )
    lower_reference, upper_reference = (5.0, 27.0) if martial else (3.0, 23.0)
    position = min(1.0, max(0.0, (score - lower_reference) / (upper_reference - lower_reference)))
    return min(maximum, max(minimum, _round_to_five(minimum + (maximum - minimum) * position)))


def _protection_common_price(content: Mapping[str, Any]) -> int:
    # A banda de preço segue simples/marcial, igual arma - a mesma separação
    # que arma usa pra simples x marcial. A curva de pontuação (o quanto o
    # bônus da peça pesa dentro da banda) ainda depende de ser escudo ou
    # armadura, porque escudo tem uma escala de bônus naturalmente menor.
    shield = normalize_catalog_filter(content.get("categoria_protecao")) == "escudo"
    subtipo = normalize_catalog_filter(content.get("subtipo"))
    martial = subtipo not in {"simples", "comum"}
    minimum, maximum = (50, 80) if martial else (15, 40)
    defense = max(0, _numeric_stat(content.get("defesa", content.get("bonus")), 0))
    description = normalize_catalog_filter(content.get("descricao"))
    resistance = max(
        (_numeric_stat(value) for value in re.findall(r"resistencia\s+(\d+)", description)),
        default=0,
    )
    score = defense + resistance
    lower_reference, upper_reference = (1.0, 12.0) if shield else (2.0, 14.0)
    position = min(1.0, max(0.0, (score - lower_reference) / (upper_reference - lower_reference)))
    return min(maximum, max(minimum, _round_to_five(minimum + (maximum - minimum) * position)))


def equipment_common_price(content: Mapping[str, Any], catalog_type: object) -> CatalogPrice | None:
    kind = normalize_catalog_filter(catalog_type)
    if kind == "arma":
        value = _weapon_common_price(content)
    elif kind == "armadura":
        value = _protection_common_price(content)
    else:
        return None
    return CatalogPrice(moeda="Lunaris", valor=value)


def equipment_variant_price(
    content: Mapping[str, Any],
    catalog_type: object,
    selected_rarity: object,
) -> CatalogPrice | None:
    """Calcula o preço da variante a partir do modelo e não da raridade antiga."""

    target = normalize_equipment_rarity(selected_rarity)
    if target not in EQUIPMENT_PURCHASE_RARITIES:
        return None
    common = equipment_common_price(content, catalog_type)
    if common is None:
        return None
    target_lunaris = common.valor * _EQUIPMENT_RARITY_PRICE_MULTIPLIERS[target]
    if target in {"epico", "lendario"}:
        return CatalogPrice(moeda="Solares", valor=max(1, (target_lunaris + 50) // 100))
    return CatalogPrice(moeda="Lunaris", valor=target_lunaris)


def _format_critical(margin: int, multiplier: int) -> str:
    threat = "20" if margin >= 20 else f"{margin}-20"
    return f"{threat}/x{multiplier}"


def _replace_weapon_attributes(attributes: object, damage: str, critical: str) -> list[Any]:
    result: list[Any] = []
    found_damage = False
    found_critical = False
    for attribute in attributes if isinstance(attributes, list) else []:
        text = str(attribute)
        normalized = normalize_catalog_filter(text)
        if " de dano" in normalized:
            result.append(f"{damage} de dano")
            found_damage = True
        elif normalized.startswith("critico"):
            result.append(f"Crítico {critical}")
            found_critical = True
        else:
            result.append(attribute)
    if not found_damage:
        result.append(f"{damage} de dano")
    if not found_critical:
        result.append(f"Crítico {critical}")
    return result


def equipment_variant_overrides(
    content: Mapping[str, Any],
    catalog_type: object,
    selected_rarity: object,
) -> dict[str, Any] | None:
    """Campos mecânicos que a raridade altera, usados pela API e inventário."""

    target = normalize_equipment_rarity(selected_rarity)
    if target not in EQUIPMENT_PURCHASE_RARITIES:
        return None
    tier = EQUIPMENT_PURCHASE_RARITIES.index(target)
    kind = normalize_catalog_filter(catalog_type)
    if kind == "arma":
        base_damage = str(content.get("dano") or "").strip()
        extra_die = _WEAPON_RARITY_DAMAGE_DIE.get(target)
        damage = base_damage
        if extra_die and base_damage and normalize_catalog_filter(base_damage) != "hit kill":
            damage = f"{base_damage}+{extra_die}"
        margin = max(15, _numeric_stat(content.get("margem_ameaca"), 20) - (tier // 2))
        multiplier = min(5, _numeric_stat(content.get("multiplicador_critico"), 2) + (1 if tier >= 3 else 0))
        critical = _format_critical(margin, multiplier)
        improvements = ["Ficha básica do modelo, sem bônus de raridade."]
        if extra_die:
            improvements = [f"+{extra_die} de dano pela raridade."]
            if tier >= 2:
                improvements.append(f"Margem de ameaça ampliada para {margin}-20.")
            if tier >= 3:
                improvements.append(f"Multiplicador crítico aumentado para x{multiplier}.")
        return {
            "raridade": target,
            "dano_base": base_damage,
            "dano_bonus_raridade": extra_die,
            "dano": damage,
            "margem_ameaca": margin,
            "multiplicador_critico": multiplier,
            "critico": critical,
            "atributos": _replace_weapon_attributes(content.get("atributos"), damage, critical),
            "melhorias_raridade": improvements,
        }
    if kind == "armadura":
        base_defense = _numeric_stat(content.get("defesa", content.get("bonus")), 0)
        defense = base_defense + tier
        base_penalty = min(0, _numeric_stat(content.get("penalidade"), 0))
        penalty = min(0, base_penalty + (tier // 2))
        resistances = dict(_ARMOR_RARITY_RESISTANCES.get(target, {}))
        improvements = ["Ficha básica do modelo, sem bônus de raridade."]
        if tier:
            improvements = [f"+{tier} de Defesa pela raridade."]
            if resistances:
                types = ", ".join(resistances)
                improvements.append(f"Resistência {max(resistances.values())} contra {types}.")
            if penalty != base_penalty:
                improvements.append(f"Penalidade de armadura reduzida para {penalty}.")
        return {
            "raridade": target,
            "defesa_base": base_defense,
            "bonus": f"{defense:+d}",
            "defesa": defense,
            "penalidade": str(penalty),
            "resistencias_por_tipo": resistances,
            "melhorias_raridade": improvements,
        }
    return None


def equipment_variant_content(
    content: Mapping[str, Any],
    catalog_type: object,
    selected_rarity: object,
) -> dict[str, Any] | None:
    overrides = equipment_variant_overrides(content, catalog_type, selected_rarity)
    return {**content, **overrides} if overrides is not None else None


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
