export interface EventoMoedas {
  chave: number;
  moeda: string;
  /** Positivo: ganhou (chuva). Negativo: gastou (moedas saltam da carteira). */
  delta: number;
  /** Onde fica o saldo na tela, para as moedas saírem dali quando gasta. */
  x?: number;
  y?: number;
}

// Cor de cada moeda (a clara e a de sombra do miolo).
export const PALETA_MOEDA: Record<string, { clara: string; escura: string }> = {
  Lunaris: { clara: '#e2e8f0', escura: '#64748b' },
  Solares: { clara: '#fde68a', escura: '#b45309' },
  'Fragmentos de Estrela': { clara: '#ddd6fe', escura: '#6d28d9' },
  'Créditos Sombrios': { clara: '#fecaca', escura: '#991b1b' },
};

export const paletaDaMoeda = (moeda: string) => PALETA_MOEDA[moeda] ?? PALETA_MOEDA.Lunaris;

/** Quantas moedas cair para esse valor: cresce devagar, para 5.000 não virar
 * 5.000 elementos na tela. */
export const quantidadeDeMoedas = (delta: number) => {
  const tamanho = Math.abs(delta);
  return Math.min(46, Math.max(3, Math.round(3 + Math.log10(tamanho + 1) * 9)));
};

type Ouvinte = (evento: EventoMoedas) => void;

const ouvintes = new Set<Ouvinte>();
let contador = 0;

export const dispararMoedas = (dados: Omit<EventoMoedas, 'chave'>) => {
  contador += 1;
  const evento = { ...dados, chave: contador };
  ouvintes.forEach((ouvinte) => ouvinte(evento));
};

export const inscreverMoedas = (ouvinte: Ouvinte) => {
  ouvintes.add(ouvinte);
  return () => { ouvintes.delete(ouvinte); };
};
