from __future__ import annotations

from uuid import uuid4

from psycopg.types.json import Jsonb


def record_audit(
    connection,
    *,
    action: str,
    actor_user_id=None,
    actor_service: str | None = None,
    campaign_id=None,
    target_type: str | None = None,
    target_id: str | None = None,
    details: dict | None = None,
) -> None:
    if actor_user_id is None and not actor_service:
        raise ValueError("auditoria exige ator usuario ou servico")
    connection.execute(
        """
        INSERT INTO eventos_auditoria
            (id, campanha_id, ator_usuario_id, ator_servico, acao,
             alvo_tipo, alvo_id, detalhes)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """,
        (
            uuid4(),
            campaign_id,
            actor_user_id,
            actor_service,
            action,
            target_type,
            target_id,
            Jsonb(details or {}),
        ),
    )
