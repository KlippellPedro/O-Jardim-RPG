from __future__ import annotations

from typing import Any
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, status
from psycopg.types.json import Jsonb

from core.audit import record_audit
from core.character_summary import _atende_requisito_legado
from core.database import Database
from core.dependencies import (
    AuthenticatedUser,
    campaign_access,
    get_current_user,
    get_database,
    require_csrf,
)
from core.economy_commands import (
    MAX_ECONOMY_AMOUNT,
    begin_economy_command,
    command_fingerprint,
    complete_economy_command,
    get_economy_command_replay,
    normalize_catalog_filter,
    normalize_currency,
    resale_value,
    resolve_catalog_price,
)
from schemas import ShopBatchCommandInput


router = APIRouter(prefix="/loja", tags=["loja"])

_PROTECTED_INVENTORY_METADATA = frozenset(
    {
        "catalogo_item_id",
        "custo",
        "loja_item_id",
        "moeda",
        "origem",
        "preco",
        "precos",
        "proveniencia",
        "recompensa_id",
        "tipo",
        "tipo_catalogo",
        "valor",
        "valor_compra",
        "valor_venda",
    }
)


def _editable_instance_metadata(data: dict[str, Any]) -> dict[str, Any]:
    """Preserva estado/metadata desconhecida sem preservar campos econômicos."""

    result = {}
    for key, value in data.items():
        normalized = normalize_catalog_filter(key).replace(" ", "_")
        if normalized.startswith(
            ("_", "catalogo_", "loja_", "preco_", "proveniencia_", "recompensa_")
        ):
            continue
        if normalized in _PROTECTED_INVENTORY_METADATA:
            continue
        result[key] = value
    return result


def _inventory_category(catalog_type: str) -> str:
    normalized = normalize_catalog_filter(catalog_type)
    if normalized == "arma":
        return "arma"
    if normalized == "armadura":
        return "armadura"
    if normalized in {"equipamento", "consumivel", "fruto-eden"}:
        return "consumivel"
    if normalized == "veiculo-completo":
        return "veiculo"
    if normalized == "veiculo":
        return "modulo-veicular"
    if normalized == "implante":
        return "implante"
    if normalized == "propriedade":
        return "propriedade"
    return "geral"


def _shop_config(connection, campaign_id: UUID, *, lock: bool = False) -> tuple[set[str], set[str], set[int]]:
    row = connection.execute(
        "SELECT configuracoes FROM campanhas WHERE id=%s AND status='ativa'"
        + (" FOR SHARE" if lock else ""),
        (campaign_id,),
    ).fetchone()
    config = row["configuracoes"] if row and isinstance(row["configuracoes"], dict) else {}
    raw_hidden_rarities = config.get("raridades_ocultas", [])
    raw_hidden_items = config.get("itens_ocultos", [])
    raw_hidden_locations = config.get("locais_ocultos", [3, 4])
    if not isinstance(raw_hidden_rarities, list):
        raw_hidden_rarities = []
    if not isinstance(raw_hidden_items, list):
        raw_hidden_items = []
    if not isinstance(raw_hidden_locations, list):
        raw_hidden_locations = [3, 4]
    hidden_rarities = {
        normalize_catalog_filter(value)
        for value in raw_hidden_rarities
        if isinstance(value, str) and value.strip()
    }
    hidden_items = {
        normalize_catalog_filter(value)
        for value in raw_hidden_items
        if isinstance(value, str) and value.strip()
    }
    hidden_locations = {
        value
        for value in raw_hidden_locations
        if isinstance(value, int) and not isinstance(value, bool) and 1 <= value <= 4
    }
    return hidden_rarities, hidden_items, hidden_locations


def _catalog_shop_level(row: dict[str, Any]) -> int:
    content = row.get("conteudo") if isinstance(row.get("conteudo"), dict) else {}
    explicit = content.get("nivelMinimoLoja")
    if isinstance(explicit, int) and not isinstance(explicit, bool) and 1 <= explicit <= 4:
        return explicit

    rarity = normalize_catalog_filter(content.get("raridade", ""))
    catalog_type = normalize_catalog_filter(row.get("tipo", ""))
    if rarity not in {
        "comum", "incomum", "raro", "epico", "lendario", "reliquia",
        "mitico", "mitica", "reliquia da criacao",
    }:
        return 4
    if rarity in {"lendario", "reliquia", "mitico", "mitica", "reliquia da criacao"}:
        return 4
    if catalog_type == "fruto-eden":
        return 4
    price = resolve_catalog_price(content)
    description = normalize_catalog_filter(content.get("descricao", ""))
    if price and normalize_currency(price.moeda) == normalize_currency("Fragmentos de Estrela"):
        return 4
    if rarity == "epico":
        return 3
    if catalog_type in {"implante", "artefato"} or (price and normalize_currency(price.moeda) == normalize_currency("Créditos Sombrios")):
        return 3
    if any(marker in description for marker in ("ilegal", "contrabando", "veneno", "mercado negro")):
        return 3
    if catalog_type in {"veiculo", "veiculo-completo", "propriedade"}:
        return 2
    if rarity == "raro":
        return 2
    if catalog_type == "arma" and normalize_catalog_filter(content.get("subtipo", "")) == "marcial":
        return 2
    if catalog_type == "consumivel" and normalize_catalog_filter(content.get("subtipo", "")) == "selo":
        return 2
    return 1


