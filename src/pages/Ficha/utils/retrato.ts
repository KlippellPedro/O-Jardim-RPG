import type { EfeitoAtmosfericoFicha } from '../fichaTheme';
export type FormaJoia = 'losango' | 'circulo' | 'estrela';

export interface EstiloMoldura {
  /** Posição na escada (0 é a moldura simples, 12 a do nível 60). */
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
  /** Quantidade de joias nos cantos. */
  joias: 0 | 2 | 4;
  forma: FormaJoia;
  /** Duplo aro de fora, a partir do nível 20. */
  aro: boolean;
  /** Nas molduras altas o brilho percorre a borda. */
  animada: boolean;
}

type DegrauMoldura = Omit<EstiloMoldura, 'degrau'>;

/** Uma moldura nova a cada 5 níveis, do 5 ao 60. Abaixo do 5 vale a simples. */
export const ESCADA_MOLDURAS: DegrauMoldura[] = [
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

/** A moldura do retrato sobe um degrau a cada 5 níveis, até o 60. O cartaz de
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
