from __future__ import annotations

import contextlib
import unittest
from datetime import datetime, timezone
from types import SimpleNamespace
from unittest import mock
from uuid import UUID

from fastapi import HTTPException
from psycopg.errors import UniqueViolation

from routers import content, discord_links, knowledge, notifications
from schemas import (
    ContentAccessInput,
    ContentPublishInput,
    KnowledgeCreateInput,
    KnowledgeGrantInput,
    NotificationReadInput,
)


# Mesmo estilo de mock usado em test_economy_writers.py / test_auth.py: uma
# conexao "gravadora" que despacha por trecho de SQL, sem tocar o Postgres.

CAMPAIGN_ID = UUID("11111111-1111-1111-1111-111111111111")
KNOWLEDGE_ID = UUID("22222222-2222-2222-2222-222222222222")
MANAGER_ID = UUID("33333333-3333-3333-3333-333333333333")
PLAYER_ID = UUID("44444444-4444-4444-4444-444444444444")
OWNER_ID = UUID("66666666-6666-6666-6666-666666666666")
OUTSIDER_ID = UUID("77777777-7777-7777-7777-777777777777")
CHARACTER_ID = UUID("88888888-8888-8888-8888-888888888888")
TARGET_USER_ID = UUID("99999999-9999-9999-9999-999999999999")


def _sql(statement: str) -> str:
    return " ".join(statement.split())


class _Result:
    def __init__(self, row=None, rows=None):
        self._row = row
        self._rows = rows if rows is not None else []

    def fetchone(self):
        return self._row

    def fetchall(self):
        return self._rows


class _RecordingConnection:
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


class _Database:
    def __init__(self, connection):
        self._connection = connection

    @contextlib.contextmanager
    def connection(self):
        yield self._connection


def _has(statements, fragment: str) -> bool:
    return any(fragment in sql for sql, _ in statements)


def _index(statements, fragment: str) -> int:
    return next(index for index, (sql, _) in enumerate(statements) if fragment in sql)


def _access_row(*, user_id, papel, papel_plataforma="jogador", membro_status="ativo", dono_id=OWNER_ID):
    """Linha crua que core.dependencies.campaign_access espera de 'FROM campanhas'."""
    return {
        "campanha_id": CAMPAIGN_ID,
        "dono_id": dono_id,
        "status": "ativa",
        "papel_plataforma": papel_plataforma,
        "usuario_id": user_id,
        "papel": papel,
        "membro_status": membro_status,
    }


def _manager_row(user_id=MANAGER_ID):
    return _access_row(user_id=user_id, papel="mestre")


def _player_row(user_id=PLAYER_ID):
    return _access_row(user_id=user_id, papel="jogador")


# ===========================================================================
# knowledge.py — POST /conhecimento
# ===========================================================================


class KnowledgeCreateTests(unittest.TestCase):
    def _connection(self, *, access_row, unique_violation=False):
        def responder(sql, _params):
            if "FROM campanhas" in sql:
                return access_row
            if sql.startswith("INSERT INTO informacoes_campanha"):
                if unique_violation:
                    raise UniqueViolation("duplicate")
                return None
            if sql.startswith("INSERT INTO eventos_auditoria"):
                return None
            raise AssertionError(f"consulta inesperada: {sql}")

        return _RecordingConnection(responder)

    def _payload(self):
        return KnowledgeCreateInput(
            campanha_id=CAMPAIGN_ID,
            tipo="mundo",
            chave_recurso="taverna-do-porto",
            titulo="A Taverna do Porto",
            acesso_padrao="rumor",
        )

    def test_manager_creates_knowledge_entry(self):
        connection = self._connection(access_row=_manager_row())
        result = knowledge.create_knowledge(
            self._payload(),
            user=SimpleNamespace(id=MANAGER_ID),
            database=_Database(connection),
        )
        self.assertIn("id", result)
        self.assertEqual(result["chave_recurso"], "taverna-do-porto")
        self.assertTrue(_has(connection.statements, "INSERT INTO informacoes_campanha"))
        self.assertTrue(_has(connection.statements, "INSERT INTO eventos_auditoria"))

    def test_player_cannot_create_knowledge_entry(self):
        connection = self._connection(access_row=_player_row())
        with self.assertRaises(HTTPException) as captured:
            knowledge.create_knowledge(
                self._payload(),
                user=SimpleNamespace(id=PLAYER_ID),
                database=_Database(connection),
            )
        self.assertEqual(captured.exception.status_code, 403)
        self.assertFalse(_has(connection.statements, "INSERT INTO informacoes_campanha"))

    def test_duplicate_entry_returns_409(self):
        connection = self._connection(access_row=_manager_row(), unique_violation=True)
        with self.assertRaises(HTTPException) as captured:
            knowledge.create_knowledge(
                self._payload(),
                user=SimpleNamespace(id=MANAGER_ID),
                database=_Database(connection),
            )
        self.assertEqual(captured.exception.status_code, 409)


# ===========================================================================
# knowledge.py — PUT/DELETE /conhecimento/{id}/liberacoes
# ===========================================================================


