"""Confere que todos os cogs do Barista carregam e registram os comandos esperados."""

import asyncio
import sys
from pathlib import Path
from types import SimpleNamespace

import pytest

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE))

from main import Barista, EXTENSOES


COMANDOS_SLASH = {
    "ajuda",
    "ambiente",
    "despausar",
    "embaralhar",
    "fila",
    "loop",
    "menu",
    "musica_status",
    "parar",
    "pausar",
    "playlist_adicionar",
    "playlist_apagar",
    "playlist_criar",
    "playlist_listar",
    "playlist_tocar",
    "playlist_ver",
    "pular",
    "rolar",
    "teste",
    "tocar",
    "volume",
}


def test_todos_os_cogs_carregam_e_registram_os_comandos(monkeypatch):
    # Impede que o teste local tente abrir o DATABASE_URL do .env de produção.
    from core import config

    monkeypatch.setattr(config, "DATABASE_URL", " ")

    async def carregar():
        bot = Barista()
        try:
            for extensao in EXTENSOES:
                await bot.load_extension(extensao)
            assert {cmd.name for cmd in bot.tree.get_commands()} == COMANDOS_SLASH

            comando_prefixo = bot.get_command("musica")
            assert comando_prefixo is not None
            assert set(comando_prefixo.aliases) == {"tocar", "play"}

            for nome in {
                "tocar", "pular", "pausar", "despausar", "fila", "volume", "parar",
                "musica_status", "playlist_criar", "playlist_adicionar", "playlist_tocar",
                "playlist_listar", "playlist_ver", "playlist_apagar",
            }:
                assert bot.tree.get_command(nome).guild_only is True

            status = bot.tree.get_command("musica_status")
            assert status.default_permissions.manage_guild is True
            assert status.checks, "musica_status precisa de verificação em tempo de execução"
        finally:
            await bot.close()

    asyncio.run(carregar())


def test_controle_exige_mesma_call_ou_manage_guild():
    from cogs.musica import Musica

    vc = SimpleNamespace(channel=SimpleNamespace(id=10))
    mesma_call = SimpleNamespace(
        user=SimpleNamespace(
            guild_permissions=SimpleNamespace(manage_guild=False),
            voice=SimpleNamespace(channel=SimpleNamespace(id=10)),
        )
    )
    outra_call = SimpleNamespace(
        user=SimpleNamespace(
            guild_permissions=SimpleNamespace(manage_guild=False),
            voice=SimpleNamespace(channel=SimpleNamespace(id=20)),
        )
    )
    mestre = SimpleNamespace(
        user=SimpleNamespace(
            guild_permissions=SimpleNamespace(manage_guild=True),
            voice=None,
        )
    )

    assert Musica._pode_controlar(mesma_call, vc) is True
    assert Musica._pode_controlar(outra_call, vc) is False
    assert Musica._pode_controlar(mestre, vc) is True


def test_sessao_ativa_nao_pode_ser_puxada_para_outra_call(monkeypatch):
    from cogs import musica as cog_musica
    from core import musica as core_musica

    class Membro:
        pass

    monkeypatch.setattr(cog_musica.discord, "Member", Membro)
    canal_bot = SimpleNamespace(id=10, name="Mesa principal")
    vc = SimpleNamespace(channel=canal_bot)
    guild = SimpleNamespace(id=1, voice_client=vc)
    membro = Membro()
    membro.guild = guild
    membro.voice = SimpleNamespace(channel=SimpleNamespace(id=20, name="Outra mesa"))
    cog = cog_musica.Musica(SimpleNamespace())

    with pytest.raises(core_musica.ErroMusica, match="Mesa principal"):
        cog._validar_destino_voz(membro)


def test_primeira_busca_termina_antes_de_conectar(monkeypatch):
    from cogs import musica as cog_musica
    from core import musica as core_musica

    async def cenario():
        eventos = []
        bot = SimpleNamespace(
            loop=asyncio.get_running_loop(),
            get_guild=lambda _guild_id: None,
        )
        cog = cog_musica.Musica(bot)
        membro = SimpleNamespace(id=7, guild=SimpleNamespace(id=11))
        vc = SimpleNamespace(is_playing=lambda: False, is_paused=lambda: False)
        faixa = core_musica.Faixa(
            titulo="Teste",
            url_stream="https://stream.invalid/teste",
            url_pagina="https://pagina.invalid/teste",
            duracao_s=10,
            solicitante_id=membro.id,
        )

        cog._validar_destino_voz = lambda _membro: eventos.append("validar")

        async def buscar(_busca, _solicitante_id):
            eventos.append("buscar")
            return faixa

        async def conectar(_membro):
            eventos.append("conectar")
            return vc

        async def iniciar(_guild_id, _vc):
            eventos.append("tocar")
            return faixa

        monkeypatch.setattr(core_musica, "buscar_faixa", buscar)
        cog._conectar_voz = conectar
        cog._agendar_proxima = iniciar

        await cog._tocar(membro=membro, canal_texto=object(), busca="Teste")

        assert eventos == ["validar", "buscar", "conectar", "tocar"]
        cog.cog_unload()

    asyncio.run(cenario())


