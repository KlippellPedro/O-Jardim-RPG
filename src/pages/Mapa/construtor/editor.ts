// O editor do construtor de mapas: um palco Pixi próprio, aberto por cima do mapa da mesa.
// O desenho é o mesmo da publicação (desenho.ts), feito em pedaços de 1024 px do mapa que
// viram texturas; cada mudança redesenha só os pedaços que ela tocou. Por cima, a grade,
// as portas (vivas, como na mesa) e a prévia da ferramenta.

import { Application, Container, Graphics, Sprite, Texture } from 'pixi.js';
import { Viewport } from 'pixi-viewport';
import { desenharAbertura } from '../motor/aberturas';
import { desenharTrecho } from './desenho';
import type { ModeloPeca } from './pecas';
import {
  abrir, adicionarLuz, apagar, apagarLuz, apagarPeca, adicionarPeca, areaEntre, areaMudada, arestaPerto, arestasDaLinha, casasDoPincel, duplicarPeca, editarPeca, fimDaLinha,
  editarLuz, grupoDasPecas, LUZES_PRONTAS, luzPerto, moverNaOrdem, pecasEmOrdem, pintar, pontasDaAresta, porPronta, poremParedes,
  redimensionar, sala,
  type IAreaCasas, type ICasa, type IConteudoProjeto, type ILuzProjeto, type IPecaPronta, type IPecaProjeto, type MaterialChao, type MaterialParede,
} from './projeto';

export type FerramentaConstrutor = 'mao' | 'sala' | 'chao' | 'parede' | 'porta' | 'janela' | 'secreta' | 'borracha' | 'peca' | 'luz';

export interface OpcoesConstrutor {
  chao: MaterialChao;
  parede: MaterialParede;
  /** Lado do pincel e da borracha de chão, em casas. */
  pincel: number;
  borracha: 'chao' | 'paredes';
  peca: ModeloPeca | null;
  escalaPeca: number;
  rotacaoPeca: number;
  espelhadaPeca: boolean;
  /** O atalho de luz (LUZES_PRONTAS) que a ferramenta de luz põe no mapa. */
  luz: string;
  /** Peça pronta escolhida: um clique no mapa põe o grupo inteiro. */
  pronta: IPecaPronta | null;
}

export interface EventosEditor {
  aoMudar: (conteudo: IConteudoProjeto) => void;
  aoHistorico: (podeDesfazer: boolean, podeRefazer: boolean) => void;
  aoSelecionarPeca: (id: string | null) => void;
  aoSelecionarLuz: (id: string | null) => void;
  /** As peças escolhidas (Shift + clique junta mais de uma). */
  aoSelecaoPecas: (ids: string[]) => void;
}

const LADO_PEDACO = 1024;
const MAX_HISTORICO = 80;
/** O editor desenha em até 4096 px no lado maior; mapas maiores ficam um pouco mais suaves de perto. */
const LADO_MAXIMO_EDITOR = 4096;
const PEDACOS_POR_QUADRO = 2;

interface Pedaco {
  sprite: Sprite;
  tela: HTMLCanvasElement;
  textura: Texture;
  x: number;
  y: number;
  w: number;
  h: number;
}

type Gesto =
  | { tipo: 'sala'; antes: IConteudoProjeto; inicio: ICasa; fim: ICasa }
  | { tipo: 'parede'; antes: IConteudoProjeto; inicio: ICasa; fim: ICasa }
  | { tipo: 'peca'; antes: IConteudoProjeto; inicio: { x: number; y: number }; origens: Map<string, { x: number; y: number }> }
  | { tipo: 'luz'; antes: IConteudoProjeto; inicio: { x: number; y: number }; origem: { x: number; y: number }; id: string }
  | { tipo: 'pintura'; antes: IConteudoProjeto; ultimo: { x: number; y: number } | null };

