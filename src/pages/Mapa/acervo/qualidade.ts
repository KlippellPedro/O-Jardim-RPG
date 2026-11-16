// Melhorar uma imagem que já está no Acervo: amplia 2x ou 4x com o Real-ESRGAN (no navegador, como na Oficina),
// guardando a transparência de tokens e objetos, e sobe o resultado como uma imagem nova ao lado da original.
// As contas puras (escala, tamanho, cor sob a transparência) moram em imagemConta.ts.

import type { IItemAcervo } from '../../../services/acervoApi';
import { imagemDoAcervo } from './imagemDoAcervo';
import { cabeNoMelhorador, espalharCorDaBorda, temTransparencia, type EscalaDeMelhoria } from './imagemConta';
import { subirImagemPronta, type ProgressoEnvio } from './subirImagem';
import { LADO_MAXIMO_MELHORADO, melhorarQualidade } from '../oficina/processar';
import type { AoProgresso } from '../oficina/modelos';

function contexto(tela: OffscreenCanvas) {
  return tela.getContext('2d', { willReadFrequently: true })!;
}

/** O melhorador não conhece transparência: o alfa da original é ampliado à parte e posto de volta no resultado. */
export async function melhorarComTransparencia(fonte: OffscreenCanvas, escala: EscalaDeMelhoria, aoProgresso?: AoProgresso): Promise<OffscreenCanvas> {
  const W = fonte.width;
  const H = fonte.height;
  const dados = contexto(fonte).getImageData(0, 0, W, H);
  const transparente = temTransparencia(dados.data);
  let entrada: OffscreenCanvas = fonte;
  const alfaOriginal = new Uint8ClampedArray(W * H);
  if (transparente) {
    for (let i = 0; i < W * H; i++) alfaOriginal[i] = dados.data[i * 4 + 3];
    espalharCorDaBorda(dados.data, W, H);
    for (let i = 0; i < W * H; i++) dados.data[i * 4 + 3] = 255;
    entrada = new OffscreenCanvas(W, H);
    contexto(entrada).putImageData(dados, 0, 0);
  }
  const melhor = await melhorarQualidade(entrada, escala, aoProgresso);
  if (!transparente) return melhor;
  // Só o alfa da original, ampliado com suavização, vira a máscara do resultado.
  const mascara = new OffscreenCanvas(W, H);
  const pixelsMascara = new ImageData(W, H);
  for (let i = 0; i < W * H; i++) pixelsMascara.data[i * 4 + 3] = alfaOriginal[i];
  contexto(mascara).putImageData(pixelsMascara, 0, 0);
  const grande = new OffscreenCanvas(melhor.width, melhor.height);
  const ctxGrande = contexto(grande);
  ctxGrande.imageSmoothingQuality = 'high';
  ctxGrande.drawImage(mascara, 0, 0, melhor.width, melhor.height);
  const alfaGrande = ctxGrande.getImageData(0, 0, melhor.width, melhor.height).data;
  const ctxMelhor = contexto(melhor);
  const final = ctxMelhor.getImageData(0, 0, melhor.width, melhor.height);
  for (let i = 0; i < melhor.width * melhor.height; i++) final.data[i * 4 + 3] = alfaGrande[i * 4 + 3];
  ctxMelhor.putImageData(final, 0, 0);
  return melhor;
}

export interface ResultadoDaMelhoria {
  item: IItemAcervo;
  /** Tamanho que o resultado teve antes de ser guardado (um token é reduzido ao que o mapa entrega inteiro). */
  largura: number;
  altura: number;
}

/** Amplia a imagem do Acervo e guarda o resultado como uma imagem nova, na mesma pasta e com as mesmas etiquetas. */
export async function melhorarItemDoAcervo(
  item: IItemAcervo,
  escala: EscalaDeMelhoria,
  aoProgresso?: AoProgresso,
  aoEnviar?: (p: ProgressoEnvio) => void,
): Promise<ResultadoDaMelhoria> {
  if (!cabeNoMelhorador(item.largura, item.altura, escala, LADO_MAXIMO_MELHORADO)) {
    throw new Error('O resultado ficaria grande demais para o navegador (mais de 100 milhões de pixels). Use 2x ou uma imagem menor.');
  }
  aoProgresso?.('Abrindo a imagem do Acervo...');
  const fonte = await imagemDoAcervo(item);
  const melhor = await melhorarComTransparencia(fonte, escala, aoProgresso);
  aoProgresso?.('Guardando no Acervo...');
  const bitmap = await createImageBitmap(melhor);
  try {
    // Um token novo continua token: o envio o reduz ao tamanho que o mapa entrega inteiro.
    const novo = await subirImagemPronta(bitmap, `${item.nome} (${escala}x)`, {
      tipo: item.tipo,
      pastaId: item.pasta_id,
      etiquetas: item.etiquetas,
      aoProgresso: aoEnviar,
    });
    return { item: novo, largura: bitmap.width, altura: bitmap.height };
  } finally {
    bitmap.close();
  }
}

/** Refaz um token grande demais no tamanho que o mapa entrega inteiro, como uma imagem nova (o original fica). */
export async function enxugarTokenDoAcervo(item: IItemAcervo, aoEnviar?: (p: ProgressoEnvio) => void): Promise<IItemAcervo> {
  const fonte = await imagemDoAcervo(item);
  const bitmap = await createImageBitmap(fonte);
  try {
    return await subirImagemPronta(bitmap, `${item.nome} (token)`, {
      tipo: 'token',
      pastaId: item.pasta_id,
      etiquetas: item.etiquetas,
      aoProgresso: aoEnviar,
    });
  } finally {
    bitmap.close();
  }
}