def _is_hidden_catalog_item(
    row: dict[str, Any],
    hidden_rarities: set[str],
    hidden_items: set[str],
) -> bool:
    content = row.get("conteudo") if isinstance(row.get("conteudo"), dict) else {}
    rarity = normalize_catalog_filter(content.get("raridade", ""))
    return (
        normalize_catalog_filter(row.get("id", "")) in hidden_items
        or bool(rarity and rarity in hidden_rarities)
    )


def _visible_catalog_rows(
    connection,
    campaign_id: UUID,
    item_ids: list[str] | None = None,
    *,
    lock: bool = False,
) -> list[dict[str, Any]]:
    lock_clause = " FOR SHARE OF c" if lock else ""
    if item_ids is None:
        rows = connection.execute(
            """
            SELECT c.id, c.tipo, c.titulo, c.conteudo
            FROM catalogo_itens c
            WHERE c.ativo=TRUE
            ORDER BY c.tipo, c.titulo, c.id
            """ + lock_clause
        ).fetchall()
    else:
        rows = connection.execute(
            """
            SELECT c.id, c.tipo, c.titulo, c.conteudo
            FROM catalogo_itens c
            WHERE c.ativo=TRUE AND c.id = ANY(%s)
            ORDER BY c.id
            """ + lock_clause,
            (item_ids,),
        ).fetchall()
    hidden_rarities, hidden_items, _hidden_locations = _shop_config(connection, campaign_id, lock=lock)
    return [
        dict(row)
        for row in rows
        if not _is_hidden_catalog_item(dict(row), hidden_rarities, hidden_items)
    ]


def _active_catalog_rows(connection, item_ids: list[str], *, lock: bool = False) -> list[dict[str, Any]]:
    rows = connection.execute(
        """
        SELECT id, tipo, titulo, conteudo
        FROM catalogo_itens
        WHERE ativo=TRUE AND id = ANY(%s)
        ORDER BY id
        """ + (" FOR SHARE" if lock else ""),
        (item_ids,),
    ).fetchall()
    return [dict(row) for row in rows]


def _owned_character(connection, campaign_id: UUID, character_id: UUID, user_id: UUID, *, lock: bool):
    suffix = " FOR UPDATE" if lock else ""
    row = connection.execute(
        """
        SELECT id, nome, economia_versao, ficha
        FROM personagens
        WHERE id=%s AND campanha_id=%s AND dono_usuario_id=%s AND status='ativo'
        """ + suffix,
        (character_id, campaign_id, user_id),
    ).fetchone()
    if not row:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="escolha um personagem ativo seu desta campanha",
        )
    return row


def _character_level_and_classes(character: dict[str, Any]) -> tuple[int, set[str]]:
    sheet = character.get("ficha") if isinstance(character.get("ficha"), dict) else {}
    raw_classes = sheet.get("classes") if isinstance(sheet.get("classes"), list) else []
    class_ids: set[str] = set()
    summed_level = 0
    for raw_class in raw_classes:
        if not isinstance(raw_class, dict):
            continue
        class_id = raw_class.get("id") or raw_class.get("classeId")
        if isinstance(class_id, str) and class_id.strip():
            class_ids.add(normalize_catalog_filter(class_id))
        class_level = raw_class.get("nivel")
        if isinstance(class_level, int) and not isinstance(class_level, bool) and class_level > 0:
            summed_level += class_level
    declared_level = sheet.get("nivel")
    level = declared_level if isinstance(declared_level, int) and not isinstance(declared_level, bool) else summed_level
    return max(0, level), class_ids


def _require_catalog_character_requirements(item: dict[str, Any], character: dict[str, Any]) -> list[dict[str, Any]]:
    content = item.get("conteudo") if isinstance(item.get("conteudo"), dict) else {}
    required_level = content.get("requisitoNivel")
    required_classes = content.get("requisitoClasse")
    if required_level is None and required_classes is None:
        return []
    level, class_ids = _character_level_and_classes(character)
    infracoes = []
    if isinstance(required_level, int) and not isinstance(required_level, bool) and level < required_level:
        infracoes.append({
            "item_id": item["id"],
            "tipo_infracao": "nivel_insuficiente",
            "requisito": "Nível",
            "valor_exigido": str(required_level),
            "valor_personagem": str(level),
            "mensagem": f"{item['titulo']} exige nivel {required_level}"
        })
    normalized_required = (
        [required_classes]
        if isinstance(required_classes, str)
        else required_classes if isinstance(required_classes, list) else []
    )
    allowed_classes = {
        normalize_catalog_filter(value)
        for value in normalized_required
        if isinstance(value, str) and value.strip()
    }
    if allowed_classes and class_ids.isdisjoint(allowed_classes):
        infracoes.append({
            "item_id": item["id"],
            "tipo_infracao": "classe_incompativel",
            "requisito": "Classe",
            "valor_exigido": ", ".join(allowed_classes),
            "valor_personagem": ", ".join(class_ids) if class_ids else "Nenhuma",
            "mensagem": f"{item['titulo']} exige uma classe compativel"
        })
    return infracoes


def _require_expected_version(character, expected: int) -> None:
    current = int(character["economia_versao"])
    if current != expected:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "mensagem": "a economia mudou; recarregue antes de tentar novamente",
                "versao_atual": current,
            },
        )


