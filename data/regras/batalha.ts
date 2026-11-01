/** Batalha em massa.
 *
 * Quando centenas lutam, ninguém rola ataque por soldado. Cada lado vira uma
 * contagem de Força (o mesmo jeito de contar da Resistência do Conflito
 * Social), os comandantes disputam fases com a perícia Guerra, que até aqui
 * não tinha casa, e os personagens fazem feitos no meio da batalha. A moral é
 * a do Combate (2d6 por bando) e o dano que os heróis levam é a tabela de
 * Perigos do Ambiente, na linha do nível da batalha: nada de número novo onde
 * já havia um.
 */
import { NIVEIS_DE_REFERENCIA } from '../../src/services/referenciaBalanceamento';
import { linhaDeArmadilha } from './perigosAmbiente';
import type { RegraTopicoDe } from './tipos';

export interface ITamanhoDeExercito {
  id: string;
  titulo: string;
  gente: string;
  forca: number;
}

export const TAMANHOS_DE_EXERCITO: readonly ITamanhoDeExercito[] = [
  { id: 'bando', titulo: 'Bando', gente: 'até 50', forca: 4 },
  { id: 'companhia', titulo: 'Companhia', gente: 'até 300', forca: 6 },
  { id: 'legiao', titulo: 'Legião', gente: 'até 2.000', forca: 8 },
  { id: 'exercito', titulo: 'Exército', gente: 'milhares', forca: 10 },
];

export const BONUS_POR_VANTAGEM = 2;
export const BONUS_MAXIMO_DE_VANTAGEM = 6;

export const VANTAGENS_DE_BATALHA: readonly string[] = [
  'Mais gente: o dobro do outro lado, ou mais.',
  'Tropa melhor: veterana, mais bem armada ou de nível mais alto.',
  'Posição: muralha, morro, ponte estreita, o rio nas costas do inimigo.',
  'Surpresa: só na primeira fase.',
  'Uma criatura enorme ou uma máquina de guerra que o outro lado não tem como enfrentar.',
];

export function bonusDeVantagens(quantas: number): number {
  return Math.min(BONUS_MAXIMO_DE_VANTAGEM, Math.max(0, Math.trunc(quantas)) * BONUS_POR_VANTAGEM);
}

// ----------------------------------------------------------------- ordens

export type OrdemDeBatalha = 'avancar' | 'flanquear' | 'segurar' | 'recuar';

export interface IOrdemDeBatalha {
  id: OrdemDeBatalha;
  titulo: string;
  /** Ordem que esta vence: quem acertou a ordem ganha +2 no choque. */
  vence: OrdemDeBatalha | null;
  cena: string;
}

export const ORDENS_DE_BATALHA: readonly IOrdemDeBatalha[] = [
  { id: 'avancar', titulo: 'Avançar', vence: 'flanquear', cena: 'A carga vai reto, e pega no meio da curva quem tentava dar a volta.' },
  { id: 'flanquear', titulo: 'Flanquear', vence: 'segurar', cena: 'Metade da tropa dá a volta pela mata e cai de lado sobre quem ficou parado.' },
  { id: 'segurar', titulo: 'Segurar a linha', vence: 'avancar', cena: 'Escudo colado em escudo: a carga quebra na parede e volta pela metade.' },
  { id: 'recuar', titulo: 'Recuar', vence: null, cena: 'Recuo em ordem, com a retaguarda segurando para o resto sair.' },
];

export const BONUS_DA_ORDEM = 2;

/** +2 para o lado cuja ordem vence a do outro; zero para os dois quando nenhuma vence. */
export function bonusDasOrdens(a: OrdemDeBatalha, b: OrdemDeBatalha): [number, number] {
  const ordemA = ORDENS_DE_BATALHA.find((ordem) => ordem.id === a);
  const ordemB = ORDENS_DE_BATALHA.find((ordem) => ordem.id === b);
  return [ordemA?.vence === b ? BONUS_DA_ORDEM : 0, ordemB?.vence === a ? BONUS_DA_ORDEM : 0];
}

/** Força que cada lado perde no choque. Margem é o resultado de A menos o de B.
 *  Vencer tira 1 parte do outro, vencer por 10 ou mais tira 2, empate tira 1
 *  dos dois. Quem recua nunca perde mais que 1. */
export function perdasDoChoque(
  margem: number,
  { recuaA = false, recuaB = false }: { recuaA?: boolean; recuaB?: boolean } = {},
): [number, number] {
  if (margem === 0) return [1, 1];
  const perda = Math.abs(margem) >= 10 ? 2 : 1;
  if (margem > 0) return [0, recuaB ? 1 : perda];
  return [recuaA ? 1 : perda, 0];
}

