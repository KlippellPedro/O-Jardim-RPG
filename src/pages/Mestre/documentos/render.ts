/**
 * Do modelo preenchido para o canvas, e do canvas para a imagem, a área de transferência e a impressora.
 * A prévia, o PNG e a folha impressa saem do mesmo desenho.
 */

import { nomeDoArquivo, type IModeloDeDocumento, type ValoresDoDocumento } from './modelo';
import type { Pincel } from './pincel';

// ---------------------------------------------------------------- fontes

const FOLHA_DE_FONTES = 'https://fonts.googleapis.com/css2?family=Caveat:wght@500;600;700&family=IM+Fell+English:ital@0;1&family=Special+Elite&family=UnifrakturMaguntia&family=Orbitron:wght@500;700&family=Share+Tech+Mono&display=swap';
const AMOSTRAS = ['700 40px Cinzel', '40px "IM Fell English"', 'italic 40px "IM Fell English"', '40px "Special Elite"', '600 40px Caveat', '700 40px Caveat', '40px UnifrakturMaguntia', '700 40px Orbitron', '500 40px Orbitron', '40px "Share Tech Mono"'];

let fontesProntas: Promise<void> | null = null;

/** As fontes dos documentos só carregam quando a aba abre. Sem internet, o desenho segue com as fontes de reserva. */
export function garantirFontes(): Promise<void> {
  if (fontesProntas) return fontesProntas;
  if (typeof document === 'undefined' || !document.fonts) return Promise.resolve();
  // A folha de estilo precisa chegar antes: só depois dela o document.fonts sabe que as famílias existem.
  const folha = new Promise<void>((resolver) => {
    let link = document.querySelector<HTMLLinkElement>('link[data-fontes-documentos]');
    if (link?.sheet) {
      resolver();
      return;
    }
    if (!link) {
      link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = FOLHA_DE_FONTES;
      link.dataset.fontesDocumentos = 'sim';
      document.head.appendChild(link);
    }
    link.addEventListener('load', () => resolver(), { once: true });
    link.addEventListener('error', () => resolver(), { once: true });
  });
  const carga = folha
    .then(() => Promise.allSettled(AMOSTRAS.map((amostra) => document.fonts.load(amostra))))
    .then(() => undefined);
  const espera = new Promise<void>((resolver) => window.setTimeout(resolver, 6000));
  fontesProntas = Promise.race([carga, espera]);
  return fontesProntas;
}

// ---------------------------------------------------------------- imagens

const imagens = new Map<string, Promise<HTMLImageElement | null>>();

function carregarImagem(fonte: string): Promise<HTMLImageElement | null> {
  const guardada = imagens.get(fonte);
  if (guardada) return guardada;
  const promessa = new Promise<HTMLImageElement | null>((resolver) => {
    const imagem = new Image();
    imagem.onload = () => resolver(imagem);
    imagem.onerror = () => resolver(null);
    imagem.src = fonte;
  });
  imagens.set(fonte, promessa);
  // Não guarda imagem de documento que já foi fechado faz tempo.
  if (imagens.size > 40) imagens.delete(imagens.keys().next().value as string);
  return promessa;
}

export type ImagensDoDocumento = Record<string, HTMLImageElement | null>;

export async function carregarImagens(modelo: IModeloDeDocumento, valores: ValoresDoDocumento): Promise<ImagensDoDocumento> {
  const pares = await Promise.all(modelo.campos
    .filter((campo) => campo.tipo === 'imagem')
    .map(async (campo) => [campo.id, valores[campo.id] ? await carregarImagem(valores[campo.id]) : null] as const));
  return Object.fromEntries(pares);
}

// ---------------------------------------------------------------- desenho

