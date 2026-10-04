"""Mercadoria quente (Calor ao vender ao doleiro) e encomendas ao contrabandista (pagas em Créditos Sombrios)."""
import asyncio
from datetime import datetime, timedelta, timezone
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from cogs.mercado_negro import MercadoNegro, VenderAoDoleiroView, _encomendavel
from core import economia
from core.catalogo import Catalogo
from core.db import EncomendasDemais, SaldoInsuficiente
from core.inventario import ItemPossuido
from tests.db_utils import novo_db

CATALOGO = Catalogo()
CATALOGO.carregar_arquivo(str(Path(__file__).resolve().parents[3] / "data" / "loja" / "catalogo.json"))
ITEM = next(
    i for i in CATALOGO.listar()
    if i.tipo == "equipamento" and (economia.valor_em_solares(i.conteudo.get("preco")) or 0) >= 40 and _encomendavel(i)
)
ENCOMENDAVEIS = [i for i in CATALOGO.listar() if _encomendavel(i)]


def _interacao(user_id=7):
    return SimpleNamespace(
        id=99, guild_id=1, user=SimpleNamespace(id=user_id),
        response=SimpleNamespace(send_message=AsyncMock(), edit_message=AsyncMock()),
    )


class _Inventario:
    def __init__(self, itens=(), falha_ao_dar=None):
        self.itens = {p.item_id: p for p in itens}
        self.tirados, self.entregues = [], []
        self.falha_ao_dar = falha_ao_dar

    async def listar(self, sid, uid):
        return list(self.itens.values())

    async def tirar(self, sid, uid, item_id, quantidade=1, *, motivo, chave):
        self.tirados.append((item_id, quantidade))
        return self.itens[item_id]

    async def dar(self, sid, uid, item_id, titulo, tipo, quantidade=1, dados=None, *, motivo, chave):
        if self.falha_ao_dar:
            raise self.falha_ao_dar
        self.entregues.append((uid, item_id, quantidade, chave))
        return "cofre"


def _cog(db, inventario):
    return MercadoNegro(SimpleNamespace(db=db, inventario=inventario, catalogo=CATALOGO))


# ───────────────────────────────────────────────────────── regras puras

def test_calor_da_mercadoria_quente_soma_por_unidade_e_nunca_passa_do_maximo():
    assert economia.calor_da_mercadoria_quente(0) == 0
    assert economia.calor_da_mercadoria_quente(1) == economia.CALOR_POR_UNIDADE_QUENTE
    assert economia.calor_da_mercadoria_quente(5) == 5 * economia.CALOR_POR_UNIDADE_QUENTE
    assert economia.calor_da_mercadoria_quente(500) == economia.ROUBO_CALOR_MAXIMO
    with pytest.raises(ValueError):
        economia.calor_da_mercadoria_quente(-1)


def test_a_marca_de_quente_nunca_vale_mais_que_a_posse_nem_que_a_venda():
    assert economia.unidades_quentes_na_venda(5, 3, 10) == 3  # só tem 3 em mão
    assert economia.unidades_quentes_na_venda(5, 10, 2) == 2  # vendeu só 2
    assert economia.unidades_quentes_na_venda(0, 10, 10) == 0
    with pytest.raises(ValueError):
        economia.unidades_quentes_na_venda(-1, 1, 1)


def test_encomenda_custa_mais_que_o_doleiro_paga_de_volta_em_todo_o_catalogo():
    """Encomendar e revender nunca dá lucro: o ágio é de 50% e o doleiro paga no máximo 46%."""
    dia = datetime(2026, 2, 1).date()
    while economia.fator_do_doleiro(dia) < 1.14:
        dia += timedelta(days=1)
    assert len(ENCOMENDAVEIS) > 200
    for item in ENCOMENDAVEIS:
        preco = item.conteudo.get("preco")
        custo = economia.creditos_da_encomenda(preco, 1)
        volta = economia.oferta_do_doleiro(preco, 1, dia)
        assert custo >= 1 and volta < custo, item.id
        # Em lote o arredondamento ajuda um pouco, mas a revenda continua dando prejuízo.
        assert economia.oferta_do_doleiro(preco, 10, dia) < economia.creditos_da_encomenda(preco, 10) <= custo * 10, item.id


