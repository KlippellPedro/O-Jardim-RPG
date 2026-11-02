// Um "palco" é uma tela de mapa: Pixi 8 + pixi-viewport, ladrilhos, grade e
// tokens. A fase 0 monta dois lado a lado (Mestre e Jogador) para medir o
// motor e sentir o arrasto em tempo real com uma rede simulada no meio.

import { Application, Container, Graphics, ImageSource, Sprite, Text, Texture } from 'pixi.js';
import { Viewport } from 'pixi-viewport';
import type { Ladrilho } from './gerarMapa';

export const QUADRADO = 100;

export interface TokenDef {
  id: string;
  nome: string;
  x: number;
  y: number;
  porte: 1 | 2;
  retrato: ImageBitmap;
  cor: number;
}

export interface OpcoesPalco {
  lado: number;
  ladrilhos: Ladrilho[];
  tokens: TokenDef[];
  podeArrastar: boolean;
  /** Motor preferido; o Pixi cai para WebGL sozinho quando não há WebGPU. */
  motor?: 'webgpu' | 'webgl';
  aoArrastar?: (id: string, x: number, y: number) => void;
  aoSoltar?: (id: string, x: number, y: number) => void;
}

export interface Palco {
  app: Application;
  viewport: Viewport;
  renderizador: string;
  /** Duração de cada quadro, em ms, desde a última leitura. */
  quadros: number[];
  tokens: Map<string, Container>;
  /** Move como se o dedo estivesse arrastando (usado pela medição automática). */
  arrastar: (id: string, x: number, y: number) => void;
  soltar: (id: string) => void;
  destruir: () => void;
}

const CORES_BARRAS = [0xe5484d, 0x3e63dd, 0x30a46c, 0x8e4ec6];

function textura(imagem: ImageBitmap): Texture {
  // Uma fonte por palco: cada Application tem a própria placa de vídeo lógica.
  return new Texture({ source: new ImageSource({ resource: imagem }) });
}

export function encaixar(valor: number, porte: number): number {
  const meio = (porte % 2) * (QUADRADO / 2);
  return Math.round((valor - meio) / QUADRADO) * QUADRADO + meio;
}

function montarToken(def: TokenDef): Container {
  const lado = def.porte * QUADRADO;
  const raio = lado / 2 - 6;
  const token = new Container();
  token.label = def.id;
  token.position.set(def.x, def.y);

  const foto = new Sprite(textura(def.retrato));
  foto.anchor.set(0.5);
  foto.width = raio * 2;
  foto.height = raio * 2;

  const moldura = new Graphics()
    .circle(0, 0, raio + 3).stroke({ width: 6, color: 0xc9a227 })
    .circle(0, 0, raio - 1).stroke({ width: 2, color: def.cor });

  const barras = new Graphics();
  const largura = lado * 0.8;
  CORES_BARRAS.forEach((cor, i) => {
    const y = -lado / 2 - 12 - i * 7;
    barras.rect(-largura / 2, y, largura, 5).fill({ color: 0x000000, alpha: 0.6 });
    barras.rect(-largura / 2, y, largura * (0.35 + ((i * 37 + def.id.length * 11) % 60) / 100), 5).fill(cor);
  });

  const nome = new Text({
    text: def.nome,
    style: { fontFamily: 'system-ui, sans-serif', fontSize: 18, fill: 0xffffff, stroke: { color: 0x000000, width: 4 } },
  });
  nome.anchor.set(0.5, 0);
  nome.y = lado / 2 + 2;

  token.addChild(foto, moldura, barras, nome);
  token.eventMode = 'static';
  token.cursor = 'grab';
  return token;
}