/** Desenha o documento no canvas. `escala` menor que 1 serve para as miniaturas. */
export function renderizar(canvas: HTMLCanvasElement, modelo: IModeloDeDocumento, valores: ValoresDoDocumento, imagensProntas: ImagensDoDocumento, escala = 1) {
  const largura = Math.round(modelo.largura * escala);
  const altura = Math.round(modelo.altura * escala);
  if (canvas.width !== largura) canvas.width = largura;
  if (canvas.height !== altura) canvas.height = altura;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, largura, altura);
  ctx.setTransform(escala, 0, 0, escala, 0, 0);
  ctx.save();
  const pincel: Pincel = { ctx, largura: modelo.largura, altura: modelo.altura, imagem: (campo) => imagensProntas[campo] ?? null };
  try {
    modelo.desenhar(pincel, valores);
  } finally {
    ctx.restore();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
}

async function canvasPronto(modelo: IModeloDeDocumento, valores: ValoresDoDocumento): Promise<HTMLCanvasElement> {
  await garantirFontes();
  const canvas = document.createElement('canvas');
  renderizar(canvas, modelo, valores, await carregarImagens(modelo, valores));
  return canvas;
}

export async function gerarPng(modelo: IModeloDeDocumento, valores: ValoresDoDocumento): Promise<Blob> {
  const canvas = await canvasPronto(modelo, valores);
  return new Promise<Blob>((resolver, rejeitar) => {
    canvas.toBlob((blob) => (blob ? resolver(blob) : rejeitar(new Error('Não foi possível gerar a imagem.'))), 'image/png');
  });
}

