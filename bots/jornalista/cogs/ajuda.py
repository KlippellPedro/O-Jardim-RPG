"""Cog Ajuda: menu de comandos do Jornalista por categoria (Select do Discord).

Não existia até 17/07/2026: o bot tinha comandos mas nenhum jeito de
descobrir quais, diferente do Banqueiro/Barista que já tinham /ajuda."""

from __future__ import annotations

import discord
from discord import app_commands
from discord.ext import commands

from core import ui

CATEGORIAS = {
    "guia": {
        "rotulo": "🌿 Comece por aqui",
        "descricao": "O que o Jornalista faz no Jardim, em poucas linhas.",
        "comandos": [
            ("🧭 O painel /jardim", "Abre, só para você, o jornal do dia: estação e clima, horóscopo, os baús no ar, eventos do Mestre e avisos pessoais. Tem atalhos para classificado, furo e entrevistas."),
            ("🎁 Baús", "Aparecem sozinhos várias vezes por dia. Comuns e Incomuns são para todo mundo: toque em **Pegar o meu** e cada um leva o seu. Raros ou melhores viram uma corrida de enigma: quem acertar primeiro leva. Quem tentou e errou ganha uma **Pista de Sorte**, que melhora o próximo baú. Veja o dia com `/baus_hoje`."),
            ("🗝️ Chaves do Jardim", "Você compra no `/banco` (☾ 40). Uma Chave é gasta sozinha no próximo baú Incomum ou melhor que você pegar e abre o fundo falso: mais Lunaris e um item extra. Nunca é obrigatória."),
            ("📚 Coleção das Dez Árvores", "Os baús podem trazer fragmentos. Com 3 fragmentos de uma Árvore você revela uma página dela, com textos reais do Jardim. Se você tem o cargo daquela Árvore, os baús dão 10% a mais de Lunaris. Acompanhe no `/jardim`."),
            ("🔮 Horóscopo e estação", "Todo dia as estrelas favorecem uma Árvore: quem tem o cargo dela ganha o dobro de Lunaris nos baús do dia. A estação do Jardim muda o que costuma cair."),
            ("🏛️ Cofre do Jardim", "Uma meta de Lunaris que o Mestre abre para a mesa inteira. Todos doam pelo `/banco`. Bateu a meta, vem a recompensa (às vezes um festival de baús). Não bateu até o prazo, cada um recebe de volta o que doou."),
            ("📰 Classificados", "Com `/anunciar_classificado` você paga em Lunaris para anunciar por 7 dias (compro, vendo, procuro grupo, serviço). Quem se interessar toca em **Responder** e você recebe o recado por DM."),
            ("📸 Furos", "Com `/vender_furo` você escreve uma história sobre outro jogador e o Jornalista paga se achar boa. A pessoa é avisada, sem saber quem vendeu, e tem 30 minutos para pagar o suborno ou desmentir de graça. O Mestre pode barrar."),
            ("🎙️ Entrevista da semana", "Toda semana o Jornalista manda uma pergunta por DM para alguém. Responda na própria DM, confira como vai ficar e toque em **Publicar**. DM fechada? Use `/entrevista_responder`. Não quer ser sorteado? `/entrevista_participar`."),
            ("🎯 Procurados e edição de domingo", "Se o Mestre ligou, há um quadro fixo com os maiores procurados do Jardim. No domingo à noite sai a edição da semana: tempo, caçadores de baú, procurados, bastidores, entrevista e Loteria."),
            ("⬆️ Destaques da mesa", "Quando alguém sobe de nível ou ganha um selo, o jornal comenta. O Mestre decide no site se quer esses avisos."),
        ],
    },
    "baus": {
        "rotulo": "🎁 Baús automáticos",
        "descricao": "Baús que aparecem sozinhos pelo servidor.",
        "comandos": [
            ("/bau_config", "[Mestre] Liga/desliga os baús e define janela, quantos por dia e valores-base; a raridade escala o resto."),
            ("/bau_canal_adicionar <canal>", "[Mestre] Adiciona um destino à rotação aleatória."),
            ("/bau_canal_remover <canal>", "[Mestre] Remove um destino da rotação."),
            ("/bau_canais", "[Mestre] Lista destinos válidos e canais ignorados por falta de acesso."),
            ("/bau_pendentes", "[Mestre] Lista vencedores cuja entrega ainda precisa ser confirmada."),
            ("/bau_reprocessar <mensagem_id>", "[Mestre] Tenta novamente a mesma entrega, com vencedor, prêmio e chave preservados."),
            ("/bau_agora [canal] [raridade]", "[Mestre] Solta um baú agora; pode forçar a raridade para testar enigma e prazo."),
            ("/bau_mural [canal]", "[Mestre] Mantém o mural \"Achados de hoje\" num canal, atualizado a cada baú."),
            ("/baus_hoje", "Mostra os baús de hoje e as suas Pistas de Sorte (bônus para quem tentou o enigma e não levou)."),
            ("/bau_canal_tema <canal> [tipo]", "[Mestre] Enviesa o tipo de item que cai nos baús de um canal (imersão geográfica)."),
        ],
    },
    "jornal": {
        "rotulo": "📰 Jornal",
        "descricao": "Notícias, estação e clima do Jardim.",
        "comandos": [
            ("/jardim", "Abre o painel do Jornal Lunar: estação, horóscopo, baús, eventos e avisos para você, com atalhos para classificado, furo e entrevistas."),
            ("/jornal configurar <principal>", "[Mestre] Configura de uma vez os canais principais e, opcionalmente, um canal de baús."),
            ("/jornal status", "[Mestre] Diagnostica canais, permissões, automações, estação e baús."),
            ("/publicar_noticia", "Abre o formulário de notícia. O Mestre publica na hora; qualquer jogador pode enviar, mas vira uma pauta que o Mestre precisa aprovar."),
            ("/jornal principal <canal>", "[Mestre] Define o canal principal e fallback do Jornalista."),
            ("/jornal estacao_definir <estacao>", "[Mestre] Define a estação do Jardim (muda o loot dos baús)."),
            ("/jornal avancar_mes", "[Mestre] Sorteia o clima do mês, restrito pela estação atual."),
            ("/jornal clima_auto <ligar>", "[Mestre] Liga/desliga o boletim automático do Jornal Lunar (a cada ~48h)."),
            ("/jornal estacao_auto <ligar>", "[Mestre] Liga/desliga a rotação automática de estação (avança 1x/semana)."),
            ("/jornal rumor <texto> [horas]", "[Mestre] Publica um rumor e agenda um baú surpresa em algumas horas."),
            ("/jornal desafio <pergunta> <resposta> [recompensa]", "[Mestre] Publica uma pergunta com a resposta certa; quem acertar primeiro leva os Lunaris."),
            ("/jornal mensagem <tipo> <texto>", "[Mestre] Edita o texto de entrada/saída de membros (use {mencao} e {nome})."),
            ("/jornal mensagem_ver <tipo>", "[Mestre] Mostra o texto atual (personalizado ou padrão) de entrada/saída."),
            ("/jornal canal <categoria> <canal>", "[Mestre] Define o canal de cada conteúdo (entrada, saída, notícia, clima, dinheiro, sessão e liberações do Mestre)."),
            ("/jornal canais", "[Mestre] Mostra em que canal cada conteúdo é publicado."),
            ("/jornal imagem <tipo> <url>", "[Mestre] Imagem fixa das boas-vindas ou da despedida."),
            ("/jornal canais_boasvindas <canal1>", "[Mestre] Canais do bloco 'Confira estes canais' das boas-vindas."),
            ("/estacao", "Mostra a estação atual do Jardim."),
            ("/subornar_jornalista", "Paga o suborno exigido pelo Jornalista para abafar uma fofoca sua."),
            ("/anunciar_classificado <texto> [valor] [categoria]", "Paga em Lunaris (mínimo 50) para publicar um anúncio no jornal por 7 dias. Quem lê responde pelo botão e você recebe o recado por DM."),
            ("/vender_furo <jogador> [historia]", "Trabalho freelance! Escreva o furo e venda ao Jornalista em troca de Lunaris. A vítima é avisada e pode subornar ou desmentir; o Mestre pode barrar."),
        ],
    },
    "editorial": {
        "rotulo": "⚙️ Pautas e automações",
        "descricao": "Controle editorial, agendamentos e recuperação de falhas.",
        "comandos": [
            ("/jornal automacao <tipo> <ligar>", "[Mestre] Liga/desliga entrevistas, horóscopo, avisos, resumos, baús e outras automações."),
            ("/jornal automacoes", "[Mestre] Mostra tudo que o Jornalista pode enviar sozinho."),
            ("/jornal pauta criar", "[Mestre] Cria um rascunho persistente sem publicar."),
            ("/jornal pauta listar", "[Mestre] Lista rascunhos, agendamentos e publicações recentes."),
            ("/jornal pauta ver <pauta_id>", "[Mestre] Mostra a prévia privada de uma pauta."),
            ("/jornal pauta publicar <pauta_id>", "[Mestre] Aprova e publica uma pauta agora."),
            ("/jornal pauta agendar <pauta_id> <quando>", "[Mestre] Aprova uma pauta para data e hora futuras."),
            ("/jornal pauta cancelar <pauta_id>", "[Mestre] Cancela um rascunho ou agendamento."),
            ("/jornal fila", "[Mestre] Lista publicações automáticas pendentes ou com falha."),
            ("/jornal fila_reprocessar <publicacao_id>", "[Mestre] Reativa uma publicação que esgotou as tentativas."),
            ("/jornal meta criar <titulo> <alvo> [dias] [descricao] [recompensa] [festival_horas]", "[Mestre] Abre o Cofre do Jardim: a mesa doa Lunaris pelo /banco; sem bater a meta no prazo, tudo é devolvido."),
            ("/jornal meta listar", "[Mestre] Lista as metas recentes e como terminaram."),
            ("/jornal meta cancelar <meta_id>", "[Mestre] Cancela a meta aberta e devolve as doações."),
            ("/jornal evento criar <titulo> [texto] [horas] [tipo]", "[Mestre] Anuncia um evento: sai no jornal e aparece em /jardim e /banco até acabar."),
            ("/jornal evento listar", "[Mestre] Lista os eventos recentes e se ainda valem."),
            ("/jornal evento encerrar <evento_id>", "[Mestre] Encerra um evento antes do prazo."),
            ("/jornal furo listar", "[Mestre] Mostra os furos recentes dos jogadores e se ainda dá para barrar."),
            ("/jornal furo vetar <furo_id>", "[Mestre] Barra um furo que ainda não saiu."),
            ("/jornal orcamento [limite]", "[Mestre] Consulta ou altera o teto mensal de recompensas editoriais."),
        ],
    },
    "registro": {
        "rotulo": "🪪 Registro por reações",
        "descricao": "Painéis de cargos por reação: o jogador reage com o emoji (estilo Zira).",
        "comandos": [
            ("/registro criar <titulo> [descricao] [unico]", "[Mestre] Cria um painel novo (ex.: Idade, Pronomes)."),
            ("/registro opcao <painel> <emoji> <texto> [cargo] [criar_cargo]", "[Mestre] Adiciona uma opção de cargo (um emoji) ao painel."),
            ("/registro publicar <painel> [canal]", "[Mestre] Publica o painel e coloca as reações num canal."),
            ("/registro paineis", "[Mestre] Lista todos os painéis do servidor."),
            ("/registro opcoes <painel>", "[Mestre] Lista as opções (reações) de um painel."),
            ("/registro remover_opcao <painel> <opcao>", "[Mestre] Remove uma opção do painel."),
            ("/registro modo <painel> <unico>", "[Mestre] Um cargo por vez (único) ou vários."),
            ("/registro apagar <painel>", "[Mestre] Apaga um painel inteiro."),
            ("/registro canal <canal>", "[Mestre] Canal pra onde as boas-vindas mandam os novatos."),
            ("/registro preset_arvores", "[Mestre] Cria um painel pronto com as 10 Árvores do Jardim."),
            ("/registro cargo_arvore <arvore> <cargo>", "[Mestre] Liga uma Árvore a um cargo existente (necessário pro bônus do horóscopo)."),
            ("/conquistas", "Mostra em privado os títulos secretos que você já descobriu."),
            ("/conquistas_config listar", "[Mestre] Mostra os critérios e os cargos secretos criados."),
            ("/conquistas_config sincronizar [jogador]", "[Mestre] Reavalia conquistas e tenta entregar cargos pendentes."),
        ],
    },
    "estrelas": {
        "rotulo": "✨ Horóscopo e Entrevista",
        "descricao": "Consultas e respostas das features que rodam sozinhas pelo Jardim.",
        "comandos": [
            ("/horoscopo", "Mostra a Árvore favorecida pelas estrelas hoje e se você tem o cargo dela."),
            ("/entrevista_responder", "Responde à entrevista pendente no servidor; a pergunta aparece no modal."),
            ("/entrevista_participar <participar>", "Escolhe se você aceita ser sorteado para entrevistas."),
        ],
    },
}


