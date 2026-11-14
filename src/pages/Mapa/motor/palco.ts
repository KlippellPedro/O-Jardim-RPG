// O palco do mapa: Pixi 8 + pixi-viewport, rodando direto (sem @pixi/react,
// que pede React 19). Camadas: mapa (ladrilhos), grade, névoa, tokens, clima,
// réguas, desenho em andamento e pings. A página fala com ele por métodos e
// recebe os gestos por callbacks; o arrasto a 60 quadros por segundo não passa
// pelo React.

import { Application, Container, Graphics, Text, Texture, Sprite } from 'pixi.js';
import { Viewport } from 'pixi-viewport';
import type { CamadaMapaId, CamadaTokenId, FormaMagia, IAberturaCena, IAnotacaoMapa, IAreaClima, ICena, IClima, IDesenhoFixo, IFormaNevoa, IMagiaMapa, IMapaColocado, ITokenMapa, OperacaoNevoa } from '../../../services/mapaApi';
import { urlImagemDoToken, urlPedaco } from '../../../services/mapaApi';
import { encaixar, medir, segmentosDaGrade, tracejar, LADO_LADRILHO, PADRAO_GRADE, rotuloUnidade, type IGrade, type IPonto, larguraLivreDosNomes } from './geometria';
import { TokenVisual, esquecerTexturasDeMoldura } from './token';
import { desenharRetrato, type Enquadramento } from './molduras';
import { CamadaNevoa } from './nevoa';
import { CamadaClima, esquecerTexturasDoClima } from './clima';
import { CamadaLuzes, fonteDoToken, type FonteDeLuz } from './luzes';
import { EfeitosDeMagia, corDoFluxo, desenharMira } from './magia';
import { ajustarMira } from './miraDaMagia';
import { CamadaCeu } from './ceu';
import type { ILuzDoCeu } from './ceuConta';
import { CamadaPortais } from './portais';
import { CamadaAberturas } from './aberturas';
import { CamadaLiquidos } from './liquidos';
import { CamadaAuras, type AuraNoMapa } from './auras';
import { CamadaAnotacoes } from './anotacoes';
import { CamadaTracos } from './tracos';
import { CamadaZonas } from './zonas';
import { textoDaCobertura, type CoberturaDaLinha } from './zonasConta';
import { textoDaDistanciaEm3D } from './elevacaoConta';
import { NumerosFlutuantes } from './numerosFlutuantes';
import type { IResultadoFlutuante } from './resultadoFlutuante';
import {
  DURACAO_DO_TRACO_FIXO_NA_TELA_MS, DURACAO_FIXA_MS, MAX_PONTOS_DO_TRACO, OPCOES_DE_DESENHO_PADRAO, acrescentarPontoDoLapis, reduzirPontos, tracoValeAPena, type FormaDeTraco, type OpcoesDeDesenho } from './tracosConta';
import { CamadaMapasColocados } from './mapasColocados';
import { acharAlcaDeGiro, acharCanto, acharMapaEm, caixaDoMapa, girarMapa, manterDentroDaCena, moverMapa, redimensionarMapa, type Canto } from './mapasColocadosConta';
import { corDaLuz, faseDe, tremor } from './luzesConta';
import { bocaEm, type LadoPortal } from './portaisConta';
import { portaEm } from './portasConta';
import { type IPreferenciasBarrasMapa, PREFERENCIAS_BARRAS_PADRAO } from './barrasToken';
import {
  acrescentarAoTraco, chavesDoFundo, detalheSempre, fechaPoligono, formaDoPoligono, formaDoRetangulo, formaDoTraco, MAX_PONTOS_TRACO,
} from './nevoaGeometria';

/** `nevoa`: o Mestre desenha a névoa; `area`: o Mestre marca a área de um efeito de clima;
 * `magia`: qualquer um mira e solta um efeito de magia que a mesa inteira vê;
 * `portal`: o Mestre cria portais (dois cliques) e arrasta as bocas;
 * Com `mover`, o Mestre também clica num mapa colocado na cena para escolher, arrasta para mudar de lugar,
 * puxa um canto para mudar o tamanho e gira pela alça de cima. */
export type Ferramenta = 'mover' | 'regua' | 'ping' | 'nevoa' | 'area' | 'magia' | 'portal' | 'texto' | 'desenho' | 'zona';

export interface OpcoesMagia {
  forma: FormaMagia;
  fluxo: string;
}
export type FormaDeDesenho = 'pincel' | 'retangulo' | 'poligono';

/** `perigo`: alerta vermelho (Shift); `olhar`: o Mestre chama todos para um ponto (Ctrl). */
export type TipoDePing = 'normal' | 'perigo' | 'olhar';

export interface OpcoesNevoa {
  op: OperacaoNevoa;
  forma: FormaDeDesenho;
  /** Raio do pincel em px do mapa. */
  raio: number;
}

export interface EventosPalco {
  aoArrastar: (id: string, x: number, y: number) => void;
  aoSoltar: (id: string, x: number, y: number) => void;
  /** Soltou um token-fonte (sem Shift): a página pede a cópia no lugar onde caiu, e a fonte volta para onde estava. */
  aoSoltarFonte?: (id: string, x: number, y: number) => void;
  aoSelecionar: (id: string | null) => void;
  aoPing: (x: number, y: number, tipo: TipoDePing) => void;
  /** Mestre: Alt + Ctrl + clique. A tela de todos vai para o ponto; o palco só avisa a página. */
  aoOlhemAqui?: (ponto: IPonto) => void;
  aoRegua: (pontos: IPonto[] | null) => void;
  /** A régua reta vai de um token a outro: a página pergunta ao servidor se há parede no caminho (cobertura total). */
  aoPerguntarLinha?: (de: string, para: string) => void;
  /** Soltou um traço do desenho livre: a página manda para a mesa (o palco já o desenhou). */
  aoTraco?: (traco: { id: string; forma: FormaDeTraco; pontos: IPonto[]; duracao: number; privado: boolean; cor: string }) => void;
  aoNevoa: (forma: IFormaNevoa) => void;
  aoArea: (area: IAreaClima) => void;
  /** O Mestre desenhou um retângulo com a ferramenta de zona: a página cria a zona e abre o painel dela. */
  aoZona?: (retangulo: { x: number; y: number; w: number; h: number }) => void;
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
  /** O mapa colocado escolhido (ou nenhum) e o lugar, o tamanho e o giro novos depois do arrasto. */
  aoSelecionarMapa?: (id: string | null) => void;
  aoMoverMapa?: (id: string, mudancas: Pick<IMapaColocado, 'x' | 'y' | 'escala'> & { rotacao: number }) => void;
  /** Clique parado do botão direito (ou toque longo): o ponto no mapa, o ponto na janela e o token ali, se houver. */
  aoContexto?: (ponto: IPonto, tela: IPonto, tokenId: string | null) => void;
}

const COR_REVELAR = '#5eead4';
const COR_ESCONDER = '#f87171';
const COR_AREA = '#93c5fd';
const COR_ZONA = '#e879f9';

interface Regua {
  linha: Graphics;
  rotulo: Text;
}

const ZOOM_DETALHE = 0.3;
const COR_PERIGO = '#ef4444';
const COR_OLHAR = '#fcd34d';
/** Quanto cada tipo de ping fica na tela (ms). */
const DURACAO_DO_PING: Record<TipoDePing, number> = { normal: 1800, perigo: 2800, olhar: 2600 };

async function texturaDe(url: string): Promise<Texture> {
  const resposta = await fetch(url, { credentials: 'same-origin' });
  if (!resposta.ok) throw new Error(`imagem ${resposta.status}`);
  const imagem = await createImageBitmap(await resposta.blob());
  return Texture.from(imagem);
}

/** Retrato quadrado vira redondo (com o enquadramento escolhido) antes de virar textura: o motor não precisa de máscara. */
// A foto baixada fica na memória: mexer no zoom refaz só o recorte, sem baixar a imagem de novo a cada passo.
const fotosBaixadas = new Map<string, Promise<ImageBitmap>>();

