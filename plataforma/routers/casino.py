from __future__ import annotations

from datetime import datetime, timezone
from typing import Literal
import unicodedata
from uuid import UUID, uuid4
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict, Field, StrictInt
from psycopg.types.json import Jsonb

from core import casino_rules
from core.audit import record_audit
from core.database import Database
from core.dependencies import AuthenticatedUser, campaign_access, get_current_user, get_database, require_csrf
from core.economy_commands import MAX_ECONOMY_AMOUNT


router = APIRouter(prefix="/cassino-gambler", tags=["cassino-gambler"])
TZ_JARDIM = ZoneInfo("America/Sao_Paulo")
ORIGEM_LEDGER = "cassino-gambler"


class JogadaInstantaneaInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    campanha_id: UUID
    personagem_id: UUID
    idempotencia: UUID
    jogo: Literal["dados", "roda_fluxos", "sucessao", "vaos", "rolos", "duelo"]
    aposta: StrictInt = Field(ge=1, le=1_000_000)
    escolha: str | None = Field(default=None, max_length=30)
    numero: StrictInt | None = Field(default=None, ge=1, le=6)


class VinteUmInicioInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    campanha_id: UUID
    personagem_id: UUID
    idempotencia: UUID
    aposta: StrictInt = Field(ge=1, le=1_000_000)


class VinteUmAcaoInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    campanha_id: UUID
    personagem_id: UUID
    versao: StrictInt = Field(ge=1)
    acao: Literal["comprar", "parar", "dobrar"]


class VinteUmAbandonarInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    campanha_id: UUID
    personagem_id: UUID
    versao: StrictInt = Field(ge=1)


class CambioFichasInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    campanha_id: UUID
    personagem_id: UUID
    idempotencia: UUID
    moeda: Literal["Lunaris", "Solares", "Fragmentos de Estrela", "Créditos Sombrios"]
    quantidade: StrictInt = Field(ge=1, le=1_000_000_000)


class ResgateFichasInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    campanha_id: UUID
    personagem_id: UUID
    idempotencia: UUID
    quantidade: StrictInt = Field(ge=1, le=1_000_000_000)


def _selected_character(connection, campaign_id: UUID, character_id: UUID, user_id: UUID):
    campaign_access(connection, campaign_id, user_id)
    row = connection.execute(
        """
        SELECT p.id, p.nome, p.campanha_id, p.economia_versao
        FROM personagens p
        WHERE p.id=%s AND p.campanha_id=%s AND p.dono_usuario_id=%s
          AND p.status='ativo'
        FOR UPDATE OF p
        """,
        (character_id, campaign_id, user_id),
    ).fetchone()
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="personagem próprio e ativo não encontrado nesta campanha",
        )
    return row


def _normalize(value: object) -> str:
    text = unicodedata.normalize("NFKD", str(value))
    return "".join(char for char in text if not unicodedata.combining(char)).strip().lower()


def _non_negative_integer(value: object, default: int = 0) -> int:
    if isinstance(value, bool):
        return default
    try:
        return max(0, int(value))
    except (TypeError, ValueError, OverflowError):
        return default


def _wallet(connection, campaign_id: UUID, character_id: UUID) -> list[dict]:
    return [
        {"moeda": row["moeda"], "saldo": int(row["saldo"])}
        for row in connection.execute(
            """
            SELECT moeda, saldo FROM saldos_personagem
            WHERE campanha_id=%s AND personagem_id=%s
            ORDER BY moeda
            """,
            (campaign_id, character_id),
        ).fetchall()
    ]


def _currency_balance(connection, campaign_id: UUID, character_id: UUID, currency: str) -> int:
    rows = connection.execute(
        """
        SELECT moeda, saldo FROM saldos_personagem
        WHERE campanha_id=%s AND personagem_id=%s AND lower(moeda)=lower(%s)
        """,
        (campaign_id, character_id, currency),
    ).fetchall()
    if len(rows) > 1:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"a carteira possui entradas duplicadas para {currency}; peça ao mestre para normalizá-la",
        )
    return int(rows[0]["saldo"]) if rows else 0


def _chip_balance(connection, campaign_id: UUID, character_id: UUID, *, lock: bool = False) -> dict:
    suffix = " FOR UPDATE" if lock else ""
    row = connection.execute(
        f"""
        SELECT saldo, versao FROM cassino_gambler_fichas
        WHERE campanha_id=%s AND personagem_id=%s{suffix}
        """,
        (campaign_id, character_id),
    ).fetchone()
    return {"saldo": int(row["saldo"]), "versao": int(row["versao"])} if row else {"saldo": 0, "versao": 1}


def _metrics(connection, campaign_id: UUID, character_id: UUID, day) -> dict[str, int]:
    row = connection.execute(
        """
        SELECT COALESCE(SUM(aposta), 0) AS apostado,
               COALESCE(SUM(GREATEST(aposta-pagamento, 0)), 0) AS perda_liquida
        FROM cassino_gambler_rodadas
        WHERE campanha_id=%s AND personagem_id=%s AND dia_local=%s
          AND lower(moeda)=lower('Fichas')
          AND status IN ('ativa', 'liquidada')
        """,
        (campaign_id, character_id, day),
    ).fetchone()
    return {"apostado": int(row["apostado"]), "perda_liquida": int(row["perda_liquida"])}


def _achievement_count(connection, campaign_id: UUID, character_id: UUID) -> int:
    row = connection.execute(
        """
        SELECT COUNT(*) AS total FROM cassino_gambler_conquistas
        WHERE campanha_id=%s AND personagem_id=%s
        """,
        (campaign_id, character_id),
    ).fetchone()
    return int(row["total"]) if row else 0


def _effective_config(connection, campaign_id: UUID, character_id: UUID) -> dict:
    return casino_rules.limites_efetivos(_achievement_count(connection, campaign_id, character_id))


