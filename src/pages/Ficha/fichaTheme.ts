import { obterTemaPorId, type ThemeEntry } from '../../redesign/themeMap';

export type EfeitoAtmosfericoFicha =
  | 'arcano'
  | 'brasas'
  | 'cosmico'
  | 'natureza'
  | 'nevoa'
  | 'ondas'
  | 'tecnologico'
  | 'holofote';

interface TemaEntidadeFicha {
  id: string;
  tema: ThemeEntry;
  fundo: string | null;
  efeito: EfeitoAtmosfericoFicha;
}

export interface TemaVisualFicha {
  classe: TemaEntidadeFicha;
  raca: TemaEntidadeFicha;
  accent: string;
  secondary: string;
  glow: string;
}

const FUNDOS_CLASSE: Record<string, string> = {
  guerreiro: 'guerreiro_bg.webp',
  piloto: 'piloto_bg.webp',
  ninja: 'ninja_bg.webp',
  'pop-star': 'popstar_bg.webp',
  espadachim: 'espadachim_bg.webp',
  lutador: 'lutador_bg.webp',
  atirador: 'atirador_bg.webp',
  medico: 'medico_bg.webp',
  guardiao: 'guardiao_bg.webp',
  cacador: 'cacador_bg.webp',
  engenheiro: 'engenheiro_bg.webp',
  alquimista: 'alquimista_bg.webp',
  comerciante: 'comerciante_bg.webp',
  'campeao-dimensional': 'campeaodimensional_bg.webp',
  'pirata-amaldicoado': 'pirataamaldicoado_bg.webp',
  'cartista-arcano': 'cartistaarcano_bg.webp',
  'guia-dimensional': 'guiadimensional_bg.webp',
  'cacador-das-almas': 'cacadordeentidades_bg.webp',
  'escritor-de-contos': 'escritordecontos_bg.webp',
  invocador: 'invocador_bg.webp',
  'viajante-classe': 'viajanteclasse_bg.webp',
  canalizador: 'canalizador_bg.webp',
  sintonizador: 'sintonizador_bg.webp',
  ritualista: 'ritualista_bg.webp',
  interceptador: 'interceptador_bg.webp',
  detetive: 'detetive_bg.webp',
};

const FUNDOS_RACA: Record<string, string> = {
  humano: 'humano_bg.webp',
  vampiro: 'vampiro_bg.webp',
  goblim: 'goblim_bg.webp',
  anao: 'anao_bg.webp',
  golem: 'golem_bg.webp',
  espirito: 'espirito_bg.webp',
  gigante: 'gigante_bg.webp',
  animalia: 'animalia_bg.webp',
  sereia: 'sereia_bg.webp',
  mimico: 'mimico_bg.webp',
  simbionte: 'miceliano_bg.webp',
  slime: 'slime_bg.webp',
  feerico: 'feerico_bg.webp',
  elfo: 'elfo_bg.webp',
  desperto: 'desperto_gate_bg.webp',
  auleth: 'auleth_bg.webp',
  automato: 'automato_tech_bg.webp',
  clone: 'clone_bg.webp',
  anomalia: 'errante_bg.webp',
  amalgamo: 'amalgamo_bg.webp',
  bruxa: 'bruxa_bg.webp',
  onirico: 'onirico_bg.webp',
  divino: 'deus_bg.webp',
  entidade: 'entidade_bg.webp',
};

const GRUPOS_EFEITO: Array<[EfeitoAtmosfericoFicha, Set<string>]> = [
  ['tecnologico', new Set(['piloto', 'engenheiro', 'interceptador', 'automato', 'clone', 'sintonizador'])],
  ['ondas', new Set(['pirata-amaldicoado', 'sereia', 'slime', 'canalizador'])],
  ['brasas', new Set(['guerreiro', 'lutador', 'atirador', 'alquimista', 'cozinheiro', 'devorador'])],
  ['cosmico', new Set(['campeao-dimensional', 'guia-dimensional', 'viajante-classe', 'auleth', 'anomalia', 'onirico'])],
  ['natureza', new Set(['cacador', 'animalia', 'goblim', 'elfo', 'feerico', 'simbionte'])],
  ['nevoa', new Set(['ninja', 'cacador-das-almas', 'vampiro', 'desperto', 'espirito', 'amalgamo', 'entidade'])],
  ['holofote', new Set(['pop-star', 'comerciante', 'detetive', 'humano', 'divino'])],
];

const caminhoFundo = (arquivo?: string) => arquivo ? `/assets/img/${arquivo}` : null;

export const obterEfeitoAtmosfericoFicha = (id?: string | null): EfeitoAtmosfericoFicha => {
  const chave = String(id || '').toLocaleLowerCase('pt-BR');
  return GRUPOS_EFEITO.find(([, ids]) => ids.has(chave))?.[0] || 'arcano';
};

export const obterFundoFicha = (tipo: 'classe' | 'raca', id?: string | null): string | null => {
  if (!id) return null;
  return caminhoFundo((tipo === 'classe' ? FUNDOS_CLASSE : FUNDOS_RACA)[id]);
};

const criarEntidadeTema = (tipo: 'classe' | 'raca', id?: string | null): TemaEntidadeFicha => ({
  id: id || '',
  tema: obterTemaPorId(id || 'humano'),
  fundo: obterFundoFicha(tipo, id),
  efeito: obterEfeitoAtmosfericoFicha(id),
});

export const criarTemaVisualFicha = (racaId?: string | null, classeId?: string | null): TemaVisualFicha => {
  const classe = criarEntidadeTema('classe', classeId);
  const raca = criarEntidadeTema('raca', racaId);
  const principal = classeId ? classe.tema : raca.tema;

  return {
    classe,
    raca,
    accent: principal.primary,
    secondary: racaId ? raca.tema.primary : principal.secondary,
    glow: principal.glow,
  };
};

