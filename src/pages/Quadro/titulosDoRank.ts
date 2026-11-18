import { Coins, Crown, Dices, Flame, PiggyBank, Skull, Sparkles, Swords } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/** Ícone e cor de cada título do Rank. O Quadro e a página da campanha mostram os mesmos. */
export const ICONES_DO_RANK: Record<string, LucideIcon> = {
  rei_do_vinte: Crown,
  azarao: Skull,
  mao_pesada: Swords,
  maquina_de_dano: Flame,
  gastador: Coins,
  pe_de_meia: PiggyBank,
  rolador: Dices,
  conjurador: Sparkles,
};

export const CORES_DO_RANK: Record<string, string> = {
  rei_do_vinte: '#facc15', azarao: '#a78bfa', mao_pesada: '#fb923c', maquina_de_dano: '#ef4444',
  gastador: '#f59e0b', pe_de_meia: '#4ade80', rolador: '#60a5fa', conjurador: '#e879f9',
};
