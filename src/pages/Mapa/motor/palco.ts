// O palco do mapa: Pixi 8 + pixi-viewport, rodando direto (sem @pixi/react,
// que pede React 19). Camadas: mapa (ladrilhos), grade, névoa, tokens, clima,
// réguas, desenho em andamento e pings. A página fala com ele por métodos e
// recebe os gestos por callbacks; o arrasto a 60 quadros por segundo não passa
// pelo React.

import { Application, Container, Graphics, Text, Texture, Sprite } from 'pixi.js';
import { Viewport } from 'pixi-viewport';
import type { IAreaClima, ICena, IClima, IFormaNevoa, ITokenMapa, OperacaoNevoa } from '../../../services/mapaApi';
import { urlImagemDoToken, urlPedaco } from '../../../services/mapaApi';
import { encaixar, medir, raioHex, LADO_LADRILHO, type IGrade, type IPonto } from './geometria';
import { TokenVisual, esquecerTexturasDeMoldura } from './token';
import { desenharRetrato, type Enquadramento } from './molduras';
import { CamadaNevoa } from './nevoa';
import { CamadaClima, esquecerTexturasDoClima } from './clima';
import {
  acrescentarAoTraco, chavesDoFundo, detalheSempre, fechaPoligono, formaDoPoligono, formaDoRetangulo, formaDoTraco, MAX_PONTOS_TRACO,
} from './nevoaGeometria';

/** `nevoa`: o Mestre desenha a névoa; `area`: o Mestre marca a área de um efeito de clima. */
export type Ferramenta = 'mover' | 'regua' | 'ping' | 'nevoa' | 'area';
export type FormaDeDesenho = 'pincel' | 'retangulo' | 'poligono';

export interface OpcoesNevoa {
  op: OperacaoNevoa;
  forma: FormaDeDesenho;
  /** Raio do pincel em px do mapa. */
  raio: number;
}

export interface EventosPalco {
  aoArrastar: (id: string, x: number, y: number) => void;
  aoSoltar: (id: string, x: number, y: number) => void;
  aoSelecionar: (id: string | null) => void;
  aoPing: (x: number, y: number) => void;
  aoRegua: (pontos: IPonto[] | null) => void;
  aoNevoa: (forma: IFormaNevoa) => void;
  aoArea: (area: IAreaClima) => void;
}

const COR_REVELAR = '#5eead4';
const COR_ESCONDER = '#f87171';
const COR_AREA = '#93c5fd';

interface Regua {
  linha: Graphics;
  rotulo: Text;
}

const ZOOM_DETALHE = 0.3;

async function texturaDe(url: string): Promise<Texture> {
  const resposta = await fetch(url, { credentials: 'same-origin' });
  if (!resposta.ok) throw new Error(`imagem ${resposta.status}`);
  const imagem = await createImageBitmap(await resposta.blob());
  return Texture.from(imagem);
}

/** Retrato quadrado vira redondo (com o enquadramento escolhido) antes de virar textura: o motor não precisa de máscara. */
async function retratoRedondo(url: string, enquadramento: Enquadramento): Promise<Texture> {
  const resposta = await fetch(url, { credentials: 'same-origin' });
  if (!resposta.ok) throw new Error(`retrato ${resposta.status}`);
  const imagem = await createImageBitmap(await resposta.blob());
  const lado = 256;
  const tela = new OffscreenCanvas(lado, lado);
  desenharRetrato(tela.getContext('2d')!, lado, imagem, enquadramento);
  imagem.close();
  return Texture.from(tela.transferToImageBitmap());
}

