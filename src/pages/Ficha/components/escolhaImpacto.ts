export type TipoEscolhaImpacto = 'raca' | 'classe';

export interface EscolhaImpacto {
  chave: number;
  tipo: TipoEscolhaImpacto;
  id: string;
  nome: string;
  /** Raça ou classe fora da categoria "padrao": ganha a cena completa. */
  especial: boolean;
}

type Ouvinte = (escolha: EscolhaImpacto) => void;

const ouvintes = new Set<Ouvinte>();
let contador = 0;

// Frase curta da cena das raças e classes especiais. Só evoca o que a
// descrição do catálogo já diz; não cria regra nem lore novo.
const FRASES_ESPECIAIS: Record<string, string> = {
  elfo: 'Séculos de leitura despertam em você',
  desperto: 'Arkarin te devolveu, e o fragmento ainda vibra',
  auleth: 'Uma consciência de fora escolheu este corpo',
  automato: 'Núcleo próprio, vontade própria',
  clone: 'Você tem o rosto de outro, e sabe disso',
  anomalia: 'Você atravessou de uma outra história',
  amalgamo: 'Várias criaturas, um único corpo',
  bruxa: 'A magia te escolheu e não se devolve',
  onirico: 'Você nasceu em Sonhar',
  divino: 'O sangue dos céus desperta',
  entidade: 'Um conceito toma forma',
  'campeao-dimensional': 'Você supera os limites da própria dimensão',
  'pirata-amaldicoado': 'A tripulação que morreu responde ao seu chamado',
  'cartista-arcano': 'O baralho decide o que você tem em mãos',
  'guia-dimensional': 'Onde não existe estrada, você abre caminho',
  'cacador-das-almas': 'Sua alma se vincula à lâmina',
  'escritor-de-contos': 'O que você conta tende a acontecer',
  invocador: 'Você nunca luta sozinho',
  'viajante-classe': 'Cada estrada ensina você a se virar',
  interceptador: 'Você entra na Malha e derruba a magia alheia',
  devorador: 'O poder dos mortos passa a ser seu',
  elementarista: 'Um elemento primordial reconhece você',
};

export const obterFraseEscolha = (escolha: EscolhaImpacto): string => {
  if (escolha.especial && FRASES_ESPECIAIS[escolha.id]) return FRASES_ESPECIAIS[escolha.id];
  return escolha.tipo === 'raca' ? 'Raça escolhida' : 'Classe escolhida';
};

export const dispararEscolhaImpacto = (dados: Omit<EscolhaImpacto, 'chave'>) => {
  contador += 1;
  const escolha = { ...dados, chave: contador };
  ouvintes.forEach((ouvinte) => ouvinte(escolha));
};

export const inscreverEscolhaImpacto = (ouvinte: Ouvinte) => {
  ouvintes.add(ouvinte);
  return () => { ouvintes.delete(ouvinte); };
};
