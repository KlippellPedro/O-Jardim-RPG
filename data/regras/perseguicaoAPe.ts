/** Perseguição a pé.
 *
 * A distância usa exatamente as mesmas faixas da perseguição veicular
 * (veiculosCombate.ts), porque a mesa não deveria aprender dois vocabulários
 * para a mesma pergunta: quão longe está quem está fugindo. A diferença entre
 * as duas cenas é o que se rola e o que o terreno cobra, e é isso que vive
 * aqui.
 */
import type { RegraTopicoDe } from './tipos';
import {
  FAIXAS_PERSEGUICAO,
  deslocarFaixaPerseguicao,
  type FaixaPerseguicaoId,
} from './veiculosCombate';

export interface IManobraAPe {
  id: string;
  titulo: string;
  /** Como a manobra aparece na ficção, para o jogador descrever antes de rolar. */
  cena: string;
  teste: string;
  faixas: 'qualquer' | FaixaPerseguicaoId[];
  efeito: string;
  falha: string;
}

export interface IObstaculoPerseguicao {
  d6: number;
  cidade: string;
  ermo: string;
}

/** Rodadas do relógio da perseguição. Fechou, a cena acabou do jeito que
 *  estiver: ninguém aguenta correr a sessão inteira. */
export const RODADAS_DE_PERSEGUICAO = 6;

/** Depois desta rodada, correr cobra Cansaço de quem correu. Uma vez por cena,
 *  na mesma lógica do combate intenso da página de Descanso. */
export const RODADA_DO_FOLEGO = 4;

/** O que cada faixa parece para quem está correndo. A distância em metros mora
 *  na escala compartilhada com os veículos; isto é só o jeito de contar. */
const SENSACAO_DA_FAIXA: Record<FaixaPerseguicaoId, string> = {
  contato: 'Dá para ouvir a respiração do outro e agarrar a ponta do casaco.',
  curta: 'Dá para ver a nuca dele e ouvir as botas batendo na pedra logo à frente.',
  média: 'Ele vira as esquinas antes de você, e some por um segundo a cada curva.',
  longa: 'Só se vê um casaco mudando de rua ao longe, e a multidão fecha no meio.',
  escapou: 'A rua está cheia de gente comum, e nenhuma delas é quem vocês procuram.',
};

export const MANOBRAS_A_PE: readonly IManobraAPe[] = [
  {
    id: 'correr',
    titulo: 'Correr solto',
    cena: 'Cabeça baixa, braços trabalhando, o peito queimando. Nada de truque: só perna e vontade.',
    teste: 'Atletismo oposto',
    faixas: 'qualquer',
    efeito: 'Quem vence move uma faixa a favor. Vitória por 10 ou mais move duas.',
    falha: 'A faixa não muda, e o outro lado escolhe a manobra da rodada seguinte antes de você.',
  },
  {
    id: 'atalho',
    titulo: 'Cortar caminho',
    cena: 'Um beco que parece sem saída, uma cerca baixa, a porta dos fundos de uma padaria que você conhece. Se der certo, você sai na frente dele.',
    teste: 'Investigação na cidade, Sobrevivência no ermo',
    faixas: 'qualquer',
    efeito: 'Move uma faixa a favor e ignora o obstáculo desta rodada. Com vantagem, se o personagem conhece o lugar.',
    falha: 'O atalho não existia, e a parede no fim do beco move uma faixa contra você.',
  },
  {
    id: 'salto',
    titulo: 'Salto arriscado',
    cena: 'De um telhado para outro, por cima de uma carroça, através do vão de uma ponte quebrada. Por um segundo, só existe o ar.',
    teste: 'Acrobacia contra a DT Difícil',
    faixas: 'qualquer',
    efeito: 'Move duas faixas a favor de uma vez.',
    falha: 'Você cai: fica Caído e perde a rodada. Quem estava atrás move uma faixa.',
  },
  {
    id: 'derrubar',
    titulo: 'Derrubar um obstáculo',
    cena: 'Uma pilha de barris, a barraca de frutas, um varal cheio de roupa. Tudo que cai atrás de você vira problema de quem vem atrás.',
    teste: 'Atletismo ou Luta contra a DT Padrão',
    faixas: 'qualquer',
    efeito: 'Quem vem atrás testa Reflexos na DT Padrão ou move uma faixa contra si.',
    falha: 'Você gasta a rodada puxando uma coisa que não cede, e nada sai do lugar.',
  },
  {
    id: 'alcance',
    titulo: 'Acertar de longe',
    cena: 'Parar meio segundo, respirar, mirar entre as cabeças da multidão e torcer para acertar a pessoa certa.',
    teste: 'Pontaria, magia ou o que alcançar',
    faixas: ['contato', 'curta', 'média'],
    efeito: 'Resolve normalmente. Condição que tire o movimento move uma faixa a favor de quem atirou.',
    falha: 'A faixa não muda. Mirar correndo custa a rodada de qualquer jeito.',
  },
  {
    id: 'sumir',
    titulo: 'Sumir de vista',
    cena: 'Entrar numa procissão, tirar o casaco, sentar numa mesa de taverna como quem está ali há horas e pedir uma bebida com a voz calma.',
    teste: 'Furtividade oposta à Percepção',
    faixas: ['longa'],
    efeito: 'Sucesso encerra a cena: o fugitivo Escapou.',
    falha: 'Você foi visto entrando no esconderijo, e quem persegue move uma faixa.',
  },
  {
    id: 'ajuda',
    titulo: 'Atravessar gente no caminho',
    cena: 'Gritar "pega ladrão", mostrar um distintivo, pedir licença com a voz certa. A rua abre para você e fecha para o outro.',
    teste: 'Diplomacia ou Intimidação contra a DT Padrão',
    faixas: 'qualquer',
    efeito: 'A rua atrapalha o outro lado, e ele sofre desvantagem na manobra seguinte.',
    falha: 'A multidão fecha bem na sua frente, e você move uma faixa contra si.',
  },
  {
    id: 'agarrar',
    titulo: 'Agarrar',
    cena: 'A mão fecha no colarinho, os dois perdem o equilíbrio, e o chão chega rápido.',
    teste: 'Atletismo oposto, apenas em Contato',
    faixas: ['contato'],
    efeito: 'Aplica Agarrado e encerra a perseguição.',
    falha: 'Os dedos escorregam no tecido, e você passa direto: move uma faixa contra si.',
  },
];

