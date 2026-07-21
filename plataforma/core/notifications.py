from __future__ import annotations

from uuid import UUID, uuid4

from psycopg.types.json import Jsonb


CATEGORIES = ("conta", "campanha", "conteudo", "economia")


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
) -> int:
    """Registra um aviso para cada destinatário.

    O ator não recebe aviso da própria ação por padrão: quem clicou no botão já
    viu o resultado na tela, e repetir isso só polui a caixa.
    """
    if category not in CATEGORIES:
        raise ValueError(f"categoria de aviso invalida: {category}")

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

    for user_id in alvos:
        connection.execute(
            """
            INSERT INTO notificacoes
                (id, usuario_id, campanha_id, origem_usuario_id,
                 categoria, titulo, mensagem, dados)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                uuid4(),
                user_id,
                campaign_id,
                actor_user_id,
                category,
                title[:160],
                message[:600],
                Jsonb(details or {}),
            ),
        )
    return len(alvos)


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