export class EditorConstrutor {
  private camadaPedacos = new Container();
  private grade = new Graphics();
  private portas = new Graphics();
  /** Luzes fixas: um halo no alcance de cada uma (na mesa, elas abrem a escuridão). */
  private luzes = new Graphics();
  private previa = new Graphics();
  private pedacos = new Map<string, Pedaco>();
  private pendentes = new Set<string>();
  private conteudo: IConteudoProjeto;
  private imagensPecas = new Map<string, CanvasImageSource>();
  private largura: number;
  private altura: number;
  private casa: number;
  private escala = 1;
  private desfeitos: IConteudoProjeto[] = [];
  private refeitos: IConteudoProjeto[] = [];
  private gesto: Gesto | null = null;
  private ferramenta: FerramentaConstrutor = 'sala';
  private opcoes: OpcoesConstrutor = { chao: 'L', parede: 'pedra', pincel: 1, borracha: 'chao', peca: null, escalaPeca: 1, rotacaoPeca: 0, espelhadaPeca: false, luz: 'tocha', pronta: null };
  private pecaSelecionada: string | null = null;
  private selecao = new Set<string>();
  private luzSelecionada: string | null = null;
  private cursor: { x: number; y: number } | null = null;

  private constructor(
    private app: Application,
    private viewport: Viewport,
    private eventos: EventosEditor,
    projeto: { largura: number; altura: number; casa: number; conteudo: IConteudoProjeto },
  ) {
    this.largura = projeto.largura;
    this.altura = projeto.altura;
    this.casa = projeto.casa;
    this.conteudo = projeto.conteudo;
  }

  static async criar(
    alvo: HTMLElement,
    projeto: { largura: number; altura: number; casa: number; conteudo: IConteudoProjeto },
    eventos: EventosEditor,
  ): Promise<EditorConstrutor> {
    const app = new Application();
    // O mapa da mesa já usa a placa de vídeo pelo WebGPU; o editor fica no WebGL, mais leve para os dois juntos.
    await app.init({ resizeTo: alvo, preference: 'webgl', antialias: true, background: '#09090d', autoDensity: true, resolution: window.devicePixelRatio || 1 });
    alvo.appendChild(app.canvas);
    const viewport = new Viewport({ screenWidth: alvo.clientWidth, screenHeight: alvo.clientHeight, events: app.renderer.events, passiveWheel: false });
    viewport.drag({ mouseButtons: 'middle-right' }).pinch().wheel({ smooth: 4 }).decelerate({ friction: 0.92 }).clampZoom({ minScale: 0.04, maxScale: 4 });
    app.stage.addChild(viewport);
    app.renderer.on('resize', (w: number, h: number) => viewport.resize(w, h));
    const editor = new EditorConstrutor(app, viewport, eventos, projeto);
    editor.montar();
    return editor;
  }

  private montar() {
    const { app, viewport } = this;
    viewport.addChild(this.camadaPedacos, this.grade, this.portas, this.luzes, this.previa);
    this.criarPedacos();
    this.desenharGrade();
    this.desenharPortas();
    this.desenharLuzes();
    this.enquadrar();

    viewport.on('pointerdown', (evento) => {
      if (evento.button !== 0 || this.ferramenta === 'mao') return;
      this.comecar(this.emCasas(viewport.toWorld(evento.global)), evento.shiftKey);
    });
    app.stage.eventMode = 'static';
    app.stage.hitArea = app.screen;
    app.stage.on('globalpointermove', (evento) => {
      this.cursor = this.emCasas(viewport.toWorld(evento.global));
      if (this.gesto) this.continuar(this.cursor);
      this.desenharPrevia();
    });
    const soltar = () => this.terminar();
    app.stage.on('pointerup', soltar);
    app.stage.on('pointerupoutside', soltar);
    app.ticker.add(() => this.redesenharPendentes());
  }

  private emCasas(ponto: { x: number; y: number }): { x: number; y: number } {
    return { x: ponto.x / this.casa, y: ponto.y / this.casa };
  }

  // ---------------------------------------------------------------- pedaços

