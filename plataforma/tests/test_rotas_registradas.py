"""A tabela de rotas aponta para os handlers certos.

Os testes de rota chamam as funções direto (`create_character(...)`), então um
decorator colado no helper errado passa em tudo e só aparece no navegador:
`POST /personagens` respondeu 422 pedindo `connection`, `antes` e `depois` na
query, porque `@router.post("")` tinha ficado em cima de `_anunciar_nivel`.
Aqui a tabela é lida como o FastAPI a monta, sem banco.
"""

import importlib
import pkgutil
from collections import Counter

import pytest
from fastapi.routing import APIRoute

import routers


def _routers_da_plataforma():
    for info in pkgutil.iter_modules(routers.__path__):
        modulo = importlib.import_module(f"routers.{info.name}")
        roteador = getattr(modulo, "router", None)
        if roteador is not None:
            yield info.name, roteador


def _rotas():
    for nome, roteador in _routers_da_plataforma():
        for rota in roteador.routes:
            if isinstance(rota, APIRoute):
                yield nome, rota


ROTAS = list(_rotas())


def test_ha_rotas_para_conferir():
    assert len(ROTAS) > 100


@pytest.mark.parametrize("nome,rota", ROTAS, ids=lambda valor: getattr(valor, "path", valor))
def test_handler_de_rota_nao_e_helper_privado(nome, rota):
    """Helper começa com sublinhado; se o decorator foi parar nele, a rota some do handler de verdade."""
    assert not rota.endpoint.__name__.startswith("_"), (
        f"{nome}: {sorted(rota.methods)} {rota.path} aponta para o helper {rota.endpoint.__name__}"
    )


@pytest.mark.parametrize("nome,rota", ROTAS, ids=lambda valor: getattr(valor, "path", valor))
def test_rota_nao_pede_conexao_do_banco_na_query(nome, rota):
    """`connection` é o que os helpers recebem; numa rota ele só aparece quando o decorator foi parar num helper."""
    pedidos = {parametro.name for parametro in rota.dependant.query_params}
    assert "connection" not in pedidos, f"{nome}: {rota.path} pede {sorted(pedidos)} na query"


def test_nenhuma_rota_foi_registrada_duas_vezes():
    contagem = Counter((nome, metodo, rota.path) for nome, rota in ROTAS for metodo in rota.methods)
    repetidas = [chave for chave, vezes in contagem.items() if vezes > 1]
    assert not repetidas, f"rotas repetidas: {repetidas}"


@pytest.mark.parametrize(
    "caminho,metodo,handler",
    [
        ("/personagens", "POST", "create_character"),
        ("/personagens/{character_id}", "PUT", "update_character"),
    ],
)
def test_rotas_de_personagem_apontam_para_o_handler_esperado(caminho, metodo, handler):
    achadas = [
        rota.endpoint.__name__
        for nome, rota in ROTAS
        if nome == "characters" and rota.path == caminho and metodo in rota.methods
    ]
    assert achadas == [handler]
