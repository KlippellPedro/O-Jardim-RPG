from __future__ import annotations

import contextlib
import unittest
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest import mock
from uuid import uuid4

from fastapi import HTTPException
from psycopg.errors import UniqueViolation
from pydantic import ValidationError

from core import dependencies
from core.config import Settings
from core.dependencies import AuthenticatedUser
from core.security import DUMMY_PASSWORD_HASH, hash_password, hash_token, verify_password
from routers import auth
from schemas import LoginInput, PasswordChangeInput, PasswordHelpInput, RegisterInput


def _sql(statement: str) -> str:
    return " ".join(statement.split())


class _Result:
    def __init__(self, row=None, rows=None, rowcount=1):
        self._row = row
        self._rows = rows if rows is not None else ([row] if row is not None else [])
        self.rowcount = rowcount

    def fetchone(self):
        return self._row

    def fetchall(self):
        return self._rows


class _RecordingConnection:
    """Mesmo estilo de mock usado em test_economy_writers.py."""

    def __init__(self, responder):
        self.responder = responder
        self.statements: list[tuple[str, object]] = []

    def execute(self, statement, params=None):
        normalized = _sql(str(statement))
        self.statements.append((normalized, params))
        response = self.responder(normalized, params)
        if isinstance(response, _Result):
            return response
        return _Result(row=response)

    @contextlib.contextmanager
    def cursor(self):
        yield _RecordingCursor(self)


class _RecordingCursor:
    def __init__(self, connection: "_RecordingConnection"):
        self._connection = connection

    def execute(self, statement, params=None):
        return self._connection.execute(statement, params)

    def executemany(self, statement, params_seq):
        for params in params_seq:
            self._connection.execute(statement, params)


class _Database:
    def __init__(self, connection):
        self._connection = connection

    @contextlib.contextmanager
    def connection(self):
        yield self._connection


def _fake_request() -> SimpleNamespace:
    return SimpleNamespace(headers={}, client=SimpleNamespace(host="127.0.0.1"))


def _responder_for(user_row):
    def _responder(sql: str, params):
        if "FROM usuarios" in sql:
            return user_row
        if "FROM limites_acesso" in sql and sql.startswith("SELECT bloqueado_ate"):
            return None
        if "FROM limites_acesso" in sql and sql.startswith("SELECT tentativas"):
            return None
        if sql.startswith("INSERT INTO limites_acesso"):
            return None
        if sql.startswith("DELETE FROM limites_acesso"):
            return None
        raise AssertionError(f"consulta inesperada no mock: {sql}")

    return _responder


def _settings(**overrides) -> Settings:
    base = dict(
        environment="development",
        database_url="postgresql://localhost/test",
        service_api_key=None,
        session_cookie_name="oj_session",
        csrf_cookie_name="oj_csrf",
        session_days=7,
        cookie_secure=False,
        allowed_origins=(),
        trusted_hosts=(),
        startup_timeout=15,
        creator_user_id=None,
        creator_email=None,
        cadastro="aberto",
        automatic_backup_enabled=False,
        automatic_backup_interval_hours=24,
        automatic_backup_retention=7,
        automatic_backup_directory="backups",
    )
    base.update(overrides)
    return Settings(**base)


def _fake_response():
    """Response falso que grava as chamadas de cookie para inspeção."""
    calls: dict[str, list] = {"set_cookie": [], "delete_cookie": []}
    response = SimpleNamespace(
        set_cookie=lambda *a, **k: calls["set_cookie"].append((a, k)),
        delete_cookie=lambda *a, **k: calls["delete_cookie"].append((a, k)),
    )
    return response, calls


# Toda ação de autenticação passa por core.rate_limit_auth antes/depois do
# trabalho principal; estas quatro consultas aparecem em praticamente todo
# fluxo (registrar, entrar, esqueci-senha, trocar senha) e não têm relação
# com a lógica de negócio sendo testada — apenas "sem bloqueio, sem histórico".
_RATE_LIMIT_PASSTHROUGH = [
    ("SELECT bloqueado_ate", None),
    ("SELECT tentativas", None),
    ("INSERT INTO limites_acesso", None),
    ("DELETE FROM limites_acesso", None),
]


