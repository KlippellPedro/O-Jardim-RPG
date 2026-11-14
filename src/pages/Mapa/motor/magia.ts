// Efeitos de magia no mapa: círculo, cone, linha e impacto, na cor do Fluxo da
// magia. Desenhados por nós (Graphics e brilhos somados à luz do mapa), duram
// pouco mais de um segundo e somem. Quem lança vê na hora; a mesa recebe pelo
// tempo real (mensagem "magia") e vê o mesmo desenho. Nada fica gravado.
//
// A mira (`desenharMira`) é o contorno da área enquanto a pessoa arrasta, com o
// tamanho em casas e metros, para conferir o alcance antes de soltar.

import { Container, Graphics, Sprite, Text } from 'pixi.js';
import type { FormaMagia, IMagiaMapa } from '../../../services/mapaApi';
import { CORES_FLUXO, type FluxoId } from './molduras';
import { estiloDoFluxo, ruidoFixo, type EstiloDeEfeito } from './estiloDeMagia';
import { texturaDeBrilho } from './luzes';
import type { IPonto } from './geometria';

/** Abertura do cone: 60 graus. */
export const ABERTURA_CONE = Math.PI / 3;
const DURACAO_MS: Record<FormaMagia, number> = { circulo: 1700, cone: 1500, linha: 1300, impacto: 1500 };

export function corDoFluxo(fluxo: string): number {
  return Number.parseInt((CORES_FLUXO[fluxo as FluxoId] ?? '#c084fc').slice(1), 16);
}

function clarear(cor: number, quanto: number): number {
  const canal = (deslocamento: number) => {
    const valor = (cor >> deslocamento) & 255;
    return Math.round(valor + (255 - valor) * quanto);
  };
  return (canal(16) << 16) | (canal(8) << 8) | canal(0);
}

const suaveSaida = (t: number) => 1 - (1 - t) ** 3;
const aleatorio = (min: number, max: number) => min + Math.random() * (max - min);

/** Contorno da área enquanto a pessoa mira. `largura` é a espessura da linha em px do mapa. */
export function desenharMira(g: Graphics, forma: FormaMagia, o: IPonto, a: IPonto, cor: number, largura: number, casa: number) {
  const distancia = Math.hypot(a.x - o.x, a.y - o.y);
  const angulo = Math.atan2(a.y - o.y, a.x - o.x);
  if (forma === 'circulo') {
    g.circle(o.x, o.y, distancia).fill({ color: cor, alpha: 0.12 }).stroke({ width: largura, color: cor, alpha: 0.9 });
  } else if (forma === 'cone') {
    g.moveTo(o.x, o.y).arc(o.x, o.y, distancia, angulo - ABERTURA_CONE / 2, angulo + ABERTURA_CONE / 2).closePath()
      .fill({ color: cor, alpha: 0.12 }).stroke({ width: largura, color: cor, alpha: 0.9 });
  } else if (forma === 'linha') {
    const nx = -Math.sin(angulo) * casa * 0.5;
    const ny = Math.cos(angulo) * casa * 0.5;
    g.poly([o.x + nx, o.y + ny, a.x + nx, a.y + ny, a.x - nx, a.y - ny, o.x - nx, o.y - ny], true)
      .fill({ color: cor, alpha: 0.12 }).stroke({ width: largura, color: cor, alpha: 0.9 });
  } else {
    g.moveTo(o.x, o.y).lineTo(a.x, a.y).stroke({ width: largura, color: cor, alpha: 0.6 });
    g.circle(a.x, a.y, casa * 0.6).fill({ color: cor, alpha: 0.15 }).stroke({ width: largura, color: cor, alpha: 0.9 });
  }
  g.circle(o.x, o.y, largura * 2.5).fill(cor);
}

/** A área em que o estilo do Fluxo brinca: onde a magia está, no tamanho dela. */
interface Regiao { cx: number; cy: number; raio: number }

const QUANTIDADE_DE_EXTRAS = 14;

/**
 * O movimento próprio do Fluxo, por cima do desenho da forma. `t` é a fração do efeito (0 a 1) e `apagar` o esmaecer do fim.
 * Tudo sai de números repetíveis (ruidoFixo): o mesmo efeito se move igual em todas as telas.
 */
