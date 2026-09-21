import { memo, type CSSProperties } from 'react';
import { Coins, Crown, Dices, Skull, Sparkles, Star, Swords, Trophy, Users, type LucideIcon } from 'lucide-react';
import type { RaridadeConquista } from '../../services/conquistasApi';
import './selo.css';

const ICONES: Record<string, LucideIcon> = {
  dados: Dices,
  estrela: Star,
  caveira: Skull,
  espadas: Swords,
  grupo: Users,
  brilho: Sparkles,
  trofeu: Trophy,
  fama: Crown,
  moedas: Coins,
};

// Cor do aro e do brilho por raridade.
const PALETA: Record<RaridadeConquista, { aro: string; brilho: string; fundo: string }> = {
  comum: { aro: '#cbd5e1', brilho: '#94a3b8', fundo: '#1e293b' },
  rara: { aro: '#c4b5fd', brilho: '#8b5cf6', fundo: '#2e1065' },
  lendaria: { aro: '#fde68a', brilho: '#f59e0b', fundo: '#451a03' },
};

const HEXAGONO = '50,4 92,27 92,73 50,96 8,73 8,27';

interface SeloConquistaProps {
  raridade: RaridadeConquista;
  icone: string;
  tamanho?: number;
  bloqueada?: boolean;
  /** Passa um brilho varrendo o selo (toast de conquista nova). */
  reluzir?: boolean;
}

/** Selo hexagonal de uma conquista: aro na cor da raridade e o ícone no meio.
 * Bloqueada, vira uma silhueta apagada. */
export const SeloConquista = memo(function SeloConquista({ raridade, icone, tamanho = 64, bloqueada = false, reluzir = false }: SeloConquistaProps) {
  const paleta = PALETA[raridade] ?? PALETA.comum;
  const Icone = ICONES[icone] ?? Star;
  return (
    <span
      className={`selo selo--${raridade}${bloqueada ? ' selo--bloqueado' : ''}${reluzir ? ' selo--reluzir' : ''}`}
      style={{ width: tamanho, height: tamanho, '--selo-aro': paleta.aro, '--selo-brilho': paleta.brilho, '--selo-fundo': paleta.fundo } as CSSProperties}
      aria-hidden="true"
    >
      <svg viewBox="0 0 100 100">
        <polygon className="selo__fundo" points={HEXAGONO} />
        <polygon className="selo__aro" points={HEXAGONO} />
        <polygon className="selo__aro-interno" points="50,14 83,32 83,68 50,86 17,68 17,32" />
      </svg>
      <Icone className="selo__icone" size={Math.round(tamanho * 0.42)} strokeWidth={1.8} />
    </span>
  );
});