class _RuleRouter:
    """Despacha o SQL normalizado para uma resposta, por prefixo, na ordem
    em que as regras foram declaradas. Uma regra pode ser: um valor fixo
    (inclusive None), uma exceção (levantada), ou uma função de params."""

    def __init__(self, rules):
        self._rules = rules

    def __call__(self, sql: str, params):
        for prefix, value in self._rules:
            if sql.startswith(prefix):
                if isinstance(value, BaseException):
                    raise value
                if callable(value):
                    return value(params)
                return value
        raise AssertionError(f"consulta inesperada no mock: {sql}")


class LoginTimingSafetyTests(unittest.TestCase):
    """Cobre a correção de P3-1: verify_password sempre roda, mesmo sem
    usuário/conta ativa, para não vazar por timing se o e-mail existe."""

    def _run_login(self, user_row, senha="qualquer-coisa"):
        connection = _RecordingConnection(_responder_for(user_row))
        database = _Database(connection)
        payload = LoginInput(email="alguem@example.com", senha=senha)
        request = _fake_request()
        response = SimpleNamespace(set_cookie=lambda *a, **k: None)
        settings = SimpleNamespace()
        with self.assertRaises(HTTPException) as ctx:
            auth.login(payload, request, response, database=database, settings=settings)
        self.assertEqual(ctx.exception.status_code, 401)

    def test_login_rejects_unknown_email(self):
        # E-mail não cadastrado: user_row é None, mas o login ainda deve
        # rejeitar normalmente (via HTTPException 401) usando o hash dummy.
        self._run_login(user_row=None)

    def test_login_rejects_wrong_password_for_existing_active_user(self):
        user_row = {
            "id": "user-1",
            "email": "alguem@example.com",
            "nome_exibicao": "Alguém",
            "senha_hash": hash_password("senha-correta"),
            "ativo": True,
            "admin_plataforma": False,
            "papel_plataforma": "jogador",
            "senha_provisoria": False,
        }
        self._run_login(user_row=user_row, senha="senha-errada")

    def test_login_rejects_inactive_user_even_with_correct_password(self):
        user_row = {
            "id": "user-1",
            "email": "alguem@example.com",
            "nome_exibicao": "Alguém",
            "senha_hash": hash_password("senha-correta"),
            "ativo": False,
            "admin_plataforma": False,
            "papel_plataforma": "jogador",
            "senha_provisoria": False,
        }
        self._run_login(user_row=user_row, senha="senha-correta")

    def test_unknown_email_and_inactive_user_both_check_against_dummy_hash(self):
        """Garante que o caminho sem usuário/conta ativa não pula
        verify_password: ambos devem comparar contra o mesmo DUMMY_PASSWORD_HASH,
        igualando o custo de CPU ao de uma senha errada numa conta existente."""
        seen_hashes: list[str] = []
        real_verify_password = verify_password

        def _spy(password, password_hash):
            seen_hashes.append(password_hash)
            return real_verify_password(password, password_hash)

        inactive_row = {
            "id": "user-1",
            "email": "alguem@example.com",
            "nome_exibicao": "Alguém",
            "senha_hash": hash_password("senha-correta"),
            "ativo": False,
            "admin_plataforma": False,
            "papel_plataforma": "jogador",
            "senha_provisoria": False,
        }

        with mock.patch.object(auth, "verify_password", side_effect=_spy):
            for user_row in (None, inactive_row):
                with self.subTest(user_row=user_row):
                    self._run_login(user_row=user_row)

        self.assertEqual(seen_hashes, [DUMMY_PASSWORD_HASH, DUMMY_PASSWORD_HASH])


class DummyPasswordHashTests(unittest.TestCase):
    def test_dummy_hash_never_matches_real_passwords(self):
        self.assertFalse(verify_password("qualquer-senha", DUMMY_PASSWORD_HASH))
        self.assertFalse(verify_password("", DUMMY_PASSWORD_HASH))