def test_prazo_da_encomenda_cresce_com_o_valor():
    assert [economia.horas_da_encomenda(v) for v in (1, 49.9, 50, 499, 500, 4999, 5000, 10**6)] == [12, 12, 24, 24, 48, 48, 96, 96]


def test_o_que_o_contrabandista_nao_encomenda():
    nao = [i for i in CATALOGO.listar() if not _encomendavel(i)]
    for item in nao:
        assert (
            item.tipo in economia.ENCOMENDA_NAO_ACEITA
            or item.conteudo.get("disponivelNaLoja") is False
            or item.conteudo.get("mercado_negro")
            or economia.normalizar(str(item.conteudo.get("raridade") or "")) in economia.ENCOMENDA_RARIDADES_FORA
            or economia.valor_em_solares(item.conteudo.get("preco")) is None
        ), item.id
    assert not any(i.tipo in {"implante", "fruto-eden", "monstro", "propriedade"} for i in ENCOMENDAVEIS)


@pytest.mark.parametrize("quantidade", [0, 11, -1, 2.5, True])
def test_quantidade_invalida_de_encomenda(quantidade):
    with pytest.raises(ValueError):
        economia.creditos_da_encomenda({"Solares": 10}, quantidade)


# ───────────────────────────────────────────────────────── banco: mercadoria quente

def test_marcar_somar_e_limpar_a_mercadoria_quente():
    db = novo_db()
    assert db.marcar_mercadoria_quente("1", "7", "espada", 2) == 2
    assert db.marcar_mercadoria_quente("1", "7", "espada", 3) == 5
    assert db.get_mercadoria_quente("1", "7") == {"espada": 5}
    assert db.get_mercadoria_quente("1", "8") == {}
    assert db.limpar_mercadoria_quente("1", "7", "espada") == 1
    assert db.get_mercadoria_quente("1", "7") == {}
    with pytest.raises(ValueError):
        db.marcar_mercadoria_quente("1", "7", "espada", 0)


def test_vender_quente_soma_calor_e_gasta_a_marca_na_mesma_transacao():
    db = novo_db()
    db.marcar_mercadoria_quente("1", "7", "espada", 3)
    saldo = db.receber_do_doleiro("1", "7", 40, "venda", item_id="espada", quentes=2)
    assert saldo == 40
    assert db.get_mercadoria_quente("1", "7") == {"espada": 1}
    assert db.get_calor_roubo("1", "7") == 2 * economia.CALOR_POR_UNIDADE_QUENTE
    db.receber_do_doleiro("1", "7", 10, "venda", item_id="espada", quentes=1)
    assert db.get_mercadoria_quente("1", "7") == {}
    assert db.get_calor_roubo("1", "7") == 3 * economia.CALOR_POR_UNIDADE_QUENTE
    # Venda comum não mexe no Calor.
    db.receber_do_doleiro("1", "7", 10, "venda comum")
    assert db.get_calor_roubo("1", "7") == 3 * economia.CALOR_POR_UNIDADE_QUENTE
    with pytest.raises(ValueError):
        db.receber_do_doleiro("1", "7", 10, "sem item", quentes=1)


def test_a_marca_some_junto_com_o_reset_do_jogador():
    db = novo_db()
    db.marcar_mercadoria_quente("1", "7", "espada", 3)
    db.resetar_jogador("1", "7")
    assert db.get_mercadoria_quente("1", "7") == {}


# ───────────────────────────────────────────────────────── cog: doleiro com mercadoria quente

def _vender(db, inventario, item, quantidade):
    interacao = _interacao()
    asyncio.run(MercadoNegro.mercado_negro_vender.callback(_cog(db, inventario), interacao, item.id, quantidade))
    return interacao


