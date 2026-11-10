// Molduras dos tokens, desenhadas por nós em Canvas 2D (nenhuma arte de
// terceiros). O mesmo desenho serve à prévia da Oficina e vira textura no mapa.
// A lista de nomes é a mesma do servidor (MOLDURAS em plataforma/core/mapa.py).

import { molduraDoRetrato, type FormaJoia } from '../../Ficha/utils/retrato';
import type { LadoToken } from '../../../services/mapaApi';

export type FluxoId = 'origem' | 'essencia' | 'comunicacao' | 'vitalidade' | 'inconstancia'
  | 'fisico' | 'espaco' | 'tempo' | 'vazio' | 'fim' | 'tecnologia';

/** Cor de destaque de cada Fluxo. A fonte da verdade é FLUXO_TEMAS (src/services/magiaService.ts);
 * aquele módulo puxa os catálogos inteiros, então a cor é repetida aqui e um teste trava as duas. */
export const CORES_FLUXO: Record<FluxoId, string> = {
  origem: '#ef9fbe',
  essencia: '#f0dc78',
  comunicacao: '#dce1e7',
  vitalidade: '#79d17f',
  inconstancia: '#f39555',
  fisico: '#b48258',
  espaco: '#ad7de1',
  tempo: '#cfad63',
  vazio: '#77707f',
  fim: '#d24b66',
  tecnologia: '#70edfa',
};

const NOMES_FLUXO: Record<FluxoId, string> = {
  origem: 'Gênese', essencia: 'Alétheia', comunicacao: 'Parley', vitalidade: 'Anima', inconstancia: 'Vórtice',
  fisico: 'Baluarte', espaco: 'Matriz', tempo: 'Éon', vazio: 'O Vazio', fim: 'Limiar', tecnologia: 'A.X.I.S',
};

export const CORES_LADO: Record<LadoToken, string> = {
  jogador: '#4fd1c5',
  aliado: '#34d399',
  inimigo: '#ef4444',
  neutro: '#a0a0b8',
};

export interface IMolduraCatalogo {
  id: string;
  rotulo: string;
  grupo: 'padrao' | 'material' | 'fluxo';
}

export const MOLDURAS: IMolduraCatalogo[] = [
  { id: 'nivel', rotulo: 'Do nível', grupo: 'padrao' },
  { id: 'lado', rotulo: 'Simples', grupo: 'padrao' },
  { id: 'nenhuma', rotulo: 'Sem borda', grupo: 'padrao' },
  { id: 'ferro', rotulo: 'Ferro', grupo: 'material' },
  { id: 'ouro', rotulo: 'Ouro', grupo: 'material' },
  { id: 'madeira', rotulo: 'Madeira', grupo: 'material' },
  { id: 'osso', rotulo: 'Osso', grupo: 'material' },
  { id: 'runa', rotulo: 'Runa', grupo: 'material' },
  { id: 'cristal', rotulo: 'Cristal', grupo: 'material' },
  { id: 'raiz', rotulo: 'Raiz', grupo: 'material' },
  { id: 'sombra', rotulo: 'Sombra', grupo: 'material' },
  ...(Object.keys(CORES_FLUXO) as FluxoId[]).map((fluxo) => ({ id: `fluxo-${fluxo}`, rotulo: NOMES_FLUXO[fluxo], grupo: 'fluxo' as const })),
];

/** Raio do retrato e espessura do aro, como fração do lado do quadro desenhado.
 * O quadro é 1,3 vez o token, para os enfeites poderem passar da borda. */
export const ESCALA_QUADRO = 1.3;
export const RAIO_RETRATO = 0.32;
const ESPESSURA = 0.06;

type Contexto = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

export interface OpcoesMoldura {
  id: string;
  nivel: number | null;
  lado: LadoToken;
}

function anel(ctx: Contexto, c: number, r: number, largura: number, cor: string | CanvasGradient, brilho?: string, desfoque = 0) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(c, c, r, 0, Math.PI * 2);
  ctx.lineWidth = largura;
  ctx.strokeStyle = cor;
  if (brilho) {
    ctx.shadowColor = brilho;
    ctx.shadowBlur = desfoque;
  }
  ctx.stroke();
  ctx.restore();
}

function gradiente(ctx: Contexto, s: number, cores: string[]): CanvasGradient {
  const g = ctx.createLinearGradient(0, 0, s, s);
  cores.forEach((cor, i) => g.addColorStop(i / Math.max(1, cores.length - 1), cor));
  return g;
}

