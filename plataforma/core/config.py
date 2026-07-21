from __future__ import annotations

import os
from dataclasses import dataclass
from uuid import UUID

from dotenv import load_dotenv


load_dotenv()


def _bool_env(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "sim", "on"}


def _int_env(name: str, default: int, minimum: int, maximum: int) -> int:
    raw = os.getenv(name)
    if raw is None:
        return default
    try:
        value = int(raw)
    except ValueError:
        return default
    return max(minimum, min(maximum, value))


def _csv_env(name: str) -> tuple[str, ...]:
    return tuple(
        item.strip()
        for item in (os.getenv(name) or "").split(",")
        if item.strip()
    )


# Quem pode criar conta:
#   aberto   — qualquer pessoa. Só para desenvolvimento.
#   convite  — precisa de um código de convite de campanha válido. Padrão em
#              produção: sem confirmação de e-mail, cadastro livre num site
#              público é convite para conta de spam.
#   fechado  — ninguém se cadastra sozinho; um administrador cria as contas.
_CADASTRO_VALIDO = {"aberto", "convite", "fechado"}


@dataclass(frozen=True)
class Settings:
    environment: str
    database_url: str
    service_api_key: str | None
    session_cookie_name: str
    csrf_cookie_name: str
    session_days: int
    cookie_secure: bool
    allowed_origins: tuple[str, ...]
    trusted_hosts: tuple[str, ...]
    startup_timeout: int
    creator_user_id: UUID | None
    creator_email: str | None
    cadastro: str

    @property
    def production(self) -> bool:
        return self.environment == "production"

    @property
    def cadastro_exige_convite(self) -> bool:
        return self.cadastro == "convite"

    @property
    def cadastro_fechado(self) -> bool:
        return self.cadastro == "fechado"

    @property
    def has_creator_rule(self) -> bool:
        return bool(self.creator_user_id or self.creator_email)

    def validate(self) -> None:
        if not self.database_url:
            raise RuntimeError("DATABASE_URL nao definida")
        if self.cadastro not in _CADASTRO_VALIDO:
            raise RuntimeError(
                f"CADASTRO deve ser um de {', '.join(sorted(_CADASTRO_VALIDO))}"
            )
        if self.production and (
            not self.service_api_key or len(self.service_api_key) < 32
        ):
            raise RuntimeError(
                "SERVICE_API_KEY deve ter pelo menos 32 caracteres em producao"
            )


def load_settings() -> Settings:
    environment = (os.getenv("APP_ENV") or "development").strip().lower()
    creator_user_id = None
    raw_creator_user_id = (os.getenv("CREATOR_USER_ID") or "").strip()
    if raw_creator_user_id:
        try:
            creator_user_id = UUID(raw_creator_user_id)
        except ValueError as exc:
            raise RuntimeError("CREATOR_USER_ID deve ser um UUID valido") from exc
    return Settings(
        environment=environment,
        database_url=(os.getenv("DATABASE_URL") or "").strip(),
        service_api_key=(os.getenv("SERVICE_API_KEY") or "").strip() or None,
        session_cookie_name=(
            os.getenv("SESSION_COOKIE_NAME") or "oj_session"
        ).strip(),
        csrf_cookie_name=(os.getenv("CSRF_COOKIE_NAME") or "oj_csrf").strip(),
        session_days=_int_env("SESSION_DAYS", 7, 1, 30),
        cookie_secure=_bool_env("COOKIE_SECURE", environment == "production"),
        allowed_origins=_csv_env("ALLOWED_ORIGINS"),
        trusted_hosts=_csv_env("TRUSTED_HOSTS"),
        startup_timeout=_int_env("DATABASE_STARTUP_TIMEOUT", 15, 5, 60),
        creator_user_id=creator_user_id,
        creator_email=(os.getenv("CREATOR_EMAIL") or "").strip().lower() or None,
        # Produção fecha por padrão: esquecer de configurar não deve resultar
        # em cadastro aberto ao mundo.
        cadastro=(
            os.getenv("CADASTRO")
            or ("convite" if environment == "production" else "aberto")
        ).strip().lower(),
    )
