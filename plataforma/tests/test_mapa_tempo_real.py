"""Tempo real do mapa (core/tempo_real.py): fila que junta posições, recarga das regras sem
travar o arrasto, soltar antes de gravar e o batimento que serve ao medidor."""

from __future__ import annotations

import asyncio
import json
import time

from core import tempo_real


def _regras(**tokens):
    return tempo_real.Regras(cena_id="c1", livre=False, largura=1000, altura=1000, tokens=tokens)


def _conexao(usuario, gestor=False):
    return tempo_real.Conexao(usuario_id=usuario, nome=usuario.title(), gestor=gestor)


def _mensagens(conexao):
    return [m for m in (json.loads(t) for t in conexao.tirar_agora()) if m["t"] != "presenca"]


def _mesa():
    tempo_real._limpar_para_testes()
    mestre, ana = _conexao("m", gestor=True), _conexao("ana")
    for c in (mestre, ana):
        tempo_real.entrar("camp", c)
    _mensagens(mestre)
    _mensagens(ana)
    regras = _regras(lobo=tempo_real.RegraToken(quem_ve="todos", donos=frozenset(), movivel_livre=False))
    return mestre, ana, regras


def test_batimento_devolve_a_hora_de_quem_mandou():
    async def cenario():
        mestre, _, regras = _mesa()

        async def carregar():
            return regras

        resposta = await tempo_real.processar("camp", mestre, {"t": "oi", "c": 1234.5}, carregar, None)
        assert resposta["c"] == 1234.5 and resposta["ts"] > 0
        assert "c" not in await tempo_real.processar("camp", mestre, {"t": "oi", "c": "x"}, carregar, None)

    asyncio.run(cenario())


def test_posicoes_do_mesmo_token_se_juntam_na_fila_e_a_hora_do_gesto_vai_junto():
    async def cenario():
        mestre, ana, regras = _mesa()

        async def carregar():
            return regras

        async def gravar(*_):
            return True

        # A Ana não leu nada enquanto o Mestre arrastava: na fila dela fica só a posição mais nova.
        for x in (100, 200, 300, 400):
            await tempo_real.processar("camp", mestre, {"t": "arrastar", "token": "lobo", "x": x, "y": 50, "tm": 999.6}, carregar, gravar)
        recebidas = _mensagens(ana)
        assert [(m["t"], m["x"], m["tm"]) for m in recebidas] == [("arrastando", 400, 1000)]

        # A posição final também substitui o arrasto que ainda esperava a saída.
        await tempo_real.processar("camp", mestre, {"t": "arrastar", "token": "lobo", "x": 500, "y": 50}, carregar, gravar)
        await tempo_real.processar("camp", mestre, {"t": "soltar", "token": "lobo", "x": 550, "y": 50}, carregar, gravar)
        assert [(m["t"], m["x"]) for m in _mensagens(ana)] == [("token", 550)]

    asyncio.run(cenario())


def test_fila_cheia_vira_pedido_de_recarga_em_vez_de_perder_mensagens():
    ana = _conexao("ana")
    for i in range(tempo_real.LIMITE_FILA + 3):
        ana.entregar(json.dumps({"t": "ping", "i": i}))
    recebidas = [json.loads(t) for t in ana.tirar_agora()]
    # O que esperava sai, a tela recarrega a cena, e o que veio depois segue normal.
    assert [m["t"] for m in recebidas] == ["mudou", "ping", "ping"]
    assert recebidas[0]["motivo"] == "fila"
    assert [m["i"] for m in recebidas[1:]] == [tempo_real.LIMITE_FILA + 1, tempo_real.LIMITE_FILA + 2]


def test_regras_vencidas_recarregam_sem_o_arrasto_esperar():
    async def cenario():
        mestre, ana, regras = _mesa()
        antigas = regras
        antigas.carregadas_em = time.monotonic() - tempo_real.VALIDADE_REGRAS_S - 1
        tempo_real._sala("camp").regras = antigas
        liberar = asyncio.Event()
        novas = _regras(lobo=tempo_real.RegraToken(quem_ve="gestores", donos=frozenset(), movivel_livre=False))

        async def carregar_devagar():
            await liberar.wait()
            return novas

        async def gravar(*_):
            return True

        # Com o banco "travado", a mensagem sai na hora com as regras de antes.
        await asyncio.wait_for(
            tempo_real.processar("camp", mestre, {"t": "arrastar", "token": "lobo", "x": 10, "y": 10}, carregar_devagar, gravar),
            timeout=0.5,
        )
        assert [m["t"] for m in _mensagens(ana)] == ["arrastando"]
        sala = tempo_real._sala("camp")
        assert sala.recarregando and sala.regras is antigas
        liberar.set()
        await asyncio.sleep(0)
        await asyncio.sleep(0)
        assert sala.regras is novas and not sala.recarregando
        # As novas valem: o lobo agora é só do Mestre e a Ana não recebe mais o arrasto.
        await tempo_real.processar("camp", mestre, {"t": "arrastar", "token": "lobo", "x": 20, "y": 20}, carregar_devagar, gravar)
        assert _mensagens(ana) == []

    asyncio.run(cenario())


