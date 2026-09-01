from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, status
from psycopg.types.json import Jsonb

from core import live_session
from core.audit import record_audit
from core.character_summary import _atende_requisito_legado
from core.database import Database
from core.notifications import campaign_member_ids, character_owner_ids, notify
from core.dependencies import (
    AuthenticatedUser,
    campaign_access,
    get_current_user,
    get_database,
    require_campaign_manager,
    require_creator_campaign,
    require_csrf,
)
from core.economy_commands import (
    CatalogPrice,
    EQUIPMENT_PURCHASE_RARITIES,
    MAX_ECONOMY_AMOUNT,
    begin_economy_command,
    command_fingerprint,
    complete_economy_command,
    equipment_variant_content,
    equipment_variant_overrides,
    equipment_variant_price,
    get_economy_command_replay,
    normalize_catalog_filter,
    normalize_currency,
    normalize_equipment_rarity,
    resale_value,
    resolve_catalog_price,
)
from core.equipment_rules import modification_limit_for_rarity
from core.promotions import resolve_promotion
from schemas import (
    ShopBatchCommandInput,
    ShopCatalogDraftInput,
    ShopCatalogPublishInput,
    ShopGrantCommandInput,
)


router = APIRouter(prefix="/loja", tags=["loja"])

_SHOP_RARITIES = {
    "comum", "incomum", "raro", "epico", "lendario", "reliquia",
    "reliquia da criacao", "mitico",
}
_SHOP_CURRENCIES = {
    normalize_currency("Solares"),
    normalize_currency("Lunaris"),
    normalize_currency("Fragmentos de Estrela"),
    normalize_currency("Créditos Sombrios"),
}
_MODIFICATION_APPLICATIONS = {"armas", "armaduras", "escudos", "itens gerais e magicos"}


def _is_configurable_equipment(row: dict[str, Any]) -> bool:
    if normalize_catalog_filter(row.get("tipo", "")) not in {"arma", "armadura"}:
        return False
    content = row.get("conteudo") if isinstance(row.get("conteudo"), dict) else {}
    original_rarity = normalize_catalog_filter(content.get("raridade", ""))
    # Relíquia e Mítico já são exclusivos e ficam fora da encomenda normal
    # (ver EQUIPMENT_PURCHASE_RARITIES): reimaginar um Excalibur como "Comum"
    # por uma fração do preço em Fragmentos de Estrela quebraria o propósito
    # do item.
    if original_rarity in {"reliquia", "mitico", "mitica", "reliquia da criacao"}:
        return False
    return True


def _discount_equipment_price(price: CatalogPrice, discount_percent: int) -> CatalogPrice:
    discounted = max(1, round(price.valor * (1 - discount_percent / 100)))
    return CatalogPrice(moeda=price.moeda, valor=discounted)


def _selected_equipment_rarity(row: dict[str, Any], requested: str | None) -> str | None:
    if not _is_configurable_equipment(row):
        if requested is not None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=f"{row['titulo']} nao permite escolher raridade",
            )
        return None
    selected = normalize_equipment_rarity(requested or "comum")
    if selected not in EQUIPMENT_PURCHASE_RARITIES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"raridade de compra invalida para {row['titulo']}",
        )
    return selected


def _equipment_inventory_item_id(row: dict[str, Any], selected_rarity: str | None) -> str:
    """Mantém o id legado para a raridade originalmente publicada.

    Assim itens já existentes continuam reconhecíveis; as demais variantes
    ganham um id estável e não misturam quantidades ou modificações entre si.
    """

    if not _is_configurable_equipment(row) or selected_rarity is None:
        return row["id"]
    content = row.get("conteudo") if isinstance(row.get("conteudo"), dict) else {}
    catalog_rarity = normalize_equipment_rarity(content.get("raridade")) or "comum"
    return row["id"] if selected_rarity == catalog_rarity else f"{row['id']}::raridade::{selected_rarity}"

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


def _catalog_shop_level(row: dict[str, Any], equipment_rarity: str | None = None) -> int:
    content = row.get("conteudo") if isinstance(row.get("conteudo"), dict) else {}
    explicit = content.get("nivelMinimoLoja")
    if equipment_rarity is None and isinstance(explicit, int) and not isinstance(explicit, bool) and 1 <= explicit <= 4:
        return explicit

    rarity = equipment_rarity or normalize_catalog_filter(content.get("raridade", ""))
    catalog_type = normalize_catalog_filter(row.get("tipo", ""))
    if rarity not in {
        "comum", "incomum", "raro", "epico", "lendario", "reliquia",
        "mitico", "mitica", "reliquia da criacao",
    }:
        return 4
    level = 4 if rarity in {"lendario", "reliquia", "mitico", "mitica", "reliquia da criacao"} else 1
    if rarity == "epico":
        level = max(level, 3)
    elif rarity == "raro":
        level = max(level, 2)
    if catalog_type == "fruto-eden":
        level = max(level, 4)
    # A moeda publicada pertence à raridade original. Quando a raridade é uma
    # escolha de compra, ela não pode empurrar a versão Comum para outro balcão.
    price = None if equipment_rarity is not None else resolve_catalog_price(content)
    description = normalize_catalog_filter(content.get("descricao", ""))
    if price and normalize_currency(price.moeda) == normalize_currency("Fragmentos de Estrela"):
        level = max(level, 4)
    if catalog_type in {"implante", "artefato"} or (price and normalize_currency(price.moeda) == normalize_currency("Créditos Sombrios")):
        level = max(level, 3)
    if any(marker in description for marker in ("ilegal", "contrabando", "veneno", "mercado negro")):
        level = max(level, 3)
    if catalog_type in {"veiculo", "veiculo-completo", "propriedade"}:
        level = max(level, 2)
    if catalog_type == "arma" and normalize_catalog_filter(content.get("subtipo", "")) == "marcial":
        level = max(level, 2)
    if catalog_type == "consumivel" and normalize_catalog_filter(content.get("subtipo", "")) == "selo":
        level = max(level, 2)
    # Um piso explícito num item originalmente Comum representa restrição de
    # natureza (por exemplo, uma arma militar). Em itens publicados em faixa
    # maior ele era o piso daquela raridade antiga e não deve prender a nova
    # versão Comum no Banco Lunar - exceto quando o piso vem da natureza do
    # item (mercado negro, autorização do Mestre), não da raridade antiga: aí
    # a versão Comum reimaginada continua sendo a mesma bazuca ou a mesma
    # lâmina perigosa, e o balcão exigido não pode sumir com o recálculo.
    original_rarity = normalize_equipment_rarity(content.get("raridade"))
    mantem_piso_original = (
        original_rarity == "comum"
        or content.get("requer_autorizacao_mestre") is True
        or content.get("mercado_negro") is True
    )
    if (
        equipment_rarity is not None
        and mantem_piso_original
        and isinstance(explicit, int)
        and not isinstance(explicit, bool)
        and 1 <= explicit <= 4
    ):
        level = max(level, explicit)
    return level


