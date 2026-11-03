// Desenho de um token: retrato redondo (ou iniciais), moldura, barras, nome,
// condições e marcas de seleção e de vez. A moldura vem de molduras.ts (o mesmo
// desenho da prévia da Oficina), virada em textura e guardada para reuso.
//
// E a vida do token, animada a cada quadro (`pulsar`): entra crescendo com um
// quique e sai encolhendo; leva um clarão vermelho e treme quando a Vida cai, e
// um anel verde abre quando ela sobe; na vez dele, um brilho dourado com arcos
// girando; arrastado (por quem for), sobe um pouco e deixa a sombra no chão.

import { Container, Graphics, Sprite, Text, Texture } from 'pixi.js';
import type { IBarraToken, ITokenMapa, LadoToken } from '../../../services/mapaApi';
import { abreviarNome, iniciais, siglaDaCondicao } from './geometria';
import { CORES_LADO, ESCALA_QUADRO, RAIO_RETRATO, desenharMoldura } from './molduras';
import { texturaDeBrilho } from './luzes';
import {
  barrasParaDesenhar,
  fracaoDaBarra,
  porcentagemDaBarra,
  type IPreferenciasBarrasMapa,
  PREFERENCIAS_BARRAS_PADRAO,
} from './barrasToken';

const ENTRADA_MS = 340;
const SAIDA_MS = 240;
const CLARAO_MS = 600;
/** Arrastado por outra pessoa: continua "no ar" por este tempo depois da última posição. */
const NO_AR_MS = 180;

const suaveSaida = (t: number) => 1 - (1 - t) ** 3;
/** Passa um pouco do fim e volta: o quique da entrada. */
const comQuique = (t: number) => 1 + 2.2 * (t - 1) ** 3 + 1.2 * (t - 1) ** 2;

export { CORES_LADO };

const LADO_TEXTURA = 256;
const texturasDeMoldura = new Map<string, Texture>();

function texturaDaMoldura(id: string, nivel: number | null, lado: LadoToken): Texture {
  const chave = `${id}|${id === 'nivel' ? nivel : ''}|${lado}`;
  let textura = texturasDeMoldura.get(chave);
  if (!textura) {
    const tela = new OffscreenCanvas(LADO_TEXTURA, LADO_TEXTURA);
    desenharMoldura(tela.getContext('2d')!, LADO_TEXTURA, { id, nivel, lado });
    textura = Texture.from(tela.transferToImageBitmap());
    texturasDeMoldura.set(chave, textura);
  }
  return textura;
}

/** As texturas morrem com o palco; a próxima abertura do mapa desenha de novo. */
export function esquecerTexturasDeMoldura() {
  texturasDeMoldura.clear();
}

const ROTULOS_BARRA: Record<IBarraToken['tipo'], string> = {
  vida: 'Vida', mana: 'Mana', estamina: 'Estamina', sanidade: 'Sanidade',
};

function valorCurto(barra: IBarraToken): string {
  if (barra.atual !== undefined && barra.maximo !== undefined) return `${barra.atual}/${barra.maximo}`;
  if (barra.rotulo) return barra.rotulo;
  return `${porcentagemDaBarra(barra)}%`;
}

function textoPequeno(conteudo: string, tamanho: number, cor = '#fff') {
  const texto = new Text({
    text: conteudo,
    style: { fontFamily: 'system-ui, sans-serif', fontWeight: '800', fontSize: tamanho, fill: cor, stroke: { color: '#09080d', width: Math.max(2, tamanho * 0.35) } },
  });
  texto.anchor.set(0.5);
  return texto;
}

function desenharBarra(g: Graphics, barra: IBarraToken, cor: string, x: number, y: number, largura: number, altura: number) {
  const fracao = fracaoDaBarra(barra);
  g.roundRect(x, y, largura, altura, altura / 2)
    .fill({ color: '#0d0b12', alpha: 0.9 })
    .stroke({ width: Math.max(0.5, altura * 0.12), color: '#ffffff', alpha: 0.16 });
  const preenchida = largura * fracao;
  if (preenchida > 0) {
    g.roundRect(x, y, preenchida, altura, Math.min(altura / 2, preenchida / 2)).fill(cor);
    if (altura >= 4 && preenchida > 2) {
      g.roundRect(x + altura * 0.28, y + altura * 0.12, Math.max(0, preenchida - altura * 0.56), altura * 0.24, altura * 0.12)
        .fill({ color: '#ffffff', alpha: 0.24 });
    }
  }
}

