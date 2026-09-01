from __future__ import annotations

from datetime import datetime, timezone
from html.parser import HTMLParser
import re
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, status
from psycopg.types.json import Jsonb

from core.audit import record_audit
from core.database import Database
from core.dependencies import (
    AuthenticatedUser,
    campaign_access,
    get_current_user,
    get_database,
    require_creator_campaign,
    require_csrf,
)
from core.notifications import campaign_member_ids, notify
from schemas import (
    ContentAccessInput,
    ContentEditorialDeleteInput,
    ContentEditorialDraftInput,
    ContentEditorialPublishInput,
    ContentPublishInput,
    GlobalContentEditorialDraftInput,
    GlobalContentEditorialVersionInput,
)


router = APIRouter(prefix="/conteudo", tags=["conteudo-central"])
_MODULE_LABELS = {"loja": "Itens", "mundo": "Mundo", "regras": "Área do mestre"}


def _library_rows(connection, module: str):
    if module == "loja":
        return connection.execute(
            """
            SELECT tipo, id AS chave_recurso, titulo,
                   jsonb_build_object(
                       'tipo', tipo, 'id', id, 'titulo', titulo,
                       'conteudo', conteudo
                   ) AS dados
            FROM catalogo_itens
            WHERE ativo=TRUE
            ORDER BY tipo, titulo
            """
        ).fetchall()
    return connection.execute(
        """
        SELECT tipo, chave_recurso, titulo, dados
        FROM biblioteca_conteudo
        WHERE modulo=%s AND ativo=TRUE
        ORDER BY tipo, titulo
        """,
        (module,),
    ).fetchall()


def _require_content_editor(connection, campaign_id: UUID, user: AuthenticatedUser) -> None:
    require_creator_campaign(connection, campaign_id, user)


def _require_global_content_editor(user: AuthenticatedUser) -> None:
    if not user.is_creator:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="permissao de criador necessaria",
        )


def _editorial_library_entry(connection, module: str, entry_type: str, resource_key: str):
    return connection.execute(
        """
        SELECT tipo, chave_recurso, titulo, dados
        FROM biblioteca_conteudo
        WHERE modulo=%s AND tipo=%s AND chave_recurso=%s AND ativo=TRUE
        """,
        (module, entry_type, resource_key),
    ).fetchone()


def _validate_chronicle_content(data: dict) -> None:
    introduction = data.get("introducao")
    global_events = data.get("linha_tempo_geral")
    trees = data.get("arvores")
    if not isinstance(introduction, dict) or not isinstance(global_events, list) or not isinstance(trees, list):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="as cronicas precisam da introducao e das listas linha_tempo_geral e arvores",
        )
    if len(global_events) > 500 or len(trees) > 50:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="a cronologia excede o limite de marcos ou arvores",
        )

    tree_ids = []
    event_ids = set()

    def validate_text(value, *, location: str, limit: int) -> None:
        if not isinstance(value, str) or len(value) > limit:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=f"texto invalido em {location}",
            )

    for field, limit in (("titulo", 160), ("subtitulo", 300), ("descricao", 12000)):
        validate_text(introduction.get(field), location=f"introducao.{field}", limit=limit)

    def validate_event(event, *, location: str) -> None:
        if not isinstance(event, dict):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=f"marco invalido em {location}",
            )
        event_id = str(event.get("id") or "").strip()
        order = event.get("ordem")
        required_text = ("era", "titulo", "resumo")
        if (
            not event_id
            or len(event_id) > 160
            or not all(char.isalnum() or char in "-_" for char in event_id)
            or not isinstance(order, int)
            or isinstance(order, bool)
            or order < 1
            or any(not str(event.get(field) or "").strip() for field in required_text)
        ):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=f"marco incompleto ou invalido em {location}",
            )
        if event_id in event_ids:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=f"id de marco duplicado: {event_id}",
            )
        event_ids.add(event_id)

    for tree in trees:
        if not isinstance(tree, dict):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="entrada de arvore invalida na cronologia",
            )
        tree_id = str(tree.get("id") or "").strip()
        chronology = tree.get("cronologia")
        if not tree_id or tree_id in tree_ids or not isinstance(chronology, list):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=f"arvore invalida ou duplicada na cronologia: {tree_id}",
            )
        tree_ids.append(tree_id)

        for field, limit in (
            ("nome", 160),
            ("deidade", 160),
            ("fluxo", 160),
            ("epiteto", 1000),
            ("estado", 300),
            ("tese", 12000),
            ("atmosfera", 12000),
        ):
            validate_text(tree.get(field), location=f"arvore {tree_id}.{field}", limit=limit)

        themes = tree.get("temas")
        history = tree.get("historia")
        places = tree.get("lugares")
        if (
            not isinstance(themes, list)
            or len(themes) > 100
            or not isinstance(history, list)
            or len(history) > 100
            or not isinstance(places, list)
            or len(places) > 100
        ):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=f"listas narrativas invalidas na arvore {tree_id}",
            )
        for index, theme in enumerate(themes):
            validate_text(theme, location=f"arvore {tree_id}.temas[{index}]", limit=160)
        for index, paragraph in enumerate(history):
            validate_text(paragraph, location=f"arvore {tree_id}.historia[{index}]", limit=12000)
        for index, place in enumerate(places):
            if not isinstance(place, dict):
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                    detail=f"lugar invalido na arvore {tree_id}",
                )
            for field, limit in (("nome", 160), ("tipo", 80), ("resumo", 6000)):
                validate_text(
                    place.get(field),
                    location=f"arvore {tree_id}.lugares[{index}].{field}",
                    limit=limit,
                )
        for event in chronology:
            validate_event(event, location=f"arvore {tree_id}")

    known_trees = set(tree_ids)
    for event in global_events:
        validate_event(event, location="linha geral")
        references = event.get("arvores", [])
        if not isinstance(references, list) or any(
            not isinstance(reference, str) or reference not in known_trees
            for reference in references
        ):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=f"marco {event.get('id')} referencia uma arvore inexistente",
            )


_RULE_HTML_TAGS = frozenset({
    "br", "caption", "dd", "details", "div", "dl", "dt", "em", "h3", "h4",
    "li", "ol", "p", "section", "small", "span", "strong", "summary", "table",
    "tbody", "td", "th", "thead", "tr", "ul",
})
_RULE_HTML_ATTRIBUTES = frozenset({"class", "colspan", "rowspan", "scope", "open"})


class _RuleHtmlValidator(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.error: str | None = None

    def handle_starttag(self, tag, attrs):
        normalized_tag = tag.lower()
        if normalized_tag not in _RULE_HTML_TAGS:
            self.error = self.error or f"tag HTML não permitida: {tag}"
            return
        for name, value in attrs:
            normalized_name = name.lower()
            if normalized_name not in _RULE_HTML_ATTRIBUTES:
                self.error = self.error or f"atributo HTML não permitido: {name}"
                continue
            if normalized_name == "class":
                tokens = str(value or "").split()
                if any(not (token == "sr-only" or re.fullmatch(r"regras-[a-z0-9-]+", token)) for token in tokens):
                    self.error = self.error or "classe CSS não permitida no capítulo"
            elif normalized_name in {"colspan", "rowspan"}:
                if not str(value or "").isdigit() or not 1 <= int(value) <= 20:
                    self.error = self.error or f"valor inválido para {normalized_name}"
            elif normalized_name == "scope" and value not in {"row", "col", "rowgroup", "colgroup"}:
                self.error = self.error or "valor inválido para scope"

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)


def _validate_rule_html(value: object, field: str) -> None:
    if not isinstance(value, str):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"{field} precisa ser texto HTML",
        )
    validator = _RuleHtmlValidator()
    try:
        validator.feed(value)
        validator.close()
    except (ValueError, TypeError) as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"HTML inválido em {field}",
        ) from exc
    if validator.error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"{field}: {validator.error}",
        )


