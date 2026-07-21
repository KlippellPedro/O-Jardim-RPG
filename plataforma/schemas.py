from __future__ import annotations

import json
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator


CampaignRole = Literal["mestre", "assistente", "jogador", "observador"]
InviteRole = Literal["assistente", "jogador", "observador"]
AccessLevel = Literal["oculto", "rumor", "parcial", "completo"]
PlatformRole = Literal["player", "mestre", "admin", "criador"]
AssignablePlatformRole = Literal["player", "mestre", "admin"]


class RegisterInput(BaseModel):
    email: EmailStr
    nome_exibicao: str = Field(min_length=2, max_length=80)
    senha: str = Field(min_length=12, max_length=128)
    # Obrigatório quando CADASTRO=convite; a conta já entra na campanha do
    # código usado, então quem convidou não precisa de um segundo passo.
    convite: str | None = Field(default=None, max_length=120)

    @field_validator("nome_exibicao")
    @classmethod
    def clean_name(cls, value: str) -> str:
        return " ".join(value.strip().split())


class LoginInput(BaseModel):
    email: EmailStr
    senha: str = Field(min_length=1, max_length=128)


class ServiceAccountPasswordInput(BaseModel):
    """Socorro pela chave de serviço, quando o banco só aceita conexão interna."""

    email: EmailStr


class PasswordHelpInput(BaseModel):
    """Pedido público de ajuda com a senha. Só o e-mail — nada mais é confiável."""

    email: EmailStr


class PasswordChangeInput(BaseModel):
    senha_atual: str = Field(min_length=1, max_length=128)
    nova_senha: str = Field(min_length=12, max_length=128)

    @model_validator(mode="after")
    def require_different_password(self):
        if self.senha_atual == self.nova_senha:
            raise ValueError("a nova senha precisa ser diferente da atual")
        return self


class CampaignCreateInput(BaseModel):
    nome: str = Field(min_length=2, max_length=100)
    descricao: str = Field(default="", max_length=2000)

    @field_validator("nome")
    @classmethod
    def clean_name(cls, value: str) -> str:
        return " ".join(value.strip().split())


class CampaignUpdateInput(BaseModel):
    nome: str | None = Field(default=None, min_length=2, max_length=100)
    descricao: str | None = Field(default=None, max_length=2000)

    @field_validator("nome")
    @classmethod
    def clean_optional_name(cls, value: str | None) -> str | None:
        return " ".join(value.strip().split()) if value is not None else None

    @model_validator(mode="after")
    def require_change(self):
        if not self.model_fields_set:
            raise ValueError("informe ao menos uma alteracao")
        if self.descricao is not None:
            self.descricao = self.descricao.strip()
        return self


class AdminUserUpdateInput(BaseModel):
    nome_exibicao: str | None = Field(default=None, min_length=2, max_length=80)
    papel_plataforma: AssignablePlatformRole | None = None
    ativo: bool | None = None

    @field_validator("nome_exibicao")
    @classmethod
    def clean_optional_display_name(cls, value: str | None) -> str | None:
        return " ".join(value.strip().split()) if value is not None else None

    @model_validator(mode="after")
    def require_admin_change(self):
        if not self.model_fields_set:
            raise ValueError("informe ao menos uma alteracao")
        return self


class CampaignInviteInput(BaseModel):
    papel: InviteRole = "jogador"
    expira_em_dias: int = Field(default=7, ge=1, le=30)
    max_usos: int = Field(default=1, ge=1, le=100)


class JoinCampaignInput(BaseModel):
    codigo: str = Field(min_length=6, max_length=32)


class MemberRoleInput(BaseModel):
    papel: CampaignRole


class CampaignOwnerInput(BaseModel):
    novo_dono_id: UUID


class ActiveCharacterInput(BaseModel):
    personagem_id: UUID


class CharacterCreateInput(BaseModel):
    campanha_id: UUID
    nome: str = Field(min_length=1, max_length=120)
    dono_usuario_id: UUID | None = None
    ficha: dict[str, Any] = Field(default_factory=dict)

    @field_validator("nome")
    @classmethod
    def clean_name(cls, value: str) -> str:
        return " ".join(value.strip().split())

    @model_validator(mode="after")
    def validate_sheet_size(self):
        encoded = json.dumps(self.ficha, ensure_ascii=False, separators=(",", ":"))
        if len(encoded.encode("utf-8")) > 1_000_000:
            raise ValueError("a ficha excede o limite de 1 MB")
        return self


class CharacterUpdateInput(BaseModel):
    versao_esperada: int = Field(ge=1)
    nome: str | None = Field(default=None, min_length=1, max_length=120)
    ficha: dict[str, Any]

    @model_validator(mode="after")
    def validate_payload(self):
        if self.nome is not None:
            self.nome = " ".join(self.nome.strip().split())
        encoded = json.dumps(self.ficha, ensure_ascii=False, separators=(",", ":"))
        if len(encoded.encode("utf-8")) > 1_000_000:
            raise ValueError("a ficha excede o limite de 1 MB")
        return self


