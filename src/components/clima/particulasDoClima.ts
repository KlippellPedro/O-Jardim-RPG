/** Simulação e desenho das partículas do clima (pétalas, folhas, neve, vaga-lumes, brasas).
 * Posição em fração da tela (0 a 1), então redimensionar a janela não desmonta nada. */

import type { CorRgb, EspecificacaoDeParticula, TipoDeParticula } from './climaDoMundo';

export interface Particula {
  tipo: TipoDeParticula;
  x: number;
  y: number;
  tam: number;
  /** Velocidade principal, em alturas de tela por segundo (queda, subida ou deriva). */
  vel: number;
  /** Fase própria do balanço, do giro e do pulso. */
  fase: number;
  giro: number;
  velGiro: number;
  cor: CorRgb;
  alfa: number;
  /** 0 a 1: aparece e some suavemente na troca de estação. */
  vida: number;
  morrendo: boolean;
}

export type Aleatorio = () => number;

const entre = (aleatorio: Aleatorio, minimo: number, maximo: number) => minimo + aleatorio() * (maximo - minimo);

/** Cria uma partícula; `inicial` espalha pela tela toda (a primeira carga), senão ela nasce na borda de entrada. */
export function criarParticula(spec: EspecificacaoDeParticula, aleatorio: Aleatorio, inicial: boolean): Particula {
  const sobe = spec.tipo === 'brasa';
  const flutua = spec.tipo === 'vagalume';
  const x = aleatorio();
  const y = inicial || flutua ? aleatorio() : (sobe ? 1.05 : -0.05);
  return {
    tipo: spec.tipo,
    x,
    y,
    tam: entre(aleatorio, spec.tamanho[0], spec.tamanho[1]),
    vel: entre(aleatorio, spec.velocidade[0], spec.velocidade[1]),
    fase: aleatorio() * Math.PI * 2,
    giro: aleatorio() * Math.PI * 2,
    velGiro: entre(aleatorio, -1.4, 1.4),
    cor: spec.cores[Math.floor(aleatorio() * spec.cores.length) % spec.cores.length],
    alfa: entre(aleatorio, spec.alfa[0], spec.alfa[1]),
    vida: 0,
    morrendo: false,
  };
}

const FOLGA = 0.06;

/** Avança a partícula `dt` segundos. `tempo` é o relógio em milissegundos (para o balanço e o pulso). */
export function avancarParticula(particula: Particula, dt: number, tempo: number, aleatorio: Aleatorio): void {
  const { tipo } = particula;
  if (tipo === 'vagalume') {
    particula.x += Math.sin(tempo * 0.0004 + particula.fase) * particula.vel * dt * 3;
    particula.y += Math.cos(tempo * 0.0003 + particula.fase * 1.7) * particula.vel * dt * 2;
    if (particula.x < -FOLGA) particula.x = 1 + FOLGA;
    else if (particula.x > 1 + FOLGA) particula.x = -FOLGA;
    if (particula.y < -FOLGA) particula.y = 1 + FOLGA;
    else if (particula.y > 1 + FOLGA) particula.y = -FOLGA;
  } else if (tipo === 'brasa') {
    particula.y -= particula.vel * dt;
    particula.x += Math.sin(tempo * 0.0011 + particula.fase) * 0.01 * dt;
    if (particula.y < -FOLGA && !particula.morrendo) {
      particula.y = 1 + FOLGA;
      particula.x = aleatorio();
    }
  } else {
    // Pétala, folha e neve caem balançando de um lado para o outro.
    const balanco = tipo === 'folha' ? 0.035 : tipo === 'petala' ? 0.025 : 0.012;
    particula.y += particula.vel * dt;
    particula.x += Math.sin(tempo * 0.0009 + particula.fase) * balanco * dt;
    particula.giro += particula.velGiro * dt;
    if (particula.y > 1 + FOLGA && !particula.morrendo) {
      particula.y = -FOLGA;
      particula.x = aleatorio();
    }
  }
  if (particula.x < -0.2) particula.x = 1.1;
  else if (particula.x > 1.2) particula.x = -0.1;
}

/** Faz a vida da partícula caminhar para 1 (entrando) ou 0 (saindo), em cerca de um segundo. */
export function avancarVida(particula: Particula, dt: number): void {
  const alvo = particula.morrendo ? 0 : 1;
  particula.vida += (alvo - particula.vida) * Math.min(1, dt * 1.8);
  if (Math.abs(alvo - particula.vida) < 0.01) particula.vida = alvo;
}

export const rgba = (cor: CorRgb, alfa: number) => `rgba(${cor[0]}, ${cor[1]}, ${cor[2]}, ${Math.max(0, Math.min(1, alfa)).toFixed(3)})`;

export function desenharParticula(
  contexto: CanvasRenderingContext2D,
  particula: Particula,
  largura: number,
  altura: number,
  tempo: number,
): void {
  const alfaFinal = particula.alfa * particula.vida;
  if (alfaFinal <= 0.01) return;
  const px = particula.x * largura;
  const py = particula.y * altura;
  const { tam, cor } = particula;

  switch (particula.tipo) {
    case 'petala': {
      contexto.save();
      contexto.translate(px, py);
      contexto.rotate(particula.giro);
      contexto.fillStyle = rgba(cor, alfaFinal);
      contexto.beginPath();
      contexto.ellipse(0, 0, tam * 1.1, tam * 0.55, 0, 0, Math.PI * 2);
      contexto.fill();
      contexto.restore();
      break;
    }
    case 'folha': {
      contexto.save();
      contexto.translate(px, py);
      contexto.rotate(particula.giro);
      contexto.fillStyle = rgba(cor, alfaFinal);
      contexto.beginPath();
      contexto.moveTo(-tam, 0);
      contexto.quadraticCurveTo(0, -tam * 0.9, tam, 0);
      contexto.quadraticCurveTo(0, tam * 0.9, -tam, 0);
      contexto.fill();
      contexto.strokeStyle = rgba(cor, alfaFinal * 0.5);
      contexto.lineWidth = 0.6;
      contexto.beginPath();
      contexto.moveTo(-tam, 0);
      contexto.lineTo(tam * 0.8, 0);
      contexto.stroke();
      contexto.restore();
      break;
    }
    case 'neve': {
      contexto.fillStyle = rgba(cor, alfaFinal);
      contexto.beginPath();
      contexto.arc(px, py, tam * 0.5, 0, Math.PI * 2);
      contexto.fill();
      if (tam > 2.2) {
        contexto.fillStyle = rgba(cor, alfaFinal * 0.16);
        contexto.beginPath();
        contexto.arc(px, py, tam * 1.3, 0, Math.PI * 2);
        contexto.fill();
      }
      break;
    }
    case 'vagalume':
    case 'brasa': {
      const pulso = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(tempo * (particula.tipo === 'brasa' ? 0.006 : 0.002) + particula.fase));
      contexto.fillStyle = rgba(cor, alfaFinal * 0.14 * pulso);
      contexto.beginPath();
      contexto.arc(px, py, tam * 4, 0, Math.PI * 2);
      contexto.fill();
      contexto.fillStyle = rgba(cor, alfaFinal * pulso);
      contexto.beginPath();
      contexto.arc(px, py, tam * 0.55, 0, Math.PI * 2);
      contexto.fill();
      break;
    }
    default:
      break;
  }
}