function desenharEstilo(g: Graphics, estilo: EstiloDeEfeito, regiao: Regiao, t: number, apagar: number, casa: number, cor: number, clara: number) {
  const { cx, cy, raio } = regiao;
  const n = QUANTIDADE_DE_EXTRAS;
  const traco = Math.max(1.2, casa * 0.05);
  for (let i = 0; i < n; i++) {
    const a = ruidoFixo(i, 1) * Math.PI * 2;
    const r = Math.sqrt(ruidoFixo(i, 2)) * raio;
    const px = cx + Math.cos(a) * r;
    const py = cy + Math.sin(a) * r;
    switch (estilo) {
      case 'petalas': {
        const subida = t * raio * (0.25 + 0.4 * ruidoFixo(i, 3));
        const x = px + Math.sin(t * 5 + i) * casa * 0.18;
        g.ellipse(x, py - subida, casa * 0.1, casa * 0.2).fill({ color: i % 2 ? clara : cor, alpha: 0.7 * apagar * (1 - t * 0.5) });
        break;
      }
      case 'brilho': {
        const brilho = Math.max(0, Math.sin(t * 9 + i * 1.3)) ** 2;
        const s = casa * (0.06 + 0.2 * brilho);
        g.moveTo(px, py - s).lineTo(px + s * 0.25, py - s * 0.25).lineTo(px + s, py).lineTo(px + s * 0.25, py + s * 0.25)
          .lineTo(px, py + s).lineTo(px - s * 0.25, py + s * 0.25).lineTo(px - s, py).lineTo(px - s * 0.25, py - s * 0.25).closePath()
          .fill({ color: 0xffffff, alpha: 0.9 * brilho * apagar });
        break;
      }
      case 'ondas': {
        if (i >= 3) break;
        const onda = (t * 1.6 + i / 3) % 1;
        g.circle(cx, cy, raio * (0.2 + 0.8 * onda)).stroke({ width: traco, color: clara, alpha: (1 - onda) * 0.8 * apagar });
        break;
      }
      case 'brotos': {
        const subida = ((t * 1.1 + ruidoFixo(i, 3)) % 1) * raio * 0.7;
        const x = px + Math.sin(t * 4 + i) * casa * 0.1;
        const y = py - subida;
        const s = casa * 0.09;
        g.moveTo(x - s, y).lineTo(x + s, y).moveTo(x, y - s).lineTo(x, y + s)
          .stroke({ width: traco * 1.2, color: clara, alpha: 0.85 * apagar * (1 - subida / (raio * 0.7 + 1)), cap: 'round' });
        break;
      }
      case 'redemoinho': {
        const fase = (i / n + t * 0.7) % 1;
        const ang = a + t * 9 + fase * 4;
        g.circle(cx + Math.cos(ang) * raio * fase, cy + Math.sin(ang) * raio * fase, casa * 0.07).fill({ color: i % 3 ? cor : clara, alpha: 0.85 * apagar * (1 - fase * 0.4) });
        break;
      }
      case 'estilhacos': {
        const velocidade = (0.5 + ruidoFixo(i, 3)) * raio * 0.8;
        const x = cx + Math.cos(a) * velocidade * t * 1.4;
        const y = cy + Math.sin(a) * velocidade * t * 1.4 + casa * 1.2 * t * t;
        const s = casa * (0.08 + 0.1 * ruidoFixo(i, 4));
        const giro = t * 8 + i;
        g.poly([x + Math.cos(giro) * s, y + Math.sin(giro) * s, x + Math.cos(giro + 2.4) * s, y + Math.sin(giro + 2.4) * s, x + Math.cos(giro + 4.2) * s * 0.7, y + Math.sin(giro + 4.2) * s * 0.7], true)
          .fill({ color: i % 2 ? cor : clara, alpha: 0.9 * apagar * (1 - t * 0.5) });
        break;
      }
      case 'grade': {
        if (i >= 6) break;
        const passo = (raio * 2) / 6;
        const deslize = Math.floor(t * 18 + i) % 2 ? casa * 0.05 : 0;
        const pos = -raio + passo * (i + 0.5);
        g.moveTo(cx + pos + deslize, cy - raio).lineTo(cx + pos + deslize, cy + raio).stroke({ width: traco * 0.7, color: clara, alpha: 0.35 * apagar });
        g.moveTo(cx - raio, cy + pos - deslize).lineTo(cx + raio, cy + pos - deslize).stroke({ width: traco * 0.7, color: clara, alpha: 0.35 * apagar });
        break;
      }
      case 'relogio': {
        if (i > 0) break;
        const aro = Math.max(casa * 0.6, raio * 0.7);
        g.circle(cx, cy, aro).stroke({ width: traco, color: clara, alpha: 0.6 * apagar });
        for (let marca = 0; marca < 12; marca++) {
          const ang = (marca / 12) * Math.PI * 2;
          g.moveTo(cx + Math.cos(ang) * aro * 0.9, cy + Math.sin(ang) * aro * 0.9).lineTo(cx + Math.cos(ang) * aro, cy + Math.sin(ang) * aro)
            .stroke({ width: traco, color: clara, alpha: 0.7 * apagar });
        }
        const ponteiro = t * Math.PI * 6;
        g.moveTo(cx, cy).lineTo(cx + Math.cos(ponteiro) * aro * 0.85, cy + Math.sin(ponteiro) * aro * 0.85).stroke({ width: traco * 1.4, color: 0xffffff, alpha: 0.85 * apagar, cap: 'round' });
        break;
      }
      case 'implosao': {
        const fase = (t * 1.3 + i / n) % 1;
        const rr = raio * (1 - fase);
        g.circle(cx + Math.cos(a + fase * 2) * rr, cy + Math.sin(a + fase * 2) * rr, casa * 0.08 * (1 - fase * 0.5)).fill({ color: clara, alpha: 0.8 * apagar * fase });
        break;
      }
      case 'cinzas': {
        const queda = ((t * 0.9 + ruidoFixo(i, 3)) % 1) * raio * 0.6;
        const s = casa * 0.07;
        g.rect(px - s / 2, py - raio * 0.3 + queda, s, s).fill({ color: i % 2 ? clara : cor, alpha: 0.8 * apagar * (1 - queda / (raio * 0.6 + 1)) });
        if (i < 3) {
          // Rachaduras que partem do centro.
          g.moveTo(cx, cy);
          for (let passo = 1; passo <= 4; passo++) {
            const desvio = (ruidoFixo(i * 7 + passo, 5) - 0.5) * 0.7;
            g.lineTo(cx + Math.cos(a + desvio) * (raio * 0.28 * passo), cy + Math.sin(a + desvio) * (raio * 0.28 * passo));
          }
          g.stroke({ width: traco, color: clara, alpha: 0.5 * apagar * Math.min(1, t * 4) });
        }
        break;
      }
      case 'pixels': {
        const quadrado = casa / 5;
        const x = Math.round(px / quadrado) * quadrado;
        const y = Math.round(py / quadrado) * quadrado;
        if (ruidoFixo(i, Math.floor(t * 14)) > 0.35) g.rect(x, y, quadrado * 0.9, quadrado * 0.9).fill({ color: i % 2 ? clara : cor, alpha: 0.85 * apagar });
        if (i === 0) {
          const varredura = cy - raio + ((t * 1.8) % 1) * raio * 2;
          g.moveTo(cx - raio, varredura).lineTo(cx + raio, varredura).stroke({ width: traco, color: clara, alpha: 0.6 * apagar });
        }
        break;
      }
    }
  }
}

