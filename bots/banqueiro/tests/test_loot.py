"""
Testes do loot dos baús: rodam SEM Discord.
Uso: python tests/test_loot.py  (a partir de bots/banqueiro)
"""

import random
import json
import sys
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE))

from core.catalogo import Catalogo
from core import loot


def _catalogo() -> Catalogo:
    c = Catalogo()
    c.carregar_arquivo(str(BASE / "tests" / "fixtures" / "catalogo_teste.json"))
    return c


def test_sortear_bau():
    cat = _catalogo()
    rng = random.Random(1)
    premio = loot.sortear_bau(cat, qtd_itens=2, rng=rng)
    assert 5 <= premio["lunaris"] <= 40, premio["lunaris"]
    assert len(premio["itens"]) == 2
    for it in premio["itens"]:
        assert it.raridade in loot.PESOS_RARIDADE


def test_sortear_bau_catalogo_vazio():
    premio = loot.sortear_bau(Catalogo(), qtd_itens=3, rng=random.Random(0))
    assert premio["itens"] == []            # sem itens, mas ainda dá Lunaris
    assert 5 <= premio["lunaris"] <= 40


def test_perfil_nao_sorteia_raridade_que_nao_declarou():
    catalogo = Catalogo()
    total, erros = catalogo.carregar_dados({
        "entradas": [{
            "tipo": "arma",
            "id": "reliquia-teste",
            "titulo": "Relíquia Teste",
            "conteudo": {"raridade": "relíquia da criação"},
        }],
    })
    assert total == 1 and erros == []
    assert loot.sortear_item(
        catalogo,
        rng=random.Random(0),
        pesos={"comum": 100},
    ) is None


def test_semente_completa_aceita_tipos_e_raridades_da_loja():
    caminho = BASE.parent.parent / "data" / "loja" / "catalogo.json"
    entradas = json.loads(caminho.read_text(encoding="utf-8"))["entradas"]
    total_arquivo = len(entradas)
    catalogo = Catalogo()
    total, erros = catalogo.carregar_arquivo(str(caminho))

    assert total == total_arquivo
    assert erros == []
    assert catalogo.get("reliquia-excalibur").raridade == "reliquia da criacao"
    assert catalogo.get("reliquia-excalibur").raridade_rotulo == "Relíquia da Criação"
    assert catalogo.get("veiculo-moto-flutuadora").tipo == "veiculo-completo"
    assert catalogo.get("artefato-grimorio-arcanis").tipo == "artefato"
    assert catalogo.get("selo-diagnostico").tipo == "consumivel"
    assert catalogo.get("implante-memoria-espelhada").tipo == "implante"
    assert sum(bool(item["conteudo"].get("promocao", {}).get("ativa")) for item in entradas) == 3
    assert catalogo.get("reliquia-murasame").preco == {"Fragmentos de Estrela": 750}


def test_catalogo_rejeita_id_duplicado_e_raridade_desconhecida():
    entrada = {
        "tipo": "arma",
        "id": "teste",
        "titulo": "Teste",
        "conteudo": {"raridade": "raro"},
    }
    catalogo = Catalogo()
    total, erros = catalogo.carregar_dados({
        "entradas": [
            entrada,
            {**entrada, "titulo": "Duplicado"},
            {**entrada, "id": "erro-raridade", "conteudo": {"raridade": "rarissima"}},
        ],
    })

    assert total == 1
    assert any("id duplicado" in erro for erro in erros)
    assert any("raridade desconhecida" in erro for erro in erros)


if __name__ == "__main__":
    testes = [v for k, v in sorted(globals().items()) if k.startswith("test_") and callable(v)]
    for fn in testes:
        fn()
        print("ok:", fn.__name__)
    print(f"\n✅ {len(testes)} testes de loot passaram.")
