import json
from uuid import uuid4

from core import live_session


def test_personagem_atualizado_chega_ao_assinante_com_id_e_versao():
    campanha_id = uuid4()
    personagem_id = uuid4()
    fila = live_session.assinar(campanha_id)
    try:
        live_session.publicar(
            campanha_id,
            "personagem_atualizado",
            7,
            {"personagem_id": str(personagem_id)},
        )
        mensagem = json.loads(fila.get_nowait())
        assert mensagem == {
            "tipo": "personagem_atualizado",
            "versao": 7,
            "personagem_id": str(personagem_id),
        }
    finally:
        live_session.cancelar(campanha_id, fila)


def test_evento_fica_isolado_na_campanha_correta():
    campanha_a = uuid4()
    campanha_b = uuid4()
    fila_a = live_session.assinar(campanha_a)
    fila_b = live_session.assinar(campanha_b)
    try:
        live_session.publicar(campanha_a, "personagem_atualizado", 2)
        assert json.loads(fila_a.get_nowait())["versao"] == 2
        assert fila_b.empty()
    finally:
        live_session.cancelar(campanha_a, fila_a)
        live_session.cancelar(campanha_b, fila_b)
