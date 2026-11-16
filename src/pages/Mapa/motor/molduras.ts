// Molduras dos tokens. Só existem duas coisas: a moldura ilustrada (imagens em
// public/assets/img/molduras, sem fundo) e "Sem borda". Sem escolha, o token usa
// o aro simples na cor do lado (Jogador, Aliado, Inimigo, Neutro), que é o que
// diz de que lado cada um está. As molduras desenhadas em código (Ferro, Ouro,
// Runa, as dos Fluxos e a escada do nível) saíram do mapa em 2026-11-14.
// A lista de ids aceitos é a mesma do servidor (MOLDURAS em plataforma/core/mapa.py).

import type { LadoToken } from '../../../services/mapaApi';
import artesJson from './molduras-arte.json';

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

export const NOMES_FLUXO: Record<FluxoId, string> = {
  origem: 'Gênese', essencia: 'Alétheia', comunicacao: 'Parley', vitalidade: 'Anima', inconstancia: 'Vórtice',
  fisico: 'Baluarte', espaco: 'Matriz', tempo: 'Éon', vazio: 'O Vazio', fim: 'Limiar', tecnologia: 'A.X.I.S',
};

/** Os onze Fluxos na ordem do catálogo, para as listas de magia e de clima do mapa. */
export const FLUXOS_DO_MAPA: Array<{ id: FluxoId; rotulo: string }> = (Object.keys(CORES_FLUXO) as FluxoId[])
  .map((id) => ({ id, rotulo: NOMES_FLUXO[id] }));

export const CORES_LADO: Record<LadoToken, string> = {
  jogador: '#4fd1c5',
  aliado: '#34d399',
  inimigo: '#ef4444',
  neutro: '#a0a0b8',
};

export interface IMolduraCatalogo {
  id: string;
  rotulo: string;
  grupo: 'padrao' | 'arte';
}

/** Molduras ilustradas (imagens em public/assets/img/molduras, sem fundo). `escala` é o tamanho da
 * imagem em relação ao quadro de 1,3 token: o furo de cada uma já vem alinhado ao retrato, e as
 * que têm chifres, asas ou espinhos largos pedem um quadro maior (escala acima de 1). */
interface IMolduraDeArte { id: string; rotulo: string; arquivo: string; escala: number; dx?: number; dy?: number }
const ARTE: IMolduraDeArte[] = artesJson;
const ARTE_POR_ID = new Map(ARTE.map((a) => [a.id, a]));

export const ehMolduraDeArte = (id: string) => ARTE_POR_ID.has(id);
export const escalaDaMolduraDeArte = (id: string) => ARTE_POR_ID.get(id)?.escala ?? 1;
/** Quanto a imagem sobe ou desce (e vai para os lados), como fração do lado dela, para o furo cair no centro do retrato. */
export const deslocamentoDaMolduraDeArte = (id: string): { dx: number; dy: number } => {
  const arte = ARTE_POR_ID.get(id);
  return { dx: arte?.dx ?? 0, dy: arte?.dy ?? 0 };
};

const imagensDeArte = new Map<string, HTMLImageElement>();
const carregandoArte = new Map<string, Promise<HTMLImageElement | null>>();

/** A imagem da moldura, se já chegou. */
export const molduraDeArteCarregada = (id: string): HTMLImageElement | null => imagensDeArte.get(id) ?? null;

/** Baixa a imagem da moldura (uma vez só). Devolve null se não existir ou falhar. */
export function carregarMolduraDeArte(id: string): Promise<HTMLImageElement | null> {
  const arte = ARTE_POR_ID.get(id);
  if (!arte || typeof Image === 'undefined') return Promise.resolve(null);
  const pronta = imagensDeArte.get(id);
  if (pronta) return Promise.resolve(pronta);
  let espera = carregandoArte.get(id);
  if (!espera) {
    espera = new Promise<HTMLImageElement | null>((resolver) => {
      const imagem = new Image();
      imagem.onload = () => {
        imagensDeArte.set(id, imagem);
        resolver(imagem);
      };
      imagem.onerror = () => {
        carregandoArte.delete(id);
        resolver(null);
      };
      imagem.src = `/assets/img/molduras/${arte.arquivo}`;
    });
    carregandoArte.set(id, espera);
  }
  return espera;
}

export interface FuroDaMoldura {
  /** A imagem da moldura inteira (mesmo alinhamento dela): opaco onde é furo, transparente onde é tinta ou fora. */
  mascara: HTMLCanvasElement;
  /** Distância do centro do retrato ao ponto mais longe do furo, como fração do lado da imagem. */
  raioMax: number;
}

const furosDeArte = new Map<string, FuroDaMoldura | null>();
const LADO_DA_MASCARA = 256;

/**
 * O furo de uma moldura ilustrada, medido na própria imagem: o que se enche a partir do centro do retrato sem
 * passar por tinta. Molduras irregulares (tinta, pincelada) deixavam o retrato redondo curto em cima e dos lados;
 * com a máscara a foto preenche o furo inteiro e a moldura, por cima, fecha a borda. Nulo se a moldura ainda não
 * chegou ou se o furo vaza para fora (aí o retrato fica redondo, como antes).
 */
