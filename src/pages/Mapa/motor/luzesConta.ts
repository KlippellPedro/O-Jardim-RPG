// Contas das luzes dos tokens, sem o motor (testáveis): o tremor da chama, a fase
// de cada token e quem dá luz. O desenho mora em luzes.ts.

import type { EstiloDeLuz, ILuzToken, ITokenMapa } from '../../../services/mapaApi';

export const ESTILOS_DE_LUZ: readonly EstiloDeLuz[] = ['fixa', 'chama', 'pulsa', 'cintila'];

/** O estilo de uma luz: o guardado, ou, numa luz de antes dos estilos, chama se tremulava e fixa se não. */
export function estiloDaLuz(luz: Pick<ILuzToken, 'tremula' | 'estilo'>): EstiloDeLuz {
  return luz.estilo && ESTILOS_DE_LUZ.includes(luz.estilo) ? luz.estilo : luz.tremula ? 'chama' : 'fixa';
}

export interface FonteDeLuz {
  id: string;
  x: number;
  y: number;
  /** Alcance em px do mapa; null usa o padrão da escuridão (personagem sem luz própria). */
  raio: number | null;
  /** Cor da luz, ou null sem brilho próprio. */
  cor: number | null;
  /** De 0 a pouco mais de 1: o quanto a chama está acesa agora. */
  forca: number;
}

/** O quanto a chama está acesa agora: perto de 1, com tremor rápido e irregular (três ondas que não batem). */
export function tremor(agora: number, fase: number): number {
  const t = agora / 1000;
  return 1 + 0.07 * Math.sin(t * 11.3 + fase) + 0.05 * Math.sin(t * 17.9 + fase * 2.1) + 0.04 * Math.sin(t * 4.7 + fase * 0.7);
}

/**
 * O quanto a luz está acesa agora, por estilo: a chama treme rápido; pulsa respira devagar (uns 3 s por vez);
 * cintila pisca e dá quedas bruscas, como um fogo-fátuo; fixa não mexe. Sempre entre 0,35 e 1,25.
 */
export function forcaDaLuz(estilo: EstiloDeLuz, agora: number, fase: number): number {
  const t = agora / 1000;
  switch (estilo) {
    case 'chama':
      return tremor(agora, fase);
    case 'pulsa':
      return 1 + 0.16 * Math.sin(t * 1.95 + fase) + 0.04 * Math.sin(t * 0.7 + fase * 1.7);
    case 'cintila': {
      const base = 1 + 0.1 * Math.sin(t * 23.1 + fase) + 0.08 * Math.sin(t * 37.7 + fase * 2.3);
      // A queda: quase sempre zero, e de vez em quando a luz quase apaga por um instante.
      const queda = Math.max(0, Math.sin(t * 5.3 + fase * 1.1)) ** 12;
      return Math.max(0.35, base - 0.5 * queda);
    }
    default:
      return 1;
  }
}

/** Uma fase por token, tirada do id: duas tochas lado a lado não tremem iguais. */
export function faseDe(id: string): number {
  let soma = 0;
  for (let i = 0; i < id.length; i++) soma = (soma * 31 + id.charCodeAt(i)) % 100003;
  return (soma / 100003) * Math.PI * 2;
}

export function corDaLuz(cor: string): number {
  return Number.parseInt(cor.replace('#', ''), 16) || 0xffb35c;
}

/** Quem dá luz: o token com luz própria; sem ela, personagem de jogador e aliado ainda abrem a escuridão no alcance padrão. */
export function fonteDoToken(dados: ITokenMapa, x: number, y: number, tamanhoCasa: number, agora: number): FonteDeLuz | null {
  if (dados.luz) {
    const forca = forcaDaLuz(estiloDaLuz(dados.luz), agora, faseDe(dados.id));
    return { id: dados.id, x, y, raio: dados.luz.raio * tamanhoCasa * forca, cor: corDaLuz(dados.luz.cor), forca };
  }
  if (dados.lado === 'jogador' || dados.lado === 'aliado') return { id: dados.id, x, y, raio: null, cor: null, forca: 1 };
  return null;
}
