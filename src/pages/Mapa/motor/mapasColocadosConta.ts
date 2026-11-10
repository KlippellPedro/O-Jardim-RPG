// Contas dos mapas colocados na cena, sem o motor (testáveis): onde cada um está, qual fica sob
// o clique, que canto ou alça foi agarrado, mover (com encaixe na grade), mudar de tamanho puxando
// um canto, girar pela alça de cima e a largura em casas da grade.
//
// O mapa gira em torno do centro. `x` e `y` são o canto de cima à esquerda do desenho SEM girar, então
// girar não muda o centro; a caixa que ele ocupa de verdade na cena é `caixaDoMapa`.

import type { IMapaColocado } from '../../../services/mapaApi';
import type { IGrade, IPonto } from './geometria';

export const ESCALA_MINIMA_MAPA = 0.05;
export const ESCALA_MAXIMA_MAPA = 20;
/** Lado da área de agarrar um canto, em pixels de tela. */
export const AGARRE_DO_CANTO_PX = 14;
/** Quanto a alça de giro fica acima da borda de cima do mapa, em pixels de tela. */
export const DISTANCIA_DA_ALCA_PX = 34;
/** Raio da área de agarrar a alça de giro, em pixels de tela. */
export const AGARRE_DA_ALCA_PX = 16;
/** Com Shift apertado, o giro anda de 15 em 15 graus. */
export const PASSO_DO_GIRO = 15;
/** Perto dos ângulos retos (0, 90, 180, 270) o giro cola neles: a folga, em graus. */
export const IMA_DO_GIRO = 2.5;

export type Canto = 'no' | 'ne' | 'so' | 'se';
type Medidas = Pick<IMapaColocado, 'x' | 'y' | 'escala' | 'largura' | 'altura'> & { rotacao?: number };

export interface Retangulo {
  x: number;
  y: number;
  w: number;
  h: number;
}

const emRadianos = (graus: number | undefined) => ((graus ?? 0) * Math.PI) / 180;
const arredondar = (valor: number, casas: number) => {
  const fator = 10 ** casas;
  return Math.round(valor * fator) / fator;
};

/** O retângulo do desenho sem girar, já com a escala: `x` e `y` do mapa e o tamanho dele na cena. */
export function retanguloDoMapa(mapa: Medidas): Retangulo {
  return { x: mapa.x, y: mapa.y, w: mapa.largura * mapa.escala, h: mapa.altura * mapa.escala };
}

/** O centro do mapa, o ponto em torno do qual ele gira. */
export function centroDoMapa(mapa: Medidas): IPonto {
  const r = retanguloDoMapa(mapa);
  return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
}

/** Leva um vetor do desenho para a cena (gira no sentido horário da tela). */
function girar(dx: number, dy: number, graus: number | undefined): IPonto {
  const a = emRadianos(graus);
  const seno = Math.sin(a);
  const cosseno = Math.cos(a);
  return { x: dx * cosseno - dy * seno, y: dx * seno + dy * cosseno };
}

/** Os quatro cantos do mapa na cena, já girados. */
export function cantosDoMapa(mapa: Medidas): Record<Canto, IPonto> {
  const c = centroDoMapa(mapa);
  const meioW = (mapa.largura * mapa.escala) / 2;
  const meioH = (mapa.altura * mapa.escala) / 2;
  const canto = (dx: number, dy: number): IPonto => {
    const g = girar(dx, dy, mapa.rotacao);
    return { x: c.x + g.x, y: c.y + g.y };
  };
  return { no: canto(-meioW, -meioH), ne: canto(meioW, -meioH), so: canto(-meioW, meioH), se: canto(meioW, meioH) };
}

