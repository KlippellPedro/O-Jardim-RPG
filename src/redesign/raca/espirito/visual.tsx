import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Flame, Ghost, Sun } from 'lucide-react';
import { obterTemaPorId, type ThemeEntry } from '../../themeMap';

/** Ícone e paleta de cada Natureza. O natural usa o roxo etéreo do Espírito, o
 * demoníaco a paleta de sangue do Vampiro e o angelical o dourado do Divino. */
export interface VisualNatureza {
  Icone: LucideIcon;
  tema: ThemeEntry;
}

export function visualDaNatureza(id: string): VisualNatureza {
  if (id === 'demoniaca') return { Icone: Flame, tema: obterTemaPorId('vampiro') };
  if (id === 'angelical') return { Icone: Sun, tema: obterTemaPorId('divino') };
  return { Icone: Ghost, tema: obterTemaPorId('espirito') };
}

/** Fundo etéreo e moldura de largura das páginas do Espírito. */
export const EspiritoFundo = ({ children }: { children: ReactNode }) => (
  <div className="min-h-screen text-cyan-50 p-4 sm:p-8 selection:bg-cyan-500/30 overflow-hidden relative">
    <div
      className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat bg-black"
      style={{ backgroundImage: "url('/assets/img/espirito_fantasy_bg.webp')" }}
    >
      <div className="absolute inset-0 bg-black/50" />
      <div className="absolute inset-0 bg-cyan-950/80 mix-blend-multiply" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#020617]/40 via-transparent to-[#020617]/90" />
    </div>
    <div className="max-w-5xl mx-auto relative z-10 pt-16 pb-16">{children}</div>
  </div>
);