// ----------------------------------------------------------------- feitos

export interface IFeitoDeBatalha {
  id: string;
  titulo: string;
  teste: string;
  efeito: string;
}

export const FEITOS_DE_BATALHA: readonly IFeitoDeBatalha[] = [
  { id: 'frente', titulo: 'Na linha de frente', teste: 'Luta ou Pontaria contra a DT Difícil', efeito: 'O inimigo perde 1 parte de Força.' },
  { id: 'comando', titulo: 'Contra o comando', teste: 'Furtividade ou Luta contra a DT Difícil', efeito: 'O choque do inimigo nesta fase tem desvantagem. Por 10 ou mais, o comandante dele cai ou foge, e o lado dele testa moral.' },
  { id: 'brecha', titulo: 'Segurar a brecha', teste: 'Atletismo ou Fortitude contra a DT Padrão', efeito: 'O seu lado recupera 1 parte que perdeu nesta fase.' },
  { id: 'artilharia', titulo: 'Artilharia e magia de área', teste: 'Pontaria, Tecnologia ou o teste da magia contra a DT Difícil', efeito: 'O inimigo perde 1 parte de Força.' },
  { id: 'comandante', titulo: 'Ao lado do comandante', teste: 'Ajudar, contra DT 10', efeito: '+2 no choque do seu lado, ou vantagem se o sucesso for crítico.' },
];

/** Somados, os feitos do grupo tiram no máximo esta Força do inimigo por fase:
 *  heróis decidem batalhas, e a batalha continua sendo dos exércitos. */
export const PARTES_MAXIMAS_POR_FEITOS = 2;

/** Força restante em que um lado testa moral: na metade e num quarto. */
export function pontosDeMoral(forcaMaxima: number): number[] {
  return [Math.floor(forcaMaxima / 2), Math.floor(forcaMaxima / 4)].filter((ponto, indice, lista) => ponto > 0 && lista.indexOf(ponto) === indice);
}

export const LINHAS_DE_DANO_NA_BATALHA = NIVEIS_DE_REFERENCIA.filter((nivel) => nivel <= 100).map(linhaDeArmadilha);

// ------------------------------------------------------------------ página

const tabelaTamanhos = TAMANHOS_DE_EXERCITO.map((tamanho) => `
  <tr><td><strong>${tamanho.titulo}</strong></td><td>${tamanho.gente}</td><td>${tamanho.forca}</td></tr>
`).join('');

const nomeDaOrdem = (id: OrdemDeBatalha | null) => ORDENS_DE_BATALHA.find((ordem) => ordem.id === id)?.titulo ?? '';

const tabelaOrdens = ORDENS_DE_BATALHA.map((ordem) => `
  <tr><td><strong>${ordem.titulo}</strong></td><td>${ordem.cena}<small class="regras-mecanica">${ordem.vence ? `Vence ${nomeDaOrdem(ordem.vence)}: +${BONUS_DA_ORDEM} no choque.` : 'Não vence nenhuma. Quem recua perde no máximo 1 parte por fase e, se vencer o choque, pode sair do campo no fim dela.'}</small></td></tr>
`).join('');

const tabelaFeitos = FEITOS_DE_BATALHA.map((feito) => `
  <tr><td><strong>${feito.titulo}</strong></td><td>${feito.teste}.<small class="regras-mecanica">${feito.efeito}</small></td></tr>
`).join('');

const tabelaDano = LINHAS_DE_DANO_NA_BATALHA.map((linha) => `
  <tr><td><strong>${linha.nivel}</strong></td><td>${linha.dtPadrao} / ${linha.dtDificil}</td><td>${linha.dano.leve}</td><td>${linha.dano.seria}</td></tr>
`).join('');

const listaVantagens = VANTAGENS_DE_BATALHA.map((vantagem) => `<li>${vantagem}</li>`).join('\n      ');

