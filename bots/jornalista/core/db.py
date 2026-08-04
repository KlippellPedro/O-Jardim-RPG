from __future__ import annotations

from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional
from uuid import uuid4

from psycopg.rows import dict_row
from psycopg.types.json import Jsonb
from psycopg_pool import ConnectionPool, PoolTimeout

from . import economia
from . import loot as loot_mod


class DatabaseUnavailable(RuntimeError):
    """Falha de infraestrutura/configuracao ao acessar o PostgreSQL."""


# Padrões da Loteria Dominical: duplicados de bots/banqueiro/core/economia.py
# (LOTERIA_PRECO_BILHETE/LOTERIA_CORTE_CASA) de propósito — os dois bots são
# ZIPs deployados separados, sem pacote Python compartilhado entre eles.
LOTERIA_PRECO_BILHETE_PADRAO = 25
LOTERIA_CORTE_CASA_PADRAO = 0.10


# Mesmo PostgreSQL central do Banqueiro (VLAN da Discloud). O Jornalista só
# declara aqui as tabelas que ele mesmo le/grava; `carteira`, `inventario` e
# `cofre` sao as mesmas tabelas que o Banqueiro usa: IF NOT EXISTS garante
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
    # Também do Banqueiro (é ele quem lê pelo /extrato). O Jornalista só grava,
    # pra que prêmio de loteria e de desafio apareçam no histórico do jogador.
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
    # NULL nas três colunas abaixo significa "usa o padrão do código"
    # (core/loot.py): chance de baú trancado e faixa de Lunaris por baú
    # eram constantes fixas pro Jardim inteiro; /bau_config passa a poder
    # ajustar por servidor.
    """
    ALTER TABLE baus_config ADD COLUMN IF NOT EXISTS chance_enigma_percent INTEGER
    """,
    """
    ALTER TABLE baus_config ADD COLUMN IF NOT EXISTS lunaris_min INTEGER
    """,
    """
    ALTER TABLE baus_config ADD COLUMN IF NOT EXISTS lunaris_max INTEGER
    """,
    """
    CREATE TABLE IF NOT EXISTS baus_canais (
        guild_id TEXT NOT NULL,
        canal_id TEXT NOT NULL,
        criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (guild_id, canal_id)
    )
    """,
    # Migração compatível: o canal único antigo vira o primeiro canal da
    # rotação, sem apagar a coluna que versões anteriores ainda conhecem.
    """
    INSERT INTO baus_canais (guild_id, canal_id)
    SELECT guild_id, canal_id FROM baus_config WHERE canal_id IS NOT NULL
    ON CONFLICT (guild_id, canal_id) DO NOTHING
    """,
    """
    CREATE TABLE IF NOT EXISTS baus_entregas (
        guild_id TEXT NOT NULL,
        mensagem_id TEXT NOT NULL,
        canal_id TEXT NOT NULL,
        vencedor_user_id TEXT NOT NULL,
        idempotencia TEXT NOT NULL,
        premio JSONB NOT NULL,
        modo_entrega TEXT NOT NULL
            CHECK (modo_entrega IN ('plataforma', 'legado')),
        status TEXT NOT NULL DEFAULT 'pendente'
            CHECK (status IN ('pendente', 'entregue')),
        tentativas INTEGER NOT NULL DEFAULT 0,
        ultimo_erro TEXT,
        resultado JSONB,
        criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        entregue_em TIMESTAMPTZ,
        PRIMARY KEY (guild_id, mensagem_id),
        UNIQUE (guild_id, idempotencia)
    )
    """,
    """
    CREATE INDEX IF NOT EXISTS baus_entregas_pendentes_idx
    ON baus_entregas (guild_id, atualizado_em)
    WHERE status='pendente'
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
    ALTER TABLE config ADD COLUMN IF NOT EXISTS clima_auto BOOLEAN NOT NULL DEFAULT FALSE
    """,
    # Preço do bilhete e corte da casa da Loteria Dominical: configurados
    # pelo Banqueiro (/seteconomia), lidos aqui pro sorteio. Mesma coluna da
    # mesma tabela `config` compartilhada — cada bot cria/migra o schema por
    # conta própria (idempotente), então não importa qual sobe primeiro.
    """
    ALTER TABLE config ADD COLUMN IF NOT EXISTS loteria_preco_bilhete INTEGER
    """,
    """
    ALTER TABLE config ADD COLUMN IF NOT EXISTS loteria_corte_percent INTEGER
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
    # Roteamento por categoria (chegada/partida/noticia/clima/dinheiro). Sem linha, a
    # categoria cai no canal principal do jornal (config.jornal_canal_id).
    """
    CREATE TABLE IF NOT EXISTS canais_jornal (
        guild_id TEXT NOT NULL,
        categoria TEXT NOT NULL,
        canal_id TEXT NOT NULL,
        PRIMARY KEY (guild_id, categoria)
    )
    """,
    """
    ALTER TABLE config ADD COLUMN IF NOT EXISTS estacao_auto BOOLEAN NOT NULL DEFAULT FALSE
    """,
    """
    CREATE TABLE IF NOT EXISTS baus_canais_tema (
        guild_id TEXT NOT NULL,
        canal_id TEXT NOT NULL,
        tipo TEXT NOT NULL,
        PRIMARY KEY (guild_id, canal_id)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS horoscopo_atual (
        guild_id TEXT PRIMARY KEY,
        arvore_id TEXT NOT NULL,
        definido_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
    """,
    # Baú ainda no ar (ninguém clicou/acertou ainda). Guarda o prêmio (e o
    # enigma, se trancado) fora da memória do processo: sem isso, um reinício
    # do bot antes do primeiro clique deixa o botão morto pra sempre, porque
    # o prêmio só existia no objeto Python da View. O token (não o
    # mensagem_id) é a chave porque o botão precisa de um custom_id conhecido
    # ANTES de enviar a mensagem (e o id da mensagem só existe depois).
    """
    CREATE TABLE IF NOT EXISTS baus_no_ar (
        token TEXT PRIMARY KEY,
        guild_id TEXT NOT NULL,
        canal_id TEXT NOT NULL,
        mensagem_id TEXT NOT NULL,
        premio JSONB NOT NULL,
        enigma_pergunta TEXT,
        enigma_respostas JSONB,
        expira_em TIMESTAMPTZ NOT NULL,
        criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
    """,
    """
    CREATE INDEX IF NOT EXISTS baus_no_ar_expira_idx ON baus_no_ar (expira_em)
    """,
    # Desafio do /jornal desafio: token igual ao dos baús, pelo mesmo motivo
    # (custom_id do botão precisa existir antes do id da mensagem). resolvido_por
    # NULL = ainda em aberto; a checagem "still open" e a reivindicação atômica
    # usam a mesma coluna (UPDATE ... WHERE resolvido_por IS NULL).
    """
    CREATE TABLE IF NOT EXISTS jornal_desafios (
        token TEXT PRIMARY KEY,
        guild_id TEXT NOT NULL,
        canal_id TEXT NOT NULL,
        mensagem_id TEXT,
        autor_id TEXT NOT NULL,
        pergunta TEXT NOT NULL,
        resposta TEXT NOT NULL,
        recompensa INTEGER NOT NULL,
        resolvido_por TEXT,
        criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
    """,
    # Baú agendado por /jornal rumor: antes era só um asyncio.sleep numa task
    # solta, perdido pra sempre se o bot reiniciasse durante a espera (até
    # 12h). Agora um ciclo periódico consulta essa tabela.
    """
    CREATE TABLE IF NOT EXISTS jornal_rumores_agendados (
        id SERIAL PRIMARY KEY,
        guild_id TEXT NOT NULL,
        dropar_em TIMESTAMPTZ NOT NULL,
        processado BOOLEAN NOT NULL DEFAULT FALSE,
        criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
    """,
    """
    CREATE INDEX IF NOT EXISTS jornal_rumores_pendentes_idx
    ON jornal_rumores_agendados (dropar_em) WHERE NOT processado
    """,
    """
    CREATE TABLE IF NOT EXISTS entrevistas (
        id SERIAL PRIMARY KEY,
        guild_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        pergunta TEXT NOT NULL,
        resposta TEXT,
        status TEXT NOT NULL DEFAULT 'pendente'
            CHECK (status IN ('pendente', 'respondida', 'publicada', 'expirada')),
        criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        respondido_em TIMESTAMPTZ
    )
    """,
    # Mesma tabela que o Banqueiro usa pra vender bilhetes (bots/banqueiro/cogs/loteria.py);
    # o Jornalista sorteia, paga o vencedor e limpa a rodada.
    """
    CREATE TABLE IF NOT EXISTS loteria_bilhetes (
        guild_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        quantidade INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (guild_id, user_id)
    )
    """,
    # Marca a última vez que cada ciclo periódico (clima_auto, estacao_auto,
    # entrevista...) realmente publicou algo por guild. `tasks.loop(hours=N)`
    # roda a primeira iteração assim que o bot sobe — sem isto, todo deploy
    # na Discloud reinicia o bot e cada ciclo dispara de novo na hora, mesmo
    # tendo rodado poucas horas antes do commit.
    """
    CREATE TABLE IF NOT EXISTS ciclos_guild (
        guild_id TEXT NOT NULL,
        ciclo TEXT NOT NULL,
        executado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (guild_id, ciclo)
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

    def registrar_extrato(
        self, guild_id: str, user_id: str, delta: int, moeda: str, descricao: str
    ) -> None:
        """Mesma tabela que o /extrato do Banqueiro lê. Prêmio de loteria e de
        desafio nascem aqui, então precisam aparecer lá também."""
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
        """Escrita movida do Banqueiro pro Jornalista (docs/Plano_Jornalista.md,
        Decisão 2): /jornal estacao_definir chama isso agora."""
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
        """Canal principal do Jornalista, usado como fallback das categorias."""
        with self._conn() as con:
            row = con.execute(
                "SELECT jornal_canal_id FROM config WHERE guild_id=%s",
                (guild_id,),
            ).fetchone()
        return row["jornal_canal_id"] if row else None

    def set_jornal_canal(self, guild_id: str, canal_id: str) -> None:
        """Define o canal principal sem depender do bot Banqueiro.

        Os valores de câmbio existem apenas porque ``config`` é uma tabela
        legada compartilhada. Eles são os mesmos padrões do Banqueiro e só
        são usados ao criar a primeira linha do servidor.
        """
        with self._conn() as con:
            con.execute(
                """
                INSERT INTO config
                    (guild_id, cambio_rate, cambio_taxa, jornal_canal_id)
                VALUES (%s, 10, 0.02, %s)
                ON CONFLICT (guild_id) DO UPDATE SET
                    jornal_canal_id = EXCLUDED.jornal_canal_id
                """,
                (guild_id, canal_id),
            )

    def get_clima_auto(self, guild_id: str) -> bool:
        """Se o clima sazonal deve ser publicado automaticamente nesta guild."""
        with self._conn() as con:
            row = con.execute(
                "SELECT clima_auto FROM config WHERE guild_id=%s", (guild_id,)
            ).fetchone()
        return bool(row["clima_auto"]) if row else False

    def set_clima_auto(self, guild_id: str, ativo: bool) -> None:
        with self._conn() as con:
            con.execute(
                """
                INSERT INTO config (guild_id, cambio_rate, cambio_taxa, clima_auto)
                VALUES (%s, 10, 0.02, %s)
                ON CONFLICT (guild_id) DO UPDATE SET clima_auto = EXCLUDED.clima_auto
                """,
                (guild_id, ativo),
            )

    def listar_guilds_clima_auto(self) -> List[str]:
        """Guilds que optaram pelo clima automático."""
        with self._conn() as con:
            rows = con.execute(
                "SELECT guild_id FROM config WHERE clima_auto = TRUE"
            ).fetchall()
        return [row["guild_id"] for row in rows]

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
        "chance_enigma_percent": None,
        "lunaris_min": None,
        "lunaris_max": None,
    }

    @staticmethod
    def _resolver_config_bau(cfg: dict) -> dict:
        """chance_enigma/lunaris_min/lunaris_max sempre voltam resolvidos
        (nunca None), mesmo guardados como NULL no banco: quem chama não
        precisa saber se veio do /bau_config ou do padrão do código."""
        cfg["chance_enigma"] = (
            cfg["chance_enigma_percent"] / 100
            if cfg.get("chance_enigma_percent") is not None
            else loot_mod.CHANCE_BAU_ENIGMA
        )
        cfg["lunaris_min"] = cfg.get("lunaris_min") if cfg.get("lunaris_min") is not None else loot_mod.LUNARIS_MIN
        cfg["lunaris_max"] = cfg.get("lunaris_max") if cfg.get("lunaris_max") is not None else loot_mod.LUNARIS_MAX
        cfg["ativo"] = bool(cfg["ativo"])
        return cfg

    def get_baus_config(self, guild_id: str) -> dict:
        with self._conn() as con:
            row = con.execute(
                "SELECT * FROM baus_config WHERE guild_id=%s", (guild_id,)
            ).fetchone()
        cfg = dict(row) if row else dict(self._BAUS_DEFAULT, guild_id=guild_id)
        return self._resolver_config_bau(cfg)

    def listar_baus_ativos(self) -> List[dict]:
        with self._conn() as con:
            rows = con.execute(
                """
                SELECT * FROM baus_config
                WHERE ativo <> 0
                """
            ).fetchall()
        saida = []
        for row in rows:
            item = self._resolver_config_bau(dict(row))
            saida.append(item)
        return saida

    def listar_baus_canais(self, guild_id: str) -> List[str]:
        """Lista a rotação de canais; preserva o canal único de versões antigas."""
        with self._conn() as con:
            rows = con.execute(
                """
                SELECT canal_id FROM baus_canais
                WHERE guild_id=%s ORDER BY criado_em, canal_id
                """,
                (guild_id,),
            ).fetchall()
            if rows:
                return [row["canal_id"] for row in rows]
            legado = con.execute(
                "SELECT canal_id FROM baus_config WHERE guild_id=%s",
                (guild_id,),
            ).fetchone()
        return [legado["canal_id"]] if legado and legado["canal_id"] else []

    def adicionar_bau_canal(self, guild_id: str, canal_id: str) -> bool:
        """Adiciona um canal à rotação. Retorna False se ele já estava nela."""
        with self._conn() as con:
            row = con.execute(
                """
                INSERT INTO baus_canais (guild_id, canal_id)
                VALUES (%s, %s)
                ON CONFLICT (guild_id, canal_id) DO NOTHING
                RETURNING canal_id
                """,
                (guild_id, canal_id),
            ).fetchone()
            # Mantém a coluna antiga preenchida para rollback/deploy misto.
            con.execute(
                """
                INSERT INTO baus_config (guild_id, canal_id)
                VALUES (%s, %s)
                ON CONFLICT (guild_id) DO UPDATE SET
                    canal_id = COALESCE(baus_config.canal_id, EXCLUDED.canal_id)
                """,
                (guild_id, canal_id),
            )
        return row is not None

    def remover_bau_canal(self, guild_id: str, canal_id: str) -> bool:
        """Remove um canal e atualiza o fallback legado para outro restante."""
        with self._conn() as con:
            removido = con.execute(
                """
                DELETE FROM baus_canais
                WHERE guild_id=%s AND canal_id=%s
                RETURNING canal_id
                """,
                (guild_id, canal_id),
            ).fetchone()
            if removido is None:
                return False
            proximo = con.execute(
                """
                SELECT canal_id FROM baus_canais
                WHERE guild_id=%s ORDER BY criado_em, canal_id LIMIT 1
                """,
                (guild_id,),
            ).fetchone()
            con.execute(
                "UPDATE baus_config SET canal_id=%s WHERE guild_id=%s",
                (proximo["canal_id"] if proximo else None, guild_id),
            )
        return True

    # ── Entregas duráveis dos baús ────────────────────────────────────────
    @staticmethod
    def _normalizar_bau_entrega(row, *, nova: bool = False):
        if row is None:
            return None
        entrega = dict(row)
        entrega["premio"] = dict(entrega.get("premio") or {})
        entrega["resultado"] = (
            dict(entrega["resultado"]) if entrega.get("resultado") else None
        )
        entrega["nova"] = bool(nova)
        return entrega

    def registrar_bau_entrega_pendente(
        self,
        guild_id: str,
        mensagem_id: str,
        canal_id: str,
        vencedor_user_id: str,
        premio: dict,
        modo_entrega: str,
    ) -> dict:
        """Reserva definitivamente um baú para o primeiro vencedor.

        O conflito pela mensagem nunca troca vencedor nem prêmio. Isso torna o
        primeiro clique seguro mesmo com callbacks/processos concorrentes.
        """
        if modo_entrega not in {"plataforma", "legado"}:
            raise ValueError("modo de entrega de baú inválido")
        idempotencia = f"bau-drop:{mensagem_id}"
        with self._conn() as con:
            row = con.execute(
                """
                INSERT INTO baus_entregas
                    (guild_id, mensagem_id, canal_id, vencedor_user_id,
                     idempotencia, premio, modo_entrega, status)
                VALUES (%s, %s, %s, %s, %s, %s, %s, 'pendente')
                ON CONFLICT (guild_id, mensagem_id) DO NOTHING
                RETURNING *
                """,
                (
                    guild_id,
                    mensagem_id,
                    canal_id,
                    vencedor_user_id,
                    idempotencia,
                    Jsonb(premio),
                    modo_entrega,
                ),
            ).fetchone()
            if row is not None:
                return self._normalizar_bau_entrega(row, nova=True)
            row = con.execute(
                """
                SELECT * FROM baus_entregas
                WHERE guild_id=%s AND mensagem_id=%s
                """,
                (guild_id, mensagem_id),
            ).fetchone()
        return self._normalizar_bau_entrega(row, nova=False)

    def get_bau_entrega(self, guild_id: str, mensagem_id: str):
        with self._conn() as con:
            row = con.execute(
                """
                SELECT * FROM baus_entregas
                WHERE guild_id=%s AND mensagem_id=%s
                """,
                (guild_id, mensagem_id),
            ).fetchone()
        return self._normalizar_bau_entrega(row)

    # ── Baú ainda no ar (sobrevive a restart do bot) ───────────────────────
    def criar_bau_no_ar(
        self,
        token: str,
        guild_id: str,
        canal_id: str,
        mensagem_id: str,
        premio: dict,
        expira_em,
        enigma=None,
    ) -> None:
        with self._conn() as con:
            con.execute(
                """
                INSERT INTO baus_no_ar
                    (token, guild_id, canal_id, mensagem_id, premio, enigma_pergunta, enigma_respostas, expira_em)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    token, guild_id, canal_id, mensagem_id, Jsonb(premio),
                    enigma.pergunta if enigma is not None else None,
                    Jsonb(list(enigma.respostas)) if enigma is not None else None,
                    expira_em,
                ),
            )

    def get_bau_no_ar(self, token: str):
        with self._conn() as con:
            row = con.execute("SELECT * FROM baus_no_ar WHERE token=%s", (token,)).fetchone()
        return dict(row) if row else None

    def remover_bau_no_ar(self, token: str) -> None:
        with self._conn() as con:
            con.execute("DELETE FROM baus_no_ar WHERE token=%s", (token,))

    def listar_baus_no_ar_expirados(self, agora) -> List[dict]:
        with self._conn() as con:
            rows = con.execute(
                "SELECT * FROM baus_no_ar WHERE expira_em <= %s", (agora,)
            ).fetchall()
        return [dict(row) for row in rows]

    def listar_baus_entregas_pendentes(
        self, guild_id: str, limite: int = 20
    ) -> List[dict]:
        limite = max(1, min(50, int(limite)))
        with self._conn() as con:
            rows = con.execute(
                """
                SELECT * FROM baus_entregas
                WHERE guild_id=%s AND status='pendente'
                ORDER BY atualizado_em, mensagem_id
                LIMIT %s
                """,
                (guild_id, limite),
            ).fetchall()
        return [self._normalizar_bau_entrega(row) for row in rows]

    def iniciar_tentativa_bau_entrega(
        self, guild_id: str, mensagem_id: str
    ):
        """Conta uma tentativa sem alterar vencedor, prêmio ou idempotência."""
        with self._conn() as con:
            row = con.execute(
                """
                UPDATE baus_entregas
                SET tentativas=tentativas + 1,
                    ultimo_erro=NULL,
                    atualizado_em=CURRENT_TIMESTAMP
                WHERE guild_id=%s AND mensagem_id=%s AND status='pendente'
                RETURNING *
                """,
                (guild_id, mensagem_id),
            ).fetchone()
            if row is None:
                row = con.execute(
                    """
                    SELECT * FROM baus_entregas
                    WHERE guild_id=%s AND mensagem_id=%s
                    """,
                    (guild_id, mensagem_id),
                ).fetchone()
        return self._normalizar_bau_entrega(row)

    def marcar_bau_entrega_pendente(
        self, guild_id: str, mensagem_id: str, erro: str
    ):
        with self._conn() as con:
            row = con.execute(
                """
                UPDATE baus_entregas
                SET status='pendente', ultimo_erro=%s,
                    atualizado_em=CURRENT_TIMESTAMP
                WHERE guild_id=%s AND mensagem_id=%s AND status='pendente'
                RETURNING *
                """,
                (str(erro)[:2000], guild_id, mensagem_id),
            ).fetchone()
            if row is None:
                row = con.execute(
                    """
                    SELECT * FROM baus_entregas
                    WHERE guild_id=%s AND mensagem_id=%s
                    """,
                    (guild_id, mensagem_id),
                ).fetchone()
        return self._normalizar_bau_entrega(row)

    def definir_modo_bau_entrega(
        self, guild_id: str, mensagem_id: str, modo_entrega: str
    ) -> None:
        if modo_entrega not in {"plataforma", "legado"}:
            raise ValueError("modo de entrega de baú inválido")
        with self._conn() as con:
            con.execute(
                """
                UPDATE baus_entregas
                SET modo_entrega=%s, atualizado_em=CURRENT_TIMESTAMP
                WHERE guild_id=%s AND mensagem_id=%s AND status='pendente'
                """,
                (modo_entrega, guild_id, mensagem_id),
            )

    def marcar_bau_entrega_entregue(
        self,
        guild_id: str,
        mensagem_id: str,
        resultado: dict,
        *,
        vencedor_user_id: Optional[str] = None,
        lunaris: int = 0,
    ) -> None:
        """`vencedor_user_id`/`lunaris`: credita a carteira local na MESMA
        transação que fecha a entrega (`WHERE status<>'entregue'` faz o
        crédito só acontecer uma vez mesmo se `processar_entrega` for
        chamado de novo por um retry do recovery)."""
        with self._conn() as con:
            fechada = con.execute(
                """
                UPDATE baus_entregas
                SET status='entregue', resultado=%s, ultimo_erro=NULL,
                    atualizado_em=CURRENT_TIMESTAMP,
                    entregue_em=CURRENT_TIMESTAMP
                WHERE guild_id=%s AND mensagem_id=%s AND status<>'entregue'
                RETURNING mensagem_id
                """,
                (Jsonb(resultado), guild_id, mensagem_id),
            ).fetchone()
            if fechada is not None and lunaris and vencedor_user_id is not None:
                self._garantir_jogador(con, guild_id, vencedor_user_id)
                con.execute(
                    """
                    INSERT INTO carteira (guild_id, user_id, moeda, saldo)
                    VALUES (%s, %s, 'Lunaris', %s)
                    ON CONFLICT (guild_id, user_id, moeda)
                    DO UPDATE SET saldo = carteira.saldo + EXCLUDED.saldo
                    """,
                    (guild_id, vencedor_user_id, int(lunaris)),
                )

    # ── Escrita direta no cofre da plataforma ──────────────────────────────
    # Espelha bots/banqueiro/core/db.py::depositar_cofre_plataforma, que por
    # sua vez espelha plataforma/routers/internal.py::deposit_discord_reward.
    # Existe porque o baú do Jornalista caía direto pro cofre local quando o
    # salto HTTP até a API falhava — e item no cofre local não aparece no
    # site nem chega na ficha. Bot e plataforma dividem o mesmo PostgreSQL
    # (VLAN da Discloud), então a queda do HTTP não precisa ser a queda do
    # cofre. Mesma chave de idempotência dos dois lados: um depósito que a
    # API tenha gravado antes da resposta se perder não é creditado de novo.
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

    def depositar_cofre_plataforma(
        self,
        guild_id: str,
        user_id: str,
        *,
        idempotencia: str,
        motivo: str,
        itens: Optional[List[dict]] = None,
        moedas: Optional[List[dict]] = None,
        origem: str = "jornalista",
    ) -> Optional[dict]:
        """`None` = conta não vinculada (quem chamou cai pro cofre local)."""
        itens = itens or []
        moedas = moedas or []
        if not itens and not moedas:
            raise ValueError("informe ao menos um item ou moeda")

        par = self.par_cofre_plataforma(guild_id, user_id)
        if par is None:
            return None
        usuario_id, campanha_id = par["usuario_id"], par["campanha_id"]

        with self._conn() as con:
            con.execute(
                "SELECT pg_advisory_xact_lock(hashtextextended(%s, 0))",
                (f"movimento:{campanha_id}:{origem}:{idempotencia}",),
            )
            existente = con.execute(
                """
                SELECT id FROM movimentos_cofre
                WHERE campanha_id=%s AND origem=%s AND idempotencia=%s
                """,
                (campanha_id, origem, idempotencia),
            ).fetchone()
            if existente:
                return {
                    "movimento_id": existente["id"],
                    "campanha_id": campanha_id,
                    "repetido": True,
                }

            for item in itens:
                con.execute(
                    """
                    INSERT INTO cofre_itens_usuario
                        (usuario_id, campanha_id, item_id, titulo, quantidade, dados, origem)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (usuario_id, campanha_id, item_id) DO UPDATE SET
                        titulo=EXCLUDED.titulo,
                        quantidade=cofre_itens_usuario.quantidade + EXCLUDED.quantidade,
                        dados=EXCLUDED.dados,
                        origem=EXCLUDED.origem,
                        atualizado_em=CURRENT_TIMESTAMP
                    """,
                    (
                        usuario_id,
                        campanha_id,
                        str(item["item_id"]),
                        str(item["titulo"]),
                        int(item.get("quantidade") or 1),
                        Jsonb(item.get("dados") or {}),
                        origem,
                    ),
                )
            for moeda in moedas:
                con.execute(
                    """
                    INSERT INTO cofre_saldos_usuario
                        (usuario_id, campanha_id, moeda, saldo)
                    VALUES (%s, %s, %s, %s)
                    ON CONFLICT (usuario_id, campanha_id, moeda) DO UPDATE SET
                        saldo=cofre_saldos_usuario.saldo + EXCLUDED.saldo,
                        atualizado_em=CURRENT_TIMESTAMP
                    """,
                    (usuario_id, campanha_id, str(moeda["moeda"]), int(moeda["quantidade"])),
                )

            movimento_id = uuid4()
            detalhes = {"motivo": motivo, "itens": itens, "moedas": moedas}
            con.execute(
                """
                INSERT INTO movimentos_cofre
                    (id, usuario_id, campanha_id, origem, idempotencia, detalhes)
                VALUES (%s, %s, %s, %s, %s, %s)
                """,
                (movimento_id, usuario_id, campanha_id, origem, idempotencia, Jsonb(detalhes)),
            )
            premios = [str(item["titulo"]) for item in itens]
            premios += [f"{moeda['quantidade']} {moeda['moeda']}" for moeda in moedas]
            con.execute(
                """
                INSERT INTO notificacoes
                    (id, usuario_id, campanha_id, categoria, titulo, mensagem, dados)
                VALUES (%s, %s, %s, 'economia', %s, %s, %s)
                """,
                (
                    uuid4(),
                    usuario_id,
                    campanha_id,
                    "Recompensa nova no seu cofre",
                    f"{', '.join(premios[:4])} — {motivo}"[:600],
                    Jsonb({"origem": origem}),
                ),
            )
            con.execute(
                """
                INSERT INTO eventos_auditoria
                    (id, campanha_id, ator_servico, acao, alvo_tipo, alvo_id, detalhes)
                VALUES (%s, %s, %s, 'cofre.recompensa_discord', 'usuario', %s, %s)
                """,
                (uuid4(), campanha_id, origem, str(usuario_id), Jsonb(detalhes)),
            )
        return {
            "movimento_id": movimento_id,
            "campanha_id": campanha_id,
            "repetido": False,
        }

    def entregar_bau_legado(self, guild_id: str, mensagem_id: str) -> dict:
        """Entrega no banco legado e conclui a fila na mesma transação.

        O ``FOR UPDATE`` e o status persistido tornam reprocessamentos
        idempotentes: uma entrega já concluída apenas devolve o resultado salvo.
        """
        with self._conn() as con:
            entrega = con.execute(
                """
                SELECT * FROM baus_entregas
                WHERE guild_id=%s AND mensagem_id=%s
                FOR UPDATE
                """,
                (guild_id, mensagem_id),
            ).fetchone()
            if entrega is None:
                raise ValueError("entrega de baú não registrada")
            if entrega["status"] == "entregue":
                return dict(entrega["resultado"] or {})

            premio = dict(entrega["premio"] or {})
            vencedor_user_id = entrega["vencedor_user_id"]
            self._garantir_jogador(con, guild_id, vencedor_user_id)

            lunaris = int(premio.get("lunaris") or 0)
            if lunaris < 0:
                raise ValueError("prêmio de Lunaris inválido")
            if lunaris:
                con.execute(
                    """
                    INSERT INTO carteira (guild_id, user_id, moeda, saldo)
                    VALUES (%s, %s, 'Lunaris', %s)
                    ON CONFLICT (guild_id, user_id, moeda)
                    DO UPDATE SET saldo=carteira.saldo + EXCLUDED.saldo
                    """,
                    (guild_id, vencedor_user_id, lunaris),
                )

            tier_row = con.execute(
                """
                SELECT tier FROM cofre WHERE guild_id=%s AND user_id=%s
                """,
                (guild_id, vencedor_user_id),
            ).fetchone()
            tier = tier_row["tier"] if tier_row else economia.COFRE_TIER_INICIAL
            total_row = con.execute(
                """
                SELECT COALESCE(SUM(quantidade), 0) AS total
                FROM inventario WHERE guild_id=%s AND user_id=%s
                """,
                (guild_id, vencedor_user_id),
            ).fetchone()
            total_itens = int(total_row["total"])
            ganhos = [f"☾ {lunaris} Lunaris"]

            for item in premio.get("itens") or []:
                quantidade = int(item.get("quantidade") or 1)
                if quantidade <= 0:
                    raise ValueError("quantidade de item inválida no prêmio")
                titulo = str(item.get("titulo") or item.get("id") or "Item")
                raridade = str(item.get("raridade") or "comum")
                if economia.pode_guardar(total_itens, quantidade, tier):
                    con.execute(
                        """
                        INSERT INTO inventario
                            (guild_id, user_id, item_id, titulo, tipo, quantidade)
                        VALUES (%s, %s, %s, %s, %s, %s)
                        ON CONFLICT (guild_id, user_id, item_id)
                        DO UPDATE SET
                            quantidade=inventario.quantidade + EXCLUDED.quantidade,
                            titulo=EXCLUDED.titulo,
                            tipo=EXCLUDED.tipo
                        """,
                        (
                            guild_id,
                            vencedor_user_id,
                            str(item["id"]),
                            titulo,
                            str(item.get("tipo") or "item"),
                            quantidade,
                        ),
                    )
                    total_itens += quantidade
                    sufixo = f" ×{quantidade}" if quantidade > 1 else ""
                    ganhos.append(f"**{titulo}** ({raridade}){sufixo}")
                else:
                    ganhos.append(
                        f"~~{titulo}~~: cofre cheio! (`/cofre_melhorar` no Banqueiro)"
                    )

            resultado = {
                "ganhos": ganhos,
                "destino": "carteira do Banqueiro",
                "confirmado": True,
            }
            con.execute(
                """
                UPDATE baus_entregas
                SET status='entregue', resultado=%s, ultimo_erro=NULL,
                    atualizado_em=CURRENT_TIMESTAMP,
                    entregue_em=CURRENT_TIMESTAMP
                WHERE guild_id=%s AND mensagem_id=%s
                """,
                (Jsonb(resultado), guild_id, mensagem_id),
            )
        return resultado

    def atualizar_baus_config(
        self,
        guild_id: str,
        canal_id=None,
        ativo=None,
        min_hora=None,
        max_hora=None,
        itens_por_bau=None,
        chance_enigma_percent=None,
        lunaris_min=None,
        lunaris_max=None,
    ) -> None:
        # min_hora/max_hora/itens_por_bau/etc. não têm conceito de "não
        # definido" (a coluna é NOT NULL): usam o valor atual quando quem
        # chamou não informa nada. Já chance_enigma_percent/lunaris_min/max
        # são NULL = "usa o padrão do código" e por isso usam COALESCE no
        # SQL em vez de passar pelo valor já resolvido por get_baus_config
        # (senão qualquer chamada a /bau_config fixaria esses três campos
        # no valor padrão pra sempre, mesmo sem o mestre ter pedido isso).
        with self._conn() as con:
            atual_bruto = con.execute(
                "SELECT canal_id, ativo, min_hora, max_hora, itens_por_bau, proximo_drop FROM baus_config WHERE guild_id=%s",
                (guild_id,),
            ).fetchone()
            atual = dict(atual_bruto) if atual_bruto else dict(self._BAUS_DEFAULT)
            novo = {
                "canal_id": atual["canal_id"] if canal_id is None else canal_id,
                "ativo": int(atual["ativo"] if ativo is None else ativo),
                "min_hora": atual["min_hora"] if min_hora is None else int(min_hora),
                "max_hora": atual["max_hora"] if max_hora is None else int(max_hora),
                "itens_por_bau": (
                    atual["itens_por_bau"] if itens_por_bau is None else int(itens_por_bau)
                ),
                "proximo_drop": atual.get("proximo_drop"),
            }
            con.execute(
                """
                INSERT INTO baus_config
                    (guild_id, canal_id, ativo, min_hora, max_hora,
                     itens_por_bau, proximo_drop, chance_enigma_percent, lunaris_min, lunaris_max)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (guild_id) DO UPDATE SET
                    canal_id = EXCLUDED.canal_id,
                    ativo = EXCLUDED.ativo,
                    min_hora = EXCLUDED.min_hora,
                    max_hora = EXCLUDED.max_hora,
                    itens_por_bau = EXCLUDED.itens_por_bau,
                    chance_enigma_percent = COALESCE(EXCLUDED.chance_enigma_percent, baus_config.chance_enigma_percent),
                    lunaris_min = COALESCE(EXCLUDED.lunaris_min, baus_config.lunaris_min),
                    lunaris_max = COALESCE(EXCLUDED.lunaris_max, baus_config.lunaris_max)
                """,
                (
                    guild_id,
                    novo["canal_id"],
                    novo["ativo"],
                    novo["min_hora"],
                    novo["max_hora"],
                    novo["itens_por_bau"],
                    novo["proximo_drop"],
                    chance_enigma_percent,
                    lunaris_min,
                    lunaris_max,
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

    # ── Baús temáticos por canal (enviesa o tipo de item que cai) ──────────
    def set_bau_canal_tema(self, guild_id: str, canal_id: str, tipo) -> None:
        with self._conn() as con:
            if tipo is None:
                con.execute(
                    "DELETE FROM baus_canais_tema WHERE guild_id=%s AND canal_id=%s",
                    (guild_id, canal_id),
                )
                return
            con.execute(
                """
                INSERT INTO baus_canais_tema (guild_id, canal_id, tipo)
                VALUES (%s, %s, %s)
                ON CONFLICT (guild_id, canal_id) DO UPDATE SET tipo=EXCLUDED.tipo
                """,
                (guild_id, canal_id, tipo),
            )

    def get_bau_canal_tema(self, guild_id: str, canal_id: str):
        with self._conn() as con:
            row = con.execute(
                "SELECT tipo FROM baus_canais_tema WHERE guild_id=%s AND canal_id=%s",
                (guild_id, canal_id),
            ).fetchone()
        return row["tipo"] if row else None

    def listar_baus_canais_tema(self, guild_id: str) -> Dict[str, str]:
        with self._conn() as con:
            rows = con.execute(
                "SELECT canal_id, tipo FROM baus_canais_tema WHERE guild_id=%s", (guild_id,)
            ).fetchall()
        return {row["canal_id"]: row["tipo"] for row in rows}

    # ── Rotação automática de estação (espelha o clima_auto) ───────────────
    def get_estacao_auto(self, guild_id: str) -> bool:
        with self._conn() as con:
            row = con.execute(
                "SELECT estacao_auto FROM config WHERE guild_id=%s", (guild_id,)
            ).fetchone()
        return bool(row["estacao_auto"]) if row else False

    def set_estacao_auto(self, guild_id: str, ativo: bool) -> None:
        with self._conn() as con:
            con.execute(
                """
                INSERT INTO config (guild_id, cambio_rate, cambio_taxa, estacao_auto)
                VALUES (%s, 10, 0.02, %s)
                ON CONFLICT (guild_id) DO UPDATE SET estacao_auto = EXCLUDED.estacao_auto
                """,
                (guild_id, ativo),
            )

    def listar_guilds_estacao_auto(self) -> List[str]:
        with self._conn() as con:
            rows = con.execute("SELECT guild_id FROM config WHERE estacao_auto = TRUE").fetchall()
        return [row["guild_id"] for row in rows]

    # ── Controle de ciclos periódicos (evita reenvio a cada restart) ────────
    def ciclo_guild_devido(self, guild_id: str, ciclo: str, intervalo_horas: float) -> bool:
        """False = já rodou dentro do intervalo; a chamada deve pular esta guild."""
        with self._conn() as con:
            row = con.execute(
                """
                SELECT executado_em FROM ciclos_guild
                WHERE guild_id=%s AND ciclo=%s
                """,
                (guild_id, ciclo),
            ).fetchone()
        if row is None:
            return True
        return row["executado_em"] <= datetime.now(timezone.utc) - timedelta(hours=intervalo_horas)

    def marcar_ciclo_guild(self, guild_id: str, ciclo: str) -> None:
        with self._conn() as con:
            con.execute(
                """
                INSERT INTO ciclos_guild (guild_id, ciclo, executado_em)
                VALUES (%s, %s, CURRENT_TIMESTAMP)
                ON CONFLICT (guild_id, ciclo) DO UPDATE SET executado_em = CURRENT_TIMESTAMP
                """,
                (guild_id, ciclo),
            )

    # ── Horóscopo do Jardim ─────────────────────────────────────────────────
    def set_horoscopo(self, guild_id: str, arvore_id: str) -> None:
        with self._conn() as con:
            con.execute(
                """
                INSERT INTO horoscopo_atual (guild_id, arvore_id, definido_em)
                VALUES (%s, %s, CURRENT_TIMESTAMP)
                ON CONFLICT (guild_id) DO UPDATE SET
                    arvore_id = EXCLUDED.arvore_id, definido_em = CURRENT_TIMESTAMP
                """,
                (guild_id, arvore_id),
            )

    def get_horoscopo(self, guild_id: str):
        with self._conn() as con:
            row = con.execute(
                "SELECT arvore_id FROM horoscopo_atual WHERE guild_id=%s", (guild_id,)
            ).fetchone()
        return row["arvore_id"] if row else None

    # ── Entrevista Exclusiva ────────────────────────────────────────────────
    def criar_entrevista(self, guild_id: str, user_id: str, pergunta: str) -> int:
        with self._conn() as con:
            row = con.execute(
                "INSERT INTO entrevistas (guild_id, user_id, pergunta) VALUES (%s, %s, %s) RETURNING id",
                (guild_id, user_id, pergunta),
            ).fetchone()
        return int(row["id"])

    def entrevista_pendente_do_usuario(self, user_id: str):
        with self._conn() as con:
            row = con.execute(
                """
                SELECT * FROM entrevistas
                WHERE user_id=%s AND status='pendente'
                ORDER BY criado_em DESC LIMIT 1
                """,
                (user_id,),
            ).fetchone()
        return dict(row) if row else None

    def responder_entrevista(self, entrevista_id: int, resposta: str) -> bool:
        with self._conn() as con:
            row = con.execute(
                """
                UPDATE entrevistas SET resposta=%s, status='respondida', respondido_em=CURRENT_TIMESTAMP
                WHERE id=%s AND status='pendente'
                RETURNING id
                """,
                (resposta, int(entrevista_id)),
            ).fetchone()
        return row is not None

    def marcar_entrevista_publicada(self, entrevista_id: int) -> None:
        with self._conn() as con:
            con.execute("UPDATE entrevistas SET status='publicada' WHERE id=%s", (int(entrevista_id),))

    def expirar_entrevistas_antigas(self, guild_id: str, antes_de) -> None:
        with self._conn() as con:
            con.execute(
                """
                UPDATE entrevistas SET status='expirada'
                WHERE guild_id=%s AND status='pendente' AND criado_em < %s
                """,
                (guild_id, antes_de),
            )

    def listar_entrevistas_respondidas_nao_publicadas(self, guild_id: str) -> List[dict]:
        with self._conn() as con:
            rows = con.execute(
                "SELECT * FROM entrevistas WHERE guild_id=%s AND status='respondida' ORDER BY respondido_em",
                (guild_id,),
            ).fetchall()
        return [dict(row) for row in rows]

    def usuarios_ja_entrevistados(self, guild_id: str) -> List[str]:
        with self._conn() as con:
            rows = con.execute(
                "SELECT DISTINCT user_id FROM entrevistas WHERE guild_id=%s AND status != 'expirada'",
                (guild_id,),
            ).fetchall()
        return [row["user_id"] for row in rows]

    # ── /jornal desafio (persistido: sobrevive a restart até ser resolvido) ──
    def criar_desafio(
        self, token: str, guild_id: str, canal_id: str, autor_id: str,
        pergunta: str, resposta: str, recompensa: int,
    ) -> None:
        with self._conn() as con:
            con.execute(
                """
                INSERT INTO jornal_desafios (token, guild_id, canal_id, autor_id, pergunta, resposta, recompensa)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                """,
                (token, guild_id, canal_id, autor_id, pergunta, resposta, int(recompensa)),
            )

    def set_desafio_mensagem(self, token: str, mensagem_id: str) -> None:
        with self._conn() as con:
            con.execute("UPDATE jornal_desafios SET mensagem_id=%s WHERE token=%s", (mensagem_id, token))

    def get_desafio_ativo(self, token: str):
        with self._conn() as con:
            row = con.execute(
                "SELECT * FROM jornal_desafios WHERE token=%s AND resolvido_por IS NULL", (token,)
            ).fetchone()
        return dict(row) if row else None

    def reivindicar_desafio(self, token: str, user_id: str):
        """UPDATE atômico: só o primeiro a acertar consegue travar o desafio."""
        with self._conn() as con:
            row = con.execute(
                """
                UPDATE jornal_desafios SET resolvido_por=%s
                WHERE token=%s AND resolvido_por IS NULL
                RETURNING *
                """,
                (user_id, token),
            ).fetchone()
        return dict(row) if row else None

    # ── Baú agendado por /jornal rumor (sobrevive a restart) ────────────────
    def agendar_rumor_bau(self, guild_id: str, dropar_em) -> None:
        with self._conn() as con:
            con.execute(
                "INSERT INTO jornal_rumores_agendados (guild_id, dropar_em) VALUES (%s, %s)",
                (guild_id, dropar_em),
            )

    def listar_rumores_baus_pendentes(self, agora) -> List[dict]:
        with self._conn() as con:
            rows = con.execute(
                "SELECT * FROM jornal_rumores_agendados WHERE NOT processado AND dropar_em <= %s",
                (agora,),
            ).fetchall()
        return [dict(row) for row in rows]

    def marcar_rumor_bau_processado(self, rumor_id: int) -> None:
        with self._conn() as con:
            con.execute(
                "UPDATE jornal_rumores_agendados SET processado=TRUE WHERE id=%s", (int(rumor_id),)
            )

    # ── Loteria Dominical (bilhetes vendidos pelo Banqueiro; sorteio aqui) ──
    def listar_bilhetes_loteria(self, guild_id: str) -> List[dict]:
        with self._conn() as con:
            rows = con.execute(
                "SELECT user_id, quantidade FROM loteria_bilhetes WHERE guild_id=%s AND quantidade > 0",
                (guild_id,),
            ).fetchall()
        return [dict(row) for row in rows]

    def get_loteria_config(self, guild_id: str) -> dict:
        """Preço do bilhete e corte da casa são ajustados pelo Banqueiro
        (/seteconomia) na mesma tabela `config` compartilhada; NULL aqui
        significa "usa o padrão do código" (precisa bater com
        bots/banqueiro/core/economia.py)."""
        with self._conn() as con:
            row = con.execute(
                "SELECT loteria_preco_bilhete, loteria_corte_percent FROM config WHERE guild_id=%s",
                (guild_id,),
            ).fetchone()
        row = row or {}
        corte_percent = row.get("loteria_corte_percent")
        return {
            "preco_bilhete": row.get("loteria_preco_bilhete") or LOTERIA_PRECO_BILHETE_PADRAO,
            "corte": (corte_percent / 100) if corte_percent is not None else LOTERIA_CORTE_CASA_PADRAO,
        }

    def limpar_bilhetes_loteria(self, guild_id: str) -> None:
        with self._conn() as con:
            con.execute("DELETE FROM loteria_bilhetes WHERE guild_id=%s", (guild_id,))
