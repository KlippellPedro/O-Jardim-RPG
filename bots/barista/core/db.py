"""
Acesso ao PostgreSQL compartilhado do Jardim (Banqueiro/Jornalista/Barista,
mesma VLAN da Discloud — ver Plano_Banco_Central.md).

O Barista só declara aqui as tabelas que ele mesmo usa: `carteira` e
`extrato` são as MESMAS tabelas do Banqueiro (IF NOT EXISTS — não importa
qual bot sobe primeiro), usadas só pra debitar o /menu e deixar o gasto
auditável no /extrato do Banqueiro. `playlist`/`playlist_faixa` são novas,
exclusivas do Barista.

Diferente do Banqueiro/Jornalista, a conexão aqui é OPCIONAL (ver main.py):
sem DATABASE_URL configurada, dados e música continuam funcionando
normalmente, só playlist e /menu ficam indisponíveis.
"""

from __future__ import annotations

from contextlib import contextmanager
from typing import List, Optional

from psycopg import errors as pg_errors
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool, PoolTimeout

MOEDA_PADRAO = "Lunaris"

# Evita playlists gigantes disparando dezenas de extrações concorrentes no
# yt-dlp de uma vez só (custo de rede/CPU, e ironicamente parece MAIS bot
# pro YouTube quanto mais pedidos simultâneos vierem do mesmo IP).
MAX_FAIXAS_POR_PLAYLIST = 50


class DatabaseUnavailable(RuntimeError):
    """Falha de infraestrutura/configuração ao acessar o PostgreSQL."""


class SaldoInsuficiente(Exception):
    pass


class PlaylistJaExiste(Exception):
    pass


class PlaylistNaoEncontrada(Exception):
    pass


_SCHEMA = (
    # Mesma tabela do Banqueiro (bots/banqueiro/core/db.py) — dinheiro
    # "vivo" do jogador. O Barista só debita (compra no /menu).
    """
    CREATE TABLE IF NOT EXISTS carteira (
        guild_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        moeda TEXT NOT NULL,
        saldo INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (guild_id, user_id, moeda)
    )
    """,
    # Mesma tabela do Banqueiro — histórico de transações. O Barista escreve
    # aqui pra toda compra do /menu aparecer também no /extrato do Banqueiro.
    """
    CREATE TABLE IF NOT EXISTS extrato (
        id SERIAL PRIMARY KEY,
        guild_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        delta INTEGER NOT NULL,
        moeda TEXT NOT NULL,
        descricao TEXT NOT NULL,
        criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
    """,
    """
    CREATE INDEX IF NOT EXISTS extrato_jogador_idx
    ON extrato (guild_id, user_id, criado_em DESC)
    """,
    # Novas, só do Barista.
    """
    CREATE TABLE IF NOT EXISTS playlist (
        id SERIAL PRIMARY KEY,
        guild_id TEXT NOT NULL,
        nome TEXT NOT NULL,
        criado_por TEXT NOT NULL,
        criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
    """,
    # Nome único por servidor, mas sem diferenciar maiúscula/minúscula
    # ("Combate" e "combate" são a mesma playlist pro jogador).
    """
    CREATE UNIQUE INDEX IF NOT EXISTS playlist_nome_idx
    ON playlist (guild_id, LOWER(nome))
    """,
    """
    CREATE TABLE IF NOT EXISTS playlist_faixa (
        id SERIAL PRIMARY KEY,
        playlist_id INTEGER NOT NULL REFERENCES playlist(id) ON DELETE CASCADE,
        titulo TEXT NOT NULL,
        url_pagina TEXT NOT NULL,
        adicionado_por TEXT NOT NULL,
        adicionado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
    """,
)