def test_a_oferta_avisa_do_calor_e_o_aceite_cobra_o_calor():
    db = novo_db()
    inventario = _Inventario([ItemPossuido(ITEM.id, ITEM.titulo, ITEM.tipo, 3)])
    db.marcar_mercadoria_quente("1", "7", ITEM.id, 2)
    interacao = _vender(db, inventario, ITEM, 3)
    embed = interacao.response.send_message.await_args.kwargs["embed"]
    view = interacao.response.send_message.await_args.kwargs["view"]
    assert "mercadoria quente" in embed.description and "Calor" in embed.description
    assert view.quentes == 2
    assert db.get_calor_roubo("1", "7") == 0, "ver a oferta não esquenta ninguém"
    asyncio.run(view.aceitar.callback(_interacao()))
    assert db.get_calor_roubo("1", "7") == 2 * economia.CALOR_POR_UNIDADE_QUENTE
    assert db.get_mercadoria_quente("1", "7") == {}
    mensagem = (_interacao().response.edit_message,)
    assert mensagem


def test_venda_comum_nao_menciona_nem_soma_calor():
    db = novo_db()
    inventario = _Inventario([ItemPossuido(ITEM.id, ITEM.titulo, ITEM.tipo, 1)])
    interacao = _vender(db, inventario, ITEM, 1)
    assert "quente" not in interacao.response.send_message.await_args.kwargs["embed"].description
    asyncio.run(interacao.response.send_message.await_args.kwargs["view"].aceitar.callback(_interacao()))
    assert db.get_calor_roubo("1", "7") == 0


def test_marca_maior_que_a_posse_so_vale_ate_a_posse():
    db = novo_db()
    inventario = _Inventario([ItemPossuido(ITEM.id, ITEM.titulo, ITEM.tipo, 1)])
    db.marcar_mercadoria_quente("1", "7", ITEM.id, 10)
    interacao = _vender(db, inventario, ITEM, 1)
    assert interacao.response.send_message.await_args.kwargs["view"].quentes == 1


def test_o_doleiro_nao_encosta_em_mercadoria_quente_de_quem_ja_esta_queimado():
    db = novo_db()
    inventario = _Inventario([ItemPossuido(ITEM.id, ITEM.titulo, ITEM.tipo, 1)])
    db.marcar_mercadoria_quente("1", "7", ITEM.id, 1)
    db.adicionar_calor_roubo("1", "7", economia.CALOR_QUE_ESPANTA_O_DOLEIRO)
    interacao = _vender(db, inventario, ITEM, 1)
    assert "recua um passo" in interacao.response.send_message.await_args.args[0]
    assert inventario.tirados == []
    # A mesma pessoa vende mercadoria limpa sem problema.
    db.limpar_mercadoria_quente("1", "7", ITEM.id)
    assert "view" in _vender(db, inventario, ITEM, 1).response.send_message.await_args.kwargs


# ───────────────────────────────────────────────────────── encomendas

def _encomendar(db, inventario, item, quantidade=1, user_id=7):
    interacao = _interacao(user_id)
    asyncio.run(MercadoNegro.mercado_negro_encomendar.callback(_cog(db, inventario), interacao, item.id, quantidade))
    return interacao


def test_encomendar_debita_os_creditos_e_cria_o_pedido_com_prazo():
    db = novo_db()
    custo = economia.creditos_da_encomenda(ITEM.conteudo.get("preco"), 2)
    db.creditar("1", "7", "Créditos Sombrios", custo + 5)
    interacao = _encomendar(db, _Inventario(), ITEM, 2)
    assert db.get_saldo("1", "7", "Créditos Sombrios") == 5
    pedidos = db.listar_encomendas("1", "7")
    assert len(pedidos) == 1 and pedidos[0]["quantidade"] == 2 and pedidos[0]["creditos"] == custo
    horas = economia.horas_da_encomenda((economia.valor_em_solares(ITEM.conteudo.get("preco")) or 0) * 2)
    assert abs((pedidos[0]["pronto_em"] - datetime.now(timezone.utc)) - timedelta(hours=horas)) < timedelta(minutes=2)
    assert "Encomenda **#" in interacao.response.send_message.await_args.args[0]
    with db._conn() as con:
        extrato = con.execute("SELECT delta, descricao FROM extrato WHERE guild_id='1' AND user_id='7' AND delta < 0").fetchall()
    assert [(e["delta"], "encomenda de" in e["descricao"]) for e in extrato] == [(-custo, True)]


