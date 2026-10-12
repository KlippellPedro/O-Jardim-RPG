import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Crosshair, Droplet, Eye, Feather, PawPrint, Shield, ShieldHalf, Shuffle, Sparkles, User, Users, Waves, Zap,
} from 'lucide-react';
import { obterTemaPorId, type ThemeEntry } from '../../themeMap';

/** Ícone e paleta de cada Forma. A Fera usa o âmbar das garras, o Híbrido o verde da raça e os Traços
 * um verde-água mais calmo, para as três páginas se reconhecerem de longe. */
export interface VisualForma {
  Icone: LucideIcon;
  tema: ThemeEntry;
}

const base = obterTemaPorId('animalia');

const TEMAS: Record<string, ThemeEntry> = {
  fera: {
    ...base,
    primary: '#f59e0b', secondary: '#78350f', glow: 'rgba(245,158,11,0.28)',
    bg: 'bg-amber-950/30', border: 'border-amber-600/25 hover:border-amber-500/55',
    text: 'text-amber-400', icon: 'text-amber-600/80', tag: 'text-amber-300',
  },
  hibrido: base,
  tracos: {
    ...base,
    primary: '#2dd4bf', secondary: '#115e59', glow: 'rgba(45,212,191,0.26)',
    bg: 'bg-teal-950/30', border: 'border-teal-600/25 hover:border-teal-500/55',
    text: 'text-teal-300', icon: 'text-teal-500/80', tag: 'text-teal-200',
  },
};

export function visualDaForma(id: string): VisualForma {
  if (id === 'fera') return { Icone: PawPrint, tema: TEMAS.fera };
  if (id === 'tracos') return { Icone: User, tema: TEMAS.tracos };
  return { Icone: Shuffle, tema: TEMAS.hibrido };
}

const ICONES_MORFOLOGIA: Record<string, LucideIcon> = {
  agil: Zap,
  robusta: Shield,
  mistica: Eye,
  predadora: Crosshair,
  alada: Feather,
  aquatica: Waves,
  peconhenta: Droplet,
  gregaria: Users,
  blindada: ShieldHalf,
  mitica: Sparkles,
};

/** Ícone da Morfologia; uma que o catálogo ganhar depois cai na pata. */
export function iconeDaMorfologia(id: string): LucideIcon {
  return ICONES_MORFOLOGIA[id] ?? PawPrint;
}

/** Fundo e moldura de largura das páginas da Animália. */
export const AnimaliaFundo = ({ children }: { children: ReactNode }) => (
  <div className="min-h-screen text-green-50 p-4 sm:p-8 selection:bg-green-500/30 overflow-hidden relative">
    <div
      className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat bg-black"
      style={{ backgroundImage: "url('/assets/img/animalia_fantasy_bg.webp')" }}
    >
      <div className="absolute inset-0 bg-black/50" />
      <div className="absolute inset-0 bg-green-950/80 mix-blend-multiply" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#0d120a]/40 via-transparent to-[#0d120a]/90" />
    </div>
    <div className="max-w-5xl mx-auto relative z-10 pt-16 pb-16">{children}</div>
  </div>
);