class KnowledgeGrantTests(unittest.TestCase):
    def test_missing_knowledge_returns_404(self):
        def responder(sql, _params):
            if sql.startswith("SELECT campanha_id, titulo FROM informacoes_campanha"):
                return None
            raise AssertionError(f"consulta inesperada: {sql}")

        connection = _RecordingConnection(responder)
        payload = KnowledgeGrantInput(destinatario_tipo="papel", destinatario_id="jogador", acesso="rumor")
        with self.assertRaises(HTTPException) as captured:
            knowledge.grant_knowledge(
                KNOWLEDGE_ID, payload, user=SimpleNamespace(id=MANAGER_ID), database=_Database(connection)
            )
        self.assertEqual(captured.exception.status_code, 404)

    def test_non_manager_cannot_grant(self):
        def responder(sql, _params):
            if sql.startswith("SELECT campanha_id, titulo FROM informacoes_campanha"):
                return {"campanha_id": CAMPAIGN_ID, "titulo": "Segredo"}
            if "FROM campanhas" in sql:
                return _player_row()
            raise AssertionError(f"consulta inesperada: {sql}")

        connection = _RecordingConnection(responder)
        payload = KnowledgeGrantInput(destinatario_tipo="papel", destinatario_id="jogador", acesso="rumor")
        with self.assertRaises(HTTPException) as captured:
            knowledge.grant_knowledge(
                KNOWLEDGE_ID, payload, user=SimpleNamespace(id=PLAYER_ID), database=_Database(connection)
            )
        self.assertEqual(captured.exception.status_code, 403)

    _UNHANDLED = object()

    def _base_responder(self, extra=None):
        def responder(sql, params):
            if sql.startswith("SELECT campanha_id, titulo FROM informacoes_campanha"):
                return {"campanha_id": CAMPAIGN_ID, "titulo": "Segredo do Rei"}
            if "FROM campanhas" in sql:
                return _manager_row()
            if extra:
                result = extra(sql, params)
                if result is not self._UNHANDLED:
                    return result
            raise AssertionError(f"consulta inesperada: {sql}")

        return responder

    def test_invalid_role_destination_returns_422(self):
        connection = _RecordingConnection(self._base_responder())
        payload = KnowledgeGrantInput(destinatario_tipo="papel", destinatario_id="vilao", acesso="rumor")
        with self.assertRaises(HTTPException) as captured:
            knowledge.grant_knowledge(
                KNOWLEDGE_ID, payload, user=SimpleNamespace(id=MANAGER_ID), database=_Database(connection)
            )
        self.assertEqual(captured.exception.status_code, 422)

    def test_invalid_usuario_uuid_returns_422(self):
        connection = _RecordingConnection(self._base_responder())
        payload = KnowledgeGrantInput(destinatario_tipo="usuario", destinatario_id="nao-e-uuid", acesso="rumor")
        with self.assertRaises(HTTPException) as captured:
            knowledge.grant_knowledge(
                KNOWLEDGE_ID, payload, user=SimpleNamespace(id=MANAGER_ID), database=_Database(connection)
            )
        self.assertEqual(captured.exception.status_code, 422)

    def test_usuario_not_member_of_campaign_returns_422(self):
        def extra(sql, _params):
            if sql.startswith("SELECT 1 FROM membros_campanha"):
                return None
            return self._UNHANDLED

        connection = _RecordingConnection(self._base_responder(extra))
        payload = KnowledgeGrantInput(
            destinatario_tipo="usuario", destinatario_id=str(OUTSIDER_ID), acesso="rumor"
        )
        with self.assertRaises(HTTPException) as captured:
            knowledge.grant_knowledge(
                KNOWLEDGE_ID, payload, user=SimpleNamespace(id=MANAGER_ID), database=_Database(connection)
            )
        self.assertEqual(captured.exception.status_code, 422)

    def test_personagem_not_in_campaign_returns_422(self):
        def extra(sql, _params):
            if sql.startswith("SELECT 1 FROM personagens"):
                return None
            return self._UNHANDLED

        connection = _RecordingConnection(self._base_responder(extra))
        payload = KnowledgeGrantInput(
            destinatario_tipo="personagem", destinatario_id=str(CHARACTER_ID), acesso="rumor"
        )
        with self.assertRaises(HTTPException) as captured:
            knowledge.grant_knowledge(
                KNOWLEDGE_ID, payload, user=SimpleNamespace(id=MANAGER_ID), database=_Database(connection)
            )
        self.assertEqual(captured.exception.status_code, 422)

    def test_grant_to_usuario_succeeds_and_notifies_recipient(self):
        grant_row = {
            "id": UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
            "informacao_id": KNOWLEDGE_ID,
            "destinatario_tipo": "usuario",
            "destinatario_id": str(TARGET_USER_ID),
            "acesso": "completo",
            "liberado_em": datetime.now(timezone.utc),
        }

        def extra(sql, _params):
            if sql.startswith("SELECT 1 FROM membros_campanha"):
                return {"?column?": 1}
            if sql.startswith("INSERT INTO liberacoes_informacao"):
                return grant_row
            if sql.startswith("INSERT INTO notificacoes"):
                return None
            if sql.startswith("INSERT INTO eventos_auditoria"):
                return None
            return self._UNHANDLED

        connection = _RecordingConnection(self._base_responder(extra))
        payload = KnowledgeGrantInput(
            destinatario_tipo="usuario", destinatario_id=str(TARGET_USER_ID), acesso="completo"
        )
        result = knowledge.grant_knowledge(
            KNOWLEDGE_ID, payload, user=SimpleNamespace(id=MANAGER_ID), database=_Database(connection)
        )
        self.assertEqual(result["acesso"], "completo")
        self.assertTrue(_has(connection.statements, "INSERT INTO notificacoes"))
        self.assertTrue(_has(connection.statements, "INSERT INTO eventos_auditoria"))

    def test_grant_to_papel_notifies_only_matching_members_excluding_actor(self):
        grant_row = {
            "id": UUID("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"),
            "informacao_id": KNOWLEDGE_ID,
            "destinatario_tipo": "papel",
            "destinatario_id": "jogador",
            "acesso": "parcial",
            "liberado_em": datetime.now(timezone.utc),
        }

        def extra(sql, _params):
            if sql.startswith("INSERT INTO liberacoes_informacao"):
                return grant_row
            if sql.startswith("INSERT INTO eventos_auditoria"):
                return None
            return self._UNHANDLED

        connection = _RecordingConnection(self._base_responder(extra))
        payload = KnowledgeGrantInput(destinatario_tipo="papel", destinatario_id="jogador", acesso="parcial")
        with mock.patch.object(knowledge, "notify") as notify_mock, mock.patch.object(
            knowledge, "campaign_member_ids", return_value=[TARGET_USER_ID, MANAGER_ID]
        ) as member_ids_mock:
            knowledge.grant_knowledge(
                KNOWLEDGE_ID, payload, user=SimpleNamespace(id=MANAGER_ID), database=_Database(connection)
            )
        member_ids_mock.assert_called_once()
        self.assertEqual(member_ids_mock.call_args.kwargs.get("roles"), ("jogador",))
        notify_mock.assert_called_once()
        self.assertEqual(notify_mock.call_args.kwargs["user_ids"], [TARGET_USER_ID, MANAGER_ID])
        self.assertEqual(notify_mock.call_args.kwargs["actor_user_id"], MANAGER_ID)


