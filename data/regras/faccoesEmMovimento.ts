/** Facções em movimento.
 *
 * Prestígio diz como cada facção trata o grupo. Esta página diz o que as
 * facções fazem enquanto o grupo não está olhando: cada uma ativa tem um
 * objetivo e um relógio, e no intervalo entre aventuras o Mestre rola o avanço
 * delas em 2d6, o mesmo dado das tabelas do Guia. O objetivo pode ficar só como
 * rótulo até ser descoberto (Segredos, no Guia do Mestre); o relógio fica à
 * vista, porque é a mecânica que a mesa usa para decidir onde agir.
 */
import type { RegraTopicoDe } from './tipos';

export type PoderDeFaccao = 0 | 1 | 2 | 3;

export interface IPoderDeFaccao {
  poder: PoderDeFaccao;
  titulo: string;
  exemplos: string;
}

export const PODERES_DE_FACCAO: readonly IPoderDeFaccao[] = [
  { poder: 0, titulo: 'Pequena', exemplos: 'Uma gangue de bairro, uma oficina, um culto que cabe numa sala.' },
  { poder: 1, titulo: 'Local', exemplos: 'Uma guilda da cidade, uma família de mercadores, a guarda de um porto.' },
  { poder: 2, titulo: 'Regional', exemplos: 'Uma casa nobre, uma ordem com sedes em vários reinos, uma companhia mercante.' },
  { poder: 3, titulo: 'Grande', exemplos: 'Um reino, a fé de uma Árvore, o Banco Lunar, a A.X.I.S.' },
];

export interface ITamanhoDeObjetivo {
  id: string;
  titulo: string;
  partes: number;
  exemplo: string;
}

export const TAMANHOS_DE_OBJETIVO: readonly ITamanhoDeObjetivo[] = [
  { id: 'proximo', titulo: 'Próximo', partes: 4, exemplo: 'Tomar o controle do cais antes do festival.' },
  { id: 'arco', titulo: 'De um arco', partes: 6, exemplo: 'Pôr um aliado na cadeira do conselho da cidade.' },
  { id: 'campanha', titulo: 'De uma campanha', partes: 8, exemplo: 'Erguer a ponte entre dois reinos e cobrar pedágio de quem passa.' },
];

export type AvancoDeFaccao = 'emperrou' | 'avancou' | 'avancou-bem';

export interface IFaixaDeAvanco {
  resultado: AvancoDeFaccao;
  minimo: number;
  rotulo: string;
  titulo: string;
  partes: number;
  efeito: string;
}

export const FAIXAS_DE_AVANCO: readonly IFaixaDeAvanco[] = [
  { resultado: 'emperrou', minimo: Number.NEGATIVE_INFINITY, rotulo: '6 ou menos', titulo: 'Emperrou', partes: 0, efeito: 'Alguma coisa atrapalhou: um rival, um escândalo, dinheiro que não chegou. O Mestre diz o quê, e isso costuma virar gancho.' },
  { resultado: 'avancou', minimo: 7, rotulo: '7 a 9', titulo: 'Avançou', partes: 1, efeito: 'O plano anda um passo. Pinte 1 parte.' },
  { resultado: 'avancou-bem', minimo: 10, rotulo: '10 ou mais', titulo: 'Avançou bem', partes: 2, efeito: 'Tudo saiu como a facção queria. Pinte 2 partes.' },
];

/** Faixa do avanço: 2d6 + Poder da facção. */
export function avancoDaFaccao(dados: number, poder: number): IFaixaDeAvanco {
  const total = dados + poder;
  return [...FAIXAS_DE_AVANCO].reverse().find((faixa) => total >= faixa.minimo) ?? FAIXAS_DE_AVANCO[0];
}

/** Duas facções disputando a mesma coisa rolam uma contra a outra: a vencedora
 *  pinta 1 parte e a perdedora apaga 1. Empate deixa as duas como estão. */
export function disputaEntreFaccoes(totalA: number, totalB: number): [number, number] {
  if (totalA === totalB) return [0, 0];
  return totalA > totalB ? [1, -1] : [-1, 1];
}

export interface IEstadoDoObjetivo {
  partes: number;
  pintadas: number;
}