interface Faisca {
  sprite: Sprite;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Fração do efeito em que a faísca acende. */
  acende: number;
  tamanho: number;
}

class Efeito {
  readonly raiz = new Container();
  private desenho = new Graphics();
  private faiscas: Faisca[] = [];
  private rotulo: Text | null = null;
  private inicio: number;
  private duracao: number;
  private magia: IMagiaMapa;
  private cor: number;
  private clara: number;
  private casa: number;

  constructor(magia: IMagiaMapa, casa: number, agora: number, nome?: string) {
    this.magia = magia;
    this.casa = casa;
    this.inicio = agora;
    this.duracao = DURACAO_MS[magia.forma];
    this.cor = corDoFluxo(magia.fluxo);
    this.clara = clarear(this.cor, 0.55);
    this.estilo = estiloDoFluxo(magia.fluxo);
    // Luz de magia soma: o mapa clareia na cor do Fluxo.
    this.raiz.blendMode = 'add';
    this.raiz.eventMode = 'none';
    this.raiz.addChild(this.desenho);
    this.semearFaiscas();
    if (nome) {
      this.rotulo = new Text({ text: nome, style: { fontFamily: 'system-ui, sans-serif', fontWeight: '700', fontSize: Math.max(12, casa * 0.26), fill: '#ffffff', stroke: { color: '#000000', width: 4 } } });
      this.rotulo.anchor.set(0.5, 1);
      this.rotulo.position.set(magia.x, magia.y - casa * 0.45);
      this.rotulo.blendMode = 'normal';
      this.raiz.addChild(this.rotulo);
    }
  }

  private readonly estilo: EstiloDeEfeito | null;