_NARRATIVE_FIELDS_BY_TYPE = {
    "classe": {"titulo", "descricao"},
    "raca": {"titulo", "descricao", "fisiologia"},
    "fluxo": {"essencia", "possibilidades", "limites"},
    "magia": {"descricao", "efeito", "efeitos_por_fluxo", "aviso_mestre"},
    "ritual": {"descricao", "efeito", "falha", "aviso_mestre"},
    "selo": {"descricao", "efeito", "ativacao", "aviso_mestre"},
    "encantamento": {"descricao", "efeito", "aplicacao", "aviso_mestre"},
    "pericia": {"descricao"},
    "legado": {"descricao"},
    "condicao": {"duracao", "efeitos", "remocao"},
    "crise": {"duracao", "efeitos", "remocao"},
}
_NARRATIVE_LIST_FIELDS = {"fisiologia", "possibilidades", "limites", "efeitos"}


def _mechanical_projection(value, editable_fields: set[str]):
    if isinstance(value, dict):
        return {
            key: _mechanical_projection(item, editable_fields)
            for key, item in value.items()
            if key not in editable_fields
        }
    if isinstance(value, list):
        return [_mechanical_projection(item, editable_fields) for item in value]
    return value


def _validate_narrative_fields(value, editable_fields: set[str], *, location: str = "conteudo") -> None:
    if isinstance(value, dict):
        for key, item in value.items():
            current_location = f"{location}.{key}"
            if key in editable_fields:
                if key in _NARRATIVE_LIST_FIELDS:
                    if not isinstance(item, list) or len(item) > 50 or any(
                        not isinstance(part, str) or len(part) > 5_000 for part in item
                    ):
                        raise HTTPException(
                            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                            detail=f"lista narrativa inválida em {current_location}",
                        )
                elif key == "efeitos_por_fluxo":
                    if not isinstance(item, dict) or len(item) > 20 or any(
                        not isinstance(name, str)
                        or not isinstance(text, str)
                        or len(text) > 10_000
                        for name, text in item.items()
                    ):
                        raise HTTPException(
                            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                            detail=f"variantes narrativas inválidas em {current_location}",
                        )
                elif item is not None and (not isinstance(item, str) or len(item) > 10_000):
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                        detail=f"texto narrativo inválido em {current_location}",
                    )
                continue
            _validate_narrative_fields(item, editable_fields, location=current_location)
    elif isinstance(value, list):
        for index, item in enumerate(value):
            _validate_narrative_fields(item, editable_fields, location=f"{location}[{index}]")


def _validate_rules_content(entry_type: str, data: dict, base: dict) -> None:
    base_document = base.get("dados") if isinstance(base.get("dados"), dict) else {}
    base_content = base_document.get("conteudo") if isinstance(base_document.get("conteudo"), dict) else {}
    if entry_type == "regra":
        allowed = {"categoria", "status", "resumo", "destaques", "corpo", "corpoMestre"}
        if set(data) - allowed:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="o capítulo contém campos editoriais desconhecidos",
            )
        for field in ("status", "resumo", "corpo"):
            if not isinstance(data.get(field), str) or not data[field].strip():
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                    detail=f"o capítulo precisa preencher {field}",
                )
        if data.get("categoria") not in {"Livro do Jogador", "Combate e Mecânicas", "Guia do Mestre"}:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="categoria de regra inválida",
            )
        highlights = data.get("destaques")
        if not isinstance(highlights, list) or len(highlights) > 12 or any(
            not isinstance(item, list)
            or len(item) != 2
            or any(not isinstance(part, str) or len(part) > 240 for part in item)
            for item in highlights
        ):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="os destaques do capítulo são inválidos",
            )
        _validate_rule_html(data["corpo"], "corpo")
        if data.get("corpoMestre") is not None:
            _validate_rule_html(data["corpoMestre"], "corpoMestre")
        return

    editable = _NARRATIVE_FIELDS_BY_TYPE.get(entry_type)
    if editable is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="tipo de conteúdo de regras não editável",
        )
    if _mechanical_projection(data, editable) != _mechanical_projection(base_content, editable):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="não é permitido alterar a estrutura ou os campos mecânicos deste conteúdo",
        )
    if entry_type == "magia":
        # Roda mesmo quando a magia oficial não tem efeitos_por_fluxo — senão
        # um rascunho consegue inventar Fluxos do zero numa magia que
        # mecanicamente não tinha nenhum.
        official_variants = base_content.get("efeitos_por_fluxo")
        official_keys = set(official_variants) if isinstance(official_variants, dict) else set()
        variants = data.get("efeitos_por_fluxo")
        variant_keys = set(variants) if isinstance(variants, dict) else set()
        if variant_keys != official_keys:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="não é permitido adicionar ou remover Fluxos da magia",
            )
    _validate_narrative_fields(data, editable)


def _validate_editorial_content(module: str, entry_type: str, data: dict, base: dict) -> None:
    if module == "mundo" and entry_type == "cronologia":
        _validate_chronicle_content(data)
    elif module == "regras":
        _validate_rules_content(entry_type, data, base)


def _validate_custom_world_entry(entry_type: str, resource_key: str, data: dict) -> None:
    """Valida entradas de Mundo que não existem na biblioteca-base."""
    if entry_type == "cronologia":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="a cronologia deve usar a entrada oficial do editor dedicado",
        )
    if not entry_type or not resource_key or not isinstance(data, dict):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="a nova entrada de Mundo está incompleta",
        )


def _is_editorial_document(value: object) -> bool:
    return (
        isinstance(value, dict)
        and isinstance(value.get("tipo"), str)
        and isinstance(value.get("id"), str)
        and isinstance(value.get("titulo"), str)
        and isinstance(value.get("conteudo"), dict)
    )


def _is_removed_document(value: object) -> bool:
    """Identifica uma publicação editorial que remove a entrada resolvida."""
    return _is_editorial_document(value) and value.get("excluido") is True


