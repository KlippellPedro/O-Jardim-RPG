from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from psycopg.types.json import Jsonb

from core import live_session
from core.audit import record_audit
from core.character_summary import (
    _classes_da_ficha,
    _nome,
    bonus_escolhas_habilidade,
    iniciativa_fixa,
    validar_regras_ficha,
)
from core.database import Database
from core.economy_commands import MAX_ECONOMY_AMOUNT
from core.economy_models import (
    AdjustInventoryQuantityOperation,
    AdjustWalletBalanceOperation,
    CreateManualItemOperation,
    DiscardInventoryItemOperation,
    EconomyOperationsInput,
    EditInventoryItemOperation,
    ReorderInventoryOperation,
    is_manual_item_id,
)
from core.dependencies import (
    AuthenticatedUser,
    campaign_access,
    get_current_user,
    get_database,
    require_campaign_manager,
    require_csrf,
)
from schemas import (
    CharacterCreateInput,
    CharacterOwnerUpdateInput,
    CharacterUpdateInput,
    EdenFruitConsumeInput,
    EconomyReplaceInput,
)


router = APIRouter(prefix="/personagens", tags=["personagens"])
_CENTRAL_FIELDS = {"carteira", "inventario", "lunaris", "lunarisInicial", "inventarioInicial"}
_PROTECTED_INVENTORY_DATA_KEYS = {
    "catalogo_item_id",
    "custo",
    "loja_item_id",
    "moeda",
    "origem",
    "preco",
    "precos",
    "preço",
    "preços",
    "proveniencia",
    "proveniência",
    "recompensa_id",
    "tipo",
    "tipo_catalogo",
    "valor",
    "valor_compra",
    "valor_venda",
}


def _sheet_without_central_fields(sheet: dict) -> dict:
    """Evita duas fontes de verdade para economia e inventario."""
    return {key: value for key, value in sheet.items() if key not in _CENTRAL_FIELDS}


def _session_resources(sheet: dict) -> dict[str, int | None]:
    """Extrai apenas os recursos que a ficha e o HUD da sessao compartilham."""
    derivados = sheet.get("derivados") if isinstance(sheet.get("derivados"), dict) else {}
    status_ficha = sheet.get("status") if isinstance(sheet.get("status"), dict) else {}
    recursos = sheet.get("recursos") if isinstance(sheet.get("recursos"), dict) else {}

    def inteiro(value) -> int | None:
        return int(value) if isinstance(value, (int, float)) and not isinstance(value, bool) else None

    vida_maxima = inteiro(derivados.get("vida"))
    vida_atual = inteiro(status_ficha.get("vidaAtual"))
    if vida_atual is None:
        vida_atual = inteiro(recursos.get("vidaAtual"))
    mana_maxima = inteiro(derivados.get("mana"))
    mana_atual = inteiro(status_ficha.get("manaAtual"))
    if mana_atual is None:
        mana_atual = inteiro(recursos.get("manaAtual"))

    vida_maxima = None if vida_maxima is None else (
        vida_maxima
        + _eden_fruit_resource_bonus(sheet, "vidaMaxima")
        + bonus_escolhas_habilidade(sheet, "recurso", "vidaMaxima")
    )
    mana_maxima = None if mana_maxima is None else (
        mana_maxima
        + _eden_fruit_resource_bonus(sheet, "manaMaxima")
        + bonus_escolhas_habilidade(sheet, "recurso", "manaMaxima")
    )

    if vida_maxima is not None:
        vida_maxima = max(0, vida_maxima)
        if vida_atual is not None:
            vida_atual = min(vida_atual, vida_maxima)
    if mana_maxima is not None:
        mana_maxima = max(0, mana_maxima)
        if mana_atual is not None:
            mana_atual = max(0, min(mana_atual, mana_maxima))

    return {
        "vida_atual": vida_atual,
        "vida_maxima": vida_maxima,
        "mana_atual": mana_atual,
        "mana_maxima": mana_maxima,
    }


def _eden_fruit_effects(sheet: dict) -> list[dict]:
    fruit = sheet.get("frutoEdenConsumido") if isinstance(sheet, dict) else None
    content = fruit.get("conteudo") if isinstance(fruit, dict) else None
    raw = content.get("efeitosFicha") if isinstance(content, dict) else None
    if not isinstance(raw, list):
        return []
    return [effect for effect in raw if isinstance(effect, dict)]


def _eden_fruit_resource_bonus(sheet: dict, target: str) -> int:
    total = 0
    for effect in _eden_fruit_effects(sheet):
        if effect.get("categoria") != "recurso" or effect.get("alvo") != target:
            continue
        value = effect.get("valor")
        if isinstance(value, (int, float)) and not isinstance(value, bool):
            total += int(value)
    return max(-1000, min(1000, total))


def _is_protected_inventory_data_key(key: str) -> bool:
    normalized = str(key).strip().casefold()
    protected_prefixes = (
        "_",
        "catalogo_",
        "loja_",
        "preco_",
        "preço_",
        "proveniencia_",
        "proveniência_",
        "recompensa_",
    )
    return normalized.startswith(protected_prefixes) or normalized in _PROTECTED_INVENTORY_DATA_KEYS


# Unica chave de `dados` com evidencia concreta de edicao legitima por
# jogador comum em item de origem loja (ver test_economy_writers.py,
# test_owner_edits_and_consumes_but_cannot_forge_provenance). Deliberadamente
# curta: nao inventar campos "cosmeticos" hipoteticos sem evidencia no
# codigo atual — na duvida, o campo fica travado no valor atual.
# Estado operacional que o dono da ficha precisa controlar durante a sessão.
# Nenhuma destas chaves altera proveniência, preço, raridade, bônus máximos ou
# a mecânica-base comprada na Loja.
_LOJA_PLAYER_EDITABLE_KEYS = frozenset(
    {
        "combustivelAtual",
        "durabilidadeAtual",
        "equipado",
        "favorito",
        "localArmazenamento",
        "municaoAtual",
    }
)


def _editable_inventory_data(
    desired: dict, current: dict | None = None, *, restrict_mechanical: bool = False
) -> dict:
    """Aceita metadados de UI sem deixar o cliente reescrever proveniencia/preco.

    restrict_mechanical=True e usado quando um jogador comum (nao gestor) edita
    um item de origem loja: alem das chaves sempre protegidas, qualquer outra
    chave que nao esteja em `_LOJA_PLAYER_EDITABLE_KEYS` tambem fica travada no
    valor atual. A lista fixa de chaves protegidas nao cobre campos mecanicos
    do catalogo (raridade, modificacoes, efeitosRaridade, defesa, etc.), e a
    maioria dos campos de um item de loja descreve o que ele FAZ, nao metadados
    de UI — entao, sem uma allowlist explicita, o jogador poderia reescrever
    qualquer um deles sem passar pelas validacoes economicas da Loja.
    """
    current = current or {}

    def _locked(key: str) -> bool:
        if _is_protected_inventory_data_key(key):
            return True
        return restrict_mechanical and key not in _LOJA_PLAYER_EDITABLE_KEYS

    result = {key: value for key, value in desired.items() if not _locked(key)}
    for key, value in current.items():
        if _locked(key):
            result[key] = value
    return result


