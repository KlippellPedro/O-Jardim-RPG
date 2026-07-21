from __future__ import annotations

from contextlib import contextmanager
from typing import Dict, List

from psycopg.rows import dict_row
from psycopg.types.json import Jsonb
from psycopg_pool import ConnectionPool, PoolTimeout

from . import economia


class SaldoInsuficiente(Exception):
    pass


class DatabaseUnavailable(RuntimeError):
    """Falha de infraestrutura/configuracao ao acessar o PostgreSQL."""


_SCHEMA = (
    """
    CREATE TABLE IF NOT EXISTS carteira (
        guild_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        moeda TEXT NOT NULL,
        saldo INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (guild_id, user_id, moeda)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS inventario (
        guild_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        item_id TEXT NOT NULL,
        titulo TEXT NOT NULL,
        tipo TEXT NOT NULL,
        quantidade INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (guild_id, user_id, item_id)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS cofre (
        guild_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        tier TEXT NOT NULL,
        PRIMARY KEY (guild_id, user_id)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS cofre_saldo (
        guild_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        moeda TEXT NOT NULL,
        saldo INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (guild_id, user_id, moeda)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS roubo_cooldown (
        guild_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        proxima_tentativa TIMESTAMPTZ NOT NULL,
        PRIMARY KEY (guild_id, user_id)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS roubo_cofre_cooldown (
        guild_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        proxima_tentativa TIMESTAMPTZ NOT NULL,
        PRIMARY KEY (guild_id, user_id)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS roubo_protecao_vitima (
        guild_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        protegido_ate TIMESTAMPTZ NOT NULL,
        PRIMARY KEY (guild_id, user_id)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS recompensa (
        guild_id TEXT NOT NULL,
        alvo_user_id TEXT NOT NULL,
        valor_jogadores INTEGER NOT NULL DEFAULT 0,
        valor_sistema INTEGER NOT NULL DEFAULT 0,
        atualizada_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (guild_id, alvo_user_id)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS avisos_pendentes (
        id SERIAL PRIMARY KEY,
        guild_id TEXT NOT NULL,
        mensagem TEXT NOT NULL,
        criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        publicado BOOLEAN NOT NULL DEFAULT FALSE
    )
    """,
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
    """
    CREATE TABLE IF NOT EXISTS cartao (
        guild_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        credito INTEGER NOT NULL DEFAULT 1,
        tier TEXT NOT NULL DEFAULT 'comum',
        PRIMARY KEY (guild_id, user_id)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS divida_cartao (
        guild_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        valor INTEGER NOT NULL DEFAULT 0 CHECK (valor >= 0),
        atualizada_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (guild_id, user_id)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS config (
        guild_id TEXT PRIMARY KEY,
        cambio_rate INTEGER NOT NULL,
        cambio_taxa DOUBLE PRECISION NOT NULL
    )
    """,
    """
    ALTER TABLE config ADD COLUMN IF NOT EXISTS jornal_canal_id TEXT
    """,
    """
    ALTER TABLE config ADD COLUMN IF NOT EXISTS roubo_cofre_chance_base INTEGER
    """,
    """
    ALTER TABLE config ADD COLUMN IF NOT EXISTS roubo_cooldown_horas INTEGER
    """,
    """
    ALTER TABLE cofre ADD COLUMN IF NOT EXISTS seguranca_tier TEXT NOT NULL DEFAULT 'basica'
    """,
    """
    CREATE TABLE IF NOT EXISTS baus_estoque (
        guild_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        bau_id TEXT NOT NULL,
        quantidade INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (guild_id, user_id, bau_id)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS catalogo_itens (
        id TEXT PRIMARY KEY,
        tipo TEXT NOT NULL,
        titulo TEXT NOT NULL,
        conteudo JSONB NOT NULL DEFAULT '{}'::jsonb,
        ativo BOOLEAN NOT NULL DEFAULT TRUE,
        atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
    """,
    """
    CREATE INDEX IF NOT EXISTS catalogo_itens_tipo_idx
    ON catalogo_itens (tipo)
    WHERE ativo = TRUE
    """,
)


