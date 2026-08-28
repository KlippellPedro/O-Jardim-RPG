"""Cog Ajuda: menu de comandos do Banqueiro por categoria (Select do Discord)."""

from __future__ import annotations

import discord
from discord import app_commands
from discord.ext import commands

from core import ui

CATEGORIAS = {
    "economia": {
        "rotulo": "💰 Economia",
        "descricao": "Carteira, câmbio, cofre e Cartão Lunar. Itens são comprados na Loja do site.",
        "comandos": [
            ("/carteira [membro]", "Mostra seus dados financeiros em privado; só mestres podem consultar outra pessoa."),
            ("/perfil [membro]", "Mostra o perfil econômico em privado; só mestres podem consultar outra pessoa."),
            ("/pagar <membro> <quantia>", "Transfere dinheiro da sua carteira pra de outro jogador."),
            ("/ranking [categoria]", "Top 10 do servidor: carteira, patrimônio, poupança, roubos, recompensas ou leilão."),
            ("/extrato [membro]", "Mostra o histórico em privado; só mestres podem consultar outra pessoa."),
            ("/item <busca>", "Consulta os detalhes de um item; compras e revendas ficam na Loja do site."),
            ("/monstro <busca>", "Mostra a ficha de um monstro do bestiário."),
            ("/inventario", "Mostra seu inventário."),
            ("/cambio <de> <para> <quantia>", "Troca Lunaris ⇄ Solares."),
            ("/cambio_ver", "Mostra a taxa de câmbio atual e se o ajuste automático está ligado."),
            ("/cofre", "Mostra seu cofre/armazém (itens, dinheiro guardado e segurança)."),
            ("/cofre_melhorias", "Mostra apenas os próximos upgrades disponíveis, seus ganhos e custos."),
            ("/cofre_melhorar", "Faz upgrade do cofre (mais itens e mais dinheiro guardável)."),
            ("/cofre_seguranca_melhorar", "Sobe a segurança do cofre (reduz a chance de te roubarem)."),
            ("/cofre_depositar <quantia>", "Guarda dinheiro no cofre, onde a segurança reduz o risco de roubo."),
            ("/cofre_sacar <quantia>", "Tira dinheiro do cofre pra carteira (cobra taxa pequena)."),
            ("/cartao", "Mostra nível, limite total/disponível e reputação bancária."),
            ("/cartao_melhorar", "Sobe o nível do Cartão Lunar."),
            ("/fatura", "Mostra compras financiadas e seus vencimentos em sete dias."),
            ("/fatura_pagar <quantia>", "Paga faturas antigas; quitação pontual concede reputação."),
            ("/divida", "Mostra sua situação de dívida no Cartão Lunar (e se você tá procurado)."),
            ("/divida_pagar <quantia>", "Paga voluntariamente parte ou toda a dívida usando a carteira."),
        ],
    },
    "roubo": {
        "rotulo": "🥷 Roubo",
        "descricao": "Risco e recompensa entre jogadores. O ladrão recebe respostas privadas e a defesa chega por DM ao alvo.",
        "comandos": [
            ("/roubo_planejar <membro>", "Envia por DM faixas de riqueza, risco, abordagens e seu Calor, sem revelar saldos exatos."),
            ("/roubar <membro> [abordagem]", "Tenta roubar a carteira com abordagem Cuidadosa, Rápida ou Disfarçada."),
            ("/roubar_cofre <membro> [abordagem]", "Tenta arrombar o cofre; segurança, Calor e abordagem afetam o resultado."),
            ("/preparo_roubo_comprar <tipo>", "Compra consumíveis para abordagens especiais, como o Kit de Disfarce."),
            ("/preparos_roubo", "Mostra consumíveis de roubo e seu Calor atual."),
            ("/recompensa_colocar <membro> <valor>", "Coloca recompensa na cabeça de outro jogador (pago da sua carteira)."),
            ("/recompensa_ver [membro]", "Mostra a recompensa em alguém, ou os mais procurados do servidor."),
            ("/cacar <membro>", "Caça um jogador que tem recompensa na cabeça (Mini-game)."),
            ("/protecao_comprar <tipo>", "Compra um item de defesa passiva (Cão de Guarda ou Alarme Mágico) contra roubo."),
            ("/protecao_ver", "Mostra suas proteções ativas contra roubo."),
            ("/contratar_guarda", "Consome um contrato de guarda-costas para proteger sua carteira e cofre de um roubo."),
        ],
    },
    "baus": {
        "rotulo": "🎁 Baús",
        "descricao": "Baús do Banqueiro. Os baús automáticos do servidor são anunciados pelo Jornalista.",
        "comandos": [
            ("/loja_baus", "Baús que dá pra comprar e abrir."),
            ("/comprar_bau <tipo>", "Compra um baú de loot."),
            ("/meus_baus", "Mostra os baús que você tem pra abrir."),
            ("/abrir_bau <tipo>", "Abre um baú que você comprou."),
            ("/abrir_todos [tipo]", "Abre todos os baús que você tem de uma vez."),
        ],
    },
    "trocas": {
        "rotulo": "🤝 Trocas",
        "descricao": "Ofereça itens ou baús a outros jogadores.",
        "comandos": [
            ("/oferecer <para> <o_que> <preco>", "Oferece um item/baú seu a outro jogador (dá pra cancelar antes de ser aceita)."),
            ("/trocar <membro> <meu_item> <item_dele>", "Troca segura item-por-item: ninguém perde a posse até o outro lado aceitar."),
        ],
    },
    "mercado": {
        "rotulo": "🔨 Mercado",
        "descricao": "Leilão entre jogadores e a Loteria Dominical.",
        "comandos": [
            ("/leilao_iniciar <o_que> <lance_minimo> <duracao_horas>", "Coloca um item/baú seu em leilão pros outros jogadores."),
            ("/leilao_ver", "Lista os leilões ativos do servidor."),
            ("/leilao_cancelar <leilao_id>", "Cancela seu leilão ativo (só antes do primeiro lance) e recupera o item."),
            ("/loteria_comprar <quantidade>", "Compra bilhetes da Loteria Dominical (sorteio semanal no jornal)."),
            ("/loteria_meus_bilhetes", "Mostra quantos bilhetes você tem na rodada atual."),
            ("/loteria_bolo", "Mostra bilhetes vendidos, participantes e prêmio estimado antes de comprar."),
            ("/mercado_negro", "Acesso restrito. Vende itens exóticos por Créditos Sombrios."),
        ],
    },
    "cassino": {
        "rotulo": "🏦 Salão do Banco Lunar",
        "descricao": "Jogos temáticos com chances abertas, confirmação, limites diários e pausa voluntária.",
        "comandos": [
            ("/cassino abrir", "Abre o salão temático do Banco Lunar e apresenta seus jogos."),
            ("/cassino dados <aposta> <escolha> [numero]", "Dados da Inconstância: baixo/alto 2× ou face exata 6×."),
            ("/cassino roda_fluxos <aposta> <forca>", "Escolhe uma das nove Árvores ou o Vazio; acerto paga 10×."),
            ("/cassino sucessao <aposta> <lado>", "Aposta antes/depois do Passo de Chronus; o 7 devolve."),
            ("/cassino vaos <aposta>", "Quatro desvios pelos Vãos de Aperion, com bordas pagando 4×."),
            ("/cassino vinte_um <aposta>", "Inicia uma mesa interativa de Vinte-e-Um de Amadheus."),
            ("/cassino historico", "Mostra suas dez últimas rodadas e o resultado líquido."),
            ("/cassino limites", "Mostra aposta mínima/máxima, volume e perda líquida do dia."),
            ("/cassino pausa <dias>", "Bloqueia voluntariamente novas apostas por 1, 7 ou 30 dias."),
            ("/cassino regras", "Mostra chances, pagamentos e garantias de segurança."),
            ("/cassino auditoria", "Mostra contagens públicas dos resultados, sem nomes nem valores apostados."),
            ("/cassino corrida", "Mostra os quatro estandartes e o bolo da Corrida das Árvores."),
            ("/cassino corrida_apostar <corredor> <valor>", "Confirma uma aposta pari-mutuel, com 25% por estandarte."),
            ("/cassino contratos", "Mostra seis categorias semanais; complete três diferentes para ganhar a recompensa."),
            ("/cassino contrato_resgatar", "Resgata uma vez a recompensa do contrato semanal concluído."),
            ("/cassino conquistas", "Mostra títulos cosméticos conquistados no cassino."),
            ("/cassino torneio", "Mostra o pote semanal de itens duplicados das Dez Árvores."),
            ("/cassino torneio_entrar <item>", "Reserva uma unidade comum/incomum elegível; você precisa manter outra."),
            ("/cassino configurar", "[Mestre] Abre/fecha o cassino e define seus limites."),
            ("/cassino diagnostico", "[Mestre] Mostra volume, RTP real e resultado da casa."),
        ],
    },
    "financas": {
        "rotulo": "🏦 Finanças",
        "descricao": "Investimentos e empréstimos entre jogadores.",
        "comandos": [
            ("/investir <valor>", "Trava um valor por alguns dias num Título do Jardim; rende ao vencer."),
            ("/investir_ver", "Mostra seus Títulos do Jardim ativos."),
            ("/alertas_banco [categoria] [ligar]", "Configura DMs de pagamentos, segurança, mercado, empréstimos e rendimentos."),
            ("/seguro_cofre <ação>", "Assina ou consulta a cobertura renovável contra arrombamento do cofre."),
            ("/emprestar_para <membro> <valor> <juros_diarios_percent> <prazo_dias>", "Propõe um empréstimo a outro jogador (ele precisa aceitar)."),
            ("/emprestimo_pagar <emprestimo_id> <valor>", "Paga parte ou tudo de um empréstimo ativo que você deve."),
            ("/emprestimos_ver", "Mostra seus empréstimos (como credor ou devedor)."),
            ("/lavar_dinheiro <valor>", "Lava Créditos Sombrios para transformá-los em Lunaris (taxa de 15%). Demora 24h."),
            ("/lavanderia_resgatar", "Resgata o dinheiro limpo da lavanderia que já terminou."),
        ],
    },
    "integracao": {
        "rotulo": "🔗 Site",
        "descricao": "Vínculo da conta do site com o Discord.",
        "comandos": [
            ("/vincular <codigo>", "Vincula sua conta do site a este Discord."),
            ("/campanha_vincular <id>", "[Mestre] Liga o servidor a uma campanha do site."),
            ("/minhas_campanhas", "Mostra suas campanhas e personagens."),
        ],
    },
    "mestre": {
        "rotulo": "🛡️ Mestre",
        "descricao": "Comandos administrativos (requer permissão Gerenciar Servidor).",
        "comandos": [
            ("/dar <membro> <moeda> <quantia>", "Dá moeda a um jogador."),
            ("/tirar <membro> <moeda> <quantia>", "Remove moeda de um jogador."),
            ("/daritem <membro> <item>", "Dá um item do catálogo a um jogador."),
            ("/tirar_item <membro> <item>", "Remove um item do inventário de um jogador."),
            ("/resetjogador <membro>", "Zera carteira, cofre, inventário e cartão de um jogador."),
            ("/resetar_tudo <confirmacao>", "Zera a economia do servidor INTEIRO: carteira, cofre, inventário e cartão de todo mundo."),
            ("/setreputacao <membro> <valor>", "Define a reputação bancária do jogador."),
            ("/setcredito <membro> <valor>", "Alias temporário do comando /setreputacao."),
            ("/setcambio <lunaris_por_solares>", "Ajusta a taxa de câmbio do servidor."),
            ("/cambio_auto <ligar>", "Liga/desliga o câmbio flutuante automático (ajusta a taxa pela demanda)."),
            ("/crise_declarar <ativa>", "Liga/desliga a Crise Econômica (reduz o rendimento dos investimentos que vencerem)."),
            ("/setroubo", "Ajusta a chance de /roubar_cofre contra Segurança Básica e o cooldown (vale pros dois roubos)."),
            ("/mestre_proteger [membro]", "Protege uma conta contra roubos; sem membro, remove a proteção."),
            ("/mestre_desproteger [membro]", "Remove a proteção de conta de um jogador."),
            ("/juros_cofre <taxa_percent>", "Bônus extra de juros no cofre (o cofre já rende automaticamente todo dia)."),
            ("/seteconomia", "Ajusta taxas de venda, saque, juros, leilão e loteria deste servidor."),
            ("/economia_diagnostico", "Painel privado com circulação, concentração, dívida, atividade e custódia."),
            ("/banco_status", "Painel privado com câmbio, roubo, taxas e catálogo configurados neste servidor."),
            ("/mestre_ver <membro>", "Painel completo de um jogador: ferimentos, Calor, cooldowns, proteções e dívida."),
            ("/mestre_curar <membro>", "Zera os ferimentos de um jogador."),
            ("/mestre_ferimentos <membro> <pontos>", "Define manualmente os pontos de ferimento de um jogador."),
            ("/mestre_calor <membro> [valor]", "Zera ou define o Calor de roubo de um jogador."),
            ("/mestre_cooldown <membro> [tipo]", "Remove o cooldown de roubo de um jogador (carteira e/ou cofre)."),
            ("/mestre_divida <membro> [novo_valor]", "Zera ou ajusta a dívida do Cartão Lunar de um jogador."),
            ("/mestre_investimentos <membro> [historico]", "Mostra os Títulos do Jardim ativos e vencidos de um jogador."),
            ("/mestre_recompensa <membro>", "Remove a recompensa de um jogador sem pagar ninguém."),
            ("/mestre_dar_protecao <membro> <tipo> [quantidade]", "Concede proteções de roubo (Cão de Guarda ou Alarme) a um jogador."),
            ("/mestre_remover_protecao <membro> <tipo>", "Consome/remove uma proteção de roubo de um jogador."),
            ("/ajustar_saldo <membro> <moeda> <quantia>", "Credita (+) ou debita (-) qualquer moeda na carteira de um jogador."),
            ("/catalogo_recarregar", "Recarrega o catálogo salvo no banco central."),
            ("/catalogo_republicar", "Re-semeia o catálogo do arquivo (publica adições/edições e desativa removidos)."),
        ],
    },
}