export async function baixarPng(modelo: IModeloDeDocumento, valores: ValoresDoDocumento, titulo: string): Promise<void> {
  const blob = await gerarPng(modelo, valores);
  const url = URL.createObjectURL(blob);
  const ancora = document.createElement('a');
  ancora.href = url;
  ancora.download = nomeDoArquivo(titulo);
  document.body.appendChild(ancora);
  ancora.click();
  ancora.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/** Copia a imagem para colar direto no Discord. Devolve false quando o navegador não deixa. */
export async function copiarPng(modelo: IModeloDeDocumento, valores: ValoresDoDocumento): Promise<boolean> {
  if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined') return false;
  try {
    // Passar a promessa deixa o Safari aceitar a cópia mesmo com a imagem ainda sendo desenhada.
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': gerarPng(modelo, valores) })]);
    return true;
  } catch {
    return false;
  }
}

const A4 = { largura: 210, altura: 297 };
const MARGEM_DA_FOLHA = 8;
const VAO_ENTRE_COPIAS = 4;

/** Quantas cópias da peça cabem numa A4 (peças pequenas saem repetidas para recortar). */
export function copiasPorFolha(modelo: IModeloDeDocumento): { colunas: number; linhas: number } {
  if (!modelo.copiasNaFolha) return { colunas: 1, linhas: 1 };
  const util = (lado: number) => lado - MARGEM_DA_FOLHA * 2 + VAO_ENTRE_COPIAS;
  return {
    colunas: Math.max(1, Math.floor(util(A4.largura) / (modelo.impressao.largura + VAO_ENTRE_COPIAS))),
    linhas: Math.max(1, Math.floor(util(A4.altura) / (modelo.impressao.altura + VAO_ENTRE_COPIAS))),
  };
}

/** Abre a impressão do navegador numa A4 com a peça no tamanho real. Dali sai também o PDF. */
export async function imprimir(modelo: IModeloDeDocumento, valores: ValoresDoDocumento, titulo: string): Promise<void> {
  const blob = await gerarPng(modelo, valores);
  const url = URL.createObjectURL(blob);
  const { colunas, linhas } = copiasPorFolha(modelo);
  const pecas = Array.from({ length: colunas * linhas }, () => `<img src="${url}" alt="">`).join('');
  const quadro = document.createElement('iframe');
  quadro.setAttribute('aria-hidden', 'true');
  quadro.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
  document.body.appendChild(quadro);
  const documento = quadro.contentDocument;
  if (!documento || !quadro.contentWindow) {
    quadro.remove();
    URL.revokeObjectURL(url);
    throw new Error('Este navegador não abriu a impressão.');
  }
  const tituloSeguro = titulo.replace(/[<>&"]/g, '');
  documento.open();
  documento.write(`<!doctype html><html><head><meta charset="utf-8"><title>${tituloSeguro}</title><style>
    @page { size: A4; margin: 0; }
    html, body { margin: 0; background: #fff; }
    .folha { width: ${A4.largura}mm; height: ${A4.altura}mm; display: flex; align-items: center; justify-content: center; }
    .grade { display: grid; grid-template-columns: repeat(${colunas}, ${modelo.impressao.largura}mm); gap: ${VAO_ENTRE_COPIAS}mm; }
    img { display: block; width: ${modelo.impressao.largura}mm; height: ${modelo.impressao.altura}mm; ${modelo.copiasNaFolha ? 'outline: 0.2mm dashed #bbb;' : ''} }
  </style></head><body><div class="folha"><div class="grade">${pecas}</div></div></body></html>`);
  documento.close();
  const imagensDaFolha = Array.from(documento.images);
  await Promise.all(imagensDaFolha.map((imagem) => (imagem.complete ? Promise.resolve() : new Promise((resolver) => { imagem.onload = resolver; imagem.onerror = resolver; }))));
  const limpar = () => {
    window.setTimeout(() => {
      quadro.remove();
      URL.revokeObjectURL(url);
    }, 1000);
  };
  quadro.contentWindow.addEventListener('afterprint', limpar, { once: true });
  quadro.contentWindow.focus();
  quadro.contentWindow.print();
  // Nem todo navegador dispara afterprint; a folha some depois de um tempo de qualquer jeito.
  window.setTimeout(limpar, 60_000);
}

// ---------------------------------------------------------------- imagem enviada pelo Mestre

const TIPOS_ACEITOS = new Set(['image/jpeg', 'image/png', 'image/webp']);
const TAMANHO_MAXIMO_ARQUIVO = 15 * 1024 * 1024;
/** O servidor aceita até 320 mil caracteres por imagem (core/documentos.py). */
export const TAMANHO_MAXIMO_IMAGEM = 300_000;

function abrir(arquivo: File): Promise<HTMLImageElement> {
  return new Promise((resolver, rejeitar) => {
    const url = URL.createObjectURL(arquivo);
    const imagem = new Image();
    imagem.onload = () => { URL.revokeObjectURL(url); resolver(imagem); };
    imagem.onerror = () => { URL.revokeObjectURL(url); rejeitar(new Error('Não foi possível abrir a imagem.')); };
    imagem.src = url;
  });
}

/** Reduz a imagem até caber no documento. PNG e WebP mantêm o fundo transparente (bom para símbolos). */
export async function reduzirImagem(arquivo: File): Promise<string> {
  if (!TIPOS_ACEITOS.has(arquivo.type)) throw new Error('Escolha uma imagem JPG, PNG ou WebP.');
  if (arquivo.size > TAMANHO_MAXIMO_ARQUIVO) throw new Error('A imagem precisa ter no máximo 15 MB.');
  const imagem = await abrir(arquivo);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Este navegador não consegue preparar a imagem.');
  const transparente = arquivo.type !== 'image/jpeg';
  const maior = Math.max(imagem.naturalWidth, imagem.naturalHeight, 1);
  for (const lado of [1100, 900, 720, 560, 420]) {
    const escala = Math.min(1, lado / maior);
    canvas.width = Math.max(1, Math.round(imagem.naturalWidth * escala));
    canvas.height = Math.max(1, Math.round(imagem.naturalHeight * escala));
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!transparente) {
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(imagem, 0, 0, canvas.width, canvas.height);
    for (const qualidade of [0.82, 0.7, 0.58]) {
      const resultado = canvas.toDataURL(transparente ? 'image/webp' : 'image/jpeg', qualidade);
      if (resultado.length <= TAMANHO_MAXIMO_IMAGEM) return resultado;
      // Navegador sem WebP devolve PNG, que não muda com a qualidade: passa para o próximo tamanho.
      if (resultado.startsWith('data:image/png')) break;
    }
  }
  throw new Error('Essa imagem é detalhada demais para o documento. Tente outra.');
}
