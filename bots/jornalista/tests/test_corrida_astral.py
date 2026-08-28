from datetime import date, datetime, timedelta, timezone

from psycopg.types.json import Jsonb

from core import cassino
from tests.db_utils import novo_db


class _Raposa:
    @staticmethod
    def randrange(_total):
        return 0


class _Golem:
    @staticmethod
    def randrange(_total):
        return 99


def _preparar(db, apostas):
    with db._conn() as con:
        corrida = con.execute(
            """
            INSERT INTO cassino_corridas (guild_id, slot_id, fecha_em)
            VALUES ('g', %s, %s) RETURNING *
            """,
            (f"slot-{len(apostas)}-{id(db)}", datetime.now(timezone.utc) - timedelta(minutes=1)),
        ).fetchone()
        for indice, (usuario, corredor, valor) in enumerate(apostas):
            db._garantir_jogador(con, "g", usuario)
            con.execute(
                "UPDATE carteira SET saldo=saldo-%s WHERE guild_id='g' AND user_id=%s AND moeda='Lunaris'",
                (valor, usuario),
            )
            rodada_id = f"r-{corrida['id']}-{indice}"
            con.execute(
                """
                INSERT INTO cassino_rodadas
                    (id, guild_id, user_id, jogo, aposta, pagamento_maximo, estado, dia_local)
                VALUES (%s, 'g', %s, 'corrida', %s, 2147483647, %s, %s)
                """,
                (rodada_id, usuario, valor, Jsonb({"corredor": corredor}), date(2026, 8, 27)),
            )
            con.execute(
                """
                INSERT INTO cassino_corrida_apostas
                    (rodada_id, corrida_id, guild_id, user_id, corredor, valor)
                VALUES (%s, %s, 'g', %s, %s, %s)
                """,
                (rodada_id, corrida["id"], usuario, corredor, valor),
            )
    return dict(corrida)


def _saldo(db, usuario):
    with db._conn() as con:
        return int(con.execute(
            "SELECT saldo FROM carteira WHERE guild_id='g' AND user_id=%s AND moeda='Lunaris'",
            (usuario,),
        ).fetchone()["saldo"])


def test_corrida_paga_o_bolo_inteiro_e_e_idempotente():
    db = novo_db()
    corrida = _preparar(db, [("u", "raposa", 10), ("v", "cervo", 10)])
    primeira = db.liquidar_corrida_atomica(corrida["id"], rng=_Raposa())
    segunda = db.liquidar_corrida_atomica(corrida["id"], rng=_Raposa())
    assert primeira["nova"] is True
    assert primeira["vencedor"] == "raposa"
    assert primeira["total_apostado"] == 20
    assert primeira["total_pago"] == 20
    assert segunda["nova"] is False
    assert _saldo(db, "u") == 30
    assert _saldo(db, "v") == 10
    assert next(p for p in primeira["pagamentos"] if p["user_id"] == "u")["conquista_nova"] is True
    with db._conn() as con:
        assert con.execute(
            "SELECT chave FROM cassino_conquistas WHERE guild_id='g' AND user_id='u'"
        ).fetchone()["chave"] == "apostador_astral"


def test_sem_aposta_no_vencedor_devolve_o_bolo_inteiro_proporcionalmente():
    db = novo_db()
    corrida = _preparar(db, [("u", "raposa", 10), ("v", "cervo", 10)])
    resultado = db.liquidar_corrida_atomica(corrida["id"], rng=_Golem())
    assert resultado["sem_aposta_vencedora"] is True
    assert resultado["total_pago"] == 20
    assert _saldo(db, "u") == 20
    assert _saldo(db, "v") == 20


def test_sorteio_publica_pesos_declarados():
    assert sum(info["peso"] for info in cassino.CORREDORES_ASTRAIS.values()) == 100
    assert {info["peso"] for info in cassino.CORREDORES_ASTRAIS.values()} == {25}
    assert cassino.CORRIDA_CORTE_BP == 0


def test_rateio_distribui_tambem_o_resto_inteiro():
    db = novo_db()
    corrida = _preparar(db, [("u", "raposa", 1), ("v", "raposa", 1), ("w", "cervo", 1)])
    resultado = db.liquidar_corrida_atomica(corrida["id"], rng=_Raposa())
    assert resultado["total_apostado"] == 3
    assert resultado["total_pago"] == 3
    assert sorted(p["pagamento"] for p in resultado["pagamentos"] if p["corredor"] == "raposa") == [1, 2]
    assert cassino.sortear_corredor(rng=_Raposa()) == "raposa"
    assert cassino.sortear_corredor(rng=_Golem()) == "golem"