/** Aplica partes (positivas pintam, negativas apagam) e diz se o objetivo fechou. */
export function moverObjetivo(estado: IEstadoDoObjetivo, delta: number): IEstadoDoObjetivo & { fechou: boolean } {
  const pintadas = Math.max(0, Math.min(estado.partes, estado.pintadas + Math.trunc(delta)));
  return { partes: estado.partes, pintadas, fechou: pintadas >= estado.partes };
}

export const ACOES_DO_GRUPO: readonly { titulo: string; efeito: string }[] = [
  { titulo: 'Contra o objetivo', efeito: 'Uma ação concreta do grupo que atrapalhe o plano apaga 1 parte, e 2 se for um marco de campanha.' },
  { titulo: 'A favor do objetivo', efeito: 'Uma ação concreta que ajude pinta 1 parte, e 2 se for um marco.' },
  { titulo: 'Descobrir o objetivo', efeito: 'Até ser descoberto, o objetivo aparece só como rótulo. Descobrir é uma investigação, e entrega a frase inteira.' },
];

// ------------------------------------------------------------------ página

const comSinal = (valor: number) => (valor > 0 ? `+${valor}` : String(valor));

const tabelaPoder = PODERES_DE_FACCAO.map((item) => `
  <tr><td><strong>${comSinal(item.poder)}</strong></td><td>${item.titulo}</td><td>${item.exemplos}</td></tr>
`).join('');

const tabelaObjetivos = TAMANHOS_DE_OBJETIVO.map((item) => `
  <tr><td><strong>${item.titulo}</strong></td><td>${item.partes} partes</td><td>${item.exemplo}</td></tr>
`).join('');

const tabelaAvanco = FAIXAS_DE_AVANCO.map((faixa) => `
  <tr><td>${faixa.rotulo}</td><td><strong>${faixa.titulo}.</strong> ${faixa.efeito}</td></tr>
`).join('');

const listaAcoes = ACOES_DO_GRUPO.map((acao) => `<li><strong>${acao.titulo}:</strong> ${acao.efeito}</li>`).join('\n      ');