class KnowledgeCreateInput(BaseModel):
    campanha_id: UUID
    tipo: str = Field(min_length=1, max_length=60, pattern=r"^[a-z0-9_-]+$")
    chave_recurso: str = Field(min_length=1, max_length=160)
    titulo: str = Field(min_length=1, max_length=160)
    resumo_rumor: str = Field(default="", max_length=2000)
    dados_parciais: dict[str, Any] = Field(default_factory=dict)
    dados_completos: dict[str, Any] = Field(default_factory=dict)
    acesso_padrao: AccessLevel = "oculto"


class KnowledgeGrantInput(BaseModel):
    destinatario_tipo: Literal["usuario", "personagem", "papel"]
    destinatario_id: str = Field(min_length=1, max_length=160)
    acesso: Literal["rumor", "parcial", "completo"]


class DiscordLinkConsumeInput(BaseModel):
    codigo: str = Field(min_length=6, max_length=32)
    discord_user_id: str = Field(min_length=5, max_length=30, pattern=r"^[0-9]+$")
    discord_nome: str | None = Field(default=None, max_length=100)


class CampaignDiscordLinkInput(BaseModel):
    campanha_id: UUID
    discord_guild_id: str = Field(min_length=5, max_length=30, pattern=r"^[0-9]+$")
    solicitado_por_discord_user_id: str = Field(
        min_length=5,
        max_length=30,
        pattern=r"^[0-9]+$",
    )


class WalletTransactionInput(BaseModel):
    campanha_id: UUID
    personagem_id: UUID
    moeda: str = Field(min_length=1, max_length=40)
    delta: int = Field(ge=-9_000_000_000, le=9_000_000_000)
    motivo: str = Field(min_length=2, max_length=500)
    idempotencia: str = Field(min_length=8, max_length=160)
    permitir_negativo: bool = False

    @field_validator("moeda")
    @classmethod
    def clean_currency(cls, value: str) -> str:
        return " ".join(value.strip().split())


class InventoryTransactionInput(BaseModel):
    campanha_id: UUID
    personagem_id: UUID
    item_id: str = Field(min_length=1, max_length=160)
    titulo: str = Field(min_length=1, max_length=200)
    delta: int = Field(ge=-1_000_000, le=1_000_000)
    motivo: str = Field(min_length=2, max_length=500)
    idempotencia: str = Field(min_length=8, max_length=160)
    dados: dict[str, Any] = Field(default_factory=dict)


class EconomyWalletItem(BaseModel):
    moeda: str = Field(min_length=1, max_length=40)
    saldo: int = Field(ge=-9_000_000_000, le=9_000_000_000)
    simbolo: str | None = Field(default=None, max_length=4)


class EconomyInventoryItem(BaseModel):
    item_id: str = Field(min_length=1, max_length=160)
    titulo: str = Field(min_length=1, max_length=200)
    quantidade: int = Field(ge=1, le=1_000_000)
    dados: dict[str, Any] = Field(default_factory=dict)


class EconomyReplaceInput(BaseModel):
    versao_esperada: int = Field(ge=1)
    carteira: list[EconomyWalletItem] = Field(default_factory=list, max_length=50)
    inventario: list[EconomyInventoryItem] = Field(default_factory=list, max_length=500)

    @model_validator(mode="after")
    def validate_unique_entries(self):
        currencies = [item.moeda.strip().casefold() for item in self.carteira]
        if len(currencies) != len(set(currencies)):
            raise ValueError("a carteira contem moedas duplicadas")
        item_ids = [item.item_id.strip() for item in self.inventario]
        if len(item_ids) != len(set(item_ids)):
            raise ValueError("o inventario contem itens duplicados")
        encoded = json.dumps(self.model_dump(), ensure_ascii=False, separators=(",", ":"))
        if len(encoded.encode("utf-8")) > 1_000_000:
            raise ValueError("a economia da ficha excede o limite de 1 MB")
        return self


class VaultTransferItemInput(BaseModel):
    campanha_id: UUID
    personagem_id: UUID
    item_id: str = Field(min_length=1, max_length=160)
    quantidade: int = Field(default=1, ge=1, le=1_000_000)


class VaultTransferCurrencyInput(BaseModel):
    campanha_id: UUID
    personagem_id: UUID
    moeda: str = Field(min_length=1, max_length=40)
    quantidade: int = Field(ge=1, le=9_000_000_000)


class VaultDepositItem(BaseModel):
    item_id: str = Field(min_length=1, max_length=160)
    titulo: str = Field(min_length=1, max_length=200)
    quantidade: int = Field(default=1, ge=1, le=1_000_000)
    dados: dict[str, Any] = Field(default_factory=dict)


class VaultDepositCurrency(BaseModel):
    moeda: str = Field(min_length=1, max_length=40)
    quantidade: int = Field(ge=1, le=9_000_000_000)


