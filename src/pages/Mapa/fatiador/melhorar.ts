// Melhora a qualidade de uma peça fatiada: o Real-ESRGAN da Oficina (oficina/processar.ts) amplia
// a cor, e a transparência é ampliada à parte (o modelo só enxerga RGB). Roda no PC de quem usa.

import { LADO_MAXIMO_MELHORADO, melhorarQualidade } from '../oficina/processar';
import type { AoProgresso } from '../oficina/modelos';
import { afinarAlfa, preencherCor, type Pixels } from './corte';
import type { EscalaMelhoria } from './escala';

/** O modelo usa uma sessão só: duas peças ao mesmo tempo esperam a vez. */
let fila: Promise<unknown> = Promise.resolve();
function emFila<T>(tarefa: () => Promise<T>): Promise<T> {
  const proxima = fila.then(tarefa, tarefa);
  fila = proxima.catch(() => undefined);
  return proxima;
}

function telaDosPixels(img: Pixels): OffscreenCanvas {
  const tela = new OffscreenCanvas(img.largura, img.altura);
  const dados = new ImageData(img.largura, img.altura);
  dados.data.set(img.dados);
  tela.getContext('2d')!.putImageData(dados, 0, 0);
  return tela;
}

/** A peça ampliada no modo comum (sem o modelo), para comparar com a melhorada. */
export function ampliarSimples(img: Pixels, escala: number): OffscreenCanvas {
  const w = img.largura * escala;
  const h = img.altura * escala;
  const tela = new OffscreenCanvas(w, h);
  const ctx = tela.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(telaDosPixels(img), 0, 0, w, h);
  return tela;
}

export function telaDaPeca(img: Pixels): OffscreenCanvas {
  return telaDosPixels(img);
}

/**
 * Peça `escala` vezes maior, com o detalhe refeito pelo modelo. Peça grande demais para o
 * ampliador volta como estava (nunca falha por tamanho).
 */
export function melhorarPeca(img: Pixels, escala: Exclude<EscalaMelhoria, 1>, aoProgresso?: AoProgresso): Promise<Pixels> {
  return emFila(async () => {
    const lado = Math.max(img.largura, img.altura);
    const alvo = lado * escala > LADO_MAXIMO_MELHORADO ? 2 : escala;
    if (lado * alvo > LADO_MAXIMO_MELHORADO) return img;

    const grande = await melhorarQualidade(telaDosPixels(preencherCor(img)), alvo, aoProgresso);
    const w = img.largura * alvo;
    const h = img.altura * alvo;

    // Só a transparência, ampliada com o filtro do navegador e depois afinada.
    const soAlfa = new ImageData(img.largura, img.altura);
    for (let i = 0; i < img.largura * img.altura; i++) {
      soAlfa.data[i * 4] = 255;
      soAlfa.data[i * 4 + 1] = 255;
      soAlfa.data[i * 4 + 2] = 255;
      soAlfa.data[i * 4 + 3] = img.dados[i * 4 + 3];
    }
    const telaAlfa = new OffscreenCanvas(img.largura, img.altura);
    telaAlfa.getContext('2d')!.putImageData(soAlfa, 0, 0);
    const alfaGrande = new OffscreenCanvas(w, h);
    const ctxAlfa = alfaGrande.getContext('2d', { willReadFrequently: true })!;
    ctxAlfa.imageSmoothingQuality = 'high';
    ctxAlfa.drawImage(telaAlfa, 0, 0, w, h);
    const alfa = ctxAlfa.getImageData(0, 0, w, h).data;
    const cor = grande.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, w, h).data;

    const saida = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < w * h; i++) {
      saida[i * 4] = cor[i * 4];
      saida[i * 4 + 1] = cor[i * 4 + 1];
      saida[i * 4 + 2] = cor[i * 4 + 2];
      saida[i * 4 + 3] = afinarAlfa(alfa[i * 4 + 3]);
    }
    return { largura: w, altura: h, dados: saida };
  });
}
