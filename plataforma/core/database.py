from __future__ import annotations

from contextlib import contextmanager
from typing import Iterator
from uuid import UUID

from psycopg import Connection
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

from .schema import MIGRATIONS
from .audit import record_audit


class Database:
    def __init__(self, dsn: str, startup_timeout: int = 15):
        self.dsn = dsn
        self.startup_timeout = startup_timeout
        self.pool = ConnectionPool(
            conninfo=dsn,
            min_size=1,
            max_size=10,
            open=False,
            timeout=10,
            reconnect_timeout=30,
            kwargs={
                "row_factory": dict_row,
                "connect_timeout": min(10, startup_timeout),
            },
            check=ConnectionPool.check_connection,
            name="jardim-plataforma",
        )

    def open(self) -> None:
        self.pool.open(wait=True, timeout=self.startup_timeout)
        self.apply_migrations()

    def close(self) -> None:
        if not self.pool.closed:
            self.pool.close(timeout=5)

    @contextmanager
    def connection(self) -> Iterator[Connection]:
        with self.pool.connection() as connection:
            yield connection

    def ping(self) -> bool:
        with self.connection() as connection:
            row = connection.execute("SELECT 1 AS ok").fetchone()
        return bool(row and row["ok"] == 1)

    def apply_migrations(self) -> None:
        with self.connection() as connection:
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS schema_migrations (
                    versao INTEGER PRIMARY KEY,
                    nome TEXT NOT NULL,
                    aplicada_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
                """
            )

        for version, name, statements in MIGRATIONS:
            with self.connection() as connection:
                applied = connection.execute(
                    "SELECT 1 FROM schema_migrations WHERE versao=%s",
                    (version,),
                ).fetchone()
                if applied:
                    continue
                for statement in statements:
                    connection.execute(statement)
                connection.execute(
                    """
                    INSERT INTO schema_migrations (versao, nome)
                    VALUES (%s, %s)
                    """,
                    (version, name),
                )

    def configure_creator(
        self,
        creator_user_id: UUID | None,
        creator_email: str | None = None,
    ) -> bool:
        """Promove apenas o UUID configurado de uma conta já estabelecida.

        creator_email é aceito por compatibilidade, mas nunca autoriza promoção.
        Uma conta já promovida administrativamente não é rebaixada por sua ausência.
        """
        if creator_user_id is None:
            return False
        with self.connection() as connection:
            target = connection.execute(
                """
                SELECT id, papel_plataforma
                FROM usuarios WHERE id=%s AND ativo=TRUE FOR UPDATE
                """,
                (creator_user_id,),
            ).fetchone()
            if not target:
                return False
            creator_user_id = target["id"]
            if target["papel_plataforma"] == "criador":
                return True
            connection.execute(
                """
                UPDATE usuarios
                SET papel_plataforma='admin', admin_plataforma=TRUE,
                    atualizado_em=CURRENT_TIMESTAMP
                WHERE papel_plataforma='criador' AND id<>%s
                """,
                (creator_user_id,),
            )
            connection.execute(
                """
                UPDATE usuarios
                SET papel_plataforma='criador', admin_plataforma=TRUE,
                    atualizado_em=CURRENT_TIMESTAMP
                WHERE id=%s
                """,
                (creator_user_id,),
            )
            record_audit(
                connection,
                action="plataforma.criador_configurado",
                actor_service="bootstrap-plataforma",
                target_type="usuario",
                target_id=str(creator_user_id),
                details={"papel_anterior": target["papel_plataforma"]},
            )
        return True
