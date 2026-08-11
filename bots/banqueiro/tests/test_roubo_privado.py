"""Privacidade e cancelamento seguro do fluxo de roubo por DM."""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

import discord

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE))

from cogs.economia import DefesaRouboView, Economia
from cogs.ajuda import CATEGORIAS, _pagina
from core import economia


class _Resposta:
    def __init__(self):
        self.deferimentos = []
        self.mensagens = []
        self._done = False

    def is_done(self):
        return self._done

    async def defer(self, **kwargs):
        self.deferimentos.append(kwargs)
        self._done = True

    async def send_message(self, *args, **kwargs):
        self.mensagens.append((args, kwargs))
        self._done = True


class _Mensagem:
    def __init__(self):
        self.edicoes = []

    async def edit(self, **kwargs):
        self.edicoes.append(kwargs)


class _Interacao:
    def __init__(self):
        self.guild_id = 100
        self.guild = type("Guild", (), {"name": "Jardim de Teste"})()
        self.user = type(
            "Usuario",
            (),
            {"id": 1, "mention": "<@1>", "display_name": "Ladrão"},
        )()
        self.response = _Resposta()
        self.edicoes = []

    async def edit_original_response(self, **kwargs):
        self.edicoes.append(kwargs)


class _Membro:
    def __init__(self, *, dm_fechada=False):
        self.id = 2
        self.mention = "<@2>"
        self.display_name = "Vítima"
        self.bot = False
        self.dm_fechada = dm_fechada
        self.mensagem = _Mensagem()
        self.dms = []

    async def send(self, *args, **kwargs):
        self.dms.append((args, kwargs))
        if self.dm_fechada:
            resposta = type("RespostaHTTP", (), {"status": 403, "reason": "Forbidden"})()
            raise discord.Forbidden(resposta, "DM fechada")
        return self.mensagem


def _cog(db=None):
    cog = object.__new__(Economia)
    cog.bot = type("Bot", (), {"db": db})()
    return cog


def test_defesa_e_enviada_so_por_dm_e_resposta_do_ladrao_e_ephemeral(monkeypatch):
    async def impedir_imediatamente(self):
        self.impedido = True

    monkeypatch.setattr(DefesaRouboView, "aguardar", impedir_imediatamente)
    interacao = _Interacao()
    membro = _Membro()

    resultado = asyncio.run(
        _cog()._abrir_defesa_roubo(interacao, membro, "a carteira")
    )

    assert resultado == "impedido"
    assert interacao.response.mensagens == []
    assert interacao.response.deferimentos == [
        {"ephemeral": True, "thinking": True}
    ]
    assert len(membro.dms) == 1
    assert membro.dms[0][1]["view"].alvo_id == membro.id
    assert membro.mensagem.edicoes


def test_dm_fechada_cancela_tentativa_sem_publicar():
    interacao = _Interacao()
    membro = _Membro(dm_fechada=True)

    resultado = asyncio.run(
        _cog()._abrir_defesa_roubo(interacao, membro, "a carteira")
    )

    assert resultado == "indisponivel"
    assert interacao.response.mensagens == []
    assert interacao.response.deferimentos[0]["ephemeral"] is True
    assert "cooldown não será consumido" in interacao.edicoes[-1]["embed"].description


class _DBCancelamento:
    def __init__(self):
        self.alarme_devolvido = 0
        self.cooldown_liberado = []
        self.alvo_liberado = []

    def garantir_jogador(self, *_args):
        pass

    def get_config_roubo(self, _sid):
        return {"chance_base": 0.5, "cooldown_horas": 24}

    def get_calor_roubo(self, *_args):
        return 0

    def get_mestre_protegido(self, _sid):
        return None

    def get_protecao_vitima(self, *_args):
        return None

    def get_saldo(self, *_args):
        return 100

    def reservar_alvo_roubo(self, _sid, _alvo, _agora, reserva_ate):
        return True, reserva_ate

    def reservar_tentativa_roubo(self, _sid, _uid, _agora, cooldown_ate):
        return True, cooldown_ate

    def consumir_protecao(self, _sid, _alvo, tipo):
        return tipo == "alarme_magico"

    def adicionar_protecao(self, _sid, _alvo, tipo):
        assert tipo == "alarme_magico"
        self.alarme_devolvido += 1

    def liberar_tentativa_roubo(self, _sid, _uid, cooldown_ate):
        self.cooldown_liberado.append(cooldown_ate)
        return True

    def liberar_alvo_roubo(self, _sid, _alvo, reserva_ate):
        self.alvo_liberado.append(reserva_ate)
        return True


def test_comando_devolve_alarme_e_cooldown_quando_dm_esta_fechada():
    db = _DBCancelamento()
    interacao = _Interacao()
    membro = _Membro(dm_fechada=True)

    asyncio.run(Economia.roubar.callback(_cog(db), interacao, membro))

    assert db.alarme_devolvido == 1
    assert len(db.cooldown_liberado) == 1
    assert len(db.alvo_liberado) == 1
    assert interacao.response.mensagens == []


def test_comandos_de_roubo_nao_tem_mais_opcao_furtivo():
    assert [p.name for p in Economia.roubar.parameters] == ["membro", "abordagem"]
    assert [p.name for p in Economia.roubar_cofre.parameters] == ["membro", "abordagem"]


def test_cambio_automatico_fica_na_escala_atual():
    assert economia.CAMBIO_RATE_MINIMO == 50
    assert economia.CAMBIO_RATE_MAXIMO == 200
    assert economia.ajustar_cambio_flutuante(100, 1_000, 0) == 105
    assert economia.ajustar_cambio_flutuante(100, 0, 1_000) == 95


def test_ajuda_nao_corta_comandos_de_categorias_grandes():
    for chave, info in CATEGORIAS.items():
        pagina = _pagina(chave)
        assert [campo.name for campo in pagina.fields] == [
            comando for comando, _descricao in info["comandos"]
        ]


class _DBPagamento:
    def __init__(self):
        self.transferencias = []

    def garantir_jogador(self, *_args):
        pass

    def transferir_carteira(self, *args):
        self.transferencias.append(args)
        return {"saldo_origem": 90, "saldo_destino": 30}

    def alerta_banco_ativo(self, *_args):
        return False


def test_pagar_usa_transferencia_atomica_do_banco():
    db = _DBPagamento()
    interacao = _Interacao()
    membro = _Membro()

    asyncio.run(Economia.pagar.callback(_cog(db), interacao, membro, 10, None))

    assert len(db.transferencias) == 1
    assert db.transferencias[0][1:5] == ("1", "2", "Lunaris", 10)
    assert len(interacao.response.mensagens) == 1