class KnowledgeRevokeGrantTests(unittest.TestCase):
    def test_missing_knowledge_returns_404(self):
        def responder(sql, _params):
            if sql.startswith("SELECT campanha_id FROM informacoes_campanha"):
                return None
            raise AssertionError(f"consulta inesperada: {sql}")

        connection = _RecordingConnection(responder)
        with self.assertRaises(HTTPException) as captured:
            knowledge.revoke_knowledge_grant(
                KNOWLEDGE_ID,
                destinatario_tipo="usuario",
                destinatario_id=str(TARGET_USER_ID),
                user=SimpleNamespace(id=MANAGER_ID),
                database=_Database(connection),
            )
        self.assertEqual(captured.exception.status_code, 404)

    def test_non_manager_cannot_revoke(self):
        def responder(sql, _params):
            if sql.startswith("SELECT campanha_id FROM informacoes_campanha"):
                return {"campanha_id": CAMPAIGN_ID}
            if "FROM campanhas" in sql:
                return _player_row()
            raise AssertionError(f"consulta inesperada: {sql}")

        connection = _RecordingConnection(responder)
        with self.assertRaises(HTTPException) as captured:
            knowledge.revoke_knowledge_grant(
                KNOWLEDGE_ID,
                destinatario_tipo="usuario",
                destinatario_id=str(TARGET_USER_ID),
                user=SimpleNamespace(id=PLAYER_ID),
                database=_Database(connection),
            )
        self.assertEqual(captured.exception.status_code, 403)

    def test_manager_revokes_grant(self):
        def responder(sql, _params):
            if sql.startswith("SELECT campanha_id FROM informacoes_campanha"):
                return {"campanha_id": CAMPAIGN_ID}
            if "FROM campanhas" in sql:
                return _manager_row()
            if sql.startswith("DELETE FROM liberacoes_informacao"):
                return None
            if sql.startswith("INSERT INTO eventos_auditoria"):
                return None
            raise AssertionError(f"consulta inesperada: {sql}")

        connection = _RecordingConnection(responder)
        result = knowledge.revoke_knowledge_grant(
            KNOWLEDGE_ID,
            destinatario_tipo="usuario",
            destinatario_id=str(TARGET_USER_ID),
            user=SimpleNamespace(id=MANAGER_ID),
            database=_Database(connection),
        )
        self.assertIsNone(result)
        delete_index = _index(connection.statements, "DELETE FROM liberacoes_informacao")
        self.assertEqual(
            connection.statements[delete_index][1],
            (KNOWLEDGE_ID, "usuario", str(TARGET_USER_ID)),
        )


