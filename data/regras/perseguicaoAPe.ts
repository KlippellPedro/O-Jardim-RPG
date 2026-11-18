/** Perseguição a pé.
 *
 * A distância usa as mesmas faixas da perseguição veicular (veiculosCombate.ts),
 * numeradas de 0 (Contato) a 4 (Escapou) pela ordem delas, para a mesa contar
 * com um número só. A cada rodada, uma pessoa de cada lado rola, e quem não
 * rola só Ajuda ou Atrapalha, sem dado: nada de puxador, apoio ou teste de
 * obstáculo separado.
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

/** Ajudar soma e Atrapalhar tira este valor de quem rola, sem dado. */
export const BONUS_DE_APOIO = 2;

/** Quantas pessoas de cada lado podem Ajudar ou Atrapalhar numa rodada. */
export const APOIOS_MAXIMOS_POR_LADO = 2;

/** Distância de 0 a 4, pela ordem da faixa na escala compartilhada. */
export const distanciaDaFaixa = (id: FaixaPerseguicaoId): number =>
  FAIXAS_PERSEGUICAO.find((faixa) => faixa.id === id)?.ordem ?? 0;

/** O que cada faixa parece para quem está correndo. A distância em metros mora
 *  na escala compartilhada com os veículos; isto é só o jeito de contar. */
const SENSACAO_DA_FAIXA: Record<FaixaPerseguicaoId, string> = {
  contato: 'Colado no outro. A perseguição acaba e começa a luta.',
  curta: 'Logo atrás, a poucos passos.',
  média: 'Ainda dá para ver o outro, mas ele some de vista nas curvas.',
  longa: 'O outro está longe e quase sumindo no meio das pessoas.',
  escapou: 'Quem fugia sumiu de vista.',
};

export const MANOBRAS_A_PE: readonly IManobraAPe[] = [
  {
    id: 'correr',
    titulo: 'Correr',
    cena: 'Correr o mais rápido que conseguir.',
    teste: 'Atletismo',
    faixas: 'qualquer',
    efeito: 'O resultado normal: quem tirar mais muda a distância em 1, ou em 2 vencendo por 10 ou mais.',
  },
  {
    id: 'atalho',
    titulo: 'Cortar caminho',
    cena: 'Pegar um beco, pular uma cerca ou passar por dentro de um prédio.',
    teste: 'Investigação na cidade, Sobrevivência no ermo, com vantagem se você conhece o lugar',
    faixas: 'qualquer',
    efeito: 'O resultado normal, com a perícia do atalho no lugar do Atletismo.',
  },
  {
    id: 'salto',
    titulo: 'Salto arriscado',
    cena: 'Pular de um telhado para outro, por cima de uma carroça ou por um vão.',
    teste: 'Acrobacia',
    faixas: 'qualquer',
    efeito: 'Se vencer, a distância muda 2 a seu favor. Se perder, você cai, fica Caído, e a distância muda 2 contra você.',
  },
  {
    id: 'sumir',
    titulo: 'Sumir de vista',
    cena: 'Se misturar na multidão, entrar num lugar cheio ou se esconder.',
    teste: 'Furtividade contra a Percepção de quem rola do outro lado',
    faixas: ['longa'],
    efeito: 'Só para quem foge. Se vencer, a distância vai direto a 4 e quem fugia escapou. Se perder, a distância muda 1 contra você.',
  },
];

export const OBSTACULOS_PERSEGUICAO: readonly IObstaculoPerseguicao[] = [
  { d6: 1, cidade: 'Uma feira no meio da rua, cheia de barracas e de gente.', ermo: 'Raízes grossas e um tronco caído no caminho.' },
  { d6: 2, cidade: 'Uma escada estreita, onde só passa uma pessoa por vez.', ermo: 'Um barranco de terra solta, difícil de subir.' },
  { d6: 3, cidade: 'Um vão entre dois telhados.', ermo: 'Um riacho com água na cintura e pedras escorregadias.' },
  { d6: 4, cidade: 'Uma carroça parada atravessada na rua.', ermo: 'Mato alto que esconde o chão.' },
  { d6: 5, cidade: 'Um portão de ferro que alguém acabou de fechar.', ermo: 'Uma neblina baixa que atrapalha a visão.' },
  { d6: 6, cidade: 'Um guarda no fim da rua, querendo saber o que está acontecendo.', ermo: 'Um animal grande e irritado no caminho.' },
];

