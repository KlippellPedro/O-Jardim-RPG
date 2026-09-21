import falas from './falasAnalise.json';

/** A "Análise" do Grande Sábio: olha a ficha e devolve o que merece atenção.
 * Cada observação tem uma frase FIXA (a que a voz fala, gravada antes em
 * tools/gerar-voz-sabio.py a partir de falasAnalise.json) e um detalhe com os
 * números, que só aparece na tela. Assim a voz nunca precisa dizer valores. */

export type GravidadeAnalise = 'urgente' | 'atencao' | 'info';

export interface ObservacaoAnalise {
  id: string;
  fala: string;
  detalhe: string;
  gravidade: GravidadeAnalise;
  /** Aba da ficha onde o assunto se resolve. */
  aba?: string;
}

export interface EntradaAnalise {
  pendencias: Array<{ id: string; quantidade: number }>;
  /** Vida, mana e sanidade atuais em porcentagem do máximo (0 a 100). */
  vida: number;
  mana: number;
  sanidade: number;
  condicoesAtivas: number;
}

export const FALA_ABERTURA = falas.abertura;
export const FALAS_ANALISE: string[] = Object.values(falas);

const plural = (quantidade: number, singular: string, pluralTexto: string) => (
  `${quantidade} ${quantidade === 1 ? singular : pluralTexto}`
);

const somar = (pendencias: EntradaAnalise['pendencias'], prefixo: string) => pendencias
  .filter((item) => item.id === prefixo || item.id.startsWith(`${prefixo}:`))
  .reduce((total, item) => total + item.quantidade, 0);

const ORDEM: Record<GravidadeAnalise, number> = { urgente: 0, atencao: 1, info: 2 };

export function analisarFicha(entrada: EntradaAnalise): ObservacaoAnalise[] {
  const observacoes: ObservacaoAnalise[] = [];
  const arred = (valor: number) => Math.max(0, Math.round(valor));

  if (entrada.vida <= 25) {
    observacoes.push({ id: 'vida', fala: falas.vidaCritica, detalhe: `Vida em ${arred(entrada.vida)}% do máximo.`, gravidade: 'urgente', aba: 'Descanso' });
  } else if (entrada.vida <= 50) {
    observacoes.push({ id: 'vida', fala: falas.vidaBaixa, detalhe: `Vida em ${arred(entrada.vida)}% do máximo.`, gravidade: 'atencao', aba: 'Descanso' });
  }
  if (entrada.sanidade <= 40) {
    observacoes.push({ id: 'sanidade', fala: falas.sanidadeBaixa, detalhe: `Sanidade em ${arred(entrada.sanidade)}% do máximo.`, gravidade: entrada.sanidade <= 20 ? 'urgente' : 'atencao', aba: 'Descanso' });
  }
  if (entrada.mana <= 25) {
    observacoes.push({ id: 'mana', fala: falas.manaBaixa, detalhe: `Mana em ${arred(entrada.mana)}% do máximo.`, gravidade: 'atencao', aba: 'Descanso' });
  }
  if (entrada.condicoesAtivas > 0) {
    observacoes.push({ id: 'condicoes', fala: falas.condicoes, detalhe: plural(entrada.condicoesAtivas, 'condição ativa.', 'condições ativas.'), gravidade: 'atencao', aba: 'Descanso' });
  }

  const poderes = somar(entrada.pendencias, 'poder');
  if (poderes > 0) observacoes.push({ id: 'poderes', fala: falas.poderes, detalhe: `${plural(poderes, 'vaga aberta', 'vagas abertas')} na aba Progressão.`, gravidade: 'info', aba: 'Progressão' });
  const legados = somar(entrada.pendencias, 'legados');
  if (legados > 0) observacoes.push({ id: 'legado', fala: falas.legado, detalhe: `${plural(legados, 'vaga aberta', 'vagas abertas')} na aba Progressão.`, gravidade: 'info', aba: 'Progressão' });
  const escolhas = somar(entrada.pendencias, 'escolha');
  if (escolhas > 0) observacoes.push({ id: 'escolhas', fala: falas.escolhas, detalhe: `${plural(escolhas, 'escolha aberta', 'escolhas abertas')} na aba Progressão.`, gravidade: 'info', aba: 'Progressão' });
  const atributos = somar(entrada.pendencias, 'atributos-raciais');
  if (atributos > 0) observacoes.push({ id: 'atributos', fala: falas.atributos, detalhe: `${plural(atributos, 'aumento', 'aumentos')} de atributo na aba Progressão.`, gravidade: 'info', aba: 'Progressão' });

  if (!observacoes.length) {
    return [{ id: 'nada', fala: falas.nada, detalhe: 'Vida, mana, sanidade e escolhas de progressão estão em dia.', gravidade: 'info' }];
  }
  return observacoes.sort((a, b) => ORDEM[a.gravidade] - ORDEM[b.gravidade]);
}
