"""
Cog Registro — painéis de auto-registro por REAÇÃO (estilo Zira clássico). O
mestre cria painéis (ex.: Idade +18/-18, Pronomes, Notificações), cada um com N
opções; cada opção é um emoji. Quem reage ganha o cargo; quem tira a reação,
perde. Modo "único" = só um cargo do painel por vez (troca ao reagir em outro).

Persistência: os listeners são de reação crua (on_raw_reaction_add/remove), que
funcionam por id da mensagem + emoji mesmo depois de reiniciar — não precisa
recriar nada no boot. O mapeamento emoji→cargo vem do banco pelo id da mensagem.
"""

from __future__ import annotations

import logging

import discord
from discord import app_commands
from discord.ext import commands

from core import arvores as arvores_mod
from core import ui

log = logging.getLogger("jornalista")

# Discord deixa no máximo 20 reações por mensagem.
MAX_REACOES = 20

# Emojis padrão do preset de Árvores (um por Árvore, na ordem de ARVORES).
_EMOJIS_ARVORES = ("🌳", "🔥", "❄️", "⚡", "🌙", "☀️", "🌊", "💀", "🌀", "✨")


def _normalizar_emoji(bruto: str) -> str | None:
    """Forma canônica do emoji (igual à que `str(payload.emoji)` produz), pra
    casar na hora da reação. None se não parecer um emoji utilizável."""
    texto = (bruto or "").strip()
    if not texto:
        return None
    try:
        return str(discord.PartialEmoji.from_str(texto))
    except Exception:
        return None


