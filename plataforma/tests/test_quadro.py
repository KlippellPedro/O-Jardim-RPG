"""O quadro de investigação (core/quadro.py): quem cria, quem mexe, o que cada um enxerga."""

from __future__ import annotations

import pytest

from core import quadro as q


def _fazer(estado, acao, dados=None, *, quem="ana", nome="Ana", gestor=False):
    return q.aplicar(estado, acao, dados or {}, usuario_id=quem, nome=nome, gestor=gestor)


def _com_cartas():
    estado = q.quadro_vazio()
    estado = _fazer(estado, "carta", {"titulo": "A faca", "texto": "Sangue seco no cabo", "cor": "vermelho", "x": 100, "y": 100})
    estado = _fazer(estado, "carta", {"titulo": "O mordomo"}, quem="bia", nome="Bia")
    estado = _fazer(estado, "carta", {"titulo": "Cofre do porão", "texto": "Ninguém sabe ainda", "visivel": False}, quem="m", nome="Mestre", gestor=True)
    return estado


def test_carta_nova_nasce_com_autor_e_limites_e_exige_titulo_ou_texto():
    estado = _fazer(q.quadro_vazio(), "carta", {"titulo": "  Uma   pista ", "texto": "x" * 999, "cor": "azul", "x": -50, "y": 99999})
    carta = estado["cartas"][0]
    assert carta["titulo"] == "Uma pista" and len(carta["texto"]) == q.TEXTO_MAX and carta["cor"] == "azul"
    assert (carta["x"], carta["y"]) == (0.0, float(q.ALTURA)) and carta["autor"] == "ana" and carta["autor_nome"] == "Ana"
    assert carta["visivel"] is True
    for ruim in ({}, {"titulo": "   "}, {"titulo": "ok", "cor": "dourado"}, {"titulo": "ok", "x": "a"}):
        with pytest.raises(q.ErroQuadro):
            _fazer(q.quadro_vazio(), "carta", ruim)


def test_jogador_nao_cria_carta_escondida_e_o_mestre_cria():
    do_jogador = _fazer(q.quadro_vazio(), "carta", {"titulo": "ok", "visivel": False})
    assert do_jogador["cartas"][0]["visivel"] is True
    do_mestre = _fazer(q.quadro_vazio(), "carta", {"titulo": "segredo", "visivel": False}, quem="m", gestor=True)
    assert do_mestre["cartas"][0]["visivel"] is False


def test_o_jogador_so_enxerga_cartas_a_vista_e_os_barbantes_entre_elas():
    estado = _com_cartas()
    a, b, c = (carta["id"] for carta in estado["cartas"])
    estado = _fazer(estado, "ligar", {"de": a, "para": b})
    estado = _fazer(estado, "ligar", {"de": b, "para": c}, quem="m", gestor=True)
    do_mestre = q.quadro_de(estado, gestor=True)
    assert len(do_mestre["cartas"]) == 3 and len(do_mestre["ligacoes"]) == 2
    do_jogador = q.quadro_de(estado, gestor=False)
    assert [carta["titulo"] for carta in do_jogador["cartas"]] == ["A faca", "O mordomo"]
    assert do_jogador["ligacoes"] == [{"de": a, "para": b}], "o barbante que chega na carta escondida some junto"
    assert c not in str(do_jogador)
    # Revelada, a carta e o barbante aparecem.
    estado = _fazer(estado, "revelar", {"id": c, "visivel": True}, quem="m", gestor=True)
    assert len(q.quadro_de(estado, gestor=False)["cartas"]) == 3 and len(q.quadro_de(estado, gestor=False)["ligacoes"]) == 2


def test_jogador_nao_mexe_em_carta_escondida_nem_a_enxerga_para_ligar():
    estado = _com_cartas()
    a, _, c = (carta["id"] for carta in estado["cartas"])
    for acao, dados in (("mover", {"id": c, "x": 1, "y": 1}), ("apagar", {"id": c}), ("ligar", {"de": a, "para": c}), ("carta", {"id": c, "titulo": "x"})):
        with pytest.raises(q.ErroQuadro) as erro:
            _fazer(estado, acao, dados)
        assert erro.value.codigo == 404, acao
    with pytest.raises(q.ErroQuadro) as erro:
        _fazer(estado, "revelar", {"id": c}, gestor=False)
    assert erro.value.codigo == 403