def test_sem_creditos_nao_ha_encomenda_nem_debito():
    db = novo_db()
    db.creditar("1", "7", "Créditos Sombrios", 1)
    interacao = _encomendar(db, _Inventario(), ITEM)
    assert "precisa" in interacao.response.send_message.await_args.args[0]
    assert db.listar_encomendas("1", "7") == [] and db.get_saldo("1", "7", "Créditos Sombrios") == 1


def test_no_maximo_tres_encomendas_pendentes():
    db = novo_db()
    db.creditar("1", "7", "Créditos Sombrios", 10**6)
    for _ in range(economia.ENCOMENDA_MAXIMO_PENDENTES):
        _encomendar(db, _Inventario(), ITEM)
    saldo = db.get_saldo("1", "7", "Créditos Sombrios")
    interacao = _encomendar(db, _Inventario(), ITEM)
    assert "pendentes" in interacao.response.send_message.await_args.args[0]
    assert db.get_saldo("1", "7", "Créditos Sombrios") == saldo
    assert len(db.listar_encomendas("1", "7")) == economia.ENCOMENDA_MAXIMO_PENDENTES
    assert len(db.listar_encomendas("1", "8")) == 0, "o limite é por jogador"


def test_item_que_nao_se_encomenda_e_recusado():
    db = novo_db()
    db.creditar("1", "7", "Créditos Sombrios", 10**6)
    implante = next(i for i in CATALOGO.listar() if i.tipo == "implante")
    interacao = _encomendar(db, _Inventario(), implante)
    assert "não consegue" in interacao.response.send_message.await_args.args[0]
    assert db.get_saldo("1", "7", "Créditos Sombrios") == 10**6


def test_a_entrega_so_acontece_depois_do_prazo_e_uma_vez_so():
    db = novo_db()
    db.creditar("1", "7", "Créditos Sombrios", 10**6)
    inventario = _Inventario()
    cog = _cog(db, inventario)
    _encomendar(db, inventario, ITEM)
    assert asyncio.run(cog.entregar_encomendas_prontas()) == 0, "ainda não chegou"
    depois = datetime.now(timezone.utc) + timedelta(days=10)
    assert asyncio.run(cog.entregar_encomendas_prontas(depois)) == 1
    assert len(inventario.entregues) == 1 and inventario.entregues[0][1] == ITEM.id
    assert asyncio.run(cog.entregar_encomendas_prontas(depois)) == 0, "não entrega duas vezes"
    assert db.listar_encomendas("1", "7") == []
    with db._conn() as con:
        avisos = con.execute("SELECT mensagem FROM avisos_pendentes WHERE guild_id='1'").fetchall()
    assert any("encomenda" in a["mensagem"] and "<@7>" in a["mensagem"] for a in avisos)


def test_se_a_entrega_falha_o_pedido_volta_para_a_fila_sem_perder_creditos():
    db = novo_db()
    db.creditar("1", "7", "Créditos Sombrios", 10**6)
    quebrado = _Inventario(falha_ao_dar=RuntimeError("cofre fora"))
    cog = _cog(db, quebrado)
    _encomendar(db, quebrado, ITEM)
    depois = datetime.now(timezone.utc) + timedelta(days=10)
    assert asyncio.run(cog.entregar_encomendas_prontas(depois)) == 0
    assert len(db.listar_encomendas("1", "7")) == 1
    quebrado.falha_ao_dar = None
    assert asyncio.run(cog.entregar_encomendas_prontas(depois)) == 1


def test_cancelar_devolve_oitenta_por_cento_e_so_enquanto_pendente():
    db = novo_db()
    custo = economia.creditos_da_encomenda(ITEM.conteudo.get("preco"), 1)
    db.creditar("1", "7", "Créditos Sombrios", custo)
    _encomendar(db, _Inventario(), ITEM)
    pedido = db.listar_encomendas("1", "7")[0]
    assert db.cancelar_encomenda("1", "8", pedido["id"]) is None, "outro jogador não cancela"
    devolvido = db.cancelar_encomenda("1", "7", pedido["id"])
    assert devolvido == int(custo * economia.ENCOMENDA_REEMBOLSO)
    assert db.get_saldo("1", "7", "Créditos Sombrios") == devolvido
    assert db.cancelar_encomenda("1", "7", pedido["id"]) is None, "só cancela uma vez"
    depois = datetime.now(timezone.utc) + timedelta(days=10)
    assert asyncio.run(_cog(db, _Inventario()).entregar_encomendas_prontas(depois)) == 0, "encomenda cancelada não chega"


