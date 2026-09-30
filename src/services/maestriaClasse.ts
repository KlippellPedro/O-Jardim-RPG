import maestriaData from '../../data/ficha/maestria-classe.json';

/**
 * Maestria de classe (níveis 21 a 50 de uma classe), lida de
 * data/ficha/maestria-classe.json, o mesmo arquivo que a plataforma lê em
 * plataforma/core/maestria_classe.py. Igual para todas as classes: a cada 5
 * níveis, ou um reforço de recursos (equivale a alguns níveis da própria
 * classe em Vida, Mana e Estamina) ou um grau de perícia.
 */

export type TipoMarcoMaestria = 'bonus_recursos' | 'grau_pericia';

export interface IMarcoMaestria {
  nivel: number;
  tipo: TipoMarcoMaestria;
  titulo: string;
  /** bonus_recursos: quantos níveis da classe o reforço vale em Vida, Mana e Estamina. */
  niveis_equivalentes?: number;
  /** grau_pericia: quantos graus de perícia o marco concede. */
  quantidade?: number;
}

export const MARCOS_MAESTRIA: readonly IMarcoMaestria[] = [...(maestriaData.marcos as IMarcoMaestria[])]
  .sort((a, b) => a.nivel - b.nivel);

const nivelInteiro = (nivel: unknown) => Math.max(0, Math.trunc(Number(nivel) || 0));

/** Marcos já alcançados por uma classe naquele nível. */
export function marcosMaestriaAte(nivelClasse: unknown): IMarcoMaestria[] {
  const alvo = nivelInteiro(nivelClasse);
  return MARCOS_MAESTRIA.filter((marco) => marco.nivel <= alvo);
}

/** Marcos que a classe ganha ao ir de `antes` (fora) até `depois` (dentro). */
export function marcosMaestriaEntre(antes: unknown, depois: unknown): IMarcoMaestria[] {
  const de = nivelInteiro(antes);
  const ate = nivelInteiro(depois);
  return MARCOS_MAESTRIA.filter((marco) => marco.nivel > de && marco.nivel <= ate);
}

/** Próximo marco depois do nível informado, ou null quando a Maestria acabou. */
export function proximoMarcoMaestria(nivelClasse: unknown): IMarcoMaestria | null {
  const alvo = nivelInteiro(nivelClasse);
  return MARCOS_MAESTRIA.find((marco) => marco.nivel > alvo) ?? null;
}

/** Graus de perícia que a Maestria da classe já entregou naquele nível. */
export function grausDeMaestria(nivelClasse: unknown): number {
  return marcosMaestriaAte(nivelClasse)
    .filter((marco) => marco.tipo === 'grau_pericia')
    .reduce((total, marco) => total + Math.max(1, Math.trunc(Number(marco.quantidade) || 1)), 0);
}

/** Níveis "de brinde" em Vida, Mana e Estamina que os reforços de recursos
 * somam ao nível real da classe. */
export function niveisDeReforcoDeRecursos(nivelClasse: unknown): number {
  return marcosMaestriaAte(nivelClasse)
    .filter((marco) => marco.tipo === 'bonus_recursos')
    .reduce((total, marco) => total + Math.max(0, Math.trunc(Number(marco.niveis_equivalentes) || 0)), 0);
}

/** Texto curto do que o marco entrega, para a ficha e o simulador. */
export function descreverMarcoMaestria(marco: IMarcoMaestria): string {
  if (marco.tipo === 'grau_pericia') {
    const quantidade = Math.max(1, Math.trunc(Number(marco.quantidade) || 1));
    return quantidade === 1 ? 'Grau de perícia' : `Grau de perícia (${quantidade}x)`;
  }
  const niveis = Math.max(0, Math.trunc(Number(marco.niveis_equivalentes) || 0));
  return `Reforço de recursos (+${niveis} níveis de Vida, Mana e Estamina)`;
}