def _pagina(chave: str, rodape: str = "Escolha outra categoria no menu abaixo") -> discord.Embed:
    info = CATEGORIAS[chave]
    emb = ui.embed(info["rotulo"], categoria="ajuda", descricao=info["descricao"])
    # Um campo por comando evita o corte silencioso em 1.024 caracteres que
    # escondia o fim de categorias grandes como Economia e Mestre.
    for cmd, desc in info["comandos"]:
        emb.add_field(name=cmd, value=desc, inline=False)
    emb.set_footer(text=f"{ui.MARCA} · {rodape}")
    return emb


class MenuAjuda(discord.ui.View):
    def __init__(self, autor_id: int, timeout: float = 120):
        super().__init__(timeout=timeout)
        self.autor_id = autor_id
        self.select.options = [
            discord.SelectOption(label=info["rotulo"], value=chave, description=info["descricao"][:100])
            for chave, info in CATEGORIAS.items()
        ]

    async def interaction_check(self, interaction: discord.Interaction) -> bool:
        if interaction.user.id != self.autor_id:
            await interaction.response.send_message("Só quem pediu `/ajuda` pode usar esse menu.", ephemeral=True)
            return False
        return True

    @discord.ui.select(placeholder="Escolha uma categoria de comandos…")
    async def select(self, interaction: discord.Interaction, select: discord.ui.Select):
        chave = select.values[0]
        await interaction.response.edit_message(embed=_pagina(chave), view=self)

    async def on_timeout(self) -> None:
        for child in self.children:
            child.disabled = True


class Ajuda(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @app_commands.command(description="Mostra o menu de comandos do Banqueiro por categoria.")
    async def ajuda(self, interaction: discord.Interaction):
        primeira_chave = next(iter(CATEGORIAS))
        view = MenuAjuda(autor_id=interaction.user.id)
        await interaction.response.send_message(embed=_pagina(primeira_chave), view=view, ephemeral=True)

    @app_commands.command(description="Lista TODOS os comandos do Banqueiro, um bloco por categoria.")
    async def comandos(self, interaction: discord.Interaction):
        paginas = [_pagina(chave, rodape="Use ◀ ▶ pra navegar entre categorias") for chave in CATEGORIAS]
        view = ui.Paginador(paginas, autor_id=interaction.user.id)
        await interaction.response.send_message(embed=view.pagina_atual, view=view, ephemeral=True)


async def setup(bot):
    await bot.add_cog(Ajuda(bot))
