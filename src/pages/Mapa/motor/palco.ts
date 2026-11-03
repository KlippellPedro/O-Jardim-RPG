// O palco do mapa: Pixi 8 + pixi-viewport, rodando direto (sem @pixi/react,
// que pede React 19). Camadas: mapa (ladrilhos), grade, névoa, tokens, clima,
// réguas, desenho em andamento e pings. A página fala com ele por métodos e
// recebe os gestos por callbacks; o arrasto a 60 quadros por segundo não passa
// pelo React.

import { Application, Container, Graphics, Text, Texture, Sprite } from 'pixi.js';
import { Viewport } from 'pixi-viewport';
import type { CamadaMapaId, CamadaTokenId, FormaMagia, IAberturaCena, IAnotacaoMapa, IAreaClima, ICena, IClima, IFormaNevoa, IMagiaMapa, ITokenMapa, OperacaoNevoa } from '../../../services/mapaApi';
import { urlImagemDoToken, urlPedaco } from '../../../services/mapaApi';
import { encaixar, medir, raioHex, LADO_LADRILHO, type IGrade, type IPonto } from './geometria';
import { TokenVisual, esquecerTexturasDeMoldura } from './token';
import { desenharRetrato, type Enquadramento } from './molduras';
import { CamadaNevoa } from './nevoa';
import { CamadaClima, esquecerTexturasDoClima } from './clima';
import { CamadaLuzes, fonteDoToken, type FonteDeLuz } from './luzes';
import { EfeitosDeMagia, corDoFluxo, desenharMira } from './magia';
import { CamadaCeu } from './ceu';
import type { ILuzDoCeu } from './ceuConta';
import { CamadaPortais } from './portais';
import { CamadaAberturas } from './aberturas';
import { CamadaLiquidos } from './liquidos';
import { CamadaAnotacoes } from './anotacoes';
import { corDaLuz, faseDe, tremor } from './luzesConta';
import { bocaEm, type LadoPortal } from './portaisConta';
import { portaEm } from './portasConta';
import { type IPreferenciasBarrasMapa, PREFERENCIAS_BARRAS_PADRAO } from './barrasToken';
import {
  acrescentarAoTraco, chavesDoFundo, detalheSempre, fechaPoligono, formaDoPoligono, formaDoRetangulo, formaDoTraco, MAX_PONTOS_TRACO,
} from './nevoaGeometria';

/** `nevoa`: o Mestre desenha a névoa; `area`: o Mestre marca a área de um efeito de clima;
 * `magia`: qualquer um mira e solta um efeito de magia que a mesa inteira vê;
 * `portal`: o Mestre cria portais (dois cliques) e arrasta as bocas. */
export type Ferramenta = 'mover' | 'regua' | 'ping' | 'nevoa' | 'area' | 'magia' | 'portal' | 'texto';