export const REGRA_FACCOES_EM_MOVIMENTO: RegraTopicoDe<'Livro do Jogador'> = {
  categoria: 'Livro do Jogador',
  status: 'Regra oficial',
  resumo: 'As facções não esperam o grupo. Cada uma ativa tem um objetivo e um relógio, e no intervalo entre aventuras o mundo anda: o que o grupo faz muda o ritmo.',
  destaques: [
    ['Relógio', '4, 6 ou 8 partes'],
    ['Avanço', '2d6 + Poder'],
    ['Quando', 'a cada intervalo'],
  ],
  corpo: `
    <p class="regras-lead">Enquanto vocês dormem na estalagem, a guilda compra mais um armazém no cais, a ordem manda mais uma carta ao conselho e alguém, num porão, risca mais um nome da lista. As facções têm os próprios planos, e eles andam com ou sem o grupo. Esta página mostra como.</p>

    <div class="regras-resumo">
      <ul>
        <li>Cada facção ativa tem um <strong>objetivo</strong> (uma frase), um <strong>relógio</strong> de 4, 6 ou 8 partes e um <strong>Poder</strong> de 0 a 3.</li>
        <li>No fim de cada intervalo entre aventuras, o Mestre rola 2d6 + Poder para cada facção ativa. De 7 a 9 o relógio pinta 1 parte; com 10 ou mais, pinta 2.</li>
        <li>Uma ação concreta do grupo contra o plano apaga uma parte, e a favor pinta uma.</li>
        <li>Relógio cheio: o objetivo acontece e o mundo muda. A facção escolhe outro.</li>
        <li>O relógio fica à vista. O objetivo pode aparecer só como rótulo até alguém descobrir o que é.</li>
      </ul>
    </div>

    <h3 class="regras-subtitle">A facção ativa</h3>
    <p>A campanha costuma ter de duas a quatro facções ativas ao mesmo tempo. As outras existem e reagem, mas não rolam. As facções documentadas nos Registros Universais servem de ponto de partida.</p>
    <div class="regras-table-wrap"><table class="regras-table">
      <thead><tr><th>Poder</th><th>Tamanho</th><th>Exemplos</th></tr></thead>
      <tbody>${tabelaPoder}</tbody>
    </table></div>
    <div class="regras-table-wrap"><table class="regras-table">
      <thead><tr><th>Objetivo</th><th>Relógio</th><th>Exemplo</th></tr></thead>
      <tbody>${tabelaObjetivos}</tbody>
    </table></div>

    <h3 class="regras-subtitle">O turno das facções</h3>
    <ol class="regras-steps">
      <li>No fim do intervalo entre aventuras (<span class="regras-ref regras-ref--entre-aventuras">Tempo Entre Aventuras</span>), ou a cada mês do calendário num intervalo longo, o Mestre rola 2d6 + Poder para cada facção ativa.</li>
      <li>Duas facções que querem a mesma coisa rolam uma contra a outra: a que tirar mais pinta 1 parte, e a outra apaga 1.</li>
      <li>O Mestre conta um boato por facção que avançou: o que se diz na rua, sem entregar o plano inteiro.</li>
    </ol>
    <div class="regras-table-wrap"><table class="regras-table regras-table--dado">
      <thead><tr><th>2d6 + Poder</th><th>O que acontece</th></tr></thead>
      <tbody>${tabelaAvanco}</tbody>
    </table></div>

    <h3 class="regras-subtitle">O grupo no meio</h3>
    <ul class="regras-list">
      ${listaAcoes}
    </ul>
    <ul class="regras-list">
      <li><strong>Conta uma ação por facção por intervalo.</strong> Três sabotagens seguidas no mesmo armazém valem uma.</li>
      <li><strong>Prestígio anda junto:</strong> ajudar uma facção a fechar o relógio é um marco, e atrapalhar o plano central dela pode ser traição (<span class="regras-ref regras-ref--mundo-faccoes">Prestígio, Fama e Procura</span>).</li>
      <li><strong>Relógio cheio:</strong> o objetivo acontece. O Mestre conta o que mudou: um preço, uma lei, quem manda numa rua, uma rota fechada. A facção escolhe um objetivo novo, com o relógio vazio.</li>
    </ul>
    <div class="regras-note regras-note--exemplo">
      <p>Uma companhia mercante (Poder 2) quer "algo no cais", num relógio de 6, com 3 partes pintadas. No fim do intervalo, o Mestre rola 8 + 2 = 10: pinta 2, e o relógio vai a 5. O boato da semana é que estão comprando barcos velhos. O grupo descobre o plano (eles querem a doca seca do porto) e queima os barcos: o relógio volta a 4, e a companhia agora sabe quem foi.</p>
    </div>
  `,
  corpoMestre: `
    <p class="regras-lead">O turno das facções é o jeito de o mundo parecer vivo sem você improvisar tudo. Ele trabalha melhor com poucas facções, objetivos concretos e relógios que a mesa vê.</p>

    <h3 class="regras-subtitle">Escrever o objetivo</h3>
    <ul class="regras-list">
      <li>Um verbo e uma coisa concreta: controlar o cais, achar o Fruto perdido, casar a herdeira com o filho do cônsul. "Ficar mais forte" não fecha relógio nenhum.</li>
      <li>Decida o que muda no mundo quando o relógio fechar antes de começar. É isso que você vai contar na hora, e é isso que dá motivo à mesa para agir.</li>
      <li>Escolha o rótulo que a mesa vê antes da descoberta: uma pista do plano, sem a solução.</li>
    </ul>

    <h3 class="regras-subtitle">Calibrar</h3>
    <ul class="regras-list">
      <li>Com Poder 0, a facção avança em 58% dos turnos e avança bem em 17%. Com Poder 3, avança em 92% e avança bem em 58%. Uma facção grande fecha um relógio de 8 em uns cinco intervalos; uma pequena fecha um de 4 no mesmo tempo.</li>
      <li>Emperrou é gancho. O rival que atrapalhou, o escândalo, o dinheiro que não veio: qualquer um deles pode bater na porta do grupo na sessão seguinte.</li>
      <li>Não role o que você já decidiu. Se a história pede que o plano avance, pinte a parte e conte o boato.</li>
      <li>Os Boatos por Árvore, no Guia do Mestre, dão o tom do que se diz na rua quando uma facção avança.</li>
    </ul>
  `,
};