class LoginSuccessTests(unittest.TestCase):
    """Caminho feliz de POST /auth/entrar, ausente da suíte original (que só
    cobria as rejeições de P3-1)."""

    def test_login_success_creates_session_sets_cookies_and_clears_rate_limit(self):
        user_id = uuid4()
        user_row = {
            "id": user_id,
            "email": "alguem@example.com",
            "nome_exibicao": "Alguém",
            "senha_hash": hash_password("senha-correta"),
            "ativo": True,
            "admin_plataforma": False,
            "papel_plataforma": "jogador",
            "senha_provisoria": False,
        }
        connection = _RecordingConnection(_RuleRouter([
            *_RATE_LIMIT_PASSTHROUGH,
            ("SELECT id, email, nome_exibicao, senha_hash, ativo", user_row),
            ("INSERT INTO sessoes_auth", None),
            ("DELETE FROM sessoes_auth", None),
            ("INSERT INTO eventos_auditoria", None),
        ]))
        database = _Database(connection)
        # E-mail com caixa diferente do cadastro: o login compara case-insensitive.
        payload = LoginInput(email="ALGUEM@example.com", senha="senha-correta")
        request = _fake_request()
        response, cookie_calls = _fake_response()
        settings = _settings()

        result = auth.login(payload, request, response, database=database, settings=settings)

        self.assertEqual(result["usuario"]["id"], user_id)
        self.assertEqual(result["usuario"]["email"], "alguem@example.com")
        self.assertFalse(result["usuario"]["senha_provisoria"])
        self.assertTrue(any(s.startswith("INSERT INTO sessoes_auth") for s, _ in connection.statements))
        self.assertTrue(any(s.startswith("DELETE FROM limites_acesso") for s, _ in connection.statements))
        self.assertEqual(len(cookie_calls["set_cookie"]), 2)

    def test_login_blocked_by_rate_limit_raises_429_before_touching_usuarios(self):
        future = datetime.now(timezone.utc) + timedelta(minutes=5)
        connection = _RecordingConnection(_RuleRouter([
            ("SELECT bloqueado_ate", {"bloqueado_ate": future, "janela_iniciada_em": datetime.now(timezone.utc)}),
        ]))
        database = _Database(connection)
        payload = LoginInput(email="alguem@example.com", senha="qualquer-coisa")
        request = _fake_request()
        response, _ = _fake_response()
        settings = _settings()

        with self.assertRaises(HTTPException) as ctx:
            auth.login(payload, request, response, database=database, settings=settings)

        self.assertEqual(ctx.exception.status_code, 429)
        self.assertFalse(any("FROM usuarios" in s for s, _ in connection.statements))