def _validate_bet(connection, campaign_id: UUID, character_id: UUID, amount: int, day) -> None:
    config = _effective_config(connection, campaign_id, character_id)
    if not config["aposta_minima"] <= amount <= config["aposta_maxima"]:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=(
                f"a aposta deve ficar entre {config['aposta_minima']} e "
                f"{config['aposta_maxima']} fichas"
            ),
        )
    metrics = _metrics(connection, campaign_id, character_id, day)
    if metrics["apostado"] + amount > config["limite_apostado_dia"]:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="esta aposta ultrapassa o limite diário apostado")
    if metrics["perda_liquida"] + amount > config["limite_perda_dia"]:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="esta aposta ultrapassa o limite diário de perda")


def _currency_ledger(
    connection,
    *,
    campaign_id: UUID,
    character_id: UUID,
    user_id: UUID,
    currency: str,
    delta: int,
    balance: int,
    reason: str,
    idempotency: str,
) -> None:
    connection.execute(
        """
        INSERT INTO lancamentos_economia
            (id, campanha_id, personagem_id, moeda, delta, saldo_apos,
             motivo, origem, idempotencia, ator_usuario_id)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """,
        (
            uuid4(), campaign_id, character_id, currency, delta, balance, reason,
            ORIGEM_LEDGER, idempotency, user_id,
        ),
    )


def _debit_currency(
    connection,
    *,
    campaign_id: UUID,
    character_id: UUID,
    user_id: UUID,
    currency: str,
    amount: int,
    reason: str,
    idempotency: str,
) -> int:
    wallet_rows = connection.execute(
        """
        SELECT moeda, saldo FROM saldos_personagem
        WHERE campanha_id=%s AND personagem_id=%s AND lower(moeda)=lower(%s)
        FOR UPDATE
        """,
        (campaign_id, character_id, currency),
    ).fetchall()
    if len(wallet_rows) > 1:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"a carteira possui entradas duplicadas para {currency}")
    if not wallet_rows or int(wallet_rows[0]["saldo"]) < amount:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"o personagem precisa de {amount} {currency} na carteira",
        )
    currency = wallet_rows[0]["moeda"]
    row = connection.execute(
        """
        UPDATE saldos_personagem SET saldo=saldo-%s, atualizado_em=CURRENT_TIMESTAMP
        WHERE campanha_id=%s AND personagem_id=%s AND moeda=%s AND saldo >= %s
        RETURNING saldo
        """,
        (amount, campaign_id, character_id, currency, amount),
    ).fetchone()
    if not row:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"o personagem precisa de {amount} {currency} na carteira",
        )
    balance = int(row["saldo"])
    _currency_ledger(
        connection,
        campaign_id=campaign_id,
        character_id=character_id,
        user_id=user_id,
        currency=currency,
        delta=-amount,
        balance=balance,
        reason=reason,
        idempotency=idempotency,
    )
    return balance


def _credit_currency(
    connection,
    *,
    campaign_id: UUID,
    character_id: UUID,
    user_id: UUID,
    currency: str,
    amount: int,
    reason: str,
    idempotency: str,
) -> int:
    locked = connection.execute(
        """
        SELECT saldo FROM saldos_personagem
        WHERE campanha_id=%s AND personagem_id=%s AND lower(moeda)=lower(%s)
        FOR UPDATE
        """,
        (campaign_id, character_id, currency),
    ).fetchone()
    current = int(locked["saldo"]) if locked else 0
    if current + amount > MAX_ECONOMY_AMOUNT:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"o resgate excederia o limite da carteira de {currency}",
        )
    row = connection.execute(
        """
        INSERT INTO saldos_personagem (campanha_id, personagem_id, moeda, saldo)
        VALUES (%s, %s, %s, %s)
        ON CONFLICT (campanha_id, personagem_id, moeda) DO UPDATE SET
            saldo=saldos_personagem.saldo + EXCLUDED.saldo,
            atualizado_em=CURRENT_TIMESTAMP
        RETURNING saldo
        """,
        (campaign_id, character_id, currency, amount),
    ).fetchone()
    balance = int(row["saldo"])
    _currency_ledger(
        connection,
        campaign_id=campaign_id,
        character_id=character_id,
        user_id=user_id,
        currency=currency,
        delta=amount,
        balance=balance,
        reason=reason,
        idempotency=idempotency,
    )
    return balance


def _chip_ledger(
    connection,
    *,
    campaign_id: UUID,
    character_id: UUID,
    user_id: UUID,
    delta: int,
    balance: int,
    reason: str,
    idempotency: str,
) -> None:
    connection.execute(
        """
        INSERT INTO cassino_gambler_fichas_lancamentos
            (id, campanha_id, personagem_id, usuario_id, delta, saldo_apos,
             motivo, origem, idempotencia)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """,
        (
            uuid4(), campaign_id, character_id, user_id, delta, balance,
            reason, ORIGEM_LEDGER, idempotency,
        ),
    )


def _change_chips(
    connection,
    *,
    campaign_id: UUID,
    character_id: UUID,
    user_id: UUID,
    delta: int,
    reason: str,
    idempotency: str,
) -> int:
    current = _chip_balance(connection, campaign_id, character_id, lock=True)
    next_balance = current["saldo"] + delta
    if next_balance < 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"o personagem precisa de {-delta} fichas para esta aposta",
        )
    if next_balance > MAX_ECONOMY_AMOUNT:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="a movimentação excederia o limite da carteira de fichas",
        )
    row = connection.execute(
        """
        INSERT INTO cassino_gambler_fichas
            (campanha_id, personagem_id, saldo, versao, atualizado_em)
        VALUES (%s, %s, %s, 1, CURRENT_TIMESTAMP)
        ON CONFLICT (campanha_id, personagem_id) DO UPDATE
        SET saldo=EXCLUDED.saldo,
            versao=cassino_gambler_fichas.versao+1,
            atualizado_em=CURRENT_TIMESTAMP
        RETURNING saldo, versao
        """,
        (campaign_id, character_id, next_balance),
    ).fetchone()
    balance = int(row["saldo"])
    _chip_ledger(
        connection,
        campaign_id=campaign_id,
        character_id=character_id,
        user_id=user_id,
        delta=delta,
        balance=balance,
        reason=reason,
        idempotency=idempotency,
    )
    return balance