  /** Onde o estilo do Fluxo se move: a área da magia (o círculo, o miolo do cone, a linha, o ponto do impacto). */
  private get regiao(): Regiao {
    const { forma, x, y, ax, ay } = this.magia;
    const d = this.distancia;
    if (forma === 'circulo') return { cx: x, cy: y, raio: Math.max(this.casa * 0.6, d) };
    if (forma === 'cone') return { cx: x + Math.cos(this.angulo) * d * 0.55, cy: y + Math.sin(this.angulo) * d * 0.55, raio: Math.max(this.casa * 0.6, d * 0.45) };
    if (forma === 'linha') return { cx: (x + ax) / 2, cy: (y + ay) / 2, raio: Math.max(this.casa * 0.6, d / 2) };
    return { cx: ax, cy: ay, raio: this.casa * 1.5 };
  }

  private get distancia() {
    return Math.hypot(this.magia.ax - this.magia.x, this.magia.ay - this.magia.y);
  }

  private get angulo() {
    return Math.atan2(this.magia.ay - this.magia.y, this.magia.ax - this.magia.x);
  }

  /** Quanto do efeito é a viagem do projétil, no impacto (zero se o alvo é o próprio ponto). */
  private get viagem() {
    return this.magia.forma === 'impacto' && this.distancia > this.casa * 0.3 ? 0.3 : 0;
  }

  private semearFaiscas() {
    const { forma, x, y, ax, ay } = this.magia;
    const distancia = this.distancia;
    const angulo = this.angulo;
    const total = forma === 'linha' ? 22 : forma === 'impacto' ? 18 : 26;
    for (let i = 0; i < total; i++) {
      const sprite = new Sprite({ texture: texturaDeBrilho(), anchor: 0.5 });
      sprite.tint = Math.random() < 0.35 ? 0xffffff : Math.random() < 0.5 ? this.clara : this.cor;
      sprite.visible = false;
      this.raiz.addChild(sprite);
      let px = x;
      let py = y;
      let direcao = Math.random() * Math.PI * 2;
      let velocidade = aleatorio(0.6, 1.1) * Math.max(distancia, this.casa);
      let acende = aleatorio(0, 0.25);
      if (forma === 'cone') {
        direcao = angulo + aleatorio(-ABERTURA_CONE / 2, ABERTURA_CONE / 2);
      } else if (forma === 'linha') {
        const ao = Math.random();
        px = x + (ax - x) * ao;
        py = y + (ay - y) * ao;
        direcao = angulo + (Math.random() < 0.5 ? 1 : -1) * Math.PI / 2 + aleatorio(-0.4, 0.4);
        velocidade = aleatorio(0.3, 0.9) * this.casa;
        acende = ao * 0.15 + aleatorio(0, 0.15);
      } else if (forma === 'impacto') {
        px = ax;
        py = ay;
        velocidade = aleatorio(1, 2.4) * this.casa;
        acende = this.viagem + aleatorio(0, 0.05);
      }
      this.faiscas.push({
        sprite, x: px, y: py, vx: Math.cos(direcao) * velocidade, vy: Math.sin(direcao) * velocidade,
        acende, tamanho: aleatorio(0.12, 0.32) * this.casa,
      });
    }
  }

