// As contas das formas e da fonte do token, sem React nem Pixi, para testar.

/** A imagem de base conta como a forma 1: o token tem no máximo 8 formas extras, e as teclas vão de 1 a 9. */
export const LIMITE_DE_FORMAS = 9;
export const ROTULO_DA_BASE = 'Imagem de base';

export interface IFonteDoToken {
  limite: number | null;
  usados: number;
}

/** O que a aba diz da fonte: quantas cópias saíram e quantas ainda saem. */
export function textoDaFonte(fonte: IFonteDoToken): string {
  if (fonte.limite === null) return fonte.usados === 0 ? 'Sem limite: nenhuma cópia gerada ainda.' : `Sem limite: ${fonte.usados} ${fonte.usados === 1 ? 'cópia gerada' : 'cópias geradas'}.`;
  const restam = Math.max(0, fonte.limite - fonte.usados);
  if (restam === 0) return `As ${fonte.limite} cópias acabaram. Recarregue a fonte para gerar mais.`;
  return `${fonte.usados} de ${fonte.limite} geradas, restam ${restam}.`;
}

export interface IFormaDoToken {
  id: string;
  nome: string;
}

/**
 * O que a tecla de 1 a 9 faz num token do Mestre: `base` (1), uma forma (2 em diante), `inexistente` (passou das
 * formas que o token tem) ou `nenhuma` (o token não tem forma nenhuma: a tecla não faz nada).
 */
export function teclaDeForma(numero: number, formas: readonly IFormaDoToken[]): { tipo: 'base' } | { tipo: 'forma'; id: string } | { tipo: 'inexistente'; tem: number } | { tipo: 'nenhuma' } {
  if (!formas.length) return { tipo: 'nenhuma' };
  if (numero === 1) return { tipo: 'base' };
  const forma = formas[numero - 2];
  return forma ? { tipo: 'forma', id: forma.id } : { tipo: 'inexistente', tem: formas.length + 1 };
}

/** Uma fonte que ainda pode gerar cópia (sem limite, ou com cópias sobrando). */
export function fonteComCopias(fonte: IFonteDoToken | null | undefined): boolean {
  return Boolean(fonte) && (fonte!.limite === null || fonte!.usados < fonte!.limite);
}