def _is_off_shop_catalog_item(row: dict[str, Any]) -> bool:
    """Entrada publicada só como referência de mesa, nunca como mercadoria.

    É o caso dos perfis universais do bestiário: eles existem para o Mestre
    montar inimigo na sessão e para consulta no Bestiário, e nunca aparecem no
    balcão. O filtro vale tanto para a vitrine quanto para a compra, porque as
    duas leem as mesmas linhas.

    São dois critérios de propósito. `conteudo.disponivelNaLoja: false` é a
    marca explícita que o catálogo declara e serve para qualquer tipo. A
    categoria "Universal" é a rede de segurança: a linha do banco só recebe a
    marca quando o catálogo é ressincronizado, e enquanto isso não acontece
    (ou se alguém editar a entrada pela biblioteca do mestre e derrubar a
    marca) o "Modelo de Criatura" voltaria à venda em Mercenários.
    """
    content = row.get("conteudo") if isinstance(row.get("conteudo"), dict) else {}
    if content.get("disponivelNaLoja") is False:
        return True
    return (
        normalize_catalog_filter(row.get("tipo", "")) == "monstro"
        and normalize_catalog_filter(content.get("categoria", "")) == "universal"
    )


def _is_hidden_catalog_item(
    row: dict[str, Any],
    hidden_rarities: set[str],
    hidden_items: set[str],
) -> bool:
    content = row.get("conteudo") if isinstance(row.get("conteudo"), dict) else {}
    rarity = normalize_catalog_filter(content.get("raridade", ""))
    rarity_hidden = bool(rarity and rarity in hidden_rarities)
    if _is_configurable_equipment(row):
        # A raridade publicada virou apenas a origem do cálculo do preço. O
        # item continua visível se houver ao menos uma raridade encomendável.
        rarity_hidden = all(value in hidden_rarities for value in EQUIPMENT_PURCHASE_RARITIES)
    return (
        _is_off_shop_catalog_item(row)
        or normalize_catalog_filter(row.get("id", "")) in hidden_items
        or rarity_hidden
    )


def _resolved_catalog_rows(
    connection,
    campaign_id: UUID,
    item_ids: list[str] | None = None,
    *,
    lock: bool = False,
) -> list[dict[str, Any]]:
    """Sobrepõe publicações da campanha ao catálogo oficial.

    Uma publicação com ``ativo=false`` é uma lápide: remove até um item oficial
    daquela campanha sem alterar o catálogo compartilhado pelas outras mesas.
    Rascunhos nunca entram nesta resolução e, portanto, não afetam compras.
    """
    lock_clause = " FOR SHARE" if lock else ""
    if item_ids is None:
        official_rows = connection.execute(
            """
            SELECT id, tipo, titulo, conteudo
            FROM catalogo_itens
            WHERE ativo=TRUE
            """ + lock_clause
        ).fetchall()
        override_rows = connection.execute(
            """
            SELECT item_id, publicado
            FROM catalogo_itens_campanha
            WHERE campanha_id=%s AND publicado IS NOT NULL
            """ + lock_clause,
            (campaign_id,),
        ).fetchall()
    else:
        official_rows = connection.execute(
            """
            SELECT id, tipo, titulo, conteudo
            FROM catalogo_itens
            WHERE ativo=TRUE AND id = ANY(%s)
            """ + lock_clause,
            (item_ids,),
        ).fetchall()
        override_rows = connection.execute(
            """
            SELECT item_id, publicado
            FROM catalogo_itens_campanha
            WHERE campanha_id=%s AND item_id = ANY(%s) AND publicado IS NOT NULL
            """ + lock_clause,
            (campaign_id, item_ids),
        ).fetchall()

    resolved = {row["id"]: dict(row) for row in official_rows}
    for row in override_rows:
        published = row["publicado"] if isinstance(row["publicado"], dict) else {}
        item_id = str(row["item_id"])
        if published.get("ativo") is False:
            resolved.pop(item_id, None)
            continue
        content = published.get("conteudo")
        if not all((published.get("tipo"), published.get("titulo"), isinstance(content, dict))):
            # Defesa adicional para dados legados/corrompidos: nunca deixa uma
            # publicação inválida alcançar a economia.
            resolved.pop(item_id, None)
            continue
        resolved[item_id] = {
            "id": item_id,
            "tipo": published["tipo"],
            "titulo": published["titulo"],
            "conteudo": content,
        }
    return sorted(resolved.values(), key=lambda row: (row["tipo"], row["titulo"], row["id"]))