  private criarPedacos() {
    for (const pedaco of this.pedacos.values()) {
      pedaco.sprite.destroy();
      pedaco.textura.destroy(true);
    }
    this.pedacos.clear();
    this.camadaPedacos.removeChildren();
    const larguraPx = this.largura * this.casa;
    const alturaPx = this.altura * this.casa;
    this.escala = Math.min(1, LADO_MAXIMO_EDITOR / Math.max(larguraPx, alturaPx));
    for (let y = 0; y < alturaPx; y += LADO_PEDACO) {
      for (let x = 0; x < larguraPx; x += LADO_PEDACO) {
        const w = Math.min(LADO_PEDACO, larguraPx - x);
        const h = Math.min(LADO_PEDACO, alturaPx - y);
        const tela = document.createElement('canvas');
        tela.width = Math.max(1, Math.ceil(w * this.escala));
        tela.height = Math.max(1, Math.ceil(h * this.escala));
        const textura = Texture.from(tela);
        const sprite = new Sprite(textura);
        sprite.position.set(x, y);
        sprite.scale.set(w / tela.width, h / tela.height);
        this.camadaPedacos.addChild(sprite);
        const chave = `${x}/${y}`;
        this.pedacos.set(chave, { sprite, tela, textura, x, y, w, h });
        this.pendentes.add(chave);
      }
    }
  }

  private marcar(area: IAreaCasas | null) {
    if (!area) return;
    const x0 = area.x0 * this.casa;
    const y0 = area.y0 * this.casa;
    const x1 = area.x1 * this.casa;
    const y1 = area.y1 * this.casa;
    for (const [chave, pedaco] of this.pedacos) {
      if (pedaco.x < x1 && pedaco.x + pedaco.w > x0 && pedaco.y < y1 && pedaco.y + pedaco.h > y0) this.pendentes.add(chave);
    }
  }

  private redesenharPendentes() {
    let feitos = 0;
    for (const chave of this.pendentes) {
      if (feitos >= PEDACOS_POR_QUADRO) break;
      const pedaco = this.pedacos.get(chave);
      this.pendentes.delete(chave);
      if (!pedaco) continue;
      const ctx = pedaco.tela.getContext('2d')!;
      desenharTrecho(ctx, this.conteudo, this.casa, { x: pedaco.x, y: pedaco.y, w: pedaco.w, h: pedaco.h }, pedaco.tela.width / pedaco.w, this.imagensPecas);
      pedaco.textura.source.update();
      feitos++;
    }
  }

  /** Quantos pedaços ainda vão ser redesenhados (zero: a tela já mostra tudo). */
  get pedacosPendentes(): number {
    return this.pendentes.size;
  }

  // -------------------------------------------------------------- desenho

  private desenharGrade() {
    const g = this.grade;
    g.clear();
    const largura = this.largura * this.casa;
    const altura = this.altura * this.casa;
    for (let x = 0; x <= this.largura; x++) g.moveTo(x * this.casa, 0).lineTo(x * this.casa, altura);
    for (let y = 0; y <= this.altura; y++) g.moveTo(0, y * this.casa).lineTo(largura, y * this.casa);
    g.stroke({ width: 1, color: 0xffffff, alpha: 0.12, pixelLine: true });
    g.rect(0, 0, largura, altura).stroke({ width: 2, color: 0xc7a44c, alpha: 0.6, pixelLine: true });
  }

  private desenharPortas() {
    const g = this.portas;
    g.clear();
    for (const [chave, abertura] of Object.entries(this.conteudo.aberturas)) {
      if (abertura.tipo === 'janela') continue;
      const [p, q] = pontasDaAresta(chave);
      desenharAbertura(g, {
        id: chave, tipo: abertura.tipo, estado: abertura.estado,
        x1: p.x * this.casa, y1: p.y * this.casa, x2: q.x * this.casa, y2: q.y * this.casa,
      }, this.casa, true);
    }
  }

