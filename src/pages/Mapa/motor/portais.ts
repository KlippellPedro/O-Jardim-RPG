// Portais na tela: cada boca é um redemoinho na cor do Fluxo, girando devagar. O Mestre
// vê também os escondidos e os desligados (apagados), a linha entre as duas bocas e o nome
// do portal escolhido. A travessia em si é do servidor; aqui só o desenho e o clarão.

import { Container, Graphics, Text } from 'pixi.js';
import type { IPontoMapa, IPortal } from '../../../services/mapaApi';
import { corDoFluxo } from './magia';
import type { LadoPortal } from './portaisConta';

/** Duração do clarão de uma boca quando alguém atravessa. */
const CLARAO_MS = 700;

export class CamadaPortais {
  readonly raiz = new Container();
  private desenho = new Graphics();
  private rotulo = new Text({ text: '', style: { fontFamily: 'system-ui, sans-serif', fontWeight: '700', fontSize: 15, fill: '#ffffff', stroke: { color: '#000000', width: 4 } } });
  private portais: IPortal[] = [];
  private casa = 100;
  private gestor = false;
  private selecionado: string | null = null;
  /** Boca que o Mestre está arrastando, já no lugar novo (antes de o servidor gravar). */
  private arrastada: { id: string; lado: LadoPortal; ponto: IPontoMapa } | null = null;
  /** A primeira boca de um portal que o Mestre ainda está criando. */
  private pendente: IPontoMapa | null = null;
  private claroes: Array<{ x: number; y: number; cor: number; desde: number }> = [];

  constructor() {
    this.raiz.eventMode = 'none';
    this.rotulo.anchor.set(0.5, 1);
    this.raiz.addChild(this.desenho, this.rotulo);
  }

  definir(portais: IPortal[], casa: number, gestor: boolean) {
    this.portais = portais;
    this.casa = casa;
    this.gestor = gestor;
    if (this.arrastada && !portais.some((p) => p.id === this.arrastada?.id)) this.arrastada = null;
  }

  selecionar(id: string | null) {
    this.selecionado = id;
  }

  definirArrastada(arrastada: { id: string; lado: LadoPortal; ponto: IPontoMapa } | null) {
    this.arrastada = arrastada;
  }

  definirPendente(ponto: IPontoMapa | null) {
    this.pendente = ponto;
  }

  /** Alguém atravessou: as duas bocas piscam. */
  clarear(pontos: Array<IPontoMapa | null>, fluxo: string, agora: number) {
    const cor = corDoFluxo(fluxo);
    for (const ponto of pontos) if (ponto) this.claroes.push({ x: ponto.x, y: ponto.y, cor, desde: agora });
  }

  private boca(portal: IPortal, lado: LadoPortal): IPontoMapa | null {
    if (this.arrastada?.id === portal.id && this.arrastada.lado === lado) return this.arrastada.ponto;
    return portal[lado];
  }

  quadro(agora: number, escala: number) {
    const g = this.desenho;
    g.clear();
    const fino = Math.max(1.5, 2 / escala);
    let nome: { texto: string; x: number; y: number } | null = null;
    for (const portal of this.portais) {
      const cor = corDoFluxo(portal.fluxo);
      const apagado = !portal.ligado || !portal.visivel;
      const forca = !portal.ligado ? 0.3 : !portal.visivel ? 0.55 : 1;
      const raio = portal.raio * this.casa;
      const a = this.boca(portal, 'a');
      const b = this.boca(portal, 'b');
      const escolhido = portal.id === this.selecionado;
      if (this.gestor && a && b) {
        // Só o Mestre vê a ligação entre as bocas.
        g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width: fino, color: cor, alpha: escolhido ? 0.75 : 0.22 });
      }
      for (const [lado, ponto] of [['a', a], ['b', b]] as const) {
        if (!ponto) continue;
        // A saída de um portal só de ida é um anel sem giro: dá para chegar, não para entrar.
        const entrada = lado === 'a' || portal.mao === 'dupla';
        this.desenharBoca(g, ponto, raio, cor, forca, entrada, agora, apagado, escolhido, fino);
      }
      if (escolhido && this.gestor && a) nome = { texto: portal.nome, x: a.x, y: a.y - raio - 6 / escala };
    }
    if (this.pendente) {
      const raio = 0.6 * this.casa;
      g.circle(this.pendente.x, this.pendente.y, raio).stroke({ width: fino * 1.5, color: 0xffffff, alpha: 0.6 + 0.3 * Math.sin(agora / 180) });
    }
    this.claroes = this.claroes.filter((clarao) => agora - clarao.desde < CLARAO_MS);
    for (const clarao of this.claroes) {
      const t = (agora - clarao.desde) / CLARAO_MS;
      const raio = this.casa * (0.5 + t * 1.1);
      g.circle(clarao.x, clarao.y, raio).fill({ color: clarao.cor, alpha: 0.35 * (1 - t) });
      g.circle(clarao.x, clarao.y, raio).stroke({ width: fino * 2, color: 0xffffff, alpha: 0.8 * (1 - t) });
    }
    this.rotulo.visible = Boolean(nome);
    if (nome) {
      this.rotulo.text = nome.texto;
      this.rotulo.scale.set(1 / escala);
      this.rotulo.position.set(nome.x, nome.y);
    }
  }

  private desenharBoca(
    g: Graphics, ponto: IPontoMapa, raio: number, cor: number, forca: number, entrada: boolean,
    agora: number, apagado: boolean, escolhido: boolean, fino: number,
  ) {
    const respiro = 1 + 0.04 * Math.sin(agora / 420);
    g.circle(ponto.x, ponto.y, raio * respiro).fill({ color: cor, alpha: 0.16 * forca });
    g.circle(ponto.x, ponto.y, raio * respiro).stroke({ width: fino * 1.6, color: cor, alpha: 0.85 * forca });
    if (entrada) {
      // Três braços em espiral girando para dentro.
      const giro = agora / (apagado ? 2400 : 900);
      for (let braco = 0; braco < 3; braco++) {
        const inicio = giro + (braco * Math.PI * 2) / 3;
        for (let passo = 0; passo < 7; passo++) {
          const t = passo / 6;
          const angulo = inicio + t * 2.4;
          const r = raio * (0.92 - t * 0.7);
          const x = ponto.x + Math.cos(angulo) * r;
          const y = ponto.y + Math.sin(angulo) * r;
          if (passo === 0) g.moveTo(x, y);
          else g.lineTo(x, y);
        }
        g.stroke({ width: fino * 1.3, color: 0xffffff, alpha: 0.55 * forca, cap: 'round' });
      }
    }
    g.circle(ponto.x, ponto.y, raio * 0.18).fill({ color: 0xffffff, alpha: 0.5 * forca });
    if (escolhido) g.circle(ponto.x, ponto.y, raio * 1.18).stroke({ width: fino, color: 0xffffff, alpha: 0.9 });
  }
}