def _is_loja_origin_item(data: dict | None) -> bool:
    """True quando o item veio do fluxo pago da Loja (nunca a partir do que o
    cliente envia em `desired` — sempre a partir do registro atual no banco)."""
    data = data or {}
    return bool(data.get("catalogo_item_id")) or data.get("origem") == "loja"


def _is_manual_inventory_item(item: dict) -> bool:
    data = item.get("dados") or {}
    return is_manual_item_id(str(item.get("item_id") or "")) and data.get("origem") == "manual"


def _currency_key(value: str) -> str:
    return " ".join(value.strip().split()).casefold()


def _authorized_character(connection, character_id: UUID, user_id: UUID):
    row = connection.execute(
        """
        SELECT p.*, m.papel
        FROM personagens p
        JOIN membros_campanha m
          ON m.campanha_id=p.campanha_id AND m.usuario_id=%s
        WHERE p.id=%s AND p.status='ativo' AND m.status='ativo'
        """,
        (user_id, character_id),
    ).fetchone()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="personagem nao encontrado")
    if row["papel"] not in {"mestre", "assistente"} and row["dono_usuario_id"] != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="personagem nao encontrado")
    return row


def _sheet_links_complex_ally(sheet: dict | None, character_id: UUID) -> bool:
    allies = sheet.get("aliados") if isinstance(sheet, dict) else []
    if not isinstance(allies, list):
        return False
    target = str(character_id)
    return any(
        isinstance(ally, dict)
        and ally.get("categoria") == "complexo"
        and str(ally.get("personagemId") or "") == target
        for ally in allies
    )


def _readable_character(connection, character_id: UUID, user_id: UUID):
    """Autoriza a ficha completa para dono/gestor ou como vínculo somente leitura."""
    row = connection.execute(
        """
        SELECT p.*, m.papel
        FROM personagens p
        JOIN membros_campanha m
          ON m.campanha_id=p.campanha_id AND m.usuario_id=%s
        WHERE p.id=%s AND p.status='ativo' AND m.status='ativo'
        """,
        (user_id, character_id),
    ).fetchone()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="personagem nao encontrado")
    if row["papel"] in {"mestre", "assistente"} or row["dono_usuario_id"] == user_id:
        return row, False

    owned_sheets = connection.execute(
        """
        SELECT ficha
        FROM personagens
        WHERE campanha_id=%s AND dono_usuario_id=%s AND status='ativo'
        """,
        (row["campanha_id"], user_id),
    ).fetchall()
    if any(_sheet_links_complex_ally(source["ficha"], character_id) for source in owned_sheets):
        return row, True
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="personagem nao encontrado")


_COMPLEX_ALLY_PLAYER_FIELDS = {"favorito", "emCena", "ordem"}


def _complex_allies_for_permission(sheet: dict | None) -> dict[str, dict] | None:
    """Normaliza vínculos complexos para comparar uma edição de jogador.

    Favorito, ordem e presença em cena são preferências do dono da ficha. O
    vínculo, a ficha escolhida e os demais dados continuam sob controle de
    Mestre/assistente.
    """
    allies = sheet.get("aliados") if isinstance(sheet, dict) else []
    if not isinstance(allies, list):
        return {}
    result: dict[str, dict] = {}
    for ally in allies:
        if not isinstance(ally, dict) or ally.get("categoria") != "complexo":
            continue
        ally_id = str(ally.get("id") or "").strip()
        if not ally_id or ally_id in result:
            return None
        result[ally_id] = {
            key: value
            for key, value in ally.items()
            if key not in _COMPLEX_ALLY_PLAYER_FIELDS
        }
    return result


def _player_complex_allies_error(current_sheet: dict | None, next_sheet: dict | None) -> str | None:
    current = _complex_allies_for_permission(current_sheet)
    desired = _complex_allies_for_permission(next_sheet)
    if current is None or desired is None:
        return "vinculo complexo possui identificador ausente ou repetido"
    if current != desired:
        return "somente Mestre ou assistente pode criar, remover ou trocar um vinculo complexo"
    return None


def _complex_ally_summary(row: dict) -> dict:
    """Publica somente os números necessários ao cartão de Aliados.

    O jogador recebe o resumo porque o Mestre ligou esta ficha à dele, mas não
    recebe inventário, notas, poderes ou o restante da ficha privada.
    """
    sheet = row.get("ficha") if isinstance(row.get("ficha"), dict) else {}
    derived = sheet.get("derivados") if isinstance(sheet.get("derivados"), dict) else {}
    resources = _session_resources(sheet)

    def number(value, default=0):
        if isinstance(value, (int, float)) and not isinstance(value, bool):
            return value
        return default

    maximum_life = max(1, int(number(resources.get("vida_maxima"), 1)))
    current_life = int(number(resources.get("vida_atual"), maximum_life))
    maximum_mana = max(0, int(number(resources.get("mana_maxima"), 0)))
    current_mana = max(0, min(maximum_mana, int(number(resources.get("mana_atual"), maximum_mana))))
    return {
        "personagem_id": str(row["id"]),
        "nome": row.get("nome") or "Aliado Desconhecido",
        "foto": sheet.get("foto"),
        "vida_atual": current_life,
        "vida_maxima": maximum_life,
        "mana_atual": current_mana,
        "mana_maxima": maximum_mana,
        "defesa": int(number(derived.get("defesaNatural"), 0))
        + bonus_escolhas_habilidade(sheet, "combate", "defesa"),
        "movimento": number(derived.get("movimento"), 9),
        "iniciativa": iniciativa_fixa(sheet),
        "nivel": max(1, int(number(sheet.get("nivel"), 1))),
    }