# ===========================================================================
# knowledge.py — GET /conhecimento
# ===========================================================================


class KnowledgeListTests(unittest.TestCase):
    def test_list_without_access_returns_404(self):
        def responder(sql, _params):
            if "FROM campanhas" in sql:
                return None
            raise AssertionError(f"consulta inesperada: {sql}")

        connection = _RecordingConnection(responder)
        with self.assertRaises(HTTPException) as captured:
            knowledge.list_knowledge(
                CAMPAIGN_ID, administrar=False, user=SimpleNamespace(id=OUTSIDER_ID), database=_Database(connection)
            )
        self.assertEqual(captured.exception.status_code, 404)

    def test_administrar_requires_manager(self):
        def responder(sql, _params):
            if "FROM campanhas" in sql:
                return _player_row()
            if sql.startswith("SELECT id, tipo, chave_recurso"):
                return _Result(rows=[])
            raise AssertionError(f"consulta inesperada: {sql}")

        connection = _RecordingConnection(responder)
        with self.assertRaises(HTTPException) as captured:
            knowledge.list_knowledge(
                CAMPAIGN_ID, administrar=True, user=SimpleNamespace(id=PLAYER_ID), database=_Database(connection)
            )
        self.assertEqual(captured.exception.status_code, 403)

    def test_manager_administrar_returns_entries_and_grants(self):
        def responder(sql, _params):
            if "FROM campanhas" in sql:
                return _manager_row()
            if sql.startswith("SELECT id, tipo, chave_recurso"):
                return _Result(rows=[{"id": KNOWLEDGE_ID, "tipo": "mundo"}])
            if sql.startswith("SELECT id, informacao_id, destinatario_tipo"):
                return _Result(rows=[{"id": UUID(int=1), "informacao_id": KNOWLEDGE_ID}])
            raise AssertionError(f"consulta inesperada: {sql}")

        connection = _RecordingConnection(responder)
        result = knowledge.list_knowledge(
            CAMPAIGN_ID, administrar=True, user=SimpleNamespace(id=MANAGER_ID), database=_Database(connection)
        )
        self.assertIn("informacoes", result)
        self.assertIn("liberacoes", result)
        self.assertEqual(len(result["liberacoes"]), 1)

    def test_player_visibility_escalates_with_specific_grant_and_hides_oculto(self):
        entry_visible = {
            "id": UUID("cccccccc-cccc-cccc-cccc-cccccccccccc"),
            "tipo": "mundo",
            "chave_recurso": "taverna",
            "titulo": "A Taverna",
            "resumo_rumor": "Dizem que...",
            "dados_parciais": {"nivel": "parcial"},
            "dados_completos": {"nivel": "completo"},
            "acesso_padrao": "rumor",
            "atualizado_em": None,
        }
        entry_hidden = {
            "id": UUID("dddddddd-dddd-dddd-dddd-dddddddddddd"),
            "tipo": "mundo",
            "chave_recurso": "segredo",
            "titulo": "Segredo do Rei",
            "resumo_rumor": "",
            "dados_parciais": {},
            "dados_completos": {},
            "acesso_padrao": "oculto",
            "atualizado_em": None,
        }

        def responder(sql, _params):
            if "FROM campanhas" in sql:
                return _player_row()
            if sql.startswith("SELECT id, tipo, chave_recurso"):
                return _Result(rows=[entry_visible, entry_hidden])
            if sql.startswith("SELECT id FROM personagens"):
                return _Result(rows=[])
            if sql.startswith("SELECT informacao_id, destinatario_tipo, destinatario_id, acesso"):
                return _Result(
                    rows=[
                        {
                            "informacao_id": entry_visible["id"],
                            "destinatario_tipo": "usuario",
                            "destinatario_id": str(PLAYER_ID),
                            "acesso": "completo",
                        }
                    ]
                )
            raise AssertionError(f"consulta inesperada: {sql}")

        connection = _RecordingConnection(responder)
        result = knowledge.list_knowledge(
            CAMPAIGN_ID, administrar=False, user=SimpleNamespace(id=PLAYER_ID), database=_Database(connection)
        )
        entries = result["informacoes"]
        self.assertEqual(len(entries), 1)
        self.assertEqual(entries[0]["id"], entry_visible["id"])
        self.assertEqual(entries[0]["acesso"], "completo")
        self.assertEqual(entries[0]["dados"], {"nivel": "completo"})


# ===========================================================================
# content.py — GET /conteudo/biblioteca
# ===========================================================================


