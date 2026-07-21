"""
Testes do motor da economia — rodam SEM Discord/token.
Uso: python tests/test_economia.py   (a partir da pasta bots/banqueiro)
"""

import os
import sys
import tempfile
from datetime import datetime, timedelta, timezone
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE))

from core import economia
from core.db import SaldoInsuficiente
from tests.db_utils import novo_db

from core.catalogo import Catalogo


def test_resolver_preco():
    assert economia.resolver_preco(450, "Lunaris") == 450
    assert economia.resolver_preco(450, "Solares") == 450          # número vale em qualquer moeda
    assert economia.resolver_preco({"Lunaris": 40, "Solares": 5}, "solares") == 5
    assert economia.resolver_preco({"Lunaris": 40}, "Solares") is None
    assert economia.resolver_preco(None, "Lunaris") is None
    assert economia.resolver_preco(-3, "Lunaris") is None


def test_converter():
    # 100 Lunaris -> Solares (1 Solares = 10 Lunaris, taxa 2%): 100/10=10, *0.98=9.8 -> 9
    rec, taxa = economia.converter(100, "Lunaris", "Solares", 10, 0.02)
    assert rec == 9, (rec, taxa)
    # 10 Solares -> Lunaris: 10*10=100, *0.98=98, taxa 2
    rec, taxa = economia.converter(10, "Solares", "Lunaris", 10, 0.02)
    assert rec == 98 and taxa == 2, (rec, taxa)
    for entrada in [(-1, "Lunaris", "Solares"), (10, "Lunaris", "Lunaris"), (10, "Ecos", "Lunaris")]:
        try:
            economia.converter(*entrada)
            raise AssertionError(f"deveria ter falhado: {entrada}")
        except ValueError:
            pass


def test_cofre():
    assert economia.capacidade_do_cofre("comum") == 10
    assert economia.proximo_cofre("comum")["id"] == "prata"
    assert economia.proximo_cofre("eterno") is None
    assert economia.pode_guardar(9, 1, "comum") is True
    assert economia.pode_guardar(10, 1, "comum") is False


def test_seguranca_cofre():
    assert economia.defesa_seguranca("basica") == 0.50
    assert economia.proximo_seguranca("basica")["id"] == "fechadura"
    assert economia.proximo_seguranca("maximo") is None
    # Segurança Básica: 50% de defesa -> ladrão tem 50% de chance
    assert round(economia.chance_roubo_cofre("basica"), 2) == 0.50
    # nível 1 (Fechadura Reforçada): 70% de defesa -> ladrão tem 30% de chance
    assert round(economia.chance_roubo_cofre("fechadura"), 2) == 0.30
    # tiers comprados usam sempre o valor fixo da tabela, mesmo com /setroubo configurado
    assert round(economia.chance_roubo_cofre("fechadura", chance_base=0.9), 2) == 0.30
    # a chance do ladrão nunca cai abaixo do piso, mesmo com defesa configurada pertinho de 100%
    assert economia.chance_roubo_cofre("basica", chance_base=0.01) == economia.ROUBO_COFRE_CHANCE_MINIMA
    # chance_base configurado (ex.: /setroubo) só afeta quem tá na Segurança Básica
    assert round(economia.chance_roubo_cofre("basica", chance_base=0.5), 2) == 0.50


def test_capacidade_moeda_do_cofre():
    assert economia.capacidade_moeda_do_cofre("comum") == 300
    assert economia.pode_guardar_moeda(290, 10, "comum") is True
    assert economia.pode_guardar_moeda(291, 10, "comum") is False


def test_db():
    tmp = tempfile.mkdtemp()
    db = novo_db()
    g, u = "guild1", "user1"
    db.garantir_jogador(g, u)
    assert db.get_saldo(g, u, "Lunaris") == 20
    assert db.get_saldo(g, u, "Solares") == 0
    assert db.creditar(g, u, "Lunaris", 5) == 25
    assert db.debitar(g, u, "Lunaris", 10) == 15
    assert db.get_saldo(g, u, "lunaris") == 15                      # case-insensitive
    try:
        db.debitar(g, u, "Lunaris", 9999)
        raise AssertionError("deveria dar SaldoInsuficiente")
    except SaldoInsuficiente:
        pass
    db.add_item(g, u, "espada", "Espada", "arma", 1)
    db.add_item(g, u, "espada", "Espada", "arma", 1)
    assert db.contar_itens(g, u) == 2
    assert db.remover_item(g, u, "espada", 1) is True
    assert db.contar_itens(g, u) == 1
    assert db.remover_item(g, u, "naoexiste", 1) is False
    assert db.get_cofre_tier(g, u) == "comum"
    db.set_cofre_tier(g, u, "prata")
    assert db.get_cofre_tier(g, u) == "prata"
    assert db.get_cambio(g) == (10, 0.02)
    db.set_cambio(g, 8, 0.05)
    assert db.get_cambio(g) == (8, 0.05)