def _visible_catalog_rows(
    connection,
    campaign_id: UUID,
    item_ids: list[str] | None = None,
    *,
    lock: bool = False,
) -> list[dict[str, Any]]:
    rows = _resolved_catalog_rows(connection, campaign_id, item_ids, lock=lock)
    hidden_rarities, hidden_items, _hidden_locations = _shop_config(connection, campaign_id, lock=lock)
    return [
        dict(row)
        for row in rows
        if not _is_hidden_catalog_item(dict(row), hidden_rarities, hidden_items)
    ]


def _active_catalog_rows(
    connection,
    campaign_id: UUID,
    item_ids: list[str],
    *,
    lock: bool = False,
) -> list[dict[str, Any]]:
    return _resolved_catalog_rows(connection, campaign_id, item_ids, lock=lock)


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


def _any_active_character(connection, campaign_id: UUID, character_id: UUID, *, lock: bool):
    """Igual a `_owned_character`, mas sem exigir que o personagem seja do
    chamador — usada quando quem chama já provou ser mestre/assistente da
    campanha (`require_campaign_manager`), então pode mirar em qualquer ficha."""
    suffix = " FOR UPDATE" if lock else ""
    row = connection.execute(
        """
        SELECT id, nome, economia_versao, versao, ficha
        FROM personagens
        WHERE id=%s AND campanha_id=%s AND status='ativo'
        """ + suffix,
        (character_id, campaign_id),
    ).fetchone()
    if not row:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="escolha um personagem ativo desta campanha",
        )
    return row


def _grant_notification_recipient_ids(connection, campaign_id: UUID, character_id: UUID) -> list[UUID]:
    """Dono da ficha contemplada e Mestres ativos; nunca a mesa inteira."""
    return [
        *character_owner_ids(connection, campaign_id, [character_id]),
        *campaign_member_ids(connection, campaign_id, roles=("mestre",)),
    ]


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


def _mercenary_ally_from_catalog_item(item: dict[str, Any], modo: str = "comprar") -> dict[str, Any]:
    """Converte um item de bestiário (categoria 'Mercenários' na loja) numa ficha de aliado pronta.

    ``modo="comprar"`` (padrão) é o preço cheio: o aliado vira servo/escravo
    permanente, sem mensalidade. ``modo="contratar"`` é o preço reduzido: gera
    uma mensalidade (``contrato_mensal`` do catálogo) que a mesa cobra fora do
    sistema, o mesmo tratamento que ``manutencao`` já dá pra Bens (ver
    _property_from_catalog_item) - nao ha cobranca automatica.
    """

    content = item.get("conteudo") if isinstance(item.get("conteudo"), dict) else {}
    ataques = content.get("ataques") if isinstance(content.get("ataques"), list) else []
    primeiro_ataque = ataques[0] if ataques and isinstance(ataques[0], dict) else {}
    ataque_principal = " ".join(
        str(parte) for parte in (primeiro_ataque.get("nome"), primeiro_ataque.get("detalhe")) if parte
    )

    def _inteiro(valor: Any, padrao: int) -> int:
        return int(valor) if isinstance(valor, (int, float)) and not isinstance(valor, bool) else padrao

    vida_maxima = max(1, _inteiro(content.get("pv"), 10))
    funcao = str(content.get("funcao") or "").strip()
    # Quem foi contratado para tomar conta de um lugar ou tocar um oficio fica
    # lotado na base: entra na ficha fora de cena, e o jogador coloca em cena na
    # hora que levar junto. Escolta, tripulacao e criatura de combate ja nascem
    # em cena porque andam com o grupo.
    de_posto_fixo = funcao in {"Guarda de local", "Ofício"}
    contratado = modo == "contratar"
    mensalidade = resolve_catalog_price(content, field="contrato_mensal") if contratado else None
    return {
        "id": str(uuid4()),
        "nome": item["titulo"],
        "categoria": "comum",
        "especieTipo": content.get("categoria") or "Mercenário",
        "papel": funcao or content.get("classe") or "Mercenário",
        "nivel": _inteiro(content.get("nivel"), 1),
        "vidaAtual": vida_maxima,
        "vidaMaxima": vida_maxima,
        "defesa": _inteiro(content.get("defesa"), 10),
        "movimento": content.get("deslocamento") or "",
        "iniciativa": _inteiro(content.get("iniciativa"), 0),
        "ataquePrincipal": ataque_principal,
        "condicoes": "",
        "observacoes": content.get("descricao") or "",
        "emCena": not de_posto_fixo,
        "favorito": False,
        "mercenarioCatalogoId": item["id"],
        "vinculo": "contratado" if contratado else "comprado",
        "mensalidade": {"moeda": mensalidade.moeda, "valor": mensalidade.valor} if mensalidade else None,
    }


def _build_mercenary_allies(item: dict[str, Any], quantidade: int, modo: str = "comprar") -> list[dict[str, Any]]:
    return [_mercenary_ally_from_catalog_item(item, modo) for _ in range(max(0, quantidade))]


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


def _validate_catalog_editor_item(payload: ShopCatalogDraftInput) -> dict[str, Any]:
    content = dict(payload.conteudo)
    price = resolve_catalog_price(content)
    if price is None or normalize_currency(price.moeda) not in _SHOP_CURRENCIES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="informe um preço inteiro positivo em uma moeda aceita pela loja",
        )
    rarity = content.get("raridade")
    if rarity is not None and normalize_catalog_filter(rarity) not in _SHOP_RARITIES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"raridade desconhecida: {rarity}",
        )
    shop_level = content.get("nivelMinimoLoja")
    if shop_level is not None and (
        isinstance(shop_level, bool) or not isinstance(shop_level, int) or not 1 <= shop_level <= 4
    ):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="nivelMinimoLoja precisa ser um inteiro entre 1 e 4",
        )
    if payload.tipo == "modificacao":
        application = normalize_catalog_filter(content.get("aplicacao", ""))
        if application not in _MODIFICATION_APPLICATIONS:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="a aplicação da modificação é inválida",
            )
    return {
        "id": payload.item_id,
        "tipo": payload.tipo,
        "titulo": payload.titulo,
        "conteudo": content,
        "ativo": payload.ativo,
    }