export const REGRA_BATALHA: RegraTopicoDe<'Combate e Mecânicas'> = {
  categoria: 'Combate e Mecânicas',
  status: 'Regra oficial',
  resumo: 'Quando centenas lutam: cada lado tem uma Força, os comandantes disputam fases com Guerra e os personagens fazem feitos no meio da batalha que mudam o resultado.',
  destaques: [
    ['Força', '4 a 10 partes'],
    ['Choque', 'Guerra oposto'],
    ['Feitos', `até ${PARTES_MAXIMAS_POR_FEITOS} partes por fase`],
  ],
  corpo: `
    <p class="regras-lead">A neblina levanta e o outro lado está lá, mais perto do que o batedor disse. Ninguém rola ataque por soldado: cada exército vira uma contagem de Força, os comandantes medem a batalha fase a fase e os personagens estão no meio dela, onde um feito certo vale mais que cem lanças.</p>

    <div class="regras-resumo">
      <ul>
        <li>Cada lado tem uma <strong>Força</strong> de 4 a 10 partes, pelo tamanho. Perdeu todas, perdeu a batalha.</li>
        <li>A cada fase, os comandantes escolhem uma ordem em segredo e fazem um teste oposto de <strong>Guerra</strong>. Quem vence tira Força do outro.</li>
        <li>Os personagens escolhem onde estão na fase e fazem um <strong>feito</strong>: acertou, ajuda o próprio lado; falhou, sai mais machucado.</li>
        <li>Na metade da Força e num quarto dela, o lado testa moral, como no <span class="regras-ref regras-ref--combate">Combate</span>. Quem desiste foge do campo.</li>
      </ul>
    </div>

    <h3 class="regras-subtitle">Os lados</h3>
    <div class="regras-table-wrap"><table class="regras-table">
      <thead><tr><th>Tamanho</th><th>Gente</th><th>Força</th></tr></thead>
      <tbody>${tabelaTamanhos}</tbody>
    </table></div>
    <p>Cada vantagem clara de um lado dá +${BONUS_POR_VANTAGEM} no choque dele, até +${BONUS_MAXIMO_DE_VANTAGEM}:</p>
    <ul class="regras-list">
      ${listaVantagens}
    </ul>
    <ul class="regras-list">
      <li><strong>O nível da batalha</strong> é o das tropas inimigas: ele escolhe a DT dos feitos e o dano que os personagens levam.</li>
      <li><strong>Tropa sem comandante</strong> faz o choque com o d20 puro, sem bônus nenhum.</li>
      <li><strong>As tropas do grupo</strong> vêm de onde a história trouxer: uma facção que confia em vocês (<span class="regras-ref regras-ref--mundo-faccoes">Prestígio, Fama e Procura</span>), aliados e contratados, a guarnição de uma Fortaleza.</li>
    </ul>

    <h3 class="regras-subtitle">A fase</h3>
    <ol class="regras-steps">
      <li><strong>Ordens.</strong> Cada comandante escolhe uma ordem em segredo, e as duas são reveladas juntas. O Mestre anota a dele antes de ouvir a do grupo.</li>
      <li><strong>Feitos.</strong> Cada personagem diz onde está nesta fase e faz o feito escolhido. O Mestre pode transformar um feito num combate curto quando a cena pedir.</li>
      <li><strong>Choque.</strong> Teste oposto de Guerra dos comandantes, com as vantagens, a ordem e o que os feitos deram.</li>
      <li><strong>Perdas.</strong> Quem vence o choque tira 1 parte da Força do outro, e 2 se vencer por 10 ou mais. Empate tira 1 dos dois. Somam-se as partes que os feitos tiraram.</li>
      <li><strong>Moral.</strong> O lado que chegou à metade da Força, ou a um quarto dela, testa moral.</li>
      <li><strong>Dano.</strong> Cada personagem que fez um feito sofre o dano da fase pela tabela de baixo.</li>
    </ol>
    <p class="regras-note">Uma fase é mais ou menos meia hora de luta. A maioria das batalhas termina entre a terceira e a sexta.</p>

    <h3 class="regras-subtitle">Ordens</h3>
    <p>As três primeiras se vencem em roda: Avançar vence Flanquear, Flanquear vence Segurar a linha e Segurar a linha vence Avançar. Quem acertou a ordem ganha +${BONUS_DA_ORDEM} no choque.</p>
    <div class="regras-table-wrap"><table class="regras-table">
      <thead><tr><th>Ordem</th><th>Como é, e o que vence</th></tr></thead>
      <tbody>${tabelaOrdens}</tbody>
    </table></div>

    <h3 class="regras-subtitle">Feitos</h3>
    <div class="regras-table-wrap"><table class="regras-table">
      <thead><tr><th>Onde</th><th>Teste, e o que o sucesso faz</th></tr></thead>
      <tbody>${tabelaFeitos}</tbody>
    </table></div>
    <ul class="regras-list">
      <li><strong>Somados, os feitos tiram no máximo ${PARTES_MAXIMAS_POR_FEITOS} partes do inimigo por fase.</strong> O resto da batalha é dos exércitos.</li>
      <li><strong>Quem prefere ficar atrás das linhas</strong> não faz feito e não leva dano.</li>
      <li><strong>Duelo de campeões:</strong> quando dois heróis se encontram no meio da batalha, vira combate normal. Quem vence tira 1 parte do outro lado, e se o derrotado era o comandante ou o campeão dele, o lado dele testa moral.</li>
      <li><strong>Magia, item e habilidade de classe</strong> entram como feito, com o teste que já usam.</li>
    </ul>

    <h3 class="regras-subtitle">Dano na batalha</h3>
    <p>No fim de cada fase, quem fez um feito sofre dano do tipo que fizer sentido (corte, perfuração, impacto, o Fogo da magia inimiga), pela linha do nível da batalha.</p>
    <div class="regras-table-wrap"><table class="regras-table">
      <thead><tr><th>Nível</th><th>DT Padrão / Difícil</th><th>Feito com sucesso</th><th>Feito com falha</th></tr></thead>
      <tbody>${tabelaDano}</tbody>
    </table></div>

    <h3 class="regras-subtitle">Como termina</h3>
    <ul class="regras-list">
      <li><strong>Força 0:</strong> o lado se desfaz. Quem sobrou foge, se rende ou é cercado.</li>
      <li><strong>Moral:</strong> na metade da Força e num quarto dela, o lado testa 2d6 com os ajustes do Combate. Desiste: foge do campo. Vacila: na próxima fase, o comandante dele só pode ordenar Segurar a linha ou Recuar.</li>
      <li><strong>Recuo:</strong> quem recua e vence o choque pode sair do campo no fim da fase, com a Força que ainda tem.</li>
      <li><strong>Depois:</strong> uma batalha conta como combate intenso para quem lutou (1 de Cansaço, em <span class="regras-ref regras-ref--descanso">Descanso</span>). Cada parte perdida é uma fatia das tropas fora de combate, entre mortos, feridos e fugidos, e o mundo fica sabendo de quem venceu.</li>
    </ul>
    <div class="regras-note regras-note--exemplo">
      <p>Uma Companhia de milícia (Força 6) defende a ponte contra uma Legião de saqueadores (Força 8). A milícia tem Posição (+2), os saqueadores têm Mais gente (+2). Na primeira fase, a milícia escolhe Segurar a linha e os saqueadores, Avançar: +2 para a milícia. O Guerreiro do grupo vai para a linha de frente e acerta o feito, e os saqueadores perdem 1 parte. No choque, a milícia vence por 4 e tira mais 1: Legião em 6. O Guerreiro leva o dano Leve da linha do nível da batalha.</p>
    </div>
  `,
  corpoMestre: `
    <p class="regras-lead">A batalha é o palco, e os personagens são a cena. Os números existem para dizer quem está ganhando e quanto tempo falta; o que a mesa vai lembrar é o feito na ponte, o estandarte que caiu e o duelo no meio da lama.</p>

    <h3 class="regras-subtitle">Preparar</h3>
    <ul class="regras-list">
      <li>Escolha a Força dos dois lados e as vantagens antes da sessão, e diga ao grupo as que eles conseguem ver. Esconder que o inimigo tem o dobro de gente só faz o plano deles parecer bobo depois.</li>
      <li>Prepare três momentos para soltar entre as fases: a ponte que cede, o reforço que chega pelo flanco, o comandante inimigo que aparece em pessoa. Um momento pode dar ou tirar uma vantagem, ou abrir um feito novo.</li>
      <li>O comandante inimigo faz o choque com o Ataque da tabela de NPCs e inimigos de nível alto, na linha do nível dele. Um comandante medíocre usa metade disso.</li>
    </ul>

    <h3 class="regras-subtitle">Calibrar</h3>
    <ul class="regras-list">
      <li>Com lados iguais, cada choque é cara ou coroa. Cada +2 vale uns dez pontos percentuais, então três vantagens decidem quase sozinhas, e os feitos do grupo são o que vira o jogo contra elas.</li>
      <li>O teto de ${PARTES_MAXIMAS_POR_FEITOS} partes por fase para os feitos mantém o exército importante. Se o grupo tem um personagem capaz de varrer um batalhão sozinho, isso é um feito que vale como vantagem, e a vantagem continua contando até ${BONUS_MAXIMO_DE_VANTAGEM}.</li>
      <li>Batalha com mais de seis fases cansa. Se as Forças forem grandes dos dois lados, comece com as duas já desgastadas pela marcha e pelas escaramuças.</li>
    </ul>
  `,
};