  /** Desenha o quadro de agora; true quando o efeito acabou. */
  quadro(agora: number): boolean {
    const t = (agora - this.inicio) / this.duracao;
    if (t >= 1) return true;
    const apagar = t < 0.72 ? 1 : 1 - (t - 0.72) / 0.28;
    const g = this.desenho;
    g.clear();
    const { forma, x, y, ax, ay } = this.magia;
    const distancia = this.distancia;
    const angulo = this.angulo;
    const casa = this.casa;

    if (forma === 'circulo') {
      const abrir = suaveSaida(Math.min(1, t / 0.25));
      const raio = distancia * abrir;
      g.circle(x, y, raio).fill({ color: this.cor, alpha: 0.22 * apagar });
      g.circle(x, y, raio).stroke({ width: casa * 0.1, color: this.clara, alpha: 0.9 * apagar });
      if (t < 0.45) {
        const onda = t / 0.45;
        g.circle(x, y, raio * (1 + 0.18 * onda)).stroke({ width: casa * 0.06, color: this.cor, alpha: (1 - onda) * 0.8 });
      }
      // Três arcos girando por dentro do círculo.
      for (let i = 0; i < 3; i++) {
        const comeco = t * 5 + (i * Math.PI * 2) / 3;
        const r = raio * (0.55 + 0.12 * i);
        g.moveTo(x + Math.cos(comeco) * r, y + Math.sin(comeco) * r).arc(x, y, r, comeco, comeco + 1.1)
          .stroke({ width: casa * 0.07, color: this.clara, alpha: 0.5 * apagar, cap: 'round' });
      }
    } else if (forma === 'cone') {
      const abrir = suaveSaida(Math.min(1, t / 0.2));
      const alcance = distancia * abrir;
      const meia = ABERTURA_CONE / 2;
      g.moveTo(x, y).arc(x, y, alcance, angulo - meia, angulo + meia).closePath()
        .fill({ color: this.cor, alpha: 0.2 * apagar }).stroke({ width: casa * 0.07, color: this.clara, alpha: 0.75 * apagar });
      // Frentes de onda correndo para fora.
      for (let i = 0; i < 3; i++) {
        const frente = ((t * 1.7 + i / 3) % 1) * alcance;
        g.moveTo(x + Math.cos(angulo - meia) * frente, y + Math.sin(angulo - meia) * frente)
          .arc(x, y, frente, angulo - meia, angulo + meia)
          .stroke({ width: casa * 0.12, color: this.clara, alpha: 0.7 * apagar * (1 - frente / Math.max(1, alcance)) });
      }
    } else if (forma === 'linha') {
      const avanco = distancia * suaveSaida(Math.min(1, t / 0.15));
      const fx = x + Math.cos(angulo) * avanco;
      const fy = y + Math.sin(angulo) * avanco;
      const tremor = 1 + 0.15 * Math.sin(t * 70);
      g.moveTo(x, y).lineTo(fx, fy).stroke({ width: casa * 0.95 * tremor, color: this.cor, alpha: 0.18 * apagar, cap: 'round' });
      g.moveTo(x, y).lineTo(fx, fy).stroke({ width: casa * 0.45 * tremor, color: this.cor, alpha: 0.45 * apagar, cap: 'round' });
      g.moveTo(x, y).lineTo(fx, fy).stroke({ width: casa * 0.12, color: this.clara, alpha: 0.95 * apagar, cap: 'round' });
    } else {
      const viagem = this.viagem;
      if (t < viagem) {
        // O projétil vai do lançador ao alvo, com um rastro.
        const ida = (t / viagem) ** 1.6;
        for (let i = 5; i >= 0; i--) {
          const atras = Math.max(0, ida - i * 0.04);
          const px = x + (ax - x) * atras;
          const py = y + (ay - y) * atras;
          g.circle(px, py, casa * (0.26 - i * 0.03)).fill({ color: i === 0 ? this.clara : this.cor, alpha: 0.85 - i * 0.13 });
        }
      } else {
        const estouro = (t - viagem) / (1 - viagem);
        g.circle(ax, ay, casa * (0.6 + 0.8 * estouro)).fill({ color: this.clara, alpha: 0.6 * (1 - estouro) });
        g.circle(ax, ay, casa * (0.3 + 2.2 * suaveSaida(estouro))).stroke({ width: casa * 0.12, color: this.cor, alpha: 1 - estouro });
      }
    }

    // O impacto só começa o estilo quando chega ao alvo.
    const comecoDoEstilo = this.magia.forma === 'impacto' ? this.viagem : 0;
    if (this.estilo && t >= comecoDoEstilo) {
      desenharEstilo(g, this.estilo, this.regiao, (t - comecoDoEstilo) / (1 - comecoDoEstilo), apagar, casa, this.cor, this.clara);
    }

    for (const faisca of this.faiscas) {
      const vida = (t - faisca.acende) / (1 - faisca.acende);
      faisca.sprite.visible = vida > 0;
      if (vida <= 0) continue;
      const andado = suaveSaida(Math.min(1, vida)) * 0.9;
      faisca.sprite.position.set(faisca.x + faisca.vx * andado, faisca.y + faisca.vy * andado);
      faisca.sprite.width = faisca.tamanho * (1 - vida * 0.6);
      faisca.sprite.height = faisca.sprite.width;
      faisca.sprite.alpha = (1 - vida) * apagar;
    }
    if (this.rotulo) this.rotulo.alpha = Math.min(1, (1 - t) * 2.5);
    return false;
  }

  destruir() {
    this.raiz.destroy({ children: true });
  }
}

export class EfeitosDeMagia {
  readonly raiz = new Container();
  private efeitos = new Set<Efeito>();

  constructor() {
    this.raiz.eventMode = 'none';
  }

  /** `nome`: quem lançou, quando veio de outra pessoa. */
  lancar(magia: IMagiaMapa, casa: number, nome?: string) {
    const efeito = new Efeito(magia, Math.max(10, casa), performance.now(), nome);
    this.efeitos.add(efeito);
    this.raiz.addChild(efeito.raiz);
  }

  quadro(agora: number) {
    for (const efeito of this.efeitos) {
      if (!efeito.quadro(agora)) continue;
      this.efeitos.delete(efeito);
      efeito.destruir();
    }
  }

  destruir() {
    for (const efeito of this.efeitos) efeito.destruir();
    this.efeitos.clear();
  }
}