export class PalcoMapa {
  private camadaMapa = new Container();
  private camadaReduzida = new Container();
  private camadaDetalhe = new Container();
  private grade = new Graphics();
  private camadaTokens = new Container();
  private camadaReguas = new Container();
  private camadaPings = new Container();
  private previa = new Graphics();
  private nevoa!: CamadaNevoa;
  private clima!: CamadaClima;
  /** Com a névoa, os pedaços do mapa que o servidor libera para este jogador; null baixa tudo. */
  private liberados: Set<string> | null = null;
  private reduzidosPedidos = new Set<string>();
  private gestor = false;
  private opcoesNevoa: OpcoesNevoa = { op: 'revelar', forma: 'pincel', raio: 100 };
  private traco: IPonto[] | null = null;
  private retangulo: { inicio: IPonto; fim: IPonto } | null = null;
  private poligono: IPonto[] | null = null;
  private cursor: IPonto | null = null;
  private tokens = new Map<string, TokenVisual>();
  private retratos = new Map<string, Promise<Texture | null>>();
  private ladrilhosPedidos = new Set<string>();
  private cena: ICena | null = null;
  private campanhaId = '';
  private ferramenta: Ferramenta = 'mover';
  private selecionado: string | null = null;
  private vez: string | null = null;
  private reguasRemotas = new Map<string, Regua>();
  private pings = new Map<Container, { nascimento: number; cor: string }>();
  private reguaLocal: Regua | null = null;
  private pontosRegua: IPonto[] | null = null;
  private arrasto: { id: string; dx: number; dy: number; inicio: IPonto; moveu: boolean } | null = null;
  private quadroCallbacks: Array<() => void> = [];
  private carregarVisiveis: number | null = null;

  private constructor(private app: Application, readonly viewport: Viewport, private eventos: EventosPalco) {}

  static async criar(alvo: HTMLElement, eventos: EventosPalco): Promise<PalcoMapa> {
    const app = new Application();
    await app.init({
      resizeTo: alvo,
      preference: 'webgpu',
      antialias: true,
      background: '#09090d',
      autoDensity: true,
      resolution: window.devicePixelRatio || 1,
    });
    alvo.appendChild(app.canvas);
    const viewport = new Viewport({
      screenWidth: alvo.clientWidth,
      screenHeight: alvo.clientHeight,
      events: app.renderer.events,
      passiveWheel: false,
    });
    viewport.drag({ mouseButtons: 'all' }).pinch().wheel({ smooth: 4 }).decelerate({ friction: 0.92 }).clampZoom({ minScale: 0.04, maxScale: 4 });
    app.stage.addChild(viewport);
    app.renderer.on('resize', (w: number, h: number) => viewport.resize(w, h));
    const palco = new PalcoMapa(app, viewport, eventos);
    palco.montar();
    return palco;
  }

