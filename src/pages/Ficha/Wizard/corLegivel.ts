/** Garante que a cor de um emblema se lê sobre o fundo escuro do assistente: classes e raças de paleta muito escura
 * (o Ninja, por exemplo) ganham um pouco de branco até passar de um mínimo de luminosidade. */

export interface Rgb { r: number; g: number; b: number }

export function lerCor(cor: string): Rgb | null {
  const texto = cor.trim();
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(texto);
  if (hex) {
    const digitos = hex[1].length === 3 ? hex[1].split('').map((c) => c + c).join('') : hex[1];
    return { r: parseInt(digitos.slice(0, 2), 16), g: parseInt(digitos.slice(2, 4), 16), b: parseInt(digitos.slice(4, 6), 16) };
  }
  const funcao = /^rgba?\(\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*[, ]\s*(\d{1,3})/i.exec(texto);
  if (funcao) return { r: Number(funcao[1]), g: Number(funcao[2]), b: Number(funcao[3]) };
  return null;
}

const linear = (canal: number) => {
  const c = canal / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

/** Luminância relativa (WCAG), de 0 (preto) a 1 (branco). */
export const luminancia = ({ r, g, b }: Rgb): number => 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);

const misturarComBranco = ({ r, g, b }: Rgb, parte: number): Rgb => ({
  r: Math.round(r + (255 - r) * parte),
  g: Math.round(g + (255 - g) * parte),
  b: Math.round(b + (255 - b) * parte),
});

export const comoRgb = ({ r, g, b }: Rgb, alfa?: number): string => (
  alfa === undefined ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${alfa})`
);

/** A cor, clareada só o necessário para atingir `minimo` de luminância. Cor que já se lê (ou que não dá para
 * interpretar) volta como veio. */
export function corLegivel(cor: string, minimo = 0.16): { cor: string; rgb: Rgb | null; mudou: boolean } {
  const rgb = lerCor(cor);
  if (!rgb) return { cor, rgb: null, mudou: false };
  if (luminancia(rgb) >= minimo) return { cor, rgb, mudou: false };
  let parte = 0;
  let atual = rgb;
  while (parte < 1 && luminancia(atual) < minimo) {
    parte = Math.min(1, parte + 0.05);
    atual = misturarComBranco(rgb, parte);
  }
  return { cor: comoRgb(atual), rgb: atual, mudou: true };
}