def _require_shop_editor(connection, campaign_id: UUID, user: AuthenticatedUser) -> None:
    require_creator_campaign(connection, campaign_id, user)


@router.get("/editor/catalogo")
def list_campaign_catalog_editor(
    campanha_id: UUID,
    user: AuthenticatedUser = Depends(get_current_user),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        _require_shop_editor(connection, campanha_id, user)
        official = connection.execute(
            """
            SELECT id, tipo, titulo, conteudo
            FROM catalogo_itens
            WHERE ativo=TRUE
            ORDER BY tipo, titulo, id
            """
        ).fetchall()
        overrides = connection.execute(
            """
            SELECT id, item_id, rascunho, publicado, versao,
                   atualizado_em, publicado_em
            FROM catalogo_itens_campanha
            WHERE campanha_id=%s
            ORDER BY atualizado_em DESC
            """,
            (campanha_id,),
        ).fetchall()

    official_by_id = {
        row["id"]: {
            "id": row["id"], "tipo": row["tipo"], "titulo": row["titulo"],
            "conteudo": row["conteudo"], "ativo": True,
        }
        for row in official
    }
    override_by_id = {row["item_id"]: dict(row) for row in overrides}
    entries = []
    for item_id in sorted(
        set(official_by_id) | set(override_by_id),
        key=lambda key: (
            str((override_by_id.get(key, {}).get("rascunho") or official_by_id.get(key, {})).get("tipo", "")),
            str((override_by_id.get(key, {}).get("rascunho") or official_by_id.get(key, {})).get("titulo", "")),
            key,
        ),
    ):
        editorial = override_by_id.get(item_id)
        entries.append({
            "item_id": item_id,
            "origem": "oficial" if item_id in official_by_id else "campanha",
            "base": official_by_id.get(item_id),
            "editorial": editorial,
        })
    return {"itens": entries}


@router.put("/editor/rascunho")
def save_campaign_catalog_draft(
    payload: ShopCatalogDraftInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    document = _validate_catalog_editor_item(payload)
    with database.connection() as connection:
        _require_shop_editor(connection, payload.campanha_id, user)
        current = connection.execute(
            """
            SELECT id, versao
            FROM catalogo_itens_campanha
            WHERE campanha_id=%s AND item_id=%s
            FOR UPDATE
            """,
            (payload.campanha_id, payload.item_id),
        ).fetchone()
        if current:
            if current["versao"] != payload.versao_esperada:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail={
                        "mensagem": "o item foi alterado em outro lugar; recarregue antes de salvar",
                        "versao_atual": current["versao"],
                    },
                )
            row = connection.execute(
                """
                UPDATE catalogo_itens_campanha
                SET rascunho=%s, atualizado_por=%s, versao=versao+1,
                    atualizado_em=CURRENT_TIMESTAMP
                WHERE id=%s AND versao=%s
                RETURNING id, item_id, rascunho, publicado, versao,
                          atualizado_em, publicado_em
                """,
                (Jsonb(document), user.id, current["id"], payload.versao_esperada),
            ).fetchone()
        else:
            if payload.versao_esperada is not None:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail={"mensagem": "o item ainda não possui versão editorial"},
                )
            total = connection.execute(
                "SELECT count(*) AS total FROM catalogo_itens_campanha WHERE campanha_id=%s",
                (payload.campanha_id,),
            ).fetchone()["total"]
            if total >= 500:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                    detail="a campanha atingiu o limite de 500 itens editados",
                )
            row = connection.execute(
                """
                INSERT INTO catalogo_itens_campanha
                    (id, campanha_id, item_id, rascunho, versao,
                     criado_por, atualizado_por)
                VALUES (%s, %s, %s, %s, 1, %s, %s)
                ON CONFLICT (campanha_id, item_id) DO NOTHING
                RETURNING id, item_id, rascunho, publicado, versao,
                          atualizado_em, publicado_em
                """,
                (uuid4(), payload.campanha_id, payload.item_id, Jsonb(document), user.id, user.id),
            ).fetchone()
            if not row:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail={"mensagem": "o item foi criado em outro lugar; recarregue antes de salvar"},
                )
        record_audit(
            connection,
            action="loja.catalogo_rascunho_salvo",
            actor_user_id=user.id,
            campaign_id=payload.campanha_id,
            target_type="catalogo_item",
            target_id=payload.item_id,
            details={"versao": row["versao"], "ativo": payload.ativo},
        )
    return {"editorial": dict(row)}