class RegisterTests(unittest.TestCase):
    def _run(self, payload, settings, rules):
        connection = _RecordingConnection(_RuleRouter(rules))
        database = _Database(connection)
        request = _fake_request()
        response, cookie_calls = _fake_response()
        result = auth.register(payload, request, response, database=database, settings=settings)
        return result, connection, cookie_calls

    def test_success_open_cadastro_creates_player_without_touching_invites(self):
        settings = _settings(cadastro="aberto")
        payload = RegisterInput(email="novo@example.com", nome_exibicao="Nova Pessoa", senha="senha-longa-123")
        rules = [
            *_RATE_LIMIT_PASSTHROUGH,
            ("INSERT INTO usuarios", None),
            ("INSERT INTO sessoes_auth", None),
            ("DELETE FROM sessoes_auth", None),
            ("INSERT INTO eventos_auditoria", None),
        ]

        result, connection, cookie_calls = self._run(payload, settings, rules)

        self.assertEqual(result["usuario"]["email"], "novo@example.com")
        self.assertEqual(result["usuario"]["papel_plataforma"], "player")
        self.assertFalse(result["usuario"]["admin_plataforma"])
        self.assertEqual(len(cookie_calls["set_cookie"]), 2)
        self.assertFalse(any("convites_campanha" in s for s, _ in connection.statements))

    def test_cadastro_fechado_rejects_before_touching_the_database(self):
        settings = _settings(cadastro="fechado")
        payload = RegisterInput(email="ninguem@example.com", nome_exibicao="Ninguém", senha="senha-longa-123")
        connection = _RecordingConnection(_RuleRouter([]))
        database = _Database(connection)
        request = _fake_request()
        response, _ = _fake_response()

        with self.assertRaises(HTTPException) as ctx:
            auth.register(payload, request, response, database=database, settings=settings)

        self.assertEqual(ctx.exception.status_code, 403)
        self.assertEqual(connection.statements, [])

    def test_creator_email_bypasses_cadastro_fechado_and_downgrades_previous_creator(self):
        settings = _settings(cadastro="fechado", creator_email="dono@example.com")
        payload = RegisterInput(email="DONO@example.com", nome_exibicao="Dono", senha="senha-longa-123")
        rules = [
            *_RATE_LIMIT_PASSTHROUGH,
            ("UPDATE usuarios SET papel_plataforma='admin'", None),
            ("INSERT INTO usuarios", None),
            ("INSERT INTO sessoes_auth", None),
            ("DELETE FROM sessoes_auth", None),
            ("INSERT INTO eventos_auditoria", None),
        ]

        result, connection, _ = self._run(payload, settings, rules)

        self.assertEqual(result["usuario"]["papel_plataforma"], "criador")
        self.assertTrue(result["usuario"]["admin_plataforma"])
        self.assertTrue(any(
            s.startswith("UPDATE usuarios SET papel_plataforma='admin'") for s, _ in connection.statements
        ))

    def test_requires_invite_code_when_cadastro_exige_convite(self):
        settings = _settings(cadastro="convite")
        payload = RegisterInput(email="alguem@example.com", nome_exibicao="Alguém", senha="senha-longa-123")
        rules = list(_RATE_LIMIT_PASSTHROUGH)

        with self.assertRaises(HTTPException) as ctx:
            self._run(payload, settings, rules)

        self.assertEqual(ctx.exception.status_code, 403)

    def test_rejects_invalid_or_expired_invite_with_generic_message(self):
        settings = _settings(cadastro="convite")
        payload = RegisterInput(
            email="alguem@example.com", nome_exibicao="Alguém",
            senha="senha-longa-123", convite="codigo-invalido",
        )
        rules = [
            *_RATE_LIMIT_PASSTHROUGH,
            ("SELECT id, campanha_id, papel, max_usos, usos, expira_em, revogado_em", None),
        ]

        with self.assertRaises(HTTPException) as ctx:
            self._run(payload, settings, rules)

        self.assertEqual(ctx.exception.status_code, 403)
        self.assertEqual(ctx.exception.detail, "convite invalido ou expirado")

    def test_valid_invite_adds_campaign_member_and_notifies_managers(self):
        settings = _settings(cadastro="convite")
        campanha_id = uuid4()
        manager_id = uuid4()
        convite_row = {
            "id": uuid4(),
            "campanha_id": campanha_id,
            "papel": "jogador",
            "max_usos": 5,
            "usos": 1,
            "expira_em": datetime.now(timezone.utc) + timedelta(days=1),
            "revogado_em": None,
        }
        payload = RegisterInput(
            email="convidado@example.com", nome_exibicao="Convidado",
            senha="senha-longa-123", convite="codigo-valido",
        )
        rules = [
            *_RATE_LIMIT_PASSTHROUGH,
            ("SELECT id, campanha_id, papel, max_usos, usos, expira_em, revogado_em", convite_row),
            ("INSERT INTO usuarios", None),
            ("INSERT INTO membros_campanha", None),
            ("UPDATE convites_campanha SET usos=usos+1", None),
            ("INSERT INTO sessoes_auth", None),
            ("DELETE FROM sessoes_auth", None),
            ("INSERT INTO eventos_auditoria", None),
            ("SELECT usuario_id FROM membros_campanha", _Result(rows=[{"usuario_id": manager_id}])),
            ("INSERT INTO notificacoes", None),
        ]

        result, connection, _ = self._run(payload, settings, rules)

        self.assertEqual(result["usuario"]["papel_plataforma"], "player")
        self.assertTrue(any(s.startswith("INSERT INTO membros_campanha") for s, _ in connection.statements))
        self.assertTrue(any(
            s.startswith("UPDATE convites_campanha SET usos=usos+1") for s, _ in connection.statements
        ))
        self.assertTrue(any(s.startswith("INSERT INTO notificacoes") for s, _ in connection.statements))

    def test_duplicate_email_returns_409_with_vague_message(self):
        settings = _settings(cadastro="aberto")
        payload = RegisterInput(email="repetido@example.com", nome_exibicao="Repetido", senha="senha-longa-123")
        rules = [
            *_RATE_LIMIT_PASSTHROUGH,
            ("INSERT INTO usuarios", UniqueViolation("duplicate key value")),
        ]

        with self.assertRaises(HTTPException) as ctx:
            self._run(payload, settings, rules)

        self.assertEqual(ctx.exception.status_code, 409)
        self.assertEqual(ctx.exception.detail, "nao foi possivel criar a conta com esses dados")


