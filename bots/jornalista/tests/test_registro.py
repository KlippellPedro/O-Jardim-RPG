"""/registro preset_arvores: cria o painel de reação E popula o mapa de
cargo por Árvore que o Horóscopo do Jardim depende pra dobrar Lunaris.

Regressão: `preset_arvores` gravava o cargo em `registro_opcoes` (o painel de
reação) mas nunca em `registro_cargos`, então `get_cargos_arvore` sempre
devolvia `{}` e `Baus.aplicar_bonus_horoscopo` nunca encontrava o cargo do
jogador: o bônus estava morto desde o lançamento.
"""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE))

from cogs.baus import Baus
from cogs.registro import Registro
from core import arvores as arvores_mod


class _Role:
    def __init__(self, name, role_id):
        self.name = name
        self.id = role_id


class _Guild:
    def __init__(self, roles):
        self.roles = roles

    async def create_role(self, **kwargs):
        raise AssertionError("não deveria criar cargo: todos já existem no fixture")


class _Resposta:
    async def defer(self, **kwargs):
        pass


class _Followup:
    def __init__(self):
        self.mensagens = []

    async def send(self, texto, **kwargs):
        self.mensagens.append(texto)


class _Interacao:
    def __init__(self, guild):
        self.guild_id = 100
        self.guild = guild
        self.response = _Resposta()
        self.followup = _Followup()


class _DB:
    def __init__(self):
        self.opcoes = []
        self.cargos_arvore = {}

    def criar_painel(self, guild_id, titulo, descricao="", unico=True):
        return 1

    def add_opcao(self, guild_id, painel_id, label, cargo_id, emoji=None):
        self.opcoes.append((guild_id, painel_id, label, cargo_id, emoji))
        return len(self.opcoes)

    def set_cargo_arvore(self, guild_id, arvore_id, cargo_id):
        self.cargos_arvore.setdefault(guild_id, {})[arvore_id] = cargo_id

    def get_cargos_arvore(self, guild_id):
        return dict(self.cargos_arvore.get(guild_id, {}))


def test_preset_arvores_popula_o_mapa_de_cargo_por_arvore():
    roles = [_Role(a.nome, f"cargo-{a.id}") for a in arvores_mod.ARVORES]
    guild = _Guild(roles)
    db = _DB()

    cog = object.__new__(Registro)
    cog.bot = type("Bot", (), {"db": db})()

    async def rodar():
        await Registro.preset_arvores.callback(cog, _Interacao(guild))

    asyncio.run(rodar())

    mapa = db.get_cargos_arvore("100")
    assert len(mapa) == len(arvores_mod.ARVORES)
    for arvore in arvores_mod.ARVORES:
        assert mapa[arvore.id] == f"cargo-{arvore.id}"


def test_bonus_do_horoscopo_dispara_com_o_mapa_populado():
    """Ponta a ponta: depois do preset, aplicar_bonus_horoscopo precisa achar
    o cargo do jogador e dobrar o Lunaris: não só gravar uma linha solta."""
    db = _DB()
    db.set_cargo_arvore("100", "aethel", "cargo-aethel")

    class _Cargo:
        id = "cargo-aethel"

    class _Membro:
        roles = [_Cargo()]

    cog = object.__new__(Baus)
    cog.bot = type(
        "Bot",
        (),
        {
            "db": type(
                "DB",
                (),
                {
                    "automacao_ativa": lambda self, gid, tipo, padrao=True: True,
                    "get_horoscopo": lambda self, gid: "aethel",
                    "get_cargos_arvore": db.get_cargos_arvore,
                },
            )()
        },
    )()

    premio, bonus = cog.aplicar_bonus_horoscopo("100", _Membro(), {"lunaris": 10, "itens": []})

    assert bonus is True
    assert premio["lunaris"] == 20
