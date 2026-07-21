from __future__ import annotations

from datetime import datetime, timedelta, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from psycopg.errors import UniqueViolation

from core.audit import record_audit
from core.config import Settings
from core.database import Database
from core import limites
from core.dependencies import (
    AuthenticatedUser,
    get_current_user,
    get_database,
    get_settings,
    require_csrf,
)
from core.security import (
    hash_password,
    hash_token,
    new_secret_token,
    verify_password,
)
from core.notifications import campaign_member_ids, notify
from schemas import LoginInput, PasswordChangeInput, PasswordHelpInput, RegisterInput


router = APIRouter(prefix="/auth", tags=["autenticacao"])


def _client_fingerprint(request: Request) -> str:
    return limites.impressao_do_cliente(request)


def _login_limit_key(email: str, request: Request) -> str:
    return limites.chave(limites.LOGIN, email.lower(), _client_fingerprint(request))


def _validar_convite(connection, codigo: str | None):
    """Confere o código e devolve o convite, ou recusa o cadastro.

    Reaproveita a mesma checagem de `campanhas/entrar`: código não revogado,
    dentro da validade e com uso sobrando. A recusa é sempre igual — dizer
    "expirado" em vez de "inexistente" contaria se o código já existiu.
    """
    if not codigo or not codigo.strip():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="o cadastro exige um convite de campanha",
        )
    convite = connection.execute(
        """
        SELECT id, campanha_id, papel, max_usos, usos, expira_em, revogado_em
        FROM convites_campanha WHERE codigo_hash=%s FOR UPDATE
        """,
        (hash_token(codigo.strip()),),
    ).fetchone()
    agora = datetime.now(timezone.utc)
    if (
        not convite
        or convite["revogado_em"] is not None
        or convite["expira_em"] <= agora
        or convite["usos"] >= convite["max_usos"]
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="convite invalido ou expirado",
        )
    return convite


def _create_session(
    connection,
    *,
    user_id,
    request: Request,
    settings: Settings,
) -> tuple[str, str]:
    session_token = new_secret_token()
    csrf_token = new_secret_token(24)
    session_id = uuid4()
    connection.execute(
        """
        INSERT INTO sessoes_auth
            (id, usuario_id, token_hash, csrf_hash, ip_hash, user_agent, expira_em)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        """,
        (
            session_id,
            user_id,
            hash_token(session_token),
            hash_token(csrf_token),
            _client_fingerprint(request),
            request.headers.get("user-agent", "")[:500],
            datetime.now(timezone.utc) + timedelta(days=settings.session_days),
        ),
    )
    connection.execute(
        """
        DELETE FROM sessoes_auth
        WHERE usuario_id=%s AND id IN (
            SELECT id FROM sessoes_auth
            WHERE usuario_id=%s
            ORDER BY criado_em DESC
            OFFSET 10
        )
        """,
        (user_id, user_id),
    )
    return session_token, csrf_token


def _set_auth_cookies(
    response: Response,
    settings: Settings,
    session_token: str,
    csrf_token: str,
) -> None:
    max_age = settings.session_days * 24 * 60 * 60
    response.set_cookie(
        settings.session_cookie_name,
        session_token,
        max_age=max_age,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        path="/",
    )
    response.set_cookie(
        settings.csrf_cookie_name,
        csrf_token,
        max_age=max_age,
        httponly=False,
        secure=settings.cookie_secure,
        samesite="lax",
        path="/",
    )


@router.get("/cadastro")
def modo_de_cadastro(settings: Settings = Depends(get_settings)):
    """Diz à tela de entrada se ela deve pedir convite, ou nem oferecer conta.

    Só o modo sai daqui: nada de contagem de contas ou de nomes, que serviriam
    para medir o tamanho da mesa de fora.
    """
    return {"modo": settings.cadastro}


