/** Moral dos inimigos: quando o lado de lá desiste da luta.
 *
 * Mora no tópico de Combate, à vista dos jogadores, porque saber que derrubar
 * o líder ou assustar o bando encurta a luta é informação de decisão (o Guia
 * do Mestre: mecânica nunca é segredo). Rola-se em 2d6 por bando, no mesmo
 * dado das tabelas de mesa do Guia, porque as criaturas usam outro bloco de
 * atributos e não têm Vontade para testar.
 */

export type ResultadoDeMoral = 'desiste' | 'vacila' | 'segura';

export interface IFaixaDeMoral {
  resultado: ResultadoDeMoral;
  /** Total mínimo (2d6 + ajustes) que cai nesta faixa. */
  minimo: number;
  rotulo: string;
  titulo: string;
  efeito: string;
}

export const FAIXAS_DE_MORAL: readonly IFaixaDeMoral[] = [
  {
    resultado: 'desiste',
    minimo: Number.NEGATIVE_INFINITY,
    rotulo: '5 ou menos',
    titulo: 'Desiste',
    efeito: 'Foge pela saída mais próxima, larga a arma e se rende, ou pede trégua, do jeito que combinar com quem é.',
  },
  {
    resultado: 'vacila',
    minimo: 6,
    rotulo: '6 a 8',
    titulo: 'Vacila',
    efeito: 'Na próxima rodada luta na defensiva: busca cobertura, recua para perto dos outros ou tenta negociar. O próximo teste de moral desta cena leva o −2 de quem já vacilou, da tabela de ajustes.',
  },
  {
    resultado: 'segura',
    minimo: 9,
    rotulo: '9 ou mais',
    titulo: 'Segura a linha',
    efeito: 'Continua lutando, e este gatilho não pede outro teste na mesma cena.',
  },
];

export interface IAjusteDeMoral {
  valor: number;
  quando: string;
}

export const AJUSTES_DE_MORAL: readonly IAjusteDeMoral[] = [
  { valor: 2, quando: 'Defende o ninho, a casa ou a cria, é fanático ou não tem para onde fugir.' },
  { valor: -2, quando: 'Luta por pagamento ou obrigado, ou é um bicho que só estava com fome.' },
  { valor: -2, quando: 'Já vacilou antes nesta cena.' },
];

export const GATILHOS_DE_MORAL: readonly string[] = [
  'O líder cai, foge ou se rende.',
  'Metade do bando caiu.',
  'Uma criatura que luta sozinha chega a um quarto da Vida.',
  'Algo claramente mais forte entra na luta do lado do grupo.',
];

/** Faixa do total (2d6 + soma dos ajustes). */
export function resolverMoral(dados: number, ajuste = 0): IFaixaDeMoral {
  const total = dados + ajuste;
  return [...FAIXAS_DE_MORAL].reverse().find((faixa) => total >= faixa.minimo) ?? FAIXAS_DE_MORAL[0];
}

const sinal = (valor: number) => (valor > 0 ? `+${valor}` : `−${Math.abs(valor)}`);

export const HTML_MORAL = `
      <h3 class="regras-subtitle">Quando o inimigo desiste</h3>
      <p>Nem toda luta acaba no último ponto de Vida. Quando o lado inimigo sofre um golpe que muda a cara da luta, o Mestre rola o teste de moral do bando: 2d6, com os ajustes abaixo. Na primeira vez que cada uma destas coisas acontece numa cena, ele rola:</p>
      <ul class="regras-list">
        ${GATILHOS_DE_MORAL.map((gatilho) => `<li>${gatilho}</li>`).join('\n        ')}
      </ul>
      <div class="regras-table-wrap"><table class="regras-table regras-table--dado">
        <thead><tr><th>2d6 + ajustes</th><th>O que o bando faz</th></tr></thead>
        <tbody>
          ${FAIXAS_DE_MORAL.map((faixa) => `<tr><td>${faixa.rotulo}</td><td><strong>${faixa.titulo}.</strong> ${faixa.efeito}</td></tr>`).join('\n          ')}
        </tbody>
      </table></div>
      <div class="regras-table-wrap"><table class="regras-table">
        <thead><tr><th>Ajuste</th><th>Quando</th></tr></thead>
        <tbody>
          ${AJUSTES_DE_MORAL.map((ajuste) => `<tr><td>${sinal(ajuste.valor)}</td><td>${ajuste.quando}</td></tr>`).join('\n          ')}
        </tbody>
      </table></div>
      <ul class="regras-list">
        <li><strong>Intimidar o bando:</strong> uma Ação Padrão e Intimidação contra a DT Padrão do nível dos inimigos. O sucesso provoca um teste de moral na hora. Vale uma vez por cena para o grupo inteiro.</li>
        <li><strong>Quem não testa:</strong> criatura sem vontade própria (morto erguido, construto, invocação que obedece), chefe com fases, que já trazem o que muda, e quem a história diz que luta até o fim. Os aliados do grupo também não testam: quem decide por eles são os jogadores.</li>
        <li><strong>Quem desistiu sai da luta e continua na cena:</strong> prisioneiro, informante ou alguém que volta depois com amigos. Arrancar alguma coisa dele vira <span class="regras-ref regras-ref--conflito-social">Conflito Social</span>.</li>
      </ul>`;