export function furoDaMolduraDeArte(id: string): FuroDaMoldura | null {
  if (furosDeArte.has(id)) return furosDeArte.get(id) ?? null;
  const imagem = molduraDeArteCarregada(id);
  if (!imagem || typeof document === 'undefined') return null;
  const n = LADO_DA_MASCARA;
  const tela = document.createElement('canvas');
  tela.width = n;
  tela.height = n;
  const ctx = tela.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(imagem, 0, 0, n, n);
  const pixels = ctx.getImageData(0, 0, n, n).data;
  const { dx, dy } = deslocamentoDaMolduraDeArte(id);
  const cx = Math.round(n * (0.5 - dx));
  const cy = Math.round(n * (0.5 - dy));
  const livre = (x: number, y: number) => pixels[(y * n + x) * 4 + 3] < 80;
  let furo: Uint8Array | null = null;
  if (cx >= 0 && cy >= 0 && cx < n && cy < n && livre(cx, cy)) {
    furo = new Uint8Array(n * n);
    const fila = [cy * n + cx];
    furo[cy * n + cx] = 1;
    let vazou = false;
    while (fila.length) {
      const atual = fila.pop()!;
      const x = atual % n;
      const y = (atual - x) / n;
      if (x === 0 || y === 0 || x === n - 1 || y === n - 1) { vazou = true; break; }
      for (const [vx, vy] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
        const i = vy * n + vx;
        if (!furo[i] && livre(vx, vy)) { furo[i] = 1; fila.push(i); }
      }
    }
    if (vazou) furo = null;
  }
  let resultado: FuroDaMoldura | null = null;
  if (furo) {
    // Alarga 2 px: a foto passa um pouco por baixo da tinta, sem frestas na borda.
    for (let volta = 0; volta < 2; volta++) {
      const copia = furo.slice();
      for (let y = 1; y < n - 1; y++) {
        for (let x = 1; x < n - 1; x++) {
          const i = y * n + x;
          if (!copia[i] && (copia[i - 1] || copia[i + 1] || copia[i - n] || copia[i + n])) furo[i] = 1;
        }
      }
    }
    const saida = ctx.createImageData(n, n);
    let maisLonge = 0;
    for (let i = 0; i < n * n; i++) {
      if (!furo[i]) continue;
      saida.data[i * 4] = 255;
      saida.data[i * 4 + 1] = 255;
      saida.data[i * 4 + 2] = 255;
      saida.data[i * 4 + 3] = 255;
      const x = i % n;
      const y = (i - x) / n;
      maisLonge = Math.max(maisLonge, Math.hypot(x - cx, y - cy));
    }
    ctx.putImageData(saida, 0, 0);
    // Um furo maior que isso é suspeito (anel aberto): melhor o retrato redondo de sempre.
    if (maisLonge / n < 0.42) resultado = { mascara: tela, raioMax: maisLonge / n };
  }
  furosDeArte.set(id, resultado);
  return resultado;
}

/** O que a gente escolhe na tela: "Sem borda" e as molduras ilustradas. */
export const MOLDURAS: IMolduraCatalogo[] = [
  { id: 'nenhuma', rotulo: 'Sem borda', grupo: 'padrao' },
  ...ARTE.map((a) => ({ id: a.id, rotulo: a.rotulo, grupo: 'arte' as const })),
];

/** Raio do retrato e espessura do aro, como fração do lado do quadro desenhado.
 * O quadro é 1,3 vez o token, para os enfeites poderem passar da borda. */
export const ESCALA_QUADRO = 1.3;
export const RAIO_RETRATO = 0.32;
const ESPESSURA = 0.06;

type Contexto = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

export interface OpcoesMoldura {
  id: string;
  lado: LadoToken;
}

function anel(ctx: Contexto, c: number, r: number, largura: number, cor: string) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(c, c, r, 0, Math.PI * 2);
  ctx.lineWidth = largura;
  ctx.strokeStyle = cor;
  ctx.stroke();
  ctx.restore();
}

/** Desenha a moldura num quadro de lado `s`, com o retrato centrado de raio `s * RAIO_RETRATO`. */
export function desenharMoldura(ctx: Contexto, s: number, { id, lado }: OpcoesMoldura) {
  const c = s / 2;
  const r = s * RAIO_RETRATO;
  const e = s * ESPESSURA;

  // Sem borda: o quadro fica vazio e só o retrato aparece.
  if (id === 'nenhuma') return;

  // Moldura ilustrada: a imagem já vem com o furo alinhado ao retrato. Se ainda não chegou, o quadro fica vazio.
  if (ehMolduraDeArte(id)) {
    const imagem = molduraDeArteCarregada(id);
    if (imagem) {
      const lado_ = s * escalaDaMolduraDeArte(id);
      const { dx, dy } = deslocamentoDaMolduraDeArte(id);
      ctx.drawImage(imagem, c - lado_ / 2 + dx * lado_, c - lado_ / 2 + dy * lado_, lado_, lado_);
    }
    return;
  }

  // O aro simples na cor do lado: o padrão, e para onde cai um id de moldura que saiu do catálogo.
  anel(ctx, c, r + e / 2, e, CORES_LADO[lado]);
  anel(ctx, c, r + e, Math.max(1, e * 0.2), 'rgba(11, 11, 16, 0.8)');
}


export interface Enquadramento {
  zoom: number;
  x: number;
  y: number;
  /** "livre": a arte inteira, sem círculo nem moldura (ver formatoToken.ts). Ausente: redondo. */
  formato?: 'livre';
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