class ForgotPasswordTests(unittest.TestCase):
    """POST /auth/esqueci-senha nunca pode revelar se a conta existe."""

    def _rules(self, *, alvo_row, aberto_row, admins_rows=None):
        return [
            *_RATE_LIMIT_PASSTHROUGH,
            ("SELECT id, nome_exibicao FROM usuarios", alvo_row),
            ("SELECT id FROM pedidos_senha", aberto_row),
            ("INSERT INTO pedidos_senha", None),
            ("SELECT id FROM usuarios WHERE ativo=TRUE AND papel_plataforma IN", _Result(rows=admins_rows or [])),
            ("INSERT INTO notificacoes", None),
            ("INSERT INTO eventos_auditoria", None),
        ]

    def test_response_is_identical_whether_or_not_the_account_exists(self):
        request = _fake_request()

        connection_exists = _RecordingConnection(_RuleRouter(self._rules(
            alvo_row={"id": uuid4(), "nome_exibicao": "Alguém"}, aberto_row=None,
        )))
        result_exists = auth.pedir_redefinicao(
            PasswordHelpInput(email="existe@example.com"), request, database=_Database(connection_exists),
        )

        connection_missing = _RecordingConnection(_RuleRouter(self._rules(
            alvo_row=None, aberto_row=None,
        )))
        result_missing = auth.pedir_redefinicao(
            PasswordHelpInput(email="naoexiste@example.com"), request, database=_Database(connection_missing),
        )

        self.assertEqual(result_exists, result_missing)

    def test_does_not_duplicate_an_already_open_request(self):
        rules = self._rules(
            alvo_row={"id": uuid4(), "nome_exibicao": "Alguém"},
            aberto_row={"id": uuid4()},
        )
        connection = _RecordingConnection(_RuleRouter(rules))
        request = _fake_request()

        auth.pedir_redefinicao(PasswordHelpInput(email="alguem@example.com"), request, database=_Database(connection))

        self.assertFalse(any(s.startswith("INSERT INTO pedidos_senha") for s, _ in connection.statements))
        self.assertFalse(any(s.startswith("INSERT INTO notificacoes") for s, _ in connection.statements))

    def test_notifies_admins_only_when_the_account_exists(self):
        admin_id = uuid4()
        rules = self._rules(
            alvo_row={"id": uuid4(), "nome_exibicao": "Alguém"},
            aberto_row=None,
            admins_rows=[{"id": admin_id}],
        )
        connection = _RecordingConnection(_RuleRouter(rules))
        request = _fake_request()

        auth.pedir_redefinicao(PasswordHelpInput(email="alguem@example.com"), request, database=_Database(connection))

        self.assertTrue(any(s.startswith("INSERT INTO notificacoes") for s, _ in connection.statements))

    def test_records_the_request_but_sends_no_notification_for_unknown_email(self):
        rules = self._rules(alvo_row=None, aberto_row=None)
        connection = _RecordingConnection(_RuleRouter(rules))
        request = _fake_request()

        auth.pedir_redefinicao(PasswordHelpInput(email="naoexiste@example.com"), request, database=_Database(connection))

        self.assertTrue(any(s.startswith("INSERT INTO pedidos_senha") for s, _ in connection.statements))
        self.assertFalse(any(s.startswith("INSERT INTO notificacoes") for s, _ in connection.statements))