@router.post("", status_code=status.HTTP_201_CREATED)
def create_character(
    payload: CharacterCreateInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    character_id = uuid4()
    with database.connection() as connection:
        access = campaign_access(connection, payload.campanha_id, user.id)
        if access.role == "observador":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="observadores nao criam personagens")
        owner_id = payload.dono_usuario_id or user.id
        if owner_id != user.id and not access.manages_content:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="jogador so pode criar o proprio personagem")
        if not access.manages_content:
            # A Árvore orienta as regras do RPG, mas não bloqueia a liberdade do
            # jogador na ficha. Configurações fora das regras seguem permitidas
            # e geram um aviso aos gestores da campanha para avaliação.
            campanha_row = connection.execute(
                "SELECT configuracoes FROM campanhas WHERE id=%s", (payload.campanha_id,)
            ).fetchone()
            erro_catalogo = validar_regras_ficha(
                payload.ficha,
                campanha_row["configuracoes"] if campanha_row else None,
                criacao=True,
                usuario_id=owner_id,
            )
            if erro_catalogo:
                from core import notifications
                managers = notifications.campaign_member_ids(
                    connection, payload.campanha_id, roles=("mestre", "assistente")
                )
                notifications.notify(
                    connection,
                    user_ids=managers,
                    category="campanha",
                    title="Alerta de Regras na Criação",
                    message=f"O jogador {user.nome_exibicao} criou a ficha '{payload.nome}' fora das regras: {erro_catalogo}.",
                    campaign_id=payload.campanha_id,
                    actor_user_id=user.id,
                    details={"personagem_id": str(character_id)},
                )
        owner = connection.execute(
            """
            SELECT 1 FROM membros_campanha
            WHERE campanha_id=%s AND usuario_id=%s AND status='ativo'
            """,
            (payload.campanha_id, owner_id),
        ).fetchone()
        if not owner:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="o dono deve ser membro da campanha")
        connection.execute(
            """
            INSERT INTO personagens
                (id, campanha_id, dono_usuario_id, nome, ficha, criado_por)
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (
                character_id,
                payload.campanha_id,
                owner_id,
                payload.nome,
                Jsonb(_sheet_without_central_fields(payload.ficha)),
                user.id,
            ),
        )
        connection.execute(
            """
            INSERT INTO saldos_personagem (campanha_id, personagem_id, moeda, saldo)
            VALUES (%s, %s, 'Lunaris', 20)
            """,
            (payload.campanha_id, character_id),
        )
        connection.execute(
            """
            INSERT INTO lancamentos_economia
                (id, campanha_id, personagem_id, moeda, delta, saldo_apos,
                 motivo, origem, ator_usuario_id)
            VALUES (%s, %s, %s, 'Lunaris', 20, 20, %s, %s, %s)
            """,
            (
                uuid4(),
                payload.campanha_id,
                character_id,
                "beneficio inicial da criacao",
                "criacao-personagem",
                user.id,
            ),
        )
        inventario_inicial = payload.ficha.get("inventarioInicial")
        item_inicial = inventario_inicial[0] if isinstance(inventario_inicial, list) and inventario_inicial else None
        titulo_inicial = (
            " ".join(str(item_inicial.get("titulo") or "").split())[:200]
            if isinstance(item_inicial, dict)
            else ""
        )
        item_inicial_id = f"manual:{uuid4()}" if titulo_inicial else None
        if item_inicial_id:
            dados_iniciais = {"origem": "criacao", "raridade": "comum", "equipado": False}
            connection.execute(
                """
                INSERT INTO inventario_personagem
                    (campanha_id, personagem_id, item_id, titulo, quantidade, dados)
                VALUES (%s, %s, %s, %s, 1, %s)
                """,
                (
                    payload.campanha_id,
                    character_id,
                    item_inicial_id,
                    titulo_inicial,
                    Jsonb(dados_iniciais),
                ),
            )
            connection.execute(
                """
                INSERT INTO lancamentos_economia
                    (id, campanha_id, personagem_id, item_id, delta,
                     motivo, origem, ator_usuario_id)
                VALUES (%s, %s, %s, %s, 1, %s, %s, %s)
                """,
                (
                    uuid4(),
                    payload.campanha_id,
                    character_id,
                    item_inicial_id,
                    "item comum inicial da criacao",
                    "criacao-personagem",
                    user.id,
                ),
            )
        record_audit(
            connection,
            action="personagem.criado",
            actor_user_id=user.id,
            campaign_id=payload.campanha_id,
            target_type="personagem",
            target_id=str(character_id),
            details={"dono_usuario_id": str(owner_id), "nome": payload.nome},
        )
    return {
        "id": character_id,
        "campanha_id": payload.campanha_id,
        "dono_usuario_id": owner_id,
        "nome": payload.nome,
        "ficha": _sheet_without_central_fields(payload.ficha),
        "versao": 1,
        "economia_versao": 1,
        "carteira": [{"moeda": "Lunaris", "saldo": 20}],
        "inventario_central": ([{
            "item_id": item_inicial_id,
            "titulo": titulo_inicial,
            "quantidade": 1,
            "dados": {"origem": "criacao", "raridade": "comum", "equipado": False},
        }] if item_inicial_id else []),
        "status": "ativo",
    }


@router.get("")
def list_characters(
    campanha_id: UUID,
    completo: bool = False,
    user: AuthenticatedUser = Depends(get_current_user),
    database: Database = Depends(get_database),
):
    """`completo=true` já traz carteira e inventário de cada personagem.

    Sem isso o módulo Ficha listava e depois pedia cada personagem
    individualmente — sete idas ao servidor para seis fichas.
    """
    with database.connection() as connection:
        access = campaign_access(connection, campanha_id, user.id)
        if access.manages_content:
            rows = connection.execute(
                """
                SELECT p.id, p.campanha_id, p.dono_usuario_id, p.criado_por, p.nome,
                       p.ficha, p.versao, p.economia_versao, p.status, p.atualizado_em,
                       u.nome_exibicao AS dono_nome,
                       c.nome_exibicao AS criado_por_nome
                FROM personagens p
                LEFT JOIN usuarios u ON u.id=p.dono_usuario_id
                LEFT JOIN usuarios c ON c.id=p.criado_por
                WHERE p.campanha_id=%s AND p.status='ativo'
                ORDER BY p.nome
                """,
                (campanha_id,),
            ).fetchall()
        else:
            rows = connection.execute(
                """
                SELECT p.id, p.campanha_id, p.dono_usuario_id, p.criado_por, p.nome,
                       p.ficha, p.versao, p.economia_versao, p.status, p.atualizado_em,
                       u.nome_exibicao AS dono_nome,
                       c.nome_exibicao AS criado_por_nome
                FROM personagens p
                LEFT JOIN usuarios u ON u.id=p.dono_usuario_id
                LEFT JOIN usuarios c ON c.id=p.criado_por
                WHERE p.campanha_id=%s AND p.dono_usuario_id=%s
                  AND p.status='ativo'
                ORDER BY p.nome
                """,
                (campanha_id, user.id),
            ).fetchall()

        personagens = [dict(row) for row in rows]
        if completo and personagens:
            ids = [item["id"] for item in personagens]
            carteiras: dict[UUID, list] = {}
            for saldo in connection.execute(
                """
                SELECT personagem_id, moeda, saldo FROM saldos_personagem
                WHERE campanha_id=%s AND personagem_id = ANY(%s)
                ORDER BY moeda
                """,
                (campanha_id, ids),
            ).fetchall():
                carteiras.setdefault(saldo["personagem_id"], []).append(
                    {"moeda": saldo["moeda"], "saldo": saldo["saldo"]}
                )
            inventarios: dict[UUID, list] = {}
            for item in connection.execute(
                """
                SELECT personagem_id, item_id, titulo, quantidade, dados, atualizado_em
                FROM inventario_personagem
                WHERE campanha_id=%s AND personagem_id = ANY(%s)
                ORDER BY titulo
                """,
                (campanha_id, ids),
            ).fetchall():
                registro = dict(item)
                inventarios.setdefault(registro.pop("personagem_id"), []).append(registro)
            for personagem in personagens:
                personagem["carteira"] = carteiras.get(personagem["id"], [])
                personagem["inventario_central"] = inventarios.get(personagem["id"], [])

    return {"personagens": personagens}


@router.get("/{character_id}/aliados-complexos")
def list_complex_allies(
    character_id: UUID,
    user: AuthenticatedUser = Depends(get_current_user),
    database: Database = Depends(get_database),
):
    """Lê os status das fichas que o Mestre vinculou como aliados.

    A autorização é feita pela ficha que guarda os vínculos. O retorno é um
    resumo mecânico, nunca a ficha completa da outra pessoa.
    """
    with database.connection() as connection:
        owner = _authorized_character(connection, character_id, user.id)
        sheet = owner["ficha"] if isinstance(owner.get("ficha"), dict) else {}
        raw_allies = sheet.get("aliados") if isinstance(sheet.get("aliados"), list) else []
        linked_ids: list[UUID] = []
        seen: set[UUID] = set()
        for ally in raw_allies:
            if not isinstance(ally, dict) or ally.get("categoria") != "complexo":
                continue
            try:
                linked_id = UUID(str(ally.get("personagemId") or ""))
            except (TypeError, ValueError, AttributeError):
                continue
            if linked_id not in seen:
                linked_ids.append(linked_id)
                seen.add(linked_id)

        if not linked_ids:
            return {"aliados": []}

        rows = connection.execute(
            """
            SELECT id, nome, ficha
            FROM personagens
            WHERE campanha_id=%s AND status='ativo' AND id = ANY(%s)
            """,
            (owner["campanha_id"], linked_ids),
        ).fetchall()
        by_id = {row["id"]: dict(row) for row in rows}
        summaries = [
            _complex_ally_summary(by_id[linked_id])
            for linked_id in linked_ids
            if linked_id in by_id
        ]
    return {"aliados": summaries}


@router.get("/{character_id}")
def get_character(
    character_id: UUID,
    user: AuthenticatedUser = Depends(get_current_user),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        row, read_only = _readable_character(connection, character_id, user.id)
        balances = connection.execute(
            """
            SELECT moeda, saldo FROM saldos_personagem
            WHERE campanha_id=%s AND personagem_id=%s ORDER BY moeda
            """,
            (row["campanha_id"], character_id),
        ).fetchall()
        inventory = connection.execute(
            """
            SELECT item_id, titulo, quantidade, dados, atualizado_em
            FROM inventario_personagem
            WHERE campanha_id=%s AND personagem_id=%s ORDER BY titulo
            """,
            (row["campanha_id"], character_id),
        ).fetchall()
    result = dict(row)
    result.pop("papel", None)
    result["somente_leitura"] = read_only
    result["carteira"] = [dict(item) for item in balances]
    result["inventario_central"] = [dict(item) for item in inventory]
    return {"personagem": result}


@router.put("/{character_id}")
def update_character(
    character_id: UUID,
    payload: CharacterUpdateInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        current = _authorized_character(connection, character_id, user.id)
        name = payload.nome or current["nome"]
        if current["papel"] not in {"mestre", "assistente"}:
            complex_error = _player_complex_allies_error(current["ficha"], payload.ficha)
            if complex_error:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=complex_error)
            campanha_row = connection.execute(
                "SELECT configuracoes FROM campanhas WHERE id=%s", (current["campanha_id"],)
            ).fetchone()
            erro_regras = validar_regras_ficha(
                payload.ficha,
                campanha_row["configuracoes"] if campanha_row else None,
                ficha_anterior=current["ficha"],
                usuario_id=current["dono_usuario_id"],
            )
            if erro_regras:
                erro_anterior = validar_regras_ficha(
                    current["ficha"],
                    campanha_row["configuracoes"] if campanha_row else None,
                    ficha_anterior=current["ficha"],
                    usuario_id=current["dono_usuario_id"],
                )
                if erro_regras != erro_anterior:
                    from core import notifications
                    managers = notifications.campaign_member_ids(
                        connection, current["campanha_id"], roles=("mestre", "assistente")
                    )
                    notifications.notify(
                        connection,
                        user_ids=managers,
                        category="campanha",
                        title="Alerta de Regras na Ficha",
                        message=f"A ficha '{name}' salvou uma alteração fora das regras: {erro_regras}.",
                        campaign_id=current["campanha_id"],
                        actor_user_id=user.id,
                        details={"personagem_id": str(character_id)},
                    )

            # O jogador controla classe/nível/XP da própria ficha (decisão de
            # design 2026-08), mas o mestre/assistente precisa ficar sabendo
            # quando isso muda - aqui é aviso, não bloqueio.
            classes_antes = _classes_da_ficha(current["ficha"])
            classes_depois = _classes_da_ficha(payload.ficha)
            xp_antes = current["ficha"].get("xp") or 0
            xp_depois = payload.ficha.get("xp") or 0
            if classes_antes != classes_depois or xp_antes != xp_depois:
                from core import notifications

                def _resumo_classes(lista):
                    partes = [
                        f"{_nome('classe', item.get('classeId') or item.get('id')) or item.get('classeId')} {item.get('nivel')}"
                        for item in lista
                    ]
                    return ", ".join(partes) if partes else "nenhuma"

                mudancas = []
                if classes_antes != classes_depois:
                    mudancas.append(
                        f"classes de [{_resumo_classes(classes_antes)}] para [{_resumo_classes(classes_depois)}]"
                    )
                if xp_antes != xp_depois:
                    mudancas.append(f"XP de {xp_antes} para {xp_depois}")
                managers = notifications.campaign_member_ids(
                    connection, current["campanha_id"], roles=("mestre", "assistente")
                )
                notifications.notify(
                    connection,
                    user_ids=managers,
                    category="campanha",
                    title="Jogador alterou classe/XP na ficha",
                    message=f"A ficha '{name}' teve " + " e ".join(mudancas) + ".",
                    campaign_id=current["campanha_id"],
                    actor_user_id=user.id,
                    details={"personagem_id": str(character_id)},
                )
        row = connection.execute(
            """
            UPDATE personagens
            SET nome=%s, ficha=%s, versao=versao+1,
                atualizado_em=CURRENT_TIMESTAMP
            WHERE id=%s AND versao=%s AND status='ativo'
            RETURNING id, campanha_id, dono_usuario_id, nome, ficha,
                      versao, status, atualizado_em
            """,
            (
                name,
                Jsonb(_sheet_without_central_fields(payload.ficha)),
                character_id,
                payload.versao_esperada,
            ),
        ).fetchone()
        if not row:
            actual = connection.execute(
                "SELECT versao FROM personagens WHERE id=%s",
                (character_id,),
            ).fetchone()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "mensagem": "a ficha foi alterada em outro lugar; recarregue antes de salvar",
                    "versao_atual": actual["versao"] if actual else None,
                },
            )
        record_audit(
            connection,
            action="personagem.atualizado",
            actor_user_id=user.id,
            campaign_id=current["campanha_id"],
            target_type="personagem",
            target_id=str(character_id),
            details={"versao": row["versao"]},
        )
        active_session = connection.execute(
            """
            SELECT id FROM sessoes_mesa
            WHERE campanha_id=%s AND status IN ('preparacao', 'aberta')
            """,
            (current["campanha_id"],),
        ).fetchone()
        if active_session:
            resources = _session_resources(row["ficha"])
            participant = connection.execute(
                """
                UPDATE sessao_participantes
                SET nome=%s,
                    vida_atual=COALESCE(%s, vida_atual),
                    vida_maxima=COALESCE(%s, vida_maxima),
                    mana_atual=COALESCE(%s, mana_atual),
                    mana_maxima=COALESCE(%s, mana_maxima),
                    atualizado_em=CURRENT_TIMESTAMP
                WHERE sessao_id=%s AND personagem_id=%s
                RETURNING id
                """,
                (
                    name,
                    resources["vida_atual"],
                    resources["vida_maxima"],
                    resources["mana_atual"],
                    resources["mana_maxima"],
                    active_session["id"],
                    character_id,
                ),
            ).fetchone()
            if participant:
                connection.execute(
                    """
                    UPDATE sessoes_mesa
                    SET versao=versao+1, atualizado_em=CURRENT_TIMESTAMP
                    WHERE id=%s
                    """,
                    (active_session["id"],),
                )
    # O evento também mantém os cartões de aliados complexos atualizados fora
    # de uma sessão aberta. Ele carrega apenas o id; cada cliente refaz o GET e
    # recebe somente o resumo que tem autorização para ver.
    live_session.publicar(
        current["campanha_id"],
        "personagem_atualizado",
        int(row["versao"]),
        {"personagem_id": str(character_id)},
    )
    return {"personagem": dict(row)}


@router.put("/{character_id}/dono")
def transfer_character_owner(
    character_id: UUID,
    payload: CharacterOwnerUpdateInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    """Reatribui o jogador dono de um personagem (mestre/assistente).

    Cobre o fluxo de criar a ficha pelo painel do mestre e so depois associar
    a um jogador real da mesa - hoje o dono so era definido na criacao.
    """
    with database.connection() as connection:
        character = connection.execute(
            "SELECT id, campanha_id, dono_usuario_id, nome FROM personagens WHERE id=%s AND status='ativo'",
            (character_id,),
        ).fetchone()
        if not character:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="personagem nao encontrado")

        require_campaign_manager(connection, character["campanha_id"], user.id)

        novo_dono = connection.execute(
            """
            SELECT u.id, u.nome_exibicao
            FROM membros_campanha m
            JOIN usuarios u ON u.id=m.usuario_id
            WHERE m.campanha_id=%s AND m.usuario_id=%s AND m.status='ativo'
            """,
            (character["campanha_id"], payload.novo_dono_usuario_id),
        ).fetchone()
        if not novo_dono:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="o novo dono deve ser membro ativo da campanha",
            )

        dono_anterior = character["dono_usuario_id"]
        connection.execute(
            "UPDATE personagens SET dono_usuario_id=%s, atualizado_em=CURRENT_TIMESTAMP WHERE id=%s",
            (novo_dono["id"], character_id),
        )
        record_audit(
            connection,
            action="personagem.dono_transferido",
            actor_user_id=user.id,
            campaign_id=character["campanha_id"],
            target_type="personagem",
            target_id=str(character_id),
            details={
                "dono_anterior": str(dono_anterior) if dono_anterior else None,
                "dono_novo": str(novo_dono["id"]),
                "nome": character["nome"],
            },
        )
        if novo_dono["id"] != user.id and novo_dono["id"] != dono_anterior:
            from core import notifications

            notifications.notify(
                connection,
                user_ids=[novo_dono["id"]],
                category="campanha",
                title="Personagem atribuido a voce",
                message=f"O personagem '{character['nome']}' agora e seu.",
                campaign_id=character["campanha_id"],
                actor_user_id=user.id,
                details={"personagem_id": str(character_id)},
            )
    return {
        "personagem_id": character_id,
        "dono_usuario_id": novo_dono["id"],
        "dono_nome": novo_dono["nome_exibicao"],
    }


@router.post("/{character_id}/economia/operacoes")
def apply_character_economy_operations(
    character_id: UUID,
    payload: EconomyOperationsInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    """Aplica um lote economico validado e incrementa a versao uma unica vez.

    Jogadores administram metadados, ordem, consumo e o saldo da propria
    carteira; cada ajuste vira lancamento com origem "site-ficha" para o mestre
    auditar depois. Itens recebidos da loja ou de recompensas continuam sem
    poder ser aumentados por um jogador comum.
    """
    with database.connection() as connection:
        current = _authorized_character(connection, character_id, user.id)
        is_manager = current["papel"] in {"mestre", "assistente"}

        locked = connection.execute(
            """
            SELECT economia_versao FROM personagens
            WHERE id=%s AND status='ativo' FOR UPDATE
            """,
            (character_id,),
        ).fetchone()
        actual_version = int(locked["economia_versao"]) if locked else None
        if actual_version != payload.versao_esperada:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "mensagem": "a economia mudou; recarregue antes de aplicar as operacoes",
                    "versao_atual": actual_version,
                },
            )

        inventory_rows = connection.execute(
            """
            SELECT item_id, titulo, quantidade, dados
            FROM inventario_personagem
            WHERE campanha_id=%s AND personagem_id=%s
            """,
            (current["campanha_id"], character_id),
        ).fetchall()
        inventory = {row["item_id"]: dict(row) for row in inventory_rows}
        initial_item_ids = set(inventory)

        balance_rows = connection.execute(
            """
            SELECT moeda, saldo FROM saldos_personagem
            WHERE campanha_id=%s AND personagem_id=%s
            """,
            (current["campanha_id"], character_id),
        ).fetchall()
        balances: dict[str, dict] = {}
        for balance in balance_rows:
            key = _currency_key(balance["moeda"])
            if key in balances:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="a carteira possui moedas duplicadas por capitalizacao; normalize-a como gestor",
                )
            balances[key] = dict(balance)

        changed_items: dict[str, dict] = {}
        deleted_item_ids: set[str] = set()
        ledger_entries: list[dict] = []

        for operation in payload.operacoes:
            if isinstance(operation, CreateManualItemOperation):
                if operation.item_id in initial_item_ids or operation.item_id in inventory:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail=f"item {operation.item_id} ja existe",
                    )
                catalog_item = connection.execute(
                    "SELECT 1 FROM catalogo_itens WHERE id=%s",
                    (operation.item_id,),
                ).fetchone()
                if catalog_item:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail="item manual nao pode reutilizar um id do catalogo",
                    )
                data = _editable_inventory_data(operation.dados)
                data["origem"] = "manual"
                item = {
                    "item_id": operation.item_id,
                    "titulo": operation.titulo,
                    "quantidade": operation.quantidade,
                    "dados": data,
                }
                inventory[operation.item_id] = item
                changed_items[operation.item_id] = item
                deleted_item_ids.discard(operation.item_id)
                ledger_entries.append(
                    {
                        "item_id": operation.item_id,
                        "delta": operation.quantidade,
                        "motivo": "item manual criado na ficha",
                    }
                )
                continue

            if isinstance(operation, EditInventoryItemOperation):
                item = inventory.get(operation.item_id)
                if not item:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail=f"item {operation.item_id} nao existe mais",
                    )
                current_data = item.get("dados") if isinstance(item.get("dados"), dict) else {}
                updated = {
                    **item,
                    "titulo": operation.titulo or item["titulo"],
                    "dados": (
                        _editable_inventory_data(
                            operation.dados,
                            current_data,
                            restrict_mechanical=(
                                not is_manager and _is_loja_origin_item(current_data)
                            ),
                        )
                        if operation.dados is not None
                        else current_data
                    ),
                }
                inventory[operation.item_id] = updated
                changed_items[operation.item_id] = updated
                continue

            if isinstance(operation, AdjustInventoryQuantityOperation):
                item = inventory.get(operation.item_id)
                if not item:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail=f"item {operation.item_id} nao existe mais",
                    )
                if operation.delta > 0 and not is_manager and not _is_manual_inventory_item(item):
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="jogador nao pode aumentar item recebido da loja ou de recompensa",
                    )
                new_quantity = int(item["quantidade"]) + operation.delta
                if new_quantity < 0:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail=f"quantidade insuficiente de {item['titulo']}",
                    )
                if new_quantity > 1_000_000:
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                        detail=f"a quantidade de {item['titulo']} excede o limite do inventario",
                    )
                if new_quantity == 0:
                    inventory.pop(operation.item_id)
                    changed_items.pop(operation.item_id, None)
                    deleted_item_ids.add(operation.item_id)
                else:
                    updated = {**item, "quantidade": new_quantity}
                    inventory[operation.item_id] = updated
                    changed_items[operation.item_id] = updated
                ledger_entries.append(
                    {
                        "item_id": operation.item_id,
                        "delta": operation.delta,
                        "motivo": "quantidade ajustada pela ficha",
                    }
                )
                continue

            if isinstance(operation, DiscardInventoryItemOperation):
                item = inventory.pop(operation.item_id, None)
                if not item:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail=f"item {operation.item_id} nao existe mais",
                    )
                changed_items.pop(operation.item_id, None)
                deleted_item_ids.add(operation.item_id)
                ledger_entries.append(
                    {
                        "item_id": operation.item_id,
                        "delta": -int(item["quantidade"]),
                        "motivo": "item descartado pela ficha",
                    }
                )
                continue

            if isinstance(operation, ReorderInventoryOperation):
                if set(operation.item_ids) != set(inventory):
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail="reordenar deve listar exatamente os itens atuais",
                    )
                for order, item_id in enumerate(operation.item_ids):
                    item = inventory[item_id]
                    current_data = item.get("dados") if isinstance(item.get("dados"), dict) else {}
                    updated = {**item, "dados": {**current_data, "ordem": order}}
                    inventory[item_id] = updated
                    changed_items[item_id] = updated
                continue

            if isinstance(operation, AdjustWalletBalanceOperation):
                key = _currency_key(operation.moeda)
                balance = balances.get(key)
                current_balance = int(balance["saldo"]) if balance else 0
                new_balance = current_balance + operation.delta
                if new_balance < 0:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail=f"saldo insuficiente de {operation.moeda}",
                    )
                if new_balance > MAX_ECONOMY_AMOUNT:
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                        detail=f"o saldo em {operation.moeda} excederia o limite economico",
                    )
                currency_name = balance["moeda"] if balance else operation.moeda
                if new_balance == 0:
                    if balance:
                        connection.execute(
                            """
                            DELETE FROM saldos_personagem
                            WHERE campanha_id=%s AND personagem_id=%s AND moeda=%s
                            """,
                            (current["campanha_id"], character_id, currency_name),
                        )
                    balances.pop(key, None)
                elif balance:
                    connection.execute(
                        """
                        UPDATE saldos_personagem
                        SET saldo=%s, atualizado_em=CURRENT_TIMESTAMP
                        WHERE campanha_id=%s AND personagem_id=%s AND moeda=%s
                        """,
                        (
                            new_balance,
                            current["campanha_id"],
                            character_id,
                            currency_name,
                        ),
                    )
                    balances[key] = {"moeda": currency_name, "saldo": new_balance}
                else:
                    connection.execute(
                        """
                        INSERT INTO saldos_personagem
                            (campanha_id, personagem_id, moeda, saldo)
                        VALUES (%s, %s, %s, %s)
                        """,
                        (
                            current["campanha_id"],
                            character_id,
                            currency_name,
                            new_balance,
                        ),
                    )
                    balances[key] = {"moeda": currency_name, "saldo": new_balance}
                ledger_entries.append(
                    {
                        "moeda": currency_name,
                        "delta": operation.delta,
                        "saldo_apos": new_balance,
                        "motivo": operation.motivo,
                    }
                )

        for item_id in deleted_item_ids:
            connection.execute(
                """
                DELETE FROM inventario_personagem
                WHERE campanha_id=%s AND personagem_id=%s AND item_id=%s
                """,
                (current["campanha_id"], character_id, item_id),
            )
        for item in changed_items.values():
            connection.execute(
                """
                INSERT INTO inventario_personagem
                    (campanha_id, personagem_id, item_id, titulo, quantidade, dados)
                VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT (campanha_id, personagem_id, item_id)
                DO UPDATE SET titulo=EXCLUDED.titulo,
                              quantidade=EXCLUDED.quantidade,
                              dados=EXCLUDED.dados,
                              atualizado_em=CURRENT_TIMESTAMP
                """,
                (
                    current["campanha_id"],
                    character_id,
                    item["item_id"],
                    item["titulo"],
                    item["quantidade"],
                    Jsonb(item["dados"]),
                ),
            )

        ledger_origin = "site-manager" if is_manager else "site-ficha"
        for entry in ledger_entries:
            connection.execute(
                """
                INSERT INTO lancamentos_economia
                    (id, campanha_id, personagem_id, moeda, item_id, delta,
                     saldo_apos, motivo, origem, ator_usuario_id)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    uuid4(),
                    current["campanha_id"],
                    character_id,
                    entry.get("moeda"),
                    entry.get("item_id"),
                    entry["delta"],
                    entry.get("saldo_apos"),
                    entry["motivo"],
                    ledger_origin,
                    user.id,
                ),
            )

        version_row = connection.execute(
            """
            UPDATE personagens
            SET economia_versao=economia_versao+1,
                atualizado_em=CURRENT_TIMESTAMP
            WHERE id=%s AND status='ativo'
            RETURNING economia_versao
            """,
            (character_id,),
        ).fetchone()
        if not version_row:
            raise RuntimeError("personagem bloqueado deixou de estar ativo durante a transacao")

        authoritative_balances = connection.execute(
            """
            SELECT moeda, saldo FROM saldos_personagem
            WHERE campanha_id=%s AND personagem_id=%s ORDER BY moeda
            """,
            (current["campanha_id"], character_id),
        ).fetchall()
        authoritative_inventory = connection.execute(
            """
            SELECT item_id, titulo, quantidade, dados, atualizado_em
            FROM inventario_personagem
            WHERE campanha_id=%s AND personagem_id=%s ORDER BY titulo, item_id
            """,
            (current["campanha_id"], character_id),
        ).fetchall()
        economy_version = int(version_row["economia_versao"])
        record_audit(
            connection,
            action="personagem.economia_operacoes_aplicadas",
            actor_user_id=user.id,
            campaign_id=current["campanha_id"],
            target_type="personagem",
            target_id=str(character_id),
            details={
                "operacoes": len(payload.operacoes),
                "lancamentos": len(ledger_entries),
                "economia_versao": economy_version,
            },
        )

    return {
        "economia_versao": economy_version,
        "carteira": [dict(row) for row in authoritative_balances],
        "inventario": [dict(row) for row in authoritative_inventory],
    }


