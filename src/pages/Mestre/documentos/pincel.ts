/**
 * As ferramentas que os modelos usam para desenhar no canvas: papel, borda rasgada, texto que cabe
 * na caixa, carimbo, selo, lacre de cera e tarja.
 *
 * Tudo é desenho próprio, sem biblioteca e sem imagem de fora, como o cartaz da ficha
 * (Ficha/utils/cartazExportar.ts). O acaso (mancha, rasgo, falha de tinta) sai de um sorteio com
 * semente fixa, para o mesmo documento sair igual na prévia, na imagem e na impressão.
 */

import { quebrarEmLinhas, type ILinhaDeTexto } from './modelo';

export const FONTES = {
  titulo: 'Cinzel, "IM Fell English", Georgia, serif',
  antiga: '"IM Fell English", Georgia, "Times New Roman", serif',
  maquina: '"Special Elite", "Courier New", Courier, monospace',
  mao: 'Caveat, "Segoe Script", "Bradley Hand", cursive',
  gotica: 'UnifrakturMaguntia, "Old English Text MT", Georgia, serif',
  corpo: 'Georgia, "Times New Roman", serif',
  sans: 'Inter, system-ui, sans-serif',
} as const;

export type Familia = keyof typeof FONTES;

export interface Pincel {
  ctx: CanvasRenderingContext2D;
  largura: number;
  altura: number;
  /** A imagem já carregada de um campo do tipo `imagem`, ou null se o Mestre não escolheu nenhuma. */
  imagem: (campo: string) => HTMLImageElement | null;
}

export const TINTA = '#2a2118';
export const TINTA_FRACA = '#6b5c47';
export const TINTA_APAGADA = '#8d7f6a';

