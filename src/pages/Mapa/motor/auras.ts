// Aura presa ao token (aura de paladino, área de controle): um círculo em casas, no chão,
// embaixo dos tokens, que anda junto com o token arrastado. O servidor já tira do jogador a
// aura que o Mestre escondeu (plataforma/core/mesa_extras.py).
//
// Sete jeitos de desenhar (EstiloDeAura): campo, anel, suave, pulso, tracejada, ondas e chamas.
// Todos cabem no mesmo círculo de `raio` casas: o estilo muda a cara, nunca o alcance.

import { Container, Graphics } from 'pixi.js';
import type { EstiloDeAura, IAuraToken } from '../../../services/mapaApi';

export interface AuraNoMapa {
  x: number;
  y: number;
  aura: IAuraToken | null | undefined;
}

export const ESTILOS_DE_AURA: readonly EstiloDeAura[] = ['campo', 'anel', 'suave', 'pulso', 'tracejada', 'ondas', 'chamas'];

export const estiloDaAura = (aura: Pick<IAuraToken, 'estilo'>): EstiloDeAura =>
  aura.estilo && ESTILOS_DE_AURA.includes(aura.estilo) ? aura.estilo : 'campo';

function corDe(cor: string): number {
  const numero = Number.parseInt(cor.replace('#', ''), 16);
  return Number.isFinite(numero) ? numero : 0x7dd3fc;
}

/** Pontos de uma borda que ondula: o raio varia com o ângulo e o tempo. `ondas` somam cada uma `[frequência, amplitude, velocidade]`. */
export function pontosDaBorda(raio: number, agora: number, ondas: ReadonlyArray<readonly [number, number, number]>, passos = 96): number[] {
  const t = agora / 1000;
  const pontos: number[] = [];
  for (let i = 0; i < passos; i++) {
    const angulo = (i / passos) * Math.PI * 2;
    let variacao = 1;
    for (const [frequencia, amplitude, velocidade] of ondas) variacao += amplitude * Math.sin(angulo * frequencia + t * velocidade);
    pontos.push(Math.cos(angulo) * raio * variacao, Math.sin(angulo) * raio * variacao);
  }
  return pontos;
}

/** O progresso (0 a 1) de cada onda do estilo pulso: três ondas defasadas, cada uma abrindo do centro à borda em 2,4 s. */
export function progressoDasOndas(agora: number, quantas = 3, duracao = 2400): number[] {
  return Array.from({ length: quantas }, (_, i) => ((agora / duracao) + i / quantas) % 1);
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
      const raio = token.aura.raio * casa;
      const cor = corDe(token.aura.cor);
      // A aura escondida (só quem comanda e o dono veem) fica mais apagada: é lembrete.
      const alfa = token.aura.visivel ? 1 : 0.55;
      this.desenharEstilo(g, estiloDaAura(token.aura), token.x, token.y, raio, cor, alfa, fino, respiro, agora);
    }
  }

  private desenharEstilo(g: Graphics, estilo: EstiloDeAura, x: number, y: number, raio: number, cor: number, alfa: number, fino: number, respiro: number, agora: number) {
    switch (estilo) {
      case 'anel': {
        g.circle(x, y, raio * respiro).stroke({ width: fino * 2.4, color: cor, alpha: 0.8 * alfa });
        g.circle(x, y, raio * respiro - fino * 2.2).stroke({ width: fino * 0.8, color: cor, alpha: 0.28 * alfa });
        return;
      }
      case 'suave': {
        // Esmaece do centro para a borda: camadas de círculos que se somam.
        for (let i = 0; i < 6; i++) g.circle(x, y, raio * respiro * (1 - i * 0.15)).fill({ color: cor, alpha: 0.05 * alfa });
        g.circle(x, y, raio * respiro).stroke({ width: fino, color: cor, alpha: 0.32 * alfa });
        return;
      }
      case 'pulso': {
        g.circle(x, y, raio).fill({ color: cor, alpha: 0.05 * alfa });
        g.circle(x, y, raio).stroke({ width: fino, color: cor, alpha: 0.3 * alfa });
        for (const progresso of progressoDasOndas(agora)) {
          // A onda abre rápido no começo e se apaga ao chegar na borda.
          const aberta = 1 - (1 - progresso) ** 2;
          g.circle(x, y, Math.max(1, raio * aberta)).stroke({ width: fino * 1.7, color: cor, alpha: 0.7 * (1 - progresso) * alfa });
        }
        return;
      }
      case 'tracejada': {
        const tracos = Math.max(16, Math.min(72, Math.round(raio / 5)));
        const giro = agora / 5000;
        g.circle(x, y, raio).fill({ color: cor, alpha: 0.06 * alfa });
        for (let i = 0; i < tracos; i++) {
          const inicio = giro + (i / tracos) * Math.PI * 2;
          const fim = inicio + (Math.PI * 2 / tracos) * 0.55;
          g.moveTo(x + Math.cos(inicio) * raio, y + Math.sin(inicio) * raio);
          g.arc(x, y, raio, inicio, fim);
        }
        g.stroke({ width: fino * 1.8, color: cor, alpha: 0.85 * alfa, cap: 'round' });
        return;
      }
      case 'ondas': {
        const borda = pontosDaBorda(raio, agora, [[7, 0.022, 1.8], [11, 0.014, -2.6]]).map((valor, i) => valor + (i % 2 === 0 ? x : y));
        g.poly(borda, true).fill({ color: cor, alpha: 0.1 * alfa }).stroke({ width: fino * 1.5, color: cor, alpha: 0.72 * alfa, join: 'round' });
        return;
      }
      case 'chamas': {
        const externa = pontosDaBorda(raio, agora, [[13, 0.05, 6.5], [23, 0.035, -9.1], [5, 0.02, 3]]).map((valor, i) => valor + (i % 2 === 0 ? x : y));
        const interna = pontosDaBorda(raio * 0.93, agora, [[17, 0.04, 7.7], [9, 0.025, -5.2]]).map((valor, i) => valor + (i % 2 === 0 ? x : y));
        g.poly(externa, true).fill({ color: cor, alpha: 0.1 * alfa }).stroke({ width: fino * 1.4, color: cor, alpha: 0.78 * alfa, join: 'round' });
        g.poly(interna, true).fill({ color: cor, alpha: 0.07 * alfa });
        return;
      }
      default: {
        // Campo: o círculo cheio de sempre, com a respiração leve.
        g.circle(x, y, raio * respiro).fill({ color: cor, alpha: 0.12 * alfa });
        g.circle(x, y, raio * respiro).stroke({ width: fino * 1.4, color: cor, alpha: 0.7 * alfa });
      }
    }
  }
}
