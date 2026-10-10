"""Teste de fumaça dos bots: chama o callback de TODO comando com uma interação falsa e os
argumentos mínimos, contra um Postgres de teste. Uma exceção não tratada é achado (bug ou artefato do
harness: revisar um a um). Comandos que esperam botão de confirmação aparecem como TIMEOUT (normal).

Uso (PowerShell), com o Postgres de teste no ar:
  $env:TEST_DATABASE_URL='postgresql://jardim:jardim-local@localhost:5434/jardim_teste'; $env:DATABASE_URL=''
  bots/banqueiro/.venv-test/Scripts/python.exe tools/fumaca-comandos.py <pasta-do-bot> <banqueiro|jornalista>
"""
import asyncio
import inspect
import os
import sys
import traceback
from types import SimpleNamespace

import discord
from discord import app_commands

bot_dir = sys.argv[1]
nome_bot = sys.argv[2]
sys.path.insert(0, bot_dir)
os.chdir(bot_dir)

from tests.db_utils import novo_db  # noqa: E402

G = "100"
USER = 200
OUTRO = 300


class Msg:
    def __init__(self, i=1):
        self.id = i
        self.content = ""
        self.embeds = []

    async def edit(self, **kw):
        return self

    async def delete(self):
        return None

    async def add_reaction(self, *a):
        return None


class FakeCanal(discord.TextChannel):
    def __init__(self, cid=555):
        self.id = cid
        self.name = "geral"
        self.enviados = []

    @property
    def mention(self):
        return f"<#{self.id}>"

    async def send(self, *a, **kw):
        self.enviados.append((a, kw))
        return Msg(len(self.enviados))

    async def fetch_message(self, mid):
        return Msg(mid)

    def permissions_for(self, m):
        return discord.Permissions.all()

    @property
    def guild(self):
        return SimpleNamespace(id=100, name="Jardim", me=FakeMembro(1, "Bot"), get_role=lambda r: None)


class _Base(discord.Member):
    def __init__(self):
        self.dms = []

    @property
    def display_avatar(self):
        return SimpleNamespace(url="https://cdn.discordapp.com/embed/avatars/0.png")

    async def send(self, *a, **kw):
        self.dms.append((a, kw))
        return Msg()


def FakeMembro(uid, nome="Jogador"):
    cls = type("FakeMembro", (_Base,), {
        "id": uid, "display_name": nome, "name": nome, "bot": False, "mention": f"<@{uid}>",
        "roles": [], "guild_permissions": discord.Permissions.all(),
    })
    return cls()


class Resp:
    def __init__(self):
        self.feito = False
        self.eventos = []

    def is_done(self):
        return self.feito

    async def send_message(self, *a, **kw):
        if self.feito:
            raise RuntimeError("InteractionResponded: segunda resposta")
        self.feito = True
        self.eventos.append(("send", a, kw))

    async def defer(self, **kw):
        if self.feito:
            raise RuntimeError("InteractionResponded: defer duplo")
        self.feito = True

    async def edit_message(self, **kw):
        self.feito = True

    async def send_modal(self, modal):
        self.feito = True
        self.eventos.append(("modal", modal))


class Follow:
    def __init__(self, resp):
        self.resp = resp

    async def send(self, *a, **kw):
        if not self.resp.feito:
            raise RuntimeError("followup antes de responder")
        return Msg()


def nova_interacao(bot, canal, membro, outros):
    resp = Resp()
    guild = SimpleNamespace(
        id=int(G), name="Jardim", me=outros[0], members=[membro] + outros,
        get_channel=lambda cid: canal if cid == canal.id else None,
        get_member=lambda uid: next((m for m in [membro] + outros if m.id == uid), None),
        get_role=lambda rid: None, roles=[], text_channels=[canal], owner_id=999,
        fetch_member=None,
    )
    guild.fetch_member = lambda uid: _coro(guild.get_member(uid))

    async def create_role(**kw):
        return SimpleNamespace(id=888, name=kw.get("name", "x"), mention="<@&888>", position=1, managed=False)

    guild.create_role = create_role
    inter = SimpleNamespace(
        id=1, guild_id=int(G), guild=guild, user=membro, channel=canal, channel_id=canal.id,
        client=bot, response=resp, followup=Follow(resp), command=None,
        locale=discord.Locale.brazil_portuguese, namespace=SimpleNamespace(),
        permissions=discord.Permissions.all(),
    )

    async def original_response():
        return Msg(77)

    async def edit_original_response(**kw):
        return Msg(77)

    inter.original_response = original_response
    inter.edit_original_response = edit_original_response
    return inter