/** mulberry32: sorteio pequeno e repetível. */
export function sorteador(semente: number): () => number {
  let estado = semente >>> 0;
  return () => {
    estado = (estado + 0x6d2b79f5) | 0;
    let t = Math.imul(estado ^ (estado >>> 15), 1 | estado);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Semente a partir de um texto, para o rasgo mudar de um documento para outro sem mudar a cada tecla. */
export function sementeDe(texto: string): number {
  let hash = 2166136261;
  for (let i = 0; i < texto.length; i += 1) {
    hash ^= texto.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

// ---------------------------------------------------------------- fonte

export function fonte(ctx: CanvasRenderingContext2D, familia: Familia, tamanho: number, peso: number | string = 400, italico = false) {
  ctx.font = `${italico ? 'italic ' : ''}${peso} ${Math.round(tamanho)}px ${FONTES[familia]}`;
}

export function espacamento(ctx: CanvasRenderingContext2D, pixels: number) {
  if ('letterSpacing' in ctx) (ctx as unknown as { letterSpacing: string }).letterSpacing = `${pixels}px`;
}

type Alinhamento = 'esquerda' | 'centro' | 'direita';

const ALINHAMENTO_DO_CANVAS: Record<Alinhamento, CanvasTextAlign> = { esquerda: 'left', centro: 'center', direita: 'right' };

/** Uma linha só. Encolhe a fonte até caber na largura e devolve o tamanho usado. */
export function linhaQueCabe(
  ctx: CanvasRenderingContext2D,
  texto: string,
  x: number,
  y: number,
  opcoes: { largura: number; maximo: number; minimo: number; montar: (tamanho: number) => void; alinhamento?: Alinhamento; cor?: string },
): number {
  let tamanho = opcoes.maximo;
  opcoes.montar(tamanho);
  while (tamanho > opcoes.minimo && ctx.measureText(texto).width > opcoes.largura) {
    tamanho -= 2;
    opcoes.montar(tamanho);
  }
  ctx.textAlign = ALINHAMENTO_DO_CANVAS[opcoes.alinhamento ?? 'centro'];
  ctx.textBaseline = 'alphabetic';
  if (opcoes.cor) ctx.fillStyle = opcoes.cor;
  let final = texto;
  if (ctx.measureText(final).width > opcoes.largura) {
    while (final.length > 1 && ctx.measureText(`${final}…`).width > opcoes.largura) final = final.slice(0, -1);
    final = `${final.trimEnd()}…`;
  }
  ctx.fillText(final, x, y);
  ctx.textAlign = 'left';
  return tamanho;
}

/** Texto simples numa linha, sem encolher (rótulos e legendas curtas). */
export function escrever(ctx: CanvasRenderingContext2D, texto: string, x: number, y: number, alinhamento: Alinhamento = 'esquerda', cor?: string) {
  ctx.textAlign = ALINHAMENTO_DO_CANVAS[alinhamento];
  ctx.textBaseline = 'alphabetic';
  if (cor) ctx.fillStyle = cor;
  ctx.fillText(texto, x, y);
  ctx.textAlign = 'left';
}

export interface OpcoesDeBloco {
  x: number;
  /** Linha de base da primeira linha. */
  y: number;
  largura: number;
  alturaDaLinha: number;
  alinhamento?: Alinhamento | 'justificado';
  cor?: string;
  /** Como sai o trecho [[tarjado]]: barra preta (papel oficial) ou rabisco de caneta (bilhete). */
  tarja?: 'barra' | 'rabisco';
  /** Espaço a mais depois de cada parágrafo. */
  entreParagrafos?: number;
}

function desenharTarja(ctx: CanvasRenderingContext2D, x: number, y: number, largura: number, estilo: 'barra' | 'rabisco', semente: number) {
  const medida = ctx.measureText('Hg');
  const subida = medida.actualBoundingBoxAscent || 20;
  const descida = medida.actualBoundingBoxDescent || 6;
  ctx.save();
  if (estilo === 'barra') {
    ctx.fillStyle = '#141210';
    ctx.fillRect(x - 3, y - subida - 2, largura + 6, subida + descida + 4);
  } else {
    const sorte = sorteador(semente);
    ctx.strokeStyle = ctx.fillStyle;
    ctx.lineWidth = Math.max(2, subida * 0.14);
    ctx.lineJoin = 'round';
    ctx.beginPath();
    const passo = Math.max(6, subida * 0.32);
    ctx.moveTo(x - 4, y - subida * 0.4);
    for (let px = x; px <= x + largura + 4; px += passo) {
      ctx.lineTo(px + passo * 0.5, y - subida * (0.85 + sorte() * 0.15));
      ctx.lineTo(px + passo, y + descida * (0.2 + sorte() * 0.4));
    }
    ctx.stroke();
  }
  ctx.restore();
}

/** Desenha linhas já quebradas. Devolve a linha de base que viria depois da última. */
export function desenharLinhas(ctx: CanvasRenderingContext2D, linhas: ILinhaDeTexto[], opcoes: OpcoesDeBloco): number {
  const espaco = ctx.measureText(' ').width;
  const alinhamento = opcoes.alinhamento ?? 'esquerda';
  if (opcoes.cor) ctx.fillStyle = opcoes.cor;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  let y = opcoes.y;
  linhas.forEach((linha, indice) => {
    const larguras = linha.palavras.map((palavra) => ctx.measureText(palavra.texto).width);
    const ocupado = larguras.reduce((soma, largura) => soma + largura, 0);
    const vaos = Math.max(0, linha.palavras.length - 1);
    let vao = espaco;
    let x = opcoes.x;
    if (alinhamento === 'justificado' && !linha.fimDeParagrafo && vaos > 0) {
      vao = (opcoes.largura - ocupado) / vaos;
    } else if (alinhamento === 'centro') {
      x += (opcoes.largura - (ocupado + vao * vaos)) / 2;
    } else if (alinhamento === 'direita') {
      x += opcoes.largura - (ocupado + vao * vaos);
    }
    linha.palavras.forEach((palavra, i) => {
      if (palavra.tarja) {
        const continua = linha.palavras[i + 1]?.tarja;
        desenharTarja(ctx, x, y, larguras[i] + (continua ? vao : 0), opcoes.tarja ?? 'barra', indice * 31 + i);
      } else {
        ctx.fillText(palavra.texto, x, y);
      }
      x += larguras[i] + vao;
    });
    y += opcoes.alturaDaLinha + (linha.fimDeParagrafo ? opcoes.entreParagrafos ?? 0 : 0);
  });
  return y;
}

/** Altura que as linhas ocupam, do topo da primeira ao pé da última. */
function alturaDasLinhas(linhas: ILinhaDeTexto[], alturaDaLinha: number, entreParagrafos: number): number {
  const finais = linhas.filter((linha, indice) => linha.fimDeParagrafo && indice < linhas.length - 1).length;
  return linhas.length * alturaDaLinha + finais * entreParagrafos;
}

export interface OpcoesDeQuadro extends Omit<OpcoesDeBloco, 'y' | 'alturaDaLinha'> {
  /** Topo da caixa (não a linha de base). */
  topo: number;
  altura: number;
  maximo: number;
  minimo: number;
  montar: (tamanho: number) => void;
  /** Altura da linha em relação ao tamanho da fonte. */
  entrelinha?: number;
  /** Centraliza o bloco na altura da caixa. */
  meio?: boolean;
}

/** Texto em várias linhas dentro de uma caixa: encolhe a fonte até caber e, no mínimo, corta com reticências.
 * Devolve o pé do bloco desenhado. */
export function escreverNoQuadro(ctx: CanvasRenderingContext2D, texto: string, opcoes: OpcoesDeQuadro): number {
  const entrelinha = opcoes.entrelinha ?? 1.35;
  const entreParagrafos = opcoes.entreParagrafos ?? 0;
  let tamanho = opcoes.maximo;
  let linhas: ILinhaDeTexto[] = [];
  for (;;) {
    opcoes.montar(tamanho);
    linhas = quebrarEmLinhas(texto, opcoes.largura, (trecho) => ctx.measureText(trecho).width);
    if (alturaDasLinhas(linhas, tamanho * entrelinha, entreParagrafos * (tamanho / opcoes.maximo)) <= opcoes.altura || tamanho <= opcoes.minimo) break;
    tamanho = Math.max(opcoes.minimo, tamanho - 2);
  }
  const alturaDaLinha = tamanho * entrelinha;
  const espacoDoParagrafo = entreParagrafos * (tamanho / opcoes.maximo);
  while (linhas.length > 1 && alturaDasLinhas(linhas, alturaDaLinha, espacoDoParagrafo) > opcoes.altura) linhas.pop();
  if (linhas.length && quebrarEmLinhas(texto, opcoes.largura, (trecho) => ctx.measureText(trecho).width).length > linhas.length) {
    const ultima = linhas[linhas.length - 1];
    const palavras = [...ultima.palavras];
    const reticencias = () => ctx.measureText(`${palavras.map((p) => p.texto).join(' ')}…`).width;
    while (palavras.length > 1 && reticencias() > opcoes.largura) palavras.pop();
    if (palavras.length) palavras[palavras.length - 1] = { ...palavras[palavras.length - 1], texto: `${palavras[palavras.length - 1].texto}…` };
    linhas[linhas.length - 1] = { palavras, fimDeParagrafo: true };
  }
  const ocupado = alturaDasLinhas(linhas, alturaDaLinha, espacoDoParagrafo);
  const topo = opcoes.meio ? opcoes.topo + Math.max(0, (opcoes.altura - ocupado) / 2) : opcoes.topo;
  // A linha de base fica a uns 78% da altura da linha: o texto não encosta no topo da caixa.
  const primeira = topo + alturaDaLinha * 0.78;
  desenharLinhas(ctx, linhas, { ...opcoes, y: primeira, alturaDaLinha, entreParagrafos: espacoDoParagrafo });
  return topo + ocupado;
}

// ---------------------------------------------------------------- papel

export type CoresDoPapel = readonly [string, string, string];

export const PAPEIS = {
  envelhecido: ['#efe3c4', '#e2d0a8', '#cbb07f'],
  claro: ['#f7f2e6', '#efe7d4', '#e2d6bb'],
  escuro: ['#d6bf92', '#c3a674', '#a3824f'],
  jornal: ['#ebe6d8', '#ddd6c3', '#c8bfa5'],
  pardo: ['#d8c3a0', '#c9b088', '#b3946a'],
} as const satisfies Record<string, CoresDoPapel>;

export type TomDePapel = keyof typeof PAPEIS;

export const OPCOES_DE_PAPEL = [
  { valor: 'envelhecido', rotulo: 'Envelhecido' },
  { valor: 'claro', rotulo: 'Novo' },
  { valor: 'escuro', rotulo: 'Muito velho' },
];

export function tomDePapel(valor: string | undefined, padrao: TomDePapel = 'envelhecido'): CoresDoPapel {
  return (valor && valor in PAPEIS ? PAPEIS[valor as TomDePapel] : PAPEIS[padrao]);
}

let texturaDoGrao: HTMLCanvasElement | null = null;

/** Grão do papel: um ladrilho de ruído desenhado uma vez e repetido. */
function grao(): HTMLCanvasElement | null {
  if (texturaDoGrao) return texturaDoGrao;
  if (typeof document === 'undefined') return null;
  const lado = 180;
  const canvas = document.createElement('canvas');
  canvas.width = lado;
  canvas.height = lado;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const dados = ctx.createImageData(lado, lado);
  const sorte = sorteador(7);
  for (let i = 0; i < dados.data.length; i += 4) {
    const valor = sorte() < 0.5 ? 0 : 255;
    dados.data[i] = valor;
    dados.data[i + 1] = valor;
    dados.data[i + 2] = valor;
    dados.data[i + 3] = Math.round(sorte() * 46);
  }
  ctx.putImageData(dados, 0, 0);
  texturaDoGrao = canvas;
  return canvas;
}

/** Pinta o papel na área atual (respeita o recorte já feito). */
export function papel(
  ctx: CanvasRenderingContext2D,
  largura: number,
  altura: number,
  opcoes: { cores?: CoresDoPapel; semente?: number; manchas?: number; grao?: number; bordas?: number } = {},
) {
  const [claro, medio, escuro] = opcoes.cores ?? PAPEIS.envelhecido;
  const fundo = ctx.createLinearGradient(0, 0, largura * 0.35, altura);
  fundo.addColorStop(0, claro);
  fundo.addColorStop(0.55, medio);
  fundo.addColorStop(1, escuro);
  ctx.fillStyle = fundo;
  ctx.fillRect(0, 0, largura, altura);

  const brilho = ctx.createRadialGradient(largura * 0.3, altura * 0.22, 0, largura * 0.3, altura * 0.22, Math.max(largura, altura) * 0.6);
  brilho.addColorStop(0, 'rgba(255, 251, 238, 0.45)');
  brilho.addColorStop(1, 'rgba(255, 251, 238, 0)');
  ctx.fillStyle = brilho;
  ctx.fillRect(0, 0, largura, altura);

  const sorte = sorteador(opcoes.semente ?? 1);
  const manchas = opcoes.manchas ?? 4;
  for (let i = 0; i < manchas; i += 1) {
    const x = largura * sorte();
    const y = altura * sorte();
    const raio = Math.min(largura, altura) * (0.12 + sorte() * 0.3);
    const mancha = ctx.createRadialGradient(x, y, 0, x, y, raio);
    mancha.addColorStop(0, `rgba(110, 76, 34, ${0.07 + sorte() * 0.1})`);
    mancha.addColorStop(1, 'rgba(110, 76, 34, 0)');
    ctx.fillStyle = mancha;
    ctx.fillRect(0, 0, largura, altura);
  }

  const textura = grao();
  if (textura && (opcoes.grao ?? 1) > 0) {
    const padrao = ctx.createPattern(textura, 'repeat');
    if (padrao) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, opcoes.grao ?? 1);
      ctx.fillStyle = padrao;
      ctx.fillRect(0, 0, largura, altura);
      ctx.restore();
    }
  }

  // Bordas mais escuras: o que mais denuncia papel velho.
  const bordas = opcoes.bordas ?? 0.3;
  if (bordas > 0) {
    const vinheta = ctx.createRadialGradient(largura / 2, altura / 2, Math.min(largura, altura) * 0.35, largura / 2, altura / 2, Math.hypot(largura, altura) * 0.56);
    vinheta.addColorStop(0, 'rgba(90, 58, 22, 0)');
    vinheta.addColorStop(1, `rgba(90, 58, 22, ${bordas})`);
    ctx.fillStyle = vinheta;
    ctx.fillRect(0, 0, largura, altura);
  }
}

/** Papel liso de cor única (cartões), com grão leve. */
export function chapado(ctx: CanvasRenderingContext2D, largura: number, altura: number, cor: string, grao = 0.6) {
  ctx.fillStyle = cor;
  ctx.fillRect(0, 0, largura, altura);
  papelGrao(ctx, largura, altura, grao);
}

export function papelGrao(ctx: CanvasRenderingContext2D, largura: number, altura: number, intensidade: number) {
  const textura = grao();
  if (!textura || intensidade <= 0) return;
  const padrao = ctx.createPattern(textura, 'repeat');
  if (!padrao) return;
  ctx.save();
  ctx.globalAlpha = intensidade;
  ctx.fillStyle = padrao;
  ctx.fillRect(0, 0, largura, altura);
  ctx.restore();
}

export interface LadosRasgados {
  topo?: number;
  base?: number;
  esquerda?: number;
  direita?: number;
}

/** Contorno do papel com rasgo nos lados pedidos (o número é a fundura do rasgo, em pixels). */
export function contornoRasgado(ctx: CanvasRenderingContext2D, largura: number, altura: number, lados: LadosRasgados, semente = 1) {
  const sorte = sorteador(semente);
  const passo = 18;
  const borda = (fundura: number | undefined) => (fundura ? fundura * (0.25 + sorte() * 0.75) : 0);
  ctx.beginPath();
  ctx.moveTo(borda(lados.esquerda), borda(lados.topo));
  for (let x = passo; x < largura; x += passo) ctx.lineTo(x, borda(lados.topo));
  ctx.lineTo(largura - borda(lados.direita), borda(lados.topo));
  for (let y = passo; y < altura; y += passo) ctx.lineTo(largura - borda(lados.direita), y);
  ctx.lineTo(largura - borda(lados.direita), altura - borda(lados.base));
  for (let x = largura - passo; x > 0; x -= passo) ctx.lineTo(x, altura - borda(lados.base));
  ctx.lineTo(borda(lados.esquerda), altura - borda(lados.base));
  for (let y = altura - passo; y > 0; y -= passo) ctx.lineTo(borda(lados.esquerda), y);
  ctx.closePath();
}

export function retanguloArredondado(ctx: CanvasRenderingContext2D, x: number, y: number, largura: number, altura: number, raio: number) {
  ctx.beginPath();
  ctx.moveTo(x + raio, y);
  ctx.arcTo(x + largura, y, x + largura, y + altura, raio);
  ctx.arcTo(x + largura, y + altura, x, y + altura, raio);
  ctx.arcTo(x, y + altura, x, y, raio);
  ctx.arcTo(x, y, x + largura, y, raio);
  ctx.closePath();
}

/** Vinco de dobra: uma linha clara com uma sombra do lado. */
export function vinco(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) {
  ctx.save();
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(80, 55, 25, 0.16)';
  ctx.beginPath();
  ctx.moveTo(x1, y1 + 2);
  ctx.lineTo(x2, y2 + 2);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255, 252, 240, 0.4)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

/** Furo de prego, de quando o papel ficou pregado num mural. */
export function furo(ctx: CanvasRenderingContext2D, x: number, y: number, raio = 9) {
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.arc(x, y, raio, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = 'rgba(70, 45, 18, 0.45)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x, y, raio + 2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/** Mancha em anel, de copo apoiado em cima. */
export function marcaDeCopo(ctx: CanvasRenderingContext2D, x: number, y: number, raio: number, semente = 3) {
  const sorte = sorteador(semente);
  ctx.save();
  ctx.strokeStyle = 'rgba(105, 68, 30, 0.16)';
  for (let volta = 0; volta < 3; volta += 1) {
    ctx.lineWidth = 4 + sorte() * 6;
    ctx.beginPath();
    const inicio = sorte() * Math.PI;
    ctx.arc(x + sorte() * 4, y + sorte() * 4, raio - volta * 3, inicio, inicio + Math.PI * (1.4 + sorte() * 0.6));
    ctx.stroke();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- linhas e enfeites

export function traco(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, cor: string, espessura = 2, tracejado?: number[]) {
  ctx.save();
  ctx.strokeStyle = cor;
  ctx.lineWidth = espessura;
  if (tracejado) ctx.setLineDash(tracejado);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

/** Filete de livro antigo: duas linhas finas e um losango no meio. */
export function filete(ctx: CanvasRenderingContext2D, x: number, y: number, largura: number, cor: string) {
  const meio = x + largura / 2;
  traco(ctx, x, y, meio - 26, y, cor, 2);
  traco(ctx, meio + 26, y, x + largura, y, cor, 2);
  traco(ctx, x + largura * 0.12, y + 7, meio - 40, y + 7, cor, 1);
  traco(ctx, meio + 40, y + 7, x + largura * 0.88, y + 7, cor, 1);
  ctx.save();
  ctx.fillStyle = cor;
  ctx.beginPath();
  ctx.moveTo(meio, y - 11);
  ctx.lineTo(meio + 14, y + 3);
  ctx.lineTo(meio, y + 17);
  ctx.lineTo(meio - 14, y + 3);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** Canto ornamental: um "L" com uma voltinha, girado para cada canto. */
export function cantoneira(ctx: CanvasRenderingContext2D, x: number, y: number, tamanho: number, angulo: number, cor: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angulo);
  ctx.strokeStyle = cor;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, tamanho);
  ctx.lineTo(0, 0);
  ctx.lineTo(tamanho, 0);
  ctx.stroke();
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(10, tamanho * 0.7);
  ctx.lineTo(10, 10);
  ctx.lineTo(tamanho * 0.7, 10);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(10, 10, 6, 0, Math.PI * 2);
  ctx.fillStyle = cor;
  ctx.fill();
  ctx.restore();
}

export function estrela(ctx: CanvasRenderingContext2D, x: number, y: number, raio: number, cor: string, pontas = 5) {
  ctx.save();
  ctx.fillStyle = cor;
  ctx.beginPath();
  for (let i = 0; i < pontas * 2; i += 1) {
    const r = i % 2 === 0 ? raio : raio * 0.45;
    const angulo = -Math.PI / 2 + (i * Math.PI) / pontas;
    ctx.lineTo(x + Math.cos(angulo) * r, y + Math.sin(angulo) * r);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** Fundo de segurança de documento: ondas finas cruzadas. */
export function guilhoche(ctx: CanvasRenderingContext2D, x: number, y: number, largura: number, altura: number, cor: string) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, largura, altura);
  ctx.clip();
  ctx.strokeStyle = cor;
  ctx.lineWidth = 1.2;
  for (let onda = 0; onda < 26; onda += 1) {
    ctx.beginPath();
    const base = y + (altura / 26) * onda;
    for (let px = x; px <= x + largura; px += 6) {
      const fase = (px - x) / 70;
      ctx.lineTo(px, base + Math.sin(fase + onda * 0.6) * 18 + Math.sin(fase * 0.37 + onda) * 9);
    }
    ctx.stroke();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- imagem

/** Imagem cobrindo a caixa, cortando o que sobra. `topo` puxa o corte para cima (retratos). */
export function imagemCobrindo(
  ctx: CanvasRenderingContext2D,
  imagem: HTMLImageElement,
  x: number,
  y: number,
  largura: number,
  altura: number,
  opcoes: { filtro?: string; foco?: 'centro' | 'topo'; conter?: boolean } = {},
) {
  const larguraNatural = imagem.naturalWidth || imagem.width;
  const alturaNatural = imagem.naturalHeight || imagem.height;
  if (!larguraNatural || !alturaNatural) return;
  const escala = opcoes.conter
    ? Math.min(largura / larguraNatural, altura / alturaNatural)
    : Math.max(largura / larguraNatural, altura / alturaNatural);
  const w = larguraNatural * escala;
  const h = alturaNatural * escala;
  const dx = x + (largura - w) / 2;
  const dy = opcoes.foco === 'topo' && !opcoes.conter ? y + Math.min(0, (altura - h) * 0.2) : y + (altura - h) / 2;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, largura, altura);
  ctx.clip();
  if (opcoes.filtro && 'filter' in ctx) ctx.filter = opcoes.filtro;
  ctx.drawImage(imagem, dx, dy, w, h);
  ctx.restore();
}

/** Quando não há retrato: um vulto apagado no lugar. */
export function vulto(ctx: CanvasRenderingContext2D, x: number, y: number, largura: number, altura: number, cor: string) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, largura, altura);
  ctx.clip();
  ctx.fillStyle = cor;
  const meio = x + largura / 2;
  ctx.beginPath();
  ctx.arc(meio, y + altura * 0.4, Math.min(largura, altura) * 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(meio, y + altura * 1.02, largura * 0.42, altura * 0.42, 0, Math.PI, 0);
  ctx.fill();
  ctx.restore();
}

// ---------------------------------------------------------------- carimbo, selo e lacre

/** Desenha numa folha à parte, apaga pontinhos (tinta que não pegou) e assenta no papel. A tinta escura
 * assenta por multiplicação, como tinta de verdade; tinta clara (selo branco sobre faixa colorida) vai por cima. */
function comFalhas(ctx: CanvasRenderingContext2D, lado: number, semente: number, desenhar: (folha: CanvasRenderingContext2D, centro: number) => void, x: number, y: number, angulo: number, opacidade = 0.85, tintaClara = false) {
  if (typeof document === 'undefined') return;
  const folha = document.createElement('canvas');
  folha.width = lado;
  folha.height = lado;
  const fctx = folha.getContext('2d');
  if (!fctx) return;
  desenhar(fctx, lado / 2);
  const sorte = sorteador(semente);
  fctx.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < lado * 1.6; i += 1) {
    fctx.globalAlpha = 0.35 + sorte() * 0.65;
    fctx.beginPath();
    fctx.arc(sorte() * lado, sorte() * lado, 0.8 + sorte() * 2.6, 0, Math.PI * 2);
    fctx.fill();
  }
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angulo);
  ctx.globalAlpha = opacidade;
  ctx.globalCompositeOperation = tintaClara ? 'source-over' : 'multiply';
  ctx.drawImage(folha, -lado / 2, -lado / 2);
  ctx.restore();
}

/** Carimbo retangular de palavra (URGENTE, CAPTURADO, NÃO CONFERIDO...). */
export function carimbo(
  ctx: CanvasRenderingContext2D,
  texto: string,
  x: number,
  y: number,
  opcoes: { cor: string; tamanho: number; angulo?: number; semente?: number; larguraMaxima?: number },
) {
  if (!texto.trim()) return;
  const medidor = ctx.font;
  fonte(ctx, 'titulo', opcoes.tamanho, 700);
  espacamento(ctx, opcoes.tamanho * 0.08);
  let tamanho = opcoes.tamanho;
  while (opcoes.larguraMaxima && tamanho > 24 && ctx.measureText(texto).width > opcoes.larguraMaxima) {
    tamanho -= 4;
    fonte(ctx, 'titulo', tamanho, 700);
    espacamento(ctx, tamanho * 0.08);
  }
  const largura = ctx.measureText(texto).width + tamanho * 0.9;
  const altura = tamanho * 1.45;
  espacamento(ctx, 0);
  ctx.font = medidor;
  const lado = Math.ceil(Math.hypot(largura, altura) + 20);
  comFalhas(ctx, lado, opcoes.semente ?? 11, (folha, centro) => {
    folha.strokeStyle = opcoes.cor;
    folha.fillStyle = opcoes.cor;
    folha.lineWidth = Math.max(4, tamanho * 0.08);
    folha.strokeRect(centro - largura / 2, centro - altura / 2, largura, altura);
    folha.lineWidth = Math.max(2, tamanho * 0.03);
    folha.strokeRect(centro - largura / 2 + tamanho * 0.12, centro - altura / 2 + tamanho * 0.12, largura - tamanho * 0.24, altura - tamanho * 0.24);
    fonte(folha, 'titulo', tamanho, 700);
    espacamento(folha, tamanho * 0.08);
    folha.textAlign = 'center';
    folha.textBaseline = 'middle';
    folha.fillText(texto, centro + tamanho * 0.04, centro + tamanho * 0.05);
  }, x, y, opcoes.angulo ?? -0.2);
}

/** Selo redondo com o texto correndo na borda e uma estrela no meio. */
export function seloRedondo(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  raio: number,
  opcoes: { texto: string; cor: string; angulo?: number; semente?: number; centro?: string; tintaClara?: boolean },
) {
  const lado = Math.ceil(raio * 2 + 24);
  comFalhas(ctx, lado, opcoes.semente ?? 5, (folha, c) => {
    folha.strokeStyle = opcoes.cor;
    folha.fillStyle = opcoes.cor;
    folha.lineWidth = raio * 0.07;
    folha.beginPath();
    folha.arc(c, c, raio - folha.lineWidth / 2, 0, Math.PI * 2);
    folha.stroke();
    folha.lineWidth = raio * 0.025;
    folha.beginPath();
    folha.arc(c, c, raio * 0.66, 0, Math.PI * 2);
    folha.stroke();

    const texto = `${opcoes.texto.toUpperCase().trim()} · `;
    let tamanho = raio * 0.2;
    fonte(folha, 'titulo', tamanho, 700);
    const raioDoTexto = raio * 0.8;
    const caberia = Math.PI * 2 * raioDoTexto * 0.96;
    while (tamanho > 8 && folha.measureText(texto).width > caberia) {
      tamanho -= 1;
      fonte(folha, 'titulo', tamanho, 700);
    }
    // Repete o texto até fechar a volta, sem passar dela.
    let volta = texto;
    while (folha.measureText(volta + texto).width <= caberia) volta += texto;
    const total = folha.measureText(volta).width;
    const sobra = (caberia - total) / Math.max(1, volta.length);
    let angulo = -Math.PI / 2 - (total + sobra * volta.length) / raioDoTexto / 2;
    folha.textAlign = 'center';
    folha.textBaseline = 'middle';
    for (const letra of volta) {
      const largura = folha.measureText(letra).width + sobra;
      angulo += largura / raioDoTexto / 2;
      folha.save();
      folha.translate(c + Math.cos(angulo) * raioDoTexto, c + Math.sin(angulo) * raioDoTexto);
      folha.rotate(angulo + Math.PI / 2);
      folha.fillText(letra, 0, 0);
      folha.restore();
      angulo += largura / raioDoTexto / 2;
    }
    if (opcoes.centro) {
      fonte(folha, 'titulo', raio * 0.42, 700);
      folha.fillText(opcoes.centro.slice(0, 3).toUpperCase(), c, c + raio * 0.03);
    } else {
      estrela(folha, c, c, raio * 0.32, opcoes.cor);
    }
  }, x, y, opcoes.angulo ?? -0.25, 0.8, opcoes.tintaClara);
}

export const CORES_DE_TINTA: Record<string, string> = {
  vermelho: '#8a1f1a',
  azul: '#24407a',
  preto: '#1f1c1a',
  verde: '#2f5a2a',
  roxo: '#4f2a6b',
};

export const OPCOES_DE_TINTA = [
  { valor: 'vermelho', rotulo: 'Vermelho' },
  { valor: 'azul', rotulo: 'Azul' },
  { valor: 'preto', rotulo: 'Preto' },
  { valor: 'verde', rotulo: 'Verde' },
  { valor: 'roxo', rotulo: 'Roxo' },
];

export const CORES_DE_LACRE: Record<string, [string, string]> = {
  vermelho: ['#b4322b', '#5e1210'],
  verde: ['#3f7a45', '#15361b'],
  azul: ['#3b5fa0', '#14264d'],
  preto: ['#4a4646', '#121010'],
  dourado: ['#d6a845', '#6e4d10'],
  roxo: ['#7a4aa0', '#2c1440'],
};

/** Lacre de cera: borda irregular, volume e a inicial em baixo-relevo. */
export function lacre(ctx: CanvasRenderingContext2D, x: number, y: number, raio: number, cor: string, inicial: string, semente = 9) {
  const tons = CORES_DE_LACRE[cor];
  if (!tons) return;
  const [claro, escuro] = tons;
  const sorte = sorteador(semente);
  ctx.save();
  ctx.shadowColor = 'rgba(40, 20, 10, 0.45)';
  ctx.shadowBlur = raio * 0.25;
  ctx.shadowOffsetY = raio * 0.08;
  ctx.beginPath();
  const pontos = 28;
  for (let i = 0; i <= pontos; i += 1) {
    const angulo = (i / pontos) * Math.PI * 2;
    const r = raio * (0.9 + sorte() * 0.16);
    ctx.lineTo(x + Math.cos(angulo) * r, y + Math.sin(angulo) * r);
  }
  ctx.closePath();
  const volume = ctx.createRadialGradient(x - raio * 0.35, y - raio * 0.4, raio * 0.1, x, y, raio * 1.1);
  volume.addColorStop(0, claro);
  volume.addColorStop(1, escuro);
  ctx.fillStyle = volume;
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.lineWidth = raio * 0.06;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.28)';
  ctx.beginPath();
  ctx.arc(x + 1, y + 2, raio * 0.66, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
  ctx.beginPath();
  ctx.arc(x - 1, y - 1, raio * 0.66, 0, Math.PI * 2);
  ctx.stroke();
  const letra = inicial.trim().slice(0, 2).toUpperCase();
  if (letra) {
    fonte(ctx, 'titulo', raio * (letra.length > 1 ? 0.62 : 0.8), 700);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.fillText(letra, x - 2, y - 1);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
    ctx.fillText(letra, x + 2, y + 3);
  } else {
    estrela(ctx, x, y, raio * 0.36, 'rgba(0, 0, 0, 0.3)');
  }
  ctx.restore();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

/** Linha de assinatura com a legenda embaixo. Se vier um nome, ele aparece escrito à mão em cima da linha. */
export function assinatura(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  largura: number,
  opcoes: { legenda?: string; nome?: string; tinta?: string; cor?: string },
) {
  const cor = opcoes.cor ?? TINTA;
  if (opcoes.nome?.trim()) {
    ctx.save();
    ctx.translate(x + largura / 2, y - 12);
    ctx.rotate(-0.04);
    linhaQueCabe(ctx, opcoes.nome.trim(), 0, 0, {
      largura: largura * 0.95,
      maximo: 64,
      minimo: 28,
      montar: (tamanho) => fonte(ctx, 'mao', tamanho, 700),
      cor: opcoes.tinta ?? '#1f2c55',
    });
    ctx.restore();
  }
  traco(ctx, x, y, x + largura, y, cor, 2);
  if (opcoes.legenda) {
    fonte(ctx, 'antiga', 24, 400, true);
    escrever(ctx, opcoes.legenda, x + largura / 2, y + 32, 'centro', cor);
  }
}
