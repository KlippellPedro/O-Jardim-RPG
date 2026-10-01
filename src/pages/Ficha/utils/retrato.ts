import type { EfeitoAtmosfericoFicha } from '../fichaTheme';
export type FormaJoia = 'losango' | 'circulo' | 'estrela' | 'hexagono' | 'cruz' | 'gota';
/** Desenho do aro de fora: liso, tracejado, pontilhado ou de linha dupla. */
export type PadraoMoldura = 'liso' | 'tracejado' | 'pontilhado' | 'duplo';
/** Como a borda se mexe: o brilho gira (nos dois sentidos), a luz pulsa ou as
 * joias cintilam. */
export type MovimentoMoldura = 'giro' | 'giro-inverso' | 'pulso' | 'cintilar';

export interface EstiloMoldura {
  /** Posição na escada (0 é a moldura simples, 12 a do nível 60, 100 a do 500). */
  degrau: number;
  /** Chave estável do degrau, usada como classe CSS. */
  chave: string;
  /** Nome da moldura, ou null quando é a simples. */
  rotulo: string | null;
  /** Primeiro nível em que a moldura aparece. */
  nivelMinimo: number;
  /** Cor principal do fio, segunda cor do degradê e cor do brilho. */
  fio: string;
  fio2: string;
  brilho: string;
  /** Quantidade de joias: cantos (2 ou 4) e depois o meio de cada lado (6 e 8). */
  joias: 0 | 2 | 4 | 6 | 8;
  forma: FormaJoia;
  /** Duplo aro de fora, a partir do nível 20. */
  aro: boolean;
  /** Aros a mais por fora do duplo, a partir do nível 180 (0, 1 ou 2). */
  aroExtra: 0 | 1 | 2;
  padrao: PadraoMoldura;
  /** Nas molduras altas a borda se mexe; null quando fica parada. */
  movimento: MovimentoMoldura | null;
  animada: boolean;
}

type DegrauMoldura = Omit<EstiloMoldura, 'degrau'>;
type DegrauBase = Omit<DegrauMoldura, 'aroExtra' | 'padrao' | 'movimento'> & Partial<Pick<DegrauMoldura, 'aroExtra' | 'padrao' | 'movimento'>>;

/** Molduras escolhidas a mão, do nível 1 ao 60. */
const MOLDURAS_ATE_60: DegrauBase[] = [
  { chave: 'comum', rotulo: null, nivelMinimo: 1, fio: '#5b5566', fio2: '#5b5566', brilho: 'rgba(91, 85, 102, 0.35)', joias: 0, forma: 'losango', aro: false, animada: false },
  { chave: 'bronze', rotulo: 'Bronze', nivelMinimo: 5, fio: '#d08a4a', fio2: '#7a4a1f', brilho: 'rgba(208, 138, 74, 0.45)', joias: 2, forma: 'losango', aro: false, animada: false },
  { chave: 'prata', rotulo: 'Prata', nivelMinimo: 10, fio: '#c9d1dc', fio2: '#8b95a3', brilho: 'rgba(201, 209, 220, 0.5)', joias: 2, forma: 'losango', aro: false, animada: false },
  { chave: 'ouro', rotulo: 'Ouro', nivelMinimo: 15, fio: '#e3b840', fio2: '#a67c1a', brilho: 'rgba(227, 184, 64, 0.55)', joias: 4, forma: 'losango', aro: false, animada: false },
  { chave: 'esmeralda', rotulo: 'Esmeralda', nivelMinimo: 20, fio: '#3ddc97', fio2: '#12805a', brilho: 'rgba(61, 220, 151, 0.55)', joias: 4, forma: 'losango', aro: true, animada: false },
  { chave: 'safira', rotulo: 'Safira', nivelMinimo: 25, fio: '#4aa3ff', fio2: '#1c5fb0', brilho: 'rgba(74, 163, 255, 0.55)', joias: 4, forma: 'circulo', aro: true, animada: false },
  { chave: 'rubi', rotulo: 'Rubi', nivelMinimo: 30, fio: '#ff4d5e', fio2: '#8f1424', brilho: 'rgba(255, 77, 94, 0.6)', joias: 4, forma: 'circulo', aro: true, animada: false },
  { chave: 'ametista', rotulo: 'Ametista', nivelMinimo: 35, fio: '#b46bff', fio2: '#5f24a3', brilho: 'rgba(180, 107, 255, 0.6)', joias: 4, forma: 'estrela', aro: true, animada: false },
  { chave: 'obsidiana', rotulo: 'Obsidiana', nivelMinimo: 40, fio: '#a99bd6', fio2: '#241a3d', brilho: 'rgba(140, 120, 210, 0.65)', joias: 4, forma: 'estrela', aro: true, animada: false },
  { chave: 'aurora', rotulo: 'Aurora', nivelMinimo: 45, fio: '#5ff2e0', fio2: '#f28cff', brilho: 'rgba(120, 240, 230, 0.65)', joias: 4, forma: 'estrela', aro: true, animada: true },
  { chave: 'celestial', rotulo: 'Celestial', nivelMinimo: 50, fio: '#d6efff', fio2: '#6fb4f5', brilho: 'rgba(190, 228, 255, 0.75)', joias: 4, forma: 'estrela', aro: true, animada: true },
  { chave: 'solar', rotulo: 'Solar', nivelMinimo: 55, fio: '#ffc233', fio2: '#ff5a1f', brilho: 'rgba(255, 150, 40, 0.75)', joias: 4, forma: 'estrela', aro: true, animada: true },
  { chave: 'lenda', rotulo: 'Lendário', nivelMinimo: 60, fio: '#f6d872', fio2: '#fff3bd', brilho: 'rgba(255, 233, 150, 0.8)', joias: 4, forma: 'estrela', aro: true, animada: true },
];

