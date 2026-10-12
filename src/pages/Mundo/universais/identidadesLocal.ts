/** A identidade visual de cada local de fábrica: cor, ícone do medalhão e o padrão que decora o cabeçalho da ficha.
 * A sede de uma facção usa a cor da facção, para o olho ligar os dois. Local sem entrada cai no verde padrão da seção. */

export type IconeDeLocal =
  | 'banco' | 'castelo' | 'rotas' | 'torre' | 'biblioteca' | 'portas' | 'sino' | 'lamparina' | 'armazem' | 'casa' | 'pomar' | 'lua' | 'farol' | 'circuito';

export type PadraoDeLocal = 'raios' | 'aneis' | 'listras' | 'colunas' | 'grade' | 'ondas' | 'pontos';

export interface IIdentidadeLocal {
  /** Cor em `r,g,b`. */
  rgb: string;
  icone: IconeDeLocal;
  padrao: PadraoDeLocal;
}

export const IDENTIDADES_DE_LOCAL: Record<string, IIdentidadeLocal> = {
  'banco-lunar': { rgb: '204,212,232', icone: 'banco', padrao: 'raios' },
  'sonhar-entre-as-arvores': { rgb: '170,150,255', icone: 'lua', padrao: 'ondas' },
  'pharos': { rgb: '208,92,56', icone: 'farol', padrao: 'raios' },
  'patio-das-rotas': { rgb: '196,142,88', icone: 'rotas', padrao: 'listras' },
  'agulha': { rgb: '92,176,98', icone: 'torre', padrao: 'colunas' },
  'acervo-prismatico': { rgb: '206,106,224', icone: 'biblioteca', padrao: 'grade' },
  'salao-das-treze-portas': { rgb: '52,190,172', icone: 'portas', padrao: 'raios' },
  'campanario': { rgb: '236,212,104', icone: 'sino', padrao: 'aneis' },
  'casa-do-primeiro-lume': { rgb: '250,160,72', icone: 'lamparina', padrao: 'ondas' },
  'galpoes-do-meio': { rgb: '140,124,112', icone: 'armazem', padrao: 'grade' },
  'casa-vermelha': { rgb: '158,66,134', icone: 'casa', padrao: 'listras' },
  'pomar': { rgb: '170,206,70', icone: 'pomar', padrao: 'pontos' },
  'astraluna-capital': { rgb: '104,122,255', icone: 'circuito', padrao: 'grade' },
};

export const identidadeDeLocal = (id: string): IIdentidadeLocal | undefined => IDENTIDADES_DE_LOCAL[id];
