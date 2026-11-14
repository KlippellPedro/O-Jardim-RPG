// A assinatura de movimento de cada Fluxo nos efeitos de magia do mapa. A cor já vinha do Fluxo; agora o jeito de se mexer
// também: o Anima solta brotos que sobem, o Vazio puxa tudo para dentro, o Baluarte joga estilhaços. O dano de uma magia segue
// o Fluxo dela (Livro de Regras, Magia e Fluxo), então o efeito diz de relance que tipo de golpe é. Só visual: nada aqui muda regra.

import type { FluxoId } from './molduras';

export type EstiloDeEfeito =
  | 'petalas' | 'brilho' | 'ondas' | 'brotos' | 'redemoinho' | 'estilhacos' | 'grade' | 'relogio' | 'implosao' | 'cinzas' | 'pixels';

export const ESTILO_DO_FLUXO: Readonly<Record<FluxoId, EstiloDeEfeito>> = {
  origem: 'petalas',
  essencia: 'brilho',
  comunicacao: 'ondas',
  vitalidade: 'brotos',
  inconstancia: 'redemoinho',
  fisico: 'estilhacos',
  espaco: 'grade',
  tempo: 'relogio',
  vazio: 'implosao',
  fim: 'cinzas',
  tecnologia: 'pixels',
};

export const ESTILOS_DE_EFEITO: readonly EstiloDeEfeito[] = [...new Set(Object.values(ESTILO_DO_FLUXO))];

/** O estilo do Fluxo; um Fluxo desconhecido não ganha extra (só a cor padrão). */
export const estiloDoFluxo = (fluxo: string): EstiloDeEfeito | null => (ESTILO_DO_FLUXO as Record<string, EstiloDeEfeito>)[fluxo] ?? null;

/** Um número repetível entre 0 e 1: o efeito não pisca diferente a cada quadro. */
export const ruidoFixo = (i: number, k = 0): number => {
  const s = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
  return s - Math.floor(s);
};