class Registro(commands.Cog):
    registro = app_commands.Group(
        name="registro",
        description="Painéis de auto-registro por reação (cargos que o jogador escolhe com emoji).",
        default_permissions=discord.Permissions(manage_guild=True),
    )

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    async def _achar_painel(self, interaction: discord.Interaction, painel: int):
        if not interaction.guild_id:
            await interaction.response.send_message("⚠️ Isso só funciona dentro de um servidor.", ephemeral=True)
            return None
        p = self.bot.db.get_painel(str(interaction.guild_id), painel)
        if not p:
            await interaction.response.send_message(
                f"⚠️ Não achei o painel #{painel}. Veja os seus com `/registro paineis`.",
                ephemeral=True,
            )
            return None
        return p

    # ── Reações → cargos ─────────────────────────────────────────────────────
    @commands.Cog.listener()
    async def on_raw_reaction_add(self, payload: discord.RawReactionActionEvent):
        await self._toggle(payload, adicionar=True)

    @commands.Cog.listener()
    async def on_raw_reaction_remove(self, payload: discord.RawReactionActionEvent):
        await self._toggle(payload, adicionar=False)

    async def _toggle(self, payload: discord.RawReactionActionEvent, *, adicionar: bool):
        if payload.guild_id is None or (self.bot.user and payload.user_id == self.bot.user.id):
            return
        dados = self.bot.db.get_opcao_por_reacao(str(payload.message_id), str(payload.emoji))
        if dados is None:
            return  # reação em outra mensagem ou emoji não configurado

        guild = self.bot.get_guild(payload.guild_id)
        if guild is None:
            return
        cargo = guild.get_role(int(dados["cargo_id"]))
        if cargo is None:
            return
        membro = guild.get_member(payload.user_id)
        if membro is None:
            try:
                membro = await guild.fetch_member(payload.user_id)
            except discord.HTTPException:
                return
        if membro.bot:
            return

        try:
            if not adicionar:
                await membro.remove_roles(cargo, reason="Registro: tirou a reação")
                return
            if dados["unico"]:
                irmaos = {
                    int(cid) for cid in dados["cargos_irmaos"] if str(cid) != str(dados["cargo_id"])
                }
                remover = [r for r in membro.roles if r.id in irmaos]
                if remover:
                    await membro.remove_roles(*remover, reason="Registro único: troca")
                    await self._limpar_reacoes_irmas(payload, membro)
            await membro.add_roles(cargo, reason="Registro: reagiu")
        except discord.Forbidden:
            log.warning(
                "Sem permissão pra gerenciar o cargo %s na guild %s — dê 'Gerenciar Cargos' "
                "e suba o cargo do Jornalista acima dos de registro.", cargo.id, guild.id,
            )

    async def _limpar_reacoes_irmas(self, payload: discord.RawReactionActionEvent, membro: discord.Member):
        """No modo único, tira as reações antigas do membro no painel pra elas
        refletirem a escolha única. Precisa de 'Gerenciar Mensagens'; sem ela,
        só o cargo troca (as reações podem ficar dessincronizadas)."""
        canal = self.bot.get_channel(payload.channel_id)
        if canal is None:
            return
        try:
            msg = await canal.fetch_message(payload.message_id)
        except discord.HTTPException:
            return
        manter = str(payload.emoji)
        for reacao in msg.reactions:
            if str(reacao.emoji) == manter:
                continue
            try:
                await reacao.remove(membro)
            except discord.HTTPException:
                pass

    # ── Comandos de configuração (mestre) ────────────────────────────────────
    @registro.command(name="criar", description="Cria um painel de registro novo (ex.: Idade, Pronomes).")
    @app_commands.describe(
        titulo="Título do painel (aparece em destaque).",
        descricao="Texto explicativo (opcional).",
        unico="Só um cargo do painel por vez? Padrão: sim (ideal p/ +18/-18, ele/ela).",
    )
    async def criar(
        self,
        interaction: discord.Interaction,
        titulo: app_commands.Range[str, 1, 200],
        descricao: app_commands.Range[str, 0, 2000] = "",
        unico: bool = True,
    ):
        if not interaction.guild_id:
            await interaction.response.send_message("⚠️ Só dentro de um servidor.", ephemeral=True)
            return
        painel_id = self.bot.db.criar_painel(
            str(interaction.guild_id), titulo.strip(), (descricao or "").strip(), unico
        )
        await interaction.response.send_message(
            f"✅ Painel **#{painel_id}** criado: “{titulo.strip()}”.\n"
            f"Agora adicione opções com `/registro opcao painel:{painel_id} emoji:… …` e "
            f"depois publique com `/registro publicar painel:{painel_id}`.",
            ephemeral=True,
        )

    @registro.command(name="opcao", description="Adiciona uma opção de cargo (um emoji) a um painel.")
    @app_commands.describe(
        painel="Número do painel (veja em /registro paineis).",
        emoji="Emoji da reação (obrigatório — é ele que a pessoa clica).",
        texto="Rótulo que aparece na lista do painel (ex.: +18, Ele/Dele).",
        cargo="Cargo que a pessoa ganha ao reagir (deixe vazio pra criar um novo).",
        criar_cargo="Se não escolher um cargo, crio um cargo novo com este nome.",
    )
    async def opcao(
        self,
        interaction: discord.Interaction,
        painel: int,
        emoji: str,
        texto: app_commands.Range[str, 1, 80],
        cargo: discord.Role = None,
        criar_cargo: app_commands.Range[str, 1, 90] = None,
    ):
        p = await self._achar_painel(interaction, painel)
        if p is None:
            return

        emoji_norm = _normalizar_emoji(emoji)
        if emoji_norm is None:
            await interaction.response.send_message(
                "⚠️ Emoji inválido. Mande um emoji comum (😀) ou um emoji **deste servidor**.",
                ephemeral=True,
            )
            return
        existentes = self.bot.db.listar_opcoes(painel)
        if any((op.get("emoji") or "") == emoji_norm for op in existentes):
            await interaction.response.send_message(
                f"⚠️ O emoji {emoji_norm} já é usado nesse painel — cada opção precisa de um emoji diferente.",
                ephemeral=True,
            )
            return
        if len(existentes) >= MAX_REACOES:
            await interaction.response.send_message(
                f"⚠️ O painel já tem {MAX_REACOES} opções — é o máximo de reações que o Discord deixa numa mensagem.",
                ephemeral=True,
            )
            return

        if cargo is None and criar_cargo:
            try:
                cargo = await interaction.guild.create_role(
                    name=criar_cargo.strip(), reason=f"Registro painel #{painel}"
                )
            except discord.Forbidden:
                await interaction.response.send_message(
                    "⚠️ Sem permissão pra criar cargo. Me dê **Gerenciar Cargos** ou passe um cargo já existente.",
                    ephemeral=True,
                )
                return
        if cargo is None:
            await interaction.response.send_message(
                "⚠️ Escolha um `cargo` existente ou preencha `criar_cargo` com um nome.",
                ephemeral=True,
            )
            return

        opcao_id = self.bot.db.add_opcao(
            str(interaction.guild_id), painel, texto.strip(), str(cargo.id), emoji_norm
        )
        if opcao_id is None:
            await interaction.response.send_message(f"⚠️ Não achei o painel #{painel}.", ephemeral=True)
            return

        aviso = ""
        me = interaction.guild.me
        if cargo != interaction.guild.default_role and me.top_role <= cargo:
            aviso = (
                "\n⚠️ Esse cargo está **acima** do meu na hierarquia — não vou conseguir dá-lo/tirá-lo "
                "até você subir o cargo do Jornalista em Config. → Cargos."
            )
        await interaction.response.send_message(
            f"✅ Opção {emoji_norm} **{texto.strip()}** → {cargo.mention} adicionada ao painel "
            f"#{painel} (opção #{opcao_id}).{aviso}\n"
            f"Republique com `/registro publicar painel:{painel}` pra ver a reação nova.",
            ephemeral=True,
        )

    @registro.command(name="opcoes", description="Lista as opções (emojis) de um painel.")
    @app_commands.describe(painel="Número do painel.")
    async def opcoes(self, interaction: discord.Interaction, painel: int):
        p = await self._achar_painel(interaction, painel)
        if p is None:
            return
        ops = self.bot.db.listar_opcoes(painel)
        if not ops:
            await interaction.response.send_message(
                f"Painel #{painel} “{p['titulo']}” ainda não tem opções. "
                f"Adicione com `/registro opcao painel:{painel} emoji:… …`.",
                ephemeral=True,
            )
            return
        linhas = [
            f"• #{op['id']} — {op.get('emoji') or '❓'} {op['label']} → <@&{op['cargo_id']}>"
            for op in ops
        ]
        modo = "único (um cargo por vez)" if p["unico"] else "múltiplo (pode acumular)"
        await interaction.response.send_message(
            f"**Painel #{painel} — {p['titulo']}** · modo {modo}\n" + "\n".join(linhas),
            ephemeral=True,
        )

    @registro.command(name="remover_opcao", description="Remove uma opção (emoji) de um painel.")
    @app_commands.describe(painel="Número do painel.", opcao="Número da opção (veja em /registro opcoes).")
    async def remover_opcao(self, interaction: discord.Interaction, painel: int, opcao: int):
        if not interaction.guild_id:
            await interaction.response.send_message("⚠️ Só dentro de um servidor.", ephemeral=True)
            return
        ok = self.bot.db.remover_opcao(str(interaction.guild_id), painel, opcao)
        if ok:
            await interaction.response.send_message(
                f"✅ Opção #{opcao} removida. Republique com `/registro publicar painel:{painel}` pra atualizar.",
                ephemeral=True,
            )
        else:
            await interaction.response.send_message(
                f"⚠️ Não achei a opção #{opcao} no painel #{painel}.", ephemeral=True
            )

    @registro.command(name="modo", description="Define se o painel deixa só um cargo por vez (único) ou vários.")
    @app_commands.describe(painel="Número do painel.", unico="Sim = só um cargo por vez; Não = pode acumular.")
    async def modo(self, interaction: discord.Interaction, painel: int, unico: bool):
        if not interaction.guild_id:
            await interaction.response.send_message("⚠️ Só dentro de um servidor.", ephemeral=True)
            return
        ok = self.bot.db.set_painel_modo(str(interaction.guild_id), painel, unico)
        if not ok:
            await interaction.response.send_message(f"⚠️ Não achei o painel #{painel}.", ephemeral=True)
            return
        texto = "único (um cargo por vez)" if unico else "múltiplo (pode acumular)"
        await interaction.response.send_message(
            f"✅ Painel #{painel} agora é **{texto}**. Vale já nas próximas reações (não precisa republicar).",
            ephemeral=True,
        )

    @registro.command(name="publicar", description="Publica (ou republica) o painel e coloca as reações num canal.")
    @app_commands.describe(painel="Número do painel.", canal="Canal onde publicar (padrão: o canal atual).")
    async def publicar(
        self,
        interaction: discord.Interaction,
        painel: int,
        canal: discord.TextChannel = None,
    ):
        p = await self._achar_painel(interaction, painel)
        if p is None:
            return
        ops = self.bot.db.listar_opcoes(painel)
        if not ops:
            await interaction.response.send_message(
                f"⚠️ O painel #{painel} não tem opções ainda. "
                f"Adicione com `/registro opcao painel:{painel} emoji:… …` antes de publicar.",
                ephemeral=True,
            )
            return

        await interaction.response.defer(ephemeral=True)
        destino = canal or interaction.channel
        usaveis = ops[:MAX_REACOES]
        linhas = [f"{op.get('emoji') or '❓'} → <@&{op['cargo_id']}>" + (f" · {op['label']}" if op.get('label') else "") for op in usaveis]
        corpo = ((p["descricao"] + "\n\n") if p["descricao"] else "") + "\n".join(linhas)
        emb = ui.embed(p["titulo"], categoria="registro", descricao=corpo)
        emb.set_footer(text=f"{ui.MARCA} · Reaja com o emoji pra pegar o cargo · tire a reação pra remover")
        try:
            msg = await destino.send(embed=emb)
        except discord.Forbidden:
            await interaction.followup.send(
                f"⚠️ Não tenho permissão pra enviar mensagem em {destino.mention}.", ephemeral=True
            )
            return

        self.bot.db.set_painel_mensagem(painel, str(destino.id), str(msg.id))
        falhas = []
        for op in usaveis:
            emoji = op.get("emoji")
            if not emoji:
                continue
            try:
                await msg.add_reaction(discord.PartialEmoji.from_str(emoji))
            except (discord.HTTPException, ValueError, TypeError):
                falhas.append(emoji)

        aviso = ""
        if len(ops) > MAX_REACOES:
            aviso += f"\n⚠️ O painel tem {len(ops)} opções, mas o Discord só deixa {MAX_REACOES} reações — publiquei as {MAX_REACOES} primeiras."
        if falhas:
            aviso += f"\n⚠️ Não consegui reagir com: {' '.join(falhas)} (emoji de outro servidor? Use um deste servidor ou um emoji comum)."
        await interaction.followup.send(f"✅ Painel #{painel} publicado em {destino.mention}.{aviso}", ephemeral=True)

    @registro.command(name="paineis", description="Lista todos os painéis de registro do servidor.")
    async def paineis(self, interaction: discord.Interaction):
        if not interaction.guild_id:
            await interaction.response.send_message("⚠️ Só dentro de um servidor.", ephemeral=True)
            return
        lst = self.bot.db.listar_paineis(str(interaction.guild_id))
        if not lst:
            await interaction.response.send_message(
                "Nenhum painel ainda. Crie um com `/registro criar` (ou use "
                "`/registro preset_arvores` pro painel pronto das 10 Árvores).",
                ephemeral=True,
            )
            return
        linhas = []
        for p in lst:
            pub = "publicado" if p.get("mensagem_id") else "não publicado"
            modo = "único" if p["unico"] else "múltiplo"
            linhas.append(f"• **#{p['id']}** — {p['titulo']} · {p['num_opcoes']} opção(ões) · {modo} · {pub}")
        await interaction.response.send_message("**Painéis de registro:**\n" + "\n".join(linhas), ephemeral=True)

    @registro.command(name="apagar", description="Apaga um painel inteiro (não apaga os cargos do servidor).")
    @app_commands.describe(painel="Número do painel.")
    async def apagar(self, interaction: discord.Interaction, painel: int):
        if not interaction.guild_id:
            await interaction.response.send_message("⚠️ Só dentro de um servidor.", ephemeral=True)
            return
        ok = self.bot.db.apagar_painel(str(interaction.guild_id), painel)
        if ok:
            await interaction.response.send_message(
                f"🗑️ Painel #{painel} apagado. (Os cargos continuam no servidor; apague-os à mão se quiser.)",
                ephemeral=True,
            )
        else:
            await interaction.response.send_message(f"⚠️ Não achei o painel #{painel}.", ephemeral=True)

    @registro.command(name="canal", description="Define pra qual canal as boas-vindas mandam os novatos se registrarem.")
    @app_commands.describe(canal="Canal de registro (ex.: #registro).")
    async def canal(self, interaction: discord.Interaction, canal: discord.TextChannel):
        if not interaction.guild_id:
            await interaction.response.send_message("⚠️ Só dentro de um servidor.", ephemeral=True)
            return
        self.bot.db.set_registro_canal(str(interaction.guild_id), str(canal.id))
        await interaction.response.send_message(
            f"📋 Canal de registro das boas-vindas: {canal.mention}.", ephemeral=True
        )

    @registro.command(name="preset_arvores", description="Cria um painel pronto com as 10 Árvores do Jardim (cria os cargos).")
    async def preset_arvores(self, interaction: discord.Interaction):
        if not interaction.guild_id or not interaction.guild:
            await interaction.response.send_message("⚠️ Só dentro de um servidor.", ephemeral=True)
            return
        await interaction.response.defer(ephemeral=True)

        guild = interaction.guild
        painel_id = self.bot.db.criar_painel(
            str(interaction.guild_id),
            "Registro por Árvore",
            "Reaja com o emoji da sua Árvore do Jardim — é cosmético, muda a cor do seu nome. "
            "Dá pra trocar quando quiser (tire a reação antiga).",
            unico=True,
        )
        criados, falhou = [], []
        for indice, arvore in enumerate(arvores_mod.ARVORES):
            cargo = discord.utils.get(guild.roles, name=arvore.nome)
            if cargo is None:
                try:
                    cargo = await guild.create_role(
                        name=arvore.nome,
                        colour=discord.Colour(arvore.cor),
                        reason="Preset de Árvores (registro)",
                    )
                    criados.append(arvore.nome)
                except discord.Forbidden:
                    falhou.append(arvore.nome)
                    continue
            emoji = _EMOJIS_ARVORES[indice % len(_EMOJIS_ARVORES)]
            self.bot.db.add_opcao(str(interaction.guild_id), painel_id, arvore.nome, str(cargo.id), emoji)

        txt = f"✅ Painel de Árvores criado (#{painel_id}) com {len(arvores_mod.ARVORES) - len(falhou)} opções."
        if criados:
            txt += f"\nCargos criados: {', '.join(criados)}."
        if falhou:
            txt += f"\n⚠️ Sem permissão pra criar: {', '.join(falhou)} (me dê **Gerenciar Cargos**)."
        txt += f"\nAgora publique com `/registro publicar painel:{painel_id}`."
        await interaction.followup.send(txt, ephemeral=True)


async def setup(bot: commands.Bot):
    await bot.add_cog(Registro(bot))
