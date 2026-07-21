"""Testes de core/menu.py — cardápio é dado puro, sem discord.py nem banco."""

import sys
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE))

from core import menu


def test_cardapio_nao_esta_vazio():
    assert len(menu.CARDAPIO) > 0


def test_cardapio_ids_sao_unicos():
    ids = [item.id for item in menu.CARDAPIO]
    assert len(ids) == len(set(ids))


def test_cardapio_precos_positivos():
    assert all(item.preco > 0 for item in menu.CARDAPIO)


def test_cardapio_campos_de_texto_preenchidos():
    for item in menu.CARDAPIO:
        assert item.nome.strip()
        assert item.descricao.strip()
        assert item.buff.strip()


def test_obter_por_id_existente():
    primeiro = menu.CARDAPIO[0]
    assert menu.obter(primeiro.id) == primeiro


def test_obter_por_id_inexistente_devolve_none():
    assert menu.obter("bebida-que-nao-existe") is None