def _bump_economy(connection, character_id: UUID) -> int:
    row = connection.execute(
        """
        UPDATE personagens
        SET economia_versao=economia_versao+1, atualizado_em=CURRENT_TIMESTAMP
        WHERE id=%s AND status='ativo'
        RETURNING economia_versao
        """,
        (character_id,),
    ).fetchone()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="personagem não encontrado")
    return int(row["economia_versao"])


def _evaluate_achievements(connection, campaign_id: UUID, character_id: UUID) -> dict:
    """Reavalia as conquistas a partir do historico liquidado, igual ao Banqueiro.

    Nao ha contador redundante: cada chamada relê `cassino_gambler_rodadas` e
    deriva tudo de novo, então não existe estado que possa desalinhar. As
    conquistas ja gravadas nunca são removidas, mesmo que o histórico mude.
    """
    rounds = connection.execute(
        """
        SELECT jogo, aposta, pagamento, estado, resultado
        FROM cassino_gambler_rodadas
        WHERE campanha_id=%s AND personagem_id=%s AND status='liquidada'
        ORDER BY encerrada_em, criado_em, id
        """,
        (campaign_id, character_id),
    ).fetchall()
    trocou = connection.execute(
        "SELECT 1 FROM cassino_gambler_cambios WHERE campanha_id=%s AND personagem_id=%s LIMIT 1",
        (campaign_id, character_id),
    ).fetchone()
    maior_resgate = connection.execute(
        """
        SELECT COALESCE(MAX(quantidade), 0) AS maior FROM cassino_gambler_resgates
        WHERE campanha_id=%s AND personagem_id=%s
        """,
        (campaign_id, character_id),
    ).fetchone()
    resgatou = int(maior_resgate["maior"]) > 0
    chips = _chip_balance(connection, campaign_id, character_id)

    def resultado(row):
        return row["resultado"] if isinstance(row["resultado"], dict) else {}

    keys: list[str] = []
    quantity = len(rounds)
    if quantity >= 1:
        keys.append("primeira_rodada")
    if quantity >= 10:
        keys.append("frequentador")
    if quantity >= 50:
        keys.append("habitante_salao")
    if quantity >= 100:
        keys.append("veterano_do_salao")
    played_games = {str(row["jogo"]) for row in rounds}
    if casino_rules.JOGOS <= played_games:
        keys.append("todos_jogos")
    if any(resultado(row).get("resultado") == "vinte_um_natural" for row in rounds):
        keys.append("vinte_um_natural")
    if any(
        row["jogo"] == "dados" and resultado(row).get("escolha") == "exato"
        and int(row["pagamento"]) > int(row["aposta"])
        for row in rounds
    ):
        keys.append("dado_exato")
    if any(row["jogo"] == "roda_fluxos" and int(row["pagamento"]) > 0 for row in rounds):
        keys.append("roda_exata")
    if any(
        row["jogo"] == "roda_fluxos"
        and resultado(row).get("escolha") == "vazio"
        and resultado(row).get("sorteada") == "vazio"
        for row in rounds
    ):
        keys.append("roda_vazio")
    if any(row["jogo"] == "sucessao" and resultado(row).get("lado") == "passo" for row in rounds):
        keys.append("passo_chronus")
    if any(row["jogo"] == "vaos" and resultado(row).get("indice") in (0, 4) for row in rounds):
        keys.append("vaos_borda")
    if any(row["jogo"] == "vaos" and resultado(row).get("indice") == 2 for row in rounds):
        keys.append("vaos_centro")
    if any(row["jogo"] == "rolos" and resultado(row).get("trinca") for row in rounds):
        keys.append("trinca_comum")
    if any(
        row["jogo"] == "rolos" and resultado(row).get("rolos") == ["vazio", "vazio", "vazio"]
        for row in rounds
    ):
        keys.append("trinca_vazio")
    if any(
        row["jogo"] == "duelo" and resultado(row).get("resultado") == "vitoria"
        and resultado(row).get("carta_jogador") == 14
        for row in rounds
    ):
        keys.append("duelo_as")
    if any(int(row["pagamento"]) - int(row["aposta"]) >= 50 for row in rounds):
        keys.append("grande_vitoria")
    if any(int(row["pagamento"]) - int(row["aposta"]) >= 200 for row in rounds):
        keys.append("fortuna_lunar")

    streak = 0
    best_streak = 0
    signs: list[int] = []
    comeback = False
    for row in rounds:
        net = int(row["pagamento"]) - int(row["aposta"])
        sign = 1 if net > 0 else -1 if net < 0 else 0
        if sign == 1 and len(signs) >= 3 and signs[-3:] == [-1, -1, -1]:
            comeback = True
        streak = streak + 1 if sign == 1 else 0
        best_streak = max(best_streak, streak)
        signs.append(sign)
    if best_streak >= 3:
        keys.append("sequencia_tres")
    if best_streak >= 5:
        keys.append("sequencia_cinco")
    if comeback:
        keys.append("retorno_arkarin")
    if trocou:
        keys.append("primeiro_cambio")
    if resgatou:
        keys.append("primeiro_resgate")
    if int(maior_resgate["maior"]) >= 200:
        keys.append("resgate_grande")
    if quantity >= 1 and chips["saldo"] == 0:
        keys.append("mesa_zerada")
    if len(keys) >= 15:
        keys.append("campeao_das_mesas")

    new_keys: set[str] = set()
    for key in keys:
        inserted = connection.execute(
            """
            INSERT INTO cassino_gambler_conquistas (campanha_id, personagem_id, chave)
            VALUES (%s, %s, %s) ON CONFLICT DO NOTHING
            RETURNING chave
            """,
            (campaign_id, character_id, key),
        ).fetchone()
        if inserted:
            new_keys.add(str(inserted["chave"]))
    unlocked = connection.execute(
        """
        SELECT chave, desbloqueada_em FROM cassino_gambler_conquistas
        WHERE campanha_id=%s AND personagem_id=%s ORDER BY desbloqueada_em, chave
        """,
        (campaign_id, character_id),
    ).fetchall()
    catalog = casino_rules.CONQUISTAS_GAMBLER
    return {
        "sequencia_atual": streak,
        "maior_sequencia": best_streak,
        "conquistas": [
            {
                "chave": row["chave"],
                "nome": catalog[row["chave"]][0],
                "descricao": catalog[row["chave"]][1],
                "nova": row["chave"] in new_keys,
            }
            for row in unlocked
            if row["chave"] in catalog
        ],
    }