def _locked_wallet(connection, campaign_id: UUID, character_id: UUID):
    rows = connection.execute(
        """
        SELECT moeda, saldo
        FROM saldos_personagem
        WHERE campanha_id=%s AND personagem_id=%s
        ORDER BY LOWER(BTRIM(moeda)), moeda
        FOR UPDATE
        """,
        (campaign_id, character_id),
    ).fetchall()
    by_currency: dict[str, dict[str, Any]] = {}
    for raw_row in rows:
        row = dict(raw_row)
        normalized = normalize_currency(row["moeda"])
        if normalized in by_currency:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"a carteira possui entradas duplicadas para {row['moeda']}",
            )
        by_currency[normalized] = row
    return by_currency


def _locked_inventory(connection, campaign_id: UUID, character_id: UUID, item_ids: list[str]):
    rows = connection.execute(
        """
        SELECT item_id, titulo, quantidade, dados
        FROM inventario_personagem
        WHERE campanha_id=%s AND personagem_id=%s AND item_id = ANY(%s)
        ORDER BY item_id
        FOR UPDATE
        """,
        (campaign_id, character_id, item_ids),
    ).fetchall()
    return {row["item_id"]: dict(row) for row in rows}


def _add_total(totals: dict[str, dict[str, Any]], currency: str, value: int) -> None:
    normalized = normalize_currency(currency)
    if normalized not in totals:
        totals[normalized] = {"moeda": currency, "valor": 0}
    new_value = int(totals[normalized]["valor"]) + int(value)
    if new_value > MAX_ECONOMY_AMOUNT:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"o total em {currency} excede o limite economico",
        )
    totals[normalized]["valor"] = new_value


