// Onde fica a barra colada a um objeto: logo abaixo dele, centrada, sem sair da área do mapa e sem cobrir a barra do
// Acervo. Sem React, para testar.

export interface Retangulo {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A folga entre o objeto e a barra, e entre a barra e a borda da área, em px. */
export const FOLGA_DA_BARRA = 12;
const MARGEM = 8;

/**
 * `objeto` é o retângulo do mapa ou do token na tela (nulo se não está na cena). Devolve o canto de cima à esquerda
 * da barra. Se não há lugar embaixo do objeto, a barra sobe até o limite de baixo da área (menos a reserva); só vai
 * para cima do objeto quando ele está tão embaixo que nem isso deixa espaço (a barra nunca fica fora da área).
 */
export function posicaoDaBarra(
  objeto: Retangulo | null,
  area: { largura: number; altura: number },
  barra: { largura: number; altura: number },
  reservaEmbaixo = 0,
): { x: number; y: number } {
  const limiteBaixo = Math.max(MARGEM, area.altura - barra.altura - reservaEmbaixo);
  const limiteDireita = Math.max(MARGEM, area.largura - barra.largura - MARGEM);
  if (!objeto) return { x: Math.max(MARGEM, (area.largura - barra.largura) / 2), y: limiteBaixo };
  const centro = objeto.x + objeto.w / 2;
  let y = objeto.y + objeto.h + FOLGA_DA_BARRA;
  // Embaixo do objeto não cabe. Objeto pequeno e inteiro na tela: a barra vai para cima dele. Objeto grande, que passa
  // do fundo da tela: a barra cola no limite de baixo, em cima dele (onde o Mestre costuma querer).
  if (y > limiteBaixo) {
    const inteiroNaTela = objeto.y + objeto.h <= area.altura;
    const acima = objeto.y - barra.altura - FOLGA_DA_BARRA;
    y = inteiroNaTela && acima >= MARGEM ? acima : limiteBaixo;
  }
  const x = Math.min(Math.max(MARGEM, centro - barra.largura / 2), limiteDireita);
  return { x, y: Math.min(Math.max(MARGEM, y), limiteBaixo) };
}
