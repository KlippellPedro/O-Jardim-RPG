"""Fatos confirmados, escopo por servidor e persistência das conquistas."""
from datetime import datetime, timezone

from psycopg.types.json import Jsonb

from tests.db_utils import novo_db


def test_roubos_nao_contam_vitima_multas_ou_outro_servidor():
    db = novo_db()
    for i in range(10):
        db.registrar_extrato("g", "7", 500, "Lunaris", "Cofre arrombado de 8")
    db.registrar_extrato("g", "8", -500, "Lunaris", "Cofre arrombado por 7")
    db.registrar_extrato("g", "8", -20, "Lunaris", "Multa por roubo")
    db.registrar_extrato("g", "8", 20, "Solares", "Roubado de 7")
    db.registrar_extrato("outra", "8", 500, "Lunaris", "Roubado de 7")
    conquistados = db.avaliar_conquistas_secretas("g")
    assert {r["user_id"] for r in conquistados} == {"7"}
    assert {r["chave"] for r in conquistados} == {"dedos_leves", "sombra_lunar", "chave_mestra", "fortuna_alheia"}
    assert db.avaliar_conquistas_secretas("g") == conquistados
    with db._conn() as con:
        con.execute("DELETE FROM extrato WHERE guild_id='g'")
    assert db.avaliar_conquistas_secretas("g", "7") == conquistados
    assert db.listar_conquistas_secretas("g", "8") == []


def test_baus_contam_entrega_unica_nao_tentativas_ou_pendencias():
    db = novo_db()
    with db._conn() as con:
        for n in range(100):
            con.execute(
                """INSERT INTO baus_entregas (guild_id, mensagem_id, canal_id, vencedor_user_id,
                   idempotencia, premio, modo_entrega, status, tentativas)
                   VALUES ('g', %s, '1', '7', %s, %s, 'legado', %s, 4)""",
                (str(n), str(n), Jsonb({"bau": {"raridade": "mitico" if n == 0 else "comum"}}),
                 "entregue" if n < 50 else "pendente"),
            )
    assert {r["chave"] for r in db.avaliar_conquistas_secretas("g")} == {"farejador", "colecionador", "toque_mitico"}


def test_atividades_editoriais_so_contam_publicadas_e_desafios_resolvidos():
    db = novo_db()
    with db._conn() as con:
        for i in range(5):
            con.execute(
                """INSERT INTO jornal_desafios (token, guild_id, canal_id, autor_id, pergunta, resposta, recompensa, resolvido_por)
                   VALUES (%s, 'g', '1', '9', 'P?', 'R', 10, '7')""", (str(i),),
            )
        for i in range(3):
            con.execute("INSERT INTO entrevistas (guild_id, user_id, pergunta, resposta, status) VALUES ('g', '7', 'P?', 'R', 'publicada')")
            con.execute("INSERT INTO entrevistas (guild_id, user_id, pergunta, resposta, status) VALUES ('g', '8', 'P?', 'R', 'respondida')")
            con.execute("INSERT INTO jornal_pautas (guild_id, autor_id, titulo, corpo, status) VALUES ('g', '7', 'T', 'C', 'publicada')")
            con.execute("INSERT INTO jornal_pautas (guild_id, autor_id, titulo, corpo, status) VALUES ('g', '8', 'T', 'C', 'rascunho')")
        con.execute("INSERT INTO loteria_rodadas (guild_id, rodada_id, vencedor_user_id, total_bilhetes, participantes, premio) VALUES ('g', 'hoje', '7', 2, 1, 45)")
    for _ in range(5):
        db.registrar_extrato("g", "7", 50, "Solares", "Furo comprado pelo Jornalista")
        db.registrar_extrato("g", "7", 50, "Lunaris", "Recompensa por capturar 8")
    titulos = db.avaliar_conquistas_secretas("g")
    assert {r["user_id"] for r in titulos} == {"7"}
    assert {r["chave"] for r in titulos} == {"decifrador", "voz_jardim", "pena_lunar", "destino", "olho_rua", "cacador_lendas"}
    db.set_conquista_cargo("g", "decifrador", "123")
    db._init_schema()
    assert db.get_conquistas_cargos("g") == {"decifrador": "123"}
    assert db.get_conquistas_cargos("outra") == {}