def _record_wallet_ledger(
    connection,
    *,
    operation_id: UUID,
    campaign_id: UUID,
    character_id: UUID,
    actor_user_id: UUID,
    origin: str,
    movements: list[dict[str, Any]],
    sign: int,
) -> None:
    for movement in movements:
        connection.execute(
            """
            INSERT INTO lancamentos_economia
                (id, campanha_id, personagem_id, moeda, delta, saldo_apos,
                 motivo, origem, idempotencia, ator_usuario_id)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                uuid4(),
                campaign_id,
                character_id,
                movement["moeda"],
                sign * int(movement["valor"]),
                movement["saldo"],
                "Compra na loja" if sign < 0 else "Venda para a loja",
                origin,
                f"{operation_id}:wallet:{normalize_currency(movement['moeda'])}",
                actor_user_id,
            ),
        )


def _mercenary_ally_from_catalog_item(item: dict[str, Any]) -> dict[str, Any]:
    """Converte um item de bestiário (categoria 'Mercenários' na loja) numa ficha de aliado pronta."""

    content = item.get("conteudo") if isinstance(item.get("conteudo"), dict) else {}
    ataques = content.get("ataques") if isinstance(content.get("ataques"), list) else []
    primeiro_ataque = ataques[0] if ataques and isinstance(ataques[0], dict) else {}
    ataque_principal = " ".join(
        str(parte) for parte in (primeiro_ataque.get("nome"), primeiro_ataque.get("detalhe")) if parte
    )

    def _inteiro(valor: Any, padrao: int) -> int:
        return int(valor) if isinstance(valor, (int, float)) and not isinstance(valor, bool) else padrao

    vida_maxima = max(1, _inteiro(content.get("pv"), 10))
    return {
        "id": str(uuid4()),
        "nome": item["titulo"],
        "categoria": "comum",
        "especieTipo": content.get("categoria") or "Mercenário",
        "papel": content.get("classe") or "Mercenário",
        "nivel": _inteiro(content.get("nivel"), 1),
        "vidaAtual": vida_maxima,
        "vidaMaxima": vida_maxima,
        "defesa": _inteiro(content.get("defesa"), 10),
        "movimento": content.get("deslocamento") or "",
        "iniciativa": _inteiro(content.get("iniciativa"), 0),
        "ataquePrincipal": ataque_principal,
        "condicoes": "",
        "observacoes": content.get("descricao") or "",
        "emCena": True,
        "favorito": False,
        "mercenarioCatalogoId": item["id"],
    }


def _build_mercenary_allies(item: dict[str, Any], quantidade: int) -> list[dict[str, Any]]:
    return [_mercenary_ally_from_catalog_item(item) for _ in range(max(0, quantidade))]


def _property_from_catalog_item(item: dict[str, Any]) -> dict[str, Any]:
    """Converte um item 'propriedade' comprado na loja (categoria 'Bens') numa entrada de ficha.propriedades pronta."""

    content = item.get("conteudo") if isinstance(item.get("conteudo"), dict) else {}
    price = resolve_catalog_price(content)
    instalacoes_catalogo = content.get("instalacoes") if isinstance(content.get("instalacoes"), list) else []
    instalacoes = [
        {
            "id": str(uuid4()),
            "nome": instalacao.get("nome", "") if isinstance(instalacao, dict) else "",
            "nivel": int(instalacao.get("nivel", 1)) if isinstance(instalacao, dict) and isinstance(instalacao.get("nivel"), (int, float)) else 1,
            "espacosOcupados": int(instalacao.get("espacosOcupados", 1)) if isinstance(instalacao, dict) and isinstance(instalacao.get("espacosOcupados"), (int, float)) else 1,
        }
        for instalacao in instalacoes_catalogo
        if isinstance(instalacao, dict)
    ]
    manutencao = content.get("manutencao")
    return {
        "id": str(uuid4()),
        "nome": item["titulo"],
        "tipo": content.get("tipoPropriedade") or "outro",
        "localizacao": content.get("localizacao") or "",
        "patamar": content.get("patamar") or "",
        "valorAquisicao": price.valor if price else 0,
        "manutencao": int(manutencao) if isinstance(manutencao, (int, float)) and not isinstance(manutencao, bool) else 0,
        "descricao": content.get("descricao") or "",
        "qualidadeQuartos": content.get("qualidadeQuartos") or "",
        "instalacoes": instalacoes,
        "propriedadeCatalogoId": item["id"],
    }


def _build_properties(item: dict[str, Any], quantidade: int) -> list[dict[str, Any]]:
    return [_property_from_catalog_item(item) for _ in range(max(0, quantidade))]


@router.get("/catalogo")
def get_shop_catalog(
    campanha_id: UUID = Query(),
    user: AuthenticatedUser = Depends(get_current_user),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        campaign_access(connection, campanha_id, user.id)
        rows = _visible_catalog_rows(connection, campanha_id)
    items = []
    for row in rows:
        price = resolve_catalog_price(row["conteudo"])
        if price is None:
            # Entrada publicada com preço inválido não pode aparecer como comprável.
            continue
        items.append(
            {
                "id": row["id"],
                "titulo": row["titulo"],
                "tipo": row["tipo"],
                "conteudo": row["conteudo"],
                "preco": {"moeda": price.moeda, "valor": price.valor},
                "nivel_loja": _catalog_shop_level(row),
            }
        )
    return {"itens": items}


@router.post("/compras", status_code=status.HTTP_201_CREATED)
def purchase_batch(
    payload: ShopBatchCommandInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        access = campaign_access(connection, payload.campanha_id, user.id)
        fingerprint = command_fingerprint(payload)
        replay = get_economy_command_replay(
            connection,
            campaign_id=payload.campanha_id,
            user_id=user.id,
            command_type="loja.compra",
            idempotency_key=payload.idempotencia,
            fingerprint=fingerprint,
        )
        if replay is not None:
            return replay.replay_result
        character = _owned_character(
            connection,
            payload.campanha_id,
            payload.personagem_id,
            user.id,
            lock=True,
        )
        command = begin_economy_command(
            connection,
            campaign_id=payload.campanha_id,
            user_id=user.id,
            command_type="loja.compra",
            idempotency_key=payload.idempotencia,
            fingerprint=fingerprint,
        )
        if command.replay_result is not None:
            return command.replay_result
        _require_expected_version(character, payload.economia_versao_esperada)

        requested_ids = [line.item_id for line in payload.itens]
        catalog = {
            row["id"]: row
            for row in _visible_catalog_rows(
                connection,
                payload.campanha_id,
                requested_ids,
                lock=True,
            )
        }
        missing = next((item_id for item_id in requested_ids if item_id not in catalog), None)
        if missing:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"o item {missing} nao esta disponivel nesta loja",
            )
        location = payload.localizacao_loja if payload.localizacao_loja is not None else 1
        _hidden_rarities, _hidden_items, hidden_locations = _shop_config(
            connection,
            payload.campanha_id,
            lock=True,
        )
        if location in hidden_locations and not access.manages_content:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="esta localizacao da loja nao esta liberada na campanha",
            )
        unavailable = next(
            (item for item in catalog.values() if _catalog_shop_level(item) > location),
            None,
        )
        if unavailable:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"{unavailable['titulo']} exige uma localizacao de loja superior",
            )
        infracoes = []
        for item in catalog.values():
            content = item.get("conteudo") if isinstance(item.get("conteudo"), dict) else {}
            if content.get("requer_autorizacao_mestre") is True and not access.manages_content:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"{item['titulo']} exige autorizacao do Mestre",
                )
            infracoes.extend(_require_catalog_character_requirements(item, dict(character)))

        totals: dict[str, dict[str, Any]] = {}
        purchased_items = []
        for line in payload.itens:
            item = catalog[line.item_id]
            price = resolve_catalog_price(item["conteudo"])
            if price is None:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                    detail=f"{item['titulo']} possui preco invalido no catalogo",
                )
            _add_total(totals, price.moeda, price.valor * line.quantidade)
            purchased_items.append(
                {
                    "item_id": item["id"],
                    "titulo": item["titulo"],
                    "quantidade": line.quantidade,
                }
            )

        wallet = _locked_wallet(connection, payload.campanha_id, payload.personagem_id)
        
        target_ids = [line.alvo_item_id for line in payload.itens if getattr(line, "alvo_item_id", None)]
        all_inventory_ids = list(set(requested_ids + target_ids))
        
        existing_inventory = _locked_inventory(
            connection,
            payload.campanha_id,
            payload.personagem_id,
            all_inventory_ids,
        )
        for item_id, existing in existing_inventory.items():
            if item_id in target_ids:
                continue # Os alvos podem ter outras origens
            data = existing["dados"] if isinstance(existing["dados"], dict) else {}
            if data.get("origem") != "loja" or data.get("catalogo_item_id") != item_id:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"o item_id {item_id} ja e usado por um item sem origem verificavel",
                )

        debits = []
        for normalized, total in sorted(totals.items()):
            balance = wallet.get(normalized)
            current = int(balance["saldo"]) if balance else 0
            if current < total["valor"]:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail={
                        "mensagem": f"saldo insuficiente em {total['moeda']}",
                        "moeda": total["moeda"],
                        "necessario": total["valor"],
                        "disponivel": current,
                    },
                )
            remaining = current - int(total["valor"])
            connection.execute(
                """
                UPDATE saldos_personagem
                SET saldo=%s, atualizado_em=CURRENT_TIMESTAMP
                WHERE campanha_id=%s AND personagem_id=%s AND moeda=%s
                """,
                (
                    remaining,
                    payload.campanha_id,
                    payload.personagem_id,
                    balance["moeda"],
                ),
            )
            debits.append(
                {
                    "moeda": balance["moeda"],
                    "valor": int(total["valor"]),
                    "saldo": remaining,
                }
            )

        new_allies: list[dict[str, Any]] = []
        new_properties: list[dict[str, Any]] = []
        for line in payload.itens:
            item = catalog[line.item_id]
            alvo_id = getattr(line, "alvo_item_id", None)

            if alvo_id:
                alvo = existing_inventory.get(alvo_id)
                alvo_veiculo = None
                
                if not alvo:
                    # Preparo para os veículos compartilhados
                    alvo_veiculo_row = connection.execute(
                        "SELECT id, nome, proprietario_personagem_id, nivel_acesso_campanha, espacos_modulos_maximos FROM campanha_veiculos WHERE id=%s AND campanha_id=%s FOR UPDATE",
                        (alvo_id, payload.campanha_id)
                    ).fetchone()
                    if alvo_veiculo_row:
                        alvo_veiculo = dict(alvo_veiculo_row)
                        if str(alvo_veiculo["proprietario_personagem_id"]) != str(payload.personagem_id):
                            perm = connection.execute(
                                "SELECT nivel_permissao FROM campanha_veiculo_permissoes WHERE veiculo_id=%s AND personagem_id=%s",
                                (alvo_id, payload.personagem_id)
                            ).fetchone()
                            has_perm = perm and perm["nivel_permissao"] == "gerenciar"
                            if not has_perm:
                                raise HTTPException(
                                    status_code=status.HTTP_403_FORBIDDEN,
                                    detail="sem permissao para gerenciar as modificacoes deste veiculo"
                                )
                
                if not alvo and not alvo_veiculo:
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                        detail="o item alvo da modificacao nao existe ou nao pertence a voce",
                    )

                # Validação de compatibilidade
                item_content = item.get("conteudo") if isinstance(item.get("conteudo"), dict) else {}

                # Pré-requisito (nível/atributo/perícia) de modificações "marciais" —
                # existia como texto em pre_requisito, tipado em pre_requisitos desde
                # o achado 11 da auditoria 2026-08, mas nunca era conferido aqui.
                # Mestre/assistente segue isento, mesmo padrão de requer_autorizacao_mestre
                # acima e da validação de Legados em character_summary.py.
                pre_requisitos = item_content.get("pre_requisitos")
                if isinstance(pre_requisitos, list) and pre_requisitos and not access.manages_content:
                    nivel_comprador, _ = _character_level_and_classes(dict(character))
                    ficha_compradora = character.get("ficha") if isinstance(character.get("ficha"), dict) else {}
                    if not all(
                        _atende_requisito_legado(requisito, ficha_compradora, nivel_comprador)
                        for requisito in pre_requisitos
                    ):
                        raise HTTPException(
                            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                            detail=f"{item['titulo']} exige um pre-requisito que este personagem nao atende",
                        )
                categorias_alvo = item_content.get("categorias_alvo") or item_content.get("tipos_alvo_permitidos") or []
                if isinstance(categorias_alvo, str):
                    categorias_alvo = [categorias_alvo]

                alvo_categoria = ""
                if alvo:
                    alvo_dados = alvo.get("dados") if isinstance(alvo.get("dados"), dict) else {}
                    alvo_categoria = alvo_dados.get("categoria", alvo_dados.get("tipo", ""))
                elif alvo_veiculo:
                    alvo_categoria = "veiculo"
                alvo_categoria_norm = normalize_catalog_filter(alvo_categoria)

                if categorias_alvo:
                    allowed_norms = [normalize_catalog_filter(c) for c in categorias_alvo]
                    if alvo_categoria_norm not in allowed_norms and "veiculo" not in allowed_norms: # fallback provisorio
                        raise HTTPException(
                            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                            detail=f"modificacao incompativel com este tipo de alvo ({alvo_categoria})"
                        )

                # Checagem real de compatibilidade: `categorias_alvo`/`tipos_alvo_permitidos`
                # acima nunca é populado por nenhuma das 461 entradas do catálogo (só existe
                # nestes testes) — os dados reais usam `aplicacao` (Armas/Armaduras/Escudos/
                # Itens gerais e mágicos). Sem isto, uma modificação de arma sempre podia ser
                # instalada numa armadura e vice-versa (achado descoberto na validação
                # pós-correção 2026-08; ver docs/implementacao-final-pos-validacao-2026-08.md).
                #
                # Mapeamento (baseado em dados reais, não em suposição de nome de campo):
                #   - "Armas" só instala em item de categoria "arma".
                #   - "Armaduras" e "Escudos" só instalam em item de categoria "armadura" —
                #     as duas aplicações convergem pra mesma categoria de inventário porque
                #     _inventory_category() (acima) não distingue escudo de armadura comum
                #     por `subtipo`, e a tela de compra (LojaItemModal.tsx) também nunca fez
                #     essa distinção ao listar alvos possíveis; diferenciar aqui rejeitaria
                #     instalações que a própria tela sempre permitiu.
                #   - "Itens gerais e mágicos" não tem alvo restrito: o texto das 12
                #     modificações dessa aplicação (ex.: "Vinculado", "Protetor") descreve
                #     efeitos genéricos de "o item", sem amarração a arma/armadura específica.
                #   - Alvo "veiculo" (campanha_veiculos) fica sempre isento: nenhuma das 51
                #     modificações declara aplicação pra veículo, mas a tela de compra sempre
                #     ofereceu veículo como alvo válido pra qualquer modificação. Não há dado
                #     suficiente pra decidir se isso é intencional — registrado como pendência
                #     de design, não resolvido aqui pra não quebrar um fluxo que já funciona.
                aplicacao_mod = normalize_catalog_filter(item_content.get("aplicacao", ""))
                _ALVOS_POR_APLICACAO = {
                    "armas": {"arma"},
                    "armaduras": {"armadura"},
                    "escudos": {"armadura"},
                }
                if (
                    aplicacao_mod in _ALVOS_POR_APLICACAO
                    and alvo_categoria_norm
                    and alvo_categoria_norm != "veiculo"
                    and alvo_categoria_norm not in _ALVOS_POR_APLICACAO[aplicacao_mod]
                ):
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                        detail=f"{item['titulo']} (aplicacao: {item_content.get('aplicacao')}) nao e compativel com este tipo de item ({alvo_categoria})",
                    )

                slots_ocupados_nova = int(item_content.get("slots_ocupados", 1)) * line.quantidade
                grupo_exclusividade = normalize_catalog_filter(item_content.get("grupo_exclusividade", ""))
                permite_duplicata = item_content.get("permite_duplicata", False)
                
                if alvo:
                    modificacoes = alvo_dados.get("modificacoes", [])
                    limite_modificacoes = alvo_dados.get("limite_modificacoes")
                    slots_modificacao = alvo_dados.get("slots_modificacao")
                    
                    if limite_modificacoes is not None and len(modificacoes) + line.quantidade > int(limite_modificacoes):
                        raise HTTPException(
                            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                            detail="o limite de modificacoes do item alvo foi excedido"
                        )
                    
                    if slots_modificacao is not None:
                        total_slots_used = sum(int(m.get("slots_ocupados", 1)) for m in modificacoes)
                        if total_slots_used + slots_ocupados_nova > int(slots_modificacao):
                            raise HTTPException(
                                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                                detail="os slots de modificacao do item alvo foram excedidos"
                            )
                            
                    for m in modificacoes:
                        m_exclusividade = normalize_catalog_filter(m.get("grupo_exclusividade", ""))
                        if m_exclusividade and grupo_exclusividade == m_exclusividade:
                            raise HTTPException(
                                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                                detail=f"conflito de exclusividade: ja existe uma modificacao do grupo {grupo_exclusividade}"
                            )
                        if not permite_duplicata and m.get("catalogo_item_id") == item["id"]:
                            raise HTTPException(
                                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                                detail=f"esta modificacao nao permite duplicatas no mesmo item"
                            )
                    
                    efeitos_in = item_content.get("efeitos", [])
                    nova_modificacao = {
                        "catalogo_item_id": item["id"],
                        "nome": item["titulo"],
                        "efeito": item_content.get("descricao", ""),
                        "tipo": "especial" if normalize_catalog_filter(item_content.get("raridade", "")) not in ["comum", "incomum"] else "comum",
                        "efeitos": efeitos_in,
                        "slots_ocupados": int(item_content.get("slots_ocupados", 1)),
                        "grupo_exclusividade": item_content.get("grupo_exclusividade", ""),
                        "removivel": item_content.get("removivel", True),
                        "destruida_ao_remover": item_content.get("destruida_ao_remover", False),
                        "instalado_por": str(user.id),
                    }
                    
                    for _ in range(line.quantidade):
                        nova = nova_modificacao.copy()
                        nova["id"] = str(uuid4())
                        modificacoes.append(nova)
                        
                    alvo_dados["modificacoes"] = modificacoes
                    
                    connection.execute(
                        """
                        UPDATE inventario_personagem
                        SET dados=%s, atualizado_em=CURRENT_TIMESTAMP
                        WHERE campanha_id=%s AND personagem_id=%s AND item_id=%s
                        """,
                        (Jsonb(alvo_dados), payload.campanha_id, payload.personagem_id, alvo_id)
                    )
                    
                    record_audit(
                        connection,
                        action="loja.instalar_modificacao",
                        actor_user_id=user.id,
                        campaign_id=payload.campanha_id,
                        target_type="personagem",
                        target_id=str(payload.personagem_id),
                        details={"operacao_id": str(command.id), "item_id": item["id"], "alvo_id": alvo_id, "quantidade": line.quantidade},
                    )
                    continue
                elif alvo_veiculo:
                    # Instalação em veículos compartilhados será implementada plenamente aqui
                    # quando a modelagem de módulos JSONB do veículo for finalizada.
                    # Por enquanto, impedimos a instalação silenciosa.
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                        detail="a instalacao direta em veiculos compartilhados requer a API de modulos",
                    )
            
            existing = existing_inventory.get(line.item_id, {})
            existing_quantity = int(existing.get("quantidade", 0))
            new_quantity = existing_quantity + line.quantidade
            if new_quantity > 1_000_000:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                    detail=f"a quantidade de {item['titulo']} excede o limite do inventario",
                )
            existing_data = existing.get("dados") if isinstance(existing.get("dados"), dict) else {}
            editable_state = _editable_instance_metadata(existing_data)
            item_data = {
                **editable_state,
                **(item["conteudo"] or {}),
                "tipo": item["tipo"],
                "categoria": _inventory_category(item["tipo"]),
                "origem": "loja",
                "catalogo_item_id": item["id"],
            }
            connection.execute(
                """
                INSERT INTO inventario_personagem
                    (campanha_id, personagem_id, item_id, titulo, quantidade, dados)
                VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT (campanha_id, personagem_id, item_id) DO UPDATE SET
                    titulo=EXCLUDED.titulo,
                    quantidade=EXCLUDED.quantidade,
                    dados=EXCLUDED.dados,
                    atualizado_em=CURRENT_TIMESTAMP
                """,
                (
                    payload.campanha_id,
                    payload.personagem_id,
                    item["id"],
                    item["titulo"],
                    new_quantity,
                    Jsonb(item_data),
                ),
            )

            if item["tipo"] == "monstro":
                new_allies.extend(_build_mercenary_allies(item, line.quantidade))
            elif item["tipo"] == "propriedade":
                new_properties.extend(_build_properties(item, line.quantidade))

        if new_allies or new_properties:
            ficha_atual = character["ficha"] if isinstance(character["ficha"], dict) else {}
            aliados_atuais = ficha_atual.get("aliados") if isinstance(ficha_atual.get("aliados"), list) else []
            propriedades_atuais = ficha_atual.get("propriedades") if isinstance(ficha_atual.get("propriedades"), list) else []
            ficha_atualizada = {
                **ficha_atual,
                "aliados": [*aliados_atuais, *new_allies],
                "propriedades": [*propriedades_atuais, *new_properties],
            }
            version = connection.execute(
                """
                UPDATE personagens
                SET economia_versao=economia_versao+1, atualizado_em=CURRENT_TIMESTAMP, ficha=%s
                WHERE id=%s
                RETURNING economia_versao
                """,
                (Jsonb(ficha_atualizada), payload.personagem_id),
            ).fetchone()["economia_versao"]
        else:
            version = connection.execute(
                """
                UPDATE personagens
                SET economia_versao=economia_versao+1, atualizado_em=CURRENT_TIMESTAMP
                WHERE id=%s
                RETURNING economia_versao
                """,
                (payload.personagem_id,),
            ).fetchone()["economia_versao"]
        _record_wallet_ledger(
            connection,
            operation_id=command.id,
            campaign_id=payload.campanha_id,
            character_id=payload.personagem_id,
            actor_user_id=user.id,
            origin="loja.compra",
            movements=debits,
            sign=-1,
        )
        result = {
            "operacao_id": str(command.id),
            "repetida": False,
            "economia_versao": int(version),
            "debitos": debits,
            "itens": purchased_items,
            # Requisito de nível/classe hoje não bloqueia a compra (fica registrado em
            # infracoes_loja e notifica o mestre) — mas quem compra precisa ver isso
            # tambem, nao so o mestre depois. Ver mensagem de cada infracao.
            "infracoes": [{"item_id": inf["item_id"], "mensagem": inf["mensagem"]} for inf in infracoes],
        }
        record_audit(
            connection,
            action="loja.compra_lote",
            actor_user_id=user.id,
            campaign_id=payload.campanha_id,
            target_type="personagem",
            target_id=str(payload.personagem_id),
            details={"operacao_id": str(command.id), "debitos": debits, "itens": purchased_items},
        )
        
        if infracoes:
            for inf in infracoes:
                connection.execute(
                    """
                    INSERT INTO infracoes_loja
                    (id, campanha_id, personagem_id, operacao_id, item_id, tipo_infracao, requisito, valor_exigido, valor_personagem, dados)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        uuid4(),
                        payload.campanha_id,
                        payload.personagem_id,
                        command.id,
                        inf["item_id"],
                        inf["tipo_infracao"],
                        inf["requisito"],
                        inf["valor_exigido"],
                        inf["valor_personagem"],
                        Jsonb({"mensagem": inf["mensagem"]})
                    )
                )
                
            masters = connection.execute(
                """
                SELECT usuario_id FROM membros_campanha
                WHERE campanha_id=%s AND papel IN ('mestre', 'assistente')
                """,
                (payload.campanha_id,)
            ).fetchall()
            
            titulo = f"Infração na loja: {character['nome']}"
            mensagem = f"O personagem **{character['nome']}** adquiriu itens ignorando os requisitos:\n" + "\n".join(f"- {inf['mensagem']}" for inf in infracoes)
            
            for m in masters:
                connection.execute(
                    """
                    INSERT INTO notificacoes
                    (id, campanha_id, usuario_id, categoria, titulo, mensagem, origem_usuario_id)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    """,
                    (uuid4(), payload.campanha_id, m["usuario_id"], "campanha", titulo, mensagem, user.id)
                )

        complete_economy_command(connection, command.id, result)
    return result