@router.get("/biblioteca")
def list_library(
    campanha_id: UUID,
    modulo: str = Query(pattern=r"^(loja|mundo|regras)$"),
    user: AuthenticatedUser = Depends(get_current_user),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        require_creator_campaign(connection, campanha_id, user)
        entries = _library_rows(connection, modulo)
        published = connection.execute(
            """
            SELECT id, chave_recurso, acesso_padrao
            FROM informacoes_campanha
            WHERE campanha_id=%s AND tipo=%s
            """,
            (campanha_id, modulo),
        ).fetchall()
    by_key = {row["chave_recurso"]: dict(row) for row in published}
    result = []
    for row in entries:
        item = dict(row)
        composite_key = f"{item['tipo']}:{item['chave_recurso']}"
        publication = by_key.get(composite_key)
        item["chave"] = composite_key
        item["publicacao"] = publication
        result.append(item)
    return {"modulo": modulo, "entradas": result}


@router.post("/publicar")
def publish_content(
    payload: ContentPublishInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    published = []
    with database.connection() as connection:
        require_creator_campaign(connection, payload.campanha_id, user)
        library = _library_rows(connection, payload.modulo)
        by_key = {
            f"{row['tipo']}:{row['chave_recurso']}": dict(row)
            for row in library
        }
        missing = [key for key in payload.chaves if key not in by_key]
        if missing:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=f"conteudo inexistente: {missing[0]}",
            )
        for key in payload.chaves:
            item = by_key[key]
            knowledge_id = uuid4()
            row = connection.execute(
                """
                INSERT INTO informacoes_campanha
                    (id, campanha_id, tipo, chave_recurso, titulo,
                     resumo_rumor, dados_parciais, dados_completos,
                     acesso_padrao, criado_por, atualizado_em, publicado_em)
                VALUES (%s, %s, %s, %s, %s, '', %s, %s, %s, %s,
                        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                ON CONFLICT (campanha_id, tipo, chave_recurso) DO UPDATE SET
                    titulo=EXCLUDED.titulo,
                    dados_parciais=EXCLUDED.dados_parciais,
                    dados_completos=EXCLUDED.dados_completos,
                    acesso_padrao=EXCLUDED.acesso_padrao,
                    publicado_em=CURRENT_TIMESTAMP,
                    atualizado_em=CURRENT_TIMESTAMP
                RETURNING id, chave_recurso, titulo, acesso_padrao
                """,
                (
                    knowledge_id,
                    payload.campanha_id,
                    payload.modulo,
                    key,
                    item["titulo"],
                    Jsonb(item["dados"]),
                    Jsonb(item["dados"]),
                    payload.acesso_padrao,
                    user.id,
                ),
            ).fetchone()
            published.append(dict(row))
        if payload.acesso_padrao != "oculto":
            rotulo = _MODULE_LABELS.get(payload.modulo, payload.modulo)
            amostra = ", ".join(item["titulo"] for item in published[:3])
            resto = len(published) - 3
            notify(
                connection,
                user_ids=campaign_member_ids(connection, payload.campanha_id),
                category="conteudo",
                title=f"{len(published)} novidade(s) liberadas em {rotulo}",
                message=amostra + (f" e mais {resto}." if resto > 0 else "."),
                campaign_id=payload.campanha_id,
                actor_user_id=user.id,
                details={"modulo": payload.modulo, "total": len(published)},
            )
        record_audit(
            connection,
            action="conteudo.publicado",
            actor_user_id=user.id,
            campaign_id=payload.campanha_id,
            target_type=payload.modulo,
            details={"chaves": payload.chaves, "acesso": payload.acesso_padrao},
        )
    return {"publicados": published}


@router.get("/editor")
def list_editorial_content(
    campanha_id: UUID,
    modulo: str = Query(default="mundo", pattern=r"^(mundo|regras)$"),
    user: AuthenticatedUser = Depends(get_current_user),
    database: Database = Depends(get_database),
):
    """Biblioteca oficial com o rascunho e a publicação desta campanha.

    O primeiro incremento editorial cobre Mundo. O contrato já mantém o
    módulo explícito para que Regras e Ficha possam entrar sem uma segunda UI.
    """
    with database.connection() as connection:
        _require_content_editor(connection, campanha_id, user)
        library = _library_rows(connection, modulo)
        editorial_rows = connection.execute(
            """
            SELECT id, chave_recurso, titulo, rascunho, dados_completos,
                   versao_editorial, publicado_em, atualizado_em
            FROM informacoes_campanha
            WHERE campanha_id=%s AND tipo=%s
            """,
            (campanha_id, modulo),
        ).fetchall()

    editorial_by_key = {row["chave_recurso"]: dict(row) for row in editorial_rows}
    entries = []
    official_keys = set()
    for raw_item in library:
        item = dict(raw_item)
        composite_key = f"{item['tipo']}:{item['chave_recurso']}"
        official_keys.add(composite_key)
        editorial = editorial_by_key.get(composite_key)
        effective = None
        if editorial:
            if _is_editorial_document(editorial.get("rascunho")):
                effective = editorial["rascunho"]
            elif editorial.get("publicado_em") and _is_editorial_document(editorial.get("dados_completos")):
                effective = editorial["dados_completos"]
        entries.append(
            {
                "chave": composite_key,
                "tipo": effective["tipo"] if effective else item["tipo"],
                "chave_recurso": effective["id"] if effective else item["chave_recurso"],
                "titulo": effective["titulo"] if effective else item["titulo"],
                "dados_base": item["dados"],
                "editorial": editorial,
                "excluido": bool(
                    editorial
                    and editorial.get("publicado_em")
                    and _is_removed_document(editorial.get("dados_completos"))
                ),
            }
        )
    if modulo == "mundo":
        for composite_key, editorial in editorial_by_key.items():
            if composite_key in official_keys:
                continue
            document = editorial.get("rascunho") or editorial.get("dados_completos")
            if not _is_editorial_document(document):
                continue
            entries.append(
                {
                    "chave": composite_key,
                    "tipo": document["tipo"],
                    "chave_recurso": document["id"],
                    "titulo": document["titulo"],
                    "dados_base": {
                        "tipo": document["tipo"],
                        "id": document["id"],
                        "titulo": document["titulo"],
                        "conteudo": {},
                        **({"revelado": document["revelado"]} if isinstance(document.get("revelado"), bool) else {}),
                    },
                    "editorial": editorial,
                    "origem": "campanha",
                    "excluido": bool(
                        editorial.get("publicado_em")
                        and _is_removed_document(editorial.get("dados_completos"))
                    ),
                }
            )
        entries.sort(key=lambda item: (item["tipo"], item["titulo"].casefold(), item["chave"]))
    return {"modulo": modulo, "entradas": entries}


@router.put("/editor/rascunho")
def save_editorial_draft(
    payload: ContentEditorialDraftInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    composite_key = f"{payload.tipo}:{payload.chave_recurso}"
    source_composite_key = payload.chave_origem or composite_key
    source_type, separator, source_resource_key = source_composite_key.partition(":")
    if (
        not separator
        or not source_type
        or not source_resource_key
        or source_resource_key != payload.chave_recurso
    ):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="a identidade original da entrada é inválida",
        )
    moving_category = source_composite_key != composite_key
    if moving_category and payload.modulo != "mundo":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="somente conteúdo de Mundo pode mudar de categoria",
        )
    if moving_category and (source_type == "cronologia" or payload.tipo == "cronologia"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="a cronologia não pode ser movida para outra categoria",
        )
    document = {
        "tipo": payload.tipo,
        "id": payload.chave_recurso,
        "titulo": payload.titulo,
        "conteudo": payload.conteudo,
    }
    with database.connection() as connection:
        _require_content_editor(connection, payload.campanha_id, user)
        base = _editorial_library_entry(
            connection, payload.modulo, source_type, source_resource_key
        )
        if moving_category and _editorial_library_entry(
            connection, payload.modulo, payload.tipo, payload.chave_recurso
        ):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="já existe conteúdo com este ID na categoria de destino",
            )
        if not base and payload.modulo != "mundo":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="entrada oficial de conteudo nao encontrada",
            )
        if base and not moving_category:
            _validate_editorial_content(payload.modulo, payload.tipo, payload.conteudo, dict(base))
        else:
            _validate_custom_world_entry(payload.tipo, payload.chave_recurso, payload.conteudo)
        base_document = base.get("dados") if base and isinstance(base.get("dados"), dict) else {}
        revealed = payload.revelado if payload.revelado is not None else base_document.get("revelado")
        if isinstance(revealed, bool) and payload.modulo == "mundo":
            document["revelado"] = revealed

        current = connection.execute(
            """
            SELECT id, versao_editorial
            FROM informacoes_campanha
            WHERE campanha_id=%s AND tipo=%s AND chave_recurso=%s
            FOR UPDATE
            """,
            (payload.campanha_id, payload.modulo, source_composite_key),
        ).fetchone()
        if moving_category and not base and not current:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="a entrada original não foi encontrada para mover",
            )
        if current:
            if payload.versao_esperada != current["versao_editorial"]:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail={
                        "mensagem": "o conteudo foi alterado em outro lugar; recarregue antes de salvar",
                        "versao_atual": current["versao_editorial"],
                    },
                )
            row = connection.execute(
                """
                UPDATE informacoes_campanha
                SET titulo=%s, rascunho=%s,
                    rascunho_atualizado_por=%s,
                    versao_editorial=versao_editorial+1,
                    atualizado_em=CURRENT_TIMESTAMP
                WHERE id=%s AND versao_editorial=%s
                RETURNING id, titulo, rascunho, versao_editorial,
                          publicado_em, atualizado_em
                """,
                (
                    payload.titulo,
                    Jsonb(document),
                    user.id,
                    current["id"],
                    payload.versao_esperada,
                ),
            ).fetchone()
        else:
            if payload.versao_esperada is not None:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail={"mensagem": "o conteudo ainda nao possui versao editorial"},
                )
            knowledge_id = uuid4()
            row = connection.execute(
                """
                INSERT INTO informacoes_campanha
                    (id, campanha_id, tipo, chave_recurso, titulo,
                     dados_parciais, dados_completos, acesso_padrao, criado_por,
                     rascunho, rascunho_atualizado_por, versao_editorial)
                VALUES (%s, %s, %s, %s, %s, '{}'::jsonb, '{}'::jsonb,
                        'oculto', %s, %s, %s, 1)
                RETURNING id, titulo, rascunho, versao_editorial,
                          publicado_em, atualizado_em
                """,
                (
                    knowledge_id,
                    payload.campanha_id,
                    payload.modulo,
                    source_composite_key,
                    payload.titulo,
                    user.id,
                    Jsonb(document),
                    user.id,
                ),
            ).fetchone()

        record_audit(
            connection,
            action="conteudo.rascunho_salvo",
            actor_user_id=user.id,
            campaign_id=payload.campanha_id,
            target_type=payload.modulo,
            target_id=str(row["id"]),
            details={
                "chave_origem": source_composite_key,
                "chave_destino": composite_key,
                "versao": row["versao_editorial"],
            },
        )
    return {"editorial": dict(row)}


