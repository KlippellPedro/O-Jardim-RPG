from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from uuid import UUID

from fastapi import Cookie, Depends, Header, HTTPException, Request, status

from .config import Settings
from .database import Database
from .security import constant_time_equal, hash_token


@dataclass(frozen=True)
class AuthenticatedUser:
    id: UUID
    email: str
    nome_exibicao: str
    admin_plataforma: bool
    papel_plataforma: str
    session_id: UUID
    csrf_hash: str
    senha_provisoria: bool = False

    @property
    def is_creator(self) -> bool:
        return self.papel_plataforma == "criador"

    @property
    def is_platform_admin(self) -> bool:
        return self.papel_plataforma in {"admin", "criador"}

    @property
    def can_create_campaign(self) -> bool:
        return self.papel_plataforma in {"mestre", "criador"}


@dataclass(frozen=True)
class CampaignAccess:
    campaign_id: UUID
    user_id: UUID
    role: str
    owner_id: UUID

    @property
    def manages_content(self) -> bool:
        return self.role in {"mestre", "assistente"}

    @property
    def is_master(self) -> bool:
        return self.role == "mestre"


def get_database(request: Request) -> Database:
    return request.app.state.database


def get_settings(request: Request) -> Settings:
    return request.app.state.settings


def get_current_user(
    request: Request,
    database: Database = Depends(get_database),
) -> AuthenticatedUser:
    settings: Settings = request.app.state.settings
    token = request.cookies.get(settings.session_cookie_name)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="nao autenticado")

    with database.connection() as connection:
        row = connection.execute(
            """
            SELECT s.id AS sessao_id, s.csrf_hash, s.expira_em,
                   u.id, u.email, u.nome_exibicao, u.admin_plataforma,
                   u.papel_plataforma, u.ativo, u.senha_provisoria
            FROM sessoes_auth s
            JOIN usuarios u ON u.id = s.usuario_id
            WHERE s.token_hash=%s AND s.revogada_em IS NULL
            """,
            (hash_token(token),),
        ).fetchone()
        if not row or not row["ativo"] or row["expira_em"] <= datetime.now(timezone.utc):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="sessao invalida")
        connection.execute(
            "UPDATE sessoes_auth SET ultimo_uso_em=CURRENT_TIMESTAMP WHERE id=%s",
            (row["sessao_id"],),
        )

    return AuthenticatedUser(
        id=row["id"],
        email=row["email"],
        nome_exibicao=row["nome_exibicao"],
        admin_plataforma=bool(row["admin_plataforma"]),
        papel_plataforma=row["papel_plataforma"],
        session_id=row["sessao_id"],
        csrf_hash=row["csrf_hash"],
        senha_provisoria=bool(row["senha_provisoria"]),
    )


def require_platform_admin(
    user: AuthenticatedUser = Depends(get_current_user),
) -> AuthenticatedUser:
    if not user.is_platform_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="permissao de administrador necessaria",
        )
    return user


def require_csrf(
    request: Request,
    user: AuthenticatedUser = Depends(get_current_user),
    csrf_header: str | None = Header(default=None, alias="X-CSRF-Token"),
) -> AuthenticatedUser:
    settings: Settings = request.app.state.settings
    csrf_cookie = request.cookies.get(settings.csrf_cookie_name)
    if (
        not csrf_header
        or not csrf_cookie
        or not constant_time_equal(csrf_header, csrf_cookie)
        or not constant_time_equal(hash_token(csrf_header), user.csrf_hash)
    ):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="CSRF invalido")
    return user


def require_service_key(
    request: Request,
    service_key: str | None = Header(default=None, alias="X-Service-Key"),
) -> str:
    settings: Settings = request.app.state.settings
    expected = settings.service_api_key
    if not expected:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="integracao interna nao configurada",
        )
    if not service_key or not constant_time_equal(service_key, expected):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="chave de servico invalida")
    return "discord-bots"


def campaign_access(
    connection,
    campaign_id: UUID,
    user_id: UUID,
) -> CampaignAccess:
    row = connection.execute(
        """
        SELECT c.id AS campanha_id, c.dono_id, c.status,
               u.papel_plataforma,
               m.usuario_id, m.papel, m.status AS membro_status
        FROM campanhas c
        JOIN usuarios u ON u.id=%s AND u.ativo=TRUE
        LEFT JOIN membros_campanha m
          ON m.campanha_id = c.id AND m.usuario_id=u.id
        WHERE c.id=%s AND c.status='ativa'
        """,
        (user_id, campaign_id),
    ).fetchone()
    if not row or (
        row["papel_plataforma"] != "criador"
        and (row["usuario_id"] is None or row["membro_status"] != "ativo")
    ):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="campanha nao encontrada")
    return CampaignAccess(
        campaign_id=row["campanha_id"],
        user_id=user_id,
        role="mestre" if row["papel_plataforma"] == "criador" else row["papel"],
        owner_id=row["dono_id"],
    )


def require_campaign_manager(connection, campaign_id: UUID, user_id: UUID) -> CampaignAccess:
    access = campaign_access(connection, campaign_id, user_id)
    if not access.manages_content:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="permissao de mestre necessaria")
    return access
