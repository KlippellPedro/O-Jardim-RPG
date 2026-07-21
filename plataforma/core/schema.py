from __future__ import annotations


MIGRATIONS: tuple[tuple[int, str, tuple[str, ...]], ...] = (
    (
        1,
        "fundacao_da_plataforma",
        (
            """
            CREATE TABLE IF NOT EXISTS usuarios (
                id UUID PRIMARY KEY,
                email TEXT NOT NULL,
                nome_exibicao TEXT NOT NULL,
                senha_hash TEXT NOT NULL,
                email_verificado BOOLEAN NOT NULL DEFAULT FALSE,
                admin_plataforma BOOLEAN NOT NULL DEFAULT FALSE,
                ativo BOOLEAN NOT NULL DEFAULT TRUE,
                criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """,
            """
            CREATE UNIQUE INDEX IF NOT EXISTS usuarios_email_unico
            ON usuarios (LOWER(email))
            """,
            """
            CREATE TABLE IF NOT EXISTS sessoes_auth (
                id UUID PRIMARY KEY,
                usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
                token_hash TEXT NOT NULL UNIQUE,
                csrf_hash TEXT NOT NULL,
                ip_hash TEXT,
                user_agent TEXT,
                expira_em TIMESTAMPTZ NOT NULL,
                revogada_em TIMESTAMPTZ,
                criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                ultimo_uso_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """,
            """
            CREATE INDEX IF NOT EXISTS sessoes_auth_usuario_idx
            ON sessoes_auth (usuario_id, expira_em DESC)
            """,
            """
            CREATE TABLE IF NOT EXISTS limites_login (
                chave_hash TEXT PRIMARY KEY,
                tentativas INTEGER NOT NULL DEFAULT 0,
                janela_iniciada_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                bloqueado_ate TIMESTAMPTZ
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS campanhas (
                id UUID PRIMARY KEY,
                dono_id UUID NOT NULL REFERENCES usuarios(id),
                nome TEXT NOT NULL,
                descricao TEXT NOT NULL DEFAULT '',
                status TEXT NOT NULL DEFAULT 'ativa'
                    CHECK (status IN ('ativa', 'arquivada')),
                configuracoes JSONB NOT NULL DEFAULT '{}'::jsonb,
                criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS membros_campanha (
                campanha_id UUID NOT NULL REFERENCES campanhas(id) ON DELETE CASCADE,
                usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
                papel TEXT NOT NULL
                    CHECK (papel IN ('mestre', 'assistente', 'jogador', 'observador')),
                status TEXT NOT NULL DEFAULT 'ativo'
                    CHECK (status IN ('ativo', 'removido')),
                entrou_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (campanha_id, usuario_id)
            )
            """,
            """
            CREATE INDEX IF NOT EXISTS membros_campanha_usuario_idx
            ON membros_campanha (usuario_id, status)
            """,
            """
            CREATE TABLE IF NOT EXISTS convites_campanha (
                id UUID PRIMARY KEY,
                campanha_id UUID NOT NULL REFERENCES campanhas(id) ON DELETE CASCADE,
                criado_por UUID NOT NULL REFERENCES usuarios(id),
                codigo_hash TEXT NOT NULL UNIQUE,
                papel TEXT NOT NULL DEFAULT 'jogador'
                    CHECK (papel IN ('assistente', 'jogador', 'observador')),
                max_usos INTEGER NOT NULL DEFAULT 1 CHECK (max_usos BETWEEN 1 AND 100),
                usos INTEGER NOT NULL DEFAULT 0 CHECK (usos >= 0),
                expira_em TIMESTAMPTZ NOT NULL,
                revogado_em TIMESTAMPTZ,
                criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS personagens (
                id UUID PRIMARY KEY,
                campanha_id UUID NOT NULL REFERENCES campanhas(id) ON DELETE CASCADE,
                dono_usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
                nome TEXT NOT NULL,
                ficha JSONB NOT NULL DEFAULT '{}'::jsonb,
                versao INTEGER NOT NULL DEFAULT 1 CHECK (versao > 0),
                status TEXT NOT NULL DEFAULT 'ativo'
                    CHECK (status IN ('ativo', 'arquivado')),
                criado_por UUID NOT NULL REFERENCES usuarios(id),
                criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """,
            """
            ALTER TABLE membros_campanha
            ADD COLUMN IF NOT EXISTS personagem_ativo_id UUID
            REFERENCES personagens(id) ON DELETE SET NULL
            """,
            """
            CREATE INDEX IF NOT EXISTS personagens_campanha_idx
            ON personagens (campanha_id, status, nome)
            """,
            """
            CREATE TABLE IF NOT EXISTS contas_discord (
                usuario_id UUID PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
                discord_user_id TEXT NOT NULL UNIQUE,
                discord_nome TEXT,
                vinculado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS campanhas_discord (
                campanha_id UUID PRIMARY KEY REFERENCES campanhas(id) ON DELETE CASCADE,
                discord_guild_id TEXT NOT NULL UNIQUE,
                vinculado_por UUID NOT NULL REFERENCES usuarios(id),
                vinculado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS codigos_vinculo_discord (
                id UUID PRIMARY KEY,
                usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
                codigo_hash TEXT NOT NULL UNIQUE,
                expira_em TIMESTAMPTZ NOT NULL,
                consumido_em TIMESTAMPTZ,
                criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS informacoes_campanha (
                id UUID PRIMARY KEY,
                campanha_id UUID NOT NULL REFERENCES campanhas(id) ON DELETE CASCADE,
                tipo TEXT NOT NULL,
                chave_recurso TEXT NOT NULL,
                titulo TEXT NOT NULL,
                resumo_rumor TEXT NOT NULL DEFAULT '',
                dados_parciais JSONB NOT NULL DEFAULT '{}'::jsonb,
                dados_completos JSONB NOT NULL DEFAULT '{}'::jsonb,
                acesso_padrao TEXT NOT NULL DEFAULT 'oculto'
                    CHECK (acesso_padrao IN ('oculto', 'rumor', 'parcial', 'completo')),
                criado_por UUID NOT NULL REFERENCES usuarios(id),
                criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE (campanha_id, tipo, chave_recurso)
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS liberacoes_informacao (
                id UUID PRIMARY KEY,
                campanha_id UUID NOT NULL REFERENCES campanhas(id) ON DELETE CASCADE,
                informacao_id UUID NOT NULL REFERENCES informacoes_campanha(id) ON DELETE CASCADE,
                destinatario_tipo TEXT NOT NULL
                    CHECK (destinatario_tipo IN ('usuario', 'personagem', 'papel')),
                destinatario_id TEXT NOT NULL,
                acesso TEXT NOT NULL
                    CHECK (acesso IN ('rumor', 'parcial', 'completo')),
                liberado_por UUID NOT NULL REFERENCES usuarios(id),
                liberado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE (informacao_id, destinatario_tipo, destinatario_id)
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS saldos_personagem (
                campanha_id UUID NOT NULL REFERENCES campanhas(id) ON DELETE CASCADE,
                personagem_id UUID NOT NULL REFERENCES personagens(id) ON DELETE CASCADE,
                moeda TEXT NOT NULL,
                saldo BIGINT NOT NULL DEFAULT 0,
                atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (campanha_id, personagem_id, moeda)
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS inventario_personagem (
                campanha_id UUID NOT NULL REFERENCES campanhas(id) ON DELETE CASCADE,
                personagem_id UUID NOT NULL REFERENCES personagens(id) ON DELETE CASCADE,
                item_id TEXT NOT NULL,
                titulo TEXT NOT NULL,
                quantidade INTEGER NOT NULL CHECK (quantidade > 0),
                dados JSONB NOT NULL DEFAULT '{}'::jsonb,
                atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (campanha_id, personagem_id, item_id)
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS lancamentos_economia (
                id UUID PRIMARY KEY,
                campanha_id UUID NOT NULL REFERENCES campanhas(id) ON DELETE CASCADE,
                personagem_id UUID NOT NULL REFERENCES personagens(id) ON DELETE CASCADE,
                moeda TEXT,
                item_id TEXT,
                delta BIGINT NOT NULL,
                saldo_apos BIGINT,
                motivo TEXT NOT NULL,
                origem TEXT NOT NULL,
                idempotencia TEXT,
                ator_usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
                criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CHECK ((moeda IS NOT NULL) <> (item_id IS NOT NULL))
            )
            """,
            """
            CREATE UNIQUE INDEX IF NOT EXISTS lancamentos_idempotencia_unica
            ON lancamentos_economia (campanha_id, origem, idempotencia)
            WHERE idempotencia IS NOT NULL
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
            ON catalogo_itens (tipo) WHERE ativo = TRUE
            """,
            """
            CREATE TABLE IF NOT EXISTS eventos_auditoria (
                id UUID PRIMARY KEY,
                campanha_id UUID REFERENCES campanhas(id) ON DELETE CASCADE,
                ator_usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
                ator_servico TEXT,
                acao TEXT NOT NULL,
                alvo_tipo TEXT,
                alvo_id TEXT,
                detalhes JSONB NOT NULL DEFAULT '{}'::jsonb,
                criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CHECK (ator_usuario_id IS NOT NULL OR ator_servico IS NOT NULL)
            )
            """,
            """
            CREATE INDEX IF NOT EXISTS eventos_auditoria_campanha_idx
            ON eventos_auditoria (campanha_id, criado_em DESC)
            """,
        ),
    ),
    (
        2,
        "cofre_conta_e_biblioteca_central",
        (
            """
            ALTER TABLE personagens
            ADD COLUMN IF NOT EXISTS economia_versao INTEGER NOT NULL DEFAULT 1
            CHECK (economia_versao > 0)
            """,
            """
            CREATE TABLE IF NOT EXISTS cofre_itens_usuario (
                usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
                campanha_id UUID NOT NULL REFERENCES campanhas(id) ON DELETE CASCADE,
                item_id TEXT NOT NULL,
                titulo TEXT NOT NULL,
                quantidade INTEGER NOT NULL CHECK (quantidade > 0),
                dados JSONB NOT NULL DEFAULT '{}'::jsonb,
                origem TEXT NOT NULL DEFAULT 'discord',
                atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (usuario_id, campanha_id, item_id)
            )
            """,
            """
            CREATE INDEX IF NOT EXISTS cofre_itens_campanha_idx
            ON cofre_itens_usuario (campanha_id, usuario_id, titulo)
            """,
            """
            CREATE TABLE IF NOT EXISTS cofre_saldos_usuario (
                usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
                campanha_id UUID NOT NULL REFERENCES campanhas(id) ON DELETE CASCADE,
                moeda TEXT NOT NULL,
                saldo BIGINT NOT NULL DEFAULT 0 CHECK (saldo >= 0),
                atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (usuario_id, campanha_id, moeda)
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS movimentos_cofre (
                id UUID PRIMARY KEY,
                usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
                campanha_id UUID NOT NULL REFERENCES campanhas(id) ON DELETE CASCADE,
                personagem_id UUID REFERENCES personagens(id) ON DELETE SET NULL,
                origem TEXT NOT NULL,
                idempotencia TEXT NOT NULL,
                detalhes JSONB NOT NULL DEFAULT '{}'::jsonb,
                criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE (campanha_id, origem, idempotencia)
            )
            """,
            """
            CREATE INDEX IF NOT EXISTS movimentos_cofre_usuario_idx
            ON movimentos_cofre (usuario_id, campanha_id, criado_em DESC)
            """,
            """
            CREATE TABLE IF NOT EXISTS biblioteca_conteudo (
                modulo TEXT NOT NULL CHECK (modulo IN ('mundo')),
                tipo TEXT NOT NULL,
                chave_recurso TEXT NOT NULL,
                titulo TEXT NOT NULL,
                dados JSONB NOT NULL DEFAULT '{}'::jsonb,
                ativo BOOLEAN NOT NULL DEFAULT TRUE,
                atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (modulo, tipo, chave_recurso)
            )
            """,
            """
            CREATE INDEX IF NOT EXISTS biblioteca_conteudo_busca_idx
            ON biblioteca_conteudo (modulo, tipo, titulo)
            WHERE ativo = TRUE
            """,
        ),
    ),
    (
        3,
        "biblioteca_de_regras_protegidas",
        (
            """
            ALTER TABLE biblioteca_conteudo
            DROP CONSTRAINT IF EXISTS biblioteca_conteudo_modulo_check
            """,
            """
            ALTER TABLE biblioteca_conteudo
            ADD CONSTRAINT biblioteca_conteudo_modulo_check
            CHECK (modulo IN ('mundo', 'regras'))
            """,
        ),
    ),
    (
        4,
        "papeis_globais_e_gestao_de_campanhas",
        (
            """
            ALTER TABLE usuarios
            ADD COLUMN IF NOT EXISTS papel_plataforma TEXT NOT NULL DEFAULT 'player'
            """,
            """
            UPDATE usuarios
            SET papel_plataforma = CASE
                WHEN admin_plataforma THEN 'admin'
                WHEN EXISTS (
                    SELECT 1 FROM campanhas c
                    WHERE c.dono_id = usuarios.id AND c.status = 'ativa'
                ) THEN 'mestre'
                ELSE 'player'
            END
            WHERE papel_plataforma = 'player'
            """,
            """
            ALTER TABLE usuarios
            ADD CONSTRAINT usuarios_papel_plataforma_check
            CHECK (papel_plataforma IN ('player', 'mestre', 'admin', 'criador'))
            """,
            """
            CREATE UNIQUE INDEX IF NOT EXISTS usuarios_criador_unico
            ON usuarios (papel_plataforma)
            WHERE papel_plataforma = 'criador'
            """,
            """
            CREATE INDEX IF NOT EXISTS usuarios_gestao_idx
            ON usuarios (papel_plataforma, ativo, criado_em DESC)
            """,
        ),
    ),
    (
        5,
        "avisos_da_plataforma",
        (
            """
            CREATE TABLE IF NOT EXISTS notificacoes (
                id UUID PRIMARY KEY,
                usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
                campanha_id UUID REFERENCES campanhas(id) ON DELETE CASCADE,
                origem_usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
                categoria TEXT NOT NULL
                    CHECK (categoria IN ('conta', 'campanha', 'conteudo', 'economia')),
                titulo TEXT NOT NULL,
                mensagem TEXT NOT NULL DEFAULT '',
                dados JSONB NOT NULL DEFAULT '{}'::jsonb,
                lida_em TIMESTAMPTZ,
                criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """,
            """
            CREATE INDEX IF NOT EXISTS notificacoes_caixa_idx
            ON notificacoes (usuario_id, lida_em NULLS FIRST, criado_em DESC)
            """,
        ),
    ),
    (
        6,
        "senha_provisoria_do_administrador",
        (
            """
            ALTER TABLE usuarios
            ADD COLUMN IF NOT EXISTS senha_provisoria BOOLEAN NOT NULL DEFAULT FALSE
            """,
            """
            ALTER TABLE usuarios
            ADD COLUMN IF NOT EXISTS senha_alterada_em TIMESTAMPTZ
            """,
        ),
    ),
    (
        7,
        "sessao_ao_vivo_da_mesa",
        (
            """
            CREATE TABLE IF NOT EXISTS sessoes_mesa (
                id UUID PRIMARY KEY,
                campanha_id UUID NOT NULL REFERENCES campanhas(id) ON DELETE CASCADE,
                status TEXT NOT NULL DEFAULT 'aberta'
                    CHECK (status IN ('aberta', 'encerrada')),
                titulo TEXT NOT NULL DEFAULT '',
                rodada INTEGER NOT NULL DEFAULT 1 CHECK (rodada > 0),
                turno_indice INTEGER NOT NULL DEFAULT 0 CHECK (turno_indice >= 0),
                em_combate BOOLEAN NOT NULL DEFAULT FALSE,
                versao INTEGER NOT NULL DEFAULT 1 CHECK (versao > 0),
                aberta_por UUID NOT NULL REFERENCES usuarios(id),
                iniciada_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                encerrada_em TIMESTAMPTZ,
                atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """,
            # Uma mesa só pode ter uma sessão acontecendo por vez.
            """
            CREATE UNIQUE INDEX IF NOT EXISTS sessoes_mesa_aberta_unica
            ON sessoes_mesa (campanha_id) WHERE status = 'aberta'
            """,
            """
            CREATE TABLE IF NOT EXISTS sessao_participantes (
                id UUID PRIMARY KEY,
                sessao_id UUID NOT NULL REFERENCES sessoes_mesa(id) ON DELETE CASCADE,
                personagem_id UUID REFERENCES personagens(id) ON DELETE SET NULL,
                nome TEXT NOT NULL,
                tipo TEXT NOT NULL DEFAULT 'inimigo'
                    CHECK (tipo IN ('jogador', 'aliado', 'inimigo')),
                iniciativa INTEGER NOT NULL DEFAULT 0,
                vida_atual INTEGER NOT NULL DEFAULT 0,
                vida_maxima INTEGER NOT NULL DEFAULT 0 CHECK (vida_maxima >= 0),
                condicoes JSONB NOT NULL DEFAULT '[]'::jsonb,
                anotacao TEXT NOT NULL DEFAULT '',
                visivel BOOLEAN NOT NULL DEFAULT TRUE,
                vida_visivel BOOLEAN NOT NULL DEFAULT TRUE,
                ordem INTEGER NOT NULL DEFAULT 0,
                criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """,
            """
            CREATE INDEX IF NOT EXISTS sessao_participantes_ordem_idx
            ON sessao_participantes (sessao_id, ordem, iniciativa DESC)
            """,
        ),
    ),
    (
        8,
        "registro_de_rolagens_e_usos",
        (
            """
            CREATE TABLE IF NOT EXISTS registros_mesa (
                id UUID PRIMARY KEY,
                campanha_id UUID NOT NULL REFERENCES campanhas(id) ON DELETE CASCADE,
                sessao_id UUID REFERENCES sessoes_mesa(id) ON DELETE SET NULL,
                usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
                personagem_id UUID REFERENCES personagens(id) ON DELETE SET NULL,
                -- Nome congelado: o log continua legível depois de o personagem
                -- ser renomeado ou arquivado.
                autor_nome TEXT NOT NULL DEFAULT '',
                tipo TEXT NOT NULL
                    CHECK (tipo IN ('rolagem', 'dano', 'poder', 'habilidade',
                                    'magia', 'item', 'anotacao')),
                titulo TEXT NOT NULL,
                formula TEXT NOT NULL DEFAULT '',
                resultado INTEGER,
                detalhes JSONB NOT NULL DEFAULT '{}'::jsonb,
                criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """,
            """
            CREATE INDEX IF NOT EXISTS registros_mesa_campanha_idx
            ON registros_mesa (campanha_id, criado_em DESC)
            """,
            """
            CREATE INDEX IF NOT EXISTS registros_mesa_sessao_idx
            ON registros_mesa (sessao_id, criado_em DESC)
            """,
        ),
    ),
    (
        9,
        "pedidos_de_redefinicao_de_senha",
        (
            """
            CREATE TABLE IF NOT EXISTS pedidos_senha (
                id UUID PRIMARY KEY,
                usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
                -- Guardado como veio: um pedido para e-mail inexistente também
                -- é registrado, para o admin perceber tentativa de engano.
                email TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'aberto'
                    CHECK (status IN ('aberto', 'atendido', 'recusado')),
                origem_ip_hash TEXT,
                atendido_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
                atendido_em TIMESTAMPTZ,
                criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """,
            """
            CREATE INDEX IF NOT EXISTS pedidos_senha_fila_idx
            ON pedidos_senha (status, criado_em DESC)
            """,
            # Um pedido aberto por conta: clicar dez vezes não vira dez avisos.
            """
            CREATE UNIQUE INDEX IF NOT EXISTS pedidos_senha_aberto_unico
            ON pedidos_senha (LOWER(email)) WHERE status = 'aberto'
            """,
        ),
    ),
    (
        10,
        "limite_de_tentativas_para_qualquer_acao",
        (
            # A tabela nasceu só para o login, mas a mecânica serve para
            # cadastro, pedido de senha e troca de senha. O nome acompanha o
            # uso; a coluna `chave_hash` já embute a ação, então limites de
            # ações diferentes não se misturam.
            """
            ALTER TABLE IF EXISTS limites_login RENAME TO limites_acesso
            """,
            """
            CREATE TABLE IF NOT EXISTS limites_acesso (
                chave_hash TEXT PRIMARY KEY,
                tentativas INTEGER NOT NULL DEFAULT 0,
                janela_iniciada_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                bloqueado_ate TIMESTAMPTZ
            )
            """,
            # Faxina do que já expirou, para a tabela não crescer para sempre.
            """
            CREATE INDEX IF NOT EXISTS limites_acesso_janela_idx
            ON limites_acesso (janela_iniciada_em)
            """,
        ),
    ),
)