function fotoBaixada(url: string): Promise<ImageBitmap> {
  let foto = fotosBaixadas.get(url);
  if (!foto) {
    foto = fetch(url, { credentials: 'same-origin' }).then(async (resposta) => {
      if (!resposta.ok) throw new Error(`retrato ${resposta.status}`);
      return createImageBitmap(await resposta.blob());
    });
    foto.catch(() => fotosBaixadas.delete(url));
    fotosBaixadas.set(url, foto);
    // Poucas fotos de cada vez: as mais antigas saem.
    if (fotosBaixadas.size > 40) {
      const primeira = fotosBaixadas.keys().next().value;
      if (primeira !== undefined) void fotosBaixadas.get(primeira)?.then((f) => f.close(), () => undefined), fotosBaixadas.delete(primeira);
    }
  }
  return foto;
}

async function retratoRedondo(url: string, enquadramento: Enquadramento): Promise<Texture> {
  const imagem = await fotoBaixada(url);
  const lado = 384;
  const tela = new OffscreenCanvas(lado, lado);
  desenharRetrato(tela.getContext('2d')!, lado, imagem, enquadramento);
  return Texture.from(tela.transferToImageBitmap());
}

export class PalcoMapa {
  private camadaMapa = new Container();
  private camadaReduzida = new Container();
  private camadaDetalhe = new Container();
  private grade = new Graphics();
  /** Mapas do Acervo postos na cena, entre o mapa base e as portas. */
  private mapasColocados = new CamadaMapasColocados();
  /** O cursor que o palco pôs no canvas (alça de giro, canto), para só mexer no estilo quando muda. */
  private cursorAtual = '';
  /** O último clique solto num mapa trancado: o segundo, logo em seguida, é o duplo clique que o escolhe. */
  private ultimoCliqueTrancado: { t: number; ponto: IPonto } | null = null;
  private arrastoMapa: { id: string; modo: 'mover' | 'giro' | Canto; dx: number; dy: number; inicio: IPonto; moveu: boolean } | null = null;
  /** A grade cobre só o que a tela mostra; ao andar ou dar zoom ela é refeita (no máximo uma vez por quadro). */
  private gradeSuja = false;
  /** Posição e zoom da tela quando a grade foi desenhada. */
  private gradeEm: [number, number, number] = [NaN, NaN, NaN];
  /** A grade que o Mestre está ajustando e ainda não foi salva. */
  private gradePrevia: IGrade | null = null;
  /** Preferência do aparelho: o token e a régua grudam na grade? */
  private encaixe = true;
  /** Preferência do aparelho: mostrar a linha e a distância enquanto um token é arrastado (desligado, o token anda livre). */
  private medirAoMover = false;
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
  /** Desenho livre: traços de todos, que somem sozinhos. */
  private tracos = new CamadaTracos();
  private opcoesDesenho: OpcoesDeDesenho = OPCOES_DE_DESENHO_PADRAO;
  /** O traço que a mão está fazendo agora. */
  private tracoLocal: { forma: FormaDeTraco; pontos: IPonto[] } | null = null;
  /** A cor e o dono dos meus traços (a cor do ping e da régua desta pessoa). */
  private corPropria = '#f6ad55';
  private usuarioPropria = '';
  /** Os meus traços, do mais antigo ao mais novo, para o Ctrl + Z desfazer o último. */
  private meusTracos: string[] = [];
  /** Os desenhos fixos que estão na tela e a lista que os gerou (para só mexer quando ela muda). */
  private fixosNaTela = new Set<string>();
  private assinaturaDosFixos = '';
  private previa = new Graphics();
  private nevoa!: CamadaNevoa;
  /** Escurece o que ainda não foi explorado; a névoa principal deixa a memória visível. */
  private nevoaMemoria!: CamadaNevoa;
  private clima!: CamadaClima;
  /** Luz do dia: a escuridão e a tinta da hora, por cima dos tokens. */
  private ceu!: CamadaCeu;
  private portais = new CamadaPortais();
  /** Zonas de terreno (cobertura, gatilho, terreno): o Mestre vê o contorno; o jogador, só o terreno à vista. */
  private zonas = new CamadaZonas();
  /** O resultado do dado subindo sobre o token de quem rolou. */
  private numeros = new NumerosFlutuantes();
  /** Portas do mapa montado no construtor, por cima da imagem (que só tem o vão). */
  private aberturas = new CamadaAberturas();
  private auras = new CamadaAuras();
  /** O contorno até onde o token da vez ainda anda (ajuda de mesa; ninguém clica nele). */
  private alcance = new Graphics();
  /** A régua que acompanha o token arrastado: quantas casas ele já andou. */
  private medidaArrasto: Regua | null = null;
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
  /** A ficha pediu para mirar uma magia: o conjurador, até onde ela alcança e o tamanho dela (metros). Nulo: mira livre. */
  private restricaoMira: { origemId: string | null; alcanceM: number | null; tamanhoM: number | null } | null = null;
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
  /** Algum token mudou de lugar: os nomes vizinhos precisam ser medidos de novo. */
  private nomesSujos = true;
  private nomesEm = 0;
  /** Quem mostra o nome inteiro agora (e com que largura), para notar quando isso muda. */
  private nomesInteiros = '';
  private anotacaoSelecionada: string | null = null;
  private vez: string | null = null;
  private reguasRemotas = new Map<string, Regua>();
  private pings = new Map<Container, { nascimento: number; cor: string; tipo: TipoDePing }>();
  private reguaLocal: Regua | null = null;
  private pontosRegua: IPonto[] | null = null;
  /** Régua com pontos de passagem (Shift + clique): cada clique fixa um ponto, o mesmo ponto de novo ou Esc termina. */
  private reguaEmCaminho = false;
  /** A última pergunta de linha de visão da régua, e a resposta do servidor (null enquanto não veio). */
  private perguntaDaLinha: { de: string; para: string; cobertura: CoberturaDaLinha | undefined; em: number } | null = null;
  private arrasto: { id: string; dx: number; dy: number; inicio: IPonto; moveu: boolean } | null = null;
  private arrastoAnotacao: { id: string; dx: number; dy: number; moveu: boolean } | null = null;
  private quadroCallbacks: Array<() => void> = [];
  private carregarVisiveis: number | null = null;

