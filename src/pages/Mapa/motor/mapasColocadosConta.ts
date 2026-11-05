// Contas dos mapas colocados na cena, sem o motor (testáveis): onde cada um está, qual fica sob
// o clique, que canto foi agarrado, mover (com encaixe na grade) e mudar de tamanho puxando um
// canto, e a largura em casas da grade.

import type { IMapaColocado } from '../../../services/mapaApi';
import type { IGrade, IPonto } from './geometria';

export const ESCALA_MINIMA_MAPA = 0.05;
export const ESCALA_MAXIMA_MAPA = 20;
/** Lado da área de agarrar um canto, em pixels de tela. */
export const AGARRE_DO_CANTO_PX = 14;

export type Canto = 'no' | 'ne' | 'so' | 'se';
type Medidas = Pick<IMapaColocado, 'x' | 'y' | 'escala' | 'largura' | 'altura'>;

export interface Retangulo {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** O retângulo que o mapa ocupa na cena, já com a escala. */
export function retanguloDoMapa(mapa: Medidas): Retangulo {
  return { x: mapa.x, y: mapa.y, w: mapa.largura * mapa.escala, h: mapa.altura * mapa.escala };
}

const dentro = (r: Retangulo, ponto: IPonto) => ponto.x >= r.x && ponto.x <= r.x + r.w && ponto.y >= r.y && ponto.y <= r.y + r.h;

/** O mapa de cima entre os que contêm o ponto (a lista vai de baixo para cima). */
export function acharMapaEm(mapas: Array<Medidas & { id: string }>, ponto: IPonto): string | null {
  for (let i = mapas.length - 1; i >= 0; i--) {
    if (dentro(retanguloDoMapa(mapas[i]), ponto)) return mapas[i].id;
  }
  return null;
}

function pontoDoCanto(r: Retangulo, canto: Canto): IPonto {
  return { x: canto === 'no' || canto === 'so' ? r.x : r.x + r.w, y: canto === 'no' || canto === 'ne' ? r.y : r.y + r.h };
}

const OPOSTO: Record<Canto, Canto> = { no: 'se', se: 'no', ne: 'so', so: 'ne' };

/** O canto agarrado, se o ponto cai perto de um (a área é em pixels de tela, `zoom` é a escala da tela). */
export function acharCanto(mapa: Medidas, ponto: IPonto, zoom: number): Canto | null {
  const r = retanguloDoMapa(mapa);
  const alcance = AGARRE_DO_CANTO_PX / Math.max(zoom, 0.001);
  const cantos: Canto[] = ['se', 'ne', 'so', 'no'];
  for (const canto of cantos) {
    const c = pontoDoCanto(r, canto);
    if (Math.abs(ponto.x - c.x) <= alcance && Math.abs(ponto.y - c.y) <= alcance) return canto;
  }
  return null;
}

/** Encaixa o canto de cima à esquerda numa linha da grade quadrada. Outras grades deixam como está. */
export function encaixarCantoNaGrade(x: number, y: number, grade: Pick<IGrade, 'tipo' | 'tamanho' | 'x' | 'y'>): IPonto {
  if (grade.tipo !== 'quadrada' || grade.tamanho <= 0) return { x, y };
  const linha = (valor: number, origem: number) => Math.round((valor - origem) / grade.tamanho) * grade.tamanho + origem;
  return { x: linha(x, grade.x), y: linha(y, grade.y) };
}

const limitar = (valor: number, minimo: number, maximo: number) => Math.min(maximo, Math.max(minimo, valor));

/** O mapa andou: nunca sai do canto de cima à esquerda da cena (a cena cresce para a direita e para baixo). */
export function moverMapa(_mapa: Medidas, novoX: number, novoY: number, grade?: Pick<IGrade, 'tipo' | 'tamanho' | 'x' | 'y'> | null): Pick<Medidas, 'x' | 'y'> {
  const alvo = grade ? encaixarCantoNaGrade(novoX, novoY, grade) : { x: novoX, y: novoY };
  return { x: Math.max(0, Math.round(alvo.x * 10) / 10), y: Math.max(0, Math.round(alvo.y * 10) / 10) };
}

/**
 * Puxar um canto muda o tamanho mantendo a proporção; o canto oposto fica parado.
 * A escala nova é a que leva o canto puxado até o ponto (pela maior das duas distâncias).
 */
export function redimensionarMapa(mapa: Medidas, canto: Canto, ponto: IPonto): Pick<Medidas, 'x' | 'y' | 'escala'> {
  const atual = retanguloDoMapa(mapa);
  const ancora = pontoDoCanto(atual, OPOSTO[canto]);
  const pedida = Math.max(Math.abs(ponto.x - ancora.x) / mapa.largura, Math.abs(ponto.y - ancora.y) / mapa.altura);
  let escala = limitar(pedida, ESCALA_MINIMA_MAPA, ESCALA_MAXIMA_MAPA);
  const w = mapa.largura * escala;
  const h = mapa.altura * escala;
  let x = canto === 'no' || canto === 'so' ? ancora.x - w : ancora.x;
  let y = canto === 'no' || canto === 'ne' ? ancora.y - h : ancora.y;
  // Não deixa a ponta passar da borda de cima e da esquerda: encolhe o que for preciso.
  if (x < 0 || y < 0) {
    const sobraX = x < 0 ? ancora.x / mapa.largura : Infinity;
    const sobraY = y < 0 ? ancora.y / mapa.altura : Infinity;
    escala = limitar(Math.min(sobraX, sobraY, escala), ESCALA_MINIMA_MAPA, ESCALA_MAXIMA_MAPA);
    x = canto === 'no' || canto === 'so' ? ancora.x - mapa.largura * escala : ancora.x;
    y = canto === 'no' || canto === 'ne' ? ancora.y - mapa.altura * escala : ancora.y;
  }
  return { x: Math.max(0, Math.round(x * 10) / 10), y: Math.max(0, Math.round(y * 10) / 10), escala: Math.round(escala * 10000) / 10000 };
}

/** Largura do mapa em casas da grade da cena. */
export function casasNaLargura(mapa: Medidas, tamanhoCasa: number): number {
  return Math.round(((mapa.largura * mapa.escala) / Math.max(1, tamanhoCasa)) * 100) / 100;
}

/** A escala que faz o mapa ter essa largura em casas. */
export function escalaParaCasas(mapa: Pick<Medidas, 'largura'>, casas: number, tamanhoCasa: number): number {
  return limitar(Math.round(((casas * tamanhoCasa) / Math.max(1, mapa.largura)) * 10000) / 10000, ESCALA_MINIMA_MAPA, ESCALA_MAXIMA_MAPA);
}

/** Ladrilhos que a névoa libera para um mapa colocado: as chaves da lista da cena que levam o id dele na frente. */
export function liberadosDoMapa(ladrilhos: readonly string[] | null | undefined, imagemId: string): Set<string> | null {
  if (!ladrilhos) return null;
  const prefixo = `${imagemId}:`;
  return new Set(ladrilhos.filter((chave) => chave.startsWith(prefixo)).map((chave) => chave.slice(prefixo.length)));
}
