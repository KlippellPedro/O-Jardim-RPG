from __future__ import annotations

from uuid import UUID, uuid4

from psycopg.types.json import Jsonb


CATEGORIES = ("conta", "campanha", "conteudo", "economia", "sessao")

# Onde o aviso mora no site. 'geral' é a caixa da engrenagem (o que é da pessoa); 'mestre' aparece no Painel do
# Mestre da campanha do aviso; 'admin' aparece na Administração. A migração 55 reclassificou os avisos antigos.
PANELS = ("geral", "mestre", "admin")

# Fragmentos de SQL compartilhados pela lista, pelo "marcar como lido", pela limpeza e pela contagem. O alias da
# tabela é sempre `n`.
#
# O aviso do Mestre só vale enquanto a pessoa ainda comanda aquela mesa: quem perdeu o cargo não tem como abrir o
# Painel do Mestre, e o número vermelho de um aviso inalcançável nunca sairia.
MANAGES_CAMPAIGN_SQL = """
    EXISTS (
        SELECT 1 FROM membros_campanha m
        WHERE m.campanha_id=n.campanha_id AND m.usuario_id=n.usuario_id
          AND m.status='ativo' AND m.papel IN ('mestre', 'assistente')
    )
"""

# Reivindicação de recompensa ainda sem resposta é fila de trabalho do Mestre, não recado: "marcar tudo como
# lido" e "limpar lidos" não podem tirá-la da Loja, onde ela é aprovada ou recusada (routers/bounties.py).
PENDING_WORK_SQL = "(n.dados->>'tipo' = 'claim_recompensa' AND COALESCE(n.dados->>'status', '') = 'pendente')"


def notify(
    connection,
    *,
    user_ids,
    category: str,
    title: str,
    message: str = "",
    campaign_id=None,
    actor_user_id=None,
    details: dict | None = None,
    include_actor: bool = False,
    panel: str = "geral",
) -> int:
    """Registra um aviso para cada destinatário.

    O ator não recebe aviso da própria ação por padrão: quem clicou no botão já
    viu o resultado na tela, e repetir isso só polui a caixa.

    `panel` diz onde o aviso aparece. O padrão é a caixa geral; use 'mestre' para o
    que só interessa a quem comanda a mesa e 'admin' para o que é da administração.
    """
    if category not in CATEGORIES:
        raise ValueError(f"categoria de aviso invalida: {category}")
    if panel not in PANELS:
        raise ValueError(f"painel de aviso invalido: {panel}")

    alvos: list[UUID] = []
    for user_id in user_ids:
        if user_id is None:
            continue
        if not include_actor and actor_user_id is not None and user_id == actor_user_id:
            continue
        if user_id not in alvos:
            alvos.append(user_id)
    if not alvos:
        return 0

    with connection.cursor() as cursor:
        cursor.executemany(
            """
            INSERT INTO notificacoes
                (id, usuario_id, campanha_id, origem_usuario_id,
                 categoria, titulo, mensagem, dados, painel)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            [
                (
                    uuid4(),
                    user_id,
                    campaign_id,
                    actor_user_id,
                    category,
                    title[:160],
                    message[:600],
                    Jsonb(details or {}),
                    panel,
                )
                for user_id in alvos
            ],
        )
    return len(alvos)


def contar_avisos(connection, user_id, *, campaign_id=None, is_platform_admin: bool = False) -> dict:
    """Avisos não lidos de quem está logado, já separados por painel.

    `mestre` conta só a campanha ativa (`campaign_id`); `mestre_por_campanha` traz todas, para o site mostrar
    onde há recado esperando em outra mesa. `total` é tudo que a pessoa ainda pode abrir, então não inclui o que
    ficou sem painel acessível (aviso de Mestre de uma mesa que ela já não comanda, aviso de admin de quem deixou
    de ser admin).
    """
    linhas = connection.execute(
        f"""
        SELECT n.painel, n.campanha_id, COUNT(*) AS total
        FROM notificacoes n
        WHERE n.usuario_id=%s AND n.lida_em IS NULL
          AND (n.painel <> 'mestre' OR {MANAGES_CAMPAIGN_SQL})
        GROUP BY n.painel, n.campanha_id
        """,
        (user_id,),
    ).fetchall()

    geral = 0
    admin = 0
    por_campanha: dict[str, int] = {}
    for linha in linhas:
        total = int(linha["total"])
        if linha["painel"] == "mestre":
            if linha["campanha_id"] is not None:
                chave = str(linha["campanha_id"])
                por_campanha[chave] = por_campanha.get(chave, 0) + total
        elif linha["painel"] == "admin":
            if is_platform_admin:
                admin += total
        else:
            geral += total

    mestre = por_campanha.get(str(campaign_id), 0) if campaign_id else 0
    return {
        "geral": geral,
        "mestre": mestre,
        "admin": admin,
        "mestre_por_campanha": por_campanha,
        "total": geral + admin + sum(por_campanha.values()),
    }


def campaign_member_ids(connection, campaign_id, *, roles: tuple[str, ...] | None = None):
    """IDs dos membros ativos da campanha, opcionalmente filtrados por papel."""
    if roles:
        rows = connection.execute(
            """
            SELECT usuario_id FROM membros_campanha
            WHERE campanha_id=%s AND status='ativo' AND papel = ANY(%s)
            """,
            (campaign_id, list(roles)),
        ).fetchall()
    else:
        rows = connection.execute(
            """
            SELECT usuario_id FROM membros_campanha
            WHERE campanha_id=%s AND status='ativo'
            """,
            (campaign_id,),
        ).fetchall()
    return [row["usuario_id"] for row in rows]


def character_owner_ids(connection, campaign_id, character_ids):
    """Donos dos personagens informados, sem repetição."""
    if not character_ids:
        return []
    rows = connection.execute(
        """
        SELECT DISTINCT dono_usuario_id FROM personagens
        WHERE campanha_id=%s AND id = ANY(%s) AND status='ativo'
          AND dono_usuario_id IS NOT NULL
        """,
        (campaign_id, list(character_ids)),
    ).fetchall()
    return [row["dono_usuario_id"] for row in rows]