function joia(ctx: Contexto, forma: FormaJoia, x: number, y: number, r: number, cor: string) {
  ctx.save();
  ctx.beginPath();
  if (forma === 'circulo') {
    ctx.arc(x, y, r * 0.8, 0, Math.PI * 2);
  } else if (forma === 'estrela') {
    for (let i = 0; i < 10; i++) {
      const raio = i % 2 === 0 ? r * 1.15 : r * 0.5;
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      ctx.lineTo(x + Math.cos(a) * raio, y + Math.sin(a) * raio);
    }
  } else if (forma === 'hexagono') {
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 6 + (i * Math.PI) / 3;
      ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    }
  } else if (forma === 'cruz') {
    ctx.rect(x - r * 0.3, y - r, r * 0.6, r * 2);
    ctx.rect(x - r, y - r * 0.3, r * 2, r * 0.6);
  } else {
    ctx.moveTo(x, y - r);
    ctx.lineTo(x + r * 0.75, y);
    ctx.lineTo(x, y + r);
    ctx.lineTo(x - r * 0.75, y);
  }
  ctx.closePath();
  ctx.fillStyle = cor;
  ctx.fill();
  ctx.lineWidth = Math.max(1, r * 0.25);
  ctx.strokeStyle = '#120e18';
  ctx.stroke();
  ctx.restore();
}

/** Pontos em volta do aro, começando no alto. */
function emVolta(quantos: number, inicio = -Math.PI / 2): number[] {
  return Array.from({ length: quantos }, (_, i) => inicio + (i * Math.PI * 2) / quantos);
}

// Mesma ordem das joias do retrato da ficha: cantos, depois o meio de cada lado.
const ANGULOS_JOIAS = [-135, -45, 135, 45, -90, 90, 180, 0].map((g) => (g * Math.PI) / 180);