def _public_blackjack_state(state_value: dict) -> dict:
    active = state_value.get("status") == "ativa"
    player = list(state_value.get("jogador") or [])
    banker = list(state_value.get("banqueiro") or [])
    public_banker = banker[:1] + (["?"] if active and len(banker) > 1 else banker[1:])
    return {
        "jogador": player,
        "banqueiro": public_banker,
        "valor_jogador": casino_rules.valor_mao(player),
        "valor_banqueiro": casino_rules.valor_mao(banker[:1] if active else banker),
        "status": state_value.get("status"),
        "resultado": state_value.get("resultado"),
        "dobrada": bool(state_value.get("dobrada")),
        "pode_dobrar": active and len(player) == 2,
    }


def _round_response(connection, row, character) -> dict:
    round_data = dict(row)
    state_value = round_data.get("estado") if isinstance(round_data.get("estado"), dict) else {}
    result_value = round_data.get("resultado") if isinstance(round_data.get("resultado"), dict) else {}
    day = round_data.get("dia_local") or datetime.now(TZ_JARDIM).date()
    chips = _chip_balance(connection, character["campanha_id"], character["id"])
    achievements = _evaluate_achievements(connection, character["campanha_id"], character["id"])
    return {
        "rodada": {
            "id": round_data["id"],
            "jogo": round_data["jogo"],
            "aposta": int(round_data["aposta"]),
            "pagamento": int(round_data["pagamento"]),
            "status": round_data["status"],
            "versao": int(round_data["versao"]),
            "estado": _public_blackjack_state(state_value) if round_data["jogo"] == "vinte_um" else state_value,
            "resultado": result_value,
        },
        "personagem": {"id": character["id"], "nome": character["nome"]},
        "saldo_fichas": chips["saldo"],
        "fichas_versao": chips["versao"],
        "carteira": _wallet(connection, character["campanha_id"], character["id"]),
        "economia_versao": int(
            connection.execute(
                "SELECT economia_versao FROM personagens WHERE id=%s", (character["id"],)
            ).fetchone()["economia_versao"]
        ),
        "limites": {
            **casino_rules.limites_efetivos(len(achievements["conquistas"])),
            **_metrics(connection, character["campanha_id"], character["id"], day),
        },
        "sequencia_atual": achievements["sequencia_atual"],
        "maior_sequencia": achievements["maior_sequencia"],
        "conquistas": achievements["conquistas"],
        "conquistas_novas": [item for item in achievements["conquistas"] if item["nova"]],
    }


def _log_response(row) -> dict:
    """Serializa somente o que o Mestre precisa para auditar uma aposta.

    `estado` e `requisicao` ficam deliberadamente fora da resposta: numa mesa
    de vinte-e-um ativa eles contêm o baralho e cartas ainda escondidas.
    """
    result_value = row.get("resultado") if isinstance(row.get("resultado"), dict) else {}
    return {
        "id": row["id"],
        "personagem_id": row["personagem_id"],
        "personagem_nome": row["personagem_nome"],
        "usuario_id": row["usuario_id"],
        "usuario_nome": row.get("usuario_nome") or "Usuário removido",
        "jogo": row["jogo"],
        "aposta": int(row["aposta"]),
        "pagamento": int(row["pagamento"]),
        "saldo": int(row["pagamento"]) - int(row["aposta"]),
        "status": row["status"],
        "resultado": result_value if row["status"] != "ativa" else {},
        "criado_em": row["criado_em"],
        "encerrada_em": row.get("encerrada_em"),
    }


def _instant_result(payload: JogadaInstantaneaInput) -> tuple[dict, int]:
    if payload.jogo == "dados":
        return casino_rules.jogar_dados(payload.escolha or "", payload.aposta, payload.numero), 60_000
    if payload.jogo == "roda_fluxos":
        return casino_rules.jogar_roda_fluxos(payload.escolha or "", payload.aposta), 100_000
    if payload.jogo == "sucessao":
        return casino_rules.jogar_sucessao(payload.escolha or "", payload.aposta), 20_000
    if payload.jogo == "vaos":
        return casino_rules.jogar_vaos(payload.aposta), 40_000
    if payload.jogo == "rolos":
        return casino_rules.jogar_rolos(payload.aposta), casino_rules.ROLOS_PAGAMENTO_BP["vazio"]
    if payload.jogo == "duelo":
        return casino_rules.jogar_duelo(payload.aposta), casino_rules.DUELO_PAGAMENTO_BP["vitoria"]
    raise ValueError("jogo inválido")


