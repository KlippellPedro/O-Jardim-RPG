export type TipoAvisoRelampago = 'loot' | 'conquista' | 'suaVez';

// Loot (carta que vira), conquista (faixa que desce) e "é sua vez" (flash
// dourado) disputam a mesma tela. Antes, cada um tocava som e aparecia por
// conta própria; se dois chegassem juntos, brigavam por atenção. Aqui só um
// tipo por vez tem "a vez": os outros esperam na fila em vez de se atropelar.
const fila: TipoAvisoRelampago[] = [];
let ativo: TipoAvisoRelampago | null = null;
const ouvintes = new Set<() => void>();

const notificar = () => ouvintes.forEach((ouvinte) => ouvinte());

/** Pede a vez para o tipo. Ganha na hora se ninguém está com a vez; senão espera. */
export function entrarNaFilaDeVez(tipo: TipoAvisoRelampago): void {
  if (ativo === tipo || fila.includes(tipo)) return;
  if (ativo === null) ativo = tipo;
  else fila.push(tipo);
  notificar();
}

/** Larga a vez (ou desiste da fila) quando o tipo não tem mais nada para mostrar. */
export function sairDaFilaDeVez(tipo: TipoAvisoRelampago): void {
  const indice = fila.indexOf(tipo);
  if (indice >= 0) fila.splice(indice, 1);
  if (ativo !== tipo) return;
  ativo = fila.shift() ?? null;
  notificar();
}

export function estaNaVez(tipo: TipoAvisoRelampago): boolean {
  return ativo === tipo;
}

export function inscreverVez(ouvinte: () => void): () => void {
  ouvintes.add(ouvinte);
  return () => { ouvintes.delete(ouvinte); };
}
