// Aura presa ao token (aura de paladino, área de controle): um círculo em casas, no chão,
// embaixo dos tokens, que anda junto com o token arrastado. O servidor já tira do jogador a
// aura que o Mestre escondeu (plataforma/core/mesa_extras.py).

import { Container, Graphics } from 'pixi.js';
import type { IAuraToken } from '../../../services/mapaApi';

export interface AuraNoMapa {
  x: number;
  y: number;
  aura: IAuraToken | null | undefined;
}

function corDe(cor: string): number {
  const numero = Number.parseInt(cor.replace('#', ''), 16);
  return Number.isFinite(numero) ? numero : 0x7dd3fc;
}

export class CamadaAuras {
  readonly raiz = new Container();
  private desenho = new Graphics();

  constructor() {
    this.raiz.eventMode = 'none';
    this.raiz.addChild(this.desenho);
  }

  quadro(tokens: Iterable<AuraNoMapa>, casa: number, agora: number, escala: number) {
    const g = this.desenho;
    g.clear();
    const fino = Math.max(1.5, 2 / Math.max(escala, 0.05));
    const respiro = 1 + 0.015 * Math.sin(agora / 700);
    for (const token of tokens) {
      if (!token.aura) continue;
      const raio = token.aura.raio * casa * respiro;
      const cor = corDe(token.aura.cor);
      // A aura escondida (só quem comanda e o dono veem) fica mais apagada: é lembrete.
      const alfa = token.aura.visivel ? 1 : 0.55;
      g.circle(token.x, token.y, raio).fill({ color: cor, alpha: 0.12 * alfa });
      g.circle(token.x, token.y, raio).stroke({ width: fino * 1.4, color: cor, alpha: 0.7 * alfa });
    }
  }
}
