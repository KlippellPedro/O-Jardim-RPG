// Água e lava do mapa montado no construtor ganham movimento na mesa: a imagem publicada tem
// o desenho parado, e por cima das casas desses materiais corre devagar uma textura de brilho
// (reflexos na água, veios acesos na lava). Fica embaixo da névoa, que a cobre para o jogador.

import { Container, Graphics, Texture, TilingSprite } from 'pixi.js';

const LADO = 256;

interface Camada {
  sprite: TilingSprite;
  vx: number;
  vy: number;
}

interface Liquido {
  raiz: Container;
  mascara: Graphics;
  camadas: Camada[];
  pulsa: boolean;
}

let texturas: { agua: Texture; lava: Texture } | null = null;

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

/** Desenha nas nove posições para a textura emendar dos quatro lados. */
function emendado(desenhar: (dx: number, dy: number) => void) {
  for (const dx of [-LADO, 0, LADO]) for (const dy of [-LADO, 0, LADO]) desenhar(dx, dy);
}

function criarTexturas(): { agua: Texture; lava: Texture } {
  const agua = document.createElement('canvas');
  agua.width = agua.height = LADO;
  const a = agua.getContext('2d')!;
  const sorteA = sorteador(17);
  a.lineCap = 'round';
  // Reflexos: traços curvos claros e finos, de vários tamanhos.
  for (let i = 0; i < 70; i++) {
    const x = sorteA() * LADO;
    const y = sorteA() * LADO;
    const comprimento = 10 + sorteA() * 34;
    const curva = (sorteA() - 0.5) * 14;
    a.strokeStyle = `rgba(220, 245, 255, ${0.25 + sorteA() * 0.4})`;
    a.lineWidth = 1 + sorteA() * 1.6;
    emendado((dx, dy) => {
      a.beginPath();
      a.moveTo(x + dx, y + dy);
      a.quadraticCurveTo(x + dx + comprimento / 2, y + dy + curva, x + dx + comprimento, y + dy);
      a.stroke();
    });
  }
  const lava = document.createElement('canvas');
  lava.width = lava.height = LADO;
  const l = lava.getContext('2d')!;
  const sorteL = sorteador(29);
  // Veios acesos: manchas macias de laranja a amarelo.
  for (let i = 0; i < 26; i++) {
    const x = sorteL() * LADO;
    const y = sorteL() * LADO;
    const raio = 12 + sorteL() * 30;
    emendado((dx, dy) => {
      const gradiente = l.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, raio);
      gradiente.addColorStop(0, 'rgba(255, 230, 120, 0.85)');
      gradiente.addColorStop(0.45, 'rgba(255, 120, 30, 0.45)');
      gradiente.addColorStop(1, 'rgba(255, 60, 0, 0)');
      l.fillStyle = gradiente;
      l.fillRect(x + dx - raio, y + dy - raio, raio * 2, raio * 2);
    });
  }
  const resultado = { agua: Texture.from(agua), lava: Texture.from(lava) };
  // São de todos os palcos (como o brilho das luzes): o palco, ao fechar, não pode destruí-las.
  resultado.agua.destroy = () => {};
  resultado.lava.destroy = () => {};
  return resultado;
}

function movimentoReduzido(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

export class CamadaLiquidos {
  readonly raiz = new Container();
  private liquidos = new Map<'agua' | 'lava', Liquido>();
  private chave = '';
  private reduzido = movimentoReduzido();

  constructor() {
    this.raiz.eventMode = 'none';
  }

  /** `liquidos`: retângulos [x, y, w, h] em px; a textura cobre duas casas. */
  definir(liquidos: { agua: number[][]; lava: number[][] } | undefined, largura: number, altura: number, casa: number) {
    const chave = `${largura}|${altura}|${casa}|${JSON.stringify(liquidos ?? null)}`;
    if (chave === this.chave) return;
    this.chave = chave;
    for (const liquido of this.liquidos.values()) liquido.raiz.destroy({ children: true });
    this.liquidos.clear();
    if (!liquidos) return;
    texturas ??= criarTexturas();
    const escala = (casa * 2) / LADO;
    for (const tipo of ['agua', 'lava'] as const) {
      const retangulos = liquidos[tipo] ?? [];
      if (!retangulos.length) continue;
      const raiz = new Container();
      const mascara = new Graphics();
      for (const [x, y, w, h] of retangulos) mascara.rect(x, y, w, h);
      mascara.fill(0xffffff);
      const camadas: Camada[] = (tipo === 'agua' ? [[0.012, 0.006, 0.55], [-0.008, 0.01, 0.35]] : [[0.004, -0.003, 0.7]]).map(([vx, vy, alfa]) => {
        const sprite = new TilingSprite({ texture: texturas![tipo], width: largura, height: altura });
        sprite.tileScale.set(escala);
        sprite.alpha = alfa;
        sprite.blendMode = 'add';
        raiz.addChild(sprite);
        return { sprite, vx: vx * casa, vy: vy * casa };
      });
      raiz.addChild(mascara);
      raiz.mask = mascara;
      this.raiz.addChild(raiz);
      this.liquidos.set(tipo, { raiz, mascara, camadas, pulsa: tipo === 'lava' });
    }
  }

  quadro(agora: number) {
    if (this.reduzido || !this.liquidos.size) return;
    const segundos = agora / 1000;
    for (const liquido of this.liquidos.values()) {
      for (const camada of liquido.camadas) {
        camada.sprite.tilePosition.set(camada.vx * segundos * 60, camada.vy * segundos * 60);
      }
      if (liquido.pulsa) liquido.camadas[0].sprite.alpha = 0.55 + 0.25 * Math.sin(segundos * 1.3);
    }
  }
}