export interface OpcoesMagia {
  forma: FormaMagia;
  fluxo: string;
}
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
  aoMagia: (magia: IMagiaMapa) => void;
  /** Ferramenta de portal: as duas bocas de um portal novo, um portal escolhido e uma boca movida. */
  aoPortalNovo: (a: IPonto, b: IPonto) => void;
  aoSelecionarPortal: (id: string | null) => void;
  aoMoverPortal: (id: string, lado: LadoPortal, ponto: IPonto) => void;
  aoCriarAnotacao: (ponto: IPonto) => void;
  aoSelecionarAnotacao: (id: string) => void;
  aoMoverAnotacao: (id: string, x: number, y: number) => void;
  /** Clique numa porta do mapa montado (o jogador abre e fecha; o Mestre recebe o menu da porta). */
  aoPorta?: (porta: IAberturaCena) => void;
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
  /** Mapa e grade juntos: é a camada que treme com o calor do clima (os tokens ficam firmes). */
  private camadaFundo = new Container();
  private camadaTokens = new Container();
  private camadaProps = new Container();
  private camadaMontarias = new Container();
  private camadaPersonagens = new Container();
  private anotacoes = new CamadaAnotacoes();
  /** Brilho das luzes dos tokens, entre a névoa e os tokens. */
  private luzes = new CamadaLuzes();
  private camadaReguas = new Container();
  private camadaPings = new Container();
  private previa = new Graphics();
  private nevoa!: CamadaNevoa;
  private clima!: CamadaClima;
  /** Luz do dia: a escuridão e a tinta da hora, por cima dos tokens. */
  private ceu!: CamadaCeu;
  private portais = new CamadaPortais();
  /** Portas do mapa montado no construtor, por cima da imagem (que só tem o vão). */
  private aberturas = new CamadaAberturas();
  /** Água e lava do mapa montado, com movimento (embaixo da névoa). */
  private liquidos = new CamadaLiquidos();
  /** Ferramenta de portal: a primeira boca de um portal novo, ou a boca que está sendo arrastada. */
  private bocaPendente: IPonto | null = null;
  private arrastoPortal: { id: string; lado: LadoPortal; ponto: IPonto; moveu: boolean } | null = null;
  /** Com a névoa, os pedaços do mapa que o servidor libera para este jogador; null baixa tudo. */
  private liberados: Set<string> | null = null;
  private reduzidosPedidos = new Set<string>();
  private gestor = false;
  private opcoesNevoa: OpcoesNevoa = { op: 'revelar', forma: 'pincel', raio: 100 };
  private traco: IPonto[] | null = null;
  private retangulo: { inicio: IPonto; fim: IPonto } | null = null;
  private poligono: IPonto[] | null = null;
  private cursor: IPonto | null = null;
  private magias = new EfeitosDeMagia();
  private opcoesMagia: OpcoesMagia = { forma: 'circulo', fluxo: 'essencia' };
  /** A mira da magia: da origem (já no meio da casa) até onde a mão está. */
  private mira: { inicio: IPonto; fim: IPonto } | null = null;
  private rotuloMira: Text | null = null;
  private tokens = new Map<string, TokenVisual>();
  private preferenciasBarras = PREFERENCIAS_BARRAS_PADRAO;
  /** Tokens que saíram e ainda estão encolhendo na tela. */
  private saindo = new Set<TokenVisual>();
  /** Cena nova: os tokens da anterior somem na hora, sem animação. */
  private cenaTrocada = false;
  private retratos = new Map<string, Promise<Texture | null>>();
  private ladrilhosPedidos = new Set<string>();
  private cena: ICena | null = null;
  private campanhaId = '';
  private ferramenta: Ferramenta = 'mover';
  private selecionado: string | null = null;
  private anotacaoSelecionada: string | null = null;
  private vez: string | null = null;
  private reguasRemotas = new Map<string, Regua>();
  private pings = new Map<Container, { nascimento: number; cor: string }>();
  private reguaLocal: Regua | null = null;
  private pontosRegua: IPonto[] | null = null;
  private arrasto: { id: string; dx: number; dy: number; inicio: IPonto; moveu: boolean } | null = null;
  private arrastoAnotacao: { id: string; dx: number; dy: number; moveu: boolean } | null = null;
  private quadroCallbacks: Array<() => void> = [];
  private carregarVisiveis: number | null = null;

  private constructor(private app: Application, readonly viewport: Viewport, private eventos: EventosPalco) {}

  static async criar(alvo: HTMLElement, eventos: EventosPalco): Promise<PalcoMapa> {
    const app = new Application();
    await app.init({
      resizeTo: alvo,
      // `?motor=webgl` força o WebGL: serve para testar os dois caminhos dos shaders e de saída
      // para uma placa de vídeo que se dê mal com o WebGPU.
      preference: new URLSearchParams(window.location.search).get('motor') === 'webgl' ? 'webgl' : 'webgpu',
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
    this.clima = new CamadaClima(app.renderer, this.camadaFundo);
    this.ceu = new CamadaCeu(app.renderer);
    this.camadaTokens.addChild(this.camadaProps, this.camadaMontarias, this.camadaPersonagens);
    this.camadaMapa.addChild(this.camadaReduzida, this.camadaDetalhe);
    // A névoa cobre o mapa e fica por baixo dos tokens: o servidor já tira do jogador o que ela esconde.
    this.camadaFundo.addChild(this.camadaMapa, this.liquidos.raiz, this.aberturas.raiz, this.grade);
    // Os portais ficam no chão (embaixo dos tokens); a luz do dia e o clima, por cima de tudo que está no mapa.
    viewport.addChild(
      this.camadaFundo, this.anotacoes.raiz, this.nevoa.raiz, this.portais.raiz, this.luzes.raiz, this.camadaTokens, this.ceu.raiz, this.clima.raiz,
      this.magias.raiz, this.camadaReguas, this.previa, this.camadaPings,
    );
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
      if (this.ferramenta === 'nevoa' || this.ferramenta === 'area' || this.ferramenta === 'magia') {
        // Botão do meio e o direito continuam arrastando o mapa.
        if (evento.button === 0) this.comecarDesenho({ x: ponto.x, y: ponto.y });
        return;
      }
      if (this.ferramenta === 'portal') {
        if (evento.button === 0) this.cliquePortal({ x: ponto.x, y: ponto.y });
        return;
      }
      if (this.ferramenta === 'texto') {
        if (evento.button === 0 && this.gestor) this.eventos.aoCriarAnotacao({ x: ponto.x, y: ponto.y });
        return;
      }
      if (evento.button === 0 && this.cena?.aberturas?.length && this.eventos.aoPorta) {
        const porta = portaEm(this.cena.aberturas, ponto, this.cena.grade.tamanho, viewport.scale.x);
        if (porta) {
          this.eventos.aoPorta(porta);
          return;
        }
      }
      this.eventos.aoSelecionar(null);
    });

    app.stage.on('globalpointermove', (evento) => {
      const ponto = viewport.toWorld(evento.global);
      if (this.arrastoAnotacao) {
        this.arrastoAnotacao.moveu = true;
        this.anotacoes.moverTemporariamente(this.arrastoAnotacao.id, ponto.x - this.arrastoAnotacao.dx, ponto.y - this.arrastoAnotacao.dy);
        return;
      }
      if (this.ferramenta === 'nevoa' || this.ferramenta === 'area' || this.ferramenta === 'magia') {
        this.continuarDesenho({ x: ponto.x, y: ponto.y });
        return;
      }
      if (this.arrastoPortal) {
        this.arrastoPortal.ponto = this.encaixarPonto(ponto);
        this.arrastoPortal.moveu = true;
        this.portais.definirArrastada(this.arrastoPortal);
        return;
      }
      if (this.arrasto) {
        const token = this.tokens.get(this.arrasto.id);
        if (!token) return;
        if (!this.arrasto.moveu && Math.hypot(ponto.x - this.arrasto.inicio.x, ponto.y - this.arrasto.inicio.y) * viewport.scale.x < 4) return;
        if (!this.arrasto.moveu) token.levantar(true);
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
      if (this.traco || this.retangulo || this.mira) {
        this.terminarDesenho();
        return;
      }
      if (this.arrastoPortal) {
        const { id, lado, ponto, moveu } = this.arrastoPortal;
        this.arrastoPortal = null;
        this.viewport.plugins.resume('drag');
        if (moveu) this.eventos.aoMoverPortal(id, lado, ponto);
        else this.portais.definirArrastada(null);
        return;
      }
      if (this.arrastoAnotacao) {
        const { id, moveu } = this.arrastoAnotacao;
        this.arrastoAnotacao = null;
        viewport.plugins.resume('drag');
        const ponto = this.anotacoes.posicao(id);
        if (moveu && ponto) this.eventos.aoMoverAnotacao(id, ponto.x, ponto.y);
        return;
      }
      if (this.arrasto) {
        const { id, moveu, inicio } = this.arrasto;
        this.arrasto = null;
        viewport.plugins.resume('drag');
        viewport.plugins.resume('decelerate');
        const token = this.tokens.get(id);
        if (!token) return;
        token.raiz.cursor = 'grab';
        token.levantar(false);
        if (!moveu) {
          // O token ao lado da porta cobre o batente: um clique em cima da linha da porta abre
          // a porta (a margem é curta, para o clique no token continuar escolhendo o token).
          const porta = this.cena?.aberturas?.length && this.eventos.aoPorta
            ? portaEm(this.cena.aberturas, inicio, this.cena.grade.tamanho * 0.4, viewport.scale.x * 2)
            : null;
          if (porta) this.eventos.aoPorta?.(porta);
          else this.eventos.aoSelecionar(id);
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
      for (const token of this.saindo) {
        if (!token.pulsar(agora)) continue;
        this.saindo.delete(token);
        token.destruir();
      }
      for (const callback of this.quadroCallbacks) callback();
      this.animarPings(agora);
      this.magias.quadro(agora);
      this.nevoa.quadro(agora);
      this.portais.quadro(agora, viewport.scale.x);
      this.liquidos.quadro(agora);
      if (this.cena) {
        const fontes = this.fontesDeLuz(agora);
        this.luzes.quadro(fontes);
        this.ceu.quadro(Math.min(0.1, ticker.deltaMS / 1000), fontes, this.cena.grade.tamanho);
        this.clima.quadro({
          dt: Math.min(0.1, ticker.deltaMS / 1000),
          agora,
          vista: viewport.getVisibleBounds(),
          escala: viewport.scale.x,
          luzes: fontes,
          tamanhoCasa: this.cena.grade.tamanho,
        });
      }
    });
  }

  /** As luzes de agora (a chama treme a cada quadro), na posição em que cada token está na tela. */
  private fontesDeLuz(agora: number): FonteDeLuz[] {
    const saida: FonteDeLuz[] = [];
    const casa = this.cena?.grade.tamanho ?? 100;
    for (const token of this.tokens.values()) {
      const fonte = fonteDoToken(token.dados, token.raiz.x, token.raiz.y, casa, agora);
      if (fonte) saida.push(fonte);
    }
    // Luzes fixas do mapa montado (tocha na parede, braseiro): brilham e abrem o escuro como a de um token.
    for (const luz of this.cena?.luzes ?? []) {
      const id = `cena:${luz.id}`;
      const forca = luz.tremula ? tremor(agora, faseDe(id)) : 1;
      saida.push({ id, x: luz.x, y: luz.y, raio: luz.raio * casa * forca, cor: corDaLuz(luz.cor), forca });
    }
    return saida;
  }

  aoQuadro(callback: () => void) {
    this.quadroCallbacks.push(callback);
  }

  /** Com o construtor de mapas aberto por cima, o mapa da mesa para de desenhar (e volta depois). */
  pausar(sim: boolean) {
    if (sim) this.app.ticker.stop();
    else this.app.ticker.start();
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
        this.anotacaoSelecionada = null;
        this.cancelarDesenho();
        this.enquadrar();
        this.cenaTrocada = true;
      }
    }
    // Com a névoa, o Mestre revelar mais libera pedaços novos: busca só os que faltam.
    void this.carregarReduzido();
    this.desenharGrade(cena.grade);
    this.nevoa.definir(cena.nevoa ?? null, cena.largura, cena.altura, gestor, cena.grade.tamanho);
    this.clima.definir(cena.clima ?? null, cena.largura, cena.altura, gestor);
    this.portais.definir(cena.portais ?? [], cena.grade.tamanho, gestor);
    this.aberturas.definir(cena.aberturas ?? [], cena.grade.tamanho, gestor);
    this.liquidos.definir(cena.liquidos, cena.largura, cena.altura, cena.grade.tamanho);
    this.anotacoes.definir(cena.anotacoes ?? [], this.anotacaoSelecionada, (id, global) => this.selecionarAnotacao(id, global));
    this.agendarLadrilhos();
  }

  definirAnotacoes(anotacoes: IAnotacaoMapa[]) {
    if (!this.cena) return;
    this.anotacoes.definir(anotacoes, this.anotacaoSelecionada, (id, global) => this.selecionarAnotacao(id, global));
  }

  definirCamadasVisiveis(camadas: CamadaMapaId[]) {
    const visiveis = new Set(camadas);
    this.camadaFundo.visible = visiveis.has('mapa');
    this.camadaProps.visible = visiveis.has('props');
    this.camadaMontarias.visible = visiveis.has('montarias');
    this.camadaPersonagens.visible = visiveis.has('personagens');
    this.anotacoes.raiz.visible = visiveis.has('anotacoes');
  }

  private selecionarAnotacao(id: string, global: IPonto) {
    this.anotacaoSelecionada = id;
    this.anotacoes.definir(this.cena?.anotacoes ?? [], id, (nota, ponto) => this.selecionarAnotacao(nota, ponto));
    this.eventos.aoSelecionarAnotacao(id);
    if (!this.gestor || this.ferramenta !== 'mover') return;
    const atual = this.anotacoes.posicao(id);
    if (!atual) return;
    const ponto = this.viewport.toWorld(global);
    this.arrastoAnotacao = { id, dx: ponto.x - atual.x, dy: ponto.y - atual.y, moveu: false };
    this.viewport.plugins.pause('drag');
  }

  /** A luz do dia que vale agora na cena (null: a luz dela não muda com a hora). `imediato` pula a troca lenta. */
  definirCeu(luz: ILuzDoCeu | null, imediato = false) {
    if (!this.cena) return;
    this.ceu.definir(luz, this.cena.largura, this.cena.altura, this.gestor, imediato);
  }

  // ------------------------------------------------------------ portais

  private cliquePortal(ponto: IPonto) {
    const casa = this.cena?.grade.tamanho ?? 100;
    const achada = bocaEm(this.cena?.portais ?? [], ponto, casa);
    if (achada) {
      // Pegou uma boca: escolhe o portal e, se arrastar, move a boca.
      this.bocaPendente = null;
      this.portais.definirPendente(null);
      this.eventos.aoSelecionarPortal(achada.portal.id);
      this.arrastoPortal = { id: achada.portal.id, lado: achada.lado, ponto: achada.portal[achada.lado] ?? ponto, moveu: false };
      this.viewport.plugins.pause('drag');
      return;
    }
    const boca = this.encaixarPonto(ponto);
    if (!this.bocaPendente) {
      this.bocaPendente = boca;
      this.portais.definirPendente(boca);
      this.eventos.aoSelecionarPortal(null);
      return;
    }
    const primeira = this.bocaPendente;
    this.bocaPendente = null;
    this.portais.definirPendente(null);
    if (Math.hypot(boca.x - primeira.x, boca.y - primeira.y) < casa * 0.5) return;
    this.eventos.aoPortalNovo(primeira, boca);
  }

  selecionarPortal(id: string | null) {
    this.portais.selecionar(id);
  }

  /** O servidor gravou: a boca arrastada volta a ser a do estado. */
  esquecerBocaArrastada() {
    this.portais.definirArrastada(null);
  }

  /** Um token atravessou: some de um lado e surge do outro, com as bocas piscando na cor do Fluxo. */
  teletransportar(id: string, de: IPonto | null, para: IPonto, fluxo: string) {
    const agora = performance.now();
    this.portais.clarear([de, para], fluxo, agora);
    const token = this.tokens.get(id);
    if (!token || this.arrasto?.id === id) return;
    token.raiz.position.set(para.x, para.y);
    token.dados = { ...token.dados, x: para.x, y: para.y };
    token.surgir(agora);
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
    return Boolean(this.traco || this.retangulo || this.poligono || this.mira || this.bocaPendente);
  }

  cancelarDesenho() {
    this.traco = null;
    this.retangulo = null;
    this.poligono = null;
    this.mira = null;
    this.bocaPendente = null;
    this.portais.definirPendente(null);
    this.viewport.plugins.resume('drag');
    this.desenharPrevia();
  }

  definirOpcoesMagia(opcoes: OpcoesMagia) {
    this.opcoesMagia = opcoes;
    this.desenharPrevia();
  }

  /** Um efeito de magia acontece no mapa: o meu (na hora) ou o de outra pessoa (pelo tempo real). */
  magia(magia: IMagiaMapa, nome?: string) {
    this.magias.lancar(magia, this.cena?.grade.tamanho ?? 100, nome);
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
    if (this.ferramenta === 'magia') {
      // A magia sai do meio de uma casa, como o alcance das regras é contado.
      this.mira = { inicio: this.encaixarPonto(ponto), fim: ponto };
      this.viewport.plugins.pause('drag');
    } else if (this.ferramenta === 'area') {
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
    if (this.mira) this.mira.fim = ponto;
    this.desenharPrevia();
  }

  private terminarDesenho() {
    this.viewport.plugins.resume('drag');
    if (this.mira) {
      const { inicio, fim } = this.mira;
      this.mira = null;
      const casa = this.cena?.grade.tamanho ?? 100;
      const distancia = Math.hypot(fim.x - inicio.x, fim.y - inicio.y);
      // Clique sem arrastar só vale para o impacto (estoura no próprio ponto).
      if (this.opcoesMagia.forma === 'impacto' || distancia >= casa * 0.4) {
        const alvo = this.opcoesMagia.forma === 'impacto' && distancia < casa * 0.4 ? inicio : fim;
        const magia: IMagiaMapa = { ...this.opcoesMagia, x: inicio.x, y: inicio.y, ax: alvo.x, ay: alvo.y };
        this.magia(magia);
        this.eventos.aoMagia(magia);
      }
    }
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

  /** Contorno da área da magia e o tamanho em casas e metros, enquanto a pessoa mira. */
  private desenharMira() {
    if (!this.mira || !this.cena) return;
    const { inicio, fim } = this.mira;
    const escala = 1 / this.viewport.scale.x;
    const casa = this.cena.grade.tamanho;
    desenharMira(this.previa, this.opcoesMagia.forma, inicio, fim, corDoFluxo(this.opcoesMagia.fluxo), 2 * escala, casa);
    const { quadrados, metros } = medir([inicio, fim], this.cena.grade);
    const nome = { circulo: 'Raio', cone: 'Cone', linha: 'Linha', impacto: 'Alcance' }[this.opcoesMagia.forma];
    this.rotuloMira ??= this.criarRegua('#c084fc').rotulo;
    this.rotuloMira.visible = true;
    this.rotuloMira.text = `${nome}: ${quadrados.toLocaleString('pt-BR')} q · ${metros.toLocaleString('pt-BR')} m`;
    this.rotuloMira.scale.set(escala);
    this.rotuloMira.position.set(fim.x, fim.y - 14 * escala);
  }

  /** Contorno do que está sendo desenhado, e o pincel embaixo do cursor. */
  private desenharPrevia() {
    const g = this.previa;
    g.clear();
    if (this.rotuloMira) this.rotuloMira.visible = false;
    if (this.ferramenta === 'magia') {
      this.desenharMira();
      return;
    }
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
        token = new TokenVisual(dados, tamanho, this.preferenciasBarras);
        this.tokens.set(dados.id, token);
        this.containerDaCamada(dados.camada).addChild(token.raiz);
        this.ligarToken(token);
      } else {
        token.atualizar(dados, tamanho, !arrastando);
        const container = this.containerDaCamada(dados.camada);
        if (token.raiz.parent !== container) container.addChild(token.raiz);
      }
      token.definirSelecionado(dados.id === this.selecionado);
      token.definirVez(dados.id === this.vez);
      void this.carregarRetrato(token);
    }
    for (const [id, token] of this.tokens) {
      if (vistos.has(id)) continue;
      this.tokens.delete(id);
      if (this.cenaTrocada) {
        token.destruir();
      } else {
        // Saiu da cena (tirado, escondido, entrou na névoa): encolhe e some.
        token.sair(performance.now());
        this.saindo.add(token);
      }
    }
    this.cenaTrocada = false;
  }

  private containerDaCamada(camada: CamadaTokenId | undefined) {
    if (camada === 'props') return this.camadaProps;
    if (camada === 'montarias') return this.camadaMontarias;
    return this.camadaPersonagens;
  }

  definirPreferenciasBarras(preferencias: IPreferenciasBarrasMapa) {
    this.preferenciasBarras = preferencias;
    for (const token of this.tokens.values()) token.definirPreferenciasBarras(preferencias);
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
      token.raiz.parent?.addChild(token.raiz);
      token.raiz.cursor = 'grabbing';
    });
  }

  /** Posição vinda de outra pessoa (já interpolada). */
  moverToken(id: string, x: number, y: number) {
    if (this.arrasto?.id === id) return;
    const token = this.tokens.get(id);
    if (!token) return;
    if (token.raiz.x !== x || token.raiz.y !== y) token.marcarMovimento(performance.now());
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
    this.luzes.destruir();
    this.magias.destruir();
    esquecerTexturasDeMoldura();
    this.app.destroy({ removeView: true }, { children: true, texture: true, textureSource: true });
    // O que sobrou da névoa e do clima vai depois do renderizador, que já não desenha nada com elas.
    this.nevoa.destruir();
    esquecerTexturasDoClima();
  }
}