export const OBSTACULOS_PERSEGUICAO: readonly IObstaculoPerseguicao[] = [
  { d6: 1, cidade: 'Uma feira montada no meio da rua: barracas de pano, galinhas soltas e uma velha que não vai sair da frente de jeito nenhum.', ermo: 'Raízes grossas e um tronco caído, tudo coberto de musgo escorregadio.' },
  { d6: 2, cidade: 'Uma escada estreita de pedra, gasta no meio dos degraus, onde só passa uma pessoa de cada vez.', ermo: 'Um barranco de terra solta, alto demais para subir andando, que desmancha na mão.' },
  { d6: 3, cidade: 'Os telhados acabam, e o vão até o próximo beiral é grande demais para quem pensa antes de pular.', ermo: 'Um riacho gelado na altura da cintura, com pedras lisas no fundo.' },
  { d6: 4, cidade: 'Uma carroça atravessada na rua, a carga espalhada e o carroceiro gritando com todo mundo.', ermo: 'Mato alto até o peito, que esconde o chão e o que está no chão.' },
  { d6: 5, cidade: 'Um portão de ferro que alguém acabou de fechar, com o cadeado ainda balançando.', ermo: 'Uma neblina baixa, que engole quem fica mais de uma faixa para trás.' },
  { d6: 6, cidade: 'Um guarda no fim da rua, com a mão no cabo da espada, decidindo quem dos dois é o problema.', ermo: 'Um bicho grande, que estava ali antes dos dois e não gostou nada da visita.' },
];

export function obstaculoPorD6(valor: number): IObstaculoPerseguicao {
  const obstaculo = OBSTACULOS_PERSEGUICAO.find((item) => item.d6 === valor);
  if (!obstaculo) throw new Error(`Resultado de obstáculo inválido: ${valor}`);
  return obstaculo;
}

/** Move a faixa depois de uma rodada resolvida. Perseguidor ganhando puxa em
 *  direção a Contato; fugitivo ganhando empurra em direção a Escapou. Vitória
 *  por 10 ou mais vale duas faixas. */
export function resolverRodadaAPe(
  faixa: FaixaPerseguicaoId,
  resultado: { vencedor: 'perseguidor' | 'fugitivo' | 'empate'; margem?: number },
): FaixaPerseguicaoId {
  if (resultado.vencedor === 'empate') return faixa;
  const passos = Math.abs(resultado.margem ?? 0) >= 10 ? 2 : 1;
  const sentido = resultado.vencedor === 'perseguidor' ? -1 : 1;
  return deslocarFaixaPerseguicao(faixa, passos * sentido);
}