@router.post("/editor/{editorial_id}/publicar")
def publish_campaign_catalog_item(
    editorial_id: UUID,
    payload: ShopCatalogPublishInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        _require_shop_editor(connection, payload.campanha_id, user)
        current = connection.execute(
            """
            SELECT id, item_id, rascunho, versao
            FROM catalogo_itens_campanha
            WHERE id=%s AND campanha_id=%s
            FOR UPDATE
            """,
            (editorial_id, payload.campanha_id),
        ).fetchone()
        if not current:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="item editorial não encontrado")
        if current["versao"] != payload.versao_esperada:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "mensagem": "o rascunho mudou; recarregue antes de publicar",
                    "versao_atual": current["versao"],
                },
            )
        draft = current["rascunho"]
        if not isinstance(draft, dict):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="não existe rascunho válido para publicar",
            )
        new_version = int(current["versao"]) + 1
        row = connection.execute(
            """
            UPDATE catalogo_itens_campanha
            SET publicado=rascunho, versao=%s, atualizado_por=%s,
                atualizado_em=CURRENT_TIMESTAMP, publicado_em=CURRENT_TIMESTAMP
            WHERE id=%s AND versao=%s
            RETURNING id, item_id, rascunho, publicado, versao,
                      atualizado_em, publicado_em
            """,
            (new_version, user.id, editorial_id, payload.versao_esperada),
        ).fetchone()
        connection.execute(
            """
            INSERT INTO revisoes_catalogo_campanha
                (id, catalogo_item_campanha_id, campanha_id, item_id,
                 versao, dados, criado_por)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            """,
            (
                uuid4(), editorial_id, payload.campanha_id, current["item_id"],
                new_version, Jsonb(draft), user.id,
            ),
        )
        record_audit(
            connection,
            action="loja.catalogo_item_publicado",
            actor_user_id=user.id,
            campaign_id=payload.campanha_id,
            target_type="catalogo_item",
            target_id=current["item_id"],
            details={"versao": new_version, "ativo": draft.get("ativo", True)},
        )
    return {"editorial": dict(row)}


@router.get("/editor/{editorial_id}/revisoes")
def list_campaign_catalog_revisions(
    editorial_id: UUID,
    campanha_id: UUID,
    user: AuthenticatedUser = Depends(get_current_user),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        _require_shop_editor(connection, campanha_id, user)
        belongs = connection.execute(
            "SELECT 1 FROM catalogo_itens_campanha WHERE id=%s AND campanha_id=%s",
            (editorial_id, campanha_id),
        ).fetchone()
        if not belongs:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="item editorial não encontrado")
        rows = connection.execute(
            """
            SELECT id, versao, dados, criado_por, criado_em
            FROM revisoes_catalogo_campanha
            WHERE catalogo_item_campanha_id=%s AND campanha_id=%s
            ORDER BY versao DESC
            LIMIT 50
            """,
            (editorial_id, campanha_id),
        ).fetchall()
    return {"revisoes": [dict(row) for row in rows]}


@router.post("/editor/{editorial_id}/revisoes/{revision_id}/restaurar")
def restore_campaign_catalog_revision(
    editorial_id: UUID,
    revision_id: UUID,
    payload: ShopCatalogPublishInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    """Restaura uma publicação anterior como rascunho, sem publicá-la."""
    with database.connection() as connection:
        _require_shop_editor(connection, payload.campanha_id, user)
        current = connection.execute(
            """
            SELECT id, item_id, versao
            FROM catalogo_itens_campanha
            WHERE id=%s AND campanha_id=%s
            FOR UPDATE
            """,
            (editorial_id, payload.campanha_id),
        ).fetchone()
        if not current:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="item editorial não encontrado")
        if current["versao"] != payload.versao_esperada:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "mensagem": "o item mudou; recarregue antes de restaurar",
                    "versao_atual": current["versao"],
                },
            )
        revision = connection.execute(
            """
            SELECT id, dados
            FROM revisoes_catalogo_campanha
            WHERE id=%s AND catalogo_item_campanha_id=%s AND campanha_id=%s
            """,
            (revision_id, editorial_id, payload.campanha_id),
        ).fetchone()
        document = revision["dados"] if revision else None
        if not isinstance(document, dict):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="revisão não encontrada")
        try:
            validated = _validate_catalog_editor_item(ShopCatalogDraftInput(
                campanha_id=payload.campanha_id,
                item_id=current["item_id"],
                tipo=document.get("tipo"),
                titulo=document.get("titulo"),
                conteudo=document.get("conteudo"),
                ativo=document.get("ativo", True),
                versao_esperada=current["versao"],
            ))
        except (TypeError, ValueError) as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="a revisão armazenada não possui mais um formato válido",
            ) from exc
        row = connection.execute(
            """
            UPDATE catalogo_itens_campanha
            SET rascunho=%s, atualizado_por=%s, versao=versao+1,
                atualizado_em=CURRENT_TIMESTAMP
            WHERE id=%s AND versao=%s
            RETURNING id, item_id, rascunho, publicado, versao,
                      atualizado_em, publicado_em
            """,
            (Jsonb(validated), user.id, editorial_id, payload.versao_esperada),
        ).fetchone()
        record_audit(
            connection,
            action="loja.catalogo_revisao_restaurada",
            actor_user_id=user.id,
            campaign_id=payload.campanha_id,
            target_type="catalogo_item",
            target_id=current["item_id"],
            details={"revisao_id": str(revision_id), "versao": row["versao"]},
        )
    return {"editorial": dict(row)}


