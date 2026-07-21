from __future__ import annotations

import json
import logging
from pathlib import Path

from psycopg.types.json import Jsonb

from .database import Database


log = logging.getLogger("jardim-plataforma")


def seed_world_library(database: Database, data_root: Path) -> int:
    """Carrega a biblioteca de Mundo empacotada, sem liberar nada a jogadores."""
    world_root = data_root / "mundo"
    if not world_root.exists():
        log.warning("Biblioteca de Mundo ausente em %s", world_root)
        return 0

    entries: dict[tuple[str, str], dict] = {}
    for path in world_root.rglob("*.json"):
        if path.name.startswith("_"):
            continue
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            log.exception("Falha ao ler conteudo de Mundo em %s", path)
            continue
        candidates = payload.get("entradas") if isinstance(payload, dict) else None
        if not isinstance(candidates, list):
            continue
        for item in candidates:
            if not isinstance(item, dict) or item.get("_pronto_para_importar") is False:
                continue
            entry_type = str(item.get("tipo") or "").strip().lower()
            entry_id = str(item.get("id") or "").strip()
            title = str(item.get("titulo") or "").strip()
            content = item.get("conteudo")
            if not entry_type or not entry_id or not title or not isinstance(content, dict):
                continue
            entries[(entry_type, entry_id)] = {
                "tipo": entry_type,
                "id": entry_id,
                "titulo": title,
                "conteudo": content,
            }

    rules_path = data_root / "regras" / "mestre-v1.json"
    master_rules = None
    if rules_path.exists():
        try:
            candidate = json.loads(rules_path.read_text(encoding="utf-8"))
            if isinstance(candidate, dict) and candidate.get("tipo") == "regras-mestre":
                master_rules = candidate
        except (OSError, json.JSONDecodeError):
            log.exception("Falha ao ler regras protegidas em %s", rules_path)

    with database.connection() as connection:
        for (entry_type, entry_id), item in entries.items():
            connection.execute(
                """
                INSERT INTO biblioteca_conteudo
                    (modulo, tipo, chave_recurso, titulo, dados, ativo, atualizado_em)
                VALUES ('mundo', %s, %s, %s, %s, TRUE, CURRENT_TIMESTAMP)
                ON CONFLICT (modulo, tipo, chave_recurso) DO UPDATE SET
                    titulo=EXCLUDED.titulo,
                    dados=EXCLUDED.dados,
                    ativo=TRUE,
                    atualizado_em=CURRENT_TIMESTAMP
                """,
                (entry_type, entry_id, item["titulo"], Jsonb(item)),
            )
        if master_rules:
            connection.execute(
                """
                INSERT INTO biblioteca_conteudo
                    (modulo, tipo, chave_recurso, titulo, dados, ativo, atualizado_em)
                VALUES ('regras', 'regras-mestre', 'mestre-v1', %s, %s, TRUE, CURRENT_TIMESTAMP)
                ON CONFLICT (modulo, tipo, chave_recurso) DO UPDATE SET
                    titulo=EXCLUDED.titulo,
                    dados=EXCLUDED.dados,
                    ativo=TRUE,
                    atualizado_em=CURRENT_TIMESTAMP
                """,
                (master_rules.get("titulo") or "Ferramentas do Mestre", Jsonb(master_rules)),
            )
    total = len(entries) + (1 if master_rules else 0)
    log.info("Biblioteca central protegida atualizada: %s entradas.", total)
    return total