/** O menor retângulo reto que cobre o mapa já girado: é o que conta para a borda da cena e para enquadrar. */
export function caixaDoMapa(mapa: Medidas): Retangulo {
  if (!mapa.rotacao) return retanguloDoMapa(mapa);
  const pontos = Object.values(cantosDoMapa(mapa));
  const xs = pontos.map((p) => p.x);
  const ys = pontos.map((p) => p.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}

/** O ponto da cena visto de dentro do mapa: distância do centro nos eixos do desenho (já girado de volta). */
function noQuadroDoMapa(mapa: Medidas, ponto: IPonto): IPonto {
  const c = centroDoMapa(mapa);
  return girar(ponto.x - c.x, ponto.y - c.y, -(mapa.rotacao ?? 0));
}

/** O ponto da cena cai dentro do mapa (girado ou não)? */
export function pontoDentroDoMapa(mapa: Medidas, ponto: IPonto): boolean {
  if (!mapa.rotacao) {
    const r = retanguloDoMapa(mapa);
    return ponto.x >= r.x && ponto.x <= r.x + r.w && ponto.y >= r.y && ponto.y <= r.y + r.h;
  }
  const local = noQuadroDoMapa(mapa, ponto);
  return Math.abs(local.x) <= (mapa.largura * mapa.escala) / 2 && Math.abs(local.y) <= (mapa.altura * mapa.escala) / 2;
}

/** O mapa de cima entre os que contêm o ponto (a lista vai de baixo para cima). */
export function acharMapaEm(mapas: Array<Medidas & { id: string }>, ponto: IPonto): string | null {
  for (let i = mapas.length - 1; i >= 0; i--) {
    if (pontoDentroDoMapa(mapas[i], ponto)) return mapas[i].id;
  }
  return null;
}

const OPOSTO: Record<Canto, Canto> = { no: 'se', se: 'no', ne: 'so', so: 'ne' };

/** O canto agarrado, se o ponto cai perto de um (a área é em pixels de tela, `zoom` é a escala da tela). */
export function acharCanto(mapa: Medidas, ponto: IPonto, zoom: number): Canto | null {
  const cantos = cantosDoMapa(mapa);
  const alcance = AGARRE_DO_CANTO_PX / Math.max(zoom, 0.001);
  const ordem: Canto[] = ['se', 'ne', 'so', 'no'];
  for (const canto of ordem) {
    const c = cantos[canto];
    if (Math.abs(ponto.x - c.x) <= alcance && Math.abs(ponto.y - c.y) <= alcance) return canto;
  }
  return null;
}

/** Onde fica a alça de giro: acima do meio da borda de cima, no sentido em que o mapa está virado. */
export function pontoDaAlcaDeGiro(mapa: Medidas, zoom: number): IPonto {
  const c = centroDoMapa(mapa);
  const g = girar(0, -((mapa.altura * mapa.escala) / 2 + DISTANCIA_DA_ALCA_PX / Math.max(zoom, 0.001)), mapa.rotacao);
  return { x: c.x + g.x, y: c.y + g.y };
}

/** O ponto cai na alça de giro? */
export function acharAlcaDeGiro(mapa: Medidas, ponto: IPonto, zoom: number): boolean {
  const alca = pontoDaAlcaDeGiro(mapa, zoom);
  return Math.hypot(ponto.x - alca.x, ponto.y - alca.y) <= AGARRE_DA_ALCA_PX / Math.max(zoom, 0.001);
}

/**
 * O giro (em graus, de 0 a 360) que põe a alça de cima na direção do ponto. Com `passo` (Shift) anda de 15
 * em 15 graus; sem ele, cola nos ângulos retos quando passa perto.
 */
export function girarMapa(mapa: Medidas, ponto: IPonto, passo = false): number {
  const c = centroDoMapa(mapa);
  let graus = (Math.atan2(ponto.y - c.y, ponto.x - c.x) * 180) / Math.PI + 90;
  if (passo) graus = Math.round(graus / PASSO_DO_GIRO) * PASSO_DO_GIRO;
  else {
    const reto = Math.round(graus / 90) * 90;
    if (Math.abs(graus - reto) <= IMA_DO_GIRO) graus = reto;
  }
  graus = ((graus % 360) + 360) % 360;
  graus = arredondar(graus, 1);
  return graus >= 360 ? 0 : graus;
}

/** Depois de girar, o mapa que passou da borda de cima ou da esquerda é empurrado para dentro da cena. */
export function manterDentroDaCena(mapa: Medidas): Pick<Medidas, 'x' | 'y'> {
  const caixa = caixaDoMapa(mapa);
  return {
    x: arredondar(mapa.x + Math.max(0, -caixa.x), 1),
    y: arredondar(mapa.y + Math.max(0, -caixa.y), 1),
  };
}

/** Encaixa o canto de cima à esquerda numa linha da grade quadrada. Outras grades deixam como está. */
export function encaixarCantoNaGrade(x: number, y: number, grade: Pick<IGrade, 'tipo' | 'tamanho' | 'x' | 'y'>): IPonto {
  if (grade.tipo !== 'quadrada' || grade.tamanho <= 0) return { x, y };
  const linha = (valor: number, origem: number) => Math.round((valor - origem) / grade.tamanho) * grade.tamanho + origem;
  return { x: linha(x, grade.x), y: linha(y, grade.y) };
}

const limitar = (valor: number, minimo: number, maximo: number) => Math.min(maximo, Math.max(minimo, valor));

/**
 * O mapa andou: a caixa dele nunca sai pelo canto de cima e da esquerda (a cena cresce para a direita e para
 * baixo) e, com `limites`, nem pela borda de baixo e da direita. Girado, o encaixe na grade não vale.
 */
export function moverMapa(
  mapa: Medidas,
  novoX: number,
  novoY: number,
  grade?: Pick<IGrade, 'tipo' | 'tamanho' | 'x' | 'y'> | null,
  limites?: { largura: number; altura: number } | null,
): Pick<Medidas, 'x' | 'y'> {
  const alvo = grade && !mapa.rotacao ? encaixarCantoNaGrade(novoX, novoY, grade) : { x: novoX, y: novoY };
  const caixa = caixaDoMapa(mapa);
  // Quanto a caixa passa do canto do desenho: andar x leva a caixa junto.
  const sobraX = caixa.x - mapa.x;
  const sobraY = caixa.y - mapa.y;
  let x = Math.round(alvo.x * 10) / 10;
  let y = Math.round(alvo.y * 10) / 10;
  if (limites) {
    x = Math.min(x, limites.largura - caixa.w - sobraX);
    y = Math.min(y, limites.altura - caixa.h - sobraY);
  }
  return { x: Math.max(0 - sobraX, x), y: Math.max(0 - sobraY, y) };
}

/**
 * Puxar um canto muda o tamanho mantendo a proporção e o giro; o canto oposto fica parado.
 * A escala nova é a que leva o canto puxado até o ponto (pela maior das duas distâncias, medidas nos eixos do
 * desenho). A caixa do mapa não passa da borda de cima nem da esquerda: encolhe o que for preciso.
 */
export function redimensionarMapa(mapa: Medidas, canto: Canto, ponto: IPonto): Pick<Medidas, 'x' | 'y' | 'escala'> {
  const ancora = cantosDoMapa(mapa)[OPOSTO[canto]];
  const eixoX = girar(1, 0, mapa.rotacao);
  const eixoY = girar(0, 1, mapa.rotacao);
  const dx = ponto.x - ancora.x;
  const dy = ponto.y - ancora.y;
  const ao_longo_x = dx * eixoX.x + dy * eixoX.y;
  const ao_longo_y = dx * eixoY.x + dy * eixoY.y;
  const pedida = Math.max(Math.abs(ao_longo_x) / mapa.largura, Math.abs(ao_longo_y) / mapa.altura);
  let escala = limitar(pedida, ESCALA_MINIMA_MAPA, ESCALA_MAXIMA_MAPA);

  // Para que lado, a partir da âncora, o canto puxado fica (nos eixos do desenho).
  const sx = canto === 'ne' || canto === 'se' ? 1 : -1;
  const sy = canto === 'so' || canto === 'se' ? 1 : -1;
  // Os quatro cantos, a cada unidade de escala, medidos a partir da âncora.
  const larguraX = { x: sx * mapa.largura * eixoX.x, y: sx * mapa.largura * eixoX.y };
  const alturaY = { x: sy * mapa.altura * eixoY.x, y: sy * mapa.altura * eixoY.y };
  const menorX = Math.min(0, larguraX.x, alturaY.x, larguraX.x + alturaY.x);
  const menorY = Math.min(0, larguraX.y, alturaY.y, larguraX.y + alturaY.y);
  if (ancora.x + escala * menorX < 0 || ancora.y + escala * menorY < 0) {
    const teto = Math.min(menorX < 0 ? ancora.x / -menorX : Infinity, menorY < 0 ? ancora.y / -menorY : Infinity);
    escala = limitar(Math.min(teto, escala), ESCALA_MINIMA_MAPA, ESCALA_MAXIMA_MAPA);
  }

  const w = mapa.largura * escala;
  const h = mapa.altura * escala;
  // O centro novo: da âncora, meia largura e meia altura na direção do canto puxado.
  const centroX = ancora.x + sx * (w / 2) * eixoX.x + sy * (h / 2) * eixoY.x;
  const centroY = ancora.y + sx * (w / 2) * eixoX.y + sy * (h / 2) * eixoY.y;
  return { x: arredondar(centroX - w / 2, 1), y: arredondar(centroY - h / 2, 1), escala: arredondar(escala, 4) };
}

/** Largura do mapa em casas da grade da cena. */
export function casasNaLargura(mapa: Medidas, tamanhoCasa: number): number {
  return Math.round(((mapa.largura * mapa.escala) / Math.max(1, tamanhoCasa)) * 100) / 100;
}

/** A escala que faz o mapa ter essa largura em casas. */
export function escalaParaCasas(mapa: Pick<Medidas, 'largura'>, casas: number, tamanhoCasa: number): number {
  return limitar(Math.round(((casas * tamanhoCasa) / Math.max(1, mapa.largura)) * 10000) / 10000, ESCALA_MINIMA_MAPA, ESCALA_MAXIMA_MAPA);
}

/** Um ponto da cena visto no desenho do mapa (para saber que ladrilhos estão na tela): sem giro, escala e deslocamento. */
export function paraODesenho(mapa: Medidas, ponto: IPonto): IPonto {
  const local = noQuadroDoMapa(mapa, ponto);
  return { x: local.x / mapa.escala + mapa.largura / 2, y: local.y / mapa.escala + mapa.altura / 2 };
}

/** Ladrilhos que a névoa libera para um mapa colocado: as chaves da lista da cena que levam o id dele na frente. */
export function liberadosDoMapa(ladrilhos: readonly string[] | null | undefined, imagemId: string): Set<string> | null {
  if (!ladrilhos) return null;
  const prefixo = `${imagemId}:`;
  return new Set(ladrilhos.filter((chave) => chave.startsWith(prefixo)).map((chave) => chave.slice(prefixo.length)));
}