@router.post("/vendas", status_code=status.HTTP_201_CREATED)
def sell_batch(
    payload: ShopBatchCommandInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        campaign_access(connection, payload.campanha_id, user.id)
        fingerprint = command_fingerprint(payload)
        replay = get_economy_command_replay(
            connection,
            campaign_id=payload.campanha_id,
            user_id=user.id,
            command_type="loja.venda",
            idempotency_key=payload.idempotencia,
            fingerprint=fingerprint,
        )
        if replay is not None:
            return replay.replay_result
        character = _owned_character(
            connection,
            payload.campanha_id,
            payload.personagem_id,
            user.id,
            lock=True,
        )
        command = begin_economy_command(
            connection,
            campaign_id=payload.campanha_id,
            user_id=user.id,
            command_type="loja.venda",
            idempotency_key=payload.idempotencia,
            fingerprint=fingerprint,
        )
        if command.replay_result is not None:
            return command.replay_result
        _require_expected_version(character, payload.economia_versao_esperada)
        requested_ids = [line.item_id for line in payload.itens]

        # Ordem global dos locks econômicos: personagem, carteira, inventário.
        wallet = _locked_wallet(connection, payload.campanha_id, payload.personagem_id)
        inventory = _locked_inventory(
            connection,
            payload.campanha_id,
            payload.personagem_id,
            requested_ids,
        )
        missing = next((item_id for item_id in requested_ids if item_id not in inventory), None)
        if missing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"o item {missing} nao esta mais no inventario",
            )

        for item_id, item in inventory.items():
            data = item["dados"] if isinstance(item["dados"], dict) else {}
            if (
                data.get("origem") != "loja"
                or data.get("catalogo_item_id") != item_id
            ):
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                    detail=f"o item {item_id} nao possui origem de loja verificavel",
                )

        catalog = {
            row["id"]: row
            for row in _active_catalog_rows(connection, requested_ids, lock=True)
        }
        missing_catalog = next((item_id for item_id in requested_ids if item_id not in catalog), None)
        if missing_catalog:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=f"o item {missing_catalog} nao existe mais no catalogo ativo",
            )

        totals: dict[str, dict[str, Any]] = {}
        sold_items = []
        for line in payload.itens:
            stock = inventory[line.item_id]
            stock_dados = stock.get("dados") if isinstance(stock.get("dados"), dict) else {}
            mods_instaladas = stock_dados.get("modificacoes", [])
            if mods_instaladas and int(stock["quantidade"]) <= line.quantidade:
                # Bloqueia venda do ultimo exemplar se houver modificacoes instaladas
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                    detail={
                        "mensagem": "este equipamento possui modificacoes instaladas; remova-as antes de vender",
                        "item_id": line.item_id,
                        "modificacoes": [m.get("nome", m.get("id", "?")) for m in mods_instaladas],
                    },
                )
            if int(stock["quantidade"]) < line.quantidade:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail={
                        "mensagem": f"quantidade insuficiente de {stock['titulo']}",
                        "item_id": line.item_id,
                        "disponivel": int(stock["quantidade"]),
                    },
                )
            catalog_item = catalog[line.item_id]
            price = resolve_catalog_price(catalog_item["conteudo"])
            if price is None:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                    detail=f"{catalog_item['titulo']} possui preco invalido no catalogo",
                )
            reward = resale_value(price)
            _add_total(totals, reward.moeda, reward.valor * line.quantidade)
            sold_items.append(
                {
                    "item_id": line.item_id,
                    "titulo": stock["titulo"],
                    "quantidade": line.quantidade,
                }
            )

        credits = []
        for normalized, total in sorted(totals.items()):
            balance = wallet.get(normalized)
            current = int(balance["saldo"]) if balance else 0
            new_balance = current + int(total["valor"])
            if new_balance > MAX_ECONOMY_AMOUNT:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                    detail=f"o saldo em {total['moeda']} excederia o limite economico",
                )
            row = connection.execute(
                """
                INSERT INTO saldos_personagem
                    (campanha_id, personagem_id, moeda, saldo)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (campanha_id, personagem_id, moeda) DO UPDATE SET
                    saldo=EXCLUDED.saldo,
                    atualizado_em=CURRENT_TIMESTAMP
                RETURNING moeda, saldo
                """,
                (
                    payload.campanha_id,
                    payload.personagem_id,
                    balance["moeda"] if balance else total["moeda"],
                    new_balance,
                ),
            ).fetchone()
            credits.append(
                {"moeda": row["moeda"], "valor": int(total["valor"]), "saldo": int(row["saldo"])}
            )

        for line in payload.itens:
            remaining = int(inventory[line.item_id]["quantidade"]) - line.quantidade
            if remaining:
                connection.execute(
                    """
                    UPDATE inventario_personagem
                    SET quantidade=%s, atualizado_em=CURRENT_TIMESTAMP
                    WHERE campanha_id=%s AND personagem_id=%s AND item_id=%s
                    """,
                    (remaining, payload.campanha_id, payload.personagem_id, line.item_id),
                )
            else:
                connection.execute(
                    """
                    DELETE FROM inventario_personagem
                    WHERE campanha_id=%s AND personagem_id=%s AND item_id=%s
                    """,
                    (payload.campanha_id, payload.personagem_id, line.item_id),
                )

        version = connection.execute(
            """
            UPDATE personagens
            SET economia_versao=economia_versao+1, atualizado_em=CURRENT_TIMESTAMP
            WHERE id=%s
            RETURNING economia_versao
            """,
            (payload.personagem_id,),
        ).fetchone()["economia_versao"]
        _record_wallet_ledger(
            connection,
            operation_id=command.id,
            campaign_id=payload.campanha_id,
            character_id=payload.personagem_id,
            actor_user_id=user.id,
            origin="loja.venda",
            movements=credits,
            sign=1,
        )
        result = {
            "operacao_id": str(command.id),
            "repetida": False,
            "economia_versao": int(version),
            "creditos": credits,
            "itens": sold_items,
        }
        record_audit(
            connection,
            action="loja.venda_lote",
            actor_user_id=user.id,
            campaign_id=payload.campanha_id,
            target_type="personagem",
            target_id=str(payload.personagem_id),
            details={"operacao_id": str(command.id), "creditos": credits, "itens": sold_items},
        )
        complete_economy_command(connection, command.id, result)
    return result
