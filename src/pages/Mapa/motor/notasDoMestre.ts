// Notas que só o Mestre vê, num token, numa cena ou num mapa colocado (descrição, lembretes, segredos).
// O texto mora no servidor, que só o entrega a quem comanda a mesa (core/mapa.py, visao_token e _resumo_cena):
// aqui ficam só as contas que não dependem da tela.

/** O mesmo teto do servidor (NOTA_MAXIMA em plataforma/core/mapa.py); um teste trava os dois. */
export const NOTA_MAXIMA = 4000;

/** Há texto na nota (só espaço e quebra de linha não conta). */
export const temNota = (texto: string | null | undefined): boolean => typeof texto === 'string' && texto.trim().length > 0;

/** O começo da nota numa linha só, para a dica de um botão: quebras viram espaço e o que passa do limite vira reticências. */
export function resumoDaNota(texto: string | null | undefined, limite = 60): string {
  const limpo = (texto ?? '').replace(/\s+/g, ' ').trim();
  if (limpo.length <= limite) return limpo;
  return `${limpo.slice(0, Math.max(1, limite - 1)).trimEnd()}…`;
}