@router.get("/personagens")
def casino_characters(
    campanha_id: UUID,
    user: AuthenticatedUser = Depends(get_current_user),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        campaign_access(connection, campanha_id, user.id)
        rows = connection.execute(
            """
            SELECT p.id, p.nome, p.ficha
            FROM personagens p
            WHERE p.campanha_id=%s AND p.dono_usuario_id=%s AND p.status='ativo'
            ORDER BY lower(p.nome), p.id
            """,
            (campanha_id, user.id),
        ).fetchall()
        characters = []
        for row in rows:
            sheet = row["ficha"] if isinstance(row.get("ficha"), dict) else {}
            classes = sheet.get("classes") if isinstance(sheet.get("classes"), list) else []
            level = sum(
                _non_negative_integer(item.get("nivel"))
                for item in classes
                if isinstance(item, dict)
            ) or max(1, _non_negative_integer(sheet.get("nivel"), 1))
            chips = _chip_balance(connection, campanha_id, row["id"])
            characters.append({
                "id": row["id"],
                "nome": row["nome"],
                "nivel": level,
                "foto": sheet.get("foto"),
                "saldo_fichas": chips["saldo"],
            })
        return {"personagens": characters}


@router.get("/logs")
def casino_logs(
    campanha_id: UUID,
    limite: int = Query(default=50, ge=1, le=200),
    deslocamento: int = Query(default=0, ge=0),
    user: AuthenticatedUser = Depends(get_current_user),
    database: Database = Depends(get_database),
):
    """Histórico de apostas da campanha, visível somente para o Mestre."""
    with database.connection() as connection:
        access = campaign_access(connection, campanha_id, user.id)
        if not access.is_master:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="somente o mestre pode consultar os logs do cassino",
            )

        summary = connection.execute(
            """
            SELECT
                COUNT(*)::BIGINT AS total_rodadas,
                COUNT(*) FILTER (WHERE status='ativa')::BIGINT AS rodadas_ativas,
                COALESCE(SUM(aposta) FILTER (WHERE status<>'ativa'), 0)::BIGINT AS total_apostado,
                COALESCE(SUM(pagamento) FILTER (WHERE status<>'ativa'), 0)::BIGINT AS total_pago
            FROM cassino_gambler_rodadas
            WHERE campanha_id=%s
            """,
            (campanha_id,),
        ).fetchone()
        rows = connection.execute(
            """
            SELECT
                r.id, r.personagem_id, p.nome AS personagem_nome,
                r.usuario_id, u.nome_exibicao AS usuario_nome,
                r.jogo, r.aposta, r.pagamento, r.status, r.resultado,
                r.criado_em, r.encerrada_em
            FROM cassino_gambler_rodadas r
            JOIN personagens p ON p.id=r.personagem_id
            LEFT JOIN usuarios u ON u.id=r.usuario_id
            WHERE r.campanha_id=%s
            ORDER BY r.criado_em DESC, r.id DESC
            LIMIT %s OFFSET %s
            """,
            (campanha_id, limite, deslocamento),
        ).fetchall()
        total_apostado = int(summary["total_apostado"])
        total_pago = int(summary["total_pago"])
        return {
            "logs": [_log_response(row) for row in rows],
            "total": int(summary["total_rodadas"]),
            "limite": limite,
            "deslocamento": deslocamento,
            "resumo": {
                "rodadas": int(summary["total_rodadas"]),
                "ativas": int(summary["rodadas_ativas"]),
                "apostado": total_apostado,
                "pago": total_pago,
                "saldo_casa": total_apostado - total_pago,
            },
        }


@router.get("")
def casino_state(
    campanha_id: UUID,
    personagem_id: UUID,
    user: AuthenticatedUser = Depends(get_current_user),
    database: Database = Depends(get_database),
):
    day = datetime.now(TZ_JARDIM).date()
    with database.connection() as connection:
        character = _selected_character(connection, campanha_id, personagem_id, user.id)
        active = connection.execute(
            """
            SELECT * FROM cassino_gambler_rodadas
            WHERE campanha_id=%s AND personagem_id=%s
              AND jogo='vinte_um' AND status='ativa'
            ORDER BY criado_em DESC LIMIT 1
            """,
            (campanha_id, character["id"]),
        ).fetchone()
        chips = _chip_balance(connection, campanha_id, character["id"])
        achievements = _evaluate_achievements(connection, campanha_id, character["id"])
        return {
            "personagem": {"id": character["id"], "nome": character["nome"]},
            "saldo_fichas": chips["saldo"],
            "fichas_versao": chips["versao"],
            "carteira": _wallet(connection, campanha_id, character["id"]),
            "economia_versao": int(character["economia_versao"]),
            "limites": {
                **casino_rules.limites_efetivos(len(achievements["conquistas"])),
                **_metrics(connection, campanha_id, character["id"], day),
            },
            "forcas": casino_rules.FORCAS_DA_RODA,
            "simbolos_rolos": casino_rules.ROLOS_SIMBOLOS,
            "cambio": casino_rules.MOEDAS_PARA_FICHAS,
            "vinte_um_ativo": _round_response(connection, active, character)["rodada"] if active else None,
            "sequencia_atual": achievements["sequencia_atual"],
            "maior_sequencia": achievements["maior_sequencia"],
            "conquistas": achievements["conquistas"],
            "conquistas_novas": [],
            "catalogo_conquistas": [
                {"chave": chave, "nome": nome, "descricao": descricao}
                for chave, (nome, descricao) in casino_rules.CONQUISTAS_GAMBLER.items()
            ],
        }


