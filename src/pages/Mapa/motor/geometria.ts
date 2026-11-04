// Contas do mapa que não dependem do motor: encaixe na grade (quadrada e
// hexagonal), distância da régua e quais ladrilhos uma imagem tem.

/** `hex` é o hexágono pontudo em cima; `hex-plano`, o de lado reto em cima. */
export type TipoGrade = 'quadrada' | 'hex' | 'hex-plano' | 'nenhuma';
export type LinhaGrade = 'solida' | 'tracejada' | 'pontilhada';
export type UnidadeGrade = 'm' | 'ft';
export type MedicaoGrade = 'euclidiana' | 'chebyshev' | 'alternada' | 'manhattan' | 'hex';

export interface IGrade {
  tipo: TipoGrade;
  /** Lado do quadrado, ou largura do hexágono (de lado a lado), em px do mapa. */
  tamanho: number;
  /** Deslocamento da grade em relação ao canto do mapa. */
  x: number;
  y: number;
  cor: string;
  opacidade: number;
  /** Quanto uma casa vale na `unidade` (1,5 m nas regras do Jardim; o nome é de quando só havia metros). */
  metros: number;
  /** Servidor antigo ou cena velha: sem estes campos valem os padrões de `PADRAO_GRADE`. */
  unidade?: UnidadeGrade;
  /** Espessura da linha em pixels de tela (não muda com o zoom). */
  espessura?: number;
  linha?: LinhaGrade;
  medicao?: MedicaoGrade;
}

export const PADRAO_GRADE = { unidade: 'm', espessura: 1, linha: 'solida', medicao: 'euclidiana' } as const;

export const ehHex = (tipo: TipoGrade): boolean => tipo === 'hex' || tipo === 'hex-plano';

export const rotuloUnidade = (unidade: UnidadeGrade | undefined): string => (unidade === 'ft' ? 'ft' : 'm');