@router.post("/editor/{knowledge_id}/publicar")
def publish_editorial_content(
    knowledge_id: UUID,
    payload: ContentEditorialPublishInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        _require_content_editor(connection, payload.campanha_id, user)
        current = connection.execute(
            """
            SELECT id, campanha_id, tipo, chave_recurso, titulo, rascunho,
                   versao_editorial
            FROM informacoes_campanha
            WHERE id=%s AND campanha_id=%s
            FOR UPDATE
            """,
            (knowledge_id, payload.campanha_id),
        ).fetchone()
        if not current:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="conteudo nao encontrado")
        if current["versao_editorial"] != payload.versao_esperada:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "mensagem": "o rascunho mudou; recarregue antes de publicar",
                    "versao_atual": current["versao_editorial"],
                },
            )
        draft = current["rascunho"]
        if not isinstance(draft, dict):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="nao existe rascunho para publicar",
            )
        draft_type = str(draft.get("tipo") or "")
        draft_key = str(draft.get("id") or "")
        draft_content = draft.get("conteudo")
        base = _editorial_library_entry(connection, current["tipo"], draft_type, draft_key)
        if not isinstance(draft_content, dict):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="a fonte oficial deste rascunho não está mais disponível",
            )
        if base:
            _validate_editorial_content(current["tipo"], draft_type, draft_content, dict(base))
        elif current["tipo"] == "mundo":
            _validate_custom_world_entry(draft_type, draft_key, draft_content)
        else:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="a fonte oficial deste rascunho não está mais disponível",
            )
        new_version = int(current["versao_editorial"]) + 1
        title = str(draft.get("titulo") or current["titulo"]).strip()
        row = connection.execute(
            """
            UPDATE informacoes_campanha
            SET titulo=%s, dados_parciais=%s, dados_completos=%s,
                rascunho=NULL, rascunho_atualizado_por=NULL,
                publicado_em=CURRENT_TIMESTAMP,
                versao_editorial=%s, atualizado_em=CURRENT_TIMESTAMP
            WHERE id=%s AND versao_editorial=%s
            RETURNING id, titulo, dados_completos, versao_editorial,
                      publicado_em, atualizado_em
            """,
            (
                title,
                Jsonb(draft),
                Jsonb(draft),
                new_version,
                knowledge_id,
                payload.versao_esperada,
            ),
        ).fetchone()
        connection.execute(
            """
            INSERT INTO revisoes_conteudo
                (id, informacao_id, campanha_id, versao, titulo, dados, criado_por)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            """,
            (
                uuid4(),
                knowledge_id,
                payload.campanha_id,
                new_version,
                title,
                Jsonb(draft),
                user.id,
            ),
        )
        record_audit(
            connection,
            action="conteudo.edicao_publicada",
            actor_user_id=user.id,
            campaign_id=payload.campanha_id,
            target_type=current["tipo"],
            target_id=str(knowledge_id),
            details={"chave": current["chave_recurso"], "versao": new_version},
        )
    return {"editorial": dict(row)}