def test_db_cofre_saldo_e_roubo():
    db = novo_db()
    g, u = "guild2", "user2"
    db.garantir_jogador(g, u)

    assert db.get_cofre_saldo(g, u) == {}                            # nada guardado ainda
    assert db.creditar_cofre(g, u, "Lunaris", 30) == 30
    assert db.get_saldo_cofre(g, u, "lunaris") == 30                  # case-insensitive
    assert db.debitar_cofre(g, u, "Lunaris", 10) == 20
    try:
        db.debitar_cofre(g, u, "Lunaris", 9999)
        raise AssertionError("deveria dar SaldoInsuficiente")
    except SaldoInsuficiente:
        pass

    afetados = db.aplicar_juros_cofre(g, 0.10)                        # 10% de juros
    assert afetados == 1
    assert db.get_saldo_cofre(g, u, "Lunaris") == 22                  # 20 + floor(20*0.10)

    assert db.get_proxima_tentativa_roubo(g, u) is None
    daqui_1h = datetime.now(timezone.utc) + timedelta(hours=1)
    db.registrar_tentativa_roubo(g, u, daqui_1h)
    proxima = db.get_proxima_tentativa_roubo(g, u)
    assert proxima is not None and proxima > datetime.now(timezone.utc)


def test_db_seguranca_e_reset():
    db = novo_db()
    g, u = "guild3", "user3"
    db.garantir_jogador(g, u)

    assert db.get_seguranca_tier(g, u) == "basica"
    db.set_seguranca_tier(g, u, "fechadura")
    assert db.get_seguranca_tier(g, u) == "fechadura"

    db.creditar(g, u, "Lunaris", 50)
    db.add_item(g, u, "espada", "Espada", "arma", 1)
    db.creditar_cofre(g, u, "Lunaris", 30)
    db.set_cofre_tier(g, u, "prata")

    db.resetar_jogador(g, u)
    assert db.get_saldo(g, u, "Lunaris") == 20                       # voltou ao inicial
    assert db.contar_itens(g, u) == 0
    assert db.get_cofre_saldo(g, u) == {}
    assert db.get_cofre_tier(g, u) == "comum"
    assert db.get_seguranca_tier(g, u) == "basica"


def test_db_cooldown_cofre_e_protecao_vitima():
    db = novo_db()
    g, u = "guild4", "user4"
    db.garantir_jogador(g, u)

    assert db.get_proxima_tentativa_roubo_cofre(g, u) is None
    daqui_1h = datetime.now(timezone.utc) + timedelta(hours=1)
    db.registrar_tentativa_roubo_cofre(g, u, daqui_1h)
    assert db.get_proxima_tentativa_roubo_cofre(g, u) is not None

    assert db.get_protecao_vitima(g, u) is None
    db.registrar_protecao_vitima(g, u, daqui_1h)
    assert db.get_protecao_vitima(g, u) is not None


def test_db_recompensa():
    db = novo_db()
    g, alvo = "guild5", "alvo5"
    db.garantir_jogador(g, alvo)

    assert db.get_recompensa(g, alvo) == {"valor": 0, "tem_sistema": False}
    total = db.adicionar_recompensa(g, alvo, 50, sistema=False)
    assert total == 50
    total = db.adicionar_recompensa(g, alvo, 30, sistema=True)
    assert total == 80                                                 # acumula
    rec = db.get_recompensa(g, alvo)
    assert rec == {"valor": 80, "tem_sistema": True}                   # sistema fica True se qualquer parcela foi do sistema
    top = db.listar_recompensas(g)
    assert top and top[0]["alvo_user_id"] == alvo
    db.limpar_recompensa(g, alvo)
    assert db.get_recompensa(g, alvo)["valor"] == 0