class ChangePasswordTests(unittest.TestCase):
    def _user(self, **overrides):
        base = dict(
            id=uuid4(), email="alguem@example.com", nome_exibicao="Alguém",
            admin_plataforma=False, papel_plataforma="jogador",
            session_id=uuid4(), csrf_hash="hash-da-sessao", senha_provisoria=False,
        )
        base.update(overrides)
        return AuthenticatedUser(**base)

    def test_rejects_wrong_current_password(self):
        user = self._user()
        current_row = {"senha_hash": hash_password("senha-atual"), "senha_provisoria": False}
        connection = _RecordingConnection(_RuleRouter([
            *_RATE_LIMIT_PASSTHROUGH,
            ("SELECT senha_hash, senha_provisoria FROM usuarios", current_row),
        ]))
        database = _Database(connection)
        payload = PasswordChangeInput(senha_atual="senha-errada", nova_senha="senha-nova-123")

        with self.assertRaises(HTTPException) as ctx:
            auth.change_password(payload, user=user, database=database)

        self.assertEqual(ctx.exception.status_code, 403)

    def test_rejects_when_user_became_inactive_since_the_session_was_issued(self):
        user = self._user()
        connection = _RecordingConnection(_RuleRouter([
            *_RATE_LIMIT_PASSTHROUGH,
            # WHERE ... AND ativo=TRUE não acha a linha: comportamento
            # indistinguível de senha errada, de propósito.
            ("SELECT senha_hash, senha_provisoria FROM usuarios", None),
        ]))
        database = _Database(connection)
        payload = PasswordChangeInput(senha_atual="qualquer-coisa", nova_senha="senha-nova-123")

        with self.assertRaises(HTTPException) as ctx:
            auth.change_password(payload, user=user, database=database)

        self.assertEqual(ctx.exception.status_code, 403)

    def test_success_revokes_every_other_session_but_keeps_the_current_one(self):
        user = self._user(senha_provisoria=True)
        current_row = {"senha_hash": hash_password("senha-atual"), "senha_provisoria": True}
        connection = _RecordingConnection(_RuleRouter([
            *_RATE_LIMIT_PASSTHROUGH,
            ("SELECT senha_hash, senha_provisoria FROM usuarios", current_row),
            ("UPDATE usuarios SET senha_hash=%s", None),
            ("UPDATE sessoes_auth SET revogada_em=CURRENT_TIMESTAMP WHERE usuario_id=%s", None),
            ("INSERT INTO eventos_auditoria", None),
        ]))
        database = _Database(connection)
        payload = PasswordChangeInput(senha_atual="senha-atual", nova_senha="senha-nova-123")

        result = auth.change_password(payload, user=user, database=database)

        self.assertEqual(result, {"senha_provisoria": False})
        revoke_calls = [
            params for sql, params in connection.statements
            if sql.startswith("UPDATE sessoes_auth SET revogada_em=CURRENT_TIMESTAMP WHERE usuario_id=%s")
        ]
        self.assertEqual(revoke_calls, [(user.id, user.session_id)])
        # sucesso zera o limite de tentativas de troca de senha
        self.assertTrue(any(s.startswith("DELETE FROM limites_acesso") for s, _ in connection.statements))

    def test_schema_rejects_new_password_equal_to_current(self):
        with self.assertRaises(ValidationError):
            PasswordChangeInput(senha_atual="mesma-senha-123", nova_senha="mesma-senha-123")


