"""
Testes do loot dos baús automáticos: rodam SEM Discord.
Uso: python tests/test_loot.py  (a partir de bots/jornalista)
"""

import random
import json
import sys
from datetime import datetime, timedelta
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


def test_bau_com_varios_itens_nao_repete_o_mesmo_premio():
    catalogo = Catalogo()
    total, erros = catalogo.carregar_dados({
        "entradas": [
            {"tipo": "equipamento", "id": "a", "titulo": "A", "conteudo": {"raridade": "comum"}},
            {"tipo": "equipamento", "id": "b", "titulo": "B", "conteudo": {"raridade": "comum"}},
        ],
    })
    assert total == 2 and erros == []

    premio = loot.sortear_bau(
        catalogo, qtd_itens=5, rng=random.Random(4), pesos={"comum": 1}
    )
    ids = [item.id for item in premio["itens"]]
    assert len(ids) == 2
    assert len(ids) == len(set(ids))


def test_estacao_nao_sorteia_raridade_que_nao_declarou():
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


def test_catalogo_publicado_aceita_tipos_e_raridades_da_loja():
    caminho = BASE.parent.parent / "data" / "loja" / "catalogo.json"
    total_arquivo = len(json.loads(caminho.read_text(encoding="utf-8"))["entradas"])
    catalogo = Catalogo()
    total, erros = catalogo.carregar_arquivo(str(caminho))

    assert total == total_arquivo
    assert erros == []
    assert catalogo.get("reliquia-excalibur").raridade == "reliquia da criacao"
    assert catalogo.get("reliquia-excalibur").raridade_rotulo == "Relíquia da Criação"
    assert catalogo.get("fruto-chamas").tipo == "fruto-eden"
    assert catalogo.get("selo-nova-tentativa").tipo == "consumivel"
    assert catalogo.get("reliquia-manto-abismo").tipo == "artefato"
    assert catalogo.get("artefato-calice-sangue").raridade == "reliquia"
    assert catalogo.get("artefato-calice-sangue").raridade_rotulo == "Mítico"


def test_bau_nao_entrega_bens_veiculos_nem_contratos_de_monstro():
    catalogo = Catalogo()
    total, erros = catalogo.carregar_dados({
        "entradas": [
            {"tipo": "veiculo", "id": "motor", "titulo": "Motor", "conteudo": {"raridade": "comum"}},
            {"tipo": "veiculo-completo", "id": "moto", "titulo": "Moto", "conteudo": {"raridade": "comum"}},
            {"tipo": "monstro", "id": "lobo", "titulo": "Lobo", "conteudo": {"raridade": "comum"}},
            {"tipo": "equipamento", "id": "corda", "titulo": "Corda", "conteudo": {"raridade": "comum"}},
        ],
    })
    assert total == 4 and erros == []

    item = loot.sortear_item(catalogo, rng=random.Random(0), pesos={"comum": 1})
    assert item.id == "corda"
    assert loot.sortear_item(
        catalogo, rng=random.Random(0), pesos={"comum": 1}, tipos=["veiculo"]
    ) is None


def test_agendar_proximo_futuro():
    rng = random.Random(2)
    base = datetime(2026, 7, 15, 23, 0, 0, tzinfo=loot.TZ) if loot.TZ else datetime(2026, 7, 15, 23, 0, 0)
    prox = loot.agendar_proximo(10, 22, rng=rng, agora=base)
    assert prox > base                      # sempre no futuro
    assert 10 <= prox.hour <= 22            # dentro da janela
    assert prox <= base + timedelta(days=1)


def test_agendar_proximo_janela_invertida():
    # min > max deve ser tolerado (troca)
    prox = loot.agendar_proximo(22, 8, rng=random.Random(3),
                                agora=datetime(2026, 1, 1, 0, 0, 0, tzinfo=loot.TZ) if loot.TZ else datetime(2026, 1, 1))
    assert 8 <= prox.hour <= 22


if __name__ == "__main__":
    testes = [v for k, v in sorted(globals().items()) if k.startswith("test_") and callable(v)]
    for fn in testes:
        fn()
        print("ok:", fn.__name__)
    print(f"\n✅ {len(testes)} testes de loot passaram.")