export function obstaculoPorD6(valor: number): IObstaculoPerseguicao {
  const obstaculo = OBSTACULOS_PERSEGUICAO.find((item) => item.d6 === valor);
  if (!obstaculo) throw new Error(`Resultado de obstáculo inválido: ${valor}`);
  return obstaculo;
}

/** Move a faixa depois de uma rodada resolvida. Perseguidor ganhando puxa em
 *  direção a Contato; fugitivo ganhando empurra em direção a Escapou. Vitória
 *  por 10 ou mais vale duas faixas; `passos` força outro valor (o Salto). */
export function resolverRodadaAPe(
  faixa: FaixaPerseguicaoId,
  resultado: { vencedor: 'perseguidor' | 'fugitivo' | 'empate'; margem?: number; passos?: number },
): FaixaPerseguicaoId {
  if (resultado.vencedor === 'empate') return faixa;
  const passos = resultado.passos ?? (Math.abs(resultado.margem ?? 0) >= 10 ? 2 : 1);
  const sentido = resultado.vencedor === 'perseguidor' ? -1 : 1;
  return deslocarFaixaPerseguicao(faixa, passos * sentido);
}

const nomeDaFaixa = (id: FaixaPerseguicaoId) => (id === 'escapou' ? 'Escapou' : id[0].toUpperCase() + id.slice(1));

const tabelaFaixas = FAIXAS_PERSEGUICAO.map((faixa) => `
  <tr><td><strong>${faixa.ordem}</strong></td><td><strong>${nomeDaFaixa(faixa.id)}</strong></td><td>${SENSACAO_DA_FAIXA[faixa.id]}<small class="regras-mecanica">${faixa.descricao}</small></td></tr>
`).join('');

const tabelaManobras = MANOBRAS_A_PE.map((manobra) => `
  <tr>
    <td><strong>${manobra.titulo}</strong>${manobra.faixas === 'qualquer' ? '' : `<br><small>Só na distância ${manobra.faixas.map(distanciaDaFaixa).join(', ')}</small>`}</td>
    <td>${manobra.cena}<small class="regras-mecanica"><strong>Teste:</strong> ${manobra.teste}. ${manobra.efeito}</small></td>
  </tr>
`).join('');

const tabelaObstaculos = OBSTACULOS_PERSEGUICAO.map((obstaculo) => `
  <tr><td>${obstaculo.d6}</td><td>${obstaculo.cidade}</td><td>${obstaculo.ermo}</td></tr>
`).join('');

