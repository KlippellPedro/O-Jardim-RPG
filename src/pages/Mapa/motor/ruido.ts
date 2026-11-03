// Textura de ruído que os shaders do mapa (névoa e clima) leem: três ruídos
// independentes (R, G, B) que emendam nas bordas. Amostrar uma textura é bem
// mais barato que calcular ruído a cada pixel, e esses efeitos cobrem a tela
// inteira. Alfa sempre cheio: assim o navegador não mexe nas cores.
//
// A textura fica viva enquanto a aba estiver aberta, de um palco para o outro:
// é pequena, e destruí-la ao fechar o mapa apagaria a do palco que já está
// nascendo (o React monta a página duas vezes em desenvolvimento).

import { Texture } from 'pixi.js';

let ruido: Texture | null = null;

export function obterRuido(): Texture {
  if (ruido) return ruido;
  const lado = 256;
  const canvas = document.createElement('canvas');
  canvas.width = lado;
  canvas.height = lado;
  const ctx = canvas.getContext('2d')!;
  const imagem = ctx.createImageData(lado, lado);
  const oitavas = [{ celulas: 4, peso: 0.5 }, { celulas: 8, peso: 0.28 }, { celulas: 16, peso: 0.15 }, { celulas: 32, peso: 0.07 }];
  const suave = (t: number) => t * t * (3 - 2 * t);
  for (let canal = 0; canal < 3; canal++) {
    const grades = oitavas.map(({ celulas }) => Array.from({ length: celulas * celulas }, () => Math.random()));
    for (let y = 0; y < lado; y++) {
      for (let x = 0; x < lado; x++) {
        let valor = 0;
        oitavas.forEach(({ celulas, peso }, indice) => {
          const grade = grades[indice];
          const gx = (x / lado) * celulas;
          const gy = (y / lado) * celulas;
          const x0 = Math.floor(gx) % celulas;
          const y0 = Math.floor(gy) % celulas;
          const x1 = (x0 + 1) % celulas;
          const y1 = (y0 + 1) % celulas;
          const tx = suave(gx - Math.floor(gx));
          const ty = suave(gy - Math.floor(gy));
          const cima = grade[y0 * celulas + x0] * (1 - tx) + grade[y0 * celulas + x1] * tx;
          const baixo = grade[y1 * celulas + x0] * (1 - tx) + grade[y1 * celulas + x1] * tx;
          valor += (cima * (1 - ty) + baixo * ty) * peso;
        });
        imagem.data[(y * lado + x) * 4 + canal] = Math.round(Math.max(0, Math.min(1, (valor - 0.5) * 1.6 + 0.5)) * 255);
      }
    }
  }
  for (let i = 3; i < imagem.data.length; i += 4) imagem.data[i] = 255;
  ctx.putImageData(imagem, 0, 0);
  ruido = Texture.from(canvas);
  ruido.source.style.addressMode = 'repeat';
  return ruido;
}