@router.post("/cambio")
def exchange_for_chips(
    payload: CambioFichasInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    day = datetime.now(TZ_JARDIM).date()
    exchange_id = payload.idempotencia
    with database.connection() as connection:
        character = _selected_character(
            connection, payload.campanha_id, payload.personagem_id, user.id
        )
        existing = connection.execute(
            "SELECT * FROM cassino_gambler_cambios WHERE id=%s FOR UPDATE",
            (exchange_id,),
        ).fetchone()
        if existing:
            same_request = (
                existing["campanha_id"] == payload.campanha_id
                and existing["personagem_id"] == payload.personagem_id
                and existing["usuario_id"] == user.id
                and _normalize(existing["moeda"]) == _normalize(payload.moeda)
                and int(existing["quantidade"]) == payload.quantidade
            )
            if not same_request:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="identificador de câmbio já utilizado",
                )
            chips_received = int(existing["fichas_recebidas"])
        else:
            rate = casino_rules.MOEDAS_PARA_FICHAS[payload.moeda]
            chips_received = payload.quantidade * rate
            if chips_received > MAX_ECONOMY_AMOUNT:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                    detail="a conversão excederia o limite da carteira de fichas",
                )
            _debit_currency(
                connection,
                campaign_id=payload.campanha_id,
                character_id=character["id"],
                user_id=user.id,
                currency=payload.moeda,
                amount=payload.quantidade,
                reason="Câmbio por fichas no Cassino do Gambler",
                idempotency=f"{exchange_id}:moeda",
            )
            _change_chips(
                connection,
                campaign_id=payload.campanha_id,
                character_id=character["id"],
                user_id=user.id,
                delta=chips_received,
                reason=f"Câmbio de {payload.quantidade} {payload.moeda}",
                idempotency=f"{exchange_id}:fichas",
            )
            connection.execute(
                """
                INSERT INTO cassino_gambler_cambios
                    (id, campanha_id, personagem_id, usuario_id, moeda,
                     quantidade, fichas_recebidas)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    exchange_id, payload.campanha_id, character["id"], user.id,
                    payload.moeda, payload.quantidade, chips_received,
                ),
            )
            _bump_economy(connection, character["id"])
            record_audit(
                connection,
                action="cassino_gambler.cambio_realizado",
                actor_user_id=user.id,
                campaign_id=payload.campanha_id,
                target_type="personagem",
                target_id=str(character["id"]),
                details={
                    "moeda": payload.moeda,
                    "quantidade": payload.quantidade,
                    "fichas_recebidas": chips_received,
                },
            )

        chips = _chip_balance(connection, payload.campanha_id, character["id"])
        economy_version = connection.execute(
            "SELECT economia_versao FROM personagens WHERE id=%s",
            (character["id"],),
        ).fetchone()
        achievements = _evaluate_achievements(connection, payload.campanha_id, character["id"])
        return {
            "personagem": {"id": character["id"], "nome": character["nome"]},
            "saldo_fichas": chips["saldo"],
            "fichas_versao": chips["versao"],
            "carteira": _wallet(connection, payload.campanha_id, character["id"]),
            "economia_versao": int(economy_version["economia_versao"]),
            "limites": {
                **casino_rules.limites_efetivos(len(achievements["conquistas"])),
                **_metrics(connection, payload.campanha_id, character["id"], day),
            },
            "cambio": casino_rules.MOEDAS_PARA_FICHAS,
            "fichas_recebidas": chips_received,
            "sequencia_atual": achievements["sequencia_atual"],
            "maior_sequencia": achievements["maior_sequencia"],
            "conquistas": achievements["conquistas"],
            "conquistas_novas": [item for item in achievements["conquistas"] if item["nova"]],
        }


@router.post("/resgate")
def redeem_chips(
    payload: ResgateFichasInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    day = datetime.now(TZ_JARDIM).date()
    redemption_id = payload.idempotencia
    with database.connection() as connection:
        character = _selected_character(
            connection, payload.campanha_id, payload.personagem_id, user.id
        )
        existing = connection.execute(
            "SELECT * FROM cassino_gambler_resgates WHERE id=%s FOR UPDATE",
            (redemption_id,),
        ).fetchone()
        if existing:
            same_request = (
                existing["campanha_id"] == payload.campanha_id
                and existing["personagem_id"] == payload.personagem_id
                and existing["usuario_id"] == user.id
                and int(existing["quantidade"]) == payload.quantidade
            )
            if not same_request:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="identificador de resgate já utilizado",
                )
        else:
            _change_chips(
                connection,
                campaign_id=payload.campanha_id,
                character_id=character["id"],
                user_id=user.id,
                delta=-payload.quantidade,
                reason="Resgate de fichas no Cassino do Gambler",
                idempotency=f"{redemption_id}:fichas",
            )
            _credit_currency(
                connection,
                campaign_id=payload.campanha_id,
                character_id=character["id"],
                user_id=user.id,
                currency="Lunaris",
                amount=payload.quantidade,
                reason=f"Resgate de {payload.quantidade} fichas no Cassino do Gambler",
                idempotency=f"{redemption_id}:lunaris",
            )
            connection.execute(
                """
                INSERT INTO cassino_gambler_resgates
                    (id, campanha_id, personagem_id, usuario_id, quantidade)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (redemption_id, payload.campanha_id, character["id"], user.id, payload.quantidade),
            )
            _bump_economy(connection, character["id"])
            record_audit(
                connection,
                action="cassino_gambler.resgate_realizado",
                actor_user_id=user.id,
                campaign_id=payload.campanha_id,
                target_type="personagem",
                target_id=str(character["id"]),
                details={"quantidade": payload.quantidade},
            )

        chips = _chip_balance(connection, payload.campanha_id, character["id"])
        economy_version = connection.execute(
            "SELECT economia_versao FROM personagens WHERE id=%s",
            (character["id"],),
        ).fetchone()
        achievements = _evaluate_achievements(connection, payload.campanha_id, character["id"])
        return {
            "personagem": {"id": character["id"], "nome": character["nome"]},
            "saldo_fichas": chips["saldo"],
            "fichas_versao": chips["versao"],
            "carteira": _wallet(connection, payload.campanha_id, character["id"]),
            "economia_versao": int(economy_version["economia_versao"]),
            "limites": {
                **casino_rules.limites_efetivos(len(achievements["conquistas"])),
                **_metrics(connection, payload.campanha_id, character["id"], day),
            },
            "cambio": casino_rules.MOEDAS_PARA_FICHAS,
            "lunaris_recebidos": payload.quantidade,
            "sequencia_atual": achievements["sequencia_atual"],
            "maior_sequencia": achievements["maior_sequencia"],
            "conquistas": achievements["conquistas"],
            "conquistas_novas": [item for item in achievements["conquistas"] if item["nova"]],
        }