export const REGRA_PERSEGUICAO_A_PE: RegraTopicoDe<'Combate e Mecânicas'> = {
  categoria: 'Combate e Mecânicas',
  status: 'Regra oficial',
  resumo: 'Regras para quando alguém foge a pé e alguém vai atrás. A cada rodada, uma pessoa de cada lado rola, e quem tirar mais ganha distância ou encurta.',
  destaques: [
    ['Distância', 'de 0 (Contato) a 4 (Escapou)'],
    ['Duração', `${RODADAS_DE_PERSEGUICAO} rodadas`],
    ['Teste base', 'Atletismo contra Atletismo'],
  ],
  corpo: `
    <p class="regras-lead">Use esta regra quando alguém foge a pé e alguém vai atrás. A distância entre os dois é um número de 0 a 4, e a cada rodada cada lado tenta mudar esse número a seu favor.</p>

    <div class="regras-resumo">
      <ul>
        <li>A distância vai de <strong>0, Contato,</strong> a <strong>4, Escapou</strong>. Quem persegue quer chegar a 0, e quem foge quer chegar a 4.</li>
        <li>A cada rodada, cada lado escolhe uma pessoa para rolar Atletismo, ou outra manobra da lista. Quem tirar mais muda a distância em 1 a favor do seu lado, ou em 2 se vencer por 10 ou mais.</li>
        <li>Quem não rola pode <strong>Ajudar</strong> quem rola do seu lado (+${BONUS_DE_APOIO}) ou <strong>Atrapalhar</strong> quem rola do outro lado (−${BONUS_DE_APOIO}). Não rola dado, e são no máximo ${APOIOS_MAXIMOS_POR_LADO} pessoas de cada lado.</li>
        <li>A perseguição dura ${RODADAS_DE_PERSEGUICAO} rodadas. Em 0 começa o combate, em 4 quem fugia some, e se as rodadas acabarem antes ninguém consegue o que queria.</li>
      </ul>
    </div>

    <h3 class="regras-subtitle">A distância</h3>
    <div class="regras-table-wrap"><table class="regras-table">
      <thead><tr><th>Distância</th><th>Faixa</th><th>Como parece</th></tr></thead>
      <tbody>${tabelaFaixas}</tbody>
    </table></div>
    <ul class="regras-list">
      <li><strong>A perseguição começa na distância em que os dois estavam.</strong> Quem foge no meio de uma conversa começa em 1, e quem foge de alguém visto de longe começa em 3.</li>
      <li><strong>Cada lado anda junto,</strong> com uma distância só. Quem quiser correr na frente sozinho vira um lado separado, com a própria distância.</li>
      <li>As faixas são as mesmas da perseguição de veículos (ver <span class="regras-ref regras-ref--veiculos-cenas">Perseguições e Combate Veicular</span>).</li>
    </ul>

    <h3 class="regras-subtitle">A rodada</h3>
    <ol class="regras-steps">
      <li>O Mestre descreve o lugar e o obstáculo da rodada: rola 1d6 na tabela de obstáculos ou escolhe um.</li>
      <li>Cada lado escolhe quem vai rolar e com qual manobra. Quem foge escolhe primeiro.</li>
      <li>Os outros dizem como vão Ajudar quem rola do seu lado (+${BONUS_DE_APOIO}) ou Atrapalhar quem rola do outro lado (−${BONUS_DE_APOIO}), como em <span class="regras-ref regras-ref--acoes-coletivas">Ações Coletivas</span>. No máximo ${APOIOS_MAXIMOS_POR_LADO} pessoas de cada lado.</li>
      <li>Os dois rolam. Quem tirar mais muda a distância em 1 a seu favor, ou em 2 se vencer por 10 ou mais. Empate não muda nada.</li>
      <li>Marque uma rodada. Depois da rodada ${RODADAS_DE_PERSEGUICAO}, a perseguição acaba.</li>
    </ol>

    <h3 class="regras-subtitle">Manobras</h3>
    <p>A manobra é o que faz quem rola. Diga rapidamente o que o personagem faz antes de rolar.</p>
    <div class="regras-table-wrap"><table class="regras-table">
      <thead><tr><th>Manobra</th><th>O que é, e como se resolve</th></tr></thead>
      <tbody>${tabelaManobras}</tbody>
    </table></div>
    <ul class="regras-list">
      <li><strong>Atirar:</strong> quem não rola pode, no lugar de Ajudar ou Atrapalhar, atacar alguém do outro lado que esteja ao alcance, normalmente. Se o ataque deixar o alvo Caído, Agarrado, Imobilizado ou sem movimento, a distância muda 1 a favor do seu lado.</li>
      <li><strong>Magia, item e habilidade de classe</strong> podem ser a manobra de quem rola, com o teste que já usam.</li>
      <li><strong>Cansaço:</strong> se a perseguição passar da rodada ${RODADA_DO_FOLEGO}, quem correu ganha 1 de Cansaço no fim da cena, uma vez só.</li>
    </ul>

    <h3 class="regras-subtitle">Obstáculos</h3>
    <div class="regras-table-wrap"><table class="regras-table regras-table--dado">
      <thead><tr><th>1d6</th><th>Na cidade</th><th>No ermo</th></tr></thead>
      <tbody>${tabelaObstaculos}</tbody>
    </table></div>
    <p>O obstáculo dá cor à rodada e sugere a manobra: o vão entre telhados pede um salto, a feira cheia pede cortar caminho ou sumir. Ninguém rola só para passar por ele.</p>

    <h3 class="regras-subtitle">Como a cena termina</h3>
    <ul class="regras-list">
      <li><strong>Distância 0, Contato:</strong> a perseguição acaba e o combate começa ali mesmo, no lugar da última rodada.</li>
      <li><strong>Distância 4, Escapou:</strong> quem fugia sumiu. Para achar essa pessoa de novo, o grupo vai precisar investigar ou conseguir uma pista.</li>
      <li><strong>As rodadas acabaram:</strong> ninguém conseguiu o que queria, mas os dois lados descobrem algo um do outro, como o rosto ou para que lado ele foi.</li>
    </ul>
    <div class="regras-note regras-note--exemplo">
      <p>Um ladrão foge da Caçadora pela feira, começando na distância 2. Na primeira rodada ela rola Atletismo e o Guerreiro Ajuda (+2), abrindo caminho entre as barracas. O ladrão tenta Cortar caminho por um beco e perde por 3: distância 1. Na segunda rodada, o vão entre dois telhados aparece, o ladrão arrisca o Salto e perde de novo. Ele cai, fica Caído, e a distância vai a 0: começa a luta.</p>
    </div>
  `,
  corpoMestre: `
    <p class="regras-lead">A perseguição deixa o grupo ganhar ou perder sem que ninguém morra, e é uma boa chance de mostrar a cidade. Resolver tudo com um único teste de Atletismo desperdiça a cena.</p>

    <h3 class="regras-subtitle">Quando abrir a distância</h3>
    <ul class="regras-list">
      <li>Abra quando o resultado importar dos dois lados. Um batedor de carteira que fugiu com uma moeda merece uma frase, e a moeda perdida.</li>
      <li>Se o grupo é claramente mais rápido, não role: eles alcançam. A cena boa é a que tem dúvida.</li>
      <li>NPC que precisa escapar para a história continuar deveria sumir antes de a cena começar. Se ele entrou numa perseguição, aceite a chance de perdê-lo.</li>
    </ul>

    <h3 class="regras-subtitle">Calibrar a dificuldade</h3>
    <ul class="regras-list">
      <li>Um fugitivo sozinho com o mesmo bônus do grupo perde a maioria das rodadas, porque quem rola pelo grupo recebe a Ajuda de dois companheiros (+4). Para segurar alguém por seis rodadas, dê a ele conhecimento do terreno, vantagem em uma manobra ou alguém que Atrapalhe atrás.</li>
      <li>Ajudar e Atrapalhar têm teto de ${APOIOS_MAXIMOS_POR_LADO} pessoas por lado para o grupo grande não atropelar a cena. A rodada continua decidida por quem rola.</li>
      <li>O obstáculo é o seu botão de ajuste. Ele não pede teste, mas mostra qual manobra faz sentido: um vão favorece quem sabe saltar, uma feira favorece quem quer sumir.</li>
      <li>Terreno que favorece um lado deve ser dito antes da escolha das manobras. Quem foge para o telhado precisa saber que o telhado é vantagem dele.</li>
    </ul>

    <h3 class="regras-subtitle">Contar a corrida</h3>
    <ul class="regras-list">
      <li>Descreva a distância pelo que se vê, e deixe o número de lado: "você ainda vê o casaco dele virando a esquina" diz 2 sem soar tabela.</li>
      <li>Use frases curtas. Narrar devagar tira a pressa da cena.</li>
      <li>Toda rodada precisa de uma escolha nova. Se as três últimas foram Correr contra Correr, jogue um obstáculo grande e feche a cena na rodada seguinte.</li>
      <li>Aproveite para mostrar a cidade: a feira, os telhados, os becos. Cada rodada pode passar por um lugar novo, e alguns deles podem voltar mais tarde na campanha.</li>
    </ul>
  `,
};