class Database:
    def __init__(self, dsn: str, startup_timeout: int = 12):
        if not isinstance(dsn, str) or not dsn.strip():
            raise ValueError("DATABASE_URL vazia")

        connect_timeout = max(2, min(5, int(startup_timeout) - 1))
        self.pool = ConnectionPool(
            conninfo=dsn,
            min_size=1,
            max_size=5,
            open=False,
            timeout=10,
            reconnect_timeout=max(5, int(startup_timeout)),
            kwargs={"row_factory": dict_row, "connect_timeout": connect_timeout},
            check=ConnectionPool.check_connection,
            name="barista-db",
        )
        try:
            self.pool.open(wait=True, timeout=startup_timeout)
            self._init_schema()
        except Exception as exc:
            self.fechar()
            raise DatabaseUnavailable(
                "não foi possível conectar ao PostgreSQL. Verifique DATABASE_URL, "
                "credenciais e se Barista + banco estão com VLAN=true na Discloud."
            ) from exc

    def fechar(self) -> None:
        pool = getattr(self, "pool", None)
        if pool is not None and not pool.closed:
            pool.close(timeout=5)

    @contextmanager
    def _conn(self):
        try:
            with self.pool.connection() as con:
                yield con
        except PoolTimeout as exc:
            raise DatabaseUnavailable(
                "o PostgreSQL não respondeu dentro do tempo limite"
            ) from exc
        except (SaldoInsuficiente, PlaylistJaExiste, PlaylistNaoEncontrada, ValueError):
            raise
        except Exception as exc:
            raise DatabaseUnavailable(
                "o PostgreSQL ficou indisponível durante a operação"
            ) from exc

    def _init_schema(self) -> None:
        with self._conn() as con:
            for ddl in _SCHEMA:
                con.execute(ddl)

    def ping(self) -> bool:
        with self._conn() as con:
            return con.execute("SELECT 1 AS ok").fetchone()["ok"] == 1

    # ── Carteira (debita só — quem credita/consulta de verdade é o Banqueiro) ──
    @staticmethod
    def _garantir_carteira(con, guild_id: str, user_id: str, moeda: str) -> None:
        con.execute(
            """
            INSERT INTO carteira (guild_id, user_id, moeda, saldo)
            VALUES (%s, %s, %s, 0)
            ON CONFLICT DO NOTHING
            """,
            (guild_id, user_id, moeda),
        )

    def debitar_carteira(
        self,
        guild_id: str,
        user_id: str,
        quantia: int,
        moeda: str = MOEDA_PADRAO,
    ) -> int:
        """Debita da carteira do jogador (mesma tabela do Banqueiro). Levanta
        SaldoInsuficiente sem debitar nada se o saldo não cobrir a quantia."""
        if quantia <= 0:
            raise ValueError("a quantia deve ser positiva")
        with self._conn() as con:
            self._garantir_carteira(con, guild_id, user_id, moeda)
            row = con.execute(
                """
                UPDATE carteira
                SET saldo = saldo - %s
                WHERE guild_id=%s AND user_id=%s AND moeda=%s AND saldo >= %s
                RETURNING saldo
                """,
                (int(quantia), guild_id, user_id, moeda, int(quantia)),
            ).fetchone()
            if row is None:
                atual = con.execute(
                    "SELECT saldo FROM carteira WHERE guild_id=%s AND user_id=%s AND moeda=%s",
                    (guild_id, user_id, moeda),
                ).fetchone()
                saldo = int(atual["saldo"]) if atual else 0
                raise SaldoInsuficiente(f"tem {saldo}, mas precisa de {quantia} {moeda}")
        return int(row["saldo"])

    def comprar_item_menu(
        self,
        guild_id: str,
        user_id: str,
        quantia: int,
        descricao: str,
        moeda: str = MOEDA_PADRAO,
    ) -> int:
        """Debita e registra o extrato na mesma transação.

        Assim uma falha entre as duas escritas nunca deixa o jogador sem o
        dinheiro e sem o registro correspondente no /extrato.
        """
        if quantia <= 0:
            raise ValueError("a quantia deve ser positiva")
        if not descricao or not descricao.strip():
            raise ValueError("a descrição da compra não pode ser vazia")

        with self._conn() as con:
            self._garantir_carteira(con, guild_id, user_id, moeda)
            row = con.execute(
                """
                UPDATE carteira
                SET saldo = saldo - %s
                WHERE guild_id=%s AND user_id=%s AND moeda=%s AND saldo >= %s
                RETURNING saldo
                """,
                (int(quantia), guild_id, user_id, moeda, int(quantia)),
            ).fetchone()
            if row is None:
                atual = con.execute(
                    "SELECT saldo FROM carteira WHERE guild_id=%s AND user_id=%s AND moeda=%s",
                    (guild_id, user_id, moeda),
                ).fetchone()
                saldo = int(atual["saldo"]) if atual else 0
                raise SaldoInsuficiente(f"tem {saldo}, mas precisa de {quantia} {moeda}")

            con.execute(
                """
                INSERT INTO extrato (guild_id, user_id, delta, moeda, descricao)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (guild_id, user_id, -int(quantia), moeda, descricao.strip()),
            )

        return int(row["saldo"])

    def registrar_extrato(self, guild_id: str, user_id: str, delta: int, moeda: str, descricao: str) -> None:
        if delta == 0:
            return
        with self._conn() as con:
            con.execute(
                """
                INSERT INTO extrato (guild_id, user_id, delta, moeda, descricao)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (guild_id, user_id, int(delta), moeda, descricao),
            )

    # ── Playlist ─────────────────────────────────────────────────────────────
    def criar_playlist(self, guild_id: str, nome: str, criado_por: str) -> int:
        nome = nome.strip()
        if not nome:
            raise ValueError("nome da playlist não pode ser vazio")
        # Confia no índice único (playlist_nome_idx) como fonte de verdade —
        # não faz SELECT-depois-INSERT, que teria uma corrida entre checar e
        # inserir se duas pessoas criassem a mesma playlist ao mesmo tempo.
        with self._conn() as con:
            try:
                row = con.execute(
                    """
                    INSERT INTO playlist (guild_id, nome, criado_por)
                    VALUES (%s, %s, %s)
                    RETURNING id
                    """,
                    (guild_id, nome, criado_por),
                ).fetchone()
            except pg_errors.UniqueViolation as exc:
                raise PlaylistJaExiste(f'já existe uma playlist chamada "{nome}" neste servidor.') from exc
        return int(row["id"])

    @staticmethod
    def _achar_playlist_id(con, guild_id: str, nome: str) -> Optional[int]:
        row = con.execute(
            "SELECT id FROM playlist WHERE guild_id=%s AND LOWER(nome)=LOWER(%s)",
            (guild_id, nome),
        ).fetchone()
        return int(row["id"]) if row else None

    def adicionar_faixa(
        self,
        guild_id: str,
        nome: str,
        titulo: str,
        url_pagina: str,
        adicionado_por: str,
    ) -> int:
        """Adiciona uma faixa ao fim da playlist. Devolve quantas faixas ela
        tem agora. Levanta PlaylistNaoEncontrada se o nome não existir."""
        with self._conn() as con:
            playlist_id = self._achar_playlist_id(con, guild_id, nome)
            if playlist_id is None:
                raise PlaylistNaoEncontrada(f'não achei nenhuma playlist chamada "{nome}".')
            atual = con.execute(
                "SELECT COUNT(*) AS n FROM playlist_faixa WHERE playlist_id=%s",
                (playlist_id,),
            ).fetchone()
            if int(atual["n"]) >= MAX_FAIXAS_POR_PLAYLIST:
                raise ValueError(f"playlist já tem o máximo de {MAX_FAIXAS_POR_PLAYLIST} faixas.")
            con.execute(
                """
                INSERT INTO playlist_faixa (playlist_id, titulo, url_pagina, adicionado_por)
                VALUES (%s, %s, %s, %s)
                """,
                (playlist_id, titulo, url_pagina, adicionado_por),
            )
            total = con.execute(
                "SELECT COUNT(*) AS n FROM playlist_faixa WHERE playlist_id=%s",
                (playlist_id,),
            ).fetchone()
        return int(total["n"])

    def obter_playlist(self, guild_id: str, nome: str) -> Optional[dict]:
        with self._conn() as con:
            playlist = con.execute(
                "SELECT id, nome, criado_por FROM playlist WHERE guild_id=%s AND LOWER(nome)=LOWER(%s)",
                (guild_id, nome),
            ).fetchone()
            if not playlist:
                return None
            faixas = con.execute(
                """
                SELECT titulo, url_pagina FROM playlist_faixa
                WHERE playlist_id=%s ORDER BY id
                """,
                (playlist["id"],),
            ).fetchall()
        return {
            "id": int(playlist["id"]),
            "nome": playlist["nome"],
            "criado_por": playlist["criado_por"],
            "faixas": [{"titulo": f["titulo"], "url_pagina": f["url_pagina"]} for f in faixas],
        }

    def listar_playlists(self, guild_id: str) -> List[dict]:
        with self._conn() as con:
            rows = con.execute(
                """
                SELECT p.nome, p.criado_por, COUNT(pf.id) AS n_faixas
                FROM playlist p
                LEFT JOIN playlist_faixa pf ON pf.playlist_id = p.id
                WHERE p.guild_id=%s
                GROUP BY p.id, p.nome, p.criado_por
                ORDER BY p.nome
                """,
                (guild_id,),
            ).fetchall()
        return [
            {"nome": row["nome"], "criado_por": row["criado_por"], "n_faixas": int(row["n_faixas"])}
            for row in rows
        ]

    def apagar_playlist(self, guild_id: str, nome: str) -> bool:
        with self._conn() as con:
            row = con.execute(
                "DELETE FROM playlist WHERE guild_id=%s AND LOWER(nome)=LOWER(%s) RETURNING id",
                (guild_id, nome),
            ).fetchone()
        return row is not None