async def _coro(v):
    return v


def valor_para(param):
    t = param.type
    if param.choices:
        c = param.choices[0]
        return app_commands.Choice(name=c.name, value=c.value)
    if t == discord.AppCommandOptionType.string:
        minimo = getattr(param, "min_value", None) or 1
        texto = "teste"
        while len(texto) < int(minimo):
            texto += "x"
        return texto
    if t == discord.AppCommandOptionType.integer:
        v = 1
        if param.min_value is not None:
            v = max(v, int(param.min_value))
        if param.max_value is not None:
            v = min(v, int(param.max_value))
        return v
    if t == discord.AppCommandOptionType.number:
        return 1.0
    if t == discord.AppCommandOptionType.boolean:
        return True
    if t in (discord.AppCommandOptionType.user, discord.AppCommandOptionType.mentionable):
        return FakeMembro(OUTRO, "Outro")
    if t == discord.AppCommandOptionType.channel:
        return FakeCanal(556)
    if t == discord.AppCommandOptionType.role:
        return SimpleNamespace(id=777, name="Cargo", mention="<@&777>", position=1, managed=False, is_default=lambda: False)
    return None


def comandos(bot):
    achados = []

    def visitar(cmd, prefixo=""):
        if isinstance(cmd, app_commands.Group):
            for sub in cmd.commands:
                visitar(sub, f"{prefixo}{cmd.name} ")
        else:
            achados.append((f"{prefixo}{cmd.name}", cmd))

    for c in bot.tree.get_commands():
        visitar(c)
    return achados


async def principal(fabricar_bot):
    db = novo_db()
    bot = await fabricar_bot(db)
    canal = FakeCanal()
    membro = FakeMembro(USER, "Lina")
    outros = [FakeMembro(OUTRO, "Outro"), FakeMembro(400, "Terceiro")]
    for uid in (USER, OUTRO, 400):
        db.garantir_jogador(G, str(uid))
        db.creditar(G, str(uid), "Lunaris", 500)
    resultados = {"ok": 0, "erro": []}
    for caminho, cmd in comandos(bot):
        kwargs = {}
        for p in cmd.parameters:
            if p.required:
                kwargs[p.name] = valor_para(p)
        inter = nova_interacao(bot, canal, membro, outros)
        inter.command = cmd
        try:
            binding = getattr(cmd, "binding", None)
            print("..", caminho, flush=True)
            if binding is not None:
                await asyncio.wait_for(cmd.callback(binding, inter, **kwargs), 20)
            else:
                await asyncio.wait_for(cmd.callback(inter, **kwargs), 20)
            resultados["ok"] += 1
        except asyncio.TimeoutError:
            resultados["erro"].append((caminho, "TIMEOUT", "mais de 20s", "?")) 
        except Exception as exc:  # noqa: BLE001
            tb = traceback.extract_tb(exc.__traceback__)
            quadro = tb[-1]
            resultados["erro"].append((caminho, type(exc).__name__, str(exc)[:140], f"{os.path.basename(quadro.filename)}:{quadro.lineno}"))
    print(f"[{nome_bot}] comandos chamados sem exceção: {resultados['ok']}, com exceção: {len(resultados['erro'])}")
    for e in resultados["erro"]:
        print("  /%s -> %s: %s  @ %s" % e)
    await bot.close()


if __name__ == "__main__":
    if nome_bot == "jornalista":
        from tests.test_painel import _bot_carregado

        fabricar = _bot_carregado
    else:
        from types import SimpleNamespace as NS

        import discord as _d
        from discord.ext import commands as _c

        from core.catalogo import Catalogo
        from core.inventario import Inventario
        from tests.test_comandos import EXTENSOES

        async def fabricar(db):
            bot = _c.Bot(command_prefix="!", intents=_d.Intents.default())
            bot.db = db
            bot.platform = None
            bot._ready = asyncio.Event()
            cat = Catalogo()
            cat.carregar_arquivo(os.path.join(bot_dir, "..", "..", "data", "loja", "catalogo.json"))
            bot.catalogo = cat
            bot.inventario = Inventario(bot)
            for ext in EXTENSOES:
                await bot.load_extension(ext)
            return bot

    asyncio.run(principal(fabricar))