export async function criarPalco(alvo: HTMLElement, opcoes: OpcoesPalco): Promise<Palco> {
  const app = new Application();
  await app.init({
    resizeTo: alvo,
    preference: opcoes.motor ?? 'webgpu',
    antialias: true,
    background: '#0b0b10',
    autoDensity: true,
    resolution: window.devicePixelRatio || 1,
  });
  alvo.appendChild(app.canvas);

  const { lado } = opcoes;
  const viewport = new Viewport({
    screenWidth: alvo.clientWidth,
    screenHeight: alvo.clientHeight,
    worldWidth: lado,
    worldHeight: lado,
    events: app.renderer.events,
    passiveWheel: false,
  });
  viewport.drag().pinch().wheel().decelerate({ friction: 0.92 }).clampZoom({ minScale: 0.06, maxScale: 3 });
  app.stage.addChild(viewport);
  app.renderer.on('resize', (w: number, h: number) => viewport.resize(w, h, lado, lado));

  const camadaMapa = new Container();
  for (const ladrilho of opcoes.ladrilhos) {
    const sprite = new Sprite(textura(ladrilho.imagem));
    sprite.position.set(ladrilho.x, ladrilho.y);
    camadaMapa.addChild(sprite);
  }

  const grade = new Graphics();
  for (let i = 0; i <= lado; i += QUADRADO) {
    grade.moveTo(i, 0).lineTo(i, lado);
    grade.moveTo(0, i).lineTo(lado, i);
  }
  grade.stroke({ width: 2, color: 0xffffff, alpha: 0.16 });

  const camadaTokens = new Container();
  viewport.addChild(camadaMapa, grade, camadaTokens);

  const tokens = new Map<string, Container>();
  const portes = new Map<string, number>();
  for (const def of opcoes.tokens) {
    const token = montarToken(def);
    tokens.set(def.id, token);
    portes.set(def.id, def.porte);
    camadaTokens.addChild(token);
  }

  // Arrasto com o mouse: o token anda sob o cursor, encaixa na grade ao soltar.
  let arrastado: Container | null = null;
  const deslocamento = { x: 0, y: 0 };
  app.stage.eventMode = 'static';
  app.stage.hitArea = app.screen;

  if (opcoes.podeArrastar) {
    for (const token of tokens.values()) {
      token.on('pointerdown', (evento) => {
        evento.stopPropagation();
        arrastado = token;
        const ponto = viewport.toWorld(evento.global);
        deslocamento.x = ponto.x - token.x;
        deslocamento.y = ponto.y - token.y;
        viewport.plugins.pause('drag');
        viewport.plugins.pause('decelerate');
        camadaTokens.addChild(token);
        token.cursor = 'grabbing';
      });
    }
  }

  const arrastar = (id: string, x: number, y: number) => {
    const token = tokens.get(id);
    if (!token) return;
    token.position.set(x, y);
    opcoes.aoArrastar?.(id, x, y);
  };

  const soltar = (id: string) => {
    const token = tokens.get(id);
    if (!token) return;
    const porte = portes.get(id) ?? 1;
    token.position.set(encaixar(token.x, porte), encaixar(token.y, porte));
    opcoes.aoSoltar?.(id, token.x, token.y);
  };

  app.stage.on('globalpointermove', (evento) => {
    if (!arrastado) return;
    const ponto = viewport.toWorld(evento.global);
    arrastar(arrastado.label, ponto.x - deslocamento.x, ponto.y - deslocamento.y);
  });
  const terminar = () => {
    if (!arrastado) return;
    arrastado.cursor = 'grab';
    soltar(arrastado.label);
    arrastado = null;
    viewport.plugins.resume('drag');
    viewport.plugins.resume('decelerate');
  };
  app.stage.on('pointerup', terminar);
  app.stage.on('pointerupoutside', terminar);

  viewport.setZoom(0.12, true);
  viewport.moveCenter(lado / 2, lado / 2);

  const quadros: number[] = [];
  app.ticker.add((ticker) => {
    quadros.push(ticker.deltaMS);
    if (quadros.length > 2000) quadros.splice(0, quadros.length - 2000);
  });

  return {
    app,
    viewport,
    renderizador: app.renderer.name,
    quadros,
    tokens,
    arrastar,
    soltar,
    destruir: () => {
      // As imagens são compartilhadas entre os palcos; a placa libera as
      // texturas junto com o renderizador.
      app.destroy({ removeView: true }, { children: true });
    },
  };
}