class ContentLibraryTests(unittest.TestCase):
    def test_list_library_requires_manager(self):
        def responder(sql, _params):
            if "FROM campanhas" in sql:
                return _player_row()
            raise AssertionError(f"consulta inesperada: {sql}")

        connection = _RecordingConnection(responder)
        with self.assertRaises(HTTPException) as captured:
            content.list_library(
                CAMPAIGN_ID, modulo="mundo", user=SimpleNamespace(id=PLAYER_ID), database=_Database(connection)
            )
        self.assertEqual(captured.exception.status_code, 403)

    def test_list_library_flags_already_published_entries(self):
        def responder(sql, _params):
            if "FROM campanhas" in sql:
                return _manager_row()
            if sql.startswith("SELECT tipo, chave_recurso, titulo, dados"):
                return _Result(
                    rows=[{"tipo": "mundo", "chave_recurso": "reino-sul", "titulo": "Reino do Sul", "dados": {}}]
                )
            if sql.startswith("SELECT id, chave_recurso, acesso_padrao"):
                return _Result(
                    rows=[{"id": KNOWLEDGE_ID, "chave_recurso": "mundo:reino-sul", "acesso_padrao": "completo"}]
                )
            raise AssertionError(f"consulta inesperada: {sql}")

        connection = _RecordingConnection(responder)
        result = content.list_library(
            CAMPAIGN_ID, modulo="mundo", user=SimpleNamespace(id=MANAGER_ID), database=_Database(connection)
        )
        entrada = result["entradas"][0]
        self.assertEqual(entrada["chave"], "mundo:reino-sul")
        self.assertIsNotNone(entrada["publicacao"])
        self.assertEqual(entrada["publicacao"]["acesso_padrao"], "completo")


# ===========================================================================
# content.py — POST /conteudo/publicar
# ===========================================================================


class ContentPublishTests(unittest.TestCase):
    def _library_responder(self, extra=None):
        def responder(sql, params):
            if "FROM campanhas" in sql:
                return _manager_row()
            if sql.startswith("SELECT tipo, chave_recurso, titulo, dados"):
                return _Result(
                    rows=[{"tipo": "mundo", "chave_recurso": "reino-sul", "titulo": "Reino do Sul", "dados": {}}]
                )
            if extra:
                return extra(sql, params)
            raise AssertionError(f"consulta inesperada: {sql}")

        return responder

    def test_publish_is_all_or_nothing_when_a_key_is_missing(self):
        connection = _RecordingConnection(self._library_responder())
        payload = ContentPublishInput(
            campanha_id=CAMPAIGN_ID,
            modulo="mundo",
            chaves=["mundo:reino-sul", "mundo:inexistente"],
            acesso_padrao="completo",
        )
        with self.assertRaises(HTTPException) as captured:
            content.publish_content(payload, user=SimpleNamespace(id=MANAGER_ID), database=_Database(connection))
        self.assertEqual(captured.exception.status_code, 422)
        self.assertFalse(_has(connection.statements, "INSERT INTO informacoes_campanha"))

    def test_publish_success_notifies_members_when_not_oculto(self):
        def extra(sql, _params):
            if sql.startswith("INSERT INTO informacoes_campanha"):
                return {
                    "id": KNOWLEDGE_ID,
                    "chave_recurso": "mundo:reino-sul",
                    "titulo": "Reino do Sul",
                    "acesso_padrao": "completo",
                }
            if sql.startswith("SELECT usuario_id FROM membros_campanha"):
                return _Result(rows=[{"usuario_id": PLAYER_ID}])
            if sql.startswith("INSERT INTO notificacoes"):
                return None
            if sql.startswith("INSERT INTO eventos_auditoria"):
                return None
            return None

        connection = _RecordingConnection(self._library_responder(extra))
        payload = ContentPublishInput(
            campanha_id=CAMPAIGN_ID, modulo="mundo", chaves=["mundo:reino-sul"], acesso_padrao="completo"
        )
        result = content.publish_content(
            payload, user=SimpleNamespace(id=MANAGER_ID), database=_Database(connection)
        )
        self.assertEqual(len(result["publicados"]), 1)
        self.assertTrue(_has(connection.statements, "INSERT INTO notificacoes"))

    def test_publish_oculto_does_not_notify(self):
        def extra(sql, _params):
            if sql.startswith("INSERT INTO informacoes_campanha"):
                return {
                    "id": KNOWLEDGE_ID,
                    "chave_recurso": "mundo:reino-sul",
                    "titulo": "Reino do Sul",
                    "acesso_padrao": "oculto",
                }
            if sql.startswith("INSERT INTO eventos_auditoria"):
                return None
            return None

        connection = _RecordingConnection(self._library_responder(extra))
        payload = ContentPublishInput(
            campanha_id=CAMPAIGN_ID, modulo="mundo", chaves=["mundo:reino-sul"], acesso_padrao="oculto"
        )
        content.publish_content(payload, user=SimpleNamespace(id=MANAGER_ID), database=_Database(connection))
        self.assertFalse(_has(connection.statements, "INSERT INTO notificacoes"))
        self.assertFalse(_has(connection.statements, "SELECT usuario_id FROM membros_campanha"))


# ===========================================================================
# content.py — PUT /conteudo/{id}/acesso  e  DELETE /conteudo/{id}
# ===========================================================================