  private montar() {
    const { app, viewport } = this;
    this.nevoa = new CamadaNevoa(app.renderer);
    this.clima = new CamadaClima(app.renderer);
    this.camadaMapa.addChild(this.camadaReduzida, this.camadaDetalhe);
    // A névoa cobre o mapa e fica por baixo dos tokens: o servidor já tira do jogador o que ela esconde.
    viewport.addChild(this.camadaMapa, this.grade, this.nevoa.raiz, this.camadaTokens, this.clima.raiz, this.camadaReguas, this.previa, this.camadaPings);
    app.stage.eventMode = 'static';
    app.stage.hitArea = app.screen;

    viewport.on('pointerdown', (evento) => {
      if (this.arrasto) return;
      const ponto = viewport.toWorld(evento.global);
      if (evento.altKey || this.ferramenta === 'ping') {
        this.pingLocal(ponto.x, ponto.y);
        return;
      }
      if (this.ferramenta === 'regua' && evento.button === 0) {
        this.pontosRegua = [this.encaixarPonto(ponto), this.encaixarPonto(ponto)];
        viewport.plugins.pause('drag');
        this.desenharReguaLocal();
        return;
      }
      if (this.ferramenta === 'nevoa' || this.ferramenta === 'area') {
        // Botão do meio e o direito continuam arrastando o mapa.
        if (evento.button === 0) this.comecarDesenho({ x: ponto.x, y: ponto.y });
        return;
      }
      this.eventos.aoSelecionar(null);
    });

    app.stage.on('globalpointermove', (evento) => {
      const ponto = viewport.toWorld(evento.global);
      if (this.ferramenta === 'nevoa' || this.ferramenta === 'area') {
        this.continuarDesenho({ x: ponto.x, y: ponto.y });
        return;
      }
      if (this.arrasto) {
        const token = this.tokens.get(this.arrasto.id);
        if (!token) return;
        if (!this.arrasto.moveu && Math.hypot(ponto.x - this.arrasto.inicio.x, ponto.y - this.arrasto.inicio.y) * viewport.scale.x < 4) return;
        this.arrasto.moveu = true;
        const x = ponto.x - this.arrasto.dx;
        const y = ponto.y - this.arrasto.dy;
        token.raiz.position.set(x, y);
        this.eventos.aoArrastar(this.arrasto.id, x, y);
        return;
      }
      if (this.pontosRegua) {
        this.pontosRegua[this.pontosRegua.length - 1] = this.encaixarPonto(ponto);
        this.desenharReguaLocal();
        this.eventos.aoRegua(this.pontosRegua);
      }
    });

    const soltar = () => {
      if (this.traco || this.retangulo) {
        this.terminarDesenho();
        return;
      }
      if (this.arrasto) {
        const { id, moveu } = this.arrasto;
        this.arrasto = null;
        viewport.plugins.resume('drag');
        viewport.plugins.resume('decelerate');
        const token = this.tokens.get(id);
        if (!token) return;
        token.raiz.cursor = 'grab';
        if (!moveu) {
          this.eventos.aoSelecionar(id);
          return;
        }
        const final = this.cena ? encaixar({ x: token.raiz.x, y: token.raiz.y }, this.cena.grade, token.dados.porte) : { x: token.raiz.x, y: token.raiz.y };
        const x = Math.max(0, Math.min(this.cena?.largura ?? final.x, final.x));
        const y = Math.max(0, Math.min(this.cena?.altura ?? final.y, final.y));
        token.raiz.position.set(x, y);
        token.dados = { ...token.dados, x, y };
        this.eventos.aoSoltar(id, x, y);
        return;
      }
      if (this.pontosRegua) {
        this.pontosRegua = null;
        viewport.plugins.resume('drag');
        this.reguaLocal?.linha.destroy();
        this.reguaLocal?.rotulo.destroy();
        this.reguaLocal = null;
        this.eventos.aoRegua(null);
      }
    };
    app.stage.on('pointerup', soltar);
    app.stage.on('pointerupoutside', soltar);

    viewport.on('moved', () => this.agendarLadrilhos());
    viewport.on('zoomed', () => this.agendarLadrilhos());

    app.ticker.add((ticker) => {
      const agora = performance.now();
      for (const token of this.tokens.values()) token.pulsar(agora);
      for (const callback of this.quadroCallbacks) callback();
      this.animarPings(agora);
      if (this.cena) {
        this.clima.quadro({
          dt: Math.min(0.1, ticker.deltaMS / 1000),
          agora,
          vista: viewport.getVisibleBounds(),
          escala: viewport.scale.x,
          luzes: this.luzes(),
          tamanhoCasa: this.cena.grade.tamanho,
        });
      }
    });
  }

  /** Personagens de jogador e aliados: a escuridão do clima abre luz em volta deles. */
  private luzes(): IPonto[] {
    const saida: IPonto[] = [];
    for (const token of this.tokens.values()) {
      if (token.dados.lado === 'jogador' || token.dados.lado === 'aliado') saida.push({ x: token.raiz.x, y: token.raiz.y });
    }
    return saida;
  }

  aoQuadro(callback: () => void) {
    this.quadroCallbacks.push(callback);
  }

  get tokenArrastadoLocal(): string | null {
    return this.arrasto?.moveu ? this.arrasto.id : null;
  }

  private encaixarPonto(ponto: IPonto): IPonto {
    if (!this.cena || this.cena.grade.tipo === 'nenhuma') return { x: ponto.x, y: ponto.y };
    // A régua mede de centro a centro de casa.
    return encaixar(ponto, this.cena.grade, 1);
  }

  // ---------------------------------------------------------------- cena