  private desenharLuzes() {
    const g = this.luzes;
    g.clear();
    const fino = Math.max(1.5, 2 / this.viewport.scale.x);
    for (const luz of this.conteudo.luzes) {
      const cor = Number.parseInt(luz.cor.slice(1), 16);
      const x = luz.x * this.casa;
      const y = luz.y * this.casa;
      const raio = luz.raio * this.casa;
      for (const [fracao, alfa] of [[1, 0.06], [0.7, 0.08], [0.4, 0.12]]) g.circle(x, y, raio * fracao).fill({ color: cor, alpha: alfa });
      g.circle(x, y, raio).stroke({ width: fino, color: cor, alpha: 0.55 });
      g.circle(x, y, this.casa * 0.12).fill({ color: cor, alpha: 1 }).stroke({ width: fino, color: 0x1a120a, alpha: 0.9 });
      if (luz.id === this.luzSelecionada) g.circle(x, y, this.casa * 0.22).stroke({ width: fino * 1.6, color: 0xffffff, alpha: 0.95 });
    }
  }

  private desenharPrevia() {
    const g = this.previa;
    g.clear();
    const casa = this.casa;
    const fino = Math.max(1.5, 2 / this.viewport.scale.x);
    const cursor = this.cursor;
    const gesto = this.gesto;
    if (gesto?.tipo === 'sala') {
      const area = areaEntre(gesto.inicio, gesto.fim);
      g.rect(area.x0 * casa, area.y0 * casa, (area.x1 - area.x0) * casa, (area.y1 - area.y0) * casa)
        .fill({ color: 0xc7a44c, alpha: 0.12 }).stroke({ width: fino * 2, color: 0xc7a44c, alpha: 0.95 });
      return;
    }
    if (gesto?.tipo === 'parede') {
      const fim = fimDaLinha(gesto.inicio, gesto.fim);
      g.moveTo(gesto.inicio.x * casa, gesto.inicio.y * casa).lineTo(fim.x * casa, fim.y * casa).stroke({ width: casa * 0.12, color: 0xc7a44c, alpha: 0.8, cap: 'round' });
      return;
    }
    for (const selecionada of this.conteudo.pecas.filter((peca) => this.selecao.has(peca.id))) {
      const w = selecionada.escala / 2;
      const h = (selecionada.escala * selecionada.imagem_altura / selecionada.imagem_largura) / 2;
      const angulo = (selecionada.rotacao * Math.PI) / 180;
      const pontos = [[-w, -h], [w, -h], [w, h], [-w, h]].map(([x, y]) => ({
        x: (selecionada.x + x * Math.cos(angulo) - y * Math.sin(angulo)) * casa,
        y: (selecionada.y + x * Math.sin(angulo) + y * Math.cos(angulo)) * casa,
      }));
      g.moveTo(pontos[0].x, pontos[0].y);
      for (const ponto of pontos.slice(1)) g.lineTo(ponto.x, ponto.y);
      g.closePath();
      g.stroke({ width: fino * 1.7, color: 0xc7a44c, alpha: 0.95 });
    }
    if (!cursor) return;
    if (this.ferramenta === 'chao' || (this.ferramenta === 'borracha' && this.opcoes.borracha === 'chao')) {
      const casas = casasDoPincel(cursor, this.opcoes.pincel);
      const x0 = Math.min(...casas.map((c) => c.x));
      const y0 = Math.min(...casas.map((c) => c.y));
      g.rect(x0 * casa, y0 * casa, this.opcoes.pincel * casa, this.opcoes.pincel * casa)
        .stroke({ width: fino * 1.5, color: this.ferramenta === 'borracha' ? 0xf87171 : 0xffffff, alpha: 0.8 });
    } else if (this.ferramenta === 'sala') {
      g.rect(Math.floor(cursor.x) * casa, Math.floor(cursor.y) * casa, casa, casa).stroke({ width: fino, color: 0xc7a44c, alpha: 0.7 });
    } else if (this.ferramenta === 'parede') {
      g.circle(Math.round(cursor.x) * casa, Math.round(cursor.y) * casa, casa * 0.09).fill({ color: 0xc7a44c, alpha: 0.9 });
    } else if (this.ferramenta === 'peca' && this.opcoes.pronta) {
      for (const peca of this.opcoes.pronta.pecas) {
        const largura = peca.escala;
        const altura = largura * (peca.imagem_altura / peca.imagem_largura);
        g.rect((cursor.x + peca.x - largura / 2) * casa, (cursor.y + peca.y - altura / 2) * casa, largura * casa, altura * casa)
          .fill({ color: 0xc7a44c, alpha: 0.1 }).stroke({ width: fino, color: 0xc7a44c, alpha: 0.8 });
      }
    } else if (this.ferramenta === 'peca' && this.opcoes.peca) {
      const largura = this.opcoes.escalaPeca;
      const altura = largura * (this.opcoes.peca.imagem_altura / this.opcoes.peca.imagem_largura);
      g.rect((cursor.x - largura / 2) * casa, (cursor.y - altura / 2) * casa, largura * casa, altura * casa)
        .fill({ color: 0xc7a44c, alpha: 0.12 }).stroke({ width: fino, color: 0xc7a44c, alpha: 0.85 });
    } else if (['porta', 'janela', 'secreta'].includes(this.ferramenta) || this.ferramenta === 'borracha') {
      const chave = arestaPerto(this.conteudo, cursor, 0.35, true);
      if (chave) {
        const [p, q] = pontasDaAresta(chave);
        const cor = this.ferramenta === 'borracha' ? 0xf87171 : 0x5eead4;
        g.moveTo(p.x * casa, p.y * casa).lineTo(q.x * casa, q.y * casa).stroke({ width: casa * 0.14, color: cor, alpha: 0.75, cap: 'round' });
      }
    }
  }

