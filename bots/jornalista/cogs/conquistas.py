"""Cargos secretos permanentes, reconciliados com os fatos do banco."""

import asyncio
import logging
from weakref import WeakValueDictionary

import discord
from discord import app_commands
from discord.ext import commands, tasks

from core.conquistas import CONQUISTAS, POR_CHAVE
from core.tasks_util import registrar_reinicio_em_erro

log = logging.getLogger("jornalista")


class Conquistas(commands.Cog):
    config = app_commands.Group(
        name="conquistas_config", description="Administra os cargos secretos do Jornalista.",
        guild_only=True, default_permissions=discord.Permissions(manage_guild=True),
    )

    def __init__(self, bot):
        self.bot = bot
        self._locks = WeakValueDictionary()
        registrar_reinicio_em_erro(self.ciclo, "ciclo_conquistas", log)
        self.ciclo.start()

    def cog_unload(self):
        self.ciclo.cancel()

    @tasks.loop(minutes=5)
    async def ciclo(self):
        for guild in self.bot.guilds:
            try:
                await self.sincronizar(guild)
            except Exception:
                log.exception("Falha ao sincronizar conquistas na guild %s", guild.id)

    @ciclo.before_loop
    async def _antes(self):
        await self.bot.wait_until_ready()

    async def sincronizar(self, guild, user_id=None):
        gid = str(guild.id)
        if not self.bot.db.automacao_ativa(gid, "conquistas_secretas", True):
            return {"adicionados": 0, "pendentes": 0, "ativa": False}
        lock = self._locks.get(gid)
        if lock is None:
            lock = self._locks[gid] = asyncio.Lock()
        async with lock:
            registros = self.bot.db.avaliar_conquistas_secretas(gid, user_id)
            mapa = self.bot.db.get_conquistas_cargos(gid)
            por_usuario = {}
            for r in registros:
                if r["chave"] in POR_CHAVE:
                    por_usuario.setdefault(r["user_id"], []).append(r["chave"])
            # create_role também depende de atualização posterior do cache.
            # Mantenha os objetos criados nesta passagem para todos os membros.
            cargos = {r.id: r for r in await guild.fetch_roles()} if por_usuario else {}
            adicionados = pendentes = 0
            indisponiveis = set()
            for uid, chaves in por_usuario.items():
                try:
                    membro = guild.get_member(int(uid)) or await guild.fetch_member(int(uid))
                except discord.NotFound:
                    continue  # preserva a conquista para quando a pessoa voltar
                except discord.HTTPException:
                    pendentes += len(chaves)
                    log.exception("Falha ao consultar membro %s para conquistas", uid)
                    continue
                if membro.bot:
                    continue
                for chave in chaves:
                    if chave in indisponiveis:
                        pendentes += 1
                        continue
                    cargo = cargos.get(int(mapa[chave])) if chave in mapa else None
                    try:
                        if cargo is None:
                            # Não reaproveita cargos pelo nome: podem dar acesso
                            # a canais ou ter permissões administrativas.
                            cargo = await guild.create_role(
                                name=POR_CHAVE[chave].nome, permissions=discord.Permissions.none(),
                                hoist=False, mentionable=False, reason="Conquista secreta do Jornalista",
                            )
                            self.bot.db.set_conquista_cargo(gid, chave, str(cargo.id))
                            mapa[chave] = str(cargo.id)
                            cargos[cargo.id] = cargo
                        if cargo.managed or cargo.permissions.value or not cargo.is_assignable():
                            indisponiveis.add(chave)
                            pendentes += 1
                            log.warning("Conquista %s: cargo %s sem hierarquia válida ou deixou de ser cosmético", chave, cargo.id)
                            continue
                        if cargo not in membro.roles:
                            await membro.add_roles(cargo, reason="Conquista secreta desbloqueada")
                            adicionados += 1
                    except discord.HTTPException as exc:
                        pendentes += 1
                        indisponiveis.add(chave)
                        log.warning("Conquista %s pendente para %s/%s: %s", chave, gid, uid, exc)
            return {"adicionados": adicionados, "pendentes": pendentes, "ativa": True}

    @app_commands.command(name="conquistas", description="Mostra apenas os títulos secretos que você já descobriu.")
    @app_commands.guild_only()
    async def conquistas(self, interaction: discord.Interaction):
        await interaction.response.defer(ephemeral=True)
        try:
            await self.sincronizar(interaction.guild, str(interaction.user.id))
        except discord.HTTPException:
            log.exception("Consulta de conquistas: entrega temporariamente indisponível")
        registros = self.bot.db.listar_conquistas_secretas(str(interaction.guild_id), str(interaction.user.id))
        nomes = [f"🏅 **{POR_CHAVE[r['chave']].nome}**" for r in registros if r["chave"] in POR_CHAVE]
        await interaction.followup.send(
            "\n".join(nomes) if nomes else "Você ainda não descobriu nenhum título secreto. Continue participando!",
            ephemeral=True,
        )

    @config.command(name="listar", description="Mostra ao mestre os critérios secretos e cargos criados.")
    @app_commands.checks.has_permissions(manage_guild=True)
    async def listar(self, interaction: discord.Interaction):
        mapa = self.bot.db.get_conquistas_cargos(str(interaction.guild_id))
        emb = discord.Embed(title="Cargos secretos — somente o mestre", colour=0x8E44AD)
        for c in CONQUISTAS:
            cargo = f"<@&{mapa[c.chave]}>" if c.chave in mapa else "Criado no primeiro desbloqueio"
            emb.add_field(name=c.nome, value=f"{c.criterio}.\n{cargo}", inline=False)
        emb.set_footer(text="Cargos cosméticos e permanentes · verificação a cada 5 minutos")
        await interaction.response.send_message(embed=emb, ephemeral=True)

    @config.command(name="sincronizar", description="Reavalia conquistas e tenta entregar cargos pendentes.")
    @app_commands.checks.has_permissions(manage_guild=True)
    async def sincronizar_comando(self, interaction: discord.Interaction, jogador: discord.Member = None):
        await interaction.response.defer(ephemeral=True)
        resultado = await self.sincronizar(interaction.guild, str(jogador.id) if jogador else None)
        if not resultado["ativa"]:
            texto = "Conquistas pausadas. Ligue com `/jornal automacao tipo:conquistas_secretas ligar:True`."
        else:
            texto = f"Cargos entregues: {resultado['adicionados']}. Pendentes: {resultado['pendentes']}."
            if resultado["pendentes"]:
                texto += " Confira Gerenciar Cargos, a hierarquia e os logs do bot. A entrega será tentada novamente."
        await interaction.followup.send(texto, ephemeral=True)


async def setup(bot):
    await bot.add_cog(Conquistas(bot))
