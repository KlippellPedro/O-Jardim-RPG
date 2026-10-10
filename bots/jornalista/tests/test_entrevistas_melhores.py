"""Entrevistas: banco maior, sem repetir as últimas e com perguntas de Árvore."""

from __future__ import annotations

import random
import sys
from pathlib import Path
from types import SimpleNamespace

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE))

from cogs.entrevista import Entrevista
from core import entrevista_perguntas as banco
from tests.db_utils import novo_db

G = "100"


def test_banco_tem_muitas_perguntas_sem_repeticao_e_sem_vicios_de_texto():
    assert len(banco.PERGUNTAS) >= 40 and len(set(banco.PERGUNTAS)) == len(banco.PERGUNTAS)
    for texto in (*banco.PERGUNTAS, *banco.PERGUNTAS_ARVORE):
        assert texto.endswith("?") and "—" not in texto and "–" not in texto
        assert "eco" not in texto.lower().split()


def test_pergunta_de_arvore_so_aparece_para_quem_tem_arvore():
    sem = {banco.sortear_pergunta(random.Random(i)) for i in range(300)}
    assert sem <= set(banco.PERGUNTAS)
    com = {banco.sortear_pergunta(random.Random(i), arvore="Vórtice") for i in range(300)}
    assert any("Vórtice" in p for p in com) and "{arvore}" not in " ".join(com)


def test_sorteio_evita_as_perguntas_recentes_enquanto_houver_outras():
    recentes = list(banco.PERGUNTAS[:-1])
    for i in range(50):
        assert banco.sortear_pergunta(random.Random(i), recentes=recentes) == banco.PERGUNTAS[-1]
    # com tudo recente, ainda sorteia em vez de quebrar
    assert banco.sortear_pergunta(random.Random(1), recentes=list(banco.PERGUNTAS)) in banco.PERGUNTAS


def test_perguntas_recentes_vem_do_banco_mais_novas_primeiro():
    db = novo_db()
    for texto in ("a?", "b?", "c?"):
        db.criar_entrevista(G, "1", texto)
    db.criar_entrevista("outra", "1", "z?")
    assert db.perguntas_recentes_entrevista(G, 2) == ["c?", "b?"]


def test_arvore_do_entrevistado_vem_do_cargo_registrado():
    db = SimpleNamespace(get_cargos_arvore=lambda gid: {"ignis": "10", "erebus": "20"})
    cog = Entrevista.__new__(Entrevista)
    cog.bot = SimpleNamespace(db=db)
    membro = SimpleNamespace(roles=[SimpleNamespace(id=1), SimpleNamespace(id=10)])
    assert cog._arvore_do_membro(G, membro) == "Vórtice"
    assert cog._arvore_do_membro(G, SimpleNamespace(roles=[SimpleNamespace(id=5)])) is None

    def quebrado(_gid):
        raise RuntimeError("banco fora")

    cog.bot = SimpleNamespace(db=SimpleNamespace(get_cargos_arvore=quebrado))
    assert cog._arvore_do_membro(G, membro) is None
