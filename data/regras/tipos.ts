/** Forma de uma página do livro de regras.
 *
 * Vive num módulo sem dependências porque `regras.ts` importa os tópicos que
 * moram em arquivos próprios (crafting, veículos, facções...) e esses arquivos
 * precisam do mesmo tipo: importar de volta de `regras.ts` criaria ciclo.
 * Antes disso, cada módulo mantinha uma cópia da interface, e a cópia
 * inevitavelmente ficou para trás quando `corpoMestre` foi adicionado. */
export interface RegraTopic {
  status: string;
  resumo: string;
  destaques: string[][];
  /** A regra como o jogador precisa dela: o que é, o que faz, como usar. */
  corpo: string;
  /** O mesmo assunto pelo lado de quem conduz: DTs, calibragem, quando puxar
   * o gatilho. Aparece só para o Mestre, no fim da própria página, e nunca
   * entra no arquivo público gerado por tools/generate-public-rules.mjs.
   * Existe para não haver duas versões da mesma regra em páginas separadas,
   * que é como uma delas acaba desatualizada. */
  corpoMestre?: string;
  categoria?: CategoriaRegra;
}

export type CategoriaRegra = 'Livro do Jogador' | 'Combate e Mecânicas' | 'Guia do Mestre';

/** Página que declara a categoria dela, usada pelos tópicos em módulo próprio. */
export type RegraTopicoDe<C extends CategoriaRegra> = RegraTopic & { categoria: C };

export type RegrasCatalog = Record<string, RegraTopic>;