const nomeDaFaixa = (id: FaixaPerseguicaoId) => (id === 'escapou' ? 'Escapou' : id[0].toUpperCase() + id.slice(1));

const tabelaFaixas = FAIXAS_PERSEGUICAO.map((faixa) => `
  <tr><td><strong>${nomeDaFaixa(faixa.id)}</strong></td><td>${SENSACAO_DA_FAIXA[faixa.id]}<small class="regras-mecanica">${faixa.descricao}</small></td></tr>
`).join('');

const tabelaManobras = MANOBRAS_A_PE.map((manobra) => `
  <tr>
    <td><strong>${manobra.titulo}</strong>${manobra.faixas === 'qualquer' ? '' : `<br><small>Só em ${manobra.faixas.map(nomeDaFaixa).join(', ')}</small>`}</td>
    <td>${manobra.cena}<small class="regras-mecanica"><strong>Teste:</strong> ${manobra.teste}. <strong>Sucesso:</strong> ${manobra.efeito} <strong>Falha:</strong> ${manobra.falha}</small></td>
  </tr>
`).join('');

const tabelaObstaculos = OBSTACULOS_PERSEGUICAO.map((obstaculo) => `
  <tr><td>${obstaculo.d6}</td><td>${obstaculo.cidade}</td><td>${obstaculo.ermo}</td></tr>
`).join('');