@router.post("/registrar", status_code=status.HTTP_201_CREATED)
def register(
    payload: RegisterInput,
    request: Request,
    response: Response,
    database: Database = Depends(get_database),
    settings: Settings = Depends(get_settings),
):
    email = str(payload.email).strip().lower()
    user_id = uuid4()
    # A conta configurada em CREATOR_EMAIL pode se cadastrar depois do boot da
    # API; sem isto ela ficaria como player até o próximo restart.
    is_creator = bool(settings.creator_email) and email == settings.creator_email
    role = "criador" if is_creator else "player"

    if settings.cadastro_fechado and not is_creator:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="o cadastro esta fechado; peca a um administrador",
        )

    # Conta a tentativa antes de qualquer validação: tentar códigos de convite
    # em sequência tem que custar caro, não sair de graça por ser recusado.
    limites.cobrar(database, limites.CADASTRO, limites.chave(limites.CADASTRO, _client_fingerprint(request)))

    convite = None
    try:
        with database.connection() as connection:
            # O criador entra sem convite: exigir um travaria o primeiro acesso,
            # já que ainda não existe campanha para convidar ninguém.
            if settings.cadastro_exige_convite and not is_creator:
                convite = _validar_convite(connection, payload.convite)
            if is_creator:
                connection.execute(
                    """
                    UPDATE usuarios
                    SET papel_plataforma='admin', admin_plataforma=TRUE,
                        atualizado_em=CURRENT_TIMESTAMP
                    WHERE papel_plataforma='criador'
                    """
                )
            connection.execute(
                """
                INSERT INTO usuarios
                    (id, email, nome_exibicao, senha_hash,
                     papel_plataforma, admin_plataforma)
                VALUES (%s, %s, %s, %s, %s, %s)
                """,
                (
                    user_id,
                    email,
                    payload.nome_exibicao,
                    hash_password(payload.senha),
                    role,
                    is_creator,
                ),
            )
            # Quem chegou por convite já entra na campanha: mandar a pessoa
            # digitar o mesmo código de novo, logo depois de cadastrar, seria
            # pedir duas vezes a mesma coisa.
            if convite is not None:
                connection.execute(
                    """
                    INSERT INTO membros_campanha (campanha_id, usuario_id, papel, status)
                    VALUES (%s, %s, %s, 'ativo')
                    """,
                    (convite["campanha_id"], user_id, convite["papel"]),
                )
                connection.execute(
                    "UPDATE convites_campanha SET usos=usos+1 WHERE id=%s",
                    (convite["id"],),
                )

            session_token, csrf_token = _create_session(
                connection,
                user_id=user_id,
                request=request,
                settings=settings,
            )
            record_audit(
                connection,
                action="usuario.registrado",
                actor_user_id=user_id,
                target_type="usuario",
                target_id=str(user_id),
                details={"papel_plataforma": role},
            )
            if convite is not None:
                notify(
                    connection,
                    user_ids=campaign_member_ids(
                        connection, convite["campanha_id"], roles=("mestre", "assistente")
                    ),
                    category="campanha",
                    title=f"{payload.nome_exibicao} entrou na campanha",
                    message=f"Criou a conta com um convite e entrou como {convite['papel']}.",
                    campaign_id=convite["campanha_id"],
                    actor_user_id=user_id,
                )
    except UniqueViolation:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="nao foi possivel criar a conta com esses dados",
        ) from None

    _set_auth_cookies(response, settings, session_token, csrf_token)
    return {
        "usuario": {
            "id": user_id,
            "email": email,
            "nome_exibicao": payload.nome_exibicao,
            "admin_plataforma": is_creator,
            "papel_plataforma": role,
            "senha_provisoria": False,
        }
    }


@router.post("/entrar")
def login(
    payload: LoginInput,
    request: Request,
    response: Response,
    database: Database = Depends(get_database),
    settings: Settings = Depends(get_settings),
):
    email = str(payload.email).strip().lower()
    limit_key = _login_limit_key(email, request)
    login_failed = False
    user = None
    session_token = None
    csrf_token = None
    with database.connection() as connection:
        limites.conferir(connection, limites.LOGIN, limit_key)
        user = connection.execute(
            """
            SELECT id, email, nome_exibicao, senha_hash, ativo,
                   admin_plataforma, papel_plataforma, senha_provisoria
            FROM usuarios WHERE LOWER(email)=LOWER(%s)
            """,
            (email,),
        ).fetchone()
        if not user or not user["ativo"] or not verify_password(payload.senha, user["senha_hash"]):
            limites.registrar(connection, limites.LOGIN, limit_key)
            login_failed = True
        else:
            limites.limpar(connection, limit_key)
            session_token, csrf_token = _create_session(
                connection,
                user_id=user["id"],
                request=request,
                settings=settings,
            )
            record_audit(
                connection,
                action="auth.login",
                actor_user_id=user["id"],
                target_type="sessao",
            )

    if login_failed or not user or not session_token or not csrf_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="email ou senha invalidos",
        )

    _set_auth_cookies(response, settings, session_token, csrf_token)
    return {
        "usuario": {
            "id": user["id"],
            "email": user["email"],
            "nome_exibicao": user["nome_exibicao"],
            "admin_plataforma": bool(user["admin_plataforma"]),
            "papel_plataforma": user["papel_plataforma"],
            "senha_provisoria": bool(user["senha_provisoria"]),
        }
    }