def test_qualquer_um_move_mas_so_o_autor_e_o_mestre_editam_e_apagam():
    estado = _com_cartas()
    a, b, _ = (carta["id"] for carta in estado["cartas"])
    # A Bia move a carta da Ana (trabalho em grupo), mas não muda o texto nem apaga.
    movido = _fazer(estado, "mover", {"id": a, "x": 500, "y": 400}, quem="bia", nome="Bia")
    assert movido["cartas"][0]["x"] == 500.0
    for acao, dados in (("carta", {"id": a, "titulo": "outro"}), ("apagar", {"id": a})):
        with pytest.raises(q.ErroQuadro) as erro:
            _fazer(estado, acao, dados, quem="bia", nome="Bia")
        assert erro.value.codigo == 403
    # A Ana edita a dela; o Mestre edita e apaga qualquer uma.
    assert _fazer(estado, "carta", {"id": a, "titulo": "A faca de cozinha"})["cartas"][0]["titulo"] == "A faca de cozinha"
    assert len(_fazer(estado, "apagar", {"id": b}, quem="m", gestor=True)["cartas"]) == 2


def test_apagar_a_carta_leva_os_barbantes_e_ligar_nao_duplica_nem_liga_a_si_mesma():
    estado = _com_cartas()
    a, b, _ = (carta["id"] for carta in estado["cartas"])
    estado = _fazer(estado, "ligar", {"de": a, "para": b})
    estado = _fazer(estado, "ligar", {"de": b, "para": a})
    assert len(estado["ligacoes"]) == 1, "o barbante é o mesmo nos dois sentidos"
    with pytest.raises(q.ErroQuadro):
        _fazer(estado, "ligar", {"de": a, "para": a})
    assert _fazer(estado, "desligar", {"de": b, "para": a})["ligacoes"] == []
    estado = _fazer(estado, "apagar", {"id": a})
    assert estado["ligacoes"] == [] and len(estado["cartas"]) == 2


def test_limites_do_quadro_e_so_o_mestre_limpa():
    estado = q.quadro_vazio()
    for i in range(q.MAX_CARTAS_POR_JOGADOR):
        estado = _fazer(estado, "carta", {"titulo": f"c{i}"})
    with pytest.raises(q.ErroQuadro):
        _fazer(estado, "carta", {"titulo": "uma a mais"})
    assert len(_fazer(estado, "carta", {"titulo": "do mestre"}, quem="m", gestor=True)["cartas"]) == q.MAX_CARTAS_POR_JOGADOR + 1
    with pytest.raises(q.ErroQuadro) as erro:
        _fazer(estado, "limpar")
    assert erro.value.codigo == 403
    assert _fazer(estado, "limpar", quem="m", gestor=True) == q.quadro_vazio()
    with pytest.raises(q.ErroQuadro):
        _fazer(estado, "voar")


def test_registro_quebrado_no_banco_vira_quadro_vazio_ou_perde_so_o_que_esta_ruim():
    assert q.ler_quadro(None) == q.quadro_vazio() and q.ler_quadro("lixo") == q.quadro_vazio()
    lido = q.ler_quadro({
        "cartas": [{"id": "a", "titulo": "ok", "cor": "inventada", "x": "?"}, {"id": "b", "titulo": "bom", "x": 5, "y": 6}, 7, {"titulo": "sem id"}, {"id": "b", "titulo": "repetida"}],
        "ligacoes": [{"de": "b", "para": "zzz"}, {"de": "b", "para": "b"}, "x"],
    })
    assert [carta["id"] for carta in lido["cartas"]] == ["b"]
    assert lido["ligacoes"] == [] and lido["cartas"][0]["cor"] == "papel"
