// Clima na tela: chuva, tempestade com relâmpago, sombras de nuvens, neve,
// neblina, areia, cinzas e brasas, folhas, calor, escuridão com luz em volta dos
// personagens, véu do Vazio e partículas na cor de um Fluxo. Tudo escrito por
// nós: o emissor de partículas pronto não roda no Pixi 8, e as extensões de
// clima do Owlbear são GPL-3.0 (servem só de referência visual).
//
// Chuva, nuvens, relâmpago e os véus (neblina, poeira, Vazio, Fluxo) são shaders
// (motor/climaShader.ts); neve, folhas, cinzas, brasas e os grãos de areia são
// partículas do ParticleContainer; o calor é um filtro na camada do mapa. Tudo
// mora no mundo do mapa, só no pedaço que está na tela (ou na área marcada pelo
// Mestre): acompanha o zoom e o arrasto, e o custo depende do tamanho da tela,
// nunca do tamanho do mapa. Cada aparelho sorteia as próprias gotas; o que a
// mesa compartilha é só a receita (efeito, intensidade, área e vento).

import {
  Container, Graphics, Particle, ParticleContainer, Rectangle, RenderTexture, Sprite, Texture, type Filter, type Renderer,
} from 'pixi.js';
import type { IAreaClima, IClima, IEfeitoClima } from '../../../services/mapaApi';
import { CORES_FLUXO, type FluxoId } from './molduras';
import { Atmosfera, FiltroCalor, type ReceitaAtmosfera } from './climaShader';
import type { FonteDeLuz } from './luzes';

export interface QuadroClima {
  /** Segundos desde o quadro anterior (limitado, para uma aba que volta do fundo não dar um salto). */
  dt: number;
  agora: number;
  /** Pedaço do mapa que está na tela. */
  vista: Rectangle;
  escala: number;
  /** Tokens com luz própria e personagens de jogador e aliados: a escuridão abre luz em volta deles. */
  luzes: FonteDeLuz[];
  tamanhoCasa: number;
}

interface Vento {
  x: number;
  y: number;
  forca: number;
}

interface Efeito {
  readonly raiz: Container;
  readonly tipo: IEfeitoClima['tipo'];
  ajustar(efeito: IEfeitoClima): void;
  /** Filtro que o efeito põe na camada do mapa (o calor). */
  readonly filtro?: Filter;
  /** O Mestre mudou o vento: as partículas que já estão na tela passam a seguir o novo. */
  ventoMudou?(vento: Vento): void;
  atualizar(quadro: QuadroClima, vento: Vento): void;
  destruir(): void;
}

