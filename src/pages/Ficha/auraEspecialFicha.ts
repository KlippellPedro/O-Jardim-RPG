/** Assinatura visual das raças e classes especiais na ficha: cada uma ganha um
 * tipo de partícula próprio, na cor do seu tema. Raças e classes comuns não
 * aparecem aqui e ficam só com a atmosfera padrão.
 *
 * As chaves são as mesmas raças e classes de `categoria: "esquecida"` nos
 * catálogos (data/ficha/racas.json e classes.json). Ao criar uma raça ou
 * classe especial nova, incluir aqui também. */
export type EstiloAuraFicha =
  | 'estrelas'
  | 'halo'
  | 'brasas'
  | 'circuito'
  | 'glitch'
  | 'folhas'
  | 'almas'
  | 'cartas'
  | 'runas'
  | 'mistura'
  | 'sombra';

const AURAS_ESPECIAIS: Record<string, EstiloAuraFicha> = {
  // Raças
  elfo: 'folhas',
  desperto: 'almas',
  auleth: 'estrelas',
  automato: 'circuito',
  clone: 'circuito',
  anomalia: 'glitch',
  amalgamo: 'mistura',
  bruxa: 'brasas',
  onirico: 'estrelas',
  divino: 'halo',
  entidade: 'sombra',
  // Classes
  'campeao-dimensional': 'estrelas',
  'pirata-amaldicoado': 'almas',
  'cartista-arcano': 'cartas',
  'guia-dimensional': 'runas',
  'cacador-das-almas': 'almas',
  'escritor-de-contos': 'halo',
  invocador: 'runas',
  'viajante-classe': 'runas',
  interceptador: 'circuito',
  devorador: 'sombra',
  elementarista: 'brasas',
};

export const obterEstiloAuraFicha = (id?: string | null): EstiloAuraFicha | null => (
  id ? AURAS_ESPECIAIS[id] ?? null : null
);
