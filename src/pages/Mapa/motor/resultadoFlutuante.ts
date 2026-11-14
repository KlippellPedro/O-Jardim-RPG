// O resultado de um dado subindo sobre o token de quem rolou, na tela de todos: o número, e "CRÍTICO!" ou "FALHA!" quando o
// d20 natural foi 20 ou 1. Só conta, sem Pixi nem React, para testar; o desenho está em numerosFlutuantes.ts.
// Nada aqui diz se o número passou ou não da Defesa ou da DT: quem diz o que o número significa é o Mestre.

export type TomDoResultado = 'normal' | 'critico' | 'falha' | 'dano' | 'cura';

export interface IResultadoFlutuante {
  texto: string;
  selo: string | null;
  tom: TomDoResultado;
}

export const COR_DO_RESULTADO: Readonly<Record<TomDoResultado, string>> = {
  normal: '#f8fafc',
  critico: '#fcd34d',
  falha: '#f87171',
  dano: '#fb923c',
  cura: '#4ade80',
};

interface IDetalhesDoDado {
  total?: unknown;
  critico_natural?: unknown;
  falha_natural?: unknown;
  termos?: unknown;
}

/** O que mostrar sobre o token a partir dos detalhes do dado (os mesmos do dado da mesa e do registro de quem rolou). */
export function resultadoFlutuante(tipo: string, detalhes: IDetalhesDoDado | null | undefined): IResultadoFlutuante | null {
  if (!detalhes || typeof detalhes !== 'object') return null;
  const total = Number(detalhes.total);
  if (!Number.isFinite(total)) return null;
  const texto = String(Math.trunc(total));
  if (tipo === 'cura') return { texto: `+${texto}`, selo: 'cura', tom: 'cura' };
  if (tipo === 'dano' || Array.isArray(detalhes.termos)) return { texto, selo: 'dano', tom: 'dano' };
  if (detalhes.critico_natural === true) return { texto, selo: 'CRÍTICO!', tom: 'critico' };
  if (detalhes.falha_natural === true) return { texto, selo: 'FALHA!', tom: 'falha' };
  return { texto, selo: null, tom: 'normal' };
}
