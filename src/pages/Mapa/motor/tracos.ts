// A camada do desenho livre: os traços de todos (lápis, linha, seta, círculo, retângulo), que somem sozinhos, e a
// prévia do que a mão está desenhando. Só desenha; quem decide o que existe é o servidor (core/mapa.py) e o palco.

import { Container, Graphics } from 'pixi.js';
import type { IPonto } from './geometria';
import { opacidadeDoTraco, pontaDaSeta, type FormaDeTraco } from './tracosConta';

export interface TracoNoMapa {
  id: string;
  /** Quem desenhou (usuario_id); o traço local usa o do próprio usuário. */
  por: string;
  cor: string;
  forma: FormaDeTraco;
  pontos: IPonto[];
  /** Quanto tempo fica na tela, em ms. */
  duracao: number;
  /** Rascunho do Mestre: aparece só para ele, e mais apagado. */
  privado?: boolean;
}

interface Vivo {
  traco: TracoNoMapa;
  desenho: Graphics;
  nascimento: number;
  /** O zoom em que o desenho foi feito: a espessura é de tela, então muda com o zoom. */
  escala: number;
}

const ESPESSURA = 4;

/** Desenha a forma na espessura de tela (`escala` = 1 / zoom). */
function tracar(g: Graphics, forma: FormaDeTraco, pontos: readonly IPonto[], cor: string, escala: number) {
  g.clear();
  if (pontos.length < 2) return;
  const largura = ESPESSURA * escala;
  const estilo = { width: largura, color: cor, cap: 'round' as const, join: 'round' as const };
  const [a, b] = [pontos[0], pontos[pontos.length - 1]];
  if (forma === 'circulo') {
    const raio = Math.hypot(b.x - a.x, b.y - a.y);
    g.circle(a.x, a.y, raio).fill({ color: cor, alpha: 0.08 }).stroke(estilo);
    return;
  }
  if (forma === 'retangulo') {
    g.rect(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.abs(b.x - a.x), Math.abs(b.y - a.y)).fill({ color: cor, alpha: 0.08 }).stroke(estilo);
    return;
  }
  g.moveTo(a.x, a.y);
  if (forma === 'lapis') for (const ponto of pontos.slice(1)) g.lineTo(ponto.x, ponto.y);
  else g.lineTo(b.x, b.y);
  g.stroke(estilo);
  if (forma === 'seta') {
    const [esquerda, direita] = pontaDaSeta(a, b, 16 * escala);
    g.moveTo(esquerda.x, esquerda.y).lineTo(b.x, b.y).lineTo(direita.x, direita.y).stroke(estilo);
  }
}

export class CamadaTracos {
  readonly raiz = new Container();
  private vivos = new Map<string, Vivo>();
  private previa = new Graphics();

  constructor() {
    this.raiz.eventMode = 'none';
    this.raiz.addChild(this.previa);
  }

  adicionar(traco: TracoNoMapa, agora: number, escala: number) {
    this.remover(traco.id);
    const desenho = new Graphics();
    tracar(desenho, traco.forma, traco.pontos, traco.cor, 1 / escala);
    this.raiz.addChildAt(desenho, 0);
    this.vivos.set(traco.id, { traco, desenho, nascimento: agora, escala });
  }

  remover(id: string) {
    const vivo = this.vivos.get(id);
    if (!vivo) return;
    vivo.desenho.destroy();
    this.vivos.delete(id);
  }

  removerDe(por: string) {
    for (const [id, vivo] of [...this.vivos]) if (vivo.traco.por === por) this.remover(id);
  }

  limpar() {
    for (const id of [...this.vivos.keys()]) this.remover(id);
    this.previa.clear();
  }

  /** O que a mão está desenhando agora (sem enviar nada ainda). */
  definirPrevia(forma: FormaDeTraco, pontos: readonly IPonto[], cor: string, escala: number) {
    tracar(this.previa, forma, pontos, cor, 1 / escala);
    this.previa.alpha = 0.9;
  }

  limparPrevia() {
    this.previa.clear();
  }

  get quantos(): number {
    return this.vivos.size;
  }

  /** A cada quadro: apaga o que acabou, esmaece o que está no fim e refaz a espessura quando o zoom mudou. */
  quadro(agora: number, escala: number) {
    for (const [id, vivo] of [...this.vivos]) {
      const opacidade = opacidadeDoTraco(agora - vivo.nascimento, vivo.traco.duracao);
      if (opacidade <= 0) {
        this.remover(id);
        continue;
      }
      if (Math.abs(vivo.escala - escala) / escala > 0.02) {
        tracar(vivo.desenho, vivo.traco.forma, vivo.traco.pontos, vivo.traco.cor, 1 / escala);
        vivo.escala = escala;
      }
      vivo.desenho.alpha = opacidade * (vivo.traco.privado ? 0.55 : 0.95);
    }
  }
}