@router.delete("/editor/{knowledge_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_custom_editorial_content(
    knowledge_id: UUID,
    payload: ContentEditorialDeleteInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    """Compatibilidade com publicações antigas de Mundo por campanha.

    O editor atual usa ``/editor-global``; esta rota permanece somente para que
    dados anteriores à migração 33 possam ser auditados durante a transição.
    """
    with database.connection() as connection:
        _require_content_editor(connection, payload.campanha_id, user)
        current = connection.execute(
            """
            SELECT id, campanha_id, tipo, chave_recurso, titulo, rascunho,
                   dados_completos, versao_editorial, publicado_em
            FROM informacoes_campanha
            WHERE id=%s AND campanha_id=%s
            FOR UPDATE
            """,
            (knowledge_id, payload.campanha_id),
        ).fetchone()
        if not current:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="conteudo nao encontrado")
        if current["versao_editorial"] != payload.versao_esperada:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "mensagem": "o conteúdo mudou; recarregue antes de excluir",
                    "versao_atual": current["versao_editorial"],
                },
            )
        composite_key = str(current["chave_recurso"] or "")
        entry_type, separator, resource_key = composite_key.partition(":")
        if current["tipo"] != "mundo" or not separator or not entry_type or not resource_key:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="somente entradas de Mundo podem ser excluídas por este editor",
            )
        base = _editorial_library_entry(connection, "mundo", entry_type, resource_key)
        if not base and current.get("publicado_em") is None:
            deleted = connection.execute(
                """
                DELETE FROM informacoes_campanha
                WHERE id=%s AND campanha_id=%s AND versao_editorial=%s
                RETURNING id
                """,
                (knowledge_id, payload.campanha_id, payload.versao_esperada),
            ).fetchone()
            if not deleted:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="o conteúdo mudou; recarregue antes de excluir",
                )
            action = "conteudo.entrada_excluida"
            new_version = current["versao_editorial"]
        else:
            document = current.get("rascunho")
            if not _is_editorial_document(document):
                document = current.get("dados_completos")
            if not _is_editorial_document(document) and base:
                document = base.get("dados")
            if not _is_editorial_document(document):
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                    detail="não foi possível preservar os dados antes da exclusão",
                )
            removed_document = {**document, "excluido": True}
            new_version = int(current["versao_editorial"]) + 1
            updated = connection.execute(
                """
                UPDATE informacoes_campanha
                SET titulo=%s, dados_parciais=%s, dados_completos=%s,
                    acesso_padrao='oculto', rascunho=NULL,
                    rascunho_atualizado_por=NULL, publicado_em=CURRENT_TIMESTAMP,
                    versao_editorial=%s, atualizado_em=CURRENT_TIMESTAMP
                WHERE id=%s AND campanha_id=%s AND versao_editorial=%s
                RETURNING id
                """,
                (
                    removed_document["titulo"],
                    Jsonb(removed_document),
                    Jsonb(removed_document),
                    new_version,
                    knowledge_id,
                    payload.campanha_id,
                    payload.versao_esperada,
                ),
            ).fetchone()
            if not updated:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="o conteúdo mudou; recarregue antes de excluir",
                )
            connection.execute(
                """
                INSERT INTO revisoes_conteudo
                    (id, informacao_id, campanha_id, versao, titulo, dados, criado_por)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    uuid4(), knowledge_id, payload.campanha_id, new_version,
                    removed_document["titulo"], Jsonb(removed_document), user.id,
                ),
            )
            action = "conteudo.entrada_removida_da_campanha"
        record_audit(
            connection,
            action=action,
            actor_user_id=user.id,
            campaign_id=payload.campanha_id,
            target_type="mundo",
            target_id=str(knowledge_id),
            details={
                "chave": composite_key,
                "titulo": current["titulo"],
                "versao": new_version,
                "base_oficial_preservada": bool(base),
            },
        )
    return None


@router.get("/editor/{knowledge_id}/revisoes")
def list_editorial_revisions(
    knowledge_id: UUID,
    campanha_id: UUID,
    user: AuthenticatedUser = Depends(get_current_user),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        _require_content_editor(connection, campanha_id, user)
        belongs = connection.execute(
            "SELECT 1 FROM informacoes_campanha WHERE id=%s AND campanha_id=%s",
            (knowledge_id, campanha_id),
        ).fetchone()
        if not belongs:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="conteudo nao encontrado")
        rows = connection.execute(
            """
            SELECT r.id, r.versao, r.titulo, r.dados, r.criado_em,
                   u.nome_exibicao AS autor_nome
            FROM revisoes_conteudo r
            LEFT JOIN usuarios u ON u.id=r.criado_por
            WHERE r.informacao_id=%s AND r.campanha_id=%s
            ORDER BY r.versao DESC
            LIMIT 50
            """,
            (knowledge_id, campanha_id),
        ).fetchall()
    return {"revisoes": [dict(row) for row in rows]}


@router.post("/editor/{knowledge_id}/revisoes/{revision_id}/restaurar")
def restore_editorial_revision(
    knowledge_id: UUID,
    revision_id: UUID,
    payload: ContentEditorialPublishInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    """Copia uma publicação anterior para um novo rascunho revisável."""
    with database.connection() as connection:
        _require_content_editor(connection, payload.campanha_id, user)
        current = connection.execute(
            """
            SELECT id, tipo, versao_editorial
            FROM informacoes_campanha
            WHERE id=%s AND campanha_id=%s
            FOR UPDATE
            """,
            (knowledge_id, payload.campanha_id),
        ).fetchone()
        if not current:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="conteudo nao encontrado")
        if current["versao_editorial"] != payload.versao_esperada:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "mensagem": "o conteúdo mudou; recarregue antes de restaurar",
                    "versao_atual": current["versao_editorial"],
                },
            )
        revision = connection.execute(
            """
            SELECT id, titulo, dados
            FROM revisoes_conteudo
            WHERE id=%s AND informacao_id=%s AND campanha_id=%s
            """,
            (revision_id, knowledge_id, payload.campanha_id),
        ).fetchone()
        if not revision or not _is_editorial_document(revision["dados"]):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="revisão não encontrada")
        document = revision["dados"]
        base = _editorial_library_entry(
            connection, current["tipo"], document["tipo"], document["id"]
        )
        if base:
            _validate_editorial_content(
                current["tipo"], document["tipo"], document["conteudo"], dict(base)
            )
        elif current["tipo"] == "mundo":
            _validate_custom_world_entry(document["tipo"], document["id"], document["conteudo"])
        else:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="a fonte oficial desta revisão não está mais disponível",
            )
        row = connection.execute(
            """
            UPDATE informacoes_campanha
            SET titulo=%s, rascunho=%s, rascunho_atualizado_por=%s,
                versao_editorial=versao_editorial+1,
                atualizado_em=CURRENT_TIMESTAMP
            WHERE id=%s AND versao_editorial=%s
            RETURNING id, titulo, rascunho, versao_editorial,
                      publicado_em, atualizado_em
            """,
            (
                document["titulo"], Jsonb(document), user.id,
                knowledge_id, payload.versao_esperada,
            ),
        ).fetchone()
        record_audit(
            connection,
            action="conteudo.revisao_restaurada",
            actor_user_id=user.id,
            campaign_id=payload.campanha_id,
            target_type=current["tipo"],
            target_id=str(knowledge_id),
            details={"revisao_id": str(revision_id), "versao": row["versao_editorial"]},
        )
    return {"editorial": dict(row)}


def _global_editorial_rows(connection):
    return connection.execute(
        """
        SELECT id, chave_origem AS chave_recurso, titulo, rascunho,
               dados_publicados AS dados_completos, versao_editorial,
               publicado_em, atualizado_em
        FROM conteudo_global_editorial
        WHERE modulo='mundo'
        ORDER BY chave_origem
        """
    ).fetchall()


def _global_editor_entries(connection) -> list[dict]:
    library = _library_rows(connection, "mundo")
    editorial_rows = _global_editorial_rows(connection)
    editorial_by_key = {row["chave_recurso"]: dict(row) for row in editorial_rows}
    entries: list[dict] = []
    official_keys: set[str] = set()
    for raw_item in library:
        item = dict(raw_item)
        composite_key = f"{item['tipo']}:{item['chave_recurso']}"
        official_keys.add(composite_key)
        editorial = editorial_by_key.get(composite_key)
        effective = None
        if editorial:
            if _is_editorial_document(editorial.get("rascunho")):
                effective = editorial["rascunho"]
            elif editorial.get("publicado_em") and _is_editorial_document(editorial.get("dados_completos")):
                effective = editorial["dados_completos"]
        entries.append(
            {
                "chave": composite_key,
                "tipo": effective["tipo"] if effective else item["tipo"],
                "chave_recurso": effective["id"] if effective else item["chave_recurso"],
                "titulo": effective["titulo"] if effective else item["titulo"],
                "dados_base": item["dados"],
                "editorial": editorial,
                "excluido": bool(
                    editorial
                    and editorial.get("publicado_em")
                    and _is_removed_document(editorial.get("dados_completos"))
                ),
            }
        )
    for composite_key, editorial in editorial_by_key.items():
        if composite_key in official_keys:
            continue
        document = editorial.get("rascunho") or editorial.get("dados_completos")
        if not _is_editorial_document(document):
            continue
        entries.append(
            {
                "chave": composite_key,
                "tipo": document["tipo"],
                "chave_recurso": document["id"],
                "titulo": document["titulo"],
                "dados_base": {
                    "tipo": document["tipo"],
                    "id": document["id"],
                    "titulo": document["titulo"],
                    "conteudo": {},
                    **(
                        {"revelado": document["revelado"]}
                        if isinstance(document.get("revelado"), bool)
                        else {}
                    ),
                },
                "editorial": editorial,
                "origem": "global",
                "excluido": bool(
                    editorial.get("publicado_em")
                    and _is_removed_document(editorial.get("dados_completos"))
                ),
            }
        )
    entries.sort(key=lambda item: (item["tipo"], item["titulo"].casefold(), item["chave"]))
    return entries


@router.get("/editor-global")
def list_global_editorial_content(
    user: AuthenticatedUser = Depends(get_current_user),
    database: Database = Depends(get_database),
):
    """Biblioteca de Mundo compartilhada por todas as campanhas."""
    _require_global_content_editor(user)
    with database.connection() as connection:
        entries = _global_editor_entries(connection)
    return {"modulo": "mundo", "escopo": "global", "entradas": entries}


@router.put("/editor-global/rascunho")
def save_global_editorial_draft(
    payload: GlobalContentEditorialDraftInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    _require_global_content_editor(user)
    composite_key = f"{payload.tipo}:{payload.chave_recurso}"
    source_composite_key = payload.chave_origem or composite_key
    source_type, separator, source_resource_key = source_composite_key.partition(":")
    if (
        not separator
        or not source_type
        or not source_resource_key
        or source_resource_key != payload.chave_recurso
    ):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="a identidade original da entrada é inválida",
        )
    moving_category = source_composite_key != composite_key
    if moving_category and (source_type == "cronologia" or payload.tipo == "cronologia"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="a cronologia não pode ser movida para outra categoria",
        )
    document = {
        "tipo": payload.tipo,
        "id": payload.chave_recurso,
        "titulo": payload.titulo,
        "conteudo": payload.conteudo,
    }
    with database.connection() as connection:
        base = _editorial_library_entry(
            connection, "mundo", source_type, source_resource_key
        )
        if moving_category and _editorial_library_entry(
            connection, "mundo", payload.tipo, payload.chave_recurso
        ):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="já existe conteúdo com este ID na categoria de destino",
            )
        collision = connection.execute(
            """
            SELECT 1
            FROM conteudo_global_editorial
            WHERE modulo='mundo' AND chave_origem<>%s
              AND COALESCE(rascunho, dados_publicados)->>'tipo'=%s
              AND COALESCE(rascunho, dados_publicados)->>'id'=%s
            """,
            (source_composite_key, payload.tipo, payload.chave_recurso),
        ).fetchone()
        if collision:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="já existe conteúdo com este ID na categoria de destino",
            )
        if base and not moving_category:
            _validate_editorial_content("mundo", payload.tipo, payload.conteudo, dict(base))
        else:
            _validate_custom_world_entry(payload.tipo, payload.chave_recurso, payload.conteudo)
        base_document = base.get("dados") if base and isinstance(base.get("dados"), dict) else {}
        revealed = payload.revelado if payload.revelado is not None else base_document.get("revelado")
        if isinstance(revealed, bool):
            document["revelado"] = revealed

        current = connection.execute(
            """
            SELECT id, versao_editorial
            FROM conteudo_global_editorial
            WHERE modulo='mundo' AND chave_origem=%s
            FOR UPDATE
            """,
            (source_composite_key,),
        ).fetchone()
        if moving_category and not base and not current:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="a entrada original não foi encontrada para mover",
            )
        if current:
            if payload.versao_esperada != current["versao_editorial"]:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail={
                        "mensagem": "o conteúdo global foi alterado em outro lugar; recarregue antes de salvar",
                        "versao_atual": current["versao_editorial"],
                    },
                )
            row = connection.execute(
                """
                UPDATE conteudo_global_editorial
                SET titulo=%s, rascunho=%s, atualizado_por=%s,
                    versao_editorial=versao_editorial+1,
                    atualizado_em=CURRENT_TIMESTAMP
                WHERE id=%s AND versao_editorial=%s
                RETURNING id, titulo, rascunho,
                          dados_publicados AS dados_completos,
                          versao_editorial, publicado_em, atualizado_em
                """,
                (
                    payload.titulo,
                    Jsonb(document),
                    user.id,
                    current["id"],
                    payload.versao_esperada,
                ),
            ).fetchone()
        else:
            if payload.versao_esperada is not None:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail={"mensagem": "o conteúdo global ainda não possui versão editorial"},
                )
            row = connection.execute(
                """
                INSERT INTO conteudo_global_editorial
                    (id, modulo, chave_origem, titulo, rascunho,
                     versao_editorial, criado_por, atualizado_por)
                VALUES (%s, 'mundo', %s, %s, %s, 1, %s, %s)
                RETURNING id, titulo, rascunho,
                          dados_publicados AS dados_completos,
                          versao_editorial, publicado_em, atualizado_em
                """,
                (
                    uuid4(), source_composite_key, payload.titulo,
                    Jsonb(document), user.id, user.id,
                ),
            ).fetchone()
        record_audit(
            connection,
            action="conteudo_global.rascunho_salvo",
            actor_user_id=user.id,
            target_type="mundo",
            target_id=str(row["id"]),
            details={
                "chave_origem": source_composite_key,
                "chave_destino": composite_key,
                "versao": row["versao_editorial"],
            },
        )
    return {"editorial": dict(row)}


@router.post("/editor-global/{content_id}/publicar")
def publish_global_editorial_content(
    content_id: UUID,
    payload: GlobalContentEditorialVersionInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    _require_global_content_editor(user)
    with database.connection() as connection:
        current = connection.execute(
            """
            SELECT id, chave_origem, titulo, rascunho, versao_editorial
            FROM conteudo_global_editorial
            WHERE id=%s AND modulo='mundo'
            FOR UPDATE
            """,
            (content_id,),
        ).fetchone()
        if not current:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="conteúdo global não encontrado")
        if current["versao_editorial"] != payload.versao_esperada:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "mensagem": "o rascunho global mudou; recarregue antes de publicar",
                    "versao_atual": current["versao_editorial"],
                },
            )
        draft = current["rascunho"]
        if not _is_editorial_document(draft):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="não existe rascunho global para publicar",
            )
        source_type, _, source_key = current["chave_origem"].partition(":")
        base = _editorial_library_entry(connection, "mundo", source_type, source_key)
        if base:
            _validate_editorial_content("mundo", draft["tipo"], draft["conteudo"], dict(base))
        else:
            _validate_custom_world_entry(draft["tipo"], draft["id"], draft["conteudo"])
        new_version = int(current["versao_editorial"]) + 1
        title = str(draft.get("titulo") or current["titulo"]).strip()
        row = connection.execute(
            """
            UPDATE conteudo_global_editorial
            SET titulo=%s, dados_publicados=%s, rascunho=NULL,
                atualizado_por=%s, publicado_em=CURRENT_TIMESTAMP,
                versao_editorial=%s, atualizado_em=CURRENT_TIMESTAMP
            WHERE id=%s AND versao_editorial=%s
            RETURNING id, titulo, rascunho,
                      dados_publicados AS dados_completos,
                      versao_editorial, publicado_em, atualizado_em
            """,
            (
                title, Jsonb(draft), user.id, new_version,
                content_id, payload.versao_esperada,
            ),
        ).fetchone()
        connection.execute(
            """
            INSERT INTO revisoes_conteudo_global
                (id, conteudo_id, versao, titulo, dados, criado_por)
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (uuid4(), content_id, new_version, title, Jsonb(draft), user.id),
        )
        record_audit(
            connection,
            action="conteudo_global.publicado",
            actor_user_id=user.id,
            target_type="mundo",
            target_id=str(content_id),
            details={"chave": current["chave_origem"], "versao": new_version},
        )
    return {"editorial": dict(row)}


