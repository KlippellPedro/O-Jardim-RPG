import type { SfxName } from './audioSynth';

export type CategoriaSom = 'interface' | 'eventos' | 'moedas';

export const CATEGORIAS_SOM: Array<{ id: CategoriaSom; rotulo: string; descricao: string }> = [
  { id: 'interface', rotulo: 'Interface', descricao: 'Cliques, abrir e fechar menus, confirmações e navegação.' },
  { id: 'eventos', rotulo: 'Acontecimentos', descricao: 'Gongo, estrela de conquista, avisos, conjurar e equipar.' },
  { id: 'moedas', rotulo: 'Moedas', descricao: 'O tilintar de ganhos e gastos de Lunaris.' },
];

const POR_EFEITO: Record<string, CategoriaSom> = {
  notification: 'eventos',
  estrela: 'eventos',
  amanhecer: 'eventos',
  conjurar: 'eventos',
  equipar: 'eventos',
  gongo: 'eventos',
  moeda: 'moedas',
  'moeda-gasto': 'moedas',
};

/** A que categoria um efeito pertence (o que não está na lista é som de interface). */
export const categoriaDoSom = (nome: SfxName | string): CategoriaSom => POR_EFEITO[nome] ?? 'interface';

export type CategoriasLigadas = Record<CategoriaSom, boolean>;
export const CATEGORIAS_PADRAO: CategoriasLigadas = { interface: true, eventos: true, moedas: true };