class LogoutTests(unittest.TestCase):
    def test_revokes_current_session_records_audit_and_clears_cookies(self):
        user = AuthenticatedUser(
            id=uuid4(), email="alguem@example.com", nome_exibicao="Alguém",
            admin_plataforma=False, papel_plataforma="jogador",
            session_id=uuid4(), csrf_hash="hash-da-sessao", senha_provisoria=False,
        )
        connection = _RecordingConnection(_RuleRouter([
            ("UPDATE sessoes_auth SET revogada_em=CURRENT_TIMESTAMP WHERE id=%s", None),
            ("INSERT INTO eventos_auditoria", None),
        ]))
        database = _Database(connection)
        settings = _settings()
        response, cookie_calls = _fake_response()

        result = auth.logout(response, user=user, database=database, settings=settings)

        self.assertIsNone(result)
        revoke_calls = [
            params for sql, params in connection.statements
            if sql.startswith("UPDATE sessoes_auth SET revogada_em=CURRENT_TIMESTAMP WHERE id=%s")
        ]
        self.assertEqual(revoke_calls, [(user.session_id,)])
        self.assertEqual(len(cookie_calls["delete_cookie"]), 2)


class GetCurrentUserSessionTests(unittest.TestCase):
    """core.dependencies.get_current_user: expiração/invalidação de sessão.

    Usada por /auth/eu, /auth/senha e /auth/sair (via require_csrf), então
    cobrir aqui vale para o módulo auth.py inteiro.
    """

    def _request(self, settings, cookie_value=None):
        cookies = {} if cookie_value is None else {settings.session_cookie_name: cookie_value}
        return SimpleNamespace(
            app=SimpleNamespace(state=SimpleNamespace(settings=settings)),
            cookies=cookies,
        )

    def _row(self, **overrides):
        base = dict(
            sessao_id=uuid4(), csrf_hash="csrf-hash",
            expira_em=datetime.now(timezone.utc) + timedelta(days=1),
            id=uuid4(), email="alguem@example.com", nome_exibicao="Alguém",
            admin_plataforma=False, papel_plataforma="jogador",
            ativo=True, senha_provisoria=False,
        )
        base.update(overrides)
        return base

    def test_missing_cookie_is_401(self):
        settings = _settings()
        request = self._request(settings)
        database = _Database(_RecordingConnection(_RuleRouter([])))

        with self.assertRaises(HTTPException) as ctx:
            dependencies.get_current_user(request, database=database)

        self.assertEqual(ctx.exception.status_code, 401)

    def test_valid_session_returns_the_authenticated_user_and_touches_ultimo_uso(self):
        settings = _settings()
        row = self._row()
        connection = _RecordingConnection(_RuleRouter([
            ("SELECT s.id AS sessao_id", row),
            ("UPDATE sessoes_auth SET ultimo_uso_em", None),
        ]))
        database = _Database(connection)
        request = self._request(settings, cookie_value="token-valido")

        user = dependencies.get_current_user(request, database=database)

        self.assertEqual(user.id, row["id"])
        self.assertEqual(user.session_id, row["sessao_id"])
        self.assertTrue(any(s.startswith("UPDATE sessoes_auth SET ultimo_uso_em") for s, _ in connection.statements))

    def test_expired_session_is_401(self):
        settings = _settings()
        row = self._row(expira_em=datetime.now(timezone.utc) - timedelta(minutes=1))
        connection = _RecordingConnection(_RuleRouter([("SELECT s.id AS sessao_id", row)]))
        database = _Database(connection)
        request = self._request(settings, cookie_value="token-expirado")

        with self.assertRaises(HTTPException) as ctx:
            dependencies.get_current_user(request, database=database)

        self.assertEqual(ctx.exception.status_code, 401)

    def test_revoked_or_unknown_session_token_is_401(self):
        # A consulta já filtra "revogada_em IS NULL"; uma sessão revogada
        # simplesmente não aparece, como se o token não existisse.
        settings = _settings()
        connection = _RecordingConnection(_RuleRouter([("SELECT s.id AS sessao_id", None)]))
        database = _Database(connection)
        request = self._request(settings, cookie_value="token-revogado-ou-inexistente")

        with self.assertRaises(HTTPException) as ctx:
            dependencies.get_current_user(request, database=database)

        self.assertEqual(ctx.exception.status_code, 401)

    def test_inactive_user_is_401_even_with_an_otherwise_valid_session(self):
        settings = _settings()
        row = self._row(ativo=False)
        connection = _RecordingConnection(_RuleRouter([("SELECT s.id AS sessao_id", row)]))
        database = _Database(connection)
        request = self._request(settings, cookie_value="token-usuario-inativo")

        with self.assertRaises(HTTPException) as ctx:
            dependencies.get_current_user(request, database=database)

        self.assertEqual(ctx.exception.status_code, 401)


