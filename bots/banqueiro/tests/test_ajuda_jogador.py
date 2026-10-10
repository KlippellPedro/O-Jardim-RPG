"""/ajuda e /comandos do Banqueiro: guia em português simples e só o que o jogador pode usar."""

from __future__ import annotations

import asyncio
import re
import sys
from pathlib import Path
from types import SimpleNamespace

import discord

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE))

from cogs.ajuda import CATEGORIAS, Ajuda, MenuAjuda, _categorias_visiveis, _entradas, _pagina


def test_guia_vem_primeiro_e_explica_as_novidades():
    assert next(iter(CATEGORIAS)) == "guia"
    texto = " ".join(f"{c} {d}" for c, d in CATEGORIAS["guia"]["comandos"])
    for tema in (
        "/banco", "Cofre do Jardim", "Chaves do Jardim", "Leilão do Jardim", "sábado", "Dia de Bolsa",
        "quarta", "90%", "50%", "sem taxa", "Dar lance",
    ):
        assert tema in texto, f"o guia não explica: {tema}"


def test_guia_respeita_limites_e_o_tom_do_texto_para_o_jogador():
    for titulo, desc in CATEGORIAS["guia"]["comandos"]:
        assert len(titulo) <= 256 and len(desc) <= 1024
        assert "—" not in titulo + desc and "–" not in titulo + desc
        assert not re.search(r"\beco\b", desc, re.IGNORECASE)
        assert not re.search(r"n[ãa]o é [^.,;]{1,40}, é ", desc, re.IGNORECASE)
    assert all(len(info["comandos"]) <= 25 for info in CATEGORIAS.values())


def test_jogador_comum_nao_ve_comando_nem_categoria_de_mestre():
    visiveis = _categorias_visiveis(mestre=False)
    assert not any(chave.startswith("mestre") for chave in visiveis)
    assert "guia" in visiveis and "economia" in visiveis
    for chave in visiveis:
        for _cmd, desc in _entradas(chave, mestre=False):
            assert not desc.startswith("[Mestre]")
    nomes = [campo.name for chave in visiveis for campo in _pagina(chave, mestre=False).fields]
    assert "/cassino configurar" not in nomes and "/cassino abrir" in nomes
    assert "/dar <membro> <moeda> <quantia>" not in nomes


def test_mestre_ve_tudo():
    assert _categorias_visiveis(mestre=True) == list(CATEGORIAS)
    assert any(c.name.startswith("/dar ") for c in _pagina("mestre", mestre=True).fields)
    assert any(c.name.startswith("/catalogo_republicar") for c in _pagina("mestre_jogadores", mestre=True).fields)
    todas = [c.name.split()[0] for chave in CATEGORIAS if chave.startswith("mestre") for c in _pagina(chave).fields]
    assert len(todas) == len(set(todas)) and "/ajustar_saldo" in todas  # nada se perdeu na divisão


def test_menu_do_jogador_e_do_mestre():
    assert [o.value for o in MenuAjuda(1, mestre=False).select.options] == _categorias_visiveis(False)
    assert [o.value for o in MenuAjuda(1, mestre=True).select.options] == list(CATEGORIAS)
    assert len(MenuAjuda(1, mestre=True).select.options) <= 25


def test_ajuda_e_comandos_usam_a_permissao_de_quem_pediu():
    enviados = []

    class _R:
        async def send_message(self, **kw):
            enviados.append(kw)

    def interacao(permissoes):
        return SimpleNamespace(user=SimpleNamespace(id=7), permissions=permissoes, response=_R())

    cog = Ajuda(None)
    asyncio.run(Ajuda.ajuda.callback(cog, interacao(discord.Permissions(send_messages=True))))
    assert enviados[0]["embed"].title == CATEGORIAS["guia"]["rotulo"]
    assert [o.value for o in enviados[0]["view"].select.options] == _categorias_visiveis(False)

    asyncio.run(Ajuda.comandos.callback(cog, interacao(discord.Permissions(send_messages=True))))
    jogador = enviados[1]["view"]
    asyncio.run(Ajuda.comandos.callback(cog, interacao(discord.Permissions(manage_guild=True))))
    mestre = enviados[2]["view"]
    assert len(mestre.paginas) == len(CATEGORIAS) and len(jogador.paginas) == len(_categorias_visiveis(False))