  /** Acompanha o tamanho da área do mapa (painéis que abrem e fecham). */
  private observador: ResizeObserver | null = null;

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
    // Esconder ou mostrar painéis muda o tamanho da área do mapa sem mudar a janela: o palco acompanha.
    const observador = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => app.resize());
    observador?.observe(alvo);
    const viewport = new Viewport({
      screenWidth: alvo.clientWidth,
      screenHeight: alvo.clientHeight,
      events: app.renderer.events,
      passiveWheel: false,
      // O botão direito arrasta o mapa: sem isto o menu do navegador abre toda vez que se solta o botão.
      disableOnContextMenu: true,
    });
    viewport.drag({ mouseButtons: 'all' }).pinch().wheel({ smooth: 4 }).decelerate({ friction: 0.92 }).clampZoom({ minScale: 0.04, maxScale: 4 });
    app.stage.addChild(viewport);
    app.renderer.on('resize', (w: number, h: number) => viewport.resize(w, h));
    const palco = new PalcoMapa(app, viewport, eventos);
    palco.observador = observador;
    palco.montar();
    return palco;
  }

  private montar() {
    const { app, viewport } = this;
    this.nevoa = new CamadaNevoa(app.renderer);
    this.nevoaMemoria = new CamadaNevoa(app.renderer, true);
    this.clima = new CamadaClima(app.renderer, this.camadaFundo);
    this.ceu = new CamadaCeu(app.renderer);
    this.camadaTokens.addChild(this.camadaProps, this.camadaMontarias, this.camadaPersonagens);
    this.camadaMapa.addChild(this.camadaReduzida, this.camadaDetalhe);
    // A névoa cobre o mapa e fica por baixo dos tokens: o servidor já tira do jogador o que ela esconde.
    this.camadaFundo.addChild(this.camadaMapa, this.mapasColocados.raiz, this.liquidos.raiz, this.aberturas.raiz, this.grade);
    // Os portais ficam no chão (embaixo dos tokens); a luz do dia e o clima, por cima de tudo que está no mapa.
    viewport.addChild(
      this.camadaFundo, this.anotacoes.raiz, this.nevoaMemoria.raiz, this.nevoa.raiz,
      this.zonas.raiz, this.portais.raiz, this.luzes.raiz, this.auras.raiz, this.alcance, this.camadaTokens, this.zonas.telhados, this.ceu.raiz, this.clima.raiz,
      this.magias.raiz, this.numeros.raiz, this.tracos.raiz, this.camadaReguas, this.mapasColocados.sobreposicao, this.previa, this.camadaPings,
    );
    this.alcance.eventMode = 'none';
    app.stage.eventMode = 'static';
    app.stage.hitArea = app.screen;

    viewport.on('pointerdown', (evento) => {
      if (this.arrasto) return;
      const ponto = viewport.toWorld(evento.global);
      if (evento.altKey || this.ferramenta === 'ping') {
        if (evento.ctrlKey && this.gestor && this.eventos.aoOlhemAqui) {
          this.pingLocal(ponto.x, ponto.y, 'olhar');
          this.eventos.aoOlhemAqui({ x: ponto.x, y: ponto.y });
          return;
        }
        this.pingLocal(ponto.x, ponto.y, evento.shiftKey ? 'perigo' : 'normal');
        return;
      }
      if (this.ferramenta === 'regua' && evento.button === 0) {
        const clique = this.encaixarPonto(ponto);
        if (this.pontosRegua && this.reguaEmCaminho) {
          // O último ponto acompanha o mouse: o clique o fixa e abre outro. Clicar de novo no mesmo ponto termina.
          const fixado = this.pontosRegua[this.pontosRegua.length - 2];
          if (fixado && Math.hypot(clique.x - fixado.x, clique.y - fixado.y) < 1) {
            this.terminarRegua();
            return;
          }
          this.pontosRegua[this.pontosRegua.length - 1] = clique;
          this.pontosRegua.push({ x: clique.x, y: clique.y });
        } else {
          this.pontosRegua = [clique, { x: clique.x, y: clique.y }];
          this.reguaEmCaminho = Boolean((evento as { shiftKey?: boolean }).shiftKey);
          viewport.plugins.pause('drag');
        }
        this.desenharReguaLocal();
        if (this.reguaEmCaminho) this.eventos.aoRegua(this.pontosRegua);
        return;
      }
      if (this.ferramenta === 'desenho') {
        if (evento.button === 0) this.comecarTraco({ x: ponto.x, y: ponto.y });
        return;
      }
      if (this.ferramenta === 'nevoa' || this.ferramenta === 'area' || this.ferramenta === 'zona' || this.ferramenta === 'magia') {
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
      // Com a ferramenta de mover, o Mestre clica num mapa solto e arrasta: o mapa vai junto. Mapa trancado
      // e área sem mapa deixam a mão andar pela tela, como sempre.
      if (evento.button === 0 && this.gestor && this.ferramenta === 'mover' && !this.arrastoAnotacao && !this.arrastoPortal) {
        if (this.cliqueEmMapas({ x: ponto.x, y: ponto.y })) return;
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
      if (this.arrastoMapa) {
        this.arrastarMapa(ponto, Boolean((evento as { shiftKey?: boolean }).shiftKey));
        return;
      }
      this.cursorDoMapa({ x: ponto.x, y: ponto.y });
      if (this.arrastoAnotacao) {
        this.arrastoAnotacao.moveu = true;
        this.anotacoes.moverTemporariamente(this.arrastoAnotacao.id, ponto.x - this.arrastoAnotacao.dx, ponto.y - this.arrastoAnotacao.dy);
        return;
      }
      if (this.tracoLocal) {
        this.continuarTraco({ x: ponto.x, y: ponto.y });
        return;
      }
      if (this.ferramenta === 'nevoa' || this.ferramenta === 'area' || this.ferramenta === 'zona' || this.ferramenta === 'magia') {
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
        // A fonte só deixa uma cópia ao ser solta: quem olha não a vê andar por aí.
        if (!token.dados.fonte) this.eventos.aoArrastar(this.arrasto.id, x, y);
        if (this.medirAoMover) this.desenharMedidaArrasto({ x: this.arrasto.inicio.x - this.arrasto.dx, y: this.arrasto.inicio.y - this.arrasto.dy }, { x, y });
        return;
      }
      if (this.pontosRegua) {
        this.pontosRegua[this.pontosRegua.length - 1] = this.encaixarPonto(ponto);
        this.desenharReguaLocal();
        this.eventos.aoRegua(this.pontosRegua);
      }
    });

    const soltar = (evento?: { shiftKey?: boolean }) => {
      if (this.arrastoMapa) {
        this.soltarMapa();
        return;
      }
      if (this.tracoLocal) {
        this.terminarTraco();
        return;
      }
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
        this.limparMedidaArrasto();
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
        const final = this.cena && this.encaixe ? encaixar({ x: token.raiz.x, y: token.raiz.y }, this.cena.grade, token.dados.porte) : { x: token.raiz.x, y: token.raiz.y };
        const x = Math.max(0, Math.min(this.cena?.largura ?? final.x, final.x));
        const y = Math.max(0, Math.min(this.cena?.altura ?? final.y, final.y));
        // Token-fonte: a cópia nasce onde foi solta e a fonte volta para onde estava. Com Shift ela se move de verdade.
        if (token.dados.fonte && this.eventos.aoSoltarFonte && !evento?.shiftKey) {
          token.raiz.position.set(token.dados.x, token.dados.y);
          this.nomesSujos = true;
          this.eventos.aoSoltarFonte(id, x, y);
          return;
        }
        token.raiz.position.set(x, y);
        token.dados = { ...token.dados, x, y };
        this.nomesSujos = true;
        this.eventos.aoSoltar(id, x, y);
        return;
      }
      // Régua com pontos de passagem fica na tela depois de soltar o botão: quem a termina é o clique repetido ou o Esc.
      if (this.pontosRegua && !this.reguaEmCaminho) this.terminarRegua();
    };
    app.stage.on('pointerup', soltar);
    app.stage.on('pointerupoutside', soltar);

    // Botão direito: arrastar continua levando a tela; um clique parado pede o menu de contexto da página.
    let direito: { x: number; y: number } | null = null;
    app.canvas.addEventListener('pointerdown', (evento) => {
      direito = evento.button === 2 ? { x: evento.clientX, y: evento.clientY } : null;
    });
    app.canvas.addEventListener('pointerup', (evento) => {
      if (evento.button !== 2 || !direito) return;
      const parado = Math.hypot(evento.clientX - direito.x, evento.clientY - direito.y) < 6;
      direito = null;
      if (parado) this.pedirContexto(evento.clientX, evento.clientY);
    });
    app.canvas.addEventListener('contextmenu', (evento) => {
      evento.preventDefault();
      // No toque não há botão direito: o toque longo chega por aqui.
      if ((evento as PointerEvent).pointerType === 'touch') this.pedirContexto(evento.clientX, evento.clientY);
    });

    viewport.on('moved', () => { this.gradeSuja = true; this.agendarLadrilhos(); });
    viewport.on('zoomed', () => { this.gradeSuja = true; this.agendarLadrilhos(); });

    app.ticker.add((ticker) => {
      const agora = performance.now();
      // Também confere a posição da tela: uma animação de câmera nem sempre avisa que andou.
      if (this.cena && (this.gradeSuja || viewport.x !== this.gradeEm[0] || viewport.y !== this.gradeEm[1] || viewport.scale.x !== this.gradeEm[2])) {
        this.desenharGrade(this.gradePrevia ?? this.cena.grade);
      }
      const zoomAgora = viewport.scale.x;
      // Os nomes dos tokens vizinhos se ajustam quando algo andou (ou enquanto se arrasta), poucas vezes por segundo.
      // Também quando muda quem mostra o nome inteiro (mouse em cima, seleção): o vizinho cede o espaço.
      let inteiros = '';
      for (const token of this.tokens.values()) if (token.larguraDoNomeInteiro !== null) inteiros += `${token.dados.id}:${Math.round(token.larguraDoNomeInteiro)};`;
      if (inteiros !== this.nomesInteiros) {
        this.nomesInteiros = inteiros;
        this.ajustarNomes(agora);
      } else if ((this.nomesSujos || this.arrasto) && agora - this.nomesEm > 120) this.ajustarNomes(agora);
      for (const token of this.tokens.values()) {
        token.ajustarAoZoom(zoomAgora);
        token.pulsar(agora);
      }
      for (const token of this.saindo) {
        if (!token.pulsar(agora)) continue;
        this.saindo.delete(token);
        token.destruir();
      }
      this.mapasColocados.quadro(viewport.scale.x);
      for (const callback of this.quadroCallbacks) callback();
      this.animarPings(agora);
      this.magias.quadro(agora);
      this.numeros.quadro(agora);
      this.tracos.quadro(agora, viewport.scale.x);
      // O telhado se apaga quando alguém do grupo (jogadores e aliados) está debaixo dele.
      this.zonas.quadro(viewport.scale.x, this.zonas.temTelhado ? this.centrosDoGrupo() : undefined);
      this.nevoa.quadro(agora);
      this.nevoaMemoria.quadro(agora);
      this.portais.quadro(agora, viewport.scale.x);
      this.liquidos.quadro(agora);
      if (this.cena) this.auras.quadro(this.aurasNoMapa(), this.cena.grade.tamanho, agora, viewport.scale.x);
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
    if (!this.cena || !this.encaixe || this.cena.grade.tipo === 'nenhuma') return { x: ponto.x, y: ponto.y };
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
        this.mapasColocados.selecionar(null);
        this.cancelarDesenho();
        this.limparTodosOsTracos();
        this.abrirNaVista();
        this.cenaTrocada = true;
      }
    }
    // Com a névoa, o Mestre revelar mais libera pedaços novos: busca só os que faltam.
    void this.carregarReduzido();
    this.gradePrevia = null;
    this.desenharGrade(cena.grade);
    // Se o Mestre está arrastando um mapa, a lista nova espera: a mão dele manda até soltar.
    if (!this.arrastoMapa) this.mapasColocados.definir(cena.mapas_colocados ?? [], cena.nevoa?.ladrilhos, gestor);
    this.nevoa.definir(cena.nevoa ?? null, cena.largura, cena.altura, gestor, cena.grade.tamanho);
    this.nevoaMemoria.definir(cena.nevoa ?? null, cena.largura, cena.altura, gestor, cena.grade.tamanho);
    this.clima.definir(cena.clima ?? null, cena.largura, cena.altura, gestor);
    this.portais.definir(cena.portais ?? [], cena.grade.tamanho, gestor);
    this.zonas.definir(cena.zonas ?? [], gestor);
    this.definirDesenhosFixos(cena.desenhos ?? []);
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
    if (this.mapasColocados.tem) void this.mapasColocados.atualizar(this.viewport.getVisibleBounds(), this.viewport.scale.x);
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

  /** A grade cobre tudo o que a tela mostra, também além da borda do mapa. Espessura e traço em pixels de tela. */
  private desenharGrade(grade: IGrade) {
    this.gradeSuja = false;
    this.gradeEm = [this.viewport.x, this.viewport.y, this.viewport.scale.x];
    const g = this.grade;
    g.clear();
    if (!this.cena || grade.tipo === 'nenhuma' || grade.opacidade <= 0) return;
    const escala = this.viewport.scale.x;
    const visivel = this.viewport.getVisibleBounds();
    let segmentos = segmentosDaGrade(grade, { x: visivel.x, y: visivel.y, largura: visivel.width, altura: visivel.height }, escala);
    if (!segmentos.length) return;
    const espessura = Math.max(0.5, grade.espessura ?? PADRAO_GRADE.espessura);
    const linha = grade.linha ?? PADRAO_GRADE.linha;
    if (linha === 'tracejada') segmentos = tracejar(segmentos, (espessura * 5 + 4) / escala, (espessura * 3 + 3) / escala);
    else if (linha === 'pontilhada') segmentos = tracejar(segmentos, Math.max(1.5, espessura) / escala, (espessura * 2 + 4) / escala);
    for (const [x1, y1, x2, y2] of segmentos) g.moveTo(x1, y1).lineTo(x2, y2);
    g.stroke({ width: espessura / escala, color: grade.cor, alpha: grade.opacidade });
  }

  /** Mostra uma grade ainda não salva (o Mestre mexendo nos controles); a cena segue com a salva. */
  previaGrade(grade: IGrade) {
    this.gradePrevia = grade;
    this.desenharGrade(grade);
  }

  /** Liga ou desliga o encaixe do token e da régua na grade (preferência de quem olha, não da cena). */
  definirEncaixe(ligado: boolean) {
    this.encaixe = ligado;
  }

  /** Liga ou desliga a régua que acompanha o token arrastado (preferência de quem olha, não da cena). */
  definirMedirAoMover(ligado: boolean) {
    this.medirAoMover = ligado;
    if (!ligado) this.limparMedidaArrasto();
  }

  /** O que a tela mostra agora: centro, zoom e o tamanho da área em px de mapa (para outra tela enquadrar igual). */
  areaVisivel(): { x: number; y: number; zoom: number; vw: number; vh: number } {
    const visivel = this.viewport.getVisibleBounds();
    return { ...this.vistaAtual(), vw: Math.round(visivel.width), vh: Math.round(visivel.height) };
  }

  /**
   * Leva a tela para um centro e zoom (a vista de outra pessoa, ou números digitados no painel da grade).
   * Com `vw` e `vh`, o zoom é o que faz essa área caber nesta tela, seja ela maior ou menor que a de quem pediu.
   */
  irParaVista(vista: { x: number; y: number; zoom: number; vw?: number; vh?: number }, animar = true) {
    const doTamanho = vista.vw && vista.vh && this.viewport.screenWidth > 0 && this.viewport.screenHeight > 0
      ? Math.min(this.viewport.screenWidth / vista.vw, this.viewport.screenHeight / vista.vh)
      : vista.zoom;
    const zoom = Math.max(0.04, Math.min(4, doTamanho));
    if (animar) {
      this.viewport.animate({ position: { x: vista.x, y: vista.y }, scale: zoom, time: 600, ease: 'easeInOutSine' });
    } else {
      this.viewport.setZoom(zoom, true);
      this.viewport.moveCenter(vista.x, vista.y);
    }
    this.gradeSuja = true;
    this.agendarLadrilhos();
  }

  /** O que a tela deve mostrar ao enquadrar: os mapas colocados (a cena tem folga em volta) ou a cena toda. */
  private limitesParaEnquadrar(): { x: number; y: number; w: number; h: number } | null {
    if (!this.cena) return null;
    const mapas = this.mapasColocados.lista();
    if (!mapas.length) return { x: 0, y: 0, w: this.cena.largura, h: this.cena.altura };
    let x0 = this.cena.mapa ? 0 : Infinity;
    let y0 = this.cena.mapa ? 0 : Infinity;
    let x1 = this.cena.mapa ? this.cena.mapa.largura : 0;
    let y1 = this.cena.mapa ? this.cena.mapa.altura : 0;
    for (const mapa of mapas) {
      const r = caixaDoMapa(mapa);
      x0 = Math.min(x0, r.x);
      y0 = Math.min(y0, r.y);
      x1 = Math.max(x1, r.x + r.w);
      y1 = Math.max(y1, r.y + r.h);
    }
    return { x: x0, y: y0, w: Math.max(1, x1 - x0), h: Math.max(1, y1 - y0) };
  }

  enquadrar() {
    const limites = this.limitesParaEnquadrar();
    if (!limites) return;
    this.viewport.fit(true, limites.w * 1.05, limites.h * 1.05);
    this.viewport.moveCenter(limites.x + limites.w / 2, limites.y + limites.h / 2);
    this.agendarLadrilhos();
  }

  /** Abre a cena onde o Mestre guardou a vista inicial; sem ela, o mapa inteiro. */
  abrirNaVista() {
    const vista = this.cena?.vista;
    if (!vista) {
      this.enquadrar();
      return;
    }
    this.viewport.setZoom(vista.zoom, true);
    this.viewport.moveCenter(vista.x, vista.y);
    this.agendarLadrilhos();
  }

  /** O centro e o zoom da tela agora, para o Mestre guardar como a vista inicial da cena. */
  vistaAtual(): { x: number; y: number; zoom: number } {
    return { x: Math.round(this.viewport.center.x), y: Math.round(this.viewport.center.y), zoom: Number(this.viewport.scale.x.toFixed(3)) };
  }

  private *aurasNoMapa(): Iterable<AuraNoMapa> {
    for (const token of this.tokens.values()) {
      if (token.dados.aura) yield { x: token.raiz.x, y: token.raiz.y, aura: token.dados.aura };
    }
  }

  private desenharMedidaArrasto(de: IPonto, ate: IPonto) {
    this.medidaArrasto ??= this.criarRegua('#67e8f9');
    this.desenharRegua(this.medidaArrasto, [de, ate], '#67e8f9');
  }

  private limparMedidaArrasto() {
    this.medidaArrasto?.linha.destroy();
    this.medidaArrasto?.rotulo.destroy();
    this.medidaArrasto = null;
  }

  /**
   * Onde um mapa colocado ou um token está na tela, em px do palco (para uma barra seguir o objeto escolhido).
   * Nulo se o objeto não está na cena.
   */
  retanguloNaTela(alvo: { tipo: 'mapa' | 'token'; id: string }): { x: number; y: number; w: number; h: number } | null {
    let caixa: { x: number; y: number; w: number; h: number } | null = null;
    if (alvo.tipo === 'mapa') {
      const mapa = this.mapasColocados.mapa(alvo.id);
      caixa = mapa ? caixaDoMapa(mapa) : null;
    } else {
      // Com as barras do token abaixo dele, a barra de ações cola depois delas.
      caixa = this.tokens.get(alvo.id)?.caixaDaBarra ?? null;
    }
    if (!caixa) return null;
    const canto = this.viewport.toScreen(caixa.x, caixa.y);
    const escala = this.viewport.scale.x;
    return { x: canto.x, y: canto.y, w: caixa.w * escala, h: caixa.h * escala };
  }

  centralizar(x: number, y: number) {
    this.viewport.animate({ position: { x, y }, time: 350, ease: 'easeInOutSine' });
  }

  centro(): IPonto {
    return { x: this.viewport.center.x, y: this.viewport.center.y };
  }

  // ------------------------------------------------------- mapas colocados

  /**
   * Clique do Mestre com a ferramenta de mover: agarra a alça de giro ou um canto do mapa escolhido, ou escolhe
   * (e começa a arrastar) o mapa que está sob o clique. Devolve se pegou alguma coisa (então a tela não anda).
   */
  private cliqueEmMapas(ponto: IPonto): boolean {
    const camada = this.mapasColocados;
    const atual = camada.idSelecionado ? camada.mapa(camada.idSelecionado) : null;
    if (atual && !atual.trancado) {
      const zoom = this.viewport.scale.x;
      const modo = acharAlcaDeGiro(atual, ponto, zoom) ? 'giro' : acharCanto(atual, ponto, zoom);
      if (modo) {
        this.arrastoMapa = { id: atual.id, modo, dx: 0, dy: 0, inicio: ponto, moveu: false };
        this.viewport.plugins.pause('drag');
        return true;
      }
    }
    // Mapa trancado só se escolhe com duplo clique: com um clique ele não atrapalha o que está em volta
    // (tokens, outros mapas, a mão que anda pela tela). O que já está escolhido continua respondendo.
    const agora = performance.now();
    const ultimo = this.ultimoCliqueTrancado;
    const duplo = Boolean(ultimo && agora - ultimo.t < 450 && Math.hypot(ponto.x - ultimo.ponto.x, ponto.y - ultimo.ponto.y) * this.viewport.scale.x < 8);
    let id = acharMapaEm(camada.lista(), ponto);
    this.ultimoCliqueTrancado = null;
    if (id && id !== camada.idSelecionado && camada.mapa(id)?.trancado && !duplo) {
      this.ultimoCliqueTrancado = { t: agora, ponto };
      id = acharMapaEm(camada.lista().filter((m) => !m.trancado), ponto);
    }
    if (id !== camada.idSelecionado) {
      camada.selecionar(id);
      this.eventos.aoSelecionarMapa?.(id);
    }
    const mapa = id ? camada.mapa(id) : null;
    if (id && mapa && !mapa.trancado) {
      this.arrastoMapa = { id, modo: 'mover', dx: ponto.x - mapa.x, dy: ponto.y - mapa.y, inicio: ponto, moveu: false };
      this.viewport.plugins.pause('drag');
      return true;
    }
    return false;
  }

  /** O cursor acompanha o que está sob o mouse: alça de giro ou canto do mapa escolhido. */
  private cursorDoMapa(ponto: IPonto) {
    if (this.ferramenta !== 'mover' || !this.gestor || this.arrasto || !this.mapasColocados.tem) return;
    const camada = this.mapasColocados;
    const atual = camada.idSelecionado ? camada.mapa(camada.idSelecionado) : null;
    let cursor = '';
    if (atual && !atual.trancado) {
      const zoom = this.viewport.scale.x;
      if (acharAlcaDeGiro(atual, ponto, zoom)) cursor = 'grab';
      else {
        const canto = acharCanto(atual, ponto, zoom);
        if (canto) cursor = canto === 'no' || canto === 'se' ? 'nwse-resize' : 'nesw-resize';
      }
    }
    if (this.cursorAtual !== cursor) {
      this.cursorAtual = cursor;
      this.app.canvas.style.cursor = cursor;
    }
  }

  private arrastarMapa(ponto: IPonto, passo: boolean) {
    const arrasto = this.arrastoMapa;
    if (!arrasto) return;
    const mapa = this.mapasColocados.mapa(arrasto.id);
    if (!mapa) return;
    // Um clique não é arrasto: só passa de 4 px de tela para o mapa sair do lugar.
    if (!arrasto.moveu && Math.hypot(ponto.x - arrasto.inicio.x, ponto.y - arrasto.inicio.y) * this.viewport.scale.x < 4) return;
    arrasto.moveu = true;
    if (arrasto.modo === 'mover') {
      // O mapa anda livre, sem grudar; com Shift apertado o canto dele encaixa na grade (se não estiver girado).
      // Nem o canto de baixo nem o da direita passam da borda da cena (o servidor recusaria ao soltar).
      const limites = this.cena ? { largura: this.cena.largura, altura: this.cena.altura } : null;
      this.mapasColocados.previa(arrasto.id, moverMapa(mapa, ponto.x - arrasto.dx, ponto.y - arrasto.dy, passo && this.cena ? this.cena.grade : null, limites));
    } else if (arrasto.modo === 'giro') {
      // O mapa gira em torno do centro; se a ponta passar da borda de cima ou da esquerda, ele é empurrado para dentro.
      const girado = { ...mapa, rotacao: girarMapa(mapa, ponto, passo) };
      this.mapasColocados.previa(arrasto.id, { rotacao: girado.rotacao, ...manterDentroDaCena(girado) });
    } else {
      this.mapasColocados.previa(arrasto.id, redimensionarMapa(mapa, arrasto.modo, ponto));
    }
  }

  private soltarMapa() {
    const arrasto = this.arrastoMapa;
    this.arrastoMapa = null;
    this.viewport.plugins.resume('drag');
    if (!arrasto?.moveu) return;
    const mapa = this.mapasColocados.mapa(arrasto.id);
    if (mapa) this.eventos.aoMoverMapa?.(arrasto.id, { x: mapa.x, y: mapa.y, escala: mapa.escala, rotacao: mapa.rotacao ?? 0 });
  }

  /** Um ponto da tela (clientX, clientY, como num soltar de arquivo) em coordenadas do mapa; nulo se cai fora do palco. */
  pontoDaTela(clientX: number, clientY: number): IPonto | null {
    const caixa = this.app.canvas.getBoundingClientRect();
    if (clientX < caixa.left || clientX > caixa.right || clientY < caixa.top || clientY > caixa.bottom) return null;
    const ponto = this.viewport.toWorld(clientX - caixa.left, clientY - caixa.top);
    return { x: ponto.x, y: ponto.y };
  }

  /** Escolhe um mapa colocado pela lista ou pela barra (sem clicar no mapa). */
  selecionarMapaColocado(id: string | null) {
    this.mapasColocados.selecionar(id);
  }

  mapaColocado(id: string): IMapaColocado | null {
    return this.mapasColocados.mapa(id);
  }

  definirFerramenta(ferramenta: Ferramenta) {
    if (ferramenta !== this.ferramenta) {
      this.cancelarDesenho();
      this.terminarRegua();
      if (ferramenta !== 'magia') this.restricaoMira = null;
    }
    if (ferramenta !== 'mover') {
      this.mapasColocados.selecionar(null);
      this.eventos.aoSelecionarMapa?.(null);
      this.cursorAtual = '';
      this.app.canvas.style.cursor = '';
    }
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
    return Boolean(this.traco || this.retangulo || this.poligono || this.mira || this.bocaPendente || this.tracoLocal);
  }

  cancelarDesenho() {
    if (this.tracoLocal) {
      this.tracoLocal = null;
      this.tracos.limparPrevia();
    }
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
      this.mira = this.restricaoMira ? this.miraAjustada(ponto) : { inicio: this.encaixarPonto(ponto), fim: ponto };
      this.viewport.plugins.pause('drag');
    } else if (this.ferramenta === 'area' || this.ferramenta === 'zona') {
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
    if (this.mira) this.mira = this.restricaoMira ? this.miraAjustada(ponto) : { inicio: this.mira.inicio, fim: ponto };
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
      if (this.ferramenta === 'zona') {
        const forma = formaDoRetangulo('revelar', inicio, fim, minimo);
        if (forma && forma.tipo === 'retangulo') this.eventos.aoZona?.({ x: forma.x, y: forma.y, w: forma.w, h: forma.h });
      } else if (this.ferramenta === 'area') {
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

  /** Metros do mapa em px (a casa tem `grade.metros` metros e `grade.tamanho` px). */
  private metrosEmPx(metros: number): number {
    const grade = this.cena?.grade;
    return grade ? (metros / Math.max(0.1, grade.metros)) * grade.tamanho : metros;
  }

  /** O token do conjurador que a ficha indicou, ou nulo (a mira sai da mão). */
  private origemDaMira(): IPonto | null {
    const id = this.restricaoMira?.origemId;
    const token = id ? this.tokens.get(id) : null;
    return token ? { x: token.raiz.x, y: token.raiz.y } : null;
  }

  /** A mira de uma magia vinda da ficha: o círculo cai dentro do alcance, o cone e a linha saem do conjurador. */
  private miraAjustada(mao: IPonto): { inicio: IPonto; fim: IPonto } {
    const restricao = this.restricaoMira;
    const forma = this.opcoesMagia.forma;
    const alvo = forma === 'circulo' ? this.encaixarPonto(mao) : mao;
    return ajustarMira(
      forma, this.origemDaMira(), alvo,
      restricao?.alcanceM != null ? this.metrosEmPx(restricao.alcanceM) : null,
      restricao?.tamanhoM != null ? this.metrosEmPx(restricao.tamanhoM) : null,
    );
  }

  /** A ficha pede (ou tira) a mira de uma magia. Com a ferramenta de magia, o alcance aparece como um anel em volta do conjurador. */
  definirMiraDaMagia(restricao: { origemId: string | null; alcanceM: number | null; tamanhoM: number | null } | null) {
    // O mesmo pedido de novo (a página repete a chamada a cada mudança do mapa) não interrompe uma mira em andamento.
    if (JSON.stringify(restricao) === JSON.stringify(this.restricaoMira)) return;
    this.restricaoMira = restricao;
    if (this.mira) this.cancelarDesenho();
    this.desenharPrevia();
  }

  /** O anel do alcance da magia em volta de quem a conjura. */
  private desenharAlcanceDaMira() {
    const restricao = this.restricaoMira;
    const origem = this.origemDaMira();
    if (!restricao || restricao.alcanceM === null || !origem) return;
    const raio = this.metrosEmPx(restricao.alcanceM);
    const cor = corDoFluxo(this.opcoesMagia.fluxo);
    this.previa.circle(origem.x, origem.y, raio).fill({ color: cor, alpha: 0.05 }).stroke({ width: 2 / this.viewport.scale.x, color: cor, alpha: 0.45 });
  }

  /** Contorno da área da magia e o tamanho em casas e metros, enquanto a pessoa mira. */
  private desenharMira() {
    this.desenharAlcanceDaMira();
    if (!this.mira || !this.cena) return;
    const { inicio, fim } = this.mira;
    const escala = 1 / this.viewport.scale.x;
    const casa = this.cena.grade.tamanho;
    desenharMira(this.previa, this.opcoesMagia.forma, inicio, fim, corDoFluxo(this.opcoesMagia.fluxo), 2 * escala, casa);
    const { metros } = medir([inicio, fim], this.cena.grade);
    const nome = { circulo: 'Raio', cone: 'Cone', linha: 'Linha', impacto: 'Alcance' }[this.opcoesMagia.forma];
    this.rotuloMira ??= this.criarRegua('#c084fc').rotulo;
    this.rotuloMira.visible = true;
    this.rotuloMira.text = `${nome}: ${metros.toLocaleString('pt-BR')} ${rotuloUnidade(this.cena.grade.unidade)}`;
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
    if (this.ferramenta !== 'nevoa' && this.ferramenta !== 'area' && this.ferramenta !== 'zona') return;
    const largura = 2 / this.viewport.scale.x;
    const cor = this.ferramenta === 'zona' ? COR_ZONA : this.ferramenta === 'area' ? COR_AREA : this.opcoesNevoa.op === 'revelar' ? COR_REVELAR : COR_ESCONDER;
    if (this.retangulo) {
      const { inicio, fim } = this.retangulo;
      g.rect(Math.min(inicio.x, fim.x), Math.min(inicio.y, fim.y), Math.abs(fim.x - inicio.x), Math.abs(fim.y - inicio.y))
        .fill({ color: cor, alpha: 0.12 }).stroke({ width: largura, color: cor });
    }
    if (this.ferramenta === 'area' || this.ferramenta === 'zona') return;
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
    this.nomesSujos = true;
  }

  /** Dá a cada token a largura que o nome dele tem até o vizinho da mesma fileira, para um nome não cobrir o outro. */
  private ajustarNomes(agora: number) {
    this.nomesSujos = false;
    this.nomesEm = agora;
    const lista = [...this.tokens.values()].map((token) => ({ id: token.dados.id, x: token.raiz.x, y: token.raiz.y, lado: token.dados.porte * (this.cena?.grade.tamanho ?? 100) }));
    const inteiros = new Map<string, number>();
    for (const token of this.tokens.values()) {
      const largura = token.larguraDoNomeInteiro;
      if (largura !== null) inteiros.set(token.dados.id, largura);
    }
    const livres = larguraLivreDosNomes(lista, inteiros);
    for (const token of this.tokens.values()) token.definirLarguraDoNome(livres.get(token.dados.id) ?? Infinity);
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
    if (!this.retratos.has(chave)) {
      this.retratos.set(chave, retratoRedondo(url, enquadramento).catch(() => null));
      // Cada passo do zoom é um recorte novo: os mais antigos saem da lista (quem ainda usa um segue com ele).
      if (this.retratos.size > 80) {
        const antiga = this.retratos.keys().next().value;
        if (antiga !== undefined) this.retratos.delete(antiga);
      }
    }
    const textura = await this.retratos.get(chave)!;
    if (this.tokens.get(id) === token && token.dados.imagem === imagem && token.dados.enquadramento === enquadramento) token.definirRetrato(textura);
  }

  private ligarToken(token: TokenVisual) {
    token.raiz.on('pointerdown', (evento) => {
      // O botão direito não escolhe nem arrasta o token: arrastado leva a tela, parado abre o menu de contexto.
      if (evento.button === 2) return;
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

  /** O menu de contexto só existe com a ferramenta Mover e sem nada sendo arrastado ou desenhado. */
  private pedirContexto(clientX: number, clientY: number) {
    if (!this.eventos.aoContexto || !this.cena || this.ferramenta !== 'mover' || this.arrasto || this.desenhando) return;
    const caixa = this.app.canvas.getBoundingClientRect();
    const ponto = this.viewport.toWorld(clientX - caixa.left, clientY - caixa.top);
    this.eventos.aoContexto({ x: ponto.x, y: ponto.y }, { x: clientX, y: clientY }, this.tokenEm(ponto.x, ponto.y));
  }

  /** O token desenhado por cima naquele ponto do mapa, ou nulo. */
  private tokenEm(x: number, y: number): string | null {
    const tamanho = this.cena?.grade.tamanho ?? 100;
    let achado: string | null = null;
    for (const token of this.tokens.values()) {
      if (!token.raiz.visible || token.raiz.parent?.visible === false) continue;
      const raio = Math.max(20, token.dados.porte * tamanho) / 2;
      if (Math.hypot(x - token.raiz.x, y - token.raiz.y) <= raio) achado = token.dados.id;
    }
    return achado;
  }

  /** Desenha (ou apaga, com nulo) o contorno do alcance de movimento do token da vez. */
  definirAlcance(pontos: IPonto[] | null) {
    this.alcance.clear();
    if (!pontos || pontos.length < 3) return;
    const largura = Math.max(2, (this.cena?.grade.tamanho ?? 100) * 0.03);
    this.alcance
      .poly(pontos.flatMap((ponto) => [ponto.x, ponto.y]))
      .fill({ color: 0xc7a44c, alpha: 0.06 })
      .stroke({ color: 0xf6e7b8, alpha: 0.55, width: largura });
  }

  /** Posição vinda de outra pessoa (já interpolada). */
  moverToken(id: string, x: number, y: number) {
    if (this.arrasto?.id === id) return;
    const token = this.tokens.get(id);
    if (!token) return;
    if (token.raiz.x !== x || token.raiz.y !== y) token.marcarMovimento(performance.now());
    token.raiz.position.set(x, y);
    token.dados = { ...token.dados, x, y };
    this.nomesSujos = true;
  }

  posicaoDe(id: string): IPonto | null {
    const token = this.tokens.get(id);
    return token ? { x: token.raiz.x, y: token.raiz.y } : null;
  }

  /** Faz o resultado de um dado subir sobre o token (se ele está na tela de quem olha). */
  flutuarResultado(tokenId: string, resultado: IResultadoFlutuante) {
    const token = this.tokens.get(tokenId);
    if (!token) return;
    const caixa = token.caixa;
    this.numeros.adicionar(resultado, caixa.x + caixa.w / 2, caixa.y, this.cena?.grade.tamanho ?? 100, performance.now());
  }

  /** Os centros dos tokens do grupo (jogadores e aliados), onde eles estão agora (andando incluso). */
  private centrosDoGrupo(): Array<{ x: number; y: number }> {
    const centros: Array<{ x: number; y: number }> = [];
    for (const token of this.tokens.values()) {
      if (token.dados.lado !== 'jogador' && token.dados.lado !== 'aliado') continue;
      const caixa = token.caixa;
      centros.push({ x: caixa.x + caixa.w / 2, y: caixa.y + caixa.h / 2 });
    }
    return centros;
  }

  /** A zona que o Mestre está editando fica mais forte no mapa. */
  selecionarZona(id: string | null) {
    this.zonas.selecionar(id);
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

  private desenharRegua(regua: Regua, pontos: IPonto[], cor: string, nome?: string, extra?: string) {
    if (!this.cena) return;
    const escala = 1 / this.viewport.scale.x;
    regua.linha.clear();
    regua.linha.moveTo(pontos[0].x, pontos[0].y);
    for (const ponto of pontos.slice(1)) regua.linha.lineTo(ponto.x, ponto.y);
    regua.linha.stroke({ width: 4 * escala, color: cor, alpha: 0.95 });
    for (const ponto of pontos) regua.linha.circle(ponto.x, ponto.y, 5 * escala).fill(cor);
    const { metros } = medir(pontos, this.cena.grade);
    const fim = pontos[pontos.length - 1];
    const unidade = rotuloUnidade(this.cena.grade.unidade);
    // Com pontos de passagem, o rótulo diz o total e o último trecho.
    const ultimo = pontos.length > 2 ? medir(pontos.slice(-2), this.cena.grade).metros : null;
    regua.rotulo.text = `${nome ? `${nome}: ` : ''}${metros.toLocaleString('pt-BR')} ${unidade}${ultimo !== null ? ` (trecho ${ultimo.toLocaleString('pt-BR')})` : ''}${extra ? `\n${extra}` : ''}`;
    regua.rotulo.scale.set(escala);
    regua.rotulo.position.set(fim.x, fim.y - 10 * escala);
  }

  private desenharReguaLocal() {
    if (!this.pontosRegua) return;
    this.reguaLocal ??= this.criarRegua('#f6ad55');
    this.perguntarLinhaDaRegua();
    this.desenharRegua(this.reguaLocal, this.pontosRegua, '#f6ad55', undefined, this.textoDaLinha());
  }

  /** Régua reta de um token a outro: pergunta (no máximo uma vez por par de tokens) se há parede entre eles. */
  private perguntarLinhaDaRegua() {
    const pontos = this.pontosRegua;
    if (!this.eventos.aoPerguntarLinha || !pontos || pontos.length !== 2) {
      this.perguntaDaLinha = null;
      return;
    }
    const de = this.tokenEm(pontos[0].x, pontos[0].y);
    const para = this.tokenEm(pontos[1].x, pontos[1].y);
    if (!de || !para || de === para) {
      this.perguntaDaLinha = null;
      return;
    }
    const atual = this.perguntaDaLinha;
    if (atual && atual.de === de && atual.para === para) return;
    this.perguntaDaLinha = { de, para, cobertura: undefined, em: performance.now() };
    this.eventos.aoPerguntarLinha(de, para);
  }

  /** A resposta do servidor à pergunta da régua: vale só se a régua ainda está entre os mesmos dois tokens. */
  respostaDaLinha(de: string, para: string, cobertura: CoberturaDaLinha) {
    const atual = this.perguntaDaLinha;
    if (!atual || atual.de !== de || atual.para !== para) return;
    atual.cobertura = cobertura;
    this.desenharReguaLocal();
  }

  private textoDaLinha(): string | undefined {
    const cobertura = textoDaCobertura(this.perguntaDaLinha?.cobertura);
    // Entre dois tokens de alturas diferentes, a régua soma o desnível (a distância em linha reta, em 3D).
    const pergunta = this.perguntaDaLinha;
    if (!pergunta || !this.cena || !this.pontosRegua) return cobertura;
    const de = this.tokens.get(pergunta.de)?.dados.elevacao;
    const para = this.tokens.get(pergunta.para)?.dados.elevacao;
    const emTres = textoDaDistanciaEm3D(medir(this.pontosRegua, this.cena.grade).metros, de, para, rotuloUnidade(this.cena.grade.unidade));
    return [cobertura, emTres].filter(Boolean).join('\n') || undefined;
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

  // ------------------------------------------------------ desenho livre

  definirOpcoesDesenho(opcoes: OpcoesDeDesenho) {
    if (opcoes.forma !== this.opcoesDesenho.forma && this.tracoLocal) this.cancelarDesenho();
    this.opcoesDesenho = opcoes;
  }

  /** A cor e o dono dos traços desta pessoa: os dos outros chegam com a cor deles. */
  definirQuemDesenha(usuarioId: string, cor: string) {
    this.usuarioPropria = usuarioId;
    this.corPropria = cor;
  }

  private comecarTraco(ponto: IPonto) {
    this.tracoLocal = { forma: this.opcoesDesenho.forma, pontos: [ponto, { x: ponto.x, y: ponto.y }] };
    this.desenharPreviaDoTraco();
  }

  private continuarTraco(ponto: IPonto) {
    const traco = this.tracoLocal;
    if (!traco) return;
    if (traco.forma === 'lapis') {
      // O passo é de uns 3 px de tela: liso sem pesar.
      const novos = acrescentarPontoDoLapis(traco.pontos.slice(0, -1), ponto, 3 / this.viewport.scale.x);
      traco.pontos = [...novos, { x: ponto.x, y: ponto.y }];
    } else {
      traco.pontos = [traco.pontos[0], ponto];
    }
    this.desenharPreviaDoTraco();
  }

  private desenharPreviaDoTraco() {
    if (!this.tracoLocal) return;
    this.tracos.definirPrevia(this.tracoLocal.forma, this.tracoLocal.pontos, this.corPropria, this.viewport.scale.x);
  }

  private terminarTraco() {
    const traco = this.tracoLocal;
    this.tracoLocal = null;
    this.tracos.limparPrevia();
    if (!traco) return;
    // Um clique sem arrastar não é um desenho (4 px de tela).
    if (!tracoValeAPena(traco.forma, traco.pontos, 4 / this.viewport.scale.x)) return;
    const pontos = traco.forma === 'lapis' ? reduzirPontos(traco.pontos, MAX_PONTOS_DO_TRACO) : [traco.pontos[0], traco.pontos[traco.pontos.length - 1]];
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    const { duracao, privado } = this.opcoesDesenho;
    // O traço fixo só aparece quando o servidor o guarda e devolve (senão ficaria duplicado), e não entra no "desfazer" local.
    if (duracao !== DURACAO_FIXA_MS) {
      this.tracos.adicionar({ id, por: this.usuarioPropria, cor: this.corPropria, forma: traco.forma, pontos, duracao, privado }, performance.now(), this.viewport.scale.x);
      this.meusTracos.push(id);
      if (this.meusTracos.length > 50) this.meusTracos.shift();
    }
    this.eventos.aoTraco?.({ id, forma: traco.forma, pontos, duracao, privado, cor: this.corPropria });
  }

  /** Traço de outra pessoa (ou o meu, devolvido): desenhado como chegou, com a cor de quem fez. */
  tracoRemoto(traco: { id: string; por: string; cor: string; forma: FormaDeTraco; pontos: IPonto[]; duracao: number; privado?: boolean }) {
    this.tracos.adicionar(traco, performance.now(), this.viewport.scale.x);
  }

  apagarTraco(id: string) {
    this.tracos.remover(id);
  }

  limparTracosDe(por: string) {
    this.tracos.removerDe(por);
  }

  /** Desfaz o meu último traço e devolve o id (a página avisa a mesa); nulo se não há nenhum. */
  desfazerMeuTraco(): string | null {
    const id = this.meusTracos.pop() ?? null;
    if (id) this.tracos.remover(id);
    return id;
  }

  limparMeusTracos() {
    this.tracos.removerDe(this.usuarioPropria);
    this.meusTracos = [];
  }

  /** Os traços desta cena somem quando a cena muda. */
  limparTodosOsTracos() {
    this.tracos.limpar();
    this.meusTracos = [];
    this.fixosNaTela.clear();
    this.assinaturaDosFixos = '';
  }

  /** Os desenhos fixos do Mestre: ficam na tela de quem os recebe até serem apagados (o servidor manda a lista inteira). */
  private definirDesenhosFixos(lista: readonly IDesenhoFixo[]) {
    const assinatura = JSON.stringify(lista);
    if (assinatura === this.assinaturaDosFixos) return;
    this.assinaturaDosFixos = assinatura;
    const agora = performance.now();
    const escala = this.viewport.scale.x;
    const ids = new Set(lista.map((desenho) => `fixo:${desenho.id}`));
    for (const id of [...this.fixosNaTela]) {
      if (ids.has(id)) continue;
      this.tracos.remover(id);
      this.fixosNaTela.delete(id);
    }
    for (const desenho of lista) {
      const id = `fixo:${desenho.id}`;
      if (this.fixosNaTela.has(id)) continue;
      this.fixosNaTela.add(id);
      this.tracos.adicionar({
        id, por: 'fixo', cor: desenho.cor, forma: desenho.forma, pontos: desenho.pontos.map(([x, y]) => ({ x, y })),
        duracao: DURACAO_DO_TRACO_FIXO_NA_TELA_MS, privado: desenho.publico === false,
      }, agora, escala);
    }
  }

  /** Termina a régua que está na tela (a do arrasto curto ou a com pontos de passagem) e avisa a mesa. */
  terminarRegua() {
    if (!this.pontosRegua && !this.reguaLocal) return;
    this.pontosRegua = null;
    this.reguaEmCaminho = false;
    this.perguntaDaLinha = null;
    this.viewport.plugins.resume('drag');
    this.reguaLocal?.linha.destroy();
    this.reguaLocal?.rotulo.destroy();
    this.reguaLocal = null;
    this.eventos.aoRegua(null);
  }

  /** A régua com pontos de passagem está aberta: o Esc a termina antes de qualquer outra coisa. */
  get reguaAberta(): boolean {
    return this.reguaEmCaminho && this.pontosRegua !== null;
  }

  private pingLocal(x: number, y: number, tipo: TipoDePing) {
    this.ping(x, y, tipo === 'perigo' ? COR_PERIGO : tipo === 'olhar' ? COR_OLHAR : '#f6ad55', undefined, tipo);
    this.eventos.aoPing(x, y, tipo);
  }

  ping(x: number, y: number, cor: string, nome?: string, tipo: TipoDePing = 'normal') {
    const corFinal = tipo === 'perigo' ? COR_PERIGO : tipo === 'olhar' ? COR_OLHAR : cor;
    const grupo = new Container();
    grupo.position.set(x, y);
    grupo.addChild(new Graphics());
    if (tipo === 'perigo') {
      // O ponto de exclamação no meio: o aviso se lê mesmo sem som.
      const marca = new Text({ text: '!', style: { fontFamily: 'system-ui, sans-serif', fontWeight: '900', fontSize: 22, fill: '#ffffff', stroke: { color: COR_PERIGO, width: 5 } } });
      marca.anchor.set(0.5);
      marca.scale.set(1 / this.viewport.scale.x);
      grupo.addChild(marca);
    }
    if (nome) {
      const rotulo = new Text({ text: tipo === 'olhar' ? `${nome}: olhem aqui` : nome, style: { fontFamily: 'system-ui, sans-serif', fontWeight: '700', fontSize: 14, fill: '#ffffff', stroke: { color: corFinal, width: 4 } } });
      rotulo.anchor.set(0.5, 0);
      rotulo.scale.set(1 / this.viewport.scale.x);
      rotulo.y = 30 / this.viewport.scale.x;
      grupo.addChild(rotulo);
    }
    this.pings.set(grupo, { nascimento: performance.now(), cor: corFinal, tipo });
    this.camadaPings.addChild(grupo);
  }

  private animarPings(agora: number) {
    const escala = 1 / this.viewport.scale.x;
    for (const [grupo, { nascimento, cor, tipo }] of this.pings) {
      const idade = agora - nascimento;
      if (idade > DURACAO_DO_PING[tipo]) {
        this.pings.delete(grupo);
        grupo.destroy({ children: true });
        continue;
      }
      const anel = grupo.children[0] as Graphics;
      anel.clear();
      // O perigo bate mais depressa e com três ondas; o "olhem aqui" é largo e dourado.
      const ondas = tipo === 'perigo' ? 3 : 2;
      const ciclo = tipo === 'perigo' ? 600 : 900;
      const alcance = tipo === 'olhar' ? 110 : 60;
      for (let onda = 0; onda < ondas; onda++) {
        const t = ((idade / ciclo) + onda / ondas) % 1;
        anel.circle(0, 0, (12 + t * alcance) * escala).stroke({ width: 4 * escala, color: cor, alpha: 1 - t });
      }
      anel.circle(0, 0, (tipo === 'perigo' ? 13 : 6) * escala).fill(cor);
    }
  }

  destruir() {
    this.observador?.disconnect();
    if (this.carregarVisiveis !== null) window.clearTimeout(this.carregarVisiveis);
    this.clima.destruir();
    this.luzes.destruir();
    this.magias.destruir();
    this.numeros.destruir();
    esquecerTexturasDeMoldura();
    this.app.destroy({ removeView: true }, { children: true, texture: true, textureSource: true });
    // O que sobrou da névoa e do clima vai depois do renderizador, que já não desenha nada com elas.
    this.nevoa.destruir();
    this.nevoaMemoria.destruir();
    esquecerTexturasDoClima();
  }
}