def test_recarga_que_comecou_antes_de_uma_mudanca_nao_vale():
    async def cenario():
        mestre, _, regras = _mesa()
        regras.carregadas_em = time.monotonic() - tempo_real.VALIDADE_REGRAS_S - 1
        tempo_real._sala("camp").regras = regras
        liberar = asyncio.Event()

        async def carregar_devagar():
            await liberar.wait()
            return _regras()

        await tempo_real.processar("camp", mestre, {"t": "regua", "pontos": None}, carregar_devagar, None)
        # No meio da recarga, o Mestre muda a estrutura da cena.
        tempo_real._invalidar("camp", 7)
        liberar.set()
        await asyncio.sleep(0)
        await asyncio.sleep(0)
        assert tempo_real._sala("camp").regras is None

    asyncio.run(cenario())


def test_soltar_repassa_antes_de_gravar_e_avisa_a_mesa_se_a_gravacao_falhar():
    async def cenario():
        mestre, ana, regras = _mesa()

        async def carregar():
            return regras

        visto_na_hora_de_gravar = []

        async def gravar_que_confere(*_):
            visto_na_hora_de_gravar.extend(m["t"] for m in _mensagens(ana))
            return True

        await tempo_real.processar("camp", mestre, {"t": "soltar", "token": "lobo", "x": 5, "y": 5}, carregar, gravar_que_confere)
        assert visto_na_hora_de_gravar == ["token"]

        async def gravar_que_falha(*_):
            return False

        resposta = await tempo_real.processar("camp", mestre, {"t": "soltar", "token": "lobo", "x": 6, "y": 6}, carregar, gravar_que_falha)
        assert resposta["t"] == "erro"
        assert [m["t"] for m in _mensagens(ana)] == ["token", "mudou"]
        assert tempo_real._sala("camp").regras is None

    asyncio.run(cenario())


# ------------------------------------------------- diferenças empurradas

def _estado(cena_id="c1", tokens=None, **extra):
    base = {
        "gestor": False, "usuario_id": "ana", "ao_vivo": True, "bloqueado": False, "cenas": [], "moldura_mesa": None,
        "cena": {"id": cena_id, "nome": "Ruínas", "nevoa": {"ligada": False}},
        "tokens": tokens if tokens is not None else [{"id": "t1", "x": 1.0, "barras": []}, {"id": "t2", "x": 2.0, "barras": []}],
    }
    base.update(extra)
    return base


def test_diferenca_manda_tudo_na_primeira_vez_e_depois_so_o_que_mudou():
    primeira, resumo = tempo_real.diferenca(None, _estado())
    assert primeira["t"] == "estado"
    nada, resumo = tempo_real.diferenca(resumo, _estado())
    assert nada is None
    mudou, resumo = tempo_real.diferenca(resumo, _estado(tokens=[{"id": "t1", "x": 1.0, "barras": [{"tipo": "vida"}]}, {"id": "t3", "x": 3.0, "barras": []}]))
    assert mudou["t"] == "delta" and mudou["cena_id"] == "c1"
    assert [t["id"] for t in mudou["mudar"]] == ["t1", "t3"]
    assert mudou["tirar"] == ["t2"] and mudou["ordem"] == ["t1", "t3"]
    assert "cena" not in mudou and "ao_vivo" not in mudou
    campo, resumo = tempo_real.diferenca(resumo, _estado(tokens=mudou["mudar"], ao_vivo=False, cena={"id": "c1", "nome": "Ruínas", "nevoa": {"ligada": True}}))
    assert campo["ao_vivo"] is False and campo["cena"]["nevoa"]["ligada"] is True and "mudar" not in campo
    # Outra cena (o Mestre trocou a da mesa): vai o estado inteiro.
    outra, _ = tempo_real.diferenca(resumo, _estado(cena_id="c2"))
    assert outra["t"] == "estado"


