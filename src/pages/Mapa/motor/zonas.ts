// A camada das zonas de terreno: o Mestre vê o contorno de todas (cobertura, gatilho, terreno) com o nome e o que fazem;
// o jogador vê só o terreno que o Mestre deixou à vista, como uma mancha colorida com o nome. Os telhados ficam numa raiz à
// parte, por cima dos tokens: cobrem o que tem dentro e somem quando alguém do grupo entra. Só desenha.

import { Container, Graphics, Text } from 'pixi.js';
import type { IZona } from '../../../services/mapaApi';
import { algumDentro, alvoDoTelhado, corDaZona, resumoDaZona } from './zonasConta';
import { tracejar } from './geometria';

interface Desenho {
  zona: IZona;
  grafico: Graphics;
  rotulo: Text;
}

interface Telhado {
  zona: IZona;
  grafico: Graphics;
  alfa: number;
}

export class CamadaZonas {
  readonly raiz = new Container();
  /** Os telhados: por cima dos tokens (o palco põe esta raiz depois da camada dos tokens). */
  readonly telhados = new Container();
  private desenhos: Desenho[] = [];
  private cobertos: Telhado[] = [];
  private gestor = false;
  private escala = 1;
  private selecionada: string | null = null;
  /** O que foi desenhado por último: a página chama `definir` a cada mudança do mapa, e sem isto o telhado piscaria fechado. */
  private assinatura = '';

  constructor() {
    this.raiz.eventMode = 'none';
    this.telhados.eventMode = 'none';
  }

  get temTelhado() {
    return this.cobertos.length > 0;
  }

  definir(zonas: readonly IZona[], gestor: boolean) {
    const assinatura = JSON.stringify([zonas, gestor]);
    if (assinatura === this.assinatura) return;
    this.assinatura = assinatura;
    this.gestor = gestor;
    // O telhado que já estava aberto (ou fechado) continua assim ao redesenhar.
    const alfasAnteriores = new Map(this.cobertos.map((telhado) => [telhado.zona.id, telhado.alfa]));
    for (const desenho of this.desenhos) desenho.grafico.destroy(), desenho.rotulo.destroy();
    for (const telhado of this.cobertos) telhado.grafico.destroy();
    this.desenhos = [];
    this.cobertos = [];
    for (const zona of zonas) {
      // O jogador recebe o telhado sem terreno: só o telhado se desenha (um retângulo colorido de sobra entregaria o contorno).
      if (gestor || zona.terreno) {
        const grafico = new Graphics();
        const rotulo = new Text({ text: '', style: { fontFamily: 'system-ui, sans-serif', fontWeight: '700', fontSize: 13, fill: '#ffffff', stroke: { color: '#000000', width: 3 }, align: 'center' } });
        rotulo.anchor.set(0.5, 0);
        this.raiz.addChild(grafico, rotulo);
        this.desenhos.push({ zona, grafico, rotulo });
      }
      if (zona.telhado) {
        const grafico = new Graphics();
        this.telhados.addChild(grafico);
        // Começa coberto (quem acabou de abrir a mesa não vê o telhado "apagando" do nada).
        this.cobertos.push({ zona, grafico, alfa: alfasAnteriores.get(zona.id) ?? alvoDoTelhado(false, gestor) });
      }
    }
    this.redesenhar();
  }

  /** A zona que o Mestre está editando fica mais forte. */
  selecionar(id: string | null) {
    if (this.selecionada === id) return;
    this.selecionada = id;
    this.redesenhar();
  }

  /**
   * O zoom mudou: o traço e o texto mantêm o tamanho na tela. `grupo` são os centros dos tokens do grupo (jogadores e aliados):
   * o telhado em que algum deles está dentro se apaga aos poucos, e volta quando todos saem.
   */
  quadro(zoom: number, grupo: ReadonlyArray<{ x: number; y: number }> = []) {
    for (const telhado of this.cobertos) {
      const alvo = alvoDoTelhado(algumDentro(telhado.zona, grupo), this.gestor);
      if (Math.abs(telhado.alfa - alvo) > 0.004) {
        telhado.alfa += (alvo - telhado.alfa) * 0.12;
        telhado.grafico.alpha = telhado.alfa;
      }
    }
    if (Math.abs(zoom - this.escala) / this.escala < 0.02) return;
    this.escala = zoom;
    this.redesenhar();
  }

  private redesenhar() {
    const unidade = 1 / this.escala;
    for (const { zona, grafico, rotulo } of this.desenhos) {
      const cor = corDaZona(zona);
      const forte = this.selecionada === zona.id;
      grafico.clear();
      grafico.rect(zona.x, zona.y, zona.w, zona.h).fill({ color: cor, alpha: this.gestor ? (forte ? 0.22 : 0.1) : 0.16 });
      const largura = (forte ? 3 : 2) * unidade;
      if (this.gestor) {
        // O Mestre vê o contorno tracejado, o jogador só a mancha: o contorno denuncia que há algo desenhado.
        for (const [ax, ay, bx, by] of [[zona.x, zona.y, zona.x + zona.w, zona.y], [zona.x + zona.w, zona.y, zona.x + zona.w, zona.y + zona.h], [zona.x + zona.w, zona.y + zona.h, zona.x, zona.y + zona.h], [zona.x, zona.y + zona.h, zona.x, zona.y]] as const) {
          for (const [x0, y0, x1, y1] of tracejar([[ax, ay, bx, by]], 10 * unidade, 6 * unidade)) grafico.moveTo(x0, y0).lineTo(x1, y1);
        }
        grafico.stroke({ width: largura, color: cor, alpha: forte ? 1 : 0.8 });
      }
      const linhas = [zona.nome, this.gestor ? resumoDaZona(zona) : ''].filter(Boolean);
      rotulo.text = linhas.join('\n');
      rotulo.alpha = this.gestor ? 0.95 : 0.8;
      rotulo.scale.set(unidade);
      rotulo.position.set(zona.x + zona.w / 2, zona.y + 4 * unidade);
    }
    for (const telhado of this.cobertos) this.desenharTelhado(telhado);
  }

  /** Telhas em faixas inclinadas com a cumeeira no meio: lê como telhado de cima, sem depender de imagem. */
  private desenharTelhado({ zona, grafico, alfa }: Telhado) {
    const { x, y, w, h } = zona;
    grafico.clear();
    grafico.rect(x, y, w, h).fill('#3b2a21');
    const passo = Math.max(14, Math.min(w, h) / 9);
    const horizontal = w >= h;
    // Fileiras de telhas, paralelas ao lado maior.
    if (horizontal) {
      for (let linha = passo; linha < h; linha += passo) grafico.moveTo(x, y + linha).lineTo(x + w, y + linha);
    } else {
      for (let coluna = passo; coluna < w; coluna += passo) grafico.moveTo(x + coluna, y).lineTo(x + coluna, y + h);
    }
    grafico.stroke({ width: Math.max(1, passo * 0.07), color: '#54392c', alpha: 0.9 });
    // A cumeeira, mais clara, no meio.
    if (horizontal) grafico.moveTo(x, y + h / 2).lineTo(x + w, y + h / 2);
    else grafico.moveTo(x + w / 2, y).lineTo(x + w / 2, y + h);
    grafico.stroke({ width: Math.max(2, passo * 0.18), color: '#6b4a39', alpha: 0.95 });
    grafico.rect(x, y, w, h).stroke({ width: Math.max(2, passo * 0.14), color: '#1d130e', alpha: 1 });
    grafico.alpha = alfa;
  }

  destruir() {
    this.raiz.destroy({ children: true });
    this.telhados.destroy({ children: true });
  }
}