class ContentAccessChangeTests(unittest.TestCase):
    def test_change_access_missing_returns_404(self):
        def responder(sql, _params):
            if sql.startswith("SELECT campanha_id, tipo, titulo, acesso_padrao"):
                return None
            raise AssertionError(f"consulta inesperada: {sql}")

        connection = _RecordingConnection(responder)
        with self.assertRaises(HTTPException) as captured:
            content.change_default_access(
                KNOWLEDGE_ID,
                ContentAccessInput(acesso_padrao="completo"),
                user=SimpleNamespace(id=MANAGER_ID),
                database=_Database(connection),
            )
        self.assertEqual(captured.exception.status_code, 404)

    def _run_transition(self, previous: str, new: str):
        def responder(sql, _params):
            if sql.startswith("SELECT campanha_id, tipo, titulo, acesso_padrao"):
                return {"campanha_id": CAMPAIGN_ID, "tipo": "mundo", "titulo": "Segredo", "acesso_padrao": previous}
            if "FROM campanhas" in sql:
                return _manager_row()
            if sql.startswith("UPDATE informacoes_campanha"):
                return {"id": KNOWLEDGE_ID, "titulo": "Segredo", "tipo": "mundo", "acesso_padrao": new}
            if sql.startswith("SELECT usuario_id FROM membros_campanha"):
                return _Result(rows=[{"usuario_id": PLAYER_ID}])
            if sql.startswith("INSERT INTO notificacoes"):
                return None
            if sql.startswith("INSERT INTO eventos_auditoria"):
                return None
            raise AssertionError(f"consulta inesperada: {sql}")

        connection = _RecordingConnection(responder)
        content.change_default_access(
            KNOWLEDGE_ID,
            ContentAccessInput(acesso_padrao=new),
            user=SimpleNamespace(id=MANAGER_ID),
            database=_Database(connection),
        )
        return connection

    def test_oculto_to_parcial_notifies_members(self):
        connection = self._run_transition("oculto", "parcial")
        self.assertTrue(_has(connection.statements, "INSERT INTO notificacoes"))

    def test_parcial_to_completo_does_not_notify(self):
        connection = self._run_transition("parcial", "completo")
        self.assertFalse(_has(connection.statements, "INSERT INTO notificacoes"))


class ContentUnpublishTests(unittest.TestCase):
    def test_unpublish_missing_returns_404(self):
        def responder(sql, _params):
            if sql.startswith("SELECT campanha_id, tipo FROM informacoes_campanha"):
                return None
            raise AssertionError(f"consulta inesperada: {sql}")

        connection = _RecordingConnection(responder)
        with self.assertRaises(HTTPException) as captured:
            content.unpublish_content(
                KNOWLEDGE_ID, user=SimpleNamespace(id=MANAGER_ID), database=_Database(connection)
            )
        self.assertEqual(captured.exception.status_code, 404)

    def test_manager_unpublishes_content(self):
        def responder(sql, _params):
            if sql.startswith("SELECT campanha_id, tipo FROM informacoes_campanha"):
                return {"campanha_id": CAMPAIGN_ID, "tipo": "mundo"}
            if "FROM campanhas" in sql:
                return _manager_row()
            if sql.startswith("DELETE FROM informacoes_campanha"):
                return None
            if sql.startswith("INSERT INTO eventos_auditoria"):
                return None
            raise AssertionError(f"consulta inesperada: {sql}")

        connection = _RecordingConnection(responder)
        result = content.unpublish_content(
            KNOWLEDGE_ID, user=SimpleNamespace(id=MANAGER_ID), database=_Database(connection)
        )
        self.assertIsNone(result)
        self.assertTrue(_has(connection.statements, "DELETE FROM informacoes_campanha"))

    def test_non_manager_cannot_unpublish(self):
        def responder(sql, _params):
            if sql.startswith("SELECT campanha_id, tipo FROM informacoes_campanha"):
                return {"campanha_id": CAMPAIGN_ID, "tipo": "mundo"}
            if "FROM campanhas" in sql:
                return _player_row()
            raise AssertionError(f"consulta inesperada: {sql}")

        connection = _RecordingConnection(responder)
        with self.assertRaises(HTTPException) as captured:
            content.unpublish_content(
                KNOWLEDGE_ID, user=SimpleNamespace(id=PLAYER_ID), database=_Database(connection)
            )
        self.assertEqual(captured.exception.status_code, 403)
        self.assertFalse(_has(connection.statements, "DELETE FROM informacoes_campanha"))


# ===========================================================================
# content.py — GET /conteudo/visivel
# ===========================================================================