/** Barras e anéis ficam sob o token; valores completos aparecem ao selecionar ou passar o mouse. */
function desenharBarras(raiz: Container, barras: IBarraToken[], lado: number, ativa: boolean, preferencias: IPreferenciasBarrasMapa) {
  raiz.removeChildren().forEach((filho) => filho.destroy());
  const visiveis = barrasParaDesenhar(barras, preferencias);
  if (!visiveis.length) return;

  const largura = Math.max(16, Math.min(lado * 0.9, 180));
  const alturaBarra = Math.max(2, Math.min(8, lado * 0.075));
  const raioAnel = Math.max(3, Math.min(8, lado * 0.09));
  const fonte = Math.max(6, Math.min(9, lado * 0.09));
  const espacamento = Math.max(1, lado * 0.018);
  const alturas = visiveis.map((barra) => {
    const modo = preferencias.porTipo[barra.tipo].modo;
    if (modo === 'anel') return raioAnel * 2;
    if (modo === 'numero') return fonte + 5;
    return alturaBarra;
  });
  const total = alturas.reduce((soma, altura) => soma + altura, 0) + espacamento * Math.max(0, visiveis.length - 1);
  let topo = lado * 0.69;
  // Em tokens pequenos, aproxima as linhas sem deixá-las entrarem na moldura.
  if (total > lado * 0.5) topo = lado * 0.66;

  visiveis.forEach((barra, indice) => {
    const visual = preferencias.porTipo[barra.tipo];
    const altura = alturas[indice];
    const centroY = topo + altura / 2;
    const g = new Graphics();
    raiz.addChild(g);

    if (visual.modo === 'anel') {
      const anel = Math.max(1.2, raioAnel * 0.22);
      const raioCentro = raioAnel - anel / 2;
      const fracao = fracaoDaBarra(barra);
      // Mantém o alerta de Sanidade baixa do desenho anterior.
      const corAnel = barra.tipo === 'sanidade' && fracao <= 0.25 ? '#e5484d' : visual.cor;
      g.circle(0, centroY, raioAnel).fill({ color: '#0d0b12', alpha: 0.92 });
      g.circle(0, centroY, raioCentro).stroke({ width: anel, color: corAnel, alpha: 0.3 });
      if (fracao > 0) {
        const inicio = -Math.PI / 2;
        const fim = inicio + Math.PI * 2 * fracao;
        g.moveTo(Math.cos(inicio) * raioCentro, centroY + Math.sin(inicio) * raioCentro);
        g.arc(0, centroY, raioCentro, inicio, fim).stroke({ width: anel, color: corAnel, cap: 'round' });
      }
      if (ativa) {
        const texto = textoPequeno(`${porcentagemDaBarra(barra)}%`, Math.min(fonte, raioAnel * 0.9));
        texto.position.set(0, centroY);
        raiz.addChild(texto);
      }
    } else if (visual.modo === 'numero') {
      const conteudo = `${barra.tipo === 'sanidade' ? 'SAN' : barra.tipo.slice(0, 3).toUpperCase()} ${valorCurto(barra)}`;
      const larguraPilha = Math.min(largura, Math.max(fonte * 3.2, conteudo.length * fonte * 0.58 + 12));
      const x = -larguraPilha / 2;
      g.roundRect(x, topo, larguraPilha, altura, altura / 2)
        .fill({ color: '#0d0b12', alpha: 0.9 })
        .stroke({ width: 1, color: visual.cor, alpha: 0.72 });
      const texto = textoPequeno(conteudo, fonte, '#f7f4fa');
      texto.position.set(0, centroY);
      raiz.addChild(texto);
    } else {
      desenharBarra(g, barra, visual.cor, -largura / 2, centroY - alturaBarra / 2, largura, alturaBarra);
      if (ativa) {
        const texto = textoPequeno(`${ROTULOS_BARRA[barra.tipo]} ${porcentagemDaBarra(barra)}%`, fonte);
        texto.position.set(0, centroY);
        raiz.addChild(texto);
      }
    }
    topo += altura + espacamento;
  });
}