@router.post("/esqueci-senha", status_code=status.HTTP_202_ACCEPTED)
def pedir_redefinicao(
    payload: PasswordHelpInput,
    request: Request,
    database: Database = Depends(get_database),
):
    """Abre um pedido para um administrador redefinir a senha.

    Não há e-mail: o pedido cai no painel de quem administra, que gera a senha
    provisória e a entrega pelo Discord. A resposta é sempre a mesma, exista ou
    não a conta — senão a rota viraria um jeito de descobrir quem tem cadastro.
    """
    email = str(payload.email).strip().lower()
    # O índice de pedido aberto já barra repetir o mesmo e-mail; o limite por
    # origem barra quem varia o endereço para encher a fila do admin.
    limites.cobrar(
        database, limites.PEDIDO_SENHA,
        limites.chave(limites.PEDIDO_SENHA, _client_fingerprint(request)),
    )

    with database.connection() as connection:
        alvo = connection.execute(
            "SELECT id, nome_exibicao FROM usuarios WHERE LOWER(email)=LOWER(%s) AND ativo=TRUE",
            (email,),
        ).fetchone()

        aberto = connection.execute(
            "SELECT id FROM pedidos_senha WHERE LOWER(email)=LOWER(%s) AND status='aberto'",
            (email,),
        ).fetchone()
        if not aberto:
            pedido_id = uuid4()
            connection.execute(
                """
                INSERT INTO pedidos_senha (id, usuario_id, email, origem_ip_hash)
                VALUES (%s, %s, %s, %s)
                """,
                (pedido_id, alvo["id"] if alvo else None, email, _client_fingerprint(request)),
            )
            if alvo:
                administradores = [
                    linha["id"]
                    for linha in connection.execute(
                        """
                        SELECT id FROM usuarios
                        WHERE ativo=TRUE AND papel_plataforma IN ('admin', 'criador')
                        """
                    ).fetchall()
                ]
                notify(
                    connection,
                    user_ids=administradores,
                    category="conta",
                    title="Pedido de senha nova",
                    message=f"{alvo['nome_exibicao']} ({email}) não consegue entrar.",
                    actor_user_id=alvo["id"],
                    details={"pedido_id": str(pedido_id), "email": email},
                    include_actor=False,
                )
            record_audit(
                connection,
                action="auth.senha_solicitada",
                actor_service="site",
                target_type="conta",
                target_id=email,
                details={"conta_existe": bool(alvo)},
            )

    return {
        "mensagem": (
            "Pedido registrado. Um administrador vai gerar uma senha provisória "
            "e entregar a você pelo Discord."
        )
    }


@router.get("/eu")
def me(user: AuthenticatedUser = Depends(get_current_user)):
    return {
        "usuario": {
            "id": user.id,
            "email": user.email,
            "nome_exibicao": user.nome_exibicao,
            "admin_plataforma": user.admin_plataforma,
            "papel_plataforma": user.papel_plataforma,
            "senha_provisoria": user.senha_provisoria,
        }
    }


@router.post("/senha")
def change_password(
    payload: PasswordChangeInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    """Troca a própria senha e derruba as outras sessões.

    Vale tanto para a troca voluntária quanto para a obrigatória depois de um
    reset do administrador — em ambos os casos a senha antiga é conhecida por
    quem está digitando, então ela é exigida.
    """
    # Exige a senha atual, então é alvo de tentativa às cegas por quem pegou
    # uma sessão emprestada num computador compartilhado.
    chave_troca = limites.chave(limites.TROCA_SENHA, str(user.id))
    limites.cobrar(database, limites.TROCA_SENHA, chave_troca)

    with database.connection() as connection:
        current = connection.execute(
            "SELECT senha_hash, senha_provisoria FROM usuarios WHERE id=%s AND ativo=TRUE FOR UPDATE",
            (user.id,),
        ).fetchone()
        if not current or not verify_password(payload.senha_atual, current["senha_hash"]):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="a senha atual nao confere",
            )
        limites.limpar(connection, chave_troca)
        connection.execute(
            """
            UPDATE usuarios
            SET senha_hash=%s, senha_provisoria=FALSE,
                senha_alterada_em=CURRENT_TIMESTAMP,
                atualizado_em=CURRENT_TIMESTAMP
            WHERE id=%s
            """,
            (hash_password(payload.nova_senha), user.id),
        )
        # A sessão atual continua; as outras caem, inclusive a de quem tivesse
        # entrado com a senha antiga.
        connection.execute(
            """
            UPDATE sessoes_auth SET revogada_em=CURRENT_TIMESTAMP
            WHERE usuario_id=%s AND id<>%s AND revogada_em IS NULL
            """,
            (user.id, user.session_id),
        )
        record_audit(
            connection,
            action="auth.senha_alterada",
            actor_user_id=user.id,
            target_type="usuario",
            target_id=str(user.id),
            details={"era_provisoria": bool(current["senha_provisoria"])},
        )
    return {"senha_provisoria": False}


@router.post("/sair", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    response: Response,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
    settings: Settings = Depends(get_settings),
):
    with database.connection() as connection:
        connection.execute(
            "UPDATE sessoes_auth SET revogada_em=CURRENT_TIMESTAMP WHERE id=%s",
            (user.session_id,),
        )
        record_audit(
            connection,
            action="auth.logout",
            actor_user_id=user.id,
            target_type="sessao",
            target_id=str(user.session_id),
        )
    response.delete_cookie(settings.session_cookie_name, path="/")
    response.delete_cookie(settings.csrf_cookie_name, path="/")
    return None