class ContentVisibleTests(unittest.TestCase):
    def test_visible_content_without_access_returns_404(self):
        def responder(sql, _params):
            if "FROM campanhas" in sql:
                return None
            raise AssertionError(f"consulta inesperada: {sql}")

        connection = _RecordingConnection(responder)
        with self.assertRaises(HTTPException) as captured:
            content.visible_content(
                CAMPAIGN_ID, modulo="mundo", user=SimpleNamespace(id=OUTSIDER_ID), database=_Database(connection)
            )
        self.assertEqual(captured.exception.status_code, 404)

    def _rows(self):
        return [
            {
                "id": UUID(int=1),
                "chave_recurso": "completo-x",
                "titulo": "Item Completo",
                "resumo_rumor": "resumo",
                "dados_parciais": {"nivel": "parcial"},
                "dados_completos": {"nivel": "completo"},
                "acesso_padrao": "completo",
            },
            {
                "id": UUID(int=2),
                "chave_recurso": "parcial-x",
                "titulo": "Item Parcial",
                "resumo_rumor": "resumo",
                "dados_parciais": {"nivel": "parcial"},
                "dados_completos": {"nivel": "completo"},
                "acesso_padrao": "parcial",
            },
            {
                "id": UUID(int=3),
                "chave_recurso": "rumor-x",
                "titulo": "Item Rumor",
                "resumo_rumor": "so um boato",
                "dados_parciais": {"nivel": "parcial"},
                "dados_completos": {"nivel": "completo"},
                "acesso_padrao": "rumor",
            },
        ]

    def test_manager_sees_full_data_regardless_of_default_access(self):
        def responder(sql, _params):
            if "FROM campanhas" in sql:
                return _manager_row()
            if sql.startswith("SELECT id, chave_recurso, titulo, resumo_rumor"):
                return _Result(rows=self._rows())
            raise AssertionError(f"consulta inesperada: {sql}")

        connection = _RecordingConnection(responder)
        result = content.visible_content(
            CAMPAIGN_ID, modulo="mundo", user=SimpleNamespace(id=MANAGER_ID), database=_Database(connection)
        )
        for entrada in result["entradas"]:
            self.assertEqual(entrada, {"nivel": "completo"})

    def test_player_sees_tiered_access_per_entry(self):
        def responder(sql, _params):
            if "FROM campanhas" in sql:
                return _player_row()
            if sql.startswith("SELECT id, chave_recurso, titulo, resumo_rumor"):
                return _Result(rows=self._rows())
            raise AssertionError(f"consulta inesperada: {sql}")

        connection = _RecordingConnection(responder)
        result = content.visible_content(
            CAMPAIGN_ID, modulo="mundo", user=SimpleNamespace(id=PLAYER_ID), database=_Database(connection)
        )
        entradas = result["entradas"]
        self.assertEqual(entradas[0], {"nivel": "completo"})
        self.assertEqual(entradas[1], {"nivel": "parcial"})
        self.assertEqual(entradas[2], {"titulo": "Item Rumor", "resumo": "so um boato", "acesso": "rumor"})


# ===========================================================================
# content.py — GET /conteudo/busca
# ===========================================================================


class ContentSearchTests(unittest.TestCase):
    def test_search_without_access_returns_404(self):
        def responder(sql, _params):
            if "FROM campanhas" in sql:
                return None
            raise AssertionError(f"consulta inesperada: {sql}")

        connection = _RecordingConnection(responder)
        with self.assertRaises(HTTPException) as captured:
            content.buscar_conteudo(
                CAMPAIGN_ID, q="reino", user=SimpleNamespace(id=OUTSIDER_ID), database=_Database(connection)
            )
        self.assertEqual(captured.exception.status_code, 404)

    def test_search_returns_content_and_only_the_caller_characters(self):
        def responder(sql, params):
            if "FROM campanhas" in sql:
                return _manager_row()
            if sql.startswith("SELECT tipo AS modulo"):
                return _Result(rows=[{"modulo": "mundo", "chave_recurso": "reino-sul", "titulo": "Reino do Sul"}])
            if sql.startswith("SELECT id, nome FROM personagens"):
                self.assertEqual(params[1], MANAGER_ID)
                return _Result(rows=[{"id": CHARACTER_ID, "nome": "Lys"}])
            raise AssertionError(f"consulta inesperada: {sql}")

        connection = _RecordingConnection(responder)
        result = content.buscar_conteudo(
            CAMPAIGN_ID, q="reino", user=SimpleNamespace(id=MANAGER_ID), database=_Database(connection)
        )
        modulos = {item["modulo"] for item in result["resultados"]}
        self.assertEqual(modulos, {"mundo", "ficha"})
        ficha_result = next(item for item in result["resultados"] if item["modulo"] == "ficha")
        self.assertEqual(ficha_result["ref"], str(CHARACTER_ID))


# ===========================================================================
# discord_links.py
# ===========================================================================