/** A medida que vale de fato: a escolhida, se combina com o formato da grade; senão a natural dele. */
export function medicaoEfetiva(grade: Pick<IGrade, 'tipo' | 'medicao'>): MedicaoGrade {
  const escolhida = grade.medicao ?? PADRAO_GRADE.medicao;
  if (ehHex(grade.tipo)) return escolhida === 'euclidiana' ? 'euclidiana' : 'hex';
  return escolhida === 'hex' ? 'euclidiana' : escolhida;
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

/** O hexágono plano é o pontudo com os eixos trocados: troca, encaixa e troca de volta. */
function encaixarHexPlano(ponto: IPonto, grade: IGrade): IPonto {
  const trocada: IGrade = { ...grade, x: grade.y, y: grade.x };
  const achado = encaixarHex({ x: ponto.y, y: ponto.x }, trocada);
  return { x: achado.y, y: achado.x };
}

export function encaixar(ponto: IPonto, grade: IGrade, porte = 1): IPonto {
  if (grade.tipo === 'nenhuma') return { ...ponto };
  if (grade.tipo === 'hex') return encaixarHex(ponto, grade);
  if (grade.tipo === 'hex-plano') return encaixarHexPlano(ponto, grade);
  return encaixarQuadrada(ponto, grade, porte);
}

/** Coordenadas "cúbicas" do hexágono que contém o ponto, para contar passos entre hexágonos. */
function cuboDoHex(ponto: IPonto, grade: IGrade): { q: number; r: number } {
  const centro = encaixar(ponto, grade);
  const plano = grade.tipo === 'hex-plano';
  const r = raioHex(grade.tamanho);
  // No plano, os eixos trocam de lugar; depois é a mesma conta do pontudo.
  const px = (plano ? centro.y - grade.y : centro.x - grade.x);
  const py = (plano ? centro.x - grade.x : centro.y - grade.y);
  const s = py / (r * 1.5);
  const q = px / (r * RAIZ3) - s / 2;
  return { q: Math.round(q), r: Math.round(s) };
}

/** Passos entre dois hexágonos, andando de vizinho em vizinho. */
export function passosEntreHex(a: IPonto, b: IPonto, grade: IGrade): number {
  const ca = cuboDoHex(a, grade);
  const cb = cuboDoHex(b, grade);
  const dq = ca.q - cb.q;
  const dr = ca.r - cb.r;
  return (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2;
}

/** Quantas casas vale um trecho reto de `a` até `b`, pelo jeito de medir escolhido. */
export function casasDoTrecho(a: IPonto, b: IPonto, grade: IGrade): number {
  const medicao = medicaoEfetiva(grade);
  if (medicao === 'hex') return passosEntreHex(a, b, grade);
  const dx = Math.abs(b.x - a.x) / grade.tamanho;
  const dy = Math.abs(b.y - a.y) / grade.tamanho;
  const maior = Math.max(dx, dy);
  const menor = Math.min(dx, dy);
  if (medicao === 'chebyshev') return maior;
  if (medicao === 'manhattan') return dx + dy;
  if (medicao === 'alternada') {
    // 5-10-5: a cada duas diagonais, a segunda custa dobro. Com os pontos no centro das casas
    // a conta é exata (diagonais inteiras); fora disso vira uma média contínua.
    const inteiros = Math.abs(menor - Math.round(menor)) < 0.02 && Math.abs(maior - Math.round(maior)) < 0.02;
    return inteiros ? Math.round(maior) + Math.floor(Math.round(menor) / 2) : maior + menor / 2;
  }
  return Math.hypot(dx, dy);
}

/** Distância da régua: em casas (pela grade) e na unidade da cena (m ou ft), somando os trechos. */
export function medir(pontos: IPonto[], grade: IGrade): { quadrados: number; metros: number } {
  let quadrados = 0;
  for (let i = 1; i < pontos.length; i++) quadrados += casasDoTrecho(pontos[i - 1], pontos[i], grade);
  return { quadrados: Math.round(quadrados * 10) / 10, metros: Math.round(quadrados * grade.metros * 10) / 10 };
}

// ----------------------------------------------------------- desenho da grade

/** Lados do quadrado da tela (em px) abaixo dos quais a grade some, para não virar um borrão. */
export const CASA_MINIMA_NA_TELA = 6;
export const HEX_MINIMO_NA_TELA = 14;

export interface Vista {
  x: number;
  y: number;
  largura: number;
  altura: number;
}

export type Segmento = [number, number, number, number];

const mod = (valor: number, passo: number) => ((valor % passo) + passo) % passo;

/** Vértices do hexágono centrado em (cx, cy): pontudo em cima ou plano em cima. */
function verticesDoHex(cx: number, cy: number, r: number, plano: boolean): Array<[number, number]> {
  const saida: Array<[number, number]> = [];
  for (let i = 0; i < 6; i++) {
    const angulo = (plano ? 0 : -Math.PI / 2) + (i * Math.PI) / 3;
    saida.push([cx + Math.cos(angulo) * r, cy + Math.sin(angulo) * r]);
  }
  return saida;
}

/**
 * Segmentos da grade dentro da `vista` (mais uma casa de folga), em coordenadas do mapa. A grade não
 * acaba na borda do mapa: cobre tudo o que a tela mostra. Devolve vazio quando a casa ficaria pequena
 * demais na tela (`escala` = pixels de tela por pixel de mapa).
 */
export function segmentosDaGrade(grade: IGrade, vista: Vista, escala: number): Segmento[] {
  if (grade.tipo === 'nenhuma' || grade.tamanho <= 0 || escala <= 0) return [];
  const direita = vista.x + vista.largura;
  const baixo = vista.y + vista.altura;
  const segmentos: Segmento[] = [];
  if (grade.tipo === 'quadrada') {
    if (grade.tamanho * escala < CASA_MINIMA_NA_TELA) return [];
    const passo = grade.tamanho;
    const x0 = vista.x - passo - mod(vista.x - passo - grade.x, passo);
    const y0 = vista.y - passo - mod(vista.y - passo - grade.y, passo);
    const topo = vista.y - passo;
    const esquerda = vista.x - passo;
    for (let x = x0 + passo; x <= direita + passo; x += passo) segmentos.push([x, topo, x, baixo + passo]);
    for (let y = y0 + passo; y <= baixo + passo; y += passo) segmentos.push([esquerda, y, direita + passo, y]);
    return segmentos;
  }
  if (grade.tamanho * escala < HEX_MINIMO_NA_TELA) return [];
  const plano = grade.tipo === 'hex-plano';
  const r = raioHex(grade.tamanho);
  const w = grade.tamanho;
  // `a` anda ao longo da fileira e `b` entre fileiras; o plano é o pontudo com os eixos trocados.
  const origemA = plano ? grade.y : grade.x;
  const origemB = plano ? grade.x : grade.y;
  const minA = (plano ? vista.y : vista.x) - w * 2;
  const maxA = (plano ? baixo : direita) + w * 2;
  const minB = (plano ? vista.x : vista.y) - r * 3;
  const maxB = (plano ? direita : baixo) + r * 3;
  const passoB = r * 1.5;
  const primeiraB = Math.floor((minB - origemB) / passoB);
  const ultimaB = Math.ceil((maxB - origemB) / passoB);
  for (let fileira = primeiraB; fileira <= ultimaB; fileira++) {
    const b = origemB + fileira * passoB;
    const deslocamento = mod(fileira, 2) === 1 ? w / 2 : 0;
    const primeiraA = Math.floor((minA - origemA - deslocamento) / w);
    const ultimaA = Math.ceil((maxA - origemA - deslocamento) / w);
    for (let coluna = primeiraA; coluna <= ultimaA; coluna++) {
      const a = origemA + coluna * w + deslocamento;
      const [cx, cy] = plano ? [b, a] : [a, b];
      const v = verticesDoHex(cx, cy, r, plano);
      // Cada hexágono desenha três lados; os outros três são de quem está ao lado.
      for (const [de, ate] of [[5, 0], [0, 1], [1, 2]]) segmentos.push([v[de][0], v[de][1], v[ate][0], v[ate][1]]);
    }
  }
  return segmentos;
}

/**
 * Corta os segmentos em traços: `cheio` e `vazio` em pixels do mapa (o chamador divide pelo zoom).
 * Nos segmentos retos na horizontal ou na vertical o ritmo parte da origem do mapa, para os
 * traços não correrem quando a tela anda (a linha é cortada onde a vista a corta).
 */
export function tracejar(segmentos: Segmento[], cheio: number, vazio: number): Segmento[] {
  const saida: Segmento[] = [];
  const periodo = cheio + vazio;
  if (cheio <= 0 || periodo <= 0) return segmentos;
  for (const [x1, y1, x2, y2] of segmentos) {
    const comprimento = Math.hypot(x2 - x1, y2 - y1);
    if (comprimento === 0) continue;
    const ux = (x2 - x1) / comprimento;
    const uy = (y2 - y1) / comprimento;
    const aoLongo = y1 === y2 ? x1 * Math.sign(ux) : x1 === x2 ? y1 * Math.sign(uy) : 0;
    for (let inicio = -mod(aoLongo, periodo); inicio < comprimento; inicio += periodo) {
      const de = Math.max(0, inicio);
      const fim = Math.min(inicio + cheio, comprimento);
      if (fim <= de) continue;
      saida.push([x1 + ux * de, y1 + uy * de, x1 + ux * fim, y1 + uy * fim]);
    }
  }
  return saida;
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