export class TokenVisual {
  readonly raiz = new Container();
  /** Retrato, clarão, moldura e marcas: a parte que sobe no arrasto e treme no dano. */
  private corpo = new Container();
  private retrato = new Container();
  private clarao = new Graphics();
  private moldura = new Sprite();
  private barras = new Container();
  private marcas = new Graphics();
  private vez = new Graphics();
  private brilhoVez: Sprite;
  private sombra: Sprite;
  private condicoes = new Container();
  private nome: Text;
  dados: ITokenMapa;
  private lado = 100;
  private texturaAtual: Texture | null = null;
  private selecionado = false;
  private naVez = false;
  private alfaBase = 1;
  private nascimento = performance.now();
  private saindoDesde: number | null = null;
  private levantadoAqui = false;
  private ultimoMovimento = -1e9;
  /** De 0 (no chão) a 1 (no ar), andando aos poucos. */
  private levante = 0;
  private vidaAnterior: number | null = null;
  private clarDesde = -1e9;
  private clarCura = false;
  private clarAceso = false;
  private sobOMouse = false;
  private preferenciasBarras: IPreferenciasBarrasMapa;

  constructor(dados: ITokenMapa, tamanhoQuadrado: number, preferenciasBarras = PREFERENCIAS_BARRAS_PADRAO) {
    this.dados = dados;
    this.preferenciasBarras = preferenciasBarras;
    this.nome = new Text({ text: '', style: { fontFamily: 'system-ui, sans-serif', fontWeight: '600', fill: '#ffffff', stroke: { color: '#000000', width: 4 } } });
    this.nome.anchor.set(0.5, 0);
    this.moldura.anchor.set(0.5);
    this.sombra = new Sprite({ texture: texturaDeBrilho(), anchor: 0.5 });
    this.sombra.tint = 0x000000;
    this.sombra.visible = false;
    this.brilhoVez = new Sprite({ texture: texturaDeBrilho(), anchor: 0.5 });
    this.brilhoVez.tint = 0xfcd34d;
    this.brilhoVez.blendMode = 'add';
    this.brilhoVez.visible = false;
    this.corpo.addChild(this.retrato, this.clarao, this.moldura, this.marcas);
    this.raiz.addChild(this.sombra, this.brilhoVez, this.vez, this.corpo, this.barras, this.condicoes, this.nome);
    this.raiz.eventMode = 'static';
    this.raiz.label = dados.id;
    // O nome inteiro aparece com o mouse em cima; fora disso fica abreviado para não cobrir os vizinhos.
    this.raiz.on('pointerover', () => {
      this.sobOMouse = true;
      this.escreverNome();
      this.desenharBarras();
    });
    this.raiz.on('pointerout', () => {
      this.sobOMouse = false;
      this.escreverNome();
      this.desenharBarras();
    });
    this.atualizar(dados, tamanhoQuadrado);
  }

  private get raioRetrato() {
    return this.lado * ESCALA_QUADRO * RAIO_RETRATO;
  }

  /** Redesenha tudo a partir dos dados; a posição só muda se `posicionar`. */
  atualizar(dados: ITokenMapa, tamanhoQuadrado: number, posicionar = true) {
    this.dados = dados;
    this.lado = Math.max(20, dados.porte * tamanhoQuadrado);
    if (posicionar) this.raiz.position.set(dados.x, dados.y);
    this.alfaBase = dados.oculto ? 0.45 : 1;
    this.raiz.alpha = this.alfaBase;
    this.raiz.cursor = dados.pode_mover ? 'grab' : 'pointer';
    this.notarVida(dados.barras);

    this.desenharRetrato();
    this.moldura.texture = texturaDaMoldura(dados.moldura ?? 'lado', dados.nivel, dados.lado);
    this.moldura.width = this.lado * ESCALA_QUADRO;
    this.moldura.height = this.lado * ESCALA_QUADRO;
    this.desenharBarras();

    this.escreverNome();
    const tamanhoNome = Math.max(8, Math.min(16, this.lado * 0.16));
    this.nome.style.fontSize = tamanhoNome;
    this.nome.y = -this.lado * 0.72 - tamanhoNome * 1.1;
    this.desenharCondicoes();
    this.desenharMarcas();
  }

  private escreverNome() {
    const texto = this.sobOMouse || this.selecionado ? this.dados.nome : abreviarNome(this.dados.nome);
    if (this.nome.text !== texto) this.nome.text = texto;
  }

  private desenharBarras() {
    desenharBarras(this.barras, this.dados.barras, this.lado, this.selecionado || this.sobOMouse, this.preferenciasBarras);
  }

  definirPreferenciasBarras(preferencias: IPreferenciasBarrasMapa) {
    this.preferenciasBarras = preferencias;
    this.desenharBarras();
  }