@router.delete("/editor-global/{content_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_global_editorial_content(
    content_id: UUID,
    payload: GlobalContentEditorialVersionInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    _require_global_content_editor(user)
    with database.connection() as connection:
        current = connection.execute(
            """
            SELECT id, chave_origem, titulo, rascunho, dados_publicados,
                   versao_editorial, publicado_em
            FROM conteudo_global_editorial
            WHERE id=%s AND modulo='mundo'
            FOR UPDATE
            """,
            (content_id,),
        ).fetchone()
        if not current:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="conteúdo global não encontrado")
        if current["versao_editorial"] != payload.versao_esperada:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "mensagem": "o conteúdo global mudou; recarregue antes de excluir",
                    "versao_atual": current["versao_editorial"],
                },
            )
        entry_type, separator, resource_key = current["chave_origem"].partition(":")
        if not separator or not entry_type or not resource_key:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="a identidade global da entrada é inválida",
            )
        base = _editorial_library_entry(connection, "mundo", entry_type, resource_key)
        if not base and current.get("publicado_em") is None:
            deleted = connection.execute(
                """
                DELETE FROM conteudo_global_editorial
                WHERE id=%s AND versao_editorial=%s
                RETURNING id
                """,
                (content_id, payload.versao_esperada),
            ).fetchone()
            if not deleted:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="o conteúdo global mudou; recarregue antes de excluir",
                )
            action = "conteudo_global.rascunho_excluido"
            new_version = current["versao_editorial"]
        else:
            document = current.get("rascunho")
            if not _is_editorial_document(document):
                document = current.get("dados_publicados")
            if not _is_editorial_document(document) and base:
                document = base.get("dados")
            if not _is_editorial_document(document):
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                    detail="não foi possível preservar os dados antes da exclusão global",
                )
            removed_document = {**document, "excluido": True}
            new_version = int(current["versao_editorial"]) + 1
            updated = connection.execute(
                """
                UPDATE conteudo_global_editorial
                SET titulo=%s, dados_publicados=%s, rascunho=NULL,
                    atualizado_por=%s, publicado_em=CURRENT_TIMESTAMP,
                    versao_editorial=%s, atualizado_em=CURRENT_TIMESTAMP
                WHERE id=%s AND versao_editorial=%s
                RETURNING id
                """,
                (
                    removed_document["titulo"], Jsonb(removed_document), user.id,
                    new_version, content_id, payload.versao_esperada,
                ),
            ).fetchone()
            if not updated:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="o conteúdo global mudou; recarregue antes de excluir",
                )
            connection.execute(
                """
                INSERT INTO revisoes_conteudo_global
                    (id, conteudo_id, versao, titulo, dados, criado_por)
                VALUES (%s, %s, %s, %s, %s, %s)
                """,
                (
                    uuid4(), content_id, new_version,
                    removed_document["titulo"], Jsonb(removed_document), user.id,
                ),
            )
            action = "conteudo_global.excluido"
        record_audit(
            connection,
            action=action,
            actor_user_id=user.id,
            target_type="mundo",
            target_id=str(content_id),
            details={
                "chave": current["chave_origem"],
                "titulo": current["titulo"],
                "versao": new_version,
                "base_oficial_preservada": bool(base),
            },
        )
    return None