class Database:
    def __init__(self, dsn: str, startup_timeout: int = 12):
        if not isinstance(dsn, str) or not dsn.strip():
            raise ValueError("DATABASE_URL vazia")

        # Precisa ser menor que o timeout do pool; assim o worker termina antes
        # do fechamento e nao fica uma thread pendurada no encerramento do Python.
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
            name="banqueiro-db",
        )
        try:
            # Falha cedo e de forma controlada se URL, VLAN ou credenciais estiverem erradas.
            self.pool.open(wait=True, timeout=startup_timeout)
            self._init_schema()
        except Exception as exc:
            self.fechar()
            raise DatabaseUnavailable(
                "nao foi possivel conectar ao PostgreSQL. Verifique DATABASE_URL, "
                "credenciais e se Banqueiro + banco estao com VLAN=true na Discloud."
            ) from exc

    def fechar(self) -> None:
        pool = getattr(self, "pool", None)
        if pool is not None and not pool.closed:
            pool.close(timeout=5)

    @contextmanager
    def _conn(self):
        try:
            # O context manager do psycopg faz commit no sucesso e rollback na excecao.
            with self.pool.connection() as con:
                yield con
        except PoolTimeout as exc:
            raise DatabaseUnavailable(
                "o PostgreSQL nao respondeu dentro do tempo limite"
            ) from exc

    def _init_schema(self) -> None:
        with self._conn() as con:
            for ddl in _SCHEMA:
                con.execute(ddl)
            # Migração única do modelo antigo, em que a dívida era um saldo
            # negativo na carteira. A dívida passa a viver separada para que
            # receber Lunaris não a quite automaticamente.
            con.execute(
                """
                INSERT INTO divida_cartao (guild_id, user_id, valor)
                SELECT guild_id, user_id, -saldo
                FROM carteira
                WHERE moeda='Lunaris' AND saldo < 0
                ON CONFLICT (guild_id, user_id) DO NOTHING
                """
            )
            con.execute(
                "UPDATE carteira SET saldo=0 WHERE moeda='Lunaris' AND saldo < 0"
            )

    def ping(self) -> bool:
        with self._conn() as con:
            return con.execute("SELECT 1 AS ok").fetchone()["ok"] == 1

    @staticmethod
    def _garantir_jogador(con, guild_id: str, user_id: str) -> None:
        for moeda, saldo in economia.SALDO_INICIAL.items():
            con.execute(
                """
                INSERT INTO carteira (guild_id, user_id, moeda, saldo)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT DO NOTHING
                """,
                (guild_id, user_id, moeda, int(saldo)),
            )
        con.execute(
            """
            INSERT INTO cofre (guild_id, user_id, tier)
            VALUES (%s, %s, %s)
            ON CONFLICT DO NOTHING
            """,
            (guild_id, user_id, economia.COFRE_TIER_INICIAL),
        )
        con.execute(
            """
            INSERT INTO cartao (guild_id, user_id, credito, tier)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT DO NOTHING
            """,
            (
                guild_id,
                user_id,
                economia.CREDITO_INICIAL,
                economia.CARTAO_TIER_INICIAL,
            ),
        )

    def garantir_jogador(self, guild_id: str, user_id: str) -> None:
        with self._conn() as con:
            self._garantir_jogador(con, guild_id, user_id)

    def get_carteira(self, guild_id: str, user_id: str) -> Dict[str, int]:
        with self._conn() as con:
            rows = con.execute(
                "SELECT moeda, saldo FROM carteira WHERE guild_id=%s AND user_id=%s",
                (guild_id, user_id),
            ).fetchall()
        return {row["moeda"]: int(row["saldo"]) for row in rows}

    def get_saldo(self, guild_id: str, user_id: str, moeda: str) -> int:
        for nome, saldo in self.get_carteira(guild_id, user_id).items():
            if economia.mesma_moeda(nome, moeda):
                return saldo
        return 0

    def get_divida(self, guild_id: str, user_id: str) -> int:
        with self._conn() as con:
            row = con.execute(
                "SELECT valor FROM divida_cartao WHERE guild_id=%s AND user_id=%s",
                (guild_id, user_id),
            ).fetchone()
        return int(row["valor"]) if row else 0

    def top_carteiras(self, guild_id: str, moeda: str, limite: int = 10) -> List[dict]:
        with self._conn() as con:
            rows = con.execute(
                """
                SELECT user_id, saldo FROM carteira
                WHERE guild_id=%s AND moeda=%s AND saldo > 0
                ORDER BY saldo DESC
                LIMIT %s
                """,
                (guild_id, moeda, int(limite)),
            ).fetchall()
        return [{"user_id": row["user_id"], "saldo": int(row["saldo"])} for row in rows]

    @staticmethod
    def _nome_moeda_real(con, guild_id: str, user_id: str, moeda: str) -> str:
        rows = con.execute(
            "SELECT moeda FROM carteira WHERE guild_id=%s AND user_id=%s",
            (guild_id, user_id),
        ).fetchall()
        for row in rows:
            if economia.mesma_moeda(row["moeda"], moeda):
                return row["moeda"]
        return moeda

    def creditar(self, guild_id: str, user_id: str, moeda: str, quantia: int) -> int:
        if quantia < 0:
            raise ValueError("a quantia nao pode ser negativa")
        with self._conn() as con:
            self._garantir_jogador(con, guild_id, user_id)
            nome = self._nome_moeda_real(con, guild_id, user_id, moeda)
            row = con.execute(
                """
                INSERT INTO carteira (guild_id, user_id, moeda, saldo)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (guild_id, user_id, moeda)
                DO UPDATE SET saldo = carteira.saldo + EXCLUDED.saldo
                RETURNING saldo
                """,
                (guild_id, user_id, nome, int(quantia)),
            ).fetchone()
        return int(row["saldo"])

    def debitar(
        self,
        guild_id: str,
        user_id: str,
        moeda: str,
        quantia: int,
        permitir_negativo_ate: int = 0,
    ) -> int:
        if quantia <= 0:
            raise ValueError("a quantia deve ser positiva")
        limite = max(0, int(permitir_negativo_ate))
        with self._conn() as con:
            self._garantir_jogador(con, guild_id, user_id)
            nome = self._nome_moeda_real(con, guild_id, user_id, moeda)
            atual = con.execute(
                """
                SELECT saldo FROM carteira
                WHERE guild_id=%s AND user_id=%s AND moeda=%s
                FOR UPDATE
                """,
                (guild_id, user_id, nome),
            ).fetchone()
            saldo = int(atual["saldo"]) if atual else 0

            # A linha de crédito só existe em Lunaris. O saldo da carteira
            # nunca fica negativo: o que faltar vira dívida separada.
            if economia.mesma_moeda(nome, "Lunaris") and quantia > saldo and limite > 0:
                row_divida = con.execute(
                    """
                    SELECT valor FROM divida_cartao
                    WHERE guild_id=%s AND user_id=%s
                    FOR UPDATE
                    """,
                    (guild_id, user_id),
                ).fetchone()
                divida = int(row_divida["valor"]) if row_divida else 0
                falta = int(quantia) - saldo
                if divida + falta > limite:
                    disponivel = saldo + max(0, limite - divida)
                    raise SaldoInsuficiente(
                        f"tem {saldo} na carteira e {max(0, limite - divida)} de crédito disponível "
                        f"({disponivel} no total), mas precisa de {quantia} {nome}"
                    )
                con.execute(
                    """
                    UPDATE carteira SET saldo=0
                    WHERE guild_id=%s AND user_id=%s AND moeda=%s
                    """,
                    (guild_id, user_id, nome),
                )
                con.execute(
                    """
                    INSERT INTO divida_cartao (guild_id, user_id, valor, atualizada_em)
                    VALUES (%s, %s, %s, CURRENT_TIMESTAMP)
                    ON CONFLICT (guild_id, user_id) DO UPDATE SET
                        valor=divida_cartao.valor + EXCLUDED.valor,
                        atualizada_em=CURRENT_TIMESTAMP
                    """,
                    (guild_id, user_id, falta),
                )
                return 0

            row = con.execute(
                """
                UPDATE carteira
                SET saldo = saldo - %s
                WHERE guild_id=%s AND user_id=%s AND moeda=%s
                  AND saldo >= %s
                RETURNING saldo
                """,
                (
                    int(quantia),
                    guild_id,
                    user_id,
                    nome,
                    int(quantia),
                ),
            ).fetchone()
            if row is None:
                raise SaldoInsuficiente(
                    f"tem {saldo}, mas precisa de {quantia} {nome}"
                )
        return int(row["saldo"])

    def estornar_debito(
        self,
        guild_id: str,
        user_id: str,
        moeda: str,
        quantia: int,
        divida_criada: int = 0,
    ) -> int:
        """Reverte uma cobrança que falhou depois do débito.

        A parte financiada reduz a dívida criada pela operação; apenas o que
        saiu da carteira volta como saldo. Isso evita transformar um estorno
        de compra a crédito em dinheiro grátis.
        """
        if quantia <= 0 or divida_criada < 0 or divida_criada > quantia:
            raise ValueError("estorno invalido")
        with self._conn() as con:
            self._garantir_jogador(con, guild_id, user_id)
            nome = self._nome_moeda_real(con, guild_id, user_id, moeda)
            saldo_row = con.execute(
                """
                SELECT saldo FROM carteira
                WHERE guild_id=%s AND user_id=%s AND moeda=%s
                FOR UPDATE
                """,
                (guild_id, user_id, nome),
            ).fetchone()
            saldo_atual = int(saldo_row["saldo"]) if saldo_row else 0
            if divida_criada:
                row = con.execute(
                    """
                    UPDATE divida_cartao
                    SET valor=valor-%s, atualizada_em=CURRENT_TIMESTAMP
                    WHERE guild_id=%s AND user_id=%s AND valor >= %s
                    RETURNING valor
                    """,
                    (divida_criada, guild_id, user_id, divida_criada),
                ).fetchone()
                if row is None:
                    raise ValueError("a divida da operacao nao esta mais disponivel para estorno")
            devolvido = int(quantia) - int(divida_criada)
            if devolvido:
                row = con.execute(
                    """
                    UPDATE carteira SET saldo=saldo+%s
                    WHERE guild_id=%s AND user_id=%s AND moeda=%s
                    RETURNING saldo
                    """,
                    (devolvido, guild_id, user_id, nome),
                ).fetchone()
                return int(row["saldo"])
            return saldo_atual

    # ── Saldo guardado no cofre (a salvo de roubo) ──────────────────────────
    def get_cofre_saldo(self, guild_id: str, user_id: str) -> Dict[str, int]:
        with self._conn() as con:
            rows = con.execute(
                "SELECT moeda, saldo FROM cofre_saldo WHERE guild_id=%s AND user_id=%s",
                (guild_id, user_id),
            ).fetchall()
        return {row["moeda"]: int(row["saldo"]) for row in rows}

    def get_saldo_cofre(self, guild_id: str, user_id: str, moeda: str) -> int:
        for nome, saldo in self.get_cofre_saldo(guild_id, user_id).items():
            if economia.mesma_moeda(nome, moeda):
                return saldo
        return 0

    @staticmethod
    def _nome_moeda_real_cofre(con, guild_id: str, user_id: str, moeda: str) -> str:
        rows = con.execute(
            "SELECT moeda FROM cofre_saldo WHERE guild_id=%s AND user_id=%s",
            (guild_id, user_id),
        ).fetchall()
        for row in rows:
            if economia.mesma_moeda(row["moeda"], moeda):
                return row["moeda"]
        return moeda

    def creditar_cofre(self, guild_id: str, user_id: str, moeda: str, quantia: int) -> int:
        if quantia < 0:
            raise ValueError("a quantia nao pode ser negativa")
        with self._conn() as con:
            nome = self._nome_moeda_real_cofre(con, guild_id, user_id, moeda)
            row = con.execute(
                """
                INSERT INTO cofre_saldo (guild_id, user_id, moeda, saldo)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (guild_id, user_id, moeda)
                DO UPDATE SET saldo = cofre_saldo.saldo + EXCLUDED.saldo
                RETURNING saldo
                """,
                (guild_id, user_id, nome, int(quantia)),
            ).fetchone()
        return int(row["saldo"])

    def debitar_cofre(self, guild_id: str, user_id: str, moeda: str, quantia: int) -> int:
        if quantia <= 0:
            raise ValueError("a quantia deve ser positiva")
        with self._conn() as con:
            nome = self._nome_moeda_real_cofre(con, guild_id, user_id, moeda)
            row = con.execute(
                """
                UPDATE cofre_saldo
                SET saldo = saldo - %s
                WHERE guild_id=%s AND user_id=%s AND moeda=%s AND saldo >= %s
                RETURNING saldo
                """,
                (int(quantia), guild_id, user_id, nome, int(quantia)),
            ).fetchone()
            if row is None:
                atual = con.execute(
                    """
                    SELECT saldo FROM cofre_saldo
                    WHERE guild_id=%s AND user_id=%s AND moeda=%s
                    """,
                    (guild_id, user_id, nome),
                ).fetchone()
                saldo = int(atual["saldo"]) if atual else 0
                raise SaldoInsuficiente(
                    f"tem {saldo} guardado, mas precisa de {quantia} {nome}"
                )
        return int(row["saldo"])

    def aplicar_juros_cofre(self, guild_id: str, taxa: float) -> int:
        """Soma `taxa` (ex.: 0.05 = 5%) a todo saldo guardado no cofre do
        servidor. Retorna quantas linhas (jogador+moeda) foram afetadas."""
        if not (0 < taxa < 1):
            raise ValueError("a taxa de juros deve estar entre 0 e 1 (exclusive)")
        with self._conn() as con:
            rows = con.execute(
                """
                UPDATE cofre_saldo
                SET saldo = saldo + FLOOR(saldo * %s)::INTEGER
                WHERE guild_id=%s AND saldo > 0
                RETURNING 1
                """,
                (taxa, guild_id),
            ).fetchall()
        return len(rows)

    def aplicar_juros_divida(self, guild_id: str, user_id: str, taxa: float) -> int:
        """Aumenta a dívida de Lunaris e devolve o novo valor positivo."""
        if taxa <= 0:
            raise ValueError("a taxa de juros deve ser positiva")
        with self._conn() as con:
            row = con.execute(
                """
                UPDATE divida_cartao
                SET valor = valor + GREATEST(1, FLOOR(valor * %s)::INTEGER),
                    atualizada_em=CURRENT_TIMESTAMP
                WHERE guild_id=%s AND user_id=%s AND valor > 0
                RETURNING valor
                """,
                (taxa, guild_id, user_id),
            ).fetchone()
        return int(row["valor"]) if row else 0

    def contar_itens(self, guild_id: str, user_id: str) -> int:
        with self._conn() as con:
            row = con.execute(
                """
                SELECT COALESCE(SUM(quantidade), 0) AS total
                FROM inventario WHERE guild_id=%s AND user_id=%s
                """,
                (guild_id, user_id),
            ).fetchone()
        return int(row["total"])

    def add_item(
        self,
        guild_id: str,
        user_id: str,
        item_id: str,
        titulo: str,
        tipo: str,
        qtd: int = 1,
    ) -> None:
        if qtd <= 0:
            raise ValueError("a quantidade deve ser positiva")
        with self._conn() as con:
            self._garantir_jogador(con, guild_id, user_id)
            con.execute(
                """
                INSERT INTO inventario
                    (guild_id, user_id, item_id, titulo, tipo, quantidade)
                VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT (guild_id, user_id, item_id)
                DO UPDATE SET
                    quantidade = inventario.quantidade + EXCLUDED.quantidade,
                    titulo = EXCLUDED.titulo,
                    tipo = EXCLUDED.tipo
                """,
                (guild_id, user_id, item_id, titulo, tipo, int(qtd)),
            )

    def remover_item(
        self, guild_id: str, user_id: str, item_id: str, qtd: int = 1
    ) -> bool:
        if qtd <= 0:
            raise ValueError("a quantidade deve ser positiva")
        with self._conn() as con:
            row = con.execute(
                """
                UPDATE inventario
                SET quantidade = quantidade - %s
                WHERE guild_id=%s AND user_id=%s AND item_id=%s
                  AND quantidade >= %s
                RETURNING quantidade
                """,
                (int(qtd), guild_id, user_id, item_id, int(qtd)),
            ).fetchone()
            if row is None:
                return False
            if int(row["quantidade"]) == 0:
                con.execute(
                    """
                    DELETE FROM inventario
                    WHERE guild_id=%s AND user_id=%s AND item_id=%s
                    """,
                    (guild_id, user_id, item_id),
                )
        return True

    def listar_inventario(self, guild_id: str, user_id: str) -> List[dict]:
        with self._conn() as con:
            rows = con.execute(
                """
                SELECT item_id, titulo, tipo, quantidade
                FROM inventario
                WHERE guild_id=%s AND user_id=%s AND quantidade > 0
                ORDER BY titulo
                """,
                (guild_id, user_id),
            ).fetchall()
        return [dict(row) for row in rows]

    def get_cofre_tier(self, guild_id: str, user_id: str) -> str:
        with self._conn() as con:
            self._garantir_jogador(con, guild_id, user_id)
            row = con.execute(
                "SELECT tier FROM cofre WHERE guild_id=%s AND user_id=%s",
                (guild_id, user_id),
            ).fetchone()
        return row["tier"] if row else economia.COFRE_TIER_INICIAL

    def set_cofre_tier(self, guild_id: str, user_id: str, tier: str) -> None:
        with self._conn() as con:
            self._garantir_jogador(con, guild_id, user_id)
            con.execute(
                """
                UPDATE cofre SET tier=%s WHERE guild_id=%s AND user_id=%s
                """,
                (tier, guild_id, user_id),
            )

    def get_seguranca_tier(self, guild_id: str, user_id: str) -> str:
        with self._conn() as con:
            self._garantir_jogador(con, guild_id, user_id)
            row = con.execute(
                "SELECT seguranca_tier FROM cofre WHERE guild_id=%s AND user_id=%s",
                (guild_id, user_id),
            ).fetchone()
        return row["seguranca_tier"] if row else economia.SEGURANCA_TIER_INICIAL

    def set_seguranca_tier(self, guild_id: str, user_id: str, tier: str) -> None:
        with self._conn() as con:
            self._garantir_jogador(con, guild_id, user_id)
            con.execute(
                """
                UPDATE cofre SET seguranca_tier=%s WHERE guild_id=%s AND user_id=%s
                """,
                (tier, guild_id, user_id),
            )

    def get_cartao(self, guild_id: str, user_id: str) -> dict:
        with self._conn() as con:
            self._garantir_jogador(con, guild_id, user_id)
            row = con.execute(
                """
                SELECT credito, tier FROM cartao
                WHERE guild_id=%s AND user_id=%s
                """,
                (guild_id, user_id),
            ).fetchone()
        if row:
            return {"credito": int(row["credito"]), "tier": row["tier"]}
        return {
            "credito": economia.CREDITO_INICIAL,
            "tier": economia.CARTAO_TIER_INICIAL,
        }

    def set_credito(self, guild_id: str, user_id: str, valor: int) -> None:
        with self._conn() as con:
            self._garantir_jogador(con, guild_id, user_id)
            con.execute(
                """
                UPDATE cartao SET credito=%s WHERE guild_id=%s AND user_id=%s
                """,
                (int(valor), guild_id, user_id),
            )

    def add_credito(self, guild_id: str, user_id: str, delta: int) -> int:
        with self._conn() as con:
            self._garantir_jogador(con, guild_id, user_id)
            row = con.execute(
                """
                UPDATE cartao SET credito=credito + %s
                WHERE guild_id=%s AND user_id=%s
                RETURNING credito
                """,
                (int(delta), guild_id, user_id),
            ).fetchone()
        return int(row["credito"])

    def set_cartao_tier(self, guild_id: str, user_id: str, tier: str) -> None:
        with self._conn() as con:
            self._garantir_jogador(con, guild_id, user_id)
            con.execute(
                """
                UPDATE cartao SET tier=%s WHERE guild_id=%s AND user_id=%s
                """,
                (tier, guild_id, user_id),
            )

    def get_cambio(self, guild_id: str):
        with self._conn() as con:
            row = con.execute(
                """
                SELECT cambio_rate, cambio_taxa FROM config WHERE guild_id=%s
                """,
                (guild_id,),
            ).fetchone()
        if row:
            return int(row["cambio_rate"]), float(row["cambio_taxa"])
        return economia.CAMBIO_RATE_PADRAO, economia.CAMBIO_TAXA_PADRAO

    def set_cambio(self, guild_id: str, rate: int, taxa: float) -> None:
        with self._conn() as con:
            con.execute(
                """
                INSERT INTO config (guild_id, cambio_rate, cambio_taxa)
                VALUES (%s, %s, %s)
                ON CONFLICT (guild_id) DO UPDATE SET
                    cambio_rate = EXCLUDED.cambio_rate,
                    cambio_taxa = EXCLUDED.cambio_taxa
                """,
                (guild_id, int(rate), float(taxa)),
            )

    def get_jornal_canal(self, guild_id: str):
        with self._conn() as con:
            row = con.execute(
                "SELECT jornal_canal_id FROM config WHERE guild_id=%s",
                (guild_id,),
            ).fetchone()
        return row["jornal_canal_id"] if row else None

    def set_jornal_canal(self, guild_id: str, canal_id: str) -> None:
        with self._conn() as con:
            con.execute(
                """
                INSERT INTO config (guild_id, cambio_rate, cambio_taxa, jornal_canal_id)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (guild_id) DO UPDATE SET
                    jornal_canal_id = EXCLUDED.jornal_canal_id
                """,
                (
                    guild_id,
                    economia.CAMBIO_RATE_PADRAO,
                    economia.CAMBIO_TAXA_PADRAO,
                    canal_id,
                ),
            )

    def get_config_roubo(self, guild_id: str) -> dict:
        """chance_base sempre volta como fração (0.0-1.0), mesmo guardado
        como % inteiro no banco — quem chama não precisa saber se veio do
        /setroubo ou do padrão do código."""
        with self._conn() as con:
            row = con.execute(
                """
                SELECT roubo_cofre_chance_base, roubo_cooldown_horas
                FROM config WHERE guild_id=%s
                """,
                (guild_id,),
            ).fetchone()
        row = row or {}
        chance_base = row.get("roubo_cofre_chance_base")
        cooldown_horas = row.get("roubo_cooldown_horas")
        return {
            "chance_base": (chance_base / 100) if chance_base is not None else (1 - economia.defesa_seguranca(economia.SEGURANCA_TIER_INICIAL)),
            "cooldown_horas": cooldown_horas if cooldown_horas is not None else economia.ROUBO_COOLDOWN_HORAS,
        }

    def set_config_roubo(
        self,
        guild_id: str,
        chance_base_percent: int = None,
        cooldown_horas: int = None,
    ) -> None:
        with self._conn() as con:
            con.execute(
                """
                INSERT INTO config (guild_id, cambio_rate, cambio_taxa,
                    roubo_cofre_chance_base, roubo_cooldown_horas)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (guild_id) DO UPDATE SET
                    roubo_cofre_chance_base = COALESCE(EXCLUDED.roubo_cofre_chance_base, config.roubo_cofre_chance_base),
                    roubo_cooldown_horas = COALESCE(EXCLUDED.roubo_cooldown_horas, config.roubo_cooldown_horas)
                """,
                (
                    guild_id,
                    economia.CAMBIO_RATE_PADRAO,
                    economia.CAMBIO_TAXA_PADRAO,
                    chance_base_percent,
                    cooldown_horas,
                ),
            )

    def add_bau(
        self, guild_id: str, user_id: str, bau_id: str, qtd: int = 1
    ) -> None:
        if qtd <= 0:
            raise ValueError("a quantidade deve ser positiva")
        with self._conn() as con:
            self._garantir_jogador(con, guild_id, user_id)
            con.execute(
                """
                INSERT INTO baus_estoque
                    (guild_id, user_id, bau_id, quantidade)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (guild_id, user_id, bau_id)
                DO UPDATE SET
                    quantidade = baus_estoque.quantidade + EXCLUDED.quantidade
                """,
                (guild_id, user_id, bau_id, int(qtd)),
            )

    def contar_bau(self, guild_id: str, user_id: str, bau_id: str) -> int:
        with self._conn() as con:
            row = con.execute(
                """
                SELECT quantidade FROM baus_estoque
                WHERE guild_id=%s AND user_id=%s AND bau_id=%s
                """,
                (guild_id, user_id, bau_id),
            ).fetchone()
        return int(row["quantidade"]) if row else 0

    def listar_baus_estoque(self, guild_id: str, user_id: str) -> List[dict]:
        with self._conn() as con:
            rows = con.execute(
                """
                SELECT bau_id, quantidade FROM baus_estoque
                WHERE guild_id=%s AND user_id=%s AND quantidade > 0
                """,
                (guild_id, user_id),
            ).fetchall()
        return [dict(row) for row in rows]

    def remover_bau(
        self, guild_id: str, user_id: str, bau_id: str, qtd: int = 1
    ) -> bool:
        if qtd <= 0:
            raise ValueError("a quantidade deve ser positiva")
        with self._conn() as con:
            row = con.execute(
                """
                UPDATE baus_estoque
                SET quantidade = quantidade - %s
                WHERE guild_id=%s AND user_id=%s AND bau_id=%s
                  AND quantidade >= %s
                RETURNING quantidade
                """,
                (int(qtd), guild_id, user_id, bau_id, int(qtd)),
            ).fetchone()
            if row is None:
                return False
            if int(row["quantidade"]) == 0:
                con.execute(
                    """
                    DELETE FROM baus_estoque
                    WHERE guild_id=%s AND user_id=%s AND bau_id=%s
                    """,
                    (guild_id, user_id, bau_id),
                )
        return True

    # ── Cooldown de roubo ────────────────────────────────────────────────
    def get_proxima_tentativa_roubo(self, guild_id: str, user_id: str):
        with self._conn() as con:
            row = con.execute(
                "SELECT proxima_tentativa FROM roubo_cooldown WHERE guild_id=%s AND user_id=%s",
                (guild_id, user_id),
            ).fetchone()
        return row["proxima_tentativa"] if row else None

    def registrar_tentativa_roubo(self, guild_id: str, user_id: str, proxima_tentativa) -> None:
        with self._conn() as con:
            con.execute(
                """
                INSERT INTO roubo_cooldown (guild_id, user_id, proxima_tentativa)
                VALUES (%s, %s, %s)
                ON CONFLICT (guild_id, user_id)
                DO UPDATE SET proxima_tentativa = EXCLUDED.proxima_tentativa
                """,
                (guild_id, user_id, proxima_tentativa),
            )

    def get_proxima_tentativa_roubo_cofre(self, guild_id: str, user_id: str):
        with self._conn() as con:
            row = con.execute(
                "SELECT proxima_tentativa FROM roubo_cofre_cooldown WHERE guild_id=%s AND user_id=%s",
                (guild_id, user_id),
            ).fetchone()
        return row["proxima_tentativa"] if row else None

    def registrar_tentativa_roubo_cofre(self, guild_id: str, user_id: str, proxima_tentativa) -> None:
        with self._conn() as con:
            con.execute(
                """
                INSERT INTO roubo_cofre_cooldown (guild_id, user_id, proxima_tentativa)
                VALUES (%s, %s, %s)
                ON CONFLICT (guild_id, user_id)
                DO UPDATE SET proxima_tentativa = EXCLUDED.proxima_tentativa
                """,
                (guild_id, user_id, proxima_tentativa),
            )

    def get_protecao_vitima(self, guild_id: str, user_id: str):
        with self._conn() as con:
            row = con.execute(
                "SELECT protegido_ate FROM roubo_protecao_vitima WHERE guild_id=%s AND user_id=%s",
                (guild_id, user_id),
            ).fetchone()
        return row["protegido_ate"] if row else None

    def registrar_protecao_vitima(self, guild_id: str, user_id: str, protegido_ate) -> None:
        with self._conn() as con:
            con.execute(
                """
                INSERT INTO roubo_protecao_vitima (guild_id, user_id, protegido_ate)
                VALUES (%s, %s, %s)
                ON CONFLICT (guild_id, user_id)
                DO UPDATE SET protegido_ate = EXCLUDED.protegido_ate
                """,
                (guild_id, user_id, protegido_ate),
            )

    # ── Recompensas (bounty) ─────────────────────────────────────────────
    # Guardamos a parte colocada por jogadores separada da parte gerada por
    # dívida (sistema), pra poder quitar só a parte da dívida quando ela é
    # paga sem captura — sem apagar recompensa que outro jogador pagou de
    # verdade do próprio bolso.
    def get_recompensa(self, guild_id: str, alvo_user_id: str) -> dict:
        with self._conn() as con:
            row = con.execute(
                "SELECT valor_jogadores, valor_sistema FROM recompensa WHERE guild_id=%s AND alvo_user_id=%s",
                (guild_id, alvo_user_id),
            ).fetchone()
        if row:
            vj, vs = int(row["valor_jogadores"]), int(row["valor_sistema"])
            return {"valor": vj + vs, "tem_sistema": vs > 0}
        return {"valor": 0, "tem_sistema": False}

    def adicionar_recompensa(self, guild_id: str, alvo_user_id: str, valor: int, sistema: bool = False) -> int:
        if valor <= 0:
            raise ValueError("a recompensa deve ser positiva")
        coluna = "valor_sistema" if sistema else "valor_jogadores"
        with self._conn() as con:
            row = con.execute(
                f"""
                INSERT INTO recompensa (guild_id, alvo_user_id, {coluna}, atualizada_em)
                VALUES (%s, %s, %s, CURRENT_TIMESTAMP)
                ON CONFLICT (guild_id, alvo_user_id) DO UPDATE SET
                    {coluna} = recompensa.{coluna} + EXCLUDED.{coluna},
                    atualizada_em = CURRENT_TIMESTAMP
                RETURNING valor_jogadores + valor_sistema AS total
                """,
                (guild_id, alvo_user_id, int(valor)),
            ).fetchone()
        return int(row["total"])

    def limpar_recompensa(self, guild_id: str, alvo_user_id: str) -> None:
        """Apaga a recompensa inteira — usar só quando ela foi RESGATADA
        (captura por roubo). Pra quitar só a parte de dívida paga sem
        captura, usar `limpar_recompensas_sistema_quitadas`."""
        with self._conn() as con:
            con.execute(
                "DELETE FROM recompensa WHERE guild_id=%s AND alvo_user_id=%s",
                (guild_id, alvo_user_id),
            )

    def limpar_recompensas_sistema_quitadas(self, guild_id: str) -> List[str]:
        """Zera a parte 'sistema' da recompensa de quem já não está mais em
        dívida (pagou por conta própria, sem ser capturado). A parte que
        outro jogador colocou continua intacta. Devolve os user_ids afetados."""
        with self._conn() as con:
            rows = con.execute(
                """
                UPDATE recompensa r
                SET valor_sistema = 0, atualizada_em = CURRENT_TIMESTAMP
                WHERE r.guild_id=%s AND r.valor_sistema > 0
                  AND NOT EXISTS (
                    SELECT 1 FROM divida_cartao d
                    WHERE d.guild_id = r.guild_id AND d.user_id = r.alvo_user_id
                      AND d.valor > 0
                  )
                RETURNING r.alvo_user_id
                """,
                (guild_id,),
            ).fetchall()
            con.execute(
                """
                DELETE FROM recompensa
                WHERE guild_id=%s AND valor_sistema=0 AND valor_jogadores=0
                """,
                (guild_id,),
            )
        return [row["alvo_user_id"] for row in rows]

    def listar_recompensas(self, guild_id: str, limite: int = 10) -> List[dict]:
        with self._conn() as con:
            rows = con.execute(
                """
                SELECT alvo_user_id, valor_jogadores + valor_sistema AS valor, valor_sistema > 0 AS tem_sistema
                FROM recompensa
                WHERE guild_id=%s AND valor_jogadores + valor_sistema > 0
                ORDER BY valor DESC
                LIMIT %s
                """,
                (guild_id, int(limite)),
            ).fetchall()
        return [
            {"alvo_user_id": row["alvo_user_id"], "valor": int(row["valor"]), "tem_sistema": bool(row["tem_sistema"])}
            for row in rows
        ]

    def zerar_divida(self, guild_id: str, user_id: str) -> int:
        """Perdoa a dívida inteira e devolve o valor removido."""
        with self._conn() as con:
            row = con.execute(
                """
                SELECT valor FROM divida_cartao
                WHERE guild_id=%s AND user_id=%s AND valor > 0
                FOR UPDATE
                """,
                (guild_id, user_id),
            ).fetchone()
            if row is None:
                return 0
            perdoado = int(row["valor"])
            con.execute(
                "UPDATE divida_cartao SET valor=0, atualizada_em=CURRENT_TIMESTAMP WHERE guild_id=%s AND user_id=%s",
                (guild_id, user_id),
            )
        return perdoado

    def pagar_divida(self, guild_id: str, user_id: str, quantia: int) -> dict:
        """Paga parte da dívida usando apenas Lunaris disponíveis na carteira.

        Se a quantia exceder a dívida, cobra somente o valor necessário para
        quitá-la. Retorna valores efetivamente pagos e o saldo restante.
        """
        if quantia <= 0:
            raise ValueError("a quantia deve ser positiva")
        with self._conn() as con:
            self._garantir_jogador(con, guild_id, user_id)
            carteira_row = con.execute(
                """
                SELECT saldo FROM carteira
                WHERE guild_id=%s AND user_id=%s AND moeda='Lunaris'
                FOR UPDATE
                """,
                (guild_id, user_id),
            ).fetchone()
            saldo = int(carteira_row["saldo"]) if carteira_row else 0
            divida_row = con.execute(
                """
                SELECT valor FROM divida_cartao
                WHERE guild_id=%s AND user_id=%s
                FOR UPDATE
                """,
                (guild_id, user_id),
            ).fetchone()
            divida = int(divida_row["valor"]) if divida_row else 0
            if divida <= 0:
                return {"pago": 0, "restante": 0, "saldo": saldo}

            pago = min(int(quantia), divida)
            if saldo < pago:
                raise SaldoInsuficiente(
                    f"tem {saldo} Lunaris na carteira, mas precisa de {pago} para esse pagamento"
                )
            carteira_atualizada = con.execute(
                """
                UPDATE carteira
                SET saldo=saldo-%s
                WHERE guild_id=%s AND user_id=%s AND moeda='Lunaris'
                RETURNING saldo
                """,
                (pago, guild_id, user_id),
            ).fetchone()

            restante = divida - pago
            con.execute(
                """
                UPDATE divida_cartao
                SET valor=%s, atualizada_em=CURRENT_TIMESTAMP
                WHERE guild_id=%s AND user_id=%s
                """,
                (restante, guild_id, user_id),
            )
        return {"pago": pago, "restante": restante, "saldo": int(carteira_atualizada["saldo"])}

    def listar_devedores(self, guild_id: str) -> List[dict]:
        with self._conn() as con:
            rows = con.execute(
                """
                SELECT d.user_id, d.valor AS divida, COALESCE(ct.credito, %s) AS credito
                FROM divida_cartao d
                LEFT JOIN cartao ct ON ct.guild_id = d.guild_id AND ct.user_id = d.user_id
                WHERE d.guild_id=%s AND d.valor > 0
                """,
                (economia.CREDITO_INICIAL, guild_id),
            ).fetchall()
        return [{"user_id": row["user_id"], "divida": int(row["divida"]), "credito": int(row["credito"])} for row in rows]

    def listar_solventes_com_credito_baixo(self, guild_id: str, teto: int) -> List[dict]:
        with self._conn() as con:
            rows = con.execute(
                """
                SELECT ct.user_id, ct.credito
                FROM cartao ct
                WHERE ct.guild_id=%s AND ct.credito < %s
                  AND NOT EXISTS (
                    SELECT 1 FROM divida_cartao d
                    WHERE d.guild_id=ct.guild_id AND d.user_id=ct.user_id AND d.valor > 0
                  )
                """,
                (guild_id, int(teto)),
            ).fetchall()
        return [{"user_id": row["user_id"], "credito": int(row["credito"])} for row in rows]

    # ── Avisos pendentes (fila de anúncios pro Jornalista) ──────────────────
    def criar_aviso(self, guild_id: str, mensagem: str) -> None:
        with self._conn() as con:
            con.execute(
                "INSERT INTO avisos_pendentes (guild_id, mensagem) VALUES (%s, %s)",
                (guild_id, mensagem),
            )

    # ── Extrato (histórico de transações) ───────────────────────────────────
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

    def listar_extrato(self, guild_id: str, user_id: str, limite: int = 15) -> List[dict]:
        with self._conn() as con:
            rows = con.execute(
                """
                SELECT delta, moeda, descricao, criado_em FROM extrato
                WHERE guild_id=%s AND user_id=%s
                ORDER BY criado_em DESC
                LIMIT %s
                """,
                (guild_id, user_id, int(limite)),
            ).fetchall()
        return [
            {"delta": int(row["delta"]), "moeda": row["moeda"], "descricao": row["descricao"], "criado_em": row["criado_em"]}
            for row in rows
        ]

    def resetar_jogador(self, guild_id: str, user_id: str) -> None:
        """[Mestre] apaga carteira, cofre (itens e saldo), inventário e cartão de um jogador."""
        with self._conn() as con:
            for tabela in ("carteira", "inventario", "cofre_saldo", "baus_estoque", "divida_cartao"):
                con.execute(
                    f"DELETE FROM {tabela} WHERE guild_id=%s AND user_id=%s",
                    (guild_id, user_id),
                )
            con.execute(
                "UPDATE cofre SET tier=%s, seguranca_tier=%s WHERE guild_id=%s AND user_id=%s",
                (economia.COFRE_TIER_INICIAL, economia.SEGURANCA_TIER_INICIAL, guild_id, user_id),
            )
            con.execute(
                "UPDATE cartao SET credito=%s, tier=%s WHERE guild_id=%s AND user_id=%s",
                (economia.CREDITO_INICIAL, economia.CARTAO_TIER_INICIAL, guild_id, user_id),
            )
            self._garantir_jogador(con, guild_id, user_id)

    # Catalogo central: o bot consulta o PostgreSQL; JSON serve apenas de semente.
    def catalogo_quantidade(self) -> int:
        with self._conn() as con:
            row = con.execute(
                "SELECT COUNT(*) AS total FROM catalogo_itens WHERE ativo=TRUE"
            ).fetchone()
        return int(row["total"])

    def catalogo_listar(self) -> List[dict]:
        with self._conn() as con:
            rows = con.execute(
                """
                SELECT tipo, id, titulo, conteudo
                FROM catalogo_itens
                WHERE ativo=TRUE
                ORDER BY titulo
                """
            ).fetchall()
        return [
            {
                "tipo": row["tipo"],
                "id": row["id"],
                "titulo": row["titulo"],
                "conteudo": row["conteudo"] or {},
            }
            for row in rows
        ]

    def catalogo_salvar(self, entradas: List[dict]) -> int:
        salvos = 0
        with self._conn() as con:
            for entrada in entradas:
                con.execute(
                    """
                    INSERT INTO catalogo_itens
                        (id, tipo, titulo, conteudo, ativo, atualizado_em)
                    VALUES (%s, %s, %s, %s, TRUE, CURRENT_TIMESTAMP)
                    ON CONFLICT (id) DO UPDATE SET
                        tipo = EXCLUDED.tipo,
                        titulo = EXCLUDED.titulo,
                        conteudo = EXCLUDED.conteudo,
                        ativo = TRUE,
                        atualizado_em = CURRENT_TIMESTAMP
                    """,
                    (
                        entrada["id"],
                        entrada["tipo"],
                        entrada["titulo"],
                        Jsonb(entrada.get("conteudo") or {}),
                    ),
                )
                salvos += 1
        return salvos

    def catalogo_desativar_ausentes(self, ids_mantidos: List[str]) -> int:
        """Desativa (ativo=FALSE) os itens que não estão mais na semente — ex.:
        itens removidos numa republicação. Não apaga, pra preservar histórico e
        os inventários que ainda referenciam o id."""
        if not ids_mantidos:
            return 0
        with self._conn() as con:
            cur = con.execute(
                """
                UPDATE catalogo_itens
                SET ativo = FALSE, atualizado_em = CURRENT_TIMESTAMP
                WHERE ativo = TRUE AND NOT (id = ANY(%s))
                """,
                (list(ids_mantidos),),
            )
            return cur.rowcount
