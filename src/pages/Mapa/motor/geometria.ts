// Contas do mapa que não dependem do motor: encaixe na grade (quadrada e
// hexagonal), distância da régua e quais ladrilhos uma imagem tem.

export type TipoGrade = 'quadrada' | 'hex' | 'nenhuma';

export interface IGrade {
  tipo: TipoGrade;
  /** Lado do quadrado, ou largura do hexágono, em px do mapa. */
  tamanho: number;
  /** Deslocamento da grade em relação ao canto do mapa. */
  x: number;
  y: number;
  cor: string;
  opacidade: number;
  /** Metros que um quadrado vale (1,5 m nas regras do Jardim). */
  metros: number;
}

export interface IPonto {
  x: number;
  y: number;
}

const RAIZ3 = Math.sqrt(3);

/** Raio do hexágono (centro ao vértice) para uma grade "pontuda em cima" com a largura pedida. */
export function raioHex(tamanho: number): number {
  return tamanho / RAIZ3;
}

function encaixarQuadrada(ponto: IPonto, grade: IGrade, porte: number): IPonto {
  // Porte ímpar fica no meio de uma casa; porte par, no cruzamento de linhas.
  const meio = (porte % 2) * (grade.tamanho / 2);
  const eixo = (valor: number, deslocamento: number) =>
    Math.round((valor - deslocamento - meio) / grade.tamanho) * grade.tamanho + deslocamento + meio;
  return { x: eixo(ponto.x, grade.x), y: eixo(ponto.y, grade.y) };
}

/** Centro do hexágono mais próximo (coordenadas axiais, arredondamento cúbico). */
function encaixarHex(ponto: IPonto, grade: IGrade): IPonto {
  const r = raioHex(grade.tamanho);
  const px = ponto.x - grade.x;
  const py = ponto.y - grade.y;
  const q = ((RAIZ3 / 3) * px - py / 3) / r;
  const s = ((2 / 3) * py) / r;
  let rx = Math.round(q);
  let rz = Math.round(s);
  const ry = Math.round(-q - s);
  const dx = Math.abs(rx - q);
  const dz = Math.abs(rz - s);
  const dy = Math.abs(ry - (-q - s));
  if (dx > dy && dx > dz) rx = -ry - rz;
  else if (dz > dy) rz = -rx - ry;
  return { x: grade.x + r * RAIZ3 * (rx + rz / 2), y: grade.y + r * 1.5 * rz };
}

export function encaixar(ponto: IPonto, grade: IGrade, porte = 1): IPonto {
  if (grade.tipo === 'nenhuma') return { ...ponto };
  if (grade.tipo === 'hex') return encaixarHex(ponto, grade);
  return encaixarQuadrada(ponto, grade, porte);
}

/** Distância da régua: em quadrados (pela grade) e em metros, somando os trechos. */
export function medir(pontos: IPonto[], grade: IGrade): { quadrados: number; metros: number } {
  let total = 0;
  for (let i = 1; i < pontos.length; i++) {
    total += Math.hypot(pontos[i].x - pontos[i - 1].x, pontos[i].y - pontos[i - 1].y);
  }
  const quadrados = total / grade.tamanho;
  return { quadrados: Math.round(quadrados * 10) / 10, metros: Math.round(quadrados * grade.metros * 10) / 10 };
}

export const LADO_LADRILHO = 1024;
export const LIMIAR_NIVEL_REDUZIDO = 2048;

/** Pedaços de uma imagem do acervo; a mesma regra do servidor (core/acervo.py). */
export function chavesEsperadas(largura: number, altura: number): string[] {
  const chaves = ['mini'];
  for (let coluna = 0; coluna < Math.ceil(largura / LADO_LADRILHO); coluna++) {
    for (let linha = 0; linha < Math.ceil(altura / LADO_LADRILHO); linha++) chaves.push(`n0/${coluna}/${linha}`);
  }
  if (Math.max(largura, altura) > LIMIAR_NIVEL_REDUZIDO) {
    const l = Math.ceil(largura / 4);
    const a = Math.ceil(altura / 4);
    for (let coluna = 0; coluna < Math.ceil(l / LADO_LADRILHO); coluna++) {
      for (let linha = 0; linha < Math.ceil(a / LADO_LADRILHO); linha++) chaves.push(`n2/${coluna}/${linha}`);
    }
  }
  return chaves;
}

/** Iniciais para o token sem retrato: "Lobo Cinzento" vira "LC". */
export function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return '?';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

/** Nome que cabe embaixo do token: corta numa palavra inteira e põe reticências.
 *  O tamanho da letra acompanha o token, então o limite é o mesmo em qualquer porte. */
export const LIMITE_NOME_TOKEN = 18;

export function abreviarNome(nome: string, limite = LIMITE_NOME_TOKEN): string {
  const limpo = nome.trim().replace(/\s+/g, ' ');
  if (limpo.length <= limite) return limpo;
  const corte = limpo.slice(0, limite - 1);
  // A palavra acabou bem no corte: fica inteira.
  if (limpo[limite - 1] === ' ') return `${corte}…`;
  const espaco = corte.lastIndexOf(' ');
  // Sem espaço que aproveite (uma palavra só, comprida), corta no meio dela.
  return `${(espaco >= limite / 2 ? corte.slice(0, espaco) : corte).trimEnd()}…`;
}

/** Uma ou duas letras por condição (Caído vira "Ca"), nas bolinhas ao lado do token. */
export function siglaDaCondicao(nome: string): string {
  const limpo = nome.trim();
  return limpo ? limpo[0].toUpperCase() + (limpo[1] ?? '').toLowerCase() : '?';
}