@router.get("/editor-global/{content_id}/revisoes")
def list_global_editorial_revisions(
    content_id: UUID,
    user: AuthenticatedUser = Depends(get_current_user),
    database: Database = Depends(get_database),
):
    _require_global_content_editor(user)
    with database.connection() as connection:
        belongs = connection.execute(
            "SELECT 1 FROM conteudo_global_editorial WHERE id=%s AND modulo='mundo'",
            (content_id,),
        ).fetchone()
        if not belongs:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="conteúdo global não encontrado")
        rows = connection.execute(
            """
            SELECT r.id, r.versao, r.titulo, r.dados, r.criado_em,
                   u.nome_exibicao AS autor_nome
            FROM revisoes_conteudo_global r
            LEFT JOIN usuarios u ON u.id=r.criado_por
            WHERE r.conteudo_id=%s
            ORDER BY r.versao DESC
            LIMIT 50
            """,
            (content_id,),
        ).fetchall()
    return {"revisoes": [dict(row) for row in rows]}


@router.post("/editor-global/{content_id}/revisoes/{revision_id}/restaurar")
def restore_global_editorial_revision(
    content_id: UUID,
    revision_id: UUID,
    payload: GlobalContentEditorialVersionInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    _require_global_content_editor(user)
    with database.connection() as connection:
        current = connection.execute(
            """
            SELECT id, chave_origem, versao_editorial
            FROM conteudo_global_editorial
            WHERE id=%s AND modulo='mundo'
            FOR UPDATE
            """,
            (content_id,),
        ).fetchone()
        if not current:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="conteúdo global não encontrado")
        if current["versao_editorial"] != payload.versao_esperada:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "mensagem": "o conteúdo global mudou; recarregue antes de restaurar",
                    "versao_atual": current["versao_editorial"],
                },
            )
        revision = connection.execute(
            """
            SELECT id, titulo, dados
            FROM revisoes_conteudo_global
            WHERE id=%s AND conteudo_id=%s
            """,
            (revision_id, content_id),
        ).fetchone()
        if not revision or not _is_editorial_document(revision["dados"]):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="revisão global não encontrada")
        document = {key: value for key, value in revision["dados"].items() if key != "excluido"}
        source_type, _, source_key = current["chave_origem"].partition(":")
        base = _editorial_library_entry(connection, "mundo", source_type, source_key)
        if base:
            _validate_editorial_content("mundo", document["tipo"], document["conteudo"], dict(base))
        else:
            _validate_custom_world_entry(document["tipo"], document["id"], document["conteudo"])
        row = connection.execute(
            """
            UPDATE conteudo_global_editorial
            SET titulo=%s, rascunho=%s, atualizado_por=%s,
                versao_editorial=versao_editorial+1,
                atualizado_em=CURRENT_TIMESTAMP
            WHERE id=%s AND versao_editorial=%s
            RETURNING id, titulo, rascunho,
                      dados_publicados AS dados_completos,
                      versao_editorial, publicado_em, atualizado_em
            """,
            (
                document["titulo"], Jsonb(document), user.id,
                content_id, payload.versao_esperada,
            ),
        ).fetchone()
        record_audit(
            connection,
            action="conteudo_global.revisao_restaurada",
            actor_user_id=user.id,
            target_type="mundo",
            target_id=str(content_id),
            details={"revisao_id": str(revision_id), "versao": row["versao_editorial"]},
        )
    return {"editorial": dict(row)}


@router.get("/editor-global/exportar")
def export_global_editorial_content(
    user: AuthenticatedUser = Depends(get_current_user),
    database: Database = Depends(get_database),
):
    _require_global_content_editor(user)
    with database.connection() as connection:
        rows = connection.execute(
            """
            SELECT modulo, chave_origem, titulo, dados_publicados AS dados,
                   versao_editorial AS versao, publicado_em
            FROM conteudo_global_editorial
            WHERE modulo='mundo' AND publicado_em IS NOT NULL
              AND dados_publicados IS NOT NULL
            ORDER BY chave_origem
            """
        ).fetchall()
    return {
        "formato": "o-jardim-conteudo-global",
        "versao_formato": 1,
        "gerado_em": datetime.now(timezone.utc).isoformat(),
        "conteudo": [dict(row) for row in rows],
    }


@router.get("/resolvido")
def resolved_content(
    campanha_id: UUID,
    modulo: str = Query(default="mundo", pattern=r"^(mundo|regras)$"),
    user: AuthenticatedUser = Depends(get_current_user),
    database: Database = Depends(get_database),
):
    """Biblioteca base mesclada com a edição global ou com regras da campanha."""
    with database.connection() as connection:
        access = campaign_access(connection, campanha_id, user.id)
        library = _library_rows(connection, modulo)
        if modulo == "mundo":
            overrides = connection.execute(
                """
                SELECT chave_origem AS chave_recurso,
                       dados_publicados AS dados_completos
                FROM conteudo_global_editorial
                WHERE modulo='mundo' AND publicado_em IS NOT NULL
                  AND dados_publicados IS NOT NULL
                """
            ).fetchall()
        else:
            overrides = connection.execute(
                """
                SELECT chave_recurso, dados_completos
                FROM informacoes_campanha
                WHERE campanha_id=%s AND tipo=%s AND publicado_em IS NOT NULL
                """,
                (campanha_id, modulo),
            ).fetchall()
    override_by_key = {row["chave_recurso"]: row["dados_completos"] for row in overrides}
    entries = []
    official_keys = set()
    for raw_item in library:
        item = dict(raw_item)
        composite_key = f"{item['tipo']}:{item['chave_recurso']}"
        official_keys.add(composite_key)
        override = override_by_key.get(composite_key)
        if _is_removed_document(override):
            continue
        resolved = (
            {**item["dados"], **override}
            if isinstance(override, dict)
            else dict(item["dados"])
        )
        if modulo == "mundo":
            resolved["chave_origem"] = composite_key
        if (
            modulo == "regras"
            and not access.manages_content
            and isinstance(resolved, dict)
            and resolved.get("tipo") == "regra"
            and isinstance(resolved.get("conteudo"), dict)
        ):
            resolved = {
                **resolved,
                "conteudo": {
                    key: value
                    for key, value in resolved["conteudo"].items()
                    if key != "corpoMestre"
                },
            }
        entries.append(resolved)
    if modulo == "mundo":
        entries.extend(
            {**document, "chave_origem": composite_key}
            for composite_key, document in override_by_key.items()
            if (
                composite_key not in official_keys
                and _is_editorial_document(document)
                and not _is_removed_document(document)
            )
        )
    return {"modulo": modulo, "entradas": entries}


