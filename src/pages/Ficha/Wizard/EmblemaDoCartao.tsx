import type { CSSProperties } from 'react';
import {
  Compass, CircleDashed, Cpu, DoorOpen, Eye, Flame, Globe2, Hourglass, Leaf, Mountain, Moon, Network, Sprout, Sword,
  type LucideIcon,
} from 'lucide-react';
import { corDeInterface } from '../../../../data/mundo/arvoresCatalog';
import { obterIconeCatalogo } from '../../Regras/components/iconesCatalogo';
import { obterTemaPorId } from '../../../redesign/themeMap';
import { comoRgb, corLegivel } from './corLegivel';
import './emblemaDoCartao.css';

/** O ícone de cada Árvore. As Deidades e os Fluxos ainda não têm arte própria; até lá cada Árvore ganha o ícone que mais combina. */
const ICONE_DA_ARVORE: Record<string, LucideIcon> = {
  aethel: Sprout,
  ousias: Eye,
  keryx: Cpu,
  haemus: Leaf,
  ignis: Flame,
  moros: Mountain,
  aperion: Network,
  chronus: Hourglass,
  erebus: Moon,
  'mulher-carmesim': DoorOpen,
  universal: Globe2,
};

export type TipoDeEmblema = 'arvore' | 'raca' | 'classe';

export interface CorDoEmblema {
  /** Cor principal e brilho, em CSS (`#rrggbb`, `rgb(...)`). */
  principal: string;
  brilho: string;
}

/** A cor de cada emblema: a da Árvore vem do catálogo de Árvores; a da raça e da classe, da paleta aprovada do redesign. */
export function corDoEmblema(tipo: TipoDeEmblema, id: string): CorDoEmblema {
  if (tipo === 'arvore') {
    const rgb = corDeInterface(id);
    return { principal: `rgb(${rgb})`, brilho: `rgba(${rgb}, 0.35)` };
  }
  const tema = obterTemaPorId(id);
  // Paletas muito escuras (o Ninja, por exemplo) somem no fundo do assistente: clareia só o necessário.
  const legivel = corLegivel(tema.primary);
  return legivel.mudou && legivel.rgb
    ? { principal: legivel.cor, brilho: comoRgb(legivel.rgb, 0.35) }
    : { principal: tema.primary, brilho: tema.glow };
}

function iconeDoEmblema(tipo: TipoDeEmblema, id: string): LucideIcon {
  if (tipo === 'arvore') return ICONE_DA_ARVORE[id] ?? Compass;
  return obterIconeCatalogo(id, tipo === 'classe' ? Sword : CircleDashed);
}

interface EmblemaDoCartaoProps {
  tipo: TipoDeEmblema;
  id: string;
  tamanho?: 'p' | 'm';
  /** Cartão escolhido: o emblema acende. */
  ativo?: boolean;
}

/** O emblema redondo dos cartões do assistente de criação (Árvore, raça e classe): o ícone na cor do tema. */
export function EmblemaDoCartao({ tipo, id, tamanho = 'm', ativo = false }: EmblemaDoCartaoProps) {
  const Icone = iconeDoEmblema(tipo, id);
  const cor = corDoEmblema(tipo, id);
  return (
    <span
      className={`emblema emblema--${tamanho}${ativo ? ' emblema--ativo' : ''}`}
      style={{ '--emblema-cor': cor.principal, '--emblema-brilho': cor.brilho } as CSSProperties}
      aria-hidden="true"
    >
      <Icone size={tamanho === 'p' ? 16 : 22} strokeWidth={1.8} />
    </span>
  );
}
