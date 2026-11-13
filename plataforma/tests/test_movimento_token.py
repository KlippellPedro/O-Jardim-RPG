"""O Movimento que o servidor manda no token (core/movimento_token.py) e quem o recebe (core/mapa.py)."""

from __future__ import annotations

from core import mapa, movimento_token
from core.mapa import Espectador

MESTRE = Espectador(usuario_id="m", gestor=True)
ANA = Espectador(usuario_id="ana", gestor=False, personagens=frozenset({"p-ana"}))
BRUNO = Espectador(usuario_id="bruno", gestor=False, personagens=frozenset({"p-bruno"}))


def ficha(movimento=9, **extra):
    base = {"derivados": {"movimento": movimento}}
    base.update(extra)
    return base


def token_da_ana():
    return {"id": "t1", "x": 150.0, "y": 250.0, "porte": 1, "lado": "jogador", "oculto": False, "barras": {},
            "personagem_id": "p-ana", "participante_id": None, "imagem_id": None, "nome": "Ana"}


# -------------------------------------------------------------------- a conta

def test_ficha_sem_movimento_guardado_anda_o_padrao():
    assert movimento_token.da_ficha({}) == 9.0
    assert movimento_token.da_ficha(None) == 9.0
    assert movimento_token.da_ficha({"derivados": {"movimento": "rapido"}}) == 9.0
    assert movimento_token.da_ficha({"derivados": {"movimento": True}}) == 9.0


def test_vale_o_movimento_guardado_na_ficha():
    assert movimento_token.da_ficha(ficha(12)) == 12.0
    assert movimento_token.da_ficha(ficha(4.5)) == 4.5


def test_cansaco_alto_corta_pela_metade():
    assert movimento_token.da_ficha(ficha(9, status={"cansacoAtual": 4})) == 9.0
    assert movimento_token.da_ficha(ficha(9, status={"cansacoAtual": 5})) == 4.5


def test_lento_corta_e_apressado_soma_e_os_dois_juntos_se_anulam():
    assert movimento_token.da_ficha(ficha(9), ["Lento"]) == 4.0
    assert movimento_token.da_ficha(ficha(9), ["Apressado"]) == 12.0
    assert movimento_token.da_ficha(ficha(9), ["Lento", "Apressado"]) == 9.0


def test_lesao_de_perna_corta_uma_vez_so_mesmo_com_lento():
    perna = ficha(9, condicoesAtivas=[{"id": "perna-quebrada", "nome": "Perna Quebrada"}])
    assert movimento_token.da_ficha(perna) == 4.0
    assert movimento_token.da_ficha(perna, ["Lento"]) == 4.0
    assert movimento_token.da_ficha(ficha(9, condicoesAtivas=["Perda de uma Perna"])) == 4.0


def test_quem_nao_pode_se_mover_fica_com_zero():
    for condicao in ("Agarrado", "Imobilizado", "Paralisado", "Inconsciente"):
        assert movimento_token.da_ficha(ficha(12), [condicao]) == 0.0
    # A condição pode estar só na ficha, com acento e maiúscula.
    assert movimento_token.da_ficha(ficha(12, condicoesAtivas=[{"titulo": "INCONSCIENTE"}])) == 0.0


def test_condicao_que_nao_mexe_em_movimento_nao_muda_nada():
    assert movimento_token.da_ficha(ficha(9), ["Envenenado", "Cego", ""]) == 9.0
    assert movimento_token.da_ficha(ficha(9), "Lento") == 9.0  # texto solto não é lista de condições


# ---------------------------------------------------------------- quem recebe

def test_movimento_vai_para_o_dono_e_para_o_mestre():
    for quem in (ANA, MESTRE):
        visto = mapa.visao_token(token_da_ana(), None, quem, livre=False, movimento=12.0)
        assert visto["movimento"] == 12.0


def test_outro_jogador_nao_recebe_o_movimento():
    visto = mapa.visao_token(token_da_ana(), None, BRUNO, livre=False, movimento=12.0)
    assert visto is not None
    assert "movimento" not in visto


def test_token_sem_ficha_nao_ganha_o_campo():
    visto = mapa.visao_token(token_da_ana(), None, MESTRE, livre=False)
    assert "movimento" not in visto