  // --------------------------------------------------------------- gestos

  private comecar(ponto: { x: number; y: number }, juntar = false) {
    const antes = this.conteudo;
    switch (this.ferramenta) {
      case 'sala': {
        const casa = { x: Math.floor(ponto.x), y: Math.floor(ponto.y) };
        this.gesto = { tipo: 'sala', antes, inicio: casa, fim: casa };
        break;
      }
      case 'parede': {
        const canto = { x: Math.round(ponto.x), y: Math.round(ponto.y) };
        this.gesto = { tipo: 'parede', antes, inicio: canto, fim: canto };
        break;
      }
      case 'chao':
      case 'borracha':
        this.gesto = { tipo: 'pintura', antes, ultimo: null };
        this.continuar(ponto);
        break;
      case 'porta':
      case 'janela':
      case 'secreta': {
        const chave = arestaPerto(this.conteudo, ponto, 0.35, true);
        if (chave) this.registrar(antes, abrir(this.conteudo, chave, this.ferramenta));
        break;
      }
      case 'luz': {
        const existente = luzPerto(this.conteudo, ponto, 0.4);
        if (existente) {
          this.selecionarLuz(existente.id);
          this.gesto = { tipo: 'luz', antes, inicio: ponto, origem: { x: existente.x, y: existente.y }, id: existente.id };
        } else {
          const pronta = LUZES_PRONTAS.find((l) => l.id === this.opcoes.luz) ?? LUZES_PRONTAS[1];
          const luz: ILuzProjeto = {
            id: crypto.randomUUID(), raio: pronta.raio, cor: pronta.cor, tremula: pronta.tremula,
            x: Math.max(0, Math.min(this.largura, ponto.x)), y: Math.max(0, Math.min(this.altura, ponto.y)),
          };
          const novo = adicionarLuz(this.conteudo, luz);
          if (novo !== this.conteudo) {
            this.trocar(novo);
            this.selecionarLuz(luz.id);
            this.gesto = { tipo: 'luz', antes, inicio: ponto, origem: { x: luz.x, y: luz.y }, id: luz.id };
          }
        }
        break;
      }
      case 'peca': {
        const existente = this.pecaNoPonto(ponto);
        if (existente && juntar) {
          // Shift + clique junta (ou tira) a peça do grupo escolhido.
          const ids = new Set(this.selecao);
          if (ids.has(existente.id)) ids.delete(existente.id);
          else ids.add(existente.id);
          this.definirSelecao([...ids]);
          break;
        }
        let ids: string[] = [];
        if (existente) {
          ids = this.selecao.has(existente.id) && this.selecao.size > 1 ? [...this.selecao] : [existente.id];
        } else if (this.opcoes.pronta) {
          const posto = porPronta(this.conteudo, this.opcoes.pronta, ponto, () => crypto.randomUUID());
          this.trocar(posto.conteudo);
          ids = posto.ids;
        } else if (this.opcoes.peca && this.conteudo.pecas.length < 256) {
          const peca: IPecaProjeto = {
            id: crypto.randomUUID(), ...this.opcoes.peca, x: ponto.x, y: ponto.y,
            escala: this.opcoes.escalaPeca, rotacao: this.opcoes.rotacaoPeca, espelhada: this.opcoes.espelhadaPeca,
          };
          this.trocar(adicionarPeca(this.conteudo, peca));
          ids = [peca.id];
        }
        this.definirSelecao(ids);
        if (ids.length) {
          const origens = new Map(this.conteudo.pecas.filter((p) => ids.includes(p.id)).map((p) => [p.id, { x: p.x, y: p.y }]));
          this.gesto = { tipo: 'peca', antes, inicio: ponto, origens };
        }
        break;
      }
      default:
        break;
    }
    this.viewport.plugins.pause('drag');
    this.desenharPrevia();
  }

