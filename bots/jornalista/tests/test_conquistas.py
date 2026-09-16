import asyncio
import sys
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock

import discord
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from core.conquistas import CONQUISTAS, avaliar
from cogs.conquistas import Conquistas


@pytest.mark.parametrize("conquista", CONQUISTAS, ids=lambda c: c.chave)
def test_limites_dos_titulos(conquista):
    assert conquista not in avaliar({conquista.metrica: conquista.minimo - 1})
    assert conquista in avaliar({conquista.metrica: conquista.minimo})
    assert conquista in avaliar({conquista.metrica: conquista.minimo + 1})


def test_catalogo_sem_chaves_duplicadas_e_sem_desbloqueio_vazio():
    assert len({c.chave for c in CONQUISTAS}) == len(CONQUISTAS)
    assert avaliar({}) == []


def cenario():
    mapa, cargos = {}, {}
    membro = SimpleNamespace(id=7, bot=False, roles=[], add_roles=AsyncMock())

    async def add(role, **kwargs):
        membro.roles.append(role)
    membro.add_roles.side_effect = add

    async def criar(**kwargs):
        role = SimpleNamespace(id=10, permissions=kwargs["permissions"], managed=False, is_assignable=lambda: True)
        cargos[10] = role
        return role

    guild = SimpleNamespace(id=1, get_member=lambda _: membro, get_role=cargos.get,
                            create_role=AsyncMock(side_effect=criar),
                            fetch_roles=AsyncMock(side_effect=lambda: list(cargos.values())))
    db = SimpleNamespace(
        automacao_ativa=Mock(return_value=True),
        avaliar_conquistas_secretas=Mock(return_value=[{"user_id": "7", "chave": "dedos_leves"}]),
        listar_conquistas_secretas=Mock(return_value=[{"user_id": "7", "chave": "dedos_leves"}]),
        get_conquistas_cargos=lambda _: dict(mapa),
        set_conquista_cargo=lambda gid, chave, cid: mapa.update({chave: cid}),
    )
    from weakref import WeakValueDictionary
    cog = object.__new__(Conquistas)
    cog.bot = SimpleNamespace(db=db)
    cog._locks = WeakValueDictionary()
    return SimpleNamespace(**locals())


def test_entrega_idempotente_e_nao_cria_cargo_com_permissoes():
    async def rodar():
        c = cenario()
        resultados = await asyncio.gather(c.cog.sincronizar(c.guild), c.cog.sincronizar(c.guild))
        assert sum(r["adicionados"] for r in resultados) == 1
        assert c.guild.create_role.await_count == 1
        assert c.membro.roles[0].permissions.value == 0
        assert c.mapa == {"dedos_leves": "10"}
    asyncio.run(rodar())


def test_falha_de_discord_fica_pendente_e_recupera_sem_duplicar_cargo():
    async def rodar():
        c = cenario()
        c.membro.add_roles.side_effect = discord.Forbidden(SimpleNamespace(status=403, reason="Forbidden"), "sem cargo")
        assert (await c.cog.sincronizar(c.guild))["pendentes"] == 1
        c.membro.add_roles.side_effect = None
        assert (await c.cog.sincronizar(c.guild))["adicionados"] == 1
        assert c.guild.create_role.await_count == 1
    asyncio.run(rodar())


def test_automacao_desligada_nao_entrega_nem_avalia():
    async def rodar():
        c = cenario()
        c.db.automacao_ativa.return_value = False
        assert not (await c.cog.sincronizar(c.guild))["ativa"]
        c.db.avaliar_conquistas_secretas.assert_not_called()
        c.guild.create_role.assert_not_awaited()
    asyncio.run(rodar())


def test_consulta_publica_nao_revela_criterios_ou_cargos_bloqueados():
    async def rodar():
        c = cenario()
        interaction = SimpleNamespace(guild=c.guild, guild_id=1, user=c.membro,
            response=SimpleNamespace(defer=AsyncMock()), followup=SimpleNamespace(send=AsyncMock()))
        await Conquistas.conquistas.callback(c.cog, interaction)
        texto = interaction.followup.send.call_args.args[0]
        assert "Dedos Leves" in texto
        assert "Sombra" not in texto and "roubo" not in texto
        assert interaction.followup.send.call_args.kwargs["ephemeral"] is True
    asyncio.run(rodar())


def test_cargo_que_ganhou_permissao_nao_e_distribuido():
    async def rodar():
        c = cenario()
        c.mapa["dedos_leves"] = "10"
        c.cargos[10] = SimpleNamespace(id=10, managed=False, permissions=discord.Permissions(administrator=True))
        assert (await c.cog.sincronizar(c.guild))["pendentes"] == 1
        c.membro.add_roles.assert_not_awaited()
    asyncio.run(rodar())


def test_dois_jogadores_desbloqueiam_o_mesmo_cargo_com_cache_atrasado():
    async def rodar():
        c = cenario()
        c.db.avaliar_conquistas_secretas.return_value.append({"user_id": "8", "chave": "dedos_leves"})
        outro = SimpleNamespace(id=8, bot=False, roles=[], add_roles=AsyncMock())
        c.guild.get_member = lambda uid: c.membro if uid == 7 else outro
        c.guild.get_role = lambda _: None
        assert (await c.cog.sincronizar(c.guild))["adicionados"] == 2
        assert c.guild.create_role.await_count == 1
        assert outro.add_roles.call_args.args[0].id == 10
    asyncio.run(rodar())