def test_mudanca_chega_a_cada_um_com_o_proprio_recorte_e_seguidas_viram_um_envio():
    async def cenario():
        mestre, ana, _ = _mesa()
        estados = {"m": _estado(usuario_id="m", gestor=True), "ana": _estado()}
        chamadas = []

        async def empurrador(campanha_id, conexoes):
            chamadas.append(sorted(c.usuario_id for c in conexoes))
            return [estados[c.usuario_id] for c in conexoes]

        tempo_real.registrar_empurrador(empurrador)
        tempo_real._invalidar("camp", 1)
        tempo_real._invalidar("camp", 2)
        await asyncio.sleep(tempo_real.JUNTAR_MUDANCAS_S * 3)
        assert chamadas == [["ana", "m"]]
        primeira = _mensagens(ana)
        assert [(m["t"], m["seq"]) for m in primeira] == [("estado", 1)]
        assert primeira[0]["estado"]["usuario_id"] == "ana"
        assert _mensagens(mestre)[0]["estado"]["gestor"] is True

        # Só a barra do t1 muda para a Ana; o Mestre não recebe nada.
        estados["ana"] = _estado(tokens=[{"id": "t1", "x": 1.0, "barras": [{"tipo": "vida", "fracao": 0.3}]}, {"id": "t2", "x": 2.0, "barras": []}])
        tempo_real._invalidar("camp", 3)
        await asyncio.sleep(tempo_real.JUNTAR_MUDANCAS_S * 3)
        delta = _mensagens(ana)
        assert [(m["t"], m["seq"]) for m in delta] == [("delta", 2)]
        assert [t["id"] for t in delta[0]["mudar"]] == ["t1"] and "ts" in delta[0]
        assert _mensagens(mestre) == []

        # Quem perdeu o acesso no meio do caminho recarrega pelo GET (e o GET recusa).
        async def sem_acesso(campanha_id, conexoes):
            return [None if c.usuario_id == "ana" else estados[c.usuario_id] for c in conexoes]

        tempo_real.registrar_empurrador(sem_acesso)
        tempo_real._invalidar("camp", 4)
        await asyncio.sleep(tempo_real.JUNTAR_MUDANCAS_S * 3)
        assert [m["t"] for m in _mensagens(ana)] == ["mudou"]
        assert ana.ultimo is None

    asyncio.run(cenario())


def test_sem_quem_calcule_o_recorte_a_mesa_recarrega_como_antes():
    async def cenario():
        mestre, ana, _ = _mesa()
        tempo_real._invalidar("camp", 9)
        assert [m["t"] for m in _mensagens(ana)] == ["mudou"]
        assert [m["t"] for m in _mensagens(mestre)] == ["mudou"]

    asyncio.run(cenario())


def test_eventos_da_sessao_que_nao_mexem_no_mapa_nao_mandam_nada(monkeypatch):
    async def cenario():
        monkeypatch.setattr(tempo_real, "_loop", None)
        _, ana, _ = _mesa()
        chamadas = []

        async def empurrador(campanha_id, conexoes):
            chamadas.append(1)
            return [_estado() for _ in conexoes]

        tempo_real.registrar_empurrador(empurrador)
        for tipo in ("registro", "iniciativa", "veiculo_atualizado", "mesa"):
            tempo_real.mudanca_da_sessao("camp", tipo)
        await asyncio.sleep(tempo_real.JUNTAR_MUDANCAS_S * 3)
        assert chamadas == [] and _mensagens(ana) == []
        tempo_real.mudanca_da_sessao("camp", "participante_atualizado")
        await asyncio.sleep(tempo_real.JUNTAR_MUDANCAS_S * 3)
        assert chamadas == [1] and [m["t"] for m in _mensagens(ana)] == ["estado"]

    asyncio.run(cenario())


def test_mestre_avisa_a_cena_que_olha_e_jogador_nao_escolhe():
    async def cenario():
        mestre, ana, regras = _mesa()

        async def carregar():
            return regras

        mestre.ultimo = {"cena_id": "c1"}
        await tempo_real.processar("camp", mestre, {"t": "vendo", "cena": "c9"}, carregar, None)
        assert mestre.vendo == "c9" and mestre.ultimo is None
        await tempo_real.processar("camp", ana, {"t": "vendo", "cena": "c9"}, carregar, None)
        assert ana.vendo is None

    asyncio.run(cenario())
