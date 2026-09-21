/** Teclas do código antigo: cima cima baixo baixo esquerda direita esquerda direita B A. */
export const SEQUENCIA_KONAMI = [
  'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
  'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a',
];

export const PALAVRAS_SECRETAS: Array<{ palavra: string; chave: string }> = [
  { palavra: 'xyzzy', chave: 'palavra_magica' },
  { palavra: 'jardim', chave: 'nome_do_lugar' },
  { palavra: 'lunaris', chave: 'bolso_cheio' },
];

/** Letras entram minúsculas; teclas especiais mantêm o nome. */
export const chaveDaTecla = (tecla: string): string => (tecla.length === 1 ? tecla.toLowerCase() : tecla);

/** As últimas teclas terminam exatamente na sequência? */
export function sequenciaCompleta(teclas: string[], sequencia: string[]): boolean {
  if (teclas.length < sequencia.length) return false;
  const fim = teclas.slice(teclas.length - sequencia.length);
  return sequencia.every((tecla, indice) => fim[indice] === tecla);
}

/** Visita entre 03:00 e 04:59 (hora local de quem olha). */
export const ehMadrugada = (agora: Date): boolean => agora.getHours() >= 3 && agora.getHours() < 5;