  private desenharCondicoes() {
    this.condicoes.removeChildren().forEach((filho) => filho.destroy());
    const raio = Math.max(7, this.lado * 0.11);
    const lista = this.dados.condicoes.slice(0, 4);
    lista.forEach((nome, i) => {
      const bolinha = new Container();
      bolinha.addChild(new Graphics().circle(0, 0, raio).fill('#2b2236').stroke({ width: Math.max(1, raio * 0.18), color: '#fcd34d' }));
      const sigla = new Text({ text: siglaDaCondicao(nome), style: { fontFamily: 'system-ui, sans-serif', fontWeight: '800', fontSize: raio * 1.05, fill: '#fde68a' } });
      sigla.anchor.set(0.5);
      bolinha.addChild(sigla);
      // Em arco, do alto à direita para baixo.
      const angulo = -Math.PI / 4 + i * (Math.PI / 6);
      bolinha.position.set(Math.cos(angulo) * this.lado * 0.6, Math.sin(angulo) * this.lado * 0.6);
      this.condicoes.addChild(bolinha);
    });
    if (this.dados.condicoes.length > lista.length) {
      const mais = new Text({ text: `+${this.dados.condicoes.length - lista.length}`, style: { fontFamily: 'system-ui, sans-serif', fontWeight: '800', fontSize: raio * 1.1, fill: '#fde68a', stroke: { color: '#000000', width: 3 } } });
      mais.anchor.set(0, 0.5);
      mais.position.set(this.lado * 0.62, this.lado * 0.4);
      this.condicoes.addChild(mais);
    }
  }

  private desenharRetrato() {
    this.retrato.removeChildren().forEach((filho) => filho.destroy());
    const raio = this.raioRetrato;
    const fundo = new Graphics().circle(0, 0, raio).fill('#1b1b24');
    this.retrato.addChild(fundo);
    if (this.texturaAtual) {
      const foto = new Sprite(this.texturaAtual);
      foto.anchor.set(0.5);
      foto.width = raio * 2;
      foto.height = raio * 2;
      this.retrato.addChild(foto);
    } else {
      const cor = this.dados.desconhecido ? '#2a2333' : CORES_LADO[this.dados.lado];
      fundo.clear().circle(0, 0, raio).fill({ color: cor, alpha: 0.35 }).circle(0, 0, raio * 0.92).fill('#16131d');
      const texto = new Text({
        text: this.dados.desconhecido ? '?' : iniciais(this.dados.nome),
        style: { fontFamily: 'system-ui, sans-serif', fontWeight: '800', fontSize: Math.max(10, raio * 0.75), fill: cor },
      });
      texto.anchor.set(0.5);
      this.retrato.addChild(texto);
    }
    this.retrato.scale.set(this.dados.flip_x ? -1 : 1, this.dados.flip_y ? -1 : 1);
  }

  /** O retrato chega depois (carregado à parte); null volta para as iniciais. */
  definirRetrato(textura: Texture | null) {
    if (this.texturaAtual === textura) return;
    this.texturaAtual = textura;
    this.desenharRetrato();
  }

  definirSelecionado(sim: boolean) {
    if (this.selecionado === sim) return;
    this.selecionado = sim;
    this.escreverNome();
    this.desenharBarras();
    this.desenharMarcas();
  }

  definirVez(sim: boolean) {
    this.naVez = sim;
    this.vez.visible = sim;
    this.brilhoVez.visible = sim;
    if (!sim) this.vez.clear();
  }

  /** A Vida que este espectador vê caiu ou subiu: clarão. Só compara o que já chegou (sem barra, sem clarão). */
  private notarVida(barras: IBarraToken[]) {
    const vida = barras.find((b) => b.tipo === 'vida');
    const fracao = vida ? vida.fracao ?? (vida.maximo ? (vida.atual ?? 0) / vida.maximo : null) : null;
    if (fracao !== null && this.vidaAnterior !== null && Math.abs(fracao - this.vidaAnterior) > 0.001) {
      this.clarDesde = performance.now();
      this.clarCura = fracao > this.vidaAnterior;
    }
    this.vidaAnterior = fracao;
  }

  /** Arrastado aqui: sobe enquanto a mão segura. */
  levantar(sim: boolean) {
    this.levantadoAqui = sim;
  }

  /** Posição nova vinda de outra pessoa: fica "no ar" enquanto as posições chegam. */
  marcarMovimento(tempo: number) {
    this.ultimoMovimento = tempo;
  }

  /** Surge de novo, crescendo como na entrada (saiu de um portal). */
  surgir(tempo: number) {
    this.nascimento = tempo;
  }

