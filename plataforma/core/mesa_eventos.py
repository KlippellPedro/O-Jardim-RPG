"""Linha do tempo da sessão (tabela `eventos_mesa`), a base do replay.

Fica separada de `core/mesa.py` porque aquele não conhece banco. Aqui só se
grava; quem monta a linha do tempo para leitura é `routers/mesa.py`.
"""

from __future__ import annotations

from uuid import UUID, uuid4

from psycopg.types.json import Jsonb


def registrar(
    connection,
    campanha_id: UUID,
    sessao_id: UUID | None,
    tipo: str,
    texto: str,
    *,
    publico: bool = True,
    detalhes: dict | None = None,
) -> None:
    connection.execute(
        """
        INSERT INTO eventos_mesa (id, campanha_id, sessao_id, tipo, texto, publico, detalhes)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        """,
        (uuid4(), campanha_id, sessao_id, tipo, texto[:400], publico, Jsonb(detalhes or {})),
    )


def registrar_varios(connection, campanha_id: UUID, sessao_id: UUID | None, eventos: list[dict]) -> None:
    for evento in eventos:
        registrar(
            connection,
            campanha_id,
            sessao_id,
            evento["tipo"],
            evento["texto"],
            publico=bool(evento.get("publico", True)),
            detalhes=evento.get("detalhes"),
        )