/** Marcos da escada (os patamares de data/ficha/progressao-niveis.json): têm
 * nome e visual escolhidos a mão. Joias e aros vêm de `escalarComNivel`. */
const MARCOS: Record<number, Pick<DegrauMoldura, 'chave' | 'rotulo' | 'fio' | 'fio2' | 'brilho' | 'forma' | 'padrao' | 'movimento'>> = {
  100: { chave: 'mitico', rotulo: 'Mítico', fio: '#ff5ecb', fio2: '#7b2cff', brilho: 'rgba(255, 94, 203, 0.85)', forma: 'estrela', padrao: 'liso', movimento: 'giro' },
  150: { chave: 'cosmico', rotulo: 'Cósmico', fio: '#6ff3ff', fio2: '#4b3bff', brilho: 'rgba(111, 243, 255, 0.85)', forma: 'hexagono', padrao: 'tracejado', movimento: 'giro-inverso' },
  250: { chave: 'eterno', rotulo: 'Eterno', fio: '#b8ff7a', fio2: '#12a35b', brilho: 'rgba(184, 255, 122, 0.85)', forma: 'cruz', padrao: 'pontilhado', movimento: 'cintilar' },
  500: { chave: 'absoluto', rotulo: 'Absoluto', fio: '#ffffff', fio2: '#c8b6ff', brilho: 'rgba(255, 255, 255, 0.95)', forma: 'estrela', padrao: 'duplo', movimento: 'giro' },
};

/** Um nome por degrau gerado, do nível 65 ao 495 (os marcos 100, 150 e 250 ficam
 * de fora). Em ordem de nível: gemas, metais, céu, depois forças e conceitos. */
const NOMES_GERADOS = [
  // 65 a 95
  'Topázio', 'Jade', 'Opala', 'Turmalina', 'Granada', 'Berilo', 'Alexandrita',
  // 105 a 145
  'Cobalto', 'Titânio', 'Platina', 'Irídio', 'Ósmio', 'Paládio', 'Cromo', 'Tungstênio', 'Vanádio',
  // 155 a 245
  'Alvorada', 'Crepúsculo', 'Boreal', 'Luar', 'Eclipse', 'Zênite', 'Nadir', 'Cometa', 'Meteoro', 'Nebulosa',
  'Pulsar', 'Quasar', 'Supernova', 'Galáxia', 'Constelação', 'Equinócio', 'Solstício', 'Horizonte', 'Maré',
  // 255 a 495
  'Tempestade', 'Trovão', 'Relâmpago', 'Furacão', 'Maremoto', 'Vulcão', 'Geleira', 'Abismo', 'Oásis', 'Labirinto',
  'Santuário', 'Catedral', 'Cidadela', 'Bastião', 'Panteão', 'Oráculo', 'Presságio', 'Epopeia', 'Saga', 'Odisseia',
  'Crônica', 'Triunfo', 'Honra', 'Valor', 'Bravura', 'Destino', 'Vigília', 'Penumbra', 'Cântico', 'Harmonia',
  'Concórdia', 'Clemência', 'Ascensão', 'Redenção', 'Fênix', 'Despertar', 'Ápice', 'Revelação', 'Eclosão', 'Fulgor',
  'Esplendor', 'Grandeza', 'Majestade', 'Glória', 'Veneração', 'Infinito', 'Perpétuo', 'Imortal', 'Insondável',
];