@router.put("/{character_id}/economia")
def replace_character_economy(
    character_id: UUID,
    payload: EconomyReplaceInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    """Sincroniza carteira/inventario da ficha com controle de concorrencia."""
    with database.connection() as connection:
        current = _authorized_character(connection, character_id, user.id)
        if current["papel"] not in {"mestre", "assistente"}:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    "jogadores nao podem substituir carteira ou inventario; "
                    "use as operacoes economicas autorizadas"
                ),
            )
        locked = connection.execute(
            """
            SELECT economia_versao FROM personagens
            WHERE id=%s AND status='ativo' FOR UPDATE
            """,
            (character_id,),
        ).fetchone()
        if not locked or int(locked["economia_versao"]) != payload.versao_esperada:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "mensagem": "o inventario foi alterado em outro lugar; recarregue antes de salvar",
                    "versao_atual": int(locked["economia_versao"]) if locked else None,
                },
            )

        connection.execute(
            "DELETE FROM saldos_personagem WHERE campanha_id=%s AND personagem_id=%s",
            (current["campanha_id"], character_id),
        )
        for wallet in payload.carteira:
            connection.execute(
                """
                INSERT INTO saldos_personagem (campanha_id, personagem_id, moeda, saldo)
                VALUES (%s, %s, %s, %s)
                """,
                (current["campanha_id"], character_id, wallet.moeda.strip(), wallet.saldo),
            )

        connection.execute(
            "DELETE FROM inventario_personagem WHERE campanha_id=%s AND personagem_id=%s",
            (current["campanha_id"], character_id),
        )
        for item in payload.inventario:
            connection.execute(
                """
                INSERT INTO inventario_personagem
                    (campanha_id, personagem_id, item_id, titulo, quantidade, dados)
                VALUES (%s, %s, %s, %s, %s, %s)
                """,
                (
                    current["campanha_id"],
                    character_id,
                    item.item_id,
                    item.titulo,
                    item.quantidade,
                    Jsonb(item.dados),
                ),
            )

        row = connection.execute(
            """
            UPDATE personagens
            SET economia_versao=economia_versao+1, atualizado_em=CURRENT_TIMESTAMP
            WHERE id=%s
            RETURNING economia_versao
            """,
            (character_id,),
        ).fetchone()
        record_audit(
            connection,
            action="personagem.economia_sincronizada",
            actor_user_id=user.id,
            campaign_id=current["campanha_id"],
            target_type="personagem",
            target_id=str(character_id),
            details={
                "moedas": len(payload.carteira),
                "itens": len(payload.inventario),
                "versao": row["economia_versao"],
            },
        )
    return {"economia_versao": row["economia_versao"]}


