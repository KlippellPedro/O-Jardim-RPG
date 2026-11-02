// O palco do mapa: Pixi 8 + pixi-viewport, rodando direto (sem @pixi/react,
// que pede React 19). Camadas: mapa (ladrilhos), grade, tokens, réguas e
// pings. A página fala com ele por métodos e recebe os gestos por callbacks;
// o arrasto a 60 quadros por segundo não passa pelo React.

import { Application, Container, Graphics, Text, Texture, Sprite } from 'pixi.js';
import { Viewport } from 'pixi-viewport';
import type { ICena, ITokenMapa } from '../../../services/mapaApi';
import { urlImagemDoToken, urlPedaco } from '../../../services/mapaApi';
import { encaixar, medir, raioHex, LADO_LADRILHO, type IGrade, type IPonto } from './geometria';
import { TokenVisual } from './token';

export type Ferramenta = 'mover' | 'regua' | 'ping';

export interface EventosPalco {
  aoArrastar: (id: string, x: number, y: number) => void;
  aoSoltar: (id: string, x: number, y: number) => void;
  aoSelecionar: (id: string | null) => void;
  aoPing: (x: number, y: number) => void;
  aoRegua: (pontos: IPonto[] | null) => void;
}

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

/** Retrato quadrado vira redondo antes de virar textura: o motor não precisa de máscara. */
async function retratoRedondo(url: string): Promise<Texture> {
  const resposta = await fetch(url, { credentials: 'same-origin' });
  if (!resposta.ok) throw new Error(`retrato ${resposta.status}`);
  const imagem = await createImageBitmap(await resposta.blob());
  const lado = 256;
  const tela = new OffscreenCanvas(lado, lado);
  const ctx = tela.getContext('2d')!;
  ctx.beginPath();
  ctx.arc(lado / 2, lado / 2, lado / 2, 0, Math.PI * 2);
  ctx.clip();
  const escala = lado / Math.min(imagem.width, imagem.height);
  const w = imagem.width * escala;
  const h = imagem.height * escala;
  ctx.drawImage(imagem, (lado - w) / 2, (lado - h) / 2, w, h);
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
    this.camadaMapa.addChild(this.camadaReduzida, this.camadaDetalhe);
    viewport.addChild(this.camadaMapa, this.grade, this.camadaTokens, this.camadaReguas, this.camadaPings);
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
      this.eventos.aoSelecionar(null);
    });

    app.stage.on('globalpointermove', (evento) => {
      const ponto = viewport.toWorld(evento.global);
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

    app.ticker.add(() => {
      const agora = performance.now();
      for (const token of this.tokens.values()) token.pulsar(agora);
      for (const callback of this.quadroCallbacks) callback();
      this.animarPings(agora);
    });
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

  definirCena(cena: ICena, campanhaId: string) {
    const anterior = this.cena;
    this.cena = cena;
    this.campanhaId = campanhaId;
    const mudouMapa = anterior?.mapa?.id !== cena.mapa?.id || anterior?.id !== cena.id;
    if (mudouMapa) {
      this.camadaReduzida.removeChildren().forEach((filho) => filho.destroy());
      this.camadaDetalhe.removeChildren().forEach((filho) => filho.destroy());
      this.ladrilhosPedidos.clear();
      this.desenharFundo();
      void this.carregarReduzido();
      if (anterior?.id !== cena.id) this.enquadrar();
    }
    this.desenharGrade(cena.grade);
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
    const reduzidos = mapa.chaves.filter((c) => c.startsWith('n2/'));
    // Sem versão reduzida (imagem até 2048 px), a "reduzida" é a própria imagem inteira.
    const chaves = reduzidos.length ? reduzidos : mapa.chaves.filter((c) => c.startsWith('n0/'));
    const escala = reduzidos.length ? 4 : 1;
    await Promise.all(chaves.map(async (chave) => {
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
        // Ladrilho que não veio deixa só o fundo naquele pedaço.
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

  /** Ladrilhos no tamanho cheio só do pedaço que está na tela e só com o zoom de perto. */
  private async carregarLadrilhosVisiveis() {
    const mapa = this.cena?.mapa;
    if (!mapa || !mapa.chaves.some((c) => c.startsWith('n2/'))) return;
    if (this.viewport.scale.x < ZOOM_DETALHE) return;
    const visivel = this.viewport.getVisibleBounds();
    const pedidos: string[] = [];
    for (const chave of mapa.chaves) {
      if (!chave.startsWith('n0/') || this.ladrilhosPedidos.has(chave)) continue;
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
    this.ferramenta = ferramenta;
    // Com régua ou ping, o botão esquerdo é da ferramenta; o mapa anda com o do meio ou o direito.
    this.viewport.drag({ mouseButtons: ferramenta === 'mover' ? 'all' : 'middle-right' });
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
    if (!this.retratos.has(url)) this.retratos.set(url, retratoRedondo(url).catch(() => null));
    const textura = await this.retratos.get(url)!;
    if (this.tokens.get(id) === token && token.dados.imagem === imagem) token.definirRetrato(textura);
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
    this.app.destroy({ removeView: true }, { children: true, texture: true, textureSource: true });
  }
}