class RequireCsrfTests(unittest.TestCase):
    """core.dependencies.require_csrf: usado por /auth/senha e /auth/sair
    (e por toda rota que muda estado no resto da plataforma)."""

    def _request(self, settings, csrf_cookie=None):
        cookies = {} if csrf_cookie is None else {settings.csrf_cookie_name: csrf_cookie}
        return SimpleNamespace(
            app=SimpleNamespace(state=SimpleNamespace(settings=settings)),
            cookies=cookies,
        )

    def _user(self, csrf_token: str) -> AuthenticatedUser:
        return AuthenticatedUser(
            id=uuid4(), email="alguem@example.com", nome_exibicao="Alguém",
            admin_plataforma=False, papel_plataforma="jogador",
            session_id=uuid4(), csrf_hash=hash_token(csrf_token), senha_provisoria=False,
        )

    def test_missing_header_is_403(self):
        settings = _settings()
        token = "csrf-abc"
        user = self._user(token)
        request = self._request(settings, csrf_cookie=token)

        with self.assertRaises(HTTPException) as ctx:
            dependencies.require_csrf(request, user=user, csrf_header=None)

        self.assertEqual(ctx.exception.status_code, 403)

    def test_missing_cookie_is_403(self):
        settings = _settings()
        token = "csrf-abc"
        user = self._user(token)
        request = self._request(settings, csrf_cookie=None)

        with self.assertRaises(HTTPException) as ctx:
            dependencies.require_csrf(request, user=user, csrf_header=token)

        self.assertEqual(ctx.exception.status_code, 403)

    def test_header_not_matching_cookie_is_403(self):
        settings = _settings()
        token = "csrf-abc"
        user = self._user(token)
        request = self._request(settings, csrf_cookie=token)

        with self.assertRaises(HTTPException) as ctx:
            dependencies.require_csrf(request, user=user, csrf_header="csrf-diferente")

        self.assertEqual(ctx.exception.status_code, 403)

    def test_header_and_cookie_match_but_do_not_match_the_sessions_own_hash_is_403(self):
        # Cenário do achado de troca de senha: o cookie CSRF sobrevivente de
        # uma sessão revogada bate com ele mesmo, mas não com o csrf_hash
        # gravado na sessão atual do usuário.
        settings = _settings()
        token = "csrf-abc"
        user = self._user("csrf-de-outra-sessao")
        request = self._request(settings, csrf_cookie=token)

        with self.assertRaises(HTTPException) as ctx:
            dependencies.require_csrf(request, user=user, csrf_header=token)

        self.assertEqual(ctx.exception.status_code, 403)

    def test_matching_header_cookie_and_session_hash_succeeds(self):
        settings = _settings()
        token = "csrf-abc"
        user = self._user(token)
        request = self._request(settings, csrf_cookie=token)

        result = dependencies.require_csrf(request, user=user, csrf_header=token)

        self.assertIs(result, user)


class RegisterAndLoginSchemaValidationTests(unittest.TestCase):
    def test_register_input_rejects_short_password(self):
        with self.assertRaises(ValidationError):
            RegisterInput(email="a@example.com", nome_exibicao="Nome Valido", senha="curta")

    def test_register_input_rejects_invalid_email(self):
        with self.assertRaises(ValidationError):
            RegisterInput(email="nao-e-um-email", nome_exibicao="Nome Valido", senha="senha-longa-123")

    def test_register_input_collapses_whitespace_in_display_name(self):
        payload = RegisterInput(
            email="a@example.com", nome_exibicao="  Nome   Com   Espacos  ", senha="senha-longa-123",
        )
        self.assertEqual(payload.nome_exibicao, "Nome Com Espacos")

    def test_login_input_rejects_empty_password(self):
        with self.assertRaises(ValidationError):
            LoginInput(email="a@example.com", senha="")


if __name__ == "__main__":
    unittest.main()
