"""ciclo_guild_devido: gate dos ciclos periódicos (juros, dívida, câmbio, seguros).

Os loops rodam de hora em hora e o gate decide a cadência real. O carimbo é
gravado depois do trabalho do tick, então sem folga o ciclo de 24h virava 25h.

Só roda com TEST_DATABASE_URL (Postgres descartável)."""

from __future__ import annotations

import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE))

from core import db as db_mod
from tests.db_utils import novo_db

G = "555000111"


def _carimbar(db, ciclo, quando):
    with db._conn() as con:
        con.execute(
            """INSERT INTO ciclos_guild (guild_id, ciclo, executado_em) VALUES (%s, %s, %s)
               ON CONFLICT (guild_id, ciclo) DO UPDATE SET executado_em=EXCLUDED.executado_em""",
            (G, ciclo, quando),
        )


def test_ciclo_de_24h_roda_no_tick_exato_de_24h_mesmo_com_o_carimbo_atrasado():
    """O carimbo é gravado depois do trabalho. O tick 24h depois ainda via o
    carimbo como recente e o ciclo só rodava na hora seguinte (25h)."""
    db = novo_db()
    atraso_do_trabalho = timedelta(milliseconds=300)
    _carimbar(db, "juros_cofre", datetime.now(timezone.utc) - timedelta(hours=24) + atraso_do_trabalho)
    assert db.ciclo_guild_devido(G, "juros_cofre", 24) is True


def test_ciclo_nao_antecipa_uma_rodada_inteira():
    """A folga é pequena perto do período do loop (1h): 23h depois não pode rodar."""
    db = novo_db()
    _carimbar(db, "juros_cofre", datetime.now(timezone.utc) - timedelta(hours=23))
    assert db.ciclo_guild_devido(G, "juros_cofre", 24) is False
    _carimbar(db, "juros_cofre", datetime.now(timezone.utc) - timedelta(hours=23, minutes=30))
    assert db.ciclo_guild_devido(G, "juros_cofre", 24) is False
    assert db_mod.CICLO_TOLERANCIA < timedelta(hours=1)
