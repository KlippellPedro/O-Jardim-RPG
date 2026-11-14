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