@router.post("/jogar")
def play_instant(
    payload: JogadaInstantaneaInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    request_data = payload.model_dump(mode="json")
    round_id = payload.idempotencia
    day = datetime.now(TZ_JARDIM).date()
    with database.connection() as connection:
        character = _selected_character(
            connection, payload.campanha_id, payload.personagem_id, user.id
        )
        existing = connection.execute(
            "SELECT * FROM cassino_gambler_rodadas WHERE id=%s FOR UPDATE", (round_id,)
        ).fetchone()
        if existing:
            if (
                existing["campanha_id"] != payload.campanha_id
                or existing["personagem_id"] != character["id"]
                or existing["usuario_id"] != user.id
                or existing["requisicao"] != request_data
            ):
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="identificador de aposta já utilizado")
            return _round_response(connection, existing, character)

        _validate_bet(connection, payload.campanha_id, character["id"], payload.aposta, day)
        try:
            result, maximum_bp = _instant_result(payload)
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(exc)) from exc
        maximum = casino_rules.pagamento(payload.aposta, maximum_bp)
        payment = int(result["pagamento"])
        _change_chips(
            connection,
            campaign_id=payload.campanha_id,
            character_id=character["id"],
            user_id=user.id,
            delta=-payload.aposta,
            reason=f"Aposta no Cassino do Gambler: {payload.jogo}",
            idempotency=f"{round_id}:aposta",
        )
        if payment:
            _change_chips(
                connection,
                campaign_id=payload.campanha_id,
                character_id=character["id"],
                user_id=user.id,
                delta=payment,
                reason=f"Pagamento do Cassino do Gambler: {payload.jogo}",
                idempotency=f"{round_id}:pagamento",
            )
        row = connection.execute(
            """
            INSERT INTO cassino_gambler_rodadas
                (id, campanha_id, personagem_id, usuario_id, jogo, moeda, aposta,
                 pagamento_maximo, pagamento, requisicao, estado, resultado,
                 status, dia_local, encerrada_em)
            VALUES (%s, %s, %s, %s, %s, 'Fichas', %s, %s, %s, %s, %s, %s,
                    'liquidada', %s, CURRENT_TIMESTAMP)
            RETURNING *
            """,
            (
                round_id, payload.campanha_id, character["id"], user.id, payload.jogo,
                payload.aposta, maximum, payment, Jsonb(request_data), Jsonb(result),
                Jsonb(result), day,
            ),
        ).fetchone()
        record_audit(
            connection,
            action="cassino_gambler.rodada_liquidada",
            actor_user_id=user.id,
            campaign_id=payload.campanha_id,
            target_type="personagem",
            target_id=str(character["id"]),
            details={"jogo": payload.jogo, "aposta": payload.aposta, "pagamento": payment},
        )
        return _round_response(connection, row, character)


@router.post("/vinte-um/iniciar")
def start_blackjack(
    payload: VinteUmInicioInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    request_data = payload.model_dump(mode="json")
    round_id = payload.idempotencia
    day = datetime.now(TZ_JARDIM).date()
    with database.connection() as connection:
        character = _selected_character(
            connection, payload.campanha_id, payload.personagem_id, user.id
        )
        existing = connection.execute(
            "SELECT * FROM cassino_gambler_rodadas WHERE id=%s FOR UPDATE", (round_id,)
        ).fetchone()
        if existing:
            if (
                existing["campanha_id"] != payload.campanha_id
                or existing["personagem_id"] != character["id"]
                or existing["usuario_id"] != user.id
                or existing["requisicao"] != request_data
            ):
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="identificador de aposta já utilizado")
            return _round_response(connection, existing, character)
        if connection.execute(
            """
            SELECT 1 FROM cassino_gambler_rodadas
            WHERE campanha_id=%s AND personagem_id=%s AND jogo='vinte_um' AND status='ativa'
            """,
            (payload.campanha_id, character["id"]),
        ).fetchone():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="termine ou abandone a rodada de Vinte-e-Um já aberta")

        _validate_bet(connection, payload.campanha_id, character["id"], payload.aposta, day)
        state_value = casino_rules.novo_vinte_um()
        maximum = casino_rules.pagamento(payload.aposta, 25_000)
        _change_chips(
            connection,
            campaign_id=payload.campanha_id,
            character_id=character["id"],
            user_id=user.id,
            delta=-payload.aposta,
            reason="Aposta no Cassino do Gambler: vinte_um",
            idempotency=f"{round_id}:aposta",
        )
        finished = state_value["status"] == "finalizada"
        payment = casino_rules.pagamento_vinte_um(state_value, payload.aposta) if finished else 0
        if payment:
            _change_chips(
                connection,
                campaign_id=payload.campanha_id,
                character_id=character["id"],
                user_id=user.id,
                delta=payment,
                reason="Pagamento do Cassino do Gambler: vinte_um",
                idempotency=f"{round_id}:pagamento",
            )
        result_value = {"resultado": state_value.get("resultado")} if finished else {}
        row = connection.execute(
            """
            INSERT INTO cassino_gambler_rodadas
                (id, campanha_id, personagem_id, usuario_id, jogo, moeda, aposta,
                 pagamento_maximo, pagamento, requisicao, estado, resultado,
                 status, dia_local, encerrada_em)
            VALUES (%s, %s, %s, %s, 'vinte_um', 'Fichas', %s, %s, %s, %s, %s, %s,
                    %s, %s, CASE WHEN %s THEN CURRENT_TIMESTAMP ELSE NULL END)
            RETURNING *
            """,
            (
                round_id, payload.campanha_id, character["id"], user.id, payload.aposta,
                maximum, payment, Jsonb(request_data), Jsonb(state_value), Jsonb(result_value),
                "liquidada" if finished else "ativa", day, finished,
            ),
        ).fetchone()
        record_audit(
            connection,
            action="cassino_gambler.vinte_um_iniciado",
            actor_user_id=user.id,
            campaign_id=payload.campanha_id,
            target_type="personagem",
            target_id=str(character["id"]),
            details={"aposta": payload.aposta, "natural": finished, "pagamento": payment},
        )
        return _round_response(connection, row, character)


