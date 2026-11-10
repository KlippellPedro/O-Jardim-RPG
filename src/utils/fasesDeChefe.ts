/**
 * Como uma fase de chefe começa (plataforma/core/fases.py): pela Vida, pela rodada
 * do combate, pelas duas (vale a que chegar primeiro) ou só pela mão do Mestre.
 * A Sessão, o Bestiário e o Mundo escrevem o gatilho com estas duas funções.
 */
export interface GatilhoDeFase {
  quando: number | null;
  rodada?: number | null;
}

const porcentagem = (quando: number | null | undefined) => (quando != null && quando > 0 ? Math.round(quando * 100) : null);
const rodadaValida = (rodada: number | null | undefined) => (rodada != null && rodada > 0 ? rodada : null);

/** "a partir de 50% da Vida", "na rodada 6", os dois ligados por "ou", ou "só pelo Mestre". */
export function gatilhoDaFase({ quando, rodada }: GatilhoDeFase): string {
  const partes: string[] = [];
  const vida = porcentagem(quando);
  const marco = rodadaValida(rodada);
  if (vida != null) partes.push(`a partir de ${vida}% da Vida`);
  if (marco != null) partes.push(`na rodada ${marco}`);
  return partes.length ? partes.join(' ou ') : 'só pelo Mestre';
}

/** Para o botão do editor: "50%", "rodada 6", "50% ou rodada 6", ou vazio na fase manual. */
export function gatilhoCurto({ quando, rodada }: GatilhoDeFase): string {
  const partes: string[] = [];
  const vida = porcentagem(quando);
  const marco = rodadaValida(rodada);
  if (vida != null) partes.push(`${vida}%`);
  if (marco != null) partes.push(`rodada ${marco}`);
  return partes.join(' ou ');
}
