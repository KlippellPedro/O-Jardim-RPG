from __future__ import annotations

import json
import logging
from pathlib import Path

from psycopg.types.json import Jsonb

from .database import Database


log = logging.getLogger("jardim-plataforma")

_SHOP_TYPES = {
    "arma", "armadura", "artefato", "consumivel", "drop", "equipamento",
    "fruto-eden", "implante", "modificacao", "monstro", "propriedade",
    "veiculo", "veiculo-completo",
}
_SHOP_RARITIES = {
    "comum", "incomum", "raro", "epico", "lendario", "reliquia",
    "reliquia da criacao", "mitico",
}
# conteudo.aplicacao de toda entrada tipo "modificacao" (liga a modificacao ao
# tipo de item base). Validado aqui pelo mesmo motivo de _SHOP_TYPES/_SHOP_RARITIES:
# sem isso, um valor digitado errado nunca dá erro, só faz a modificação nunca
# casar com nenhum item no filtro da loja (ver achado 11 da auditoria de 2026-08).
_MODIFICATION_APPLICATIONS = {"armas", "armaduras", "escudos", "itens gerais e magicos"}


def _normalize_catalog_value(value: object) -> str:
    import unicodedata

    text = unicodedata.normalize("NFD", str(value or ""))
    return "".join(char for char in text if unicodedata.category(char) != "Mn").strip().lower()