  definirCena(cena: ICena, campanhaId: string, gestor: boolean) {
    const anterior = this.cena;
    this.cena = cena;
    this.campanhaId = campanhaId;
    this.gestor = gestor;
    this.liberados = cena.nevoa?.ladrilhos ? new Set(cena.nevoa.ladrilhos) : null;
    const mudouMapa = anterior?.mapa?.id !== cena.mapa?.id || anterior?.id !== cena.id;
    if (mudouMapa) {
      this.camadaReduzida.removeChildren().forEach((filho) => filho.destroy());
      this.camadaDetalhe.removeChildren().forEach((filho) => filho.destroy());
      this.ladrilhosPedidos.clear();
      this.reduzidosPedidos.clear();
      this.desenharFundo();
      if (anterior?.id !== cena.id) {
        this.cancelarDesenho();
        this.enquadrar();
      }
    }
    // Com a névoa, o Mestre revelar mais libera pedaços novos: busca só os que faltam.
    void this.carregarReduzido();
    this.desenharGrade(cena.grade);
    this.nevoa.definir(cena.nevoa ?? null, cena.largura, cena.altura, gestor);
    this.clima.definir(cena.clima ?? null, cena.largura, cena.altura, gestor);
    this.agendarLadrilhos();
  }

  private desenharFundo() {
    if (!this.cena) return;
    const fundo = new Graphics().rect(0, 0, this.cena.largura, this.cena.altura).fill('#15131c').stroke({ width: 4, color: '#2a2633' });
    this.camadaReduzida.addChild(fundo);
  }

  private async carregarReduzido() {
    const cena = this.cena;
    const mapa = cena?.mapa;
    if (!cena || !mapa) return;
    // Sem versão reduzida (imagem até 2048 px), a "reduzida" é a própria imagem inteira.
    const { chaves, escala } = chavesDoFundo(mapa.chaves, this.liberados);
    const novas = chaves.filter((chave) => !this.reduzidosPedidos.has(chave));
    for (const chave of novas) this.reduzidosPedidos.add(chave);
    await Promise.all(novas.map(async (chave) => {
      try {
        const textura = await texturaDe(urlPedaco(mapa.id, chave));
        if (this.cena?.mapa?.id !== mapa.id) return;
        const [, coluna, linha] = chave.split('/').map(Number);
        const sprite = new Sprite(textura);
        sprite.position.set(coluna * LADO_LADRILHO * escala, linha * LADO_LADRILHO * escala);
        sprite.scale.set(escala);
        this.camadaReduzida.addChild(sprite);
        if (escala === 1) this.ladrilhosPedidos.add(chave);
      } catch {
        // Ladrilho que não veio deixa só o fundo naquele pedaço (e pode ser pedido de novo).
        this.reduzidosPedidos.delete(chave);
      }
    }));
  }

  private agendarLadrilhos() {
    if (this.carregarVisiveis !== null) return;
    this.carregarVisiveis = window.setTimeout(() => {
      this.carregarVisiveis = null;
      void this.carregarLadrilhosVisiveis();
    }, 120);
  }

  /** Ladrilhos no tamanho cheio só do pedaço que está na tela e só com o zoom de perto.
   * Com a névoa, onde a versão reduzida não veio, o cheio vem mesmo de longe. */
  private async carregarLadrilhosVisiveis() {
    const mapa = this.cena?.mapa;
    if (!mapa || !mapa.chaves.some((c) => c.startsWith('n2/'))) return;
    const perto = this.viewport.scale.x >= ZOOM_DETALHE;
    if (!perto && !this.liberados) return;
    const visivel = this.viewport.getVisibleBounds();
    const pedidos: string[] = [];
    for (const chave of mapa.chaves) {
      if (!chave.startsWith('n0/') || this.ladrilhosPedidos.has(chave)) continue;
      if (this.liberados && !this.liberados.has(chave)) continue;
      if (!perto && !detalheSempre(chave, this.liberados)) continue;
      const [, coluna, linha] = chave.split('/').map(Number);
      const x = coluna * LADO_LADRILHO;
      const y = linha * LADO_LADRILHO;
      if (x > visivel.right || x + LADO_LADRILHO < visivel.left || y > visivel.bottom || y + LADO_LADRILHO < visivel.top) continue;
      pedidos.push(chave);
    }
    for (const chave of pedidos) this.ladrilhosPedidos.add(chave);
    await Promise.all(pedidos.map(async (chave) => {
      try {
        const textura = await texturaDe(urlPedaco(mapa.id, chave));
        if (this.cena?.mapa?.id !== mapa.id) return;
        const [, coluna, linha] = chave.split('/').map(Number);
        const sprite = new Sprite(textura);
        sprite.position.set(coluna * LADO_LADRILHO, linha * LADO_LADRILHO);
        this.camadaDetalhe.addChild(sprite);
      } catch {
        this.ladrilhosPedidos.delete(chave);
      }
    }));
  }

