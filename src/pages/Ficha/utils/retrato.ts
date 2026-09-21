import type { EfeitoAtmosfericoFicha } from '../fichaTheme';
import { ROTULO_TIER, tierDoCartaz, type TierCartaz } from './cartaz';

export interface EstiloMoldura {
  tier: TierCartaz;
  /** Nome da moldura, ou null quando é a simples. */
  rotulo: string | null;
  /** Cor principal do fio e cor do brilho. */
  fio: string;
  brilho: string;
  /** Quantidade de joias nos cantos: 0 no comum, 2 na prata, 4 no ouro e na lenda. */
  joias: 0 | 2 | 4;
  /** Só a moldura lendária tem brilho que percorre a borda. */
  animada: boolean;
}

const MOLDURAS: Record<TierCartaz, Omit<EstiloMoldura, 'tier' | 'rotulo'>> = {
  comum: { fio: '#5b5566', brilho: 'rgba(91, 85, 102, 0.35)', joias: 0, animada: false },
  prata: { fio: '#c9d1dc', brilho: 'rgba(201, 209, 220, 0.5)', joias: 2, animada: false },
  ouro: { fio: '#e3b840', brilho: 'rgba(227, 184, 64, 0.55)', joias: 4, animada: false },
  lenda: { fio: '#f6d872', brilho: 'rgba(255, 233, 150, 0.7)', joias: 4, animada: true },
};

/** A moldura do retrato acompanha o nível, com os mesmos degraus do cartaz de
 * Procurado (10, 15 e 20), para o personagem ter a mesma "patente" em todo lugar. */
export function molduraDoRetrato(nivel: number): EstiloMoldura {
  const tier = tierDoCartaz(nivel);
  return { tier, rotulo: ROTULO_TIER[tier], ...MOLDURAS[tier] };
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