function movimentoReduzido(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function recorte(vista: Rectangle, area: IAreaClima | null): Rectangle | null {
  if (!area) return vista;
  const x0 = Math.max(vista.x, area.x);
  const y0 = Math.max(vista.y, area.y);
  const x1 = Math.min(vista.right, area.x + area.w);
  const y1 = Math.min(vista.bottom, area.y + area.h);
  return x1 > x0 && y1 > y0 ? new Rectangle(x0, y0, x1 - x0, y1 - y0) : null;
}

const aleatorio = (min: number, max: number) => min + Math.random() * (max - min);
const escolher = <T,>(lista: readonly T[]): T => lista[Math.floor(Math.random() * lista.length)];

// ------------------------------------------------------------- texturas

/** Um atlas só para todas as partículas: o ParticleContainer exige a mesma imagem de base. */
interface Atlas {
  gota: Texture;
  floco: Texture;
  folhas: Texture[];
  cinza: Texture;
  grao: Texture;
  brilho: Texture;
}

let atlas: Atlas | null = null;
let luz: Texture | null = null;
let borda: Texture | null = null;
/** Texturas da escuridão que saiu de cena, para a próxima reaproveitar: destruir uma textura que
 * o último quadro desenhou deixa o Pixi reclamando no console. */
const texturasGuardadas: RenderTexture[] = [];

function pegarTextura(largura: number, altura: number): RenderTexture {
  const guardada = texturasGuardadas.pop();
  if (!guardada) return RenderTexture.create({ width: largura, height: altura, resolution: 1 });
  if (guardada.width !== largura || guardada.height !== altura) guardada.source.resize(largura, altura);
  return guardada;
}

function tela(largura: number, altura: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = largura;
  canvas.height = altura;
  return [canvas, canvas.getContext('2d')!];
}

function circuloSuave(ctx: CanvasRenderingContext2D, cx: number, cy: number, raio: number, miolo = 0.15) {
  const gradiente = ctx.createRadialGradient(cx, cy, 0, cx, cy, raio);
  gradiente.addColorStop(0, 'rgba(255,255,255,1)');
  gradiente.addColorStop(miolo, 'rgba(255,255,255,0.9)');
  gradiente.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradiente;
  ctx.beginPath();
  ctx.arc(cx, cy, raio, 0, Math.PI * 2);
  ctx.fill();
}

function obterAtlas(): Atlas {
  if (atlas) return atlas;
  // Fileira de quadros de 32 px; a gota é uma faixa alta à direita.
  const [canvas, ctx] = tela(256, 64);
  // Floco e brilho: pontos suaves (brilho com o miolo mais forte, para somar luz).
  circuloSuave(ctx, 16, 16, 15, 0.25);
  circuloSuave(ctx, 48, 16, 15, 0.05);
  // Três folhas: elipse pontuda com a nervura do meio.
  const folha = (cx: number, alongada: number, curva: number) => {
    ctx.save();
    ctx.translate(cx, 48);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(0, -14);
    ctx.quadraticCurveTo(alongada, curva, 0, 14);
    ctx.quadraticCurveTo(-alongada, -curva, 0, -14);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.lineTo(0, 13);
    ctx.stroke();
    ctx.restore();
  };
  folha(16, 11, 0);
  folha(48, 8, 4);
  folha(80, 13, -3);
  // Cinza: lasca irregular.
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(100, 8);
  ctx.lineTo(108, 6);
  ctx.lineTo(116, 12);
  ctx.lineTo(110, 22);
  ctx.lineTo(101, 20);
  ctx.closePath();
  ctx.fill();
  // Grão de areia: risco curto e macio, em pé como a gota (as duas giram para onde andam).
  const grao = ctx.createLinearGradient(0, 0, 0, 32);
  grao.addColorStop(0, 'rgba(255,255,255,0)');
  grao.addColorStop(0.7, 'rgba(255,255,255,0.95)');
  grao.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grao;
  ctx.fillRect(134, 0, 4, 32);
  // Gota: risco vertical que clareia para baixo.
  const gota = ctx.createLinearGradient(0, 0, 0, 64);
  gota.addColorStop(0, 'rgba(255,255,255,0)');
  gota.addColorStop(1, 'rgba(255,255,255,0.85)');
  ctx.fillStyle = gota;
  ctx.fillRect(244, 0, 3, 64);
  const base = Texture.from(canvas);
  const quadro = (x: number, y: number, w: number, h: number) => new Texture({ source: base.source, frame: new Rectangle(x, y, w, h) });
  atlas = {
    floco: quadro(0, 0, 32, 32),
    brilho: quadro(32, 0, 32, 32),
    folhas: [quadro(0, 32, 32, 32), quadro(32, 32, 32, 32), quadro(64, 32, 32, 32)],
    cinza: quadro(96, 0, 32, 32),
    grao: quadro(128, 0, 16, 32),
    gota: quadro(240, 0, 10, 64),
  };
  return atlas;
}

/** Máscara da área marcada: branco no meio e borda que some aos poucos, para o efeito não terminar num risco reto. */
function obterBorda(): Texture {
  if (borda) return borda;
  const lado = 256;
  const faixa = 40;
  const [canvas, ctx] = tela(lado, lado);
  const imagem = ctx.createImageData(lado, lado);
  for (let y = 0; y < lado; y++) {
    for (let x = 0; x < lado; x++) {
      const distancia = Math.min(x, y, lado - 1 - x, lado - 1 - y);
      const t = Math.min(1, distancia / faixa);
      const i = (y * lado + x) * 4;
      imagem.data[i] = 255;
      imagem.data[i + 1] = 255;
      imagem.data[i + 2] = 255;
      imagem.data[i + 3] = Math.round(t * t * (3 - 2 * t) * 255);
    }
  }
  ctx.putImageData(imagem, 0, 0);
  borda = Texture.from(canvas);
  return borda;
}

export function obterLuz(): Texture {
  if (luz) return luz;
  const [canvas, ctx] = tela(256, 256);
  const gradiente = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  gradiente.addColorStop(0, 'rgba(255,255,255,1)');
  gradiente.addColorStop(0.55, 'rgba(255,255,255,0.85)');
  gradiente.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradiente;
  ctx.fillRect(0, 0, 256, 256);
  luz = Texture.from(canvas);
  return luz;
}

/** Chamado depois de desmontar o renderizador. */
export function esquecerTexturasDoClima() {
  for (const textura of [atlas?.floco, luz, borda, ...texturasGuardadas.splice(0)]) {
    try {
      textura?.destroy(true);
    } catch {
      // Já foi junto com o palco.
    }
  }
  atlas = null;
  luz = null;
  borda = null;
}

// ----------------------------------------------------------- partículas

interface Gota {
  p: Particle;
  vx: number;
  vy: number;
  /** Lado maior na tela com zoom 1, em px. */
  tamanho: number;
  /** Lado maior do quadro da textura, para converter o tamanho em escala. */
  lado: number;
  alfa: number;
  fase: number;
  giro: number;
}

interface Receita {
  /** Partículas por megapixel de tela com intensidade 1. */
  densidade: number;
  maximo: number;
  blend?: 'normal' | 'add';
  textura: (a: Atlas) => Texture;
  /** Velocidade (px/s na tela com zoom 1), tamanho e cor de cada partícula nova. */
  nascer: (g: Gota, vento: Vento) => void;
  /** Acréscimos de cada quadro: balanço, giro, cintilar. */
  mover?: (g: Gota, dt: number, agora: number, vento: Vento) => void;
  /** Gira a partícula para a direção em que anda (chuva, areia). */
  orientar?: boolean;
}

class Particulas {
  readonly raiz: ParticleContainer;
  private gotas: Gota[] = [];
  private ultimaVista: Rectangle | null = null;
  private receita: Receita;
  private cor: number | null = null;
  /** O ParticleContainer não mede as partículas: sem estes limites, o recorte suave da área não o enxerga. */
  private limites = new Rectangle();
  intensidade = 0.5;

  constructor(receita: Receita) {
    this.receita = receita;
    this.raiz = new ParticleContainer({ dynamicProperties: { position: true, rotation: true, vertex: true, color: true, uvs: false } });
    this.raiz.blendMode = receita.blend ?? 'normal';
    this.raiz.boundsArea = this.limites;
  }

  private nova(vista: Rectangle, vento: Vento): Gota {
    const a = obterAtlas();
    const textura = this.receita.textura(a);
    const p = new Particle({ texture: textura, x: aleatorio(vista.x, vista.right), y: aleatorio(vista.y, vista.bottom), anchorX: 0.5, anchorY: 0.5 });
    const g: Gota = { p, vx: 0, vy: 0, tamanho: 1, lado: Math.max(textura.frame.width, textura.frame.height), alfa: 1, fase: Math.random() * Math.PI * 2, giro: 0 };
    this.receita.nascer(g, vento);
    p.alpha = g.alfa;
    if (this.cor !== null) p.tint = this.cor;
    this.raiz.addParticle(p);
    return g;
  }

  atualizar(vista: Rectangle, escala: number, dt: number, agora: number, vento: Vento, reducao: number) {
    const fator = 1 / Math.sqrt(escala);
    const megapixels = (vista.width * escala * vista.height * escala) / 1e6;
    const alvo = Math.min(this.receita.maximo, Math.round(this.receita.densidade * this.intensidade * megapixels * reducao));
    // A vista pulou (zoom grande, outra parte do mapa): espalha de novo em vez de esperar as partículas chegarem.
    const anterior = this.ultimaVista;
    const pulou = !anterior || vista.width > anterior.width * 1.6 || vista.width < anterior.width * 0.6
      || vista.x > anterior.right || vista.right < anterior.x || vista.y > anterior.bottom || vista.bottom < anterior.y;
    this.ultimaVista = vista.clone();
    while (this.gotas.length < alvo) this.gotas.push(this.nova(vista, vento));
    while (this.gotas.length > alvo) this.raiz.removeParticle(this.gotas.pop()!.p);
    const margem = 60 * fator;
    const x0 = vista.x - margem;
    const y0 = vista.y - margem;
    const largura = vista.width + margem * 2;
    const altura = vista.height + margem * 2;
    this.limites.x = x0;
    this.limites.y = y0;
    this.limites.width = largura;
    this.limites.height = altura;
    for (const g of this.gotas) {
      const p = g.p;
      if (pulou) {
        p.x = aleatorio(x0, x0 + largura);
        p.y = aleatorio(y0, y0 + altura);
      }
      this.receita.mover?.(g, dt, agora, vento);
      p.x += g.vx * fator * dt;
      p.y += g.vy * fator * dt;
      // Saiu por um lado, volta pelo outro num lugar sorteado do outro eixo.
      if (p.x < x0 || p.x > x0 + largura) {
        p.x = p.x < x0 ? x0 + largura : x0;
        p.y = aleatorio(y0, y0 + altura);
      }
      if (p.y < y0 || p.y > y0 + altura) {
        p.y = p.y < y0 ? y0 + altura : y0;
        p.x = aleatorio(x0, x0 + largura);
      }
      const tamanho = (g.tamanho * fator) / g.lado;
      if (this.receita.orientar) {
        p.rotation = Math.atan2(g.vy, g.vx) - Math.PI / 2;
        p.scaleX = tamanho * 1.2;
        p.scaleY = tamanho;
      } else {
        p.scaleX = this.receita.mover && g.giro ? tamanho * Math.cos(agora / 600 + g.fase) : tamanho;
        p.scaleY = tamanho;
      }
    }
  }

  renascer(vento: Vento) {
    for (const g of this.gotas) {
      this.receita.nascer(g, vento);
      g.p.alpha = g.alfa;
      if (this.cor !== null) g.p.tint = this.cor;
    }
  }

  /** Partículas do Fluxo: a cor escolhida pelo Mestre vale para todas, as novas e as que já estão na tela. */
  definirCor(cor: number) {
    this.cor = cor;
    for (const g of this.gotas) g.p.tint = cor;
  }

  destruir() {
    this.raiz.destroy({ children: true });
    this.gotas = [];
  }
}

const RECEITAS = {
  neve: {
    densidade: 260, maximo: 900, textura: (a) => a.floco,
    nascer: (g, v) => {
      g.vy = aleatorio(45, 110);
      g.vx = v.x * 140 * (0.3 + v.forca);
      g.tamanho = aleatorio(4, 11);
      g.alfa = aleatorio(0.55, 0.95);
    },
    mover: (g, dt, agora) => {
      g.p.x += Math.sin(agora / 900 + g.fase) * 18 * dt;
    },
  },
  folhas: {
    densidade: 28, maximo: 140, textura: (a) => escolher(a.folhas),
    nascer: (g, v) => {
      g.vy = aleatorio(35, 85);
      g.vx = v.x * 230 * (0.3 + v.forca) + aleatorio(-15, 15);
      g.tamanho = aleatorio(16, 28);
      g.alfa = aleatorio(0.8, 1);
      g.giro = aleatorio(-2.2, 2.2);
      g.p.tint = escolher([0x6aa84f, 0x93c47d, 0xe69138, 0xb45f06, 0xcc4125, 0xd9a23f]);
    },
    mover: (g, dt, agora) => {
      g.p.rotation += g.giro * dt;
      g.p.x += Math.sin(agora / 700 + g.fase) * 35 * dt;
    },
  },
  cinzas: {
    densidade: 160, maximo: 600, textura: (a) => a.cinza,
    nascer: (g, v) => {
      g.vy = aleatorio(25, 65);
      g.vx = v.x * 120 * (0.3 + v.forca);
      g.tamanho = aleatorio(4, 9);
      g.alfa = aleatorio(0.45, 0.85);
      g.giro = aleatorio(-1.5, 1.5);
      g.p.tint = escolher([0x6b6b6b, 0x8a8a8a, 0xa7a29c, 0x4d4a48]);
    },
    mover: (g, dt, agora) => {
      g.p.rotation += g.giro * dt;
      g.p.x += Math.sin(agora / 800 + g.fase) * 14 * dt;
    },
  },
  brasas: {
    densidade: 45, maximo: 200, blend: 'add', textura: (a) => a.brilho,
    nascer: (g, v) => {
      g.vy = -aleatorio(30, 80);
      g.vx = v.x * 90 * (0.3 + v.forca) + aleatorio(-12, 12);
      g.tamanho = aleatorio(4, 10);
      g.alfa = aleatorio(0.6, 1);
      g.p.tint = escolher([0xff8a3d, 0xffb347, 0xff5e2b]);
    },
    mover: (g, _dt, agora) => {
      g.p.alpha = g.alfa * (0.55 + 0.45 * Math.sin(agora / 140 + g.fase * 3));
    },
  },
  areia: {
    densidade: 240, maximo: 700, textura: (a) => a.grao, orientar: true,
    nascer: (g, v) => {
      // Sem vento, a areia corre para a direita mesmo assim.
      const forca = Math.max(0.35, v.forca);
      const angulo = v.forca > 0.02 ? Math.atan2(v.y, v.x) : 0;
      const velocidade = aleatorio(500, 800) * (0.6 + forca);
      g.vx = Math.cos(angulo) * velocidade;
      g.vy = Math.sin(angulo) * velocidade + aleatorio(-25, 25);
      g.tamanho = aleatorio(10, 20);
      g.alfa = aleatorio(0.35, 0.75);
      g.p.tint = escolher([0xd8b27a, 0xc89b5f, 0xe6c896]);
    },
  },
  vazio: {
    densidade: 90, maximo: 320, textura: (a) => a.floco,
    nascer: (g) => {
      g.vy = -aleatorio(8, 26);
      g.vx = aleatorio(-10, 10);
      g.tamanho = aleatorio(10, 26);
      g.alfa = aleatorio(0.35, 0.7);
      g.p.tint = escolher([0x140a22, 0x24123b, 0x0b0612]);
    },
    mover: (g, _dt, agora) => {
      g.p.alpha = g.alfa * (0.5 + 0.5 * Math.sin(agora / 1300 + g.fase));
    },
  },
  fluxo: {
    densidade: 110, maximo: 380, blend: 'add', textura: (a) => a.brilho,
    nascer: (g, v) => {
      g.vy = aleatorio(-22, 10);
      g.vx = aleatorio(-14, 14) + v.x * 40 * v.forca;
      g.tamanho = aleatorio(5, 13);
      g.alfa = aleatorio(0.5, 0.95);
    },
    mover: (g, dt, agora) => {
      g.p.alpha = g.alfa * (0.4 + 0.6 * Math.sin(agora / 650 + g.fase * 2));
      g.p.x += Math.sin(agora / 1100 + g.fase) * 10 * dt;
    },
  },
} satisfies Record<string, Receita>;

// ------------------------------------------------------------ shaders

function corDoFluxo(fluxo: string | undefined): [number, number, number] {
  const valor = Number.parseInt((CORES_FLUXO[fluxo as FluxoId] ?? '#ffffff').slice(1), 16);
  return [((valor >> 16) & 255) / 255, ((valor >> 8) & 255) / 255, (valor & 255) / 255];
}

/** O que cada efeito pede ao shader da atmosfera, já com a intensidade escolhida pelo Mestre. */
function receitaAtmosfera(efeito: IEfeitoClima): ReceitaAtmosfera | null {
  const i = efeito.intensidade;
  switch (efeito.tipo) {
    case 'chuva':
      return {
        chuva: { densidade: 0.18 + 0.3 * i, velocidade: 950, comprimento: 1, respingos: 0.05 + 0.1 * i, cor: [0.74, 0.82, 0.9] },
        nuvem: { cobertura: 0.15 + 0.25 * i, sombra: 0.16, escala: 30, escurecer: 0.04 + 0.06 * i },
      };
    case 'tempestade':
      return {
        chuva: { densidade: 0.3 + 0.35 * i, velocidade: 1350, comprimento: 1.3, respingos: 0.1 + 0.14 * i, cor: [0.7, 0.78, 0.88] },
        nuvem: { cobertura: 0.35 + 0.4 * i, sombra: 0.32, escala: 26, escurecer: 0.12 + 0.16 * i },
      };
    case 'nuvens':
      return { nuvem: { cobertura: 0.25 + 0.65 * i, sombra: 0.18 + 0.32 * i, escala: 34, escurecer: 0 } };
    case 'neblina':
      return { veu: { alfa: 0.25 + 0.5 * i, escala: 18, velocidade: 0.02, listras: 0, cor: [0.88, 0.9, 0.93], modo: 0, borda: [0.1, 0.95], torcao: 0.45, fundo: 0.3 } };
    case 'areia':
      return { veu: { alfa: 0.22 + 0.45 * i, escala: 9, velocidade: 0.35, listras: 1, cor: [0.79, 0.64, 0.42], modo: 0, borda: [0.3, 0.82], torcao: 0.8, fundo: 0.15 } };
    case 'vazio':
      return { veu: { alfa: 0.35 + 0.5 * i, escala: 14, velocidade: 0.015, listras: 0, cor: [0.1, 0.045, 0.19], modo: 2, borda: [0.15, 0.92], torcao: 0.6, fundo: 0.25 } };
    case 'fluxo':
      return { veu: { alfa: 0.1 + 0.2 * i, escala: 18, velocidade: 0.015, listras: 0, cor: corDoFluxo(efeito.fluxo), modo: 1, borda: [0.3, 0.85], torcao: 0.8, fundo: 0 } };
    default:
      return null;
  }
}

// ------------------------------------------------------------- efeitos

class EfeitoComposto implements Efeito {
  readonly raiz = new Container();
  readonly tipo: IEfeitoClima['tipo'];
  private area: IAreaClima | null = null;
  private intensidade = 0.5;
  private particulas: Particulas[] = [];
  private atmosfera: Atmosfera | null = null;
  private relampeja = false;
  /** Relógio próprio dos shaders: anda mais devagar para quem pede menos movimento. */
  private relogio = Math.random() * 100;
  private proximoRaio = 0;
  private inicioRaio = -1e9;
  private mascara: Sprite | null = null;
  private reducao: number;
  private semClarao: boolean;

  constructor(efeito: IEfeitoClima) {
    this.tipo = efeito.tipo;
    const reduzido = movimentoReduzido();
    this.reducao = reduzido ? 0.5 : 1;
    this.semClarao = reduzido;
    const somar = (receita: Receita) => {
      const p = new Particulas(receita);
      this.particulas.push(p);
      this.raiz.addChild(p.raiz);
    };
    if (receitaAtmosfera(efeito)) {
      this.atmosfera = new Atmosfera();
      this.raiz.addChild(this.atmosfera.malha);
    }
    this.relampeja = efeito.tipo === 'tempestade';
    switch (efeito.tipo) {
      case 'neve':
        somar(RECEITAS.neve);
        break;
      case 'areia':
        somar(RECEITAS.areia);
        break;
      case 'cinzas':
        somar(RECEITAS.cinzas);
        somar(RECEITAS.brasas);
        break;
      case 'folhas':
        somar(RECEITAS.folhas);
        break;
      case 'vazio':
        somar(RECEITAS.vazio);
        break;
      case 'fluxo':
        somar(RECEITAS.fluxo);
        break;
      default:
        break;
    }
    this.ajustar(efeito);
  }

  ajustar(efeito: IEfeitoClima) {
    this.area = efeito.area;
    this.intensidade = efeito.intensidade;
    // Numa área, o efeito some aos poucos perto da borda.
    if (efeito.area) {
      if (!this.mascara) {
        this.mascara = new Sprite(obterBorda());
        this.raiz.addChild(this.mascara);
        this.raiz.mask = this.mascara;
      }
      this.mascara.position.set(efeito.area.x, efeito.area.y);
      this.mascara.width = efeito.area.w;
      this.mascara.height = efeito.area.h;
    } else if (this.mascara) {
      this.raiz.mask = null;
      this.mascara.destroy();
      this.mascara = null;
    }
    for (const p of this.particulas) p.intensidade = efeito.intensidade;
    const receita = receitaAtmosfera(efeito);
    if (receita) this.atmosfera?.definir(receita);
    if (efeito.tipo === 'fluxo') {
      const cor = Number.parseInt((CORES_FLUXO[efeito.fluxo as FluxoId] ?? '#ffffff').slice(1), 16);
      for (const p of this.particulas) p.definirCor(cor);
    }
  }

  ventoMudou(vento: Vento) {
    for (const p of this.particulas) p.renascer(vento);
  }

  atualizar(quadro: QuadroClima, vento: Vento) {
    const vista = recorte(quadro.vista, this.area);
    this.raiz.visible = vista !== null;
    if (!vista) return;
    for (const p of this.particulas) p.atualizar(vista, quadro.escala, quadro.dt, quadro.agora, vento, this.reducao);
    this.relogio += quadro.dt * (this.reducao < 1 ? 0.4 : 1);
    const clarao = this.relampeja ? this.relampejar(quadro.agora) : 0;
    this.atmosfera?.atualizar(vista, this.relogio, quadro.escala, quadro.tamanhoCasa, vento, clarao);
  }

  /** Luz do relâmpago (mais forte onde as nuvens abrem), com um segundo piscar logo depois.
   * Desligado para quem pede menos movimento. */
  private relampejar(agora: number): number {
    if (this.semClarao) return 0;
    if (!this.proximoRaio) this.proximoRaio = agora + aleatorio(2500, 7000);
    if (agora >= this.proximoRaio) {
      this.inicioRaio = agora;
      this.proximoRaio = agora + aleatorio(4000, 13000) / (0.4 + this.intensidade);
    }
    const t = agora - this.inicioRaio;
    if (t > 600) return 0;
    const pico = (centro: number, largura: number) => Math.max(0, 1 - Math.abs(t - centro) / largura);
    return Math.max(pico(40, 90), pico(220, 120) * 0.7) * (0.3 + this.intensidade * 0.3);
  }

  destruir() {
    for (const p of this.particulas) p.destruir();
    this.atmosfera?.destruir();
    this.raiz.destroy({ children: true });
  }
}

/** Calor: o mapa treme como ar quente subindo. Os tokens ficam firmes (o filtro vai só no mapa e na grade). */
class EfeitoCalor implements Efeito {
  readonly raiz = new Container();
  readonly tipo = 'calor' as const;
  private calor = new FiltroCalor();
  private efeito: IEfeitoClima;
  private relogio = Math.random() * 100;
  private reducao = movimentoReduzido() ? 0.4 : 1;

  constructor(efeito: IEfeitoClima) {
    this.efeito = efeito;
  }

  get filtro(): Filter {
    return this.calor.filtro;
  }

  ajustar(efeito: IEfeitoClima) {
    this.efeito = efeito;
  }

  atualizar(quadro: QuadroClima) {
    this.relogio += quadro.dt * this.reducao;
    this.calor.atualizar(this.relogio, this.efeito.intensidade * this.reducao, quadro.tamanhoCasa, quadro.vista, quadro.escala, this.efeito.area);
  }

  destruir() {
    this.calor.destruir();
    this.raiz.destroy({ children: true });
  }
}

/** Escuridão: cobre o mapa (ou a área) e abre luz em volta de cada token com luz própria (no alcance dela,
 * tremendo junto com a chama) e de cada personagem de jogador e aliado (no alcance padrão do efeito). */
class EfeitoEscuridao implements Efeito {
  readonly raiz = new Container();
  readonly tipo = 'escuridao' as const;
  private sprite = new Sprite();
  private textura: RenderTexture | null = null;
  private renderer: Renderer;
  private efeito: IEfeitoClima;
  private chave = '';
  private largura: number;
  private altura: number;
  private gestor: boolean;

  constructor(efeito: IEfeitoClima, renderer: Renderer, largura: number, altura: number, gestor: boolean) {
    this.efeito = efeito;
    this.renderer = renderer;
    this.largura = Math.max(1, largura);
    this.altura = Math.max(1, altura);
    this.gestor = gestor;
    this.raiz.addChild(this.sprite);
  }

  ajustar(efeito: IEfeitoClima) {
    this.efeito = efeito;
    this.chave = '';
  }

  atualizar(quadro: QuadroClima) {
    const padrao = (this.efeito.luz ?? 4) * quadro.tamanhoCasa;
    const raioDe = (fonte: FonteDeLuz) => fonte.raio ?? padrao;
    // Repinta só quando uma luz andou, tremeu ou mudou (ou o Mestre mexeu no efeito).
    const chave = `${this.efeito.intensidade}|${padrao}|${JSON.stringify(this.efeito.area)}|${quadro.luzes.map((l) => `${Math.round(l.x / 4)},${Math.round(l.y / 4)},${Math.round(raioDe(l) / 3)}`).join(';')}`;
    if (chave === this.chave) return;
    this.chave = chave;
    const escala = Math.min(1, 1024 / Math.max(this.largura, this.altura));
    const w = Math.ceil(this.largura * escala);
    const h = Math.ceil(this.altura * escala);
    if (!this.textura) this.textura = pegarTextura(w, h);
    else if (this.textura.width !== w || this.textura.height !== h) this.textura.source.resize(w, h);
    const desenho = new Container();
    desenho.scale.set(escala);
    const area = this.efeito.area ?? { x: 0, y: 0, w: this.largura, h: this.altura };
    desenho.addChild(new Graphics().rect(area.x, area.y, area.w, area.h).fill({ color: 0x000000, alpha: 0.5 + this.efeito.intensidade * 0.45 }));
    for (const fonte of quadro.luzes) {
      const raio = raioDe(fonte);
      if (raio <= 0) continue;
      const brilho = new Sprite({ texture: obterLuz(), anchor: 0.5 });
      brilho.position.set(fonte.x, fonte.y);
      brilho.width = raio * 2;
      brilho.height = raio * 2;
      brilho.blendMode = 'erase';
      desenho.addChild(brilho);
    }
    this.renderer.render({ container: desenho, target: this.textura, clear: true });
    desenho.destroy({ children: true });
    this.sprite.texture = this.textura;
    this.sprite.scale.set(this.largura / w, this.altura / h);
    // O Mestre enxerga através da escuridão para conduzir a cena.
    this.sprite.alpha = this.gestor ? 0.55 : 1;
  }

  destruir() {
    this.sprite.texture = Texture.EMPTY;
    if (this.textura) texturasGuardadas.push(this.textura);
    this.textura = null;
    this.raiz.destroy({ children: true });
  }
}

// -------------------------------------------------------------- camada

export class CamadaClima {
  readonly raiz = new Container();
  private renderer: Renderer;
  /** Camada do mapa e da grade: é ela que treme com o calor. */
  private alvoDoCalor: Container;
  private efeitos: Efeito[] = [];
  private vento: Vento = { x: 0, y: 0, forca: 0 };
  private origem: IClima | null = null;
  private largura = 1;
  private altura = 1;
  private gestor = false;
  private ligado = true;

  constructor(renderer: Renderer, alvoDoCalor: Container) {
    this.renderer = renderer;
    this.alvoDoCalor = alvoDoCalor;
    this.raiz.eventMode = 'none';
  }

  /** Efeitos desligados neste aparelho (escolha de quem está olhando). */
  definirLigado(ligado: boolean) {
    this.ligado = ligado;
    this.raiz.visible = ligado && this.efeitos.length > 0;
    this.aplicarFiltros();
  }

  private aplicarFiltros() {
    const filtros = this.ligado ? this.efeitos.flatMap((efeito) => (efeito.filtro ? [efeito.filtro] : [])) : [];
    this.alvoDoCalor.filters = filtros.length ? filtros : null;
  }

  definir(clima: IClima | null, largura: number, altura: number, gestor: boolean) {
    if (clima === this.origem && largura === this.largura && altura === this.altura && gestor === this.gestor) return;
    const mudouCena = largura !== this.largura || altura !== this.altura || gestor !== this.gestor;
    this.origem = clima;
    this.largura = largura;
    this.altura = altura;
    this.gestor = gestor;
    const lista = clima?.efeitos ?? [];
    const radianos = ((clima?.vento.direcao ?? 0) * Math.PI) / 180;
    const forca = clima?.vento.forca ?? 0;
    const anterior = this.vento;
    this.vento = { x: Math.cos(radianos) * forca, y: Math.sin(radianos) * forca, forca };
    const ventoMudou = anterior.x !== this.vento.x || anterior.y !== this.vento.y;
    // Mesmo efeito no mesmo lugar da lista só se ajusta (o controle desliza sem a chuva recomeçar).
    const novos: Efeito[] = lista.map((efeito, i) => {
      const atual = this.efeitos[i];
      if (atual && atual.tipo === efeito.tipo && !mudouCena) {
        atual.ajustar(efeito);
        if (ventoMudou) atual.ventoMudou?.(this.vento);
        return atual;
      }
      if (efeito.tipo === 'escuridao') return new EfeitoEscuridao(efeito, this.renderer, largura, altura, gestor);
      if (efeito.tipo === 'calor') return new EfeitoCalor(efeito);
      return new EfeitoComposto(efeito);
    });
    const saindo = this.efeitos.filter((antigo) => !novos.includes(antigo));
    this.efeitos = novos;
    // Tira os filtros que saem antes de destruí-los.
    this.aplicarFiltros();
    for (const antigo of saindo) antigo.destruir();
    this.raiz.removeChildren();
    for (const efeito of novos) this.raiz.addChild(efeito.raiz);
    this.raiz.visible = this.ligado && novos.length > 0;
  }

  quadro(quadro: QuadroClima) {
    if (!this.raiz.visible) return;
    for (const efeito of this.efeitos) efeito.atualizar(quadro, this.vento);
  }

  destruir() {
    this.alvoDoCalor.filters = null;
    for (const efeito of this.efeitos) efeito.destruir();
    this.efeitos = [];
  }
}