def test_fila_vazia_desconecta_depois_do_tempo_ocioso(monkeypatch):
    from cogs import musica as cog_musica

    async def cenario():
        desconectou = asyncio.Event()
        guild = SimpleNamespace(id=19, voice_client=None)

        class VoiceClient:
            def __init__(self):
                self.conectado = True

            def is_connected(self):
                return self.conectado

            def is_playing(self):
                return False

            def is_paused(self):
                return False

            async def disconnect(self):
                self.conectado = False
                guild.voice_client = None
                desconectou.set()

        vc = VoiceClient()
        guild.voice_client = vc
        bot = SimpleNamespace(get_guild=lambda guild_id: guild if guild_id == guild.id else None)
        cog = cog_musica.Musica(bot)
        monkeypatch.setattr(cog_musica, "TEMPO_OCIOSO_S", 0.01)

        cog._agendar_desconexao_ociosa(guild.id, vc)
        await asyncio.wait_for(desconectou.wait(), timeout=0.5)

        assert vc.conectado is False
        assert guild.id not in cog._tarefas_desconexao
        cog.cog_unload()

    asyncio.run(cenario())


def test_loop_reenfileira_faixa_conforme_modo(monkeypatch):
    from cogs import musica as cog_musica
    from core import musica as core_musica

    def faixa(t):
        return core_musica.Faixa(
            titulo=t, url_stream="s", url_pagina="p", duracao_s=1, solicitante_id=1
        )

    async def cenario():
        bot = SimpleNamespace(loop=asyncio.get_running_loop())
        cog = cog_musica.Musica(bot)
        vc = SimpleNamespace(is_connected=lambda: True)
        cog._agendar_desconexao_ociosa = lambda *a, **k: None

        async def agendar(guild_id, _vc):
            # Simula tocar_proxima: puxa a próxima da fila.
            return cog.gerenciador.fila(guild_id).proxima()

        cog._agendar_proxima = agendar

        # "uma": a faixa que terminou volta e toca de novo.
        f1 = cog.gerenciador.fila(1)
        f1.atual = faixa("X")
        f1.adicionar(faixa("Y"))
        f1.repeticao = "uma"
        await cog._avancar(1, vc)
        assert f1.atual.titulo == "X"
        assert [f.titulo for f in f1.faixas] == ["Y"]

        # "tudo": a que terminou vai pro fim; toca a próxima.
        f2 = cog.gerenciador.fila(2)
        f2.atual = faixa("A")
        f2.adicionar(faixa("B"))
        f2.repeticao = "tudo"
        await cog._avancar(2, vc)
        assert f2.atual.titulo == "B"
        assert [f.titulo for f in f2.faixas] == ["A"]

        # Pular ignora a repetição da faixa atual.
        f3 = cog.gerenciador.fila(3)
        f3.atual = faixa("M")
        f3.adicionar(faixa("N"))
        f3.repeticao = "uma"
        f3.pular_solicitado = True
        await cog._avancar(3, vc)
        assert f3.atual.titulo == "N"
        assert [f.titulo for f in f3.faixas] == []

        cog.cog_unload()

    asyncio.run(cenario())


def test_embaralhar_posicao_e_barra():
    import random

    from core.musica import Faixa, FilaServidor
    from cogs.musica import _barra_progresso, _mmss

    def faixa(t):
        return Faixa(titulo=t, url_stream="s", url_pagina="p", duracao_s=200, solicitante_id=1)

    fila = FilaServidor(guild_id=1)
    for t in "ABCDE":
        fila.adicionar(faixa(t))
    fila.embaralhar(random.Random(42))
    assert sorted(f.titulo for f in fila.faixas) == list("ABCDE")  # não perde faixas
    assert [f.titulo for f in fila.faixas] != list("ABCDE")  # e muda a ordem

    fila.marcar_inicio()
    fila.marcar_pausa()
    congelada = fila.posicao_s()
    assert congelada == fila.posicao_s()  # pausada não avança
    fila.marcar_retomada()
    assert fila.posicao_s() >= 0

    fila.repeticao = "tudo"
    fila.limpar()
    assert fila.repeticao == "off"
    assert fila.posicao_s() is None

    assert _barra_progresso(0, 200).startswith("🔘")
    assert _barra_progresso(200, 200).endswith("🔘")
    assert _mmss(125) == "2:05"
