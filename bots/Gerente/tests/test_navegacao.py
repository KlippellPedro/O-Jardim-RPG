"""Dados da navegação manual do /regras."""

from __future__ import annotations

import sys
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE))

from core.navegacao import Navegacao


def test_carrega_todas_as_categorias():
    nav = Navegacao()
    assert nav.racas, "racas vazia"
    assert nav.classes, "classes vazia"
    assert nav.pericias, "pericias vazia"
    assert nav.legados, "legados vazia (base + novos)"
    assert len(nav.magias) == 28
    assert nav.fundamentos, "nenhuma seção de fundamentos"


def test_item_por_id():
    nav = Navegacao()
    humano = nav.item("racas", "humano")
    assert humano is not None
    assert humano["titulo"] == "Humano"
    assert nav.item("racas", "inexistente-xyz") is None


def test_busca_por_nome_prioriza_exato():
    nav = Navegacao()
    achados = nav.buscar_item("guerreiro")
    assert achados, "não achou Guerreiro"
    categoria, item = achados[0]
    assert categoria == "classes"
    assert item["titulo"] == "Guerreiro"


def test_pericias_agrupadas_por_atributo():
    nav = Navegacao()
    grupos = nav.pericias_por_atributo()
    assert grupos
    total = sum(len(v) for v in grupos.values())
    assert total == len(nav.pericias)


def test_pericias_tambem_podem_ser_navegadas_como_itens():
    nav = Navegacao()
    assert nav.itens("pericias") == nav.pericias
    primeira = nav.pericias[0]
    assert nav.item("pericias", primeira["id"]) == primeira


def test_pericias_preservam_detalhes_publicados():
    nav = Navegacao()
    ressonancia = nav.item("pericias", "ressonancia")
    assert ressonancia["descricao"]
    assert ressonancia["status"] == "aprovada"


def test_fundamentos_tem_titulo_e_texto():
    nav = Navegacao()
    secao = nav.fundamentos[0]
    assert secao["titulo"] and secao["texto"]
    assert nav.item("fundamentos", secao["id"]) == secao


def test_magias_podem_ser_navegadas_e_buscadas():
    nav = Navegacao()
    magia = nav.item("magias", "projetil-elemental")
    assert magia["custo_mana"] == 2
    assert nav.buscar_item("Projétil Elemental")[0] == ("magias", magia)