def sync_shop_catalog(database: Database, data_root: Path) -> int:
    """Publica o catálogo versionado no PostgreSQL durante cada deploy.

    A leitura e a validação acontecem antes da transação. Assim, um JSON
    incompleto nunca substitui parcialmente o catálogo que já está ativo.
    Itens retirados da fonte são desativados, não apagados, preservando o
    histórico de inventários que ainda referenciam seus ids.
    """
    catalog_path = data_root / "loja" / "catalogo.json"
    if not catalog_path.is_file():
        log.warning("Catálogo da loja ausente em %s", catalog_path)
        return 0

    try:
        payload = json.loads(catalog_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise RuntimeError(f"não foi possível ler o catálogo da loja: {catalog_path}") from exc

    candidates = payload.get("entradas") if isinstance(payload, dict) else None
    if not isinstance(candidates, list) or not candidates:
        raise RuntimeError("catálogo da loja não possui uma lista de entradas válida")

    entries: list[dict] = []
    seen_ids: set[str] = set()
    for index, item in enumerate(candidates, start=1):
        if not isinstance(item, dict):
            raise RuntimeError(f"entrada {index} do catálogo não é um objeto")
        item_id = str(item.get("id") or "").strip()
        item_type = str(item.get("tipo") or "").strip()
        title = str(item.get("titulo") or "").strip()
        content = item.get("conteudo")
        if not item_id or item_id in seen_ids:
            raise RuntimeError(f"entrada {index} possui id ausente ou duplicado: {item_id!r}")
        if item_type not in _SHOP_TYPES:
            raise RuntimeError(f"entrada {item_id!r} possui tipo desconhecido: {item_type!r}")
        if not title or not isinstance(content, dict):
            raise RuntimeError(f"entrada {item_id!r} não possui título/conteúdo válido")
        rarity = content.get("raridade")
        if rarity is not None and _normalize_catalog_value(rarity) not in _SHOP_RARITIES:
            raise RuntimeError(f"entrada {item_id!r} possui raridade desconhecida: {rarity!r}")
        if item_type == "modificacao":
            application = content.get("aplicacao")
            if _normalize_catalog_value(application) not in _MODIFICATION_APPLICATIONS:
                raise RuntimeError(f"modificacao {item_id!r} possui aplicacao desconhecida: {application!r}")
        seen_ids.add(item_id)
        entries.append({"id": item_id, "tipo": item_type, "titulo": title, "conteudo": content})

    with database.connection() as connection:
        for item in entries:
            connection.execute(
                """
                INSERT INTO catalogo_itens
                    (id, tipo, titulo, conteudo, ativo, atualizado_em)
                VALUES (%s, %s, %s, %s, TRUE, CURRENT_TIMESTAMP)
                ON CONFLICT (id) DO UPDATE SET
                    tipo=EXCLUDED.tipo,
                    titulo=EXCLUDED.titulo,
                    conteudo=EXCLUDED.conteudo,
                    ativo=TRUE,
                    atualizado_em=CURRENT_TIMESTAMP
                """,
                (item["id"], item["tipo"], item["titulo"], Jsonb(item["conteudo"])),
            )
        connection.execute(
            """
            UPDATE catalogo_itens
            SET ativo=FALSE, atualizado_em=CURRENT_TIMESTAMP
            WHERE ativo=TRUE AND NOT (id = ANY(%s))
            """,
            (list(seen_ids),),
        )

    log.info("Catálogo oficial da loja sincronizado: %s itens ativos.", len(entries))
    return len(entries)


def seed_world_library(database: Database, data_root: Path) -> int:
    """Carrega as bibliotecas editoriais empacotadas, sem publicar campanhas."""
    world_root = data_root / "mundo"
    if not world_root.exists():
        log.warning("Biblioteca de Mundo ausente em %s", world_root)

    entries: dict[tuple[str, str], dict] = {}
    world_paths = world_root.rglob("*.json") if world_root.exists() else ()
    for path in world_paths:
        if path.name.startswith("_"):
            continue
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            log.exception("Falha ao ler conteudo de Mundo em %s", path)
            continue
        if path.name == "cronicas-arvores.json" and isinstance(payload, dict):
            introduction = payload.get("introducao")
            title = introduction.get("titulo") if isinstance(introduction, dict) else None
            entries[("cronologia", "cronicas-arvores")] = {
                "tipo": "cronologia",
                "id": "cronicas-arvores",
                "titulo": str(title or "Crônicas do Jardim"),
                "conteudo": payload,
            }
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
            document = {
                "tipo": entry_type,
                "id": entry_id,
                "titulo": title,
                "conteudo": content,
            }
            if isinstance(item.get("revelado"), bool):
                document["revelado"] = item["revelado"]
            entries[(entry_type, entry_id)] = document

    rules_path = data_root / "regras" / "mestre-v1.json"
    master_rules = None
    if rules_path.exists():
        try:
            candidate = json.loads(rules_path.read_text(encoding="utf-8"))
            if isinstance(candidate, dict) and candidate.get("tipo") == "regras-mestre":
                master_rules = candidate
        except (OSError, json.JSONDecodeError):
            log.exception("Falha ao ler regras protegidas em %s", rules_path)

    rules_entries: dict[tuple[str, str], dict] = {}
    editorial_rules_path = data_root / "regras" / "regras-editorial.json"
    if editorial_rules_path.exists():
        try:
            rules_payload = json.loads(editorial_rules_path.read_text(encoding="utf-8"))
            candidates = rules_payload.get("entradas") if isinstance(rules_payload, dict) else None
            if isinstance(candidates, list):
                for item in candidates:
                    if not isinstance(item, dict):
                        continue
                    resource_id = str(item.get("id") or "").strip()
                    title = str(item.get("titulo") or "").strip()
                    content = item.get("conteudo")
                    if resource_id and title and isinstance(content, dict):
                        rules_entries[("regra", resource_id)] = {
                            "tipo": "regra", "id": resource_id,
                            "titulo": title, "conteudo": content,
                        }
        except (OSError, json.JSONDecodeError):
            log.exception("Falha ao ler capítulos editoriais em %s", editorial_rules_path)

    for entry_type, filename in (("classe", "classes.json"), ("raca", "racas.json")):
        catalog_path = data_root / "ficha" / filename
        if not catalog_path.exists():
            continue
        try:
            candidates = json.loads(catalog_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            log.exception("Falha ao ler catálogo editorial em %s", catalog_path)
            continue
        if not isinstance(candidates, list):
            continue
        for item in candidates:
            if not isinstance(item, dict):
                continue
            resource_id = str(item.get("id") or "").strip()
            title = str(item.get("titulo") or "").strip()
            if not resource_id or not title:
                continue
            content = {
                key: value
                for key, value in item.items()
                if key not in {"id", "tipo", "titulo"}
            }
            rules_entries[(entry_type, resource_id)] = {
                "tipo": entry_type, "id": resource_id,
                "titulo": title, "conteudo": content,
            }

    magic_path = data_root / "ficha" / "magias.json"
    if magic_path.exists():
        try:
            magic_payload = json.loads(magic_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            log.exception("Falha ao ler catálogo mágico editorial em %s", magic_path)
            magic_payload = {}
        for entry_type, collection in (
            ("fluxo", "fluxos"),
            ("magia", "magias"),
            ("ritual", "rituais"),
            ("selo", "selos"),
            ("encantamento", "encantamentos"),
        ):
            candidates = magic_payload.get(collection) if isinstance(magic_payload, dict) else None
            if not isinstance(candidates, list):
                continue
            for item in candidates:
                if not isinstance(item, dict):
                    continue
                resource_id = str(item.get("id") or "").strip()
                title = str(item.get("titulo") or "").strip()
                if not resource_id or not title:
                    continue
                rules_entries[(entry_type, resource_id)] = {
                    "tipo": entry_type,
                    "id": resource_id,
                    "titulo": title,
                    "conteudo": {
                        key: value for key, value in item.items()
                        if key not in {"id", "tipo", "titulo"}
                    },
                }

    skills_path = data_root / "ficha" / "pericias.json"
    if skills_path.exists():
        try:
            skills_payload = json.loads(skills_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            log.exception("Falha ao ler perícias editoriais em %s", skills_path)
            skills_payload = {}
        candidates = skills_payload.get("pericias") if isinstance(skills_payload, dict) else None
        if isinstance(candidates, list):
            for item in candidates:
                if not isinstance(item, dict):
                    continue
                resource_id = str(item.get("id") or "").strip()
                title = str(item.get("titulo") or "").strip()
                if resource_id and title:
                    rules_entries[("pericia", resource_id)] = {
                        "tipo": "pericia", "id": resource_id, "titulo": title,
                        "conteudo": {
                            key: value for key, value in item.items()
                            if key not in {"id", "tipo", "titulo"}
                        },
                    }

    legacy_rules_path = data_root / "ficha" / "legados-regras-v1.json"
    legacy_rules: dict[str, dict] = {}
    if legacy_rules_path.exists():
        try:
            legacy_rules_payload = json.loads(legacy_rules_path.read_text(encoding="utf-8"))
            candidate_rules = legacy_rules_payload.get("regras") if isinstance(legacy_rules_payload, dict) else None
            if isinstance(candidate_rules, dict):
                legacy_rules = {
                    str(key): value for key, value in candidate_rules.items()
                    if isinstance(value, dict)
                }
        except (OSError, json.JSONDecodeError):
            log.exception("Falha ao ler regras editoriais de Legados em %s", legacy_rules_path)
    for filename, collection in (("legados.json", "legados"), ("legados-novos.json", "novos")):
        legacy_path = data_root / "ficha" / filename
        if not legacy_path.exists():
            continue
        try:
            legacy_payload = json.loads(legacy_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            log.exception("Falha ao ler Legados editoriais em %s", legacy_path)
            continue
        candidates = legacy_payload.get(collection) if isinstance(legacy_payload, dict) else None
        if not isinstance(candidates, list):
            continue
        for item in candidates:
            if not isinstance(item, dict):
                continue
            resource_id = str(item.get("id") or "").strip()
            title = str(item.get("titulo") or "").strip()
            if not resource_id or not title:
                continue
            merged = {**item, **legacy_rules.get(resource_id, {})}
            rules_entries[("legado", resource_id)] = {
                "tipo": "legado", "id": resource_id, "titulo": title,
                "conteudo": {
                    key: value for key, value in merged.items()
                    if key not in {"id", "tipo", "titulo"}
                },
            }

    conditions_path = data_root / "regras" / "condicoes-editorial.json"
    if conditions_path.exists():
        try:
            conditions_payload = json.loads(conditions_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            log.exception("Falha ao ler condições editoriais em %s", conditions_path)
            conditions_payload = {}
        candidates = conditions_payload.get("entradas") if isinstance(conditions_payload, dict) else None
        if isinstance(candidates, list):
            for item in candidates:
                if not isinstance(item, dict):
                    continue
                entry_type = str(item.get("tipo") or "").strip()
                resource_id = str(item.get("id") or "").strip()
                title = str(item.get("titulo") or "").strip()
                if entry_type in {"condicao", "crise"} and resource_id and title:
                    rules_entries[(entry_type, resource_id)] = {
                        "tipo": entry_type, "id": resource_id, "titulo": title,
                        "conteudo": {
                            key: value for key, value in item.items()
                            if key not in {"id", "tipo", "titulo"}
                        },
                    }

    with database.connection() as connection:
        if entries:
            # executemany faz pipeline no psycopg3 - uma viagem de rede pro
            # lote inteiro, em vez de uma por linha, no boot de todo restart.
            with connection.cursor() as cursor:
                cursor.executemany(
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
                    [
                        (entry_type, entry_id, item["titulo"], Jsonb(item))
                        for (entry_type, entry_id), item in entries.items()
                    ],
                )
            # Sem isto a biblioteca só crescia: uma entrada apagada do catálogo
            # continuava ativa no banco e voltava a aparecer no Mundo, e trocar
            # o `tipo` de uma entrada deixava a versão antiga viva ao lado da
            # nova. O módulo `regras` logo abaixo já fazia essa limpeza.
            connection.execute(
                """
                UPDATE biblioteca_conteudo
                SET ativo=FALSE, atualizado_em=CURRENT_TIMESTAMP
                WHERE modulo='mundo' AND ativo=TRUE
                  AND NOT EXISTS (
                      SELECT 1
                      FROM unnest(%s::text[], %s::text[]) AS vigentes(tipo, chave)
                      WHERE vigentes.tipo = biblioteca_conteudo.tipo
                        AND vigentes.chave = biblioteca_conteudo.chave_recurso
                  )
                """,
                (
                    [entry_type for entry_type, _ in entries],
                    [entry_id for _, entry_id in entries],
                ),
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
        rule_ids_by_type: dict[str, list[str]] = {}
        for entry_type, entry_id in rules_entries:
            rule_ids_by_type.setdefault(entry_type, []).append(entry_id)
        for entry_type, active_ids in rule_ids_by_type.items():
            connection.execute(
                """
                UPDATE biblioteca_conteudo
                SET ativo=FALSE, atualizado_em=CURRENT_TIMESTAMP
                WHERE modulo='regras' AND tipo=%s
                  AND NOT (chave_recurso = ANY(%s))
                """,
                (entry_type, active_ids),
            )
        if rules_entries:
            with connection.cursor() as cursor:
                cursor.executemany(
                    """
                    INSERT INTO biblioteca_conteudo
                        (modulo, tipo, chave_recurso, titulo, dados, ativo, atualizado_em)
                    VALUES ('regras', %s, %s, %s, %s, TRUE, CURRENT_TIMESTAMP)
                    ON CONFLICT (modulo, tipo, chave_recurso) DO UPDATE SET
                        titulo=EXCLUDED.titulo,
                        dados=EXCLUDED.dados,
                        ativo=TRUE,
                        atualizado_em=CURRENT_TIMESTAMP
                    """,
                    [
                        (entry_type, entry_id, item["titulo"], Jsonb(item))
                        for (entry_type, entry_id), item in rules_entries.items()
                    ],
                )
    total = len(entries) + len(rules_entries) + (1 if master_rules else 0)
    log.info("Biblioteca central protegida atualizada: %s entradas.", total)
    return total
