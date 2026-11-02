// Remover fundo (MODNet) e melhorar qualidade (Real-ESRGAN), no navegador.
// Medidos na fase 0 (docs/propostas/mapa-ao-vivo/FASE0.md): o MODNet só sai
// certo sem a placa de vídeo (no WebGPU do ONNX Runtime 1.31 vira manchas);
// o Real-ESRGAN roda certo e rápido no WebGPU.

import { carregarOrt, sessaoDoModelo, URL_ESRGAN, URL_MODNET, type AoProgresso } from './modelos';

type Fonte = ImageBitmap | OffscreenCanvas;

function contexto(tela: OffscreenCanvas): OffscreenCanvasRenderingContext2D {
  return tela.getContext('2d', { willReadFrequently: true })!;
}

/** Tamanho que o MODNet espera: lado menor 512, os dois lados múltiplos de 32. */
export function tamanhoParaModnet(largura: number, altura: number): { largura: number; altura: number } {
  const escala = 512 / Math.min(largura, altura);
  const arredondar = (valor: number) => Math.max(32, Math.round((valor * escala) / 32) * 32);
  return { largura: arredondar(largura), altura: arredondar(altura) };
}

/** Devolve a transparência (0 a 255) de cada pixel da imagem: o recorte do que é frente. */
export async function removerFundo(imagem: Fonte, aoProgresso?: AoProgresso): Promise<Uint8ClampedArray> {
  const biblioteca = await carregarOrt();
  const sessao = await sessaoDoModelo(URL_MODNET, 'o recorte (26 MB)', ['wasm'], aoProgresso);
  aoProgresso?.('Recortando...');
  const { largura: w, altura: h } = tamanhoParaModnet(imagem.width, imagem.height);
  const reduzida = new OffscreenCanvas(w, h);
  const ctx = contexto(reduzida);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(imagem, 0, 0, w, h);
  const pixels = ctx.getImageData(0, 0, w, h).data;
  const entrada = new Float32Array(3 * w * h);
  for (let i = 0; i < w * h; i++) {
    entrada[i] = pixels[i * 4] / 127.5 - 1;
    entrada[w * h + i] = pixels[i * 4 + 1] / 127.5 - 1;
    entrada[2 * w * h + i] = pixels[i * 4 + 2] / 127.5 - 1;
  }
  const saida = await sessao.run({ [sessao.inputNames[0]]: new biblioteca.Tensor('float32', entrada, [1, 3, h, w]) });
  const matte = saida[sessao.outputNames[0]].data as Float32Array;

  // O recorte sai no tamanho reduzido; o navegador amplia de volta, suavizando a borda.
  const mascara = new OffscreenCanvas(w, h);
  const dadosMascara = new ImageData(w, h);
  for (let i = 0; i < w * h; i++) {
    dadosMascara.data[i * 4 + 3] = Math.max(0, Math.min(255, Math.round(matte[i] * 255)));
  }
  contexto(mascara).putImageData(dadosMascara, 0, 0);
  const cheia = new OffscreenCanvas(imagem.width, imagem.height);
  const ctxCheia = contexto(cheia);
  ctxCheia.imageSmoothingQuality = 'high';
  ctxCheia.drawImage(mascara, 0, 0, imagem.width, imagem.height);
  const ampliada = ctxCheia.getImageData(0, 0, imagem.width, imagem.height).data;
  const alfa = new Uint8ClampedArray(imagem.width * imagem.height);
  for (let i = 0; i < alfa.length; i++) alfa[i] = ampliada[i * 4 + 3];
  aoProgresso?.('Fundo removido.', 1);
  return alfa;
}

const PEDACO = 256;
const BORDA = 8;
export const LADO_MAXIMO_MELHORADO = 16384;

/** Amplia 2x ou 4x com o Real-ESRGAN, pedaço por pedaço (a memória não estoura em mapa grande). */
export async function melhorarQualidade(imagem: Fonte, escala: 2 | 4, aoProgresso?: AoProgresso): Promise<OffscreenCanvas> {
  const W = imagem.width;
  const H = imagem.height;
  if (Math.max(W, H) * escala > LADO_MAXIMO_MELHORADO) {
    throw new Error(`O resultado passaria de ${LADO_MAXIMO_MELHORADO} px. Use 2x ou uma imagem menor.`);
  }
  const biblioteca = await carregarOrt();
  const sessao = await sessaoDoModelo(URL_ESRGAN, 'o melhorador (5 MB)', ['webgpu', 'wasm'], aoProgresso);
  const fonte = new OffscreenCanvas(W, H);
  const ctxFonte = contexto(fonte);
  ctxFonte.drawImage(imagem, 0, 0);
  const saida = new OffscreenCanvas(W * escala, H * escala);
  const ctxSaida = contexto(saida);
  ctxSaida.imageSmoothingQuality = 'high';
  const total = Math.ceil(W / PEDACO) * Math.ceil(H / PEDACO);
  let feitos = 0;
  for (let y0 = 0; y0 < H; y0 += PEDACO) {
    for (let x0 = 0; x0 < W; x0 += PEDACO) {
      const x1 = Math.max(0, x0 - BORDA);
      const y1 = Math.max(0, y0 - BORDA);
      const w = Math.min(W, x0 + PEDACO + BORDA) - x1;
      const h = Math.min(H, y0 + PEDACO + BORDA) - y1;
      const px = ctxFonte.getImageData(x1, y1, w, h).data;
      const tensor = new Float32Array(3 * w * h);
      for (let i = 0; i < w * h; i++) {
        tensor[i] = px[i * 4] / 255;
        tensor[w * h + i] = px[i * 4 + 1] / 255;
        tensor[2 * w * h + i] = px[i * 4 + 2] / 255;
      }
      const resultado = await sessao.run({ [sessao.inputNames[0]]: new biblioteca.Tensor('float32', tensor, [1, 3, h, w]) });
      const dados = resultado[sessao.outputNames[0]].data as Float32Array;
      const ow = w * 4;
      const oh = h * 4;
      // Só o miolo do pedaço (sem a borda de emenda) vai para o resultado.
      const cw = Math.min(PEDACO, W - x0) * 4;
      const ch = Math.min(PEDACO, H - y0) * 4;
      const miolo = new ImageData(cw, ch);
      const ix = (x0 - x1) * 4;
      const iy = (y0 - y1) * 4;
      for (let yy = 0; yy < ch; yy++) {
        for (let xx = 0; xx < cw; xx++) {
          const s = (iy + yy) * ow + ix + xx;
          const d = (yy * cw + xx) * 4;
          miolo.data[d] = dados[s] * 255;
          miolo.data[d + 1] = dados[oh * ow + s] * 255;
          miolo.data[d + 2] = dados[2 * oh * ow + s] * 255;
          miolo.data[d + 3] = 255;
        }
      }
      const pedaco = new OffscreenCanvas(cw, ch);
      contexto(pedaco).putImageData(miolo, 0, 0);
      ctxSaida.drawImage(pedaco, x0 * escala, y0 * escala, (cw / 4) * escala, (ch / 4) * escala);
      feitos++;
      aoProgresso?.(`Melhorando: ${feitos} de ${total} pedaços`, feitos / total);
    }
  }
  return saida;
}
