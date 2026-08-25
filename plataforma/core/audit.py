from __future__ import annotations

import math
from typing import Any
from uuid import uuid4

from psycopg.types.json import Jsonb


_SENSITIVE_PATH_MARKERS = frozenset({
    "password", "senha", "secret", "segredo", "token", "jwt", "cookie",
    "authorization", "csrf", "chave_privada",
})
_MISSING = object()


def _safe_audit_value(value: Any, path: str) -> Any:
    normalized_path = path.casefold().replace("-", "_")
    if any(marker in normalized_path for marker in _SENSITIVE_PATH_MARKERS):
        return "[protegido]"
    if value is _MISSING:
        return None
    if value is None or isinstance(value, (bool, int)):
        return value
    if isinstance(value, float):
        return value if math.isfinite(value) else str(value)
    if isinstance(value, str):
        return value if len(value) <= 180 else f"{value[:177]}..."
    if isinstance(value, list):
        if len(value) <= 12 and all(item is None or isinstance(item, (bool, int, float, str)) for item in value):
            return [_safe_audit_value(item, path) for item in value]
        return {"tipo": "lista", "itens": len(value)}
    if isinstance(value, dict):
        keys = sorted(str(key) for key in value)[:20]
        return {"tipo": "objeto", "campos": keys, "total_campos": len(value)}
    return str(value)[:180]


def _list_by_stable_id(value: list[Any]) -> dict[str, Any] | None:
    if not value or not all(isinstance(item, dict) for item in value):
        return None
    result: dict[str, Any] = {}
    for item in value:
        item_id = str(item.get("id") or item.get("classeId") or "").strip()
        if not item_id or item_id in result:
            return None
        result[item_id] = item
    return result


def character_sheet_diff(
    before: dict[str, Any] | None,
    after: dict[str, Any] | None,
    *,
    max_changes: int = 80,
    max_depth: int = 8,
) -> dict[str, Any]:
    """Produz um resumo auditável sem persistir uma segunda cópia da ficha.

    Objetos são comparados por caminho. Listas de objetos com ``id`` estável
    também são comparadas item a item; outras listas aparecem como uma única
    alteração resumida. Valores longos são truncados e chaves sensíveis são
    mascaradas, mesmo que uma ficha futura passe a armazená-las por engano.
    """
    changes: list[dict[str, Any]] = []
    total = 0

    def add(path: str, operation: str, old: Any, new: Any) -> None:
        nonlocal total
        total += 1
        if len(changes) >= max_changes:
            return
        entry: dict[str, Any] = {"caminho": path or "ficha", "operacao": operation}
        if operation != "adicionado":
            entry["antes"] = _safe_audit_value(old, path)
        if operation != "removido":
            entry["depois"] = _safe_audit_value(new, path)
        changes.append(entry)

    def walk(old: Any, new: Any, path: str, depth: int) -> None:
        if old == new:
            return
        if depth >= max_depth:
            add(path, "alterado", old, new)
            return
        if isinstance(old, dict) and isinstance(new, dict):
            for key in sorted(set(old) | set(new), key=str):
                child_path = f"{path}.{key}" if path else str(key)
                if key not in old:
                    add(child_path, "adicionado", _MISSING, new[key])
                elif key not in new:
                    add(child_path, "removido", old[key], _MISSING)
                else:
                    walk(old[key], new[key], child_path, depth + 1)
            return
        if isinstance(old, list) and isinstance(new, list):
            old_by_id = _list_by_stable_id(old)
            new_by_id = _list_by_stable_id(new)
            if old_by_id is not None and new_by_id is not None:
                for item_id in sorted(set(old_by_id) | set(new_by_id)):
                    child_path = f"{path}[{item_id}]"
                    if item_id not in old_by_id:
                        add(child_path, "adicionado", _MISSING, new_by_id[item_id])
                    elif item_id not in new_by_id:
                        add(child_path, "removido", old_by_id[item_id], _MISSING)
                    else:
                        walk(old_by_id[item_id], new_by_id[item_id], child_path, depth + 1)
                return
        add(path, "alterado", old, new)

    walk(before if isinstance(before, dict) else {}, after if isinstance(after, dict) else {}, "", 0)
    return {
        "mudancas": changes,
        "total_mudancas": total,
        "truncado": total > len(changes),
    }


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
