/** A identidade visual de cada facção: uma cor e a forma do brasão. É só apresentação, por isso mora aqui
 * e não no JSON da lore. Facção sem entrada cai no dourado padrão das facções. */

export type FormaDeBrasao = 'escudo' | 'circulo' | 'hexagono' | 'losango' | 'arco' | 'pontas' | 'octogono' | 'gota' | 'cunha';

export interface IIdentidadeFaccao {
  /** Cor em `r,g,b`. */
  rgb: string;
  forma: FormaDeBrasao;
}

export const IDENTIDADES_DE_FACCAO: Record<string, IIdentidadeFaccao> = {
  'banco-lunar': { rgb: '204,212,232', forma: 'circulo' },
  'astratech': { rgb: '104,122,255', forma: 'hexagono' },
  'caravana-do-limiar': { rgb: '196,142,88', forma: 'arco' },
  'vigilia-das-raizes': { rgb: '92,176,98', forma: 'escudo' },
  'arquivo-prismatico': { rgb: '206,106,224', forma: 'losango' },
  'guilda-dos-cacadores': { rgb: '208,92,56', forma: 'pontas' },
  'casa-das-linguas': { rgb: '52,190,172', forma: 'octogono' },
  'sociedade-do-sino': { rgb: '236,212,104', forma: 'gota' },
  'ordem-do-lume': { rgb: '250,160,72', forma: 'circulo' },
  'a-ordem': { rgb: '140,124,112', forma: 'cunha' },
  'culto-carmesim': { rgb: '158,66,134', forma: 'pontas' },
  'colhedores-do-eden': { rgb: '170,206,70', forma: 'gota' },
};

export const identidadeDe = (id: string): IIdentidadeFaccao | undefined => IDENTIDADES_DE_FACCAO[id];

/** O contorno de cada forma, numa caixa de 100 por 120. */
export const CAMINHO_DA_FORMA: Record<FormaDeBrasao, string> = {
  escudo: 'M50 4 L94 18 V58 C94 88 72 108 50 116 C28 108 6 88 6 58 V18 Z',
  circulo: 'M50 6 A46 46 0 1 1 49.99 6 Z',
  hexagono: 'M50 4 L92 28 V92 L50 116 L8 92 V28 Z',
  losango: 'M50 2 L96 60 L50 118 L4 60 Z',
  arco: 'M10 116 V50 C10 20 30 4 50 4 C70 4 90 20 90 50 V116 Z',
  pontas: 'M8 16 L29 4 L50 16 L71 4 L92 16 V58 C92 88 72 108 50 116 C28 108 8 88 8 58 Z',
  octogono: 'M34 4 H66 L96 34 V86 L66 116 H34 L4 86 V34 Z',
  gota: 'M50 4 C50 4 92 50 92 78 C92 100 74 116 50 116 C26 116 8 100 8 78 C8 50 50 4 50 4 Z',
  cunha: 'M8 8 H92 V62 L50 116 L8 62 Z',
};

export const FORMA_PADRAO: FormaDeBrasao = 'escudo';