@router.get("/catalogo")
def get_shop_catalog(
    campanha_id: UUID = Query(),
    user: AuthenticatedUser = Depends(get_current_user),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        campaign_access(connection, campanha_id, user.id)
        rows = _visible_catalog_rows(connection, campanha_id)
        hidden_rarities, _hidden_items, _hidden_locations = _shop_config(connection, campanha_id)
    now = datetime.now(timezone.utc)
    items = []
    for row in rows:
        base_price = resolve_catalog_price(row["conteudo"])
        if base_price is None:
            # Entrada publicada com preço inválido não pode aparecer como comprável.
            continue
        configurable_equipment = _is_configurable_equipment(row)
        shop_level = _catalog_shop_level(row, "comum" if configurable_equipment else None)
        content = row["conteudo"]
        price = base_price
        promotion_level = _catalog_shop_level(row)
        if configurable_equipment:
            variant_base_prices = {
                rarity: equipment_variant_price(content, row["tipo"], rarity)
                for rarity in EQUIPMENT_PURCHASE_RARITIES
                if rarity not in hidden_rarities
            }
            common_for_promotion = variant_base_prices.get("comum") or next(
                (resolved for resolved in variant_base_prices.values() if resolved is not None),
                None,
            )
            promotion = resolve_promotion(
                row["id"], row["tipo"], content, common_for_promotion, promotion_level, now=now,
            ) if common_for_promotion is not None else None
            variant_prices = {
                rarity: (
                    _discount_equipment_price(resolved, promotion[1].discount_percent)
                    if resolved is not None and promotion is not None
                    else resolved
                )
                for rarity, resolved in variant_base_prices.items()
            }
            first_visible_rarity = next(iter(variant_prices), None)
            if first_visible_rarity is None:
                continue
            shop_level = _catalog_shop_level(row, first_visible_rarity)
            common_price = variant_prices.get("comum") or variant_prices[first_visible_rarity]
            common_base_price = variant_base_prices.get("comum") or variant_base_prices[first_visible_rarity]
            if common_price is None or common_base_price is None:
                # Catálogo inválido ou moeda sem câmbio oficial: não anuncia
                # um preço que o checkout não conseguiria reproduzir.
                continue
            price = common_price
            content = {
                **content,
                "raridade_catalogo_original": content.get("raridade"),
                "raridade": "comum" if "comum" in variant_prices else first_visible_rarity,
                "precos_por_raridade": {
                    rarity: {resolved.moeda: resolved.valor}
                    for rarity, resolved in variant_prices.items()
                    if resolved is not None
                },
                "propriedades_por_raridade": {
                    rarity: overrides
                    for rarity in variant_prices
                    if (overrides := equipment_variant_overrides(content, row["tipo"], rarity)) is not None
                },
            }
            if promotion is not None:
                _promotional_price, promo = promotion
                content = {
                    **content,
                    "preco_original": {common_base_price.moeda: common_base_price.valor},
                    "precos_originais_por_raridade": {
                        rarity: {resolved.moeda: resolved.valor}
                        for rarity, resolved in variant_base_prices.items()
                        if resolved is not None
                    },
                    "promocao": {"ativa": True, "rotulo": promo.label, "desconto_percentual": promo.discount_percent},
                }
        else:
            promotion = resolve_promotion(row["id"], row["tipo"], content, base_price, promotion_level, now=now)
            if promotion is not None:
                price, promo = promotion
                content = {
                    **content,
                    "preco_original": {base_price.moeda: base_price.valor},
                    "promocao": {"ativa": True, "rotulo": promo.label, "desconto_percentual": promo.discount_percent},
                }
        items.append(
            {
                "id": row["id"],
                "titulo": row["titulo"],
                "tipo": row["tipo"],
                "conteudo": content,
                "preco": {"moeda": price.moeda, "valor": price.valor},
                "nivel_loja": shop_level,
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
        hidden_rarities, _hidden_items, hidden_locations = _shop_config(
            connection,
            payload.campanha_id,
            lock=True,
        )
        if location in hidden_locations and not access.manages_content:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="esta localizacao da loja nao esta liberada na campanha",
            )
        selected_rarities: dict[tuple[str, str | None, str, str], str | None] = {}
        for line in payload.itens:
            selected = _selected_equipment_rarity(catalog[line.item_id], line.raridade)
            selected_rarities[(line.item_id, line.alvo_item_id, line.modo, line.raridade or "")] = selected
            if selected is not None and selected in hidden_rarities:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"a raridade {selected} nao esta disponivel nesta campanha",
                )
            required_level = _catalog_shop_level(catalog[line.item_id], selected)
            if required_level > location:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"{catalog[line.item_id]['titulo']} nessa raridade exige uma localizacao de loja superior",
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
        selected_prices: dict[tuple[str, str | None, str, str], Any] = {}
        now = datetime.now(timezone.utc)
        for line in payload.itens:
            line_key = (line.item_id, line.alvo_item_id, line.modo, line.raridade or "")
            item = catalog[line.item_id]
            selected_rarity = selected_rarities[line_key]
            contratando = line.modo == "contratar"
            if contratando and item["tipo"] != "monstro":
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                    detail=f"{item['titulo']} nao pode ser contratado, apenas comprado",
                )
            price = resolve_catalog_price(item["conteudo"], field="preco_contratacao" if contratando else "preco")
            if price is None:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                    detail=f"{item['titulo']} possui preco invalido no catalogo",
                )
            if selected_rarity is not None:
                common_price = equipment_variant_price(item["conteudo"], item["tipo"], "comum")
                price = equipment_variant_price(item["conteudo"], item["tipo"], selected_rarity)
                if price is None or common_price is None:
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                        detail=f"{item['titulo']} nao possui conversao de preco para essa raridade",
                    )
                promotion = resolve_promotion(
                    item["id"], item["tipo"], item["conteudo"], common_price,
                    _catalog_shop_level(item, "comum"), now=now,
                )
                if promotion is not None:
                    price = _discount_equipment_price(price, promotion[1].discount_percent)
            # Mesmo cálculo da listagem para itens sem raridade configurável.
            # Contratação não entra em promoção.
            elif not contratando:
                promotion = resolve_promotion(
                    item["id"], item["tipo"], item["conteudo"], price, _catalog_shop_level(item), now=now,
                )
                if promotion is not None:
                    price, _promo = promotion
            selected_prices[line_key] = price
            _add_total(totals, price.moeda, price.valor * line.quantidade)
            purchased_items.append(
                {
                    "item_id": _equipment_inventory_item_id(item, selected_rarity),
                    "titulo": item["titulo"],
                    "quantidade": line.quantidade,
                    **({"raridade": selected_rarity} if selected_rarity is not None else {}),
                }
            )

        wallet = _locked_wallet(connection, payload.campanha_id, payload.personagem_id)
        
        target_ids = [line.alvo_item_id for line in payload.itens if getattr(line, "alvo_item_id", None)]
        purchase_inventory_ids = [
            _equipment_inventory_item_id(
                catalog[line.item_id],
                selected_rarities[(line.item_id, line.alvo_item_id, line.modo, line.raridade or "")],
            )
            for line in payload.itens
        ]
        if len(purchase_inventory_ids) != len(set(purchase_inventory_ids)):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="o lote contem a mesma variante de equipamento mais de uma vez",
            )
        all_inventory_ids = list(set(purchase_inventory_ids + target_ids))
        
        existing_inventory = _locked_inventory(
            connection,
            payload.campanha_id,
            payload.personagem_id,
            all_inventory_ids,
        )
        expected_catalog_by_inventory_id = {
            _equipment_inventory_item_id(
                catalog[line.item_id],
                selected_rarities[(line.item_id, line.alvo_item_id, line.modo, line.raridade or "")],
            ): line.item_id
            for line in payload.itens
        }
        for inventory_item_id, existing in existing_inventory.items():
            if inventory_item_id in target_ids:
                continue # Os alvos podem ter outras origens
            data = existing["dados"] if isinstance(existing["dados"], dict) else {}
            if (
                data.get("origem") != "loja"
                or data.get("catalogo_item_id") != expected_catalog_by_inventory_id.get(inventory_item_id)
            ):
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"o item_id {inventory_item_id} ja e usado por um item sem origem verificavel",
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
            line_key = (line.item_id, line.alvo_item_id, line.modo, line.raridade or "")
            selected_rarity = selected_rarities[line_key]
            inventory_item_id = _equipment_inventory_item_id(item, selected_rarity)
            selected_price = selected_prices[line_key]
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
                    if not isinstance(modificacoes, list):
                        modificacoes = []
                    limite_declarado = alvo_dados.get("limite_modificacoes")
                    limite_raridade = modification_limit_for_rarity(alvo_dados.get("raridade"))
                    try:
                        limite_modificacoes = min(int(limite_declarado), limite_raridade) if limite_declarado is not None else limite_raridade
                    except (TypeError, ValueError):
                        limite_modificacoes = limite_raridade
                    slots_modificacao = alvo_dados.get("slots_modificacao")
                    
                    if len(modificacoes) + line.quantidade > limite_modificacoes:
                        raise HTTPException(
                            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                            detail=(
                                f"o item alvo aceita {limite_modificacoes} modificacao(oes) "
                                f"pela raridade {alvo_dados.get('raridade') or 'comum'}"
                            ),
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

            existing = existing_inventory.get(inventory_item_id, {})
            existing_quantity = int(existing.get("quantidade", 0))
            new_quantity = existing_quantity + line.quantidade
            if new_quantity > 1_000_000:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                    detail=f"a quantidade de {item['titulo']} excede o limite do inventario",
                )
            existing_data = existing.get("dados") if isinstance(existing.get("dados"), dict) else {}
            editable_state = _editable_instance_metadata(existing_data)
            variant_content = (
                equipment_variant_content(item["conteudo"], item["tipo"], selected_rarity)
                if selected_rarity is not None
                else dict(item["conteudo"] or {})
            )
            if variant_content is None:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                    detail=f"{item['titulo']} nao possui propriedades para essa raridade",
                )
            item_data = {
                **editable_state,
                **variant_content,
                **({
                    "raridade": selected_rarity,
                    "preco": {selected_price.moeda: selected_price.valor},
                    "raridade_catalogo_original": item["conteudo"].get("raridade"),
                } if selected_rarity is not None else {}),
                "tipo": item["tipo"],
                "categoria": _inventory_category(item["tipo"]),
                "origem": "loja",
                "catalogo_item_id": item["id"],
                "loja_item_id": inventory_item_id,
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
                    inventory_item_id,
                    item["titulo"],
                    new_quantity,
                    Jsonb(item_data),
                ),
            )

            if item["tipo"] == "monstro":
                new_allies.extend(_build_mercenary_allies(item, line.quantidade, line.modo))
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
            versions = connection.execute(
                """
                UPDATE personagens
                SET economia_versao=economia_versao+1, versao=versao+1,
                    atualizado_em=CURRENT_TIMESTAMP, ficha=%s
                WHERE id=%s
                RETURNING economia_versao, versao
                """,
                (Jsonb(ficha_atualizada), payload.personagem_id),
            ).fetchone()
            version = versions["economia_versao"]
            sheet_version = versions["versao"]
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
    if new_allies or new_properties:
        live_session.publicar(
            payload.campanha_id,
            "personagem_atualizado",
            int(sheet_version),
            {"personagem_id": str(payload.personagem_id)},
        )
    return result