def _eh_mestre(interaction: discord.Interaction) -> bool:
    permissoes = getattr(interaction, "permissions", None)
    return bool(permissoes and (permissoes.manage_guild or permissoes.administrator))


def _entradas(chave: str, mestre: bool = True) -> list:
    """Entradas visíveis da categoria. Quem não é Mestre não vê os comandos marcados [Mestre]."""
    todas = CATEGORIAS[chave]["comandos"]
    return todas if mestre else [(c, d) for c, d in todas if not d.startswith("[Mestre]")]


def _categorias_visiveis(mestre: bool = True) -> list:
    return [chave for chave in CATEGORIAS if _entradas(chave, mestre)]


def _pagina(chave: str, mestre: bool = True) -> discord.Embed:
    info = CATEGORIAS[chave]
    emb = ui.embed(info["rotulo"], categoria="noticia", descricao=info["descricao"])
    for cmd, desc in _entradas(chave, mestre):
        emb.add_field(name=cmd[:256], value=desc[:1024], inline=False)
    emb.set_footer(text=f"{ui.MARCA} · Escolha outra categoria no menu abaixo")
    return emb


class MenuAjuda(discord.ui.View):
    def __init__(self, autor_id: int, timeout: float = 120, mestre: bool = False):
        super().__init__(timeout=timeout)
        self.autor_id = autor_id
        self.mestre = mestre
        self.select.options = [
            discord.SelectOption(label=CATEGORIAS[chave]["rotulo"], value=chave, description=CATEGORIAS[chave]["descricao"][:100])
            for chave in _categorias_visiveis(mestre)
        ]

    async def interaction_check(self, interaction: discord.Interaction) -> bool:
        if interaction.user.id != self.autor_id:
            await interaction.response.send_message("Só quem pediu `/ajuda` pode usar esse menu.", ephemeral=True)
            return False
        return True

    @discord.ui.select(placeholder="Escolha uma categoria de comandos…")
    async def select(self, interaction: discord.Interaction, select: discord.ui.Select):
        chave = select.values[0]
        await interaction.response.edit_message(embed=_pagina(chave, self.mestre), view=self)

    async def on_timeout(self) -> None:
        for child in self.children:
            child.disabled = True


class Ajuda(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @app_commands.command(description="Mostra o menu de comandos do Jornalista por categoria.")
    async def ajuda(self, interaction: discord.Interaction):
        mestre = _eh_mestre(interaction)
        view = MenuAjuda(autor_id=interaction.user.id, mestre=mestre)
        await interaction.response.send_message(
            embed=_pagina(_categorias_visiveis(mestre)[0], mestre), view=view, ephemeral=True
        )


async def setup(bot):
    await bot.add_cog(Ajuda(bot))