  private continuar(ponto: { x: number; y: number }) {
    const gesto = this.gesto;
    if (!gesto) return;
    if (gesto.tipo === 'sala') {
      gesto.fim = { x: Math.max(0, Math.min(this.largura - 1, Math.floor(ponto.x))), y: Math.max(0, Math.min(this.altura - 1, Math.floor(ponto.y))) };
    } else if (gesto.tipo === 'parede') {
      gesto.fim = { x: Math.max(0, Math.min(this.largura, Math.round(ponto.x))), y: Math.max(0, Math.min(this.altura, Math.round(ponto.y))) };
    } else if (gesto.tipo === 'luz') {
      const x = Math.max(0, Math.min(this.largura, gesto.origem.x + ponto.x - gesto.inicio.x));
      const y = Math.max(0, Math.min(this.altura, gesto.origem.y + ponto.y - gesto.inicio.y));
      this.trocar(editarLuz(this.conteudo, gesto.id, { x, y }));
    } else if (gesto.tipo === 'peca') {
      const dx = ponto.x - gesto.inicio.x;
      const dy = ponto.y - gesto.inicio.y;
      let novo = this.conteudo;
      for (const [id, origem] of gesto.origens) novo = editarPeca(novo, id, { x: origem.x + dx, y: origem.y + dy });
      this.trocar(novo);
    } else if (gesto.tipo === 'pintura') {
      // O mouse rápido pula casas entre um evento e outro: o pincel passa pela linha toda.
      const de = gesto.ultimo ?? ponto;
      const passos = Math.max(1, Math.ceil(Math.hypot(ponto.x - de.x, ponto.y - de.y) / 0.5));
      let novo = this.conteudo;
      const casas = new Map<string, ICasa>();
      for (let i = 1; i <= passos; i++) {
        const meio = { x: de.x + ((ponto.x - de.x) * i) / passos, y: de.y + ((ponto.y - de.y) * i) / passos };
        if (this.ferramenta === 'chao') for (const casa of casasDoPincel(meio, this.opcoes.pincel)) casas.set(`${casa.x},${casa.y}`, casa);
        else if (this.ferramenta === 'borracha') novo = apagar(novo, meio, this.opcoes.borracha, this.opcoes.pincel);
      }
      if (this.ferramenta === 'chao') novo = pintar(novo, [...casas.values()], this.opcoes.chao);
      gesto.ultimo = ponto;
      this.trocar(novo);
    }
  }

