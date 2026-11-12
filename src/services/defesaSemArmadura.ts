/**
 * Defesa de quem luta sem armadura (Guarda Aberta do Lutador, 2026-11-12).
 *
 * Desde 2026-11-11 o golpe das criaturas conta a armadura típica do nível
 * (ajusteDeArmadura da curva). Sem armadura, o Lutador passava a ser acertado
 * 95% das vezes do nível 15 em diante. A escada abaixo é a mesma armadura
 * típica do nível (mediana dos modelos da faixa liberada mais a raridade que o
 * nível costuma pagar), então quem luta sem armadura empata com quem veste.
 */

/** [nível total mínimo, bônus de Defesa], do maior para o menor. */
export const ESCADA_DEFESA_SEM_ARMADURA: ReadonlyArray<readonly [number, number]> = [
  [25, 24],
  [15, 15],
  [10, 8],
  [5, 5],
  [1, 2],
];

/** Classes cuja habilidade dá a Guarda Aberta. */
export const CLASSES_COM_GUARDA_ABERTA: readonly string[] = ['lutador'];

export function defesaSemArmadura(nivelTotal: number): number {
  const nivel = Math.max(1, Math.trunc(Number(nivelTotal) || 1));
  return ESCADA_DEFESA_SEM_ARMADURA.find(([minimo]) => nivel >= minimo)?.[1] ?? 0;
}