const FORMAS_GERADAS: FormaJoia[] = ['losango', 'circulo', 'estrela', 'hexagono', 'cruz', 'gota'];
const PADROES_GERADOS: PadraoMoldura[] = ['liso', 'tracejado', 'pontilhado', 'duplo'];
const MOVIMENTOS_GERADOS: MovimentoMoldura[] = ['giro', 'pulso', 'giro-inverso', 'cintilar'];

/** Joias e aros que crescem com o nível: 4 joias até o 119, 6 até o 249 e 8
 * depois; um aro a mais a partir do 180 e outro a partir do 330. */
function escalarComNivel(nivel: number): Pick<DegrauMoldura, 'joias' | 'aroExtra'> {
  return {
    joias: nivel < 120 ? 4 : nivel < 250 ? 6 : 8,
    aroExtra: nivel < 180 ? 0 : nivel < 330 ? 1 : 2,
  };
}

function hslParaRgb(matiz: number, saturacao: number, luz: number): [number, number, number] {
  const s = saturacao / 100;
  const l = luz / 100;
  const a = s * Math.min(l, 1 - l);
  const canal = (n: number) => {
    const k = (n + matiz / 30) % 12;
    return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))));
  };
  return [canal(0), canal(8), canal(4)];
}

const hexDeRgb = (rgb: number[]) => `#${rgb.map((canal) => canal.toString(16).padStart(2, '0')).join('')}`;

/** Nome em minúsculas, sem acento nem espaço, para virar chave estável. */
const chaveDoNome = (nome: string) => nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-');

/** Cada degrau gerado tem cor, forma de joia, padrão do aro e movimento próprios.
 * A cor anda em ângulo áureo (137,5 graus) pelo círculo, então degraus vizinhos
 * nunca ficam parecidos; forma, padrão e movimento giram em ciclos de tamanhos
 * diferentes (6, 4 e 4) para a mesma combinação demorar a voltar. */
function degrauGerado(nivel: number, rotulo: string): DegrauMoldura {
  const passo = nivel / 5;
  const matiz = (passo * 137.508 + 20) % 360;
  const claro = hslParaRgb(matiz, 92, 64);
  const escuro = hslParaRgb((matiz + 32) % 360, 78, 36);
  return {
    chave: chaveDoNome(rotulo),
    rotulo,
    nivelMinimo: nivel,
    fio: hexDeRgb(claro),
    fio2: hexDeRgb(escuro),
    brilho: `rgba(${claro.join(', ')}, 0.8)`,
    forma: FORMAS_GERADAS[passo % FORMAS_GERADAS.length],
    aro: true,
    padrao: PADROES_GERADOS[(passo * 3 + 1) % PADROES_GERADOS.length],
    movimento: MOVIMENTOS_GERADOS[(passo * 3 + 2) % MOVIMENTOS_GERADOS.length],
    animada: true,
    ...escalarComNivel(nivel),
  };
}

function montarEscada(): DegrauMoldura[] {
  const ate60: DegrauMoldura[] = MOLDURAS_ATE_60.map((degrau) => ({
    aroExtra: 0,
    padrao: 'liso',
    movimento: degrau.animada ? 'giro' : null,
    ...degrau,
  }));
  const depois: DegrauMoldura[] = [];
  let proximoNome = 0;
  for (let nivel = 65; nivel <= 500; nivel += 5) {
    const marco = MARCOS[nivel];
    if (marco) {
      depois.push({ nivelMinimo: nivel, aro: true, animada: true, ...escalarComNivel(nivel), ...marco });
    } else {
      depois.push(degrauGerado(nivel, NOMES_GERADOS[proximoNome++]));
    }
  }
  return [...ate60, ...depois];
}