@router.get("/editor/exportar")
def export_published_editorial_content(
    campanha_id: UUID,
    user: AuthenticatedUser = Depends(get_current_user),
    database: Database = Depends(get_database),
):
    """Exporta apenas as versões publicadas, em um snapshot portátil e versionado."""
    with database.connection() as connection:
        _require_content_editor(connection, campanha_id, user)
        campaign = connection.execute(
            "SELECT id, nome FROM campanhas WHERE id=%s",
            (campanha_id,),
        ).fetchone()
        if not campaign:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="campanha não encontrada")
        content_rows = connection.execute(
            """
            SELECT tipo AS modulo, chave_recurso, titulo, dados_completos AS dados,
                   versao_editorial AS versao, publicado_em
            FROM informacoes_campanha
            WHERE campanha_id=%s
              AND tipo='regras'
              AND publicado_em IS NOT NULL
              AND dados_completos <> '{}'::jsonb
            ORDER BY tipo, chave_recurso
            """,
            (campanha_id,),
        ).fetchall()
        shop_rows = connection.execute(
            """
            SELECT item_id, publicado AS dados, versao, publicado_em
            FROM catalogo_itens_campanha
            WHERE campanha_id=%s AND publicado IS NOT NULL
            ORDER BY item_id
            """,
            (campanha_id,),
        ).fetchall()

    return {
        "formato": "o-jardim-conteudo-publicado",
        "versao_formato": 1,
        "gerado_em": datetime.now(timezone.utc).isoformat(),
        "campanha": {"id": str(campaign["id"]), "nome": campaign["nome"]},
        "conteudo": [dict(row) for row in content_rows],
        "loja": [dict(row) for row in shop_rows],
    }


@router.put("/{knowledge_id}/acesso")
def change_default_access(
    knowledge_id: UUID,
    payload: ContentAccessInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    """Muda o acesso padrão sem republicar — de 'todos veem' a 'só liberado'."""
    with database.connection() as connection:
        current = connection.execute(
            """
            SELECT campanha_id, tipo, titulo, acesso_padrao
            FROM informacoes_campanha WHERE id=%s
            """,
            (knowledge_id,),
        ).fetchone()
        if not current:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="conteudo nao encontrado")
        require_creator_campaign(connection, current["campanha_id"], user)
        row = connection.execute(
            """
            UPDATE informacoes_campanha
            SET acesso_padrao=%s, atualizado_em=CURRENT_TIMESTAMP
            WHERE id=%s
            RETURNING id, titulo, tipo, acesso_padrao
            """,
            (payload.acesso_padrao, knowledge_id),
        ).fetchone()
        if payload.acesso_padrao != "oculto" and current["acesso_padrao"] == "oculto":
            notify(
                connection,
                user_ids=campaign_member_ids(connection, current["campanha_id"]),
                category="conteudo",
                title=f"Liberado para a mesa: {current['titulo']}",
                message=f"Agora todos veem em {_MODULE_LABELS.get(current['tipo'], current['tipo'])}.",
                campaign_id=current["campanha_id"],
                actor_user_id=user.id,
            )
        record_audit(
            connection,
            action="conteudo.acesso_alterado",
            actor_user_id=user.id,
            campaign_id=current["campanha_id"],
            target_type=current["tipo"],
            target_id=str(knowledge_id),
            details={
                "acesso_anterior": current["acesso_padrao"],
                "acesso_novo": payload.acesso_padrao,
            },
        )
    return {"informacao": dict(row)}


@router.delete("/{knowledge_id}", status_code=status.HTTP_204_NO_CONTENT)
def unpublish_content(
    knowledge_id: UUID,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        row = connection.execute(
            "SELECT campanha_id, tipo FROM informacoes_campanha WHERE id=%s",
            (knowledge_id,),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="conteudo nao encontrado")
        require_creator_campaign(connection, row["campanha_id"], user)
        connection.execute("DELETE FROM informacoes_campanha WHERE id=%s", (knowledge_id,))
        record_audit(
            connection,
            action="conteudo.ocultado",
            actor_user_id=user.id,
            campaign_id=row["campanha_id"],
            target_type=row["tipo"],
            target_id=str(knowledge_id),
        )
    return None


@router.get("/visivel")
def visible_content(
    campanha_id: UUID,
    modulo: str = Query(pattern=r"^(loja|mundo|regras)$"),
    user: AuthenticatedUser = Depends(get_current_user),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        access = campaign_access(connection, campanha_id, user.id)
        rows = connection.execute(
            """
            SELECT id, chave_recurso, titulo, resumo_rumor,
                   dados_parciais, dados_completos, acesso_padrao
            FROM informacoes_campanha
            WHERE campanha_id=%s AND tipo=%s AND acesso_padrao <> 'oculto'
            ORDER BY titulo
            """,
            (campanha_id, modulo),
        ).fetchall()
        # Liberações mais específicas continuam sendo resolvidas pelo endpoint
        # /conhecimento. Esta rota cobre a publicação padrão para a campanha.
    entries = []
    for row in rows:
        if access.manages_content or row["acesso_padrao"] == "completo":
            entries.append(row["dados_completos"])
        elif row["acesso_padrao"] == "parcial":
            entries.append(row["dados_parciais"])
        else:
            entries.append({
                "titulo": row["titulo"],
                "resumo": row["resumo_rumor"],
                "acesso": "rumor",
            })
    return {
        "modulo": modulo,
        "papel": access.role,
        "entradas": entries,
    }


@router.get("/busca")
def buscar_conteudo(
    campanha_id: UUID,
    q: str = Query(min_length=2, max_length=80),
    user: AuthenticatedUser = Depends(get_current_user),
    database: Database = Depends(get_database),
):
    """Busca global no que a campanha liberou (loja e mundo) e nos personagens
    do próprio jogador. Cada resultado aponta para o módulo certo."""
    termo = f"%{q.strip()}%"
    resultados = []
    with database.connection() as connection:
        campaign_access(connection, campanha_id, user.id)
        conteudo = connection.execute(
            """
            SELECT tipo AS modulo, chave_recurso, titulo
            FROM informacoes_campanha
            WHERE campanha_id=%s AND acesso_padrao <> 'oculto'
              AND tipo IN ('loja', 'mundo')
              AND titulo ILIKE %s
            ORDER BY tipo, titulo
            LIMIT 25
            """,
            (campanha_id, termo),
        ).fetchall()
        for row in conteudo:
            resultados.append(
                {"modulo": row["modulo"], "titulo": row["titulo"], "ref": None}
            )
        personagens = connection.execute(
            """
            SELECT id, nome FROM personagens
            WHERE campanha_id=%s AND dono_usuario_id=%s AND status='ativo'
              AND nome ILIKE %s
            ORDER BY nome LIMIT 10
            """,
            (campanha_id, user.id, termo),
        ).fetchall()
        for row in personagens:
            resultados.append(
                {"modulo": "ficha", "titulo": row["nome"], "ref": str(row["id"])}
            )
    return {"resultados": resultados}