  /** Começa a sair: encolhe e some. `pulsar` devolve true quando acabou. */
  sair(tempo: number) {
    this.saindoDesde = tempo;
    this.raiz.eventMode = 'none';
  }

  /** Chamado a cada quadro: entrada, saída, sombra do arrasto, clarão de Vida e o brilho da vez.
   * Devolve true quando a saída terminou e o token pode ser destruído. */
  pulsar(tempo: number): boolean {
    let escala = 1;
    let alfa = this.alfaBase;
    const entrada = (tempo - this.nascimento) / ENTRADA_MS;
    if (entrada < 1) {
      const t = Math.max(0, entrada);
      escala = 0.6 + 0.4 * comQuique(t);
      alfa *= Math.min(1, t * 1.8);
    }
    if (this.saindoDesde !== null) {
      const t = Math.min(1, (tempo - this.saindoDesde) / SAIDA_MS);
      escala *= 1 - 0.35 * suaveSaida(t);
      alfa *= 1 - t;
      if (t >= 1) return true;
    }
    this.raiz.scale.set(escala);
    this.raiz.alpha = alfa;

    // No ar: segurado aqui, ou com posições chegando de outra pessoa.
    const noAr = this.levantadoAqui || tempo - this.ultimoMovimento < NO_AR_MS;
    this.levante += ((noAr ? 1 : 0) - this.levante) * 0.25;
    if (this.levante < 0.01) this.levante = 0;
    this.corpo.scale.set(1 + 0.08 * this.levante);
    this.sombra.visible = this.levante > 0;
    if (this.sombra.visible) {
      this.sombra.position.set(this.lado * 0.1 * this.levante, this.lado * 0.16 * this.levante);
      this.sombra.width = this.lado * 1.25;
      this.sombra.height = this.lado * 1.1;
      this.sombra.alpha = 0.75 * this.levante;
    }

    const clarao = (tempo - this.clarDesde) / CLARAO_MS;
    // Só apaga o clarão quando houve um: refazer um desenho vazio em todo quadro pesa com muitos tokens.
    if (this.clarAceso) {
      this.clarao.clear();
      this.corpo.x = 0;
      this.clarAceso = false;
    }
    if (clarao < 1) {
      this.clarAceso = true;
      const raio = this.raioRetrato;
      if (this.clarCura) {
        this.clarao.circle(0, 0, raio * (1 + 0.5 * clarao)).stroke({ width: Math.max(2, raio * 0.18), color: '#4ade80', alpha: 1 - clarao });
        this.clarao.circle(0, 0, raio).fill({ color: '#4ade80', alpha: 0.25 * (1 - clarao) });
      } else {
        this.clarao.circle(0, 0, raio).fill({ color: '#ff3b3b', alpha: 0.6 * (1 - clarao) });
        this.corpo.x = Math.sin(clarao * 42) * this.lado * 0.045 * (1 - clarao);
      }
    }

    if (this.naVez) {
      const onda = Math.sin(tempo / 260);
      this.brilhoVez.width = this.lado * (1.9 + 0.12 * onda);
      this.brilhoVez.height = this.brilhoVez.width;
      this.brilhoVez.alpha = 0.32 + 0.12 * onda;
      this.vez.clear();
      const alcance = this.lado * 0.64 + this.lado * 0.04 * onda;
      const largura = Math.max(3, this.lado * 0.05);
      this.vez.circle(0, 0, alcance).stroke({ width: largura * 0.6, color: '#fcd34d', alpha: 0.55 });
      // Três arcos girando por fora do anel.
      const giro = tempo / 900;
      for (let i = 0; i < 3; i++) {
        const comeco = giro + (i * Math.PI * 2) / 3;
        this.vez.moveTo(Math.cos(comeco) * alcance * 1.12, Math.sin(comeco) * alcance * 1.12);
        this.vez.arc(0, 0, alcance * 1.12, comeco, comeco + Math.PI / 3);
        this.vez.stroke({ width: largura, color: '#fde68a', alpha: 0.9, cap: 'round' });
      }
    }
    return false;
  }

  private desenharMarcas() {
    this.marcas.clear();
    if (this.selecionado) {
      this.marcas.circle(0, 0, this.lado * 0.6).stroke({ width: Math.max(2, this.lado * 0.03), color: '#ffffff', alpha: 0.9 });
    }
  }

  destruir() {
    this.raiz.destroy({ children: true });
  }
}
