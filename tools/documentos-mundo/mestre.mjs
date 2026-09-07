/**
 * Folha do mestre do dossiê. Sai em PDF separado de propósito: não é prop, e
 * não deve acabar na mesa por engano.
 *
 * O sumiço fica em aberto com três saídas possíveis. É deliberado: a resposta
 * amarra lore nova ao cenário, e essa decisão é do dono do mundo, não deste
 * arquivo. Os documentos dos jogadores funcionam com qualquer uma das três.
 */
import { PESQUISADORA, ANO } from './dossie.mjs';
import { esc } from './dados.mjs';

const folha = (conteudo) => `<section class="prop oficial">${conteudo}</section>`;

export function folhaDoMestre() {
  const paginas = [];

  paginas.push(folha(`
    <div class="carimbo preto" style="top:26mm;right:18mm;transform:rotate(-6deg)">Uso do mestre</div>

    <div class="timbre">
      <div>
        <div class="casa">Folha do mestre</div>
        <div class="linha2">Dossiê: cadernos de ${esc(PESQUISADORA.curto)}</div>
      </div>
      <div class="ref">Não entregar<br>na mesa</div>
    </div>

    <h1 class="titulo">O que o dossiê faz</h1>
    <p class="subtitulo">Ensina o cenário enquanto os jogadores acham que estão investigando uma pessoa.</p>

    <div class="recuo">
      <p>São sete documentos de quatro emissores diferentes. Três deles são os cadernos dela, e
      é neles que está a explicação do mundo: a hierarquia do Jardim, uma entrada por Árvore com
      a marca corporal de cada Fluxo, e o catálogo dos povos. Os outros quatro são papelada de
      terceiros, e é neles que está a história do sumiço.</p>
      <p>A graça do arranjo é que o jogador lê os cadernos por obrigação, procurando pista, e
      sai deles sabendo o cenário sem ter recebido uma aula. Quem quiser só a lore para de ler
      no caderno III e já saiu ganhando.</p>
    </div>

    <div class="nota-campo">
      <div class="olho">Antes de imprimir</div>
      <p>Este PDF é só seu. Os documentos dos jogadores estão no arquivo
      <strong>Dossie-Cadernos-de-Campo</strong>, e é aquele que vai para a mesa.</p>
    </div>
  `));

  paginas.push(folha(`
    <h1 class="titulo">O que cada peça entrega</h1>
    <table class="livro">
      <thead><tr><th style="width:52mm">Documento</th><th>O que o jogador tira dali</th></tr></thead>
      <tbody>
        <tr><td><strong>Termo de recolhimento</strong></td>
            <td>A moldura. Quarto trancado por dentro, sem sinal de saída. E a farpa: o caçador
            contou sete cadernos na lista dela e achou três. Quatro cadernos sumiram com ela.</td></tr>
        <tr><td><strong>Caderno I</strong></td>
            <td>Jardim, Árvore, Galho, Dimensão, Reino. A regra de que descobrir uma camada não
            abre a de dentro. Sonhar existindo em todas as Árvores ao mesmo tempo.</td></tr>
        <tr><td><strong>Caderno II</strong></td>
            <td>As dez entradas. Deidade, Fluxo, estado e marca corporal de cada uma. As notas de
            margem dela plantam sete ganchos de aventura sem cobrar nada.</td></tr>
        <tr><td><strong>Caderno III</strong></td>
            <td>Os povos, com corpo, língua e como amadurecem. Serve de material de criação de
            personagem sem parecer material de criação de personagem.</td></tr>
        <tr><td><strong>Extrato do Banco</strong></td>
            <td>Anos de miséria, e então 60.000 Lunaris de um depositante em sigilo, no inverno.
            Alguém financiou o último trecho. O Banco não dirá quem, nunca.</td></tr>
        <tr><td><strong>Contrato de escolta</strong></td>
            <td>Ela pediu cláusula dizendo que os cadernos têm prioridade sobre o corpo dela.
            Sabia do risco com um ano de antecedência. E mediu o mesmo vão duas vezes com
            resultados diferentes.</td></tr>
        <tr><td><strong>Resposta da Malha</strong></td>
            <td>Acesso negado a Núcleo Zero, quatro vezes com a mesma redação. E o parágrafo que
            escapou da tarja: tudo que atravessa a Malha fica registrado na Malha. A A.X.I.S leu
            cada medição que ela mandou.</td></tr>
        <tr><td><strong>Última folha</strong></td>
            <td>O fecho. Quatorze pontos de Erro não estão espalhados, estão em volta de um lugar
            só. A frase para antes de dizer onde. Depois, duas linhas à mão: bateram na porta.</td></tr>
      </tbody>
    </table>
  `));

  paginas.push(folha(`
    <h1 class="titulo">A resposta</h1>
    <p class="subtitulo">Escolha uma das três antes de pôr o dossiê na mesa. Os documentos servem a qualquer uma.</p>

    <div class="nota-campo">
      <div class="olho">O que é certo nas três</div>
      <p>Ela estava certa. Os Erros não são acidente, e a distribuição deles cerca alguma coisa.
      Ela mandou as medições pela Malha, e por isso a A.X.I.S soube de tudo em tempo real. Os
      60.000 Lunaris compraram o último trecho de viagem. Os quatro cadernos que faltam contêm os
      quatorze pontos marcados, e é isso que qualquer um estaria procurando.</p>
    </div>

    <h3 class="titulo">Saída A. A A.X.I.S a levou</h3>
    <p>A mais direta. A resposta da Malha já é uma ameaça educada, e o parágrafo que escapou da
    tarja escapou porque alguém de dentro quis avisá-la. O financiamento anônimo veio da própria
    AstraTech, para mantê-la medindo até que ela achasse o centro. Quando achou, recolheram a
    pesquisadora e os quatro cadernos. Ela está viva em Núcleo Zero, que é a única Dimensão do
    Jardim com controle de acesso, e é para lá que a campanha aponta.</p>

    <h3 class="titulo">Saída B. Ela atravessou por vontade própria</h3>
    <p>O quarto estava trancado por dentro porque ninguém entrou. Ela chegou ao ponto em que
    medir de fora deixou de bastar, comprou passagem com os 60.000 e foi ver. A batida na porta
    era a senhoria, ou não era nada. Nesta saída ela está do outro lado e pode ser encontrada, e
    o preço de encontrá-la é ir pelo mesmo caminho.</p>

    <h3 class="titulo">Saída C. O Vazio a apagou</h3>
    <p>A mais cruel, e a que usa melhor o que o canon já diz. Erebus não mata, apaga vínculo,
    rastro e sentido, até que ninguém perceba que faltou alguém. Nesta saída a pergunta não é
    onde ela está. É por que ainda existem sete cadernos na lista, um extrato no banco e um
    contrato assinado, se a pessoa foi apagada. Alguma coisa segurou os papéis. Descobrir o que
    segurou vale uma campanha inteira.</p>

    <div class="nota-campo">
      <div class="olho">Se quiser deixar em aberto</div>
      <p>Dá para rodar o dossiê inteiro sem escolher. Nenhum documento afirma o que houve, e a
      mesa vai construir a própria teoria antes da terceira sessão. Escolha quando precisar
      responder, e não antes.</p>
    </div>
  `));

  paginas.push(folha(`
    <h1 class="titulo">Como pôr na mesa</h1>

    <h3 class="titulo">Ordem de entrega</h3>
    <ol class="numerada">
      <li>Entregue o <strong>termo de recolhimento</strong> sozinho. Deixe a mesa decidir se
      paga a taxa de guarda. Todo o resto está dentro da caixa.</li>
      <li>Solte os <strong>três cadernos</strong> juntos. Não resuma nada em voz alta, e resista
      a explicar. O caderno é a explicação.</li>
      <li>Segure <strong>extrato, contrato e Malha</strong> para quando a mesa começar a
      perguntar sobre a pessoa em vez do mundo. Costuma vir rápido.</li>
      <li>A <strong>última folha</strong> por último, sempre. Ela é o gancho e não vale nada
      entregue cedo.</li>
    </ol>

    <h3 class="titulo">Ganchos que as notas de margem já plantam</h3>
    <ul class="campo-lista">
      <li>Alétheia. Ela entrou acompanhada na Sala dos Nomes e o parceiro soube o nome verdadeiro
      dela. Esse parceiro está vivo em algum lugar e sabe uma coisa sobre ela que ninguém sabe.</li>
      <li>O Vazio. Ela escreveu um nome numa margem e no dia seguinte a margem estava em branco.
      A margem em branco está no caderno II, e alguém naquela mesa pode tentar ler.</li>
      <li>Limiar. Ela procurou o próprio livro na Biblioteca Carmesim. O bibliotecário não disse
      que o livro não existia. Se ela foi apagada pelo Vazio, o livro não deveria existir.</li>
      <li>Matriz. Ela tem duas medições da mesma fenda, com um dia de intervalo e números
      diferentes. Os dois números estão nos cadernos que sumiram.</li>
      <li>Éon. Sete durações para a mesma travessia, com o relógio certo.</li>
    </ul>

    <h3 class="titulo">Coisas que este dossiê não decide por você</h3>
    <ul class="campo-lista">
      <li>${esc(PESQUISADORA.nome)} e o caçador Vidal Corte são personagens deste material, e não
      lore anterior. Renomeie à vontade: os dois nomes saem de um único ponto do gerador.</li>
      <li>O ano ${ANO} da Realidade 0 é chute informado. O canon só fixa a fundação de Astraluna
      em 1.188, então qualquer ano acima disso serve. Também sai de um ponto só.</li>
      <li>Os valores em Lunaris seguem a escala oficial da economia, com o salário mínimo de 300
      como âncora. Os 60.000 são deliberadamente absurdos para o padrão de vida dela.</li>
      <li>Nenhuma facção não canônica aparece. Vigília das Raízes e Arquivo Prismático continuam
      como proposta no faccoes.json e por isso ficaram de fora.</li>
    </ul>
  `));

  return { arquivo: 'Dossie-FOLHA-DO-MESTRE', titulo: 'Folha do mestre', paginas };
}
