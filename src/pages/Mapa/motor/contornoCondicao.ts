// O contorno animado do token: fogo lambendo, veneno borbulhando, gelo cintilando, estrelas girando e assim por diante.
// Só desenha; quais famílias valem vem de condicoesVisuais.ts. Quem pediu menos movimento no aparelho vê o desenho parado.

import { Graphics } from 'pixi.js';
import type { FamiliaDeContorno } from './condicoesVisuais';

const reduzido = (): boolean => {
  try {
    return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
};

/** Um ruído repetível entre 0 e 1: o mesmo número dá sempre o mesmo valor. */
const ruido = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

const estrela = (g: Graphics, x: number, y: number, r: number) => {
  g.moveTo(x, y - r).lineTo(x + r * 0.28, y - r * 0.28).lineTo(x + r, y).lineTo(x + r * 0.28, y + r * 0.28)
    .lineTo(x, y + r).lineTo(x - r * 0.28, y + r * 0.28).lineTo(x - r, y).lineTo(x - r * 0.28, y - r * 0.28).closePath();
};

export class ContornoDeCondicao {
  readonly raiz = new Graphics();
  private familias: FamiliaDeContorno[] = [];
  private parado = reduzido();

  constructor() {
    this.raiz.eventMode = 'none';
  }

  definir(familias: readonly FamiliaDeContorno[]) {
    const mudou = familias.length !== this.familias.length || familias.some((f, i) => f !== this.familias[i]);
    this.familias = [...familias];
    if (mudou && !this.familias.length) this.raiz.clear();
  }

  get ativo() {
    return this.familias.length > 0;
  }

  /** Chamado a cada quadro com o raio do quadro do token (o contorno fica logo por fora). */
  quadro(tempo: number, raio: number) {
    const g = this.raiz;
    if (!this.familias.length) return;
    const t = this.parado ? 1500 : tempo;
    g.clear();
    for (const familia of this.familias) {
      switch (familia) {
        case 'fogo': {
          g.circle(0, 0, raio * 1.04).stroke({ width: raio * 0.07, color: '#f97316', alpha: 0.45 + 0.15 * Math.sin(t / 140) });
          const linguas = 12;
          for (let k = 0; k < linguas; k++) {
            const angulo = (k / linguas) * Math.PI * 2 + Math.sin(t / 400 + k) * 0.06;
            const altura = raio * (0.16 + 0.11 * Math.sin(t / 110 + k * 1.9) + 0.05 * ruido(k + Math.floor(t / 160)));
            const meia = (Math.PI * 2) / linguas * 0.36;
            const base = raio * 1.04;
            g.moveTo(Math.cos(angulo - meia) * base, Math.sin(angulo - meia) * base)
              .lineTo(Math.cos(angulo) * (base + altura), Math.sin(angulo) * (base + altura))
              .lineTo(Math.cos(angulo + meia) * base, Math.sin(angulo + meia) * base).closePath()
              .fill({ color: k % 2 ? '#fbbf24' : '#f97316', alpha: 0.78 });
          }
          break;
        }
        case 'veneno': {
          g.circle(0, 0, raio * 1.04).stroke({ width: raio * 0.06, color: '#84cc16', alpha: 0.4 + 0.12 * Math.sin(t / 380) });
          for (let k = 0; k < 7; k++) {
            const p = ((t / 1600) + k / 7) % 1;
            const angulo = (k / 7) * Math.PI * 2 + 0.6;
            const x = Math.cos(angulo) * raio * 1.04;
            const y = Math.sin(angulo) * raio * 1.04 - p * raio * 0.45;
            g.circle(x, y, raio * 0.07 * (1 - p * 0.6)).fill({ color: '#a3e635', alpha: 0.85 * (1 - p) });
          }
          break;
        }
        case 'sangue': {
          g.circle(0, 0, raio * 1.04).stroke({ width: raio * 0.05, color: '#b91c1c', alpha: 0.5 });
          for (let k = 0; k < 5; k++) {
            const p = ((t / 1300) + k / 5) % 1;
            const angulo = Math.PI * (0.18 + 0.64 * (k / 4));
            const x = Math.cos(angulo) * raio * 1.0;
            const y = Math.sin(angulo) * raio * 1.0 + p * raio * 0.42;
            g.circle(x, y, raio * 0.065).fill({ color: '#dc2626', alpha: 0.95 * (1 - p * p) });
            g.moveTo(x, y - raio * 0.1).lineTo(x - raio * 0.04, y - raio * 0.02).lineTo(x + raio * 0.04, y - raio * 0.02).closePath().fill({ color: '#dc2626', alpha: 0.8 * (1 - p * p) });
          }
          break;
        }
        case 'raio': {
          g.circle(0, 0, raio * 1.05).stroke({ width: raio * 0.05, color: '#67e8f9', alpha: 0.5 });
          const semente = Math.floor(t / 110);
          for (let k = 0; k < 6; k++) {
            const angulo = ruido(semente * 7 + k) * Math.PI * 2;
            let x = Math.cos(angulo) * raio * 0.98;
            let y = Math.sin(angulo) * raio * 0.98;
            g.moveTo(x, y);
            for (let passo = 1; passo <= 3; passo++) {
              const alcance = raio * (0.98 + passo * 0.07);
              const desvio = (ruido(semente * 13 + k * 5 + passo) - 0.5) * 0.5;
              x = Math.cos(angulo + desvio) * alcance;
              y = Math.sin(angulo + desvio) * alcance;
              g.lineTo(x, y);
            }
            g.stroke({ width: Math.max(1.4, raio * 0.04), color: '#e0f2fe', alpha: 0.9, cap: 'round', join: 'round' });
          }
          break;
        }
        case 'gelo': {
          g.circle(0, 0, raio * 1.04).stroke({ width: raio * 0.08, color: '#bae6fd', alpha: 0.6 + 0.1 * Math.sin(t / 700) });
          for (let k = 0; k < 6; k++) {
            const brilho = Math.max(0, Math.sin(t / 420 + k * 2.1));
            const angulo = (k / 6) * Math.PI * 2 + 0.3;
            estrela(g, Math.cos(angulo) * raio * 1.08, Math.sin(angulo) * raio * 1.08, raio * (0.04 + 0.08 * brilho));
            g.fill({ color: '#f0f9ff', alpha: 0.4 + 0.6 * brilho });
          }
          break;
        }
        case 'medo': {
          const tremor = Math.sin(t / 45) * raio * 0.012;
          g.circle(tremor, 0, raio * (1.04 + 0.01 * Math.sin(t / 220))).stroke({ width: raio * 0.07, color: '#7c3aed', alpha: 0.45 + 0.25 * Math.max(0, Math.sin(t / 320)) });
          for (let k = 0; k < 4; k++) {
            const inicio = (k / 4) * Math.PI * 2 + Math.sin(t / 900) * 0.4;
            g.moveTo(Math.cos(inicio) * raio * 1.1, Math.sin(inicio) * raio * 1.1);
            g.arc(0, 0, raio * 1.1, inicio, inicio + 0.5);
            g.stroke({ width: Math.max(1.4, raio * 0.04), color: '#c4b5fd', alpha: 0.7 });
          }
          break;
        }
        case 'atordoado': {
          for (let k = 0; k < 3; k++) {
            const angulo = t / 520 + (k * Math.PI * 2) / 3;
            const x = Math.cos(angulo) * raio * 0.62;
            const y = -raio * 1.02 + Math.sin(angulo) * raio * 0.13;
            estrela(g, x, y, raio * 0.13);
            g.fill({ color: '#fde047', alpha: Math.sin(angulo) > 0 ? 1 : 0.55 });
          }
          break;
        }
        case 'bencao': {
          g.circle(0, 0, raio * 1.04).stroke({ width: raio * 0.06, color: '#fde68a', alpha: 0.3 + 0.15 * Math.sin(t / 600) });
          for (let k = 0; k < 4; k++) {
            const brilho = Math.max(0, Math.sin(t / 500 + k * 1.7));
            const angulo = (k / 4) * Math.PI * 2 + t / 4000;
            estrela(g, Math.cos(angulo) * raio * 1.06, Math.sin(angulo) * raio * 1.06, raio * (0.03 + 0.07 * brilho));
            g.fill({ color: '#fffbeb', alpha: 0.35 + 0.65 * brilho });
          }
          break;
        }
      }
    }
  }
}
