/** Personalidade sonora por classe: um leve toque extra por cima dos sons de
 * momentos marcantes (equipar, conjurar, crítico, "é a sua vez"). Fica
 * desligada por padrão. Aqui só mora a escolha do perfil de cada classe; o
 * som em si é sintetizado em audioSynth.ts. */

export type PerfilSonoro = 'metal' | 'cristal' | 'engrenagem' | 'sombra' | 'natureza' | 'palco';

export const PERFIS_SONOROS: PerfilSonoro[] = ['metal', 'cristal', 'engrenagem', 'sombra', 'natureza', 'palco'];

export const ROTULO_PERFIL: Record<PerfilSonoro, { titulo: string; descricao: string }> = {
  metal: { titulo: 'Metal', descricao: 'Tinido de lâmina e aço.' },
  cristal: { titulo: 'Cristal', descricao: 'Brilho agudo e cintilante, de magia.' },
  engrenagem: { titulo: 'Engrenagem', descricao: 'Cliques secos de mecanismo.' },
  sombra: { titulo: 'Sombra', descricao: 'Um sopro grave que some rápido.' },
  natureza: { titulo: 'Natureza', descricao: 'Sino de vento, suave e aberto.' },
  palco: { titulo: 'Palco', descricao: 'Fanfarra curta e vistosa.' },
};

const POR_CLASSE: Record<string, PerfilSonoro> = {
  guerreiro: 'metal',
  espadachim: 'metal',
  lutador: 'metal',
  guardiao: 'metal',
  'campeao-dimensional': 'metal',
  interceptador: 'metal',

  canalizador: 'cristal',
  sintonizador: 'cristal',
  ritualista: 'cristal',
  'cartista-arcano': 'cristal',
  elementarista: 'cristal',
  'escritor-de-contos': 'cristal',
  invocador: 'cristal',

  piloto: 'engrenagem',
  engenheiro: 'engrenagem',
  atirador: 'engrenagem',
  alquimista: 'engrenagem',
  detetive: 'engrenagem',

  ninja: 'sombra',
  'cacador-das-almas': 'sombra',
  devorador: 'sombra',
  'pirata-amaldicoado': 'sombra',

  cacador: 'natureza',
  medico: 'natureza',
  cozinheiro: 'natureza',
  'guia-dimensional': 'natureza',
  'viajante-classe': 'natureza',

  'pop-star': 'palco',
  comerciante: 'palco',
};

export const perfilDaClasse = (classeId: string | null | undefined): PerfilSonoro | null => (
  (classeId && POR_CLASSE[classeId]) || null
);