def test_pedido_em_entrega_nao_se_cancela():
    db = novo_db()
    db.creditar("1", "7", "Créditos Sombrios", 10**5)
    _encomendar(db, _Inventario(), ITEM)
    pedido = db.listar_encomendas("1", "7")[0]
    assert db.reivindicar_encomenda(pedido["id"]) is True
    assert db.reivindicar_encomenda(pedido["id"]) is False
    assert db.cancelar_encomenda("1", "7", pedido["id"]) is None


def test_o_reset_do_jogador_apaga_as_encomendas_pendentes():
    db = novo_db()
    db.creditar("1", "7", "Créditos Sombrios", 10**5)
    _encomendar(db, _Inventario(), ITEM)
    db.resetar_jogador("1", "7")
    assert db.listar_encomendas("1", "7") == []


def test_pedido_que_espera_o_saldo_confere_o_limite_depois_de_destravar():
    """Um pedido fica parado no débito enquanto outra transação planta as 3 encomendas permitidas. Quando o saldo
    destrava ele precisa enxergar essas 3 (e ser recusado), não a contagem que leu antes de esperar."""
    import threading
    import time

    db = novo_db()
    db.creditar("1", "7", "Créditos Sombrios", 10**6)
    custo = economia.creditos_da_encomenda(ITEM.conteudo.get("preco"), 1)
    pronto = datetime.now(timezone.utc) + timedelta(hours=12)
    resultado = {}

    def pedir():
        try:
            resultado["id"] = db.criar_encomenda("1", "7", ITEM.id, ITEM.titulo, ITEM.tipo, 1, custo, pronto)
        except EncomendasDemais as exc:
            resultado["erro"] = exc

    with db._conn() as con:
        con.execute("SELECT 1 FROM carteira WHERE guild_id='1' AND user_id='7' FOR UPDATE")
        fio = threading.Thread(target=pedir)
        fio.start()
        time.sleep(0.8)  # o pedido já começou e está parado esperando o saldo
        for _ in range(economia.ENCOMENDA_MAXIMO_PENDENTES):
            con.execute(
                """INSERT INTO encomendas_mercado_negro (guild_id, user_id, item_id, titulo, tipo, quantidade, creditos, pronto_em)
                   VALUES ('1', '7', %s, %s, %s, 1, %s, %s)""",
                (ITEM.id, ITEM.titulo, ITEM.tipo, custo, pronto),
            )
    fio.join(timeout=10)
    assert "erro" in resultado and "id" not in resultado
    assert len(db.listar_encomendas("1", "7")) == economia.ENCOMENDA_MAXIMO_PENDENTES
    assert db.get_saldo("1", "7", "Créditos Sombrios") == 10**6, "quem foi recusado não perde Créditos"


def test_encomenda_presa_em_entrega_por_uma_queda_volta_para_a_fila_e_chega_sem_duplicar():
    db = novo_db()
    db.creditar("1", "7", "Créditos Sombrios", 10**5)
    _encomendar(db, _Inventario(), ITEM)
    pedido = db.listar_encomendas("1", "7")[0]
    assert db.reivindicar_encomenda(pedido["id"]) is True  # o bot caiu aqui, antes de concluir
    depois = datetime.now(timezone.utc) + timedelta(days=10)
    inventario = _Inventario()
    assert asyncio.run(_cog(db, inventario).entregar_encomendas_prontas(depois)) == 0, "presa não é pega pelo ciclo"
    assert db.retomar_encomendas_interrompidas() == 1
    assert db.retomar_encomendas_interrompidas() == 0
    assert asyncio.run(_cog(db, inventario).entregar_encomendas_prontas(depois)) == 1
    assert [e[3] for e in inventario.entregues] == [f"encomenda-mn:{pedido['id']}"], "a chave de idempotência é a do pedido"
