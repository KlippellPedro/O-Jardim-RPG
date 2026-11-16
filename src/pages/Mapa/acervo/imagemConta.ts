// Contas de imagem do Acervo (tamanho de token, escala do melhorador, cor sob a transparência). Sem React, rede
// nem tela, para testar.

import type { TipoItemAcervo } from '../../../services/acervoApi';

/** O maior lado de um token no Acervo: o que o servidor entrega inteiro ao mapa (um ladrilho só). Imagem maior vira miniatura. */
export const LADO_MAXIMO_DO_TOKEN = 1024;

/** O maior lado que o melhorador aceita no resultado (o mesmo de oficina/processar.ts). */
export const LADO_MAXIMO_DO_RESULTADO = 16384;

export type EscalaDeMelhoria = 2 | 4;

/** Tamanho que a imagem teria ao caber em `ladoMaximo` (nunca aumenta). */
export function tamanhoQueCabe(largura: number, altura: number, ladoMaximo: number): { largura: number; altura: number } {
  const escala = Math.min(1, ladoMaximo / Math.max(largura, altura, 1));
  return { largura: Math.max(1, Math.round(largura * escala)), altura: Math.max(1, Math.round(altura * escala)) };
}

/** O resultado do melhorador passaria do limite de tamanho? */
export function cabeNoMelhorador(largura: number, altura: number, escala: EscalaDeMelhoria, limite = LADO_MAXIMO_DO_RESULTADO): boolean {
  return Math.max(largura, altura) * escala <= limite;
}

/**
 * Qual escala oferecer: 4x para a imagem pequena, 2x para a média, nenhuma para a que já é grande. Token acima de
 * meio ladrilho já passa do que o mapa usa, então não ganha com a ampliação.
 */
export function escalaSugerida(largura: number, altura: number, tipo: TipoItemAcervo): EscalaDeMelhoria | null {
  const maior = Math.max(largura, altura);
  if (tipo === 'token') {
    if (maior * 2 <= LADO_MAXIMO_DO_TOKEN) return maior * 4 <= LADO_MAXIMO_DO_TOKEN ? 4 : 2;
    return null;
  }
  if (maior <= 1200 && cabeNoMelhorador(largura, altura, 4)) return 4;
  if (maior <= 3000 && cabeNoMelhorador(largura, altura, 2)) return 2;
  return null;
}

/** O token tem mais pixels do que o mapa entrega inteiro? (O resto vira miniatura no mapa, então vale enxugar.) */
export function tokenGrandeDemais(largura: number, altura: number): boolean {
  return Math.max(largura, altura) > LADO_MAXIMO_DO_TOKEN;
}

/** A imagem tem algum pixel que não é totalmente opaco? */
export function temTransparencia(pixels: Uint8ClampedArray): boolean {
  for (let i = 3; i < pixels.length; i += 4) if (pixels[i] < 255) return true;
  return false;
}

/**
 * Pinta o RGB dos pixels transparentes (e quase) com a cor de quem está perto, até `voltas` pixels para fora do
 * desenho. O arquivo guarda cor "suja" (preta, em geral) sob a transparência, e o melhorador a puxaria para a borda,
 * deixando um contorno escuro. Muda `pixels` no lugar; o alfa não é tocado.
 */
export function espalharCorDaBorda(pixels: Uint8ClampedArray, largura: number, altura: number, voltas = 4): void {
  const conhecido = new Uint8Array(largura * altura);
  for (let i = 0; i < conhecido.length; i++) conhecido[i] = pixels[i * 4 + 3] >= 200 ? 1 : 0;
  for (let volta = 0; volta < voltas; volta++) {
    const novos: Array<[number, number, number, number]> = [];
    for (let y = 0; y < altura; y++) {
      for (let x = 0; x < largura; x++) {
        const i = y * largura + x;
        if (conhecido[i]) continue;
        let r = 0;
        let g = 0;
        let b = 0;
        let n = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const vx = x + dx;
            const vy = y + dy;
            if (vx < 0 || vy < 0 || vx >= largura || vy >= altura) continue;
            const j = vy * largura + vx;
            if (!conhecido[j]) continue;
            r += pixels[j * 4];
            g += pixels[j * 4 + 1];
            b += pixels[j * 4 + 2];
            n++;
          }
        }
        if (n) novos.push([i, Math.round(r / n), Math.round(g / n), Math.round(b / n)]);
      }
    }
    if (!novos.length) break;
    for (const [i, r, g, b] of novos) {
      pixels[i * 4] = r;
      pixels[i * 4 + 1] = g;
      pixels[i * 4 + 2] = b;
      conhecido[i] = 1;
    }
  }
}

/** Os limites do desenho (onde o alfa passa de `limiar`), com uma margem; sem nada visível, a imagem inteira. */
export function caixaDoDesenho(
  pixels: Uint8ClampedArray,
  largura: number,
  altura: number,
  margem = 0,
  limiar = 8,
): { x: number; y: number; largura: number; altura: number } {
  let esquerda = largura;
  let direita = -1;
  let cima = altura;
  let baixo = -1;
  for (let y = 0; y < altura; y++) {
    for (let x = 0; x < largura; x++) {
      if (pixels[(y * largura + x) * 4 + 3] <= limiar) continue;
      if (x < esquerda) esquerda = x;
      if (x > direita) direita = x;
      if (y < cima) cima = y;
      if (y > baixo) baixo = y;
    }
  }
  if (direita < 0) return { x: 0, y: 0, largura, altura };
  const x = Math.max(0, esquerda - margem);
  const y = Math.max(0, cima - margem);
  return { x, y, largura: Math.min(largura, direita + 1 + margem) - x, altura: Math.min(altura, baixo + 1 + margem) - y };
}