  private desenharGrade(grade: IGrade) {
    const g = this.grade;
    g.clear();
    if (!this.cena || grade.tipo === 'nenhuma') return;
    const { largura, altura } = this.cena;
    if (grade.tipo === 'quadrada') {
      const passo = grade.tamanho;
      const inicioX = ((grade.x % passo) + passo) % passo;
      const inicioY = ((grade.y % passo) + passo) % passo;
      for (let x = inicioX; x <= largura; x += passo) g.moveTo(x, 0).lineTo(x, altura);
      for (let y = inicioY; y <= altura; y += passo) g.moveTo(0, y).lineTo(largura, y);
    } else {
      const r = raioHex(grade.tamanho);
      const w = grade.tamanho;
      const passoY = r * 1.5;
      const linhas = Math.ceil(altura / passoY) + 2;
      const colunas = Math.ceil(largura / w) + 2;
      for (let linha = -1; linha < linhas; linha++) {
        for (let coluna = -1; coluna < colunas; coluna++) {
          const cx = grade.x + coluna * w + (linha % 2 !== 0 ? w / 2 : 0);
          const cy = grade.y + linha * passoY;
          // Hexágono "pontudo em cima", o mesmo de `encaixar`.
          const pontos: number[] = [];
          for (let i = 0; i < 6; i++) {
            const a = -Math.PI / 2 + (i * Math.PI) / 3;
            pontos.push(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
          }
          g.poly(pontos, true);
        }
      }
    }
    g.stroke({ width: 1, color: grade.cor, alpha: grade.opacidade, pixelLine: true });
  }

  enquadrar() {
    if (!this.cena) return;
    this.viewport.fit(true, this.cena.largura * 1.05, this.cena.altura * 1.05);
    this.viewport.moveCenter(this.cena.largura / 2, this.cena.altura / 2);
    this.agendarLadrilhos();
  }

  centralizar(x: number, y: number) {
    this.viewport.animate({ position: { x, y }, time: 350, ease: 'easeInOutSine' });
  }

  centro(): IPonto {
    return { x: this.viewport.center.x, y: this.viewport.center.y };
  }

  definirFerramenta(ferramenta: Ferramenta) {
    if (ferramenta !== this.ferramenta) this.cancelarDesenho();
    this.ferramenta = ferramenta;
    // Fora do mover, o botão esquerdo é da ferramenta; o mapa anda com o do meio ou o direito.
    this.viewport.drag({ mouseButtons: ferramenta === 'mover' ? 'all' : 'middle-right' });
    this.desenharPrevia();
  }

  // ------------------------------------------------------ névoa e clima

  definirOpcoesNevoa(opcoes: OpcoesNevoa) {
    if (opcoes.forma !== this.opcoesNevoa.forma) this.cancelarDesenho();
    this.opcoesNevoa = opcoes;
    this.desenharPrevia();
  }

  /** O painel do clima mexeu num controle: a tela mostra antes de o servidor gravar. */
  previaClima(clima: IClima) {
    if (this.cena) this.clima.definir(clima, this.cena.largura, this.cena.altura, this.gestor);
  }

  definirClimaLigado(ligado: boolean) {
    this.clima.definirLigado(ligado);
  }

  get desenhando(): boolean {
    return Boolean(this.traco || this.retangulo || this.poligono);
  }

  cancelarDesenho() {
    this.traco = null;
    this.retangulo = null;
    this.poligono = null;
    this.viewport.plugins.resume('drag');
    this.desenharPrevia();
  }

  /** Enter ou clique no primeiro ponto: o polígono vira forma. */
  fecharPoligono() {
    const forma = this.poligono ? formaDoPoligono(this.opcoesNevoa.op, this.poligono) : null;
    this.poligono = null;
    if (forma) this.emitirNevoa(forma);
    this.desenharPrevia();
  }

  private comecarDesenho(ponto: IPonto) {
    this.cursor = ponto;
    // Névoa desligada: a barra pede para ligar antes de desenhar.
    if (this.ferramenta === 'nevoa' && !this.nevoa.ligada) return;
    if (this.ferramenta === 'area') {
      this.retangulo = { inicio: ponto, fim: ponto };
      this.viewport.plugins.pause('drag');
    } else if (this.opcoesNevoa.forma === 'pincel') {
      this.traco = [ponto];
      this.viewport.plugins.pause('drag');
    } else if (this.opcoesNevoa.forma === 'retangulo') {
      this.retangulo = { inicio: ponto, fim: ponto };
      this.viewport.plugins.pause('drag');
    } else if (!this.poligono) {
      this.poligono = [ponto];
    } else if (fechaPoligono(this.poligono, ponto, this.viewport.scale.x)) {
      this.fecharPoligono();
      return;
    } else if (this.poligono.length < MAX_PONTOS_TRACO) {
      this.poligono.push(ponto);
    }
    this.desenharPrevia();
  }

  private continuarDesenho(ponto: IPonto) {
    this.cursor = ponto;
    if (this.traco) {
      acrescentarAoTraco(this.traco, ponto, this.opcoesNevoa.raio);
      // Traço longo vira vários, cada um dentro do teto de pontos do servidor.
      if (this.traco.length >= MAX_PONTOS_TRACO) {
        const ultimo = this.traco[this.traco.length - 1];
        const forma = formaDoTraco(this.opcoesNevoa.op, this.traco, this.opcoesNevoa.raio);
        if (forma) this.emitirNevoa(forma);
        this.traco = [ultimo];
      }
    }
    if (this.retangulo) this.retangulo.fim = ponto;
    this.desenharPrevia();
  }

  private terminarDesenho() {
    this.viewport.plugins.resume('drag');
    if (this.traco) {
      const forma = formaDoTraco(this.opcoesNevoa.op, this.traco, this.opcoesNevoa.raio);
      this.traco = null;
      if (forma) this.emitirNevoa(forma);
    }
    if (this.retangulo) {
      const { inicio, fim } = this.retangulo;
      this.retangulo = null;
      const minimo = 8 / this.viewport.scale.x;
      if (this.ferramenta === 'area') {
        const forma = formaDoRetangulo('revelar', inicio, fim, minimo);
        if (forma && forma.tipo === 'retangulo') this.eventos.aoArea({ x: forma.x, y: forma.y, w: forma.w, h: forma.h });
      } else {
        const forma = formaDoRetangulo(this.opcoesNevoa.op, inicio, fim, minimo);
        if (forma) this.emitirNevoa(forma);
      }
    }
    this.desenharPrevia();
  }

  private emitirNevoa(forma: IFormaNevoa) {
    this.nevoa.acrescentar(forma);
    this.eventos.aoNevoa(forma);
  }

  /** Contorno do que está sendo desenhado, e o pincel embaixo do cursor. */
  private desenharPrevia() {
    const g = this.previa;
    g.clear();
    if (this.ferramenta !== 'nevoa' && this.ferramenta !== 'area') return;
    const largura = 2 / this.viewport.scale.x;
    const cor = this.ferramenta === 'area' ? COR_AREA : this.opcoesNevoa.op === 'revelar' ? COR_REVELAR : COR_ESCONDER;
    if (this.retangulo) {
      const { inicio, fim } = this.retangulo;
      g.rect(Math.min(inicio.x, fim.x), Math.min(inicio.y, fim.y), Math.abs(fim.x - inicio.x), Math.abs(fim.y - inicio.y))
        .fill({ color: cor, alpha: 0.12 }).stroke({ width: largura, color: cor });
    }
    if (this.ferramenta === 'area') return;
    if (this.traco && this.traco.length) {
      const raio = this.opcoesNevoa.raio;
      if (this.traco.length === 1) g.circle(this.traco[0].x, this.traco[0].y, raio).fill({ color: cor, alpha: 0.25 });
      else {
        g.moveTo(this.traco[0].x, this.traco[0].y);
        for (const ponto of this.traco.slice(1)) g.lineTo(ponto.x, ponto.y);
        g.stroke({ width: raio * 2, color: cor, alpha: 0.25, cap: 'round', join: 'round' });
      }
    }
    if (this.poligono) {
      const pontos = this.cursor ? [...this.poligono, this.cursor] : this.poligono;
      g.moveTo(pontos[0].x, pontos[0].y);
      for (const ponto of pontos.slice(1)) g.lineTo(ponto.x, ponto.y);
      g.stroke({ width: largura, color: cor });
      for (const ponto of this.poligono) g.circle(ponto.x, ponto.y, 4 * largura).fill(cor);
      // O primeiro ponto cresce quando o cursor chega perto: clicar ali fecha.
      if (this.cursor && fechaPoligono(this.poligono, this.cursor, this.viewport.scale.x)) {
        g.circle(this.poligono[0].x, this.poligono[0].y, 9 * largura).stroke({ width: largura, color: '#ffffff' });
      }
    }
    if (this.opcoesNevoa.forma === 'pincel' && this.cursor) {
      g.circle(this.cursor.x, this.cursor.y, this.opcoesNevoa.raio).stroke({ width: largura, color: cor, alpha: 0.9 });
    }
  }

  // -------------------------------------------------------------- tokens

  definirTokens(lista: ITokenMapa[]) {
    const tamanho = this.cena?.grade.tamanho ?? 100;
    const vistos = new Set<string>();
    for (const dados of lista) {
      vistos.add(dados.id);
      let token = this.tokens.get(dados.id);
      const arrastando = this.arrasto?.id === dados.id;
      if (!token) {
        token = new TokenVisual(dados, tamanho);
        this.tokens.set(dados.id, token);
        this.camadaTokens.addChild(token.raiz);
        this.ligarToken(token);
      } else {
        token.atualizar(dados, tamanho, !arrastando);
      }
      token.definirSelecionado(dados.id === this.selecionado);
      token.definirVez(dados.id === this.vez);
      void this.carregarRetrato(token);
    }
    for (const [id, token] of this.tokens) {
      if (vistos.has(id)) continue;
      token.destruir();
      this.tokens.delete(id);
    }
  }

  private async carregarRetrato(token: TokenVisual) {
    const { imagem, id } = token.dados;
    if (!imagem) {
      token.definirRetrato(null);
      return;
    }
    const url = urlImagemDoToken(this.campanhaId, id, imagem);
    const { enquadramento } = token.dados;
    const chave = `${url}|${enquadramento.zoom}|${enquadramento.x}|${enquadramento.y}`;
    if (!this.retratos.has(chave)) this.retratos.set(chave, retratoRedondo(url, enquadramento).catch(() => null));
    const textura = await this.retratos.get(chave)!;
    if (this.tokens.get(id) === token && token.dados.imagem === imagem && token.dados.enquadramento === enquadramento) token.definirRetrato(textura);
  }

  private ligarToken(token: TokenVisual) {
    token.raiz.on('pointerdown', (evento) => {
      if (evento.altKey || this.ferramenta !== 'mover') return;
      evento.stopPropagation();
      const ponto = this.viewport.toWorld(evento.global);
      if (!token.dados.pode_mover) {
        this.eventos.aoSelecionar(token.dados.id);
        return;
      }
      this.arrasto = { id: token.dados.id, dx: ponto.x - token.raiz.x, dy: ponto.y - token.raiz.y, inicio: { x: ponto.x, y: ponto.y }, moveu: false };
      this.viewport.plugins.pause('drag');
      this.viewport.plugins.pause('decelerate');
      this.camadaTokens.addChild(token.raiz);
      token.raiz.cursor = 'grabbing';
    });
  }

  /** Posição vinda de outra pessoa (já interpolada). */
  moverToken(id: string, x: number, y: number) {
    if (this.arrasto?.id === id) return;
    const token = this.tokens.get(id);
    if (!token) return;
    token.raiz.position.set(x, y);
    token.dados = { ...token.dados, x, y };
  }

  posicaoDe(id: string): IPonto | null {
    const token = this.tokens.get(id);
    return token ? { x: token.raiz.x, y: token.raiz.y } : null;
  }

  definirSelecionado(id: string | null) {
    this.selecionado = id;
    for (const [tokenId, token] of this.tokens) token.definirSelecionado(tokenId === id);
  }

  definirVez(id: string | null) {
    this.vez = id;
    for (const [tokenId, token] of this.tokens) token.definirVez(tokenId === id);
  }

  // ------------------------------------------------------ régua e pings

  private criarRegua(cor: string): Regua {
    const linha = new Graphics();
    const rotulo = new Text({ text: '', style: { fontFamily: 'system-ui, sans-serif', fontWeight: '700', fontSize: 16, fill: '#ffffff', stroke: { color: cor, width: 4 } } });
    rotulo.anchor.set(0.5, 1);
    this.camadaReguas.addChild(linha, rotulo);
    return { linha, rotulo };
  }

  private desenharRegua(regua: Regua, pontos: IPonto[], cor: string, nome?: string) {
    if (!this.cena) return;
    const escala = 1 / this.viewport.scale.x;
    regua.linha.clear();
    regua.linha.moveTo(pontos[0].x, pontos[0].y);
    for (const ponto of pontos.slice(1)) regua.linha.lineTo(ponto.x, ponto.y);
    regua.linha.stroke({ width: 4 * escala, color: cor, alpha: 0.95 });
    for (const ponto of pontos) regua.linha.circle(ponto.x, ponto.y, 5 * escala).fill(cor);
    const { quadrados, metros } = medir(pontos, this.cena.grade);
    const fim = pontos[pontos.length - 1];
    regua.rotulo.text = `${nome ? `${nome}: ` : ''}${quadrados.toLocaleString('pt-BR')} q · ${metros.toLocaleString('pt-BR')} m`;
    regua.rotulo.scale.set(escala);
    regua.rotulo.position.set(fim.x, fim.y - 10 * escala);
  }

  private desenharReguaLocal() {
    if (!this.pontosRegua) return;
    this.reguaLocal ??= this.criarRegua('#f6ad55');
    this.desenharRegua(this.reguaLocal, this.pontosRegua, '#f6ad55');
  }

  reguaRemota(por: string, pontos: IPonto[] | null, cor: string, nome: string) {
    let regua = this.reguasRemotas.get(por);
    if (!pontos || pontos.length < 2) {
      regua?.linha.destroy();
      regua?.rotulo.destroy();
      this.reguasRemotas.delete(por);
      return;
    }
    if (!regua) {
      regua = this.criarRegua(cor);
      this.reguasRemotas.set(por, regua);
    }
    this.desenharRegua(regua, pontos, cor, nome);
  }

  private pingLocal(x: number, y: number) {
    this.ping(x, y, '#f6ad55');
    this.eventos.aoPing(x, y);
  }

  ping(x: number, y: number, cor: string, nome?: string) {
    const grupo = new Container();
    grupo.position.set(x, y);
    grupo.addChild(new Graphics());
    if (nome) {
      const rotulo = new Text({ text: nome, style: { fontFamily: 'system-ui, sans-serif', fontWeight: '700', fontSize: 14, fill: '#ffffff', stroke: { color: cor, width: 4 } } });
      rotulo.anchor.set(0.5, 0);
      rotulo.scale.set(1 / this.viewport.scale.x);
      rotulo.y = 30 / this.viewport.scale.x;
      grupo.addChild(rotulo);
    }
    this.pings.set(grupo, { nascimento: performance.now(), cor });
    this.camadaPings.addChild(grupo);
  }

  private animarPings(agora: number) {
    const escala = 1 / this.viewport.scale.x;
    for (const [grupo, { nascimento, cor }] of this.pings) {
      const idade = agora - nascimento;
      if (idade > 1800) {
        this.pings.delete(grupo);
        grupo.destroy({ children: true });
        continue;
      }
      const anel = grupo.children[0] as Graphics;
      anel.clear();
      for (let onda = 0; onda < 2; onda++) {
        const t = ((idade / 900) + onda * 0.5) % 1;
        anel.circle(0, 0, (12 + t * 60) * escala).stroke({ width: 4 * escala, color: cor, alpha: 1 - t });
      }
      anel.circle(0, 0, 6 * escala).fill(cor);
    }
  }

  destruir() {
    if (this.carregarVisiveis !== null) window.clearTimeout(this.carregarVisiveis);
    this.clima.destruir();
    esquecerTexturasDeMoldura();
    this.app.destroy({ removeView: true }, { children: true, texture: true, textureSource: true });
    // O que sobrou da névoa e do clima vai depois do renderizador, que já não desenha nada com elas.
    this.nevoa.destruir();
    esquecerTexturasDoClima();
  }
}