  private terminar() {
    const gesto = this.gesto;
    this.gesto = null;
    this.viewport.plugins.resume('drag');
    if (!gesto) return;
    if (gesto.tipo === 'sala') {
      this.registrar(gesto.antes, sala(this.conteudo, gesto.inicio, gesto.fim, this.opcoes.chao, this.opcoes.parede));
    } else if (gesto.tipo === 'parede') {
      const fim = fimDaLinha(gesto.inicio, gesto.fim);
      this.registrar(gesto.antes, poremParedes(this.conteudo, arestasDaLinha(gesto.inicio, fim), this.opcoes.parede));
    } else if (gesto.tipo === 'peca' || gesto.tipo === 'luz') {
      if (this.conteudo !== gesto.antes) {
        this.empilhar(gesto.antes);
        this.eventos.aoMudar(this.conteudo);
      }
    } else if (this.conteudo !== gesto.antes) {
      // A pintura já foi aparecendo; o Desfazer volta o traço inteiro de uma vez.
      this.empilhar(gesto.antes);
      this.eventos.aoMudar(this.conteudo);
    }
    this.desenharPrevia();
  }

  /** Mostra um conteúdo novo sem mexer no histórico (o meio de um traço de pincel). */
  private trocar(novo: IConteudoProjeto) {
    if (novo === this.conteudo) return;
    const area = areaMudada(this.conteudo, novo);
    const portasMudaram = novo.aberturas !== this.conteudo.aberturas;
    const luzesMudaram = novo.luzes !== this.conteudo.luzes;
    this.conteudo = novo;
    this.marcar(area);
    if (portasMudaram) this.desenharPortas();
    if (luzesMudaram) this.desenharLuzes();
  }

  private empilhar(antes: IConteudoProjeto) {
    this.desfeitos.push(antes);
    if (this.desfeitos.length > MAX_HISTORICO) this.desfeitos.shift();
    this.refeitos = [];
    this.eventos.aoHistorico(true, false);
  }

  private registrar(antes: IConteudoProjeto, novo: IConteudoProjeto) {
    if (novo === this.conteudo) return;
    this.trocar(novo);
    this.empilhar(antes);
    this.eventos.aoMudar(this.conteudo);
  }

  // -------------------------------------------------------------- comandos

  definirFerramenta(ferramenta: FerramentaConstrutor) {
    this.ferramenta = ferramenta;
    if (ferramenta !== 'peca' && this.selecao.size) this.definirSelecao([]);
    if (ferramenta !== 'luz' && this.luzSelecionada) this.selecionarLuz(null);
    this.viewport.drag({ mouseButtons: ferramenta === 'mao' ? 'all' : 'middle-right' });
    this.desenharPrevia();
  }

  definirImagensPecas(imagens: Map<string, CanvasImageSource>) {
    this.imagensPecas = imagens;
    for (const chave of this.pedacos.keys()) this.pendentes.add(chave);
  }

  definirOpcoes(opcoes: OpcoesConstrutor) {
    this.opcoes = opcoes;
    this.desenharPrevia();
  }

  /** A peça de cima no ponto: a ordem de desenho ao contrário (alto, objetos, chão). */
  private pecaNoPonto(ponto: { x: number; y: number }): IPecaProjeto | null {
    const ordem = pecasEmOrdem(this.conteudo);
    for (let indice = ordem.length - 1; indice >= 0; indice--) {
      const peca = ordem[indice];
      const angulo = (-peca.rotacao * Math.PI) / 180;
      const dx = ponto.x - peca.x;
      const dy = ponto.y - peca.y;
      const x = dx * Math.cos(angulo) - dy * Math.sin(angulo);
      const y = dx * Math.sin(angulo) + dy * Math.cos(angulo);
      const largura = peca.escala;
      const altura = largura * (peca.imagem_altura / peca.imagem_largura);
      if (Math.abs(x) <= largura / 2 && Math.abs(y) <= altura / 2) return peca;
    }
    return null;
  }

  editarPeca(id: string, mudanca: Partial<IPecaProjeto>) {
    this.registrar(this.conteudo, editarPeca(this.conteudo, id, mudanca));
    this.desenharPrevia();
  }

  selecionarLuz(id: string | null) {
    this.luzSelecionada = id;
    this.eventos.aoSelecionarLuz(id);
    this.desenharLuzes();
  }

  editarLuz(id: string, mudanca: Partial<ILuzProjeto>) {
    this.registrar(this.conteudo, editarLuz(this.conteudo, id, mudanca));
  }

  removerLuz(id: string) {
    this.registrar(this.conteudo, apagarLuz(this.conteudo, id));
    if (this.luzSelecionada === id) this.selecionarLuz(null);
  }