class DiscordVaultDepositInput(BaseModel):
    discord_user_id: str = Field(min_length=5, max_length=30, pattern=r"^[0-9]+$")
    discord_guild_id: str = Field(min_length=5, max_length=30, pattern=r"^[0-9]+$")
    idempotencia: str = Field(min_length=8, max_length=160)
    motivo: str = Field(min_length=2, max_length=500)
    itens: list[VaultDepositItem] = Field(default_factory=list, max_length=50)
    moedas: list[VaultDepositCurrency] = Field(default_factory=list, max_length=20)

    @model_validator(mode="after")
    def require_reward(self):
        if not self.itens and not self.moedas:
            raise ValueError("informe ao menos um item ou moeda")
        return self


class SessionOpenInput(BaseModel):
    campanha_id: UUID
    titulo: str = Field(default="", max_length=120)
    incluir_personagens: bool = True


class ParticipantCreateInput(BaseModel):
    nome: str = Field(min_length=1, max_length=80)
    tipo: Literal["jogador", "aliado", "inimigo"] = "inimigo"
    iniciativa: int = Field(default=0, ge=-99, le=999)
    vida_maxima: int = Field(default=0, ge=0, le=99_999)
    visivel: bool = True
    vida_visivel: bool = False

    @field_validator("nome")
    @classmethod
    def clean_name(cls, value: str) -> str:
        return " ".join(value.strip().split())


class ParticipantUpdateInput(BaseModel):
    """Tudo opcional: a tela manda só o que mudou naquele clique."""

    nome: str | None = Field(default=None, min_length=1, max_length=80)
    iniciativa: int | None = Field(default=None, ge=-99, le=999)
    vida_atual: int | None = Field(default=None, ge=-999, le=99_999)
    vida_maxima: int | None = Field(default=None, ge=0, le=99_999)
    dano: int | None = Field(default=None, ge=0, le=99_999)
    cura: int | None = Field(default=None, ge=0, le=99_999)
    condicoes: list[str] | None = Field(default=None, max_length=20)
    anotacao: str | None = Field(default=None, max_length=500)
    visivel: bool | None = None
    vida_visivel: bool | None = None

    @field_validator("condicoes")
    @classmethod
    def clean_conditions(cls, value: list[str] | None) -> list[str] | None:
        if value is None:
            return None
        limpas: list[str] = []
        for item in value:
            texto = " ".join(str(item).strip().split())[:40]
            if texto and texto not in limpas:
                limpas.append(texto)
        return limpas

    @model_validator(mode="after")
    def require_change(self):
        if not self.model_fields_set:
            raise ValueError("informe ao menos uma alteracao")
        return self


class SessionTurnInput(BaseModel):
    acao: Literal["iniciar", "proximo", "anterior", "ordenar", "encerrar"]


class RollInput(BaseModel):
    """Pedido de rolagem. O resultado é sorteado no servidor, não aqui."""

    campanha_id: UUID
    personagem_id: UUID | None = None
    titulo: str = Field(min_length=1, max_length=120)
    bonus: int = Field(default=0, ge=-99, le=99)
    vantagens: int = Field(default=0, ge=0, le=9)
    desvantagens: int = Field(default=0, ge=0, le=9)
    dt: int | None = Field(default=None, ge=1, le=60)
    # Preenchido para dano/cura; quando presente, ignora o teste de d20.
    formula: str | None = Field(default=None, max_length=20)
    origem: dict[str, Any] = Field(default_factory=dict)

    @field_validator("titulo")
    @classmethod
    def clean_title(cls, value: str) -> str:
        return " ".join(value.strip().split())

    @model_validator(mode="after")
    def validate_origin_size(self):
        if len(json.dumps(self.origem, ensure_ascii=False)) > 2000:
            raise ValueError("origem da rolagem excede o limite")
        return self


class UsageInput(BaseModel):
    """Registro de "usei tal poder" — o log que prova o que aconteceu."""

    campanha_id: UUID
    personagem_id: UUID | None = None
    tipo: Literal["poder", "habilidade", "magia", "item", "anotacao"]
    titulo: str = Field(min_length=1, max_length=120)
    detalhes: dict[str, Any] = Field(default_factory=dict)

    @field_validator("titulo")
    @classmethod
    def clean_title(cls, value: str) -> str:
        return " ".join(value.strip().split())

    @model_validator(mode="after")
    def validate_details_size(self):
        if len(json.dumps(self.detalhes, ensure_ascii=False)) > 2000:
            raise ValueError("detalhes do registro excedem o limite")
        return self


class NotificationReadInput(BaseModel):
    """Sem `ids` significa "marcar tudo como lido"."""

    ids: list[UUID] = Field(default_factory=list, max_length=200)


class ContentAccessInput(BaseModel):
    acesso_padrao: AccessLevel


class ContentPublishInput(BaseModel):
    campanha_id: UUID
    modulo: Literal["loja", "mundo", "regras"]
    chaves: list[str] = Field(min_length=1, max_length=300)
    acesso_padrao: AccessLevel = "completo"

    @field_validator("chaves")
    @classmethod
    def clean_keys(cls, values: list[str]) -> list[str]:
        cleaned = []
        for value in values:
            key = str(value).strip()[:180]
            if key and key not in cleaned:
                cleaned.append(key)
        if not cleaned:
            raise ValueError("nenhuma chave valida")
        return cleaned
