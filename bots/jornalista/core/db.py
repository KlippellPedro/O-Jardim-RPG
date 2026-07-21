from __future__ import annotations

from contextlib import contextmanager
from typing import Dict, List

from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool, PoolTimeout

from . import economia


class DatabaseUnavailable(RuntimeError):
    """Falha de infraestrutura/configuracao ao acessar o PostgreSQL."""


# Mesmo PostgreSQL central do Banqueiro (VLAN da Discloud). O Jornalista só
# declara aqui as tabelas que ele mesmo le/grava; `carteira`, `inventario` e
# `cofre` sao as mesmas tabelas que o Banqueiro usa — IF NOT EXISTS garante
# que nao importa qual bot suba primeiro num banco novo.
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
    CREATE TABLE IF NOT EXISTS estacao (
        guild_id TEXT PRIMARY KEY,
        nome TEXT NOT NULL
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
    CREATE TABLE IF NOT EXISTS baus_config (
        guild_id TEXT PRIMARY KEY,
        canal_id TEXT,
        ativo INTEGER NOT NULL DEFAULT 0,
        min_hora INTEGER NOT NULL DEFAULT 10,
        max_hora INTEGER NOT NULL DEFAULT 22,
        itens_por_bau INTEGER NOT NULL DEFAULT 1,
        proximo_drop TEXT
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
    CREATE TABLE IF NOT EXISTS registro_config (
        guild_id TEXT PRIMARY KEY,
        canal_id TEXT NOT NULL
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS registro_cargos (
        guild_id TEXT NOT NULL,
        arvore_id TEXT NOT NULL,
        cargo_id TEXT NOT NULL,
        PRIMARY KEY (guild_id, arvore_id)
    )
    """,
    # Painéis de auto-registro configuráveis (estilo Zira, com botões). Cada
    # painel tem N opções; cada opção é um botão que dá/tira um cargo. `unico`
    # = só um cargo do painel por vez (ex.: +18/-18, ele/ela).
    """
    CREATE TABLE IF NOT EXISTS registro_paineis (
        id SERIAL PRIMARY KEY,
        guild_id TEXT NOT NULL,
        titulo TEXT NOT NULL,
        descricao TEXT NOT NULL DEFAULT '',
        unico BOOLEAN NOT NULL DEFAULT TRUE,
        canal_id TEXT,
        mensagem_id TEXT,
        criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS registro_opcoes (
        id SERIAL PRIMARY KEY,
        painel_id INTEGER NOT NULL REFERENCES registro_paineis(id) ON DELETE CASCADE,
        label TEXT NOT NULL,
        emoji TEXT,
        cargo_id TEXT NOT NULL,
        cor TEXT NOT NULL DEFAULT 'cinza',
        ordem INTEGER NOT NULL DEFAULT 0
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
    # Textos editáveis do jornal (entrada/saída etc.) por servidor. Sem linha,
    # o código usa os padrões embutidos.
    """
    CREATE TABLE IF NOT EXISTS mensagens_jornal (
        guild_id TEXT NOT NULL,
        tipo TEXT NOT NULL,
        texto TEXT NOT NULL,
        PRIMARY KEY (guild_id, tipo)
    )
    """,
    # Roteamento por categoria (chegada/partida/noticia/clima). Sem linha, a
    # categoria cai no canal principal do jornal (config.jornal_canal_id).
    """
    CREATE TABLE IF NOT EXISTS canais_jornal (
        guild_id TEXT NOT NULL,
        categoria TEXT NOT NULL,
        canal_id TEXT NOT NULL,
        PRIMARY KEY (guild_id, categoria)
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
            name="jornalista-db",
        )
        try:
            self.pool.open(wait=True, timeout=startup_timeout)
            self._init_schema()
        except Exception as exc:
            self.fechar()
            raise DatabaseUnavailable(
                "nao foi possivel conectar ao PostgreSQL. Verifique DATABASE_URL, "
                "credenciais e se Jornalista + banco estao com VLAN=true na Discloud."
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
                "o PostgreSQL nao respondeu dentro do tempo limite"
            ) from exc

    def _init_schema(self) -> None:
        with self._conn() as con:
            for ddl in _SCHEMA:
                con.execute(ddl)

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

    def garantir_jogador(self, guild_id: str, user_id: str) -> None:
        with self._conn() as con:
            self._garantir_jogador(con, guild_id, user_id)

    def creditar(self, guild_id: str, user_id: str, moeda: str, quantia: int) -> int:
        if quantia < 0:
            raise ValueError("a quantia nao pode ser negativa")
        with self._conn() as con:
            self._garantir_jogador(con, guild_id, user_id)
            row = con.execute(
                """
                INSERT INTO carteira (guild_id, user_id, moeda, saldo)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (guild_id, user_id, moeda)
                DO UPDATE SET saldo = carteira.saldo + EXCLUDED.saldo
                RETURNING saldo
                """,
                (guild_id, user_id, moeda, int(quantia)),
            ).fetchone()
        return int(row["saldo"])

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

    def get_cofre_tier(self, guild_id: str, user_id: str) -> str:
        with self._conn() as con:
            self._garantir_jogador(con, guild_id, user_id)
            row = con.execute(
                "SELECT tier FROM cofre WHERE guild_id=%s AND user_id=%s",
                (guild_id, user_id),
            ).fetchone()
        return row["tier"] if row else economia.COFRE_TIER_INICIAL

    def get_estacao(self, guild_id: str) -> str:
        with self._conn() as con:
            row = con.execute(
                "SELECT nome FROM estacao WHERE guild_id=%s", (guild_id,)
            ).fetchone()
        return row["nome"] if row else economia.ESTACAO_PADRAO

    def set_estacao(self, guild_id: str, nome: str) -> None:
        """Escrita movida do Banqueiro pro Jornalista (Plano_Jornalista.md,
        Decisão 2) — /jornal estacao_definir chama isso agora."""
        with self._conn() as con:
            con.execute(
                """
                INSERT INTO estacao (guild_id, nome) VALUES (%s, %s)
                ON CONFLICT (guild_id) DO UPDATE SET nome=EXCLUDED.nome
                """,
                (guild_id, nome),
            )

    # ── Canal de registro (mapeamento de cargo por Árvore, Passo 5) ─────────
    def get_registro_canal(self, guild_id: str):
        with self._conn() as con:
            row = con.execute(
                "SELECT canal_id FROM registro_config WHERE guild_id=%s", (guild_id,)
            ).fetchone()
        return row["canal_id"] if row else None

    def set_registro_canal(self, guild_id: str, canal_id: str) -> None:
        with self._conn() as con:
            con.execute(
                """
                INSERT INTO registro_config (guild_id, canal_id) VALUES (%s, %s)
                ON CONFLICT (guild_id) DO UPDATE SET canal_id=EXCLUDED.canal_id
                """,
                (guild_id, canal_id),
            )

    # ── Cargos de Árvore (registro cosmético, Passo 5) ──────────────────────
    def set_cargo_arvore(self, guild_id: str, arvore_id: str, cargo_id: str) -> None:
        with self._conn() as con:
            con.execute(
                """
                INSERT INTO registro_cargos (guild_id, arvore_id, cargo_id)
                VALUES (%s, %s, %s)
                ON CONFLICT (guild_id, arvore_id) DO UPDATE SET cargo_id=EXCLUDED.cargo_id
                """,
                (guild_id, arvore_id, cargo_id),
            )

    def get_cargos_arvore(self, guild_id: str) -> Dict[str, str]:
        """{arvore_id: cargo_id} pra esse servidor."""
        with self._conn() as con:
            rows = con.execute(
                "SELECT arvore_id, cargo_id FROM registro_cargos WHERE guild_id=%s",
                (guild_id,),
            ).fetchall()
        return {row["arvore_id"]: row["cargo_id"] for row in rows}

    # ── Painéis de auto-registro configuráveis (botões, estilo Zira) ────────
    def criar_painel(
        self, guild_id: str, titulo: str, descricao: str = "", unico: bool = True
    ) -> int:
        with self._conn() as con:
            row = con.execute(
                """
                INSERT INTO registro_paineis (guild_id, titulo, descricao, unico)
                VALUES (%s, %s, %s, %s) RETURNING id
                """,
                (guild_id, titulo, descricao or "", bool(unico)),
            ).fetchone()
        return int(row["id"])

    def get_painel(self, guild_id: str, painel_id: int):
        with self._conn() as con:
            row = con.execute(
                "SELECT * FROM registro_paineis WHERE id=%s AND guild_id=%s",
                (int(painel_id), guild_id),
            ).fetchone()
        return dict(row) if row else None

    def listar_paineis(self, guild_id: str) -> List[dict]:
        with self._conn() as con:
            rows = con.execute(
                """
                SELECT p.id, p.titulo, p.descricao, p.unico, p.canal_id, p.mensagem_id,
                       (SELECT COUNT(*) FROM registro_opcoes o WHERE o.painel_id=p.id)
                           AS num_opcoes
                FROM registro_paineis p
                WHERE p.guild_id=%s ORDER BY p.id
                """,
                (guild_id,),
            ).fetchall()
        return [dict(row) for row in rows]

    def apagar_painel(self, guild_id: str, painel_id: int) -> bool:
        with self._conn() as con:
            row = con.execute(
                "DELETE FROM registro_paineis WHERE id=%s AND guild_id=%s RETURNING id",
                (int(painel_id), guild_id),
            ).fetchone()
        return row is not None

    def set_painel_modo(self, guild_id: str, painel_id: int, unico: bool) -> bool:
        with self._conn() as con:
            row = con.execute(
                """
                UPDATE registro_paineis SET unico=%s
                WHERE id=%s AND guild_id=%s RETURNING id
                """,
                (bool(unico), int(painel_id), guild_id),
            ).fetchone()
        return row is not None

    def set_painel_mensagem(
        self, painel_id: int, canal_id: str, mensagem_id: str
    ) -> None:
        with self._conn() as con:
            con.execute(
                "UPDATE registro_paineis SET canal_id=%s, mensagem_id=%s WHERE id=%s",
                (canal_id, mensagem_id, int(painel_id)),
            )

    def add_opcao(
        self,
        guild_id: str,
        painel_id: int,
        label: str,
        cargo_id: str,
        emoji=None,
        cor: str = "cinza",
    ):
        """Adiciona um botão ao painel. Devolve o id da opção, ou None se o
        painel não existir/não for desse servidor."""
        with self._conn() as con:
            dono = con.execute(
                "SELECT id FROM registro_paineis WHERE id=%s AND guild_id=%s",
                (int(painel_id), guild_id),
            ).fetchone()
            if not dono:
                return None
            prox = con.execute(
                "SELECT COALESCE(MAX(ordem), -1) + 1 AS prox FROM registro_opcoes WHERE painel_id=%s",
                (int(painel_id),),
            ).fetchone()["prox"]
            row = con.execute(
                """
                INSERT INTO registro_opcoes
                    (painel_id, label, emoji, cargo_id, cor, ordem)
                VALUES (%s, %s, %s, %s, %s, %s) RETURNING id
                """,
                (int(painel_id), label, emoji, cargo_id, cor, int(prox)),
            ).fetchone()
        return int(row["id"])

    def listar_opcoes(self, painel_id: int) -> List[dict]:
        with self._conn() as con:
            rows = con.execute(
                """
                SELECT id, label, emoji, cargo_id, cor, ordem
                FROM registro_opcoes WHERE painel_id=%s ORDER BY ordem, id
                """,
                (int(painel_id),),
            ).fetchall()
        return [dict(row) for row in rows]

    def remover_opcao(self, guild_id: str, painel_id: int, opcao_id: int) -> bool:
        with self._conn() as con:
            row = con.execute(
                """
                DELETE FROM registro_opcoes o
                USING registro_paineis p
                WHERE o.id=%s AND o.painel_id=%s
                  AND p.id=o.painel_id AND p.guild_id=%s
                RETURNING o.id
                """,
                (int(opcao_id), int(painel_id), guild_id),
            ).fetchone()
        return row is not None

    def get_opcao_clique(self, guild_id: str, opcao_id: int):
        """Dados que o handler do botão precisa: cargo da opção, se o painel é
        único e os cargos irmãos (pra troca no modo único). None se a opção não
        existe ou não é desse servidor (custom_id antigo/forjado)."""
        with self._conn() as con:
            row = con.execute(
                """
                SELECT o.cargo_id, o.painel_id, p.unico, p.guild_id
                FROM registro_opcoes o
                JOIN registro_paineis p ON p.id = o.painel_id
                WHERE o.id=%s
                """,
                (int(opcao_id),),
            ).fetchone()
            if not row or row["guild_id"] != guild_id:
                return None
            irmaos = con.execute(
                "SELECT cargo_id FROM registro_opcoes WHERE painel_id=%s",
                (row["painel_id"],),
            ).fetchall()
        return {
            "cargo_id": row["cargo_id"],
            "unico": bool(row["unico"]),
            "cargos_irmaos": [r["cargo_id"] for r in irmaos],
        }

    def get_opcao_por_reacao(self, mensagem_id: str, emoji: str):
        """Pro handler de reação: acha a opção pelo (mensagem do painel, emoji) e
        devolve cargo, se o painel é único e os cargos irmãos. None se não casar
        (reação em outra mensagem ou emoji não configurado)."""
        with self._conn() as con:
            row = con.execute(
                """
                SELECT o.cargo_id, o.painel_id, p.unico
                FROM registro_opcoes o
                JOIN registro_paineis p ON p.id = o.painel_id
                WHERE p.mensagem_id=%s AND o.emoji=%s
                """,
                (str(mensagem_id), emoji),
            ).fetchone()
            if not row:
                return None
            irmaos = con.execute(
                "SELECT cargo_id FROM registro_opcoes WHERE painel_id=%s",
                (row["painel_id"],),
            ).fetchall()
        return {
            "cargo_id": row["cargo_id"],
            "unico": bool(row["unico"]),
            "cargos_irmaos": [r["cargo_id"] for r in irmaos],
        }

    def get_jornal_canal(self, guild_id: str):
        """O Banqueiro é quem grava isso (/jornal_definir); o Jornalista só lê."""
        with self._conn() as con:
            row = con.execute(
                "SELECT jornal_canal_id FROM config WHERE guild_id=%s",
                (guild_id,),
            ).fetchone()
        return row["jornal_canal_id"] if row else None

    # ── Mensagens editáveis (entrada/saída) ─────────────────────────────────
    def get_mensagem(self, guild_id: str, tipo: str):
        with self._conn() as con:
            row = con.execute(
                "SELECT texto FROM mensagens_jornal WHERE guild_id=%s AND tipo=%s",
                (guild_id, tipo),
            ).fetchone()
        return row["texto"] if row else None

    def set_mensagem(self, guild_id: str, tipo: str, texto: str) -> None:
        with self._conn() as con:
            con.execute(
                """
                INSERT INTO mensagens_jornal (guild_id, tipo, texto) VALUES (%s, %s, %s)
                ON CONFLICT (guild_id, tipo) DO UPDATE SET texto=EXCLUDED.texto
                """,
                (guild_id, tipo, texto),
            )

    def limpar_mensagem(self, guild_id: str, tipo: str) -> None:
        with self._conn() as con:
            con.execute(
                "DELETE FROM mensagens_jornal WHERE guild_id=%s AND tipo=%s",
                (guild_id, tipo),
            )

    # ── Roteamento de notícias por categoria ────────────────────────────────
    def get_canal_categoria(self, guild_id: str, categoria: str):
        """Canal específico da categoria; se não houver, cai no canal principal."""
        with self._conn() as con:
            row = con.execute(
                "SELECT canal_id FROM canais_jornal WHERE guild_id=%s AND categoria=%s",
                (guild_id, categoria),
            ).fetchone()
        if row and row["canal_id"]:
            return row["canal_id"]
        return self.get_jornal_canal(guild_id)

    def set_canal_categoria(self, guild_id: str, categoria: str, canal_id: str) -> None:
        with self._conn() as con:
            con.execute(
                """
                INSERT INTO canais_jornal (guild_id, categoria, canal_id) VALUES (%s, %s, %s)
                ON CONFLICT (guild_id, categoria) DO UPDATE SET canal_id=EXCLUDED.canal_id
                """,
                (guild_id, categoria, canal_id),
            )

    def limpar_canal_categoria(self, guild_id: str, categoria: str) -> None:
        with self._conn() as con:
            con.execute(
                "DELETE FROM canais_jornal WHERE guild_id=%s AND categoria=%s",
                (guild_id, categoria),
            )

    def listar_canais_categoria(self, guild_id: str) -> Dict[str, str]:
        with self._conn() as con:
            rows = con.execute(
                "SELECT categoria, canal_id FROM canais_jornal WHERE guild_id=%s",
                (guild_id,),
            ).fetchall()
        return {row["categoria"]: row["canal_id"] for row in rows}

    # ── Avisos pendentes (fila de anúncios que o Banqueiro enfileira) ───────
    def listar_avisos_pendentes(self, guild_id: str) -> List[dict]:
        with self._conn() as con:
            rows = con.execute(
                """
                SELECT id, mensagem FROM avisos_pendentes
                WHERE guild_id=%s AND publicado=FALSE
                ORDER BY criado_em
                """,
                (guild_id,),
            ).fetchall()
        return [{"id": row["id"], "mensagem": row["mensagem"]} for row in rows]

    def listar_guilds_com_aviso_pendente(self) -> List[str]:
        with self._conn() as con:
            rows = con.execute(
                "SELECT DISTINCT guild_id FROM avisos_pendentes WHERE publicado=FALSE"
            ).fetchall()
        return [row["guild_id"] for row in rows]

    def marcar_aviso_publicado(self, aviso_id: int) -> None:
        with self._conn() as con:
            con.execute(
                "UPDATE avisos_pendentes SET publicado=TRUE WHERE id=%s",
                (aviso_id,),
            )

    # Catalogo central: o Jornalista só le (quem semeia é o Banqueiro/site).
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

    # ── Baús automáticos (agendamento) ──────────────────────────────────────
    _BAUS_DEFAULT = {
        "canal_id": None,
        "ativo": 0,
        "min_hora": 10,
        "max_hora": 22,
        "itens_por_bau": 1,
        "proximo_drop": None,
    }

    def get_baus_config(self, guild_id: str) -> dict:
        with self._conn() as con:
            row = con.execute(
                "SELECT * FROM baus_config WHERE guild_id=%s", (guild_id,)
            ).fetchone()
        cfg = dict(row) if row else dict(self._BAUS_DEFAULT, guild_id=guild_id)
        cfg["ativo"] = bool(cfg["ativo"])
        return cfg

    def listar_baus_ativos(self) -> List[dict]:
        with self._conn() as con:
            rows = con.execute(
                """
                SELECT * FROM baus_config
                WHERE ativo <> 0 AND canal_id IS NOT NULL
                """
            ).fetchall()
        saida = []
        for row in rows:
            item = dict(row)
            item["ativo"] = bool(item["ativo"])
            saida.append(item)
        return saida

    def atualizar_baus_config(
        self,
        guild_id: str,
        canal_id=None,
        ativo=None,
        min_hora=None,
        max_hora=None,
        itens_por_bau=None,
    ) -> None:
        atual = self.get_baus_config(guild_id)
        novo = {
            "canal_id": atual["canal_id"] if canal_id is None else canal_id,
            "ativo": int(atual["ativo"] if ativo is None else ativo),
            "min_hora": atual["min_hora"] if min_hora is None else int(min_hora),
            "max_hora": atual["max_hora"] if max_hora is None else int(max_hora),
            "itens_por_bau": (
                atual["itens_por_bau"]
                if itens_por_bau is None
                else int(itens_por_bau)
            ),
            "proximo_drop": atual.get("proximo_drop"),
        }
        with self._conn() as con:
            con.execute(
                """
                INSERT INTO baus_config
                    (guild_id, canal_id, ativo, min_hora, max_hora,
                     itens_por_bau, proximo_drop)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (guild_id) DO UPDATE SET
                    canal_id = EXCLUDED.canal_id,
                    ativo = EXCLUDED.ativo,
                    min_hora = EXCLUDED.min_hora,
                    max_hora = EXCLUDED.max_hora,
                    itens_por_bau = EXCLUDED.itens_por_bau
                """,
                (
                    guild_id,
                    novo["canal_id"],
                    novo["ativo"],
                    novo["min_hora"],
                    novo["max_hora"],
                    novo["itens_por_bau"],
                    novo["proximo_drop"],
                ),
            )

    def set_proximo_drop(self, guild_id: str, iso: str) -> None:
        with self._conn() as con:
            con.execute(
                """
                INSERT INTO baus_config
                    (guild_id, canal_id, ativo, min_hora, max_hora,
                     itens_por_bau, proximo_drop)
                VALUES (%s, NULL, 0, 10, 22, 1, %s)
                ON CONFLICT (guild_id) DO UPDATE SET
                    proximo_drop = EXCLUDED.proximo_drop
                """,
                (guild_id, iso),
            )
