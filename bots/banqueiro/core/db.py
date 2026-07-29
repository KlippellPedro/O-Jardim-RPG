from __future__ import annotations

import math
from contextlib import contextmanager
from typing import Dict, List, Optional

from psycopg.rows import dict_row
from psycopg.types.json import Jsonb
from psycopg_pool import ConnectionPool, PoolTimeout

from . import economia


class SaldoInsuficiente(Exception):
    pass


class AlvoProtegido(Exception):
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
    CREATE TABLE IF NOT EXISTS roubo_alvo_reserva (
        guild_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        reservado_ate TIMESTAMPTZ NOT NULL,
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
    ALTER TABLE config ADD COLUMN IF NOT EXISTS mestre_protegido_id TEXT
    """,
    # Constantes econômicas que eram fixas no código (core/economia.py) e
    # passam a poder ser ajustadas por servidor via /seteconomia. NULL
    # continua significando "usa o padrão do código".
    """
    ALTER TABLE config ADD COLUMN IF NOT EXISTS venda_ratio_percent INTEGER
    """,
    """
    ALTER TABLE config ADD COLUMN IF NOT EXISTS cofre_saque_taxa_percent INTEGER
    """,
    """
    ALTER TABLE config ADD COLUMN IF NOT EXISTS juros_cofre_taxa_percent INTEGER
    """,
    """
    ALTER TABLE config ADD COLUMN IF NOT EXISTS leilao_corte_percent INTEGER
    """,
    """
    ALTER TABLE config ADD COLUMN IF NOT EXISTS loteria_preco_bilhete INTEGER
    """,
    """
    ALTER TABLE config ADD COLUMN IF NOT EXISTS loteria_corte_percent INTEGER
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
    """
    ALTER TABLE config ADD COLUMN IF NOT EXISTS cargo_procurado_id TEXT
    """,
    """
    ALTER TABLE config ADD COLUMN IF NOT EXISTS cargo_cacador_id TEXT
    """,
    """
    ALTER TABLE config ADD COLUMN IF NOT EXISTS cambio_auto BOOLEAN NOT NULL DEFAULT FALSE
    """,
    """
    ALTER TABLE config ADD COLUMN IF NOT EXISTS crise_economica BOOLEAN NOT NULL DEFAULT FALSE
    """,
    """
    CREATE TABLE IF NOT EXISTS protecoes_ativas (
        guild_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        tipo TEXT NOT NULL,
        quantidade INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (guild_id, user_id, tipo)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS cacador_recompensa (
        guild_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        expira_em TIMESTAMPTZ NOT NULL,
        PRIMARY KEY (guild_id, user_id)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS cambio_fluxo (
        id SERIAL PRIMARY KEY,
        guild_id TEXT NOT NULL,
        direcao TEXT NOT NULL CHECK (direcao IN ('compra_solares', 'venda_solares')),
        quantia INTEGER NOT NULL,
        criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
    """,
    """
    CREATE INDEX IF NOT EXISTS cambio_fluxo_guild_idx ON cambio_fluxo (guild_id, criado_em)
    """,
    """
    CREATE TABLE IF NOT EXISTS leiloes (
        id SERIAL PRIMARY KEY,
        guild_id TEXT NOT NULL,
        vendedor_id TEXT NOT NULL,
        kind TEXT NOT NULL CHECK (kind IN ('item', 'bau')),
        ref TEXT NOT NULL,
        titulo TEXT NOT NULL,
        moeda TEXT NOT NULL,
        lance_atual INTEGER NOT NULL DEFAULT 0,
        lance_minimo INTEGER NOT NULL,
        vencedor_id TEXT,
        canal_id TEXT NOT NULL,
        mensagem_id TEXT,
        criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        expira_em TIMESTAMPTZ NOT NULL,
        status TEXT NOT NULL DEFAULT 'ativo'
            CHECK (status IN ('ativo', 'encerrado', 'sem_lances', 'cancelado'))
    )
    """,
    """
    CREATE INDEX IF NOT EXISTS leiloes_ativos_idx ON leiloes (status, expira_em)
    """,
    """
    CREATE TABLE IF NOT EXISTS investimentos (
        id SERIAL PRIMARY KEY,
        guild_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        moeda TEXT NOT NULL,
        valor INTEGER NOT NULL,
        criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        vence_em TIMESTAMPTZ NOT NULL,
        status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'maturado'))
    )
    """,
    """
    CREATE INDEX IF NOT EXISTS investimentos_vencidos_idx ON investimentos (status, vence_em)
    """,
    """
    CREATE TABLE IF NOT EXISTS emprestimos (
        id SERIAL PRIMARY KEY,
        guild_id TEXT NOT NULL,
        credor_id TEXT NOT NULL,
        devedor_id TEXT NOT NULL,
        moeda TEXT NOT NULL,
        valor_original INTEGER NOT NULL,
        valor_devido INTEGER NOT NULL,
        juros_diarios DOUBLE PRECISION NOT NULL,
        criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        aceito_em TIMESTAMPTZ,
        vence_em TIMESTAMPTZ,
        ultimo_juros_em TIMESTAMPTZ,
        status TEXT NOT NULL DEFAULT 'pendente_aceite'
            CHECK (status IN ('pendente_aceite', 'recusado', 'ativo', 'quitado', 'inadimplente'))
    )
    """,
    """
    CREATE INDEX IF NOT EXISTS emprestimos_ativos_idx ON emprestimos (status, vence_em)
    """,
    """
    CREATE TABLE IF NOT EXISTS loteria_bilhetes (
        guild_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        quantidade INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (guild_id, user_id)
    )
    """,
    # Item leiloado pode ter sido reservado no cofre da plataforma (vendedor
    # com conta vinculada) ou removido localmente (modo legado, como sempre
    # foi): a resolução do leilão (até 72h depois, `ciclo_leiloes`) precisa
    # saber qual dos dois pra devolver/entregar no lugar certo. Baú nunca usa
    # o cofre, então sempre grava 'legado'. A referência da reserva no cofre
    # é reconstruída como f"leilao:{guild_id}:{leilao_id}": não precisa de
    # coluna própria.
    """
    ALTER TABLE leiloes ADD COLUMN IF NOT EXISTS modo_posse TEXT NOT NULL DEFAULT 'legado'
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

    def top_poupanca(self, guild_id: str, moeda: str, limite: int = 10) -> List[dict]:
        with self._conn() as con:
            rows = con.execute(
                """
                SELECT user_id, saldo FROM cofre_saldo
                WHERE guild_id=%s AND moeda=%s AND saldo > 0
                ORDER BY saldo DESC
                LIMIT %s
                """,
                (guild_id, moeda, int(limite)),
            ).fetchall()
        return [{"user_id": row["user_id"], "saldo": int(row["saldo"])} for row in rows]

    def top_patrimonio(self, guild_id: str, limite: int = 10) -> List[dict]:
        """Carteira + cofre em Lunaris: as outras moedas ficam de fora pra
        não somar unidades incompatíveis num único ranking."""
        with self._conn() as con:
            rows = con.execute(
                """
                SELECT user_id, SUM(saldo) AS total FROM (
                    SELECT user_id, saldo FROM carteira WHERE guild_id=%s AND moeda='Lunaris'
                    UNION ALL
                    SELECT user_id, saldo FROM cofre_saldo WHERE guild_id=%s AND moeda='Lunaris'
                ) unificado
                GROUP BY user_id
                HAVING SUM(saldo) > 0
                ORDER BY total DESC
                LIMIT %s
                """,
                (guild_id, guild_id, int(limite)),
            ).fetchall()
        return [{"user_id": row["user_id"], "total": int(row["total"])} for row in rows]

    def top_roubos(self, guild_id: str, limite: int = 10) -> List[dict]:
        with self._conn() as con:
            rows = con.execute(
                """
                SELECT user_id, COUNT(*) AS quantidade FROM extrato
                WHERE guild_id=%s AND (descricao LIKE %s OR descricao LIKE %s)
                GROUP BY user_id
                ORDER BY quantidade DESC
                LIMIT %s
                """,
                (guild_id, "Roubado de%", "Cofre arrombado de%", int(limite)),
            ).fetchall()
        return [{"user_id": row["user_id"], "quantidade": int(row["quantidade"])} for row in rows]

    def top_recompensas(self, guild_id: str, limite: int = 10) -> List[dict]:
        with self._conn() as con:
            rows = con.execute(
                """
                SELECT user_id, SUM(delta) AS total FROM extrato
                WHERE guild_id=%s AND descricao LIKE %s
                GROUP BY user_id
                ORDER BY total DESC
                LIMIT %s
                """,
                (guild_id, "Recompensa por capturar%", int(limite)),
            ).fetchall()
        return [{"user_id": row["user_id"], "total": int(row["total"])} for row in rows]

    def top_leiloes_vendidos(self, guild_id: str, limite: int = 10) -> List[dict]:
        with self._conn() as con:
            rows = con.execute(
                """
                SELECT vendedor_id AS user_id, COUNT(*) AS quantidade FROM leiloes
                WHERE guild_id=%s AND status='encerrado'
                GROUP BY vendedor_id
                ORDER BY quantidade DESC
                LIMIT %s
                """,
                (guild_id, int(limite)),
            ).fetchall()
        return [{"user_id": row["user_id"], "quantidade": int(row["quantidade"])} for row in rows]

    def contar_leiloes_vencidos(self, guild_id: str, user_id: str) -> int:
        with self._conn() as con:
            row = con.execute(
                "SELECT COUNT(*) AS n FROM leiloes WHERE guild_id=%s AND vencedor_id=%s AND status='encerrado'",
                (guild_id, user_id),
            ).fetchone()
        return int(row["n"]) if row else 0

    def resumo_extrato(self, guild_id: str, user_id: str) -> dict:
        with self._conn() as con:
            por_moeda = con.execute(
                """
                SELECT moeda,
                       COALESCE(SUM(delta) FILTER (WHERE delta > 0), 0) AS ganhos,
                       COALESCE(SUM(-delta) FILTER (WHERE delta < 0), 0) AS perdas
                FROM extrato
                WHERE guild_id=%s AND user_id=%s
                GROUP BY moeda
                """,
                (guild_id, user_id),
            ).fetchall()
            agregados = con.execute(
                """
                SELECT
                    COALESCE(SUM(delta) FILTER (WHERE descricao LIKE %s OR descricao LIKE %s), 0) AS roubou,
                    COALESCE(SUM(-delta) FILTER (WHERE descricao LIKE %s OR descricao LIKE %s), 0) AS foi_roubado,
                    COALESCE(SUM(delta) FILTER (WHERE descricao LIKE %s), 0) AS recompensas_coletadas
                FROM extrato
                WHERE guild_id=%s AND user_id=%s AND moeda='Lunaris'
                """,
                (
                    "Roubado de%", "Cofre arrombado de%",
                    "Roubado por%", "Cofre arrombado por%",
                    "Recompensa por capturar%",
                    guild_id, user_id,
                ),
            ).fetchone()
        return {
            "por_moeda": {row["moeda"]: {"ganhos": int(row["ganhos"]), "perdas": int(row["perdas"])} for row in por_moeda},
            "roubou": int(agregados["roubou"]) if agregados else 0,
            "foi_roubado": int(agregados["foi_roubado"]) if agregados else 0,
            "recompensas_coletadas": int(agregados["recompensas_coletadas"]) if agregados else 0,
        }

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

    # ── Saldo guardado no cofre (protegido por segurança própria) ──────────
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

    # ── Leitura direta do cofre da plataforma (cofre unificado) ────────────
    # O bot e a plataforma web compartilham o mesmo PostgreSQL (VLAN da
    # Discloud): plataforma/routers/vault.py::get_vault_bank_tier já faz o
    # inverso (lê `inventario`/`cofre` daqui). Ler direto evita um round-trip
    # HTTP em cada tecla de autocomplete de /oferecer, /trocar e
    # /leilao_iniciar, onde o Discord só dá ~3s e o cliente HTTP tem timeout
    # de 10s. `None` de retorno = conta não vinculada a essa guild (modo
    # legado); escrita continua indo sempre pela API (core/inventario.py).
    def par_cofre_plataforma(self, guild_id: str, user_id: str):
        """(usuario_id, campanha_id) vinculados a esse par Discord, ou None."""
        with self._conn() as con:
            row = con.execute(
                """
                SELECT d.usuario_id, cd.campanha_id
                FROM contas_discord d
                JOIN campanhas_discord cd ON cd.discord_guild_id=%s
                JOIN membros_campanha m
                  ON m.campanha_id=cd.campanha_id AND m.usuario_id=d.usuario_id
                WHERE d.discord_user_id=%s AND m.status='ativo'
                """,
                (guild_id, user_id),
            ).fetchone()
        return dict(row) if row else None

    def listar_cofre_plataforma(self, guild_id: str, user_id: str) -> Optional[List[dict]]:
        par = self.par_cofre_plataforma(guild_id, user_id)
        if par is None:
            return None
        with self._conn() as con:
            rows = con.execute(
                """
                SELECT item_id, titulo, quantidade, dados, origem
                FROM cofre_itens_usuario
                WHERE usuario_id=%s AND campanha_id=%s
                ORDER BY titulo
                """,
                (par["usuario_id"], par["campanha_id"]),
            ).fetchall()
        return [dict(row) for row in rows]

    def contar_cofre_plataforma(self, guild_id: str, user_id: str) -> Optional[int]:
        """Itens guardados + reservados (leilão em aberto ainda ocupa
        espaço). Espelha `_vault_item_total` de plataforma/routers/internal.py."""
        par = self.par_cofre_plataforma(guild_id, user_id)
        if par is None:
            return None
        with self._conn() as con:
            row = con.execute(
                """
                SELECT
                    COALESCE((SELECT SUM(quantidade) FROM cofre_itens_usuario
                               WHERE usuario_id=%s AND campanha_id=%s), 0)
                    + COALESCE((SELECT SUM(quantidade) FROM reservas_cofre
                                 WHERE usuario_id=%s AND campanha_id=%s AND status='reservada'), 0)
                    AS total
                """,
                (par["usuario_id"], par["campanha_id"], par["usuario_id"], par["campanha_id"]),
            ).fetchone()
        return int(row["total"])

    def reservas_cofre_plataforma(self, guild_id: str, user_id: str) -> Optional[List[dict]]:
        par = self.par_cofre_plataforma(guild_id, user_id)
        if par is None:
            return None
        with self._conn() as con:
            rows = con.execute(
                """
                SELECT referencia, origem, item_id, titulo, quantidade, expira_em
                FROM reservas_cofre
                WHERE usuario_id=%s AND campanha_id=%s AND status='reservada'
                ORDER BY expira_em
                """,
                (par["usuario_id"], par["campanha_id"]),
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

    def get_mestre_protegido(self, guild_id: str):
        with self._conn() as con:
            row = con.execute(
                "SELECT mestre_protegido_id FROM config WHERE guild_id=%s",
                (guild_id,),
            ).fetchone()
        return row["mestre_protegido_id"] if row else None

    def set_mestre_protegido(self, guild_id: str, user_id=None) -> None:
        """Define uma unica conta imune a roubos no servidor.

        ``user_id=None`` remove a protecao sem apagar as demais configuracoes
        economicas da guild.
        """
        with self._conn() as con:
            con.execute(
                """
                INSERT INTO config
                    (guild_id, cambio_rate, cambio_taxa, mestre_protegido_id)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (guild_id) DO UPDATE SET
                    mestre_protegido_id = EXCLUDED.mestre_protegido_id
                """,
                (
                    guild_id,
                    economia.CAMBIO_RATE_PADRAO,
                    economia.CAMBIO_TAXA_PADRAO,
                    str(user_id) if user_id is not None else None,
                ),
            )

    def get_config_roubo(self, guild_id: str) -> dict:
        """chance_base sempre volta como fração (0.0-1.0), mesmo guardado
        como % inteiro no banco: quem chama não precisa saber se veio do
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

    def get_economia_config(self, guild_id: str) -> dict:
        """Todos os percentuais voltam como fração (0.0-1.0); NULL no banco
        significa "usa o padrão do código" (core/economia.py)."""
        with self._conn() as con:
            row = con.execute(
                """
                SELECT venda_ratio_percent, cofre_saque_taxa_percent, juros_cofre_taxa_percent,
                       leilao_corte_percent, loteria_preco_bilhete, loteria_corte_percent
                FROM config WHERE guild_id=%s
                """,
                (guild_id,),
            ).fetchone()
        row = row or {}

        def _pct(chave, padrao):
            valor = row.get(chave)
            return (valor / 100) if valor is not None else padrao

        return {
            "venda_ratio": _pct("venda_ratio_percent", economia.VENDA_RATIO),
            "cofre_saque_taxa": _pct("cofre_saque_taxa_percent", economia.COFRE_SAQUE_TAXA),
            "juros_cofre_taxa": _pct("juros_cofre_taxa_percent", economia.JUROS_COFRE_TAXA),
            "leilao_corte": _pct("leilao_corte_percent", economia.LEILAO_CORTE_CASA),
            "loteria_preco_bilhete": (
                row["loteria_preco_bilhete"]
                if row.get("loteria_preco_bilhete") is not None
                else economia.LOTERIA_PRECO_BILHETE
            ),
            "loteria_corte": _pct("loteria_corte_percent", economia.LOTERIA_CORTE_CASA),
        }

    def set_economia_config(
        self,
        guild_id: str,
        venda_ratio_percent: int = None,
        cofre_saque_taxa_percent: int = None,
        juros_cofre_taxa_percent: int = None,
        leilao_corte_percent: int = None,
        loteria_preco_bilhete: int = None,
        loteria_corte_percent: int = None,
    ) -> None:
        with self._conn() as con:
            con.execute(
                """
                INSERT INTO config (guild_id, cambio_rate, cambio_taxa,
                    venda_ratio_percent, cofre_saque_taxa_percent, juros_cofre_taxa_percent,
                    leilao_corte_percent, loteria_preco_bilhete, loteria_corte_percent)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (guild_id) DO UPDATE SET
                    venda_ratio_percent = COALESCE(EXCLUDED.venda_ratio_percent, config.venda_ratio_percent),
                    cofre_saque_taxa_percent = COALESCE(EXCLUDED.cofre_saque_taxa_percent, config.cofre_saque_taxa_percent),
                    juros_cofre_taxa_percent = COALESCE(EXCLUDED.juros_cofre_taxa_percent, config.juros_cofre_taxa_percent),
                    leilao_corte_percent = COALESCE(EXCLUDED.leilao_corte_percent, config.leilao_corte_percent),
                    loteria_preco_bilhete = COALESCE(EXCLUDED.loteria_preco_bilhete, config.loteria_preco_bilhete),
                    loteria_corte_percent = COALESCE(EXCLUDED.loteria_corte_percent, config.loteria_corte_percent)
                """,
                (
                    guild_id,
                    economia.CAMBIO_RATE_PADRAO,
                    economia.CAMBIO_TAXA_PADRAO,
                    venda_ratio_percent,
                    cofre_saque_taxa_percent,
                    juros_cofre_taxa_percent,
                    leilao_corte_percent,
                    loteria_preco_bilhete,
                    loteria_corte_percent,
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

    def reservar_tentativa_roubo(
        self, guild_id: str, user_id: str, agora, proxima_tentativa
    ):
        return self._reservar_cooldown_roubo(
            "roubo_cooldown", guild_id, user_id, agora, proxima_tentativa
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

    def reservar_tentativa_roubo_cofre(
        self, guild_id: str, user_id: str, agora, proxima_tentativa
    ):
        return self._reservar_cooldown_roubo(
            "roubo_cofre_cooldown", guild_id, user_id, agora, proxima_tentativa
        )

    def _reservar_cooldown_roubo(
        self, tabela: str, guild_id: str, user_id: str, agora, proxima_tentativa
    ):
        """Consome o cooldown em uma unica transacao.

        O ``WHERE`` do upsert impede duas interacoes concorrentes do mesmo
        jogador de passarem juntas pela verificacao. Retorna ``(reservado,
        proxima_atual)``.
        """
        if tabela not in {"roubo_cooldown", "roubo_cofre_cooldown"}:
            raise ValueError("tabela de cooldown invalida")
        with self._conn() as con:
            row = con.execute(
                f"""
                INSERT INTO {tabela} (guild_id, user_id, proxima_tentativa)
                VALUES (%s, %s, %s)
                ON CONFLICT (guild_id, user_id) DO UPDATE SET
                    proxima_tentativa = EXCLUDED.proxima_tentativa
                WHERE {tabela}.proxima_tentativa <= %s
                RETURNING proxima_tentativa
                """,
                (guild_id, user_id, proxima_tentativa, agora),
            ).fetchone()
            if row is not None:
                return True, row["proxima_tentativa"]
            atual = con.execute(
                f"""
                SELECT proxima_tentativa FROM {tabela}
                WHERE guild_id=%s AND user_id=%s
                """,
                (guild_id, user_id),
            ).fetchone()
        return False, (atual["proxima_tentativa"] if atual else None)

    def reservar_alvo_roubo(
        self, guild_id: str, user_id: str, agora, reservado_ate
    ):
        """Reserva uma vitima durante a janela de defesa.

        Carteira e cofre compartilham a reserva para impedir que duas
        interacoes concorrentes abram janelas contra a mesma pessoa. O prazo
        libera a reserva sozinho se o processo cair antes do ``finally``.
        """
        with self._conn() as con:
            row = con.execute(
                """
                INSERT INTO roubo_alvo_reserva (guild_id, user_id, reservado_ate)
                VALUES (%s, %s, %s)
                ON CONFLICT (guild_id, user_id) DO UPDATE SET
                    reservado_ate = EXCLUDED.reservado_ate
                WHERE roubo_alvo_reserva.reservado_ate <= %s
                RETURNING reservado_ate
                """,
                (guild_id, user_id, reservado_ate, agora),
            ).fetchone()
            if row is not None:
                return True, row["reservado_ate"]
            atual = con.execute(
                """
                SELECT reservado_ate FROM roubo_alvo_reserva
                WHERE guild_id=%s AND user_id=%s
                """,
                (guild_id, user_id),
            ).fetchone()
        return False, (atual["reservado_ate"] if atual else None)

    def liberar_alvo_roubo(
        self, guild_id: str, user_id: str, reservado_ate
    ) -> bool:
        """Libera somente a reserva criada por esta interacao."""
        with self._conn() as con:
            row = con.execute(
                """
                DELETE FROM roubo_alvo_reserva
                WHERE guild_id=%s AND user_id=%s AND reservado_ate=%s
                RETURNING 1
                """,
                (guild_id, user_id, reservado_ate),
            ).fetchone()
        return row is not None

    def penalizar_tentativa_contra_mestre(
        self, guild_id: str, ladrao_user_id: str, mestre_user_id: str
    ) -> int:
        """Queima no maximo 1 Lunaris sem criar divida e registra o extrato."""
        with self._conn() as con:
            self._garantir_jogador(con, guild_id, ladrao_user_id)
            row = con.execute(
                """
                UPDATE carteira
                SET saldo = saldo - 1
                WHERE guild_id=%s AND user_id=%s AND moeda='Lunaris'
                  AND saldo >= 1
                RETURNING saldo
                """,
                (guild_id, ladrao_user_id),
            ).fetchone()
            if row is None:
                return 0
            con.execute(
                """
                INSERT INTO extrato (guild_id, user_id, delta, moeda, descricao)
                VALUES (%s, %s, -1, 'Lunaris', %s)
                """,
                (
                    guild_id,
                    ladrao_user_id,
                    f"Penalidade por tentar roubar mestre protegido ({mestre_user_id})",
                ),
            )
        return 1

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
    # paga sem captura: sem apagar recompensa que outro jogador pagou de
    # verdade do próprio bolso.
    def _creditar_carteira_tx(
        self, con, guild_id: str, user_id: str, moeda: str, quantia: int
    ) -> int:
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

    def _bloquear_carteiras_lunaris_tx(
        self, con, guild_id: str, *user_ids: str
    ) -> dict:
        """Trava carteiras numa ordem global para evitar deadlock cruzado."""
        bloqueadas = {}
        for user_id in sorted(set(user_ids)):
            self._garantir_jogador(con, guild_id, user_id)
            nome = self._nome_moeda_real(con, guild_id, user_id, "Lunaris")
            row = con.execute(
                """
                SELECT saldo FROM carteira
                WHERE guild_id=%s AND user_id=%s AND moeda=%s
                FOR UPDATE
                """,
                (guild_id, user_id, nome),
            ).fetchone()
            bloqueadas[user_id] = {
                "moeda": nome,
                "saldo": int(row["saldo"]) if row else 0,
            }
        return bloqueadas

    @staticmethod
    def _registrar_extrato_tx(
        con, guild_id: str, user_id: str, delta: int, moeda: str, descricao: str
    ) -> None:
        if delta:
            con.execute(
                """
                INSERT INTO extrato (guild_id, user_id, delta, moeda, descricao)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (guild_id, user_id, int(delta), moeda, descricao),
            )

    def _resgatar_recompensa_tx(
        self,
        con,
        guild_id: str,
        ladrao_user_id: str,
        alvo_user_id: str,
        nome_alvo: str,
    ) -> dict:
        """Reivindica, paga e remove uma recompensa na mesma transacao."""
        row = con.execute(
            """
            DELETE FROM recompensa
            WHERE guild_id=%s AND alvo_user_id=%s
              AND valor_jogadores + valor_sistema > 0
            RETURNING valor_jogadores, valor_sistema
            """,
            (guild_id, alvo_user_id),
        ).fetchone()
        if row is None:
            return {"valor": 0, "tem_sistema": False, "divida_perdoada": 0}

        valor_jogadores = int(row["valor_jogadores"])
        valor_sistema = int(row["valor_sistema"])
        valor = valor_jogadores + valor_sistema
        self._creditar_carteira_tx(
            con, guild_id, ladrao_user_id, "Lunaris", valor
        )
        self._registrar_extrato_tx(
            con,
            guild_id,
            ladrao_user_id,
            valor,
            "Lunaris",
            f"Recompensa por capturar {nome_alvo}",
        )

        perdoado = 0
        if valor_sistema > 0:
            divida = con.execute(
                """
                SELECT valor FROM divida_cartao
                WHERE guild_id=%s AND user_id=%s AND valor > 0
                FOR UPDATE
                """,
                (guild_id, alvo_user_id),
            ).fetchone()
            if divida is not None:
                perdoado = int(divida["valor"])
                con.execute(
                    """
                    UPDATE divida_cartao
                    SET valor=0, atualizada_em=CURRENT_TIMESTAMP
                    WHERE guild_id=%s AND user_id=%s
                    """,
                    (guild_id, alvo_user_id),
                )
                self._registrar_extrato_tx(
                    con,
                    guild_id,
                    alvo_user_id,
                    perdoado,
                    "Lunaris",
                    "Divida perdoada (capturado)",
                )
        return {
            "valor": valor,
            "tem_sistema": valor_sistema > 0,
            "divida_perdoada": perdoado,
        }

    def _verificar_mestre_protegido_tx(
        self, con, guild_id: str, alvo_user_id: str
    ) -> None:
        # Garante que exista uma linha para o ``FOR SHARE`` serializar com
        # /mestre_proteger, inclusive em servidores ainda sem configuração.
        con.execute(
            """
            INSERT INTO config (guild_id, cambio_rate, cambio_taxa)
            VALUES (%s, %s, %s)
            ON CONFLICT (guild_id) DO NOTHING
            """,
            (
                guild_id,
                economia.CAMBIO_RATE_PADRAO,
                economia.CAMBIO_TAXA_PADRAO,
            ),
        )
        row = con.execute(
            """
            SELECT mestre_protegido_id FROM config
            WHERE guild_id=%s
            FOR SHARE
            """,
            (guild_id,),
        ).fetchone()
        if row and row["mestre_protegido_id"] == alvo_user_id:
            raise AlvoProtegido("a conta foi protegida antes da transferencia")

    def executar_roubo_carteira(
        self,
        guild_id: str,
        ladrao_user_id: str,
        alvo_user_id: str,
        nome_ladrao: str,
        nome_alvo: str,
        protegido_ate,
    ) -> dict:
        """Transfere roubo, extratos, protecao e recompensa atomicamente."""
        with self._conn() as con:
            self._verificar_mestre_protegido_tx(con, guild_id, alvo_user_id)
            carteiras = self._bloquear_carteiras_lunaris_tx(
                con, guild_id, ladrao_user_id, alvo_user_id
            )
            nome = carteiras[alvo_user_id]["moeda"]
            saldo_alvo = carteiras[alvo_user_id]["saldo"]
            if saldo_alvo <= 0:
                raise SaldoInsuficiente("a carteira da vitima esta vazia")
            quantia = max(
                1, math.floor(saldo_alvo * economia.ROUBO_CARTEIRA_PERCENT)
            )
            row = con.execute(
                """
                UPDATE carteira SET saldo=saldo-%s
                WHERE guild_id=%s AND user_id=%s AND moeda=%s AND saldo >= %s
                RETURNING saldo
                """,
                (int(quantia), guild_id, alvo_user_id, nome, int(quantia)),
            ).fetchone()
            if row is None:
                raise SaldoInsuficiente("o saldo da vitima mudou antes do roubo")
            self._creditar_carteira_tx(
                con, guild_id, ladrao_user_id, "Lunaris", quantia
            )
            self._registrar_extrato_tx(
                con,
                guild_id,
                ladrao_user_id,
                quantia,
                "Lunaris",
                f"Roubado de {nome_alvo}",
            )
            self._registrar_extrato_tx(
                con,
                guild_id,
                alvo_user_id,
                -quantia,
                "Lunaris",
                f"Roubado por {nome_ladrao}",
            )
            con.execute(
                """
                INSERT INTO roubo_protecao_vitima (guild_id, user_id, protegido_ate)
                VALUES (%s, %s, %s)
                ON CONFLICT (guild_id, user_id)
                DO UPDATE SET protegido_ate=EXCLUDED.protegido_ate
                """,
                (guild_id, alvo_user_id, protegido_ate),
            )
            recompensa = self._resgatar_recompensa_tx(
                con, guild_id, ladrao_user_id, alvo_user_id, nome_alvo
            )
        return {"valor": int(quantia), "recompensa": recompensa}

    def executar_roubo_cofre(
        self,
        guild_id: str,
        ladrao_user_id: str,
        alvo_user_id: str,
        nome_ladrao: str,
        nome_alvo: str,
    ) -> dict:
        """Transfere o saque do cofre e a recompensa atomicamente."""
        with self._conn() as con:
            self._verificar_mestre_protegido_tx(con, guild_id, alvo_user_id)
            self._bloquear_carteiras_lunaris_tx(
                con, guild_id, ladrao_user_id, alvo_user_id
            )
            nome = self._nome_moeda_real_cofre(
                con, guild_id, alvo_user_id, "Lunaris"
            )
            saldo_row = con.execute(
                """
                SELECT saldo FROM cofre_saldo
                WHERE guild_id=%s AND user_id=%s AND moeda=%s
                FOR UPDATE
                """,
                (guild_id, alvo_user_id, nome),
            ).fetchone()
            saldo_alvo = int(saldo_row["saldo"]) if saldo_row else 0
            if saldo_alvo <= 0:
                raise SaldoInsuficiente("o cofre da vitima esta vazio")
            quantia = max(
                1, math.floor(saldo_alvo * economia.ROUBO_COFRE_PERCENT)
            )
            row = con.execute(
                """
                UPDATE cofre_saldo SET saldo=saldo-%s
                WHERE guild_id=%s AND user_id=%s AND moeda=%s AND saldo >= %s
                RETURNING saldo
                """,
                (int(quantia), guild_id, alvo_user_id, nome, int(quantia)),
            ).fetchone()
            if row is None:
                raise SaldoInsuficiente("o saldo do cofre mudou antes do roubo")
            self._creditar_carteira_tx(
                con, guild_id, ladrao_user_id, "Lunaris", quantia
            )
            self._registrar_extrato_tx(
                con,
                guild_id,
                ladrao_user_id,
                quantia,
                "Lunaris",
                f"Cofre arrombado de {nome_alvo}",
            )
            self._registrar_extrato_tx(
                con,
                guild_id,
                alvo_user_id,
                -quantia,
                "Lunaris",
                f"Cofre arrombado por {nome_ladrao}",
            )
            recompensa = self._resgatar_recompensa_tx(
                con, guild_id, ladrao_user_id, alvo_user_id, nome_alvo
            )
        return {"valor": int(quantia), "recompensa": recompensa}

    def transferir_multa_roubo(
        self,
        guild_id: str,
        ladrao_user_id: str,
        alvo_user_id: str,
        percentual: float,
        nome_ladrao: str,
        nome_alvo: str,
    ) -> int:
        """Move a multa e grava os dois extratos atomicamente."""
        if not 0 <= percentual <= 1:
            raise ValueError("percentual de multa invalido")
        with self._conn() as con:
            self._verificar_mestre_protegido_tx(con, guild_id, alvo_user_id)
            carteiras = self._bloquear_carteiras_lunaris_tx(
                con, guild_id, ladrao_user_id, alvo_user_id
            )
            nome = carteiras[ladrao_user_id]["moeda"]
            saldo_ladrao = carteiras[ladrao_user_id]["saldo"]
            quantia = (
                max(1, math.floor(saldo_ladrao * percentual))
                if saldo_ladrao > 0
                else 0
            )
            if quantia == 0:
                return 0
            row = con.execute(
                """
                UPDATE carteira SET saldo=saldo-%s
                WHERE guild_id=%s AND user_id=%s AND moeda=%s AND saldo >= %s
                RETURNING saldo
                """,
                (int(quantia), guild_id, ladrao_user_id, nome, int(quantia)),
            ).fetchone()
            if row is None:
                raise SaldoInsuficiente("o saldo do ladrao mudou antes da multa")
            self._creditar_carteira_tx(
                con, guild_id, alvo_user_id, "Lunaris", quantia
            )
            self._registrar_extrato_tx(
                con,
                guild_id,
                ladrao_user_id,
                -quantia,
                "Lunaris",
                f"Multa por tentar arrombar o cofre de {nome_alvo}",
            )
            self._registrar_extrato_tx(
                con,
                guild_id,
                alvo_user_id,
                quantia,
                "Lunaris",
                f"Multa recebida de {nome_ladrao}",
            )
        return int(quantia)

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
        """Apaga a recompensa inteira: usar só quando ela foi RESGATADA
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

    def resetar_economia_guild(self, guild_id: str) -> dict:
        """[Mestre] Zera a economia de TODO o servidor, não só de um jogador —
        pensado pra "começar a campanha de verdade" depois de uma fase de
        teste. /resetjogador não serve pra isso: ele se recusa a mexer em
        quem tem conta vinculada à plataforma (ver docstring dele), então
        rodá-lo pessoa por pessoa deixaria pra trás exatamente quem já
        vinculou. Aqui a mesma tabela local de sempre é zerada, e o cofre da
        plataforma (itens, saldo e reservas) de quem estiver vinculado a
        este servidor também é apagado direto — é a única escrita deste
        arquivo que mexe nas tabelas da plataforma sem passar pela API
        (ver comentário em `par_cofre_plataforma`): é um apagão em massa, não
        uma operação que precise das garantias de concorrência da API.

        Fichas de personagem e histórico (extrato/movimentos_cofre/auditoria)
        não são tocados: são registro, não saldo corrente."""
        with self._conn() as con:
            resultado = {}
            for tabela in (
                "carteira", "inventario", "cofre_saldo", "baus_estoque",
                "divida_cartao", "loteria_bilhetes", "investimentos", "emprestimos",
            ):
                cur = con.execute(f"DELETE FROM {tabela} WHERE guild_id=%s", (guild_id,))
                resultado[tabela] = cur.rowcount
            cur = con.execute(
                "UPDATE leiloes SET status='cancelado' WHERE guild_id=%s AND status='ativo'",
                (guild_id,),
            )
            resultado["leiloes_cancelados"] = cur.rowcount
            con.execute(
                "UPDATE cofre SET tier=%s, seguranca_tier=%s WHERE guild_id=%s",
                (economia.COFRE_TIER_INICIAL, economia.SEGURANCA_TIER_INICIAL, guild_id),
            )
            con.execute(
                "UPDATE cartao SET credito=%s, tier=%s WHERE guild_id=%s",
                (economia.CREDITO_INICIAL, economia.CARTAO_TIER_INICIAL, guild_id),
            )

            campanha = con.execute(
                "SELECT campanha_id FROM campanhas_discord WHERE discord_guild_id=%s",
                (guild_id,),
            ).fetchone()
            if campanha is None:
                resultado["cofre_plataforma_itens"] = 0
                resultado["cofre_plataforma_saldos"] = 0
                resultado["cofre_plataforma_reservas"] = 0
            else:
                campanha_id = campanha["campanha_id"]
                cur = con.execute("DELETE FROM cofre_itens_usuario WHERE campanha_id=%s", (campanha_id,))
                resultado["cofre_plataforma_itens"] = cur.rowcount
                cur = con.execute("DELETE FROM cofre_saldos_usuario WHERE campanha_id=%s", (campanha_id,))
                resultado["cofre_plataforma_saldos"] = cur.rowcount
                cur = con.execute("DELETE FROM reservas_cofre WHERE campanha_id=%s", (campanha_id,))
                resultado["cofre_plataforma_reservas"] = cur.rowcount
        return resultado

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
        """Desativa (ativo=FALSE) os itens que não estão mais na semente: ex.:
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

    # ── Itens de defesa passiva (proteção contra roubo) ─────────────────────
    def adicionar_protecao(self, guild_id: str, user_id: str, tipo: str, qtd: int = 1) -> None:
        with self._conn() as con:
            con.execute(
                """
                INSERT INTO protecoes_ativas (guild_id, user_id, tipo, quantidade)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (guild_id, user_id, tipo)
                DO UPDATE SET quantidade = protecoes_ativas.quantidade + EXCLUDED.quantidade
                """,
                (guild_id, user_id, tipo, int(qtd)),
            )

    def consumir_protecao(self, guild_id: str, user_id: str, tipo: str) -> bool:
        with self._conn() as con:
            row = con.execute(
                """
                UPDATE protecoes_ativas SET quantidade = quantidade - 1
                WHERE guild_id=%s AND user_id=%s AND tipo=%s AND quantidade > 0
                RETURNING quantidade
                """,
                (guild_id, user_id, tipo),
            ).fetchone()
        return row is not None

    def listar_protecoes(self, guild_id: str, user_id: str) -> Dict[str, int]:
        with self._conn() as con:
            rows = con.execute(
                """
                SELECT tipo, quantidade FROM protecoes_ativas
                WHERE guild_id=%s AND user_id=%s AND quantidade > 0
                """,
                (guild_id, user_id),
            ).fetchall()
        return {row["tipo"]: int(row["quantidade"]) for row in rows}

    # ── Cargo dinâmico "Mais Procurado" / "Caçador de Recompensas" ──────────
    def get_cargo_procurado(self, guild_id: str):
        with self._conn() as con:
            row = con.execute(
                "SELECT cargo_procurado_id FROM config WHERE guild_id=%s", (guild_id,)
            ).fetchone()
        return row["cargo_procurado_id"] if row else None

    def set_cargo_procurado(self, guild_id: str, cargo_id: str) -> None:
        with self._conn() as con:
            con.execute(
                """
                INSERT INTO config (guild_id, cambio_rate, cambio_taxa, cargo_procurado_id)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (guild_id) DO UPDATE SET cargo_procurado_id = EXCLUDED.cargo_procurado_id
                """,
                (guild_id, economia.CAMBIO_RATE_PADRAO, economia.CAMBIO_TAXA_PADRAO, cargo_id),
            )

    def get_cargo_cacador(self, guild_id: str):
        with self._conn() as con:
            row = con.execute(
                "SELECT cargo_cacador_id FROM config WHERE guild_id=%s", (guild_id,)
            ).fetchone()
        return row["cargo_cacador_id"] if row else None

    def set_cargo_cacador(self, guild_id: str, cargo_id: str) -> None:
        with self._conn() as con:
            con.execute(
                """
                INSERT INTO config (guild_id, cambio_rate, cambio_taxa, cargo_cacador_id)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (guild_id) DO UPDATE SET cargo_cacador_id = EXCLUDED.cargo_cacador_id
                """,
                (guild_id, economia.CAMBIO_RATE_PADRAO, economia.CAMBIO_TAXA_PADRAO, cargo_id),
            )

    def conceder_cacador(self, guild_id: str, user_id: str, expira_em) -> None:
        with self._conn() as con:
            con.execute(
                """
                INSERT INTO cacador_recompensa (guild_id, user_id, expira_em)
                VALUES (%s, %s, %s)
                ON CONFLICT (guild_id, user_id) DO UPDATE SET
                    expira_em = GREATEST(cacador_recompensa.expira_em, EXCLUDED.expira_em)
                """,
                (guild_id, user_id, expira_em),
            )

    def listar_cacadores(self, guild_id: str) -> List[dict]:
        with self._conn() as con:
            rows = con.execute(
                "SELECT user_id, expira_em FROM cacador_recompensa WHERE guild_id=%s",
                (guild_id,),
            ).fetchall()
        return [dict(row) for row in rows]

    def remover_cacador(self, guild_id: str, user_id: str) -> None:
        with self._conn() as con:
            con.execute(
                "DELETE FROM cacador_recompensa WHERE guild_id=%s AND user_id=%s",
                (guild_id, user_id),
            )

    # ── Câmbio flutuante automático ──────────────────────────────────────────
    def get_cambio_auto(self, guild_id: str) -> bool:
        with self._conn() as con:
            row = con.execute(
                "SELECT cambio_auto FROM config WHERE guild_id=%s", (guild_id,)
            ).fetchone()
        return bool(row["cambio_auto"]) if row else False

    def set_cambio_auto(self, guild_id: str, ativo: bool) -> None:
        with self._conn() as con:
            con.execute(
                """
                INSERT INTO config (guild_id, cambio_rate, cambio_taxa, cambio_auto)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (guild_id) DO UPDATE SET cambio_auto = EXCLUDED.cambio_auto
                """,
                (guild_id, economia.CAMBIO_RATE_PADRAO, economia.CAMBIO_TAXA_PADRAO, ativo),
            )

    def listar_guilds_cambio_auto(self) -> List[str]:
        with self._conn() as con:
            rows = con.execute("SELECT guild_id FROM config WHERE cambio_auto = TRUE").fetchall()
        return [row["guild_id"] for row in rows]

    def registrar_fluxo_cambio(self, guild_id: str, direcao: str, quantia: int) -> None:
        if direcao not in {"compra_solares", "venda_solares"}:
            raise ValueError("direcao de fluxo de cambio invalida")
        with self._conn() as con:
            con.execute(
                "INSERT INTO cambio_fluxo (guild_id, direcao, quantia) VALUES (%s, %s, %s)",
                (guild_id, direcao, int(quantia)),
            )

    def fluxo_cambio_periodo(self, guild_id: str):
        """Soma o fluxo acumulado e limpa a tabela pra esta guild (a soma vira
        o novo ponto de partida do próximo período)."""
        with self._conn() as con:
            rows = con.execute(
                """
                SELECT direcao, COALESCE(SUM(quantia), 0) AS total
                FROM cambio_fluxo WHERE guild_id=%s GROUP BY direcao
                """,
                (guild_id,),
            ).fetchall()
            con.execute("DELETE FROM cambio_fluxo WHERE guild_id=%s", (guild_id,))
        totais = {row["direcao"]: int(row["total"]) for row in rows}
        return totais.get("compra_solares", 0), totais.get("venda_solares", 0)

    # ── Crise econômica (afeta o rendimento dos investimentos) ──────────────
    def get_crise_economica(self, guild_id: str) -> bool:
        with self._conn() as con:
            row = con.execute(
                "SELECT crise_economica FROM config WHERE guild_id=%s", (guild_id,)
            ).fetchone()
        return bool(row["crise_economica"]) if row else False

    def set_crise_economica(self, guild_id: str, ativa: bool) -> None:
        with self._conn() as con:
            con.execute(
                """
                INSERT INTO config (guild_id, cambio_rate, cambio_taxa, crise_economica)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (guild_id) DO UPDATE SET crise_economica = EXCLUDED.crise_economica
                """,
                (guild_id, economia.CAMBIO_RATE_PADRAO, economia.CAMBIO_TAXA_PADRAO, ativa),
            )

    # ── Casa de Leilão ────────────────────────────────────────────────────
    def criar_leilao(
        self, guild_id: str, vendedor_id: str, kind: str, ref: str, titulo: str,
        moeda: str, lance_minimo: int, canal_id: str, expira_em, modo_posse: str = "legado",
    ) -> dict:
        with self._conn() as con:
            row = con.execute(
                """
                INSERT INTO leiloes
                    (guild_id, vendedor_id, kind, ref, titulo, moeda, lance_minimo, canal_id, expira_em, modo_posse)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING *
                """,
                (guild_id, vendedor_id, kind, ref, titulo, moeda, int(lance_minimo), canal_id, expira_em, modo_posse),
            ).fetchone()
        return dict(row)

    def get_leilao(self, leilao_id: int):
        with self._conn() as con:
            row = con.execute("SELECT * FROM leiloes WHERE id=%s", (int(leilao_id),)).fetchone()
        return dict(row) if row else None

    def set_leilao_mensagem(self, leilao_id: int, mensagem_id: str) -> None:
        with self._conn() as con:
            con.execute(
                "UPDATE leiloes SET mensagem_id=%s WHERE id=%s", (mensagem_id, int(leilao_id))
            )

    def dar_lance_leilao(self, leilao_id: int, guild_id: str, user_id: str, valor: int):
        """UPDATE atômico: só aplica se `valor` bater o lance atual e o mínimo."""
        with self._conn() as con:
            row = con.execute(
                """
                UPDATE leiloes
                SET lance_atual=%s, vencedor_id=%s
                WHERE id=%s AND guild_id=%s AND status='ativo'
                  AND %s > lance_atual AND %s >= lance_minimo
                RETURNING *
                """,
                (int(valor), user_id, int(leilao_id), guild_id, int(valor), int(valor)),
            ).fetchone()
        return dict(row) if row else None

    def listar_leiloes_ativos(self, guild_id: str) -> List[dict]:
        with self._conn() as con:
            rows = con.execute(
                "SELECT * FROM leiloes WHERE guild_id=%s AND status='ativo' ORDER BY expira_em",
                (guild_id,),
            ).fetchall()
        return [dict(row) for row in rows]

    def listar_leiloes_expirados(self, agora) -> List[dict]:
        with self._conn() as con:
            rows = con.execute(
                "SELECT * FROM leiloes WHERE status='ativo' AND expira_em <= %s",
                (agora,),
            ).fetchall()
        return [dict(row) for row in rows]

    def encerrar_leilao(self, leilao_id: int, status: str) -> None:
        with self._conn() as con:
            con.execute("UPDATE leiloes SET status=%s WHERE id=%s", (status, int(leilao_id)))

    # ── Investimentos (Títulos do Jardim) ────────────────────────────────────
    def criar_investimento(self, guild_id: str, user_id: str, moeda: str, valor: int, vence_em) -> dict:
        with self._conn() as con:
            row = con.execute(
                """
                INSERT INTO investimentos (guild_id, user_id, moeda, valor, vence_em)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING *
                """,
                (guild_id, user_id, moeda, int(valor), vence_em),
            ).fetchone()
        return dict(row)

    def listar_investimentos_usuario(self, guild_id: str, user_id: str, incluir_historico: bool = False) -> List[dict]:
        filtro_status = "" if incluir_historico else "AND status='ativo'"
        with self._conn() as con:
            rows = con.execute(
                f"""
                SELECT * FROM investimentos
                WHERE guild_id=%s AND user_id=%s {filtro_status}
                ORDER BY vence_em DESC
                """,
                (guild_id, user_id),
            ).fetchall()
        return [dict(row) for row in rows]

    def listar_investimentos_vencidos(self, agora) -> List[dict]:
        with self._conn() as con:
            rows = con.execute(
                "SELECT * FROM investimentos WHERE status='ativo' AND vence_em <= %s",
                (agora,),
            ).fetchall()
        return [dict(row) for row in rows]

    def maturar_investimento(self, investimento_id: int) -> None:
        with self._conn() as con:
            con.execute(
                "UPDATE investimentos SET status='maturado' WHERE id=%s", (int(investimento_id),)
            )

    # ── Empréstimos P2P ───────────────────────────────────────────────────
    def criar_emprestimo(
        self, guild_id: str, credor_id: str, devedor_id: str, moeda: str,
        valor: int, juros_diarios: float, prazo_dias: int,
    ) -> dict:
        with self._conn() as con:
            row = con.execute(
                """
                INSERT INTO emprestimos
                    (guild_id, credor_id, devedor_id, moeda, valor_original, valor_devido,
                     juros_diarios, vence_em)
                VALUES (%s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP + (%s || ' days')::interval)
                RETURNING *
                """,
                (
                    guild_id, credor_id, devedor_id, moeda,
                    int(valor), int(valor), float(juros_diarios), int(prazo_dias),
                ),
            ).fetchone()
        return dict(row)

    def get_emprestimo(self, guild_id: str, emprestimo_id: int):
        with self._conn() as con:
            row = con.execute(
                "SELECT * FROM emprestimos WHERE id=%s AND guild_id=%s",
                (int(emprestimo_id), guild_id),
            ).fetchone()
        return dict(row) if row else None

    def aceitar_emprestimo(self, guild_id: str, emprestimo_id: int, devedor_id: str):
        with self._conn() as con:
            row = con.execute(
                """
                UPDATE emprestimos
                SET status='ativo', aceito_em=CURRENT_TIMESTAMP, ultimo_juros_em=CURRENT_TIMESTAMP
                WHERE id=%s AND guild_id=%s AND devedor_id=%s AND status='pendente_aceite'
                RETURNING *
                """,
                (int(emprestimo_id), guild_id, devedor_id),
            ).fetchone()
        return dict(row) if row else None

    def recusar_emprestimo(self, guild_id: str, emprestimo_id: int, devedor_id: str) -> bool:
        with self._conn() as con:
            row = con.execute(
                """
                UPDATE emprestimos SET status='recusado'
                WHERE id=%s AND guild_id=%s AND devedor_id=%s AND status='pendente_aceite'
                RETURNING id
                """,
                (int(emprestimo_id), guild_id, devedor_id),
            ).fetchone()
        return row is not None

    def pagar_emprestimo(self, guild_id: str, emprestimo_id: int, valor: int):
        with self._conn() as con:
            atual = con.execute(
                """
                SELECT valor_devido, credor_id, moeda FROM emprestimos
                WHERE id=%s AND guild_id=%s AND status='ativo' FOR UPDATE
                """,
                (int(emprestimo_id), guild_id),
            ).fetchone()
            if atual is None:
                return None
            pago = min(int(valor), int(atual["valor_devido"]))
            restante = int(atual["valor_devido"]) - pago
            novo_status = "quitado" if restante <= 0 else "ativo"
            con.execute(
                "UPDATE emprestimos SET valor_devido=%s, status=%s WHERE id=%s",
                (restante, novo_status, int(emprestimo_id)),
            )
        return {
            "pago": pago,
            "restante": restante,
            "credor_id": atual["credor_id"],
            "moeda": atual["moeda"],
            "quitado": restante <= 0,
        }

    def listar_emprestimos_ativos(self, guild_id: Optional[str] = None) -> List[dict]:
        with self._conn() as con:
            if guild_id:
                rows = con.execute(
                    "SELECT * FROM emprestimos WHERE guild_id=%s AND status='ativo'", (guild_id,)
                ).fetchall()
            else:
                rows = con.execute("SELECT * FROM emprestimos WHERE status='ativo'").fetchall()
        return [dict(row) for row in rows]

    def listar_emprestimos_vencidos(self, agora) -> List[dict]:
        with self._conn() as con:
            rows = con.execute(
                "SELECT * FROM emprestimos WHERE status='ativo' AND vence_em <= %s", (agora,)
            ).fetchall()
        return [dict(row) for row in rows]

    def listar_emprestimos_usuario(self, guild_id: str, user_id: str, incluir_historico: bool = False) -> List[dict]:
        filtro_status = "" if incluir_historico else "AND status IN ('pendente_aceite', 'ativo')"
        with self._conn() as con:
            rows = con.execute(
                f"""
                SELECT * FROM emprestimos
                WHERE guild_id=%s AND (credor_id=%s OR devedor_id=%s)
                  {filtro_status}
                ORDER BY criado_em DESC
                """,
                (guild_id, user_id, user_id),
            ).fetchall()
        return [dict(row) for row in rows]

    def aplicar_juros_emprestimo(self, emprestimo_id: int, novo_valor_devido: int) -> None:
        with self._conn() as con:
            con.execute(
                """
                UPDATE emprestimos SET valor_devido=%s, ultimo_juros_em=CURRENT_TIMESTAMP
                WHERE id=%s AND status='ativo'
                """,
                (int(novo_valor_devido), int(emprestimo_id)),
            )

    def fechar_emprestimo(self, emprestimo_id: int, status: str) -> None:
        with self._conn() as con:
            con.execute("UPDATE emprestimos SET status=%s WHERE id=%s", (status, int(emprestimo_id)))

    # ── Loteria Dominical (bilhetes comprados no Banqueiro, sorteio no Jornalista) ──
    def comprar_bilhete_loteria(self, guild_id: str, user_id: str, quantidade: int) -> int:
        with self._conn() as con:
            row = con.execute(
                """
                INSERT INTO loteria_bilhetes (guild_id, user_id, quantidade)
                VALUES (%s, %s, %s)
                ON CONFLICT (guild_id, user_id)
                DO UPDATE SET quantidade = loteria_bilhetes.quantidade + EXCLUDED.quantidade
                RETURNING quantidade
                """,
                (guild_id, user_id, int(quantidade)),
            ).fetchone()
        return int(row["quantidade"])

    def meus_bilhetes_loteria(self, guild_id: str, user_id: str) -> int:
        with self._conn() as con:
            row = con.execute(
                "SELECT quantidade FROM loteria_bilhetes WHERE guild_id=%s AND user_id=%s",
                (guild_id, user_id),
            ).fetchone()
        return int(row["quantidade"]) if row else 0

    def listar_bilhetes_loteria(self, guild_id: str) -> list:
        with self._conn() as con:
            rows = con.execute(
                "SELECT user_id, quantidade FROM loteria_bilhetes WHERE guild_id=%s AND quantidade > 0",
                (guild_id,),
            ).fetchall()
        return [dict(row) for row in rows]