@router.post("/concessoes", status_code=status.HTTP_201_CREATED)
def grant_batch(
    payload: ShopGrantCommandInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    """Mestre entrega item do catálogo — item comum, criatura, propriedade —
    direto na ficha de qualquer personagem da campanha. Não cobra moeda, não
    olha nível de loja nem `requer_autorizacao_mestre`: quem está chamando
    isto já É a autorização. Espelha o corpo de `purchase_batch`, mas sem a
    metade da função dedicada a carteira, promoção e instalação de
    modificação em item/veículo, que não fazem sentido numa concessão."""

    with database.connection() as connection:
        require_campaign_manager(connection, payload.campanha_id, user.id)
        fingerprint = command_fingerprint(payload)
        replay = get_economy_command_replay(
            connection,
            campaign_id=payload.campanha_id,
            user_id=user.id,
            command_type="loja.concessao",
            idempotency_key=payload.idempotencia,
            fingerprint=fingerprint,
        )
        if replay is not None:
            return replay.replay_result
        character = _any_active_character(
            connection,
            payload.campanha_id,
            payload.personagem_id,
            lock=True,
        )
        command = begin_economy_command(
            connection,
            campaign_id=payload.campanha_id,
            user_id=user.id,
            command_type="loja.concessao",
            idempotency_key=payload.idempotencia,
            fingerprint=fingerprint,
        )
        if command.replay_result is not None:
            return command.replay_result

        requested_ids = [line.item_id for line in payload.itens]
        catalog = {
            row["id"]: row
            for row in _active_catalog_rows(
                connection, payload.campanha_id, requested_ids, lock=True,
            )
        }
        missing = next((item_id for item_id in requested_ids if item_id not in catalog), None)
        if missing:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"o item {missing} nao existe no catalogo",
            )

        existing_inventory = _locked_inventory(connection, payload.campanha_id, payload.personagem_id, requested_ids)
        for item_id, existing in existing_inventory.items():
            data = existing["dados"] if isinstance(existing["dados"], dict) else {}
            if data.get("origem") != "loja" or data.get("catalogo_item_id") != item_id:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"o item_id {item_id} ja e usado por um item sem origem verificavel",
                )

        granted_items = []
        new_allies: list[dict[str, Any]] = []
        new_properties: list[dict[str, Any]] = []
        for line in payload.itens:
            item = catalog[line.item_id]
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

            price = resolve_catalog_price(item["conteudo"])
            granted_items.append({
                "item_id": item["id"],
                "titulo": item["titulo"],
                "quantidade": line.quantidade,
                "valor_referencia": {"moeda": price.moeda, "valor": price.valor} if price else None,
            })

        if new_allies or new_properties:
            ficha_atual = character["ficha"] if isinstance(character["ficha"], dict) else {}
            aliados_atuais = ficha_atual.get("aliados") if isinstance(ficha_atual.get("aliados"), list) else []
            propriedades_atuais = ficha_atual.get("propriedades") if isinstance(ficha_atual.get("propriedades"), list) else []
            ficha_atualizada = {
                **ficha_atual,
                "aliados": [*aliados_atuais, *new_allies],
                "propriedades": [*propriedades_atuais, *new_properties],
            }
            versions = connection.execute(
                """
                UPDATE personagens
                SET economia_versao=economia_versao+1, versao=versao+1,
                    atualizado_em=CURRENT_TIMESTAMP, ficha=%s
                WHERE id=%s
                RETURNING economia_versao, versao
                """,
                (Jsonb(ficha_atualizada), payload.personagem_id),
            ).fetchone()
            version = versions["economia_versao"]
            sheet_version = versions["versao"]
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
            sheet_version = None

        result = {
            "operacao_id": str(command.id),
            "repetida": False,
            "economia_versao": int(version),
            "itens": granted_items,
        }
        record_audit(
            connection,
            action="loja.concessao",
            actor_user_id=user.id,
            campaign_id=payload.campanha_id,
            target_type="personagem",
            target_id=str(payload.personagem_id),
            details={"operacao_id": str(command.id), "itens": granted_items},
        )

        titulo = f"O Mestre concedeu itens a {character['nome']}"
        mensagem = f"**{character['nome']}** recebeu direto do Mestre:\n" + "\n".join(
            f"- {item['quantidade']}x {item['titulo']}" for item in granted_items
        )
        notify(
            connection,
            user_ids=_grant_notification_recipient_ids(
                connection, payload.campanha_id, payload.personagem_id,
            ),
            category="campanha",
            title=titulo,
            message=mensagem,
            campaign_id=payload.campanha_id,
            actor_user_id=user.id,
            include_actor=True,
        )

        complete_economy_command(connection, command.id, result)
    if sheet_version is not None:
        live_session.publicar(
            payload.campanha_id,
            "personagem_atualizado",
            int(sheet_version),
            {"personagem_id": str(payload.personagem_id)},
        )
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
            catalog_item_id = str(data.get("catalogo_item_id") or "").strip()
            stored_inventory_id = str(data.get("loja_item_id") or "").strip()
            if (
                data.get("origem") != "loja"
                or not catalog_item_id
                or (stored_inventory_id and stored_inventory_id != item_id)
                or (not stored_inventory_id and catalog_item_id != item_id)
            ):
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                    detail=f"o item {item_id} nao possui origem de loja verificavel",
                )

        requested_catalog_ids = list({
            str(item["dados"].get("catalogo_item_id"))
            for item in inventory.values()
        })
        catalog = {
            row["id"]: row
            for row in _active_catalog_rows(
                connection, payload.campanha_id, requested_catalog_ids, lock=True,
            )
        }
        missing_catalog = next((item_id for item_id in requested_catalog_ids if item_id not in catalog), None)
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
            catalog_item_id = str(stock_dados.get("catalogo_item_id"))
            catalog_item = catalog[catalog_item_id]
            price = resolve_catalog_price(catalog_item["conteudo"])
            if price is None:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                    detail=f"{catalog_item['titulo']} possui preco invalido no catalogo",
                )
            if _is_configurable_equipment(catalog_item):
                selected_rarity = normalize_equipment_rarity(stock_dados.get("raridade"))
                price = equipment_variant_price(
                    catalog_item["conteudo"], catalog_item["tipo"], selected_rarity,
                )
                if price is None:
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                        detail=f"{stock['titulo']} possui raridade ou preco de compra invalido",
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