export const REGRA_PERSEGUICAO_A_PE: RegraTopicoDe<'Combate e Mecânicas'> = {
  categoria: 'Combate e Mecânicas',
  status: 'Regra oficial',
  resumo: 'Alguém correu, e a cena vira uma disputa de faixas de distância, com a cidade inteira no caminho. Vale para fuga, captura e para a perseguição que atravessa metade de um bairro.',
  destaques: [
    ['Faixas', 'Contato a Escapou'],
    ['Duração', `${RODADAS_DE_PERSEGUICAO} rodadas`],
    ['Teste base', 'Atletismo oposto'],
  ],
  corpo: `
    <p class="regras-lead">Quando alguém corre e alguém vai atrás, a cena muda de ritmo. A respiração fica curta, a cidade vira obstáculo e cada esquina pode ser a última chance de alcançar, ou de sumir. A perseguição usa as mesmas faixas de distância da perseguição de veículos, e cada rodada move essas faixas conforme o que cada lado tentou.</p>

    <h3 class="regras-subtitle">As faixas</h3>
    <div class="regras-table-wrap"><table class="regras-table">
      <thead><tr><th>Faixa</th><th>Como parece, e a distância</th></tr></thead>
      <tbody>${tabelaFaixas}</tbody>
    </table></div>
    <ul class="regras-list">
      <li><strong>A perseguição começa onde os dois estavam</strong> quando um deles saiu correndo. Fuga de uma conversa começa em Contato; fuga de uma emboscada avistada de longe começa em Longa.</li>
      <li><strong>Os dois lados sabem o que querem.</strong> Quem persegue quer chegar a Contato. Quem foge quer chegar a Escapou.</li>
      <li><strong>O grupo corre no passo de quem está mais atrás.</strong> Quem quiser disparar sozinho passa a ter faixa própria, e vê o resto do grupo ficar para trás.</li>
    </ul>

    <h3 class="regras-subtitle">A rodada</h3>
    <ol class="regras-steps">
      <li>O Mestre descreve o terreno da rodada do jeito que quem corre enxerga: rápido e pela metade. Ele rola 1d6 na tabela de obstáculos ou escolhe um.</li>
      <li>Cada lado declara uma manobra, dizendo o que faz com o corpo. Quem foge declara primeiro, porque está de costas.</li>
      <li>Resolvam os testes. Quem vence move uma faixa a favor, e vitória por 10 ou mais move duas.</li>
      <li>Aplique o obstáculo a quem não lidou com ele na manobra.</li>
      <li>Marque uma parte do relógio da perseguição.</li>
    </ol>
    <p class="regras-note">A perseguição dura ${RODADAS_DE_PERSEGUICAO} rodadas. Se ninguém chegou a Contato nem a Escapou quando o relógio fechar, quem foge conseguiu se perder no meio da cidade, e quem perseguia continua com o rastro fresco, que já é outra cena.</p>

    <h3 class="regras-subtitle">Manobras</h3>
    <p>Cada manobra traz o que o corpo faz e, embaixo, como se resolve. Diga a cena antes de rolar: é ela que diz ao Mestre onde a perseguição está acontecendo.</p>
    <div class="regras-table-wrap"><table class="regras-table">
      <thead><tr><th>Manobra</th><th>Como é, e como se resolve</th></tr></thead>
      <tbody>${tabelaManobras}</tbody>
    </table></div>
    <ul class="regras-list">
      <li><strong>Uma manobra por personagem, por rodada.</strong> Ajudar alguém segue as regras de Ações Coletivas e conta como a sua manobra.</li>
      <li><strong>Magia, item e habilidade de classe entram como manobra,</strong> com o teste que já usam. Um efeito que tire o movimento do outro lado move uma faixa a seu favor.</li>
      <li><strong>O fôlego acaba.</strong> A partir da rodada ${RODADA_DO_FOLEGO}, quem correu ganha 1 de Cansaço ao fim da cena, uma vez só.</li>
    </ul>

    <h3 class="regras-subtitle">Obstáculos</h3>
    <div class="regras-table-wrap"><table class="regras-table regras-table--dado">
      <thead><tr><th>1d6</th><th>Na cidade</th><th>No ermo</th></tr></thead>
      <tbody>${tabelaObstaculos}</tbody>
    </table></div>
    <p>Quem não resolveu o obstáculo na própria manobra testa Acrobacia, Atletismo ou Reflexos contra a DT Padrão. A falha move uma faixa contra ele.</p>

    <h3 class="regras-subtitle">Como a cena termina</h3>
    <ul class="regras-list">
      <li><strong>Contato:</strong> a perseguição acaba e o combate começa ali mesmo, no terreno da última rodada, com os dois ofegantes. Quem foi alcançado em plena corrida fica Exposto até o começo do próximo turno dele.</li>
      <li><strong>Escapou:</strong> quem fugia sumiu nesta cena. Reencontrar aquela pessoa vira investigação, informante ou uma pista nova.</li>
      <li><strong>Relógio fechado:</strong> ninguém conseguiu o que queria, e os dois lados ficam sabendo mais um do outro do que sabiam antes de correr: o rosto, o jeito de correr, o bairro para onde ele foi.</li>
    </ul>
  `,
  corpoMestre: `
    <p class="regras-lead">Perseguição dá à mesa um segundo lugar onde ganhar ou perder sem que ninguém morra, e é uma das poucas cenas em que a cidade inteira vira personagem. Pedir um teste de Atletismo, comparar dois números e encerrar em dez segundos desperdiça tudo isso.</p>

    <h3 class="regras-subtitle">Quando abrir as faixas</h3>
    <ul class="regras-list">
      <li>Abra quando o resultado importar dos dois lados. Um batedor de carteira que fugiu com uma moeda merece uma frase, e a moeda perdida.</li>
      <li>Se o grupo é claramente mais rápido, não role: eles alcançam. A cena boa é a que tem dúvida.</li>
      <li>NPC que precisa escapar para a história continuar deveria sumir antes de a cena começar. Se ele entrou numa perseguição, aceite a chance de perdê-lo.</li>
    </ul>

    <h3 class="regras-subtitle">Calibrar a dificuldade</h3>
    <ul class="regras-list">
      <li>Um fugitivo com o mesmo bônus do grupo termina em Contato na maioria das vezes, porque o grupo tenta várias manobras por rodada. Para segurar alguém por seis rodadas, dê a ele conhecimento do terreno, vantagem em uma manobra ou alguém atrapalhando atrás.</li>
      <li>O obstáculo é o seu botão de ajuste. Rolar 1d6 por rodada mantém a cena honesta; escolher o obstáculo aperta ou alivia sem mudar número nenhum.</li>
      <li>Terreno que favorece um lado deve ser dito antes da declaração de manobras. Quem foge para o telhado precisa saber que o telhado é vantagem dele.</li>
    </ul>

    <h3 class="regras-subtitle">Contar a corrida</h3>
    <ul class="regras-list">
      <li>Descreva a faixa pelo que se vê, e deixe o nome dela de lado: "você ainda vê o casaco dele virando a esquina" diz Média sem soar tabela.</li>
      <li>Frases curtas. Perseguição contada devagar perde a pressa, e a mesa sente o ritmo pela sua voz antes de sentir pelas regras.</li>
      <li>Toda rodada precisa de uma escolha nova. Se as três últimas foram Correr solto contra Correr solto, jogue um obstáculo grande e feche a cena na rodada seguinte.</li>
      <li>Perseguição é a melhor hora para mostrar a cidade: a feira, o telhado, o beco com cheiro de peixe. Cada rodada é um lugar novo, e três desses lugares vão voltar na campanha.</li>
    </ul>
  `,
};
