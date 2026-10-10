"""/ajuda do Jornalista: o jogador vê um guia em português simples e só os comandos que pode usar."""

from __future__ import annotations

import asyncio
import re
import sys
from pathlib import Path
from types import SimpleNamespace

import discord

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE))

from cogs.ajuda import CATEGORIAS, MenuAjuda, _categorias_visiveis, _eh_mestre, _entradas, _pagina


def test_guia_vem_primeiro_e_explica_cada_novidade_em_prosa():
    assert next(iter(CATEGORIAS)) == "guia"
    texto = " ".join(f"{c} {d}" for c, d in CATEGORIAS["guia"]["comandos"])
    for tema in (
        "/jardim", "Pista de Sorte", "Chaves do Jardim", "Coleção das Dez Árvores", "Cofre do Jardim",
        "Classificados", "Responder", "Furos", "desmentir", "Publicar", "/entrevista_responder", "domingo",
        "Procurados", "sobe de nível",
    ):
        assert tema in texto, f"o guia não explica: {tema}"


def test_guia_respeita_os_limites_do_discord_e_o_tom_do_texto_para_o_jogador():
    for titulo, desc in CATEGORIAS["guia"]["comandos"]:
        assert len(titulo) <= 256 and len(desc) <= 1024
        assert "—" not in titulo + desc and "–" not in titulo + desc
        assert not re.search(r"\beco\b", desc, re.IGNORECASE)
        assert not re.search(r"n[ãa]o é [^.,;]{1,40}, é ", desc, re.IGNORECASE)
    assert all(len(info["comandos"]) <= 25 for info in CATEGORIAS.values())


def test_jogador_comum_nao_ve_comando_de_mestre_nem_categoria_so_de_mestre():
    for chave in CATEGORIAS:
        for _cmd, desc in _entradas(chave, mestre=False):
            assert not desc.startswith("[Mestre]")
    visiveis = _categorias_visiveis(mestre=False)
    assert "guia" in visiveis and "estrelas" in visiveis
    assert "editorial" not in visiveis  # tudo ali é de Mestre
    assert set(visiveis) < set(_categorias_visiveis(mestre=True))
    nomes = [campo.name for chave in visiveis for campo in _pagina(chave, mestre=False).fields]
    assert "/anunciar_classificado <texto> [valor] [categoria]" in nomes and "/jornal status" not in nomes


def test_mestre_continua_vendo_tudo():
    assert _categorias_visiveis(mestre=True) == list(CATEGORIAS)
    assert any("/jornal furo vetar" in campo.name for campo in _pagina("editorial", mestre=True).fields)


def test_menu_so_lista_as_categorias_visiveis_e_cabe_no_select():
    jogador = MenuAjuda(autor_id=1, mestre=False)
    mestre = MenuAjuda(autor_id=1, mestre=True)
    assert [o.value for o in jogador.select.options] == _categorias_visiveis(False)
    assert [o.value for o in mestre.select.options] == list(CATEGORIAS)
    assert len(mestre.select.options) <= 25


def test_permissao_de_mestre_vem_da_interacao():
    assert _eh_mestre(SimpleNamespace(permissions=discord.Permissions(manage_guild=True)))
    assert _eh_mestre(SimpleNamespace(permissions=discord.Permissions(administrator=True)))
    assert not _eh_mestre(SimpleNamespace(permissions=discord.Permissions(send_messages=True)))
    assert not _eh_mestre(SimpleNamespace())


def test_comando_ajuda_abre_a_primeira_categoria_visivel():
    from cogs.ajuda import Ajuda

    enviados = []

    class _R:
        async def send_message(self, **kw):
            enviados.append(kw)

    inter = SimpleNamespace(user=SimpleNamespace(id=7), permissions=discord.Permissions(send_messages=True), response=_R())
    asyncio.run(Ajuda.ajuda.callback(Ajuda(None), inter))
    assert enviados[0]["embed"].title == CATEGORIAS["guia"]["rotulo"] and enviados[0]["ephemeral"] is True
    assert [o.value for o in enviados[0]["view"].select.options] == _categorias_visiveis(False)
