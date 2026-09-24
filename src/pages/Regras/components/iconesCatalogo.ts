import {
  Anchor, Bot, BookOpen, ChefHat, Coins, Cog, Combine, Compass, Copy, CircleDashed, Crosshair,
  Droplet, Droplets, Drama, Flame, FlaskConical, Flower2, Ghost, Hand, HeartPulse, KeyRound, Leaf,
  Mic2, Moon, MoonStar, Mountain, MountainSnow, Orbit, PawPrint, PenTool, Pickaxe, Plane, Radio,
  Search, Shield, ShieldCheck, Skull, Spade, Sprout, Star, Sun, Sword, Swords, User, Wand2, Waves,
  Wind, Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/** Emblema de cada classe e raça nos cartões do catálogo. O id é normalizado
 * (sem acento, hífen ou espaço) pelo mesmo critério do themeMap. */
const ICONES: Record<string, LucideIcon> = {
  // Classes
  guerreiro: Swords,
  piloto: Plane,
  ninja: Wind,
  popstar: Mic2,
  espadachim: Sword,
  lutador: Hand,
  atirador: Crosshair,
  medico: HeartPulse,
  guardiao: ShieldCheck,
  cacador: Search,
  engenheiro: Cog,
  alquimista: FlaskConical,
  comerciante: Coins,
  cozinheiro: ChefHat,
  canalizador: Waves,
  sintonizador: Radio,
  ritualista: MoonStar,
  detetive: Search,
  campeaodimensional: Shield,
  pirataamaldicoado: Anchor,
  cartistaarcano: Spade,
  guiadimensional: Compass,
  cacadordasalmas: Ghost,
  escritordecontos: PenTool,
  invocador: Wand2,
  viajanteclasse: Orbit,
  interceptador: Zap,
  devorador: Skull,
  elementarista: Flame,
  // Raças
  humano: User,
  vampiro: Droplet,
  goblim: KeyRound,
  anao: Pickaxe,
  golem: Mountain,
  espirito: Ghost,
  gigante: MountainSnow,
  animalia: PawPrint,
  sereia: Waves,
  mimico: Drama,
  simbionte: Sprout,
  slime: Droplets,
  feerico: Flower2,
  elfo: Leaf,
  desperto: Skull,
  auleth: Star,
  automato: Bot,
  clone: Copy,
  anomalia: CircleDashed,
  amalgamo: Combine,
  bruxa: Moon,
  onirico: MoonStar,
  divino: Sun,
  entidade: BookOpen,
};

export const obterIconeCatalogo = (id: string, padrao: LucideIcon): LucideIcon => {
  const chave = id.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
  return ICONES[chave] ?? padrao;
};
