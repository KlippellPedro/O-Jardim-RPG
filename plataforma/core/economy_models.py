from __future__ import annotations

import json
import re
from typing import Annotated, Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


_MANUAL_ITEM_ID = re.compile(
    r"^manual:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$"
)


class _StrictOperation(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)


class _ItemOperation(_StrictOperation):
    item_id: str = Field(min_length=1, max_length=160)

    @field_validator("item_id")
    @classmethod
    def clean_item_id(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("item_id nao pode ser vazio")
        return cleaned


class CreateManualItemOperation(_ItemOperation):
    tipo: Literal["criar_manual"]
    titulo: str = Field(min_length=1, max_length=200)
    quantidade: int = Field(default=1, ge=1, le=1_000_000)
    dados: dict[str, Any] = Field(default_factory=dict)

    @field_validator("titulo")
    @classmethod
    def clean_title(cls, value: str) -> str:
        cleaned = " ".join(value.strip().split())
        if not cleaned:
            raise ValueError("titulo nao pode ser vazio")
        return cleaned

    @model_validator(mode="after")
    def validate_manual_id(self):
        if not _MANUAL_ITEM_ID.fullmatch(self.item_id):
            raise ValueError("item manual deve usar item_id manual:<UUID canonico>")
        # A regex garante o formato; UUID confirma variante/versao e rejeita
        # representacoes que parecam UUID sem realmente serem uma.
        if str(UUID(self.item_id.removeprefix("manual:"))) != self.item_id.removeprefix(
            "manual:"
        ):
            raise ValueError("UUID do item manual nao e canonico")
        return self


class EditInventoryItemOperation(_ItemOperation):
    tipo: Literal["editar_item"]
    titulo: str | None = Field(default=None, min_length=1, max_length=200)
    dados: dict[str, Any] | None = None

    @field_validator("titulo")
    @classmethod
    def clean_optional_title(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = " ".join(value.strip().split())
        if not cleaned:
            raise ValueError("titulo nao pode ser vazio")
        return cleaned

    @model_validator(mode="after")
    def require_change(self):
        if self.titulo is None and self.dados is None:
            raise ValueError("editar exige titulo ou dados")
        return self


class AdjustInventoryQuantityOperation(_ItemOperation):
    tipo: Literal["ajustar_quantidade"]
    delta: int = Field(ge=-1_000_000, le=1_000_000)

    @field_validator("delta")
    @classmethod
    def reject_zero(cls, value: int) -> int:
        if value == 0:
            raise ValueError("delta nao pode ser zero")
        return value


class DiscardInventoryItemOperation(_ItemOperation):
    tipo: Literal["descartar_item"]


class ReorderInventoryOperation(_StrictOperation):
    tipo: Literal["reordenar"]
    item_ids: list[str] = Field(min_length=1, max_length=500)

    @field_validator("item_ids")
    @classmethod
    def validate_item_ids(cls, values: list[str]) -> list[str]:
        cleaned = [value.strip() for value in values]
        if any(not value or len(value) > 160 for value in cleaned):
            raise ValueError("reordenar contem item_id invalido")
        if len(cleaned) != len(set(cleaned)):
            raise ValueError("reordenar contem item_id duplicado")
        return cleaned


class AdjustWalletBalanceOperation(_StrictOperation):
    tipo: Literal["ajustar_saldo"]
    moeda: str = Field(min_length=1, max_length=40)
    delta: int = Field(ge=-9_000_000_000, le=9_000_000_000)
    motivo: str = Field(min_length=2, max_length=500)

    @field_validator("moeda")
    @classmethod
    def clean_currency(cls, value: str) -> str:
        cleaned = " ".join(value.strip().split())
        if not cleaned:
            raise ValueError("moeda nao pode ser vazia")
        return cleaned

    @field_validator("motivo")
    @classmethod
    def clean_reason(cls, value: str) -> str:
        cleaned = " ".join(value.strip().split())
        if len(cleaned) < 2:
            raise ValueError("motivo deve ter ao menos dois caracteres")
        return cleaned

    @field_validator("delta")
    @classmethod
    def reject_zero(cls, value: int) -> int:
        if value == 0:
            raise ValueError("delta nao pode ser zero")
        return value


EconomyOperation = Annotated[
    CreateManualItemOperation
    | EditInventoryItemOperation
    | AdjustInventoryQuantityOperation
    | DiscardInventoryItemOperation
    | ReorderInventoryOperation
    | AdjustWalletBalanceOperation,
    Field(discriminator="tipo"),
]


class EconomyOperationsInput(_StrictOperation):
    versao_esperada: int = Field(ge=1)
    operacoes: list[EconomyOperation] = Field(min_length=1, max_length=500)

    @model_validator(mode="after")
    def limit_payload_size(self):
        try:
            encoded = json.dumps(
                self.model_dump(mode="python"),
                ensure_ascii=False,
                allow_nan=False,
                separators=(",", ":"),
            )
        except (TypeError, ValueError) as error:
            raise ValueError("as operacoes contem dados que nao sao JSON valido") from error
        if len(encoded.encode("utf-8")) > 1_000_000:
            raise ValueError("as operacoes economicas excedem o limite de 1 MB")
        return self


def is_manual_item_id(item_id: str) -> bool:
    return bool(_MANUAL_ITEM_ID.fullmatch(item_id))