def test_db_recompensa_sistema_some_sozinha_ao_quitar_divida():
    db = novo_db()
    g, alvo = "guild8", "alvo8"
    db.garantir_jogador(g, alvo)

    # alvo tem recompensa de jogador (50) + recompensa de sistema (30, por dívida)
    db.adicionar_recompensa(g, alvo, 50, sistema=False)
    db.adicionar_recompensa(g, alvo, 30, sistema=True)
    assert db.get_recompensa(g, alvo) == {"valor": 80, "tem_sistema": True}

    # devedor: nada muda ainda (continua em dívida)
    db.debitar(g, alvo, "Lunaris", 100, permitir_negativo_ate=200)
    assert db.limpar_recompensas_sistema_quitadas(g) == []
    assert db.get_recompensa(g, alvo) == {"valor": 80, "tem_sistema": True}

    # Receber dinheiro não quita a dívida.
    db.creditar(g, alvo, "Lunaris", 200)
    assert db.limpar_recompensas_sistema_quitadas(g) == []

    # O alvo escolhe pagar a própria dívida -> só a parte de sistema some.
    resultado = db.pagar_divida(g, alvo, 200)
    assert resultado["restante"] == 0
    afetados = db.limpar_recompensas_sistema_quitadas(g)
    assert afetados == [alvo]
    rec = db.get_recompensa(g, alvo)
    assert rec == {"valor": 50, "tem_sistema": False}                  # só sobra a parte do jogador
    assert db.listar_recompensas(g)[0]["valor"] == 50                  # não foi apagada, só reduzida


def test_db_divida_cresce_e_zera():
    db = novo_db()
    g, u = "guild6", "user6"
    db.garantir_jogador(g, u)                                          # saldo inicial: 20
    db.debitar(g, u, "Lunaris", 150, permitir_negativo_ate=200)         # dívida -> 130
    saldo = db.get_saldo(g, u, "Lunaris")
    assert saldo == 0
    divida = db.get_divida(g, u)
    assert divida == 130

    devedores = db.listar_devedores(g)
    assert any(d["user_id"] == u for d in devedores)

    nova_divida = db.aplicar_juros_divida(g, u, 0.10)
    assert nova_divida > divida

    perdoado = db.zerar_divida(g, u)
    assert perdoado == nova_divida
    assert db.get_saldo(g, u, "Lunaris") == 0
    assert db.get_divida(g, u) == 0
    assert db.zerar_divida(g, u) == 0                                  # nada pra perdoar na 2a vez


def test_db_avisos_pendentes():
    db = novo_db()
    g = "guild7"
    db.criar_aviso(g, "teste de aviso")  # Banqueiro só enfileira; quem lista/publica é o Jornalista.


def test_db_extrato():
    db = novo_db()
    g, u = "guild9", "user9"
    db.garantir_jogador(g, u)

    assert db.listar_extrato(g, u) == []
    db.registrar_extrato(g, u, -50, "Lunaris", "Compra: Espada")
    db.registrar_extrato(g, u, 0, "Lunaris", "Delta zero nao deveria gravar")
    db.registrar_extrato(g, u, 20, "Lunaris", "Venda: Escudo")
    registros = db.listar_extrato(g, u)
    assert len(registros) == 2                                          # delta=0 foi ignorado
    assert registros[0]["descricao"] == "Venda: Escudo"                 # mais recente primeiro
    assert registros[0]["delta"] == 20
    assert registros[1]["descricao"] == "Compra: Espada"
    assert registros[1]["delta"] == -50

    limitado = db.listar_extrato(g, u, limite=1)
    assert len(limitado) == 1 and limitado[0]["descricao"] == "Venda: Escudo"


def test_catalogo():
    cat = Catalogo()
    n, erros = cat.carregar_arquivo(str(BASE / "tests" / "fixtures" / "catalogo_teste.json"))
    assert n == 4, (n, erros)
    assert cat.get("espada-de-longinus").raridade == "lendario"
    assert cat.get("Espada de Longinus") is not None               # busca por título
    assert len(cat.listar("arma")) == 1
    assert cat.get("cristal-de-mana-bruto").preco == {"Lunaris": 40, "Solares": 5}


if __name__ == "__main__":
    testes = [v for k, v in sorted(globals().items()) if k.startswith("test_") and callable(v)]
    for fn in testes:
        fn()
        print("ok:", fn.__name__)
    print(f"\n✅ {len(testes)} grupos de teste passaram.")
