import type { SecaoUniversal } from '../../../services/registrosUniversaisApi';

/** Cada seção dos Registros Universais tem a própria cor. A tela inteira lê `--sec` (e `--sec-rgb`),
 * então trocar a cor aqui repinta navegação, lista, cabeçalho e fichas sem mexer nos componentes. */
export interface ITemaSecao {
  rgb: string;
  /** Linha pequena acima do título da página, no tom da seção. */
  chamada: string;
  /** Nome do ícone (resolvido na página) e o desenho do selo que decora o cabeçalho. */
  selo: 'chama' | 'estrela' | 'brasao' | 'bussola' | 'gema' | 'livro' | 'balao';
}

export const TEMAS: Record<SecaoUniversal, ITemaSecao> = {
  bestiario: { rgb: '232,121,74', chamada: 'O que se encontra no caminho', selo: 'chama' },
  seres: { rgb: '167,139,250', chamada: 'Quem é quem no Jardim', selo: 'estrela' },
  faccoes: { rgb: '224,179,65', chamada: 'Quem move as peças', selo: 'brasao' },
  locais: { rgb: '79,209,165', chamada: 'Onde as coisas acontecem', selo: 'bussola' },
  artefatos: { rgb: '244,114,182', chamada: 'O que vale uma guerra', selo: 'gema' },
  personagens: { rgb: '167,139,250', chamada: 'Quem é quem no Jardim', selo: 'estrela' },
  glossario: { rgb: '201,183,156', chamada: 'As línguas do mundo', selo: 'livro' },
  rumores: { rgb: '159,191,106', chamada: 'O que se diz por aí', selo: 'balao' },
};

/** Variáveis CSS que a página define no elemento raiz. */
export const estiloDaSecao = (secao: SecaoUniversal, corRgb?: string): Record<string, string> => {
  const rgb = corRgb ?? TEMAS[secao].rgb;
  return { '--sec-rgb': rgb, '--sec': `rgb(${rgb})` };
};

/** Aceita "r,g,b" ou "r, g, b"; devolve só números válidos (evita estilo quebrado por dado ruim). */
export const rgbValido = (texto: string | undefined | null): string | undefined => {
  const partes = String(texto ?? '').split(',').map((parte) => Number(parte.trim()));
  return partes.length === 3 && partes.every((parte) => Number.isInteger(parte) && parte >= 0 && parte <= 255) ? partes.join(',') : undefined;
};

/** Converte "#rrggbb" em "r,g,b" (as cores de rank das Entidades vêm em hexadecimal). */
export const hexParaRgb = (hex: string | undefined | null): string | undefined => {
  const limpo = String(hex ?? '').trim().replace(/^#/, '');
  if (!/^[0-9a-fA-F]{6}$/.test(limpo)) return undefined;
  return [0, 2, 4].map((inicio) => parseInt(limpo.slice(inicio, inicio + 2), 16)).join(',');
};