@router.delete("/{character_id}", status_code=status.HTTP_204_NO_CONTENT)
def archive_character(
    character_id: UUID,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        current = _authorized_character(connection, character_id, user.id)
        connection.execute(
            """
            UPDATE personagens SET status='arquivado', atualizado_em=CURRENT_TIMESTAMP
            WHERE id=%s
            """,
            (character_id,),
        )
        record_audit(
            connection,
            action="personagem.arquivado",
            actor_user_id=user.id,
            campaign_id=current["campanha_id"],
            target_type="personagem",
            target_id=str(character_id),
        )
    return None


@router.post(
    "/{character_id}/inventario/{item_id}/consumir-fruto-eden",
    status_code=status.HTTP_200_OK,
)
def consume_eden_fruit(
    character_id: UUID,
    item_id: str,
    payload: EdenFruitConsumeInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    """Consome um Fruto do Eden e vincula seus efeitos a ficha atomicamente."""
    with database.connection() as connection:
        authorized = _authorized_character(connection, character_id, user.id)
        character = connection.execute(
            """
            SELECT ficha, versao, economia_versao
            FROM personagens
            WHERE id=%s AND status='ativo'
            FOR UPDATE
            """,
            (character_id,),
        ).fetchone()
        if not character:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="personagem nao encontrado")
        if (
            int(character["versao"]) != payload.versao_ficha_esperada
            or int(character["economia_versao"]) != payload.economia_versao_esperada
        ):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "mensagem": "a ficha ou o inventario mudou; recarregue antes de consumir o fruto",
                    "versao_ficha_atual": int(character["versao"]),
                    "economia_versao_atual": int(character["economia_versao"]),
                },
            )

        inventory = connection.execute(
            """
            SELECT item_id, titulo, quantidade, dados
            FROM inventario_personagem
            WHERE campanha_id=%s AND personagem_id=%s AND item_id=%s
            FOR UPDATE
            """,
            (authorized["campanha_id"], character_id, item_id),
        ).fetchone()
        if not inventory:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="fruto nao encontrado no inventario")
        inventory_data = inventory["dados"] if isinstance(inventory["dados"], dict) else {}
        catalog_item_id = str(inventory_data.get("catalogo_item_id") or "").strip()
        if inventory_data.get("origem") != "loja" or not catalog_item_id:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="somente um Fruto do Eden oficial adquirido pode ser consumido",
            )
        catalog = connection.execute(
            """
            SELECT id, tipo, titulo, conteudo
            FROM catalogo_itens
            WHERE id=%s AND ativo=TRUE
            """,
            (catalog_item_id,),
        ).fetchone()
        if not catalog or catalog["tipo"] != "fruto-eden":
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="o item selecionado nao e um Fruto do Eden ativo",
            )

        current_sheet = character["ficha"] if isinstance(character["ficha"], dict) else {}
        previous_fruit = current_sheet.get("frutoEdenConsumido")
        if isinstance(previous_fruit, dict) and not payload.substituir:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "mensagem": "o personagem ja possui um Fruto do Eden; confirme a substituicao",
                    "fruto_atual": previous_fruit.get("titulo"),
                },
            )

        catalog_content = catalog["conteudo"] if isinstance(catalog["conteudo"], dict) else {}
        fruit_link = {
            "itemId": str(catalog["id"]),
            "titulo": str(catalog["titulo"]),
            "conteudo": catalog_content,
            "consumidoEm": datetime.now(timezone.utc).isoformat(),
        }
        next_sheet = {
            **current_sheet,
            "frutoEdenConsumido": fruit_link,
        }

        # Mantem o recurso atual proporcional ao bonus permanente ganho ou perdido
        # numa substituicao. Os maximos continuam derivados no frontend.
        status_sheet = current_sheet.get("status") if isinstance(current_sheet.get("status"), dict) else {}
        next_status = dict(status_sheet)
        for target, field in (("vidaMaxima", "vidaAtual"), ("manaMaxima", "manaAtual")):
            current_value = status_sheet.get(field)
            if not isinstance(current_value, (int, float)) or isinstance(current_value, bool):
                continue
            delta = _eden_fruit_resource_bonus(next_sheet, target) - _eden_fruit_resource_bonus(current_sheet, target)
            next_status[field] = max(0, int(current_value) + delta)
        if next_status:
            next_sheet["status"] = next_status

        quantity = int(inventory["quantidade"])
        if quantity <= 1:
            connection.execute(
                """
                DELETE FROM inventario_personagem
                WHERE campanha_id=%s AND personagem_id=%s AND item_id=%s
                """,
                (authorized["campanha_id"], character_id, item_id),
            )
        else:
            connection.execute(
                """
                UPDATE inventario_personagem
                SET quantidade=quantidade-1, atualizado_em=CURRENT_TIMESTAMP
                WHERE campanha_id=%s AND personagem_id=%s AND item_id=%s
                """,
                (authorized["campanha_id"], character_id, item_id),
            )

        updated = connection.execute(
            """
            UPDATE personagens
            SET ficha=%s, versao=versao+1, economia_versao=economia_versao+1,
                atualizado_em=CURRENT_TIMESTAMP
            WHERE id=%s
            RETURNING versao, economia_versao
            """,
            (Jsonb(next_sheet), character_id),
        ).fetchone()
        record_audit(
            connection,
            action="personagem.fruto_eden_consumido",
            actor_user_id=user.id,
            campaign_id=authorized["campanha_id"],
            target_type="personagem",
            target_id=str(character_id),
            details={
                "item_id": catalog_item_id,
                "titulo": str(catalog["titulo"]),
                "substituiu": previous_fruit.get("itemId") if isinstance(previous_fruit, dict) else None,
            },
        )

    return {
        "fruto": fruit_link,
        "versao": int(updated["versao"]),
        "economia_versao": int(updated["economia_versao"]),
    }


