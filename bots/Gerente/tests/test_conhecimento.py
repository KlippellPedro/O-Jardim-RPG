"""Testes da busca extrativa do Gerente, sem Discord nem rede."""

from __future__ import annotations

import sys
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE))

from core.conhecimento import BaseConhecimento, normalizar


def _base() -> BaseConhecimento:
    return BaseConhecimento()


def test_carrega_as_sete_fontes_publicadas():
    base = _base()
    assert len(base.fontes) == 7
    assert len(base.trechos) >= 80


def test_busca_vida_negativa_encontra_secao_correta():
    resultados = _base().buscar("como funciona vida negativa e morrendo?")
    assert resultados
    assert "Vida negativa e Morrendo" in resultados[0].trecho.titulo


def test_busca_legado_esquiva_encontra_descricao():
    resultados = _base().buscar("o que o legado Esquiva dá?")
    assert resultados
    assert resultados[0].trecho.titulo == "Esquiva"
    assert "+2" in resultados[0].trecho.texto


def test_iniciativa_nao_e_inventada_como_pericia():
    resultados = _base().buscar("iniciativa é uma perícia?")
    assert resultados
    assert resultados[0].trecho.titulo == "Iniciativa"
    assert "Não é perícia" in resultados[0].trecho.texto


def test_atalho_hp_encontra_vida():
    resultados = _base().buscar("o que acontece com hp negativo?")
    assert resultados
    assert any("vida" in normalizar(item.trecho.titulo + item.trecho.texto) for item in resultados)


def test_arquivo_interno_do_mestre_nao_e_indexado():
    base = _base()
    assert all("mestre-v1" not in fonte for fonte in base.fontes)


def test_consulta_sem_correspondencia_retorna_vazio():
    assert _base().buscar("xilofonemaquinarionebuloso") == []


def test_normalizacao_remove_acentos_sem_perder_palavras():
    assert normalizar("Raças, Perícias e Constituição") == "racas pericias e constituicao"