/** Uma moldura nova a cada 5 níveis, do 5 ao 500: as 13 primeiras escolhidas a
 * mão (até o 60) e o resto gerado, com os marcos 100, 150, 250 e 500 (os
 * patamares de data/ficha/progressao-niveis.json) com visual próprio. Abaixo do
 * 5 vale a simples; acima do 500 vale a última. */
export const ESCADA_MOLDURAS: DegrauMoldura[] = montarEscada();

/** A moldura do retrato sobe um degrau a cada 5 níveis, até o 500. O cartaz de
 * Procurado usa esta mesma escada, para o personagem ter a mesma "patente"
 * nas duas telas. */
export function molduraDoRetrato(nivel: number): EstiloMoldura {
  const valor = Number.isFinite(nivel) ? nivel : 1;
  let degrau = 0;
  ESCADA_MOLDURAS.forEach((item, indice) => {
    if (valor >= item.nivelMinimo) degrau = indice;
  });
  return { degrau, ...ESCADA_MOLDURAS[degrau] };
}

/** Uma ou duas iniciais para o retrato sem foto: "Mira de Aço" vira "MA". */
export function iniciaisDoNome(nome: string): string {
  const partes = String(nome || '')
    .trim()
    .split(/\s+/)
    .filter((parte) => /\p{L}/u.test(parte) && !/^(d[aeo]s?|e)$/i.test(parte));
  const letras = partes.slice(0, 2).map((parte) => (parte.match(/\p{L}/u)?.[0] || '').toLocaleUpperCase('pt-BR'));
  return letras.join('') || '?';
}

/** Símbolo grande e discreto atrás das iniciais, por atmosfera da classe
 * (a mesma que já define as partículas da ficha). Caminhos em caixa 100x100. */
export const GLIFOS: Record<EfeitoAtmosfericoFicha, { d: string; preenchido: boolean }> = {
  arcano: { d: 'M50 8 L61 38 L93 38 L67 57 L77 90 L50 70 L23 90 L33 57 L7 38 L39 38 Z', preenchido: false },
  brasas: { d: 'M50 6 C60 26 78 36 76 58 C74 78 62 92 50 92 C38 92 26 78 24 58 C22 42 36 34 40 18 C44 28 46 30 50 6 Z', preenchido: false },
  cosmico: { d: 'M64 12 A40 40 0 1 0 64 88 A31 31 0 1 1 64 12 Z', preenchido: false },
  natureza: { d: 'M50 92 C18 72 14 34 50 8 C86 34 82 72 50 92 Z M50 92 L50 28', preenchido: false },
  nevoa: { d: 'M8 34 Q29 20 50 34 T92 34 M8 52 Q29 38 50 52 T92 52 M8 70 Q29 56 50 70 T92 70', preenchido: false },
  ondas: { d: 'M6 38 Q21 20 36 38 T66 38 T96 38 M6 62 Q21 44 36 62 T66 62 T96 62', preenchido: false },
  tecnologico: { d: 'M50 8 L86 29 L86 71 L50 92 L14 71 L14 29 Z M50 32 L50 68 M32 41 L68 59', preenchido: false },
  holofote: { d: 'M50 6 L94 50 L50 94 L6 50 Z M50 26 L74 50 L50 74 L26 50 Z', preenchido: false },
};

export interface CoresRetrato {
  /** Cor de destaque (classe, ou raça quando não há classe). */
  destaque: string;
  /** Segunda cor, da raça. */
  segunda: string;
}

/** Cor escura misturada ao destaque, para o fundo do retrato composto não
 * competir com as iniciais. Aceita #rgb e #rrggbb; qualquer outra coisa
 * devolve o próprio valor. */
export function escurecerHex(cor: string, fator = 0.28): string {
  const limpo = String(cor || '').trim();
  const curto = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(limpo);
  const cheio = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(limpo);
  const canais = curto
    ? curto.slice(1).map((canal) => parseInt(canal + canal, 16))
    : cheio ? cheio.slice(1).map((canal) => parseInt(canal, 16)) : null;
  if (!canais) return limpo;
  const escuro = canais.map((canal) => Math.round(canal * fator));
  return `#${escuro.map((canal) => canal.toString(16).padStart(2, '0')).join('')}`;
}