  /** Escolhe a peça pela lista do painel (sem precisar achá-la no mapa). */
  selecionarPeca(id: string | null) {
    this.definirSelecao(id ? [id] : []);
  }

  private definirSelecao(ids: string[]) {
    this.selecao = new Set(ids);
    this.pecaSelecionada = ids.length === 1 ? ids[0] : null;
    this.eventos.aoSelecionarPeca(this.pecaSelecionada);
    this.eventos.aoSelecaoPecas(ids);
    this.desenharPrevia();
  }

  /** As peças escolhidas, com a posição relativa ao centro do grupo (para salvar como peça pronta). */
  grupoEscolhido(): IPecaProjeto[] {
    return grupoDasPecas(pecasEmOrdem(this.conteudo).filter((peca) => this.selecao.has(peca.id)));
  }

  removerPecas(ids: string[]) {
    let novo = this.conteudo;
    for (const id of ids) novo = apagarPeca(novo, id);
    this.registrar(this.conteudo, novo);
    this.definirSelecao([]);
  }

  moverPeca(id: string, sentido: 'frente' | 'tras') {
    this.registrar(this.conteudo, moverNaOrdem(this.conteudo, id, sentido));
  }

  duplicarPeca(id: string) {
    const novoId = crypto.randomUUID();
    const novo = duplicarPeca(this.conteudo, id, novoId);
    if (novo === this.conteudo) return;
    this.registrar(this.conteudo, novo);
    this.selecionarPeca(novoId);
  }

  removerPeca(id: string) {
    this.registrar(this.conteudo, apagarPeca(this.conteudo, id));
    if (this.selecao.has(id)) this.definirSelecao([...this.selecao].filter((outro) => outro !== id));
    this.desenharPrevia();
  }

  desfazer() {
    const anterior = this.desfeitos.pop();
    if (!anterior) return;
    this.refeitos.push(this.conteudo);
    this.voltarPara(anterior);
    this.eventos.aoHistorico(this.desfeitos.length > 0, true);
    this.eventos.aoMudar(this.conteudo);
  }

  refazer() {
    const seguinte = this.refeitos.pop();
    if (!seguinte) return;
    this.desfeitos.push(this.conteudo);
    this.voltarPara(seguinte);
    this.eventos.aoHistorico(true, this.refeitos.length > 0);
    this.eventos.aoMudar(this.conteudo);
  }

  /** Desfazer ou refazer: se o passo mudou o tamanho do mapa, a grade e os pedaços acompanham. */
  private voltarPara(conteudo: IConteudoProjeto) {
    const largura = conteudo.chao[0]?.length ?? this.largura;
    const altura = conteudo.chao.length;
    if (largura === this.largura && altura === this.altura) {
      this.trocar(conteudo);
      return;
    }
    this.largura = largura;
    this.altura = altura;
    this.conteudo = conteudo;
    this.criarPedacos();
    this.desenharGrade();
    this.desenharPortas();
    this.desenharLuzes();
  }

  /** Muda o tamanho do mapa (em casas). Entra no histórico como qualquer mudança. */
  redimensionar(largura: number, altura: number) {
    const antes = this.conteudo;
    this.largura = largura;
    this.altura = altura;
    this.conteudo = redimensionar(antes, largura, altura);
    this.desfeitos.push(antes);
    this.refeitos = [];
    this.criarPedacos();
    this.desenharGrade();
    this.desenharPortas();
    this.eventos.aoHistorico(true, false);
    this.eventos.aoMudar(this.conteudo);
  }

  get atual(): IConteudoProjeto {
    return this.conteudo;
  }

  enquadrar() {
    const largura = this.largura * this.casa;
    const altura = this.altura * this.casa;
    this.viewport.fit(true, largura * 1.08, altura * 1.08);
    this.viewport.moveCenter(largura / 2, altura / 2);
  }

  destruir() {
    this.app.destroy({ removeView: true }, { children: true, texture: true, textureSource: true });
    this.pedacos.clear();
  }
}