/** Desenha a moldura num quadro de lado `s`, com o retrato centrado de raio `s * RAIO_RETRATO`. */
export function desenharMoldura(ctx: Contexto, s: number, { id, nivel, lado }: OpcoesMoldura) {
  const c = s / 2;
  const r = s * RAIO_RETRATO;
  const e = s * ESPESSURA;
  const corLado = CORES_LADO[lado];
  const meio = r + e / 2;
  const fioDoLado = () => anel(ctx, c, r - e * 0.15, Math.max(1, e * 0.22), corLado);

  // Sem borda: o quadro fica vazio e só o retrato aparece.
  if (id === 'nenhuma') return;

  if (id === 'lado' || (id === 'nivel' && nivel === null)) {
    anel(ctx, c, meio, e, corLado);
    anel(ctx, c, r + e, Math.max(1, e * 0.2), 'rgba(11, 11, 16, 0.8)');
    return;
  }

  if (id === 'nivel') {
    const estilo = molduraDoRetrato(nivel ?? 1);
    anel(ctx, c, r + e * 1.5, e * 0.9, estilo.brilho, estilo.brilho, e * 1.5);
    anel(ctx, c, meio, e, gradiente(ctx, s, [estilo.fio, estilo.fio2, estilo.fio]));
    anel(ctx, c, r + e * 0.05, Math.max(1, e * 0.3), estilo.fio2);
    if (estilo.aro) anel(ctx, c, r + e * 1.3, Math.max(1, e * 0.28), estilo.fio2);
    for (let i = 0; i < estilo.aroExtra; i++) anel(ctx, c, r + e * (1.8 + i * 0.45), Math.max(1, e * 0.22), estilo.fio);
    fioDoLado();
    ANGULOS_JOIAS.slice(0, estilo.joias).forEach((a) => joia(ctx, estilo.forma, c + Math.cos(a) * meio, c + Math.sin(a) * meio, e * 0.9, estilo.fio2));
    return;
  }

  if (id.startsWith('fluxo-')) {
    const cor = CORES_FLUXO[id.slice('fluxo-'.length) as FluxoId] ?? '#ffffff';
    anel(ctx, c, r + e * 1.4, e * 0.7, cor, cor, e * 2.2);
    anel(ctx, c, meio, e * 1.1, gradiente(ctx, s, [cor, '#1a1622', cor]));
    anel(ctx, c, r + e * 1.15, Math.max(1, e * 0.18), cor);
    fioDoLado();
    emVolta(4, -Math.PI / 4).forEach((a) => joia(ctx, 'losango', c + Math.cos(a) * meio, c + Math.sin(a) * meio, e * 0.85, cor));
    emVolta(4).forEach((a) => joia(ctx, 'circulo', c + Math.cos(a) * meio, c + Math.sin(a) * meio, e * 0.45, '#ffffff'));
    return;
  }

  switch (id) {
    case 'ferro':
      anel(ctx, c, meio, e * 1.2, gradiente(ctx, s, ['#c4ccd6', '#5a616b', '#9aa3ad', '#40454d']));
      anel(ctx, c, r + e * 1.25, Math.max(1, e * 0.2), '#2a2e34');
      fioDoLado();
      for (const a of emVolta(10)) {
        const x = c + Math.cos(a) * meio;
        const y = c + Math.sin(a) * meio;
        ctx.beginPath();
        ctx.arc(x, y, e * 0.28, 0, Math.PI * 2);
        ctx.fillStyle = '#d8dee6';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + e * 0.08, y + e * 0.08, e * 0.18, 0, Math.PI * 2);
        ctx.fillStyle = '#3b4048';
        ctx.fill();
      }
      return;
    case 'ouro':
      anel(ctx, c, r + e * 1.5, e * 0.6, 'rgba(255, 214, 102, 0.55)', 'rgba(255, 200, 80, 0.8)', e * 1.4);
      anel(ctx, c, meio, e * 1.15, gradiente(ctx, s, ['#fff1b3', '#b8862b', '#f6d26b', '#8a5f14']));
      anel(ctx, c, r + e * 1.2, Math.max(1, e * 0.25), '#f6d26b');
      fioDoLado();
      emVolta(4, -Math.PI / 4).forEach((a) => joia(ctx, 'losango', c + Math.cos(a) * meio, c + Math.sin(a) * meio, e * 0.95, '#d42f4a'));
      emVolta(4).forEach((a) => joia(ctx, 'circulo', c + Math.cos(a) * meio, c + Math.sin(a) * meio, e * 0.5, '#4aa3ff'));
      return;
    case 'madeira': {
      anel(ctx, c, meio, e * 1.4, gradiente(ctx, s, ['#a06a35', '#5c3a1a', '#8b5a2b', '#4a2e14']));
      ctx.save();
      ctx.strokeStyle = 'rgba(40, 22, 8, 0.65)';
      ctx.lineWidth = Math.max(1, e * 0.12);
      emVolta(14).forEach((a, i) => {
        ctx.beginPath();
        ctx.arc(c, c, meio + (i % 3 - 1) * e * 0.35, a, a + 0.28);
        ctx.stroke();
      });
      ctx.restore();
      fioDoLado();
      emVolta(2, -Math.PI / 2).forEach((a) => joia(ctx, 'circulo', c + Math.cos(a) * meio, c + Math.sin(a) * meio, e * 0.4, '#7d7f86'));
      return;
    }
    case 'osso': {
      anel(ctx, c, meio, e * 1.2, gradiente(ctx, s, ['#f4ecd8', '#b9ad92', '#e8e0cc']));
      ctx.save();
      ctx.fillStyle = '#8f846d';
      for (const a of emVolta(16)) {
        const x = c + Math.cos(a) * (meio + e * 0.62);
        const y = c + Math.sin(a) * (meio + e * 0.62);
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(a) * e * 0.5, y + Math.sin(a) * e * 0.5);
        ctx.lineTo(x + Math.cos(a + Math.PI / 2) * e * 0.22, y + Math.sin(a + Math.PI / 2) * e * 0.22);
        ctx.lineTo(x - Math.cos(a + Math.PI / 2) * e * 0.22, y - Math.sin(a + Math.PI / 2) * e * 0.22);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
      fioDoLado();
      return;
    }
    case 'runa': {
      anel(ctx, c, meio, e * 1.4, gradiente(ctx, s, ['#4a505c', '#262a32', '#3a3f4a']));
      ctx.save();
      ctx.strokeStyle = '#7ef9ff';
      ctx.shadowColor = '#3fd8ff';
      ctx.shadowBlur = e * 1.2;
      ctx.lineWidth = Math.max(1, e * 0.16);
      emVolta(12).forEach((a, i) => {
        const x = c + Math.cos(a) * meio;
        const y = c + Math.sin(a) * meio;
        const t = e * 0.35;
        ctx.beginPath();
        // Três traços diferentes, alternados, para parecer escrita.
        if (i % 3 === 0) { ctx.moveTo(x - t, y - t); ctx.lineTo(x + t, y + t); ctx.moveTo(x, y - t); ctx.lineTo(x, y + t); }
        else if (i % 3 === 1) { ctx.moveTo(x - t, y + t); ctx.lineTo(x, y - t); ctx.lineTo(x + t, y + t); }
        else { ctx.moveTo(x - t, y); ctx.lineTo(x + t, y); ctx.moveTo(x - t * 0.5, y - t); ctx.lineTo(x - t * 0.5, y + t); }
        ctx.stroke();
      });
      ctx.restore();
      fioDoLado();
      return;
    }
    case 'cristal': {
      const lados = 12;
      for (let i = 0; i < lados; i++) {
        const a0 = -Math.PI / 2 + (i * Math.PI * 2) / lados;
        const a1 = a0 + (Math.PI * 2) / lados;
        ctx.beginPath();
        ctx.moveTo(c + Math.cos(a0) * r, c + Math.sin(a0) * r);
        ctx.lineTo(c + Math.cos(a0) * (r + e * 1.5), c + Math.sin(a0) * (r + e * 1.5));
        ctx.lineTo(c + Math.cos(a1) * (r + e * 1.5), c + Math.sin(a1) * (r + e * 1.5));
        ctx.lineTo(c + Math.cos(a1) * r, c + Math.sin(a1) * r);
        ctx.closePath();
        ctx.fillStyle = i % 2 === 0 ? '#bff6ff' : '#58c7e6';
        ctx.globalAlpha = 0.9;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = '#e9feff';
        ctx.lineWidth = Math.max(1, e * 0.08);
        ctx.stroke();
      }
      anel(ctx, c, r + e * 1.6, e * 0.4, 'rgba(191, 246, 255, 0.4)', '#9ff0ff', e * 1.6);
      fioDoLado();
      return;
    }
    case 'raiz': {
      anel(ctx, c, meio, e * 1.1, gradiente(ctx, s, ['#6b5233', '#3b2c18', '#5a4426']));
      ctx.save();
      emVolta(9).forEach((a, i) => {
        const x = c + Math.cos(a) * (meio + e * 0.4);
        const y = c + Math.sin(a) * (meio + e * 0.4);
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(a + (i % 2 === 0 ? 0.6 : -0.6));
        ctx.beginPath();
        ctx.ellipse(e * 0.5, 0, e * 0.75, e * 0.32, 0, 0, Math.PI * 2);
        ctx.fillStyle = i % 2 === 0 ? '#5fae4a' : '#3f8a3a';
        ctx.fill();
        ctx.restore();
      });
      ctx.restore();
      fioDoLado();
      return;
    }
    case 'sombra':
      anel(ctx, c, r + e * 1.3, e * 1.2, 'rgba(98, 40, 160, 0.55)', '#7b3fbf', e * 3);
      anel(ctx, c, meio, e * 1.1, gradiente(ctx, s, ['#2a1840', '#05040a', '#1c1030']));
      anel(ctx, c, r + e * 1.05, Math.max(1, e * 0.15), '#b98cf0');
      fioDoLado();
      return;
    default:
      anel(ctx, c, meio, e, corLado);
  }
}

export interface Enquadramento {
  zoom: number;
  x: number;
  y: number;
}

export const ENQUADRAMENTO_PADRAO: Enquadramento = { zoom: 1, x: 0, y: 0 };

/** Desenha a foto recortada em círculo no quadro, com zoom e deslocamento (fração do raio). */
export function desenharRetrato(ctx: Contexto, s: number, imagem: CanvasImageSource & { width: number; height: number }, enquadramento: Enquadramento = ENQUADRAMENTO_PADRAO, raio = s / 2) {
  const c = s / 2;
  ctx.save();
  ctx.beginPath();
  ctx.arc(c, c, raio, 0, Math.PI * 2);
  ctx.clip();
  const escala = ((raio * 2) / Math.min(imagem.width, imagem.height)) * enquadramento.zoom;
  const w = imagem.width * escala;
  const h = imagem.height * escala;
  ctx.drawImage(imagem, c - w / 2 + enquadramento.x * raio, c - h / 2 + enquadramento.y * raio, w, h);
  ctx.restore();
}