@router.post("/vinte-um/{round_id}/agir")
def act_blackjack(
    round_id: UUID,
    payload: VinteUmAcaoInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        character = _selected_character(
            connection, payload.campanha_id, payload.personagem_id, user.id
        )
        row = connection.execute(
            "SELECT * FROM cassino_gambler_rodadas WHERE id=%s FOR UPDATE", (round_id,)
        ).fetchone()
        if (
            not row
            or row["campanha_id"] != payload.campanha_id
            or row["personagem_id"] != character["id"]
            or row["usuario_id"] != user.id
            or row["jogo"] != "vinte_um"
        ):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="rodada não encontrada")
        if row["status"] != "ativa":
            return _round_response(connection, row, character)
        if int(row["versao"]) != payload.versao:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="a rodada mudou; recarregue o estado atual")
        # Uma rodada iniciada antes da meia-noite continua pertencendo ao dia
        # em que a aposta original foi registrada. Assim, dobrar não escapa do
        # limite diário nem mistura uma mesma rodada em dois fechamentos.
        round_day = row["dia_local"]
        try:
            next_state = casino_rules.agir_vinte_um(row["estado"], payload.acao)
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(exc)) from exc

        total_bet = int(row["aposta"])
        if payload.acao == "dobrar":
            extra = total_bet
            _validate_bet(connection, payload.campanha_id, character["id"], extra, round_day)
            if total_bet + extra > _effective_config(connection, payload.campanha_id, character["id"])["aposta_maxima"]:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="a aposta dobrada ultrapassa o máximo da mesa")
            _change_chips(
                connection,
                campaign_id=payload.campanha_id,
                character_id=character["id"],
                user_id=user.id,
                delta=-extra,
                reason="Dobrou a aposta no Cassino do Gambler: vinte_um",
                idempotency=f"{round_id}:dobro",
            )
            total_bet += extra

        finished = next_state["status"] == "finalizada"
        payment = casino_rules.pagamento_vinte_um(next_state, total_bet) if finished else 0
        if payment:
            _change_chips(
                connection,
                campaign_id=payload.campanha_id,
                character_id=character["id"],
                user_id=user.id,
                delta=payment,
                reason="Pagamento do Cassino do Gambler: vinte_um",
                idempotency=f"{round_id}:pagamento",
            )
        result_value = {"resultado": next_state.get("resultado")} if finished else {}
        updated = connection.execute(
            """
            UPDATE cassino_gambler_rodadas
            SET aposta=%s, pagamento_maximo=%s, pagamento=%s, estado=%s,
                resultado=%s, status=%s, versao=versao+1,
                atualizado_em=CURRENT_TIMESTAMP,
                encerrada_em=CASE WHEN %s THEN CURRENT_TIMESTAMP ELSE NULL END
            WHERE id=%s RETURNING *
            """,
            (
                total_bet, casino_rules.pagamento(total_bet, 25_000), payment,
                Jsonb(next_state), Jsonb(result_value), "liquidada" if finished else "ativa",
                finished, round_id,
            ),
        ).fetchone()
        if finished:
            record_audit(
                connection,
                action="cassino_gambler.rodada_liquidada",
                actor_user_id=user.id,
                campaign_id=payload.campanha_id,
                target_type="personagem",
                target_id=str(character["id"]),
                details={"jogo": "vinte_um", "aposta": total_bet, "pagamento": payment},
            )
        return _round_response(connection, updated, character)


@router.post("/vinte-um/{round_id}/abandonar")
def abandon_blackjack(
    round_id: UUID,
    payload: VinteUmAbandonarInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        character = _selected_character(
            connection, payload.campanha_id, payload.personagem_id, user.id
        )
        row = connection.execute(
            "SELECT * FROM cassino_gambler_rodadas WHERE id=%s FOR UPDATE", (round_id,)
        ).fetchone()
        if (
            not row
            or row["campanha_id"] != payload.campanha_id
            or row["personagem_id"] != character["id"]
            or row["usuario_id"] != user.id
            or row["jogo"] != "vinte_um"
        ):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="rodada não encontrada")
        if row["status"] != "ativa":
            return _round_response(connection, row, character)
        if int(row["versao"]) != payload.versao:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="a rodada mudou; recarregue o estado atual")
        amount = int(row["aposta"])
        updated = connection.execute(
            """
            UPDATE cassino_gambler_rodadas
            SET pagamento=0, resultado=%s, status='liquidada', versao=versao+1,
                atualizado_em=CURRENT_TIMESTAMP, encerrada_em=CURRENT_TIMESTAMP
            WHERE id=%s RETURNING *
            """,
            (Jsonb({"resultado": "desistencia"}), round_id),
        ).fetchone()
        record_audit(
            connection,
            action="cassino_gambler.vinte_um_abandonado",
            actor_user_id=user.id,
            campaign_id=payload.campanha_id,
            target_type="personagem",
            target_id=str(character["id"]),
            details={"aposta_perdida": amount},
        )
        return _round_response(connection, updated, character)