class DiscordLinksTests(unittest.TestCase):
    def test_get_link_returns_none_when_not_linked(self):
        def responder(sql, _params):
            if sql.startswith("SELECT discord_user_id"):
                return None
            raise AssertionError(f"consulta inesperada: {sql}")

        connection = _RecordingConnection(responder)
        result = discord_links.get_link(user=SimpleNamespace(id=MANAGER_ID), database=_Database(connection))
        self.assertEqual(result, {"vinculo": None})

    def test_get_link_returns_existing_link(self):
        row = {"discord_user_id": "123456789", "discord_nome": "Fulano", "vinculado_em": datetime.now(timezone.utc)}

        def responder(sql, _params):
            if sql.startswith("SELECT discord_user_id"):
                return row
            raise AssertionError(f"consulta inesperada: {sql}")

        connection = _RecordingConnection(responder)
        result = discord_links.get_link(user=SimpleNamespace(id=MANAGER_ID), database=_Database(connection))
        self.assertEqual(result["vinculo"]["discord_user_id"], "123456789")

    def test_create_link_code_invalidates_previous_code_before_inserting_new(self):
        def responder(sql, _params):
            if sql.startswith("UPDATE codigos_vinculo_discord"):
                return None
            if sql.startswith("INSERT INTO codigos_vinculo_discord"):
                return None
            if sql.startswith("INSERT INTO eventos_auditoria"):
                return None
            raise AssertionError(f"consulta inesperada: {sql}")

        connection = _RecordingConnection(responder)
        with mock.patch.object(discord_links, "new_human_code", return_value="ABCD1234"):
            result = discord_links.create_link_code(
                user=SimpleNamespace(id=MANAGER_ID), database=_Database(connection)
            )
        self.assertEqual(result["codigo"], "ABCD1234")
        invalidate_index = _index(connection.statements, "UPDATE codigos_vinculo_discord")
        insert_index = _index(connection.statements, "INSERT INTO codigos_vinculo_discord")
        self.assertLess(invalidate_index, insert_index)
        # Somente o proprio usuario tem o codigo anterior invalidado.
        self.assertEqual(connection.statements[invalidate_index][1], (MANAGER_ID,))

    def test_unlink_discord_is_idempotent_and_still_audits(self):
        def responder(sql, _params):
            if sql.startswith("DELETE FROM contas_discord"):
                return None
            if sql.startswith("INSERT INTO eventos_auditoria"):
                return None
            raise AssertionError(f"consulta inesperada: {sql}")

        connection = _RecordingConnection(responder)
        result = discord_links.unlink_discord(user=SimpleNamespace(id=MANAGER_ID), database=_Database(connection))
        self.assertIsNone(result)
        self.assertTrue(_has(connection.statements, "DELETE FROM contas_discord"))
        self.assertTrue(_has(connection.statements, "INSERT INTO eventos_auditoria"))


# ===========================================================================
# notifications.py
# ===========================================================================


class NotificationsTests(unittest.TestCase):
    def test_list_notifications_scopes_to_current_user(self):
        def responder(sql, params):
            if sql.startswith("SELECT n.id, n.campanha_id"):
                self.assertEqual(params[0], MANAGER_ID)
                self.assertEqual(params[1], True)
                self.assertEqual(params[2], 50)
                return _Result(rows=[{"id": UUID(int=1)}])
            if sql.startswith("SELECT COUNT(*) AS total"):
                self.assertEqual(params, (MANAGER_ID,))
                return {"total": 3}
            raise AssertionError(f"consulta inesperada: {sql}")

        connection = _RecordingConnection(responder)
        result = notifications.list_notifications(
            apenas_nao_lidos=True, limite=50, user=SimpleNamespace(id=MANAGER_ID), database=_Database(connection)
        )
        self.assertEqual(result["nao_lidos"], 3)
        self.assertEqual(len(result["avisos"]), 1)

    def test_mark_as_read_with_ids_stays_scoped_to_owner(self):
        n1, n2 = UUID(int=10), UUID(int=11)

        def responder(sql, params):
            if "id = ANY" in sql:
                self.assertEqual(params[0], MANAGER_ID)
                self.assertEqual(params[1], [n1, n2])
                return None
            if sql.startswith("SELECT COUNT(*) AS total"):
                return {"total": 1}
            raise AssertionError(f"consulta inesperada: {sql}")

        connection = _RecordingConnection(responder)
        payload = NotificationReadInput(ids=[n1, n2])
        result = notifications.mark_as_read(
            payload, user=SimpleNamespace(id=MANAGER_ID), database=_Database(connection)
        )
        self.assertEqual(result["nao_lidos"], 1)

    def test_mark_as_read_without_ids_marks_everything_for_owner(self):
        def responder(sql, params):
            if sql.startswith("UPDATE notificacoes SET lida_em=CURRENT_TIMESTAMP WHERE usuario_id=%s AND lida_em IS NULL") and "ANY" not in sql:
                self.assertEqual(params, (MANAGER_ID,))
                return None
            if sql.startswith("SELECT COUNT(*) AS total"):
                return {"total": 0}
            raise AssertionError(f"consulta inesperada: {sql}")

        connection = _RecordingConnection(responder)
        payload = NotificationReadInput(ids=[])
        notifications.mark_as_read(payload, user=SimpleNamespace(id=MANAGER_ID), database=_Database(connection))
        self.assertFalse(_has(connection.statements, "id = ANY"))

    def test_clear_read_only_deletes_read_notifications_for_owner(self):
        def responder(sql, params):
            if sql.startswith("DELETE FROM notificacoes"):
                self.assertEqual(params, (MANAGER_ID,))
                self.assertIn("lida_em IS NOT NULL", sql)
                return None
            raise AssertionError(f"consulta inesperada: {sql}")

        connection = _RecordingConnection(responder)
        result = notifications.clear_read(user=SimpleNamespace(id=MANAGER_ID), database=_Database(connection))
        self.assertIsNone(result)


if __name__ == "__main__":
    unittest.main()
