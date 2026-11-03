// Texturas dos materiais do construtor, geradas aqui mesmo (nada de imagem de terceiros):
// cada material é um ladrilho de 256 px que emenda dos quatro lados, feito com ruído de valor
// periódico e um gerador de números com semente fixa. A mesma semente dá a mesma textura em
// qualquer aparelho, então o mapa publicado sai igual ao que o Mestre viu no editor.

import type { MaterialChao, MaterialParede } from './projeto';

export const LADO_TEXTURA = 256;

type Cor = [number, number, number];

function hex(cor: string): Cor {
  const n = Number.parseInt(cor.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** mulberry32: números de 0 a 1 que se repetem para a mesma semente. */
function sorteador(semente: number): () => number {
  let a = semente >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Ruído de valor que emenda: a grade de `periodo` pontos dá a volta no ladrilho. */
function ruidoPeriodico(semente: number, periodo: number): (x: number, y: number) => number {
  const sorte = sorteador(semente);
  const valores = Float32Array.from({ length: periodo * periodo }, () => sorte());
  const passo = LADO_TEXTURA / periodo;
  const suave = (t: number) => t * t * (3 - 2 * t);
  return (x, y) => {
    const gx = x / passo;
    const gy = y / passo;
    const x0 = Math.floor(gx);
    const y0 = Math.floor(gy);
    const tx = suave(gx - x0);
    const ty = suave(gy - y0);
    const v = (i: number, j: number) => valores[(((j % periodo) + periodo) % periodo) * periodo + (((i % periodo) + periodo) % periodo)];
    const a = v(x0, y0) + (v(x0 + 1, y0) - v(x0, y0)) * tx;
    const b = v(x0, y0 + 1) + (v(x0 + 1, y0 + 1) - v(x0, y0 + 1)) * tx;
    return a + (b - a) * ty;
  };
}

/** Várias oitavas de ruído (de 0 a 1), da grossa para a fina. */
function fbm(semente: number, periodos: number[]): (x: number, y: number) => number {
  const camadas = periodos.map((periodo, i) => ({ ruido: ruidoPeriodico(semente + i * 101, periodo), peso: 0.5 ** i }));
  const total = camadas.reduce((soma, camada) => soma + camada.peso, 0);
  return (x, y) => camadas.reduce((soma, camada) => soma + camada.ruido(x, y) * camada.peso, 0) / total;
}

/** Pontos de Voronoi que emendam: a distância ao mais perto e ao segundo, e de quem é a célula. */
function voronoi(semente: number, celulas: number) {
  const sorte = sorteador(semente);
  const tamanho = LADO_TEXTURA / celulas;
  const pontos = Array.from({ length: celulas * celulas }, (_, i) => ({
    x: ((i % celulas) + 0.15 + sorte() * 0.7) * tamanho,
    y: (Math.floor(i / celulas) + 0.15 + sorte() * 0.7) * tamanho,
    tom: sorte(),
  }));
  return (x: number, y: number) => {
    const cx = Math.floor(x / tamanho);
    const cy = Math.floor(y / tamanho);
    let d1 = Infinity;
    let d2 = Infinity;
    let tom = 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const i = ((cx + dx) % celulas + celulas) % celulas;
        const j = ((cy + dy) % celulas + celulas) % celulas;
        const ponto = pontos[j * celulas + i];
        const px = ponto.x + Math.floor((cx + dx) / celulas) * LADO_TEXTURA;
        const py = ponto.y + Math.floor((cy + dy) / celulas) * LADO_TEXTURA;
        const d = Math.hypot(x - px, y - py);
        if (d < d1) {
          d2 = d1;
          d1 = d;
          tom = ponto.tom;
        } else if (d < d2) {
          d2 = d;
        }
      }
    }
    return { borda: d2 - d1, tom };
  };
}

function criarTela(): [HTMLCanvasElement | OffscreenCanvas, CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D] {
  const tela = typeof document !== 'undefined' ? document.createElement('canvas') : new OffscreenCanvas(LADO_TEXTURA, LADO_TEXTURA);
  tela.width = LADO_TEXTURA;
  tela.height = LADO_TEXTURA;
  return [tela, tela.getContext('2d') as CanvasRenderingContext2D];
}

/** Pinta pixel a pixel: `cor(x, y)` devolve [r, g, b] de 0 a 255. */
function pintarPixels(cor: (x: number, y: number) => Cor): HTMLCanvasElement | OffscreenCanvas {
  const [tela, ctx] = criarTela();
  const imagem = ctx.createImageData(LADO_TEXTURA, LADO_TEXTURA);
  for (let y = 0; y < LADO_TEXTURA; y++) {
    for (let x = 0; x < LADO_TEXTURA; x++) {
      const [r, g, b] = cor(x, y);
      const i = (y * LADO_TEXTURA + x) * 4;
      imagem.data[i] = r;
      imagem.data[i + 1] = g;
      imagem.data[i + 2] = b;
      imagem.data[i + 3] = 255;
    }
  }
  ctx.putImageData(imagem, 0, 0);
  return tela;
}

const limitar = (v: number) => Math.max(0, Math.min(255, v));
const vezes = (cor: Cor, fator: number): Cor => [limitar(cor[0] * fator), limitar(cor[1] * fator), limitar(cor[2] * fator)];
const misturar = (a: Cor, b: Cor, t: number): Cor => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
/** Um valor de 0 a 1 fixo para cada par de inteiros. */
const sorteDe = (a: number, b: number, semente: number) => {
  const s = Math.sin(a * 127.1 + b * 311.7 + semente * 74.7) * 43758.5453;
  return s - Math.floor(s);
};

/** Blocos alinhados (laje, tijolo, pedra de parede): `largura` x `altura` px, fileiras deslocadas pela metade. */
function blocos(base: Cor, junta: Cor, largura: number, altura: number, espessuraJunta: number, semente: number, variacao: number) {
  const ruido = fbm(semente, [8, 16, 32]);
  return pintarPixels((x, y) => {
    const fileira = Math.floor(y / altura);
    const desloc = fileira % 2 ? largura / 2 : 0;
    const coluna = Math.floor(((x + desloc) % LADO_TEXTURA) / largura);
    const dentroX = (x + desloc) % largura;
    const dentroY = y % altura;
    const n = ruido(x, y);
    if (dentroX < espessuraJunta || dentroY < espessuraJunta) return vezes(junta, 0.85 + n * 0.3);
    const tom = 1 - variacao / 2 + sorteDe(coluna, fileira, semente) * variacao;
    // Borda de cima e da esquerda um pouco mais clara: o bloco parece ter volume.
    const relevo = dentroX < espessuraJunta + 2 || dentroY < espessuraJunta + 2 ? 1.1 : 1;
    return vezes(base, tom * (0.82 + n * 0.36) * relevo);
  });
}

function tabuas(base: Cor, semente: number, vertical = false) {
  const ruido = fbm(semente, [4, 16, 64]);
  const altura = 32;
  return pintarPixels((px, py) => {
    const x = vertical ? py : px;
    const y = vertical ? px : py;
    const tabua = Math.floor(y / altura);
    const emenda = Math.floor(sorteDe(tabua, 0, semente) * LADO_TEXTURA);
    const tom = 0.82 + sorteDe(tabua, 1, semente) * 0.3;
    if (y % altura < 2 || Math.abs(((x - emenda + LADO_TEXTURA) % LADO_TEXTURA)) < 2) return vezes(base, 0.45);
    const veio = Math.sin(x * 0.045 + ruido(x, y) * 9 + tabua * 2.1) * 0.5 + 0.5;
    return vezes(base, tom * (0.85 + veio * 0.22) * (0.9 + ruido(x, y) * 0.2));
  });
}

function pedregulho(base: Cor, junta: Cor, celulas: number, semente: number) {
  const pedras = voronoi(semente, celulas);
  const ruido = fbm(semente + 7, [8, 32]);
  return pintarPixels((x, y) => {
    const { borda, tom } = pedras(x, y);
    const n = ruido(x, y);
    if (borda < 3) return vezes(junta, 0.8 + n * 0.3);
    const arredondado = Math.min(1, borda / 14);
    return vezes(base, (0.78 + tom * 0.3) * (0.75 + arredondado * 0.3) * (0.88 + n * 0.24));
  });
}

function terreno(base: Cor, escura: Cor, semente: number, periodos: number[], contraste: number, pintas = 0) {
  const ruido = fbm(semente, periodos);
  const fino = ruidoPeriodico(semente + 33, 64);
  return pintarPixels((x, y) => {
    const n = ruido(x, y);
    let cor = misturar(escura, base, Math.max(0, Math.min(1, 0.5 + (n - 0.5) * contraste)));
    if (pintas && fino(x, y) > 1 - pintas) cor = vezes(cor, 1.18);
    if (pintas && fino(x * 1.7, y * 1.7) < pintas * 0.6) cor = vezes(cor, 0.82);
    return cor;
  });
}

function grama(semente: number) {
  const ruido = fbm(semente, [8, 16, 32]);
  const [tela, ctx] = criarTela();
  // Contraste baixo e manchas pequenas: a grama não pode mostrar onde a textura se repete.
  const fundo = terreno(hex('#4a7633'), hex('#365a26'), semente, [8, 16, 32, 64], 0.9, 0.06);
  ctx.drawImage(fundo, 0, 0);
  const sorte = sorteador(semente);
  // Folhinhas: traços curtos que se repetem do outro lado quando passam da borda.
  for (let i = 0; i < 900; i++) {
    const x = sorte() * LADO_TEXTURA;
    const y = sorte() * LADO_TEXTURA;
    const claro = ruido(x, y) > 0.5;
    ctx.strokeStyle = claro ? 'rgba(160, 205, 110, 0.55)' : 'rgba(25, 50, 18, 0.5)';
    ctx.lineWidth = 1.2;
    const inclinacao = (sorte() - 0.5) * 4;
    for (const [ox, oy] of [[0, 0], [-LADO_TEXTURA, 0], [0, -LADO_TEXTURA], [LADO_TEXTURA, 0], [0, LADO_TEXTURA]]) {
      ctx.beginPath();
      ctx.moveTo(x + ox, y + oy);
      ctx.lineTo(x + ox + inclinacao, y + oy - 4 - sorte() * 3);
      ctx.stroke();
    }
  }
  return tela;
}

function marmore(semente: number) {
  const ruido = fbm(semente, [4, 8, 16, 32]);
  const base = hex('#ddd9d0');
  return pintarPixels((x, y) => {
    if (x % 128 < 2 || y % 128 < 2) return vezes(base, 0.72);
    const veio = Math.abs(Math.sin(x * 0.018 + y * 0.012 + ruido(x, y) * 12));
    const tom = 0.94 + ruido(x * 2, y * 2) * 0.08;
    return veio < 0.07 ? misturar(vezes(base, tom), hex('#7b7c84'), 1 - veio / 0.07) : vezes(base, tom);
  });
}

function agua(semente: number) {
  const a = fbm(semente, [4, 8, 16]);
  const b = fbm(semente + 50, [4, 8, 16]);
  const funda = hex('#1d4a66');
  const rasa = hex('#3a7a9c');
  return pintarPixels((x, y) => {
    const onda = Math.sin(x * 0.049 + a(x, y) * 7) * Math.sin(y * 0.049 + b(x, y) * 7);
    const cor = misturar(funda, rasa, a(x, y));
    return onda > 0.72 ? misturar(cor, hex('#bfe3f2'), (onda - 0.72) * 2.2) : cor;
  });
}

function lava(semente: number) {
  const placas = voronoi(semente, 6);
  const ruido = fbm(semente + 3, [8, 16, 32]);
  return pintarPixels((x, y) => {
    const { borda, tom } = placas(x, y);
    const n = ruido(x, y);
    if (borda < 9) {
      const calor = 1 - borda / 9;
      return misturar(hex('#c2410c'), hex('#ffd34a'), calor * (0.7 + n * 0.3));
    }
    return vezes(hex('#2e1812'), 0.8 + tom * 0.35 + n * 0.25);
  });
}

function folhagem(semente: number) {
  const ruido = fbm(semente, [8, 16, 32]);
  const manchas = voronoi(semente + 9, 10);
  return pintarPixels((x, y) => {
    const { borda } = manchas(x, y);
    const n = ruido(x, y);
    const base = misturar(hex('#22421a'), hex('#5c8f3c'), n);
    return borda < 2.5 ? vezes(base, 0.6) : vezes(base, 0.9 + Math.min(1, borda / 10) * 0.25);
  });
}

const GERADORES_CHAO: Record<MaterialChao, () => HTMLCanvasElement | OffscreenCanvas> = {
  L: () => blocos(hex('#71747c'), hex('#2c2d32'), 64, 64, 3, 11, 0.22),
  P: () => pedregulho(hex('#7d776d'), hex('#2a2722'), 8, 23),
  T: () => tabuas(hex('#8d5c35'), 31),
  R: () => terreno(hex('#7a5536'), hex('#4a3020'), 41, [8, 16, 32], 1.1, 0.08),
  G: () => grama(53),
  A: () => terreno(hex('#d2b57e'), hex('#a8875a'), 61, [4, 16, 64], 1.1, 0.05),
  M: () => marmore(71),
  C: () => terreno(hex('#5a534c'), hex('#2c2825'), 83, [4, 8, 16, 32, 64], 2.2, 0.04),
  N: () => terreno(hex('#f2f6fa'), hex('#c7d3e0'), 97, [4, 8, 16], 1.2, 0.03),
  W: () => agua(107),
  V: () => lava(113),
};

const GERADORES_PAREDE: Record<MaterialParede, () => HTMLCanvasElement | OffscreenCanvas> = {
  pedra: () => blocos(hex('#8e9097'), hex('#33343a'), 32, 32, 2, 127, 0.3),
  tijolo: () => blocos(hex('#a14d37'), hex('#d2c3b0'), 32, 16, 2, 131, 0.25),
  madeira: () => tabuas(hex('#7c5331'), 137),
  caverna: () => terreno(hex('#6a625a'), hex('#2a2622'), 139, [4, 8, 16, 32], 2.4, 0.05),
  cerca: () => tabuas(hex('#8a6440'), 149, true),
  sebe: () => folhagem(151),
};

const texturas = new Map<string, HTMLCanvasElement | OffscreenCanvas>();

export function texturaDoChao(codigo: MaterialChao): HTMLCanvasElement | OffscreenCanvas {
  const chave = `chao:${codigo}`;
  if (!texturas.has(chave)) texturas.set(chave, GERADORES_CHAO[codigo]());
  return texturas.get(chave)!;
}

export function texturaDaParede(material: MaterialParede): HTMLCanvasElement | OffscreenCanvas {
  const chave = `parede:${material}`;
  if (!texturas.has(chave)) texturas.set(chave, GERADORES_PAREDE[material]());
  return texturas.get(chave)!;
}