@router.post(
    "/{character_id}/inventario/{item_id}/desinstalar-modificacao",
    status_code=status.HTTP_200_OK,
)
def uninstall_modification(
    character_id: UUID,
    item_id: str,
    modificacao_id: str,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    """Remove uma modificação instalada de um equipamento e devolve ao inventário avulso.

    A operação é completamente transacional: se a inserção no inventário falhar,
    a remoção do equipamento é revertida. Se a modificação tiver `destruida_ao_remover`
    definido como true, ela não retorna para o inventário. Modificações com `removivel`
    definido como false não podem ser desinstaladas.
    """
    with database.connection() as connection:
        # Valida que o usuário autenticado controla este personagem
        character = _authorized_character(connection, character_id, user.id)
        campaign_id = character["campanha_id"]

        # Bloqueia a linha do item para evitar condições de corrida
        inv_row = connection.execute(
            """
            SELECT item_id, titulo, quantidade, dados
            FROM inventario_personagem
            WHERE campanha_id=%s AND personagem_id=%s AND item_id=%s
            FOR UPDATE
            """,
            (campaign_id, character_id, item_id),
        ).fetchone()
        if not inv_row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="item nao encontrado no inventario",
            )

        dados = inv_row["dados"] if isinstance(inv_row["dados"], dict) else {}
        modificacoes: list[dict] = dados.get("modificacoes", [])

        # Encontra a instância pelo ID único de instalação
        alvo_idx = next(
            (i for i, m in enumerate(modificacoes) if m.get("id") == modificacao_id),
            None,
        )
        if alvo_idx is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="modificacao nao encontrada neste item",
            )

        modificacao = modificacoes[alvo_idx]

        # Hard block: modificação declarada como não removível
        if not modificacao.get("removivel", True):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="esta modificacao nao pode ser removida",
            )

        # Remove a modificação do array
        novas_mods = [m for m in modificacoes if m.get("id") != modificacao_id]
        dados["modificacoes"] = novas_mods

        connection.execute(
            """
            UPDATE inventario_personagem
            SET dados=%s, atualizado_em=CURRENT_TIMESTAMP
            WHERE campanha_id=%s AND personagem_id=%s AND item_id=%s
            """,
            (Jsonb(dados), campaign_id, character_id, item_id),
        )

        # Retorna ao inventário como item avulso (se não for destruída ao remover)
        item_avulso_id = modificacao.get("catalogo_item_id") or f"mod_{modificacao_id}"
        retornou_ao_inventario = False

        if not modificacao.get("destruida_ao_remover", False):
            titulo_avulso = modificacao.get("nome", "Modificação")
            dados_avulsos = {
                "origem": "desinstalacao",
                "catalogo_item_id": modificacao.get("catalogo_item_id"),
                "efeitos": modificacao.get("efeitos", []),
                "removivel": modificacao.get("removivel", True),
                "destruida_ao_remover": modificacao.get("destruida_ao_remover", False),
                "grupo_exclusividade": modificacao.get("grupo_exclusividade", ""),
                "slots_ocupados": modificacao.get("slots_ocupados", 1),
                "desinstalado_de": item_id,
                "desinstalado_em": "now",
            }
            connection.execute(
                """
                INSERT INTO inventario_personagem
                    (campanha_id, personagem_id, item_id, titulo, quantidade, dados)
                VALUES (%s, %s, %s, %s, 1, %s)
                ON CONFLICT (campanha_id, personagem_id, item_id) DO UPDATE SET
                    quantidade=inventario_personagem.quantidade + 1,
                    atualizado_em=CURRENT_TIMESTAMP
                """,
                (campaign_id, character_id, item_avulso_id, titulo_avulso, Jsonb(dados_avulsos)),
            )
            retornou_ao_inventario = True

        record_audit(
            connection,
            action="inventario.desinstalar_modificacao",
            actor_user_id=user.id,
            campaign_id=campaign_id,
            target_type="personagem",
            target_id=str(character_id),
            details={
                "item_id": item_id,
                "modificacao_id": modificacao_id,
                "modificacao_nome": modificacao.get("nome"),
                "retornou_ao_inventario": retornou_ao_inventario,
                "item_avulso_id": item_avulso_id if retornou_ao_inventario else None,
            },
        )

    return {
        "modificacao_id": modificacao_id,
        "modificacao_nome": modificacao.get("nome"),
        "retornou_ao_inventario": retornou_ao_inventario,
        "item_avulso_id": item_avulso_id if retornou_ao_inventario else None,
    }
